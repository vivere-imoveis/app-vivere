/* MultiSel — seleção de vários valores (ex.: bairros) com busca, comum ao HUB e aos painéis (26/10/2026, pedido do Cleiton).
   Uso: MultiSel.html(id, [[valor, rótulo], ...], [valores marcados], 'Todos', 'bairros') devolve o HTML;
   cada mudança dispara o evento 'ms-change' (bubbles) com detail {id, valores}. O estado aberto/fechado e o texto
   da busca ficam guardados por id, então o redesenho da tela não fecha a lista. */
window.MultiSel = window.MultiSel || (function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const semAc = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const ST = {};
  const est = (id) => ST[id] || (ST[id] = { aberto: false, q: '', sc: 0 });
  function rotulo(pares, sel, todos, plural) {
    const n = pares.filter(([v]) => sel.includes(v)).map(([, x]) => x);
    return !n.length ? todos : n.length <= 2 ? n.join(', ') : n.length + ' ' + (plural || 'selecionados');
  }
  function html(id, pares, sel, todos, plural) {
    sel = Array.isArray(sel) ? sel : (sel ? [sel] : []);
    const st = est(id), q = semAc(st.q), n = sel.length;
    return `<div class="ms${n ? ' ms-on' : ''}" data-ms="${esc(id)}"><button type="button" class="ms-bt" data-ms-a="abre" aria-expanded="${st.aberto}" title="Escolha um ou mais"><span class="ms-rot">${esc(rotulo(pares, sel, todos, plural))}</span><span aria-hidden="true">▾</span></button>`
      + `<div class="ms-pop"${st.aberto ? '' : ' hidden'}><input type="search" class="ms-q" placeholder="Filtrar a lista…" value="${esc(st.q)}" autocomplete="off">`
      + `<div class="ms-ac"><button type="button" data-ms-a="limpa" title="${esc(todos)}">Limpar</button><button type="button" data-ms-a="mostrados">Marcar os mostrados</button><button type="button" class="ms-ok" data-ms-a="ok">OK</button></div>`
      + `<div class="ms-li">` + pares.map(([v, r]) => `<label class="ms-it"${q && !semAc(r).includes(q) ? ' hidden' : ''}><input type="checkbox" value="${esc(v)}"${sel.includes(v) ? ' checked' : ''}><span>${esc(r)}</span></label>`).join('')
      + (pares.length ? '' : '<span class="ms-vazio">Nada para escolher.</span>') + `</div></div></div>`;
  }
  const raiz = (el) => el && el.closest && el.closest('.ms');
  const marcados = (r) => [...r.querySelectorAll('.ms-li input[type=checkbox]:checked')].map((x) => x.value);
  function avisa(r, valores) {
    const id = r.dataset.ms, li = r.querySelector('.ms-li'); if (li) est(id).sc = li.scrollTop;
    r.dispatchEvent(new CustomEvent('ms-change', { bubbles: true, detail: { id, valores } }));
    [0, 60, 250].forEach((t) => setTimeout(ajusta, t));
  }
  function ajusta() {   // depois do redesenho: devolve a rolagem da lista aberta
    document.querySelectorAll('.ms').forEach((r) => { const st = ST[r.dataset.ms]; const li = r.querySelector('.ms-li'); if (st && st.aberto && li && st.sc && li.scrollTop !== st.sc) li.scrollTop = st.sc; });
  }
  function abre(r, sim) {
    const st = est(r.dataset.ms), pop = r.querySelector('.ms-pop'), bt = r.querySelector('.ms-bt');
    st.aberto = sim; if (pop) pop.hidden = !sim; if (bt) bt.setAttribute('aria-expanded', String(sim));
    if (sim) { const q = r.querySelector('.ms-q'); if (q && window.matchMedia && !window.matchMedia('(pointer:coarse)').matches) setTimeout(() => q.focus(), 0); }
  }
  document.addEventListener('click', (e) => {
    const r = raiz(e.target);
    document.querySelectorAll('.ms').forEach((o) => { if (o !== r && ST[o.dataset.ms] && ST[o.dataset.ms].aberto) abre(o, false); });
    if (!r) return;
    const b = e.target.closest('[data-ms-a]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const a = b.dataset.msA;
    if (a === 'abre') return abre(r, !est(r.dataset.ms).aberto);
    if (a === 'ok') return abre(r, false);
    if (a === 'limpa') { r.querySelectorAll('.ms-li input').forEach((x) => { x.checked = false; }); return avisa(r, []); }
    if (a === 'mostrados') { r.querySelectorAll('.ms-it:not([hidden]) input').forEach((x) => { x.checked = true; }); return avisa(r, marcados(r)); }
  }, true);
  document.addEventListener('change', (e) => {
    const r = raiz(e.target); if (!r || !e.target.matches('.ms-li input[type=checkbox]')) return;
    e.stopPropagation(); avisa(r, marcados(r));
  }, true);
  document.addEventListener('input', (e) => {
    const r = raiz(e.target); if (!r || !e.target.classList.contains('ms-q')) return;
    e.stopPropagation(); const st = est(r.dataset.ms); st.q = e.target.value; const q = semAc(st.q);
    r.querySelectorAll('.ms-it').forEach((l) => { l.hidden = !!q && !semAc(l.textContent).includes(q); });
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const r = raiz(e.target) || document.querySelector('.ms .ms-pop:not([hidden])')?.closest('.ms'); if (r) abre(r, false); } });
  if (!document.getElementById('ms-css')) {
    const s = document.createElement('style'); s.id = 'ms-css';
    s.textContent = `.ms{position:relative;display:inline-block;min-width:170px;max-width:100%;vertical-align:middle;color:var(--ink,inherit);font-size:13px}
.ms-bt{width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left;padding:6px 8px;border:1px solid var(--line,#ccc);border-radius:6px;background:var(--panel,#fff);color:inherit;font:inherit;cursor:pointer;min-height:32px}
.ms-rot{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ms.ms-on .ms-bt{border-color:var(--teal,var(--accent,#2f6f73));box-shadow:inset 0 0 0 1px var(--teal,var(--accent,#2f6f73))}
.ms-pop{position:absolute;z-index:1200;left:0;top:calc(100% + 4px);width:280px;max-width:90vw;background:var(--panel,#fff);color:inherit;border:1px solid var(--line,#ccc);border-radius:8px;box-shadow:0 10px 28px rgba(0,0,0,.22);padding:8px;box-sizing:border-box}
.ms-pop[hidden]{display:none}
.ms-q{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--line,#ccc);border-radius:6px;background:transparent;color:inherit;font:inherit}
.ms-ac{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
.ms-ac button{padding:4px 8px;border:1px solid var(--line,#ccc);border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.ms-ac .ms-ok{margin-left:auto;font-weight:600}
.ms-li{max-height:280px;overflow:auto;display:flex;flex-direction:column;gap:1px}
.ms .ms-it{display:flex!important;flex-direction:row!important;justify-content:flex-start!important;gap:8px!important;align-items:center!important;padding:6px 4px;border-radius:4px;cursor:pointer;font-size:13px!important;line-height:1.25;color:inherit!important;text-align:left}
.ms .ms-it[hidden]{display:none!important}
.ms-it:hover{background:rgba(127,127,127,.14)}
.ms-it input{margin:0;width:16px;height:16px;flex:none}
.ms-vazio{font-size:12px;opacity:.7;padding:6px 4px}
@media (max-width:640px){.ms{display:block;width:100%}.ms-pop{position:fixed;left:8px;right:8px;top:auto;bottom:8px;width:auto;max-width:none;max-height:75vh;display:flex;flex-direction:column}.ms-pop[hidden]{display:none}.ms-li{max-height:none;flex:1;min-height:0}.ms .ms-it{padding:9px 4px;font-size:15px!important}}`;
    (document.head || document.documentElement).appendChild(s);
  }
  return { html, ajusta, estado: ST };
})();

