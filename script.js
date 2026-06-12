// Cole aqui a URL do seu Google Apps Script após configurar
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwVdqrdavJvJgaLW-0d0xypUjy-MwJHDcl79zTGrxiYNyYLBs7NvNVsmVLfUG2weAD5YA/exec";
const SENHA_ACESSO = "logoscontabil26";

let alunoNome  = "";
let alunoEmail = "";

function verificarSenha() {
  const senha = document.getElementById("inputSenha").value.trim();
  const erro  = document.getElementById("senhaErro");
  if (senha === SENHA_ACESSO) {
    document.getElementById("senha").style.display = "none";
    document.getElementById("intro").style.display = "block";
  } else {
    erro.innerText = "Senha incorreta. Tente novamente.";
    document.getElementById("inputSenha").value = "";
  }
}

// Permite pressionar Enter na senha
document.addEventListener("DOMContentLoaded", () => {
  const inputSenha = document.getElementById("inputSenha");
  if (inputSenha) {
    inputSenha.addEventListener("keydown", (e) => {
      if (e.key === "Enter") verificarSenha();
    });
  }
});

function mostrarCadastro() {
  document.getElementById("intro").style.display = "none";
  document.getElementById("registro").style.display = "block";
}

function iniciarComCadastro() {
  const nome  = document.getElementById("inputNome").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  const erro  = document.getElementById("cadastroErro");

  if (!nome)  { erro.innerText = "Por favor, informe seu nome."; return; }
  if (!email || !email.includes("@")) { erro.innerText = "Por favor, informe um e-mail válido."; return; }

  erro.innerText = "";
  alunoNome  = nome;
  alunoEmail = email;

  document.getElementById("registro").style.display = "none";
  document.getElementById("game").style.display = "grid";
}

function startGame() {
  document.getElementById("intro").style.display = "none";
  document.getElementById("game").style.display = "grid";
}

let usedCards = new Set();
let mission = 1;
const MAX_MISSIONS = 4;

// Totais acumulados
let ativoTotal        = 0;
let passivoTotal      = 0;
let capitalSocial     = 0;
let capitalAIntegralizar = 0;
let plTotal           = 0;

// Pontuação
let score = 0;
let wrongAttemptsPerCard = {};

// Explicações
const explanations = {
  capitalSocial:
    "O <strong>Capital Social Subscrito</strong> vai para o <strong>PL</strong> porque representa o valor que os sócios se comprometeram a investir na empresa.",
  capitalIntegralizar100:
    "O <strong>Capital a Integralizar</strong> é uma conta <strong>redutora do PL</strong> — diminui o Capital Social enquanto os sócios ainda não depositaram o dinheiro.",
  banco60000:
    "O <strong>Banco Conta Movimento</strong> é um <strong>Ativo</strong> — representa o dinheiro que entrou na conta bancária da empresa.",
  capitalIntegralizarCredito60000:
    "O <strong>Capital a Integralizar</strong> é reduzido no <strong>PL</strong> — os sócios cumpriram parte do compromisso ao depositar R$ 60.000.",
  estoques40000:
    "Os <strong>Estoques</strong> são um <strong>Ativo</strong> — as mercadorias recebidas pertencem à empresa e têm valor econômico.",
  capitalIntegralizarCredito40000:
    "O <strong>Capital a Integralizar</strong> é zerado no <strong>PL</strong> — os sócios integralizaram os R$ 40.000 restantes em mercadorias.",
  estoques20000:
    "Os <strong>Estoques</strong> são um <strong>Ativo</strong> — a compra aumenta o estoque disponível da empresa.",
  fornecedores20000:
    "Os <strong>Fornecedores</strong> são um <strong>Passivo</strong> — a compra a prazo gera uma obrigação (dívida) com o fornecedor."
};

function format(value) { return value.toLocaleString("pt-BR"); }
function $(id)         { return document.getElementById(id); }

function allowDrop(event) { event.preventDefault(); }
function drag(event) { event.dataTransfer.setData("id", event.currentTarget.id); }

let selectedCardId = null;

function selectCard(id) {
  selectedCardId = id;
  document.querySelectorAll(".card").forEach(card => card.classList.remove("card-selected"));
  const card = $(id);
  if (card) card.classList.add("card-selected");
  $("feedback").innerHTML = "Agora toque no quadro correto.";
}

function tapDrop(targetSide) {
  if (!selectedCardId) return;
  const fakeEvent = {
    preventDefault: () => {},
    dataTransfer: { getData: () => selectedCardId }
  };
  drop(fakeEvent, targetSide);
  selectedCardId = null;
}

function createCard(id, label, value, correct, action) {
  return `
    <div class="card" draggable="true"
      onclick="selectCard('${id}')"
      ondragstart="drag(event)"
      id="${id}"
      data-correct="${correct}"
      data-action="${action}"
      data-value="${value}">
      ${label}<br>R$ ${format(value)}
    </div>
  `;
}

