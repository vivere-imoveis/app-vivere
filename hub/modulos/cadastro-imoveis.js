// modulos/cadastro-imoveis.js — Cadastros › Imóveis: cadastro por UNIDADE (HUB Vivere, 20/10/2026, pedido do Cleiton)
// 25/10/2026: endereço completo (link-mapa) e botões 📍 Google Maps + 🗺 mapa do HUB no campo Endereço da ficha.
// 25/10/2026 (pedido do Cleiton): os imóveis SEM código nenhum (nem locação A/T nem ref. de anúncio do site) ficam sempre no FIM
//   da lista, em qualquer ordenação — nunca entre os que têm código. A lista ordena por coluna (todas as páginas); na coluna
//   Códigos, A/T vêm sempre primeiro, depois as refs. do site, nos dois sentidos. (A aba à parte "Imóveis sem código" foi desfeita.)
// Contrato: _hub\modulos\LEIA-ME.md. Decisão do Cleiton (20/10/2026): "cadastro por unidade já"; todo endereço do HUB vira link para cá;
// o objetivo é um cadastro amplo, intuitivo e fácil de alimentar e consultar. A "Ficha do imóvel" completa continua construção à parte.
// • O cadastro é MONTADO na página a partir das fontes já no banco — nada é copiado:
//     contratos lidos das pastas (pessoas_contratos: endereço, unidade, matrícula, empreendimento, partes),
//     Carteira (contratos_locacao), Vendas (planilha V. Claude, ligada à pasta), anúncios do site (imoveis, Imobibrasil)
//     e a ponte de códigos confirmada (controle/parametros.ponte_codigos).
// • A mesma unidade em fontes diferentes se junta por chave: matrícula (com o ofício), rua + número + unidade + bloco,
//   ou empreendimento + unidade + bloco; anúncios da mesma referência (venda e locação) são o mesmo imóvel.
// • O que o Cleiton acrescenta (imóvel novo, dados corrigidos, junções, observação) vai para `cadastro-imoveis_fichas`;
//   cada ficha guarda as `chaves` que a ligam às fontes — assim ela não se perde quando as fontes mudam.
// • 16/11/2026 (F3c): quadro 'Aprovados, não publicados' no topo (imoveis_aprovados, gravada pelo banco; só leitura).
// • 16/11/2026 (P3b): selo de placa e lazer na lista e no perfil (imoveis_divulgacao + pendencias_cadastro; só leitura).
// • 18/11/2026 (tarefa vis-site-23, decisão do Cleiton): ⭐ Destaque no site — até 8 anúncios ATIVOS escolhidos para a vitrine
//   "Imóveis selecionados" da home do site; grava destaque_site (+ _por, _em) no doc do anúncio (coleção imoveis). Selo ⭐ e filtro
//   na lista. No app da diretoria, Cleiton, Nícollas e William marcam pela função site_destaque_marcar (mesma trava de 8).
// • 22/11/2026 (tarefa vis-site-destaques-hub, decisão do Cleiton "2a"): a ⭐ virou atalho da lista única e ordenada
//   site_config/vitrine_home (até 10; aba Destaques do site): ⭐ põe o imóvel no fim da lista, ☆ tira. O campo destaque_site
//   deixou de ser usado.
// • 18/11/2026 (pedido do Cleiton): o cadastro é o ponto MAIS COMPLETO — todos os imóveis (site ativo e inativo, locados, vendidos,
//   cadastrados) e a ficha completa do Imobibrasil (coleção imoveis_ficha, lida pelo robô: áreas, encargos, mobiliado, ano,
//   edifício, pavimento, características, descrição). A lista ganhou foto, encargos, agenciador e proprietário/locador.
// • 18/11/2026 (tarefa vis-site-24, decisões do Cleiton): CADASTRO ÚNICO NO SITE — um imóvel = uma página no site, com as
//   modalidades (venda, anual, temporada) marcadas. Código único = ref. da venda; sem venda, a da anual. Ligar/desligar a
//   modalidade = campo site_oculto no doc do anúncio (a vitrine privado.vit_montar não publica anúncio oculto). Refs diferentes
//   juntadas aqui só viram um imóvel no site depois de confirmadas ("É o mesmo imóvel": ficha com as chaves a:<anúncio>, lida
//   por privado.site_grupo_ref); "Não é o mesmo imóvel" grava refs_separadas na ficha e o site mantém separados.
// • Sem dados pessoais: endereço só do imóvel; pessoas aparecem pelo nome, com link para Cadastros › Pessoas.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl0 = H.brl0 || ((v) => v);
  const ID = 'cadastro-imoveis', CF = 'cadastro-imoveis_fichas', PC = 'pessoas_contratos';
  const F = { q: '', f: 'todos', tp: '', pg: 0, sel: '', edit: false, novo: false, draft: {}, erro: '', y: 0, junta: '' };
  const nrm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const slug = (s) => nrm(s).replace(/ /g, '-').slice(0, 70);
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
  const PART = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  const cap = (s) => { s = titulo(s); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; };
  function titulo(s) { s = String(s || '').trim(); if (/[a-zà-ÿ]/.test(s)) return s;
    return s.toLowerCase().split(/(\s+)/).map((w, i) => (!w.trim() ? w : (i > 0 && PART.has(nrm(w))) ? w : /\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(''); }

  if (!document.getElementById('ci-css')) { const st = document.createElement('style'); st.id = 'ci-css'; st.textContent = `
    .ci-tab td{vertical-align:top}
    .ci-tab td.ci-foto{width:76px;padding-right:4px} .ci-tab td.ci-foto img{width:72px;aspect-ratio:4/3;object-fit:cover;border-radius:6px;border:1px solid var(--line);display:block} .ci-tab td.ci-foto .sem{display:block;width:72px;aspect-ratio:4/3;border-radius:6px;background:var(--soft);font-size:10px;color:var(--muted);text-align:center;line-height:54px}
    .ci-desc{font-size:13px;line-height:1.5;margin:8px 0 0} .ci-desc summary{cursor:pointer;color:var(--teal)}
    .ci-chip{display:inline-block;font-size:11px;padding:0 7px;border-radius:999px;background:var(--soft);color:var(--ink);white-space:nowrap;margin:1px 2px 1px 0}
    .ci-dest{padding:1px 8px;font-size:12px} .ci-dest.on{background:var(--warn-bg);color:var(--warn);border-color:var(--warn)} .ci-chip.dest{background:var(--warn-bg);color:var(--warn)} .ci-site{padding:1px 8px;font-size:12px} .ci-site.on{background:var(--ok-bg);color:var(--ok);border-color:var(--ok)} .ci-aviso{background:var(--warn-bg);border-radius:8px;padding:6px 8px !important}
    .ci-chip.loc{background:var(--accent);color:var(--bg)} .ci-chip.ven{background:var(--ok-bg);color:var(--ok)} .ci-chip.anu{background:var(--info-bg,var(--soft));color:var(--info,var(--ink))} .ci-chip.al{background:var(--bad-bg);color:var(--bad)} .ci-chip.and{background:var(--warn-bg);color:var(--warn)}
    .ci-lk{all:unset;cursor:pointer;color:var(--teal);text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere}
    .ci-lk:focus-visible{outline:2px solid var(--accent)}
    .ci-dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:6px 14px;font-size:13px}
    .ci-dl .s{display:block}
    .ci-sec{margin:16px 0 6px;font-family:var(--display);font-weight:500;font-size:13px;letter-spacing:.14em;text-transform:uppercase}
    .ci-sec .s{display:inline;text-transform:none;letter-spacing:0;font-family:var(--body);font-size:12px;color:var(--muted);margin-left:6px}
    .ci-lista{margin:0;padding:0;list-style:none} .ci-lista li{margin:4px 0;padding-left:12px;position:relative;font-size:13px} .ci-lista li::before{content:'›';position:absolute;left:0;color:var(--muted)}
  `; document.head.appendChild(st); }

  // ---------------------------------------------------------------- endereço → partes e chaves
  const TIPOLOG = /^(rua|r|avenida|av|rodovia|rod|servidao|serv|estrada|est|alameda|al|travessa|tv|praca|caminho|via|largo|beco|geral|sc)\s+/;
  const ABREV = { doutor: 'dr', professor: 'prof', presidente: 'pres', senador: 'sen', vereador: 'ver', deputado: 'dep', jornalista: 'jorn', coronel: 'cel', general: 'gen', capitao: 'cap', santa: 'sta', santo: 'sto', sao: 's', nossa: 'n', senhora: 'sra' };
  function logCore(s) { let t = nrm(s); for (let i = 0; i < 3; i++) t = t.replace(TIPOLOG, '');
    return t.split(' ').map((w) => ABREV[w] || w).filter((w) => !PART.has(w)).join(' '); }
  const VAGA = /\b(vaga|box|garagem|hobby|deposito|estacionamento)\b/;
  // número da unidade: "Apto 303 tipo B" → 303; "Loja 1A" → 1a; "411-D" → 411d; vaga/box ganham "v" para não juntar com o apartamento
  function uniDe(txt, tipo) { const s = String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); if (!s.trim()) return '';
    const m = s.match(/(\d{1,5})(?:\s*-\s*|)([a-z])?(?![a-z])/); if (!m) return '';
    const kw = (s.slice(0, m.index).match(/(apartamento|apto|ap|sala|loja|casa|unidade|cobertura|lote|box|vaga|garagem|hobby|deposito)[^a-z]*$/) || [])[1] || '';
    const vaga = /^(vaga|box|garagem|hobby|deposito)$/.test(kw) || (!kw && VAGA.test(nrm(s))) || /^(vaga|box)$/.test(nrm(tipo));
    return (vaga ? 'v' : '') + String(Number(m[1])) + (m[2] || ''); }
  const blocoDe = (txt) => { const m = nrm(txt).match(/\b(?:bloco|bl|torre|tr)\s+([a-z0-9]{1,3})\b/); return m ? m[1] : ''; };
  const ordem = (txt) => { const m = nrm(txt).match(/\b(\d)\s*(?:o|º)?\s*(?:oficio|registro|cri|ri)\b/) || nrm(txt).match(/\b(primeiro|segundo|terceiro)\b/); return m ? ({ primeiro: '1', segundo: '2', terceiro: '3' }[m[1]] || m[1]) : ''; };
  // texto livre ("Caminho dos Açores, 1710, Apartamento 205, vaga…", "Rua X, 176 — 404 (Edifício Y)") → partes
  function parseEnd(txt) {
    let s = String(txt || '').replace(/\s+/g, ' ').trim(); let emp = '';
    const m = s.match(/\(([^()]*)\)\s*$/); if (m) { emp = m[1]; s = s.slice(0, m.index).trim(); }
    let uniTxt = ''; const dd = s.split(/\s+[—–]\s+/); if (dd.length > 1) { s = dd[0]; uniTxt = dd.slice(1).join(' '); }
    let log = s, num = '', resto = '';
    const mn = s.match(/^(.*?)(?:,\s*|\s+)(?:n[ºo°.]*\s*)?(\d{1,5})\b(.*)$/i);
    if (mn && nrm(mn[1]).length > 3 && !/\b(apartamento|apto|ap|sala|loja|lote|casa|unidade)\s*$/i.test(mn[1])) { log = mn[1].replace(/[,\s]+$/, ''); num = mn[2]; resto = mn[3]; }
    else { const p = s.split(','); log = p[0]; resto = p.slice(1).join(','); }
    const r = (uniTxt + ' ' + resto).trim();
    const mu = r.match(/\b(?:apartamento|apto|ap|sala|loja|casa|unidade|cobertura|studio|est[uú]dio|lote|box|conjunto|cj|vaga)\.?\s*(?:n[ºo°.]*\s*)?(\d{1,5}(?:\s*-\s*|)[a-z]?)(?![a-z0-9])/i) || uniTxt.match(/^\s*(\d{1,5}(?:\s*-\s*|)[a-z]?)(?![a-z0-9])/i);
    const tipoU = ((r.match(/\b(apartamento|apto|ap|sala|loja|casa|cobertura|lote|terreno|box|vaga)\b/i) || [])[1] || '').toLowerCase();
    return { log: log.trim(), num, uniTxt: mu ? mu[0].trim() : '', uni: mu ? uniDe(mu[0], '') : '', bloco: blocoDe(r), emp: emp.trim(), tipoU, resto: r };
  }
  function empK(nome, txt) { const L = window.HUB_LINKMAPA; let k = '';
    try { if (L && L.empDoTexto) k = (nome && L.empDoTexto(nome)) || (txt && L.empDoTexto(txt)) || ''; } catch (e) { k = ''; }
    return k || (nome ? 'n:' + logCore(nome).replace(/\b(edificio|ed|residencial|res|condominio|cond|complexo)\b/g, '').trim() : ''); }
  function chaves(e) { const K = []; const L = logCore(e.log);
    if (e.mat) { const n = String(e.mat).replace(/\D/g, ''); if (n.length >= 3) K.push('m:' + Number(n) + '@' + (e.ofi || '')); }
    if (L && e.num) K.push(`e:${L}|${Number(e.num)}|${e.uni || ''}|${e.bloco || ''}`);
    if (e.ek && e.uni) K.push(`p:${e.ek}|${e.uni}|${e.bloco || ''}`);
    return K; }

  // ---------------------------------------------------------------- índice (montado das fontes, refeito quando o banco muda)
  let IDX = null, SIG = null;
  const SIGC = [PC, CF, 'imoveis', 'contratos_locacao', 'vendas', 'controle', 'empreendimentos_fichas', 'documentos', 'drive_mapa'];
  function indice() { const s = SIGC.map((c) => H.S[c]).concat([window.HUB_LINKMAPA ? 1 : 0]); if (IDX && SIG && s.every((x, i) => x === SIG[i])) return IDX; SIG = s; IDX = monta(); return IDX; }
  const pcPorCaminho = () => { const m = {}; H.lista(PC).forEach((d) => { if (d.caminho) m[nrm(d.caminho)] = d; }); return m; };
  function monta() {
    const R = []; // registros das fontes: {src, keys, refs, dados}
    const add = (r) => { R.push(r); return r; };
    const PCm = pcPorCaminho(); const prm = H.params() || {}; const ponte = prm.ponte_codigos || {};
    // 1) contratos lidos das pastas: cada imóvel do contrato
    const doCod = (d) => { if (!d.cod) return -1; const L = d.imoveis || []; if (L.length === 1) return 0; const np = nrm(d.nome_pasta || '');
      const sc = L.map((i) => { const w = logCore(i.logradouro).split(' ').filter((x) => x.length > 2); const u = String(uniDe(i.unidade || '', i.tipo)).replace(/^v/, '');
        return w.filter((x) => np.includes(x)).length * 2 + (i.numero && np.includes(String(i.numero)) ? 2 : 0) + (u && new RegExp('\\b' + u + '\\b').test(np) ? 3 : 0) - (/^v/.test(uniDe(i.unidade || '', i.tipo)) ? 1 : 0); });
      const mx = Math.max(...sc); return mx > 0 ? sc.indexOf(mx) : -1; };
    H.lista(PC).forEach((d) => { const nc = doCod(d); (d.imoveis || []).forEach((i, n) => {
      const uni = uniDe(i.unidade || '', i.tipo); const e = { log: i.logradouro, num: String(i.numero || '').replace(/\D/g, ''), uni, bloco: nrm(i.bloco || i.torre || '').slice(0, 3) || blocoDe(i.unidade), mat: i.matricula, ofi: ordem(i.cartorio), ek: empK(i.empreendimento, '') };
      const keys = chaves(e).concat(['pc:' + d._id + '#' + n]); if (n === nc) keys.push('c:' + d.cod);
      add({ src: 'pc', keys, pc: d._id, n, cod: n === nc ? d.cod : null, d: { tipo: i.tipo, logradouro: i.logradouro, numero: i.numero, unidade: i.unidade, bloco: i.bloco || i.torre, vagas: i.vagas, empreendimento: i.empreendimento, bairro: i.bairro, cidade: i.cidade, uf: i.uf, matricula: i.matricula, cartorio: i.cartorio, area_privativa: i.area_privativa, descricao: i.descricao_curta }, peso: 3 }); }); });
    // 2) Carteira: o imóvel do contrato de locação (código A1, A2…)
    H.lista('contratos_locacao').forEach((c) => { const pl = c.planilha || {}, al = c.alude || {}; const end = pl.endereco || al.endereco || '';
      const p = parseEnd(end); const keys = chaves({ log: p.log, num: p.num, uni: p.uni, bloco: p.bloco, ek: empK(p.emp, end) }).concat(['c:' + c._id]);
      const pt = ponte[c._id]; if (pt && pt.status === 'confirmado' && pt.imovel) keys.push('a:' + pt.imovel);
      add({ src: 'car', keys, cod: c._id, d: { logradouro: p.log, numero: p.num, unidade: p.uniTxt, bairro: pl.bairro || al.bairro, descricao: end }, peso: 2 }); });
    // 3) Vendas: liga à pasta lida (imóveis do contrato); sem pasta lida, o objeto da planilha vira um imóvel próprio
    H.lista('vendas').forEach((v) => { let cam = ''; try { cam = H.pastaDaVenda ? H.pastaDaVenda(v) : ''; } catch (e) { cam = ''; }
      const d = cam && PCm[nrm(cam)]; const refs = d && (d.imoveis || []).length ? d.imoveis.map((_, n) => 'pc:' + d._id + '#' + n) : [];
      if (refs.length) { add({ src: 'ven', keys: [], refs, venda: v._id, pc: d._id }); return; }
      const p = parseEnd(v.objeto || ''); const keys = chaves({ log: p.log, num: p.num, uni: p.uni, bloco: p.bloco, ek: empK('', v.objeto || '') }).concat(['v:' + v._id]);
      add({ src: 'ven', keys, venda: v._id, d: { descricao: titulo(v.objeto || '') }, peso: 1 }); });
    // 4) Anúncios do site (Imobibrasil): a mesma referência em venda e locação é o mesmo imóvel
    H.lista('imoveis').forEach((x) => { const p = parseEnd(x.endereco || ''); const casa = /casa|terreno|lote|galp|chacara|sitio|area/.test(nrm(x.tipo));
      const keys = ['a:' + x._id, 'r:' + nrm(x.ref)]; const ek = empK(p.emp, x.endereco || '');
      if (p.uni || casa) keys.push(...chaves({ log: p.log, num: p.num, uni: p.uni, bloco: p.bloco, ek }));
      add({ src: 'anu', keys, anuncio: x._id, d: { tipo: x.tipo, logradouro: p.log, numero: p.num, unidade: p.uniTxt, empreendimento: p.emp, bairro: x.bairro, cidade: x.cidade, descricao: x.endereco }, peso: 1, ek }); });
    // 5) fichas do HUB (imóvel novo, dados corrigidos, junções)
    const FI = H.S[CF] || {};
    Object.entries(FI).forEach(([id, f]) => { if (f.juntar_em) return; add({ src: 'ficha', keys: (f.chaves || []).concat(['f:' + id]), ficha: id, d: f.dados || {}, peso: 9 }); });
    Object.entries(FI).forEach(([id, f]) => { if (f.juntar_em) add({ src: 'junta', keys: ['f:' + id, 'f:' + f.juntar_em].concat(f.chaves || []) }); });
    // ---- união por chave
    const pai = R.map((_, i) => i); const acha = (i) => { while (pai[i] !== i) { pai[i] = pai[pai[i]]; i = pai[i]; } return i; };
    const une = (a, b) => { a = acha(a); b = acha(b); if (a !== b) pai[b] = a; };
    const porK = {}; R.forEach((r, i) => r.keys.forEach((k) => { if (k in porK) une(porK[k], i); else porK[k] = i; }));
    const G = {}; R.forEach((r, i) => { if (r.src === 'junta') return; (G[acha(i)] = G[acha(i)] || []).push(r); });
    // ---- unidades
    const U = {}, porChave = {};
    const PRI = ['f:', 'c:', 'pc:', 'r:', 'm:', 'e:', 'p:', 'v:', 'a:'];
    Object.values(G).forEach((rs) => { const ks = [...new Set(rs.flatMap((r) => r.keys))]; if (!ks.length) return;
      const fi = rs.find((r) => r.src === 'ficha');
      let id; if (fi) id = fi.ficha; else { for (const p of PRI) { const c = ks.filter((k) => k.startsWith(p)).sort()[0]; if (c) { id = 'u-' + slug(c.slice(p.length)).slice(0, 40) + '-' + hash(c); break; } } }
      const u = { id, keys: ks, rs, ficha: fi ? (H.S[CF] || {})[fi.ficha] : null, anuncios: [], cods: [], vendas: [], pcs: [], d: {} };
      rs.sort((a, b) => (b.peso || 0) - (a.peso || 0)).forEach((r) => { Object.entries(r.d || {}).forEach(([k, v]) => { if (v && !u.d[k]) u.d[k] = v; });
        if (r.anuncio) u.anuncios.push(r.anuncio); if (r.cod && !u.cods.includes(r.cod)) u.cods.push(r.cod); if (r.venda && !u.vendas.includes(r.venda)) u.vendas.push(r.venda);
        if (r.pc && r.src === 'pc' && !u.pcs.includes(r.pc)) u.pcs.push(r.pc); if (!u.ek && r.ek) u.ek = r.ek; });
      U[id] = u; ks.forEach((k) => { porChave[k] = id; }); });
    // vendas ligadas à pasta: entram nas unidades dos imóveis do contrato
    R.filter((r) => r.src === 'ven' && r.refs).forEach((r) => { r.refs.forEach((k) => { const u = U[porChave[k]]; if (u && !u.vendas.includes(r.venda)) u.vendas.push(r.venda); });
      porChave['v:' + r.venda] = porChave[r.refs[0]]; });
    // derivados: título, situação, pessoas
    Object.values(U).forEach((u) => { const d = u.d; const fd = (u.ficha && u.ficha.dados) || {};
      u.titulo = rotulo(u); u.emp = fd.empreendimento || d.empreendimento || ''; if (!u.ek && u.emp) u.ek = empK(u.emp, '');
      u.sit = situacao(u); u.inc = !(d.logradouro && (d.numero || /s\/?n/i.test(d.descricao || ''))); });
    return { U, porChave };
  }
  function rotulo(u) { const d = Object.assign({}, u.d, (u.ficha && u.ficha.dados) || {});
    const rua = d.logradouro ? titulo(d.logradouro) + (d.numero ? ', ' + d.numero : '') : '';
    const uni = d.unidade ? titulo(String(d.unidade)).replace(/^apartamento\b/i, 'Apto') : '';
    const bl = d.bloco && !/bloco|torre/i.test(uni) ? (/bloco|torre/i.test(d.bloco) ? titulo(String(d.bloco)) : 'Bloco ' + String(d.bloco).toUpperCase()) : '';
    const t = [rua, uni, bl].filter(Boolean).join(' · ');
    return t || titulo(d.descricao || d.empreendimento || u.id); }
  function situacao(u) { const s = []; const C = H.S.contratos_locacao || {}, I = H.S.imoveis || {};
    u.cods.forEach((c) => { const x = C[c]; if (!x) return; const at = H.contratoAtivo ? H.contratoAtivo(x) : true; s.push({ t: c + (at ? ' na carteira' : ' encerrada'), c: at ? 'loc' : '' }); });
    const fins = new Set(); u.anuncios.forEach((a) => { const x = I[a]; if (x && x.ativo) fins.add(x.finalidade); });
    fins.forEach((f) => s.push({ t: /venda/i.test(f) ? 'à venda no site' : /temporada/i.test(f) ? 'temporada no site' : 'para alugar no site', c: 'anu' }));
    if (!fins.size && u.anuncios.length) s.push({ t: 'anúncio inativo', c: '' });
    if (u.vendas.length) s.push({ t: u.vendas.length > 1 ? u.vendas.length + ' contratos de venda' : 'contrato de venda', c: 'ven' });
    if (u.pcs.some((p) => ((H.S[PC] || {})[p] || {}).area === 'andamento')) s.push({ t: 'contrato em andamento', c: 'and' });
    return s; }
  const unidade = (id) => { const I = indice(); return I.U[id] || I.U[I.porChave['f:' + id]] || null; };
  const todas = () => Object.values(indice().U);

  // ---------------------------------------------------------------- API para o núcleo e os módulos (endereço vira link)
  function idDe(ctx) { ctx = ctx || {}; const P = indice().porChave;
    if (ctx.fonte === 'contrato' && ctx.cod) return P['c:' + ctx.cod] || '';
    if (ctx.fonte === 'venda' && ctx.id) return P['v:' + ctx.id] || '';
    if ((ctx.fonte === 'anuncio' || ctx.fonte === 'imovel') && ctx.id) return P['a:' + ctx.id] || '';
    if (ctx.fonte === 'pc' && ctx.id) return P['pc:' + ctx.id + '#' + (ctx.n || 0)] || '';
    if (ctx.fonte === 'pasta' && (ctx.caminho || ctx.cod)) { if (ctx.cod && P['c:' + ctx.cod]) return P['c:' + ctx.cod]; const d = pcPorCaminho()[nrm(ctx.caminho)]; return d ? P['pc:' + d._id + '#0'] || '' : ''; }
    if (ctx.fonte === 'drive' && ctx.vendas) { for (const v of ctx.vendas) if (P['v:' + v]) return P['v:' + v]; }
    if (ctx.fonte === 'unidade') return ctx.id;
    return ''; }
  window.HUB_IMOVEIS = {
    id: idDe, unidade: (id) => unidade(id),
    /** Cadastro único (18/11/2026): código do imóvel no site e modalidades, a partir de um anúncio (ex.: 'AP308_A' → { codigo: 'AP308', modalidades: ['Venda', 'Anual'] }). */
    codigoSite(anuncio) { const u = unidade(idDe({ fonte: 'anuncio', id: anuncio })); if (!u) return null; const s = siteInfo(u); const x = (H.S.imoveis || {})[anuncio] || {};
      return { codigo: x.ativo && x.site_oculto !== true ? s.cod(anuncio) : '', oculto: x.site_oculto === true, modalidades: s.mods.filter((m) => m.on).map((m) => MOD_NOME[m.f]), juntar: s.pend }; },
    html(txt, ctx) { const id = idDe(ctx); if (!id || txt == null || txt === '') return ''; const u = unidade(id);
      return `<button class="lk imv" data-imovel-u="${esc(id)}" title="Abrir o cadastro do imóvel${u ? ': ' + esc(u.titulo) : ''}">${esc(txt)}</button>`; },
  };

  // ---------------------------------------------------------------- gravação
  const SENS = [[/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, 'CPF'], [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/, 'CNPJ'], [/[\w.+-]+@[\w-]+\.[\w.]+/, 'e-mail'], [/\(?\b\d{2}\)?\s?9\d{4}-?\d{4}\b/, 'telefone'], [/\b(ag[eê]ncia|conta|pix)\b.{0,12}\d{3,}/i, 'conta bancária']];
  const sensivel = (o) => { if (typeof H.sensivel === 'function') return H.sensivel(o); const t = JSON.stringify(o || {}); for (const [re, n] of SENS) if (re.test(t)) return n; return ''; }; // regra única do núcleo (hub #15)
  async function grava(id, campos, desc, criar) { const db = H.db(); if (!db) { F.erro = 'Banco indisponível nesta visualização.'; H.pede(); return false; }
    const semCod = JSON.parse(JSON.stringify(campos || {})); const dd = semCod.dados || {}; const ruim = COD_IMV.filter((k) => k !== 'matricula' && dd[k] && !/^[\d.\-\/ ]+$/.test(dd[k])).concat(CAR_ED.filter((k) => dd[k] && !/^[\d.,]+$/.test(dd[k])));
    if (ruim.length) { F.erro = 'Inscrição imobiliária, códigos CASAN/CELESC, dormitórios, suítes, banheiros, condomínio e IPTU aceitam só números (com ponto, vírgula, hífen ou barra).'; H.pede(); return false; }
    COD_IMV.forEach((k) => { delete dd[k]; });
    const s = sensivel(semCod); if (s) { F.erro = `Parece haver ${s} no que foi digitado; dados pessoais não ficam no HUB.`; H.pede(); return false; }
    const x = (H.S[CF] || {})[id] || {}; const hoje = H.hojeISO(); const hist = (x.historico || []).slice(-60).concat([{ em: hoje, o_que: desc || 'editado', por: 'HUB' }]);
    try { if (criar || !(H.S[CF] || {})[id]) await db.doc(CF + '/' + id).set(Object.assign({ criado_em: hoje, origem: 'HUB' }, x, campos, { atualizado_em: hoje, historico: hist }));
      else await db.doc(CF + '/' + id).update(Object.assign({}, campos, { atualizado_em: hoje, historico: hist })); F.erro = ''; return true; }
    catch (e) { F.erro = 'Não foi possível salvar: ' + (e && e.message || e); H.pede(); return false; } }

  // ---------------------------------------------------------------- ⭐ destaque no site (18/11/2026)
  const DEST_MAX = 10;
  const vitrine = () => { const d = (H.S.site_config || {}).vitrine_home; return Array.isArray(d && d.refs) ? d.refs.map((r) => String(r).toUpperCase()) : []; };
  const ehDest = (x) => !!(x && x.ativo && vitrine().includes(String(x.ref || '').toUpperCase()));
  const destaques = () => vitrine();
  const temDest = (u) => (u.anuncios || []).some((a) => ehDest((H.S.imoveis || {})[a]));
  async function marcaDestaque(a, liga) { const db = H.db(); const x = (H.S.imoveis || {})[a]; if (!db || !x) { F.erro = 'Banco indisponível nesta visualização.'; H.pede(); return; }
    if (liga && !x.ativo) { F.erro = `O anúncio ${x.ref} está inativo: só anúncio ativo pode ser destaque no site.`; H.pede(); return; }
    const r = String(x.ref || '').toUpperCase(), L = vitrine(); if (liga === L.includes(r)) { F.erro = ''; H.pede(); return; }
    if (liga && L.length >= DEST_MAX) { F.erro = `Já há ${DEST_MAX} destaques no site (${L.join(', ')}). Tire um antes de pôr ${x.ref} (aba Destaques do site).`; H.pede(); return; }
    const dados = { refs: liga ? L.concat(r) : L.filter((k) => k !== r), por: 'Cleiton (HUB)', em: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') };
    try { await db.doc('site_config/vitrine_home').set(dados); H.S.site_config = Object.assign({}, H.S.site_config || {}, { vitrine_home: dados }); F.erro = ''; H.pede(); }
    catch (e) { F.erro = 'Não foi possível gravar o destaque: ' + (e && e.message || e); H.pede(); } }
  function botaoDestaque(a, x) { if (!x || !x.ativo || !H.db()) return ''; const on = ehDest(x); const pos = vitrine().indexOf(String(x.ref || '').toUpperCase()) + 1;
    return ` <button class="btn ci-dest${on ? ' on' : ''}" data-ci-dest="${esc(a)}" data-ci-dest-liga="${on ? '0' : '1'}" aria-pressed="${on}" title="${on ? `Na vitrine \u201cImóveis selecionados\u201d da home do site, posição ${pos}. Clique para tirar (a ordem fica na aba Destaques do site)` : `Pôr no fim da vitrine \u201cImóveis selecionados\u201d da home do site (até ${DEST_MAX}; a ordem fica na aba Destaques do site)`}">${on ? `⭐ Vitrine do site (${pos}º)` : '☆ Pôr na vitrine do site'}</button>`; }

  // ---------------------------------------------------------------- cadastro único no site (18/11/2026, vis-site-24)
  const MOD_NOME = { V: 'Venda', A: 'Anual', T: 'Temporada' };
  const ordFin = (a) => ({ V: 1, A: 2, T: 3 }[finDe(a)] || 4);
  const refBase = (a) => String(a).split('_')[0].toUpperCase();
  const porOrdem = (a, b) => ordFin(a) - ordFin(b) || refBase(a).localeCompare(refBase(b));
  /** Como o imóvel aparece no site: códigos (um só quando é um imóvel no site), modalidades ligadas e o aviso de refs a juntar. */
  function siteInfo(u) { const I = H.S.imoveis || {};
    const ativos = (u.anuncios || []).filter((a) => (I[a] || {}).ativo).sort(porOrdem);
    const vis = ativos.filter((a) => I[a].site_oculto !== true);
    const fi = u.ficha && !u.ficha.juntar_em ? u.ficha : null; const sep = !!(fi && fi.refs_separadas === true);
    const fic = fi && !sep ? (fi.chaves || []).filter((k) => k.startsWith('a:')).map((k) => k.slice(2)) : [];
    const refsF = [...new Set(fic.map(refBase))]; const grupo = refsF.length > 1 ? refBase(fic.slice().sort(porOrdem)[0]) : '';
    const cod = (a) => (grupo && refsF.includes(refBase(a)) ? grupo : refBase(a));
    const codigos = [...new Set(vis.map(cod))];
    const refsAt = [...new Set(ativos.map(refBase))];
    const pend = !sep && refsAt.length > 1 && !(grupo && refsAt.every((r) => refsF.includes(r)));
    const mods = ['V', 'A', 'T'].filter((f) => ativos.some((a) => finDe(a) === f)).map((f) => ({ f, on: vis.some((a) => finDe(a) === f) }));
    return { ativos, vis, codigos, refsAt, pend, sep, mods, cod }; }
  const refsAJuntar = (u) => siteInfo(u).pend;
  async function marcaSite(a, liga) { const db = H.db(); const x = (H.S.imoveis || {})[a]; if (!db || !x) { F.erro = 'Banco indisponível nesta visualização.'; H.pede(); return; }
    if (!x.ativo) { F.erro = `O anúncio ${x.ref} está inativo no Imobibrasil: não aparece no site.`; H.pede(); return; }
    const campos = { site_oculto: !liga, site_oculto_por: 'Cleiton (HUB)', site_oculto_em: new Date().toISOString() };
    try { await db.doc('imoveis/' + a).update(campos); Object.assign(x, campos); F.erro = ''; H.pede(); }
    catch (e) { F.erro = 'Não foi possível gravar a modalidade: ' + (e && e.message || e); H.pede(); } }
  function botaoSite(a, x) { if (!x || !x.ativo || !H.db()) return ''; const on = x.site_oculto !== true; const m = MOD_NOME[finDe(a)] || 'modalidade';
    return ` <button class="btn ci-site${on ? ' on' : ''}" data-ci-site="${esc(a)}" data-ci-site-liga="${on ? '0' : '1'}" aria-pressed="${on}" title="${on ? `${m} aparece no site próprio. Clique para tirar esta modalidade do site (o anúncio segue no Imobibrasil)` : `${m} está fora do site próprio. Clique para mostrar de novo`}">${on ? m + ' no site' : m + ' fora do site'}</button>`; }
  function blocoSite(u) { const s = siteInfo(u); if (!s.ativos.length) return '';
    const mods = s.mods.map((m) => chip({ t: MOD_NOME[m.f] + (m.on ? '' : ' (desligada)'), c: m.on ? 'anu' : '' })).join('');
    const cods = s.codigos.length ? s.codigos.join(' · ') + (s.codigos.length > 1 ? ' <span class="s" style="display:inline">(imóveis separados no site)</span>' : '') : '— <span class="s" style="display:inline">(nenhuma modalidade ligada: fora do site)</span>';
    const aviso = s.pend ? `<li class="ci-aviso"><b>Refs diferentes neste imóvel:</b> ${esc(s.refsAt.join(', '))}. No site elas ainda aparecem como imóveis separados.${H.db() ? ` <button class="btn" data-ci-unir="${esc(u.id)}">É o mesmo imóvel: um só no site</button> <button class="btn" data-ci-separa="${esc(u.id)}">Não é o mesmo imóvel</button>` : ''}</li>` : '';
    return `<li><b>Código único no site:</b> ${cods} · <b>Modalidades:</b> ${mods || '—'}${s.sep && s.refsAt.length > 1 ? ' <span class="s" style="display:inline">· refs marcadas como imóveis diferentes</span>' : ''}</li>` + aviso; }
  async function unirRefs(id, mesmo) { const u = unidade(id); if (!u) return; const s = siteInfo(u);
    if (mesmo && !confirm(`Juntar ${s.refsAt.join(', ')} num imóvel só no site? O código fica ${refBase(s.ativos[0])} e as outras refs levam a ele.`)) return;
    const fid = u.ficha ? u.id : 'f-' + slug(u.titulo || u.id).slice(0, 40) + '-' + hash(u.keys.join('|'));
    const base = u.ficha ? (u.ficha.chaves || []) : u.keys.filter((k) => !k.startsWith('f:'));
    const campos = mesmo ? { chaves: [...new Set(base.concat(u.anuncios.map((a) => 'a:' + a)))], refs_separadas: false } : { refs_separadas: true };
    if (!u.ficha) { campos.chaves = campos.chaves || base; campos.dados = {}; }
    if (await grava(fid, campos, mesmo ? `refs ${s.refsAt.join(', ')} confirmadas como o mesmo imóvel no site` : `refs ${s.refsAt.join(', ')} marcadas como imóveis diferentes no site`, !u.ficha)) { F.sel = fid; H.pede(); } }

  // ---------------------------------------------------------------- pedaços visuais
  const chip = (s) => `<span class="ci-chip ${s.c}">${esc(s.t)}</span>`;
  // P3b (16/11/2026, vis-vivian-cadastro-imovel-ia): selo de placa da Vivere e das áreas de lazer. Lê imoveis_divulgacao (gravam a
  // Vivian e o app do corretor) e o que falta pelas Pendências do banco (pendencias_cadastro: mesmas regras — só anúncio ativo;
  // lazer só em condomínio, prédio e loteamento). Só leitura: quem resolve é o corretor (app ou Vivian).
  const DVC = 'imoveis_divulgacao', DVP = 'pendencias_cadastro';
  let DVF = null, DVFsig = null, DVFem = 0; // cache curto (5 s): vale para um desenho da lista, sem ficar velho
  function dvFaltas() { const S = H.S[DVP]; if (DVF && DVFsig === S && Date.now() - DVFem < 5000) return DVF; DVFsig = S; DVFem = Date.now(); DVF = {};
    H.lista(DVP).forEach((pp) => (pp.imoveis || []).forEach((i) => (i.faltam || []).forEach((f) => { if (!Array.isArray(f) || f[0] !== 'divulgacao') return;
      const o = DVF[i.id] = DVF[i.id] || {}; if (/^Placa/.test(f[1])) o.placa = f[1]; else o.lazer = f[1]; })));
    return DVF; }
  const DV_DT = (s) => { const x = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return x ? `${x[3]}/${x[2]}/${x[1]}` : ''; };
  const dvN = (x) => Array.isArray(x) ? x.length : 0;
  const DV_PLACA = { sim: 'colocada', ainda_nao: 'ainda não colocada', nao_permitido: 'não é permitida' };
  const DV_LAZER = { tem: 'tem área de lazer', nao_tem: 'não tem área de lazer', ja_no_anuncio: 'fotos já estão no anúncio', nao_e_cond: 'não é condomínio' };
  function dvAnuncio(a) {
    const d = (H.S[DVC] || {})[a] || {}, f = dvFaltas()[a] || {}, p = d.placa || {}, l = d.lazer || {}, o = {};
    if (f.placa) o.placa = { t: '🪧 ' + (f.placa === 'Placa da Vivere' ? 'placa: falta informar' : f.placa.replace(/^Placa: /, 'placa: ').replace(/^Placa /, 'placa ')), c: 'and' };
    else if (p.situacao === 'sim') o.placa = { t: '🪧 placa' + (p.data ? ' desde ' + DV_DT(p.data) : ''), c: 'ven' };
    else if (p.situacao === 'nao_permitido') o.placa = { t: '🪧 sem placa' + (p.motivo ? ': ' + String(p.motivo).toLowerCase() : ''), c: '' };
    else if (p.situacao === 'ainda_nao') o.placa = { t: '🪧 placa ainda não colocada', c: 'and' };
    if (f.lazer) o.lazer = { t: '🏊 ' + (f.lazer === 'Fotos das áreas de lazer' ? 'lazer: falta informar' : f.lazer.replace(/^Lazer: /, 'lazer: ')), c: 'and' };
    else if (l.situacao === 'tem') o.lazer = { t: '🏊 lazer · ' + dvN(l.fotos) + ' foto' + (dvN(l.fotos) === 1 ? '' : 's'), c: dvN(l.fotos) >= 3 ? 'ven' : '' };
    else if (l.situacao === 'nao_tem') o.lazer = { t: '🏊 sem área de lazer', c: '' };
    else if (l.situacao === 'ja_no_anuncio') o.lazer = { t: '🏊 lazer já no anúncio', c: 'ven' };
    else if (l.situacao === 'nao_e_cond') o.lazer = { t: '🏊 não é condomínio', c: '' };
    return o; }
  // a unidade junta os anúncios: o que falta num anúncio ativo vale sobre a resposta de outro (como nas Pendências)
  function dvUnidade(u) { const I = H.S.imoveis || {}, o = {};
    const L = (u.anuncios || []).filter((a) => I[a]).sort((a, b) => (I[b].ativo ? 1 : 0) - (I[a].ativo ? 1 : 0)).map(dvAnuncio);
    ['placa', 'lazer'].forEach((k) => { o[k] = (L.find((x) => x[k] && x[k].c === 'and') || L.find((x) => x[k]) || {})[k]; });
    return o; }
  const seloDv = (u) => { const x = dvUnidade(u); return [x.placa, x.lazer].filter(Boolean).map(chip).join(''); };
  // F3c (16/11/2026): cadastro novo aprovado (Cleiton, William ou Nicollas; pedido de diretor já aprovado) entra em imoveis_aprovados
  // como 'aprovado, não publicado' — quem grava é o banco (privado.cad_aprovado_sync). A F4 publica no Imobibrasil e marca 'publicado'.
  const DVA = 'imoveis_aprovados';
  const DVA_DT = (s) => { const x = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/); return x ? `${x[3]}/${x[2]}/${x[1]}${x[4] ? ' ' + x[4] : ''}` : ''; };
  function quadroAprovados() {
    const L = H.lista(DVA).filter((x) => x.status && x.status !== 'publicado').sort((a, b) => String(b.aprovado_em || '').localeCompare(String(a.aprovado_em || '')));
    if (!L.length) return '';
    const url = (u) => /^https:\/\/drive\.google\.com\//.test(String(u || '')) ? String(u) : '';
    const li = (x) => { const d = x.drive || {}, ag = x.agenciador_nome || x.corretor || x.painel;
      const st = x.status === 'reaberto' ? chip({ t: 'reaberto: ' + (x.estado_solicitacao === 'complemento' ? 'pediu complemento' : x.estado_solicitacao === 'recusada' ? 'recusado' : 'aguardando nova decisão'), c: 'and' }) : chip({ t: 'aprovado, não publicado', c: 'ven' });
      const fot = [x.n_fotos ? x.n_fotos + ' foto' + (x.n_fotos > 1 ? 's' : '') : 'sem fotos', x.n_fotos_lazer ? x.n_fotos_lazer + ' do lazer' : '', x.n_foto_placa ? 'placa' : '', x.n_docs ? x.n_docs + ' doc' + (x.n_docs > 1 ? 's' : '') : ''].filter(Boolean).join(' · ');
      return `<li><b>${esc(x.nv || x._id)}</b> · ${esc([cap(x.tipo || ''), x.finalidade, titulo(x.bairro || '')].filter(Boolean).join(' · '))} ${st}<span class="s">agenciador ${esc(ag || '—')}${x.aprovado_por ? ' · aprovado por ' + esc(x.aprovado_por) + (x.aprovado_em ? ' em ' + DVA_DT(x.aprovado_em) : '') : ''}${x.aprovado_auto ? ' (pedido de diretor)' : ''} · ${esc(fot)}</span>${url(d.url) ? ` <a class="btn" href="${esc(url(d.url))}" target="_blank" rel="noopener" title="Abrir a pasta do imóvel no Drive">Pasta no Drive</a>` : ''}</li>`; };
    return `<h3 class="ci-sec">Aprovados, não publicados (${L.length})<span class="s">cadastros novos aprovados no app ou pela Vivian · a publicação no Imobibrasil vem na F4</span></h3><div class="card" style="margin-bottom:14px"><ul class="ci-lista">${L.map(li).join('')}</ul></div>`;
  }
  function dvLista(u) { const I = H.S.imoveis || {}, D = H.S[DVC] || {};
    return (u.anuncios || []).filter((a) => I[a]).map((a) => { const x = I[a], d = D[a] || {}, p = d.placa || {}, l = d.lazer || {}, s = dvAnuncio(a);
      if (!d.placa && !d.lazer && !s.placa && !s.lazer) return '';
      const quem = (o) => [o.por, o.em && DV_DT(o.em)].filter(Boolean).join(' em ');
      const pl = p.situacao ? `Placa ${esc(DV_PLACA[p.situacao] || p.situacao)}${p.data ? ' em ' + DV_DT(p.data) : ''}${p.motivo ? ' · ' + esc(p.motivo) : ''} · ${dvN(p.foto)} foto${dvN(p.foto) === 1 ? '' : 's'}${quem(p) ? ` <span class="s" style="display:inline">(${esc(quem(p))})</span>` : ''}` : 'Placa sem resposta';
      const lz = l.situacao ? `Lazer: ${esc(DV_LAZER[l.situacao] || l.situacao)}${l.situacao === 'tem' ? ' · ' + dvN(l.fotos) + ' foto' + (dvN(l.fotos) === 1 ? '' : 's') : ''}${quem(l) ? ` <span class="s" style="display:inline">(${esc(quem(l))})</span>` : ''}` : (s.lazer ? 'Lazer sem resposta' : '');
      return `<li><b>${esc(x.ref)}</b> · ${esc(FIN[finDe(a)] || x.finalidade || '')}${x.ativo ? '' : ' <span class="ci-chip">inativo</span>'} — ${pl}${lz ? ' · ' + lz : ''} ${[s.placa, s.lazer].filter(Boolean).map(chip).join('')}</li>`; }).join(''); }
  const empNome = (u) => { const E = H.S.empreendimentos_fichas || {}; const k = u.ek && !String(u.ek).startsWith('n:') ? u.ek : ''; return k && E[k] ? (E[k].nome || u.emp) : titulo(u.emp || ''); };
  const empLink = (u) => { const E = H.S.empreendimentos_fichas || {}; const k = u.ek && !String(u.ek).startsWith('n:') ? u.ek : ''; const n = empNome(u); if (!n) return '';
    return k && E[k] ? `<button class="ci-lk" data-ci-emp="${esc(k)}" title="Abrir o empreendimento">${esc(n)}</button>` : esc(n); };
  const pesLink = (nome, ctx) => { const P = window.HUB_PESSOAS; const cor = !!(ctx && ctx.fonte === 'corretor'); let t = titulo(nome);
    // corretor: nome e último sobrenome; ex-corretor = "Vivere (<nome>)" (25/11/2026, vis-nome-completo-corretores)
    if (cor) { try { const e = H.op && H.op.nomeCorretor ? H.op.nomeCorretor(nome) : ''; if (e) t = e; } catch (e) { /* fica o título */ } }
    try { const id = P && P.id ? P.id(nome, ctx) : ''; const q = id && P.pessoa ? P.pessoa(id) : null; const n = cor ? ((id && H.nomeCorK && H.nomeCorK(id)) || t) : (q && q.nome ? q.nome : t);
      if (id) return `<button class="lk pes" data-pessoa="${esc(id)}" title="Abrir o cadastro de ${esc(n)}">${esc(n)}</button>`; } catch (e) { /* sem link */ }
    return esc(t); };
  const PAP = { vendedor: 'vendedor(a)', comprador: 'comprador(a)', locador: 'locador(a)', locatario: 'locatário(a)', fiador: 'fiador(a)', conjuge: 'cônjuge', anuente: 'anuente', interveniente: 'interveniente', procurador: 'procurador(a)', representante: 'representante', administradora: 'administradora', intermediadora: 'intermediação', corretor: 'corretor(a)', testemunha: 'testemunha', parte: 'parte' };

  // ---------------------------------------------------------------- lista
  // com código = locação (A/T) ou ref. de anúncio do site (ativo ou não); sem código = só contratos de venda, pastas ou cadastro manual
  let MODO = 'com', ORD = null;
  const refsU = (u) => { const I = H.S.imoveis || {}; return [...new Set(u.anuncios.map((a) => (I[a] || {}).ref).filter(Boolean))]; };
  const temCod = (u) => u.cods.length > 0 || refsU(u).length > 0;
  const base = () => todas();
  const natCmp = (a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' });
  // pessoas da unidade para a lista: agenciador (anúncio), proprietário (anúncio) e locador (Carteira)
  function pessoasU(u) { const I = H.S.imoveis || {}, C = H.S.contratos_locacao || {}; const ag = new Set(), pr = new Set();
    (u.anuncios || []).forEach((a) => { const x = I[a]; if (!x) return; if (x.corretor) ag.add(x.corretor); if (x.proprietario) pr.add(x.proprietario); });
    (u.cods || []).forEach((c) => { const x = C[c]; if (!x) return; const l = (x.planilha || {}).locador || (x.alude || {}).locador; if (l) pr.add(l); });
    return { ag: [...ag], pr: [...pr] }; }
  const ORD_CI = { imovel: ['Imóvel', (u) => u.titulo || null], emp: ['Empreendimento · bairro', (u) => empNome(u) || titulo(u.d.bairro || '') || null], tipo: ['Tipo', (u) => cap(u.d.tipo || '') || null],
    pes: ['Agenciador · proprietário', (u) => { const p = pessoasU(u); return p.ag.concat(p.pr).map(titulo).join(' ') || null; }],
    m2: ['R$/m²', (u) => m2Ord(u)],
    sit: ['Situação', (u) => u.sit.map((s) => s.t).join(' ') || null], cod: ['Códigos', null] };
  // Códigos: grupo 0 = locação (A/T, em ordem natural), grupo 1 = ref. do site, grupo 2 = sem código — o grupo nunca inverte
  // R$/m² de área privativa (07/11/2026): maior R$/m² de venda dos anúncios da unidade; sem venda, o de aluguel
  const m2Lista = (L) => (H.m2 ? L.map((x) => ({ x, m: H.m2.anu(x._id) })).filter((o) => o.m) : []);
  const m2Ord = (u) => { const I = H.S.imoveis || {}; const L = m2Lista((u.anuncios || []).filter((a) => I[a]).map((a) => ({ _id: a, ...I[a] }))); for (const f of ['V', 'A']) { const v = L.filter((o) => o.m.fin === f).map((o) => o.m.v); if (v.length) return Math.max(...v); } return null; };
  const m2HTML = (L) => { const R = m2Lista(L); if (!R.length) return ''; return ['V', 'A'].map((f) => { const V = R.filter((o) => o.m.fin === f); return V.length ? `<div>${f === 'V' ? 'Venda' : 'Aluguel'}: ${V.map((o) => `<b title="${esc(H.m2.titulo(o.x._id))}">${esc(H.m2.fmt(o.m.v))}</b>${o.x.ativo ? '' : ' <span class="s" style="display:inline">inativo</span>'}`).join(' / ')}</div>` : ''; }).join('') + `<span class="s">área: ${esc(R[0].m.fonte)}</span>`; };
  const codChave = (u) => { const c = u.cods.slice().sort(natCmp), r = refsU(u).sort(natCmp); return c.length ? [0, c[0]] : r.length ? [1, r[0]] : [2, '']; };
  // ---------------------------------------------------------------- busca ampla: texto de cada unidade e conferência dos termos
  let BT = [], HIT = new Map(); const TXT = new WeakMap();
  const baMostra = () => BT.length > 1 || BT.some((t) => t.tipo !== 'txt');
  function textoU(u) {
    if (TXT.has(u)) return TXT.get(u);
    const S = H.S, I = S.imoveis || {}, CL = S.contratos_locacao || {}, V = S.vendas || {}, PCs = S[PC] || {}, P = window.HUB_PESSOAS, out = [];
    const nome = (n, ctx) => { if (!n) return; out.push(n); try { const id = P && P.id ? P.id(String(n), ctx || {}) : ''; const q = id && P.pessoa ? P.pessoa(id) : null; if (q && q.nome) out.push(q.nome); } catch (e) { /* só o texto */ } };
    out.push(u.titulo, u.emp, empNome(u), Object.values(u.d || {}).join(' '), u.ficha && u.ficha.apelido, u.ficha && u.ficha.obs, u.cods.join(' '));
    u.anuncios.forEach((a) => { const x = I[a]; if (!x) return; out.push(x.ref, x.tipo, x.finalidade, x.endereco, x.bairro, x.cidade); nome(x.proprietario, { fonte: 'imovel', id: a }); nome(x.corretor, { fonte: 'corretor' });
      try { const r = window.HUB_LINKMAPA && window.HUB_LINKMAPA.imovel(a); if (r && r.consulta) out.push(r.consulta); } catch (e) { /* sem endereço completo */ } });
    u.cods.forEach((c) => { const k = CL[c]; if (!k) return; [k.planilha, k.alude].forEach((o) => { if (!o) return; out.push(o.endereco, o.bairro); nome(o.locador, { fonte: 'contrato', cod: c, papel: 'locador' }); nome(o.locatario, { fonte: 'contrato', cod: c, papel: 'locatario' }); const cr = o.corretores || {}; nome(cr.agenciador); nome(cr.fechador); }); });
    u.vendas.forEach((v) => { const x = V[v]; if (!x) return; out.push(x.objeto, x.tipo, x.corretores); nome(x.vendedor, { fonte: 'venda', id: v, lado: 'vendedor' }); nome(x.comprador, { fonte: 'venda', id: v, lado: 'comprador' }); });
    u.pcs.forEach((p) => { const x = PCs[p]; if (!x) return; out.push(x.nome_pasta); (x.partes || []).forEach((z) => nome(z.nome, { fonte: 'pc', id: p })); });
    const A = anuInfo(u); if (H.car && H.car.texto) out.push(H.car.texto(A.det));
    const t = ' ' + nrm(out.filter(Boolean).join(' ')) + ' '; TXT.set(u, t); return t; }
  function atendeU(u) {
    const h = new Set(), t = textoU(u); let det = null, vals = null;
    BT.forEach((b, i) => {
      // 26/10/2026: CPF, CNPJ, RG, telefone ou e-mail achado nos dados pessoais do HUB (pessoas_dados) pelo nome das pessoas da unidade
      if (b.tipo === 'doc' || b.tipo === 'mail') { if (H.buscaAmpla && H.buscaAmpla.docHit && H.buscaAmpla.docHit(b, t, [])) h.add(i); return; }
      if (b.tipo === 'txt') { const s0 = nrm(b.s); if (s0 && t.includes(s0)) h.add(i); return; }
      if (b.tipo === 'num') {
        if (!det) { det = Object.assign({}, anuInfo(u).det); const fd = (u.ficha && u.ficha.dados) || {}; ['dormitorios', 'suites', 'banheiros', 'vagas'].forEach((k) => { const v = numBR(fd[k]); if (v != null) det[k] = v; }); }
        if (+det[b.campo] === b.n) h.add(i); return; }
      if (!vals) { const I = H.S.imoveis || {}, CL = H.S.contratos_locacao || {}, V = H.S.vendas || {};
        vals = u.anuncios.map((a) => (I[a] || {}).valor).concat(u.cods.map((c) => { const k = CL[c] || {}; return (k.planilha || {}).aluguel_contrato || (k.alude || {}).aluguel; }), u.vendas.map((v) => (V[v] || {}).valor_transacao)).map(Number).filter((v) => v > 0); }
      if (vals.some((v) => v >= b.min && v <= b.max)) h.add(i); });
    return h; }
  // grupo de código: 0 = locação A/T, 1 = ref. do site, 2 = sem código (sempre por último)
  function ordena(L) { const gr = new Map(L.map((u) => [u, codChave(u)[0]]));
    const semFim = (a, b) => (gr.get(a) === 2) - (gr.get(b) === 2);
    const sc = (u) => (HIT.get(u.id) || { size: 0 }).size;
    if (!ORD || !ORD_CI[ORD.k]) return L.sort((a, b) => semFim(a, b) || (baMostra() ? sc(b) - sc(a) : 0) || gr.get(a) - gr.get(b)); // padrão: A/T, refs. do site, sem código (estável: mantém o peso)
    const s = ORD.dir === 'asc' ? 1 : -1;
    if (ORD.k === 'cod') { const ch = new Map(L.map((u) => [u, codChave(u)])); return L.sort((a, b) => { const x = ch.get(a), y = ch.get(b); return x[0] - y[0] || s * natCmp(x[1], y[1]); }); }
    const f = ORD_CI[ORD.k][1], ch = new Map(L.map((u) => [u, f(u)]));
    return L.sort((a, b) => { const z = semFim(a, b); if (z) return z; const x = ch.get(a), y = ch.get(b); if (x == null || y == null) return x == null && y == null ? 0 : x == null ? 1 : -1; return s * natCmp(x, y); }); }
  const thCI = (k, rot) => { const d = ORD && ORD.k === k ? ORD.dir : ''; return `<th class="ord" data-ci-ord="${k}" tabindex="0" role="button"${d ? ` data-dir="${d}"` : ''} title="Ordenar: 1º clique maior → menor, 2º menor → maior, 3º volta à ordem original. Imóveis sem código ficam sempre no fim${k === 'cod' ? '; locações A/T sempre primeiro, depois as refs. do site' : ''}">${rot}</th>`; };
  function filtra() { const q = nrm(F.q); let L = base();
    if (F.f === 'carteira') L = L.filter((u) => u.cods.length); else if (F.f === 'vendas') L = L.filter((u) => u.vendas.length || u.pcs.length);
    else if (F.f === 'site') L = L.filter((u) => u.anuncios.some((a) => ((H.S.imoveis || {})[a] || {}).ativo)); else if (F.f === 'dest') L = L.filter(temDest); else if (F.f === 'inc') L = L.filter((u) => u.inc); else if (F.f === 'juntar') L = L.filter(refsAJuntar);
    else if (F.f === 'contrato') L = L.filter((u) => u.cods.length || u.vendas.length || u.pcs.length);
    if (F.tp) L = L.filter((u) => nrm(u.d.tipo || (u.ficha && u.ficha.dados && u.ficha.dados.tipo)) === F.tp);
    // busca ampla (25/10/2026, pedido do Cleiton): a mesma da aba Anúncios do site — vários termos, quartos/vagas, valor ±20%,
    // e texto em tudo o que o cadastro junta (proprietário, locador, locatário, vendedor, comprador, partes dos contratos, corretor…)
    BT = F.q.trim() ? (H.buscaAmpla ? H.buscaAmpla.termos(F.q) : []) : []; HIT = new Map();
    if (F.q.trim() && !BT.length) BT = [{ tipo: 'txt', s: q, rot: F.q.trim() }];
    if (BT.length) L = L.filter((u) => { const h = atendeU(u); if (h.size) { HIT.set(u.id, h); return true; } return false; });
    const peso = (u) => (u.cods.length ? 4 : 0) + (u.vendas.length || u.pcs.length ? 2 : 0) + (u.anuncios.some((a) => ((H.S.imoveis || {})[a] || {}).ativo) ? 1 : 0);
    return ordena(L.sort((a, b) => peso(b) - peso(a) || String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'))); }
  function render() {
    if (!H.carregado.imoveis && !H.lista('imoveis').length) return '<h2>Imóveis</h2>' + H.vazio('Carregando o cadastro…');
    if (F.sel) { const u = unidade(F.sel); if (u) return perfil(u); return '<div class="filtros"><button class="btn" data-ci-voltar="1">← Voltar à lista</button></div>' + H.vazio('Carregando o cadastro…'); }
    if (MODO === 'sem' && (F.f === 'carteira' || F.f === 'site' || F.f === 'dest')) F.f = 'todos';
    const T = base(); const n = (f) => T.filter(f).length; const I = H.S.imoveis || {};
    const kp = (rot, num, sub, alvo) => `<button class="card" data-ci-f="${alvo}" aria-pressed="${F.f === alvo}" style="text-align:left;cursor:pointer;font:inherit;color:inherit"><div class="nota" style="margin:0;text-transform:uppercase;letter-spacing:.12em;font-size:11px">${rot}</div><div style="font-size:26px;margin:4px 0">${num}</div><div class="nota" style="margin:0">${sub}</div></button>`;
    const tipos = [...new Set(T.map((u) => nrm(u.d.tipo || '')).filter(Boolean))].sort();
    const L = filtra(); const POR = 100; const nPg = Math.max(1, Math.ceil(L.length / POR)); if (F.pg > nPg - 1) F.pg = nPg - 1;
    const nav = L.length > POR ? `<div class="pag filtros"><button class="btn" data-ci-pg="-99999" title="Primeira página" aria-label="Primeira página" ${F.pg ? '' : 'disabled'}>&laquo;</button><button class="btn" data-ci-pg="-1" aria-label="Página anterior" ${F.pg ? '' : 'disabled'}>&lt;</button><span class="nota" style="margin:0 6px">${F.pg * POR + 1}–${Math.min(L.length, (F.pg + 1) * POR)} de ${L.length}</span><button class="btn" data-ci-pg="1" aria-label="Próxima página" ${F.pg < nPg - 1 ? '' : 'disabled'}>&gt;</button><button class="btn" data-ci-pg="99999" title="Última página" aria-label="Última página" ${F.pg < nPg - 1 ? '' : 'disabled'}>&raquo;</button></div>` : '';
    const linha = (u) => { const d = u.d; const refs = u.anuncios.map((a) => I[a] && Object.assign({ _id: a }, I[a])).filter(Boolean); const A = anuInfo(u); const fd0 = (u.ficha && u.ficha.dados) || {}; CAR_ED.concat(['vagas']).forEach((k) => { const v = numBR(fd0[k]); if (v != null) A.det[k] = v; }); const rs = resumoAnu(A);
      const vals = ['V', 'A', 'T'].map((f) => { const V = A.L.filter((x) => finDe(x._id) === f && x.valor != null); return V.length ? FIN_VAL[f] + ' ' + V.map((x) => valFin(f, x.valor)).join(' / ') : ''; }).filter(Boolean).join(' · ');
      const hit = baMostra() ? HIT.get(u.id) : null;
      const foto = (() => { try { const Fc = window.HUB_FICHA; const o = Fc && Fc.capa ? A.L.map((x) => Fc.capa(x._id)).find(Boolean) : ''; return o || (/^https?:/i.test(A.det.foto_url || '') ? '' : (A.det.foto_url || '')); } catch (e) { return ''; } })();
      return `<tr><td class="ci-foto">${foto ? `<img src="${esc(foto)}" alt="Foto de ${esc(u.titulo)}" loading="lazy">` : '<span class="sem">sem foto</span>'}</td><td><button class="ci-lk" data-ci-sel="${esc(u.id)}"><b>${esc(u.titulo)}</b></button>${hit ? `<span class="ba-hit">atende ${hit.size} de ${BT.length}: ${esc([...hit].sort((a, b) => a - b).map((i) => BT[i].rot).join(' · '))}</span>` : ''}${rs || vals ? `<span class="s">${esc([rs, vals].filter(Boolean).join(' · '))}</span>` : ''}${u.ficha && u.ficha.apelido ? `<span class="s">${esc(u.ficha.apelido)}</span>` : ''}${(() => { const s = siteInfo(u); if (!s.ativos.length) return ''; const m = s.mods.filter((x) => x.on).map((x) => MOD_NOME[x.f]).join(' · ');
          return `<span class="s">site: ${esc(s.codigos.join(' · ') || 'fora do site')}${m ? ' · ' + esc(m) : ''}</span>` + (s.pend ? ' <span class="ci-chip al" title="Refs diferentes do mesmo imóvel: confirme no cadastro se é um imóvel só no site">refs a juntar</span>' : ''); })()}${u.inc ? ' <span class="ci-chip al" title="Falta rua e número">endereço incompleto</span>' : ''}</td>
        <td>${empLink(u) || '—'}<span class="s">${esc(titulo(d.bairro || ''))}</span></td><td>${esc(cap(d.tipo || '—'))}${(() => { const e = [A.det.condominio != null && 'cond. ' + brl2(A.det.condominio), A.det.iptu != null && 'IPTU ' + brl2(A.det.iptu)].filter(Boolean).join(' · '); return e ? `<span class="s">${esc(e)}</span>` : ''; })()}</td>
        <td>${(() => { const p = pessoasU(u); const ag = p.ag.map((n) => pesLink(n, { fonte: 'corretor' })).join(', '), pr = p.pr.map((n) => pesLink(n, { fonte: 'imovel' })).join(', ');
          return (ag ? `<span class="s" style="display:inline">agenciador </span>${ag}` : '') + (pr ? `${ag ? '<br>' : ''}<span class="s" style="display:inline">proprietário </span><span data-sens>${pr}</span>` : '') || '—'; })()}</td><td>${(() => { const h = m2HTML(refs); return h ? h.replace(/<span class="s">área:.*$/, '') : '—'; })()}</td>
        <td>${u.sit.map(chip).join('') + seloDv(u) + (temDest(u) ? chip({ t: '⭐ destaque no site', c: 'dest' }) : '') || '—'}</td>${MODO === 'sem' ? '' : `<td>${[u.cods.slice().sort(natCmp).map(codLk).join(', '), refs.map(refLk).join(', ')].filter(Boolean).join(' · ') || '—'}</td>`}</tr>`; };
    // (20/10/2026) código de locação abre o contrato na Carteira; ref. de venda abre o anúncio no site
    function codLk(c) { return `<button class="ci-lk" data-ci-ir="carteira|car-${esc(c)}" title="Abrir o contrato ${esc(c)} na Carteira de locação">${esc(c)}</button>`; }
    function refLk(x) { const f = finDe(x._id || ''); const rot = f === 'V' ? '' : `<span class="s" style="display:inline"> ${f === 'T' ? 'temporada' : 'locação'}</span>`; const fin = f === 'V' ? 'venda' : f === 'T' ? 'temporada' : 'locação';
      return (x.link_site ? `<a class="ci-lk" href="${escUrl(x.link_site)}" target="_blank" rel="noopener" title="Abrir o anúncio de ${fin} no site">${esc(x.ref)}</a>` : esc(x.ref)) + rot; }
    const sem = MODO === 'sem';
    return `<h2>${sem ? 'Imóveis sem código' : 'Imóveis'}</h2>${sem
      ? `<p class="nota">Imóveis que o HUB conhece só por contratos de venda, pastas ou cadastro manual — <b>sem código de locação (A/T) e sem ref. de anúncio no site</b>. Ficam aqui, separados das locações firmadas e dos anúncios, que estão em <b>Cadastros › Imóveis</b>. Quando um deles ganhar código (locação ou anúncio), passa sozinho para lá.</p>`
      : `<p class="nota">Cadastro por <b>unidade</b>: cada imóvel aparece uma vez, juntando o que o HUB sabe dele — contratos lidos das pastas (endereço, unidade, matrícula, partes), Carteira, Vendas e anúncios do site. Clique para ver tudo e ajustar. A lista vem com as locações (A/T) primeiro, depois os anúncios do site (ref.), e os imóveis <b>sem código</b> sempre no fim, em qualquer ordenação. Os anúncios, com filtros de características, ficam em <b>Anúncios do site</b>. Todo endereço do HUB leva para cá.</p>`}
      ${sem ? '' : quadroAprovados()}<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px">
        ${kp('Imóveis', T.length, 'unidades no cadastro', 'todos')}${sem ? '' : kp('Na carteira', n((u) => u.cods.length), 'com locação (ativa ou encerrada)', 'carteira')}
        ${kp('Com contrato', n((u) => u.cods.length || u.vendas.length || u.pcs.length), sem ? 'venda ou em andamento' : 'locação, venda ou em andamento', 'contrato')}
        ${sem ? '' : kp('No site', n((u) => u.anuncios.some((a) => (I[a] || {}).ativo)), 'anúncio ativo', 'site')}${sem ? '' : kp('⭐ Destaques do site', destaques().length + ' de ' + DEST_MAX, 'vitrine da home do site', 'dest')}${sem ? '' : kp('Refs a juntar no site', n(refsAJuntar), 'mesmo imóvel com refs diferentes', 'juntar')}${kp('Endereço incompleto', n((u) => u.inc), 'falta rua ou número', 'inc')}</div>
      <div class="filtros"><select id="ci-tp" aria-label="Tipo" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;min-width:0;max-width:100%"><option value="">Todos os tipos</option>${tipos.map((t) => `<option value="${esc(t)}"${F.tp === t ? ' selected' : ''}>${esc(cap(t))}</option>`).join('')}</select>
        <input id="ci-q" type="search" placeholder="Ex.: Jurerê, 3 quartos, 2 milhões, nome do proprietário — não precisa ser exato" value="${esc(F.q)}" style="flex:1 1 220px;min-width:0;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit">
        ${H.db() ? '<button class="btn" data-ci-novo="1" style="margin-left:auto">+ Novo imóvel</button>' : ''}</div>
      ${F.erro ? `<p style="color:var(--bad)">${esc(F.erro)}</p>` : ''}${F.novo ? formNovo() : ''}
      ${H.buscaAmpla && H.buscaAmpla.ajuda ? H.buscaAmpla.ajuda().replace('(bairro, rua, empreendimento, cômodo, item do condomínio, ref.)', '(bairro, rua, empreendimento, cômodo, ref., código A, matrícula, proprietário, locador, locatário, vendedor, comprador, corretor)') : ''}
      ${baMostra() ? `<div class="ba-crit"><span>Busca ampla — basta atender a um termo; a lista vem por quantos termos cada imóvel atende:</span>${BT.map((t) => `<span class="pill info" title="${esc(t.tit || '')}">${esc(t.rot)}</span>`).join('')}</div>` : ''}
      <p class="nota" style="margin:0 0 6px">${L.length} imóve${L.length === 1 ? 'l' : 'is'} neste filtro.</p>${nav}
      <div class="tabela"><table class="ci-tab" data-ord-dados="1"><thead><tr><th class="ci-foto" aria-label="Foto"></th>${Object.entries(ORD_CI).filter(([k]) => !(sem && k === 'cod')).map(([k, [rot]]) => thCI(k, rot)).join('')}</tr></thead><tbody>${L.slice(F.pg * POR, (F.pg + 1) * POR).map(linha).join('') || `<tr><td colspan="${sem ? 7 : 8}">Nenhum imóvel neste filtro.</td></tr>`}</tbody></table></div>${nav}`;
  }

  // ---------------------------------------------------------------- dados dos anúncios (20/10/2026: o cadastro do imóvel é sempre o ponto mais completo)
  const IMOB = 'https://painel2.imobibrasil.app.br/imobiliarias/imovel_alterar.php?cod=';
  const FIN = { V: 'Venda', A: 'Locação anual', T: 'Temporada' }, FIN_VAL = { V: 'Venda', A: 'Aluguel anual', T: 'Aluguel temporada' };
  // ---------------------------------------------------------------- FICHA_IB: ficha completa do Imobibrasil (imoveis_ficha.campos, robô de fichas)
  const FIB = 'imoveis_ficha';
  const fichaIB = (a) => { const d = (H.S[FIB] || {})[a]; return (d && d.campos) || null; };
  const txtIB = (v) => { v = v == null ? '' : String(v).replace(/\s*\(\d+\)$/, '').trim(); return v && v !== '0' && !/^selecione/i.test(v) ? v : ''; };
  const numIB = (v) => { if (v == null || v === '') return null; const t = String(v).replace(/[^\d.,-]/g, ''); if (!t) return null; const n = Number(/,/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t); return isNaN(n) || n === 0 ? null : n; };
  const semHtml = (h) => String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
  function ibDet(a) { const c = fichaIB(a); if (!c) return null; const o = {};
    const n = (k, ck) => { const v = numIB(c[ck]); if (v != null) o[k] = v; };
    n('dormitorios', 'dormitorios'); n('suites', 'suites'); n('banheiros', 'banheiros'); n('vagas', 'garagem'); n('salas', 'salas');
    n('area_util', 'privativa'); n('area_total', 'total'); n('terreno', 'terreno'); n('condominio', 'condominio'); n('iptu', 'iptu'); n('valor_m2', 'valor_m2'); n('ano', 'anoconstrucao');
    ['edificio', 'pavimento', 'complemento', 'cep', 'tarja', 'disponibilidade'].forEach((k) => { const v = txtIB(c[k]); if (v) o[k] = v; });
    const mb = txtIB(c.mobiliado); if (mb) o.mobiliado = mb; const e = txtIB(c.emp_nome); if (e) o.emp_nome = e;
    try { const L = typeof c.caracItens === 'string' && c.caracItens.charAt(0) === '[' ? JSON.parse(c.caracItens) : Array.isArray(c.caracItens) ? c.caracItens : []; if (L.length) o.carac = L.map(String); } catch (x) { }
    const ds = semHtml(c.descricao); if (ds) o.descricao = ds; return o; }
  const finDe = (id) => (String(id).match(/_([AVT])(?:_\d+)?$/) || [])[1] || '';
  const brl2 = (v) => v == null || isNaN(v) ? '-' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const valFin = (f, v) => v == null ? '-' : f === 'V' ? brl0(v) : brl2(v);
  const m2 = (v) => String(v).replace('.', ',') + ' m²';
  // junta os anúncios da unidade: primeiro valor de cada campo do detalhe e a soma das listas (cômodos, itens do condomínio, posição)
  function anuInfo(u) { const I = H.S.imoveis || {}; const L = (u.anuncios || []).map((a) => I[a] && Object.assign({ _id: a }, I[a])).filter(Boolean)
      .sort((a, b) => (b.ativo ? 1 : 0) - (a.ativo ? 1 : 0)); const det = {}; const car = H.car || {};
    L.forEach((x) => { const d = car.det ? car.det(x._id) : null; if (!d) return; Object.entries(d).forEach(([k, v]) => { if (v == null || v === '') return;
      if (Array.isArray(v)) det[k] = [...new Set((det[k] || []).concat(v))]; else if (det[k] == null) det[k] = v; }); });
    L.forEach((x) => { const d = ibDet(x._id); if (!d) return; Object.entries(d).forEach(([k, v]) => { if (v == null || v === '') return;
      if (Array.isArray(v)) det[k] = [...new Set((det[k] || []).concat(v))]; else if (det[k] == null) det[k] = v; }); });
    return { L, det }; }
  function valoresHTML(L) { return ['V', 'A', 'T'].map((f) => { const V = L.filter((x) => finDe(x._id) === f);
    return `<div style="display:flex;justify-content:space-between;gap:10px;white-space:nowrap${V.length ? '' : ';color:var(--muted)'}"><span>${FIN_VAL[f]}:</span><span>${V.length ? V.map((x) => valFin(f, x.valor) + (x.ativo ? '' : ' <span class="s" style="display:inline">inativo</span>')).join(' / ') : '-'}</span></div>`; }).join(''); }
  function resumoAnu(A) { const d = A.det; return [d.dormitorios && d.dormitorios + ' dorm.', d.suites && d.suites + (d.suites > 1 ? ' suítes' : ' suíte'), d.vagas && d.vagas + (d.vagas > 1 ? ' vagas' : ' vaga'), d.area_util ? m2(d.area_util) + ' priv.' : d.area && m2(d.area)].filter(Boolean).join(' · '); }
  function blocoAnuncio(u, A) { const fd = (u.ficha && u.ficha.dados) || {}; const temF = CAR_ED.some((k) => fd[k]); if (!A.L.length && !temF) return '';
    const d = Object.assign({}, A.det); const hub = new Set(); CAR_ED.forEach((k) => { const v = numBR(fd[k]); if (v != null) { d[k] = v; hub.add(k); } });
    const mk = (k) => hub.has(k) ? ' <span class="s" style="display:inline">(HUB)</span>' : ''; const n = (v, k) => v == null ? '' : esc(String(v)).replace('.', ',') + mk(k);
    const cel = (rot, v) => `<div><span class="s">${rot}</span>${v || '—'}</div>`; const chips = (L) => (L || []).length ? L.map((x) => `<span class="ci-chip">${esc(x)}</span>`).join('') : '—';
    const enc = [d.condominio != null && 'Condomínio ' + brl2(d.condominio) + mk('condominio'), d.iptu != null && 'IPTU ' + brl2(d.iptu) + mk('iptu')].filter(Boolean);
    const lido = Object.keys(d).length ? [...new Set(A.L.map((x) => { const dd = H.car && H.car.det ? H.car.det(x._id) : null; return dd && dd.lido_em; }).filter(Boolean))].sort().pop() : '';
    return `<h3 class="ci-sec">Características e valores<span class="s">${A.L.length ? 'do anúncio do site: ' + esc(A.L.map((x) => x.ref + ' · ' + (FIN[finDe(x._id)] || '')).join(' | ')) + (lido ? ' · lido em ' + dt(lido) : '') : ''}${hub.size ? (A.L.length ? ' · ' : '') + '(HUB) = editado no cadastro, vale sobre o anúncio' : ''}</span></h3><div class="card"><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">
      ${((d.foto_url && !/^https?:/i.test(d.foto_url)) || A.L.some((x) => window.HUB_FICHA && window.HUB_FICHA.capa && window.HUB_FICHA.capa(x._id))) && A.L[0] ? `<img src="${esc((window.HUB_FICHA && window.HUB_FICHA.capa && A.L.map((x) => window.HUB_FICHA.capa(x._id)).find(Boolean)) || d.foto_url)}" alt="Foto do anúncio ${esc(A.L[0].ref)}" loading="lazy" style="width:220px;max-width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:6px;border:1px solid var(--line)">` : ''}
      <div style="flex:1;min-width:220px"><div class="ci-dl">${cel('Valores', valoresHTML(A.L))}${cel('R$/m² (área privativa)', m2HTML(A.L))}${cel('Encargos', enc.join('<br>'))}${cel('Tipo', esc(cap((A.L[0] && A.L[0].tipo) || (u.d && u.d.tipo) || '')))}
        ${cel('Dormitórios', n(d.dormitorios, 'dormitorios'))}${cel('Suítes', n(d.suites, 'suites'))}${cel('Banheiros', n(d.banheiros, 'banheiros'))}${cel('Vagas', n(fd.vagas || d.vagas, fd.vagas ? 'vagas' : ''))}
        ${cel('Área privativa', d.area_util ? esc(m2(d.area_util)) : '')}${cel('Área', d.area && d.area !== d.area_util ? esc(m2(d.area)) : '')}${cel('Área total', d.area_total ? esc(m2(d.area_total)) : '')}${cel('Terreno', d.terreno ? esc(m2(d.terreno)) : '')}</div>
        <div class="ci-dl" style="margin-top:8px">${cel('Edifício / condomínio', esc(d.edificio || d.emp_nome || ''))}${cel('Complemento', esc(d.complemento || ''))}${cel('Pavimento', esc(d.pavimento || ''))}${cel('Salas', n(d.salas, ''))}
          ${cel('Mobiliado', esc(d.mobiliado || ''))}${cel('Ano de construção', d.ano ? esc(String(d.ano)) : '')}${cel('CEP', esc(d.cep || ''))}${cel('Tarja no site', esc(d.tarja || ''))}</div>
        <div class="ci-dl" style="margin-top:8px">${cel('Cômodos', chips(d.comodos))}${cel('Itens do condomínio', chips(d.cond_itens))}${cel('Posição solar', chips(d.posicao))}${(d.comodos || []).length || (d.cond_itens || []).length ? '' : cel('Características (Imobibrasil)', chips(d.carac))}</div>
        ${d.descricao ? `<details class="ci-desc"><summary>Descrição do anúncio</summary><div style="white-space:pre-line;margin-top:6px">${esc(d.descricao)}</div></details>` : ''}
        ${Object.keys(A.det).length || !A.L.length ? '' : '<p class="nota" style="margin:8px 0 0">Características ainda não coletadas da página do anúncio (rotina do Mapa); dá para preencher em "Editar dados".</p>'}</div></div></div>` + (window.HUB_FICHA && A.L.length ? window.HUB_FICHA.bloco(A.L, A.det) : ''); }

  // ---------------------------------------------------------------- perfil
  function perfil(u) {
    const d = Object.assign({}, u.d, (u.ficha && u.ficha.dados) || {}); const I = H.S.imoveis || {}, C = H.S.contratos_locacao || {}, V = H.S.vendas || {}, PCs = H.S[PC] || {};
    const ed = F.edit && H.db(); const A = anuInfo(u);
    const endTxt = [d.logradouro ? titulo(d.logradouro) + (d.numero ? ', ' + d.numero : '') : '', d.unidade, d.bairro, d.cidade].filter(Boolean).join(', ');
    // (25/10/2026, pedido do Cleiton) endereço completo do link-mapa (rua, número, bairro, cidade, CEP; link do Maps colado vale sobre tudo),
    // 📍 Google Maps e 🗺 mapa do HUB — o mesmo que aparece em Anúncios do site
    const an0 = A.L[0] && A.L[0]._id; let rc = null; try { const LM = window.HUB_LINKMAPA; rc = an0 && LM && LM.imovel ? LM.imovel(an0) : null; } catch (e) { rc = null; }
    const endCompleto = rc && rc.consulta && rc.qual !== 'so_bairro' ? rc.consulta : '';
    const alvoMapa = an0 ? 'i-' + an0 : u.cods[0] ? 'l-' + u.cods[0] : u.vendas[0] ? 'v-' + u.vendas[0] : '';
    const mapa = '<span style="white-space:nowrap">' + (typeof H.mapa === 'function' ? (an0 ? H.mapa('imovel', an0) : endTxt ? H.mapa('texto', null, endTxt, { bairro: d.bairro }) : '') : '') + (typeof H.mapaHub === 'function' ? H.mapaHub(alvoMapa) : '') + '</span>';
    const campo = (rot, v) => `<div><span class="s">${rot}</span>${v || '—'}</div>`;
    const dados = ed ? formDados(u, d) : `<div class="ci-dl">${campo('Endereço', esc(d.logradouro ? titulo(d.logradouro) + (d.numero ? ', ' + d.numero : '') : '') + mapa + (endCompleto ? `<span class="s">completo: ${esc(endCompleto)}${rc.link_maps ? ' · link do Maps colado' : ''}</span>` : ''))}${campo('Unidade', esc(titulo(d.unidade || '')) + (d.bloco ? ' · bloco ' + esc(String(d.bloco).toUpperCase()) : ''))}
        ${campo('Empreendimento', empLink(u))}${campo('Bairro · cidade', esc([titulo(d.bairro || ''), titulo(d.cidade || '')].filter(Boolean).join(' · ')))}${campo('Tipo', esc(cap(d.tipo || (A.L[0] && A.L[0].tipo) || '')))}
        ${campo('Matrícula', esc([d.matricula, d.cartorio].filter(Boolean).join(' · ')))}${campo('Área privativa', esc(d.area_privativa || '') || (A.det.area_util ? esc(m2(A.det.area_util)) + ' <span class="s" style="display:inline">(anúncio)</span>' : ''))}${campo('Vagas', esc(d.vagas || '') || (A.det.vagas ? esc(A.det.vagas) + ' <span class="s" style="display:inline">(anúncio)</span>' : ''))}
        ${campo('Inscrição imobiliária (IPTU)', esc(d.inscricao_imobiliaria || ''))}${campo('Código CASAN', esc(d.codigo_casan || ''))}${campo('Código CELESC', esc(d.codigo_celesc || ''))}</div>
        ${d.descricao ? `<p class="nota" style="margin:8px 0 0">${esc(d.descricao)}</p>` : ''}${u.ficha && u.ficha.obs ? `<p class="nota" style="margin:6px 0 0"><b>Observação:</b> ${esc(u.ficha.obs)}</p>` : ''}`;
    const acoes = H.db() ? (ed ? `<button class="btn" data-ci-salvar="${esc(u.id)}">Salvar</button><button class="btn" data-ci-edit="0">Cancelar</button>` : `<button class="btn" data-ci-edit="1">Editar dados</button><button class="btn" data-ci-juntabusca="1">Juntar com outro imóvel…</button>`) : '';
    const cab = `<div class="filtros" style="margin-bottom:10px"><button class="btn" data-ci-voltar="1">← Voltar à lista</button></div>
      <div class="card" style="border-color:var(--accent)"><div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start"><div style="flex:1;min-width:220px"><h2 style="margin:0;font-size:16px;letter-spacing:.06em">${esc(u.titulo)}</h2>${u.ficha && u.ficha.apelido ? `<div class="s">${esc(u.ficha.apelido)}</div>` : ''}<div style="margin-top:6px">${u.sit.map(chip).join('')}${seloDv(u)}${temDest(u) ? chip({ t: '⭐ destaque no site', c: 'dest' }) : ''}${u.inc ? chip({ t: 'endereço incompleto', c: 'al' }) : ''}</div></div><div class="filtros" style="margin:0">${acoes}</div></div>
      ${F.erro ? `<p style="color:var(--bad);margin:8px 0 0">${esc(F.erro)}</p>` : ''}<div style="margin-top:10px">${dados}</div>${F.junta === u.id ? juntaBusca(u) : ''}</div>`;
    // locações
    const loc = u.cods.map((c) => { const x = C[c]; if (!x) return ''; const pl = x.planilha || {}, al = x.alude || {};
      const pes = (txt, papel) => { const P = window.HUB_PESSOAS; try { const h = P && P.html ? P.html(String(txt || ''), { fonte: 'contrato', cod: c, papel }) : ''; return h || esc(txt || ''); } catch (e) { return esc(txt || ''); } };
      return `<li><button class="ci-lk" data-ci-ir="carteira|car-${esc(c)}"><b>${esc(c)}</b></button> — locador ${pes(pl.locador || al.locador, 'locador')} · locatário ${pes(pl.locatario || al.locatario, 'locatario')}${pl.inicio || al.inicio ? ` · desde ${dt(pl.inicio || al.inicio)}` : ''}</li>`; }).join('');
    // vendas e contratos
    const ven = u.vendas.map((v) => { const x = V[v]; if (!x) return ''; return `<li><button class="ci-lk" data-ci-ir="vendas|ven-${esc(v)}">${dt(x.data)} · ${esc(titulo(x.tipo || ''))}</button> — ${esc(titulo(x.vendedor || ''))} × ${esc(titulo(x.comprador || ''))}${x.valor_transacao ? ' · ' + brl0(x.valor_transacao) : ''}</li>`; }).join('');
    // anúncios
    const anu = u.anuncios.map((a) => { const x = I[a]; if (!x) return ''; return `<li>${x.ativo ? `<button class="ci-lk" data-ci-anu="${esc(a)}" title="Abrir em Anúncios do site"><b>${esc(x.ref)}</b> · ${esc(FIN[finDe(a)] || x.finalidade || '')}</button>` : `<b>${esc(x.ref)}</b> · ${esc(FIN[finDe(a)] || x.finalidade || '')}`} ${x.ativo ? '<span class="ci-chip anu">ativo</span>' : '<span class="ci-chip">inativo</span>'}${botaoSite(a, x)}${botaoDestaque(a, x)} ${x.valor != null ? valFin(finDe(a), x.valor) : ''}${x.cadastrado_em ? ' · cadastrado em ' + dt(x.cadastrado_em) : ''}${x.atualizado_em ? ' · atualizado em ' + dt(x.atualizado_em) : ''}${x.corretor ? ' · agenciado por ' + pesLink(x.corretor, { fonte: 'corretor' }) : ''}${x.link_site ? ` · <a class="ci-lk" href="${escUrl(x.link_site)}" target="_blank" rel="noopener">site</a>` : ''}${x.imobibrasil_id ? ` · <a class="ci-lk" href="${IMOB}${encodeURIComponent(x.imobibrasil_id)}" target="_blank" rel="noopener" title="Cadastro no painel do Imobibrasil (precisa estar logado)">Imobibrasil</a>` : ''}${x.proprietario ? ' · proprietário ' + pesLink(x.proprietario, { fonte: 'imovel', id: a }) : ''}</li>`; }).join('');
    // pastas e pessoas dos contratos lidos
    const pcs = [...new Set(u.pcs)].map((p) => PCs[p]).filter(Boolean);
    const pastas = pcs.map((p) => `<li>${esc(p.nome_pasta)} <a class="btn pasta" href="abrirpasta:${encodeURIComponent(p.caminho)}" target="_blank" rel="noopener" data-abrir-pasta="${esc(p.caminho)}" title="Abre a pasta no Explorador e copia o caminho">Abrir pasta</a><span class="s">${(p.contratos || []).map((c) => esc(c.tipo) + (c.assinado ? ' ✓' : '')).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}</span></li>`).join('');
    const pessoas = {}; pcs.forEach((p) => (p.partes || []).forEach((x) => { const k = nrm(x.nome); const q = pessoas[k] = pessoas[k] || { nome: x.nome, pap: new Set(), pc: p._id };
      (x.papeis || []).forEach((z) => q.pap.add(z)); }));
    u.anuncios.forEach((a) => { const x = I[a]; if (x && x.proprietario) { const k = nrm(x.proprietario); const q = pessoas[k] = pessoas[k] || { nome: x.proprietario, pap: new Set(), anu: a }; q.pap.add('proprietário (site)'); } });
    const pesL = Object.values(pessoas).sort((a, b) => String(a.nome).localeCompare(String(b.nome))).map((q) => `<li>${pesLink(q.nome, q.pc ? { fonte: 'pc', id: q.pc } : { fonte: 'imovel', id: q.anu })} <span class="s" style="display:inline">${esc([...q.pap].map((z) => PAP[z] || z).join(', '))}</span></li>`).join('');
    const bloco = (tit, sub, html) => html ? `<h3 class="ci-sec">${tit}${sub ? `<span class="s">${sub}</span>` : ''}</h3><div class="card"><ul class="ci-lista">${html}</ul></div>` : '';
    const obs = H.db() ? `<h3 class="ci-sec">Observações</h3><div class="card"><textarea id="ci-obs" rows="2" style="width:100%;box-sizing:border-box;font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink)" placeholder="Ex.: chaves com o síndico; sem dados pessoais">${esc(F.draft.obs != null ? F.draft.obs : ((u.ficha && u.ficha.obs) || ''))}</textarea><div class="filtros" style="margin:6px 0 0"><button class="btn" data-ci-obs="${esc(u.id)}">Salvar observação</button></div></div>` : '';
    return cab + blocoAnuncio(u, A) + bloco('Locações', 'Carteira', loc) + bloco('Vendas e contratos', 'planilha V. Claude', ven) + bloco('Pessoas', 'partes dos contratos e proprietário no site — clique para o cadastro', pesL)
      + bloco('Pastas', 'contratos lidos', pastas) + bloco('Anúncios no site', 'Imobibrasil · cadastro único no site próprio', anu ? blocoSite(u) + anu : '') + bloco('Placa e lazer', 'placa da Vivere e fotos das áreas de lazer — o corretor responde pelo app ou pela Vivian', dvLista(u)) + obs
      + `<p class="nota" style="margin-top:10px">Fontes juntadas neste cadastro: ${esc([...new Set(u.rs.map((r) => ({ pc: 'contrato da pasta', car: 'Carteira', ven: 'Vendas', anu: 'anúncio do site', ficha: 'ajuste no HUB' })[r.src]))].join(' · '))}.</p>`;
  }
  // ---------------------------------------------------------------- edição, novo, juntar
  const st = 'padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;width:100%;box-sizing:border-box';
  const CAMPOS = [['apelido', 'Nome do imóvel (como a equipe chama)', 'Ex.: Apto do Zapparoli'], ['tipo', 'Tipo', 'Apartamento, casa, terreno, loja, sala, vaga…'], ['logradouro', 'Rua / avenida', ''], ['numero', 'Número', ''], ['unidade', 'Unidade', 'Ex.: Apto 208'], ['bloco', 'Bloco / torre', ''], ['empreendimento', 'Empreendimento', ''], ['bairro', 'Bairro', ''], ['cidade', 'Cidade', 'Florianópolis'], ['matricula', 'Matrícula', ''], ['cartorio', 'Cartório', 'Ex.: 2º Ofício de Registro de Imóveis'], ['area_privativa', 'Área privativa', 'Ex.: 85,32 m²'], ['vagas', 'Vagas / box', ''],
    ['dormitorios', 'Dormitórios', ''], ['suites', 'Suítes', ''], ['banheiros', 'Banheiros', ''], ['condominio', 'Condomínio (R$ por mês)', 'Ex.: 840,00'], ['iptu', 'IPTU (R$ por ano)', 'Ex.: 1.630,00'],
    ['inscricao_imobiliaria', 'Inscrição imobiliária (cadastro do IPTU)', 'Como no carnê do IPTU'], ['codigo_casan', 'Código CASAN (água)', 'Matrícula na conta da CASAN'], ['codigo_celesc', 'Código CELESC (luz)', 'Unidade consumidora na conta da CELESC']];
  // códigos do imóvel (não são dados pessoais): ficam fora da trava de CPF/telefone, mas só aceitam números e . - / espaço
  const COD_IMV = ['matricula', 'inscricao_imobiliaria', 'codigo_casan', 'codigo_celesc'];
  // características editáveis no HUB: o que for salvo aqui vale sobre o anúncio do site (20/10/2026)
  const CAR_ED = ['dormitorios', 'suites', 'banheiros', 'condominio', 'iptu'];
  const numBR = (s) => { if (s == null || s === '') return null; if (typeof s === 'number') return s; const t = String(s).trim(); const n = Number(/,/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/\.(?=\d{3}\b)/g, '')); return isNaN(n) ? null : n; };
  const dv = (k, v) => (k in F.draft ? F.draft[k] : (v == null ? '' : v));
  const inp = (k, v, ph) => `<input id="ci-e-${k}" data-ci-campo="${k}" value="${esc(dv(k, v))}" placeholder="${esc(ph || '')}" style="${st}">`;
  const val = (k) => { const el = document.getElementById('ci-e-' + k); return el ? el.value.trim() : (k in F.draft ? String(F.draft[k]).trim() : ''); };
  function formDados(u, d) { const ad = u ? anuInfo(u).det : {}; const phA = (k, ph) => { const v = k === 'vagas' ? ad.vagas : k === 'area_privativa' ? (ad.area_util && m2(ad.area_util)) : ad[k]; return v != null && v !== '' ? 'anúncio: ' + (k === 'condominio' || k === 'iptu' ? brl2(v) : v) : ph; };
    return `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">${CAMPOS.map(([k, t, ph]) => `<label class="nota" style="margin:0">${t}<br>${inp(k, k === 'apelido' ? ((u && u.ficha && u.ficha.apelido) || '') : d[k], phA(k, ph))}</label>`).join('')}</div><p class="nota" style="margin:8px 0 0">O que você salvar aqui prevalece sobre as fontes. Sem dados pessoais.</p>`; }
  function formNovo() { return `<div class="card" style="margin-bottom:14px"><h2 style="margin:0 0 6px">Novo imóvel</h2><p class="nota">Para imóveis que ainda não estão em nenhuma fonte (captação nova, imóvel de cliente, unidade de empreendimento). Se depois ele aparecer num contrato ou anúncio com o mesmo endereço e unidade, o HUB junta sozinho.</p>${formDados(null, {})}
    ${F.erro ? `<p style="color:var(--bad);margin:8px 0 0">${esc(F.erro)}</p>` : ''}<div class="filtros" style="margin:10px 0 0"><button class="btn" data-ci-criar="1">Criar</button><button class="btn" data-ci-novo="0">Cancelar</button></div></div>`; }
  function juntaBusca(u) { const q = nrm(F.draft.junta || ''); const L = q.length < 2 ? [] : todas().filter((o) => o.id !== u.id && nrm([o.titulo, o.emp, o.cods.join(' '), o.anuncios.map((a) => ((H.S.imoveis || {})[a] || {}).ref).join(' ')].join(' ')).includes(q)).slice(0, 8);
    return `<div style="margin-top:10px"><p class="nota" style="margin:0 0 4px">Junte quando dois cadastros forem o mesmo imóvel (ex.: o anúncio do site e o apartamento da locação).</p><input id="ci-junta" type="search" value="${esc(F.draft.junta || '')}" placeholder="Endereço, ref. do anúncio, código…" style="${st}">
      ${L.map((o) => `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0"><span>${esc(o.titulo)}</span>${o.sit.map(chip).join('')}<button class="btn" data-ci-juntar="${esc(o.id)}">Juntar aqui</button></div>`).join('')}</div>`; }
  function dadosForm() { const o = {}; CAMPOS.forEach(([k]) => { if (k !== 'apelido') { const v = val(k); if (v) o[k] = v; } }); return o; }
  async function salvar(id) { const u = unidade(id); if (!u) return; const dados = dadosForm(); const ap = val('apelido');
    const fid = u.ficha ? u.id : 'f-' + slug(u.titulo || u.id).slice(0, 40) + '-' + hash(u.keys.join('|'));
    const chaves = u.ficha ? (u.ficha.chaves || []) : u.keys.filter((k) => !k.startsWith('f:'));
    if (await grava(fid, { dados, apelido: ap, chaves }, 'dados do imóvel editados', !u.ficha)) { F.edit = false; F.draft = {}; F.sel = fid; H.pede(); } }
  async function criar() { const dados = dadosForm(); if (!dados.logradouro && !dados.empreendimento) { F.erro = 'Informe ao menos a rua ou o empreendimento.'; H.pede(); return; }
    const id = 'f-' + slug([dados.logradouro, dados.numero, dados.unidade].filter(Boolean).join(' ')).slice(0, 40) + '-' + hash(JSON.stringify(dados) + Date.now());
    const ek = empK(dados.empreendimento, ''); const e = { log: dados.logradouro, num: String(dados.numero || '').replace(/\D/g, ''), uni: uniDe(dados.unidade || '', dados.tipo), bloco: nrm(dados.bloco || '').slice(0, 3), mat: dados.matricula, ofi: ordem(dados.cartorio), ek };
    if (await grava(id, { dados, apelido: val('apelido'), chaves: chaves(e), manual: true }, 'imóvel criado', true)) { F.novo = false; F.draft = {}; F.sel = id; H.pede(); } }
  async function juntar(outro) { const u = unidade(F.sel), o = unidade(outro); if (!u || !o) return;
    if (!confirm(`Juntar "${o.titulo}" em "${u.titulo}"? Os anúncios, contratos e pessoas passam para este cadastro.`)) return;
    const fid = u.ficha ? u.id : 'f-' + slug(u.titulo || u.id).slice(0, 40) + '-' + hash(u.keys.join('|'));
    const base = u.ficha ? (u.ficha.chaves || []) : u.keys.filter((k) => !k.startsWith('f:'));
    const extra = o.keys.filter((k) => !k.startsWith('f:'));
    const ok = await grava(fid, { chaves: [...new Set(base.concat(extra))] }, `juntado com ${o.titulo}`, !u.ficha);
    if (ok && o.ficha) await grava(o.id, { juntar_em: fid }, `juntado em ${u.titulo}`);
    if (ok) { F.sel = fid; F.junta = ''; F.draft = {}; H.pede(); } }

  // ---------------------------------------------------------------- registro e eventos (prefixo data-ci-)
  const vai = () => setTimeout(() => { const el = document.getElementById('conteudo'); if (el) window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 8)); }, 40);
  // as duas abas usam a mesma lista; trocar de aba volta para a lista (a ficha aberta numa não fica presa na outra)
  const emModo = (m) => () => { if (MODO !== m) { MODO = m; F.sel = ''; F.edit = false; F.novo = false; F.draft = {}; F.erro = ''; F.junta = ''; F.pg = 0; ORD = null; } return render(); };
  H.registrar({ id: ID, aba: 'Imóveis', grupo: 'cadastros', colecoes: [PC, CF, 'imoveis', 'site_config', FIB, 'contratos_locacao', 'vendas', 'empreendimentos_fichas', 'documentos', DVC, DVP, DVA],
    render: emModo('com'), foco(alvo) { if (alvo) { MODO = 'com'; F.sel = alvo; F.edit = false; F.draft = {}; F.erro = ''; F.junta = ''; vai(); } },
    busca(q) { const t = nrm(q); if (t.length < 2) return []; const I = H.S.imoveis || {};
      return todas().filter((u) => nrm([u.titulo, u.emp, u.d.bairro, u.cods.join(' '), u.anuncios.map((a) => (I[a] || {}).ref).join(' '), u.d.matricula, (u.ficha && u.ficha.apelido) || ''].join(' ')).includes(t))
        .sort((a, b) => (b.cods.length + b.vendas.length) - (a.cods.length + a.vendas.length)).slice(0, 8)
        .map((u) => ({ grp: 'Imóveis', tit: u.titulo + (u.cods.length ? ' · ' + u.cods.join(', ') : ''), sub: [empNome(u), u.d.bairro, u.sit.map((s) => s.t).join(', ')].filter(Boolean).join(' · '), unidade: u.id })); } });
  document.addEventListener('click', async (e) => {
    const t = (s) => e.target.closest('[data-ci-' + s + ']'); let b;
    if ((b = t('f'))) { F.f = b.dataset.ciF; F.pg = 0; F.sel = ''; H.pede(); return; }
    const ex = e.target.closest('[data-baex]'); if (ex && e.target.closest('#conteudo')) { F.q = ex.dataset.baex; F.pg = 0; F.sel = ''; ORD = null; H.pede(); setTimeout(() => { const el = document.getElementById('ci-q'); if (el) el.value = F.q; }, 30); return; }
    if ((b = t('ord'))) { const k = b.dataset.ciOrd; ORD = !ORD || ORD.k !== k ? { k, dir: 'desc' } : ORD.dir === 'desc' ? { k, dir: 'asc' } : null; F.pg = 0; H.pede(); return; }
    if ((b = t('pg'))) { if (b.disabled) return; F.pg = Math.max(0, F.pg + Number(b.dataset.ciPg)); H.pede(); return; }
    if ((b = t('sel'))) { if (!F.sel) F.y = window.scrollY; F.sel = b.dataset.ciSel; F.edit = false; F.draft = {}; F.erro = ''; F.junta = ''; H.pede(); vai(); return; }
    if ((b = t('voltar'))) { F.sel = ''; F.edit = false; F.draft = {}; F.erro = ''; F.junta = ''; H.pede(); const y = F.y; setTimeout(() => window.scrollTo(0, y), 40); return; }
    if ((b = t('edit'))) { F.edit = b.dataset.ciEdit === '1'; F.draft = {}; F.erro = ''; H.pede(); return; }
    if ((b = t('salvar'))) { b.disabled = true; await salvar(b.dataset.ciSalvar); return; }
    if ((b = t('novo'))) { F.novo = b.dataset.ciNovo === '1'; F.sel = ''; F.draft = {}; F.erro = ''; H.pede(); return; }
    if ((b = t('criar'))) { b.disabled = true; await criar(); return; }
    if ((b = t('juntabusca'))) { F.junta = F.junta ? '' : F.sel; F.draft.junta = ''; H.pede(); setTimeout(() => { const el = document.getElementById('ci-junta'); if (el) el.focus(); }, 40); return; }
    if ((b = t('juntar'))) { await juntar(b.dataset.ciJuntar); return; }
    if ((b = t('obs'))) { const el = document.getElementById('ci-obs'); const v = el ? el.value.trim() : ''; const u = unidade(b.dataset.ciObs); if (!u) return; b.disabled = true;
      const fid = u.ficha ? u.id : 'f-' + slug(u.titulo || u.id).slice(0, 40) + '-' + hash(u.keys.join('|'));
      if (await grava(fid, u.ficha ? { obs: v } : { obs: v, chaves: u.keys.filter((k) => !k.startsWith('f:')), dados: {} }, 'observação', !u.ficha)) { F.sel = fid; F.draft = {}; H.pede(); } return; }
    if ((b = t('ir'))) { const [aba, linha] = b.dataset.ciIr.split('|'); H.irPara(aba, linha || ''); return; }
    if ((b = t('dest'))) { b.disabled = true; await marcaDestaque(b.dataset.ciDest, b.dataset.ciDestLiga === '1'); return; }
    if ((b = t('site'))) { b.disabled = true; await marcaSite(b.dataset.ciSite, b.dataset.ciSiteLiga === '1'); return; }
    if ((b = t('unir'))) { b.disabled = true; await unirRefs(b.dataset.ciUnir, true); b.disabled = false; return; }
    if ((b = t('separa'))) { b.disabled = true; await unirRefs(b.dataset.ciSepara, false); return; }
    if ((b = t('anu'))) { const x = (H.S.imoveis || {})[b.dataset.ciAnu] || {}; H.abrirImovel([b.dataset.ciAnu], 'Anúncio ' + (x.ref || '')); return; }
    if ((b = t('emp'))) { H.irPara('empreendimentos', '', b.dataset.ciEmp); return; }
  });
  document.addEventListener('change', (e) => { const el = e.target; if (!el) return; if (el.id === 'ci-tp') { F.tp = el.value; F.pg = 0; H.pede(); } });
  let tq = null; document.addEventListener('input', (e) => { const el = e.target; if (!el) return;
    if (el.dataset && el.dataset.ciCampo) { F.draft[el.dataset.ciCampo] = el.value; return; }
    if (el.id === 'ci-obs') { F.draft.obs = el.value; return; }
    const reFoca = (id, v) => setTimeout(() => { const x = document.getElementById(id); if (x) { x.focus(); x.setSelectionRange(v.length, v.length); } }, 30);
    if (el.id === 'ci-junta') { const v = el.value; F.draft.junta = v; clearTimeout(tq); tq = setTimeout(() => { H.pede(); reFoca('ci-junta', v); }, 250); return; }
    if (el.id !== 'ci-q') return; clearTimeout(tq); const v = el.value; tq = setTimeout(() => { F.q = v; F.pg = 0; H.pede(); reFoca('ci-q', v); }, 300); });
})();
/* m2-privativa-20261107: R$/m² de área privativa (HUB.m2) */
