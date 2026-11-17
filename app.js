/* Gaybe: all records come from Supabase; no demo financial values. */
const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const uiPaths = {
  inicio:
    '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-5v-6h-4v6H5a2 2 0 0 1-2-2z"/>',
  movimentacoes: '<path d="M3 8h17m-4-4 4 4-4 4M21 16H4m4-4-4 4 4 4"/>',
  contas:
    '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-5 5h3"/>',
  metas:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  gaybe: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8m-8 3h6"/>',
  ajustes:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
  dinheiro:
    '<circle cx="12" cy="12" r="9"/><path d="M9 9.5c0-2 6-2 6 0s-6 1-6 4 6 2 6 0M12 6v12"/>',
  entrada: '<path d="M12 4v16M6 14l6 6 6-6"/>',
  saida: '<path d="M12 20V4M6 10l6-6 6 6"/>',
  pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-7 8-7s8 2 8 7"/>',
};
function uiIcon(name) {
  return (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (uiPaths[name] || uiPaths.gaybe) +
    "</svg>"
  );
}
const nav = [
  ["inicio", "⌂", "Início"],
  ["movimentacoes", "⇄", "Movimentos"],
  ["contas", "▣", "Contas"],
  ["metas", "♡", "Metas"],
  ["gaybe", "✿", "Gaybe"],
  ["ajustes", "☼", "Ajustes"],
];
const titles = {
  inicio: ["Visão geral", "Tudo o que importa, em um só lugar."],
  movimentacoes: ["Movimentações", "Acompanhe cada passo da sua jornada."],
  contas: ["Minhas contas", "Seu dinheiro organizado em um só lugar."],
  metas: ["Minhas metas", "Sonhos ficam mais próximos, um passo de cada vez."],
  gaybe: ["Conversar com Gaybe", "Um espaço para cuidar das suas finanças."],
  ajustes: ["Ajustes", "Seu espaço, do seu jeito."],
};
let cfg = {
  url: "https://eqctktojjslyksniiitz.supabase.co",
  key: "sb_publishable_pmSOeqdhnYswirS_NyXW0Q_qq0dSHqS",
};
try {
  cfg = JSON.parse(localStorage.getItem("gaybe_config") || "null") || cfg;
} catch {}
let client,
  user = null,
  data = {
    accounts: [],
    transactions: [],
    goals: [],
    goal_contributions: [],
    goal_members: [],
  },
  hidden = false,
  page = "inicio";
const money = (n) =>
  hidden
    ? "••••••"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(n || 0) / 100);
const today = () => new Date().toLocaleDateString("en-CA");
function initClient() {
  client = undefined;
  if (cfg.url && cfg.key && window.supabase) {
    try {
      client = window.supabase.createClient(cfg.url, cfg.key);
    } catch (e) {
      toast(
        "Não foi possível iniciar a conexão. Confira a URL e a chave pública.",
      );
    }
  }
}
function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 4200);
}
function link(n) {
  return `<a class="nav-link ${page === n[0] ? "active" : ""}" href="#${n[0]}"><i>${uiIcon(n[0])}</i><span>${n[2]}</span></a>`;
}
function showNotice() {
  const n = $("#notice");
  if (!client) {
    n.hidden = false;
    n.innerHTML =
      'O Gaybe ainda não está conectado a um banco de dados. <a href="#ajustes">Configure o Supabase</a> para entrar e salvar seus dados.';
  } else if (!user) {
    n.hidden = false;
    n.innerHTML =
      "✦ Entre com sua conta Google para acessar e salvar seus dados privados.";
  } else n.hidden = true;
}
function empty(icon, title, desc) {
  return `<div class="empty"><div class="empty-icon">${uiIcon(icon === "♡" ? "metas" : icon === "▣" ? "contas" : "movimentacoes")}</div><strong>${title}</strong><p>${desc}</p></div>`;
}
function section(title, desc, action = "") {
  return `<div class="section-heading"><div><h2>${title}</h2><p>${desc}</p></div>${action}</div>`;
}
function row(t) {
  const a = data.accounts.find((x) => x.id === t.account_id);
  return `<div class="row"><div class="row-icon">${uiIcon(t.type === "income" ? "entrada" : "saida")}</div><div class="row-main"><strong>${esc(t.description)}</strong><small>${esc(t.category || "Sem categoria")} · ${esc(a?.name || "Conta")} · ${esc(t.date.split("-").reverse().join("/"))}</small></div><span class="row-value ${t.type === "income" ? "income" : ""}">${t.type === "income" ? "+" : "−"} ${money(t.amount_cents)}</span>${user ? `<button class="row-action" data-delete="transaction" data-id="${t.id}" aria-label="Excluir lançamento">×</button>` : ""}</div>`;
}
const defaultGoalCover =
  "linear-gradient(135deg,#c9a4ed 0%,#f4c9dd 52%,#f8dfbd 100%)";
