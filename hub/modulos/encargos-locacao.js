// modulos/encargos-locacao.js — aba "Encargos" da Locação no HUB Vivere (construção "encargos-locacao", 25/11/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Pedido do Cleiton (25/11/2026): uma aba com os encargos de todas as locações —
// valores mensais, eventuais e anuais — num lugar só (o caso que motivou: achar o seguro incêndio da A10 para os locatários).
// • Lê: fichas-locacao_dados (bloco `alude` da coleta diária e bloco `seguro` das pastas, do módulo Fichas — só leitura),
//   contratos_locacao (núcleo, só leitura) e a coleção própria encargos-locacao_dados (nível diretoria):
//   { condominio: {nome, administradora, valor, ref, vencimento, titular, pagador, arquivo, link, obs},
//     fora_alude: [{nome, tipo: seguro|iptu|condominio|outro, pagador, recebedor, parcelas, valor_parcela, valor_total, primeira, dia, obs}],
//     anuais: [{nome, valor, quando, obs}], obs, fonte, atualizado_em }
// • Não grava nada (a aba é só consulta). Sem CPF/CNPJ, telefone, e-mail ou conta bancária.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl = H.brl;
  const ID = 'encargos-locacao', CL = 'encargos-locacao_dados', FI = 'fichas-locacao_dados';
  const ord = (a, b) => (a[0] + String(a.slice(1)).padStart(4, '0')).localeCompare(b[0] + String(b.slice(1)).padStart(4, '0'));
  const mes = (s) => { if (!s) return '—'; const [y, m] = String(s).split('-'); return `${m}/${y}`; };
  const hoje = () => H.hojeISO();
  const ctr = (cod) => (H.S.contratos_locacao || {})[cod] || {};
  const campo = (c, k) => { const pl = c.planilha || {}, al = c.alude || {}; return pl[k] ?? al[k] ?? null; };
  const ativo = (cod) => { const c = ctr(cod); return typeof H.contratoAtivo === 'function' ? H.contratoAtivo(Object.assign({ _id: cod }, c)) : true; };
  const fi = (cod) => (H.S[FI] || {})[cod] || {};
  const en = (cod) => (H.S[CL] || {})[cod] || {};
  const cods = () => [...new Set([...Object.keys(H.S[FI] || {}), ...Object.keys(H.S[CL] || {})])].filter(ativo).sort(ord);
  const soma = (L, f) => L.reduce((t, x) => t + (Number(f(x)) || 0), 0);

  // ------------------------------------------------------------ classificação dos encargos do boleto (Alude)
  const tipoDe = (e) => { const t = `${e.categoria || ''} ${e.nome || ''}`.toLowerCase();
    if (/seguro/.test(t)) return 'seguro'; if (/iptu|tcrs|coleta/.test(t)) return 'iptu';
    if (/taxa.*(boleto|fatura)|emiss/.test(t)) return 'taxa'; if (/condom/.test(t)) return 'condominio'; return 'outro'; };
  const doMes = (e) => (e.fixo ? Number(e.valor_total) || 0 : e.proxima ? Number(e.proxima.valor) || 0 : 0);
  const aludeEnc = (cod) => (((fi(cod).alude || {}).encargos_cobranca) || []);
  const temAlude = (cod) => !!Object.keys(fi(cod).alude || {}).length;

  // parcelas fora do Alude: datas a partir da 1ª, no mesmo dia dos meses seguintes
  const addMes = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const dd = new Date(Date.UTC(y, m - 1 + n, 1));
    const ult = new Date(Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth() + 1, 0)).getUTCDate();
    return `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(d, ult)).padStart(2, '0')}`; };
  const datas = (x) => (x.primeira ? Array.from({ length: Number(x.parcelas) || 1 }, (_, i) => addMes(x.primeira, i)) : []);
  const proxFora = (x) => { const D = datas(x), h = hoje(); const i = D.findIndex((d) => d >= h); return i < 0 ? null : { n: i + 1, d: D[i] }; };
  const fora = (cod) => (en(cod).fora_alude || []);

  // célula de um tipo: soma do mês + detalhe de cada encargo
  function cel(cod, tipo) {
    const A = aludeEnc(cod).filter((e) => tipoDe(e) === tipo), F = fora(cod).filter((x) => (x.tipo || 'outro') === tipo);
    if (!A.length && !F.length) return { v: 0, h: '', vazio: true };
    const partes = A.map((e) => e.fixo ? `${esc(e.nome)} · todo mês`
      : `${e.pagas}/${e.parcelas} pagas · ${e.proxima ? 'próxima ' + mes(e.proxima.ref) : 'quitado'}`);
    F.forEach((x) => { const p = proxFora(x); partes.push(`fora do Alude · ${esc(x.pagador || '')} → ${esc(x.recebedor || '')} · ${x.parcelas}× ${brl(x.valor_parcela)}${p ? ` · próxima ${p.n}/${x.parcelas} em ${dt(p.d)}` : ' · quitado'}`); });
    const vF = soma(F, (x) => { const p = proxFora(x); return p && p.d.slice(0, 7) <= addMes(hoje(), 1).slice(0, 7) ? x.valor_parcela : 0; });
    const v = soma(A, doMes) + vF;
    return { v, h: partes.map((t) => `<span class="s">${t}</span>`).join('') };
  }
  const val = (c) => (c.vazio ? '—' : c.v ? brl(c.v) : brl(0));

  function celSeguro(cod) {
    const c = cel(cod, 'seguro'), s = fi(cod).seguro || {};
    const SIT = { sigafy: 'Tokio pela Sigafy', proprio_locatario: 'próprio do locatário', proprio_locador: 'próprio do locador', a_contratar: 'a contratar', sem_seguro: 'sem seguro' };
    const pill = s.situacao === 'sem_seguro' ? '<span class="pill bad">sem seguro</span>' : s.situacao === 'a_contratar' ? '<span class="pill warn">a contratar</span>' : '';
    const sub = [SIT[s.situacao] && s.situacao !== 'sem_seguro' && s.situacao !== 'a_contratar' ? SIT[s.situacao] : '', s.seguradora && s.situacao !== 'sigafy' ? s.seguradora : '', s.vigencia_fim ? 'até ' + dt(s.vigencia_fim) : ''].filter(Boolean).join(' · ');
    const extra = s.conteudo_extra ? `<span class="s">conteúdo extra ${s.conteudo_extra.parcelas}× ${brl(s.conteudo_extra.valor_parcela)} pago pela ${esc(s.conteudo_extra.pagador || 'Vivere')}</span>` : '';
    if (c.vazio) return { v: 0, txt: (pill || (s.situacao ? '—' : '—')) + (sub ? `<span class="s">${esc(sub)}</span>` : '') + extra + (!s.situacao ? '<span class="s">sem dado</span>' : '') };
    return { v: c.v, txt: brl(c.v) + c.h + (sub ? `<span class="s">${esc(sub)}</span>` : '') + extra };
  }

  function celCond(cod) {
    const k = en(cod).condominio;
    if (!k) return { v: 0, txt: '<span class="pill warn">a levantar</span>', falta: true };
    const sub = [k.ref ? 'ref. ' + mes(k.ref) : '', k.vencimento ? 'venc. ' + dt(k.vencimento) : '', k.administradora, k.pagador].filter(Boolean).map(esc).join(' · ');
    const link = k.link ? ` <a href="${esc(k.link)}" target="_blank" rel="noopener" title="Abrir o boleto no Drive">📄 boleto</a>` : '';
    return { v: Number(k.valor) || 0, txt: (k.valor != null ? brl(k.valor) : '—') + link + (k.nome ? `<span class="s">${esc(k.nome)}</span>` : '') + (sub ? `<span class="s">${sub}</span>` : '') + (k.obs ? `<span class="s">${esc(k.obs)}</span>` : '') };
  }

  function linha(cod) {
    const c = ctr(cod), end = campo(c, 'endereco') || '', loc = campo(c, 'locatario') || '';
    const cond = celCond(cod), iptu = cel(cod, 'iptu'), seg = celSeguro(cod), tx = cel(cod, 'taxa'), out = cel(cod, 'outro');
    const tot = cond.v + iptu.v + seg.v + tx.v + out.v;
    const al = temAlude(cod) ? '' : '<span class="pill info">fora do Alude</span>';
    return { cod, tot, falta: !!cond.falta, html: `<tr id="enc-${esc(cod)}"><td class="cod"><button class="btn" data-encargos-ficha="${esc(cod)}" title="Abrir a ficha da locação ${esc(cod)}">${esc(cod)}</button>${al}<span class="s">${esc(end)}</span>${loc ? `<span class="s">${esc(loc)}</span>` : ''}</td>
      <td class="n">${cond.txt}</td><td class="n">${val(iptu)}${iptu.h}</td><td class="n">${seg.txt}</td><td class="n">${val(tx)}</td><td class="n">${val(out)}${out.h}</td>
      <td class="n"><b>${brl(tot)}</b>${en(cod).obs ? `<span class="s">${esc(en(cod).obs)}</span>` : ''}</td></tr>` };
  }

  // ------------------------------------------------------------ eventuais e anuais
  function anuais(L) {
    const rows = [];
    L.forEach((cod) => {
      const f = fi(cod), s = f.seguro || {}, al = f.alude || {}, e = en(cod);
      aludeEnc(cod).filter((x) => tipoDe(x) === 'iptu' && !x.fixo).forEach((x) => rows.push([cod, 'IPTU/TCRS', `${esc(x.nome)}<span class="s">${x.parcelas}× ${brl(x.valor_parcela)} · ${mes(x.de)} a ${mes(x.ate)}</span>`, x.valor_total, x.ate ? mes(x.ate) : '—']));
      if (s.premio_total) rows.push([cod, 'Seguro incêndio', `${esc(s.seguradora || '')}${s.apolice ? ' · ' + esc(s.apolice) : ''}<span class="s">${s.parcelas ? s.parcelas + '× ' + brl(s.valor_parcela || ((s.parcelas_detalhe || [])[0] || {}).valor) : ''}${s.vigencia_inicio ? ' · ' + dt(s.vigencia_inicio) + ' a ' + dt(s.vigencia_fim) : ''}</span>`, s.premio_total, s.vigencia_fim ? 'renova ' + dt(s.vigencia_fim) : '—']);
      if (s.conteudo_extra) rows.push([cod, 'Seguro — conteúdo extra', `Apólice ${esc(s.conteudo_extra.apolice || '')}<span class="s">pago pela ${esc(s.conteudo_extra.pagador || 'Vivere')} · ${s.conteudo_extra.parcelas}× ${brl(s.conteudo_extra.valor_parcela)}</span>`, s.conteudo_extra.premio_total, s.vigencia_fim ? 'renova ' + dt(s.vigencia_fim) : '—']);
      const r = al.reajuste || {}; if (r.proximo) rows.push([cod, 'Reajuste do aluguel', `${esc(String(r.indice || '').replace('igpm', 'IGP-M').replace('fixed', 'fixo'))}<span class="s">último ${r.ultimo ? dt(r.ultimo) : '—'}</span>`, null, dt(r.proximo)]);
      const g = al.garantia || {}; if (g.renovacao) rows.push([cod, 'Garantia', `${esc(g.tipo || '')}<span class="s">${g.valor ? brl(g.valor) : ''}</span>`, null, 'renova ' + dt(g.renovacao)]);
      (e.anuais || []).forEach((x) => rows.push([cod, esc(x.nome || 'Eventual'), `<span class="s">${esc(x.obs || '')}</span>`, x.valor, x.quando ? esc(x.quando) : '—']));
    });
    if (!rows.length) return '';
    return `<h3>Eventuais e anuais</h3><p class="nota">O total de cada encargo parcelado ou anual e quando vence, renova ou reajusta.</p>
      <div class="tabela"><table><thead><tr><th>Locação</th><th>Encargo</th><th>Detalhe</th><th class="n">Valor total</th><th>Quando</th></tr></thead><tbody>${
      rows.map((r) => `<tr><td class="cod">${esc(r[0])}</td><td>${r[1]}</td><td>${r[2]}</td><td class="n">${r[3] != null ? brl(r[3]) : '—'}</td><td>${r[4]}</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ------------------------------------------------------------ cobranças fora do Alude (calendário)
  function foraBloco(L) {
    const it = []; L.forEach((cod) => fora(cod).forEach((x) => it.push([cod, x])));
    if (!it.length) return '';
    return `<h3>Cobranças fora do Alude</h3><p class="nota">Encargos que o locatário paga direto à Vivere ou a terceiros, fora do boleto do Alude, com as datas de cada parcela.</p>
      <div class="tabela"><table><thead><tr><th>Locação</th><th>Encargo</th><th>Quem paga → recebe</th><th class="n">Parcelas</th><th>Datas</th></tr></thead><tbody>${
      it.map(([cod, x]) => { const D = datas(x), p = proxFora(x);
        return `<tr><td class="cod">${esc(cod)}</td><td>${esc(x.nome || '')}${x.obs ? `<span class="s">${esc(x.obs)}</span>` : ''}</td><td>${esc(x.pagador || '—')} → ${esc(x.recebedor || '—')}</td>
          <td class="n">${x.parcelas}× ${brl(x.valor_parcela)}<span class="s">total ${brl(x.valor_total != null ? x.valor_total : x.parcelas * x.valor_parcela)}</span></td>
          <td>${D.length ? `${dt(D[0])} a ${dt(D[D.length - 1])}<span class="s">todo dia ${esc(String(x.dia || D[0].slice(8)))} · ${p ? `próxima ${p.n}/${x.parcelas} em ${dt(p.d)}` : 'quitado'}</span>` : '—'}</td></tr>`; }).join('')}</tbody></table></div>`;
  }

  function render() {
    const carregou = H.carregado[FI] && H.carregado[CL];
    const L = cods();
    if (!L.length) return `<h2>Encargos das locações</h2>` + H.vazio(carregou ? 'Nenhuma locação ativa com ficha.' : 'Carregando…');
    const R = L.map(linha), tot = soma(R, (r) => r.tot), falta = R.filter((r) => r.falta).length;
    const h60 = addMes(hoje(), 2), vence = L.filter((c) => { const v = (fi(c).seguro || {}).vigencia_fim; return v && v >= hoje() && v <= h60; }).length;
    const semSeg = L.filter((c) => (fi(c).seguro || {}).situacao === 'sem_seguro').length;
    const cards = `<div class="grade">
      <div class="card"><h2>Encargos do mês</h2><div class="big">${brl(tot)}</div><p class="nota" style="margin:4px 0 0">${L.length} locações ativas · condomínio, IPTU/TCRS, seguro, taxas e outros (próxima parcela de cada um)</p></div>
      <div class="card"><h2>Condomínio a levantar</h2><div class="big">${falta}</div><p class="nota" style="margin:4px 0 0">locações sem o último boleto lido</p></div>
      <div class="card"><h2>Seguros</h2><div class="big">${vence}</div><p class="nota" style="margin:4px 0 0">vencendo em até 60 dias · ${semSeg} sem seguro</p></div></div>`;
    return `<h2>Encargos das locações</h2><p class="nota">Tudo o que cada locação paga além do aluguel: o condomínio (último boleto lido na pasta), o IPTU/TCRS e o seguro incêndio (parcela do mês, pagas/total e próxima), a taxa do boleto e os demais encargos e descontos do Alude, mais o que é cobrado fora do Alude. O Alude é lido todo dia útil pela rotina; condomínio e cobranças fora do Alude vêm das pastas.</p>${cards}
      <div class="tabela"><table><thead><tr><th>Locação</th><th class="n">Condomínio</th><th class="n">IPTU/TCRS</th><th class="n">Seguro incêndio</th><th class="n">Taxa do boleto</th><th class="n">Descontos e outros</th><th class="n">Total do mês</th></tr></thead>
      <tbody>${R.map((r) => r.html).join('')}</tbody></table></div>${foraBloco(L)}${anuais(L)}`;
  }

  H.registrar({
    id: ID, aba: 'Encargos', grupo: 'locacao', depois: 'fichas-locacao', colecoes: [CL, FI, 'contratos_locacao'],
    render,
    foco(alvo) { if (alvo) setTimeout(() => { const el = document.getElementById('enc-' + alvo); if (el) el.scrollIntoView({ block: 'center' }); }, 60); },
    busca(q) {
      const t = String(q || '').toLowerCase(); if (t.length < 2) return [];
      return cods().filter((c) => { const k = en(c).condominio || {}; return [c, k.nome, k.administradora, 'encargos', 'condominio', 'condomínio'].filter(Boolean).join(' ').toLowerCase().includes(t); })
        .slice(0, 8).map((c) => ({ grp: 'Encargos das locações', tit: `${c} — encargos`, sub: [((en(c).condominio || {}).nome), ((en(c).condominio || {}).administradora)].filter(Boolean).join(' · '), ir: { aba: ID, linha: 'enc-' + c, alvo: c } }));
    },
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-encargos-ficha]'); if (b) { H.irPara('fichas-locacao', null, b.dataset.encargosFicha); }
  });
})();
