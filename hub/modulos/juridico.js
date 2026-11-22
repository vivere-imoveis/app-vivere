// modulos/juridico.js — módulo Jurídico do HUB Vivere
// Esteira de contratos, inadimplência da carteira (só lista),
// processos (Estúdio de Petições, só leitura + cadastro manual) e afins (marca no INPI, multas do Deivis).
// 20/10/2026 (pedido do Cleiton): os pagamentos da Vivere ao Jurídico saíram daqui — estão na área Financeiro (modulos/financeiro.js, aba "Pagamentos ao Jurídico").
// Contrato: _hub\modulos\LEIA-ME.md. Lê as coleções do núcleo (cobrancas, contratos_locacao, documentos)
// e grava SÓ juridico_contratos e juridico_processos (botões da aba). Coleta diária: _hub\modulos\juridico\ROTINA.md.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl = H.brl, brl0 = H.brl0;
  const ETAPAS = [['pedido', 'Pedido'], ['minuta', 'Minuta'], ['revisao', 'Revisão / ajustes'], ['assinatura', 'Assinatura'], ['contabilizado', 'Contabilizado'], ['arquivado', 'Arquivado']];
  const ACOES = { contabilizar: 'lançar o fechamento na V. Claude', arquivar: 'mover a pasta de Contratos em Andamento para o arquivo da Vivere' };
  const nomeEt = (k) => (ETAPAS.find((e) => e[0] === k) || [k, k])[1];
  const PAPEL = { autora: ['Vivere autora', 'info'], re: ['Vivere ré', 'bad'], socio: ['sócio', 'warn'], carteira: ['carteira', ''], interessada: ['interessada', ''] };
  const UI = { novo: false, proc: false, erro: '', salvando: false, NP: { titulo: '', tipo: 'Venda', cod: '', obs: '' }, PR: { numero: '', papel: 're', autores: '', reus: '', assunto: '', orgao: '', proxima: '', prazo_final: '' } };
  const mesTxt = (s) => { if (!s) return '—'; const [y, m] = String(s).split('-'); const n = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+m - 1]; return n ? `${n}/${y.slice(2)}` : s; };
  const diasDesde = (d) => (d ? Math.round((Date.parse(H.hojeISO()) - Date.parse(String(d).slice(0, 10))) / 864e5) : null);
  const diasAte = (d) => (d ? Math.round((Date.parse(String(d).slice(0, 10)) - Date.parse(H.hojeISO())) / 864e5) : null);
  const VCLAUDE = 'https://docs.google.com/spreadsheets/d/1GuK28D6iiNPjWYesk8S7fyIWqpx3azygy0bl7Wo3BSk/edit?gid=763274245#gid=763274245';
  const btVClaude = (txt) => `<a class="btn" href="${VCLAUDE}" target="_blank" rel="noopener" title="Abre a planilha V. Claude (aba PAINEL) no Google Planilhas">${txt}</a>`;
  const pasta = (cam) => cam ? `<a class="btn pasta" href="abrirpasta:${encodeURIComponent(cam)}" target="_blank" rel="noopener" data-abrir-pasta="${esc(cam)}" title="Abre a pasta no Explorador e copia o caminho">Abrir pasta</a>` : '';
  const kp = (rot, n, sub, cls, alvo) => `<button class="card jur-kpi" data-jur-ir="${alvo}" title="Ir para a seção"><span class="rot">${rot}</span><span class="num${/^[0-9R$ .,]+$/.test(String(n)) ? '' : ' txt'}"${cls ? ` style="color:var(--${cls})"` : ''}>${n}</span><span class="s">${sub}</span></button>`;
  const campo = (c, k) => { for (const f of ['planilha', 'alude']) { if (c && c[f] && c[f][k] != null && c[f][k] !== '') return c[f][k]; } return null; };

  if (!document.getElementById('jur-css')) {
    const st = document.createElement('style'); st.id = 'jur-css';
    st.textContent = `
.jur-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 18px}
.jur-kpi{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:4px;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:12px 14px;min-width:0}
.jur-kpi:hover{border-color:var(--accent)} .jur-kpi:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.jur-kpi .rot{font-family:var(--display);text-transform:uppercase;letter-spacing:.14em;font-size:11px;color:var(--muted)}
.jur-kpi .num{font-family:var(--display);font-size:24px;line-height:1.15;overflow-wrap:anywhere}
.jur-kpi .s{font-size:12px;color:var(--muted)}
.jur-sec{margin-top:26px;scroll-margin-top:12px}
.jur-sec>h2{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.jur-sec>h2 .btn{text-transform:none;letter-spacing:0;font-family:var(--body)}
.jur-item .s,.jur-item div.s{display:block;color:var(--muted);font-size:12px;margin-top:2px}
.jur-kpi .num.txt{font-size:16px;line-height:1.3}
.jur-trilha{display:flex;gap:3px;margin:6px 0 4px;flex-wrap:wrap}
.jur-trilha span{font-size:11px;padding:2px 7px;border-radius:999px;background:var(--soft);color:var(--muted);white-space:nowrap}
.jur-trilha span.feito{background:var(--ok-bg);color:var(--ok)}
.jur-trilha span.atual{background:var(--accent);color:var(--bg)}
.jur-item{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:12px 14px;min-width:0}
.jur-item+.jur-item{margin-top:8px}
.jur-item .tit{font-weight:600;overflow-wrap:anywhere}
.jur-item .acoes{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}
.jur-sug{background:var(--warn-bg);color:var(--warn);border-radius:6px;padding:6px 10px;font-size:12px;margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.jur-form{display:grid;gap:4px;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:12px 14px;margin-bottom:10px}
.jur-form label{font-size:12px;color:var(--muted);margin-top:6px}
.jur-form input,.jur-form select,.jur-form textarea{font:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:7px 9px;width:100%;box-sizing:border-box;min-width:0}
.jur-afins{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(270px,1fr))}
.jur-afins dl{display:grid;grid-template-columns:minmax(90px,38%) 1fr;gap:3px 10px;margin:6px 0 0;font-size:13px}
.jur-afins dt{color:var(--muted);font-size:12px} .jur-afins dd{margin:0;overflow-wrap:anywhere}`;
    document.head.appendChild(st);
  }

  // ------------------------------------------------------------ dados
  const contratosEst = () => H.lista('juridico_contratos').sort((a, b) => ETAPAS.findIndex((e) => e[0] === a.etapa) - ETAPAS.findIndex((e) => e[0] === b.etapa) || String(a.etapa_desde || '').localeCompare(String(b.etapa_desde || '')));
  const atrasos = () => H.lista('cobrancas').filter((b) => b.situacao === 'atrasada').sort((a, b) => (b.dias_atraso || 0) - (a.dias_atraso || 0) || String(a.cod).localeCompare(String(b.cod)));
  const processos = () => H.lista('juridico_processos').sort((a, b) => String(a.prazo_final || '9').localeCompare(String(b.prazo_final || '9')));
  const afim = (id) => (H.S.juridico_afins || {})[id];

  // ------------------------------------------------------------ seções
  function secResumo() {
    const C = contratosEst().filter((x) => x.etapa !== 'arquivado'); const A = atrasos(); const totA = A.reduce((t, b) => t + (Number(b.valor) || 0), 0);
    const P = processos().filter((p) => !p.arquivado); const inpi = afim('inpi'); const mu = afim('multas');
    const prox = mu && (mu.proximos || [])[0];
    const porEt = ETAPAS.filter(([k]) => C.some((x) => x.etapa === k)).map(([k, t]) => `${t.split(' ')[0].toLowerCase()} ${C.filter((x) => x.etapa === k).length}`).join(' · ');
    return `<div class="jur-kpis">
      ${kp('Contratos na esteira', C.length, porEt || 'nenhum em andamento', '', 'contratos')}
      ${kp('Aluguéis em atraso', A.length, A.length ? `${brl0(totA)} · ${[...new Set(A.map((b) => b.cod))].join(', ')}` : 'nenhum', A.length ? 'bad' : '', 'inadimplencia')}
      ${kp('Processos', P.length, P.length ? `${P.filter((p) => p.papel_vivere === 're').length} com a Vivere ré` : 'nenhum por enquanto', '', 'processos')}
      ${kp('Marca no INPI', inpi ? esc(inpi.situacao || '—') : '—', inpi ? 'verificado ' + esc(String(inpi.ultima_verificacao || '').slice(0, 10)) : 'aguardando coleta', '', 'afins')}
      ${kp('Multas do Deivis', mu ? esc(mu.em_julgamento) + ' em julgamento' : '—', mu ? (prox ? `próximo prazo ${dt(prox.data)} · ${esc(prox.ait)}` : 'nenhum prazo a vencer') : 'aguardando coleta', prox && diasAte(prox.data) <= 7 ? 'bad' : '', 'afins')}
    </div>`;
  }

  function trilha(et) { const i = ETAPAS.findIndex((e) => e[0] === et); return `<div class="jur-trilha" aria-label="Etapa: ${esc(nomeEt(et))}">${ETAPAS.map(([k, t], j) => `<span class="${j < i ? 'feito' : j === i ? 'atual' : ''}">${t}</span>`).join('')}</div>`; }
  function secContratos() {
    // 18/10/2026 (Cleiton): arquivado sai da esteira de vez — vai para o arquivo de vendas ou de locação; sem botão "Mostrar arquivados"
    const L = contratosEst().filter((x) => x.etapa !== 'arquivado');
    const form = UI.novo ? `<div class="jur-form">
      <label for="jur-np-titulo">Contrato (partes e imóvel)</label><input id="jur-np-titulo" maxlength="140" value="${esc(UI.NP.titulo)}" placeholder="Ex.: PCV — Fulano × Beltrano — Apto 203 do Quay">
      <label for="jur-np-tipo">Tipo</label><select id="jur-np-tipo">${['Venda', 'Cessão de direitos', 'Aditivo', 'Locação', 'Administração', 'Temporada', 'Outro'].map((t) => `<option ${UI.NP.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label for="jur-np-cod">Código do imóvel (A1…), se for locação</label><input id="jur-np-cod" maxlength="10" value="${esc(UI.NP.cod)}">
      <label for="jur-np-obs">Observações</label><textarea id="jur-np-obs" rows="2">${esc(UI.NP.obs)}</textarea>
      ${UI.erro ? `<p style="color:var(--bad);margin:6px 0 0">${esc(UI.erro)}</p>` : ''}
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn" data-jur-salvar-pedido="1"${UI.salvando ? ' disabled' : ''}>${UI.salvando ? 'Registrando…' : 'Registrar pedido'}</button><button class="btn" data-jur-cancela="novo">Cancelar</button></div></div>` : '';
    const itens = L.map((x) => {
      const i = ETAPAS.findIndex((e) => e[0] === x.etapa); const doc = x.doc && H.S.documentos ? H.S.documentos[x.doc] : null; const d = diasDesde(x.etapa_desde);
      const sug = x.sugestao && x.sugestao.etapa !== x.etapa ? `<div class="jur-sug"><span>Sugestão da rotina: <b>${esc(nomeEt(x.sugestao.etapa))}</b> — ${esc(x.sugestao.motivo || '')}</span><button class="btn" data-jur-etapa="${esc(x._id)}" data-para="${esc(x.sugestao.etapa)}">Aceitar</button></div>` : '';
      return `<div class="jur-item"><div class="tit">${x.cod && !String(x.titulo || '').startsWith(x.cod) ? `<span class="cod">${esc(x.cod)}</span> ` : ''}${esc(x.titulo || '—')}</div>
        <span class="s">${esc(x.tipo || '')} · ${esc(nomeEt(x.etapa))} desde ${dt(x.etapa_desde)}${d != null ? ` (${d} dia${d === 1 ? '' : 's'})` : ''}${x.origem === 'pasta' ? ' · veio da pasta' : ''}${x.assinado_na_pasta ? ' · <b>assinado na pasta</b>' : ''}</span>
        ${trilha(x.etapa)}${x.acao_pendente ? `<div class="jur-sug"><span><b>A executar com o Claude:</b> ${esc(ACOES[x.acao_pendente.tipo] || x.acao_pendente.tipo)} (pedido em ${dt(x.acao_pendente.pedido_em)})</span></div>` : ''}${x.obs ? `<div class="s">${esc(x.obs)}</div>` : ''}${doc && (doc.faltando || []).length ? `<div class="s">Falta na pasta: ${esc(doc.faltando.join(', '))}</div>` : ''}${sug}
        <div class="acoes">${i > 0 ? `<button class="btn" data-jur-etapa="${esc(x._id)}" data-para="${ETAPAS[i - 1][0]}" title="Voltar para ${esc(ETAPAS[i - 1][1])}">← ${esc(ETAPAS[i - 1][1])}</button>` : ''}${i < ETAPAS.length - 1 ? `<button class="btn" data-jur-etapa="${esc(x._id)}" data-para="${ETAPAS[i + 1][0]}">${esc(ETAPAS[i + 1][1])} →</button>` : ''}${doc ? pasta(doc.caminho) : x.caminho ? pasta(x.caminho) : ''}</div></div>`;
    }).join('');
    return `<section class="jur-sec" id="jur-contratos"><h2>Esteira de contratos <button class="btn" data-jur-novo="1" style="margin-left:auto">+ Novo pedido</button></h2>
      <p class="nota">Pedido → minuta → revisão/ajustes → assinatura → contabilizado (lançado na V. Claude) → arquivado. Pasta nova da Vivere em "Contratos em Andamento" entra sozinha como pedido; a rotina diária sugere a etapa (assinatura na pasta, lançamento na planilha), mas quem muda é você. Avançar para "Contabilizado" ou "Arquivado" cria uma tarefa: lançar na V. Claude ou mover a pasta — o Claude executa na próxima sessão com você (mover pasta pede a sua permissão) e a rotina dá baixa quando confere que foi feito. Contrato parado há mais de 15 dias na mesma etapa vira pendência.</p>
      ${UI.desfaz ? `<div class="jur-sug" role="status"><span><b>${esc(UI.desfaz.titulo)}</b> foi para ${esc(nomeEt(UI.desfaz.para))}.</span><button class="btn" data-jur-desfaz="1">Desfazer</button></div>` : ''}${UI.erroEtapa ? `<p style="color:var(--bad);margin:6px 0">${esc(UI.erroEtapa)}</p>` : ''}
      ${form}${L.length ? itens : H.vazio(H.carregado.juridico_contratos ? 'Nenhum contrato na esteira.' : 'Carregando…')}</section>`;
  }

  function secInadimplencia() {
    const A = atrasos(); const susp = (b) => b.sem_boleto && H.lista('cobrancas').some((x) => x.cod === b.cod && x.competencia < b.competencia && x.situacao === 'atrasada' && !x.sem_boleto);
    const linhas = A.map((b) => { const c = (H.S.contratos_locacao || {})[b.cod] || {};
      // 20/10/2026: nomes viram link para Cadastros › Pessoas e o código abre o cadastro do imóvel (quando os módulos estão carregados)
      const pes = (txt, papel) => { const P = window.HUB_PESSOAS; try { const h = P && P.html ? P.html(String(txt || ''), { fonte: 'contrato', cod: b.cod, papel }) : ''; return h || esc(txt || '—'); } catch (e) { return esc(txt || '—'); } };
      const M = window.HUB_IMOVEIS; let uid = ''; try { uid = M && M.id ? M.id({ fonte: 'contrato', cod: b.cod }) : ''; } catch (e) { uid = ''; }
      const cod = uid ? `<button class="lk imv cod" data-imovel-u="${esc(uid)}" title="Abrir o cadastro do imóvel">${esc(b.cod)}</button>` : `<span class="cod">${esc(b.cod)}</span>`;
      return `<tr><td>${cod}<span class="s">${esc(mesTxt(b.competencia))}</span></td><td>${pes(campo(c, 'locatario'), 'locatario')}<span class="s">locador: ${pes(campo(c, 'locador'), 'locador')}</span></td><td>${dt(b.vencimento)}<span class="s">${susp(b) ? 'boleto não emitido (mês anterior em atraso)' : ''}</span></td><td class="n"><b style="color:var(--${(b.dias_atraso || 0) >= 10 ? 'bad' : 'warn'})">${b.dias_atraso || 0} d</b></td><td class="n">${brl(b.valor)}<span class="s">multa + juros est. ${brl((b.multa_est || 0) + (b.juros_est || 0))}</span></td><td>${esc((campo(c, 'garantia') || {}).tipo || campo(c, 'garantia_txt') || '—')}</td><td><button class="btn" data-aba="cobranca" data-cod="${esc(b.cod)}">Ver na Cobrança</button></td></tr>`; }).join('');
    return `<section class="jur-sec" id="jur-inadimplencia"><h2>Inadimplência da carteira</h2>
      <p class="nota">Só a lista dos aluguéis em atraso (Alude), do maior atraso para o menor, com a garantia do contrato. A providência — notificação, acordo, execução ou despejo — é decidida caso a caso.</p>
      ${A.length ? `<div class="tabela"><table><thead class="quebra"><tr><th>Imóvel /<br>competência</th><th>Locatário</th><th>Vencimento</th><th class="n">Atraso</th><th class="n">Valor</th><th>Garantia</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>` : H.vazio(H.carregado.cobrancas ? 'Nenhum aluguel em atraso.' : 'Carregando…')}</section>`;
  }

  function secProcessos() {
    const P = processos(); const partes = ((H.S.juridico_config || {}).partes || {}).partes || [];
    const f = UI.PR;
    const form = UI.proc ? `<div class="jur-form">
      <label for="jur-pr-numero">Número do processo</label><input id="jur-pr-numero" maxlength="30" value="${esc(f.numero)}" placeholder="0000000-00.0000.0.00.0000">
      <label for="jur-pr-papel">Papel da Vivere</label><select id="jur-pr-papel">${Object.entries(PAPEL).map(([k, v]) => `<option value="${k}" ${f.papel === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
      <label for="jur-pr-autores">Autor(es)</label><input id="jur-pr-autores" maxlength="200" value="${esc(f.autores)}" placeholder="separe por vírgula">
      <label for="jur-pr-reus">Réu(s)</label><input id="jur-pr-reus" maxlength="200" value="${esc(f.reus)}" placeholder="separe por vírgula">
      <label for="jur-pr-assunto">Assunto</label><input id="jur-pr-assunto" maxlength="120" value="${esc(f.assunto)}">
      <label for="jur-pr-orgao">Juízo / comarca</label><input id="jur-pr-orgao" maxlength="120" value="${esc(f.orgao)}">
      <label for="jur-pr-proxima">Próxima providência</label><input id="jur-pr-proxima" maxlength="200" value="${esc(f.proxima)}">
      <label for="jur-pr-prazo_final">Prazo (se houver)</label><input id="jur-pr-prazo_final" type="date" value="${esc(f.prazo_final)}">
      ${UI.erro ? `<p style="color:var(--bad);margin:6px 0 0">${esc(UI.erro)}</p>` : ''}
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn" data-jur-salvar-proc="1"${UI.salvando ? ' disabled' : ''}>${UI.salvando ? 'Registrando…' : 'Registrar processo'}</button><button class="btn" data-jur-cancela="proc">Cancelar</button></div></div>` : '';
    const linhas = P.map((p) => { const pp = PAPEL[p.papel_vivere] || [p.papel_vivere || '—', '']; const d = diasAte(p.prazo_final);
      return `<tr><td><span class="cod">${esc(p.numero || p._id)}</span><span class="s">${esc(p.origem === 'manual' ? 'cadastro manual' : 'Estúdio de Petições')}${p.arquivado ? ' · arquivado' : ''}</span></td><td><span class="pill ${pp[1]}">${esc(pp[0])}</span>${p.motivo ? `<span class="s">${esc(p.motivo)}</span>` : ''}</td><td>${esc((p.autores || []).join(', ') || '—')}<span class="s">× ${esc((p.reus || []).join(', ') || '—')}</span></td><td>${esc(p.assunto || p.classe || '—')}<span class="s">${esc(p.orgao || '')}</span></td><td>${esc(p.proxima || '—')}${p.prazo_final ? `<span class="s">prazo ${dt(p.prazo_final)}${d != null ? ` · ${d < 0 ? 'vencido' : d + ' dias'}` : ''}</span>` : ''}</td><td>${p.ultimo_evento ? `${dt(p.ultimo_evento.data)}<span class="s">${esc(p.ultimo_evento.descricao || '')}</span>` : '—'}</td></tr>`; }).join('');
    return `<section class="jur-sec" id="jur-processos"><h2>Processos <button class="btn" data-jur-proc="1" style="margin-left:auto">+ Processo</button></h2>
      <p class="nota">Processos em que aparece a Vivere, uma das empresas do Institucional, um sócio (Deivis, Nícollas, Luciano) ou um locador ou locatário da carteira. A rotina lê o HUB do escritório (Estúdio de Petições, só leitura) todo dia; "+ Processo" registra um processo que não passa por lá, como uma ação contra a Vivere com outro advogado. Hoje são ${partes.length} nomes monitorados.</p>
      ${form}${P.length ? `<div class="tabela"><table><thead class="quebra"><tr><th>Processo</th><th>Vivere</th><th>Partes</th><th>Assunto /<br>juízo</th><th>Próxima<br>providência</th><th>Último<br>evento</th></tr></thead><tbody>${linhas}</tbody></table></div>` : H.vazio(H.carregado.juridico_processos ? 'Nenhum processo por enquanto. A estrutura está pronta: quando surgir um processo com parte monitorada, ele aparece aqui.' : 'Carregando…')}
      ${partes.length ? `<details style="margin-top:8px"><summary class="s" style="cursor:pointer">Ver os ${partes.length} nomes monitorados</summary><p class="s" style="margin:6px 0 0">${partes.map((x) => `${esc(x.nome)} <span style="opacity:.7">(${esc(x.tipo)}${x.ref && /locador|locatario/.test(x.tipo) ? ' ' + esc(x.ref) : ''})</span>`).join(' · ')}</p></details>` : ''}</section>`;
  }

  function secAfins() {
    const i = afim('inpi'), m = afim('multas');
    const cI = i ? `<div class="card"><h2 style="margin:0">Marca no INPI</h2><dl>
        <dt>Marca</dt><dd>${esc(i.titulo || '')}</dd><dt>Processo</dt><dd>${esc(i.processo || '—')}</dd><dt>Titular</dt><dd>${esc(i.titular || '—')}</dd>
        <dt>Situação</dt><dd><b>${esc(i.situacao || '—')}</b></dd><dt>Última publicação</dt><dd>RPI ${esc(i.ultima_rpi || '—')}</dd>
        <dt>Última verificação</dt><dd>${esc(i.ultima_verificacao || '—')}${i.alteracao ? ` · alteração: ${esc(i.alteracao)}` : ''}</dd>${i.base_ate ? `<dt>Base do INPI até</dt><dd>${esc(i.base_ate)}</dd>` : ''}</dl>
        <p class="s" style="margin:8px 0 0">${esc(i.observacao || '')}</p>
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${i.link ? `<a class="btn" href="${escUrl(i.link)}" target="_blank" rel="noopener">Abrir no INPI</a>` : ''}</div>
        <p class="nota" style="margin:8px 0 0">A tarefa agendada consulta o INPI e grava o log; o HUB lê o log todo dia.</p></div>` : `<div class="card"><h2 style="margin:0">Marca no INPI</h2>${H.vazio('Aguardando a primeira leitura do log.')}</div>`;
    const cM = m ? `<div class="card"><h2 style="margin:0">Multas do Deivis</h2><dl>
        <dt>Casos</dt><dd>${esc(m.casos)} (${esc(m.no_prontuario)} no prontuário dele)</dd><dt>Em julgamento</dt><dd>${esc(m.em_julgamento)}</dd>
        <dt>Aguardando penalidade</dt><dd>${esc(m.aguardando_penalidade)}</dd><dt>Pós-venda</dt><dd>${esc(m.pos_venda)}</dd>
        <dt>Próximos prazos</dt><dd>${(m.proximos || []).length ? m.proximos.slice(0, 4).map((x) => `${dt(x.data)} · ${esc(x.ait)} (${esc(x.etapa)})`).join('<br>') : 'nenhum a vencer'}</dd>
        <dt>Monitor dos órgãos</dt><dd>${m.monitor_ultima ? new Date(m.monitor_ultima).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}${m.login_govbr === 'login_necessario' ? ' · <b style="color:var(--bad)">gov.br pede login</b>' : ''}</dd></dl>
        <div style="margin-top:8px"><a class="btn" href="${escUrl(m.link)}" target="_blank" rel="noopener">Abrir Multas e infrações (HUB de petições)</a></div>
        <p class="nota" style="margin:8px 0 0">Resumo lido do módulo Multas e infrações do HUB PETIÇÕES/PROCESSOS (só leitura). Defesas, prazos e agenda ficam lá.</p></div>` : `<div class="card"><h2 style="margin:0">Multas do Deivis</h2>${H.vazio('Aguardando a primeira leitura.')}</div>`;
    return `<section class="jur-sec" id="jur-afins"><h2>Afins</h2><div class="jur-afins">${cI}${cM}</div></section>`;
  }

  H.registrar({
    id: 'juridico', aba: 'Jurídico', grupo: 'gestao', depois: 'tarefas',
    colecoes: ['juridico_contratos', 'juridico_processos', 'juridico_afins', 'juridico_config'],
    tipos: { juridico_inpi: 'Jurídico — marca no INPI', juridico_multa: 'Jurídico — prazo de multa', juridico_parado: 'Jurídico — contrato parado', juridico_contabilizar: 'Jurídico — contrato a contabilizar', juridico_executar: 'Jurídico — a executar com o Claude' },
    render() {
      return `<h2>Jurídico</h2><p class="nota">Contratos, inadimplência da carteira, processos e afins num lugar só. Os pagamentos da Vivere ao Jurídico estão em Financeiro › Pagamentos ao Jurídico. Atualiza com a rotina diária (dias úteis, 10h30).</p>
        <div class="filtros">${[['contratos', 'Contratos'], ['inadimplencia', 'Inadimplência'], ['processos', 'Processos'], ['afins', 'Afins']].map(([k, t]) => `<button class="btn" data-jur-ir="${k}">${t}</button>`).join('')}${btVClaude('Planilha V. Claude ↗')}</div>
        ${secResumo()}${secContratos()}${secInadimplencia()}${secProcessos()}${secAfins()}`;
    }
  });

  // ------------------------------------------------------------ ações (gravam só juridico_contratos e juridico_processos)
  const slug = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const falha = (e) => { UI.erro = 'Não consegui gravar (' + ((e && e.code) || 'erro') + '). Tente de novo.'; };
  // 15/11/2026 (hub #10): avançar para Contabilizado ou Arquivado pede confirmação e oferece "Desfazer" por 20 s; falha aparece na tela
  async function mudaEtapa(id, para, semConfirmar) {
    const db = H.db(); const x = (H.S.juridico_contratos || {})[id]; if (!db || !x || !ETAPAS.some((e) => e[0] === para)) return;
    const fwd = ETAPAS.findIndex((e) => e[0] === para) > ETAPAS.findIndex((e) => e[0] === x.etapa);
    if (!semConfirmar && fwd && (para === 'contabilizado' || para === 'arquivado') && typeof confirm === 'function'
      && !confirm(`Passar "${x.titulo || id}" para ${nomeEt(para)}?${para === 'arquivado' ? ' Ele sai da esteira e a próxima sessão move a pasta para o arquivo.' : ' A próxima sessão lança o contrato na V. Claude.'}`)) return;
    const antes = { etapa: x.etapa, etapa_desde: x.etapa_desde || null, historico: x.historico || [], sugestao: x.sugestao || null, acao_pendente: x.acao_pendente || null };
    const hist = (x.historico || []).concat([{ etapa: para, em: H.hojeISO(), por: 'Cleiton (aba Jurídico)' }]);
    const avancou = ETAPAS.findIndex((e) => e[0] === para) > ETAPAS.findIndex((e) => e[0] === x.etapa);
    const tipo = avancou && para === 'contabilizado' ? 'contabilizar' : avancou && para === 'arquivado' ? 'arquivar' : null;
    const upd = { etapa: para, etapa_desde: H.hojeISO(), historico: hist, sugestao: null, acao_pendente: tipo ? { tipo, pedido_em: H.hojeISO(), por: 'Cleiton (aba Jurídico)' } : null };
    UI.erroEtapa = '';
    try { await db.doc('juridico_contratos/' + id).update(upd); } catch (e) { UI.erroEtapa = 'Não consegui mudar a etapa (' + ((e && e.code) || 'erro') + '). Tente de novo.'; H.pede(); return; }
    if (fwd && (para === 'contabilizado' || para === 'arquivado')) { clearTimeout(UI.desfazT); UI.desfaz = { id, para, titulo: x.titulo || id, antes };
      UI.desfazT = setTimeout(() => { UI.desfaz = null; H.pede(); }, 20000); H.pede(); }
  }
  async function desfazEtapa() {
    const u = UI.desfaz; const db = H.db(); if (!u || !db) return; clearTimeout(UI.desfazT); UI.desfaz = null;
    const x = (H.S.juridico_contratos || {})[u.id] || {};
    if (x.etapa !== u.para) { H.pede(); return; } // já mudou de novo: não desfaz por cima
    const hist = (x.historico || []).concat([{ etapa: u.antes.etapa, em: H.hojeISO(), por: 'Cleiton (aba Jurídico) · desfez ' + nomeEt(u.para) }]);
    try { await db.doc('juridico_contratos/' + u.id).update({ etapa: u.antes.etapa, etapa_desde: u.antes.etapa_desde, historico: hist, sugestao: u.antes.sugestao, acao_pendente: u.antes.acao_pendente }); }
    catch (e) { UI.erroEtapa = 'Não consegui desfazer (' + ((e && e.code) || 'erro') + '). Volte a etapa pela seta ←.'; }
    H.pede();
  }
  async function salvaPedido() {
    const db = H.db(); if (!db || UI.salvando) return; const t = UI.NP.titulo.trim();
    if (!t) { UI.erro = 'Escreva o contrato (partes e imóvel).'; H.pede(); return; }
    let id = 'c-' + slug(t).slice(0, 60), k = 2; while ((H.S.juridico_contratos || {})[id]) id = 'c-' + slug(t).slice(0, 56) + '-' + (k++);
    UI.salvando = true; UI.erro = ''; H.pede();
    try {
      await db.doc('juridico_contratos/' + id).set({ titulo: t, tipo: UI.NP.tipo, cod: UI.NP.cod.trim().toUpperCase() || null, obs: UI.NP.obs.trim() || null, etapa: 'pedido', etapa_desde: H.hojeISO(), origem: 'botao', criado_em: H.hojeISO(), historico: [{ etapa: 'pedido', em: H.hojeISO(), por: 'Cleiton (aba Jurídico)' }] });
      UI.NP = { titulo: '', tipo: 'Venda', cod: '', obs: '' }; UI.novo = false;
    } catch (e) { falha(e); }
    UI.salvando = false; H.pede();
  }
  async function salvaProcesso() {
    const db = H.db(); if (!db || UI.salvando) return; const f = UI.PR; const num = f.numero.trim(); const id = num.replace(/\D/g, '');
    if (id.length < 15) { UI.erro = 'Informe o número completo do processo.'; H.pede(); return; }
    if ((H.S.juridico_processos || {})[id]) { UI.erro = 'Esse processo já está na lista.'; H.pede(); return; }
    const lista = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
    UI.salvando = true; UI.erro = ''; H.pede();
    try {
      await db.doc('juridico_processos/' + id).set({ numero: num, origem: 'manual', papel_vivere: f.papel, autores: lista(f.autores), reus: lista(f.reus), assunto: f.assunto.trim() || null, orgao: f.orgao.trim() || null, proxima: f.proxima.trim() || null, prazo_final: f.prazo_final || null, arquivado: false, atualizado: H.hojeISO() });
      UI.PR = { numero: '', papel: 're', autores: '', reus: '', assunto: '', orgao: '', proxima: '', prazo_final: '' }; UI.proc = false;
    } catch (e) { falha(e); }
    UI.salvando = false; H.pede();
  }
  document.addEventListener('click', (ev) => {
    const ir = ev.target.closest('[data-jur-ir]'); if (ir) { const el = document.getElementById('jur-' + ir.dataset.jurIr); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    const et = ev.target.closest('[data-jur-etapa]'); if (et) { mudaEtapa(et.dataset.jurEtapa, et.dataset.para); return; }
    if (ev.target.closest('[data-jur-desfaz]')) { desfazEtapa(); return; }
    if (ev.target.closest('[data-jur-novo]')) { UI.novo = true; UI.proc = false; UI.erro = ''; H.pede(); setTimeout(() => { const t = document.getElementById('jur-np-titulo'); if (t) t.focus(); }, 40); return; }
    if (ev.target.closest('[data-jur-proc]')) { UI.proc = true; UI.novo = false; UI.erro = ''; H.pede(); setTimeout(() => { const t = document.getElementById('jur-pr-numero'); if (t) t.focus(); }, 40); return; }
    const ca = ev.target.closest('[data-jur-cancela]'); if (ca) { UI[ca.dataset.jurCancela] = false; UI.erro = ''; H.pede(); return; }
    if (ev.target.closest('[data-jur-salvar-pedido]')) { salvaPedido(); return; }
    if (ev.target.closest('[data-jur-salvar-proc]')) { salvaProcesso(); return; }
  });
  document.addEventListener('input', (ev) => {
    const id = ev.target.id || '';
    if (id.startsWith('jur-np-')) UI.NP[id.slice(7)] = ev.target.value;
    else if (id.startsWith('jur-pr-')) UI.PR[id.slice(7)] = ev.target.value;
  });
})();