function loadMission() {
  usedCards.clear();
  wrongAttemptsPerCard = {};
  $("cards").innerHTML = "";
  $("feedback").innerHTML = "Toque (ou arraste) uma conta e depois toque no quadro correto.";
  $("nextBtn").disabled = true;
  $("explanation").style.display = "none";
  $("explanation").innerHTML = "";

  if (mission === 1) {
    $("missionBox").innerHTML = `
      <h2>📖 Missão 1 de ${MAX_MISSIONS}</h2>
      <p><strong>Os sócios subscreveram Capital Social de R$ 100.000.</strong></p>
      <p>Classifique as contas corretamente.</p>`;
    $("cards").innerHTML =
      createCard("capitalSocial", "Capital Social Subscrito", 100000, "pl", "capitalSocial") +
      createCard("capitalIntegralizar", "Capital a Integralizar", 100000, "pl", "capitalIntegralizar100");
  }

  if (mission === 2) {
    $("missionBox").innerHTML = `
      <h2>📖 Missão 2 de ${MAX_MISSIONS}</h2>
      <p><strong>Os sócios depositaram R$ 60.000 na conta bancária da empresa.</strong></p>
      <p>Classifique as duas contas envolvidas no lançamento.</p>`;
    $("cards").innerHTML =
      createCard("banco", "Banco Conta Movimento", 60000, "ativo", "banco60000") +
      createCard("capitalIntegralizar60", "Capital a Integralizar", 60000, "pl", "capitalIntegralizarCredito60000");
  }

  if (mission === 3) {
    $("missionBox").innerHTML = `
      <h2>📖 Missão 3 de ${MAX_MISSIONS}</h2>
      <p><strong>Os sócios integralizaram os R$ 40.000 restantes em mercadorias.</strong></p>
      <p>Classifique as duas contas envolvidas na operação.</p>`;
    $("cards").innerHTML =
      createCard("estoques40", "Estoques", 40000, "ativo", "estoques40000") +
      createCard("capitalIntegralizar40", "Capital a Integralizar", 40000, "pl", "capitalIntegralizarCredito40000");
  }

  if (mission === 4) {
    $("missionBox").innerHTML = `
      <h2>📖 Missão 4 de ${MAX_MISSIONS}</h2>
      <p><strong>A empresa comprou R$ 20.000 em estoques a prazo.</strong></p>
      <p>Classifique as duas contas corretamente.</p>`;
    $("cards").innerHTML =
      createCard("estoques20", "Estoques", 20000, "ativo", "estoques20000") +
      createCard("fornecedores", "Fornecedores", 20000, "passivo", "fornecedores20000");
  }

  updateBalance();
}

function drop(event, targetSide) {
  event.preventDefault();
  const id   = event.dataTransfer.getData("id");
  const card = $(id);
  if (!card || usedCards.has(id)) return;

  const correct = card.dataset.correct;
  const action  = card.dataset.action;
  const value   = Number(card.dataset.value);
  const name    = card.innerText;

  if (targetSide !== correct) {
    wrongAttemptsPerCard[id] = (wrongAttemptsPerCard[id] || 0) + 1;
    showError(name);
    const boxErro = document.getElementById(targetSide + "Box");
    if (boxErro) {
      boxErro.classList.add("erro-drop");
      setTimeout(() => boxErro.classList.remove("erro-drop"), 900);
    }
    return;
  }

  const erros  = wrongAttemptsPerCard[id] || 0;
  const pontos = erros === 0 ? 10 : erros === 1 ? 7 : 5;
  score += pontos;
  showPontosGanhos(pontos);
  showExplanation(action);
  usedCards.add(id);
  card.remove();

  if (action === "capitalSocial")                  { capitalSocial += value; addItem("plItems", name); }
  if (action === "capitalIntegralizar100")          { capitalAIntegralizar += value; $("redutoraArea").style.display = "block"; updateRedutoraText(); }
  if (action === "banco60000")                      { ativoTotal += value; addItem("ativoItems", name); }
  if (action === "capitalIntegralizarCredito60000") { capitalAIntegralizar -= value; updateRedutoraText(); }
  if (action === "estoques40000")                   { ativoTotal += value; addItem("ativoItems", name); }
  if (action === "capitalIntegralizarCredito40000") { capitalAIntegralizar -= value; updateRedutoraText(); }
  if (action === "estoques20000")                   { ativoTotal += value; addItem("ativoItems", name); }
  if (action === "fornecedores20000")               { passivoTotal += value; addItem("passivoItems", name); }

  updateBalance();
  checkMissionComplete();
}

