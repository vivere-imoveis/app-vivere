// modulos/portais.js — módulo Portais do HUB Vivere (CanalPro: ZAP, Viva Real, OLX)
// Contrato: _hub\modulos\LEIA-ME.md. Lê só as coleções portais_* e as pendências com origem 'portais'.
// Não grava nada no banco (a coleta e as pendências são da rotina do módulo).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl0 = H.brl0;
  const F = { fin: '', mes: '', imv: '', q: '', pg: 0, retirados: false, foco: '' };
  const mesTxt = (s) => { if (!s) return '—'; const [y, m] = String(s).split('-'); const n = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+m - 1]; return n ? `${n}/${y.slice(2)}` : s; };
  const hoje = () => H.hojeISO();
  const diasDesde = (d) => (d ? Math.round((Date.parse(hoje()) - Date.parse(d)) / 864e5) : null);
  const num = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR'));
  const TIPO = { chat: 'chat', form: 'formulário', whats: 'WhatsApp', tel: 'ver telefone', agenda: 'agendar visita', proposta: 'proposta' };
  const SITU = { ativo: ['no site', 'ok'], inativo: ['inativo no site', 'bad'], locado: ['locado', 'bad'], 'fora do site': ['fora do site', 'bad'] };
  const cfg = () => ((H.S.portais_config || {}).parametros) || {};
  const kp = (rot, n, sub, cls) => `<div class="card"><div class="nota" style="margin:0;text-transform:uppercase;letter-spacing:.12em;font-size:11px">${rot}</div><div style="font-size:30px;margin:4px 0${cls ? ';color:var(--' + cls + ')' : ''}">${n}</div><div class="nota" style="margin:0">${sub}</div></div>`;
  const sel = (id, html) => `<select id="pt-${id}" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;min-width:0;max-width:100%">${html}</select>`;
  const opt = (arr, v, todos) => `<option value="">${todos}</option>` + arr.map(([k, t]) => `<option value="${esc(k)}" ${k === v ? 'selected' : ''}>${esc(t)}</option>`).join('');

  function tabAnuncios(A) {
    const qmin = Number(cfg().qualidade_min || 7), lim = Number(cfg().destaque_sem_contato_dias || 15), pct = Number(cfg().preco_pct || 0.1);
    const L = A.filter((a) => F.retirados || a.status !== 'REMOVIDO')
      .sort((a, b) => (a.status === 'REMOVIDO') - (b.status === 'REMOVIDO') || (b.destaque - a.destaque) || (b.visualizacoes || 0) - (a.visualizacoes || 0));
    const linhas = L.map((a) => {
      const st = SITU[a.situacao_site] || [a.situacao_site || '—', ''];
      const base = a.ultimo_lead || a.criado; const d = diasDesde(base);
      const parado = a.destaque && d != null && d >= lim;
      const c = a.contatos || {};
      const det = Object.entries(TIPO).filter(([k]) => c[k]).map(([k, t]) => `${t} ${c[k]}`).join(' · ');
      const dif = a.preco_dif_pct != null && Math.abs(a.preco_dif_pct) > pct;
      const foco = F.foco === a._id;
      return `<tr id="pt-an-${esc(a._id)}" style="${a.status === 'REMOVIDO' ? 'opacity:.55;' : ''}${foco ? 'outline:2px solid var(--accent);outline-offset:-2px;background:var(--soft)' : ''}"><td>${a.imovel_id && H.abrirImovel ? `<button class="btn" data-portais-imv="${esc(a.imovel_id)}" data-portais-txt="${esc((a.ref || '') + ' ' + (a.finalidade || '') + ' — anúncio no CanalPro')}" title="Abrir este imóvel na aba Imóveis"><b>${esc(a.ref || '—')}</b></button>` : `<b>${esc(a.ref || '—')}</b>`} ${esc(a.finalidade || '')}<span class="s">${esc(a.bairro || '')}${a.link_site ? ` · <a href="${escUrl(a.link_site)}" target="_blank" rel="noopener">site</a>` : ''}</span></td>
        <td>${a.status === 'REMOVIDO' ? `<span class="pill">retirado ${dt(a.removido_em)}</span>` : a.destaque ? `<span class="pill ${parado ? 'warn' : 'info'}">destaque</span>` : '<span class="pill">simples</span>'}</td>
        <td class="n">${brl0(a.preco)}${dif ? `<span class="s" style="color:var(--bad)">site ${brl0(a.preco_site)}</span>` : ''}</td>
        <td class="n"><span class="pill ${a.qualidade == null ? '' : a.qualidade < qmin ? 'warn' : 'ok'}">${a.qualidade == null ? '—' : String(a.qualidade).replace('.', ',')}</span></td>
        <td class="n">${num(a.visualizacoes)}</td>
        <td class="n"><b>${num(a.contatos_total)}</b>${det ? `<span class="s">${esc(det)}</span>` : ''}</td>
        <td class="n">${num(a.leads_total)}<span class="s">${a.ultimo_lead ? 'último ' + dt(a.ultimo_lead) : 'nenhum'}${a.destaque && d != null ? ` · ${d} d` : ''}</span></td>
        <td><span class="pill ${st[1]}">${esc(st[0])}${a.locado_cod ? ' ' + esc(a.locado_cod) : ''}</span></td>
        <td>${esc(a.corretor ? (H.op && H.op.nomeCorretor ? H.op.nomeCorretor(a.corretor) : a.corretor) : '—')}</td></tr>`;
    }).join('');
    const nRet = A.filter((a) => a.status === 'REMOVIDO').length;
    return `<div class="filtros">${nRet ? `<button class="btn" data-portais-ret="1" aria-pressed="${F.retirados}">Mostrar retirados do portal (${nRet})</button>` : ''}</div>
      <div class="tabela"><table><thead class="quebra"><tr><th>Imóvel</th><th>Tipo</th><th class="n">Preço<br>no portal</th><th class="n">Qualidade<br>(0 a 10)</th><th class="n">Visuali-<br>zações</th><th class="n">Contatos</th><th class="n">Leads</th><th>Situação<br>no site</th><th>Agenciador</th></tr></thead><tbody>${linhas || '<tr><td colspan="9">Nenhum anúncio.</td></tr>'}</tbody></table></div>`;
  }

  // repasse ao corretor: achado pela rotina nas planilhas de leads (nome + data)
  const repTxt = (r) => { r = r || {};
    if (r.status === 'repassado') return `<span class="pill ok">${esc((H.op && H.op.nomeCorretor ? H.op.nomeCorretor(r.corretor) : r.corretor))}</span><span class="s">${esc((r.planilha || '') + (r.aba ? ' / ' + r.aba : ''))}</span>`;
    if (r.status === 'lancado_sem_corretor') return `<span class="pill warn">lançado sem corretor</span><span class="s">${esc((r.planilha || '') + (r.aba ? ' / ' + r.aba : ''))}</span>`;
    return '<span class="pill">não lançado</span>'; };
  function filtraLeads() {
    const q = F.q.trim().toLowerCase();
    return H.lista('portais_leads').filter((l) => !l.interno
      && (!F.fin || l.interesse === F.fin) && (!F.mes || l.mes === F.mes)
      && (!F.imv || (l.imoveis || []).some((i) => (i.ref || i.imobibrasil_id) === F.imv))
      && (!q || [l.nome, l.corretor_imovel, ...(l.imoveis || []).map((i) => i.ref)].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => String(b.criado || '').localeCompare(String(a.criado || '')));
  }

  function tabLeads() {
    const L = filtraLeads(); const por = (H.buscaAba && H.buscaAba.ativa()) ? 1e9 : 100; const pags = Math.max(1, Math.ceil(L.length / por)); if (F.pg >= pags) F.pg = pags - 1;
    const noPortal = new Set(H.lista('portais_anuncios').filter((a) => a.status === 'ACTIVE').map((a) => a.imobibrasil_id));
    const linhas = L.slice(F.pg * por, F.pg * por + por).map((l) => `<tr><td>${dt(l.data)}<span class="s">${esc((l.criado || '').slice(11, 16))}</span></td>
      <td>${esc(l.nome || '—')}</td><td>${esc(l.interesse || '—')}</td>
      <td>${(l.imoveis || []).map((i) => `${esc(i.ref || i.imobibrasil_id)}${noPortal.has(i.imobibrasil_id) ? '' : ' <span class="s" style="display:inline">(fora do portal)</span>'}`).join(', ') || '—'}</td>
      <td>${(l.tipos || []).map((t) => esc(TIPO[t] || t)).join(', ') || '—'}</td>
      <td>${esc(l.corretor_imovel || '—')}</td>
      <td>${repTxt(l.repasse)}</td></tr>`).join('');
    const pag = pags > 1 ? `<div class="pag filtros" style="margin-top:8px"><button class="btn" data-portais-pg="${F.pg - 1}" ${F.pg ? '' : 'disabled'}>&lt;</button><span class="nota" style="margin:0 6px">${F.pg + 1} de ${pags}</span><button class="btn" data-portais-pg="${F.pg + 1}" ${F.pg < pags - 1 ? '' : 'disabled'}>&gt;</button></div>` : '';
    return `<p class="nota" style="margin:0 0 6px">${L.length} lead${L.length === 1 ? '' : 's'} no filtro.</p><div class="tabela"><table><thead class="quebra"><tr><th>Data</th><th>Lead</th><th>Interesse</th><th>Imóvel</th><th>Contato por</th><th>Agenciador<br>do imóvel</th><th>Repassado a</th></tr></thead><tbody>${linhas || '<tr><td colspan="7">Nenhum lead neste filtro.</td></tr>'}</tbody></table></div>${pag}`;
  }

  H.registrar({
    id: 'portais', aba: 'Portais', grupo: 'imoveis', depois: 'imoveis',
    colecoes: ['portais_anuncios', 'portais_leads', 'portais_plano', 'portais_config'],
    // selo na aba Imóveis: imóvel com anúncio ativo no CanalPro
    // leads do portal na aba Leads (gancho do núcleo): os que ainda não estão na planilha de leads lida pelo HUB.
    // Quando a linha da planilha já virou lead_contatos (repasse.lead_contato), vale a da planilha e este some — não conta duas vezes.
    leads() {
      const LC = H.S.leads_contatos || {};
      return H.lista('portais_leads').filter((l) => !l.interno && !(l.repasse && l.repasse.lead_contato && LC[l.repasse.lead_contato])).map((l) => ({
        _id: l._id, nome: l.nome, data: l.data, mes: l.mes, campanha: 'CanalPro (portais)', planilha: 'CanalPro', canal: 'Portais',
        corretor: (l.repasse && l.repasse.status === 'repassado' && l.repasse.corretor) || null, primeiro_corretor: null,
        origem: (l.tipos || []).map((t) => TIPO[t] || t).join(', ') || null, imovel: (l.imoveis || []).map((i) => i.ref || i.imobibrasil_id).join(', ') || null,
        status: null, progresso: null, tambem_em: [] }));
    },
    selos(id) {
      return H.lista('portais_anuncios').filter((a) => a.imovel_id === id && a.status !== 'REMOVIDO').map((a) => ({
        txt: 'no portal' + (a.destaque ? ' · destaque' : ''), cls: a.destaque ? 'warn' : 'info', alvo: a._id,
        titulo: `CanalPro: ${num(a.visualizacoes)} visualizações · ${num(a.contatos_total)} contatos · ${num(a.leads_total)} leads — abrir na aba Portais` }));
    },
    // chegada pelo selo: realça o anúncio e rola até ele
    foco(alvo) { F.foco = alvo || ''; const a = (H.S.portais_anuncios || {})[F.foco]; if (a && a.status === 'REMOVIDO') F.retirados = true;
      setTimeout(() => { const l = document.getElementById('pt-an-' + F.foco); if (l) l.scrollIntoView({ block: 'center' }); }, 80); },
    tipos: { portais_site: 'Portal × site', portais_preco: 'Preço portal × site', portais_destaque: 'Destaque sem lead', portais_qualidade: 'Qualidade do anúncio', portais_repasse: 'Lead do portal sem repasse' },
    render() {
      const R = (H.S.portais_plano || {}).canalpro;
      if (!R) return '<h2>Portais — CanalPro</h2>' + H.vazio(H.carregado.portais_plano ? 'Ainda sem coleta do CanalPro.' : 'Carregando…');
      const A = H.lista('portais_anuncios');
      const LV = H.lista('portais_leads').filter((l) => !l.interno);
      const alertas = H.lista('pendencias').filter((p) => p.origem === 'portais' && p.status === 'aberta');
      const cheia = R.anuncios_contratados && R.anuncios_usados >= R.anuncios_contratados;
      const expira = R.sessao_expira ? new Date(R.sessao_expira) : null;
      const meses = Object.keys(R.leads_por_mes || {}).sort();
      const imvs = [...new Set(LV.flatMap((l) => (l.imoveis || []).map((i) => i.ref || i.imobibrasil_id)))].sort();
      const contPor = Object.entries(R.leads_por_tipo || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${TIPO[k] || k} ${v}`).join(' · ');
      return `<h2>Portais — CanalPro</h2>
      <p class="nota">ZAP, Viva Real e OLX pelo CanalPro, coletado em ${dt(R.coletado_em)} às ${esc(String(R.coletado_em || '').slice(11, 16))} (só leitura; login sempre seu)${expira && !isNaN(expira) ? ` · o login no navegador do app vale até ${expira.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}. Os imóveis vão ao portal pelo Imobibrasil (seleção); o código do anúncio traz o id do Imobibrasil, por isso a ligação com a aba Imóveis é exata.</p>
      <div class="grade" style="margin-bottom:18px">
        ${kp('Anúncios no plano', `${esc(R.anuncios_usados ?? '—')} de ${esc(R.anuncios_contratados ?? '—')}`, `${esc(R.simples_usados)} simples · ${esc(R.destaques_usados)} de ${esc(R.destaques_contratados)} destaques${cheia ? ' · <b>cota cheia</b>' : ''}`, cheia ? 'warn' : '')}
        ${kp('Leads (30 dias)', esc(R.leads_30d), `${esc(R.leads_total)} desde ${mesTxt(meses[0])} · último ${dt(R.ultimo_lead)}`)}
        ${kp('Visualizações', num(R.visualizacoes), `${num(R.contatos)} contatos nos anúncios ativos`)}
        ${kp('Interesse', esc(Object.values(R.leads_por_finalidade || {}).join(' · ')), `${esc(Object.keys(R.leads_por_finalidade || {}).join(' · '))}<br>${esc(contPor)}`)}
      </div>
      ${alertas.length ? `<div class="card" style="margin-bottom:18px"><b>Alertas do portal</b>${alertas.map((p) => `<div style="margin-top:6px"><span class="pill ${p.prioridade === 'media' ? 'warn' : p.prioridade === 'alta' ? 'bad' : 'info'}">${esc(H.tipos[p.tipo] || p.tipo)}</span> ${esc(p.titulo)}<span class="s" style="display:block;color:var(--muted);font-size:12px">${esc(p.detalhe || '')}</span></div>`).join('')}<p class="nota" style="margin:8px 0 0">Também na aba Pendências, com "Ver na aba Imóveis" e "Dispensar".</p></div>` : ''}
      <h2 style="margin-top:8px">Anúncios no portal</h2>
      <p class="nota">Clique na ref. para abrir o imóvel na aba Imóveis (lá, o selo "no portal" traz de volta para cá). Destaque primeiro, depois por visualizações. Visualizações e contatos são os números que o CanalPro mostra em cada anúncio. "Leads" conta os leads do Gestor de Leads ligados ao anúncio; nos destaques, o número em dias é o tempo desde o último lead (alerta a partir de ${cfg().destaque_sem_contato_dias || 15} dias). Qualidade abaixo de ${String(cfg().qualidade_min || 7).replace('.', ',')} fica em âmbar.</p>
      ${tabAnuncios(A)}
      <h2 style="margin-top:24px">Leads do CanalPro</h2>
      <p class="nota">Nome, data, imóvel e forma de contato. Telefone, e-mail e mensagem ficam só no CanalPro. <b>Repassado a:</b> a coleta diária procura cada lead (nome + data) nas planilhas de "04 - Organização de Leads". Achou com corretor = repassado; aba nova onde o Nícollas lança entra sozinha nas fontes da aba Leads e do CRM. Enquanto não é lançado, o lead aparece na aba Leads sem corretor (campanha "CanalPro (portais)").${R.repasse ? ` Hoje: ${R.repasse.repassado || 0} repassados, ${R.repasse.lancado_sem_corretor || 0} lançados sem corretor, ${R.repasse.aguardando || 0} não lançados.` : ''}</p>
      <div class="filtros">${sel('fin', opt([['Locação', 'Locação'], ['Venda', 'Venda']], F.fin, 'Locação e venda'))}${sel('mes', opt(meses.slice().reverse().map((m) => [m, mesTxt(m) + ' (' + R.leads_por_mes[m] + ')']), F.mes, 'Todos os meses'))}${sel('imv', opt(imvs.map((i) => [i, i]), F.imv, 'Todos os imóveis'))}<input id="pt-q" type="search" placeholder="Buscar nome, imóvel ou agenciador…" value="${esc(F.q)}" style="flex:1 1 200px;min-width:0;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit"></div>
      <div id="pt-res">${tabLeads()}</div>`;
    }
  });

  document.addEventListener('click', (e) => {
    const im = e.target.closest('[data-portais-imv]'); if (im) { F.foco = ''; H.abrirImovel([im.dataset.portaisImv], im.dataset.portaisTxt); return; }
    const r = e.target.closest('[data-portais-ret]'); if (r) { F.retirados = !F.retirados; H.pede(); return; }
    const p = e.target.closest('[data-portais-pg]'); if (p && !p.disabled) { F.pg = Math.max(0, Number(p.dataset.portaisPg) || 0); const c = document.getElementById('pt-res'); if (c) c.innerHTML = tabLeads(); return; }
  });
  document.addEventListener('change', (e) => {
    const id = e.target && e.target.id; if (!/^pt-(fin|mes|imv)$/.test(id || '')) return;
    F[id.slice(3)] = e.target.value; F.pg = 0; const c = document.getElementById('pt-res'); if (c) c.innerHTML = tabLeads();
  });
  let t = null;
  document.addEventListener('input', (e) => {
    if (!e.target || e.target.id !== 'pt-q') return; F.q = e.target.value; F.pg = 0;
    clearTimeout(t); t = setTimeout(() => { const c = document.getElementById('pt-res'); if (c) c.innerHTML = tabLeads(); }, 200);
  });
})();
