/* painel-app.js — ajustes de comportamento do painel dentro do app da Vivere (fatia 5 O, 10/11/2026).
   A CAPTAR fora do menu de abas (pedido do Cleiton): ele abre outra página do app, então ganha um botão próprio no
   cabeçalho, separado das abas (a aba fica escondida pelo painel-app.css). O painel.js do modelo segue igual: este
   arquivo só cria o botão, copia para ele o nº de imóveis livres que o painel já calcula na aba escondida e abre o
   A CAPTAR na mesma janela, guardando o caminho de volta ao painel. */
(function () {
  'use strict';
  var URL_ACAP = 'index.html?aba=acaptar';
  var vivo = null; // 11/11/2026: nº de livres lido na hora do Supabase pela ponte; sem ele, vale o número da aba escondida
  function lerVivo() { var P = window.VIVERE_PONTE; if (!P || !P.acaptarLivres) return; P.acaptarLivres().then(function (n) { vivo = n; pinta(); }).catch(function () { }); }
  /* 22/11/2026 (pedido do Cleiton): A CAPTAR, Estudo de Mercado, Minha senha, Acessos e HUB abrem numa janela dentro do
     painel, sem sair dele. Só no app: no PAINEL DO GESTOR do claude.ai (window.__artefatoLoja) seguem abrindo fora. */
  var DENTRO = !window.__artefatoLoja;
  function embutivel(href) { return DENTRO && /^(index\.html\?aba=|hub\/)/.test(href || ''); }
  var NOMES = { acaptar: 'A CAPTAR', acm: 'Estudo de Mercado', senha: 'Minha senha', seguranca: 'Segurança (2FA)', acessos: 'Acessos', semresp: 'Imóveis sem responsável', destaques: 'Destaques' };
  function fechaDentro() { var f = fechaAba(); var ov = document.getElementById('app-dentro'); if (!ov) return f; ov.remove(); document.documentElement.classList.remove('com-janela'); lerVivo(); return true; }
  /* 22/11/2026 (pedido do Cleiton: "tudo dentro de um único aplicativo"): Pendências, Prazos da Vivere, Vistorias, Estudo de
     Mercado, A CAPTAR, Sem responsável, Minha senha e Acessos abrem como ABA NORMAL na área de conteúdo — mesmo lugar das
     outras abas, item marcado no menu, sem janela por cima e sem "Fechar". Tocar em qualquer aba do painel volta a ele.
     Só o HUB VIVERE continua à parte (outro artefato). */
  var ABA = { id: '', fecha: null };
  var BTN_ABA = { acaptar: 'btnAcapApp', acm: 'btnAcmApp', pendencias: 'btnPendApp', vistorias: 'btnVistApp', prazos: 'btnPrazosApp', senha: 'btnSenhaApp', seguranca: 'btnSegApp', acessos: 'btnAcessosApp' };
  function hostAba() {
    var h = document.getElementById('aba-app');
    if (!h) { var c = document.getElementById('conteudo'); if (!c || !c.parentNode) return null; h = document.createElement('section'); h.id = 'aba-app'; h.setAttribute('role', 'tabpanel'); h.hidden = true; c.parentNode.insertBefore(h, c.nextSibling); }
    return h;
  }
  function marcaAba() {
    Object.keys(BTN_ABA).forEach(function (k) { var b = document.getElementById(BTN_ABA[k]); if (!b) return; if (ABA.id === k) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (window.MenuLateral) MenuLateral.atualiza();
    try { document.dispatchEvent(new CustomEvent('vivere:aba-app', { detail: { aba: ABA.id } })); } catch (e) { }
  }
  function fechaAba() {
    if (!ABA.id) return false;
    var f = ABA.fecha; ABA.id = ''; ABA.fecha = null;
    try { if (f) f(); } catch (e) { }
    var h = document.getElementById('aba-app'); if (h) { h.innerHTML = ''; h.hidden = true; }
    document.documentElement.classList.remove('com-aba-app'); delete document.documentElement.dataset.abaApp;
    marcaAba(); lerVivo(); return true;
  }
  function abreAba(id, titulo, aoFechar, comTitulo) {
    fechaAba();
    var ov = document.getElementById('app-dentro'); if (ov) { ov.remove(); document.documentElement.classList.remove('com-janela'); }
    var h = hostAba(); if (!h) return null;
    h.hidden = false; h.dataset.aba = id; h.setAttribute('aria-label', titulo);
    h.innerHTML = (comTitulo ? '<h2 class="aba-app-t"></h2>' : '') + '<div class="aba-app-corpo"></div>';
    if (comTitulo) h.querySelector('.aba-app-t').textContent = titulo;
    ABA.id = id; ABA.fecha = aoFechar || null;
    document.documentElement.classList.add('com-aba-app'); document.documentElement.dataset.abaApp = id;
    try { scrollTo({ top: 0 }); } catch (e) { scrollTo(0, 0); }
    marcaAba();
    return h.querySelector('.aba-app-corpo');
  }
  function abreAbaApp(id) {
    if (NATIVO[id]) return ir('index.html?aba=' + id);   /* 23/11/2026: ir() decide entre nativo, janela e link de fora (Segurança no Gestor) */
    if (id === 'pendencias' && window.PAINEL_ABA && window.PAINEL_IR && PAINEL_ABA() !== 'tarefas') return PAINEL_IR('pendencias');   /* tarefas-prazos: abre como sub-aba de Tarefas */
    if (id === 'pendencias' && window.PENDENCIAS && PENDENCIAS.abrirEm) { var c1 = abreAba('pendencias', 'Pendências', function () { PENDENCIAS.sairDaAba(); }); if (c1) { PENDENCIAS.abrirEm(c1); subsNaAba(document.getElementById('aba-app'), 'pendencias'); } return; }
    if (id === 'vistorias' && window.VistoriaApp && VistoriaApp.abrirEm) { var c2 = abreAba('vistorias', 'Vistorias', function () { VistoriaApp.sairDaAba(); }); if (c2) VistoriaApp.abrirEm(c2); return; }
    if (id === 'prazos' && window.VIVERE_RD && VIVERE_RD.htmlPrazos) { var c3 = abreAba('prazos', 'Prazos da Vivere'); if (c3) c3.innerHTML = VIVERE_RD.htmlPrazos(); return; }
  }
  window.ABA_APP = { abre: abreAbaApp, fecha: fechaAba, atual: function () { return ABA.id; } };
  function abreDentro(href) {
    var aba = (/aba=([a-z]+)/.exec(href) || [])[1], t = /^hub\//.test(href) ? 'HUB VIVERE' : (NOMES[aba] || 'App');
    var ov = document.getElementById('app-dentro');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'app-dentro'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'false');
      ov.innerHTML = '<div class="ad-barra"><b class="ad-t"></b><a class="ad-fora" target="_blank" rel="noopener" title="Abrir numa aba nova">Abrir numa aba</a><button type="button" class="b ad-x">✕ Fechar</button></div><iframe class="ad-f"></iframe>';
      ov.querySelector('.ad-x').addEventListener('click', fechaDentro);
      document.body.appendChild(ov);
    }
    ov.querySelector('.ad-t').textContent = t; ov.setAttribute('aria-label', t);
    ov.querySelector('.ad-fora').href = href;
    var f = ov.querySelector('.ad-f'); f.title = t; f.src = href + (href.indexOf('?') >= 0 ? '&' : '?') + 'embed=1';
    document.documentElement.classList.add('com-janela');
  }
  window.addEventListener('message', function (ev) { if (ev.origin === location.origin && ev.data && ev.data.vivere === 'fechar-janela') fechaDentro(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && document.getElementById('app-dentro')) fechaDentro(); });
  /* clicar numa aba do painel (topo, lateral ou barra do celular) fecha a janela */
  /* 23/11/2026: o próprio #aba-app leva data-aba (marca qual tela está aberta) — sem o :not, qualquer clique DENTRO da tela
     (ex.: "Gerar link" em Acessos) fechava a aba e jogava de volta ao painel. Só os botões de aba fecham. */
  document.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('[data-aba]:not(#aba-app)'); if (b && !b.closest('#app-dentro')) fechaDentro(); }, true);
  /* ir(href): no app abre na janela; no PAINEL DO GESTOR (claude.ai), onde script não troca de página, mostra um aviso com
     o link de verdade, que o toque do usuário abre fora */
  function urlFora(href) { return /^hub\//.test(href) ? 'https://claude.ai/artifact/LR3j38He26qquNQHKunkMx' : 'https://vivere-imoveis.github.io/app-vivere/' + href; }
  function avisoFora(href) {
    var aba = (/aba=([a-z]+)/.exec(href) || [])[1], t = /^hub\//.test(href) ? 'HUB VIVERE' : (NOMES[aba] || 'esta tela');
    var v = document.getElementById('aviso-fora'); if (v) v.remove();
    v = document.createElement('div'); v.id = 'aviso-fora'; v.setAttribute('role', 'status');
    v.innerHTML = '<span>' + t + ' fica no app, fora do Gestor.</span><a class="b p" target="_blank" rel="noopener"></a><button type="button" class="b" aria-label="Fechar o aviso">✕</button>';
    var a = v.querySelector('a'); a.href = urlFora(href); a.textContent = 'Abrir ' + t + ' ↗';
    a.addEventListener('click', function () { setTimeout(function () { v.remove(); }, 0); });
    v.querySelector('button').addEventListener('click', function () { v.remove(); });
    document.body.appendChild(v); setTimeout(function () { if (v.isConnected) v.remove(); }, 15000);
  }
  /* 22/11/2026 (pedido do Cleiton: "tudo dentro de um único aplicativo"): A CAPTAR, Estudo de Mercado e Imóveis sem
     responsável rodam NATIVOS dentro do painel (mesmos módulos do app: acaptar.js, acm.js, semresp.js, carregados na hora,
     com o CSS do app restrito à janela em app-nativo.css). Vale no app e no PAINEL DO GESTOR do claude.ai. */
  var NATIVO = { acaptar: ['ACAPTAR', 'acaptar.js'], acm: ['ACM', 'acm.js'], semresp: ['SEMRESP', 'semresp.js'], senha: ['SENHA', 'senha.js'], seguranca: ['SEGURANCA', 'seguranca.js'], acessos: ['ACESSOS', 'acessos.js'] }; /* 22/11/2026: Minha senha e Acessos também nativos (no Gestor pela ponte do conector) */
  var carregados = {};
  /* 23/11/2026: as telas carregadas na hora (Acessos, Minha senha, A CAPTAR…) vinham sem ?v= e o navegador podia usar a
     cópia antiga depois de uma publicação; a versão de cada uma fica no <meta name="vivere-nativos"> do painel.html */
  function comVersao(src) {
    var m = document.querySelector('meta[name="vivere-nativos"]'), c = m ? m.getAttribute('content') || '' : '';
    var x = new RegExp('(?:^|\\s)' + src.replace(/\./g, '\\.') + '\\?v=([0-9a-f]{8})').exec(c);
    return x ? src + '?v=' + x[1] : src;
  }
  function carrega(src, css) {
    if (carregados[src]) return carregados[src];
    carregados[src] = new Promise(function (ok, erro) {
      var el = css ? document.createElement('link') : document.createElement('script');
      if (css) { el.rel = 'stylesheet'; el.href = comVersao(src); } else { el.src = comVersao(src); el.charset = 'utf-8'; }
      el.onload = function () { ok(); }; el.onerror = function () { delete carregados[src]; erro(new Error('não carregou ' + src)); };
      document.head.appendChild(el);
    });
    return carregados[src];
  }
  function abaDe(href) { return (/aba=([a-z]+)/.exec(href || '') || [])[1] || ''; }
  /* 23/11/2026: Segurança (2FA) nativa só no app; no PAINEL DO GESTOR do claude.ai o 2FA não passa pela ponte do conector → abre no app */
  function nativo(href) { var a = abaDe(href); return !!NATIVO[a] && !(a === 'seguranca' && window.__artefatoLoja) && !!(window.VIVERE_PONTE && VIVERE_PONTE.contextoApp); }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  async function abreNativo(href) {
    var aba = abaDe(href), cfg = NATIVO[aba], t = NOMES[aba] || 'App';
    var corpo = abreAba(aba, t, function () { if (aba === 'acessos' && window.ACESSOS) ACESSOS.sair(); }, aba !== 'semresp'); if (!corpo) return;   /* imoveis-ofertas: Sem responsável já traz o próprio título */
    corpo.innerHTML = '<div id="app-nativo"><div class="vazio">Carregando ' + escH(t) + '…</div></div>';
    var ov = document.getElementById('aba-app');
    var raiz = ov.querySelector('#app-nativo');
    try {
      await carrega('app-nativo.css', true);
      if (aba === 'semresp' && ABA.id === 'semresp') subsNaAba(ov, 'semresp');   /* imoveis-ofertas: o submenu de Imóveis continua à vista */
      if (!window[cfg[0]]) await carrega(cfg[1]);
      var P = VIVERE_PONTE.contextoApp();
      var ctx = { sb: P.sb, eu: P.eu, sessaoUid: P.sessaoUid, esc: escH,
        toast: function (m) { try { toast(m); } catch (e) { } },
        titulo: function (x) { var b = ov.querySelector('.aba-app-t'); if (b && ABA.id === aba) b.textContent = x || t; } };
      var q = new URLSearchParams((href.split('?')[1]) || '');
      if (aba === 'acm') await window.ACM.tela(raiz, ctx, { ref: q.get('ref') || '', estudo: q.get('estudo') || '' });
      else if (aba === 'acaptar') await window.ACAPTAR.tela(raiz, ctx, q.get('cod') || '');
      else if (aba === 'senha') { ctx.email = (P.eu && P.eu.email) || ''; window.SENHA.tela(raiz, ctx, {}); }
      else await window[cfg[0]].tela(raiz, ctx);
    } catch (e) {
      raiz.innerHTML = '<div class="vazio">Não deu para abrir ' + escH(t) + ' aqui: ' + escH(e && e.message || e) + '</div>';
    }
  }
  /* imoveis-ofertas (22/11/2026): Sem responsável é sub-aba de Imóveis — a tela do app mostra a mesma fila de sub-abas,
     com Sem responsável marcada (no menu lateral a fila fica escondida, como as outras) */
  function subsNaAba(h, id) {
    var s = document.querySelector('#conteudo .sub-op'); if (!s || !h || h.querySelector('.sub-op')) return;
    var c = s.cloneNode(true);
    c.querySelectorAll('button[data-aba]').forEach(function (b) { var on = b.getAttribute('data-aba') === id; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-selected', String(on)); });
    h.insertBefore(c, h.firstChild);
  }
  function ir(href) { if (nativo(href)) return abreNativo(href); if (embutivel(href)) return abreDentro(href); if (!DENTRO) return avisoFora(href); volta(); location.href = href; }
  /* links para essas telas (botões do topo, barra mini, cartões do Início): no Gestor do claude.ai o artefato.js abriria fora;
     no toque (antes do clique) o link passa a apontar para #tela e o clique abre a tela aqui dentro */
  function marcaLink(ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null; if (!a || a.closest('#app-dentro')) return;
    var h = a.getAttribute('href') || '';
    if (/^(?:\.\/)?index\.html\?aba=/.test(h) && nativo(h)) { a.dataset.irDentro = h.replace(/^\.\//, ''); a.setAttribute('href', '#' + abaDe(h)); a.removeAttribute('target'); }
  }
  window.addEventListener('pointerdown', marcaLink, true);
  window.addEventListener('keydown', function (e) { if (e.key === 'Enter') marcaLink(e); }, true);
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[data-ir-dentro]') : null; if (!a) return;
    ev.preventDefault(); var h = a.dataset.irDentro; a.setAttribute('href', h); delete a.dataset.irDentro; ir(h);
  }, true);
  window.PAINEL_DENTRO = { abre: abreDentro, fecha: fechaDentro, pode: embutivel, ir: ir };
  function volta() { try { sessionStorage.setItem('painel.volta', location.pathname.split('/').pop() + location.search); } catch (e) { } }
  function P0e() { var P = window.VIVERE_PONTE; return P && P.estado ? P.estado() : {}; }
  function pinta() {
    var tema = document.getElementById('btnTema');
    if (!tema) return;
    var b = document.getElementById('btnAcapApp');
    if (!b) {
      b = document.createElement('a');
      b.id = 'btnAcapApp'; b.className = 'btn-tema btn-acap'; b.href = DENTRO ? URL_ACAP : '#acaptar';   // no Gestor, #: o artefato.js não o manda para fora
      b.addEventListener('click', function (ev) { if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return; ev.preventDefault(); ir(URL_ACAP); });
      tema.parentNode.insertBefore(b, tema);
    }
    /* 18/11/2026 (ACM): botão do Estudo de Mercado ao lado do A CAPTAR, também fora das abas (abre a página do app) */
    if (!document.getElementById('btnAcmApp')) {
      var m = document.createElement('a');
      m.id = 'btnAcmApp'; m.className = 'btn-tema btn-acap'; m.href = DENTRO ? 'index.html?aba=acm' : '#acm'; m.title = 'Abrir o Estudo de Mercado (ACM). Abre outra página do app.'; m.setAttribute('aria-label', m.title);
      m.innerHTML = (window.VIVERE_ICONES && VIVERE_ICONES.html ? '<span class="ba-ic" aria-hidden="true">' + VIVERE_ICONES.html('grafico') + '</span>' : '') + '<span class="ba-t">ACM</span>';
      m.addEventListener('click', function (ev) { if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return; ev.preventDefault(); ir('index.html?aba=acm'); });
      tema.parentNode.insertBefore(m, tema);
    }
    /* 22/11/2026: Minha senha e Acessos também no Mais do celular (o nav-celular.js espelha estes botões, que ficam escondidos no topo) */
    [['btnSenhaApp', 'senha', 'cadeado', 'Minha senha', true], ['btnSegApp', 'seguranca', 'escudo', 'Segurança (2FA)', true], ['btnAcessosApp', 'acessos', 'escudo', 'Acessos', (P0e().papel === 'gestor')]].forEach(function (x) {
      if (!x[4] || document.getElementById(x[0])) return;
      var bt = document.createElement('button'); bt.type = 'button'; bt.id = x[0]; bt.className = 'btn-tema btn-so-mais'; bt.title = x[3]; bt.setAttribute('aria-label', x[3]);
      bt.innerHTML = (window.VIVERE_ICONES && VIVERE_ICONES.html ? '<span class="ba-ic" aria-hidden="true">' + VIVERE_ICONES.html(x[2]) + '</span>' : '') + '<span class="ba-t">' + x[3] + '</span>';
      bt.addEventListener('click', function () { ir('index.html?aba=' + x[1]); });
      tema.parentNode.insertBefore(bt, tema);
    });
    /* 21/11/2026 (hub-web-diretoria F3): botão do HUB VIVERE na web, só para quem tem a marca acessos.hub (e o gestor) */
    var P0 = window.VIVERE_PONTE, est0 = P0 && P0.estado ? P0.estado() : {};
    if (est0.hub && !document.getElementById('btnHubApp')) {
      var hb = document.createElement('a');
      hb.id = 'btnHubApp'; hb.className = 'btn-tema btn-acap'; hb.href = 'hub/'; hb.title = 'Abrir o HUB VIVERE (só leitura). Abre outra página do app.'; hb.setAttribute('aria-label', hb.title);
      hb.innerHTML = (window.VIVERE_ICONES && VIVERE_ICONES.html ? '<span class="ba-ic" aria-hidden="true">' + VIVERE_ICONES.html('casa') + '</span>' : '') + '<span class="ba-t">HUB</span>';
      hb.addEventListener('click', function (ev) { if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return; ev.preventDefault(); ir('hub/'); });
      tema.parentNode.insertBefore(hb, tema);
      if (window.MenuLateral) MenuLateral.atualiza();
    }
    var sel = document.querySelector('#abas button[data-aba="acaptar"] .n-acap');
    var n = vivo != null ? String(vivo) : sel ? String(sel.textContent || '').trim() : '';
    var h = '<span class="ba-ic" aria-hidden="true">🎯</span><span class="ba-t">A CAPTAR</span>' + (n ? '<span class="ba-n"><b>' + n + '</b> livre' + (n === '1' ? '' : 's') + '</span>' : '');
    if (b.innerHTML !== h) { b.innerHTML = h; if (window.MenuLateral) MenuLateral.atualiza(); }
    var rot = 'Abrir o A CAPTAR' + (n ? ': ' + n + ' imóve' + (n === '1' ? 'l livre' : 'is livres') + ' para captar' : '') + '. Abre outra página do app.';
    if (b.title !== rot) { b.title = rot; b.setAttribute('aria-label', rot); }
  }
  /* Atalhos do app na lateral (14/11/2026): A CAPTAR, Minha senha e, para o gestor, Acessos (menu-lateral.js). */
  window.MENU_LATERAL_EXTRAS = {
    itens: function () {
      var P = window.VIVERE_PONTE, est = P && P.estado ? P.estado() : {}, sel = document.querySelector('#abas button[data-aba="acaptar"] .n-acap');
      var n = vivo != null ? String(vivo) : sel ? String(sel.textContent || '').trim() : '';
      var L = [{ id: 'acaptar', t: 'A CAPTAR', ic: 'alvo', href: URL_ACAP, n: n, dentro: true }, { id: 'acm', t: 'Estudo de Mercado', ic: 'grafico', href: 'index.html?aba=acm', apos: 'oportunidades', dentro: true }, { id: 'senha', t: 'Minha senha', ic: 'cadeado', href: 'index.html?aba=senha', dentro: true }, { id: 'seguranca', t: 'Segurança (2FA)', ic: 'escudo', href: 'index.html?aba=seguranca', dentro: true },
        est.hub ? { id: 'hub', t: 'HUB VIVERE', ic: 'casa', href: 'hub/', dentro: DENTRO, grupo: 'gestao' } : null,
        est.papel === 'gestor' ? { id: 'acessos', t: 'Acessos', ic: 'escudo', href: 'index.html?aba=acessos', dentro: true, grupo: 'gestao' } : null];
      /* 22/11/2026: no PAINEL DO GESTOR (claude.ai) cada atalho do app vira link de verdade (url), que abre fora */
      if (!DENTRO) L.forEach(function (x) { if (x && nativo(x.href)) { x.href = '#' + abaDe(x.href); return; } if (x) x.url = /^hub\//.test(x.href) ? 'https://claude.ai/artifact/LR3j38He26qquNQHKunkMx' : 'https://vivere-imoveis.github.io/app-vivere/' + x.href; });
      return L;
    },
    abre: function (href) { var m = /^#([a-z]+)$/.exec(href || ''); if (m && NATIVO[m[1]]) return ir('index.html?aba=' + m[1]); ir(href); }
  };
  function liga() {
    var abas = document.getElementById('abas');
    if (!abas) return;
    pinta();
    new MutationObserver(pinta).observe(abas, { childList: true, subtree: true, characterData: true });
    lerVivo(); setInterval(function () { if (!document.hidden) lerVivo(); }, 240000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
})();

/* Revisão visual do painel (19/11/2026, tarefa revisao-geral-hub-painel-corretor):
   4. barra mínima fixa (celular e tablet) acompanha a rolagem e a aba: ao trocar de aba a página volta ao topo e a barra some;
      antes ela ficava visível com o nome da aba anterior até rolar.
   8. "Ordenar por" no celular vira um seletor; escolher uma opção clica o botão de ordenação que já existe (o painel.js segue igual). */
(function () {
  'use strict';
  function nomeAba() { var b = document.querySelector('#abas button[aria-selected="true"]'); if (!b) return ''; var t = Array.prototype.filter.call(b.childNodes, function (x) { return x.nodeType === 3; }).map(function (x) { return x.nodeValue; }).join(' ').trim(); return t || (b.textContent || '').trim(); }
  function sync() {
    var mini = document.querySelector('.topo-mini'), topo = document.querySelector('header.topo'); if (!mini || !topo) return;
    var mostra = getComputedStyle(topo).position !== 'sticky' && topo.getBoundingClientRect().bottom <= 0;
    mini.classList.toggle('vis', mostra); mini.setAttribute('aria-hidden', String(!mostra));
    var a = mini.querySelector('.tm-aba'); if (a) { var n = nomeAba(); if (a.textContent !== n) a.textContent = n; }
  }
  function seletores() {
    document.querySelectorAll('.ordenar-movel:not(.om-ok)').forEach(function (box) {
      var bts = box.querySelectorAll('button[data-ord]'); if (!bts.length) return;
      var w = document.createElement('span'); w.className = 'om-sel';
      var s = document.createElement('select'); s.setAttribute('aria-label', 'Ordenar por');
      Array.prototype.forEach.call(bts, function (b, i) { var o = document.createElement('option'); o.value = String(i); o.textContent = (b.textContent || '').replace(/[↕▲▼↑↓]/g, '').trim(); if (b.hasAttribute('data-ativo')) o.selected = true; s.appendChild(o); });
      var ativo = box.querySelector('button[data-ord][data-ativo]');
      var inv = document.createElement('button'); inv.type = 'button'; inv.className = 'om-inv';
      inv.textContent = ativo ? ((ativo.textContent || '').indexOf('▲') >= 0 ? '▲' : (ativo.textContent || '').indexOf('▼') >= 0 ? '▼' : '↕') : '↕';
      inv.title = 'Inverter a ordem'; inv.setAttribute('aria-label', 'Inverter a ordem');
      s.addEventListener('change', function () { var b = bts[Number(s.value)]; if (b) b.click(); });
      inv.addEventListener('click', function () { var b = box.querySelector('button[data-ord][data-ativo]') || bts[Number(s.value)]; if (b) b.click(); });
      w.appendChild(s); w.appendChild(inv); box.appendChild(w); box.classList.add('om-ok');
    });
  }
  function liga() {
    addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    document.addEventListener('click', function () { setTimeout(sync, 80); }, true);
    var main = document.querySelector('main') || document.body;
    new MutationObserver(function () { seletores(); }).observe(main, { childList: true, subtree: true });
    seletores(); sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
})();

/* Menu no topo do computador (1024 px ou mais, quando a pessoa escolhe o topo no ☰): Minha senha e Acessos aparecem no fim da
   linha das abas, como abas (22/11/2026, decisão do Cleiton: "Pôr no fim das abas"). Antes, só na lateral e no Mais do celular.
   São só espelhos: o clique aciona os botões originais (btnSenhaApp, btnAcessosApp), que abrem a aba dentro do painel. Não têm
   data-aba, para o menu lateral, a barra do celular e a troca de abas do painel não os contarem. */
(function () {
  'use strict';
  var ITENS = [['btnSenhaApp', 'senha', 'cadeado', 'Minha senha'], ['btnSegApp', 'seguranca', 'escudo', 'Segurança (2FA)'], ['btnAcessosApp', 'acessos', 'escudo', 'Acessos']];
  function topoPc() { var b = document.body; return innerWidth >= 1024 && b && !b.classList.contains('ml-on') && !b.classList.contains('nc-on'); }
  function atual() { return window.ABA_APP && ABA_APP.atual ? ABA_APP.atual() : ''; }
  var mexendo = false;
  function ajusta() {
    var abas = document.getElementById('abas'); if (!abas || mexendo) return;
    mexendo = true;
    try {
      var ligar = topoPc();
      ITENS.forEach(function (x) {
        var orig = document.getElementById(x[0]), esp = abas.querySelector('button.aba-esp[data-esp="' + x[1] + '"]');
        if (!ligar || !orig) { if (esp) esp.remove(); return; }
        if (!esp) {
          esp = document.createElement('button'); esp.type = 'button'; esp.className = 'aba-esp'; esp.dataset.esp = x[1];
          esp.setAttribute('aria-label', x[3]); esp.title = x[3];
          esp.innerHTML = (window.VIVERE_ICONES && VIVERE_ICONES.html ? '<span class="ab-ic" aria-hidden="true">' + VIVERE_ICONES.html(x[2]) + '</span>' : '') + '<span class="ab-t">' + x[3] + '</span>';
          esp.addEventListener('click', function () { var o = document.getElementById(x[0]); if (o) o.click(); });
        }
        if (esp.parentNode !== abas || esp !== abas.lastElementChild && !esp.nextElementSibling.classList.contains('aba-esp')) abas.appendChild(esp);
        var sel = atual() === x[1] ? 'true' : 'false';
        if (esp.getAttribute('aria-selected') !== sel) esp.setAttribute('aria-selected', sel);
      });
    } finally { mexendo = false; }
  }
  function liga() {
    var abas = document.getElementById('abas'); if (!abas) return;
    new MutationObserver(function () { ajusta(); }).observe(abas, { childList: true });
    new MutationObserver(function () { ajusta(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', ajusta);
    document.addEventListener('vivere:aba-app', ajusta);
    var n = 0, t = setInterval(function () { ajusta(); if (++n > 20) clearInterval(t); }, 500);   // os botões originais nascem depois do 1º desenho
    ajusta();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
})();
