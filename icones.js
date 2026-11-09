/* Ícones do app da Vivere (fatia 4b-2, 09/11/2026).
   Troca os emojis que o painel escreve por ícones de traço no desenho da casa (mesma família do olho: traço fino, cantos
   redondos, cor do texto). Vale para tudo o que entra na página: o painel.js continua igual ao modelo.
   Bolinhas de situação (pauta, a captar) viram pontos nas cores do tema. Em dica, rótulo de leitor de tela e lista de opções,
   o emoji só sai. Sem dado nenhum aqui. */
(function () {
  'use strict';
  if (window.VIVERE_ICONES) return;
  var T = {
    alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="#000"/>',
    casa: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>',
    microfone: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>',
    pino: '<path d="M12 21s-7-6.3-7-11.2a7 7 0 0 1 14 0C19 14.7 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
    mapa: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5"/><path d="M15 6.5V20"/>',
    brilho: '<path d="M11 3.5 12.9 9l5.6 2-5.6 2L11 18.5 9.1 13 3.5 11l5.6-2z"/><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    raio: '<path d="M13 2.5 4.5 13.5h6.5l-1 8 8.5-11H12z"/>',
    lupa: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    camera: '<path d="M4 8h3.2l1.8-2.8h6L16.8 8H20v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
    etiqueta: '<path d="M3.5 12V4.5h7.5L20.5 14 14 20.5z"/><circle cx="7.8" cy="8.8" r="1.2"/>',
    pessoas: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 20c0-3.4 2.7-5.8 6-5.8s6 2.4 6 5.8"/><circle cx="17.2" cy="9.5" r="2.5"/><path d="M17 14.4c2.4.4 4 2.4 4 5"/>',
    ajuda: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2 1-1.2 1.9"/><path d="M12 17h.01"/>',
    sino: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l2 2H4z"/><path d="M10 21h4"/>',
    blocos: '<rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/>',
    cifrao: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.3c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2 0 2.8 5.6 1.5 5.6 4.3 0 1.2-1.2 2-2.8 2-1.3 0-2.3-.5-2.8-1.4"/><path d="M12 6v12"/>',
    area: '<path d="M4 10V4h6"/><path d="M20 14v6h-6"/><path d="m4 4 7 7"/><path d="m20 20-7-7"/>',
    prancheta: '<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h6"/>',
    livro: '<path d="M5 6a2.5 2.5 0 0 1 2.5-2.5H19V20H7.5A2.5 2.5 0 0 1 5 17.5z"/><path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H19"/>',
    imagem: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 16-5-5-8 8"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10.5 5-3v9l-5-3z"/>',
    documento: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12.5h6"/><path d="M9 16.5h6"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    lua: '<path d="M20 14.3A8.3 8.3 0 0 1 9.7 4a7.2 7.2 0 1 0 10.3 10.3z"/>',
    baixo: '<path d="m6 9 6 6 6-6"/>',
    tema: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="#000"/>'
  };
  // emoji → ícone de traço
  var IC = { '🎯': 'alvo', '🏠': 'casa', '🎤': 'microfone', '📍': 'pino', '🗺': 'mapa', '✨': 'brilho', '⚡': 'raio', '🔎': 'lupa', '🔍': 'lupa', '📷': 'camera',
    '🏷': 'etiqueta', '👥': 'pessoas', '❔': 'ajuda', '❓': 'ajuda', '🔔': 'sino', '🧩': 'blocos', '💲': 'cifrao', '💰': 'cifrao', '📐': 'area', '📋': 'prancheta', '📘': 'livro',
    '🖼': 'imagem', '🎬': 'video', '📄': 'documento', '☀': 'sol', '☾': 'lua', '🌙': 'lua', '⏷': 'baixo', '◐': 'tema' };
  // emoji de cor → ponto na cor do tema
  var PT = { '🟢': 'ok', '🟠': 'capt', '🔵': 'azul', '🔴': 'ruim', '🟡': 'aviso', '🔶': 'capt los' };
  var chaves = Object.keys(IC).concat(Object.keys(PT));
  var RE = new RegExp('(' + chaves.join('|') + ')\\uFE0F?', 'u');
  var REG = new RegExp('(?:' + chaves.join('|') + ')\\uFE0F?\\s?', 'gu');

  var css = '.ic{display:inline-block;width:1.1em;height:1.1em;vertical-align:-.19em;flex:none;margin-inline-end:.32em;background:currentColor;-webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat}' +
    '.b .ic,.btn .ic,button .ic,.pill .ic{opacity:.9}h2 .ic,.cartao .r .ic{color:var(--brass)}.acap-ft.sem .ic,.capa .ic{width:26px;height:26px;color:var(--muted);opacity:.7}' +
    '.ic.fim,.pt.fim{margin-inline-end:0}.pt{display:inline-block;width:.62em;height:.62em;border-radius:50%;vertical-align:.06em;margin:0 .36em 0 .1em;flex:none;background:var(--muted)}' +
    '.pt-ok{background:var(--ok-selo)}.pt-capt{background:var(--capt,#c2702a)}.pt-azul{background:var(--teal)}.pt-ruim{background:var(--bad)}.pt-aviso{background:var(--warn-selo)}.pt-los{border-radius:1px;transform:rotate(45deg) scale(.86)}' +
    ':root{--capt:#c2702a}:root[data-theme="dark"]{--capt:#e39a55}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--capt:#e39a55}}';
  Object.keys(T).forEach(function (k) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + T[k] + '</svg>';
    css += '.ic-' + k + '{--m:url("data:image/svg+xml,' + encodeURIComponent(svg) + '")}';
  });
  var st = document.createElement('style'); st.id = 'css-icones'; st.textContent = css; (document.head || document.documentElement).appendChild(st);

  var PULA = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, TITLE: 1, NOSCRIPT: 1 };
  var ATRS = ['title', 'aria-label', 'placeholder', 'alt'];
  function limpa(s) { return s.replace(REG, '').replace(/^\s+/, ''); }
  function trocaTexto(n) {
    var p = n.parentNode; if (!p || PULA[p.nodeName]) return;
    if (p.nodeName === 'OPTION') { var l = limpa(n.nodeValue); if (l !== n.nodeValue) n.nodeValue = l; return; }
    var m, guarda = 0;
    while (n && (m = RE.exec(n.nodeValue)) && guarda++ < 400) {
      var resto = n.splitText(m.index); resto.nodeValue = resto.nodeValue.slice(m[0].length);
      var e = document.createElement('i'); e.setAttribute('aria-hidden', 'true');
      e.className = IC[m[1]] ? 'ic ic-' + IC[m[1]] : 'pt ' + PT[m[1]].split(' ').map(function (c) { return 'pt-' + c; }).join(' ');
      if (resto.nodeValue.charAt(0) === ' ') resto.nodeValue = resto.nodeValue.slice(1);   // o espaço vira margem do ícone (some em botão flex)
      if (!resto.nodeValue && !resto.nextSibling) e.className += ' fim';
      p.insertBefore(e, resto); n = resto;
    }
  }
  function atributos(el) {
    for (var i = 0; i < ATRS.length; i++) { var v = el.getAttribute && el.getAttribute(ATRS[i]); if (v && RE.test(v)) el.setAttribute(ATRS[i], limpa(v)); }
  }
  function varre(raiz) {
    if (raiz.nodeType === 3) { if (RE.test(raiz.nodeValue)) trocaTexto(raiz); return; }
    if (raiz.nodeType !== 1 || PULA[raiz.nodeName]) return;
    atributos(raiz);
    var els = raiz.querySelectorAll('[title],[aria-label],[placeholder],[alt]'); for (var i = 0; i < els.length; i++) atributos(els[i]);
    var tw = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT), n, lista = [];
    while ((n = tw.nextNode())) if (RE.test(n.nodeValue)) lista.push(n);
    for (var j = 0; j < lista.length; j++) trocaTexto(lista[j]);
  }
  var obs = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'characterData') { if (RE.test(m.target.nodeValue)) trocaTexto(m.target); }
      else if (m.type === 'attributes') { atributos(m.target); }
      else for (var j = 0; j < m.addedNodes.length; j++) varre(m.addedNodes[j]);
    }
  });
  function liga() { varre(document.body); obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRS }); }
  if (document.body) liga(); else document.addEventListener('DOMContentLoaded', liga);
  window.VIVERE_ICONES = { nomes: Object.keys(T), limpa: limpa };
})();
