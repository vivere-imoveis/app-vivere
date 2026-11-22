/* Topo compacto do HUB VIVERE (22/11/2026, tarefa vis-app-carregamento-transicoes, pedido do Cleiton às 00h10 e OK às 00h17).
   Até 1023 px (celular e tablet em pé) o topo vira 1 linha: selo e nome, lupa, tema e ☰.
   - A lupa mostra a busca logo abaixo (fica aberta enquanto houver texto).
   - O ☰ abre, logo abaixo, Metas, Painéis, ocultar valores (olho), a fonte da base (nuvem), o menu lateral e o resumo das coletas.
   - Nada é movido de lugar no HTML: só aparece e some por classe no header (os módulos continuam achando tudo pelo id).
   - A partir de 1024 px nada muda além do resumo das coletas (pintaColetas, núcleo).
   - Fora do topo: o resumo das coletas abre o detalhe por cima no computador e por dentro do ☰ no celular. */
(function () {
  'use strict';
  if (window.TopoCompacto) return;
  var css = document.createElement('style'); css.id = 'topo-compacto-css';
  css.textContent = [
    /* resumo das coletas (todos os formatos) */
    '.coletas{position:relative}',
    '.coletas .col-res>summary{list-style:none;cursor:pointer;gap:6px}.coletas .col-res>summary::-webkit-details-marker{display:none}',
    '.coletas .col-res>summary::after{content:"\\25BE";font-size:10px;color:var(--muted);margin-left:2px}',
    '.coletas .col-res[open]>summary::after{content:"\\25B4"}',
    '.coletas .col-h{color:var(--muted)}.coletas .chip.falhou .col-h{color:inherit}',
    '.coletas .col-det{display:flex;flex-wrap:wrap;gap:6px}',
    '@media (min-width:1024px){.coletas .col-det{position:absolute;right:0;top:calc(100% + 6px);z-index:45;width:max-content;max-width:min(560px,90vw);padding:10px;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.16)}}',
    'html body header.topo>.tp-btn,html body header.topo>.tp-sep{display:none}',
    '#ml-troca[hidden]{display:none!important}',
    /* a partir de 1024 px: busca e resumo das coletas dividem a 2ª linha (antes: coletas numa linha e a busca noutra) */
    '@media (min-width:1024px){html body header.topo>.busca{order:10;flex:1 1 320px;max-width:none;margin-left:0}html body header.topo>.coletas{order:11;margin-left:0;flex:none}}',
    /* até 1023 px: topo de 1 linha */
    '@media (max-width:1023px){',
    'html body header.topo{flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-start;padding-bottom:10px;position:relative}',
    'html body header.topo>.marca{flex:1 1 auto;min-width:0;order:-10!important;margin:0;gap:10px}',
    'html body header.topo>.marca .selo{width:32px;height:32px}',
    'html body header.topo>.marca>div{min-width:0}',
    'html body header.topo>.marca h1{font-size:15px;letter-spacing:.2em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    'html body header.topo>.marca p{display:none}',
    'html body header.topo>.tp-btn{display:inline-flex;position:relative}',
    'html body header.topo>#tp-lupa{order:-9!important}html body header.topo>#tema-btn{order:-8!important}html body header.topo>#tp-mais{order:-7!important}',
    'html body header.topo:not(.tp-aberto)>:is(.lk-metas,.lk-paineis,#btnPrivado,#fonte-base,#ml-troca,.coletas){display:none!important}',
    'html body header.topo:not(.tp-busca)>.busca{display:none!important}',
    'html body header.topo>.busca{order:1!important;flex:1 1 100%;max-width:none;margin:0}',
    'html body header.topo.tp-aberto>.tp-sep{display:block;order:2;flex:0 0 100%;height:0;border-top:1px solid var(--line);margin:2px 0}',
    'html body header.topo>:is(.lk-metas,.lk-paineis,#btnPrivado,#fonte-base,#ml-troca){order:3!important}',
    'html body header.topo>.coletas{order:4!important;flex:1 1 100%;margin:0}',
    'html body header.topo>.coletas .col-det{margin-top:8px}',
    'html body header.topo>.coletas .col-res>summary{white-space:normal}',
    '#tp-mais .tp-ponto{position:absolute;top:3px;right:3px;width:8px;height:8px;border-radius:50%;background:var(--bad);display:none}',
    '#tp-mais.tp-falha .tp-ponto{display:block}',
    '#tp-mais svg,#tp-lupa svg{width:18px;height:18px}',
    '}'
  ].join('\n');
  document.head.appendChild(css);

  var SVG_LUPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>';
  var SVG_MAIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';

  function botao(id, rot, svg) {
    var b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'tema-btn tp-btn';
    b.title = rot; b.setAttribute('aria-label', rot); b.innerHTML = svg; return b;
  }
  function inicia() {
    var t = document.querySelector('header.topo'); if (!t || document.getElementById('tp-mais')) return;
    var lupa = botao('tp-lupa', 'Buscar no HUB', SVG_LUPA);
    var mais = botao('tp-mais', 'Mais opções', SVG_MAIS + '<span class="tp-ponto"></span>');
    mais.setAttribute('aria-expanded', 'false'); lupa.setAttribute('aria-expanded', 'false');
    var sep = document.createElement('span'); sep.className = 'tp-sep'; sep.setAttribute('aria-hidden', 'true');
    var tema = document.getElementById('tema-btn');
    t.insertBefore(lupa, tema && tema.parentNode === t ? tema : null);
    t.appendChild(mais); t.appendChild(sep);
    var q = document.getElementById('busca-q');
    function abre(cls, liga) {
      t.classList.toggle(cls, liga);
      (cls === 'tp-aberto' ? mais : lupa).setAttribute('aria-expanded', String(liga));
    }
    lupa.addEventListener('click', function () {
      var liga = !t.classList.contains('tp-busca') || !!(q && q.value);   // com texto digitado a busca fica aberta
      abre('tp-busca', liga); if (liga) { abre('tp-aberto', false); if (q) q.focus(); }
    });
    mais.addEventListener('click', function () { var liga = !t.classList.contains('tp-aberto'); abre('tp-aberto', liga); });
    if (q) q.addEventListener('input', function () { if (q.value) abre('tp-busca', true); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (t.classList.contains('tp-aberto')) abre('tp-aberto', false);
      else if (t.classList.contains('tp-busca') && q && !q.value) abre('tp-busca', false);
    });
    document.addEventListener('click', function (e) {   // toque fora do topo fecha a gaveta do ☰
      if (!t.classList.contains('tp-aberto') || t.contains(e.target)) return;
      abre('tp-aberto', false);
    });
    var col = document.getElementById('coletas');
    function ponto() { mais.classList.toggle('tp-falha', !!(col && col.classList.contains('com-falha'))); }
    if (col) new MutationObserver(ponto).observe(col, { attributes: true, attributeFilter: ['class'] });
    ponto();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia); else inicia();
  window.TopoCompacto = { versao: '2026-11-22.1' };
})();
