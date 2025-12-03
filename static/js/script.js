// ===== CONFIGURAÇÕES GLOBAIS =====
const API_BASE = window.location.origin;
const ADMIN_AVATAR_URL = "https://i.pinimg.com/236x/c5/ef/e9/c5efe9990be2f5b219b309f5505eaf43.jpg";

// Variáveis globais
let db = []; // Banco de dados principal (registros de consumo)
let produtosDB = []; // Banco de dados de produtos (nomes dos produtos)
let unidadesCadastradas = [];
let historicoTurmas = [];
let acaoPendente = null;

// ===== FUNÇÕES DE UTILIDADE =====
function mostrarAlerta(elemento, tipo, mensagem, tempo = 5000) {
  elemento.textContent = mensagem;
  elemento.className = `alert alert-${tipo}`;
  elemento.style.display = 'block';
  setTimeout(() => {
    elemento.style.display = 'none';
  }, tempo);
}

function formatarData(data) {
  if (!data) return '';
  const date = new Date(data);
  if (isNaN(date.getTime())) return data;
  return date.toLocaleDateString('pt-BR');
}

function mostrarModalConfirmacao(mensagem, callbackConfirmar) {
  document.getElementById('modalConfirmacaoBody').textContent = mensagem;
  acaoPendente = callbackConfirmar;
  document.getElementById('modalConfirmacao').style.display = 'flex';
}

// ===== FUNÇÕES DE API =====
async function carregarProdutosDB() {
  try {
    const response = await fetch(`${API_BASE}/api/planejamento/produtos`);
    if (!response.ok) {
      if (response.status === 401) window.location.href = "/login";
      throw new Error(`Erro HTTP ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.error("Erro ao ler banco de produtos:", e);
    try {
      const raw = localStorage.getItem("banco_de_dados_produtos");
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }
}

async function salvarProdutosDB(dados) {
  try {
    const response = await fetch(`${API_BASE}/api/planejamento/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    
    if (!response.ok) {
      if (response.status === 401) window.location.href = "/login";
      throw new Error(`Erro HTTP ${response.status}`);
    }
    
    localStorage.setItem("banco_de_dados_produtos", JSON.stringify(dados));
    return true;
  } catch (e) {
    console.error("Erro ao salvar banco de produtos:", e);
    localStorage.setItem("banco_de_dados_produtos", JSON.stringify(dados));
    return false;
  }
}

async function carregarDB() {
  try {
    const response = await fetch(`${API_BASE}/api/planejamento/db`);
    if (!response.ok) {
      if (response.status === 401) window.location.href = "/login";
      throw new Error(`Erro HTTP ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.error("Erro ao ler DB:", e);
    try {
      const raw = localStorage.getItem("planejamentoProdutosDB");
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }
}

async function salvarDB(dados) {
  try {
    const response = await fetch(`${API_BASE}/api/planejamento/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    
    if (!response.ok) {
      if (response.status === 401) window.location.href = "/login";
      throw new Error(`Erro HTTP ${response.status}`);
    }
    
    localStorage.setItem("planejamentoProdutosDB", JSON.stringify(dados));
    return true;
  } catch (e) {
    console.error("Erro ao salvar DB:", e);
    localStorage.setItem("planejamentoProdutosDB", JSON.stringify(dados));
    return false;
  }
}

async function carregarUnidadesCadastradas() {
  try {
    const response = await fetch(`${API_BASE}/api/planejamento/unidades`);
    if (!response.ok) {
      if (response.status === 401) window.location.href = "/login";
      throw new Error(`Erro HTTP ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.error("Erro ao ler unidades:", e);
    try {
      const raw = localStorage.getItem("planejamentoUnidades");
      return raw ? JSON.parse(raw) : ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte'];
    } catch (err) {
      return ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte'];
    }
  }
}

async function salvarUnidadesCadastradas(unidades) {
  try {
    const response = await fetch(`${API_BASE}/api/planejamento/unidades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unidades)
    });
    
    if (!response.ok) {
      if (response.status === 401) window.location.href = "/login";
      throw new Error(`Erro HTTP ${response.status}`);
    }
    
    localStorage.setItem("planejamentoUnidades", JSON.stringify(unidades));
    return true;
  } catch (e) {
    console.error("Erro ao salvar unidades:", e);
    localStorage.setItem("planejamentoUnidades", JSON.stringify(unidades));
    return false;
  }
}

async function carregarHistorico() {
  try {
    const response = await fetch(`${API_BASE}/historico-dados`);
    if (!response.ok) {
      if (response.status === 401) window.location.href = "/login";
      throw new Error(`Erro HTTP ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.error("Erro ao ler histórico:", e);
    return [];
  }
}

async function calcularSugestao(alunos) {
  try {
    const response = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alunos: alunos })
    });
    
    if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
    return await response.json();
  } catch (e) {
    console.error("Erro ao calcular sugestão:", e);
    return null;
  }
}

async function salvarTurma(turmaData) {
  try {
    const response = await fetch(`${API_BASE}/add-turma`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(turmaData)
    });
    
    if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
    return await response.json();
  } catch (e) {
    console.error("Erro ao salvar turma:", e);
    return null;
  }
}

// ===== FUNÇÕES PARA APAGAR HISTÓRICO =====
async function apagarItemHistorico(index) {
  try {
    const response = await fetch(`${API_BASE}/historico/apagar/${index}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      if (response.status === 401) window.location.href = "/login";
      throw new Error(`Erro HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (e) {
    console.error("Erro ao apagar item do histórico:", e);
    return null;
  }
}

async function apagarVariosItensHistorico(indices) {
  try {
    const response = await fetch(`${API_BASE}/historico/apagar-varios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ indices: indices })
    });
    
    if (!response.ok) {
      if (response.status === 401) window.location.href = "/login";
      throw new Error(`Erro HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (e) {
    console.error("Erro ao apagar itens do histórico:", e);
    return null;
  }
}

async function limparHistoricoCompleto() {
  try {
    const response = await fetch(`${API_BASE}/historico/limpar`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      if (response.status === 401) window.location.href = "/login";
      throw new Error(`Erro HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (e) {
    console.error("Erro ao limpar histórico:", e);
    return null;
  }
}

// ===== FUNÇÕES DE DADOS =====
function getDisciplinasUnicas() {
  const disciplinas = new Set();
  produtosDB.forEach(item => {
    if (item.disciplina) disciplinas.add(item.disciplina);
  });
  return Array.from(disciplinas).sort();
}

function getProdutosUnicos() {
  const produtos = new Set();
  produtosDB.forEach(item => {
    if (item.nome) produtos.add(item.nome);
  });
  return Array.from(produtos).sort();
}

function getListaUnidades() {
  const todasUnidades = new Set();
  unidadesCadastradas.forEach(u => todasUnidades.add(u));
  db.forEach(item => {
    if (item.unidade) todasUnidades.add(item.unidade);
  });
  return Array.from(todasUnidades).sort();
}

function getProdutosPorDisciplina(disciplina) {
  const produtos = new Set();
  produtosDB.forEach(item => {
    if (item.disciplina === disciplina && item.nome) {
      produtos.add(item.nome);
    }
  });
  return Array.from(produtos).sort();
}

function getRegistrosPorUnidade(unidade) {
  return db.filter(item => item.unidade === unidade).length;
}

function calcularConsumoIdeal(registro) {
  const enviado = Number(registro.enviado) || 0;
  const voltou = Number(registro.voltou) || 0;
  const faltou = Number(registro.faltou) || 0;
  return Math.max(0, enviado - voltou + faltou);
}

function calcularConsumoPorAluno(registro) {
  const alunos = Number(registro.alunos) || 0;
  if (alunos <= 0) return 0;
  return calcularConsumoIdeal(registro) / alunos;
}

function getStatusRegistro(registro) {
  const enviado = Number(registro.enviado) || 0;
  const usado = enviado - (Number(registro.voltou) || 0);
  const alunos = Number(registro.alunos) || 0;
  const faltou = Number(registro.faltou) || 0;
  
  if (faltou > 0) return '<span class="badge badge-warning">Faltou</span>';
  if (usado === enviado && alunos > 0) return '<span class="badge badge-success">Perfeito</span>';
  if (usado < enviado) return '<span class="badge badge-info">Sobrou</span>';
  return '<span class="badge">Normal</span>';
}

function getStatusHistorico(turma) {
  const enviados = Number(turma.enviados) || 0;
  const usados = Number(turma.usados) || 0;
  const faltou = Number(turma.faltou) || 0;
  
  if (faltou > 0) return '<span class="badge badge-warning">Faltou</span>';
  if (usados === enviados) return '<span class="badge badge-success">Perfeito</span>';
  if (usados < enviados) return '<span class="badge badge-info">Sobrou</span>';
  return '<span class="badge">Normal</span>';
}

// ===== FUNÇÕES DE ATUALIZAÇÃO =====
function atualizarSelectUnidades(selectId, incluirTodas = false, incluirTodasOpcao = false) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const valorAtual = select.value;
  select.innerHTML = '';

  if (incluirTodas) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Todas';
    select.appendChild(option);
  }

  if (incluirTodasOpcao) {
    const option = document.createElement('option');
    option.value = "TODAS";
    option.textContent = 'TODAS AS UNIDADES';
    select.appendChild(option);
  }

  getListaUnidades().forEach(unidade => {
    const option = document.createElement('option');
    option.value = unidade;
    option.textContent = unidade;
    select.appendChild(option);
  });

  if (getListaUnidades().includes(valorAtual)) {
    select.value = valorAtual;
  } else if (valorAtual === "TODAS") {
    select.value = "TODAS";
  }
}

function atualizarSelectUnidadesCadastro() {
  const select = document.getElementById('unidadeCadastro');
  if (!select) return;
  
  const valorAtual = select.value;
  select.innerHTML = '';

  // Opção padrão
  const defaultOption = document.createElement('option');
  defaultOption.value = "";
  defaultOption.textContent = 'Selecione...';
  select.appendChild(defaultOption);

  // Opção "TODAS AS UNIDADES"
  const todasOption = document.createElement('option');
  todasOption.value = "TODAS";
  todasOption.textContent = 'TODAS AS UNIDADES';
  select.appendChild(todasOption);

  // Unidades cadastradas
  getListaUnidades().forEach(unidade => {
    const option = document.createElement('option');
    option.value = unidade;
    option.textContent = unidade;
    select.appendChild(option);
  });

  // Restaura valor anterior
  if (valorAtual && (valorAtual === "TODAS" || getListaUnidades().includes(valorAtual))) {
    select.value = valorAtual;
  }
}

function atualizarInfoUnidadeSelecionada() {
  const select = document.getElementById('unidadeCadastro');
  const infoDiv = document.getElementById('infoUnidadesSelecionadas');
  const contadorSpan = document.getElementById('contadorUnidadesSelecionadas');
  const listaSpan = document.getElementById('listaUnidadesSelecionadas');
  
  if (!select || !infoDiv) return;
  
  const valorSelecionado = select.value;
  
  if (valorSelecionado === "TODAS") {
    infoDiv.style.display = 'block';
    contadorSpan.textContent = unidadesCadastradas.length;
    listaSpan.textContent = 'Todas as unidades';
  } else if (valorSelecionado) {
    infoDiv.style.display = 'block';
    contadorSpan.textContent = '1';
    listaSpan.textContent = valorSelecionado;
  } else {
    infoDiv.style.display = 'none';
  }
}

function atualizarSelectDisciplinas(selectId, incluirTodas = false) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const valorAtual = select.value;
  select.innerHTML = '';

  if (incluirTodas) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Todas';
    select.appendChild(option);
  }

  getDisciplinasUnicas().forEach(disciplina => {
    const option = document.createElement('option');
    option.value = disciplina;
    option.textContent = disciplina;
    select.appendChild(option);
  });

  if (getDisciplinasUnicas().includes(valorAtual)) {
    select.value = valorAtual;
  }
}

function atualizarSelectProdutos(selectId, incluirTodos = false) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const valorAtual = select.value;
  select.innerHTML = '';

  if (incluirTodos) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Todos';
    select.appendChild(option);
  }

  getProdutosUnicos().forEach(produto => {
    const option = document.createElement('option');
    option.value = produto;
    option.textContent = produto;
    select.appendChild(option);
  });

  if (getProdutosUnicos().includes(valorAtual)) {
    select.value = valorAtual;
  }
}

