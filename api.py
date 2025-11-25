from flask import (
    Flask, render_template, request, jsonify,
    redirect, url_for, session
)
import json
import os
from functools import wraps

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
        {"username": "admin", "password": "admin"}
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
            return True
    return False


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

        if autenticar(username, password):
            session["user"] = username
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


@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))


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
        {"turma": "Turma 1", "alunos": 100, "enviados": 100, "usados": 50, "faltou": 0, "usuario": "sistema"},
        {"turma": "Turma 2", "alunos": 100, "enviados": 50,  "usados": 100, "faltou": 50, "usuario": "sistema"},
        {"turma": "Turma 3", "alunos": 30,  "enviados": 30,  "usados": 30,  "faltou": 0, "usuario": "sistema"},
        {"turma": "Turma 4", "alunos": 30,  "enviados": 60,  "usados": 10,  "faltou": 50, "usuario": "sistema"},
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
        return 0

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
#                     ROTAS PRINCIPAIS
# ==========================================================

@app.route("/")
@login_required
def index():
    """
    Página principal: carrega index.html.
    O template em si usa JS para consumir /api/planejamento/*
    e opcionalmente usar o histórico simples.
    """
    historico = carregar_historico()   # se quiser exibir ou só garantir que o arquivo exista
    usuario = session.get("user")
    return render_template("index.html", historico=historico, usuario=usuario)


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
        "usuario": usuario_atual
    }

    historico.append(nova_turma)
    salvar_historico(historico)

    return jsonify({"mensagem": "Turma salva com sucesso!", "turma": nova_turma})


# ==========================================================
#                        MAIN
# ==========================================================

if __name__ == "__main__":
    # host 0.0.0.0 para acessar de fora (ex: túnel Cloudflare)
    app.run(host="0.0.0.0", port=5000, debug=True)
