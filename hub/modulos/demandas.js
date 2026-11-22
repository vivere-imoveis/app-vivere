// modulos/demandas.js — aba CRM › Oportunidades › Demandas extras do HUB Vivere (sub-aba desde 03/11/2026; colunas Bairros · Cômodos · m² · Valor · Corretor desde 05/11/2026) (construção "demandas", 31/10/2026, pedido do Cleiton)
// Contrato: _hub\modulos\LEIA-ME.md. Lê e grava: demandas, demandas_pedidos (mesmo formato dos painéis dos corretores; a tarefa
// agendada de hora em hora sincroniza as cópias). O núcleo do HUB expõe HUB.op (motor das Oportunidades) e o selo da aba (contador).
/* MultiSel — seleção de vários valores (ex.: bairros) com busca, comum ao HUB e aos painéis (26/10/2026, pedido do Cleiton).
   Uso: MultiSel.html(id, [[valor, rótulo], ...], [valores marcados], 'Todos', 'bairros') devolve o HTML;
   cada mudança dispara o evento 'ms-change' (bubbles) com detail {id, valores}. O estado aberto/fechado e o texto
   da busca ficam guardados por id, então o redesenho da tela não fecha a lista. */
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
@media (max-width:640px){.ms{display:block;width:100%}.ms-pop{position:fixed;left:8px;right:8px;top:auto;bottom:8px;width:auto;max-width:none;max-height:75vh;display:flex;flex-direction:column}.ms-pop[hidden]{display:none}.ms-li{max-height:none;flex:1;min-height:0}.ms .ms-it{padding:9px 4px;font-size:14px!important}}`;
    (document.head || document.documentElement).appendChild(s);
  }
  return { html, ajusta, estado: ST };
})();

(function () {
'use strict';
/* ---------- Demandas: núcleo comum do HUB e dos painéis dos corretores (31/10/2026, pedido do Cleiton) ----------
   "Procura-se apartamento de 2 dormitórios no Campeche até R$ 1,5 mi": cada demanda é registrada no HUB ou num painel e fica
   visível para toda a imobiliária. Cada artefato grava no próprio banco (coleções `demandas` e `demandas_pedidos`, mesmo formato
   nos dois); a tarefa agendada de hora em hora junta as cópias (vence o maior atualizado_em; empate fica com a encerrada).
   Doc de `demandas/<id>`: {finalidade: 'Compra'|'Locação anual'|'Temporada', tipo, bairros:[], dorm_min, suites_min, vagas_min, area_min, area_max (m²),
   valor_min, valor_max (os mínimos e máximos são opcionais; valor_min, suites_min, vagas_min e área desde 05/11/2026), obs, autor, autor_id,
   origem: 'hub'|'painel:<slug>', criado_em, atualizado_em, expira_em (AAAA-MM-DD, criado/renovado + 30 dias), status: 'ativa'|'encerrada',
   encerrada_por, encerrada_em, historico:[{em, por, acao}] (últimos 10)}. id = 'd-' + data base36 + 4 aleatórios + '-' + origem.
   Doc de `demandas_pedidos/<id>`: {demanda_id, texto, autor, autor_id, origem, criado_em, atualizado_em, status: 'aberto'|'atendido', atendido_por}.
   Quem edita, renova e encerra: o autor e a diretoria. Os demais pedem alteração. O banco entrega docs congelados: só cópias.
   cfg: {ns, eu(), docs(), pedidos(), carregado(), grava(col,id,doc)→Promise<bool>, pede(), ctx(), casar(p,ctx,opt), bairros(),
         itemHtml(it), autorHtml(d)? (corretor como link), filtraBusca(lista)?, bloqueioNova()? (texto = "+ Nova demanda" desabilitado), aviso(msg), btn, btnP, nota} */
const DEM_NUCLEO = (cfg) => {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FINS = ['Compra', 'Locação anual', 'Temporada'];
  const TIPOS = ['Apartamento', 'Casa', 'Cobertura', 'Terreno', 'Sala/comercial', 'Outro'];
  const VALID_DIAS = 30;
  const pad = (n) => String(n).padStart(2, '0');
  const agora = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 19); };
  const hoje = () => agora().slice(0, 10);
  const maisDias = (iso, n) => { const d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const diasAte = (iso) => Math.round((new Date(String(iso).slice(0, 10) + 'T12:00:00') - new Date(hoje() + 'T12:00:00')) / 864e5);
  const dt = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; };
  const curto = (v) => { v = +v; if (!v) return ''; if (v >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi'; if (v >= 1e3) return 'R$ ' + (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: v < 1e5 ? 1 : 0 }) + ' mil'; return 'R$ ' + v.toLocaleString('pt-BR'); };
  // "1,5 mi", "800 mil", "R$ 950.000", "1500000" → número
  const lerValor = (s) => { const t = String(s || '').toLowerCase().replace(/r\$|\s/g, ''); if (!t) return null; const m = t.match(/^(\d[\d.]*(?:,\d+)?)(mi|milh[oõ]es|milh[aã]o|mil|k)?$/); if (!m) return null;
    let n = m[1]; n = n.includes(',') ? +n.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(n) ? +n.replace(/\./g, '') : +n; if (!isFinite(n)) return null;
    const u = m[2] || ''; if (!u && n < 100) return null; // "1,2" sem unidade é ambíguo: pedir "1,2 mi" ou o valor cheio
    if (u === 'mil' || u === 'k') n *= 1e3; else if (/^mi/.test(u)) n *= 1e6; return n > 0 ? Math.round(n) : null; };
  const fmtValor = (v) => (v ? Number(v).toLocaleString('pt-BR') : '');
  const novoId = (eu) => 'd-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '-' + String(eu.id || 'x').replace(/[^a-z0-9-]/gi, '').slice(0, 24);
  const ativa = (d) => d.status === 'ativa' && String(d.expira_em || '') >= hoje();
  const expirada = (d) => d.status === 'ativa' && String(d.expira_em || '') < hoje();
  const lista = () => Object.entries(cfg.docs() || {}).filter(([, d]) => d && typeof d === 'object').map(([id, d]) => Object.assign({}, d, { _id: id }));
  const pedidos = () => Object.entries(cfg.pedidos() || {}).filter(([, p]) => p && typeof p === 'object').map(([id, p]) => Object.assign({}, p, { _id: id }));
  const pode = (d) => { const eu = cfg.eu(); return !!eu.diretoria || (!!eu.id && d.autor_id === eu.id); };
  const bairrosTxt = (b) => { b = Array.isArray(b) ? b : []; return b.length <= 3 ? b.join(', ') : b.slice(0, 2).join(', ') + ' e mais ' + (b.length - 2); };
  // colunas (05/11/2026): Cômodos = mínimos de dormitórios, suítes e vagas; m² e Valor = mínimo–máximo
  const n0 = (v) => (v == null || v === '' ? null : +v || null);
  const plural = (n, s, p) => n + '+ ' + (n > 1 ? p : s);
  const comodosTxt = (d) => [n0(d.dorm_min) ? plural(+d.dorm_min, 'dorm', 'dorm') : '', n0(d.suites_min) ? plural(+d.suites_min, 'suíte', 'suítes') : '', n0(d.vagas_min) ? plural(+d.vagas_min, 'vaga', 'vagas') : ''].filter(Boolean).join(' · ');
  const faixa = (a, b, f, un) => { a = n0(a); b = n0(b); return a && b ? f(a) + ' – ' + f(b) + un : a ? 'a partir de ' + f(a) + un : b ? 'até ' + f(b) + un : ''; };
  const areaTxt = (d) => faixa(d.area_min, d.area_max, (v) => v.toLocaleString('pt-BR'), ' m²');
  const valorTxt = (d) => faixa(d.valor_min, d.valor_max, curto, '');
  const tipoTxt = (d) => (d.tipo && d.tipo !== 'Outro' ? d.tipo : 'Imóvel');
  const autor = (d) => { if (cfg.autorHtml) { try { const h = cfg.autorHtml(d); if (h) return h; } catch (e) {} } return esc(d.autor || '—'); };
  function resumo(d) {
    const p = [tipoTxt(d), comodosTxt(d), bairrosTxt(d.bairros), areaTxt(d), valorTxt(d)].filter(Boolean);
    return 'Procura-se ' + p.join(', ') + (d.finalidade ? ' — ' + d.finalidade : '');
  }
  // perfil no formato do motor das Oportunidades (OP.casar)
  const perfil = (d) => ({ fin: d.finalidade === 'Compra' ? 'Venda' : d.finalidade === 'Temporada' ? 'Temporada' : d.finalidade ? 'Locação' : '', tipo: d.tipo && d.tipo !== 'Outro' ? (d.tipo === 'Sala/comercial' ? 'Comercial' : d.tipo) : '',
    bairros: Array.isArray(d.bairros) ? d.bairros.slice() : [], vmax: n0(d.valor_max), vmin: n0(d.valor_min), dorm: n0(d.dorm_min), vagas: n0(d.vagas_min), amin: n0(d.area_min), amax: n0(d.area_max) });
  // área e suítes: o motor só pontua a área (com mínimo e máximo) e ignora suítes; aqui o corte é estrito (imóvel sem o dado continua na lista)
  const filtraExtra = (d, L) => { const a1 = n0(d.area_min), a2 = n0(d.area_max), s1 = n0(d.suites_min); if (!a1 && !a2 && !s1) return L;
    return L.filter((x) => { const it = (x && x.it) || {}, ar = +it.area || null, su = it.suites == null || it.suites === '' ? null : +it.suites;
      return !((ar && a1 && ar < a1) || (ar && a2 && ar > a2) || (su != null && s1 && su < s1)); }); };
  let MEMO = { ctx: null, m: new Map() };
  function atende(d) {
    let ctx = null; try { ctx = cfg.ctx(); } catch (e) { ctx = null; } if (!ctx) return null;
    if (MEMO.ctx !== ctx) MEMO = { ctx, m: new Map() };
    const sig = d._id + '|' + (d.atualizado_em || ''); if (MEMO.m.has(sig)) return MEMO.m.get(sig);
    let r = []; try { r = filtraExtra(d, cfg.casar(perfil(d), ctx, { max: 300, relaxa: false }) || []).slice(0, 20); } catch (e) { r = []; }
    MEMO.m.set(sig, r); return r;
  }
  // selo de novidade: demandas ativas de outras pessoas que este leitor ainda não viu (guardado no aparelho)
  const LS = cfg.ns + '.demandas.vistas';
  const lerVistas = () => { try { const v = JSON.parse(localStorage.getItem(LS) || '[]'); return new Set(Array.isArray(v) ? v : []); } catch (e) { return new Set(); } };
  const gravaVistas = (s) => { try { localStorage.setItem(LS, JSON.stringify([...s].slice(-500))); } catch (e) {} };
  let VISTAS = lerVistas(); const NOVAS_SESSAO = new Set();
  const novasIds = () => { const eu = cfg.eu(); return lista().filter((d) => ativa(d) && d.autor_id !== eu.id && !VISTAS.has(d._id)).map((d) => d._id); };
  const novas = () => novasIds().length;
  const pedAbertos = () => { const P = pedidos().filter((p) => p.status === 'aberto'), D = cfg.docs() || {}; return P.filter((p) => D[p.demanda_id] && pode(Object.assign({}, D[p.demanda_id]))); };

  const F = { fin: '', sit: 'ativas', minhas: false, pedidos: false, ord: { k: 'data', dir: -1 }, abertos: {}, conf: '', salvando: false };
  const ROT_ORD = { demanda: 'Demanda', finalidade: 'Finalidade', bairros: 'Bairros', comodos: 'Cômodos', area: 'm²', valor: 'Valor', autor: 'Corretor', data: 'Data', validade: 'Validade' };
  const ORD_TXT = ['demanda', 'finalidade', 'bairros', 'autor', 'validade'];   // texto e validade começam do menor (A–Z, vence antes)
  const txo = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const CH_ORD = { demanda: (d) => txo(tipoTxt(d)), finalidade: (d) => txo(d.finalidade), bairros: (d) => txo((d.bairros || [])[0]), comodos: (d) => (n0(d.dorm_min) || 0) * 100 + (n0(d.suites_min) || 0) * 10 + (n0(d.vagas_min) || 0),
    area: (d) => n0(d.area_min) || n0(d.area_max) || 0, valor: (d) => n0(d.valor_max) || n0(d.valor_min) || 0, data: (d) => d.criado_em || '', autor: (d) => txo(d.autor), validade: (d) => d.status === 'encerrada' ? '0' : d.expira_em || '' };
  const seta = (k) => (F.ord.k === k ? (F.ord.dir > 0 ? ' ▲' : ' ▼') : ' ↕');
  const B = (cls, attrs, txt) => `<button type="button" class="${cfg.btn}${cls ? ' ' + cls : ''}" ${attrs}>${txt}</button>`;

  function validade(d) {
    if (d.status === 'encerrada') return `<span class="dm-pill">encerrada ${dt(d.encerrada_em || d.atualizado_em)}</span>`;
    const n = diasAte(d.expira_em || hoje());
    if (n < 0) return `<span class="dm-pill dm-bad">expirou ${dt(d.expira_em)}</span>`;
    return `<span class="dm-pill${n <= 5 ? ' dm-warn' : ''}">até ${dt(d.expira_em)} · ${n === 0 ? 'vence hoje' : n + (n === 1 ? ' dia' : ' dias')}</span>`;
  }
  function acoes(d) {
    const p = pode(d), r = [];
    if (p) {
      r.push(B('', `data-dm-acao="editar" data-dm-id="${esc(d._id)}"`, 'Editar'));
      if (d.status === 'ativa') r.push(B('', `data-dm-acao="renovar" data-dm-id="${esc(d._id)}" title="Mais ${VALID_DIAS} dias a partir de hoje"`, 'Renovar'));
      if (d.status === 'ativa') r.push(B('', `data-dm-acao="encerrar" data-dm-id="${esc(d._id)}"`, F.conf === d._id ? 'Confirmar encerramento' : 'Encerrar'));
    } else r.push(B('', `data-dm-acao="pedir" data-dm-id="${esc(d._id)}"`, 'Pedir alteração'));
    const A = atende(d);
    r.push(B('', `data-dm-acao="atende" data-dm-id="${esc(d._id)}" aria-expanded="${!!F.abertos[d._id]}"`, A == null ? 'Imóveis que atendem (…)' : `Imóveis que atendem (${A.length}) ${F.abertos[d._id] ? '▲' : '▼'}`));
    return r.join('');
  }
  function detalhe(d) {
    const out = [];
    const P = pedidos().filter((x) => x.demanda_id === d._id && x.status === 'aberto');
    if (P.length) out.push(`<div class="dm-peds"><b>Pedidos de alteração (${P.length})</b>${P.map((x) => `<div class="dm-ped"><span>${esc(x.texto)}</span><span class="dm-mut">${esc(x.autor || '')} · ${dt(x.criado_em)}</span>${pode(d) ? B('', `data-dm-acao="atendido" data-dm-id="${esc(x._id)}"`, 'Marcar atendido') : ''}</div>`).join('')}</div>`);
    if (F.abertos[d._id]) {
      const A = atende(d);
      out.push(A == null ? '<p class="dm-mut">Carregando os imóveis…</p>' : A.length ? `<div class="dm-its">${A.map((x) => cfg.itemHtml(x.it, x)).join('')}</div>` : '<p class="dm-mut">Nenhum imóvel da carteira atende agora.</p>');
    }
    return out.join('');
  }
  const valorSens = (d) => (valorTxt(d) ? `<span data-sens>${esc(valorTxt(d))}</span>` : '');
  function linhaTab(d) {   // linha 1 = as colunas; linha 2 = observação e ações (largura inteira, sem apertar as colunas)
    const nv = NOVAS_SESSAO.has(d._id) ? ' <span class="dm-pill dm-novo">nova</span>' : '', det = detalhe(d);
    const td = (v, cls) => `<td${cls ? ` class="${cls}"` : ''}>${v || '—'}</td>`;
    return `<tr id="dm-${esc(d._id)}" class="dm-l1">${td(`<b>${esc(tipoTxt(d))}</b>${nv}`)}${td(esc(d.finalidade || ''))}${td(esc((d.bairros || []).join(', ')))}${td(esc(comodosTxt(d)))}${td(esc(areaTxt(d)), 'n')}${td(valorSens(d), 'n')}${td(autor(d))}${td(dt(d.criado_em), 'nw')}${td(validade(d))}</tr>`
      + `<tr class="dm-l2"><td colspan="9">${d.obs ? `<div class="dm-mut">${esc(d.obs)}</div>` : ''}<div class="dm-ac">${acoes(d)}</div></td></tr>${det ? `<tr class="dm-det"><td colspan="9">${det}</td></tr>` : ''}`;
  }
  function cartao(d) {
    const nv = NOVAS_SESSAO.has(d._id) ? ' <span class="dm-pill dm-novo">nova</span>' : '';
    const kv = (r, v) => (v ? `<span class="dm-kv"><i>${r}</i> ${v}</span>` : '');
    return `<div class="dm-card" id="dmc-${esc(d._id)}"><div><b>${esc(tipoTxt(d))}</b>${d.finalidade ? ' · ' + esc(d.finalidade) : ''}${nv}</div>
      <div class="dm-kvs">${kv('Bairros', esc((d.bairros || []).join(', ')))}${kv('Cômodos', esc(comodosTxt(d)))}${kv('m²', esc(areaTxt(d)))}${kv('Valor', valorSens(d))}${kv('Corretor', autor(d))}</div>
      ${d.obs ? `<div class="dm-mut">${esc(d.obs)}</div>` : ''}<div class="dm-meta"><span>${dt(d.criado_em)}</span>${validade(d)}</div><div class="dm-ac">${acoes(d)}</div>${detalhe(d)}</div>`;
  }

  function render() {
    if (!cfg.carregado()) return `<section class="dm" id="dm-raiz"><h2>Demandas extras</h2><div class="dm-vazio">Carregando…</div></section>`;
    const nv = novasIds(); nv.forEach((id) => NOVAS_SESSAO.add(id));
    if (nv.length) { nv.forEach((id) => VISTAS.add(id)); gravaVistas(VISTAS); setTimeout(() => cfg.pede(), 0); }
    const eu = cfg.eu(), T = lista(), PA = pedAbertos(), comPed = new Set(PA.map((p) => p.demanda_id));
    const sitOk = (d) => (F.sit === 'ativas' ? ativa(d) : !ativa(d));
    let L = T.filter((d) => sitOk(d) && (!F.fin || d.finalidade === F.fin) && (!F.minhas || d.autor_id === eu.id) && (!F.pedidos || comPed.has(d._id)));
    if (cfg.filtraBusca) L = cfg.filtraBusca(L, resumo);
    const k = CH_ORD[F.ord.k] || CH_ORD.data;
    const semV = (v) => v === '' || v === 0 || v == null;   // sem valor vai sempre para o fim
    L.sort((a, b) => { const x = k(a), y = k(b), vx = semV(x), vy = semV(y); if (vx !== vy) return vx ? 1 : -1; return (x > y ? 1 : x < y ? -1 : String(b.criado_em || '').localeCompare(String(a.criado_em || ''))) * (x === y ? 1 : F.ord.dir); });
    const nA = T.filter(ativa).length, nE = T.length - nA;
    const chip = (attr, on, txt) => `<button type="button" class="dm-chip" ${attr} aria-pressed="${on}">${txt}</button>`;
    const chips1 = [chip('data-dm-fin=""', !F.fin, 'Todas'), ...FINS.map((f) => chip(`data-dm-fin="${esc(f)}"`, F.fin === f, esc(f)))].join('');
    const chips2 = [chip('data-dm-sit="ativas"', F.sit === 'ativas', `Ativas (${nA})`), chip('data-dm-sit="encerradas"', F.sit !== 'ativas', `Encerradas/expiradas (${nE})`), chip('data-dm-minhas="1"', F.minhas, eu.diretoria && eu.id === 'hub' ? 'Só da diretoria' : 'Só as minhas'), ...(PA.length || F.pedidos ? [chip('data-dm-peds="1"', F.pedidos, `Pedidos abertos (${PA.length})`)] : [])].join('');
    const ordM = `<div class="dm-ordm" role="group" aria-label="Ordenar por"><span>Ordenar por</span>${Object.keys(ROT_ORD).map((x) => `<button type="button" class="dm-chip" data-dm-ord="${x}" aria-pressed="${F.ord.k === x}">${ROT_ORD[x]}${seta(x)}</button>`).join('')}</div>`;
    const th = (x, cls) => `<th${cls ? ` class="${cls}"` : ''}><button type="button" class="dm-th" data-dm-ord="${x}" aria-sort="${F.ord.k === x ? (F.ord.dir > 0 ? 'ascending' : 'descending') : 'none'}">${ROT_ORD[x]}${seta(x)}</button></th>`;
    const vazio = `<div class="dm-vazio">${T.length ? 'Nenhuma demanda neste filtro.' : 'Nenhuma demanda registrada ainda. Use “+ Nova demanda”.'}</div>`;
    const tab = `<div class="tabela dm-tab"><table data-ord-dados="1"><thead><tr>${th('demanda')}${th('finalidade')}${th('bairros')}${th('comodos')}${th('area', 'n')}${th('valor', 'n')}${th('autor')}${th('data')}${th('validade')}</tr></thead><tbody>${L.map(linhaTab).join('')}</tbody></table></div>`;
    const avisoPed = PA.length && !F.pedidos ? `<div class="dm-alerta"><b>${PA.length} pedido${PA.length > 1 ? 's' : ''} de alteração em aberto</b> em demandas que você pode editar. ${B('', 'data-dm-peds="1"', 'Ver')}</div>` : '';
    const bloqueio = cfg.bloqueioNova ? cfg.bloqueioNova() : '';   // ex.: painel ainda sem identificação do corretor
    return `<section class="dm" id="dm-raiz"><div class="dm-cab"><h2>Demandas extras</h2>${B(cfg.btnP, `data-dm-acao="nova"${bloqueio ? ` disabled title="${esc(bloqueio)}"` : ''}`, '+ Nova demanda')}</div>${bloqueio ? `<p class="dm-mut" style="margin:6px 0 0">${esc(bloqueio)}</p>` : ''}
      <p class="dm-nota">${cfg.nota}</p>${avisoPed}
      <div class="dm-chips" role="group" aria-label="Finalidade">${chips1}</div><div class="dm-chips" role="group" aria-label="Situação">${chips2}</div>
      ${L.length ? `${ordM}${tab}<div class="dm-cards">${L.map(cartao).join('')}</div>` : vazio}</section>`;
  }

  // ---------- formulário (fica fora da área redesenhada pela página: não perde o que foi digitado) ----------
  let FORM = null;
  const modal = () => { let m = document.getElementById('dm-modal'); if (!m) { m = document.createElement('div'); m.id = 'dm-modal'; document.body.appendChild(m); } return m; };
  function fechaModal() { FORM = null; const m = document.getElementById('dm-modal'); if (m) m.innerHTML = ''; }
  function pintaModal() {
    if (!FORM) return fechaModal();
    const m = modal(), f = FORM, ms = window.MultiSel;
    const bs = [...new Set([...(cfg.bairros() || []), ...(f.bairros || [])])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const opt = (L, v) => L.map((x) => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('');
    const corpo = f.modo === 'pedir'
      ? `<p class="dm-mut" style="margin:0">${esc(resumo(f.d))} · de ${esc(f.d.autor || '—')}</p><label class="dm-c">O que precisa mudar<textarea id="dm-f-texto" rows="4" placeholder="Ex.: o cliente agora aceita também o Rio Tavares">${esc(f.texto || '')}</textarea></label>`
      : `<div class="dm-form"><label class="dm-c">Finalidade<select id="dm-f-fin">${opt(FINS, f.finalidade)}</select></label><label class="dm-c">Tipo<select id="dm-f-tipo">${opt(TIPOS, f.tipo)}</select></label>
        <div class="dm-c dm-int">Bairros${ms ? ms.html('dm-f-bai', bs.map((b) => [b, b]), f.bairros || [], 'Qualquer bairro', 'bairros') : `<input id="dm-f-baitxt" value="${esc((f.bairros || []).join(', '))}" placeholder="Separe por vírgula">`}</div>
        <div class="dm-int dm-tri"><label class="dm-c">Dormitórios (mín.)<input id="dm-f-dorm" type="number" min="0" max="9" inputmode="numeric" value="${esc(f.dorm_min || '')}"></label>
          <label class="dm-c">Suítes (mín.)<input id="dm-f-suites" type="number" min="0" max="9" inputmode="numeric" value="${esc(f.suites_min || '')}"></label>
          <label class="dm-c">Vagas (mín.)<input id="dm-f-vagas" type="number" min="0" max="9" inputmode="numeric" value="${esc(f.vagas_min || '')}"></label></div>
        <label class="dm-c">Área mínima (m²)<input id="dm-f-amin" type="number" min="0" inputmode="numeric" placeholder="Ex.: 110" value="${esc(f.area_min || '')}"></label>
        <label class="dm-c">Área máxima (m²)<input id="dm-f-amax" type="number" min="0" inputmode="numeric" value="${esc(f.area_max || '')}"></label>
        <label class="dm-c">Valor mínimo (R$)<input id="dm-f-vmin" data-sens inputmode="decimal" autocomplete="off" placeholder="Ex.: 800 mil" value="${esc(f.vminTxt != null ? f.vminTxt : fmtValor(f.valor_min))}"></label>
        <label class="dm-c">Valor máximo (R$)<input id="dm-f-valor" data-sens inputmode="decimal" autocomplete="off" placeholder="Ex.: 1,5 mi ou 4.500" value="${esc(f.valorTxt != null ? f.valorTxt : fmtValor(f.valor_max))}"></label>
        <label class="dm-c dm-int">Observação<textarea id="dm-f-obs" rows="3" placeholder="Ex.: perto da praia, aceita permuta">${esc(f.obs || '')}</textarea></label></div>
        <p class="dm-mut" style="margin:0">Fica ativa por ${VALID_DIAS} dias (renove quando precisar) e aparece para toda a imobiliária: diretoria e corretores.</p>`;
    const tit = f.modo === 'pedir' ? 'Pedir alteração' : f.modo === 'editar' ? 'Editar demanda' : 'Nova demanda';
    m.innerHTML = `<div class="dm-fundo" data-dm-fundo="1"><div class="dm-modal" role="dialog" aria-modal="true" aria-labelledby="dm-f-tit"><h2 id="dm-f-tit">${tit}</h2>${corpo}
      ${f.erro ? `<p class="dm-erro">${esc(f.erro)}</p>` : ''}<div class="dm-ac">${B(cfg.btnP, `data-dm-acao="salvar"${F.salvando ? ' disabled' : ''}`, F.salvando ? 'Salvando…' : f.modo === 'pedir' ? 'Enviar pedido' : 'Salvar')}${B('', 'data-dm-acao="fechar"', 'Cancelar')}</div></div></div>`;
  }
  function abreForm(modo, d) {
    const eu = cfg.eu();
    if (modo === 'pedir') FORM = { modo, d, texto: '' };
    else if (modo === 'editar') FORM = Object.assign({ modo }, JSON.parse(JSON.stringify(d)), { d });
    else FORM = { modo: 'nova', finalidade: 'Compra', tipo: 'Apartamento', bairros: [], dorm_min: '', suites_min: '', vagas_min: '', area_min: '', area_max: '', valor_min: null, valor_max: null, obs: '', autor: eu.nome };
    pintaModal(); setTimeout(() => { const x = document.querySelector('#dm-modal select, #dm-modal textarea'); if (x) x.focus(); }, 0);
  }
  const hist = (d, acao) => (Array.isArray(d.historico) ? d.historico.slice(-9) : []).concat([{ em: agora().slice(0, 16), por: cfg.eu().nome, acao }]);
  async function salvar() {
    const f = FORM; if (!f || F.salvando) return; const eu = cfg.eu();
    if (f.modo === 'pedir') {
      const tx = String(f.texto || '').trim(); if (!tx) { f.erro = 'Escreva o que precisa mudar.'; return pintaModal(); }
      const id = 'p-' + novoId(eu).slice(2), t = agora();
      F.salvando = true; pintaModal();
      const ok = await cfg.grava('demandas_pedidos', id, { demanda_id: f.d._id, texto: tx.slice(0, 600), autor: eu.nome, autor_id: eu.id, origem: eu.origem, criado_em: t, atualizado_em: t, status: 'aberto' });
      F.salvando = false; if (ok) { fechaModal(); cfg.aviso('Pedido enviado ao autor da demanda.'); cfg.pede(); } else pintaModal(); return;
    }
    const int = (v, mx) => (v === '' || v == null ? null : Math.max(0, Math.min(mx, parseInt(v, 10) || 0)) || null);
    const bairros = (f.bairros || []).filter(Boolean), dorm = int(f.dorm_min, 9), suites = int(f.suites_min, 9), vagas = int(f.vagas_min, 9), amin = int(f.area_min, 99999), amax = int(f.area_max, 99999);
    const vmax = f.valorTxt != null ? lerValor(f.valorTxt) : f.valor_max || null, vmin = f.vminTxt != null ? lerValor(f.vminTxt) : f.valor_min || null;
    if (f.valorTxt && vmax == null) { f.erro = 'Valor máximo não reconhecido. Escreva com a unidade (1,2 mi, 800 mil) ou o valor cheio (1.200.000, 4.500).'; return pintaModal(); }
    if (f.vminTxt && vmin == null) { f.erro = 'Valor mínimo não reconhecido. Escreva com a unidade (1,2 mi, 800 mil) ou o valor cheio (1.200.000, 4.500).'; return pintaModal(); }
    if (vmin && vmax && vmin > vmax) { f.erro = 'O valor mínimo está acima do máximo.'; return pintaModal(); }
    if (amin && amax && amin > amax) { f.erro = 'A área mínima está acima da máxima.'; return pintaModal(); }
    const campos = { finalidade: f.finalidade, tipo: f.tipo, bairros, dorm_min: dorm, suites_min: suites, vagas_min: vagas, area_min: amin, area_max: amax, valor_min: vmin, valor_max: vmax, obs: String(f.obs || '').trim().slice(0, 600) };
    if (!FINS.includes(f.finalidade) || !TIPOS.includes(f.tipo)) { f.erro = 'Escolha a finalidade e o tipo.'; return pintaModal(); }
    const t = agora(); let id, doc;
    if (f.modo === 'editar') {
      const base = JSON.parse(JSON.stringify(cfg.docs()[f.d._id] || f.d)); delete base._id; id = f.d._id;
      doc = Object.assign(base, campos, { atualizado_em: t, historico: hist(base, 'editada') });
    } else {
      id = novoId(eu);
      doc = Object.assign({}, campos, { autor: eu.nome, autor_id: eu.id, origem: eu.origem,
        criado_em: t, atualizado_em: t, expira_em: maisDias(t, VALID_DIAS), status: 'ativa', encerrada_por: null, historico: [{ em: t.slice(0, 16), por: eu.nome, acao: 'criada' }] });
    }
    F.salvando = true; pintaModal();
    const ok = await cfg.grava('demandas', id, doc); F.salvando = false;
    if (ok) { fechaModal(); cfg.aviso(f.modo === 'editar' ? 'Demanda atualizada.' : 'Demanda registrada. Ela vai a todos os painéis na próxima sincronização (de hora em hora).'); cfg.pede(); } else pintaModal();
  }
  async function muda(id, acao) {
    const atual = (cfg.docs() || {})[id]; if (!atual) return; const d = JSON.parse(JSON.stringify(atual)); if (!pode(Object.assign({}, d))) return; const t = agora(), eu = cfg.eu();
    if (acao === 'renovar') Object.assign(d, { status: 'ativa', expira_em: maisDias(t, VALID_DIAS), atualizado_em: t, historico: hist(d, 'renovada até ' + dt(maisDias(t, VALID_DIAS))) });
    if (acao === 'encerrar') Object.assign(d, { status: 'encerrada', encerrada_por: eu.nome, encerrada_em: t, atualizado_em: t, historico: hist(d, 'encerrada') });
    if (await cfg.grava('demandas', id, d)) { cfg.aviso(acao === 'renovar' ? 'Demanda renovada por mais ' + VALID_DIAS + ' dias.' : 'Demanda encerrada.'); cfg.pede(); }
  }
  async function atendido(pid) {
    const atual = (cfg.pedidos() || {})[pid]; if (!atual) return; const p = JSON.parse(JSON.stringify(atual)); const dd = (cfg.docs() || {})[p.demanda_id]; if (!dd || !pode(Object.assign({}, dd))) return;
    Object.assign(p, { status: 'atendido', atendido_por: cfg.eu().nome, atualizado_em: agora() });
    if (await cfg.grava('demandas_pedidos', pid, p)) { cfg.aviso('Pedido marcado como atendido.'); cfg.pede(); }
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-dm-acao],[data-dm-fin],[data-dm-sit],[data-dm-minhas],[data-dm-peds],[data-dm-ord],[data-dm-fundo]'); if (!t) return;
    if (t.dataset.dmFundo) { if (e.target === t) fechaModal(); return; }
    const d = t.dataset, docs = cfg.docs() || {};
    if (d.dmFin != null) { F.fin = d.dmFin; return cfg.pede(); }
    if (d.dmSit) { F.sit = d.dmSit; return cfg.pede(); }
    if (d.dmMinhas) { F.minhas = !F.minhas; return cfg.pede(); }
    if (d.dmPeds) { F.pedidos = !F.pedidos; if (F.pedidos) F.sit = 'ativas'; return cfg.pede(); }
    if (d.dmOrd) { const k = d.dmOrd; F.ord = F.ord.k === k ? { k, dir: -F.ord.dir } : { k, dir: ORD_TXT.includes(k) ? 1 : -1 }; return cfg.pede(); }
    const a = d.dmAcao, id = d.dmId;
    if (a === 'nova') { if (cfg.bloqueioNova && cfg.bloqueioNova()) return; return abreForm('nova'); }
    if (a === 'fechar') return fechaModal();
    if (a === 'salvar') return salvar();
    if (a === 'atendido') return atendido(id);
    const doc = id && docs[id] ? Object.assign({}, docs[id], { _id: id }) : null; if (!doc) return;
    if (a === 'editar') return abreForm('editar', doc);
    if (a === 'pedir') return abreForm('pedir', doc);
    if (a === 'renovar') return muda(id, 'renovar');
    if (a === 'encerrar') { if (F.conf === id) { F.conf = ''; return muda(id, 'encerrar'); } F.conf = id; return cfg.pede(); }
    if (a === 'atende') { F.abertos[id] = !F.abertos[id]; return cfg.pede(); }
  });
  document.addEventListener('input', (e) => {
    if (!FORM || !e.target || !e.target.id || !e.target.id.startsWith('dm-f-')) return; const k = e.target.id.slice(5), v = e.target.value;
    if (k === 'fin') FORM.finalidade = v; else if (k === 'tipo') FORM.tipo = v; else if (k === 'dorm') FORM.dorm_min = v; else if (k === 'suites') FORM.suites_min = v; else if (k === 'vagas') FORM.vagas_min = v; else if (k === 'amin') FORM.area_min = v; else if (k === 'amax') FORM.area_max = v; else if (k === 'vmin') FORM.vminTxt = v; else if (k === 'valor') FORM.valorTxt = v; else if (k === 'obs') FORM.obs = v; else if (k === 'texto') FORM.texto = v;
    else if (k === 'baitxt') FORM.bairros = v.split(',').map((x) => x.trim()).filter(Boolean);
  });
  document.addEventListener('change', (e) => { if (!FORM || !e.target || !e.target.id) return; if (e.target.id === 'dm-f-fin') FORM.finalidade = e.target.value; if (e.target.id === 'dm-f-tipo') FORM.tipo = e.target.value; });
  document.addEventListener('ms-change', (e) => { const x = e.detail || {}; if (FORM && x.id === 'dm-f-bai') FORM.bairros = (x.valores || []).slice(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && FORM && !document.querySelector('#dm-modal .ms-pop:not([hidden])')) fechaModal(); });

  if (!document.getElementById('dm-css')) {
    const s = document.createElement('style'); s.id = 'dm-css';
    s.textContent = `.dm-cab{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}.dm-cab h2{margin:0}
