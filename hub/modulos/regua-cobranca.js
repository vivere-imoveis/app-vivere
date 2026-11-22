// modulos/regua-cobranca.js — Régua de cobrança da carteira (construção "regua-cobranca", 17/11/2026)
// Tarefa vivere-regua-cobranca-carteira. Decisões do Cleiton (17/11/2026, cartões):
// • NADA é enviado ao locatário: o HUB só mostra os lembretes do dia e uma mensagem pronta para copiar.
// • Degraus D-3 (aviso antes do vencimento), D+1, D+5 e D+10; D+15 propõe a notificação extrajudicial;
//   D+30 sem acordo, o caso vai ao Jurídico (execução ou despejo).
// • Fica dentro de Locação › Cobrança (bloco "Régua do dia" no topo; o núcleo chama MODS['regua-cobranca'].bloco()).
// • Atualização das cobranças por coleta SOB DEMANDA do Alude (sem agendada): o bloco mostra quando o Alude foi lido
//   e, acima de 3 dias, pede "atualiza as cobranças".
// Lê: cobrancas, contratos_locacao, repasses, controle (coletas). Não grava nada. Sem CPF/CNPJ, telefone, e-mail ou conta.
// Valor atualizado = o mesmo cálculo do Relatório de dívida (HUB.relDivida.calc: IGP-M, juros e multa do contrato, sem honorários).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, brl = H.brl;
  const ID = 'regua-cobranca', VERSAO = '2026-11-17.1';
  const MSG = {};

  const ymd = (s) => String(s || '').slice(0, 10);
  const dBR = (s) => { const m = ymd(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; };
  const dCurto = (s) => { const m = ymd(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}` : '—'; };
  const compTxt = (c) => { const [y, m] = String(c || '').split('-'); return m ? m + '/' + y : '—'; };
  const dias = (a, b) => Math.round((Date.parse(ymd(b) + 'T12:00:00Z') - Date.parse(ymd(a) + 'T12:00:00Z')) / 864e5);
  const maisDias = (iso, n) => new Date(Date.parse(ymd(iso) + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const num = (v) => (v === null || v === undefined || v === '' || isNaN(+v) ? null : +v);
  const vtxt = (v) => (num(v) === null ? 'valor ilegível' : brl(+v));

  // degraus da régua (dias = hoje − vencimento; negativo = antes de vencer)
  const DEG = [
    { id: 'D-3', de: -3, ate: 0, nome: 'Aviso antes do vencimento', cls: 'info', marco: -3 },
    { id: 'D+1', de: 1, ate: 4, nome: '1º lembrete', cls: 'warn', marco: 1 },
    { id: 'D+5', de: 5, ate: 9, nome: '2º lembrete', cls: 'warn', marco: 5 },
    { id: 'D+10', de: 10, ate: 14, nome: 'Cobrança firme', cls: 'bad', marco: 10 },
    { id: 'D+15', de: 15, ate: 29, nome: 'Propor notificação extrajudicial', cls: 'bad', marco: 15 },
    { id: 'D+30', de: 30, ate: 1e9, nome: 'Jurídico: execução ou despejo', cls: 'bad', marco: 30 },
  ];
  const degDe = (d) => DEG.find((x) => d >= x.de && d <= x.ate) || null;
  const PERFIL = { bom: ['Bom pagador', 'ok'], vezes: ['Atrasa às vezes', 'warn'], reinc: ['Reincidente', 'bad'] };

  const cont = (cod) => ((H.S.contratos_locacao || {})[cod]) || {};
  const campo = (c, k) => { for (const f of ['planilha', 'alude']) { const v = c[f] && c[f][k]; if (v) return v; } return ''; };
  function primeiroNome(loc) {
    const t = String(loc || '').trim(); if (!t) return '';
    const p = t.split(/\s+e\s+/i)[0].trim();
    if (/\b(ltda|me|eireli|s\.?a\.?|epp|cia)\b\.?$/i.test(p)) return p;
    const w = p.split(/\s+/)[0]; return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }
  const abertaHoje = (b) => b && (b.situacao === 'atrasada' || b.situacao === 'aberta' || b.situacao === 'a_emitir');

  // histórico de 12 meses: competências pagas com mais de 3 dias de atraso + as que estão em atraso hoje
  function perfil(cod, B, hoje) {
    const lim = maisDias(hoje, -365); let n = 0;
    for (const b of B) {
      if (b.cod !== cod || ymd(b.vencimento) < lim) continue;
      if (b.situacao === 'paga' && b.pago_em && dias(b.vencimento, b.pago_em) > 3) n++;
      else if (abertaHoje(b) && dias(b.vencimento, hoje) > 3) n++;
    }
    return { k: n === 0 ? 'bom' : n <= 2 ? 'vezes' : 'reinc', n };
  }

  // pista de pagamento recente que a última leitura do Alude ainda não mostra como "paga"
  function talvezPago(cod, b) {
    const r = ((H.S.repasses || {})[cod + '_' + b.competencia]) || null;
    if (r && r.status === 'pago') return 'repasse da competência consta pago';
    const cb = ((cont(cod).alude || {}).cobranca) || {};
    if (cb.pago_em && cb.vencimento_atual && ymd(cb.vencimento_atual) === ymd(b.vencimento)) return 'o contrato no Alude registra pagamento em ' + dBR(cb.pago_em);
    return '';
  }

  function texto(it, hoje) {
    const saud = it.nome ? `Olá, ${it.nome}! Tudo bem?` : 'Olá! Tudo bem?';
    const ass = '\n\nAtenciosamente,\nVivere Imóveis Selecionados';
    const imv = it.endereco ? ` do imóvel ${it.endereco}` : '';
    const prazo = dBR(maisDias(hoje, 3));
    if (it.deg.id === 'D-3') {
      const b = it.antes[0]; const quando = it.diasMax === 0 ? 'vence hoje' : `vence em ${dBR(b.vencimento)}`;
      const extra = it.perfil.k === 'reinc' ? ' Para evitar multa e juros, pedimos atenção à data.' : '';
      return `${saud}\n\nPassando para lembrar que o aluguel de ${compTxt(b.competencia)}${imv} ${quando} (${vtxt(b.valor)}). O boleto chega pelo e-mail do Alude; se precisar da 2ª via, é só nos pedir.${extra}${ass}`;
    }
    const lista = it.atrasos.map((b) => `• ${compTxt(b.competencia)} — venc. ${dBR(b.vencimento)} — ${vtxt(b.valor)}${b.sem_boleto ? ' (boleto não emitido pelo Alude por causa do atraso anterior)' : ''}`).join('\n');
    const tot = it.ilegivel ? '' : `\n\nValor atualizado hoje (com multa, juros e correção do contrato): ${brl(it.total)}.`;
    const gentil = it.perfil.k === 'bom' && (it.deg.id === 'D+1' || it.deg.id === 'D+5');
    if (gentil) return `${saud}\n\nAinda não identificamos o pagamento do aluguel${imv}:\n${lista}${tot}\n\nSe já pagou, por favor desconsidere e, se puder, nos envie o comprovante. Precisando da 2ª via, é só pedir.${ass}`;
    if (it.deg.id === 'D+1' || it.deg.id === 'D+5' || it.deg.id === 'D+10') return `${saud}\n\nConsta em aberto o aluguel${imv}, com ${it.diasMax} dias de atraso:\n${lista}${tot}\n\nPedimos a regularização até ${prazo} ou que nos procure para combinarmos a melhor forma. Se o pagamento já foi feito, por favor nos envie o comprovante.${ass}`;
    if (it.deg.id === 'D+15') return `${saud}\n\nO débito do aluguel${imv} segue em aberto há ${it.diasMax} dias:\n${lista}${tot}\n\nSem a regularização ou um contato até ${prazo}, a Vivere enviará notificação extrajudicial, conforme o contrato de locação. Estamos à disposição para conversar sobre um acordo.${ass}`;
    return `${saud}\n\nApesar dos contatos anteriores, o débito do aluguel${imv} segue em aberto há ${it.diasMax} dias:\n${lista}${tot}\n\nSem a regularização imediata ou uma proposta de acordo, o caso será encaminhado ao jurídico para as medidas cabíveis (cobrança judicial e despejo por falta de pagamento).${ass}`;
  }

  function pedidoClaude(it) {
    const comps = it.atrasos.map((b) => compTxt(b.competencia)).join(', ');
    if (it.deg.id === 'D+15') return `Faz a notificação extrajudicial do locatário da ${it.cod} pelos aluguéis em atraso (${comps}; ${it.diasMax} dias), com os valores do Relatório de dívida do HUB — skill notificacoes-e-contranotificacoes.`;
    return `A locação ${it.cod} está com ${it.diasMax} dias de atraso (${comps}) e passou do D+30 da régua sem acordo: analisa execução ou despejo por falta de pagamento (aba Jurídico do HUB).`;
  }

  function montar() {
    const hoje = H.hojeISO(); const B = H.lista('cobrancas');
    const porCod = {};
    for (const b of B) {
      if (!abertaHoje(b) || !b.cod || !b.vencimento) continue;
      const d = dias(b.vencimento, hoje);
      if (d < -3) continue;
      (porCod[b.cod] = porCod[b.cod] || []).push(Object.assign({ d }, b));
    }
    const itens = Object.keys(porCod).map((cod) => {
      const L = porCod[cod].sort((a, b) => ymd(a.vencimento).localeCompare(ymd(b.vencimento)));
      const atrasos = L.filter((b) => b.d >= 1), antes = L.filter((b) => b.d <= 0);
      const diasMax = atrasos.length ? Math.max(...atrasos.map((b) => b.d)) : Math.max(...antes.map((b) => b.d));
      const deg = degDe(diasMax);
      const c = cont(cod); const loc = campo(c, 'locatario');
      let total = null, base = null;
      if (atrasos.length) { try { const r = H.relDivida.calc(cod, hoje, 0, []); total = r.total; base = r.base; } catch (_) { total = null; } }
      const ilegivel = L.some((b) => num(b.valor) === null) || (atrasos.length > 0 && total === null);
      const pistas = L.map((b) => talvezPago(cod, b)).filter(Boolean);
      const hojeMarco = !!deg && diasMax === deg.marco;
      return { cod, L, atrasos, antes, diasMax, deg, loc, nome: primeiroNome(loc), endereco: campo(c, 'endereco'), total, base, ilegivel, pistas, hojeMarco, perfil: perfil(cod, B, hoje) };
    }).filter((x) => x.deg);
    itens.sort((a, b) => (b.hojeMarco - a.hojeMarco) || (b.diasMax - a.diasMax) || String(a.cod).localeCompare(String(b.cod), 'pt-BR', { numeric: true }));
    return { hoje, itens };
  }

  function frescor(hoje) {
    const co = ((H.S.controle || {}).coletas || {}).alude || {};
    const em = co.em ? String(co.em) : '';
    if (!em) return { txt: 'Alude ainda sem leitura registrada', velho: true };
    const d = new Date(Date.parse(em) - 3 * 3600e3).toISOString().slice(0, 10);
    const idade = dias(d, hoje);
    return { txt: `Alude lido em ${dCurto(d)}${idade ? ` (há ${idade} dia${idade === 1 ? '' : 's'})` : ' (hoje)'}`, velho: idade > 3 };
  }

  function bloco() {
    const { hoje, itens } = montar(); const fr = frescor(hoje);
    const aviso = fr.velho ? `<div class="card alerta" style="margin:10px 0"><b>Leitura do Alude desatualizada.</b> Antes de cobrar, peça no chat <b>"atualiza as cobranças"</b> — pagamentos feitos depois da última leitura ainda não aparecem.</div>` : '';
    const cab = `<div class="card" style="margin:14px 0" id="regua-dia"><h2>Régua do dia</h2><p class="nota">${esc(fr.txt)} · degraus D-3, D+1, D+5 e D+10; D+15 propõe a notificação extrajudicial; D+30 sem acordo vai ao Jurídico. <b>Nada é enviado ao locatário</b>: copie a mensagem, se quiser. A9, A10 e T1 ficam fora do Alude.</p>${aviso}`;
    if (!itens.length) return `${cab}<p class="nota" style="margin:0">Nenhum aluguel em atraso nem vencendo nos próximos 3 dias.</p></div>`;
    for (const k in MSG) delete MSG[k];
    const linhas = itens.map((it) => {
      MSG[it.cod] = texto(it, hoje);
      const p = PERFIL[it.perfil.k];
      const comps = it.L.map((b) => `<div><b>${esc(compTxt(b.competencia))}</b> · venc. ${esc(dBR(b.vencimento))} · ${b.d > 0 ? b.d + ' d' : b.d === 0 ? 'vence hoje' : 'vence em ' + (-b.d) + ' d'} · ${esc(vtxt(b.valor))}${b.sem_boleto ? ' · <span class="s" style="display:inline">sem boleto (Alude suspendeu)</span>' : ''}</div>`).join('');
      const valor = it.atrasos.length ? (it.ilegivel ? '<span style="color:var(--warn)">valor ilegível — conferir no Alude</span>' : `<b>${brl(it.total)}</b><span class="s">boletos ${brl(it.base)}</span>`) : esc(vtxt(it.L[0].valor));
      const pista = it.pistas.length ? `<div class="s" style="color:var(--warn)">Possivelmente pago — conferir (${esc(it.pistas[0])})</div>` : '';
      const marco = it.hojeMarco ? ' <span class="pill info" title="Hoje é o dia deste degrau">hoje</span>' : '';
      const acoes = [`<button class="btn" data-regua-msg="${esc(it.cod)}">Copiar mensagem</button>`];
      if (it.atrasos.length) acoes.push(`<button class="btn" data-rel="${esc(it.cod)}">Relatório de dívida</button>`);
      if (it.deg.id === 'D+15' || it.deg.id === 'D+30') acoes.push(`<button class="btn" data-regua-ped="${esc(it.cod)}" title="Copia o pedido para colar no chat do Claude">${it.deg.id === 'D+15' ? 'Pedir a notificação' : 'Pedir análise jurídica'}</button>`);
      if (it.deg.id === 'D+30') acoes.push(`<button class="btn" data-aba="juridico">Abrir Jurídico</button>`);
      MSG['ped:' + it.cod] = (it.deg.id === 'D+15' || it.deg.id === 'D+30') ? pedidoClaude(it) : '';
      return `<tr id="regua-${esc(it.cod)}"><td class="cod"><b>${esc(it.cod)}</b></td><td>${esc(it.loc || '—')}${pista}</td><td class="bols">${comps}</td><td class="n">${valor}</td><td><span class="pill ${it.deg.cls}">${esc(it.deg.id)}</span>${marco}<span class="s">${esc(it.deg.nome)}</span></td><td><span class="pill ${p[1]}">${esc(p[0])}</span><span class="s">${it.perfil.n} atraso${it.perfil.n === 1 ? '' : 's'} em 12 meses</span></td><td>${acoes.join(' ')}</td></tr>`;
    }).join('');
    return `${cab}<div class="tabela"><table class="dev-lista"><thead class="quebra"><tr><th>Locação</th><th>Locatário</th><th>Aluguéis</th><th class="n">Valor hoje</th><th>Degrau</th><th>Perfil</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div></div>`;
  }

  H.registrar({ id: ID, colecoes: ['cobrancas', 'contratos_locacao', 'repasses'], bloco, versao: VERSAO, _montar: montar, _texto: (cod) => MSG[cod] || '' });

  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-regua-msg]'); if (m) { const t = MSG[m.dataset.reguaMsg]; if (t) H.copiaTexto(t, m); return; }
    const p = e.target.closest('[data-regua-ped]'); if (p) { const t = MSG['ped:' + p.dataset.reguaPed]; if (t) H.copiaTexto(t, p); }
  });
})();
