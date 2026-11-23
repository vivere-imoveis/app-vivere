/* MultiSel — seleção de vários valores (ex.: bairros) com busca, comum ao HUB e aos painéis (26/10/2026, pedido do Cleiton).
   Uso: MultiSel.html(id, [[valor, rótulo], ...], [valores marcados], 'Todos', 'bairros') devolve o HTML;
   cada mudança dispara o evento 'ms-change' (bubbles) com detail {id, valores}. O estado aberto/fechado e o texto
   da busca ficam guardados por id, então o redesenho da tela não fecha a lista. */ /* trocas-mapa-3d */
window.MultiSel = window.MultiSel || (function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const semAc = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const ST = {};
  const est = (id) => ST[id] || (ST[id] = { aberto: false, q: '', sc: 0 });
  function rotulo(pares, sel, todos, plural) {
    const n = pares.filter(([v]) => sel.includes(v)).map(([, x]) => x);
    return !n.length ? todos : n.length <= 2 ? n.join(', ') : n.length + ' ' + (plural || 'selecionados');
  }
  function html(id, pares, sel, todos, plural) {
    sel = Array.isArray(sel) ? sel : (sel ? [sel] : []);
    const st = est(id), q = semAc(st.q), n = sel.length;
    return `<div class="ms${n ? ' ms-on' : ''}" data-ms="${esc(id)}"><button type="button" class="ms-bt" data-ms-a="abre" aria-expanded="${st.aberto}" title="Escolha um ou mais"><span class="ms-rot">${esc(rotulo(pares, sel, todos, plural))}</span><span aria-hidden="true">▾</span></button>`
      + `<div class="ms-pop"${st.aberto ? '' : ' hidden'}><input type="search" class="ms-q" placeholder="Filtrar a lista…" value="${esc(st.q)}" autocomplete="off">`
      + `<div class="ms-ac"><button type="button" data-ms-a="limpa" title="${esc(todos)}">Limpar</button><button type="button" data-ms-a="mostrados">Marcar os mostrados</button><button type="button" class="ms-ok" data-ms-a="ok">OK</button></div>`
      + `<div class="ms-li">` + pares.map(([v, r]) => `<label class="ms-it"${q && !semAc(r).includes(q) ? ' hidden' : ''}><input type="checkbox" value="${esc(v)}"${sel.includes(v) ? ' checked' : ''}><span>${esc(r)}</span></label>`).join('')
      + (pares.length ? '' : '<span class="ms-vazio">Nada para escolher.</span>') + `</div></div></div>`;
  }
  const raiz = (el) => el && el.closest && el.closest('.ms');
  const marcados = (r) => [...r.querySelectorAll('.ms-li input[type=checkbox]:checked')].map((x) => x.value);
  function avisa(r, valores) {
    const id = r.dataset.ms, li = r.querySelector('.ms-li'); if (li) est(id).sc = li.scrollTop;
    r.dispatchEvent(new CustomEvent('ms-change', { bubbles: true, detail: { id, valores } }));
    [0, 60, 250].forEach((t) => setTimeout(ajusta, t));
  }
  function ajusta() {   // depois do redesenho: devolve a rolagem da lista aberta
    document.querySelectorAll('.ms').forEach((r) => { const st = ST[r.dataset.ms]; const li = r.querySelector('.ms-li'); if (st && st.aberto && li && st.sc && li.scrollTop !== st.sc) li.scrollTop = st.sc; });
  }
  function abre(r, sim) {
    const st = est(r.dataset.ms), pop = r.querySelector('.ms-pop'), bt = r.querySelector('.ms-bt');
    st.aberto = sim; if (pop) pop.hidden = !sim; if (bt) bt.setAttribute('aria-expanded', String(sim));
    if (sim) { const q = r.querySelector('.ms-q'); if (q && window.matchMedia && !window.matchMedia('(pointer:coarse)').matches) setTimeout(() => q.focus(), 0); }
  }
  document.addEventListener('click', (e) => {
    const r = raiz(e.target);
    document.querySelectorAll('.ms').forEach((o) => { if (o !== r && ST[o.dataset.ms] && ST[o.dataset.ms].aberto) abre(o, false); });
    if (!r) return;
    const b = e.target.closest('[data-ms-a]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const a = b.dataset.msA;
    if (a === 'abre') return abre(r, !est(r.dataset.ms).aberto);
    if (a === 'ok') return abre(r, false);
    if (a === 'limpa') { r.querySelectorAll('.ms-li input').forEach((x) => { x.checked = false; }); return avisa(r, []); }
    if (a === 'mostrados') { r.querySelectorAll('.ms-it:not([hidden]) input').forEach((x) => { x.checked = true; }); return avisa(r, marcados(r)); }
  }, true);
  document.addEventListener('change', (e) => {
    const r = raiz(e.target); if (!r || !e.target.matches('.ms-li input[type=checkbox]')) return;
    e.stopPropagation(); avisa(r, marcados(r));
  }, true);
  document.addEventListener('input', (e) => {
    const r = raiz(e.target); if (!r || !e.target.classList.contains('ms-q')) return;
    e.stopPropagation(); const st = est(r.dataset.ms); st.q = e.target.value; const q = semAc(st.q);
    r.querySelectorAll('.ms-it').forEach((l) => { l.hidden = !!q && !semAc(l.textContent).includes(q); });
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const r = raiz(e.target) || document.querySelector('.ms .ms-pop:not([hidden])')?.closest('.ms'); if (r) abre(r, false); } });
  if (!document.getElementById('ms-css')) {
    const s = document.createElement('style'); s.id = 'ms-css';
    s.textContent = `.ms{position:relative;display:inline-block;min-width:170px;max-width:100%;vertical-align:middle;color:var(--ink,inherit);font-size:13px}
.ms-bt{width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left;padding:6px 8px;border:1px solid var(--line,#ccc);border-radius:6px;background:var(--panel,#fff);color:inherit;font:inherit;cursor:pointer;min-height:32px}
.ms-rot{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ms.ms-on .ms-bt{border-color:var(--teal,var(--accent,#2f6f73));box-shadow:inset 0 0 0 1px var(--teal,var(--accent,#2f6f73))}
.ms-pop{position:absolute;z-index:1200;left:0;top:calc(100% + 4px);width:280px;max-width:90vw;background:var(--panel,#fff);color:inherit;border:1px solid var(--line,#ccc);border-radius:8px;box-shadow:0 10px 28px rgba(0,0,0,.22);padding:8px;box-sizing:border-box}
.ms-pop[hidden]{display:none}
.ms-q{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--line,#ccc);border-radius:6px;background:transparent;color:inherit;font:inherit}
.ms-ac{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
.ms-ac button{padding:4px 8px;border:1px solid var(--line,#ccc);border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.ms-ac .ms-ok{margin-left:auto;font-weight:600}
.ms-li{max-height:280px;overflow:auto;display:flex;flex-direction:column;gap:1px}
.ms .ms-it{display:flex!important;flex-direction:row!important;justify-content:flex-start!important;gap:8px!important;align-items:center!important;padding:6px 4px;border-radius:4px;cursor:pointer;font-size:13px!important;line-height:1.25;color:inherit!important;text-align:left}
.ms .ms-it[hidden]{display:none!important}
.ms-it:hover{background:rgba(127,127,127,.14)}
.ms-it input{margin:0;width:16px;height:16px;flex:none}
.ms-vazio{font-size:12px;opacity:.7;padding:6px 4px}
@media (max-width:640px){.ms{display:block;width:100%}.ms-pop{position:fixed;left:8px;right:8px;top:auto;bottom:8px;width:auto;max-width:none;max-height:75vh;display:flex;flex-direction:column}.ms-pop[hidden]{display:none}.ms-li{max-height:none;flex:1;min-height:0}.ms .ms-it{padding:9px 4px;font-size:15px!important}}`;
    (document.head || document.documentElement).appendChild(s);
  }
  return { html, ajusta, estado: ST };
})();

