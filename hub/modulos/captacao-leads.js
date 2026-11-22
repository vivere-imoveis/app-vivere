// modulos/captacao-leads.js — HUB VIVERE · CRM › Captação (construção 14, captacao-leads)
// Leads de captação coletados toda semana (Alude/OLX, Chaves na Mão, Facebook…), com filtro por nível do bairro,
// perfil e ★, roteiro de abordagem com [NOME DO CORRETOR], distribuição manual, lista de bloqueio (LGPD) e cadastro de corretores anunciantes.
// Coleções próprias: captacao-leads_leads, captacao-leads_bloqueio, captacao-leads_corretores. Só lê cadastro-corretores_fichas.
// Nenhuma mensagem é enviada daqui: o roteiro só é copiado e o WhatsApp só abre a conversa.
// Versão 2026-11-01.5 — corretor anunciante confirmado pelo corretor no painel ("confirmado por"); lado × perfil sem lista vazia.
// Versão 2026-11-01.4 — subaba 📤 Encaminhados (todo lead repassado: Captação + portais/campanhas, só leitura).
// Versão 2026-11-01.3 — dois lados: 🏠 TEM (locador, vendedor, operador de renda) × 🔎 PROCURA (locatário, comprador).
// O imóvel de quem TEM vai ao núcleo pelo gancho imoveisCaptados() (NÃO AGENCIADO, sem telefone, link nem endereço) e o
// núcleo devolve quem procura um imóvel assim (HUB.op.interessados): ★ sobe, roteiro cita os clientes, Distribuir sugere o corretor.
(function () {
  const H = window.HUB; if (!H) return;
  const C = 'captacao-leads_leads', CB = 'captacao-leads_bloqueio', CC = 'cadastro-corretores_fichas', CK = 'captacao-leads_corretores';
  const POR_PAG = 60;

  const ST = {
    novo: ['Novo', 'info'], distribuido: ['Distribuído', 'warn'], abordado: ['Abordado', 'ok'],
    follow_up: ['Follow-up', 'warn'], agenciado: ['Agenciado', 'ok'], arquivado: ['Arquivado', ''], bloqueado: ['Bloqueado', 'bad'], corretor: ['🏷️ Corretor anunciante', 'bad']
  };
  const PERFIL = { locador: 'Locador', vendedor: 'Vendedor', operador_renda: 'Operador de renda', locatario: 'Locatário', comprador: 'Comprador' };
  const NIVEL = { 1: 'Principal', 2: 'Subsidiário', 3: 'Continente' };
  const FONTE = { alude: 'Alude (OLX)', chavesnamao: 'Chaves na Mão', facebook: 'Facebook', olx: 'OLX' };
  const PROPRIETARIO = new Set(['locador', 'vendedor', 'operador_renda']);
  const ladoDe = x => (PROPRIETARIO.has(x.perfil) ? 'tem' : 'procura');
  const TIPO_IMV = { apartment: 'Apartamento', house: 'Casa', apartamento: 'Apartamento', casa: 'Casa', land: 'Terreno', terreno: 'Terreno', commercial: 'Comercial' };
  const tipoDe = x => TIPO_IMV[String(x.tipo || '').toLowerCase()] || (/\b(apto|apartamento|cobertura|studio|kitnet)\b/i.test(x.titulo || '') ? 'Apartamento' : /\bcasa\b/i.test(x.titulo || '') ? 'Casa' : /\bterreno|lote\b/i.test(x.titulo || '') ? 'Terreno' : '');
  const FECHADOS = ['arquivado', 'bloqueado', 'agenciado', 'corretor'];
  const sem = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // estado da aba (por leitor)
  const F = { nivel: '1', lado: '', perfil: '', est: '0', status: 'abertos', cor: '', fonte: '', ord: 'estrelas', dir: -1, pg: 0, aberto: '', distrib: '', confBloq: '', confCk: '', sub: 'lista' };
  try { const g = JSON.parse(localStorage.getItem('hubv.capt') || '{}'); ['nivel', 'lado', 'perfil', 'est', 'status', 'ord', 'dir', 'sub'].forEach(k => { if (g[k] !== undefined) F[k] = g[k]; }); } catch (_) {}
  if (F.lado && F.perfil && ladoDe({ perfil: F.perfil }) !== F.lado) F.perfil = '';
  const guarda = () => { try { localStorage.setItem('hubv.capt', JSON.stringify({ nivel: F.nivel, lado: F.lado, perfil: F.perfil, est: F.est, status: F.status, ord: F.ord, dir: F.dir, sub: F.sub })); } catch (_) {} };

  const dig = t => String(t || '').replace(/\D/g, '');
  const tel = t => { const d = dig(t).replace(/^55(?=\d{10,11}$)/, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)} · verificar` : (t || ''); };
  const wa = t => { const d = dig(t).replace(/^55(?=\d{10,11}$)/, ''); return d.length === 11 ? 'https://wa.me/55' + d : ''; };
  const nTel = t => dig(t).replace(/^55(?=\d{10,11}$)/, ''); // revisão do Lucas (hub #14): mesmo número com ou sem o 55
  const bloqueados = () => new Set(H.lista(CB).map(x => nTel(x._id)));
  const duasFormas = ts => ts.flatMap(t => /^\d{10,11}$/.test(t) ? [t, '55' + t] : [t]); // chave com e sem 55: quem lê o id cru (acaptar.py) também acha
  const telsDe = x => [].concat(x.telefones || []).map(nTel).filter(Boolean);
  // ===== 🏷️ Corretores anunciantes (01/11/2026, pedido do Cleiton): quem anuncia como proprietário mas é corretor ou imobiliária.
  // Cadastro por telefone (só dígitos) em captacao-leads_corretores: {telefone, nome, situacao 'corretor'|'nao_corretor', motivo, marcado_por, em, lead}.
  // Reconhece por telefone + nome; lead ou cadastro sem nome = basta o telefone. Reconhecido = fora dos Novos e do Distribuir (botão Liberar).
  // A rotina só SUGERE (⚠️ possível corretor, com o motivo); vira corretor com o toque da diretoria.
  const cadK = () => { const m = new Map(); H.lista(CK).forEach(d => m.set(nTel(d._id), d)); return m; };
  const nomeIgual = (a, b) => !sem(a) || !sem(b) || sem(a) === sem(b);
  function corretorDe(x, K) {
    if (x.liberado_corretor) return null;
    const M = K || cadK();
    for (const t of telsDe(x)) { const d = M.get(t); if (d && d.situacao === 'corretor' && nomeIgual(x.nome, d.nome)) return d; }
    return null;
  }
  const RX_TXT = /\bcreci\b|imobili[aá]ria|\bcorretor(a|es)?\b|consultor(a)? imobili|neg[oó]cios imobili/i;
  // negação de verdade: verbo de recusa colado ao termo ("sem corretor", "não aceito imobiliária", "corretores somente com cliente", "corretores, agradeço")
  const RX_NEG1 = /\b(sem comiss\S+( de| do| da| para)?|sem|n[aã]o quero|n[aã]o trabalhamos com|n[aã]o aceito|n[aã]o atendo|n[aã]o trabalho com|nada de|dispenso|dispensa-se|recuso|proibid[oa]s?)\s+(a |o |as |os |intermedia\S+ (de |com |da |do )?)?(corretor\w*|imobili\w*)/gi;
  const RX_NEG2 = /(corretor\w*|imobili\w*)\s*,?\s*((somente|apenas|s[oó])\s+com\s+cliente\w*|agrade[cç]o|n[aã]o aceito|dispenso|favor n[aã]o|n[aã]o ligar|n[aã]o insist\w*|n[aã]o\s*(?=[.!?\n]|$))/gi;
  const RX_DIRETO = /direto (com|do) (o |a )?propriet[aá]ri[oa][^.!?\n]*/gi;
  const limpaNeg = s => String(s || '').replace(RX_DIRETO, ' ').replace(RX_NEG1, ' ').replace(RX_NEG2, ' ');
  const RX_NOME = /im[oó]veis|imobili|neg[oó]cios|\bltda\b|\beireli\b|\bcorretor|\bcreci\b|consultoria|empreendimentos|realty|\bbroker/i;
  const contaTels = () => { const c = new Map(); H.lista(C).forEach(x => new Set(telsDe(x)).forEach(t => c.set(t, (c.get(t) || 0) + 1))); return c; };
  function sinaisCorretor(x, K, CT) {
    const M = K || cadK();
    if (corretorDe(x, M) || x.liberado_corretor) return [];
    if (telsDe(x).some(t => { const d = M.get(t); return d && d.situacao === 'nao_corretor'; })) return [];
    const out = [];
    const bruto = [x.titulo, x.descricao].filter(Boolean).join(' ');
    const m = /\bcreci\b/i.test(bruto) ? ['creci'] : limpaNeg(bruto).match(RX_TXT); // CRECI nunca é negado: vale no texto bruto
    if (m) out.push('anúncio cita “' + m[0].toLowerCase() + '”');
    if (RX_NOME.test(x.nome || '')) out.push('nome de empresa');
    const ct = CT || contaTels(), n = Math.max(0, ...telsDe(x).map(t => ct.get(t) || 0));
    if (n >= 3) out.push('telefone em ' + n + ' anúncios');
    return out;
  }
  const statusDe = (x, B, K) => (telsDe(x).some(t => B.has(t)) ? 'bloqueado' : corretorDe(x, K) ? 'corretor' : (x.status || 'novo'));
  const corretores = () => H.lista(CC).filter(c => c.situacao !== 'saiu' && ['corretor', 'vinculado', 'diretor', 'parceiro'].includes(c.tipo))
    .map(c => ({ id: c._id, nome: c.nome || c._id })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const nomeCor = id => { const c = (H.S[CC] || {})[id]; return c ? (c.nome || id) : (id || ''); };
  const estr = n => { n = +n || 0; return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n)); };
  const primeiro = n => String(n || '').trim().split(/\s+/)[0] || '';
  // quem procura um imóvel como o deste proprietário (núcleo, mesmo motor das Oportunidades); núcleo antigo = nenhum
  const mapaInt = () => { try { return (H.op && H.op.interessados && H.op.interessados()) || null; } catch (_) { return null; } };
  const interessados = (x, M) => { if (ladoDe(x) !== 'tem') return []; const m = M === undefined ? mapaInt() : M; return (m && m.get('C:' + x._id)) || []; };
  const estrEf = (x, n) => Math.min(5, (+x.estrelas || 0) + (n >= 3 ? 2 : n ? 1 : 0)); // ★ sobe com clientes interessados
  // corretores sugeridos: quem já tem cliente interessado e quem pediu a captação pelo painel (só sugestão: nada sai sozinho)
  function sugeridos(x, ints, cors) {
    const out = new Map(), acha = nm => { const a = sem(nm), f = a.split(' ')[0]; return cors.find(c => sem(c.nome) === a) || cors.find(c => sem(c.nome).split(' ')[0] === f && f.length > 2) || cors.find(c => c.id === nm); };
    ints.forEach(y => { const c = y.corretor && acha(y.corretor); if (c) { const o = out.get(c.id) || { n: 0, pediu: false }; o.n++; out.set(c.id, o); } });
    [].concat(x.pedidos_captacao || []).forEach(pd => { const c = acha(pd.corretor_nome || pd.corretor); if (c) { const o = out.get(c.id) || { n: 0, pediu: false }; o.pediu = true; out.set(c.id, o); } });
    return out;
  }
  const papelPill = x => { const t = ladoDe(x) === 'tem'; return `<span class="pill ${t ? 'info' : 'warn'}" style="white-space:nowrap">${t ? '🏠 TEM' : '🔎 PROCURA'} · ${H.esc(PERFIL[x.perfil] || x.perfil || '—')}</span>`; };

  // roteiros (skill imob-leads): quem aborda é o corretor, sempre [NOME DO CORRETOR]
  function roteiro(x, corNome, nInt) {
    const nome = primeiro(x.nome) || '[Nome]', eu = corNome ? primeiro(corNome) : '[NOME DO CORRETOR]';
    const imv = (x.titulo ? x.titulo.replace(/\s+/g, ' ').slice(0, 70).replace(/[\s.,;:!-]+$/, '') : 'imóvel'), b = x.bairro || 'bairro';
    const p = x.perfil;
    const cli = nInt > 0 ? ` Inclusive, hoje temos ${nInt === 1 ? 'um cliente procurando' : nInt + ' clientes procurando'} um imóvel com esse perfil${x.bairro ? ' no ' + b : ''}.` : '';
    if (p === 'operador_renda') return `Olá, ${nome}! Sou ${eu}, da Vivere Imóveis Selecionados. Vi o anúncio do ${imv} no ${b}. Uma operação de renda dá trabalho todo mês, ainda mais à distância. A Vivere assume a gestão das unidades — seleção, contrato, cobrança e repasse — e mantém a receita entrando.${cli} Faz sentido conversarmos?`;
    if (p === 'vendedor') return `Olá, ${nome}! Sou ${eu}, da Vivere Imóveis Selecionados, de Florianópolis. Vi seu anúncio do ${imv} no ${b}. Duas coisas rápidas: trabalhamos com venda nessa faixa com uma rede de corretores e — caso a venda demore — também estruturamos a locação para o imóvel não ficar parado gerando custo.${cli} Quer que eu te mande as duas simulações?`;
    if (p === 'locatario') return `Olá, ${nome}! Sou ${eu}, da Vivere Imóveis Selecionados. Vi que você procura imóvel para alugar${x.bairro ? ' no ' + b : ''}. Temos opções com contrato e vistoria bem feitos e atendimento direto. Me conta o que você precisa (quartos, vaga, valor) que eu te mando as que encaixam?`;
    if (p === 'comprador') return `Olá, ${nome}! Sou ${eu}, da Vivere Imóveis Selecionados. Vi que você procura imóvel para comprar${x.bairro ? ' no ' + b : ''}. Me conta o perfil (quartos, faixa de valor, financiamento ou à vista) que eu separo as opções que fazem sentido?`;
    if (x.fora_da_ilha) return `Olá, ${nome}! Sou ${eu}, da Vivere Imóveis Selecionados, aqui de Florianópolis. Vi seu anúncio do ${imv} no ${b}. Como você não está na ilha, imagino que acompanhar visita e vistoria à distância dê um trabalho considerável. A Vivere faz a gestão completa da locação — seleção e análise do inquilino, contrato, vistoria, cobrança e repasse.${cli} Faz sentido eu te explicar como funciona?`;
    return `Olá, ${nome}! ${eu}, da Vivere Imóveis Selecionados. Vi seu anúncio do ${imv} no ${b}. Uma pergunta rápida: já apareceu candidato que você teve dúvida se valia aprovar? É onde a maioria dos proprietários se queima. A gente faz essa análise antes de assinar.${cli} Posso te explicar?`;
  }

  function filtrados(L, B) {
    const est = +F.est || 0;
    return L.filter(x => {
      const st = statusDe(x, B);
      if (F.nivel && String(x.nivel || 1) !== F.nivel) return false;
      if (F.lado && ladoDe(x) !== F.lado) return false;
      if (F.perfil && x.perfil !== F.perfil) return false;
      if (est && (x._ef != null ? x._ef : +x.estrelas || 0) < est) return false;
      if (F.fonte && x.fonte !== F.fonte) return false;
      if (F.cor && (x.distribuido_para || '') !== (F.cor === '-' ? '' : F.cor)) return false;
      if (F.status === 'possivel') { if (!(x._pc && x._pc.length) || FECHADOS.includes(st)) return false; }
      else if (F.status === 'abertos') { if (FECHADOS.includes(st)) return false; }
      else if (F.status && st !== F.status) return false;
      return true;
    });
  }
  const CHAVE = {
    estrelas: x => x._ef != null ? x._ef : +x.estrelas || 0, nome: x => (x.nome || '').toLowerCase(), bairro: x => (x.bairro || '').toLowerCase(),
    perfil: x => PERFIL[x.perfil] || x.perfil || '', preco: x => +x.preco || null, anunciado: x => x.anunciado_em || x.coletado_em || null,
    status: x => x._st || '', corretor: x => nomeCor(x.distribuido_para).toLowerCase() || null
  };
  function ordena(L) {
    const f = CHAVE[F.ord] || CHAVE.estrelas, d = F.dir;
    return L.slice().sort((a, b) => {
      const va = f(a), vb = f(b), na = va === null || va === '', nb = vb === null || vb === '';
      if (na || nb) return na === nb ? 0 : na ? 1 : -1; // sem valor vai sempre para o fim
      const c = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt');
      return c * d || ((b._ef || 0) - (a._ef || 0));
    });
  }
  const seta = k => F.ord === k ? (F.dir > 0 ? ' ▲' : ' ▼') : ' ↕';
  // o núcleo já põe o botão de ordenar em todo cabeçalho de tabela; aqui o th é só texto
  const th = (k, t, cls) => `<th${cls ? ` class="${cls}"` : ''}>${t}</th>`;
  const opt = (v, t, sel) => `<option value="${H.esc(v)}"${String(sel) === String(v) ? ' selected' : ''}>${H.esc(t)}</option>`;

  function cartoes(L, B) {
    const c = k => L.filter(x => statusDe(x, B) === k).length;
    const semana = new Date(Date.now() - 3 * 3600e3 - 7 * 864e5).toISOString().slice(0, 10); // dia de Brasília (hub #22)
    const novosSem = L.filter(x => (x.coletado_em || '') >= semana).length;
    const ilhaFora = L.filter(x => x.fora_da_ilha && !FECHADOS.includes(statusDe(x, B))).length;
    const ab = L.filter(x => !FECHADOS.includes(statusDe(x, B))), tem = ab.filter(x => ladoDe(x) === 'tem'), comInt = tem.filter(x => x._n > 0).length;
    const k = [
      ['Novos', c('novo'), `${novosSem} coletados em 7 dias`, 'novo'],
      ['Distribuídos', c('distribuido'), 'aguardando abordagem', 'distribuido'],
      ['Abordados', c('abordado') + c('follow_up'), `${c('follow_up')} em follow-up`, 'abordado'],
      ['Fora da ilha', ilhaFora, 'proprietário com DDD de fora — prioridade', ''],
      ['🏠 Têm imóvel', tem.length, `${comInt} com clientes interessados`, 'lado:tem'],
      ['🔎 Procuram imóvel', ab.length - tem.length, 'locatários e compradores', 'lado:procura'],
      ['⚠️ Possíveis corretores', ab.filter(x => x._pc && x._pc.length).length, 'sinais no anúncio · confirme', 'possivel'],
      ['🏷️ Corretores anunciantes', c('corretor'), `${new Set(H.lista(CK).filter(d => d.situacao === 'corretor').map(d => nTel(d._id))).size} no cadastro · não distribui`, 'corretor']
    ];
    return `<style>div.kpis.capt-kpis.capt-kpis{grid-template-columns:repeat(4,minmax(0,1fr))!important}div.kpis.capt-kpis>.kpi{grid-column:auto!important}@media (max-width:900px){div.kpis.capt-kpis.capt-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}}</style><div class="kpis capt-kpis" data-sem-cheio style="margin-top:4px">${k.map(x => `<button class="kpi" data-cl-kpi="${x[3]}"><span class="rot">${x[0]}</span><span class="num">${x[1]}</span><span class="sub">${H.esc(x[2])}</span></button>`).join('')}</div>`;
  }

  function filtrosHTML(L, cors) {
    const fontes = [...new Set(L.map(x => x.fonte).filter(Boolean))];
    const nv = [['1', 'Principais'], ['2', 'Subsidiários'], ['3', 'Continente'], ['', 'Todos']];
    const ab = L.filter(x => !FECHADOS.includes(x._st));
    const ld = [['', 'Todos'], ['tem', '🏠 Têm imóvel'], ['procura', '🔎 Procuram imóvel']];
    return `<div class="filtros" role="group" aria-label="Lado">${ld.map(([v, t]) => `<button class="btn" data-cl-lado="${v}" aria-pressed="${F.lado === v}">${t} (${ab.filter(x => !v || ladoDe(x) === v).length})</button>`).join('')}</div>
    <div class="filtros" role="group" aria-label="Nível do bairro">${nv.map(([v, t]) => `<button class="btn" data-cl-nivel="${v}" aria-pressed="${F.nivel === v}">${t} (${L.filter(x => !v || String(x.nivel || 1) === v).length})</button>`).join('')}</div>
    <div class="filtros" style="align-items:center">
      <label class="s" style="display:flex;gap:4px;align-items:center">Perfil <select data-cl-f="perfil">${opt('', 'Todos', F.perfil)}${Object.entries(PERFIL).map(([k, v]) => opt(k, v, F.perfil)).join('')}</select></label>
      <label class="s" style="display:flex;gap:4px;align-items:center">★ mínimo <select data-cl-f="est">${['0', '2', '3', '4', '5'].map(v => opt(v, v === '0' ? 'Qualquer' : v + '+', F.est)).join('')}</select></label>
      <label class="s" style="display:flex;gap:4px;align-items:center">Situação <select data-cl-f="status">${opt('abertos', 'Em aberto', F.status)}${opt('', 'Todas', F.status)}${opt('possivel', '⚠️ Possível corretor', F.status)}${Object.entries(ST).map(([k, v]) => opt(k, v[0], F.status)).join('')}</select></label>
      <label class="s" style="display:flex;gap:4px;align-items:center">Corretor <select data-cl-f="cor">${opt('', 'Todos', F.cor)}${opt('-', 'Sem corretor', F.cor)}${cors.map(c => opt(c.id, c.nome, F.cor)).join('')}</select></label>
      ${fontes.length > 1 ? `<label class="s" style="display:flex;gap:4px;align-items:center">Fonte <select data-cl-f="fonte">${opt('', 'Todas', F.fonte)}${fontes.map(f => opt(f, FONTE[f] || f, F.fonte)).join('')}</select></label>` : ''}
    </div>
    <style>@media (min-width:761px){.cl-ordrow{display:none!important}}</style><div class="filtros cl-ordrow" role="group" aria-label="Ordenar por"><span class="s" style="align-self:center">Ordenar:</span>${[['estrelas', '★'], ['anunciado', 'Data'], ['preco', 'Valor'], ['bairro', 'Bairro'], ['perfil', 'Perfil'], ['status', 'Situação'], ['corretor', 'Corretor']].map(([k, t]) => `<button class="btn" data-cl-ord="${k}" aria-pressed="${F.ord === k}">${t}${seta(k)}</button>`).join('')}</div>`;
  }

  function linha(x, cors) {
    const st = ST[x._st] || [x._st, ''], t = telsDe(x), w = wa(t[0]), id = H.esc(x._id);
    const tem = ladoDe(x) === 'tem', ints = x._ints || [], sug = sugeridos(x, ints, cors), sobe = x._ef - (+x.estrelas || 0);
    const corsOrd = cors.slice().sort((a, b) => ((sug.get(b.id) || {}).n || 0) + ((sug.get(b.id) || {}).pediu ? 10 : 0) - ((sug.get(a.id) || {}).n || 0) - ((sug.get(a.id) || {}).pediu ? 10 : 0));
    const rotCor = c => { const s = sug.get(c.id); return s ? `★ ${c.nome} — ${[s.pediu ? 'pediu a captação' : '', s.n ? s.n + (s.n === 1 ? ' cliente interessado' : ' clientes interessados') : ''].filter(Boolean).join(' · ')}` : c.nome; };
    const preco = x.preco ? H.brl0 ? H.brl0(x.preco) : H.brl(x.preco) : '';
    const acaoDist = F.distrib === x._id
      ? `<span style="display:flex;gap:4px;flex-wrap:wrap"><select data-cl-cor="${id}">${opt('', sug.size ? 'Escolha (★ = sugerido)' : 'Escolha o corretor', '')}${corsOrd.map(c => opt(c.id, rotCor(c), x.distribuido_para || '')).join('')}</select><button class="btn" data-cl-cancela="1">Cancelar</button></span>`
      : `<button class="btn" data-cl-dist="${id}">${x.distribuido_para ? 'Trocar corretor' : 'Distribuir'}</button>`;
    const temTel = t.length > 0;
    const acaoCk = x._st === 'bloqueado' || !temTel ? ''
      : x._st === 'corretor' ? `<span style="display:flex;gap:4px;flex-wrap:wrap"><button class="btn" data-cl-lib="${id}">Liberar este lead</button><button class="btn" data-cl-nk="${id}">Não é corretor</button></span>`
      : `<span style="display:flex;gap:4px;flex-wrap:wrap"><button class="btn" data-cl-ck="${id}">${F.confCk === x._id ? 'Confirmar: é corretor' : x._pc && x._pc.length ? 'É corretor' : 'Marcar como corretor'}</button>${x._pc && x._pc.length ? `<button class="btn" data-cl-nk="${id}">Não é corretor</button>` : ''}</span>`;
    return `<tr id="capt-${id}">
      <td title="${H.esc(x.estrelas || 0)} de 5${sobe > 0 ? ' · +' + sobe + ' por clientes interessados' : ''}" style="white-space:nowrap;color:var(--brass)">${estr(x._ef)}${sobe > 0 ? ' ↑' : ''}${x.fora_da_ilha ? '<span class="s">fora da ilha</span>' : ''}</td>
      <td><b>${H.esc(x.nome || 'sem nome')}</b>${x._st === 'corretor' ? ` <span class="pill bad">🏷️ CORRETOR</span>${x._ck ? `<span class="s">${H.esc([x._ck.motivo, x._ck.marcado_por && x._ck.marcado_por !== 'diretoria' ? 'confirmado por ' + x._ck.marcado_por : ''].filter(Boolean).join(' · '))}</span>` : ''}` : x._pc && x._pc.length ? ` <span class="pill warn">⚠️ Possível corretor</span><span class="s">${H.esc(x._pc.join(' · '))}</span>` : ''}${t.length ? `<span class="s">${t.map(tel).map(H.esc).join(' · ')}${w ? ` · <a href="${w}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</span>` : `<span class="s">${H.esc(x.contato || 'sem telefone')}</span>`}</td>
      <td>${H.esc(x.bairro || '—')}<span class="s">${NIVEL[x.nivel || 1] || ''}</span></td>
      <td>${papelPill(x)}<span class="s">${x.negocio === 'venda' ? 'Venda' : x.negocio === 'aluguel' ? 'Aluguel' : ''}</span></td>
      <td style="min-width:200px"><span class="s" style="margin:0">${tem ? 'Imóvel que tem' : 'Imóvel que busca'}${tem ? ' · 🔶 não agenciado' : ''}</span>${H.esc((x.titulo || '').slice(0, 90))}<span class="s">${H.esc([x.quartos ? x.quartos + ' dorm' : '', x.area ? x.area + ' m²' : ''].filter(Boolean).join(' · '))}${x.link ? ` · <a href="${escUrl(x.link)}" target="_blank" rel="noopener">${x.fonte === 'facebook' ? 'perfil no grupo' : 'anúncio'}</a>` : ''} · ${H.esc(FONTE[x.fonte] || x.fonte || '')}</span>${tem && ints.length ? `<span class="s" style="color:var(--ok)"><b>👥 ${ints.length} cliente${ints.length === 1 ? ' procura' : 's procuram'} um imóvel assim:</b> ${H.esc(ints.slice(0, 3).map(y => (y.nome || '—') + (y.corretor ? ' (' + primeiro(y.corretor) + ')' : '')).join(', '))}${ints.length > 3 ? ` e mais ${ints.length - 3}` : ''}</span>` : ''}${[].concat(x.pedidos_captacao || []).length ? `<span class="s" style="color:var(--warn)"><b>⚡ Pedido de captação:</b> ${H.esc([].concat(x.pedidos_captacao).map(pd => primeiro(pd.corretor_nome || pd.corretor)).join(', '))}</span>` : ''}</td>
      <td class="n">${preco}</td>
      <td class="n">${x.anunciado_em ? H.dt(x.anunciado_em) : '—'}</td>
      <td><span class="pill ${st[1]}">${H.esc(st[0])}</span>${x.distribuido_para ? `<span class="s">${H.esc(nomeCor(x.distribuido_para))}${x.distribuido_em ? ' · ' + H.dt(x.distribuido_em) : ''}</span>` : ''}</td>
      <td><div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">
        <button class="btn" data-cl-rot="${id}">Copiar roteiro</button>${['bloqueado', 'corretor'].includes(x._st) ? '' : acaoDist}${acaoCk}
        ${x._st === 'corretor' ? '' : `<select data-cl-st="${id}" aria-label="Mudar a situação">${opt('', 'Mudar situação…', '')}${['abordado', 'follow_up', ...(tem ? ['agenciado'] : []), 'arquivado', 'novo'].filter(k => k !== x._st).map(k => opt(k, ST[k][0], '')).join('')}</select>`}
        ${x._st === 'bloqueado' ? '' : `<button class="btn" data-cl-bloq="${id}">${F.confBloq === x._id ? 'Confirmar bloqueio' : 'Não contatar (bloquear)'}</button>`}
      </div></td></tr>`;
  }


  // ===== 📤 Encaminhados (01/11/2026, pedido do Cleiton): todo lead repassado a um corretor — Captação e portais/campanhas —,
  // para quem, quando, por quem, de onde veio, o objetivo e o resumo do imóvel. Só leitura: nada é gravado daqui.
  const OBJ = {
    vende: ['🏠 Vende', 'info'], loca: ['🏠 Disponibiliza p/ locação', 'info'],
    compra: ['🔎 Compra', 'warn'], aluga: ['🔎 Aluga', 'warn'], procura: ['🔎 Procura (finalidade a confirmar)', '']
  };
  const OBJ_PERFIL = { vendedor: 'vende', locador: 'loca', operador_renda: 'loca', comprador: 'compra', locatario: 'aluga' };
  const ST_PORTAL = { vendido: 'Vendido', visita: 'Visita', em_contato: 'Em contato', sem_retorno: 'Sem retorno', descartado: 'Descartado', outro: 'Outro', sem_registro: 'Sem registro' };
  const EPOR = 100;
  const EO = { data: ['Data', x => x.data || null], nome: ['Lead', x => sem(x.nome) || null], para: ['Para quem', x => sem(x.para) || null],
    por: ['Por quem', x => sem(x.por) || null], fonte: ['Fonte', x => sem(x.fonte) || null], obj: ['Objetivo', x => x.obj || null],
    valor: ['Imóvel (valor)', x => x.valor || null], sit: ['Situação', x => sem(x.sit) || null] };
  const milBR = v => v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : 'R$ ' + Math.round(v / 1e3).toLocaleString('pt-BR') + ' mil';
  const faixa = (a, b, f) => a && b && a !== b ? f(a) + ' a ' + f(b) : (b || a) ? (a && !b ? 'a partir de ' : b && !a ? 'até ' : '') + f(b || a) : '';
  // mesmo nome do corretor nos dois lados (Captação usa o nome curto do cadastro; portais, o nome completo de Pessoas)
  const nomeLongo = nm => { try { return (H.op && typeof H.op.nomeCorretor === 'function' && H.op.nomeCorretor(nm)) || nm; } catch (_) { return nm; } };
  let ENC = { k: null, L: [] };
  function encaminhados() {
    let P = [];
    try { P = (H.op && typeof H.op.encaminhados === 'function' && H.op.encaminhados()) || []; } catch (_) { P = []; }
    // chave com assinatura do gancho: muda quando imóveis, oportunidades ou etapas do CRM chegam ou mudam (achado do testador, 01/11/2026)
    const k = [H.S[C], H.S[CC], P.length, P.map(l => [l.id, l.corretor_nome, l.etapa, l.status, (l.perfil || {}).fin, (l.perfil || {}).tipo, (l.perfil || {}).vmax].join('|')).join(';')];
    if (ENC.k && ENC.k.every((v, i) => v === k[i])) return ENC.L;
    const B = bloqueados(), out = [];
    H.lista(C).filter(x => x.distribuido_para).forEach(x => {
      const st = statusDe(x, B), m2 = +x.area || null;
      out.push({ id: 'capt-' + x._id, origem: 'capt', data: x.distribuido_em || '', nome: x.nome || 'Proprietário (sem nome)',
        para: nomeLongo(nomeCor(x.distribuido_para)), por: x.distribuido_por === 'diretoria' ? 'Diretoria' : (x.distribuido_por || '—'),
        fonte: FONTE[x.fonte] || x.fonte || 'Captação', fonte_det: 'Captação', obj: OBJ_PERFIL[x.perfil] || (ladoDe(x) === 'tem' ? 'loca' : 'procura'),
        imovel: [tipoDe(x), x.bairro, x.quartos ? x.quartos + ' dorm.' : '', m2 ? Math.round(m2) + ' m²' : ''].filter(Boolean).join(' · '),
        valor: +x.preco || null, valor_txt: x.preco ? H.brl0(+x.preco) : '', sit: (ST[st] || [st])[0], sit_cls: (ST[st] || ['', ''])[1] });
    });
    P.forEach(l => {
      const p = l.perfil || {}, fin = p.fin || '';
      const obj = fin === 'Venda' ? 'compra' : (fin === 'Locação' || fin === 'Temporada') ? 'aluga' : 'procura';
      const area = faixa(p.amin, p.amax, v => Math.round(v) + ' m²');
      out.push({ id: 'port-' + l.id, origem: 'portal', data: l.data || '', nome: l.nome || '—', para: l.corretor_nome || l.corretor, por: '—',
        fonte: l.canal || 'Portal', fonte_det: l.campanha || '', obj,
        imovel: [p.tipo, (p.bairros || []).join(', '), p.dorm ? p.dorm + '+ dorm.' : '', area, l.imovel_interesse ? 'ref. ' + l.imovel_interesse : ''].filter(Boolean).join(' · '),
        valor: p.vmax || p.vmin || null, valor_txt: faixa(p.vmin, p.vmax, milBR),
        sit: l.etapa || ST_PORTAL[l.status] || (l.status ? String(l.status).replace(/_/g, ' ') : 'Sem registro'), sit_cls: l.aberto === false ? '' : 'info' });
    });
    ENC = { k, L: out }; return out;
  }
  const E = { org: '', cor: '', obj: '', per: '', q: '', ord: 'data', dir: -1, pg: 0 };
  try { const g = JSON.parse(localStorage.getItem('hubv.capt.enc') || '{}'); ['org', 'per', 'ord', 'dir'].forEach(k => { if (g[k] !== undefined) E[k] = g[k]; }); } catch (_) {}
  const guardaE = () => { try { localStorage.setItem('hubv.capt.enc', JSON.stringify({ org: E.org, per: E.per, ord: E.ord, dir: E.dir })); } catch (_) {} };
  function filtraEnc(L) {
    const lim = E.per ? new Date(Date.now() - 3 * 3600e3 - (+E.per) * 864e5).toISOString().slice(0, 10) : '', q = sem(E.q);
    const f = L.filter(x => (!E.org || x.origem === E.org) && (!E.cor || x.para === E.cor) && (!E.obj || x.obj === E.obj) && (!lim || (x.data || '') >= lim)
      && (!q || sem([x.nome, x.para, x.fonte, x.fonte_det, x.imovel].join(' ')).includes(q)));
    const g = (EO[E.ord] || EO.data)[1];
    return f.sort((a, b) => { const va = g(a), vb = g(b); if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;
      return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt')) * E.dir; });
  }
  function abas(nEnc) {
    return `<div class="filtros" role="group" aria-label="Subaba da Captação"><button class="btn" data-cl-sub="lista" aria-pressed="${F.sub !== 'enc'}">📋 Leads a captar</button><button class="btn" data-cl-sub="enc" aria-pressed="${F.sub === 'enc'}">📤 Encaminhados (${nEnc})</button></div>`;
  }
  function renderEnc() {
    const L0 = encaminhados(), L = filtraEnc(L0);
    const pags = Math.max(1, Math.ceil(L.length / EPOR)); if (E.pg >= pags) E.pg = 0;
    const V = L.slice(E.pg * EPOR, E.pg * EPOR + EPOR);
    const nO = k => L0.filter(x => x.obj === k).length;
    const kp = Object.keys(OBJ).filter(k => k !== 'procura' || nO(k)).map(k => [OBJ[k][0], nO(k), k]);
    const porCor = {}; L0.forEach(x => { porCor[x.para] = (porCor[x.para] || 0) + 1; });
    const cors = Object.entries(porCor).sort((a, b) => b[1] - a[1]);
    const opt2 = (v, t, s) => `<option value="${H.esc(v)}"${String(s) === String(v) ? ' selected' : ''}>${H.esc(t)}</option>`;
    const nCapt = L0.filter(x => x.origem === 'capt').length;
    const thE = k => `<th><button type="button" class="btn" style="border:0;background:none;padding:0;font:inherit;color:inherit;white-space:nowrap" data-cl-eo="${k}" aria-label="Ordenar por ${EO[k][0]}">${EO[k][0]}${E.ord === k ? (E.dir > 0 ? ' ▲' : ' ▼') : ' ↕'}</button></th>`;
    const linhaE = x => { const o = OBJ[x.obj] || OBJ.procura;
      return `<tr><td>${x.data ? H.dt(x.data) : '—'}</td><td>${H.esc(x.nome)}</td><td>${H.esc(x.para || '—')}</td><td>${H.esc(x.por)}</td>
      <td>${H.esc(x.fonte)}${x.fonte_det && x.fonte_det !== x.fonte ? `<span class="s">${H.esc(x.fonte_det)}</span>` : ''}</td>
      <td><span class="pill ${o[1]}" style="white-space:nowrap">${o[0]}</span></td>
      <td style="min-width:180px">${x.imovel ? H.esc(x.imovel) : '<span class="s">sem dados do imóvel</span>'}${x.valor_txt ? `<span class="s">${H.esc(x.valor_txt)}</span>` : ''}</td>
      <td><span class="pill ${x.sit_cls}">${H.esc(x.sit)}</span></td></tr>`; };
    return `<h2>Captação</h2>${abas(L0.length)}
    <p class="nota">Todo lead já repassado a um corretor: os da <b>Captação</b> (com data, quem distribuiu e o imóvel do anúncio) e os de <b>portais e campanhas</b> (com o corretor da planilha e o perfil do imóvel de interesse). Só leitura; telefone e e-mail não aparecem aqui.</p>
    <style>div.kpis.enc-kpis.enc-kpis{grid-template-columns:repeat(${Math.min(5, kp.length)},minmax(0,1fr))!important}@media (max-width:900px){div.kpis.enc-kpis.enc-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}}</style>
    <div class="kpis enc-kpis" style="margin-top:4px">${kp.map(([t, n, k]) => `<button class="kpi" data-cl-ek="obj:${k}" aria-pressed="${E.obj === k}"><span class="rot">${t}</span><span class="num">${n}</span><span class="sub">${n === 1 ? "lead" : "leads"} · tocar filtra</span></button>`).join('')}</div>
    <style>.filtros.enc-cor>button{flex:0 0 auto!important}.filtros.enc-cor>.quebra-menu{display:none!important}</style>
    <div class="filtros enc-cor" role="group" aria-label="Por corretor"><button class="btn" data-cl-ek="cor:" aria-pressed="${!E.cor}">Todos (${L0.length})</button>${cors.map(([c, n]) => `<button class="btn" data-cl-ek="cor:${H.esc(c)}" aria-pressed="${E.cor === c}">${H.esc(c)} (${n})</button>`).join('')}</div>
    <div class="filtros" style="align-items:center">
      <label class="s" style="display:flex;gap:4px;align-items:center">Origem <select data-cl-ef="org">${opt2('', 'Todas (' + L0.length + ')', E.org)}${opt2('capt', 'Captação (' + nCapt + ')', E.org)}${opt2('portal', 'Portais e campanhas (' + (L0.length - nCapt) + ')', E.org)}</select></label>
      <label class="s" style="display:flex;gap:4px;align-items:center">Objetivo <select data-cl-ef="obj">${opt2('', 'Todos', E.obj)}${Object.entries(OBJ).map(([k, v]) => opt2(k, v[0], E.obj)).join('')}</select></label>
      <label class="s" style="display:flex;gap:4px;align-items:center">Corretor <select data-cl-ef="cor">${opt2('', 'Todos', E.cor)}${cors.map(([c]) => opt2(c, c, E.cor)).join('')}</select></label>
      <label class="s" style="display:flex;gap:4px;align-items:center">Período <select data-cl-ef="per">${[['', 'Tudo'], ['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['365', '12 meses']].map(([v, t]) => opt2(v, t, E.per)).join('')}</select></label>
      <label class="s enc-ord-movel" style="display:flex;gap:4px;align-items:center">Ordenar por <select data-cl-ef="ord">${Object.entries(EO).map(([k, v]) => opt2(k, v[0], E.ord)).join('')}</select></label>
      <label class="s" style="display:flex;gap:4px;align-items:center;min-width:0">Buscar <input type="search" id="cl-enc-q" data-cl-ef="q" value="${H.esc(E.q)}" placeholder="nome, bairro, campanha" style="min-width:0;max-width:200px"></label>
    </div>
    <p class="s" style="margin:0 0 8px">${L.length} encaminhado${L.length === 1 ? '' : 's'}${pags > 1 ? ` · página ${E.pg + 1} de ${pags}` : ''}${E.obj || E.cor ? ' · <button class="btn" data-cl-ek="limpa">Limpar filtro</button>' : ''}</p>
    <style>@media (min-width:761px){.enc-ord-movel{display:none!important}}@media (max-width:760px){.tabela:has(>table.enc-cards){overflow:visible!important;background:none!important;border:0!important}table.enc-cards{display:block!important;min-width:0!important;width:100%!important;border:0!important}table.enc-cards thead{display:none!important}table.enc-cards tbody{display:flex!important;flex-direction:column;gap:8px}table.enc-cards tr{display:grid!important;grid-template-columns:minmax(0,1fr) fit-content(45%);grid-template-areas:"nome sit" "para data" "fonte obj" "por por" "imo imo";gap:4px 12px;padding:9px 11px;background:var(--panel);border:1px solid var(--line);border-radius:10px}table.enc-cards tr[hidden]{display:none!important}table.enc-cards td{display:block!important;padding:0!important;border:0!important;min-width:0!important;width:auto!important;white-space:normal!important;overflow-wrap:anywhere;text-align:left!important;font-size:13px;line-height:1.35}table.enc-cards td .s{display:block!important;white-space:normal!important}table.enc-cards td:nth-child(1){grid-area:data;text-align:right!important;font-size:12px}table.enc-cards td:nth-child(2){grid-area:nome;font-weight:600}table.enc-cards td:nth-child(3){grid-area:para}table.enc-cards td:nth-child(3)::before{content:"Para ";color:var(--muted);font-size:12px}table.enc-cards td:nth-child(4){grid-area:por;font-size:12px}table.enc-cards td:nth-child(4)::before{content:"Distribuído por ";color:var(--muted)}table.enc-cards td:nth-child(5){grid-area:fonte;font-size:12px}table.enc-cards td:nth-child(6){grid-area:obj;text-align:right!important}table.enc-cards td:nth-child(7){grid-area:imo;min-width:0!important}table.enc-cards td:nth-child(8){grid-area:sit;text-align:right!important}}</style>
    ${L.length ? `<div class="tabela"><table class="enc-cards" data-ord-dados="1"><thead><tr>${Object.keys(EO).map(thE).join('')}</tr></thead><tbody>${V.map(linhaE).join('')}</tbody></table></div>` : H.vazio(L0.length ? 'Nenhum encaminhado com esse filtro.' : 'Nenhum lead encaminhado ainda. Ao distribuir na Captação, ele aparece aqui.')}
    ${pags > 1 ? `<div class="filtros" style="margin-top:10px"><button class="btn" data-cl-epg="-1"${E.pg ? '' : ' disabled'}>‹ Anterior</button><button class="btn" data-cl-epg="1"${E.pg < pags - 1 ? '' : ' disabled'}>Próxima ›</button></div>` : ''}`;
  }

  function render() {
    if (F.sub === 'enc' && !F.foco) return renderEnc();
    if (!H.carregado[C]) return H.vazio('Carregando os leads a captar…');
    const B = bloqueados(), cors = corretores(), K = cadK(), CT = contaTels();
    const MI = mapaInt(), L0 = H.lista(C).map(x => { const ints = interessados(x, MI); return Object.assign({}, x, { _st: statusDe(x, B, K), _ints: ints, _n: ints.length, _ef: estrEf(x, ints.length), _pc: sinaisCorretor(x, K, CT), _ck: corretorDe(x, K) }); });
    if (!L0.length) return `<h2>Captação</h2>${H.vazio('Nenhum lead a captar ainda. A coleta semanal grava aqui.')}`;
    if (F.foco) { const fx = L0.find(x => x._id === F.foco); if (fx) { Object.assign(F, { nivel: '', lado: '', perfil: '', est: '0', fonte: '', cor: '', status: FECHADOS.includes(fx._st) ? '' : 'abertos' }); if (fx._st !== 'bloqueado') F.distrib = fx._id; } }
    const L = ordena(filtrados(L0, B));
    const busca = H.buscaAba && H.buscaAba.ativa();
    const por = busca ? 1e9 : POR_PAG, pags = Math.max(1, Math.ceil(L.length / por)); if (F.pg >= pags) F.pg = 0;
    if (F.foco) { const i = L.findIndex(x => x._id === F.foco); if (i >= 0) F.pg = Math.floor(i / por); F.foco = ''; }
    const V = L.slice(F.pg * por, F.pg * por + por);
    const ult = H.lista(C).map(x => x.coletado_em).filter(Boolean).sort().pop();
    return `<h2>Captação</h2>${abas(encaminhados().length)}
    <p class="nota">Dois lados: <b>🏠 quem tem imóvel</b> (proprietário que anuncia direto, sem corretor — imóvel <b>🔶 não agenciado</b>) e <b>🔎 quem procura imóvel</b>. Quando um cliente da Vivere procura um imóvel como o do proprietário, a ★ sobe, o roteiro cita os interessados e Distribuir sugere (★) o corretor que já tem o cliente. Coleta semanal${ult ? `, a última em ${H.dt(ult)}` : ''}. Por padrão aparecem só os bairros principais; subsidiários e continente ficam nos filtros. Distribua ao corretor, copie o roteiro e ele aborda: daqui não sai nenhuma mensagem. Regras: terça a quinta, 9h–11h ou 14h–17h · 1ª mensagem, 48 h, 1 follow-up, arquivar · sem catálogo na primeira mensagem · não falar de taxa antes de ouvir a dor do proprietário · quem pedir para não ser contatado vai para o bloqueio. <b>🏷️ Corretor anunciante</b>: quem anuncia como proprietário mas é corretor ou imobiliária. A coleta só sugere (⚠️, com o motivo); com “É corretor” o telefone entra no cadastro e, nas próximas pesquisas, o anúncio já chega marcado e não vai a distribuição.</p>
    ${cartoes(L0, B)}${filtrosHTML(L0, cors)}
    <p class="s" style="margin:0 0 8px">${L.length} lead${L.length === 1 ? '' : 's'}${pags > 1 ? ` · página ${F.pg + 1} de ${pags}` : ''}</p>
    <style>@media (max-width:760px){.tabela:has(>table.cl-cards){overflow:visible!important;border:0!important}table.cl-cards{display:block!important;min-width:0!important;width:100%!important}table.cl-cards thead{display:none!important}table.cl-cards tbody{display:flex!important;flex-direction:column;gap:8px}table.cl-cards tr{display:grid!important;grid-template-columns:74px minmax(0,1fr) auto;grid-template-areas:"est pes sit" "bai bai val" "lado lado anu" "imo imo imo" "aco aco aco";gap:3px 10px;padding:9px 11px;border:1px solid var(--line,rgba(127,127,127,.25));border-radius:10px;background:var(--card,transparent)}table.cl-cards td{display:block!important;padding:0!important;border:0!important;min-width:0!important;width:auto!important;font-size:13px;line-height:1.3;text-align:left!important;white-space:normal!important;overflow-wrap:anywhere}table.cl-cards td .s{display:inline!important;margin:0 0 0 4px!important;font-size:12px;white-space:normal!important}table.cl-cards td:nth-child(1){grid-area:est;font-size:12px;white-space:nowrap!important}table.cl-cards td:nth-child(1) .s{display:block!important;margin:0!important}table.cl-cards td:nth-child(2){grid-area:pes}table.cl-cards td:nth-child(2) .s{display:block!important;margin:1px 0 0!important}table.cl-cards td:nth-child(3){grid-area:bai}table.cl-cards td:nth-child(4){grid-area:lado}table.cl-cards td:nth-child(5){grid-area:imo}table.cl-cards td:nth-child(5)>.s:first-child{display:block!important;margin:0!important}table.cl-cards td:nth-child(6){grid-area:val;font-weight:600;white-space:nowrap!important;text-align:right!important}table.cl-cards td:nth-child(7){grid-area:anu;white-space:nowrap!important;font-size:12px;opacity:.75;text-align:right!important}table.cl-cards td:nth-child(8){grid-area:sit;text-align:right!important}table.cl-cards td:nth-child(8) .s{display:block!important;margin:2px 0 0!important}table.cl-cards td:nth-child(9){grid-area:aco;margin-top:4px}table.cl-cards td:nth-child(9)>div{flex-direction:row!important;flex-wrap:wrap!important;gap:6px!important}table.cl-cards td:nth-child(9) button,table.cl-cards td:nth-child(9) select,table.cl-cards td:nth-child(9) .btn{padding:4px 8px!important;font-size:12px!important;min-height:0!important}}</style>${L.length ? `<div class="tabela"><table class="cl-cards"><thead><tr>${th('estrelas', '★')}${th('nome', 'Pessoa')}${th('bairro', 'Bairro')}${th('perfil', 'Lado e papel')}<th>Imóvel</th>${th('preco', 'Valor', 'n')}${th('anunciado', 'Anunciado', 'n')}${th('status', 'Situação')}<th>Ações</th></tr></thead><tbody>${V.map(x => linha(x, cors)).join('')}</tbody></table></div>` : H.vazio('Nenhum lead com esses filtros.')}
    ${pags > 1 ? `<div class="filtros" style="margin-top:10px"><button class="btn" data-cl-pg="-1"${F.pg ? '' : ' disabled'}>‹ Anterior</button><button class="btn" data-cl-pg="1"${F.pg < pags - 1 ? '' : ' disabled'}>Próxima ›</button></div>` : ''}`;
  }

  // gravações (update com o que muda; histórico curto no próprio lead)
  async function grava(id, campos, evento) {
    const DB = H.db(); const x = (H.S[C] || {})[id]; if (!DB || !x) return;
    const hist = [].concat(x.historico || []).slice(-19); hist.push(Object.assign({ em: new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 16).replace('T', ' ') }, evento));
    try { await DB.doc(C + '/' + id).update(Object.assign({}, campos, { historico: hist, atualizado_em: H.hojeISO() })); }
    catch (e) { alert('Não consegui gravar (' + (e && e.code || 'erro') + '). Tente de novo.'); }
    H.pede();
  }
  async function bloqueia(id) {
    const DB = H.db(); const x = (H.S[C] || {})[id]; if (!DB || !x) return;
    const ts = telsDe(x); if (!ts.length) return grava(id, { status: 'bloqueado' }, { acao: 'bloqueado' });
    try { for (const t of duasFormas(ts)) await DB.doc(CB + '/' + t).set({ telefone: t, nome: x.nome || '', motivo: 'pediu para não ser contatado', em: H.hojeISO(), lead: id }); } catch (e) { alert('Não consegui bloquear (' + (e && e.code || 'erro') + ').'); return; }
    await grava(id, { status: 'bloqueado' }, { acao: 'bloqueado' });
  }

  async function marcaCorretor(id, situacao) {
    const DB = H.db(); const x = (H.S[C] || {})[id]; if (!DB || !x) return;
    const ts = telsDe(x); if (!ts.length) return;
    const motivo = situacao === 'corretor' ? (sinaisCorretor(x).join(' · ') || 'marcado pela diretoria') : 'diretoria: não é corretor';
    try { for (const t of duasFormas(ts)) await DB.doc(CK + '/' + t).set({ telefone: t, nome: x.nome || '', situacao, motivo, marcado_por: 'diretoria', em: H.hojeISO(), lead: id }); }
    catch (e) { alert('Não consegui gravar no cadastro de corretores (' + (e && e.code || 'erro') + ').'); return; }
    await grava(id, situacao === 'corretor' ? { liberado_corretor: false } : {}, { acao: situacao === 'corretor' ? 'marcado corretor anunciante' : 'não é corretor' });
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-cl-ck],[data-cl-nk],[data-cl-lib],[data-cl-lado],[data-cl-nivel],[data-cl-ord],[data-cl-pg],[data-cl-kpi],[data-cl-rot],[data-cl-dist],[data-cl-cancela],[data-cl-bloq],[data-cl-sub],[data-cl-eo],[data-cl-ek],[data-cl-epg]'); if (!t) return;
    const d = t.dataset;
    if (d.clCk) { if (F.confCk !== d.clCk) { F.confCk = d.clCk; } else { F.confCk = ''; marcaCorretor(d.clCk, 'corretor'); return; } }
    else if (d.clNk) { F.confCk = ''; marcaCorretor(d.clNk, 'nao_corretor'); return; }
    else if (d.clLib) { grava(d.clLib, { liberado_corretor: true }, { acao: 'liberado (corretor anunciante)' }); return; }
    else if (d.clSub) { F.sub = d.clSub === 'enc' ? 'enc' : 'lista'; guarda(); }
    else if (d.clEo) { if (E.ord === d.clEo) E.dir = -E.dir; else { E.ord = d.clEo; E.dir = ['data', 'valor'].includes(d.clEo) ? -1 : 1; } E.pg = 0; guardaE(); }
    else if (d.clEk) { const [a, ...r] = String(d.clEk).split(':'), v = r.join(':'); if (a === 'limpa') { E.obj = ''; E.cor = ''; } else if (a === 'obj') E.obj = E.obj === v ? '' : v; else if (a === 'cor') E.cor = E.cor === v ? '' : v; E.pg = 0; }
    else if (d.clEpg) { E.pg = Math.max(0, E.pg + (+d.clEpg)); window.scrollTo(0, 0); }
    else if (d.clLado !== undefined) { F.lado = d.clLado; if (F.lado && F.perfil && ladoDe({ perfil: F.perfil }) !== F.lado) F.perfil = ''; F.pg = 0; guarda(); }
    else if (d.clNivel !== undefined) { F.nivel = d.clNivel; F.pg = 0; guarda(); }
    else if (d.clOrd) { if (F.ord === d.clOrd) F.dir = -F.dir; else { F.ord = d.clOrd; F.dir = ['nome', 'bairro', 'perfil', 'status', 'corretor'].includes(d.clOrd) ? 1 : -1; } guarda(); }
    else if (d.clPg) { F.pg = Math.max(0, F.pg + (+d.clPg)); window.scrollTo(0, 0); }
    else if (d.clKpi !== undefined) { if (String(d.clKpi).startsWith('lado:')) { F.lado = d.clKpi.slice(5); if (F.lado && F.perfil && ladoDe({ perfil: F.perfil }) !== F.lado) F.perfil = ''; F.status = 'abertos'; } else F.status = d.clKpi || 'abertos'; F.pg = 0; guarda(); }
    else if (d.clRot) { const x = (H.S[C] || {})[d.clRot]; if (x) H.copiaTexto(roteiro(x, x.distribuido_para ? nomeCor(x.distribuido_para) : '', interessados(Object.assign({ _id: d.clRot }, x)).length), t); return; }
    else if (d.clDist) { F.distrib = d.clDist; F.confBloq = ''; F.confCk = ''; }
    else if (d.clCancela) { F.distrib = ''; }
    else if (d.clBloq) { if (F.confBloq !== d.clBloq) { F.confBloq = d.clBloq; } else { F.confBloq = ''; bloqueia(d.clBloq); return; } }
    H.pede();
  });
  document.addEventListener('change', e => {
    const t = e.target; if (!t.dataset) return; const d = t.dataset;
    if (d.clF) { F[d.clF] = t.value; if (d.clF === 'perfil' && F.perfil && F.lado && ladoDe({ perfil: F.perfil }) !== F.lado) F.lado = ''; F.pg = 0; guarda(); H.pede(); }
    else if (d.clEf) { E[d.clEf] = t.value; if (d.clEf === 'ord') E.dir = ['data', 'valor'].includes(t.value) ? -1 : 1; E.pg = 0; guardaE(); H.pede(); }
    else if (d.clCor && t.value) { const id = d.clCor, cor = t.value, x = (H.S[C] || {})[id] || {}; F.distrib = '';
      // retrato de quantos clientes procuram um imóvel assim (o roteiro do painel do corretor usa o número)
      const ni = interessados(Object.assign({ _id: id }, x)).length;
      grava(id, { status: 'distribuido', distribuido_para: cor, distribuido_em: H.hojeISO(), distribuido_por: 'diretoria', interessados: { n: ni, em: H.hojeISO() } }, { acao: 'distribuido', para: cor }); }
    else if (d.clSt && t.value) { const st = t.value; grava(d.clSt, { status: st }, { acao: st }); }
  });

  H.registrar({
    id: 'captacao-leads', aba: 'Captação', grupo: 'crm', depois: 'leads',
    colecoes: [C, CB, CC, CK],
    tipos: { captacao_semana: 'Captação — leads da semana' },
    render,
    foco(alvo) { if (alvo) { F.foco = alvo; F.sub = 'lista'; H.pede(); } },
    // aba Leads: só os já distribuídos, sem telefone nem e-mail (contrato do LEIA-ME)
    leads() {
      const B = bloqueados();
      return H.lista(C).filter(x => x.distribuido_para && !['bloqueado', 'arquivado', 'corretor'].includes(statusDe(x, B))).map(x => ({
        lado: ladoDe(x), papel: x.perfil || '', capt_id: x._id,
        imovel_tem: ladoDe(x) === 'tem' ? [tipoDe(x), x.bairro, x.quartos ? x.quartos + ' dorm' : '', x.preco ? 'R$ ' + Math.round(x.preco).toLocaleString('pt-BR') : ''].filter(Boolean).join(' · ') : '',
        perfil_busca: ladoDe(x) === 'procura' && x.bairro ? { finalidade: x.perfil === 'comprador' ? 'Venda' : 'Locação', tipo: tipoDe(x), bairros: x.bairro, vmin: null, vmax: x.preco || null, obs: '' } : null,
        nome: x.nome || 'Proprietário (sem nome)', data: x.distribuido_em || x.coletado_em || '', mes: String(x.distribuido_em || x.coletado_em || '').slice(0, 7),
        campanha: ladoDe(x) === 'tem' ? 'Captação de proprietários' : 'Captação · procura imóvel', planilha: 'HUB · Captação', canal: 'Captação', corretor: nomeCor(x.distribuido_para),
        origem: FONTE[x.fonte] || x.fonte || 'captação', imovel: [PERFIL[x.perfil], x.bairro].filter(Boolean).join(' · '),
        status: (ST[statusDe(x, B)] || ['—'])[0], progresso: statusDe(x, B) === 'abordado' ? 'em contato' : ''
      }));
    },
    // imóvel de quem TEM, sem telefone, link, endereço nem foto do anúncio de terceiro: só o que o cruzamento precisa
    imoveisCaptados() {
      const B = bloqueados();
      return H.lista(C).filter(x => ladoDe(x) === 'tem' && !FECHADOS.includes(statusDe(x, B)) && x.bairro).map(x => ({
        id: 'C:' + x._id, lead: x._id, ref: 'A captar', fin: x.negocio === 'venda' ? 'Venda' : 'Locação', tipo: tipoDe(x), bairro: x.bairro,
        valor: x.preco || null, dorm: x.quartos || null, area: x.area || null, papel: x.perfil, estrelas: +x.estrelas || 0,
        dono: x.nome || '', titulo: (x.titulo || '').slice(0, 90), coletado_em: x.coletado_em || '',
        situacao: x.distribuido_para ? 'distribuido' : 'livre', corretor_nome: x.distribuido_para ? nomeCor(x.distribuido_para) : ''
      }));
    },
    busca(q) {
      const tm = (q || '').toLowerCase().trim(); if (tm.length < 2) return [];
      const dq = dig(tm);
      return H.lista(C).filter(x => (x.nome || '').toLowerCase().includes(tm) || (x.bairro || '').toLowerCase().includes(tm) || (dq.length >= 6 && telsDe(x).some(t => t.includes(dq))))
        .slice(0, 8).map(x => ({ grp: 'Captação', tit: x.nome || 'Proprietário sem nome', sub: [PERFIL[x.perfil], x.bairro, (ST[x.status] || [''])[0]].filter(Boolean).join(' · '), ir: { aba: 'captacao-leads', linha: 'capt-' + x._id } }));
    }
  });
})();
