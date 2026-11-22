/* Navegação compacta do painel no celular (22/11/2026, pedido do Cleiton). Par do nav-celular.css.
   Até 700 px: cabeçalho de uma linha (selo, nome, lupa, ☰), barra fixa embaixo com Início, Leads, Tarefas, Ofertas e Mais,
   e a gaveta "Mais" com as outras abas e os atalhos (A CAPTAR, ACM, Pendências, Vistorias, HUB, ocultar valores, tema,
   início do app). Tudo só espelha os botões originais (o menu #abas e os atalhos do cabeçalho seguem no lugar, escondidos):
   o clique na barra ou na gaveta clica o botão original. */
(function () {
  'use strict';
  var BARRA = [['inicio', 'Início'], ['leads', 'Leads'], ['tarefas', 'Tarefas'], ['oportunidades', 'Ofertas']];
  var ATALHOS = ['btnAcapApp', 'btnAcmApp', 'btnPendApp', 'btnVistApp', 'btnHubApp', 'btnPrivado', 'btnTema', 'btnInicio'];
  var SVG = {
    lupa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>',
    mais: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    ponto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="6"/></svg>'
  };
  var mq = window.matchMedia('(max-width: 700px)');
  var abas, barra, btBusca, btMenu, aberta = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function orig(k) { return abas && abas.querySelector('button[data-aba="' + k + '"]'); }
  function icone(el) { var i = el && el.querySelector('i.ic'); if (i) return i.outerHTML; var s = el && el.querySelector('svg'); return s ? s.outerHTML : SVG.ponto; }
  function selo(el) { var n = el && el.querySelector('.n, .bp-n, .ba-n b'); var t = n ? n.textContent.trim() : ''; return /^\d+$/.test(t) && t !== '0' ? '<span class="nc-selo">' + esc(t) + '</span>' : ''; }
  function rotulo(el) {
    var c = el.cloneNode(true); c.querySelectorAll('svg, .n, .ic, .bp-ic, .ba-ic, .ba-n').forEach(function (x) { x.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function ativa() { var a = abas && abas.querySelector('[aria-selected="true"]'); return a ? a.getAttribute('data-aba') : ''; }

  function pintaBarra() {
    if (!barra) return;
    var at = ativa(), naBarra = BARRA.some(function (b) { return b[0] === at; });
    barra.innerHTML = BARRA.filter(function (b) { return orig(b[0]); }).map(function (b) {
      var o = orig(b[0]);
      return '<button type="button" data-nc="' + b[0] + '"' + (at === b[0] ? ' aria-current="page"' : '') + '><span class="nc-i">' + icone(o) + '</span>' + esc(b[1]) + selo(o) + '</button>';
    }).join('') + '<button type="button" data-nc-mais="1"' + (!naBarra && at ? ' aria-current="page"' : '') + ' aria-haspopup="dialog"><span class="nc-i">' + SVG.mais + '</span>Mais</button>';
    var p = document.getElementById('btnPendApp');
    var hm = SVG.menu + selo(p); if (btMenu && btMenu.innerHTML !== hm) btMenu.innerHTML = hm;   // só troca se mudou (o observador da .marca veria a troca)
  }

  function fechar() {
    if (!aberta) return;
    aberta.forEach(function (x) { x.remove(); }); aberta = null;
    if (btMenu) btMenu.setAttribute('aria-expanded', 'false');
  }
  function abrir() {
    if (aberta) { fechar(); return; }
    var at = ativa(), nb = BARRA.map(function (b) { return b[0]; });
    var outras = [].filter.call(abas.querySelectorAll('button[data-aba]'), function (b) { return nb.indexOf(b.getAttribute('data-aba')) < 0; });
    var veu = document.createElement('div'); veu.className = 'nc-veu';
    var g = document.createElement('div'); g.className = 'nc-gav'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', 'Mais abas e atalhos');
    var h = '<div class="puxa"></div><h2>Abas</h2><div class="nc-grade">' + outras.map(function (b) {
      var k = b.getAttribute('data-aba');
      return '<button type="button" data-nc="' + esc(k) + '"' + (k === at ? ' aria-current="page"' : '') + '><span class="nc-i">' + icone(b) + '</span><span>' + esc(rotulo(b)) + '</span>' + selo(b) + '</button>';
    }).join('') + '</div>';
    var at2 = ATALHOS.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (at2.length) h += '<h2>Atalhos</h2><div class="nc-grade">' + at2.map(function (el) {
      var r = el.id === 'btnPrivado' ? (el.getAttribute('aria-pressed') === 'true' ? 'Mostrar valores' : 'Ocultar valores') : el.id === 'btnInicio' ? 'Início do app' : rotulo(el).replace(/^[◐☀☾]\s*/, '');
      return '<button type="button" data-nc-at="' + el.id + '"><span class="nc-i">' + icone(el) + '</span><span>' + esc(r) + '</span>' + selo(el) + '</button>';
    }).join('') + '</div>';
    g.innerHTML = h;
    document.body.appendChild(veu); document.body.appendChild(g); aberta = [veu, g];
    if (btMenu) btMenu.setAttribute('aria-expanded', 'true');
    veu.addEventListener('click', fechar);
    var f = g.querySelector('button'); if (f) f.focus({ preventScroll: true });
  }

  function clique(ev) {
    var b = ev.target.closest && ev.target.closest('[data-nc], [data-nc-mais], [data-nc-at]');
    if (!b) return;
    if (b.hasAttribute('data-nc-mais')) { abrir(); return; }
    if (b.hasAttribute('data-nc-at')) { var el = document.getElementById(b.getAttribute('data-nc-at')); fechar(); if (el) el.click(); return; }
    var o = orig(b.getAttribute('data-nc')); fechar();
    if (o) { o.click(); window.scrollTo(0, 0); }
  }

  function liga() {
    try { var q = /[?&]nav=([01])\b/.exec(location.search); if (q) localStorage.setItem('vivere.nav', q[1]); if (localStorage.getItem('vivere.nav') !== '1') return; } catch (e) { return; }   // TESTE: só com ?nav=1 até conferir
    abas = document.getElementById('abas');
    var marca = document.querySelector('header.topo .marca');
    if (!abas || !marca) return;
    btBusca = document.createElement('button'); btBusca.type = 'button'; btBusca.className = 'nc-ic'; btBusca.id = 'ncBusca';
    btBusca.setAttribute('aria-label', 'Buscar nesta aba'); btBusca.setAttribute('aria-expanded', 'false'); btBusca.innerHTML = SVG.lupa;
    btMenu = document.createElement('button'); btMenu.type = 'button'; btMenu.className = 'nc-ic'; btMenu.id = 'ncMenu';
    btMenu.setAttribute('aria-label', 'Mais abas e atalhos'); btMenu.setAttribute('aria-expanded', 'false'); btMenu.innerHTML = SVG.menu;
    marca.appendChild(btBusca); marca.appendChild(btMenu);
    barra = document.createElement('nav'); barra.className = 'nc-barra'; barra.setAttribute('aria-label', 'Abas principais');
    document.body.appendChild(barra);
    btBusca.addEventListener('click', function () {
      var on = document.body.classList.toggle('nc-busca'); btBusca.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on) { var q = document.getElementById('qAba'); if (q) q.focus(); }
    });
    btMenu.addEventListener('click', abrir);
    document.addEventListener('click', clique);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
    var pedido = 0, agenda = function () { if (!pedido) pedido = requestAnimationFrame(function () { pedido = 0; pintaBarra(); }); };
    new MutationObserver(agenda).observe(abas, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
    new MutationObserver(agenda).observe(marca, { childList: true, subtree: true, characterData: true });
    var modo = function () { document.body.classList.toggle('nc-on', mq.matches); if (!mq.matches) { fechar(); document.body.classList.remove('nc-busca'); } };
    if (mq.addEventListener) mq.addEventListener('change', modo); else mq.addListener(modo);
    modo(); pintaBarra();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
})();
