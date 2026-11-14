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
      return [{ id: 'acaptar', t: 'A CAPTAR', ic: 'alvo', href: URL_ACAP, n: n }, { id: 'senha', t: 'Minha senha', ic: 'cadeado', href: 'index.html?aba=senha' },
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
