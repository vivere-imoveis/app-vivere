// modulos/solicitacoes.js — HUB VIVERE · CRM › Solicitações (construção "solicitacoes", 01/11/2026)
// Pedido do Cleiton (01/11/2026 20h37): "precisamos de uma aba, um módulo dentro do nosso hub de direção para poder resolver de forma
// mais rápida e assertiva e simultânea as solicitações dos corretores."
// • Lê: solicitacoes_fila (cópia normalizada dos pedidos de TODOS os painéis, gravada pela rodada diária dentro da Entrega Captação),
//   solicitacoes_decisoes (decisões tomadas aqui), construcoes (doc solicitacoes: mapa diretores uid → nome) e controle (paineis_corretor).
// • Grava SÓ em solicitacoes_decisoes: set em doc novo; update enquanto a decisão não foi devolvida ao painel; depois de devolvida,
//   bloqueia (a não ser que o corretor tenha reenviado o pedido depois de um "pedir complemento": aí abre nova rodada de decisão).
// • A decisão vai ao painel do corretor na próxima rodada (7h43). Captação: decide-se em CRM › Captação (aqui só lista e leva até lá).
// • A IA sugere (sugestao {acao, mensagem, motivo, origem}); "Usar sugestão" só preenche — quem decide é a diretoria.
// • Sem CPF, telefone, e-mail ou endereço do proprietário (a rodada não copia; o painel mostra), sem fotos (só a contagem).
// Versão 2026-11-01.1
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc;
  const ID = 'solicitacoes', CF = 'solicitacoes_fila', CD = 'solicitacoes_decisoes';
  const RODADA = '7h43';

  const TIPO = { novo_imovel: 'Cadastro de imóvel', alteracao: 'Alteração de imóvel', fotos: 'Fotos novas', captacao: 'Pedido de captação' };
  const TIPO_CURTO = { novo_imovel: 'Cadastro', alteracao: 'Alteração', fotos: 'Fotos', captacao: 'Captação' };
  const DEC = { aprovada: ['Aprovada', 'ok'], complemento: ['Complemento pedido', 'warn'], recusada: ['Recusada', 'bad'] };
  const EST = {
    pendente: ['Aguardando decisão', 'warn'], decidida_hub: ['Decidida no HUB · vai na rodada', 'info'],
    complemento: ['Com o corretor (complemento)', ''], aprovada: ['Aprovada', 'ok'], aplicada: ['Aplicada no site', 'ok'],
    recusada: ['Recusada', 'bad'], rascunho: ['Rascunho do corretor', ''], cancelada: ['Cancelada', ''],
  };
  const ACAO_ROT = { aprovada: 'Aprovar', complemento: 'Pedir complemento', recusada: 'Recusar' };
  // rótulos do cadastro (mesmos do painel do corretor, SECOES de painel.js 2026-11-01)
  const SECOES = [
    ['Proprietário', { p_nome: 'Nome completo', p_cpf: 'CPF (ou CNPJ)', p_celular: 'Celular com DDD', p_email: 'E-mail', p_estado_civil: 'Estado civil', p_conjuge_nome: 'Nome do cônjuge ou companheiro(a)', p_conjuge_cpf: 'CPF do cônjuge ou companheiro(a)', p_endereco: 'Endereço residencial com CEP', p_rg: 'RG ou outro documento', p_profissao: 'Profissão', p_nascimento: 'Data de nascimento', p_nacionalidade: 'Nacionalidade', p_tel2: 'Outro telefone' }],
    ['Imóvel', { finalidade: 'Finalidade', uso: 'Uso', tipo: 'Tipo', cep: 'CEP', logradouro: 'Rua ou avenida', numero: 'Número', complemento: 'Unidade, bloco ou casa', bairro: 'Bairro', cidade: 'Cidade', condominio_nome: 'Condomínio ou empreendimento' }],
    ['Características', { dorm: 'Dormitórios', suites: 'Suítes', banh: 'Banheiros', vagas: 'Vagas de garagem', box: 'Vagas e box', area_privativa: 'Área privativa (m²)', area_total: 'Área total (m²)', area_terreno: 'Área do terreno (m²)', cond_itens: 'Condomínio', infra: 'Infraestrutura', orientacao: 'Posição solar', padrao: 'Padrão', conservacao: 'Conservação', mobilia: 'Mobília', situacao: 'Situação', ano: 'Ano de construção ou entrega', construtora: 'Construtora', ocupacao: 'Ocupação', diferenciais: 'Diferenciais' }],
    ['Valores e condições', { valor: 'Valor (R$)', condominio: 'Condomínio mensal (R$)', iptu: 'IPTU anual (R$)', aceita: 'Aceita na negociação', entrada_min: 'Entrada mínima (R$)', parcelas_max: 'Máximo de parcelas', pets: 'Aceita animais', garantias: 'Garantias aceitas' }],
    ['Documentação e regularidade', { escritura: 'Situação do registro', matricula: 'Matrícula', cartorio: 'Ofício de registro', inscricao_iptu: 'Inscrição imobiliária (IPTU)', averbacao: 'Construção averbada', onus: 'Ônus, dívidas ou restrições' }],
    ['Agenciamento e visitas', { exclusivo: 'Exclusividade', prazo_dias: 'Prazo da autorização (dias)', comissao: 'Comissão acordada', chaves: 'Onde estão as chaves', horario_visita: 'Horário para visitas', contato_visita: 'Quem marca a visita', obs: 'Observações para a diretoria' }],
  ];
  const MOEDA = new Set(['valor', 'condominio', 'iptu', 'entrada_min']);

  // ------------------------------------------------------------------ estado da aba (por leitor)
  const F = { sub: 'pend', ord: null, fl: { q: '', cor: '', tipo: '', dec: '', de: '', ate: '' }, sel: new Set(), aberto: '', loteMsg: '', loteErro: '', msg: {}, erro: '', ok: '', foco: '' };
  try { const g = JSON.parse(localStorage.getItem('hubv.sol') || '{}'); if (g.sub) F.sub = g.sub; if (g.ord) F.ord = g.ord; } catch (_) {}
  const guarda = () => { try { localStorage.setItem('hubv.sol', JSON.stringify({ sub: F.sub, ord: F.ord })); } catch (_) {} };

  const agora = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 19); };
  const dtH = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : '—'; };
  const dtC = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}` : '—'; };
  const semAc = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const brl = (v) => (v === '' || v == null || isNaN(+v) ? esc(v) : 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 }));
  const pill = (par) => `<span class="pill ${par[1]}">${esc(par[0])}</span>`;

  // ------------------------------------------------------------------ dados
  const fila = () => H.lista(CF);
  const doc = (id) => { const x = (H.S[CF] || {})[id]; return x ? Object.assign({ _id: id }, x) : null; };   // com _id, como H.lista
  const decs = () => H.S[CD] || {};
  const cfg = () => ((H.S.construcoes || {})[ID]) || {};
  const urlPainel = (x) => x.painel_url || ((((H.S.controle || {}).paineis_corretor || {}).itens || {})[x.slug] || {}).url || '';
  // a decisão tomada aqui só vale para a rodada em que o pedido está: se o corretor reenviou depois de devolvida, abre nova rodada
  function situ(x) {
    const d = decs()[x._id];
    const reenviado = d && d.devolvida_em && x.estado === 'pendente' && String(x.enviado_em || '') > String(d.em || '');
    if (x.estado === 'cancelada') return { est: 'cancelada', d, pode: false, bloq: '' };
    if (d && d.status && !d.devolvida_em) return { est: 'decidida_hub', d, pode: x.tipo !== 'captacao', bloq: '' };
    if (d && d.devolvida_em && !reenviado) return { est: x.estado || 'pendente', d, pode: false, bloq: d.situacao_devolucao === 'decidida_no_painel' ? 'painel' : 'devolvida' };
    return { est: x.estado || 'pendente', d: reenviado ? null : d, ant: reenviado ? d : null, pode: (x.estado || 'pendente') === 'pendente' && x.tipo !== 'captacao', bloq: '' };
  }
  const aguarda = (s) => s.est === 'pendente';
  const nPend = () => fila().filter((x) => aguarda(situ(x))).length;
  const decididoEm = (x, s) => (s.d && s.d.em) || ((x.decisao_painel || {}).em) || '';
  const decStatus = (x, s) => (s.d && s.d.status) || ((x.decisao_painel || {}).status) || '';
  const porNome = (x, s) => (s.d && s.d.por_nome) || ((x.decisao_painel || {}).por) || '';

  // ------------------------------------------------------------------ colunas: ordenação ▲▼↕ e filtro ⏷ (padrão das Oportunidades do núcleo)
  const ORD = {
    ref: ['Pedido', (z) => z.x.ref || null], tipo: ['Tipo', (z) => TIPO_CURTO[z.x.tipo] || z.x.tipo || null],
    cor: ['Corretor', (z) => z.x.nome_corretor || z.x.slug || null], env: ['Enviado', (z) => z.x.enviado_em || z.x.criado_em || null],
    est: ['Situação', (z) => (EST[z.s.est] || [z.s.est])[0] || null], falta: ['Faltam', (z) => (z.x.faltantes || []).length],
    sug: ['Sugestão', (z) => (z.x.sugestao && ACAO_ROT[z.x.sugestao.acao]) || null],
  };
  const ORD_H = {
    ref: ORD.ref, tipo: ORD.tipo, cor: ORD.cor, env: ORD.env, dec: ['Decisão', (z) => (DEC[decStatus(z.x, z.s)] || [''])[0] || null],
    em: ['Decidido em', (z) => decididoEm(z.x, z.s) || null], por: ['Por', (z) => porNome(z.x, z.s) || null],
  };
  const FIL = { ref: 'q', tipo: 'tipo', cor: 'cor', env: 'de', est: 'q', falta: 'q', sug: 'q', dec: 'dec', em: 'de', por: 'q' };
  const colunas = () => (F.sub === 'hist' ? ORD_H : ORD);
  const seta = (k) => { const o = F.ord; return o && o.k === k ? (o.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'; };
  const cmp = (a, b, dir) => { const va = a == null || a === '', vb = b == null || b === ''; if (va || vb) return va && vb ? 0 : va ? 1 : -1;
    const r = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' }); return dir === 'asc' ? r : -r; };
  const prox = (o, k) => (!o || o.k !== k ? { k, dir: 'desc' } : o.dir === 'desc' ? { k, dir: 'asc' } : null);
  const filOn = (k) => { const a = FIL[k], f = F.fl; return a === 'de' ? !!(f.de || f.ate) : !!(a && f[a]); };

  function base() {
    const L = fila().map((x) => ({ x, s: situ(x) }));
    if (F.sub === 'hist') return L.filter((z) => decStatus(z.x, z.s) && !aguarda(z.s) && z.s.est !== 'decidida_hub');
    if (F.sub === 'todos') return L;
    return L.filter((z) => aguarda(z.s) || z.s.est === 'decidida_hub');
  }
  function filtra(L) {
    const f = F.fl, t = semAc(f.q).trim().split(/\s+/).filter(Boolean);
    return L.filter((z) => { const x = z.x, d = String(F.sub === 'hist' ? decididoEm(x, z.s) : (x.enviado_em || x.criado_em || '')).slice(0, 10);
      const txt = semAc([x.ref, x.nome_corretor, x.slug, TIPO[x.tipo], (EST[z.s.est] || [])[0], x.obs, (x.faltantes || []).join(' '), x.sugestao && x.sugestao.mensagem, porNome(x, z.s)].filter(Boolean).join(' '));
      return (!f.cor || x.slug === f.cor) && (!f.tipo || x.tipo === f.tipo) && (!f.dec || decStatus(x, z.s) === f.dec)
        && (!f.de || (d && d >= f.de)) && (!f.ate || (d && d <= f.ate)) && (!t.length || t.every((w) => txt.includes(w))); });
  }
  function ordena(L) {
    const C = colunas();
    if (F.ord && C[F.ord.k]) { const g = C[F.ord.k][1]; return L.sort((a, b) => cmp(g(a), g(b), F.ord.dir)); }
    // padrão: pendentes do mais antigo para o mais novo (fila de atendimento); histórico do mais recente para o mais antigo
    return F.sub === 'hist' ? L.sort((a, b) => cmp(decididoEm(a.x, a.s), decididoEm(b.x, b.s), 'desc'))
      : L.sort((a, b) => (aguarda(b.s) - aguarda(a.s)) || cmp(a.x.enviado_em || a.x.criado_em, b.x.enviado_em || b.x.criado_em, 'asc'));
  }

  // ------------------------------------------------------------------ visual (só variáveis de cor do núcleo: funciona no claro e no escuro)
  const CSS = `<style>