function goalMembers(g) {
  return data.goal_members.filter((m) => m.goal_id === g.id);
}
function goal(g, compact = false) {
  const p = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (Number(g.saved_cents || 0) /
            Math.max(1, Number(g.target_cents || 1))) *
            100,
        ),
      ),
    ),
    members = goalMembers(g),
    cover = g.cover_url
      ? `background-image:linear-gradient(180deg,transparent 38%,#2c123caa),url('${esc(g.cover_url)}')`
      : `background:${defaultGoalCover}`,
    deadline = g.deadline
      ? new Date(g.deadline + "T12:00:00").toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Sem prazo";
  return `<article class="dream-card ${compact ? "compact" : ""}" data-goal-view="${g.id}" tabindex="0"><div class="dream-cover" style="${cover}"><span class="dream-tag">${uiIcon("metas")} Jornada do sonho</span><button class="dream-edit" data-edit-goal="${g.id}" aria-label="Editar meta">${uiIcon("ajustes")}</button><div class="dream-title"><h3>${esc(g.name)}</h3><p>${esc(g.description || "Um sonho para construir passo a passo.")}</p></div></div><div class="dream-body"><div class="dream-values"><strong>${money(g.saved_cents)}</strong><span>de ${money(g.target_cents)}</span><b>${p}%</b></div><div class="dream-progress"><span style="width:${p}%"></span></div>${
    compact
      ? ""
      : `<div class="dream-milestones">${[25, 50, 75, 100].map((n) => `<span class="${p >= n ? "done" : ""}"><i></i>${n}%</span>`).join("")}</div><div class="dream-meta"><span>Prazo: <strong>${esc(deadline)}</strong></span><div class="dream-people">${
          members
            .slice(0, 3)
            .map(
              (m, i) =>
                `<i title="${esc(m.display_name || "Participante")}" style="--i:${i}">${esc((m.display_name || "P").slice(0, 1).toUpperCase())}</i>`,
            )
            .join("") || "<small>Só você por enquanto</small>"
        }</div></div><div class="dream-actions"><button class="primary" data-contribute="${g.id}">Adicionar valor</button><button class="secondary" data-invite-goal="${g.id}">${uiIcon("pessoa")} Convidar</button></div>`
  }</div></article>`;
}
function accountBalance(a) {
  return (
    Number(a.opening_balance_cents) +
    data.transactions
      .filter((t) => t.account_id === a.id && t.date <= today())
      .reduce(
        (sum, t) =>
          sum + (t.type === "income" ? 1 : -1) * Number(t.amount_cents),
        0,
      )
  );
}
function totals() {
  const month = today().slice(0, 7),
    current = data.transactions.filter((x) => x.date.startsWith(month));
  return {
    bank: data.accounts
      .filter((a) => a.kind === "account")
      .reduce((sum, a) => sum + accountBalance(a), 0),
    cash: data.accounts
      .filter((a) => a.kind === "cash")
      .reduce((sum, a) => sum + accountBalance(a), 0),
    income: current
      .filter((x) => x.type === "income")
      .reduce((sum, t) => sum + Number(t.amount_cents), 0),
    expense: current
      .filter((x) => x.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount_cents), 0),
    goals: data.goals.reduce((sum, g) => sum + Number(g.saved_cents), 0),
  };
}
function updateProfileAvatar() {
  const el = $("#profile-avatar");
  el.innerHTML = uiIcon("pessoa");
  const raw = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  if (typeof raw !== "string") return;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      !["googleusercontent.com", "ggpht.com"].some(
        (host) => url.hostname === host || url.hostname.endsWith("." + host),
      )
    )
      return;
    const img = document.createElement("img");
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.onerror = () => {
      el.textContent = "✿";
    };
    img.src = url.href;
    el.replaceChildren(img);
  } catch {}
}
function render() {
  if (!user) {
    document.querySelector(".app").hidden = true;
    $("#welcome").hidden = false;
    return;
  }
  $("#welcome").hidden = true;
  document.querySelector(".app").hidden = false;
  page = location.hash.slice(1) || "inicio";
  if (!titles[page]) page = "inicio";
  $("#desktop-nav").innerHTML = nav.map(link).join("");
  $("#mobile-nav").innerHTML = nav.map(link).join("");
  $("#page-title").textContent = titles[page][0];
  $("#page-subtitle").textContent = titles[page][1];
  $("#user-label").textContent =
    user?.user_metadata?.full_name?.split(" ")[0] || "Minha conta";
  updateProfileAvatar();
  showNotice();
  let html = "";
  const t = totals();
  if (page === "inicio") {
    html = `<div class="dashboard-actions"><button class="primary dashboard-add" data-new="cashcount">＋ Lançamento em espécie</button></div>${section("Seu resumo", "Um olhar carinhoso para as suas finanças.", '<a class="subtle" href="#contas">Ver contas →</a>')}<div class="stats"><div class="stat"><div class="stat-icon">${uiIcon("contas")}</div><div class="stat-label">Saldo em bancos</div><div class="stat-value">${money(t.bank)}</div><div class="stat-note">Contas bancárias cadastradas</div></div><div class="stat"><div class="stat-icon">${uiIcon("dinheiro")}</div><div class="stat-label">Dinheiro em espécie</div><div class="stat-value">${money(t.cash)}</div><div class="stat-note">Dinheiro físico registrado</div></div><div class="stat"><div class="stat-icon">${uiIcon("entrada")}</div><div class="stat-label">Entradas do mês</div><div class="stat-value">${money(t.income)}</div><div class="stat-note">Valores registrados</div></div><div class="stat"><div class="stat-icon">${uiIcon("saida")}</div><div class="stat-label">Saídas do mês</div><div class="stat-value">${money(t.expense)}</div><div class="stat-note">Valores registrados</div></div><div class="stat"><div class="stat-icon">${uiIcon("metas")}</div><div class="stat-label">Guardado nas metas</div><div class="stat-value">${money(t.goals)}</div><div class="stat-note">Acompanhamento das metas</div></div></div>${section("Seu espaço", "Tudo organizado para você acompanhar.")}<div class="grid"><div class="card"><div class="card-head"><h3>Últimas movimentações</h3><a class="subtle" href="#movimentacoes">Ver todas →</a></div>${data.transactions.length ? data.transactions.slice(0, 4).map(row).join("") : empty("⇄", "Ainda está tudo quietinho", "Seus lançamentos vão aparecer aqui.")}</div><div class="card dream-preview"><div class="card-head"><h3>Sonhos e metas</h3><a class="subtle" href="#metas">Ver metas →</a></div>${
      data.goals.length
        ? data.goals
            .slice(0, 1)
            .map((g) => goal(g, true))
            .join("")
        : empty(
            "♡",
            "Todo sonho começa aqui",
            "Crie uma meta para acompanhar seu progresso.",
          )
    }</div></div><div class="bottom-banner"><div><strong>Seu futuro começa com pequenos passos.</strong><p>Estou aqui para ajudar você a cuidar do que importa.</p></div><button class="secondary" onclick="location.hash='gaybe'">Conheça a Gaybe →</button></div>`;
  }
  if (page === "movimentacoes") html = movementsView();
  if (page === "contas")
    html = `${section("Contas e dinheiro", "Os saldos incluem o valor inicial e os lançamentos vinculados.", '<button class="primary" data-new="account">＋ Nova conta</button>')}<div class="card">${
      data.accounts.length
        ? data.accounts
            .map((a) => {
              let bal = accountBalance(a);
              return `<div class="row"><div class="row-icon">${uiIcon("contas")}</div><div class="row-main"><strong>${esc(a.name)}</strong><small>${esc(a.kind === "cash" ? "Dinheiro em espécie" : "Conta")}</small></div><span class="row-value">${money(bal)}</span><button class="row-action" data-delete="account" data-id="${a.id}" aria-label="Excluir conta">×</button></div>`;
            })
            .join("")
        : empty(
            "▣",
            "Nenhuma conta cadastrada",
            "Adicione uma conta ou seu dinheiro em espécie.",
          )
    }</div>`;
  if (page === "metas")
    html = `${data.goals.length ? '<div class="dream-page-head"><div class="section-heading"><div></div><button class="primary" data-new="goal">＋ Criar novo sonho</button></div></div>' : ''}<div class="dream-grid">${data.goals.length ? data.goals.map((g) => goal(g)).join("") : `<div class="dream-empty"><div class="dream-empty-art">${uiIcon("metas")}</div><h3>Qual sonho você quer realizar?</h3><p>Crie um card, escolha uma capa e acompanhe cada etapa da jornada.</p><button class="primary" data-new="goal">Criar meu primeiro sonho</button></div>`}</div><p class="hint dream-note">Os valores das metas são um acompanhamento informado por vocês e não movimentam dinheiro das contas automaticamente.</p>`;
  if (page === "gaybe")
    html = `<div class="card settings-card"><div class="row-icon" style="width:55px;height:55px;margin-bottom:17px">${uiIcon("gaybe")}</div><h3>Oi, eu sou a Gaybe!</h3><p class="hint">Este será o nosso espaço de conversa. A assistente com inteligência artificial ainda não está conectada. Quando estiver pronta, ela pedirá sua confirmação antes de salvar qualquer lançamento.</p><p class="hint">Nenhum dado financeiro é enviado para um serviço de IA nesta versão.</p></div>`;
  if (page === "ajustes")
    html = `<div class="card settings-card"><h3>Sua conta</h3><p class="hint">${user ? "Conectada como " + esc(user.email || "usuário") : "Entre para acessar seus dados."}</p><div class="toolbar">${user ? '<button class="secondary" id="export">Exportar meus dados</button><button class="secondary" id="signout">Sair da conta</button>' : '<button class="primary" id="signin">Entrar com Google</button>'}</div><p class="hint" style="margin-top:15px">Exclusão definitiva de conta ainda não está disponível nesta interface. Não use com dados reais até configurar e testar segurança, backup e exclusão.</p></div>`;
  $("#content").innerHTML = html;
  bind();
}

