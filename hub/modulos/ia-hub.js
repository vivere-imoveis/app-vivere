// modulos/ia-hub.js — aba "🤖 IA" (Início) do HUB Vivere (construção "ia-hub", 14/11/2026, tarefa vis-hub-vivere-ia)
// Contrato: _hub\modulos\LEIA-ME.md. Pedido do Cleiton (07/11 e 14/11/2026): perguntas livres sobre os dados do HUB pela
// função "Artefatos com tecnologia de IA" (capacidade sample, já declarada no HUB). Decisões dele no cartão de 14/11/2026:
// pergunta livre, resumo da semana, alertas do dia, perguntas prontas e revisão de melhorias do HUB; aplicar primeiro.
// • Lê: as coleções já carregadas no HUB (H.S), só por ferramentas que a IA chama (consultar, contar, somar), sempre
//   com CPF, CNPJ, telefone, e-mail, conta e afins tirados ou mascarados ANTES de chegar ao Claude.
// • Grava: só `ia_hub_historico` (sublinhado: o conector do Supabase recusa hífen em coleção nova) (um doc por uso: pergunta, resumo, alertas ou revisão), nível mestre.
// • A IA só roda no clique. Não envia nada a ninguém e não grava em outra coleção.
// 16/11/2026 (busca por voz nas 3 páginas): 🎤 Ditar na pergunta livre (capacidade dictation; sem ela o botão foca a caixa e
//   avisa o microfone do teclado ou Win+H), botões Abrir também na pergunta livre (item exato em imóveis, carteira e vendas;
//   nas outras coleções, a aba) e rodapé da busca-integrativa. As ferramentas da IA continuam só de leitura.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc;
  const ID = 'ia-hub', CL = 'ia_hub_historico';
  const ABAS_OK = ['pendencias', 'imoveis', 'carteira', 'cobranca', 'receita', 'crm-visao', 'leads', 'oportunidades', 'crm', 'vendas',
    'documentos', 'tarefas', 'construcoes', 'locacao-resumo', 'cadastro-imoveis', 'captacao-leads', 'demandas', 'vistorias', 'boletos',
    'fichas-locacao', 'inatividade-agenciamento', 'financeiro', 'juridico', 'empreendimentos', 'portais', 'pessoas', 'mapa'];
  const PRONTAS = [
    'Quais leads estão sem retorno há mais de 7 dias, por corretor?',
    'Quem está inadimplente hoje e quanto deve?',
    'Quais contratos de locação vencem ou reajustam nos próximos 60 dias?',
    'Quais imóveis anunciados estão parados, sem lead nem oferta?',
    'Quanto entrou de administração e intermediação neste mês?',
    'Quais pendências estão abertas há mais tempo?',
    'Quantos imóveis a Vivere administra hoje e quanto falta para a meta de 40?',
    'Quais coletas do HUB estão paradas ou com falha?'
  ];
  const TIPOS = { pergunta: ['💬', 'Pergunta'], resumo: ['📋', 'Resumo da semana'], alertas: ['🚨', 'Alertas do dia'], melhorias: ['🛠', 'Revisão de melhorias'] };

  // ---------------------------------------------------------------- estado
  let SM; // undefined = ainda não pedido; null = sem IA nesta visualização
  const E = { q: '', rodando: '', etapa: '', erro: '', ctl: null, res: null, foco: false, sel: null, hf: 'todos', hOrd: 'desc', hPg: 0, hAberto: '', nFerr: 0, vistos: [], abrir: [] };

  // ---------------------------------------------------------------- dados sensíveis (tirados antes de chegar ao Claude)
  // nome de campo sensível (snake, kebab ou camelCase; também em caminho a.b): sai da resposta e não serve de filtro
  const SENS_LIVRE = /cpf|cnpj|telefone|fone|celular|whats|e_?mail|mail|pix|senha|token|agencia|nascimento|documento|identidade|passaporte/;
  const SENS_PALAVRA = /(^|_)(rg|tel|zap|conta|contas|ip|chave|chaves|banco|iban)(_|$)/;
  function sensivel(k) {
    return String(k == null ? '' : k).split('.').some((p) => { const t = p.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_');
      return SENS_LIVRE.test(t) || SENS_PALAVRA.test(t) || /^\d{8,}$/.test(t.replace(/_/g, '')); });
  }
  const CHAVE_SENS = { test: sensivel };
  // datas e horas ficam protegidas; depois saem e-mail, CNPJ, CPF e telefone em qualquer formato comum (com 55, DDD, 9, pontos, espaços)
  const DATAS = /\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?|\d{2}\/\d{2}\/\d{4}(?: \d{2}:\d{2})?/g;
  function mascara(s) {
    const guard = []; let t = String(s).replace(DATAS, (m) => '\u0001' + (guard.push(m) - 1) + '\u0002');
    t = t.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[e-mail]')
      .replace(/(?<!\d)\d{2}[\s.]?\d{3}[\s.]?\d{3}[\s/]?\d{4}[\s.-]?\d{2}(?!\d)/g, '[cnpj]')
      .replace(/(?<!\d)(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9?[\s.-]?\d{4}[\s.-]?\d{4}(?!\d)/g, (m) => { const n = m.replace(/\D/g, '').length; return n >= 10 && n <= 13 ? '[telefone]' : m; })
      .replace(/(?<!\d)\d{3}[\s.]?\d{3}[\s.]?\d{3}[\s.-]?\d{2}(?!\d)/g, '[cpf]');
    return t.replace(/\u0001(\d+)\u0002/g, (_, i) => guard[+i]);
  }
  function limpa(v, nivel) {
    if (v == null) return v;
    if (typeof v === 'string') { const t = mascara(v); return t.length > 240 ? t.slice(0, 240) + '…' : t; }
    if (typeof v !== 'object') return v;
    if ((nivel || 0) >= 3) return Array.isArray(v) ? '[lista ' + v.length + ']' : '[objeto]';
    if (Array.isArray(v)) { const a = v.slice(0, 6).map((x) => limpa(x, (nivel || 0) + 1)); if (v.length > 6) a.push('… +' + (v.length - 6)); return a; }
    const o = {};
    Object.keys(v).forEach((k) => { if (sensivel(k)) return; o[mascara(k)] = limpa(v[k], (nivel || 0) + 1); });
    return o;
  }
  function recusaSens(a, lista) { lista.forEach((c) => { if (c && sensivel(c)) throw new Error('o campo ' + mascara(c) + ' é dado pessoal e não pode ser lido, filtrado nem ordenado'); }); }

  // ---------------------------------------------------------------- consultas (ferramentas da IA)
  const SEM = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cols = () => Object.keys(H.S || {}).filter((c) => c !== CL && H.S[c] && typeof H.S[c] === 'object' && Object.keys(H.S[c]).length);
  const pega = (d, campo) => String(campo || '').split('.').reduce((o, k) => (o == null ? o : o[k]), d);
  function docs(c) { if (!H.S[c]) throw new Error('coleção ' + c + ' não está carregada no HUB; use listar_colecoes'); return H.lista(c); }
  function filtra(L, onde, texto) {
    let R = L;
    (Array.isArray(onde) ? onde : []).forEach((f) => {
      if (!f || !f.campo) return; recusaSens(null, [f.campo]); const op = f.op || '==', alvo = f.valor;
      R = R.filter((d) => { const v = pega(d, f.campo);
        if (op === 'contem') { const lv = limpa(v); return SEM(typeof lv === 'object' ? JSON.stringify(lv) : lv).includes(SEM(alvo)); }
        if (op === 'vazio') return v == null || v === '' || (Array.isArray(v) && !v.length);
        if (op === 'preenchido') return !(v == null || v === '' || (Array.isArray(v) && !v.length));
        if (op === '!=') return String(v) !== String(alvo);
        const n1 = typeof v === 'number' ? v : (isNaN(+v) ? String(v || '') : +v), n2 = typeof n1 === 'number' && !isNaN(+alvo) ? +alvo : String(alvo);
        if (op === '>') return n1 > n2; if (op === '<') return n1 < n2; if (op === '>=') return n1 >= n2; if (op === '<=') return n1 <= n2;
        return String(v) === String(alvo); });
    });
    if (texto) { const t = SEM(texto); R = R.filter((d) => SEM(JSON.stringify(limpa(d))).includes(t)); }
    return R;
  }
  function corta(o) { let s = JSON.stringify(o); if (s.length > 14000) s = s.slice(0, 14000) + '… [cortado: refine o filtro, peça menos campos ou use contar/somar]'; return s; }
  // ---------------------------------------------------------------- Abrir (16/11/2026): o item exato onde o HUB já sabe abrir; senão, a aba
  const ABA_COL = { imoveis: 'imoveis', contratos_locacao: 'carteira', cobrancas: 'cobranca', repasses: 'carteira', receita_mensal: 'receita', vendas: 'vendas',
    recebimentos_cleiton: 'receita', documentos: 'documentos', tarefas: 'tarefas', pendencias: 'pendencias', leads: 'leads', leads_contatos: 'leads',
    crm_leads: 'crm', crm: 'crm', crm_etapas: 'crm', oportunidades: 'oportunidades', construcoes: 'construcoes', mapa_detalhes: 'imoveis' };
  function vi(c, d) { if (!c) return; if (!E.vistos.some((x) => x.c === c && x.id === (d ? d._id : ''))) E.vistos.push({ c, id: d ? d._id : '', ref: d ? String(d.ref || d.cod || '') : '' }); }
  function montaAbrir(texto) {
    const t = String(texto || ''), cita = (v) => v && new RegExp('(^|[^\\w-])' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])', 'i').test(t);
    const B = [], ja = new Set();
    E.vistos.forEach((x) => { const aba = ABA_COL[x.c]; if (!x.id || !aba || !ABAS_OK.includes(aba)) return;
      const exato = x.c === 'imoveis' || x.c === 'contratos_locacao' || x.c === 'vendas'; if (!exato || !(cita(x.id) || cita(x.ref))) return;
      const k = x.c + '|' + x.id; if (ja.has(k) || B.length >= 6) return; ja.add(k); B.push({ c: x.c, id: x.id, rot: (x.ref || x.id) }); });
    E.vistos.forEach((x) => { const aba = ABA_COL[x.c]; if (!aba || !ABAS_OK.includes(aba) || ja.has('aba|' + aba) || B.length >= 8) return; ja.add('aba|' + aba); B.push({ aba }); });
    return B;
  }
  function abrir(b) {
    if (b.c === 'imoveis' && H.abrirImovel) return H.abrirImovel([b.id], 'IA do HUB: ' + b.rot);
    if (b.c === 'contratos_locacao' && H.irPara) return H.irPara('carteira', 'car-' + b.id);
    if (b.c === 'vendas' && H.irPara) return H.irPara('vendas', 'ven-' + b.id);
    if (b.aba && H.irPara) return H.irPara(b.aba);
  }
  const rotAbrir = (b) => b.aba ? 'Abrir ' + (H.rotAba ? H.rotAba(b.aba) || b.aba : b.aba) : 'Abrir ' + b.rot + ' (' + (H.rotAba ? H.rotAba(ABA_COL[b.c]) || ABA_COL[b.c] : ABA_COL[b.c]) + ')';

  const ferramentas = () => [
    { name: 'listar_colecoes', description: 'Lista as coleções carregadas no HUB, com o número de documentos e os campos mais comuns. Comece por aqui se não souber onde está o dado.',
      inputSchema: { type: 'object', properties: {} },
      execute() { E.etapa = 'Olhando as coleções do HUB'; pede();
        return corta(cols().map((c) => { const L = H.lista(c), f = {}; L.slice(0, 200).forEach((d) => Object.keys(d).forEach((k) => { if (!CHAVE_SENS.test(k)) f[mascara(k)] = (f[mascara(k)] || 0) + 1; }));
          return { colecao: c, docs: L.length, campos: Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, 30).map((x) => x[0]) }; })); } },
    { name: 'consultar', description: 'Busca documentos de uma coleção. onde = filtros [{campo, op, valor}] com op em ==, !=, >, <, >=, <=, contem, vazio, preenchido (campo aceita a.b); texto = busca livre em todo o documento; campos = só estes campos (recomendado); ordenar = campo; desc = true para decrescente; limite até 40; pular para paginar. Dados pessoais vêm mascarados.',
      inputSchema: { type: 'object', properties: { colecao: { type: 'string' }, onde: { type: 'array', items: { type: 'object' } }, texto: { type: 'string' }, campos: { type: 'array', items: { type: 'string' } }, ordenar: { type: 'string' }, desc: { type: 'boolean' }, limite: { type: 'number' }, pular: { type: 'number' } }, required: ['colecao'] },
      execute(a) { E.etapa = 'Consultando ' + a.colecao; E.nFerr++; pede();
        recusaSens(a, [a.ordenar]); let R = filtra(docs(a.colecao), a.onde, a.texto);
        if (a.ordenar) R = R.slice().sort((x, y) => { const p = pega(x, a.ordenar), q = pega(y, a.ordenar); const r = p == null ? 1 : q == null ? -1 : (typeof p === 'number' && typeof q === 'number' ? p - q : String(p).localeCompare(String(q), 'pt-BR')); return a.desc ? -r : r; });
        const lim = Math.max(1, Math.min(40, +a.limite || 20)), ini = Math.max(0, +a.pular || 0);
        const itens = R.slice(ini, ini + lim).map((d) => { const x = a.campos && a.campos.length ? a.campos.reduce((o, k) => { if (!CHAVE_SENS.test(k)) o[k] = pega(d, k); return o; }, { _id: d._id }) : d; return limpa(x); });
        R.slice(ini, ini + lim).forEach((d) => vi(a.colecao, d));
        return corta({ total: R.length, mostrando: itens.length, pular: ini, itens }); } },
    { name: 'contar', description: 'Conta os documentos de uma coleção agrupados por um campo (ex.: leads por corretor ou por etapa), com os mesmos filtros de consultar.',
      inputSchema: { type: 'object', properties: { colecao: { type: 'string' }, por: { type: 'string' }, onde: { type: 'array', items: { type: 'object' } }, texto: { type: 'string' } }, required: ['colecao'] },
      execute(a) { E.etapa = 'Contando em ' + a.colecao; E.nFerr++; vi(a.colecao); pede();
        recusaSens(a, [a.por]); const R = filtra(docs(a.colecao), a.onde, a.texto); if (!a.por) return corta({ total: R.length });
        const g = {}; R.forEach((d) => { const k = limpa(String(pega(d, a.por) == null || pega(d, a.por) === '' ? '(vazio)' : pega(d, a.por))); g[k] = (g[k] || 0) + 1; });
        return corta({ total: R.length, grupos: Object.entries(g).sort((x, y) => y[1] - x[1]).slice(0, 40) }); } },
    { name: 'somar', description: 'Soma um campo numérico de uma coleção (ex.: valor das cobranças em aberto), opcionalmente agrupado por outro campo, com os mesmos filtros de consultar.',
      inputSchema: { type: 'object', properties: { colecao: { type: 'string' }, campo: { type: 'string' }, por: { type: 'string' }, onde: { type: 'array', items: { type: 'object' } }, texto: { type: 'string' } }, required: ['colecao', 'campo'] },
      execute(a) { E.etapa = 'Somando em ' + a.colecao; E.nFerr++; vi(a.colecao); pede();
        recusaSens(a, [a.campo, a.por]); const R = filtra(docs(a.colecao), a.onde, a.texto), num = (v) => (typeof v === 'number' ? v : (v != null && v !== '' && !isNaN(+String(v).replace(',', '.')) ? +String(v).replace(',', '.') : 0));
        if (!a.por) return corta({ docs: R.length, soma: Math.round(R.reduce((s, d) => s + num(pega(d, a.campo)), 0) * 100) / 100 });
        const g = {}; R.forEach((d) => { const k = limpa(String(pega(d, a.por) || '(vazio)')); g[k] = (g[k] || 0) + num(pega(d, a.campo)); });
        return corta({ docs: R.length, grupos: Object.entries(g).map(([k, v]) => [k, Math.round(v * 100) / 100]).sort((x, y) => y[1] - x[1]).slice(0, 40) }); } }
  ];

  // ---------------------------------------------------------------- prompts
  const agora = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
  const CTX = () => 'Você é a IA do HUB VIVERE, o painel interno da Vivere Imóveis Selecionados (Florianópolis/SC), usado pelo Cleiton, diretor e advogado. '
    + 'Agora: ' + agora() + ' (horário de Brasília). A Vivere administra locações (meta de 40 imóveis administrados até dez/2026, taxa de administração de 10%), vende imóveis e capta leads para os corretores.\n'
    + 'Use as ferramentas para ler os dados do HUB antes de responder; nunca invente número, nome ou data. Se o dado não estiver no HUB, diga isso em uma linha. '
    + 'CPF, CNPJ, telefone e e-mail chegam mascarados: não peça nem tente reconstruir. Seja econômico: peça só os campos de que precisa e use contar/somar para totais.\n'
    + 'Guia das coleções (confirme os campos com listar_colecoes): imoveis = anúncios do site (Imobibrasil); contratos_locacao = carteira de locação; cobrancas = cobranças e inadimplência; '
    + 'repasses = repasses aos proprietários; receita_mensal = receita por mês; vendas = vendas fechadas; recebimentos_cleiton = recebimentos; leads, crm_leads e crm = leads e funil dos corretores; '
    + 'oportunidades = ofertas de imóveis para leads; pendencias = pendências calculadas pela rotina diária; tarefas = tarefas; corretores = equipe; controle = estado das coletas e da rotina; '
    + 'construcoes = construções e módulos do HUB; documentos = documentos.\n'
    + 'Escreva em português do Brasil, direto, conclusão primeiro, sem rodeio, sem markdown (nada de **, # ou tabelas); listas com "- ". Valores em R$ no formato brasileiro.';

  const PEDIDOS = {
    resumo: () => CTX() + '\n\nTarefa: resumo da semana da Vivere para a diretoria (últimos 7 dias, comparando com a semana anterior quando houver data). Quatro blocos: caixa e recebimentos; carteira e inadimplência; captações e vendas; leads. '
      + 'Cada item com o número e a comparação quando der; o que não estiver no HUB vai em "faltou". Termine com UMA ação da semana e o motivo. '
      + 'Responda só com JSON: {"geral":"2 a 3 frases","blocos":[{"titulo":"…","itens":["…"]}],"acao":"…","motivo":"…","faltou":["…"]}.',
    alertas: () => CTX() + '\n\nTarefa: alertas do dia — o que pede atenção do Cleiton HOJE. Olhe primeiro a coleção pendencias; depois confira: cobranças vencidas, contratos vencendo ou reajustando em 30 dias, '
      + 'leads sem retorno há mais de 7 dias (por corretor), coletas paradas ou com falha (controle) e tarefas atrasadas. No máximo 10 alertas, os mais graves primeiro; não repita o mesmo assunto. '
      + 'Em "aba", use um destes ids quando ajudar a abrir a tela certa: ' + ABAS_OK.join(', ') + '. '
      + 'Responda só com JSON: {"alertas":[{"gravidade":"alta|media|baixa","titulo":"curto","detalhe":"o quê, quem, quanto","aba":"id ou vazio"}],"tudo_ok":"frase se não houver alerta"}.',
    melhorias: () => CTX() + '\n\nTarefa: revisão de melhorias do próprio HUB. Procure nos dados: campos importantes vazios ou incoerentes, duplicidades, coleções paradas (controle), '
      + 'construções a fazer ou em testes há muito tempo (construcoes), pendências que se repetem e informação que falta para as decisões da diretoria. '
      + 'Proponha até 8 melhorias concretas, as de maior ganho primeiro, cada uma com a evidência (coleção e número). '
      + 'Responda só com JSON: {"sugestoes":[{"area":"curta","problema":"o que achou, com o número","sugestao":"o que fazer","ganho":"por que vale","esforco":"curto|medio|longo"}]}.'
  };

  // ---------------------------------------------------------------- execução
  function pede() { try { H.pede(); } catch (e) {} }
  async function iaPronta() {
    if (SM === undefined) { try { SM = window.claude && window.claude.use ? await window.claude.use('sample') : null; } catch (e) { SM = null; } }
    return SM;
  }
  function erroTxt(e) {
    return e && e.name === 'AbortError' ? 'Parado.' : e && e.code === 'rate_limited' ? 'Limite de uso da IA atingido agora. Tente mais tarde.'
      : e && e.code === 'not_granted' ? 'A IA não foi liberada nesta visualização do HUB.' : 'A IA não respondeu agora (' + String((e && (e.code || e.message)) || 'erro').slice(0, 120) + '). Tente de novo.';
  }
  async function roda(tipo, pergunta) {
    if (E.rodando) return; E.rodando = tipo;
    const sm = await iaPronta();
    if (!sm) { E.rodando = ''; E.erro = 'A IA não está liberada nesta visualização do HUB (abra o HUB no claude.ai).'; pede(); return; }
    E.rodando = tipo; E.erro = ''; E.res = null; E.nFerr = 0; E.vistos = []; E.abrir = []; E.etapa = 'A IA está lendo o HUB…'; E.ctl = new AbortController(); pede();
    const opts = { tools: ferramentas(), signal: E.ctl.signal, modelTier: 'default', cache: false };
    try {
      let saida;
      if (tipo === 'pergunta') {
        const q = mascara(pergunta).slice(0, 1500);
        opts.onText = (p) => { E.res = { tipo, pergunta: q, texto: p.text || '' }; pede(); };
        const r = await sm(CTX() + '\n\nResponda à pergunta do Cleiton com os dados do HUB.\n\nPERGUNTA: ' + q, opts);
        saida = { tipo, pergunta: q, texto: (r && r.text) || '', cortada: !!(r && r.truncated) };
        E.abrir = montaAbrir(saida.texto);
      } else {
        const r = await sm.json(PEDIDOS[tipo](), opts);
        saida = Object.assign({ tipo }, valida(tipo, r));
      }
      saida.ferramentas = E.nFerr; saida.em = agora();
      E.res = saida; guarda(saida);
    } catch (e) { E.erro = erroTxt(e); if (E.res && !E.res.em) E.res = null; }
    finally { E.rodando = ''; E.etapa = ''; E.ctl = null; pede(); }
  }
  const fmtEm = (s) => String(s || '').replace(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/, '$3/$2/$1 $4');
  const txt = (v, n) => String(v == null ? '' : v).slice(0, n || 600);
  const arr = (v, n) => (Array.isArray(v) ? v.slice(0, n || 10) : []);
  function valida(tipo, r) {
    r = r && typeof r === 'object' ? r : {};
    if (tipo === 'resumo') return { geral: txt(r.geral), blocos: arr(r.blocos, 6).map((b) => ({ titulo: txt(b && b.titulo, 80), itens: arr(b && b.itens, 8).map((i) => txt(i, 300)) })), acao: txt(r.acao, 300), motivo: txt(r.motivo, 400), faltou: arr(r.faltou, 8).map((i) => txt(i, 200)) };
    if (tipo === 'alertas') return { alertas: arr(r.alertas, 10).map((a) => ({ gravidade: ['alta', 'media', 'baixa'].includes(a && a.gravidade) ? a.gravidade : 'media', titulo: txt(a && a.titulo, 120), detalhe: txt(a && a.detalhe, 400), aba: ABAS_OK.includes(a && a.aba) ? a.aba : '' })), tudo_ok: txt(r.tudo_ok, 300) };
    return { sugestoes: arr(r.sugestoes, 8).map((s) => ({ area: txt(s && s.area, 60), problema: txt(s && s.problema, 400), sugestao: txt(s && s.sugestao, 400), ganho: txt(s && s.ganho, 300), esforco: ['curto', 'medio', 'longo'].includes(s && s.esforco) ? s.esforco : 'medio' })) };
  }
  function guarda(doc) {
    const db = H.db(); if (!db) return;
    const id = doc.em.replace(/\D/g, '') + '-' + doc.tipo + '-' + Math.random().toString(36).slice(2, 6);
    try { Promise.resolve(db.collection(CL).doc(id).set(JSON.parse(JSON.stringify(doc)))).catch(() => { E.erro = 'Não consegui guardar no histórico.'; pede(); }); } catch (e) {}
  }

  // ---------------------------------------------------------------- texto da IA → HTML seguro
  function blocoTexto(t) {
    const L = String(t || '').replace(/\*\*/g, '').split('\n'); let h = '', lista = false;
    L.forEach((l) => { const m = l.match(/^\s*[-•]\s+(.*)/);
      if (m) { if (!lista) { h += '<ul class="iah-ul">'; lista = true; } h += '<li>' + esc(m[1]) + '</li>'; return; }
      if (lista) { h += '</ul>'; lista = false; } if (l.trim()) h += '<p>' + esc(l) + '</p>'; });
    return h + (lista ? '</ul>' : '');
  }
  const GRAV = { alta: ['Alta', 'bad'], media: ['Média', 'warn'], baixa: ['Baixa', 'info'] };
  const ESF = { curto: 'esforço curto', medio: 'esforço médio', longo: 'esforço longo' };
  function textoCopia(r) {
    if (r.tipo === 'pergunta') return 'Pergunta: ' + r.pergunta + '\n\n' + r.texto;
    if (r.tipo === 'resumo') return 'Resumo da semana (' + fmtEm(r.em) + ')\n' + r.geral + '\n' + (r.blocos || []).map((b) => '\n' + b.titulo + '\n' + b.itens.map((i) => '- ' + i).join('\n')).join('\n') + (r.acao ? '\n\nAção da semana: ' + r.acao + (r.motivo ? ' — ' + r.motivo : '') : '');
    if (r.tipo === 'alertas') return 'Alertas do dia (' + fmtEm(r.em) + ')\n' + ((r.alertas || []).map((a) => '- [' + (GRAV[a.gravidade] || [''])[0] + '] ' + a.titulo + ': ' + a.detalhe).join('\n') || r.tudo_ok);
    return 'Revisão de melhorias do HUB (' + fmtEm(r.em) + ')\n' + (r.sugestoes || []).map((s, i) => (i + 1) + '. ' + s.area + ': ' + s.sugestao + ' (' + s.problema + '; ' + (ESF[s.esforco] || '') + ')').join('\n');
  }
  function corpo(r, src) {
    if (!r) return '';
    if (r.tipo === 'pergunta') return (r.pergunta ? `<p class="s">Pergunta: ${esc(r.pergunta)}</p>` : '') + `<div class="iah-txt">${blocoTexto(r.texto) || '<p class="s">…</p>'}</div>` + (r.cortada ? '<p class="s">A resposta foi cortada pelo tamanho; faça uma pergunta mais específica.</p>' : '');
    if (r.tipo === 'resumo') return `<div class="iah-txt"><p>${esc(r.geral)}</p></div><div class="iah-grade">${(r.blocos || []).map((b) => `<div class="card"><b>${esc(b.titulo)}</b><ul class="iah-ul">${b.itens.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div>`
      + (r.acao ? `<div class="aviso" style="margin:12px 0 0"><b>Ação da semana:</b> ${esc(r.acao)}${r.motivo ? `<div class="s" style="margin-top:4px">${esc(r.motivo)}</div>` : ''}</div>` : '')
      + ((r.faltou || []).length ? `<p class="s" style="margin-top:8px">Faltou no HUB: ${r.faltou.map(esc).join(' · ')}</p>` : '');
    if (r.tipo === 'alertas') return (r.alertas || []).length ? `<div class="iah-lista">${r.alertas.map((a) => { const g = GRAV[a.gravidade] || GRAV.media;
      return `<div class="card iah-item"><div class="iah-cab"><span class="pill ${g[1]}">${g[0]}</span><b>${esc(a.titulo)}</b></div><div>${esc(a.detalhe)}</div>${a.aba && ABAS_OK.includes(a.aba) ? `<div class="filtros" style="margin:8px 0 0"><button class="btn" data-aba="${esc(a.aba)}">Abrir ${esc(H.rotAba ? H.rotAba(a.aba) : a.aba)}</button></div>` : ''}</div>`; }).join('')}</div>`
      : `<div class="iah-txt"><p>${esc(r.tudo_ok || 'Nenhum alerta para hoje.')}</p></div>`;
    return `<div class="iah-lista">${(r.sugestoes || []).map((s, i) => `<div class="card iah-item"><div class="iah-cab"><span class="pill info">${esc(ESF[s.esforco] || '')}</span><b>${i + 1}. ${esc(s.area)}</b></div>
      <div><b>Achado:</b> ${esc(s.problema)}</div><div><b>Sugestão:</b> ${esc(s.sugestao)}</div><div class="s">${esc(s.ganho)}</div>
      <div class="filtros" style="margin:8px 0 0"><button class="btn" data-iah-copia-sug="${esc(src || 'atual')}|${i}">Copiar para a Central</button></div></div>`).join('') || '<p class="s">A IA não achou melhoria a propor.</p>'}</div>`;
  }

  // ---------------------------------------------------------------- histórico
  const hist = () => H.lista(CL).filter((d) => d && d.tipo && TIPOS[d.tipo]);
  function pHist() {
    const L0 = hist(), F = E.hf === 'todos' ? L0 : L0.filter((d) => d.tipo === E.hf);
    const L = F.slice().sort((a, b) => (E.hOrd === 'desc' ? -1 : 1) * String(a.em || a._id).localeCompare(String(b.em || b._id)));
    const POR = 50, pg = Math.min(E.hPg, Math.max(0, Math.ceil(L.length / POR) - 1)), V = L.slice(pg * POR, pg * POR + POR);
    const n = (k) => (k === 'todos' ? L0.length : L0.filter((d) => d.tipo === k).length);
    const chips = [['todos', 'Todos']].concat(Object.entries(TIPOS).map(([k, v]) => [k, v[1]])).map(([k, t]) => `<button class="btn" data-iah-hf="${k}" aria-pressed="${E.hf === k}">${esc(t)} (${n(k)})</button>`).join('');
    const item = (d) => { const t = TIPOS[d.tipo], ab = E.hAberto === d._id, tit = d.tipo === 'pergunta' ? d.pergunta : d.tipo === 'resumo' ? d.geral : d.tipo === 'alertas' ? ((d.alertas || []).length + ' alerta(s)' + ((d.alertas || [])[0] ? ': ' + d.alertas[0].titulo : '')) : ((d.sugestoes || []).length + ' sugestão(ões)' + ((d.sugestoes || [])[0] ? ': ' + d.sugestoes[0].area : ''));
      return `<div class="card iah-item"><button class="iah-hbtn" data-iah-habre="${esc(d._id)}" aria-expanded="${ab}"><span>${t[0]}</span><span class="iah-htit"><b>${esc(t[1])}</b> · ${esc(H.dt ? H.dt(d.em) : d.em)}${d.em && /\d{2}:\d{2}$/.test(d.em) ? ' ' + esc(d.em.slice(-5)) : ''}<span class="s">${esc(String(tit || '').slice(0, 140))}</span></span><span>${ab ? '▾' : '▸'}</span></button>
        ${ab ? `<div style="margin-top:10px">${corpo(d, d._id)}<div class="filtros" style="margin:10px 0 0"><button class="btn" data-iah-copia-h="${esc(d._id)}">Copiar</button></div></div>` : ''}</div>`; };
    return `<h3 style="margin-top:22px">Histórico</h3><p class="nota">Tudo o que a IA respondeu aqui fica guardado (só você vê), para comparar semanas e para o Claude conhecer o que já foi visto.</p>
      <div class="filtros">${chips}<button class="btn" data-iah-hord="1" title="Ordenar por data">Data ${E.hOrd === 'desc' ? '▼ mais recente' : '▲ mais antigo'}</button></div>
      ${V.length ? `<div class="iah-lista">${V.map(item).join('')}</div>` : H.vazio(H.carregado && H.carregado[CL] === false ? 'Carregando…' : 'Nada guardado ainda.')}
      ${L.length > POR ? `<div class="filtros" style="margin-top:10px"><button class="btn" data-iah-hpg="-1" ${pg ? '' : 'disabled'}>‹ Anteriores</button><span class="s">${pg * POR + 1}–${Math.min(L.length, pg * POR + POR)} de ${L.length}</span><button class="btn" data-iah-hpg="1" ${(pg + 1) * POR >= L.length ? 'disabled' : ''}>Próximos ›</button></div>` : ''}`;
  }

  // ---------------------------------------------------------------- aba
  const CSS = `<style id="iah-css">.iah-caixa{display:flex;flex-direction:column;gap:8px}.iah-caixa textarea{width:100%;min-height:76px;box-sizing:border-box;font:inherit;padding:10px;border-radius:10px;border:1px solid var(--line,#ccc);background:var(--bg2,transparent);color:inherit;resize:vertical}
  .iah-acoes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}.iah-acoes .btn{width:100%;box-sizing:border-box;min-width:0;white-space:normal;text-align:left;padding:10px 12px;line-height:1.3}.iah-acoes .btn span{display:block;font-size:.82em;opacity:.75;margin-top:2px}
  .iah-prontas{display:flex;flex-wrap:wrap;gap:6px}.iah-prontas .btn{white-space:normal;max-width:100%;box-sizing:border-box;text-align:left;font-size:.88em}
  .iah-res{margin-top:14px}.iah-txt p{margin:0 0 8px}.iah-ul{margin:6px 0 0 18px;padding:0}.iah-ul li{margin:3px 0}
  .iah-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:10px}.iah-lista{display:flex;flex-direction:column;gap:8px}
  .iah-item{padding:12px}.iah-cab{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
  .iah-hbtn{all:unset;cursor:pointer;display:flex;gap:10px;align-items:flex-start;width:100%}.iah-htit{flex:1;min-width:0}.iah-htit .s{display:block;margin-top:2px;overflow-wrap:anywhere}
  .iah-etapa{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px}.iah-abrir .btn{white-space:normal;text-align:left;max-width:100%;box-sizing:border-box}
  @media (max-width:560px){.iah-acoes{grid-template-columns:1fr}}</style>`;
  function render() {
    const roda1 = E.rodando, dis = roda1 ? 'disabled' : '';
    const semIA = SM === null;
    const res = E.res ? `<div class="card iah-res"><div class="iah-cab"><span class="pill ok">${TIPOS[E.res.tipo][0]} ${esc(TIPOS[E.res.tipo][1])}</span>${E.res.em ? `<span class="s">${esc(fmtEm(E.res.em))} · ${E.res.ferramentas || 0} consulta(s) ao HUB · guardado no histórico</span>` : '<span class="s">escrevendo…</span>'}</div>${corpo(E.res)}
      ${E.res.em && E.res.tipo === 'pergunta' && E.abrir.length ? `<div class="filtros iah-abrir" style="margin:10px 0 0">${E.abrir.map((b, i) => `<button class="btn" data-iah-abrir="${i}">${esc(rotAbrir(b))}</button>`).join('')}</div>` : ''}
      ${E.res.em ? `<div class="filtros" style="margin:10px 0 0"><button class="btn" data-iah-copia="1">Copiar</button></div>` : ''}</div>` : '';
    return CSS + `<h2>🤖 IA do HUB</h2>
      <p class="nota">Pergunte em linguagem natural sobre os dados do HUB. A IA só roda quando você toca num botão, consulta os dados pelas ferramentas do HUB e não grava nada fora do histórico desta aba. CPF, CNPJ, telefone e e-mail são tirados ou mascarados antes de chegar ao Claude.</p>
      ${semIA ? '<div class="aviso">A IA não está liberada nesta visualização. Abra o HUB VIVERE no claude.ai, com a sua conta.</div>' : ''}
      <div class="card iah-caixa"><label for="iah-q"><b>💬 Pergunta livre</b></label>
        <textarea id="iah-q" placeholder="Ex.: quais imóveis do Campeche estão parados?" ${dis}>${esc(E.q)}</textarea>
        <div class="filtros" style="margin:0"><button class="btn" data-iah-perg="1" style="border-color:var(--accent);font-weight:600" ${dis}>Perguntar</button>${botaoMic(dis)}${roda1 ? '<button class="btn" data-iah-parar="1">Parar</button>' : ''}</div>
        <div class="s" style="margin-top:4px">Perguntas prontas</div>
        <div class="iah-prontas">${PRONTAS.map((p, i) => `<button class="btn" data-iah-pronta="${i}" ${dis}>${esc(p)}</button>`).join('')}</div></div>
      <div class="iah-acoes">
        <button class="btn" data-iah-rodar="resumo" ${dis}>📋 Resumo da semana<span>caixa, carteira, captações e leads, com a ação da semana</span></button>
        <button class="btn" data-iah-rodar="alertas" ${dis}>🚨 Alertas do dia<span>o que pede atenção hoje, com o atalho para a aba</span></button>
        <button class="btn" data-iah-rodar="melhorias" ${dis}>🛠 Revisão de melhorias<span>falhas nos dados e melhorias do próprio HUB</span></button></div>
      ${roda1 ? `<div class="iah-etapa"><span class="pill warn">IA trabalhando</span><span class="s">${esc(E.etapa || '')}${E.nFerr ? ' · ' + E.nFerr + ' consulta(s)' : ''}</span></div>` : ''}
      ${E.erro ? `<div class="aviso" style="margin-top:10px">${esc(E.erro)}</div>` : ''}
      ${res}${pHist()}
      <p class="s" style="margin-top:16px">Só lê o HUB VIVERE. Para cruzar com outros artefatos, pergunte no chat do Claude (skill busca-integrativa).</p>`;
  }
  // foco da caixa de pergunta: o render do HUB troca o HTML da aba; devolve o foco e o cursor
  function devolveFoco() {
    if (!E.foco) return; const i = document.getElementById('iah-q'); if (!i || document.activeElement === i) return;
    try { i.focus(); if (E.sel) i.setSelectionRange(E.sel[0], E.sel[1]); } catch (e) {}
  }
  const obs = new MutationObserver(() => devolveFoco());
  try { obs.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  document.addEventListener('input', (e) => { if (e.target && e.target.id === 'iah-q') { E.q = e.target.value; E.sel = [e.target.selectionStart, e.target.selectionEnd]; } });
  document.addEventListener('focusin', (e) => { if (e.target && e.target.id === 'iah-q') E.foco = true; });
  document.addEventListener('focusout', (e) => { if (e.target && e.target.id === 'iah-q') { E.sel = [e.target.selectionStart, e.target.selectionEnd]; const alvo = e.target; setTimeout(() => { if (alvo.isConnected && document.activeElement !== alvo) E.foco = false; }, 0); } });
  document.addEventListener('pointerdown', (e) => { if (!(e.target && e.target.closest && e.target.closest('#iah-q'))) E.foco = false; }, true);
  document.addEventListener('keydown', (e) => { if (e.target && e.target.id === 'iah-q' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); perguntar(); } });

  function perguntar(q) { const t = String(q != null ? q : E.q).trim(); if (!t) { const i = document.getElementById('iah-q'); if (i) i.focus(); return; } E.q = t; E.foco = false; roda('pergunta', t); }

  // ---------------------------------------------------------------- 🎤 Ditar (16/11/2026, modelo AIOS › Perguntar): o texto entra na caixa para revisar; nunca envia sozinho
  const V = { d: null, ouvindo: false, iniciando: false, bloqueado: false, base: '', fim: '', parcial: '' };
  function botaoMic(dis) { return `<button class="btn" type="button" data-iah-mic="1" aria-pressed="${V.ouvindo}" ${V.ouvindo ? '' : dis}>${V.ouvindo ? '■ Parar ditado' : '🎤 Ditar'}</button>`; }
  const caixa = () => document.getElementById('iah-q');
  function escreve() { E.q = V.base + (V.fim + (V.parcial ? (V.fim ? ' ' : '') + V.parcial : '')).replace(/^\s+/, ''); const ta = caixa(); if (ta) ta.value = E.q; }
  function paraDitado() { try { if (V.d && V.ouvindo) V.d.stop().catch(() => {}); } catch (e) {} }
  function atalhoMic(msg) { const ta = caixa(); if (ta && !ta.disabled) { ta.focus(); try { const n = ta.value.length; ta.setSelectionRange(n, n); } catch (e) {} E.foco = true; }
    E.erro = msg || 'Ditado indisponível nesta tela: use o microfone do teclado do celular (ou Win+H no PC) e depois toque em Perguntar.'; pede(); }
  try { if (window.claude && window.claude.use) Promise.resolve(window.claude.use('dictation')).then((d) => { V.d = d || null; if (!d) return;
    d.onPartial((o) => { if (!V.ouvindo && !V.iniciando) return; V.parcial = String((o && o.text) || '').trim(); escreve(); });
    d.onFinal((o) => { const t = String((o && o.text) || '').trim(); V.parcial = ''; if (t) V.fim = (V.fim ? V.fim + ' ' : '') + t; escreve(); });
    d.onState((o) => { V.ouvindo = !!o && o.state === 'listening'; if (V.ouvindo || (o && o.state === 'idle')) V.iniciando = false; if (!V.ouvindo) { V.parcial = ''; E.foco = true; } pede(); });
  }).catch(() => { V.d = null; }); } catch (e) {}
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-iah-mic]'); if (!b) return;
    if (V.iniciando) return; if (V.ouvindo) return paraDitado();
    if (!V.d || V.bloqueado) return atalhoMic(V.bloqueado ? 'Ditado recusado nesta página: use o microfone do teclado do celular (ou Win+H no PC).' : null);
    E.erro = ''; V.base = E.q.trim() ? E.q.replace(/\s+$/, '') + ' ' : ''; V.fim = ''; V.parcial = ''; V.iniciando = true; setTimeout(() => { V.iniciando = false; }, 10000);
    V.d.start().catch((er) => { const c = er && er.code; V.iniciando = false; V.ouvindo = false;
      if (c === 'not_granted') { V.bloqueado = true; atalhoMic('Ditado recusado nesta página: use o microfone do teclado do celular (ou Win+H no PC).'); }
      else if (c === 'dismissed') { E.erro = 'Ditado não liberado agora; toque em Ditar de novo para tentar.'; pede(); }
      else atalhoMic('O ditado não ligou (' + (c || 'erro') + '): use o microfone do teclado do celular (ou Win+H no PC).'); });
  });
  new MutationObserver(() => { if (V.ouvindo && !caixa()) paraDitado(); }).observe(document.body, { childList: true, subtree: true });

  H.registrar({
    id: ID, aba: '🤖 IA', grupo: 'inicio', depois: 'pendencias', colecoes: [CL], render,
    busca(q) { const t = SEM(q); if (!t || t.length < 3) return [];
      return hist().filter((d) => SEM(JSON.stringify(d)).includes(t)).slice(0, 6).map((d) => ({ grp: 'IA do HUB', tit: TIPOS[d.tipo][1] + ' · ' + (d.em || ''), sub: String(d.pergunta || d.geral || '').slice(0, 80), ir: { aba: ID, alvo: d._id } })); },
    foco(id) { E.hAberto = id; E.hf = 'todos'; }
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-iah-perg],[data-iah-pronta],[data-iah-rodar],[data-iah-parar],[data-iah-copia],[data-iah-copia-sug],[data-iah-copia-h],[data-iah-hf],[data-iah-hord],[data-iah-hpg],[data-iah-habre],[data-iah-abrir]');
    if (!b) return; const d = b.dataset;
    if (d.iahPerg) return perguntar();
    if (d.iahPronta !== undefined) { E.q = PRONTAS[+d.iahPronta] || ''; return perguntar(E.q); }
    if (d.iahRodar) return roda(d.iahRodar);
    if (d.iahParar) { try { E.ctl && E.ctl.abort(); } catch (_) {} return; }
    if (d.iahCopia) { if (E.res) H.copiaTexto(textoCopia(E.res), b); return; }
    if (d.iahCopiaSug !== undefined) { const [src, ix] = d.iahCopiaSug.split('|'), r = src === 'atual' ? E.res : hist().find((x) => x._id === src), s = r && (r.sugestoes || [])[+ix]; if (s) H.copiaTexto('HUB VIVERE · melhoria sugerida pela IA (' + r.em + '): ' + s.area + ' — ' + s.sugestao + '\nAchado: ' + s.problema + '\nGanho: ' + s.ganho + ' · ' + (ESF[s.esforco] || ''), b); return; }
    if (d.iahCopiaH) { const h = hist().find((x) => x._id === d.iahCopiaH); if (h) H.copiaTexto(textoCopia(h), b); return; }
    if (d.iahHf) { E.hf = d.iahHf; E.hPg = 0; return pede(); }
    if (d.iahHord) { E.hOrd = E.hOrd === 'desc' ? 'asc' : 'desc'; E.hPg = 0; return pede(); }
    if (d.iahHpg) { E.hPg = Math.max(0, E.hPg + (+d.iahHpg)); return pede(); }
    if (d.iahAbrir !== undefined) { const x = E.abrir[+d.iahAbrir]; if (x) abrir(x); return; }
    if (d.iahHabre) { E.hAberto = E.hAberto === d.iahHabre ? '' : d.iahHabre; return pede(); }
  });
  // descobre cedo se a IA existe nesta visualização (sem chamar o Claude): só para o aviso
  iaPronta().then(() => pede());
})();
