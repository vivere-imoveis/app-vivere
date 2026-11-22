// modulos/relatorios.js — aba "📊 Relatórios" em Locação do HUB VIVERE (construção "relatorios", 18/11/2026, tarefa vivere-relatorio-mensal-proprietario)
// Contrato: _hub\modulos\LEIA-ME.md. Escopo do Cleiton (08/11 e 18/11/2026): módulo de Relatórios no HUB, sem enviar nada a ninguém.
// 1º relatório: "Mensal ao proprietário" — por mês e por proprietário (ou todos), um bloco por imóvel com:
//   1) repasse do mês (aluguel pago, multa e juros, taxa de administração, intermediação, retidos, líquido, data) e boleto do mês
//      (os encargos saem da diferença entre o boleto e o aluguel do contrato, porque o Alude não separa condomínio e IPTU);
//   2) cobrança em aberto (boletos atrasados, dias de atraso);  3) próximo reajuste (data, índice, aviso a 60 dias ou menos);
//   4) chamados do mês (abertos no mês ou ainda em andamento).  Botão "Baixar PDF" (jsPDF do HUB + downloads do claude.ai).
// • Lê (só leitura): contratos_locacao, repasses, cobrancas, chamados. Grava: nada.
(function () {
  const H = window.HUB; if (!H || H.relatorios) return;
  const esc = H.esc, brl = H.brl, dt = H.dt;
  const ID = 'relatorios', COLS = ['contratos_locacao', 'repasses', 'cobrancas', 'chamados'];
  const E = { mes: '', prop: '', msg: '', gerando: false };
  const num = (v) => Number(v) || 0;
  const r2 = (v) => Math.round(v * 100) / 100;
  const L = (c) => (H.S[c] ? H.lista(c) : []);
  const tem = (c) => !!(H.carregado && H.carregado[c]);
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const mesTxt = (m) => { const [a, b] = String(m || '').split('-'); return b ? `${MESES[Number(b) - 1]} de ${a}` : '—'; };
  const ymd = (s) => String(s || '').slice(0, 10);
  const pl = (c) => c.planilha || {}, al = (c) => c.alude || {};
  const campo = (c, k) => (al(c)[k] != null && al(c)[k] !== '' ? al(c)[k] : pl(c)[k]);
  const locador = (c) => String(campo(c, 'locador') || 'Sem locador informado').trim();
  const endereco = (c) => String(al(c).endereco || pl(c).endereco || '').trim();
  const PAGA = { locador: 'Locador', locatario: 'Locatário', condominio: 'Condomínio', definir: 'A definir' };
  const ETAPA = { aberto: 'Aberto', orcamento: 'Orçamento', aprovado: 'Aprovado', execucao: 'Em execução', concluido: 'Concluído' };
  const dias = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
  const ordCod = (a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true });

  // meses com repasse ou boleto, do mais novo ao mais antigo; padrão = último mês com repasse pago
  function meses() {
    const s = new Set(); L('repasses').forEach((r) => r.competencia && s.add(r.competencia)); L('cobrancas').forEach((b) => b.competencia && s.add(b.competencia));
    return [...s].filter((m) => /^\d{4}-\d{2}$/.test(m)).sort().reverse();
  }
  function mesPadrao() {
    const pagos = L('repasses').filter((r) => r.status === 'pago' && r.competencia).map((r) => r.competencia).sort();
    return pagos.length ? pagos[pagos.length - 1] : (meses()[0] || H.hojeISO().slice(0, 7));
  }
  const contratos = () => L('contratos_locacao').filter((c) => { try { return H.contratoAtivo(c); } catch (e) { return true; } }).sort((a, b) => ordCod(a._id, b._id));
  const proprietarios = () => [...new Set(contratos().map(locador))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  function blocoImovel(c, mes) {
    const cod = c._id, hoje = H.hojeISO();
    const r = L('repasses').find((x) => x.cod === cod && x.competencia === mes) || null;
    const b = L('cobrancas').find((x) => x.cod === cod && x.competencia === mes) || null;
    let rep = null;
    if (r) {
      const alug = num(r.aluguel_pago), mj = num(r.multa_juros), adm = num(r.taxa_adm_alude), int = r.intermediacao ? num(r.intermediacao.valor) : 0;
      const ret = Object.keys(r).filter((k) => /^retid/.test(k)).reduce((t, k) => t + num(r[k]), 0);
      const liq = r.liquido != null ? num(r.liquido) : (r.status === 'pago' || alug > 0) ? r2(alug + mj - adm - int - ret) : 0;
      const pago = r.status === 'pago' || alug > 0;
      rep = { pago, status: r.status, pago_em: r.pago_em, venc: r.vencimento, alug, mj, adm, int, intTxt: r.intermediacao ? `${r.intermediacao.parcela || 1}/${r.intermediacao.de || 1}` : '', ret, liq, estimado: r.liquido == null };
    }
    const alugContrato = num(campo(c, 'aluguel') || pl(c).aluguel_contrato);
    const alugRef = rep && rep.pago && rep.alug > 0 ? rep.alug : alugContrato; // aluguel do mês (repasse) antes do do contrato, que pode já estar reajustado
    const bol = b ? { valor: num(b.valor), pago: num(b.valor_pago), pago_em: b.pago_em, venc: b.vencimento, situacao: b.situacao, enc: alugRef && num(b.valor) > alugRef ? r2(num(b.valor) - alugRef) : 0, alugContrato: alugRef } : null;
    const aberto = L('cobrancas').filter((x) => x.cod === cod && x.situacao !== 'paga' && !x.pago_em && ymd(x.vencimento) && ymd(x.vencimento) < hoje)
      .sort((x, y) => String(x.competencia).localeCompare(String(y.competencia)))
      .map((x) => ({ comp: x.competencia, venc: x.vencimento, valor: num(x.valor), dias: dias(ymd(x.vencimento), hoje) })); // sempre calculado: o dias_atraso da coleta fica defasado
    const rj = al(c).reajuste || {};
    const prox = rj.proximo || pl(c).primeiro_reajuste || '';
    const reaj = prox ? { data: prox, indice: String(rj.indice || pl(c).indice || 'igpm').toUpperCase().replace('IGPM', 'IGP-M').replace('IPCA', 'IPCA'), falta: dias(hoje, ymd(prox)) } : null;
    const ch = L('chamados').filter((x) => x._id !== '_leia' && x.cod === cod && (String(x.aberto_em || '').slice(0, 7) === mes || (x.status !== 'concluido' && String(x.aberto_em || '').slice(0, 7) <= mes)))
      .sort((x, y) => String(x.aberto_em || '').localeCompare(String(y.aberto_em || '')));
    return { cod, end: endereco(c), locatario: String(campo(c, 'locatario') || ''), rep, bol, aberto, reaj, ch };
  }

  function dados() {
    const mes = E.mes || mesPadrao();
    const C = contratos().filter((c) => !E.prop || locador(c) === E.prop);
    const grupos = {}; C.forEach((c) => { (grupos[locador(c)] = grupos[locador(c)] || []).push(blocoImovel(c, mes)); });
    return { mes, grupos };
  }

  const linha = (rot, v, cls) => `<div class="rl-kv${cls ? ' ' + cls : ''}"><span>${rot}</span><b>${v}</b></div>`;
  function htmlImovel(x) {
    const p = [];
    p.push(`<h4 style="margin:0 0 4px">${esc(x.cod)} · ${esc(x.end || 'endereço não informado')}</h4>${x.locatario ? `<p class="nota" style="margin:0 0 8px">Locatário: ${esc(x.locatario)}</p>` : ''}`);
    // 1) repasse e encargos
    if (x.rep && !x.rep.pago) p.push(`<p class="rl-tit">Repasse do mês <span class="pill info">aguardando o pagamento do boleto</span></p><p class="nota">Vencimento ${esc(dt(x.rep.venc))}. O repasse sai depois que o inquilino paga.</p>`);
    else if (x.rep) {
      const R = x.rep;
      p.push(`<p class="rl-tit">Repasse do mês ${R.status === 'pago' ? `<span class="pill ok">pago em ${esc(dt(R.pago_em))}</span>` : `<span class="pill info">${esc(R.status || 'a pagar')}</span>`}</p>
        <div class="rl-lista">${linha('Aluguel pago', brl(R.alug))}${R.mj ? linha('Multa e juros', brl(R.mj)) : ''}${linha('− Taxa de administração', '− ' + brl(R.adm))}${R.int ? linha(`− Intermediação (parcela ${esc(R.intTxt)})`, '− ' + brl(R.int)) : ''}${R.ret ? linha('− Retido', '− ' + brl(R.ret)) : ''}
${linha(`Líquido ao proprietário${R.estimado ? ' <span class="s">(calculado)</span>' : ''}`, brl(R.liq), 'rl-tot')}</div>`);
    } else p.push(`<p class="rl-tit">Repasse do mês</p><p class="nota">Sem repasse lançado neste mês.</p>`);
    if (x.bol) {
      const B = x.bol;
      p.push(`<p class="nota" style="margin:6px 0 0;white-space:normal">Boleto do mês: <b>${brl(B.valor)}</b>${B.enc ? ` (aluguel ${brl(B.alugContrato)} + encargos ${brl(B.enc)})` : ''} · vencimento ${esc(dt(B.venc))} · ${B.pago_em ? `pago em ${esc(dt(B.pago_em))}` : esc(B.situacao || 'em aberto')}</p>`);
    }
    // 2) cobrança em aberto
    p.push(`<p class="rl-tit">Cobrança em aberto</p>` + (x.aberto.length
      ? `<div class="rl-lista">${x.aberto.map((a) => linha(`${esc(mesTxt(a.comp))} · venc. ${esc(dt(a.venc))} <span class="pill bad">${a.dias} dias</span>`, brl(a.valor))).join('')}</div>`
      : `<p class="nota"><span class="pill ok">em dia</span> nenhum boleto atrasado.</p>`));
    // 3) próximo reajuste
    p.push(`<p class="rl-tit">Próximo reajuste</p>` + (x.reaj
      ? `<p class="nota">${esc(dt(x.reaj.data))} · ${esc(x.reaj.indice)}${x.reaj.falta >= 0 && x.reaj.falta <= 60 ? ` <span class="pill warn">faltam ${x.reaj.falta} dias</span>` : x.reaj.falta < 0 ? ` <span class="pill bad">data já passou</span>` : ''}</p>`
      : `<p class="nota">Sem data de reajuste no contrato.</p>`));
    // 4) chamados (só quando houver)
    if (x.ch.length) p.push(`<p class="rl-tit">Chamados do mês</p><ul class="rl-ch">${x.ch.map((k) => `<li><b>${esc(ETAPA[k.status] || k.status || '')}</b> · ${esc(String(k.aberto_em || '').slice(0, 10).split('-').reverse().join('/'))} · ${esc(String(k.relato || '').slice(0, 140))}${k.quem_paga ? ` · paga: ${esc(PAGA[k.quem_paga] || k.quem_paga)}` : ''}${k.orcamento_valor ? ` · orçamento ${brl(num(k.orcamento_valor))}` : ''}</li>`).join('')}</ul>`);
    return `<div class="card rl-imv">${p.join('')}</div>`;
  }

  function render() {
    if (!tem('contratos_locacao') || !tem('repasses') || !tem('cobrancas')) return `<h2>Relatórios</h2>` + H.vazio('Carregando contratos, repasses e boletos…');
    const D = dados(), M = meses(), P = proprietarios();
    if (E.prop && !P.includes(E.prop)) E.prop = '';
    const nomes = Object.keys(D.grupos).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const tot = nomes.reduce((t, n) => t + D.grupos[n].reduce((s, x) => s + (x.rep && x.rep.status === 'pago' ? x.rep.liq : 0), 0), 0);
    const cab = `<h2>Relatórios</h2>
      <p class="nota" style="white-space:normal">Mensal ao proprietário: repasse e encargos do mês, cobrança em aberto, próximo reajuste e chamados, por imóvel. Só leitura; nada é enviado a ninguém. O PDF fica salvo no aparelho para você mandar, se quiser.</p>
      <div class="filtros rl-sel" style="align-items:center">
        <label>Mês <select data-rl-mes aria-label="Mês">${(M.length ? M : [D.mes]).map((m) => `<option value="${esc(m)}"${m === D.mes ? ' selected' : ''}>${esc(mesTxt(m))}</option>`).join('')}</select></label>
        <label>Proprietário <select data-rl-prop aria-label="Proprietário"><option value="">Todos (${P.length})</option>${P.map((n) => `<option value="${esc(n)}"${n === E.prop ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <button class="btn" data-rl-pdf="1"${E.gerando ? ' disabled' : ''}>${E.gerando ? 'Gerando…' : 'Baixar PDF'}</button>
      </div>${E.msg ? `<p class="nota" id="rl-msg">${esc(E.msg)}</p>` : ''}
      <p class="nota">${esc(mesTxt(D.mes))} · ${nomes.length} proprietário${nomes.length === 1 ? '' : 's'} · ${nomes.reduce((t, n) => t + D.grupos[n].length, 0)} imóveis · líquido já repassado ${brl(r2(tot))}</p>`;
    if (!nomes.length) return cab + H.vazio('Nenhum contrato ativo para este filtro.');
    const corpo = nomes.map((n) => `<section class="rl-prop"><h3 style="margin:18px 0 8px">${esc(n)}</h3><div class="rl-grade">${D.grupos[n].map(htmlImovel).join('')}</div></section>`).join('');
    return cab + corpo + `<p class="nota" style="margin-top:14px;white-space:normal">Fontes: Alude (repasses e boletos, pela coleta do HUB), carteira de contratos e chamados do HUB. Encargos = boleto − aluguel do contrato (o Alude não separa condomínio e IPTU). Líquido "calculado" = aluguel + multa e juros − administração − intermediação − retidos.</p>`;
  }

  // ------------------------------------------------------------ PDF (mesmo motor e rodapé do relatório de dívida do HUB)
  let JS = null;
  function jspdf() {
    if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return Promise.resolve(window.jspdf);
    if (JS) return JS;
    const scr = (src) => new Promise((ok, er) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => er(new Error('falhou ' + src)); document.head.appendChild(s); });
    JS = scr('modulos/vendor/jspdf-2.5.1.umd.min.js').then(() => scr('modulos/vendor/jspdf-autotable-3.8.2.min.js')).then(() => window.jspdf);
    JS.catch(() => { JS = null; }); return JS;
  }
  // jsPDF/helvetica imprime só WinAnsi: troca travessões e aspas tipográficas e tira emoji e símbolos fora dele
  const win = (t) => String(t == null ? '' : t).replace(/[\u2012-\u2015\u2212]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u2026/g, '...').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF·]/g, '').replace(/\s{2,}/g, ' ').trim();
  const nBR = (v) => num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dBR = (s) => { const m = ymd(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; };
  async function pdf() {
    const D = dados(), { jsPDF } = await jspdf();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' }), W = doc.internal.pageSize.getWidth(), A = doc.internal.pageSize.getHeight();
    const rod = () => { doc.setFontSize(7.5); doc.setTextColor(110); doc.text('Vivere Jurerê Internacional Ltda · CNPJ 63.295.886/0001-68 · CRECI 8883 J · Rua dos Chernes, 90, Sala 01, Jurerê Internacional, Florianópolis/SC, CEP 88053-545 · (48) 99197-9159', W / 2, A - 10, { align: 'center', maxWidth: W - 28 }); doc.setTextColor(20); };
    const nomes = Object.keys(D.grupos).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    nomes.forEach((n, i) => {
      if (i) doc.addPage();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('VIVERE IMÓVEIS SELECIONADOS', 14, 16);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.text('Relatório mensal ao proprietário', W - 14, 16, { align: 'right' });
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(`Proprietário: ${win(n)}`, 14, 24, { maxWidth: W - 28 });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`Competência: ${mesTxt(D.mes)} · emitido em ${dBR(H.hojeISO())}`, 14, 29);
      let y = 34;
      D.grupos[n].forEach((x) => {
        const body = [];
        if (x.rep && !x.rep.pago) body.push(['Repasse do mês', `aguardando o pagamento do boleto (venc. ${dBR(x.rep.venc)})`, '']);
        else if (x.rep) {
          const R = x.rep;
          body.push(['Repasse do mês', R.status === 'pago' ? `pago em ${dBR(R.pago_em)}` : (R.status || 'a pagar'), '']);
          body.push(['  Aluguel pago', '', nBR(R.alug)]); if (R.mj) body.push(['  Multa e juros', '', nBR(R.mj)]);
          body.push(['  (-) Taxa de administração', '', '- ' + nBR(R.adm)]); if (R.int) body.push([`  (-) Intermediação (parcela ${R.intTxt})`, '', '- ' + nBR(R.int)]);
          if (R.ret) body.push(['  (-) Retido', '', '- ' + nBR(R.ret)]);
          body.push([{ content: '  Líquido ao proprietário', styles: { fontStyle: 'bold' } }, '', { content: nBR(R.liq), styles: { fontStyle: 'bold' } }]);
        } else body.push(['Repasse do mês', 'sem repasse lançado', '']);
        if (x.bol) body.push(['Boleto do mês', `venc. ${dBR(x.bol.venc)} · ${x.bol.pago_em ? 'pago em ' + dBR(x.bol.pago_em) : (x.bol.situacao || 'em aberto')}${x.bol.enc ? ` · aluguel ${nBR(x.bol.alugContrato)} + encargos ${nBR(x.bol.enc)}` : ''}`, nBR(x.bol.valor)]);
        if (x.aberto.length) x.aberto.forEach((a, k) => body.push([k ? '' : 'Cobrança em aberto', `${mesTxt(a.comp)} · venc. ${dBR(a.venc)} · ${a.dias} dias`, nBR(a.valor)]));
        else body.push(['Cobrança em aberto', 'nenhum boleto atrasado', '']);
        body.push(['Próximo reajuste', x.reaj ? `${dBR(x.reaj.data)} · ${x.reaj.indice}${x.reaj.falta >= 0 && x.reaj.falta <= 60 ? ` · faltam ${x.reaj.falta} dias` : x.reaj.falta < 0 ? ' · data já passou' : ''}` : 'sem data no contrato', '']);
        x.ch.forEach((k, j) => body.push([j ? '' : 'Chamados do mês', win(`${ETAPA[k.status] || k.status || ''} · ${String(k.relato || '').slice(0, 110)}${k.quem_paga ? ' · paga: ' + (PAGA[k.quem_paga] || k.quem_paga) : ''}`), k.orcamento_valor ? nBR(k.orcamento_valor) : '']));
        doc.autoTable({ startY: y, head: [[{ content: win(`${x.cod} · ${x.end || ''}`), colSpan: 3 }]], body, theme: 'plain',
          styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.4, textColor: 20 }, headStyles: { fontStyle: 'bold', fillColor: [236, 238, 242] },
          columnStyles: { 0: { cellWidth: 58 }, 2: { cellWidth: 28, halign: 'right' } }, margin: { left: 14, right: 14, bottom: 20 }, didDrawPage: rod });
        y = doc.lastAutoTable.finalY + 5;
      });
      doc.setFontSize(7.5); doc.setTextColor(90);
      const nota = doc.splitTextToSize('Valores conforme o Alude (repasses e boletos) e a carteira de contratos da Vivere. Encargos = boleto - aluguel do contrato. Relatório informativo; não substitui o extrato do Alude.', W - 28);
      if (y + nota.length * 3.4 > A - 22) { doc.addPage(); rod(); y = 20; } doc.text(nota, 14, y); doc.setTextColor(20);
    });
    const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(110); doc.text(`${i} de ${n}`, W - 14, A - 5, { align: 'right' }); }
    const [a4, m2] = D.mes.split('-'), quem = E.prop ? E.prop.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).slice(0, 3).join(' ') : 'Todos os proprietarios';
    return { nome: `VIS - Relatorio Mensal Proprietario - ${quem} - ${m2}.${a4}.pdf`.replace(/[\\/:*?"<>|,]/g, ''), dados: doc.output('blob') };
  }
  async function baixa() {
    E.gerando = true; E.msg = ''; H.pede();
    try {
      const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      const { nome, dados: blob } = await pdf();
      if (!dl || typeof dl.save !== 'function') { E.msg = 'Esta visualização não permite baixar arquivo.'; return; }
      await dl.save({ filename: nome, data: blob }); E.msg = 'PDF salvo: ' + nome;
    } catch (e) { const c = e && e.code; E.msg = c === 'declined' ? 'Download cancelado.' : c === 'rate_limited' ? 'Já há um download aguardando confirmação.' : 'Não foi possível gerar o PDF (' + ((e && e.message) || c || 'erro') + ').'; }
    finally { E.gerando = false; H.pede(); }
  }

  if (!document.getElementById('rl-css')) {
    const st = document.createElement('style'); st.id = 'rl-css';
    st.textContent = `.rl-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:12px}@media(min-width:960px){.rl-grade>.rl-imv:last-child:nth-child(odd){grid-column:1/-1}}
      .rl-imv{overflow-wrap:anywhere}.rl-imv h4{font-size:15px}.rl-tit{margin:12px 0 4px;font-weight:700;font-size:13px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
      .rl-lista{display:flex;flex-direction:column;font-size:13px}.rl-kv{display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px dashed var(--line)}
      .rl-kv span{min-width:0}.rl-kv b{white-space:nowrap;font-weight:600}.rl-kv.rl-tot{border-bottom:0;border-top:1px solid var(--line);margin-top:2px;padding-top:5px}.rl-kv.rl-tot span,.rl-kv.rl-tot b{font-weight:700}
      .rl-ch{margin:0;padding-left:18px;font-size:13px}.rl-sel label{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap}
      .rl-sel select{max-width:100%}`;
    document.head.appendChild(st);
  }

  H.registrar({ id: ID, aba: '📊 Relatórios', grupo: 'locacao', depois: 'locacao-resumo', colecoes: COLS, render });
  H.relatorios = { dados, pdf };
  document.addEventListener('change', (e) => {
    const s = e.target; if (!s || !s.matches) return;
    if (s.matches('[data-rl-mes]')) { E.mes = s.value; E.msg = ''; H.pede(); }
    else if (s.matches('[data-rl-prop]')) { E.prop = s.value; E.msg = ''; H.pede(); }
  });
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-rl-pdf]'); if (b && !E.gerando) baixa(); });
})();
