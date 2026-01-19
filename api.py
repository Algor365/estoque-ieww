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
HISTORYFILE = "dbs/historico.json"

# Arquivo de usuários (login)
USERSFILE = "dbs/usuarios.json"

# Arquivo principal de planejamento (tela com unidades/disciplinas/produtos)
PLANEJAMENTO_DATAFILE = "dbs/planejamento_db.json"
PLANEJAMENTO_UNIDADES_FILE = "dbs/planejamento_unidades.json"

# Arquivo de envios / retornos (novo módulo integrado)
PLANEJAMENTO_ENVIOS_FILE = "dbs/planejamento_envios.json"

# Arquivo de cadastro de produtos (disciplina + nome + unidades)
PLANEJAMENTO_PRODUTOS_FILE = "dbs/planejamento_produtos.json"


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
    """
    Salva a lista de usuários no arquivo JSON.
    """
    os.makedirs(os.path.dirname(USERSFILE), exist_ok=True)
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
    - Para páginas HTML: 
      redireciona para /login
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


# ==========================================================
#                      HISTÓRICO SIMPLES
# ==========================================================

def carregar_historico():
    """
    Carrega o histórico de ações simples do sistema (predict, add-turma, etc.).
    """
    if os.path.exists(HISTORYFILE):
        with open(HISTORYFILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def salvar_historico(historico):
    """
    Salva a lista completa de histórico.
    """
    os.makedirs(os.path.dirname(HISTORYFILE), exist_ok=True)
    with open(HISTORYFILE, "w", encoding="utf-8") as f:
        json.dump(historico, f, ensure_ascii=False, indent=2)


def registrar_historico(acao, detalhes=None):
    """
    Registra uma nova ação no histórico.
    """
    historico = carregar_historico()
    historico.append({
        "timestamp": datetime.now().isoformat(),
        "acao": acao,
        "detalhes": detalhes or {}
    })
    salvar_historico(historico)


# ==========================================================
#                         ROTAS DE LOGIN
# ==========================================================

@app.route("/login", methods=["GET", "POST"])
def login():
    """
    Tela de login simples.
    """
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        user = autenticar(username, password)
        if user:
            session["user"] = user["username"]
            session["role"] = user.get("role", "Usuário")

            next_url = request.args.get("next") or url_for("index")
            return redirect(next_url)

        return render_template("login.html", erro="Usuário ou senha inválidos.")

    return render_template("login.html")


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
#                          PÁGINAS
# ==========================================================

@app.route("/")
@login_required
def index():
    """
    Página principal (dashboard).
    """
    return render_template("index.html")


@app.route("/planejamento")
@login_required
def planejamento():
    """
    Página principal de planejamento (mesma index, se quiser).
    """
    return render_template("index.html")


# ==========================================================
#                 PLANEJAMENTO (DB PRINCIPAL)
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


def carregar_planejamento_produtos():
    """
    Carrega o banco de produtos (disciplina + nome + unidades).
    """
    if os.path.exists(PLANEJAMENTO_PRODUTOS_FILE):
        with open(PLANEJAMENTO_PRODUTOS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def salvar_planejamento_produtos(dados):
    """
    Salva a lista completa de produtos em JSON.
    Espera uma lista de dicionários.
    """
    with open(PLANEJAMENTO_PRODUTOS_FILE, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)


@app.route("/api/planejamento/produtos", methods=["GET", "POST"])
@login_required
def api_planejamento_produtos():
    """
    GET  -> retorna a lista de produtos cadastrados.
    POST -> recebe a lista COMPLETA de produtos e sobrescreve o JSON.

    Exemplo de JSON esperado no POST:
    [
        {
            "unidades": ["teste01"],
            "disciplina": "Endpoint01",
            "produto": "Nome do Produto",
            "dataCadastro": "2025-01-01T00:00:00Z"
        }
    ]
    """
    if request.method == "GET":
        produtos = carregar_planejamento_produtos()
        return jsonify(produtos)

    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({"erro": "Formato inválido: esperado uma lista de produtos."}), 400

    salvar_planejamento_produtos(data)
    return jsonify({"mensagem": "Banco de produtos salvo com sucesso."})


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
    data.setdefault("observacao", "")
    data.setdefault("itens", [])

    envios = carregar_planejamento_envios()
    envios.append(data)
    salvar_planejamento_envios(envios)

    return jsonify({
        "mensagem": "Envio/retorno registrado com sucesso.",
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
#                  HISTÓRICO - ROTAS EXTRAS
# ==========================================================

@app.route("/historico")
@login_required
def historico_page():
    """
    Exibe (se quiser) uma página simples de histórico.
    """
    return render_template("historico.html")


@app.route("/api/historico", methods=["GET"])
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
