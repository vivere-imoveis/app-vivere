// modulos/link-mapa.js — módulo "Link do mapa" do HUB Vivere (construção link-mapa, 18-19/10/2026).
// Gera, na hora, o link do Google Maps de cada imóvel (coleção `imoveis`) e de cada empreendimento (`empreendimentos_fichas`),
// a partir do endereço cadastrado. Nada de chave de API, nada de geocodificação: o link é o endereço na URL.
//   - Aba "Links de mapa" (grupo Imóveis): imóveis e empreendimentos, qualidade do endereço, abrir/copiar link e corrigir.
//   - Botão 📍 no fim de todo endereço do HUB (núcleo e Empreendimentos, desde 19/10/2026) usa HUB_LINKMAPA; o selo da
//     coluna Situação saiu a pedido do Cleiton.
//   - Correções feitas aqui ficam em `link-mapa_enderecos` (bloco `manual`) — nunca em `imoveis` (regravada pelo coletor)
//     nem no Imobibrasil. A rotina do módulo grava o bloco `imob` (CEP lido do Imobibrasil, só leitura).
//   - Regra (igual à do link_mapa.py): vale o endereço mais completo (logradouro + número + CEP); correção do HUB vence
//     se for mais completa, ou igual e mais nova que a última edição do cadastro. Imóvel sem endereço próprio usa o do
//     empreendimento ligado a ele, quando este for mais completo; empreendimento sem endereço completo herda o dos próprios
//     imóveis (Imobibrasil) quando todos os completos coincidem.
// 25/10/2026 (pedido do Cleiton): a aba "Links de mapa" saiu; a lista virou a seção "Links de mapa e localização" no fim da aba
//   Mapa (HUB_LINKMAPA.secao, chamada pelo módulo mapa). Cada linha ganhou o campo "Link do Maps": link do Google Maps (ou
//   coordenadas) colado ali fica em `link-mapa_enderecos/<doc>.mapa_link` {url, lat, lng, curto, em, por}; o 📍 passa a abrir
//   esse link e o Mapa usa as coordenadas para o ponto. Link curto (maps.app.goo.gl) não se converte na página (conexões
//   externas bloqueadas): fica guardado e o ponto só muda depois da conversão (rotina com o PC) ou com o link completo.
//   A regra de endereço (_regra, espelhada em link_mapa.py) não muda: o link colado só entra na API pública e na lista.
// Contrato: _hub\modulos\LEIA-ME.md. Expõe window.HUB_LINKMAPA (url/resolver) para o botão 📍 e o módulo Mapa.
(function () {
  const H = window.HUB; if (!H) return;
  const ID = 'link-mapa', COL = 'link-mapa_enderecos', CF = 'empreendimentos_fichas';
  const esc = H.esc, dt = H.dt;
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // ------------------------------------------------------------ regra (espelhada em link_mapa.py)
  const UF_CIDADE = { 'gramado': 'RS', 'canela': 'RS', 'porto alegre': 'RS', 'santa cruz do sul': 'RS' };
  const t = (v) => { v = v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); return /^(n[ãa]o informado|-|—|null|undefined)$/i.test(v) ? '' : v; };
  const soCep = (v) => { const d = t(v).replace(/\D/g, ''); return d.length === 8 ? d.slice(0, 5) + '-' + d.slice(5) : ''; };
  const soNum = (v) => { v = t(v).replace(/^n[ºo°.]*\s*/i, ''); return /^(s\/?n|sn|0)$/i.test(v) ? '' : v; };
  // "Rua X, 176 — 404 (Estúdio WOK)" → {log, num, nome}; também "Rua X, nº 89", "Rua X, s/n", "(Allure)"
  function partes(end) {
    let s = t(end), nome = '';
    const m = s.match(/\(([^()]*)\)\s*$/); if (m) { nome = t(m[1]); s = t(s.slice(0, m.index)); }
    s = t(s.split(' — ')[0]);
    let log = s, num = '';
    const k = s.match(/^(.*?),\s*((?:n[ºo°.]*\s*)?(?:\d+[A-Za-z]?|s\/?n))\s*$/i);
    if (k) { log = t(k[1]); num = soNum(k[2]); }
    return { log, num, nome };
  }
  const pontos = (c) => (c.log ? 1 : 0) + (c.num ? 2 : 0) + (c.cep ? 1 : 0);
  function qualidade(c) {
    if (c.log && c.num && c.cep) return 'completo';
    if (c.log && c.num) return 'sem_cep';
    if (c.log || c.nome) return 'aproximado';
    if (c.bairro) return 'so_bairro';
    return 'sem_endereco';
  }
  function consulta(c) {
    const cid = t(c.cidade) || 'Florianópolis', uf = UF_CIDADE[cid.toLowerCase()] || 'SC';
    const cidUf = cid + ' - ' + uf, b = t(c.bairro);
    let p = [];
    if (c.log && c.num) p = [c.log + ', ' + c.num + (b ? ' - ' + b : ''), cidUf];
    else if (c.log) p = [c.log, c.nome, b, cidUf];
    else if (c.nome) p = [c.nome, b, cidUf];
    else if (b) p = [b, cidUf];
    else return '';
    if (c.cep) p.push(c.cep);
    return p.filter(Boolean).join(', ');
  }
  const urlDe = (q) => q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '';
  const vazioM = (m) => !m || !['logradouro', 'numero', 'cep', 'bairro', 'cidade'].some((k) => t(m[k]));
  function aplicaManual(base, man) {
    const c = Object.assign({}, base);
    if (t(man.logradouro)) { c.log = t(man.logradouro); c.num = soNum(man.numero); c.nome = base.nome; }
    else if (soNum(man.numero)) c.num = soNum(man.numero);
    if (soCep(man.cep)) c.cep = soCep(man.cep);
    if (t(man.bairro)) c.bairro = t(man.bairro);
    if (t(man.cidade)) c.cidade = t(man.cidade);
    return c;
  }
  // decide se a correção do HUB vale: mais completa, ou igual e mais nova que a última edição do cadastro
  function comManual(base, man, editadoCadastro) {
    if (vazioM(man)) return { c: base, manual: null };
    const m = aplicaManual(base, man);
    const igual = ['log', 'num', 'cep', 'bairro', 'cidade'].every((k) => t(m[k]) === t(base[k]));
    if (igual) return { c: base, manual: 'igual' };
    const pm = pontos(m), pb = pontos(base);
    if (pm > pb || (pm === pb && String(man.em || '') >= String(editadoCadastro || ''))) return { c: Object.assign(m, { origem: 'hub' }), manual: 'vale' };
    return { c: base, manual: 'superada' };
  }
  const valF = (x, k) => (x && x.manual && x.manual[k] && x.manual[k].valor != null) ? x.manual[k].valor : (x ? x[k] : null);

  // endereço do imóvel só pelo Imobibrasil (sem empreendimento e sem correção) — usado na herança empreendimento <- imóveis
  function baseImovel(id, S) {
    const x = (S.imoveis || {})[id]; if (!x) return null;
    const ib = (((S[COL] || {})['i-' + id]) || {}).imob || {}, p = partes(x.endereco);
    return { log: t(ib.logradouro) || p.log, num: soNum(ib.numero) || p.num, cep: soCep(ib.cep), nome: p.nome, bairro: t(x.bairro), cidade: t(x.cidade) };
  }
  function resolverEmp(slug, S) {
    const x = (S[CF] || {})[slug]; if (!x) return null;
    const p = partes(valF(x, 'endereco'));
    let base = { log: p.log, num: p.num, cep: '', nome: t(valF(x, 'nome')) || t(x.nome), bairro: t(valF(x, 'bairro')), cidade: t(x.cidade), origem: p.log ? 'ficha' : (t(x.nome) ? 'nome' : '') };
    // herança (Cleiton, 19/10/2026): todos os imóveis completos do empreendimento com o MESMO endereço -> o empreendimento usa esse endereço
    const comp = {}; (x.anuncios || []).forEach((a) => { const b = a && a.id ? baseImovel(a.id, S) : null;
      if (b && qualidade(b) === 'completo') comp[b.log + '|' + b.num + '|' + b.cep] = b; });
    const ks = Object.keys(comp);
    if (ks.length === 1 && pontos(comp[ks[0]]) > pontos(base)) { const h = comp[ks[0]];
      base = { log: h.log, num: h.num, cep: h.cep, nome: base.nome, bairro: base.bairro || h.bairro, cidade: base.cidade || h.cidade, origem: 'imoveis' }; }
    const r = comManual(base, ((S[COL] || {})['e-' + slug] || {}).manual, x.editado_em || x.atualizado_em);
    return fecha(r.c, r.manual);
  }
  function resolverImovel(id, S, idx) {
    const x = (S.imoveis || {})[id]; if (!x) return null;
    const d = (S[COL] || {})['i-' + id] || {}, ib = d.imob || {};
    const p = partes(x.endereco);
    let base = { log: t(ib.logradouro) || p.log, num: soNum(ib.numero) || p.num, cep: soCep(ib.cep), nome: p.nome, bairro: t(x.bairro), cidade: t(x.cidade), origem: 'imobibrasil' };
    const slug = idx && idx[id] && idx[id][0], emp = slug ? resolverEmp(slug, S) : null;
    if (emp && emp.log && pontos(emp) > pontos(base)) {
      const keepCep = base.cep && !emp.cep;
      base = { log: emp.log, num: emp.num, cep: emp.cep || (keepCep ? base.cep : ''), nome: emp.nome || base.nome, bairro: emp.bairro || base.bairro, cidade: emp.cidade || base.cidade, origem: 'empreendimento', emp: slug };
    }
    const r = comManual(base, d.manual, x.atualizado_em);
    return fecha(r.c, r.manual, slug);
  }
  function fecha(c, manual, slug) { const q = consulta(c); return Object.assign(c, { qual: qualidade(c), consulta: q, url: urlDe(q), manual: manual, emp_ligado: slug || c.emp || null }); }

  // índice imóvel -> ficha do empreendimento (anúncios da ficha)
  let IDX = null, IDXs = '';
  function idx() { const L = H.S[CF] || {}; const sig = Object.keys(L).length + ':' + JSON.stringify(Object.values(L).map((x) => (x.anuncios || []).length)).length;
    if (IDX && sig === IDXs) return IDX; IDX = {}; IDXs = sig;
    Object.keys(L).sort().forEach((k) => (L[k].anuncios || []).forEach((a) => { if (a && a.id) (IDX[a.id] = IDX[a.id] || []).push(k); })); return IDX; }

  // ---- endereço em texto livre (Carteira, Documentos, objeto de venda) — 19/10/2026, tarefa do núcleo
  // pega do primeiro "Rua/Av./Rod./Estrada/Servidão/Travessa/Alameda/Caminho" até o número; a unidade fica fora; CEP de qualquer um dos textos
  const KW = /(^|[\s(,;\-–—])(rua|r\.|avenida|av\.?|rodovia|rod\.|estrada|estr\.|servid[aã]o|travessa|alameda|caminho)\s/i;
  function deTexto(txt, extra) {
    extra = extra || {}; const textos = [txt].concat(extra.textos || []).filter(Boolean).map(String);
    let cep = soCep(extra.cep); if (!cep) for (const x of textos) { const m = x.match(/\b(\d{5})-?(\d{3})\b/); if (m) { cep = m[1] + '-' + m[2]; break; } }
    let s = t(txt); const k = s.match(KW); if (!k) return null;
    s = t(s.slice(k.index + k[1].length));
    let log = '', num = '';
    const m = s.match(/^(.*?)(?:,|\s)\s*(?:n[ºo°.]*\s*)?(\d{1,5}[A-Za-z]?)(?=$|[\s,.;\-–—)])/i);
    if (m && t(m[1]).length > 3) { log = t(m[1]).replace(/[,\-–—]+$/, ''); num = m[2]; }
    else log = t(s.split(/,|\s[-–—]\s/)[0]);
    const c = { log, num, cep, nome: t(extra.nome), bairro: t(extra.bairro), cidade: t(extra.cidade), origem: 'texto' };
    return fecha(c, null);
  }
  // objeto de venda / nome de pasta: rua e número quando houver; senão o empreendimento citado (Cleiton, 19/10/2026)
  // nome do empreendimento: palavras principais (sem "residencial", "edifício", "club"…), y = i (THAY = Thai), juntas ou separadas (SUNCLUB = Sun Club)
  const GEN = new Set('residencial residence residences residencias residencia resid res casas casa apartamentos unidades edificio ed condominio cond club clube beach home spa boutique the de do da dos das e spe ltda empreendimento complexo torre bloco jurere internacional floripa florianopolis'.split(' '));
  const toks = (x) => norm(x).replace(/y/g, 'i').replace(/([a-z])\1+/g, '$1').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  let NOMES = null, NOMESs = '';
  function nomesEmp() { const L = H.S[CF] || {}; const sig = Object.keys(L).length; if (NOMES && sig === NOMESs) return NOMES; NOMESs = sig; NOMES = [];
    Object.keys(L).forEach((k) => { const x = L[k]; if (x.oculto) return; [valF(x, 'nome'), x.nome].concat(x.nomes || []).filter(Boolean).forEach((n) => {
      const tk = toks(n); let core = tk.filter((w) => !GEN.has(w)); if (!core.length) core = tk;
      if (core.join('').length >= 3) NOMES.push({ k, tk, core, c: core.join(''), full: tk.join('') }); }); });
    return NOMES; }
  // vence o nome com mais palavras em comum com o texto (todas as principais têm de estar lá, separadas ou juntas);
  // pista fraca: só a 1ª palavra marcante do nome (5+ letras), quando nada melhor aparece (ex.: "SUNCLUB" = Sun Club Campeche)
  function empDoTexto(txt, comNota) { const tk = toks(txt), set = new Set(tk), junto = tk.join(''); let best = null, bs = -1e9;
    for (const n of nomesEmp()) {
      const forte = n.core.every((w) => set.has(w)) || (n.full.length >= 6 && junto.includes(n.full)) || (n.c.length >= 6 && n.core.length > 1 && junto.includes(n.c));
      const fraca = !forte && !GEN.has(n.core[0]) && n.core[0].length >= 5 && (set.has(n.core[0]) || (n.core.length > 1 && set.has(n.core[0] + n.core[1])));
      if (!forte && !fraca) continue;
      const sc = (fraca ? -100 : 0) + n.tk.filter((w) => set.has(w)).length * 10 + (junto.includes(n.full) ? 5 : 0) - n.tk.filter((w) => !set.has(w)).length + n.c.length / 100;
      if (sc > bs) { bs = sc; best = n.k; } }
    return comNota ? (best ? { k: best, sc: bs } : null) : best; }
  function deObjeto(txts) {
    txts = [].concat(txts || []).filter(Boolean);
    for (const x of txts) { const r = deTexto(x); if (r && r.num) return r; }
    let me = null; for (const x of txts) { const m = empDoTexto(x, true); if (m && (!me || m.sc > me.sc)) me = m; }
    if (me) { const r = resolverEmp(me.k, H.S); if (r && r.url) return Object.assign(r, { emp_citado: me.k }); }
    for (const x of txts) { const r = deTexto(x); if (r && r.url) return r; }
    return null;
  }

  // ------------------------------------------------------------ link do Google Maps colado (25/10/2026)
  // aceita: link completo (…/@-27.59,-48.54,17z…, …!3d-27.59!4d-48.54…, ?q=-27.59,-48.54, ll=, query=, destination=),
  // coordenadas soltas ("-27.5945, -48.5477") e link curto (guardado sem coordenada)
  function leLinkMaps(txt) {
    const s = t(txt); if (!s) return null;
    const num = (a, b) => { const la = +a, ln = +b; return la < -25 && la > -30.5 && ln < -47.5 && ln > -54.5 ? [Math.round(la * 1e6) / 1e6, Math.round(ln * 1e6) / 1e6] : null; };
    let c = null, m;
    if ((m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/))) c = num(m[1], m[2]);
    if (!c && (m = s.match(/[?&](?:q|query|ll|destination|center)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i))) c = num(m[1], m[2]);
    if (!c && (m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/))) c = num(m[1], m[2]);
    if (!c && (m = s.match(/^\s*(-?\d{1,2}\.\d+)\s*[,; ]\s*(-?\d{1,2}\.\d+)\s*$/))) c = num(m[1], m[2]);
    const ehUrl = /^https?:\/\//i.test(s), curto = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(s);
    if (ehUrl && !/google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(s)) return { erro: 'O link não é do Google Maps.' };
    if (!ehUrl && !c) return { erro: 'Cole um link do Google Maps ou as coordenadas (ex.: -27.5945, -48.5477).' };
    const url = ehUrl ? s : 'https://www.google.com/maps/search/?api=1&query=' + c[0] + ',' + c[1];
    return { url, lat: c ? c[0] : null, lng: c ? c[1] : null, curto: !!(curto && !c) };
  }
  const linkDe = (doc) => ((H.S[COL] || {})[doc] || {}).mapa_link || null;
  function comLink(r, doc) { const ml = r && linkDe(doc); if (ml && ml.url) { r.url = ml.url; r.link_maps = ml; } return r; }

  window.HUB_LINKMAPA = {
    deTexto, deObjeto, empDoTexto, leLinkMaps,
    imovel: (id) => comLink(resolverImovel(id, H.S, idx()), 'i-' + id), empreendimento: (slug) => comLink(resolverEmp(slug, H.S), 'e-' + slug),
    url: (id) => { const r = comLink(resolverImovel(id, H.S, idx()), 'i-' + id); return r ? r.url : ''; },
    secao: () => render(), focoSecao: (alvo, abreLink) => focoLista(alvo, abreLink),
    _regra: { partes, qualidade, consulta, urlDe, comManual, resolverImovel, resolverEmp, pontos },
  };

  // ------------------------------------------------------------ aba
  const QUAL = { completo: ['Completo', 'ok'], sem_cep: ['Sem CEP', 'warn'], aproximado: ['Aproximado', 'warn'], so_bairro: ['Só bairro', 'bad'], sem_endereco: ['Sem endereço', 'bad'] };
  const ORIG = { imobibrasil: 'Imobibrasil', ficha: 'ficha do empreendimento', nome: 'nome do empreendimento', empreendimento: 'endereço do empreendimento', imoveis: 'endereço dos imóveis do empreendimento', hub: 'corrigido no HUB' };
  const F = { vis: 'imoveis', qual: 'pend', st: 'ativos', q: '', pg: 0, edit: null, form: {}, foco: null, salvando: false, erro: '', link: null, linkTxt: '' };
  const pill = (q) => { const z = QUAL[q] || [q, '']; return `<span class="pill ${z[1]}">${esc(z[0])}</span>`; };

  function linhas() {
    const S = H.S, ix = idx();
    if (F.vis === 'imoveis') return Object.keys(S.imoveis || {}).map((id) => { const x = S.imoveis[id], r = resolverImovel(id, S, ix);
      return { id, doc: 'i-' + id, tipo: 'imovel', rot: x.ref || id, sub: (x.tipo || '') + (x.finalidade ? ' · ' + x.finalidade : ''), ativo: !!x.ativo, cad: x.endereco || '', r: comLink(r, 'i-' + id) }; });
    return Object.keys(S[CF] || {}).filter((k) => !(S[CF][k] || {}).oculto).map((k) => { const x = S[CF][k], r = resolverEmp(k, S);
      return { id: k, doc: 'e-' + k, tipo: 'emp', rot: t(valF(x, 'nome')) || x.nome || k, sub: x.construtora_nome || '', ativo: (x.anuncios_ativos || 0) > 0, cad: t(valF(x, 'endereco')), r: comLink(r, 'e-' + k) }; });
  }
  const pend = (r) => r && r.qual !== 'completo';
  function filtra(L) {
    const q = norm(F.q).trim();
    return L.filter((l) => {
      if (F.foco) return l.id === F.foco;
      if (F.vis === 'imoveis' && F.st !== 'todos' && (F.st === 'ativos') !== l.ativo) return false;
      if (F.qual === 'link') return !!l.r.link_maps;
      if (F.qual === 'pend' && !pend(l.r)) return false;
      if (F.qual !== 'pend' && F.qual !== 'todos' && l.r.qual !== F.qual) return false;
      if (q && !norm([l.rot, l.sub, l.cad, l.r.consulta, l.r.bairro].join(' ')).includes(q)) return false;
      return true;
    }).sort((a, b) => (b.ativo - a.ativo) || String(a.rot).localeCompare(String(b.rot), 'pt-BR', { numeric: true }));
  }
  const conta = (L) => { const c = { total: L.length, pend: 0 }; L.forEach((l) => { c[l.r.qual] = (c[l.r.qual] || 0) + 1; if (pend(l.r)) c.pend++; }); return c; };
  const inp = (k, ph, w) => `<input data-lm-campo="${k}" id="lm-f-${k}" value="${esc(F.form[k] || '')}" placeholder="${esc(ph)}" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;width:${w};max-width:100%;box-sizing:border-box">`;
  const sel = (k, arr, v) => `<select data-lm-sel="${k}" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;max-width:100%">${arr.map(([a, b]) => `<option value="${a}" ${a === v ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`;

  function formulario(l) {
    const d = (H.S[COL] || {})[l.doc] || {};
    return `<tr><td colspan="6" style="background:var(--soft)">
      <div class="nota" style="margin:0 0 6px">Correção do endereço usado no link (fica só no HUB; não altera o Imobibrasil nem a ficha). Deixe a unidade (apto/sala) de fora: o link aponta para o prédio.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${inp('logradouro', 'Logradouro (rua, avenida…)', '260px')}${inp('numero', 'Número', '90px')}${inp('cep', 'CEP', '110px')}${inp('bairro', 'Bairro', '170px')}${inp('cidade', 'Cidade', '150px')}
      <button class="btn" data-lm-salvar="${esc(l.doc)}">${F.salvando ? 'Salvando…' : 'Salvar'}</button><button class="btn" data-lm-cancelar="1">Cancelar</button>
      ${d.manual && !vazioM(d.manual) ? `<button class="btn" data-lm-desfazer="${esc(l.doc)}" title="Apaga a correção e volta ao endereço do cadastro">Desfazer correção</button>` : ''}</div>
      ${F.erro ? `<div class="nota" style="margin:6px 0 0;color:var(--bad)">${esc(F.erro)}</div>` : ''}
      ${d.manual && d.manual.em ? `<div class="nota" style="margin:6px 0 0">Última correção: ${esc(dt(d.manual.em))}.</div>` : ''}</td></tr>`;
  }

  function formLink(l) {
    const ml = linkDe(l.doc);
    return `<tr><td colspan="6" style="background:var(--soft)">
      <div class="nota" style="margin:0 0 6px">Cole o link do Google Maps do imóvel (ou as coordenadas). O 📍 passa a abrir esse link e o ponto no mapa vai para lá. No celular: no Maps, toque no prédio → Compartilhar → Copiar link; se vier link curto (maps.app.goo.gl), o ponto só muda depois da conversão — para mudar na hora, toque e segure no prédio e copie as coordenadas que aparecem.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><input data-lm-linktxt="1" id="lm-link-txt" value="${esc(F.linkTxt)}" placeholder="https://maps.google.com/… ou -27.5945, -48.5477" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;flex:1 1 260px;min-width:0;box-sizing:border-box">
      <button class="btn" data-lm-linksalvar="${esc(l.doc)}">${F.salvando ? 'Salvando…' : 'Salvar link'}</button><button class="btn" data-lm-cancelar="1">Cancelar</button>
      ${ml ? `<button class="btn" data-lm-linktirar="${esc(l.doc)}" title="Apaga o link colado e volta ao link montado pelo endereço">Remover link</button>` : ''}</div>
      ${F.erro ? `<div class="nota" style="margin:6px 0 0;color:var(--bad)">${esc(F.erro)}</div>` : ''}
      ${ml && ml.em ? `<div class="nota" style="margin:6px 0 0">Link colado em ${esc(dt(ml.em))}${ml.lat != null ? ' · ponto ' + ml.lat + ', ' + ml.lng : ' · link curto, ponto aguardando conversão'}.</div>` : ''}</td></tr>`;
  }
  function render() {
    if (!H.carregado.imoveis) return H.vazio('Carregando imóveis…');
    const L = linhas(), Lf = filtra(L), c = conta(L);
    const PG = 100, np = Math.max(1, Math.ceil(Lf.length / PG)); if (F.pg >= np) F.pg = np - 1;
    const pag = (H.buscaAba && H.buscaAba.ativa()) ? Lf : Lf.slice(F.pg * PG, F.pg * PG + PG);
    const resumo = (rot, cc, vis) => `<button class="card" data-lm-vis="${vis}" aria-pressed="${F.vis === vis}" style="text-align:left;cursor:pointer;font:inherit;color:inherit;${F.vis === vis ? 'outline:2px solid var(--accent);' : ''}">
      <div class="nota" style="margin:0;text-transform:uppercase;letter-spacing:.12em;font-size:11px">${rot}</div>
      <div style="font-size:26px;margin:4px 0">${cc.completo || 0} <span class="nota" style="font-size:13px">de ${cc.total} completos</span></div>
      <div class="nota" style="margin:0">${cc.pend} a completar · ${cc.sem_cep || 0} sem CEP · ${cc.aproximado || 0} aproximados · ${(cc.so_bairro || 0) + (cc.sem_endereco || 0)} sem endereço</div></button>`;
    const cImv = F.vis === 'imoveis' ? c : conta(Object.keys(H.S.imoveis || {}).map((id) => ({ r: resolverImovel(id, H.S, idx()) })));
    const cEmp = F.vis === 'emps' ? c : conta(Object.keys(H.S[CF] || {}).filter((k) => !(H.S[CF][k] || {}).oculto).map((k) => ({ r: resolverEmp(k, H.S) })));
    const rows = pag.map((l) => { const r = l.r;
      const orig = ORIG[r.origem] || ''; const empTxt = r.origem === 'empreendimento' && r.emp ? ' (' + esc(t(valF((H.S[CF] || {})[r.emp], 'nome')) || r.emp) + ')' : '';
      const sup = r.manual === 'superada' ? ' <span class="pill" title="O cadastro foi atualizado e ficou mais completo ou mais novo que a correção do HUB">correção superada</span>' : '';
      const linha = `<tr id="lm-${esc(l.doc)}"${F.foco === l.id ? ' style="outline:2px solid var(--accent)"' : ''}>
        <td class="cod">${esc(l.rot)}<span class="s">${esc(l.sub)}</span>${l.tipo === 'imovel' && !l.ativo ? '<span class="s">inativo</span>' : ''}</td>
        <td>${esc(r.bairro || '—')}${r.cidade && r.cidade !== 'Florianópolis' ? '<span class="s">' + esc(r.cidade) + '</span>' : ''}</td>
        <td>${r.consulta ? esc(r.consulta) : '<span class="nota">sem endereço</span>'}<span class="s">${orig ? 'Fonte: ' + esc(orig) + empTxt : ''}${l.cad && r.origem !== 'imobibrasil' && r.origem !== 'ficha' && l.cad ? ' · cadastro: ' + esc(l.cad) : ''}</span></td>
        <td style="white-space:nowrap">${esc(r.cep || '—')}</td>
        <td>${pill(r.qual)}${sup}${r.link_maps ? `<br><span class="pill ${r.link_maps.lat != null ? 'ok' : 'warn'}" title="${esc(r.link_maps.url)}">${r.link_maps.lat != null ? 'link do Maps' : 'link curto · a converter'}</span>` : ''}</td>
        <td class="lnk">${r.url ? `<a class="lk site" href="${escUrl(r.url)}" target="_blank" rel="noopener" title="Abrir no Google Maps">Abrir no Maps</a><button class="btn" data-lm-copiar="${esc(r.url)}" style="margin:0 4px 3px 0">Copiar link</button>` : ''}${H.db() ? `<button class="btn" data-lm-corrigir="${esc(l.doc)}" data-lm-id="${esc(l.id)}" data-lm-tipo="${l.tipo}">${r.manual === 'vale' ? 'Editar correção' : 'Corrigir'}</button><button class="btn" data-lm-link="${esc(l.doc)}" style="margin-left:4px">${r.link_maps ? 'Trocar link do Maps' : 'Colar link do Maps'}</button>` : ''}</td></tr>`;
      return linha + (F.edit === l.doc ? formulario(l) : '') + (F.link === l.doc ? formLink(l) : ''); }).join('');
    setTimeout(restauraFoco, 0);
    return `<p class="nota" style="margin-top:8px">Link do Google Maps colado em <b>Colar link do Maps</b> vale sobre todos os outros: o 📍 abre esse link e o ponto no mapa vai para ele. Sem link colado, vale o link montado do endereço do cadastro (Imobibrasil e ficha do empreendimento), apontando para o prédio. Completo = logradouro + número + CEP. Correções feitas aqui ficam só no HUB e valem enquanto forem mais completas, ou iguais e mais novas que a última edição do cadastro. Imóvel sem endereço usa o do empreendimento ligado a ele, e o empreendimento sem endereço usa o dos próprios imóveis quando todos coincidem.</p>
      <div class="grade" style="margin-bottom:14px">${resumo('Imóveis', cImv, 'imoveis')}${resumo('Empreendimentos', cEmp, 'emps')}</div>
      <div class="filtros" style="align-items:center">
        ${sel('qual', [['pend', 'A completar'], ['todos', 'Todos'], ['completo', 'Completos'], ['sem_cep', 'Sem CEP'], ['aproximado', 'Aproximados'], ['so_bairro', 'Só bairro'], ['sem_endereco', 'Sem endereço'], ['link', 'Com link do Maps']], F.qual)}
        ${F.vis === 'imoveis' ? sel('st', [['ativos', 'Ativos'], ['inativos', 'Inativos'], ['todos', 'Ativos e inativos']], F.st) : ''}
        <input id="lm-q" value="${esc(F.q)}" placeholder="Buscar ref., nome, rua, bairro" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;min-width:0;flex:1 1 200px">
        <span class="nota" style="margin:0">${Lf.length} ${F.vis === 'imoveis' ? (Lf.length === 1 ? 'imóvel' : 'imóveis') : (Lf.length === 1 ? 'empreendimento' : 'empreendimentos')}</span>
      </div>
      ${F.foco ? `<div class="aviso" style="margin:0 0 10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span><b>${esc(F.foco)}</b> — os demais filtros ficam de lado.</span><button class="btn" data-lm-semfoco="1">Mostrar todos</button></div>` : ''}
      ${Lf.length ? `<div class="tabela"><table><thead class="quebra"><tr><th>${F.vis === 'imoveis' ? 'Ref.' : 'Empreendimento'}</th><th>Bairro</th><th>Endereço usado no link</th><th>CEP</th><th>Situação</th><th>Link</th></tr></thead><tbody>${rows}</tbody></table></div>` : H.vazio(F.vis === 'emps' && !H.carregado[CF] ? 'Carregando empreendimentos…' : 'Nada com esses filtros.')}
      ${np > 1 ? `<div class="filtros" style="margin-top:10px;align-items:center"><button class="btn" data-lm-pg="${F.pg - 1}" ${F.pg ? '' : 'disabled'}>&lt;</button><span class="nota" style="margin:0">página ${F.pg + 1} de ${np}</span><button class="btn" data-lm-pg="${F.pg + 1}" ${F.pg < np - 1 ? '' : 'disabled'}>&gt;</button></div>` : ''}`;
  }

  // mantém o foco/cursor nos campos quando a página redesenha (dados novos do banco)
  let FOCO = null;
  document.addEventListener('focusin', (e) => { const id = e.target && e.target.id; FOCO = id && /^lm-/.test(id) ? id : null; });
  function restauraFoco() { if (!FOCO) return; const el = document.getElementById(FOCO); if (el && document.activeElement !== el) { const n = el.value.length; el.focus(); try { el.setSelectionRange(n, n); } catch (_) {} } }

  // foco numa linha da lista (vindo do Mapa, de uma pendência ou de outro módulo)
  // alvo: id do anúncio ("AP054_V"), "i-<anúncio>" ou "e-<empreendimento>"; com abreLink, já abre o campo "Colar link do Maps"
  // (25/10/2026: botão "Corrigir o ponto" do painel do Mapa, para os imóveis que estão só no bairro ou só na rua)
  function focoLista(alvo, abreLink) {
    const a = String(alvo || ''), emp = a.startsWith('e-'), id = /^[ie]-/.test(a) ? a.slice(2) : a;
    F.vis = emp ? 'emps' : 'imoveis'; F.foco = id || null; F.edit = null; F.pg = 0; F.erro = '';
    F.link = abreLink && id ? (emp ? 'e-' : 'i-') + id : null; F.linkTxt = '';
    setTimeout(() => { const el = document.getElementById('lm-' + (emp ? 'e-' : 'i-') + id); if (el) el.scrollIntoView({ block: 'center' }); const t = document.getElementById('lm-link-txt'); if (t && abreLink) t.focus(); }, 200);
  }
  // sem aba própria desde 25/10/2026: a lista é desenhada pelo módulo Mapa (HUB_LINKMAPA.secao)
  H.registrar({
    id: ID, colecoes: [COL, CF, 'imoveis'],
    tipos: { link_mapa_imoveis: 'Endereços de imóveis a completar (mapa)', link_mapa_empreendimentos: 'Endereços de empreendimentos a completar (mapa)' },
  });

  // ------------------------------------------------------------ cliques e campos (prefixo data-lm-)
  async function salvar(doc) {
    const db = H.db(); if (!db || F.salvando) return;
    const f = F.form; const cepOk = !t(f.cep) || soCep(f.cep);
    if (!cepOk) { F.erro = 'CEP inválido: use 8 dígitos (ex.: 88015-250).'; H.pede(); return; }
    const man = { logradouro: t(f.logradouro), numero: t(f.numero), cep: soCep(f.cep), bairro: t(f.bairro), cidade: t(f.cidade), em: H.hojeISO(), por: 'HUB' };
    const x = (H.S[COL] || {})[doc];
    const hist = ((x && x.historico) || []).slice(-30).concat([{ em: H.hojeISO(), de: x && x.manual ? x.manual : null, para: man }]);
    F.salvando = true; F.erro = ''; H.pede();
    try {
      if (x) await db.doc(COL + '/' + doc).update({ manual: man, historico: hist });
      else await db.doc(COL + '/' + doc).set({ tipo: doc[0] === 'i' ? 'imovel' : 'empreendimento', alvo: doc.slice(2), manual: man, historico: hist });
      F.edit = null; F.form = {};
    } catch (e) { F.erro = 'Não foi possível salvar: ' + (e && (e.code || e.message) || e); }
    F.salvando = false; H.pede();
  }
  async function salvaLink(doc, tirar) {
    const db = H.db(); if (!db || F.salvando) return;
    const x = (H.S[COL] || {})[doc];
    let ml = null;
    if (!tirar) { const r = leLinkMaps(F.linkTxt); if (!r || r.erro) { F.erro = (r && r.erro) || 'Cole o link do Google Maps.'; H.pede(); return; }
      ml = { url: r.url, lat: r.lat, lng: r.lng, curto: r.curto, em: H.hojeISO(), por: 'HUB' }; }
    const hist = ((x && x.historico) || []).slice(-30).concat([{ em: H.hojeISO(), campo: 'mapa_link', de: x && x.mapa_link ? x.mapa_link : null, para: ml }]);
    F.salvando = true; F.erro = ''; H.pede();
    try {
      if (x) await db.doc(COL + '/' + doc).update({ mapa_link: ml, historico: hist });
      else if (ml) await db.doc(COL + '/' + doc).set({ tipo: doc[0] === 'i' ? 'imovel' : 'empreendimento', alvo: doc.slice(2), mapa_link: ml, historico: hist });
      F.link = null; F.linkTxt = '';
    } catch (e) { F.erro = 'Não foi possível salvar: ' + (e && (e.code || e.message) || e); }
    F.salvando = false; H.pede();
  }
  async function desfazer(doc) {
    const db = H.db(); const x = (H.S[COL] || {})[doc]; if (!db || !x) return;
    try { await db.doc(COL + '/' + doc).update({ manual: null, historico: (x.historico || []).slice(-30).concat([{ em: H.hojeISO(), de: x.manual || null, para: null }]) }); F.edit = null; F.form = {}; }
    catch (e) { F.erro = 'Não foi possível desfazer: ' + (e && (e.code || e.message) || e); }
    H.pede();
  }
  document.addEventListener('click', (e) => {
    const g = (k) => e.target.closest('[data-lm-' + k + ']');
    let b;
    if ((b = g('vis'))) { F.vis = b.dataset.lmVis; F.pg = 0; F.edit = null; F.foco = null; H.pede(); return; }
    if ((b = g('pg'))) { if (b.disabled) return; F.pg = Math.max(0, +b.dataset.lmPg); H.pede(); setTimeout(() => { const el = document.getElementById('mp-links'); if (el) el.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0); }, 60); return; }
    if ((b = g('semfoco'))) { F.foco = null; H.pede(); return; }
    if ((b = g('copiar'))) { H.copiaTexto(b.dataset.lmCopiar, b); return; }
    if ((b = g('cancelar'))) { F.edit = null; F.form = {}; F.link = null; F.linkTxt = ''; F.erro = ''; H.pede(); return; }
    if ((b = g('linksalvar'))) { salvaLink(b.dataset.lmLinksalvar, false); return; }
    if ((b = g('linktirar'))) { salvaLink(b.dataset.lmLinktirar, true); return; }
    if ((b = g('link'))) { const doc = b.dataset.lmLink; const ml = linkDe(doc); F.link = doc; F.edit = null; F.erro = ''; F.linkTxt = ml ? ml.url : ''; H.pede(); setTimeout(() => { const el = document.getElementById('lm-link-txt'); if (el) el.focus(); }, 60); return; }
    if ((b = g('salvar'))) { salvar(b.dataset.lmSalvar); return; }
    if ((b = g('desfazer'))) { desfazer(b.dataset.lmDesfazer); return; }
    if ((b = g('corrigir'))) {
      const doc = b.dataset.lmCorrigir, id = b.dataset.lmId, tipo = b.dataset.lmTipo;
      const r = tipo === 'imovel' ? resolverImovel(id, H.S, idx()) : resolverEmp(id, H.S); const man = ((H.S[COL] || {})[doc] || {}).manual;
      F.edit = doc; F.link = null; F.erro = '';
      F.form = man && !vazioM(man) ? { logradouro: man.logradouro || '', numero: man.numero || '', cep: man.cep || '', bairro: man.bairro || '', cidade: man.cidade || '' }
        : { logradouro: r.log || '', numero: r.num || '', cep: r.cep || '', bairro: r.bairro || '', cidade: r.cidade || 'Florianópolis' };
      H.pede(); setTimeout(() => { const el = document.getElementById('lm-f-' + (F.form.logradouro ? (F.form.numero ? 'cep' : 'numero') : 'logradouro')); if (el) el.focus(); }, 60); return;
    }
  });
  document.addEventListener('input', (e) => {
    const el = e.target; if (!el) return;
    if (el.dataset && el.dataset.lmCampo) { F.form[el.dataset.lmCampo] = el.value; return; }
    if (el.dataset && el.dataset.lmLinktxt) { F.linkTxt = el.value; return; }
    if (el.id === 'lm-q') { F.q = el.value; F.pg = 0; F.foco = null; H.pede(); }
  });
  document.addEventListener('change', (e) => { const el = e.target; if (el && el.dataset && el.dataset.lmSel) { F[el.dataset.lmSel] = el.value; F.pg = 0; F.foco = null; H.pede(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && e.target.dataset && e.target.dataset.lmCampo && F.edit) { e.preventDefault(); salvar(F.edit); }
    if (e.key === 'Enter' && e.target && e.target.dataset && e.target.dataset.lmLinktxt && F.link) { e.preventDefault(); salvaLink(F.link, false); } });
})();
