/* painel.js do modelo dos painéis (base e61d91aa68350727), com 2 trocas para o app: mapa hospedado aqui e A CAPTAR do app. Montado por montar_painel_app.py. */ /* trocas-4b2 */
/* MODELO DO PAINEL DO CORRETOR · painel.js — os 5 blocos <script> do painel, na ordem original.
   Cada bloco roda isolado: um erro num bloco nao impede os seguintes (como em scripts separados). */

/* ===== reordena-abas:inicio ===== */
try {

/* Reordenar abas arrastando (26/10/2026, pedido do Cleiton) — usado no HUB VIVERE e nos painéis dos corretores.
   Celular: toque e segure ~0,4 s e arraste. Computador: clique e segure (ou clique e arraste). Teclado: Alt + setas.
   A página decide onde guardar a ordem (aoSoltar); este arquivo só cuida do gesto, da prévia e do aviso. */
(function () {
  'use strict';
  if (window.ReordAbas) return;
  const ESPERA_TOQUE = 400, ESPERA_MOUSE = 280, FOLGA_TOQUE = 10, FOLGA_MOUSE = 6;
  const css = `
nav[data-ord] button{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
nav[data-ord] button.ord-segura{transition:transform .38s ease-out;transform:scale(.94)}
nav[data-ord] button.ord-arrastando{opacity:.3;outline:2px dashed var(--brass,#8c7550);outline-offset:-3px;border-radius:6px}
html.ord-agarrando,html.ord-agarrando *{cursor:grabbing!important}
.ord-fantasma{position:fixed;z-index:1000;pointer-events:none;transform:translate(-50%,-70%) scale(1.06);background:var(--panel,#fff);color:var(--ink,#1d2840);border:1px solid var(--brass,#8c7550);border-radius:8px;box-shadow:0 8px 22px rgba(0,0,0,.28);white-space:nowrap;margin:0}
nav[data-ord] .ord-reset{all:unset;box-sizing:border-box;flex:none!important;margin:4px 0 4px auto;align-self:center;border:1px solid var(--brass,#8c7550);border-radius:999px;padding:4px 11px;font-family:inherit;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;line-height:1.4;color:var(--ink,#1d2840);background:var(--panel,#fff);cursor:pointer;white-space:nowrap;opacity:1}
nav[data-ord] .ord-reset:focus-visible{outline:2px solid var(--brass,#8c7550);outline-offset:2px}
.ord-aviso{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:75;display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:center;background:var(--ink,#1d2840);color:var(--bg,#f4f5f0);font-size:14px;padding:10px 14px;border-radius:8px;max-width:calc(100% - 32px);box-shadow:0 6px 18px rgba(0,0,0,.25)}
.ord-aviso button{border:1px solid currentColor;background:none;color:inherit;font-family:inherit;font-weight:600;font-size:13px;border-radius:999px;padding:4px 11px;cursor:pointer;white-space:nowrap}
@media (prefers-reduced-motion:reduce){nav[data-ord] button.ord-segura{transition:none}}`;
  const st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  let g = null;            // gesto em curso
  let suprimeAte = 0;      // engole o clique que o navegador dispara ao soltar
  window.addEventListener('click', (e) => { if (Date.now() < suprimeAte) { e.preventDefault(); e.stopPropagation(); suprimeAte = 0; } }, true);
  // sem isto o celular rola a página e cancela o arraste; precisa estar ligado desde o começo e não passivo
  document.addEventListener('touchmove', (e) => { if (g && g.ativo && e.cancelable) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', (e) => { if (g) e.preventDefault(); }, true);
  document.addEventListener('selectstart', (e) => { if (g) e.preventDefault(); }, true);
  document.addEventListener('keydown', (e) => { if (g && e.key === 'Escape') { e.preventDefault(); fim(false); } }, true);
  window.addEventListener('blur', () => { if (g) fim(false); });

  const chaves = (nav, cfg) => [...nav.querySelectorAll(cfg.sel)].map((b) => b.dataset[cfg.attr]);
  const porChave = (nav, cfg, k) => [...nav.querySelectorAll(cfg.sel)].find((b) => b.dataset[cfg.attr] === k);
  const rotulo = (b) => { const c = b.cloneNode(true); c.querySelectorAll('.n,.badge').forEach((x) => x.remove()); return c.textContent.trim(); };

  function inicia(e, nav, cfg) {
    if (g) fim(false);
    if (e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0) || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const b = e.target.closest(cfg.sel); if (!b || !nav.contains(b)) return;
    const toque = e.pointerType !== 'mouse';
    g = { nav, cfg, b, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, toque, ativo: false, antes: chaves(nav, cfg) };
    b.classList.add('ord-segura');
    g.t = setTimeout(ativa, toque ? ESPERA_TOQUE : ESPERA_MOUSE);
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', solta, true);
    document.addEventListener('pointercancel', cancela, true);
  }
  function ativa() {
    if (!g || g.ativo) return;
    g.ativo = true; clearTimeout(g.t);
    const { b, nav } = g;
    b.classList.remove('ord-segura'); b.classList.add('ord-arrastando'); b.setAttribute('aria-grabbed', 'true');
    nav.classList.add('ord-reordenando'); document.documentElement.classList.add('ord-agarrando');
    const cs = getComputedStyle(b), f = document.createElement('div');
    f.className = 'ord-fantasma'; f.setAttribute('aria-hidden', 'true'); f.textContent = rotulo(b);
    ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'textTransform', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach((p) => { f.style[p] = cs[p]; });
    document.body.appendChild(f); g.f = f; pos();
    try { if (g.toque && navigator.vibrate) navigator.vibrate(12); } catch (_) {}
  }
  function pos() { if (g && g.f) { g.f.style.left = g.x + 'px'; g.f.style.top = g.y + 'px'; } }
  function move(e) {
    if (!g || e.pointerId !== g.id) return;
    g.x = e.clientX; g.y = e.clientY;
    if (!g.ativo) {
      if (Math.hypot(g.x - g.x0, g.y - g.y0) <= (g.toque ? FOLGA_TOQUE : FOLGA_MOUSE)) return;
      if (g.toque) { fim(false); return; } // no celular, mexer antes do tempo é rolar a página
      ativa();
    }
    if (e.cancelable) e.preventDefault();
    pos(); reposiciona();
  }
  function reposiciona() {
    const { nav, cfg, b, x, y } = g;
    const rb = b.getBoundingClientRect();
    if (x >= rb.left && x <= rb.right && y >= rb.top && y <= rb.bottom) return; // em cima do próprio lugar
    const its = [...nav.querySelectorAll(cfg.sel)].filter((o) => o !== b);
    let alvo = null, dm = Infinity;
    for (const o of its) {
      const r = o.getBoundingClientRect();
      if (y < r.top - 6 || y > r.bottom + 6) continue; // só a linha em que o dedo está
      const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      if (dx < dm) { dm = dx; alvo = o; }
    }
    if (!alvo) return;
    const r = alvo.getBoundingClientRect(), depois = x > r.left + r.width / 2;
    if (depois ? alvo.nextElementSibling === b : alvo.previousElementSibling === b) return;
    nav.insertBefore(b, depois ? alvo.nextSibling : alvo);
  }
  function solta(e) { if (!g || e.pointerId !== g.id) return; fim(g.ativo); }
  function cancela(e) { if (!g || e.pointerId !== g.id) return; fim(g.ativo); }
  function fim(salvar) {
    const x = g; g = null; if (!x) return;
    clearTimeout(x.t);
    document.removeEventListener('pointermove', move, true);
    document.removeEventListener('pointerup', solta, true);
    document.removeEventListener('pointercancel', cancela, true);
    x.b.classList.remove('ord-segura', 'ord-arrastando'); x.b.removeAttribute('aria-grabbed');
    x.nav.classList.remove('ord-reordenando'); document.documentElement.classList.remove('ord-agarrando');
    if (x.f) x.f.remove();
    if (!x.ativo) return;
    suprimeAte = Date.now() + 250;
    const depois = chaves(x.nav, x.cfg);
    if (salvar && depois.join('|') !== x.antes.join('|')) { x.cfg.aoSoltar(depois, x.b.dataset[x.cfg.attr]); return; }
    x.antes.forEach((k) => { const o = porChave(x.nav, x.cfg, k); if (o) x.nav.appendChild(o); }); // volta como estava
    if (x.cfg.redesenha) x.cfg.redesenha();
  }

  window.ReordAbas = {
    // liga um menu: cfg = { sel: 'button[data-aba]', attr: 'aba', aoSoltar(novaOrdem, chaveMovida), redesenha() }
    liga(nav, cfg) {
      if (!nav || nav.dataset.ord) return;
      nav.dataset.ord = '1';
      if (!nav.title) nav.title = 'Para mudar a ordem: toque e segure (celular) ou clique e segure (computador) uma aba e arraste. Teclado: Alt + setas.';
      nav.addEventListener('pointerdown', (e) => inicia(e, nav, cfg));
      nav.addEventListener('dragstart', (e) => { if (e.target.closest && e.target.closest(cfg.sel)) e.preventDefault(); });
      nav.addEventListener('keydown', (e) => {
        if (!e.altKey || e.ctrlKey || e.metaKey) return;
        const dir = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key]; if (!dir) return;
        const b = e.target.closest(cfg.sel); if (!b || !nav.contains(b)) return;
        e.preventDefault();
        const ks = chaves(nav, cfg), k = b.dataset[cfg.attr], i = ks.indexOf(k), j = i + dir;
        if (j < 0 || j >= ks.length) return;
        ks.splice(i, 1); ks.splice(j, 0, k);
        cfg.aoSoltar(ks, k);
        setTimeout(() => { const n = porChave(nav, cfg, k); if (n) n.focus(); }, 0);
      });
    },
    ativo: () => !!g, // inclui o toque ainda segurando: a página não redesenha o menu no meio do gesto
    // ordem final: a salva, com as abas novas encaixadas na posição padrão e as que sumiram descartadas
    ordena(padrao, salva) {
      if (!Array.isArray(salva) || !salva.length) return padrao.slice();
      const tem = new Set(padrao), r = [];
      salva.forEach((k) => { if (tem.has(k) && !r.includes(k)) r.push(k); });
      padrao.forEach((k, i) => { if (!r.includes(k)) r.splice(Math.min(i, r.length), 0, k); });
      return r;
    },
    // botão "↺ Ordem padrão" que a página põe sempre no fim do próprio menu (31/10/2026); na ordem original o clique não faz nada (clique tratado pela página: [data-ord-reset])
    botao: () => '<button type="button" class="ord-reset" data-ord-reset title="Voltar à ordem padrão das abas" aria-label="Restaurar a ordem padrão das abas">↺ Ordem padrão</button>',
    igual: (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]),
    aviso(texto, restaurar) {
      let a = document.getElementById('ord-aviso');
      if (!a) { a = document.createElement('div'); a.id = 'ord-aviso'; a.className = 'ord-aviso'; a.setAttribute('role', 'status'); document.body.appendChild(a); }
      a.replaceChildren(); const s = document.createElement('span'); s.textContent = texto; a.appendChild(s);
      if (restaurar) { const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = '↺ Restaurar ordem padrão'; bt.addEventListener('click', () => { a.hidden = true; restaurar(); }); a.appendChild(bt); }
      a.hidden = false; clearTimeout(a._t); a._t = setTimeout(() => { a.hidden = true; }, restaurar ? 7000 : 3500);
    },
  };
})();

} catch (e) { setTimeout(function () { throw e; }); }
/* ===== reordena-abas:fim ===== */

/* ===== multisel:inicio ===== */
try {

/* MultiSel — seleção de vários valores (ex.: bairros) com busca, comum ao HUB e aos painéis (26/10/2026, pedido do Cleiton).
   Uso: MultiSel.html(id, [[valor, rótulo], ...], [valores marcados], 'Todos', 'bairros') devolve o HTML;
   cada mudança dispara o evento 'ms-change' (bubbles) com detail {id, valores}. O estado aberto/fechado e o texto
   da busca ficam guardados por id, então o redesenho da tela não fecha a lista. */
window.MultiSel = window.MultiSel || (function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const semAc = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const ST = {};
  const est = (id) => ST[id] || (ST[id] = { aberto: false, q: '', sc: 0 });
  function rotulo(pares, sel, todos, plural) {
    const n = pares.filter(([v]) => sel.includes(v)).map(([, x]) => x);
    return !n.length ? todos : n.length <= 2 ? n.join(', ') : n.length + ' ' + (plural || 'selecionados');
  }
  function html(id, pares, sel, todos, plural) {
    sel = Array.isArray(sel) ? sel : (sel ? [sel] : []);
    const st = est(id), q = semAc(st.q), n = sel.length;
    return `<div class="ms${n ? ' ms-on' : ''}" data-ms="${esc(id)}"><button type="button" class="ms-bt" data-ms-a="abre" aria-expanded="${st.aberto}" title="Escolha um ou mais"><span class="ms-rot">${esc(rotulo(pares, sel, todos, plural))}</span><span aria-hidden="true">▾</span></button>`
      + `<div class="ms-pop"${st.aberto ? '' : ' hidden'}><input type="search" class="ms-q" placeholder="Filtrar a lista…" value="${esc(st.q)}" autocomplete="off">`
      + `<div class="ms-ac"><button type="button" data-ms-a="limpa" title="${esc(todos)}">Limpar</button><button type="button" data-ms-a="mostrados">Marcar os mostrados</button><button type="button" class="ms-ok" data-ms-a="ok">OK</button></div>`
      + `<div class="ms-li">` + pares.map(([v, r]) => `<label class="ms-it"${q && !semAc(r).includes(q) ? ' hidden' : ''}><input type="checkbox" value="${esc(v)}"${sel.includes(v) ? ' checked' : ''}><span>${esc(r)}</span></label>`).join('')
      + (pares.length ? '' : '<span class="ms-vazio">Nada para escolher.</span>') + `</div></div></div>`;
  }
  const raiz = (el) => el && el.closest && el.closest('.ms');
  const marcados = (r) => [...r.querySelectorAll('.ms-li input[type=checkbox]:checked')].map((x) => x.value);
  function avisa(r, valores) {
    const id = r.dataset.ms, li = r.querySelector('.ms-li'); if (li) est(id).sc = li.scrollTop;
    r.dispatchEvent(new CustomEvent('ms-change', { bubbles: true, detail: { id, valores } }));
    [0, 60, 250].forEach((t) => setTimeout(ajusta, t));
  }
  function ajusta() {   // depois do redesenho: devolve a rolagem da lista aberta
    document.querySelectorAll('.ms').forEach((r) => { const st = ST[r.dataset.ms]; const li = r.querySelector('.ms-li'); if (st && st.aberto && li && st.sc && li.scrollTop !== st.sc) li.scrollTop = st.sc; });
  }
  function abre(r, sim) {
    const st = est(r.dataset.ms), pop = r.querySelector('.ms-pop'), bt = r.querySelector('.ms-bt');
    st.aberto = sim; if (pop) pop.hidden = !sim; if (bt) bt.setAttribute('aria-expanded', String(sim));
    if (sim) { const q = r.querySelector('.ms-q'); if (q && window.matchMedia && !window.matchMedia('(pointer:coarse)').matches) setTimeout(() => q.focus(), 0); }
  }
  document.addEventListener('click', (e) => {
    const r = raiz(e.target);
    document.querySelectorAll('.ms').forEach((o) => { if (o !== r && ST[o.dataset.ms] && ST[o.dataset.ms].aberto) abre(o, false); });
    if (!r) return;
    const b = e.target.closest('[data-ms-a]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const a = b.dataset.msA;
    if (a === 'abre') return abre(r, !est(r.dataset.ms).aberto);
    if (a === 'ok') return abre(r, false);
    if (a === 'limpa') { r.querySelectorAll('.ms-li input').forEach((x) => { x.checked = false; }); return avisa(r, []); }
    if (a === 'mostrados') { r.querySelectorAll('.ms-it:not([hidden]) input').forEach((x) => { x.checked = true; }); return avisa(r, marcados(r)); }
  }, true);
  document.addEventListener('change', (e) => {
    const r = raiz(e.target); if (!r || !e.target.matches('.ms-li input[type=checkbox]')) return;
    e.stopPropagation(); avisa(r, marcados(r));
  }, true);
  document.addEventListener('input', (e) => {
    const r = raiz(e.target); if (!r || !e.target.classList.contains('ms-q')) return;
    e.stopPropagation(); const st = est(r.dataset.ms); st.q = e.target.value; const q = semAc(st.q);
    r.querySelectorAll('.ms-it').forEach((l) => { l.hidden = !!q && !semAc(l.textContent).includes(q); });
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const r = raiz(e.target) || document.querySelector('.ms .ms-pop:not([hidden])')?.closest('.ms'); if (r) abre(r, false); } });
  if (!document.getElementById('ms-css')) {
    const s = document.createElement('style'); s.id = 'ms-css';
    s.textContent = `.ms{position:relative;display:inline-block;min-width:170px;max-width:100%;vertical-align:middle;color:var(--ink,inherit);font-size:13px}
.ms-bt{width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left;padding:6px 8px;border:1px solid var(--line,#ccc);border-radius:6px;background:var(--panel,#fff);color:inherit;font:inherit;cursor:pointer;min-height:32px}
.ms-rot{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ms.ms-on .ms-bt{border-color:var(--teal,var(--accent,#2f6f73));box-shadow:inset 0 0 0 1px var(--teal,var(--accent,#2f6f73))}
.ms-pop{position:absolute;z-index:1200;left:0;top:calc(100% + 4px);width:280px;max-width:90vw;background:var(--panel,#fff);color:inherit;border:1px solid var(--line,#ccc);border-radius:8px;box-shadow:0 10px 28px rgba(0,0,0,.22);padding:8px;box-sizing:border-box}
.ms-pop[hidden]{display:none}
.ms-q{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--line,#ccc);border-radius:6px;background:transparent;color:inherit;font:inherit}
.ms-ac{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
.ms-ac button{padding:4px 8px;border:1px solid var(--line,#ccc);border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.ms-ac .ms-ok{margin-left:auto;font-weight:600}
.ms-li{max-height:280px;overflow:auto;display:flex;flex-direction:column;gap:1px}
.ms .ms-it{display:flex!important;flex-direction:row!important;justify-content:flex-start!important;gap:8px!important;align-items:center!important;padding:6px 4px;border-radius:4px;cursor:pointer;font-size:13px!important;line-height:1.25;color:inherit!important;text-align:left}
.ms .ms-it[hidden]{display:none!important}
.ms-it:hover{background:rgba(127,127,127,.14)}
.ms-it input{margin:0;width:16px;height:16px;flex:none}
.ms-vazio{font-size:12px;opacity:.7;padding:6px 4px}
@media (max-width:640px){.ms{display:block;width:100%}.ms-pop{position:fixed;left:8px;right:8px;top:auto;bottom:8px;width:auto;max-width:none;max-height:75vh;display:flex;flex-direction:column}.ms-pop[hidden]{display:none}.ms-li{max-height:none;flex:1;min-height:0}.ms .ms-it{padding:9px 4px;font-size:15px!important}}`;
    (document.head || document.documentElement).appendChild(s);
  }
  return { html, ajusta, estado: ST };
})();

} catch (e) { setTimeout(function () { throw e; }); }
/* ===== multisel:fim ===== */

/* ===== visoes-crm:inicio ===== */
try {

/* Visões do CRM (30/10/2026, pedido do Cleiton): Lista, Kanban, Pipeline, Funil e Agenda — o mesmo código no HUB VIVERE
   (Funil dos corretores, Leads e Oportunidades) e no painel de cada corretor (Meus leads). Seleção única (05/11/2026, pedido
   do Cleiton): uma visão por vez, ou Todas empilhadas; escolha antiga com várias marcadas vira a primeira delas. A escolha fica no banco (data/users/<id>/preferencias, campo visoes_crm) e no aparelho.
   O Kanban permite arrastar o cartão (computador) ou usar "Mover para" (celular) quando a página libera a mudança de etapa. */
(function () {
  if (window.VisoesCRM) return;
  const VISOES = [['lista', 'Lista'], ['kanban', 'Kanban'], ['pipeline', 'Pipeline'], ['funil', 'Funil'], ['agenda', 'Agenda']];
  const PADRAO = ['lista'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dtc = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}` : ''; };
  const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  let H = { mover: null, etapa: null, mudou: null, salvar: null };

  // ---------- escolha das visões ----------
  const LS = 'visoes_crm';
  function lerLocal() { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } }
  function ativas(chave, prefs) {
    const p = (prefs && prefs.visoes_crm) || lerLocal();
    const v = Array.isArray(p[chave]) ? p[chave].filter((x) => VISOES.some((y) => y[0] === x)) : null;
    if (!v || !v.length) return PADRAO.slice();
    return [VISOES.map((x) => x[0]).find((x) => v.includes(x))];
  }
  function alternar(chave, prefs, v) {
    let a = ativas(chave, prefs);
    if (v === '*') a = PADRAO.slice();
    else if (VISOES.some((y) => y[0] === v)) a = [v];
    const loc = lerLocal(); loc[chave] = a; try { localStorage.setItem(LS, JSON.stringify(loc)); } catch (e) {}
    const todas = Object.assign({}, lerLocal(), (prefs && prefs.visoes_crm) || {}, { [chave]: a });
    return { a, todas };
  }
  function seletor(chave, prefs) {
    const a = ativas(chave, prefs);
    return `<div class="vcrm-sel"><span class="vcrm-r">Visões</span><div class="chips vcrm-chips" role="group" aria-label="Visões">${VISOES.map(([k, t]) => `<button type="button" class="vcrm-b" data-vcrm-tog="${esc(chave)}|${k}" aria-pressed="${a.length === 1 && a[0] === k}">${t}</button>`).join('')}</div></div>`;
  }

  // ---------- Kanban ----------
  // itens: {id, nome, etapa, sub (html), pills (html), prox, data_prox, alerta, abre (atributo html), marca (texto)}
  function cartao(chave, x, cfg) {
    const mover = cfg.podeMover && (!cfg.podeMoverItem || cfg.podeMoverItem(x));
    const venc = x.data_prox && x.data_prox < hoje();
    return `<div class="vk-card${x.alerta ? ' alerta' : ''}" ${mover ? `data-vk-drag="${esc(chave)}|${esc(x.id)}"` : ''}>
      <div class="vk-l1">${x.abre ? `<button type="button" class="vk-nome" ${x.abre}>${esc(x.nome || '—')}</button>` : `<b class="vk-nome">${esc(x.nome || '—')}</b>`}${x.pills || ''}</div>
      ${x.sub ? `<div class="vk-s">${x.sub}</div>` : ''}
      ${x.prox || x.data_prox ? `<div class="vk-s${venc ? ' venc' : ''}">↳ ${esc(x.prox || 'Ação')}${x.data_prox ? ' · ' + dtc(x.data_prox) : ''}</div>` : ''}
      ${x.marca ? `<div class="vk-s vk-marca">${esc(x.marca)}</div>` : ''}
      ${mover ? `<label class="vk-mv"><span>Mover para</span><select data-vk-mover="${esc(chave)}|${esc(x.id)}"><option value="">—</option>${(cfg.destinos || cfg.etapas).filter((e) => e !== x.etapa).map((e) => `<option>${esc(e)}</option>`).join('')}</select></label>` : ''}
    </div>`;
  }
  function kanban(chave, itens, cfg) {
    const por = {}; cfg.etapas.forEach((e) => (por[e] = []));
    itens.forEach((x) => { const e = por[x.etapa] ? x.etapa : cfg.etapas[0]; por[e].push(x); });
    const ocultas = new Set(cfg.ocultarVazias ? cfg.etapas.filter((e) => !por[e].length) : []);
    return `<div class="vk" data-vk="${esc(chave)}">${cfg.etapas.filter((e) => !ocultas.has(e)).map((e) => `<div class="vk-col" data-vk-col="${esc(chave)}|${esc(e)}"${cfg.destinos && !cfg.destinos.includes(e) ? ' data-vk-fixa="1"' : ''}><div class="vk-cab"><span>${esc(e)}</span><b>${por[e].length}</b></div><div class="vk-lista">${por[e].slice(0, cfg.max || 200).map((x) => cartao(chave, x, cfg)).join('') || '<div class="vk-vazio">—</div>'}${por[e].length > (cfg.max || 200) ? `<div class="vk-vazio">e mais ${por[e].length - (cfg.max || 200)}</div>` : ''}</div></div>`).join('')}</div>
      ${cfg.podeMover ? `<p class="vcrm-nota">Arraste o cartão para outra coluna (no celular, toque e segure o cartão e arraste, ou use "Mover para").${cfg.notaMover ? ' ' + esc(cfg.notaMover) : ''}</p>` : cfg.notaLeitura ? `<p class="vcrm-nota">${esc(cfg.notaLeitura)}</p>` : ''}`;
  }

  // ---------- Pipeline ----------
  // dias = dias desde o último registro de cada item (número ou null)
  function pipeline(chave, itens, cfg) {
    const tot = itens.length || 1, max = Math.max(1, ...cfg.etapas.map((e) => itens.filter((x) => x.etapa === e).length));
    const linhas = cfg.etapas.map((e) => {
      const L = itens.filter((x) => x.etapa === e), n = L.length;
      const ds = L.map((x) => x.dias).filter((d) => typeof d === 'number'), med = ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : null;
      const al = L.filter((x) => x.alerta).length, venc = L.filter((x) => x.data_prox && x.data_prox < hoje()).length;
      return `<button type="button" class="vp-l" data-vp-etapa="${esc(chave)}|${esc(e)}" title="Ver os leads em ${esc(e)}" ${n ? '' : 'disabled'}>
        <span class="vp-e">${esc(e)}</span><span class="vp-bar"><i style="width:${Math.round((n / max) * 100)}%"></i></span>
        <span class="vp-n"><b>${n}</b> · ${Math.round((n / tot) * 100)}%</span>
        <span class="vp-d">${med == null ? '—' : med + ' dia' + (med === 1 ? '' : 's') + ' sem registro (média)'}</span>
        <span class="vp-a">${al ? `<span class="pill bad alta">${al} com alerta</span>` : ''}${venc ? ` <span class="pill warn media">${venc} ação vencida</span>` : ''}</span></button>`;
    }).join('');
    return `<div class="vp">${linhas}</div><p class="vcrm-nota">Clique numa etapa para filtrar a lista e o kanban.</p>`;
  }

  // ---------- Funil ----------
  // degraus: [{rot, n, sub}] em ordem; o host decide quem "chegou" a cada degrau
  function funil(chave, degraus, cfg) {
    const top = Math.max(1, degraus[0] ? degraus[0].n : 1);
    const h = degraus.map((d, i) => {
      const w = Math.max(8, Math.round((d.n / top) * 100)), ant = i ? degraus[i - 1].n : null;
      const conv = d.saida ? Math.round((d.n / top) * 100) + '% das entradas' : ant != null ? (ant ? Math.round((d.n / ant) * 100) : 0) + '% da etapa anterior' : 'entrada';
      return `<div class="vf-l${d.saida ? ' saida' : ''}"><div class="vf-rot">${esc(d.rot)}</div><div class="vf-trilho"><div class="vf-bar" style="width:${w}%"><b>${d.n}</b></div></div><div class="vf-conv">${conv}${d.sub ? ` · ${esc(d.sub)}` : ''}</div></div>`;
    }).join('');
    return `<div class="vf">${h}</div>${cfg && cfg.nota ? `<p class="vcrm-nota">${esc(cfg.nota)}</p>` : ''}`;
  }
  // degraus a partir das etapas: chegou à etapa i quem está nela ou depois (sem contar as etapas de saída, como Perdido)
  function degrausEtapas(itens, etapas, saidas) {
    const seq = etapas.filter((e) => !saidas.includes(e));
    const idx = (e) => seq.indexOf(e);
    const D = seq.map((e, i) => ({ rot: e, n: itens.filter((x) => idx(x.etapa) >= i).length }));
    saidas.forEach((s) => { const n = itens.filter((x) => x.etapa === s).length; if (n) D.push({ rot: s, n, sub: 'saíram do funil', saida: true }); });
    return D;
  }

  // ---------- Agenda ----------
  function agenda(chave, itens, cfg) {
    const h0 = hoje(), am = somaDias(h0, 1), sem = somaDias(h0, 7);
    const G = [['Vencidas', (d) => d && d < h0, 'bad'], ['Hoje', (d) => d === h0, 'warn'], ['Amanhã', (d) => d === am, ''], ['Próximos 7 dias', (d) => d && d > am && d <= sem, ''], ['Depois', (d) => d && d > sem, ''], ['Sem próxima ação', (d) => !d, 'muted']];
    const L = itens.filter((x) => !cfg.so || cfg.so(x));
    const blocos = G.map(([rot, f, c]) => {
      const X = L.filter((x) => f(x.data_prox || '')).sort((a, b) => String(a.data_prox || '').localeCompare(String(b.data_prox || '')));
      if (!X.length) return '';
      return `<div class="va-g ${c}"><div class="va-cab">${rot} <b>${X.length}</b></div>${X.slice(0, 60).map((x) => `<div class="va-i"><span class="va-d">${x.data_prox ? dtc(x.data_prox) : '—'}</span>${x.abre ? `<button type="button" class="vk-nome" ${x.abre}>${esc(x.nome)}</button>` : `<b class="vk-nome">${esc(x.nome)}</b>`}${x.pills ? `<span class="va-p">${x.pills}</span>` : ''}<span class="va-t">${esc(x.prox || '')}${x.etapa ? ` · ${esc(x.etapa)}` : ''}${x.quem ? ` · ${esc(x.quem)}` : ''}</span></div>`).join('')}${X.length > 60 ? `<div class="vk-vazio">e mais ${X.length - 60}</div>` : ''}</div>`;
    }).join('');
    return blocos ? `<div class="va">${blocos}</div>` : `<p class="vcrm-nota">${esc(cfg.vazio || 'Nenhuma próxima ação marcada.')}</p>`;
  }

  // ---------- montagem: as visões ligadas, na ordem fixa ----------
  function montar(chave, prefs, partes) {
    const a = ativas(chave, prefs);
    return seletor(chave, prefs) + VISOES.filter(([k]) => a.includes(k) && partes[k]).map(([k, t]) => {
      const corpo = typeof partes[k] === 'function' ? partes[k]() : partes[k];
      return `<section class="vcrm-v" data-vcrm-v="${k}">${a.length > 1 ? `<h3 class="vcrm-h">${t}</h3>` : ''}${corpo}</section>`;
    }).join('');
  }

  // ---------- motivo da perda (janela própria: prompt() não funciona em todo lugar) ----------
  function pedeMotivo(motivos) {
    return new Promise((ok) => {
      const d = document.createElement('div'); d.className = 'vcrm-modal';
      d.innerHTML = `<div class="vcrm-caixa" role="dialog" aria-modal="true" aria-label="Motivo da perda"><b>Motivo da perda</b><select id="vcrmMot"><option value="">Escolha</option>${motivos.map((m) => `<option>${esc(m)}</option>`).join('')}</select><div class="vcrm-bts"><button type="button" class="vcrm-b" data-x="0">Cancelar</button><button type="button" class="vcrm-b p" data-x="1">Mover para Perdido</button></div></div>`;
      document.body.appendChild(d);
      const fim = (v) => { d.remove(); ok(v); };
      d.addEventListener('click', (e) => { const b = e.target.closest('[data-x]'); if (e.target === d) return fim(null); if (!b) return; if (b.dataset.x === '0') return fim(null); const v = d.querySelector('#vcrmMot').value; if (!v) { d.querySelector('#vcrmMot').focus(); return; } fim(v); });
      d.querySelector('#vcrmMot').focus();
    });
  }

  // ---------- eventos ----------
  let arrastando = null;
  function instalar(h) {
    H = Object.assign(H, h || {});
    if (window.__vcrmOk) return; window.__vcrmOk = true;
    document.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('[data-vcrm-tog],[data-vp-etapa]'); if (!t) return;
      if (t.dataset.vcrmTog) { const [c, v] = t.dataset.vcrmTog.split('|'); if (H.mudou) H.mudou(c, v); return; }
      if (t.dataset.vpEtapa) { const [c, et] = t.dataset.vpEtapa.split('|'); if (H.etapa) H.etapa(c, et); }
    });
    document.addEventListener('change', (e) => {
      const s = e.target.closest && e.target.closest('[data-vk-mover]'); if (!s || !s.value) return;
      const [c, id] = s.dataset.vkMover.split('|'); const et = s.value; s.value = ''; if (H.mover) H.mover(c, id, et);
    });
    // ---------- arrastar: mouse e toque pelo mesmo gesto (pointer events) ----------
    // 05/11/2026 (pedido do Cleiton): o mouse deixou o arrastar nativo do navegador, que dentro do claude.ai abria a área de
    // soltar arquivos do app por cima da página. Mouse: começa ao mover mais de 6 px com o botão apertado; toque: segurar ~0,4 s.
    const ESPERA = 400, FOLGA = 10, FOLGA_MOUSE = 6, BORDA = 56, PARTIDA = 24;
    let tq = null, suprime = 0;
    window.addEventListener('click', (e) => { if (Date.now() < suprime) { e.preventDefault(); e.stopPropagation(); suprime = 0; } }, true);
    document.addEventListener('touchmove', (e) => { if (tq && tq.ativo && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('contextmenu', (e) => { if (tq) e.preventDefault(); }, true);
    document.addEventListener('selectstart', (e) => { if (tq) e.preventDefault(); }, true);
    document.addEventListener('dragstart', (e) => { if (tq || (e.target.closest && e.target.closest('[data-vk-drag]'))) { e.preventDefault(); e.stopPropagation(); } }, true); // nada de arrastar nativo dentro do cartão
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tq) fimToque(false); }, true);
    window.addEventListener('blur', () => { if (tq) fimToque(false); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && tq) fimToque(false); });
    document.addEventListener('pointerdown', (e) => {
      if (e.isPrimary === false) return;
      const mouse = e.pointerType === 'mouse'; if (mouse && e.button !== 0) return;
      const c = e.target.closest && e.target.closest('[data-vk-drag]'); if (!c || e.target.closest('select,label,input,textarea,a')) return;
      if (tq) fimToque(false);
      const de = c.closest('[data-vk-col]'), r = c.getBoundingClientRect();
      tq = { c, mouse, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, dx: mouse ? e.clientX - r.left : r.width / 2, dy: mouse ? e.clientY - r.top : r.height * 0.6, ativo: false, col: null, vk: c.closest('.vk'), de: de ? de.dataset.vkCol : '' };
      if (!mouse) { c.classList.add('vk-segura'); tq.t = setTimeout(ativaToque, ESPERA); }
      document.addEventListener('pointermove', moveToque, true);
      document.addEventListener('pointerup', soltaToque, true);
      document.addEventListener('pointercancel', cancelaToque, true);
    }, true);
    function ativaToque() {
      if (!tq || tq.ativo) return; tq.ativo = true; clearTimeout(tq.t);
      const c = tq.c; c.classList.remove('vk-segura'); c.classList.add('arrastando'); document.documentElement.classList.add('vk-agarrando'); if (tq.vk) tq.vk.classList.add('vk-solto');
      try { const s = window.getSelection && window.getSelection(); if (s) s.removeAllRanges(); } catch (er) {}
      if (tq.mouse) { try { c.setPointerCapture(tq.id); } catch (er) {} }
      const f = c.cloneNode(true); f.classList.remove('arrastando'); f.classList.add('vk-fantasma'); f.removeAttribute('data-vk-drag'); f.setAttribute('aria-hidden', 'true');
      f.querySelectorAll('.vk-mv,[id]').forEach((x) => (x.classList.contains('vk-mv') ? x.remove() : x.removeAttribute('id')));
      f.style.width = c.offsetWidth + 'px'; document.body.appendChild(f); tq.f = f; posToque(); achaCol();
      if (!tq.mouse) { try { if (navigator.vibrate) navigator.vibrate(12); } catch (er) {} }
      const passo = () => { if (!tq || !tq.ativo) return; rolaToque(); tq.raf = requestAnimationFrame(passo); }; tq.raf = requestAnimationFrame(passo);
    }
    function posToque() { if (tq && tq.f) { tq.f.style.left = (tq.x - tq.dx) + 'px'; tq.f.style.top = (tq.y - tq.dy) + 'px'; } }
    function achaCol() {
      const el = document.elementFromPoint(tq.x, tq.y), col = el && el.closest && el.closest('[data-vk-col]');
      const ok = col && !col.dataset.vkFixa && col.dataset.vkCol.split('|')[0] === tq.c.dataset.vkDrag.split('|')[0] ? col : null;
      if (ok !== tq.col) { if (tq.col) tq.col.classList.remove('vk-sobre'); if (ok) ok.classList.add('vk-sobre'); tq.col = ok; }
    }
    function rolaToque() {
      // rolagem só depois que o cartão saiu do lugar, mais rápida quanto mais perto da borda (no máximo 8 px por quadro)
      if (Math.hypot(tq.x - tq.x0, tq.y - tq.y0) < PARTIDA) return;
      const vel = (d) => Math.ceil(8 * Math.min(1, (BORDA - d) / BORDA));
      let mexeu = false;
      if (tq.vk) { const r = tq.vk.getBoundingClientRect(), a = tq.vk.scrollLeft; if (tq.x < r.left + BORDA) tq.vk.scrollLeft -= vel(tq.x - r.left); else if (tq.x > r.right - BORDA) tq.vk.scrollLeft += vel(r.right - tq.x); mexeu = tq.vk.scrollLeft !== a; }
      if (tq.y < BORDA) { window.scrollBy(0, -vel(tq.y)); mexeu = true; } else if (tq.y > window.innerHeight - BORDA) { window.scrollBy(0, vel(window.innerHeight - tq.y)); mexeu = true; }
      if (mexeu) achaCol();
    }
    function moveToque(e) {
      if (!tq || e.pointerId !== tq.id) return; tq.x = e.clientX; tq.y = e.clientY;
      if (!tq.ativo) {
        const d = Math.hypot(tq.x - tq.x0, tq.y - tq.y0);
        if (tq.mouse) { if (d > FOLGA_MOUSE) ativaToque(); else return; }
        else { if (d > FOLGA) fimToque(false); return; } // no toque, mexer antes do tempo é rolar a página
      }
      if (e.cancelable) e.preventDefault(); posToque(); achaCol();
    }
    function soltaToque(e) { if (!tq || e.pointerId !== tq.id) return; fimToque(tq.ativo); }
    function cancelaToque(e) { if (!tq || e.pointerId !== tq.id) return; fimToque(false); }
    function fimToque(soltar) {
      const t = tq; tq = null; if (!t) return; clearTimeout(t.t); if (t.raf) cancelAnimationFrame(t.raf);
      document.removeEventListener('pointermove', moveToque, true); document.removeEventListener('pointerup', soltaToque, true); document.removeEventListener('pointercancel', cancelaToque, true);
      if (t.mouse) { try { t.c.releasePointerCapture(t.id); } catch (er) {} }
      t.c.classList.remove('vk-segura', 'arrastando'); document.documentElement.classList.remove('vk-agarrando'); if (t.vk) t.vk.classList.remove('vk-solto'); if (t.f) t.f.remove(); if (t.col) t.col.classList.remove('vk-sobre');
      if (!t.ativo) return; suprime = Date.now() + 500;
      if (!soltar || !t.col || t.col.dataset.vkCol === t.de) return;
      const [c, id] = t.c.dataset.vkDrag.split('|'), [c2, et] = t.col.dataset.vkCol.split('|');
      if (c === c2 && H.mover) H.mover(c, id, et);
    }
  }

  // ---------- estilo (usa as cores de cada página: --panel, --line, --ink, --muted, --soft, --brass, --bad, --warn) ----------
  const css = `
.vcrm-sel{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0 12px}
.vcrm-r{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.vcrm-chips{display:flex;gap:6px;flex-wrap:wrap;flex:1 1 auto;min-width:0}
.vcrm-b{border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:999px;padding:5px 12px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer}
.vcrm-b[aria-pressed="true"]{background:var(--ink);color:var(--panel);border-color:var(--ink)}
.vcrm-b.p{background:var(--ink);color:var(--panel);border-color:var(--ink)}
.vcrm-v{margin:0 0 22px;min-width:0;max-width:100%;overflow:hidden}.vcrm-sel{min-width:0;max-width:100%}.vcrm-h{font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--brass);margin:0 0 10px;padding:7px 12px;background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--brass);border-radius:6px}
.vcrm-nota{font-size:12px;color:var(--muted);margin:6px 0 0}
.vk{max-width:100%;display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}
.vk-col{flex:0 0 250px;max-width:82vw;background:var(--soft);border:1px solid var(--line);border-radius:8px;display:flex;flex-direction:column;max-height:70vh;scroll-snap-align:start}
.vk-col.vk-sobre{outline:2px dashed var(--brass);outline-offset:-2px} /* não usar 'sobre': colide com a gaveta .sobre (fixed, inset 0) */
.vk-cab{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)}
.vk-cab b{color:var(--ink);font-size:13px}
.vk-lista{overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px}
.vk-card{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:8px 10px;font-size:13px;display:flex;flex-direction:column;gap:3px}
.vk-card[data-vk-drag]{cursor:grab;-webkit-touch-callout:none}.vk-card.arrastando{opacity:.45}
.vk-card.vk-segura{transition:transform .38s ease-out;transform:scale(.97)}
.vk-fantasma{position:fixed;z-index:1000;pointer-events:none;margin:0;transform:rotate(2deg);border-color:var(--brass);box-shadow:0 8px 22px rgba(0,0,0,.28);opacity:.95;box-sizing:border-box}
.vk.vk-solto{scroll-snap-type:none}
html.vk-agarrando,html.vk-agarrando *{cursor:grabbing!important}
@media (hover:none){.vk-card[data-vk-drag]{-webkit-user-select:none;user-select:none}}
@media (prefers-reduced-motion:reduce){.vk-card.vk-segura{transition:none}}
.vk-card.alerta{border-left:3px solid var(--bad)}
.vk-l1{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.vk-nome{all:unset;cursor:pointer;font-weight:600;color:var(--ink);overflow-wrap:anywhere}.vk-nome:hover{text-decoration:underline}.vk-nome:focus-visible{outline:2px solid var(--brass)}
.vk-s{font-size:12px;color:var(--muted);overflow-wrap:anywhere}.vk-s.venc{color:var(--bad)}.vk-marca{color:var(--brass)}
.vk-mv{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);margin-top:4px}
.vk-mv select{flex:1;min-width:0;font:inherit;font-size:12px;padding:3px 4px;border:1px solid var(--line);border-radius:4px;background:var(--panel);color:var(--ink)}
.vk-vazio{font-size:12px;color:var(--muted);text-align:center;padding:6px}
.vp{display:flex;flex-direction:column;gap:6px}
.vp-l{all:unset;box-sizing:border-box;display:grid;grid-template-columns:140px minmax(80px,1fr) 90px;grid-template-areas:"e bar n" "d d a";gap:4px 10px;align-items:center;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);cursor:pointer;font-size:13px}
.vp-l:hover:not([disabled]){border-color:var(--brass)}.vp-l[disabled]{opacity:.5;cursor:default}.vp-l:focus-visible{outline:2px solid var(--brass)}
.vp-e{grid-area:e;font-weight:600}.vp-bar{grid-area:bar;height:10px;background:var(--soft);border-radius:5px;overflow:hidden}.vp-bar i{display:block;height:100%;background:var(--brass);border-radius:5px}
.vp-n{grid-area:n;text-align:right;color:var(--muted)}.vp-n b{color:var(--ink)}.vp-d{grid-area:d;font-size:12px;color:var(--muted)}.vp-a{grid-area:a;text-align:right;display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;min-width:0}
.vf{display:flex;flex-direction:column;gap:6px}
.vf-l{display:grid;grid-template-columns:130px 1fr;grid-template-areas:"rot trilho" ". conv";gap:2px 10px;align-items:center}
.vf-rot{grid-area:rot;font-size:13px;font-weight:600}.vf-trilho{grid-area:trilho;display:flex;justify-content:center}
.vf-bar{background:var(--ink);color:var(--panel);border-radius:4px;padding:5px 8px;text-align:center;font-size:13px;min-width:34px;box-sizing:border-box}
.vf-l.saida{margin-top:6px;padding-top:6px;border-top:1px dashed var(--line)}.vf-l.saida .vf-bar{background:var(--muted)}
.vf-conv{grid-area:conv;font-size:12px;color:var(--muted);text-align:center}
.va{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.va-g{border:1px solid var(--line);border-radius:8px;background:var(--panel);padding:8px 10px}
.va-g.bad{border-color:var(--bad)}.va-g.warn{border-color:var(--warn)}
.va-cab{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px}.va-g.bad .va-cab{color:var(--bad)}.va-g.warn .va-cab{color:var(--warn)}.va-cab b{color:var(--ink)}
.va-i{display:grid;grid-template-columns:44px 1fr;gap:0 8px;padding:4px 0;border-top:1px solid var(--line);font-size:13px}.va-i:first-of-type{border-top:0}
.va-d{color:var(--muted);font-size:12px;grid-row:span 3}.va-p{grid-column:2;display:flex;gap:4px;flex-wrap:wrap;margin:2px 0}.va-t{font-size:12px;color:var(--muted);grid-column:2}
.vcrm-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.vcrm-caixa{background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px;width:min(360px,100%)}
.vcrm-caixa select{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink)}
.vcrm-bts{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
@media (max-width:640px){.vp-a{justify-content:flex-start}.vp-l{grid-template-columns:1fr 70px;grid-template-areas:"e n" "bar bar" "d d" "a a"}.vp-a{text-align:left}.vf-l{grid-template-columns:96px 1fr}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  window.VisoesCRM = { VISOES, ativas, alternar, seletor, kanban, pipeline, funil, degrausEtapas, agenda, montar, pedeMotivo, instalar };
})();

} catch (e) { setTimeout(function () { throw e; }); }
/* ===== visoes-crm:fim ===== */

/* ===== painel:inicio ===== */
try {

(() => {
'use strict';
// ---------- Tema ----------
const raiz = document.documentElement;
const lerTema = () => { try { return localStorage.getItem('painel.tema'); } catch (e) { return null; } };
const gravarTema = (t) => { try { localStorage.setItem('painel.tema', t); } catch (e) {} };
const temaAtual = () => raiz.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const aplicarTema = (t) => { if (t) raiz.dataset.theme = t; document.getElementById('btnTema').textContent = temaAtual() === 'dark' ? '☀ Claro' : '☾ Escuro'; };
aplicarTema(lerTema());
document.getElementById('btnTema').addEventListener('click', () => { const t = temaAtual() === 'dark' ? 'light' : 'dark'; gravarTema(t); aplicarTema(t); });

// ---------- Utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (v) => (v == null || v === '' || isNaN(v)) ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: Number(v) % 1 ? 2 : 0 });
const num = (v, d = 0) => (v == null || v === '') ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: d });
const hojeISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const dt = (s) => { if (!s) return '—'; const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] + ':' + m[5] : ''}` : esc(s); };
const dias = (a, b) => Math.round((new Date(b.slice(0, 10) + 'T12:00') - new Date(a.slice(0, 10) + 'T12:00')) / 864e5);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const digitos = (s) => String(s || '').replace(/\D/g, '');
// Valor pontuado (Nicolas, 26/10/2026): 1.250.000 enquanto digita; grava só o número. Aceita centavos depois da vírgula.
const numVlr = (s) => { if (s == null || s === '') return null; if (typeof s === 'number') return isFinite(s) ? s : null;
  const t = String(s).trim(); if (!/\d/.test(t)) return null; const [i, d] = t.split(','); const n = Number((i || '').replace(/\D/g, '') + (d != null ? '.' + d.replace(/\D/g, '').slice(0, 2) : '')); return isFinite(n) ? n : null; };
const fmtVlr = (v) => { const n = numVlr(v); if (n == null) return ''; const [i, d] = String(Math.round(n * 100) / 100).split('.'); return Number(i).toLocaleString('pt-BR') + (d ? ',' + d : ''); };
const VLR = 'type="text" inputmode="decimal" autocomplete="off" data-vlr data-sens';
const fone = (s) => { const d = digitos(s); if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return s || '—'; };
const agora = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 19); }; // hora local (antes: UTC), igual ao HUB: o espelho compara as datas
const toast = (t) => { const el = document.getElementById('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { el.hidden = true; }, 3200); };

/* ---------- Busca ampla de cada aba (26/10/2026, mesmo padrão do HUB) ----------
   Vários termos separados por vírgula; a lista mostra quem atende a pelo menos um, primeiro quem atende mais.
   CPF, CNPJ, telefone e CEP com ou sem pontos · e-mail · "2 dorm", "1 suíte", "2 vagas" (número exato) ·
   valores ("1,5 mi", "800 mil", "R$ 950.000" = 20% para mais e para menos) · o resto é texto (nome, bairro, rua, ref., item). */
const BA = (() => {
  const semAc = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const soDig = (s) => String(s || '').replace(/\D/g, '');
  const numBR = (s) => { s = String(s); if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return +s.replace(/\./g, '').replace(',', '.'); return +s.replace(',', '.'); };
  const brl0 = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const NUM = [['dorm', /(\d+)\s*(?:dormitorios?|dormes?|dorms?|quartos?|qtos?|dts?)(?![a-z])/g, (n) => n + ' dorm.'], ['suites', /(\d+)\s*suites?(?![a-z])/g, (n) => n + (n == 1 ? ' suíte' : ' suítes')],
    ['banh', /(\d+)\s*(?:banheiros?|banhs?|bwc|wc)(?![a-z])/g, (n) => n + ' banh.'], ['vagas', /(\d+)\s*vagas?(?![a-z])/g, (n) => n + (n == 1 ? ' vaga' : ' vagas')]];
  const CONECT = new Set('e com de do da dos das no na nos nas em ou ate r$ reais imovel imoveis valor'.split(' '));
  const valor = (v) => { const f = (n) => n >= 1e6 ? 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : brl0(n); return { tipo: 'valor', v, min: v * 0.8, max: v * 1.2, rot: f(v) + ' ± 20%' }; };
  function termos0(q) { const out = [];
    String(q || '').split(/[;\n]|,(?!\d)|(?<!\d),|\.(?!\d)|(?<!\d)\./).forEach((parte) => { let t = semAc(parte).replace(/\s+/g, ' ').trim(); if (!t) return;
      NUM.forEach(([campo, re, rot]) => { t = t.replace(re, (m, n) => { out.push({ tipo: 'num', campo, n: +n, rot: rot(+n) }); return ' '; }); });
      t = t.replace(/(\d+(?:[.,]\d+)?)\s*(?:milhoes|milhao|mi|mm)(?![a-z])(?:\s*e\s*(\d{1,3})(?:\s*mil)?(?![a-z\d]))?/g, (m, a, b) => { out.push(valor(numBR(a) * 1e6 + (b ? +b * 1e3 : 0))); return ' '; });
      t = t.replace(/(\d+(?:[.,]\d+)?)\s*(?:mil|k)(?![a-z])/g, (m, a) => { out.push(valor(numBR(a) * 1e3)); return ' '; });
      t = t.replace(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{5,}(?:,\d{1,2})?)(?![\d.,])/g, (m, a) => { const v = numBR(a); if (v >= 10000) { out.push(valor(v)); return ' '; } return m; });
      const w = t.split(' ').filter(Boolean); while (w.length && CONECT.has(w[0])) w.shift(); while (w.length && CONECT.has(w[w.length - 1])) w.pop();
      const s = w.join(' '); if (s.length >= 2) out.push({ tipo: 'txt', s, rot: s }); });
    return out; }
  function termos(q) { const out = [];
    String(q || '').split(/[;\n]|,(?!\d)|(?<!\d),/).forEach((parte) => { let p = parte;
      p = p.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*/g, (m) => { out.push({ tipo: 'mail', e: m.toLowerCase(), rot: m }); return ' '; });
      p = p.replace(/(?:\+?55\s?)?\(?\d[\d.\-\/()\s]{3,}\d/g, (m) => { const d = soDig(m), fmt = /[-\/()]/.test(m), pontos = /\./.test(m);
        if (d.length >= 10 || (d.length >= 8 && (fmt || !pontos)) || (d.length >= 5 && fmt && !/^\d{1,3}(\.\d{3})+$/.test(m.trim()))) { out.push({ tipo: 'doc', d, rot: m.trim() }); return ' '; } return m; });
      if (p.trim()) termos0(p).forEach((t) => out.push(t)); });
    const vis = new Set(); return out.filter((x) => { const k = JSON.stringify([x.tipo, x.campo, x.n, x.v, x.s, x.d, x.e]); if (vis.has(k)) return false; vis.add(k); return true; }); }
  const valoresTxt = (txt) => { const out = []; String(txt || '').replace(/R\$\s*([\d.]+(?:,\d+)?)|(\d+(?:,\d+)?)\s*(mi|mil)\b|(?<![\d.,])(\d{1,3}(?:\.\d{3})+(?:,\d+)?)(?![\d.,])/gi, (m, a, b, u, c) => { const v = a ? numBR(a) : b ? numBR(b) * (u.toLowerCase() === 'mi' ? 1e6 : 1e3) : numBR(c); if (v > 0) out.push(v); return m; }); return out; };
  const REN = { dorm: 'dorm|quarto', suites: 'su[ií]te', banh: 'banh', vagas: 'vaga' };
  // x = {txt, nums:{dorm,suites,banh,vagas}, valores:[...], docs:[...]}
  function atende(T, x) { const h = new Set(); let tn = null;
    T.forEach((t, i) => {
      if (t.tipo === 'doc') { const ds = (x.docs || []).map(soDig).filter(Boolean); if (ds.some((d) => d.includes(t.d)) || (t.d.length >= 4 && (String(x.txt || '').match(/\d[\d.\-\/()]*\d|\d/g) || []).some((r) => soDig(r).includes(t.d)))) h.add(i); return; }
      if (t.tipo === 'mail') { if (String(x.txt || '').toLowerCase().includes(t.e)) h.add(i); return; }
      if (tn == null) tn = semAc(x.txt);
      if (t.tipo === 'txt') { if (tn.includes(t.s)) h.add(i); return; }
      if (t.tipo === 'num') { const v = (x.nums || {})[t.campo]; if (v != null && v !== '') { if (+v === t.n) h.add(i); return; } if (new RegExp('(^|\\D)' + t.n + '\\s*(?:' + REN[t.campo] + ')', 'i').test(tn)) h.add(i); return; }
      const vs = (x.valores || []).filter((v) => +v > 0); (vs.length ? vs : valoresTxt(x.txt)).some((v) => +v >= t.min && +v <= t.max) && h.add(i); });
    return h; }
  // filtra e ordena: devolve {lista, T, n}
  function filtra(lista, q, para) { const T = termos(q); if (!T.length) return { lista, T, ativo: false };
    const r = []; lista.forEach((it, k) => { const h = atende(T, para(it)); if (h.size) r.push({ it, n: h.size, k }); });
    r.sort((a, b) => b.n - a.n || a.k - b.k); return { lista: r.map((x) => Object.assign({}, x.it, { _ba: T.length > 1 || T.some((t) => t.tipo !== 'txt') ? `atende ${x.n} de ${T.length}` : '' })), T, ativo: true, total: lista.length }; }
  return { termos, atende, filtra, semAc, soDig };
})();

/* ---------- Oportunidades: motor comum do HUB e dos painéis dos corretores (26/10/2026) ----------
   Decisões do Cleiton (26/10/2026): modo híbrido — o cruzamento perfil × imóveis roda na hora, sem custo; o botão "Pedir à IA"
   lê campanha, imóvel de interesse e histórico, sugere o perfil (o corretor confirma) e escolhe as ofertas com justificativa.
   Base de imóveis: anúncios ativos do site + empreendimentos + agenciamentos fora do site (inativos no Imobibrasil, com aviso
   "confirmar disponibilidade"). Ofertar = mensagem pronta + registro no histórico do lead; Descartar some da lista.
   Perfil usado = automático (campanha → empreendimento; imóvel de interesse) < sugerido pela IA < confirmado pelo corretor. */
const OP = (() => {
  const sem = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const limpa = (s) => sem(s).replace(/[^a-z0-9]+/g, ' ').trim();
  const num = (v) => { if (v == null || v === '') return null; const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) && n > 0 ? n : null; };
  const FAMILIA = { apartamento: 'apto', cobertura: 'apto', studio: 'apto', estudio: 'apto', loft: 'apto', garden: 'apto', duplex: 'apto', flat: 'apto', kitnet: 'apto',
    casa: 'casa', sobrado: 'casa', 'casa geminada': 'casa', geminada: 'casa', 'casa em condominio': 'casa', terreno: 'terreno', lote: 'terreno', comercial: 'comercial', sala: 'comercial', loja: 'comercial', galpao: 'comercial', pousada: 'comercial' };
  const familia = (t) => { const s = limpa(t); if (!s) return ''; if (FAMILIA[s]) return FAMILIA[s]; const k = Object.keys(FAMILIA).find((x) => s.includes(x)); return k ? FAMILIA[k] : s; };
  const TIPO_REF = { AP: 'Apartamento', CA: 'Casa', CO: 'Cobertura', LF: 'Loft', ST: 'Studio', TE: 'Terreno', GE: 'Casa Geminada', LJ: 'Comercial', SL: 'Comercial' };
  const tipoDeRef = (ref) => TIPO_REF[String(ref || '').slice(0, 2).toUpperCase()] || '';
  const finN = (f) => { const s = sem(f); return /temp/.test(s) ? 'Temporada' : /loc|alug/.test(s) ? 'Locação' : /vend|compr/.test(s) || s === 'v' ? 'Venda' : ''; };
  const bairros = (b) => (Array.isArray(b) ? b : String(b || '').split(/[,;/]| e (?=[A-Z])/)).map((x) => String(x).trim()).filter(Boolean);
  const mesmoBairro = (a, b) => { const x = limpa(a), y = limpa(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
  const dormDe = (txt) => { const ns = []; sem(txt).replace(/(\d)(?:\s*(?:e|a|,)\s*\d)*\s*(?:dorm|quarto|suite|qto)/g, (m, a) => { ns.push(+a); return m; }); return ns.length ? Math.min(...ns) : null; };
  const areaDe = (txt) => { const m = sem(txt).match(/(\d{2,4})\s*(?:a|–|-|até)\s*(\d{2,4})\s*m/); return m ? [+m[1], +m[2]] : null; };
  const vagasDe = (txt) => { const m = sem(txt).match(/(\d)\s*vaga/); return m ? +m[1] : null; };

  /* contexto: itens = [{id, ref, fin, tipo, bairro, cidade, end, valor, dorm, suites, vagas, area, cond, link, gmaps, lat, lng, cor, atu, origem:'site'|'fora'|'emp', emp, nome, tipologias, status, entrega}] */
  function contexto(vitrine, fora, emps) {
    const empDe = new Map(), porId = new Map(), E = [];
    (emps || []).forEach((e) => { (e.anuncios || []).forEach((a) => empDe.set(typeof a === 'string' ? a : a.id, e.id)); E.push(e); });
    const itens = [];
    (vitrine || []).forEach((v) => itens.push(Object.assign({}, v, { origem: 'site', emp: empDe.get(v.id) || null })));
    const noSite = new Set(itens.map((x) => x.id));
    (fora || []).forEach((v) => { if (!noSite.has(v.id)) itens.push(Object.assign({}, v, { origem: 'fora', emp: empDe.get(v.id) || null })); });
    E.forEach((e) => { if (!['lancamento', 'previsto'].includes(e.status)) return;
      itens.push({ id: 'E:' + e.id, ref: e.nome, nome: e.nome, fin: 'Venda', tipo: 'Empreendimento', bairro: e.bairro, cidade: e.cidade, end: e.endereco, tipologias: e.tipologias, status: e.status, entrega: e.entrega,
        link: e.site || e.link || null, origem: 'emp', emp: e.id, dorm: null, valor: null }); });
    itens.forEach((x) => porId.set(x.id, x));
    const empPorId = new Map(E.map((e) => [e.id, e]));
    const empDaCampanha = (camp) => { const c = limpa(camp); if (!c) return null;
      for (const e of E) { if ((e.campanhas || []).some((k) => limpa(k.campanha || k) === c)) return e; }
      for (const e of E) { const n = limpa(e.nome).split(' ').filter((w) => w.length >= 4 && !['residencial', 'jurere', 'beach', 'home', 'boutique', 'condominio', 'edificio'].includes(w));
        if (n.some((w) => c.split(' ').includes(w))) return e; }
      return null; };
    return { itens, porId, empPorId, empDaCampanha };
  }

  /* lead normalizado: {nome, campanha, imovel_interesse, perfil, perfil_sugerido, historico, etapa} */
  function perfilAuto(lead, ctx) {
    const p = { fontes: [] };
    const ref = String(lead.imovel_interesse || '').toUpperCase().split(/[,\s]+/).filter(Boolean)[0];
    if (ref) { const it = ctx.itens.find((x) => String(x.ref || '').toUpperCase() === ref || String(x.id || '').toUpperCase().startsWith(ref + '_'));
      if (it) { p.fin = it.fin; p.tipo = it.tipo !== 'Empreendimento' ? it.tipo : ''; p.bairros = [it.bairro].filter(Boolean); if (it.valor) { p.vmin = Math.round(it.valor * 0.75); p.vmax = Math.round(it.valor * 1.25); }
        if (it.dorm) p.dorm = it.dorm; if (it.emp) p.emp = it.emp; p.fontes.push('imóvel de interesse ' + (it.ref || ref)); } }
    const e = ctx.empDaCampanha(lead.campanha);
    if (e) { p.emp = p.emp || e.id; if (!p.bairros || !p.bairros.length) p.bairros = [e.bairro].filter(Boolean); p.fin = p.fin || 'Venda';
      const an = (e.anuncios || []).map((a) => (typeof a === 'string' ? ctx.porId.get(a) : a)).filter(Boolean);
      const vals = an.filter((a) => finN(a.fin) !== 'Locação' && finN(a.fin) !== 'Temporada').map((a) => +a.valor).filter((v) => v >= 50000).sort((a, b) => a - b);
      const q = (f) => vals[Math.min(vals.length - 1, Math.max(0, Math.round((vals.length - 1) * f)))];
      if (!p.vmax && vals.length) { p.vmin = Math.round(q(0.25) * 0.8); p.vmax = Math.round(q(0.75) * 1.25); }
      const ar = areaDe(e.tipologias); if (ar) { p.amin = ar[0]; p.amax = ar[1]; } else { const m1 = sem(e.tipologias).match(/~?\s*(\d{2,4})\s*m(?:2|²|\b)/); if (m1) { p.amin = Math.round(+m1[1] * 0.85); p.amax = Math.round(+m1[1] * 1.15); } }
      if (!p.tipo && e.tipologias) { const tt = sem(e.tipologias); const ach = [['casa', 'Casa'], ['apart', 'Apartamento'], ['studio', 'Studio'], ['loft', 'Loft'], ['terreno', 'Terreno'], ['lote', 'Terreno']].filter(([k]) => tt.includes(k)); if (ach.length === 1) p.tipo = ach[0][1]; }
      if (!p.tipo) { const ts = [...new Set(an.map((a) => a.tipo || tipoDeRef(a.ref)).filter(Boolean))]; if (ts.length === 1) p.tipo = ts[0]; }
      if (!p.dorm) p.dorm = dormDe(e.tipologias);
      p.fontes.push('campanha ' + (lead.campanha || '') + ' → ' + e.nome); }
    return p.fontes.length ? p : null;
  }
  function deFormulario(f) { if (!f) return null; const o = {};
    const fin = finN(f.finalidade || f.fin); if (fin) o.fin = fin; if (f.tipo) o.tipo = f.tipo; const b = bairros(f.bairros); if (b.length) o.bairros = b;
    const vmin = num(f.vmin), vmax = num(f.vmax); if (vmin) o.vmin = vmin; if (vmax) o.vmax = vmax;
    const d = num(f.dorm) || dormDe(f.obs), g = num(f.vagas) || vagasDe(f.obs); if (d) o.dorm = d; if (g) o.vagas = g; if (f.obs) o.obs = f.obs;
    return Object.keys(o).length ? o : null; }
  // perfil efetivo: automático < sugerido pela IA < confirmado (campo a campo)
  function perfilDo(lead, ctx) {
    const auto = perfilAuto(lead, ctx), ia = deFormulario(lead.perfil_sugerido), conf = deFormulario(lead.perfil);
    if (!auto && !ia && !conf) return null;
    const p = Object.assign({}, auto || {}, ia || {}, conf || {});
    p.origem = conf ? 'confirmado' : ia ? 'ia' : 'auto'; p.fontes = (auto && auto.fontes) || []; p.emp = (auto && auto.emp) || null;
    return p;
  }
  function descrevePerfil(p, semFin) { if (!p) return ''; const brl = (v) => v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : 'R$ ' + Math.round(v / 1e3) + ' mil';
    return [semFin ? '' : p.fin, p.tipo, (p.bairros || []).join(', '), p.vmin && p.vmax ? brl(p.vmin) + ' a ' + brl(p.vmax) : p.vmax ? 'até ' + brl(p.vmax) : p.vmin ? 'a partir de ' + brl(p.vmin) : '', p.dorm ? p.dorm + '+ dorm.' : '', p.vagas ? p.vagas + '+ vagas' : ''].filter(Boolean).join(' · '); }

  /* casa o perfil com a base; devolve [{it, pts, motivos, alerta}] em ordem. opt: {max, excluir:Set(ids), relaxa} */
  function casar(p, ctx, opt) {
    opt = opt || {}; if (!p) return [];
    const fam = familia(p.tipo), B = p.bairros || [], excl = opt.excluir || new Set(), out = [];
    const passo = (relaxaBairro) => { const r = [];
      for (const it of ctx.itens) {
        if (excl.has(it.id)) continue; const m = []; let pts = 0;
        if (p.fin && it.fin && finN(it.fin) !== p.fin) continue;
        if (p.fin) m.push(p.fin);
        if (it.origem === 'emp') { if (p.fin && p.fin !== 'Venda') continue; }
        else if (fam) { const f2 = familia(it.tipo); if (f2 && f2 !== fam) continue; if (f2 === fam) { pts += 2; m.push(it.tipo); } }
        const mesmoEmp = p.emp && it.emp === p.emp;
        const bOk = B.length ? B.some((b) => mesmoBairro(b, it.bairro)) : false;
        if (B.length && !bOk && !mesmoEmp && !relaxaBairro) continue;
        if (bOk) { pts += 3; m.push(it.bairro); } else if (B.length && !mesmoEmp) { pts -= 1; m.push('outro bairro: ' + (it.bairro || '?')); }
        if (mesmoEmp) { pts += 2; m.push('mesmo empreendimento'); }
        const v = +it.valor || null;
        const fo = +opt.folga || 0; // folga ±20% nos captados (decisão do Cleiton, 01/11/2026); sem folga, regra antiga
        if (v) { if (p.vmax && v > p.vmax * (fo ? 1 + fo : 1.1)) continue; if (p.vmin && v < p.vmin * (fo ? 1 - fo : 0.7)) continue; if (p.vmax || p.vmin) { pts += 2; m.push('dentro do valor'); } }
        if (p.dorm) { if (it.dorm != null && it.dorm < p.dorm) continue; if (it.dorm >= p.dorm) { pts += 1; m.push(it.dorm + ' dorm.'); } else if (it.origem === 'emp' && dormDe(it.tipologias) >= p.dorm) { pts += 1; m.push('tipologia com ' + p.dorm + '+ dorm.'); } }
        if (p.vagas) { if (it.vagas != null && it.vagas < p.vagas) continue; if (it.vagas >= p.vagas) { pts += 1; m.push(it.vagas + ' vagas'); } }
        if (p.amin && p.amax && +it.area) { if (it.area >= p.amin * (fo ? 1 - fo : 0.8) && it.area <= p.amax * (fo ? 1 + fo : 1.25)) { pts += 2; m.push(Math.round(it.area) + ' m²'); } else if (fo) continue; else pts -= 1; }
        let alerta = '';
        if (it.origem === 'site') pts += 1;
        else if (it.origem === 'fora') { pts -= 3; alerta = 'fora do site: confirmar disponibilidade com o agenciador'; }
        else alerta = (it.status === 'previsto' ? 'previsto' : 'lançamento') + (it.entrega ? ', entrega ' + it.entrega : '') + ': confirmar tabela com a construtora';
        r.push({ it, pts, motivos: [...new Set(m)], alerta });
      }
      return r; };
    let r = passo(false); if (r.length < 3 && B.length && opt.relaxa !== false) { const ja = new Set(r.map((x) => x.it.id)); passo(true).forEach((x) => { if (!ja.has(x.it.id)) r.push(x); }); }
    const alvo = p.vmin && p.vmax ? (p.vmin + p.vmax) / 2 : p.vmax || p.vmin || null;
    r.sort((a, b) => b.pts - a.pts || (alvo ? Math.abs((+a.it.valor || alvo * 3) - alvo) - Math.abs((+b.it.valor || alvo * 3) - alvo) : 0) || String(b.it.atu || '').localeCompare(String(a.it.atu || '')));
    return r.slice(0, opt.max || 8);
  }

  const compacto = (it) => { const o = { id: it.id, ref: it.ref, origem: it.origem, fin: it.fin, tipo: it.tipo, bairro: it.bairro };
    ['valor', 'dorm', 'suites', 'vagas', 'area', 'tipologias', 'entrega', 'status', 'nome'].forEach((k) => { if (it[k] != null && it[k] !== '') o[k] = it[k]; });
    if (it.comodos) o.itens = [].concat(it.comodos || [], it.cond_itens || []).slice(0, 8); return o; };
  function promptIA(lead, ctx, hoje) {
    const p = perfilDo(lead, ctx) || {};
    const c1 = casar(p, ctx, { max: 25 }), c2 = casar(Object.assign({}, p, { bairros: [] }), ctx, { max: 25 }), c3 = ctx.itens.filter((x) => x.origem === 'emp').slice(0, 20).map((it) => ({ it }));
    const vis = new Set(), cands = [];
    [...c1, ...c2, ...c3].forEach((x) => { if (!vis.has(x.it.id) && cands.length < 50) { vis.add(x.it.id); cands.push(compacto(x.it)); } });
    if (cands.length < 15) ctx.itens.filter((x) => x.origem === 'site').sort((a, b) => String(b.atu || '').localeCompare(String(a.atu || ''))).forEach((it) => { if (!vis.has(it.id) && cands.length < 40) { vis.add(it.id); cands.push(compacto(it)); } });
    const hist = (lead.historico || []).slice(-12).map((h) => `${String(h.em || '').slice(0, 10)} ${h.tipo || ''}: ${h.texto || ''}`);
    const e = ctx.empDaCampanha(lead.campanha);
    return `Você é o assistente comercial da Vivere Imóveis Selecionados (Florianópolis/SC). Hoje é ${hoje}.
Tarefa: descobrir o perfil de compra ou locação deste cliente e escolher, SÓ entre os imóveis da lista, até 6 que façam sentido oferecer agora.
Regras:
- Use o que o cliente disse no histórico, a campanha pela qual chegou e o imóvel de interesse. Não invente.
- Campanha de um empreendimento indica a região, o padrão e a faixa de preço que atraíram o cliente.
- "origem": "site" = anúncio ativo; "fora" = agenciamento fora do site (avise para confirmar disponibilidade); "emp" = empreendimento em lançamento (sem preço na lista).
- Prefira imóveis no mesmo bairro ou em bairros vizinhos de perfil parecido, na faixa de valor e com o número de dormitórios pedido.
- Motivo de cada oferta: 1 frase curta, em português, dizendo por que combina (sem repetir o endereço).
- Perfil: finalidade (Venda, Locação ou Temporada), tipo, bairros separados por vírgula, valores em reais como números inteiros, dormitórios e vagas mínimos; null no que não der para deduzir.
Responda só com JSON neste formato:
{"perfil":{"finalidade":null,"tipo":null,"bairros":null,"vmin":null,"vmax":null,"dorm":null,"vagas":null,"obs":null},"ofertas":[{"id":"<id da lista>","motivo":"..."}],"comentario":"1 frase para o corretor sobre a abordagem"}

Cliente: ${JSON.stringify({ nome: String(lead.nome || '').split(' ')[0], campanha: lead.campanha || null, empreendimento_da_campanha: e ? { nome: e.nome, bairro: e.bairro, tipologias: e.tipologias || null, status: e.status } : null, imovel_interesse: lead.imovel_interesse || null, etapa: lead.etapa || null, perfil_atual: deFormulario(lead.perfil), historico: hist })}

Imóveis disponíveis (JSON): ${JSON.stringify(cands)}`;
  }
  function validaIA(r, ctx) { const of = ((r && r.ofertas) || []).filter((o) => o && ctx.porId.has(o.id)).slice(0, 6).map((o) => ({ id: o.id, motivo: String(o.motivo || '').slice(0, 220) }));
    const pf = (r && r.perfil) || {}; const perfil = {};
    if (pf.finalidade) perfil.finalidade = finN(pf.finalidade) || String(pf.finalidade); if (pf.tipo) perfil.tipo = String(pf.tipo);
    if (pf.bairros) perfil.bairros = Array.isArray(pf.bairros) ? pf.bairros.join(', ') : String(pf.bairros);
    ['vmin', 'vmax', 'dorm', 'vagas'].forEach((k) => { const n = num(pf[k]); if (n) perfil[k] = n; }); if (pf.obs) perfil.obs = String(pf.obs).slice(0, 200);
    return { perfil, ofertas: of, comentario: String((r && r.comentario) || '').slice(0, 300) }; }
  function mensagem(lead, it, corretor) {
    const nome = String(lead.nome || '').split(' ')[0] || '';
    const valor = it.valor ? (+it.valor >= 1e6 ? 'R$ ' + (+it.valor / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' milhões' : (+it.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })) : '';
    const fatos = [it.dorm ? it.dorm + (it.dorm > 1 ? ' dormitórios' : ' dormitório') + (it.suites ? ` (${it.suites} suíte${it.suites > 1 ? 's' : ''})` : '') : '', it.vagas ? it.vagas + (it.vagas > 1 ? ' vagas' : ' vaga') : '', it.area ? Math.round(it.area) + ' m²' : ''].filter(Boolean).join(', ');
    const oque = it.origem === 'emp' ? `o ${it.nome}, em ${it.bairro}${it.tipologias ? ` (${it.tipologias})` : ''}` : `${/^[aeiou]/i.test(it.tipo || '') ? 'um' : 'uma'} ${String(it.tipo || 'imóvel').toLowerCase()} em ${it.bairro}${fatos ? ', ' + fatos : ''}${valor ? ', por ' + valor : ''}`;
    return `Olá${nome ? ', ' + nome : ''}! Aqui é ${corretor || 'a equipe'}, da Vivere Imóveis. Separei ${oque}, que combina com o que você procura.${it.link && it.origem !== 'fora' ? ' Veja: ' + it.link : ''} Quer que eu agende uma visita ou envie mais detalhes?`.replace(/\s+/g, ' ').trim();
  }
  return { sem, contexto, perfilAuto, perfilDo, deFormulario, descrevePerfil, casar, promptIA, validaIA, mensagem, finN, familia, tipoDeRef, mesmoBairro };
})();

const ETAPAS = ['Novo', 'Contato feito', 'Qualificado', 'Visita agendada', 'Visita feita', 'Proposta', 'Negociação', 'Fechado', 'Perdido'];
const ABERTAS = new Set(ETAPAS.slice(0, 7));
const MOTIVOS = ['Sem retorno', 'Sem perfil/orçamento', 'Comprou/alugou com outro', 'Desistiu', 'Contato inválido', 'Duplicado', 'Corretor anunciante', 'Outro'];
const TIPOS_HIST = ['Ligação', 'WhatsApp', 'Visita', 'E-mail', 'Proposta', 'Observação'];
const INICIO_CRM = '2026-10-18';

// ---------- Estado ----------
const S = {
  aba: 'inicio', leads: {}, meus: {}, vitrine: [], sol: {}, info: {}, prontos: new Set(), capt: {},
  opLado: 'procura', opTem: 'com', opTemOrd: { k: 'n', d: -1 }, opTemMais: false,
  sort: {}, filtroEtapa: 'abertos', filtroInt: '', buscaLead: '', pagVit: 0,
  fv: { fin: '', tipo: '', bairro: '', dorm: '', vagas: '', vmin: '', vmax: '', m2min: '', m2max: '' },
  q: {}, catalogo: {}, opFiltro: 'ofertas', opStatus: {}, opMais: {}, opOrd: null, opPg: 0, opAb: '', opFl: null,
  aberto: null, semPermissao: false, dbEstado: 'carregando', decisoes: {}, ehDono: false, assets: null, ia: null, novo: null, prazos: {}, eventos: {}, iaImagens: null, proposta: null,
  empDocs: {}, empSub: 'emps', empFicha: 'geral', fe: { sit: 'lancamento', cons: '', bairro: '', disp: false, mat: false, revEmp: '' }, pmEmp: false, pmFinOff: {}, pmSitOff: {},
};
try { const a = sessionStorage.getItem('painel.aba'); if (a) S.aba = a; } catch (e) {}
let db = null;
// ---------- Painel do gestor (05/11/2026) ----------
// Só vale com config/painel {papel:"gestor"} no banco do próprio artefato; nos painéis dos corretores nada muda.
S.gestor = false; S.G = {}; S.verComo = (() => { try { return sessionStorage.getItem('painel.ver') || 'todos'; } catch (e) { return 'todos'; } })();
const SO_LEITURA = 'Painel do gestor: só leitura. As mudanças se fazem no painel do corretor.';
// ---------- Ordem das abas de cada pessoa (26/10/2026) ----------
// Guardada no banco em data/users/<id>/preferencias (vale no celular e no computador da mesma pessoa);
// a cópia no aparelho só serve para o painel já abrir na ordem dela. Nunca mexer no objeto lido do banco (vem congelado).
const ORD_LS = 'painel.ordemAbas';
S.ordemAbas = (() => { try { const v = JSON.parse(localStorage.getItem(ORD_LS) || 'null'); return Array.isArray(v) ? v : null; } catch (e) { return null; } })();
S.prefs = {}; S.uid = null;
const ordLocal = (v) => { try { if (v) localStorage.setItem(ORD_LS, JSON.stringify(v)); else localStorage.removeItem(ORD_LS); } catch (e) {} };
function guardarOrdemAbas(ordem) {
  const pad = ABAS.map((a) => a[0]), fin = ordem ? ReordAbas.ordena(pad, ordem) : pad;
  const v = ReordAbas.igual(fin, pad) ? null : fin;
  S.ordemAbas = v; ordLocal(v); render();
  const naConta = !!(db && S.uid);
  if (naConta) db.doc(`data/users/${S.uid}/preferencias`).set({ ...S.prefs, abas: v, atualizado_em: agora() }).catch(() => toast('Não consegui guardar a ordem na sua conta: por enquanto ela vale só neste aparelho.'));
  ReordAbas.aviso(v ? (naConta ? 'Ordem das abas salva (vale no celular e no computador).' : 'Ordem das abas salva neste aparelho.') : 'Abas de volta à ordem padrão.', v ? () => guardarOrdemAbas(null) : null);
}

// ---------- Foto de capa (Nicolas, 26/10/2026) ----------
// Mesma capa do site, em miniatura guardada no banco do painel (coleção `fotos`, docs f0..fN {i: {<id>: data URI}}): a página
// publicada não carrega imagem de fora. Imóvel inativo: capa antiga do site ou 1ª foto enviada pelo corretor, sempre com o aviso.
let CAPAS = { d: null, m: {} };
function capaSrc(id) {
  if (CAPAS.d !== S.fotosDocs) { const m = {}; Object.values(S.fotosDocs || {}).forEach((d) => Object.assign(m, d.i || {})); CAPAS = { d: S.fotosDocs, m }; }
  if (CAPAS.m[id]) return CAPAS.m[id];
  const sols = Object.entries(S.sol || {}).filter(([sid, s]) => s.imovel_id === id && (s.fotos || []).length && !/cancelada|recusada/.test(statusDe(sid, s) || ''))
    .sort((a, b) => String(b[1].criado_em || b[1].enviado_em || '').localeCompare(String(a[1].criado_em || a[1].enviado_em || '')));
  return sols.length ? '/_blob/' + sols[0][1].fotos[0].id : null;
}
function capaHtml(id, x, cls) {
  const src = capaSrc(id), inativo = x && x.ativo === false;
  const lk = x && x.link && !inativo && x.origem !== 'emp' && x.origem !== 'fora' ? x.link : '';
  const tag = lk ? `a href="${esc(lk)}" target="_blank" rel="noopener" title="Abrir o anúncio no site"` : 'div';
  return `<${tag} class="capa${cls ? ' ' + cls : ''}">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : `<span class="sem">${S.prontos.has('fotosDocs') || inativo ? 'sem foto' : '…'}</span>`}${inativo ? '<span class="inat" title="Imóvel inativo: não está no site nem disponível ao público">Inativo · fora do site</span>' : ''}</${lk ? 'a' : 'div'}>`;
}

// ---------- Tabela ordenável (cabeçalho no computador, "ordenar por" no celular) ----------
function tabela(chave, cols, linhas, opt = {}) {
  const st = S.sort[chave] || opt.padrao || { c: cols[0].k, d: 1 };
  S.sort[chave] = st;
  const col = cols.find((c) => c.k === st.c) || cols.find((c) => c.ords && c.ords.some((o) => o[0] === st.c)) || cols[0];
  const val = (r) => { const v = col.ords ? r[st.c] : col.v ? col.v(r) : r[col.k]; return v == null || v === '' ? null : v; };
  const ord = [...linhas].sort((a, b) => {
    const x = val(a), y = val(b);
    if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * st.d;
    return String(x).localeCompare(String(y), 'pt-BR', { numeric: true }) * st.d;
  });
  const pag = opt.pag || 0, ini = (opt.pagina || 0) * pag;
  const vis = pag ? ord.slice(ini, ini + pag) : ord;
  const seta = (c) => c.k === st.c ? (st.d > 0 ? ' ▲' : ' ▼') : ' ↕';
  const ordenaveis = cols.filter((c) => c.ord !== false).flatMap((c) => (c.ords ? c.ords.map(([k, l]) => ({ k, l })) : [c]));
  const thOrd = (c) => c.ords ? c.ords.map(([k, l]) => `<button type="button" data-ord="${chave}|${k}" ${k === st.c ? 'data-ativo' : ''}>${esc(l)}${seta({ k })}</button>`).join('<br>') : `<button type="button" data-ord="${chave}|${c.k}" ${c.k === st.c ? 'data-ativo' : ''}>${esc(c.l)}${seta(c)}</button>`;
  let h = `<div class="ordenar-movel"><span>Ordenar por</span>${ordenaveis.map((c) => `<button type="button" data-ord="${chave}|${c.k}" ${c.k === st.c ? 'data-ativo' : ''}>${esc(c.l)}${seta(c)}</button>`).join('')}</div>`;
  h += `<div class="tabela cartoes-m${opt.cartao ? ' tem-cm' : ''}"><table><thead><tr>${cols.map((c) => `<th${c.n ? ' class="num"' : ''}>${c.ord === false ? `<span class="mut peq">${esc(c.l)}</span>` : thOrd(c)}</th>`).join('')}</tr></thead><tbody>`;
  if (!vis.length) h += `<tr><td colspan="${cols.length}" class="vazio">${esc(opt.vazio || 'Nada para mostrar.')}</td></tr>`;
  for (const r of vis) h += `<tr${opt.abre ? ` data-abre="${esc(opt.abre(r))}"` : ''}>${cols.map((c) => `<td data-l="${esc(c.l)}"${c.n ? ' class="num"' : ''}><span class="cel">${c.h ? c.h(r) : esc(r[c.k] ?? '—')}</span></td>`).join('')}</tr>`;
  h += '</tbody></table></div>';
  if (opt.cartao) h += `<div class="lista-m">${vis.length ? vis.map((r) => `<div class="cm"${opt.abre ? ` data-abre="${esc(opt.abre(r))}" role="button" tabindex="0"` : ''}>${opt.cartao(r)}</div>`).join('') : `<div class="vazio">${esc(opt.vazio || 'Nada para mostrar.')}</div>`}</div>`;
  if (pag && ord.length > pag) {
    const tot = Math.ceil(ord.length / pag), p = opt.pagina || 0;
    h += `<div class="pag"><span class="mut peq">${ini + 1}–${Math.min(ini + pag, ord.length)} de ${ord.length}</span><button class="b" type="button" data-pag="${chave}|-1" ${p === 0 ? 'disabled' : ''} aria-label="Página anterior">‹</button><button class="b" type="button" data-pag="${chave}|1" ${p >= tot - 1 ? 'disabled' : ''} aria-label="Próxima página">›</button></div>`;
  }
  return h;
}

// ---------- Regras dos leads ----------
const histDe = (l) => Array.isArray(l.historico) ? l.historico : [];
const ultimoReg = (l) => { const h = histDe(l).map((x) => x.em).filter(Boolean).sort(); return h.length ? h[h.length - 1] : null; };
function avisosDe(id, l) {
  const out = [], hoje = hojeISO(), et = l.etapa || 'Novo', ult = ultimoReg(l);
  const pz = PZ();
  if (et === 'Novo' && !ult && l.entrada && l.entrada >= INICIO_CRM && (Date.now() - new Date(l.entrada + 'T12:00')) > pz.primeiro_contato_h * 36e5) out.push({ p: 'alta', t: 'Primeiro contato atrasado', o: 'Fazer o primeiro contato e registrar' });
  if (ABERTAS.has(et) && l.data_prox && l.data_prox < hoje) out.push({ p: 'alta', t: 'Próxima ação vencida', o: `${l.prox_acao || 'Ação'} era para ${dt(l.data_prox)}` });
  if (ABERTAS.has(et) && l.data_prox === hoje) out.push({ p: 'media', t: 'Ação para hoje', o: l.prox_acao || 'Ação marcada para hoje' });
  if (ABERTAS.has(et) && !l.prox_acao && !l.data_prox) out.push({ p: 'media', t: 'Sem próxima ação', o: 'Definir a próxima ação e a data' });
  if (et === 'Perdido' && !l.motivo) out.push({ p: 'media', t: 'Perdido sem motivo', o: 'Informar o motivo da perda' });
  const base = ult ? ult.slice(0, 10) : (l.entrada && l.entrada > INICIO_CRM ? l.entrada : INICIO_CRM);
  const d = dias(base, hoje);
  if (/Proposta|Negociação/.test(et) && d >= pz.proposta_retorno_dias && !(l.data_prox && l.data_prox >= hoje)) out.push({ p: 'alta', t: 'Retorno da proposta', o: `${d} dias sem registro (prazo de ${pz.proposta_retorno_dias})` });
  else if (ABERTAS.has(et) && ult && d >= pz.lead_parado_dias) out.push({ p: 'media', t: 'Lead parado', o: `${d} dias sem registro (prazo de ${pz.lead_parado_dias})` });
  if (d >= pz.recontato_dias && !out.some((a) => a.t === 'Lead parado' || a.t === 'Retorno da proposta')) out.push({ p: 'baixa', t: 'Recontato', o: `${d} dias sem registro` });
  return out.map((a) => ({ ...a, id, nome: l.nome }));
}
const todosAvisos = () => Object.entries(S.leads).flatMap(([id, l]) => avisosDe(id, l)).concat(avisosAgenc()).sort((a, b) => ({ alta: 0, media: 1, baixa: 2 }[a.p] - { alta: 0, media: 1, baixa: 2 }[b.p]));
// ---------- Oportunidades (26/10/2026): motor comum com o HUB ----------
let OPC = { v: null, c: null, m: null, ctx: null };
function ctxOp() {
  if (OPC.v === S.vitrine && OPC.c === S.catalogo && OPC.m === S.meus && OPC.ctx) return OPC.ctx;
  const cat = S.catalogo || {}, fora = [], emps = [];
  Object.entries(cat).forEach(([k, d]) => { if (k.startsWith('fora')) fora.push(...(d.itens || [])); if (k.startsWith('emp')) emps.push(...(d.itens || [])); });
  Object.entries(S.meus).forEach(([id, m]) => { if (!m.ativo) fora.push({ ...m, id }); });
  const cx = OP.contexto(S.vitrine, fora, emps);
  cx.itens = cx.itens.filter((x) => x.origem === 'site');   // Nicolas (26/10/2026): só anúncios ativos no site; porId segue completo para o histórico
  OPC = { v: S.vitrine, c: S.catalogo, m: S.meus, ctx: cx };
  return OPC.ctx;
}
const leadN = (id, l) => ({ id, nome: l.nome, telefone: l.telefone, campanha: l.campanha, imovel_interesse: l.imovel_interesse, perfil: l.perfil, perfil_sugerido: l.perfil_sugerido, historico: histDe(l), etapa: l.etapa || 'Novo', oport: l.oport || {}, captacao: l.captacao || null });
function opsDoLead(lead) {
  // proprietário (🏠 TEM) não é cliente de oferta: sem perfil de busca e sem cruzamento (o histórico cita o bairro do imóvel DELE)
  if (ladoDe(lead) === 'tem') return { p: null, ia: null, novas: [], ofertados: [], descartados: [], capt: [] };
  const ctx = ctxOp(), p = OP.perfilDo(lead, ctx), marcas = (lead.oport || {}).marcas || {}, ia = (lead.oport || {}).ia || null;
  const iaIts = ia ? (ia.ofertas || []).map((o) => { const it = ctx.porId.get(o.id); return it && it.origem === 'site' ? { it, motivos: [], ia: o.motivo, alerta: it.origem === 'fora' ? 'fora do site: confirmar disponibilidade com o agenciador' : it.origem === 'emp' ? 'lançamento: confirmar tabela com a construtora' : '' } : null; }).filter(Boolean) : [];
  const excl = new Set([...iaIts.map((x) => x.it.id), ...Object.keys(marcas).filter((k) => marcas[k].st === 'ofertado' || marcas[k].st === 'descartado'), ...(lead.imovel_interesse ? ctx.itens.filter((x) => x.ref && String(lead.imovel_interesse).toUpperCase().split(/[,\s]+/).includes(String(x.ref).toUpperCase())).map((x) => x.id) : [])]);
  const auto = p ? OP.casar(p, ctx, { max: 8, excluir: excl }) : [];
  const novas = [...iaIts.filter((x) => !(marcas[x.it.id] && /ofertado|descartado/.test(marcas[x.it.id].st))), ...auto];
  const marcadas = (st) => Object.entries(marcas).filter(([, m]) => m.st === st).map(([id, m]) => ({ id, ...m, it: ctx.porId.get(id) })).sort((a, b) => String(b.em).localeCompare(String(a.em)));
  return { p, ia, novas, ofertados: marcadas('ofertado'), descartados: marcadas('descartado'), capt: captDoPerfil(p, 6) };
}
function leadsComOfertas() { if (!S.prontos.has('vitrine')) return []; return Object.entries(S.leads).filter(([, l]) => ABERTAS.has(l.etapa || 'Novo') && ladoDe(l) !== 'tem').filter(([id, l]) => { const o = opsDoLead(leadN(id, l)); return o.novas.length || nCaptAcao(o); }); }

/* ---------- Captação em dois lados (01/11/2026, decisão do Cleiton) ----------
   🔎 PROCURA (locatário, comprador e os clientes comuns) × 🏠 TEM (locador, vendedor, operador de renda).
   A coleção `captados` (gravada pela rotina de entrega do HUB) traz o imóvel de quem TEM, captado pela Vivere e ainda NÃO AGENCIADO,
   só com o que o cruzamento precisa: sem nome, telefone, link, endereço, título nem foto do dono. situacao: livre | meu | outro.
   Ele entra no cruzamento de quem procura com o selo 🔶, sem Ofertar e sem link, e o gatilho ⚡ "Captar este imóvel primeiro" grava
   em `solicitacoes` um pedido tipo 'captacao' à diretoria (o telefone do dono só chega depois da distribuição, em Meus leads). */
const PROPRIET = new Set(['locador', 'vendedor', 'operador_renda']);
const PAPEL_CAPT = { locador: 'Locador', vendedor: 'Vendedor', operador_renda: 'Operador de renda', locatario: 'Locatário', comprador: 'Comprador' };
const SELO_NA = '🟠 A CAPTAR · captar antes de ofertar';
const capDe = (l) => (l && l.captacao) || null;
function ladoDe(l) { const c = capDe(l); return c && (c.lado === 'tem' || (!c.lado && PROPRIET.has(c.perfil))) ? 'tem' : 'procura'; }
// 02/11/2026 (decisão do Cleiton): lead com o mesmo nome de outro lead em campanha diferente ganha o selo "possível duplicata" — nada é apagado
let DUP = null, DUP_SIG = '';
function dupDe(id) { const E = Object.entries(S.leads || {}); const sig = E.length + '|' + E.map(([k, l]) => k + ':' + (l.nome || '') + ':' + (l.campanha || '')).join('|');
  if (!DUP || sig !== DUP_SIG) { DUP_SIG = sig; DUP = {}; const nm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); const G = {};
    E.forEach(([k, l]) => { const n = nm(l.nome); if (n) (G[n] = G[n] || []).push([k, String(l.campanha || '').trim()]); });
    Object.values(G).forEach((g) => { if (g.length > 1 && new Set(g.map((x) => x[1])).size > 1) g.forEach(([k]) => { DUP[k] = g.length; }); }); }
  return DUP[id] ? `<span class="pill media" title="Há ${DUP[id] - 1} outro${DUP[id] > 2 ? 's' : ''} lead${DUP[id] > 2 ? 's' : ''} com o mesmo nome em outra campanha. Confira antes de contatar; nada foi apagado.">possível duplicata</span>` : ''; }
function pillLado(l) { const c = capDe(l); if (!c) return ''; const t = ladoDe(l) === 'tem'; return `<span class="pill lado-${t ? 'tem' : 'procura'}">${t ? '🏠 TEM' : '🔎 PROCURA'} · ${esc(PAPEL_CAPT[c.papel || c.perfil] || 'Captação')}</span>`; }

/* Interesse do lead (07/11/2026, pedido do Cleiton; nomes curtos escolhidos por ele no mesmo dia): o que o lead está fazendo com o corretor, em todas as visões de Meus leads.
   Campo `interesse` no lead (uma das chaves de INTERESSES). Lead sem o campo: derivado da captação (papel e finalidade) ou da
   finalidade do perfil; o que não fechar fica "A definir". A derivação só mostra: o campo só é gravado quando o corretor salva
   o lead ou pela carga da diretoria. No aluguel, anual ou temporada é obrigatório. */
const INTERESSES = [
  ['comprador', 'Comprador', '🔎 Comprador', 'procura'],
  ['locatario_anual', 'Locatário anual', '🔎 Locatário anual', 'procura'],
  ['locatario_temporada', 'Locatário temporada', '🔎 Locatário temporada', 'procura'],
  ['vendedor', 'Vendedor', '🏠 Vendedor', 'tem'],
  ['locador_anual', 'Locador anual', '🏠 Locador anual', 'tem'],
  ['locador_temporada', 'Locador temporada', '🏠 Locador temporada', 'tem'],
  ['a_definir', 'A definir', '❔ A definir', 'def']];
const INT_POR = Object.fromEntries(INTERESSES.map((x, i) => [x[0], { i, rot: x[1], curto: x[2], lado: x[3] }]));
const finInt = (f) => { const s = String(f || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); return /temp/.test(s) ? 'temporada' : /loc|alug|anual/.test(s) ? 'anual' : /vend|compr/.test(s) ? 'venda' : ''; };
function interesseDerivado(l, pEf) {
  const c = (l && l.captacao) || null, fp = finInt(((l && l.perfil) || {}).finalidade) || finInt(pEf && pEf.fin);
  if (c) { const p = c.papel || c.perfil, fc = finInt(c.fin || c.negocio_fin);
    if (p === 'vendedor') return 'vendedor';
    if (p === 'locador') return fc === 'temporada' ? 'locador_temporada' : fc === 'anual' ? 'locador_anual' : 'a_definir';
    if (p === 'comprador') return 'comprador';
    if (p === 'locatario') { const f = fc || fp; return f === 'temporada' ? 'locatario_temporada' : f === 'anual' ? 'locatario_anual' : 'a_definir'; } }
  return fp === 'venda' ? 'comprador' : fp === 'anual' ? 'locatario_anual' : fp === 'temporada' ? 'locatario_temporada' : 'a_definir';
}
const interesseDe = (l, pEf) => (l && INT_POR[l.interesse] ? l.interesse : interesseDerivado(l, pEf));
function pillInt(l, pEf) { const k = interesseDe(l, pEf), x = INT_POR[k]; return `<span class="pill int-${x.lado}" title="Interesse: ${esc(x.rot)}${l && INT_POR[l.interesse] ? '' : ' (deduzido do perfil; confirme no lead)'}">${esc(x.curto)}</span>`; }
const optInt = (sel) => INTERESSES.map(([k, rot]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(rot)}</option>`).join('');
(function () { const st = document.createElement('style'); st.textContent = '.pill.int-tem{background:var(--ok-bg);color:var(--ok-selo);white-space:nowrap}.pill.int-procura{background:var(--soft);color:var(--ink);white-space:nowrap}.pill.int-def{background:transparent;border:1px dashed var(--line);color:var(--muted);white-space:nowrap}.int-chips{margin:0 0 10px}'; document.head.appendChild(st); })();
let CAPTC = { d: null, ctx: null };
function ctxCapt() {
  if (CAPTC.ctx && CAPTC.d === S.capt) return CAPTC.ctx;
  const L = Object.entries(S.capt || {}).filter(([, c]) => c && c.ativo !== false && c.bairro).map(([id, c]) => ({ id: 'C:' + (c.lead || id), lead: c.lead || id, ref: 'A captar', origem: 'captado',
    fin: c.fin || '', tipo: c.tipo || '', bairro: c.bairro, valor: +c.valor || null, dorm: c.dorm != null && c.dorm !== '' ? +c.dorm : null, area: +c.area || null, papel: c.papel || '',
    lead_painel: c.lead_painel || '', estrelas: Math.max(0, Math.min(5, +c.estrelas || 0)), int_n: +c.interessados_n || 0, situacao: c.situacao || 'livre', coletado_em: c.coletado_em || '', end: endCapt(c), foto_id: /^[0-9a-f]{32}$/.test(String(c.foto_id || '')) ? String(c.foto_id) : '' }));
  CAPTC = { d: S.capt, ctx: { itens: L, porId: new Map(L.map((x) => [x.id, x])), empPorId: new Map(), empDaCampanha: () => null } };
  return CAPTC.ctx;
}
// só perfil com bairro: sem bairro, o cruzamento casaria com todos os captados. Captado sem tipo fica de fora, e comercial ou rural
// só entra para perfil que pede esse tipo (o motor deixa passar item sem família, e cliente sem tipo é residencial)
const TIPO_RES = new Set(['Apartamento', 'Casa', 'Cobertura', 'Terreno']);
const tipoServe = (p, it) => { if (!it.tipo) return false; if (TIPO_RES.has(it.tipo)) return true; const pt = String(p.tipo || '').toLowerCase(); return !!pt && pt.includes(it.tipo.toLowerCase().slice(0, 5)); };
function captDoPerfil(p, max) { if (!p || !(p.bairros || []).length || !S.prontos.has('capt')) return []; try { return OP.casar(p, ctxCapt(), { max: (max || 20) * 3, relaxa: false, folga: 0.2 }).filter((x) => tipoServe(p, x.it)).slice(0, max || 20).map((x) => Object.assign({}, x, { alerta: '' })); } catch (e) { return []; } }
const nCaptAcao = (o) => (o.capt || []).filter((x) => x.it.situacao !== 'outro').length;
function pedidoCapt(lead) { return Object.entries(S.sol || {}).find(([sid, s]) => s.tipo === 'captacao' && s.capt_id === lead && statusDe(sid, s) === 'pendente') || null; }
// aprovado no painel pela diretoria e ainda não entregue pela rodada das 7h43 (05/11/2026)
function captAprovada(lead) { return Object.entries(S.sol || {}).find(([sid, s]) => s.tipo === 'captacao' && s.capt_id === lead && statusDe(sid, s) === 'aprovada' && (S.decisoes[sid] || {}).entrega === 'pendente') || null; }
let INTC = { k: null, m: null };
// clientes deste corretor (em aberto, lado procura) que procuram um imóvel como cada captado
function interessadosCapt() {
  const k = [S.leads, S.capt, S.vitrine, S.catalogo, S.meus];
  if (INTC.m && INTC.k.every((v, i) => v === k[i])) return INTC.m;
  const m = new Map();
  Object.entries(S.leads).forEach(([id, l]) => { if (!ABERTAS.has(l.etapa || 'Novo') || ladoDe(l) === 'tem') return; const o = opsDoLead(leadN(id, l)); (o.capt || []).forEach((x) => { const a = m.get(x.it.id) || []; a.push({ id, nome: l.nome || 'Sem nome' }); m.set(x.it.id, a); }); });
  INTC = { k, m }; return m;
}
// aluguel em valor cheio (R$ 1.900), venda abreviada (R$ 1,2 mi)
const valCapt = (fin, v) => (!+v ? '' : fin === 'Locação' ? brl(+v) : curtoBRL(+v));
const descCapt = (it) => [it.fin, it.tipo, it.bairro, it.dorm ? it.dorm + ' dorm.' : '', it.area ? Math.round(it.area) + ' m²' : '', valCapt(it.fin, it.valor)].filter(Boolean).join(' · ');
// endereço do imóvel a captar (08/11/2026, fatia 3): o mesmo do A CAPTAR — empreendimento · rua, nº — unidade · CEP.
// Só chega ao painel para o imóvel que o A CAPTAR lista ou que é do próprio corretor (regra da Entrega das 7h43).
function endCapt(v) {
  if (!v) return '';
  const s = (x) => String(x || '').replace(/\s+/g, ' ').trim().slice(0, 160), c = s(v.cep).replace(/\D/g, '');
  const p = [s(v.empreendimento), s(v.rua)].filter(Boolean);
  if (c) p.push('CEP ' + (c.length === 8 ? c.slice(0, 5) + '-' + c.slice(5) : c));
  return p.join(' · ');
}
const endHtml = (e, cls) => e ? `<div class="acf-end${cls ? ' ' + cls : ''}">📍 <span data-sens>${esc(e)}</span></div>` : '';
// A CAPTAR nos painéis (08/11/2026): estado público das travas em acaptar/estado, gravado 1x por dia pela rotina.
// Chaves = id do captado neste painel. Nunca traz nome, telefone ou link do proprietário (esses ficam no A CAPTAR, só a quem travou).
const ACAP_URL = 'https://claude.ai/artifact/5EWiW6wzYfgrbjh4vKW6fh';
const acapUrl = () => 'index.html?aba=acaptar';
const acapTrava = (lead) => { const x = ((S.acap || {}).travas || {})[lead]; return x && x.uid ? x : null; };
const acapNaBase = (lead) => !!(((S.acap || {}).base || {})[lead]);
const acapNoCaptei = (lead) => !!(((S.acap || {}).captei || {})[lead]);
// 08/11/2026 (Cleiton): "por você" é do DONO do painel (ou do corretor do "Ver como"), não de quem está olhando —
// o diretor que abre o painel de outro não vê as travas dele como se fossem do corretor.
const acapPn = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(/\s+/)[0].replace(/(.)\1+/g, '$1') || '';   // Kamily = Kamilly, Nicolas = Nicollas
const acapDono = () => { if (S.gestor && S.verComo && S.verComo !== 'todos') return { slug: S.verComo, nome: gCurto(S.verComo) }; const i = S.info || {}; return { slug: i.slug || '', nome: i.saudacao || i.corretor || '' }; };
const acapEhMinha = (x) => { if (!x) return false; const d = acapDono(); if (x.chave && d.slug) return x.chave === d.slug || (!!x.nome && acapPn(x.nome) === acapPn(d.nome)); if (x.nome && d.nome) return acapPn(x.nome) === acapPn(d.nome); return !!S.uid && x.uid === S.uid; };
const acapDaFoto = () => { const v = Object.values((S.G || {}).acapg || {}).filter((x) => x && x.travas); return v.length ? v.reduce((a, x) => ({ ...a, ...x, travas: { ...(a.travas || {}), ...x.travas } }), {}) : null; };
const acapNi = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
const acapDoSlug = (slug) => { const tv = ((S.acap || {}).travas) || {}, nm = acapPn(gCurto(slug)), rep = gPaineis().filter((p) => acapPn(gCurto(p.slug)) === nm).length > 1, ni = acapNi(gNome(slug)); return Object.values(tv).filter((x) => x && x.uid && (x.chave ? x.chave === slug : (!!x.nome && (rep ? acapNi(x.nome) === ni : acapPn(x.nome) === nm)))).length; }; /* trocas-f5j */
const acapMinhas = () => !S.acap ? [] : Object.entries(S.acap.travas || {}).filter(([, x]) => x && x.uid && acapEhMinha(x)).map(([lead, x]) => ({ ...x, lead }));
const acapVolta = () => { try { sessionStorage.setItem('painel.volta', location.pathname.split('/').pop() + location.search); } catch (e) {} };
const linkAcap = (rot, cls) => `<a class="${cls || 'b'}" href="${esc(acapUrl())}" data-acapvai>${rot}</a>`;
const linkAcapCod = (lead, rot, cls) => { const c = acapCod(lead); return `<a class="${cls || 'b'}" href="${esc(c ? 'index.html?cod=' + c : acapUrl())}" data-acapvai>${rot}</a>`; };
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-acapvai]')) acapVolta(); }, true);
const fotoCapt = (it) => it.foto_id ? `<img class="acap-foto" src="${esc('/_blob/' + it.foto_id)}" alt="Foto do imóvel" loading="lazy">` : '';
function blocoAcapMinhas() {
  const M = acapMinhas(); if (!M.length) return '';
  const C = ctxCapt().porId;
  return `<div class="painel acap-minhas"><h3 style="margin:0 0 6px">🎯 Em captação por mim (${M.length})</h3>${M.map((x) => { const c = C.get('C:' + x.lead) || {}; const desc = [c.tipo || x.tipo, c.bairro || x.bairro, c.fin || x.fin].filter(Boolean).join(' · ') || 'Imóvel'; const val = +(c.valor || x.valor) || 0;
    return `<div class="acap-l">${fotoCapt(c)}<div><b>${esc(desc)}</b>${val ? ` · <span data-sens>${esc(brl(val))}</span>` : ''}${endHtml(c.end || endCapt(x))}<div class="peq mut">desde ${x.desde ? esc(dt(x.desde)) : '—'}${x.vence ? ' · trava até ' + esc(dt(x.vence)) : ''}</div></div></div>`; }).join('')}
    <div class="linha" style="margin-top:8px">${linkAcap('Abrir Minhas captações no A CAPTAR', 'b p')}</div><p class="peq mut" style="margin:6px 0 0">Nome, telefone e link do anúncio ficam no A CAPTAR, só para você. A trava vence em 7 dias sem contato registrado lá.</p></div>`;
}
(function () { const st = document.createElement('style'); st.textContent = '.acf-lista{container-type:inline-size;display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:10px}.op-tem.acf{display:grid;gap:8px 14px;grid-template-columns:minmax(0,1fr);grid-template-areas:\'foto\' \'tit\' \'end\' \'campos\' \'int\' \'acoes\';align-items:start}.acf>.acf-foto{grid-area:foto}.acf>.acf-tit{grid-area:tit}.acf>.acf-campos{grid-area:campos}.acf>.acf-end{grid-area:end}.acf>.acf-int{grid-area:int}.acf>.acoes{grid-area:acoes;margin:0}.acf-foto{display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;aspect-ratio:16/9;border-radius:8px;background:var(--soft);border:1px solid var(--line);overflow:hidden;font-size:26px;text-align:center}.acf-foto .peq{font-size:11px;line-height:1.2;padding:0 6px}.acf-foto.sem{aspect-ratio:auto;flex-direction:row;gap:6px;padding:6px 8px;font-size:18px;justify-content:flex-start}.acf-foto img{width:100%;height:100%;object-fit:cover;display:block}.acf-tit{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;min-width:0}.acf-end{flex-basis:100%;min-width:0;font-size:13px;line-height:1.35;color:var(--muted);overflow-wrap:anywhere}.op-capt .acf-end,.op-perfil .acf-end,.acap-l .acf-end{margin-top:2px}.acf-campos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 12px;font-size:14px}.acf-campos>div{min-width:0;overflow-wrap:break-word}.acf-campos .r{display:block;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}.acf .acoes .b{width:100%;justify-content:center}@container (min-width:560px){.op-tem.acf{grid-template-columns:160px minmax(0,1fr);grid-template-areas:\'foto tit\' \'foto end\' \'foto campos\' \'int int\' \'acoes acoes\'}.acf-foto,.acf-foto.sem{aspect-ratio:4/3;flex-direction:column;justify-content:center;font-size:26px}.acf .acoes .b{width:auto}}@container (min-width:980px){.op-tem.acf{grid-template-columns:112px minmax(190px,1.1fr) minmax(0,3fr) minmax(220px,.9fr);grid-template-areas:\'foto tit campos acoes\' \'foto end end acoes\' \'foto int int acoes\';align-items:center;padding:10px 14px}.acf-campos{grid-template-columns:repeat(5,minmax(min-content,1fr)) minmax(0,1.7fr)}.acf>.acoes{justify-content:flex-end;flex-direction:column;align-items:flex-end}}.acap-foto{display:block;width:100%;max-height:180px;object-fit:cover;border-radius:8px;margin:6px 0;border:1px solid var(--line)}.acap-minhas{border-left:4px solid var(--brass,var(--accent))}.acap-l{display:grid;grid-template-columns:minmax(0,1fr);gap:4px;padding:6px 0;border-top:1px solid var(--line)}.acap-l .acap-foto{max-height:120px}@media(min-width:561px){.acap-l{grid-template-columns:140px minmax(0,1fr);align-items:center}.acap-l:not(:has(img)){grid-template-columns:minmax(0,1fr)}}'; document.head.appendChild(st); })();
function acaoCapt(it, cliId) {
  if (it.situacao === 'meu') return it.lead_painel && S.leads[it.lead_painel] ? `<button class="b p" type="button" data-lead="${esc(it.lead_painel)}">Abrir o proprietário</button><span class="peq mut">distribuído a você</span>` : '<span class="peq mut">Distribuído a você: o proprietário entra em Meus leads na próxima entrega.</span>';
  if (it.situacao === 'outro') return '<span class="peq mut">Outro corretor da Vivere já está captando este imóvel. Não oferte.</span>';
  const ped = pedidoCapt(it.lead);
  if (ped) return `<span class="pill media">⚡ Captação pedida em ${dt(ped[1].enviado_em || ped[1].criado_em)} · aguardando a diretoria</span>`;
  if (captAprovada(it.lead)) return '<span class="pill ok">⚡ Captação aprovada · o proprietário chega em Meus leads na entrega das 7h43</span>';
  const tv = acapTrava(it.lead);
  if (tv) return acapEhMinha(tv) ? `<span class="pill ok">🎯 Em captação por você${tv.vence ? ' · até ' + esc(dt(tv.vence)) : ''}</span>${linkAcapCod(it.lead, 'Abrir a captação')}` : `<span class="peq mut">🎯 Em captação por ${esc(tv.nome || 'outro corretor')}. Não oferte.</span>`;
  if (acapNaBase(it.lead)) return linkAcapCod(it.lead, '🎯 Captar', 'b p');
  if (acapNoCaptei(it.lead)) return linkAcapCod(it.lead, '🎯 Pedir o Captei (1 Capcoin)', 'b p');
  return `<button class="b p" type="button" data-captpede="${esc(it.lead)}|${esc(cliId || '')}">⚡ Captar este imóvel primeiro</button>`;
}
// imóvel captado no cruzamento de quem procura: selo, sem Ofertar, sem link do anúncio de terceiro
function htmlCapt(leadId, x) {
  const it = x.it, fat = [it.dorm ? it.dorm + ' dorm.' : '', it.area ? Math.round(it.area) + ' m²' : ''].filter(Boolean).join(' · ');
  const quem = it.situacao === 'meu' ? 'distribuído a você' : it.situacao === 'outro' ? 'com outro corretor' : 'ainda sem corretor';
  return `<div class="op-capt"><div class="selo-na">${SELO_NA}</div>
    <div class="l1"><b>${esc(it.tipo || 'Imóvel')} · ${esc(it.bairro || '')}</b><span class="peq mut">${esc(it.fin || '')}${fat ? ' · ' + esc(fat) : ''}</span><span class="v">${valCapt(it.fin, it.valor) || '—'}</span></div>${endHtml(it.end)}
    ${x.motivos && x.motivos.length ? `<div class="chips2">${x.motivos.map((m) => `<span>${esc(m)}</span>`).join('')}</div>` : ''}
    <div class="gatilho">⚡ Proprietário anuncia direto (${quem}). Capte este imóvel primeiro: não oferte antes de agenciar.</div>
    <div class="acoes">${acaoCapt(it, leadId)}</div></div>`;
}
// ficha do proprietário (lead 🏠 TEM distribuído a este corretor): imóvel que tem e quem procura um imóvel assim
function fichaTem(id, l) {
  const c = capDe(l) || {}, it = ctxCapt().itens.find((x) => x.lead_painel === id) || null, ints = it ? (interessadosCapt().get(it.id) || []) : [], n = Math.max(ints.length, +c.interessados_n || 0);
  return `<div class="op-perfil" style="margin-top:8px"><div><b>Imóvel que tem:</b> ${esc((it ? descCapt(it) : '') || c.imovel_tem || c.imovel || '—')}</div>${it ? endHtml(it.end) : ''}<div class="selo-na">${SELO_NA}</div>
    <div class="peq">Capte antes de ofertar: agenciado, o imóvel entra no site e nas Ofertas dos clientes.</div></div>
    ${n ? `<div class="op-int" style="margin-top:8px"><b>👥 ${n} cliente${n === 1 ? ' procura' : 's procuram'} um imóvel assim</b>${ints.map((y) => `<button class="copiar" type="button" data-lead="${esc(y.id)}">${esc(y.nome)}</button>`).join('')}${n > ints.length ? `<span class="mut peq">${ints.length ? 'e ' + (n - ints.length) + ' de outros corretores' : 'clientes de toda a Vivere'}: o roteiro da 1ª mensagem já cita.</span>` : ''}</div>` : '<p class="mut peq" style="margin:8px 0 0">Nenhum cliente com perfil parecido agora.</p>'}`;
}
const LEG_OP = '<div class="op-leg"><div><b>🔎 Compradores e locatários</b>: cada cliente com os imóveis que combinam com o que ele procura. <b>🏠 Vendedores e locadores</b>: cada imóvel não captado com os clientes que procuram um assim.</div><div><span class="selo-cap">🟢 PAUTA</span> imóvel nosso (site, lançamento ou agenciamento): pode ofertar. <span class="selo-nao">🟠 A CAPTAR</span> proprietário anuncia direto: capte antes de ofertar.</div></div>';
function ladosOp() {
  const nProc = Object.values(S.leads).filter((l) => ladoDe(l) !== 'tem' && ABERTAS.has(l.etapa || 'Novo')).length, nTem = ctxCapt().itens.length;
  return `<div class="chips op-lados" role="group" aria-label="Lado"><button type="button" data-oplado="procura" aria-pressed="${S.opLado !== 'tem'}">🔎 Compradores e locatários<span class="op-l2">&nbsp;→ imóveis para oferecer</span>&nbsp;(${nProc})</button><button type="button" data-oplado="tem" aria-pressed="${S.opLado === 'tem'}">🏠 Vendedores e locadores<span class="op-l2">&nbsp;→ clientes interessados</span>&nbsp;(${nTem})</button></div>`;
}
// subaba "Para quem tem": imóveis captados com os clientes deste corretor que procuram um imóvel assim (a ★ sobe)
function vOportTem() {
  const I = interessadosCapt(), est = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const L0 = ctxCapt().itens.map((it) => { const ints = I.get(it.id) || [], n = Math.max(ints.length, it.situacao === 'meu' ? it.int_n : 0); return { id: it.id, it, ints, n, ef: Math.min(5, it.estrelas + (n >= 3 ? 2 : n ? 1 : 0)) }; });
  const busca = !!qDe(), nCom = L0.filter((x) => x.n).length;
  const fO = BA.filtra(L0, qDe(), (x) => ({ txt: [x.it.fin, x.it.tipo, x.it.bairro, x.it.end, PAPEL_CAPT[x.it.papel], ...x.ints.map((y) => y.nome)].filter(Boolean).join(' · '), docs: [], valores: [x.it.valor], nums: { dorm: x.it.dorm } }));
  qInfo(fO, 'imóveis não captados');
  let L = busca ? fO.lista : S.opTem === 'todos' ? L0 : L0.filter((x) => x.n);
  const ORD = { n: ['Interessados', (x) => x.n], ef: ['★', (x) => x.ef], valor: ['Valor', (x) => +x.it.valor || null], coletado: ['Coletado', (x) => x.it.coletado_em || null] }, o = ORD[S.opTemOrd.k] ? S.opTemOrd : { k: 'n', d: -1 };
  if (!fO.ativo) L = L.slice().sort((a, b) => { const va = ORD[o.k][1](a), vb = ORD[o.k][1](b); if (va == null || vb == null) return va == null && vb == null ? b.ef - a.ef : va == null ? 1 : -1; return (va < vb ? -1 : va > vb ? 1 : 0) * o.d || b.ef - a.ef; });
  const POR = 30, V = S.opTemMais || busca ? L : L.slice(0, POR);
  const card = ({ it, ints, n, ef, _ba }) => { const sobe = ef - it.estrelas, tv = acapTrava(it.lead);
    const sit = tv ? (acapEhMinha(tv) ? 'em captação por você' : 'em captação por ' + (tv.nome || 'outro corretor')) : it.situacao === 'meu' ? 'distribuído a você' : it.situacao === 'outro' ? 'com outro corretor' : 'sem corretor';
    const campo = (r, v, sens) => `<div><span class="r">${r}</span>${sens ? `<span data-sens>${v}</span>` : v}</div>`;
    return `<article class="painel op-tem acf"><div class="acf-foto${it.foto_id ? '' : ' sem'}">${it.foto_id ? `<img src="${esc('/_blob/' + it.foto_id)}" alt="Foto do imóvel" loading="lazy">` : '<span aria-hidden="true">🏠</span><span class="peq mut">foto na próxima coleta</span>'}</div>
      <div class="acf-tit"><span class="pill lado-tem">🏠 ${esc(PAPEL_CAPT[it.papel] || 'Proprietário')}</span><b>${esc(it.tipo || 'Imóvel')} · ${esc(it.bairro || '')}</b><span class="estr" title="${esc(it.estrelas + ' de 5' + (sobe > 0 ? ' · +' + sobe + ' por clientes interessados' : ''))}">${est(ef)}${sobe > 0 ? ' ↑' : ''}</span>${_ba ? `<span class="ba-hit">${esc(_ba)}</span>` : ''}<span class="selo-na">${SELO_NA}</span></div>${endHtml(it.end)}
      <div class="acf-campos">${campo('Negócio', esc(it.fin || '—'))}${campo('Valor', esc(it.valor ? valCapt(it.fin, it.valor) : '—'), true)}${campo('Dorm.', esc(it.dorm != null ? String(it.dorm) : '—'))}${campo('Área', esc(it.area ? Math.round(it.area) + ' m²' : '—'))}${campo('Coletado', esc(it.coletado_em ? dt(it.coletado_em) : '—'))}${campo('Situação', esc(sit))}</div>
      <div class="acf-int">${n ? `<div class="op-int"><b>👥 ${n} cliente${n === 1 ? ' procura' : 's procuram'} um imóvel assim</b>${ints.slice(0, 8).map((y) => `<button class="copiar" type="button" data-lead="${esc(y.id)}">${esc(y.nome)}</button>`).join('')}${ints.length > 8 ? `<span class="mut peq">e mais ${ints.length - 8}</span>` : ''}${n > ints.length ? `<span class="mut peq">${ints.length ? 'e ' + (n - ints.length) + ' de outros corretores' : 'clientes de toda a Vivere'}</span>` : ''}</div>` : '<p class="mut peq" style="margin:0">Nenhum cliente seu com perfil parecido agora.</p>'}</div>
      <div class="acoes">${acaoCapt(it, ints[0] ? ints[0].id : '')}</div></article>`; };
  let r = `<section class="sec"><div class="linha" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Ofertas</h2></div>
    ${LEG_OP}<p class="peq mut" style="margin:0">Imóveis <b>🟠 não captados</b>: proprietários localizados pela Vivere que anunciam direto. Quando um cliente seu procura um imóvel assim, a ★ sobe. Não se oferta: <b>⚡ Captar este imóvel primeiro</b> pede o lead à diretoria, e o telefone do proprietário chega em Meus leads quando ele for distribuído a você.${S.acap ? ' Com <b>🎯 A CAPTAR</b>, você trava o imóvel na hora e recebe o contato lá; sem telefone, o Captei (1 Capcoin) também se pede por lá.' : ''}</p>${ladosOp()}${blocoAcapMinhas()}
    ${busca ? '<p class="mut peq" style="margin:0">Com a busca, a lista procura em todos os imóveis não captados e nos seus clientes.</p>' : `<div class="chips" role="group" aria-label="Filtrar"><button type="button" data-optem="com" aria-pressed="${S.opTem !== 'todos'}">Com clientes interessados (${nCom})</button><button type="button" data-optem="todos" aria-pressed="${S.opTem === 'todos'}">Todos (${L0.length})</button></div>`}
    <div class="chips op-ord" role="group" aria-label="Ordenar por"><span class="mut peq">Ordenar por</span>${Object.entries(ORD).map(([k, [t]]) => `<button type="button" data-optemord="${k}" aria-pressed="${o.k === k}">${t}${o.k === k ? (o.d > 0 ? ' ▲' : ' ▼') : ' ↕'}</button>`).join('')}</div>`;
  if (!S.prontos.has('capt')) return r + '<div class="painel vazio">Carregando os imóveis não captados…</div></section>';
  if (!V.length) r += `<div class="painel vazio">${!L0.length ? 'Nenhum imóvel não captado ainda. A diretoria coleta toda semana.' : busca ? 'Nenhum imóvel não captado atende à busca.' : 'Nenhum imóvel não captado com cliente seu interessado agora. Veja "Todos".'}</div>`;
  else r += `<div class="op-tem-grade acf-lista">${V.map(card).join('')}</div>`;
  if (L.length > POR && !busca) r += `<button class="copiar" type="button" data-optemmais="1">${S.opTemMais ? 'Mostrar menos' : `Mostrar mais ${L.length - V.length}`}</button>`;
  return r + '<p class="status">Imóvel 🟠 não captado não é anúncio da Vivere: capte antes de falar dele com o cliente.</p></section>';
}
// corpo da solicitação de captação (gaveta da aba Solicitações)
// Corretor anunciante (01/11/2026, fatia 2): depois do contato, o corretor avisa que o lead de captação é corretor ou imobiliária.
// Grava solicitacoes tipo 'corretor_anunciante'; a entrega diária registra o telefone no cadastro do HUB e devolve 'aprovada'.
function pedidoCorAnun(id) { return Object.entries(S.sol || {}).find(([sid, s]) => s.tipo === 'corretor_anunciante' && s.lead_painel === id && !['cancelada', 'recusada'].includes(statusDe(sid, s))) || null; }
function blocoCorAnun(id, l) {
  if (!capDe(l) || S.ehDono) return '';
  const p = pedidoCorAnun(id), st = p ? statusDe(p[0], p[1]) : '';
  const corpo = st === 'aprovada' ? '<p style="margin:0">🏷️ Registrado como <b>corretor anunciante</b>. Os anúncios deste telefone chegam marcados à diretoria e não são distribuídos.</p>'
    : p ? `<p style="margin:0">🏷️ Você avisou em ${dt(p[1].enviado_em || p[1].criado_em)} que é corretor ou imobiliária. A diretoria registra na próxima entrega, e o lead sai de Meus leads como Perdido.</p><div class="linha" style="margin-top:8px"><button class="b" type="button" data-cancelar="${esc(p[0])}">Cancelar aviso</button></div>`
    : `<p style="margin:0"><b>É corretor ou imobiliária?</b> Se no contato você viu que o anúncio não é do proprietário, avise a diretoria: o telefone entra no cadastro de corretores anunciantes e os próximos anúncios dele já chegam marcados.</p><div class="linha" style="margin-top:8px"><button class="b" type="button" data-coranun="${esc(id)}">🏷️ É corretor ou imobiliária</button></div>`;
  return `<div class="painel peq">${corpo}</div>`;
}
function captSolCorpo(s, dc) {
  const c = (S.capt || {})[s.capt_id] || null;
  return `<div class="op-capt"><div class="selo-na">${SELO_NA}</div><div><b>${esc(s.imovel || s.ref || 'Imóvel captado')}</b></div>${s.cliente_nome ? `<div class="peq">Cliente que procura um imóvel assim: <b>${esc(s.cliente_nome)}</b></div>` : ''}
    <div class="peq">${c && c.situacao === 'meu' ? 'Distribuído a você: o proprietário está em Meus leads.' : c && c.situacao !== 'outro' && dc && dc.status === 'aprovada' && dc.entrega === 'pendente' ? 'Captação aprovada pela diretoria: o proprietário chega em Meus leads, com telefone e roteiro, na entrega das 7h43.' : c && c.situacao === 'outro' ? 'A diretoria distribuiu este imóvel a outro corretor.' : 'A diretoria decide a captação e distribui o lead. O telefone do proprietário chega em Meus leads quando ele for distribuído a você.'}</div></div>`;
}

/* ---------- Demandas: núcleo comum do HUB e dos painéis dos corretores (31/10/2026, pedido do Cleiton) ----------
   "Procura-se apartamento de 2 dormitórios no Campeche até R$ 1,5 mi": cada demanda é registrada no HUB ou num painel e fica
   visível para toda a imobiliária. Cada artefato grava no próprio banco (coleções `demandas` e `demandas_pedidos`, mesmo formato
   nos dois); a tarefa agendada de hora em hora junta as cópias (vence o maior atualizado_em; empate fica com a encerrada).
   Doc de `demandas/<id>`: {finalidade: 'Compra'|'Locação anual'|'Temporada', tipo, bairros:[], dorm_min, suites_min, vagas_min, area_min, area_max (m²),
   valor_min, valor_max (os mínimos e máximos são opcionais; valor_min, suites_min, vagas_min e área desde 05/11/2026), obs, autor, autor_id,
   origem: 'hub'|'painel:<slug>', criado_em, atualizado_em, expira_em (AAAA-MM-DD, criado/renovado + 30 dias), status: 'ativa'|'encerrada',
   encerrada_por, encerrada_em, historico:[{em, por, acao}] (últimos 10)}. id = 'd-' + data base36 + 4 aleatórios + '-' + origem.
   Doc de `demandas_pedidos/<id>`: {demanda_id, texto, autor, autor_id, origem, criado_em, atualizado_em, status: 'aberto'|'atendido', atendido_por}.
   Quem edita, renova e encerra: o autor e a diretoria. Os demais pedem alteração. O banco entrega docs congelados: só cópias.
   cfg: {ns, eu(), docs(), pedidos(), carregado(), grava(col,id,doc)→Promise<bool>, pede(), ctx(), casar(p,ctx,opt), bairros(),
         itemHtml(it), autorHtml(d)? (corretor como link), filtraBusca(lista)?, bloqueioNova()? (texto = "+ Nova demanda" desabilitado), aviso(msg), btn, btnP, nota} */
const DEM_NUCLEO = (cfg) => {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FINS = ['Compra', 'Locação anual', 'Temporada'];
  const TIPOS = ['Apartamento', 'Casa', 'Cobertura', 'Terreno', 'Sala/comercial', 'Outro'];
  const VALID_DIAS = 30;
  const pad = (n) => String(n).padStart(2, '0');
  const agora = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 19); };
  const hoje = () => agora().slice(0, 10);
  const maisDias = (iso, n) => { const d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const diasAte = (iso) => Math.round((new Date(String(iso).slice(0, 10) + 'T12:00:00') - new Date(hoje() + 'T12:00:00')) / 864e5);
  const dt = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; };
  const curto = (v) => { v = +v; if (!v) return ''; if (v >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi'; if (v >= 1e3) return 'R$ ' + (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: v < 1e5 ? 1 : 0 }) + ' mil'; return 'R$ ' + v.toLocaleString('pt-BR'); };
  // "1,5 mi", "800 mil", "R$ 950.000", "1500000" → número
  const lerValor = (s) => { const t = String(s || '').toLowerCase().replace(/r\$|\s/g, ''); if (!t) return null; const m = t.match(/^(\d[\d.]*(?:,\d+)?)(mi|milh[oõ]es|milh[aã]o|mil|k)?$/); if (!m) return null;
    let n = m[1]; n = n.includes(',') ? +n.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(n) ? +n.replace(/\./g, '') : +n; if (!isFinite(n)) return null;
    const u = m[2] || ''; if (!u && n < 100) return null; // "1,2" sem unidade é ambíguo: pedir "1,2 mi" ou o valor cheio
    if (u === 'mil' || u === 'k') n *= 1e3; else if (/^mi/.test(u)) n *= 1e6; return n > 0 ? Math.round(n) : null; };
  const fmtValor = (v) => (v ? Number(v).toLocaleString('pt-BR') : '');
  const novoId = (eu) => 'd-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '-' + String(eu.id || 'x').replace(/[^a-z0-9-]/gi, '').slice(0, 24);
  const ativa = (d) => d.status === 'ativa' && String(d.expira_em || '') >= hoje();
  const expirada = (d) => d.status === 'ativa' && String(d.expira_em || '') < hoje();
  const lista = () => Object.entries(cfg.docs() || {}).filter(([, d]) => d && typeof d === 'object').map(([id, d]) => Object.assign({}, d, { _id: id }));
  const pedidos = () => Object.entries(cfg.pedidos() || {}).filter(([, p]) => p && typeof p === 'object').map(([id, p]) => Object.assign({}, p, { _id: id }));
  const pode = (d) => { const eu = cfg.eu(); return !!eu.diretoria || (!!eu.id && d.autor_id === eu.id); };
  const bairrosTxt = (b) => { b = Array.isArray(b) ? b : []; return b.length <= 3 ? b.join(', ') : b.slice(0, 2).join(', ') + ' e mais ' + (b.length - 2); };
  // colunas (05/11/2026): Cômodos = mínimos de dormitórios, suítes e vagas; m² e Valor = mínimo–máximo
  const n0 = (v) => (v == null || v === '' ? null : +v || null);
  const plural = (n, s, p) => n + '+ ' + (n > 1 ? p : s);
  const comodosTxt = (d) => [n0(d.dorm_min) ? plural(+d.dorm_min, 'dorm', 'dorm') : '', n0(d.suites_min) ? plural(+d.suites_min, 'suíte', 'suítes') : '', n0(d.vagas_min) ? plural(+d.vagas_min, 'vaga', 'vagas') : ''].filter(Boolean).join(' · ');
  const faixa = (a, b, f, un) => { a = n0(a); b = n0(b); return a && b ? f(a) + ' – ' + f(b) + un : a ? 'a partir de ' + f(a) + un : b ? 'até ' + f(b) + un : ''; };
  const areaTxt = (d) => faixa(d.area_min, d.area_max, (v) => v.toLocaleString('pt-BR'), ' m²');
  const valorTxt = (d) => faixa(d.valor_min, d.valor_max, curto, '');
  const tipoTxt = (d) => (d.tipo && d.tipo !== 'Outro' ? d.tipo : 'Imóvel');
  const autor = (d) => { if (cfg.autorHtml) { try { const h = cfg.autorHtml(d); if (h) return h; } catch (e) {} } return esc(d.autor || '—'); };
  function resumo(d) {
    const p = [tipoTxt(d), comodosTxt(d), bairrosTxt(d.bairros), areaTxt(d), valorTxt(d)].filter(Boolean);
    return 'Procura-se ' + p.join(', ') + (d.finalidade ? ' — ' + d.finalidade : '');
  }
  // perfil no formato do motor das Oportunidades (OP.casar)
  const perfil = (d) => ({ fin: d.finalidade === 'Compra' ? 'Venda' : d.finalidade === 'Temporada' ? 'Temporada' : d.finalidade ? 'Locação' : '', tipo: d.tipo && d.tipo !== 'Outro' ? (d.tipo === 'Sala/comercial' ? 'Comercial' : d.tipo) : '',
    bairros: Array.isArray(d.bairros) ? d.bairros.slice() : [], vmax: n0(d.valor_max), vmin: n0(d.valor_min), dorm: n0(d.dorm_min), vagas: n0(d.vagas_min), amin: n0(d.area_min), amax: n0(d.area_max) });
  // área e suítes: o motor só pontua a área (com mínimo e máximo) e ignora suítes; aqui o corte é estrito (imóvel sem o dado continua na lista)
  const filtraExtra = (d, L) => { const a1 = n0(d.area_min), a2 = n0(d.area_max), s1 = n0(d.suites_min); if (!a1 && !a2 && !s1) return L;
    return L.filter((x) => { const it = (x && x.it) || {}, ar = +it.area || null, su = it.suites == null || it.suites === '' ? null : +it.suites;
      return !((ar && a1 && ar < a1) || (ar && a2 && ar > a2) || (su != null && s1 && su < s1)); }); };
  let MEMO = { ctx: null, m: new Map() };
  function atende(d) {
    let ctx = null; try { ctx = cfg.ctx(); } catch (e) { ctx = null; } if (!ctx) return null;
    if (MEMO.ctx !== ctx) MEMO = { ctx, m: new Map() };
    const sig = d._id + '|' + (d.atualizado_em || ''); if (MEMO.m.has(sig)) return MEMO.m.get(sig);
    let r = []; try { r = filtraExtra(d, cfg.casar(perfil(d), ctx, { max: 300, relaxa: false }) || []).slice(0, 20); } catch (e) { r = []; }
    MEMO.m.set(sig, r); return r;
  }
  // selo de novidade: demandas ativas de outras pessoas que este leitor ainda não viu (guardado no aparelho)
  const LS = cfg.ns + '.demandas.vistas';
  const lerVistas = () => { try { const v = JSON.parse(localStorage.getItem(LS) || '[]'); return new Set(Array.isArray(v) ? v : []); } catch (e) { return new Set(); } };
  const gravaVistas = (s) => { try { localStorage.setItem(LS, JSON.stringify([...s].slice(-500))); } catch (e) {} };
  let VISTAS = lerVistas(); const NOVAS_SESSAO = new Set();
  const novasIds = () => { const eu = cfg.eu(); return lista().filter((d) => ativa(d) && d.autor_id !== eu.id && !VISTAS.has(d._id)).map((d) => d._id); };
  const novas = () => novasIds().length;
  const pedAbertos = () => { const P = pedidos().filter((p) => p.status === 'aberto'), D = cfg.docs() || {}; return P.filter((p) => D[p.demanda_id] && pode(Object.assign({}, D[p.demanda_id]))); };

  const F = { fin: '', sit: 'ativas', minhas: false, pedidos: false, ord: { k: 'data', dir: -1 }, abertos: {}, conf: '', salvando: false };
  const ROT_ORD = { demanda: 'Demanda', finalidade: 'Finalidade', bairros: 'Bairros', comodos: 'Cômodos', area: 'm²', valor: 'Valor', autor: 'Corretor', data: 'Data', validade: 'Validade' };
  const ORD_TXT = ['demanda', 'finalidade', 'bairros', 'autor', 'validade'];   // texto e validade começam do menor (A–Z, vence antes)
  const txo = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const CH_ORD = { demanda: (d) => txo(tipoTxt(d)), finalidade: (d) => txo(d.finalidade), bairros: (d) => txo((d.bairros || [])[0]), comodos: (d) => (n0(d.dorm_min) || 0) * 100 + (n0(d.suites_min) || 0) * 10 + (n0(d.vagas_min) || 0),
    area: (d) => n0(d.area_min) || n0(d.area_max) || 0, valor: (d) => n0(d.valor_max) || n0(d.valor_min) || 0, data: (d) => d.criado_em || '', autor: (d) => txo(d.autor), validade: (d) => d.status === 'encerrada' ? '0' : d.expira_em || '' };
  const seta = (k) => (F.ord.k === k ? (F.ord.dir > 0 ? ' ▲' : ' ▼') : ' ↕');
  const B = (cls, attrs, txt) => `<button type="button" class="${cfg.btn}${cls ? ' ' + cls : ''}" ${attrs}>${txt}</button>`;

  function validade(d) {
    if (d.status === 'encerrada') return `<span class="dm-pill">encerrada ${dt(d.encerrada_em || d.atualizado_em)}</span>`;
    const n = diasAte(d.expira_em || hoje());
    if (n < 0) return `<span class="dm-pill dm-bad">expirou ${dt(d.expira_em)}</span>`;
    return `<span class="dm-pill${n <= 5 ? ' dm-warn' : ''}">até ${dt(d.expira_em)} · ${n === 0 ? 'vence hoje' : n + (n === 1 ? ' dia' : ' dias')}</span>`;
  }
  function acoes(d) {
    const p = pode(d), r = [];
    if (p) {
      r.push(B('', `data-dm-acao="editar" data-dm-id="${esc(d._id)}"`, 'Editar'));
      if (d.status === 'ativa') r.push(B('', `data-dm-acao="renovar" data-dm-id="${esc(d._id)}" title="Mais ${VALID_DIAS} dias a partir de hoje"`, 'Renovar'));
      if (d.status === 'ativa') r.push(B('', `data-dm-acao="encerrar" data-dm-id="${esc(d._id)}"`, F.conf === d._id ? 'Confirmar encerramento' : 'Encerrar'));
    } else r.push(B('', `data-dm-acao="pedir" data-dm-id="${esc(d._id)}"`, 'Pedir alteração'));
    const A = atende(d);
    r.push(B('', `data-dm-acao="atende" data-dm-id="${esc(d._id)}" aria-expanded="${!!F.abertos[d._id]}"`, A == null ? 'Imóveis que atendem (…)' : `Imóveis que atendem (${A.length}) ${F.abertos[d._id] ? '▲' : '▼'}`));
    return r.join('');
  }
  function detalhe(d) {
    const out = [];
    const P = pedidos().filter((x) => x.demanda_id === d._id && x.status === 'aberto');
    if (P.length) out.push(`<div class="dm-peds"><b>Pedidos de alteração (${P.length})</b>${P.map((x) => `<div class="dm-ped"><span>${esc(x.texto)}</span><span class="dm-mut">${esc(x.autor || '')} · ${dt(x.criado_em)}</span>${pode(d) ? B('', `data-dm-acao="atendido" data-dm-id="${esc(x._id)}"`, 'Marcar atendido') : ''}</div>`).join('')}</div>`);
    if (F.abertos[d._id]) {
      const A = atende(d);
      out.push(A == null ? '<p class="dm-mut">Carregando os imóveis…</p>' : A.length ? `<div class="dm-its">${A.map((x) => cfg.itemHtml(x.it, x)).join('')}</div>` : '<p class="dm-mut">Nenhum imóvel da carteira atende agora.</p>');
    }
    return out.join('');
  }
  const valorSens = (d) => (valorTxt(d) ? `<span data-sens>${esc(valorTxt(d))}</span>` : '');
  function linhaTab(d) {   // linha 1 = as colunas; linha 2 = observação e ações (largura inteira, sem apertar as colunas)
    const nv = NOVAS_SESSAO.has(d._id) ? ' <span class="dm-pill dm-novo">nova</span>' : '', det = detalhe(d);
    const td = (v, cls) => `<td${cls ? ` class="${cls}"` : ''}>${v || '—'}</td>`;
    return `<tr id="dm-${esc(d._id)}" class="dm-l1">${td(`<b>${esc(tipoTxt(d))}</b>${nv}`)}${td(esc(d.finalidade || ''))}${td(esc((d.bairros || []).join(', ')))}${td(esc(comodosTxt(d)))}${td(esc(areaTxt(d)), 'n')}${td(valorSens(d), 'n')}${td(autor(d))}${td(dt(d.criado_em), 'nw')}${td(validade(d))}</tr>`
      + `<tr class="dm-l2"><td colspan="9">${d.obs ? `<div class="dm-mut">${esc(d.obs)}</div>` : ''}<div class="dm-ac">${acoes(d)}</div></td></tr>${det ? `<tr class="dm-det"><td colspan="9">${det}</td></tr>` : ''}`;
  }
  function cartao(d) {
    const nv = NOVAS_SESSAO.has(d._id) ? ' <span class="dm-pill dm-novo">nova</span>' : '';
    const kv = (r, v) => (v ? `<span class="dm-kv"><i>${r}</i> ${v}</span>` : '');
    return `<div class="dm-card" id="dmc-${esc(d._id)}"><div><b>${esc(tipoTxt(d))}</b>${d.finalidade ? ' · ' + esc(d.finalidade) : ''}${nv}</div>
      <div class="dm-kvs">${kv('Bairros', esc((d.bairros || []).join(', ')))}${kv('Cômodos', esc(comodosTxt(d)))}${kv('m²', esc(areaTxt(d)))}${kv('Valor', valorSens(d))}${kv('Corretor', autor(d))}</div>
      ${d.obs ? `<div class="dm-mut">${esc(d.obs)}</div>` : ''}<div class="dm-meta"><span>${dt(d.criado_em)}</span>${validade(d)}</div><div class="dm-ac">${acoes(d)}</div>${detalhe(d)}</div>`;
  }

  function render() {
    if (!cfg.carregado()) return `<section class="dm" id="dm-raiz"><h2>Demandas extras</h2><div class="dm-vazio">Carregando…</div></section>`;
    const nv = novasIds(); nv.forEach((id) => NOVAS_SESSAO.add(id));
    if (nv.length) { nv.forEach((id) => VISTAS.add(id)); gravaVistas(VISTAS); setTimeout(() => cfg.pede(), 0); }
    const eu = cfg.eu(), T = lista(), PA = pedAbertos(), comPed = new Set(PA.map((p) => p.demanda_id));
    const sitOk = (d) => (F.sit === 'ativas' ? ativa(d) : !ativa(d));
    let L = T.filter((d) => sitOk(d) && (!F.fin || d.finalidade === F.fin) && (!F.minhas || d.autor_id === eu.id) && (!F.pedidos || comPed.has(d._id)));
    if (cfg.filtraBusca) L = cfg.filtraBusca(L, resumo);
    const k = CH_ORD[F.ord.k] || CH_ORD.data;
    const semV = (v) => v === '' || v === 0 || v == null;   // sem valor vai sempre para o fim
    L.sort((a, b) => { const x = k(a), y = k(b), vx = semV(x), vy = semV(y); if (vx !== vy) return vx ? 1 : -1; return (x > y ? 1 : x < y ? -1 : String(b.criado_em || '').localeCompare(String(a.criado_em || ''))) * (x === y ? 1 : F.ord.dir); });
    const nA = T.filter(ativa).length, nE = T.length - nA;
    const chip = (attr, on, txt) => `<button type="button" class="dm-chip" ${attr} aria-pressed="${on}">${txt}</button>`;
    const chips1 = [chip('data-dm-fin=""', !F.fin, 'Todas'), ...FINS.map((f) => chip(`data-dm-fin="${esc(f)}"`, F.fin === f, esc(f)))].join('');
    const chips2 = [chip('data-dm-sit="ativas"', F.sit === 'ativas', `Ativas (${nA})`), chip('data-dm-sit="encerradas"', F.sit !== 'ativas', `Encerradas/expiradas (${nE})`), chip('data-dm-minhas="1"', F.minhas, eu.diretoria && eu.id === 'hub' ? 'Só da diretoria' : 'Só as minhas'), ...(PA.length || F.pedidos ? [chip('data-dm-peds="1"', F.pedidos, `Pedidos abertos (${PA.length})`)] : [])].join('');
    const ordM = `<div class="dm-ordm" role="group" aria-label="Ordenar por"><span>Ordenar por</span>${Object.keys(ROT_ORD).map((x) => `<button type="button" class="dm-chip" data-dm-ord="${x}" aria-pressed="${F.ord.k === x}">${ROT_ORD[x]}${seta(x)}</button>`).join('')}</div>`;
    const th = (x, cls) => `<th${cls ? ` class="${cls}"` : ''}><button type="button" class="dm-th" data-dm-ord="${x}" aria-sort="${F.ord.k === x ? (F.ord.dir > 0 ? 'ascending' : 'descending') : 'none'}">${ROT_ORD[x]}${seta(x)}</button></th>`;
    const vazio = `<div class="dm-vazio">${T.length ? 'Nenhuma demanda neste filtro.' : 'Nenhuma demanda registrada ainda. Use “+ Nova demanda”.'}</div>`;
    const tab = `<div class="tabela dm-tab"><table data-ord-dados="1"><thead><tr>${th('demanda')}${th('finalidade')}${th('bairros')}${th('comodos')}${th('area', 'n')}${th('valor', 'n')}${th('autor')}${th('data')}${th('validade')}</tr></thead><tbody>${L.map(linhaTab).join('')}</tbody></table></div>`;
    const avisoPed = PA.length && !F.pedidos ? `<div class="dm-alerta"><b>${PA.length} pedido${PA.length > 1 ? 's' : ''} de alteração em aberto</b> em demandas que você pode editar. ${B('', 'data-dm-peds="1"', 'Ver')}</div>` : '';
    const bloqueio = cfg.bloqueioNova ? cfg.bloqueioNova() : '';   // ex.: painel ainda sem identificação do corretor
    return `<section class="dm" id="dm-raiz"><div class="dm-cab"><h2>Demandas extras</h2>${B(cfg.btnP, `data-dm-acao="nova"${bloqueio ? ` disabled title="${esc(bloqueio)}"` : ''}`, '+ Nova demanda')}</div>${bloqueio ? `<p class="dm-mut" style="margin:6px 0 0">${esc(bloqueio)}</p>` : ''}
      <p class="dm-nota">${cfg.nota}</p>${avisoPed}
      <div class="dm-chips" role="group" aria-label="Finalidade">${chips1}</div><div class="dm-chips" role="group" aria-label="Situação">${chips2}</div>
      ${L.length ? `${ordM}${tab}<div class="dm-cards">${L.map(cartao).join('')}</div>` : vazio}</section>`;
  }

  // ---------- formulário (fica fora da área redesenhada pela página: não perde o que foi digitado) ----------
  let FORM = null;
  const modal = () => { let m = document.getElementById('dm-modal'); if (!m) { m = document.createElement('div'); m.id = 'dm-modal'; document.body.appendChild(m); } return m; };
  function fechaModal() { FORM = null; const m = document.getElementById('dm-modal'); if (m) m.innerHTML = ''; }
  function pintaModal() {
    if (!FORM) return fechaModal();
    const m = modal(), f = FORM, ms = window.MultiSel;
    const bs = [...new Set([...(cfg.bairros() || []), ...(f.bairros || [])])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const opt = (L, v) => L.map((x) => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('');
    const corpo = f.modo === 'pedir'
      ? `<p class="dm-mut" style="margin:0">${esc(resumo(f.d))} · de ${esc(f.d.autor || '—')}</p><label class="dm-c">O que precisa mudar<textarea id="dm-f-texto" rows="4" placeholder="Ex.: o cliente agora aceita também o Rio Tavares">${esc(f.texto || '')}</textarea></label>`
      : `<div class="dm-form"><label class="dm-c">Finalidade<select id="dm-f-fin">${opt(FINS, f.finalidade)}</select></label><label class="dm-c">Tipo<select id="dm-f-tipo">${opt(TIPOS, f.tipo)}</select></label>
        <div class="dm-c dm-int">Bairros${ms ? ms.html('dm-f-bai', bs.map((b) => [b, b]), f.bairros || [], 'Qualquer bairro', 'bairros') : `<input id="dm-f-baitxt" value="${esc((f.bairros || []).join(', '))}" placeholder="Separe por vírgula">`}</div>
        <div class="dm-int dm-tri"><label class="dm-c">Dormitórios (mín.)<input id="dm-f-dorm" type="number" min="0" max="9" inputmode="numeric" value="${esc(f.dorm_min || '')}"></label>
          <label class="dm-c">Suítes (mín.)<input id="dm-f-suites" type="number" min="0" max="9" inputmode="numeric" value="${esc(f.suites_min || '')}"></label>
          <label class="dm-c">Vagas (mín.)<input id="dm-f-vagas" type="number" min="0" max="9" inputmode="numeric" value="${esc(f.vagas_min || '')}"></label></div>
        <label class="dm-c">Área mínima (m²)<input id="dm-f-amin" type="number" min="0" inputmode="numeric" placeholder="Ex.: 110" value="${esc(f.area_min || '')}"></label>
        <label class="dm-c">Área máxima (m²)<input id="dm-f-amax" type="number" min="0" inputmode="numeric" value="${esc(f.area_max || '')}"></label>
        <label class="dm-c">Valor mínimo (R$)<input id="dm-f-vmin" data-sens inputmode="decimal" autocomplete="off" placeholder="Ex.: 800 mil" value="${esc(f.vminTxt != null ? f.vminTxt : fmtValor(f.valor_min))}"></label>
        <label class="dm-c">Valor máximo (R$)<input id="dm-f-valor" data-sens inputmode="decimal" autocomplete="off" placeholder="Ex.: 1,5 mi ou 4.500" value="${esc(f.valorTxt != null ? f.valorTxt : fmtValor(f.valor_max))}"></label>
        <label class="dm-c dm-int">Observação<textarea id="dm-f-obs" rows="3" placeholder="Ex.: perto da praia, aceita permuta">${esc(f.obs || '')}</textarea></label></div>
        <p class="dm-mut" style="margin:0">Fica ativa por ${VALID_DIAS} dias (renove quando precisar) e aparece para toda a imobiliária: diretoria e corretores.</p>`;
    const tit = f.modo === 'pedir' ? 'Pedir alteração' : f.modo === 'editar' ? 'Editar demanda' : 'Nova demanda';
    m.innerHTML = `<div class="dm-fundo" data-dm-fundo="1"><div class="dm-modal" role="dialog" aria-modal="true" aria-labelledby="dm-f-tit"><h2 id="dm-f-tit">${tit}</h2>${corpo}
      ${f.erro ? `<p class="dm-erro">${esc(f.erro)}</p>` : ''}<div class="dm-ac">${B(cfg.btnP, `data-dm-acao="salvar"${F.salvando ? ' disabled' : ''}`, F.salvando ? 'Salvando…' : f.modo === 'pedir' ? 'Enviar pedido' : 'Salvar')}${B('', 'data-dm-acao="fechar"', 'Cancelar')}</div></div></div>`;
  }
  function abreForm(modo, d) {
    const eu = cfg.eu();
    if (modo === 'pedir') FORM = { modo, d, texto: '' };
    else if (modo === 'editar') FORM = Object.assign({ modo }, JSON.parse(JSON.stringify(d)), { d });
    else FORM = { modo: 'nova', finalidade: 'Compra', tipo: 'Apartamento', bairros: [], dorm_min: '', suites_min: '', vagas_min: '', area_min: '', area_max: '', valor_min: null, valor_max: null, obs: '', autor: eu.nome };
    pintaModal(); setTimeout(() => { const x = document.querySelector('#dm-modal select, #dm-modal textarea'); if (x) x.focus(); }, 0);
  }
  const hist = (d, acao) => (Array.isArray(d.historico) ? d.historico.slice(-9) : []).concat([{ em: agora().slice(0, 16), por: cfg.eu().nome, acao }]);
  async function salvar() {
    const f = FORM; if (!f || F.salvando) return; const eu = cfg.eu();
    if (f.modo === 'pedir') {
      const tx = String(f.texto || '').trim(); if (!tx) { f.erro = 'Escreva o que precisa mudar.'; return pintaModal(); }
      const id = 'p-' + novoId(eu).slice(2), t = agora();
      F.salvando = true; pintaModal();
      const ok = await cfg.grava('demandas_pedidos', id, { demanda_id: f.d._id, texto: tx.slice(0, 600), autor: eu.nome, autor_id: eu.id, origem: eu.origem, criado_em: t, atualizado_em: t, status: 'aberto' });
      F.salvando = false; if (ok) { fechaModal(); cfg.aviso('Pedido enviado ao autor da demanda.'); cfg.pede(); } else pintaModal(); return;
    }
    const int = (v, mx) => (v === '' || v == null ? null : Math.max(0, Math.min(mx, parseInt(v, 10) || 0)) || null);
    const bairros = (f.bairros || []).filter(Boolean), dorm = int(f.dorm_min, 9), suites = int(f.suites_min, 9), vagas = int(f.vagas_min, 9), amin = int(f.area_min, 99999), amax = int(f.area_max, 99999);
    const vmax = f.valorTxt != null ? lerValor(f.valorTxt) : f.valor_max || null, vmin = f.vminTxt != null ? lerValor(f.vminTxt) : f.valor_min || null;
    if (f.valorTxt && vmax == null) { f.erro = 'Valor máximo não reconhecido. Escreva com a unidade (1,2 mi, 800 mil) ou o valor cheio (1.200.000, 4.500).'; return pintaModal(); }
    if (f.vminTxt && vmin == null) { f.erro = 'Valor mínimo não reconhecido. Escreva com a unidade (1,2 mi, 800 mil) ou o valor cheio (1.200.000, 4.500).'; return pintaModal(); }
    if (vmin && vmax && vmin > vmax) { f.erro = 'O valor mínimo está acima do máximo.'; return pintaModal(); }
    if (amin && amax && amin > amax) { f.erro = 'A área mínima está acima da máxima.'; return pintaModal(); }
    const campos = { finalidade: f.finalidade, tipo: f.tipo, bairros, dorm_min: dorm, suites_min: suites, vagas_min: vagas, area_min: amin, area_max: amax, valor_min: vmin, valor_max: vmax, obs: String(f.obs || '').trim().slice(0, 600) };
    if (!FINS.includes(f.finalidade) || !TIPOS.includes(f.tipo)) { f.erro = 'Escolha a finalidade e o tipo.'; return pintaModal(); }
    const t = agora(); let id, doc;
    if (f.modo === 'editar') {
      const base = JSON.parse(JSON.stringify(cfg.docs()[f.d._id] || f.d)); delete base._id; id = f.d._id;
      doc = Object.assign(base, campos, { atualizado_em: t, historico: hist(base, 'editada') });
    } else {
      id = novoId(eu);
      doc = Object.assign({}, campos, { autor: eu.nome, autor_id: eu.id, origem: eu.origem,
        criado_em: t, atualizado_em: t, expira_em: maisDias(t, VALID_DIAS), status: 'ativa', encerrada_por: null, historico: [{ em: t.slice(0, 16), por: eu.nome, acao: 'criada' }] });
    }
    F.salvando = true; pintaModal();
    const ok = await cfg.grava('demandas', id, doc); F.salvando = false;
    if (ok) { fechaModal(); cfg.aviso(f.modo === 'editar' ? 'Demanda atualizada.' : 'Demanda registrada. Ela vai a todos os painéis na próxima sincronização (de hora em hora).'); cfg.pede(); } else pintaModal();
  }
  async function muda(id, acao) {
    const atual = (cfg.docs() || {})[id]; if (!atual) return; const d = JSON.parse(JSON.stringify(atual)); if (!pode(Object.assign({}, d))) return; const t = agora(), eu = cfg.eu();
    if (acao === 'renovar') Object.assign(d, { status: 'ativa', expira_em: maisDias(t, VALID_DIAS), atualizado_em: t, historico: hist(d, 'renovada até ' + dt(maisDias(t, VALID_DIAS))) });
    if (acao === 'encerrar') Object.assign(d, { status: 'encerrada', encerrada_por: eu.nome, encerrada_em: t, atualizado_em: t, historico: hist(d, 'encerrada') });
    if (await cfg.grava('demandas', id, d)) { cfg.aviso(acao === 'renovar' ? 'Demanda renovada por mais ' + VALID_DIAS + ' dias.' : 'Demanda encerrada.'); cfg.pede(); }
  }
  async function atendido(pid) {
    const atual = (cfg.pedidos() || {})[pid]; if (!atual) return; const p = JSON.parse(JSON.stringify(atual)); const dd = (cfg.docs() || {})[p.demanda_id]; if (!dd || !pode(Object.assign({}, dd))) return;
    Object.assign(p, { status: 'atendido', atendido_por: cfg.eu().nome, atualizado_em: agora() });
    if (await cfg.grava('demandas_pedidos', pid, p)) { cfg.aviso('Pedido marcado como atendido.'); cfg.pede(); }
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-dm-acao],[data-dm-fin],[data-dm-sit],[data-dm-minhas],[data-dm-peds],[data-dm-ord],[data-dm-fundo]'); if (!t) return;
    if (t.dataset.dmFundo) { if (e.target === t) fechaModal(); return; }
    const d = t.dataset, docs = cfg.docs() || {};
    if (d.dmFin != null) { F.fin = d.dmFin; return cfg.pede(); }
    if (d.dmSit) { F.sit = d.dmSit; return cfg.pede(); }
    if (d.dmMinhas) { F.minhas = !F.minhas; return cfg.pede(); }
    if (d.dmPeds) { F.pedidos = !F.pedidos; if (F.pedidos) F.sit = 'ativas'; return cfg.pede(); }
    if (d.dmOrd) { const k = d.dmOrd; F.ord = F.ord.k === k ? { k, dir: -F.ord.dir } : { k, dir: ORD_TXT.includes(k) ? 1 : -1 }; return cfg.pede(); }
    const a = d.dmAcao, id = d.dmId;
    if (a === 'nova') { if (cfg.bloqueioNova && cfg.bloqueioNova()) return; return abreForm('nova'); }
    if (a === 'fechar') return fechaModal();
    if (a === 'salvar') return salvar();
    if (a === 'atendido') return atendido(id);
    const doc = id && docs[id] ? Object.assign({}, docs[id], { _id: id }) : null; if (!doc) return;
    if (a === 'editar') return abreForm('editar', doc);
    if (a === 'pedir') return abreForm('pedir', doc);
    if (a === 'renovar') return muda(id, 'renovar');
    if (a === 'encerrar') { if (F.conf === id) { F.conf = ''; return muda(id, 'encerrar'); } F.conf = id; return cfg.pede(); }
    if (a === 'atende') { F.abertos[id] = !F.abertos[id]; return cfg.pede(); }
  });
  document.addEventListener('input', (e) => {
    if (!FORM || !e.target || !e.target.id || !e.target.id.startsWith('dm-f-')) return; const k = e.target.id.slice(5), v = e.target.value;
    if (k === 'fin') FORM.finalidade = v; else if (k === 'tipo') FORM.tipo = v; else if (k === 'dorm') FORM.dorm_min = v; else if (k === 'suites') FORM.suites_min = v; else if (k === 'vagas') FORM.vagas_min = v; else if (k === 'amin') FORM.area_min = v; else if (k === 'amax') FORM.area_max = v; else if (k === 'vmin') FORM.vminTxt = v; else if (k === 'valor') FORM.valorTxt = v; else if (k === 'obs') FORM.obs = v; else if (k === 'texto') FORM.texto = v;
    else if (k === 'baitxt') FORM.bairros = v.split(',').map((x) => x.trim()).filter(Boolean);
  });
  document.addEventListener('change', (e) => { if (!FORM || !e.target || !e.target.id) return; if (e.target.id === 'dm-f-fin') FORM.finalidade = e.target.value; if (e.target.id === 'dm-f-tipo') FORM.tipo = e.target.value; });
  document.addEventListener('ms-change', (e) => { const x = e.detail || {}; if (FORM && x.id === 'dm-f-bai') FORM.bairros = (x.valores || []).slice(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && FORM && !document.querySelector('#dm-modal .ms-pop:not([hidden])')) fechaModal(); });

  if (!document.getElementById('dm-css')) {
    const s = document.createElement('style'); s.id = 'dm-css';
    s.textContent = `.dm-cab{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}.dm-cab h2{margin:0}
.dm-nota{color:var(--muted);font-size:12px;margin:8px 0 12px}
.dm-chips,.dm-ordm{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px;align-items:center}.dm-ordm span{font-size:12px;color:var(--muted)}
.dm-chip{border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:999px;padding:5px 11px;font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.dm-chip[aria-pressed="true"]{color:var(--ink);border-color:var(--ink);font-weight:600}
.dm-th{all:unset;cursor:pointer;font:inherit;color:inherit;white-space:nowrap}.dm-th:focus-visible,.dm-chip:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.dm-tab table{width:100%;border-collapse:collapse}.dm-tab th,.dm-tab td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:13px}
.dm-tab th{font-size:12px;color:var(--muted);font-weight:600}.dm-tab td.n,.dm-tab th.n{text-align:right;white-space:nowrap}.dm-tab tr.dm-det td{background:var(--soft)}
.dm-tab td{overflow-wrap:normal;word-break:normal}.dm-tab td.nw{white-space:nowrap}.dm-tab tr.dm-l1 td{border-bottom:0;padding-bottom:2px}.dm-tab tr.dm-l2 td{padding-top:0}.dm-tab tr.dm-l2 .dm-ac{margin-top:2px}
.dm-kvs{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px}.dm-kv i{font-style:normal;color:var(--muted);font-size:12px}
button.dm-lk{background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer;text-align:left;text-decoration:underline dotted;text-underline-offset:3px}button.dm-lk:hover{color:var(--accent)}
.dm-tri{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.dm-ac{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px}.dm-ac button{white-space:nowrap}
.dm-pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;background:var(--soft);color:var(--ink);white-space:nowrap}
.dm-pill.dm-warn{background:var(--warn-bg);color:var(--warn)}.dm-pill.dm-bad{background:var(--bad-bg);color:var(--bad)}.dm-pill.dm-novo{background:var(--ok-bg);color:var(--ok)}
.dm-mut{color:var(--muted);font-size:12px}.dm-erro{color:var(--bad);margin:8px 0 0}
.dm-vazio{padding:24px 16px;text-align:center;color:var(--muted);background:var(--panel);border:1px dashed var(--line);border-radius:8px}
.dm-alerta{background:var(--warn-bg);color:var(--ink);border-radius:8px;padding:8px 12px;margin:0 0 10px;font-size:13px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dm-cards{display:none;gap:10px}.dm-card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:grid;gap:6px;min-width:0;overflow-wrap:anywhere}
.dm-meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--muted)}
.dm-its{display:grid;gap:6px;margin-top:6px}.dm-it{display:flex;gap:6px 10px;flex-wrap:wrap;align-items:center;font-size:13px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);min-width:0;overflow-wrap:anywhere}
.dm-peds{display:grid;gap:4px;font-size:13px}.dm-ped{display:flex;gap:6px 10px;flex-wrap:wrap;align-items:center;padding:6px 8px;border-left:3px solid var(--warn);background:var(--bg);border-radius:4px}
.dm-fundo{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}
.dm-modal{background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:10px;width:min(640px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:16px;display:grid;gap:12px}.dm-modal h2{margin:0}
.dm-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.dm-c{display:grid;gap:4px;font-size:12px;color:var(--muted);min-width:0}.dm-int{grid-column:1/-1}
.dm-c input,.dm-c select,.dm-c textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:8px 10px;min-width:0}
.dm-c .ms{display:block;width:100%}
.dm{container-type:inline-size}
@container (max-width:999px){.dm-tab{display:none}.dm-cards{display:grid}}
@container (min-width:1000px){.dm-ordm{display:none}}
@media (max-width:520px){.dm-form{grid-template-columns:1fr}.dm-fundo{align-items:flex-end;padding:8px}.dm-modal{max-height:calc(100vh - 16px)}}`;
    (document.head || document.documentElement).appendChild(s);
  }
  return { render, novas, pedAbertos: () => pedAbertos().length, resumo, atende, perfil, lerValor, comodosTxt, areaTxt, valorTxt };
};

// ---------- Demandas (31/10/2026): aba comum com o HUB; o núcleo DEM_NUCLEO é o mesmo do módulo modulos/demandas.js do HUB ----------
// Grava no banco deste painel (demandas, demandas_pedidos); a tarefa agendada de hora em hora leva às outras cópias.
// "Imóveis que atendem": só o contexto das Oportunidades do painel (vitrine já filtrada + imóveis do próprio corretor) — nada novo é buscado.
S.dem = {}; S.demPed = {}; S.eqc = {};
// Cartão do corretor (05/11/2026, decisão do Cleiton): nos painéis o nome do corretor abre um cartão resumido — nome, equipe e
// WhatsApp, sem CPF, endereço ou dado bancário. Fonte: coleção `equipe_cartoes/<id da ficha>` {nome, curto, tipo, equipe, whatsapp}
// gravada pela diretoria a partir de Cadastros › Pessoas do HUB. Para o dono (Cleiton), também o atalho para o HUB.
const demTx = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const demCorId = (d) => { const R = S.eqc || {}; if (d.autor_id && R[d.autor_id]) return d.autor_id; const k = demTx(d.autor); return k ? Object.keys(R).find((id) => demTx(R[id].nome) === k || demTx(R[id].curto) === k) || '' : ''; };
function demCartaoCor(did) {
  const d = S.dem[did]; if (!d) return; const r = (S.eqc || {})[demCorId(d)] || {};
  let tel = String(r.whatsapp || '').replace(/\D/g, ''); if (tel && !(tel.length >= 12 && tel.startsWith('55'))) tel = '55' + tel;
  let m = document.getElementById('dm-cor'); if (!m) { m = document.createElement('div'); m.id = 'dm-cor'; document.body.appendChild(m); }
  const linha = [r.tipo, r.equipe ? 'Equipe ' + r.equipe : ''].filter(Boolean).join(' · ') || 'Equipe não informada';
  m.innerHTML = `<div class="dm-fundo" data-dmcor-fecha="1"><div class="dm-modal" role="dialog" aria-modal="true" aria-labelledby="dm-cor-t" style="width:min(420px,100%)"><h2 id="dm-cor-t">${esc(r.nome || d.autor || 'Corretor')}</h2><p class="dm-mut" style="margin:0">${esc(linha)}</p>
    <div class="dm-ac">${tel.length >= 12 ? `<a class="b p" href="https://wa.me/${esc(tel)}" target="_blank" rel="noopener">WhatsApp</a>` : '<span class="dm-mut">WhatsApp ainda não cadastrado.</span>'}${S.ehDono ? '<a class="b" href="https://claude.ai/artifact/LR3j38He26qquNQHKunkMx" target="_blank" rel="noopener" title="A ficha completa fica no HUB, em Cadastros › Pessoas">Ficha no HUB ↗</a>' : ''}<button type="button" class="b" data-dmcor-fecha="1">Fechar</button></div></div></div>`;
  const b = m.querySelector('button[data-dmcor-fecha]'); if (b) setTimeout(() => b.focus(), 0);
}
const demFechaCor = () => { const m = document.getElementById('dm-cor'); if (m) m.innerHTML = ''; };
document.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-dmcor],[data-dmcor-fecha]'); if (!t) return;
  if (t.dataset.dmcor) { e.preventDefault(); return demCartaoCor(t.dataset.dmcor); }
  if (t.tagName === 'BUTTON' || e.target === t) demFechaCor(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('#dm-cor .dm-fundo')) demFechaCor(); });
const demEu = () => S.ehDono ? { id: 'hub', nome: 'Diretoria', origem: 'painel:' + (S.info.slug || ''), diretoria: true }
  : { id: S.info.slug || '', nome: S.info.corretor || 'Corretor', origem: 'painel:' + (S.info.slug || ''), diretoria: false };
const demItem = (it, x) => { const fat = [it.dorm ? it.dorm + ' dorm.' : '', it.vagas ? it.vagas + (it.vagas > 1 ? ' vagas' : ' vaga') : '', it.area ? num(it.area, 1) + ' m²' : ''].filter(Boolean).join(' · ');
  return `<div class="dm-it"><b>${esc(it.ref || '')}</b><span>${esc(it.tipo || '')} · ${esc(it.bairro || '')}</span><span>${brl(it.valor)}</span>${fat ? `<span class="dm-mut">${esc(fat)}</span>` : ''}${S.meus[it.id] ? '<span class="dm-mut">agenciado por você</span>' : ''}<button class="b" type="button" data-pmver="${esc(it.id)}">Detalhes</button></div>`; };
const DEM = DEM_NUCLEO({
  ns: 'painel', eu: demEu, docs: () => S.dem, pedidos: () => S.demPed, carregado: () => S.prontos.has('dem'),
  grava: (col, id, doc) => gravar(() => db.collection(col).doc(id).set(doc), 'Salvo.'), pede: () => render(),
  ctx: () => (S.prontos.has('vitrine') ? ctxOp() : null), casar: (p, c, o) => OP.casar(p, c, o),
  bairros: () => [...new Set([...S.vitrine.map((v) => v.bairro), ...Object.values(S.meus).map((m) => m.bairro), ...(S.prontos.has('empDocs') ? empCtx().emps.map((e) => e.bairro) : [])].filter(Boolean).map((b) => String(b).trim()))],
  itemHtml: demItem, aviso: (m) => toast(m),
  autorHtml: (d) => (!d.autor_id || d.autor_id === 'hub' ? '' : `<button type="button" class="dm-lk" data-dmcor="${esc(d._id)}" title="Ver o cartão de ${esc(d.autor || 'corretor')}">${esc(d.autor || '—')}</button>`),
  bloqueioNova: () => (S.ehDono || S.info.slug ? '' : 'Para registrar demandas, o painel precisa da identificação do corretor (atualizada pela rotina diária). Fale com a diretoria.'),
  filtraBusca: (L, resumo) => { const f = BA.filtra(L, qDe('demandas'), (d) => ({ txt: [resumo(d), d.obs, d.autor, d.finalidade, ...(d.bairros || [])].filter(Boolean).join(' · '), docs: [], valores: [d.valor_min, d.valor_max], nums: { dorm: d.dorm_min, suites: d.suites_min, vagas: d.vagas_min } })); if (S.aba === 'demandas') qInfo(f, 'demandas'); return f.lista; },
  btn: 'b', btnP: 'p',
  nota: 'O que os clientes estão procurando, registrado por você, pelos colegas e pela diretoria; todos veem todas. Cada demanda vale 30 dias (Renovar estende). Você edita, renova e encerra as suas; nas dos outros, use “Pedir alteração”. “Imóveis que atendem” mostra os anúncios do site e os seus imóveis que batem com a demanda. As demandas dos colegas chegam pela sincronização de hora em hora.',
});
const vDemandas = () => DEM.render();

// ---------- Abas ----------
const ABAS = [['inicio', 'Início'], ['acaptar', 'A CAPTAR'], ['tarefas', 'Tarefas'], ['leads', 'Meus leads'], ['pesquisa', 'Pesquisar imóveis'], ['imoveis', 'Meus imóveis'], ['empreendimentos', 'Empreendimentos'], ['mapa', 'Mapa'], ['oportunidades', 'Ofertas'], ['demandas', 'Demandas extras'], ['solicitacoes', 'Solicitações']]; // ordem do menu (03/11/2026; 🎯 A CAPTAR logo depois do Início desde 09/11/2026)
const abasOrdenadas = () => ReordAbas.ordena(ABAS.map((a) => a[0]), S.ordemAbas).map((k) => ABAS.find((a) => a[0] === k));
function desenharAbas() {
  if (ReordAbas.ativo()) return; // não redesenha no meio do arraste
  const alt = todosAvisos().filter((a) => a.p === 'alta').length;
  const sts = Object.entries(S.sol).map(([id, s]) => statusDe(id, s));
  const pend = S.ehDono ? sts.filter((x) => x === 'pendente').length : sts.filter((x) => x === 'complemento').length;
  // 03/11/2026 (pedido do Cleiton): Demandas virou a sub-aba "Demandas extras" dentro de Oportunidades — sai do menu e soma o selo em Oportunidades
  // 03/11/2026: Pesquisar imóveis também ganhou sub-abas (Meus imóveis · Empreendimentos · Mapa) — tabela SUBS_P
  const dentro = Object.values(SUBS_P).flatMap((s) => s[1].map((x) => x[0]));
  document.getElementById('abas').innerHTML = abasOrdenadas().filter(([k]) => !dentro.includes(k)).map(([k, l]) => {
    const nop = k === 'oportunidades' ? leadsComOfertas().length + DEM.novas() + DEM.pedAbertos() : 0;   // demandas: novas não vistas + pedidos de alteração em aberto
    const n = k === 'acaptar' ? (S.acap && acapContas().livres ? `<span class="n n-acap" title="Imóveis livres para captar">${acapContas().livres}</span>` : '') : k === 'tarefas' && TF.selo() ? `<span class="n">${TF.selo()}</span>` : k === 'leads' && alt ? `<span class="n">${alt}</span>` : k === 'solicitacoes' && pend ? `<span class="n">${pend}</span>` : nop ? `<span class="n" style="background:var(--warn-bg);color:var(--warn)">${nop}</span>` : '';
    return `<button type="button" role="tab" data-aba="${k}" aria-selected="${S.aba === k || paiP(S.aba) === k}">${l}${n}</button>`;
  }).join('') + (S.ordemAbas ? ReordAbas.botao() : ''); // ↺ Ordem padrão sempre no fim do próprio menu (31/10/2026); na ordem original o clique não faz nada
}

ReordAbas.liga(document.getElementById('abas'), { sel: 'button[data-aba]', attr: 'aba', aoSoltar: (o) => guardarOrdemAbas(o), redesenha: () => desenharAbas() });
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-ord-reset]') && S.ordemAbas) guardarOrdemAbas(null); });

// ---------- Barra de busca da aba ----------
const ROT_ABA_Q = { inicio: 'avisos', leads: 'leads: nome, telefone, origem, perfil, histórico', oportunidades: 'leads e imóveis ofertados: nome, bairro, 2 dorm, valor', demandas: 'demandas: tipo, bairro, autor, 2 dorm, valor', imoveis: 'seus imóveis: ref., rua, proprietário, CPF, 2 dorm, valor', pesquisa: 'anúncios: ref., bairro, rua, item, 2 dorm, 3 vagas, 1,5 mi', empreendimentos: 'empreendimentos e construtoras: nome, construtora, bairro, entrega, 2 dorm, valor', mapa: 'pontos do mapa: bairro, ref., empreendimento, 2 dorm, valor', solicitacoes: 'solicitações: ref., tipo, situação' };
const qDe = (aba) => String(S.q[aba || S.aba] || '').trim();
function pintaBarra() {
  const i = document.getElementById('qAba'), r = document.getElementById('qRes'); if (!i) return;
  if (document.activeElement !== i && i.value !== (S.q[S.aba] || '')) i.value = S.q[S.aba] || '';
  i.placeholder = 'Buscar em ' + (ROT_ABA_Q[S.aba] || 'esta aba') + '…';
  const t = qDe() ? (S.qInfo || '') : ''; if (r.textContent !== t) r.textContent = t;
}
const qInfo = (f, nome) => { if (f && f.ativo) S.qInfo = `${f.lista.length} de ${f.total} ${nome} atende${f.lista.length === 1 ? '' : 'm'} à busca`; };
const hitBA = (x) => x && x._ba ? `<span class="ba-hit">${esc(x._ba)}</span>` : '';
// texto e números de cada tipo de item, para a busca
const baLead = (l) => ({ txt: [l.nome, l.telefone, fone(l.telefone), l.campanha, l.etapa, l.motivo, l.prox_acao, l.imovel_interesse, ...Object.values(l.perfil || {}), ...histDe(l).map((h) => h.texto), ...((l.oport || {}).ia ? (l.oport.ia.ofertas || []).map((o) => o.motivo) : [])].filter((x) => x != null).join(' · '),
  docs: [l.telefone], valores: [(l.perfil || {}).vmin, (l.perfil || {}).vmax], nums: { dorm: (l.perfil || {}).dorm, vagas: (l.perfil || {}).vagas } });
const baImv = (m) => { const pr = m.proprietario || {}; return { txt: [m.ref, m.tipo, m.fin, m.logradouro || m.end, m.numero, m.complemento, m.end, m.bairro, m.cidade, m.cep, m.cor, pr.nome, pr.celular, pr.cpf, ...(m.comodos || []), ...(m.cond_itens || []), ...(m.posicao || []), m.descricao, m.ativo === false ? 'inativo' : m.ativo ? 'ativo' : '', m.dorm ? m.dorm + ' dorm' : '', m.suites ? m.suites + ' suite' : '', m.banh ? m.banh + ' banh' : '', m.vagas ? m.vagas + ' vagas' : '', m.tipologias, m.nome].filter((x) => x != null).join(' · '),
  docs: [pr.celular, pr.cpf, m.cep], valores: [m.valor], nums: { dorm: m.dorm, suites: m.suites, banh: m.banh, vagas: m.vagas } }; };

// sub-abas (03/11/2026): aba-mãe → [rótulo, filhas]; cada filha continua com a aba própria por baixo
const SUBS_P = { oportunidades: ['Ofertas', [['demandas', 'Demandas extras']]], pesquisa: ['Pesquisar imóveis', [['imoveis', 'Meus imóveis'], ['empreendimentos', 'Empreendimentos'], ['mapa', 'Mapa']]] };
const paiP = (k) => Object.keys(SUBS_P).find((m) => SUBS_P[m][1].some((x) => x[0] === k)) || '';
function subOp() { const pai = SUBS_P[S.aba] ? S.aba : paiP(S.aba); if (!pai) return '';
  const n = (k) => k === 'demandas' ? DEM.novas() + DEM.pedAbertos() : 0;
  const bt = (k, t) => `<button type="button" role="tab" data-aba="${k}" aria-pressed="${S.aba === k}" aria-selected="${S.aba === k}">${t}${n(k) ? ` (${n(k)})` : ''}</button>`;
  return `<div class="chips sub-op" role="tablist" aria-label="${esc(SUBS_P[pai][0])}" style="margin:0 0 12px">${bt(pai, SUBS_P[pai][0])}${SUBS_P[pai][1].map((x) => bt(x[0], x[1])).join('')}</div>`; }
// ---------- Tarefas e lembretes (08/11/2026, pedido do Cleiton) ----------
// Tarefas gerais e lembretes do corretor, fora dos leads e das demandas extras. Coleção `tarefas` no banco do painel.
// Origem: corretor (aqui), vivian (pedido no WhatsApp) ou diretoria (atribuída no Gestor ou pela Vivian). As da Vivian e da
// diretoria chegam pela rotina diária hub-vivere-coletores, que também leva as do painel à Vivian (Supabase) — decisão de 08/11/2026.
// Doc tarefas/<id>: {tipo:'tarefa'|'lembrete', titulo, obs, data:'AAAA-MM-DD'|'', hora:'HH:MM'|'', prioridade:'alta'|'media'|'baixa',
//   situacao:'a_fazer'|'feita', feita_em, excluida, origem:'corretor'|'vivian'|'diretoria', por, criado_em, atualizado_em, atualizado_por}
// Gestor/diretoria: `g_tarefas` (foto do dia, Ver como) e `atribuicoes/<id>` {para:<slug>, ...campos, por, criado_em, entregue_em}.
S.tarefas = {}; S.atrib = {}; S.tfFiltro = 'abertas';
const TF = (() => {
  const PRI = [['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']];
  const PRI_I = { alta: 0, media: 1, baixa: 2 };
  const ORIG = { corretor: 'Você', vivian: 'Vivian', diretoria: 'Diretoria' };
  const FILTROS = [['abertas', 'A fazer'], ['hoje', 'Hoje'], ['atrasadas', 'Atrasadas'], ['semana', 'Próximos 7 dias'], ['sem_data', 'Sem data'], ['feitas', 'Feitas'], ['todas', 'Todas']];
  const hm = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const emDias = (n) => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const novoId = () => 't-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const lista = () => Object.entries(S.tarefas || {}).filter(([, t]) => t && !t.excluida && t.titulo).map(([id, t]) => ({ id, ...t }));
  const feita = (t) => t.situacao === 'feita';
  const atrasada = (t) => { if (feita(t) || !t.data) return false; const h = hojeISO(); return t.data < h || (t.data === h && !!t.hora && t.hora < hm()); };
  const deHoje = (t) => !feita(t) && t.data === hojeISO();
  const quando = (t) => (t.data ? t.data + 'T' + (t.hora || '99:99') : null);
  const rotQuando = (t) => { if (!t.data) return 'Sem data'; const h = hojeISO(); const dia = t.data === h ? 'Hoje' : t.data === emDias(1) ? 'Amanhã' : t.data === emDias(-1) ? 'Ontem' : dt(t.data); return dia + (t.hora ? ' · ' + t.hora : ''); };
  const pillPri = (t) => `<span class="pill ${t.prioridade === 'alta' ? 'alta' : t.prioridade === 'media' ? 'media' : ''}">${esc((PRI.find((p) => p[0] === t.prioridade) || PRI[1])[1])}</span>`;
  const pillTipo = (t) => (t.tipo === 'lembrete' ? '<span class="pill tf-lemb">🔔 Lembrete</span>' : '');
  const pillSit = (t) => (feita(t) ? '<span class="pill ok">Feita</span>' : atrasada(t) ? '<span class="pill alta">Atrasada</span>' : deHoje(t) ? '<span class="pill media">Hoje</span>' : '');
  const rotOrig = (t) => { if (S.gestor && (t.origem || 'corretor') === 'corretor') return esc(t._dono ? gCurto(t._dono) : 'Corretor'); const o = ORIG[t.origem] || ORIG.corretor; return t.origem === 'diretoria' && t.por ? `${o} · ${esc(t.por)}` : esc(o); };
  const ba = (t) => ({ txt: [t.titulo, t.obs, ORIG[t.origem], t.por, t.tipo === 'lembrete' ? 'lembrete' : 'tarefa'].filter(Boolean).join(' · ') });
  const filtra = (L, f) => {
    const h = hojeISO(), sem = emDias(7);
    if (f === 'hoje') return L.filter((t) => deHoje(t));
    if (f === 'atrasadas') return L.filter(atrasada);
    if (f === 'semana') return L.filter((t) => !feita(t) && t.data && t.data >= h && t.data <= sem);
    if (f === 'sem_data') return L.filter((t) => !feita(t) && !t.data);
    if (f === 'feitas') return L.filter(feita);
    if (f === 'todas') return L;
    return L.filter((t) => !feita(t));
  };
  const selo = () => lista().filter((t) => atrasada(t) || deHoje(t)).length;
  const btOk = (t) => `<button type="button" class="tf-ok${feita(t) ? ' on' : ''}" data-tf-ok="${esc(t.id)}" aria-pressed="${feita(t)}" aria-label="${feita(t) ? 'Reabrir' : 'Marcar como feita'}: ${esc(t.titulo)}" title="${feita(t) ? 'Reabrir' : 'Marcar como feita'}">✓</button>`;
  const soLer = () => S.gestor;

  function vista() {
    const L0 = lista();
    const cont = (f) => filtra(L0, f).length;
    const fb = BA.filtra(qDe() ? L0 : filtra(L0, S.tfFiltro), qDe(), ba);
    const L = fb.lista; qInfo(fb, 'tarefas');
    const cols = [
      { k: '_ok', l: 'Feita', ord: false, h: btOk },
      { k: 'titulo', l: 'Tarefa', h: (t) => `<b class="tf-tit${feita(t) ? ' tf-feita' : ''}">${esc(t.titulo)}</b> ${pillTipo(t)}${hitBA(t)}${t.obs ? `<div class="mut peq tf-obs">${esc(t.obs)}</div>` : ''}` },
      { k: '_quando', l: 'Quando', v: quando, h: (t) => `${esc(rotQuando(t))} ${pillSit(t)}` },
      { k: 'prioridade', l: 'Prioridade', v: (t) => PRI_I[t.prioridade] ?? 1, h: pillPri },
      { k: 'origem', l: 'Origem', h: (t) => `<span class="peq">${rotOrig(t)}</span>` },
      { k: 'criado_em', l: 'Criada', h: (t) => `<span class="peq">${dt(t.criado_em)}</span>` },
    ];
    if (S.gestor && S.verComo === 'todos') cols.splice(1, 0, { k: '_dono', l: 'Corretor', v: (t) => gCurto(t._dono || ''), h: (t) => `<span class="peq">${esc(gCurto(t._dono || ''))}</span>` });
    const cartao = (t) => `<div class="cm-l1">${btOk(t)}<span class="cm-nome tf-tit${feita(t) ? ' tf-feita' : ''}">${esc(t.titulo)}</span>${pillTipo(t)}${hitBA(t)}<span class="cm-v">${pillPri(t)}</span></div>
      <div class="cm-lin"><b>${esc(rotQuando(t))}</b> ${pillSit(t)} · ${rotOrig(t)}${S.gestor && S.verComo === 'todos' && t._dono && (t.origem || 'corretor') !== 'corretor' ? ' · para ' + esc(gCurto(t._dono)) : ''}</div>${t.obs ? `<div class="cm-lin mut">${esc(t.obs)}</div>` : ''}`;
    const quem = S.gestor ? (S.verComo === 'todos' ? 'de todos os painéis' : 'de ' + esc(gCurto(S.verComo))) : '';
    const nota = S.gestor
      ? `Tarefas ${quem}, na foto do dia (só leitura). Para passar uma tarefa a um corretor, use “+ Atribuir tarefa”: ela chega ao painel dele na próxima rodada diária.`
      : 'Suas tarefas e lembretes do dia a dia, fora dos leads. A Vivian também anota aqui o que você pedir pelo WhatsApp, e a diretoria pode passar tarefas para você; as delas chegam na rodada diária da Vivere.';
    return `<section class="sec">
    <div class="linha" style="justify-content:space-between"><div><h2 style="margin:0">Tarefas e lembretes</h2><p class="mut peq" style="margin:2px 0 0">${nota}</p></div>
      <div class="linha">${S.gestor ? '<button class="b p" type="button" data-tf-atrib="">+ Atribuir tarefa</button>' : '<button class="b p" type="button" data-tf-nova="">+ Nova tarefa</button>'}</div></div>
    ${qDe() ? '<p class="mut peq" style="margin:0">Com a busca, a lista procura em todas as tarefas, feitas ou não.</p>' : ''}
    <div class="chips" role="group" aria-label="Filtrar tarefas"${qDe() ? ' hidden' : ''}>${FILTROS.map(([k, t]) => `<button type="button" data-tf-filtro="${k}" aria-pressed="${S.tfFiltro === k}">${esc(t)} (${cont(k)})</button>`).join('')}</div>
    ${tabela('tarefas', cols, L, { padrao: { c: '_quando', d: 1 }, abre: (t) => 'tarefa:' + t.id, cartao, vazio: S.tfFiltro === 'abertas' && !qDe() ? 'Nada a fazer por aqui. Toque em “+ Nova tarefa” para anotar.' : 'Nenhuma tarefa neste filtro.' })}
    ${S.gestor ? blocoAtrib() : ''}
    </section>`;
  }

  // Bloco do Início: atrasadas e de hoje, com o ✓ à mão
  function blocoHoje() {
    const L = lista().filter((t) => atrasada(t) || deHoje(t)).sort((a, b) => String(quando(a)).localeCompare(String(quando(b))) || (PRI_I[a.prioridade] ?? 1) - (PRI_I[b.prioridade] ?? 1));
    const semData = lista().filter((t) => !feita(t) && !t.data).length;
    const itens = L.slice(0, 6).map((t) => `<div class="aviso tf-av">${btOk(t)}<div><b>${esc(t.titulo)}</b> ${pillTipo(t)}<div class="o">${esc(rotQuando(t))} ${pillSit(t)} · ${rotOrig(t)}</div></div><button class="b" type="button" data-abre="tarefa:${esc(t.id)}">Abrir</button></div>`).join('');
    return `<div class="painel tf-hoje"><div class="linha" style="justify-content:space-between"><h2 style="margin:0">Tarefas de hoje</h2><div class="linha">${S.gestor ? '' : '<button class="b" type="button" data-tf-nova="">+ Nova</button>'}<button class="b" type="button" data-aba="tarefas">Ver todas</button></div></div>
      ${itens || `<div class="vazio" style="padding:10px 0">Nenhuma tarefa para hoje${semData ? ` · ${semData} sem data em <button class="copiar" type="button" data-aba="tarefas">Tarefas</button>` : ''}.</div>`}
      ${L.length > 6 ? `<p class="mut peq" style="margin:6px 0 0">e mais ${L.length - 6} em <button class="copiar" type="button" data-aba="tarefas">Tarefas</button>.</p>` : ''}</div>`;
  }

  // ---------- Gavetas ----------
  const campos = (t) => `
      <label class="c">Tipo<select id="tfTipo"><option value="tarefa"${t.tipo !== 'lembrete' ? ' selected' : ''}>Tarefa</option><option value="lembrete"${t.tipo === 'lembrete' ? ' selected' : ''}>Lembrete</option></select></label>
      <label class="c">Prioridade<select id="tfPri">${PRI.map(([k, l]) => `<option value="${k}"${(t.prioridade || 'media') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="c inteiro">O que fazer<input id="tfTit" required maxlength="160" value="${esc(t.titulo || '')}" placeholder="Ex.: levar as chaves do AP336 ao chaveiro"></label>
      <label class="c">Data (opcional)<input id="tfData" type="date" value="${esc(t.data || '')}"></label>
      <label class="c">Hora (opcional)<input id="tfHora" type="time" value="${esc(t.hora || '')}"></label>
      <label class="c inteiro">Observação (opcional)<textarea id="tfObs" maxlength="800" placeholder="Detalhes, endereço, com quem falar">${esc(t.obs || '')}</textarea></label>`;
  function gaveta(id) {
    const novo = !id, t = novo ? { tipo: 'tarefa', prioridade: 'media', data: S.tfData || '' } : (S.tarefas || {})[id];
    if (!t) return '';
    const info = novo ? '' : `<p class="mut peq" style="margin:4px 0 0">${rotOrig(t)} · criada em ${dt(t.criado_em)}${feita(t) && t.feita_em ? ' · feita em ' + dt(t.feita_em) : ''}</p>`;
    return `<div class="gaveta" role="dialog" aria-modal="true" aria-label="Tarefa">
    <div class="cab"><div><p class="mut peq" style="margin:0">${novo ? 'Anotar' : t.tipo === 'lembrete' ? 'Lembrete' : 'Tarefa'}</p><h3>${novo ? 'Nova tarefa' : esc(t.titulo)}</h3>${novo ? '' : pillSit(t)}${info}</div><button class="b" type="button" data-fechar>Fechar</button></div>
    ${soLer() ? `<div class="painel"><p style="margin:0">${esc(t.obs || 'Sem observação.')}</p><p class="mut peq" style="margin:8px 0 0">${esc(rotQuando(t))} · prioridade ${esc((PRI.find((p) => p[0] === t.prioridade) || PRI[1])[1])}. Só leitura no painel do gestor.</p></div>` : `
    <form id="fTarefa" class="form" data-id="${esc(id || '')}">${campos(t)}
      <div class="inteiro linha"><button class="b p" type="submit">${novo ? 'Anotar' : 'Salvar'}</button>${novo ? '' : `<button class="b" type="button" data-tf-ok="${esc(id)}">${feita(t) ? 'Reabrir' : '✓ Marcar como feita'}</button><button class="b" type="button" data-tf-exc="${esc(id)}">Excluir</button>`}<span class="erro" id="eTarefa"></span></div>
    </form>`}
  </div>`;
  }
  function gavetaAtrib() {
    const P = gPaineis();
    return `<div class="gaveta" role="dialog" aria-modal="true" aria-label="Atribuir tarefa">
    <div class="cab"><div><p class="mut peq" style="margin:0">Diretoria · chega ao painel do corretor na próxima rodada diária</p><h3>Atribuir tarefa</h3></div><button class="b" type="button" data-fechar>Fechar</button></div>
    <form id="fAtrib" class="form">
      <label class="c inteiro">Para<select id="tfPara" required><option value="">Escolha o corretor</option>${P.map((p) => `<option value="${esc(p.slug)}"${S.verComo === p.slug ? ' selected' : ''}>${esc(p.nome || p.slug)}</option>`).join('')}</select></label>
      ${campos({ tipo: 'tarefa', prioridade: 'media' })}
      <div class="inteiro linha"><button class="b p" type="submit">Atribuir</button><span class="erro" id="eAtrib"></span></div>
    </form></div>`;
  }
  function blocoAtrib() {
    const A = Object.entries(S.atrib || {}).map(([id, a]) => ({ id, ...a })).filter((a) => a && a.titulo && !a.cancelada).sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
    if (!A.length) return '';
    const linha = (a) => `<div class="aviso"><span class="pill ${a.entregue_em ? 'ok' : 'media'}">${a.entregue_em ? 'Entregue' : 'Aguardando'}</span><div><b>${esc(a.titulo)}</b> · para ${esc(gNome(a.para))}<div class="o">${esc(a.data ? dt(a.data) + (a.hora ? ' ' + a.hora : '') : 'Sem data')} · por ${esc(a.por || 'diretoria')} · ${a.entregue_em ? 'entregue em ' + dt(a.entregue_em) : 'criada em ' + dt(a.criado_em)}</div></div>${a.entregue_em ? '' : `<button class="b" type="button" data-tf-cancatrib="${esc(a.id)}">Cancelar</button>`}</div>`;
    return `<div class="painel" style="margin-top:14px"><h2 style="margin-bottom:6px">Atribuídas pela diretoria</h2>${A.slice(0, 30).map(linha).join('')}</div>`;
  }

  // ---------- Escritas ----------
  const ler = () => {
    const v = (i) => (document.getElementById(i) || {}).value || '';
    return { tipo: v('tfTipo') === 'lembrete' ? 'lembrete' : 'tarefa', prioridade: PRI_I[v('tfPri')] != null ? v('tfPri') : 'media', titulo: v('tfTit').trim().slice(0, 160), obs: v('tfObs').trim().slice(0, 800), data: /^\d{4}-\d{2}-\d{2}$/.test(v('tfData')) ? v('tfData') : '', hora: /^\d{2}:\d{2}$/.test(v('tfHora')) ? v('tfHora') : '' };
  };
  async function salvar(form) {
    const id = form.dataset.id, x = ler();
    if (!x.titulo) { const e = document.getElementById('eTarefa'); if (e) e.textContent = 'Escreva o que fazer.'; return; }
    if (x.hora && !x.data) x.data = hojeISO();   // hora sem data = hoje
    const base = { ...x, atualizado_em: agora(), atualizado_por: 'painel' };
    const ok = id
      ? await gravar(() => db.collection('tarefas').doc(id).update(base), 'Tarefa salva.')
      : await gravar(() => db.collection('tarefas').doc(novoId()).set({ ...base, situacao: 'a_fazer', feita_em: '', excluida: false, origem: 'corretor', por: S.info.corretor || '', criado_em: agora() }), 'Tarefa anotada.');
    if (ok) fechar();
  }
  async function alternar(id) {
    const t = (S.tarefas || {})[id]; if (!t) return;
    const f = !feita(t);
    const ok = await gravar(() => db.collection('tarefas').doc(id).update({ situacao: f ? 'feita' : 'a_fazer', feita_em: f ? agora() : '', atualizado_em: agora(), atualizado_por: 'painel' }), f ? 'Feita. ✓' : 'Tarefa reaberta.');
    if (ok && S.aberto && S.aberto.tipo === 'tarefa') fechar();
  }
  async function excluir(id, bt) {
    if (!bt.dataset.confirma) { bt.dataset.confirma = '1'; bt.textContent = 'Toque de novo para excluir'; return; }
    // exclusão marcada (excluida: true) para a rotina levar à Vivian; a linha some do painel
    const ok = await gravar(() => db.collection('tarefas').doc(id).update({ excluida: true, atualizado_em: agora(), atualizado_por: 'painel' }), 'Tarefa excluída.');
    if (ok) fechar();
  }
  async function atribuir(form) {
    const para = (document.getElementById('tfPara') || {}).value || '', x = ler(), e = document.getElementById('eAtrib');
    if (!para) { if (e) e.textContent = 'Escolha o corretor.'; return; }
    if (!x.titulo) { if (e) e.textContent = 'Escreva o que fazer.'; return; }
    if (x.hora && !x.data) x.data = hojeISO();
    try {
      await db.collection('atribuicoes').doc('a-' + novoId().slice(2)).set({ ...x, para, por: (String(S.info.saudacao || '').trim() || S.info.corretor || 'Diretoria'), criado_em: agora(), entregue_em: '', cancelada: false });
      toast(`Tarefa atribuída a ${gCurto(para)}. Chega ao painel dele na próxima rodada diária.`); fechar();
    } catch (er) { if (e) e.textContent = 'Não foi possível salvar: ' + (er && er.code === 'invalid_argument' ? 'sem permissão neste painel.' : (er && er.message) || 'erro desconhecido'); }
  }
  async function cancelarAtrib(id) {
    try { await db.collection('atribuicoes').doc(id).update({ cancelada: true }); toast('Atribuição cancelada.'); }
    catch (er) { toast('Não foi possível cancelar: ' + ((er && er.message) || 'erro desconhecido')); }
  }

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('[data-tf-ok],[data-tf-nova],[data-tf-atrib],[data-tf-filtro],[data-tf-exc],[data-tf-cancatrib]'); if (!b) return;
    const d = b.dataset;
    if (d.tfOk) { ev.stopPropagation(); return alternar(d.tfOk); }
    if (d.tfNova !== undefined) { if (S.gestor) return toast(SO_LEITURA); return abrir('tarefa', null); }
    if (d.tfAtrib !== undefined) return abrir('atrib', null);
    if (d.tfFiltro) { S.tfFiltro = d.tfFiltro; return render(); }
    if (d.tfExc) return excluir(d.tfExc, b);
    if (d.tfCancatrib) return cancelarAtrib(d.tfCancatrib);
  }, true);
  document.addEventListener('submit', (ev) => {
    if (ev.target.id === 'fTarefa') { ev.preventDefault(); salvar(ev.target); }
    else if (ev.target.id === 'fAtrib') { ev.preventDefault(); atribuir(ev.target); }
  });
  return { vista, blocoHoje, gaveta, gavetaAtrib, selo, lista, atrasada, deHoje };
})();
const vTarefas = () => TF.vista();

ROT_ABA_Q.tarefas = 'tarefas e lembretes: título, observação, origem';
// ---------- A CAPTAR no painel: botão fixo no cabeçalho e aba própria (09/11/2026, pedido do Cleiton) ----------
// Objetivo: levar o corretor ao A CAPTAR com o menor caminho. Regras que seguem valendo: a trava é feita no próprio A CAPTAR,
// em tempo real, e vale 7 dias desde o último contato registrado; nome, telefone e link só para quem travou; Captei com 1 Capcoin
// por busca e OK da diretoria. A lista daqui é a foto do dia (acaptar/estado + captados, pela Entrega Captação da rotina diária).
// O claude.ai não repassa o endereço (# ou ?) à página publicada (testado em 09/11/2026), então o botão 🎯 de cada imóvel copia
// o código (AC- + 6 caracteres do id opaco do captado, o mesmo que a rotina grava no A CAPTAR) e abre o A CAPTAR; lá o corretor
// cola o código na caixa "Código do painel" e cai direto no imóvel. O código não revela o anúncio nem o dono.
const acapCod = (k) => /^k[0-9a-f]{6}/.test(String(k)) ? 'AC-' + String(k).slice(1, 7).toUpperCase() : '';
const acapPrim = (s) => String(s || '').trim().split(/\s+/)[0] || '';
function acapItens() {
  const A = S.acap || {}, base = A.base || {}, capt = A.captei || {}, trv = A.travas || {}, C = S.capt || {};
  const ids = [...new Set([...Object.keys(base), ...Object.keys(capt), ...Object.keys(trv).filter((k) => trv[k] && trv[k].uid)])];
  return ids.map((k) => {
    const c = C[k] || {}, tv = acapTrava(k), x = Object.assign({}, tv || {}, c);
    const sit = tv ? (acapEhMinha(tv) ? 'minha' : 'outro') : c.situacao === 'meu' ? 'dist' : c.situacao === 'outro' ? 'outro' : 'livre';
    return { id: k, cod: acapCod(k), lista: base[k] ? 'disp' : capt[k] ? 'captei' : 'disp', sit, tv, quem: tv ? acapPrim(tv.nome) : '', vence: tv ? tv.vence || '' : '',
      tipo: x.tipo || 'Imóvel', fin: x.fin || '', bairro: x.bairro || '', valor: +x.valor || null, dorm: +x.dorm || null, area: +x.area || null,
      foto_id: c.foto_id || '', end: endCapt(c) || endCapt(tv), coletado_em: c.coletado_em || String((tv && tv.desde) || '').slice(0, 10), estrelas: +c.estrelas || 0,
      lead_painel: c.lead_painel || '' };
  });
}
function acapContas() {
  const L = acapItens();
  return { livres: L.filter((r) => r.lista === 'disp' && r.sit === 'livre').length, captei: L.filter((r) => r.lista === 'captei' && r.sit === 'livre').length,
    minhas: L.filter((r) => r.sit === 'minha').length, outros: L.filter((r) => r.sit === 'outro').length, total: L.length };
}
// botão fixo no cabeçalho, ao lado do tema e do olho (e na barra mínima do celular): leva direto ao A CAPTAR
function pintaBtnAcap() {
  const t = document.getElementById('btnTema'); if (!t) return;
  let b = document.getElementById('btnAcap');
  if (!b) { b = document.createElement('a'); b.id = 'btnAcap'; b.className = 'btn-tema btn-acap'; b.target = '_blank'; b.rel = 'noopener'; t.parentNode.insertBefore(b, t); }
  const c = acapContas(), tem = !!S.acap;
  if (b.getAttribute('href') !== acapUrl()) b.setAttribute('href', acapUrl());
  const h = `<span class="ba-ic" aria-hidden="true">🎯</span><span class="ba-t">A CAPTAR</span>${tem ? `<span class="ba-n"><b>${c.livres}</b> livre${c.livres === 1 ? '' : 's'}</span><span class="ba-n ba-m"><b>${c.minhas}</b> ${c.minhas === 1 ? 'seu' : 'seus'}</span>` : ''}`;
  if (b.innerHTML !== h) b.innerHTML = h;
  const rot = tem ? `A CAPTAR: ${c.livres} imóve${c.livres === 1 ? 'l livre' : 'is livres'} para captar e ${c.minhas} em captação por você. Abre o A CAPTAR em outra aba.` : 'Abrir o A CAPTAR em outra aba: imóveis de proprietários para a Vivere captar.';
  if (b.title !== rot) { b.title = rot; b.setAttribute('aria-label', rot); }
  const m = document.querySelector('.topo-mini .tm-acap');
  if (m) { if (m.getAttribute('href') !== acapUrl()) m.setAttribute('href', acapUrl()); const hm = `🎯${tem ? ` <b>${c.livres}</b>·<b>${c.minhas}</b>` : ' A CAPTAR'}`; if (m.innerHTML !== hm) m.innerHTML = hm; m.title = rot; m.setAttribute('aria-label', rot); }
}
const SIT_ACAP = { minha: 0, dist: 1, livre: 2, outro: 3 };
function seloAcap(r) {
  if (r.sit === 'minha') return `<span class="pill ok">🎯 Em captação por você${r.vence ? ' até ' + esc(dt(r.vence).slice(0, 5)) : ''}</span>`;
  if (r.sit === 'outro') return r.tv ? `<span class="pill media">Em captação por ${r.quem ? esc(r.quem) : 'outro corretor'}</span>` : '<span class="pill media">Com outro corretor (diretoria)</span>';
  if (r.sit === 'dist') return '<span class="pill ok">Distribuído a você</span>';
  return r.lista === 'captei' ? '<span class="pill acap-cp">Livre · sem contato (Captei)</span>' : '<span class="pill acap-lv">Livre</span>';
}
function acaoAcap(r, curto) {
  if (r.sit === 'outro') return '<span class="peq mut">Outro corretor está captando. Não oferte.</span>';
  if (r.sit === 'dist') return r.lead_painel && S.leads[r.lead_painel] ? `<button class="b p" type="button" data-lead="${esc(r.lead_painel)}">Abrir o proprietário</button>` : '<span class="peq mut">Distribuído a você: chega em Meus leads na próxima entrega.</span>';
  if (!r.cod) return linkAcap('Abrir o A CAPTAR', 'b');
  const rot = curto ? (r.sit === 'minha' ? '🎯 Abrir no A CAPTAR' : r.lista === 'captei' ? '🎯 Pedir o Captei (1 Capcoin)' : '🎯 Captar no A CAPTAR') : (r.sit === 'minha' ? '🎯 Abrir' : r.lista === 'captei' ? '🎯 Pedir Captei' : '🎯 Captar');
  return `<button class="b${r.sit === 'minha' ? '' : ' p'}" type="button" data-acapir="${esc(r.cod)}" title="Copia o código ${esc(r.cod)} e abre o A CAPTAR: cole o código na caixa “Código do painel”">${rot}</button>`;
}
const codAcap = (r) => r.cod ? `<button class="copiar acap-cod" type="button" data-acapcopia="${esc(r.cod)}" title="Copiar o código para colar no A CAPTAR">${esc(r.cod)}</button>` : '';
const fotoAcap = (r, cls) => r.foto_id ? `<img class="acap-ft${cls ? ' ' + cls : ''}" src="${esc('/_blob/' + r.foto_id)}" alt="Foto do imóvel" loading="lazy">` : `<span class="acap-ft sem${cls ? ' ' + cls : ''}" aria-hidden="true">🏠</span>`;
const valAcap = (r) => r.valor ? `<span data-sens>${esc(r.fin === 'Locação' ? brl(r.valor) + '/mês' : brl(r.valor))}</span>` : '—';
S.acapF = (() => { try { return sessionStorage.getItem('painel.acapF') || 'livres'; } catch (e) { return 'livres'; } })();
ROT_ABA_Q.acaptar = 'imóveis a captar: bairro, tipo, rua, código, 2 dorm, valor';
function vAcaptar() {
  const L0 = acapItens(), A = S.acap || {}, c = acapContas();
  const FIL = [['livres', 'Livres para captar', (r) => r.lista === 'disp' && r.sit === 'livre', c.livres], ['minhas', 'Em captação por você', (r) => r.sit === 'minha' || r.sit === 'dist', c.minhas],
    ['captei', 'Captei · 1 Capcoin', (r) => r.lista === 'captei' && r.sit === 'livre', c.captei], ['outros', 'Com outros corretores', (r) => r.sit === 'outro', c.outros], ['todos', 'Todos', () => true, L0.length]];
  const f = FIL.find((x) => x[0] === S.acapF) || FIL[0];
  const fB = BA.filtra(L0.filter(f[2]), qDe('acaptar'), (r) => ({ txt: [r.tipo, r.fin, r.bairro, r.end, r.cod, r.quem].filter(Boolean).join(' · '), docs: [], valores: [r.valor], nums: { dorm: r.dorm } }));
  const L = fB.lista; if (S.aba === 'acaptar') qInfo(fB, 'imóveis');
  const cols = [
    { k: '_foto', l: 'Foto', ord: false, h: (r) => fotoAcap(r) },
    { k: 'tipo', l: 'Imóvel', h: (r) => `<b>${esc(r.tipo)}</b>${hitBA(r)}<div class="mut peq">${esc(r.fin || '')}</div>${codAcap(r)}` },
    { k: 'bairro', l: 'Bairro e endereço', h: (r) => `${esc(r.bairro || '—')}${r.end ? `<div class="mut peq" data-sens>${esc(r.end)}</div>` : ''}` },
    { k: 'valor', l: 'Valor', n: true, h: valAcap },
    { k: 'dorm', l: 'Dorm.', n: true, h: (r) => num(r.dorm) },
    { k: 'area', l: 'Área', n: true, h: (r) => r.area ? num(r.area) + ' m²' : '—' },
    { k: 'coletado_em', l: 'Achado em', h: (r) => r.coletado_em ? `<span style="white-space:nowrap">${dt(r.coletado_em)}</span>` : '—' },
    { k: '_sit', l: 'Situação', v: (r) => SIT_ACAP[r.sit] * 10 + (r.lista === 'captei' ? 1 : 0), h: seloAcap },
    { k: '_acao', l: 'No A CAPTAR', ord: false, h: (r) => acaoAcap(r, false) },
  ];
  const vazio = !S.acap ? 'A lista do A CAPTAR chega neste painel uma vez por dia, de manhã. Enquanto isso, abra o A CAPTAR pelo botão acima.'
    : f[0] === 'minhas' ? 'Você não está captando nenhum imóvel agora. Escolha um em “Livres para captar”.' : 'Nenhum imóvel neste filtro.';
  return `<section class="sec acap-aba"><div class="linha" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>🎯 A CAPTAR</h2>${linkAcap('Abrir o A CAPTAR ↗', 'b p')}</div>
    <p class="peq mut acap-como">Imóveis de proprietários que anunciam direto e ainda não estão na Vivere. Toque em <b>🎯</b> no imóvel: o código é copiado e o A CAPTAR abre; cole o código na caixa <b>“Código do painel”</b> e trave o imóvel em seu nome. Nome, telefone e o anúncio aparecem lá, só para você; a trava vale 7 dias desde o último contato registrado.</p>
    <div class="cartoes acap-cts">
      <button type="button" class="cartao" data-acapf="livres"><div class="r">Livres para captar</div><div class="v">${c.livres}</div><div class="s">com contato do proprietário</div></button>
      <button type="button" class="cartao" data-acapf="minhas"><div class="r">Em captação por você</div><div class="v">${c.minhas}</div><div class="s">trava de 7 dias no A CAPTAR</div></button>
      <button type="button" class="cartao" data-acapf="captei"><div class="r">Captei</div><div class="v">${c.captei}</div><div class="s">sem contato · 1 Capcoin com OK</div></button>
      <button type="button" class="cartao" data-acapf="outros"><div class="r">Com outros corretores</div><div class="v">${c.outros}</div><div class="s">não oferte</div></button>
    </div>
    <div class="chips acap-fil" role="tablist" aria-label="Filtrar os imóveis a captar">${FIL.map(([k, l, , n]) => `<button type="button" role="tab" data-acapf="${k}" aria-pressed="${k === f[0]}" aria-selected="${k === f[0]}">${esc(l)} (${n})</button>`).join('')}</div>
    <div class="acap-lista">${tabela('acap', cols, L, { padrao: { c: 'coletado_em', d: -1 }, vazio, cartao: (r) => `<div class="com-capa">${fotoAcap(r, 'g')}<div class="txt">
      <div class="cm-l1"><span class="cm-nome">${esc(r.tipo)} · ${esc(r.bairro || '—')}</span>${hitBA(r)}<b class="cm-v">${valAcap(r)}</b></div>
      ${r.end ? `<div class="cm-lin" data-sens>${esc(r.end)}</div>` : ''}
      <div class="acap-cg"><div><span class="r">Negócio</span>${esc(r.fin || '—')}</div><div><span class="r">Dorm.</span>${num(r.dorm)}</div><div><span class="r">Área</span>${r.area ? num(r.area) + ' m²' : '—'}</div><div><span class="r">Achado em</span>${r.coletado_em ? dt(r.coletado_em) : '—'}</div></div>
      <div class="cm-acoes acap-ac">${seloAcap(r)}${codAcap(r)}${acaoAcap(r, true)}</div></div></div>` })}</div>
    <p class="status">Lista do dia${A.atualizado_em ? ` (atualizada em ${esc(dt(String(A.atualizado_em).replace(' ', 'T')))})` : ''}: chega 1 vez por dia, de manhã. A trava acontece no A CAPTAR, na hora; o selo daqui pode estar até 1 dia atrás.</p></section>`;
}
document.addEventListener('click', (ev) => {
  const t = ev.target.closest && ev.target.closest('[data-acapir],[data-acapcopia],[data-acapf]'); if (!t) return;
  if (t.dataset.acapf) { S.acapF = t.dataset.acapf; try { sessionStorage.setItem('painel.acapF', S.acapF); } catch (e) {} if (S.aba !== 'acaptar') { S.aba = 'acaptar'; try { sessionStorage.setItem('painel.aba', S.aba); } catch (e) {} } render(); return; }
  ev.preventDefault(); ev.stopPropagation();
  const cod = t.dataset.acapir || t.dataset.acapcopia;
  const avisa = (ok) => toast(ok ? `Código ${cod} copiado. ${t.dataset.acapir ? 'No A CAPTAR, cole' : 'Cole'} na caixa “🎯 Código do painel”.` : `Copie o código ${cod} e cole na caixa “🎯 Código do painel” do A CAPTAR.`);
  try { navigator.clipboard.writeText(cod).then(() => avisa(true), () => avisa(false)); } catch (e) { avisa(false); }
  if (t.dataset.acapir) window.open(acapUrl(), '_blank', 'noopener');
}, true);
(function () { const st = document.createElement('style'); st.id = 'css-acaptar-aba'; st.textContent = '.btn-acap{display:inline-flex;align-items:center;gap:6px;text-decoration:none;border-color:var(--brass);color:var(--ink)}.btn-acap:hover{background:var(--soft)}.btn-acap .ba-t{font-weight:600;letter-spacing:.06em}.btn-acap .ba-n{font-size:12px;color:var(--muted);white-space:nowrap;padding-left:6px;border-left:1px solid var(--line)}.btn-acap .ba-n b{color:var(--ok-selo);font-weight:700}.btn-acap .ba-m b{color:var(--brass)}.topo-mini .tm-acap{display:none}@media (max-width:700px){.marca{row-gap:8px}.btn-acap{order:5;flex:1 1 100%;justify-content:center;padding:8px 12px}.topo-mini .tm-acap{display:inline-flex;align-items:center;gap:2px;flex:none;border:1px solid var(--brass);background:var(--panel);color:var(--ink);border-radius:999px;padding:6px 10px;font:500 13px var(--body);text-decoration:none;white-space:nowrap}.topo-mini .tm-acap b{font-weight:700;color:var(--ok-selo)}.topo-mini .tm-acap b+b{color:var(--brass)}}.acap-cts .cartao{text-align:left;font:inherit;color:inherit;cursor:pointer}.acap-cts .cartao:hover{border-color:var(--brass)}.acap-fil{margin:12px 0 10px}.acap-como{margin:4px 0 12px;max-width:80ch}.pill.acap-lv{background:var(--ok-bg);color:var(--ok-selo)}.pill.acap-cp{background:var(--soft);color:var(--brass)}.acap-cod{font:600 11px/1.5 var(--body)!important;letter-spacing:.06em;color:var(--brass)!important;margin-top:2px}.acap-ft{display:block;width:72px;aspect-ratio:4/3;object-fit:cover;border-radius:8px;border:1px solid var(--line);background:var(--soft)}.acap-ft.sem{display:grid;place-items:center;font-size:22px}.acap-ft.g{width:96px;flex:none}.acap-lista .lista-m{container-type:inline-size}.acap-cg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 12px;font-size:13px;font-variant-numeric:tabular-nums}.acap-cg>div{min-width:0}.acap-cg .r{display:block;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}.acap-lista td .b{white-space:nowrap}.acap-ac{align-items:center;gap:6px 10px}.acap-ac .b{margin-left:auto}@container (min-width:520px){.acap-cg{grid-template-columns:repeat(4,minmax(0,1fr))}.acap-ft.g{width:132px}}@container (max-width:420px){.acap-ac .b{margin-left:0;flex:1 1 100%;justify-content:center}.acap-ft.g{width:84px}}'; document.head.appendChild(st); })();

function render() {
  if (S.aba === 'acaptar') { S.aba = 'inicio'; try { sessionStorage.setItem('painel.aba', 'inicio'); sessionStorage.setItem('painel.volta', location.pathname.split('/').pop() + location.search); } catch (e) {} location.href = acapUrl(); }
  desenharAbas();
  document.getElementById('nomeCorretor').textContent = S.gestor ? rotGestor() : (S.info.corretor || 'Corretor');
  const el = document.getElementById('conteudo');
  if (S.dbEstado === 'carregando') { el.innerHTML = '<div class="vazio">Carregando os seus dados…</div>'; return; }
  if (!db) { el.innerHTML = `<div class="painel vazio">Não foi possível abrir os seus dados. Entre no claude.ai com o e-mail que recebeu o convite e abra este painel de novo.</div>`; return; }
  if (!S.prontos.has('leads') && !S.prontos.has('meus')) { el.innerHTML = '<div class="vazio">Carregando os seus dados…</div>'; return; }
  S.qInfo = '';
  const aeQ = document.activeElement, fq = aeQ && aeQ.id === 'oplf-q' ? [aeQ.selectionStart, aeQ.selectionEnd] : null;
  el.innerHTML = (S.gestor ? barraGestor() : '') + subOp() + ({ gestor: S.gestor ? vGestor : vInicio, inicio: vInicio, acaptar: vAcaptar, tarefas: vTarefas, leads: vLeads, oportunidades: vOport, demandas: vDemandas, imoveis: vImoveis, pesquisa: vPesquisa, empreendimentos: vEmp, mapa: vMapa, solicitacoes: vSolic }[S.aba] || vInicio)();
  if (fq) { const q = document.getElementById('oplf-q'); if (q) { q.focus(); try { q.setSelectionRange(fq[0], fq[1]); } catch (_) {} } }
  pintaBarra();
  montaMapa();
}

// ---------- Painel do gestor: foto do dia dos painéis, "Ver como" (só leitura) e visão geral (05/11/2026) ----------
// Decisões do Cleiton (05/11/2026): o modelo vira 🔵🧩PAINEL DO GESTOR; "Ver como" (Todos e cada corretor) é só leitura;
// os dados chegam numa foto 1x por dia pela rotina hub-vivere-coletores (tempo real só com o app único + Supabase).
// Coleções no banco do gestor, cada documento com _dono (slug do corretor) e _id (o id no painel dele):
// g_leads · g_meus · g_sol · g_eventos · g_decisoes · g_captados; g_paineis/<slug> = {nome, curto, url, ordem, foto_em}.
const G_COLS = [['g_leads', 'leads'], ['g_meus', 'meus'], ['g_sol', 'sol'], ['g_eventos', 'eventos'], ['g_decisoes', 'decisoes'], ['g_captados', 'capt'], ['g_tarefas', 'tarefas'], ['g_acaptar', 'acapg']];   // g_acaptar (08/11/2026): A CAPTAR de cada painel, para o gestor somar
const G_ALVOS = new Set(G_COLS.map((x) => x[1]));
S.gProntos = new Set();
const gPaineis = () => Object.entries(S.G.paineis || {}).map(([slug, p]) => ({ ...p, slug }))
  .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
const gNome = (slug) => { const p = (S.G.paineis || {})[slug]; return p ? (p.nome || slug) : slug; };
const gCurto = (slug) => { const p = (S.G.paineis || {})[slug]; return (p && p.curto) || String(gNome(slug)).split(' ')[0]; };
function gFiltra(alvo, v) {
  const o = {};
  Object.entries(S.G[alvo] || {}).forEach(([id, d]) => {
    if (!d || (v !== 'todos' && d._dono !== v)) return;
    let k = d._id || id; if (o[k]) k = d._dono + '__' + k;   // no "Todos", id repetido entre painéis ganha o dono na frente
    o[k] = d;
  });
  return o;
}
function aplicarVer() {
  if (S.gProntos.has('paineis') && S.verComo !== 'todos' && !(S.G.paineis || {})[S.verComo]) S.verComo = 'todos';
  G_ALVOS.forEach((alvo) => { S[alvo] = gFiltra(alvo, S.verComo); });
}
function ligarGestor() {
  S.gestor = true;
  if (!ABAS.some((a) => a[0] === 'gestor')) ABAS.unshift(['gestor', 'Gestor']);
  ROT_ABA_Q.gestor = 'painéis: nome do corretor';
  G_ALVOS.forEach((alvo) => { S[alvo] = {}; });
  try { if (!sessionStorage.getItem('painel.aba')) S.aba = 'gestor'; } catch (e) { S.aba = 'gestor'; }
  const gcol = (nome, chave) => db.collection(nome).onSnapshot((snap) => {
    const o = {}; snap.docs.forEach((d) => { if (d.exists) o[d.id] = d.data(); });
    S.G[chave] = o; S.gProntos.add(chave); aplicarVer();
    if (chave === 'acapg' && !S.acapProprio) S.acap = acapDaFoto();
    if (G_ALVOS.has(chave)) S.prontos.add(chave);
    render();
  }, () => toast('A conexão com a foto dos painéis caiu. Recarregue a página.'));
  G_COLS.forEach(([n, a]) => gcol(n, a)); gcol('g_paineis', 'paineis');
  render();
}
const gFotoGeral = () => Object.values(S.G.paineis || {}).map((p) => p.foto_em).filter(Boolean).sort().pop() || '';
const rotGestor = () => (S.info.corretor || 'Gestor') + ' · ' + (S.verComo === 'todos' ? 'todos os painéis' : 'vendo ' + gCurto(S.verComo));
document.addEventListener('change', (ev) => { const s = ev.target && ev.target.matches && ev.target.matches('select[data-versel]') ? ev.target : null; if (!s || !S.gestor) return; S.verComo = s.value; try { sessionStorage.setItem('painel.ver', S.verComo); } catch (e) {} aplicarVer(); render(); }); /* trocas-f5j: seletor de uma linha no celular */
function barraGestor() {
  const bt = (k, t) => `<button type="button" data-ver="${esc(k)}" aria-pressed="${S.verComo === k}">${esc(t)}</button>`;
  const f = gFotoGeral();
  const info = !S.gProntos.has('paineis') ? 'Carregando a foto dos painéis…' : f ? `Foto do dia: ${dt(f)} · só leitura` : 'Sem foto dos painéis ainda · só leitura';
  return `<div class="g-barra" role="group" aria-label="Ver como" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:0 0 12px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--panel)">
    <span class="peq mut" style="font-weight:600">Ver como</span><div class="chips">${bt('todos', 'Todos')}${gPaineis().map((p) => bt(p.slug, gCurto(p.slug))).join('')}</div><select class="g-sel" data-versel aria-label="Ver como">${[['todos', 'Todos']].concat(gPaineis().map((p) => [p.slug, gCurto(p.slug)])).map(([k, r]) => `<option value="${esc(k)}"${S.verComo === k ? ' selected' : ''}>Ver como: ${esc(r)}</option>`).join('')}</select>
    <span class="peq mut" style="margin-left:auto">${esc(info)}</span></div>`;
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest && ev.target.closest('[data-ver]'); if (!b || !S.gestor) return;
  S.verComo = b.dataset.ver; try { sessionStorage.setItem('painel.ver', S.verComo); } catch (e) {}
  aplicarVer();
  if (b.dataset.irAba) { S.aba = b.dataset.irAba; try { sessionStorage.setItem('painel.aba', S.aba); } catch (e) {} window.scrollTo(0, 0); }
  render();
});
function gResumo(slug) {
  const salvo = {}; G_ALVOS.forEach((a) => { salvo[a] = S[a]; S[a] = gFiltra(a, slug); });
  try {
    const L = Object.values(S.leads), av = todosAvisos(), M = Object.values(S.meus);
    const sts = Object.entries(S.sol).map(([id, s]) => statusDe(id, s));
    const ult = L.map(ultimoReg).concat(Object.values(S.eventos).map((e) => e && e.em)).filter(Boolean).sort().pop() || '';
    return {
      leads: L.length, abertos: L.filter((l) => ABERTAS.has(l.etapa || 'Novo')).length, fechados: L.filter((l) => l.etapa === 'Fechado').length,
      atrasados: av.filter((a) => a.t === 'Próxima ação vencida' || a.t === 'Primeiro contato atrasado').length,
      hoje: av.filter((a) => a.t === 'Ação para hoje').length,
      ativos: M.filter((m) => m.ativo).length, imoveis: M.length,
      pend: sts.filter((x) => x === 'pendente').length, compl: sts.filter((x) => x === 'complemento').length, ult,
      ofertas: leadsComOfertas().length, acap: acapDoSlug(slug),   // 08/11/2026: o gestor vê tudo
    };
  } finally { G_ALVOS.forEach((a) => { S[a] = salvo[a]; }); }
}
function vGestor() {
  if (!S.gProntos.has('paineis')) return '<div class="vazio">Carregando a foto dos painéis…</div>';
  const P0 = gPaineis().filter((p) => S.verComo === 'todos' || p.slug === S.verComo).map((p) => ({ ...p, ...gResumo(p.slug) }));   // 08/11/2026: o Ver como também filtra a aba Gestor
  const fb = BA.filtra(P0, qDe(), (p) => ({ txt: [p.nome, p.curto, p.slug].filter(Boolean).join(' · ') }));
  const P = fb.lista; qInfo(fb, 'painéis');
  const soma = (k) => P.reduce((s, p) => s + (p[k] || 0), 0);
  const acoes = (p) => `<button class="b" type="button" data-ver="${esc(p.slug)}" data-ir-aba="inicio">Ver como</button>${p.url ? ` <a class="b" href="${esc(p.url)}" target="_blank" rel="noopener">Abrir o painel</a>` : ''}`;
  const de = (a, b) => `${a} <span class="mut peq">de ${b}</span>`;
  const cols = [
    { k: 'nome', l: 'Corretor', h: (p) => `<b>${esc(p.nome || p.slug)}</b>${hitBA(p)}` },
    { k: 'abertos', l: 'Leads em aberto', n: 1, h: (p) => de(p.abertos, p.leads) },
    { k: 'atrasados', l: 'Atrasados', n: 1, h: (p) => p.atrasados ? `<b style="color:var(--bad)">${p.atrasados}</b>` : '0' },
    { k: 'hoje', l: 'Para hoje', n: 1 },
    { k: 'fechados', l: 'Fechados', n: 1 },
    { k: 'ofertas', l: 'Ofertas', n: 1 },
    { k: 'acap', l: 'A captar', n: 1 },
    { k: 'ativos', l: 'Imóveis ativos', n: 1, h: (p) => de(p.ativos, p.imoveis) },
    { k: 'pend', l: 'Solicitações', n: 1, h: (p) => `${p.pend}${p.compl ? ` <span class="mut peq">· ${p.compl} a complementar</span>` : ''}` },
    { k: 'ult', l: 'Último registro', h: (p) => p.ult ? dt(p.ult) : '—' },
    { k: 'foto_em', l: 'Foto', h: (p) => p.foto_em ? dt(p.foto_em) : '—' },
    { k: '_ac', l: 'Ações', ord: false, h: acoes },
  ];
  const cartao = (p) => `<div class="linha" style="justify-content:space-between;gap:8px"><b>${esc(p.nome || p.slug)}</b><span class="mut peq">foto ${p.foto_em ? dt(p.foto_em) : '—'}</span></div>
    <div class="peq" style="display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:4px"><span>Leads em aberto <b>${p.abertos}</b> de ${p.leads}</span><span>Atrasados <b${p.atrasados ? ' style="color:var(--bad)"' : ''}>${p.atrasados}</b></span><span>Para hoje <b>${p.hoje}</b></span><span>Fechados <b>${p.fechados}</b></span><span>Ofertas <b>${p.ofertas}</b></span><span>A captar <b>${p.acap}</b></span><span>Imóveis ativos <b>${p.ativos}</b> de ${p.imoveis}</span><span>Solicitações <b>${p.pend}</b>${p.compl ? ` · ${p.compl} a complementar` : ''}</span><span>Último registro ${p.ult ? dt(p.ult) : '—'}</span></div>
    <div class="linha" style="margin-top:8px;gap:6px">${acoes(p)}</div>`;
  const f = gFotoGeral();
  return `<section class="sec"><div><h2 style="margin:0">${S.verComo === 'todos' ? 'Visão geral dos painéis' : 'Visão geral · ' + esc(gCurto(S.verComo))}</h2><p class="mut peq" style="margin:2px 0 0">Foto do dia de cada painel${f ? ' (a mais recente: ' + dt(f) + ')' : ''}, atualizada 1x por dia pela rotina. Só leitura: as mudanças se fazem no painel do corretor.</p></div>
  <div class="cartoes">
    <div class="cartao"><div class="r">Painéis</div><div class="v">${P.length}</div><div class="s">corretores na foto</div></div>
    <div class="cartao"><div class="r">Leads em aberto</div><div class="v">${soma('abertos')}</div><div class="s">de ${soma('leads')} no total</div></div>
    <div class="cartao${soma('atrasados') ? ' alerta' : ''}"><div class="r">Atrasados</div><div class="v">${soma('atrasados')}</div><div class="s">ação vencida ou 1º contato</div></div>
    <div class="cartao"><div class="r">Para hoje</div><div class="v">${soma('hoje')}</div><div class="s">próximas ações marcadas</div></div>
    <div class="cartao"><div class="r">Imóveis ativos</div><div class="v">${soma('ativos')}</div><div class="s">de ${soma('imoveis')} agenciados</div></div>
    <div class="cartao${soma('ofertas') ? ' alerta' : ''}" style="${soma('ofertas') ? 'border-color:var(--brass)' : ''}"><div class="r">Ofertas</div><div class="v">${soma('ofertas')}</div><div class="s">leads com imóveis para ofertar</div></div>
    <div class="cartao"><div class="r">🎯 A captar</div><div class="v">${soma('acap')}</div><div class="s">em captação no A CAPTAR${S.acap ? ' · ' + linkAcap('abrir', 'copiar') : ''}</div></div>
    <div class="cartao"><div class="r">Solicitações</div><div class="v">${soma('pend')}</div><div class="s">aguardando aprovação</div></div>
  </div>
  ${tabela('gestor', cols, P, { padrao: { c: 'nome', d: 1 }, cartao, vazio: 'Nenhum painel na foto ainda.' })}</section>`;
}

// ---------- Início ----------
function vInicio() {
  const L = Object.values(S.leads), av0 = todosAvisos();
  const fAv = BA.filtra(av0, qDe(), (a) => { const l = S.leads[a.id] || {}, m = a.imv ? S.meus[a.imv] || {} : null; if (m) { const x = baImv({ ...m, descricao: '' }); return { ...x, txt: [a.t, a.o, x.txt].join(' · ') }; } return { ...baLead(l), txt: [a.t, a.o, baLead(l).txt].join(' · ') }; });
  const av = fAv.lista; qInfo(fAv, 'avisos');
  const nOp = leadsComOfertas().length;
  const abertos = L.filter((l) => ABERTAS.has(l.etapa || 'Novo')).length;
  const venc = av.filter((a) => a.t === 'Próxima ação vencida' || a.t === 'Primeiro contato atrasado').length;
  const hoje = av.filter((a) => a.t === 'Ação para hoje').length;
  const M = Object.values(S.meus), ativos = M.filter((m) => m.ativo).length;
  const sts = Object.entries(S.sol).map(([id, s]) => statusDe(id, s));
  const pend = sts.filter((x) => x === 'pendente').length, compl = sts.filter((x) => x === 'complemento').length;
  const prim = String(S.info.saudacao || '').trim() || (S.info.corretor || '').split(' ')[0];
  let h = `<section class="sec"><div><p class="mut peq" style="margin:0">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p><p style="font:500 24px var(--display);margin:2px 0 0">Olá${prim ? ', ' + esc(prim) : ''}.</p></div>
  <div class="linha"><button class="b p" type="button" data-conversa="">✦ Registrar conversa</button><button class="b" type="button" data-voz="" aria-label="Registrar por voz: como funciona">🎤 Por voz</button></div>
  <div class="cartoes">
    <div class="cartao"><div class="r">Leads em aberto</div><div class="v">${abertos}</div><div class="s">de ${L.length} no total</div></div>
    <div class="cartao${venc ? ' alerta' : ''}"><div class="r">Atrasados</div><div class="v">${venc}</div><div class="s">ação vencida ou 1º contato</div></div>
    <div class="cartao"><div class="r">Para hoje</div><div class="v">${hoje}</div><div class="s">próximas ações marcadas</div></div>
    <div class="cartao"><div class="r">Meus imóveis</div><div class="v">${ativos}</div><div class="s">ativos de ${M.length} agenciados</div></div>
    <div class="cartao${nOp ? ' alerta' : ''}" style="${nOp ? 'border-color:var(--brass)' : ''}"><div class="r">Ofertas</div><div class="v">${nOp}</div><div class="s">lead${nOp === 1 ? '' : 's'} com imóveis para ofertar · <button class="copiar" type="button" data-aba="oportunidades">ver</button></div></div>
    ${S.acap ? `<div class="cartao"><div class="r">🎯 A CAPTAR</div><div class="v">${acapMinhas().length}</div><div class="s">em captação por você · ${linkAcap('abrir', 'copiar')}</div></div>` : ''}
    <div class="cartao${compl ? ' alerta' : ''}"><div class="r">Solicitações</div><div class="v">${pend}</div><div class="s">aguardando aprovação${compl ? ` · <b>${compl} para complementar</b>` : ''}</div></div>
  </div>
  ${TF.blocoHoje()}
  <div class="painel"><h2 style="margin-bottom:6px">O que fazer agora</h2>`;
  const hFixos0 = h.length; // avisos fixos (recusa, complemento) contam para o vazio (05/11/2026)
  if (!S.ehDono) Object.entries(S.sol).forEach(([sid, s]) => { const dc = S.decisoes[sid]; if (!dc || statusDe(sid, s) !== 'recusada' || !dc.em || dias(dc.em, hojeISO()) > 7) return;
    h += `<div class="aviso"><span class="pill alta">Alta</span><div><b>Pedido recusado</b> · ${esc(s.ref || 'imóvel')}<div class="o">${esc({ novo_imovel: 'Cadastro', fotos: 'Fotos novas', captacao: 'Captação', corretor_anunciante: 'Aviso de corretor anunciante' }[s.tipo] || 'Alteração')} recusada em ${dt(dc.em)}${dc.resposta ? ': ' + esc(dc.resposta) : ''}</div></div><button class="b" type="button" data-abre="sol:${esc(sid)}">Abrir</button></div>`; });
  if (compl && !S.ehDono) h += `<div class="aviso"><span class="pill alta">Alta</span><div><b>Pedido para complementar</b><div class="o">A diretoria devolveu ${compl} pedido${compl > 1 ? 's' : ''} pedindo dados, fotos ou documentos.</div></div><button class="b" type="button" data-aba="solicitacoes">Abrir</button></div>`;
  h += av.length ? av.map((a) => `<div class="aviso"><span class="pill ${a.p}">${a.p === 'alta' ? 'Alta' : a.p === 'media' ? 'Média' : 'Baixa'}</span><div><b>${esc(a.t)}</b> · ${esc(a.nome)}${hitBA(a)}<div class="o">${esc(a.o)}</div></div>${a.imv ? `<button class="b" type="button" data-agenc="${esc(a.imv)}">Atualizar</button>` : `<button class="b" type="button" data-lead="${esc(a.id)}">Abrir</button>`}</div>`).join('') : (fAv.ativo ? '<div class="vazio">Nenhum aviso atende à busca.</div>' : (h.length > hFixos0 ? '' : '<div class="vazio">Nenhum aviso. Tudo em dia.</div>'));
  h += `</div>${painelPrazos()}<p class="status">Dados atualizados em ${dt(S.info.atualizado_em)}. A vitrine e os seus imóveis são atualizados pela rotina diária da Vivere.</p></section>`;
  return h;
}

// ---------- Meus leads ----------
function vLeads() {
  let L = Object.entries(S.leads).map(([id, l]) => ({ id, ...l, _ult: ultimoReg(l), _av: avisosDe(id, l), _int: interesseDe(l) }));
  const contInt = {}; L.forEach((l) => { contInt[l._int] = (contInt[l._int] || 0) + 1; });
  if (S.filtroInt && !INT_POR[S.filtroInt]) S.filtroInt = '';
  if (S.filtroInt) L = L.filter((l) => l._int === S.filtroInt);   // 07/11/2026: o interesse filtra a lista e as outras visões
  const chipsInt = `<div class="chips int-chips" role="group" aria-label="Filtrar por interesse"><button type="button" data-int="" aria-pressed="${!S.filtroInt}">Todos os interesses</button>${INTERESSES.filter(([k]) => contInt[k] || S.filtroInt === k).map(([k, , curto]) => `<button type="button" data-int="${k}" aria-pressed="${S.filtroInt === k}">${esc(curto)} (${contInt[k] || 0})</button>`).join('')}</div>`;
  const busca = !!qDe();
  const L0 = BA.filtra(L, qDe(), baLead).lista;   // visões (30/10/2026): kanban, pipeline, funil e agenda veem todas as etapas
  if (!busca && S.filtroEtapa === 'abertos') L = L.filter((l) => ABERTAS.has(l.etapa || 'Novo'));
  else if (!busca && S.filtroEtapa !== 'todos') L = L.filter((l) => (l.etapa || 'Novo') === S.filtroEtapa);
  const fL = BA.filtra(L, qDe(), baLead); L = fL.lista; qInfo(fL, 'leads');
  const cont = (f) => Object.values(S.leads).filter(f).length;
  const chips = [['abertos', `Em aberto (${cont((l) => ABERTAS.has(l.etapa || 'Novo'))})`], ['todos', `Todos (${cont(() => true)})`], ...ETAPAS.map((e) => [e, `${e} (${cont((l) => (l.etapa || 'Novo') === e)})`])].filter(([k, t]) => !/\(0\)$/.test(t) || k === 'abertos' || k === 'todos');
  const cols = [
    { k: 'nome', l: 'Nome', h: (r) => `<b>${esc(r.nome)}</b>${dupDe(r.id) ? ' ' + dupDe(r.id) : ''}${r._av.some((a) => a.p === 'alta') ? ' <span class="pill alta">atrasado</span>' : ''}${pillLado(r) ? ' ' + pillLado(r) : ''}${hitBA(r)}` },
    { k: 'telefone', l: 'Telefone', v: (r) => digitos(r.telefone), h: (r) => esc(fone(r.telefone)) },
    { k: 'interesse', l: 'Interesse', v: (r) => INT_POR[r._int].i, h: (r) => pillInt(r) },
    { k: 'etapa', l: 'Etapa', v: (r) => ETAPAS.indexOf(r.etapa || 'Novo'), h: (r) => `<span class="pill ${r.etapa === 'Fechado' ? 'ok' : r.etapa === 'Perdido' ? 'perdido' : ''}">${esc(r.etapa || 'Novo')}</span>` },
    { k: 'data_prox', l: 'Próxima ação', h: (r) => r.prox_acao || r.data_prox ? `${esc(r.prox_acao || 'Ação')}<div class="mut peq">${dt(r.data_prox)}</div>` : '<span class="mut">—</span>' },
    { k: '_ult', l: 'Último registro', h: (r) => dt(r._ult) },
    { k: 'entrada', l: 'Entrada', h: (r) => dt(r.entrada) },
    { k: 'campanha', l: 'Origem', h: (r) => `<span class="peq">${esc(r.campanha || '—')}</span>` },
  ];
  return `<section class="sec">
    <div class="linha" style="justify-content:space-between"><h2>Meus leads</h2><div class="linha"><button class="b" type="button" data-voz="" aria-label="Registrar por voz: como funciona">🎤</button><button class="b" type="button" data-conversa="">✦ Registrar conversa</button><button class="b p" type="button" id="novoLead">+ Novo lead</button></div></div>
    ${chipsInt}
    ${VisoesCRM.montar('leads', S.prefs, { lista: () => `${busca ? '<p class="mut peq" style="margin:0">Com a busca, a lista procura em todos os leads, de qualquer etapa.</p>' : ''}<div class="chips" role="group" aria-label="Filtrar por etapa"${busca ? ' hidden' : ''}>${chips.map(([k, t]) => `<button type="button" data-etapa="${esc(k)}" aria-pressed="${S.filtroEtapa === k}">${esc(t)}</button>`).join('')}</div>
    ${tabela('leads', cols, L, { padrao: { c: 'entrada', d: -1 }, abre: (r) => 'lead:' + r.id, vazio: 'Nenhum lead neste filtro.', cartao: (r) => `
      <div class="cm-l1"><span class="cm-nome">${esc(r.nome)}</span>${dupDe(r.id)}${pillLado(r)}${pillInt(r)}${r._av.some((a) => a.p === 'alta') ? '<span class="pill alta">atrasado</span>' : ''}${hitBA(r)}<span class="cm-v"><span class="pill ${r.etapa === 'Fechado' ? 'ok' : r.etapa === 'Perdido' ? 'perdido' : ''}">${esc(r.etapa || 'Novo')}</span></span></div>
      <div class="cm-lin"><b>${esc(fone(r.telefone))}</b> · ${esc(r.campanha || 'sem origem')}</div>
      <div class="cm-lin">${r.prox_acao || r.data_prox ? `Próxima: <b>${esc(r.prox_acao || 'ação')}</b> ${dt(r.data_prox)}` : '<span class="falta">Sem próxima ação</span>'} · último ${r._ult ? dt(r._ult).slice(0, 10) : '—'} · entrada ${r.entrada ? dt(r.entrada).slice(0, 10) : '—'}</div>` })}`, ...visoesLeads(L0) })}
  </section>`;
}
// ---------- Visões dos leads (30/10/2026): Kanban, Pipeline, Funil e Agenda ----------
function itemVisao(r) {
  const alta = r._av.some((a) => a.p === 'alta');
  return { id: r.id, nome: r.nome, etapa: r.etapa || 'Novo', prox: r.prox_acao, data_prox: r.data_prox, alerta: alta, abre: `data-abre="lead:${esc(r.id)}"`,
    pills: pillInt(r) + (alta ? '<span class="pill alta">atrasado</span>' : ''), sub: esc([r.campanha, r.imovel_interesse].filter(Boolean).join(' · ')),
    dias: r._ult ? dias(r._ult, hojeISO()) : (r.entrada ? dias(r.entrada, hojeISO()) : null), marca: r.etapa_por === 'diretoria' ? 'movido pela diretoria' : '' };
}
function visoesLeads(L0) {
  const I = L0.map(itemVisao);
  return {
    kanban: () => VisoesCRM.kanban('leads', I, { etapas: ETAPAS, podeMover: true, notaMover: 'Perdido pede o motivo; a mudança entra no histórico do lead.' }),
    pipeline: () => VisoesCRM.pipeline('leads', I, { etapas: ETAPAS }),
    funil: () => VisoesCRM.funil('leads', VisoesCRM.degrausEtapas(I, ETAPAS, ['Perdido']), { nota: 'Cada degrau conta quem chegou àquela etapa ou passou dela. Perdidos saem do funil.' }),
    agenda: () => VisoesCRM.agenda('leads', I, { so: (x) => ABERTAS.has(x.etapa), vazio: 'Nenhum lead em aberto.' }),
  };
}
async function moverLead(id, etapa) {
  const l = S.leads[id]; if (!l || !ETAPAS.includes(etapa)) return; const de = l.etapa || 'Novo'; if (de === etapa) return;
  let motivo = '';
  if (etapa === 'Perdido') { motivo = await VisoesCRM.pedeMotivo(MOTIVOS); if (!motivo) return; }
  const h = [...histDe(l), { em: agora().slice(0, 16), tipo: 'Observação', texto: `Etapa: ${de} → ${etapa}${motivo ? ' (' + motivo + ')' : ''}.` }];
  const dados = { etapa, motivo: etapa === 'Perdido' ? motivo : '', data_fechamento: etapa === 'Fechado' ? (l.data_fechamento || hojeISO()) : '', historico: h, etapa_em: agora(), etapa_por: 'corretor', atualizado_em: agora(), origem: 'painel' };
  await gravar(() => db.collection('leads').doc(id).update(dados), `${l.nome}: ${etapa}.`);
}
function mudouVisoes(chave, v) {
  const { todas } = VisoesCRM.alternar(chave, S.prefs, v);
  S.prefs = { ...S.prefs, visoes_crm: todas }; render();
  if (db && S.uid) db.doc(`data/users/${S.uid}/preferencias`).set({ ...S.prefs, atualizado_em: agora() }).catch(() => toast('Não consegui guardar as visões na sua conta: por enquanto valem só neste aparelho.'));
}
VisoesCRM.instalar({ mover: (c, id, et) => moverLead(id, et), mudou: mudouVisoes,
  etapa: (c, et) => { S.filtroEtapa = et; const a = VisoesCRM.ativas('leads', S.prefs); if (!a.includes('lista')) { const r = VisoesCRM.alternar('leads', S.prefs, 'lista'); S.prefs = { ...S.prefs, visoes_crm: r.todas }; } render(); setTimeout(() => { const t = document.querySelector('[data-vcrm-v="lista"]'); if (t) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); } });

function htmlHist(l) {
  const hist = [...histDe(l)].sort((a, b) => String(b.em).localeCompare(String(a.em)));
  return hist.length ? hist.map((x) => `<div class="i"><div class="q">${dt(x.em)} · ${esc(x.tipo || 'Registro')}</div>${esc(x.texto)}</div>`).join('') : '<p class="mut">Nenhuma tratativa registrada.</p>';
}
function gavetaLead(id) {
  const novo = !id, l = novo ? { etapa: 'Novo', perfil: {}, historico: [], entrada: hojeISO() } : S.leads[id];
  if (!l) return '';
  const p = l.perfil || {};
  const op = novo ? null : opsDoLead(leadN(id, l));
  const refs = S.vitrine.map((v) => v.ref).filter(Boolean);
  return `<div class="gaveta" role="dialog" aria-modal="true" aria-label="Lead">
    <div class="cab"><div><p class="mut peq" style="margin:0">${novo ? 'Cadastrar' : 'Lead · ' + esc(l.campanha || 'sem origem')}</p><h3>${novo ? 'Novo lead' : esc(l.nome)}</h3>${novo ? '' : pillLado(l) + pillInt(l)}${novo ? '' : `<p class="mut peq" style="margin:4px 0 0">Entrada em ${dt(l.entrada)}</p>`}</div><button class="b" type="button" data-fechar>Fechar</button></div>
    ${novo ? '' : `<div class="prop"><div class="t">Contato</div><div class="linha"><b style="font-size:17px">${esc(fone(l.telefone))}</b><button class="copiar" type="button" data-copiar="${esc(digitos(l.telefone))}">Copiar</button>${digitos(l.telefone) ? `<a class="b" href="https://wa.me/55${esc(digitos(l.telefone))}" target="_blank" rel="noopener">Abrir no WhatsApp</a>` : ''}<button class="b p" type="button" data-conversa="lead:${esc(id)}">✦ Atualizar por resumo</button></div></div>${blocoCorAnun(id, l)}`}
    <form id="fLead" class="form" data-id="${esc(id || '')}">
      ${novo ? `<label class="c inteiro">Nome<input id="lNome" required></label><label class="c">Telefone<input id="lTel" inputmode="tel" required></label><label class="c">Origem<select id="lOrig">${['Indicação', 'Plantão', 'Portal', 'Instagram', 'Site', 'Outro'].map((o) => `<option>${o}</option>`).join('')}</select></label>` : ''}
      <label class="c">Interesse<select id="lInt">${optInt(novo ? 'a_definir' : interesseDe(l))}</select></label>
      <label class="c">Etapa<select id="lEtapa">${ETAPAS.map((e) => `<option ${e === (l.etapa || 'Novo') ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
      <label class="c" id="wMotivo" ${l.etapa === 'Perdido' ? '' : 'hidden'}>Motivo da perda<select id="lMotivo"><option value="">Escolha</option>${MOTIVOS.map((m) => `<option ${m === l.motivo ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <label class="c">Próxima ação<input id="lProx" value="${esc(l.prox_acao || '')}" placeholder="Ex.: ligar, enviar opções"></label>
      <label class="c">Data da próxima ação<input id="lData" type="date" value="${esc(l.data_prox || '')}"></label>
      <label class="c">Imóvel de interesse (ref.)<input id="lImovel" list="refsVit" value="${esc(l.imovel_interesse || '')}"></label>
      <label class="c" id="wFech" ${l.etapa === 'Fechado' ? '' : 'hidden'}>Data do fechamento<input id="lFech" type="date" value="${esc(l.data_fechamento || '')}"></label>
      <div class="inteiro"><h2 style="margin:6px 0 0" id="pTit">Perfil do cliente</h2><p class="peq mut" id="pFinAuto" style="margin:2px 0 0" hidden></p></div>
      <label class="c" id="pFinBox">Finalidade<select id="pFin">${['', 'Venda', 'Locação', 'Temporada'].map((o) => `<option ${o === (p.finalidade || '') ? 'selected' : ''} value="${o}">${o || 'Escolha'}</option>`).join('')}</select></label>
      <label class="c">Tipo<input id="pTipo" value="${esc(p.tipo || '')}" placeholder="Apartamento, casa…"></label>
      <label class="c">Bairros (separe por vírgula)<input id="pBairros" value="${esc(p.bairros || '')}"></label>
      <label class="c">Valor mínimo (R$)<input id="pMin" ${VLR} value="${esc(fmtVlr(p.vmin))}"></label>
      <label class="c">Valor máximo (R$)<input id="pMax" ${VLR} value="${esc(fmtVlr(p.vmax))}"></label>
      <label class="c">Dormitórios (mín.)<input id="pDorm" type="number" min="0" inputmode="numeric" value="${esc(p.dorm ?? '')}"></label>
      <label class="c">Vagas (mín.)<input id="pVagas" type="number" min="0" inputmode="numeric" value="${esc(p.vagas ?? '')}"></label>
      <label class="c inteiro">Observações (vista, andar, piscina…)<input id="pObs" value="${esc(p.obs || '')}"></label>
      ${novo ? '<label class="c inteiro">Primeiro registro (opcional)<textarea id="lObsNovo" placeholder="Como chegou, o que procura"></textarea></label>' : ''}
      <div class="inteiro linha"><button class="b p" type="submit">${novo ? 'Cadastrar lead' : 'Salvar alterações'}</button><span class="erro" id="eLead"></span></div>
    </form>
    <datalist id="refsVit">${refs.slice(0, 800).map((r) => `<option value="${esc(r)}">`).join('')}</datalist>
    ${novo ? '' : `<div class="painel"><h2>Registrar tratativa</h2>
      <form id="fHist" class="form" style="margin-top:10px"><label class="c">Tipo<select id="hTipo">${TIPOS_HIST.map((t) => `<option>${t}</option>`).join('')}</select></label>
      <label class="c inteiro">O que aconteceu<textarea id="hTexto" required placeholder="Digite ou toque no microfone do teclado para ditar. Ex.: liguei, pediu opções no Itacorubi até R$ 1,2 mi"></textarea></label>
      <div class="inteiro"><button class="b p" type="submit">Registrar</button></div></form>
      <div class="hist" id="histLista" style="margin-top:14px">${htmlHist(l)}</div></div>
    <div class="painel"><div class="linha" style="justify-content:space-between"><h2>${ladoDe(l) === 'tem' ? '🏠 Imóvel que tem' : 'Ofertas para este lead'}</h2>${ladoDe(l) === 'tem' ? '' : `<button class="b" type="button" data-opver="${esc(id)}">Abrir em Ofertas</button>`}</div>${ladoDe(l) === 'tem' ? fichaTem(id, l) : !op.p ? '<p class="mut">Sem perfil ainda. Preencha o perfil acima ou use "Pedir à IA" na aba Ofertas.</p>' : `<p class="peq mut" style="margin:6px 0 0">Perfil usado: ${esc(OP.descrevePerfil(op.p))}</p>${op.capt.length ? `<div class="op-ofs" style="margin-top:10px">${op.capt.slice(0, 3).map((x) => htmlCapt(id, x)).join('')}</div>` : ''}${op.novas.length ? `<div class="op-ofs" style="margin-top:10px">${op.novas.slice(0, 4).map((x) => htmlOferta(id, x)).join('')}</div>` : op.capt.length ? '' : '<p class="mut">Nenhum imóvel combina com o perfil agora.</p>'}`}</div>`}
  </div>`;
}

// ---------- Oportunidades: aba ----------
function htmlOferta(leadId, x) {
  const it = x.it, l = S.leads[leadId] || {}, tel = digitos(l.telefone), msg = OP.mensagem(l, it, (String(S.info.saudacao || '').trim() || S.info.corretor || '').split(' ')[0]);
  const fat = it.origem === 'emp' ? `<span>${esc(it.tipologias || 'tipologias a confirmar')}</span>${it.entrega ? `<span>entrega ${esc(it.entrega)}</span>` : ''}` : fatosCurtos(it);
  const det = it.origem === 'site' ? `<button class="b" type="button" data-abre="vit:${esc(it.id)}">Detalhes</button>` : S.meus[it.id] ? `<button class="b" type="button" data-pmver="${esc(it.id)}">Detalhes</button>` : '';
  return `<div class="op-of cap${x.ia ? ' ia' : ''}"><span class="selo-cap">🟢 PAUTA · pode ofertar</span><div class="com-capa">${capaHtml(it.id, it)}<div class="txt"><div class="l1"><span class="ref">${esc(it.ref || '')}</span><span class="peq mut">${esc(it.origem === 'emp' ? 'Empreendimento' : it.tipo || '')} · ${esc(it.bairro || '')}</span><span class="v">${it.valor ? curtoBRL(it.valor) : it.origem === 'emp' ? 'sob consulta' : '—'}</span></div>
    <div class="cm-fat">${fat}</div>
    ${x.ia ? `<div class="mot">✦ ${esc(x.ia)}</div>` : ''}${x.motivos && x.motivos.length ? `<div class="chips2">${x.motivos.map((m) => `<span>${esc(m)}</span>`).join('')}</div>` : ''}
    ${x.alerta ? `<div class="falta">${esc(x.alerta)}</div>` : ''}</div></div>
    <div class="acoes">${tel ? `<a class="b p" href="https://wa.me/55${esc(tel)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener" data-opof="${esc(leadId)}|${esc(it.id)}">Ofertar no WhatsApp</a>` : ''}<button class="b${tel ? '' : ' p'}" type="button" data-opcopia="${esc(leadId)}|${esc(it.id)}">${tel ? 'Copiar mensagem' : 'Copiar e marcar ofertado'}</button><button class="b" type="button" data-opdesc="${esc(leadId)}|${esc(it.id)}">Descartar</button>${det}${it.link && it.origem !== 'fora' ? `<a class="b" href="${esc(it.link)}" target="_blank" rel="noopener">${it.origem === 'emp' ? 'Site' : 'Anúncio'}</a>` : ''}${it.lat != null ? `<button class="b" type="button" data-vermapa="${esc(it.id)}">🗺</button>` : ''}</div></div>`;
}
const OPL_CSS = `.opl-wrap{container-type:inline-size;min-width:0;display:grid;gap:8px}
.opl-res{display:grid;gap:4px;font-size:13px;padding:10px 12px;background:var(--soft);border-radius:8px}
.opl-gr{display:flex;flex-wrap:wrap;gap:2px 12px;align-items:baseline;min-width:0}.opl-gr>span{white-space:nowrap}
.opl-gr .rot,.opl-ord .rot,.opl-fil .rot{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}.opl-gr .mut{color:var(--muted)}
.opl-fil{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;min-width:0}
.opl-fil input[type=search]{flex:1 1 220px;min-width:0}.opl-fil select,.opl-fil input{max-width:100%;min-width:0}
.opl-fil label{display:inline-flex;gap:4px;align-items:center;font-size:12px;color:var(--muted);min-width:0}
.opl-fil .alvo{outline:2px solid var(--brass);outline-offset:1px}
.opl-ord{display:none;align-items:center;gap:6px;flex-wrap:wrap}
.opl{border:1px solid var(--line);border-radius:8px;background:var(--panel);min-width:0}
.opl-lin{all:unset;box-sizing:border-box;width:100%;cursor:pointer;font-size:13px}
.opl-cab,.opl-lin{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(104px,.9fr) minmax(0,1.3fr) 96px 132px minmax(0,2fr) 84px 120px 14px;gap:10px;align-items:center;padding:7px 12px}
.opl-cab{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.opl-cab button{all:unset;cursor:pointer;white-space:normal;overflow-wrap:break-word;min-width:0}.opl-cab button:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.opl-cab .hc{display:flex;gap:4px;align-items:center;min-width:0}.opl-cab .hc.n{justify-content:center}
.opl-cab .fil{flex:none;opacity:.5;font-size:12px;padding:0 2px}.opl-cab .fil:hover{opacity:1}.opl-cab .fil.on{opacity:1;color:var(--brass)}
.opl-item{border-top:1px solid var(--line)}
.opl-lin:hover,.opl-lin[aria-expanded="true"]{background:var(--soft)}.opl-lin:focus-visible{outline:2px solid var(--brass);outline-offset:-2px}
.opl .c{min-width:0;white-space:normal;overflow-wrap:break-word}
.opl .c-etapa .pill{max-width:100%;white-space:normal;overflow-wrap:break-word;vertical-align:middle}
.opl .n{text-align:center;font-variant-numeric:tabular-nums;font-weight:600}.opl .n.zero{color:var(--muted);font-weight:400}
.opl .c-capt:not(.zero){color:var(--warn)}.opl .c-ofertas i,.opl .c-capt i,.opl .rt{display:none;font-style:normal;font-weight:400}.opl .rt{color:var(--muted)}
.opl .c-meta{display:none}
.opl .c-int .pill{white-space:normal;overflow-wrap:break-word}.opl .falta{color:var(--warn)}.opl .c-seta{color:var(--muted);text-align:right}
.opl-det{padding:10px;border-top:1px dashed var(--line);background:var(--soft)}.opl-det .op-lead{margin:0}
.opl-pag{display:flex;align-items:center;gap:8px;justify-content:flex-end;flex-wrap:wrap}
@container (max-width:1000px){
  .opl-cab{display:none}.opl-ord{display:flex}
  .opl-lin{grid-template-columns:minmax(0,1fr) auto auto 12px;grid-template-areas:"nome of ca seta" "int int int int" "meta meta meta meta" "perfil perfil etapa etapa";gap:3px 10px;padding:9px 12px}
  .opl .c-campanha,.opl .c-data{display:none}
  .opl .c-meta{display:block;grid-area:meta;color:var(--muted);font-size:12px;white-space:normal}
  .opl .c-nome{grid-area:nome}.opl .c-ofertas{grid-area:of}.opl .c-capt{grid-area:ca}.opl .c-seta{grid-area:seta}
  .opl .c-int{grid-area:int}.opl .c-perfil{grid-area:perfil;font-size:12px}.opl .c-etapa{grid-area:etapa;justify-self:end}.opl .c-ofertas i,.opl .c-capt i,.opl .rt{display:inline}
  .opl .c{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}
}`;
// lista compacta das Oportunidades (01/11/2026, pedido do Cleiton): uma linha por lead, 20 por página; o toque abre o cartão completo de antes logo abaixo, um por vez
(function () { if (document.getElementById('opl-css')) return; const s = document.createElement('style'); s.id = 'opl-css'; s.textContent = OPL_CSS; (document.head || document.documentElement).appendChild(s); })();
const ORD_OPP = { nome: ['Lead', (x) => x.l.nome || null], etapa: ['Etapa', (x) => x.l.etapa || 'Novo'], campanha: ['Origem', (x) => x.l.campanha || null], data: ['Entrada', (x) => x.l.entrada || null], interesse: ['Interesse', (x) => INT_POR[interesseDe(x.l, x.o.p)].i],
  perfil: ['Perfil', (x) => (x.o.p ? OP.descrevePerfil(x.o.p, 1) || null : null)], ofertas: ['🟢 Pauta', (x) => x.o.novas.length], capt: ['🟠 A captar', (x) => x.o.capt.length] };
const proxOrdP = (o, k) => (!o || o.k !== k ? { k, dir: 'desc' } : o.dir === 'desc' ? { k, dir: 'asc' } : null);
const cmpOrdP = (a, b, dir) => { const va = a == null || a === '', vb = b == null || b === ''; if (va || vb) return va && vb ? 0 : va ? 1 : -1;
  const r = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' }); return dir === 'asc' ? r : -r; };
const setaOpP = (k) => { const o = S.opOrd; return o && o.k === k ? (o.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'; };
// filtros dentro da lista (01/11/2026, volta 2): busca só da lista, etapa, origem, entrada de/até e com/sem 🔶; o funil ⏷ do título leva ao filtro da coluna
const FL_VAZIO = () => ({ q: '', etapa: '', origem: '', de: '', ate: '', capt: '' });
const FL_OPP = () => S.opFl || (S.opFl = FL_VAZIO());
const isoOpP = (v) => { const s = String(v || ''); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0]; m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
const semAcOpP = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const VAL_OPP = { etapa: (x) => x.l.etapa || 'Novo', origem: (x) => x.l.campanha || '', data: (x) => isoOpP(x.l.entrada), capt: (x) => x.o.capt.length,
  txt: (x) => [x.l.nome, x.l.telefone, x.l.whatsapp, x.l.email, x.l.campanha, x.o.p ? OP.descrevePerfil(x.o.p) : '', x.l.etapa || 'Novo'].filter(Boolean).join(' ') };
const FIL_OPP = { nome: 'q', etapa: 'etapa', campanha: 'origem', data: 'de', perfil: 'q', capt: 'capt' };
let OPLBP = [];
function filtraOplP(L, f) { const q = semAcOpP(f.q).trim(), t = q ? q.split(/\s+/) : [];
  return L.filter((x) => { const d = VAL_OPP.data(x), c = VAL_OPP.capt(x);
    return (!f.etapa || VAL_OPP.etapa(x) === f.etapa) && (!f.origem || (f.origem === '—' ? !x.l.campanha : VAL_OPP.origem(x) === f.origem)) && (!f.de || (d && d >= f.de)) && (!f.ate || (d && d <= f.ate))
      && (!f.capt || (f.capt === 'com' ? c > 0 : c === 0)) && (!t.length || ((s) => t.every((w) => s.includes(w)))(semAcOpP(VAL_OPP.txt(x)))); }); }
const filOnP = (k) => { const f = FL_OPP(), a = FIL_OPP[k]; return a === 'de' ? !!(f.de || f.ate) : !!(a && f[a]); };
function barraOpP() { const f = FL_OPP(), uniq = (g) => [...new Set(OPLBP.map(g).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
  const uniqS = (g, s) => { const v = uniq(g); if (s && s !== '—' && !v.includes(s)) v.unshift(s); return v; }; // valor escolhido fica no select mesmo fora da lista atual (crítico, volta 2)
  const opt = (v, t, s) => `<option value="${esc(v)}"${s === v ? ' selected' : ''}>${esc(t)}</option>`, n = ['q', 'etapa', 'origem', 'de', 'ate', 'capt'].filter((k) => f[k]).length;
  return `<div class="opl-fil" role="search" aria-label="Filtrar a lista"><span class="rot">Filtrar a lista</span><input type="search" id="oplf-q" placeholder="Buscar na lista: nome, perfil, origem…" value="${esc(f.q)}" aria-label="Buscar na lista">`
    + `<select id="oplf-etapa" aria-label="Etapa">${opt('', 'Todas as etapas', f.etapa)}${uniqS(VAL_OPP.etapa, f.etapa).map((v) => opt(v, v, f.etapa)).join('')}</select>`
    + `<select id="oplf-origem" aria-label="Origem">${opt('', 'Todas as origens', f.origem)}${uniqS(VAL_OPP.origem, f.origem).map((v) => opt(v, v, f.origem)).join('')}${OPLBP.some((x) => !x.l.campanha) ? opt('—', 'Sem origem', f.origem) : ''}</select>`
    + `<label>Entrada de <input type="date" id="oplf-de" value="${esc(f.de)}"></label><label>até <input type="date" id="oplf-ate" value="${esc(f.ate)}"></label>`
    + `<select id="oplf-capt" aria-label="A captar">${opt('', '🟠 A captar: todos', f.capt)}${opt('com', 'Com 🟠 a captar', f.capt)}${opt('sem', 'Sem 🟠 a captar', f.capt)}</select>`
    + `${n ? `<button type="button" class="b" data-oplimpa="1">Limpar filtros (${n})</button>` : ''}</div>`; }
function focaFilOpP(k) { const a = FIL_OPP[k]; if (!a) return; const el = document.getElementById('oplf-' + a); if (!el) return;
  el.scrollIntoView({ block: 'nearest' }); el.focus(); el.classList.add('alvo'); setTimeout(() => el.classList.remove('alvo'), 1500); }
let TOPLQP;
document.addEventListener('input', (e) => { if (e.target.id !== 'oplf-q') return; FL_OPP().q = e.target.value; S.opPg = 0; clearTimeout(TOPLQP);
  TOPLQP = setTimeout(() => { const s = [e.target.selectionStart, e.target.selectionEnd]; render(); const el = document.getElementById('oplf-q'); if (el) { el.focus(); try { el.setSelectionRange(s[0], s[1]); } catch (_) {} } }, 250); });
document.addEventListener('change', (e) => { const id = e.target && e.target.id; if (!id || !id.startsWith('oplf-') || id === 'oplf-q') return; FL_OPP()[id.slice(5)] = e.target.value; S.opPg = 0; S.opAb = ''; render(); });
function listaOpP(L, cardOp, busca) {
  const POR = busca ? 1e9 : 20, nPg = Math.max(1, Math.ceil(L.length / POR)); S.opPg = Math.min(Math.max(0, S.opPg || 0), nPg - 1);
  const ini = S.opPg * POR, V = L.slice(ini, ini + POR); if (!busca) S.opAuto = ''; if (busca && L.length === 1 && S.opAuto !== L[0].id) { S.opAb = L[0].id; S.opAuto = L[0].id; } // um lead só (busca pelo nome, "ver nas Oportunidades"): já abre o cartão
  const m = new Map(); L.forEach(({ l }) => { const b = l.campanha || 'sem origem'; m.set(b, (m.get(b) || 0) + 1); });
  const orig = [...m].sort((x, y) => y[1] - x[1] || String(x[0]).localeCompare(String(y[0]), 'pt-BR'));
  const nOf = L.filter((x) => x.o.novas.length).length, nCa = L.filter((x) => x.o.capt.length).length;
  const res = `<div class="opl-res"><div><b>${L.length}</b> lead${L.length === 1 ? '' : 's'} · <b>${nOf}</b> com 🟢 na pauta · <b>${nCa}</b> com 🟠 a captar</div>${orig.length ? `<div class="opl-gr"><span class="rot">Por origem</span>${orig.slice(0, 6).map(([k, v]) => `<span><b>${v}</b> ${esc(k)}</span>`).join('')}${orig.length > 6 ? `<span class="mut">+${orig.length - 6} outr${orig.length - 6 === 1 ? 'a' : 'as'}</span>` : ''}</div>` : ''}</div>`;
  const nav = nPg > 1 ? `<div class="opl-pag"><span class="mut peq">${ini + 1}–${Math.min(ini + POR, L.length)} de ${L.length} · página ${S.opPg + 1} de ${nPg}</span><button class="b" type="button" data-oppg="-1" ${S.opPg === 0 ? 'disabled' : ''} aria-label="Página anterior">‹</button><button class="b" type="button" data-oppg="1" ${S.opPg >= nPg - 1 ? 'disabled' : ''} aria-label="Próxima página">›</button></div>` : '';
  const ordCel = `<div class="opl-ord chips" role="group" aria-label="Ordenar por"><span class="rot">Ordenar por</span>${Object.entries(ORD_OPP).filter(([k]) => k !== 'perfil').map(([k, [r]]) => `<button type="button" data-opord="${k}" aria-pressed="${!!(S.opOrd && S.opOrd.k === k)}">${r}${setaOpP(k)}</button>`).join('')}<button type="button" data-oplfil="nome">⏷ Filtrar</button></div>`;
  const cab = Object.entries(ORD_OPP).map(([k, [r]]) => `<span class="c hc${k === 'ofertas' || k === 'capt' ? ' n' : ''}"><button type="button" data-opord="${k}" title="${k === 'capt' ? 'A captar: capte antes de ofertar · ' : k === 'ofertas' ? 'Pauta: pode ofertar · ' : ''}Ordenar: 1º toque maior → menor, 2º menor → maior, 3º volta à ordem original">${r}${setaOpP(k)}</button>${FIL_OPP[k] ? `<button type="button" class="fil${filOnP(k) ? ' on' : ''}" data-oplfil="${k}" title="Filtrar por ${esc(r.replace(/^[🟢🟠] /u, ''))}" aria-label="Filtrar por ${esc(r.replace(/^[🟢🟠] /u, ''))}">⏷</button>` : ''}</span>`).join('') + '<span></span>';
  const lin = V.map((x) => { const { id, l, o } = x, ab = S.opAb === id, et = l.etapa || 'Novo', per = o.p ? OP.descrevePerfil(o.p, 1) || '—' : 'sem perfil';
    return `<div class="opl-item"><button type="button" class="opl-lin" data-opab="${esc(id)}" aria-expanded="${ab}" aria-label="${esc(l.nome + ': ' + o.novas.length + ' na pauta, ' + o.capt.length + ' a captar. ' + (ab ? 'Fechar' : 'Abrir') + ' as oportunidades')}">`
      + `<span class="c c-nome"><b>${esc(l.nome)}</b>${hitBA(x)}</span><span class="c c-etapa"><i class="rt">Etapa: </i><span class="pill ${et === 'Fechado' ? 'ok' : et === 'Perdido' ? 'perdido' : ''}">${esc(et)}</span></span>`
      + `<span class="c c-campanha" title="${esc(l.campanha || '')}">${esc(l.campanha || 'sem origem')}</span><span class="c c-data">${dt(l.entrada)}</span>`
      + `<span class="c c-meta">${esc('Origem: ' + (l.campanha || 'sem origem') + ' · Entrada: ' + dt(l.entrada))}</span>`
      + `<span class="c c-int"><i class="rt">Interesse: </i>${pillInt(l, o.p)}</span>`
      + `<span class="c c-perfil${o.p ? '' : ' falta'}" title="${esc(per)}"><i class="rt">Perfil: </i>${esc(per)}</span>`
      + `<span class="c c-ofertas n${o.novas.length ? '' : ' zero'}" title="Pauta: pode ofertar">🟢 ${o.novas.length}<i> na pauta</i></span><span class="c c-capt n${o.capt.length ? '' : ' zero'}" title="A captar: capte antes de ofertar">🟠 ${o.capt.length}<i> a captar</i></span><span class="c c-seta" aria-hidden="true">${ab ? '▾' : '▸'}</span>`
      + `</button>${ab ? `<div class="opl-det">${cardOp(x)}</div>` : ''}</div>`; }).join('');
  return `<div class="opl-wrap">${res}${barraOpP()}${ordCel}${nav}${V.length ? `<div class="opl"><div class="opl-cab">${cab}</div>${lin}</div>` : '<div class="painel vazio">Nenhum lead atende aos filtros da lista.</div>'}${V.length ? nav : ''}</div>`;
}
function vOport() {
  if (!S.prontos.has('vitrine')) return '<div class="vazio">Carregando os imóveis…</div>';
  if (S.opLado === 'tem') return vOportTem();
  const base = Object.entries(S.leads).filter(([, l]) => ladoDe(l) !== 'tem').map(([id, l]) => ({ id, l, o: opsDoLead(leadN(id, l)) }));
  const busca = !!qDe();
  const F = { ofertas: (x) => ABERTAS.has(x.l.etapa || 'Novo') && (x.o.novas.length || nCaptAcao(x.o)), abertos: (x) => ABERTAS.has(x.l.etapa || 'Novo'), sem_perfil: (x) => ABERTAS.has(x.l.etapa || 'Novo') && !x.o.p, todos: () => true };
  const cont = (k) => base.filter(F[k]).length;
  let L = busca ? base : base.filter(F[S.opFiltro] || F.ofertas);
  const fO = BA.filtra(L, qDe(), (x) => { const b = baLead(x.l); return { txt: [b.txt, ...x.o.novas.map((n) => baImv(n.it).txt)].join(' · '), docs: b.docs, valores: [...b.valores, ...x.o.novas.map((n) => n.it.valor)], nums: {} }; });
  L = fO.lista; qInfo(fO, 'leads');
  L.sort((a, b) => (fO.ativo ? 0 : (b.o.novas.length || nCaptAcao(b.o) ? 1 : 0) - (a.o.novas.length || nCaptAcao(a.o) ? 1 : 0)) || String(b.l.entrada || '').localeCompare(String(a.l.entrada || '')));
  OPLBP = L.slice(); L = filtraOplP(L, FL_OPP());
  if (S.opOrd && ORD_OPP[S.opOrd.k]) { const f = ORD_OPP[S.opOrd.k][1]; L.sort((a, b) => cmpOrdP(f(a), f(b), S.opOrd.dir)); }
  const chips = [['ofertas', `Com ofertas (${cont('ofertas')})`], ['abertos', `Em aberto (${cont('abertos')})`], ['sem_perfil', `Sem perfil (${cont('sem_perfil')})`], ['todos', `Todos (${cont('todos')})`]];
  const ORIG = { confirmado: ['Perfil confirmado', 'ok'], ia: ['Sugerido pela IA · confirme', 'ia'], auto: ['Automático · confirme', 'media'] };
  let h = `<section class="sec"><div class="linha" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Ofertas</h2><span class="mut peq">${S.ia ? 'IA disponível neste acesso' : 'Sem IA neste acesso: cruzamento automático'}</span></div>
    ${LEG_OP}<details class="op-como"><summary>Como funciona</summary><p class="peq mut" style="margin:0">Imóveis que combinam com cada lead: anúncios do site, empreendimentos em lançamento e agenciamentos fora do site. O perfil vem da campanha, do imóvel de interesse e do histórico; ${S.ia ? 'toque em <b>✦ Pedir à IA</b> para a IA ler a conversa e escolher as ofertas.' : 'preencha o perfil do lead para refinar.'} <b>Ofertar</b> abre o WhatsApp com a mensagem pronta e registra no histórico. <b>⚡ Captar este imóvel primeiro</b> pede o imóvel 🟠 a captar à diretoria.</p></details>${ladosOp()}
    ${busca ? '<p class="mut peq" style="margin:0">Com a busca, a lista procura em todos os leads e nos imóveis sugeridos.</p>' : `<div class="chips" role="group" aria-label="Filtrar">${chips.map(([k, t]) => `<button type="button" data-opfiltro="${k}" aria-pressed="${S.opFiltro === k}">${esc(t)}</button>`).join('')}</div>`}`;
  if (!L.length && !OPLBP.length) h += `<div class="painel vazio">${busca ? 'Nenhum lead ou imóvel atende à busca.' : S.opFiltro === 'ofertas' ? 'Nenhum lead em aberto com oferta nova agora.' : 'Nenhum lead neste filtro.'}</div>`;
  const cardOp = (xL) => { const { id, l, o } = xL; let h = '';
    const og = o.p ? (o.p.origem === 'confirmado' && (l.perfil || {}).por === 'diretoria' ? ['Perfil confirmado pela diretoria', 'ok'] : ORIG[o.p.origem]) : null, st = S.opStatus[id] || '', mais = S.opMais[id];
    const vis = mais ? o.novas : o.novas.slice(0, 4);
    h += `<article class="painel op-lead"><div class="cab"><h3>${esc(l.nome)}</h3>${pillInt(l, o.p)}<span class="pill ${l.etapa === 'Fechado' ? 'ok' : l.etapa === 'Perdido' ? 'perdido' : ''}">${esc(l.etapa || 'Novo')}</span>${pillLado(l)}${hitBA(xL)}<span class="mut peq">${esc(l.campanha || 'sem origem')} · entrada ${dt(l.entrada)}</span><button class="b" type="button" data-lead="${esc(id)}" style="margin-left:auto">Abrir lead</button></div>
      <div class="op-perfil"><div class="linha" style="justify-content:space-between"><span class="t">Perfil</span>${og ? `<span class="pill ${og[1]}">${og[0]}</span>` : ''}</div>
        <div>${o.p ? esc(OP.descrevePerfil(o.p, 1)) || '—' : '<span class="falta">Sem perfil: preencha no lead ou peça à IA.</span>'}</div>
        ${o.p && o.p.fontes && o.p.fontes.length && o.p.origem === 'auto' ? `<div class="mut peq">De onde veio: ${esc(o.p.fontes.join(' · '))}</div>` : ''}
        ${o.ia && o.ia.comentario ? `<div class="peq">✦ ${esc(o.ia.comentario)} <span class="mut">(${dt(o.ia.em)})</span></div>` : ''}
        <div class="linha">${S.ia ? `<button class="b p" type="button" data-opia="${esc(id)}">✦ ${o.ia ? 'Pedir à IA de novo' : 'Pedir à IA'}</button>` : ''}${o.p && o.p.origem !== 'confirmado' ? `<button class="b" type="button" data-opconf="${esc(id)}">Confirmar perfil</button>` : ''}<button class="b" type="button" data-lead="${esc(id)}">Editar perfil</button><span class="mut peq">${esc(st)}</span></div></div>
      ${vis.length ? `<div class="op-bt cap">🟢 Pauta · pode ofertar agora · ${o.novas.length}</div><div class="op-ofs">${vis.map((x) => htmlOferta(id, x)).join('')}</div>${o.novas.length > 4 ? `<button class="copiar" type="button" data-opmais="${esc(id)}">${mais ? 'Mostrar menos' : `Mostrar mais ${o.novas.length - 4}`}</button>` : ''}` : o.p && !o.capt.length ? '<p class="mut" style="margin:0">Nenhum imóvel captado novo combina com o perfil agora.</p>' : ''}
      ${o.capt.length ? `<div class="op-bt nao">🟠 A captar · capte antes de ofertar · ${o.capt.length > 3 ? '3 de ' + o.capt.length : o.capt.length}</div><div class="op-ofs">${o.capt.slice(0, 3).map((x) => htmlCapt(id, x)).join('')}</div>` : ''}
      ${o.ofertados.length ? `<details><summary>Já ofertados (${o.ofertados.length})</summary><div class="hist" style="margin-top:8px">${o.ofertados.map((m) => `<div class="i"><div class="q">${dt(m.em)} · ${m.por === 'diretoria' ? 'pela diretoria, no HUB' : esc(m.via || 'ofertado')}</div><span class="ref">${esc(m.it ? m.it.ref : m.id)}</span> ${m.it ? `· ${esc(m.it.tipo || '')} · ${esc(m.it.bairro || '')} · ${curtoBRL(m.it.valor) || ''}` : ''} <button class="copiar" type="button" data-opreabre="${esc(id)}|${esc(m.id)}">voltar para a lista</button></div>`).join('')}</div></details>` : ''}
      ${o.descartados.length ? `<details><summary>Descartados (${o.descartados.length})</summary><div class="hist" style="margin-top:8px">${o.descartados.map((m) => `<div class="i"><div class="q">${dt(m.em)}</div><span class="ref">${esc(m.it ? m.it.ref : m.id)}</span> ${m.it ? `· ${esc(m.it.bairro || '')}` : ''} <button class="copiar" type="button" data-opreabre="${esc(id)}|${esc(m.id)}">voltar para a lista</button></div>`).join('')}</div></details>` : ''}
    </article>`;
    return h; };
  if (L.length || OPLBP.length) h += listaOpP(L, cardOp, busca);
  return h + '<p class="status">Os imóveis vêm da rotina diária da Vivere. Agenciamento fora do site e lançamento: confirme disponibilidade e tabela antes de ofertar.</p></section>';
}
async function opMarca(leadId, itemId, st, via) {
  const l = S.leads[leadId]; if (!l) return false; const ctx = ctxOp(), it = ctx.porId.get(itemId) || {};
  const oport = JSON.parse(JSON.stringify(l.oport || {})); oport.marcas = oport.marcas || {};
  const dados = { atualizado_em: agora(), origem: 'painel' };
  oport.marcas[itemId] = { st: st || 'reaberto', em: agora().slice(0, 16), via: via || '', ref: it.ref || '', por: 'corretor' }; // 'reaberto' em vez de apagar: o espelho com o HUB respeita a ação mais recente
  dados.oport = oport;
  if (st === 'ofertado') dados.historico = [...histDe(l), { em: agora().slice(0, 16), tipo: via === 'WhatsApp' ? 'WhatsApp' : 'Observação', texto: `Ofertado ${it.origem === 'emp' ? 'o empreendimento ' + (it.nome || '') : (it.ref || itemId) + ' (' + [it.tipo, it.bairro, curtoBRL(it.valor)].filter(Boolean).join(', ') + ')'} pela aba Ofertas.` }];
  return gravar(() => db.collection('leads').doc(leadId).update(dados), st === 'ofertado' ? 'Oferta registrada no histórico do lead.' : st === 'descartado' ? 'Imóvel descartado para este lead.' : 'Imóvel voltou para a lista.');
}
async function opPedirIA(leadId) {
  const l = S.leads[leadId]; if (!l || !S.ia) return;
  S.opStatus[leadId] = 'A IA está lendo o lead e escolhendo os imóveis…'; render();
  try {
    const ctx = ctxOp(), r = await S.ia.json(OP.promptIA(leadN(leadId, l), ctx, hojeISO()), { modelTier: 'default' });
    const v = OP.validaIA(r, ctx);
    const oport = JSON.parse(JSON.stringify(l.oport || {})); oport.ia = { em: agora().slice(0, 16), ofertas: v.ofertas, comentario: v.comentario };
    const ok = await gravar(() => db.collection('leads').doc(leadId).update({ perfil_sugerido: { ...v.perfil, em: agora().slice(0, 16), por: 'ia' }, oport, atualizado_em: agora(), origem: 'painel' }), `A IA sugeriu ${v.ofertas.length} imóve${v.ofertas.length === 1 ? 'l' : 'is'}. Confira o perfil.`);
    S.opStatus[leadId] = ok ? '' : 'Não consegui salvar a sugestão.';
  } catch (e) { S.opStatus[leadId] = e && e.code === 'rate_limited' ? 'Limite de uso da IA atingido agora. Tente mais tarde.' : e && e.code === 'not_granted' ? 'A IA não foi liberada neste acesso.' : 'A IA não respondeu agora. Tente de novo.'; }
  render();
}
async function opConfirmar(leadId) {
  const l = S.leads[leadId]; if (!l) return; const p = OP.perfilDo(leadN(leadId, l), ctxOp()); if (!p) return;
  const perfil = { finalidade: p.fin || '', tipo: p.tipo || '', bairros: (p.bairros || []).join(', '), vmin: p.vmin || null, vmax: p.vmax || null, dorm: p.dorm || null, vagas: p.vagas || null, obs: p.obs || (l.perfil || {}).obs || '', em: agora().slice(0, 16), por: 'corretor' };
  const intN = INT_POR[l.interesse] ? null : interesseDerivado({ ...l, perfil });
  await gravar(() => db.collection('leads').doc(leadId).update({ perfil, ...(intN && intN !== 'a_definir' ? { interesse: intN } : {}), atualizado_em: agora(), origem: 'painel' }), 'Perfil confirmado. Ajuste no lead se precisar.');
}

// ---------- R$/m² de área privativa (07/11/2026, pedido do Cleiton; marca m2-privativa-20261107) ----------
// valor de venda (ou do aluguel anual) ÷ área privativa; a mesma regra do HUB. Área: a do anúncio (em Meus imóveis, a privativa do
// Imobibrasil). Fica de fora: temporada, terreno, lote, gleba, sítio, chácara, fazenda e área fora de 10 a 3.000 m².
function m2Fin(x) { const m = String((x && x.id) || '').match(/_([AVT])(?:_\d+)?$/); if (m) return m[1];
  const f = String((x && x.fin) || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); return /venda/.test(f) ? 'V' : /tempor/.test(f) ? 'T' : /alug|loca/.test(f) ? 'A' : ''; }
function m2De(x) { if (!x) return null; const f = m2Fin(x); if (f !== 'V' && f !== 'A') return null; const v = +x.valor, a = +x.area;
  if (!(v > 0) || !(a >= 10 && a <= 3000)) return null;
  if (/^(terreno|lote|gleba|area|sitio|chacara|fazenda)/.test(String(x.tipo || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase())) return null;
  return v / a; }
function m2Fmt(v) { return v == null || !isFinite(v) ? '' : 'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'; }
function m2Fx(a, b) { return 'R$ ' + Math.round(a).toLocaleString('pt-BR') + ' – ' + Math.round(b).toLocaleString('pt-BR') + '/m²'; }
function m2Rot(x) { const v = m2De(x); return v == null ? '' : m2Fmt(v) + (m2Fin(x) === 'A' ? ' (aluguel)' : ''); }
function m2Stats(vals) { const v = (vals || []).filter((n) => n > 0).sort((a, b) => a - b); if (!v.length) return null; const n = v.length;
  return { n, media: v.reduce((a, b) => a + b, 0) / n, min: v[0], max: v[n - 1] }; }
// prédio: empreendimento ligado; sem ele, o nome entre parênteses do endereço; sem ele, rua e número
function m2Predio(x) { try { const C = S.prontos.has('empDocs') ? empCtx() : null; const e = C ? C.empDoAnuncio.get(x.id) : null; if (e && e.nome) return e.nome; } catch (e) {}
  const m = String(x.end || '').match(/\(([^()]+)\)\s*$/); if (m) return m[1].trim(); const r = String(x.end || '').split(' — ')[0].trim(); return /\d/.test(r) ? r : ''; }
function m2Bloco(L) { const G = { V: [], A: [] }; let tot = 0;
  L.forEach((x) => { const f = m2Fin(x); if (f !== 'V' && f !== 'A') return; tot++; const v = m2De(x); if (v != null) G[f].push({ x, v }); });
  const fins = ['V', 'A'].filter((f) => G[f].length); if (!fins.length) return '';
  const rot = { V: 'Venda', A: 'Aluguel' };
  const tab = (f, tipo) => { const M = new Map(); G[f].forEach(({ x, v }) => { const g = tipo === 'bairro' ? String(x.bairro || '').trim() : m2Predio(x); if (!g) return; if (!M.has(g)) M.set(g, []); M.get(g).push(v); });
    const R = [...M.entries()].map(([g, v]) => ({ g, ...m2Stats(v) }));
    if (!R.length) return '<p class="mut peq">Sem dados.</p>';
    const cols = [{ k: 'g', l: tipo === 'bairro' ? 'Bairro' : 'Prédio / empreendimento' }, { k: 'n', l: 'Anúncios', n: true },
      { k: 'media', l: 'Média', n: true, h: (r) => `<b>${m2Fmt(r.media)}</b>` }, { k: 'min', l: 'Mínimo – máximo', n: true, h: (r) => r.n > 1 ? `${m2Fx(r.min, r.max)}` : '—' }];
    return tabela('m2' + f + tipo, cols, R, { padrao: { c: 'n', d: -1 }, pag: 10, pagina: (S.pagM2 || {})['m2' + f + tipo] || 0, vazio: 'Sem dados.',
      cartao: (r) => `<div class="cm-l1"><span class="cm-nome">${esc(r.g)}</span><b class="cm-v">${m2Fmt(r.media)}</b></div><div class="cm-fat"><span>${r.n} anúncio${r.n > 1 ? 's' : ''}</span>${r.n > 1 ? `<span>${m2Fx(r.min, r.max)}</span>` : ''}</div>` }); };
  return `<details class="m2-med"${S.m2ab ? ' open' : ''}><summary><b>R$/m² médio por bairro e por prédio</b> <span class="mut peq">${G.V.length + G.A.length} de ${tot} anúncios desta lista têm área privativa</span> ${fins.map((f) => { const st = m2Stats(G[f].map((o) => o.v)); return `<span class="pill">${rot[f]}: média ${m2Fmt(st.media)} · ${st.n}</span>`; }).join(' ')}</summary>
    ${fins.map((f) => `<h3 class="m2-h">${rot[f]}</h3><div class="m2-gr"><div>${tab(f, 'bairro')}</div><div>${tab(f, 'predio')}</div></div>`).join('')}
    <p class="mut peq" style="margin:8px 0 0">Valor do anúncio ÷ área privativa. Segue os filtros e a busca de cima. Sem temporada, terrenos e lotes.</p></details>`; }
document.addEventListener('toggle', (e) => { const t = e.target; if (t && t.matches && t.matches('details.m2-med')) S.m2ab = t.open; }, true);
if (!document.getElementById('css-m2')) { const st = document.createElement('style'); st.id = 'css-m2'; st.textContent = 'details.m2-med{border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin:0 0 12px}details.m2-med>summary{cursor:pointer;line-height:1.8}details.m2-med>summary .pill{margin-right:6px}.m2-h{font-size:12px;letter-spacing:.14em;text-transform:uppercase;margin:12px 0 6px}.m2-gr td.num{white-space:nowrap}.m2-gr{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px;align-items:start}'; document.head.appendChild(st); }

// ---------- Meus imóveis ----------
const curtoBRL = (v) => v == null || v === '' ? '' : v >= 1e6 ? 'R$ ' + num(v / 1e6, 2) + ' mi' : v >= 1e3 ? 'R$ ' + num(v / 1e3, 0) + ' mil' : brl(v);
function fatosCurtos(x) {
  const f = [x.dorm ? `<span><b>${x.dorm}</b> dorm.${x.suites ? ` (${x.suites} suíte${x.suites > 1 ? 's' : ''})` : ''}</span>` : '', x.banh ? `<span><b>${x.banh}</b> banh.</span>` : '', x.vagas ? `<span><b>${x.vagas}</b> vaga${x.vagas > 1 ? 's' : ''}</span>` : '', x.area ? `<span><b>${num(x.area, 0)}</b> m²</span>` : '', x.area_total ? `<span>total ${num(x.area_total, 0)} m²</span>` : '', m2De(x) != null ? `<span><b>${m2Rot(x)}</b></span>` : ''].filter(Boolean);
  return f.join('');
}
function valoresCurtos(x) {
  return [x.valor != null ? `<span><b>${brl(x.valor)}</b></span>` : '', x.cond ? `<span>cond. ${brl(x.cond)}</span>` : '', x.iptu ? `<span>IPTU ${brl(x.iptu)}</span>` : ''].filter(Boolean).join('');
}
function fatos(m) {
  const f = [['Valor', brl(m.valor)], ['Condomínio', brl(m.cond)], ['IPTU', brl(m.iptu)], ['Área privativa', m.area ? num(m.area, 2) + ' m²' : '—'], ['Área total', m.area_total ? num(m.area_total, 2) + ' m²' : '—'], ['Dormitórios', num(m.dorm)], ['Suítes', num(m.suites)], ['Banheiros', num(m.banh)], ['Vagas', num(m.vagas)], ['R$/m² (área privativa)', m2De(m) != null ? m2Rot(m) : '—']];
  return `<div class="fatos">${f.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
}
// WhatsApp do proprietário (Nicolas, 26/10/2026): conversa em branco ou com a mensagem de atualização do agenciamento
const nomeProprio = (s) => String(s || '').trim().split(/\s+/)[0].toLowerCase().replace(/(^|[-'])\p{L}/gu, (c) => c.toUpperCase());
function zapProp(m, pr) {
  let d = digitos(pr.celular); if (d.startsWith('55') && d.length >= 12) d = d.slice(2); d = d.replace(/^0+/, '');
  if (d.length < 10 || d.length > 11) return '<span class="mut peq">(número incompleto para o WhatsApp)</span>';
  const eu = nomeProprio(String(S.info.saudacao || '').trim() || S.info.corretor), end = [m.logradouro || m.end, m.numero].filter(Boolean).join(', ');
  const msg = `Olá${pr.nome ? ', ' + nomeProprio(pr.nome) : ''}! Aqui é ${eu || 'o corretor'}, da Vivere Imóveis. Estou atualizando o cadastro do seu imóvel ${m.ref || ''}${end ? ' (' + end + ')' : ''}. Ele continua disponível${m.valor ? ' pelo valor de ' + brl(m.valor) : ''}?`;
  return `<span class="zap"><a href="https://wa.me/55${d}" target="_blank" rel="noopener">WhatsApp</a><a href="https://wa.me/55${d}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener" title="${esc(msg)}">WhatsApp com mensagem</a></span>`;
}
function vImoveis() {
  const st = S.sort.meus || { c: 'atu', d: -1 }; S.sort.meus = st;
  const cols = [['ref', 'Ref.'], ['_end', 'Endereço'], ['bairro', 'Bairro'], ['valor', 'Valor'], ['_m2', 'R$/m²'], ['atu', 'Atualizado'], ['_dag', 'Dias sem atualizar'], ['ativo', 'No site (ativo/inativo)']];
  const fm = S.fm || (S.fm = { fin: '', sit: '' });
  const todos = Object.entries(S.meus).map(([id, m]) => ({ id, ...m, _m2: m2De({ id, ...m }), _dag: ultimoAgenc(id).dias, _end: [m.logradouro || m.end, m.numero, m.complemento].filter(Boolean).join(', ') }));
  const M0 = todos.filter((m) => (!fm.fin || m.fin === fm.fin) && (!fm.sit || (fm.sit === 'ativo') === !!m.ativo))
    .sort((a, b) => { const x = a[st.c], y = b[st.c]; if (x == null || x === '') return 1; if (y == null || y === '') return -1; return (typeof x === 'number' || typeof x === 'boolean' ? (x - y) : String(x).localeCompare(String(y), 'pt-BR', { numeric: true })) * st.d; });
  const fM = BA.filtra(M0, qDe(), baImv), M = fM.lista; qInfo(fM, 'imóveis');
  const pendDe = (id) => Object.entries(S.sol).filter(([sid, s]) => s.imovel_id === id && statusDe(sid, s) === 'pendente').length;
  const fins = [...new Set(todos.map((m) => m.fin).filter(Boolean))];
  let h = `<section class="sec"><div class="linha" style="justify-content:space-between"><h2>Meus imóveis agenciados</h2><button class="b p" type="button" id="novoImovel">+ Cadastrar imóvel</button></div>
  <div class="chips" role="group" aria-label="Filtrar"><button type="button" data-fm="sit|" aria-pressed="${!fm.sit}">Todos (${todos.length})</button><button type="button" data-fm="sit|ativo" aria-pressed="${fm.sit === 'ativo'}">Ativos no site (${todos.filter((m) => m.ativo).length})</button><button type="button" data-fm="sit|inativo" aria-pressed="${fm.sit === 'inativo'}">Inativos (${todos.filter((m) => !m.ativo).length})</button>${fins.length > 1 ? fins.map((f) => `<button type="button" data-fm="fin|${esc(f)}" aria-pressed="${fm.fin === f}">${esc(f)}</button>`).join('') : ''}</div>
  <div class="chips" role="group" aria-label="Ordenar"><span class="mut peq" style="align-self:center">Ordenar por</span>${cols.map(([k, l]) => `<button type="button" data-ordm="${k}" aria-pressed="${st.c === k}">${l}${st.c === k ? (st.d > 0 ? ' ▲' : ' ▼') : ' ↕'}</button>`).join('')}</div>
  <p class="mut peq" style="margin:0">${M.length} de ${todos.length} imóveis</p>`;
  if (!todos.length) h += '<div class="painel vazio">Nenhum imóvel agenciado por você no site ainda.</div>';
  else if (!M.length) h += '<div class="painel vazio">Nenhum imóvel com essa busca.</div>';
  for (const m of M) {
    const pr = m.proprietario || {}, pd = pendDe(m.id);
    h += `<article class="painel imv">
      <div class="com-capa abre-meu" data-abre="meu:${esc(m.id)}" title="Abrir a ficha completa">${capaHtml(m.id, m)}<div class="txt"><div class="cab"><button class="ref ref-abre" type="button" data-abre="meu:${esc(m.id)}" style="font-size:18px" aria-label="Abrir a ficha de ${esc(m.ref)}">${esc(m.ref)}</button><span>${esc(m.tipo || '')} · ${esc(m.fin || '')}</span><span class="pill ${m.ativo ? 'ok' : ''}">${m.ativo ? 'Ativo no site' : 'Inativo'}</span>${hitBA(m)}${pd ? `<span class="pill media">${pd} pedido${pd > 1 ? 's' : ''} aguardando</span>` : ''}${m.ativo ? seloAgenc(m.id) : ''}</div>
      <div class="cm-lin" style="white-space:normal"><span data-sens>${esc(m._end)}</span> · ${esc(m.bairro || '')}, ${esc(m.cidade || '')}${m.cep ? ' · ' + esc(m.cep) : ''}</div>
      <div class="cm-fat">${valoresCurtos(m)}</div>
      <div class="cm-fat">${fatosCurtos(m)}</div></div></div>
      <div class="prop"><div class="cm-lin" style="white-space:normal"><span class="t">Proprietário</span> <b>${esc(pr.nome || '—')}</b> · ${pr.celular ? `<b>${esc(pr.celular)}</b> <button class="copiar" type="button" data-copiar="${esc(digitos(pr.celular))}">copiar</button> ${zapProp(m, pr)}` : 'celular não cadastrado'} · CPF ${pr.cpf ? `<b>${esc(pr.cpf)}</b>` : 'não cadastrado'}</div>${faltaProp(pr).length ? `<div class="linha prop-falta"><span class="pill media">Faltam dados: ${esc(faltaProp(pr).join(' · '))}</span><button class="b" type="button" data-alterar="${esc(m.id)}">Informar dados</button></div>` : ''}</div>
      ${m.comodos || m.cond_itens || m.descricao ? `<details><summary>Itens e descrição</summary>${m.comodos || m.cond_itens ? `<p class="peq">${esc([...(m.comodos || []), ...(m.cond_itens || [])].join(' · '))}</p>` : ''}${m.descricao ? `<p class="desc">${esc(m.descricao)}</p>` : ''}</details>` : ''}
      <div class="linha acoes-imv"><button class="b p" type="button" data-alterar="${esc(m.id)}"><span class="so-pc">Solicitar alteração</span><span class="so-cel">Alterar</span></button><button class="b" type="button" data-fotosimv="${esc(m.id)}"><span class="so-pc">Adicionar fotos</span><span class="so-cel">+ Fotos</span></button><button class="b" type="button" data-agenc="${esc(m.id)}"><span class="so-pc">Atualizar agenciamento</span><span class="so-cel">Atualizar agenc.</span></button>${btnsMapa(m.id, m)}${m.link ? `<a class="b" href="${esc(m.link)}" target="_blank" rel="noopener">Ver no site</a>` : ''}<span class="mut peq data-imv">Cadastrado ${dt(m.cad).slice(0, 10)} · atualizado ${dt(m.atu).slice(0, 10)}</span></div>
    </article>`;
  }
  return h + '</section>';
}
const CAMPOS_ALT = [['valor', 'Valor (R$)', 'number'], ['cond', 'Condomínio (R$)', 'number'], ['iptu', 'IPTU (R$)', 'number'], ['area', 'Área privativa (m²)', 'number'], ['area_total', 'Área total (m²)', 'number'], ['dorm', 'Dormitórios', 'number'], ['suites', 'Suítes', 'number'], ['banh', 'Banheiros', 'number'], ['vagas', 'Vagas', 'number'], ['situacao', 'Situação no site', 'sel'], ['descricao', 'Descrição do anúncio', 'texto']];
const VLR_ALT = new Set(['valor', 'cond', 'iptu']);
// Dados do proprietário no pedido de alteração (02/11/2026): o que falta vira selo no cartão e pedido à corretora
const CAMPOS_PROP = [['nome', 'Nome do proprietário', 'text'], ['celular', 'Celular com DDD', 'tel'], ['cpf', 'CPF ou CNPJ', 'text']];
function faltaProp(pr) {
  pr = pr || {}; const f = [], c = digitos(pr.celular || '');
  if (!String(pr.nome || '').trim()) f.push('nome');
  if (!c) f.push('celular'); else if (c.length < 11) f.push('celular incompleto');
  if (!digitos(pr.cpf || '')) f.push('CPF');
  return f;
}
// CARD-IMOVEL (05/11/2026): os campos da alteração servem à gaveta antiga e ao card único do imóvel (gavetaMeu)
function camposAlterar(m) {
  const v = (k) => k === 'situacao' ? (m.ativo ? 'Ativo' : 'Inativo') : (m[k] ?? '');
  return `<fieldset class="inteiro prop-alt"><legend>Dados do proprietário${faltaProp(m.proprietario).length ? ` · faltam: ${esc(faltaProp(m.proprietario).join(', '))}` : ''}</legend>${CAMPOS_PROP.map(([k, l, t]) => `<label class="c">${l}<input id="ap_${k}" type="${t}" ${t === 'tel' ? 'inputmode="tel"' : ''} autocomplete="off" value="${esc((m.proprietario || {})[k] || '')}"></label>`).join('')}</fieldset>
      ${CAMPOS_ALT.map(([k, l, t]) => t === 'texto' ? `<label class="c inteiro">${l}<textarea id="a_${k}" rows="8">${esc(v(k))}</textarea></label><div class="inteiro linha"><button class="b" type="button" data-ia="a_descricao">${S.ia ? '✦ Reescrever a descrição com IA' : 'Pedir nova descrição à Vivere'}</button></div>` : t === 'sel' ? `<label class="c">${l}<select id="a_${k}">${['Ativo', 'Inativo'].map((o) => `<option ${o === v(k) ? 'selected' : ''}>${o}</option>`).join('')}</select></label>` : `<label class="c">${l}<input id="a_${k}" ${VLR_ALT.has(k) ? `${VLR} value="${esc(fmtVlr(v(k)))}"` : `type="number" step="any" inputmode="decimal" value="${esc(v(k))}"`}></label>`).join('')}`;
}
// compara o formulário com o imóvel: { campo: {de, para} } (mesma regra do envio antigo)
function lerAlteracoes(m) {
  const alt = {};
  for (const [k, , t] of CAMPOS_ALT) {
    const el = document.getElementById('a_' + k); if (!el) continue;
    const antes = k === 'situacao' ? (m.ativo ? 'Ativo' : 'Inativo') : (m[k] ?? '');
    let depois = val('a_' + k);
    if (t === 'number') { const a = antes === '' ? null : Number(antes), d = depois === '' ? null : VLR_ALT.has(k) ? numVlr(depois) : Number(depois.replace(',', '.')); if (a !== d) alt[k] = { de: a, para: d }; }
    else if (String(antes).trim() !== depois) alt[k] = { de: k === 'descricao' ? String(antes).slice(0, 60) + '…' : antes, para: depois };
  }
  const pr0 = m.proprietario || {};
  for (const [k] of CAMPOS_PROP) { if (!document.getElementById('ap_' + k)) continue; const antes = String(pr0[k] || '').trim(), depois = val('ap_' + k); if (antes !== depois) alt['proprietario_' + k] = { de: antes, para: depois }; }
  return alt;
}
const ROT_ALT = Object.fromEntries([...CAMPOS_ALT.map(([k, l]) => [k, l.replace(/ \(.*\)$/, '')]), ...CAMPOS_PROP.map(([k, l]) => ['proprietario_' + k, l])]);
const fmtAlt = (k, x) => x == null || x === '' ? '—' : VLR_ALT.has(k) ? brl(x) : String(x);
function gavetaAlterar(id) {
  const m = S.meus[id]; if (!m) return '';
  return `<div class="gaveta" role="dialog" aria-modal="true" aria-label="Solicitar alteração">
    <div class="cab"><div><p class="mut peq" style="margin:0">Solicitar alteração · vai para aprovação</p><h3>${esc(m.ref)} · ${esc(m.bairro || '')}</h3></div><button class="b" type="button" data-fechar>Fechar</button></div>
    <p class="peq mut" style="margin:0">Mude só o que precisa ser corrigido. A diretoria aprova e a alteração é aplicada no site.</p>
    <form id="fAlt" class="form" data-id="${esc(id)}">
      ${camposAlterar(m)}
      <label class="c inteiro">Observação para a diretoria<textarea id="a_obs" placeholder="Ex.: proprietário baixou o preço em 20/10"></textarea></label>
      <div class="inteiro linha"><button class="b p" type="submit">Enviar para aprovação</button><span class="erro" id="eAlt"></span></div>
    </form></div>`;
}

// ---------- Pesquisar imóveis ----------
const listaSel = (x) => (Array.isArray(x) ? x : (x ? [x] : []));   // filtro de vários valores (bairros)
function filtrarVitrine() {
  const f = S.fv;
  const L0 = S.vitrine.filter((v) => {
    if (f.fin && v.fin !== f.fin) return false;
    if (f.tipo && v.tipo !== f.tipo) return false;
    if (listaSel(f.bairro).length && !listaSel(f.bairro).includes(v.bairro)) return false;   // vários bairros (26/10/2026)
    if (f.dorm && !(v.dorm >= Number(f.dorm))) return false;
    if (f.vagas && !(v.vagas >= Number(f.vagas))) return false;
    if (f.vmin && !(v.valor >= Number(f.vmin))) return false;
    if (f.vmax && !(v.valor <= Number(f.vmax))) return false;
    if ((f.m2min || f.m2max) && !((m2v) => m2v != null && (!f.m2min || m2v >= Number(f.m2min)) && (!f.m2max || m2v <= Number(f.m2max)))(m2De(v))) return false;
    return true;
  });
  const fV = BA.filtra(L0, qDe('pesquisa'), baImv); if (S.aba === 'pesquisa') qInfo(fV, 'anúncios');
  return fV.lista;
}
function formFiltrosVit() {   // Pesquisar e Mapa usam os mesmos filtros (Nicolas, 26/10/2026)
  const f = S.fv, uniq = (k) => [...new Set(S.vitrine.map((v) => v[k]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const sel = (id, k, rot) => `<label class="c">${rot}<select id="${id}"><option value="">Todos</option>${uniq(k).map((o) => `<option ${o === f[k === 'fin' ? 'fin' : k] ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  return `<div class="painel form">
      ${sel('fvFin', 'fin', 'Finalidade')}${sel('fvTipo', 'tipo', 'Tipo')}<div class="c">Bairros${MultiSel.html('fvBairro', uniq('bairro').map((b) => [b, b]), listaSel(f.bairro), 'Todos', 'bairros')}</div>
      <label class="c">Dormitórios (mín.)<input id="fvDorm" type="number" min="0" inputmode="numeric" value="${esc(f.dorm)}"></label>
      <label class="c">Vagas (mín.)<input id="fvVagas" type="number" min="0" inputmode="numeric" value="${esc(f.vagas)}"></label>
      <label class="c">Valor mínimo (R$)<input id="fvMin" ${VLR} value="${esc(fmtVlr(f.vmin))}"></label>
      <label class="c">Valor máximo (R$)<input id="fvMax" ${VLR} value="${esc(fmtVlr(f.vmax))}"></label>
      <label class="c">R$/m² mínimo<input id="fvM2Min" ${VLR} value="${esc(fmtVlr(f.m2min))}"></label>
      <label class="c">R$/m² máximo<input id="fvM2Max" ${VLR} value="${esc(fmtVlr(f.m2max))}"></label>
      <div class="inteiro"><button class="b" type="button" id="fvLimpar">Limpar filtros</button></div>
    </div>`;
}
const nFiltrosVit = () => ['fin', 'tipo', 'dorm', 'vagas', 'vmin', 'vmax', 'm2min', 'm2max'].filter((k) => S.fv[k] !== '' && S.fv[k] != null).length + (listaSel(S.fv.bairro).length ? 1 : 0);
function vPesquisa() {
  const f = S.fv, uniq = (k) => [...new Set(S.vitrine.map((v) => v[k]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const L = filtrarVitrine();
  const sel = (id, k, rot) => `<label class="c">${rot}<select id="${id}"><option value="">Todos</option>${uniq(k).map((o) => `<option ${o === f[k === 'fin' ? 'fin' : k] ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  const cols = [
    { k: '_foto', l: 'Foto', ord: false, h: (r) => capaHtml(r.id, r, 'p') },
    { k: 'ref', l: 'Ref.', h: (r) => `<span class="ref">${esc(r.ref)}</span>${hitBA(r)}<div class="mut peq">${esc(r.fin || '')}</div>` },
    { k: 'tipo', l: 'Tipo' },
    { k: 'bairro', l: 'Bairro', h: (r) => `${esc(r.bairro || '—')}<div class="mut peq" data-sens>${esc(r.end || '')}</div>` },
    { k: 'valor', l: 'Valor', n: true, h: (r) => `<b>${brl(r.valor)}</b>${r.cond ? `<div class="mut peq">cond. ${brl(r.cond)}</div>` : ''}` },
    { k: '_m2', l: 'R$/m²', n: true, v: (r) => m2De(r), h: (r) => m2De(r) != null ? `<span style="white-space:nowrap">${m2Fmt(m2De(r))}</span>${m2Fin(r) === 'A' ? '<div class="mut peq">aluguel</div>' : ''}` : '—' },
    { k: 'dorm', l: 'Dorm.', n: true, h: (r) => r.dorm ? `${r.dorm}${r.suites ? ` <span class="mut peq">(${r.suites} suíte${r.suites > 1 ? 's' : ''})</span>` : ''}` : '—' },
    { k: 'vagas', l: 'Vagas', n: true, h: (r) => num(r.vagas) },
    { k: 'area', l: 'Área', n: true, h: (r) => r.area ? num(r.area, 1) + ' m²' : '—' },
    { k: 'cor', l: 'Agenciador', h: (r) => esc(r.cor || '—') },
    { k: 'cad', l: 'Cadastrado / Atualizado', ords: [['cad', 'Cadastrado'], ['atu', 'Atualizado']], h: (r) => `<span style="white-space:nowrap"><span class="mut peq">Cad.</span> ${dt(r.cad)}</span><br><span style="white-space:nowrap"><span class="mut peq">Atu.</span> ${dt(r.atu)}</span>` },
    { k: 'link', l: 'Links', ord: false, h: (r) => [r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">site</a>` : '', r.lat != null ? `<button class="copiar" type="button" data-vermapa="${esc(r.id)}">🗺 mapa</button>` : '', gmapsDe(r) ? `<a href="${esc(gmapsDe(r))}" target="_blank" rel="noopener">📍 Google</a>` : ''].filter(Boolean).join(' · ') || '—' },
  ];
  return `<section class="sec"><div class="linha" style="justify-content:space-between"><h2>Pesquisar imóveis</h2><span class="mut peq">${L.length} de ${S.vitrine.length} anúncios ativos</span><button class="b pv-filt-bt${nFiltrosVit() ? ' p' : ''}" type="button" data-pvfiltro aria-expanded="${!!S.pvFiltro}">Filtros${nFiltrosVit() ? ` (${nFiltrosVit()})` : ''} ${S.pvFiltro ? '▲' : '▼'}</button></div>
    <div class="pv-filtros${S.pvFiltro ? ' aberto' : ''}">${formFiltrosVit()}</div>
    ${m2Bloco(L)}
    ${tabela('vit', cols, L, { padrao: { c: 'atu', d: -1 }, pag: qDe() ? 0 : 50, pagina: S.pagVit, abre: (r) => 'vit:' + r.id, vazio: 'Nenhum imóvel com esses filtros.', cartao: (r) => `<div class="com-capa">${capaHtml(r.id, r)}<div class="txt">
      <div class="cm-l1"><span class="ref">${esc(r.ref)}</span>${hitBA(r)}<span class="cm-lin">${esc(r.tipo || '')} · ${esc(r.fin || '')}</span><b class="cm-v">${curtoBRL(r.valor) || '—'}</b></div>
      <div class="cm-lin">${esc(r.bairro || '—')}${r.end ? ' · <span data-sens>' + esc(r.end) + '</span>' : ''}</div>
      <div class="cm-fat">${fatosCurtos(r)}${r.cond ? `<span>cond. ${curtoBRL(r.cond)}</span>` : ''}</div>
      <div class="cm-acoes"><span class="mut">${esc(r.cor || 'sem agenciador')} · cad. ${dt(r.cad)} · atu. ${dt(r.atu)}</span>${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">site</a>` : ''}${r.lat != null ? `<button class="copiar" type="button" data-vermapa="${esc(r.id)}">🗺 mapa</button>` : ''}${gmapsDe(r) ? `<a href="${esc(gmapsDe(r))}" target="_blank" rel="noopener">📍 Google</a>` : ''}</div></div></div>` })}
    <p class="status">Proprietário e contato aparecem só nos imóveis que você agenciou (aba Meus imóveis).</p></section>`;
}
/* FICHA-IMOVEL-GALERIA: fotos, titulo e descricao do anuncio do site (31/10/2026, pedido do Cleiton).
   Alta qualidade editada e marca d'agua padrao: em standby (Nicollas e William). Ate la, maior tamanho publicado no site. */
const GAL = { fotos: [], i: 0, ref: '', id: '', dados: null };
// fatia B2 (02/11/2026): fotos do anúncio na coleção galeria_fotos (1 doc por anúncio, partes <id>~2…), lidas só quando o corretor abre o anúncio
const GALF = {}, GALV = {};
function galFotos(id) {
  if (GALF[id] || !db) return GALF[id] || null;
  const col = db.collection('galeria_fotos'); GALF[id] = { carregando: true, p: [], f: [] };
  col.doc(id).get().then((s) => {
    if (!s.exists) { GALF[id] = { falta: true, p: [], f: [] }; galRedesenha(id); return; }
    const d = s.data() || {}, n = Number(d.partes) || 1;
    if (Array.isArray(d.s) && d.s.length) { // fotos-arquivos (02/11/2026): uma imagem por anúncio nos arquivos do painel; o banco guarda só o endereço e os recortes
      GALF[id] = { p: [], f: [], n: d.n || 0, carregando: true }; galRedesenha(id);
      Promise.all(d.s.filter((x) => x && /^\/_blob\/[0-9a-f]{32}$/.test(x.a || '') && Array.isArray(x.o)).map(galRecorta))
        .then((ll) => { GALF[id].p = [].concat(...ll); GALF[id].carregando = false; if (!GALF[id].p.length) GALF[id].falta = true; galRedesenha(id); });
      return;
    }
    GALF[id] = { p: (d.p || []).filter((x) => /^data:image\//.test(x)), f: (d.f || []).slice(), n: d.n || 0, carregando: n > 1 }; galRedesenha(id);
    if (n > 1) Promise.all(Array.from({ length: n - 1 }, (_, i) => col.doc(id + '~' + (i + 2)).get()))
      .then((ss) => { ss.forEach((x) => { if (x.exists) GALF[id].p.push(...((((x.data() || {}).p) || []).filter((y) => /^data:image\//.test(y)))); }); })
      .catch(() => {}).then(() => { GALF[id].carregando = false; galRedesenha(id); });
  }).catch(() => { GALF[id] = { falta: true, p: [], f: [] }; galRedesenha(id); });
  return GALF[id];
}
function galRecorta(x) {
  return new Promise((ok) => { const im = new Image(); const tm = setTimeout(() => { im.src = ''; ok([]); }, 20000);
    im.onload = () => { const out = [], w = im.naturalWidth; try { x.o.forEach((r) => { const y = Number(r[0]) || 0, h = Number(r[1]) || 0; if (!h) return; const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, y, w, h, 0, 0, w, h); out.push(c.toDataURL('image/jpeg', 0.85)); }); } catch (e) {} clearTimeout(tm); ok(out); };
    im.onerror = () => { clearTimeout(tm); ok([]); }; im.src = x.a; });
}
function galRedesenha(id) {
  const v = GALV[id] || (S.vitrine || []).find((x) => x.id === id);
  document.querySelectorAll('[data-galbloco]').forEach((el) => { if (el.dataset.galbloco === id && v) el.outerHTML = galeriaHTML(v); });
  if (GAL.id === id && document.getElementById('gal-vis') && GALF[id] && GALF[id].p.length) { GAL.dados = GALF[id].p; galDesenha(); }
}
function galUrl(f) { return (S.galCdn || 'https://www.viverenapraia.com.br/imagens/imoveis/') + (/\.[a-z]{3,4}$/i.test(f) ? f : f + '.jpg'); }
function galeriaHTML(v) {
  const g = (S.galeria || {})['i-' + v.id]; if (!g) return '';
  const F = g.f || []; const n = F.length; const ver = F.slice(0, 9);
  const m2 = m2De(v) != null ? ' · ' + m2Rot(v) : '';
  GALV[v.id] = v; const gf = n ? galFotos(v.id) : null;
  return `<div class="prop" data-galbloco="${esc(v.id)}"><div class="t">Fotos do anúncio <span class="mut peq">${n} foto${n === 1 ? '' : 's'}${m2}</span></div>
    ${g.t ? `<p style="margin:0 0 6px;font-weight:600">${esc(g.t)}</p>` : ''}
    ${n ? (() => { // ajustes-3 fatia B (02/11/2026): o artefato não carrega imagem de site de fora; as fotos abrem no site, e as miniaturas gravadas no banco (g.m, data:) aparecem quando existirem
      const site = v.link || galUrl(F[0]);
      if (gf && gf.p.length) { const tot = gf.carregando ? Math.max(gf.n || 0, gf.p.length) : gf.p.length, mini = gf.p.slice(0, 3);
        return `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:6px">${mini.map((x, i) => `<button type="button" class="b" data-gal="${esc(v.id)}|${i}" aria-label="Ver a foto ${i + 1} de ${tot}" style="padding:0;overflow:hidden;aspect-ratio:4/3;border-radius:6px;min-width:0"><img src="${esc(x)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></button>`).join('')}</div><div class="linha"><button type="button" class="b p" data-gal="${esc(v.id)}|0">📷 Ver as ${tot} fotos</button><a class="b" href="${esc(site)}" target="_blank" rel="noopener">Ver no site ↗</a>${gf.carregando ? '<span class="mut peq">carregando o restante…</span>' : ''}</div>`; }
      if (gf && gf.carregando) return `<div class="mut peq" style="margin-bottom:6px">Carregando as fotos…</div><div class="linha"><a class="b p" href="${esc(site)}" target="_blank" rel="noopener">📷 Ver as ${n} fotos no site</a></div>`;
      return `<div class="linha"><a class="b p" href="${esc(site)}" target="_blank" rel="noopener">📷 Ver as ${n} fotos no site</a></div>`; })() : '<p class="mut peq">Sem fotos lidas no site.</p>'}
    ${g.d ? `<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:600">Descrição do anúncio</summary><div class="peq" style="white-space:pre-line;margin-top:6px">${esc(g.d)}</div></details>` : ''}</div>`;
}
function galFecha() { const el = document.getElementById('gal-vis'); if (el) el.remove(); GAL.id = ''; GAL.dados = null; document.removeEventListener('keydown', galTecla); }
function galTecla(e) { if (e.key === 'Escape') galFecha(); else if (e.key === 'ArrowRight') galPasso(1); else if (e.key === 'ArrowLeft') galPasso(-1); }
function galPasso(n) { const t = GAL.dados ? GAL.dados.length : GAL.fotos.length; if (!t) return; GAL.i = (GAL.i + n + t) % t; galDesenha(); }
function galDesenha() {
  let el = document.getElementById('gal-vis');
  if (!el) { el = document.createElement('div'); el.id = 'gal-vis'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Fotos do anúncio');
    el.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.92);display:flex;flex-direction:column;color:#fff';
    document.body.appendChild(el); document.addEventListener('keydown', galTecla);
    let x0 = null; el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) galPasso(dx < 0 ? 1 : -1); x0 = null; }, { passive: true });
    el.addEventListener('click', (e) => { const p = e.target.closest('[data-galp]'); if (p) { galPasso(Number(p.dataset.galp)); return; } if (e.target.closest('[data-galx]') || e.target === el) galFecha(); }); }
  const u = galUrl(GAL.fotos[GAL.i] || GAL.fotos[0]), src = GAL.dados && GAL.dados[GAL.i] ? GAL.dados[GAL.i] : u;
  el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;flex-wrap:wrap"><b style="flex:1;min-width:0">${esc(GAL.ref)} · foto ${GAL.i + 1} de ${GAL.dados ? GAL.dados.length : GAL.fotos.length}</b>
      <a href="${esc(u)}" target="_blank" rel="noopener" style="color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:6px;padding:6px 10px;text-decoration:none;white-space:nowrap">Abrir no maior tamanho ↗</a>
      <button type="button" data-galx="1" aria-label="Fechar" style="background:none;border:1px solid rgba(255,255,255,.5);color:#fff;border-radius:6px;padding:6px 12px;font-size:16px">✕</button></div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;min-height:0;padding:0 6px 10px">
      <button type="button" data-galp="-1" aria-label="Anterior" style="background:rgba(255,255,255,.12);border:0;color:#fff;font-size:26px;width:40px;height:64px;border-radius:6px;flex:none">‹</button>
      <img src="${esc(src)}" alt="Foto ${GAL.i + 1} do anúncio ${esc(GAL.ref)}" style="max-width:calc(100% - 92px);max-height:100%;object-fit:contain;border-radius:4px">
      <button type="button" data-galp="1" aria-label="Próxima" style="background:rgba(255,255,255,.12);border:0;color:#fff;font-size:26px;width:40px;height:64px;border-radius:6px;flex:none">›</button></div>`;
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-gal]'); if (!b) return; const [id, i] = b.dataset.gal.split('|');
  const g = (S.galeria || {})['i-' + id]; if (!g || !(g.f || []).length) return; const v = (S.vitrine || []).find((x) => x.id === id) || {};
  const gf = GALF[id]; GAL.id = id; GAL.dados = gf && gf.p.length ? gf.p : null; GAL.fotos = gf && gf.f.length ? gf.f : g.f;
  GAL.i = Number(i) || 0; GAL.ref = v.ref || id; galDesenha(); });
function gavetaVitrine(id, v0) {
  const v = v0 || S.vitrine.find((x) => x.id === id); if (!v) return '';
  return `<div class="gaveta" role="dialog" aria-modal="true" aria-label="Imóvel"><div class="cab"><div><p class="mut peq" style="margin:0">${esc(v.fin || '')} · agenciado por ${esc(v.cor || '—')}</p><h3>${esc(v.ref)} · ${esc(v.tipo || '')}</h3></div><button class="b" type="button" data-fechar>Fechar</button></div>
    <div><span data-sens>${esc(v.end || '')}</span><div class="mut peq">${esc(v.bairro || '')} · ${esc(v.cidade || '')}</div></div>
    ${fatos(v)}
    ${galeriaHTML(v)}
    ${(() => { const e = S.prontos.has('empDocs') ? empCtx().empDoAnuncio.get(v.id) : null; return e ? `<div class="prop"><div class="t">Empreendimento</div><div class="linha"><button class="b" type="button" data-abre="emp:${esc(e.id)}">${esc(e.nome)}</button>${pillEmp(e.sit)}<span class="mut peq">${esc(e.construtora || '')}</span></div></div>` : ''; })()}
    ${v.comodos || v.cond_itens || v.posicao ? `<div class="peq">${v.comodos ? `<p><span class="mut">Cômodos:</span> ${esc(v.comodos.join(' · '))}</p>` : ''}${v.cond_itens ? `<p><span class="mut">Condomínio:</span> ${esc(v.cond_itens.join(' · '))}</p>` : ''}${v.posicao ? `<p><span class="mut">Posição solar:</span> ${esc(v.posicao.join(', '))}</p>` : ''}</div>` : ''}
    <div class="linha">${v.link ? `<a class="b p" href="${esc(v.link)}" target="_blank" rel="noopener">Ver anúncio no site</a>` : ''}${btnsMapa(v.id, v)}<span class="mut peq">Atualizado em ${dt(v.atu)}</span></div></div>`;
}

// ficha de Meus imóveis (ajustes-3, 02/11/2026): a mesma ficha da pesquisa, com os botões do agenciamento
function gavetaMeu(id) {
  const m = S.meus[id]; if (!m) return gavetaVitrine(id);
  const v = S.vitrine.find((x) => x.id === id) || { ...m, id, end: [m.logradouro || m.end, m.numero, m.complemento].filter(Boolean).join(', ') };
  const h = gavetaVitrine(id, v), k = h.lastIndexOf('</div>'); if (k < 0) return h;
  const u = ultimoAgenc(id), ev = eventosDe(id), pd = Object.entries(S.sol).filter(([sid, s]) => s.imovel_id === id && statusDe(sid, s) === 'pendente').length;
  const card = `<div class="linha acoes-imv" style="margin-top:4px"><button class="b" type="button" data-fotosimv="${esc(id)}">Adicionar fotos</button><span class="mut peq">${m.ativo ? 'Ativo no site' : 'Inativo no site'}${u && u.dias != null ? ' · agenciamento atualizado há ' + u.dias + ' dia' + (u.dias === 1 ? '' : 's') : ''}${pd ? ` · <b>${pd} pedido${pd > 1 ? 's' : ''} aguardando a diretoria</b>` : ''}</span></div>
    <div class="painel sec" id="secAgenc" style="gap:10px"><h2>Atualizar agenciamento</h2><p style="margin:0">${seloAgenc(id)}</p>
      <form id="fMeu" class="form" data-id="${esc(id)}">
        <label class="c inteiro">O que foi feito<select id="agTipo">${TIPOS_AGENC.map((t) => `<option>${t}</option>`).join('')}</select></label>
        <label class="c inteiro">Resumo<textarea id="agTexto" placeholder="Digite ou toque no microfone do teclado para ditar. Ex.: falei com o proprietário, mantém o valor e libera visitas aos sábados"></textarea></label>
        <details class="inteiro" id="detAlt"><summary><b>Mudou algum dado?</b> <span class="mut peq">valor, condomínio, IPTU, áreas, quartos, situação, descrição ou proprietário · vai para aprovação da diretoria</span></summary>
          <div class="form" style="margin-top:10px">${camposAlterar(m)}</div></details>
        <div class="inteiro linha"><button class="b p" type="submit">Salvar</button><button class="b" type="button" data-conversa="imv:${esc(id)}">✦ Registrar por conversa</button><span class="erro" id="eMeu"></span></div>
        <p class="inteiro peq mut" style="margin:0">Só conversa: vai para o histórico e conta para o prazo de ${PZ().agenc_limite_dias} dias. Mudou dado: também vira solicitação para a diretoria aprovar; nada muda no site antes disso.</p>
      </form></div>
    <div class="painel"><h2>Histórico do agenciamento</h2><div class="hist" style="margin-top:10px">${ev.length ? ev.map((e) => `<div class="i"><div class="q">${dt(e.em)} · ${esc(e.tipo)}${e.origem === 'ia' ? ' · organizado com IA' : ''}</div>${esc(e.texto)}</div>`).join('') : '<p class="mut">Nenhum registro ainda.</p>'}</div></div>`;
  return h.slice(0, k) + card + h.slice(k);
}
// salvar do card único: histórico sempre; solicitação só quando algum dado mudou (decisão do Cleiton, 05/11/2026)
async function salvarCardImovel(form) {
  const id = form.dataset.id, m = S.meus[id], err = document.getElementById('eMeu'); err.textContent = '';
  if (!m) return;
  const texto = val('agTexto'), tipo = val('agTipo'), alt = lerAlteracoes(m), nAlt = Object.keys(alt).length;
  if (!texto && !nAlt) { err.textContent = 'Escreva o resumo ou mude algum dado.'; return; }
  const em = agora().slice(0, 16), resumoAlt = Object.entries(alt).map(([k, x]) => `${ROT_ALT[k] || k}: ${k === 'descricao' ? 'nova descrição' : fmtAlt(k, x.de) + ' → ' + fmtAlt(k, x.para)}`).join('; ');
  const textoEv = [texto, nAlt ? 'Pedido de alteração enviado à diretoria (' + resumoAlt + ').' : ''].filter(Boolean).join(' ');
  if (nAlt) {
    const ok = await gravar(() => db.collection('solicitacoes').doc('s-' + Date.now().toString(36)).set({ imovel_id: id, ref: m.ref, alteracoes: alt, obs: texto, status: 'pendente', criado_em: agora(), corretor: S.info.slug || '', origem: 'card' }), 'Enviado para aprovação.');
    if (!ok) return;
  }
  const ok2 = await gravar(() => db.collection('eventos_agenciamento').doc('e-' + Date.now().toString(36)).set({ imovel_id: id, ref: m.ref || '', tipo, texto: textoEv, em, corretor: S.info.slug || '', origem: 'painel' }), nAlt ? 'Atualização registrada e alteração enviada para aprovação (veja em Solicitações).' : 'Atualização registrada.');
  if (nAlt && !ok2) toast('Pedido enviado à diretoria, mas o histórico não foi gravado: registre a atualização de novo.');
  if (ok2 || nAlt) fechar();
}

// ---------- Solicitações ----------
function vSolic() {
  const L0 = Object.entries(S.sol).map(([id, s]) => ({ id, ...s, _st: statusDe(id, s), _em: s.enviado_em || s.criado_em }));
  const TIPO0 = { novo_imovel: 'cadastro de imóvel', fotos: 'fotos novas', alteracao: 'alteração', captacao: 'captação de imóvel', corretor_anunciante: 'corretor anunciante' }, ST0 = { rascunho: 'rascunho', pendente: 'aguardando aprovação', complemento: 'complementar', aprovada: 'aprovada', recusada: 'recusada', aplicada: 'aplicada', cancelada: 'cancelada' };
  const fS = BA.filtra(L0, qDe(), (r) => ({ txt: [r.ref, TIPO0[r.tipo || 'alteracao'], ST0[r._st] || r._st, r.obs, r.descricao, r.imovel, r.cliente_nome, ...Object.keys(r.alteracoes || {}), ...Object.values(r.dados || {}).map((v) => Array.isArray(v) ? v.join(' ') : v)].filter((x) => x != null).join(' · '), valores: [(r.dados || {}).valor], nums: { dorm: (r.dados || {}).dormitorios, vagas: (r.dados || {}).vagas } }));
  const L = fS.lista; qInfo(fS, 'solicitações');
  const TIPO = { novo_imovel: 'Cadastro de imóvel', fotos: 'Fotos novas', alteracao: 'Alteração', captacao: 'Captação de imóvel', corretor_anunciante: 'Corretor anunciante' };
  const resumo = (r) => r.tipo === 'corretor_anunciante' ? 'Lead de captação: ' + ((S.leads[r.lead_painel] || {}).nome || 'lead') : r.tipo === 'captacao' ? [r.imovel || r.ref || 'Imóvel captado', r.cliente_nome ? 'para ' + r.cliente_nome : ''].filter(Boolean).join(' · ') : r.tipo === 'novo_imovel' ? `${(r.fotos || []).length} fotos · ${(r.docs || []).length} documentos${r._st === 'rascunho' ? ` · faltam ${faltantes(r).length} itens` : ''}` : r.tipo === 'fotos' ? `${(r.fotos || []).length} fotos` : Object.keys(r.alteracoes || {}).join(', ') || (r.obs ? 'observação' : '—');
  const cols = [
    { k: '_em', l: 'Data', h: (r) => dt(r._em) },
    { k: 'tipo', l: 'Tipo', v: (r) => TIPO[r.tipo || 'alteracao'], h: (r) => esc(TIPO[r.tipo || 'alteracao']) },
    { k: 'ref', l: 'Imóvel', h: (r) => `<span class="ref">${esc(r.ref || '—')}</span>` },
    { k: 'resumo', l: 'Conteúdo', ord: false, h: (r) => `<span class="peq">${esc(resumo(r))}</span>` },
    { k: '_st', l: 'Situação', h: (r) => pillSit(r._st) },
  ];
  const pend = L.filter((r) => r._st === 'pendente').length;
  return `<section class="sec"><div class="linha" style="justify-content:space-between"><h2>Solicitações</h2>${S.ehDono ? '' : '<button class="b p" type="button" id="novoImovel">+ Cadastrar imóvel</button>'}</div>
    ${S.ehDono ? `<div class="faixa-dono">Você está como diretoria: ${pend} pedido${pend === 1 ? '' : 's'} aguardando. Toque num pedido para aprovar ou recusar.</div>` : ''}
    ${tabela('sol', cols, L, { padrao: { c: '_em', d: -1 }, abre: (r) => 'sol:' + r.id, vazio: 'Nenhuma solicitação. Use "Cadastrar imóvel", "Solicitar alteração" ou "Adicionar fotos" em Meus imóveis.', cartao: (r) => `
      <div class="cm-l1"><span class="cm-nome">${esc(TIPO[r.tipo || 'alteracao'])} · <span class="ref">${esc(r.ref || '—')}</span></span><span class="cm-v">${pillSit(r._st)}</span></div>
      <div class="cm-lin">${esc(resumo(r))} · ${dt(r._em)}</div>` })}
    <p class="status">Nada vai ao site sem a aprovação da diretoria.</p></section>`;
}

// ---------- Cadastro de imóvel novo, fotos e aprovação ----------
const naoTerreno = (d) => d.tipo !== 'Terreno';
const ehVenda = (d) => d.finalidade === 'Venda';
const ehLoc = (d) => d.finalidade === 'Locação anual';
const naoVenda = (d) => !!d.finalidade && d.finalidade !== 'Venda';
const temConjuge = (d) => /Casad|União/.test(d.p_estado_civil || '');
const temMatricula = (d) => /matrícula/.test(d.escritura || '');
const SECOES = [
  ['Proprietário', [
    { k: 'p_nome', l: 'Nome completo', obr: 1 },
    { k: 'p_cpf', l: 'CPF (ou CNPJ)', inp: 'numeric' },
    { k: 'p_celular', l: 'Celular com DDD', obr: 1, t: 'tel' },
    { k: 'p_email', l: 'E-mail', t: 'email' },
    { k: 'p_estado_civil', l: 'Estado civil', t: 'sel', op: ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Separado(a)', 'Viúvo(a)', 'Pessoa jurídica'] },
    { k: 'p_conjuge_nome', l: 'Nome do cônjuge ou companheiro(a)', obr: temConjuge, se: temConjuge },
    { k: 'p_conjuge_cpf', l: 'CPF do cônjuge ou companheiro(a)', obr: temConjuge, se: temConjuge, inp: 'numeric' },
    { k: 'p_endereco', l: 'Endereço residencial com CEP', obr: 1, w: 1 },
    { k: 'p_rg', l: 'RG ou outro documento' },
    { k: 'p_profissao', l: 'Profissão' },
    { k: 'p_nascimento', l: 'Data de nascimento', t: 'date' },
    { k: 'p_nacionalidade', l: 'Nacionalidade' },
    { k: 'p_tel2', l: 'Outro telefone', t: 'tel' },
  ]],
  ['Imóvel', [
    { k: 'finalidade', l: 'Finalidade', obr: 1, t: 'sel', op: ['Venda', 'Locação anual', 'Temporada'] },
    { k: 'uso', l: 'Uso', obr: 1, t: 'sel', op: ['Residencial', 'Comercial'] },
    { k: 'tipo', l: 'Tipo', obr: 1, t: 'sel', op: ['Apartamento', 'Cobertura', 'Casa', 'Casa em condomínio', 'Geminado/Duplex', 'Terreno', 'Sala comercial', 'Loja', 'Galpão', 'Outro'] },
    { k: 'cep', l: 'CEP', obr: 1, inp: 'numeric' },
    { k: 'logradouro', l: 'Rua ou avenida', obr: 1 },
    { k: 'numero', l: 'Número', obr: 1 },
    { k: 'complemento', l: 'Unidade, bloco ou casa', obr: (d) => /Apartamento|Cobertura|Sala|condomínio|Geminado/.test(d.tipo || '') },
    { k: 'bairro', l: 'Bairro', obr: 1 },
    { k: 'cidade', l: 'Cidade', obr: 1, ph: 'Florianópolis' },
    { k: 'condominio_nome', l: 'Nome do condomínio ou empreendimento', obr: (d) => /Apartamento|Cobertura|condomínio|Sala/.test(d.tipo || '') },
  ]],
  ['Características', [
    { k: 'dorm', l: 'Dormitórios', t: 'number', obr: naoTerreno },
    { k: 'suites', l: 'Suítes', t: 'number', obr: naoTerreno },
    { k: 'banh', l: 'Banheiros', t: 'number', obr: naoTerreno },
    { k: 'vagas', l: 'Vagas de garagem', t: 'number', obr: naoTerreno },
    { k: 'box', l: 'Identificação das vagas e do box' },
    { k: 'area_privativa', l: 'Área privativa (m²)', t: 'number', obr: naoTerreno },
    { k: 'area_total', l: 'Área total (m²)', t: 'number' },
    { k: 'area_terreno', l: 'Área do terreno (m²)', t: 'number', obr: (d) => /^(Casa|Terreno|Galpão)$/.test(d.tipo || '') },
    { k: 'cond_itens', l: 'Condomínio', t: 'multi', w: 1, op: ['Elevador', 'Gás central', 'Hobby box', 'Segurança 24h', 'Academia', 'Piscina', 'Fireplace', 'Portão eletrônico', 'Salão de festas', 'Sauna', 'SPA / Hidromassagem'] },
    { k: 'infra', l: 'Infraestrutura', t: 'multi', w: 1, op: ['Ar-condicionado', 'Hidromassagem', 'Área de serviço', 'Copa', 'Cozinha', 'Dependência de empregada', 'Despensa', 'Escritório', 'Móveis planejados', 'Churrasqueira', 'Piscina'] },
    { k: 'orientacao', l: 'Posição solar', t: 'multi', obr: naoTerreno, w: 1, op: ['Leste', 'Norte', 'Oeste', 'Sul'] },
    { k: 'padrao', l: 'Padrão', t: 'sel', op: ['Alto', 'Médio', 'Baixo'] },
    { k: 'conservacao', l: 'Conservação', t: 'sel', op: ['Excelente', 'Bom', 'Ruim'] },
    { k: 'mobilia', l: 'Mobília', t: 'sel', op: ['Mobiliado', 'Semimobiliado', 'Sem mobília'] },
    { k: 'situacao', l: 'Situação', t: 'sel', op: ['Usado', 'Novo', 'Na planta', 'Em construção'] },
    { k: 'ano', l: 'Ano de construção ou previsão de entrega', t: 'number' },
    { k: 'construtora', l: 'Construtora', obr: (d) => /planta|construção/i.test(d.situacao || ''), se: (d) => /planta|construção/i.test(d.situacao || '') },
    { k: 'ocupacao', l: 'Ocupação', t: 'sel', op: ['Desocupado', 'Ocupado pelo proprietário', 'Ocupado por inquilino'] },
    { k: 'diferenciais', l: 'Diferenciais do imóvel e do condomínio (vista, distância do mar, lazer…)', t: 'area', obr: 1, w: 1 },
  ]],
  ['Valores e condições', [
    { k: 'valor', l: (d) => d.finalidade === 'Venda' ? 'Valor de venda (R$)' : d.finalidade === 'Temporada' ? 'Valor da diária (R$)' : d.finalidade ? 'Valor do aluguel (R$)' : 'Valor (R$)', t: 'number', vlr: 1, obr: 1 },
    { k: 'condominio', l: 'Condomínio mensal (R$; 0 se não há)', t: 'number', vlr: 1, obr: 1 },
    { k: 'iptu', l: 'IPTU anual (R$)', t: 'number', vlr: 1, obr: 1 },
    { k: 'aceita', l: 'Aceita na negociação', t: 'multi', w: 1, se: ehVenda, op: ['Financiamento bancário', 'Parcelamento direto', 'Imóvel (permuta)', 'Veículo'] },
    { k: 'entrada_min', l: 'Entrada mínima (R$)', t: 'number', vlr: 1, se: ehVenda },
    { k: 'parcelas_max', l: 'Número máximo de parcelas', t: 'number', se: ehVenda },
    { k: 'pets', l: 'Aceita animais', t: 'sel', op: ['Sim', 'Não', 'A combinar'], se: naoVenda, obr: naoVenda },
    { k: 'garantias', l: 'Garantias que o proprietário aceita', t: 'multi', w: 1, se: ehLoc, obr: ehLoc, op: ['Título de capitalização', 'Fiador', 'Seguro fiança'] },
  ]],
  ['Documentação e regularidade', [
    { k: 'escritura', l: 'Situação do registro', t: 'sel', obr: 1, op: ['Escriturado com matrícula', 'Contrato particular ou cessão', 'Na planta (contrato com a construtora)'] },
    { k: 'matricula', l: 'Número da matrícula', obr: temMatricula, se: temMatricula },
    { k: 'cartorio', l: 'Ofício de registro de imóveis', obr: temMatricula, se: temMatricula },
    { k: 'inscricao_iptu', l: 'Inscrição imobiliária (IPTU)', obr: 1 },
    { k: 'averbacao', l: 'Construção averbada na matrícula', t: 'sel', obr: 1, op: ['Sim', 'Não', 'Não se aplica'] },
    { k: 'onus', l: 'Ônus, dívidas ou restrições conhecidas', t: 'area', w: 1 },
  ]],
  ['Agenciamento e visitas', [
    { k: 'exclusivo', l: 'Exclusividade', t: 'sel', obr: 1, op: ['Sim', 'Não'] },
    { k: 'prazo_dias', l: 'Prazo da autorização (dias)', t: 'number', obr: (d) => d.exclusivo === 'Sim' },
    { k: 'comissao', l: 'Comissão acordada', obr: 1, ph: 'Venda: 6% · Locação: adm. 10% + 1 aluguel' },
    { k: 'chaves', l: 'Onde estão as chaves' },
    { k: 'horario_visita', l: 'Horário para visitas' },
    { k: 'contato_visita', l: 'Quem marca a visita (nome e telefone)' },
    { k: 'obs', l: 'Observações para a diretoria', t: 'area', w: 1 },
  ]],
];
const TIPOS_DOC = ['Autorização ou ficha de agenciamento assinada', 'Matrícula ou contrato de aquisição', 'Carnê ou certidão do IPTU', 'Documento do proprietário (RG ou CNH)', 'Boleto do condomínio', 'Outro'];
const docsObrig = (d) => TIPOS_DOC.slice(0, 4).concat(Number(d.condominio) > 0 ? [TIPOS_DOC[4]] : []);
const MIN_FOTOS = 8;
const rotulo = (c, d) => typeof c.l === 'function' ? c.l(d) : c.l;
const vazio_ = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
const SITUACOES = { rascunho: 'Rascunho', complemento: 'Complementar', pendente: 'Aguardando aprovação', aprovada: 'Aprovada', aplicada: 'Aplicada no site', recusada: 'Recusada', cancelada: 'Cancelada' };
// Status vem da decisão da diretoria (coleção que só a diretoria grava); o corretor só põe rascunho, pendente ou cancelada.
function statusDe(id, s) {
  const dc = S.decisoes[id];
  if (s.status === 'cancelada') return 'cancelada';
  // Pedido de complemento: volta a "aguardando" quando o corretor reenviar depois da decisão.
  if (dc && dc.status === 'complemento') return s.status === 'pendente' && (s.enviado_em || '') > (dc.em || '') ? 'pendente' : 'complemento';
  if (dc && dc.status) return dc.status;
  return ['rascunho', 'pendente', 'cancelada'].includes(s.status) ? s.status : 'pendente';
}
const pillSit = (st) => `<span class="pill ${st === 'aplicada' || st === 'aprovada' ? 'ok' : st === 'recusada' || st === 'complemento' ? 'alta' : st === 'pendente' ? 'media' : ''}">${esc(SITUACOES[st] || st)}</span>`;

function faltantes(n) {
  const d = n.dados || {}, out = [];
  for (const [, campos] of SECOES) for (const c of campos) {
    if (c.se && !c.se(d)) continue;
    const ob = typeof c.obr === 'function' ? c.obr(d) : !!c.obr;
    if (ob && vazio_(d[c.k])) out.push(rotulo(c, d));
  }
  const fotos = (n.fotos || []).length;
  if (fotos < MIN_FOTOS) out.push(`Fotos (${fotos} de ${MIN_FOTOS})`);
  const tem = new Set((n.docs || []).map((x) => x.tipo));
  for (const t of docsObrig(d)) if (!tem.has(t)) out.push('Documento: ' + t);
  if (!(n.descricao || '').trim() && !n.pede_descricao) out.push('Descrição do anúncio');
  return out;
}
function totalObrig(n) {
  const d = n.dados || {}; let t = 0;
  for (const [, campos] of SECOES) for (const c of campos) { if (c.se && !c.se(d)) continue; if (typeof c.obr === 'function' ? c.obr(d) : c.obr) t++; }
  return t + 1 + docsObrig(d).length + 1;
}
function campoHTML(c, d) {
  const id = 'c_' + c.k, v = d[c.k], l = esc(rotulo(c, d)), ob = (typeof c.obr === 'function' ? c.obr(d) : c.obr) ? ' *' : '';
  const cls = 'c' + (c.w ? ' inteiro' : '');
  if (c.t === 'sel') return `<label class="${cls}">${l}${ob}<select id="${id}" data-campo="${c.k}"><option value="">Escolha</option>${c.op.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  if (c.t === 'multi') return `<div class="${cls}"><span>${l}${ob}</span><div class="opcoes">${c.op.map((o, i) => `<label><input type="checkbox" id="${id}_${i}" data-multi="${c.k}" value="${esc(o)}" ${(v || []).includes(o) ? 'checked' : ''}>${esc(o)}</label>`).join('')}</div></div>`;
  if (c.t === 'area') return `<label class="${cls}">${l}${ob}<textarea id="${id}" data-campo="${c.k}" rows="3">${esc(v || '')}</textarea></label>`;
  if (c.vlr) return `<label class="${cls}">${l}${ob}<input id="${id}" data-campo="${c.k}" ${VLR} value="${esc(fmtVlr(v))}" placeholder="${esc(c.ph || '')}"></label>`;
  return `<label class="${cls}">${l}${ob}<input id="${id}" data-campo="${c.k}"${/^(logradouro|numero|complemento|comissao)$/.test(c.k) ? ' data-sens' : ''} type="${c.t === 'number' ? 'number' : c.t || 'text'}" ${c.t === 'number' ? 'step="any" inputmode="decimal"' : c.inp ? `inputmode="${c.inp}"` : ''} value="${esc(v ?? '')}" placeholder="${esc(c.ph || '')}"></label>`;
}
const htmlFotos = (fotos, rem) => fotos.length ? `<div class="fotos">${fotos.map((f, i) => `<figure><img src="${esc('/_blob/' + f.id)}" alt="Foto ${i + 1}" loading="lazy">${i === 0 ? '<span class="pill ok capa">Capa</span>' : ''}${rem ? `<button type="button" data-remfoto="${i}" aria-label="Remover foto ${i + 1}">×</button>${i ? `<button type="button" class="fcapa" data-capa="${i}" aria-label="Usar como capa">★</button>` : ''}` : ''}</figure>`).join('')}</div>` : '<p class="mut peq">Nenhuma foto ainda.</p>';
const htmlDocs = (docs, rem) => docs.length ? `<div class="hist">${docs.map((x, i) => `<div class="i"><div class="q">${esc(x.tipo)}</div><a href="${esc('/_blob/' + x.id)}" target="_blank" rel="noopener">${esc(x.nome || 'arquivo')}</a>${rem ? ` <button class="copiar" type="button" data-remdoc="${i}">Remover</button>` : ''}</div>`).join('')}</div>` : '<p class="mut peq">Nenhum documento ainda.</p>';

function progressoHTML(n) {
  const f = faltantes(n), tot = totalObrig(n), pct = Math.max(0, Math.round((1 - f.length / tot) * 100));
  return `<div class="barra-prog" aria-label="Cadastro ${pct}% completo"><i style="width:${pct}%"></i></div>
    <p class="peq" style="margin:6px 0 0"><b>${pct}% completo</b>${f.length ? ` · faltam ${f.length} itens (os campos com * são essenciais; dá para enviar assim mesmo, mas a diretoria pode pedir o complemento)` : ' · completo'}</p>
    ${f.length ? `<details><summary>Ver o que falta</summary><p class="falta">${f.map(esc).join(' · ')}</p></details>` : ''}`;
}
function gavetaNovoImovel() {
  const n = S.novo, d = n.dados;
  return `<div class="gaveta larga" role="dialog" aria-modal="true" aria-label="Cadastrar imóvel">
    <div class="cab"><div><p class="mut peq" style="margin:0">Cadastro de imóvel · vai para aprovação antes de ir ao site</p><h3>${esc(d.tipo || 'Imóvel novo')}${d.bairro ? ' · ' + esc(d.bairro) : ''}</h3></div><button class="b" type="button" data-fechar>Fechar</button></div>
    ${n.status_atual === 'complemento' && (S.decisoes[n.id] || {}).resposta ? `<div class="faixa-dono"><b>A diretoria pediu:</b> ${esc(S.decisoes[n.id].resposta)}</div>` : ''}
    <div class="painel" id="progNovo">${progressoHTML(n)}</div>
    <p class="peq mut" style="margin:0">🎤 Dica: toque no microfone do teclado para ditar os campos. <button class="copiar" type="button" data-voz="">Como funciona e o que vem por aí</button></p>
    <form id="fNovo" class="sec" novalidate>
      ${SECOES.map(([t, campos]) => `<fieldset class="sec-f"><legend>${t}</legend><div class="form">${campos.filter((c) => !c.se || c.se(d)).map((c) => campoHTML(c, d)).join('')}</div></fieldset>`).join('')}
      <fieldset class="sec-f"><legend>Fotos do anúncio</legend>
        <p class="peq mut" style="margin:0">Mínimo de ${MIN_FOTOS} fotos, na horizontal e com boa luz. A primeira é a capa (★ troca a capa).</p>
        <div id="listaFotos">${htmlFotos(n.fotos || [], true)}</div>
        <div class="linha"><label class="b" for="upFotos">+ Adicionar fotos</label><input id="upFotos" type="file" accept="image/*" multiple hidden><label class="b p" for="camFotos">📷 Tirar fotos</label><input id="camFotos" type="file" accept="image/*" capture="environment" hidden></div>
      </fieldset>
      <fieldset class="sec-f"><legend>Documentos da captação</legend>
        <p class="peq mut" style="margin:0">Obrigatórios: ${docsObrig(d).map(esc).join(' · ')}.</p>
        <div id="listaDocs">${htmlDocs(n.docs || [], true)}</div>
        <div class="linha"><select id="tipoDoc" aria-label="Tipo do documento">${TIPOS_DOC.map((t) => `<option>${esc(t)}</option>`).join('')}</select><label class="b" for="upDocs">+ Anexar</label><input id="upDocs" type="file" accept="image/*,application/pdf" multiple hidden></div>
      </fieldset>
      <fieldset class="sec-f"><legend>Descrição do anúncio</legend>
        <textarea id="c_descricao" data-raiz="descricao" rows="10" placeholder="Escreva a descrição ou use o botão para gerar um rascunho">${esc(n.descricao || '')}</textarea>
        <div class="linha"><button class="b" type="button" data-ia="c_descricao">${S.ia ? '✦ Gerar descrição com IA' : 'Pedir a descrição à Vivere'}</button><span class="mut peq" id="iaStatus">${n.pede_descricao ? 'A Vivere vai escrever a descrição na aprovação.' : ''}</span></div>
      </fieldset>
      <div class="linha"><button class="b" type="button" id="salvarRasc">Salvar rascunho</button><button class="b p" type="button" id="enviarNovo">${n.status_atual === 'complemento' ? 'Reenviar com o complemento' : 'Enviar para aprovação'}</button><span class="erro" id="eNovo"></span></div>
    </form></div>`;
}
function gavetaFotosImv() {
  const n = S.novo, m = S.meus[n.imovel_id] || {};
  return `<div class="gaveta" role="dialog" aria-modal="true" aria-label="Adicionar fotos">
    <div class="cab"><div><p class="mut peq" style="margin:0">Fotos novas · vão para aprovação</p><h3>${esc(m.ref || '')} · ${esc(m.bairro || '')}</h3></div><button class="b" type="button" data-fechar>Fechar</button></div>
    <div id="listaFotos">${htmlFotos(n.fotos || [], true)}</div>
    <div class="linha"><label class="b" for="upFotos">+ Escolher fotos</label><input id="upFotos" type="file" accept="image/*" multiple hidden><label class="b p" for="camFotos">📷 Tirar fotos</label><input id="camFotos" type="file" accept="image/*" capture="environment" hidden></div>
    <p class="peq mut" style="margin:0">Escolher fotos abre a galeria, os arquivos e o Google Drive do celular; no computador, as pastas do computador. Tirar fotos abre a câmera.</p>
    <label class="c">Observação (ex.: substituir as fotos antigas da sala)<textarea id="fotosObs">${esc(n.obs || '')}</textarea></label>
    <div class="linha"><button class="b p" type="button" id="enviarFotos">${n.status_atual === 'complemento' ? 'Reenviar com o complemento' : 'Enviar para aprovação'}</button><span class="erro" id="eNovo"></span></div></div>`;
}
function novoRegistro(tipo, extra = {}) {
  return { id: (tipo === 'fotos' ? 'f-' : 'c-') + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), tipo, dados: {}, fotos: [], docs: [], descricao: '', pede_descricao: false, ...extra };
}
async function gravarNovo(status, silencioso) {
  if (S.gestor) { if (!silencioso) toast(SO_LEITURA); return false; }
  const n = S.novo; if (!n) return false;
  // Pedido devolvido para complemento: os salvamentos intermediários mantêm a situação de complemento (o corretor reenvia no botão).
  if ((status === 'rascunho' || status === 'complemento_rascunho') && n.status_atual === 'complemento') status = 'pendente_rasc';
  const d = n.dados || {};
  const doc = {
    tipo: n.tipo, status: status === 'pendente_rasc' ? (n.status_orig || 'pendente') : status === 'complemento_rascunho' ? 'rascunho' : status, dados: d, fotos: n.fotos || [], docs: n.docs || [], descricao: n.descricao || '', pede_descricao: !!n.pede_descricao,
    descricao_origem: n.descricao_origem || '', obs: n.obs || '', corretor: S.info.slug || '', atualizado_em: agora(),
    ref: n.tipo === 'fotos' ? (S.meus[n.imovel_id] || {}).ref || '' : [d.tipo, d.bairro].filter(Boolean).join(' · ') || 'Imóvel novo',
    imovel_id: n.imovel_id || '', criado_em: n.criado_em || agora(), faltantes: n.tipo === 'novo_imovel' ? faltantes(n) : [],
  };
  if (status === 'pendente') doc.enviado_em = agora(); else if (n.enviado_em) doc.enviado_em = n.enviado_em;
  n.criado_em = doc.criado_em;
  const fn = () => db.collection('solicitacoes').doc(n.id).set(doc);
  if (silencioso) { try { await fn(); return true; } catch (e) { toast('Não foi possível salvar o rascunho.'); return false; } }
  return gravar(fn, status === 'pendente' ? 'Enviado para aprovação.' : 'Rascunho salvo.');
}
async function comprimir(file) {
  if (!/^image\//.test(file.type) || file.size < 900000) return file;
  try {
    const bmp = await createImageBitmap(file); const max = 2560, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86)); return b || file;
  } catch (e) { return file; }
}
async function enviarArquivos(files, destino, tipoDoc) {
  if (S.gestor) { toast(SO_LEITURA); return; }
  if (!S.assets) { toast('Envio de arquivos indisponível neste acesso. Fale com a diretoria.'); return; }
  const err = document.getElementById('eNovo'); if (err) err.textContent = '';
  let n = 0;
  for (const f of files) {
    toast(`Enviando ${++n} de ${files.length}…`);
    try {
      const b = await comprimir(f);
      const r = await S.assets.upload(b, { type: b.type || f.type });
      const item = { id: r.id, nome: f.name, tam: r.sizeBytes };
      if (destino === 'fotos') S.novo.fotos.push(item); else S.novo.docs.push({ ...item, tipo: tipoDoc });
    } catch (e) { if (err) err.textContent = `Não foi possível enviar ${f.name}: ${e && (e.code || e.message) || 'erro'}.`; }
  }
  await gravarNovo(S.novo.status_atual === 'complemento' ? 'complemento_rascunho' : 'rascunho', true);
  atualizarArquivos(); toast('Arquivos guardados no rascunho.');
}
function atualizarArquivos() {
  const lf = document.getElementById('listaFotos'); if (lf) lf.innerHTML = htmlFotos(S.novo.fotos || [], true);
  const ld = document.getElementById('listaDocs'); if (ld) ld.innerHTML = htmlDocs(S.novo.docs || [], true);
  const pg = document.getElementById('progNovo'); if (pg) pg.innerHTML = progressoHTML(S.novo);
}
function textoParaIA(d, m) {
  const base = m ? { tipo: m.tipo, finalidade: m.fin, bairro: m.bairro, cidade: m.cidade, area_privativa: m.area, dormitorios: m.dorm, suites: m.suites, banheiros: m.banh, vagas: m.vagas, itens: [...(m.comodos || []), ...(m.cond_itens || [])], descricao_atual: m.descricao }
    : Object.fromEntries(Object.entries(d).filter(([k, v]) => !/^p_|^(cep|numero|complemento|matricula|cartorio|inscricao_iptu|onus|chaves|horario_visita|contato_visita|comissao|prazo_dias|obs|condominio|iptu|entrada_min|parcelas_max)$/.test(k) && !vazio_(v)));
  return `Você redige descrições de anúncios da Vivere Imóveis Selecionados, imobiliária de Florianópolis.
Siga o estilo da casa:
- 1ª linha: título curto com exclamação, no formato "Apartamento à venda em Kobrasol!" (use a finalidade: à venda, para locação anual, para temporada).
- Depois, três parágrafos: (1) apresentação e localização, sem número da rua; (2) o imóvel: área privativa, dormitórios e suítes com dois dígitos (03 suítes, 02 vagas), ambientes e acabamento; (3) condomínio, lazer e diferenciais.
- Última linha fixa: "Agende uma visita com um dos consultores VIVERE e venha conhecer este imóvel único!"
- Português do Brasil, tom elegante e direto, sem exageros e sem emojis.
- Use só os dados abaixo. Não invente nada. Não cite proprietário, valores de condomínio ou IPTU, nem endereço com número.
Responda só com o texto do anúncio.

Dados do imóvel (JSON):
${JSON.stringify(base)}`;
}
async function gerarIA(alvo) {
  const ta = document.getElementById(alvo), st = document.getElementById('iaStatus') || document.getElementById('eAlt');
  if (!S.ia) {
    if (S.novo) { S.novo.pede_descricao = true; await gravarNovo('rascunho', true); atualizarArquivos(); }
    if (st) st.textContent = 'Pedido registrado: a Vivere vai escrever a descrição na aprovação.';
    if (!S.novo) { ta.value = (ta.value ? ta.value + '\n\n' : '') + '[Pedido: a Vivere escreve a descrição]'; }
    return;
  }
  const m = S.aberto && (S.aberto.tipo === 'alt' || S.aberto.tipo === 'meu') ? S.meus[S.aberto.id] : null;
  if (st) st.textContent = 'Gerando o rascunho…';
  try {
    const r = await S.ia(textoParaIA(S.novo ? S.novo.dados : {}, m), { modelTier: 'default', onText: ({ text }) => { ta.value = text; } });
    ta.value = r.text.trim();
    if (S.novo) { S.novo.descricao = ta.value; S.novo.descricao_origem = 'ia'; S.novo.pede_descricao = false; await gravarNovo('rascunho', true); atualizarArquivos(); }
    if (st) st.textContent = 'Rascunho gerado. Revise antes de enviar: a diretoria aprova o texto.';
  } catch (e) {
    if (st) st.textContent = e && e.code === 'rate_limited' ? 'Limite de uso da IA atingido agora. Tente mais tarde ou escreva o texto.' : 'Não foi possível gerar agora. Escreva o texto ou tente mais tarde.';
  }
}

// ---------- Detalhe de uma solicitação (corretor vê; diretoria aprova) ----------
function gavetaSol(id) {
  const s = S.sol[id]; if (!s) return '';
  const st = statusDe(id, s), dc = S.decisoes[id] || {}, d = s.dados || {}, tipo = s.tipo || 'alteracao';
  let corpo = '';
  if (tipo === 'novo_imovel') {
    corpo = SECOES.map(([t, campos]) => { const linhas = campos.filter((c) => !vazio_(d[c.k])).map((c) => `<div><span>${esc(rotulo(c, d))}</span><b${/^(logradouro|numero|complemento|comissao|valor|condominio|iptu|entrada_min)$/.test(c.k) ? ' data-sens' : ''}>${esc(Array.isArray(d[c.k]) ? d[c.k].join(', ') : c.t === 'number' && /valor|condominio|iptu|entrada/.test(c.k) ? brl(d[c.k]) : d[c.k])}</b></div>`).join(''); return linhas ? `<div class="painel"><h2>${t}</h2><div class="fatos" style="margin-top:10px">${linhas}</div></div>` : ''; }).join('');
    corpo += `<div class="painel"><h2>Descrição${s.descricao_origem === 'ia' ? ' (gerada com IA e revisada pelo corretor)' : ''}</h2>${s.pede_descricao ? '<p class="falta">O corretor pediu que a Vivere escreva a descrição.</p>' : `<p class="desc">${esc(s.descricao || '—')}</p>`}</div>`;
    corpo += `<div class="painel"><h2>Documentos</h2>${htmlDocs(s.docs || [], false)}</div>`;
    const f = faltantes(s); if (f.length) corpo = `<div class="painel"><p class="falta" style="margin:0">Faltando: ${f.map(esc).join(' · ')}</p></div>` + corpo;
  } else if (tipo === 'corretor_anunciante') {
    corpo = `<div class="painel peq"><p style="margin:0">Aviso de que o lead de captação <b>${esc((S.leads[s.lead_painel] || {}).nome || '—')}</b> é corretor ou imobiliária. A entrega diária registra o telefone no cadastro de corretores anunciantes do HUB.</p></div>`;
  } else if (tipo === 'captacao') {
    corpo = captSolCorpo(s, dc);
  } else if (tipo === 'fotos') {
    corpo = s.obs ? `<p class="peq">Obs.: ${esc(s.obs)}</p>` : '';
  } else {
    corpo = `<div class="painel peq">${Object.entries(s.alteracoes || {}).map(([k, x]) => `<p${VLR_ALT.has(k) ? ' data-sens' : ''}>${esc(k)}: ${esc(x.de ?? '—')} → <b>${esc(x.para ?? '—')}</b></p>`).join('') || '—'}${s.obs ? `<p class="mut">Obs.: ${esc(s.obs)}</p>` : ''}</div>`;
  }
  if ((s.fotos || []).length) corpo += `<div class="painel"><h2>Fotos (${s.fotos.length})</h2><div style="margin-top:10px">${htmlFotos(s.fotos, false)}</div></div>`;
  const falta = tipo === 'novo_imovel' ? faltantes(s) : [];
  const aprova = S.gestor && st === 'pendente' && tipo !== 'corretor_anunciante' ? decNoPainel(s) : S.ehDono && st === 'pendente' && tipo === 'corretor_anunciante' ? '<div class="painel peq faixa-dono">Registro automático: a entrega diária marca o telefone no cadastro de corretores anunciantes do HUB (Captação), onde a diretoria pode liberar.</div>' : S.ehDono && st === 'pendente' && tipo === 'captacao' ? decCapt(id, s) : S.ehDono && st === 'pendente' ? `<div class="painel"><h2>Decisão da diretoria</h2>
    <label class="c" style="margin-top:10px">Mensagem ao corretor (obrigatória para pedir complemento ou recusar)<textarea id="respDec" placeholder="Ex.: insira mais 10 fotos, com a fachada e a área de lazer"></textarea></label>
    ${falta.length ? `<button class="copiar" type="button" data-inserirfalta="${esc(id)}" style="justify-self:start">Inserir na mensagem o que falta (${falta.length})</button>` : ''}
    <div class="linha" style="margin-top:10px"><button class="b p" type="button" data-decidir="${esc(id)}|aprovada">Aprovar</button><button class="b" type="button" data-decidir="${esc(id)}|complemento">Pedir complemento</button><button class="b" type="button" data-decidir="${esc(id)}|recusada">Recusar</button><span class="erro" id="eDec"></span></div></div>` : '';
  const editavel = tipo !== 'alteracao' && (st === 'rascunho' || st === 'complemento');
  const editar = !S.ehDono && editavel ? `<button class="b p" type="button" data-continuar="${esc(id)}">${st === 'complemento' ? 'Complementar o pedido' : 'Continuar o cadastro'}</button>` : !S.ehDono && st === 'complemento' ? '<span class="peq mut">Envie uma nova alteração com o que a diretoria pediu.</span>' : '';
  const cancelar = !S.ehDono && st === 'pendente' ? `<button class="b" type="button" data-cancelar="${esc(id)}">Cancelar pedido</button>` : '';
  return `<div class="gaveta larga" role="dialog" aria-modal="true" aria-label="Solicitação">
    <div class="cab"><div><p class="mut peq" style="margin:0">${esc({ novo_imovel: 'Cadastro de imóvel', fotos: 'Fotos novas', alteracao: 'Alteração de imóvel', captacao: 'Pedido de captação', corretor_anunciante: 'Aviso de corretor anunciante' }[tipo] || tipo)} · enviada em ${dt(s.enviado_em || s.criado_em)}</p><h3>${esc(s.ref || 'Imóvel')}</h3><p style="margin:6px 0 0">${pillSit(st)}</p></div><button class="b" type="button" data-fechar>Fechar</button></div>
    ${dc.resposta ? `<div class="painel peq ${st === 'complemento' ? 'faixa-dono' : ''}"><b>${st === 'complemento' ? 'A diretoria pediu complemento:' : 'Resposta da diretoria:'}</b> ${esc(dc.resposta)}</div>` : ''}
    ${corpo}${aprova}<div class="linha">${editar}${cancelar}</div></div>`;
}
// decisão do pedido de captação pelo dono (05/11/2026): recusar vale na hora; aprovar fica marcado e a entrega das 7h43
// distribui o lead (o painel não cria proprietário). Imóvel com outro corretor ou fora da Captação: só recusar.
// Painel do gestor (05/11/2026): só leitura; a decisão se toma no painel do corretor, pelo botão abaixo (vale na hora)
function decNoPainel(s) {
  const p = (S.G.paineis || {})[s._dono] || {}, quem = s._dono ? gCurto(s._dono) : 'o corretor';
  const url = /^https:\/\/claude\.ai\//.test(String(p.url || '')) ? p.url : '';
  return `<div class="painel"><h2>Decisão da diretoria</h2>
    <p class="peq mut" style="margin:6px 0 0">O Painel do gestor é só leitura e mostra a foto do dia. Aprovar ou recusar se faz no painel de ${esc(quem)}, e vale na hora.</p>
    <div class="linha" style="margin-top:10px">${url ? `<a class="b p" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Decidir no painel de ${esc(quem)}</a>` : `<span class="falta">O endereço do painel de ${esc(quem)} não está na foto do dia: abra esse painel pela barra lateral.</span>`}</div></div>`;
}
function decCapt(id, s) {
  const c = (S.capt || {})[s.capt_id] || null;
  const bloq = !c || c.ativo === false || c.situacao === 'outro';
  return `<div class="painel"><h2>Decisão da diretoria</h2>
    <p class="peq mut" style="margin:6px 0 0">Recusar vale na hora. Aprovar reserva o imóvel para este corretor: a entrega das 7h43 distribui o lead e o proprietário chega em Meus leads, com telefone e roteiro.</p>
    ${bloq ? `<p class="falta" style="margin:8px 0 0">${!c || c.ativo === false ? 'O imóvel saiu da Captação' : 'Este imóvel já está com outro corretor'}: só dá para recusar.</p>` : ''}
    <label class="c" style="margin-top:10px">Mensagem ao corretor (obrigatória para recusar)<textarea id="respDec" placeholder="Ex.: este imóvel fica com o corretor da região"></textarea></label>
    <div class="linha" style="margin-top:10px">${bloq ? '' : `<button class="b p" type="button" data-decidir="${esc(id)}|aprovada">Aprovar</button>`}<button class="b" type="button" data-decidir="${esc(id)}|recusada">Recusar</button><span class="erro" id="eDec"></span></div></div>`;
}
async function decidir(id, status) {
  const resp = val('respDec'), e = document.getElementById('eDec');
  if (status !== 'aprovada' && !resp) { e.textContent = status === 'complemento' ? 'Escreva o que o corretor precisa completar.' : 'Escreva o motivo da recusa para o corretor.'; return; }
  const capt = (S.sol[id] || {}).tipo === 'captacao', doc = { status, resposta: resp, em: agora(), por: 'diretoria' };
  if (capt) {
    doc.origem = 'painel';
    if (status === 'aprovada') { doc.entrega = 'pendente'; doc.resposta = (resp ? resp + ' · ' : '') + 'Captação aprovada: o proprietário chega em Meus leads, com telefone e roteiro, na entrega das 7h43.'; }
  }
  const ok = await gravar(() => db.collection('decisoes').doc(id).set(doc), capt && status === 'aprovada' ? 'Aprovado. O lead chega ao corretor na entrega das 7h43.' : status === 'aprovada' ? 'Aprovado. A aplicação no site entra na próxima rotina.' : status === 'complemento' ? 'Pedido de complemento enviado ao corretor.' : 'Recusa registrada.');
  if (ok) fechar();
}

// ---------- Prazos da Vivere ----------
const PRAZOS_PADRAO = { primeiro_contato_h: 1, info_cliente_dias: 1, proposta_retorno_dias: 3, lead_parado_dias: 7, recontato_dias: 15, agenc_aviso_dias: 20, agenc_limite_dias: 30, agenc_inicio: '2026-10-25' };
const PRAZOS_ROT = [
  ['primeiro_contato_h', 'Primeiro contato com lead novo', 'horas'],
  ['info_cliente_dias', 'Enviar informações pedidas pelo cliente', 'dias'],
  ['proposta_retorno_dias', 'Retorno em proposta ou negociação', 'dias'],
  ['lead_parado_dias', 'Lead em aberto sem nenhum registro', 'dias'],
  ['recontato_dias', 'Recontato de todos os leads (inclusive fechados)', 'dias'],
  ['agenc_aviso_dias', 'Agenciamento sem atualização: aviso', 'dias'],
  ['agenc_limite_dias', 'Agenciamento sem atualização: prazo final (divisão 50/50 com a Vivere)', 'dias'],
];
const PZ = () => ({ ...PRAZOS_PADRAO, ...(S.prazos || {}) });
const somaDias = (iso, n) => { const d = new Date(iso.slice(0, 10) + 'T12:00'); d.setDate(d.getDate() + Number(n || 0)); return d.toISOString().slice(0, 10); };
function painelPrazos() {
  const p = PZ();
  return `<div class="painel"><h2>Prazos da Vivere</h2>
    <div class="fatos" style="margin-top:10px">${PRAZOS_ROT.map(([k, l, u]) => `<div><span>${esc(l)}</span>${S.ehDono ? `<input id="pz_${k}" type="number" min="0" inputmode="numeric" value="${esc(p[k])}" style="max-width:110px" aria-label="${esc(l)} (${u})"> <span class="mut peq">${u}</span>` : `<b>${esc(p[k])} ${u}</b>`}</div>`).join('')}</div>
    ${S.ehDono ? '<div class="linha" style="margin-top:10px"><button class="b p" type="button" id="salvarPrazos">Salvar prazos</button><span class="mut peq">Valem para os avisos de todos os corretores deste painel.</span></div>' : '<p class="status" style="margin:8px 0 0">Os avisos do painel seguem estes prazos. A contagem dos agenciamentos começa em ' + dt(p.agenc_inicio) + '.</p>'}</div>`;
}
async function salvarPrazos() {
  const novo = { ...PZ() };
  for (const [k] of PRAZOS_ROT) { const v = val('pz_' + k); if (v !== '') novo[k] = Number(v); }
  novo.atualizado_em = agora();
  await gravar(() => db.doc('controle/prazos').set(novo), 'Prazos salvos.');
}

// ---------- Agenciamento: últimas atualizações e prazo de 30 dias ----------
const TIPOS_AGENC = ['Conversa com o proprietário', 'Visita ao imóvel', 'Fotos novas', 'Ajuste de valor', 'Proposta recebida', 'Atualização do anúncio', 'Outro'];
function eventosDe(imovelId) { return Object.values(S.eventos).filter((e) => e.imovel_id === imovelId).sort((a, b) => String(b.em).localeCompare(String(a.em))); }
function ultimoAgenc(imovelId) {
  const p = PZ(), datas = [p.agenc_inicio];
  eventosDe(imovelId).forEach((e) => datas.push(e.em));
  Object.entries(S.sol).forEach(([sid, s]) => { if (s.imovel_id === imovelId && ['pendente', 'aprovada', 'aplicada', 'complemento'].includes(statusDe(sid, s))) datas.push(s.enviado_em || s.criado_em); });
  const ult = datas.filter(Boolean).sort().pop();
  return { em: ult, dias: dias(ult, hojeISO()) };
}
function seloAgenc(imovelId) {
  const p = PZ(), u = ultimoAgenc(imovelId);
  const cls = u.dias >= p.agenc_limite_dias ? 'alta' : u.dias >= p.agenc_aviso_dias ? 'media' : 'ok';
  if (u.dias >= p.agenc_limite_dias) return `<span class="pill alta" title="Último registro em ${dt(u.em)}">Agenciamento dividido 50/50 com a Vivere (${u.dias} dias sem atualização)</span>`;
  return `<span class="pill ${cls}" title="Último registro em ${dt(u.em)}">Agenciamento: ${u.dias} dia${u.dias === 1 ? '' : 's'} sem atualização</span>`;
}
function avisosAgenc() {
  const p = PZ(), out = [];
  for (const [id, m] of Object.entries(S.meus)) {
    if (!m.ativo) continue;
    const u = ultimoAgenc(id);
    if (u.dias >= p.agenc_limite_dias) out.push({ p: 'alta', t: 'Agenciamento dividido 50/50 com a Vivere', o: `${m.ref}: ${u.dias} dias sem atualização (prazo de ${p.agenc_limite_dias})`, imv: id, nome: m.ref });
    else if (u.dias >= p.agenc_aviso_dias) out.push({ p: 'media', t: 'Atualizar agenciamento', o: `${m.ref}: faltam ${p.agenc_limite_dias - u.dias} dias; no ${p.agenc_limite_dias}º dia sem atualização o agenciamento passa a ser dividido 50/50 com a Vivere`, imv: id, nome: m.ref });
  }
  return out;
}
function gavetaAgenc(id) {
  const m = S.meus[id]; if (!m) return '';
  const ev = eventosDe(id);
  return `<div class="gaveta" role="dialog" aria-modal="true" aria-label="Atualizar agenciamento">
    <div class="cab"><div><p class="mut peq" style="margin:0">Registro do agenciamento · conta para o prazo de ${PZ().agenc_limite_dias} dias</p><h3>${esc(m.ref)} · ${esc(m.bairro || '')}</h3><p style="margin:6px 0 0">${seloAgenc(id)}</p></div><button class="b" type="button" data-fechar>Fechar</button></div>
    <form id="fAgenc" class="form" data-id="${esc(id)}">
      <label class="c">O que foi feito<select id="agTipo">${TIPOS_AGENC.map((t) => `<option>${t}</option>`).join('')}</select></label>
      <label class="c inteiro">Resumo<textarea id="agTexto" required placeholder="Digite ou toque no microfone do teclado para ditar. Ex.: falei com o proprietário, mantém o valor e libera visitas aos sábados"></textarea></label>
      <div class="inteiro linha"><button class="b p" type="submit">Registrar</button><button class="b" type="button" data-conversa="imv:${esc(id)}">✦ Registrar por conversa</button></div>
    </form>
    <div class="painel"><h2>Histórico do agenciamento</h2><div class="hist" style="margin-top:10px">${ev.length ? ev.map((e) => `<div class="i"><div class="q">${dt(e.em)} · ${esc(e.tipo)}${e.origem === 'ia' ? ' · organizado com IA' : ''}</div>${esc(e.texto)}</div>`).join('') : '<p class="mut">Nenhum registro ainda.</p>'}</div></div></div>`;
}
async function registrarAgenc(form) {
  const id = form.dataset.id, texto = val('agTexto'); if (!texto) return;
  const ok = await gravar(() => db.collection('eventos_agenciamento').doc('e-' + Date.now().toString(36)).set({ imovel_id: id, ref: (S.meus[id] || {}).ref || '', tipo: val('agTipo'), texto, em: agora().slice(0, 16), corretor: S.info.slug || '', origem: 'painel' }), 'Atualização registrada.');
  if (ok) fechar();
}

// ---------- Registrar conversa (resumo ou conversa colada → IA organiza → corretor confirma) ----------
function gavetaConversa(alvo) {
  const [tp, id] = (alvo || '').split(/:(.*)/s);
  const nomeAlvo = tp === 'lead' ? (S.leads[id] || {}).nome : tp === 'imv' ? (S.meus[id] || {}).ref : '';
  return `<div class="gaveta" role="dialog" aria-modal="true" aria-label="Registrar conversa">
    <div class="cab"><div><p class="mut peq" style="margin:0">Registrar conversa${nomeAlvo ? ' · ' + esc(nomeAlvo) : ''}</p><h3>Conte o que aconteceu</h3></div><button class="b" type="button" data-fechar>Fechar</button></div>
    <p class="peq mut" style="margin:0">🎤 Escreva um resumo, dite pelo microfone do teclado do celular ou cole a conversa do WhatsApp. ${S.ia ? 'A IA organiza etapa, próxima ação, data e perfil do cliente; você confere antes de salvar.' : 'Sem IA neste acesso: o texto vai para o histórico e você ajusta os campos à mão.'}</p>
    <div class="form" id="fConversa" data-alvo="${esc(alvo || '')}">
      <label class="c inteiro">Resumo ou conversa<textarea id="cvTexto" rows="8" placeholder="Toque no microfone do teclado e fale. Ex.: Liguei para a Esmeralda. Procura apto de 3 quartos no Itacorubi até R$ 1,3 mi, quer visitar sábado de manhã."></textarea></label>
      ${S.iaImagens ? `<label class="c inteiro">Prints da conversa (opcional, até ${S.iaImagens.maxCount})<input id="cvPrints" type="file" accept="${esc((S.iaImagens.mediaTypes || ['image/png', 'image/jpeg']).join(','))}" multiple></label>` : ''}
      <div class="inteiro linha"><button class="b p" type="button" id="cvAnalisar">${S.ia ? '✦ Organizar com IA' : 'Salvar no histórico'}</button><span class="mut peq" id="cvStatus"></span></div>
    </div>
    <div id="cvProposta"></div></div>`;
}
function promptConversa(texto, alvo) {
  const p = PZ(), hoje = hojeISO();
  const leads = Object.entries(S.leads).map(([id, l]) => ({ id, nome: l.nome, fone_final: digitos(l.telefone).slice(-4), etapa: l.etapa || 'Novo', entrada: l.entrada }));
  const imoveis = Object.entries(S.meus).map(([id, m]) => ({ id, ref: m.ref, endereco: [m.logradouro || m.end, m.numero, m.complemento].filter(Boolean).join(', '), bairro: m.bairro, proprietario: (m.proprietario || {}).nome, valor: m.valor ?? null, cond: m.cond ?? null, iptu: m.iptu ?? null, situacao: m.ativo ? 'Ativo' : 'Inativo' }));
  return `Você organiza registros do CRM de uma corretora de imóveis da Vivere (Florianópolis). Hoje é ${hoje}.
A corretora contou, ditou ou colou uma conversa (pode haver prints anexos). Descubra a quem se refere e o que mudou.
- Se for sobre um cliente (lead), use um id da lista de leads; se for sobre um imóvel que ela agenciou (conversa com proprietário, visita, fotos, valor), use um id da lista de imóveis; se for um cliente que não está na lista, use alvo "novo_lead".
${alvo ? `- A corretora já indicou o alvo: ${alvo}.` : ''}
- Etapas possíveis do lead: ${ETAPAS.join(', ')}. Motivos de perda: ${MOTIVOS.join(', ')}.
- Tipos de registro do lead: ${TIPOS_HIST.join(', ')}. Tipos de registro do imóvel: ${TIPOS_AGENC.join(', ')}.
- Defina sempre a próxima ação e a data (AAAA-MM-DD). Se a conversa já marcou data, use-a. Se o cliente pediu informações, a data é hoje + ${p.info_cliente_dias} dias. Em proposta ou negociação, no máximo hoje + ${p.proposta_retorno_dias} dias. Sem nada combinado, hoje + 7 dias.
- "interesse" do lead, só se a conversa deixar claro: ${INTERESSES.filter(([k]) => k !== 'a_definir').map(([k, rot]) => k + ' (' + rot + ')').join(', ')}. No aluguel, diga se é anual ou temporada; na dúvida, null.
- Preencha o perfil só com o que a conversa disser (finalidade: Venda, Locação ou Temporada; tipo; bairros separados por vírgula; valores em reais como números).
- O resumo tem até 3 frases, objetivas, em português, sem telefone, CPF ou e-mail.
- Se for sobre um imóvel e a corretora pedir para MUDAR um dado do anúncio (valor, condomínio, IPTU, área privativa, área total, dormitórios, suítes, banheiros, vagas ou situação Ativo/Inativo), ponha em "alteracoes" só o NOVO valor desses campos (números sem pontos, em reais ou m²; situação "Ativo" ou "Inativo"). Conversa sem mudança de dado: "alteracoes" null.
- Não invente nada. Use null no que não souber.
Responda só com JSON neste formato:
{"alvo":"lead|imovel|novo_lead","lead_id":null,"imovel_id":null,"novo_lead":{"nome":null,"telefone":null},"tipo":"WhatsApp","resumo":"...","etapa":null,"motivo":null,"proxima_acao":null,"data_proxima_acao":null,"imovel_interesse":null,"interesse":null,"perfil":{"finalidade":null,"tipo":null,"bairros":null,"vmin":null,"vmax":null,"obs":null},"alteracoes":{"valor":null,"cond":null,"iptu":null,"area":null,"area_total":null,"dorm":null,"suites":null,"banh":null,"vagas":null,"situacao":null},"confianca":"alta|media|baixa","duvida":null}

Leads da corretora: ${JSON.stringify(leads)}
Imóveis agenciados por ela: ${JSON.stringify(imoveis)}

Texto da corretora:
"""
${texto}
"""`;
}
let ctrlIA = null;
async function analisarConversa() {
  const box = document.getElementById('fConversa'), alvo = box.dataset.alvo || '', texto = val('cvTexto'), st = document.getElementById('cvStatus');
  const prints = document.getElementById('cvPrints'); const imgs = prints && prints.files.length ? [...prints.files].slice(0, S.iaImagens.maxCount) : [];
  if (!texto && !imgs.length) { st.textContent = 'Escreva o resumo ou anexe os prints.'; return; }
  if (!S.ia) { // sem IA: vai direto para o histórico do alvo indicado
    const [tp, id] = alvo.split(/:(.*)/s);
    if (tp === 'lead') { const l = S.leads[id]; await gravar(() => db.collection('leads').doc(id).update({ historico: [...histDe(l), { em: agora().slice(0, 16), tipo: 'Observação', texto }], atualizado_em: agora(), origem: 'painel' }), 'Registrado no histórico.'); return fechar(); }
    if (tp === 'imv') { await gravar(() => db.collection('eventos_agenciamento').doc('e-' + Date.now().toString(36)).set({ imovel_id: id, ref: (S.meus[id] || {}).ref || '', tipo: 'Outro', texto, em: agora().slice(0, 16), corretor: S.info.slug || '', origem: 'painel' }), 'Registrado.'); return fechar(); }
    st.textContent = 'Abra o lead ou o imóvel e registre por lá.'; return;
  }
  st.textContent = 'Organizando…'; document.getElementById('cvAnalisar').disabled = true;
  if (ctrlIA) ctrlIA.abort(); ctrlIA = new AbortController();
  try {
    const r = await S.ia.json(promptConversa(texto, alvo), { modelTier: 'default', signal: ctrlIA.signal, ...(imgs.length ? { images: imgs } : {}) });
    if (alvo) { const [tp, id] = alvo.split(/:(.*)/s); if (tp === 'lead') { r.alvo = 'lead'; r.lead_id = id; } if (tp === 'imv') { r.alvo = 'imovel'; r.imovel_id = id; } }
    S.proposta = { ...r, texto_original: texto };
    st.textContent = r.confianca === 'baixa' ? 'Confiança baixa: confira com atenção.' : '';
    document.getElementById('cvProposta').innerHTML = htmlProposta(S.proposta); ajustarProposta();
  } catch (e) {
    if (e && e.code === 'cancelled') return;
    st.textContent = e && e.code === 'rate_limited' ? 'Limite de uso da IA atingido agora. Tente mais tarde.' : e && e.code === 'not_granted' ? 'A IA não foi liberada neste acesso.' : 'Não consegui organizar. Tente de novo ou escreva mais detalhes.';
  } finally { const b = document.getElementById('cvAnalisar'); if (b) b.disabled = false; }
}
function htmlProposta(r) {
  const leadsOpt = Object.entries(S.leads).map(([id, l]) => `<option value="lead:${esc(id)}" ${r.alvo === 'lead' && r.lead_id === id ? 'selected' : ''}>${esc(l.nome)} · ${esc(l.etapa || 'Novo')}</option>`).join('');
  const imvOpt = Object.entries(S.meus).map(([id, m]) => `<option value="imv:${esc(id)}" ${r.alvo === 'imovel' && r.imovel_id === id ? 'selected' : ''}>${esc(m.ref)} · ${esc(m.bairro || '')}</option>`).join('');
  const pf = r.perfil || {};
  return `<div class="painel sec" style="gap:12px"><h2>Confira e salve</h2>${r.duvida ? `<p class="falta" style="margin:0">${esc(r.duvida)}</p>` : ''}
    <div class="form">
      <label class="c inteiro">Registrar em<select id="ppAlvo"><option value="novo" ${r.alvo === 'novo_lead' ? 'selected' : ''}>Novo lead</option><optgroup label="Meus leads">${leadsOpt}</optgroup><optgroup label="Meus imóveis (agenciamento)">${imvOpt}</optgroup></select></label>
      <label class="c" data-pp="novo">Nome do novo lead<input id="ppNome" value="${esc((r.novo_lead || {}).nome || '')}"></label>
      <label class="c" data-pp="novo">Telefone<input id="ppTel" inputmode="tel" value="${esc((r.novo_lead || {}).telefone || '')}"></label>
      <label class="c">Tipo<select id="ppTipo">${[...new Set([...TIPOS_HIST, ...TIPOS_AGENC])].map((t) => `<option ${t === r.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="c inteiro">Resumo para o histórico<textarea id="ppResumo" rows="3">${esc(r.resumo || '')}</textarea></label>
      <label class="c" data-pp="lead">Etapa<select id="ppEtapa"><option value="">Manter</option>${ETAPAS.map((e) => `<option ${e === r.etapa ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
      <label class="c" data-pp="lead">Motivo da perda<select id="ppMotivo"><option value="">—</option>${MOTIVOS.map((m) => `<option ${m === r.motivo ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <label class="c" data-pp="lead">Próxima ação<input id="ppProx" value="${esc(r.proxima_acao || '')}"></label>
      <label class="c" data-pp="lead">Data da próxima ação<input id="ppData" type="date" value="${esc(r.data_proxima_acao || '')}"></label>
      <label class="c" data-pp="lead">Imóvel de interesse (ref.)<input id="ppImovel" value="${esc(r.imovel_interesse || '')}"></label>
      <label class="c" data-pp="lead">Interesse<select id="ppInt"><option value="">${r.interesse && INT_POR[r.interesse] ? 'Manter' : 'Manter (sem mudança)'}</option>${optInt(INT_POR[r.interesse] ? r.interesse : '')}</select></label>
      <label class="c" data-pp="lead">Perfil: finalidade<input id="ppFin" value="${esc(pf.finalidade || '')}"></label>
      <label class="c" data-pp="lead">Perfil: tipo<input id="ppPTipo" value="${esc(pf.tipo || '')}"></label>
      <label class="c" data-pp="lead">Perfil: bairros<input id="ppBairros" value="${esc(pf.bairros || '')}"></label>
      <label class="c" data-pp="lead">Valor mínimo (R$)<input id="ppMin" ${VLR} value="${esc(fmtVlr(pf.vmin))}"></label>
      <label class="c" data-pp="lead">Valor máximo (R$)<input id="ppMax" ${VLR} value="${esc(fmtVlr(pf.vmax))}"></label>
      <label class="c inteiro" data-pp="lead">Perfil: observações<input id="ppObs" value="${esc(pf.obs || '')}"></label>
      <div class="inteiro" data-pp="imv" id="ppAlt" data-imv="${r.alvo === 'imovel' ? esc(r.imovel_id || '') : ''}">${htmlPedidoAlt(r)}</div>
    </div>
    <div class="linha"><button class="b p" type="button" id="ppSalvar">Salvar</button><span class="mut peq">Campos vazios não apagam o que já está no lead.</span></div></div>`;
}
// VOZ-SOLICITACAO (05/11/2026): mudança de dado dita na conversa vira pedido à diretoria (solicitacoes), além do histórico
const CAMPOS_VOZ = CAMPOS_ALT.filter(([k, , t]) => t !== 'texto');
function htmlPedidoAlt(r) {
  const a = { ...(r.alteracoes || {}) }; if (typeof a.situacao === 'string') a.situacao = /^inativ/i.test(a.situacao) ? 'Inativo' : /^ativ/i.test(a.situacao) ? 'Ativo' : null;
  const ks = CAMPOS_VOZ.filter(([k]) => a[k] != null && a[k] !== '').map(([k]) => k);
  const imv = r.alvo === 'imovel' ? S.meus[r.imovel_id] || {} : {};
  const atual = (k) => k === 'situacao' ? (imv.ativo ? 'Ativo' : 'Inativo') : imv[k];
  const campo = ([k, l, t]) => `<label class="c">${esc(l)}${atual(k) != null && atual(k) !== '' ? ` <span class="mut peq">(hoje ${esc(fmtAlt(k, atual(k)))})</span>` : ''}${t === 'sel' ? `<select id="pa_${k}"><option value="">Não mudar</option>${['Ativo', 'Inativo'].map((o) => `<option ${o === a[k] ? 'selected' : ''}>${o}</option>`).join('')}</select>` : `<input id="pa_${k}" ${VLR_ALT.has(k) ? `${VLR} value="${esc(a[k] != null ? fmtVlr(a[k]) : '')}"` : `type="number" step="any" inputmode="decimal" value="${esc(a[k] ?? '')}"`} placeholder="não mudar">`}</label>`;
  return `<fieldset class="prop-alt"><legend>Pedir alteração à diretoria${ks.length ? ` · a IA achou ${ks.length} mudança${ks.length > 1 ? 's' : ''}` : ''}</legend>
    <p class="peq mut" style="margin:0 0 6px">Preencha só o que muda; vazio não pede nada. Vai para aprovação e nada muda no site antes disso.</p>
    <div class="form">${CAMPOS_VOZ.filter(([k]) => ks.includes(k)).map(campo).join('')}</div>
    ${ks.length < CAMPOS_VOZ.length ? `<details><summary class="peq">Outros dados</summary><div class="form" style="margin-top:8px">${CAMPOS_VOZ.filter(([k]) => !ks.includes(k)).map(campo).join('')}</div></details>` : ''}</fieldset>`;
}
function lerPedidoAlt(m) {
  const alt = {};
  for (const [k, , t] of CAMPOS_VOZ) {
    const d0 = val('pa_' + k); if (d0 === '') continue;
    if (t === 'sel') { const a = m.ativo ? 'Ativo' : 'Inativo'; if (d0 !== a) alt[k] = { de: a, para: d0 }; continue; }
    const a = m[k] == null || m[k] === '' ? null : Number(m[k]), d = VLR_ALT.has(k) ? numVlr(d0) : Number(d0.replace(',', '.'));
    if (d != null && !Number.isNaN(d) && a !== d) alt[k] = { de: a, para: d };
  }
  return alt;
}
function ajustarProposta() {
  const v = val('ppAlvo'), tp = v === 'novo' ? 'novo' : v.split(':')[0];
  document.querySelectorAll('[data-pp]').forEach((el) => { el.hidden = !(el.dataset.pp === tp || (el.dataset.pp === 'lead' && tp === 'novo')); });
  const pa = document.getElementById('ppAlt'); if (pa && tp === 'imv' && S.proposta) { const id = v.split(/:(.*)/s)[1]; if (pa.dataset.imv !== id) { pa.dataset.imv = id; pa.innerHTML = htmlPedidoAlt({ ...S.proposta, alvo: 'imovel', imovel_id: id }); } }
}
async function salvarProposta() {
  const v = val('ppAlvo'), [tp, id] = v === 'novo' ? ['novo', ''] : v.split(/:(.*)/s);
  const resumo = val('ppResumo') || (S.proposta || {}).texto_original || '', tipo = val('ppTipo');
  const reg = { em: agora().slice(0, 16), tipo, texto: resumo, origem: 'ia' };
  if (tp === 'imv') {
    const m = S.meus[id] || {}, alt = lerPedidoAlt(m), nAlt = Object.keys(alt).length;
    const resumoAlt = Object.entries(alt).map(([k, x]) => `${ROT_ALT[k] || k}: ${fmtAlt(k, x.de)} → ${fmtAlt(k, x.para)}`).join('; ');
    if (nAlt) {
      const ok0 = await gravar(() => db.collection('solicitacoes').doc('s-' + Date.now().toString(36)).set({ imovel_id: id, ref: m.ref || '', alteracoes: alt, obs: resumo, status: 'pendente', criado_em: agora(), corretor: S.info.slug || '', origem: 'ia' }), 'Pedido de alteração enviado para aprovação.');
      if (!ok0) return;
    }
    const texto = [resumo, nAlt ? 'Pedido de alteração enviado à diretoria (' + resumoAlt + ').' : ''].filter(Boolean).join(' ');
    const ok = await gravar(() => db.collection('eventos_agenciamento').doc('e-' + Date.now().toString(36)).set({ imovel_id: id, ref: m.ref || '', tipo: TIPOS_AGENC.includes(tipo) ? tipo : 'Conversa com o proprietário', texto, em: reg.em, corretor: S.info.slug || '', origem: 'ia' }), nAlt ? 'Registrado no histórico e alteração enviada para aprovação (veja em Solicitações).' : 'Atualização do agenciamento registrada.');
    if (nAlt && !ok) toast('Pedido enviado à diretoria, mas o histórico não foi gravado: registre a atualização de novo.');
    if (ok || nAlt) fechar(); return;
  }
  const base = tp === 'lead' ? (S.leads[id] || {}) : {};
  const perfil = { ...(base.perfil || {}) };
  const setP = (k, x, n) => { if (x !== '') perfil[k] = n ? Number(x) : x; };
  perfil.em = agora().slice(0, 16); perfil.por = 'corretor'; setP('finalidade', val('ppFin')); setP('tipo', val('ppPTipo')); setP('bairros', val('ppBairros')); setP('vmin', numVlr(val('ppMin')) ?? '', 1); setP('vmax', numVlr(val('ppMax')) ?? '', 1); setP('obs', val('ppObs'));
  const dados = { perfil, atualizado_em: agora(), origem: 'painel', historico: [...histDe(base), reg] };
  const etapa = val('ppEtapa'); if (etapa) { dados.etapa = etapa; if (etapa === 'Perdido') dados.motivo = val('ppMotivo'); }
  if (val('ppProx')) dados.prox_acao = val('ppProx');
  if (val('ppData')) dados.data_prox = val('ppData');
  if (val('ppImovel')) dados.imovel_interesse = val('ppImovel').toUpperCase();
  if (INT_POR[val('ppInt')]) dados.interesse = val('ppInt');
  if (tp === 'lead') { const ok = await gravar(() => db.collection('leads').doc(id).update(dados), 'Lead atualizado.'); if (ok) fechar(); return; }
  if (!val('ppNome') || digitos(val('ppTel')).length < 10) { toast('Para lead novo, informe nome e telefone com DDD.'); return; }
  const novoId = 'n-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const ok = await gravar(() => db.collection('leads').doc(novoId).set({ etapa: 'Contato feito', motivo: '', prox_acao: '', data_prox: '', imovel_interesse: '', data_fechamento: '', ...dados, nome: val('ppNome'), telefone: digitos(val('ppTel')), campanha: 'Cadastrado pelo corretor', entrada: hojeISO(), criado_no_painel: true }), 'Lead cadastrado.');
  if (ok) { fechar(); S.aba = 'leads'; render(); }
}


// ---------- Voz: o que já dá para fazer e o que vem com o agente do WhatsApp ----------
function gavetaVoz() {
  return `<div class="gaveta" role="dialog" aria-modal="true" aria-label="Registrar por voz">
    <div class="cab"><div><p class="mut peq" style="margin:0">Registrar por voz</p><h3>🎤 Fale em vez de digitar</h3></div><button class="b" type="button" data-fechar>Fechar</button></div>
    <div class="painel sec" style="gap:10px"><h2>Já funciona hoje</h2>
      <p style="margin:0">Em qualquer campo de texto do painel, toque no <b>🎤 do teclado do celular</b> (iPhone ou Gboard no Android) e fale. O texto aparece no campo.</p>
      <ul class="peq" style="margin:0;padding-left:18px;display:grid;gap:4px">
        <li><b>Registrar conversa:</b> fale o resumo do contato com o cliente; a IA organiza etapa, próxima ação, data e perfil, e você confere antes de salvar.</li>
        <li><b>Atualizar agenciamento:</b> fale o que combinou com o proprietário; conta para o prazo de 30 dias.</li>
        <li><b>Cadastrar imóvel:</b> dite os campos e a descrição; fotos e documentos você anexa no próprio formulário.</li>
      </ul>
      <div class="linha"><button class="b p" type="button" data-conversa="">✦ Registrar conversa agora</button></div>
    </div>
    <div class="painel sec" style="gap:10px"><h2>Em breve · agente da Vivere no WhatsApp <span class="pill media">previsão</span></h2>
      <p style="margin:0">Quando o agente estiver no ar, a ideia é você mandar pelo WhatsApp:</p>
      <ul class="peq" style="margin:0;padding-left:18px;display:grid;gap:4px">
        <li><b>Áudio</b> contando a conversa com o cliente ou com o proprietário, para virar registro no seu CRM;</li>
        <li><b>Áudio + fotos + documentos</b> de um imóvel novo, para montar o cadastro o mais completo possível;</li>
        <li>e receber de volta o que ficou faltando para completar.</li>
      </ul>
      <p class="peq mut" style="margin:0">Tudo continua passando pela aprovação da diretoria antes de ir ao site. Ainda não há data: depende da construção do agente.</p>
    </div></div>`;
}

// ---------- Mapa (mesmo desenho do HUB: Ilha, bairros, vias e ruas; pontos já calculados pela rotina) ----------
// Só aparecem os anúncios ativos da vitrine (sem proprietário) e os imóveis do próprio corretor (com destaque).
const MAPA_CDN = ['vendor/leaflet-1.9.4.js', 'vendor/leaflet.markercluster-1.5.3.js'];
const gmapsDe = (x) => x && (x.gmaps || (x.consulta ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(x.consulta) : ''));
const btnsMapa = (id, x) => `<button class="b" type="button" data-vermapa="${esc(id)}" ${x && x.lat != null ? '' : 'disabled title="Sem ponto no mapa ainda"'}>🗺 Mapa</button>${gmapsDe(x) ? `<a class="b" href="${esc(gmapsDe(x))}" target="_blank" rel="noopener">📍 Google Maps</a>` : ''}`;
const PREC = { numero: 'no número', metrica: 'no número', link: 'marcado no Google Maps', empreendimento: 'no empreendimento', rua: 'na rua (sem número)', bairro: 'aproximado, no bairro', cidade: 'aproximado, na cidade' };
let MP = null, MPC = null, MPK = {}, MP_ESTADO = 'novo', MP_SIG = '';
const MP_ROOT = document.createElement('div'); MP_ROOT.id = 'mp-raiz';
MP_ROOT.innerHTML = `<div class="linha" style="justify-content:space-between;margin-bottom:8px"><span class="mut peq" id="pmResumo"></span>
  <div class="chips" role="group" aria-label="O que mostrar"><button type="button" data-pmcam="todos">Todos os anúncios</button><button type="button" data-pmcam="meus">Só os meus</button><button type="button" data-pmemp="1">◆ Empreendimentos</button></div></div>
  <div class="linha pm-filtros" id="pmChips" role="group" aria-label="Filtrar o mapa" style="margin-bottom:8px"></div>
  <div id="pm-mapa" role="region" aria-label="Mapa dos imóveis"></div>
  <div class="mp-legenda"><span><span class="mp-ponto" style="--c:var(--mp-c1)"></span> Venda</span><span><span class="mp-ponto" style="--c:var(--mp-c2)"></span> Locação</span><span><span class="mp-ponto" style="--c:var(--mp-c4)"></span> Temporada</span><span><span class="mp-ponto pm-meu" style="--c:var(--brass)"></span> Agenciado por você</span><span><span class="mp-ponto mp-emp" style="--c:var(--emp-l)"></span> Lançamento</span><span><span class="mp-ponto mp-emp" style="--c:var(--warn)"></span> Em construção</span><span><span class="mp-ponto mp-emp" style="--c:var(--ok)"></span> Entregue</span><span>Ponto vazado = localização aproximada</span></div>`;
function scriptMapa(src) { return new Promise((ok, er) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => er(new Error(src)); document.head.appendChild(s); }); }
async function carregaMapa() {
  if (MP_ESTADO !== 'novo') return; MP_ESTADO = 'carregando';
  try {
    if (!window.L) await scriptMapa(MAPA_CDN[0]);
    if (!window.L.markerClusterGroup) await scriptMapa(MAPA_CDN[1]);
    if (!window.HUB_MAPA_BASE) await scriptMapa('modulos/mapa-base.js').catch(() => {});
    if (!window.HUB_MAPA_EXTRA) await scriptMapa('modulos/mapa-extra.js').catch(() => {});
    MP_ESTADO = 'pronto';
  } catch (e) { MP_ESTADO = 'erro'; }
  if (S.aba === 'mapa') render();
}
const decMp = (a) => { const o = []; let la = 0, ln = 0; for (let i = 0; i < a.length; i += 2) { la += a[i]; ln += a[i + 1]; o.push([la / 1e5, ln / 1e5]); } return o; };
const RUAS_PED = {};
function iniciaMapa() {
  const L = window.L, el = MP_ROOT.querySelector('#pm-mapa'); if (MP || !L || !el.isConnected) return;
  MP = L.map(el, { zoomControl: true, minZoom: 10, maxZoom: 18, attributionControl: true });
  MP.attributionControl.setPrefix(false); MP.attributionControl.addAttribution('Desenho: © colaboradores do OpenStreetMap');
  MP.fitBounds([[-27.84, -48.58], [-27.38, -48.36]]); MP.setMaxBounds([[-28.3, -49.7], [-26.9, -48.1]]);
  const B = window.HUB_MAPA_BASE;
  if (B) {
    const g = L.layerGroup().addTo(MP);
    (B.terra || []).forEach((p) => L.polygon(p.map((r) => decMp(r)), { className: 'mp-terra', interactive: false }).addTo(g));
    (B.agua || []).forEach((p) => L.polygon(p.map((r) => decMp(r)), { className: 'mp-lago', interactive: false }).addTo(g));
    (B.vias || []).slice().sort((a, b) => b.t - a.t).forEach((v) => L.polyline(v.g.map((r) => decMp(r)), { className: 'mp-via mp-via-' + v.t, interactive: false, smoothFactor: 1.5 }).addTo(g));
    (B.bai || []).forEach((b) => { b.g.forEach((r) => L.polygon(decMp(r), { className: 'mp-bairro', interactive: false }).addTo(g)); if (b.c) L.tooltip({ permanent: true, direction: 'center', className: 'mp-rot-bairro', interactive: false }).setLatLng([b.c[0] / 1e5, b.c[1] / 1e5]).setContent(esc(b.n)).addTo(g); });
  }
  const EX = window.HUB_MAPA_EXTRA, ruas = L.layerGroup();
  if (EX) {
    const g = L.layerGroup().addTo(MP);
    (EX.ilhas || []).forEach((il) => { (il.g || []).forEach((r) => L.polygon(decMp(r), { className: 'mp-terra mp-ilha', interactive: false }).addTo(g)); if (il.n && il.c) L.tooltip({ permanent: true, direction: 'center', className: 'mp-rot-ilha', interactive: false }).setLatLng([il.c[0] / 1e5, il.c[1] / 1e5]).setContent(esc(il.n)).addTo(g); });
    const naTela = () => {
      const z = MP.getZoom(); if (z < 14) { if (MP.hasLayer(ruas)) MP.removeLayer(ruas); return; } if (!MP.hasLayer(ruas)) ruas.addTo(MP);
      const b = MP.getBounds().pad(0.2), P = EX.passo, O = EX.origem;
      (EX.blocos || []).forEach((k) => { if (RUAS_PED[k]) return; const [li, co] = k.split('-').map(Number), s = O[0] + li * P, w = O[1] + co * P; if (!b.intersects([[s, w], [s + P, w + P]])) return; RUAS_PED[k] = true;
        scriptMapa('modulos/mapa-ruas-' + k + '.js').then(() => { const R = (window.HUB_MAPA_RUAS || {})[k]; (R && R.v || []).slice().sort((a, c) => c.t - a.t).forEach((v) => L.polyline(v.g.map((r) => decMp(r)), { className: 'mp-rua mp-rua-' + v.t, interactive: false }).addTo(ruas)); }).catch(() => { delete RUAS_PED[k]; }); });
    };
    MP.on('moveend', naTela);
  }
  const zm = () => { const z = MP.getZoom(); el.classList.toggle('mp-perto', z >= 13); el.classList.toggle('mp-z12', z >= 12); el.classList.toggle('mp-z15', z >= 15); }; MP.on('zoomend', zm); zm();
  MPC = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: (z) => (z >= 17 ? 6 : 38), spiderfyOnMaxZoom: true, iconCreateFunction: (c) => L.divIcon({ html: '<span>' + c.getChildCount() + '</span>', className: 'mp-grupo', iconSize: [34, 34] }) });
  MP.addLayer(MPC);
}
function itensMapa() {
  const meus = Object.entries(S.meus).map(([id, m]) => ({ ...m, id, _meu: true }));
  const idsMeus = new Set(meus.map((m) => m.id));
  const base = S.pmCam === 'meus' ? [] : filtrarVitrine().filter((v) => !idsMeus.has(v.id));
  const its0 = base.concat(meus.filter((m) => S.pmCam === 'meus' || m.ativo)).filter((x) => x.lat != null);
  MP_CONT = { Venda: 0, 'Locação': 0, Temporada: 0 }; its0.forEach((x) => { MP_CONT[finMapa(x.fin)]++; });
  const its = its0.filter((x) => !(S.pmFinOff || {})[finMapa(x.fin)]);
  const fP = BA.filtra(its, qDe('mapa'), baImv); if (S.aba === 'mapa') qInfo(fP, 'pontos'); return fP.lista;
}
function popupMapa(x) {
  const fatos = [x.dorm ? `${x.dorm} dorm.` : '', x.suites ? `${x.suites} suíte${x.suites > 1 ? 's' : ''}` : '', x.vagas ? `${x.vagas} vaga${x.vagas > 1 ? 's' : ''}` : '', x.area ? num(x.area, 1) + ' m²' : ''].filter(Boolean).join(' · ');
  // endereço e empreendimento no card (31/10/2026, pedido do Cleiton): só o que a vitrine ou o próprio imóvel do corretor já trazem
  const end = x._meu ? (x.end || [x.logradouro, x.numero, x.complemento].filter(Boolean).join(', ')) : (x.end || '');
  let emp = ''; try { const C = S.prontos.has('empDocs') ? empCtx() : null; const e = C ? (C.empDoAnuncio.get(x.id) || (x.emp ? C.porId.get(x.emp) : null)) : null; emp = (e && e.nome) || (x._meu && x.condominio_nome) || ''; } catch (e) { emp = ''; }
  return `<div class="pm-pop">${capaHtml(x.id, x, 'pop')}<b class="ref">${esc(x.ref)}</b> · ${esc(x.tipo || '')} · ${esc(x.fin || '')}<br><b>${brl(x.valor)}</b>${m2De(x) != null ? ' · ' + esc(m2Rot(x)) : ''}${fatos ? '<br>' + esc(fatos) : ''}${end ? '<br><span class="peq" data-sens>' + esc(end) + '</span>' : ''}${emp ? '<br><span class="peq">Empreendimento: <b>' + esc(emp) + '</b></span>' : ''}<br><span class="mut">${esc(x.bairro || '')}${x._meu ? ' · agenciado por você' : x.cor ? ' · ' + esc(x.cor) : ''}</span><br><span class="mut peq">Ponto ${esc(PREC[x.prec] || 'aproximado')}</span>
    <div class="linha" style="margin-top:8px;gap:6px"><button class="b" type="button" data-pmver="${esc(x.id)}">Detalhes</button>${gmapsDe(x) ? `<a class="b" href="${esc(gmapsDe(x))}" target="_blank" rel="noopener">📍 Google Maps</a>` : ''}</div></div>`;
}
function pontosMapa() {
  if (!MP) return; const L = window.L, its = itensMapa();
  const ems = empsMapa();
  const sig = its.map((x) => x.id).join('|') + S.pmCam + '#' + ems.map((e) => e.id).join('|') + JSON.stringify([S.pmFinOff, S.pmSitOff, S.pmEmp]); if (sig === MP_SIG) return; MP_SIG = sig;
  MPC.clearLayers(); MPK = {};
  const cor = (f) => /Venda/.test(f || '') ? 'var(--mp-c1)' : /Temporada/.test(f || '') ? 'var(--mp-c4)' : 'var(--mp-c2)';
  its.forEach((x) => {
    const aprox = /bairro|cidade/.test(x.prec || '');
    const mk = L.marker([x.lat, x.lng], { icon: L.divIcon({ className: 'mp-pino', iconSize: [20, 20], html: `<span class="mp-ponto${aprox ? ' mp-p-cidade' : ''}${x._meu ? ' pm-meu' : ''}" style="--c:${x._meu ? 'var(--brass)' : cor(x.fin)}"></span>` }), title: x.ref, keyboard: true });
    mk.bindPopup(() => popupMapa(x), { maxWidth: 280 }); MPC.addLayer(mk); MPK[x.id] = mk;
  });
  ems.forEach((e) => {
    const aprox = /bairro|cidade/.test(e.prec || '');
    const mk = L.marker([e.lat, e.lng], { icon: L.divIcon({ className: 'mp-pino', iconSize: [20, 20], html: `<span class="mp-ponto mp-emp${aprox ? ' mp-p-bairro' : ''}" style="--c:${SIT_COR[e.sit] || 'var(--muted)'}"></span>` }), title: e.nome, keyboard: true });
    mk.bindPopup(() => popupEmp(e), { maxWidth: 280 }); MPC.addLayer(mk); MPK['E:' + e.id] = mk;
  });
  const r = MP_ROOT.querySelector('#pmResumo'); if (r) r.textContent = `${its.length} imóveis${ems.length ? ` e ${ems.length} empreendimentos` : ''} no mapa${S.pmCam === 'meus' ? ' (só os seus)' : ' · use o Filtro de pesquisa para refinar'}`;
  MP_ROOT.querySelectorAll('[data-pmcam]').forEach((b) => b.setAttribute('aria-pressed', String((S.pmCam || 'todos') === b.dataset.pmcam)));
  MP_ROOT.querySelectorAll('[data-pmemp]').forEach((b) => b.setAttribute('aria-pressed', String(S.pmEmp !== false)));
  const ch = MP_ROOT.querySelector('#pmChips'); if (ch) ch.innerHTML = chipsMapa();
}
// Filtros do mapa como no HUB (05/11/2026, pedido do Cleiton): finalidade dos anúncios e situação dos empreendimentos
let MP_CONT = {}, MP_CONT_E = {};
const finMapa = (f) => (/Venda/.test(f || '') ? 'Venda' : /Temporada/.test(f || '') ? 'Temporada' : 'Locação');
const FIN_COR = { Venda: 'var(--mp-c1)', 'Locação': 'var(--mp-c2)', Temporada: 'var(--mp-c4)' };
function chipsMapa() {
  const b = (attr, val, on, cor, rot, n, emp) => `<button type="button" ${attr}="${esc(val)}" aria-pressed="${on}"><span class="mp-ponto${emp ? ' mp-emp' : ''}" style="--c:${cor};display:inline-block;vertical-align:middle;margin-right:4px"></span>${esc(rot)}<span class="peq" style="margin-left:5px;opacity:.7">${n || 0}</span></button>`;
  let h = `<span class="mut peq">Anúncios</span><div class="chips" role="group" aria-label="Finalidade">${['Venda', 'Locação', 'Temporada'].map((f) => b('data-pmfin', f, !(S.pmFinOff || {})[f], FIN_COR[f], f, MP_CONT[f])).join('')}</div>`;
  if (S.pmEmp !== false) h += `<span class="mut peq">Empreendimentos</span><div class="chips" role="group" aria-label="Situação do empreendimento">${Object.keys(SIT).map((s) => b('data-pmsit', s, !(S.pmSitOff || {})[s], SIT_COR[s] || 'var(--muted)', SIT[s], MP_CONT_E[s], true)).join('')}</div>`;
  return h;
}
function vMapa() {
  return `<section class="sec"><div class="linha" style="justify-content:space-between"><h2>Mapa dos imóveis</h2><button class="b${nFiltrosVit() ? ' p' : ''}" type="button" data-pmfiltro aria-expanded="${!!S.pmFiltro}">Filtro de pesquisa${nFiltrosVit() ? ` (${nFiltrosVit()})` : ''} ${S.pmFiltro ? '▲' : '▼'}</button></div>
    ${S.pmFiltro ? `${formFiltrosVit()}<p class="mut peq" style="margin:0">Os mesmos filtros valem na aba Pesquisar imóveis.</p>` : ''}
    ${MP_ESTADO === 'erro' ? '<div class="painel vazio">Não consegui carregar o mapa agora. Recarregue a página.</div>' : MP_ESTADO !== 'pronto' ? '<div class="painel vazio">Carregando o mapa…</div>' : '<div id="pmSlot"></div>'}
    <p class="status">Mostra os anúncios ativos, os imóveis que você agenciou e os empreendimentos (◆, na cor da situação). Endereços sem número aparecem com ponto aproximado; o 📍 Google Maps abre o endereço do prédio.</p></section>`;
}
function montaMapa() {
  if (S.aba !== 'mapa') return;
  if (MP_ESTADO === 'novo') { carregaMapa(); return; }
  const slot = document.getElementById('pmSlot'); if (!slot) return;
  slot.appendChild(MP_ROOT); iniciaMapa(); MP_SIG = ''; pontosMapa(); setTimeout(() => MP && MP.invalidateSize(), 50);
  if (S.pmFoco) { const id = S.pmFoco; S.pmFoco = null; const mk = MPK[id], x = [...S.vitrine, ...Object.entries(S.meus).map(([i, m]) => ({ ...m, id: i })), ...(S.prontos.has('empDocs') ? empCtx().emps.map((e) => ({ ...e, id: 'E:' + e.id })) : [])].find((y) => y.id === id);
    if (mk) setTimeout(() => MPC.zoomToShowLayer(mk, () => mk.openPopup()), 120); else if (x && x.lat != null) setTimeout(() => MP.setView([x.lat, x.lng], 16), 120); }
}

// ---------- Empreendimentos e construtoras (26/10/2026) ----------
/* Decisões do Cleiton (26/10/2026): todos os empreendimentos, separados por situação (lançamentos, em construção com a
   previsão de entrega, entregues); construtoras com os dados da empresa; revenda de terceiros (anúncios ativos da Vivere
   ligados ao empreendimento); empreendimentos no Mapa; material das construtoras (tabela de vendas, plantas, memorial,
   book, imagens e vídeos) em cópias guardadas no próprio painel. Nunca: contato de proprietário, dono ou responsável. */
const SIT = { lancamento: 'Lançamento', obras: 'Em construção', entregue: 'Entregue', a_classificar: 'A classificar' };
const SIT_PL = { lancamento: 'Lançamentos', obras: 'Em construção', entregue: 'Entregues', a_classificar: 'A classificar' };
const SIT_ORD = ['lancamento', 'obras', 'entregue', 'a_classificar'];
const SIT_COR = { lancamento: 'var(--emp-l)', obras: 'var(--warn)', entregue: 'var(--ok)', a_classificar: 'var(--muted)' };
const MAT_TIPOS = [['tabela_precos', 'Tabela de vendas', '💲'], ['plantas', 'Plantas', '📐'], ['memorial', 'Memorial descritivo', '📋'], ['book', 'Book e apresentação', '📘'], ['imagens', 'Imagens', '🖼'], ['video', 'Vídeos', '🎬']];
const pillEmp = (s) => `<span class="pill emp-${esc(s)}">${esc(SIT[s] || s)}</span>`;
const entOrd = (s) => { const m = String(s || '').match(/(\d{2})\/(\d{4})/); if (m) return +m[2] * 100 + +m[1]; const y = String(s || '').match(/\b(20\d{2})\b/); return y ? +y[1] * 100 + 12 : null; };
const faixa = (a, b) => a == null ? '—' : a === b ? curtoBRL(a) : `${curtoBRL(a)} a ${curtoBRL(b)}`;
const urlMat = (m) => /^https?:\/\//.test(m.url || '') ? m.url : ((window.VIVERE_PONTE && window.VIVERE_PONTE.arquivo(m.a)) || 'data:,'); /* trocas-f5: material no Storage do app, por link assinado */
const urlMin = (m) => (!/^https?:\/\//.test(m.url || '') && window.VIVERE_PONTE && window.VIVERE_PONTE.miniatura && window.VIVERE_PONTE.miniatura(m.a)) || urlMat(m); /* trocas-f5: miniatura na grade, arquivo cheio no clique */
const semTabela = (e) => (e.sit === 'lancamento' || e.sit === 'obras') && !e._tab;
let EMC = { d: null, v: null, r: null };
function empCtx() {
  if (EMC.r && EMC.d === S.empDocs && EMC.v === S.vitrine) return EMC.r;
  const emps = [], cons = [];
  // o banco entrega os dados congelados: trabalhar sempre em cópias (sem isso a aba e o mapa quebravam — 26/10/2026)
  Object.entries(S.empDocs || {}).forEach(([k, d]) => { const its = ((d && d.itens) || []).map((x) => ({ ...x })); if (k === 'construtoras') cons.push(...its); else if (/^e\d+$/.test(k)) emps.push(...its); });
  const vit = new Map(S.vitrine.map((v) => [v.id, v])), porC = new Map(cons.map((c) => [c.id, c])), empDoAnuncio = new Map();
  emps.forEach((e) => {
    e._rev = (e.revenda || []).map((r) => vit.get(r.id)).filter(Boolean); // só o que segue ativo na vitrine
    const vs = e._rev.map((r) => r.valor).filter((x) => x > 0);
    e._vmin = vs.length ? Math.min(...vs) : null; e._vmax = vs.length ? Math.max(...vs) : null; e._n = e._rev.length;
    { const fora = new Map(); Object.entries(S.catalogo || {}).forEach(([k, d]) => { if (k.startsWith('fora')) ((d && d.itens) || []).forEach((x) => fora.set(x.id, x)); });
      const its = (e.revenda || []).map((r) => vit.get(r.id) || fora.get(r.id)).filter(Boolean); e._m2s = m2Stats(its.filter((x) => m2Fin(x) === 'V').map(m2De)); e._m2 = e._m2s ? e._m2s.media : null; }
    e._mat = (e.material || []).length; e._tab = (e.material || []).some((m) => m.tipo === 'tabela_precos');
    e._c = porC.get(e.construtora_id) || null; e._ent = entOrd(e.entrega);
    e._rev.forEach((r) => empDoAnuncio.set(r.id, e));
  });
  cons.forEach((c) => { c._emps = emps.filter((e) => e.construtora_id === c.id); c._n = c._emps.length; });
  EMC = { d: S.empDocs, v: S.vitrine, r: { emps, cons, porId: new Map(emps.map((e) => [e.id, e])), porC, empDoAnuncio } };
  return EMC.r;
}
const baEmp = (e) => ({ txt: [e.nome, ...(e.outros || []), e.construtora, e._c && e._c.razao_social, e.bairro, e.cidade, e.endereco, e.tipologias, e.estagio, SIT[e.sit], SIT_PL[e.sit], e.entrega, e.descricao, ...(e._rev || []).map((r) => r.ref), ...(e.material || []).map((m) => m.titulo)].filter(Boolean).join(' · '), valores: (e._rev || []).map((r) => r.valor), nums: {} });
const baCons = (c) => ({ txt: [c.nome, c.razao_social, c.cnpj, c.sede, c.resumo, ...(c._emps || []).map((e) => e.nome)].filter(Boolean).join(' · '), docs: [c.cnpj], nums: {} });

function vEmp() {
  if (!S.prontos.has('empDocs')) return '<section class="sec"><div class="painel vazio">Carregando os empreendimentos…</div></section>';
  const C = empCtx(), sub = S.empSub || 'emps';
  if (!C.emps.length) return '<section class="sec"><h2>Empreendimentos e construtoras</h2><div class="painel vazio">Os empreendimentos ainda não foram carregados neste painel. A rotina diária da Vivere faz isso.</div></section>';
  const nRev = C.emps.reduce((s, e) => s + e._n, 0);
  const subs = [['emps', `Empreendimentos (${C.emps.length})`], ['cons', `Construtoras (${C.cons.length})`], ['rev', `Revenda de terceiros (${nRev})`]];
  const corpo = sub === 'cons' ? vEmpCons(C) : sub === 'rev' ? vEmpRev(C) : vEmpLista(C);
  return `<section class="sec sec-emp"><h2>Empreendimentos e construtoras</h2>
    <div class="chips sub-emp" role="group" aria-label="O que ver">${subs.map(([k, t]) => `<button type="button" data-empsub="${k}" aria-pressed="${sub === k}">${esc(t)}</button>`).join('')}</div>
    ${corpo}
    <p class="status">Material das construtoras guardado no próprio painel (tabelas de vendas, plantas, memoriais, books, imagens e vídeos). Contato de proprietário, dono ou responsável das construtoras não aparece aqui. Atualizado pela rotina diária da Vivere.</p></section>`;
}
function vEmpLista(C) {
  const f = S.fe, busca = !!qDe();
  let L = C.emps.filter((e) => (busca || !f.sit || e.sit === f.sit) && (!f.cons || e.construtora_id === f.cons) && (!listaSel(f.bairro).length || listaSel(f.bairro).includes(e.bairro)) && (!f.disp || e._n) && (!f.mat || e._mat));
  const fL = BA.filtra(L, qDe(), baEmp); L = fL.lista; qInfo(fL, 'empreendimentos');
  const cont = (s) => C.emps.filter((e) => !s || e.sit === s).length;
  const chips = [['', `Todos (${cont('')})`], ...SIT_ORD.map((s) => [s, `${SIT_PL[s]} (${cont(s)})`])];
  const consOp = C.cons.filter((c) => c._n).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const bairros = [...new Set(C.emps.map((e) => e.bairro).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const matIcones = (e) => (e.material || []).length ? MAT_TIPOS.filter(([t]) => e.material.some((m) => m.tipo === t)).map(([, l, i]) => `<span title="${esc(l)}">${i}</span>`).join(' ') : '';
  const cols = [
    { k: 'nome', l: 'Empreendimento', h: (r) => `<b>${esc(r.nome)}</b>${hitBA(r)}<div class="mut peq">${esc(r.construtora || 'construtora não identificada')}</div>` },
    { k: 'sit', l: 'Situação', v: (r) => SIT_ORD.indexOf(r.sit), h: (r) => pillEmp(r.sit) },
    { k: '_ent', l: 'Entrega', h: (r) => r.entrega ? `${esc(r.entrega)}${r.estagio ? `<div class="mut peq">${esc(r.estagio)}</div>` : ''}` : (r.estagio ? `<span class="peq">${esc(r.estagio)}</span>` : '—') },
    { k: 'bairro', l: 'Bairro', h: (r) => `${esc(r.bairro || '—')}${r.cidade && r.cidade !== 'Florianópolis' ? `<div class="mut peq">${esc(r.cidade)}</div>` : ''}` },
    { k: '_n', l: 'Disponíveis', n: true, h: (r) => r._n ? `<b>${r._n}</b> <span class="mut peq">na Vivere</span>` : '<span class="mut">—</span>' },
    { k: '_vmin', l: 'Valores', n: true, h: (r) => r._n ? `<span class="peq">${faixa(r._vmin, r._vmax)}</span>` : '<span class="mut">—</span>' },
    { k: '_m2', l: 'R$/m² venda', n: true, h: (r) => r._m2s ? `<b>${m2Fmt(r._m2s.media)}</b><div class="mut peq">média de ${r._m2s.n}${r._m2s.n > 1 ? ' · ' + m2Fx(r._m2s.min, r._m2s.max) : ''}</div>` : '<span class="mut">—</span>' },
    { k: '_mat', l: 'Material', n: true, h: (r) => r._mat ? `${matIcones(r)} <span class="mut peq">${r._mat}</span>` : (semTabela(r) ? '<span class="pill media">sem tabela</span>' : '<span class="mut">—</span>') },
    { k: 'mapa', l: 'Mapa', ord: false, h: (r) => [r.lat != null ? `<button class="copiar" type="button" data-vermapa="E:${esc(r.id)}">🗺 mapa</button>` : '', r.gmaps ? `<a href="${esc(r.gmaps)}" target="_blank" rel="noopener">📍 Google</a>` : ''].filter(Boolean).join(' · ') || '—' },
  ];
  return `<div class="chips" role="group" aria-label="Situação"${busca ? ' hidden' : ''}>${chips.map(([k, t]) => `<button type="button" data-fesit="${k}" aria-pressed="${f.sit === k}">${esc(t)}</button>`).join('')}</div>
    ${busca ? '<p class="mut peq" style="margin:0">Com a busca, a lista procura em todas as situações.</p>' : ''}
    <div class="painel form">
      <label class="c">Construtora<select id="feCons"><option value="">Todas</option>${consOp.map((c) => `<option value="${esc(c.id)}" ${f.cons === c.id ? 'selected' : ''}>${esc(c.nome)} (${c._n})</option>`).join('')}</select></label>
      <div class="c">Bairros${MultiSel.html('feBairro', bairros.map((b) => [b, b]), listaSel(f.bairro), 'Todos', 'bairros')}</div>
      <label class="c chk"><input type="checkbox" id="feDisp" ${f.disp ? 'checked' : ''}> Só com imóveis disponíveis</label>
      <label class="c chk"><input type="checkbox" id="feMat" ${f.mat ? 'checked' : ''}> Só com material</label>
    </div>
    ${tabela('emps', cols, L, { padrao: f.sit === 'lancamento' || f.sit === 'obras' ? { c: '_ent', d: 1 } : { c: '_n', d: -1 }, abre: (r) => 'emp:' + r.id, vazio: 'Nenhum empreendimento com esses filtros.', cartao: (r) => `
      <div class="cm-l1"><span class="cm-nome">${esc(r.nome)}</span>${hitBA(r)}<span class="cm-v">${pillEmp(r.sit)}</span></div>
      <div class="cm-lin">${esc(r.construtora || 'construtora não identificada')}</div>
      <div class="cm-fat"><span>${esc(r.bairro || 'bairro não informado')}${r.cidade && r.cidade !== 'Florianópolis' ? ' · ' + esc(r.cidade) : ''}</span><span>${r.entrega ? `Entrega <b>${esc(r.entrega)}</b>` : esc(r.estagio ? '' : 'entrega não informada')}${r.entrega && r.estagio ? ' · ' : ''}${r.estagio ? `<span class="mut">${esc(r.estagio)}</span>` : ''}</span></div>
      <div class="cm-fat">${r._n ? `<span><b>${r._n}</b> disponíve${r._n > 1 ? 'is' : 'l'} na Vivere</span><span>${faixa(r._vmin, r._vmax)}</span>` : '<span class="mut">sem imóvel disponível na Vivere</span>'}${r._m2s ? `<span>R$/m² <b>${m2Fmt(r._m2s.media)}</b> (média de ${r._m2s.n})</span>` : ''}</div>
      <div class="cm-acoes"><span>${r._mat ? `Material ${matIcones(r)} <span class="mut">(${r._mat})</span>` : semTabela(r) ? '<span class="pill media">sem tabela</span>' : '<span class="mut">sem material</span>'}</span>${r.lat != null ? `<button class="copiar" type="button" data-vermapa="E:${esc(r.id)}">🗺 mapa</button>` : ''}${r.gmaps ? `<a href="${esc(r.gmaps)}" target="_blank" rel="noopener">📍 Google</a>` : ''}</div>` })}`;
}
function vEmpCons(C) {
  let L = C.cons.slice();
  const fL = BA.filtra(L, qDe(), baCons); L = fL.lista; qInfo(fL, 'construtoras');
  const contSit = (c) => SIT_ORD.map((s) => [s, c._emps.filter((e) => e.sit === s).length]).filter(([, n]) => n).map(([s, n]) => `${n} ${(n === 1 ? SIT[s] : SIT_PL[s]).toLowerCase()}`).join(' · ');
  const links = (c) => [c.site ? `<a href="${esc(c.site)}" target="_blank" rel="noopener">site</a>` : '', c.portal ? `<a href="${esc(c.portal)}" target="_blank" rel="noopener">portal do corretor</a>` : '', c.instagram ? `<a href="${esc(c.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''].filter(Boolean).join(' · ') || '—';
  const cols = [
    { k: 'nome', l: 'Construtora', h: (r) => `<b>${esc(r.nome)}</b>${hitBA(r)}${r.razao_social ? `<div class="mut peq">${esc(r.razao_social)}</div>` : ''}` },
    { k: 'cnpj', l: 'CNPJ', h: (r) => esc(r.cnpj || '—') },
    { k: 'sede', l: 'Sede', h: (r) => `<span class="peq">${esc(r.sede || '—')}</span>` },
    { k: '_n', l: 'Empreend.', n: true, h: (r) => r._n ? `<b>${r._n}</b><div class="mut peq">${esc(contSit(r))}</div>` : '—' },
    { k: 'links', l: 'Links', ord: false, h: links },
  ];
  return tabela('cons', cols, L, { padrao: { c: '_n', d: -1 }, abre: (r) => 'cons:' + r.id, vazio: 'Nenhuma construtora atende à busca.', cartao: (r) => `
    <div class="cm-l1"><span class="cm-nome">${esc(r.nome)}</span>${hitBA(r)}<span class="cm-v mut peq">${r._n} empreend.</span></div>
    ${r.razao_social ? `<div class="cm-lin">${esc(r.razao_social)}</div>` : ''}
    ${r.cnpj ? `<div class="cm-fat"><span>CNPJ ${esc(r.cnpj)}</span></div>` : ''}
    ${r.sede ? `<div class="peq mut">Sede: ${esc(r.sede)}</div>` : ''}
    <div class="peq">${esc(contSit(r) || 'sem empreendimento ligado')}</div>
    <div class="cm-acoes">${links(r)}</div>` });
}
function vEmpRev(C) {
  const f = S.fe;
  let L = C.emps.flatMap((e) => e._rev.map((r) => ({ ...r, _emp: e.nome, _empId: e.id, _sit: e.sit })));
  const total = L.length;
  if (f.revEmp) L = L.filter((r) => r._empId === f.revEmp);
  const fL = BA.filtra(L, qDe(), (r) => { const x = baImv(r); return { ...x, txt: [r._emp, SIT[r._sit], x.txt].join(' · ') }; }); L = fL.lista; qInfo(fL, 'imóveis de revenda');
  const empsCom = C.emps.filter((e) => e._n).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const cols = [
    { k: '_emp', l: 'Empreendimento', h: (r) => `<button class="copiar" type="button" data-abre="emp:${esc(r._empId)}" style="padding:0;text-align:left"><b>${esc(r._emp)}</b></button>${hitBA(r)}<div>${pillEmp(r._sit)}</div>` },
    { k: 'ref', l: 'Ref.', h: (r) => `<span class="ref">${esc(r.ref)}</span><div class="mut peq">${esc(r.tipo || '')}</div>` },
    { k: 'valor', l: 'Valor', n: true, h: (r) => `<b>${brl(r.valor)}</b>${r.cond ? `<div class="mut peq">cond. ${brl(r.cond)}</div>` : ''}` },
    { k: '_m2', l: 'R$/m²', n: true, v: (r) => m2De(r), h: (r) => m2De(r) != null ? `<span style="white-space:nowrap">${m2Fmt(m2De(r))}</span>${m2Fin(r) === 'A' ? '<div class="mut peq">aluguel</div>' : ''}` : '—' },
    { k: 'dorm', l: 'Dorm.', n: true, h: (r) => r.dorm ? `${r.dorm}${r.suites ? ` <span class="mut peq">(${r.suites} suíte${r.suites > 1 ? 's' : ''})</span>` : ''}` : '—' },
    { k: 'vagas', l: 'Vagas', n: true, h: (r) => num(r.vagas) },
    { k: 'area', l: 'Área', n: true, h: (r) => r.area ? num(r.area, 1) + ' m²' : '—' },
    { k: 'cor', l: 'Agenciador', h: (r) => esc(r.cor || '—') },
    { k: 'link', l: 'Links', ord: false, h: (r) => [r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">site</a>` : '', r.lat != null ? `<button class="copiar" type="button" data-vermapa="${esc(r.id)}">🗺 mapa</button>` : ''].filter(Boolean).join(' · ') || '—' },
  ];
  return `<p class="mut peq" style="margin:0">Unidades de revenda de terceiros anunciadas pela Vivere dentro de cada empreendimento (${total} anúncios ativos). Busque pelo nome do empreendimento para ver só as dele.</p>
    <div class="painel form"><label class="c">Empreendimento<select id="feRevEmp"><option value="">Todos</option>${empsCom.map((e) => `<option value="${esc(e.id)}" ${f.revEmp === e.id ? 'selected' : ''}>${esc(e.nome)} (${e._n})</option>`).join('')}</select></label></div>
    ${tabela('rev', cols, L, { padrao: { c: '_emp', d: 1 }, abre: (r) => 'vit:' + r.id, vazio: 'Nenhum imóvel de revenda com esses filtros.', cartao: (r) => `
      <div class="cm-l1"><span class="ref">${esc(r.ref)}</span>${hitBA(r)}<span class="cm-lin">${esc(r.tipo || '')}</span><b class="cm-v">${curtoBRL(r.valor) || '—'}</b></div>
      <div class="cm-l1"><span class="cm-lin"><b>${esc(r._emp)}</b> · ${esc(r.bairro || '—')}</span><span class="cm-v">${pillEmp(r._sit)}</span></div>
      <div class="cm-fat">${fatosCurtos(r)}${r.cond ? `<span>cond. ${curtoBRL(r.cond)}</span>` : ''}</div>
      <div class="cm-acoes"><span class="mut">${esc(r.cor || 'sem agenciador')}</span>${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">site</a>` : ''}${r.lat != null ? `<button class="copiar" type="button" data-vermapa="${esc(r.id)}">🗺 mapa</button>` : ''}</div>` })}`;
}
function htmlMaterial(e) {
  const mat = e.material || [];
  if (!mat.length) return `<div class="painel vazio">Nenhum material deste empreendimento no painel ainda.${e.sit === 'lancamento' || e.sit === 'obras' ? ' Peça a tabela de vendas e as plantas à diretoria.' : ''}</div>`;
  return MAT_TIPOS.filter(([t]) => mat.some((m) => m.tipo === t)).map(([t, l, i]) => {
    const its = mat.filter((m) => m.tipo === t), grupos = [...new Set(its.map((m) => m.grupo || ''))];
    return `<div class="mat-bloco"><h4>${i} ${esc(l)} <span class="mut peq">(${its.length})</span></h4>${grupos.map((g) => {
      const gi = its.filter((m) => (m.grupo || '') === g), imgs = gi.filter((m) => /^image\//.test(m.ct || '')), vids = gi.filter((m) => /^video\//.test(m.ct || '')), docs = gi.filter((m) => !imgs.includes(m) && !vids.includes(m));
      return `${g ? `<p class="mut peq" style="margin:6px 0 4px">${esc(g)}</p>` : ''}
        ${docs.length ? `<div class="linha">${docs.map((m) => `<a class="b" href="${esc(urlMat(m))}" target="_blank" rel="noopener">📄 ${esc(m.titulo)}</a>`).join('')}</div>` : ''}
        ${imgs.length ? `<div class="fotos mat-fotos">${imgs.map((m, k) => `<a href="${esc(urlMat(m))}" target="_blank" rel="noopener" title="${esc(m.titulo)}"><figure><img src="${esc(urlMin(m))}" alt="${esc(l + ' ' + (k + 1) + ' de ' + e.nome)}" loading="lazy"></figure></a>`).join('')}</div>` : ''}
        ${vids.map((m) => `<video class="mat-video" controls preload="none" src="${esc(urlMat(m))}" title="${esc(m.titulo)}"></video>`).join('')}`;
    }).join('')}</div>`;
  }).join('') + '<p class="status">Toque para abrir em tela cheia. Para enviar ao cliente, baixe pelo próprio arquivo aberto.</p>';
}
function gavetaEmp(id) {
  const C = empCtx(), e = C.porId.get(id); if (!e) return '';
  const aba = S.empFicha || 'geral';
  const subs = [['geral', 'Visão geral'], ['mat', `Material (${e._mat})`], ['rev', `Revenda de terceiros (${e._n})`]];
  let corpo = '';
  if (aba === 'mat') corpo = htmlMaterial(e);
  else if (aba === 'rev') corpo = e._n ? `<div class="op-ofs">${[...e._rev].sort((a, b) => (a.valor || 0) - (b.valor || 0)).map((r) => `<div class="op-of"><div class="l1"><span class="ref">${esc(r.ref)}</span><span class="peq mut">${esc(r.tipo || '')}</span><span class="v">${curtoBRL(r.valor) || '—'}</span></div>
      <div class="peq">${fatosCurtos(r)}</div><div class="peq mut">Agenciado por ${esc(r.cor || '—')} · atualizado ${dt(r.atu)}</div>
      <div class="linha acoes"><button class="b" type="button" data-abre="vit:${esc(r.id)}">Detalhes</button>${r.link ? `<a class="b" href="${esc(r.link)}" target="_blank" rel="noopener">Site</a>` : ''}${r.lat != null ? `<button class="b" type="button" data-vermapa="${esc(r.id)}">🗺 Mapa</button>` : ''}</div></div>`).join('')}</div>
      <p class="status">Unidades de revenda de terceiros anunciadas pela Vivere neste empreendimento. Proprietário e contato aparecem só nos imóveis que você agenciou.</p>` : '<div class="painel vazio">Nenhuma unidade de revenda anunciada pela Vivere neste empreendimento agora.</div>';
  else corpo = `${e.tipologias ? `<p><span class="mut">Tipologias:</span> ${esc(e.tipologias)}</p>` : ''}
      ${e.descricao ? `<p class="peq" style="white-space:pre-line">${esc(e.descricao)}</p>` : ''}
      ${e.outros && e.outros.length ? `<p class="peq"><span class="mut">Também chamado de:</span> ${esc(e.outros.join(' · '))}</p>` : ''}
      ${e.links && e.links.length ? `<div class="linha">${e.links.map((u) => `<a class="b" href="${esc(u)}" target="_blank" rel="noopener">Site oficial ↗</a>`).join('')}</div>` : ''}
      ${semTabela(e) ? '<div class="aviso" style="grid-template-columns:auto 1fr"><span class="pill media">Atenção</span><div>Sem tabela de vendas no painel. Confirme valores e disponibilidade com a diretoria antes de ofertar.</div></div>' : ''}`;
  return `<div class="gaveta larga" role="dialog" aria-modal="true" aria-label="Empreendimento">
    <div class="cab"><div><p class="mut peq" style="margin:0">${pillEmp(e.sit)} ${e.construtora ? `· ${e.construtora_id && C.porC.get(e.construtora_id) ? `<button class="copiar" type="button" data-abre="cons:${esc(e.construtora_id)}">${esc(e.construtora)}</button>` : esc(e.construtora)}` : '· construtora não identificada'}</p><h3>${esc(e.nome)}</h3></div><button class="b" type="button" data-fechar>Fechar</button></div>
    <div class="fatos-emp">
      <div><span class="mut peq">Entrega</span><b>${esc(e.entrega || '—')}</b></div>
      <div><span class="mut peq">Estágio</span><b>${esc(e.estagio || SIT[e.sit])}</b></div>
      <div><span class="mut peq">Disponíveis na Vivere</span><b>${e._n || 0}</b>${e._n ? `<span class="peq">${faixa(e._vmin, e._vmax)}</span>` : ''}${e._m2s ? `<span class="peq">R$/m² venda: <b>${m2Fmt(e._m2s.media)}</b> (média de ${e._m2s.n}, ativos e inativos${e._m2s.n > 1 ? '; ' + m2Fx(e._m2s.min, e._m2s.max) : ''})</span>` : ''}</div>
    </div>
    <div><span data-sens>${esc(e.endereco || '')}</span><div class="mut peq">${esc([e.bairro, e.cidade].filter(Boolean).join(' · '))}${e.prec ? ' · ponto ' + esc(PREC[e.prec] || 'aproximado') : ''}</div></div>
    <div class="linha">${btnsMapa('E:' + e.id, e)}</div>
    <div class="chips" role="group" aria-label="Seções da ficha">${subs.map(([k, t]) => `<button type="button" data-empficha="${k}" aria-pressed="${aba === k}">${esc(t)}</button>`).join('')}</div>
    <div class="sec" style="gap:12px">${corpo}</div></div>`;
}
function gavetaCons(id) {
  const C = empCtx(), c = C.porC.get(id); if (!c) return '';
  const lista = [...c._emps].sort((a, b) => SIT_ORD.indexOf(a.sit) - SIT_ORD.indexOf(b.sit) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  return `<div class="gaveta" role="dialog" aria-modal="true" aria-label="Construtora">
    <div class="cab"><div><p class="mut peq" style="margin:0">Construtora / incorporadora</p><h3>${esc(c.nome)}</h3></div><button class="b" type="button" data-fechar>Fechar</button></div>
    <div class="prop">${c.razao_social ? `<div><span class="mut">Razão social:</span> ${esc(c.razao_social)}</div>` : ''}${c.cnpj ? `<div><span class="mut">CNPJ:</span> ${esc(c.cnpj)}</div>` : ''}${c.sede ? `<div><span class="mut">Sede:</span> ${esc(c.sede)}</div>` : ''}</div>
    ${c.resumo ? `<p class="peq">${esc(c.resumo)}</p>` : ''}
    <div class="linha">${c.site ? `<a class="b" href="${esc(c.site)}" target="_blank" rel="noopener">Site ↗</a>` : ''}${c.portal ? `<a class="b p" href="${esc(c.portal)}" target="_blank" rel="noopener">Portal do corretor ↗</a>` : ''}${c.instagram ? `<a class="b" href="${esc(c.instagram)}" target="_blank" rel="noopener">Instagram ↗</a>` : ''}</div>
    <h2>Empreendimentos (${lista.length})</h2>
    <div class="hist">${lista.length ? lista.map((e) => `<div class="i"><div class="q">${pillEmp(e.sit)} ${esc(e.entrega ? 'entrega ' + e.entrega : '')}</div><button class="copiar" type="button" data-abre="emp:${esc(e.id)}" style="padding:0"><b>${esc(e.nome)}</b></button> <span class="mut peq">${esc(e.bairro || '')}${e._n ? ` · ${e._n} disponíve${e._n > 1 ? 'is' : 'l'}` : ''}${e._mat ? ' · com material' : ''}</span></div>`).join('') : '<p class="mut">Nenhum empreendimento ligado.</p>'}</div>
    <p class="status">Só dados da empresa. Contato de dono ou responsável não fica no painel; se precisar, fale com a diretoria.</p></div>`;
}
// Mapa: camada de empreendimentos (losango na cor da situação)
function empsMapa() {
  if (S.pmEmp === false || !S.prontos.has('empDocs')) return [];
  const its0 = empCtx().emps.filter((e) => e.lat != null);
  MP_CONT_E = {}; its0.forEach((e) => { MP_CONT_E[e.sit] = (MP_CONT_E[e.sit] || 0) + 1; });
  const its = its0.filter((e) => !(S.pmSitOff || {})[e.sit]);
  return BA.filtra(its, qDe('mapa'), baEmp).lista;
}
function popupEmp(e) {
  return `<div class="pm-pop"><b>${esc(e.nome)}</b><br>${pillEmp(e.sit)}${e.entrega ? ` · entrega ${esc(e.entrega)}` : ''}<br><span class="mut">${esc(e.construtora || 'construtora não identificada')} · ${esc(e.bairro || '')}</span><br>${e._n ? `<b>${e._n}</b> disponíve${e._n > 1 ? 'is' : 'l'} na Vivere · ${faixa(e._vmin, e._vmax)}` : '<span class="mut">sem imóvel disponível na Vivere</span>'}<br><span class="mut peq">Ponto ${esc(PREC[e.prec] || 'aproximado')}</span>
    <div class="linha" style="margin-top:8px;gap:6px"><button class="b" type="button" data-abre="emp:${esc(e.id)}">Abrir ficha</button>${e.gmaps ? `<a class="b" href="${esc(e.gmaps)}" target="_blank" rel="noopener">📍 Google Maps</a>` : ''}</div></div>`;
}


// ---------- Gavetas ----------
function abrir(tipo, id, semFoco) {
  S.aberto = { tipo, id };
  const html = tipo === 'tarefa' ? TF.gaveta(id) : tipo === 'atrib' ? TF.gavetaAtrib() : tipo === 'meu' ? gavetaMeu(id) : tipo === 'lead' ? gavetaLead(id) : tipo === 'novo' ? gavetaLead(null) : tipo === 'alt' ? gavetaAlterar(id) : tipo === 'novoimv' ? gavetaNovoImovel() : tipo === 'fotosimv' ? gavetaFotosImv() : tipo === 'sol' ? gavetaSol(id) : tipo === 'agenc' ? gavetaAgenc(id) : tipo === 'conversa' ? gavetaConversa(id) : tipo === 'voz' ? gavetaVoz() : tipo === 'emp' ? gavetaEmp(id) : tipo === 'cons' ? gavetaCons(id) : gavetaVitrine(id);
  const so = document.getElementById('sobre');
  so.innerHTML = `<div class="sobre" data-fundo>${html}</div>`;
  if (!semFoco) { const pri = so.querySelector('input,select,textarea,button'); if (pri) pri.focus(); }
}
function fechar() { if (S.novo && S.novo.sujo) gravarNovo('rascunho', true); if (ctrlIA) { ctrlIA.abort(); ctrlIA = null; } S.aberto = null; S.novo = null; S.proposta = null; document.getElementById('sobre').innerHTML = ''; }
function redesenharGaveta() { const g = document.querySelector('.gaveta'), y = g ? g.scrollTop : 0; abrir(S.aberto.tipo, S.aberto.id, true); const g2 = document.querySelector('.gaveta'); if (g2) g2.scrollTop = y; }

// ---------- Escritas ----------
async function gravar(fn, okMsg) {
  if (S.gestor) { toast(SO_LEITURA); return false; }
  try { await fn(); toast(okMsg); return true; }
  catch (e) {
    const c = e && e.code;
    if (c === 'invalid_argument' && !S.semPermissao) { S.semPermissao = true; toast('Você não tem permissão para gravar aqui. Fale com a diretoria.'); }
    else if (c === 'unavailable') toast('Sem conexão agora. Tente de novo em instantes.');
    else toast('Não foi possível salvar: ' + (e && e.message || 'erro desconhecido'));
    return false;
  }
}
// Interesse manda na Finalidade (08/11/2026): Comprador/Vendedor → Venda; anual → Locação; temporada → Temporada.
// A Finalidade some do formulário (só volta em "A definir") e o bloco do perfil diz se é o que o cliente procura ou o imóvel que ele tem.
const FIN_DO_INT = { comprador: 'Venda', vendedor: 'Venda', locatario_anual: 'Locação', locador_anual: 'Locação', locatario_temporada: 'Temporada', locador_temporada: 'Temporada' };
function ajustaFinInt() {
  const si = document.getElementById('lInt'); if (!si) return;
  const k = si.value, fin = FIN_DO_INT[k], x = INT_POR[k], lado = x ? x.lado : 'def';
  const box = document.getElementById('pFinBox'), sf = document.getElementById('pFin'), au = document.getElementById('pFinAuto'), tit = document.getElementById('pTit');
  if (sf && fin) sf.value = fin;
  if (box) box.hidden = true; // Finalidade abolida (08/11/2026, 10h17): só o Interesse; a finalidade gravada vem dele
  if (au) { au.hidden = true; au.textContent = ''; }
  if (tit) tit.textContent = lado === 'tem' ? 'Imóvel que o cliente tem' : lado === 'procura' ? 'O que o cliente procura' : 'Perfil do cliente';
  const rot = (id, txt) => { const i = document.getElementById(id), l = i && i.closest('label'); if (l && l.firstChild && l.firstChild.nodeType === 3) l.firstChild.nodeValue = txt; };
  const tem = lado === 'tem';
  rot('pMin', tem ? 'Valor pedido, de (R$)' : 'Valor mínimo (R$)'); rot('pMax', tem ? 'Valor pedido, até (R$)' : 'Valor máximo (R$)');
  rot('pDorm', tem ? 'Dormitórios' : 'Dormitórios (mín.)'); rot('pVagas', tem ? 'Vagas' : 'Vagas (mín.)');
  si.dataset.finOk = k;
}
document.addEventListener('change', (e) => { if (e.target && e.target.id === 'lInt') ajustaFinInt(); });
new MutationObserver(() => { const si = document.getElementById('lInt'); if (si && si.dataset.finOk !== si.value) ajustaFinInt(); }).observe(document.documentElement, { childList: true, subtree: true });
const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
async function salvarLead(form) {
  const id = form.dataset.id, novo = !id, etapa = val('lEtapa');
  const err = document.getElementById('eLead'); err.textContent = '';
  if (etapa === 'Perdido' && !val('lMotivo')) { err.textContent = 'Informe o motivo da perda.'; return; }
  const perfil = { finalidade: FIN_DO_INT[val('lInt')] || '', tipo: val('pTipo'), bairros: val('pBairros'), vmin: numVlr(val('pMin')), vmax: numVlr(val('pMax')), dorm: val('pDorm') ? Number(val('pDorm')) : null, vagas: val('pVagas') ? Number(val('pVagas')) : null, obs: val('pObs'), em: agora().slice(0, 16), por: 'corretor' };
  const intSel = val('lInt');
  const dados = { ...(INT_POR[intSel] ? { interesse: intSel } : {}), etapa, motivo: etapa === 'Perdido' ? val('lMotivo') : '', prox_acao: val('lProx'), data_prox: val('lData'), imovel_interesse: val('lImovel').toUpperCase(), data_fechamento: etapa === 'Fechado' ? val('lFech') : '', perfil, atualizado_em: agora(), origem: 'painel' };
  if (novo) {
    if (!val('lNome') || digitos(val('lTel')).length < 10) { err.textContent = 'Informe o nome e um telefone com DDD.'; return; }
    const hist = val('lObsNovo') ? [{ em: agora().slice(0, 16), tipo: 'Observação', texto: val('lObsNovo') }] : [];
    const novoId = 'n-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ok = await gravar(() => db.collection('leads').doc(novoId).set({ ...dados, nome: val('lNome'), telefone: digitos(val('lTel')), campanha: val('lOrig'), entrada: hojeISO(), historico: hist, criado_no_painel: true }), 'Lead cadastrado.');
    if (ok) { fechar(); S.aba = 'leads'; render(); }
  } else {
    if (etapa !== ((S.leads[id] || {}).etapa || 'Novo')) { dados.etapa_em = agora(); dados.etapa_por = 'corretor'; }
    const ok = await gravar(() => db.collection('leads').doc(id).update(dados), 'Alterações salvas.');
    if (ok) fechar();
  }
}
async function registrarHist(form) {
  const id = document.getElementById('fLead').dataset.id, l = S.leads[id]; if (!l) return;
  const texto = val('hTexto'); if (!texto) return;
  const h = [...histDe(l), { em: agora().slice(0, 16), tipo: val('hTipo'), texto }];
  const ok = await gravar(() => db.collection('leads').doc(id).update({ historico: h, atualizado_em: agora(), origem: 'painel' }), 'Tratativa registrada.');
  if (ok) { document.getElementById('hTexto').value = ''; const hl = document.getElementById('histLista'); if (hl) hl.innerHTML = htmlHist({ historico: h }); }
}
async function enviarAlteracao(form) {
  const id = form.dataset.id, m = S.meus[id], err = document.getElementById('eAlt'); err.textContent = '';
  const alt = lerAlteracoes(m);
  const obs = val('a_obs');
  if (!Object.keys(alt).length && !obs) { err.textContent = 'Nada mudou. Altere algum campo ou escreva uma observação.'; return; }
  const ok = await gravar(() => db.collection('solicitacoes').doc('s-' + Date.now().toString(36)).set({ imovel_id: id, ref: m.ref, alteracoes: alt, obs, status: 'pendente', criado_em: agora(), corretor: S.info.slug || '' }), 'Enviado para aprovação.');
  if (ok) { fechar(); S.aba = 'solicitacoes'; try { sessionStorage.setItem('painel.aba', S.aba); } catch (e) {} render(); }
}

// ---------- Eventos ----------
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button,a,[data-abre],[data-fundo]'); if (!t) return;
  if (t.matches('[data-fundo]') && ev.target === t) return fechar();
  const d = t.dataset;
  if (d.aba) { S.aba = d.aba; try { sessionStorage.setItem('painel.aba', S.aba); } catch (e) {} render(); window.scrollTo(0, 0); return; }
  if (d.fechar !== undefined) return fechar();
  if (d.ord) { const [k, c] = d.ord.split('|'); const st = S.sort[k]; S.sort[k] = { c, d: st && st.c === c ? -st.d : (['valor', 'atu', 'cad', 'entrada', '_ult', 'criado_em', 'area', 'dorm', 'vagas', 'data_prox', '_n', '_mat', '_vmin', '_m2', 'n', 'media', 'min'].includes(c) ? -1 : 1) }; if (k === 'vit') S.pagVit = 0; return render(); }
  if (d.ordm) { const st = S.sort.meus; S.sort.meus = { c: d.ordm, d: st.c === d.ordm ? -st.d : (['_end', 'bairro', 'ref'].includes(d.ordm) ? 1 : -1) }; return render(); }
  if (d.fm !== undefined) { const [k, v] = d.fm.split('|'); S.fm[k] = S.fm[k] === v ? '' : v; return render(); }
  if (d.pag) { const [k, s] = d.pag.split('|'); if (/^m2[VA]/.test(k)) { S.pagM2 = S.pagM2 || {}; S.pagM2[k] = Math.max(0, (S.pagM2[k] || 0) + Number(s)); return render(); } if (k === 'vit') { S.pagVit = Math.max(0, S.pagVit + Number(s)); render(); document.querySelector('.tabela')?.scrollIntoView({ block: 'start' }); } return; }
  if (d.int !== undefined) { S.filtroInt = S.filtroInt === d.int ? '' : d.int; return render(); }
  if (d.etapa) { S.filtroEtapa = d.etapa; return render(); }
  if (d.pmfiltro != null) { S.pmFiltro = !S.pmFiltro; return render(); }
  if (d.pvfiltro != null) { S.pvFiltro = !S.pvFiltro; return render(); }   // filtros da Pesquisa recolhidos no celular (02/11/2026)
  if (d.opfiltro) { S.opFiltro = d.opfiltro; S.opPg = 0; return render(); }
  if (d.opab) { S.opAb = S.opAb === d.opab ? '' : d.opab; return render(); }
  if (d.opord) { S.opOrd = proxOrdP(S.opOrd, d.opord); S.opPg = 0; return render(); }
  if (d.oplfil) { focaFilOpP(d.oplfil); return; }
  if (d.oplimpa) { S.opFl = FL_VAZIO(); S.opPg = 0; return render(); }
  if (d.oppg) { S.opPg = Math.max(0, (S.opPg || 0) + Number(d.oppg)); render(); document.querySelector('.opl-wrap')?.scrollIntoView({ block: 'start' }); return; }
  if (d.opmais) { S.opMais[d.opmais] = !S.opMais[d.opmais]; return render(); }
  if (d.opia) return opPedirIA(d.opia);
  if (d.opconf) return opConfirmar(d.opconf);
  if (d.opver) { fechar(); S.aba = 'oportunidades'; S.q.oportunidades = (S.leads[d.opver] || {}).nome || ''; try { sessionStorage.setItem('painel.aba', S.aba); } catch (e) {} render(); window.scrollTo(0, 0); return; }
  if (d.opof) { const [lid, iid] = d.opof.split('|'); opMarca(lid, iid, 'ofertado', 'WhatsApp'); return; }
  if (d.opcopia) { const [lid, iid] = d.opcopia.split('|'); const l = S.leads[lid] || {}, it = ctxOp().porId.get(iid) || {}; const msg = OP.mensagem(l, it, (String(S.info.saudacao || '').trim() || S.info.corretor || '').split(' ')[0]);
    try { await navigator.clipboard.writeText(msg); } catch (e) { toast('Copie manualmente: ' + msg); }
    if (!digitos(l.telefone) || t.dataset.confirma) return opMarca(lid, iid, 'ofertado', 'mensagem copiada');
    t.dataset.confirma = '1'; t.textContent = 'Copiada · marcar ofertado'; toast('Mensagem copiada. Toque de novo para marcar como ofertado.'); return; }
  if (d.opdesc) { const [lid, iid] = d.opdesc.split('|'); return opMarca(lid, iid, 'descartado'); }
  if (d.opreabre) { const [lid, iid] = d.opreabre.split('|'); return opMarca(lid, iid, null); }
  if (d.oplado) { S.opLado = d.oplado === 'tem' ? 'tem' : 'procura'; return render(); }
  if (d.optem) { S.opTem = d.optem === 'todos' ? 'todos' : 'com'; S.opTemMais = false; return render(); }
  if (d.optemord) { const o = S.opTemOrd; S.opTemOrd = { k: d.optemord, d: o.k === d.optemord ? -o.d : -1 }; return render(); }
  if (d.optemmais) { S.opTemMais = !S.opTemMais; return render(); }
  if (d.coranun) { const lid = d.coranun, l = S.leads[lid] || {}, c = capDe(l) || {};
    if (pedidoCorAnun(lid)) { toast('Você já avisou a diretoria sobre este lead.'); return; }
    if (!t.dataset.confirma) { t.dataset.confirma = '1'; t.textContent = 'Confirmar: é corretor ou imobiliária'; toast('Toque de novo para confirmar.'); return; }
    const ok = await gravar(() => db.collection('solicitacoes').doc('s-' + Date.now().toString(36)).set({ tipo: 'corretor_anunciante', lead_painel: lid, capt_lead: c.lead_hub || '',
      ref: 'Corretor anunciante', obs: '', status: 'pendente', criado_em: agora(), enviado_em: agora(), corretor: S.info.slug || '' }), 'Aviso enviado. A diretoria registra o telefone na próxima entrega.');
    if (!ok) { delete t.dataset.confirma; t.textContent = '🏷️ É corretor ou imobiliária'; }
    return; }
  if (d.captpede) { const [lead, cli] = d.captpede.split('|');
    if (pedidoCapt(lead)) { toast('Você já pediu a captação deste imóvel.'); return; }
    if (captAprovada(lead)) { toast('A captação deste imóvel já foi aprovada: o proprietário chega em Meus leads na entrega das 7h43.'); return; }
    if (!t.dataset.confirma) { t.dataset.confirma = '1'; t.textContent = 'Confirmar: pedir à diretoria'; toast('Toque de novo para pedir à diretoria a captação deste imóvel.'); return; }
    const c = (S.capt || {})[lead] || {}, l = S.leads[cli] || {};
    const ok = await gravar(() => db.collection('solicitacoes').doc('s-' + Date.now().toString(36)).set({ tipo: 'captacao', capt_id: lead, ref: 'Captado · ' + (c.bairro || ''),
      imovel: [c.fin, c.tipo, c.bairro, c.dorm ? c.dorm + ' dorm.' : '', valCapt(c.fin, c.valor)].filter(Boolean).join(' · '), cliente_id: cli || '', cliente_nome: l.nome || '',
      obs: '', status: 'pendente', criado_em: agora(), enviado_em: agora(), corretor: S.info.slug || '' }), 'Pedido enviado à diretoria. O telefone do proprietário chega quando o lead for distribuído a você.');
    if (!ok) { delete t.dataset.confirma; t.textContent = '⚡ Captar este imóvel primeiro'; }
    return; }
  if (d.lead) { S.aba = 'leads'; render(); return abrir('lead', d.lead); }
  if (d.abre) { const [tp, id] = d.abre.split(/:(.*)/s); if (tp === 'tarefa') return abrir('tarefa', id); if (tp === 'sol') { const so = S.sol[id]; if (so && !S.ehDono && statusDe(id, so) === 'rascunho' && so.tipo !== 'alteracao') return continuar(id); return abrir('sol', id); } if (tp === 'emp') { S.empFicha = 'geral'; return abrir('emp', id); } if (tp === 'cons') return abrir('cons', id); if (tp === 'meu') return abrir('meu', id); return abrir(tp === 'lead' ? 'lead' : 'vit', id); }
  if (d.continuar) return continuar(d.continuar);
  if (d.fotosimv) { S.novo = novoRegistro('fotos', { imovel_id: d.fotosimv }); return abrir('fotosimv'); }
  if (d.ia) return gerarIA(d.ia);
  if (d.remfoto) { S.novo.fotos.splice(Number(d.remfoto), 1); S.novo.sujo = true; return atualizarArquivos(); }
  if (d.capa) { const [f] = S.novo.fotos.splice(Number(d.capa), 1); S.novo.fotos.unshift(f); S.novo.sujo = true; return atualizarArquivos(); }
  if (d.remdoc) { S.novo.docs.splice(Number(d.remdoc), 1); S.novo.sujo = true; return atualizarArquivos(); }
  if (d.decidir) { const [sid, stt] = d.decidir.split('|'); return decidir(sid, stt); }
  if (d.agenc) { abrir('meu', d.agenc, true); const t2 = document.getElementById('agTexto'); if (t2) { t2.scrollIntoView({ block: 'center' }); t2.focus({ preventScroll: true }); } return; }
  if (d.vermapa) { if (S.aberto) fechar(); S.pmFoco = d.vermapa; if (/^E:/.test(d.vermapa)) { S.pmEmp = true; MP_SIG = ''; } if (!S.meus[d.vermapa] && S.pmCam === 'meus') S.pmCam = 'todos'; S.aba = 'mapa'; try { sessionStorage.setItem('painel.aba', S.aba); } catch (e) {} render(); window.scrollTo(0, 0); return; }
  if (d.pmcam) { S.pmCam = d.pmcam; return pontosMapa(); }
  if (d.pmemp) { S.pmEmp = S.pmEmp === false; MP_SIG = ''; return pontosMapa(); }
  if (d.pmfin) { const o = Object.assign({}, S.pmFinOff); if (o[d.pmfin]) delete o[d.pmfin]; else o[d.pmfin] = 1; S.pmFinOff = o; MP_SIG = ''; return pontosMapa(); }
  if (d.pmsit) { const o = Object.assign({}, S.pmSitOff); if (o[d.pmsit]) delete o[d.pmsit]; else o[d.pmsit] = 1; S.pmSitOff = o; MP_SIG = ''; return pontosMapa(); }
  if (d.empsub) { S.empSub = d.empsub; return render(); }
  if (d.fesit !== undefined) { S.fe.sit = d.fesit; return render(); }
  if (d.empficha) { S.empFicha = d.empficha; return redesenharGaveta(); }
  if (d.pmver) { const id = d.pmver; if (S.meus[id]) { S.fm = S.fm || { fin: '', sit: '' }; S.q.imoveis = S.meus[id].ref; S.aba = 'imoveis'; render(); window.scrollTo(0, 0); return; } return abrir('vit', id); }
  if (d.conversa !== undefined) return abrir('conversa', d.conversa);
  if (d.voz !== undefined) return abrir('voz');
  if (t.id === 'cvAnalisar') return analisarConversa();
  if (t.id === 'ppSalvar') return salvarProposta();
  if (t.id === 'salvarPrazos') return salvarPrazos();
  if (d.inserirfalta) { const ta = document.getElementById('respDec'); const f = faltantes(S.sol[d.inserirfalta]); ta.value = (ta.value ? ta.value.trim() + '\n' : '') + 'Complete, por favor: ' + f.join('; ') + '.'; ta.focus(); return; }
  if (t.id === 'novoImovel') { S.novo = novoRegistro('novo_imovel', { dados: { cidade: 'Florianópolis' } }); return abrir('novoimv'); }
  if (t.id === 'salvarRasc') { const ok = await gravarNovo('rascunho'); if (ok) S.novo.sujo = false; return; }
  if (t.id === 'enviarNovo' || t.id === 'enviarFotos') {
    const e = document.getElementById('eNovo'); e.textContent = '';
    if (t.id === 'enviarFotos') { if (!(S.novo.fotos || []).length) { e.textContent = 'Escolha ao menos uma foto.'; return; } S.novo.obs = val('fotosObs'); }
    else { S.novo.faltantes = faltantes(S.novo); }
    const ok = await gravarNovo('pendente'); if (ok) { if ((S.novo.faltantes || []).length) toast(`Enviado para aprovação com ${S.novo.faltantes.length} itens faltando. A diretoria pode pedir o complemento.`); S.novo.sujo = false; fechar(); S.aba = 'solicitacoes'; try { sessionStorage.setItem('painel.aba', S.aba); } catch (er) {} render(); } return;
  }
  if (d.alterar) { if (!S.meus[d.alterar]) return abrir('alt', d.alterar); abrir('meu', d.alterar, true); const da = document.getElementById('detAlt'); if (da) { da.open = true; da.scrollIntoView({ block: 'start' }); const p1 = da.querySelector('input,select,textarea'); if (p1) p1.focus({ preventScroll: true }); } return; }
  if (d.copiar !== undefined) { try { await navigator.clipboard.writeText(d.copiar); toast('Copiado.'); } catch (e) { toast('Copie manualmente: ' + d.copiar); } return; }
  if (d.cancelar) { if (t.dataset.confirma) { await gravar(() => db.collection('solicitacoes').doc(d.cancelar).update({ status: 'cancelada', cancelada_em: agora() }), 'Solicitação cancelada.'); } else { t.dataset.confirma = '1'; t.textContent = 'Confirmar cancelamento'; } return; }
  if (t.id === 'novoLead') return abrir('novo');
  if (t.id === 'fvLimpar') { S.fv = { fin: '', tipo: '', bairro: '', dorm: '', vagas: '', vmin: '', vmax: '', m2min: '', m2max: '' }; S.q.pesquisa = ''; S.pagVit = 0; return render(); }
});
document.addEventListener('submit', (ev) => {
  ev.preventDefault();
  if (ev.target.id === 'fLead') salvarLead(ev.target);
  else if (ev.target.id === 'fHist') registrarHist(ev.target);
  else if (ev.target.id === 'fAlt') enviarAlteracao(ev.target);
  else if (ev.target.id === 'fAgenc') registrarAgenc(ev.target);
  else if (ev.target.id === 'fMeu') salvarCardImovel(ev.target);
  // fNovo não envia por Enter: os botões controlam
});
document.addEventListener('ms-change', (ev) => {   // vários bairros (26/10/2026)
  const d = ev.detail || {};
  if (d.id === 'fvBairro') { S.fv.bairro = d.valores.slice(); S.pagVit = 0; return render(); }
  if (d.id === 'feBairro') { S.fe.bairro = d.valores.slice(); return render(); }
});
document.addEventListener('change', (ev) => {
  const id = ev.target.id;
  if (id === 'lEtapa') { document.getElementById('wMotivo').hidden = ev.target.value !== 'Perdido'; document.getElementById('wFech').hidden = ev.target.value !== 'Fechado'; }
  const el = ev.target;
  if (S.novo && el.dataset && el.dataset.campo) { S.novo.dados[el.dataset.campo] = el.dataset.vlr != null ? (numVlr(el.value) ?? '') : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value.trim(); S.novo.sujo = true; agendarRascunho(); if (el.tagName === 'SELECT') return redesenharGaveta(); return atualizarArquivos(); }
  if (S.novo && el.dataset && el.dataset.multi) { const k = el.dataset.multi; S.novo.dados[k] = [...document.querySelectorAll(`[data-multi="${k}"]:checked`)].map((x) => x.value); S.novo.sujo = true; agendarRascunho(); return atualizarArquivos(); }
  if (el.id === 'ppAlvo') return ajustarProposta();
  if (el.id === 'upFotos' && el.files.length) { const fs = [...el.files]; el.value = ''; return enviarArquivos(fs, 'fotos'); }
  if (el.id === 'camFotos' && el.files.length) { const fs = [...el.files]; el.value = ''; return enviarArquivos(fs, 'fotos'); }
  if (el.id === 'upDocs' && el.files.length) { const fs = [...el.files]; el.value = ''; return enviarArquivos(fs, 'docs', val('tipoDoc')); }
  const fe = { feCons: 'cons', feBairro: 'bairro', feRevEmp: 'revEmp' };
  if (fe[id]) { S.fe[fe[id]] = ev.target.value; return render(); }
  if (id === 'feDisp' || id === 'feMat') { S.fe[id === 'feDisp' ? 'disp' : 'mat'] = ev.target.checked; return render(); }
  const mapa = { fvFin: 'fin', fvTipo: 'tipo', fvBairro: 'bairro', fvDorm: 'dorm', fvVagas: 'vagas', fvMin: 'vmin', fvMax: 'vmax', fvM2Min: 'm2min', fvM2Max: 'm2max' };
  if (mapa[id]) { S.fv[mapa[id]] = ev.target.dataset.vlr != null ? (numVlr(ev.target.value) ?? '') : ev.target.value; S.pagVit = 0; render(); }
});
document.addEventListener('input', (ev) => {   // valor pontuado (Nicolas, 26/10/2026)
  const el = ev.target; if (!el || !el.dataset || el.dataset.vlr == null) return;
  const v = el.value, pos = el.selectionStart ?? v.length, antes = v.slice(0, pos).replace(/[^\d,]/g, '').length;
  let [i, d] = v.replace(/[^\d,]/g, '').split(/,(.*)/s); i = (i || '').replace(/^0+(?=\d)/, ''); d = d == null ? null : d.replace(/,/g, '').slice(0, 2);
  const novo = (i ? Number(i).toLocaleString('pt-BR') : (d != null ? '0' : '')) + (d != null ? ',' + d : '');
  if (novo === v) return; el.value = novo;
  let n = 0, k = 0; while (k < novo.length && n < antes) { if (/[\d,]/.test(novo[k])) n++; k++; }
  try { el.setSelectionRange(k, k); } catch (e) {}
});
let tBusca;
document.addEventListener('input', (ev) => {
  if (ev.target.id !== 'qAba') return;
  clearTimeout(tBusca);
  tBusca = setTimeout(() => { S.q[S.aba] = ev.target.value; if (S.aba === 'pesquisa') S.pagVit = 0; if (S.aba === 'mapa') { MP_SIG = ''; pontosMapa(); pintaBarra(); return; } render(); }, 220);
});
document.addEventListener('keydown', (ev) => { if (ev.target.id === 'qAba' && ev.key === 'Escape') { ev.target.value = ''; S.q[S.aba] = ''; render(); if (S.aba === 'mapa') { MP_SIG = ''; pontosMapa(); } } });
let tRasc;
function agendarRascunho() { clearTimeout(tRasc); tRasc = setTimeout(() => { if (S.novo && S.novo.sujo && S.novo.tipo === 'novo_imovel' && S.novo.status_atual !== 'complemento') gravarNovo('rascunho', true).then((ok) => { if (ok && S.novo) S.novo.sujo = false; }); }, 4000); }
function continuar(id) { const so = S.sol[id]; if (!so) return; S.novo = { ...JSON.parse(JSON.stringify(so)), id, status_atual: statusDe(id, so) }; return abrir(so.tipo === 'fotos' ? 'fotosimv' : 'novoimv'); }
document.addEventListener('input', (ev) => { if (S.novo && ev.target.id === 'c_descricao') { S.novo.descricao = ev.target.value; S.novo.descricao_origem = S.novo.descricao_origem === 'ia' ? 'ia_editada' : S.novo.descricao_origem || 'corretor'; S.novo.sujo = true; agendarRascunho(); } });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && S.aberto) fechar(); });

// ---------- Banco ----------
render();
(async () => {
  try { db = await window.claude?.use?.('db'); } catch (e) { db = null; }
  S.dbEstado = db ? 'ok' : 'sem';
  if (!db) { render(); return; }
  const erro = () => { toast('A conexão com os dados caiu. Recarregue a página.'); };
  const col = (nome, alvo) => db.collection(nome).onSnapshot((snap) => {
    const o = {}; snap.docs.forEach((d) => { if (d.exists) o[d.id] = d.data(); });
    if (S.gestor && G_ALVOS.has(alvo)) { S.prontos.add(alvo); return render(); }
    S[alvo] = o; S.prontos.add(alvo); render();
    if (alvo === 'leads' && S.aberto && S.aberto.tipo === 'lead' && S.leads[S.aberto.id]) { const hl = document.getElementById('histLista'); if (hl) hl.innerHTML = htmlHist(S.leads[S.aberto.id]); }
  }, erro);
  col('leads', 'leads'); col('meus_imoveis', 'meus'); col('catalogo', 'catalogo'); col('solicitacoes', 'sol'); col('decisoes', 'decisoes'); col('eventos_agenciamento', 'eventos'); col('empreendimentos', 'empDocs'); col('fotos', 'fotosDocs'); col('demandas', 'dem'); col('demandas_pedidos', 'demPed'); col('equipe_cartoes', 'eqc'); col('captados', 'capt'); col('tarefas', 'tarefas'); col('atribuicoes', 'atrib');
  db.doc('controle/prazos').onSnapshot((d) => { S.prazos = d.exists ? d.data() : {}; render(); }, erro);
  db.doc('acaptar/estado').onSnapshot((d) => { S.acapProprio = d.exists ? d.data() : null; S.acap = S.acapProprio || acapDaFoto(); render(); }, () => {});
  (async () => { let u = null; try { u = await window.claude.use('user'); S.ehDono = u ? await u.isOwner() : false; S.uid = u ? await u.id() : null; } catch (e) { S.ehDono = !!S.ehDono; } render();
    if (!S.uid) return;
    db.doc(`data/users/${S.uid}/preferencias`).onSnapshot((d) => {
      S.prefs = d.exists ? { ...d.data() } : {};
      const v = Array.isArray(S.prefs.abas) && S.prefs.abas.length ? [...S.prefs.abas] : null;
      if (!d.exists && S.ordemAbas) return; // ainda não foi guardada na conta: fica a do aparelho
      if (v === S.ordemAbas || ReordAbas.igual(v, S.ordemAbas)) return;
      S.ordemAbas = v; ordLocal(v); render();
    }, () => {});
  })();
  (async () => { try { S.assets = await window.claude.use('assets'); } catch (e) { S.assets = null; } })();
  (async () => { try { S.ia = await window.claude.use('sample'); const lim = S.ia ? await S.ia.limits().catch(() => null) : null; S.iaImagens = lim && lim.images ? lim.images : null; } catch (e) { S.ia = null; } })();
  db.collection('galeria').onSnapshot((snap) => { /* FICHA-IMOVEL-GALERIA */ const m = {}; let cdn = ''; snap.docs.forEach((d) => { if (!d.exists) return; const x = d.data() || {}; if (x.cdn) cdn = x.cdn; Object.assign(m, x.i || {}); }); S.galeria = m; S.galCdn = cdn; render(); }, () => {});
  db.collection('vitrine').onSnapshot((snap) => {
    S.vitrine = snap.docs.filter((d) => d.exists).flatMap((d) => d.data().itens || []); S.prontos.add('vitrine'); render();
  }, erro);
  db.doc('controle/info').onSnapshot((d) => { S.info = d.exists ? d.data() : {}; render(); }, erro);
  db.doc('config/painel').onSnapshot((d) => { if (d.exists && (d.data() || {}).papel === 'gestor' && !S.gestor) ligarGestor(); }, () => {});
  setTimeout(() => { if (!S.prontos.size) { S.prontos.add('leads'); render(); } }, 10000);
})();
window.VZ_CFG={ ids:['qAba'], idAbas:'qAba',
  abas:ABAS.map(([k,n])=>[k,n+' ('+(ROT_ABA_Q[k]||'')+')']),
  contexto:()=>({ onde:'aba "'+((ABAS.find(a=>a[0]===S.aba)||[])[1]||S.aba)+'" do painel do corretor, que lista '+(ROT_ABA_Q[S.aba]||''), aba:S.aba }),
  aplica:(id,q,ab)=>{ if(ab&&ab!==S.aba){ S.aba=ab; try{ sessionStorage.setItem('painel.aba',S.aba); }catch(e){} S.q[ab]=q; if(ab==='pesquisa') S.pagVit=0; render(); if(ab==='mapa'){ MP_SIG=''; pontosMapa(); } const iq=document.getElementById(id); if(iq) iq.value=q; window.scrollTo(0,0); return; }
    const i=document.getElementById(id); if(!i) return; i.value=q; i.dispatchEvent(new Event('input',{bubbles:true})); } };
/* ---------- busca por voz e com IA (30/10/2026, pedido do Cleiton) ----------
   Em cada barra de busca listada em VZ_CFG.ids entram dois botões: 🎤 (falar) e ✨ IA (entender a frase).
   O microfone usa o reconhecimento de voz do navegador; onde a página não tem o microfone liberado,
   cai no ditado do teclado (🎤 do teclado no celular, Win + H no Windows) e o ✨ IA converte o texto ditado.
   A IA só traduz a frase para a sintaxe de busca que a página já entende (termos separados por vírgula). */
(() => {
  const CFG = window.VZ_CFG || { ids: [] };
  let IA, ouvindo = null, tAviso = null, pend = 0;
  const movel = (() => { try { return matchMedia('(pointer:coarse)').matches; } catch (e) { return false; } })();
  const hoje = () => { const d = new Date(); return d.toLocaleDateString('pt-BR'); };
  const amanha = () => { const d = new Date(Date.now() + 864e5); return d.toLocaleDateString('pt-BR'); };
  function aviso(txt, ms) {
    let a = document.getElementById('vz-aviso');
    if (!a) { a = document.createElement('div'); a.id = 'vz-aviso'; a.setAttribute('role', 'status'); a.setAttribute('aria-live', 'polite'); document.body.appendChild(a); }
    a.textContent = txt; a.classList.add('visivel'); clearTimeout(tAviso);
    if (ms !== 0) tAviso = setTimeout(() => a.classList.remove('visivel'), ms || 5000);
  }
  function grupo(id) {
    const g = document.createElement('span'); g.className = 'vz'; g.dataset.vzPara = id;
    g.innerHTML = '<button type="button" class="vz-b" data-vz-mic aria-label="Buscar falando" title="Buscar falando">🎤</button>'
      + '<button type="button" class="vz-b vz-ia" data-vz-ia aria-label="Buscar com IA: entender a frase e montar a busca" title="Entender a frase e montar a busca">✨ IA</button>';
    return g;
  }
  function anexa() {
    (CFG.ids || []).forEach((id) => {
      const i = document.getElementById(id); if (!i) return;
      const n = i.nextElementSibling; if (n && n.classList && n.classList.contains('vz')) return;
      i.after(grupo(id));
    });
  }
  function marca(id, on) { document.querySelectorAll('.vz[data-vz-para="' + id + '"] [data-vz-mic]').forEach((b) => { b.classList.toggle('ouvindo', !!on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
  function dica(id) {
    const i = document.getElementById(id);
    MODO[id] = true;
    if (i) { try { i.focus(); i.select(); } catch (e) {} }
    aviso(movel ? 'Toque no 🎤 do teclado, fale o que procura e depois em Buscar (ou ✨ IA).'
      : 'Dite com Win + H (Windows) ou digite a frase e tecle Enter (ou ✨ IA).', 12000);
  }
  // celular: a página não tem o microfone liberado, então o 🎤 abre o teclado para o ditado dele;
  // depois de falar, o "Buscar"/Enter do teclado (ou o ✨ IA) manda a frase para a IA.
  const MODO = {};
  function ouvir(id) {
    if (ouvindo) { try { ouvindo.stop(); } catch (e) {} return; }
    if (movel) return dica(id);
    const C = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!C) return dica(id);
    let r; try { r = new C(); } catch (e) { return dica(id); }
    r.lang = 'pt-BR'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
    let fala = '', erro = '';
    r.onresult = (e) => { let t = ''; for (const x of e.results) t += x[0].transcript; fala = t; const el = document.getElementById(id); if (el) el.value = t; aviso('🎤 ' + t, 0); };
    r.onerror = (e) => { erro = (e && e.error) || 'erro'; };
    r.onend = () => { ouvindo = null; marca(id, false);
      if (fala.trim()) return entender(id, fala);
      if (erro && erro !== 'no-speech' && erro !== 'aborted') return dica(id);
      aviso('Não ouvi nada. Toque no 🎤 e fale de novo.'); };
    try { r.start(); ouvindo = r; marca(id, true); aviso('Ouvindo… fale o que procura.', 0); } catch (e) { ouvindo = null; dica(id); }
  }
  const SINTAXE = 'Sintaxe da busca: termos separados por vírgula; aparece o que atende a pelo menos um termo, primeiro o que atende mais. '
    + 'Cada termo é procurado no texto da lista e nos dados das pessoas: nome, telefone, CPF, e-mail, código ou referência (A8, AP346), bairro, rua, empreendimento, '
    + 'construtora, tipo (casa, apartamento, terreno, sala), item (piscina, churrasqueira, mobiliado, vista mar), situação, etapa ou origem, data no formato dd/mm/aaaa. '
    + 'Valores: "1,5 mi", "800 mil", "R$ 950.000" (pega 20% para mais e para menos). Dormitórios: "3 dorm"; suítes: "1 suíte"; garagem: "2 vagas".';
  function prompt(id, texto) {
    const c = (CFG.contexto && CFG.contexto(id)) || {};
    const abas = (CFG.abas && id === CFG.idAbas) ? CFG.abas : null;
    return 'Você converte o pedido de busca de um corretor de imóveis (dito em voz alta ou digitado) nos termos de busca de um painel da Vivere Imóveis, em Florianópolis.\n'
      + 'Hoje é ' + hoje() + ' (amanhã: ' + amanha() + ').\n'
      + 'Onde a busca vai rodar: ' + (c.onde || 'lista da página') + '.\n'
      + (c.sintaxe || SINTAXE) + '\n'
      + 'Regras: tire verbos e palavras de ligação ("quero", "procuro", "me mostra", "com", "no", "de"); quartos ou dormitórios viram "N dorm"; '
      + '"até", "por volta de" ou "na faixa de" um valor viram o próprio valor; "hoje" e "amanhã" viram a data; corrija erros comuns do reconhecimento de voz em nomes de bairros de Florianópolis '
      + '(Campeche, Rio Tavares, Itacorubi, Córrego Grande, Trindade, Jurerê, Ingleses, Santo Antônio de Lisboa, Coqueiros, Estreito, Lagoa da Conceição, Saco Grande, João Paulo); '
      + 'no máximo 6 termos; nunca invente nome, telefone ou código que não foi dito.\n'
      + (abas ? 'Abas do painel (id: o que mostra): ' + abas.map((a) => a[0] + ': ' + a[1]).join('; ') + '. Aba atual: ' + (c.aba || '') + '. Se o pedido for claramente de outra aba (ex.: "leads para ligar hoje" → leads; "apartamento de 2 quartos no Campeche" → pesquisa), devolva o id dela em "aba"; senão, "".\n' : '')
      + 'Responda só com JSON: {"aba": "id ou vazio", "q": "termos separados por vírgula", "resumo": "frase curta dizendo o que vai ser buscado"}.\n'
      + 'Pedido: "' + String(texto).replace(/"/g, "'").slice(0, 400) + '"';
  }
  function aplicaPadrao(id, q) {
    const i = document.getElementById(id); if (!i) return;
    i.value = q; i.dispatchEvent(new Event('input', { bubbles: true }));
  }
  async function entender(id, texto) {
    const i = document.getElementById(id);
    texto = String(texto || (i && i.value) || '').trim();
    if (!texto) { if (i) { try { i.focus(); } catch (e) {} } return aviso('Escreva ou dite a frase e toque em ✨ IA.'); }
    if (IA === undefined) { try { IA = window.claude && window.claude.use ? await window.claude.use('sample') : null; } catch (e) { IA = null; } }
    const aplica = CFG.aplica || ((x, q) => aplicaPadrao(x, q));
    if (!IA) { aplica(id, texto, ''); return aviso('A IA não está liberada nesta visualização; busquei o texto como foi dito.', 7000); }
    aviso('✨ Entendendo a busca…', 0);
    document.querySelectorAll('.vz[data-vz-para="' + id + '"] [data-vz-ia]').forEach((b) => { b.disabled = true; });
    try {
      const r = await IA.json(prompt(id, texto), { modelTier: 'quick' });
      const q = String((r && r.q) || '').trim() || texto;
      const ab = (CFG.abas && r && r.aba && CFG.abas.some((a) => a[0] === r.aba)) ? r.aba : '';
      aplica(id, q, ab);
      aviso('✨ ' + ((r && r.resumo) ? r.resumo + ' — ' : '') + 'busca: ' + q, 8000);
    } catch (e) {
      aplica(id, texto, '');
      aviso(e && e.code === 'rate_limited' ? 'A IA está ocupada agora; busquei o texto como foi dito.'
        : e && e.code === 'not_granted' ? 'A IA não foi liberada nesta página; busquei o texto como foi dito.'
        : 'Não consegui usar a IA; busquei o texto como foi dito.', 7000);
    } finally {
      document.querySelectorAll('.vz [data-vz-ia]').forEach((b) => { b.disabled = false; });
    }
  }
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('.vz [data-vz-mic], .vz [data-vz-ia]'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    const id = b.closest('.vz').dataset.vzPara;
    if (b.hasAttribute('data-vz-mic')) ouvir(id); else { MODO[id] = false; entender(id); }
  }, true);
  // no modo voz, o Enter/"Buscar" do teclado manda a frase para a IA (antes dos atalhos da própria página)
  document.addEventListener('keydown', (ev) => {
    const id = ev.target && ev.target.id; if (!id || !MODO[id] || ev.key !== 'Enter') return;
    ev.preventDefault(); ev.stopPropagation(); MODO[id] = false;
    try { ev.target.blur(); } catch (e) {}
    entender(id);
  }, true);
  document.addEventListener('focusout', (ev) => { const id = ev.target && ev.target.id; if (id && MODO[id]) setTimeout(() => { if (document.activeElement !== ev.target) MODO[id] = false; }, 400); }, true);
  const obs = new MutationObserver(() => { if (pend) return; pend = 1; requestAnimationFrame(() => { pend = 0; anexa(); }); });
  const liga = () => { anexa(); obs.observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
  window.VZ = { entender, ouvir };
})();

/* ---------- grades de cards em linhas cheias (30/10/2026, pedido do Cleiton) ----------
   Mesma regra dos menus (MenusCheios): nenhum grupo de cards deixa espaço vazio no fim da linha.
   Para toda grade de colunas iguais dentro de #conteudo: mede quantas colunas cabem na largura atual,
   reparte os cards em linhas com quantidades que diferem no máximo em 1 (as linhas maiores primeiro)
   e faz cada card da linha ocupar a fração certa (grade fina com o MMC das duas quantidades). */
(() => {
  if (window.GradesCheias) return;
  const RAIZ = '#conteudo';
  const CARDS = '.kpis, .grade, .resumo-cob, .crm-cors, .op-ofs, .org-ramos, .rel-ctl, .va, .cartoes, .fatos, .fatos-emp, .pp-grade';
  const IGNORA = '.form, .fotos, .tabela, table, .mapa, .vk, [data-sem-cheio]';
  const mdc = (a, b) => (b ? mdc(b, a % b) : a);
  const mmc = (a, b) => (a * b) / mdc(a, b);
  const visiveis = (g) => [...g.children].filter((k) => !k.hidden && getComputedStyle(k).display !== 'none' && getComputedStyle(k).position !== 'absolute');
  function limpa(g) {
    if (!g._gcOn) return;
    g.style.removeProperty('grid-template-columns');
    [...g.children].forEach((k) => { if (k._gcSpan) { k.style.removeProperty('grid-column'); k._gcSpan = 0; } });
    g._gcOn = false;
  }
  function trilhas(g) {
    const t = getComputedStyle(g).gridTemplateColumns;
    if (!t || t === 'none') return null;
    const L = t.split(' ').map(parseFloat).filter((x) => x > 0);
    if (L.length < 2) return null;
    const min = Math.min(...L), max = Math.max(...L);
    return max - min <= 1.5 ? L.length : null; // só colunas iguais (cards), nunca linhas de tabela/listas com colunas fixas
  }
  function equilibra(g) {
    limpa(g);
    if (g.closest(IGNORA) || g.matches(IGNORA)) return;
    const ks = visiveis(g);
    if (ks.length < 2) return;
    if (ks.some((k) => { const c = k.style.gridColumn || getComputedStyle(k).gridColumnEnd; return c && c !== 'auto'; })) return;
    const cols = trilhas(g); if (!cols) return;
    const n = ks.length;
    if (n % cols === 0) return;               // já fecha em linhas cheias
    const linhas = Math.ceil(n / cols);
    const base = Math.floor(n / linhas), extra = n % linhas; // `extra` linhas com base+1, o resto com base
    const L = extra ? mmc(base, base + 1) : base;
    if (L > 60) return;
    g.style.setProperty('grid-template-columns', `repeat(${L}, minmax(0, 1fr))`);
    let i = 0;
    for (let l = 0; l < linhas; l++) {
      const m = base + (l < extra ? 1 : 0), sp = L / m;
      for (let j = 0; j < m; j++, i++) { ks[i].style.setProperty('grid-column', `span ${sp}`); ks[i]._gcSpan = sp; }
    }
    g._gcOn = true;
  }
  let pedido = 0, obs;
  function roda() {
    pedido = 0;
    const raiz = document.querySelector(RAIZ); if (!raiz) return;
    // só os blocos de cards conhecidos (varrer todos os elementos com getComputedStyle travava páginas grandes)
    const gs = [...raiz.querySelectorAll(CARDS)].filter((el) => el.children.length >= 2 && el.children.length <= 40 && getComputedStyle(el).display === 'grid');
    gs.forEach((g) => { try { equilibra(g); } catch (e) {} });
    if (obs) obs.takeRecords();
  }
  function agenda() { if (!pedido) pedido = requestAnimationFrame(roda); }
  obs = new MutationObserver(agenda);
  const liga = () => { obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }); agenda(); };
  addEventListener('resize', agenda);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(agenda);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
  window.GradesCheias = { atualiza: agenda };
})();

/* ---------- tabela vira cartões quando não cabe (31/10/2026, pedido do Cleiton) ----------
   Antes: acima de 700px a lista era sempre tabela e, numa janela média, as colunas da direita ficavam escondidas
   na rolagem lateral e a foto encolhia. Agora cada tabela que tem versão em cartões (.tem-cm) mede a largura de que
   precisa; se a área não comporta a tabela inteira, mostra os cartões (foto grande, todos os dados e "Ordenar por"). */
(() => {
  if (window.TabelaCartao) return;
  /* 02/11/2026, padrão do HUB v176 (pedido do Cleiton): cartão só com a janela menor que metade da tela (ou até 760 px);
     acima disso, lista; lista que não cabe quebra entre palavras (ta-ajusta); se nem assim couber, cartão. */
  let pedido = 0, obs;
  /* 08/11/2026 (pedido do Cleiton): lista sempre que a janela tiver 45% da largura da tela ou mais; cartão médio só abaixo
     disso; cartão pequeno só no celular (até 700 px, pelo CSS). A lista que não cabe se ajusta (quebra entre palavras e,
     se preciso, fica compacta) e, no limite, rola de lado — não vira cartão por falta de espaço. */
  const estreito = () => !!(screen && screen.width > 0) && (innerWidth < screen.width * 0.45 || (screen.width < 1280 && innerWidth < 1024));
  function roda() {
    pedido = 0;
    document.querySelectorAll('.tabela.tem-cm').forEach((t) => {
      const pai = t.parentElement; if (!pai || !pai.querySelector(':scope > .lista-m')) return;
      if (matchMedia('(max-width:700px)').matches) { pai.classList.remove('modo-cartao'); t.classList.remove('ta-ajusta', 'ta-compacta'); return; }
      const tab = t.querySelector('table'); if (!tab) return;
      if (estreito()) { t.classList.remove('ta-ajusta', 'ta-compacta'); pai.classList.add('modo-cartao'); return; }
      pai.classList.remove('modo-cartao'); t.classList.remove('ta-ajusta', 'ta-compacta');
      if (tab.scrollWidth <= t.clientWidth + 2) return;
      t.classList.add('ta-ajusta');
      if (tab.scrollWidth > t.clientWidth + 2) t.classList.add('ta-compacta');
      if (tab.scrollWidth > t.clientWidth + 2) { t.classList.remove('ta-ajusta', 'ta-compacta'); pai.classList.add('modo-cartao'); }
    });
    if (obs) obs.takeRecords();
  }
  function agenda() { if (!pedido) pedido = requestAnimationFrame(roda); }
  obs = new MutationObserver(agenda);
  const liga = () => { obs.observe(document.body, { childList: true, subtree: true }); agenda(); };
  addEventListener('resize', agenda);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(agenda);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
  window.TabelaCartao = { atualiza: agenda };
})();

})();

} catch (e) { setTimeout(function () { throw e; }); }
/* ===== painel:fim ===== */

/* ===== menus-cheios:inicio ===== */
try {

/* menus em linhas cheias (26/10/2026, padrão de todo o HUB e dos painéis): todo grupo de botões de menu (abas, subabas, filtros em botões, chips, "ordenar por")
   ocupa a linha inteira, sem espaço livre no fim; se não cabe numa linha, reparte em linhas com o mesmo número de botões (diferença de no máximo 1) */
(function(){
  if (window.MenusCheios) return;
  const SEL = 'nav.abas, nav.sub, .abas, .filtros, .chips, .ordenar-movel, [role="group"]';
  const eBotao = (el) => el.tagName === 'BUTTON' || (el.tagName === 'A' && el.classList.contains('btn'));
  const filhos = (c) => [...c.children].filter((k) => !k.classList.contains('quebra-menu'));
  function elegivel(c) {
    if (c.hidden || c.closest('.ord-fantasma')) return false;
    const ks = filhos(c), bs = ks.filter(eBotao);
    if (bs.length < 2 || c.querySelector('input,select,textarea')) return false;
    if (ks.some((k) => !eBotao(k) && !/^(SPAN|B|LABEL|SMALL|STRONG|EM)$/.test(k.tagName))) return false;
    const cs = getComputedStyle(c);
    return /flex/.test(cs.display) && cs.flexWrap !== 'nowrap';
  }
  function equilibra(c) {
    if (!c.classList.contains('menu-cheio')) {
      const rg = parseFloat(getComputedStyle(c).rowGap) || 0;
      c.style.setProperty('--rg', rg + 'px'); c.classList.add('menu-cheio');
    }
    const W = c.clientWidth - (parseFloat(getComputedStyle(c).paddingLeft) || 0) - (parseFloat(getComputedStyle(c).paddingRight) || 0);
    if (W <= 0) return;
    const ks = filhos(c);
    const sig = W + '|' + (document.fonts ? document.fonts.status : '') + '|' + ks.map((k) => k.tagName + k.textContent).join('¦');
    if (c._sigMenu === sig && c.querySelector(':scope>.quebra-menu') !== null === !!c._temQuebra) return;
    c.querySelectorAll(':scope>.quebra-menu').forEach((q) => q.remove());
    const gap = parseFloat(getComputedStyle(c).columnGap) || 0;
    c.classList.add('medindo');
    const w = ks.map((b) => { const r = b.getBoundingClientRect(), m = getComputedStyle(b); return r.width + (parseFloat(m.marginLeft) || 0) + (parseFloat(m.marginRight) || 0); });
    c.classList.remove('medindo');
    const n = ks.length; let ini = [];
    for (let r = 1; r <= n; r++) {
      const base = Math.floor(n / r), sobra = n % r, cortes = []; let i = 0, cabe = true;
      for (let l = 0; l < r && cabe; l++) { const f = i + base + (l < sobra ? 1 : 0); let s = gap * (f - i - 1); for (let j = i; j < f; j++) s += w[j]; if (s > W + 0.5) cabe = false; if (l) cortes.push(i); i = f; }
      if (cabe || r === n) { ini = cortes; break; }
    }
    ini.forEach((i) => { const q = document.createElement('span'); q.className = 'quebra-menu'; q.setAttribute('aria-hidden', 'true'); c.insertBefore(q, ks[i]); });
    c._temQuebra = ini.length > 0; c._sigMenu = sig;
  }
  let pedido = 0, obs;
  function roda() {
    pedido = 0;
    if (window.ReordAbas && ReordAbas.ativo()) { agenda(); return; }
    document.querySelectorAll(SEL).forEach((c) => { try { if (elegivel(c)) equilibra(c); } catch (_) {} });
    if (obs) obs.takeRecords(); // descarta as mudanças feitas aqui mesmo (as quebras)
  }
  function agenda() { if (!pedido) pedido = requestAnimationFrame(roda); }
  obs = new MutationObserver(agenda);
  obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
  addEventListener('resize', agenda);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(agenda);
  window.MenusCheios = { atualiza: agenda };
  agenda();
})();

} catch (e) { setTimeout(function () { throw e; }); }
/* ===== menus-cheios:fim ===== */

// cabeçalho compacto no celular (02/11/2026, diagnóstico de bugs): até 700 px o topo deixa de ser fixo (ocupava 41% da tela a 390 px);
// ao rolar para baixo aparece uma barra mínima fixa com a aba atual e o botão que volta ao menu
(function () {
  const topo = document.querySelector('header.topo'); if (!topo || !('IntersectionObserver' in window) || document.querySelector('.topo-mini')) return;
  const mini = document.createElement('div'); mini.className = 'topo-mini'; mini.setAttribute('aria-hidden', 'true');
  mini.innerHTML = '<span class="tm-aba"></span><button type="button" class="tm-bt" aria-label="Voltar ao menu de abas">Abas ↑</button>';
  document.body.appendChild(mini);
  try { pintaBtnAcap(); } catch (e) {}
  const abaAtual = () => { const b = document.querySelector('#abas button[aria-selected="true"]'); if (!b) return ''; const t = [...b.childNodes].filter((x) => x.nodeType === 3).map((x) => x.nodeValue).join(' ').trim(); return t || (b.textContent || '').trim(); };
  new IntersectionObserver(([e]) => { const mostra = !e.isIntersecting; mini.classList.toggle('vis', mostra); mini.setAttribute('aria-hidden', String(!mostra)); if (mostra) mini.querySelector('.tm-aba').textContent = abaAtual(); }, { threshold: 0 }).observe(topo);
  mini.querySelector('.tm-bt').addEventListener('click', () => { const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches; window.scrollTo({ top: 0, behavior: calmo ? 'auto' : 'smooth' }); const a = document.querySelector('#abas button[aria-selected="true"]'); if (a) a.focus({ preventScroll: true }); });
})();
try { (function () { if (document.getElementById('css-ofertas-claras')) return; const s = document.createElement('style'); s.id = 'css-ofertas-claras'; s.textContent = '.selo-cap,.selo-nao{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.03em;line-height:1.5;padding:1px 8px;border-radius:999px;white-space:nowrap}.selo-cap{color:var(--ok);background:color-mix(in srgb,var(--ok) 14%,transparent);border:1px solid color-mix(in srgb,var(--ok) 45%,transparent)}.selo-nao{color:var(--warn);background:color-mix(in srgb,var(--warn) 14%,transparent);border:1px solid color-mix(in srgb,var(--warn) 45%,transparent)}.op-of.cap{border-left:4px solid var(--ok)}.op-of .selo-cap{justify-self:start}.op-bt{font-size:12px;font-weight:700;letter-spacing:.03em;margin:4px 0 -2px}.op-bt.cap{color:var(--ok)}.op-bt.nao{color:var(--warn)}.op-leg{display:grid;gap:6px;font-size:13px;line-height:1.5;border:1px solid var(--line);border-radius:8px;padding:9px 12px;margin:6px 0 10px}.op-leg .selo-cap,.op-leg .selo-nao{margin-right:4px}.op-como{font-size:12px;margin:0 0 8px}.op-como summary{cursor:pointer}@media(max-width:760px){.op-l2{display:none}}'; document.head.appendChild(s); })(); } catch (e) { setTimeout(() => { throw e; }); }
