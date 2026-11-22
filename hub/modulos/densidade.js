/* ---------- densidade: cartões de número compactos (22/11/2026, pedido e aprovação do Cleiton) ----------
   Marca como .g-num toda grade cujos cartões são "de número" (rótulo + número grande + até 1 linha) e
   aplica o padrão único: cartão baixo, número 22px, várias colunas por linha (≈140 px no computador,
   3 por linha no celular). A grade continua sendo equilibrada pelo GradesCheias (sem sobra no fim da linha). */
(() => {
  if (window.Densidade) return;
  const css = `
#conteudo .g-num.g-num{grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:8px} /* sem !important: o GradesCheias (inline) ainda equilibra as linhas */
.g-num>.tot{grid-column:auto!important}
.g-num>*{padding:8px 10px!important;min-height:0!important;display:flex!important;flex-direction:column;justify-content:center;gap:1px}
.g-num>* .g-n{font-size:22px!important;line-height:1.1!important;margin:1px 0!important}
.g-num>* .g-r{font-size:10.5px!important;letter-spacing:.06em!important;line-height:1.25!important;margin:0!important}
.g-num>* .g-s{font-size:11.5px!important;line-height:1.25!important;margin:0!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
@media (max-width:600px){#conteudo .g-num.g-num{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
 .g-num>*{padding:7px 8px!important}.g-num>* .g-n{font-size:19px!important}.g-num>* .g-s{font-size:11px!important}}`;
  const st = document.createElement('style'); st.id = 'densidade-css'; st.textContent = css; document.head.appendChild(st);
  const RAIZ = '#conteudo';
  const GRADES = '.grade, .cartoes, .fatos, .resumo-cob, .resumo-ac, .rd-kpis, .va'; /* .kpis do topo do HUB já é compacto (8 por linha) */
  function ehNumero(k) {
    if (k.hidden || k.querySelector('table, img, canvas, .tabela, ul, ol, textarea, select, input')) return false;
    const txt = k.textContent.replace(/\s+/g, ' ').trim(); if (txt.length > 110) return false;
    let grande = null;
    k.querySelectorAll('*').forEach((e) => { if (grande || e.children.length) return; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs >= 19 && /\d/.test(e.textContent) && e.textContent.trim().length <= 18) grande = e; });
    if (!grande) return false;
    grande.classList.add('g-n');
    const folhas = [...k.querySelectorAll('*')].filter((e) => !e.children.length && e !== grande && e.textContent.trim());
    folhas.forEach((e) => e.classList.add(e.compareDocumentPosition(grande) & Node.DOCUMENT_POSITION_FOLLOWING ? 'g-r' : 'g-s'));
    return true;
  }
  function marca(g) {
    const ks = [...g.children].filter((k) => !k.hidden && getComputedStyle(k).display !== 'none');
    const sim = ks.length >= 2 && ks.every(ehNumero);
    g.classList.toggle('g-num', sim);
  }
  let pedido = 0;
  function roda() {
    pedido = 0; const raiz = document.querySelector(RAIZ); if (!raiz) return;
    raiz.querySelectorAll(GRADES).forEach((g) => { if (!g.dataset.gnVisto || g.dataset.gnVisto !== String(g.children.length)) { g.dataset.gnVisto = g.children.length; try { marca(g); } catch (e) {} } });
    if (window.GradesCheias) window.GradesCheias.atualiza();
  }
  const agenda = () => { if (!pedido) pedido = requestAnimationFrame(roda); };
  new MutationObserver(agenda).observe(document.body, { childList: true, subtree: true });
  agenda();
  window.Densidade = { atualiza: agenda };
})();
