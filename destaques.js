/* Destaques do site no app da Vivere (tarefa vis-site-23, 18/11/2026).
   Decisão do Cleiton: até 8 anúncios ativos na vitrine "Imóveis selecionados" da home do site; marcam o Cleiton (gestor),
   o Nícollas e o William. Lê e grava só pelas funções site_destaques_listar e site_destaque_marcar, que conferem quem pode
   e a trava de 8 no banco. Nenhum dado fica neste arquivo; só o que já é público no anúncio do site. */
(function () {
  'use strict';
  var PODE_PAINEIS = ['nicollas-maraschin', 'william']; // só decide se a aba aparece; quem manda é o banco
  var POR = 50;
  var D = { itens: [], max: 8, carregado: false, carregando: false, erro: '', q: '', fin: '', pg: 0, ordem: { k: 'cadastrado_em', d: -1 }, ocupado: '', capas: {} };
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
      D.itens = (r.data && r.data.itens) || []; D.max = (r.data && r.data.max) || 8; D.carregado = true;
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
    return u ? '<img class="' + cls + '" src="' + esc(u) + '" alt="Foto de capa de ' + esc(x.ref || '') + '" loading="lazy">'
      : '<span class="' + cls + ' sem" title="Anúncio sem foto no site" aria-hidden="true">🏠</span>';
  }
  function estilo() {
    if (document.getElementById('css-dst-capa')) return;
    var st = document.createElement('style'); st.id = 'css-dst-capa';
    st.textContent = '.dst-nome{display:flex;gap:12px;align-items:center}.dst-nome>div{min-width:0}'
      + '.dst-th{width:88px;height:66px;flex:none;object-fit:cover;border-radius:8px;background:var(--line)}'
      + '.dst-capa{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:8px;margin:0 0 10px;background:var(--line)}'
      + '.dst-th.sem,.dst-capa.sem{display:grid;place-items:center;font-size:24px;color:var(--muted)}'
      + '@media (max-width:560px){.dst-th{width:72px;height:54px}}';
    document.head.appendChild(st);
  }

  function marcados() { return D.itens.filter(function (x) { return x.destaque; }); }
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
    var cards = M.map(function (x) {
      return '<div class="cartao">' + capa(x, 'dst-capa') + '<div class="linha-acoes" style="justify-content:space-between;align-items:flex-start"><div>' + nome(x) +
        '<span class="s">' + esc([x.bairro, x.cidade].filter(Boolean).join(' · ')) + ' · ' + brl(x.valor) + '</span>' +
        (x.por ? '<span class="s">marcado por ' + esc(x.por) + (x.em ? ' em ' + dataBR(x.em) : '') + '</span>' : '') + '</div>' +
        '<span class="pill warn">⭐ destaque</span></div><div class="linha-acoes" style="margin-top:10px">' + verSite(x) +
        '<button class="btn" data-dst="' + esc(x.id) + '" data-liga="0"' + (D.ocupado ? ' disabled' : '') + '>Tirar do destaque</button></div></div>';
    }).join('');
    var nav = L.length > POR ? '<div class="linha-acoes" style="margin:8px 0"><button class="btn" data-dst-pg="-1"' + (D.pg ? '' : ' disabled') + '>‹ Anterior</button><span class="s" style="display:inline">' + (D.pg * POR + 1) + '–' + Math.min(L.length, (D.pg + 1) * POR) + ' de ' + L.length + '</span><button class="btn" data-dst-pg="1"' + (D.pg < nPg - 1 ? '' : ' disabled') + '>Próxima ›</button></div>' : '';
    var linhas = L.slice(D.pg * POR, (D.pg + 1) * POR).map(function (x) {
      return '<tr><td class="c-nome"><div class="dst-nome">' + capa(x, 'dst-th') + '<div>' + nome(x) + '</div></div></td><td data-r="Bairro">' + esc([x.bairro, x.cidade].filter(Boolean).join(' · ') || '—') + '</td>' +
        '<td data-r="Valor" class="num">' + brl(x.valor) + '</td><td data-r="Cadastrado">' + (dataBR(x.cadastrado_em) || '—') + '</td>' +
        '<td class="c-acoes"><div class="linha-acoes">' + verSite(x) + '<button class="btn pri" data-dst="' + esc(x.id) + '" data-liga="1"' + (cheio || D.ocupado ? ' disabled title="Já há ' + D.max + ' destaques: tire um antes"' : '') + '>⭐ Marcar destaque</button></div></td></tr>';
    }).join('');
    main.innerHTML =
      '<div class="cartao" style="margin-bottom:14px"><h3 style="margin:0 0 4px">⭐ Destaques do site: ' + M.length + ' de ' + D.max + '</h3>' +
      '<p class="s" style="margin:0">Os anúncios marcados aparecem na vitrine "Imóveis selecionados" da home do site, em poucos minutos. Sem nenhum marcado, a home mostra os 8 mais recentes à venda. Só anúncio ativo pode ser destaque.</p></div>' +
      (D.erro ? '<div class="msg erro" style="margin-bottom:10px">' + esc(D.erro) + '</div>' : '') +
      (M.length ? '<div class="grade" style="margin-bottom:18px">' + cards + '</div>' : '<p class="s" style="margin:0 0 18px">Nenhum destaque marcado ainda.</p>') +
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
  }

  async function marcar(main, id, liga) {
    if (D.ocupado) return; D.ocupado = id; D.erro = ''; desenhar(main);
    try {
      var r = await C.sb.rpc('site_destaque_marcar', { p_imovel: id, p_marcar: liga });
      if (r.error) throw new Error(r.error.message || 'o banco recusou');
      var x = D.itens.find(function (i) { return i.id === id; });
      C.toast((liga ? 'Marcado como destaque: ' : 'Saiu do destaque: ') + ((x && x.ref) || id) + '.');
      await carregar();
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
