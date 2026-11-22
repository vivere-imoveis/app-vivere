
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
nav[data-ord] button.ord-arrastando{opacity:.3;outline:2px dashed var(--brass,#765f3c);outline-offset:-3px;border-radius:6px}
html.ord-agarrando,html.ord-agarrando *{cursor:grabbing!important}
.ord-fantasma{position:fixed;z-index:1000;pointer-events:none;transform:translate(-50%,-70%) scale(1.06);background:var(--panel,#fff);color:var(--ink,#1d2840);border:1px solid var(--brass,#765f3c);border-radius:8px;box-shadow:0 8px 22px rgba(0,0,0,.28);white-space:nowrap;margin:0}
nav[data-ord] .ord-reset{all:unset;box-sizing:border-box;flex:none!important;margin:4px 0 4px auto;align-self:center;border:1px solid var(--brass,#765f3c);border-radius:999px;padding:4px 11px;font-family:inherit;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;line-height:1.4;color:var(--ink,#1d2840);background:var(--panel,#fff);cursor:pointer;white-space:nowrap;opacity:1}
nav[data-ord] .ord-reset:focus-visible{outline:2px solid var(--brass,#765f3c);outline-offset:2px}
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
