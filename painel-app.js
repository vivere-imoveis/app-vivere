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
  function volta() { try { sessionStorage.setItem('painel.volta', location.pathname.split('/').pop() + location.search); } catch (e) { } }
  function pinta() {
    var tema = document.getElementById('btnTema');
    if (!tema) return;
    var b = document.getElementById('btnAcapApp');
    if (!b) {
      b = document.createElement('a');
      b.id = 'btnAcapApp'; b.className = 'btn-tema btn-acap'; b.href = URL_ACAP;
      b.addEventListener('click', function (ev) { if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return; ev.preventDefault(); volta(); location.href = URL_ACAP; });
      tema.parentNode.insertBefore(b, tema);
    }
    /* 18/11/2026 (ACM): botão do Estudo de Mercado ao lado do A CAPTAR, também fora das abas (abre a página do app) */
    if (!document.getElementById('btnAcmApp')) {
      var m = document.createElement('a');
      m.id = 'btnAcmApp'; m.className = 'btn-tema btn-acap'; m.href = 'index.html?aba=acm'; m.title = 'Abrir o Estudo de Mercado (ACM). Abre outra página do app.'; m.setAttribute('aria-label', m.title);
      m.innerHTML = (window.VIVERE_ICONES && VIVERE_ICONES.html ? '<span class="ba-ic" aria-hidden="true">' + VIVERE_ICONES.html('grafico') + '</span>' : '') + '<span class="ba-t">ACM</span>';
      m.addEventListener('click', function (ev) { if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return; ev.preventDefault(); volta(); location.href = m.href; });
      tema.parentNode.insertBefore(m, tema);
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
      return [{ id: 'acaptar', t: 'A CAPTAR', ic: 'alvo', href: URL_ACAP, n: n }, { id: 'acm', t: 'Estudo de Mercado', ic: 'grafico', href: 'index.html?aba=acm' }, { id: 'senha', t: 'Minha senha', ic: 'cadeado', href: 'index.html?aba=senha' },
        est.papel === 'gestor' ? { id: 'acessos', t: 'Acessos', ic: 'escudo', href: 'index.html?aba=acessos' } : null];
    },
    abre: function (href) { volta(); location.href = href; }
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