.dm-nota{color:var(--muted);font-size:12px;margin:8px 0 12px}
.dm-chips,.dm-ordm{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px;align-items:center}.dm-ordm span{font-size:12px;color:var(--muted)}
.dm-chip{border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:999px;padding:5px 11px;font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.dm-chip[aria-pressed="true"]{color:var(--ink);border-color:var(--ink);font-weight:600}
.dm-th{all:unset;cursor:pointer;font:inherit;color:inherit;white-space:nowrap}.dm-th:focus-visible,.dm-chip:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.dm-tab table{width:100%;border-collapse:collapse}.dm-tab th,.dm-tab td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:13px}
.dm-tab th{font-size:12px;color:var(--muted);font-weight:600}.dm-tab td.n,.dm-tab th.n{text-align:right;white-space:nowrap}.dm-tab tr.dm-det td{background:var(--soft)}
.dm-tab td{overflow-wrap:normal;word-break:normal}.dm-tab td.nw{white-space:nowrap}.dm-tab tr.dm-l1 td{border-bottom:0;padding-bottom:2px}.dm-tab tr.dm-l2 td{padding-top:0}.dm-tab tr.dm-l2 .dm-ac{margin-top:2px}
.dm-kvs{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px}.dm-kv i{font-style:normal;color:var(--muted);font-size:12px}
button.dm-lk{background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer;text-align:left;text-decoration:underline dotted;text-underline-offset:3px}button.dm-lk:hover{color:var(--accent)}
.dm-tri{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.dm-ac{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px}.dm-ac button{white-space:nowrap}
.dm-pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;background:var(--soft);color:var(--ink);white-space:nowrap}
.dm-pill.dm-warn{background:var(--warn-bg);color:var(--warn)}.dm-pill.dm-bad{background:var(--bad-bg);color:var(--bad)}.dm-pill.dm-novo{background:var(--ok-bg);color:var(--ok)}
.dm-mut{color:var(--muted);font-size:12px}.dm-erro{color:var(--bad);margin:8px 0 0}
.dm-vazio{padding:24px 16px;text-align:center;color:var(--muted);background:var(--panel);border:1px dashed var(--line);border-radius:8px}
.dm-alerta{background:var(--warn-bg);color:var(--ink);border-radius:8px;padding:8px 12px;margin:0 0 10px;font-size:13px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dm-cards{display:none;gap:10px}.dm-card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:grid;gap:6px;min-width:0;overflow-wrap:anywhere}
.dm-meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--muted)}
.dm-its{display:grid;gap:6px;margin-top:6px}.dm-it{display:flex;gap:6px 10px;flex-wrap:wrap;align-items:center;font-size:13px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);min-width:0;overflow-wrap:anywhere}
.dm-peds{display:grid;gap:4px;font-size:13px}.dm-ped{display:flex;gap:6px 10px;flex-wrap:wrap;align-items:center;padding:6px 8px;border-left:3px solid var(--warn);background:var(--bg);border-radius:4px}
.dm-fundo{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}
.dm-modal{background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:10px;width:min(640px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:16px;display:grid;gap:12px}.dm-modal h2{margin:0}
.dm-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.dm-c{display:grid;gap:4px;font-size:12px;color:var(--muted);min-width:0}.dm-int{grid-column:1/-1}
.dm-c input,.dm-c select,.dm-c textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:8px 10px;min-width:0}
.dm-c .ms{display:block;width:100%}
.dm{container-type:inline-size}
@container (max-width:999px){.dm-tab{display:none}.dm-cards{display:grid}}
@container (min-width:1000px){.dm-ordm{display:none}}
@media (max-width:520px){.dm-form{grid-template-columns:1fr}.dm-fundo{align-items:flex-end;padding:8px}.dm-modal{max-height:calc(100vh - 16px)}}`;
    (document.head || document.documentElement).appendChild(s);
  }
  return { render, novas, pedAbertos: () => pedAbertos().length, resumo, atende, perfil, lerValor, comodosTxt, areaTxt, valorTxt };
};

  const H = window.HUB; if (!H) return;
  const esc = H.esc;
  const ID = 'demandas';
  const eu = () => ({ id: 'hub', nome: 'Diretoria', origem: 'hub', diretoria: true });   // o HUB só abre para a diretoria (banco admin)
  let ultAviso = '';
  const aviso = (m) => { ultAviso = m; if (window.ReordAbas && ReordAbas.aviso) ReordAbas.aviso(m); };
  async function grava(col, id, doc) {
    const db = H.db(); if (!db) { aviso('Sem conexão com o banco do HUB agora.'); return false; }
    try { await db.doc(col + '/' + id).set(doc); return true; } catch (e) { aviso('Não foi possível salvar: ' + ((e && e.message) || e)); return false; }
  }
  // corretor da demanda → ficha em Cadastros › Pessoas (o clique em [data-pessoa] é do núcleo do HUB)
  const autorHtml = (d) => { const P = window.HUB_PESSOAS; if (!P || !d.autor_id || d.autor_id === 'hub') return '';
    let id = '', p = null; try { id = (P.pessoa(d.autor_id) ? d.autor_id : '') || P.id(d.autor || '', { fonte: 'corretor' }) || ''; p = id ? P.pessoa(id) : null; } catch (e) { p = null; }
    return p ? `<button type="button" class="lk pes" data-pessoa="${esc(id)}" title="Abrir o cadastro de ${esc(p.nome || d.autor)}">${esc(d.autor || p.nome)}</button>` : ''; };
  const bairros = () => { const s = new Set(); Object.values(H.S.imoveis || {}).forEach((x) => { if (x && x.bairro) s.add(String(x.bairro).trim()); }); Object.values(H.S.empreendimentos_fichas || {}).forEach((x) => { if (x && x.bairro) s.add(String(x.bairro).trim()); }); return [...s]; };
  const itemHtml = (it, x) => { const fat = [it.dorm ? it.dorm + ' dorm.' : '', it.vagas ? it.vagas + (it.vagas > 1 ? ' vagas' : ' vaga') : '', it.area ? Math.round(it.area) + ' m²' : ''].filter(Boolean).join(' · ');
    return `<div class="dm-it"><b>${esc(it.ref || '')}</b><span>${esc(it.origem === 'emp' ? 'Empreendimento' : it.tipo || '')} · ${esc(it.bairro || '')}</span><span>${it.valor ? esc(H.brl0(it.valor)) : it.origem === 'emp' ? 'sob consulta' : '—'}</span>${fat ? `<span class="dm-mut">${esc(fat)}</span>` : ''}${x && x.alerta ? `<span class="dm-mut" style="color:var(--warn)">${esc(x.alerta)}</span>` : ''}${it.origem !== 'emp' && it.ref ? `<button type="button" class="btn" data-hopimv="${esc(it.ref)}">Ver em Anúncios</button>` : ''}${it.link && it.origem !== 'fora' ? `<a class="btn" href="${escUrl(it.link)}" target="_blank" rel="noopener">${it.origem === 'emp' ? 'Site' : 'Anúncio'} ↗</a>` : ''}</div>`; };
  const D = DEM_NUCLEO({
    ns: 'hubv', eu, docs: () => H.S.demandas || {}, pedidos: () => H.S.demandas_pedidos || {}, carregado: () => !!H.carregado.demandas,
    grava, pede: () => H.pede(), ctx: () => (H.op && H.carregado.imoveis ? H.op.ctx() : null), casar: (p, c, o) => H.op.casar(p, c, o), bairros, itemHtml, autorHtml, aviso,
    filtraBusca: (L, resumo) => (H.buscaAba && H.buscaAba.ativa() && H.buscaAmpla ? L.filter((d) => H.buscaAmpla.atende(H.buscaAba.termos(), [resumo(d), d.obs, d.autor, d.finalidade, (d.bairros || []).join(' '), d.dorm_min ? d.dorm_min + ' dorm' : '', d.valor_min ? 'R$ ' + Number(d.valor_min).toLocaleString('pt-BR') : '', d.valor_max ? 'R$ ' + Number(d.valor_max).toLocaleString('pt-BR') : ''].join(' · '), []).size) : L),
    btn: 'btn', btnP: '',
    nota: 'O que os clientes da Vivere estão procurando, registrado pela diretoria aqui e pelos corretores nos painéis; todos veem todas. Cada demanda vale 30 dias (Renovar estende). Quem edita, renova e encerra: o autor e a diretoria; os demais usam “Pedir alteração”. “Imóveis que atendem” usa o mesmo motor das Oportunidades (anúncios ativos, agenciamentos fora do site e lançamentos). As cópias dos painéis chegam pela sincronização de hora em hora.',
  });
  H.registrar({
    id: ID, aba: 'Demandas extras', grupo: 'crm', dicaBusca: 'Buscar por bairro, tipo, autor ou observação…', depois: 'oportunidades', colecoes: ['demandas', 'demandas_pedidos', 'empreendimentos_fichas', 'cadastro-corretores_fichas'],
    render: () => D.render(),
    // selo da aba: demandas novas de corretores que a diretoria ainda não viu + pedidos de alteração em aberto
    contador: () => D.novas() + D.pedAbertos(),
    busca(q) { const t = String(q || '').toLowerCase(); if (!t) return []; const R = [];
      Object.entries(H.S.demandas || {}).forEach(([id, d]) => { if (R.length >= 6 || !d) return; const r = D.resumo(d); if ((r + ' ' + (d.obs || '') + ' ' + (d.autor || '')).toLowerCase().includes(t)) R.push({ grp: 'Demandas extras', tit: r, sub: (d.autor || '') + ' · ' + (d.status || ''), ir: { aba: ID } }); });
      return R; },
  });
})();
