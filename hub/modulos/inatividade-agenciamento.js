// modulos/inatividade-agenciamento.js — aba "Agenciamentos" do Comercial no HUB Vivere (construção "inatividade-agenciamento", 24/10/2026)
// Contrato: _hub\modulos\LEIA-ME.md.
// REGRA NOVA (Cleiton, 16/11/2026 e 17/11/2026 — tarefa vis-agenciamento-regra-placa-60dias; substitui a de 24/10/2026):
//   • parte do agenciador na comissão = 10% sem placa · 15% com placa · 20% com placa + autorização com exclusividade assinada
//     pelo proprietário (com prazo); vale para venda e locação; vale a situação NO DIA DO FECHAMENTO (o HUB mostra a de hoje);
//     placa "não permitida" (proprietário ou condomínio não deixa) conta como SEM placa.
//   • exclusividade = campo próprio do HUB (inatividade-agenciamento_exclusividade/<REF>), só conta com o termo assinado anexado
//     (link do Drive) e dentro do prazo; vencida volta a 15%. App, cadastro novo e Vivian só sugerem (exclusivo_informado).
//   • atualização periódica em até 60 dias (registro do corretor no app, no CRM ou na Vivian); 1º aviso no 30º dia, 2º no 45º;
//     no 60º sem atualização o agenciamento fica 50% imobiliária e 50% corretor, DE VEZ (não volta ao atualizar depois).
//   • VIGÊNCIA: a partir de 25/11/2026 (config.vigente = true e config.vigencia_desde), sem retroagir. Só no HUB (nível
//     diretoria): os corretores ainda não veem (decisão de 17/11/2026: "para os corretores só depois da semana que vem").
// Regra anterior (24/10/2026, reunião com a Fernanda de 20/10/2026): 20% fixo, aviso no 20º dia, divisão 10/10 no 30º.
// Aviso prévio de documentação (Cleiton, 26/10/2026): sem escritura pública, sem matrícula individualizada ou de posse, a Vivere não negocia;
//   vigora após as definições do contrato de cessão da Lagoa. Só texto na aba (docHTML).
// Regra de leads e clientes (Cleiton, 24/10/2026), em vigor já: cliente não tem dono; prioridade e comissão são de quem levar na
//   visita e fechar o negócio. Só texto na aba (leadsHTML); também em cadastro-corretores_config/geral e no painel METAS.
// • Lê: imoveis (núcleo), imoveis_divulgacao (placa por anúncio), cadastro-corretores_fichas (vínculo Diretoria) e as coleções próprias.
// • Eventos (inatividade-agenciamento_eventos) chegam sozinhos pelos gatilhos do Supabase (migração agenciamento_regra_60d_f1,
//   17/11/2026): revisão de agenciamento da Vivian (origem vivian) e evento do app (origem app):
//   {ref, imovel_id, tipo: conversa|visita|fotos|descricao|valor|outro, em: 'AAAA-MM-DD', por: 'corretor'|'vivere', corretor, origem,
//    exclusivo_informado?: 'sim'|'nao'}. Descartado/apagado = removido_em.
// • Grava (só com a regra vigente, ao abrir a aba com o banco): inatividade-agenciamento_avisos/<ref>-<base>-30 e -45 e
//   inatividade-agenciamento_divisoes/<ref>. Antes da vigência a aba é só prévia e não grava nada disso.
// • Grava (pelo formulário, a qualquer tempo): inatividade-agenciamento_exclusividade/<REF> {ref, exclusivo, assinada_em, vence_em,
//   documento, por, em, historico}. Nada se apaga: desmarcar = exclusivo false.
// • Sem CPF/CNPJ, telefone, e-mail ou conta bancária.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt;
  const ID = 'inatividade-agenciamento';
  const C_CFG = ID + '_config', C_EV = ID + '_eventos', C_AV = ID + '_avisos', C_DIV = ID + '_divisoes', C_EXC = ID + '_exclusividade';
  const C_DV = 'imoveis_divulgacao';
  const PAD = {
    vigente: false, vigencia_desde: null, condicao_vigencia: 'módulo atualizado e a regra ligada pela diretoria',
    dias_aviso: 30, dias_aviso2: 45, dias_divisao: 60, divisao: { corretor: 50, vivere: 50 },
    pct_por_situacao: { sem_placa: 10, com_placa: 15, com_placa_e_exclusividade: 20 },
    excluir_diretoria: true,
    eventos_validos: ['conversa', 'visita', 'fotos', 'descricao', 'valor', 'outro'],
  };
  const EV_TXT = { conversa: 'conversa com o proprietário', visita: 'visita', fotos: 'fotos', descricao: 'descrição', valor: 'valor', outro: 'outra atualização' };
  const ORIG_TXT = { vivian: 'pela Vivian', app: 'no app', crm: 'no CRM', manual: 'manual' };
  const QUEM = ['Cleiton', 'Deivis', 'Luciano', 'Nícollas', 'William'];
  const F = { st: 'todos', cor: '', q: '', foco: '', pct: '', exc: null, excMsg: '', pz: '', fx: '' };
  const hoje = () => H.hojeISO();
  const dias = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(String(a).slice(0, 10) + 'T12:00:00')) / 864e5);
  const somaDias = (iso, n) => new Date(Date.parse(String(iso).slice(0, 10) + 'T12:00:00') + n * 864e5).toISOString().slice(0, 10);
  const cfg = () => {
    const g = ((H.S[C_CFG] || {}).geral) || {}, c = Object.assign({}, PAD, g);
    c.divisao = Object.assign({}, PAD.divisao, g.divisao || {});
    c.pct_por_situacao = Object.assign({}, PAD.pct_por_situacao, g.pct_por_situacao || {});
    return c;
  };
  const semAc = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const vigente = (c) => !!(c.vigente && c.vigencia_desde && c.vigencia_desde <= hoje());
  const agendada = (c) => !!(c.vigente && c.vigencia_desde && c.vigencia_desde > hoje()); // ligada, começa a contar depois
  const agora = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
  const vivos = (k) => H.lista(k).filter((x) => !x.removido_em);
  const DRIVE = /^https:\/\/drive\.google\.com\/\S+$/;
  const ISO = /^\d{4}-\d{2}-\d{2}$/;

  // ------------------------------------------------------------ corretor do agenciamento
  function corretorDe(nome) {
    const P = window.HUB_PESSOAS; let id = '';
    try { id = (P && P.id && P.id(String(nome || ''), { fonte: 'corretor' })) || ''; } catch (e) { id = ''; }
    let txt = String(nome || '').trim();
    try { const p = id && P.pessoa(id); if (p && p.nome) txt = p.nome; } catch (e) {}
    try { const e = (id && H.nomeCorK && H.nomeCorK(id)) || (H.op && H.op.nomeCorretor ? H.op.nomeCorretor(nome) : ''); if (e) txt = e; } catch (e) {} // nome e último sobrenome; ex-corretor = Vivere (<nome>) (25/11/2026)
    const FX = H.S['cadastro-corretores_fichas'] || {}, n0 = semAc(nome).trim();
    // sem o módulo Pessoas, acha a ficha pelo nome ("Deivis Vieira" casa com "Deivis Vieira Gomes")
    if (!id && n0) { const k = Object.keys(FX).find((f) => [FX[f].nome, FX[f].nome_completo].some((v) => v && (semAc(v).trim() === n0 || semAc(v).trim().startsWith(n0 + ' ')))); if (k) id = k; }
    const ficha = id ? (FX[id] || null) : null;
    return { id, chave: id || 'n:' + semAc(nome).trim(), nome: txt || '—', diretoria: !!(ficha && ficha.vinculo === 'diretoria') };
  }

  // ------------------------------------------------------------ agenciamentos: um por ref., com anúncio ativo e agenciador
  function agenciamentos() {
    const m = new Map();
    H.lista('imoveis').forEach((x) => {
      if (!x.ativo) return; const ref = String(x.ref || '').trim().toUpperCase(); if (!ref) return;
      const g = m.get(ref) || { ref, ids: [], nomeCor: '', bairro: '', tipo: '', atualizado: '', cadastrado: '' };
      g.ids.push(x._id); if (!g.nomeCor && x.corretor) g.nomeCor = x.corretor;
      if (!g.bairro && x.bairro) g.bairro = x.bairro; if (!g.tipo && x.tipo) g.tipo = x.tipo;
      if (x.atualizado_em && x.atualizado_em > g.atualizado) g.atualizado = x.atualizado_em;
      if (x.cadastrado_em && (!g.cadastrado || x.cadastrado_em < g.cadastrado)) g.cadastrado = x.cadastrado_em;
      m.set(ref, g);
    });
    return [...m.values()].filter((g) => g.nomeCor).map((g) => Object.assign(g, { cor: corretorDe(g.nomeCor) }));
  }
  // eventos por ref., lidos uma vez por desenho
  function eventosPorRef() {
    const M = new Map();
    vivos(C_EV).forEach((e) => { const r = String(e.ref || '').toUpperCase(); if (!r || !e.em) return; (M.get(r) || M.set(r, []).get(r)).push(e); });
    return M;
  }
  function ultimoEvento(evs, c) {
    let u = null; const ok = new Set(c.eventos_validos || []);
    (evs || []).forEach((e) => { if (e.por === 'vivere' || !ok.has(e.tipo)) return; if (!u || e.em > u.em) u = e; });
    return u;
  }

  // ------------------------------------------------------------ comissão do agenciador (situação de hoje)
  function placaDe(g) {
    const D = H.S[C_DV] || {}; const s = g.ids.map((id) => ((D[id] || {}).placa || {}).situacao).filter(Boolean);
    return s.includes('sim') ? 'sim' : s.includes('nao_permitido') ? 'nao_permitido' : s.includes('ainda_nao') ? 'ainda_nao' : '';
  }
  function exclusividade(ref) {
    const x = (H.S[C_EXC] || {})[ref];
    if (!x || x.removido_em) return { st: '', x: null };
    if (!x.exclusivo) return { st: 'nao', x };
    if (!ISO.test(String(x.assinada_em || '')) || !ISO.test(String(x.vence_em || '')) || !DRIVE.test(String(x.documento || ''))) return { st: 'incompleta', x };
    if (x.vence_em < hoje()) return { st: 'vencida', x };
    return { st: 'valida', x };
  }
  function comissao(g, c, evs) {
    const P = c.pct_por_situacao, placa = placaDe(g), e = exclusividade(g.ref);
    const pct = placa === 'sim' ? (e.st === 'valida' ? P.com_placa_e_exclusividade : P.com_placa) : P.sem_placa;
    // dica da Vivian: o último evento que informou exclusividade (só sugere; não muda o percentual)
    let dica = null; (evs || []).forEach((v) => { if (v.exclusivo_informado && (!dica || v.em > dica.em)) dica = v; });
    return { pct, placa, exc: e, dica: dica && dica.exclusivo_informado === 'sim' && e.st !== 'valida' ? dica : null };
  }

  // ------------------------------------------------------------ situação de cada agenciamento
  // vigente: base = registro mais recente do corretor (app, CRM ou Vivian), nunca antes da data de vigência (não retroage).
  // prévia: base = atualização do anúncio no Imobibrasil — só para dar a dimensão, sem efeito nenhum.
  function situacao(g, c, evs) {
    const vig = vigente(c), div = (H.S[C_DIV] || {})[g.ref];
    if (div && !div.removido_em && div.situacao !== 'anulada') return { st: 'dividido', base: div.base, dias: div.dias, div, vig };
    const ev = vig ? ultimoEvento(evs, c) : null;
    const base = vig ? [c.vigencia_desde, ev && ev.em].filter(Boolean).sort().pop() : (g.atualizado || g.cadastrado || '');
    if (!base) return { st: 'sem_data', base: '', dias: null, vig };
    const d = dias(base, hoje());
    const st = d >= c.dias_divisao ? 'divisao' : d >= c.dias_aviso2 ? 'aviso2' : d >= c.dias_aviso ? 'aviso' : 'em_dia';
    return { st, base, dias: d, ev, vig, aviso_em: somaDias(base, c.dias_aviso), aviso2_em: somaDias(base, c.dias_aviso2), divisao_em: somaDias(base, c.dias_divisao) };
  }
  const ST = {
    em_dia: ['Em dia', 'ok'], aviso: ['1º aviso · regularizar', 'warn'], aviso2: ['2º aviso · último prazo', 'warn'],
    divisao: ['Divisão 50/50', 'bad'], dividido: ['Dividido 50/50 · definitivo', 'bad'], sem_data: ['Sem data', ''],
  };
  const ST_PREVIA = { em_dia: ['Em dia', 'ok'], aviso: ['Receberia 1º aviso', 'warn'], aviso2: ['Receberia 2º aviso', 'warn'], divisao: ['Seria dividido', 'bad'], dividido: ['Dividido', 'bad'], sem_data: ['Sem data', ''] };
  const emAviso = (st) => st === 'aviso' || st === 'aviso2';
  const divid = (st) => st === 'divisao' || st === 'dividido';

  let memo = { t: 0 };
  function agcCache() { if (Date.now() - memo.t < 2000) return memo; const A = new Map(agenciamentos().map((g) => [g.ref, g])); memo = { t: Date.now(), A, EV: eventosPorRef() }; return memo; }
  function linhas(c) {
    const EV = eventosPorRef();
    return agenciamentos().filter((g) => !(c.excluir_diretoria && g.cor.diretoria))
      .map((g) => { const evs = EV.get(g.ref) || []; return Object.assign(g, { s: situacao(g, c, evs), k: comissao(g, c, evs) }); });
  }

  // ------------------------------------------------------------ registros automáticos (só com a regra vigente)
  // 15/11/2026 (hub #4): só grava com TODAS as coleções usadas já carregadas (senão todo agenciamento parece parado) e nunca
  // por cima de aviso ou divisão que já existe no banco (a diretoria pode ter anulado); falha aparece na faixa da aba
  let gravando = false, erroReg = ''; const feitos = new Set();
  const USADAS = [C_CFG, C_EV, C_DIV, C_EXC, C_DV, 'imoveis', 'cadastro-corretores_fichas']; // avisos podem nascer vazios: a conferência deles é o jaExiste, doc a doc
  const tudoCarregado = () => USADAS.every((k) => !!(H.carregado || {})[k]);
  async function jaExiste(db, path) { try { const d = await db.doc(path).get(); return !!(d && (typeof d.exists === 'function' ? d.exists() : d.exists)); } catch (_) { return true; } } // na dúvida, não grava
  async function registra(L, c) {
    const db = H.db(); if (!db || gravando || !vigente(c) || !tudoCarregado()) return; gravando = true;
    const ag = agora();
    try {
      for (const g of L) {
        const s = g.s; if (!['aviso', 'aviso2', 'divisao'].includes(s.st)) continue;
        const niveis = s.st === 'aviso' ? [c.dias_aviso] : [c.dias_aviso, c.dias_aviso2];
        for (const n of niveis) {
          const idAv = (g.ref + '-' + s.base + '-' + n).replace(/[^A-Za-z0-9_\-.]/g, '');
          if ((H.S[C_AV] || {})[idAv] || feitos.has('a' + idAv)) continue;
          feitos.add('a' + idAv); if (await jaExiste(db, C_AV + '/' + idAv)) continue;
          const segundo = n === c.dias_aviso2;
          await db.doc(C_AV + '/' + idAv).set({ ref: g.ref, imoveis: g.ids, corretor: g.cor.nome, corretor_id: g.cor.id || null, base: s.base, nivel: n,
            aviso_em: somaDias(s.base, n), prazo_regularizar: s.divisao_em, registrado_em: ag, origem: 'automatico', visivel_corretor: false,
            texto: `${segundo ? '2º aviso' : '1º aviso'}: agenciamento ${g.ref} sem atualização desde ${dt(s.base)}. Registre uma atualização (app, CRM ou Vivian) até ${dt(s.divisao_em)}; depois disso o agenciamento fica ${c.divisao.vivere}% imobiliária e ${c.divisao.corretor}% corretor, de vez.` });
        }
        if (s.st === 'divisao' && !(H.S[C_DIV] || {})[g.ref] && !feitos.has('d' + g.ref)) {
          feitos.add('d' + g.ref); if (await jaExiste(db, C_DIV + '/' + g.ref)) continue;
          await db.doc(C_DIV + '/' + g.ref).set({ ref: g.ref, imoveis: g.ids, corretor: g.cor.nome, corretor_id: g.cor.id || null, base: s.base, dias: s.dias,
            divisao_em: s.divisao_em, pct_corretor: c.divisao.corretor, pct_vivere: c.divisao.vivere, definitiva: true,
            pct_agenciador_no_registro: g.k.pct, placa_no_registro: g.k.placa || 'sem informação', exclusividade_no_registro: g.k.exc.st || 'sem registro',
            responsavel_atualizacao: 'vivere', situacao: 'vigente', registrado_em: ag, origem: 'automatico',
            motivo: `${c.dias_divisao} dias sem atualização do corretor (desde ${dt(s.base)}), depois dos avisos do ${c.dias_aviso}º e do ${c.dias_aviso2}º dia. Divisão definitiva: não volta ao atualizar depois.` });
        }
      }
      erroReg = '';
    } catch (e) { erroReg = 'Não consegui registrar avisos ou divisões (' + ((e && e.code) || 'erro') + '); tento de novo no próximo desenho.'; feitos.clear(); }
    gravando = false;
  }

  // ------------------------------------------------------------ desenho
  const pill = (st, vig) => { const x = (vig ? ST : ST_PREVIA)[st] || [st, '']; return `<span class="pill ${x[1]}">${esc(x[0])}</span>`; };
  const chip = (t, cls, tit) => `<span class="pill ${cls || ''}" style="letter-spacing:0;text-transform:none;margin:0;white-space:nowrap"${tit ? ` title="${esc(tit)}"` : ''}>${esc(t)}</span>`;
  const corLk = (cor) => cor.id && window.HUB_PESSOAS ? `<button class="lk pes" data-pessoa="${esc(cor.id)}">${esc(cor.nome)}</button>` : esc(cor.nome);
  const imvLk = (g) => `<button class="lk imv cod" data-agc-imv="${esc(g.ref)}" title="Ver ${esc(g.ref)} na aba Anúncios do site">${esc(g.ref)}</button>`;
  const PLACA_TXT = { sim: ['🪧 placa', 'ok', 'Placa colocada'], nao_permitido: ['🪧 não permitida', '', 'Placa não permitida: conta como sem placa'], ainda_nao: ['🪧 ainda não', 'warn', 'Placa ainda não colocada'], '': ['🪧 ?', '', 'Placa: sem informação'] };
  const EXC_TXT = { valida: ['🔒', 'ok', 'Exclusividade válida'], vencida: ['🔒 vencida', 'warn', 'Exclusividade vencida: volta a 15%'], incompleta: ['🔒 sem termo', 'warn', 'Exclusividade sem o termo assinado ou sem as datas'], nao: ['', '', ''], '': ['', '', ''] };
  const dtc = (s) => { const m = String(s || '').match(/^\d{2}(\d{2})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  function comissaoCel(g) {
    const k = g.k, p = PLACA_TXT[k.placa] || PLACA_TXT[''], e = EXC_TXT[k.exc.st] || EXC_TXT[''];
    const vEm = k.exc.st === 'valida' && k.exc.x && k.exc.x.vence_em ? ' até ' + dtc(k.exc.x.vence_em) : '';
    return `<span style="display:flex;flex-wrap:wrap;gap:3px 4px;align-items:center"><b style="font-family:var(--display);font-size:15px;margin-right:2px">${k.pct}%</b>${chip(p[0], p[1], p[2])}${e[0] ? chip(e[0] + vEm, e[1], e[2]) : ''}${k.dica ? chip('💬 Vivian: exclusiva', 'info', 'Vivian informou exclusividade em ' + dt(k.dica.em) + ': falta registrar o termo assinado') : ''}`
      + `<button class="lk" data-agc-exc="${esc(g.ref)}" title="Registrar ou alterar a exclusividade de ${esc(g.ref)}" aria-label="Exclusividade de ${esc(g.ref)}" style="font-size:13px;padding:0 2px">✎</button></span>`;
  }
  function quando(g, c) {
    const s = g.s; if (s.st === 'sem_data') return '—';
    if (s.st === 'dividido') return `desde ${dt(s.div.divisao_em)}<span class="s">${s.div.pct_corretor}% corretor · ${s.div.pct_vivere}% Vivere · definitivo</span>`;
    const rel = s.dias === 0 ? 'hoje' : s.dias + ' dia' + (s.dias === 1 ? '' : 's');
    const prox = s.st === 'em_dia' ? `1º aviso em ${dt(s.aviso_em)}` : !s.vig ? `${c.dias_divisao} dias em ${dt(s.divisao_em)}` : s.st === 'aviso' ? `2º aviso em ${dt(s.aviso2_em)} · divide em ${dt(s.divisao_em)}` : s.st === 'aviso2' ? `divide em ${dt(s.divisao_em)}` : `divisão desde ${dt(s.divisao_em)}`;
    const orig = s.vig ? (s.ev ? `último registro: ${EV_TXT[s.ev.tipo] || s.ev.tipo}${s.ev.origem && ORIG_TXT[s.ev.origem] ? ' ' + ORIG_TXT[s.ev.origem] : ''}` : 'sem registro desde a vigência') : 'atualização no Imobibrasil (prévia)';
    return `${dt(s.base)} · ${rel}<span class="s">${esc(orig)} · ${esc(prox)}</span>`;
  }
  // aviso prévio sobre documentação do imóvel (Cleiton, 26/10/2026): vigora depois das definições do contrato de cessão da Lagoa
  function docHTML() {
    return `<div class="card" style="margin-bottom:14px;border-left:4px solid var(--warn)"><h2>Documentação do imóvel: só com escritura e matrícula individualizada <span class="pill warn" style="letter-spacing:0;text-transform:none;font-family:var(--body)">aviso prévio</span></h2><ol style="margin:6px 0 0 18px;padding:0;font-size:13px;line-height:1.55">
      <li>A Vivere <b>não vai mais negociar</b> imóveis <b>sem escritura pública</b>, <b>sem matrícula individualizada</b> ou <b>de posse</b>, como um todo.</li>
      <li><b>Quando passa a valer:</b> depois das definições do contrato de cessão da Lagoa. Até lá, fica registrada como aviso prévio.</li>
      <li><b>Depois que o sistema for ao ar:</b> levantamento de todos os imóveis agenciados e anunciados no site sem matrícula individualizada ou com alguma restrição. Cada agenciador será cobrado para responder a essas questões e juntar os documentos que comprovem a propriedade do imóvel.</li></ol>
      <p class="nota" style="margin:8px 0 0">Definida pelo Cleiton em 26/10/2026.</p></div>`;
  }
  // regra de leads e clientes (decisão do Cleiton, 24/10/2026): em vigor desde já, não depende do aplicativo
  function leadsHTML() {
    return `<div class="card" style="margin-bottom:14px;border-left:4px solid var(--ok)"><h2>Leads e clientes: cliente não tem dono <span class="pill ok" style="letter-spacing:0;text-transform:none;font-family:var(--body)">em vigor</span></h2><ol style="margin:6px 0 0 18px;padding:0;font-size:13px;line-height:1.55">
      <li>Na Vivere, <b>cliente não tem dono</b>: nenhum lead ou cliente fica reservado a um corretor.</li>
      <li>A <b>prioridade</b> e a <b>comissão</b> são do corretor que <b>levar o cliente na visita e fechar o negócio</b>.</li>
      <li>Se um corretor levar na visita e outro fechar, a <b>Diretoria analisa o caso</b>.</li></ol>
      <p class="nota" style="margin:8px 0 0">Decidida pelo Cleiton em 24/10/2026 (reunião com a Fernanda, 20/10/2026). Também registrada no Cadastro de corretores e no painel de Metas dos corretores.</p></div>`;
  }
  // regras de saída do corretor e de quando o agenciamento passa a valer (Cleiton, 18/11/2026): em vigor desde 18/11/2026,
  // informadas no grupo dos corretores e na Vivian (caderno Captação, nota 92)
  function saidaHTML() {
    return `<div class="card" style="margin-bottom:14px;border-left:4px solid var(--ok)"><h2>Saída do corretor: quem herda os agenciamentos <span class="pill ok" style="letter-spacing:0;text-transform:none;font-family:var(--body)">em vigor</span></h2><ol style="margin:6px 0 0 18px;padding:0;font-size:13px;line-height:1.55">
      <li>O corretor que sai da Vivere <b>indica um corretor parceiro da casa</b> para herdar os seus agenciamentos.</li>
      <li>A <b>parceria e a divisão de comissão</b> entre quem sai e quem herda são combinadas só entre os dois, <b>sem envolver a Vivere</b>.</li>
      <li>A Vivere exige sempre um <b>corretor interno responsável</b> por cada imóvel.</li>
      <li><b>Sem indicação</b>, a <b>Vivere assume</b> os agenciamentos (William e Nícollas) e a <b>Diretoria pode redistribuí-los</b> a outro corretor, caso a caso.</li>
      <li>Agenciamento <b>herdado ou redistribuído</b> não conta como agenciamento novo na meta de quem recebe, mas entra <b>na hora</b> na regra dos 60 dias: sem nenhuma atualização pela Vivian ou pelo CRM nesse prazo, o corretor <b>perde</b> o agenciamento recebido.</li></ol>
      <p class="nota" style="margin:8px 0 0">Decidida pelo Cleiton em 18/11/2026; vale desde 18/11/2026. O herdeiro fica registrado na ficha do corretor, no Cadastro de corretores (Registrar saída).</p></div>`;
  }
  function valeHTML() {
    return `<div class="card" style="margin-bottom:14px;border-left:4px solid var(--ok)"><h2>Quando o agenciamento passa a valer <span class="pill ok" style="letter-spacing:0;text-transform:none;font-family:var(--body)">em vigor</span></h2><ol style="margin:6px 0 0 18px;padding:0;font-size:13px;line-height:1.55">
      <li>O agenciamento só conta a partir do momento em que o imóvel está <b>publicado no site</b>, com <b>fotos</b> e com a ficha e o formulário preenchidos com as <b>informações essenciais</b>.</li>
      <li>Faltar um <b>detalhe secundário</b> não impede: a pendência segue sendo cobrada pela Vivian, mas o agenciamento já vale.</li>
      <li>Imóvel <b>fora do site</b> (rascunho, em aprovação ou inativo) <b>ainda não conta</b>.</li></ol>
      <p class="nota" style="margin:8px 0 0">Decidida pelo Cleiton em 18/11/2026; vale desde 18/11/2026.</p></div>`;
  }
  function regraHTML(c) {
    const P = c.pct_por_situacao;
    return `<div class="card" style="margin-bottom:14px"><h2>A regra</h2><ol style="margin:6px 0 0 18px;padding:0;font-size:13px;line-height:1.5;columns:2 340px;column-gap:28px">
      <li><b>Comissão do agenciador</b>, na venda e na locação: <b>${P.sem_placa}%</b> sem placa · <b>${P.com_placa}%</b> com placa da Vivere · <b>${P.com_placa_e_exclusividade}%</b> com placa e <b>autorização com exclusividade</b> assinada pelo proprietário, com prazo. Vale a situação <b>no dia do fechamento</b> do negócio; a coluna Comissão mostra a de hoje.</li>
      <li>Placa <b>não permitida</b> (o proprietário ou o condomínio não deixa) conta como <b>sem placa</b>: o motivo só tira a cobrança da Vivian.</li>
      <li>A exclusividade só conta com o <b>termo assinado anexado</b> aqui no HUB (link do Drive) e dentro do prazo; vencida, volta a ${P.com_placa}%. O app, o cadastro novo e a Vivian só sugerem.</li>
      <li>O corretor mantém o agenciamento atualizado no <b>app, no CRM ou na Vivian</b>: conversa com o proprietário, visita, fotos, descrição, valor e afins. Cada registro zera a contagem.</li>
      <li><b>${c.dias_aviso} dias</b> sem registro: 1º aviso. <b>${c.dias_aviso2} dias</b>: 2º aviso, o último prazo para regularizar.</li>
      <li><b>${c.dias_divisao} dias</b> sem registro: o agenciamento fica <b>${c.divisao.vivere}% imobiliária e ${c.divisao.corretor}% corretor, de vez</b> — não volta ao atualizar depois. A partir daí a Vivere passa a atualizar o cadastro.</li>
      <li>Não há sorteio a outro corretor.${c.excluir_diretoria ? ' A Diretoria fica fora da contagem.' : ''}</li></ol>
      <p class="nota" style="margin:8px 0 0">Decidida pelo Cleiton em 16/11/2026 e 17/11/2026; vale a partir de ${dt(c.vigencia_desde || '2026-11-25')}, sem retroagir. Por ora fica <b>só no HUB</b>: os corretores ainda não veem. Substitui a regra de 24/10/2026 (20% fixo, aviso no 20º dia, divisão 10/10 no 30º).</p></div>`;
  }

  // ------------------------------------------------------------ exclusividade por ref. (formulário e lista)
  const css = 'font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px 8px;min-width:0;max-width:100%';
  const EXC_ST = { valida: ['válida', 'ok'], vencida: ['vencida', 'warn'], incompleta: ['falta o termo ou as datas', 'warn'], nao: ['sem exclusividade', ''] };
  function excHTML(L) {
    const E = F.exc, refs = [...new Set(H.lista('imoveis').map((x) => String(x.ref || '').trim().toUpperCase()).filter(Boolean))].sort();
    const form = E ? `<form data-agc-exc-form class="card" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 12px">
        <input name="ref" list="agc-refs" placeholder="Ref. (ex.: AP283)" value="${esc(E.ref || '')}" style="${css};flex:0 1 130px" required>
        <datalist id="agc-refs">${refs.map((r) => `<option value="${esc(r)}">`).join('')}</datalist>
        <select name="exclusivo" style="${css}"><option value="sim"${E.exclusivo !== false ? ' selected' : ''}>Com exclusividade</option><option value="nao"${E.exclusivo === false ? ' selected' : ''}>Sem exclusividade</option></select>
        <label style="font-size:12px;display:flex;gap:4px;align-items:center">assinada em <input name="assinada_em" type="date" value="${esc(E.assinada_em || '')}" style="${css}"></label>
        <label style="font-size:12px;display:flex;gap:4px;align-items:center">vence em <input name="vence_em" type="date" value="${esc(E.vence_em || '')}" style="${css}"></label>
        <input name="documento" type="url" placeholder="Link do termo assinado no Drive (https://drive.google.com/…)" value="${esc(E.documento || '')}" style="${css};flex:1 1 260px">
        <select name="por" style="${css}">${QUEM.map((q) => `<option${(E.por || 'Cleiton') === q ? ' selected' : ''}>${esc(q)}</option>`).join('')}</select>
        <button class="btn" type="submit">Salvar</button><button class="btn" type="button" data-agc-exc-fecha>Cancelar</button>
        ${F.excMsg ? `<div style="flex:1 1 100%;color:var(--bad);font-size:13px">${esc(F.excMsg)}</div>` : ''}</form>` : '';
    const X = vivos(C_EXC).filter((x) => !String(x._id).startsWith('_'))
      .map((x) => Object.assign({}, x, { _ref: String(x.ref || x._id).toUpperCase() }))
      .sort((a, b) => String(b.em || '').localeCompare(String(a.em || '')));
    const dicas = L.filter((g) => g.k.dica).length;
    const tab = X.length ? `<div class="tabela"><table><thead><tr><th>Ref.</th><th>Situação</th><th>Assinada</th><th>Vence</th><th>Termo</th><th>Registro</th><th></th></tr></thead><tbody>${X.map((x) => { const e = exclusividade(x._ref), s = EXC_ST[e.st] || ['—', ''];
      return `<tr><td>${esc(x._ref)}</td><td><span class="pill ${s[1]}">${esc(s[0])}</span></td><td>${x.assinada_em ? dt(x.assinada_em) : '—'}</td><td>${x.vence_em ? dt(x.vence_em) : '—'}</td><td>${DRIVE.test(String(x.documento || '')) ? `<a href="${esc(x.documento)}" target="_blank" rel="noopener">abrir</a>` : '—'}</td><td>${esc(x.por || '—')}<span class="s">${esc(String(x.em || '').slice(0, 16))}</span></td><td><button class="btn" data-agc-exc="${esc(x._ref)}">Editar</button></td></tr>`; }).join('')}</tbody></table></div>`
      : `<p class="nota" style="margin:6px 0">Nenhuma exclusividade registrada ainda.</p>`;
    return `<h2 id="agc-exc" style="margin-top:24px">Exclusividade por ref.</h2><p class="nota">Só conta para os ${cfg().pct_por_situacao.com_placa_e_exclusividade}% com o termo assinado pelo proprietário anexado (link do Drive), as datas e dentro do prazo. Nada se apaga: para tirar, salve "Sem exclusividade".${dicas ? ` <b>${dicas}</b> agenciamento${dicas === 1 ? '' : 's'} com exclusividade informada pela Vivian e ainda sem termo registrado.` : ''}</p>
      ${E ? '' : '<button class="btn" data-agc-exc="">Registrar exclusividade</button>'}${form}${tab}`;
  }
  function validaExc(v) {
    const ref = String(v.ref || '').trim().toUpperCase();
    if (!ref || !H.lista('imoveis').some((x) => String(x.ref || '').trim().toUpperCase() === ref)) return 'Ref. não encontrada nos imóveis do HUB.';
    if (v.exclusivo !== 'sim') return '';
    if (!ISO.test(v.assinada_em || '')) return 'Informe a data em que a autorização foi assinada.';
    if (!ISO.test(v.vence_em || '')) return 'Informe a data em que a exclusividade vence.';
    if (v.vence_em < v.assinada_em) return 'O vencimento está antes da assinatura.';
    if (!DRIVE.test(String(v.documento || '').trim())) return 'Anexe o link do termo assinado no Drive (https://drive.google.com/…).';
    return '';
  }

  // pizza da atualização (Cleiton, 18/11/2026): verde até 30 dias sem atualização, amarelo de 31 a 60, vermelho acima de 60
  // (e o dividido). Mesma contagem da lista (registro do corretor; na prévia, a atualização do anúncio). Clique abre a lista.
  const FX = { verde: ['Atualizados', 'até 30 dias', 'var(--ok)'], amarelo: ['Falta atualizar', '31 a 60 dias', 'var(--warn)'], vermelho: ['Desatualizados', 'mais de 60 dias', 'var(--bad)'] };
  const faixaDe = (g) => g.s.st === 'dividido' ? 'vermelho' : g.s.dias == null ? '' : g.s.dias <= 30 ? 'verde' : g.s.dias <= 60 ? 'amarelo' : 'vermelho';
  function pizzaSVG(cont, tam) {
    const tot = cont.verde + cont.amarelo + cont.vermelho, r = tam / 2, cx = r, cy = r;
    if (!tot) return `<svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" role="img" aria-label="Sem agenciamentos"><circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="none" stroke="var(--line)" stroke-width="2"/></svg>`;
    let a0 = -Math.PI / 2, out = '';
    ['verde', 'amarelo', 'vermelho'].forEach((k) => {
      const n = cont[k]; if (!n) return; const tit = `${FX[k][0]} (${FX[k][1]}): ${n} — ${Math.round(n * 100 / tot)}%`;
      if (n === tot) { out += `<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="${FX[k][2]}" data-agc-fx="${k}" style="cursor:pointer"><title>${tit}</title></circle>`; return; }
      const a1 = a0 + 2 * Math.PI * n / tot, g = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a) => `${(cx + (r - 1) * Math.cos(a)).toFixed(2)} ${(cy + (r - 1) * Math.sin(a)).toFixed(2)}`;
      out += `<path d="M ${cx} ${cy} L ${p(a0)} A ${r - 1} ${r - 1} 0 ${g} 1 ${p(a1)} Z" fill="${FX[k][2]}" stroke="var(--panel)" stroke-width="1.5" data-agc-fx="${k}" style="cursor:pointer"><title>${tit}</title></path>`;
      a0 = a1;
    });
    return `<svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" role="img" aria-label="Atualização dos agenciamentos">${out}</svg>`;
  }
  function pizzaHTML(L, pc) {
    const V = F.pz ? L.filter((g) => g.cor.chave === F.pz) : L;
    const cont = { verde: 0, amarelo: 0, vermelho: 0, sem: 0 }; V.forEach((g) => { const f = faixaDe(g); cont[f || 'sem']++; });
    const tot = cont.verde + cont.amarelo + cont.vermelho;
    const opt = `<option value="">Todos os corretores</option>` + pc.map((x) => `<option value="${esc(x.cor.chave)}"${F.pz === x.cor.chave ? ' selected' : ''}>${esc(x.cor.nome)}</option>`).join('');
    const leg = ['verde', 'amarelo', 'vermelho'].map((k) => `<button class="btn" data-agc-fx="${k}" style="display:flex;gap:8px;align-items:center;justify-content:space-between;width:100%;box-sizing:border-box;flex-wrap:wrap;text-align:left" title="Abrir a lista dos ${FX[k][0].toLowerCase()}"><span style="display:flex;gap:6px;align-items:center"><span style="width:12px;height:12px;border-radius:3px;background:${FX[k][2]};flex:0 0 12px"></span><b>${FX[k][0]}</b><span class="s" style="display:inline">${FX[k][1]}</span></span><span><b>${cont[k]}</b>${tot ? ` · ${Math.round(cont[k] * 100 / tot)}%` : ''}</span></button>`).join('');
    return `<div class="card" id="agc-pizza" style="margin-bottom:14px"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 12px;align-items:center"><h2 style="margin:0">Atualização dos agenciamentos</h2><select id="agc-pz" aria-label="Corretor do gráfico" style="${css}">${opt}</select></div>
      <div style="display:flex;flex-wrap:wrap;gap:14px 22px;align-items:center;margin-top:10px">${pizzaSVG(cont, 150)}<div style="flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:6px">${leg}<p class="nota" style="margin:2px 0 0">${tot} agenciamento${tot === 1 ? '' : 's'}${cont.sem ? ` · ${cont.sem} sem data` : ''}. Toque numa cor para ver a lista. ${vigente(cfg()) ? 'Conta o último registro do corretor no app, no CRM ou na Vivian.' : 'Prévia: até a regra valer, conta a última atualização do anúncio.'}</p></div></div></div>`;
  }
  function render() {
    const c = cfg(), vig = vigente(c), lig = agendada(c), L = linhas(c);
    if (vig) registra(L, c);
    const faixaErro = vig && erroReg ? `<div class="aviso" style="margin:0 0 10px;border:1px solid var(--bad);color:var(--bad)">${esc(erroReg)}</div>` : '';
    const faixa = vig
      ? `<div class="aviso" style="margin:0 0 14px;background:var(--ok-bg);color:var(--ok)"><b>Regra vigente desde ${dt(c.vigencia_desde)}.</b> A contagem usa os registros do app, do CRM e da Vivian e não retroage antes dessa data. Avisos e divisões são registrados automaticamente${c.visivel_corretores ? '' : ' (por ora só aqui no HUB; os corretores ainda não veem)'}.</div>`
      : lig
        ? `<div class="aviso" style="margin:0 0 14px;border:1px solid var(--ok)"><b>Regra ligada: começa a contar em ${dt(c.vigencia_desde)}.</b> Até lá esta aba é uma <b>prévia</b>: conta os dias pela última atualização do anúncio no Imobibrasil, não registra aviso nem divisão. Em ${dt(c.vigencia_desde)} a contagem de todos começa do zero. A coluna Comissão já vale.</div>`
        : `<div class="aviso" style="margin:0 0 14px;border:1px solid var(--warn)"><b>Ainda não vigente.</b> A regra passa a valer em ${dt(c.vigencia_desde || '2026-11-25')}, quando ${esc(c.condicao_vigencia)}. Até lá esta aba é uma <b>prévia</b>: conta os dias pela última atualização do anúncio no Imobibrasil, não avisa ninguém e não divide nenhum agenciamento. A coluna Comissão já mostra a regra nova.</div>`;
    const n = (f) => L.filter((g) => f(g.s.st)).length, P = c.pct_por_situacao;
    const np = (p) => L.filter((g) => g.k.pct === p).length;
    const card = (rot, num, sub, al) => `<div class="card"${al ? ' style="border-color:var(--bad)"' : ''}><h2>${rot}</h2><div style="font-family:var(--display);font-size:26px${al ? ';color:var(--bad)' : ''}">${num}</div><p class="nota" style="margin:0">${sub}</p></div>`;
    const ndiv = n(divid);
    const cards = `<div class="grade" style="margin-bottom:14px">${card('Agenciamentos', L.length, `comissão hoje: <b>${P.com_placa_e_exclusividade}%</b> ${np(P.com_placa_e_exclusividade)} · <b>${P.com_placa}%</b> ${np(P.com_placa)} · <b>${P.sem_placa}%</b> ${np(P.sem_placa)}`)}${card('Em dia', n((s) => s === 'em_dia'), `menos de ${c.dias_aviso} dias sem registro`)}${card(vig ? 'Em aviso' : 'Receberiam aviso', n(emAviso), `1º aviso (${c.dias_aviso}–${c.dias_aviso2 - 1} d): ${n((s) => s === 'aviso')} · 2º aviso (${c.dias_aviso2}–${c.dias_divisao - 1} d): ${n((s) => s === 'aviso2')}`)}${card(vig ? 'Divididos 50/50' : 'Seriam divididos', ndiv, `${c.dias_divisao} dias ou mais · definitivo`, vig && ndiv > 0)}</div>`;
    // por corretor
    const PC = new Map(); L.forEach((g) => { const k = g.cor.chave; const x = PC.get(k) || { cor: g.cor, t: 0, em_dia: 0, aviso: 0, div: 0, p: {} }; x.t++; x.p[g.k.pct] = (x.p[g.k.pct] || 0) + 1; if (g.s.st === 'em_dia') x.em_dia++; else if (emAviso(g.s.st)) x.aviso++; else if (divid(g.s.st)) x.div++; PC.set(k, x); });
    const pc = [...PC.values()].sort((a, b) => b.t - a.t || a.cor.nome.localeCompare(b.cor.nome, 'pt-BR'));
    const pcts = [P.com_placa_e_exclusividade, P.com_placa, P.sem_placa];
    // 17/11/2026 (Cleiton: "compactar e aglomerar as informações"): cartões curtos que crescem até encher a linha, sem vazio à direita
    const tabCor = `<h2 style="margin-top:8px">Por corretor</h2><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px">${pc.map((x) => `<div class="card" style="flex:1 1 230px;margin:0;padding:8px 10px;display:flex;flex-wrap:wrap;gap:2px 10px;align-items:center;font-size:13px">
        <span style="flex:1 1 100%;display:flex;justify-content:space-between;gap:6px;align-items:baseline"><b>${corLk(x.cor)}</b><button class="lk" data-agc-cor="${esc(x.cor.chave)}" style="font-size:12px">ver lista</button></span>
        <span title="Agenciamentos">${x.t} agenc.</span><span title="Comissão hoje: ${pcts.join('% · ')}%">${pcts.map((p) => `${p}%: ${x.p[p] || 0}`).join(' · ')}</span>
        <span title="Em dia">✓ ${x.em_dia}</span>${x.aviso ? `<span style="color:var(--warn)" title="Em aviso">⚠ ${x.aviso}</span>` : ''}${x.div ? `<span style="color:var(--bad)" title="Divididos 50/50">½ ${x.div}</span>` : ''}</div>`).join('') || '<p class="nota">—</p>'}</div>`;
    const optCor = `<option value="">Todos os corretores</option>` + pc.map((x) => `<option value="${esc(x.cor.chave)}"${F.cor === x.cor.chave ? ' selected' : ''}>${esc(x.cor.nome)}</option>`).join('');
    const optPct = `<option value="">Toda comissão</option>` + pcts.map((p) => `<option value="${p}"${String(F.pct) === String(p) ? ' selected' : ''}>${p}%</option>`).join('');
    const fil = `<div class="filtros">${[['todos', 'Todos'], ['em_dia', 'Em dia'], ['aviso', vig ? 'Em aviso' : 'Aviso'], ['divisao', vig ? 'Divididos' : 'Divisão']].map(([k, t]) => `<button class="btn" data-agc-st="${k}" aria-pressed="${F.st === k}">${t}</button>`).join('')}
      <select id="agc-cor" style="${css}">${optCor}</select><select id="agc-pct" style="${css}">${optPct}</select>
      <input id="agc-q" type="search" placeholder="Buscar ref., corretor ou bairro…" value="${esc(F.q)}" style="${css};flex:1 1 180px;padding:7px 10px"></div>`;
    return `<h2>Agenciamentos e regras dos corretores</h2><p class="nota">Como funcionam, na Vivere, os leads, os clientes e os agenciamentos.</p>${pizzaHTML(L, pc)}${docHTML()}${leadsHTML()}${saidaHTML()}${valeHTML()}<h2 style="margin-top:22px">Agenciamento: comissão e atualização periódica</h2><p class="nota">Mostra a comissão de hoje de cada agenciamento (placa e exclusividade) e há quantos dias ele está sem atualização do corretor. Um agenciamento = uma ref. com anúncio ativo no Imobibrasil e agenciador cadastrado.</p>${faixaErro}${faixa}${regraHTML(c)}${cards}${tabCor}<h2 id="agc-lista" style="margin-top:24px">Agenciamentos</h2>${fil}<div id="agc-res">${blocoLista(c, L)}</div>${excHTML(L)}`;
  }
  function blocoLista(c, L) {
    const q = semAc(F.q).trim();
    const V = L.filter((g) => (!F.fx || faixaDe(g) === F.fx) && (!F.cor || g.cor.chave === F.cor) && (!F.pct || String(g.k.pct) === String(F.pct)) && (F.st === 'todos' || g.s.st === F.st || (F.st === 'aviso' && g.s.st === 'aviso2') || (F.st === 'divisao' && g.s.st === 'dividido')) && (!q || semAc([g.ref, g.cor.nome, g.bairro, g.tipo].join(' ')).includes(q)))
      .sort((a, b) => (b.s.dias ?? -1) - (a.s.dias ?? -1) || a.ref.localeCompare(b.ref, 'pt-BR', { numeric: true }));
    const MAX = 150;
    const fxAviso = F.fx ? `<p class="nota" style="margin:6px 0">Mostrando só: <b>${FX[F.fx][0]}</b> (${FX[F.fx][1]}). <button class="lk" data-agc-fx="">mostrar todos</button></p>` : '';
    const tab = V.length ? `<p class="nota" style="margin:6px 0">${V.length} agenciamento${V.length === 1 ? '' : 's'}${V.length > MAX ? ` · mostrando os ${MAX} mais parados` : ''}</p><div class="tabela"><table><thead><tr><th>Ref.</th><th>Agenciador</th><th>Comissão</th><th>Situação</th><th>Contagem</th><th>Imóvel</th></tr></thead><tbody>${V.slice(0, MAX).map((g) => `<tr id="agc-${esc(g.ref)}"${F.foco === g.ref ? ' class="foco"' : ''}><td>${imvLk(g)}</td><td>${corLk(g.cor)}</td><td>${comissaoCel(g)}</td><td>${pill(g.s.st, g.s.vig)}</td><td>${quando(g, c)}</td><td>${esc(g.tipo || '—')}<span class="s">${esc(g.bairro || '')}</span></td></tr>`).join('')}</tbody></table></div>`
      : H.vazio(H.carregado.imoveis ? 'Nenhum agenciamento neste filtro.' : 'Carregando os imóveis…');
    return fxAviso + tab;
  }

  H.registrar({
    id: ID, aba: 'Agenciamentos', grupo: 'comercial', depois: 'portais',
    colecoes: [C_CFG, C_EV, C_AV, C_DIV, C_EXC, C_DV, 'cadastro-corretores_fichas'],
    tipos: { agenciamento_aviso: 'Agenciamento — aviso de 30 ou 45 dias', agenciamento_divisao: 'Agenciamento — divisão 50/50' },
    render,
    foco(alvo) { if (alvo) { F.foco = alvo; F.st = 'todos'; F.cor = ''; F.pct = ''; F.q = ''; setTimeout(() => { const l = document.getElementById('agc-' + alvo); if (l) l.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 80); } },
    selos(idImovel) {
      const c = cfg(); if (!vigente(c)) return [];
      const x = (H.S.imoveis || {})[idImovel]; const ref = x && String(x.ref || '').toUpperCase(); if (!ref) return [];
      const M = agcCache(), g = M.A.get(ref); if (!g || (c.excluir_diretoria && g.cor.diretoria)) return [];
      const s = situacao(g, c, M.EV.get(ref) || []); if (!['aviso', 'aviso2', 'divisao', 'dividido'].includes(s.st)) return [];
      const av = emAviso(s.st);
      return [{ txt: av ? `agenc.: ${s.dias} d` : 'agenc. 50/50', cls: av ? 'warn' : 'bad', alvo: ref, titulo: av ? `Sem atualização há ${s.dias} dias; divide em ${dt(s.divisao_em)}` : 'Agenciamento dividido 50/50, de vez; a Vivere atualiza o cadastro' }];
    },
    busca(q) {
      const t = semAc(q).trim(); if (t.length < 3 || !/agenc|inativ|regra|dono|exclusiv|placa|comiss|herd|said/.test(t)) return [];
      return [{ grp: 'Abas', tit: 'Abrir Agenciamentos (comissão, exclusividade e regras dos corretores)', sub: 'Comercial', ir: { aba: ID } }];
    },
  });
  const rolar = (id) => setTimeout(() => { const l = document.getElementById(id); if (l) l.scrollIntoView({ block: 'start' }); }, 80);
  document.addEventListener('click', (e) => {
    const fx = e.target.closest('[data-agc-fx]'); if (fx) { F.fx = fx.getAttribute('data-agc-fx') || ''; if (F.fx) { F.cor = F.pz; F.st = 'todos'; F.pct = ''; F.q = ''; } F.foco = ''; H.pede(); if (F.fx) rolar('agc-lista'); return; }
    const s = e.target.closest('[data-agc-st]'); if (s) { F.st = s.dataset.agcSt; F.fx = ''; F.foco = ''; H.pede(); return; }
    const c = e.target.closest('[data-agc-cor]'); if (c) { F.cor = c.dataset.agcCor; F.st = 'todos'; F.foco = ''; H.pede(); rolar('agc-lista'); return; }
    const x = e.target.closest('[data-agc-exc]'); if (x) { const ref = x.dataset.agcExc, a = ref ? (H.S[C_EXC] || {})[ref] : null;
      F.exc = a ? { ref, exclusivo: a.exclusivo !== false, assinada_em: a.assinada_em || '', vence_em: a.vence_em || '', documento: a.documento || '', por: a.por || 'Cleiton' } : { ref, exclusivo: true };
      F.excMsg = ''; H.pede(); rolar('agc-exc'); return; }
    if (e.target.closest('[data-agc-exc-fecha]')) { F.exc = null; F.excMsg = ''; H.pede(); return; }
    const i = e.target.closest('[data-agc-imv]'); if (i) { const ref = i.dataset.agcImv; const ids = H.lista('imoveis').filter((y) => String(y.ref || '').toUpperCase() === ref).map((y) => y._id); H.abrirImovel(ids, 'Agenciamento ' + ref); }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest && e.target.closest('[data-agc-exc-form]'); if (!f) return; e.preventDefault();
    const v = {}; ['ref', 'exclusivo', 'assinada_em', 'vence_em', 'documento', 'por'].forEach((k) => { const el = f.elements[k]; v[k] = el ? String(el.value || '').trim() : ''; });
    v.ref = v.ref.toUpperCase();
    F.exc = { ref: v.ref, exclusivo: v.exclusivo === 'sim', assinada_em: v.assinada_em, vence_em: v.vence_em, documento: v.documento, por: v.por };
    const msg = validaExc(v); if (msg) { F.excMsg = msg; H.pede(); return; }
    const db = H.db(); if (!db) { F.excMsg = 'Sem banco: abra o HUB no claude.ai para gravar.'; H.pede(); return; }
    if (!(H.carregado || {})[C_EXC]) { F.excMsg = 'As exclusividades ainda estão carregando; tente de novo em alguns segundos.'; H.pede(); return; }
    const b = f.querySelector('button[type="submit"]'); if (b) b.disabled = true;
    const ant = (H.S[C_EXC] || {})[v.ref] || {}, ag = agora(), sim = v.exclusivo === 'sim';
    const texto = sim ? `Exclusividade registrada: assinada em ${dt(v.assinada_em)}, vence em ${dt(v.vence_em)}.` : 'Marcado sem exclusividade.';
    // nada se apaga: sem exclusividade mantém as datas e o termo anteriores; o histórico guarda o retrato de antes
    const antes = ant.ref ? { exclusivo: !!ant.exclusivo, assinada_em: ant.assinada_em || null, vence_em: ant.vence_em || null, documento: ant.documento || null } : null;
    const dados = sim ? { assinada_em: v.assinada_em, vence_em: v.vence_em, documento: v.documento }
      : { assinada_em: v.assinada_em || ant.assinada_em || null, vence_em: v.vence_em || ant.vence_em || null, documento: v.documento || ant.documento || null };
    const doc = Object.assign({ ref: v.ref, exclusivo: sim }, dados, { por: v.por || 'Cleiton', em: ag,
      historico: (Array.isArray(ant.historico) ? ant.historico : []).concat([Object.assign({ em: ag, por: v.por || 'Cleiton', texto }, antes ? { antes } : {})]) });
    Promise.resolve(db.doc(C_EXC + '/' + v.ref).set(doc)).then(() => { F.exc = null; F.excMsg = ''; H.pede(); }, (err) => { if (b) b.disabled = false; F.excMsg = 'Não gravou: ' + ((err && err.message) || err); H.pede(); });
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'agc-q') { F.q = e.target.value; const el = document.getElementById('agc-res'); if (el) { const c = cfg(); el.innerHTML = blocoLista(c, linhas(c)); } }
  });
  document.addEventListener('change', (e) => { if (e.target.id === 'agc-cor') { F.cor = e.target.value; H.pede(); } else if (e.target.id === 'agc-pct') { F.pct = e.target.value; H.pede(); } else if (e.target.id === 'agc-pz') { F.pz = e.target.value; H.pede(); } });
})();
