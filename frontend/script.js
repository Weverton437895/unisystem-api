const API_BASE = "http://localhost:8000/api/v1";

let todosAlunos = [];
let alunoParaDeletar = null;
let viewAtual = "dashboard";

document.addEventListener("DOMContentLoaded", () => {
  verificarAPI();
  navegarPara("dashboard");
});

async function verificarAPI() {
  const dot = document.querySelector(".status-dot");
  const text = document.querySelector(".status-text");
  try {
    const res = await fetch(`${API_BASE.replace("/api/v1", "")}/health`);
    if (res.ok) {
      dot.classList.add("online");
      text.textContent = "API Online";
    } else throw new Error();
  } catch {
    dot.classList.add("offline");
    text.textContent = "API Offline";
  }
}

const titulos = {
  dashboard: { title: "Dashboard", sub: "Visão geral do sistema" },
  alunos:    { title: "Alunos",    sub: "Gestão de discentes" },
  cadastro:  { title: "Novo Aluno", sub: "Cadastro de discente" },
};

function navegarPara(view) {
  viewAtual = view;
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.add("active");
  const nav = document.querySelector(`[data-view="${view}"]`);
  if (nav) nav.classList.add("active");
  const info = titulos[view] || { title: view, sub: "" };
  document.getElementById("pageTitle").textContent = info.title;
  document.getElementById("pageSubtitle").textContent = info.sub;
  document.getElementById("searchBox").style.display = view === "alunos" ? "flex" : "none";
  if (view === "dashboard") carregarDashboard();
  if (view === "alunos") carregarAlunos();
  if (view === "cadastro") prepararFormCadastro();
}

