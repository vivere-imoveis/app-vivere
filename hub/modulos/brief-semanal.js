// modulos/brief-semanal.js — aba "📋 Brief" no Início do HUB VIVERE (construção "brief-semanal", 14/11/2026, tarefa vivere-brief-semanal-diretoria)
// Contrato: _hub\modulos\LEIA-ME.md. Pedido do Cleiton: toda segunda, uma página que a diretoria lê em 2 minutos, com os 4 blocos
// (caixa e recebimentos, carteira e inadimplência, captações e vendas, leads), cada número comparado com a semana anterior;
// fonte que faltar aparece numa linha no fim, nunca como zero. Decisões (cartão, 14/11/2026): calculada na hora, sem agendada;
// por ora só o Cleiton (botão "Copiar texto" para mandar aos diretores); inadimplência comparada por uma foto semanal.
// • Lê (só leitura): repasses, financeiro_lancamentos, contratos_locacao, cobrancas, imoveis, vendas, leads_contatos,
//   portais_leads, captacao-leads_leads, pendencias, controle; e H.carteiraContratos (alertas da carteira), se carregado.
// • F2 (14/11/2026, regra escolhida pelo Cleiton no cartão: ordem fixa): UMA ação da semana com o motivo — 1º pendência aberta de
//   prioridade alta (prazo mais próximo, depois a mais antiga; avisos de coleta entram também, decisão de 14/11/2026 17:43); senão 2º boletos em
//   atraso que subiram × a foto semanal anterior; senão 3º a meta dos imóveis sob gestão (fechar N locações no ritmo da semana).
// • Grava: só `brief_semanal_fotos` (nível mestre), um doc por semana (id = segunda-feira AAAA-MM-DD), com a contagem de boletos
//   em atraso, na 1ª abertura da semana. Nada de nome, CPF, telefone ou e-mail.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, brl = H.brl, dt = H.dt;
  const ID = 'brief-semanal', CF = 'brief_semanal_fotos';
  const COLS = ['repasses', 'financeiro_lancamentos', 'contratos_locacao', 'cobrancas', 'imoveis', 'vendas', 'leads_contatos', 'portais_leads', 'captacao-leads_leads', 'pendencias', CF];
  const NOME = { repasses: 'Repasses do Alude', financeiro_lancamentos: 'Financeiro', contratos_locacao: 'Carteira', cobrancas: 'Cobranças',
    imoveis: 'Imóveis do site', vendas: 'Vendas', leads_contatos: 'Leads das campanhas', portais_leads: 'Leads dos portais', 'captacao-leads_leads': 'Captação automática' };
  const E = { parcial: false, copiado: '' };

  // data do dia em Brasília: carimbo com hora e fuso (…Z, -03:00) vira o dia local; data pura fica como está; fora de ISO = descartada
  const iso = (s) => { s = String(s || ''); if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(Z|[+-]\d{2}:?\d{2})$/.test(s)) { const t = Date.parse(s); if (!isNaN(t)) return new Date(t - 3 * 3600e3).toISOString().slice(0, 10); }
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : ''; };
  const soma = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const segunda = (d) => { const w = new Date(d + 'T00:00:00Z').getUTCDay(); return soma(d, -((w + 6) % 7)); };
  const L = (c) => (H.S[c] ? H.lista(c) : []);
  const tem = (c) => !!(H.carregado && H.carregado[c]);
  const num = (v) => Number(v) || 0;

  // semana em foco: a última seg–dom completa × a anterior; "parcial" = esta semana até hoje × os mesmos dias da semana passada
  function janelas() {
    const h = H.hojeISO(), s0 = segunda(h);
    if (E.parcial) { const n = Math.round((Date.parse(h) - Date.parse(s0)) / 864e5); return { a: [s0, h], b: [soma(s0, -7), soma(s0, n - 7)], s0 }; }
    return { a: [soma(s0, -7), soma(s0, -1)], b: [soma(s0, -14), soma(s0, -8)], s0 };
  }
  const dentro = (d, j) => { d = iso(d); return !!d && d >= j[0] && d <= j[1]; };

  // ------------------------------------------------------------ cálculo dos blocos
  function calcula() {
    const J = janelas(), p = Object.assign({ meta_locacao: 40, meta_prazo: '2026-12-31', boleto_dias: 5 }, ((H.S.controle || {}).parametros) || {});
    const por = (fn) => ({ a: fn(J.a), b: fn(J.b) });
    const rep = L('repasses').filter((r) => r.status === 'pago' && r.pago_em);
    const fin = L('financeiro_lancamentos').filter((x) => x.situacao === 'pago' && x.pago_em);
    const caixa = {
      adm: por((j) => rep.filter((r) => dentro(r.pago_em, j)).reduce((t, r) => t + num(r.taxa_adm_alude), 0)),
      int: por((j) => rep.filter((r) => r.intermediacao && dentro(r.pago_em, j)).reduce((t, r) => t + num(r.intermediacao.valor), 0)),
      ent: por((j) => fin.filter((x) => x.natureza === 'entrada' && dentro(x.pago_em, j)).reduce((t, x) => t + num(x.valor), 0)),
      sai: por((j) => fin.filter((x) => x.natureza === 'saida' && dentro(x.pago_em, j)).reduce((t, x) => t + num(x.valor), 0)),
    };
    const ativos = L('contratos_locacao').filter((c) => H.contratoAtivo(c)).length;
    const h = H.hojeISO(), pz = isNaN(Date.parse(p.meta_prazo)) ? '2026-12-31' : p.meta_prazo, sem = Math.max(1, Math.ceil((Date.parse(pz) - Date.parse(h)) / (7 * 864e5)));
    const falta = Math.max(0, num(p.meta_locacao) - ativos);
    const atr = L('cobrancas').filter((b) => b.situacao === 'atrasada' && num(b.dias_atraso) >= num(p.boleto_dias));
    const hoje = { n: atr.length, valor: atr.reduce((t, b) => t + num(b.valor), 0), contratos: new Set(atr.map((b) => b.cod)).size };
    const fotos = L(CF).filter((f) => f._id < J.s0).sort((x, y) => (x._id < y._id ? 1 : -1));
    let alertas = null; try { if (H.carteiraContratos && typeof H.carteiraContratos.alertas === 'function' && tem('fichas_locacao_contratos')) alertas = H.carteiraContratos.alertas(); } catch (e) { alertas = null; }
    const vgv = (v) => /^(PCV|CESS|PERMUTA|DA[CÇ][AÃ]O|PROMESSA)/i.test(String(v.tipo || '').trim()) && !/sem comiss/i.test(String(v.status || ''));
    const V = L('vendas').filter(vgv);
    const vendas = { n: por((j) => V.filter((v) => dentro(v.data, j)).length), vgv: por((j) => V.filter((v) => dentro(v.data, j)).reduce((t, v) => t + num(v.valor_transacao), 0)),
      com: por((j) => V.filter((v) => dentro(v.data, j)).reduce((t, v) => t + num(v.comissao_imob), 0)) };
    const capt = por((j) => L('imoveis').filter((x) => dentro(x.cadastrado_em, j)).length);
    const lc = por((j) => L('leads_contatos').filter((x) => dentro(x.data, j)).length);
    const lp = por((j) => L('portais_leads').filter((x) => !x.interno && dentro(x.data, j)).length);
    const la = por((j) => L('captacao-leads_leads').filter((x) => dentro(x.coletado_em, j)).length);
    const R = { J, p, caixa, carteira: { ativos, meta: num(p.meta_locacao), prazo: pz, falta, sem, ritmo: falta / sem }, atraso: { hoje, antes: fotos[0] || null }, alertas, vendas, capt, leads: { lc, lp, la } };
    R.acao = acao(R); return R;
  }

  // ------------------------------------------------------------ F2: ação da semana (ordem fixa, decisão do Cleiton, 14/11/2026)
  function acao(R) {
    const sem = [];
    if (tem('pendencias')) {
      const P = L('pendencias').filter((x) => x.status === 'aberta' && x.prioridade === 'alta');
      const pz = (x) => iso(x.prazo) || '9999-12-31', ini = (x) => iso(x.desde) || iso(x.aberta_em) || '9999-12-31';
      P.sort((x, y) => (pz(x) !== pz(y) ? (pz(x) < pz(y) ? -1 : 1) : ini(x) < ini(y) ? -1 : ini(x) > ini(y) ? 1 : 0));
      if (P.length) {
        const x = P[0], h = H.hojeISO(), q = iso(x.prazo), d0 = ini(x), m = [];
        m.push(q ? (q < h ? `prazo vencido em ${dt(q)}` : `prazo em ${dt(q)}`) : 'sem prazo');
        if (d0 !== '9999-12-31') m.push(`aberta desde ${dt(d0)}`);
        if (P.length > 1) m.push(`mais ${P.length - 1} pendência${P.length > 2 ? 's' : ''} alta${P.length > 2 ? 's' : ''} na fila`);
        return { passo: 1, acao: String(x.titulo || 'Pendência de prioridade alta'), motivo: `Pendência de prioridade alta: ${m.join(' · ')}.`, sem };
      }
    } else sem.push('pendências');
    const A = R.atraso, pen = tem('pendencias') ? 'Sem pendência alta aberta' : 'Pendências não carregaram';
    const nAnt = A.antes && A.antes.boletos_atrasados != null && A.antes.boletos_atrasados !== '' ? Number(A.antes.boletos_atrasados) : NaN;
    if (tem('cobrancas')) {
      if (Number.isFinite(nAnt) && A.hoje.n > nAnt) {
        return { passo: 2, acao: `Cobrar os ${A.hoje.n} boleto${A.hoje.n === 1 ? '' : 's'} em atraso (${brl(A.hoje.valor)}, ${A.hoje.contratos} contrato${A.hoje.contratos === 1 ? '' : 's'})`,
          motivo: `${pen}, e o atraso subiu de ${nAnt} para ${A.hoje.n} desde a foto de ${dt(A.antes.semana || A.antes._id)}.`, sem };
      }
    } else sem.push('cobranças');
    const atr = !tem('cobrancas') ? '' : !A.antes ? ' e ainda não há foto anterior do atraso para comparar' : !Number.isFinite(nAnt) ? ' e a foto anterior do atraso está sem a contagem' : ' e o atraso não subiu';
    const k = R.carteira, base = pen + atr;
    if (!tem('contratos_locacao')) { sem.push('carteira'); return { passo: 0, acao: 'Sem dado para escolher a ação', motivo: `${base}; a carteira não carregou, então a meta não pôde ser calculada.`, sem }; }
    if (k.falta > 0) { const n = Math.ceil(k.ritmo);
      return { passo: 3, acao: `Fechar ${n} locaç${n === 1 ? 'ão' : 'ões'} nesta semana`,
        motivo: `${base}; a meta pede ${k.ritmo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por semana: faltam ${k.falta} imóveis sob gestão para ${k.meta} até ${dt(k.prazo)} (${k.sem} semana${k.sem === 1 ? '' : 's'}).`, sem }; }
    return { passo: 3, acao: 'Manter a carteira e captar acima da meta', motivo: `${base}; a meta de ${k.meta} imóveis sob gestão já foi atingida (${k.ativos}).`, sem };
  }

  // foto semanal da inadimplência (decisão do Cleiton, 14/11/2026): 1ª abertura da semana grava o retrato de hoje
  let fotoPedida = '';
  function foto(R) {
    const db = typeof H.db === 'function' ? H.db() : null, id = R.J.s0;
    if (!db || !tem(CF) || !tem('cobrancas') || !tem('contratos_locacao') || (H.S[CF] || {})[id] || fotoPedida === id) return;
    fotoPedida = id;
    const doc = { semana: id, em: new Date().toISOString(), boletos_atrasados: R.atraso.hoje.n, valor_atrasado: Math.round(R.atraso.hoje.valor * 100) / 100,
      contratos_atrasados: R.atraso.hoje.contratos, carteira_ativa: R.carteira.ativos, regra: `situação atrasada e ${R.p.boleto_dias}+ dias` };
    try { Promise.resolve(db.collection(CF).doc(id).set(doc)).catch(() => {}); } catch (e) {} // falhou: tenta de novo só na próxima abertura
  }

  // ------------------------------------------------------------ desenho
  const dif = (a, b, fmt, neg) => { const d = a - b; if (!d) return '<span class="s">igual à semana anterior</span>';
    const bom = neg ? d < 0 : d > 0; return `<span class="s" style="color:var(--${bom ? 'ok' : 'bad'})">${d > 0 ? '+' : '−'}${fmt(Math.abs(d))} × semana anterior (${fmt(b)})</span>`; };
  const n0 = (v) => String(Math.round(v));
  const lin = (rot, val, sub) => `<div class="vlin" style="white-space:normal;align-items:baseline;gap:10px"><span style="flex:none">${esc(rot)}</span><span class="vr" style="text-align:right;min-width:0"><b>${val}</b>${sub || ''}</span></div>`;
  const card = (tit, corpo) => `<div class="card" style="min-width:0"><h2>${esc(tit)}</h2>${corpo}</div>`;
  const fx = (j) => `${dt(j[0])} a ${dt(j[1])}`;

  function faltando() {
    const F = COLS.filter((c) => c !== CF && c !== 'pendencias' && !tem(c)).map((c) => NOME[c] || c);
    const co = (H.S.controle || {}).coletas || {}; const fal = Object.keys(co).filter((k) => (co[k] || {}).status === 'falhou');
    const t = [];
    if (F.length) t.push(`não carregou: ${F.join(', ')} (os números dessas fontes ficam em branco, não em zero)`);
    if (fal.length) t.push(`coleta com falha: ${fal.join(', ')}`);
    return t;
  }

  function render() {
    const R = calcula(); foto(R);
    const c = R.caixa, k = R.carteira, A = R.atraso, V = R.vendas, Le = R.leads, F = faltando();
    const ok = (col, html) => (tem(col) ? html : '<span class="s">fonte não carregou</span>');
    const b1 = card('Caixa e recebimentos', ok('repasses', lin('Administração recebida', brl(c.adm.a), dif(c.adm.a, c.adm.b, brl)) + lin('Intermediação recebida', brl(c.int.a), dif(c.int.a, c.int.b, brl)))
      + ok('financeiro_lancamentos', lin('Outras entradas pagas', brl(c.ent.a), dif(c.ent.a, c.ent.b, brl)) + lin('Despesas pagas', brl(c.sai.a), dif(c.sai.a, c.sai.b, brl, true)))
      + '<p class="nota" style="margin:6px 0 0">Pela data de pagamento: repasses do Alude e lançamentos do Financeiro.</p>');
    const aAnt = A.antes ? dif(A.hoje.n, num(A.antes.boletos_atrasados), n0, true) : '<span class="s">comparação a partir da próxima foto semanal</span>';
    const al = R.alertas;
    const b2 = card('Carteira e inadimplência', ok('contratos_locacao', lin('Imóveis sob gestão', `${k.ativos} / ${k.meta}`, `<span class="s">faltam ${k.falta} até ${dt(k.prazo)} · ritmo necessário ${k.ritmo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por semana (${k.sem} semana${k.sem === 1 ? '' : 's'})</span>`))
      + ok('cobrancas', lin(`Boletos em atraso (≥ ${R.p.boleto_dias} d)`, `${A.hoje.n}`, `<span class="s">${brl(A.hoje.valor)} · ${A.hoje.contratos} contrato${A.hoje.contratos === 1 ? '' : 's'} (hoje)</span>${aAnt}`))
      + (!tem('fichas_locacao_contratos') ? lin('Alertas da carteira', '', '<span class="s">fonte não carregou</span>') : al ? lin('Alertas da carteira', `${al.length}`, al.slice(0, 3).map((a) => `<span class="s">${esc(a.cod)}: ${esc(a.txt)}</span>`).join('')) : ''));
    const b3 = card('Captações e vendas', ok('imoveis', lin('Imóveis cadastrados no site', n0(R.capt.a), dif(R.capt.a, R.capt.b, n0)))
      + ok('vendas', lin('Negócios com comissão', n0(V.n.a), dif(V.n.a, V.n.b, n0)) + lin('VGV', brl(V.vgv.a), dif(V.vgv.a, V.vgv.b, brl)) + lin('Comissão da imobiliária', brl(V.com.a), dif(V.com.a, V.com.b, brl))));
    const b4 = card('Leads', ok('leads_contatos', lin('Leads das campanhas', n0(Le.lc.a), dif(Le.lc.a, Le.lc.b, n0)))
      + (tem('portais_leads') ? lin('Leads dos portais', n0(Le.lp.a), dif(Le.lp.a, Le.lp.b, n0)) : '')
      + (tem('captacao-leads_leads') ? lin('Captação automática (proprietários)', n0(Le.la.a), dif(Le.la.a, Le.la.b, n0)) : ''));
    const X = R.acao, xs = X.sem.length ? `<span class="s" style="display:block;color:var(--warn)">Não carregou: ${esc(X.sem.join(', '))} — a regra pulou essa etapa.</span>` : '';
    const b0 = `<div class="card" style="min-width:0;margin-top:10px;border-left:4px solid var(--accent, var(--ok))"><h2>🎯 Ação da semana</h2><p style="margin:4px 0 6px;font-size:1.05em;white-space:normal;overflow-wrap:anywhere"><b>${esc(X.acao)}</b></p><p class="nota" style="margin:0;white-space:normal;overflow-wrap:anywhere">${esc(X.motivo)}</p>${xs}</div>`;
    const cab = `<h2>Brief semanal da diretoria</h2><p class="nota">${E.parcial ? 'Esta semana até hoje' : 'Semana passada'}: ${fx(R.J.a)} · comparada com ${fx(R.J.b)}. Calculado agora, a partir do que o HUB já coletou (sem rotina).</p>
      <div class="filtros"><button class="btn" data-brief-sem="0" aria-pressed="${!E.parcial}">Semana passada</button><button class="btn" data-brief-sem="1" aria-pressed="${E.parcial}">Esta semana (parcial)</button><button class="btn" data-brief-copia="1">${E.copiado || 'Copiar texto'}</button></div>`;
    const rod = F.length ? `<p class="nota" style="margin-top:12px;color:var(--warn)">Fontes: ${esc(F.join(' · '))}.</p>` : '';
    return cab + b0 + `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:14px;margin-top:10px">${b1}${b2}${b3}${b4}</div>` + rod;
  }

  // texto para mandar aos diretores (WhatsApp/e-mail): o Cleiton copia e envia; nada sai sozinho
  function texto() {
    const R = calcula(), c = R.caixa, k = R.carteira, A = R.atraso, V = R.vendas, Le = R.leads;
    const d = (a, b, f) => (a === b ? '' : ` (${a > b ? '+' : '−'}${f(Math.abs(a - b))})`), r = (v) => brl(v), n = (v) => String(Math.round(v));
    const sd = (col, txt) => (tem(col) ? txt : txt.replace(/:.*$/, ': sem dado (fonte não carregou)'));
    const X = R.acao;
    const T = [`*Brief semanal Vivere* — ${fx(R.J.a)}${E.parcial ? ' (parcial)' : ''}`, '',
      `*🎯 Ação da semana:* ${X.acao}`, `_${X.motivo}${X.sem.length ? ` Não carregou: ${X.sem.join(', ')}.` : ''}_`, '',
      '*Caixa*', sd('repasses', `• Administração: ${r(c.adm.a)}${d(c.adm.a, c.adm.b, r)}`), sd('repasses', `• Intermediação: ${r(c.int.a)}${d(c.int.a, c.int.b, r)}`),
      sd('financeiro_lancamentos', `• Outras entradas: ${r(c.ent.a)}${d(c.ent.a, c.ent.b, r)} · Despesas: ${r(c.sai.a)}${d(c.sai.a, c.sai.b, r)}`), '',
      '*Carteira*', sd('contratos_locacao', `• Sob gestão: ${k.ativos}/${k.meta} — faltam ${k.falta} até ${dt(k.prazo)} (${k.ritmo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por semana)`),
      sd('cobrancas', `• Boletos em atraso: ${A.hoje.n} (${r(A.hoje.valor)})${A.antes ? d(A.hoje.n, num(A.antes.boletos_atrasados), n) : ''}`), '',
      '*Captações e vendas*', sd('imoveis', `• Imóveis cadastrados: ${n(R.capt.a)}${d(R.capt.a, R.capt.b, n)}`), sd('vendas', `• Negócios: ${n(V.n.a)}${d(V.n.a, V.n.b, n)} · VGV ${r(V.vgv.a)}${d(V.vgv.a, V.vgv.b, r)} · comissão ${r(V.com.a)}`), '',
      '*Leads*', sd('leads_contatos', `• Campanhas: ${n(Le.lc.a)}${d(Le.lc.a, Le.lc.b, n)}`)];
    if (tem('portais_leads')) T.push(`• Portais: ${n(Le.lp.a)}${d(Le.lp.a, Le.lp.b, n)}`);
    const F = faltando(); if (F.length) T.push('', `_Fontes: ${F.join(' · ')}_`);
    return T.join('\n');
  }
  function copia() {
    let t; try { t = texto(); } catch (e) { E.copiado = 'Não copiou'; H.pede(); return; }
    const feito = () => { E.copiado = 'Copiado ✓'; H.pede(); setTimeout(() => { E.copiado = ''; H.pede(); }, 2500); };
    const manual = () => { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); feito(); } catch (e) { E.copiado = 'Não copiou'; H.pede(); } document.body.removeChild(ta); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(feito, manual); else manual();
  }

  H.registrar({ id: ID, aba: '📋 Brief', grupo: 'inicio', depois: 'pendencias', colecoes: COLS, render });
  H.briefSemanal = { calcula, texto, acao: (R) => acao(R || calcula()) };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-brief-sem],[data-brief-copia]'); if (!b) return;
    if (b.dataset.briefSem != null) { E.parcial = b.dataset.briefSem === '1'; H.pede(); return; }
    if (b.dataset.briefCopia) copia();
  });
})();