function checkMissionComplete() {
  if (usedCards.size >= 2) {
    if (mission < MAX_MISSIONS) {
      $("feedback").innerHTML = "✅ Missão concluída! Veja a explicação abaixo.";
      $("nextBtn").disabled = false;
      $("nextBtn").innerText = "➡ Próxima Missão";
    } else {
      $("feedback").innerHTML = "✅ Todas as missões concluídas!";
      $("nextBtn").disabled = false;
      $("nextBtn").innerText = "🏆 Ver Resultado Final";
    }
  }
}

function showPontosGanhos(pontos) {
  const el = document.createElement("div");
  el.className = "pontos-ganhos";
  el.innerText = "+" + pontos + " pts";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function showExplanation(action) {
  const texto = explanations[action];
  if (!texto) return;
  const el = $("explanation");
  el.style.display = "block";
  el.innerHTML = "💡 " + texto;
}

function addItem(areaId, text, redutora = false) {
  const item = document.createElement("div");
  item.className = redutora ? "inside redutora" : "inside";
  item.innerText = text;
  $(areaId).appendChild(item);
}

function updateRedutoraText() {
  $("redutoraArea").style.display = "block";
  $("redutoraItems").innerHTML = "";
  addItem("redutoraItems", "(-) Capital a Integralizar\nR$ " + format(capitalAIntegralizar), true);
}

function updateBalance() {
  plTotal = capitalSocial - capitalAIntegralizar;
  const ladoDireito = passivoTotal + plTotal;

  const pplt = $("passivoPLTotal");
  if (pplt) pplt.innerText = format(ladoDireito);

  $("ativoTotal").innerText    = format(ativoTotal);
  $("passivoTotal").innerText  = format(passivoTotal);
  $("plTotal").innerText       = format(plTotal);
  $("ativoEq").innerText       = format(ativoTotal);
  $("ladoDireitoEq").innerText = format(ladoDireito);

  const diff  = ativoTotal - ladoDireito;
  const angle = Math.max(Math.min(diff / 300, 28), -28);
  $("beam").style.transform = `rotate(${-angle}deg)`;

  const balanceArea = document.querySelector(".balance-area");
  if (diff !== 0) {
    balanceArea.classList.remove("balanca-vibrar");
    void balanceArea.offsetWidth;
    balanceArea.classList.add("balanca-vibrar");
    // Vibração háptica para Android
    if (navigator.vibrate) navigator.vibrate([150, 80, 150]);
  } else {
    balanceArea.classList.remove("balanca-vibrar");
  }

  const ativoBox   = $("ativoBox");
  const passivoBox = $("passivoBox");
  const plBox      = $("plBox");

  [ativoBox, passivoBox, plBox].forEach(el =>
    el.classList.remove("destaque-ativo", "destaque-passivo", "destaque-equilibrado")
  );

  if (diff > 0)      { ativoBox.classList.add("destaque-ativo"); }
  else if (diff < 0) { passivoBox.classList.add("destaque-passivo"); plBox.classList.add("destaque-passivo"); }
  else               { ativoBox.classList.add("destaque-equilibrado"); passivoBox.classList.add("destaque-equilibrado"); plBox.classList.add("destaque-equilibrado"); }
}

function showError(name) {
  $("feedback").innerHTML = `❌ Atenção! Revise a classificação de ${name.split("\n")[0]}.`;
}

function nextMission() {
  if (mission < MAX_MISSIONS) { mission++; loadMission(); }
  else showFinalResult();
}

function showFinalResult() {
  const existing = document.querySelector(".resultado-final");
  if (existing) existing.remove();
  $("game").style.display = "none";

  // Envia resultado para o Google Sheets
  if (GOOGLE_SHEET_URL !== "SUA_URL_AQUI") {
    const agora = new Date();
    const data  = agora.toLocaleDateString("pt-BR") + " " + agora.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"});
    const payload = {
      modulo: "Módulo 1",
      nome:   alunoNome,
      email:  alunoEmail,
      pontos: score + " / " + (MAX_MISSIONS * 2 * 10),
      data:   data
    };
    fetch(GOOGLE_SHEET_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  }

  const maxScore = MAX_MISSIONS * 2 * 10;
  const percent  = Math.round((score / maxScore) * 100);

  let medal = "", msg = "";
  if (percent === 100)    { medal = "🥇"; msg = "Perfeito! Você acertou tudo de primeira!"; }
  else if (percent >= 70) { medal = "🥈"; msg = "Muito bem! Você domina os conceitos básicos."; }
  else                    { medal = "🥉"; msg = "Continue praticando! Você está no caminho certo."; }

  const equilibrado = ativoTotal === (passivoTotal + plTotal);

  const finalDiv = document.createElement("div");
  finalDiv.className = "resultado-final";
  finalDiv.innerHTML = `
    <h1>⚖️ Resultado Final — Módulo 1</h1>
    <div class="resultado-medal">${medal}</div>
    <div class="resultado-pontos">${score} / ${maxScore} pontos</div>
    <p class="resultado-msg">${msg}</p>

    <div class="resultado-balanco">
      <h2>📊 Balanço Patrimonial Final</h2>
      <div class="balanco-grid">

        <div class="balanco-col">
          <h3>ATIVO</h3>
          <div class="balanco-item">Total Ativo<br><strong>R$ ${format(ativoTotal)}</strong></div>
        </div>

        <div class="balanco-col-direita">
          <div class="balanco-subcol">
            <h3>PASSIVO</h3>
            <div class="balanco-item">Total Passivo<br><strong>R$ ${format(passivoTotal)}</strong></div>
          </div>
          <div class="balanco-subcol">
            <h3>PL</h3>
            <div class="balanco-item">Total do PL<br><strong>R$ ${format(plTotal)}</strong></div>
          </div>
        </div>

      </div>
      <div class="balanco-equacao ${equilibrado ? 'equilibrado' : ''}">
        Ativo: R$ ${format(ativoTotal)} ${equilibrado ? "= ✅" : "≠ ⚠️"} Passivo+PL: R$ ${format(passivoTotal + plTotal)}
      </div>
    </div>

    <button onclick="resetGame()">🔄 Jogar Novamente</button>
  `;
  document.body.appendChild(finalDiv);
}

function resetGame() {
  mission              = 1;
  ativoTotal           = 0;
  passivoTotal         = 0;
  capitalSocial        = 0;
  capitalAIntegralizar = 0;
  plTotal              = 0;
  score                = 0;
  wrongAttemptsPerCard = {};
  usedCards.clear();

  const fin = document.querySelector(".resultado-final");
  if (fin) fin.remove();

  $("ativoItems").innerHTML    = "";
  $("passivoItems").innerHTML  = "";
  $("plItems").innerHTML       = "";
  $("redutoraItems").innerHTML = "";
  $("redutoraArea").style.display = "none";
  $("nextBtn").innerText = "➡ Próxima Missão";
  $("game").style.display = "grid";

  loadMission();
  updateBalance();
}

loadMission();
initTouchDrag();

// ── Touch Drag ───────────────────────────────────────────────
let touchDragCard = null;
let touchClone    = null;

function initTouchDrag() {
  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove',  onTouchMove,  { passive: false });
  document.addEventListener('touchend',   onTouchEnd,   { passive: false });
}

function onTouchStart(e) {
  const card = e.target.closest('.card');
  if (!card) return;
  e.preventDefault();
  touchDragCard = card;
  const rect = card.getBoundingClientRect();
  touchClone = card.cloneNode(true);
  touchClone.style.cssText = `
    position:fixed; width:${rect.width}px; left:${rect.left}px; top:${rect.top}px;
    opacity:0.85; pointer-events:none; z-index:9999;
    transform:scale(1.06) rotate(2deg);
    box-shadow:0 8px 24px rgba(0,0,0,0.25);
    border-radius:10px; background:#dbeafe; border:2px solid #3b82f6;
  `;
  document.body.appendChild(touchClone);
  card.style.opacity = '0.35';
}

function onTouchMove(e) {
  if (!touchDragCard) return;
  e.preventDefault();
  const touch = e.touches[0];
  touchClone.style.left = (touch.clientX - touchClone.offsetWidth  / 2) + 'px';
  touchClone.style.top  = (touch.clientY - touchClone.offsetHeight / 2) + 'px';
  ['ativoBox','passivoBox','plBox'].forEach(pid => {
    const el = $(pid); if (!el) return;
    const r = el.getBoundingClientRect();
    el.classList.toggle('hover-drop',
      touch.clientX >= r.left && touch.clientX <= r.right &&
      touch.clientY >= r.top  && touch.clientY <= r.bottom);
  });
}

function onTouchEnd(e) {
  if (!touchDragCard) return;
  const touch = e.changedTouches[0];
  if (touchClone) { touchClone.remove(); touchClone = null; }
  touchDragCard.style.opacity = '1';
  ['ativoBox','passivoBox','plBox'].forEach(pid => {
    const el = $(pid); if (el) el.classList.remove('hover-drop');
  });

  const sideMap = { ativoBox:'ativo', passivoBox:'passivo', plBox:'pl' };
  let targetSide = null;
  for (const [pid, side] of Object.entries(sideMap)) {
    const el = $(pid); if (!el) continue;
    const r = el.getBoundingClientRect();
    if (touch.clientX >= r.left && touch.clientX <= r.right &&
        touch.clientY >= r.top  && touch.clientY <= r.bottom) { targetSide = side; break; }
  }
  if (targetSide) {
    drop({ preventDefault:()=>{}, dataTransfer:{ getData:()=>touchDragCard.id } }, targetSide);
  }
  touchDragCard = null;
}
