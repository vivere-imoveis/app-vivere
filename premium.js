/* premium.js — repaginação premium do painel (27/11/2026, tarefa vis-repaginacao-premium-painel, F1b).
   Camada que só ENFEITA o Início já desenhado pelo painel.js (nada se move no HTML original, nada novo é lido do banco):
   1) "Agora": filtro Todos/Leads/Imóveis/Tarefas com indicador que desliza (escolha guardada na aba do navegador);
   2) linha do lead: WhatsApp e Feito aparecem ao passar o mouse (Feito abre o Registrar conversa já com o lead: nada é
      gravado sozinho — escolha do Cleiton, 27/11/2026);
   3) Minhas metas em anéis, que se preenchem só na 1ª abertura do dia;
   4) agenciamentos em rosca, com o total no meio;
   5) tarefa marcada como feita no Início: aviso com Desfazer;
   6) busca rápida Ctrl L / Ctrl K (leads e imóveis já carregados, sem animação), também no alto do menu lateral;
   7) "Combina com seus leads": até 3 imóveis da pauta que batem com mais leads, com Enviar (a mesma oferta da aba Ofertas).
   Usa só o que o painel.js expõe em window.PAINEL_PM (S, zapNum, toast, brl, ofertas), sempre com teste antes. ?premium=0 desliga no aparelho. */
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
  var PM = function () { return window.PAINEL_PM || {}; };   // ponte do painel.js (trocas-premium-f1)
  var Sx = function () { return PM().S || null; };
  var leadDe = function (id) { var S = Sx(); return (S && S.leads && S.leads[id]) || null; };
  var numZap = function (t) { try { if (typeof PM().zapIntl === 'function') return PM().zapIntl(t); if (typeof PM().zapNum === 'function') return '55' + PM().zapNum(t); } catch (e) { } var d = String(t || '').replace(/\D/g, ''); if (d.indexOf('55') === 0 && d.length >= 12) d = d.slice(2); return d.replace(/^0+/, ''); };

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
    var g0 = ses.get('pm.agora', 'todos'); aplicaF(sec, ['todos', 'leads', 'imoveis', 'tarefas'].indexOf(g0) >= 0 ? g0 : 'todos', false);
  }
  function aplicaF(sec, k, anima) {
    var f = sec.querySelector('.pm-filtro'); if (!f) return;
    if (['todos', 'leads', 'imoveis', 'tarefas'].indexOf(k) < 0 || !f.querySelector('[data-pm-f="' + k + '"]')) k = 'todos';
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
      w.innerHTML = (tel.length >= 10 ? '<a class="b pm-ac" href="https://wa.me/' + esc(tel) + '" target="_blank" rel="noopener" aria-label="WhatsApp de ' + esc(nome) + '" title="WhatsApp">' + ic('balao') + '</a>' : '') +
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
    if (tot) w.insertAdjacentHTML('beforeend', '<span class="pm-rosca-n" aria-hidden="true"><b>' + tot.toLocaleString('pt-BR') + '</b><small>' + (tot === 1 ? 'imóvel' : 'imóveis') + '</small></span>');
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
      try { var tt = PM().toast; if (tt) { clearTimeout(tt.h); tt.h = setTimeout(function () { el.hidden = true; }, 6000); } } catch (e) { }
      d.addEventListener('click', function () {   // o mesmo botão do painel, de novo: reabre a tarefa
        el.hidden = true; var x = document.createElement('button'); x.type = 'button'; x.hidden = true; x.dataset.tfOk = id; document.body.appendChild(x); x.click(); x.remove();
      });
    });
    ob.observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    setTimeout(function () { ob.disconnect(); }, 4100);
  }, true);

  /* ---------- 6) busca rápida Ctrl K (F1c): lead ou imóvel de qualquer tela, sem animação ---------- */
  var semAc = function (t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var BK = { el: null, res: [], i: 0 };
  var donoDe = function (l) { try { var p = l._dono && Sx().G && Sx().G.paineis && Sx().G.paineis[l._dono]; return p ? String(p.curto || p.nome || '') : ''; } catch (e) { return ''; } };   // gestor: dois leads com o mesmo nome em painéis diferentes
  var ROT_INT = { comprador: 'Comprador', locatario_anual: 'Locatário anual', locatario_temporada: 'Locatário temporada', vendedor: 'Vendedor', locador_anual: 'Locador anual', locador_temporada: 'Locador temporada' };   // os mesmos rótulos de INTERESSES do painel.js (a_definir fica de fora)
  function bkIndice() {
    var out = [], S = Sx() || {};
    try {
      Object.keys(S.leads || {}).forEach(function (id) { var l = S.leads[id] || {}, nm = String(l.nome || '').trim(); if (!nm && !l.telefone && !l.email) return;
        out.push({ t: 'lead', id: id, a: nm || 'Lead sem nome', b: [donoDe(l), l.etapa, ROT_INT[l.interesse] || '', String(l.telefone || '') || String(l.email || '')].filter(Boolean).join(' · '),
          k: semAc([nm, l.telefone, String(l.telefone || '').replace(/\D/g, ''), l.email, l.etapa, ROT_INT[l.interesse]].join(' ')) }); });
      Object.keys(S.meus || {}).forEach(function (id) { var m = S.meus[id] || {};
        out.push({ t: 'imv', id: id, a: (m.ref || id) + (m.bairro ? ' · ' + m.bairro : ''), b: [m.tipo, m.edificio, m.logradouro || m.end].filter(Boolean).join(' · '),
          k: semAc([m.ref, id, m.bairro, m.edificio, m.logradouro, m.end, m.tipo].join(' ')) }); });
    } catch (e) { }
    return out;
  }
  function bkPinta() {
    var q = semAc(BK.el.querySelector('input').value).trim(), toks = q.split(/\s+/).filter(Boolean), lista = BK.el.querySelector('.pm-k-lista');
    var todos = toks.length ? BK.idx.filter(function (x) { return toks.every(function (t) { return x.k.indexOf(t) >= 0; }); }) : [];
    BK.res = todos.slice(0, 8); var mais = todos.length - BK.res.length;   // acima de 8: avisa quantos ficaram de fora (decisão do Cleiton, 27/11/2026)
    BK.i = Math.min(BK.i, Math.max(0, BK.res.length - 1));
    var inp0 = BK.el.querySelector('input'); if (BK.res.length) inp0.setAttribute('aria-activedescendant', 'pm-k-op' + BK.i); else inp0.removeAttribute('aria-activedescendant');
    lista.innerHTML = BK.res.length ? BK.res.map(function (x, n) {
      return '<button type="button" role="option" id="pm-k-op' + n + '" class="pm-k-it' + (n === BK.i ? ' on' : '') + '" aria-selected="' + (n === BK.i) + '" data-pm-k="' + n + '"><span class="pm-k-ic">' + ic(x.t === 'lead' ? 'pessoas' : 'predio') + '</span><span class="pm-k-tx"><b' + (x.t === 'lead' ? ' class="sens"' : '') + '>' + esc(x.a) + '</b><span' + (x.t === 'lead' ? ' class="sens"' : '') + '>' + esc(x.b) + '</span></span><span class="pm-k-tp">' + (x.t === 'lead' ? 'Lead' : 'Imóvel') + '</span></button>';
    }).join('') + (mais > 0 ? '<p class="pm-k-mais">e mais ' + mais.toLocaleString('pt-BR') + ' — refine a busca</p>' : '') : '<p class="pm-k-vazio">' + (toks.length ? 'Nada encontrado nos seus leads e imóveis.' : 'Digite o nome, o telefone, o código ou o bairro.') + '</p>';
  }
  function bkAbre() {
    if (!Sx()) return;
    if (!BK.el) {
      BK.el = document.createElement('div'); BK.el.id = 'pm-k'; BK.el.hidden = true;
      BK.el.innerHTML = '<div class="pm-k-fundo" data-pm-k-fecha></div><div class="pm-k-caixa" role="dialog" aria-modal="true" aria-label="Busca rápida"><div class="pm-k-campo">' + ic('lupa') +
        '<input type="search" autocomplete="off" spellcheck="false" placeholder="Buscar lead ou imóvel" aria-label="Buscar lead ou imóvel" aria-controls="pm-k-lista" role="combobox" aria-expanded="true"><kbd>Esc</kbd></div><div class="pm-k-lista" id="pm-k-lista" role="listbox"></div></div>';
      document.body.appendChild(BK.el);
      BK.el.querySelector('input').addEventListener('input', function () { BK.i = 0; bkPinta(); });
    }
    BK.volta = document.activeElement; BK.idx = bkIndice(); BK.i = 0; BK.el.hidden = false; var inp = BK.el.querySelector('input'); inp.value = ''; bkPinta(); inp.focus();
  }
  function bkFecha() { if (BK.el && !BK.el.hidden) { BK.el.hidden = true; try { if (BK.volta && BK.volta.isConnected) BK.volta.focus({ preventScroll: true }); } catch (e) { } } }
  function bkVai(n) {
    var x = BK.res[n]; if (!x) return; bkFecha();
    var b = document.createElement('button'); b.type = 'button'; b.hidden = true;
    if (x.t === 'lead') b.dataset.lead = x.id; else b.dataset.abre = 'meu:' + x.id;
    document.body.appendChild(b); b.click(); b.remove();
  }
  document.addEventListener('keydown', function (ev) {
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey && /^[kl]$/i.test(ev.key)) {   // Ctrl L (pedido do Cleiton, 27/11/2026) e Ctrl K abrem a busca rápida
      if ([].some.call(document.querySelectorAll('[aria-modal="true"]:not(.pm-k-caixa)'), function (g) { return g.offsetParent !== null || g.getClientRects().length; })) return;   // com uma gaveta visível aberta, não abre por cima
      ev.preventDefault(); if (BK.el && !BK.el.hidden) bkFecha(); else bkAbre(); return;
    }
    if (!BK.el || BK.el.hidden) return;
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); bkFecha(); }
    else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); if (BK.res.length) { BK.i = (BK.i + (ev.key === 'ArrowDown' ? 1 : BK.res.length - 1)) % BK.res.length; bkPinta(); } }
    else if (ev.key === 'Enter') { ev.preventDefault(); bkVai(BK.i); }
  }, true);
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-pm-k],[data-pm-k-fecha],[data-pm-k-abre]'); if (!t) return;
    if (t.hasAttribute('data-pm-k-abre')) return bkAbre();
    if (t.hasAttribute('data-pm-k-fecha')) return bkFecha();
    bkVai(+t.dataset.pmK);
  });
  function atalhoMenu() {   // no menu lateral do computador: "Buscar · Ctrl K"
    var ml = document.getElementById('ml'); if (!ml || ml.querySelector('.pm-k-atalho')) return;
    var topo = ml.querySelector('.ml-topo'); if (!topo) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pm-k-atalho'; b.setAttribute('data-pm-k-abre', ''); b.title = 'Busca rápida (Ctrl L ou Ctrl K)';
    b.innerHTML = ic('lupa') + '<span class="ml-tx">Buscar</span><kbd class="ml-tx">Ctrl L</kbd>'; topo.after(b);
  }

  /* ---------- 7) Combina com seus leads (F1c): imóveis da pauta que batem com mais leads seus, com Enviar ---------- */
  function combina(ini) {
    var P = PM(), S = P.S; if (ini.querySelector('.pm-combina') || !S || typeof P.leadsComOfertas !== 'function' || typeof P.opsCache !== 'function') return;
    var por = {};
    try {
      if (S.opsAquecendo) { var tent = +(ini.dataset.pmCb || 0); if (tent < 20) { ini.dataset.pmCb = tent + 1; setTimeout(function () { if (ini.isConnected) combina(ini); }, 1500); } return; }   // ofertas ainda sendo calculadas: tenta de novo
      P.leadsComOfertas().forEach(function (par) { var id = par[0], l = par[1], o = P.opsCache(id, l) || {};
        (o.novas || []).forEach(function (x) { var it = x.it || {}; if (!it.id || it.origem !== 'site') return; var g = por[it.id] || (por[it.id] = { it: it, leads: [] }); g.leads.push([id, l, x]); }); });
    } catch (e) { return; }
    var top = Object.keys(por).map(function (k) { return por[k]; }).sort(function (a, b) { return b.leads.length - a.leads.length; }).slice(0, 3);
    if (!top.length) return;
    var brlF = function (v) { try { return typeof P.brl === 'function' ? P.brl(v) : ''; } catch (e) { return ''; } };
    var src = function (id) { try { return typeof P.capaSrc === 'function' ? P.capaSrc(id) : ''; } catch (e) { return ''; } };
    var nomeC = function (n) { var p = (String(n || '').trim() || 'Lead').split(/\s+/); return p.length > 1 ? p[0] + ' ' + p[p.length - 1].charAt(0) + '.' : p[0]; };
    var its = top.map(function (g, n) { var it = g.it, f = src(it.id), l1 = g.leads[0][1] || {};
      return '<div class="rd-it pm-cb-it"><span class="pm-cb-capa">' + (f ? '<img src="' + esc(f) + '" alt="" loading="lazy">' : ic('predio')) + '</span><div class="rd-it-t"><b>' + esc(it.ref || '') + (it.valor ? ' · ' + esc(brlF(it.valor)) : '') + '</b><span>Combina com <em class="sens pm-cb-n">' + esc(nomeC(l1.nome)) + '</em>' +
        (g.leads.length > 1 ? ' e mais ' + (g.leads.length - 1).toLocaleString('pt-BR') + (g.leads.length === 2 ? ' lead seu' : ' leads seus') : '') + (it.bairro ? ' · ' + esc(it.bairro) : '') + '</span></div><button class="b" type="button" data-pm-cb="' + n + '" aria-label="Enviar ' + esc(it.ref || 'imóvel') + '" title="Enviar">' + ic('enviar') + '<span class="pm-cb-tx">Enviar</span></button></div>'; }).join('');
    var sec = document.createElement('section'); sec.className = 'pm-combina'; sec.setAttribute('aria-labelledby', 'pmCbT'); sec._top = top;
    sec.innerHTML = '<div class="painel"><h2 id="pmCbT">Combina com seus leads <small>imóveis da pauta que batem com o perfil</small></h2>' + its + '</div>';
    var col = ini.querySelector('.rd-col1'); if (col) col.appendChild(sec);
  }
  document.addEventListener('click', function (ev) {   // Enviar: a mesma oferta da aba Ofertas, lead a lead (WhatsApp com a mensagem pronta)
    var b = ev.target.closest && ev.target.closest('[data-pm-cb]'); if (!b) return;
    var sec = b.closest('.pm-combina'), g = sec && sec._top && sec._top[+b.dataset.pmCb]; if (!g || typeof PM().htmlOferta !== 'function') return;
    var gv = document.getElementById('pm-cb-gaveta'); if (gv) gv.remove();
    gv = document.createElement('div'); gv.id = 'pm-cb-gaveta';
    gv.innerHTML = '<div class="pm-k-fundo" data-pm-cb-fecha></div><div class="gaveta pm-cb-g" role="dialog" aria-modal="true" aria-label="Enviar ' + esc(g.it.ref || 'imóvel') + '"><div class="cab"><div><p class="mut peq" style="margin:0">Enviar aos leads que combinam</p><h3>' + esc(g.it.ref || 'Imóvel') + '</h3></div><button class="b" type="button" data-pm-cb-fecha>Fechar</button></div>' +
      g.leads.map(function (x) { var h = ''; try { h = PM().htmlOferta(x[0], x[2]); } catch (e) { h = ''; } return '<div class="pm-cb-lead"><p class="pm-cb-nome sens">' + esc(String((x[1] || {}).nome || '').trim() || 'Lead') + '</p>' + h + '</div>'; }).join('') + '</div>';
    document.body.appendChild(gv);
    var f = gv.querySelector('[data-pm-cb-fecha]'); if (f) f.focus();
  });
  document.addEventListener('click', function (ev) { var t = ev.target.closest && ev.target.closest('[data-pm-cb-fecha]'); if (t) { var g = document.getElementById('pm-cb-gaveta'); if (g) g.remove(); } });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { var g = document.getElementById('pm-cb-gaveta'); if (g) { g.remove(); ev.stopPropagation(); } } }, true);

  /* ---------- F2 · celular (body.nc-on): próxima ação em 1 toque e gavetas como folha que sobe de baixo (todas, escolha do Cleiton 27/11 20h40) ---------- */
  var cel = function () { return document.body && document.body.classList.contains('nc-on'); };
  function ac1() {   // WhatsApp ao lado do Abrir, na linha do lead do Agora (toque; com mouse já há as ações do hover)
    if (mouse.matches || !cel()) return;
    [].forEach.call(document.querySelectorAll('.rd-agora .rd-it [data-lead]'), function (ab) {
      var it = ab.closest('.rd-it'); if (!it || it.querySelector('.pm-ac1')) return;
      var id = ab.dataset.lead, l = leadDe(id) || {}, tel = numZap(l.telefone); if (tel.length < 10) return;
      var a = document.createElement('a'); a.className = 'b pm-ac1'; a.href = 'https://wa.me/' + tel; a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', 'WhatsApp de ' + (l.nome || 'o cliente')); a.title = 'WhatsApp'; a.innerHTML = ic('balao');
      ab.before(a);
    });
  }
  var FO = { el: null };
  function recuo(liga) {
    var b = document.body; if (!b) return;
    if (liga) { [].forEach.call(document.querySelectorAll('body > header.topo, body > .wrap'), function (e) { e.style.setProperty('--pm-oy', Math.round(innerHeight / 2 - e.getBoundingClientRect().top) + 'px'); }); b.classList.add('pm-recua'); }
    else if (b.classList.contains('pm-recua')) { b.classList.remove('pm-recua'); }
  }
  function folha() {
    var g = cel() && document.querySelector('#sobre > .sobre > .gaveta');
    if (!g) { if (FO.el) { FO.el = null; recuo(false); } return; }
    if (FO.el === g) return;
    var ja = !!FO.el && FO.el.getAttribute('aria-label') === g.getAttribute('aria-label'); FO.el = g; g.parentElement.classList.add('pm-folha'); if (ja) g.parentElement.classList.add('pm-ja');   // redesenho da mesma folha: sem subir de novo
    if (!g.querySelector('.pm-alca')) { var h = document.createElement('button'); h.type = 'button'; h.className = 'pm-alca'; h.setAttribute('aria-label', 'Fechar (ou arraste para baixo)'); g.prepend(h); }
    requestAnimationFrame(function () { recuo(true); });
  }
  function fechaFolha(g) { var f = g.querySelector('[data-fechar]'); if (f) f.click(); else if (g.parentElement) g.parentElement.click(); setTimeout(function () { if (g.isConnected) { g.classList.add('pm-solta'); g.style.transform = ''; recuo(true); } }, 60); }
  var AR = null;
  document.addEventListener('pointerdown', function (ev) {
    var g = ev.target.closest && ev.target.closest('.pm-folha > .gaveta'); if (!g || ev.button > 0) return;
    if (!ev.target.closest('.pm-alca') && !(ev.target.closest('.cab') && !ev.target.closest('button,a,input,select,textarea'))) return;
    AR = { g: g, y0: ev.clientY, dy: 0, pts: [[ev.clientY, ev.timeStamp]], id: ev.pointerId, moveu: false };
    try { ev.target.setPointerCapture(ev.pointerId); } catch (e) { }
    g.classList.remove('pm-solta'); g.classList.add('pm-arrasta');
  });
  document.addEventListener('pointermove', function (ev) {
    if (!AR || ev.pointerId !== AR.id) return;
    var dy = ev.clientY - AR.y0; AR.dy = dy > 0 ? dy : dy / 4;   // para cima, resiste
    if (Math.abs(dy) > 4) AR.moveu = true;
    AR.pts.push([ev.clientY, ev.timeStamp]); if (AR.pts.length > 5) AR.pts.shift();
    AR.g.style.transform = 'translateY(' + AR.dy + 'px)';
    AR.g.parentElement.style.background = 'rgba(8,11,18,' + Math.max(0, .42 * (1 - AR.dy / AR.g.offsetHeight)).toFixed(3) + ')';
  });
  function soltaArrasto(ev) {
    if (!AR || (ev && ev.pointerId !== AR.id)) return;
    var a = AR; AR = null; var g = a.g, p = a.pts, v = 0;
    if (p.length > 1) { var u = p[p.length - 1], q = p[0]; v = (u[0] - q[0]) / Math.max(1, u[1] - q[1]); }   // px por ms
    g.classList.remove('pm-arrasta'); g.classList.add('pm-solta'); g.parentElement.style.background = '';
    if (!a.moveu && ev && ev.target.closest && ev.target.closest('.pm-alca')) { g.style.transform = ''; fechaFolha(g); return; }   // toque na alça: fecha
    if (a.dy > g.offsetHeight * .3 || (v > .11 && a.dy > 24)) {   // velocidade: um peteleco basta (padrão do Emil, ~0,11 px/ms)
      g.style.transform = 'translateY(100%)'; recuo(false);
      var feito = false, vai = function () { if (feito) return; feito = true; fechaFolha(g); };
      g.addEventListener('transitionend', vai, { once: true }); setTimeout(vai, 460);
    } else g.style.transform = '';
  }
  document.addEventListener('pointerup', soltaArrasto); document.addEventListener('pointercancel', soltaArrasto);

  /* ---------- F3 · comum a todas as abas (pedidos do Cleiton, 27/11/2026 21h): "Todos" primeiro, seções que se recolhem, busca em etiquetas ---------- */
  var ehTodos = function (b) { return /^tod[ao]s\b/i.test((b.textContent || '').trim()); };
  function todosPrimeiro(raiz) {
    [].forEach.call(raiz.querySelectorAll('.chips, .filtros'), function (f) {
      var bts = [].filter.call(f.children, function (x) { return x.tagName === 'BUTTON'; }); if (bts.length < 2) return;
      var t = bts.filter(ehTodos)[0]; if (t && t !== bts[0]) bts[0].before(t);
    });
  }
  var gS = guarda('localStorage');
  var REC = (function () { try { return JSON.parse(gS.get('painel-recolhidos', '{}')) || {}; } catch (e) { return {}; } })();
  var salvaRec = function () { gS.set('painel-recolhidos', JSON.stringify(REC)); };
  var abaAtual = function () { var a = document.querySelector('nav.abas [aria-selected="true"]'); return a ? a.textContent.trim().replace(/\s*\d[\d.]*$/, '') : ''; };
  var tituloDe = function (h) { var c = h.cloneNode(true); [].forEach.call(c.querySelectorAll('button,.badge,.pill,small'), function (x) { x.remove(); }); return c.textContent.replace(/\(\d+\)|\d+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80); };
  var irmaos = function (h) {
    var cab = h.parentElement && h.parentElement.matches('section.sec > div:first-child') ? h.parentElement : null;   // título no cabeçalho de uma seção: recolhe o resto da seção
    if (cab) { var R = [], m = cab.nextElementSibling; while (m) { R.push(m); m = m.nextElementSibling; } return R; }
    var L = [], n = h.nextElementSibling; while (n && !n.matches('h2,.pm-tudo')) { L.push(n); n = n.nextElementSibling; } return L; };
  function pinta(h, f) {
    irmaos(h).forEach(function (x) { x.classList.toggle('pm-recolhido', f); });
    var b = h.querySelector('.pm-rec'); if (b) { b.setAttribute('aria-expanded', String(!f)); b.setAttribute('aria-label', (f ? 'Abrir ' : 'Recolher ') + tituloDe(h)); }
    h.classList.toggle('pm-h-fechado', f);
  }
  function secoes() {
    var c = document.getElementById('conteudo'), aba = abaAtual(); if (!c) return;
    var varias = document.querySelectorAll('#conteudo section.sec').length >= 2;   // a seção que é a página inteira da aba não se recolhe
    var hs = [].filter.call(document.querySelectorAll('#conteudo .painel > h2, #sobre .painel > h2' + (varias ? ', #conteudo section.sec > div:first-child > h2:first-child' : '')), function (h) { return irmaos(h).length && tituloDe(h); });
    hs.forEach(function (h) {
      var k = (h.closest('#sobre') ? 'gaveta' : aba) + '|' + tituloDe(h); h.dataset.pmK = k;
      if (!h.querySelector('.pm-rec')) { var b = document.createElement('button'); b.type = 'button'; b.className = 'pm-rec'; b.title = 'Recolher ou abrir esta parte';
        b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'; h.appendChild(b); }
      var f = !!REC[k]; if (h.classList.contains('pm-h-fechado') !== f || irmaos(h).some(function (x) { return x.classList.contains('pm-recolhido') !== f; })) pinta(h, f);
    });
    var doc = hs.filter(function (h) { return !h.closest('#sobre'); }), bar = c.querySelector(':scope > .pm-tudo');
    if (doc.length < 2) { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.className = 'pm-tudo'; bar.innerHTML = '<button type="button" class="b" data-pm-tudo="1"></button>'; c.prepend(bar); }
    var todosF = doc.every(function (h) { return REC[h.dataset.pmK]; }), b0 = bar.firstChild, tx = todosF ? 'Abrir tudo' : 'Recolher tudo';
    if (b0.textContent !== tx) { b0.textContent = tx; b0.dataset.pmTudo = todosF ? 'abrir' : 'recolher'; }
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.pm-rec, [data-pm-tudo]'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    if (b.classList.contains('pm-rec')) { var h = b.parentElement, k = h.dataset.pmK, f = !REC[k]; if (f) REC[k] = 1; else delete REC[k]; pinta(h, f); }
    else { var fecha = b.dataset.pmTudo === 'recolher'; [].forEach.call(document.querySelectorAll('#conteudo h2[data-pm-k]'), function (h) { if (fecha) REC[h.dataset.pmK] = 1; else delete REC[h.dataset.pmK]; pinta(h, fecha); }); }
    salvaRec(); secoes();
  }, true);
  function reguas() {   // quadros grandes só no Início (regra de 22/11/2026): fora dele os cartões viram uma régua de uma linha
    var naInicio = /in[ií]cio/i.test(abaAtual());
    [].forEach.call(document.querySelectorAll('#conteudo .cartoes'), function (g) {
      var ok = !naInicio && !g.closest('.rd-inicio') && g.children.length >= 2 && [].every.call(g.children, function (x) { return x.matches('.cartao'); });
      g.classList.toggle('pm-regua', ok);
      if (ok) [].forEach.call(g.querySelectorAll('.r,.s'), function (x) { if (!x.title) x.title = x.textContent.replace(/\s+/g, ' ').trim(); });
    });
  }
  var termos = function (v) { return String(v || '').split(/[;\n]|,(?!\d)|(?<!\d),|(?<=[A-Za-zÀ-ÿ]\d*),/).map(function (t) { return t.trim(); }).filter(Boolean); };
  function etiquetas(inp) {
    if (!inp || !inp.id) return; var L = termos(inp.value), box = inp.parentElement && inp.parentElement.querySelector(':scope > .pm-chips[data-para="' + inp.id + '"]');
    if (L.length < 2) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.className = 'pm-chips'; box.dataset.para = inp.id; box.setAttribute('aria-label', 'Termos da busca'); }
    var ref = inp.nextElementSibling && inp.nextElementSibling.classList.contains('vz') ? inp.nextElementSibling : inp; if (ref.nextElementSibling !== box) ref.after(box);
    var h = L.map(function (t, i) { var e = esc(t); return '<span class="pm-chip">' + e + '<button type="button" data-pm-tira="' + i + '" aria-label="Tirar ' + e + ' da busca">×</button></span>'; }).join('');
    if (box._h !== h) { box._h = h; box.innerHTML = h; }
  }
  document.addEventListener('input', function (ev) { var t = ev.target; if (t && t.matches && t.matches('input[type="search"][id]')) etiquetas(t); }, true);
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-pm-tira]'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    var box = b.closest('.pm-chips'), inp = box && document.getElementById(box.dataset.para); if (!inp) return;
    var L = termos(inp.value); L.splice(+b.dataset.pmTira, 1); inp.value = L.join(', ');
    inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
    try { inp.focus({ preventScroll: true }); } catch (e) { }
  }, true);

  /* ---------- F5b · Leads e Tarefas (27/11/2026): número do Funil numa coluna própria; etiquetas de prioridade e situação ---------- */
  function funilNums() {   // a barra fica proporcional desde a mesma linha; o número sai da barra (não some quando ela é curta)
    [].forEach.call(document.querySelectorAll('#conteudo .vf:not(.pm-vf)'), function (vf) {
      [].forEach.call(vf.querySelectorAll('.vf-l'), function (l) {
        var b = l.querySelector('.vf-bar > b'); if (!b || l.querySelector('.pm-vf-n')) return;
        var n = parseInt(b.textContent, 10), s = document.createElement('span'); s.className = 'pm-vf-n'; s.textContent = isNaN(n) ? b.textContent : n.toLocaleString('pt-BR'); l.appendChild(s);
      });
      vf.classList.add('pm-vf');
    });
  }
  function milhares() {   // contadores do Kanban, da Agenda e do Pipeline com ponto de milhar (1.284), como no resto do painel
    [].forEach.call(document.querySelectorAll('#conteudo :is(.vk-cab, .va-cab, .vp-n) > b:not([data-pm-n])'), function (b) {
      b.setAttribute('data-pm-n', ''); var t = b.textContent.trim(); if (/^\d{4,}$/.test(t)) b.textContent = (+t).toLocaleString('pt-BR');
    });
  }
  var PRI_TX = { 'alta': 'alta', 'média': 'media', 'media': 'media', 'baixa': 'baixa' }, SIT_TX = { 'atrasada': 'atr', 'hoje': 'hoje' };
  function tfEtiquetas() {   // só na aba Tarefas: a prioridade vira etiqueta de contorno; "Atrasada" fica coral e "Hoje" em latão
    var f = document.querySelector('#conteudo section.sec > .chips > [data-tf-filtro]'), sec = f && f.parentElement.parentElement; if (!sec) return;
    [].forEach.call(sec.querySelectorAll('.pill:not([data-pm-et])'), function (p) {
      var t = (p.textContent || '').trim().toLowerCase(); p.setAttribute('data-pm-et', '');
      if (PRI_TX[t]) p.classList.add('pm-pri', 'pm-pri-' + PRI_TX[t]); else if (SIT_TX[t]) p.classList.add('pm-sit', 'pm-sit-' + SIT_TX[t]);
    });
  }


  /* ---------- F6 · Meus imóveis (27/11/2026): atualização dos agenciamentos em rosca, com o total no meio ---------- */
  function agencRosca() {
    [].forEach.call(document.querySelectorAll('#conteudo .painel > svg[aria-label="Atualização dos agenciamentos"]'), function (svg) {
      if (svg.closest('.rd-agenc') || svg.parentElement.classList.contains('pm-rosca')) return;
      var box = svg.parentElement, tot = 0;
      [].forEach.call(box.querySelectorAll('[data-fm^="fx|"] > span:last-child > b'), function (b) { tot += parseInt(b.textContent, 10) || 0; });
      box.classList.add('pm-agenc');
      var w = document.createElement('span'); w.className = 'pm-rosca'; svg.before(w); w.appendChild(svg);
      if (tot) w.insertAdjacentHTML('beforeend', '<span class="pm-rosca-n" aria-hidden="true"><b>' + tot.toLocaleString('pt-BR') + '</b><small>' + 'no site' + '</small></span>');
    });
  }

  /* ---------- a cada desenho do Início ---------- */
  function aplica() {
    atalhoMenu(); folha(); ac1(); todosPrimeiro(document.body); secoes(); reguas(); funilNums(); milhares(); tfEtiquetas(); agencRosca(); [].forEach.call(document.querySelectorAll('input[type="search"][id]'), etiquetas);
    var ini = document.querySelector('.rd-inicio'); if (!ini || ini.dataset.pm === '1') return;
    ini.dataset.pm = '1';
    var sec = ini.querySelector('.rd-agora'); if (sec) { filtro(sec); acoes(sec); }
    aneis(ini); rosca(ini); combina(ini);
  }
  var pend = false;
  var mo = new MutationObserver(function () { if (pend) return; pend = true; requestAnimationFrame(function () { pend = false; aplica(); }); });
  var liga = function () { mo.observe(document.body, { childList: true, subtree: true }); aplica(); };
  if (document.body) liga(); else document.addEventListener('DOMContentLoaded', liga);
  window.addEventListener('resize', function () { var f = document.querySelector('.rd-agora .pm-filtro'); if (f) desliza(f, false); });
})();