async function carregarDashboard() {
  try {
    const [statsRes, alunosRes] = await Promise.all([
      fetch(`${API_BASE}/alunos/estatisticas`),
      fetch(`${API_BASE}/alunos/`),
    ]);
    const stats = await statsRes.json();
    const lista = await alunosRes.json();
    const alunos = lista.alunos || [];
    animarNumero("statTotal", stats.total_alunos || 0);
    animarNumero("statAtivos", stats.por_status?.ativo || 0);
    animarNumero("statTrancados", stats.por_status?.trancado || 0);
    animarNumero("statFormados", stats.por_status?.formado || 0);
    document.getElementById("headerCount").textContent = stats.total_alunos || 0;
    renderizarBarras(stats.por_curso || {});
    const recentes = [...alunos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    renderizarRecentes(recentes);
  } catch (err) {
    mostrarToast("Não foi possível conectar à API", "error");
  }
}

function animarNumero(id, destino) {
  const el = document.getElementById(id);
  if (!el) return;
  let inicio = 0;
  const dur = 600;
  const step = Math.ceil(dur / 60);
  const inc = destino / (dur / step);
  const timer = setInterval(() => {
    inicio = Math.min(inicio + inc, destino);
    el.textContent = Math.floor(inicio);
    if (inicio >= destino) clearInterval(timer);
  }, step);
}

function renderizarBarras(porCurso) {
  const container = document.getElementById("chartCursos");
  const max = Math.max(...Object.values(porCurso), 1);
  container.innerHTML = Object.entries(porCurso)
    .sort(([, a], [, b]) => b - a)
    .map(([curso, count]) => `
      <div class="chart-bar-item">
        <span class="chart-bar-label" title="${curso}">${curso}</span>
        <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${(count/max)*100}%"></div></div>
        <span class="chart-bar-count">${count}</span>
      </div>
    `).join("") || '<p style="color:var(--slate-400);font-size:13px;">Nenhum dado disponível</p>';
}

function renderizarRecentes(alunos) {
  const container = document.getElementById("recentList");
  container.innerHTML = alunos.length ? alunos.map(a => `
    <div class="recent-item" onclick="abrirModal('${a.id}')">
      <div class="recent-avatar">${iniciais(a.nome)}</div>
      <div class="recent-info">
        <div class="recent-name">${a.nome}</div>
        <div class="recent-course">${a.curso} · ${a.periodo}º per.</div>
      </div>
      <span class="status-badge status-${a.status}">${a.status}</span>
    </div>
  `).join("") : '<p style="color:var(--slate-400);font-size:13px;">Nenhum aluno cadastrado</p>';
}

async function carregarAlunos() {
  const tbody = document.getElementById("alunosTableBody");
  tbody.innerHTML = `<tr class="loading-row"><td colspan="6">Carregando alunos...</td></tr>`;
  try {
    const res = await fetch(`${API_BASE}/alunos/`);
    const data = await res.json();
    todosAlunos = data.alunos || [];
    document.getElementById("headerCount").textContent = todosAlunos.length;
    popularFiltrosCurso(todosAlunos);
    renderizarTabela(todosAlunos);
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6"><div class="empty-state"><span class="empty-icon">⚠</span><p>Erro ao carregar alunos.</p></div></td></tr>`;
    mostrarToast("Erro ao carregar alunos", "error");
  }
}

function popularFiltrosCurso(alunos) {
  const cursos = [...new Set(alunos.map(a => a.curso))].sort();
  const select = document.getElementById("filterCurso");
  const atual = select.value;
  select.innerHTML = '<option value="">Todos</option>' +
    cursos.map(c => `<option value="${c}" ${c === atual ? 'selected' : ''}>${c}</option>`).join("");
}

function renderizarTabela(alunos) {
  const tbody = document.getElementById("alunosTableBody");
  if (!alunos.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6"><div class="empty-state"><span class="empty-icon">◈</span><p>Nenhum aluno encontrado</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = alunos.map(a => `
    <tr>
      <td>
        <div class="aluno-cell">
          <div class="aluno-avatar">${iniciais(a.nome)}</div>
          <div>
            <span class="aluno-name">${a.nome}</span>
            <span class="aluno-email">${a.email}</span>
          </div>
        </div>
      </td>
      <td><span class="matricula-tag">${a.matricula}</span></td>
      <td>${a.curso}</td>
      <td>${a.periodo}º</td>
      <td><span class="status-badge status-${a.status}">${a.status}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon-sm" title="Ver detalhes" onclick="abrirModal('${a.id}')">◉</button>
          <button class="btn-icon-sm edit" title="Editar" onclick="editarAluno('${a.id}')">✎</button>
          <button class="btn-icon-sm delete" title="Remover" onclick="confirmarDelete('${a.id}', '${escapar(a.nome)}')">✕</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function filtrarAlunos() {
  const busca = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const status = document.getElementById("filterStatus")?.value || "";
  const curso = document.getElementById("filterCurso")?.value || "";
  const filtrados = todosAlunos.filter(a => {
    const matchBusca = !busca || a.nome.toLowerCase().includes(busca) || a.matricula.toLowerCase().includes(busca) || a.email.toLowerCase().includes(busca);
    return matchBusca && (!status || a.status === status) && (!curso || a.curso === curso);
  });
  renderizarTabela(filtrados);
}

function limparFiltros() {
  document.getElementById("filterStatus").value = "";
  document.getElementById("filterCurso").value = "";
  document.getElementById("searchInput").value = "";
  renderizarTabela(todosAlunos);
}

function resetarBotao(isEdicao) {
  const btn = document.getElementById("submitBtn");
  btn.disabled = false;
  btn.innerHTML = isEdicao
    ? '<span class="btn-icon">✔</span><span id="submitText">Salvar Alterações</span>'
    : '<span class="btn-icon">⊕</span><span id="submitText">Cadastrar Aluno</span>';
}

function prepararFormCadastro() {
  document.getElementById("alunoForm").reset();
  document.getElementById("alunoId").value = "";
  document.getElementById("formTitle").textContent = "Cadastrar Novo Aluno";
  document.getElementById("formDesc").textContent = "Preencha os dados do aluno abaixo";
  document.getElementById("formHeaderIcon").textContent = "⊕";
  document.getElementById("matricula").disabled = false;
  document.getElementById("cpf").disabled = false;
  document.getElementById("pageTitle").textContent = "Novo Aluno";
  resetarBotao(false);
}

async function editarAluno(id) {
  const aluno = todosAlunos.find(a => a.id === id) || await buscarAlunoAPI(id);
  if (!aluno) return;

  viewAtual = "cadastro";
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("view-cadastro").classList.add("active");
  document.querySelector("[data-view='cadastro']").classList.add("active");
  document.getElementById("pageTitle").textContent = "Editar Aluno";
  document.getElementById("pageSubtitle").textContent = "Edição de discente";
  document.getElementById("searchBox").style.display = "none";

  document.getElementById("alunoId").value = aluno.id;
  document.getElementById("nome").value = aluno.nome;
  document.getElementById("email").value = aluno.email;
  document.getElementById("cpf").value = aluno.cpf;
  document.getElementById("cpf").disabled = true;
  document.getElementById("telefone").value = aluno.telefone || "";
  document.getElementById("dataNascimento").value = aluno.data_nascimento || "";
  document.getElementById("matricula").value = aluno.matricula;
  document.getElementById("matricula").disabled = true;
  document.getElementById("curso").value = aluno.curso;
  document.getElementById("periodo").value = aluno.periodo;
  document.getElementById("status").value = aluno.status;

  document.getElementById("formTitle").textContent = "Editar Aluno";
  document.getElementById("formDesc").textContent = `Editando: ${aluno.nome}`;
  document.getElementById("formHeaderIcon").textContent = "✎";
  resetarBotao(true);
}

async function salvarAluno(event) {
  event.preventDefault();
  const id = document.getElementById("alunoId").value;
  const isEdicao = !!id;
  const btn = document.getElementById("submitBtn");

  btn.disabled = true;
  btn.innerHTML = '<span>⟳</span><span>Salvando...</span>';

  const payload = {
    nome: document.getElementById("nome").value.trim(),
    email: document.getElementById("email").value.trim(),
    curso: document.getElementById("curso").value,
    periodo: parseInt(document.getElementById("periodo").value),
    status: document.getElementById("status").value,
    telefone: document.getElementById("telefone").value || null,
    data_nascimento: document.getElementById("dataNascimento").value || null,
  };

  if (!isEdicao) {
    payload.cpf = document.getElementById("cpf").value;
    payload.matricula = document.getElementById("matricula").value.trim().toUpperCase();
  }

  try {
    const url = isEdicao ? `${API_BASE}/alunos/${id}` : `${API_BASE}/alunos/`;
    const method = isEdicao ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erro ao salvar");
    mostrarToast(isEdicao ? `Aluno "${data.nome}" atualizado!` : `Aluno "${data.nome}" cadastrado!`, "success");
    setTimeout(() => navegarPara("alunos"), 800);
  } catch (err) {
    mostrarToast(err.message, "error");
    resetarBotao(isEdicao);
  }
}

function confirmarDelete(id, nome) {
  alunoParaDeletar = id;
  document.getElementById("confirmText").textContent = `Tem certeza que deseja remover "${nome}"? Esta ação não pode ser desfeita.`;
  document.getElementById("confirmOverlay").classList.add("open");
  document.getElementById("confirmBtn").onclick = () => deletarAluno(id);
}

function fecharConfirm() {
  document.getElementById("confirmOverlay").classList.remove("open");
  alunoParaDeletar = null;
}

async function deletarAluno(id) {
  try {
    const res = await fetch(`${API_BASE}/alunos/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao deletar");
    mostrarToast("Aluno removido com sucesso", "success");
    fecharConfirm();
    await carregarAlunos();
  } catch (err) {
    mostrarToast(err.message, "error");
  }
}

async function abrirModal(id) {
  const aluno = todosAlunos.find(a => a.id === id) || await buscarAlunoAPI(id);
  if (!aluno) return;
  const content = document.getElementById("modalContent");
  content.innerHTML = `
    <div class="modal-aluno-header">
      <div class="modal-avatar">${iniciais(aluno.nome)}</div>
      <div>
        <div class="modal-aluno-name">${aluno.nome}</div>
        <div class="modal-aluno-sub">${aluno.curso} · ${aluno.periodo}º período</div>
        <span class="status-badge status-${aluno.status}" style="margin-top:6px;display:inline-flex;">${aluno.status}</span>
      </div>
    </div>
    <div class="modal-details-grid">
      <div class="modal-detail"><span class="modal-detail-label">Matrícula</span><span class="modal-detail-value" style="font-family:var(--font-mono);color:var(--gold-400)">${aluno.matricula}</span></div>
      <div class="modal-detail"><span class="modal-detail-label">CPF</span><span class="modal-detail-value">${aluno.cpf}</span></div>
      <div class="modal-detail"><span class="modal-detail-label">E-mail</span><span class="modal-detail-value">${aluno.email}</span></div>
      <div class="modal-detail"><span class="modal-detail-label">Telefone</span><span class="modal-detail-value">${aluno.telefone || '—'}</span></div>
      <div class="modal-detail"><span class="modal-detail-label">Data de Nascimento</span><span class="modal-detail-value">${formatarData(aluno.data_nascimento)}</span></div>
      <div class="modal-detail"><span class="modal-detail-label">Cadastrado em</span><span class="modal-detail-value">${formatarDataHora(aluno.created_at)}</span></div>
      <div class="modal-detail"><span class="modal-detail-label">Última atualização</span><span class="modal-detail-value">${formatarDataHora(aluno.updated_at)}</span></div>
      <div class="modal-detail"><span class="modal-detail-label">ID</span><span class="modal-detail-value" style="font-family:var(--font-mono);font-size:11px;color:var(--slate-400)">${aluno.id}</span></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end;">
      <button class="btn btn-ghost" onclick="fecharModal();editarAluno('${aluno.id}')">✎ Editar</button>
      <button class="btn btn-danger" onclick="fecharModal();confirmarDelete('${aluno.id}','${escapar(aluno.nome)}')">✕ Remover</button>
    </div>
  `;
  document.getElementById("modalOverlay").classList.add("open");
}

function fecharModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}

async function buscarAlunoAPI(id) {
  try {
    const res = await fetch(`${API_BASE}/alunos/${id}`);
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

function iniciais(nome) {
  if (!nome) return "?";
  const partes = nome.trim().split(" ");
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  return partes[0][0].toUpperCase();
}

function escapar(str) {
  return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function formatarData(data) {
  if (!data) return "—";
  try {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  } catch { return data; }
}

function formatarDataHora(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function mascararCPF(input) {
  let v = input.value.replace(/\D/g, "").slice(0, 11);
  if (v.length >= 10) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
  else if (v.length >= 7) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
  else if (v.length >= 4) v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
  input.value = v;
}

function mascararTelefone(input) {
  let v = input.value.replace(/\D/g, "").slice(0, 11);
  if (v.length === 11) v = v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  else if (v.length >= 7) v = v.replace(/(\d{2})(\d{4,5})(\d{0,4})/, "($1) $2-$3");
  else if (v.length >= 3) v = v.replace(/(\d{2})(\d+)/, "($1) $2");
  input.value = v;
}

function mostrarToast(msg, tipo = "success") {
  const icons = { success: "✓", error: "✕", warning: "⚠" };
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `<span class="toast-icon">${icons[tipo] || "●"}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 3500);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { fecharModal(); fecharConfirm(); }
});