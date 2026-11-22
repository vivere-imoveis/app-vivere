// modulos/site-leads.js — aba "Leads do site" (CRM) no HUB Vivere (construção "site-leads", tarefa vis-hub-leads-site, 16/11/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Decisões do Cleiton (cartão, 16/11/2026):
//   • formulário do site cai na fila da diretoria (esta aba) e a Vivian avisa William e Nicollas;
//   • Distribuir = o lead entra no app do corretor (Leads, origem Site) + tarefa com hora, e a Vivian avisa o corretor;
//   • cliques no WhatsApp/telefone (sem dado pessoal): só o resumo por imóvel e por origem, em 7 e 30 dias.
// • Lê: site_leads (um doc por formulário, f-<id>, + _resumo), nível diretoria. Quem grava os docs: o banco (privado.sl_hub_gravar),
//   na hora em que o site registra o contato e de hora em hora (resumo).
// • Grava: só status, corretor, obs e distribuido_por do doc f-<id>. O banco (gatilho privado.sl_do_hub) confere, leva o lead ao app,
//   cria a tarefa do corretor e devolve o doc conferido (com "erro" quando o corretor não tem app ativo).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc;
  const ID = 'site-leads', C = 'site_leads';
  const SITE = 'https://vivere-site.cleitonpazds.workers.dev/imovel/';
  const ST = { novo: ['Novo', 'warn'], distribuido: ['Distribuído', 'ok'], descartado: ['Descartado', 'info'] };
  const ACAO = { agendar_visita: 'Agendar visita', contato: 'Contato', anunciar_imovel: 'Anunciar imóvel', alerta_imovel: 'Alerta de imóvel', whatsapp: 'WhatsApp' };
  const st = { filtro: 'novo', abre: '', modo: '', pg: 0 };
  const PP = 50;
  const n = (v) => Number(v || 0).toLocaleString('pt-BR');
  const hora = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}:\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : '—'; };
  const resumo = () => (H.S[C] || {})._resumo || null;
  const forms = () => H.lista(C).filter((x) => /^f-\d+$/.test(x._id)).sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')) || (b.id || 0) - (a.id || 0));
  const corretores = () => ((resumo() || {}).corretores || []).slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const nNovos = () => forms().filter((x) => (x.status || 'novo') === 'novo').length;
  const telFmt = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
    return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : (t || ''); };

  function kpis() {
    const r = resumo() || {}; const f = r.formularios || {}; const c = r.cliques || {};
    const cx = (rot, num, sub, cor) => `<div class="card"><div class="s">${rot}</div><div class="num"${cor ? ` style="color:var(--${cor})"` : ''}>${num}</div><div class="s">${sub}</div></div>`;
    const ac = c.por_acao_d30 || {};
    return `<div class="resumo-cob">
      ${cx('Formulários aguardando', n(f.novo), f.novo ? 'distribua a um corretor ou descarte' : 'nenhum na fila', f.novo ? 'warn' : 'ok')}
      ${cx('Distribuídos', n(f.distribuido), `${n(f.descartado)} descartados · ${n(f.total)} no total`, '')}
      ${cx('Formulários recebidos', `${n(f.d7)} <span class="s">em 7 dias</span>`, `${n(f.d30)} em 30 dias`, '')}
      ${cx('Cliques no WhatsApp e telefone', `${n(c.d7)} <span class="s">em 7 dias</span>`, `${n(c.d30)} em 30 dias${Object.keys(ac).length ? ' · ' + Object.entries(ac).map(([k, v]) => `${esc(ACAO[k] || k)} ${n(v)}`).join(' · ') : ''}`, '')}
    </div>`;
  }

  function seletor(x) {
    const cs = corretores();
    return `<select data-sl-cor="${esc(x._id)}" aria-label="Corretor"><option value="">Escolha o corretor</option>${cs.map((c) => `<option value="${esc(c.id)}"${c.id === x.corretor ? ' selected' : ''}>${esc(c.nome)}${c.papel === 'diretoria' ? ' (diretoria)' : ''}</option>`).join('')}</select>`;
  }

  function acoes(x) {
    const id = esc(x._id), s = x.status || 'novo';
    if (st.abre === x._id && st.modo === 'distribuir') return `<div class="filtros" style="margin:0">${seletor(x)}<button class="btn" data-sl-ok="${id}">Distribuir</button><button class="btn" data-sl-cancela="1">Cancelar</button></div>`;
    if (st.abre === x._id && st.modo === 'descartar') return `<div class="filtros" style="margin:0"><input type="text" data-sl-motivo="${id}" maxlength="200" placeholder="Motivo (ex.: engano, spam, já é cliente)" aria-label="Motivo do descarte"><button class="btn" data-sl-desc-ok="${id}">Descartar</button><button class="btn" data-sl-cancela="1">Cancelar</button></div>`;
    if (s === 'novo') return `<div class="filtros" style="margin:0"><button class="btn" data-sl-dist="${id}">Distribuir</button><button class="btn" data-sl-desc="${id}">Descartar</button></div>`;
    if (s === 'distribuido') return `<div class="filtros" style="margin:0"><button class="btn" data-sl-dist="${id}">Trocar corretor</button></div>`;
    return `<div class="filtros" style="margin:0"><button class="btn" data-sl-volta="${id}">Voltar para a fila</button></div>`;
  }

  // alerta de imóvel novo (18/11/2026): resumo curto do perfil da busca que a pessoa fez no site
  const perfilTxt = (p) => { if (!p || typeof p !== 'object') return 'avisar quando entrar imóvel assim';
    const L = (k) => (Array.isArray(p[k]) ? p[k] : []);
    const v = (x) => (x >= 1e6 ? (x / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi' : x >= 1e3 ? Math.round(x / 1e3) + ' mil' : String(x));
    return [p.tab === 'locacao' ? (p.modo === 'temporada' ? 'Temporada' : 'Locação') : 'Compra', [...L('regioes'), ...L('bairros')].join(', '), L('tipos').join(', '),
      p.pmin && p.pmax ? `${v(p.pmin)} a ${v(p.pmax)}` : p.pmax ? `até ${v(p.pmax)}` : p.pmin ? `acima de ${v(p.pmin)}` : '',
      p.dorm ? `${p.dorm}+ quartos` : '', p.suites ? `${p.suites}+ suítes` : '', p.vagas ? `${p.vagas}+ vagas` : ''].filter(Boolean).join(' · '); };

  function linha(x) {
    const s = ST[x.status || 'novo'] || [x.status, ''];
    const tel = telFmt(x.telefone), wa = String(x.telefone || '').replace(/\D/g, '');
    const imo = x.codigo ? `<a href="${esc(SITE + String(x.codigo).toLowerCase())}" target="_blank" rel="noopener"><b>${esc(x.codigo)}</b></a><span class="s">${esc(x.imovel || '')}</span>` : x.acao === 'alerta_imovel' ? `<b>Busca salva</b><span class="s">${esc(perfilTxt(x.perfil))}</span>` : '<span class="s">sem imóvel (seção geral)</span>';
    const sit = `<span class="pill ${s[1]}">${esc(s[0])}</span>${x.status === 'distribuido' && x.corretor_nome ? `<span class="s">${esc(x.corretor_nome)}${x.distribuido_em ? ' · ' + hora(x.distribuido_em) : ''}${x.distribuido_por ? ' · por ' + esc(x.distribuido_por) : ''}</span>` : ''}${x.status === 'descartado' && x.obs ? `<span class="s">${esc(x.obs)}</span>` : ''}${x.erro ? `<span class="pill bad" style="margin-top:4px">${esc(x.erro)}</span>` : ''}${st.abre === x._id && st.salvando ? '<span class="s">Gravando…</span>' : ''}${st.falha && st.falha.id === x._id ? `<span class="pill bad" style="margin-top:4px">${esc(st.falha.msg)}</span>` : ''}`;
    return `<tr id="sl-${esc(x._id)}">
      <td>${hora(x.criado_em)}</td>
      <td><b>${esc(x.nome || '(sem nome)')}</b><span class="s" data-sens>${wa ? `<a href="https://wa.me/${wa.length <= 11 ? '55' + wa : wa}" target="_blank" rel="noopener">${esc(tel)}</a>` : '—'}${x.email ? ' · ' + esc(x.email) : ''}</span></td>
      <td>${imo}</td>
      <td>${esc(ACAO[x.acao] || x.acao || '—')}<span class="s">${esc(x.origem || '')}</span></td>
      <td class="ta-larga" data-sens>${esc(x.mensagem || '—')}</td>
      <td>${sit}</td>
      <td class="ta-acoes">${acoes(x)}</td></tr>`;
  }

  function tabela() {
    const L0 = forms();
    const cont = { novo: 0, distribuido: 0, descartado: 0 }; L0.forEach((x) => { cont[x.status || 'novo'] = (cont[x.status || 'novo'] || 0) + 1; });
    const L = st.filtro ? L0.filter((x) => (x.status || 'novo') === st.filtro) : L0;
    const nPg = Math.max(1, Math.ceil(L.length / PP)); if (st.pg >= nPg) st.pg = nPg - 1;
    const pg = L.slice(st.pg * PP, (st.pg + 1) * PP);
    const chips = `<div class="filtros"><span class="s">Situação:</span>${[['novo', 'Aguardando'], ['distribuido', 'Distribuídos'], ['descartado', 'Descartados'], ['', 'Todos']].map(([k, r]) => `<button class="btn" data-sl-filtro="${k}" aria-pressed="${st.filtro === k}">${r} (${n(k ? cont[k] : L0.length)})</button>`).join('')}</div>`;
    const pag = L.length > PP ? `<div class="filtros pag"><span class="s">${n(st.pg * PP + 1)}–${n(Math.min(L.length, (st.pg + 1) * PP))} de ${n(L.length)}</span><button class="btn" data-sl-pg="-1"${st.pg ? '' : ' disabled'}>‹ Anterior</button><button class="btn" data-sl-pg="1"${st.pg < nPg - 1 ? '' : ' disabled'}>Próxima ›</button></div>` : '';
    if (!L.length) return chips + H.vazio(H.carregado[C] ? (st.filtro === 'novo' ? 'Nenhum formulário aguardando distribuição.' : 'Nenhum formulário nesta situação.') : 'Carregando…');
    return chips + pag + `<div class="tabela"><table><thead><tr><th>Quando</th><th>Contato</th><th>Imóvel</th><th>Pedido e origem</th><th>Mensagem</th><th>Situação</th><th>Ação</th></tr></thead><tbody>${pg.map(linha).join('')}</tbody></table></div>` + pag;
  }

  function cliques() {
    const r = resumo() || {}; const I = r.por_imovel || [], O = r.por_origem || [];
    const t = (cab, linhas) => `<div class="tabela"><table><thead><tr>${cab}</tr></thead><tbody>${linhas}</tbody></table></div>`;
    const ti = I.length ? t('<th>Imóvel</th><th class="n">7 dias</th><th class="n">30 dias</th>', I.map((x) => `<tr><td>${x.codigo && x.codigo !== '—' ? `<a href="${esc(SITE + String(x.codigo).toLowerCase())}" target="_blank" rel="noopener"><b>${esc(x.codigo)}</b></a>` : '<b>Sem imóvel</b>'}<span class="s">${esc(x.imovel || '')}</span></td><td class="n">${n(x.d7)}</td><td class="n">${n(x.d30)}</td></tr>`).join('')) : H.vazio('Nenhum clique nos últimos 30 dias.');
    const to = O.length ? t('<th>Origem do anúncio</th><th class="n">7 dias</th><th class="n">30 dias</th>', O.map((x) => `<tr><td>${esc(x.origem)}</td><td class="n">${n(x.d7)}</td><td class="n">${n(x.d30)}</td></tr>`).join('')) : '';
    return `<h2 style="margin-top:22px">Cliques no WhatsApp e no telefone</h2><p class="nota">Quem clica no WhatsApp ou no telefone do site não deixa nome nem número aqui (a conversa segue no WhatsApp da Vivere). Por isso só os totais: por imóvel (os 30 mais clicados) e pela origem do anúncio (Google Ads, Meta, campanha marcada no link ou acesso direto).${r.atualizado_em ? ` Atualizado em ${hora(r.atualizado_em)}.` : ''}</p>
      <div class="grid2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px">${ti}${to}</div>`;
  }

  function render() {
    const topo = '<h2>Leads do site</h2><p class="nota">Os contatos deixados no formulário do site da Vivere (nome e telefone, com o aceite da Política de Privacidade) caem aqui, na fila da diretoria. <b>Distribuir</b> leva o lead na hora para o app do corretor (Leads, origem Site) com uma tarefa de retorno, e a Vivian avisa o corretor no WhatsApp. William e Nicollas recebem recado no app e aviso da Vivian a cada formulário novo. O aviso no WhatsApp só sai para quem falou com a Vivian nas últimas 24 horas; fora disso, fica a tarefa no app.</p>';
    return topo + kpis() + '<h2 style="margin-top:8px">Formulários</h2>' + tabela() + cliques();
  }

  async function grava(id, campos) {
    const DB = H.db(); const x = (H.S[C] || {})[id]; if (!DB || !x) return;
    st.salvando = true; st.falha = null; H.pede();
    // set com o documento inteiro (não update): os docs desta coleção nascem no Supabase e não existem no banco do artefato;
    // um update falharia no artefato e o espelho da base trataria o doc como apagado (achado no teste de 16/11/2026)
    const doc = Object.assign({}, x, campos); delete doc._id; delete doc.erro;
    try { await DB.doc(C + '/' + id).set(doc); st.abre = ''; st.modo = ''; }
    catch (e) { st.falha = { id, msg: 'Não consegui gravar (' + ((e && e.code) || 'erro') + '). Tente de novo.' }; }
    st.salvando = false; H.pede();
  }
  const quem = () => { try { return (H.usuario && (H.usuario.nome || H.usuario.email)) || 'Diretoria (HUB)'; } catch (_) { return 'Diretoria (HUB)'; } };

  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-sl-filtro],[data-sl-dist],[data-sl-desc],[data-sl-ok],[data-sl-desc-ok],[data-sl-cancela],[data-sl-volta],[data-sl-pg]');
    if (!t) return;
    const d = t.dataset;
    if (d.slFiltro !== undefined) { st.filtro = d.slFiltro; st.pg = 0; H.pede(); return; }
    if (d.slPg) { st.pg = Math.max(0, st.pg + (+d.slPg)); H.pede(); return; }
    if (d.slCancela) { st.abre = ''; st.modo = ''; H.pede(); return; }
    if (d.slDist) { st.abre = d.slDist; st.modo = 'distribuir'; H.pede(); return; }
    if (d.slDesc) { st.abre = d.slDesc; st.modo = 'descartar'; H.pede(); setTimeout(() => { const i = document.querySelector(`[data-sl-motivo="${CSS.escape(d.slDesc)}"]`); if (i) i.focus(); }, 50); return; }
    if (d.slOk) {
      const sel = document.querySelector(`[data-sl-cor="${CSS.escape(d.slOk)}"]`); const cor = sel && sel.value;
      if (!cor) { if (sel) sel.focus(); return; }
      grava(d.slOk, { status: 'distribuido', corretor: cor, distribuido_por: quem() }); return;
    }
    if (d.slDescOk) {
      const i = document.querySelector(`[data-sl-motivo="${CSS.escape(d.slDescOk)}"]`); const m = i && i.value.trim();
      if (!m) { if (i) i.focus(); return; }
      grava(d.slDescOk, { status: 'descartado', obs: m }); return;
    }
    if (d.slVolta) { grava(d.slVolta, { status: 'novo', obs: '' }); }
  });

  H.registrar({
    id: ID, aba: 'Leads do site', grupo: 'crm', depois: 'captacao-leads', colecoes: [C], render,
    dicaBusca: 'Buscar nos leads do site: nome, código do imóvel ou origem…',
    contador: () => nNovos(),
    foco(alvo) { const x = (H.S[C] || {})[String(alvo || '')]; if (x) { st.filtro = ''; st.pg = 0; } },
    busca(q) {
      const t = String(q || '').toLowerCase().trim(); if (!t) return [];
      return forms().filter((x) => [x.nome, x.codigo, x.origem, x.corretor_nome].join(' ').toLowerCase().includes(t)).slice(0, 12)
        .map((x) => ({ grp: 'Leads do site', tit: `${x.nome || '(sem nome)'}${x.codigo ? ' · ' + x.codigo : ''}`, sub: `${(ST[x.status || 'novo'] || [''])[0]} · ${hora(x.criado_em)}`, ir: { aba: ID, linha: 'sl-' + x._id, alvo: x._id } }));
    },
  });
})();
