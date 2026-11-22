// modulos/vistorias.js — aba "Vistorias" da Locação no HUB Vivere (construção "vistorias", 20/10/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Pedido do Cleiton (20/10/2026): aba de vistorias integrada à Rede Vistorias (Grupo RV),
// com agendamento, acompanhamento e laudo ligados ao imóvel e ao contrato. Piloto: entrada do A10 (Royal Classic, 27/10/2026).
// • Lê: vistorias_agenda (do módulo), contratos_locacao e imoveis (núcleo, só leitura).
// • Grava: só vistorias_agenda (botões de status), com o banco do HUB. Pendências: quem abre e fecha é a rotina do módulo
//   (_hub\modulos\vistorias\ROTINA.md), com origem 'vistorias'; a aba mostra os mesmos alertas calculados ao vivo.
// • Sem CPF/CNPJ, telefone, e-mail ou conta bancária.
// • F2b (17/11/2026, tarefa vistoria-celular-corretor): também as vistorias simples feitas pelo app dos corretores
//   (origem 'app', gravadas pelo robô das fichas com o PDF no Drive): selo 📱, tipos novos, quem fez, Ver PDF e filtro próprio.
// • F3 (17/11/2026): vistoria do app com dano abre sozinha o chamado ch-vist-<doc_id> (gatilho do banco, só locação); a linha
//   leva ao chamado. Lê também chamados (só leitura).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt;
  const ID = 'vistorias', CL = 'vistorias_agenda';
  const F = { st: 'ativas', foco: '' }; // st: ativas · fechadas · app · todas
  const hoje = () => H.hojeISO();
  const dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  const somaDias = (iso, n) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);

  const TIPO = { entrada: 'Entrada', saida: 'Saída', periodica: 'Periódica', venda: 'Venda / posse', conferencia: 'Conferência',
    dano: 'Constatação de dano', visita: 'Visita', chaves: 'Conferência de chaves' };
  const ST = {
    a_agendar: ['A agendar', 'warn'], solicitada: ['Solicitada à RV', 'info'], agendada: ['Agendada', 'info'],
    realizada: ['Realizada · laudo a chegar', 'warn'], laudo_recebido: ['Laudo recebido', 'warn'],
    laudo_arquivado: ['Laudo arquivado', 'ok'], cancelada: ['Cancelada', ''],
    relatorio_no_drive: ['Relatório no Drive', 'ok'],
  };
  const FECHADAS = ['laudo_arquivado', 'cancelada', 'relatorio_no_drive'];
  const doApp = (v) => v.origem === 'app';
  const idDrive = (s) => /^[A-Za-z0-9_-]{10,}$/.test(String(s || '')) ? String(s) : '';
  const urlPdf = (v) => { const id = idDrive(v.relatorio && v.relatorio.drive_id); return id ? 'https://drive.google.com/file/d/' + id + '/view' : ''; };
  const urlPastaDrive = (v) => { const id = idDrive(v.relatorio && v.relatorio.pasta_id); return id ? 'https://drive.google.com/drive/folders/' + id : ''; };
  const endDe = (v) => v.endereco || (v.imovel && v.imovel.endereco) || '';
  const chamadoDe = (v) => { const d = v.app && v.app.doc_id; if (!d) return null; const id = ('ch-vist-' + String(d).replace(/[^A-Za-z0-9_-]+/g, '-')).slice(0, 200); return (H.S.chamados || {})[id] ? id : null; };
  const pill = (s) => { const x = ST[s] || [s || '—', '']; return `<span class="pill ${x[1]}">${esc(x[0])}</span>`; };

  const vist = () => H.lista(CL).sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || String(a._id).localeCompare(String(b._id)));
  const ctrs = () => H.lista('contratos_locacao');
  const campo = (c, k) => { const pl = c.planilha || {}, al = c.alude || {}; return pl[k] ?? al[k] ?? c[k] ?? null; };
  const ativo = (c) => (typeof H.contratoAtivo === 'function' ? H.contratoAtivo(c) : true);
  const temVist = (cod, tipo) => vist().some((v) => v.cod === cod && v.tipo === tipo && v.status !== 'cancelada');

  // ------------------------------------------------------------ alertas (os quatro aprovados pelo Cleiton em 20/10/2026)
  function alertas() {
    const h = hoje(), A = [];
    for (const c of ctrs()) {
      const ini = campo(c, 'inicio'), fim = campo(c, 'termino');
      if (ini && ini >= h && dias(h, ini) <= 15 && !temVist(c._id, 'entrada'))
        A.push({ tipo: 'vistorias_entrada_sem', cod: c._id, prio: dias(h, ini) <= 5 ? 'alta' : 'media', tit: `${c._id}: entrada em ${dt(ini)} sem vistoria agendada`, det: campo(c, 'endereco') || '' });
      if (ativo(c) && fim && fim >= h && dias(h, fim) <= 30 && !temVist(c._id, 'saida'))
        A.push({ tipo: 'vistorias_saida_sem', cod: c._id, prio: dias(h, fim) <= 10 ? 'alta' : 'media', tit: `${c._id}: contrato termina em ${dt(fim)} sem vistoria de saída`, det: 'Até existir o registro de devolução de chaves no HUB, o alerta usa a data de término do contrato.' });
    }
    for (const v of vist()) {
      if (FECHADAS.includes(v.status)) continue;
      if (!doApp(v) && v.data && v.data < h && dias(v.data, h) > 3 && !v.laudo_caminho)
        A.push({ tipo: 'vistorias_laudo_pendente', cod: v.cod, prio: 'media', tit: `${v.cod}: laudo da vistoria de ${dt(v.data)} não arquivado`, det: `${TIPO[v.tipo] || v.tipo} · ${v.protocolo || 'sem protocolo'}`, alvo: v._id });
      if (v.tipo === 'saida' && (v.divergencias || []).length && !v.divergencias_resolvidas)
        A.push({ tipo: 'vistorias_divergencia', cod: v.cod, prio: 'alta', tit: `${v.cod}: divergências entrada × saída (${v.divergencias.length})`, det: 'Avaliar cobrança de reparos (skill cobranca-locaticia-inicial).', alvo: v._id });
    }
    return A;
  }
  const TIPOS_PEND = {
    vistorias_entrada_sem: 'Vistoria — entrada sem agendamento', vistorias_saida_sem: 'Vistoria — saída sem agendamento',
    vistorias_laudo_pendente: 'Vistoria — laudo pendente', vistorias_divergencia: 'Vistoria — divergência entrada × saída',
  };

  // ------------------------------------------------------------ desenho
  const linkRef = (v) => v.cod ? linkCod(v.cod) : v.ref ? `${esc(v.ref)}<span class="s">catálogo</span>` : '—';
  const linkCod = (cod) => cod ? `<button class="btn" data-vist-carteira="${esc(cod)}" title="Ver o contrato ${esc(cod)} na Carteira">${esc(cod)}</button>` : '—';
  const nomePessoa = (v) => {
    if (doApp(v)) return v.por && v.por.nome ? `${esc(v.por.nome)}<span class="s">fez pelo app</span>` : '—';
    if (!v.acompanha) return '—';
    const P = window.HUB_PESSOAS;
    if (v.acompanha_id && P && typeof P.pessoa === 'function' && P.pessoa(v.acompanha_id)) return `<button class="lk pes" data-pessoa="${esc(v.acompanha_id)}">${esc(v.acompanha)}</button>`;
    return esc(v.acompanha);
  };
  const quando = (v) => {
    if (!v.data) return '<span class="s">sem data</span>';
    const d = dias(hoje(), v.data);
    const rel = d === 0 ? 'hoje' : d === 1 ? 'amanhã' : d > 1 ? `em ${d} dias` : `há ${-d} dias`;
    return `${dt(v.data)}${v.hora ? ' · ' + esc(v.hora) : ''}<span class="s">${rel}</span>`;
  };
  const avisoTxt = (v) => {
    if (!['entrada', 'saida'].includes(v.tipo)) return '';
    if (v.aviso_locatarios_enviado) return '<span class="s" style="color:var(--ok)">aviso aos locatários enviado</span>';
    const ate = v.aviso_locatarios_ate; const atras = ate && ate < hoje();
    return `<span class="s" style="color:var(--${atras ? 'bad' : 'warn'})">aviso cl. 8.5 ${ate ? 'até ' + dt(ate) : 'pendente'}</span>`;
  };
  const acoes = (v) => {
    if (!H.db() || FECHADAS.includes(v.status)) return '';
    const b = [];
    if (['entrada', 'saida'].includes(v.tipo) && !v.aviso_locatarios_enviado) b.push(`<button class="btn" data-vist-acao="aviso" data-vist-id="${esc(v._id)}">Aviso enviado</button>`);
    if (['a_agendar', 'solicitada'].includes(v.status)) b.push(`<button class="btn" data-vist-acao="agendada" data-vist-id="${esc(v._id)}">RV aceitou</button>`);
    if (['solicitada', 'agendada'].includes(v.status)) b.push(`<button class="btn" data-vist-acao="realizada" data-vist-id="${esc(v._id)}">Realizada</button>`);
    if (['realizada', 'laudo_recebido'].includes(v.status) && v.laudo_caminho) b.push(`<button class="btn" data-vist-acao="laudo_arquivado" data-vist-id="${esc(v._id)}">Laudo arquivado</button>`);
    return `<div class="filtros" style="margin:6px 0 0">${b.join('')}</div>`;
  };
  function linhaApp(v) {
    const r = v.resumo || {}, pdf = urlPdf(v), pd = urlPastaDrive(v);
    const end = endDe(v), bairro = (v.imovel && v.imovel.bairro) || '';
    const endH = end ? (window.HUB_IMOVEIS && typeof window.HUB_IMOVEIS.html === 'function' ? window.HUB_IMOVEIS.html(end, { fonte: 'contrato', cod: v.cod }) : esc(end)) : '';
    const resumo = r.comodos != null ? `${r.comodos} cômodo(s) · ${r.fotos || 0} foto(s)${r.ruim ? ` · ${r.ruim} ruim` : ''}${r.regular ? ` · ${r.regular} regular` : ''}` : '';
    const pasta = v.pasta ? `<a class="btn pasta" href="abrirpasta:${encodeURIComponent(v.pasta)}" target="_blank" rel="noopener" data-abrir-pasta="${esc(v.pasta)}" title="Abre a pasta no Explorador e copia o caminho">Abrir pasta</a>` : '';
    return `<tr id="vist-${esc(v._id)}"${F.foco === v._id ? ' class="foco"' : ''}>
      <td class="cod">${linkRef(v)}</td>
      <td>${esc(TIPO[v.tipo] || v.tipo || '—')} <span class="pill info" title="Feita pelo corretor no app">📱 app</span></td>
      <td style="min-width:200px">${endH}<span class="s">${esc(bairro)}${v.obs ? (bairro ? ' · ' : '') + esc(v.obs) : ''}</span></td>
      <td>${quando(v)}</td>
      <td>${nomePessoa(v)}</td>
      <td>${pill(v.status)}${v.dano ? ' <span class="pill bad">dano</span>' : ''}${resumo ? `<span class="s">${esc(resumo)}</span>` : ''}${chamadoDe(v) ? `<div class="filtros" style="margin:6px 0 0"><button class="btn" data-vist-chamado="${esc(chamadoDe(v))}" title="Abrir o chamado aberto por esta vistoria">🔧 Chamado</button></div>` : ''}</td>
      <td>App dos corretores<span class="s">vistoria simples</span></td>
      <td>${pdf ? `<a class="btn" href="${escUrl(pdf)}" target="_blank" rel="noopener" title="Abrir o relatório PDF no Drive">Ver PDF</a>` : '—'}${pd ? ` <a class="lk" style="display:inline-block;margin:4px 6px 4px 0" href="${escUrl(pd)}" target="_blank" rel="noopener" title="Abrir a pasta no Drive">pasta no Drive</a>` : ''}${pasta}</td>
      <td class="n">—</td></tr>`;
  }
  function linha(v) {
    if (doApp(v)) return linhaApp(v);
    const pasta = v.pasta ? `<a class="btn pasta" href="abrirpasta:${encodeURIComponent(v.pasta)}" target="_blank" rel="noopener" data-abrir-pasta="${esc(v.pasta)}" title="Abre a pasta no Explorador e copia o caminho">Abrir pasta</a>` : '';
    const rv = v.link ? `<a class="lk imob" href="${escUrl(v.link)}" target="_blank" rel="noopener" title="Abrir o pedido no painel da Rede Vistorias">${esc(v.protocolo || 'pedido RV')}</a>` : esc(v.protocolo || '—');
    const custo = v.creditos != null ? `${Number(v.creditos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} créditos<span class="s">${v.pago_por === 'vivere' ? 'Vivere paga' : esc(v.pago_por || '')} · ${v.custo_lancado ? 'lançado no Financeiro' : 'a lançar no Financeiro'}</span>` : '—';
    const end = v.endereco ? (window.HUB_IMOVEIS && typeof window.HUB_IMOVEIS.html === 'function' ? window.HUB_IMOVEIS.html(v.endereco, { fonte: 'contrato', cod: v.cod }) : esc(v.endereco)) : '';
    return `<tr id="vist-${esc(v._id)}"${F.foco === v._id ? ' class="foco"' : ''}>
      <td class="cod">${linkCod(v.cod)}</td>
      <td>${esc(TIPO[v.tipo] || v.tipo || '—')}<span class="s">${esc(v.modalidade || '')}</span></td>
      <td style="min-width:200px">${end}${H.mapa ? H.mapa('texto', null, v.endereco || '', {}) : ''}<span class="s">${esc(v.obs || '')}</span></td>
      <td>${quando(v)}</td>
      <td>${nomePessoa(v)}</td>
      <td>${pill(v.status)}${v.status_rv ? `<span class="s">RV: ${esc(v.status_rv)}</span>` : ''}${avisoTxt(v)}${acoes(v)}</td>
      <td>${rv}<span class="s">${esc(v.fornecedor || '')}</span></td>
      <td>${v.laudo_caminho ? `<span class="pill ok">no PC</span>` : v.laudo_previsto ? `<span class="s">previsto ${dt(v.laudo_previsto)}</span>` : '—'}${pasta}</td>
      <td class="n">${custo}</td></tr>`;
  }
  function render() {
    const T = vist();
    const A = alertas();
    const L = T.filter((v) => F.st === 'todas' ? true : F.st === 'app' ? doApp(v) : F.st === 'fechadas' ? FECHADAS.includes(v.status) : !FECHADAS.includes(v.status));
    if (F.st === 'app') L.reverse(); // 📱 Pelo app: as mais recentes primeiro
    const prox = T.filter((v) => !doApp(v) && !FECHADAS.includes(v.status) && v.data && v.data >= hoje());
    const semLaudo = T.filter((v) => !doApp(v) && !FECHADAS.includes(v.status) && v.data && v.data < hoje() && !v.laudo_caminho);
    const cards = `<div class="grade" style="margin-bottom:14px">
      <div class="card"><h2>Próximas</h2><div style="font-family:var(--display);font-size:26px">${prox.length}</div><p class="nota" style="margin:0">${prox[0] ? `próxima: ${esc(prox[0].cod)} em ${dt(prox[0].data)}${prox[0].hora ? ' às ' + esc(prox[0].hora) : ''}` : 'nenhuma marcada'}</p></div>
      <div class="card"><h2>Laudos a arquivar</h2><div style="font-family:var(--display);font-size:26px">${semLaudo.length}</div><p class="nota" style="margin:0">a RV entrega em 48 h (pedido até 12h) ou 72 h</p></div>
      <div class="card${A.length ? '" style="border-color:var(--bad)' : ''}"><h2>Alertas</h2><div style="font-family:var(--display);font-size:26px${A.length ? ';color:var(--bad)' : ''}">${A.length}</div><p class="nota" style="margin:0">${A.length ? 'detalhe abaixo' : 'nenhum'}</p></div></div>`;
    const al = A.length ? `<div style="margin-bottom:14px">${A.map((x) => `<div class="pend ${x.prio}"><div class="faixa"></div><div class="corpo"><div class="tit">${esc(x.tit)}</div><div class="det">${esc(x.det || '')}</div><div class="meta"><span class="pill">${esc(TIPOS_PEND[x.tipo])}</span></div></div><div class="acoes">${x.cod ? linkCod(x.cod) : ''}</div></div>`).join('')}</div>` : '';
    const fil = `<div class="filtros">${[['ativas', 'Em andamento'], ['fechadas', 'Concluídas'], ['app', `📱 Pelo app (${T.filter(doApp).length})`], ['todas', 'Todas']].map(([k, t]) => `<button class="btn" data-vist-st="${k}" aria-pressed="${F.st === k}">${t}</button>`).join('')}<a class="btn" href="https://painel.redevistorias.com.br/orders" target="_blank" rel="noopener">Abrir a Rede Vistorias</a></div>`;
    const tab = L.length ? `<div class="tabela"><table><thead><tr><th>Locação</th><th>Tipo</th><th>Imóvel</th><th>Quando</th><th>Acompanha</th><th>Situação</th><th>Pedido</th><th>Laudo</th><th class="n">Custo</th></tr></thead><tbody>${L.map(linha).join('')}</tbody></table></div>`
      : H.vazio(H.carregado[CL] ? 'Nenhuma vistoria neste filtro.' : 'Carregando…');
    return `<h2>Vistorias</h2><p class="nota">Vistorias da carteira feitas pela Rede Vistorias (Grupo RV): entrada, saída, periódica e venda/entrega de posse. O pedido é feito no painel da RV pela skill hub-vivere-vistorias (login do Cleiton, envio só com o OK dele), entra na agenda em cor tomate e o laudo vai para a pasta Vistoria do caso. O custo é da Vivere e vai ao Financeiro. As marcadas 📱 são as vistorias simples feitas pelo corretor no app (periódica, dano, visita e chaves): chegam já concluídas, com o relatório PDF no Drive (locação: Vistoria › Vistorias pelo app; catálogo: 04 Materiais).</p>${cards}${al}${fil}${tab}`;
  }

  async function acao(id, qual, botao) {
    const db = H.db(); if (!db) return;
    const v = (H.S[CL] || {})[id]; if (!v) return;
    const em = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
    const txt = { aviso: 'Aviso aos locatários marcado como enviado', agendada: 'RV aceitou o pedido', realizada: 'Vistoria marcada como realizada', laudo_arquivado: 'Laudo marcado como arquivado' }[qual];
    const upd = qual === 'aviso' ? { aviso_locatarios_enviado: true } : { status: qual };
    upd.historico = [...(v.historico || []), { em, o_que: txt + ' (no HUB)' }].slice(-30);
    if (botao) botao.textContent = 'Gravando…';
    try { await db.doc(CL + '/' + id).update(upd); }
    catch (e) { if (botao) botao.textContent = 'Não gravou — tente de novo'; }
  }

  H.registrar({
    id: ID, aba: 'Vistorias', grupo: 'locacao', depois: 'cobranca', colecoes: [CL, 'contratos_locacao', 'chamados'],
    tipos: TIPOS_PEND,
    render,
    foco(alvo) { if (alvo) { F.foco = alvo; F.st = 'todas'; setTimeout(() => { const l = document.getElementById('vist-' + alvo); if (l) l.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 80); } },
    selos(idImovel) {
      const ref = String(idImovel || '').split('_')[0]; if (!ref) return [];
      return vist().filter((v) => v.imovel_ref === ref && !FECHADAS.includes(v.status))
        .map((v) => ({ txt: `vistoria ${v.data ? dt(v.data).slice(0, 5) : 'a agendar'}`, cls: v.status === 'a_agendar' ? 'warn' : 'info', alvo: v._id, titulo: `${TIPO[v.tipo] || v.tipo} — ${(ST[v.status] || [v.status])[0]}` }));
    },
    busca(q) {
      const t = String(q || '').toLowerCase(); if (t.length < 2) return [];
      return vist().filter((v) => [v.cod, v.ref, v.protocolo, endDe(v), v.acompanha, v.por && v.por.nome, doApp(v) ? 'app celular' : '', TIPO[v.tipo], 'vistoria'].filter(Boolean).join(' ').toLowerCase().includes(t))
        .slice(0, 8).map((v) => ({ grp: 'Vistorias', tit: `${v.cod || v.ref || 'Imóvel'} — vistoria de ${(TIPO[v.tipo] || v.tipo || '').toLowerCase()} ${v.data ? dt(v.data) : ''}`, sub: [doApp(v) ? '📱 app' + (v.por && v.por.nome ? ' · ' + v.por.nome : '') : v.protocolo, (ST[v.status] || [v.status])[0]].filter(Boolean).join(' · '), ir: { aba: ID, alvo: v._id } }));
    },
  });
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-vist-st]'); if (s) { F.st = s.dataset.vistSt; F.foco = ''; H.pede(); return; }
    const c = e.target.closest('[data-vist-carteira]'); if (c) { H.irPara('carteira', 'car-' + c.dataset.vistCarteira); return; }
    const ch = e.target.closest('[data-vist-chamado]'); if (ch) { H.irPara('chamados', ch.dataset.vistChamado); return; }
    const a = e.target.closest('[data-vist-acao]'); if (a) { acao(a.dataset.vistId, a.dataset.vistAcao, a); }
  });
})();
