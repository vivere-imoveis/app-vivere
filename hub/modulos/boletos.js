// modulos/boletos.js — aba "Boletos" da Locação no HUB Vivere
// Versão 2026-11-25.2 (espelho do Alude, fatias 2 e 3): duas visões e os PDFs (boleto e recibo) de cada cobrança.
//  • "Por locação" (nova, padrão): todas as cobranças do Alude de cada locação — pagas, a pagar e em atraso —,
//    lidas de alude_cobrancas (espelho gravado pela porta alude-espelho a cada operação no Alude).
//  • "Lotes do mês" (a de 29/10/2026): cada lote mensal gerado pela skill alude-boletos-mensais (boletos_lote).
// Não grava nada. Sem CPF/CNPJ, telefone, e-mail ou conta bancária.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl = H.brl;
  const ID = 'boletos', CL = 'boletos_lote', CC = 'alude_cobrancas', CK = 'alude_contratos', CE = 'alude_espelho_controle';
  const F = { visao: 'locacao', filtro: 'abertas', cod: '', mes: '', ord: 'venc', dir: 1 };
  try { const v = localStorage.getItem('hubv.boletos.visao'); if (v === 'lotes' || v === 'locacao') F.visao = v; } catch (_) {}
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const nomeMes = (m) => { const [a, b] = String(m || '').split('-'); return b ? MESES[+b - 1] + '/' + a : (m || '—'); };
  const url = (u) => (typeof window.escUrl === 'function' ? window.escUrl(u) : esc(u));
  const hoje = () => H.hojeISO();
  const util = (d) => (d && typeof H.diaUtil === 'function' ? H.diaUtil(d) : d);
  const dtHora = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : esc(s); };

  const SIT = {
    aguardando: ['Aguardando pagamento', 'info'], pago: ['Pago', 'ok'], pago_fora: ['Pago fora', 'ok'],
    atrasado: ['Em atraso', 'bad'], suspenso: ['Suspenso', 'warn'], cancelado: ['Cancelado', ''],
    a_emitir: ['A emitir', ''], nao_emitido_vencido: ['Vencido sem boleto', 'bad'],
  };
  const pill = (s) => { const x = SIT[s] || [s || '—', '']; return `<span class="pill ${x[1]}">${esc(x[0])}</span>`; };
  const itensHtml = (it) => {
    it = it || [];
    if (!it.length) return '';
    return `<details><summary class="s" style="cursor:pointer">${it.length} itens</summary><div style="margin-top:6px;display:grid;gap:2px">${
      it.map((i) => { const v = +i.valor || 0; const nm = (i.nome || '') + (i.parcela ? ' ' + i.parcela : '') + (i.descricao ? ' (' + i.descricao + ')' : '');
        return `<div class="vlin"><span>${esc(nm)}</span><span class="vr ${v < 0 ? 'vmenos' : ''}">${v < 0 ? H.menos(-v) : brl(v)}</span></div>`; }).join('')
    }</div></details>`;
  };
  const ROT_ARQ = { boleto: 'Boleto PDF', recibo: 'Recibo PDF', relatorio_repasse: 'Relatório PDF' };
  // PDFs guardados na pasta da locação (fatia 3): busca o arquivo no Drive pelo nome e abre a subpasta no PC
  const arqHtml = (c) => {
    const A = c.arquivos || []; if (!A.length) return '';
    const base = typeof H.pastaDoCodigo === 'function' ? H.pastaDoCodigo(c.cod) : null;
    const sub = base ? base + '\\' + A[0].sub : '';
    return `<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">${A.map((a) => `<a class="btn" href="https://drive.google.com/drive/search?q=${encodeURIComponent('"' + String(a.nome).replace(/\.pdf$/i, '') + '"')}" target="_blank" rel="noopener" title="${esc(a.nome)}">${esc(ROT_ARQ[a.tipo] || 'PDF')}</a>`).join('')}${sub ? `<a class="btn pasta" href="abrirpasta:${encodeURIComponent(sub)}" target="_blank" rel="noopener" data-abrir-pasta="${esc(sub)}" title="Abre a pasta no Explorador e copia o caminho">Pasta</a>` : ''}</div>`;
  };
  const partes = (b) => `${esc(b.proprietario || '—')}<span class="s">${esc(b.locatario || '')}</span>`;
  const linkAlude = (u) => (u ? `<a class="btn" href="${url(u)}" target="_blank" rel="noopener">Abrir no Alude</a>` : '');
  const btn = (attr, val, rot, on) => `<button class="btn" data-${attr}="${esc(val)}" aria-pressed="${!!on}" style="${on ? 'border-color:var(--accent);font-weight:600' : ''}">${rot}</button>`;

  // ===== visão "Por locação" (espelho do Alude) =====
  function sitCob(c) {
    const s = c.situacao || '';
    if (s === 'aguardando' && util(c.venc_boleto || c.venc) < hoje()) return 'atrasado';
    if (s === 'a_emitir' && c.venc && util(c.venc) < hoje()) return 'nao_emitido_vencido';
    return s;
  }
  const aberta = (s) => s === 'aguardando' || s === 'atrasado' || s === 'nao_emitido_vencido';
  const atraso = (s) => s === 'atrasado' || s === 'nao_emitido_vencido';
  const pago = (s) => s === 'pago' || s === 'pago_fora';
  const cobs = () => H.lista(CC);
  const espelhoLido = () => { const e = H.lista(CE).find((x) => x._id === 'ultima_leitura'); return e && e.recebido_em; };
  const nota = () => { const r = espelhoLido(); return `<p class="nota">Espelho do Alude${r ? ' lido em ' + dtHora(new Date(r).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' })) : ' ainda não lido'}. Atualiza a cada operação feita pelo Claude no Alude e na rotina dos coletores. Boleto emitido que passa do vencimento (no próximo dia útil) sem baixa aparece "Em atraso" até a próxima leitura.</p>`; };

  function porLocacao() {
    const C = cobs();
    if (!C.length) return H.vazio(H.carregado[CC] ? 'O espelho do Alude ainda não foi gravado.' : 'Carregando…');
    const mesAtual = hoje().slice(0, 7);
    const comS = C.map((c) => ({ ...c, _s: sitCob(c) }));
    const abertas = comS.filter((c) => aberta(c._s)), atrasadas = comS.filter((c) => atraso(c._s));
    const pagasMes = comS.filter((c) => pago(c._s) && String(c.pago_em || '').slice(0, 7) === mesAtual);
    const soma = (L, f) => L.reduce((t, c) => t + (+(f ? c[f] : c.total) || 0), 0);
    const aEmitir = comS.filter((c) => c._s === 'a_emitir');

    const cards = `<div class="resumo-cob">
      <div class="card"><div class="s">A receber (emitidos)</div><div class="num">${abertas.length}</div><div class="s">${brl(soma(abertas))}</div></div>
      <div class="card"><div class="s">Em atraso</div><div class="num" style="color:var(--${atrasadas.length ? 'bad' : 'muted'})">${atrasadas.length}</div><div class="s">${brl(soma(atrasadas))}</div></div>
      <div class="card"><div class="s">Recebido em ${esc(nomeMes(mesAtual))}</div><div class="num" style="color:var(--ok)">${pagasMes.length}</div><div class="s">${brl(pagasMes.reduce((t, c) => t + (+(c.valor_pago != null ? c.valor_pago : c.total) || 0), 0))}</div></div>
      <div class="card"><div class="s">Ainda a emitir</div><div class="num">${aEmitir.length}</div><div class="s">próximos meses</div></div>
    </div>`;

    const filtros = `<div class="filtros">${btn('bol-filtro', 'abertas', 'A pagar e em atraso', F.filtro === 'abertas')}${btn('bol-filtro', 'atraso', 'Só em atraso', F.filtro === 'atraso')}${btn('bol-filtro', 'pagas', 'Pagas', F.filtro === 'pagas')}${btn('bol-filtro', 'todas', 'Todas', F.filtro === 'todas')}</div>`;

    const porCod = {};
    for (const c of comS) (porCod[c.cod] = porCod[c.cod] || []).push(c);
    const cods = Object.keys(porCod).sort((a, b) => (parseInt(a.slice(1)) || 0) - (parseInt(b.slice(1)) || 0));
    const codFiltro = `<div class="filtros">${btn('bol-cod', '', 'Todas as locações', !F.cod)}${cods.map((k) => btn('bol-cod', k, esc(k), F.cod === k)).join('')}</div>`;

    // resumo por locação
    const resumo = cods.filter((k) => !F.cod || k === F.cod).map((k) => {
      const L = porCod[k].slice().sort((a, b) => String(a.venc).localeCompare(String(b.venc)));
      const ab = L.filter((c) => aberta(c._s)), at = L.filter((c) => atraso(c._s));
      const prox = L.find((c) => c._s === 'aguardando') || L.find((c) => c._s === 'a_emitir');
      const ult = L.filter((c) => pago(c._s)).pop();
      const p = L[L.length - 1] || {};
      return `<tr id="bol-${esc(k)}">
        <td class="cod">${esc(k)}</td>
        <td>${partes(p)}</td>
        <td>${at.length ? `<span class="pill bad">${at.length} em atraso</span><span class="s">${brl(at.reduce((t, c) => t + (+c.total || 0), 0))}</span>` : '<span class="pill ok">Em dia</span>'}</td>
        <td>${prox ? `${dt(prox.venc_boleto || prox.venc)}<span class="s">${brl(+prox.total || 0)} · ${esc((SIT[prox._s] || [prox._s])[0])}</span>` : '<span class="s">—</span>'}</td>
        <td>${ult ? `${dt(ult.pago_em)}<span class="s">${brl(+(ult.valor_pago != null ? ult.valor_pago : ult.total) || 0)}${ult._s === 'pago_fora' ? ' · fora do Alude' : ''}</span>` : '<span class="s">—</span>'}</td>
        <td class="n">${ab.length}</td></tr>`;
    }).join('');
    const tabResumo = `<div class="tabela"><table><thead><tr><th>Cód.</th><th>Proprietário / locatário</th><th>Situação</th><th>Próximo a pagar</th><th>Último pagamento</th><th class="n">Em aberto</th></tr></thead><tbody>${resumo}</tbody></table></div>`;

    // lista detalhada
    const passa = (c) => (!F.cod || c.cod === F.cod) && (F.filtro === 'todas' ? true : F.filtro === 'pagas' ? pago(c._s) : F.filtro === 'atraso' ? atraso(c._s) : (aberta(c._s) || c._s === 'a_emitir'));
    const det = comS.filter(passa).sort((a, b) => {
      const x = String(a.venc), y = String(b.venc);
      return F.filtro === 'pagas' || F.filtro === 'todas' ? y.localeCompare(x) : x.localeCompare(y);
    });
    const PG = 100;
    const linhas = det.slice(0, PG).map((c) => `<tr>
      <td class="cod">${esc(c.cod)}</td>
      <td>${esc(nomeMes(c.ref))}<span class="s">${esc(c.locatario || '')}</span>${itensHtml(c.itens)}</td>
      <td>${dt(c.venc_boleto || c.venc)}${c.dias_atraso ? `<span class="s" style="color:var(--bad)">${c.dias_atraso} dias de atraso</span>` : ''}</td>
      <td class="n">${brl(+c.total || 0)}${(+c.multa_estimada || +c.juros_estimados) ? `<span class="s">+ multa e juros ${brl((+c.multa_estimada || 0) + (+c.juros_estimados || 0))}</span>` : ''}</td>
      <td>${pill(c._s)}${c.observacao ? `<span class="s">${esc(c.observacao)}</span>` : ''}</td>
      <td>${c.pago_em ? dt(c.pago_em) + (c.valor_pago != null ? `<span class="s">${brl(+c.valor_pago)}</span>` : '') : '<span class="s">—</span>'}</td>
      <td>${linkAlude(c.alude_url)}${arqHtml(c)}</td></tr>`).join('');
    const tabDet = `<h2 style="margin-top:22px">Cobranças${F.cod ? ' da ' + esc(F.cod) : ''}</h2>${filtros}
      <div class="tabela"><table><thead><tr><th>Cód.</th><th>Referência</th><th>Vencimento</th><th class="n">Total</th><th>Situação</th><th>Pago em</th><th></th></tr></thead><tbody>${linhas || '<tr><td colspan="7" class="s">Nenhuma cobrança neste filtro.</td></tr>'}</tbody></table></div>${det.length > PG ? `<p class="nota">Mostrando ${PG} de ${det.length}. Use o filtro por locação.</p>` : ''}`;

    return `${nota()}${cards}${codFiltro}${tabResumo}${tabDet}`;
  }

  // ===== visão "Lotes do mês" (boletos_lote) =====
  function boletosDo(l) {
    if (Array.isArray(l.boletos)) return l.boletos;
    const a = (l.aprovados || []).map((b) => ({ ...b, status: 'aprovado', situacao: 'aguardando' }));
    const s = (l.suspensos || []).map((b) => ({ ...b, status: 'suspenso', situacao: 'suspenso' }));
    return a.concat(s);
  }
  // situação de hoje: o espelho do Alude manda, quando tem a cobrança; senão vale o lote
  function sitLote(b) {
    if (b.status === 'suspenso') return 'suspenso';
    const id = String(b.alude_url || '').split('/billings/')[1];
    const e = id ? cobs().find((c) => c.cobranca_id === id) : null;
    if (e) return sitCob(e);
    const s = b.situacao || 'aguardando';
    if (s === 'aguardando' && b.venc && util(b.venc) < hoje()) return 'atrasado';
    return s;
  }
  const lotes = () => H.lista(CL).sort((a, b) => String(b._id).localeCompare(String(a._id)));
  const CHAVES = { cod: (b) => b.cod || '', venc: (b) => b.venc || '', total: (b) => +b.total || 0, sit: (b) => sitLote(b) };
  function ordena(L) { const k = CHAVES[F.ord] || CHAVES.venc; return L.slice().sort((a, b) => { const x = k(a), y = k(b); return (x > y ? 1 : x < y ? -1 : String(a.cod).localeCompare(String(b.cod))) * F.dir; }); }

  function porLote() {
    const T = lotes();
    if (!T.length) return H.vazio(H.carregado[CL] ? 'Nenhum lote de boletos registrado ainda.' : 'Carregando…');
    if (!F.mes || !T.some((l) => l._id === F.mes)) F.mes = T[0]._id;
    const l = T.find((x) => x._id === F.mes);
    const B = boletosDo(l);
    const apr = B.filter((b) => b.status !== 'suspenso'), sus = B.filter((b) => b.status === 'suspenso');
    const tot = apr.reduce((s, b) => s + (+b.total || 0), 0);
    const cont = (s) => apr.filter((b) => sitLote(b) === s).length;
    const pagos = cont('pago') + cont('pago_fora'), atr = cont('atrasado'), ag = cont('aguardando');
    const chips = `<div class="filtros">${T.map((x) => btn('bol-mes', x._id, esc(nomeMes(x._id)), x._id === F.mes)).join('')}</div>`;
    const cards = `<div class="resumo-cob">
      <div class="card"><div class="s">Boletos emitidos</div><div class="num">${apr.length}</div><div class="s">${brl(tot)}</div></div>
      <div class="card"><div class="s">Pagos</div><div class="num" style="color:var(--ok)">${pagos}</div><div class="s">aguardando: ${ag}</div></div>
      <div class="card"><div class="s">Em atraso</div><div class="num" style="color:var(--${atr ? 'bad' : 'muted'})">${atr}</div><div class="s">venceram sem pagamento</div></div>
      <div class="card"><div class="s">Suspensos</div><div class="num" style="color:var(--${sus.length ? 'warn' : 'muted'})">${sus.length}</div><div class="s">${sus.length ? 'atraso anterior' : 'nenhum'}</div></div>
    </div>`;
    const info = `<p class="nota">Gerado em ${dt(l.gerado_em)} · OK: ${esc(l.ok_por || '—')} · Envio: ${esc(l.envio || 'e-mail do Alude')}. A situação de cada boleto vem do espelho do Alude quando ele já tem a cobrança.</p>`;
    const linhas = ordena(B).map((b) => `<tr id="bol-${esc(b.cod)}-${esc(l._id)}">
      <td class="cod">${esc(b.cod)}</td>
      <td>${partes(b)}${b.obs ? `<span class="s">${esc(b.obs)}</span>` : ''}${b.motivo ? `<span class="s" style="color:var(--warn)">${esc(b.motivo)}</span>` : ''}${itensHtml(b.itens)}</td>
      <td>${dt(b.venc)}${b.ref ? `<span class="s">ref. ${esc(nomeMes(b.ref))}</span>` : ''}</td>
      <td class="n">${brl(+b.total || 0)}</td>
      <td>${pill(sitLote(b))}</td>
      <td>${b.primeiro_email ? dt(b.primeiro_email) : '<span class="s">—</span>'}</td>
      <td>${linkAlude(b.alude_url)}</td></tr>`).join('');
    const tabela = `<div class="tabela"><table><thead><tr><th>Cód.</th><th>Proprietário / locatário</th><th>Vencimento</th><th class="n">Total</th><th>Situação</th><th>1º e-mail</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>`;
    return `${info}${chips}${cards}${tabela}`;
  }

  function render() {
    const vis = `<div class="filtros">${btn('bol-visao', 'locacao', 'Por locação', F.visao === 'locacao')}${btn('bol-visao', 'lotes', 'Lotes do mês', F.visao === 'lotes')}</div>`;
    return `<h2>Boletos</h2>${vis}${F.visao === 'lotes' ? porLote() : porLocacao()}`;
  }

  H.registrar({
    id: ID, aba: 'Boletos', grupo: 'locacao', depois: 'fichas-locacao', colecoes: [CL, CC, CK, CE], render,
    busca(q) {
      const t = String(q || '').toLowerCase(); if (!t) return [];
      const R = []; const vistos = {};
      for (const c of cobs()) {
        if (vistos[c.cod]) continue;
        const txt = [c.cod, c.proprietario, c.locatario].join(' ').toLowerCase();
        if (txt.includes(t)) { vistos[c.cod] = 1; R.push({ grp: 'Boletos', tit: `${c.cod} · boletos da locação`, sub: `${c.proprietario || ''} / ${c.locatario || ''}`, ir: { aba: ID, linha: 'bol-' + c.cod, alvo: 'cod:' + c.cod } }); }
        if (R.length >= 8) break;
      }
      return R;
    },
    foco(alvo) {
      if (!alvo) return;
      if (String(alvo).startsWith('cod:')) { F.visao = 'locacao'; F.cod = String(alvo).slice(4); F.filtro = 'todas'; }
      else { F.visao = 'lotes'; F.mes = alvo; }
      H.pede();
    },
  });

  document.addEventListener('click', (e) => {
    const v = e.target.closest('[data-bol-visao]'); if (v) { F.visao = v.dataset.bolVisao; try { localStorage.setItem('hubv.boletos.visao', F.visao); } catch (_) {} H.pede(); return; }
    const f = e.target.closest('[data-bol-filtro]'); if (f) { F.filtro = f.dataset.bolFiltro; H.pede(); return; }
    const c = e.target.closest('[data-bol-cod]'); if (c) { F.cod = c.dataset.bolCod; H.pede(); return; }
    const m = e.target.closest('[data-bol-mes]'); if (m) { F.mes = m.dataset.bolMes; H.pede(); return; }
  });
})();
