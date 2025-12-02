from flask import (
    Flask, render_template, request, jsonify,
    redirect, url_for, session
)
import json
import os
import time
from functools import wraps
from datetime import datetime

app = Flask(__name__)

# ⚠️ Em produção, troque por uma chave forte e secreta
app.secret_key = "troque-esta-chave-em-producao"

# Arquivo do histórico simples (predict / add-turma)
DATAFILE = "historico.json"

# Arquivo de usuários para login
USERSFILE = "usuarios.json"

# Arquivos do planejamento (tela com unidades/disciplinas/produtos)
PLANEJAMENTO_DATAFILE = "planejamento_db.json"
PLANEJAMENTO_UNIDADES_FILE = "planejamento_unidades.json"

# Arquivo de envios / retornos (novo módulo integrado)
PLANEJAMENTO_ENVIOS_FILE = "planejamento_envios.json"


# ==========================================================
#                 CONTROLE DE USUÁRIOS / LOGIN
# ==========================================================

def carregar_usuarios():
    """
    Carrega usuários do arquivo JSON.
    Caso não exista, cria um usuário padrão: admin / admin
    """
    if os.path.exists(USERSFILE):
        with open(USERSFILE, "r", encoding="utf-8") as f:
            return json.load(f)

    usuarios_iniciais = [
        {
            "username": "admin", 
            "password": "admin",
            "foto": "https://i.pinimg.com/236x/c5/ef/e9/c5efe9990be2f5b219b309f5505eaf43.jpg",
            "role": "Administrador"
        }
    ]
    salvar_usuarios(usuarios_iniciais)
    return usuarios_iniciais


def salvar_usuarios(usuarios):
    with open(USERSFILE, "w", encoding="utf-8") as f:
        json.dump(usuarios, f, ensure_ascii=False, indent=2)


def autenticar(username, password):
    usuarios = carregar_usuarios()
    for u in usuarios:
        if u["username"] == username and u["password"] == password:
            return u  # Retorna o usuário completo
    return None


def login_required(view_func):
    """
    Decorator para proteger rotas.
    - Para páginas HTML: redireciona para /login
    - Para requisições JSON (AJAX): retorna 401 em JSON
    """
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if "user" not in session:
            # Se for JSON (fetch), devolve erro 401 em JSON
            if request.path.startswith((
                "/predict",
                "/add-turma",
                "/api/planejamento"
            )) or request.is_json:
                return jsonify({"erro": "Não autenticado"}), 401

            # Senão, redireciona para tela de login
            next_url = request.path
            return redirect(url_for("login", next=next_url))
        return view_func(*args, **kwargs)
    return wrapper


@app.route("/login", methods=["GET", "POST"])
def login():
    """
    Tela de login simples. Usa usuarios.json.
    Usuário padrão (se o arquivo não existir):
      - login: admin
      - senha: admin
    """
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        usuario = autenticar(username, password)
        if usuario:
            session["user"] = usuario["username"]
            session["role"] = usuario.get("role", "Usuário")
            # redireciona para a página que ele tentou acessar, se tiver
            next_url = request.args.get("next") or url_for("index")
            return redirect(next_url)
        else:
            return render_template(
                "login.html",
                error="Usuário ou senha inválidos."
            )

    # GET
    return render_template("login.html")

#save 2.0
@app.route("/logout")
def logout():
    session.pop("user", None)
    session.pop("role", None)
    return redirect(url_for("login"))


@app.route("/api/usuario/<username>/foto", methods=["GET"])
@login_required
def api_usuario_foto(username):
    """
    Retorna a foto do usuário do arquivo usuarios.json.
    """
    usuarios = carregar_usuarios()
    
    for usuario in usuarios:
        if usuario["username"] == username:
            # Retorna a foto se existir, senão None
            foto = usuario.get("foto")
            return jsonify({"foto": foto})
    
    return jsonify({"foto": None})


@app.route("/api/usuario/atual", methods=["GET"])
@login_required
def api_usuario_atual():
    """
    Retorna informações do usuário atual.
    """
    return jsonify({
        "username": session.get("user"),
        "role": session.get("role", "Usuário")
    })


# ==========================================================
#          HISTÓRICO SIMPLES (predict / add-turma)
# ==========================================================

def carregar_historico():
    """
    Histórico simples usado nas rotas /predict e /add-turma
    (não é o mesmo JSON do planejamento).
    """
    if os.path.exists(DATAFILE):
        with open(DATAFILE, "r", encoding="utf-8") as f:
            return json.load(f)

    # Histórico inicial padrão (se ainda não existir arquivo)
    historico_inicial = [
        {"turma": "Turma 1", "alunos": 100, "enviados": 100, "usados": 50, "faltou": 0, "usuario": "sistema", "data": "2024-01-15"},
        {"turma": "Turma 2", "alunos": 100, "enviados": 50,  "usados": 100, "faltou": 50, "usuario": "sistema", "data": "2024-02-20"},
        {"turma": "Turma 3", "alunos": 30,  "enviados": 30,  "usados": 30,  "faltou": 0, "usuario": "sistema", "data": "2024-03-10"},
        {"turma": "Turma 4", "alunos": 30,  "enviados": 60,  "usados": 10,  "faltou": 50, "usuario": "sistema", "data": "2024-04-05"},
    ]
    salvar_historico(historico_inicial)
    return historico_inicial


