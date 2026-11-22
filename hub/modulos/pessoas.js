// modulos/pessoas.js — Cadastros › Pessoas e Funções (HUB Vivere, construção "pessoas", 20/10/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Decisões do Cleiton (19–20/10/2026):
// • Pessoas é o banco de dados de cada pessoa: equipe (corretores, Diretoria, parceiros) E clientes (proprietários, locadores,
//   locatários, fiadores, compradores, vendedores), PF e PJ — nomes e vínculos. Desde 16/11/2026 (decisão do Cleiton, tarefa
//   hub-vivere-dados-pessoais-fontes) CPF/CNPJ, RG, telefones, e-mails e endereço aparecem no perfil, só leitura, vindos de
//   pessoas_dados (contratos das pastas, Imobibrasil, formulário dos corretores e Alude); conta bancária e PIX continuam fora.
// • Uma pessoa acumula várias funções; cada função vira um card no perfil. Catálogo e conceitos na aba Funções (coleção pessoas_funcoes).
// • Equipe: fonte = fichas do Cadastro (cadastro-corretores_fichas / _config — a tela do antigo módulo Cadastro mora aqui agora;
//   a rotina de pendências do cadastro-corretores continua a mesma). Números (agenciamentos, leads, locações, vendas, Placar) = coleção `corretores`.
// • Clientes: montados na página a partir das fontes já no banco — Imobibrasil (`imoveis`, identidade = id do proprietário no Imobibrasil),
//   Carteira (`contratos_locacao`: locador, locatário e fiadores da garantia), Vendas (lado vendedor/comprador) e sócios do Institucional.
//   Junção automática só por nome completo idêntico (2+ palavras, sem acento); o resto é sugestão com "Juntar" (decisão gravada em pessoas_fichas).
// • O que o Cleiton acrescenta (observação, junção, pessoa nova — parceiro externo, CLT, contato de construtora) vai para `pessoas_fichas`.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl0 = H.brl0 || ((v) => v);
  const ID = 'pessoas', IDF = 'pessoas-funcoes';
  const CF = 'cadastro-corretores_fichas', CG = 'cadastro-corretores_config', PF = 'pessoas_fichas', FN = 'pessoas_funcoes';
  const SIT = { em_entrada: ['Em entrada', 'warn'], ativo: ['Ativo', 'ok'], em_saida: ['Em saída', 'bad'], saiu: ['Saiu', ''] };
  const TIPO = { corretor: 'Corretor', diretor: 'Diretor (sócio)', vinculado: 'Vinculado à diretoria', parceiro: 'Parceiro (não compete nas metas)' };
  const TIPO_EQ = [['corretor', 'Corretor'], ['parceiro', 'Parceiro (não compete nas metas)']];
  const CLS0 = [['diretor', 'Diretor (sócio)'], ['corretor', 'Corretor'], ['juridico', 'Advogado / Jurídico'], ['gestor', 'Gestor imobiliário'], ['marketing', 'Marketing']];
  const EQ = ['Norte', 'Leste/Sul'];
  const EQ_TXT = { 'Norte': 'Norte (Jurerê)', 'Leste/Sul': 'Leste/Sul (Porto da Lagoa)' };
  const ST_AC = { ok: ['tem', 'ok'], pendente: ['pendente', 'warn'], na: ['não se aplica', ''], revogado: ['revogado', 'info'] };
  const ST_DOC = { assinado: ['assinado', 'ok'], pendente: ['pendente', 'warn'], na: ['não se aplica', ''] };
  const METAS = [['captacoes', 'Captações (imóveis agenciados)', 'n'], ['negocios', 'Negócios fechados', 'n'], ['vgv', 'VGV (R$)', 'r'], ['atividade', 'Atividade (visitas, contatos)', 't']];
  const PER = [['2026', 'Até dez/2026 — metas que eles propuseram'], ['2027', '2027 — metas da diretoria']];
  const FIN = { A: 'locação', V: 'venda', T: 'temporada' };
  const mesTxt = (s) => { if (!s) return ''; const [y, m] = String(s).split('-'); const n = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+m - 1]; return n ? `${n}/${y.slice(2)}` : s; };
  // Catálogo inicial das funções (conceitos "a revisar" até o Cleiton editar na aba Funções; o que estiver em pessoas_funcoes prevalece)
  const FUN0 = [
    ['equipe', 'diretor', 'Diretor (sócio)', 'Sócio e dono da imobiliária: dirige a operação e homologa os negócios da sua equipe regional. Não compete nas metas.'],
    ['equipe', 'corretor', 'Corretor', 'Corretor de imóveis da equipe (CRECI): capta imóveis, atende leads e fecha negócios. Compete nas metas, salvo exceção registrada na ficha.'],
    ['equipe', 'juridico', 'Advogado / Jurídico', 'Contratos, notificações, cobranças e processos da imobiliária (aba Jurídico).'],
    ['equipe', 'gestor', 'Gestor imobiliário', 'Gestão da carteira de locação: contratos administrados, cobrança, repasses e relacionamento com locadores e locatários.'],
    ['equipe', 'marketing', 'Marketing', 'Anúncios, site e portais (Imobibrasil, CanalPro), campanhas e materiais.'],
    ['equipe', 'parceiro_corretor', 'Corretor parceiro', 'Agencia ou indica pela Vivere sem fazer parte das equipes; não compete nas metas.'],
    ['equipe', 'socio', 'Sócio de empresa do grupo', 'Consta no contrato social de uma das empresas do grupo (aba Empresas do grupo).'],
    ['equipe', 'clt', 'Empregado (CLT)', 'Empregado com carteira assinada.'],
    ['equipe', 'fora_equipe', 'Agenciador fora da equipe', 'Aparece como agenciador no Imobibrasil, mas não está na equipe atual.'],
    ['clientes', 'proprietario', 'Proprietário', 'Dono de imóvel cadastrado no Imobibrasil (site), ativo ou não.'],
    ['clientes', 'locador', 'Locador', 'Dá o imóvel em locação, com contrato administrado pela Vivere (Carteira).'],
    ['clientes', 'locatario', 'Locatário', 'Aluga o imóvel no contrato de locação.'],
    ['clientes', 'fiador', 'Fiador', 'Garante o contrato de locação como fiador.'],
    ['clientes', 'vendedor', 'Vendedor / cedente', 'Lado que vende ou cede direitos num contrato elaborado (aba Vendas).'],
    ['clientes', 'comprador', 'Comprador / cessionário', 'Lado que compra ou recebe direitos num contrato elaborado (aba Vendas).'],
    ['clientes', 'parte', 'Parte em outro contrato', 'Parte em confissão de dívida, corretagem, intermediação, reserva ou outro instrumento da aba Vendas.'],
    ['clientes', 'conjuge', 'Cônjuge / companheiro(a)', 'Assina o contrato como cônjuge ou companheiro(a) de uma das partes.'],
    ['clientes', 'anuente', 'Anuente', 'Assina para consentir com o negócio, sem ser parte principal.'],
    ['clientes', 'interveniente', 'Interveniente', 'Intervém no contrato (ex.: construtora, incorporadora, SPE, banco).'],
    ['clientes', 'procurador', 'Procurador(a)', 'Assina por outra pessoa, com procuração.'],
    ['clientes', 'representante', 'Representante de empresa', 'Assina por uma empresa (sócio, administrador ou procurador da PJ).'],
    ['clientes', 'testemunha', 'Testemunha', 'Assina contratos como testemunha.'],
    ['parceiros', 'imobiliaria', 'Imobiliária ou corretor no contrato', 'Imobiliária ou corretor que intermedeia, administra ou recebe a corretagem num contrato (fora as empresas do grupo).'],
    ['parceiros', 'parceiro_externo', 'Parceiro externo', 'Fornecedor ou parceiro de negócio: fotógrafo, vistoriador, despachante, imobiliária parceira…'],
    ['parceiros', 'contato_construtora', 'Contato de construtora', 'Dono, diretor ou corretor de uma construtora ou incorporadora.'],
    ['parceiros', 'empresa_grupo', 'Empresa do grupo', 'Empresa da própria Vivere (aba Empresas do grupo).'],
  ];
  const GRUPOS_F = [['equipe', 'Equipe'], ['clientes', 'Clientes e partes dos contratos'], ['parceiros', 'Parceiros e empresas']];
  const VINC_NOVO = [['corretor', 'Corretor da equipe'], ['diretoria', 'Diretoria'], ['parceiro_corretor', 'Corretor parceiro'], ['parceiro_externo', 'Parceiro externo'], ['contato_construtora', 'Contato de construtora'], ['clt', 'Empregado (CLT)']];
  const F = { g: 'todos', fun: '', q: '', pg: 0, sel: '', edit: false, novo: false, draft: {}, erro: '', y: 0, junta: '', fEdit: '' };
  const cfg = () => (H.S[CG] || {}).geral || {};
  const itens = (k) => cfg()[k] || [];
  const clsL = () => (cfg().classes && cfg().classes.length ? cfg().classes : CLS0);
  const fichas = () => H.lista(CF);
  const nomeDe = (x) => x.nome_completo || x.nome || x._id;
  const naDir = (x) => x.vinculo === 'diretoria';
  const pill = (m, k) => { const x = m[k]; return x ? `<span class="pill ${x[1]}">${esc(x[0])}</span>` : '<span class="pill">—</span>'; };

  // ---------------------------------------------------------------- estilos do módulo
  if (!document.getElementById('pp-css')) { const st = document.createElement('style'); st.id = 'pp-css'; st.textContent = `
    .pp-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
    .pp-card{all:unset;box-sizing:border-box;cursor:pointer;display:flex;gap:10px;align-items:flex-start;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px 12px;min-width:0}
    .pp-card:hover{border-color:var(--accent)} .pp-card:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    .pp-card.apagado{opacity:.6}
    .pp-av{flex:none;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-weight:600;font-size:13px;letter-spacing:.04em;color:#fff}
    .pp-av.g{width:56px;height:56px;font-size:19px}
    .pp-nome{font-weight:600;line-height:1.25;overflow-wrap:anywhere}
    .pp-chips{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}
    .pp-chip{font-size:11px;padding:0 7px;border-radius:999px;background:var(--soft);color:var(--ink);white-space:nowrap}
    .pp-chip.equipe{background:var(--accent);color:var(--bg)} .pp-chip.clientes{background:var(--ok-bg);color:var(--ok)} .pp-chip.parceiros{background:var(--warn-bg);color:var(--warn)} .pp-chip.alerta{background:var(--bad-bg);color:var(--bad)}
    .pp-sub{font-size:12px;color:var(--muted);margin-top:2px}
    .pp-cols{display:grid;gap:0 16px;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start}
    @media (max-width:900px){.pp-cols{grid-template-columns:minmax(0,1fr)}}
    .pp-sec{margin:16px 0 6px;font-family:var(--display);font-weight:500;font-size:13px;letter-spacing:.14em;text-transform:uppercase}
    .pp-sec .s{display:inline;text-transform:none;letter-spacing:0;font-family:var(--body);font-size:12px;color:var(--muted);margin-left:6px}
    .pp-fun{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px;margin-top:10px}
    .pp-fcard{background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--muted);border-radius:6px;padding:10px 12px;min-width:0}
    .pp-fcard.equipe{border-left-color:var(--accent)} .pp-fcard.clientes{border-left-color:var(--ok)} .pp-fcard.parceiros{border-left-color:var(--warn)}
    .pp-fcard h3{margin:0 0 4px;font-size:14px} .pp-fcard ul{margin:6px 0 0;padding:0;list-style:none} .pp-fcard li{margin:3px 0;font-size:13px;padding-left:12px;position:relative} .pp-fcard li::before{content:'›';position:absolute;left:0;color:var(--muted)}
    .pp-num{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;margin-top:6px}
    .pp-num div{background:var(--bg);border:1px solid var(--soft);border-radius:6px;padding:6px 8px}
    .pp-num b{display:block;font-family:var(--display);font-size:20px;font-weight:400}
    .pp-num span{font-size:11px;color:var(--muted)}
    .pp-lk{all:unset;cursor:pointer;color:var(--teal);text-decoration:underline;text-underline-offset:2px}
    .pp-lk:focus-visible{outline:2px solid var(--accent)}
    .pp-topo{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
  `; document.head.appendChild(st); }

  // ---------------------------------------------------------------- nomes
  const nrm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const slug = (s) => nrm(s).replace(/ /g, '-').slice(0, 80);
  const keyNome = (n) => { const k = nrm(n); return k.split(' ').length >= 2 ? k : ''; }; // nome completo (2+ palavras)
  const PJ_RE = /\b(ltda|llc|spe|eireli|epp|me|holding|participacoes|part|incorporadora|incorporacoes|construtora|consultoria|investimentos?|investment|empreendimentos|administracao|administradora|comercio|companhia|cia|imobiliaria|assessoria|servicos|treinamento|empresarial|cooperativa|condominio)\b/;
  const COMP_RE = /\b(incorporadora|incorporacoes|construtora|consultoria|investimentos?|empreendimentos|administracao|administradora|comercio|participacoes|assessoria|companhia|holding)\b/;
  const TERM_RE = /\b(ltda|llc|eireli|epp|spe|me|s a)\s*$/;
  const ePJ = (n) => PJ_RE.test(nrm(n)) || /\bS\.?\/?A\.?\s*$/.test(String(n || ''));
  const SIGLAS = new Set(['pcv', 'cv', 'sc', 'spe', 'llc', 'me', 'epp', 'eireli', 'ira', 'cgc', 'ksba', 'hsh', 'jdc', 'dwr', 'jf', 'alg', 'pwt', 'ltz', 'mic', 'xxx', 'sa', 'ii', 'iii', 'iv']);
  const PART = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'del', 'di']);
  // nome em MAIÚSCULAS (planilha de vendas) vira "Nome Próprio"; nome que já tem minúsculas fica como está
  function padrao(s) { const t = titulo(String(s || '').trim()); return t.split(' ').map((w, i) => w && (i === 0 || !PART.has(nrm(w))) && /^[a-zà-ÿ]/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ').replace(/\bE Outros\b/g, 'e outros').replace(/\bOutros\b/g, 'outros'); }
  function titulo(s) { s = String(s || '').trim(); if (/[a-zà-ÿ]/.test(s)) return s;
    return s.toLowerCase().split(/(\s+|-|\/)/).map((w, i) => { if (!w || /^\s+$|^[-/]$/.test(w)) return w; const n = nrm(w);
      if (SIGLAS.has(n) || /\d/.test(w)) return w.toUpperCase(); if (i > 0 && PART.has(n)) return w; return w.charAt(0).toUpperCase() + w.slice(1); }).join(''); }
  // separa "Fulano e Beltrana", "A, B e C", "X Ltda e Y"; tira "50%", "fiadores", "e outra(s)"; empresa com " e " no nome fica inteira.
  // Devolve as partes como trechos do texto original (para virar link no lugar) e se havia "e outros".
  function partes(txt) {
    let t = String(txt || ''); let outros = false;
    t = t.replace(/^\s*fiador(a|es|as)?\s*[:\-]?\s*/i, ' ').replace(/\s+e\s+outr[oa]s?\s*\.?\s*$/i, () => { outros = true; return ''; });
    const pcs = t.split(/(\s*,\s*|\s+e\s+)/i); const out = [];
    for (let i = 0; i < pcs.length; i += 2) { let p = pcs[i]; const sep = i ? pcs[i - 1] : ''; const limpo = p.replace(/\s*\d+([.,]\d+)?\s*%/g, '').trim(); if (!limpo) continue;
      const prev = out[out.length - 1]; const n = nrm(limpo);
      if (prev) { const pn = nrm(prev.limpo); const soSuf = /^(ltda|llc|eireli|epp|me|s a|sa|spe)$/.test(n);
        if (soSuf || (COMP_RE.test(pn) && !TERM_RE.test(pn) && PJ_RE.test(n))) { prev.limpo = prev.limpo + sep + limpo; prev.raw = prev.raw + sep + p.trim(); continue; } }
      out.push({ limpo, raw: limpo }); }
    return { L: out.map((o) => o.limpo), outros };
  }

  // ---------------------------------------------------------------- funções (catálogo)
  let CAT = null, CATsig = null;
  function catalogo() { const D = H.S[FN] || {}; const sg = [D, H.S[CG]]; if (CAT && CATsig && sg.every((x, i) => x === CATsig[i])) return CAT; CATsig = sg; const m = {};
    FUN0.forEach(([g, k, nome, conceito]) => { m[k] = { k, g, nome, conceito, o_que_esperar: '', revisar: true }; });
    Object.entries(D).forEach(([k, d]) => { m[k] = Object.assign({ k, g: 'equipe', nome: k, conceito: '' }, m[k] || {}, d, { revisar: false }); });
    clsL().forEach(([k, t]) => { if (!m[k]) m[k] = { k, g: 'equipe', nome: t, conceito: '', o_que_esperar: '', revisar: true }; });
    CAT = m; return m; }
  const funNome = (k) => (catalogo()[k] || { nome: k }).nome;
  const funGrupo = (k) => (catalogo()[k] || { g: 'clientes' }).g;
  const ORD_F = FUN0.map((z) => z[1]);
  const ordFun = (a, b) => { const ia = ORD_F.indexOf(a), ib = ORD_F.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); };

  // ---------------------------------------------------------------- índice de pessoas (montado das fontes, refeito quando o banco muda)
  let IDX = null, IDXsig = null;
  const PC = 'pessoas_contratos';
  const SIGC = [CF, PF, 'corretores', 'imoveis', 'contratos_locacao', 'vendas', 'institucional_empresas', 'controle', PC, 'documentos'];
  function indice() { const s = SIGC.map((c) => H.S[c]).concat([window.HUB_IMOVEIS ? 1 : 0]); if (IDX && IDXsig && s.every((x, i) => x === IDXsig[i])) return IDX; IDXsig = s; IDX = monta(); return IDX; }
  function lado(tipo) { const t = nrm(tipo);
    if (/^(pcv|cessao|cv |promessa|termo aditivo|permuta|dacao)/.test(t) || t.startsWith('cv bens')) return ['vendedor', 'comprador'];
    if (/^adm/.test(t)) return ['locador', 'parte']; // administração de aluguel: proprietária × administradora
    if (/locacao|locatario|aluguel/.test(t)) return ['locador', 'locatario'];
    return ['parte', 'parte']; }
  function monta() {
    const P = {}, porNome = {}, LINK = {}, VPC = {}, CORR = H.S.corretores || {};
    const nova = (id, nome, base) => P[id] || (P[id] = Object.assign({ id, nome: titulo(nome), nomes: new Set([titulo(nome)]), fun: {}, pj: ePJ(nome), origem: 'fonte' }, base || {}));
    const regNome = (id, n) => { if (!n) return; P[id].nomes.add(titulo(n)); const k = keyNome(n); if (!k) return; (porNome[k] = porNome[k] || new Set()).add(id); };
    const addFun = (id, k, item) => { const f = P[id].fun[k] = P[id].fun[k] || []; if (item && !f.some((x) => x.ref === item.ref && x.txt === item.txt)) f.push(item); };
    const unico = (n) => { const k = keyNome(n); const s = k && porNome[k]; return s && s.size === 1 ? [...s][0] : ''; };
    // 1) equipe: fichas do Cadastro (fonte) e quem só aparece na coleção corretores (fora da equipe)
    fichas().forEach((x) => { const id = x._id; const p = nova(id, nomeDe(x), { origem: 'equipe', ficha: x, pj: false });
      p.nome = nomeDe(x); regNome(id, x.nome_completo); regNome(id, x.nome); (x.apelidos || []).forEach((a) => regNome(id, a));
      let cls = (x.classes || []).slice(); if (!cls.length) cls = x.tipo === 'parceiro' ? ['parceiro_corretor'] : ['corretor'];
      cls.forEach((k) => addFun(id, k, null)); });
    Object.entries(CORR).forEach(([id, c]) => { if (P[id]) return; const p = nova(id, c.nome_completo || c.nome, { origem: 'equipe', pj: false, semFicha: true });
      p.nome = c.nome_completo || c.nome; regNome(id, c.nome_completo); addFun(id, c.situacao === 'fora_da_equipe' ? 'fora_equipe' : c.situacao === 'parceiro' ? 'parceiro_corretor' : 'corretor', null); });
    // 2) pessoas cadastradas à mão (parceiro externo, CLT, contato de construtora…)
    H.lista(PF).filter((d) => d.manual).forEach((d) => { const p = nova(d._id, d.nome_completo || d.nome, { origem: 'manual', manual: d, pj: !!d.pj });
      regNome(d._id, d.nome_completo); regNome(d._id, d.nome); (d.funcoes || []).forEach((k) => addFun(d._id, k, d.empresa ? { ref: 'emp:' + d.empresa, txt: d.empresa } : null)); });
    // 3) empresas do grupo e sócios (Institucional)
    H.lista('institucional_empresas').forEach((e) => { const razao = e.razao || e.razao_social; if (!razao) return;
      const eid = unico(razao) || 'n-' + slug(razao); nova(eid, razao, { pj: true }); regNome(eid, razao); if (e.fantasia_receita) regNome(eid, e.fantasia_receita);
      addFun(eid, 'empresa_grupo', { ref: 'inst:' + e._id, txt: titulo(razao), aba: 'institucional' });
      (e.socios || []).forEach((s) => { if (!s || !s.nome) return; const sid = unico(s.nome) || 'n-' + slug(s.nome); nova(sid, s.nome); regNome(sid, s.nome);
        addFun(sid, 'socio', { ref: 'inst:' + e._id, txt: `${titulo(razao)}${s.participacao ? ' · ' + s.participacao : ''}`, aba: 'institucional' }); }); });
    // nomes de contrato/venda: pessoa já conhecida pelo nome completo (único) ou nova; nome de uma palavra só fica preso ao contexto
    const resolve = (n, ctxId) => { const u = unico(n); if (u) return u; const k = keyNome(n);
      const id = k ? 'n-' + slug(n) : 'n-' + slug(n) + '--' + slug(ctxId); if (!P[id]) { nova(id, n); } regNome(id, n); return id; };
    // 3b) contratos lidos das pastas (pessoas_contratos, 20/10/2026): todas as partes, com nome completo e papel —
    //     inclusive os "e outros" da planilha, cônjuges, anuentes, fiadores, intervenientes, procuradores, representantes e testemunhas
    const GRUPO_RE = /vivere|imoveis na ilha|imoveis da ilha|tavarua|g donelli/;
    const PAPF = { vendedor: 'vendedor', comprador: 'comprador', locador: 'locador', locatario: 'locatario', fiador: 'fiador', conjuge: 'conjuge', anuente: 'anuente', interveniente: 'interveniente', procurador: 'procurador', representante: 'representante', testemunha: 'testemunha', administradora: 'imobiliaria', intermediadora: 'imobiliaria', corretor: 'imobiliaria', parte: 'parte' };
    const PCD = {}; H.lista(PC).forEach((d) => { PCD[d._id] = d; const txt = `${(d.contratos || [])[0] ? titulo((d.contratos[0].tipo || '')) + ' · ' : ''}${d.nome_pasta || ''}`;
      (d.partes || []).forEach((x) => { if (!x || !x.nome) return; const ehGrupo = x.pj && GRUPO_RE.test(nrm(x.nome));
        const id = resolve(x.nome, d._id); if (x.pj) P[id].pj = true; if (x.profissao && !P[id].profissao) P[id].profissao = x.profissao;
        LINK[`pc|${d._id}|${nrm(x.nome)}`] = id;
        (x.papeis || ['parte']).forEach((pp) => { const f = PAPF[pp] || 'parte'; if (ehGrupo && f === 'imobiliaria') return;
          addFun(id, f, { ref: 'pc:' + d._id + ':' + f, pc: d._id, txt: txt + (x.representa ? ` (por ${titulo(x.representa)})` : x.conjuge_de ? ` (cônjuge de ${titulo(x.conjuge_de)})` : ''), papel_txt: (x.papel_txt || []).join(', ') }); }); }); });
    const pcDaPasta = (cam) => { if (!cam) return null; const k = nrm(cam); return H.lista(PC).find((d) => nrm(d.caminho) === k) || null; };
    const pcDoCod = (cod) => H.lista(PC).find((d) => d.cod === cod) || null;
    // nome curto ou abreviado da planilha ("EDINEIA", "FERNANDO S PEREIRA") → parte do contrato da mesma pasta
    const casaParte = (n, d) => { if (!d) return ''; const k = nrm(n); const w = k.split(' '); const L = (d.partes || []).map((x) => ({ x, k: nrm(x.nome) }));
      let c = L.filter((z) => z.k === k); if (!c.length) c = L.filter((z) => z.k.startsWith(k + ' '));
      if (!c.length && w.length > 1) c = L.filter((z) => { const v = z.k.split(' '); return v[0] === w[0] && v[v.length - 1] === w[w.length - 1]; });
      if (!c.length) c = L.filter((z) => z.k.split(' ')[0] === w[0]);
      return c.length === 1 ? LINK[`pc|${d._id}|${c[0].k}`] || '' : ''; };
    // 4) proprietários do Imobibrasil (identidade = id do proprietário no Imobibrasil; nome completo idêntico junta com quem já existe)
    // proprietário com um nome só no Imobibrasil ("Leandro"): procura a parte do contrato do mesmo imóvel (cadastro por unidade)
    const doImovel = (x) => { const M = window.HUB_IMOVEIS; if (keyNome(x.proprietario) || !M || !M.id) return ''; try { const u = M.unidade(M.id({ fonte: 'anuncio', id: x._id }));
        for (const pc of (u && u.pcs) || []) { const r = casaParte(x.proprietario, PCD[pc]); if (r) return r; } } catch (e) { /* sem cadastro de imóveis */ } return ''; };
    H.lista('imoveis').forEach((x) => { if (!x.proprietario) return; const pid = x.proprietario_id;
      let id = pid ? 'ib-' + pid : ''; const di = !P[id] && doImovel(x); if (di) id = di; if (!id || !P[id]) { const u = unico(x.proprietario); if (u && (P[u].origem !== 'fonte' || !P[u].ib || P[u].ib === pid)) id = u; else if (!id) id = 'n-' + slug(x.proprietario) + (keyNome(x.proprietario) ? '' : '--' + slug(x._id)); }
      nova(id, x.proprietario); regNome(id, x.proprietario); if (pid && !P[id].ib) P[id].ib = pid;
      const f = (String(x._id).match(/_([AVT])/) || [])[1];
      addFun(id, 'proprietario', { ref: 'imv:' + x._id, imovel: x._id, txt: `${x.ref} · ${FIN[f] || ''} · ${x.bairro || ''}`, ativo: !!x.ativo }); LINK['imovel|' + x._id] = id; });
    // 5) Carteira: locador, locatário e fiadores (garantia da planilha)
    H.lista('contratos_locacao').forEach((c) => { const al = c.alude || {}, pl = c.planilha || {}; const end = pl.endereco || al.endereco || '';
      const papeis = [['locador', [pl.locador, al.locador]], ['locatario', [pl.locatario, al.locatario]]];
      const gt = String(pl.garantia_txt || ''); if (/^\s*fiador/i.test(gt)) papeis.push(['fiador', [gt]]);
      papeis.forEach(([papel, txts]) => { const base = partes(txts[0] || txts[1] || ''); const alt = txts[1] && txts[0] ? partes(txts[1]).L : [];
        const dpc = pcDoCod(c._id); base.L.forEach((n) => { const id = (!keyNome(n) || !unico(n)) && casaParte(n, dpc) || resolve(n, c._id); regNome(id, n); addFun(id, papel, { ref: 'car:' + c._id, cod: c._id, txt: `${c._id} · ${String(end).split(',').slice(0, 2).join(',')}` }); LINK[`contrato|${c._id}|${nrm(n)}`] = id; });
        alt.forEach((n) => { const k2 = nrm(n).split(' ').slice(0, 2).join(' '); const par = base.L.find((b) => nrm(b).split(' ').slice(0, 2).join(' ') === k2);
          if (par) { const id = LINK[`contrato|${c._id}|${nrm(par)}`]; if (id) { LINK[`contrato|${c._id}|${nrm(n)}`] = id; regNome(id, n); } } }); }); });
    // 6) Vendas (planilha V. Claude): lado vendedor/cedente e comprador/cessionário (ou "parte" nos outros instrumentos)
    H.lista('vendas').forEach((v) => { const [la, lb] = lado(v.tipo); const txt = `${dt(v.data)} · ${titulo(v.tipo || '')} · ${titulo(v.objeto || '')}`;
      let dpc = null; try { dpc = pcDaPasta(H.pastaDaVenda ? H.pastaDaVenda(v) : ''); } catch (e) { dpc = null; } if (dpc) VPC[v._id] = dpc._id;
      [[v.vendedor, la, 'vendedor'], [v.comprador, lb, 'comprador']].forEach(([s, f, ld]) => { if (!s) return; const pr = partes(s);
        pr.L.forEach((n) => { const id = (!keyNome(n) || !unico(n)) && casaParte(n, dpc) || resolve(n, v._id); regNome(id, n); addFun(id, f, { ref: 'ven:' + v._id, venda: v._id, txt: txt + (pr.outros ? ' (e outros)' : ''), lado: ld }); LINK[`venda|${v._id}|${nrm(n)}`] = id; }); }); });
    // 7) junções decididas pelo Cleiton (pessoas_fichas.juntar_em) e observações
    const AJ = H.S[PF] || {}; const alvo = (id) => { const vis = new Set(); while (!vis.has(id)) { vis.add(id);
        if (AJ[id] && AJ[id].juntar_em && P[AJ[id].juntar_em]) id = AJ[id].juntar_em; else if (P[id] && P[id].juntado && P[P[id].juntado]) id = P[id].juntado; else break; } return id; };
    Object.keys(P).forEach((id) => { const a = alvo(id); if (a === id) return; const p = P[id], q = P[a];
      Object.entries(p.fun).forEach(([k, L]) => L.forEach((it) => { const f = q.fun[k] = q.fun[k] || []; if (it && !f.some((x) => x.ref === it.ref)) f.push(it); }));
      p.nomes.forEach((n) => q.nomes.add(n)); if (p.ib && !q.ib) q.ib = p.ib; p.juntado = a; });
    // 7b) junção automática (pedido do Cleiton, 20/10/2026): mesmo primeiro nome e ao menos um sobrenome em comum = mesma pessoa,
    //     que fica com o nome mais completo. Travas: PJ fica fora; duas fichas da equipe nunca se juntam; Júnior/Filho/Neto diferentes
    //     não se juntam; "Ana Maria X" × "Ana Paula X" (segundo nome diferente nos dois) não se juntam; nome que serve para mais de uma
    //     pessoa (ambíguo) fica como sugestão; "Não é a mesma" (nao_juntar) desfaz e vale para sempre.
    const SUF = new Set(['junior', 'jr', 'filho', 'neto', 'sobrinho', 'segundo', 'terceiro']);
    const tk = (n) => nrm(n).split(' ').filter(Boolean);
    // prenomes: primeiro nome de qualquer pessoa física da base + os segundos nomes mais comuns ("Júlio César", "Luiz Henrique");
    // prenome em comum não conta como sobrenome
    const PREN = new Set(['maria', 'ana', 'joao', 'jose', 'carlos', 'cesar', 'henrique', 'augusto', 'eduardo', 'eduarda', 'paulo', 'paula', 'luiz', 'luis', 'luisa', 'luiza',
      'carlo', 'regina', 'cristina', 'helena', 'fernanda', 'fernando', 'aparecida', 'vitor', 'victor', 'vitoria', 'antonio', 'antonia', 'francisco', 'roberto', 'alberto',
      'ricardo', 'felipe', 'rafael', 'gustavo', 'miguel', 'pedro', 'lucas', 'mateus', 'matheus', 'daniel', 'daniela', 'beatriz', 'clara', 'julia', 'marcos', 'marcelo',
      'andre', 'guilherme', 'gabriel', 'gabriela', 'lucia', 'luciana', 'teresa', 'tereza', 'rosa', 'carolina', 'cecilia', 'vinicius', 'leticia', 'alexandre', 'rodrigo']);
    Object.values(P).forEach((p) => { if (!p.pj) p.nomes.forEach((n) => { const w = tk(n); if (w.length >= 2) PREN.add(w[0]); }); });
    const sobren = (w) => w.slice(1).filter((x) => x.length >= 3 && !PART.has(x) && !SUF.has(x) && !PREN.has(x));
    const fam = (w) => w.slice(2).filter((x) => x.length >= 3 && !PART.has(x) && !SUF.has(x));
    const sufx = (w) => w.filter((x) => SUF.has(x)).sort().join(',');
    const nMax = (p) => [...p.nomes].map(tk).sort((a, b) => b.length - a.length)[0] || [];
    const naoJ = (a, b) => ((AJ[a] || {}).nao_juntar || []).includes(b) || ((AJ[b] || {}).nao_juntar || []).includes(a);
    // conflito: os dois com 3+ palavras e segundo nome diferente ("Ana Maria X" × "Ana Paula X"), ou sem nenhum sobrenome de família em comum
    //           ("Júlio César Fischer Pandolfo" × "Júlio César Moriguti")
    const conflito = (a, b) => a.length >= 3 && b.length >= 3 && ((a[1] !== b[1] && !b.includes(a[1]) && !a.includes(b[1])) || !fam(a).some((x) => fam(b).includes(x)));
    const junta = (de, em) => { const p = P[de], q = P[em];
      Object.entries(p.fun).forEach(([k, L]) => { const f = q.fun[k] = q.fun[k] || []; L.forEach((it) => { if (!it) { if (!f.length) f.push(null); return; } if (!f.some((x) => x && x.ref === it.ref)) f.push(it); }); });
      p.nomes.forEach((n) => q.nomes.add(n)); if (p.ib && !q.ib) q.ib = p.ib; if (p.profissao && !q.profissao) q.profissao = p.profissao; p.juntado = em;
      (q.auto = q.auto || []).push({ id: de, nome: p.nome }); };
    const porPri = {}; Object.values(P).filter((p) => !p.juntado && !p.pj).forEach((p) => { const w = nMax(p); if (w.length >= 2) (porPri[w[0]] = porPri[w[0]] || []).push(p); });
    Object.values(porPri).forEach((G) => { if (G.length < 2) return; G.sort((a, b) => nMax(a).length - nMax(b).length);
      G.forEach((p) => { if (p.juntado) return; const wp = nMax(p); const sp = new Set(sobren(wp)); if (!sp.size) return;
        const alvos = [...new Set(G.filter((q) => q !== p && !q.juntado && nMax(q).length >= wp.length && sobren(nMax(q)).some((x) => sp.has(x)) && sufx(nMax(q)) === sufx(wp)
          && !conflito(wp, nMax(q)) && !naoJ(p.id, q.id) && !(p.ficha && q.ficha)).map((q) => alvo(q.id)))].filter((id) => id !== p.id && !naoJ(p.id, id));
        if (alvos.length !== 1) return; const q = P[alvos[0]]; if (!q || (p.ficha && q.ficha)) return;
        if (p.ficha && !q.ficha) junta(q.id, p.id); else junta(p.id, q.id); }); });
    Object.keys(LINK).forEach((k) => { LINK[k] = alvo(LINK[k]); });
    Object.values(P).forEach((p) => { if (AJ[p.id] && AJ[p.id].obs) p.obs = AJ[p.id].obs; p.cat = categoria(p);
      if (!p.juntado) { const fx = p.ficha && p.ficha.nome_completo; if (fx) p.nomes.add(fx); const best = [...p.nomes].sort((a, b) => nrm(b).split(' ').length - nrm(a).split(' ').length || (b === fx ? 1 : 0) - (a === fx ? 1 : 0) || (/[a-z]/.test(b) ? 1 : 0) - (/[a-z]/.test(a) ? 1 : 0) || (b.match(/[à-ÿ]/gi) || []).length - (a.match(/[à-ÿ]/gi) || []).length || b.length - a.length)[0];
        if (best) { p.curto = p.nome; p.nome = p.pj ? titulo(best) : padrao(best); } p.incompleto = !p.pj && nrm(p.nome).split(' ').length < 2; } });
    // 8) sugestões de "possível mesma pessoa": mesmo nome completo em ids diferentes, ou mesmo primeiro + último nome
    const ativos = Object.values(P).filter((p) => !p.juntado); const grupo = {};
    ativos.forEach((p) => { const ks = new Set(); p.nomes.forEach((n) => { const k = keyNome(n); if (!k) return; const w = k.split(' '); ks.add('c:' + k); ks.add('p:' + w[0] + ' ' + w[w.length - 1]); });
      ks.forEach((k) => { (grupo[k] = grupo[k] || new Set()).add(p.id); }); });
    ativos.forEach((p) => { p.sugere = []; });
    Object.values(grupo).forEach((s) => { if (s.size < 2 || s.size > 4) return; const L = [...s];
      L.forEach((a) => { const pa = P[a]; const nao = new Set(((AJ[a] || {}).nao_juntar) || []);
        L.forEach((b) => { if (a !== b && !nao.has(b) && !(((AJ[b] || {}).nao_juntar) || []).includes(a) && !pa.sugere.includes(b) && !(pa.origem === 'equipe' && P[b].origem === 'equipe')) pa.sugere.push(b); }); }); });
    return { P, LINK, porNome, alvo, VPC, PCD };
  }
  function categoria(p) { const ks = Object.keys(p.fun); const x = p.ficha;
    if (x) { if (x.situacao === 'saiu') return 'saiu'; if (naDir(x)) return 'diretoria'; if (x.tipo === 'parceiro') return 'parceiros'; return 'equipe'; }
    if (p.origem === 'equipe') return ks.includes('fora_equipe') ? 'saiu' : ks.includes('parceiro_corretor') ? 'parceiros' : 'equipe';
    if (p.origem === 'manual') return ks.includes('clt') ? 'equipe' : 'parceiros';
    if (ks.some((k) => funGrupo(k) === 'clientes')) return 'clientes';
    return 'empresas'; }
  const pessoa = (id) => { const I = indice(); const p = I.P[id]; if (!p) return p; const a = I.alvo(id); return I.P[a] || p; };
  const P0 = (id) => indice().P[id];
  const vivas = () => Object.values(indice().P).filter((p) => !p.juntado);
  const funcoesDe = (p) => Object.keys(p.fun).sort(ordFun);

  // ---------------------------------------------------------------- API para o núcleo (links de pessoa em todas as abas)
  window.HUB_PESSOAS = {
    html(txt, ctx) { const I = indice(); ctx = ctx || {}; const lk = (id, t) => { const p = I.P[id] && I.P[I.alvo(id)];
        return p ? `<button class="lk pes" data-pessoa="${esc(p.id)}" title="Abrir o cadastro de ${esc(p.nome)}">${esc(p.nome)}</button>` : esc(padrao(t)); };
      if (ctx.fonte === 'imovel') { const id = I.LINK['imovel|' + ctx.id]; return id ? lk(id, txt) : ''; }
      const pr = partes(txt); if (!pr.L.length) return '';
      const outros = () => { if (!pr.outros || ctx.fonte !== 'venda') return ''; const d = I.PCD[I.VPC[ctx.id]]; if (!d) return '';
        const ja = new Set(pr.L.map((n) => I.alvo(I.LINK[`venda|${ctx.id}|${nrm(n)}`] || ''))); const lado = ctx.lado === 'comprador' ? ['comprador'] : ['vendedor'];
        const L = (d.partes || []).filter((x) => (x.papeis || []).some((pp) => lado.includes(pp))).map((x) => I.alvo(I.LINK[`pc|${d._id}|${nrm(x.nome)}`] || '')).filter((id) => id && !ja.has(id));
        return L.length ? ` <span class="s" style="display:inline">(e ${L.map((id) => lk(id, I.P[id].nome)).join(', ')})</span>` : ''; };
      // texto todo em maiúsculas (planilha, Imobibrasil) aparece no padrão do HUB; o banco continua com o texto da fonte
      const cx = !/[a-zà-ÿ]/.test(txt), vis = (s) => cx ? padrao(s) : s;
      let h = esc(vis(txt)), feito = 0; pr.L.forEach((n) => { const id = I.LINK[`${ctx.fonte}|${ctx.cod || ctx.id}|${nrm(n)}`] || (() => { const k = keyNome(n), s = k && I.porNome[k]; return s && s.size === 1 ? I.alvo([...s][0]) : ''; })();
        const e = esc(vis(n)); const i = h.indexOf(e, feito); if (i < 0) return; const b = id ? lk(id, n) : esc(padrao(n)); h = h.slice(0, i) + b + h.slice(i + e.length); feito = i + b.length; });
      return h + outros(); },
    // id da pessoa pelo nome num contexto: {fonte:'pc', id:<doc de pessoas_contratos>} | {fonte:'contrato', cod} | {fonte:'venda', id} | {fonte:'imovel', id} | {fonte:'corretor'}
    id(nome, ctx) { const I = indice(); ctx = ctx || {}; const k = nrm(nome);
      const l = ctx.fonte === 'pc' ? I.LINK[`pc|${ctx.id}|${k}`] : ctx.fonte === 'imovel' ? I.LINK['imovel|' + ctx.id] : ctx.fonte === 'contrato' ? I.LINK[`contrato|${ctx.cod}|${k}`] : ctx.fonte === 'venda' ? I.LINK[`venda|${ctx.id}|${k}`] : '';
      if (l) return I.alvo(l); if (ctx.fonte === 'corretor') { const f = fichas().find((x) => casaNome(nome, x)); if (f) return f._id; }
      const s = keyNome(nome) && I.porNome[keyNome(nome)]; return s && s.size === 1 ? I.alvo([...s][0]) : ''; },
    pessoa: (id) => pessoa(id),
    padrao: (s) => padrao(s),
  };

  // ---------------------------------------------------------------- gravação
  const SENS = [[/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, 'CPF'], [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/, 'CNPJ'], [/[\w.+-]+@[\w-]+\.[\w.]+/, 'e-mail'], [/\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/, 'telefone'], [/\b(ag[eê]ncia|conta|pix)\b.{0,12}\d{3,}/i, 'conta bancária']];
  function sensivel(obj) { if (typeof H.sensivel === 'function') return H.sensivel(obj); const t = JSON.stringify(obj || {}); for (const [re, nome] of SENS) if (re.test(t)) return nome; return ''; } // regra única do núcleo (hub #15)
  async function grava(col, id, campos, desc, criar) {
    const db = H.db(); if (!db) { F.erro = 'Banco indisponível nesta visualização.'; H.pede(); return false; }
    const s = sensivel(campos); if (s) { F.erro = `Parece haver ${s} no que foi digitado. Dados pessoais ficam na pasta da pessoa no PC, não no HUB.`; H.pede(); return false; }
    const x = (H.S[col] || {})[id] || {}; const hoje = H.hojeISO();
    const hist = (x.historico || []).slice(-60).concat([{ em: hoje, o_que: desc || 'editado', por: 'HUB' }]);
    try { if (criar || !(H.S[col] || {})[id]) await db.doc(col + '/' + id).set(Object.assign({ criado_em: hoje, origem: 'HUB' }, x, campos, { atualizado_em: hoje, historico: hist }));
      else await db.doc(col + '/' + id).update(Object.assign({}, campos, { atualizado_em: hoje, historico: hist })); F.erro = ''; return true; }
    catch (e) { F.erro = 'Não foi possível salvar: ' + (e && e.message || e); H.pede(); return false; } }

  // ---------------------------------------------------------------- contagens da equipe (iguais às do antigo Cadastro)
  function checkStat(x, k) { const L = itens(k === 'checklist_saida' ? 'saida' : 'entrada'); const C = x[k] || {};
    const feitos = L.filter(([i]) => C[i] && (C[i].st === 'feito' || C[i].st === 'na')).length; return { feitos, total: L.length, falta: L.filter(([i]) => !(C[i] && (C[i].st === 'feito' || C[i].st === 'na'))).map((z) => z[1]) }; }
  function casaNome(txt, x) { const t = nrm(txt); if (!t) return false; const nomes = [x.nome_completo, x.nome].concat(x.apelidos || []).filter(Boolean).map((n) => nrm(n));
    if (nomes.includes(t)) return true; const ex = (H.params().imobibrasil_corretores || {}); const k = Object.keys(ex).find((n) => nrm(n) === t); if (k) return ex[k] === x._id;
    const p = t.split(' ')[0]; if (t.split(' ').length > 1) return false;
    const mesmos = fichas().filter((y) => nrm((y.nome_completo || y.nome || '').split(/\s+/)[0]) === p); return mesmos.length === 1 && mesmos[0]._id === x._id; }
  function realizado(x, desde, ate) { const dentro = (d) => d && (!desde || d >= desde) && (!ate || d <= ate);
    const cap = H.lista('imoveis').filter((i) => dentro(i.cadastrado_em) && casaNome(i.corretor, x)).length;
    const V = H.lista('vendas').filter((v) => dentro(v.data) && !/sem comiss/i.test(String(v.status || '')) && String(v.corretores || '').split(/\s+e\s+|,|\/|;|\+/i).some((n) => casaNome(n.replace(/\(.*?\)/g, '').replace(/\s+AG$/i, ''), x)));
    return { captacoes: cap, negocios: V.length, vgv: V.reduce((t, v) => t + (Number(v.valor_transacao) || 0), 0) }; }

  // ---------------------------------------------------------------- pedaços visuais
  const CORES = ['#2f6f73', '#8c7550', '#1d2840', '#2f7a55', '#9a6a12', '#6a4c93', '#b0402e', '#3d6fa8'];
  function avatar(p, g) { const w = String(p.nome || '?').replace(/\b(ltda|llc|s\.?a\.?|me|epp)\b\.?/ig, '').trim().split(/\s+/).filter((z) => z && !PART.has(nrm(z)));
    const ini = ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); let h = 0; for (const c of String(p.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const foto = p.ficha && p.ficha.foto || p.manual && p.manual.foto;
    return foto ? `<img class="pp-av${g ? ' g' : ''}" src="${esc(foto)}" alt="" style="object-fit:cover">` : `<span class="pp-av${g ? ' g' : ''}" style="background:${CORES[h % CORES.length]}" aria-hidden="true">${esc(ini)}</span>`; }
  // etiquetas: funções da equipe → situação (homologa, não compete, entrada/saída) → demais funções; no cartão, as que sobram viram "+N"
  function chips(p, max) { const x = p.ficha || {}; const fc = (k) => `<span class="pp-chip ${funGrupo(k)}">${esc(funNome(k))}${p.fun[k] && p.fun[k].length > 1 ? ' ' + p.fun[k].length : ''}</span>`;
    const F1 = funcoesDe(p).filter((k) => funGrupo(k) === 'equipe'), F2 = funcoesDe(p).filter((k) => funGrupo(k) !== 'equipe'); const out = F1.map(fc);
    if (x.homologa) out.push(`<span class="pp-chip">homologa ${esc(x.homologa)}</span>`);
    if (p.ficha && (x.compete_metas === false || naDir(x) || x.tipo === 'parceiro')) out.push('<span class="pp-chip">não compete</span>');
    if (x.situacao === 'em_entrada') out.push('<span class="pp-chip parceiros">em entrada</span>'); if (x.situacao === 'em_saida') out.push('<span class="pp-chip alerta">em saída</span>'); if (x.situacao === 'saiu') out.push('<span class="pp-chip">saiu</span>');
    F2.forEach((k) => out.push(fc(k)));
    if (p.pj) out.push('<span class="pp-chip">PJ</span>'); if (p.incompleto) out.push('<span class="pp-chip alerta" title="Só o primeiro nome: falta o sobrenome">nome incompleto</span>'); if ((p.sugere || []).length) out.push('<span class="pp-chip alerta" title="Possível mesma pessoa em outro cadastro">duplicada?</span>');
    const m = max || 99; return out.length > m ? out.slice(0, m - 1).join('') + `<span class="pp-chip" title="mais ${out.length - m + 1} — veja no cadastro">+${out.length - m + 1}</span>` : out.join(''); }
  function subLinha(p) { const x = p.ficha; if (x) { const ent = x.entrada ? `desde ${String(x.entrada).length === 7 ? String(x.entrada).split('-').reverse().join('/') : dt(x.entrada)}` : '';
      return [naDir(x) ? '' : (x.equipe ? 'Equipe ' + x.equipe : ''), x.creci ? 'CRECI ' + x.creci : '', ent].filter(Boolean).join(' · '); }
    const n = Object.values(p.fun).reduce((t, L) => t + (L || []).length, 0); return n ? `${n} vínculo${n > 1 ? 's' : ''}` : ''; }
  const card = (p, ap) => `<button class="pp-card${ap ? ' apagado' : ''}" data-pp-sel="${esc(p.id)}" title="Abrir o cadastro">${avatar(p)}<span style="min-width:0"><span class="pp-nome">${esc(p.nome)}</span>${subLinha(p) ? `<span class="pp-sub" style="display:block">${esc(subLinha(p))}</span>` : ''}<span class="pp-chips">${chips(p, 6)}</span></span></button>`;
  const grade = (L, ap) => L.length ? `<div class="pp-grade">${L.map((p) => card(p, ap)).join('')}</div>` : '';
  const sec = (tit, sub, L, ap) => L.length ? `<h3 class="pp-sec">${tit} <span style="color:var(--muted)">(${L.length})</span>${sub ? `<span class="s">${sub}</span>` : ''}</h3>${grade(L, ap)}` : '';
  const vaiAoConteudo = () => setTimeout(() => { const el = document.getElementById('conteudo'); if (el) window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 8)); }, 40);
  const ordNome = (a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR');

  // ---------------------------------------------------------------- lista (aba Pessoas)
  function filtraLista() { const q = nrm(F.q); let L = vivas();
    if (F.fun) L = L.filter((p) => p.fun[F.fun]);
    if (q) L = L.filter((p) => nrm([...p.nomes].join(' ') + ' ' + ((p.ficha || {}).creci || '') + ' ' + ((p.ficha || {}).papel || '')).includes(q));
    if (F.g === 'duplicadas') L = L.filter((p) => (p.sugere || []).length);
    else if (F.g === 'incompletos') L = L.filter((p) => p.incompleto);
    else if (F.g !== 'todos') L = L.filter((p) => F.g === 'equipe' ? ['equipe', 'diretoria'].includes(p.cat) : p.cat === F.g);
    return L.sort(ordNome); }
  function render() {
    if (!H.carregado[CF] && !H.lista(CF).length) return '<h2>Pessoas</h2>' + H.vazio('Carregando o cadastro…');
    if (F.sel) { const p = pessoa(F.sel); if (p) return perfil(p); return '<div class="filtros"><button class="btn" data-pp-voltar="1">← Voltar à lista</button></div>' + H.vazio('Carregando o cadastro…'); } // registro recém-criado chega no próximo retrato do banco
    const T = vivas(); const n = (f) => T.filter(f).length; const fx = (p) => p.ficha || {};
    const at = T.filter((p) => p.cat === 'equipe' && p.ficha); const nEnt = n((p) => fx(p).situacao === 'em_entrada'), nSai = n((p) => fx(p).situacao === 'em_saida');
    const nDup = n((p) => (p.sugere || []).length); const nCli = n((p) => p.cat === 'clientes');
    const kp = (rot, num, sub, alvo, al) => `<button class="card" data-pp-g="${esc(alvo)}" aria-pressed="${F.g === alvo}" style="text-align:left;cursor:pointer;font:inherit;color:inherit${al ? ';border-color:var(--bad)' : ''}"><div class="nota" style="margin:0;text-transform:uppercase;letter-spacing:.12em;font-size:11px">${rot}</div><div style="font-size:26px;margin:4px 0">${num}</div><div class="nota" style="margin:0">${sub}</div></button>`;
    const cards = `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px">
      ${kp('Equipe', at.length, EQ.map((e) => `${e} ${at.filter((p) => fx(p).equipe === e).length}`).join(' · '), 'equipe')}
      ${kp('Diretoria', n((p) => p.cat === 'diretoria'), 'sócios e vinculados', 'diretoria')}
      ${kp('Clientes', nCli, 'proprietários, locação, vendas', 'clientes')}
      ${kp('Parceiros', n((p) => p.cat === 'parceiros'), 'corretores parceiros e externos', 'parceiros')}
      ${kp('Em entrada · saída', `${nEnt} · ${nSai}`, nSai ? 'acessos a revogar' : 'checklists', 'equipe', nSai > 0)}
      ${kp('Possíveis duplicadas', nDup, nDup ? 'confira e junte' : 'nenhuma', 'duplicadas', false)}
      ${kp('Nome incompleto', n((p) => p.incompleto), 'só o primeiro nome', 'incompletos', false)}</div>`;
    const bt = (v, t) => `<button class="btn" data-pp-g="${v}" aria-pressed="${F.g === v}">${t}</button>`;
    const cat = catalogo(); const usadas = [...new Set(T.flatMap((p) => Object.keys(p.fun)))].sort(ordFun);
    const selF = `<select id="pp-ffun" aria-label="Função" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;min-width:0;max-width:100%"><option value="">Todas as funções</option>${GRUPOS_F.map(([g, t]) => `<optgroup label="${esc(t)}">${usadas.filter((k) => (cat[k] || {}).g === g).map((k) => `<option value="${esc(k)}"${F.fun === k ? ' selected' : ''}>${esc(funNome(k))} (${T.filter((p) => p.fun[k]).length})</option>`).join('')}</optgroup>`).join('')}</select>`;
    const fm = cfg().formulario || {};
    const form = fm.link_curto ? `<details class="card" style="margin-bottom:14px"><summary style="cursor:pointer"><b>Formulário de cadastro da equipe</b> — prazo ${dt(fm.prazo)}</summary><p class="nota" style="margin:8px 0">Corretores e Diretoria respondem pelo link; a importação para as fichas é feita numa sessão com o Claude ("importa o formulário dos corretores"), com quadro antes → depois. CPF, RG, telefone, e-mail e endereço vão para os dados pessoais do perfil (só leitura); conta e PIX ficam só na planilha de respostas.</p><div class="filtros" style="margin:0"><a class="btn" href="${escUrl(fm.link_curto)}" target="_blank" rel="noopener">Abrir formulário</a>${fm.planilha_id ? `<a class="btn" href="https://docs.google.com/spreadsheets/d/${esc(fm.planilha_id)}/edit" target="_blank" rel="noopener" title="Planilha das respostas (aba Cadastro) — só abre na sua conta Google">Abrir respostas</a>` : ''}<button class="btn" data-pp-convite="1">Copiar convite para o WhatsApp</button></div></details>` : '';
    const topo = `<h2>Pessoas</h2><p class="nota">Cadastro único de cada pessoa: equipe, Diretoria, parceiros e clientes (PF e PJ), sempre pelo nome completo. Uma pessoa pode ter várias funções; clique no cartão para ver tudo o que a envolve. Clientes vêm das fontes — contratos lidos nas pastas (todas as partes, cônjuges, fiadores, procuradores, representantes e testemunhas), Imobibrasil, Carteira, Vendas e Institucional — nomes e vínculos. CPF, RG, telefones, e-mails e endereço ficam nos <b>Dados pessoais</b> do perfil, só leitura; conta bancária e PIX <b>não</b> ficam no HUB.</p>
      ${cards}${form}
      <div class="filtros">${bt('todos', 'Todos')}${bt('equipe', 'Equipe')}${bt('diretoria', 'Diretoria')}${bt('clientes', 'Clientes')}${bt('parceiros', 'Parceiros')}${bt('empresas', 'Empresas')}${bt('saiu', 'Saíram / fora')}${bt('duplicadas', 'Duplicadas?')}${bt('incompletos', 'Nome incompleto')}${selF}<input id="pp-fq" type="search" placeholder="Buscar nome, CRECI…" value="${esc(F.q)}" style="flex:1 1 180px;min-width:0;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit"><button class="btn" data-pp-novo="1" style="margin-left:auto">+ Nova pessoa</button></div>
      ${F.erro ? `<p style="color:var(--bad)">${esc(F.erro)}</p>` : ''}${F.novo ? formNovo() : ''}`;
    const L = filtraLista();
    // visão por seções (Todos/Equipe sem filtro de função nem busca); demais filtros = grade paginada
    if ((F.g === 'todos' || F.g === 'equipe') && !F.fun && !F.q) {
      const G = (c) => L.filter((p) => p.cat === c);
      const eq = G('equipe'); const N = eq.filter((p) => (p.ficha || {}).equipe === 'Norte'), LS = eq.filter((p) => (p.ficha || {}).equipe === 'Leste/Sul'), SE = eq.filter((p) => !['Norte', 'Leste/Sul'].includes((p.ficha || {}).equipe));
      const cli = G('clientes'); const POR = (H.buscaAba && H.buscaAba.ativa()) ? 1e9 : 48; const nPg = Math.max(1, Math.ceil(cli.length / POR)); if (F.pg > nPg - 1) F.pg = nPg - 1;
      const nav = cli.length > POR ? `<div class="pag"><button class="btn" data-pp-pg="-1" ${F.pg === 0 ? 'disabled' : ''} aria-label="Página anterior">&lt;</button><span>${F.pg * POR + 1}–${Math.min(cli.length, (F.pg + 1) * POR)} de ${cli.length}</span><button class="btn" data-pp-pg="1" ${F.pg >= nPg - 1 ? 'disabled' : ''} aria-label="Próxima página">&gt;</button></div>` : '';
      return `${topo}${sec('Diretoria', 'diretores (sócios) e vinculados — fora das equipes e das metas', G('diretoria').sort((a, b) => ((b.fun.diretor ? 1 : 0) - (a.fun.diretor ? 1 : 0)) || ordNome(a, b)))}
        <div class="pp-cols"><div>${sec('Equipe Norte — Jurerê', '', N)}</div><div>${sec('Equipe Leste/Sul — Porto da Lagoa', '', LS)}</div></div>${sec('Equipe sem região definida', '', SE)}
        ${sec('Parceiros', 'agenciam ou atendem pela Vivere sem competir nas metas', G('parceiros'))}
        ${F.g === 'todos' ? `${cli.length ? `<h3 class="pp-sec">Clientes <span style="color:var(--muted)">(${cli.length})</span><span class="s">proprietários, locadores, locatários, fiadores, compradores e vendedores</span></h3>${nav}${grade(cli.slice(F.pg * POR, (F.pg + 1) * POR))}${nav}` : ''}
        ${sec('Empresas e sócios do grupo', '', G('empresas'))}
        ${G('saiu').length ? `<details style="margin-top:14px"><summary class="pp-sec" style="cursor:pointer">Saíram e fora da equipe (${G('saiu').length})</summary>${grade(G('saiu'), true)}</details>` : ''}` : ''}`;
    }
    const POR = (H.buscaAba && H.buscaAba.ativa()) ? 1e9 : 60; const nPg = Math.max(1, Math.ceil(L.length / POR)); if (F.pg > nPg - 1) F.pg = nPg - 1;
    const nav = L.length > POR ? `<div class="pag"><button class="btn" data-pp-pg="-1" ${F.pg === 0 ? 'disabled' : ''} aria-label="Página anterior">&lt;</button><span>${F.pg * POR + 1}–${Math.min(L.length, (F.pg + 1) * POR)} de ${L.length}</span><button class="btn" data-pp-pg="1" ${F.pg >= nPg - 1 ? 'disabled' : ''} aria-label="Próxima página">&gt;</button></div>` : '';
    return `${topo}${L.length ? `<p class="nota">${L.length} pessoa${L.length > 1 ? 's' : ''}${F.fun ? ' com a função ' + esc(funNome(F.fun)) : ''}.</p>${nav}${grade(L.slice(F.pg * POR, (F.pg + 1) * POR), F.g === 'saiu')}${nav}` : H.vazio('Ninguém neste filtro.')}`;
  }

  // ---------------------------------------------------------------- perfil
  const lkImv = (it) => `<button class="pp-lk" data-pp-imv="${esc(it.imovel)}">${esc(it.txt)}</button>${it.ativo === false ? ' <span class="s" style="display:inline">inativo</span>' : ''}`;
  const lkCar = (it) => `<button class="pp-lk" data-pp-ir="carteira|car-${esc(it.cod)}">${esc(it.txt)}</button>`;
  const lkVen = (it) => `<button class="pp-lk" data-pp-ir="vendas|ven-${esc(it.venda)}">${esc(it.txt)}</button>`;
  const lkGen = (it) => it.aba ? `<button class="pp-lk" data-pp-ir="${esc(it.aba)}|">${esc(it.txt)}</button>` : esc(it.txt);
  const lkPc = (it) => `<button class="pp-lk" data-pp-pc="${esc(it.pc)}">${esc(it.txt)}</button>${it.papel_txt ? ` <span class="s" style="display:inline">${esc(it.papel_txt.toLowerCase())}</span>` : ''}`;
  function itemHTML(it) { return it.pc ? lkPc(it) : it.imovel ? lkImv(it) : it.cod ? lkCar(it) : it.venda ? lkVen(it) : lkGen(it); }
  function cardFun(p, k) { const c = catalogo()[k] || { nome: k, g: 'clientes', conceito: '' }; const L = (p.fun[k] || []).filter(Boolean); const x = p.ficha || {}; const C = (H.S.corretores || {})[p.id];
    let corpo = '';
    if (k === 'corretor' || k === 'parceiro_corretor' || k === 'fora_equipe') { const a = C && C.agenciamentos, l = C && C.leads;
      const ids = H.lista('imoveis').filter((i) => i.corretor && casaNome(i.corretor, Object.assign({ _id: p.id }, x.nome ? x : { nome: p.nome, nome_completo: p.nome }))).map((i) => i._id);
      corpo = `${x.equipe && !naDir(x) ? `<div class="s">Equipe ${esc(EQ_TXT[x.equipe] || x.equipe)}${x.creci ? ' · CRECI ' + esc(x.creci) : ''}</div>` : x.creci ? `<div class="s">CRECI ${esc(x.creci)}</div>` : ''}
        ${p.ficha ? `<div class="s">${x.compete_metas === false || naDir(x) || x.tipo === 'parceiro' ? 'Não compete nas metas' : 'Compete nas metas'}</div>` : ''}
        ${C ? `<div class="pp-num">
          <div><b>${a ? a.ativos : 0}<span style="font-size:13px;color:var(--muted)"> / ${a ? a.total : 0}</span></b><span>agenciamentos ativos / total${a && a.ultimo ? ' · último ' + dt(a.ultimo) : ''}</span>${ids.length ? `<br><button class="pp-lk" data-pp-imvs="${esc(p.id)}">ver imóveis</button>` : ''}</div>
          <div><b>${l ? l.total : 0}</b><span>leads recebidos${l ? ` · ${l.ult_30d || 0} em 30 dias` : ''}</span>${l && l.total ? `<br><button class="pp-lk" data-leadcor="${esc(p.id)}">ver leads</button>` : ''}</div>
          <div><b>${(C.locacoes || []).length}</b><span>locações ${esc((C.locacoes || []).join(', '))}</span></div>
          <div><b>${C.vendas || 0}</b><span>vendas (planilha)</span></div>
          <div><b>${C.lancamentos || 0}</b><span>lançamentos (Placar)</span></div>
          <div><b>${C.ranking && Number(C.ranking.pos) > 0 ? C.ranking.pos + 'º' : '—'}</b><span>Placar ${C.ranking ? esc(mesTxt(C.ranking.mes)) : ''}${C.ranking && C.ranking.pontos != null ? ' · ' + C.ranking.pontos + ' pts' : ''}</span></div></div>` : '<p class="s">Ainda sem números (entra na próxima atualização do HUB).</p>'}`;
    } else if (k === 'diretor') { corpo = `<div class="s">${x.homologa ? 'Homologa a equipe ' + esc(EQ_TXT[x.homologa] || x.homologa) : 'Diretoria'} · não compete nas metas</div>`;
    } else if (L.length) { corpo = `<ul>${L.slice(0, 40).map((it) => `<li>${itemHTML(it)}</li>`).join('')}${L.length > 40 ? `<li class="s">e mais ${L.length - 40}</li>` : ''}</ul>`; }
    else if (p.ficha && x.papel && ['juridico', 'gestor', 'marketing'].includes(k)) corpo = `<div class="s">${esc(x.papel)}</div>`;
    return `<div class="pp-fcard ${esc(c.g)}"><h3>${esc(c.nome)}${L.length > 1 ? ` <span class="pill">${L.length}</span>` : ''}</h3><div class="s" title="Conceito da função (aba Funções)">${esc(c.conceito || '')}</div>${corpo}</div>`; }
  // dados pessoais (16/11/2026, hub-vivere-dados-pessoais-fontes F4): pessoas_dados (fatias d0..dN, {p:{id:{nome,cpf,cnpj,rg,telefones,
  // emails,enderecos,fontes}}}), só leitura. Casa pelo id (n-<nome>), pelo id do proprietário no Imobibrasil e pelo nome completo.
  const FONTE_TXT = { contrato: 'contrato na pasta', imobibrasil: 'Imobibrasil', cadastro_corretores: 'formulário dos corretores', alude: 'Alude' };
  let PDX = { s: null, m: {}, n: {} };
  function pdIdx() { const S0 = (H.S && H.S.pessoas_dados) || {}; if (PDX.s !== S0) { const m = {}, n = {};
      Object.values(S0).forEach((d) => Object.assign(m, (d && d.p) || {}));
      Object.entries(m).forEach(([id, v]) => { const k = nrm(v && v.nome); if (k.includes(' ')) (n[k] = n[k] || []).push(id); });
      PDX = { s: S0, m, n }; } return PDX; }
  function dadosDe(p) { const X = pdIdx(), ids = new Set(); if (X.m[p.id]) ids.add(p.id);
    const ib = p.ib || ((/^ib-(.+)$/.exec(p.id || '') || [])[1]);
    if (ib) Object.entries(X.m).forEach(([id, v]) => { if ((v.fontes || []).some((f) => f && f.tipo === 'imobibrasil' && String(f.chave) === String(ib))) ids.add(id); });
    if (!ids.size) [p.nome, ...(p.nomes || [])].forEach((nm) => (X.n[nrm(nm)] || []).forEach((id) => ids.add(id))); // nome só sem id/ib
    return [...ids].map((id) => X.m[id]).filter(Boolean); }
  function cardDados(p) { const L = dadosDe(p); if (!L.length) return '';
    const uni = (k) => [...new Set(L.flatMap((v) => (Array.isArray(v[k]) ? v[k] : []).map(String)))];
    const fCpf = (c) => c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4'), fCnpj = (c) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    const fTel = (t) => t.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
    const lin = (r, v) => v ? `<div style="margin:3px 0"><span class="s" style="display:inline-block;min-width:80px">${r}</span> ${v}</div>` : '';
    const fontes = [...new Set(L.flatMap((v) => (v.fontes || []).map((f) => (FONTE_TXT[f && f.tipo] || (f && f.tipo) || 'fonte') + (f && Array.isArray(f.contratos) && f.contratos.length ? ' ' + f.contratos.join(', ') : ''))))];
    return `<details class="card" style="margin-top:14px"><summary style="cursor:pointer"><b>Dados pessoais</b> <span class="s" style="display:inline">CPF, RG, telefones, e-mails e endereço · só leitura</span></summary><div style="margin-top:8px">
      ${lin('CPF', uni('cpf').map((c) => esc(fCpf(c))).join(' · '))}${lin('CNPJ', uni('cnpj').map((c) => esc(fCnpj(c))).join(' · '))}${lin('RG', uni('rg').map(esc).join(' · '))}
      ${lin('Telefone', uni('telefones').map((t) => `<a href="${escUrl('https://wa.me/55' + t)}" target="_blank" rel="noopener">${esc(fTel(t))}</a>`).join(' · '))}
      ${lin('E-mail', uni('emails').map((e) => `<a href="${escUrl('mailto:' + e)}">${esc(e)}</a>`).join(' · '))}
      ${lin('Endereço', uni('enderecos').map(esc).join('<br>'))}
      ${uni('cpf').length + uni('cnpj').length > 1 ? '<div style="margin:6px 0 0;color:var(--warn)">Mais de um documento: possíveis homônimos — conferir antes de usar.</div>' : ''}<div class="s" style="margin-top:6px">Fontes: ${esc(fontes.join(' · ') || '—')}${L.length > 1 ? ` · ${L.length} cadastros juntados (mesmo nome ou mesmo proprietário)` : ''}</div></div></details>`; }
  function perfil(p) {
    const x = p.ficha; const ed = F.edit && H.db();
    const pasta = x && x.pasta ? `<a class="btn pasta" href="abrirpasta:${encodeURIComponent(x.pasta)}" target="_blank" rel="noopener" data-abrir-pasta="${esc(x.pasta)}" title="Abre a pasta da pessoa no Explorador e copia o caminho">Abrir pasta</a>` : '';
    const acoes = H.db() ? (x ? (ed ? `<button class="btn" data-pp-salvar="${esc(p.id)}">Salvar</button><button class="btn" data-pp-edit="0">Cancelar</button>` : `<button class="btn" data-pp-edit="1">Editar ficha</button>${x.situacao === 'em_entrada' && checkStat(x, 'checklist_entrada').feitos === checkStat(x, 'checklist_entrada').total ? `<button class="btn" data-pp-mudar="ativo">Concluir entrada</button>` : ''}${!['em_saida', 'saiu'].includes(x.situacao) ? `<button class="btn" data-pp-mudar="em_saida">Registrar saída</button>` : ''}${x.situacao === 'em_saida' ? `<button class="btn" data-pp-mudar="saiu">Concluir saída</button>` : ''}`) : '') : '';
    const funs = funcoesDe(p);
    const cab = `<div class="filtros" style="margin-bottom:10px"><button class="btn" data-pp-voltar="1">← Voltar à lista</button></div>
      <div class="card" id="pp-perfil" style="border-color:var(--accent)"><div class="pp-topo">${avatar(p, true)}<div style="flex:1;min-width:200px"><h2 style="margin:0;font-size:16px;letter-spacing:.08em">${esc(p.nome)}</h2>
        <div class="pp-chips" style="margin-top:6px">${chips(p)}</div>${p.profissao && !x ? `<div class="s" style="margin-top:4px">Profissão (nos contratos): ${esc(p.profissao)}</div>` : ''}${[...p.nomes].filter((n) => n !== p.nome).length ? `<div class="s" style="margin-top:4px">Também aparece como: ${esc([...p.nomes].filter((n) => n !== p.nome).join(' · '))}</div>` : ''}</div>
        <div class="filtros" style="margin:0">${pasta}${acoes}</div></div>${F.erro ? `<p style="color:var(--bad);margin:8px 0 0">${esc(F.erro)}</p>` : ''}</div>`;
    const fun = `<h3 class="pp-sec">Funções <span style="color:var(--muted)">(${funs.length})</span><span class="s">um card por função; conceitos na aba Funções</span></h3><div class="pp-fun">${funs.map((k) => cardFun(p, k)).join('')}</div>`;
    const sug = (p.sugere || []).map((id) => pessoa(id)).filter((q) => q && q.id !== p.id);
    const dup = sug.length && H.db() ? `<div class="card" style="margin-top:14px;border-color:var(--warn)"><h2 style="margin:0 0 6px">Possível mesma pessoa</h2><p class="nota" style="margin:0 0 8px">Nomes iguais ou parecidos em outro cadastro. Juntar soma as funções no cadastro de ${esc(p.nome)}; a decisão fica gravada e não volta a ser sugerida.</p>${sug.map((q) => `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0">${avatar(q)}<button class="pp-lk" data-pp-sel="${esc(q.id)}">${esc(q.nome)}</button><span class="pp-chips" style="margin:0">${chips(q, 4)}</span><button class="btn" data-pp-juntar="${esc(q.id)}|${esc(p.id)}">Juntar aqui</button><button class="btn" data-pp-naojuntar="${esc(q.id)}|${esc(p.id)}">Não é a mesma</button></div>`).join('')}</div>` : '';
    const aut = (p.auto || []).filter((z) => P0(z.id)); const autoH = aut.length ? `<div class="card" style="margin-top:14px"><h2 style="margin:0 0 6px">Juntados automaticamente</h2><p class="nota" style="margin:0 0 8px">Mesmo primeiro nome e sobrenome em comum: o HUB tratou como a mesma pessoa e ficou com o nome mais completo. Se não for, clique em "Separar" (a decisão fica gravada).</p>${aut.map((z) => `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0"><span>${esc(z.nome)}</span>${H.db() ? `<button class="btn" data-pp-separar="${esc(p.id)}|${esc(z.id)}">Separar</button>` : ''}</div>`).join('')}</div>` : '';
    const obsCli = !x ? `<div class="card" style="margin-top:14px"><h2 style="margin:0 0 6px">Observações</h2>${H.db() ? `<textarea id="pp-obs" rows="2" style="width:100%;box-sizing:border-box;font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink)" placeholder="Sem dados pessoais (CPF, telefone, e-mail, conta)">${esc(F.draft.obs != null ? F.draft.obs : (p.obs || ''))}</textarea><div class="filtros" style="margin:6px 0 0"><button class="btn" data-pp-obs="${esc(p.id)}">Salvar observação</button>${p.manual ? '' : `<button class="btn" data-pp-juntarbusca="1">Juntar com outro cadastro…</button>`}</div>${F.junta === p.id ? juntarBusca(p) : ''}` : `<p class="nota">${esc(p.obs || '—')}</p>`}</div>` : '';
    return `${cab}${cardDados(p)}${fun}${dup}${autoH}${obsCli}${x ? fichaEquipe(Object.assign({ _id: p.id }, x), ed) : ''}`;
  }
  function juntarBusca(p) { const q = nrm(F.draft.junta || ''); const L = q.length < 2 ? [] : vivas().filter((o) => o.id !== p.id && nrm([...o.nomes].join(' ')).includes(q)).slice(0, 8);
    return `<div style="margin-top:8px"><input id="pp-junta" type="search" value="${esc(F.draft.junta || '')}" placeholder="Digite o nome do outro cadastro…" style="width:100%;box-sizing:border-box;font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink)">
      ${L.map((o) => `<div style="display:flex;gap:8px;align-items:center;margin:4px 0">${esc(o.nome)}<span class="pp-chips" style="margin:0">${chips(o, 3)}</span><button class="btn" data-pp-juntar="${esc(p.id)}|${esc(o.id)}" title="Este cadastro passa a fazer parte de ${esc(o.nome)}">Juntar em ${esc(o.nome)}</button></div>`).join('')}</div>`; }

  // ficha da equipe (mesma do antigo Cadastro, com homologa e compete nas metas)
  const dv = (k, v) => (k in F.draft ? F.draft[k] : (v == null ? '' : v));
  const st = 'padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;width:100%;box-sizing:border-box';
  const inp = (k, v, ph, tipo) => `<input id="pp-e-${k}" data-pp-campo="${k}" ${tipo ? `type="${tipo}"` : ''} value="${esc(dv(k, v))}" placeholder="${esc(ph || '')}" style="${st}">`;
  const sel = (k, v, ops) => `<select id="pp-e-${k}" data-pp-campo="${k}" style="${st}">${ops.map(([o, t]) => `<option value="${esc(o)}"${String(dv(k, v)) === o ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const lab = (t, html) => `<label class="nota" style="margin:0">${t}<br>${html}</label>`;
  const val = (k) => { const el = document.getElementById('pp-e-' + k); return el ? el.value.trim() : (k in F.draft ? String(F.draft[k]).trim() : ''); };
  function fichaEquipe(x, ed) {
    const raiz = cfg().pastas_raiz || '';
    const dados = ed ? `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
        ${lab('Nome completo', inp('nome_completo', x.nome_completo))}${lab('Nome curto', inp('nome', x.nome))}
        ${lab('Apelidos / grafias nas planilhas (separe por vírgula)', inp('apelidos', (x.apelidos || []).join(', ')))}
        ${lab('Vínculo', sel('vinculo', x.vinculo || '', [['', 'Equipe de corretores'], ['diretoria', 'Diretoria']]))}${lab('Tipo (equipe de corretores)', sel('tipo', naDir(x) ? 'corretor' : (x.tipo || 'corretor'), TIPO_EQ))}
        ${lab('Funções na Vivere (marque todas)', `<span style="display:flex;flex-wrap:wrap;gap:4px 12px;padding:4px 0">${clsL().map(([k, t]) => { const on = ('cls_' + k) in F.draft ? F.draft['cls_' + k] : (x.classes || []).includes(k); return `<label style="display:inline-flex;gap:4px;align-items:center;color:var(--ink)"><input type="checkbox" id="pp-e-cls-${esc(k)}" data-pp-cls="${esc(k)}"${on ? ' checked' : ''}>${esc(t)}</label>`; }).join('')}</span>`)}
        ${lab('Homologa a equipe', sel('homologa', x.homologa || '', [['', '—']].concat(EQ.map((e) => [e, EQ_TXT[e]]))))}
        ${lab('Compete nas metas', sel('compete_metas', x.compete_metas === false ? 'nao' : 'sim', [['sim', 'Sim'], ['nao', 'Não']]))}
        ${lab('Equipe', sel('equipe', x.equipe || '', [['', '—']].concat(EQ.map((e) => [e, EQ_TXT[e]]))))}
        ${lab('Situação', sel('situacao', x.situacao || 'ativo', Object.entries(SIT).map(([k, v]) => [k, v[0]])))}
        ${lab('CRECI', inp('creci', x.creci))}${lab('Entrada (AAAA-MM ou data)', inp('entrada', x.entrada))}${lab('Saída (AAAA-MM ou data)', inp('saida', x.saida))}
        ${lab('Motivo da saída', inp('saida_motivo', x.saida_motivo))}${lab('Pasta no PC', inp('pasta', x.pasta, raiz ? raiz + '\\Nome' : ''))}${lab('Descrição do papel (texto livre)', inp('papel', x.papel, 'Ex.: Operação do Imobibrasil'))}</div>
        ${lab('Observações (sem dados pessoais)', `<textarea id="pp-e-obs" data-pp-campo="obs" rows="2" style="${st}">${esc(dv('obs', x.obs))}</textarea>`)}`
      : `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px 14px;font-size:13px">
        <div><span class="s" style="display:block">Nome completo</span>${esc(x.nome_completo || '—')}</div><div><span class="s" style="display:block">Equipe</span>${esc(naDir(x) ? 'Diretoria' : (EQ_TXT[x.equipe] || x.equipe || '—'))}</div>
        <div><span class="s" style="display:block">Vínculo · tipo</span>${naDir(x) ? 'Diretoria · ' : ''}${esc(TIPO[x.tipo] || '—')}</div><div><span class="s" style="display:block">Situação</span>${pill(SIT, x.situacao)}</div><div><span class="s" style="display:block">CRECI</span>${esc(x.creci || '—')}</div>
        <div><span class="s" style="display:block">Entrada · saída</span>${esc(x.entrada || '—')}${x.saida ? ' · ' + esc(x.saida) : ''}${x.saida_motivo ? ` (${esc(x.saida_motivo)})` : ''}</div>
        <div><span class="s" style="display:block">Apelidos nas planilhas</span>${esc((x.apelidos || []).join(', ') || '—')}</div><div><span class="s" style="display:block">Descrição do papel</span>${esc(x.papel || '—')}</div></div>${x.obs ? `<p class="nota" style="margin:8px 0 0">${esc(x.obs)}</p>` : ''}`;
    const blocoSel = (tit, k, L, M) => `<div class="card"><h2 style="margin:0 0 8px">${tit}</h2>${L.map(([i, t]) => { const v = (x[k] || {})[i] || '';
      return `<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin:4px 0"><span>${esc(t)}</span><select data-pp-sel3="${k}|${esc(i)}" aria-label="${esc(t)}" style="padding:3px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;font-size:12px"${H.db() ? '' : ' disabled'}><option value="">—</option>${Object.entries(M).map(([o, z]) => `<option value="${o}"${v === o ? ' selected' : ''}>${esc(z[0])}</option>`).join('')}</select></div>`; }).join('')}</div>`;
    const blocoCheck = (tit, k, L) => { const s = checkStat(x, k); return `<div class="card"><h2 style="margin:0 0 8px">${tit} <span class="pill ${s.feitos === s.total ? 'ok' : 'warn'}">${s.feitos}/${s.total}</span></h2>${L.map(([i, t]) => { const c = (x[k] || {})[i] || {};
      const ic = c.st === 'feito' ? '☑' : c.st === 'na' ? '–' : '☐';
      return `<div style="display:flex;gap:8px;align-items:flex-start;margin:4px 0"><button class="btn" data-pp-ck="${k}|${esc(i)}" title="Clique: feito → não se aplica → em aberto" style="min-width:28px;text-align:center"${H.db() ? '' : ' disabled'}>${ic}</button><span style="flex:1">${esc(t)}${c.em ? `<span class="s">${c.st === 'na' ? 'não se aplica' : 'feito'} em ${dt(c.em)}</span>` : ''}</span></div>`; }).join('')}</div>`; };
    const metas = PER.map(([p, tit]) => { const m = (x.metas || {})[p] || {}; const r = p === '2026' ? realizado(x, m.desde || '', '2026-12-31') : null;
      const campos = ed ? `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">${METAS.map(([k, t, tp]) => lab(t, inp(`m${p}_${k}`, m[k], tp === 't' ? 'texto livre' : '', tp === 't' ? '' : 'number'))).join('')}${lab('Vale a partir de', inp(`m${p}_desde`, m.desde, '', 'date'))}</div>${lab('Observação', inp(`m${p}_obs`, m.obs, p === '2026' ? 'Ex.: definida na reunião de Jurerê (16/10)' : ''))}`
        : (METAS.some(([k]) => m[k]) ? `<table style="font-size:13px"><tbody>${METAS.map(([k, t, tp]) => m[k] ? `<tr><td>${esc(t)}</td><td class="n"><b>${tp === 'r' ? brl0(m[k]) : esc(m[k])}</b></td><td class="n">${r && tp !== 't' ? `realizado ${tp === 'r' ? brl0(r[k]) : r[k]}` : ''}</td></tr>` : '').join('')}</tbody></table>${m.desde ? `<p class="nota" style="margin:4px 0 0">Conta a partir de ${dt(m.desde)}.${m.obs ? ' ' + esc(m.obs) : ''}</p>` : (m.obs ? `<p class="nota" style="margin:4px 0 0">${esc(m.obs)}</p>` : '')}` : '<p class="nota" style="margin:0">Sem meta registrada.</p>');
      return `<div class="card"><h2 style="margin:0 0 8px">${esc(tit)}</h2>${campos}</div>`; }).join('');
    const saida = x.situacao === 'em_saida' || x.situacao === 'saiu';
    return `<h3 class="pp-sec">Ficha da equipe<span class="s">fonte do cadastro dos corretores</span></h3><div class="card">${dados}</div>
      <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:12px">
        ${blocoSel('Acessos', 'acessos', itens('acessos'), ST_AC)}${blocoSel('Documentos', 'documentos', itens('documentos'), ST_DOC)}
        ${blocoCheck('Checklist de entrada', 'checklist_entrada', itens('entrada'))}${saida ? blocoCheck('Checklist de saída', 'checklist_saida', itens('saida')) : ''}</div>
      <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:12px">${metas}</div>
      ${(x.historico || []).length ? `<details style="margin-top:10px"><summary class="s" style="cursor:pointer">Histórico (${x.historico.length})</summary><ul style="margin:6px 0 0 16px;padding:0">${x.historico.slice(-15).reverse().map((h) => `<li class="s">${dt(h.em)} — ${esc(h.o_que)}</li>`).join('')}</ul></details>` : ''}`;
  }
  function formNovo() {
    const v = dv('n_vinculo', 'corretor'); const eq = ['corretor', 'diretoria', 'parceiro_corretor'].includes(v);
    return `<div class="card" style="margin-bottom:14px"><h2 style="margin:0 0 6px">Nova pessoa</h2><p class="nota">Equipe (corretor, Diretoria, corretor parceiro) nasce na ficha do cadastro, em "Em entrada", com o checklist. Parceiro externo, contato de construtora e CLT ficam em Pessoas. Clientes não precisam ser criados: entram sozinhos pelas fontes. Só dados profissionais — documentos pessoais vão para a pasta da pessoa no PC.</p>
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
      ${lab('Vínculo', sel('n_vinculo', v, VINC_NOVO))}${lab('Nome completo', inp('n_nome_completo', '', 'Ex.: Fernanda Carvalho'))}${lab('Como é chamado (nome curto)', inp('n_nome', '', 'Ex.: Fernanda C.'))}
      ${eq ? `${lab('Equipe', sel('n_equipe', '', [['', '—']].concat(EQ.map((e) => [e, EQ_TXT[e]]))))}${lab('CRECI (número)', inp('n_creci', '', 'Ex.: 12.345'))}${lab('Data de entrada', inp('n_entrada', H.hojeISO(), '', 'date'))}` : `${lab('Empresa / área', inp('n_empresa', '', 'Ex.: Construtora X, fotografia'))}${lab('Pessoa jurídica?', sel('n_pj', 'nao', [['nao', 'Não (PF)'], ['sim', 'Sim (PJ)']]))}`}</div>
    ${F.erro ? `<p style="color:var(--bad);margin:8px 0 0">${esc(F.erro)}</p>` : ''}
    <div class="filtros" style="margin:10px 0 0"><button class="btn" data-pp-criar="1">Criar</button><button class="btn" data-pp-novo="0">Cancelar</button></div></div>`;
  }

  // ---------------------------------------------------------------- aba Funções
  function renderFun() { const cat = catalogo(); const T = vivas(); const db = H.db();
    const cartao = (c) => { const n = T.filter((p) => p.fun[c.k]).length; const ed = F.fEdit === c.k && db;
      return `<div class="pp-fcard ${esc(c.g)}"><h3>${esc(c.nome)} <span class="pill">${n}</span>${c.revisar ? ' <span class="pill warn" title="Conceito escrito pelo Claude; revise e salve">a revisar</span>' : ''}</h3>
        ${ed ? `<label class="nota" style="margin:0">Conceito<br><textarea id="pp-fc-conceito" rows="3" style="${st}">${esc(F.draft.fc_conceito != null ? F.draft.fc_conceito : c.conceito || '')}</textarea></label><label class="nota" style="margin:6px 0 0;display:block">O que esperar desta função<br><textarea id="pp-fc-esperar" rows="4" style="${st}" placeholder="Responsabilidades, entregas, rotina, metas…">${esc(F.draft.fc_esperar != null ? F.draft.fc_esperar : c.o_que_esperar || '')}</textarea></label><div class="filtros" style="margin:6px 0 0"><button class="btn" data-pp-fsalvar="${esc(c.k)}">Salvar</button><button class="btn" data-pp-fedit="">Cancelar</button></div>`
        : `<div class="s">${esc(c.conceito || '—')}</div><p style="margin:8px 0 0;font-size:13px"><b>O que esperar:</b> ${c.o_que_esperar ? esc(c.o_que_esperar) : '<span class="s" style="display:inline">a definir</span>'}</p><div class="filtros" style="margin:8px 0 0">${n ? `<button class="btn" data-pp-verfun="${esc(c.k)}">Ver pessoas (${n})</button>` : ''}${db ? `<button class="btn" data-pp-fedit="${esc(c.k)}">Editar</button>` : ''}</div>`}</div>`; };
    return `<h2>Funções</h2><p class="nota">Catálogo das funções que uma pessoa pode ter na Vivere — uma pessoa acumula várias, e cada uma vira um card no perfil dela (Cadastros › Pessoas). "O que esperar" é o espaço para descrever responsabilidades e entregas de cada função. As funções da equipe são marcadas na ficha; as de clientes vêm das fontes.</p>
      ${F.erro ? `<p style="color:var(--bad)">${esc(F.erro)}</p>` : ''}
      ${GRUPOS_F.map(([g, t]) => { const L = Object.values(cat).filter((c) => c.g === g).sort((a, b) => ordFun(a.k, b.k)); return L.length ? `<h3 class="pp-sec">${esc(t)}</h3><div class="pp-fun">${L.map(cartao).join('')}</div>` : ''; }).join('')}`; }

  // ---------------------------------------------------------------- ações
  async function salvar(id) { const x = (H.S[CF] || {})[id] || {}; F.erro = '';
    const c = {}; ['nome_completo', 'nome', 'vinculo', 'tipo', 'papel', 'equipe', 'situacao', 'creci', 'entrada', 'saida', 'saida_motivo', 'pasta', 'obs', 'homologa'].forEach((k) => { c[k] = val(k); });
    c.compete_metas = val('compete_metas') !== 'nao';
    c.apelidos = val('apelidos').split(',').map((s) => s.trim()).filter(Boolean);
    c.classes = clsL().filter(([k]) => { const el = document.getElementById('pp-e-cls-' + k); return el ? el.checked : ('cls_' + k) in F.draft ? !!F.draft['cls_' + k] : (x.classes || []).includes(k); }).map((z) => z[0]);
    if (c.vinculo === 'diretoria') c.tipo = c.classes.includes('diretor') ? 'diretor' : 'vinculado';
    if (!c.nome_completo && !c.nome) { F.erro = 'Informe ao menos o nome.'; H.pede(); return; }
    const metas = Object.assign({}, x.metas || {}); PER.forEach(([p]) => { const m = {}; METAS.concat([['desde'], ['obs']]).forEach(([k, , tp]) => { const v = val(`m${p}_${k}`); if (v !== '') m[k] = tp === 'n' || tp === 'r' ? Number(v) : v; });
      if (Object.keys(m).length) metas[p] = Object.assign({ definida_em: (x.metas && x.metas[p] && x.metas[p].definida_em) || H.hojeISO() }, m); else delete metas[p]; });
    c.metas = metas;
    const pad = (k) => k === 'apelidos' || k === 'classes' ? [] : k === 'metas' ? {} : k === 'compete_metas' ? true : '';
    const mud = Object.keys(c).filter((k) => JSON.stringify(c[k] ?? '') !== JSON.stringify(x[k] ?? pad(k)));
    if (!mud.length) { F.edit = false; F.draft = {}; H.pede(); return; }
    if (await grava(CF, id, c, 'editado: ' + mud.join(', '))) { F.edit = false; F.draft = {}; H.pede(); } }
  async function criar() { F.erro = ''; const v = val('n_vinculo') || 'corretor'; const nc = val('n_nome_completo'), nm = val('n_nome') || nc;
    if (!nc) { F.erro = 'Informe o nome completo.'; H.pede(); return; }
    if (['corretor', 'diretoria', 'parceiro_corretor'].includes(v)) {
      const usados = new Set(Object.keys(H.S[CF] || {}).concat(Object.keys(H.S.corretores || {})).concat(Object.keys(H.params().corretores_info || {})));
      let id = slug(nc.split(/\s+/)[0]); if (usados.has(id)) id = slug(nc); let k = 2; const b = id; while (usados.has(id)) id = b + '-' + (k++);
      const dir = v === 'diretoria'; const tp = dir ? 'vinculado' : v === 'parceiro_corretor' ? 'parceiro' : 'corretor'; const raizP = (dir ? cfg().pastas_diretoria : cfg().pastas_raiz) || '';
      const ok = await grava(CF, id, { nome: nm, nome_completo: nc, nome_fonte: 'cadastro no HUB (Pessoas)', apelidos: [], tipo: tp, vinculo: dir ? 'diretoria' : '', classes: tp === 'corretor' ? ['corretor'] : [], papel: '', equipe: val('n_equipe'), situacao: 'em_entrada', entrada: val('n_entrada') || H.hojeISO(), saida: '', creci: val('n_creci'), pasta: raizP ? raizP + '\\' + nc : '', obs: '', acessos: {}, documentos: {}, checklist_entrada: {}, checklist_saida: {}, metas: {}, compete_metas: tp === 'corretor' }, 'ficha criada', true);
      if (ok) { F.novo = false; F.draft = {}; F.sel = id; F.edit = false; H.pede(); } return; }
    let id = 'm-' + slug(nc); let k = 2; const b = id; while ((H.S[PF] || {})[id]) id = b + '-' + (k++);
    const ok = await grava(PF, id, { manual: true, nome: nm, nome_completo: nc, funcoes: [v], empresa: val('n_empresa'), pj: val('n_pj') === 'sim', obs: '' }, 'pessoa criada', true);
    if (ok) { F.novo = false; F.draft = {}; F.sel = id; H.pede(); } }
  async function mudar(id, para) { const x = (H.S[CF] || {})[id] || {}; const c = { situacao: para };
    if (para === 'em_saida') { if (!confirm(`Registrar a saída de ${nomeDe(x)}? Abre o checklist de saída.`)) return; c.saida = H.hojeISO(); }
    if (para === 'saiu') { const s = checkStat(Object.assign({ _id: id }, x), 'checklist_saida'); if (s.feitos < s.total && !confirm(`Ainda falta ${s.total - s.feitos} item(ns) do checklist de saída. Concluir mesmo assim?`)) return; }
    await grava(CF, id, c, 'situação: ' + (SIT[para] || [para])[0]); }
  async function ciclo(id, k, i) { const x = (H.S[CF] || {})[id] || {}; const C = Object.assign({}, x[k] || {}); const cur = (C[i] || {}).st;
    const nx = cur === 'feito' ? 'na' : cur === 'na' ? '' : 'feito'; if (nx) C[i] = { st: nx, em: H.hojeISO() }; else delete C[i];
    const L = itens(k === 'checklist_saida' ? 'saida' : 'entrada'); const t = (L.find((z) => z[0] === i) || [i, i])[1];
    await grava(CF, id, { [k]: C }, `${k === 'checklist_saida' ? 'saída' : 'entrada'}: ${t} → ${nx === 'feito' ? 'feito' : nx === 'na' ? 'não se aplica' : 'em aberto'}`); }
  async function sel3(id, k, i, v) { const x = (H.S[CF] || {})[id] || {}; const C = Object.assign({}, x[k] || {}); if (v) C[i] = v; else delete C[i];
    const L = itens(k); const t = (L.find((z) => z[0] === i) || [i, i])[1]; await grava(CF, id, { [k]: C }, `${k === 'acessos' ? 'acesso' : 'documento'}: ${t} → ${v ? ((k === 'acessos' ? ST_AC : ST_DOC)[v] || [v])[0] : '—'}`); }
  async function juntar(de, em) { const a = pessoa(de), b = pessoa(em); if (!a || !b || a.id === b.id) return;
    if (a.ficha) { F.erro = 'Uma ficha da equipe não pode ser juntada dentro de outro cadastro; junte o outro cadastro nela.'; H.pede(); return; }
    if (!confirm(`Juntar "${a.nome}" em "${b.nome}"? As funções passam para ${b.nome}.`)) return;
    if (await grava(PF, a.id, { juntar_em: b.id }, `juntado em ${b.id} (${b.nome})`)) { F.sel = b.id; F.junta = ''; F.draft = {}; H.pede(); } }
  async function naoJuntar(a, b) { const x = (H.S[PF] || {})[a] || {}; const L = [...new Set((x.nao_juntar || []).concat([b]))];
    await grava(PF, a, { nao_juntar: L }, `não é a mesma pessoa que ${b}`); }

  // ---------------------------------------------------------------- registro e eventos (prefixo data-pp-)
  H.registrar({ id: ID, aba: 'Pessoas', grupo: 'cadastros', colecoes: [CF, CG, PF, FN, 'institucional_empresas', PC],
    tipos: { cc_entrada: 'Cadastro — entrada parada', cc_saida: 'Cadastro — saída com acessos', cc_ficha: 'Cadastro — ficha incompleta' },
    render, foco(alvo) { if (alvo) { F.sel = alvo; F.edit = false; F.draft = {}; F.erro = ''; F.junta = ''; vaiAoConteudo(); } },
    busca(q) { const t = nrm(q); if (t.length < 2) return [];
      return vivas().filter((p) => nrm([...p.nomes].join(' ')).includes(t)).sort((a, b) => (a.ficha ? 0 : 1) - (b.ficha ? 0 : 1) || (nrm(a.nome).startsWith(t) ? 0 : 1) - (nrm(b.nome).startsWith(t) ? 0 : 1) || ordNome(a, b)).slice(0, 8)
        .map((p) => ({ grp: 'Pessoas', tit: p.nome + (p.pj ? ' (PJ)' : ''), sub: funcoesDe(p).map(funNome).join(' · '), pessoa: p.id })); } });
  H.registrar({ id: IDF, aba: 'Funções', grupo: 'cadastros', colecoes: [FN], render: renderFun });
  document.addEventListener('click', async (e) => {
    const t = (s) => e.target.closest('[data-pp-' + s + ']'); let b;
    if ((b = t('g'))) { F.g = b.dataset.ppG; F.pg = 0; F.sel = ''; H.pede(); return; }
    if ((b = t('pg'))) { if (b.disabled) return; F.pg = Math.max(0, F.pg + Number(b.dataset.ppPg)); H.pede(); return; }
    if ((b = t('sel'))) { if (!F.sel) F.y = window.scrollY; F.sel = b.dataset.ppSel; F.edit = false; F.draft = {}; F.erro = ''; F.junta = ''; H.pede(); vaiAoConteudo(); return; }
    if ((b = t('voltar'))) { F.sel = ''; F.edit = false; F.draft = {}; F.erro = ''; H.pede(); const y = F.y; setTimeout(() => window.scrollTo(0, y), 40); return; }
    if ((b = t('convite'))) { const fm = cfg().formulario || {}; H.copiaTexto(`Olá! Para atualizar o seu cadastro na Vivere, preencha este formulário até sexta, ${dt(fm.prazo)}: ${fm.link_curto}\nLeva uns 5 minutos. Obrigado!`, b); return; }
    if ((b = t('edit'))) { F.edit = b.dataset.ppEdit === '1'; F.draft = {}; F.erro = ''; H.pede(); return; }
    if ((b = t('novo'))) { F.novo = b.dataset.ppNovo === '1'; F.sel = ''; F.draft = {}; F.erro = ''; H.pede(); return; }
    if ((b = t('criar'))) { b.disabled = true; await criar(); return; }
    if ((b = t('salvar'))) { b.disabled = true; await salvar(b.dataset.ppSalvar); return; }
    if ((b = t('mudar'))) { await mudar(F.sel, b.dataset.ppMudar); return; }
    if ((b = t('ck'))) { const [k, i] = b.dataset.ppCk.split('|'); b.disabled = true; await ciclo(F.sel, k, i); return; }
    if ((b = t('imv'))) { const x = (H.S.imoveis || {})[b.dataset.ppImv] || {}; H.abrirImovel([b.dataset.ppImv], 'Imóvel ' + (x.ref || '')); return; }
    if ((b = t('imvs'))) { const p = pessoa(b.dataset.ppImvs); const x = (p && p.ficha) || { nome: p.nome, nome_completo: p.nome };
      const ids = H.lista('imoveis').filter((i) => i.corretor && casaNome(i.corretor, Object.assign({ _id: p.id }, x))).map((i) => i._id); H.abrirImovel(ids, 'Imóveis agenciados por ' + p.nome); return; }
    if ((b = t('ir'))) { const [aba, linha] = b.dataset.ppIr.split('|'); H.irPara(aba, linha || ''); return; }
    if ((b = t('pc'))) { const d = (H.S[PC] || {})[b.dataset.ppPc] || {}; const M = window.HUB_IMOVEIS; const u = M && M.id ? M.id({ fonte: 'pc', id: b.dataset.ppPc, n: 0 }) || (d.cod ? M.id({ fonte: 'contrato', cod: d.cod }) : '') : '';
      if (u && H.abrirUnidade) { H.abrirUnidade(u); return; } if (d.cod) { H.irPara('carteira', 'car-' + d.cod); return; } H.irPara('documentos', ''); return; }
    if ((b = t('obs'))) { const el = document.getElementById('pp-obs'); const v = el ? el.value.trim() : ''; b.disabled = true; if (await grava(PF, b.dataset.ppObs, { obs: v }, 'observação')) { F.draft = {}; H.pede(); } return; }
    if ((b = t('juntarbusca'))) { F.junta = F.junta ? '' : F.sel; F.draft.junta = ''; H.pede(); setTimeout(() => { const el = document.getElementById('pp-junta'); if (el) el.focus(); }, 40); return; }
    if ((b = t('juntar'))) { const [de, em] = b.dataset.ppJuntar.split('|'); await juntar(de, em); return; }
    if ((b = t('separar'))) { const [a, c] = b.dataset.ppSeparar.split('|'); b.disabled = true; await naoJuntar(a, c); H.pede(); return; }
    if ((b = t('naojuntar'))) { const [a, c] = b.dataset.ppNaojuntar.split('|'); await naoJuntar(c, a); return; }
    if ((b = t('verfun'))) { F.fun = b.dataset.ppVerfun; F.g = 'todos'; F.sel = ''; F.pg = 0; H.irPara('pessoas', ''); return; }
    if ((b = t('fedit'))) { F.fEdit = b.dataset.ppFedit; F.draft = {}; F.erro = ''; H.pede(); return; }
    if ((b = t('fsalvar'))) { const k = b.dataset.ppFsalvar; const c = catalogo()[k] || {}; const db = H.db(); if (!db) return;
      const conceito = (document.getElementById('pp-fc-conceito') || {}).value || '', esperar = (document.getElementById('pp-fc-esperar') || {}).value || '';
      if (sensivel({ conceito, esperar })) { F.erro = 'Texto com cara de dado pessoal; não salvo.'; H.pede(); return; }
      b.disabled = true; try { await db.doc(FN + '/' + k).set({ nome: c.nome, g: c.g, conceito: conceito.trim(), o_que_esperar: esperar.trim(), atualizado_em: H.hojeISO() }); F.fEdit = ''; F.draft = {}; F.erro = ''; } catch (err) { F.erro = 'Não foi possível salvar: ' + (err && err.message || err); } H.pede(); return; }
  });
  document.addEventListener('change', async (e) => { const el = e.target; if (!el) return;
    if (el.id === 'pp-ffun') { F.fun = el.value; F.pg = 0; H.pede(); return; }
    if (el.dataset && el.dataset.ppCls) { F.draft['cls_' + el.dataset.ppCls] = el.checked; return; }
    if (el.dataset && el.dataset.ppSel3) { const [k, i] = el.dataset.ppSel3.split('|'); await sel3(F.sel, k, i, el.value); return; }
    if (el.dataset && el.dataset.ppCampo) { F.draft[el.dataset.ppCampo] = el.value; if (el.dataset.ppCampo === 'n_vinculo') H.pede(); } });
  let tq = null; document.addEventListener('input', (e) => { const el = e.target; if (!el) return;
    if (el.dataset && el.dataset.ppCampo) { F.draft[el.dataset.ppCampo] = el.value; return; }
    if (el.id === 'pp-obs') { F.draft.obs = el.value; return; }
    if (el.id === 'pp-fc-conceito') { F.draft.fc_conceito = el.value; return; }
    if (el.id === 'pp-fc-esperar') { F.draft.fc_esperar = el.value; return; }
    const reFoca = (id, v) => setTimeout(() => { const x = document.getElementById(id); if (x) { x.focus(); x.setSelectionRange(v.length, v.length); } }, 30);
    if (el.id === 'pp-junta') { const v = el.value; F.draft.junta = v; clearTimeout(tq); tq = setTimeout(() => { H.pede(); reFoca('pp-junta', v); }, 250); return; }
    if (el.id !== 'pp-fq') return; clearTimeout(tq); const v = el.value;
    tq = setTimeout(() => { F.q = v; F.pg = 0; H.pede(); reFoca('pp-fq', v); }, 300); });
})();