let movementsMonth = "", movementsCategory = "";
function movementsView() {
  const month = movementsMonth || today().slice(0,7);
  const current = data.transactions.filter(t => typeof t.date === "string" && t.date.startsWith(month));
  const income = current.filter(t => t.type === "income").reduce((n,t)=>n+Number(t.amount_cents||0),0);
  const expense = current.filter(t => t.type === "expense").reduce((n,t)=>n+Number(t.amount_cents||0),0);
  const sums = new Map();
  current.filter(t => t.type === "expense").forEach(t => {const name=(t.category||"Sem categoria").trim()||"Sem categoria";sums.set(name,(sums.get(name)||0)+Number(t.amount_cents||0));});
  const cats=[...sums].sort((a,b)=>b[1]-a[1]);
  const colors=["#ad87e6","#f49dbd","#f4c872","#88cfb7","#8fb9e4","#c8a4cf"];
  let offset=0;
  const stops=cats.map(([name,value],i)=>{const from=offset;offset+=expense?value/expense*100:0;return colors[i%colors.length]+" "+from+"% "+offset+"%"}).join(",");
  const visible=movementsCategory?current.filter(t=>(t.category||"Sem categoria").trim()===movementsCategory):current;
  const ordered=[...visible].sort((a,b)=>b.date.localeCompare(a.date));
  const chart=expense>0&&!hidden?'<div class="mov-donut" role="img" aria-label="Distribuição dos gastos por categoria" style="background:conic-gradient('+stops+')"><div><strong>'+money(expense)+'</strong><small>Total de saídas</small></div></div>':'<div class="mov-donut empty-chart"><div><strong>'+money(0)+'</strong><small>'+(hidden?'Valores ocultos':'Nenhuma saída')+'</small></div></div>';
  const legend=cats.length?cats.map(([name,value],i)=>'<button type="button" class="mov-legend-item" data-mov-category="'+esc(name)+'" aria-pressed="'+(movementsCategory===name)+'"><i style="background:'+colors[i%colors.length]+'"></i><span>'+esc(name)+'</span><b>'+(hidden?'•••':Math.round(value/expense*100)+'%')+'</b></button>').join(""):'<p class="hint">Quando você registrar saídas, elas aparecerão aqui por categoria.</p>';
  return '<div class="mov-page"><div class="mov-heading"><div><h2>Seus movimentos</h2><p>Veja suas entradas e saídas e entenda seus gastos.</p></div><button class="primary" data-new="transaction">＋ Adicionar movimento</button></div><div class="mov-month"><label for="mov-month">Mês</label><input type="month" id="mov-month" value="'+esc(month)+'"></div><div class="mov-summary"><div><span>'+uiIcon("entrada")+' Entradas</span><strong>'+money(income)+'</strong></div><div><span>'+uiIcon("saida")+' Saídas</span><strong>'+money(expense)+'</strong></div></div><section class="mov-chart-card"><div class="mov-chart-title"><h3>Gastos por categoria</h3><p>Suas saídas neste mês</p></div><div class="mov-chart-content">'+chart+'<div class="mov-legend">'+legend+'</div></div></section>'+(cats.length?'<div class="mov-category-cards">'+cats.slice(0,3).map(([name,value],i)=>'<button type="button" data-mov-category="'+esc(name)+'" aria-pressed="'+(movementsCategory===name)+'" class="mov-category"><span class="mov-category-icon" style="color:'+colors[i%colors.length]+'">'+uiIcon("contas")+'</span><strong>'+esc(name)+'</strong><b>'+money(value)+'</b></button>').join("")+'</div>':'')+'<div class="mov-list-head"><h3>Movimentos recentes</h3>'+(movementsCategory?'<button class="subtle mov-clear" type="button" id="mov-clear">Limpar filtro</button>':'')+'</div>'+(movementsCategory?'<p class="hint mov-filter-label">Categoria: '+esc(movementsCategory)+'</p>':'')+'<div class="card mov-list">'+(ordered.length?ordered.map(row).join(""):empty("⇄","Nenhum movimento neste mês",movementsCategory?"Nenhum registro nesta categoria.":"Seus lançamentos aparecerão aqui."))+'</div><p class="hint mov-note">Os movimentos exibem apenas valores registrados no Gaybe. A importação bancária automática ainda não está disponível.</p></div>';
}

