// modulos/fichas-locacao.js — aba "Fichas" da Locação no HUB Vivere (construção "fichas-locacao", 20/10/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Pedido do Cleiton (20/10/2026): registrar na ficha de cada locação o seguro incêndio
// (apólice, vigência, como é cobrado), os encargos lançados no Alude e o que mais o Alude tem e o HUB ainda não mostrava.
// • Lê: fichas-locacao_dados (bloco `alude` da coleta diária do módulo + bloco `seguro`, manual, das pastas),
//   contratos_locacao e cobrancas (núcleo, só leitura). Não grava nada (a aba é só consulta).
// • Sem CPF/CNPJ, telefone, e-mail ou conta bancária.
// • 14/11/2026 (vivere-ficha-carteira-contratos, F1): lê também fichas_locacao_contratos (nível mestre) — a ficha do contrato
//   lida do PDF no Drive, cada campo {v, cl, trecho} com a cláusula de origem; null = não encontrado. Cartão "Contrato" na
//   ficha, coluna "Contrato" na lista e "Alertas da carteira" (fim da vigência a 90/30 dias, reajuste a 30 dias, garantia e
//   seguro vencendo), calculados na tela. Expõe window.HUB.carteiraContratos { alertas, proxReajuste, ficha } para reuso.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl = H.brl;
  const ID = 'fichas-locacao', CL = 'fichas-locacao_dados', CL2 = 'fichas_locacao_contratos';
  const F = { cod: null };
  const hoje = () => H.hojeISO();
  const dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  const ord = (a, b) => (a[0] + String(a.slice(1)).padStart(4, '0')).localeCompare(b[0] + String(b.slice(1)).padStart(4, '0'));
  const mes = (s) => { if (!s) return '—'; const [y, m] = String(s).split('-'); return `${m}/${y}`; };
  const sn = (v) => (v === true ? 'Sim' : v === false ? 'Não' : '—');
  const ctr = (cod) => (H.S.contratos_locacao || {})[cod] || {};
  const campo = (c, k) => { const pl = c.planilha || {}, al = c.alude || {}; return pl[k] ?? al[k] ?? null; };
  const cts = () => H.S[CL2] || {};
  const ct = (cod) => cts()[cod] || null;
  const cv = (cod, k) => { const x = (((ct(cod) || {}).campos) || {})[k]; return x && x.v != null && x.v !== '' ? x : null; };
  const vv = (cod, k) => (cv(cod, k) || {}).v ?? null;
  // 14/11/2026 (Cleiton): valor atual (dados.atual, ex.: notificação) em destaque, o do contrato embaixo; e "os que encerraram o
  // prazo inicial do contrato seguem por prazo indeterminado" — fim passado sem prazo_indeterminado vira indeterminado desde o dia seguinte.
  const atual = (cod) => { const a = (ct(cod) || {}).atual; return a && typeof a === 'object' ? a : null; };
  const diaSeg = (iso) => new Date(Date.parse(iso + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10);
  const indetDesde = (cod) => { const fim = vv(cod, 'fim'); return vv(cod, 'prazo_indeterminado') !== true && isoOk(fim) && fim < hoje() ? diaSeg(fim) : null; };
  const fichas = () => { const a = H.S[CL] || {}, b = cts();
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].map((id) => Object.assign({ _id: id }, a[id] || {})).sort((x, y) => ord(x._id, y._id)); };
  const temFicha = (cod) => !!((H.S[CL] || {})[cod] || ct(cod));
  // próximo reajuste: aniversário do início (ou o mês fixado no contrato), a partir do 1º aniversário e do mês corrente
  const isoOk = (s) => { s = String(s || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(s + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; };
  function proxReajuste(cod) {
    const p1 = isoOk(vv(cod, 'primeiro_reajuste')) ? vv(cod, 'primeiro_reajuste') : null;
    if (p1) { // 1º reajuste fixado ou deslocado pelo contrato (isenção, aditivo): ele e os aniversários dele
      const h = hoje(); if (p1.slice(0, 7) >= h.slice(0, 7)) return p1;
      const mes = +p1.slice(5, 7), dia = +p1.slice(8, 10);
      for (let y = +h.slice(0, 4); y <= +h.slice(0, 4) + 1; y++) { const ult = new Date(Date.UTC(y, mes, 0)).getUTCDate();
        const d = `${y}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, ult)).padStart(2, '0')}`; if (d.slice(0, 7) >= h.slice(0, 7)) return d; }
      return null;
    }
    const ini = isoOk(vv(cod, 'inicio')) ? vv(cod, 'inicio') : null; let mr = Math.round(+vv(cod, 'mes_reajuste') || 0);
    if (!(mr >= 1 && mr <= 12)) mr = 0; if (!ini && !mr) return null;
    const h = hoje(), ani = ini ? `${+ini.slice(0, 4) + 1}${ini.slice(4)}` : '', y0 = Math.max(+h.slice(0, 4), ini ? +ini.slice(0, 4) + 1 : 0);
    const mes = mr || +ini.slice(5, 7), dia = ini ? +ini.slice(8, 10) : 1;
    for (let y = y0; y <= y0 + 2; y++) {
      const ult = new Date(Date.UTC(y, mes, 0)).getUTCDate();
      const d = `${y}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, ult)).padStart(2, '0')}`;
      if (d.slice(0, 7) >= h.slice(0, 7) && (!ani || d.slice(0, 7) >= ani.slice(0, 7))) return d;
    }
    return null;
  }
  const corDias = (d, a, b) => (d <= a ? 'bad' : d <= b ? 'warn' : '');
  const emDias = (d) => (d < 0 ? `há ${-d} dias` : d === 0 ? 'hoje' : `em ${d} dias`);
  const ativo = (cod) => { const c = ctr(cod); return typeof H.contratoAtivo === 'function' ? H.contratoAtivo(Object.assign({ _id: cod }, c)) : true; };

  const SIT = {
    sigafy: ['Sigafy · no boleto', 'ok'], proprio_locatario: ['Próprio do locatário', 'info'], proprio_locador: ['Próprio do locador', 'info'],
    a_contratar: ['A contratar', 'bad'], sem_seguro: ['Sem seguro', ''],
  };
  const pillSit = (s) => { const x = SIT[(s || {}).situacao] || [(s || {}).situacao || 'Sem registro', 'warn']; return `<span class="pill ${x[1]}">${esc(x[0])}</span>`; };
  const venceTxt = (fim) => {
    if (!fim) return '<span class="s">—</span>';
    const d = dias(hoje(), fim); const cls = d < 0 ? 'bad' : d <= 30 ? 'bad' : d <= 60 ? 'warn' : '';
    return `${dt(fim)}<span class="s"${cls ? ` style="color:var(--${cls})"` : ''}>${d < 0 ? `venceu há ${-d} dias` : `em ${d} dias`}</span>`;
  };
  const venceCurto = (fim) => { const d = dias(hoje(), fim); const cor = d <= 30 ? 'bad' : d <= 60 ? 'warn' : 'ok';
    return `<span style="color:var(--${cor})">${d < 0 ? `venceu há ${-d} dias` : `em ${d} dias`}</span>`; };
  const encSeguro = (al) => (al.encargos_cobranca || []).find((e) => e.categoria === 'Seguro incêndio' || /seguro/i.test(e.nome || ''));

  // ------------------------------------------------------------ alertas da carteira (contrato + seguro), calculados na tela
  function alertas() {
    const h = hoje(), A = [];
    fichas().filter((f) => ativo(f._id)).forEach((f) => {
      const cod = f._id, fim = vv(cod, 'fim'), pr = proxReajuste(cod), gv = vv(cod, 'garantia_vencimento'), sf = (f.seguro || {}).vigencia_fim || (f.alude || {}).seguro_incendio_venc;
      if (isoOk(fim) && vv(cod, 'prazo_indeterminado') !== true) { const d = dias(h, fim); if (d <= 90 && d >= 0) A.push({ cod, tipo: 'fim', data: fim, dias: d, nivel: corDias(d, 30, 90) || 'warn', txt: `contrato termina ${emDias(d)} (${dt(fim)})` }); }
      if (pr) { const d = dias(h, pr); if (d <= 30) A.push({ cod, tipo: 'reajuste', data: pr, dias: d, nivel: 'warn', txt: `reajuste ${emDias(d)} (${dt(pr)}${vv(cod, 'indice') ? ' · ' + vv(cod, 'indice') : ''})` }); }
      if (isoOk(gv)) { const d = dias(h, gv); if (d <= 60) A.push({ cod, tipo: 'garantia', data: gv, dias: d, nivel: corDias(d, 30, 60) || 'warn', txt: `garantia (${vv(cod, 'garantia') || '—'}) vence ${emDias(d)} (${dt(gv)})` }); }
      if (isoOk(sf)) { const d = dias(h, sf); if (d <= 30) A.push({ cod, tipo: 'seguro', data: sf, dias: d, nivel: 'bad', txt: `seguro incêndio vence ${emDias(d)} (${dt(sf)})` }); }
    });
    return A.sort((a, b) => a.dias - b.dias || ord(a.cod, b.cod));
  }
  function blocoAlertas() {
    const A = alertas(), lidos = Object.keys(cts()).length;
    const itens = A.map((a) => `<li><button class="btn" data-fichas-ver="${esc(a.cod)}" title="Abrir a ficha da locação ${esc(a.cod)}">${esc(a.cod)}</button> <span style="color:var(--${a.nivel})">${esc(a.txt)}</span></li>`).join('');
    return `<div class="card" style="margin-bottom:14px"><h2>Alertas da carteira</h2>${A.length ? `<ul style="margin:8px 0 0;padding-left:18px;display:grid;gap:6px">${itens}</ul>` : `<p class="nota" style="margin:6px 0 0">Nenhum fim de contrato em 90 dias, reajuste em 30 dias, garantia em 60 dias ou seguro em 30 dias.</p>`}
      <p class="nota" style="margin:8px 0 0">${lidos ? `Contratos lidos: ${lidos}.` : 'Nenhum contrato lido ainda.'} Calculado agora, sem rotina: fim da vigência a 90 e 30 dias, próximo reajuste pelo aniversário do contrato (ou o mês fixado), garantia e seguro vencendo.</p></div>`;
  }
  const celContrato = (cod) => {
    if (!ct(cod)) return '<span class="s">contrato não lido</span>';
    const fim = vv(cod, 'fim'), pr = proxReajuste(cod), gv = vv(cod, 'garantia_vencimento'), h = hoje();
    const dF = isoOk(fim) ? dias(h, fim) : null, cF = dF == null ? '' : corDias(dF, 30, 90), a = atual(cod), ds = indetDesde(cod);
    const alu = a && Number(a.aluguel) > 0 ? `<span class="s"><b style="color:var(--ink)">aluguel atual ${brl(a.aluguel)}</b>${vv(cod, 'aluguel') != null ? ` · contrato ${brl(vv(cod, 'aluguel'))}` : ''}</span>` : '';
    if (vv(cod, 'prazo_indeterminado') === true || ds) return `prazo indeterminado${ds ? `<span class="s">segue por prazo indeterminado desde ${dt(ds)}</span>` : isoOk(fim) ? `<span class="s">prazo original até ${dt(fim)}</span>` : ''}`
      + (pr ? `<span class="s">reajuste ${dt(pr)}${vv(cod, 'indice') ? ' · ' + esc(vv(cod, 'indice')) : ''}</span>` : '')
      + (isoOk(gv) ? `<span class="s">garantia vence ${dt(gv)}</span>` : '') + alu;
    return `${isoOk(fim) ? `até ${dt(fim)}<span class="s"${cF ? ` style="color:var(--${cF})"` : ''}>${dF < 0 ? `venceu há ${-dF} dias` : `termina em ${dF} dias`}</span>` : '<span class="s">fim não encontrado</span>'}`
      + (pr ? `<span class="s">reajuste ${dt(pr)}${vv(cod, 'indice') ? ' · ' + esc(vv(cod, 'indice')) : ''}</span>` : '')
      + (isoOk(gv) ? `<span class="s">garantia vence ${dt(gv)}</span>` : '') + alu;
  };

  // ------------------------------------------------------------ visão geral (seguro da carteira)
  function geral() {
    const L = fichas().filter((f) => ativo(f._id));
    const linhas = L.map((f) => { const s = f.seguro || {}, al = f.alude || {}, e = encSeguro(al);
      return `<tr><td class="cod"><button class="btn" data-fichas-ver="${esc(f._id)}" title="Abrir a ficha da locação ${esc(f._id)}">${esc(f._id)}</button></td>
        <td>${celContrato(f._id)}</td>
        <td>${pillSit(s)}${s.seguradora ? `<span class="s">${esc(s.seguradora)}${s.apolice ? ' · apólice ' + esc(s.apolice) : ''}</span>` : ''}</td>
        <td>${venceTxt(s.vigencia_fim || al.seguro_incendio_venc)}</td>
        <td class="n">${s.valor_parcela ? brl(s.valor_parcela) + `<span class="s">${esc(s.parcelas || '')}× · Tokio</span>` : '—'}</td>
        <td class="n">${e ? brl(e.valor_parcela) + `<span class="s">${e.pagas}/${e.parcelas} pagas</span>` : (Object.keys(al).length ? '—' : '<span class="s">fora do Alude</span>')}</td>
        <td><span class="s">${esc(s.obs || '')}</span></td></tr>`; }).join('');
    return blocoAlertas() + `<div class="tabela"><table><thead><tr><th>Locação</th><th>Contrato</th><th>Seguro incêndio</th><th>Vigência até</th><th class="n">Parcela da seguradora</th><th class="n">Parcela no boleto</th><th>Observação</th></tr></thead>
      <tbody>${linhas || '<tr><td colspan="7">Nenhuma ficha.</td></tr>'}</tbody></table></div>`;
  }

  // ------------------------------------------------------------ ficha de uma locação
  const linha = (rot, val) => `<div class="vlin" style="white-space:normal;align-items:baseline"><span style="flex:none">${esc(rot)}</span><span class="vr" style="text-align:right;overflow-wrap:anywhere;min-width:0">${val}</span></div>`;
  function tabEnc(L, vazio) {
    if (!L || !L.length) return `<p class="nota" style="margin:6px 0 0">${vazio}</p>`;
    return `<div class="tabela"><table><thead><tr><th>Encargo</th><th>Destino</th><th>Parcelas</th><th class="n">Parcela</th><th class="n">Total</th></tr></thead><tbody>${L.map((e) => `<tr>
      <td>${esc(e.nome)}<span class="s">${esc([e.categoria, e.descricao && e.descricao !== e.nome ? e.descricao : ''].filter(Boolean).join(' · '))}</span></td>
      <td>${esc(e.destino || '—')}</td>
      <td>${e.fixo ? 'Todo mês' : `${e.pagas}/${e.parcelas} pagas<span class="s">${mes(e.de)} a ${mes(e.ate)}${e.proxima ? ` · próxima ${mes(e.proxima.ref)}` : ' · quitado'}</span>`}</td>
      <td class="n">${brl(e.fixo ? e.valor_total : e.valor_parcela)}</td><td class="n">${e.fixo ? '—' : brl(e.valor_total)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  const ROT = [['locador', 'Locador'], ['locatario', 'Locatário'], ['fiador', 'Fiador'], ['imovel', 'Imóvel'], ['finalidade', 'Finalidade'],
    ['inicio', 'Início', 'd'], ['fim', 'Fim', 'd'], ['prazo_indeterminado', 'Prazo indeterminado', 'sn'], ['prazo_meses', 'Prazo', 'm'], ['aluguel', 'Aluguel', 'r'], ['vencimento_dia', 'Vencimento', 'dia'],
    ['indice', 'Índice de reajuste'], ['periodicidade_reajuste', 'Periodicidade'], ['mes_reajuste', 'Mês de reajuste', 'mes'], ['primeiro_reajuste', '1º reajuste', 'd'],
    ['garantia', 'Garantia'], ['garantia_valor', 'Valor da garantia', 'r'], ['garantia_vencimento', 'Garantia vence', 'd'],
    ['seguro_incendio', 'Seguro incêndio'], ['multa_rescisoria', 'Multa rescisória'], ['multa_atraso', 'Multa por atraso'],
    ['taxa_adm', 'Taxa de administração'], ['taxa_intermediacao', 'Taxa de intermediação'], ['foro', 'Foro'], ['benfeitorias', 'Benfeitorias'], ['preferencia', 'Preferência']];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function fmtCampo(v, t) {
    if (t === 'd') return isoOk(v) ? dt(v) : esc(v);
    if (t === 'r') return typeof v === 'number' ? brl(v) : esc(v);
    if (t === 'm') return typeof v === 'number' ? `${v} meses` : esc(v);
    if (t === 'dia') return typeof v === 'number' ? `dia ${v}` : esc(v);
    if (t === 'mes') return MESES[(+v || 0) - 1] || esc(v);
    if (t === 'sn') return v === true ? 'Sim' : v === false ? 'Não' : esc(v);
    return esc(v);
  }
  const sub = (t) => `<span class="s" style="display:block;color:var(--muted);font-size:11px">${t}</span>`;
  const nEnc = '<span style="color:var(--muted)">não encontrado</span>';
  function cardContrato(cod) {
    const c = ct(cod);
    if (!c) return `<div class="card" style="margin-bottom:14px"><h2>Contrato</h2><p class="nota" style="margin:6px 0 0">Contrato desta locação ainda não lido do Drive.</p></div>`;
    const ca = c.campos || {}, pr = proxReajuste(cod), a = atual(cod), ds = indetDesde(cod);
    const linhas = ROT.map(([k, rot, t]) => { const x = ca[k] || {}; const tem = x.v != null && x.v !== '';
      if (!tem && ['fiador', 'garantia_valor', 'taxa_intermediacao', 'prazo_indeterminado', 'primeiro_reajuste'].includes(k) && !(k === 'prazo_indeterminado' && ds)) return '';
      if (k === 'prazo_indeterminado' && ds) return linha(rot, `Sim${sub(`prazo inicial encerrado em ${dt(vv(cod, 'fim'))}: segue por prazo indeterminado desde ${dt(ds)}`)}`);
      const cont = tem ? `${fmtCampo(x.v, t)}${x.cl ? sub(esc(x.cl)) : ''}${x.nota ? sub(esc(x.nota)) : ''}` : nEnc;
      const va = a && (k === 'aluguel' || k === 'vencimento_dia') && Number(a[k]) > 0 ? Number(a[k]) : null;
      if (va != null) return linha(rot + ' atual', `<b>${fmtCampo(va, t)}</b>${sub(esc(a.fonte || 'valor atual'))}${sub(`contrato: ${tem ? fmtCampo(x.v, t) + (x.cl ? ' · ' + esc(x.cl) : '') : 'não encontrado'}`)}`);
      return linha(rot, cont); }).join('');
    const extra = pr ? linha('Próximo reajuste', `${dt(pr)}${sub(isoOk(vv(cod, 'primeiro_reajuste')) ? 'calculado pelo 1º reajuste do contrato' : `calculado pelo início${vv(cod, 'mes_reajuste') ? ' e o mês fixado' : ''}`)}`) : '';
    const fonte = [c.arquivo ? `Contrato: ${esc(c.arquivo)}` : '', c.adm_arquivo ? `Administração: ${esc(c.adm_arquivo)}` : '', [].concat(c.aditivos || []).length ? `Aditivos: ${[].concat(c.aditivos).map(esc).join(', ')}` : ''].filter(Boolean).join('<br>');
    return `<div class="card" style="margin-bottom:14px"><h2>Contrato</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));column-gap:22px;margin-top:8px">${linhas}${extra}</div>
      ${c.obs ? `<p class="nota" style="margin:8px 0 0;color:var(--ink)">${esc(c.obs)}</p>` : ''}
      <p class="nota" style="margin:8px 0 0">${fonte || 'Arquivo não identificado.'}<br>Lido em ${dt(c.lido_em) || '—'}${c.conferido_em ? ' · conferido em ' + dt(c.conferido_em) : ''}${c.confianca ? ' · confiança ' + esc(c.confianca) : ''}. "Não encontrado" = o contrato não traz o dado.</p></div>`;
  }
  function ficha(cod) {
    const f = (H.S[CL] || {})[cod] || (ct(cod) ? {} : null); if (!f) return H.vazio('Locação sem ficha.');
    const c = ctr(cod), s = f.seguro || {}, al = f.alude || {}, cb = al.cobranca || {}, rp = al.repasse || {}, gr = al.garantia || {}, rj = al.reajuste || {};
    const temAlude = Object.keys(al).length > 0; const e = encSeguro(al);
    const pasta = typeof H.pastaDoCodigo === 'function' ? H.pastaDoCodigo(cod) : null;
    const div = temAlude && s.vigencia_fim && al.seguro_incendio_venc && s.vigencia_fim !== al.seguro_incendio_venc;
    const cab = `<div class="card" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start">
      <div><span class="cod" style="font-size:18px">${esc(cod)}</span> <span class="s" style="display:inline;color:var(--muted);font-size:12px">${al.numero ? esc(al.numero) + ' no Alude' : 'fora do Alude'}</span>
      <div>${esc(campo(c, 'endereco') || vv(cod, 'imovel') || '—')}</div><div style="color:var(--muted);font-size:12px">${esc(campo(c, 'locador') || '')}${campo(c, 'locatario') ? ' × ' + esc(campo(c, 'locatario')) : ''}</div></div>
      <div class="filtros" style="margin:0"><button class="btn" data-fichas-ver="">← Todas</button><button class="btn" data-fichas-carteira="${esc(cod)}">Ver na Carteira</button>${al.alude_id ? `<a class="btn" href="https://app.alude.com.br/0/rental/${esc(al.alude_id)}/billings" target="_blank" rel="noopener">Abrir no Alude</a>` : ''}${pasta ? `<a class="btn" href="abrirpasta:${encodeURIComponent(pasta)}" title="${esc(pasta)}">Abrir pasta</a>` : ''}</div></div></div>`;
    const seg = `<div class="card"><h2>Seguro incêndio</h2><div style="margin:6px 0 10px">${pillSit(s)}</div>
      ${linha('Seguradora', esc(s.seguradora || '—'))}${linha('Apólice', esc(s.apolice || '—'))}${s.proposta ? linha('Proposta', esc(s.proposta)) : ''}
      ${linha('Segurado', esc(s.segurado || '—'))}${s.beneficiario ? linha('Beneficiário', esc(s.beneficiario)) : ''}
      ${linha('Vigência', s.vigencia_inicio || s.vigencia_fim ? `${dt(s.vigencia_inicio) || '—'} a ${dt(s.vigencia_fim) || '—'}` : '—')}
      ${s.vigencia_fim ? linha('Vence', venceCurto(s.vigencia_fim)) : ''}
      ${s.premio_total ? linha('Prêmio', `${brl(s.premio_total)}${s.parcelas ? ` · ${s.parcelas}× ${s.valor_parcela ? brl(s.valor_parcela) : ''}` : ''}`) : (s.parcelas ? linha('Parcelas', esc(s.parcelas)) : '')}
      ${s.lmi_incendio ? linha('Limite incêndio', brl(s.lmi_incendio)) : ''}
      ${temAlude ? linha('No boleto do Alude', e ? `${brl(e.valor_parcela)} · ${e.pagas}/${e.parcelas} pagas` : 'não cobra') : ''}
      ${temAlude ? linha('Vencimento no Alude', al.seguro_incendio_venc ? dt(al.seguro_incendio_venc) + (div ? ' <span class="pill warn">≠ apólice</span>' : '') : '—') : ''}
      ${s.cobranca ? `<p class="nota" style="margin:8px 0 0">${esc(s.cobranca)}</p>` : ''}
      ${s.coberturas ? `<p class="nota" style="margin:6px 0 0">Coberturas: ${esc(s.coberturas)}</p>` : ''}
      ${(s.arquivos || []).length ? `<p class="nota" style="margin:6px 0 0">Arquivos: ${s.arquivos.map(esc).join('<br>')}</p>` : ''}
      ${s.obs ? `<p class="nota" style="margin:6px 0 0;color:var(--ink)">${esc(s.obs)}</p>` : ''}
      <p class="nota" style="margin:6px 0 0">Registro: ${esc(s.fonte || '—')}${s.atualizado_em ? ' · ' + dt(s.atualizado_em) : ''}</p></div>`;
    if (!temAlude) return cab + cardContrato(cod) + `<div class="grade">${seg}<div class="card"><h2>Alude</h2><p class="nota" style="margin:6px 0 0">Locação fora do Alude (aluguel pago direto ao locador): não há encargos nem parâmetros de cobrança lá.</p></div></div>`;
    const par = `<div class="card"><h2>Cobrança no Alude</h2><div style="margin-top:8px">
      ${linha('Aluguel cadastrado', brl(al.aluguel))}${linha('Vencimento', cb.dia_vencimento ? 'dia ' + cb.dia_vencimento : '—')}${linha('Referência', esc(cb.referencia || '—'))}
      ${linha('Meio de pagamento', esc(cb.meio_pagamento || '—'))}${linha('Multa', cb.multa_pct != null ? cb.multa_pct + '%' : '—')}${linha('Juros', cb.juros_pct_mes != null ? cb.juros_pct_mes + '% ao mês' : '—')}
      ${linha('Desconto de pontualidade', esc(cb.desconto_pontualidade || '—'))}${linha('Boleto aprovado sozinho', sn(cb.gera_boleto_sozinho))}${linha('Gera a cobrança', cb.dias_antes_boleto != null ? cb.dias_antes_boleto + ' dias antes' : '—')}
      ${linha('Avisos por e-mail', sn(cb.aviso_email))}${linha('Avisos por WhatsApp/SMS', sn(cb.aviso_whatsapp_sms))}
      ${cb.obs_cobrancas ? linha('Obs. das cobranças', esc(cb.obs_cobrancas)) : ''}${cb.obs_locacao && cb.obs_locacao !== cb.obs_cobrancas ? linha('Obs. da locação', esc(cb.obs_locacao)) : ''}</div></div>`;
    const rep = `<div class="card"><h2>Repasse, garantia e reajuste</h2><div style="margin-top:8px">
      ${linha('Repasse automático', sn(rp.automatico))}${linha('Relatório ao proprietário', sn(rp.aviso_proprietario))}${linha('Mostra valores da imobiliária', sn(rp.mostra_valores_imobiliaria))}
      ${linha('Garantia', esc(gr.tipo || '—') + (gr.valor ? ' · ' + brl(gr.valor) : ''))}${gr.renovacao ? linha('Renovação da garantia', dt(gr.renovacao)) : ''}
      ${linha('Índice de reajuste', esc(({ igpm: 'IGP-M', ipca: 'IPCA', ivar: 'IVAR', incc: 'INCC', fixed: 'percentual fixo' })[rj.indice] || rj.indice || '—'))}
      ${linha('Último reajuste', rj.ultimo ? dt(rj.ultimo) : '—')}${linha('Próximo reajuste', rj.proximo ? dt(rj.proximo) : '—')}</div></div>`;
    const enc = `<div class="card" style="margin-top:14px"><h2>Encargos no boleto do locatário</h2>${tabEnc(al.encargos_cobranca, 'Nenhum encargo além do aluguel.')}
      <h2 style="margin-top:14px">Encargos no repasse ao proprietário</h2>${tabEnc(al.encargos_repasse, 'Nenhum encargo no repasse.')}
      <p class="nota" style="margin:8px 0 0">Lido do Alude em ${dt(f.alude_lido_em) || '—'}. "Retido pela Vivere" = fica na conta da Vivere (seguro para pagar a seguradora, taxa de boleto).</p></div>`;
    return cab + cardContrato(cod) + `<div class="grade">${seg}${par}${rep}</div>${enc}`;
  }

  function render() {
    const L = fichas();
    if (!L.length) return `<h2>Fichas das locações</h2>` + H.vazio(H.carregado[CL] ? 'Nenhuma ficha ainda.' : 'Carregando…');
    if (F.cod && !temFicha(F.cod)) F.cod = null;
    const chips = `<div class="filtros">${L.filter((f) => ativo(f._id)).map((f) => `<button class="btn" data-fichas-ver="${esc(f._id)}" aria-pressed="${F.cod === f._id}">${esc(f._id)}</button>`).join('')}</div>`;
    return `<h2>Fichas das locações</h2><p class="nota">O contrato de cada locação (lido do PDF, com a cláusula de cada dado), o seguro incêndio (apólice, vigência e como é cobrado), os encargos lançados no Alude e os parâmetros de cobrança e repasse. O seguro vem das pastas (Encargos) e é conferido nas sessões; o Alude é lido todo dia útil pela rotina.</p>${chips}${F.cod ? ficha(F.cod) : geral()}`;
  }

  H.registrar({
    id: ID, aba: 'Fichas', grupo: 'locacao', depois: 'carteira', colecoes: [CL, CL2, 'contratos_locacao'],
    tipos: { fichas_seguro_vence: 'Seguro incêndio vencendo', fichas_seguro_contratar: 'Seguro incêndio a contratar', fichas_seguro_divergencia: 'Seguro incêndio — divergência' },
    render,
    foco(alvo) { if (alvo && temFicha(alvo)) F.cod = alvo; },
    busca(q) {
      const t = String(q || '').toLowerCase(); if (t.length < 2) return [];
      return fichas().filter((f) => { const s = f.seguro || {}; return [f._id, s.seguradora, s.apolice, s.proposta, s.segurado, vv(f._id, 'locador'), vv(f._id, 'locatario'), vv(f._id, 'imovel')].filter(Boolean).join(' ').toLowerCase().includes(t); })
        .slice(0, 8).map((f) => ({ grp: 'Fichas das locações', tit: `${f._id} — seguro ${((SIT[(f.seguro || {}).situacao] || [])[0] || '').toLowerCase()}`,
          sub: [(f.seguro || {}).seguradora, (f.seguro || {}).apolice].filter(Boolean).join(' · '), ir: { aba: ID, alvo: f._id } }));
    },
  });
  H.carteiraContratos = { alertas, proxReajuste, ficha: (cod) => ct(cod) };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fichas-ver]'); if (b) { F.cod = b.dataset.fichasVer || null; H.pede(); window.scrollTo(0, 0); return; }
    const c = e.target.closest('[data-fichas-carteira]'); if (c) { H.irPara('carteira', 'car-' + c.dataset.fichasCarteira); }
  });
})();