function atualizarDatalistDisciplinas() {
  const datalist = document.getElementById('disciplinasLista');
  if (!datalist) return;
  
  datalist.innerHTML = '';
  getDisciplinasUnicas().forEach(disciplina => {
    const option = document.createElement('option');
    option.value = disciplina;
    datalist.appendChild(option);
  });
}

function atualizarDatalistProdutos() {
  const datalist = document.getElementById('produtosLista');
  if (!datalist) return;
  
  datalist.innerHTML = '';
  getProdutosUnicos().forEach(produto => {
    const option = document.createElement('option');
    option.value = produto;
    datalist.appendChild(option);
  });
}

// ===== FUNÇÕES PARA ATUALIZAR TABELA DE HISTÓRICO COM SELEÇÃO =====
function atualizarTabelaHistoricoComSelecao() {
  const tbody = document.querySelector('#tabelaHistorico tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  if (historicoTurmas.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 10;
    td.textContent = 'Nenhuma turma registrada';
    td.style.textAlign = 'center';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  historicoTurmas.forEach((turma, index) => {
    const tr = document.createElement('tr');
    tr.dataset.index = index;

    // Checkbox de seleção
    const tdCheck = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkItemHistorico';
    checkbox.dataset.index = index;
    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);

    // Dados da turma
    const campos = [
      turma.turma,
      turma.alunos,
      turma.enviados,
      turma.usados,
      turma.faltou,
      turma.usuario || 'sistema',
      formatarData(turma.data),
      getStatusHistorico(turma)
    ];

    campos.forEach(valor => {
      const td = document.createElement('td');
      if (typeof valor === 'string' && valor.includes('badge')) {
        td.innerHTML = valor;
      } else {
        td.textContent = valor;
      }
      tr.appendChild(td);
    });

    // Ações
    const tdAcoes = document.createElement('td');
    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn btn-danger btn-small';
    btnExcluir.innerHTML = '<i class="fas fa-trash"></i>';
    btnExcluir.title = 'Excluir este item';
    
    btnExcluir.addEventListener('click', () => {
      mostrarModalConfirmacao(
        `Tem certeza que deseja excluir a turma "${turma.turma}"?`,
        async () => {
          const resultado = await apagarItemHistorico(index);
          if (resultado) {
            if (resultado.erro) {
              mostrarAlerta(document.getElementById('alertHistorico'), 'error', resultado.erro);
            } else {
              mostrarAlerta(document.getElementById('alertHistorico'), 'success', resultado.mensagem);
              // Recarrega os dados
              historicoTurmas = await carregarHistorico();
              atualizarTabelaHistoricoComSelecao();
              atualizarStats();
            }
          } else {
            mostrarAlerta(document.getElementById('alertHistorico'), 'error', 'Erro ao excluir item.');
          }
        }
      );
    });

    tdAcoes.appendChild(btnExcluir);
    tr.appendChild(tdAcoes);
    tbody.appendChild(tr);
  });

  // Atualiza o checkbox "Selecionar Todos"
  const checkAll = document.getElementById('checkAllHistorico');
  if (checkAll) {
    checkAll.checked = false;
    checkAll.addEventListener('change', function() {
      const checkboxes = document.querySelectorAll('.checkItemHistorico');
      checkboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
      });
    });
  }
}

