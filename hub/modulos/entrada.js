/* Entrada suave do HUB VIVERE (22/11/2026, tarefa vis-app-carregamento-transicoes F3): cópia do entrada.js do app dos corretores,
   com o CSS (entrada.css do app) dentro do arquivo e os blocos e as abas do HUB. Mesmo padrão nos dois.
   Ligada para todos desde 22/11/2026; ?entrada=0 desliga no aparelho (fica guardado) e ?entrada=1 religa.
   - Esqueleto: o "Carregando…" do #conteudo vira cartões vazios com um fio de latão passando.
   - Cascata: na 1ª tela com dados, ao trocar de aba e ao trocar o "Ver como", os blocos visíveis entram em ordem de leitura
     (de cima para baixo, da esquerda para a direita), no máximo 24, 38 ms um do outro. Atualização na mesma tela não anima.
   - Números: o valor inteiro dos cartões conta até o número em 0,5 s.
   - Nada atrasa o clique (só opacidade e posição) e "reduzir movimento" do aparelho desliga tudo. */
(function () {
  'use strict';
  var CHAVE = 'vivere.entrada';
  try {
    var q = /[?&]entrada=([01])\b/.exec(location.search);
    if (q) { if (q[1] === '0') localStorage.setItem(CHAVE, '0'); else localStorage.removeItem(CHAVE); }
    if (localStorage.getItem(CHAVE) === '0') return;   // padrão ligado desde 22/11/2026 (OK do Cleiton); ?entrada=0 desliga no aparelho
  } catch (e) { return; }
  var calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('ent-on');
  var st = document.createElement('style'); st.id = 'entrada-css'; st.textContent = "/* Entrada suave do app (21/11/2026, tarefa vis-app-carregamento-transicoes F2).\n   Só vale com html.ent-on (ligado por entrada.js; padrão desde 22/11/2026, ?entrada=0 desliga no aparelho).\n   Uma coreografia só: esqueleto enquanto carrega; ao abrir e ao trocar de aba, os blocos entram de cima para baixo\n   e da esquerda para a direita; os números dos cartões contam até o valor. Atualização na mesma aba não anima. */\n\n/* esqueleto no lugar do \"Carregando…\" */\nhtml.ent-on .vazio.ent-esq { padding: 4px 0 0; color: transparent; text-align: left; display: grid; gap: 12px; min-height: 60vh; }\nhtml.ent-on .ent-esq > span { display: block; border-radius: 10px; border: 1px solid var(--line); background: var(--panel); position: relative; overflow: hidden; }\nhtml.ent-on .ent-esq .e-tit { height: 46px; width: min(340px, 70%); border: 0; background: transparent; }\nhtml.ent-on .ent-esq .e-tit::before, html.ent-on .ent-esq .e-tit::after { content: \"\"; position: absolute; left: 0; border-radius: 6px; background: var(--soft); }\nhtml.ent-on .ent-esq .e-tit::before { top: 0; height: 12px; width: 45%; }\nhtml.ent-on .ent-esq .e-tit::after { top: 20px; height: 22px; width: 100%; }\nhtml.ent-on .ent-esq .e-cards { border: 0; background: transparent; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; overflow: visible; }\nhtml.ent-on .ent-esq .e-cards i { display: block; height: 86px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel); position: relative; overflow: hidden; }\nhtml.ent-on .ent-esq .e-bloco { height: 180px; }\nhtml.ent-on .ent-esq .e-bloco.b2 { height: 120px; }\n/* o fio de latão que passa: o único enfeite, e só enquanto carrega */\nhtml.ent-on .ent-esq .e-cards i::after, html.ent-on .ent-esq .e-bloco::after {\n  content: \"\"; position: absolute; inset: 0; transform: translateX(-100%);\n  background: linear-gradient(90deg, transparent 0, color-mix(in srgb, var(--brass) 16%, transparent) 50%, transparent 100%);\n  animation: ent-fio 1.6s cubic-bezier(.4, 0, .2, 1) infinite;\n}\nhtml.ent-on .ent-esq .e-cards i:nth-child(2)::after { animation-delay: .08s; }\nhtml.ent-on .ent-esq .e-cards i:nth-child(3)::after { animation-delay: .16s; }\nhtml.ent-on .ent-esq .e-cards i:nth-child(4)::after { animation-delay: .24s; }\nhtml.ent-on .ent-esq .e-bloco::after { animation-delay: .32s; }\nhtml.ent-on .ent-esq .e-bloco.b2::after { animation-delay: .4s; }\n@keyframes ent-fio { to { transform: translateX(100%); } }\n@media (max-width: 700px) {\n  html.ent-on .ent-esq .e-cards { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }\n  html.ent-on .ent-esq .e-cards i { height: 64px; }\n}\n\n/* cascata: cada bloco entra com fade e sobe 8 px; o atraso vem do entrada.js (--ent-i) */\nhtml.ent-on .ent-vem { animation: ent-sobe 300ms cubic-bezier(.2, .7, .2, 1) both; animation-delay: calc(var(--ent-i, 0) * var(--ent-passo, 38ms)); }\n@keyframes ent-sobe { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }\n\n@media (prefers-reduced-motion: reduce) {\n  html.ent-on .ent-vem { animation: none; }\n  html.ent-on .ent-esq .e-cards i::after, html.ent-on .ent-esq .e-bloco::after { animation: none; display: none; }\n}\n";
  document.head.appendChild(st);

  var FOLHAS = '.cartao, .card, .pend, .aviso, tbody > tr, .cl-card, .op-of, .dm-card, li.item, .tf-item';
  var ESQ = '<span class="e-tit"></span><span class="e-cards"><i></i><i></i><i></i><i></i></span><span class="e-bloco"></span><span class="e-bloco b2"></span>';
  var ultima = null, teveDados = false, T0 = Date.now();

  function assinatura() {
    var a = document.querySelector('#abas [aria-selected="true"], [role="tablist"] [aria-selected="true"], [aria-current="page"]');
    var sb = document.querySelector('#subabas:not([hidden]) [aria-selected="true"]');
    var v = document.querySelector('select[data-versel]'), vb = document.querySelector('[data-ver][aria-pressed="true"]');
    return (a ? a.textContent.trim().split('\n')[0] : '') + '/' + (sb ? sb.getAttribute('data-aba') || sb.textContent.trim() : '') + '|' + (v ? v.value : vb ? vb.getAttribute('data-ver') : '') + '|' + location.pathname + location.search;
  }
  function carregando(el) {
    return [].filter.call(el.querySelectorAll('.vazio'), function (v) { return v.classList.contains('ent-esq') || /Carregando/i.test(v.textContent) || (!teveDados && Date.now() - T0 < 15000 && /^Aguardando/i.test(v.textContent.trim())); });
  }
  function esqueleto(v) {
    if (v.classList.contains('ent-esq')) return;
    v.classList.add('ent-esq'); v.setAttribute('aria-label', v.textContent.trim()); v.setAttribute('role', 'status');
    v.innerHTML = ESQ;
  }
  function blocos(el) {
    var lim = (window.innerHeight || 800) * 1.4, sel = [];
    var folhas = el.querySelectorAll(FOLHAS);
    for (var i = 0; i < folhas.length; i++) sel.push(folhas[i]);
    // títulos e blocos sem folha dentro (cabeçalho da tela, painéis de texto) entram também
    el.querySelectorAll(':scope > *, :scope > .sec > *, .painel > h2, .painel > h3').forEach(function (x) {
      if (!x.querySelector(FOLHAS) && !x.closest(FOLHAS)) sel.push(x);
    });
    // caixa com lista dentro (.painel): a caixa entra primeiro e as linhas dela em seguida
    el.querySelectorAll('.painel, .sec > .cartoes').forEach(function (x) { if (x.querySelector(FOLHAS) && !x.matches('.cartoes')) sel.push(x); });
    var vistos = [];
    sel.forEach(function (x) {
      if (vistos.indexOf(x) >= 0) return;
      for (var p = x.parentElement; p && p !== el; p = p.parentElement) if (sel.indexOf(p) >= 0 && !p.querySelector(FOLHAS)) return;
      var r = x.getBoundingClientRect();
      if (r.height <= 0 || r.width <= 0 || r.top > lim || r.bottom < 0) return;
      vistos.push(x); x._entR = r;
    });
    vistos.sort(function (a, b) { return (Math.round(a._entR.top / 12) - Math.round(b._entR.top / 12)) || (a._entR.left - b._entR.left); });
    return vistos.slice(0, 24);
  }
  function contar(x, atraso) {
    var alvo = x.querySelectorAll('.cartao .v, .v');
    for (var i = 0; i < alvo.length; i++) (function (n) {
      var t = n.textContent.trim();
      if (!/^\d{1,6}$/.test(t) || +t < 2 || n._entC) return;
      var fim = +t, t0 = 0; n._entC = 1; n.textContent = '0';
      setTimeout(function () {
        function passo(ts) {
          if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 500), e = 1 - Math.pow(1 - p, 3);
          if (!n.isConnected) return; n.textContent = String(Math.round(fim * e));
          if (p < 1) requestAnimationFrame(passo); else n.textContent = t;
        }
        requestAnimationFrame(passo);
      }, atraso);
    })(alvo[i]);
  }
  function cascata(el, primeira) {
    if (calmo) return;
    var b = blocos(el), passo = primeira ? 38 : 24;
    b.forEach(function (x, i) {
      x.style.setProperty('--ent-i', i); x.style.setProperty('--ent-passo', passo + 'ms');
      x.classList.add('ent-vem');
      x.addEventListener('animationend', function fim() { x.classList.remove('ent-vem'); x.removeEventListener('animationend', fim); });
      if (x.matches('.cartao') || x.querySelector('.cartao .v')) contar(x, i * passo);
    });
  }
  function olhar(el) {
    var vz = carregando(el);
    if (vz.length) { vz.forEach(esqueleto); return; }   // ainda carregando: esqueleto, e a cascata espera os dados
    var s = assinatura();
    if (s === ultima && teveDados) return;
    var primeira = !teveDados; ultima = s; teveDados = true;
    cascata(el, primeira);
  }
  function liga() {
    var el = document.getElementById('conteudo');
    if (!el) return;
    var pedido = 0;
    new MutationObserver(function () { if (!pedido) pedido = requestAnimationFrame(function () { pedido = 0; olhar(el); }); }).observe(el, { childList: true });
    olhar(el);
    // HUB: "Aguardando…" que continua depois de 15 s é estado real (fonte sem coleta), não carregamento: volta o texto
    setTimeout(function () {
      [].forEach.call(el.querySelectorAll('.vazio.ent-esq'), function (v) {
        var t = v.getAttribute('aria-label') || '';
        if (/^Aguardando/i.test(t)) { v.classList.remove('ent-esq'); v.removeAttribute('role'); v.textContent = t; }
      });
      olhar(el);
    }, 15500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
})();
