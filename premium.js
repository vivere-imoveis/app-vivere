/* premium.js — repaginação premium do painel (27/11/2026, tarefa vis-repaginacao-premium-painel, F1b).
   Camada que só ENFEITA o Início já desenhado pelo painel.js (nada se move no HTML original, nada novo é lido do banco):
   1) "Agora": filtro Todos/Leads/Imóveis/Tarefas com indicador que desliza (escolha guardada na aba do navegador);
   2) linha do lead: WhatsApp e Feito aparecem ao passar o mouse (Feito abre o Registrar conversa já com o lead: nada é
      gravado sozinho — escolha do Cleiton, 27/11/2026);
   3) Minhas metas em anéis, que se preenchem só na 1ª abertura do dia;
   4) agenciamentos em rosca, com o total no meio;
   5) tarefa marcada como feita no Início: aviso com Desfazer.
   Usa o que o painel.js deixa no escopo global (S, zapNum, toast), sempre com teste antes. ?premium=0 desliga no aparelho. */
(function () {
  'use strict';
  if (/[?&]premium=0\b/.test(location.search)) return;
  var ic = function (n) { return window.VIVERE_ICONES && VIVERE_ICONES.html ? VIVERE_ICONES.html(n) : ''; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var mm = function (q) { try { return window.matchMedia(q); } catch (e) { return { matches: false }; } };
  var reduz = mm('(prefers-reduced-motion: reduce)'), mouse = mm('(hover: hover) and (pointer: fine)');
  var guarda = function (tipo) { var st; try { st = window[tipo]; } catch (e) { st = null; }
    return { get: function (k, d) { try { var v = st.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: function (k, v) { try { st.setItem(k, v); } catch (e) { } } }; };
  var ses = guarda('sessionStorage'), loc = guarda('localStorage');
  var hoje = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var leadDe = function (id) { try { return (typeof S !== 'undefined' && S.leads && S.leads[id]) || null; } catch (e) { return null; } };
  var numZap = function (t) { try { if (typeof zapNum === 'function') return zapNum(t); } catch (e) { } var d = String(t || '').replace(/\D/g, ''); if (d.indexOf('55') === 0 && d.length >= 12) d = d.slice(2); return d.replace(/^0+/, ''); };

  /* ---------- 1) filtro do Agora ---------- */
  var TIPOS = [['todos', 'Todos'], ['leads', 'Leads'], ['imoveis', 'Imóveis'], ['tarefas', 'Tarefas']];
  var tipoDe = function (it) { return it.classList.contains('rd-it-tf') ? 'tarefas' : it.querySelector('[data-agenc]') ? 'imoveis' : 'leads'; };
  function filtro(sec) {
    var its = [].slice.call(sec.querySelectorAll('.rd-grupos .rd-it')); if (!its.length || sec.querySelector('.pm-filtro')) return;
    var tem = {}; its.forEach(function (it) { tem[tipoDe(it)] = 1; }); if (Object.keys(tem).length < 2) return;   // um tipo só: o filtro não ajuda
    var f = document.createElement('div'); f.className = 'pm-filtro'; f.setAttribute('role', 'group'); f.setAttribute('aria-label', 'Mostrar no Agora');
    f.innerHTML = '<span class="pm-ind" aria-hidden="true"></span>' + TIPOS.filter(function (t) { return t[0] === 'todos' || tem[t[0]]; })
      .map(function (t) { return '<button type="button" data-pm-f="' + t[0] + '" aria-pressed="false">' + t[1] + '</button>'; }).join('');
    var h2 = sec.querySelector('h2'); if (h2) h2.after(f); else sec.prepend(f);
    aplicaF(sec, ses.get('pm.agora', 'todos'), false);
  }
  function aplicaF(sec, k, anima) {
    var f = sec.querySelector('.pm-filtro'); if (!f) return;
    if (!f.querySelector('[data-pm-f="' + k + '"]')) k = 'todos';
    [].forEach.call(f.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.pmF === k)); });
    [].forEach.call(sec.querySelectorAll('.rd-grupos .rd-it'), function (it) { it.classList.toggle('pm-oculto', k !== 'todos' && tipoDe(it) !== k); });
    [].forEach.call(sec.querySelectorAll('details.rd-g'), function (d) {
      var n = d.querySelector('.rd-g-n'), vis = d.querySelectorAll('.rd-it:not(.pm-oculto)').length;
      if (n) { if (!n.dataset.pmN0) n.dataset.pmN0 = n.textContent; n.textContent = k === 'todos' ? n.dataset.pmN0 : String(vis); }
      d.classList.toggle('pm-oculto', k !== 'todos' && !vis);
    });
    sec.classList.toggle('pm-filtrado', k !== 'todos');
    desliza(f, anima);
  }
  function desliza(f, anima) {
    var b = f.querySelector('[aria-pressed="true"]'), ind = f.querySelector('.pm-ind'); if (!b || !ind) return;
    if (!anima || reduz.matches) { ind.style.transition = 'none'; requestAnimationFrame(function () { ind.style.transition = ''; }); }
    ind.style.width = b.offsetWidth + 'px'; ind.style.transform = 'translateX(' + b.offsetLeft + 'px)';
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-pm-f]'); if (!b) return;
    var sec = b.closest('.rd-agora'); ses.set('pm.agora', b.dataset.pmF);
    aplicaF(sec, b.dataset.pmF, ev.detail !== 0);   // pelo teclado (detail 0) troca sem animação
  });

  /* ---------- 2) WhatsApp e Feito na linha do lead (só com mouse) ---------- */
  function acoes(sec) {
    if (!mouse.matches) return;
    [].forEach.call(sec.querySelectorAll('.rd-grupos .rd-it'), function (it) {
      var ab = it.querySelector('[data-lead]'); if (!ab || it.querySelector('.pm-acoes')) return;
      var id = ab.dataset.lead, l = leadDe(id) || {}, nome = l.nome || 'o cliente', tel = numZap(l.telefone);
      var w = document.createElement('span'); w.className = 'pm-acoes'; w.setAttribute('role', 'group'); w.setAttribute('aria-label', 'Ações rápidas');
      w.innerHTML = (tel.length >= 10 ? '<a class="b pm-ac" href="https://wa.me/55' + esc(tel) + '" target="_blank" rel="noopener" aria-label="WhatsApp de ' + esc(nome) + '" title="WhatsApp">' + ic('balao') + '</a>' : '') +
        '<button class="b pm-ac" type="button" data-conversa="lead:' + esc(id) + '" aria-label="Feito: registrar o que foi feito com ' + esc(nome) + '" title="Feito: registrar a conversa">' + ic('feito') + '</button>' +
        '<button class="b pm-ac pm-ac-tx" type="button" data-lead="' + esc(id) + '">Abrir</button>';
      ab.before(w); it.classList.add('pm-com-acoes');
    });
  }

  /* ---------- 3) metas em anéis (preenchem 1x por dia) ---------- */
  function aneis(ini) {
    var lins = ini.querySelectorAll('.rd-metas .mt-lin'); if (!lins.length) return;
    var R = 25, C = 2 * Math.PI * R, primeira = loc.get('pm.aneis', '') !== hoje() && !reduz.matches, alvos = [];
    [].forEach.call(lins, function (lin) {
      if (lin.querySelector('.pm-anel')) return;
      var i = lin.querySelector('.barra-prog i'); if (!i) return;
      var pct = Math.max(0, Math.min(100, parseFloat(i.style.width) || 0)), cor = i.style.background || 'var(--brass)';
      var svg = '<svg class="pm-anel" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="' + R + '" class="pm-anel-t"/><circle cx="30" cy="30" r="' + R + '" class="pm-anel-v" style="stroke:' + esc(cor) +
        ';stroke-dasharray:' + C.toFixed(2) + ';stroke-dashoffset:' + (primeira ? C : C * (1 - pct / 100)).toFixed(2) + '"/><text x="30" y="30" class="pm-anel-p">' + Math.round(pct) + '%</text></svg>';
      var box = document.createElement('div'); box.className = 'pm-anel-box'; box.innerHTML = svg; lin.prepend(box); lin.classList.add('pm-com-anel');
      alvos.push([box.querySelector('.pm-anel-v'), C * (1 - pct / 100)]);
    });
    if (primeira && alvos.length) {
      loc.set('pm.aneis', hoje());
      requestAnimationFrame(function () { requestAnimationFrame(function () { alvos.forEach(function (a) { a[0].classList.add('pm-enche'); a[0].style.strokeDashoffset = a[1].toFixed(2); }); }); });
    }
  }

  /* ---------- 4) agenciamentos em rosca ---------- */
  function rosca(ini) {
    var sec = ini.querySelector('.rd-agenc'); if (!sec || sec.querySelector('.pm-rosca')) return;
    var svg = sec.querySelector('svg[role="img"]'); if (!svg) return;
    var tot = 0; [].forEach.call(sec.querySelectorAll('[data-rd-fx] > span:last-child > b'), function (b) { tot += parseInt(b.textContent, 10) || 0; });
    var w = document.createElement('span'); w.className = 'pm-rosca'; svg.before(w); w.appendChild(svg);
    if (tot) w.insertAdjacentHTML('beforeend', '<span class="pm-rosca-n" aria-hidden="true"><b>' + tot + '</b><small>' + (tot === 1 ? 'imóvel' : 'imóveis') + '</small></span>');
  }

  /* ---------- 5) tarefa feita no Início: aviso com Desfazer ---------- */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.rd-it-tf [data-tf-ok]'), el = document.getElementById('toast'); if (!b || !el) return;
    var id = b.dataset.tfOk, fim = Date.now() + 4000;
    var ob = new MutationObserver(function () {   // espera o aviso do painel (a gravação pode levar um instante)
      if (Date.now() > fim) return ob.disconnect();
      if (el.hidden || el.querySelector('.pm-desfazer')) return;
      ob.disconnect(); if (/não|erro|leitura|permiss/i.test(el.textContent)) return;
      var d = document.createElement('button'); d.type = 'button'; d.className = 'pm-desfazer'; d.textContent = 'Desfazer'; el.appendChild(d);
      try { clearTimeout(toast.h); toast.h = setTimeout(function () { el.hidden = true; }, 5000); } catch (e) { }
      d.addEventListener('click', function () {   // o mesmo botão do painel, de novo: reabre a tarefa
        el.hidden = true; var x = document.createElement('button'); x.type = 'button'; x.hidden = true; x.dataset.tfOk = id; document.body.appendChild(x); x.click(); x.remove();
      });
    });
    ob.observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    setTimeout(function () { ob.disconnect(); }, 4100);
  }, true);

  /* ---------- a cada desenho do Início ---------- */
  function aplica() {
    var ini = document.querySelector('.rd-inicio'); if (!ini || ini.dataset.pm === '1') return;
    ini.dataset.pm = '1';
    var sec = ini.querySelector('.rd-agora'); if (sec) { filtro(sec); acoes(sec); }
    aneis(ini); rosca(ini);
  }
  var pend = false;
  var mo = new MutationObserver(function () { if (pend) return; pend = true; requestAnimationFrame(function () { pend = false; aplica(); }); });
  var liga = function () { mo.observe(document.body, { childList: true, subtree: true }); aplica(); };
  if (document.body) liga(); else document.addEventListener('DOMContentLoaded', liga);
  window.addEventListener('resize', function () { var f = document.querySelector('.rd-agora .pm-filtro'); if (f) desliza(f, false); });
})();
