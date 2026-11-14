/* menu-lateral.js — dois modelos de menu no painel do app (13/11/2026, pedido do Cleiton), o mesmo padrão do HUB VIVERE:
   menu no topo (meia tela, tablet, celular) e menu lateral (tela cheia num monitor grande). Automático: lateral com a janela
   de 1440 px ou mais ocupando 90% da tela; o botão ☰ troca nos dois sentidos e a escolha fica guardada no aparelho
   (escolha igual ao automático volta ao automático). Abaixo de 900 px vale sempre o topo. A lateral só espelha o menu:
   os botões levam data-aba e o painel.js navega como sempre.
   13/11/2026 (2): ícones de traço da biblioteca icones.js no lugar das iniciais; vale também no index.html do app (Início,
   A CAPTAR, Acessos), que pede o encaminhamento do clique ao botão original pelo atributo data-encaminha no <script>. */
(function () {
  const ENCAMINHA = !!(document.currentScript && document.currentScript.hasAttribute('data-encaminha'));
  const ICONE = { inicio: 'casa', acaptar: 'alvo', tarefas: 'prancheta', leads: 'pessoas', pesquisa: 'lupa', imoveis: 'predio', empreendimentos: 'obra',
    mapa: 'mapa', oportunidades: 'etiqueta', demandas: 'lista', solicitacoes: 'balao', painel: 'blocos', senha: 'cadeado', acessos: 'escudo' };
  const icone = (aba, t) => window.VIVERE_ICONES && VIVERE_ICONES.html ? VIVERE_ICONES.html(ICONE[aba] || 'blocos') : esc(t.slice(0, 2));
  const LS = 'painel.menuModo', LSM = 'painel.menuMin';
  const ler = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const grava = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const telaCheia = () => innerWidth >= 1440 && !!(screen && screen.width) && innerWidth >= screen.width * 0.9;
  const modo = () => { if (innerWidth < 900) return 'topo'; const m = ler(LS); return m === 'lateral' || m === 'topo' ? m : (telaCheia() ? 'lateral' : 'topo'); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let aside = null, sig = '';
  /* Atalhos de outras páginas do app no fim da lateral (14/11/2026, pedido do Cleiton): o painel-app.js informa A CAPTAR,
     Minha senha e Acessos em window.MENU_LATERAL_EXTRAS = { itens(): [{ id, t, ic, href, n }], abre(href) }. No PAINEL DO
     GESTOR do claude.ai não há esse objeto, e a lateral fica só com as abas. */
  const extras = () => { const E = window.MENU_LATERAL_EXTRAS; try { return E && E.itens ? (E.itens() || []).filter(Boolean) : []; } catch (e) { return []; } };
  function botaoTroca() {
    if (document.getElementById('ml-troca')) return; const tema = document.getElementById('btnTema'); if (!tema) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'ml-troca'; b.className = 'btn-tema ml-troca'; b.textContent = '☰';
    tema.parentNode.insertBefore(b, tema);
  }
  function titulo() { const b = document.getElementById('ml-troca'); if (!b) return; const lat = document.body.classList.contains('ml-on');
    b.title = lat ? 'Menu no topo' : 'Menu lateral'; b.setAttribute('aria-label', b.title); b.hidden = innerWidth < 900; }
  const visivel = (b) => getComputedStyle(b).display !== 'none';
  const txt = (b) => { const c = b.cloneNode(true); c.querySelectorAll('.n,svg,.ic').forEach((x) => x.remove()); return c.textContent.replace(/\s*\(\d+\)\s*$/, '').trim(); };
  const selo = (b) => { const n = b.querySelector('.n'); const m = !n && /\((\d+)\)\s*$/.exec(b.textContent); return n ? `<span class="ml-n">${esc(n.textContent.trim())}</span>` : m ? `<span class="ml-n">${m[1]}</span>` : ''; };
  function monta() {
    const nav = document.getElementById('abas');
    const on = modo() === 'lateral' && !(nav && nav.hidden), mudou = document.body.classList.contains('ml-on') !== on;
    document.body.classList.toggle('ml-on', on); document.body.classList.toggle('ml-min', on && ler(LSM) === '1'); titulo();
    if (mudou && window.MenusCheios) requestAnimationFrame(() => { try { MenusCheios.atualiza(); } catch (e) {} });
    if (!on) return;
    if (!aside) { aside = document.createElement('aside'); aside.id = 'ml'; aside.setAttribute('aria-label', 'Menu do painel'); document.body.insertBefore(aside, document.body.firstChild); }
    const gs = [...document.querySelectorAll('#abas button[data-aba]')].filter(visivel);
    const ss = [...document.querySelectorAll('.sub-op button[data-aba]')];
    const min = document.body.classList.contains('ml-min');
    const ex = extras();
    const novo = ex.map((x) => x.id + (x.n || '')).join(',') + '§' + gs.map((b) => b.dataset.aba + b.getAttribute('aria-selected') + b.textContent).join('|') + '#' + ss.map((b) => b.dataset.aba + b.getAttribute('aria-selected') + b.textContent).join('|') + (min ? 'm' : '');
    if (novo === sig) return; sig = novo;
    const subs = ss.slice(1);
    aside.innerHTML = `<div class="ml-topo"><span class="ml-tit">Menu</span><button type="button" class="ml-x" data-ml-min title="${min ? 'Abrir o menu' : 'Recolher o menu'}" aria-label="${min ? 'Abrir o menu' : 'Recolher o menu'}">${min ? '»' : '«'}</button></div>` +
      gs.map((b) => { const sel = b.getAttribute('aria-selected') === 'true', t = txt(b);
        return `<button type="button" class="ml-g" data-aba="${esc(b.dataset.aba)}" aria-current="${sel ? 'page' : 'false'}" title="${esc(t)}"><span class="ml-ic">${icone(b.dataset.aba, t)}</span><span class="ml-tx">${esc(t)}</span>${selo(b)}</button>` +
          (sel && subs.length ? `<div class="ml-subs">${subs.map((s) => `<button type="button" class="ml-s" data-aba="${esc(s.dataset.aba)}" aria-selected="${s.getAttribute('aria-selected')}"><span class="ml-tx">${esc(txt(s))}</span>${selo(s)}</button>`).join('')}</div>` : ''); }).join('') +
      (ex.length ? `<div class="ml-sep">No app</div>` + ex.map((x) => `<button type="button" class="ml-g ml-app" data-ml-href="${esc(x.href)}" title="${esc(x.t)} · abre outra página do app"><span class="ml-ic">${window.VIVERE_ICONES && VIVERE_ICONES.html ? VIVERE_ICONES.html(x.ic) : esc(x.t.slice(0, 2))}</span><span class="ml-tx">${esc(x.t)}</span>${x.n ? `<span class="ml-n ml-n-ok">${esc(x.n)}</span>` : ''}</button>`).join('') : '');
  }
  let pend = 0; const agenda = () => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; try { monta(); } catch (e) {} }); };
  document.addEventListener('click', (e) => {
    const ap = e.target.closest && e.target.closest('#ml [data-ml-href]');
    if (ap) { const E = window.MENU_LATERAL_EXTRAS; if (E && E.abre) E.abre(ap.dataset.mlHref); else location.href = ap.dataset.mlHref; return; }
    if (ENCAMINHA) { const a = e.target.closest && e.target.closest('#ml [data-aba]');
      if (a) { const o = [...document.querySelectorAll('#abas button[data-aba], .sub-op button[data-aba]')].find((x) => x.dataset.aba === a.dataset.aba); if (o) { o.click(); scrollTo({ top: 0 }); } return; } }
    const t = e.target.closest && e.target.closest('#ml-troca,[data-ml-min]'); if (!t) return;
    if (t.id === 'ml-troca') { const novo = document.body.classList.contains('ml-on') ? 'topo' : 'lateral', auto = telaCheia() ? 'lateral' : 'topo'; grava(LS, novo === auto ? null : novo); }
    else grava(LSM, document.body.classList.contains('ml-min') ? null : '1');
    sig = ''; monta();
  });
  function inicia() { botaoTroca(); const alvo = document.querySelector('main') || document.body; const o = new MutationObserver(agenda);
    const abas = document.getElementById('abas'); if (abas) o.observe(abas, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
    o.observe(alvo, { childList: true, subtree: true }); addEventListener('resize', agenda); monta(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia); else inicia();
  window.MenuLateral = { atualiza: () => { sig = ''; monta(); } };
})();
