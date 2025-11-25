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

DATAFILE = "historico.json"
USERSFILE = "usuarios.json"


# ========== USERS / LOGIN ==========

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
            # Se for JSON (fetch/axios), devolve erro 401 em JSON
            if request.path.startswith(("/predict", "/add-turma")) or request.is_json:
                return jsonify({"erro": "Não autenticado"}), 401
            # Senão, redireciona para tela de login
            next_url = request.path
            return redirect(url_for("login", next=next_url))
        return view_func(*args, **kwargs)
    return wrapper


@app.route("/login", methods=["GET", "POST"])
def login():
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


# ========== HISTÓRICO / “DB” ==========
def carregar_historico():
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


# ========== ROTAS PRINCIPAIS ==========

@app.route("/")
@login_required
def index():
    historico = carregar_historico()
    usuario = session.get("user")
    # Aqui você renderiza sua página principal (index.html)
    # e pode mostrar o usuário logado no template
    return render_template("index.html", historico=historico, usuario=usuario)


@app.route("/predict", methods=["POST"])
@login_required
def predict():
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
    Salva uma nova turma no histórico:
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
        "usuario": usuario_atual  # <-- aqui gravamos quem fez
    }

    historico.append(nova_turma)
    salvar_historico(historico)

    return jsonify({"mensagem": "Turma salva com sucesso!", "turma": nova_turma})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)