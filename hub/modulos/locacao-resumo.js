// modulos/locacao-resumo.js — Locação › Resumo (construção "locacao-resumo", 26/10/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Pedido do Cleiton (26/10/2026): "saber, de uma forma mais simples e objetiva, quantos imóveis
// temos locados, quanto estamos recebendo em taxa de administração mensal, quais os provisionamentos para as taxas de intermediação
// e valores gerais que entram para a imobiliária". Decisões dele no mesmo dia:
// • Aba nova no topo da Locação (primeira aba da área; a ordem é do núcleo, ORDEM_ABAS.locacao).
// • Provisão de intermediação = só o já contratado: parcelas ainda não retidas + contratos assinados sem repasse.
// • Valores brutos e líquidos lado a lado: bruto = o que entra na conta da Vivere; líquido = parte da imobiliária depois do % dos
//   corretores e da nota fiscal, quando a planilha V. Claude registra (parte_imob da aba REPASSES ALUDE INT).
// • Entradas = administração + intermediação + comissões Sigafy (seguros e títulos). Vendas saíram em 26/10/2026 (v3, decisão do Cleiton):
//   o Resumo da locação mostra só o que é da locação; contratos de venda ficam no Financeiro › Vendas.
// Só leitura: não grava em coleção nenhuma.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl = H.brl, brl0 = H.brl0;
  // padrão de todo o HUB (26/10/2026): receita "+" em verde e desconto/despesa "−" em vermelho, no texto e no fundo (classes vmais/vmenos do núcleo)
  const mais = H.mais || ((v, f) => (f || brl)(v)); const vm = (v, f) => `<span class="vmais">${mais(v, f)}</span>`;
  const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
  const hoje = () => H.hojeISO(); const mesAtual = () => hoje().slice(0, 7);
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mesTxt = (s) => { if (!s) return '—'; const [y, m] = String(s).split('-'); const n = MESES[+m - 1]; return n ? `${n}/${y.slice(2)}` : s; };
  const ordCod = (a, b) => { const p = (x) => [String(x)[0] === 'T' ? 1 : 0, parseInt(String(x).slice(1), 10) || 0]; const [x1, x2] = p(a), [y1, y2] = p(b); return x1 - y1 || x2 - y2; };

  // ------------------------------------------------------------ leitura dos dados
  const pl = (c) => (c && c.planilha) || {}; const al = (c) => (c && c.alude) || {};
  const campo = (c, k) => (pl(c)[k] != null ? pl(c)[k] : al(c)[k]);
  const ativo = (c) => (typeof H.contratoAtivo === 'function' ? H.contratoAtivo(c) : campo(c, 'status') !== 'encerrado');
  const temporada = (c) => String(c._id || '').startsWith('T') || /temporada/i.test(String(campo(c, 'tipo') || ''));
  const aluguel = (c) => Number(campo(c, 'aluguel_contrato') ?? campo(c, 'aluguel')) || 0;
  // 15/11/2026 (hub #16): regra única do núcleo (H.taxaAdm), a mesma do Financeiro
  function taxa(c) { if (typeof H.taxaAdm === 'function') return H.taxaAdm(c); if (temporada(c)) return 0; const t = pl(c).taxa_adm; if (t != null) return Number(t);
    const e = (H.params().taxas_especiais || {})[c._id]; return e != null ? Number(e) : 0.10; }
  const admMes = (c) => r2(aluguel(c) * taxa(c));
  // 26/10/2026 (pedido do Cleiton): endereço do imóvel, locador e locatário nas tabelas. Endereço curto do Alude; sem ele, o do contrato.
  const endereco = (c) => String(al(c).endereco || pl(c).endereco || '');
  const bairro = (c) => String(al(c).bairro || '');
  const imovelHtml = (c) => { const t = endereco(c); if (!t) return '—'; const I = window.HUB_IMOVEIS;
    let h = esc(t); try { if (I && typeof I.html === 'function') h = I.html(t, { fonte: 'contrato', cod: c._id }) || h; } catch (e) {}
    return h + (bairro(c) ? `<span class="s">${esc(bairro(c))}</span>` : ''); };
  const pessoaHtml = (nome, c, papel) => { if (!nome) return '—'; const P = window.HUB_PESSOAS;
    try { if (P && typeof P.html === 'function') return P.html(String(nome), { fonte: 'contrato', cod: c._id, papel }) || esc(nome); } catch (e) {}
    return esc(nome); };
  const partesHtml = (c) => `${pessoaHtml(campo(c, 'locador'), c, 'locador')}<span class="s">locatário: ${pessoaHtml(campo(c, 'locatario'), c, 'locatario')}</span>`;
  const emVigor = (c) => { const i = campo(c, 'inicio'); return !i || i <= hoje(); };
  const itensInt = () => ((((H.S.recebimentos_cleiton || {}).repasses_int) || {}).itens) || [];
  // fator líquido/bruto da intermediação de um contrato: o da planilha (parte_imob ÷ valor); sem itens, nota e % do contrato
  function fatorInt(c) {
    const it = itensInt().filter((x) => x.cod === c._id && Number(x.valor) > 0 && x.parte_imob != null);
    if (it.length) return it.reduce((t, x) => t + Number(x.parte_imob), 0) / it.reduce((t, x) => t + Number(x.valor), 0);
    const i = pl(c).intermediacao || {}; const cor = pl(c).corretores || {};
    const semNota = i.valor_bruto && i.liquido != null ? Number(i.liquido) / Number(i.valor_bruto) : 1;
    return semNota * (cor.imob_pct != null ? Number(cor.imob_pct) : 1);
  }
  // previsão de um item ainda não retido: boleto do Alude que traz a parcela; sem ele, o início do contrato
  function previsao(cod, it, c) {
    const rep = H.lista('repasses').filter((r) => r.cod === cod && r.intermediacao && r.status !== 'pago' && Math.abs(Number(r.intermediacao.valor) - Number(it.valor)) < 0.02)
      .sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento)))[0];
    if (rep) return { data: rep.vencimento, como: 'boleto do Alude (retido no repasse)' };
    // locação fora do Alude com cronograma (A10): a data da intermediação vem do contrato de administração
    const cr = ((H.S['locacao-resumo_cronogramas'] || {})[cod] || {}).honorarios || []; const hi = cr.find((h) => h.tipo === 'int');
    if (hi) return { data: hi.venc, como: 'fora do Alude · locador paga por Pix' + (hi.obs ? ' (' + hi.obs + ')' : '') };
    const i = campo(c, 'inicio'); return { data: i && i > hoje() ? i : null, como: /fora do alude/i.test(it.origem || '') ? 'fora do Alude (o locador repassa)' : (it.origem || '') };
  }
  // bruto → líquido da intermediação (26/10/2026, v7 — pedido do Cleiton: deixar claro o que separa o bruto do líquido).
  // % da nota e % dos corretores: os da parcela na planilha (REPASSES ALUDE INT); sem parcela, os do contrato (LOCAÇÕES: nota ÷ bruto e 1 − % imob.)
  const cap = (t) => String(t || '').toLowerCase().replace(/(^|\s)\S/g, (a) => a.toUpperCase());
  function descontos(c, x) {
    const i = pl(c).intermediacao || {}; const cor = pl(c).corretores || {};
    const nota = x && x.nota != null ? Number(x.nota) : (i.valor_bruto && i.nota != null ? Number(i.nota) / Number(i.valor_bruto) : 0);
    const corr = x && x.pct_corretores != null ? Number(x.pct_corretores) : (cor.imob_pct != null ? 1 - Number(cor.imob_pct) : 0);
    const quem = [...new Set([cor.agenciador, cor.fechador].filter(Boolean).map(cap))].join(' e ');
    return { nota, corr, quem };
  }
  const separa = (bruto, d, liquido) => { const notaV = r2(bruto * d.nota); const corrV = liquido != null ? r2(bruto - notaV - liquido) : r2((bruto - notaV) * d.corr);
    return { notaV, corrV, liquido: liquido != null ? r2(liquido) : r2(bruto - notaV - corrV) }; };
  function intermediacao(c) {
    const total = Number((pl(c).intermediacao || {}).valor_bruto) || 0; const f = fatorInt(c);
    const it = itensInt().filter((x) => x.cod === c._id);
    const recebida = it.filter((x) => x.retencao || x.recebido_em); const aberta = it.filter((x) => !(x.retencao || x.recebido_em));
    const somaIt = it.reduce((t, x) => t + (Number(x.valor) || 0), 0);
    const prov = aberta.map((x) => { const d = descontos(c, x); const b = r2(x.valor);
      return { cod: c._id, parcela: x.parcela || '', bruto: b, ...separa(b, d, x.parte_imob != null ? Number(x.parte_imob) : null), notaPct: d.nota, corrPct: d.corr, quem: d.quem, terco: x.terco != null ? r2(x.terco) : null, ...previsao(c._id, x, c) }; });
    const resto = r2(total - somaIt); // parte do contrato que a planilha ainda não desdobrou em parcelas
    if (resto > 0.01 && ativo(c)) { const d = descontos(c); prov.push({ cod: c._id, parcela: 'saldo', bruto: resto, ...separa(resto, d), notaPct: d.nota, corrPct: d.corr, quem: d.quem, terco: null, data: campo(c, 'inicio') > hoje() ? campo(c, 'inicio') : null, como: 'ainda sem parcela na planilha' }); }
    return { total, recebida: r2(recebida.reduce((t, x) => t + (Number(x.valor) || 0), 0)), aReceber: r2(prov.reduce((t, x) => t + x.bruto, 0)), prov, fator: f };
  }

  // ------------------------------------------------------------ locações fora do Alude: cronograma do contrato (26/10/2026, v5)
  // Pedido do Cleiton: deixar clara a locação da Micheline (A9), paga por fora do Alude. O cronograma vem dos contratos e fica em
  // locacao-resumo_cronogramas/<cód> (coleção deste módulo); a situação de cada honorário vem da planilha V. Claude (REPASSES ALUDE
  // ADM pela competência; INT pela retenção). O aluguel antecipado vai direto aos locadores: a Vivere não o recebe nem o confere.
  const CRON = 'locacao-resumo_cronogramas';
  const dtc = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}` : '—'); // data curta, para caber no celular
  const pill = (txt, cls) => `<span class="pill ${cls || ''}">${esc(txt)}</span>`;
  function situacaoHon(cod, h) {
    if (h.tipo === 'int') { const it = itensInt().find((x) => x.cod === cod && (x.retencao || x.recebido_em));
      if (it) return { ok: true, data: it.retencao || it.recebido_em }; }
    else { const rc = H.S.recebimentos_cleiton || {}; const a = (((rc.repasses_adm || {}).itens) || []).find((x) => x.cod === cod && x.mes === h.comp && /pago/i.test(String(x.situacao || '')));
      if (a) return { ok: true, data: a.repasse || a.recebido_em || a.pago_locatario }; }
    return { ok: false, vencida: h.venc < hoje() };
  }

  // ------------------------------------------------------------ administração provisionada para o próximo mês (26/10/2026, v8)
  // Pedido do Cleiton: ao lado da intermediação provisionada, a adm. que deve entrar no mês seguinte. Valor = aluguel do contrato × taxa
  // (o mesmo da planilha V. Claude; o Alude às vezes mostra outro, que aparece como aviso). Fontes: boletos do Alude em aberto que vencem
  // no mês e, nas locações fora do Alude, as parcelas de adm. do cronograma do contrato. Boletos já vencidos e não pagos vêm à parte.
  const proxMes = () => { const [y, m] = mesAtual().split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };
  function admProvisionada(atv) {
    const alvo = proxMes(); const L = []; const sem = [];
    const crs = H.S[CRON] || {};
    atv.forEach((c) => {
      const cod = c._id; const cr = crs[cod]; const ad = admMes(c); let achou = false;
      if (cr) {
        (cr.honorarios || []).filter((h) => h.tipo === 'adm' && !situacaoHon(cod, h).ok).forEach((h) => {
          if (String(h.venc).slice(0, 7) === alvo) { L.push({ c, cod, data: h.venc, como: 'Pix do locador (fora do Alude)', ref: h.rot, bruto: r2(h.valor) }); achou = true; }
          else if (h.venc < hoje()) { L.push({ c, cod, data: h.venc, como: 'Pix do locador (fora do Alude)', ref: h.rot, bruto: r2(h.valor), atraso: true }); achou = true; } });
        if (!achou) { const prox = (cr.honorarios || []).filter((h) => h.tipo === 'adm' && !situacaoHon(cod, h).ok && h.venc > hoje()).sort((a, b) => String(a.venc).localeCompare(String(b.venc)))[0];
          // 26/10/2026 (v9, pedido do Cleiton): a locação aparece mesmo sem adm. no mês, com o motivo e a próxima parcela
          L.push({ c, cod, data: prox ? prox.venc : null, como: 'Pix do locador', ref: 'nada vence em ' + mesTxt(alvo), bruto: 0, zero: true, prox, motivo: cr.motivo_sem_adm || '' }); }
        return;
      }
      H.lista('repasses').filter((r) => r.cod === cod && r.status !== 'pago' && r.vencimento).forEach((r) => {
        const noMes = String(r.vencimento).slice(0, 7) === alvo, atraso = r.vencimento < hoje();
        if (!noMes && !atraso) return; achou = true;
        L.push({ c, cod, data: r.vencimento, como: 'boleto do Alude (retido no repasse)', ref: 'competência ' + mesTxt(r.competencia), bruto: ad || r2(r.taxa_adm_alude), alude: Math.abs((Number(r.taxa_adm_alude) || 0) - ad) > 1 ? Number(r.taxa_adm_alude) : null, atraso: atraso && !noMes });
      });
      if (!achou && ad > 0) L.push({ c, cod, data: null, como: 'boleto do Alude', ref: emVigor(c) ? 'sem boleto em aberto no mês' : 'começa em ' + dt(campo(c, 'inicio')), bruto: 0, zero: true });
    });
    return { alvo, L, sem };
  }

  function cronogramas() {
    const L = H.lista(CRON).sort((a, b) => ordCod(a._id, b._id)); if (!L.length) return '';
    return L.map((cr) => {
      const cod = cr._id; const c = { ...((H.S.contratos_locacao || {})[cod] || {}), _id: cod };
      const HON = (cr.honorarios || []).map((h) => ({ ...h, st: situacaoHon(cod, h) }));
      const intPaga = HON.some((h) => h.tipo === 'int' && h.st.ok);
      // aluguel pago: pela adm. da mesma competência já recebida (A10: o pagamento da adm. vale como aviso do aluguel) ou, sem competência,
      // 1ª parcela quitada quando a intermediação já foi paga (A9: honorários vencem 24 h depois da 1ª parcela)
      const admOk = (comp) => HON.some((h) => h.tipo === 'adm' && h.comp === comp && h.st.ok);
      const ALG = (cr.aluguel_antecipado || []).map((a, i) => ({ ...a, i, st: (a.pago_em || (a.comp ? admOk(a.comp) : i === 0 && intPaga)) ? 'paga' : a.venc > hoje() ? 'a vencer' : 'confirmar' }));
      const rec = r2(HON.filter((h) => h.st.ok).reduce((t, h) => t + (Number(h.valor) || 0), 0)), arec = r2(HON.filter((h) => !h.st.ok).reduce((t, h) => t + (Number(h.valor) || 0), 0));
      const nAr = HON.filter((h) => !h.st.ok).length;
      const tA = 'ca-' + cod, tH = 'ch-' + cod;
      const colsA = [['venc', 'Vencimento'], ['valor', 'Valor']], colsH = [['venc', 'Vencimento'], ['valor', 'Valor']];
      const stA = (a) => a.st === 'paga' ? (a.pago_em ? pill('paga em ' + dt(a.pago_em), 'ok') + (a.obs ? `<span class="s">${esc(a.obs)}</span>` : '') : pill('paga', 'ok') + `<span class="s">${a.comp ? 'a adm. do mês já foi paga à Vivere' : 'os locadores pagaram os honorários da Vivere'}</span>`) : a.st === 'a vencer' ? pill('a vencer', 'info') : pill('confirmar o pagamento', 'warn');
      const stH = (h) => h.st.ok ? pill('recebida em ' + dt(h.st.data), 'ok') : h.st.vencida ? pill('vencida', 'bad') : pill('a receber', 'info');
      const totA = (cr.aluguel_antecipado || []).reduce((t, a) => t + (Number(a.valor) || 0), 0);
      const tabA = `${linhaOrd(tA, colsA)}<div class="tabela"><table class="lr-tab"><thead><tr><th>Parcela · situação</th>${th(tA, 'venc', 'Venc.')}${th(tA, 'valor', 'Valor', true)}</tr></thead><tbody>${ordena(tA, ALG, (x, k) => x[k]).map((a) => `<tr><td class="lr-st">${esc(a.n)}<br>${stA(a)}</td><td>${dtc(a.venc)}</td><td class="n">${brl(a.valor)}</td></tr>`).join('')}</tbody><tfoot><tr><td>${esc(cr.total_rot || '12 meses')}</td><td></td><td class="n">${brl(totA)}</td></tr></tfoot></table></div>`;
      const tabH = `${linhaOrd(tH, colsH)}<div class="tabela"><table class="lr-tab"><thead><tr><th>Honorário · situação</th>${th(tH, 'venc', 'Venc.')}${th(tH, 'valor', 'Valor', true)}</tr></thead><tbody>${ordena(tH, HON, (x, k) => x[k]).map((h) => `<tr><td class="lr-st">${esc(h.rot)}${h.obs ? `<span class="s">${esc(h.obs)}</span>` : ''}<br>${stH(h)}</td><td>${dtc(h.venc)}</td><td class="n lr-mais">${mais(h.valor)}</td></tr>`).join('')}</tbody><tfoot><tr><td>recebido ${brl(rec)}<span class="s">a receber ${brl(arec)}</span></td><td></td><td class="n lr-mais">${mais(r2(rec + arec))}</td></tr></tfoot></table></div>`;
      return `<div class="card lr-cron" id="lr-cron-${esc(cod)}"><div class="lr-cron-cab"><button class="lk cod" data-lr-car="${esc(cod)}" title="Abrir na Carteira">${esc(cod)}</button> <b>${esc(cr.titulo || cod)}</b></div>
        <p class="lr-cron-res">${esc(cr.resumo || '')}</p>
        <div class="lr-cron-kpi"><span><b>${brl0(rec)}</b> já recebido pela Vivere</span><span><b>${brl0(arec)}</b> a receber${nAr ? ` (${nAr} parcela${nAr > 1 ? 's' : ''})` : ''}</span></div>
        <div class="lr-cron-grade"><div><h3>${esc(cr.titulo_aluguel || '1. Aluguel antecipado — locatária → locadores')}</h3><p class="nota">${esc(cr.nota_aluguel || 'Direto na conta dos locadores; não passa pela Vivere nem pelo Alude.')}</p>${tabA}</div>
        <div><h3>${esc(cr.titulo_honorarios || '2. Honorários da Vivere — locador → Vivere (Pix)')}</h3><p class="nota">Situação conforme a planilha V. Claude.</p>${tabH}</div></div>
        <p class="nota" style="margin:10px 0 0">${esc(cr.depois || '')}</p><p class="nota" style="margin:4px 0 0">Fonte: ${esc(cr.fonte || '')}</p></div>`;
    }).join('');
  }

  const sigafy = () => H.lista('financeiro_lancamentos').filter((x) => x.natureza === 'entrada' && x.situacao === 'pago' && /comiss/i.test(String(x.categoria || '')));

  // Entradas da locação, uma a uma, com a origem (26/10/2026, v4 — pedido do Cleiton: contar e mostrar o que foi pago e repassado por fora
  // do Alude). Mesma regra do consolidar.py (receita_mensal): planilha V. Claude primeiro (REPASSES ALUDE ADM e INT, que registram o pago
  // por fora); o Alude só entra no mês que a planilha não tem. Por fora = situação "fora" na aba ADM ou origem "Fora do Alude" na aba INT.
  function lancamentos() {
    const L = []; const rc = H.S.recebimentos_cleiton || {};
    const adm = ((rc.repasses_adm || {}).itens) || []; const chaves = new Set(adm.map((x) => x.cod + '|' + x.mes));
    adm.forEach((x) => { if (!/pago/i.test(String(x.situacao || ''))) return; const d = x.repasse || x.pago_locatario || x.recebido_em;
      if (d && x.adm_efetiva != null) L.push({ cod: x.cod, mes: d.slice(0, 7), tipo: 'adm', valor: Number(x.adm_efetiva) || 0, fora: /fora/i.test(String(x.situacao || '')), ref: x.mes }); });
    H.lista('repasses').forEach((r) => { if (r.status === 'pago' && r.pago_em && !chaves.has(r.cod + '|' + r.competencia))
      L.push({ cod: r.cod, mes: r.pago_em.slice(0, 7), tipo: 'adm', valor: Number(r.taxa_adm_alude) || 0, fora: false, ref: r.competencia }); });
    const it = itensInt(); const codsInt = new Set(it.map((x) => x.cod));
    it.forEach((x) => { if (x.retencao) L.push({ cod: x.cod, mes: x.retencao.slice(0, 7), tipo: 'int', valor: Number(x.valor) || 0, fora: /fora do alude/i.test(String(x.origem || '')), ref: x.parcela || '', it: x }); });
    H.lista('repasses').forEach((r) => { const i = r.intermediacao; if (i && r.status === 'pago' && r.pago_em && !codsInt.has(r.cod))
      L.push({ cod: r.cod, mes: r.pago_em.slice(0, 7), tipo: 'int', valor: Number(i.valor) || 0, fora: false, ref: `${i.parcela || 1}/${i.de || 1}` }); });
    return L;
  }

  function entradasPorMes() {
    const M = {}; const m = (k) => (M[k] = M[k] || { mes: k, adm: 0, int: 0, intL: 0, nota: 0, corr: 0, sig: 0, fora: 0, foraCods: new Set() });
    const C = H.S.contratos_locacao || {};
    lancamentos().forEach((l) => { const x = m(l.mes);
      if (l.tipo === 'adm') x.adm += l.valor; else { const c = { ...(C[l.cod] || {}), _id: l.cod }; const sp = separa(l.valor, descontos(c, l.it), l.it && l.it.parte_imob != null ? Number(l.it.parte_imob) : null);
        x.int += l.valor; x.nota += sp.notaV; x.corr += sp.corrV; x.intL += sp.liquido; }
      if (l.fora) { x.fora += l.valor; x.foraCods.add(l.cod); } });
    sigafy().forEach((s) => { const k = String(s.pago_em || s.vencimento || '').slice(0, 7); if (k) m(k).sig += Number(s.valor) || 0; });
    m(mesAtual());
    return Object.values(M).filter((x) => x.mes <= mesAtual()).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6)
      .map((x) => ({ ...x, bruto: r2(x.adm + x.int + x.sig), nota: r2(x.nota), corr: r2(x.corr), liquido: r2(x.adm + x.intL + x.sig) }));
  }

  // ------------------------------------------------------------ ordenação por clique no cabeçalho
  const ORD = {}; // {tabela: {k, dir}}
  const prox = (o, k) => (!o || o.k !== k ? { k, dir: 'desc' } : o.dir === 'desc' ? { k, dir: 'asc' } : null);
  const th = (t, k, rot, n) => { const o = ORD[t]; const d = o && o.k === k ? o.dir : '';
    return `<th class="ord${n ? ' n' : ''}" data-lr-ord="${t}:${k}" tabindex="0" role="button"${d ? ` data-dir="${d}" aria-sort="${d === 'asc' ? 'ascending' : 'descending'}"` : ''} title="Ordenar: 1º clique maior → menor, 2º menor → maior, 3º volta à ordem original">${rot}</th>`; };
  function ordena(t, L, get) { const o = ORD[t]; if (!o) return L; const s = o.dir === 'asc' ? 1 : -1;
    return L.slice().sort((a, b) => { const x = get(a, o.k), y = get(b, o.k); const vx = x == null || x === '', vy = y == null || y === '';
      if (vx || vy) return vx && vy ? 0 : vx ? 1 : -1; // sem valor vai sempre para o fim
      if (o.k === 'cod') return s * ordCod(x, y);
      return typeof x === 'number' && typeof y === 'number' ? s * (x - y) : s * String(x).localeCompare(String(y), 'pt-BR'); }); }
  // no celular o cabeçalho rola junto com a tabela: a mesma ordenação fica também numa linha "ordenar por" acima dela
  const linhaOrd = (t, cols) => `<div class="lr-ordpor" role="group" aria-label="Ordenar a tabela"><span>Ordenar por</span>${cols.map(([k, rot]) => { const o = ORD[t]; const d = o && o.k === k ? (o.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕';
    return `<button class="btn" data-lr-ord="${t}:${k}" aria-pressed="${!!(o && o.k === k)}">${rot}${d}</button>`; }).join('')}</div>`;
  if (!window.__lrOrd) { window.__lrOrd = true;
    const clique = (el) => { const [t, k] = el.dataset.lrOrd.split(':'); ORD[t] = prox(ORD[t], k); if (!ORD[t]) delete ORD[t]; H.pede(); };
    document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-lr-ord]'); if (b) { e.preventDefault(); clique(b); return; }
      const cr = e.target.closest && e.target.closest('[data-lr-cron]'); if (cr) { e.preventDefault(); const el = document.getElementById('lr-cron-' + cr.dataset.lrCron); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
      const c = e.target.closest && e.target.closest('[data-lr-car]'); if (c && typeof H.irPara === 'function') { e.preventDefault(); H.irPara('carteira', 'car-' + c.dataset.lrCar); } });
    document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('th[data-lr-ord]')) { e.preventDefault(); clique(e.target); } });
  }

  // ------------------------------------------------------------ desenho
  const ESTILO = `<style id="lr-estilo">
  .lr-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 18px}
  @media (max-width:900px){.lr-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media (max-width:420px){.lr-cards{grid-template-columns:1fr}}
  .lr-card .rot{font-family:var(--display);text-transform:uppercase;letter-spacing:.16em;font-size:11px;color:var(--muted)}
  .lr-card .num{font-family:var(--display);font-size:30px;line-height:1.15;margin:6px 0 2px}
  .lr-card .liq{font-size:13px;color:var(--ink)} .lr-card .liq b{font-weight:600}
  .lr-card .sub{font-size:12px;color:var(--muted);margin-top:6px;line-height:1.45}
  .lr-card .meter{margin:6px 0}
  .lr-ordpor{display:none;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px;font-size:12px;color:var(--muted)}
  .lr-ordpor .btn{padding:4px 9px;font-size:12px}
  @media (max-width:700px){.lr-ordpor{display:flex}}
  h2.lr-sec{margin:30px 0 8px}
  .lr-tab td.n,.lr-tab th.n{text-align:right;white-space:nowrap}
  .lr-tab tfoot td{font-weight:600;border-top:2px solid var(--line)}
  .lr-tab .s{display:block;font-size:11px;color:var(--muted)}
  .lr-tab td:first-child{white-space:nowrap}
  .lr-tab td.lr-menos{color:var(--bad);background:var(--bad-bg);font-weight:600} .lr-tab td.lr-menos .s{color:var(--muted);font-weight:400} .lr-tab td.lr-l,.lr-tab td.lr-mais{color:var(--ok);background:var(--ok-bg);font-weight:600} .lr-tab td.lr-l b{color:var(--ok)} .lr-tab td.lr-mais .s,.lr-tab td.lr-l .s{color:var(--muted);font-weight:400}
  .lr-ler{margin:4px 0 12px;font-size:13px;line-height:1.5} .lr-ler ol{margin:6px 0 0;padding-left:20px} .lr-ler li{margin:2px 0} .lr-ler .eq{font-family:var(--display);letter-spacing:.04em}
  .lr-tab td.lr-ap{white-space:normal;min-width:150px;max-width:230px} .lr-tab td.lr-ap b{white-space:nowrap}
  h3.lr-sub{font-family:var(--display);font-weight:500;font-size:12px;letter-spacing:.16em;text-transform:uppercase;margin:22px 0 4px;color:var(--ink)}
  .lr-cron{margin:0 0 14px} .lr-cron-cab{display:flex;gap:8px;align-items:center;font-size:15px} .lr-cron-res{margin:8px 0;font-size:13px;line-height:1.5}
  .lr-cron-kpi{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0 0 12px;font-size:13px} .lr-cron-kpi b{font-family:var(--display);font-size:20px;font-weight:400;margin-right:4px}
  .lr-cron-grade{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:14px} @media (max-width:800px){.lr-cron-grade{grid-template-columns:minmax(0,1fr)}} .lr-cron-grade>div{min-width:0}
  .lr-tab td.lr-st{white-space:normal} .lr-tab td.lr-st .pill{margin-top:3px;white-space:normal}
  .lr-cron .lr-tab th{white-space:normal} @media (max-width:480px){.lr-cron{padding:12px 10px}.lr-cron .lr-tab td,.lr-cron .lr-tab th{padding:7px 6px}}
  .lr-cron h3{font-family:var(--display);font-weight:500;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 2px}
  .lr-tab td.lr-txt{min-width:170px;max-width:280px}
  .lr-tab td.lr-fora .s{white-space:normal;max-width:120px;margin-left:auto}
  </style>`;
  const card = (rot, num, liq, sub, alvo) => `<button class="kpi lr-card" ${alvo ? `data-aba="${alvo}"` : ''} style="cursor:${alvo ? 'pointer' : 'default'}"><span class="rot">${rot}</span><span class="num">${num}</span>${liq ? `<span class="liq">${liq}</span>` : ''}<span class="sub">${sub}</span></button>`;

  function render() {
    const C = H.lista('contratos_locacao'); if (!C.length) return `<h2>Resumo da locação</h2>` + H.vazio(H.carregado.contratos_locacao ? 'Nenhum contrato de locação.' : 'Carregando…');
    const p = H.params(); const meta = p.meta_locacao || 40;
    const atv = C.filter(ativo).sort((a, b) => ordCod(a._id, b._id));
    const vig = atv.filter(emVigor), futuros = atv.filter((c) => !emVigor(c)).sort((a, b) => String(campo(a, 'inicio')).localeCompare(String(campo(b, 'inicio'))));
    const nA = atv.filter((c) => !temporada(c)).length, nT = atv.length - nA;
    const admCarteira = r2(atv.reduce((t, c) => t + admMes(c), 0)), admVig = r2(vig.reduce((t, c) => t + admMes(c), 0));
    const INT = atv.concat(C.filter((c) => !ativo(c))).map((c) => ({ c, i: intermediacao(c) }));
    const PROV = INT.flatMap((x) => x.i.prov).sort((a, b) => String(a.data || '9999').localeCompare(String(b.data || '9999')));
    const provB = r2(PROV.reduce((t, x) => t + x.bruto, 0)), provL = r2(PROV.reduce((t, x) => t + x.liquido, 0));
    const EM = entradasPorMes(); const cur = EM.find((x) => x.mes === mesAtual()) || { adm: 0, int: 0, sig: 0, fora: 0, foraCods: new Set(), bruto: 0, liquido: 0 };
    const rm = (H.S.receita_mensal || {})[mesAtual()] || {};

    const cards = [
      card('Imóveis locados', `${atv.length}<span style="font-size:16px;color:var(--muted)"> / ${meta}</span>`, '',
        `<div class="meter" role="img" aria-label="${atv.length} de ${meta}"><b style="width:${Math.min(100, atv.length / meta * 100)}%"></b></div>${vig.length} em vigor${futuros.length ? ` · começa${futuros.length > 1 ? 'm' : ''}: ${futuros.map((c) => `${esc(c._id)} em ${dt(campo(c, 'inicio'))}`).join(', ')}` : ''}<br>${nA} anua${nA === 1 ? 'l' : 'is'}${nT ? ` · ${nT} temporada` : ''} · faltam ${Math.max(0, meta - atv.length)} até ${dt(p.meta_prazo)}`, 'carteira'),
      card('Taxa de adm. por mês', vm(admCarteira, brl0), `líquido <b>${brl0(admCarteira)}</b> · sem parte de corretor`,
        `carteira inteira (${atv.filter((c) => admMes(c) > 0).length} contratos)<br>em vigor hoje: ${brl0(admVig)}${rm.adm != null ? ` · retida em ${mesTxt(mesAtual())}: ${brl0(rm.adm)}` : ''}`, 'receita'),
      card('Intermediação a receber', vm(provB, brl0), `líquido <b>${brl0(provL)}</b>`,
        PROV.length ? `${PROV.length} parcela${PROV.length > 1 ? 's' : ''} já contratada${PROV.length > 1 ? 's' : ''}: ${PROV.map((x) => `${esc(x.cod)}${x.data ? ' ' + mesTxt(x.data.slice(0, 7)) : ''}`).join(' · ')}` : 'nada a receber: tudo já retido', ''),
      card(`Entradas em ${mesTxt(mesAtual())}`, vm(cur.bruto, brl0), `líquido <b>${brl0(cur.liquido)}</b>`,
        `adm. ${brl0(cur.adm)} · interm. ${brl0(cur.int)}<br>Sigafy ${brl0(cur.sig)}${cur.fora ? `<br>por fora do Alude: ${brl0(cur.fora)} (${[...cur.foraCods].sort(ordCod).join(', ')})` : ''}`, 'receita'),
    ].join('');

    // entradas por mês
    const pctTxt = (v) => (Math.round(v * 1000) / 10).toLocaleString('pt-BR') + '%';
    const ex = cur.int ? { b: cur.int, n: cur.nota, c: cur.corr, l: r2(cur.int - cur.nota - cur.corr) } : null;
    const COMO_LER = `<div class="card lr-ler"><b>Como ler bruto e líquido</b><ol>
      <li><b>Bruto</b> = tudo o que entra na conta da Vivere no mês: administração + intermediação + comissões Sigafy.</li>
      <li><b>− Nota</b> = imposto da nota fiscal emitida sobre a intermediação (12% nos contratos novos; nos antigos a planilha não registra nota).</li>
      <li><b>− Corretores</b> = parte do agenciador e do fechador na intermediação (o % de cada contrato, já descontada a nota).</li>
      <li><b>Líquido</b> = o que fica para a imobiliária: <span class="eq">bruto − nota − corretores</span>. A administração e o Sigafy entram iguais nos dois; o líquido ainda inclui o 1/3 que a imobiliária repassa ao Jurídico.</li></ol>
      ${ex ? `<p class="nota" style="margin:6px 0 0">Exemplo de ${mesTxt(mesAtual())}: intermediação ${brl(ex.b)} − nota ${brl(ex.n)} − corretores ${brl(ex.c)} = ${brl(ex.l)} para a imobiliária.</p>` : ''}</div>`;
    const colsEM = [['mes', 'Mês'], ['adm', 'Adm.'], ['int', 'Interm.'], ['sig', 'Sigafy'], ['fora', 'Por fora do Alude'], ['bruto', 'Bruto'], ['nota', '− Nota'], ['corr', '− Corretores'], ['liquido', 'Líquido']];
    const EMo = ordena('em', EM.slice().reverse(), (x, k) => x[k]);
    const tot = (k) => r2(EM.reduce((t, x) => t + (x[k] || 0), 0));
    const tabEM = `${linhaOrd('em', colsEM)}<div class="tabela"><table class="lr-tab"><thead><tr>${colsEM.map(([k, r], i) => th('em', k, r, i > 0)).join('')}</tr></thead><tbody>${EMo.map((x) => `<tr><td>${mesTxt(x.mes)}</td><td class="n ${x.adm ? 'lr-mais' : ''}">${x.adm ? mais(x.adm) : '—'}</td><td class="n ${x.int ? 'lr-mais' : ''}">${x.int ? mais(x.int) : '—'}</td><td class="n ${x.sig ? 'lr-mais' : ''}">${x.sig ? mais(x.sig) : '—'}</td><td class="n">${x.fora ? brl(x.fora) : '—'}${x.fora ? `<span class="s">${esc([...x.foraCods].sort(ordCod).join(', '))}</span>` : ''}</td><td class="n lr-mais"><b>${mais(x.bruto)}</b></td><td class="n lr-menos">${x.nota ? '− ' + brl(x.nota) : '—'}</td><td class="n lr-menos">${x.corr ? '− ' + brl(x.corr) : '—'}</td><td class="n lr-l"><b>${mais(x.liquido)}</b></td></tr>`).join('')}</tbody>
      <tfoot><tr><td>${EM.length} meses</td><td class="n lr-mais">${mais(tot('adm'))}</td><td class="n lr-mais">${mais(tot('int'))}</td><td class="n lr-mais">${mais(tot('sig'))}</td><td class="n">${brl(tot('fora'))}</td><td class="n lr-mais">${mais(tot('bruto'))}</td><td class="n lr-menos">− ${brl(tot('nota'))}</td><td class="n lr-menos">− ${brl(tot('corr'))}</td><td class="n lr-l">${mais(tot('liquido'))}</td></tr></tfoot></table></div>`;

    // provisão de intermediação
    const colsPR = [['cod', 'Locação'], ['end', 'Imóvel'], ['locador', 'Locador / locatário'], ['data', 'Previsão'], ['bruto', 'Bruto'], ['notaV', '− Nota'], ['corrV', '− Corretores'], ['liquido', 'Líquido']];
    const cDe = (cod) => ({ ...((H.S.contratos_locacao || {})[cod] || {}), _id: cod });
    const PRo = ordena('pr', PROV, (x, k) => k === 'end' ? endereco(cDe(x.cod)) : k === 'locador' ? String(campo(cDe(x.cod), 'locador') || '') : x[k]);
    const AP = admProvisionada(atv);
    const foraAlude = (x) => !!(H.S[CRON] || {})[x.cod] || !!pl(x.c).fora_alude;
    const colsAP = [['cod', 'Locação'], ['end', 'Imóvel'], ['locador', 'Locador / locatário'], ['alude', 'Alude'], ['data', 'Previsão'], ['bruto', 'Adm. (bruto = líquido)']];
    const APo = ordena('ap', AP.L, (x, k) => k === 'end' ? endereco(x.c) : k === 'locador' ? String(campo(x.c, 'locador') || '') : k === 'alude' ? (foraAlude(x) ? 'fora' : 'dentro') : x[k]);
    const apMes = r2(AP.L.filter((x) => !x.atraso).reduce((t, x) => t + x.bruto, 0)), apAtr = r2(AP.L.filter((x) => x.atraso).reduce((t, x) => t + x.bruto, 0));
    const tabAP = AP.L.length ? `${linhaOrd('ap', colsAP)}<div class="tabela"><table class="lr-tab"><thead><tr>${colsAP.map(([k, r], i) => th('ap', k, r, i > 4)).join('')}</tr></thead><tbody>${APo.map((x) => `<tr><td><button class="lk cod" data-lr-car="${esc(x.cod)}" title="Abrir na Carteira">${esc(x.cod)}</button><span class="s">${esc(x.ref || '')}</span></td><td class="lr-txt">${imovelHtml(x.c)}</td><td class="lr-txt">${partesHtml(x.c)}</td><td>${foraAlude(x) ? pill('fora do Alude', 'warn') : pill('dentro do Alude', 'info')}</td><td>${x.zero ? (x.prox ? `próxima em ${dt(x.prox.venc)}` : '—') : dt(x.data)}${x.atraso ? ' ' + pill('em atraso', 'bad') : ''}<span class="s">${esc(x.como)}</span></td><td class="n lr-ap ${x.zero ? '' : 'lr-l'}">${x.zero ? `R$ 0,00<span class="s">${esc(x.motivo || 'nada vence em ' + mesTxt(AP.alvo))}${x.prox ? ` · próxima: ${brl(x.prox.valor)}` : ''}</span>` : `<b>${mais(x.bruto)}</b>`}${x.alude ? `<span class="s">no boleto do Alude: ${brl(x.alude)}</span>` : ''}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>${AP.L.filter((x) => !x.zero).length} parcelas · ${new Set(AP.L.map((x) => x.cod)).size} locações</td><td></td><td></td><td></td><td>${apAtr ? `em atraso ${brl(apAtr)}` : ''}</td><td class="n lr-l">${mais(r2(apMes + apAtr))}<span class="s">${mesTxt(AP.alvo)}: ${brl(apMes)}</span></td></tr></tfoot></table></div>` : H.vazio('Nenhuma administração prevista para ' + mesTxt(AP.alvo) + '.');
    const tabPR = PROV.length ? `${linhaOrd('pr', colsPR)}<div class="tabela"><table class="lr-tab"><thead><tr>${colsPR.map(([k, r], i) => th('pr', k, r, i > 3)).join('')}</tr></thead><tbody>${PRo.map((x) => `<tr><td><button class="lk cod" data-lr-car="${esc(x.cod)}" title="Abrir na Carteira">${esc(x.cod)}</button><span class="s">parcela ${esc(x.parcela)}</span></td><td class="lr-txt">${imovelHtml(cDe(x.cod))}</td><td class="lr-txt">${partesHtml(cDe(x.cod))}</td><td>${x.data ? dt(x.data) : 'sem data'}<span class="s">${esc(x.como || '')}</span></td><td class="n lr-mais">${mais(x.bruto)}</td><td class="n lr-menos">${x.notaV ? '− ' + brl(x.notaV) : '—'}<span class="s">${x.notaPct ? pctTxt(x.notaPct) + ' de nota' : 'sem nota'}</span></td><td class="n lr-menos">${x.corrV ? '− ' + brl(x.corrV) : '—'}<span class="s">${x.corrPct ? pctTxt(x.corrPct) + (x.quem ? ' · ' + esc(x.quem) : '') : 'sem corretor'}</span></td><td class="n lr-l"><b>${mais(x.liquido)}</b>${x.terco ? `<span class="s">inclui 1/3 do Jurídico: ${brl(x.terco)}</span>` : ''}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>${PROV.length} parcela${PROV.length > 1 ? 's' : ''}</td><td></td><td></td><td></td><td class="n lr-mais">${mais(provB)}</td><td class="n lr-menos">− ${brl(r2(PROV.reduce((t, x) => t + x.notaV, 0)))}</td><td class="n lr-menos">− ${brl(r2(PROV.reduce((t, x) => t + x.corrV, 0)))}</td><td class="n lr-l">${mais(provL)}</td></tr></tfoot></table></div>` : H.vazio('Nenhuma intermediação contratada a receber.');

    // por imóvel locado
    const LF = lancamentos().filter((l) => l.fora);
    const linhas = atv.map((c) => { const i = (INT.find((x) => x.c === c) || {}).i || {}; const f = LF.filter((l) => l.cod === c._id);
      return { c, cod: c._id, end: endereco(c), locador: String(campo(c, 'locador') || ''), inicio: campo(c, 'inicio') || '', aluguel: aluguel(c), taxa: taxa(c), adm: admMes(c), it: i.total || 0, rec: i.recebida || 0, ar: i.aReceber || 0, fora: r2(f.reduce((t, l) => t + (Number(l.valor) || 0), 0)),
        foraTxt: [f.filter((l) => l.tipo === 'adm').map((l) => mesTxt(l.ref)).join(', '), f.filter((l) => l.tipo === 'int').map((l) => l.ref).join(', ')].map((t, k) => t ? (k ? 'interm. ' : 'adm. ') + t : '').filter(Boolean).join(' · ') }; });
    const colsIM = [['cod', 'Locação'], ['end', 'Imóvel'], ['locador', 'Locador / locatário'], ['inicio', 'Início'], ['aluguel', 'Aluguel'], ['adm', 'Adm./mês'], ['it', 'Interm.'], ['rec', 'Recebida'], ['ar', 'A receber'], ['fora', 'Por fora']];
    const IMo = ordena('im', linhas, (x, k) => x[k]);
    const tabIM = `${linhaOrd('im', colsIM)}<div class="tabela"><table class="lr-tab"><thead><tr>${colsIM.map(([k, r], i) => th('im', k, r, i > 3)).join('')}</tr></thead><tbody>${IMo.map((x) => `<tr><td><button class="lk cod" data-lr-car="${esc(x.cod)}" title="Abrir na Carteira">${esc(x.cod)}</button><span class="s">${temporada(x.c) ? 'temporada' : 'anual'}${emVigor(x.c) ? '' : ' · começa depois'}</span>${(H.S[CRON] || {})[x.cod] ? `<span class="s"><a href="#lr-cron-${esc(x.cod)}" data-lr-cron="${esc(x.cod)}">fora do Alude · ver como é paga</a></span>` : ''}</td><td class="lr-txt">${imovelHtml(x.c)}</td><td class="lr-txt">${partesHtml(x.c)}</td><td>${dt(x.inicio)}</td><td class="n">${brl(x.aluguel)}</td><td class="n ${x.taxa ? 'lr-mais' : ''}">${x.taxa ? mais(x.adm) : '—'}<span class="s">${x.taxa ? (x.taxa * 100).toLocaleString('pt-BR') + '%' : 'sem adm.'}</span></td><td class="n ${x.it ? 'lr-mais' : ''}">${x.it ? mais(x.it) : '—'}<span class="s">${x.it ? '' : 'veio locado'}</span></td><td class="n ${x.rec ? 'lr-mais' : ''}">${x.it ? (x.rec ? mais(x.rec) : brl(0)) : '—'}</td><td class="n ${x.ar ? 'lr-mais' : ''}">${x.ar ? `<b>${mais(x.ar)}</b>` : '—'}</td><td class="n lr-fora ${x.fora ? 'lr-mais' : ''}">${x.fora ? mais(x.fora) : '—'}${x.foraTxt ? `<span class="s">${esc(x.foraTxt)}</span>` : ''}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>${linhas.length} locações</td><td></td><td></td><td></td><td class="n">${brl(linhas.reduce((t, x) => t + x.aluguel, 0))}</td><td class="n lr-mais">${mais(admCarteira)}</td><td class="n lr-mais">${mais(linhas.reduce((t, x) => t + x.it, 0))}</td><td class="n lr-mais">${mais(linhas.reduce((t, x) => t + x.rec, 0))}</td><td class="n lr-mais">${mais(linhas.reduce((t, x) => t + x.ar, 0))}</td><td class="n lr-mais">${mais(linhas.reduce((t, x) => t + x.fora, 0))}</td></tr></tfoot></table></div>`;

    return `${ESTILO}<h2>Resumo da locação</h2>
      <p class="nota"><b>Bruto</b> = o que entra na conta da Vivere. <b>Líquido</b> = parte da imobiliária depois do % dos corretores e da nota fiscal, quando a planilha V. Claude registra. Fontes: Alude, planilha V. Claude e Financeiro.</p>
      <div class="lr-cards">${cards}</div>
      <h2 class="lr-sec">Entradas por mês</h2>${COMO_LER}<p class="nota">Administração e intermediação pelo mês do repasse — pagas no Alude ou por fora dele, quando registradas na planilha V. Claude; a coluna \"Por fora do Alude\" mostra quanto disso veio por fora e já está dentro de Adm. e Interm.; Sigafy (comissões de seguros e títulos) pelo crédito na conta.</p>${tabEM}
      <h2 class="lr-sec">Intermediação provisionada</h2><p class="nota">Só o já contratado: parcelas ainda não retidas e contratos assinados que ainda não repassaram. <b>Bruto</b> = o que o locador vai pagar à Vivere; <b>− Nota</b> = imposto da nota fiscal da intermediação; <b>− Corretores</b> = parte do agenciador e do fechador; <b>Líquido</b> = o que fica para a imobiliária.</p>${tabPR}
      <h3 class="lr-sub">Administração provisionada — ${mesTxt(AP.alvo)}</h3><p class="nota">A adm. que deve entrar no próximo mês: boletos do Alude que vencem em ${mesTxt(AP.alvo)} (a Vivere retém no repasse) e parcelas pagas por Pix nas locações fora do Alude. Valor = aluguel do contrato × taxa; a adm. não tem nota nem corretor, então bruto e líquido são iguais. Boleto vencido e não pago aparece como "em atraso". Todas as locações ativas aparecem; a coluna Alude diz se a adm. vem retida no repasse do Alude (dentro) ou por Pix do locador (fora); quem não tem adm. no mês aparece com R$ 0,00, o motivo e a próxima parcela.</p>${tabAP}
      ${(() => { const h = cronogramas(); return h ? `<h2 class="lr-sec">Locações fora do Alude</h2><p class="nota">Como cada uma é paga, pelo contrato, e o que já entrou para a Vivere.</p>${h}` : ''; })()}
      <h2 class="lr-sec">Por imóvel locado</h2><p class="nota">Adm./mês = aluguel do contrato × taxa. \"Por fora\" = adm. e intermediação já recebidas por fora do Alude (meses de competência e parcelas). Toque no código para abrir a locação na Carteira.</p>${tabIM}`;
  }

  H.registrar({ id: 'locacao-resumo', aba: 'Resumo', grupo: 'locacao',
    colecoes: ['contratos_locacao', 'receita_mensal', 'repasses', 'recebimentos_cleiton', 'financeiro_lancamentos', 'cobrancas', CRON],
    render: () => { try { return render(); } catch (e) { return `<p class="nota">Erro no Resumo: ${esc(e && e.message || e)}</p>`; } } });
})();
