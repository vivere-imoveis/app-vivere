// modulos/leads-a-classificar.js — aba "Leads a classificar" (CRM) no HUB Vivere (construção "leads-a-classificar", 20/11/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Pedido do Cleiton (20/11/2026): os leads que um dia tiveram interesse de compra ou venda e não se
// sabe para qual corretor foram ficam num campo próprio, como "leads a classificar": leads em potencial para follow-up futuro.
// Primeira carga: as listas do Deivis de 19/11/2026 (PDFs "leads 2", "leads 3" e os sem corretor do "leads 1").
// • Lê: leads_a_classificar (um doc por lead, lc-<hash>), nível diretoria; site_leads/_resumo só para a lista de corretores com app.
// • Grava: só situacao, corretor, obs e distribuido_por do doc. Distribuir: o banco (gatilho privado.lc_do_hub) leva o lead ao app do
//   corretor (Leads, etapa Novo, origem planilha) e devolve o doc com lead_painel, distribuido_em e corretor_nome (ou "erro").
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc;
  const ID = 'leads-a-classificar', C = 'leads_a_classificar';
  const ST = { a_classificar: ['A classificar', 'warn'], distribuido: ['Distribuído', 'ok'], descartado: ['Descartado', 'info'] };
  const INT = { comprador: 'Procura comprar', vendedor: 'Tem para vender', comprador_vendedor: 'Vende e compra', locatario_anual: 'Procura alugar', locador_anual: 'Tem para alugar', a_definir: 'A definir' };
  const st = { filtro: 'a_classificar', int: '', fonte: '', q: '', abre: '', modo: '', pg: 0, pp: 50 };
  try { const v = +localStorage.getItem('hubv.lac.pp'); if (v === 50 || v === 100) st.pp = v; } catch (_) {}
  const n = (v) => Number(v || 0).toLocaleString('pt-BR');
  const dataBR = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : '—'; };
  const sit = (x) => x.situacao || 'a_classificar';
  const todos = () => H.lista(C).filter((x) => /^lc-/.test(x._id)).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
  const corretores = () => (((H.S.site_leads || {})._resumo || {}).corretores || []).slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const nAguardando = () => todos().filter((x) => sit(x) === 'a_classificar').length;
  const telFmt = (t) => { const s = String(t || ''); if (s.startsWith('+')) return s; const d = s.replace(/\D/g, '');
    return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : s; };
  const waNum = (t) => { const s = String(t || ''), d = s.replace(/\D/g, ''); if (!d) return ''; return s.startsWith('+') ? d : (d.length <= 11 ? '55' + d : d); };

  function kpis(L) {
    const c = (k) => L.filter((x) => sit(x) === k).length;
    const ci = (k) => L.filter((x) => (x.interesse || 'a_definir') === k).length;
    const cx = (rot, num, sub, cor) => `<div class="card"><div class="s">${rot}</div><div class="num"${cor ? ` style="color:var(--${cor})"` : ''}>${num}</div><div class="s">${sub}</div></div>`;
    return `<div class="resumo-cob">
      ${cx('A classificar', n(c('a_classificar')), c('a_classificar') ? 'distribua a um corretor ou descarte' : 'nenhum aguardando', c('a_classificar') ? 'warn' : 'ok')}
      ${cx('Distribuídos', n(c('distribuido')), `${n(c('descartado'))} descartados · ${n(L.length)} no total`, '')}
      ${cx('Interesse de compra', n(ci('comprador') + ci('comprador_vendedor')), `${n(ci('vendedor') + ci('comprador_vendedor'))} com imóvel para vender`, '')}
      ${cx('Interesse a definir', n(ci('a_definir')), 'só nome e telefone na lista de origem', '')}
    </div>`;
  }

  function seletor(x) {
    const cs = corretores();
    return `<select data-lac-cor="${esc(x._id)}" aria-label="Corretor"><option value="">Escolha o corretor</option>${cs.map((c) => `<option value="${esc(c.id)}"${c.id === x.corretor ? ' selected' : ''}>${esc(c.nome)}${c.papel === 'diretoria' ? ' (diretoria)' : ''}</option>`).join('')}</select>`;
  }

  function acoes(x) {
    const id = esc(x._id), s = sit(x);
    if (st.abre === x._id && st.modo === 'distribuir') return `<div class="filtros" style="margin:0">${seletor(x)}<button class="btn" data-lac-ok="${id}">Distribuir</button><button class="btn" data-lac-cancela="1">Cancelar</button></div>`;
    if (st.abre === x._id && st.modo === 'descartar') return `<div class="filtros" style="margin:0"><input type="text" data-lac-motivo="${id}" maxlength="200" placeholder="Motivo (ex.: já comprou, número errado)" aria-label="Motivo do descarte"><button class="btn" data-lac-desc-ok="${id}">Descartar</button><button class="btn" data-lac-cancela="1">Cancelar</button></div>`;
    if (s === 'a_classificar') return `<div class="filtros" style="margin:0"><button class="btn" data-lac-dist="${id}">Distribuir</button><button class="btn" data-lac-desc="${id}">Descartar</button></div>`;
    if (s === 'distribuido') return `<div class="filtros" style="margin:0"><span class="s">no app de ${esc(x.corretor_nome || x.lead_painel || 'corretor')}</span></div>`;
    return `<div class="filtros" style="margin:0"><button class="btn" data-lac-volta="${id}">Voltar para a fila</button></div>`;
  }

  function linha(x) {
    const s = ST[sit(x)] || [sit(x), ''];
    const tel = telFmt(x.telefone), wa = waNum(x.telefone);
    const perfil = [x.tipo_imovel, x.bairro].filter(Boolean).join(' · ');
    const situ = `<span class="pill ${s[1]}">${esc(s[0])}</span>${sit(x) === 'distribuido' && x.corretor_nome ? `<span class="s">${esc(x.corretor_nome)}${x.distribuido_em ? ' · ' + dataBR(x.distribuido_em) : ''}${x.distribuido_por ? ' · por ' + esc(x.distribuido_por) : ''}</span>` : ''}${sit(x) === 'descartado' && x.descarte_obs ? `<span class="s">${esc(x.descarte_obs)}</span>` : ''}${x.erro ? `<span class="pill bad" style="margin-top:4px">${esc(x.erro)}</span>` : ''}${st.abre === x._id && st.salvando ? '<span class="s">Gravando…</span>' : ''}${st.falha && st.falha.id === x._id ? `<span class="pill bad" style="margin-top:4px">${esc(st.falha.msg)}</span>` : ''}`;
    return `<tr id="lac-${esc(x._id)}">
      <td><b>${esc(x.nome || '(sem nome)')}</b><span class="s" data-sens>${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener">${esc(tel)}</a>` : esc(tel || '—')}${x.telefone_conferir ? ' · <span class="pill warn">conferir número</span>' : ''}</span></td>
      <td>${esc(INT[x.interesse] || x.interesse || 'A definir')}${perfil ? `<span class="s">${esc(perfil)}</span>` : ''}</td>
      <td class="ta-larga">${esc(x.obs || '—')}${x.status_original ? `<span class="s">Na lista: ${esc(x.status_original)}</span>` : ''}</td>
      <td>${x.data_contato ? dataBR(x.data_contato) : '—'}<span class="s">${esc(x.fonte || '')}</span></td>
      <td>${situ}</td>
      <td class="ta-acoes">${acoes(x)}</td></tr>`;
  }

  function filtrar(L0) {
    const q = st.q.toLowerCase().trim(), qd = q.replace(/\D/g, '');
    return L0.filter((x) => (!st.filtro || sit(x) === st.filtro) && (!st.int || (x.interesse || 'a_definir') === st.int) && (!st.fonte || x.fonte === st.fonte)
      && (!q || [x.nome, x.bairro, x.tipo_imovel, x.obs, x.fonte].join(' ').toLowerCase().includes(q) || (qd.length >= 4 && String(x.telefone || '').replace(/\D/g, '').includes(qd))));
  }

  function tabela(L0) {
    const cont = { a_classificar: 0, distribuido: 0, descartado: 0 }; L0.forEach((x) => { cont[sit(x)] = (cont[sit(x)] || 0) + 1; });
    const fontes = [...new Set(L0.map((x) => x.fonte).filter(Boolean))].sort();
    const ints = Object.keys(INT).filter((k) => L0.some((x) => (x.interesse || 'a_definir') === k));
    const L = filtrar(L0);
    const PP = st.pp, nPg = Math.max(1, Math.ceil(L.length / PP)); if (st.pg >= nPg) st.pg = nPg - 1;
    const pg = L.slice(st.pg * PP, (st.pg + 1) * PP);
    const chips = `<div class="filtros"><span class="s">Situação:</span>${[['a_classificar', 'A classificar'], ['distribuido', 'Distribuídos'], ['descartado', 'Descartados'], ['', 'Todos']].map(([k, r]) => `<button class="btn" data-lac-filtro="${k}" aria-pressed="${st.filtro === k}">${r} (${n(k ? cont[k] : L0.length)})</button>`).join('')}</div>
      <div class="filtros"><span class="s">Interesse:</span><select data-lac-int="1" aria-label="Interesse"><option value="">Todos</option>${ints.map((k) => `<option value="${k}"${st.int === k ? ' selected' : ''}>${esc(INT[k])}</option>`).join('')}</select>
      <span class="s">Lista de origem:</span><select data-lac-fonte="1" aria-label="Lista de origem"><option value="">Todas</option>${fontes.map((f) => `<option value="${esc(f)}"${st.fonte === f ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select>
      <input type="search" data-lac-q="1" value="${esc(st.q)}" placeholder="Nome, bairro, telefone…" aria-label="Buscar nos leads a classificar"></div>`;
    const pag = L.length > 50 ? `<div class="filtros pag"><span class="s">${n(st.pg * PP + 1)}–${n(Math.min(L.length, (st.pg + 1) * PP))} de ${n(L.length)}</span><button class="btn" data-lac-pg="-1"${st.pg ? '' : ' disabled'}>‹ Anterior</button><button class="btn" data-lac-pg="1"${st.pg < nPg - 1 ? '' : ' disabled'}>Próxima ›</button><span class="s">Por página:</span><select data-lac-pp="1" aria-label="Por página"><option${PP === 50 ? ' selected' : ''}>50</option><option${PP === 100 ? ' selected' : ''}>100</option></select></div>` : '';
    if (!L.length) return chips + H.vazio(H.carregado[C] ? 'Nenhum lead neste filtro.' : 'Carregando…');
    return chips + pag + `<div class="tabela"><table><thead><tr><th>Contato</th><th>Interesse</th><th>Anotação</th><th>Último contato e origem</th><th>Situação</th><th>Ação</th></tr></thead><tbody>${pg.map(linha).join('')}</tbody></table></div>` + pag;
  }

  function render() {
    const L0 = todos();
    const topo = '<h2>Leads a classificar</h2><p class="nota">Pessoas que em algum momento tiveram interesse de compra ou venda de imóvel e que não se sabe para qual corretor foram: leads em potencial para um follow-up no futuro. <b>Distribuir</b> leva o lead na hora para o app do corretor (Leads, etapa Novo), com a anotação da lista no histórico; <b>Descartar</b> pede o motivo. Nada se apaga.</p>';
    return topo + kpis(L0) + tabela(L0);
  }

  async function grava(id, campos) {
    const DB = H.db(); const x = (H.S[C] || {})[id]; if (!DB || !x) return;
    st.salvando = true; st.falha = null; H.pede();
    // set com o documento inteiro (como em site-leads): os docs nascem no Supabase e não existem no banco do artefato
    const doc = Object.assign({}, x, campos); delete doc._id; delete doc.erro;
    try { await DB.doc(C + '/' + id).set(doc); st.abre = ''; st.modo = ''; }
    catch (e) { st.falha = { id, msg: 'Não consegui gravar (' + ((e && e.code) || 'erro') + '). Tente de novo.' }; }
    st.salvando = false; H.pede();
  }
  const quem = () => { try { return (H.usuario && (H.usuario.nome || H.usuario.email)) || 'Diretoria (HUB)'; } catch (_) { return 'Diretoria (HUB)'; } };

  document.addEventListener('change', (e) => {
    const t = e.target; if (!t || !t.dataset) return;
    if (t.dataset.lacInt !== undefined) { st.int = t.value; st.pg = 0; H.pede(); }
    else if (t.dataset.lacFonte !== undefined) { st.fonte = t.value; st.pg = 0; H.pede(); }
    else if (t.dataset.lacPp !== undefined) { st.pp = +t.value === 100 ? 100 : 50; st.pg = 0; try { localStorage.setItem('hubv.lac.pp', String(st.pp)); } catch (_) {} H.pede(); }
  });
  let qT = null;
  document.addEventListener('input', (e) => {
    const t = e.target; if (!t || !t.dataset || t.dataset.lacQ === undefined) return;
    clearTimeout(qT); qT = setTimeout(() => { st.q = t.value; st.pg = 0; H.pede();
      setTimeout(() => { const i = document.querySelector('[data-lac-q]'); if (i) { i.focus(); const v = i.value; i.setSelectionRange(v.length, v.length); } }, 30); }, 300);
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-lac-filtro],[data-lac-dist],[data-lac-desc],[data-lac-ok],[data-lac-desc-ok],[data-lac-cancela],[data-lac-volta],[data-lac-pg]');
    if (!t) return;
    const d = t.dataset;
    if (d.lacFiltro !== undefined) { st.filtro = d.lacFiltro; st.pg = 0; H.pede(); return; }
    if (d.lacPg) { st.pg = Math.max(0, st.pg + (+d.lacPg)); H.pede(); return; }
    if (d.lacCancela) { st.abre = ''; st.modo = ''; H.pede(); return; }
    if (d.lacDist) { st.abre = d.lacDist; st.modo = 'distribuir'; H.pede(); return; }
    if (d.lacDesc) { st.abre = d.lacDesc; st.modo = 'descartar'; H.pede(); setTimeout(() => { const i = document.querySelector(`[data-lac-motivo="${CSS.escape(d.lacDesc)}"]`); if (i) i.focus(); }, 50); return; }
    if (d.lacOk) {
      const sel = document.querySelector(`[data-lac-cor="${CSS.escape(d.lacOk)}"]`); const cor = sel && sel.value;
      if (!cor) { if (sel) sel.focus(); return; }
      grava(d.lacOk, { situacao: 'distribuido', corretor: cor, distribuido_por: quem() }); return;
    }
    if (d.lacDescOk) {
      const i = document.querySelector(`[data-lac-motivo="${CSS.escape(d.lacDescOk)}"]`); const m = i && i.value.trim();
      if (!m) { if (i) i.focus(); return; }
      grava(d.lacDescOk, { situacao: 'descartado', descarte_obs: m }); return;
    }
    if (d.lacVolta) { grava(d.lacVolta, { situacao: 'a_classificar', descarte_obs: '' }); }
  });

  H.registrar({
    id: ID, aba: 'Leads a classificar', grupo: 'crm', depois: 'site-leads', colecoes: [C, 'site_leads'], render,
    dicaBusca: 'Buscar nos leads a classificar: nome, bairro ou telefone…',
    contador: () => nAguardando(),
    foco(alvo) { const x = (H.S[C] || {})[String(alvo || '')]; if (x) { st.filtro = ''; st.int = ''; st.fonte = ''; st.q = ''; st.pg = 0; } },
    busca(q) {
      const t = String(q || '').toLowerCase().trim(); if (!t) return [];
      const td = t.replace(/\D/g, '');
      return todos().filter((x) => [x.nome, x.bairro, x.obs].join(' ').toLowerCase().includes(t) || (td.length >= 4 && String(x.telefone || '').replace(/\D/g, '').includes(td))).slice(0, 12)
        .map((x) => ({ grp: 'Leads a classificar', tit: `${x.nome || '(sem nome)'}${x.bairro ? ' · ' + x.bairro : ''}`, sub: `${(ST[sit(x)] || [''])[0]} · ${INT[x.interesse] || 'A definir'}`, ir: { aba: ID, linha: 'lac-' + x._id, alvo: x._id } }));
    },
  });
})();
