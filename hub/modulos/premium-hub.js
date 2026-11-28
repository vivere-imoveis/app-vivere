/* premium-hub.js — camada premium do HUB VIVERE (27/11/2026, tarefa vis-repaginacao-premium-hub, F1: Imóveis, prancha 5).
   Só enfeita o que o HUB já desenhou: não lê o banco, não grava, não muda filtro nem regra. Par do premium-hub.css.
   Desliga no aparelho com ?premium=0 na URL (fica guardado; ?premium=1 religa). */
(function () {
  'use strict';
  var guarda = function () { try { return window.localStorage; } catch (e) { return null; } };
  try {
    var q = (location.search.match(/[?&]premium=([01])/) || [])[1], st = guarda();
    if (q && st) { try { st.setItem('hub-premium', q); } catch (e) { } }
    if ((q || (st && st.getItem('hub-premium'))) === '0') return;
  } catch (e) { }
  document.documentElement.classList.add('ph-on');
  var reduz = (function () { try { return matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { return { matches: false }; } })();
  var num = function (t) { var m = String(t || '').replace(/\./g, '').match(/\d+/); return m ? +m[0] : 0; };

  /* ---------- 1 e 2) régua: Destaques em 8 quadradinhos, Endereço incompleto com barra ---------- */
  function regua(gr) {
    var cards = gr.querySelectorAll(':scope > button.card[data-ci-f]'); if (!cards.length) return;
    var tot = 0; [].forEach.call(cards, function (c) { if (c.dataset.ciF === 'todos') tot = num((c.children[1] || {}).textContent); });
    [].forEach.call(cards, function (c) {
      var v = c.children[1]; if (!v || c.dataset.ph === '1') return; c.dataset.ph = '1';
      if (c.dataset.ciF === 'dest') {
        var m = String(v.textContent).match(/(\d+)\s*de\s*(\d+)/); if (!m) return;
        var n = +m[1], max = Math.min(+m[2], 12);
        v.innerHTML = m[1] + '<small>de ' + m[2] + '</small>';
        var d = document.createElement('span'); d.className = 'ph-dots'; d.setAttribute('aria-hidden', 'true');
        d.innerHTML = new Array(max + 1).join('<i></i>'); [].forEach.call(d.children, function (i, k) { if (k < n) i.className = 'on'; });
        c.lastElementChild.before(d); c.lastElementChild.classList.add('ph-oculta');   // a frase "vitrine da home do site" dá lugar aos quadradinhos
      } else if (c.dataset.ciF === 'inc') {
        var k = num(v.textContent); if (!tot) return;
        var b = document.createElement('span'); b.className = 'ph-barra'; b.setAttribute('role', 'img');
        b.setAttribute('aria-label', k + ' de ' + tot + ' com endereço incompleto');
        b.innerHTML = '<i style="width:' + Math.min(100, Math.round(k / tot * 1000) / 10) + '%"></i>';
        c.lastElementChild.before(b); c.lastElementChild.classList.add('ph-oculta');
        if (k > 0) c.classList.add('ph-alerta');
      }
    });
  }

  /* ---------- 3) texto explicativo no "i" do título ---------- */
  var BAL = null;
  function fechaBalao(volta) { if (!BAL) return; var b = BAL.bt; BAL.el.remove(); b.setAttribute('aria-expanded', 'false'); BAL = null; if (volta) try { b.focus({ preventScroll: true }); } catch (e) { } }
  function info(gr) {
    var raiz = gr.parentElement; if (!raiz) return;
    var h2 = raiz.querySelector(':scope > h2'); if (!h2 || h2.querySelector('.ph-i')) return;
    var p = h2.nextElementSibling; if (!p || !p.matches('p.nota') || !p.textContent.trim()) return;
    p.classList.add('ph-oculta'); p.id = p.id || 'ph-txt-' + Math.random().toString(36).slice(2, 8);
    var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'ph-i'; bt.textContent = 'i';
    bt.setAttribute('aria-label', 'Como funciona esta tela'); bt.setAttribute('aria-expanded', 'false'); bt.dataset.phTxt = p.id;
    h2.appendChild(bt);
  }
  document.addEventListener('click', function (ev) {
    var bt = ev.target.closest && ev.target.closest('.ph-i');
    if (!bt) { if (BAL && !BAL.el.contains(ev.target)) fechaBalao(false); return; }
    if (BAL && BAL.bt === bt) { fechaBalao(false); return; }
    fechaBalao(false);
    var p = document.getElementById(bt.dataset.phTxt); if (!p) return;
    var el = document.createElement('div'); el.className = 'ph-balao'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Como funciona esta tela');
    el.innerHTML = '<p>' + p.innerHTML + '</p>';
    document.body.appendChild(el);
    var r = bt.getBoundingClientRect(), w = el.offsetWidth, x = Math.max(16, Math.min(r.left + scrollX - 8, scrollX + innerWidth - w - 16));
    el.style.left = x + 'px'; el.style.top = (r.bottom + scrollY + 8) + 'px';
    el.style.setProperty('--ph-ox', Math.round(r.left + scrollX + r.width / 2 - x) + 'px');   // nasce do botão
    bt.setAttribute('aria-expanded', 'true'); BAL = { el: el, bt: bt };
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && BAL) { fechaBalao(true); ev.stopPropagation(); } }, true);
  addEventListener('scroll', function () { fechaBalao(false); }, { passive: true });

  /* ---------- 4) abas com o fio de latão que desliza (a lista é redesenhada a cada troca: o fio sai de onde estava) ---------- */
  var ULT = {};
  function fio(lin) {
    var at = lin.querySelector('.btn[aria-pressed="true"]'); if (!at) return;
    var ind = lin.querySelector(':scope > .ph-ind');
    if (!ind) { ind = document.createElement('span'); ind.className = 'ph-ind'; ind.setAttribute('aria-hidden', 'true'); lin.appendChild(ind); }
    var x = at.offsetLeft, w = at.offsetWidth, ch = (lin.getAttribute('aria-label') || '') + (lin.classList.contains('sub-op-dentro') ? '|d' : '');
    if (ind.dataset.x === String(x) && ind.dataset.w === String(w)) return;
    var ant = ULT[ch];
    if (ant && !reduz.matches && !ind.dataset.x && (ant.x !== x || ant.w !== w)) {   // linha nova: parte da posição anterior e desliza
      ind.style.transition = 'none'; ind.style.transform = 'translateX(' + ant.x + 'px)'; ind.style.width = ant.w + 'px';
      void ind.offsetWidth; ind.style.transition = '';
    }
    ind.style.transform = 'translateX(' + x + 'px)'; ind.style.width = w + 'px';
    ind.dataset.x = x; ind.dataset.w = w; ULT[ch] = { x: x, w: w };
  }

  /* ---------- 5) "Todos" sempre primeiro (pedido do Cleiton, 27/11/2026 21h) ---------- */
  var ehTodos = function (b) { return /^tod[ao]s\b/i.test((b.textContent || '').trim()) || Object.keys(b.dataset).some(function (k) { return b.dataset[k] === 'todos' && !/^ci/.test(k); }); };
  function todosPrimeiro(c) {
    [].forEach.call(c.querySelectorAll('.filtros'), function (f) {
      var bts = [].filter.call(f.children, function (x) { return x.matches('button.btn'); }); if (bts.length < 2) return;
      var t = bts.filter(ehTodos)[0]; if (!t || t === bts[0]) return;
      bts[0].before(t);
    });
  }

  /* ---------- 6) minimizar seções: cada título recolhe o que vem abaixo dele; "Recolher tudo" no alto (pedido do Cleiton, 27/11/2026 21h) ---------- */
  var REC = (function () { try { return JSON.parse((guarda() || {}).getItem && guarda().getItem('hub-recolhidos') || '{}') || {}; } catch (e) { return {}; } })();
  var salvaRec = function () { try { var g = guarda(); if (g) g.setItem('hub-recolhidos', JSON.stringify(REC)); } catch (e) { } };
  var abaAtual = function () { var a = document.querySelector('#conteudo .filtros.sub-op .btn[aria-pressed="true"]') || document.querySelector('#ml .ml-s[aria-selected="true"]') || document.querySelector('#ml [aria-current="page"]'); return a ? a.textContent.trim().replace(/\s*\d+$/, '') : ''; };
  var tituloDe = function (h) { var c = h.cloneNode(true); [].forEach.call(c.querySelectorAll('button,.badge'), function (x) { x.remove(); }); return c.textContent.trim().slice(0, 80); };
  function irmaos(h) { var L = [], n = h.nextElementSibling; while (n && !n.matches('h2,.ph-tudo')) { L.push(n); n = n.nextElementSibling; }
    // título dentro de uma caixa só com a explicação (ex.: Funil dos corretores): recolhe também o que vem depois da caixa, até a próxima seção com título
    var cx = h.parentElement; if (cx && cx.id !== 'conteudo' && L.every(function (x) { return x.matches('.nota,p'); })) {
      n = cx.nextElementSibling; while (n && !n.matches('h2,.ph-tudo,.filtros.sub-op') && !n.querySelector('h2')) { L.push(n); n = n.nextElementSibling; } }
    return L; }
  function pinta(h, fechado) {
    irmaos(h).forEach(function (x) { x.classList.toggle('ph-recolhido', fechado); });
    var bt = h.querySelector(':scope > .ph-rec'); if (bt) { bt.setAttribute('aria-expanded', String(!fechado)); bt.setAttribute('aria-label', (fechado ? 'Abrir ' : 'Recolher ') + tituloDe(h)); }
    h.classList.toggle('ph-h-fechado', fechado);
  }
  function secoes(c) {
    var aba = abaAtual(), hs = [].filter.call(c.querySelectorAll('h2'), function (h) { return !h.closest('.ph-balao') && irmaos(h).length; });
    hs.forEach(function (h) {
      var k = aba + '|' + tituloDe(h); h.dataset.phK = k;
      if (!h.querySelector(':scope > .ph-rec')) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ph-rec'; b.title = 'Recolher ou abrir esta parte';
        b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
        h.appendChild(b);
      }
      var fechado = !!REC[k]; if (h.classList.contains('ph-h-fechado') !== fechado || irmaos(h).some(function (x) { return x.classList.contains('ph-recolhido') !== fechado; })) pinta(h, fechado);
    });
    var bar = c.querySelector(':scope > .ph-tudo');
    if (hs.length < 2) { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.className = 'ph-tudo'; bar.innerHTML = '<button type="button" class="btn" data-ph-tudo="1"></button>';
      var subs = c.querySelectorAll(':scope > .filtros.sub-op'); if (subs.length) subs[subs.length - 1].after(bar); else c.prepend(bar); }
    var todosF = hs.every(function (h) { return REC[h.dataset.phK]; }), b0 = bar.firstChild, tx = todosF ? 'Abrir tudo' : 'Recolher tudo';
    if (b0.textContent !== tx) { b0.textContent = tx; b0.dataset.phTudo = todosF ? 'abrir' : 'recolher'; }
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.ph-rec, [data-ph-tudo]'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    if (b.classList.contains('ph-rec')) { var h = b.parentElement, k = h.dataset.phK, f = !REC[k]; if (f) REC[k] = 1; else delete REC[k]; pinta(h, f); }
    else { var fecha = b.dataset.phTudo === 'recolher';
      [].forEach.call(document.querySelectorAll('#conteudo h2[data-ph-k]'), function (h) { if (fecha) REC[h.dataset.phK] = 1; else delete REC[h.dataset.phK]; pinta(h, fecha); }); }
    salvaRec(); aplica();
  }, true);

  /* ---------- a cada desenho ---------- */
  function aplica() {
    var c = document.getElementById('conteudo'); if (!c) return;
    [].forEach.call(c.querySelectorAll('.grade'), function (gr) { if (gr.querySelector(':scope > button.card[data-ci-f]')) { regua(gr); info(gr); } });
    todosPrimeiro(c); secoes(c);
    [].forEach.call(c.querySelectorAll('.filtros.sub-op'), fio);
    if (BAL && !BAL.bt.isConnected) fechaBalao(false);
  }
  var pend = false;
  var mo = new MutationObserver(function () { if (pend) return; pend = true; requestAnimationFrame(function () { pend = false; aplica(); }); });
  function liga() { mo.observe(document.body, { childList: true, subtree: true }); aplica(); }
  if (document.body) liga(); else document.addEventListener('DOMContentLoaded', liga);
  addEventListener('resize', function () { [].forEach.call(document.querySelectorAll('#conteudo .filtros.sub-op .ph-ind'), function (i) { i.dataset.x = ''; }); aplica(); });
})();
