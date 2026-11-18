/* Estudo de Mercado (ACM) no app da Vivere (tarefa vivere-parecer-preco-comparaveis, fatia 2, 18/11/2026).
   Decisões do Cleiton (18/11/2026): nome "Estudo de Mercado" (não é laudo); ACM no app do corretor e no HUB, ligada ao lead e ao
   imóvel; 3 faixas com margem de 5%; todos os fatores de ajuste; mínimo de 5 amostras (abaixo, baixa confiança); amostras do
   HUB + concorrentes + portais (coleta assistida, com link); fluxo Criado → Em análise → Devolvido → Aprovado → Apresentado →
   Assinado → Vendido/Suspenso, qualquer diretor aprova; ajuste manual de preço bloqueado para o corretor.
   Lê pelas regras do banco (acm_estudos, acm_amostras, acm_config) e grava só pelas funções acm_*, que conferem de novo quem pode. */
(function () {
  'use strict';
  var POR = 50;
  var FAT = {
    conservacao: ['Conservação', { nova: 'Nova', otima: 'Ótima', regular: 'Regular', reforma: 'Precisa de reforma' }],
    padrao: ['Padrão', { alto: 'Alto', medio: 'Médio', simples: 'Simples' }],
    vista: ['Vista', { panoramica: 'Panorâmica', parcial: 'Parcial', sem: 'Sem vista' }],
    solar: ['Posição solar', { norte: 'Norte', leste: 'Leste (nascente)', oeste_sul: 'Oeste ou sul' }],
    andar: ['Andar', { terreo: 'Térreo ou 1º', intermediario: 'Intermediário', alto: 'Alto ou último' }],
    lazer: ['Lazer', { completo: 'Completo', basico: 'Básico', sem: 'Sem lazer' }],
    mobiliado: ['Mobília', { mobiliado: 'Mobiliado', semi: 'Semimobiliado', sem: 'Sem mobília' }],
    praia: ['Distância da praia', { ate200: 'Até 200 m', ate500: '200 a 500 m', ate1000: '500 m a 1 km', acima1000: 'Acima de 1 km' }]
  };
  var ST = { criado: ['Criado', ''], em_analise: ['Em análise', 'warn'], devolvido: ['Devolvido', 'bad'], aprovado: ['Aprovado', 'ok'],
    apresentado: ['Apresentado', 'ok'], assinado: ['Assinado', 'ok'], vendido: ['Vendido', 'ok'], suspenso: ['Suspenso', 'bad'] };
  var ORIG = { hub: 'Vivere (site)', concorrente: 'Concorrente', portal: 'Portal', manual: 'Manual' };
  var FAIXA = { competitivo: 'Competitivo', mercado: 'Mercado', improvavel: 'Improvável' };
  var A = { lista: [], carregado: false, erro: '', q: '', st: '', pg: 0, ordem: { k: 'atualizado_em', d: -1 }, vista: 'lista',
    est: null, amostras: [], cfg: null, ocupado: false, novo: null, params: null };
  var C = null;

  function esc(v) { return C.esc(v == null ? '' : v); }
  var brl = function (v) { return v == null || v === '' ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 }); };
  var m2 = function (v) { return v == null || v === '' ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + '/m²'; };
  var num = function (v) { var t = String(v == null ? '' : v).trim().replace(/\s|R\$/g, ''); if (!t) return null; if (/,\d{1,2}$/.test(t) || /\.\d{3}/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); var n = Number(t); return isFinite(n) ? n : null; };
  var dataBR = function (s) { if (!s) return ''; var d = new Date(s); return isNaN(d) ? String(s) : d.toLocaleDateString('pt-BR'); };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); };
  var link = function (u) { return /^https?:\/\//i.test(String(u || '')) ? u : ''; };
  function dir() { return !!C.eu && (C.eu.papel === 'gestor' || C.eu.papel === 'diretor'); }
  function pode(eu) { return !!eu && eu.ativo; }
  function erroDe(e) { var m = (e && (e.message || e.details)) || String(e); return m.replace(/^.*?ERROR:\s*/, ''); }
  async function rpc(nome, args) { var r = await C.sb.rpc(nome, args || {}); if (r.error) throw new Error(r.error.message || 'o banco recusou'); return r.data; }

  /* ---------- dados ---------- */
  async function carregarLista() {
    var r = await C.sb.from('acm_estudos').select('id,codigo,painel,destinatario,finalidade,imovel_ref,lead_id,cliente_nome,ficha,status,resultado,criado_por,atualizado_em').order('atualizado_em', { ascending: false }).limit(1000);
    if (r.error) throw new Error(r.error.message);
    A.lista = r.data || []; A.carregado = true;
  }
  async function carregarCfg() { if (A.cfg) return; var r = await C.sb.from('acm_config').select('*').eq('id', 'padrao').maybeSingle(); if (!r.error) A.cfg = r.data; }
  async function carregarEstudo(id) {
    var r = await C.sb.from('acm_estudos').select('*').eq('id', id).maybeSingle();
    if (r.error) throw new Error(r.error.message);
    if (!r.data) throw new Error('estudo não encontrado ou sem acesso');
    A.est = r.data;
    var s = await C.sb.from('acm_amostras').select('*').eq('estudo_id', id).order('criado_em');
    if (s.error) throw new Error(s.error.message);
    A.amostras = s.data || [];
  }

  /* ---------- lista ---------- */
  function filtrados() {
    var q = norm(A.q), L = A.lista;
    if (A.st) L = L.filter(function (x) { return x.status === A.st; });
    if (q) L = L.filter(function (x) { return norm([x.codigo, x.imovel_ref, x.cliente_nome, x.ficha && x.ficha.bairro, x.ficha && x.ficha.tipo, x.painel].join(' ')).indexOf(q) >= 0; });
    var o = A.ordem, val = function (x) { return o.k === 'valor' ? (x.resultado && x.resultado.valor_final) : o.k === 'bairro' ? (x.ficha && x.ficha.bairro) : x[o.k]; };
    return L.slice().sort(function (a, b) {
      var va = val(a), vb = val(b);
      if (va == null || va === '') return 1; if (vb == null || vb === '') return -1;
      if (o.k === 'valor') return (Number(va) - Number(vb)) * o.d;
      return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * o.d;
    });
  }
  function seta(k) { return A.ordem.k === k ? (A.ordem.d === 1 ? ' ▲' : ' ▼') : ' ↕'; }
  function pill(st) { var s = ST[st] || [st, '']; return '<span class="pill ' + s[1] + '">' + esc(s[0]) + '</span>'; }

  function telaLista(main) {
    C.titulo('Estudo de Mercado');
    var COLS = [['codigo', 'Estudo'], ['bairro', 'Imóvel'], ['cliente_nome', 'Cliente'], ['status', 'Situação'], ['valor', 'Valor de mercado'], ['atualizado_em', 'Atualizado']];
    if (dir()) COLS.splice(3, 0, ['painel', 'Painel']);
    var L = filtrados(), nPg = Math.max(1, Math.ceil(L.length / POR));
    if (A.pg > nPg - 1) A.pg = nPg - 1;
    var nav = L.length > POR ? '<div class="linha-acoes" style="margin:8px 0"><button class="btn" data-acm-pg="-1"' + (A.pg ? '' : ' disabled') + '>‹ Anterior</button><span class="s" style="display:inline">' + (A.pg * POR + 1) + '–' + Math.min(L.length, (A.pg + 1) * POR) + ' de ' + L.length + '</span><button class="btn" data-acm-pg="1"' + (A.pg < nPg - 1 ? '' : ' disabled') + '>Próxima ›</button></div>' : '';
    var linhas = L.slice(A.pg * POR, (A.pg + 1) * POR).map(function (x) {
      var f = x.ficha || {}, r = x.resultado || {};
      return '<tr><td class="c-nome"><b>' + esc(x.codigo) + '</b><span class="s">' + (x.destinatario === 'comprador' ? 'Para comprador' : 'Para vendedor') + '</span></td>' +
        '<td data-r="Imóvel">' + esc([x.imovel_ref, f.tipo, f.bairro].filter(Boolean).join(' · ') || '—') + (f.area ? '<span class="s">' + esc(f.area) + ' m²</span>' : '') + '</td>' +
        '<td data-r="Cliente"><span data-sens>' + esc(x.cliente_nome || '—') + '</span></td>' +
        (dir() ? '<td data-r="Painel">' + esc(x.painel) + '</td>' : '') +
        '<td data-r="Situação">' + pill(x.status) + '</td>' +
        '<td data-r="Valor de mercado" class="num"><span data-sens>' + brl(r.valor_final) + '</span>' + (r.confianca === 'baixa' ? '<span class="s">baixa confiança</span>' : '') + '</td>' +
        '<td data-r="Atualizado">' + dataBR(x.atualizado_em) + '</td>' +
        '<td class="c-acoes"><button class="btn pri" data-acm-abre="' + esc(x.id) + '">Abrir</button></td></tr>';
    }).join('');
    main.innerHTML =
      '<div class="cartao" style="margin-bottom:14px"><div class="linha-acoes" style="justify-content:space-between;align-items:flex-start"><div><h3 style="margin:0 0 4px">Estudo de Mercado (ACM)</h3>' +
      '<p class="s" style="margin:0">Comparativo do imóvel com os anúncios da Vivere, das concorrentes e dos portais, ajustado pelos fatores da diretoria, com 3 faixas de preço. Não é laudo de avaliação.</p></div>' +
      '<button class="btn pri" id="acmNovo">Novo estudo</button></div></div>' +
      (A.erro ? '<div class="msg erro" style="margin-bottom:10px">' + esc(A.erro) + '</div>' : '') +
      '<div class="filtros-ac"><input id="acmBusca" type="search" placeholder="Estudo, ref., bairro, cliente…" value="' + esc(A.q) + '">' +
      '<select id="acmSt" aria-label="Situação"><option value="">Todas as situações</option>' + Object.keys(ST).map(function (k) { return '<option value="' + k + '"' + (A.st === k ? ' selected' : '') + '>' + ST[k][0] + '</option>'; }).join('') + '</select>' +
      '<button class="btn" id="acmAtualizar">Atualizar</button></div>' +
      '<p class="s">' + (A.carregado ? L.length + ' estudo' + (L.length === 1 ? '' : 's') + ' neste filtro.' : 'Carregando…') + '</p>' + nav +
      '<div class="lista-acessos"><div class="ordenar">Ordenar por: ' + COLS.map(function (c) { return '<button type="button" data-acm-ord="' + c[0] + '">' + c[1] + seta(c[0]) + '</button>'; }).join('') + '</div>' +
      '<table class="ac"><thead><tr>' + COLS.map(function (c) { return '<th><button type="button" data-acm-ord="' + c[0] + '">' + c[1] + seta(c[0]) + '</button></th>'; }).join('') + '<th></th></tr></thead><tbody>' +
      (linhas || '<tr><td colspan="' + (COLS.length + 1) + '">' + (A.carregado ? 'Nenhum estudo ainda. Toque em "Novo estudo" para começar.' : 'Carregando…') + '</td></tr>') + '</tbody></table></div>' + nav;
    var bu = main.querySelector('#acmBusca'), t = null;
    bu.oninput = function () { clearTimeout(t); t = setTimeout(function () { A.q = bu.value; A.pg = 0; desenhar(main); var n = main.querySelector('#acmBusca'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
    main.querySelector('#acmSt').onchange = function (e) { A.st = e.target.value; A.pg = 0; desenhar(main); };
    main.querySelector('#acmAtualizar').onclick = function () { abrirLista(main, true); };
    main.querySelector('#acmNovo').onclick = function () { A.novo = { destinatario: 'vendedor', finalidade: 'venda', imovel: null, lead: null, cliente: '', resImoveis: null, resLeads: null }; A.vista = 'novo'; desenhar(main); };
    main.querySelectorAll('[data-acm-ord]').forEach(function (b) { b.onclick = function () { var k = b.dataset.acmOrd; A.ordem = A.ordem.k === k ? { k: k, d: -A.ordem.d } : { k: k, d: k === 'valor' || k === 'atualizado_em' ? -1 : 1 }; A.pg = 0; desenhar(main); }; });
    main.querySelectorAll('[data-acm-pg]').forEach(function (b) { b.onclick = function () { A.pg = Math.max(0, A.pg + Number(b.dataset.acmPg)); desenhar(main); }; });
    main.querySelectorAll('[data-acm-abre]').forEach(function (b) { b.onclick = function () { abrirEstudo(main, b.dataset.acmAbre); }; });
  }

  /* ---------- novo estudo ---------- */
  function telaNovo(main) {
    C.titulo('Novo estudo de mercado');
    var N = A.novo, im = N.imovel, ld = N.lead;
    var resI = N.resImoveis ? (N.resImoveis.length ? N.resImoveis.map(function (x) {
      return '<button type="button" class="btn" style="margin:0 6px 6px 0" data-acm-im="' + esc(x.ref) + '">' + esc(x.ref) + ' · ' + esc(x.tipo || '') + ' · ' + esc(x.bairro || '') + ' · ' + esc(x.area || '?') + ' m² · ' + brl(x.valor) + '</button>';
    }).join('') : '<p class="s">Nenhum anúncio com esse termo.</p>') : '';
    var resL = N.resLeads ? (N.resLeads.length ? N.resLeads.map(function (x) {
      return '<button type="button" class="btn" style="margin:0 6px 6px 0" data-acm-ld="' + esc(x.id) + '"><span data-sens>' + esc(x.nome || x.id) + '</span>' + (x.interesse ? ' · ' + esc(x.interesse) : '') + '</button>';
    }).join('') : '<p class="s">Nenhum lead com esse nome no seu painel.</p>') : '';
    main.innerHTML =
      '<div class="linha-acoes" style="margin-bottom:12px"><button class="btn" id="acmVolta">‹ Voltar aos estudos</button></div>' +
      '<div class="cartao form" style="max-width:820px"><h3 style="margin:0 0 10px">Novo estudo de mercado</h3>' +
      '<label>Para quem é o estudo<select id="acmDest"><option value="vendedor"' + (N.destinatario === 'vendedor' ? ' selected' : '') + '>Vendedor (o preço pedido está dentro do mercado?)</option><option value="comprador"' + (N.destinatario === 'comprador' ? ' selected' : '') + '>Comprador (o imóvel está abaixo ou acima dos comparáveis?)</option></select></label>' +
      '<label>Finalidade<select id="acmFin"><option value="venda"' + (N.finalidade === 'venda' ? ' selected' : '') + '>Venda</option><option value="locacao"' + (N.finalidade === 'locacao' ? ' selected' : '') + '>Locação</option></select></label>' +
      '<h4 style="margin:14px 0 6px">Imóvel avaliado</h4>' +
      (im ? '<p><b>' + esc(im.ref) + '</b> · ' + esc([im.tipo, im.bairro, (im.area || '?') + ' m²', brl(im.valor)].join(' · ')) + ' <button type="button" class="btn" id="acmImTira">Trocar</button></p>'
        : '<p class="s" style="margin:0 0 6px">Busque o anúncio pela ref., bairro ou tipo. Imóvel fora do site: deixe em branco e preencha a ficha no passo seguinte.</p>' +
          '<div class="filtros-ac"><input id="acmImQ" type="search" placeholder="AP146, Jurerê, casa…"><button type="button" class="btn" id="acmImBusca">Buscar</button></div>' + resI) +
      '<h4 style="margin:14px 0 6px">Cliente</h4>' +
      (ld ? '<p>Lead: <b data-sens>' + esc(ld.nome || ld.id) + '</b> <button type="button" class="btn" id="acmLdTira">Trocar</button></p>'
        : '<div class="filtros-ac"><input id="acmLdQ" type="search" placeholder="Nome do lead no seu painel"><button type="button" class="btn" id="acmLdBusca">Buscar lead</button></div>' + resL) +
      '<label>Nome do cliente no estudo<input id="acmCli" type="text" maxlength="120" value="' + esc(N.cliente || (ld && ld.nome) || '') + '" data-sens></label>' +
      '<div class="linha-acoes" style="margin-top:12px"><button class="btn pri" id="acmCria"' + (A.ocupado ? ' disabled' : '') + '>Criar o estudo</button></div></div>';
    var guarda = function () { N.destinatario = main.querySelector('#acmDest').value; N.finalidade = main.querySelector('#acmFin').value; N.cliente = main.querySelector('#acmCli').value; };
    main.querySelector('#acmVolta').onclick = function () { A.vista = 'lista'; A.novo = null; desenhar(main); };
    var b;
    if ((b = main.querySelector('#acmImBusca'))) {
      var buscaIm = async function () { guarda(); try { N.resImoveis = await rpc('acm_buscar_imoveis', { p_q: main.querySelector('#acmImQ').value }); } catch (e) { C.toast('Busca recusada: ' + erroDe(e)); } desenhar(main); };
      b.onclick = buscaIm; main.querySelector('#acmImQ').onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); buscaIm(); } };
    }
    if ((b = main.querySelector('#acmLdBusca'))) {
      var buscaLd = async function () { guarda(); try { N.resLeads = await rpc('acm_meus_leads', { p_q: main.querySelector('#acmLdQ').value }); } catch (e) { C.toast('Busca recusada: ' + erroDe(e)); } desenhar(main); };
      b.onclick = buscaLd; main.querySelector('#acmLdQ').onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); buscaLd(); } };
    }
    main.querySelectorAll('[data-acm-im]').forEach(function (x) { x.onclick = function () { guarda(); N.imovel = (N.resImoveis || []).find(function (i) { return i.ref === x.dataset.acmIm; }); if (N.imovel && /loca/i.test(N.imovel.finalidade || '')) N.finalidade = 'locacao'; desenhar(main); }; });
    main.querySelectorAll('[data-acm-ld]').forEach(function (x) { x.onclick = function () { guarda(); N.lead = (N.resLeads || []).find(function (i) { return i.id === x.dataset.acmLd; }); if (N.lead && !N.cliente) N.cliente = N.lead.nome || ''; desenhar(main); }; });
    if ((b = main.querySelector('#acmImTira'))) b.onclick = function () { guarda(); N.imovel = null; desenhar(main); };
    if ((b = main.querySelector('#acmLdTira'))) b.onclick = function () { guarda(); N.lead = null; desenhar(main); };
    main.querySelector('#acmCria').onclick = async function () {
      guarda(); A.ocupado = true; desenhar(main);
      try {
        var id = await rpc('acm_criar', { p: { destinatario: N.destinatario, finalidade: N.finalidade, imovel_ref: N.imovel ? N.imovel.ref : '', lead_id: N.lead ? N.lead.id : '', lead_painel: N.lead ? N.lead.painel : '', cliente_nome: N.cliente } });
        A.ocupado = false; A.novo = null; A.carregado = false; C.toast('Estudo criado. Complete a ficha e busque as amostras.');
        await abrirEstudo(main, id);
      } catch (e) { A.ocupado = false; C.toast('Não foi possível criar: ' + erroDe(e)); desenhar(main); }
    };
  }

  /* ---------- estudo ---------- */
  function sel(id, fat, val, dis) {
    var o = FAT[fat][1];
    return '<select id="' + id + '"' + (dis ? ' disabled' : '') + '><option value="">Não informado</option>' + Object.keys(o).map(function (k) { return '<option value="' + k + '"' + (val === k ? ' selected' : '') + '>' + o[k] + '</option>'; }).join('') + '</select>';
  }
  function editavel() { var e = A.est; return dir() || e.status === 'criado' || e.status === 'devolvido'; }

  function blocoResultado() {
    var e = A.est, r = e.resultado;
    if (!r) return '<div class="cartao" style="margin-bottom:14px"><h3 style="margin:0 0 6px">Resultado</h3><p class="s" style="margin:0">Ainda não calculado. Complete a ficha, inclua ao menos ' + ((A.cfg && A.cfg.min_amostras) || 5) + ' amostras e toque em "Calcular".</p></div>';
    var F = r.faixas || {}, ped = r.valor_pedido, ini = F.competitivo_ate * 0.85, fim = F.improvavel_acima * 1.15;
    if (ped) { ini = Math.min(ini, ped * 0.95); fim = Math.max(fim, ped * 1.05); }
    var pct = function (v) { return Math.max(0, Math.min(100, (v - ini) / (fim - ini) * 100)); };
    var a = pct(F.competitivo_ate), b = pct(F.improvavel_acima);
    var barra = '<div style="position:relative;height:30px;border-radius:8px;overflow:hidden;display:flex;margin:10px 0 4px" aria-hidden="true">' +
      '<div style="width:' + a + '%;background:var(--ok-bg)"></div><div style="width:' + (b - a) + '%;background:var(--warn-bg)"></div><div style="flex:1;background:var(--bad-bg)"></div>' +
      (ped ? '<div style="position:absolute;top:0;bottom:0;left:calc(' + pct(ped) + '% - 1px);width:3px;background:var(--ink)"></div>' : '') + '</div>' +
      '<div class="linha-acoes" style="justify-content:space-between;font-size:12.5px"><span>Competitivo: até <b data-sens>' + brl(F.competitivo_ate) + '</b></span><span>Mercado: <b data-sens>' + brl(F.mercado_de) + '</b> a <b data-sens>' + brl(F.mercado_ate) + '</b></span><span>Improvável: acima de <b data-sens>' + brl(F.improvavel_acima) + '</b></span></div>';
    var ver = '';
    if (ped) {
      if (e.destinatario === 'comprador') ver = 'O valor pedido (<b data-sens>' + brl(ped) + '</b>) está <b>' + Math.abs(r.diferenca_pct).toLocaleString('pt-BR') + '% ' + (r.diferenca_pct > 0 ? 'acima' : 'abaixo') + '</b> do valor de mercado dos comparáveis.';
      else ver = 'O preço pedido (<b data-sens>' + brl(ped) + '</b>) está na faixa <b>' + esc(FAIXA[r.faixa_do_pedido] || r.faixa_do_pedido) + '</b> (' + (r.diferenca_pct > 0 ? '+' : '') + Number(r.diferenca_pct).toLocaleString('pt-BR') + '% sobre o valor de mercado).';
    }
    return '<div class="cartao" style="margin-bottom:14px"><div class="linha-acoes" style="justify-content:space-between;align-items:flex-start"><h3 style="margin:0">Resultado</h3>' +
      (r.confianca === 'baixa' ? '<span class="pill bad">Baixa confiança: ' + r.amostras_validas + ' de ' + r.minimo + ' amostras</span>' : '<span class="pill ok">' + r.amostras_validas + ' amostras válidas</span>') + '</div>' +
      '<p style="font-size:26px;margin:8px 0 0"><b data-sens>' + brl(r.valor_final) + '</b></p>' +
      '<p class="s" style="margin:2px 0 0">Valor de mercado' + (r.ajuste_manual ? ' com ajuste manual (calculado: <span data-sens>' + brl(r.valor_mercado_calculado) + '</span>)' : '') + ' · ' + m2(r.rs_m2_medio) + ' × ' + esc(r.area) + ' m² · variação ' + (r.coef_variacao != null ? Number(r.coef_variacao).toLocaleString('pt-BR') + '%' : '—') + ' · calculado em ' + esc(r.calculado_em) + '</p>' +
      barra + (ver ? '<p style="margin:10px 0 0">' + ver + '</p>' : '<p class="s" style="margin:10px 0 0">Informe o valor pedido na ficha para ver em que faixa ele cai.</p>') +
      (r.amostras_saneadas ? '<p class="s" style="margin:6px 0 0">' + r.amostras_saneadas + ' amostra' + (r.amostras_saneadas === 1 ? '' : 's') + ' fora da média (mais de ' + r.parametros.corte_saneamento + '%) ficou de fora do cálculo.</p>' : '') + '</div>';
  }

  function blocoFluxo() {
    var e = A.est, s = e.status, d = dir(), bt = [];
    if (s === 'criado' || s === 'devolvido') bt.push(['em_analise', 'Enviar para análise', 'pri']);
    if (s === 'em_analise' && d) { bt.push(['aprovado', 'Aprovar', 'pri']); bt.push(['devolvido', 'Devolver para ajustes', '']); }
    if (s === 'aprovado') bt.push(['apresentado', 'Marcar como apresentado ao cliente', 'pri']);
    if (s === 'apresentado') bt.push(['assinado', 'Marcar como assinado', 'pri']);
    if (s === 'apresentado' || s === 'assinado') bt.push(['vendido', 'Marcar como vendido', '']);
    if (s !== 'vendido' && s !== 'suspenso') bt.push(['suspenso', 'Suspender', 'perigo']);
    if (s === 'suspenso' && d) bt.push(['criado', 'Reabrir', '']);
    var aviso = s === 'em_analise' && !d ? '<p class="s" style="margin:0 0 8px">Aguardando a aprovação de um diretor.</p>' : s === 'devolvido' ? '<p class="s" style="margin:0 0 8px">Devolvido: veja o motivo no histórico, ajuste e envie de novo.</p>' : '';
    return '<div class="cartao" style="margin-bottom:14px"><h3 style="margin:0 0 8px">Andamento</h3>' + aviso +
      '<label style="display:block;margin-bottom:8px">Observação (obrigatória para devolver)<input id="acmObs" type="text" maxlength="300"></label>' +
      '<div class="linha-acoes">' + bt.map(function (x) { return '<button class="btn ' + x[2] + '" data-acm-st="' + x[0] + '"' + (A.ocupado ? ' disabled' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>' +
      (s === 'em_analise' || s === 'criado' || s === 'devolvido' ? '' : '<p class="s" style="margin:8px 0 0">' + (e.aprovado_por ? 'Aprovado por ' + esc(e.aprovado_por) + (e.aprovado_em ? ' em ' + dataBR(e.aprovado_em) : '') + '.' : '') + '</p>') + '</div>';
  }

  function blocoAjuste() {
    var e = A.est, d = dir(), aj = e.ajuste_manual;
    if (!d && e.ajuste_bloqueado) return '<div class="cartao" style="margin-bottom:14px"><h3 style="margin:0 0 6px">Ajuste manual do valor</h3><p class="s" style="margin:0">Bloqueado. Se o valor calculado não reflete o imóvel, peça a liberação à diretoria.</p></div>';
    return '<div class="cartao" style="margin-bottom:14px"><h3 style="margin:0 0 6px">Ajuste manual do valor</h3>' +
      (aj ? '<p style="margin:0 0 8px">Em vigor: <b data-sens>' + brl(aj.valor) + '</b> · ' + esc(aj.motivo) + ' <span class="s">(' + esc(aj.por) + ', ' + esc(aj.em) + ')</span></p>' : '') +
      '<div class="filtros-ac"><input id="acmAjV" type="text" inputmode="decimal" placeholder="Valor, ex.: 1.650.000"><input id="acmAjM" type="text" maxlength="200" placeholder="Motivo do ajuste"></div>' +
      '<div class="linha-acoes"><button class="btn pri" id="acmAjOk"' + (A.ocupado ? ' disabled' : '') + '>Aplicar ajuste</button>' + (aj ? '<button class="btn" id="acmAjTira">Voltar ao valor calculado</button>' : '') +
      (d ? '<button class="btn" id="acmAjLib">' + (e.ajuste_bloqueado ? 'Liberar ajuste ao corretor' : 'Bloquear ajuste do corretor') + '</button>' : '') + '</div></div>';
  }

  function linhaAmostra(x, ed) {
    var c = x.calc || {}, aj = c.ajustes || {}, cr = x.caracteristicas || {};
    var ajTxt = Object.keys(aj).map(function (k) { return (FAT[k] ? FAT[k][0] : k === 'vagas' ? 'Vagas' : k) + ' ' + (aj[k] > 0 ? '+' : '') + aj[k] + '%'; }).join(', ');
    var fonte = link(x.link) ? '<a href="' + esc(x.link) + '" target="_blank" rel="noopener noreferrer">' + esc(x.ref || x.fonte_nome || 'abrir anúncio') + '</a>' : esc(x.ref || x.fonte_nome || '—');
    var det = ed ? '<details style="margin-top:6px"><summary class="s">Características da amostra</summary><div class="filtros-ac" style="margin-top:6px">' +
      Object.keys(FAT).map(function (k) { return '<label style="font-size:12.5px">' + FAT[k][0] + sel('acmAm-' + x.id + '-' + k, k, cr[k]) + '</label>'; }).join('') +
      '</div><button class="btn" data-acm-amc="' + esc(x.id) + '">Salvar características</button></details>' : '';
    return '<tr class="' + (x.incluida ? '' : 'desligado') + '"><td class="c-nome"><b>' + esc(ORIG[x.origem] || x.origem) + '</b> · ' + fonte +
      '<span class="s">' + esc([x.tipo, x.bairro, x.dorm != null ? x.dorm + ' dorm.' : '', x.vagas != null ? x.vagas + ' vaga' + (x.vagas === 1 ? '' : 's') : '', x.coletado_em ? 'coletado ' + dataBR(x.coletado_em + 'T12:00:00') : ''].filter(Boolean).join(' · ')) + '</span>' + det + '</td>' +
      '<td data-r="Área" class="num">' + esc(x.area) + ' m²</td><td data-r="Valor" class="num"><span data-sens>' + brl(x.valor) + '</span></td>' +
      '<td data-r="R$/m²" class="num">' + m2(c.rs_m2) + '</td><td data-r="Homogeneizado" class="num">' + m2(c.rs_m2_homog) + (c.saneada ? '<span class="s">fora da média</span>' : '') + '</td>' +
      '<td data-r="Ajustes">' + (ajTxt ? esc(ajTxt) : '<span class="s">' + (c.rs_m2 ? 'sem ajuste' : '—') + '</span>') + '</td>' +
      '<td class="c-acoes">' + (ed ? '<button class="btn" data-acm-inc="' + esc(x.id) + '" data-v="' + (x.incluida ? '0' : '1') + '">' + (x.incluida ? 'Tirar do cálculo' : 'Voltar ao cálculo') + '</button>' : (x.incluida ? '' : '<span class="s">fora do cálculo</span>')) + '</td></tr>';
  }

  function telaEstudo(main) {
    var e = A.est, f = e.ficha || {}, ed = editavel(), am = A.amostras, inc = am.filter(function (x) { return x.incluida; }).length;
    C.titulo('Estudo ' + e.codigo);
    var campo = function (id, rot, val, tipo, ph) { return '<label>' + rot + '<input id="' + id + '" type="text"' + (tipo === 'n' ? ' inputmode="decimal"' : '') + ' value="' + esc(val == null ? '' : val) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (ed ? '' : ' disabled') + '></label>'; };
    var ficha = '<div class="cartao" style="margin-bottom:14px"><h3 style="margin:0 0 8px">Ficha do imóvel avaliado</h3>' +
      '<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px 12px">' +
      campo('acmF-tipo', 'Tipo', f.tipo, '', 'Apartamento') + campo('acmF-bairro', 'Bairro', f.bairro, '', 'Jurerê') + campo('acmF-area', 'Área privativa (m²)', f.area, 'n') +
      campo('acmF-dorm', 'Dormitórios', f.dorm, 'n') + campo('acmF-suites', 'Suítes', f.suites, 'n') + campo('acmF-vagas', 'Vagas', f.vagas, 'n') +
      campo('acmF-valor', e.destinatario === 'comprador' ? 'Valor pedido pelo vendedor' : 'Preço pedido pelo proprietário', f.valor_pedido, 'n') +
      Object.keys(FAT).map(function (k) { return '<label>' + FAT[k][0] + sel('acmF-' + k, k, f[k], !ed) + '</label>'; }).join('') + '</div>' +
      (ed ? '<div class="linha-acoes" style="margin-top:10px"><button class="btn pri" id="acmSalva"' + (A.ocupado ? ' disabled' : '') + '>Salvar a ficha</button></div>' : '<p class="s" style="margin:8px 0 0">A ficha só muda enquanto o estudo está criado ou devolvido.</p>') + '</div>';
    var origens = ['portal', 'concorrente', 'manual'];
    var nova = ed ? '<details class="cartao" style="margin-bottom:14px"' + (A.abreNova ? ' open' : '') + '><summary><b>Adicionar amostra de portal, concorrente ou manual</b></summary>' +
      '<p class="s">Copie do anúncio o link, a área e o valor. Portal e concorrente pedem o link.</p>' +
      '<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px 12px">' +
      '<label>Origem<select id="acmN-origem">' + origens.map(function (o) { return '<option value="' + o + '">' + ORIG[o] + '</option>'; }).join('') + '</select></label>' +
      '<label>Fonte<input id="acmN-fonte" type="text" maxlength="80" placeholder="ZAP, OLX, Ibagy…"></label>' +
      '<label style="grid-column:1/-1">Link do anúncio<input id="acmN-link" type="url" maxlength="500" placeholder="https://…"></label>' +
      '<label>Tipo<input id="acmN-tipo" type="text" value="' + esc(f.tipo || '') + '"></label><label>Bairro<input id="acmN-bairro" type="text" value="' + esc(f.bairro || '') + '"></label>' +
      '<label>Área (m²)<input id="acmN-area" type="text" inputmode="decimal"></label><label>Valor anunciado<input id="acmN-valor" type="text" inputmode="decimal"></label>' +
      '<label>Dormitórios<input id="acmN-dorm" type="text" inputmode="numeric"></label><label>Vagas<input id="acmN-vagas" type="text" inputmode="numeric"></label>' +
      Object.keys(FAT).map(function (k) { return '<label>' + FAT[k][0] + sel('acmN-' + k, k, '') + '</label>'; }).join('') +
      '<label style="display:flex;gap:6px;align-items:center"><input id="acmN-fechado" type="checkbox"> Valor de venda fechada (sem desconto de oferta)</label></div>' +
      '<div class="linha-acoes" style="margin-top:10px"><button class="btn pri" id="acmNovaOk"' + (A.ocupado ? ' disabled' : '') + '>Adicionar a amostra</button></div></details>' : '';
    var hist = (e.historico || []).slice().reverse().map(function (h) { return '<li><span class="s" style="display:inline">' + esc(h.em) + ' · ' + esc(h.por) + '</span> — ' + esc(h.o_que) + '</li>'; }).join('');
    main.innerHTML =
      '<div class="linha-acoes" style="margin-bottom:12px"><button class="btn" id="acmVolta">‹ Voltar aos estudos</button><button class="btn" id="acmRecarrega">Atualizar</button></div>' +
      '<div class="cartao" style="margin-bottom:14px"><div class="linha-acoes" style="justify-content:space-between;align-items:flex-start"><div><h3 style="margin:0 0 4px">' + esc(e.codigo) + ' · Estudo de Mercado</h3>' +
      '<p class="s" style="margin:0">' + (e.destinatario === 'comprador' ? 'Para comprador' : 'Para vendedor') + ' · ' + (e.finalidade === 'locacao' ? 'Locação' : 'Venda') +
      (e.imovel_ref ? ' · imóvel ' + esc(e.imovel_ref) : ' · imóvel fora do site') + (e.cliente_nome ? ' · cliente <span data-sens>' + esc(e.cliente_nome) + '</span>' : '') +
      (e.lead_id ? ' · ligado ao lead' : '') + (dir() ? ' · painel ' + esc(e.painel) : '') + '</p></div>' + pill(e.status) + '</div></div>' +
      blocoResultado() + ficha +
      '<div class="cartao" style="margin-bottom:14px"><div class="linha-acoes" style="justify-content:space-between"><h3 style="margin:0">Amostras: ' + inc + ' no cálculo de ' + am.length + '</h3>' +
      '<div class="linha-acoes">' + (ed ? '<button class="btn" id="acmSugere"' + (A.ocupado ? ' disabled' : '') + '>Sugerir do site da Vivere</button>' : '') +
      '<button class="btn pri" id="acmCalc"' + (A.ocupado || !ed && !dir() ? ' disabled' : '') + '>Calcular</button></div></div>' +
      '<p class="s">O cálculo usa o R$/m² de cada amostra, o desconto de oferta (' + ((A.cfg && A.cfg.desc_oferta) != null ? A.cfg.desc_oferta : -10) + '%) e a diferença de cada fator entre o imóvel avaliado e a amostra. Preencha as características das amostras para ajustar melhor. Mínimo: ' + ((A.cfg && A.cfg.min_amostras) || 5) + ' amostras.</p>' +
      '<div class="lista-acessos"><table class="ac"><thead><tr><th>Amostra</th><th>Área</th><th>Valor</th><th>R$/m²</th><th>Homogeneizado</th><th>Ajustes</th><th></th></tr></thead><tbody>' +
      (am.length ? am.map(function (x) { return linhaAmostra(x, ed); }).join('') : '<tr><td colspan="7">Nenhuma amostra ainda. Toque em "Sugerir do site da Vivere" e acrescente as dos portais e concorrentes.</td></tr>') + '</tbody></table></div></div>' +
      nova + blocoFluxo() + blocoAjuste() +
      '<details class="cartao"><summary><b>Histórico</b></summary><ul style="margin:8px 0 0;padding-left:18px">' + (hist || '<li>—</li>') + '</ul></details>';
    ligarEstudo(main);
  }

  function lerFicha(main) {
    var v = function (k) { var i = main.querySelector('#acmF-' + k); return i ? i.value.trim() : ''; }, f = {};
    f.tipo = v('tipo'); f.bairro = v('bairro'); f.area = num(v('area')); f.dorm = num(v('dorm')); f.suites = num(v('suites')); f.vagas = num(v('vagas')); f.valor_pedido = num(v('valor'));
    Object.keys(FAT).forEach(function (k) { f[k] = v(k) || null; });
    return f;
  }
  async function acao(main, fn, okMsg) {
    if (A.ocupado) return; A.ocupado = true; desenhar(main);
    try { var r = await fn(); if (okMsg) C.toast(typeof okMsg === 'function' ? okMsg(r) : okMsg); await carregarEstudo(A.est.id); A.carregado = false; }
    catch (e) { C.toast('Não foi possível: ' + erroDe(e)); }
    A.ocupado = false; desenhar(main);
  }
  function ligarEstudo(main) {
    var e = A.est, b;
    main.querySelector('#acmVolta').onclick = function () { A.vista = 'lista'; A.est = null; abrirLista(main, !A.carregado); };
    main.querySelector('#acmRecarrega').onclick = function () { abrirEstudo(main, e.id); };
    if ((b = main.querySelector('#acmSalva'))) b.onclick = function () { var f = lerFicha(main); acao(main, function () { return rpc('acm_salvar', { p_id: e.id, p: { ficha: f } }); }, 'Ficha salva.'); };
    if ((b = main.querySelector('#acmSugere'))) b.onclick = function () {
      var f = lerFicha(main);
      acao(main, async function () { await rpc('acm_salvar', { p_id: e.id, p: { ficha: f } }); return rpc('acm_sugerir_amostras', { p_id: e.id }); },
        function (r) { return r.sugeridas + ' amostra' + (r.sugeridas === 1 ? '' : 's') + ' do site (' + r.criterio + ').' + (r.sugeridas < r.minimo ? ' Abaixo do mínimo: acrescente amostras de portais ou concorrentes.' : ''); });
    };
    if ((b = main.querySelector('#acmCalc'))) b.onclick = function () {
      var f = editavel() ? lerFicha(main) : null;
      acao(main, async function () { if (f) await rpc('acm_salvar', { p_id: e.id, p: { ficha: f } }); return rpc('acm_calcular', { p_id: e.id }); },
        function (r) { return 'Valor de mercado: ' + brl(r.valor_final) + (r.confianca === 'baixa' ? ' (baixa confiança)' : '') + '.'; });
    };
    if ((b = main.querySelector('#acmNovaOk'))) b.onclick = function () {
      var g = function (k) { var i = main.querySelector('#acmN-' + k); return i ? i.value.trim() : ''; }, car = {};
      Object.keys(FAT).forEach(function (k) { if (g(k)) car[k] = g(k); });
      var a = { origem: g('origem'), fonte_nome: g('fonte'), link: g('link'), tipo: g('tipo'), bairro: g('bairro'), area: num(g('area')), valor: num(g('valor')), dorm: num(g('dorm')), vagas: num(g('vagas')), caracteristicas: car, valor_fechado: !!main.querySelector('#acmN-fechado').checked };
      if (a.link && !link(a.link)) { C.toast('O link precisa começar com https://'); return; }
      A.abreNova = false;
      acao(main, function () { return rpc('acm_amostra_adicionar', { p_id: e.id, a: a }); }, 'Amostra adicionada. Toque em "Calcular" para atualizar o resultado.');
    };
    main.querySelectorAll('[data-acm-inc]').forEach(function (x) { x.onclick = function () { acao(main, function () { return rpc('acm_amostra_alterar', { p_amostra: x.dataset.acmInc, p: { incluida: x.dataset.v === '1' } }); }, 'Amostra atualizada. Calcule de novo.'); }; });
    main.querySelectorAll('[data-acm-amc]').forEach(function (x) {
      x.onclick = function () {
        var id = x.dataset.acmAmc, car = {};
        Object.keys(FAT).forEach(function (k) { var i = main.querySelector('#acmAm-' + id + '-' + k); car[k] = i && i.value ? i.value : null; });
        acao(main, function () { return rpc('acm_amostra_alterar', { p_amostra: id, p: { caracteristicas: car } }); }, 'Características salvas. Calcule de novo.');
      };
    });
    main.querySelectorAll('[data-acm-st]').forEach(function (x) {
      x.onclick = function () {
        var novo = x.dataset.acmSt, obs = (main.querySelector('#acmObs') || {}).value || '';
        if (novo === 'devolvido' && !obs.trim()) { C.toast('Escreva o motivo da devolução na observação.'); return; }
        acao(main, function () { return rpc('acm_mudar_status', { p_id: e.id, p_novo: novo, p_obs: obs.trim() || null }); }, 'Situação: ' + (ST[novo] || [novo])[0] + '.');
      };
    });
    if ((b = main.querySelector('#acmAjOk'))) b.onclick = function () {
      var v = num(main.querySelector('#acmAjV').value), m = main.querySelector('#acmAjM').value.trim();
      if (!v || !m) { C.toast('Informe o valor e o motivo do ajuste.'); return; }
      acao(main, function () { return rpc('acm_ajuste_manual', { p_id: e.id, p_valor: v, p_motivo: m }); }, 'Ajuste aplicado.');
    };
    if ((b = main.querySelector('#acmAjTira'))) b.onclick = function () { acao(main, function () { return rpc('acm_ajuste_manual', { p_id: e.id, p_valor: null, p_motivo: null }); }, 'De volta ao valor calculado.'); };
    if ((b = main.querySelector('#acmAjLib'))) b.onclick = function () { acao(main, function () { return rpc('acm_liberar_ajuste', { p_id: e.id, p_liberar: !!e.ajuste_bloqueado }); }, e.ajuste_bloqueado ? 'Ajuste liberado ao corretor.' : 'Ajuste bloqueado.'); };
    var det = main.querySelector('details.cartao'); if (det && det.querySelector('#acmNovaOk')) det.ontoggle = function () { A.abreNova = det.open; };
  }

  /* ---------- navegação ---------- */
  function desenhar(main) {
    if (A.vista === 'novo' && A.novo) return telaNovo(main);
    if (A.vista === 'estudo' && A.est) return telaEstudo(main);
    telaLista(main);
  }
  async function abrirLista(main, recarregar) {
    A.vista = 'lista';
    if (recarregar || !A.carregado) { A.carregado = false; A.erro = ''; desenhar(main); try { await carregarLista(); } catch (e) { A.erro = 'Não foi possível carregar os estudos: ' + erroDe(e); } }
    desenhar(main);
  }
  async function abrirEstudo(main, id) {
    main.innerHTML = '<div class="vazio">Abrindo o estudo…</div>';
    try { await carregarCfg(); await carregarEstudo(id); A.vista = 'estudo'; }
    catch (e) { A.erro = 'Não foi possível abrir o estudo: ' + erroDe(e); A.vista = 'lista'; }
    desenhar(main);
  }
  async function abrir(main, p) {
    await carregarCfg();
    p = p || {};
    if (p.estudo) {
      var r = await C.sb.from('acm_estudos').select('id').or('id.eq.' + (/^[0-9a-f-]{36}$/i.test(p.estudo) ? p.estudo : '00000000-0000-0000-0000-000000000000') + ',codigo.eq.' + String(p.estudo).replace(/[^A-Za-z0-9-]/g, '')).maybeSingle();
      if (r.data) return abrirEstudo(main, r.data.id);
    }
    if (p.ref) {
      A.novo = { destinatario: 'vendedor', finalidade: 'venda', imovel: null, lead: null, cliente: '', resImoveis: null, resLeads: null };
      try { var L = await rpc('acm_buscar_imoveis', { p_q: p.ref }); A.novo.imovel = (L || []).find(function (x) { return x.ref === p.ref; }) || null; A.novo.resImoveis = A.novo.imovel ? null : L; } catch (e) { }
      if (A.novo.imovel && /loca/i.test(A.novo.imovel.finalidade || '')) A.novo.finalidade = 'locacao';
      A.vista = 'novo'; return desenhar(main);
    }
    return abrirLista(main, true);
  }

  window.ACM = {
    pode: pode,
    tela: function (main, ctx, params) { C = ctx; abrir(main, params); },
    resumo: async function (ctx) { C = ctx; var r = await ctx.sb.from('acm_estudos').select('status'); if (r.error) throw r.error; var L = r.data || []; return { total: L.length, analise: L.filter(function (x) { return x.status === 'em_analise'; }).length }; },
    sair: function () { A.lista = []; A.carregado = false; A.est = null; A.amostras = []; A.cfg = null; A.novo = null; A.vista = 'lista'; A.q = ''; A.st = ''; A.pg = 0; A.erro = ''; A.ordem = { k: 'atualizado_em', d: -1 }; }
  };
})();
