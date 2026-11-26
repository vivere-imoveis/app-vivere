// modulos/regioes.js — 🗺️ Bairros e regiões (sugestão 171, fatia 3b — 26/11/2026).
// A lista de regiões, bairros e sub-regiões que a busca usa no HUB, no app, na Vivian e no site (Lagoa da Conceição abrange
// Canto da Lagoa e Porto da Lagoa; Leste da Ilha abrange os bairros do leste…). Fica na coleção 'regioes' do HUB (Supabase,
// nível diretoria); cada gravação passa sozinha para public.regioes (gatilho privado.regioes_do_hub), que valida o nome, o
// nível e a mãe e barra ciclo. Lê e grava pelo conector Vivere Conversas (hub_ler / hub_gravar); no HUB da web é só leitura.
// Também carrega modulos/regioes-mapa.js (o mesmo regioes.js do app) e o alimenta com a lista, para o motor das Oportunidades,
// as Demandas extras e as automáticas reconhecerem as sub-regiões. Nada se apaga: "Ativa" desligada tira a região da busca.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, ID = 'regioes', SERV = 'Vivere Conversas', VERSAO = '2026-11-26.1', MAPA_V = '2026-11-26.2';
  const NIVEIS = [['regiao', 'Região'], ['bairro', 'Bairro'], ['sub', 'Sub-região']];
  const NIVEL_ROT = { regiao: 'Região', bairro: 'Bairro', sub: 'Sub-região' };
  const WEB = /github\.io$/.test(location.hostname);
  const st = { itens: null, erro: '', carregando: false, q: '', inativas: false, form: null, msg: '', gravando: false };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const slug = (s) => norm(s).replace(/ /g, '-').slice(0, 60);

  // o mapa (regioes-mapa.js) — carregado uma vez; no app ele já vem pelo painel.html
  let pMapa = null;
  const mapa = () => (pMapa = pMapa || new Promise((ok) => {
    if (window.VIVERE_REGIOES) return ok(window.VIVERE_REGIOES);
    const sc = document.createElement('script'); sc.src = 'modulos/regioes-mapa.js?v=' + encodeURIComponent(MAPA_V);
    sc.onload = () => ok(window.VIVERE_REGIOES || null); sc.onerror = () => ok(null); document.head.appendChild(sc);
  }));
  window.addEventListener('vivere-regioes', () => H.pede());   // a lista chegou ou mudou: Oportunidades e Demandas redesenham

  let pMcp = null;
  const mcp = () => (pMcp = pMcp || (window.claude && window.claude.use ? window.claude.use('mcp') : Promise.resolve(null)));
  const payload = (r) => { let p = r && (r.payload !== undefined ? r.payload : r.structuredContent); if (typeof p === 'string') p = JSON.parse(p); return p; };
  async function lerTudo() {
    const m = await mcp(); if (!m) throw new Error('conector Vivere Conversas indisponível');
    let apos = null, out = [], voltas = 0;
    do {
      const inp = { colecao: 'regioes', limite: 500 }; if (apos) inp.apos = apos;
      const p = payload(await m.callTool(SERV, 'hub_ler', inp, { cache: false }));
      if (!p || !Array.isArray(p.itens)) throw new Error((p && (p.erro || p.message)) || 'resposta sem itens');
      out = out.concat(p.itens); apos = p.proximo || null;
    } while (apos && ++voltas < 10);
    return out;
  }
  const nos = () => (st.itens || []).map((x) => Object.assign({ id: x.doc_id, _versao: x.versao }, x.dados || {}));
  async function carrega() {
    if (st.carregando) return; st.carregando = true; st.erro = ''; H.pede();
    try {
      st.itens = await lerTudo();
      const R = await mapa(); if (R && R.carregarLista) R.carregarLista(nos().map(({ id, nome, pai, nivel, apelidos, ordem, ativo }) => ({ id, nome, pai, nivel, apelidos, ordem, ativo })));
    } catch (e) { st.erro = (e && e.message) || String(e); }
    st.carregando = false; H.pede();
  }

  // bairros que aparecem nos anúncios do site e nos lançamentos e que a lista ainda não conhece
  function semRegiao() {
    const R = window.VIVERE_REGIOES; if (!R || !R.pronto) return [];
    const vistos = new Map();
    const add = (b) => { b = String(b || '').trim(); const k = norm(b); if (!k || vistos.has(k)) return; vistos.set(k, b); };
    Object.values(H.S.imoveis || {}).forEach((x) => { if (x && x.ativo !== false && x.bairro) add(x.bairro); });
    Object.values(H.S.empreendimentos_fichas || {}).forEach((x) => { if (x && x.bairro) add(x.bairro); });
    return [...vistos.values()].filter((b) => !R.sub(b).length).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  function arvore(L) {
    const porId = new Map(L.map((n) => [n.id, n])), filhos = new Map();
    L.forEach((n) => { const p = n.pai && porId.has(n.pai) ? n.pai : ''; if (!filhos.has(p)) filhos.set(p, []); filhos.get(p).push(n); });
    const ord = (a, b) => (+a.ordem || 0) - (+b.ordem || 0) || String(a.nome).localeCompare(String(b.nome), 'pt-BR');
    filhos.forEach((v) => v.sort(ord));
    return { porId, filhos };
  }
  const descendentes = (id, filhos, acc = new Set()) => { (filhos.get(id) || []).forEach((f) => { if (!acc.has(f.id)) { acc.add(f.id); descendentes(f.id, filhos, acc); } }); return acc; };

  function linha(n, nivel, filhos, q) {
    const fs = filhos.get(n.id) || [];
    const sub = fs.map((f) => linha(f, nivel + 1, filhos, q)).join('');
    const bate = !q || [n.nome].concat(n.apelidos || []).some((t) => norm(t).includes(q));
    if (!bate && !sub) return '';
    if (n.ativo === false && !st.inativas && !q) return '';
    const ap = (n.apelidos || []).length ? `<span class="s"> · também: ${esc(n.apelidos.join(', '))}</span>` : '';
    const ed = WEB ? '' : `<button type="button" class="btn" data-rg-edita="${esc(n.id)}">Editar</button>`;
    return `<div class="rg-l" id="rg-${esc(n.id)}" style="padding-left:${Math.min(nivel, 4) * 18}px"><div class="rg-c"><b>${esc(n.nome)}</b> <span class="pill">${esc(NIVEL_ROT[n.nivel] || n.nivel || '')}</span>${n.ativo === false ? ' <span class="pill warn">inativa</span>' : ''}${fs.length ? `<span class="s"> · ${fs.length} dentro</span>` : ''}${ap}</div>${ed}</div>${sub}`;
  }

  function formulario(L, filhos) {
    const f = st.form; if (!f) return '';
    const bloqueio = f.id ? descendentes(f.id, filhos, new Set([f.id])) : new Set();
    const maes = L.filter((n) => !bloqueio.has(n.id) && n.nivel !== 'sub').sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    const opM = [`<option value="">— nenhuma (é uma região) —</option>`].concat(maes.map((n) => `<option value="${esc(n.id)}"${n.id === f.pai ? ' selected' : ''}>${esc(n.nome)} (${esc(NIVEL_ROT[n.nivel] || '')})</option>`)).join('');
    const opN = NIVEIS.map(([v, t]) => `<option value="${v}"${v === f.nivel ? ' selected' : ''}>${t}</option>`).join('');
    return `<div class="card rg-form" style="margin:10px 0;padding:12px;display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
      <div style="grid-column:1/-1"><b>${f.novo ? 'Nova região, bairro ou sub-região' : 'Editar ' + esc(f.nome0 || '')}</b>${f.novo ? '' : `<span class="s"> · código ${esc(f.id)}</span>`}</div>
      <label class="s">Nome<input id="rg-f-nome" value="${esc(f.nome)}" maxlength="80" style="width:100%"></label>
      <label class="s">Nível<select id="rg-f-nivel" style="width:100%">${opN}</select></label>
      <label class="s">Fica dentro de<select id="rg-f-pai" style="width:100%">${opM}</select></label>
      <label class="s">Outros nomes (separe por vírgula)<input id="rg-f-apelidos" value="${esc((f.apelidos || []).join(', '))}" style="width:100%"></label>
      <label class="s">Ordem na lista<input id="rg-f-ordem" type="number" value="${esc(String(f.ordem || 0))}" style="width:100%"></label>
      <label class="s" style="display:flex;gap:6px;align-items:center"><input id="rg-f-ativo" type="checkbox"${f.ativo !== false ? ' checked' : ''}> Ativa (entra na busca)</label>
      <label class="s" style="grid-column:1/-1">Observação<input id="rg-f-obs" value="${esc(f.obs || '')}" maxlength="300" style="width:100%"></label>
      <div class="filtros" style="grid-column:1/-1;margin:0"><button type="button" class="btn" data-rg-salvar="1"${st.gravando ? ' disabled' : ''}>${st.gravando ? 'Gravando…' : 'Salvar'}</button><button type="button" class="btn" data-rg-cancelar="1">Cancelar</button></div>
    </div>`;
  }

  function render() {
    if (st.itens === null && !st.erro) { if (!st.carregando) carrega(); return '<p class="nota">Carregando os bairros e regiões…</p>'; }
    const L = nos(), { filhos } = arvore(L), q = norm(st.q);
    const sem = semRegiao();
    const topo = `<h2>Bairros e regiões</h2><p class="nota">Quem procura uma região ou um bairro-mãe também recebe o que fica dentro dele: Lagoa da Conceição traz Canto da Lagoa e Porto da Lagoa; Leste da Ilha traz os bairros do leste. Vale para as Oportunidades e as Demandas daqui, o app dos corretores, a Vivian e o site. Desligar “Ativa” tira da busca; nada se apaga.${WEB ? ' <b>Na web esta lista é só leitura</b>: para mudar, use o HUB do claude.ai.' : ''}</p>`;
    const aviso = st.erro ? `<p class="nota" style="color:var(--warn)">Não deu para ler a lista: ${esc(st.erro)}</p>` : '';
    const msg = st.msg ? `<p class="nota">${esc(st.msg)}</p>` : '';
    const semH = sem.length ? `<div class="card" style="margin:10px 0;padding:10px 12px"><b>Bairros dos anúncios sem região (${sem.length})</b><p class="s" style="margin:4px 0 8px">Aparecem nos anúncios ou lançamentos, mas a lista não sabe onde ficam. Encaixe cada um numa região ou bairro-mãe.</p><div class="filtros" style="margin:0;flex-wrap:wrap">${sem.map((b) => `<span class="pill">${esc(b)}${WEB ? '' : ` <button type="button" class="btn" data-rg-encaixa="${esc(b)}" style="padding:2px 8px;font-size:12px">Encaixar</button>`}</span>`).join(' ')}</div></div>` : '';
    const barra = `<div class="filtros"><input type="search" id="rg-q" value="${esc(st.q)}" placeholder="Buscar região ou bairro" style="min-width:0;max-width:240px"><label class="s" style="display:flex;gap:4px;align-items:center"><input type="checkbox" data-rg-inativas="1"${st.inativas ? ' checked' : ''}> Mostrar inativas</label>${WEB ? '' : '<button type="button" class="btn" data-rg-novo="1">+ Nova</button>'}<button type="button" class="btn" data-rg-recarregar="1">${st.carregando ? 'Lendo…' : 'Recarregar'}</button><span class="s" style="align-self:center">${L.filter((n) => n.ativo !== false).length} ativas de ${L.length}</span></div>`;
    const corpo = (filhos.get('') || []).map((n) => linha(n, 0, filhos, q)).join('') || H.vazio(q ? 'Nada com esse nome.' : 'A lista está vazia.');
    return `<style>.rg-l{display:flex;gap:8px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line,rgba(127,127,127,.2));padding-top:6px;padding-bottom:6px;min-width:0}.rg-c{min-width:0;overflow-wrap:anywhere;line-height:1.35}.rg-l .btn{padding:3px 9px;font-size:12px;flex:0 0 auto}</style>${topo}${aviso}${msg}${formulario(L, filhos)}${semH}${barra}<div class="rg-arv">${corpo}</div>`;
  }

  function abreForm(n, extra) {
    st.msg = '';
    st.form = n ? { id: n.id, nome0: n.nome, nome: n.nome, nivel: n.nivel || 'bairro', pai: n.pai || '', apelidos: (n.apelidos || []).slice(), ordem: n.ordem || 0, ativo: n.ativo !== false, obs: n.obs || '', cidade: n.cidade || 'Florianópolis', versao: n._versao }
      : Object.assign({ novo: true, id: '', nome: '', nivel: 'bairro', pai: '', apelidos: [], ordem: 0, ativo: true, obs: '', cidade: 'Florianópolis', versao: 0 }, extra || {});
    H.pede(); setTimeout(() => { const i = document.getElementById('rg-f-nome'); if (i) i.focus(); }, 50);
  }
  const val = (id) => { const e = document.getElementById(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : undefined; };
  async function salvar() {
    const f = st.form; if (!f || st.gravando) return;
    const nome = String(val('rg-f-nome') || '').trim().replace(/\s+/g, ' ');
    if (nome.length < 2) { st.msg = 'Escreva o nome.'; H.pede(); return; }
    const L = nos();
    const id = f.novo ? slug(nome) : f.id;
    if (!id) { st.msg = 'Nome sem letras: não dá para criar o código.'; H.pede(); return; }
    if (f.novo && L.some((n) => n.id === id)) { st.msg = `Já existe ${nome} na lista (código ${id}). Edite o que existe.`; H.pede(); return; }
    const outro = L.find((n) => n.id !== id && [n.nome].concat(n.apelidos || []).some((t) => norm(t) === norm(nome)));
    if (outro) { st.msg = `O nome ${nome} já é de ${outro.nome}. Use outro ou edite aquele.`; H.pede(); return; }
    const pai = val('rg-f-pai') || null, nivel = val('rg-f-nivel') || 'bairro';
    if (nivel === 'sub' && !f.novo && L.some((n) => n.pai === id)) { st.msg = 'Esta já tem outras dentro dela: não pode virar sub-região. Mude antes as que ficam dentro.'; H.pede(); return; }
    if (!pai && nivel !== 'regiao') { st.msg = 'Bairro e sub-região precisam ficar dentro de uma região ou bairro.'; H.pede(); return; }
    const apelidos = String(val('rg-f-apelidos') || '').split(',').map((x) => x.trim().replace(/\s+/g, ' ')).filter((x, i, a) => x && norm(x) !== norm(nome) && a.findIndex((y) => norm(y) === norm(x)) === i);
    const atual = (st.itens || []).find((x) => x.doc_id === id);
    const dados = Object.assign({}, atual ? atual.dados : {}, { nome, nivel, pai, apelidos, ordem: +val('rg-f-ordem') || 0, ativo: !!val('rg-f-ativo'), obs: String(val('rg-f-obs') || '').trim() || null, cidade: f.cidade || 'Florianópolis', atualizado_por: 'HUB (diretoria)' });
    st.gravando = true; st.msg = ''; H.pede();
    try {
      const m = await mcp(); if (!m) throw new Error('conector Vivere Conversas indisponível');
      const p = payload(await m.callTool(SERV, 'hub_gravar', { operacoes: [{ acao: 'set', colecao: 'regioes', doc_id: id, dados, if_versao: f.novo ? 0 : (f.versao || 0) }] }, { cache: false }));
      const r = ((p && p.resultados) || [])[0] || {};
      if (r.resultado === 'conflito') throw new Error('alguém mudou esta região agora há pouco. Recarregue e tente de novo.');
      if (!['gravado', 'criado', 'igual'].includes(r.resultado)) throw new Error((p && (p.erro || p.message)) || r.erro || r.resultado || 'resposta inesperada');
      st.form = null; st.msg = `✅ ${nome} gravado. A busca do app, da Vivian e do site passa a usar na próxima leitura.`;
      st.gravando = false; st.itens = null; await carrega(); return;
    } catch (e) { st.msg = '❌ Não gravou: ' + ((e && e.message) || e); }
    st.gravando = false; H.pede();
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-rg-edita],[data-rg-novo],[data-rg-encaixa],[data-rg-salvar],[data-rg-cancelar],[data-rg-recarregar]'); if (!t) return;
    if (t.dataset.rgEdita) { const n = nos().find((x) => x.id === t.dataset.rgEdita); if (n) abreForm(n); window.scrollTo(0, 0); return; }
    if (t.dataset.rgNovo) { abreForm(null); return; }
    if (t.dataset.rgEncaixa) { abreForm(null, { nome: t.dataset.rgEncaixa, nivel: 'bairro' }); window.scrollTo(0, 0); return; }
    if (t.dataset.rgSalvar) { salvar(); return; }
    if (t.dataset.rgCancelar) { st.form = null; st.msg = ''; H.pede(); return; }
    if (t.dataset.rgRecarregar) { st.itens = null; carrega(); }
  });
  document.addEventListener('change', (e) => { const t = e.target; if (t && t.dataset && t.dataset.rgInativas) { st.inativas = t.checked; H.pede(); } });
  document.addEventListener('input', (e) => { const t = e.target; if (t && t.id === 'rg-q') { st.q = t.value; clearTimeout(st.tq); st.tq = setTimeout(() => { H.pede(); setTimeout(() => { const i = document.getElementById('rg-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); }, 250); } });

  // A aba nasce só se a leitura der certo (diretoria). A lista também alimenta o mapa para as Oportunidades.
  lerTudo().then(async (itens) => {
    st.itens = itens;
    const R = await mapa(); if (R && R.carregarLista) R.carregarLista(nos().map(({ id, nome, pai, nivel, apelidos, ordem, ativo }) => ({ id, nome, pai, nivel, apelidos, ordem, ativo })));
    H.registrar({ id: ID, aba: '🗺️ Bairros e regiões', grupo: 'cadastros', colecoes: ['imoveis', 'empreendimentos_fichas'], render, versao: VERSAO,
      busca(q) {
        const tm = norm(q); if (tm.length < 2) return [];
        return nos().filter((n) => [n.nome].concat(n.apelidos || []).some((t) => norm(t).includes(tm))).slice(0, 8)
          .map((n) => ({ grp: 'Bairros e regiões', tit: n.nome, sub: NIVEL_ROT[n.nivel] || '', ir: { aba: ID, linha: 'rg-' + n.id } }));
      } });
  }).catch(() => { /* sem acesso: a aba não aparece; o mapa fica com a lista guardada no aparelho, se houver */ mapa(); });
})();
