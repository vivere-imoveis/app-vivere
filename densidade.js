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

/* ---------- densidade: cartões de tabela compactos no celular (22/11/2026, pedido do Cleiton: "informação comprimida, principalmente no celular") ----------
   No HUB, até 760 px, toda tabela vira cartão (table.tab-auto, núcleo). Aqui o cartão fica baixo: 3 colunas, código curto
   ao lado do título, rótulos menores, campo médio em 2 colunas e botão único sem linha própria. Nada é cortado. */
(() => {
  if (window.DensidadeTabelas) return;
  const T = '#conteudo table.tab-auto>tbody>tr';
  const css = `
@media (max-width:760px){
${T}{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:3px 10px!important;padding:7px 10px!important;margin:0 0 6px!important;font-size:12.5px;line-height:1.3}
${T}>td[data-rot]:not([data-rot=""])::before{font-size:9.5px!important;letter-spacing:.05em!important;margin:0!important;line-height:1.25!important}
${T}>td.dv-cod{grid-column:1/2!important;grid-row:1!important;font-weight:700;align-self:start;position:relative;z-index:1}
${T}>td.dv-cod::before{display:none!important}
${T}>td.dv-tit{grid-column:1/-1!important;grid-row:1!important;padding-left:var(--dv-ind,3ch)!important;font-weight:600}
${T}>td.dv-media{grid-column:span 2!important}
${T}>td.dv-acao1{grid-column:auto!important;align-self:end;justify-self:start}
${T}>td.dv-acao1 :is(button,a.btn,select){font-size:12px!important;padding:4px 8px!important}
${T}>td.ta-acoes :is(button,a.btn){font-size:12px!important;padding:4px 8px!important}
.ord-movel-auto{gap:4px!important}.ord-movel-auto button{font-size:11px!important;padding:3px 7px!important}
}
.tabela.dv-emb{border:0!important;background:none!important;border-radius:0!important}`;
  const st = document.createElement('style'); st.id = 'densidade-tab-css'; st.textContent = css; document.head.appendChild(st);
  const curta = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const CTL = 'button,a.btn,select,input';
  function rotulos(t) { const hr = t.tHead && t.tHead.rows[0]; const R = []; if (hr) [...hr.cells].forEach((c) => { for (let k = 0; k < (c.colSpan || 1); k++) R.push(curta(((k) => { k.querySelectorAll('br').forEach((b) => b.replaceWith(' ')); return k.textContent; })(c.cloneNode(true))).replace(/[▲▼↕]/g, '')); }); return R; }
  function marcaLinha(r, R) {
    let col = 0;
    const cs = [...r.cells]; if (cs.length < 3) return;
    let cod = 0;
    cs.forEach((c, i) => {
      const txt = curta(c.innerText || c.textContent); const ctl = c.querySelectorAll(CTL).length;
      const bloco = !!c.querySelector('details,ul,ol,table,textarea');
      const linha = Math.max(0, ...String(c.innerText || '').split('\n').map((l) => curta(l).length));
      const ehCod = i === 0 && /\d/.test(txt) && txt.length <= 10 && !/\s\S+\s/.test(txt) && !ctl && !bloco; if (ehCod) cod = txt.length;
      c.classList.toggle('dv-cod', ehCod);
      c.classList.toggle('dv-tit', i === 1 && cod > 0);
      if (i === 1 && cod > 0) c.style.setProperty('--dv-ind', (cod + 1.6) + 'ch'); else if (i === 1) c.style.removeProperty('--dv-ind');
      c.classList.toggle('dv-acao1', i > 0 && ctl === 1 && txt.length <= 24 && !bloco);
      const rot = Math.max(0, ...String(R[col] || '').split(/\s+/).map((w) => w.length));
      c.classList.toggle('dv-media', i > 1 && !ctl && !bloco && ((linha > 13 && linha <= 30) || rot > 12));
      col += c.colSpan || 1;
    });
  }
  /* Tabela com caixa de rolagem própria do módulo (ex.: relatórios do CRM) não entrava na regra lista × cartão do núcleo,
     que só olha a caixa .tabela: embrulhada numa .tabela sem moldura, ela quebra linha ou vira cartão em vez de rolar de lado. */
  function embrulha() {
    if (typeof window.cartaoAuto !== 'function') return; /* só no HUB, onde o núcleo faz a regra lista × cartão */
    document.querySelectorAll('#conteudo table').forEach((t) => {
      if (!t.tBodies[0] || t.closest('.tabela,.modal') || t.parentElement.closest('table')) return;
      const p = t.parentElement; if (!/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return;
      const w = document.createElement('div'); w.className = 'tabela dv-emb'; p.insertBefore(w, t); w.appendChild(t);
    });
  }
  let pedido = 0;
  function roda() {
    pedido = 0; try { embrulha(); } catch (e) {} if (innerWidth > 760) return;
    document.querySelectorAll('#conteudo table').forEach((t) => t.closest('.modal') || [...t.tBodies].forEach((tb) => { let R = null; [...tb.rows].forEach((r) => {
      const sig = r.cells.length + ':' + r.textContent.length; if (r.dataset.dv === sig) return; r.dataset.dv = sig; try { marcaLinha(r, R || (R = rotulos(t))); } catch (e) {}
    }); }));
  }
  const agenda = () => { if (!pedido) pedido = requestAnimationFrame(roda); };
  new MutationObserver(agenda).observe(document.body, { childList: true, subtree: true });
  addEventListener('resize', agenda); agenda();
  window.DensidadeTabelas = { atualiza: roda };
})();
