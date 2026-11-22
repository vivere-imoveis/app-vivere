/* Entrada suave do app (21/11/2026, tarefa vis-app-carregamento-transicoes F2). Par do entrada.css.
   Enquanto não for o padrão: ?entrada=1 liga neste aparelho (fica guardado) e ?entrada=0 desliga.
   - Esqueleto: o "Carregando…" do #conteudo vira cartões vazios com um fio de latão passando.
   - Cascata: na 1ª tela com dados, ao trocar de aba e ao trocar o "Ver como", os blocos visíveis entram em ordem de leitura
     (de cima para baixo, da esquerda para a direita), no máximo 24, 38 ms um do outro. Atualização na mesma tela não anima.
   - Números: o valor inteiro dos cartões conta até o número em 0,5 s.
   - Nada atrasa o clique (só opacidade e posição) e "reduzir movimento" do aparelho desliga tudo. */
(function () {
  'use strict';
  var CHAVE = 'vivere.entrada';
  try {
    var q = /[?&]entrada=([01])\b/.exec(location.search);
    if (q) { if (q[1] === '1') localStorage.setItem(CHAVE, '1'); else localStorage.removeItem(CHAVE); }
    if (localStorage.getItem(CHAVE) !== '1') return;
  } catch (e) { return; }
  var calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('ent-on');

  var FOLHAS = '.cartao, .aviso, tbody > tr, .cl-card, .op-of, .dm-card, li.item, .tf-item';
  var ESQ = '<span class="e-tit"></span><span class="e-cards"><i></i><i></i><i></i><i></i></span><span class="e-bloco"></span><span class="e-bloco b2"></span>';
  var ultima = null, teveDados = false;

  function assinatura() {
    var a = document.querySelector('#abas [aria-selected="true"], [role="tablist"] [aria-selected="true"], [aria-current="page"]');
    var v = document.querySelector('select[data-versel]'), vb = document.querySelector('[data-ver][aria-pressed="true"]');
    return (a ? a.textContent.trim().split('\n')[0] : '') + '|' + (v ? v.value : vb ? vb.getAttribute('data-ver') : '') + '|' + location.pathname + location.search;
  }
  function carregando(el) {
    return [].filter.call(el.querySelectorAll('.vazio'), function (v) { return v.classList.contains('ent-esq') || /Carregando/i.test(v.textContent); });
  }
  function esqueleto(v) {
    if (v.classList.contains('ent-esq')) return;
    v.classList.add('ent-esq'); v.setAttribute('aria-label', v.textContent.trim()); v.setAttribute('role', 'status');
    v.innerHTML = ESQ;
  }
  function blocos(el) {
    var lim = (window.innerHeight || 800) * 1.4, sel = [];
    var folhas = el.querySelectorAll(FOLHAS);
    for (var i = 0; i < folhas.length; i++) sel.push(folhas[i]);
    // títulos e blocos sem folha dentro (cabeçalho da tela, painéis de texto) entram também
    el.querySelectorAll(':scope > *, :scope > .sec > *, .painel > h2, .painel > h3').forEach(function (x) {
      if (!x.querySelector(FOLHAS) && !x.closest(FOLHAS)) sel.push(x);
    });
    // caixa com lista dentro (.painel): a caixa entra primeiro e as linhas dela em seguida
    el.querySelectorAll('.painel, .sec > .cartoes').forEach(function (x) { if (x.querySelector(FOLHAS) && !x.matches('.cartoes')) sel.push(x); });
    var vistos = [];
    sel.forEach(function (x) {
      if (vistos.indexOf(x) >= 0) return;
      for (var p = x.parentElement; p && p !== el; p = p.parentElement) if (sel.indexOf(p) >= 0 && !p.querySelector(FOLHAS)) return;
      var r = x.getBoundingClientRect();
      if (r.height <= 0 || r.width <= 0 || r.top > lim || r.bottom < 0) return;
      vistos.push(x); x._entR = r;
    });
    vistos.sort(function (a, b) { return (Math.round(a._entR.top / 12) - Math.round(b._entR.top / 12)) || (a._entR.left - b._entR.left); });
    return vistos.slice(0, 24);
  }
  function contar(x, atraso) {
    var alvo = x.querySelectorAll('.cartao .v, .v');
    for (var i = 0; i < alvo.length; i++) (function (n) {
      var t = n.textContent.trim();
      if (!/^\d{1,6}$/.test(t) || +t < 2 || n._entC) return;
      var fim = +t, t0 = 0; n._entC = 1; n.textContent = '0';
      setTimeout(function () {
        function passo(ts) {
          if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 500), e = 1 - Math.pow(1 - p, 3);
          if (!n.isConnected) return; n.textContent = String(Math.round(fim * e));
          if (p < 1) requestAnimationFrame(passo); else n.textContent = t;
        }
        requestAnimationFrame(passo);
      }, atraso);
    })(alvo[i]);
  }
  function cascata(el, primeira) {
    if (calmo) return;
    var b = blocos(el), passo = primeira ? 38 : 24;
    b.forEach(function (x, i) {
      x.style.setProperty('--ent-i', i); x.style.setProperty('--ent-passo', passo + 'ms');
      x.classList.add('ent-vem');
      x.addEventListener('animationend', function fim() { x.classList.remove('ent-vem'); x.removeEventListener('animationend', fim); });
      if (x.matches('.cartao') || x.querySelector('.cartao .v')) contar(x, i * passo);
    });
  }
  function olhar(el) {
    var vz = carregando(el);
    if (vz.length) { vz.forEach(esqueleto); return; }   // ainda carregando: esqueleto, e a cascata espera os dados
    var s = assinatura();
    if (s === ultima && teveDados) return;
    var primeira = !teveDados; ultima = s; teveDados = true;
    cascata(el, primeira);
  }
  function liga() {
    var el = document.getElementById('conteudo');
    if (!el) return;
    var pedido = 0;
    new MutationObserver(function () { if (!pedido) pedido = requestAnimationFrame(function () { pedido = 0; olhar(el); }); }).observe(el, { childList: true });
    olhar(el);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
})();
