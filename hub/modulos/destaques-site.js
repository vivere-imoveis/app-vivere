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
    s.textContent = `.ds-lista{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.ds-it{display:grid;grid-template-columns:28px 88px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
.ds-it[draggable=true]{cursor:grab}.ds-it.arrastando{opacity:.45}.ds-it.alvo{outline:2px dashed var(--accent);outline-offset:2px}
.ds-it.fora{border-color:var(--warn);background:var(--warn-bg)}.ds-it.larga{border-style:dashed}
.ds-n{font-weight:700;font-size:18px;text-align:center;color:var(--muted)}
.ds-foto{width:88px;height:62px;border-radius:6px;object-fit:cover;background:var(--line);display:block}
.ds-tx{min-width:0}.ds-tx b{font-size:14px}.ds-tx .s{font-size:12px;color:var(--muted);overflow-wrap:anywhere}
.ds-ac{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.ds-ac .btn{padding:3px 9px;min-width:34px}
.ds-add{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}.ds-add input{flex:1;min-width:160px;max-width:260px}
.ds-msg{margin:8px 0 0;font-size:13px}.ds-msg.erro{color:var(--bad)}.ds-msg.ok{color:var(--ok)}
.ds-vaga{padding:10px;border:1px dashed var(--line);border-radius:10px;color:var(--muted);font-size:13px}
@media (max-width:560px){.ds-it{grid-template-columns:24px 72px minmax(0,1fr);}.ds-foto{width:72px;height:52px}.ds-ac{grid-column:1/-1;justify-content:flex-start}}`;
    document.head.appendChild(s); }

  function item(ref, i, n) {
    const x = anuncioDe(ref); const ok = noSite(x); const larga = i >= 8;
    const sub = x ? [x.tipo, x.bairro, /venda/i.test(x.finalidade || '') ? 'Venda' : (x.finalidade || '')].filter(Boolean).join(' · ') : 'não achei este código nos anúncios';
    const aviso = !ok ? `<div class="s" style="color:var(--warn)">⚠️ Saiu do site${x && x.site_oculto === true ? ' (tirado do site)' : x ? ' (inativo no Imobibrasil)' : ''}: no site, a vaga vai para o imóvel à venda mais recente. Troque por outro.</div>` : '';
    return `<li class="ds-it${ok ? '' : ' fora'}${larga ? ' larga' : ''}" draggable="true" data-ds-pos="${i}">
      <span class="ds-n" title="Posição na vitrine">${i + 1}</span>
      <img class="ds-foto" src="${FOTO + esc(String(ref).toLowerCase())}/01.jpg" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <div class="ds-tx"><b>${x && x._id ? `<button class="ci-lk" data-ds-abre="${esc(x._id)}" title="Abrir o anúncio">${esc(ref)}</button>` : esc(ref)}</b>${x ? ' · ' + esc(preco(x.valor)) : ''}
        <div class="s">${esc(sub)}${larga ? ' · só em telas largas' : ''}${ok ? ` · <a href="${SITE + esc(String(ref).toLowerCase())}" target="_blank" rel="noopener">ver no site</a>` : ''}</div>${aviso}</div>
      <div class="ds-ac">
        <button class="btn" data-ds-sobe="${i}" ${i === 0 || st.salvando ? 'disabled' : ''} title="Subir uma posição" aria-label="Subir ${esc(ref)}">↑</button>
        <button class="btn" data-ds-desce="${i}" ${i === n - 1 || st.salvando ? 'disabled' : ''} title="Descer uma posição" aria-label="Descer ${esc(ref)}">↓</button>
        <button class="btn" data-ds-tira="${esc(ref)}" ${st.salvando ? 'disabled' : ''} title="Tirar da vitrine" aria-label="Tirar ${esc(ref)}">✕</button>
      </div></li>`;
  }

  function render() {
    estilo();
    const L = lista(); const d = doc(); const F = fora();
    const opcoes = anuncios().filter((x) => noSite(x) && !L.includes(String(x.ref || '').toUpperCase()))
      .sort((a, b) => String(b.cadastrado_em || '').localeCompare(String(a.cadastrado_em || '')))
      .map((x) => `<option value="${esc(String(x.ref).toUpperCase())}">${esc([x.tipo, x.bairro].filter(Boolean).join(' · '))}</option>`).join('');
    const vagas = MAX - L.length;
    return `<div class="card"><h2 style="margin:0 0 4px">⭐ Destaques do site: ${L.length} de ${MAX}</h2>
      <p class="nota" style="margin:0">Os imóveis de "Imóveis selecionados", na home do site, nesta ordem. Os 8 primeiros aparecem em todas as telas; o 9º e o 10º, só nas telas largas. Arraste ou use ↑ ↓ para ordenar. A mesma lista aparece no app (aba Destaques do site) e na ⭐ de Anúncios do site.</p>
      ${d && d.em ? `<p class="nota" style="margin:4px 0 0">Última mudança: ${esc(d.por || '—')} · ${esc(quando(d.em))}</p>` : ''}
      ${F.length ? `<p class="ds-msg" style="color:var(--warn)">⚠️ ${F.length === 1 ? '1 imóvel da lista saiu' : F.length + ' imóveis da lista saíram'} do site (${esc(F.join(', '))}): troque por outro.</p>` : ''}
      ${st.erro ? `<p class="ds-msg erro" role="alert">${esc(st.erro)}</p>` : st.ok ? `<p class="ds-msg ok" role="status">✅ ${esc(st.ok)}</p>` : ''}
    </div>
    <div class="card">${d === null && !H.S[C] ? '<p class="nota">Carregando…</p>' : ''}
      <ol class="ds-lista" aria-label="Ordem da vitrine">${L.map((r, i) => item(r, i, L.length)).join('')}</ol>
      ${vagas > 0 ? `<p class="ds-vaga" style="margin-top:8px">${vagas === 1 ? '1 vaga livre' : vagas + ' vagas livres'}: no site, ${vagas === 1 ? 'ela é preenchida' : 'elas são preenchidas'} pelos imóveis à venda mais recentes.</p>` : ''}
      <div class="ds-add"><input id="ds-q" list="ds-opc" placeholder="Código do imóvel (ex.: AP408)" value="${esc(st.q)}" aria-label="Código do imóvel para pôr na vitrine" autocomplete="off" ${vagas <= 0 ? 'disabled' : ''}>
        <datalist id="ds-opc">${opcoes}</datalist>
        <button class="btn pri" data-ds-poe="1" ${vagas <= 0 || st.salvando ? 'disabled' : ''}>Pôr na vitrine</button>
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
