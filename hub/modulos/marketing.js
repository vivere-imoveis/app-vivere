// modulos/marketing.js — aba "Marketing" (CRM) no HUB Vivere (construção "marketing", 21/11/2026)
// Pedido do Cleiton (21/11/2026): módulo de marketing e tráfego pago no HUB, a partir do histórico completo das campanhas
// do Instagram/Meta, para situar onde a Vivere está e estruturar a estratégia. Quatro visões aprovadas por ele:
// Visão geral · Campanhas · Funil · Estratégia.
// • Lê: marketing_campanhas (um doc por campanha da Meta, com os meses), marketing_contas, marketing_funil,
//   marketing_estrategia/atual e marketing_controle/info. Quem grava: a sessão que importa a exportação do Gerenciador
//   de Anúncios (sem rotina diária por enquanto). Só números e nomes de campanha: nenhum dado de lead.
// • Carga inicial: modulos/marketing-dados.js (window.HUB_MKT_IMPORT). Enquanto o banco estiver vazio, a aba mostra a carga
//   e o botão "Gravar no banco"; o clique grava cada documento pelo DB do núcleo (gravação dupla artefato + Supabase).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, brl = H.brl, brl0 = H.brl0;
  const ID = 'marketing';
  const C = { camp: 'marketing_campanhas', contas: 'marketing_contas', funil: 'marketing_funil', est: 'marketing_estrategia', ctl: 'marketing_controle' };
  const SUBS = [['visao', 'Visão geral'], ['campanhas', 'Campanhas'], ['funil', 'Funil'], ['estrategia', 'Estratégia']];
  const OBJ = { conversa: 'Conversa no WhatsApp', formulario: 'Cadastro (formulário)', alcance: 'Reconhecimento (alcance)', clique: 'Cliques', visita_perfil: 'Visitas ao perfil', engajamento: 'Engajamento', '?': 'Sem resultado medido' };
  const RES = { conversa: 'conversas', formulario: 'cadastros', alcance: 'pessoas alcançadas', clique: 'cliques', visita_perfil: 'visitas ao perfil', engajamento: 'engajamentos', '?': '—' };
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  const V = { sub: ls('hubv.mkt.sub') || 'visao', q: '', obj: '', ano: '', sit: '', ord: { k: 'gasto', dir: 'desc' }, pg: 0, pp: +(ls('hubv.mkt.pp') || 50) === 100 ? 100 : 50, aberto: {} };
  const n0 = (v) => (v == null || isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR'));
  const mesBR = (m) => { const x = String(m || '').match(/^(\d{4})-(\d{2})/); return x ? x[2] + '/' + x[1] : '—'; };
  const IMP = () => window.HUB_MKT_IMPORT || null;
  let pediuDados = false, gravando = '';
  const temBanco = () => H.lista(C.camp).length > 0;
  const L_ = (col) => { const l = H.lista(col); if (l.length) return l; const i = IMP(); return i && i[col] ? Object.entries(i[col]).map(([id, d]) => Object.assign({ _id: id }, d)) : []; };
  const O_ = (col) => { const s = H.S[col] || {}; if (Object.keys(s).length) return s; const i = IMP(); return (i && i[col]) || {}; };
  function pedeDados() { if (pediuDados || IMP()) return; pediuDados = true; const sc = document.createElement('script'); sc.src = 'modulos/marketing-dados.js?v=2026-11-21.1'; sc.onload = () => H.pede(); sc.onerror = () => { gravando = 'Não achei o arquivo da carga inicial.'; H.pede(); }; document.head.appendChild(sc); }
  async function gravaBanco() {
    const db = H.db && H.db(), i = IMP(); if (!db || !i) { gravando = 'O banco não está disponível nesta visualização.'; H.pede(); return; }
    const ops = []; Object.entries(i).forEach(([col, docs]) => Object.entries(docs).forEach(([id, d]) => ops.push([col, id, d])));
    let ok = 0;
    for (const [col, id, d] of ops) {
      try { await db.doc(col + '/' + id).set(d); ok++; } catch (e) { gravando = `Parou em ${ok} de ${ops.length}: ${(e && e.message) || e}`; H.pede(); return; }
      if (ok % 20 === 0) { gravando = `Gravando… ${ok} de ${ops.length}`; const el = document.getElementById('mkt-grava'); if (el) el.textContent = gravando; }
    }
    gravando = `Gravados ${ok} documentos no banco.`; H.pede();
  }
  const camps = () => L_(C.camp).filter((c) => c._id.charAt(0) !== '_');
  const gastoCel = (v) => `<td class="n ${v ? 'vmenos' : ''}" data-sens>${v ? H.menos(v) : '—'}</td>`;

  function nav() {
    return `<div class="filtros" role="tablist">${SUBS.map(([k, t]) => `<button class="btn" role="tab" aria-selected="${V.sub === k}" data-mkt-sub="${k}"${V.sub === k ? ' style="border-color:var(--accent);font-weight:600;background:var(--soft)"' : ''}>${t}</button>`).join('')}</div>`;
  }

  // ---------- Visão geral ----------
  function visao(L) {
    const conv = L.filter((c) => c.objetivo === 'conversa');
    const tot = L.reduce((s, c) => s + (+c.gasto || 0), 0), gc = conv.reduce((s, c) => s + (+c.gasto || 0), 0), nc = conv.reduce((s, c) => s + (+c.resultados || 0), 0);
    const ativas = L.filter((c) => c.situacao === 'ativa');
    const A = {}, M = {}, O = {};
    L.forEach((c) => {
      (c.meses || []).forEach(([m, g, r]) => {
        const a = m.slice(0, 4);
        A[a] = A[a] || { g: 0, c: new Set(), gc: 0, nc: 0 }; A[a].g += g; A[a].c.add(c._id);
        M[m] = M[m] || { g: 0, c: new Set(), gc: 0, nc: 0 }; M[m].g += g; M[m].c.add(c._id);
        if (c.objetivo === 'conversa') { A[a].gc += g; A[a].nc += r; M[m].gc += g; M[m].nc += r; }
      });
      const o = c.objetivo || '?'; O[o] = O[o] || { g: 0, r: 0, n: 0 }; O[o].g += +c.gasto || 0; O[o].r += +c.resultados || 0; O[o].n++;
    });
    const cpc = (g, r) => (r ? brl(g / r) : '—');
    const cards = `<div class="resumo-cob">
      <div class="card"><div class="s">Investido na Meta</div><div class="num vmenos" data-sens style="white-space:nowrap">${H.menos(tot, brl0)}</div><div class="s">${L.length} campanhas com gasto</div></div>
      <div class="card"><div class="s">Conversas no WhatsApp</div><div class="num">${n0(nc)}</div><div class="s">campanhas de mensagem</div></div>
      <div class="card"><div class="s">Custo médio por conversa</div><div class="num">${cpc(gc, nc)}</div><div class="s">todo o período</div></div>
      <div class="card"><div class="s">Ativas agora</div><div class="num" style="color:var(--${ativas.length ? 'ok' : 'muted'})">${ativas.length}</div><div class="s">${ativas.length ? esc(ativas.map((c) => c.nome).join(' · ')) : 'nenhuma'}</div></div>
    </div>`;
    const anos = Object.keys(A).sort().map((a) => `<tr><td><b>${a}</b></td>${gastoCel(A[a].g)}<td class="n">${A[a].c.size}</td><td class="n">${n0(A[a].nc)}</td><td class="n">${cpc(A[a].gc, A[a].nc)}</td></tr>`).join('');
    const objs = Object.entries(O).sort((x, y) => y[1].g - x[1].g).map(([o, x]) => `<tr><td>${esc(OBJ[o] || o)}</td>${gastoCel(x.g)}<td class="n">${x.n}</td><td class="n">${o === '?' ? '—' : n0(x.r) + ' ' + esc(RES[o] || '')}</td><td class="n">${o === '?' || o === 'alcance' ? '—' : cpc(x.g, x.r)}</td></tr>`).join('');
    const meses = Object.keys(M).sort().reverse().map((m) => `<tr><td>${mesBR(m)}</td>${gastoCel(M[m].g)}<td class="n">${M[m].c.size}</td><td class="n">${n0(M[m].nc)}</td><td class="n">${cpc(M[m].gc, M[m].nc)}</td></tr>`).join('');
    const contas = L_(C.contas).sort((a, b) => (+b.gasto || 0) - (+a.gasto || 0)).map((c) => `<tr><td><b>${esc(c.nome)}</b><span class="s">conta ${esc(c.act || '')}</span></td><td class="n">${n0(c.campanhas)}</td>${gastoCel(c.gasto)}<td>${esc(c.obs || '')}</td></tr>`).join('');
    return `${cards}
      <h3>Por ano</h3><div class="tabela"><table><thead><tr><th>Ano</th><th class="n">Investido</th><th class="n">Campanhas</th><th class="n">Conversas</th><th class="n">R$ por conversa</th></tr></thead><tbody>${anos}</tbody></table></div>
      <h3>Por objetivo</h3><div class="tabela"><table><thead><tr><th>Objetivo</th><th class="n">Investido</th><th class="n">Campanhas</th><th class="n">Resultados</th><th class="n">Custo por resultado</th></tr></thead><tbody>${objs}</tbody></table></div>
      <h3>Por mês</h3><div class="tabela"><table><thead><tr><th>Mês</th><th class="n">Investido</th><th class="n">Campanhas</th><th class="n">Conversas</th><th class="n">R$ por conversa</th></tr></thead><tbody>${meses}</tbody></table></div>
      ${contas ? `<h3>Contas de anúncio</h3><div class="tabela"><table><thead><tr><th>Conta</th><th class="n">Campanhas</th><th class="n">Investido</th><th>Observação</th></tr></thead><tbody>${contas}</tbody></table></div>` : ''}`;
  }

  // ---------- Campanhas ----------
  const ORD = {
    nome: ['Campanha', (c) => String(c.nome || '').toLowerCase()], obj: ['Objetivo', (c) => OBJ[c.objetivo] || ''], sit: ['Situação', (c) => c.situacao],
    inicio: ['Início', (c) => c.inicio], fim: ['Fim', (c) => c.fim], gasto: ['Investido', (c) => +c.gasto || 0],
    res: ['Resultados', (c) => +c.resultados || 0], custo: ['Custo por resultado', (c) => (c.custo == null || c.objetivo === 'alcance' ? null : +c.custo)],
    imp: ['Impressões', (c) => +c.impressoes || 0], cli: ['Cliques no link', (c) => +c.cliques || 0],
  };
  const NUM = { gasto: 1, res: 1, custo: 1, imp: 1, cli: 1 };
  const cmp = (a, b, dir) => { const va = a == null || a === '', vb = b == null || b === ''; if (va || vb) return va && vb ? 0 : va ? 1 : -1; const r = a < b ? -1 : a > b ? 1 : 0; return dir === 'asc' ? r : -r; };
  function filtradas(L) {
    const q = V.q.trim().toLowerCase();
    let R = L.filter((c) => (!V.obj || c.objetivo === V.obj) && (!V.sit || c.situacao === V.sit) && (!V.ano || (c.meses || []).some((m) => m[0].slice(0, 4) === V.ano)) && (!q || String(c.nome).toLowerCase().includes(q)));
    if (V.ord && ORD[V.ord.k]) { const f = ORD[V.ord.k][1]; R = R.slice().sort((a, b) => cmp(f(a), f(b), V.ord.dir)); }
    return R;
  }
  function campanhas(L) {
    const R = filtradas(L), anos = [...new Set(L.flatMap((c) => (c.meses || []).map((m) => m[0].slice(0, 4))))].sort().reverse();
    const nPg = Math.max(1, Math.ceil(R.length / V.pp)); if (V.pg >= nPg) V.pg = nPg - 1;
    const P = R.slice(V.pg * V.pp, V.pg * V.pp + V.pp);
    const g = R.reduce((s, c) => s + (+c.gasto || 0), 0);
    const filtros = `<div class="filtros">
      <input type="search" id="mkt-q" placeholder="Buscar campanha" value="${esc(V.q)}" aria-label="Buscar campanha">
      <select id="mkt-obj" aria-label="Objetivo"><option value="">Todos os objetivos</option>${Object.entries(OBJ).map(([k, t]) => `<option value="${k}"${V.obj === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <select id="mkt-ano" aria-label="Ano"><option value="">Todos os anos</option>${anos.map((a) => `<option${V.ano === a ? ' selected' : ''}>${a}</option>`).join('')}</select>
      <select id="mkt-sit" aria-label="Situação"><option value="">Ativas e pausadas</option><option value="ativa"${V.sit === 'ativa' ? ' selected' : ''}>Só ativas</option><option value="pausada"${V.sit === 'pausada' ? ' selected' : ''}>Só pausadas</option></select>
    </div>`;
    const pag = nPg > 1 || R.length > 50 ? `<div class="filtros" style="align-items:center"><button class="btn" data-mkt-pg="-1"${V.pg ? '' : ' disabled'}>‹ Anterior</button><span class="s">Página ${V.pg + 1} de ${nPg}</span><button class="btn" data-mkt-pg="1"${V.pg < nPg - 1 ? '' : ' disabled'}>Próxima ›</button><label class="s">Por página <select id="mkt-pp"><option${V.pp === 50 ? ' selected' : ''}>50</option><option${V.pp === 100 ? ' selected' : ''}>100</option></select></label></div>` : '';
    const th = Object.entries(ORD).map(([k, [rot]]) => { const d = V.ord && V.ord.k === k ? V.ord.dir : ''; return `<th class="ord${NUM[k] ? ' n' : ''}" data-mkt-ord="${k}" tabindex="0" role="button"${d ? ` data-dir="${d}" aria-sort="${d === 'asc' ? 'ascending' : 'descending'}"` : ''} title="Ordenar: 1º clique maior → menor, 2º menor → maior, 3º volta">${rot}</th>`; }).join('');
    const linhas = P.map((c) => {
      const ab = V.aberto[c._id], cus = c.custo == null || c.objetivo === 'alcance' ? '—' : brl(c.custo);
      const det = ab ? `<tr><td colspan="10"><div class="s" style="margin-bottom:4px">Mês a mês</div><div class="filtros" style="margin:0">${(c.meses || []).map(([m, g, r]) => `<span class="pill">${mesBR(m)} · ${brl0(g)} · ${n0(r)} ${esc(RES[c.objetivo] || '')}</span>`).join('')}</div></td></tr>` : '';
      return `<tr id="mkt-${esc(c._id)}"><td><button class="btn" style="all:unset;cursor:pointer;font-weight:600" data-mkt-abre="${esc(c._id)}" aria-expanded="${!!ab}">${ab ? '▾' : '▸'} ${esc(c.nome)}</button></td>
        <td>${esc(OBJ[c.objetivo] || c.objetivo)}</td><td>${c.situacao === 'ativa' ? '<span class="pill ok">Ativa</span>' : '<span class="pill">Pausada</span>'}</td>
        <td>${mesBR(c.inicio)}</td><td>${mesBR(c.fim)}</td>${gastoCel(c.gasto)}<td class="n">${c.objetivo === '?' ? '—' : n0(c.resultados)}</td><td class="n">${cus}</td><td class="n">${n0(c.impressoes)}</td><td class="n">${n0(c.cliques)}</td></tr>${det}`;
    }).join('');
    return `${filtros}<p class="nota">${R.length} campanha${R.length === 1 ? '' : 's'} · investido <span data-sens>${brl(g)}</span>. Clique no nome para ver mês a mês.</p>${pag}
      <div class="tabela"><table data-ord-dados="1"><thead><tr>${th}</tr></thead><tbody>${linhas || '<tr><td colspan="10">Nenhuma campanha com esses filtros.</td></tr>'}</tbody></table></div>${nPg > 1 ? pag : ''}`;
  }

  // ---------- Funil (ao vivo: leads do HUB × investimento da Meta no mesmo período) ----------
  // Fonte dos leads: leads_contatos (planilhas "Leads tráfego 2026", Canal Pro, Repasses VISTA), status do lead e etapa do CRM
  // (crm_etapas / crm_leads, mesmo id). Campanha da planilha → campanhas da Meta pela chave (MAPA; marketing_mapa/<aba> sobrepõe) e
  // pelos meses em que a aba recebeu leads.
  const semAc = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const MAPA = { 'MICHELLE': 'MICHELLE', 'VILA DOS ACORES': 'VILA DOS ACORES', 'QUAY 202 T3': 'QUAY', 'JARDIM CAMPECHE LU': 'JARDIM', 'FRANCES': 'FRANCES', 'CORREGO': 'CORREGO', 'WYNN': 'WYNN', 'LOTEAMENTOS SUL': 'LOTEAMENTO', 'SHIRAZ': 'SHIRAZ', 'THAI': 'THAI', 'PATIO GAICO': 'PATIO' };
  const VISITA_ET = new Set(['Visita feita', 'Proposta', 'Negociação', 'Fechado']);
  const abaDe = (c) => String(c || '').replace(/^(Meta-Ads|Google-Ads)\s*/i, '').trim();
  function chaveMeta(camp) {
    const m = (H.S.marketing_mapa || {})[camp]; if (m && m.chave) return semAc(m.chave);
    if (/^Google-Ads/i.test(camp)) return '';
    if (/^Repasses VISTA/i.test(camp)) return ''; // leads repassados pela construtora (plantão), não vêm de campanha da Vivere
    const k = semAc(abaDe(camp)); return MAPA[k] || k;
  }
  function funilVivo() {
    const S = H.S, crm = S.crm_leads || {}, et = S.crm_etapas || {};
    const G = {};
    H.lista('leads_contatos').forEach((l) => {
      const c = l.campanha; if (!c || !/^(Meta-Ads|Google-Ads|Repasses VISTA)/i.test(c)) return;
      const k = c.replace(/\s+—.*$/, ''); const g = G[k] = G[k] || { campanha: k, n: 0, pessoas: new Set(), and: 0, vis: 0, ven: 0, desc: 0, m0: '9999', m1: '0000' };
      g.n++; g.pessoas.add(l.h || l._id);
      const m = l.mes || String(l.data || '').slice(0, 7); if (m) { if (m < g.m0) g.m0 = m; if (m > g.m1) g.m1 = m; }
      const etapa = (et[l._id] && et[l._id].etapa) || (crm[l._id] && crm[l._id].etapa) || '';
      const st = l.status || '';
      if ((st && st !== 'sem_registro' && st !== 'sem_status') || (etapa && etapa !== 'Novo')) g.and++;
      if (st === 'visita' || st === 'vendido' || VISITA_ET.has(etapa)) g.vis++;
      if (st === 'vendido' || etapa === 'Fechado') g.ven++;
      if (st === 'descartado' || etapa === 'Perdido') g.desc++;
    });
    // leads trabalhados no app dos corretores (paineis_leads, espelho do app): etapa real do funil de cada corretor
    H.lista('paineis_leads').forEach((l) => {
      const c = l.campanha; if (!c || !/^(Meta-Ads|Google-Ads|Repasses VISTA)/i.test(c)) return;
      const k = c.replace(/\s+—.*$/, ''); const g = G[k] = G[k] || { campanha: k, n: 0, pessoas: new Set(), and: 0, vis: 0, ven: 0, desc: 0, m0: '9999', m1: '0000' };
      g.app = g.app || { n: 0, and: 0, vis: 0, ven: 0 }; g.app.n++;
      const e = l.etapa || 'Novo'; if (e !== 'Novo') g.app.and++; if (VISITA_ET.has(e)) g.app.vis++; if (e === 'Fechado') g.app.ven++;
      const m = String(l.entrada || '').slice(0, 7); if (m && !g.n) { if (m < g.m0) g.m0 = m; if (m > g.m1) g.m1 = m; }
    });
    Object.values(G).forEach((g) => { const a = g.app; g.nt = Math.max(g.n, a ? a.n : 0); if (!a) return; g.vis = Math.max(g.vis, a.vis); g.ven = Math.max(g.ven, a.ven); if (a.n && a.and / a.n > (g.n ? g.and / g.n : 0)) { g.andApp = a.and / a.n; } });
    const C0 = camps();
    return Object.values(G).map((g) => {
      const ch = chaveMeta(g.campanha); let gasto = 0, conv = 0, med = false; const nomes = new Set();
      if (ch) C0.forEach((c) => { if (!semAc(c.nome).includes(ch)) return; (c.meses || []).forEach(([m, gs, r]) => { if (m < g.m0 || m > g.m1) return; gasto += gs; nomes.add(c.nome); if (c.objetivo === 'conversa') { conv += r; med = true; } else if (c.objetivo === 'formulario' && ch === 'VISTA') { conv += r; med = true; } }); });
      return Object.assign(g, { chave: ch, gasto, conv: med ? conv : null, metaNomes: [...nomes], google: /^Google-Ads/i.test(g.campanha) });
    }).sort((a, b) => b.gasto - a.gasto || b.nt - a.nt);
  }
  function funil() {
    if (!H.carregado.leads_contatos) return H.vazio('Carregando os leads…');
    const F = funilVivo();
    if (!F.length) return H.vazio('Nenhum lead de campanha na base do HUB.');
    const pct = (a, b) => (a ? Math.round((b / a) * 100) + '%' : '—');
    const FX = L_(C.funil);
    const obsDe = (ch) => { if (!ch) return ''; const x = FX.find((d) => semAc(d.campanha).includes(ch) || ch.includes(semAc(d.campanha).split(' ')[0])); return (x && x.obs) || ''; };
    const TA = F.reduce((s, f) => ({ n: s.n + ((f.app || {}).n || 0) }), { n: 0 });
    const T = F.reduce((s, f) => ({ g: s.g + f.gasto, n: s.n + f.nt, v: s.v + f.vis, ve: s.ve + f.ven, a: s.a + f.and }), { g: 0, n: 0, v: 0, ve: 0, a: 0 });
    const cards = `<div class="resumo-cob">
      <div class="card"><div class="s">Leads de campanha no HUB</div><div class="num">${n0(T.n)}</div><div class="s">${F.length} campanhas (planilha ou app, o maior)</div></div>
      <div class="card"><div class="s">Com andamento registrado</div><div class="num">${pct(F.reduce((s, f) => s + f.n, 0), T.a)}</div><div class="s">${n0(T.a)} de ${n0(F.reduce((s, f) => s + f.n, 0))} na planilha · ${n0(TA.n)} no app dos corretores</div></div>
      <div class="card"><div class="s">Visitas</div><div class="num">${n0(T.v)}</div><div class="s">status visita ou etapa de visita em diante</div></div>
      <div class="card"><div class="s">Vendas</div><div class="num" style="color:var(--${T.ve ? 'ok' : 'muted'})">${n0(T.ve)}</div><div class="s">status vendido ou etapa Fechado</div></div>
    </div>`;
    const linhas = F.map((f) => {
      const per = f.m0 === '9999' ? '—' : f.m0 === f.m1 ? mesBR(f.m0) : mesBR(f.m0) + ' a ' + mesBR(f.m1);
      const o = obsDe(f.chave);
      const conv = f.google ? '<span class="pill">Google</span>' : !f.chave ? '<span class="pill">repasse</span>' : f.conv == null ? (f.gasto ? '<span class="pill warn">não medido</span>' : '<span class="pill">sem campanha</span>') : n0(f.conv);
      return `<tr><td><b>${esc(f.google ? 'Google Ads' : abaDe(f.campanha) || f.campanha)}</b><span class="s">${esc(f.campanha)}${f.metaNomes.length ? ' · Meta: ' + esc(f.metaNomes.join(' · ')) : ''}</span></td><td>${per}</td>
        ${f.gasto ? gastoCel(f.gasto) : '<td class="n">—</td>'}<td class="n">${conv}</td><td class="n">${n0(f.nt)}${f.nt > f.n ? '<span class="s">no app</span>' : f.pessoas.size < f.n ? `<span class="s">${f.pessoas.size} pessoas</span>` : ''}</td>
        <td class="n">${f.conv && f.nt <= f.conv ? pct(f.conv, f.nt) : f.conv ? '<span class="pill warn">' + pct(f.conv, f.nt) + '</span>' : '—'}</td><td class="n">${f.n ? pct(f.n, f.and) : '—'}${f.app ? `<span class="s">app: ${n0(f.app.n)} · ${pct(f.app.n, f.app.and)}</span>` : ''}</td><td class="n">${n0(f.vis)}</td><td class="n">${n0(f.ven)}</td>
        <td class="n">${f.gasto && f.nt ? brl(f.gasto / f.nt) : '—'}</td><td>${esc(o)}</td></tr>`;
    }).join('');
    return `${cards}<p class="nota">Ao vivo: cada lead de campanha da base do HUB (planilhas de leads) com o status e a etapa do CRM, e o andamento no app dos corretores (etapa do funil), cruzado com o investimento e as conversas da Meta nos meses em que a campanha recebeu leads. Visitas e vendas = o maior entre a planilha e o app. "Registro" = leads registrados ÷ conversas da Meta.</p>
      <div class="tabela"><table><thead><tr><th>Campanha</th><th>Período</th><th class="n">Investido</th><th class="n">Conversas (Meta)</th><th class="n">Leads</th><th class="n">Registro</th><th class="n">Com andamento</th><th class="n">Visitas</th><th class="n">Vendas</th><th class="n">R$ por lead</th><th>Observação</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  // ---------- Estratégia ----------
  function estrategia() {
    const E = O_(C.est).atual;
    if (!E) return H.vazio(H.carregado[C.est] ? 'A estratégia ainda não foi gravada.' : 'Carregando…');
    const li = (a) => `<ol style="margin:6px 0 0 18px;padding:0">${(a || []).map((x) => `<li style="margin:4px 0">${esc(x)}</li>`).join('')}</ol>`;
    return `<div class="card" style="margin-bottom:12px"><b>Diagnóstico</b>${li(E.diagnostico)}</div>
      <div class="card" style="margin-bottom:12px"><b>Propostas para decidir</b> <span class="pill warn">sugestões do Claude</span>${li(E.propostas)}</div>
      <div class="card" style="margin-bottom:12px"><b>Pendências</b>${li(E.pendencias)}</div>
      <p class="nota">Atualizado em ${esc(H.dt(E.atualizado_em) || E.atualizado_em || '')} · ${esc(E.fonte || '')}</p>`;
  }

  function render() {
    const L = camps();
    if (!L.length) { if (H.carregado[C.camp]) pedeDados(); return '<h2>Marketing e tráfego pago</h2>' + H.vazio(H.carregado[C.camp] && pediuDados && gravando ? gravando : 'Carregando…'); }
    const aviso = !temBanco() ? `<div class="card" style="margin-bottom:12px;border-color:var(--warn-selo)"><b>Histórico ainda não gravado no banco</b><div class="s" style="margin:4px 0 8px">Esta tela mostra a carga importada em 21/11/2026. Grave no banco para a Vivian e os painéis poderem ler (gravação no artefato e no Supabase).</div><button class="btn" data-mkt-grava style="border-color:var(--accent);font-weight:600">Gravar no banco</button> <span class="s" id="mkt-grava">${esc(gravando)}</span></div>` : (gravando ? `<p class="nota">${esc(gravando)}</p>` : '');
    const I = O_(C.ctl).info || {};
    const corpo = V.sub === 'campanhas' ? campanhas(L) : V.sub === 'funil' ? funil() : V.sub === 'estrategia' ? estrategia() : visao(L);
    return `<h2>Marketing e tráfego pago</h2>
      <p class="nota">Meta Ads (Facebook e Instagram) · ${esc(I.periodo || '')}${I.importado_em ? ' · importado em ' + esc(H.dt(I.importado_em) || I.importado_em) : ''}. Google Ads entra quando o acesso for liberado.</p>
      ${aviso}${nav()}<div id="mkt-res">${corpo}</div>`;
  }
  const redesenha = () => { const el = document.getElementById('mkt-res'); if (el && V.sub === 'campanhas') el.innerHTML = campanhas(camps()); else H.pede(); };

  H.registrar({
    id: ID, aba: 'Marketing', grupo: 'crm', depois: 'portais', colecoes: [C.camp, C.contas, C.funil, C.est, C.ctl, 'marketing_mapa', 'leads_contatos', 'crm_leads', 'crm_etapas', 'paineis_leads'], render,
    busca(q) {
      const t = String(q || '').toLowerCase(); if (!t) return [];
      return camps().filter((c) => String(c.nome).toLowerCase().includes(t)).slice(0, 8)
        .map((c) => ({ grp: 'Marketing', tit: c.nome, sub: `${OBJ[c.objetivo] || ''} · ${brl0(c.gasto)} · ${mesBR(c.inicio)} a ${mesBR(c.fim)}`, ir: { aba: ID, linha: 'mkt-' + c._id } }));
    },
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-mkt-grava]')) { if (!gravando || /^Parou|^O banco|^Não/.test(gravando)) { gravando = 'Gravando…'; H.pede(); gravaBanco(); } return; }
    const s = e.target.closest('[data-mkt-sub]'); if (s) { V.sub = s.dataset.mktSub; ls('hubv.mkt.sub', V.sub); H.pede(); return; }
    const o = e.target.closest('[data-mkt-ord]'); if (o) { const k = o.dataset.mktOrd; V.ord = !V.ord || V.ord.k !== k ? { k, dir: 'desc' } : V.ord.dir === 'desc' ? { k, dir: 'asc' } : null; V.pg = 0; redesenha(); return; }
    const p = e.target.closest('[data-mkt-pg]'); if (p) { V.pg = Math.max(0, V.pg + (+p.dataset.mktPg)); redesenha(); return; }
    const a = e.target.closest('[data-mkt-abre]'); if (a) { const id = a.dataset.mktAbre; V.aberto[id] = !V.aberto[id]; redesenha(); }
  });
  document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-mkt-ord]')) { e.preventDefault(); e.target.click(); } });
  document.addEventListener('input', (e) => { if (e.target.id === 'mkt-q') { V.q = e.target.value; V.pg = 0; const el = document.getElementById('mkt-res'); if (el) { el.innerHTML = campanhas(camps()); const i = document.getElementById('mkt-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } } });
  document.addEventListener('change', (e) => {
    const id = e.target.id; if (!/^mkt-(obj|ano|sit|pp)$/.test(id)) return;
    if (id === 'mkt-pp') { V.pp = +e.target.value === 100 ? 100 : 50; ls('hubv.mkt.pp', String(V.pp)); } else V[id.slice(4)] = e.target.value;
    V.pg = 0; redesenha();
  });
})();