function bind() {
  if ($("#mov-month")) $("#mov-month").onchange = e => { movementsMonth=e.target.value || today().slice(0,7); movementsCategory=""; render(); };
  document.querySelectorAll("[data-mov-category]").forEach(b => b.onclick=()=>{movementsCategory=movementsCategory===b.dataset.movCategory?"":b.dataset.movCategory;render();});
  if ($("#mov-clear")) $("#mov-clear").onclick=()=>{movementsCategory="";render();};
  document
    .querySelectorAll("[data-new]")
    .forEach((b) => (b.onclick = () => openForm(b.dataset.new)));
  document
    .querySelectorAll("[data-delete]")
    .forEach((b) => (b.onclick = () => remove(b.dataset.delete, b.dataset.id)));
  document.querySelectorAll("[data-contribute]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        openForm("contribution", b.dataset.contribute);
      }),
  );
  document.querySelectorAll("[data-edit-goal]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        openForm("goal", b.dataset.editGoal);
      }),
  );
  document.querySelectorAll("[data-invite-goal]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        openForm("invite", b.dataset.inviteGoal);
      }),
  );
  document.querySelectorAll("[data-goal-view]").forEach((c) => {
    c.onclick = (e) => {
      if (!e.target.closest("button")) openForm("goalview", c.dataset.goalView);
    };
    c.onkeydown = (e) => {
      if (e.key === "Enter") openForm("goalview", c.dataset.goalView);
    };
  });
  if ($("#save-config")) $("#save-config").onclick = saveConfig;
  if ($("#clear-config"))
    $("#clear-config").onclick = () => {
      localStorage.removeItem("gaybe_config");
      cfg = {};
      user = null;
      data = {
        accounts: [],
        transactions: [],
        goals: [],
        goal_contributions: [],
        goal_members: [],
      };
      initClient();
      render();
      toast("Conexão removida deste navegador.");
    };
  if ($("#signin")) $("#signin").onclick = signIn;
  if ($("#signout"))
    $("#signout").onclick = async () => {
      const result = await client.auth.signOut();
      if (result.error) {
        toast("Não foi possível sair. Tente novamente.");
        return;
      }
      user = null;
      data = {
        accounts: [],
        transactions: [],
        goals: [],
        goal_contributions: [],
        goal_members: [],
      };
      render();
    };
  if ($("#export"))
    $("#export").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              { exportado_em: new Date().toISOString(), ...data },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      );
      a.download = "gaybe-meus-dados.json";
      a.click();
      URL.revokeObjectURL(a.href);
    };
}
function saveConfig() {
  let url = $("#url").value.trim().replace(/\/$/, ""),
    key = $("#key").value.trim();
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !u.hostname.endsWith(".supabase.co"))
      throw Error();
    if (!key || key.startsWith("sb_secret_")) throw Error();
    const payload = key.split(".")[1];
    if (payload) {
      try {
        if (
          JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
            .role === "service_role"
        )
          throw Error("service");
      } catch (e) {
        if (e.message === "service") throw e;
      }
    }
  } catch {
    toast("Use uma URL HTTPS do Supabase e uma chave pública válida.");
    return;
  }
  cfg = { url, key };
  localStorage.setItem("gaybe_config", JSON.stringify(cfg));
  $("#welcome-google").onclick = signIn;
  const authError =
    new URLSearchParams(location.search).get("error") ||
    new URLSearchParams(location.hash.slice(1)).get("error");
  if (authError) {
    $("#welcome-error").textContent =
      "Não foi possível entrar com o Google. Tente novamente.";
    history.replaceState(null, "", location.pathname);
  }
  initClient();
  load();
  toast("Conexão salva neste navegador.");
}
async function signIn() {
  const err = $("#welcome-error");
  err.textContent = "";
  if (!client) {
    err.textContent =
      "Não foi possível conectar ao serviço de acesso. Tente novamente mais tarde.";
    return;
  }
  try {
    const invite = new URLSearchParams(location.search).get("invite");
    if (invite) localStorage.setItem("gaybe_pending_invite", invite);
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          location.origin +
          location.pathname +
          (invite ? "?invite=" + encodeURIComponent(invite) : ""),
      },
    });
    if (error) throw error;
  } catch (e) {
    err.textContent =
      "Não foi possível entrar com o Google. Confira sua conexão e tente novamente.";
  }
}
async function load() {
  if (!client) {
    $("#welcome-error").textContent =
      "Não foi possível conectar ao serviço de acesso. Atualize a página e tente novamente.";
    render();
    return;
  }
  const { data: session, error } = await client.auth.getSession();
  if (error) {
    $("#welcome-error").textContent =
      "Não foi possível verificar sua sessão. Tente entrar novamente.";
    $("#welcome-google").disabled = false;
    render();
    return;
  }
  user = session.session?.user || null;
  $("#welcome-google").disabled = false;
  if (user) {
    const token =
      new URLSearchParams(location.search).get("invite") ||
      localStorage.getItem("gaybe_pending_invite");
    if (token) {
      const accepted = await client.rpc("accept_goal_invite", {
        p_token: token,
      });
      if (!accepted.error) {
        localStorage.removeItem("gaybe_pending_invite");
        history.replaceState(null, "", location.pathname + "#metas");
        toast("Convite aceito. O sonho agora também faz parte da sua jornada.");
      } else localStorage.setItem("gaybe_pending_invite", token);
    }
    const results = await Promise.all(
      ["accounts", "transactions", "goals", "goal_contributions"].map((x) =>
        client
          .from(x)
          .select("*")
          .order(x === "transactions" ? "date" : "created_at", {
            ascending: false,
          }),
      ),
    );
    if (results.some((x) => x.error)) {
      data = {
        accounts: [],
        transactions: [],
        goals: [],
        goal_contributions: [],
        goal_members: [],
      };
      toast(
        "Não foi possível carregar os dados. Confira a configuração e as tabelas.",
      );
    } else {
      [data.accounts, data.transactions, data.goals, data.goal_contributions] =
        results.map((x) => x.data);
      const members = await client.from("goal_members").select("*");
      data.goal_members = members.error ? [] : members.data;
    }
  }
  render();
}
function requireUser() {
  if (!client) {
    location.hash = "ajustes";
    toast("Configure o Supabase primeiro.");
    return false;
  }
  if (!user) {
    location.hash = "ajustes";
    toast("Entre com Google para salvar seus dados.");
    return false;
  }
  return true;
}
const input = (label, name, type = "text", extra = "") =>
  `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" required ${extra}></div>`;
