/* Navegação compacta do HUB VIVERE no celular e no tablet (22/11/2026, tarefa vis-app-carregamento-transicoes).
   Mesmo padrão do painel dos corretores (nav-celular.js do app). Até 1023 px (body.tc-on):
   - topo de 1 linha: selo e nome, tema e ☰ (o ☰ abre a gaveta "Mais");
   - barra fixa embaixo: Início, CRM, Locação, Financeiro e Mais, com os selos das áreas;
   - gaveta "Mais": as outras áreas (Gestão, Construções), os atalhos (Metas, ocultar valores, fonte da base, menu
     lateral), os painéis dos corretores e o resumo das coletas.
   Tudo só espelha os botões originais (o menu de áreas e os botões do topo seguem no HTML, escondidos): o toque na barra
   ou na gaveta clica o botão original. As subabas da área continuam no lugar. A partir de 1024 px nada muda além do
   resumo das coletas (pintaColetas, núcleo) e da busca na mesma linha das coletas. ?nav=0 desliga no aparelho.
   2026-11-22.2: barra de baixo e gaveta (pedido do Cleiton às 00h44: o ☰ não levava às áreas).
   2026-11-22.6: no celular e no tablet os atalhos voltam ao topo, compactos, em 2 linhas (pedido das 01h17).
   2026-11-22.5: sem a busca geral do topo e topo do computador numa linha (pedido das 01h13).
   2026-11-22.3: os cartões grandes do topo só no Início, logo abaixo dos menus (pedido das 00h57), em todos os formatos. */
