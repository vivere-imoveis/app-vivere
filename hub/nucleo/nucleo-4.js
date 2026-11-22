
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