def salvar_historico(historico):
    with open(DATAFILE, "w", encoding="utf-8") as f:
        json.dump(historico, f, ensure_ascii=False, indent=2)


def calcular_proporcao_media(historico):
    """
    Calcula a proporção média ideal de produtos por aluno,
    ajustando com base em falta e sobra.
    """
    proporcoes = []

    for h in historico:
        alunos = h.get("alunos", 0)
        enviados = h.get("enviados", 0)
        usados = h.get("usados", 0)
        faltou = h.get("faltou", 0)

        if alunos <= 0:
            continue

        ideal = enviados

        if faltou > 0:
            # se faltou, ideal seria o que foi enviado + o que faltou
            ideal = enviados + faltou
        else:
            # se não faltou, pode ter sobrado
            sobrou = enviados - usados
            if sobrou > 0:
                ideal = enviados - sobrou
                if ideal < usados:
                    ideal = usados

        proporcoes.append(ideal / alunos)

    if not proporcoes:
        return 1.0  # Default: 1 produto por aluno

    return sum(proporcoes) / len(proporcoes)


# ==========================================================
#               PLANEJAMENTO (JSON COMPLETO)
# ==========================================================

def carregar_planejamento_db():
    """
    Carrega o banco de dados completo do planejamento (disciplinas/produtos).
    """
    if os.path.exists(PLANEJAMENTO_DATAFILE):
        with open(PLANEJAMENTO_DATAFILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def salvar_planejamento_db(dados):
    """
    Salva o array completo de registros do planejamento em JSON.
    """
    with open(PLANEJAMENTO_DATAFILE, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)


def carregar_planejamento_unidades():
    """
    Carrega a lista de unidades cadastradas para o planejamento.
    """
    if os.path.exists(PLANEJAMENTO_UNIDADES_FILE):
        with open(PLANEJAMENTO_UNIDADES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def salvar_planejamento_unidades(unidades):
    """
    Salva a lista de unidades do planejamento.
    """
    with open(PLANEJAMENTO_UNIDADES_FILE, "w", encoding="utf-8") as f:
        json.dump(unidades, f, ensure_ascii=False, indent=2)


@app.route("/api/planejamento/db", methods=["GET", "POST"])
@login_required
def api_planejamento_db():
    """
    GET  -> retorna o array completo de registros (para preencher as tabelas do front)
    POST -> recebe o array completo e sobrescreve o JSON no servidor
    """
    if request.method == "GET":
        dados = carregar_planejamento_db()
        return jsonify(dados)

    # POST
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({"erro": "Formato inválido: esperado uma lista de registros."}), 400

    salvar_planejamento_db(data)
    return jsonify({"mensagem": "Banco de planejamento salvo com sucesso."})


@app.route("/api/planejamento/unidades", methods=["GET", "POST"])
@login_required
def api_planejamento_unidades():
    """
    GET  -> retorna lista de unidades cadastradas
    POST -> recebe a lista completa de unidades e salva
    """
    if request.method == "GET":
        unidades = carregar_planejamento_unidades()
        return jsonify(unidades)

    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({"erro": "Formato inválido: esperado uma lista de unidades."}), 400

    salvar_planejamento_unidades(data)
    return jsonify({"mensagem": "Unidades do planejamento salvas com sucesso."})


# ==========================================================
#            ENVIOS / RETORNOS (NOVO MÓDULO)
# ==========================================================

def carregar_planejamento_envios():
    """
    Carrega a lista de envios/retornos (cada registro com itens, unidade, data, etc.).
    """
    if os.path.exists(PLANEJAMENTO_ENVIOS_FILE):
        with open(PLANEJAMENTO_ENVIOS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def salvar_planejamento_envios(envios):
    """
    Salva a lista completa de envios/retornos.
    """
    with open(PLANEJAMENTO_ENVIOS_FILE, "w", encoding="utf-8") as f:
        json.dump(envios, f, ensure_ascii=False, indent=2)


@app.route("/api/planejamento/envios", methods=["GET", "POST"])
@login_required
def api_planejamento_envios():
    """
    GET  -> retorna a lista de envios/retornos
    POST -> recebe UM envio e adiciona no JSON

    Exemplo de JSON esperado no POST:
    {
      "data": "2025-01-01T00:00:00Z",
      "unidade": "São Paulo",
      "observacao": "Envio para turma de março",
      "itens": [
        {"produto": "Livro A", "quantidade": 10},
        {"produto": "Livro B", "quantidade": 5}
      ]
    }
    """
    if request.method == "GET":
        envios = carregar_planejamento_envios()
        return jsonify(envios)

    # POST
    data = request.get_json() or {}

    if not isinstance(data, dict):
        return jsonify({"erro": "Formato inválido: esperado um objeto de envio."}), 400

    # Gera um ID se não vier
    if "id" not in data:
        data["id"] = int(time.time() * 1000)

    # Garante campos principais
    data.setdefault("data", datetime.now().isoformat())
    data.setdefault("unidade", "")
    data.setdefault("disciplina", "")
    data.setdefault("observacao", "")
    data.setdefault("itens", [])
    data.setdefault("usuario", session.get("user", "desconhecido"))

    envios = carregar_planejamento_envios()
    envios.append(data)
    salvar_planejamento_envios(envios)

    return jsonify({
        "mensagem": "Envio/retorno salvo com sucesso.",
        "envio": data
    })


@app.route("/api/planejamento/envios/<int:envio_id>", methods=["DELETE"])
@login_required
def api_planejamento_envios_delete(envio_id):
    """
    DELETE -> exclui um envio/retorno pelo ID.
    """
    envios = carregar_planejamento_envios()
    envios_filtrados = [e for e in envios if e.get("id") != envio_id]

    if len(envios_filtrados) == len(envios):
        return jsonify({"erro": "Envio não encontrado."}), 404

    salvar_planejamento_envios(envios_filtrados)
    return jsonify({"mensagem": "Envio/retorno excluído com sucesso."})


# ==========================================================
#                     ROTAS PRINCIPAIS
# ==========================================================

@app.route("/")
@login_required
def index():
    """
    Página principal com todas as funcionalidades.
    """
    historico = carregar_historico()
    usuario = session.get("user")
    role = session.get("role", "Usuário")
    return render_template("index.html", historico=historico, usuario=usuario, role=role)


@app.route("/planejamento")
@login_required
def planejamento():
    """
    Página de planejamento (usando o mesmo index.html).
    """
    usuario = session.get("user")
    role = session.get("role", "Usuário")
    return render_template("index.html", usuario=usuario, role=role)


@app.route("/historico")
@login_required
def historico():
    """
    Página de histórico (versão antiga).
    """
    historico = carregar_historico()
    usuario = session.get("user")
    role = session.get("role", "Usuário")
    return render_template("historico.html", historico=historico, usuario=usuario, role=role)


@app.route("/predict", methods=["POST"])
@login_required
def predict():
    """
    Usa o DATAFILE (historico.json) para sugerir quantidade
    com base em proporção média (modelo simples).
    """
    data = request.get_json()
    alunos = data.get("alunos", 0)

    try:
        alunos = int(alunos)
    except (ValueError, TypeError):
        return jsonify({"erro": "Número de alunos inválido"}), 400

    if alunos <= 0:
        return jsonify({"erro": "Informe um número de alunos maior que zero"}), 400

    historico = carregar_historico()
    proporcao_media = calcular_proporcao_media(historico)
    sugerido = round(proporcao_media * alunos)

    return jsonify({
        "alunos": alunos,
        "proporcao_media": round(proporcao_media, 3),
        "quantidade_sugerida": sugerido
    })


@app.route("/add-turma", methods=["POST"])
@login_required
def add_turma():
    """
    Salva uma nova turma no histórico simples (historico.json):
    - turma (nome)
    - alunos
    - enviados
    - usados
    - faltou
    - usuario (pegando do login)
    """
    data = request.get_json()

    turma = data.get("turma", "").strip() or "Nova Turma"
    try:
        alunos = int(data.get("alunos", 0))
        enviados = int(data.get("enviados", 0))
        usados = int(data.get("usados", 0))
        faltou = int(data.get("faltou", 0))
    except (ValueError, TypeError):
        return jsonify({"erro": "Valores numéricos inválidos"}), 400

    if alunos <= 0:
        return jsonify({"erro": "Alunos deve ser maior que zero"}), 400

    historico = carregar_historico()

    usuario_atual = session.get("user", "desconhecido")

    nova_turma = {
        "turma": turma,
        "alunos": alunos,
        "enviados": enviados,
        "usados": usados,
        "faltou": faltou,
        "usuario": usuario_atual,
        "data": datetime.now().date().isoformat()
    }

    historico.append(nova_turma)
    salvar_historico(historico)

    return jsonify({"mensagem": "Turma salva com sucesso!", "turma": nova_turma})


# Adicione esta rota para retornar dados do histórico
@app.route("/historico-dados")
@login_required
def historico_dados():
    """
    Retorna dados do histórico para o frontend.
    """
    historico = carregar_historico()
    return jsonify(historico)

# ==========================================================
#                        MAIN
# ==========================================================

if __name__ == "__main__":
    # host 0.0.0.0 para acessar de fora (ex: túnel Cloudflare)
    app.run(host="0.0.0.0", port=5000, debug=True)