// modulos/mapa.js — módulo "Mapa interativo dos imóveis" do HUB Vivere (construção `mapa`, 19/10/2026).
// Aba "Mapa" (grupo Imóveis): anúncios do site, carteira de locação, vendas, negócios do Drive e empreendimentos num mapa
// desenhado (Ilha, continente, bairros e vias principais — imagens de mapa de fora são bloqueadas pela página publicada).
//   - Ponto de cada item: o endereço sai do módulo link-mapa (window.HUB_LINKMAPA — o mesmo do botão 📍); as coordenadas
//     ficam em `mapa_pontos/<g+hash do endereço>` (lat, lng, precisão), calculadas pela rotina do módulo (OpenStreetMap,
//     no navegador do app). Endereço mudou → hash novo → o ponto antigo deixa de valer até a rotina recalcular.
//   - Detalhes (dormitórios, suítes, banheiros, vagas, área) em `mapa_detalhes/i-<imóvel>`; miniatura da foto em
//     `mapa_fotos/i-<imóvel>`, lida só no clique.
//   - Matriz de acesso em `mapa_acesso/matriz` (Diretoria / Corretor / Cliente × informações) + "Ver como". No HUB, a
//     matriz só PREVÊ o que cada grupo veria: o controle real vem quando o painel dos corretores e o mapa público
//     existirem — cada um recebe a sua cópia já filtrada (decisão do Cleiton, 19/10/2026).
// Só lê as coleções do núcleo e dos outros módulos; grava apenas `mapa_acesso/matriz` (pelo editor da matriz).
// 25/10/2026 (pedido do Cleiton): todas as vias da Ilha de Santa Catarina (ruas, avenidas, servidões, trilhas) em arquivos por
//   região (`modulos/mapa-ruas-<lin>-<col>.js`), carregados só com zoom de bairro (14+), nomes das ruas a partir do zoom 16;
//   ilhas do entorno com nome (`modulos/mapa-extra.js`); continente segue só com as vias principais do mapa-base.js.
//   A antiga aba "Links de mapa" virou a seção "Links de mapa e localização" no fim desta aba (render do módulo link-mapa);
//   link do Google Maps colado ali (`link-mapa_enderecos/<doc>.mapa_link`) reposiciona o ponto (precisão "link").
// Contrato: _hub\modulos\LEIA-ME.md. Rotina: _hub\modulos\mapa\ROTINA.md.
(function () {
  const H = window.HUB; if (!H) return;
  const ID = 'mapa';
  const ME = (document.currentScript && document.currentScript.src) || '';
  const VQ = (ME.match(/[?&]v=([^&#]+)/) || [])[1] || '0';
  const CDN = ['modulos/vendor/leaflet-1.9.4.js', 'modulos/vendor/leaflet.markercluster-1.5.3.js']; // hospedados no HUB (revisão do Lucas, hub #27)
  const BASE_URL = 'modulos/mapa-base.js?v=' + VQ, EXTRA_URL = 'modulos/mapa-extra.js?v=' + VQ;
  const RUAS_URL = (k) => 'modulos/mapa-ruas-' + k + '.js?v=' + VQ;
  const esc = H.esc;
  const brl0 = (v) => (v == null || v === '' || isNaN(+v) ? '' : H.brl0(+v));
  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const prim = (s) => norm(s).split(/[\s,/;]+/).filter(Boolean)[0] || '';
  // mesmo hash do pontos.js (rotina): id do ponto = 'g' + hash(consulta)
  const hash = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0; return h.toString(36); };
  const LS = 'hubv.mapa.f';
  // pontos, detalhes e fotos ficam em documentos-fatia ({i: {chave: valor}}): 4 de pontos (p0…p3), 4 de detalhes (d0…d3) e 40 de fotos
  // (f0…f39, lidas só no clique). A fatia de uma chave usa a mesma conta do mapa.py.
  const N_FOTOS = 40;
  const fatia = (s, n) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % n; };
  const JUNTA = {};
  function junta(c) { const S = H.S[c] || {}; if (JUNTA[c] && JUNTA[c].s === S) return JUNTA[c].t; const t = {}; Object.values(S).forEach((d) => Object.assign(t, (d && d.i) || {})); JUNTA[c] = { s: S, t }; return t; }

  // ------------------------------------------------------------ camadas, situações, precisão
  const CAM = {
    anuncio: ['Anúncios do site', 'mp-c1'], locacao: ['Carteira de locação', 'mp-c2'], venda: ['Vendas fechadas', 'mp-c3'],
    negocio: ['Negócios (Drive)', 'mp-c4'], empreendimento: ['Empreendimentos', 'mp-c5'] };
  // Camadas do FILTRO (25/10/2026, pedido do Cleiton): os anúncios do site se dividem por finalidade, separados dos empreendimentos;
  // cada chip conta só o que a situação escolhida deixa passar, e a situação conta só as camadas ligadas.
  const CAMF = { 'anuncio:V': ['Anúncios · venda', 'mp-c1'], 'anuncio:A': ['Anúncios · locação anual', 'mp-c1'], 'anuncio:T': ['Anúncios · temporada', 'mp-c1'],
    empreendimento: ['Empreendimentos', 'mp-c5'], locacao: ['Carteira de locação', 'mp-c2'], venda: ['Vendas fechadas', 'mp-c3'], negocio: ['Negócios (Drive)', 'mp-c4'] };
  const camKey = (it) => (it.camada === 'anuncio' ? 'anuncio:' + (it.fv || 'V') : it.camada);
  // precisão do ponto em grupos (filtro) e estágio dos empreendimentos em faixas
  const PREC_G = { numero: ['No número', ['numero', 'metrica', 'link', 'lote']], empreendimento: ['No empreendimento', ['empreendimento']], rua: ['Na rua', ['rua']], bairro: ['Só o bairro', ['bairro']], cidade: ['Só a cidade', ['cidade']] };
  function estagioDe(t) { const s = norm(t || ''); if (!s) return 'sem'; if (/planta|lancamento|pre lancamento|pre-lancamento|cotas/.test(s)) return 'planta'; if (/obra/.test(s)) return 'obras'; if (/pronto|entregue|existente|operacao/.test(s)) return 'pronto'; return 'outro'; }
  const ESTAGIO = { planta: 'Na planta / lançamento', obras: 'Em obras', pronto: 'Pronto / entregue', outro: 'Outro', sem: 'Sem informação' };
  function entregaDe(t) { const s = String(t || ''); if (/entregue/i.test(s)) return 'entregue'; const m = s.match(/(20\d\d|19\d\d)/); return m ? m[1] : ''; }
  const SIT = { ativo: 'Ativo / anunciado', locado: 'Locado', vendido: 'Vendido', naoconf: 'Venda não confirmada', negociacao: 'Em negociação', inativo: 'Inativo / encerrado', semanuncio: 'Empreendimento sem anúncio ativo' };
  // Vendas (decisão do Cleiton, 19/10/2026): a coleção "vendas" é o controle de CONTRATOS elaborados (planilha V. Claude), não um
  // cadastro de vendas. No mapa entram só PCV, PCV com dação e cessão; saem dívidas, aditivos, corretagem, cartas, mobília, reserva,
  // investimento e temporada, e todo negócio que caiu (observação "não prosseguiu/caiu" ou pasta do Drive marcada como "caiu").
  // Mesmo imóvel = um ponto só (fica o contrato mais recente). "Perdoado" = contrato feito, fechamento não confirmado → selo próprio,
  // filtro desligado por padrão. "A receber" conta como vendido. Negócios do Drive: só os "em andamento".
  const VENDA_TIPOS = ['PCV', 'PCV COM DACAO', 'CESSAO'];
  const CAIU = /n[aã]o (prosseguiu|seguiu)|\bcaiu\b|desist/i;
  function classificaVenda(v, pasta) {
    const tp = norm(v.tipo || '').toUpperCase();
    if (!VENDA_TIPOS.includes(tp)) return null;
    if (CAIU.test(String(v.obs || '') + ' ' + String(v.nota || '')) || (pasta && pasta.situacao === 'caiu')) return null;
    return /perdoado/i.test(v.status || '') ? 'naoconf' : 'vendido';
  }
  const PREC = { link: ['pelo link do Maps', 'ok'], lote: ['no lote (memorial)', 'ok'], numero: ['no número', 'ok'], metrica: ['no número (calculado pela numeração da rua)', 'ok'], empreendimento: ['no empreendimento', 'ok'], rua: ['na rua', 'warn'], bairro: ['só o bairro', 'bad'], cidade: ['só a cidade', 'bad'] };

  // ------------------------------------------------------------ matriz de acesso
  const GRUPOS = { diretoria: 'Diretoria', corretor: 'Corretor', cliente: 'Cliente' };
  const CAMPOS = [
    ['cam_anuncio', 'Camada: anúncios do site', 'r'], ['cam_locacao', 'Camada: carteira de locação', 'r'], ['cam_venda', 'Camada: vendas fechadas', 'r'],
    ['cam_negocio', 'Camada: negócios do Drive', 'r'], ['cam_empreendimento', 'Camada: empreendimentos', 'r'],
    ['localizacao', 'Localização do ponto', 'loc'], ['endereco', 'Endereço (rua e número)', 'r'],
    ['proprietario', 'Proprietário / locador / vendedor', 'r'], ['partes', 'Locatário / comprador', 'r'],
    ['valor', 'Valor', 'r'], ['corretor', 'Corretor', 'r'], ['detalhes', 'Dormitórios, suítes, vagas, área', 'r'],
    ['foto', 'Foto', 'r'], ['links', 'Links (anúncio, Google Maps, aba Imóveis)', 'r'], ['situacao', 'Situação', 'r']];
  const OPC = { r: [['todos', 'Todos'], ['proprios', 'Só os que agenciou'], ['nunca', 'Nunca']], loc: [['exata', 'Exata'], ['bairro', 'Aproximada (bairro)']] };
  const PADRAO = (() => {
    const tudo = {}; CAMPOS.forEach(([k, , t]) => (tudo[k] = t === 'loc' ? 'exata' : 'todos'));
    return {
      diretoria: Object.assign({}, tudo),
      corretor: Object.assign({}, tudo, { proprietario: 'proprios', partes: 'proprios' }),
      cliente: Object.assign({}, tudo, { proprietario: 'nunca', partes: 'nunca', endereco: 'nunca', localizacao: 'bairro', cam_locacao: 'nunca', cam_venda: 'nunca', cam_negocio: 'nunca' }),
    };
  })();
  function matriz() {
    const m = (H.S.mapa_acesso || {}).matriz || {}, g = m.grupos || {}, o = {};
    Object.keys(GRUPOS).forEach((k) => (o[k] = Object.assign({}, PADRAO[k], g[k] || {})));
    return o;
  }

  // ------------------------------------------------------------ estado (filtros guardados neste navegador)
  const F0 = { cam: { 'anuncio:V': 1, 'anuncio:A': 1, 'anuncio:T': 1, empreendimento: 1, locacao: 1, venda: 1, negocio: 1 }, sit: { ativo: 1, locado: 1, vendido: 1, naoconf: 0, negociacao: 1, inativo: 0, semanuncio: 0 },
    tipo: '', vmin: '', vmax: '', cor: '', bai: '', q: '', ver: 'eu', car: {}, cons: '', est: '', ent: '', prec: '', dper: '', dcampo: 'cad' };
  let F = JSON.parse(JSON.stringify(F0));
  try { const g = JSON.parse(localStorage.getItem(LS) || 'null'); if (g && g.cam && g.sit) F = Object.assign(F, g); } catch (_) {}
  if (!F.car || typeof F.car !== 'object') F.car = {};
  // filtros guardados antes de 25/10/2026: a camada única "anuncio" vira as três finalidades; "Finalidade" saiu (está nas camadas)
  if (F.cam && F.cam['anuncio:V'] === undefined) { const a = F.cam.anuncio === undefined ? 1 : F.cam.anuncio; F.cam = Object.assign({}, F0.cam, F.cam, { 'anuncio:V': a, 'anuncio:A': a, 'anuncio:T': a }); delete F.cam.anuncio; }
  ['cons', 'est', 'ent', 'prec', 'dper'].forEach((k) => { if (F[k] == null) F[k] = ''; }); if (F.sit && F.sit.semanuncio === undefined) F.sit.semanuncio = F.sit.inativo ? 1 : 0; if (!F.dcampo) F.dcampo = 'cad'; delete F.fin;
  let CAR_SUJO = true;
  const guarda = () => { try { localStorage.setItem(LS, JSON.stringify(F)); } catch (_) {} };
  const BAIS = () => (Array.isArray(F.bai) ? F.bai : (F.bai ? [F.bai] : []));   // F.bai: lista de bairros (antes, um só)
  let FOCO_ITEM = null; // item pedido pelo botão 🗺 de outra aba (i-<anúncio>, l-<locação>, v-<venda>, e-<empreendimento>)
  let SEL = null, MATRIZ_ABERTA = false, SEMPONTO_ABERTO = false, SALVANDO = '';

  // ------------------------------------------------------------ itens (memória por identidade das coleções)
  const FONTES = ['imoveis', 'empreendimentos_fichas', 'link-mapa_enderecos', 'contratos_locacao', 'vendas', 'drive_mapa', 'mapa_pontos', 'mapa_detalhes', 'mapa_manual', 'controle', 'corretores'];
  let CACHE = { ids: [], itens: null };
  function campoLoc(c, k) {
    for (const f of (k === 'endereco' || k === 'bairro' ? ['alude', 'planilha', 'pasta'] : ['planilha', 'alude', 'pasta'])) if (c[f] && c[f][k] != null && c[f][k] !== '') return c[f][k];
    return c[k] != null ? c[k] : null;
  }
  function locAtiva(c, cod) {
    const P = (H.S.controle || {}).parametros || {};
    if ((P.prazo_indeterminado || []).includes(cod)) return !(c.alude && c.alude.arquivado);
    const st = campoLoc(c, 'status'); if (st) return st === 'ativo';
    if (c.alude && c.alude.arquivado) return false;
    const t = campoLoc(c, 'termino'); return !t || t >= H.hojeISO();
  }
  function itens() {
    const L = window.HUB_LINKMAPA; if (!L) return null;
    const ids = FONTES.map((c) => H.S[c]);
    if (CACHE.itens && ids.every((x, i) => x === CACHE.ids[i])) return CACHE.itens;
    const S = H.S, out = [], P = (S.controle || {}).parametros || {}, PT = junta('mapa_pontos'), DT = junta('mapa_detalhes');
    // ponto útil: com coordenada; "só a cidade" em Florianópolis não diz nada (fica sem ponto)
    const util = (p) => p && p.lat != null && !(p.prec === 'cidade' && /florian/i.test(p.q || ''));
    const ponto = (r) => { if (!r || !r.consulta) return { qual: 'sem_endereco' }; const g = 'g' + hash(r.consulta), p = PT[g]; return { g, qual: r.qual, consulta: r.consulta, p: util(p) ? p : null, pq: p || null }; };
    const safe = (f) => { try { return f(); } catch (_) { return null; } };
    // imóveis locados: ponte confirmada + locação ativa
    const locados = {};
    // imóvel → nome do empreendimento (lista `anuncios` de cada empreendimento), para o painel do ponto (31/10/2026, pedido do Cleiton)
    const empNome = {};
    Object.values(S.empreendimentos_fichas || {}).forEach((x) => { if (x && x.nome) (x.anuncios || []).forEach((a) => { if (a && a.id && !empNome[a.id]) empNome[a.id] = x.nome; }); });
    Object.entries(P.ponte_codigos || {}).forEach(([cod, b]) => { const c = (S.contratos_locacao || {})[cod]; if (b && b.status === 'confirmado' && b.imovel && c && locAtiva(c, cod)) locados[b.imovel] = cod; });
    Object.entries(S.imoveis || {}).forEach(([id, x]) => {
      const r = safe(() => L.imovel(id)), d = DT['i-' + id] || {};
      out.push(Object.assign({ id: 'i-' + id, camada: 'anuncio', ref: x.ref || id, titulo: (x.ref || id) + (x.tipo ? ' · ' + x.tipo : ''), fin: x.finalidade || '', tipo: x.tipo || '',
        valor: x.valor, bairro: x.bairro || '', cidade: x.cidade || '', corretor: x.corretor || '', corId: x.corretor_id && String(x.corretor_id) !== '0' ? String(x.corretor_id) : '', prop: x.proprietario || '', sit: !x.ativo ? 'inativo' : locados[id] ? 'locado' : 'ativo',
        link: x.link_site || '', imovel: id, det: d, cod: locados[id] || '', end: r && r.consulta, mapa: ['imovel', id], empNome: empNome[id] || '',
        fv: (String(id).match(/_([AVT])(?:_\d+)?$/) || [])[1] || 'V', cad: x.cadastrado_em || '', atu: x.atualizado_em || '' }, ponto(r)));
    });
    Object.entries(S.contratos_locacao || {}).forEach(([k, c]) => {
      const al = c.alude || {}, pl = c.planilha || {}, end = al.endereco || pl.endereco || campoLoc(c, 'endereco');
      const r = safe(() => L.deTexto(end, { bairro: campoLoc(c, 'bairro'), textos: [pl.endereco, al.endereco] }));
      const imvL = Object.keys(locados).find((iid) => locados[iid] === k);
      out.push(Object.assign({ id: 'l-' + k, camada: 'locacao', ref: k, titulo: k + ' · Locação ' + (pl.tipo || (k[0] === 'T' ? 'temporada' : 'anual')), fin: k[0] === 'T' ? 'Temporada' : 'Locação',
        tipo: '', valor: al.aluguel || pl.aluguel_contrato, bairro: campoLoc(c, 'bairro') || '', corretor: (pl.corretores || {}).agenciador || '', prop: campoLoc(c, 'locador') || '',
        parte: campoLoc(c, 'locatario') || '', sit: locAtiva(c, k) ? 'locado' : 'inativo', det: imvL ? DT['i-' + imvL] || null : null, imovel: imvL || undefined, empNome: (imvL && empNome[imvL]) || '', inicio: campoLoc(c, 'inicio'), termino: campoLoc(c, 'termino'), endTxt: end,
        mapa: ['texto', null, end, { bairro: campoLoc(c, 'bairro'), textos: [pl.endereco, al.endereco] }] }, ponto(r)));
    });
    const drv = Object.entries(S.drive_mapa || {}).map(([id, d]) => Object.assign({ _id: id }, d));
    const vendas = {};
    Object.entries(S.vendas || {}).forEach(([k, v]) => {
      const g = drv.find((d) => (d.vendas || []).includes(k)), sit = classificaVenda(v, g); if (!sit) return;
      const chave = norm(v.objeto || k), ant = vendas[chave];
      if (ant && String(ant[1].data || '') >= String(v.data || '')) return;
      vendas[chave] = [k, v, g, sit];
    });
    Object.values(vendas).forEach(([k, v, g, sit]) => {
      const r = safe(() => L.deObjeto([v.objeto, g && g.nome]));
      out.push(Object.assign({ id: 'v-' + k, camada: 'venda', ref: k, titulo: v.objeto || k, fin: 'Venda', tipo: v.tipo || '', valor: v.valor_transacao, bairro: (r && r.bairro) || '',
        corretor: v.corretores || '', prop: v.vendedor || '', parte: v.comprador || '', sit, data: v.data, pasta: g ? g.nome : '',
        mapa: ['objeto', null, [v.objeto, g && g.nome]] }, ponto(r)));
    });
    drv.filter((d) => d.tipo === 'negocio' && !(d.vendas || []).length && d.situacao === 'em_andamento').forEach((d) => {
      const r = safe(() => L.deObjeto([d.nome]));
      const st = 'negociacao';
      out.push(Object.assign({ id: 'n-' + d._id, camada: 'negocio', ref: d._id, titulo: d.nome || 'Negócio', fin: 'Venda', tipo: '', valor: null, bairro: (r && r.bairro) || '',
        corretor: '', prop: [].concat((d.partes_nomes || {}).vendedor || []).join(', '), parte: [].concat((d.partes_nomes || {}).comprador || []).join(', '), sit: st,
        data: d.criada, link: d.link || '', mapa: ['objeto', null, [d.nome]] }, ponto(r)));
    });
    Object.entries(S.empreendimentos_fichas || {}).forEach(([k, x]) => {
      if (x.oculto) return;
      const r = safe(() => L.empreendimento(k)), an = (x.anuncios || []).filter((a) => a && a.id);
      out.push(Object.assign({ id: 'e-' + k, camada: 'empreendimento', ref: k, titulo: x.nome || k, fin: '', tipo: 'Empreendimento', valor: null, bairro: x.bairro || (r && r.bairro) || '',
        corretor: '', prop: '', sit: (x.anuncios_ativos || 0) > 0 ? 'ativo' : 'semanuncio', ativos: x.anuncios_ativos || 0, total: x.anuncios_total || an.length,
        status: x.status || '', construtora: x.construtora_nome || x.construtora_id || '', anuncios: an.map((a) => a.id), mapa: ['empreendimento', k],
        estagio: x.estagio || '', est: estagioDe(x.estagio), entrega: x.entrega || '', ent: entregaDe(x.entrega) }, ponto(r)));
    });
    // pontos manuais (mapa_manual): localização tirada dos documentos do caso (contrato, memorial descritivo) quando o
    // cadastro não tem endereço — só endereço e coordenada, sem dados pessoais
    const MN = junta('mapa_manual');
    out.forEach((it) => {
      const m = MN[it.id]; if (!m || m.lat == null) return;
      it.p = { lat: m.lat, lng: m.lng, prec: m.prec || 'rua', q: m.end || '' }; it.pq = it.p; it.manual = m;
      if (m.end) it.end = m.end; if (m.bairro && !it.bairro) it.bairro = m.bairro; if (m.cidade && !it.cidade) it.cidade = m.cidade;
    });
    // link do Google Maps colado na seção "Links de mapa e localização" (link-mapa_enderecos/<doc>.mapa_link): vale sobre os demais
    const LE = S['link-mapa_enderecos'] || {};
    out.forEach((it) => {
      const doc = it.camada === 'anuncio' ? 'i-' + it.imovel : it.camada === 'empreendimento' ? 'e-' + it.ref : ''; const ml = doc && (LE[doc] || {}).mapa_link;
      if (!ml || ml.lat == null || ml.lng == null) return;
      it.p = { lat: ml.lat, lng: ml.lng, prec: 'link', q: it.end || '' }; it.pq = it.p; it.link_maps = ml.url || '';
    });
    const PS = pessoas();
    out.forEach((it) => { it.cors = chavesCorretor(PS, it); });
    CACHE = { ids, itens: out };
    return out;
  }

  // ------------------------------------------------------------ visão ("Ver como") e filtros
  function visao() {
    if (F.ver === 'eu') return { g: null, nome: 'Minha visão (tudo)' };
    const i = F.ver.indexOf(':'), g = i < 0 ? F.ver : F.ver.slice(0, i), cor = i < 0 ? '' : F.ver.slice(i + 1); const m = matriz()[g];
    if (!m || (g === 'corretor' && (!cor || !pessoas().pes[cor]))) { F.ver = 'eu'; return { g: null, nome: 'Minha visão (tudo)' }; }
    return { g, m, cor: cor || '', nome: GRUPOS[g] + (cor ? ': ' + nomeCorretor(cor) : '') };
  }
  const dele = (it, cor) => !!cor && (it.cors || []).includes(cor);
  function pode(v, it, campo) {
    if (!v.g) return true; const r = v.m[campo];
    if (r === 'nunca') return false; if (r === 'proprios') return v.g === 'corretor' && dele(it, v.cor); return true;
  }
  // busca ampla (igual à da aba Imóveis + cômodos): só procura nos campos que o grupo do "Ver como" pode ver
  function textoBusca(it, v) {
    const PS = pessoas(), cn = (it.cors || []).map((k) => (PS.pes[k] || {}).nome || '').join(' ');
    return [it.ref, it.titulo, it.tipo, it.fin, it.bairro, it.cidade, it.construtora, it.pasta, it.cod, it.status,
      pode(v, it, 'endereco') ? [it.end, it.endTxt].join(' ') : '', pode(v, it, 'corretor') ? it.corretor + ' ' + cn : '',
      pode(v, it, 'proprietario') ? it.prop : '', pode(v, it, 'partes') ? it.parte : '',
      pode(v, it, 'detalhes') && H.car ? H.car.texto(it.det) : ''].join(' ');
  }
  function filtra(L, v) {
    const vmin = +String(F.vmin).replace(/\D/g, '') || 0, vmax = +String(F.vmax).replace(/\D/g, '') || 0, q = norm(F.q);
    const BT_MP = q && H.buscaAmpla && H.buscaAmpla.atende ? H.buscaAmpla.termos(F.q) : null;
    // filtros de empreendimento (construtora, estágio, entrega): valem para os empreendimentos e para os anúncios ligados a eles
    const fEmp = F.cons || F.est || F.ent, empOk = (it) => (!F.cons || it.construtora === F.cons) && (!F.est || it.est === F.est) && (!F.ent || it.ent === F.ent);
    const anuEmp = fEmp ? new Set(L.filter((it) => it.camada === 'empreendimento' && empOk(it)).flatMap((it) => (it.anuncios || []).map((a) => 'i-' + a))) : null;
    // datas do Imobibrasil (só anúncios)
    const dlim = F.dper ? (F.dper === 'ano' ? H.hojeISO().slice(0, 4) + '-01-01' : new Date(Date.now() - 3 * 3600e3 - Number(F.dper) * 864e5).toISOString().slice(0, 10)) : '';
    const precs = F.prec && PREC_G[F.prec] ? PREC_G[F.prec][1] : null;
    return L.filter((it) => {
      if (!F.cam[camKey(it)] || !F.sit[it.sit]) return false;
      if (v.g && !pode(v, it, 'cam_' + it.camada)) return false;
      if (fEmp && !(it.camada === 'empreendimento' ? empOk(it) : it.camada === 'anuncio' && anuEmp.has(it.id))) return false;
      if (dlim && !(it.camada === 'anuncio' && String((F.dcampo === 'atu' ? it.atu : it.cad) || '') >= dlim)) return false;
      if (precs && !(it.p && precs.includes(it.p.prec))) return false;
      if (F.tipo && it.tipo !== F.tipo) return false;
      if ((vmin || vmax) && !(it.valor > 0 && (!vmin || it.valor >= vmin) && (!vmax || it.valor <= vmax))) return false;
      if (F.cor && !(it.cors || []).includes(F.cor)) return false;
      if (BAIS().length && !BAIS().includes(norm(it.bairro))) return false;   // vários bairros (26/10/2026)
      if (H.car && H.car.ativos(F.car) && !H.car.ok(it.det, F.car, it.imovel)) return false;
      // 26/10/2026: busca ampla (vários termos, CPF/telefone, valor ±20%, quartos/vagas), a mesma das demais abas
      if (q) { const h = BT_MP ? H.buscaAmpla.atende(BT_MP, textoBusca(it, v) + ' ' + (H.car && H.car.resumo ? H.car.resumo(it.det) : '') + (it.valor > 0 ? ' R$ ' + Number(it.valor).toLocaleString('pt-BR') : ''), []) : null;
        if (h ? !h.size : !norm(textoBusca(it, v)).includes(q)) return false; }
      return true;
    });
  }
  // Corretores (revisto em 19/10/2026, a pedido do Cleiton): mesma regra do núcleo (consolidar.py → coleção `corretores`),
  // nunca só pelo primeiro nome. Imóvel do Imobibrasil: 1) mapa explícito parametros.imobibrasil_corretores; 2) nome completo
  // (nome_completo do cadastro); 3) primeiro nome só quando há UM único candidato na equipe; senão o próprio nome vira um
  // cadastro "fora da equipe" (slug do nome completo), como no consolidar. Planilhas de locação/vendas ("HUGO",
  // "DEIVIS/MILENA AG"): cada pedaço passa pela mesma regra. "Fernanda Crissie" ≠ "Fernanda Silva" ≠ "Fernanda Bohnenberger".
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let PESS = { s: null, i: null, c: null, r: null };
  function pessoas() {
    const P = (H.S.controle || {}).parametros || {}, CI = P.corretores_info || {}, C = H.S.corretores || {};
    if (PESS.s === H.S.imoveis && PESS.i === P && PESS.c === C) return PESS.r;
    const alvo = (k) => { const v = new Set(); while (k && CI[k] && CI[k].alias_de && !v.has(k)) { v.add(k); k = CI[k].alias_de; } return k; };
    const pes = {};
    const st = (k, x) => { const i = CI[k] || {}; return i.parceiro || x.situacao === 'parceiro' ? 'parceiro' : i.saiu || x.situacao === 'saiu' ? 'saiu' : x.situacao === 'fora_da_equipe' ? 'fora' : 'atual'; };
    Object.entries(C).forEach(([k, x]) => { if (x && !(CI[k] || {}).alias_de) pes[k] = { nome: x.nome || k, st: st(k, x), obs: (CI[k] || {}).papel || (CI[k] || {}).obs || '' }; });
    Object.entries(CI).forEach(([k, x]) => { if (x && !x.alias_de && !pes[k]) pes[k] = { nome: x.nome || (k[0].toUpperCase() + k.slice(1)), st: st(k, {}), obs: x.papel || x.obs || '' }; });
    const explicito = {}; Object.entries(P.imobibrasil_corretores || {}).forEach(([n, k]) => (explicito[n.toLowerCase()] = k));
    const porNome = {}; Object.entries(C).forEach(([k, x]) => [x.nome_completo, (CI[k] || {}).nome_completo].filter(Boolean).forEach((n) => (porNome[slug(n)] = k)));
    Object.entries(CI).forEach(([k, x]) => { if (x.nome_completo) porNome[slug(x.nome_completo)] = k; });
    const primeiros = {}; Object.keys(pes).forEach((k) => (primeiros[k.split('-')[0]] = primeiros[k.split('-')[0]] || []).push(k));
    const ambig = P.imobibrasil_ambiguos || {};
    function resolve(nm, criaFora) {
      nm = String(nm || '').trim(); if (!nm || nm[0] === '(') return null;
      let k = explicito[nm.toLowerCase()] || porNome[slug(nm)];
      if (!k) { const k1 = alvo(slug(nm.split(/\s+/)[0])); const cs = (primeiros[k1] || []).length ? primeiros[k1] : pes[k1] ? [k1] : [];
        k = cs.length === 1 && !ambig[k1] ? cs[0] : null; }
      k = k ? alvo(k) : criaFora ? slug(nm) : null;
      if (k && !pes[k] && criaFora) pes[k] = { nome: nm, st: 'fora', obs: '' };
      return k && pes[k] ? k : null;
    }
    PESS = { s: H.S.imoveis, i: P, c: C, r: { pes, resolve } };
    return PESS.r;
  }
  function chavesCorretor(PS, it) {
    const txt = String(it.corretor || ''); if (!txt.trim()) return [];
    if (it.camada === 'anuncio') { const k = PS.resolve(txt, true); return k ? [k] : []; }
    const ks = [];
    txt.split(/\s*(?:\/|,|;|\be\b)\s*/i).forEach((pedaco) => {
      const n = pedaco.replace(/\b(ag|agenciador|fech|fechador)\b\.?/gi, '').trim(); if (!n) return;
      const k = PS.resolve(n, false); if (k && !ks.includes(k)) ks.push(k);
    });
    return ks;
  }
  function corretores() { // { chave: nome } de todos os que aparecem nos itens ou na equipe atual
    const PS = pessoas(), o = {}, usados = new Set();
    (itens() || []).forEach((it) => (it.cors || []).forEach((k) => usados.add(k)));
    Object.entries(PS.pes).forEach(([k, p]) => { if (p.st === 'atual' || usados.has(k)) o[k] = p.nome; });
    return o;
  }
  const stCorretor = (k) => ((pessoas().pes[k] || {}).st || 'fora');
  const nomeCorretor = (k) => corretores()[k] || k;

  // ------------------------------------------------------------ base desenhada (mapa-base.js)
  function dec(a) { // [lat0*1e5, lng0*1e5, dLat, dLng, …] → [[lat, lng], …]
    const o = []; let la = 0, ln = 0; for (let i = 0; i < a.length; i += 2) { la += a[i]; ln += a[i + 1]; o.push([la / 1e5, ln / 1e5]); } return o; }
  let BAIRROS = null;
  function bairroCentro(nome) {
    const B = (window.HUB_MAPA_BASE || {}).bai || []; if (!BAIRROS) { BAIRROS = {}; B.forEach((b) => (BAIRROS[norm(b.n)] = b.c)); }
    let k = norm(nome); if (!BAIRROS[k]) k = Object.keys(BAIRROS).sort((a, b) => b.length - a.length).find((n) => k.startsWith(n + ' ') || k.endsWith(' ' + n)) || ({ canajure: 'jurere', 'novo campeche': 'campeche', 'beira mar norte': 'agronomica' })[k];
    const c = k && BAIRROS[k]; return c ? [c[0] / 1e5, c[1] / 1e5] : null;
  }

  // ------------------------------------------------------------ carregamento (Leaflet + base)
  let ESTADO = 'novo', ERRO = '';
  function script(src) { return new Promise((ok, er) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => er(new Error(src)); document.head.appendChild(s); }); }
  async function carrega() {
    if (ESTADO !== 'novo') return; ESTADO = 'carregando';
    try {
      if (!window.L) await script(CDN[0]);
      if (!window.L.markerClusterGroup) await script(CDN[1]);
      if (!window.HUB_MAPA_BASE) await script(BASE_URL).catch(() => {});
      if (!window.HUB_MAPA_EXTRA) await script(EXTRA_URL).catch(() => {});
      ESTADO = 'pronto';
    } catch (e) { ESTADO = 'erro'; ERRO = 'Não consegui carregar a biblioteca do mapa (' + (e && e.message || e) + ').'; }
    H.pede();
  }

  // ------------------------------------------------------------ DOM persistente (o HUB redesenha a aba a cada dado novo;
  // o mapa fica neste nó, que é só reencaixado — assim zoom e posição não se perdem)
  const ROOT = document.createElement('div'); ROOT.id = 'mp-raiz';
  ROOT.innerHTML = `<div class="mp-topo"><h2>Mapa dos imóveis</h2><div class="mp-ver"><label for="mp-ver">Ver como</label><select id="mp-ver"></select>
      <button class="btn" type="button" data-mp="matriz">Quem vê o quê</button></div></div>
    <div id="mp-aviso" class="nota" hidden></div>
    <div id="mp-matriz" hidden></div>
    <details class="mp-filtros" id="mp-filtros"><summary>Filtros <span class="s" id="mp-nfiltros"></span></summary>
      <div class="mp-chips" id="mp-cam" aria-label="Camadas"></div>
      <div class="mp-chips" id="mp-sit" aria-label="Situação"></div>
      <div class="mp-campos"><span class="mp-grp">Imóvel</span>
        <label>Tipo<select id="mp-tipo"></select></label>
        <label>Valor de<input id="mp-vmin" inputmode="numeric" placeholder="R$ mín."></label>
        <label>até<input id="mp-vmax" inputmode="numeric" placeholder="R$ máx."></label>
        <label>Dormitórios<select id="mp-cdorm" data-mp-car="dorm"><option value="">—</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option><option value="5">5+</option></select></label>
        <label>Suítes<select id="mp-csuites" data-mp-car="suites"><option value="">—</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></label>
        <label>Vagas<select id="mp-cvagas" data-mp-car="vagas"><option value="">—</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></label>
        <label>Área privativa (m²)<span class="mp-fx"><input id="mp-cpriv0" data-mp-car="privMin" inputmode="decimal" placeholder="de"><input id="mp-cpriv1" data-mp-car="privMax" inputmode="decimal" placeholder="até"></span></label>
      </div>
      <div class="mp-campos"><span class="mp-grp">Onde e quem</span>
        <label>Corretor<select id="mp-cor"></select></label>
        <div class="mp-lab" style="display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted)">Bairros<span id="mp-bai"></span></div>
        <label>Precisão do ponto<select id="mp-prec"></select></label>
        <label>No Imobibrasil<select id="mp-dcampo"><option value="cad">Cadastrado</option><option value="atu">Atualizado</option></select></label>
        <label>Período<select id="mp-dper"></select></label>
      </div>
      <div class="mp-campos"><span class="mp-grp">Empreendimentos</span>
        <label>Construtora<select id="mp-cons"></select></label>
        <label>Estágio<select id="mp-est"></select></label>
        <label>Entrega<select id="mp-ent"></select></label>
      </div>
      <div class="mp-campos">
        <label class="mp-busca">Buscar<input id="mp-q" type="search" placeholder="Vários termos por vírgula: ref., rua, bairro, proprietário, CPF, 2 dorm, 1,5 mi…"></label>
        <button class="btn" type="button" data-mp="limpar">Limpar filtros</button>
      </div>
      <div id="mp-car"></div>
    </details>
    <div class="mp-vista-l"><div class="mp-chips m3d-vista" role="group" aria-label="Vista do mapa"><button type="button" class="mp-chip" data-mp="v2d" title="Mapa plano">2D</button><button type="button" class="mp-chip" data-mp="v3d" title="Maquete 3D com relevo e prédios">3D</button></div><div class="mp-resumo" id="mp-resumo" aria-live="polite"></div></div><p class="nota m3d-aviso" id="mp3dAviso" hidden></p>
    <div class="mp-corpo"><div id="mp-mapa" role="region" aria-label="Mapa"></div><div id="mp-mapa3d" class="m3d-caixa" role="region" aria-label="Mapa 3D" hidden></div><aside id="mp-painel" aria-live="polite"></aside></div>
    <div class="mp-legenda" id="mp-legenda"></div>
    <div id="mp-semponto"></div>`;
  const $ = (id) => ROOT.querySelector('#' + id);
  let MAP = null, CLU = null, MK = {}, SIG = '', ENQ = false, FOTO = {}, FATIA = {};

  function iniciaMapa() {
    const L = window.L, el = $('mp-mapa'); if (MAP || !L || !el.isConnected) return;
    MAP = L.map(el, { zoomControl: true, preferCanvas: false, minZoom: 10, maxZoom: 18, attributionControl: true, worldCopyJump: false });
    MAP.attributionControl.setPrefix(false); MAP.attributionControl.addAttribution('Desenho: © colaboradores do OpenStreetMap');
    MAP.fitBounds([[-27.84, -48.58], [-27.38, -48.36]]); MAP.setMaxBounds([[-28.3, -49.7], [-26.9, -48.1]]);
    if (window.innerWidth >= 900) $('mp-filtros').open = true;
    const B = window.HUB_MAPA_BASE;
    if (B) {
      const g = L.layerGroup().addTo(MAP);
      (B.terra || []).forEach((p) => L.polygon(p.map((r) => dec(r)), { className: 'mp-terra', interactive: false }).addTo(g));
      (B.agua || []).forEach((p) => L.polygon(p.map((r) => dec(r)), { className: 'mp-lago', interactive: false }).addTo(g));
      // vias: um único traço (multi-linha) por classe — 1 rodovias, 2 principais, 3 secundárias/coletoras (só de perto)
      (B.vias || []).slice().sort((a, b) => b.t - a.t).forEach((v) => L.polyline(v.g.map((r) => dec(r)), { className: 'mp-via mp-via-' + v.t, interactive: false, smoothFactor: 1.5 }).addTo(g));
      (B.bai || []).forEach((b) => {
        b.g.forEach((r) => L.polygon(dec(r), { className: 'mp-bairro', interactive: false }).addTo(g));
        if (b.c) L.tooltip({ permanent: true, direction: 'center', className: 'mp-rot-bairro', interactive: false }).setLatLng([b.c[0] / 1e5, b.c[1] / 1e5]).setContent(esc(b.n)).addTo(g);
      });
    } else $('mp-mapa').classList.add('mp-sem-base');
    iniciaExtra();
    const zm = () => { const z = MAP.getZoom(); el.classList.toggle('mp-perto', z >= 13); el.classList.toggle('mp-z12', z >= 12); el.classList.toggle('mp-z14', z >= 14); el.classList.toggle('mp-z15', z >= 15); el.classList.toggle('mp-z16', z >= 16); }; MAP.on('zoomend', zm); zm();
    // (25/10/2026, pedido do Cleiton) de perto (zoom 17+) o agrupamento continua só para pontos colados (mesma coordenada ou quase):
    // antes ele era desligado no zoom 17 e os imóveis no mesmo ponto ficavam um em cima do outro, parecendo um só.
    // Tocar num grupo de pontos iguais abre o leque com todos (spiderfy), em qualquer zoom.
    CLU = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: (z) => (z >= 17 ? 6 : 38), spiderfyOnMaxZoom: true, spiderfyDistanceMultiplier: 1.6,
      iconCreateFunction: (c) => L.divIcon({ html: '<span>' + c.getChildCount() + '</span>', className: 'mp-grupo', iconSize: [34, 34] }) });
    MAP.addLayer(CLU);
  }

  // ------------------------------------------------------------ ilhas do entorno e ruas da Ilha (mapa-extra.js + mapa-ruas-*.js)
  // Ruas: arquivos por região (grade de EX.passo graus), pedidos só com zoom 14+ e só os que aparecem na tela; cada arquivo é
  // desenhado como poucos traços (um por classe) e os nomes das ruas entram a partir do zoom 16.
  let RUAS = null, ROTS = null; const RUAS_PEDIDAS = {}, RUAS_FEITAS = {};
  function iniciaExtra() {
    const L = window.L, EX = window.HUB_MAPA_EXTRA; if (!EX || !MAP) return;
    const g = L.layerGroup().addTo(MAP);
    (EX.ilhas || []).forEach((il) => {
      (il.g || []).forEach((r) => L.polygon(dec(r), { className: 'mp-terra mp-ilha', interactive: false }).addTo(g));
      if (il.n && il.c) L.tooltip({ permanent: true, direction: 'center', className: 'mp-rot-ilha' + (il.m ? ' mp-rot-ilha-m' : ''), interactive: false }).setLatLng([il.c[0] / 1e5, il.c[1] / 1e5]).setContent(esc(il.n)).addTo(g);
    });
    RUAS = L.layerGroup(); ROTS = L.layerGroup();
    MAP.on('moveend', ruasNaTela); ruasNaTela();
  }
  function ruasNaTela() {
    const EX = window.HUB_MAPA_EXTRA; if (!EX || !MAP || !RUAS) return;
    const z = MAP.getZoom();
    if (z < 14) { if (MAP.hasLayer(RUAS)) MAP.removeLayer(RUAS); if (MAP.hasLayer(ROTS)) MAP.removeLayer(ROTS); return; }
    if (!MAP.hasLayer(RUAS)) RUAS.addTo(MAP);
    if (z >= 16) { if (!MAP.hasLayer(ROTS)) ROTS.addTo(MAP); } else if (MAP.hasLayer(ROTS)) MAP.removeLayer(ROTS);
    const b = MAP.getBounds().pad(0.2), P = EX.passo, O = EX.origem;
    (EX.blocos || []).forEach((k) => {
      if (RUAS_PEDIDAS[k]) return; const [li, co] = k.split('-').map(Number);
      const s = O[0] + li * P, w = O[1] + co * P;
      if (!b.intersects([[s, w], [s + P, w + P]])) return;
      RUAS_PEDIDAS[k] = true;
      script(RUAS_URL(k)).then(() => desenhaRuas(k)).catch(() => { delete RUAS_PEDIDAS[k]; });
    });
    arrumaRotulos(); setTimeout(arrumaRotulos, 120); // de novo depois que os grupos de pontos se redesenham
  }
  function desenhaRuas(k) {
    const L = window.L, R = (window.HUB_MAPA_RUAS || {})[k]; if (!R || RUAS_FEITAS[k]) return; RUAS_FEITAS[k] = true;
    // classes: 1 rodovia/arterial, 2 coletora, 3 rua/servidão, 4 trilha/caminho a pé
    (R.v || []).slice().sort((a, b) => b.t - a.t).forEach((v) => L.polyline(v.g.map((r) => dec(r)), { className: 'mp-rua mp-rua-' + v.t, interactive: false, smoothFactor: 1 }).addTo(RUAS));
    // nome ao longo da rua, girado no ângulo dela (como no Google Maps) — [nome, classe, metros do trecho, [[lat, lng, ângulo], …]]
    // cada nome tem até 3 posições possíveis no trecho; arrumaRotulos mostra a primeira que estiver livre
    (R.n || []).forEach(([nome, c, comp, cands]) => {
      if (!Array.isArray(cands)) return;
      const w = largTxt(nome) + 6;
      const cs = cands.map(([la, ln, ang]) => ({ mk: L.marker([la / 1e5, ln / 1e5], { icon: L.divIcon({ className: 'mp-rot-rua', iconSize: [0, 0], html: `<span style="transform:translate(-50%,-50%) rotate(${+ang || 0}deg)">${esc(nome)}</span>` }), interactive: false, keyboard: false }).addTo(ROTS), ang: +ang || 0 }));
      cs.forEach((x) => { x.ll = x.mk.getLatLng(); });
      ROT_L.push({ nome, c: +c || 3, comp: +comp || 0, w, cs });
    });
    ROT_L.sort((a, b) => a.c - b.c || b.comp - a.comp); arrumaRotulos();
  }
  // Rótulos de rua (25/10/2026, pedido do Cleiton): só aparece o nome que CABE no trecho da rua na tela e que não encosta em outro
  // nome; nomes iguais ficam a pelo menos 220 px um do outro. Prioridade: vias principais, depois os trechos mais longos.
  const ROT_L = []; let CTX_TXT = null;
  function largTxt(t) { try { if (!CTX_TXT) { CTX_TXT = document.createElement('canvas').getContext('2d'); CTX_TXT.font = '10px "Instrument Sans","Segoe UI",system-ui,sans-serif'; } return CTX_TXT.measureText(t).width; } catch (e) { return t.length * 5.4; } }
  function caixa(p, w, h, ang) { const r = ang * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), hw = w / 2, hh = h / 2;
    return { p, r: Math.hypot(hw, hh), q: [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [p.x + x * c - y * s, p.y + x * s + y * c]), ax: [[c, s], [-s, c]] }; }
  function bate(a, b) { if (Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) > a.r + b.r) return false;
    for (const [x, y] of a.ax.concat(b.ax)) { let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      a.q.forEach(([u, v]) => { const d = u * x + v * y; a0 = Math.min(a0, d); a1 = Math.max(a1, d); });
      b.q.forEach(([u, v]) => { const d = u * x + v * y; b0 = Math.min(b0, d); b1 = Math.max(b1, d); });
      if (a1 < b0 || b1 < a0) return false; }
    return true; }
  function arrumaRotulos() {
    if (!MAP || !ROTS || !MAP.hasLayer(ROTS)) return;
    const z = MAP.getZoom(), mpp = 156543.03 * Math.cos(MAP.getCenter().lat * Math.PI / 180) / Math.pow(2, z), b = MAP.getBounds().pad(0.15);
    // os pontos dos imóveis (e grupos) são obstáculos: o nome da rua nunca fica por cima deles
    const cr = MAP.getContainer().getBoundingClientRect(), W = cr.width, Hh = cr.height, porNome = {};
    const postos = [...MAP.getPane('markerPane').querySelectorAll('.leaflet-marker-icon:not(.mp-rot-rua)')].map((e) => { const r = e.getBoundingClientRect(); return r.width ? caixa(window.L.point(r.left - cr.left + r.width / 2, r.top - cr.top + r.height / 2), r.width + 4, r.height + 4, 0) : null; }).filter(Boolean);
    ROT_L.forEach((o) => { let feito = false; const cabe = o.comp / mpp >= o.w * 1.05;
      o.cs.forEach((x) => { const el = x.mk.getElement(); if (!el) return; let ok = !feito && cabe && b.contains(x.ll);
        if (ok) { const p = MAP.latLngToContainerPoint(x.ll), cx = caixa(p, o.w + 4, 13, x.ang);
          if (cx.q.some(([u, v]) => u < 2 || v < 2 || u > W - 2 || v > Hh - 2)) ok = false; // não corta na borda do mapa
          else if ((porNome[o.nome] || []).some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 220)) ok = false;
          else if (postos.some((y) => bate(y, cx))) ok = false;
          if (ok) { feito = true; postos.push(cx); (porNome[o.nome] = porNome[o.nome] || []).push(p); } }
        el.style.display = ok ? '' : 'none'; }); });
  }

  function posicao(it, v) {
    if (!it.p) return null;
    let ll = [it.p.lat, it.p.lng];
    if (v.g && v.m.localizacao === 'bairro') { const c = bairroCentro(it.bairro); ll = c || [Math.round(ll[0] * 100) / 100, Math.round(ll[1] * 100) / 100]; }
    return ll;
  }
  function atualizaMarcadores(V, v) {
    if (!MAP) return;
    const sig = v.nome + '|' + V.map((it) => it.id + (it.p ? it.p.lat + ',' + it.p.lng : '')).join(';');
    if (sig === SIG) return; SIG = sig;
    CLU.clearLayers(); MK = {};
    const L = window.L, ms = [];
    V.forEach((it) => {
      const ll = posicao(it, v); if (!ll) return;
      const pr = v.g && v.m.localizacao === 'bairro' ? 'bairro' : it.p.prec;
      const m = L.marker(ll, { icon: L.divIcon({ className: 'mp-pino', html: `<span class="mp-ponto ${CAM[it.camada][1]} mp-p-${esc(pr)}${it.sit === 'naoconf' ? ' mp-nc' : ''}${SEL === it.id ? ' mp-sel' : ''}"></span>`, iconSize: [16, 16] }),
        keyboard: true, title: it.titulo, alt: it.titulo });
      m.on('click', () => seleciona(it.id));
      MK[it.id] = m; ms.push(m);
    });
    CLU.addLayers(ms);
    mp3dGuarda(V, v);
  }
  function seleciona(id) {
    SEL = id; const k = MK[id];
    ROOT.querySelectorAll('.mp-ponto.mp-sel').forEach((e) => e.classList.remove('mp-sel'));
    if (k && k._icon) { const s = k._icon.querySelector('.mp-ponto'); if (s) s.classList.add('mp-sel'); }
    pintaPainel();
    if (window.innerWidth < 900) { const p = $('mp-painel'); if (p) p.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }

  // ------------------------------------------------------------ painel do item
  function linha(r, t) { return t ? `<div class="mp-l"><span>${esc(r)}</span><b>${t}</b></div>` : ''; }
  function pintaPainel() {
    const P = $('mp-painel'), L = itens() || [], it = L.find((x) => x.id === SEL), v = visao();
    if (!it) { P.innerHTML = `<p class="nota">Clique num ponto para ver o imóvel. Os números nos círculos são grupos de pontos próximos: clique para aproximar.</p>`; return; }
    const ok = (c) => pode(v, it, c), d = it.det || {}, pr = it.p ? (v.g && v.m.localizacao === 'bairro' ? 'bairro' : it.p.prec) : null;
    const det = [d.dormitorios && d.dormitorios + ' dorm.', d.suites && d.suites + (d.suites > 1 ? ' suítes' : ' suíte'), d.banheiros && d.banheiros + ' banh.', d.vagas && d.vagas + (d.vagas > 1 ? ' vagas' : ' vaga'), d.area && String(d.area).replace('.', ',') + ' m²'].filter(Boolean).join(' · ');
    let mapa = ''; try { if (ok('links') && ok('endereco')) mapa = it.manual ? `<a class="lk mapa" href="https://www.google.com/maps/search/?api=1&query=${it.p.lat},${it.p.lng}" target="_blank" rel="noopener" title="Abrir no Google Maps">📍</a>` : H.mapa.apply(null, it.mapa); } catch (_) {}
    const links = ok('links') ? [it.link && it.camada === 'anuncio' ? `<a class="btn" href="${escUrl(it.link)}" target="_blank" rel="noopener">Anúncio no site</a>` : '',
      it.link && it.camada === 'negocio' ? `<a class="btn" href="${escUrl(it.link)}" target="_blank" rel="noopener">Pasta no Drive</a>` : '',
      it.imovel ? `<button class="btn" type="button" data-mp-abrir="${esc(it.imovel)}">Abrir na aba Imóveis</button>` : '',
      !v.g && H.db() && /^[ie]-/.test(it.id) && window.HUB_LINKMAPA ? `<button class="btn" type="button" data-mp-corrige="${esc(it.id)}"${['bairro', 'cidade', 'rua'].includes(pr) ? ' style="border-color:var(--warn)"' : ''}>${['bairro', 'cidade', 'rua'].includes(pr) ? 'Corrigir o ponto: colar link do Maps' : 'Ajustar o ponto (link do Maps)'}</button>` : '',
      it.camada === 'empreendimento' && it.anuncios.length ? `<button class="btn" type="button" data-mp-anuncios="${esc(it.id)}">Ver os ${it.anuncios.length} anúncios na aba Imóveis</button>` : ''].join('') : '';
    P.innerHTML = `<div class="mp-cab"><span class="mp-ponto ${CAM[it.camada][1]}"></span><span class="s">${esc(CAM[it.camada][0])}</span>
        <button class="mp-x" type="button" data-mp="fechar" aria-label="Fechar">×</button></div>
      <h3>${esc(it.titulo)}</h3>
      ${it.camada === 'anuncio' && ok('foto') ? `<div class="mp-foto" id="mp-foto">${fotoHtml(it)}</div>` : ''}
      <div class="mp-ls">
        ${linha('Finalidade', esc(it.fin))}${ok('valor') && it.valor ? linha(it.camada === 'locacao' ? 'Aluguel' : 'Valor', esc(brl0(it.valor))) : ''}${ok('valor') && H.m2 ? (() => { if (it.camada === 'anuncio') { const m = H.m2.anu(it.imovel); return m ? linha('R$/m²', `<span title="${esc(H.m2.titulo(it.imovel))}">${esc(H.m2.fmt(m.v))}</span>`) : ''; } if (it.camada === 'empreendimento' && (it.anuncios || []).length) { const fx = H.m2.faixa(it.anuncios); return ['V', 'A'].filter((f) => fx[f]).map((f) => linha('R$/m² ' + (f === 'V' ? 'venda' : 'aluguel'), esc(H.m2.fmt(fx[f].media) + ' (média de ' + fx[f].n + ')' + (fx[f].n > 1 ? ' · ' + H.m2.fx(fx[f].min, fx[f].max) : '')))).join(''); } return ''; })() : ''}
        ${ok('detalhes') ? linha('Características', esc(H.car ? H.car.resumo(d) : det)) : ''}
        ${ok('detalhes') && (d.comodos || []).length ? linha('Cômodos', esc(d.comodos.join(', '))) : ''}
        ${ok('detalhes') && (d.cond_itens || []).length ? linha('Condomínio', esc(d.cond_itens.join(', '))) : ''}
        ${ok('detalhes') && (d.posicao || []).length ? linha('Posição solar', esc(d.posicao.join(', '))) : ''}
        ${linha('Bairro', esc([it.bairro, it.cidade && norm(it.cidade) !== 'florianopolis' && norm(it.cidade) !== norm(it.bairro) ? it.cidade : ''].filter(Boolean).join(' — ')))}
        ${ok('endereco') ? linha('Endereço', esc(it.end || it.endTxt || '')) : ''}
        ${ok('endereco') && it.empNome ? linha('Empreendimento', esc(it.empNome)) : ''}
        ${ok('situacao') ? linha('Situação', esc(SIT[it.sit] + (it.sit === 'naoconf' ? ' · contrato elaborado, fechamento sem controle na época' : it.camada === 'empreendimento' && it.status ? ' · ' + it.status : ''))) : ''}
        ${it.camada === 'locacao' ? linha('Contrato', esc([it.inicio && H.dt(it.inicio), it.termino && 'até ' + H.dt(it.termino)].filter(Boolean).join(' '))) : ''}
        ${it.data ? linha('Data', esc(H.dt(it.data))) : ''}
        ${it.camada === 'empreendimento' ? linha('Anúncios', esc(it.ativos + ' ativo(s) de ' + it.total)) + linha('Construtora', esc(it.construtora)) : ''}
        ${ok('corretor') ? linha(it.camada === 'anuncio' || it.camada === 'locacao' ? 'Corretor (agenciou)' : 'Corretor', esc(it.corretor)) : ''}
        ${ok('proprietario') ? linha(it.camada === 'locacao' ? 'Locador' : it.camada === 'anuncio' ? 'Proprietário' : 'Vendedor', esc(it.prop)) : ''}
        ${ok('partes') ? linha(it.camada === 'locacao' ? 'Locatário' : 'Comprador', esc(it.parte || '')) : ''}
        ${pr ? linha('Ponto', `<span class="pill ${(PREC[pr] || PREC.rua)[1]}">${esc((PREC[pr] || PREC.rua)[0])}</span>` + (it.manual && it.manual.fonte && !v.g ? ` <span class="s">${esc(it.manual.fonte)}</span>` : '')) : ''}
      </div>
      <div class="mp-acoes">${mapa ? `<span class="mp-gm">Google Maps ${mapa}</span>` : ''}${links}</div>
      ${v.g ? `<p class="nota">Vendo como <b>${esc(v.nome)}</b>: só aparece o que a matriz libera para esse grupo.</p>` : ''}`;
    if (it.camada === 'anuncio' && ok('foto') && FOTO[it.imovel] === undefined) buscaFoto(it.imovel);
  }
  function fotoHtml(it) {
    const f = FOTO[it.imovel];
    if (f === undefined) return '<span class="s">Carregando a foto…</span>';
    if (!f) return '<span class="s">Sem foto coletada.</span>';
    return `<img src="${esc(f)}" alt="Foto do imóvel ${esc(it.ref)}" loading="lazy">`;
  }
  async function buscaFoto(id) {
    FOTO[id] = undefined; const db = H.db(); if (!db) { FOTO[id] = null; return; }
    const f = 'f' + fatia('i-' + id, N_FOTOS);
    try {
      if (!FATIA[f]) FATIA[f] = db.doc('mapa_fotos/' + f).get().then((s) => (s && s.exists ? (s.data() || {}).i || {} : {}));
      const x = (await FATIA[f])['i-' + id]; FOTO[id] = x && /^data:image\//.test(x.mini || '') ? x.mini : null;
    } catch (_) { FOTO[id] = null; delete FATIA[f]; }
    const el = ROOT.querySelector('#mp-foto'); const it = (itens() || []).find((x) => x.id === SEL);
    if (el && it && it.imovel === id) el.innerHTML = fotoHtml(it);
  }

  // ------------------------------------------------------------ matriz (editor)
  function pintaMatriz() {
    const el = $('mp-matriz'); el.hidden = !MATRIZ_ABERTA; if (!MATRIZ_ABERTA) return;
    const m = matriz();
    const sel = (g, k, t) => `<select data-mp-mat="${g}|${k}" aria-label="${esc(GRUPOS[g] + ' — ' + k)}">${OPC[t].filter(([o]) => !(g === 'cliente' && o === 'proprios')).map(([o, n]) => `<option value="${o}"${m[g][k] === o ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
    el.innerHTML = `<div class="card mp-mat"><h3>Quem vê o quê</h3>
      <p class="nota">Aqui você define o que cada grupo vai ver. No HUB, isto é uma <b>prévia</b>: use "Ver como" para conferir. O controle de verdade entra quando o painel dos corretores e o mapa público existirem — cada um receberá só a sua cópia, já filtrada por esta matriz. "Só os que agenciou" usa o corretor do cadastro (quem agenciou).</p>
      <div class="tabela"><table><thead><tr><th>Informação</th>${Object.values(GRUPOS).map((g) => `<th>${g}</th>`).join('')}</tr></thead><tbody>
      ${CAMPOS.map(([k, n, t]) => `<tr><td>${esc(n)}</td>${Object.keys(GRUPOS).map((g) => `<td>${sel(g, k, t)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <div class="mp-acoes"><button class="btn" type="button" data-mp="padrao">Voltar ao padrão</button><span class="s">${esc(SALVANDO)}</span></div></div>`;
  }
  let FILA_MAT = null, GRAVANDO = false;
  async function gravaMatriz(grupos) {
    FILA_MAT = grupos; if (GRAVANDO) return; GRAVANDO = true;
    while (FILA_MAT) {
      const g = FILA_MAT; FILA_MAT = null; SALVANDO = 'Salvando…'; pintaMatriz();
      try { const db = H.db(); if (!db) throw new Error('sem banco'); await db.doc('mapa_acesso/matriz').set({ grupos: g, atualizado_em: new Date().toISOString() }); SALVANDO = 'Salvo.'; }
      catch (e) { SALVANDO = 'Não consegui salvar (' + (e && (e.code || e.message) || 'erro') + ').'; }
    }
    GRAVANDO = false; pintaMatriz(); SIG = ''; H.pede();
  }

  // ------------------------------------------------------------ filtros (opções e contagens)
  function opcoes(id, pares, atual, todos) {
    const el = $(id), h = `<option value="">${todos}</option>` + pares.map(([v, n]) => `<option value="${esc(v)}"${v === atual ? ' selected' : ''}>${esc(n)}</option>`).join('');
    if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; } el.value = atual;
  }
  function pintaFiltros(L, v) {
    // camada conta o que passa na situação; situação conta o que está nas camadas ligadas (25/10/2026)
    const vis = (it) => !v.g || pode(v, it, 'cam_' + it.camada);
    const contaCam = (c) => L.filter((it) => camKey(it) === c && F.sit[it.sit] && vis(it)).length;
    const contaSit = (c) => L.filter((it) => it.sit === c && F.cam[camKey(it)] && vis(it)).length;
    const chips = (id, D, sel, k, cls) => { const h = Object.entries(D).map(([c, n]) => `<button type="button" class="mp-chip" data-mp-${k}="${c}" aria-pressed="${!!sel[c]}">${cls ? `<span class="mp-ponto ${n[1]}${c.startsWith('anuncio:') && c !== 'anuncio:V' ? ' mp-p-loc' : ''}"></span>` : ''}${esc(cls ? n[0] : n)} <span class="s">${k === 'cam' ? contaCam(c) : contaSit(c)}</span></button>`).join('');
      const el = $(id); if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; } };
    chips('mp-cam', CAMF, F.cam, 'cam', true); chips('mp-sit', SIT, F.sit, 'sit', false);
    // empreendimentos, precisão, datas e características à vista
    const EMP = L.filter((it) => it.camada === 'empreendimento' && F.sit[it.sit]);
    const cons = [...new Set(EMP.map((it) => it.construtora).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    opcoes('mp-cons', cons.map((c) => [c, c]), F.cons, cons.length ? 'Todas' : 'Sem construtora no cadastro');
    opcoes('mp-est', Object.entries(ESTAGIO).filter(([k]) => EMP.some((it) => it.est === k)).map(([k, n]) => [k, n + ' (' + EMP.filter((it) => it.est === k).length + ')']), F.est, 'Todos');
    const ents = [...new Set(EMP.map((it) => it.ent).filter(Boolean))].sort((a, b) => (a === 'entregue' ? -1 : b === 'entregue' ? 1 : a.localeCompare(b)));
    opcoes('mp-ent', ents.map((e) => [e, e === 'entregue' ? 'Já entregue' : e]), F.ent, 'Qualquer');
    const comP = L.filter((it) => it.p && F.cam[camKey(it)] && F.sit[it.sit]);
    opcoes('mp-prec', Object.entries(PREC_G).map(([k, [n, ps]]) => [k, n + ' (' + comP.filter((it) => ps.includes(it.p.prec)).length + ')']), F.prec, 'Todas');
    opcoes('mp-dper', [['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias'], ['ano', 'Este ano']], F.dper, 'Qualquer data');
    $('mp-dcampo').value = F.dcampo || 'cad';
    [['mp-cdorm', 'dorm'], ['mp-csuites', 'suites'], ['mp-cvagas', 'vagas']].forEach(([id, k]) => { const el = $(id); if (el.value !== String(F.car[k] || '')) el.value = String(F.car[k] || ''); });
    [['mp-cpriv0', 'privMin'], ['mp-cpriv1', 'privMax']].forEach(([id, k]) => { const el = $(id); if (document.activeElement !== el && el.value !== String(F.car[k] || '')) el.value = String(F.car[k] || ''); });
    if (CAR_SUJO && H.car) { CAR_SUJO = false; $('mp-car').innerHTML = H.car.html(F.car, 'mpc', Object.keys(H.S.imoveis || {}).filter((id) => (H.S.imoveis[id] || {}).ativo)); }
    const tipos = [...new Set(L.map((it) => it.tipo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    opcoes('mp-tipo', tipos.map((t) => [t, t]), F.tipo, 'Todos');
    const cs = corretores(); if (F.cor && !cs[F.cor]) F.cor = '';
    const GR = [['atual', 'Equipe atual'], ['parceiro', 'Parceiros e gestão'], ['saiu', 'Saíram da Vivere'], ['fora', 'Outros cadastros do Imobibrasil (fora da equipe atual)']];
    const selCor = $('mp-cor'), hc = `<option value="">Todos</option>` + GR.map(([g, rot]) => { const L = Object.entries(cs).filter(([k]) => stCorretor(k) === g).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
      return L.length ? `<optgroup label="${esc(rot)}">${L.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join('')}</optgroup>` : ''; }).join('');
    if (selCor.dataset.h !== hc) { selCor.innerHTML = hc; selCor.dataset.h = hc; } selCor.value = F.cor;
    const bs = {}; L.forEach((it) => { if (it.bairro) bs[norm(it.bairro)] = bs[norm(it.bairro)] || it.bairro; });
    { const elB = $('mp-bai'), hb = window.MultiSel.html('mp-bai', Object.entries(bs).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')), BAIS(), 'Todos', 'bairros'); if (elB && elB.dataset.h !== hb) { elB.innerHTML = hb; elB.dataset.h = hb; window.MultiSel.ajusta(); } }
    const vs = [['eu', 'Minha visão (tudo)'], ['diretoria', 'Diretoria'], ['cliente', 'Cliente']].concat(Object.entries(cs).filter(([k]) => stCorretor(k) === 'atual').sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')).map(([k, n]) => ['corretor:' + k, 'Corretor: ' + n]));
    const ve = $('mp-ver'), h = vs.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join(''); if (ve.dataset.h !== h) { ve.innerHTML = h; ve.dataset.h = h; } ve.value = F.ver;
    ['vmin', 'vmax', 'q'].forEach((k) => { const el = $('mp-' + k); if (document.activeElement !== el && el.value !== F[k]) el.value = F[k]; });
  }
  function nFiltros() { return Object.values(F.cam).filter((x) => !x).length + Object.entries(F.sit).filter(([k, x]) => !!F0.sit[k] !== !!x).length + ['tipo', 'vmin', 'vmax', 'cor', 'bai', 'q', 'cons', 'est', 'ent', 'prec', 'dper'].filter((k) => F[k]).length + (H.car ? H.car.ativos(F.car) : 0); }
  function pintaResumo(L, V, v) {
    const nf = nFiltros(); $('mp-nfiltros').textContent = nf ? '(' + nf + ' ativo' + (nf > 1 ? 's' : '') + ')' : '';
    const com = V.filter((it) => it.p).length, sem = V.filter((it) => !it.p);
    const fora = V.filter((it) => it.p && (it.p.lat > -27.3 || it.p.lat < -27.9 || it.p.lng < -48.7 || it.p.lng > -48.3)).length;
    $('mp-resumo').innerHTML = `<b>${com}</b> no mapa${sem.length ? ` · <button type="button" class="lk" data-mp="semponto">${sem.length} sem ponto</button>` : ''}${fora ? ` · ${fora} fora da Grande Florianópolis (afaste o zoom)` : ''}${v.g ? ` · vendo como <b>${esc(v.nome)}</b>` : ''}`;
    $('mp-legenda').innerHTML = Object.entries(CAM).map(([k, n]) => `<span><span class="mp-ponto ${n[1]}"></span>${esc(n[0])}</span>`).join('') +
      `<span><span class="mp-ponto mp-cx mp-p-link"></span>pelo link do Maps</span><span><span class="mp-ponto mp-cx mp-p-rua"></span>ponto na rua</span><span><span class="mp-ponto mp-cx mp-p-bairro"></span>só o bairro</span>` +
      (F.sit.naoconf ? `<span><span class="mp-ponto mp-c3 mp-nc"></span>venda não confirmada (contrato feito; fechamento sem controle)</span>` : '');
    const el = $('mp-semponto');
    if (!SEMPONTO_ABERTO || !sem.length) { el.innerHTML = ''; return; }
    const MOT = { sem_endereco: 'sem endereço', so_bairro: 'só bairro', aproximado: 'endereço incompleto', sem_cep: 'sem CEP', completo: 'aguardando a rotina' };
    el.innerHTML = `<div class="card"><h3>Sem ponto no mapa (${sem.length})</h3><p class="nota">Sem endereço ou ainda não localizados pela rotina (o ponto é calculado na atualização diária do HUB). Endereço incompleto se corrige na seção <b>Links de mapa e localização</b>, no fim desta aba, onde também dá para colar o link do Google Maps.</p>
      <div class="tabela"><table><thead><tr><th>Item</th><th>Camada</th><th>Bairro</th><th>Motivo</th></tr></thead><tbody>${sem.slice(0, 300).map((it) => `<tr><td>${esc(it.titulo)}</td><td>${esc(CAM[it.camada][0])}</td><td>${esc(it.bairro)}</td><td>${esc(!it.g ? 'sem endereço' : it.pq ? (it.pq.prec === 'cidade' ? 'só a cidade (' + (MOT[it.qual] || it.qual) + ')' : 'endereço não encontrado no mapa') : 'aguardando a rotina')}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  // ------------------------------------------------------------ vista 3D (23/11/2026, tarefa vis-mapa-3d-hub-painel)
  // Maquete grátis (MapLibre + relevo da AWS + prédios do OpenFreeMap), escolhida pelo Cleiton em 22/11/2026, ao lado do 2D.
  const MP3D_V = '76b9b264';
  let MP3D = null, MP3D_EST = 'fechado', MP3D_FOCO = null, MP3D_L = [];
  const mp3dLigado = () => { try { return localStorage.getItem('hubv.mapa.vista') === '3d'; } catch (_) { return false; } };
  function mp3dGuarda(V, v) {
    MP3D_L = V.map((it) => { const ll = posicao(it, v); if (!ll) return null; const pr = v.g && v.m.localizacao === 'bairro' ? 'bairro' : it.p.prec;
      return { id: it.id, lat: ll[0], lng: ll[1], cor: 'var(--' + CAM[it.camada][1] + ')', aprox: /bairro|cidade/.test(pr || ''), emp: it.camada === 'empreendimento', titulo: it.titulo }; }).filter(Boolean);
    if (MP3D) MP3D.pontos(MP3D_L);
  }
  function mp3dAviso(t, web) { const a = $('mp3dAviso'); if (!a) return; a.textContent = t || ''; a.hidden = !t;
    if (t && web) { const l = document.createElement('a'); l.href = 'https://vivere-imoveis.github.io/app-vivere/hub/'; l.target = '_blank'; l.rel = 'noopener'; l.textContent = ' Abrir o HUB na web, onde o 3D funciona.'; a.appendChild(l); } }
  function mp3dMostra(tres) { const c2 = $('mp-mapa'), c3 = $('mp-mapa3d'); if (!c2 || !c3) return null; const mudou = c2.hidden !== tres;
    c2.hidden = tres; c2.style.display = tres ? 'none' : ''; c3.hidden = !tres; c3.style.display = tres ? '' : 'none';
    ROOT.querySelectorAll('[data-mp="v2d"],[data-mp="v3d"]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.mp === 'v3d') === tres))); return mudou; }
  function mp3dFalhou(msg) {
    MP3D_EST = 'falhou'; MP3D_FOCO = null; if (MP3D) { try { MP3D.destruir(); } catch (_) {} MP3D = null; }
    mp3dMostra(false); if (MAP) setTimeout(() => MAP.invalidateSize(), 30);
    mp3dAviso((msg || 'Não consegui abrir o mapa 3D agora.') + ' Voltei para a vista 2D; clique em 3D para tentar de novo.', !/github\.io$/.test(location.hostname));
  }
  function mp3dVista(x) {
    if (x) { try { localStorage.setItem('hubv.mapa.vista', x); } catch (_) {} if (x === '3d' && MP3D_EST === 'falhou') MP3D_EST = 'fechado'; }
    const tres = mp3dLigado() && MP3D_EST !== 'falhou', c3 = $('mp-mapa3d');
    if (ESTADO !== 'pronto') return;
    const mudou = mp3dMostra(tres); if (mudou === null) return;
    if (!tres) { if (MP3D_EST !== 'falhou' || x === '2d') mp3dAviso(''); if (mudou && MAP) setTimeout(() => MAP.invalidateSize(), 30); return; }
    if (MP3D) { if (mudou) setTimeout(() => MP3D && MP3D.redimensionar(), 30); if (MP3D_FOCO) { const f = MP3D_FOCO; MP3D_FOCO = null; MP3D.focar(f); } return; }
    if (MP3D_EST === 'abrindo') return; MP3D_EST = 'abrindo'; mp3dAviso('Abrindo o mapa 3D…');
    (window.VivereMapa3D ? Promise.resolve() : script('modulos/mapa3d.js?v=' + MP3D_V))
      .then(() => window.VivereMapa3D.montar(c3, { aoClicar: (id) => { seleciona(id); return null; }, aoFalhar: mp3dFalhou,
        aoAbrir: () => { if (MP3D_EST === 'falhou') return; mp3dAviso(''); if (MP3D) MP3D.pontos(MP3D_L); if (MP3D_FOCO && MP3D) { const f = MP3D_FOCO; MP3D_FOCO = null; MP3D.focar(f); } } }))
      .then((m) => { if (MP3D_EST === 'falhou') { m.destruir(); return; } MP3D = m; MP3D_EST = 'aberto'; m.pontos(MP3D_L); })
      .catch(() => mp3dFalhou(''));
  }
  (function () { if (document.getElementById('mp3d-css')) return; const st = document.createElement('style'); st.id = 'mp3d-css'; st.textContent = '#mp-raiz .mp-vista-l{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:6px 0}#mp-raiz .mp-vista-l .mp-resumo{margin:0}#mp-raiz .m3d-vista .mp-chip{font-weight:600;min-width:42px;justify-content:center}'; document.head.appendChild(st); })();

  // ------------------------------------------------------------ ciclo
  function sincroniza() {
    const host = document.getElementById('mp-host'); if (!host) return;
    if (ROOT.parentNode !== host) { host.appendChild(ROOT); if (MAP) MAP.invalidateSize(); }
    const av = $('mp-aviso');
    if (ESTADO === 'erro') { av.hidden = false; av.textContent = ERRO; return; }
    if (ESTADO !== 'pronto') { av.hidden = false; av.textContent = 'Carregando o mapa…'; carrega(); return; }
    const L = itens();
    if (!L) { av.hidden = false; av.textContent = 'Aguardando o módulo Link do mapa (endereços)…'; return; }
    const semPontos = !Object.keys(H.S.mapa_pontos || {}).length;
    av.hidden = !semPontos; if (semPontos) av.textContent = H.carregado.mapa_pontos ? 'Ainda não há pontos calculados: eles entram na próxima atualização do HUB.' : 'Carregando os pontos…';
    iniciaMapa();
    let v = visao(), V = filtra(L, v);
    // vindo do botão 🗺 de outra aba: garante que o item apareça (filtros voltam ao padrão, com a camada e a situação dele)
    const fi = FOCO_ITEM && L.find((it) => it.id === FOCO_ITEM);
    if (fi && fi.p && !V.some((it) => it.id === fi.id)) { const ver = F.ver; F = JSON.parse(JSON.stringify(F0)); F.ver = ver; F.cam[camKey(fi)] = 1; F.sit[fi.sit] = 1; CAR_SUJO = true; guarda(); SIG = SIG + '*'; v = visao(); V = filtra(L, v); }
    pintaFiltros(L, v); pintaMatriz(); atualizaMarcadores(V, v); pintaResumo(L, V, v);
    if (FOCO_ITEM && MAP) { const id = FOCO_ITEM; FOCO_ITEM = null;
      if (fi && fi.p) { const ll = posicao(fi, v) || [fi.p.lat, fi.p.lng]; if (mp3dLigado()) MP3D_FOCO = id; MAP.setView(ll, 17); SEL = id; setTimeout(() => seleciona(id), 350); }
      else { const av2 = $('mp-aviso'); av2.hidden = false; av2.textContent = (fi ? fi.titulo : id) + ': ainda sem ponto no mapa. Corrija o endereço ou cole o link do Google Maps na seção Links de mapa e localização, no fim desta aba.'; } }
    if (SEL && !V.some((it) => it.id === SEL)) SEL = null;
    pintaPainel();
    mp3dVista(null);
  }
  function agenda() { if (ENQ) return; ENQ = true; setTimeout(() => { ENQ = false; sincroniza(); }, 0); }
  function muda() { guarda(); SIG = SIG + '*'; sincroniza(); }

  ROOT.addEventListener('click', (e) => {
    if (H.car && H.car.evento(e, 'mpc', F.car)) { CAR_SUJO = true; return muda(); }
    const b = e.target.closest('button, [data-mp]'); if (!b || !ROOT.contains(b)) return;
    if (b.dataset.mpCam) { F.cam[b.dataset.mpCam] = F.cam[b.dataset.mpCam] ? 0 : 1; return muda(); }
    if (b.dataset.mpSit) { F.sit[b.dataset.mpSit] = F.sit[b.dataset.mpSit] ? 0 : 1; return muda(); }
    if (b.dataset.mpAbrir) return H.abrirImovel([b.dataset.mpAbrir], 'Do mapa');
    // "Corrigir o ponto": abre a seção Links de mapa já no imóvel, com o campo de colar o link do Maps aberto
    if (b.dataset.mpCorrige) { LINKS_ABERTO = true; try { localStorage.setItem('hubv.mapa.links', '1'); } catch (_) {} const LM = window.HUB_LINKMAPA; if (LM && typeof LM.focoSecao === 'function') LM.focoSecao(b.dataset.mpCorrige, true); H.pede(); return; }
    if (b.dataset.mpAnuncios) { const it = (itens() || []).find((x) => x.id === b.dataset.mpAnuncios); if (it) H.abrirImovel(it.anuncios, 'Anúncios de ' + it.titulo + ' (do mapa)'); return; }
    const a = b.dataset.mp;
    if (a === 'v2d' || a === 'v3d') return mp3dVista(a === 'v3d' ? '3d' : '2d');
    if (a === 'limpar') { const ver = F.ver; F = JSON.parse(JSON.stringify(F0)); F.ver = ver; CAR_SUJO = true; return muda(); }
    if (a === 'fechar') { SEL = null; ROOT.querySelectorAll('.mp-ponto.mp-sel').forEach((x) => x.classList.remove('mp-sel')); return pintaPainel(); }
    if (a === 'matriz') { MATRIZ_ABERTA = !MATRIZ_ABERTA; SALVANDO = ''; return pintaMatriz(); }
    if (a === 'semponto') { SEMPONTO_ABERTO = !SEMPONTO_ABERTO; return sincroniza(); }
    if (a === 'padrao') { const g = {}; Object.keys(GRUPOS).forEach((k) => (g[k] = Object.assign({}, PADRAO[k]))); return gravaMatriz(g); }
  });
  ROOT.addEventListener('ms-change', (e) => { if (e.detail && e.detail.id === 'mp-bai') { F.bai = e.detail.valores.slice(); muda(); } });
  ROOT.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.mpMat) { const [g, k] = t.dataset.mpMat.split('|'), m = matriz(); m[g][k] = t.value; return gravaMatriz(m); }
    if (t.dataset.mpCar) { const v0 = t.value.trim(); if (v0) F.car[t.dataset.mpCar] = v0; else delete F.car[t.dataset.mpCar]; CAR_SUJO = true; return muda(); }
    const k = { 'mp-tipo': 'tipo', 'mp-cor': 'cor', 'mp-bai': 'bai', 'mp-ver': 'ver', 'mp-cons': 'cons', 'mp-est': 'est', 'mp-ent': 'ent', 'mp-prec': 'prec', 'mp-dper': 'dper', 'mp-dcampo': 'dcampo' }[t.id];
    if (k) { F[k] = t.value; if (k === 'ver') SEL = SEL; muda(); }
  });
  let TQ = null;
  ROOT.addEventListener('input', (e) => {
    if (H.car && e.target.id && e.target.id.startsWith('mpc-')) { H.car.evento(e, 'mpc', F.car); clearTimeout(TQ); TQ = setTimeout(muda, 300); return; }
    const k = { 'mp-vmin': 'vmin', 'mp-vmax': 'vmax', 'mp-q': 'q' }[e.target.id]; if (!k) return;
    F[k] = e.target.value; clearTimeout(TQ); TQ = setTimeout(muda, 250);
  });

  // ------------------------------------------------------------ estilos (Leaflet sem imagens externas + aba)
  if (!document.getElementById('mp-css')) {
    const st = document.createElement('style'); st.id = 'mp-css';
    st.textContent = `.leaflet-pane, .leaflet-tile, .leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-tile-container, .leaflet-pane > svg, .leaflet-pane > canvas, .leaflet-zoom-box, .leaflet-image-layer, .leaflet-layer { position: absolute; left: 0; top: 0; } .leaflet-container { overflow: hidden; } .leaflet-tile, .leaflet-marker-icon, .leaflet-marker-shadow { -webkit-user-select: none; -moz-user-select: none; user-select: none; -webkit-user-drag: none; } .leaflet-tile::selection { background: transparent; } .leaflet-safari .leaflet-tile { image-rendering: -webkit-optimize-contrast; } .leaflet-safari .leaflet-tile-container { width: 1600px; height: 1600px; -webkit-transform-origin: 0 0; } .leaflet-marker-icon, .leaflet-marker-shadow { display: block; } .leaflet-container .leaflet-overlay-pane svg { max-width: none !important; max-height: none !important; } .leaflet-container .leaflet-marker-pane img, .leaflet-container .leaflet-shadow-pane img, .leaflet-container .leaflet-tile-pane img, .leaflet-container img.leaflet-image-layer, .leaflet-container .leaflet-tile { max-width: none !important; max-height: none !important; width: auto; padding: 0; } .leaflet-container img.leaflet-tile { mix-blend-mode: plus-lighter; } .leaflet-container.leaflet-touch-zoom { -ms-touch-action: pan-x pan-y; touch-action: pan-x pan-y; } .leaflet-container.leaflet-touch-drag { -ms-touch-action: pinch-zoom; touch-action: none; touch-action: pinch-zoom; } .leaflet-container.leaflet-touch-drag.leaflet-touch-zoom { -ms-touch-action: none; touch-action: none; } .leaflet-container { -webkit-tap-highlight-color: transparent; } .leaflet-container a { -webkit-tap-highlight-color: rgba(51, 181, 229, 0.4); } .leaflet-tile { filter: inherit; visibility: hidden; } .leaflet-tile-loaded { visibility: inherit; } .leaflet-zoom-box { width: 0; height: 0; -moz-box-sizing: border-box; box-sizing: border-box; z-index: 800; } .leaflet-overlay-pane svg { -moz-user-select: none; } .leaflet-pane { z-index: 400; } .leaflet-tile-pane { z-index: 200; } .leaflet-overlay-pane { z-index: 400; } .leaflet-shadow-pane { z-index: 500; } .leaflet-marker-pane { z-index: 600; } .leaflet-tooltip-pane { z-index: 650; } .leaflet-popup-pane { z-index: 700; } .leaflet-map-pane canvas { z-index: 100; } .leaflet-map-pane svg { z-index: 200; } .leaflet-vml-shape { width: 1px; height: 1px; } .leaflet-control { position: relative; z-index: 800; pointer-events: visiblePainted; pointer-events: auto; } .leaflet-top, .leaflet-bottom { position: absolute; z-index: 1000; pointer-events: none; } .leaflet-top { top: 0; } .leaflet-right { right: 0; } .leaflet-bottom { bottom: 0; } .leaflet-left { left: 0; } .leaflet-control { float: left; clear: both; } .leaflet-right .leaflet-control { float: right; } .leaflet-top .leaflet-control { margin-top: 10px; } .leaflet-bottom .leaflet-control { margin-bottom: 10px; } .leaflet-left .leaflet-control { margin-left: 10px; } .leaflet-right .leaflet-control { margin-right: 10px; } .leaflet-fade-anim .leaflet-popup { opacity: 0; -webkit-transition: opacity 0.2s linear; -moz-transition: opacity 0.2s linear; transition: opacity 0.2s linear; } .leaflet-fade-anim .leaflet-map-pane .leaflet-popup { opacity: 1; } .leaflet-zoom-animated { -webkit-transform-origin: 0 0; -ms-transform-origin: 0 0; transform-origin: 0 0; } svg.leaflet-zoom-animated { will-change: transform; } .leaflet-zoom-anim .leaflet-zoom-animated { -webkit-transition: -webkit-transform 0.25s cubic-bezier(0,0,0.25,1); -moz-transition: -moz-transform 0.25s cubic-bezier(0,0,0.25,1); transition: transform 0.25s cubic-bezier(0,0,0.25,1); } .leaflet-zoom-anim .leaflet-tile, .leaflet-pan-anim .leaflet-tile { -webkit-transition: none; -moz-transition: none; transition: none; } .leaflet-zoom-anim .leaflet-zoom-hide { visibility: hidden; } .leaflet-interactive { cursor: pointer; } .leaflet-grab { cursor: -webkit-grab; cursor: -moz-grab; cursor: grab; } .leaflet-crosshair, .leaflet-crosshair .leaflet-interactive { cursor: crosshair; } .leaflet-popup-pane, .leaflet-control { cursor: auto; } .leaflet-dragging .leaflet-grab, .leaflet-dragging .leaflet-grab .leaflet-interactive, .leaflet-dragging .leaflet-marker-draggable { cursor: move; cursor: -webkit-grabbing; cursor: -moz-grabbing; cursor: grabbing; } .leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-image-layer, .leaflet-pane > svg path, .leaflet-tile-container { pointer-events: none; } .leaflet-marker-icon.leaflet-interactive, .leaflet-image-layer.leaflet-interactive, .leaflet-pane > svg path.leaflet-interactive, svg.leaflet-image-layer.leaflet-interactive path { pointer-events: visiblePainted; pointer-events: auto; } .leaflet-container { background: #ddd; outline-offset: 1px; } .leaflet-container a { color: #0078A8; } .leaflet-zoom-box { border: 2px dotted #38f; background: rgba(255,255,255,0.5); } .leaflet-container { font-family: "Helvetica Neue", Arial, Helvetica, sans-serif; font-size: 12px; font-size: 0.75rem; line-height: 1.5; } .leaflet-bar { box-shadow: 0 1px 5px rgba(0,0,0,0.65); border-radius: 4px; } .leaflet-bar a { background-color: #fff; border-bottom: 1px solid #ccc; width: 26px; height: 26px; line-height: 26px; display: block; text-align: center; text-decoration: none; color: black; } .leaflet-bar a, .leaflet-control-layers-toggle { background-position: 50% 50%; background-repeat: no-repeat; display: block; } .leaflet-bar a:hover, .leaflet-bar a:focus { background-color: #f4f4f4; } .leaflet-bar a:first-child { border-top-left-radius: 4px; border-top-right-radius: 4px; } .leaflet-bar a:last-child { border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; border-bottom: none; } .leaflet-bar a.leaflet-disabled { cursor: default; background-color: #f4f4f4; color: #bbb; } .leaflet-touch .leaflet-bar a { width: 30px; height: 30px; line-height: 30px; } .leaflet-touch .leaflet-bar a:first-child { border-top-left-radius: 2px; border-top-right-radius: 2px; } .leaflet-touch .leaflet-bar a:last-child { border-bottom-left-radius: 2px; border-bottom-right-radius: 2px; } .leaflet-control-zoom-in, .leaflet-control-zoom-out { font: bold 18px 'Lucida Console', Monaco, monospace; text-indent: 1px; } .leaflet-touch .leaflet-control-zoom-in, .leaflet-touch .leaflet-control-zoom-out { font-size: 22px; } .leaflet-control-layers { box-shadow: 0 1px 5px rgba(0,0,0,0.4); background: #fff; border-radius: 5px; } .leaflet-touch .leaflet-control-layers-toggle { width: 44px; height: 44px; } .leaflet-control-layers .leaflet-control-layers-list, .leaflet-control-layers-expanded .leaflet-control-layers-toggle { display: none; } .leaflet-control-layers-expanded .leaflet-control-layers-list { display: block; position: relative; } .leaflet-control-layers-expanded { padding: 6px 10px 6px 6px; color: #333; background: #fff; } .leaflet-control-layers-scrollbar { overflow-y: scroll; overflow-x: hidden; padding-right: 5px; } .leaflet-control-layers-selector { margin-top: 2px; position: relative; top: 1px; } .leaflet-control-layers label { display: block; font-size: 13px; font-size: 1.08333em; } .leaflet-control-layers-separator { height: 0; border-top: 1px solid #ddd; margin: 5px -10px 5px -6px; } .leaflet-container .leaflet-control-attribution { background: #fff; background: rgba(255, 255, 255, 0.8); margin: 0; } .leaflet-control-attribution, .leaflet-control-scale-line { padding: 0 5px; color: #333; line-height: 1.4; } .leaflet-control-attribution a { text-decoration: none; } .leaflet-control-attribution a:hover, .leaflet-control-attribution a:focus { text-decoration: underline; } .leaflet-attribution-flag { display: inline !important; vertical-align: baseline !important; width: 1em; height: 0.6669em; } .leaflet-left .leaflet-control-scale { margin-left: 5px; } .leaflet-bottom .leaflet-control-scale { margin-bottom: 5px; } .leaflet-control-scale-line { border: 2px solid #777; border-top: none; line-height: 1.1; padding: 2px 5px 1px; white-space: nowrap; -moz-box-sizing: border-box; box-sizing: border-box; background: rgba(255, 255, 255, 0.8); text-shadow: 1px 1px #fff; } .leaflet-control-scale-line:not(:first-child) { border-top: 2px solid #777; border-bottom: none; margin-top: -2px; } .leaflet-control-scale-line:not(:first-child):not(:last-child) { border-bottom: 2px solid #777; } .leaflet-touch .leaflet-control-attribution, .leaflet-touch .leaflet-control-layers, .leaflet-touch .leaflet-bar { box-shadow: none; } .leaflet-touch .leaflet-control-layers, .leaflet-touch .leaflet-bar { border: 2px solid rgba(0,0,0,0.2); background-clip: padding-box; } .leaflet-popup { position: absolute; text-align: center; margin-bottom: 20px; } .leaflet-popup-content-wrapper { padding: 1px; text-align: left; border-radius: 12px; } .leaflet-popup-content { margin: 13px 24px 13px 20px; line-height: 1.3; font-size: 13px; font-size: 1.08333em; min-height: 1px; } .leaflet-popup-content p { margin: 17px 0; margin: 1.3em 0; } .leaflet-popup-tip-container { width: 40px; height: 20px; position: absolute; left: 50%; margin-top: -1px; margin-left: -20px; overflow: hidden; pointer-events: none; } .leaflet-popup-tip { width: 17px; height: 17px; padding: 1px; margin: -10px auto 0; pointer-events: auto; -webkit-transform: rotate(45deg); -moz-transform: rotate(45deg); -ms-transform: rotate(45deg); transform: rotate(45deg); } .leaflet-popup-content-wrapper, .leaflet-popup-tip { background: white; color: #333; box-shadow: 0 3px 14px rgba(0,0,0,0.4); } .leaflet-container a.leaflet-popup-close-button { position: absolute; top: 0; right: 0; border: none; text-align: center; width: 24px; height: 24px; font: 16px/24px Tahoma, Verdana, sans-serif; color: #757575; text-decoration: none; background: transparent; } .leaflet-container a.leaflet-popup-close-button:hover, .leaflet-container a.leaflet-popup-close-button:focus { color: #585858; } .leaflet-popup-scrolled { overflow: auto; } .leaflet-oldie .leaflet-popup-content-wrapper { -ms-zoom: 1; } .leaflet-oldie .leaflet-popup-tip { width: 24px; margin: 0 auto; -ms-filter: "progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)"; filter: progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678); } .leaflet-oldie .leaflet-control-zoom, .leaflet-oldie .leaflet-control-layers, .leaflet-oldie .leaflet-popup-content-wrapper, .leaflet-oldie .leaflet-popup-tip { border: 1px solid #999; } .leaflet-div-icon { background: #fff; border: 1px solid #666; } .leaflet-tooltip { position: absolute; padding: 6px; background-color: #fff; border: 1px solid #fff; border-radius: 3px; color: #222; white-space: nowrap; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; pointer-events: none; box-shadow: 0 1px 3px rgba(0,0,0,0.4); } .leaflet-tooltip.leaflet-interactive { cursor: pointer; pointer-events: auto; } .leaflet-tooltip-top:before, .leaflet-tooltip-bottom:before, .leaflet-tooltip-left:before, .leaflet-tooltip-right:before { position: absolute; pointer-events: none; border: 6px solid transparent; background: transparent; content: ""; } .leaflet-tooltip-bottom { margin-top: 6px; } .leaflet-tooltip-top { margin-top: -6px; } .leaflet-tooltip-bottom:before, .leaflet-tooltip-top:before { left: 50%; margin-left: -6px; } .leaflet-tooltip-top:before { bottom: 0; margin-bottom: -12px; border-top-color: #fff; } .leaflet-tooltip-bottom:before { top: 0; margin-top: -12px; margin-left: -6px; border-bottom-color: #fff; } .leaflet-tooltip-left { margin-left: -6px; } .leaflet-tooltip-right { margin-left: 6px; } .leaflet-tooltip-left:before, .leaflet-tooltip-right:before { top: 50%; margin-top: -6px; } .leaflet-tooltip-left:before { right: 0; margin-right: -12px; border-left-color: #fff; } .leaflet-tooltip-right:before { left: 0; margin-left: -12px; border-right-color: #fff; } @media print { .leaflet-control { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
.leaflet-cluster-anim .leaflet-marker-icon, .leaflet-cluster-anim .leaflet-marker-shadow { -webkit-transition: -webkit-transform 0.3s ease-out, opacity 0.3s ease-in; -moz-transition: -moz-transform 0.3s ease-out, opacity 0.3s ease-in; -o-transition: -o-transform 0.3s ease-out, opacity 0.3s ease-in; transition: transform 0.3s ease-out, opacity 0.3s ease-in; } .leaflet-cluster-spider-leg { -webkit-transition: -webkit-stroke-dashoffset 0.3s ease-out, -webkit-stroke-opacity 0.3s ease-in; -moz-transition: -moz-stroke-dashoffset 0.3s ease-out, -moz-stroke-opacity 0.3s ease-in; -o-transition: -o-stroke-dashoffset 0.3s ease-out, -o-stroke-opacity 0.3s ease-in; transition: stroke-dashoffset 0.3s ease-out, stroke-opacity 0.3s ease-in; }

#mp-raiz{--mp-agua:#d9e6ec;--mp-terra:#f7f7f2;--mp-borda:#c9ccbf;--mp-via1:#d9a441;--mp-via2:#e6c27a;--mp-via3:#d8c49a;--mp-rot:#6b7280;
  --mp-c1:#2f6f73;--mp-c2:#2f7a55;--mp-c3:#b0402e;--mp-c4:#9a6a12;--mp-c5:#6a4fa3}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) #mp-raiz{--mp-agua:#0e1822;--mp-terra:#1b212b;--mp-borda:#2e3644;--mp-via1:#a67b2c;--mp-via2:#7d6331;--mp-via3:#5c5240;--mp-rot:#9aa2b0;
  --mp-c1:#6fb8bc;--mp-c2:#7cc79c;--mp-c3:#f08a76;--mp-c4:#e2b45a;--mp-c5:#b69ce8}}
:root[data-theme="dark"] #mp-raiz{--mp-agua:#0e1822;--mp-terra:#1b212b;--mp-borda:#2e3644;--mp-via1:#a67b2c;--mp-via2:#7d6331;--mp-via3:#5c5240;--mp-rot:#9aa2b0;
  --mp-c1:#6fb8bc;--mp-c2:#7cc79c;--mp-c3:#f08a76;--mp-c4:#e2b45a;--mp-c5:#b69ce8}
#mp-raiz .mp-topo{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between}
#mp-raiz .mp-topo h2{margin:0}
#mp-raiz .mp-ver{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#mp-raiz .mp-ver label{font-size:13px;color:var(--muted)}
#mp-raiz select,#mp-raiz input{font:inherit;font-size:14px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);max-width:100%}
#mp-raiz .mp-filtros{margin:12px 0 6px}#mp-raiz .mp-filtros>summary{cursor:pointer;font-size:14px;font-weight:500;padding:4px 0}#mp-raiz .mp-filtros[open]>summary{margin-bottom:8px}#mp-raiz .mp-filtros>div{margin-bottom:8px}
#mp-raiz .mp-chips{display:flex;flex-wrap:wrap;gap:6px}
#mp-raiz .mp-chip{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:13px;padding:5px 10px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--muted);cursor:pointer}
#mp-raiz .mp-chip[aria-pressed="true"]{color:var(--ink);border-color:var(--ink);background:var(--soft)}
#mp-raiz .mp-chip .s{font-size:12px}
#mp-raiz .mp-campos{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:flex-end}
#mp-raiz .mp-campos+.mp-campos{margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)}
#mp-raiz .mp-grp{flex:0 0 100%;font-family:var(--display);text-transform:uppercase;letter-spacing:.14em;font-size:10px;color:var(--muted)}
#mp-raiz .mp-fx{display:flex;gap:4px}#mp-raiz .mp-campos .mp-fx input{width:64px}
#mp-raiz .mp-ponto.mp-p-loc{box-shadow:inset 0 0 0 2px var(--mp-terra)}
#mp-raiz .mp-campos label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted)}
#mp-raiz .mp-campos input{width:110px}#mp-raiz .mp-busca input{width:170px}
#mp-raiz .mp-resumo{font-size:14px;margin:6px 0}
#mp-raiz .lk{background:none;border:0;padding:0;font:inherit;color:var(--teal);text-decoration:underline;cursor:pointer}
#mp-raiz .mp-corpo{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:12px;align-items:start}
#mp-raiz #mp-mapa{height:min(72vh,720px);min-height:420px;border:1px solid var(--line);border-radius:10px;background:var(--mp-agua);z-index:0}
#mp-raiz #mp-painel{border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:12px 14px;max-height:min(72vh,720px);overflow:auto}
@media (max-width:900px){#mp-raiz .mp-corpo{grid-template-columns:1fr}#mp-raiz #mp-mapa{height:60vh;min-height:340px}#mp-raiz #mp-painel{max-height:none}}
#mp-raiz .mp-cab{display:flex;align-items:center;gap:6px}#mp-raiz .mp-cab .mp-x{margin-left:auto;background:none;border:0;font-size:22px;line-height:1;color:var(--muted);cursor:pointer}
#mp-raiz #mp-painel h3{margin:6px 0 8px;font-size:17px}
#mp-raiz .mp-foto img{width:100%;border-radius:8px;display:block;margin-bottom:8px}
#mp-raiz .mp-ls{display:grid;gap:4px;font-size:14px}
#mp-raiz .mp-l{display:grid;grid-template-columns:118px 1fr;gap:8px}#mp-raiz .mp-l span{color:var(--muted)}#mp-raiz .mp-l b{font-weight:500;word-break:break-word}
#mp-raiz .mp-acoes{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px}
#mp-raiz .mp-gm{font-size:14px}
#mp-raiz .mp-legenda{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;color:var(--muted);margin:8px 0}
#mp-raiz .mp-legenda>span{display:inline-flex;align-items:center;gap:6px}
#mp-raiz .mp-ponto{display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--c);border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35);box-sizing:content-box}
#mp-raiz .mp-c1{--c:var(--mp-c1)}#mp-raiz .mp-c2{--c:var(--mp-c2)}#mp-raiz .mp-c3{--c:var(--mp-c3)}#mp-raiz .mp-c4{--c:var(--mp-c4)}#mp-raiz .mp-c5{--c:var(--mp-c5)}#mp-raiz .mp-cx{--c:var(--muted)}
#mp-raiz .mp-ponto.mp-p-rua{width:9px;height:9px;border-width:2px}
#mp-raiz .mp-ponto.mp-p-bairro,#mp-raiz .mp-ponto.mp-p-cidade{background:transparent;border:3px solid var(--c);box-shadow:none;width:9px;height:9px}
#mp-raiz .mp-ponto.mp-nc{opacity:.6;outline:2px dashed var(--c);outline-offset:2px}
#mp-raiz .mp-ponto.mp-sel{box-shadow:0 0 0 3px var(--ink);transform:scale(1.35)}
#mp-raiz .mp-pino{background:none;border:0;display:flex;align-items:center;justify-content:center}
#mp-raiz .mp-grupo{background:none}
#mp-raiz .mp-grupo span{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--panel);font-size:13px;font-weight:600;border:2px solid var(--panel);box-shadow:0 1px 4px rgba(0,0,0,.3)}
#mp-raiz .mp-terra{fill:var(--mp-terra);fill-opacity:1;stroke:var(--mp-borda);stroke-width:1}
#mp-raiz .mp-lago{fill:var(--mp-agua);fill-opacity:1;stroke:var(--mp-borda);stroke-width:.8}
#mp-raiz .mp-bairro{fill:none;stroke:var(--mp-borda);stroke-width:1;stroke-dasharray:3 3}
#mp-raiz .mp-via{fill:none;stroke-linecap:round;stroke-linejoin:round}
#mp-raiz .mp-via-1{stroke:var(--mp-via1);stroke-width:2.6}#mp-raiz .mp-via-2{stroke:var(--mp-via2);stroke-width:1.8}#mp-raiz .mp-via-3{stroke:var(--mp-via3);stroke-width:1.2;display:none}
#mp-raiz .mp-z12 .mp-via-3{display:inline}#mp-raiz .mp-perto .mp-via-1{stroke-width:4}#mp-raiz .mp-perto .mp-via-2{stroke-width:3}#mp-raiz .mp-perto .mp-via-3{stroke-width:2}
#mp-raiz .mp-z15 .mp-via-1{stroke-width:7}#mp-raiz .mp-z15 .mp-via-2{stroke-width:5.5}#mp-raiz .mp-z15 .mp-via-3{stroke-width:4}
#mp-raiz .mp-rot-bairro{background:none;border:0;box-shadow:none;color:var(--mp-rot);font-size:11px;font-weight:500;text-shadow:0 0 3px var(--mp-terra),0 0 3px var(--mp-terra);display:none;padding:0}
#mp-raiz .mp-rot-bairro:before{display:none}
#mp-raiz .mp-perto .mp-rot-bairro{display:block}
#mp-raiz .leaflet-container{font:inherit;background:var(--mp-agua)}
#mp-raiz .leaflet-control-attribution{font-size:10px}
#mp-raiz .mp-ponto.mp-p-link{outline:2px solid var(--c);outline-offset:1px}
#mp-raiz .mp-rua{fill:none;stroke-linecap:round;stroke-linejoin:round}
#mp-raiz .mp-rua-1{stroke:var(--mp-via1);stroke-width:3}#mp-raiz .mp-rua-2{stroke:var(--mp-via2);stroke-width:2.4}#mp-raiz .mp-rua-3{stroke:var(--mp-via3);stroke-width:1.6;stroke-opacity:.85}#mp-raiz .mp-rua-4{stroke:var(--mp-via3);stroke-width:1;stroke-dasharray:3 3;stroke-opacity:.8}
#mp-raiz .mp-z16 .mp-rua-1{stroke-width:6}#mp-raiz .mp-z16 .mp-rua-2{stroke-width:4.5}#mp-raiz .mp-z16 .mp-rua-3{stroke-width:3.2}#mp-raiz .mp-z16 .mp-rua-4{stroke-width:1.6}
#mp-raiz .mp-rot-rua{background:none;border:0;box-shadow:none;width:0;height:0;overflow:visible;pointer-events:none}
#mp-raiz .mp-rot-rua span{position:absolute;left:0;top:0;white-space:nowrap;transform-origin:50% 50%;color:var(--mp-rot);font:500 10px/1 "Instrument Sans","Segoe UI",system-ui,sans-serif;letter-spacing:.02em;text-shadow:0 0 3px var(--mp-terra),0 0 3px var(--mp-terra),0 0 2px var(--mp-terra)}
#mp-raiz .mp-rot-rua:before,#mp-raiz .mp-rot-ilha:before{display:none}
#mp-raiz .mp-rot-ilha{background:none;border:0;box-shadow:none;color:var(--mp-rot);font-size:10px;font-style:italic;padding:0;text-shadow:0 0 3px var(--mp-agua),0 0 3px var(--mp-agua);display:none}
#mp-raiz .mp-rot-ilha.mp-rot-ilha-m,#mp-raiz .mp-z12 .mp-rot-ilha{display:block}
details.mp-links{margin-top:18px;border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:8px 14px 14px}
details.mp-links>summary{cursor:pointer;font-family:var(--display);text-transform:uppercase;letter-spacing:.14em;font-size:12px;padding:6px 0}
details.mp-links h2{margin-top:10px}
@media (max-width:640px){details.mp-links .tabela{overflow:visible;border:0;background:none}details.mp-links table,details.mp-links tbody,details.mp-links tr,details.mp-links td{display:block;width:auto}details.mp-links thead{display:none}details.mp-links tr{border:1px solid var(--line);border-radius:8px;background:var(--panel);padding:8px 10px;margin-bottom:8px}details.mp-links td{border:0;padding:3px 0}details.mp-links td:not([colspan]):nth-child(2)::before{content:"Bairro: "}details.mp-links td:not([colspan]):nth-child(4)::before{content:"CEP: "}details.mp-links td:not([colspan]):nth-child(5)::before{content:"Situação: "}details.mp-links td:not([colspan])::before{color:var(--muted);font-size:12px}#mp-aviso{overflow-wrap:anywhere}details.mp-links td.lnk{white-space:normal;padding-top:6px}details.mp-links td.lnk .btn,details.mp-links td.lnk .lk{margin:3px 4px 3px 0}}
#mp-raiz .mp-mat td{min-width:120px}#mp-raiz .mp-mat select{width:100%}
`;
    document.head.appendChild(st);
  }

  // ------------------------------------------------------------ seção "Links de mapa e localização" (antiga aba do módulo link-mapa)
  let LINKS_ABERTO = (() => { try { return localStorage.getItem('hubv.mapa.links') !== '0'; } catch (_) { return true; } })();
  function secaoLinks() {
    const LM = window.HUB_LINKMAPA; if (!LM || typeof LM.secao !== 'function') return '';
    let h = ''; try { h = LM.secao(); } catch (e) { h = '<p class="nota">Erro na seção de links: ' + esc(e && e.message || e) + '</p>'; }
    return `<details class="mp-links" id="mp-links"${LINKS_ABERTO ? ' open' : ''}><summary>Links de mapa e localização</summary>${h}</details>`;
  }
  document.addEventListener('toggle', (e) => { if (e.target && e.target.id === 'mp-links') { LINKS_ABERTO = e.target.open; try { localStorage.setItem('hubv.mapa.links', LINKS_ABERTO ? '1' : '0'); } catch (_) {} } }, true);

  H.registrar({
    id: ID, aba: 'Mapa', grupo: 'imoveis', depois: 'imoveis',
    colecoes: ['mapa_pontos', 'mapa_detalhes', 'mapa_manual', 'mapa_acesso', 'imoveis', 'empreendimentos_fichas', 'link-mapa_enderecos', 'contratos_locacao', 'vendas', 'drive_mapa', 'corretores'],
    tipos: { mapa_sem_ponto: 'Itens sem ponto no mapa' },
    render() { agenda(); return '<div id="mp-host"></div>' + secaoLinks(); },
    foco(alvo) { if (/^[ilvne]-/.test(String(alvo || ''))) { FOCO_ITEM = String(alvo); agenda(); return; } if (alvo === 'links' || /^lm:/.test(String(alvo || ''))) { LINKS_ABERTO = true; const id = String(alvo).slice(3); const LM = window.HUB_LINKMAPA; if (id && LM && typeof LM.focoSecao === 'function') LM.focoSecao(id); setTimeout(() => { const el = document.getElementById('mp-links'); if (el) el.scrollIntoView({ block: 'start' }); }, 120); } },
  });
})();
/* m2-privativa-20261107: R$/m² de área privativa (HUB.m2) */
