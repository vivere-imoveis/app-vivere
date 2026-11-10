/* painel-app.js — ajustes de comportamento do painel dentro do app da Vivere (fatia 5 O, 10/11/2026).
   A CAPTAR fora do menu de abas (pedido do Cleiton): ele abre outra página do app, então ganha um botão próprio no
   cabeçalho, separado das abas (a aba fica escondida pelo painel-app.css). O painel.js do modelo segue igual: este
   arquivo só cria o botão, copia para ele o nº de imóveis livres que o painel já calcula na aba escondida e abre o
   A CAPTAR na mesma janela, guardando o caminho de volta ao painel. */
(function () {
  'use strict';
  var URL_ACAP = 'index.html?aba=acaptar';
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
    var n = sel ? String(sel.textContent || '').trim() : '';
    var h = '<span class="ba-ic" aria-hidden="true">🎯</span><span class="ba-t">A CAPTAR</span>' + (n ? '<span class="ba-n"><b>' + n + '</b> livre' + (n === '1' ? '' : 's') + '</span>' : '');
    if (b.innerHTML !== h) b.innerHTML = h;
    var rot = 'Abrir o A CAPTAR' + (n ? ': ' + n + ' imóve' + (n === '1' ? 'l livre' : 'is livres') + ' para captar' : '') + '. Abre outra página do app.';
    if (b.title !== rot) { b.title = rot; b.setAttribute('aria-label', rot); }
  }
  function liga() {
    var abas = document.getElementById('abas');
    if (!abas) return;
    pinta();
    new MutationObserver(pinta).observe(abas, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
})();