// Função para obter itens selecionados
function getItensSelecionadosHistorico() {
  const checkboxes = document.querySelectorAll('.checkItemHistorico:checked');
  const indices = [];
  checkboxes.forEach(checkbox => {
    indices.push(parseInt(checkbox.dataset.index));
  });
  return indices;
}

function atualizarTabelaProdutos() {
  const tbody = document.querySelector('#tabelaProdutos tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  if (produtosDB.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'Nenhum produto cadastrado';
    td.style.textAlign = 'center';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  produtosDB.forEach((produto, index) => {
    const tr = document.createElement('tr');

    // Unidade(s)
    const tdUnidades = document.createElement('td');
    if (Array.isArray(produto.unidades)) {
      if (produto.unidades.length === unidadesCadastradas.length) {
        tdUnidades.textContent = 'TODAS';
        tdUnidades.style.fontWeight = 'bold';
        tdUnidades.style.color = 'var(--gold)';
      } else {
        tdUnidades.textContent = produto.unidades.join(', ');
      }
    } else if (produto.unidade === "TODAS") {
      tdUnidades.textContent = 'TODAS';
      tdUnidades.style.fontWeight = 'bold';
      tdUnidades.style.color = 'var(--gold)';
    } else {
      tdUnidades.textContent = produto.unidade || 'N/A';
    }

    // Disciplina
    const tdDisciplina = document.createElement('td');
    tdDisciplina.textContent = produto.disciplina || '';

    // Nome do Produto
    const tdNome = document.createElement('td');
    tdNome.textContent = produto.nome || '';

    // Data de Cadastro
    const tdData = document.createElement('td');
    tdData.textContent = formatarData(produto.dataCadastro);

    // Ações
    const tdAcoes = document.createElement('td');
    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn btn-danger btn-small';
    btnExcluir.innerHTML = '<i class="fas fa-trash"></i> Excluir';
    
    btnExcluir.addEventListener('click', () => {
      mostrarModalConfirmacao(
        `Tem certeza que deseja excluir o produto "${produto.nome}"?`,
        async () => {
          produtosDB.splice(index, 1);
          const salvo = await salvarProdutosDB(produtosDB);
          if (salvo) {
            await inicializarDados();
            mostrarAlerta(document.getElementById('alertCadastro'), 'success', 'Produto excluído com sucesso!');
          } else {
            mostrarAlerta(document.getElementById('alertCadastro'), 'error', 'Erro ao excluir produto.');
            produtosDB.splice(index, 0, produto);
          }
        }
      );
    });

    tdAcoes.appendChild(btnExcluir);
    tr.appendChild(tdUnidades);
    tr.appendChild(tdDisciplina);
    tr.appendChild(tdNome);
    tr.appendChild(tdData);
    tr.appendChild(tdAcoes);
    tbody.appendChild(tr);
  });
}

function atualizarTabelaUnidades() {
  const tbody = document.querySelector('#tabelaUnidades tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  if (unidadesCadastradas.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.textContent = 'Nenhuma unidade cadastrada';
    td.style.textAlign = 'center';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  unidadesCadastradas.forEach((unidade, index) => {
    const tr = document.createElement('tr');

    const tdNome = document.createElement('td');
    tdNome.textContent = unidade;

    const tdRegistros = document.createElement('td');
    const registros = getRegistrosPorUnidade(unidade);
    tdRegistros.textContent = registros;
    tdRegistros.style.fontWeight = registros > 0 ? 'bold' : 'normal';
    tdRegistros.style.color = registros > 0 ? 'var(--accent)' : 'var(--muted)';

    const tdAcoes = document.createElement('td');
    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn btn-danger btn-small';
    btnExcluir.innerHTML = '<i class="fas fa-trash"></i> Excluir';
    
    btnExcluir.addEventListener('click', () => {
      const registrosUnidade = getRegistrosPorUnidade(unidade);
      
      if (registrosUnidade > 0) {
        mostrarModalConfirmacao(
          `A unidade "${unidade}" tem ${registrosUnidade} registros. Deseja realmente excluir? Todos os registros desta unidade também serão removidos.`,
          async () => {
            // Remove registros desta unidade do DB
            const novosDados = db.filter(item => item.unidade !== unidade);
            const salvoDB = await salvarDB(novosDados);
            
            if (!salvoDB) {
              mostrarAlerta(document.getElementById('alertUnidades'), 'error', 'Erro ao remover registros da unidade.');
              return;
            }
            
            // Remove a unidade
            unidadesCadastradas.splice(index, 1);
            const salvo = await salvarUnidadesCadastradas(unidadesCadastradas);
            if (salvo) {
              await inicializarDados();
              mostrarAlerta(document.getElementById('alertUnidades'), 'success', 'Unidade excluída com sucesso!');
            } else {
              mostrarAlerta(document.getElementById('alertUnidades'), 'error', 'Erro ao excluir unidade.');
              unidadesCadastradas.splice(index, 0, unidade);
            }
          }
        );
      } else {
        mostrarModalConfirmacao(
          `Tem certeza que deseja excluir a unidade "${unidade}"?`,
          async () => {
            unidadesCadastradas.splice(index, 1);
            const salvo = await salvarUnidadesCadastradas(unidadesCadastradas);
            if (salvo) {
              await inicializarDados();
              mostrarAlerta(document.getElementById('alertUnidades'), 'success', 'Unidade excluída com sucesso!');
            } else {
              mostrarAlerta(document.getElementById('alertUnidades'), 'error', 'Erro ao excluir unidade.');
              unidadesCadastradas.splice(index, 0, unidade);
            }
          }
        );
      }
    });

    tdAcoes.appendChild(btnExcluir);
    tr.appendChild(tdNome);
    tr.appendChild(tdRegistros);
    tr.appendChild(tdAcoes);
    tbody.appendChild(tr);
  });
}

function atualizarTabelaDB() {
  const tbody = document.querySelector('#tabelaDB tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  const unidadeFiltro = document.getElementById('unidadeDB').value;
  const disciplinaFiltro = document.getElementById('disciplinaDB').value;
  const produtoFiltro = document.getElementById('produtoDB').value;

  const registrosFiltrados = db.filter(registro => {
    if (unidadeFiltro && registro.unidade !== unidadeFiltro) return false;
    if (disciplinaFiltro && registro.disciplina !== disciplinaFiltro) return false;
    if (produtoFiltro && registro.produto !== produtoFiltro) return false;
    return true;
  });

  if (registrosFiltrados.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 10;
    td.textContent = 'Nenhum registro encontrado';
    td.style.textAlign = 'center';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  registrosFiltrados.forEach((registro, index) => {
    const tr = document.createElement('tr');

    const campos = [
      formatarData(registro.data),
      registro.unidade,
      registro.disciplina,
      registro.produto,
      registro.alunos,
      registro.enviado,
      registro.voltou,
      registro.faltou,
      getStatusRegistro(registro)
    ];

    campos.forEach(valor => {
      const td = document.createElement('td');
      if (typeof valor === 'string' && valor.includes('badge')) {
        td.innerHTML = valor;
      } else {
        td.textContent = valor;
      }
      tr.appendChild(td);
    });

    const tdAcoes = document.createElement('td');
    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn btn-danger btn-small';
    btnExcluir.innerHTML = '<i class="fas fa-trash"></i>';
    btnExcluir.title = 'Excluir registro';
    btnExcluir.addEventListener('click', () => {
      mostrarModalConfirmacao('Tem certeza que deseja excluir este registro?', async () => {
        db.splice(index, 1);
        const salvo = await salvarDB(db);
        if (salvo) {
          await inicializarDados();
          mostrarAlerta(document.getElementById('alertDB'), 'success', 'Registro excluído com sucesso!');
        } else {
          mostrarAlerta(document.getElementById('alertDB'), 'error', 'Erro ao excluir registro.');
          db.splice(index, 0, registro);
          atualizarTabelaDB();
        }
      });
    });

    tdAcoes.appendChild(btnExcluir);
    tr.appendChild(tdAcoes);
    tbody.appendChild(tr);
  });
}

function atualizarTabelaAtividades() {
  const tbody = document.querySelector('#tabelaAtividades tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  // Coleta atividades recentes
  const atividades = [];
  
  // Últimos registros do banco (mais recentes)
  const ultimosRegistros = [...db]
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .slice(0, 5);
  
  ultimosRegistros.forEach(registro => {
    atividades.push({
      data: registro.data,
      usuario: 'Sistema',
      acao: 'Registro salvo',
      detalhes: `${registro.disciplina} - ${registro.produto} (${registro.unidade})`
    });
  });
  
  // Últimas turmas
  const ultimasTurmas = [...historicoTurmas]
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .slice(0, 3);
  
  ultimasTurmas.forEach(turma => {
    atividades.push({
      data: turma.data,
      usuario: turma.usuario || 'Sistema',
      acao: 'Turma salva',
      detalhes: turma.turma
    });
  });
  
  // Ordena por data (mais recente primeiro)
  atividades.sort((a, b) => new Date(b.data) - new Date(a.data));
  
  // Mostra as 8 mais recentes
  const atividadesExibir = atividades.slice(0, 8);
  
  if (atividadesExibir.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = 'Nenhuma atividade recente';
    td.style.textAlign = 'center';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  atividadesExibir.forEach(atividade => {
    const tr = document.createElement('tr');
    
    const tdData = document.createElement('td');
    tdData.textContent = formatarData(atividade.data);
    
    const tdUsuario = document.createElement('td');
    tdUsuario.textContent = atividade.usuario;
    
    const tdAcao = document.createElement('td');
    tdAcao.textContent = atividade.acao;
    
    const tdDetalhes = document.createElement('td');
    tdDetalhes.textContent = atividade.detalhes;
    
    tr.appendChild(tdData);
    tr.appendChild(tdUsuario);
    tr.appendChild(tdAcao);
    tr.appendChild(tdDetalhes);
    tbody.appendChild(tr);
  });
}

function atualizarStats() {
  // Atualiza valores
  document.getElementById('statRegistros').textContent = db.length;
  document.getElementById('statUnidades').textContent = unidadesCadastradas.length;
  document.getElementById('statTurmas').textContent = historicoTurmas.length;
  document.getElementById('statDisciplinas').textContent = getDisciplinasUnicas().length;
  
  // Atualiza barras de progresso (usando valores relativos)
  const maxRegistros = Math.max(db.length, 100);
  const maxUnidades = Math.max(unidadesCadastradas.length, 10);
  const maxTurmas = Math.max(historicoTurmas.length, 50);
  const maxDisciplinas = Math.max(getDisciplinasUnicas().length, 20);
  
  document.getElementById('progressRegistros').style.width = `${(db.length / maxRegistros) * 100}%`;
  document.getElementById('progressUnidades').style.width = `${(unidadesCadastradas.length / maxUnidades) * 100}%`;
  document.getElementById('progressTurmas').style.width = `${(historicoTurmas.length / maxTurmas) * 100}%`;
  document.getElementById('progressDisciplinas').style.width = `${(getDisciplinasUnicas().length / maxDisciplinas) * 100}%`;
}

async function atualizarTudo() {
  // Atualiza selects
  atualizarSelectUnidades('unidadeDB', true);
  atualizarSelectUnidades('unidadeParametros', false, true);
  atualizarSelectUnidadesCadastro();
  atualizarSelectDisciplinas('disciplinaSugestao');
  atualizarSelectDisciplinas('disciplinaDB', true);
  atualizarSelectDisciplinas('disciplinaParametros');
  atualizarSelectProdutos('produtoDB', true);
  atualizarDatalistDisciplinas();
  atualizarDatalistProdutos();
  
  // Atualiza tabelas
  atualizarTabelaProdutos();
  atualizarTabelaUnidades();
  atualizarTabelaDB();
  atualizarTabelaHistoricoComSelecao();
  atualizarTabelaAtividades();
  atualizarStats();
  atualizarInfoUnidadeSelecionada();
}

// ===== FUNÇÕES DE INICIALIZAÇÃO =====
async function aplicarConfUsuario() {
  const avatarEl = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');

  if (!avatarEl) return;

  try {
    // Busca informações do usuário atual
    const response = await fetch(`${API_BASE}/api/usuario/atual`);
    if (response.ok) {
      const userData = await response.json();
      const nome = userData.username || "{{ usuario or 'Usuário' }}";
      const tipo = userData.role || "{{ role or 'Usuário' }}";
      
      if (nameEl) nameEl.textContent = nome;
      if (roleEl) roleEl.textContent = tipo;
      
      // Busca foto do usuário
      const fotoResponse = await fetch(`${API_BASE}/api/usuario/${nome}/foto`);
      if (fotoResponse.ok) {
        const fotoData = await fotoResponse.json();
        if (fotoData.foto) {
          avatarEl.style.backgroundImage = `url('${fotoData.foto}')`;
          avatarEl.style.backgroundColor = "transparent";
          avatarEl.innerHTML = "";
        } else if (tipo.toLowerCase().includes("admin")) {
          avatarEl.style.backgroundImage = `url('${ADMIN_AVATAR_URL}')`;
          avatarEl.style.backgroundColor = "transparent";
          avatarEl.innerHTML = "";
        } else {
          avatarEl.style.backgroundImage = "none";
          avatarEl.style.backgroundColor = "#000";
          avatarEl.innerHTML = nome.charAt(0).toUpperCase();
        }
      }
    }
  } catch (error) {
    console.error("Erro ao carregar informações do usuário:", error);
    const nome = "{{ usuario or 'Usuário' }}";
    const tipo = "{{ role or 'Usuário' }}";
    
    if (nameEl) nameEl.textContent = nome;
    if (roleEl) roleEl.textContent = tipo;
    
    if (tipo.toLowerCase().includes("admin")) {
      avatarEl.style.backgroundImage = `url('${ADMIN_AVATAR_URL}')`;
    } else {
      avatarEl.style.backgroundImage = "none";
      avatarEl.style.backgroundColor = "#000";
      avatarEl.innerHTML = nome.charAt(0).toUpperCase();
    }
  }
}

async function inicializarDados() {
  try {
    db = await carregarDB();
    produtosDB = await carregarProdutosDB();
    unidadesCadastradas = await carregarUnidadesCadastradas();
    historicoTurmas = await carregarHistorico();
    
    console.log("Dados carregados:", {
      registros: db.length,
      produtos: produtosDB.length,
      unidades: unidadesCadastradas.length,
      turmas: historicoTurmas.length,
      disciplinas: getDisciplinasUnicas().length
    });
    
    await atualizarTudo();
  } catch (error) {
    console.error("Erro ao inicializar dados:", error);
  }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', async function() {
  // Configura data atual
  const hoje = new Date().toISOString().split('T')[0];
  
  // Define datas padrão
  ['dataParametros'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = hoje;
  });
  
  // Inicializa sistema
  await aplicarConfUsuario();
  await inicializarDados();
  
  // Navegação entre abas
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
      document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
      });
      this.classList.add('active');

      document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
      });

      const tabId = this.getAttribute('data-tab');
      const tabPane = document.getElementById(tabId);
      if (tabPane) {
        tabPane.classList.add('active');
        
        // Atualiza título da página
        const pageTitle = document.querySelector('.page-title h1');
        const pageSubtitle = document.querySelector('.page-title p');
        
        const titulos = {
          'dashboard': ['Dashboard', 'Visão geral do sistema de planejamento'],
          'sugestao': ['Sugestão por Disciplina', 'Gere sugestões baseadas no histórico de consumo'],
          'cadastro': ['Cadastro de Produtos', 'Adicione produtos ao banco de dados'],
          'database': ['Banco de Dados', 'Consulte e gerencie os registros existentes'],
          'parametros': ['Parâmetros do Sistema', 'Configure as opções do sistema'],
          'unidades': ['Gerenciar Unidades', 'Adicione e remova unidades do sistema'],
          'historico': ['Histórico de Turmas', 'Registros do sistema antigo']
        };
        
        if (titulos[tabId]) {
          pageTitle.textContent = titulos[tabId][0];
          pageSubtitle.textContent = titulos[tabId][1];
        }
      }
    });
  });
  
  // Ações rápidas do dashboard
  document.querySelectorAll('[data-tab]').forEach(btn => {
    if (btn.hasAttribute('data-tab') && !btn.classList.contains('nav-item')) {
      btn.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');
        document.querySelector(`[data-tab="${tabId}"]`).click();
      });
    }
  });

  // Botão Atualizar
  document.getElementById('btnAtualizar').addEventListener('click', async function() {
    await inicializarDados();
    mostrarAlerta(document.getElementById('alertSugestao'), 'success', 'Sistema atualizado com sucesso!');
  });

  // Botão Logout
  document.getElementById('btnLogout').addEventListener('click', function() {
    mostrarModalConfirmacao('Tem certeza que deseja sair do sistema?', () => {
      window.location.href = "/logout";
    });
  });

  // Modal handlers
  document.getElementById('btnModalCancelar').addEventListener('click', function() {
    document.getElementById('modalConfirmacao').style.display = 'none';
    acaoPendente = null;
  });

  document.getElementById('btnModalConfirmar').addEventListener('click', function() {
    if (acaoPendente) {
      acaoPendente();
    }
    document.getElementById('modalConfirmacao').style.display = 'none';
    acaoPendente = null;
  });

  // Fechar modal ao clicar fora
  window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
      event.target.style.display = 'none';
      if (event.target.id === 'modalConfirmacao') {
        acaoPendente = null;
      }
    }
  });

  // ===== ABA HISTÓRICO - Event Listeners para apagar =====

  // Botão Selecionar Todos
  document.getElementById('btnSelecionarTodos')?.addEventListener('click', function() {
    const checkboxes = document.querySelectorAll('.checkItemHistorico');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
    document.getElementById('checkAllHistorico').checked = true;
  });

  // Botão Deselecionar Todos
  document.getElementById('btnDeselecionarTodos')?.addEventListener('click', function() {
    const checkboxes = document.querySelectorAll('.checkItemHistorico');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    document.getElementById('checkAllHistorico').checked = false;
  });

  // Botão Apagar Selecionados
  document.getElementById('btnApagarSelecionados')?.addEventListener('click', async function() {
    const indices = getItensSelecionadosHistorico();
    const alertHistorico = document.getElementById('alertHistorico');
    
    if (indices.length === 0) {
      mostrarAlerta(alertHistorico, 'error', 'Selecione pelo menos um item para apagar.');
      return;
    }
    
    mostrarModalConfirmacao(
      `Tem certeza que deseja apagar ${indices.length} item(s) selecionado(s)?`,
      async () => {
        const resultado = await apagarVariosItensHistorico(indices);
        if (resultado) {
          if (resultado.erro) {
            mostrarAlerta(alertHistorico, 'error', resultado.erro);
          } else {
            mostrarAlerta(alertHistorico, 'success', resultado.mensagem);
            // Recarrega os dados
            historicoTurmas = await carregarHistorico();
            atualizarTabelaHistoricoComSelecao();
            atualizarStats();
            
            // Desmarca "Selecionar Todos"
            document.getElementById('checkAllHistorico').checked = false;
          }
        } else {
          mostrarAlerta(alertHistorico, 'error', 'Erro ao apagar itens.');
        }
      }
    );
  });

  // Botão Limpar Tudo
  document.getElementById('btnLimparHistorico')?.addEventListener('click', function() {
    const alertHistorico = document.getElementById('alertHistorico');
    
    mostrarModalConfirmacao(
      'ATENÇÃO: Tem certeza que deseja limpar TODO o histórico? Esta ação não pode ser desfeita!',
      async () => {
        const resultado = await limparHistoricoCompleto();
        if (resultado) {
          if (resultado.erro) {
            mostrarAlerta(alertHistorico, 'error', resultado.erro);
          } else {
            mostrarAlerta(alertHistorico, 'success', resultado.mensagem);
            // Recarrega os dados
            historicoTurmas = await carregarHistorico();
            atualizarTabelaHistoricoComSelecao();
            atualizarStats();
          }
        } else {
          mostrarAlerta(alertHistorico, 'error', 'Erro ao limpar histórico.');
        }
      }
    );
  });

  // ===== ABA SUGESTÃO =====
  document.getElementById('btnGerarSugestao').addEventListener('click', function() {
    const disciplina = document.getElementById('disciplinaSugestao').value;
    const alunos = parseInt(document.getElementById('alunosSugestao').value);
    const alertSugestao = document.getElementById('alertSugestao');

    if (!disciplina) {
      mostrarAlerta(alertSugestao, 'error', 'Selecione uma disciplina.');
      return;
    }

    if (isNaN(alunos) || alunos <= 0) {
      mostrarAlerta(alertSugestao, 'error', 'Informe uma quantidade válida de alunos.');
      return;
    }

    const registrosDisciplina = db.filter(item => item.disciplina === disciplina);

    if (registrosDisciplina.length === 0) {
      mostrarAlerta(alertSugestao, 'info', 'Não há registros para esta disciplina.');
      return;
    }

    const produtosMap = new Map();

    registrosDisciplina.forEach(registro => {
      const produto = registro.produto;
      const consumoPorAluno = calcularConsumoPorAluno(registro);

      if (!produtosMap.has(produto)) {
        produtosMap.set(produto, {
          soma: 0,
          quantidade: 0
        });
      }

      const dados = produtosMap.get(produto);
      dados.soma += consumoPorAluno;
      dados.quantidade += 1;
    });

    const tbody = document.querySelector('#tabelaSugestao tbody');
    tbody.innerHTML = '';

    let totalSugerido = 0;

    produtosMap.forEach((dados, produto) => {
      const media = dados.quantidade > 0 ? dados.soma / dados.quantidade : 0;
      const valor =Math.ceil(media)
      const sugestao =media * alunos;
      
      totalSugerido += sugestao;

      const tr = document.createElement('tr');
      const test= sugestao+1;
      const cells = [
        produto,
        media.toFixed(2),
        dados.quantidade,
        sugestao.toFixed(2),
        
        Math.ceil(test)
      ];

      cells.forEach(texto => {
        const td = document.createElement('td');
        td.textContent = texto;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    document.getElementById('wrapTabelaSugestao').style.display = 'block';
    document.getElementById('cardSugestaoResumo').style.display = 'block';
    document.getElementById('textoSugestaoResumo').innerHTML = `
      <p><strong>Total sugerides:</strong> ${totalSugerido.toFixed(2)} unidades</p>
      <p><strong>Total arredondado:</strong> ${Math.ceil(totalSugerido)} unidades</p>
      <p><strong>Alunos:</strong> ${alunos}</p>
      <p><strong>Disciplina:</strong> ${disciplina}</p>
      <p><strong>Registros analisados:</strong> ${registrosDisciplina.length}</p>
    `;

    mostrarAlerta(alertSugestao, 'success', 'Sugestão gerada com sucesso!');
  });

  // ===== ABA CADASTRO =====
  document.getElementById('unidadeCadastro').addEventListener('change', atualizarInfoUnidadeSelecionada);

  document.getElementById('btnSalvarCadastro').addEventListener('click', async function() {
    const unidadeSelecionada = document.getElementById('unidadeCadastro').value;
    const disciplina = document.getElementById('disciplinaCadastro').value.trim();
    const produto = document.getElementById('produtoCadastro').value.trim();
    const alertCadastro = document.getElementById('alertCadastro');

    // Validações
    if (!unidadeSelecionada) {
      mostrarAlerta(alertCadastro, 'error', 'Selecione uma unidade.');
      return;
    }
    
    if (!disciplina) {
      mostrarAlerta(alertCadastro, 'error', 'Informe a disciplina.');
      return;
    }
    
    if (!produto) {
      mostrarAlerta(alertCadastro, 'error', 'Informe o produto.');
      return;
    }

    // Determina as unidades finais
    let unidadesParaSalvar = unidadeSelecionada === "TODAS" ? [...unidadesCadastradas] : [unidadeSelecionada];

    // Verifica se o produto já existe para alguma das unidades selecionadas
    const produtoExistente = produtosDB.find(p => 
      p.disciplina === disciplina && 
      p.nome === produto && 
      (
        (Array.isArray(p.unidades) && p.unidades.some(u => unidadesParaSalvar.includes(u))) ||
        (p.unidade && unidadesParaSalvar.includes(p.unidade))
      )
    );

    if (produtoExistente) {
      mostrarAlerta(alertCadastro, 'error', 'Este produto já está cadastrado para esta disciplina em uma das unidades selecionadas.');
      return;
    }

    // Adiciona ao banco de produtos
    const novoProduto = {
      disciplina: disciplina,
      nome: produto,
      dataCadastro: new Date().toISOString().split('T')[0],
      unidades: unidadeSelecionada === "TODAS" ? [...unidadesCadastradas] : [unidadeSelecionada]
    };

    produtosDB.push(novoProduto);
    const salvo = await salvarProdutosDB(produtosDB);
    
    if (salvo) {
      mostrarAlerta(alertCadastro, 'success', `Produto cadastrado com sucesso em ${unidadesParaSalvar.length} unidade(s)!`);
      // Limpa campos
      document.getElementById('unidadeCadastro').value = "";
      document.getElementById('disciplinaCadastro').value = '';
      document.getElementById('produtoCadastro').value = '';
      atualizarInfoUnidadeSelecionada();
      await inicializarDados();
    } else {
      mostrarAlerta(alertCadastro, 'error', 'Erro ao salvar produto.');
    }
  });

  // ===== ABA BANCO DE DADOS =====
  document.getElementById('btnLimparFiltros').addEventListener('click', function() {
    document.getElementById('unidadeDB').value = '';
    document.getElementById('disciplinaDB').value = '';
    document.getElementById('produtoDB').value = '';
    atualizarTabelaDB();
  });

  document.getElementById('btnApagarFiltrados').addEventListener('click', function() {
    const unidadeFiltro = document.getElementById('unidadeDB').value;
    const disciplinaFiltro = document.getElementById('disciplinaDB').value;
    const produtoFiltro = document.getElementById('produtoDB').value;

    if (!unidadeFiltro && !disciplinaFiltro && !produtoFiltro) {
      mostrarAlerta(document.getElementById('alertDB'), 'error', 'Selecione pelo menos um filtro para apagar registros.');
      return;
    }

    const registrosParaApagar = db.filter(registro => {
      if (unidadeFiltro && registro.unidade !== unidadeFiltro) return false;
      if (disciplinaFiltro && registro.disciplina !== disciplinaFiltro) return false;
      if (produtoFiltro && registro.produto !== produtoFiltro) return false;
      return true;
    });

    if (registrosParaApagar.length === 0) {
      mostrarAlerta(document.getElementById('alertDB'), 'info', 'Nenhum registro encontrado com os filtros selecionados.');
      return;
    }

    mostrarModalConfirmacao(
      `Tem certeza que deseja apagar ${registrosParaApagar.length} registro(s) que correspondem aos filtros atuais?`,
      async () => {
        const novosDados = db.filter(registro => {
          if (unidadeFiltro && registro.unidade !== unidadeFiltro) return true;
          if (disciplinaFiltro && registro.disciplina !== disciplinaFiltro) return true;
          if (produtoFiltro && registro.produto !== produtoFiltro) return true;
          return false;
        });

        const salvo = await salvarDB(novosDados);
        if (salvo) {
          await inicializarDados();
          mostrarAlerta(document.getElementById('alertDB'), 'success', `${registrosParaApagar.length} registro(s) apagado(s) com sucesso!`);
        } else {
          mostrarAlerta(document.getElementById('alertDB'), 'error', 'Erro ao apagar registros.');
        }
      }
    );
  });

  // Filtros em tempo real
  document.getElementById('unidadeDB').addEventListener('change', atualizarTabelaDB);
  document.getElementById('disciplinaDB').addEventListener('change', atualizarTabelaDB);
  document.getElementById('produtoDB').addEventListener('change', atualizarTabelaDB);

  // ===== ABA PARÂMETROS =====
  // Mostrar/ocultar aviso para TODAS AS UNIDADES
  document.getElementById('unidadeParametros').addEventListener('change', function() {
    const infoDiv = document.getElementById('infoUnidadesParametros');
    const contadorSpan = document.getElementById('contadorUnidadesParametros');
    
    if (this.value === "TODAS") {
      infoDiv.style.display = 'block';
      contadorSpan.textContent = unidadesCadastradas.length;
    } else {
      infoDiv.style.display = 'none';
    }
  });

  document.getElementById('btnCarregarProdutos').addEventListener('click', function() {
    const unidade = document.getElementById('unidadeParametros').value;
    const disciplina = document.getElementById('disciplinaParametros').value;
    const alertParametros = document.getElementById('alertParametros');

    if (!disciplina) {
      mostrarAlerta(alertParametros, 'error', 'Selecione uma disciplina.');
      return;
    }
    
    if (!unidade) {
      mostrarAlerta(alertParametros, 'error', 'Selecione uma unidade.');
      return;
    }

    let produtos = getProdutosPorDisciplina(disciplina);

    if (produtos.length === 0) {
      mostrarAlerta(alertParametros, 'info', 'Não há produtos cadastrados para esta disciplina.');
      return;
    }

    const tbody = document.querySelector('#tabelaParametros tbody');
    tbody.innerHTML = '';

    produtos.forEach(produto => {
      const tr = document.createElement('tr');
      
      // Encontra registros existentes
      let enviado = 0, voltou = 0, faltou = 0;
      
      if (unidade === "TODAS") {
        // Para TODAS AS UNIDADES, pega a média dos registros existentes
        const registrosProduto = db.filter(item => 
          item.disciplina === disciplina && 
          item.produto === produto
        );
        
        if (registrosProduto.length > 0) {
          enviado = Math.round(registrosProduto.reduce((sum, item) => sum + (item.enviado || 0), 0) / registrosProduto.length);
          voltou = Math.round(registrosProduto.reduce((sum, item) => sum + (item.voltou || 0), 0) / registrosProduto.length);
          faltou = Math.round(registrosProduto.reduce((sum, item) => sum + (item.faltou || 0), 0) / registrosProduto.length);
        }
      } else {
        // Para unidade específica, pega o último registro
        const registrosExistentes = db.filter(item => 
          item.unidade === unidade && 
          item.disciplina === disciplina && 
          item.produto === produto
        );

        if (registrosExistentes.length > 0) {
          const ultimoRegistro = registrosExistentes[registrosExistentes.length - 1];
          enviado = ultimoRegistro.enviado || 0;
          voltou = ultimoRegistro.voltou || 0;
          faltou = ultimoRegistro.faltou || 0;
        }
      }

      const tdCheck = document.createElement('td');
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = true;
      tdCheck.appendChild(check);

      const tdProduto = document.createElement('td');
      tdProduto.textContent = produto;

      const tdEnviado = document.createElement('td');
      const inputEnviado = document.createElement('input');
      inputEnviado.type = 'number';
      inputEnviado.min = '0';
      inputEnviado.value = enviado;
      inputEnviado.className = 'form-control';
      tdEnviado.appendChild(inputEnviado);

      const tdVoltou = document.createElement('td');
      const inputVoltou = document.createElement('input');
      inputVoltou.type = 'number';
      inputVoltou.min = '0';
      inputVoltou.value = voltou;
      inputVoltou.className = 'form-control';
      tdVoltou.appendChild(inputVoltou);

      const tdFaltou = document.createElement('td');
      const inputFaltou = document.createElement('input');
      inputFaltou.type = 'number';
      inputFaltou.min = '0';
      inputFaltou.value = faltou;
      inputFaltou.className = 'form-control';
      tdFaltou.appendChild(inputFaltou);

      const tdAcao = document.createElement('td');
      const btnRemover = document.createElement('button');
      btnRemover.className = 'btn btn-danger btn-small';
      btnRemover.innerHTML = '<i class="fas fa-trash"></i>';
      btnRemover.title = 'Remover produto da lista';
      btnRemover.addEventListener('click', function() {
        mostrarModalConfirmacao(`Deseja remover o produto "${produto}" da lista de parâmetros?`, function() {
          tr.remove();
          const linhasRestantes = document.querySelectorAll('#tabelaParametros tbody tr').length;
          if (linhasRestantes === 0) {
            document.getElementById('wrapTabelaParametros').style.display = 'none';
            document.getElementById('acoesParametros').style.display = 'none';
          }
          mostrarAlerta(alertParametros, 'success', 'Produto removido da lista de parâmetros!');
        });
      });
      tdAcao.appendChild(btnRemover);

      tr.appendChild(tdCheck);
      tr.appendChild(tdProduto);
      tr.appendChild(tdEnviado);
      tr.appendChild(tdVoltou);
      tr.appendChild(tdFaltou);
      tr.appendChild(tdAcao);
      tbody.appendChild(tr);
    });

    document.getElementById('wrapTabelaParametros').style.display = 'block';
    document.getElementById('acoesParametros').style.display = 'block';
    mostrarAlerta(alertParametros, 'success', `${produtos.length} produto(s) carregado(s) com sucesso!`);
  });

  document.getElementById('btnSalvarParametros').addEventListener('click', async function() {
    const unidade = document.getElementById('unidadeParametros').value;
    const disciplina = document.getElementById('disciplinaParametros').value;
    const data = document.getElementById('dataParametros').value;
    const alunosGeral = parseInt(document.getElementById('alunosParametrosGeral').value) || 0;
    const alertParametros = document.getElementById('alertParametros');

    if (!unidade || !disciplina) {
      mostrarAlerta(alertParametros, 'error', 'Selecione uma unidade e uma disciplina.');
      return;
    }
    if (!data) {
      mostrarAlerta(alertParametros, 'error', 'Informe a data.');
      return;
    }
    if (alunosGeral <= 0) {
      mostrarAlerta(alertParametros, 'error', 'Informe uma quantidade válida de alunos.');
      return;
    }

    const linhas = document.querySelectorAll('#tabelaParametros tbody tr');
    let registrosSalvos = 0;

    if (unidade === "TODAS") {
      // Para TODAS AS UNIDADES, cria um modal de confirmação
      mostrarModalConfirmacao(
        `Deseja salvar estes parâmetros em TODAS as ${unidadesCadastradas.length} unidades?`,
        async () => {
          // Remove registros antigos para todas as unidades
          const novosDados = db.filter(item => 
            !(unidadesCadastradas.includes(item.unidade) && item.disciplina === disciplina && item.data === data)
          );

          unidadesCadastradas.forEach(unidadeNome => {
            linhas.forEach(linha => {
              const check = linha.querySelector('input[type="checkbox"]');
              const inputs = linha.querySelectorAll('input[type="number"]');
              const produto = linha.cells[1].textContent;

              if (check.checked) {
                const enviado = parseInt(inputs[0].value) || 0;
                const voltou = parseInt(inputs[1].value) || 0;
                const faltou = parseInt(inputs[2].value) || 0;

                if (enviado > 0 || voltou > 0 || faltou > 0) {
                  novosDados.push({
                    data,
                    unidade: unidadeNome,
                    disciplina,
                    produto,
                    alunos: alunosGeral,
                    enviado: enviado,
                    voltou: voltou,
                    faltou: faltou
                  });
                  registrosSalvos++;
                }
              }
            });
          });

          if (registrosSalvos === 0) {
            mostrarAlerta(alertParametros, 'error', 'Nenhum registro selecionado para salvar.');
            return;
          }

          db = novosDados;
          const salvo = await salvarDB(db);
          if (salvo) {
            await inicializarDados();
            mostrarAlerta(alertParametros, 'success', `${registrosSalvos} registro(s) salvo(s) com sucesso em ${unidadesCadastradas.length} unidades!`);
            document.getElementById('wrapTabelaParametros').style.display = 'none';
            document.getElementById('acoesParametros').style.display = 'none';
          } else {
            mostrarAlerta(alertParametros, 'error', 'Erro ao salvar registros.');
          }
        }
      );
    } else {
      // Para unidade específica
      // Remove registros antigos
      const novosDados = db.filter(item => 
        !(item.unidade === unidade && item.disciplina === disciplina && item.data === data)
      );

      linhas.forEach(linha => {
        const check = linha.querySelector('input[type="checkbox"]');
        const inputs = linha.querySelectorAll('input[type="number"]');
        const produto = linha.cells[1].textContent;

        if (check.checked) {
          const enviado = parseInt(inputs[0].value) || 0;
          const voltou = parseInt(inputs[1].value) || 0;
          const faltou = parseInt(inputs[2].value) || 0;

          if (enviado > 0 || voltou > 0 || faltou > 0) {
            novosDados.push({
              data,
              unidade,
              disciplina,
              produto,
              alunos: alunosGeral,
              enviado: enviado,
              voltou: voltou,
              faltou: faltou
            });
            registrosSalvos++;
          }
        }
      });

      if (registrosSalvos === 0) {
        mostrarAlerta(alertParametros, 'error', 'Nenhum registro selecionado para salvar.');
        return;
      }

      db = novosDados;
      const salvo = await salvarDB(db);
      if (salvo) {
        await inicializarDados();
        mostrarAlerta(alertParametros, 'success', `${registrosSalvos} registro(s) salvo(s) com sucesso!`);
        document.getElementById('wrapTabelaParametros').style.display = 'none';
        document.getElementById('acoesParametros').style.display = 'none';
      } else {
        mostrarAlerta(alertParametros, 'error', 'Erro ao salvar registros.');
      }
    }
  });

  // ===== ABA UNIDADES =====
  document.getElementById('btnAdicionarUnidade').addEventListener('click', async function() {
    const novaUnidade = document.getElementById('unidadeNova').value.trim();
    const alertUnidades = document.getElementById('alertUnidades');

    if (!novaUnidade) {
      mostrarAlerta(alertUnidades, 'error', 'Informe o nome da unidade.');
      return;
    }

    if (unidadesCadastradas.includes(novaUnidade)) {
      mostrarAlerta(alertUnidades, 'error', 'Esta unidade já está cadastrada.');
      return;
    }

    unidadesCadastradas.push(novaUnidade);
    const salvo = await salvarUnidadesCadastradas(unidadesCadastradas);
    
    if (salvo) {
      document.getElementById('unidadeNova').value = '';
      await inicializarDados();
      mostrarAlerta(alertUnidades, 'success', 'Unidade cadastrada com sucesso!');
    } else {
      mostrarAlerta(alertUnidades, 'error', 'Erro ao salvar unidade.');
      const index = unidadesCadastradas.indexOf(novaUnidade);
      if (index > -1) unidadesCadastradas.splice(index, 1);
    }
  });

  // ===== ABA HISTÓRICO - Calcular Sugestão e Salvar Turma =====
  document.getElementById('btnCalcularSugestao').addEventListener('click', async function() {
    const alunos = parseInt(document.getElementById('turmaAlunos').value) || 0;
    const alertHistorico = document.getElementById('alertHistorico');

    if (alunos <= 0) {
      mostrarAlerta(alertHistorico, 'error', 'Informe uma quantidade válida de alunos.');
      return;
    }

    const resultado = await calcularSugestao(alunos);
    
    if (resultado) {
      if (resultado.erro) {
        mostrarAlerta(alertHistorico, 'error', resultado.erro);
      } else {
        document.getElementById('resultadoSugestao').style.display = 'block';
        document.getElementById('textoSugestaoHistorico').innerHTML = `
          <p><strong>Alunos:</strong> ${resultado.alunos}</p>
          <p><strong>Proporção média por aluno:</strong> ${resultado.proporcao_media}</p>
          <p><strong>Quantidade sugerida:</strong> ${resultado.quantidade_sugerida} unidades</p>
          <p><small>Baseado no histórico de ${historicoTurmas.length} turmas</small></p>
        `;
        mostrarAlerta(alertHistorico, 'success', 'Sugestão calculada com sucesso!');
      }
    } else {
      mostrarAlerta(alertHistorico, 'error', 'Erro ao calcular sugestão.');
    }
  });

  document.getElementById('btnSalvarTurma').addEventListener('click', async function() {
    const turma = document.getElementById('turmaNome').value.trim() || "Nova Turma";
    const alunos = parseInt(document.getElementById('turmaAlunos').value) || 0;
    const enviados = parseInt(document.getElementById('turmaEnviados').value) || 0;
    const usados = parseInt(document.getElementById('turmaUsados').value) || 0;
    const faltou = parseInt(document.getElementById('turmaFaltou').value) || 0;
    const alertHistorico = document.getElementById('alertHistorico');

    if (alunos <= 0) {
      mostrarAlerta(alertHistorico, 'error', 'Alunos deve ser maior que zero');
      return;
    }

    const turmaData = {
      turma: turma,
      alunos: alunos,
      enviados: enviados,
      usados: usados,
      faltou: faltou
    };

    const resultado = await salvarTurma(turmaData);
    
    if (resultado) {
      if (resultado.erro) {
        mostrarAlerta(alertHistorico, 'error', resultado.erro);
      } else {
        mostrarAlerta(alertHistorico, 'success', resultado.mensagem || 'Turma salva com sucesso!');
        historicoTurmas = await carregarHistorico();
        atualizarTabelaHistoricoComSelecao();
        atualizarStats();
        document.getElementById('turmaNome').value = '';
        document.getElementById('turmaAlunos').value = '10';
        document.getElementById('turmaEnviados').value = '15';
        document.getElementById('turmaUsados').value = '10';
        document.getElementById('turmaFaltou').value = '0';
      }
    } else {
      mostrarAlerta(alertHistorico, 'error', 'Erro ao salvar turma.');
    }
  });
});