(function () {
  'use strict';
  if (window.TopoCompacto) return;
  try {
    var qn = /[?&]nav=([01])\b/.exec(location.search); if (qn) localStorage.setItem('vivere.nav', qn[1]);
    if (localStorage.getItem('vivere.nav') === '0') return;
  } catch (e) {}
  var BARRA = [['inicio', 'Início'], ['crm', 'Leads'], ['estoque', 'Imóveis'], ['locacao', 'Locação']]; /* hub-redesenho-f1 */
  var css = document.createElement('style'); css.id = 'topo-compacto-css';
  css.textContent = [
    /* resumo das coletas (todos os formatos) */
    '.coletas{position:relative}',
    '.col-res>summary{list-style:none;cursor:pointer;gap:6px}.col-res>summary::-webkit-details-marker{display:none}',
    '.col-res>summary::after{content:"\\25BE";font-size:10px;color:var(--muted);margin-left:2px}',
    '.col-res[open]>summary::after{content:"\\25B4"}',
    '.col-h{color:var(--muted)}.chip.falhou .col-h{color:inherit}',
    '.col-det{display:flex;flex-wrap:wrap;gap:6px}',
    '@media (min-width:1024px){.coletas .col-det{position:absolute;right:0;top:calc(100% + 6px);z-index:45;width:max-content;max-width:min(560px,90vw);padding:10px;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.16)}}',
    '#ml-troca[hidden]{display:none!important}',
    /* 2026-11-22.3: os cartões grandes do topo (#kpis) ficam só no Início, logo abaixo dos menus */
    'body.tc-kpi-fora #kpis{display:none!important}',
    '#kpis.tc-kpi-baixo{margin-top:14px}',
    /* 2026-11-22.5 (pedido do Cleiton, 01h13): sem a busca geral no topo (cada aba já tem a busca dela) e topo do computador
       numa linha só: selo e nome, Metas, Painéis, menu lateral, tema, olho, fonte da base e, à direita, o resumo das coletas */
    'html body header.topo>.busca{display:none!important}',
    '@media (min-width:1024px){html body header.topo{gap:8px 10px;padding-bottom:10px;align-items:center}html body header.topo>.marca{gap:10px;margin-right:4px}html body header.topo>.marca .selo{width:38px;height:38px}html body header.topo>.marca h1{font-size:18px}html body header.topo>.marca p{font-size:11.5px}html body header.topo>.coletas{order:11;margin-left:auto;flex:none}}',
    '@media (min-width:1024px) and (max-width:1199px){html body header.topo>.marca p{display:none}html body header.topo>.coletas .col-h{display:none}}',
    /* botões novos do topo: só no celular e no tablet */
    'html body header.topo>.tp-btn{display:none}',
    /* ---------- até 1023 px ---------- */
    'html body.tc-on header.topo{flex-wrap:wrap;gap:8px 6px;align-items:center;justify-content:flex-start;padding-bottom:10px;position:relative}',
    'html body.tc-on header.topo>.marca{flex:1 1 auto;min-width:0;order:-10!important;margin:0;gap:10px}',
    'html body.tc-on header.topo>.marca .selo{width:32px;height:32px}',
    'html body.tc-on header.topo>.marca>div{min-width:0}',
    'html body.tc-on header.topo>.marca h1{font-size:15px;letter-spacing:.2em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    'html body.tc-on header.topo>.marca p{display:none}',
    'html body.tc-on header.topo>.tp-btn{display:inline-flex;position:relative}',
    /* 2026-11-22.6 (pedido das 01h17): no celular e no tablet os atalhos continuam no topo, compactos.
       1ª linha: selo e nome, olho, fonte da base, tema e ☰; 2ª linha: Metas, Painéis, menu lateral e o resumo das coletas */
    'html body.tc-on header.topo>#btnPrivado{order:-9!important}html body.tc-on header.topo>#fonte-base{order:-8!important}html body.tc-on header.topo>#tema-btn{order:-7!important}html body.tc-on header.topo>#tp-mais{order:-6!important}',
    'html body.tc-on header.topo>:is(.tema-btn,.tp-btn){width:34px;height:34px;font-size:15px}',
    'html body.tc-on header.topo>.lk-metas{order:1!important;height:30px;padding:0 10px;font-size:10.5px;letter-spacing:.08em}',
    'html body.tc-on header.topo>.lk-paineis{order:2!important}html body.tc-on header.topo>.lk-paineis>summary{height:30px;padding:0 10px;font-size:10.5px;letter-spacing:.08em}',
    'html body.tc-on header.topo>#ml-troca{order:3!important;width:30px;height:30px}',
    'html body.tc-on header.topo>.coletas{order:4!important;margin-left:auto;flex:0 1 auto;min-width:0}',
    'html body.tc-on header.topo>.coletas .col-res>summary{font-size:11.5px;padding:3px 9px}',
    '@media (max-width:700px){html body.tc-on header.topo>.coletas .col-h{display:none}html body.tc-on header.topo>.coletas .col-res[open]{flex-basis:100%}}',
    'html body.tc-on header.topo>.coletas .col-det{margin-top:8px}',
    '@media (max-width:700px){html body.tc-on header.topo::after{content:"";order:0;flex:0 0 100%;height:0}html body.tc-on header.topo>.marca{flex:1 1 0}}',
    '@media (max-width:440px){html body.tc-on header.topo>.marca{gap:8px}html body.tc-on header.topo>.marca .selo{width:28px;height:28px}html body.tc-on header.topo{column-gap:4px}html body.tc-on header.topo>:is(.tema-btn,.tp-btn){width:32px;height:32px}html body.tc-on header.topo>.marca h1{font-size:12.5px;letter-spacing:.1em}html body.tc-on header.topo>.lk-metas,html body.tc-on header.topo>.lk-paineis>summary{padding:0 8px;letter-spacing:.04em}html body.tc-on header.topo>.coletas .col-res>summary{font-size:10.5px;padding:3px 8px}}',
    'html body.tc-on nav#abas{display:none!important}',
    '#tp-mais svg{width:18px;height:18px}',
    '.tc-ponto{position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;background:var(--bad)}',
    /* barra de baixo */
    '.tc-barra{display:none}',
    'body.tc-on .tc-barra{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:0;right:0;bottom:0;z-index:45;background:var(--panel);border-top:1px solid var(--line);padding:4px 2px calc(6px + env(safe-area-inset-bottom))}',
    '.tc-barra button{appearance:none;border:0;background:none;color:var(--muted);display:grid;justify-items:center;gap:1px;padding:6px 2px 2px;font:500 11px var(--body,system-ui);position:relative;cursor:pointer;min-width:0;-webkit-tap-highlight-color:transparent}',
    '.tc-i{display:grid;place-items:center;height:24px}',
    '.tc-i svg,.tc-i .ic{width:21px!important;height:21px!important;font-size:21px;margin:0!important}',
    '.tc-grade .tc-i svg,.tc-grade .tc-i .ic{width:19px!important;height:19px!important}',
    '.tc-barra button[aria-current="page"]{color:var(--ink)}.tc-barra button[aria-current="page"] .tc-i{color:var(--brass)}',
    '.tc-selo{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--bad);color:#fff;font:700 10px/18px system-ui,sans-serif;text-align:center}',
    '.tc-barra .tc-selo{top:0;right:auto;left:calc(50% + 6px)}',
    'body.tc-on{padding-bottom:calc(66px + env(safe-area-inset-bottom))}',
    '@media (min-width:701px){body.tc-on .tc-barra{padding-inline:calc((100vw - 640px) / 2)}}',
    /* gaveta "Mais" */
    '.tc-veu{position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:60}',
    '.tc-gav{position:fixed;left:0;right:0;bottom:0;z-index:61;max-height:82vh;overflow:auto;background:var(--panel);color:var(--ink);border-top:1px solid var(--line);border-radius:16px 16px 0 0;padding:8px 14px calc(16px + env(safe-area-inset-bottom));box-shadow:0 -12px 32px rgba(0,0,0,.22)}',
    '.tc-gav .puxa{width:40px;height:4px;border-radius:2px;background:var(--line);margin:2px auto 8px}',
    '.tc-gav h2{font:600 12px var(--body,system-ui);letter-spacing:.02em;color:var(--muted);margin:10px 2px 6px;text-transform:none;border:0;padding:0}',
    '.tc-grade{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
    '.tc-grade>button,.tc-grade>a{appearance:none;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:10px;padding:10px 6px 8px;display:grid;justify-items:center;align-content:center;gap:4px;font:500 12px/1.25 var(--body,system-ui);text-align:center;position:relative;cursor:pointer;min-height:62px;text-decoration:none}',
    '.tc-grade>[aria-current="page"]{border-color:var(--brass)}',
    '.tc-grade .tc-selo{top:4px;right:4px}',
    '.tc-grade>:last-child:nth-child(3n+1){grid-column:span 3}.tc-grade>:last-child:nth-child(3n+2){grid-column:span 2}',
    '.tc-pain{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}',
    '.tc-pain>a{display:block;border:1px solid var(--line);border-radius:8px;padding:8px 10px;color:var(--ink);text-decoration:none;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:var(--bg)}',
    '.tc-pain>a:last-child:nth-child(odd){grid-column:span 2}',
    '.tc-col .col-det{margin-top:8px}.tc-col .col-res>summary{white-space:normal}',
    '@media (prefers-reduced-motion:no-preference){.tc-gav{animation:tc-sobe 220ms cubic-bezier(.2,.7,.2,1)}@keyframes tc-sobe{from{transform:translateY(24px);opacity:.4}to{transform:none;opacity:1}}}'
  ].join('\n');
  document.head.appendChild(css);

  var SVG = {
    lupa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    mais: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    ponto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="6"/></svg>',
    metas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".5"/></svg>',
    lateral: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>'
  };
  var mq = window.matchMedia('(max-width: 1023px)');
  var t, abas, barra, mais, aberta = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function grupo(k) { return abas && abas.querySelector('button[data-grupo="' + k + '"]'); }
  function icone(el) { var i = el && el.querySelector('i.ic'); if (i) return i.outerHTML; var s = el && el.querySelector('svg'); return s ? s.outerHTML : SVG.ponto; }
  function selo(el) { var n = el && el.querySelector('.badge'); var x = n ? n.textContent.trim() : ''; return /^\d+$/.test(x) && x !== '0' ? '<span class="tc-selo">' + esc(x) + '</span>' : ''; }
  function rotulo(el) { var c = el.cloneNode(true); c.querySelectorAll('.badge,.ic,.pt,svg').forEach(function (x) { x.remove(); }); return c.textContent.replace(/[↗▾]/g, '').replace(/\s+/g, ' ').trim(); }
  function ativo() { var a = abas && abas.querySelector('button[data-grupo][aria-selected="true"]'); return a ? a.getAttribute('data-grupo') : ''; }
  function falhou() { var c = document.getElementById('coletas'); return !!(c && c.classList.contains('com-falha')); }

  function kpis() {   // cartões grandes só no Início, abaixo dos menus (pedido do Cleiton, 22/11/2026 00h57)
    var k = document.getElementById('kpis'), sub = document.getElementById('subabas');
    if (k && sub && sub.parentNode && k.previousElementSibling !== sub) { sub.parentNode.insertBefore(k, sub.nextSibling); k.classList.add('tc-kpi-baixo'); }
    var g = ativo(); document.body.classList.toggle('tc-kpi-fora', !!g && g !== 'inicio');
  }
  function pinta() {
    if (!barra || !abas) return;
    var at = ativo(), naBarra = BARRA.some(function (b) { return b[0] === at; });
    var h = BARRA.filter(function (b) { return grupo(b[0]); }).map(function (b) {
      var o = grupo(b[0]);
      return '<button type="button" data-tc="' + b[0] + '"' + (at === b[0] ? ' aria-current="page"' : '') + '><span class="tc-i">' + icone(o) + '</span>' + esc(b[1]) + selo(o) + '</button>';
    }).join('') + '<button type="button" data-tc-mais="1"' + (!naBarra && at ? ' aria-current="page"' : '') + ' aria-haspopup="dialog"><span class="tc-i">' + SVG.mais + '</span>Mais</button>';
    if (barra._h !== h) { barra._h = h; barra.innerHTML = h; }
    var hm = SVG.menu + (falhou() ? '<span class="tc-ponto" title="Alguma coleta falhou"></span>' : '');
    if (mais._h !== hm) { mais._h = hm; mais.innerHTML = hm; }
  }

  function fechar() {
    if (!aberta) return;
    aberta.forEach(function (x) { x.remove(); }); aberta = null;
    mais.setAttribute('aria-expanded', 'false');
  }
  function abrir() {
    if (aberta) { fechar(); return; }
    var at = ativo(), nb = BARRA.map(function (b) { return b[0]; });
    var outras = [].filter.call(abas.querySelectorAll('button[data-grupo]'), function (b) { return nb.indexOf(b.getAttribute('data-grupo')) < 0; });
    var veu = document.createElement('div'); veu.className = 'tc-veu';
    var g = document.createElement('div'); g.className = 'tc-gav'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', 'Mais áreas e atalhos');
    var h = '<div class="puxa"></div>';
    if (outras.length) h += '<h2>Áreas</h2><div class="tc-grade">' + outras.map(function (b) {
      var k = b.getAttribute('data-grupo');
      return '<button type="button" data-tc="' + esc(k) + '"' + (k === at ? ' aria-current="page"' : '') + '><span class="tc-i">' + icone(b) + '</span><span>' + esc(rotulo(b)) + '</span>' + selo(b) + '</button>';
    }).join('') + '</div>';
    var at2 = [];
    var metas = t.querySelector('a.lk-metas'); if (metas) at2.push('<a href="' + esc(metas.href) + '" target="_blank" rel="noopener"><span class="tc-i">' + SVG.metas + '</span><span>Metas</span></a>');
    var olho = document.getElementById('btnPrivado');
    if (olho) at2.push('<button type="button" data-tc-at="btnPrivado"><span class="tc-i">' + icone(olho) + '</span><span>' + (olho.getAttribute('aria-pressed') === 'true' ? 'Mostrar valores' : 'Ocultar valores') + '</span></button>');
    var fonte = document.getElementById('fonte-base');
    if (fonte) at2.push('<button type="button" data-tc-at="fonte-base"><span class="tc-i">' + icone(fonte) + '</span><span>Fonte da base</span>' + selo(fonte) + '</button>');
    var lat = document.getElementById('ml-troca');
    if (lat && !lat.hidden) at2.push('<button type="button" data-tc-at="ml-troca"><span class="tc-i">' + SVG.lateral + '</span><span>' + esc(lat.title || 'Menu lateral') + '</span></button>');
    if (at2.length) h += '<h2>Atalhos</h2><div class="tc-grade">' + at2.join('') + '</div>';
    var pm = document.getElementById('paineis-menu'), links = pm ? [].slice.call(pm.querySelectorAll('a[href]')) : [];
    if (links.length) h += '<h2>Painéis dos corretores</h2><div class="tc-pain">' + links.map(function (a) {
      return '<a href="' + esc(a.href) + '" target="_blank" rel="noopener">' + esc((a.querySelector('span') || a).textContent.replace(/[↗]/g, '').replace(/\s+/g, ' ').trim()) + ' ↗</a>';
    }).join('') + '</div>';
    var col = document.getElementById('coletas');
    if (col && col.innerHTML.trim()) h += '<h2>Coletas</h2><div class="coletas tc-col">' + col.innerHTML + '</div>';
    g.innerHTML = h;
    document.body.appendChild(veu); document.body.appendChild(g); aberta = [veu, g];
    mais.setAttribute('aria-expanded', 'true');
    veu.addEventListener('click', fechar);
  }

  function clique(ev) {
    var b = ev.target.closest && ev.target.closest('[data-tc], [data-tc-mais], [data-tc-at], .tc-gav a[href]');
    if (!b) return;
    if (b.matches('.tc-gav a[href]')) { setTimeout(fechar, 0); return; }   // link abre normalmente; a gaveta fecha
    if (b.hasAttribute('data-tc-mais')) { abrir(); return; }
    if (b.hasAttribute('data-tc-at')) { var el = document.getElementById(b.getAttribute('data-tc-at')); fechar(); if (el) el.click(); return; }
    var o = grupo(b.getAttribute('data-tc')); fechar();
    if (o) { o.click(); window.scrollTo(0, 0); }
  }

  function botao(id, rot, svg) {
    var b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'tema-btn tp-btn';
    b.title = rot; b.setAttribute('aria-label', rot); b.setAttribute('aria-expanded', 'false'); b.innerHTML = svg; return b;
  }
  function inicia() {
    t = document.querySelector('header.topo'); abas = document.getElementById('abas');
    if (!t || !abas || document.getElementById('tp-mais')) return;
    mais = botao('tp-mais', 'Mais áreas e atalhos', SVG.menu); mais.setAttribute('aria-haspopup', 'dialog');
    t.appendChild(mais);
    // rótulos curtos no topo (o título do botão guarda a descrição longa)
    var lm = t.querySelector('a.lk-metas'); if (lm && !lm.closest('.lk-paineis')) lm.textContent = 'Metas ↗';
    var lp = t.querySelector('.lk-paineis > summary'); if (lp) lp.textContent = 'Painéis ▾';
    barra = document.createElement('nav'); barra.className = 'tc-barra'; barra.setAttribute('aria-label', 'Áreas principais do HUB');
    document.body.appendChild(barra);
    mais.addEventListener('click', abrir);
    document.addEventListener('click', clique);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
    var pedido = 0, agenda = function () { if (!pedido) pedido = requestAnimationFrame(function () { pedido = 0; pinta(); kpis(); }); };
    new MutationObserver(agenda).observe(abas, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
    var col = document.getElementById('coletas');
    if (col) new MutationObserver(agenda).observe(col, { attributes: true, attributeFilter: ['class'] });
    var modo = function () { document.body.classList.toggle('tc-on', mq.matches); if (!mq.matches) fechar(); };
    if (mq.addEventListener) mq.addEventListener('change', modo); else mq.addListener(modo);
    modo(); pinta(); kpis();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia); else inicia();
  window.TopoCompacto = { versao: '2026-11-22.6' };
})();