.sol-wrap{container-type:inline-size;min-width:0}
div.kpis.sol-kpis.sol-kpis{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px;margin:4px 0 12px}
.sol-kpis .kpi .num{font-size:24px}
@media (max-width:760px){div.kpis.sol-kpis.sol-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
.sol-subs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.sol-subs .btn[aria-pressed="true"]{border-color:var(--accent);font-weight:600}
.sol-lote{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;margin:0 0 10px;padding:10px 12px;border:1px solid var(--accent);border-radius:6px;background:var(--soft)}
.sol-lote textarea{flex:1 1 100%;min-width:0;box-sizing:border-box;font:inherit;font-size:13px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:8px;min-height:56px}
.sol-lote .erro,.sol-dec .erro{color:var(--bad);font-size:12px}
.sol-cab,.sol-lin{display:grid;grid-template-columns:28px minmax(0,2fr) 96px minmax(0,1.2fr) 104px minmax(0,1.4fr) 82px minmax(0,1.3fr) 14px;gap:10px;align-items:center;padding:7px 12px}
.sol.hist .sol-cab,.sol.hist .sol-lin{grid-template-columns:minmax(0,2fr) 96px minmax(0,1.2fr) 104px minmax(0,1.1fr) 130px minmax(0,1fr) 14px}
.sol-cab{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.sol-cab .hc{display:flex;gap:4px;align-items:center;min-width:0}.sol-cab .hc.n{justify-content:flex-end}
.sol-cab button{all:unset;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sol-cab button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.sol-cab .fil{flex:none;opacity:.5;font-size:12px;padding:0 2px}.sol-cab .fil:hover{opacity:1}.sol-cab .fil.on{opacity:1;color:var(--accent)}
.sol-lin{position:relative;font-size:13px}
.sol-lin:hover{background:var(--soft)}
.sol-lin .abre{all:unset;position:absolute;inset:0;cursor:pointer}.sol-lin .abre:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.sol-lin .ck{position:relative;z-index:1;display:flex;align-items:center;justify-content:center}
.sol-lin .ck input{width:18px;height:18px;margin:0;cursor:pointer}
.sol .c{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@container (min-width:761px) and (max-width:1180px){.sol .c,.sol-cab button{white-space:normal;overflow-wrap:anywhere;text-overflow:clip}}
.sol .n{text-align:right;font-variant-numeric:tabular-nums}
.sol .c-falta.tem{color:var(--warn);font-weight:600}.sol .c-seta{color:var(--muted);text-align:right}
.sol .rt{display:none;color:var(--muted);font-style:normal}
.sol .c-meta{display:none}
.sol .c-sug{color:var(--muted)}.sol .c-sug b{color:var(--ink);font-weight:500}
.sol-sel{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px;font-size:12px;color:var(--muted)}
@container (max-width:760px){
  .sol-cab{display:none}.sol-wrap .opl-ord{display:flex}
  .sol-lin,.sol.hist .sol-lin{grid-template-columns:28px minmax(0,1fr) auto 12px;grid-template-areas:"ck ref est seta" "ck meta meta meta" "ck sug sug falta";gap:3px 10px;padding:10px 12px}
  .sol.hist .sol-lin{grid-template-columns:minmax(0,1fr) auto 12px;grid-template-areas:"ref dec seta" "meta meta meta" "por por em"}
  .sol .ck{grid-area:ck;align-self:start}.sol .c-ref{grid-area:ref;white-space:normal}.sol .c-est,.sol .c-dec{grid-area:est;justify-self:end}.sol.hist .c-dec{grid-area:dec}
  .sol .c-seta{grid-area:seta}.sol .c-meta{display:block;grid-area:meta;color:var(--muted);font-size:12px;white-space:normal}
  .sol .c-tipo,.sol .c-cor,.sol .c-env{display:none}
  .sol .c-sug{grid-area:sug;font-size:12px;white-space:normal}.sol .c-falta{grid-area:falta;justify-self:end}
  .sol .c-por{grid-area:por;font-size:12px}.sol .c-em{grid-area:em;justify-self:end;font-size:12px}
  .sol .rt{display:inline}
}
.sol-gav .cab{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px}
.sol-gav h3{margin:2px 0 0;font-size:18px;overflow-wrap:anywhere}
.sol-gav .bloco{border:1px solid var(--line);border-radius:6px;padding:10px 12px;margin:0 0 10px;background:var(--bg)}
.sol-gav .bloco h4{margin:0 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:500}
.sol-fatos{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px 14px;font-size:13px}
.sol-fatos div{display:flex;flex-direction:column;min-width:0}.sol-fatos span{color:var(--muted);font-size:11px}.sol-fatos b{font-weight:500;overflow-wrap:anywhere}
.sol-gav .falta{color:var(--warn);font-size:13px;margin:0}
.sol-gav .acoes{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.sol-sug{border-color:var(--teal)!important}.sol-sug .q{font-size:13px;margin:4px 0}
.sol-dec textarea{width:100%;box-sizing:border-box;font:inherit;font-size:13px;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:8px;min-height:80px;margin:6px 0}
.sol-dec .btn.p{background:var(--accent);color:var(--bg);border-color:var(--accent)}
.sol-aviso{font-size:13px;padding:8px 10px;border-radius:6px;background:var(--soft);margin:0 0 10px}
.sol-aviso.ok{background:var(--ok-bg);color:var(--ok)}.sol-aviso.bad{background:var(--bad-bg);color:var(--bad)}.sol-aviso.warn{background:var(--warn-bg);color:var(--warn)}
.sol-docs{margin:0;padding-left:18px;font-size:13px}
</style>`;

  // ------------------------------------------------------------------ peças da lista
  function kpis() {
    const L = fila().map((x) => ({ x, s: situ(x) }));
    const n = (f) => L.filter(f).length, d30 = new Date(Date.now() - 3 * 3600e3 - 30 * 864e5).toISOString().slice(0, 10); // dia de Brasília (hub #22)
    const k = [['Aguardando decisão', n((z) => aguarda(z.s)), 'de todos os corretores', 'pend'],
      ['Decididas no HUB', n((z) => z.s.est === 'decidida_hub'), 'vão ao corretor às ' + RODADA, 'pend'],
      ['Com o corretor', n((z) => z.s.est === 'complemento'), 'complemento pedido', 'todos'],
      ['Decididas em 30 dias', n((z) => decStatus(z.x, z.s) && String(decididoEm(z.x, z.s)).slice(0, 10) >= d30 && z.s.est !== 'decidida_hub'), 'histórico', 'hist']];
    return `<div class="kpis sol-kpis">${k.map((x) => `<button class="kpi" type="button" data-sol-sub="${x[3]}"><span class="rot">${x[0]}</span><span class="num">${x[1]}</span><span class="sub">${esc(x[2])}</span></button>`).join('')}</div>`;
  }
  function subs() {
    const S = [['pend', `A decidir (${nPend()})`], ['hist', 'Histórico de decididos'], ['todos', 'Todos']];
    return `<div class="sol-subs" role="group" aria-label="Lista">${S.map(([k, t]) => `<button type="button" class="btn" data-sol-sub="${k}" aria-pressed="${F.sub === k}">${t}</button>`).join('')}</div>`;
  }
  function barra(L0) {
    const f = F.fl, opt = (v, t, s) => `<option value="${esc(v)}"${s === v ? ' selected' : ''}>${esc(t)}</option>`;
    const cors = [...new Map(L0.map((z) => [z.x.slug, z.x.nome_corretor || z.x.slug])).entries()].filter(([k]) => k).sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'pt-BR'));
    const n = ['q', 'cor', 'tipo', 'dec', 'de', 'ate'].filter((k) => f[k]).length;
    return `<div class="opl-fil" role="search" aria-label="Filtrar a lista"><span class="rot">Filtrar a lista</span>
      <input type="search" id="solf-q" placeholder="Buscar: imóvel, corretor, o que falta…" value="${esc(f.q)}" aria-label="Buscar na lista">
      <select id="solf-cor" aria-label="Corretor">${opt('', 'Todos os corretores', f.cor)}${cors.map(([k, t]) => opt(k, t, f.cor)).join('')}</select>
      <select id="solf-tipo" aria-label="Tipo">${opt('', 'Todos os tipos', f.tipo)}${Object.entries(TIPO).map(([k, t]) => opt(k, t, f.tipo)).join('')}</select>
      ${F.sub === 'hist' ? `<select id="solf-dec" aria-label="Decisão">${opt('', 'Todas as decisões', f.dec)}${Object.entries(DEC).map(([k, t]) => opt(k, t[0], f.dec)).join('')}</select>` : ''}
      <label>${F.sub === 'hist' ? 'Decidido de' : 'Enviado de'} <input type="date" id="solf-de" value="${esc(f.de)}"></label><label>até <input type="date" id="solf-ate" value="${esc(f.ate)}"></label>
      ${n ? `<button type="button" class="btn" data-sol-limpa="1">Limpar filtros (${n})</button>` : ''}</div>`;
  }
  function loteHTML(V) {
    const sel = [...F.sel].filter((id) => V.some((z) => z.x._id === id && z.s.pode));
    if (!sel.length) return '';
    return `<div class="sol-lote" role="region" aria-label="Decidir em lote"><b>${sel.length} selecionad${sel.length === 1 ? 'a' : 'as'}</b>
      <span class="nota" style="margin:0">Em lote, a mensagem abaixo vai igual para todos (obrigatória para pedir complemento ou recusar).</span>
      <textarea id="sol-lote-msg" placeholder="Mensagem comum aos corretores (ex.: complete as fotos da fachada e da área de lazer)">${esc(F.loteMsg)}</textarea>
      <button type="button" class="btn" data-sol-lote="aprovada">Aprovar ${sel.length}</button><button type="button" class="btn" data-sol-lote="complemento">Pedir complemento</button><button type="button" class="btn" data-sol-lote="recusada">Recusar</button>
      <button type="button" class="btn" data-sol-desmarca="1">Desmarcar</button>${F.loteErro ? `<span class="erro" role="alert">${esc(F.loteErro)}</span>` : ''}</div>`;
  }
  function linha(z) {
    const x = z.x, s = z.s, st = EST[s.est] || [s.est, ''], fl = (x.faltantes || []).length, sg = x.sugestao, hist = F.sub === 'hist';
    const env = x.enviado_em || x.criado_em, cor = x.nome_corretor || x.slug || '—';
    const meta = `${TIPO_CURTO[x.tipo] || x.tipo} · ${cor} · enviado ${dtH(env)}`;
    const aria = `${x.ref || 'Pedido'}, ${TIPO[x.tipo] || x.tipo}, ${cor}. Abrir o pedido`;
    if (hist) {
      const dc = DEC[decStatus(x, s)] || ['—', ''];
      return `<div class="opl-item" id="sol-${esc(x._id)}"><div class="sol-lin"><button type="button" class="abre" data-sol-abre="${esc(x._id)}" aria-label="${esc(aria)}"></button>
        <span class="c c-ref"><b>${esc(x.ref || '—')}</b></span><span class="c c-tipo">${esc(TIPO_CURTO[x.tipo] || x.tipo)}</span><span class="c c-cor">${esc(cor)}</span><span class="c c-env">${dtC(env)}</span>
        <span class="c c-dec">${pill(dc)}</span><span class="c c-em"><i class="rt">Decidido em </i>${dtH(decididoEm(x, s))}</span><span class="c c-por"><i class="rt">Por </i>${esc(porNome(x, s) || '—')}</span><span class="c c-seta" aria-hidden="true">▸</span>
        <span class="c c-meta">${esc(meta)}</span></div></div>`;
    }
    const ck = s.pode ? `<input type="checkbox" data-sol-ck="${esc(x._id)}" ${F.sel.has(x._id) ? 'checked' : ''} aria-label="Selecionar ${esc(x.ref || 'pedido')} para decidir em lote">` : '';
    return `<div class="opl-item" id="sol-${esc(x._id)}"><div class="sol-lin"><button type="button" class="abre" data-sol-abre="${esc(x._id)}" aria-label="${esc(aria)}"></button>
      <span class="ck">${ck}</span><span class="c c-ref"><b>${esc(x.ref || '—')}</b></span><span class="c c-tipo">${esc(TIPO_CURTO[x.tipo] || x.tipo)}</span><span class="c c-cor">${esc(cor)}</span><span class="c c-env">${dtC(env)}</span>
      <span class="c c-est">${pill(s.est === 'decidida_hub' ? [(DEC[s.d.status] || [''])[0] + ' no HUB', 'info'] : st)}</span>
      <span class="c c-falta n${fl ? ' tem' : ''}" title="Itens que faltam no cadastro"><i class="rt">Faltam </i>${x.tipo === 'novo_imovel' ? fl : '—'}</span>
      <span class="c c-sug" title="${esc(sg ? sg.motivo || '' : '')}">${x.tipo === 'captacao' ? 'Decidir na Captação' : sg ? `<i class="rt">Sugestão: </i><b>${esc(ACAO_ROT[sg.acao] || sg.acao)}</b>${sg.origem === 'regra' ? ' · regra' : ' · IA'}` : '—'}</span>
      <span class="c c-seta" aria-hidden="true">▸</span><span class="c c-meta">${esc(meta)}</span></div></div>`;
  }
  function lista(L, L0) {
    const C = colunas(), hist = F.sub === 'hist';
    const cab = (hist ? '' : '<span></span>') + Object.entries(C).map(([k, [r]]) => `<span class="c hc${k === 'falta' ? ' n' : ''}"><button type="button" data-sol-ord="${k}" title="Ordenar: 1º toque maior → menor, 2º menor → maior, 3º volta à ordem original">${r}${seta(k)}</button>${FIL[k] ? `<button type="button" class="fil${filOn(k) ? ' on' : ''}" data-sol-fil="${k}" title="Filtrar por ${esc(r)}" aria-label="Filtrar por ${esc(r)}">⏷</button>` : ''}</span>`).join('') + '<span></span>';
    const ordCel = `<div class="opl-ord" role="group" aria-label="Ordenar por"><span class="rot">Ordenar por</span>${Object.entries(C).map(([k, [r]]) => `<button type="button" class="btn" data-sol-ord="${k}" aria-pressed="${!!(F.ord && F.ord.k === k)}">${r}${seta(k)}</button>`).join('')}<button type="button" class="btn" data-sol-fil="ref">⏷ Filtrar</button></div>`;
    const selec = !hist && L.some((z) => z.s.pode) ? `<div class="sol-sel"><button type="button" class="btn" data-sol-todos="1">Selecionar as ${L.filter((z) => z.s.pode).length} visíveis</button><span>marque para decidir várias de uma vez</span></div>` : '';
    return `<div class="sol-wrap">${barra(L0)}${ordCel}${loteHTML(L)}${selec}
      <p class="nota" style="margin:0 0 6px">${L.length} pedido${L.length === 1 ? '' : 's'}${L0.length !== L.length ? ` de ${L0.length}` : ''}</p>
      ${L.length ? `<div class="opl sol${hist ? ' hist' : ''}"><div class="sol-cab">${cab}</div>${L.map(linha).join('')}</div>`
        : H.vazio(L0.length ? 'Nenhum pedido com esse filtro.' : hist ? 'Nenhuma solicitação decidida ainda.' : 'Nenhuma solicitação aguardando a diretoria. 🎉')}</div>`;
  }

  // ------------------------------------------------------------------ gaveta do pedido
  function fatos(x) {
    const d = x.dados || {}, ocultos = new Set(x.dados_ocultos || []);
    return SECOES.map(([t, rot]) => {
      const lin = Object.entries(rot).filter(([k]) => ocultos.has(k) || (d[k] != null && d[k] !== '' && !(Array.isArray(d[k]) && !d[k].length))).map(([k, r]) => {
        const v = ocultos.has(k) ? '<i style="color:var(--muted)">informado · ver no painel</i>' : Array.isArray(d[k]) ? esc(d[k].join(', ')) : MOEDA.has(k) ? brl(d[k]) : esc(d[k]);
        return `<div><span>${esc(r)}</span><b>${v}</b></div>`; }).join('');
      return lin ? `<div class="bloco"><h4>${esc(t)}</h4><div class="sol-fatos">${lin}</div></div>` : ''; }).join('');
  }
  function gaveta(id) {
    const x = doc(id); if (!x) return '';
    const s = situ(x), st = EST[s.est] || [s.est, ''], url = urlPainel(x), tipo = x.tipo || 'alteracao', sg = x.sugestao;
    const verPainel = url ? `<a class="btn" href="${escUrl(url)}" target="_blank" rel="noopener">Abrir no painel do corretor ↗</a>` : '';
    let corpo = '';
    if (tipo === 'novo_imovel') {
      corpo = fatos(x);
      corpo += `<div class="bloco"><h4>Descrição do anúncio</h4>${x.pede_descricao ? '<p class="falta">O corretor pediu que a Vivere escreva a descrição.</p>' : `<p style="margin:0;font-size:13px;white-space:pre-line">${esc(x.descricao || '—')}</p>`}</div>`;
    } else if (tipo === 'alteracao') {
      corpo = `<div class="bloco"><h4>O que muda</h4>${Object.entries(x.alteracoes || {}).map(([k, v]) => `<p style="margin:2px 0;font-size:13px">${esc(k)}: ${esc((v || {}).de ?? '—')} → <b>${esc((v || {}).para ?? '—')}</b></p>`).join('') || '<p class="nota" style="margin:0">—</p>'}</div>`;
    } else if (tipo === 'captacao') {
      corpo = `<div class="sol-aviso">Pedido de captação: a diretoria decide em <b>CRM › Captação</b>, distribuindo o lead. A resposta ao corretor sai na Entrega Captação.</div>
        <div class="acoes" style="margin-bottom:10px">${x.capt_lead ? `<button type="button" class="btn" data-sol-capt="${esc(x.capt_lead)}">Abrir o lead na Captação</button>` : '<button type="button" class="btn" data-sol-capt="">Abrir a aba Captação</button>'}</div>`;
    }
    if (x.obs && tipo !== 'novo_imovel') corpo += `<div class="bloco"><h4>Observação do corretor</h4><p style="margin:0;font-size:13px">${esc(x.obs)}</p></div>`;
    const docs = x.docs || [];
    if (tipo === 'novo_imovel' || docs.length) corpo += `<div class="bloco"><h4>Documentos (${docs.length})</h4>${docs.length ? `<ul class="sol-docs">${docs.map((d) => `<li>${esc(d.tipo || 'Documento')}${d.nome ? ` · <span style="color:var(--muted)">${esc(d.nome)}</span>` : ''}</li>`).join('')}</ul>` : '<p class="falta">Nenhum documento anexado.</p>'}${docs.length && url ? `<div class="acoes" style="margin-top:6px"><a class="btn" href="${escUrl(url)}" target="_blank" rel="noopener">Abrir os documentos no painel ↗</a></div>` : ''}</div>`;
    if (tipo !== 'captacao' && tipo !== 'alteracao' || x.fotos_n) corpo += `<div class="bloco"><h4>Fotos</h4><div class="acoes"><span style="font-size:13px">${x.fotos_n || 0} foto${x.fotos_n === 1 ? '' : 's'} enviada${x.fotos_n === 1 ? '' : 's'}</span>${url ? `<a class="btn" href="${escUrl(url)}" target="_blank" rel="noopener">Ver fotos no painel ↗</a>` : ''}</div></div>`;
    const falta = tipo === 'novo_imovel' ? (x.faltantes || []) : [];
    if (falta.length) corpo = `<div class="bloco"><p class="falta"><b>Faltando (${falta.length}):</b> ${falta.map(esc).join(' · ')}</p></div>` + corpo;

    // resposta anterior (painel ou HUB)
    const dp = x.decisao_painel || {};
    const ant = s.ant || (dp.status && s.est !== 'pendente' ? { status: dp.status, resposta: dp.resposta, em: dp.em, por_nome: dp.por } : null);
    const antH = ant && ant.resposta ? `<div class="sol-aviso ${ant.status === 'complemento' ? 'warn' : ''}"><b>${s.ant ? 'Complemento pedido antes' : 'Resposta da diretoria'}</b> (${dtH(ant.em)}${ant.por_nome ? ' · ' + esc(ant.por_nome) : ''}): ${esc(ant.resposta)}${s.ant ? '<br>O corretor reenviou o pedido: decida de novo.' : ''}</div>` : '';

    // sugestão
    const sugH = sg && tipo !== 'captacao' && (s.pode || s.est === 'decidida_hub') ? `<div class="bloco sol-sug"><h4>Sugestão ${sg.origem === 'regra' ? 'da regra (a revisar na rodada)' : 'da IA'}</h4>
      <p class="q"><b>${esc(ACAO_ROT[sg.acao] || sg.acao)}</b>${sg.motivo ? ` · <span style="color:var(--muted)">${esc(sg.motivo)}</span>` : ''}</p>${sg.mensagem ? `<p class="q" style="white-space:pre-line">“${esc(sg.mensagem)}”</p>` : ''}
      <div class="acoes"><button type="button" class="btn" data-sol-usasug="${esc(id)}">Usar sugestão</button><span class="nota" style="margin:0">preenche a mensagem e marca a ação; nada é gravado sem o seu clique</span></div></div>` : '';

    // decisão
    let decH = '';
    const msg = F.msg[id] != null ? F.msg[id] : (s.est === 'decidida_hub' ? s.d.resposta || '' : '');
    const marcada = F.msg['_acao_' + id] || '';
    if (s.bloq) {
      decH = `<div class="sol-aviso ${s.bloq === 'painel' ? 'warn' : ''}">${s.bloq === 'painel' ? `Decidido no próprio painel antes da rodada: a decisão daqui (${esc((DEC[s.d.status] || [''])[0])}) não foi enviada.` : `A decisão (${esc((DEC[s.d.status] || [''])[0])}, ${esc(s.d.por_nome || 'diretoria')}) já foi ao corretor em ${dtH(s.d.devolvida_em)}.`} Para mudar agora, abra o painel do corretor.</div>`;
    } else if (s.pode || s.est === 'decidida_hub') {
      const dh = s.est === 'decidida_hub' ? `<div class="sol-aviso ok"><b>Decidida no HUB</b> — ${esc((DEC[s.d.status] || [''])[0])} por ${esc(s.d.por_nome || 'diretoria')} em ${dtH(s.d.em)}. Vai ao corretor na próxima rodada (${RODADA}); até lá dá para mudar.</div>` : '';
      decH = `${dh}<div class="bloco sol-dec"><h4>${s.est === 'decidida_hub' ? 'Mudar a decisão' : 'Decisão da diretoria'}</h4>
        <label style="font-size:12px;color:var(--muted)" for="sol-msg">Mensagem ao corretor (obrigatória para pedir complemento ou recusar)</label>
        <textarea id="sol-msg" data-sol-msg="${esc(id)}" placeholder="Ex.: insira mais 10 fotos, com a fachada e a área de lazer">${esc(msg)}</textarea>
        ${falta.length ? `<div class="acoes" style="margin-bottom:8px"><button type="button" class="btn" data-sol-falta="${esc(id)}">Inserir na mensagem o que falta (${falta.length})</button></div>` : ''}
        <div class="acoes">${['aprovada', 'complemento', 'recusada'].map((a) => `<button type="button" class="btn${marcada === a ? ' p' : ''}" data-sol-decide="${esc(id)}|${a}">${ACAO_ROT[a]}</button>`).join('')}
        ${F.erro ? `<span class="erro" role="alert">${esc(F.erro)}</span>` : ''}</div></div>`;
    }
    return `<div class="modal-fundo" data-sol-fundo="1"><div class="modal sol-gav" role="dialog" aria-modal="true" aria-labelledby="sol-tit">
      <div class="cab"><div style="min-width:0"><p class="nota" style="margin:0">${esc(TIPO[tipo] || tipo)} · ${esc(x.nome_corretor || x.slug || '')} · enviada em ${dtH(x.enviado_em || x.criado_em)}</p><h3 id="sol-tit">${esc(x.ref || 'Imóvel')}</h3><p style="margin:6px 0 0">${pill(s.est === 'decidida_hub' ? EST.decidida_hub : st)}</p></div>
      <div class="acoes">${verPainel}<button type="button" class="btn" data-sol-fecha="1">Fechar</button></div></div>
      ${F.ok ? `<div class="sol-aviso ok" role="status">${esc(F.ok)}</div>` : ''}${antH}${sugH}${decH}${corpo}
      <p class="nota" style="margin:6px 0 0">Sincronizado em ${dtH(x.sincronizado_em)}. Dados do proprietário (CPF, telefone, e-mail, endereço) e as fotos ficam só no painel do corretor.</p></div></div>`;
  }

  // ------------------------------------------------------------------ render
  function render() {
    if (!H.carregado[CF]) return `<h2>Solicitações dos corretores</h2>${H.vazio('Carregando as solicitações…')}`;
    if (F.foco) { const fx = doc(F.foco); if (fx) { F.aberto = F.foco; const s = situ(fx); F.sub = aguarda(s) || s.est === 'decidida_hub' ? 'pend' : decStatus(fx, s) ? 'hist' : 'todos'; } F.foco = ''; }
    const L0 = base(), L = ordena(filtra(L0.slice()));
    const ult = fila().map((x) => x.sincronizado_em).filter(Boolean).sort().pop();
    return `${CSS}<h2>Solicitações dos corretores</h2>
      <p class="nota">Pedidos feitos nos painéis de todos os corretores (cadastro de imóvel, alteração, fotos e captação), num lugar só. Decida aqui — sozinho ou em lote — e a resposta vai ao painel do corretor na rodada das ${RODADA}. Cada pedido traz a sugestão da regra ou da IA, para conferir; nada é decidido sozinho.${ult ? ` Última sincronização: ${dtH(ult)}.` : ''}</p>
      ${kpis()}${subs()}${lista(L, L0)}${F.aberto ? gaveta(F.aberto) : ''}`;
  }

  // ------------------------------------------------------------------ gravação (só solicitacoes_decisoes)
  let QUEM = null;
  async function quem() {
    if (QUEM) return QUEM;
    let uid = '', nome = '';
    try { const u = window.claude && window.claude.use ? await window.claude.use('user') : null;
      if (u) { uid = (await u.id()) || ''; try { const me = await u.me(); nome = (me && me.name) || ''; } catch (_) {} } } catch (_) {}
    const mapa = (cfg().diretores) || {};
    QUEM = { uid, nome: nome || (uid && mapa[uid]) || 'diretoria' };
    return QUEM;
  }
  async function grava(id, status, resposta) {
    const DB = H.db(); const x = (H.S[CF] || {})[id]; if (!DB || !x) return 'Sem banco agora. Tente de novo.';
    if (x.tipo === 'captacao') return 'Pedido de captação: decida em CRM › Captação.';
    const q = await quem();
    const ref = DB.doc(CD + '/' + id);
    let atual = null; try { const g = await ref.get(); atual = g.exists ? g.data() : null; } catch (_) { atual = decs()[id] || null; }
    const reenviado = atual && atual.devolvida_em && x.estado === 'pendente' && String(x.enviado_em || '') > String(atual.em || '');
    if (atual && atual.devolvida_em && !reenviado) return atual.situacao_devolucao === 'decidida_no_painel' ? 'Já decidido no painel do corretor: mude por lá.' : 'Esta decisão já foi ao corretor; para mudar, abra o painel do corretor.';
    const doc = { status, resposta: resposta || '', em: agora(), por_uid: q.uid, por_nome: q.nome, origem: 'hub', slug: x.slug || '', sid: x.sid || '', tipo: x.tipo || '', ref: x.ref || '', enviado_em: x.enviado_em || '' };
    if (x.sugestao) doc.sugestao_usada = F.msg['_sug_' + id] === true;
    try {
      if (!atual) await ref.set(doc);
      else if (reenviado) await ref.set(Object.assign(doc, { rodada: (+atual.rodada || 1) + 1, anteriores: [].concat(atual.anteriores || []).slice(-9).concat([{ status: atual.status, resposta: atual.resposta || '', em: atual.em || '', por_nome: atual.por_nome || '', devolvida_em: atual.devolvida_em || '' }]) }));
      else await ref.update(doc);
    } catch (e) { return 'Não consegui gravar (' + (e && e.code || 'erro') + '). Tente de novo.'; }
    return '';
  }
  async function decide(id, status) {
    const msg = String(F.msg[id] != null ? F.msg[id] : ((document.getElementById('sol-msg') || {}).value || '')).trim();
    if (status !== 'aprovada' && !msg) { F.erro = status === 'complemento' ? 'Escreva o que o corretor precisa completar.' : 'Escreva o motivo da recusa para o corretor.'; H.pede(); return; }
    F.erro = ''; const e = await grava(id, status, msg);
    if (e) { F.erro = e; H.pede(); return; }
    F.ok = `${ACAO_ROT[status]}: gravado. Vai ao corretor na próxima rodada (${RODADA}).`; delete F.msg[id]; delete F.msg['_acao_' + id]; delete F.msg['_sug_' + id]; F.sel.delete(id); H.pede();
  }
  async function decideLote(status) {
    // 15/11/2026 (hub #9): decide só o que está selecionado E visível no filtro atual (o mesmo número do botão), com confirmação
    const vis = new Set(ordena(filtra(base())).filter((z) => z.s.pode).map((z) => z.x._id));
    const ids = [...F.sel].filter((id) => { const x = doc(id); return vis.has(id) && x && situ(x).pode; });
    const msg = String(F.loteMsg || '').trim();
    if (!ids.length) return;
    if (status !== 'aprovada' && !msg) { F.loteErro = 'Escreva a mensagem comum (obrigatória para pedir complemento ou recusar).'; H.pede(); return; }
    const rot = { aprovada: 'Aprovar', complemento: 'Pedir complemento de', recusada: 'Recusar' }[status] || 'Decidir';
    if (typeof confirm === 'function' && !confirm(`${rot} ${ids.length} pedido${ids.length === 1 ? '' : 's'}? Depois de devolvida ao painel, a decisão não muda mais.`)) return;
    F.loteErro = ''; let ok = 0; const falhas = [];
    for (const id of ids) { const e = await grava(id, status, msg); if (e) falhas.push(((H.S[CF] || {})[id] || {}).ref || id); else { ok++; F.sel.delete(id); } }
    F.loteErro = falhas.length ? `${ok} gravada${ok === 1 ? '' : 's'}; não gravou: ${falhas.join(', ')}.` : '';
    if (!falhas.length) F.loteMsg = '';
    H.pede();
  }

  // ------------------------------------------------------------------ eventos
  const fechar = () => { F.aberto = ''; F.erro = ''; F.ok = ''; H.pede(); };
  document.addEventListener('click', (e) => {
    if (!e.target.closest) return;
    const t = e.target.closest('[data-sol-sub],[data-sol-ord],[data-sol-fil],[data-sol-limpa],[data-sol-abre],[data-sol-fecha],[data-sol-fundo],[data-sol-decide],[data-sol-falta],[data-sol-usasug],[data-sol-lote],[data-sol-desmarca],[data-sol-todos],[data-sol-capt]');
    if (!t) return; const d = t.dataset;
    if (d.solFundo !== undefined) { if (e.target === t) fechar(); return; }
    if (d.solSub) { F.sub = d.solSub; F.ord = null; F.sel.clear(); guarda(); }
    else if (d.solOrd) { F.ord = prox(F.ord, d.solOrd); guarda(); }
    else if (d.solFil) { const a = FIL[d.solFil]; const el = document.getElementById('solf-' + (a || 'q')); if (el) { el.scrollIntoView({ block: 'nearest' }); el.focus(); el.classList.add('alvo'); setTimeout(() => el.classList.remove('alvo'), 1500); } return; }
    else if (d.solLimpa) { F.fl = { q: '', cor: '', tipo: '', dec: '', de: '', ate: '' }; F.sel.clear(); }
    else if (d.solAbre) { F.aberto = d.solAbre; F.erro = ''; F.ok = ''; }
    else if (d.solFecha) { fechar(); return; }
    else if (d.solDecide) { const [id, st] = d.solDecide.split('|'); decide(id, st); return; }
    else if (d.solFalta) { const x = (H.S[CF] || {})[d.solFalta] || {}; const f = x.faltantes || []; const ta = document.getElementById('sol-msg'); const v = ta ? ta.value.trim() : ''; F.msg[d.solFalta] = (v ? v + '\n' : '') + 'Complete, por favor: ' + f.join('; ') + '.'; F.msg['_acao_' + d.solFalta] = 'complemento'; }
    else if (d.solUsasug) { const x = (H.S[CF] || {})[d.solUsasug] || {}; const sg = x.sugestao || {}; F.msg[d.solUsasug] = sg.mensagem || ''; F.msg['_acao_' + d.solUsasug] = sg.acao || ''; F.msg['_sug_' + d.solUsasug] = true; }
    else if (d.solLote) { decideLote(d.solLote); return; }
    else if (d.solDesmarca) { F.sel.clear(); F.loteErro = ''; }
    else if (d.solTodos) { ordena(filtra(base())).filter((z) => z.s.pode).forEach((z) => F.sel.add(z.x._id)); }
    else if (d.solCapt !== undefined) { F.aberto = ''; if (typeof H.irPara === 'function') H.irPara('captacao-leads', d.solCapt ? 'capt-' + d.solCapt : null, d.solCapt || null); return; }
    H.pede();
  });
  document.addEventListener('change', (e) => {
    const t = e.target; if (!t || !t.dataset) return;
    if (t.dataset.solCk) { if (t.checked) F.sel.add(t.dataset.solCk); else F.sel.delete(t.dataset.solCk); F.loteErro = ''; H.pede(); return; }
    const id = t.id || ''; if (id.startsWith('solf-') && id !== 'solf-q') { F.fl[id.slice(5)] = t.value; F.sel.clear(); H.pede(); } // filtro novo limpa a seleção (hub #9)
  });
  let TQ;
  document.addEventListener('input', (e) => {
    const t = e.target; if (!t) return;
    if (t.id === 'solf-q') { F.fl.q = t.value; F.sel.clear(); clearTimeout(TQ); TQ = setTimeout(() => { const s = [t.selectionStart, t.selectionEnd]; H.pede(); requestAnimationFrame(() => { const el = document.getElementById('solf-q'); if (el) { el.focus(); try { el.setSelectionRange(s[0], s[1]); } catch (_) {} } }); }, 250); return; }
    if (t.dataset && t.dataset.solMsg) { F.msg[t.dataset.solMsg] = t.value; return; }   // sem redesenhar: o texto fica no campo
    if (t.id === 'sol-lote-msg') { F.loteMsg = t.value; }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && F.aberto) fechar(); });

  H.registrar({
    id: ID, aba: 'Solicitações', grupo: 'crm', depois: 'captacao-leads',
    colecoes: [CF, CD],
    render,
    contador: () => nPend(),
    dicaBusca: 'Buscar em Solicitações: imóvel, corretor, tipo, o que falta…',
    foco(alvo) { if (alvo) { F.foco = alvo; H.pede(); } },
    busca(q) {
      const t = semAc(q).trim(); if (t.length < 2) return [];
      return fila().filter((x) => semAc([x.ref, x.nome_corretor, TIPO[x.tipo]].join(' ')).includes(t)).slice(0, 6)
        .map((x) => ({ grp: 'Solicitações', tit: `${x.ref || 'Pedido'} · ${TIPO_CURTO[x.tipo] || x.tipo}`, sub: `${x.nome_corretor || x.slug || ''} · ${(EST[situ(x).est] || [''])[0]}`, ir: { aba: ID, alvo: x._id } }));
    },
  });
})();