function openForm(type, id) {
  if (!requireUser()) return;
  if (type === "transaction" && !data.accounts.some((a) => a.kind === "cash")) {
    toast("Cadastre uma conta de dinheiro em espécie para começar.");
    location.hash = "contas";
    return;
  }
  const f = $("#form");
  f.dataset.kind = type;
  f.dataset.id = id || "";
  $("#form-error").textContent = "";
  let fields = "";
  if (type === "account") {
    $("#modal-title").textContent = "Nova conta";
    fields =
      input("Nome da conta", "name") +
      `<div class="field"><label for="f-kind">Tipo</label><select id="f-kind" name="kind"><option value="account">Conta</option><option value="cash">Dinheiro em espécie</option></select></div>` +
      input(
        "Saldo inicial em reais",
        "amount",
        "number",
        'step="0.01" value="0"',
      );
  }
  if (type === "transaction") {
    $("#modal-title").textContent = "Lançamento em espécie";
    fields =
      `<div class="field"><label for="f-type">Tipo</label><select id="f-type" name="type"><option value="expense">Saída</option><option value="income">Entrada</option></select></div>` +
      input("Descrição", "description") +
      input("Valor em reais", "amount", "number", 'min="0.01" step="0.01"') +
      input("Data", "date", "date", `value="${today()}"`) +
      input("Categoria", "category", "text", 'placeholder="Ex.: Mercado"') +
      `<div class="field"><label for="f-account">Dinheiro em espécie</label><select id="f-account" name="account_id">${data.accounts
        .filter((a) => a.kind === "cash")
        .map((a) => `<option value="${a.id}">${esc(a.name)}</option>`)
        .join("")}</select></div>`;
  }
  if (type === "cashcount") {
    $("#modal-title").textContent = "Meu cofrinho";
    const wallets = data.accounts.filter((a) => a.kind === "cash");
    const vals = [20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 25, 10, 5];
    const fmt = (v) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v / 100);
    fields =
      '<div class="pig-hero"><img src="./cofrinho.png" alt=""></div><div class="pig-balance"><span>Meu saldo em espécie</span><strong id="pig-balance">' +
      money(wallets[0] ? accountBalance(wallets[0]) : 0) +
      "</strong></div>" +
      (wallets.length > 1
        ? '<div class="field"><label for="f-cash-account">Carteira</label><select id="f-cash-account" name="account_id">' +
          wallets
            .map((a) => `<option value="${a.id}">${esc(a.name)}</option>`)
            .join("") +
          "</select></div>"
        : '<input type="hidden" name="account_id" value="' +
          esc(wallets[0]?.id || "") +
          '">') +
      '<select id="f-count-mode" name="mode" hidden tabindex="-1" aria-hidden="true"><option value="add">Recebi</option><option value="spend">Gastei</option></select><div class="pig-modes" role="group" aria-label="Tipo de lançamento"><button type="button" class="pig-mode active" data-cash-mode="add" aria-pressed="true">Recebi</button><button type="button" class="pig-mode" data-cash-mode="spend" aria-pressed="false">Gastei</button></div><p class="pig-caption">Escolha os valores e as quantidades</p><div class="cash-grid">' +
      vals
        .map(
          (v) =>
            `<div class="cash-denomination ${v >= 200 ? "bill" : "coin"}"><span class="money-art" aria-hidden="true"><span>${v >= 200 ? "R$" : "◉"}</span> ${v >= 100 ? v / 100 : v + "¢"}</span><strong>${esc(fmt(v))}</strong><div class="cash-stepper"><button type="button" data-cash-step="-1" aria-label="Remover uma unidade de ${esc(fmt(v))}">−</button><input type="number" name="d_${v}" min="0" max="999999" step="1" value="0" inputmode="numeric" aria-label="Quantidade de ${esc(fmt(v))}"><button type="button" data-cash-step="1" aria-label="Adicionar uma unidade de ${esc(fmt(v))}">+</button></div></div>`,
        )
        .join("") +
      '</div><p class="cash-total">Valor selecionado: <strong id="cash-total">R$ 0,00</strong></p><p class="hint" id="cash-result" aria-live="polite"></p>';
  }
  if (type === "goal") {
    const g = data.goals.find((x) => x.id === id);
    $("#modal-title").textContent = g ? "Editar sonho" : "Criar novo sonho";
    fields =
      `<div class="goal-cover-picker"><div id="goal-cover-preview" class="goal-cover-preview" style="${g?.cover_url ? `background-image:url('${esc(g.cover_url)}')` : `background:${defaultGoalCover}`}"><span>Imagem da capa</span></div><label class="secondary cover-upload" for="f-cover">Escolher uma foto</label><input id="f-cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" hidden><small>JPG, PNG ou WebP de até 5 MB.</small></div>` +
      input(
        "Nome do sonho",
        "name",
        "text",
        `maxlength="70" value="${esc(g?.name || "")}"`,
      ) +
      `<div class="field"><label for="f-description">Uma frase para essa jornada</label><textarea id="f-description" name="description" maxlength="140" placeholder="Ex.: Nossa primeira viagem juntos">${esc(g?.description || "")}</textarea></div>` +
      input(
        "Valor desejado em reais",
        "target",
        "number",
        `min="0.01" step="0.01" value="${g ? Number(g.target_cents) / 100 : ""}"`,
      ) +
      input(
        "Valor já guardado em reais",
        "saved",
        "number",
        `min="0" step="0.01" value="${g ? Number(g.saved_cents) / 100 : 0}"`,
      ) +
      input(
        "Prazo do sonho",
        "deadline",
        "date",
        `value="${esc(g?.deadline || "")}"`,
      );
  }
  if (type === "contribution") {
    $("#modal-title").textContent = "Adicionar à meta";
    fields =
      '<p class="hint" style="margin-bottom:14px">Esse registro acompanha a meta e não retira dinheiro de uma conta.</p>' +
      input("Valor em reais", "amount", "number", 'min="0.01" step="0.01"');
  }
  if (type === "invite") {
    const g = data.goals.find((x) => x.id === id);
    $("#modal-title").textContent = "Convidar para este sonho";
    fields =
      `<div class="invite-intro">${uiIcon("pessoa")}<div><strong>${esc(g?.name || "Meta compartilhada")}</strong><p>Envie um convite para a pessoa participar e acompanhar essa jornada com você.</p></div></div>` +
      input(
        "E-mail do companheiro",
        "email",
        "email",
        'placeholder="nome@exemplo.com"',
      );
  }
  if (type === "goalview") {
    const g = data.goals.find((x) => x.id === id);
    if (!g) return;
    $("#modal-title").textContent = "Detalhes da jornada";
    fields = `<div class="goal-view">${goal(g, false)}<div class="goal-view-toolbar"><button type="button" class="secondary" data-modal-edit="${g.id}">Editar card</button><button type="button" class="secondary danger" data-modal-delete="${g.id}">Excluir</button></div></div>`;
  }
  $("#dialog").classList.toggle("cash-dialog", type === "cashcount");
  $("#dialog").classList.toggle(
    "goal-dialog",
    ["goal", "goalview", "invite", "contribution"].includes(type),
  );
  $("#fields").innerHTML = fields;
  const submit = $("#form button[type=submit]");
  submit.hidden = type === "goalview";
  if (type !== "cashcount" && type !== "goalview")
    submit.textContent =
      type === "invite" ? "Criar convite" : "Salvar com carinho →";
  if (type === "goal") {
    const cover = $("#f-cover");
    cover.onchange = () => {
      const file = cover.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        cover.value = "";
        $("#form-error").textContent = "Escolha uma imagem de até 5 MB.";
        return;
      }
      const url = URL.createObjectURL(file);
      $("#goal-cover-preview").style.background =
        'center/cover url("' + url + '")';
    };
  }
  if (type === "goalview") {
    document.querySelector("[data-modal-edit]").onclick = () =>
      openForm("goal", id);
    document.querySelector("[data-modal-delete]").onclick = () => {
      $("#dialog").close();
      remove("goal", id);
    };
  }
  if (type === "cashcount") {
    const update = () => {
      let total = 0;
      document.querySelectorAll(".cash-denomination input").forEach((el) => {
        total += Number(el.name.slice(2)) * Number(el.value || 0);
      });
      const fmt = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      $("#cash-total").textContent = fmt.format(total / 100);
      const mode = $("#f-count-mode").value;
      const id = $("#form [name=account_id]").value;
      const wallet = data.accounts.find(
        (a) => a.id === id && a.kind === "cash",
      );
      const balance = wallet ? accountBalance(wallet) : 0;
      $("#pig-balance").textContent = money(balance);
      $("#cash-result").textContent =
        mode === "spend"
          ? total > balance
            ? "O valor selecionado é maior que o saldo registrado."
            : `Após esse gasto, ficam ${hidden ? "••••••" : fmt.format((balance - total) / 100)} em espécie.`
          : `Serão adicionados ${fmt.format(total / 100)} ao saldo em espécie.`;
      $("#form button[type=submit]").textContent =
        mode === "spend" ? "Registrar gasto" : "Adicionar dinheiro";
    };
    $("#f-count-mode").addEventListener("change", update);
    document.querySelectorAll("[data-cash-mode]").forEach((button) =>
      button.addEventListener("click", () => {
        $("#f-count-mode").value = button.dataset.cashMode;
        document.querySelectorAll("[data-cash-mode]").forEach((b) => {
          const active = b === button;
          b.classList.toggle("active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        update();
      }),
    );
    const walletSelect = $("#f-cash-account");
    if (walletSelect) walletSelect.addEventListener("change", update);
    update();
    document
      .querySelectorAll(".cash-denomination input")
      .forEach((el) => el.addEventListener("input", update));
    document.querySelectorAll("[data-cash-step]").forEach((button) =>
      button.addEventListener("click", () => {
        const input = button.parentElement.querySelector("input");
        input.value = Math.max(
          0,
          Math.min(
            999999,
            Number(input.value || 0) + Number(button.dataset.cashStep),
          ),
        );
        update();
      }),
    );
  }
  $("#dialog").showModal();
}
function cents(v) {
  return Math.round(Number(v) * 100);
}
$("#form").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.currentTarget,
    v = Object.fromEntries(new FormData(f)),
    kind = f.dataset.kind;
  let table, record;
  if (kind === "cashcount") {
    const denominations = {};
    for (const [key, value] of Object.entries(v)) {
      if (key.startsWith("d_"))
        denominations[key.slice(2)] = Number(value || 0);
    }
    const amount = Object.entries(denominations).reduce(
      (sum, [value, count]) => sum + Number(value) * count,
      0,
    );
    if (!amount) {
      $("#form-error").textContent = "Selecione pelo menos uma nota ou moeda.";
      return;
    }
    if (v.mode === "spend" && !v.account_id) {
      $("#form-error").textContent =
        "Ainda não há dinheiro em espécie registrado para gastar.";
      return;
    }
    if (v.mode === "spend") {
      const wallet = data.accounts.find(
        (a) => a.id === v.account_id && a.kind === "cash",
      );
      if (!wallet || accountBalance(wallet) < amount) {
        $("#form-error").textContent =
          "O valor é maior que o saldo em espécie registrado.";
        return;
      }
    }
    const button = f.querySelector("[type=submit]");
    button.disabled = true;
    try {
      let accountId = v.account_id;
      if (!accountId) {
        const created = await client
          .from("accounts")
          .insert({
            name: "Dinheiro em espécie",
            kind: "cash",
            opening_balance_cents: 0,
            user_id: user.id,
          })
          .select()
          .single();
        if (created.error || !created.data) {
          $("#form-error").textContent =
            "Não foi possível preparar sua carteira. Tente novamente.";
          return;
        }
        data.accounts.push(created.data);
        accountId = created.data.id;
        const field = f.querySelector("[name=account_id]");
        if (field) field.value = accountId;
      }
      const result =
        v.mode === "spend"
          ? await client
              .from("transactions")
              .insert({
                user_id: user.id,
                account_id: accountId,
                type: "expense",
                amount_cents: amount,
                date: today(),
                description: "Gasto em espécie",
                category: "Outros",
              })
          : await client.rpc("record_cash_count", {
              p_account_id: accountId,
              p_mode: "add",
              p_denominations: denominations,
            });
      const { error } = result;
      if (error) {
        $("#form-error").textContent =
          "Não foi possível salvar a contagem. A configuração da contagem no banco ainda pode estar pendente.";
        return;
      }
      $("#dialog").close();
      toast(v.mode === "spend" ? "Gasto registrado." : "Dinheiro adicionado.");
      await load();
    } catch {
      $("#form-error").textContent =
        "Não foi possível salvar a contagem. Tente novamente.";
    } finally {
      button.disabled = false;
    }
    return;
  }
  if (kind === "account") {
    table = "accounts";
    record = {
      name: v.name.trim(),
      kind: v.kind,
      opening_balance_cents: cents(v.amount),
      user_id: user.id,
    };
  }
  if (kind === "transaction") {
    if (
      !data.accounts.some((a) => a.id === v.account_id && a.kind === "cash")
    ) {
      $("#form-error").textContent =
        "Selecione uma conta de dinheiro em espécie.";
      return;
    }
    table = "transactions";
    record = {
      description: v.description.trim(),
      type: v.type,
      amount_cents: cents(v.amount),
      date: v.date,
      category: v.category.trim(),
      account_id: v.account_id,
      user_id: user.id,
    };
  }
  if (kind === "goal") {
    table = "goals";
    let coverUrl =
      data.goals.find((goal) => goal.id === f.dataset.id)?.cover_url || null;
    if (v.cover instanceof File && v.cover.size) {
      const ext = (v.cover.name.split(".").pop() || "jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const upload = await client.storage
        .from("goal-covers")
        .upload(path, v.cover, { cacheControl: "3600", upsert: false });
      if (upload.error) {
        $("#form-error").textContent =
          "Não foi possível enviar a capa. Verifique se a atualização do Supabase foi executada.";
        return;
      }
      coverUrl = client.storage.from("goal-covers").getPublicUrl(path).data
        .publicUrl;
    }
    record = {
      name: v.name.trim(),
      description: v.description.trim() || null,
      target_cents: cents(v.target),
      saved_cents: cents(v.saved),
      deadline: v.deadline || null,
      cover_url: coverUrl,
      user_id: user.id,
    };
  }
  let res;
  if (kind === "invite") {
    res = await client.rpc("create_goal_invite", {
      p_goal_id: f.dataset.id,
      p_email: v.email.trim(),
    });
    if (!res.error) {
      const inviteUrl =
        location.origin +
        location.pathname +
        "?invite=" +
        encodeURIComponent(res.data) +
        "#metas";
      try {
        if (navigator.share)
          await navigator.share({
            title: "Um sonho para construirmos juntos",
            text: "Você foi convidado para participar de uma meta no Gaybe.",
            url: inviteUrl,
          });
        else {
          await navigator.clipboard.writeText(inviteUrl);
          toast("Link do convite copiado.");
        }
      } catch (error) {
        if (error.name !== "AbortError")
          await navigator.clipboard.writeText(inviteUrl);
      }
    }
  } else if (kind === "contribution") {
    res = await client.rpc("contribute_to_shared_goal", {
      p_goal_id: f.dataset.id,
      p_amount: cents(v.amount),
    });
    if (res.error)
      res = await client.rpc("contribute_to_goal", {
        goal_id: f.dataset.id,
        amount: cents(v.amount),
      });
  } else if (kind === "goal" && f.dataset.id)
    res = await client.from(table).update(record).eq("id", f.dataset.id);
  else res = await client.from(table).insert(record);
  if (res.error) {
    $("#form-error").textContent = ["goal", "invite"].includes(kind)
      ? "Este recurso precisa da atualização “Sonhos compartilhados” no Supabase."
      : "Não foi possível salvar. Confira a conexão e tente novamente.";
    return;
  }
  $("#dialog").close();
  toast(
    kind === "invite"
      ? "Convite pronto para compartilhar."
      : "Salvo com carinho!",
  );
  await load();
};
async function remove(kind, id) {
  if (
    !requireUser() ||
    !confirm("Deseja excluir este registro? Esta ação não pode ser desfeita.")
  )
    return;
  let table = {
    account: "accounts",
    transaction: "transactions",
    goal: "goals",
  }[kind];
  const { error } = await client.from(table).delete().eq("id", id);
  if (error) {
    toast(
      kind === "account"
        ? "Não foi possível excluir. Remova primeiro os lançamentos vinculados."
        : "Não foi possível excluir o registro.",
    );
    return;
  }
  toast("Registro excluído.");
  await load();
}
$("#privacy").onclick = () => {
  hidden = !hidden;
  $("#privacy").title = hidden ? "Mostrar valores" : "Ocultar valores";
  $("#privacy").setAttribute("aria-label", $("#privacy").title);
  $("#privacy").setAttribute("aria-pressed", String(hidden));
  $("#eye-slash").hidden = !hidden;
  render();
};
$("#account-button").onclick = () => (location.hash = "ajustes");
$(".close").onclick = () => $("#dialog").close();
window.addEventListener("hashchange", render);
$("#welcome-google").onclick = signIn;
const authError =
  new URLSearchParams(location.search).get("error") ||
  new URLSearchParams(location.hash.slice(1)).get("error");
if (authError) {
  $("#welcome-error").textContent =
    "Não foi possível entrar com o Google. Tente novamente.";
  history.replaceState(null, "", location.pathname);
}
initClient();
load();
