// modulos/destaques-site.js — aba "Destaques do site" (área Imóveis) do HUB Vivere
// Tarefa vis-site-destaques-hub (22/11/2026). Decisões do Cleiton (22/11/2026, "1a 2a 3a"):
//   1a) uma lista só, com ordem, editada aqui e na aba Destaques do site do app (Nícollas e William);
//   2a) a ⭐ de Anúncios do site vira atalho "pôr na vitrine" (entra no fim da lista);
//   3a) imóvel da lista que sai do site: a vaga é preenchida no site pelo imóvel à venda mais recente e esta aba avisa.
// • Lê e grava: site_config/vitrine_home = { refs: [até 10 códigos, em ordem], por, em } (nível diretoria). Lê também imoveis.
// • O banco (gatilho hub_docs_site_config_rebuild) marca a nova montagem do site a cada mudança: aparece no site em até ~10 min.
// • O site lê a lista por site_vitrine_home_ler; os 8 primeiros aparecem em todas as telas, o 9º e o 10º só nas telas largas.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc;
  const ID = 'destaques-site', C = 'site_config', DOC = 'vitrine_home', MAX = 10;
  const FOTO = 'https://jucnlzznbwjthlqqgdlz.supabase.co/storage/v1/object/public/imoveis/';
  const SITE = 'https://vivere-site.cleitonpazds.workers.dev/imovel/';
  const st = { erro: '', ok: '', salvando: false, q: '', arrasta: -1 };

  const doc = () => (H.S[C] || {})[DOC] || null;
  const lista = () => { const d = doc(); return Array.isArray(d && d.refs) ? d.refs.map((r) => String(r).toUpperCase()) : []; };
  const anuncios = () => Object.keys(H.S.imoveis || {}).map((k) => Object.assign({ _id: k }, H.S.imoveis[k]));
  const noSite = (x) => !!(x && x.ativo && x.site_oculto !== true);
  // um código pode ter mais de um anúncio (venda e locação): vale o que está no site, venda primeiro
  function anuncioDe(ref) { const r = String(ref).toUpperCase();
    const A = anuncios().filter((x) => String(x.ref || '').toUpperCase() === r);
    return A.sort((a, b) => (noSite(b) - noSite(a)) || (/venda/i.test(b.finalidade || '') - /venda/i.test(a.finalidade || '')))[0] || null; }
  const preco = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'));
    return n > 0 ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : 'sob consulta'; };
  const quando = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); if (!m) return '';
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])); return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
  const fora = () => lista().filter((r) => !noSite(anuncioDe(r)));

  async function grava(refs, msg) {
    const db = H.db(); if (!db) { st.erro = 'Banco indisponível nesta visualização.'; H.pede(); return false; }
    const limpo = [...new Set(refs.map((r) => String(r).toUpperCase().trim()).filter(Boolean))];
    if (limpo.length > MAX) { st.erro = `No máximo ${MAX} destaques: tire um antes de pôr outro.`; H.pede(); return false; }
    st.salvando = true; st.erro = ''; H.pede();
    const dados = { refs: limpo, por: 'Cleiton (HUB)', em: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') };
    try { await db.doc(C + '/' + DOC).set(dados); H.S[C] = Object.assign({}, H.S[C] || {}, { [DOC]: dados });
      st.ok = msg + ' O site atualiza em até ~10 min.'; }
    catch (e) { st.erro = 'Não foi possível gravar a lista: ' + (e && e.message || e); }
    st.salvando = false; H.pede(); return !st.erro;
  }
  // usado também pela ⭐ de Anúncios do site (cadastro-imoveis.js)
  window.HUB_DESTAQUES = {
    max: MAX, lista, tem: (ref) => lista().includes(String(ref || '').toUpperCase()),
    async poe(ref) { const r = String(ref || '').toUpperCase(); const L = lista(); if (L.includes(r)) return true;
      if (L.length >= MAX) { st.erro = `Já há ${MAX} destaques no site (${L.join(', ')}). Tire um antes de pôr ${r}.`; H.pede(); return false; }
      return grava(L.concat(r), `${r} entrou na vitrine, na posição ${L.length + 1}.`); },
    async tira(ref) { const r = String(ref || '').toUpperCase(); const L = lista(); if (!L.includes(r)) return true;
      return grava(L.filter((x) => x !== r), `${r} saiu da vitrine.`); },
    erro: () => st.erro,
  };

  function estilo() { if (document.getElementById('ds-css')) return; const s = document.createElement('style'); s.id = 'ds-css';
    // 22/11/2026 (rodada visual): grade como a home do site — 5 por linha nas telas largas, 2 no tablet, linha compacta no celular;
    // as vagas livres viram cartões tracejados, para a grade fechar sempre em 10.
    s.textContent = `.ds-topo h2{margin:0 0 2px}.ds-topo .nota{margin:0}
.ds-grade{list-style:none;margin:0;padding:0;display:grid;gap:10px;grid-template-columns:repeat(5,minmax(0,1fr))}
.ds-it{position:relative;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:10px;background:var(--panel);overflow:hidden;min-width:0}
.ds-it[draggable=true]{cursor:grab}.ds-it.arrastando{opacity:.45}.ds-it.alvo{outline:2px dashed var(--accent);outline-offset:2px}
.ds-it.fora{border-color:var(--warn);background:var(--warn-bg)}
.ds-ft{position:relative;aspect-ratio:16/10;background:var(--line)}
.ds-ft::before{content:"🏠";position:absolute;inset:0;display:grid;place-items:center;font-size:22px;opacity:.45}
.ds-ft img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.ds-n{position:absolute;top:6px;left:6px;z-index:1;min-width:24px;height:24px;padding:0 6px;border-radius:12px;display:grid;place-items:center;font-weight:700;font-size:13px;background:var(--panel);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.25)}
.ds-larga{position:absolute;top:6px;right:6px;z-index:1;font-size:11px;padding:2px 6px;border-radius:8px;background:var(--panel);color:var(--muted)}
.ds-tx{flex:1;padding:8px 10px 4px;min-width:0}.ds-tx .t{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.ds-tx .t b{font-size:14px}.ds-tx .p{font-size:13px;white-space:nowrap}
.ds-tx .s{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ds-tx .av{font-size:12px;color:var(--warn);margin-top:2px}
.ds-ac{display:flex;gap:4px;padding:4px 10px 8px}.ds-ac .btn{flex:1;padding:3px 0;min-width:0;display:grid;place-items:center;text-align:center;text-decoration:none;line-height:1.3}
.ds-ac .v{display:none}
.ds-vaga{border:1px dashed var(--line);border-radius:10px;display:grid;place-items:center;text-align:center;padding:14px 10px;color:var(--muted);font-size:12px;min-height:120px;position:relative}
.ds-vaga b{display:block;font-size:13px;color:var(--ink);margin-bottom:2px}
.ds-add{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}
.ds-add input{flex:0 1 260px;min-width:0;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit}
.ds-msg{margin:6px 0 0;font-size:13px}.ds-msg.erro{color:var(--bad)}.ds-msg.ok{color:var(--ok)}.ds-msg.av{color:var(--warn)}
@media (max-width:899px){.ds-grade{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:639px){.ds-grade{grid-template-columns:1fr;gap:6px}
 .ds-it{display:grid;grid-template-columns:72px minmax(0,1fr) auto;align-items:center}
 .ds-ft{aspect-ratio:auto;height:100%;min-height:58px}.ds-n{top:4px;left:4px;min-width:20px;height:20px;font-size:12px}.ds-larga{display:none}
 .ds-tx{padding:6px 8px}.ds-tx .t{display:block}.ds-tx .t b,.ds-tx .p{display:block}.ds-ac{padding:6px 8px 6px 0;gap:3px}.ds-ac .btn{width:30px;flex:none;padding:5px 0}.ds-ac .ver{display:none}.ds-ac .h{display:none}.ds-ac .v{display:inline}
 .ds-vaga{min-height:0;padding:10px 10px 10px 36px;display:block;text-align:left}.ds-vaga .ds-n{top:8px!important}.ds-vaga b{display:inline;margin-right:4px}
 .ds-add input{flex:1 1 160px}}`;
    document.head.appendChild(s); }

  /* 23/11/2026: foto que não carrega some, sem atributo onerror (a política de segurança da página bloqueia código dentro do HTML) */
  if (!window.__dsFalha) { window.__dsFalha = true; document.addEventListener('error', (e) => { const t = e.target; if (t && t.tagName === 'IMG' && t.dataset && t.dataset.dsFalha) t.remove(); }, true); }
  function item(ref, i, n) {
    const x = anuncioDe(ref); const ok = noSite(x);
    const fin = x && x.finalidade && !/venda/i.test(x.finalidade) ? x.finalidade : '';
    const sub = x ? [x.tipo, x.bairro, fin].filter(Boolean).join(' · ') : 'código não achado nos anúncios';
    const aviso = !ok ? `<div class="av">⚠️ Saiu do site${x && x.site_oculto === true ? ' (tirado do site)' : x ? ' (inativo)' : ''}: no site entra o mais recente à venda. Troque.</div>` : '';
    const dis = st.salvando ? ' disabled' : '';
    return `<li class="ds-it${ok ? '' : ' fora'}" draggable="true" data-ds-pos="${i}">
      <div class="ds-ft"><span class="ds-n" title="Posição na vitrine">${i + 1}</span>${i >= 8 ? '<span class="ds-larga" title="O 9º e o 10º só aparecem nas telas largas">telas largas</span>' : ''}
        <img src="${FOTO + esc(String(ref).toLowerCase())}/01.jpg" alt="" loading="lazy" data-ds-falha="1"></div>
      <div class="ds-tx"><div class="t"><b>${x && x._id ? `<button class="ci-lk" data-ds-abre="${esc(x._id)}" title="Abrir o anúncio no HUB">${esc(ref)}</button>` : esc(ref)}</b>${x ? `<span class="p">${esc(preco(x.valor))}</span>` : ''}</div>
        <div class="s" title="${esc(sub)}">${esc(sub)}</div>${aviso}</div>
      <div class="ds-ac">
        <button class="btn" data-ds-sobe="${i}"${i === 0 ? ' disabled' : dis} title="Uma posição antes" aria-label="Pôr ${esc(ref)} uma posição antes"><span class="h">‹</span><span class="v">↑</span></button>
        <button class="btn" data-ds-desce="${i}"${i === n - 1 ? ' disabled' : dis} title="Uma posição depois" aria-label="Pôr ${esc(ref)} uma posição depois"><span class="h">›</span><span class="v">↓</span></button>
        ${ok ? `<a class="btn ver" href="${SITE + esc(String(ref).toLowerCase())}" target="_blank" rel="noopener" title="Ver no site" aria-label="Ver ${esc(ref)} no site">↗</a>` : ''}
        <button class="btn" data-ds-tira="${esc(ref)}"${dis} title="Tirar da vitrine" aria-label="Tirar ${esc(ref)} da vitrine">✕</button>
      </div></li>`;
  }
  const vaga = (i) => `<li class="ds-vaga"><span class="ds-n" style="position:absolute;top:6px;left:6px">${i + 1}</span><div><b>Vaga livre</b>no site, entra o imóvel à venda mais recente${i >= 8 ? ' (só telas largas)' : ''}</div></li>`;

  function render() {
    estilo();
    const L = lista(); const d = doc(); const F = fora();
    const opcoes = anuncios().filter((x) => noSite(x) && !L.includes(String(x.ref || '').toUpperCase()))
      .sort((a, b) => String(b.cadastrado_em || '').localeCompare(String(a.cadastrado_em || '')))
      .map((x) => `<option value="${esc(String(x.ref).toUpperCase())}">${esc([x.tipo, x.bairro].filter(Boolean).join(' · '))}</option>`).join('');
    const vagas = MAX - L.length;
    return `<div class="card ds-topo"><h2>⭐ Destaques do site · ${L.length} de ${MAX}</h2>
      <p class="nota">A vitrine "Imóveis selecionados" da home, nesta ordem. Arraste ou use as setas. Do 9º em diante, só nas telas largas. É a mesma lista do app e da ⭐ de Anúncios do site.</p>
      ${d && d.em ? `<p class="nota">Última mudança: ${esc(d.por || '—')} · ${esc(quando(d.em))}</p>` : ''}
      ${F.length ? `<p class="ds-msg av">⚠️ ${F.length === 1 ? '1 imóvel saiu' : F.length + ' imóveis saíram'} do site (${esc(F.join(', '))}): troque.</p>` : ''}
      ${st.erro ? `<p class="ds-msg erro" role="alert">${esc(st.erro)}</p>` : st.ok ? `<p class="ds-msg ok" role="status">✅ ${esc(st.ok)}</p>` : ''}
    </div>
    <div class="card">${!H.S[C] ? '<p class="nota">Carregando…</p>' : ''}
      <ol class="ds-grade" aria-label="Ordem da vitrine">${L.map((r, i) => item(r, i, L.length)).join('')}${Array.from({ length: Math.max(0, vagas) }, (_, k) => vaga(L.length + k)).join('')}</ol>
      <div class="ds-add"><input id="ds-q" type="search" list="ds-opc" placeholder="Código do imóvel (ex.: AP408)" value="${esc(st.q)}" aria-label="Código do imóvel para pôr na vitrine" autocomplete="off"${vagas <= 0 ? ' disabled' : ''}>
        <datalist id="ds-opc">${opcoes}</datalist>
        <button class="btn pri" data-ds-poe="1"${vagas <= 0 || st.salvando ? ' disabled' : ''}>Pôr na vitrine</button>
        ${vagas <= 0 ? '<span class="nota">Lista cheia: tire um para pôr outro.</span>' : ''}</div>
    </div>`;
  }

  const mover = (de, para) => { const L = lista(); if (de < 0 || para < 0 || de >= L.length || para >= L.length || de === para) return;
    const [r] = L.splice(de, 1); L.splice(para, 0, r); grava(L, `${r} foi para a posição ${para + 1}.`); };

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ds-sobe],[data-ds-desce],[data-ds-tira],[data-ds-poe],[data-ds-abre]'); if (!b || b.disabled) return;
    const d = b.dataset; st.ok = '';
    if (d.dsSobe != null) return mover(+d.dsSobe, +d.dsSobe - 1);
    if (d.dsDesce != null) return mover(+d.dsDesce, +d.dsDesce + 1);
    if (d.dsTira) return window.HUB_DESTAQUES.tira(d.dsTira);
    if (d.dsAbre) { if (H.abrirImovel) H.abrirImovel([d.dsAbre], d.dsAbre); return; }
    if (d.dsPoe) { const i = document.getElementById('ds-q'); const r = String(i && i.value || '').toUpperCase().trim(); st.q = r;
      if (!r) { st.erro = 'Digite o código do imóvel.'; H.pede(); return; }
      const x = anuncioDe(r); if (!noSite(x)) { st.erro = x ? `${r} não está no site: só imóvel no site pode ser destaque.` : `Não achei o código ${r} nos anúncios.`; H.pede(); return; }
      window.HUB_DESTAQUES.poe(r).then((ok) => { if (ok) st.q = ''; H.pede(); }); }
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target && ev.target.id === 'ds-q') { ev.preventDefault(); const b = document.querySelector('[data-ds-poe]'); if (b) b.click(); } });
  document.addEventListener('input', (ev) => { if (ev.target && ev.target.id === 'ds-q') st.q = ev.target.value; });
  // arrastar para ordenar (computador)
  document.addEventListener('dragstart', (ev) => { const li = ev.target.closest && ev.target.closest('.ds-it'); if (!li) return;
    st.arrasta = +li.dataset.dsPos; li.classList.add('arrastando'); try { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(st.arrasta)); } catch (e) {} });
  document.addEventListener('dragover', (ev) => { const li = ev.target.closest && ev.target.closest('.ds-it'); if (!li || st.arrasta < 0) return; ev.preventDefault();
    document.querySelectorAll('.ds-it.alvo').forEach((e) => e.classList.remove('alvo')); li.classList.add('alvo'); });
  document.addEventListener('drop', (ev) => { const li = ev.target.closest && ev.target.closest('.ds-it'); if (!li || st.arrasta < 0) return; ev.preventDefault();
    const de = st.arrasta; st.arrasta = -1; mover(de, +li.dataset.dsPos); });
  document.addEventListener('dragend', () => { st.arrasta = -1; document.querySelectorAll('.ds-it.arrastando,.ds-it.alvo').forEach((e) => e.classList.remove('arrastando', 'alvo')); });

  H.registrar({
    id: ID, aba: 'Destaques do site', grupo: 'estoque', depois: 'cadastro-imoveis', colecoes: [C, 'imoveis'], render,
    dicaBusca: 'Buscar nos destaques do site: código ou bairro…',
    contador: () => fora().length,
    busca(q) { const t = String(q || '').toLowerCase().trim(); if (!t) return [];
      return lista().map((r, i) => ({ r, i, x: anuncioDe(r) })).filter((o) => [o.r, o.x && o.x.bairro].join(' ').toLowerCase().includes(t))
        .map((o) => ({ grp: 'Destaques do site', tit: `${o.i + 1}º · ${o.r}`, sub: o.x ? [o.x.tipo, o.x.bairro].filter(Boolean).join(' · ') : '', ir: { aba: ID } })); },
  });
})();
