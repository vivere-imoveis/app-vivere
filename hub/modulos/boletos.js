// modulos/boletos.js — aba "Boletos" da Locação no HUB Vivere (construção "boletos", 29/10/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Pedido do Cleiton (29/10/2026): ver, de forma organizada, cada lote de boletos
// gerado no fim do mês pelo Alude (skill alude-boletos-mensais).
// • Lê: boletos_lote (do módulo; doc = mês de vencimento AAAA-MM), gravado pela skill no fim de cada lote.
// • Não grava nada. Sem CPF/CNPJ, telefone, e-mail ou conta bancária.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl = H.brl;
  const ID = 'boletos', CL = 'boletos_lote';
  const F = { mes: '', ord: 'venc', dir: 1 };
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const nomeMes = (m) => { const [a, b] = String(m || '').split('-'); return b ? MESES[+b - 1] + '/' + a : (m || '—'); };

  const SIT = {
    aguardando: ['Aguardando pagamento', 'info'], pago: ['Pago', 'ok'], pago_fora: ['Pago fora', 'ok'],
    atrasado: ['Em atraso', 'bad'], suspenso: ['Suspenso', 'warn'], cancelado: ['Cancelado', ''],
  };
  const pill = (s) => { const x = SIT[s] || [s || '—', '']; return `<span class="pill ${x[1]}">${esc(x[0])}</span>`; };

  // aceita o formato completo (boletos[]) e o primeiro registro do piloto (aprovados[] / suspensos[])
  function boletosDo(l) {
    if (Array.isArray(l.boletos)) return l.boletos;
    const a = (l.aprovados || []).map((b) => ({ ...b, status: 'aprovado', situacao: 'aguardando' }));
    const s = (l.suspensos || []).map((b) => ({ ...b, status: 'suspenso', situacao: 'suspenso' }));
    return a.concat(s);
  }
  // situação na data de hoje: boleto aprovado e não pago com vencimento passado vira "em atraso"
  function sitHoje(b) {
    if (b.status === 'suspenso') return 'suspenso';
    const s = b.situacao || 'aguardando';
    // 15/11/2026 (hub #24): vencimento em sábado, domingo ou feriado nacional passa para o próximo dia útil antes de virar atraso
    if (s === 'aguardando' && b.venc && (typeof H.diaUtil === 'function' ? H.diaUtil(b.venc) : b.venc) < H.hojeISO()) return 'atrasado';
    return s;
  }
  const lotes = () => H.lista(CL).sort((a, b) => String(b._id).localeCompare(String(a._id)));

  const CHAVES = {
    cod: (b) => b.cod || '', prop: (b) => b.proprietario || '', venc: (b) => b.venc || '',
    total: (b) => +b.total || 0, sit: (b) => sitHoje(b), email: (b) => b.primeiro_email || '9999',
  };
  const ROT = { cod: 'Cód.', prop: 'Proprietário / locatário', venc: 'Vencimento', total: 'Total', sit: 'Situação', email: '1º e-mail' };
  function ordena(L) {
    const k = CHAVES[F.ord] || CHAVES.venc;
    return L.slice().sort((a, b) => { const x = k(a), y = k(b); return (x > y ? 1 : x < y ? -1 : String(a.cod).localeCompare(String(b.cod))) * F.dir; });
  }
  const seta = (k) => (F.ord === k ? (F.dir > 0 ? ' ▲' : ' ▼') : ' ↕');
  // o núcleo já põe a ordenação por clique no cabeçalho de toda tabela; aqui o cabeçalho é só o texto
  const th = (k, cls) => `<th class="${cls || ''}">${ROT[k]}</th>`;
  const dtHora = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : esc(s); };

  const itensHtml = (b) => {
    const it = b.itens || [];
    if (!it.length) return '';
    return `<details><summary class="s" style="cursor:pointer">${it.length} itens</summary><div style="margin-top:6px;display:grid;gap:2px">${
      it.map((i) => { const v = +i.valor || 0; return `<div class="vlin"><span>${esc(i.nome)}</span><span class="vr ${v < 0 ? 'vmenos' : ''}">${v < 0 ? H.menos(-v) : brl(v)}</span></div>`; }).join('')
    }</div></details>`;
  };
  const partes = (b) => `${esc(b.proprietario || '—')}<span class="s">${esc(b.locatario || '')}</span>`;
  const linkAlude = (b) => (b.alude_url ? `<a class="btn" href="${escUrl(b.alude_url)}" target="_blank" rel="noopener">Abrir no Alude</a>` : '');

  function render() {
    const T = lotes();
    if (!T.length) return H.vazio(H.carregado[CL] ? 'Nenhum lote de boletos registrado ainda. O registro é feito pela skill alude-boletos-mensais ao fim de cada lote.' : 'Carregando…');
    if (!F.mes || !T.some((l) => l._id === F.mes)) F.mes = T[0]._id;
    const l = T.find((x) => x._id === F.mes);
    const B = boletosDo(l);
    const apr = B.filter((b) => b.status !== 'suspenso'), sus = B.filter((b) => b.status === 'suspenso');
    const tot = apr.reduce((s, b) => s + (+b.total || 0), 0);
    const cont = (s) => apr.filter((b) => sitHoje(b) === s).length;
    const pagos = cont('pago') + cont('pago_fora'), atr = cont('atrasado'), ag = cont('aguardando');

    const chips = `<div class="filtros">${T.map((x) => `<button class="btn" aria-pressed="${x._id === F.mes}" data-bol-mes="${esc(x._id)}" style="${x._id === F.mes ? 'border-color:var(--accent);font-weight:600' : ''}">${esc(nomeMes(x._id))}</button>`).join('')}</div>`;

    const cards = `<div class="resumo-cob">
      <div class="card"><div class="s">Boletos emitidos</div><div class="num">${apr.length}</div><div class="s">${brl(tot)}</div></div>
      <div class="card"><div class="s">Pagos</div><div class="num" style="color:var(--ok)">${pagos}</div><div class="s">aguardando: ${ag}</div></div>
      <div class="card"><div class="s">Em atraso</div><div class="num" style="color:var(--${atr ? 'bad' : 'muted'})">${atr}</div><div class="s">venceram sem pagamento</div></div>
      <div class="card"><div class="s">Suspensos</div><div class="num" style="color:var(--${sus.length ? 'warn' : 'muted'})">${sus.length}</div><div class="s">${sus.length ? 'atraso anterior' : 'nenhum'}</div></div>
    </div>`;

    const info = `<p class="nota">Gerado em ${dt(l.gerado_em)} · OK: ${esc(l.ok_por || '—')} · Envio: ${esc(l.envio || 'e-mail do Alude')}${l.situacao_lida_em ? ' · situação lida no Alude em ' + dtHora(l.situacao_lida_em) : ''}. Boleto aprovado que passa do vencimento sem baixa aparece "Em atraso"; a confirmação vem da aba Cobrança.</p>`;

    const ordMovel = `<div class="filtros ordenar-movel"><span class="s">Ordenar por</span>${Object.keys(ROT).map((k) => `<button class="btn" data-bol-ord="${k}">${ROT[k]}${seta(k)}</button>`).join('')}</div>`;

    const linhas = ordena(B).map((b) => `<tr id="bol-${esc(b.cod)}">
      <td class="cod">${esc(b.cod)}</td>
      <td>${partes(b)}${b.obs ? `<span class="s">${esc(b.obs)}</span>` : ''}${b.motivo ? `<span class="s" style="color:var(--warn)">${esc(b.motivo)}</span>` : ''}${itensHtml(b)}</td>
      <td>${dt(b.venc)}${b.ref ? `<span class="s">ref. ${esc(nomeMes(b.ref))}</span>` : ''}</td>
      <td class="n">${brl(+b.total || 0)}</td>
      <td>${pill(sitHoje(b))}</td>
      <td>${b.primeiro_email ? dt(b.primeiro_email) : '<span class="s">—</span>'}</td>
      <td>${linkAlude(b)}</td></tr>`).join('');

    const tabela = `<div class="tabela"><table><thead><tr>${th('cod')}${th('prop')}${th('venc')}${th('total', 'n')}${th('sit')}${th('email')}<th></th></tr></thead><tbody>${linhas}</tbody></table></div>`;

    const hist = T.length > 1 ? `<h2 style="margin-top:22px">Lotes anteriores</h2><div class="tabela"><table><thead><tr><th>Mês</th><th>Gerado em</th><th class="n">Boletos</th><th class="n">Total</th><th class="n">Suspensos</th></tr></thead><tbody>${
      T.map((x) => { const bb = boletosDo(x), a = bb.filter((b) => b.status !== 'suspenso'); return `<tr><td><button class="btn" data-bol-mes="${esc(x._id)}">${esc(nomeMes(x._id))}</button></td><td>${dt(x.gerado_em)}</td><td class="n">${a.length}</td><td class="n">${brl(a.reduce((s, b) => s + (+b.total || 0), 0))}</td><td class="n">${bb.length - a.length}</td></tr>`; }).join('')
    }</tbody></table></div>` : '';

    return `<h2>Boletos de ${esc(nomeMes(F.mes))}</h2>${info}${chips}${cards}${tabela}${hist}`;
  }

  H.registrar({
    id: ID, aba: 'Boletos', grupo: 'locacao', depois: 'fichas-locacao', colecoes: [CL], render,
    busca(q) {
      const t = String(q || '').toLowerCase(); if (!t) return [];
      const R = [];
      for (const l of lotes()) for (const b of boletosDo(l)) {
        const txt = [b.cod, b.proprietario, b.locatario].join(' ').toLowerCase();
        if (txt.includes(t)) R.push({ grp: 'Boletos', tit: `${b.cod} · boleto de ${nomeMes(l._id)}`, sub: `${b.proprietario || ''} / ${b.locatario || ''}`, ir: { aba: ID, linha: 'bol-' + b.cod, alvo: l._id } });
        if (R.length >= 8) return R;
      }
      return R;
    },
    foco(alvo) { if (alvo) { F.mes = alvo; H.pede(); } },
  });

  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-bol-mes]'); if (m) { F.mes = m.dataset.bolMes; H.pede(); return; }
    const o = e.target.closest('[data-bol-ord]'); if (o) { const k = o.dataset.bolOrd; if (F.ord === k) F.dir = -F.dir; else { F.ord = k; F.dir = 1; } H.pede(); }
  });
})();
