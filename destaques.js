/* Destaques do site no app da Vivere (tarefa vis-site-23, 18/11/2026).
   Decisão do Cleiton: até 8 anúncios ativos na vitrine "Imóveis selecionados" da home do site; marcam o Cleiton (gestor),
   o Nícollas e o William. Lê e grava só pelas funções site_destaques_listar e site_destaque_marcar, que conferem quem pode
   e a trava de 8 no banco. Nenhum dado fica neste arquivo; só o que já é público no anúncio do site.
   22/11/2026 (tarefa vis-site-destaques-hub, decisões do Cleiton 1a 2a 3a): uma lista só, ORDENADA, de até 10, a mesma da aba
   Destaques do site do HUB (site_config/vitrine_home). ⭐ põe no fim; ↑ ↓ reordenam pela função site_vitrine_home_gravar.
   Imóvel da lista que sai do site: no site, a vaga vai para o mais recente à venda, e aqui aparece o aviso para trocar. */
(function () {
  'use strict';
  var PODE_PAINEIS = ['nicollas-maraschin', 'william']; // só decide se a aba aparece; quem manda é o banco
  var POR = 50;
  var D = { itens: [], lista: [], max: 10, carregado: false, carregando: false, erro: '', q: '', fin: '', pg: 0, ordem: { k: 'cadastrado_em', d: -1 }, ocupado: '', capas: {} };
  var C = null; // { sb, eu, esc, toast, titulo }

  function esc(v) { return C.esc(v); }
  var brl = function (v) { return v == null || v === '' ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 }); };
  var dataBR = function (s) { if (!s) return ''; var t = String(s); if (/^\d{4}-\d{2}-\d{2}$/.test(t)) t += 'T12:00:00'; var d = new Date(t); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR'); };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); };
  var finDe = function (x) { return /tempor/i.test(x.finalidade || '') ? 'Temporada' : /loca|alug/i.test(x.finalidade || '') ? 'Locação' : 'Venda'; };
  var link = function (u) { return /^https?:\/\//i.test(String(u || '')) ? u : ''; };

  function pode(eu) { return !!eu && eu.ativo && (eu.papel === 'gestor' || PODE_PAINEIS.indexOf(eu.painel) >= 0); }

  async function carregar() {
    D.carregando = true; D.erro = '';
    try {
      var r = await C.sb.rpc('site_destaques_listar');
      if (r.error) throw new Error(r.error.message || 'o banco recusou');
      D.itens = (r.data && r.data.itens) || []; D.max = (r.data && r.data.max) || 10; D.carregado = true;
      D.lista = ((r.data && r.data.lista) || []).map(function (x) { return String(x).toUpperCase(); });
      await carregarCapas();
    } catch (e) { D.erro = 'Não foi possível carregar os anúncios: ' + (e && e.message || e); }
    D.carregando = false;
  }

  // Foto de capa (19/11/2026): 1ª foto do anúncio na vista pública site_imoveis, a mesma que o site usa.
  var ORIGEM_FOTO = 'https://jucnlzznbwjthlqqgdlz.supabase.co/storage/';
  async function carregarCapas() {
    try {
      var r = await C.sb.from('site_imoveis').select('codigo,capa:fotos->0->>url').range(0, 4999);
      if (r.error) return;
      var m = {}; (r.data || []).forEach(function (l) { var u = String(l.capa || ''); if (l.codigo && u.indexOf(ORIGEM_FOTO) === 0) m[String(l.codigo).toLowerCase()] = u; });
      D.capas = m;
    } catch (e) { /* sem capa, a lista segue */ }
  }
  function capa(x, cls) {
    var u = D.capas[String(x.ref || '').toLowerCase()];
    return u ? '<img class="' + cls + '" src="' + esc(u) + '" alt="" loading="lazy" onerror="this.outerHTML=\'<span class=&quot;' + cls + ' sem&quot; aria-hidden=&quot;true&quot;>🏠</span>\'">'
      : '<span class="' + cls + ' sem" title="Anúncio sem foto no site" aria-hidden="true">🏠</span>';
  }
  function estilo() {
    if (document.getElementById('css-dst-capa')) return;
    var st = document.createElement('style'); st.id = 'css-dst-capa';
    st.textContent = '.dst-nome{display:flex;gap:12px;align-items:center}.dst-nome>div{min-width:0}'
      + '.dst-th{width:88px;height:66px;flex:none;object-fit:cover;border-radius:8px;background:var(--line)}'
      + '.dst-capa{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:8px;margin:0 0 10px;background:var(--line)}'
      + '.dst-th.sem,.dst-capa.sem{display:grid;place-items:center;font-size:24px;color:var(--muted)}'
      + '@media (max-width:560px){.dst-th{width:72px;height:54px}}'
      // 22/11/2026 (rodada visual): vitrine em grade como a home do site (5 por linha no computador, 2 no tablet, linha compacta
      // no celular), número da posição sobre a foto e ações numa linha só; vagas livres fecham a grade em 10.
      + '.dst-grade{display:grid;gap:10px;grid-template-columns:repeat(5,minmax(0,1fr));margin-bottom:18px}'
      + '.dst-it{position:relative;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--card,transparent);min-width:0}'
      + '.dst-it.fora{border-color:var(--warn)}'
      + '.dst-ft{position:relative;aspect-ratio:16/10;background:var(--line)}.dst-ft .dst-capa{position:absolute;inset:0;width:100%;height:100%;margin:0;border-radius:0;aspect-ratio:auto}'
      + '.dst-n{position:absolute;top:6px;left:6px;z-index:1;min-width:24px;height:24px;padding:0 6px;border-radius:12px;display:grid;place-items:center;font-weight:700;font-size:13px;background:var(--bg,#fff);color:var(--ink,inherit);box-shadow:0 1px 3px rgba(0,0,0,.25)}'
      + '.dst-tx{flex:1;padding:8px 10px 4px;min-width:0}.dst-tx b{font-size:14px}.dst-tx .p{white-space:nowrap;font-size:13px}'
      + '.dst-tx .s{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dst-tx .av{display:block;color:var(--warn);font-size:12px;white-space:normal}'
      + '.dst-ac{display:flex;gap:4px;padding:4px 10px 10px}.dst-ac .btn{flex:1;min-width:0;padding:4px 0;text-align:center;justify-content:center}'
      + '.dst-vaga{position:relative;border:1px dashed var(--line);border-radius:10px;display:grid;place-items:center;text-align:center;padding:14px 10px;min-height:120px;font-size:12px;color:var(--muted)}.dst-vaga b{display:block;font-size:13px;color:inherit}'
      + '@media (max-width:999px){.dst-grade{grid-template-columns:repeat(2,minmax(0,1fr))}}'
      + '@media (max-width:599px){.dst-grade{grid-template-columns:1fr;gap:6px}.dst-it{display:grid;grid-template-columns:72px minmax(0,1fr) auto;align-items:center}'
      + '.dst-ft{aspect-ratio:auto;height:100%;min-height:58px}.dst-n{top:4px;left:4px;min-width:20px;height:20px;font-size:12px}.dst-tx{padding:6px 8px}'
      + '.dst-ac{padding:6px 8px 6px 0;gap:3px}.dst-ac .btn{width:32px;flex:none}.dst-ac .ver{display:none}'
      + '.dst-vaga{min-height:0;display:block;text-align:left;padding:10px 10px 10px 36px}.dst-vaga .dst-n{top:8px}.dst-vaga b{display:inline;margin-right:4px}}';
    document.head.appendChild(st);
  }

  // na ordem da lista; código da lista que não veio entre os ativos = saiu do site
  function marcados() {
    return D.lista.map(function (ref) {
      return D.itens.find(function (x) { return String(x.ref || '').toUpperCase() === ref; }) || { id: '', ref: ref, fora: true };
    });
  }
  function filtrados() {
    var q = norm(D.q);
    var L = D.itens.filter(function (x) { return !x.destaque; });
    if (D.fin) L = L.filter(function (x) { return finDe(x) === D.fin; });
    if (q) L = L.filter(function (x) { return norm([x.ref, x.tipo, x.bairro, x.cidade, finDe(x)].join(' ')).indexOf(q) >= 0; });
    var o = D.ordem;
    return L.slice().sort(function (a, b) {
      var va = a[o.k], vb = b[o.k];
      if (o.k === 'finalidade') { va = finDe(a); vb = finDe(b); }
      if (va == null || va === '') return 1; if (vb == null || vb === '') return -1;
      if (o.k === 'valor') return (Number(va) - Number(vb)) * o.d;
      return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * o.d;
    });
  }
  function seta(k) { return D.ordem.k === k ? (D.ordem.d === 1 ? ' ▲' : ' ▼') : ' ↕'; }
  var COLS = [['ref', 'Anúncio'], ['bairro', 'Bairro'], ['valor', 'Valor'], ['cadastrado_em', 'Cadastrado']];
  function th(k, rot) { return '<th><button type="button" data-dst-ord="' + k + '">' + rot + seta(k) + '</button></th>'; }
  function verSite(x) { var u = link(x.link_site); return u ? '<a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">Ver no site</a>' : ''; }
  function nome(x) { return '<b>' + esc(x.ref || x.id) + '</b><span class="s">' + esc([x.tipo, finDe(x)].filter(Boolean).join(' · ')) + '</span>'; }

  function desenhar(main) {
    C.titulo('Destaques do site'); estilo();
    if (!D.carregado) { main.innerHTML = D.erro ? '<div class="msg erro">' + esc(D.erro) + '</div><button class="btn" id="dstDeNovo">Tentar de novo</button>' : '<div class="vazio">Carregando os anúncios…</div>'; var b = main.querySelector('#dstDeNovo'); if (b) b.onclick = function () { abrir(main); }; return; }
    var M = marcados(), cheio = M.length >= D.max, L = filtrados(), nPg = Math.max(1, Math.ceil(L.length / POR));
    if (D.pg > nPg - 1) D.pg = nPg - 1;
    var cards = M.map(function (x, i) {
      var dis = D.ocupado ? ' disabled' : '';
      var sub = x.fora ? '' : [x.tipo, x.bairro].filter(Boolean).join(' · ');
      return '<div class="dst-it' + (x.fora ? ' fora' : '') + '"><div class="dst-ft"><span class="dst-n" title="Posição na vitrine">' + (i + 1) + '</span>' + capa(x, 'dst-capa') + '</div>' +
        '<div class="dst-tx"><b>' + esc(x.ref) + '</b>' + (x.fora ? '' : ' <span class="p">' + brl(x.valor) + '</span>') +
        (sub ? '<span class="s" title="' + esc(sub) + '">' + esc(sub) + '</span>' : '') +
        (x.fora ? '<span class="av">⚠️ Saiu do site: no site entra o mais recente à venda. Troque.</span>' : '') +
        (i >= 8 ? '<span class="s">só telas largas</span>' : '') + '</div>' +
        '<div class="dst-ac">' +
        '<button class="btn" data-dst-mov="' + i + '" data-para="' + (i - 1) + '" title="Uma posição antes" aria-label="Pôr ' + esc(x.ref) + ' uma posição antes"' + (i === 0 ? ' disabled' : dis) + '>↑</button>' +
        '<button class="btn" data-dst-mov="' + i + '" data-para="' + (i + 1) + '" title="Uma posição depois" aria-label="Pôr ' + esc(x.ref) + ' uma posição depois"' + (i === M.length - 1 ? ' disabled' : dis) + '>↓</button>' +
        (x.fora || !link(x.link_site) ? '' : '<a class="btn ver" href="' + esc(link(x.link_site)) + '" target="_blank" rel="noopener noreferrer" title="Ver no site" aria-label="Ver ' + esc(x.ref) + ' no site">↗</a>') +
        '<button class="btn" data-dst-tira="' + esc(x.ref) + '" title="Tirar da vitrine" aria-label="Tirar ' + esc(x.ref) + ' da vitrine"' + dis + '>✕</button></div></div>';
    }).join('') + Array.from({ length: Math.max(0, D.max - M.length) }, function (_, k) {
      var n = M.length + k + 1;
      return '<div class="dst-vaga"><span class="dst-n" style="position:absolute;top:6px;left:6px">' + n + '</span><div><b>Vaga livre</b>no site, entra o imóvel à venda mais recente' + (n > 8 ? ' (só telas largas)' : '') + '</div></div>';
    }).join('');
    var nav = L.length > POR ? '<div class="linha-acoes" style="margin:8px 0"><button class="btn" data-dst-pg="-1"' + (D.pg ? '' : ' disabled') + '>‹ Anterior</button><span class="s" style="display:inline">' + (D.pg * POR + 1) + '–' + Math.min(L.length, (D.pg + 1) * POR) + ' de ' + L.length + '</span><button class="btn" data-dst-pg="1"' + (D.pg < nPg - 1 ? '' : ' disabled') + '>Próxima ›</button></div>' : '';
    var linhas = L.slice(D.pg * POR, (D.pg + 1) * POR).map(function (x) {
      return '<tr><td class="c-nome"><div class="dst-nome">' + capa(x, 'dst-th') + '<div>' + nome(x) + '</div></div></td><td data-r="Bairro">' + esc([x.bairro, x.cidade].filter(Boolean).join(' · ') || '—') + '</td>' +
        '<td data-r="Valor" class="num">' + brl(x.valor) + '</td><td data-r="Cadastrado">' + (dataBR(x.cadastrado_em) || '—') + '</td>' +
        '<td class="c-acoes"><div class="linha-acoes">' + verSite(x) + '<button class="btn pri" data-dst="' + esc(x.id) + '" data-liga="1"' + (cheio || D.ocupado ? ' disabled title="Já há ' + D.max + ' destaques: tire um antes"' : '') + '>⭐ Pôr na vitrine</button></div></td></tr>';
    }).join('');
    main.innerHTML =
      '<div class="cartao" style="margin-bottom:14px"><h3 style="margin:0 0 4px">⭐ Destaques do site: ' + M.length + ' de ' + D.max + '</h3>' +
      '<p class="s" style="margin:0">A vitrine "Imóveis selecionados" da home, nesta ordem. Muda no site em até ~10 min. Do 9º em diante, só nas telas largas. É a mesma lista do HUB.</p></div>' +
      (D.erro ? '<div class="msg erro" style="margin-bottom:10px">' + esc(D.erro) + '</div>' : '') +
      '<div class="dst-grade">' + cards + '</div>' +
      '<h3 style="margin:0 0 8px">Anúncios ativos no site</h3>' +
      '<div class="filtros-ac"><input id="dstBusca" type="search" placeholder="Ref., bairro, tipo…" value="' + esc(D.q) + '">' +
      '<select id="dstFin" aria-label="Finalidade"><option value="">Todas as finalidades</option>' + ['Venda', 'Locação', 'Temporada'].map(function (f) { return '<option' + (D.fin === f ? ' selected' : '') + '>' + f + '</option>'; }).join('') + '</select>' +
      '<button class="btn" id="dstAtualizar">Atualizar</button></div>' +
      '<p class="s">' + L.length + ' anúncio' + (L.length === 1 ? '' : 's') + ' neste filtro.' + (cheio ? ' Já há ' + D.max + ' destaques: tire um para marcar outro.' : '') + '</p>' + nav +
      '<div class="lista-acessos"><div class="ordenar">Ordenar por: ' + COLS.map(function (c) { return '<button type="button" data-dst-ord="' + c[0] + '">' + c[1] + seta(c[0]) + '</button>'; }).join('') + '</div>' +
      '<table class="ac"><thead><tr>' + COLS.map(function (c) { return th(c[0], c[1]); }).join('') + '<th></th></tr></thead><tbody>' +
      (linhas || '<tr><td colspan="5">Nenhum anúncio neste filtro.</td></tr>') + '</tbody></table></div>' + nav;
    ligar(main);
  }

  function ligar(main) {
    var bu = main.querySelector('#dstBusca'), t = null;
    if (bu) bu.oninput = function () { clearTimeout(t); t = setTimeout(function () { D.q = bu.value; D.pg = 0; desenhar(main); var n = main.querySelector('#dstBusca'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
    var fi = main.querySelector('#dstFin'); if (fi) fi.onchange = function () { D.fin = fi.value; D.pg = 0; desenhar(main); };
    var at = main.querySelector('#dstAtualizar'); if (at) at.onclick = function () { abrir(main, true); };
    main.querySelectorAll('[data-dst-ord]').forEach(function (b) { b.onclick = function () { var k = b.dataset.dstOrd; D.ordem = D.ordem.k === k ? { k: k, d: -D.ordem.d } : { k: k, d: k === 'valor' || k === 'cadastrado_em' ? -1 : 1 }; D.pg = 0; desenhar(main); }; });
    main.querySelectorAll('[data-dst-pg]').forEach(function (b) { b.onclick = function () { D.pg = Math.max(0, D.pg + Number(b.dataset.dstPg)); desenhar(main); }; });
    main.querySelectorAll('[data-dst]').forEach(function (b) { b.onclick = function () { marcar(main, b.dataset.dst, b.dataset.liga === '1'); }; });
    main.querySelectorAll('[data-dst-mov]').forEach(function (b) { b.onclick = function () {
      var L = D.lista.slice(), de = Number(b.dataset.dstMov), para = Number(b.dataset.para); if (para < 0 || para >= L.length) return;
      var r = L.splice(de, 1)[0]; L.splice(para, 0, r); gravarLista(main, L, r + ' foi para a ' + (para + 1) + 'ª posição.'); }; });
    main.querySelectorAll('[data-dst-tira]').forEach(function (b) { b.onclick = function () {
      var r = b.dataset.dstTira; gravarLista(main, D.lista.filter(function (x) { return x !== r; }), r + ' saiu da vitrine.'); }; });
  }

  async function marcar(main, id, liga) {
    if (D.ocupado) return; D.ocupado = id; D.erro = ''; desenhar(main);
    try {
      var r = await C.sb.rpc('site_destaque_marcar', { p_imovel: id, p_marcar: liga });
      if (r.error) throw new Error(r.error.message || 'o banco recusou');
      var x = D.itens.find(function (i) { return i.id === id; });
      C.toast((liga ? 'Entrou na vitrine: ' : 'Saiu da vitrine: ') + ((x && x.ref) || id) + '.');
      await carregar();
    } catch (e) { D.erro = 'Não foi possível gravar: ' + (e && e.message || e); }
    D.ocupado = ''; desenhar(main);
  }

  async function gravarLista(main, L, msg) {
    if (D.ocupado) return; D.ocupado = 'lista'; D.erro = ''; desenhar(main);
    try {
      var r = await C.sb.rpc('site_vitrine_home_gravar', { p_refs: L });
      if (r.error) throw new Error(r.error.message || 'o banco recusou');
      C.toast(msg); await carregar();
    } catch (e) { D.erro = 'Não foi possível gravar: ' + (e && e.message || e); }
    D.ocupado = ''; desenhar(main);
  }

  async function abrir(main, recarregar) {
    if (recarregar || !D.carregado) { D.carregado = false; desenhar(main); await carregar(); }
    desenhar(main);
  }

  window.DESTAQUES = {
    pode: pode,
    tela: function (main, ctx) { C = ctx; abrir(main); },
    sair: function () { D.itens = []; D.carregado = false; D.q = ''; D.fin = ''; D.pg = 0; D.erro = ''; }
  };
})();
