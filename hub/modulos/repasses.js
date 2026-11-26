// modulos/repasses.js — aba "Repasses" da Locação no HUB Vivere (espelho do Alude, fatia 2, 25/11/2026)
// Lê alude_repasses (gravado pela porta alude-espelho a cada operação no Alude): por mês de referência, o repasse de cada
// locação — situação, quando a cobrança foi paga, quanto vai ao proprietário, a taxa da Vivere e as transferências.
// Não grava nada. Sem conta bancária, CPF/CNPJ, telefone ou e-mail.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl = H.brl;
  const ID = 'repasses', CR = 'alude_repasses', CE = 'alude_espelho_controle';
  const F = { mes: '', cod: '' };
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const nomeMes = (m) => { const [a, b] = String(m || '').split('-'); return b ? MESES[+b - 1] + '/' + a : (m || '—'); };
  const url = (u) => (typeof window.escUrl === 'function' ? window.escUrl(u) : esc(u));
  const dtHora = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : esc(s); };
  const SIT = {
    pago: ['Repassado', 'ok'], feito_fora: ['Feito fora', 'ok'], agendado: ['Agendado', 'info'],
    aguarda_pagamento: ['Aguarda o aluguel', 'warn'], nao_agendado: ['Não agendado', 'warn'],
    previsto: ['Previsto', ''], falhou: ['Falhou', 'bad'],
  };
  const pill = (s) => { const x = SIT[s] || [s || '—', '']; return `<span class="pill ${x[1]}">${esc(x[0])}</span>`; };
  const btn = (attr, val, rot, on) => `<button class="btn" data-${attr}="${esc(val)}" aria-pressed="${!!on}" style="${on ? 'border-color:var(--accent);font-weight:600' : ''}">${rot}</button>`;
  const ROT_ARQ = { boleto: 'Boleto PDF', recibo: 'Recibo PDF', relatorio_repasse: 'Relatório PDF' };
  // PDFs guardados na pasta da locação (fatia 3): busca o arquivo no Drive pelo nome e abre a subpasta no PC
  const arqHtml = (c) => {
    const A = c.arquivos || []; if (!A.length) return '';
    const base = typeof H.pastaDoCodigo === 'function' ? H.pastaDoCodigo(c.cod) : null;
    const sub = base ? base + '\\' + A[0].sub : '';
    return `<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">${A.map((a) => `<a class="btn" href="https://drive.google.com/drive/search?q=${encodeURIComponent('"' + String(a.nome).replace(/\.pdf$/i, '') + '"')}" target="_blank" rel="noopener" title="${esc(a.nome)}">${esc(ROT_ARQ[a.tipo] || 'PDF')}</a>`).join('')}${sub ? `<a class="btn pasta" href="abrirpasta:${encodeURIComponent(sub)}" target="_blank" rel="noopener" data-abrir-pasta="${esc(sub)}" title="Abre a pasta no Explorador e copia o caminho">Pasta</a>` : ''}</div>`;
  };
  const reps = () => H.lista(CR);
  const mesDe = (r) => String(r.venc_cobranca || r.ref || '').slice(0, 7);
  const valorProp = (r) => ((+r.ao_proprietario || 0) === 0 && !['pago', 'feito_fora', 'agendado'].includes(r.situacao) ? null : +r.ao_proprietario || 0);
  const vivere = (r) => (r.composicao || []).filter((x) => /^Vivere/.test(x.nome || '')).reduce((t, x) => t + (+x.valor || 0), 0);
  const compHtml = (r) => {
    const c = r.composicao || [], t = r.transferencias || [];
    if (!c.length && !t.length) return '';
    return `<details><summary class="s" style="cursor:pointer">Composição${t.length ? ' e transferências' : ''}</summary><div style="margin-top:6px;display:grid;gap:2px">${
      c.map((x) => { const v = +x.valor || 0; return `<div class="vlin"><span>${esc(x.nome)}</span><span class="vr ${v < 0 ? 'vmenos' : ''}">${v < 0 ? H.menos(-v) : brl(v)}</span></div>`; }).join('')
    }${t.map((x) => `<div class="vlin"><span class="s">→ ${esc(x.para || '—')}</span><span class="s">${esc(x.pago_em ? 'pago em ' + dt(x.pago_em) : x.agendado_para ? 'agendado p/ ' + dt(x.agendado_para) : (x.situacao || ''))}</span></div>`).join('')}</div></details>`;
  };

  function render() {
    const R = reps();
    if (!R.length) return H.vazio(H.carregado[CR] ? 'O espelho do Alude ainda não foi gravado.' : 'Carregando…');
    const meses = [...new Set(R.map(mesDe).filter(Boolean))].sort().reverse();
    const mesHoje = H.hojeISO().slice(0, 7);
    // mês padrão: o de referência mais recente que já tem cobrança vencida (o repasse "da vez")
    if (!F.mes || !meses.includes(F.mes)) F.mes = meses.includes(mesHoje) ? mesHoje : (meses.find((m) => m <= mesHoje) || meses[meses.length - 1]);
    const doMes = R.filter((r) => mesDe(r) === F.mes && (!F.cod || r.cod === F.cod))
      .sort((a, b) => String(a.venc_cobranca || '').localeCompare(String(b.venc_cobranca || '')) || String(a.cod).localeCompare(String(b.cod)));
    const soma = (L, f) => L.reduce((t, r) => t + (+f(r) || 0), 0);
    const feitos = doMes.filter((r) => r.situacao === 'pago' || r.situacao === 'feito_fora');
    const agend = doMes.filter((r) => r.situacao === 'agendado');
    const pend = doMes.filter((r) => ['nao_agendado', 'aguarda_pagamento', 'previsto', 'falhou'].includes(r.situacao));
    const e = H.lista(CE).find((x) => x._id === 'ultima_leitura');
    const nota = `<p class="nota">Repasses do Alude agrupados pelo mês em que o aluguel vence (o repasse sai depois do pagamento)${e && e.recebido_em ? ' · espelho lido em ' + dtHora(new Date(e.recebido_em).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' })) : ''}. "Ao proprietário" soma o que vai a cada locador; a taxa da Vivere aparece à parte. A9, A10 e T1 ficam fora do Alude.</p>`;
    const chipsMes = `<div class="filtros">${meses.slice(0, 13).map((m) => btn('rep-mes', m, esc(nomeMes(m)), m === F.mes)).join('')}</div>`;
    const cods = [...new Set(R.map((r) => r.cod))].sort((a, b) => (parseInt(a.slice(1)) || 0) - (parseInt(b.slice(1)) || 0));
    const chipsCod = `<div class="filtros">${btn('rep-cod', '', 'Todas as locações', !F.cod)}${cods.map((k) => btn('rep-cod', k, esc(k), F.cod === k)).join('')}</div>`;
    const cards = `<div class="resumo-cob">
      <div class="card"><div class="s">Repassados</div><div class="num" style="color:var(--ok)">${feitos.length}</div><div class="s">${brl(soma(feitos, (r) => r.ao_proprietario))}</div></div>
      <div class="card"><div class="s">Agendados</div><div class="num">${agend.length}</div><div class="s">${brl(soma(agend, (r) => r.ao_proprietario))}</div></div>
      <div class="card"><div class="s">Pendentes</div><div class="num" style="color:var(--${pend.length ? 'warn' : 'muted'})">${pend.length}</div><div class="s">não agendados ou sem pagamento</div></div>
      <div class="card"><div class="s">Taxa da Vivere</div><div class="num">${brl(soma(doMes, vivere))}</div><div class="s">no mês</div></div>
    </div>`;
    const linhas = doMes.map((r) => `<tr id="rep-${esc(r.cod)}-${esc(mesDe(r))}">
      <td class="cod">${esc(r.cod)}</td>
      <td>${esc(r.proprietario || '—')}<span class="s">${esc(r.locatario || '')}</span>${compHtml(r)}</td>
      <td>${r.venc_cobranca ? dt(r.venc_cobranca) : '—'}<span class="s">${r.cobranca_paga_em ? 'paga em ' + dt(r.cobranca_paga_em) : 'ainda não paga'}</span></td>
      <td class="n">${valorProp(r) == null ? '<span class="s">definido no pagamento</span>' : brl(valorProp(r)) + `<span class="s">Vivere ${brl(vivere(r))}</span>`}<span class="s">ref. ${esc(nomeMes(r.ref))}</span></td>
      <td>${pill(r.situacao)}${r.observacao ? `<span class="s">${esc(r.observacao)}</span>` : ''}</td>
      <td>${r.repassado_em ? dt(r.repassado_em) : ((r.transferencias || []).find((t) => t.agendado_para) ? 'p/ ' + dt((r.transferencias || []).find((t) => t.agendado_para).agendado_para) : '<span class="s">—</span>')}</td>
      <td>${r.alude_url ? `<a class="btn" href="${url(r.alude_url)}" target="_blank" rel="noopener">Abrir no Alude</a>` : ''}${arqHtml(r)}</td></tr>`).join('');
    const tabela = `<div class="tabela"><table><thead><tr><th>Cód.</th><th>Proprietário / locatário</th><th>Aluguel vence</th><th class="n">Ao proprietário</th><th>Situação</th><th>Repasse</th><th></th></tr></thead><tbody>${linhas || '<tr><td colspan="7" class="s">Nenhum repasse neste filtro.</td></tr>'}</tbody></table></div>`;
    return `<h2>Repasses dos aluguéis de ${esc(nomeMes(F.mes))}</h2>${nota}${chipsMes}${chipsCod}${cards}${tabela}`;
  }

  H.registrar({
    id: ID, aba: 'Repasses', grupo: 'locacao', depois: 'boletos', colecoes: [CR, CE], render,
    busca(q) {
      const t = String(q || '').toLowerCase(); if (!t) return [];
      const R = []; const vistos = {};
      for (const r of reps()) {
        if (vistos[r.cod]) continue;
        if ([r.cod, r.proprietario, r.locatario].join(' ').toLowerCase().includes(t)) { vistos[r.cod] = 1; R.push({ grp: 'Repasses', tit: `${r.cod} · repasses da locação`, sub: `${r.proprietario || ''} / ${r.locatario || ''}`, ir: { aba: ID, alvo: r.cod } }); }
        if (R.length >= 8) break;
      }
      return R;
    },
    foco(alvo) { if (alvo) { F.cod = alvo; H.pede(); } },
  });

  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-rep-mes]'); if (m) { F.mes = m.dataset.repMes; H.pede(); return; }
    const c = e.target.closest('[data-rep-cod]'); if (c) { F.cod = c.dataset.repCod; H.pede(); }
  });
})();