// modulos/empreendimentos.js — módulo Empreendimentos e Construtoras do HUB Vivere
// Contrato: _hub\modulos\LEIA-ME.md. Coleções próprias: empreendimentos_fichas, empreendimentos_construtoras, empreendimentos_config.
// Registra duas abas no grupo Imóveis: "Empreendimentos" (id empreendimentos) e "Construtoras" (id empreendimentos-construtoras).
// Edição no HUB: cada campo editado vira manual {valor, em}; a rotina do módulo só sobrescreve um manual quando a fonte oficial
// traz valor diferente com data posterior (regra do Cleiton, 18/10/2026) — e registra no histórico + pendência baixa.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt;
  const IDE = 'empreendimentos', IDC = 'empreendimentos-construtoras';
  const CF = 'empreendimentos_fichas', CC = 'empreendimentos_construtoras';
  const ST = { lancamento: ['Lançamento', 'ok'], previsto: ['Previsto', 'info'], entregue: ['Entregue/pronto', ''], a_classificar: ['A classificar', 'warn'] };
  const ORD_ST = ['lancamento', 'previsto', 'entregue', 'a_classificar'];
  const MAT = { book: 'Book', tabela_precos: 'Tabela', disponibilidade: 'Espelho', plantas: 'Plantas', memorial: 'Memorial', midias: 'Fotos', video: 'Vídeo', contrato_parceria: 'Parceria', pasta: 'Pasta', site: 'Site', outro: 'Outro' };
  const F = { st: '', con: '', bai: '', q: '', mov: false, pg: 0, sel: '', edit: false, selC: '', editC: false, qc: '' };
  const BAIS = () => (Array.isArray(F.bai) ? F.bai : (F.bai ? [F.bai] : []));   // vários bairros (26/10/2026)
  const fichas = () => H.lista(CF).filter((x) => !x.oculto);
  const cons = () => H.lista(CC);
  const conNome = (id) => { const c = (H.S[CC] || {})[id]; return c ? (c.nome || id) : ''; };
  const val = (x, k) => (x.manual && x.manual[k] && x.manual[k].valor !== undefined ? x.manual[k].valor : x[k]);
  const nrm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const pill = (st) => { const s = ST[st] || [st || '—', '']; return `<span class="pill ${s[1]}">${esc(s[0])}</span>`; };
  const ehMan = (x, k) => x.manual && x.manual[k] ? ' <span class="pill info" title="editado no HUB em ' + esc(dt(x.manual[k].em)) + '">manual</span>' : '';
  const lnk = (url, txt, tit) => url ? `<a href="${escUrl(url)}" target="_blank" rel="noopener"${tit ? ` title="${esc(tit)}"` : ''}>${esc(txt)}</a>` : '';
  const kp = (rot, n, sub, alvo) => `<button class="card" data-emp-st="${esc(alvo)}" style="text-align:left;cursor:pointer;font:inherit;color:inherit" aria-pressed="${F.st === alvo}"><div class="nota" style="margin:0;text-transform:uppercase;letter-spacing:.12em;font-size:11px">${rot}</div><div style="font-size:28px;margin:4px 0">${n}</div><div class="nota" style="margin:0">${sub}</div></button>`;
  const sel = (id, html, lab) => `<label class="nota" style="margin:0;display:inline-flex;gap:6px;align-items:center">${lab || ''}<select id="emp-${id}" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;max-width:100%">${html}</select></label>`;
  const opt = (arr, v, todos) => (todos != null ? `<option value="">${todos}</option>` : '') + arr.map(([k, t]) => `<option value="${esc(k)}" ${k === v ? 'selected' : ''}>${esc(t)}</option>`).join('');
  const inp = (id, v, ph, w) => `<input id="${id}" value="${esc(v || '')}" placeholder="${esc(ph || '')}" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;width:${w || '100%'};box-sizing:border-box">`;
  // botão 📍 do mapa no fim do endereço (núcleo HUB.mapa + módulo link-mapa; 19/10/2026)
  const mapa = (id) => (typeof H.mapa === 'function' ? H.mapa('empreendimento', id) : '');
  const movimento = (x) => (x.anuncios_total || 0) + (x.vendas || []).length + (x.campanhas || []).length + (x.materiais || []).length > 0 || x.na_planilha;
  // índice imóvel -> ficha (para os selos na aba Imóveis)
  let IDX = null, IDXsig = '';
  function idx() { const L = H.S[CF] || {}; const sig = Object.keys(L).length + ':' + (H.carregado[CF] ? 1 : 0);
    if (IDX && sig === IDXsig) return IDX; IDX = {}; IDXsig = sig;
    Object.entries(L).forEach(([id, x]) => (x.anuncios || []).forEach((a) => { (IDX[a.id] = IDX[a.id] || []).push(id); })); return IDX; }

  // ------------------------------------------------------------ gravação (HUB.db, só para quem pode editar)
  async function salvaFicha(col, id, campos) {
    const db = H.db(); if (!db) { alert('Banco indisponível nesta visualização.'); return false; }
    const x = (H.S[col] || {})[id] || {}; const man = Object.assign({}, x.manual || {}); const hoje = H.hojeISO(); const hist = (x.historico || []).slice(-40);
    Object.entries(campos).forEach(([k, v]) => { const ant = val(x, k); if (String(ant == null ? '' : ant) === String(v == null ? '' : v)) return; man[k] = { valor: v, em: hoje }; hist.push({ em: hoje, campo: k, de: ant == null ? '' : ant, para: v, por: 'HUB' }); });
    try { await db.doc(col + '/' + id).update({ manual: man, historico: hist, editado_em: hoje }); return true; } catch (e) { alert('Não foi possível salvar: ' + (e && e.message || e)); return false; }
  }

  // ------------------------------------------------------------ aba Empreendimentos
  function filtra(L) {
    const q = nrm(F.q.trim());
    return L.filter((x) => (!F.st || val(x, 'status') === F.st) && (!F.con || val(x, 'construtora_id') === F.con) && (!BAIS().length || BAIS().includes(val(x, 'bairro'))) && (!F.mov || movimento(x))
      && (!q || nrm([x.nome, (x.nomes || []).join(' '), val(x, 'bairro'), conNome(val(x, 'construtora_id')), val(x, 'construtora_nome')].join(' ')).includes(q)));
  }
  function matResumo(x) { const c = {}; (x.materiais || []).forEach((m) => { c[m.tipo] = (c[m.tipo] || 0) + 1; });
    const s = Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${MAT[k] || k}${n > 1 ? ' ' + n : ''}`).join(' · ');
    return s || '<span class="nota" style="margin:0">—</span>'; }
  function fichaEmp(x) {
    const id = x._id; const ed = F.edit && H.db();
    const cid = val(x, 'construtora_id'); const cn = cid ? conNome(cid) : (val(x, 'construtora_nome') || '');
    const ats = (x.anuncios || []).filter((a) => a.ativo); const ids = (x.anuncios || []).map((a) => a.id);
    const mats = (x.materiais || []).slice().sort((a, b) => (Object.keys(MAT).indexOf(a.tipo) - Object.keys(MAT).indexOf(b.tipo)) || String(b.data || '').localeCompare(String(a.data || '')));
    const linhaMat = (m, i) => `<li><b>${esc(MAT[m.tipo] || m.tipo)}</b> — ${lnk(m.url, m.titulo || m.url)}${m.data ? ` <span class="s" style="display:inline">${dt(m.data)}</span>` : ''}${m.fonte ? ` <span class="pill">${esc(m.fonte)}</span>` : ''}${ed && m.fonte === 'manual' ? ` <button class="btn" data-emp-delmat="${i}">remover</button>` : ''}</li>`;
    const campos = ed ? `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:10px 0">
        <label class="nota" style="margin:0">Status<br>${`<select id="emp-e-status" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;width:100%">${opt(ORD_ST.map((k) => [k, ST[k][0]]), val(x, 'status'))}</select>`}</label>
        <label class="nota" style="margin:0">Construtora<br><select id="emp-e-con" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;width:100%">${opt(cons().sort((a, b) => String(a.nome).localeCompare(b.nome, 'pt-BR')).map((c) => [c._id, c.nome]), cid, '— não identificada —')}</select></label>
        <label class="nota" style="margin:0">Entrega (mês/ano ou texto)<br>${inp('emp-e-entrega', val(x, 'entrega'))}</label>
        <label class="nota" style="margin:0">Bairro<br>${inp('emp-e-bairro', val(x, 'bairro'))}</label>
        <label class="nota" style="margin:0">Endereço<br>${inp('emp-e-endereco', val(x, 'endereco'))}</label>
        <label class="nota" style="margin:0">Site do empreendimento<br>${inp('emp-e-site', val(x, 'site'))}</label>
      </div>
      <label class="nota" style="margin:0">Descrição<br><textarea id="emp-e-descricao" rows="2" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit">${esc(val(x, 'descricao') || '')}</textarea></label>
      <label class="nota" style="margin:6px 0 0">Observações internas<br><textarea id="emp-e-obs" rows="2" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit">${esc(val(x, 'obs') || '')}</textarea></label>
      <div class="filtros" style="margin-top:8px"><button class="btn" data-emp-salvar="${esc(id)}"><b>Salvar</b></button><button class="btn" data-emp-edit="0">Cancelar</button></div>
      <div class="filtros" style="margin-top:8px;align-items:end"><span class="nota" style="margin:0">Adicionar link de material:</span>${sel('m-tipo', opt(Object.entries(MAT), 'book'))}${inp('emp-m-tit', '', 'título', '180px')}${inp('emp-m-url', '', 'https://…', '260px')}<button class="btn" data-emp-addmat="${esc(id)}">Adicionar</button></div>` : '';
    const hist = (x.historico || []).slice(-8).reverse().map((h) => `<li>${dt(h.em)} · ${esc(h.campo)}: <s>${esc(String(h.de || '—')).slice(0, 60)}</s> → ${esc(String(h.para || '—')).slice(0, 60)} <span class="pill">${esc(h.por || '')}</span></li>`).join('');
    return `<div class="card" id="emp-ficha" style="margin:0 0 14px;border-color:var(--accent)">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start"><div><h3 style="margin:0 0 4px">${esc(x.nome)}</h3>
        <div class="nota" style="margin:0">${pill(val(x, 'status'))}${ehMan(x, 'status')} ${esc(x.status_motivo || '')}</div></div>
        <div class="filtros" style="margin:0">${H.db() && !F.edit ? `<button class="btn" data-emp-edit="1">Editar ficha</button>` : ''}<button class="btn" data-emp-fechar="1">Fechar</button></div></div>
      ${campos}
      ${ed ? '' : `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:12px 0">
        <div><div class="nota" style="margin:0">Construtora</div>${cid ? `<button class="btn" data-aba="${IDC}" data-emp-vercon="${esc(cid)}">${esc(cn)}</button>` : esc(cn || '— não identificada —')}${ehMan(x, 'construtora_id')}</div>
        <div><div class="nota" style="margin:0">Entrega</div>${esc(val(x, 'entrega') || '—')}${ehMan(x, 'entrega')}${x.estagio ? `<div class="nota" style="margin:2px 0 0">${esc(x.estagio)}</div>` : ''}</div>
        <div><div class="nota" style="margin:0">Local</div>${esc(val(x, 'bairro') || '—')}${x.cidade ? ' · ' + esc(x.cidade) : ''}<div class="nota" style="margin:2px 0 0">${esc(val(x, 'endereco') || '')}${mapa(x._id)}</div></div>
        <div><div class="nota" style="margin:0">Tipologias</div>${esc(x.tipologias || '—')}</div>
        <div><div class="nota" style="margin:0">R$/m² (área privativa)</div>${(() => { const fx = H.m2 ? H.m2.faixa(ids) : {}; const r = ['V', 'A'].filter((f) => fx[f]).map((f) => { const s = fx[f]; return `<div>${f === 'V' ? 'Venda' : 'Aluguel'}: <b>${esc(H.m2.fmt(s.media))}</b> <span class="s" style="display:inline">média de ${s.n} anúncio${s.n > 1 ? 's' : ''} (ativos e inativos)${s.n > 1 ? ' · ' + esc(H.m2.fx(s.min, s.max)) : ''}</span></div>`; }).join(''); return r || '—'; })()}</div>
        <div><div class="nota" style="margin:0">Links</div>${[lnk(val(x, 'site'), 'site do empreendimento'), lnk(x.link_construtora, 'página na construtora')].filter(Boolean).join(' · ') || '—'}</div>
        <div><div class="nota" style="margin:0">Também chamado</div>${esc((x.nomes || []).filter((n) => n !== x.nome).slice(0, 4).join('; ') || '—')}</div>
      </div>
      ${val(x, 'descricao') ? `<p style="margin:0 0 10px">${esc(val(x, 'descricao'))}</p>` : ''}${val(x, 'obs') ? `<p class="nota">Obs.: ${esc(val(x, 'obs'))}</p>` : ''}`}
      <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
        <div><h4 style="margin:6px 0">Material (${mats.length})</h4>${mats.length ? `<ul style="margin:0;padding-left:18px">${mats.map(linhaMat).join('')}</ul>` : '<p class="nota">Nenhum material localizado.</p>'}
          ${(x.lacunas || []).length ? `<p class="nota">Falta: ${(x.lacunas || []).map((l) => `<span class="pill warn">${esc(l)}</span>`).join(' ')}</p>` : ''}</div>
        <div><h4 style="margin:6px 0">Na Vivere</h4>
          <p style="margin:0 0 6px">${ids.length ? `<button class="btn" data-emp-imv="${esc(id)}">${ats.length} anúncio${ats.length === 1 ? '' : 's'} ativo${ats.length === 1 ? '' : 's'} · ${ids.length} no total → aba Imóveis</button>` : '<span class="nota">Nenhum anúncio no site.</span>'}</p>
          ${(x.vendas || []).length ? `<div class="nota" style="margin:6px 0 2px">Negócios fechados (${x.vendas.length})</div><ul style="margin:0;padding-left:18px">${x.vendas.slice().reverse().slice(0, 12).map((v) => `<li>${dt(v.data)} · ${esc(v.tipo || '')} — ${esc(v.objeto || '')}</li>`).join('')}</ul>` : ''}
          ${(x.campanhas || []).length ? `<div class="nota" style="margin:6px 0 2px">Campanhas de leads</div><ul style="margin:0;padding-left:18px">${x.campanhas.map((c) => `<li>${esc(c.campanha)} — ${esc(c.leads)} leads</li>`).join('')}</ul>` : ''}
        </div></div>
      ${hist ? `<details style="margin-top:8px"><summary class="nota">Histórico de alterações</summary><ul style="margin:4px 0;padding-left:18px">${hist}</ul></details>` : ''}
      <p class="nota" style="margin:8px 0 0">Fontes: ${esc((x.fontes || []).join(', '))}${x.atualizado_em ? ' · rotina em ' + dt(x.atualizado_em) : ''}</p></div>`;
  }
  function renderEmp() {
    const T = fichas();
    if (!T.length) return H.vazio(H.carregado[CF] ? 'Nenhum empreendimento.' : 'Carregando…');
    const cnt = {}; T.forEach((x) => { const s = val(x, 'status') || 'a_classificar'; cnt[s] = (cnt[s] || 0) + 1; });
    const L = filtra(T).sort((a, b) => ORD_ST.indexOf(val(a, 'status')) - ORD_ST.indexOf(val(b, 'status')) || (b.peso || 0) - (a.peso || 0) || String(a.nome).localeCompare(b.nome, 'pt-BR'));
    const pg = Math.min(F.pg, Math.max(0, Math.ceil(L.length / 100) - 1)); const V = (H.buscaAba && H.buscaAba.ativa()) ? L : L.slice(pg * 100, pg * 100 + 100);
    const bairros = [...new Set(T.map((x) => val(x, 'bairro')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((b) => [b, b]);
    const cs = cons().filter((c) => T.some((x) => val(x, 'construtora_id') === c._id)).sort((a, b) => String(a.nome).localeCompare(b.nome, 'pt-BR')).map((c) => [c._id, c.nome]);
    const ficha = F.sel && (H.S[CF] || {})[F.sel] ? fichaEmp(Object.assign({ _id: F.sel }, H.S[CF][F.sel])) : '';
    const linhas = V.map((x) => { const cid = val(x, 'construtora_id'); const ats = (x.anuncios || []).filter((a) => a.ativo).length;
      return `<tr${F.sel === x._id ? ' style="background:var(--soft)"' : ''}><td><button class="btn" data-emp-sel="${esc(x._id)}" title="Abrir a ficha"><b>${esc(x.nome)}</b></button><span class="s">${esc(val(x, 'bairro') || '')}${mapa(x._id)}${x.so_cadastro ? ' · só cadastro' : ''}</span></td>
        <td>${pill(val(x, 'status'))}</td><td>${cid ? `<button class="btn" data-aba="${IDC}" data-emp-vercon="${esc(cid)}">${esc(conNome(cid))}</button>` : `<span class="nota" style="margin:0">${esc(val(x, 'construtora_nome') || '—')}</span>`}</td>
        <td>${esc(val(x, 'entrega') || '—')}</td><td class="n">${(x.anuncios || []).length ? `<button class="btn" data-emp-imv="${esc(x._id)}" title="Ver na aba Imóveis">${ats} / ${(x.anuncios || []).length}</button>` : '—'}</td>
        <td class="n">${(() => { const fx = H.m2 ? H.m2.faixa((x.anuncios || []).map((a) => a.id)) : {}; const v = fx.V; return v ? `${esc(H.m2.fmt(v.media))}<span class="s">${v.n} anúncio${v.n > 1 ? 's' : ''}${v.n > 1 ? ' · ' + esc(H.m2.fx(v.min, v.max)) : ''}</span>` : '—'; })()}</td><td class="n">${(x.vendas || []).length || '—'}</td><td>${matResumo(x)}</td><td>${(x.lacunas || []).slice(0, 2).map((l) => `<span class="pill warn">${esc(l)}</span>`).join(' ')}</td></tr>`; }).join('');
    const nav = L.length > 100 ? `<div class="filtros"><button class="btn" data-emp-pg="${pg - 1}" ${pg ? '' : 'disabled'}>&lt;</button><span class="nota" style="margin:0">${pg * 100 + 1}–${Math.min(L.length, pg * 100 + 100)} de ${L.length}</span><button class="btn" data-emp-pg="${pg + 1}" ${(pg + 1) * 100 < L.length ? '' : 'disabled'}>&gt;</button></div>` : '';
    return `<h2>Empreendimentos</h2>
      <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px">${kp('Lançamentos', cnt.lancamento || 0, 'à venda, entrega futura', 'lancamento')}${kp('Previstos', cnt.previsto || 0, 'pré-lançamento / em breve', 'previsto')}${kp('Entregues/prontos', cnt.entregue || 0, 'prontos ou revenda', 'entregue')}${kp('A classificar', cnt.a_classificar || 0, 'conferir status', 'a_classificar')}</div>
      ${ficha}
      <div class="filtros">${inp('emp-q', F.q, 'buscar empreendimento, bairro ou construtora', '260px')}${sel('con', opt(cs, F.con, 'todas as construtoras'))}<span class="nota" style="margin:0;display:inline-flex;gap:6px;align-items:center">${window.MultiSel.html('emp-bai', bairros, BAIS(), 'todos os bairros', 'bairros')}</span>
        <button class="btn" data-emp-mov="1" aria-pressed="${F.mov}">${F.mov ? '✓ ' : ''}só com movimento na Vivere</button>${F.st ? `<button class="btn" data-emp-st="">limpar status</button>` : ''}</div>
      <p class="nota">${L.length} de ${T.length} empreendimentos. Movimento = anúncio no site, negócio fechado, campanha, material ou planilha das construtoras.</p>${nav}
      <div class="tabela"><table><thead class="quebra"><tr><th>Empreendimento</th><th>Status</th><th>Construtora</th><th>Entrega</th><th class="n">Anúncios<br>ativos / total</th><th class="n">R$/m² venda<br>média</th><th class="n">Negócios</th><th>Material</th><th>Falta</th></tr></thead><tbody>${linhas || '<tr><td colspan="9">Nenhum empreendimento com esses filtros.</td></tr>'}</tbody></table></div>${nav}`;
  }

  // ------------------------------------------------------------ aba Construtoras
  function fichaCon(c) {
    const ed = F.editC && H.db(); const E = fichas().filter((x) => val(x, 'construtora_id') === c._id);
    const porSt = ORD_ST.map((s) => [s, E.filter((x) => val(x, 'status') === s)]).filter(([, a]) => a.length);
    const F2 = [['nome', 'Nome'], ['razao_social', 'Razão social'], ['cnpj', 'CNPJ'], ['site', 'Site oficial'], ['sede', 'Sede'], ['portal_corretor', 'Portal do corretor'], ['instagram', 'Instagram']];
    return `<div class="card" style="margin:0 0 14px;border-color:var(--accent)">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3 style="margin:0">${esc(val(c, 'nome'))}</h3><div class="filtros" style="margin:0">${H.db() && !F.editC ? `<button class="btn" data-emp-editc="1">Editar</button>` : ''}<button class="btn" data-emp-fecharc="1">Fechar</button></div></div>
      ${ed ? `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:10px 0">${F2.map(([k, t]) => `<label class="nota" style="margin:0">${t}<br>${inp('emp-c-' + k, val(c, k))}</label>`).join('')}</div>
        <label class="nota" style="margin:0">Resumo<br><textarea id="emp-c-resumo" rows="2" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit">${esc(val(c, 'resumo') || '')}</textarea></label>
        <div class="filtros" style="margin-top:8px"><button class="btn" data-emp-salvarc="${esc(c._id)}"><b>Salvar</b></button><button class="btn" data-emp-editc="0">Cancelar</button></div>`
      : `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:12px 0">
        <div><div class="nota" style="margin:0">Razão social</div>${esc(val(c, 'razao_social') || '—')}${ehMan(c, 'razao_social')}</div>
        <div><div class="nota" style="margin:0">CNPJ</div>${esc(val(c, 'cnpj') || '—')}${ehMan(c, 'cnpj')}${c.spe ? `<div class="nota" style="margin:2px 0 0">${esc(c.spe)}</div>` : ''}</div>
        <div><div class="nota" style="margin:0">Sede</div>${esc(val(c, 'sede') || '—')}</div>
        <div><div class="nota" style="margin:0">Links</div>${[lnk(val(c, 'site'), 'site oficial'), lnk(val(c, 'portal_corretor'), 'portal do corretor'), lnk(val(c, 'instagram'), 'Instagram')].filter(Boolean).join(' · ') || '—'}</div></div>
        ${val(c, 'resumo') ? `<p style="margin:0 0 10px">${esc(val(c, 'resumo'))}</p>` : ''}`}
      <h4 style="margin:6px 0">Empreendimentos (${E.length})</h4>
      ${porSt.map(([s, a]) => `<p style="margin:4px 0">${pill(s)} ${a.sort((p, q) => String(p.nome).localeCompare(q.nome, 'pt-BR')).map((x) => `<button class="btn" data-aba="${IDE}" data-emp-verfic="${esc(x._id)}" style="margin:2px">${esc(x.nome)}${val(x, 'entrega') ? ' · ' + esc(val(x, 'entrega')) : ''}</button>`).join('')}</p>`).join('') || '<p class="nota">Nenhum empreendimento ligado.</p>'}
      ${(c.fontes || []).length ? `<p class="nota" style="margin:8px 0 0">Fontes: ${(c.fontes || []).slice(0, 4).map((u) => lnk(u, u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40))).join(' · ')}</p>` : ''}</div>`;
  }
  function renderCon() {
    const C = cons(); if (!C.length) return H.vazio(H.carregado[CC] ? 'Nenhuma construtora.' : 'Carregando…');
    const E = fichas(); const q = nrm(F.qc.trim());
    const L = C.filter((c) => !q || nrm([val(c, 'nome'), val(c, 'razao_social'), val(c, 'cnpj')].join(' ')).includes(q))
      .map((c) => Object.assign(c, { _E: E.filter((x) => val(x, 'construtora_id') === c._id) })).sort((a, b) => b._E.length - a._E.length || String(a.nome).localeCompare(b.nome, 'pt-BR'));
    const ficha = F.selC && (H.S[CC] || {})[F.selC] ? fichaCon(Object.assign({ _id: F.selC }, H.S[CC][F.selC])) : '';
    const linhas = L.map((c) => { const n = (s) => c._E.filter((x) => val(x, 'status') === s).length;
      return `<tr${F.selC === c._id ? ' style="background:var(--soft)"' : ''}><td><button class="btn" data-emp-selc="${esc(c._id)}"><b>${esc(val(c, 'nome'))}</b></button><span class="s">${esc(val(c, 'razao_social') || '')}</span></td><td style="white-space:nowrap">${esc(val(c, 'cnpj') || '—')}</td><td>${esc(val(c, 'sede') || '—')}</td>
        <td class="n">${c._E.length}</td><td class="n">${n('lancamento') || '—'}</td><td class="n">${n('previsto') || '—'}</td><td class="n">${n('entregue') || '—'}</td><td>${[lnk(val(c, 'site'), 'site'), lnk(val(c, 'portal_corretor'), 'portal do corretor')].filter(Boolean).join(' · ') || '—'}</td></tr>`; }).join('');
    const semC = E.filter((x) => !val(x, 'construtora_id') && movimento(x)).length;
    return `<h2>Construtoras e incorporadoras</h2>${ficha}
      <div class="filtros">${inp('emp-qc', F.qc, 'buscar construtora, razão social ou CNPJ', '280px')}</div>
      <p class="nota">${C.length} construtoras · ${semC} empreendimentos com movimento ainda sem construtora identificada (corrija na ficha do empreendimento).</p>
      <div class="tabela"><table><thead class="quebra"><tr><th>Construtora</th><th>CNPJ</th><th>Sede</th><th class="n">Empreen-<br>dimentos</th><th class="n">Lança-<br>mentos</th><th class="n">Previstos</th><th class="n">Entregues</th><th>Links</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  H.registrar({ id: IDE, aba: 'Empreendimentos', grupo: 'imoveis', depois: 'portais', colecoes: [CF, CC, 'empreendimentos_config'],
    tipos: { empreendimentos_sem_ficha: 'Empreendimentos — sem ficha', empreendimentos_material: 'Empreendimentos — material desatualizado', empreendimentos_manual: 'Empreendimentos — valor manual atualizado pela rotina', empreendimentos_classificar: 'Empreendimentos — status a classificar' },
    render: renderEmp,
    selos(idImv) { const f = (idx()[idImv] || []).map((k) => [k, (H.S[CF] || {})[k]]).filter(([, x]) => x && !x.oculto);
      return f.map(([k, x]) => ({ txt: 'empreend.: ' + x.nome, cls: 'info', alvo: k, titulo: 'Abrir a ficha do empreendimento' })); },
    foco(alvo) { F.sel = alvo || ''; F.edit = false; setTimeout(() => { const el = document.getElementById('emp-ficha'); if (el) el.scrollIntoView({ block: 'start' }); }, 80); } });
  H.registrar({ id: IDC, aba: 'Construtoras', grupo: 'imoveis', depois: IDE, colecoes: [CC], render: renderCon });

  // ------------------------------------------------------------ eventos (prefixo data-emp-)
  const lerCampo = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  document.addEventListener('click', async (e) => {
    const t = (s) => e.target.closest('[data-emp-' + s + ']');
    let b;
    if ((b = t('st'))) { F.st = F.st === b.dataset.empSt ? '' : b.dataset.empSt; F.pg = 0; H.pede(); return; }
    if ((b = t('sel'))) { F.sel = F.sel === b.dataset.empSel ? '' : b.dataset.empSel; F.edit = false; H.pede(); setTimeout(() => { const el = document.getElementById('emp-ficha'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); return; }
    if ((b = t('fechar'))) { F.sel = ''; F.edit = false; H.pede(); return; }
    if ((b = t('edit'))) { F.edit = b.dataset.empEdit === '1'; H.pede(); return; }
    if ((b = t('mov'))) { F.mov = !F.mov; F.pg = 0; H.pede(); return; }
    if ((b = t('pg'))) { F.pg = Math.max(0, +b.dataset.empPg); H.pede(); window.scrollTo(0, 0); return; }
    if ((b = t('imv'))) { const x = (H.S[CF] || {})[b.dataset.empImv]; if (x) H.abrirImovel((x.anuncios || []).map((a) => a.id), 'Empreendimento ' + x.nome); return; }
    if ((b = t('vercon'))) { F.selC = b.dataset.empVercon; F.editC = false; setTimeout(() => { H.pede(); window.scrollTo(0, 0); }, 0); return; }
    if ((b = t('verfic'))) { F.sel = b.dataset.empVerfic; F.edit = false; setTimeout(() => { H.pede(); window.scrollTo(0, 0); }, 0); return; }
    if ((b = t('selc'))) { F.selC = F.selC === b.dataset.empSelc ? '' : b.dataset.empSelc; F.editC = false; H.pede(); return; }
    if ((b = t('fecharc'))) { F.selC = ''; F.editC = false; H.pede(); return; }
    if ((b = t('editc'))) { F.editC = b.dataset.empEditc === '1'; H.pede(); return; }
    if ((b = t('salvar'))) { const id = b.dataset.empSalvar; const con = lerCampo('emp-e-con');
      const ok = await salvaFicha(CF, id, { status: lerCampo('emp-e-status'), construtora_id: con, entrega: lerCampo('emp-e-entrega'), bairro: lerCampo('emp-e-bairro'), endereco: lerCampo('emp-e-endereco'), site: lerCampo('emp-e-site'), descricao: lerCampo('emp-e-descricao'), obs: lerCampo('emp-e-obs') });
      if (ok) { F.edit = false; H.pede(); } return; }
    if ((b = t('addmat'))) { const id = b.dataset.empAddmat; const url = lerCampo('emp-m-url'); if (!/^https?:\/\//.test(url)) { alert('Informe um link começando com https://'); return; }
      const db = H.db(); if (!db) return; const x = (H.S[CF] || {})[id] || {};
      const mats = (x.materiais || []).concat([{ tipo: lerCampo('emp-m-tipo') || 'outro', titulo: lerCampo('emp-m-tit') || url, url, fonte: 'manual', data: H.hojeISO() }]);
      try { await db.doc(CF + '/' + id).update({ materiais: mats, historico: (x.historico || []).slice(-40).concat([{ em: H.hojeISO(), campo: 'material', de: '', para: url, por: 'HUB' }]) }); } catch (er) { alert('Não foi possível salvar: ' + (er && er.message || er)); } return; }
    if ((b = t('delmat'))) { const x = (H.S[CF] || {})[F.sel]; const db = H.db(); if (!x || !db) return; const i = +b.dataset.empDelmat;
      const mats = (x.materiais || []).slice().sort((a, c) => (Object.keys(MAT).indexOf(a.tipo) - Object.keys(MAT).indexOf(c.tipo)) || String(c.data || '').localeCompare(String(a.data || '')));
      const m = mats[i]; if (!m || m.fonte !== 'manual' || !confirm('Remover o link "' + (m.titulo || m.url) + '"?')) return;
      try { await db.doc(CF + '/' + F.sel).update({ materiais: (x.materiais || []).filter((z) => z !== m && !(z.url === m.url && z.fonte === 'manual')) }); } catch (er) { alert('Não foi possível remover.'); } return; }
    if ((b = t('salvarc'))) { const id = b.dataset.empSalvarc; const campos = {};
      ['nome', 'razao_social', 'cnpj', 'site', 'sede', 'portal_corretor', 'instagram', 'resumo'].forEach((k) => { campos[k] = lerCampo('emp-c-' + k); });
      if (await salvaFicha(CC, id, campos)) { F.editC = false; H.pede(); } return; }
  });
  document.addEventListener('ms-change', (e) => { if (e.detail && e.detail.id === 'emp-bai') { F.bai = e.detail.valores.slice(); F.pg = 0; H.pede(); } });
  document.addEventListener('change', (e) => { const id = e.target && e.target.id;
    if (id === 'emp-con') { F.con = e.target.value; F.pg = 0; H.pede(); } else if (id === 'emp-bai') { F.bai = e.target.value; F.pg = 0; H.pede(); } });
  let tq = null; document.addEventListener('input', (e) => { const id = e.target && e.target.id; if (id !== 'emp-q' && id !== 'emp-qc') return;
    clearTimeout(tq); const v = e.target.value; tq = setTimeout(() => { if (id === 'emp-q') { F.q = v; F.pg = 0; } else F.qc = v; H.pede();
      setTimeout(() => { const el = document.getElementById(id); if (el) { el.focus(); el.setSelectionRange(v.length, v.length); } }, 30); }, 350); });
})();
/* m2-privativa-20261107: R$/m² de área privativa (HUB.m2) */
