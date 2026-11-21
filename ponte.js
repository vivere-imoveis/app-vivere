/* App da Vivere — ponte do painel do corretor (fatia 4b, 09/11/2026).
   O painel.js é o mesmo do modelo dos painéis: ele pede os dados por window.claude (banco, usuário, arquivos, IA).
   Esta ponte entrega esses mesmos comandos lendo e gravando no Supabase, com o login do app.
   Nenhum dado fica neste repositório: quem decide o que cada pessoa lê e grava são as regras do banco. */
(function () {
  'use strict';
  var SB_URL = 'https://jucnlzznbwjthlqqgdlz.supabase.co';
  var SB_CHAVE = 'sb_publishable_N26mrhHO44DyqfD6L28HEQ__uei3fNj'; // chave publicável (feita para o navegador)
  var VERSAO = 'ponte 2026-11-18.1'; // material recebido pela Vivian: versões ativas na aba Empreendimentos (RPC material_versoes_app) · antes: // F1b: carteiraVistoria (RPC vist_carteira, locações administradas sem dado de inquilino) · antes: // F1a: fotos e documentos pelo app (bucket pedidos-anexos, pasta painel/<painel>; vistoria-celular-corretor) · antes: // perfil do lead (função lead-perfil, vivere-ia-perfil-amplo-leads F2) · antes: // CRM F7: metas_equipes no _comum · antes: // CRM F5: ia (função painel-ia: resumo da Vivian e Organizar com IA) · antes: // P2: divulgacao (placa e lazer dos imóveis já cadastrados) · antes: // F3b: eu_corretor e eu_nome no estado (decisão de cadastro novo só dos 3)
  var COMUM = '_comum';
  // Coleções iguais para todos os painéis (pauta, catálogo, fotos, equipe e demandas). O resto é de cada painel.
  var COMUNS = { vitrine: 1, catalogo: 1, galeria: 1, galeria_fotos: 1, fotos: 1, empreendimentos: 1, equipe_cartoes: 1, demandas: 1, demandas_pedidos: 1, metas_equipes: 1 };   // metas_equipes: fatia 7 do CRM (placar das equipes, sem nomes)
  // Aba Gestor (fatia 5, 10/11/2026): a diretoria, no próprio painel, lê os painéis de todos direto do banco, sem foto do dia.
  // O painel.js pede as coleções g_*; a ponte monta cada uma a partir da coleção de origem de todos os painéis,
  // com _dono (o painel) e _id (o id lá) em cada registro. É só leitura: nada é gravado em g_*.
  var GEST = 'g:';
  var GMAPA = { g_leads: 'leads', g_meus: 'meus_imoveis', g_sol: 'solicitacoes', g_eventos: 'eventos_agenciamento', g_decisoes: 'decisoes', g_captados: 'captados', g_tarefas: 'tarefas', g_acaptar: 'acaptar' };
  var GFONTE = {};
  Object.keys(GMAPA).forEach(function (g) { GFONTE[GMAPA[g]] = g; });
  var PAGINA = 1000;
  var CACHE_NOME = 'vivere-painel', CACHE_LOJA = 'comum';

  var sb = window.supabase.createClient(SB_URL, SB_CHAVE, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  var ctx = { uid: null, eu: null, painel: null, ver: false, gestor: false, tempoReal: false, tempoRealG: false, caiu: false, caiuG: false, ultima: 0 };
  var mem = {};       // mem[escopo][colecao][doc] = { v: versão, d: dados, p: gravação minha em curso }
  var pronto = {};    // escopo lido inteiro pelo menos uma vez
  var chegou = {};    // 'escopo/colecao' já lida
  var emCurso = {};   // leitura em andamento por escopo
  var ouvintes = [];

  var clonar = function (o) { return o === undefined ? undefined : (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o))); };
  var nunca = function () { return new Promise(function () { }); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function erro(texto, codigo) { var e = new Error(texto); if (codigo) e.code = codigo; return e; }
  function erroDoBanco(e) {
    var c = e && e.code, m = String((e && e.message) || '');
    if (c === '42501' || /permission|row-level|permiss/i.test(m)) return erro('Você não tem permissão para gravar aqui.', 'invalid_argument');
    if (c === '23514') return erro('O registro ficou grande demais para salvar.');
    if (!c || /fetch|network|Failed|timeout/i.test(m)) return erro('Sem conexão agora.', 'unavailable');
    return erro(m || 'erro desconhecido');
  }
  function paraOInicio() { location.replace('index.html'); return nunca(); }
  function fatal(texto) {
    var el = document.getElementById('conteudo');
    if (el) el.innerHTML = '<div class="vazio">' + esc(texto) + '<br><br><a class="b p" href="index.html">Voltar ao início</a></div>';
    return nunca();
  }

  /* ---------- Entrada: sessão do app, cadastro de acesso e qual painel abrir ---------- */
  var entrou = (async function () {
    var s = await sb.auth.getSession();
    var sessao = s && s.data && s.data.session;
    if (!sessao) return paraOInicio();
    ctx.uid = sessao.user.id;
    var q = await sb.from('acessos').select('email,nome,papel,painel,ativo,corretor_id').eq('user_id', ctx.uid).maybeSingle();
    if (q.error) return fatal('Não deu para conferir o seu acesso agora. Recarregue a página.');
    if (!q.data || !q.data.ativo) return paraOInicio();
    ctx.eu = q.data;
    // Trava do corte (10/11/2026): enquanto o painel da pessoa não for oficial no app, o que há aqui é cópia de teste e só o
    // gestor abre. No corte de cada painel (painel_oficializar) ele passa a abrir para o dono, sem mexer neste arquivo.
    if (ctx.eu.papel !== 'gestor') {
      var of = await sb.rpc('meu_painel_oficial').then(function (r) { return r; }, function () { return { error: true }; });
      if (!of || of.error || of.data !== true) return paraOInicio();
    }
    var diretoria = ctx.eu.papel === 'gestor' || ctx.eu.papel === 'diretor';
    var ver = (new URLSearchParams(location.search).get('ver') || '').trim().toLowerCase();
    if (ver && diretoria && /^[a-z0-9][a-z0-9-]{0,39}$/.test(ver) && ver !== ctx.eu.painel) { ctx.painel = ver; ctx.ver = true; }
    else ctx.painel = ctx.eu.painel;
    if (!ctx.painel) return fatal('O seu painel ainda não foi criado. Fale com a diretoria.');
    ctx.gestor = diretoria && !ctx.ver; // aba Gestor: só no próprio painel de quem é da diretoria
    faixaVer();
    sb.rpc('registrar_uso').then(function () { }, function () { });
    iniciarDados();
    return true;
  })();

  sb.auth.onAuthStateChange(function (evento) {
    if (evento === 'SIGNED_OUT') { limparCache(); location.replace('index.html'); }
  });

  function faixaVer() {
    if (!ctx.ver) return;
    var topo = document.querySelector('header.topo');
    if (!topo || document.getElementById('faixaVer')) return;
    var d = document.createElement('div');
    d.id = 'faixaVer'; d.className = 'faixa-ver';
    d.innerHTML = 'Você está vendo o painel <b>' + esc(ctx.painel) + '</b> como diretoria: os leads são só leitura. <a href="painel.html">Abrir o meu painel</a>';
    topo.insertAdjacentElement('afterend', d);
  }

  /* ---------- Onde fica cada coleção ---------- */
  function escopoDe(colecao) {
    if (ctx.gestor && (GMAPA[colecao] || colecao === 'g_paineis')) return GEST;
    return COMUNS[colecao] ? COMUM : ctx.painel;
  }
  function painelReal(p) { p = String(p || ''); return !!p && p !== COMUM && p.indexOf('u:') !== 0 && p !== GEST; }
  // O registro que o painel enxerga. No painel de quem é da diretoria, config/painel sai com papel "gestor": é o que liga a aba.
  function registro(escopo, colecao, doc) {
    var reg = ((mem[escopo] || {})[colecao] || {})[doc];
    if (escopo === ctx.painel && colecao === 'config' && doc === 'painel') {
      if (ctx.gestor) return { v: reg ? reg.v : 0, d: Object.assign({}, reg ? reg.d : null, { papel: 'gestor' }) };
      if (reg && reg.d && reg.d.papel === 'gestor') { var d = Object.assign({}, reg.d); delete d.papel; return { v: reg.v, d: d }; } // no "ver" e para corretor, sem aba Gestor
    }
    if (escopo === COMUM && colecao === 'empreendimentos' && reg && mv && mv.lista.length) return { v: reg.v, d: comVersoes(reg.d) };
    return reg;
  }
  function alvoDoc(caminho) {
    var p = String(caminho).split('/');
    if (p.length === 4 && p[0] === 'data' && p[1] === 'users') return { escopo: 'u:' + ctx.uid, colecao: p[3], doc: p[3] };
    if (p.length === 2) return { escopo: escopoDe(p[0]), colecao: p[0], doc: p[1] };
    throw erro('caminho não previsto: ' + caminho);
  }
  function gaveta(escopo, colecao) { var e = mem[escopo] || (mem[escopo] = {}); return e[colecao] || (e[colecao] = {}); }

  /* ---------- Guarda local só dos dados comuns (pauta e fotos), para não baixar tudo a cada abertura.
     Leads, imóveis com proprietário e tarefas nunca ficam guardados no aparelho. ---------- */
  function abrirCache() {
    return new Promise(function (ok) {
      try {
        var r = indexedDB.open(CACHE_NOME, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore(CACHE_LOJA); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { ok(null); };
        r.onblocked = function () { ok(null); };
      } catch (e) { ok(null); }
    });
  }
  async function lerCache() {
    var b = await abrirCache(); if (!b) return;
    await new Promise(function (ok) {
      try {
        var tx = b.transaction(CACHE_LOJA, 'readonly'), cur = tx.objectStore(CACHE_LOJA).openCursor();
        cur.onsuccess = function (ev) {
          var c = ev.target.result; if (!c) return;
          var k = String(c.key), i = k.indexOf('|'), val = c.value;
          if (i > 0 && val && typeof val.v === 'number' && val.d && typeof val.d === 'object') gaveta(COMUM, k.slice(0, i))[k.slice(i + 1)] = { v: val.v, d: val.d };
          c.continue();
        };
        tx.oncomplete = ok; tx.onerror = ok; tx.onabort = ok;
      } catch (e) { ok(); }
    });
    try { b.close(); } catch (e) { }
  }
  async function gravarCache(colecao, linhas, apagar) {
    var b = await abrirCache(); if (!b) return;
    try {
      var loja = b.transaction(CACHE_LOJA, 'readwrite').objectStore(CACHE_LOJA);
      (linhas || []).forEach(function (l) { loja.put({ v: l.versao, d: l.dados }, colecao + '|' + l.doc_id); });
      (apagar || []).forEach(function (id) { loja.delete(colecao + '|' + id); });
    } catch (e) { }
    try { b.close(); } catch (e) { }
  }
  function limparCache() { try { indexedDB.deleteDatabase(CACHE_NOME); } catch (e) { } }

  /* ---------- Leitura: primeiro o índice (pequeno), depois só o que mudou ---------- */
  async function paginas(montar) {
    var tudo = [], de = 0;
    for (; ;) {
      var r = await montar().range(de, de + PAGINA - 1);
      if (r.error) throw r.error;
      tudo = tudo.concat(r.data || []);
      if (!r.data || r.data.length < PAGINA) return tudo;
      de += PAGINA;
    }
  }
  function sincronizar(escopo) {
    if (emCurso[escopo]) return emCurso[escopo];
    emCurso[escopo] = (escopo === GEST ? sincronizarGestor() : sincronizarAgora(escopo)).then(function () { delete emCurso[escopo]; }, function (e) { delete emCurso[escopo]; throw e; });
    return emCurso[escopo];
  }
  async function sincronizarAgora(escopo) {
    var primeira = !pronto[escopo];
    if (primeira && escopo === COMUM) await lerCache();
    var inicio = Date.now(); // o que chegar pelo tempo real ou for gravado nesta tela depois daqui não está neste índice
    var indice = await paginas(function () { return sb.from('painel_docs').select('colecao,doc_id,versao').eq('painel', escopo).order('colecao').order('doc_id'); });
    var m = mem[escopo] || (mem[escopo] = {}), vivos = {}, falta = {}, mudou = {};
    indice.forEach(function (x) {
      (vivos[x.colecao] || (vivos[x.colecao] = {}))[x.doc_id] = 1;
      var a = m[x.colecao] && m[x.colecao][x.doc_id];
      if (!a || (a.v !== x.versao && !a.p)) (falta[x.colecao] || (falta[x.colecao] = [])).push(x.doc_id);
    });
    if (primeira) Object.keys(vivos).forEach(function (col) { if (!falta[col]) { chegou[escopo + '/' + col] = true; avisar(escopo, col); } });
    Object.keys(m).forEach(function (col) {
      var saiu = Object.keys(m[col]).filter(function (id) { return !(vivos[col] && vivos[col][id]) && !m[col][id].p && !(m[col][id].t >= inicio); });
      if (!saiu.length) return;
      saiu.forEach(function (id) { delete m[col][id]; });
      mudou[col] = 1;
      if (escopo === COMUM) gravarCache(col, null, saiu);
    });
    await Promise.all(Object.keys(falta).map(async function (col) {
      var ids = falta[col], total = Object.keys(vivos[col]).length, linhas = [];
      var base = function () { return sb.from('painel_docs').select('doc_id,dados,versao').eq('painel', escopo).eq('colecao', col); };
      if (ids.length > 60 || ids.length * 2 > total) linhas = await paginas(function () { return base().order('doc_id'); });
      else { var r = await base().in('doc_id', ids); if (r.error) throw r.error; linhas = r.data || []; }
      var c = gaveta(escopo, col);
      linhas.forEach(function (l) { var a = c[l.doc_id]; if (!a || (!a.p && a.v < l.versao)) c[l.doc_id] = { v: l.versao, d: l.dados }; });
      if (escopo === COMUM) gravarCache(col, linhas);
      chegou[escopo + '/' + col] = true;
      if (primeira) avisar(escopo, col); else mudou[col] = 1;
    }));
    pronto[escopo] = true; ctx.ultima = Date.now();
    if (escopo === COMUM) { await lerVersoes(); assinarMaterial(); }
    if (primeira) ouvintes.forEach(function (o) { if (o.escopo === escopo && !o.disparado) disparar(o); });
    else Object.keys(mudou).forEach(function (col) { avisar(escopo, col); });
  }

  /* ---------- Aba Gestor: os painéis de todos, lidos direto (índice primeiro, depois só o que mudou) ---------- */
  var gPerdeu = false, gLendo = false, gFila = {}, gFilaEm = null;
  function avisarG(g) {
    gFila[g] = 1;
    if (gFilaEm) return;
    gFilaEm = setTimeout(function () { var q = Object.keys(gFila); gFila = {}; gFilaEm = null; q.forEach(function (x) { avisar(GEST, x); }); }, 250);
  }
  function semHora(d) { return JSON.stringify(Object.assign({}, d, { foto_em: '' })); }
  function agoraLocal() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); }
  function comDono(dados, painel, doc) { return Object.assign({}, dados, { _dono: painel, _id: doc }); }
  function deTodos(q) { return q.neq('painel', COMUM).not('painel', 'like', 'u:%'); }
  // Uso do app (fatia 5 L): dias com acesso nos últimos 7 e o último acesso, por painel. Só o gestor lê a app_uso; erro ou outro papel = sem a coluna.
  async function lerUso() {
    if (!ctx.eu || ctx.eu.papel !== 'gestor') return null;
    try {
      var d0 = new Date(); d0.setDate(d0.getDate() - 6);
      var desde = new Date(d0.getTime() - d0.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
      var limite = new Promise(function (ok) { setTimeout(function () { ok(null); }, 5000); }); // demora: segue sem a coluna
      var rs = await Promise.race([Promise.all([sb.from('acessos').select('user_id,painel').eq('ativo', true), sb.from('app_uso').select('user_id,dia,ultima').gte('dia', desde)]), limite]);
      if (!rs) return null;
      var ra = rs[0], ru = rs[1];
      if (ra.error || ru.error) return null;
      var dono = {}, uso = {};
      (ra.data || []).forEach(function (a) { if (a.user_id && a.painel) dono[a.user_id] = a.painel; });
      (ru.data || []).forEach(function (u) {
        var p = dono[u.user_id]; if (!p) return;
        var x = uso[p] || (uso[p] = { dias: {}, ultima: '' });
        x.dias[u.dia] = 1;
        if (u.ultima) { var t = new Date(u.ultima); var l = new Date(t.getTime() - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); if (l > x.ultima) x.ultima = l; }
      });
      return uso;
    } catch (e) { return null; }
  }
  function listaPaineis(infos, uso) {
    var nomes = {}, curtos = {}, vez = {}, saida = {}, quando = agoraLocal();
    infos.forEach(function (l) {
      if (!painelReal(l.painel)) return;
      var i = l.dados || {}, nome = String(i.corretor || i.saudacao || l.painel).trim() || l.painel;
      nomes[l.painel] = { nome: nome, info: i };
      var c = String(i.curto || nome.split(' ')[0]).trim();
      curtos[l.painel] = c; vez[c] = (vez[c] || 0) + 1;
    });
    Object.keys(nomes).forEach(function (p) {
      var n = nomes[p], c = curtos[p], partes = n.nome.split(' ');
      // dois painéis com o mesmo primeiro nome: o rótulo curto leva também o segundo nome ("Fernanda Carvalho")
      if (vez[c] > 1 && !n.info.curto) c = partes.slice(0, 2).join(' ');
      var d = { nome: n.nome, curto: c, foto_em: quando };
      if (typeof n.info.ordem === 'number') d.ordem = n.info.ordem;
      if (n.info.genero) d.genero = n.info.genero;
      if (uso) { var u = uso[p]; d.uso_dias = u ? Object.keys(u.dias).length : 0; if (u && u.ultima) d.uso_ultima = u.ultima; }
      if (p !== ctx.painel) d.url = 'painel.html?ver=' + encodeURIComponent(p); // a diretoria abre o painel do corretor pelo "ver"
      saida[p] = d;
    });
    return saida;
  }
  function sincronizarGestor() {
    gLendo = true;
    return lerGestor().then(function () { gLendo = false; depoisDeLer(); }, function (e) { gLendo = false; throw e; });
  }
  // Mudança que chegou no meio de uma leitura: lê de novo logo depois, para nada ficar para trás.
  function depoisDeLer() { if (!gPerdeu) return; gPerdeu = false; setTimeout(function () { sincronizar(GEST).catch(function () { }); }, 2000); }
  async function lerGestor() {
    var primeira = !pronto[GEST], fontes = Object.keys(GFONTE), m = mem[GEST] || (mem[GEST] = {}), mudou = {};
    var r0 = await deTodos(sb.from('painel_docs').select('painel,dados').eq('colecao', 'controle').eq('doc_id', 'info'));
    if (r0.error) throw r0.error;
    var indice = await paginas(function () { return deTodos(sb.from('painel_docs').select('painel,colecao,doc_id,versao').in('colecao', fontes)).order('painel').order('colecao').order('doc_id'); });
    var vivos = {}, falta = {}, total = {};
    indice.forEach(function (x) {
      var g = GFONTE[x.colecao]; if (!g || !painelReal(x.painel)) return;
      var id = x.painel + '__' + x.doc_id;
      (vivos[g] || (vivos[g] = {}))[id] = 1; total[g] = (total[g] || 0) + 1;
      var a = m[g] && m[g][id];
      if (!a || a.v !== x.versao) (falta[g] || (falta[g] = [])).push(x.doc_id);
    });
    Object.keys(GMAPA).forEach(function (g) {
      var c = m[g] || (m[g] = {});
      Object.keys(c).forEach(function (id) { if (!(vivos[g] && vivos[g][id])) { delete c[id]; mudou[g] = 1; } });
    });
    await Promise.all(Object.keys(falta).map(async function (g) {
      var col = GMAPA[g], ids = falta[g].filter(function (v, i, a) { return a.indexOf(v) === i; }), linhas;
      var base = function () { return deTodos(sb.from('painel_docs').select('painel,doc_id,dados,versao').eq('colecao', col)); };
      if (ids.length > 60 || falta[g].length * 2 > total[g]) linhas = await paginas(function () { return base().order('painel').order('doc_id'); });
      else linhas = await paginas(function () { return base().in('doc_id', ids).order('painel').order('doc_id'); });
      var c = m[g];
      linhas.forEach(function (l) {
        if (!painelReal(l.painel)) return;
        var id = l.painel + '__' + l.doc_id, a = c[id];
        if (!a || a.v < l.versao) { c[id] = { v: l.versao, d: comDono(l.dados, l.painel, l.doc_id) }; mudou[g] = 1; }
      });
    }));
    var lp = listaPaineis(r0.data || [], await lerUso()), cp = m.g_paineis || (m.g_paineis = {});
    var mudouLista = false;
    Object.keys(cp).forEach(function (p) { if (!lp[p]) { delete cp[p]; mudouLista = true; } });
    Object.keys(lp).forEach(function (p) {
      var a = cp[p];
      if (!a || semHora(a.d) !== semHora(lp[p])) mudouLista = true;
      cp[p] = { v: (a ? a.v : 0) + 1, d: lp[p] };
    });
    if (mudouLista || Object.keys(mudou).length) mudou.g_paineis = 1;
    pronto[GEST] = true;
    Object.keys(GMAPA).concat(['g_paineis']).forEach(function (g) { chegou[GEST + '/' + g] = true; });
    (primeira ? Object.keys(GMAPA).concat(['g_paineis']) : Object.keys(mudou)).forEach(function (g) { avisar(GEST, g); });
  }
  // Mudança que chega na hora (tempo real) ou gravação feita nesta tela: entra na visão do gestor sem esperar a releitura.
  function espelharGestor(painel, colecao, doc, versao, dados) {
    var g = GFONTE[colecao];
    if (!ctx.gestor || !g || !painelReal(painel)) return;
    if (gLendo) gPerdeu = true;
    if (!pronto[GEST]) return;
    var c = gaveta(GEST, g), id = painel + '__' + doc, a = c[id];
    if (a && a.v >= versao) return;
    c[id] = { v: versao, d: comDono(dados, painel, doc) };
    var p = (mem[GEST].g_paineis || {})[painel];
    if (p) { p.d = Object.assign({}, p.d, { foto_em: agoraLocal() }); p.v++; avisarG('g_paineis'); }
    avisarG(g);
  }
  function mudancaGestor(p) {
    var n = p && p.new;
    if (!n || !n.colecao || !n.doc_id || typeof n.versao !== 'number' || !painelReal(n.painel)) return;
    if (!n.dados || typeof n.dados !== 'object') { sincronizar(GEST).catch(function () { }); return; }
    espelharGestor(n.painel, n.colecao, n.doc_id, n.versao, n.dados);
  }
  function apagamentoGestor(o) {
    var g = GFONTE[o.colecao];
    if (!ctx.gestor || !g || !painelReal(o.painel)) return;
    if (gLendo) gPerdeu = true;
    var c = (mem[GEST] || {})[g], id = o.painel + '__' + o.doc_id;
    if (!c || !c[id]) return;
    delete c[id];
    avisarG(g);
  }

  function escopos() { return [ctx.painel, 'u:' + ctx.uid, COMUM].concat(ctx.gestor ? [GEST] : []); }
  // Releitura do índice de tudo o que a tela usa. Com o tempo real ligado ela roda a cada VARRE (4 min), só para tirar
  // da tela o que uma rotina apagou; sem ele, a cada 2 min.
  var VARRE = 240000;
  function ressincronizar() { ctx.varreu = Date.now(); escopos().forEach(function (e) { sincronizar(e).catch(function () { }); }); }

  // Primeira leitura: tenta de novo sozinha (3 s, 8 s, 20 s) antes de avisar que a conexão caiu.
  function primeiraLeitura(e, n) {
    sincronizar(e).catch(function (er) {
      if (n < 3) { setTimeout(function () { primeiraLeitura(e, n + 1); }, [3000, 8000, 20000][n]); return; }
      ouvintes.forEach(function (o) { if (o.escopo === e && o.err && !o.disparado) { try { o.err(erroDoBanco(er)); } catch (x) { } } });
      if (e === ctx.painel && !pronto[e]) fatal('Não deu para carregar os seus dados agora. Confira a internet e recarregue a página.');
    });
  }
  function iniciarDados() {
    escopos().forEach(function (e) { primeiraLeitura(e, 0); });
    ligarTempoReal();
    document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - ctx.ultima > 45000) ressincronizar(); if (!document.hidden) renovarMaterial(); });
    setInterval(function () { if (!document.hidden) renovarMaterial(); }, 600000);
    window.addEventListener('online', ressincronizar);
    ctx.varreu = Date.now();
    setInterval(function () {
      if (document.hidden) return;
      if (!ctx.tempoReal) ressincronizar();
      else if (ctx.gestor && !ctx.tempoRealG) sincronizar(GEST).catch(function () { });
    }, 120000);
    // Com o tempo real ligado: conferido a cada 30 s, para a espera não passar de ~4 min e meio.
    setInterval(function () { if (!document.hidden && ctx.tempoReal && Date.now() - ctx.varreu >= VARRE) ressincronizar(); }, 30000);
  }

  /* ---------- Tempo real: as mudanças chegam na hora; se a ligação cair, a releitura acima cobre ---------- */
  function ligarTempoReal() {
    try {
      var canal = sb.channel('painel-' + ctx.painel);
      escopos().forEach(function (e) {
        if (e === GEST) return;
        canal.on('postgres_changes', { event: '*', schema: 'public', table: 'painel_docs', filter: 'painel=eq.' + e }, function (p) { aplicarMudanca(e, p); });
      });
      // Apagamento: o banco não manda mais esse aviso (ele não passava pelas regras de acesso e entregava a chave do
      // registro apagado a qualquer pessoa logada). O que foi apagado sai da tela pela releitura do índice (VARRE).
      canal.subscribe(function (status) {
        var ok = status === 'SUBSCRIBED';
        if (ok && ctx.caiu) { ctx.caiu = false; ressincronizar(); }
        if (!ok) ctx.caiu = true;
        ctx.tempoReal = ok;
      });
    } catch (e) { ctx.tempoReal = false; }
    if (!ctx.gestor) return;
    try { // aba Gestor: o que muda nas coleções de origem de qualquer painel, em canal próprio (se falhar, o do painel segue)
      var filtroG = 'colecao=in.(' + Object.keys(GFONTE).join(',') + ')';
      var canalG = sb.channel('gestor-' + ctx.painel);
      canalG.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'painel_docs', filter: filtroG }, mudancaGestor);
      canalG.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'painel_docs', filter: filtroG }, mudancaGestor);
      canalG.subscribe(function (status) {
        var ok = status === 'SUBSCRIBED';
        if (ok && ctx.caiuG) { ctx.caiuG = false; sincronizar(GEST).catch(function () { }); }
        if (!ok) ctx.caiuG = true;
        ctx.tempoRealG = ok;
      });
    } catch (e) { ctx.tempoRealG = false; }
  }
  var relerEm = null;
  function relerLogo() { if (relerEm) return; relerEm = setTimeout(function () { relerEm = null; ressincronizar(); }, 2000); }
  // Sem uso desde a ponte 2026-11-10.4 (a publicação não manda mais DELETE); fica para o caso de o aviso voltar.
  function aplicarApagamento(p) {
    var o = p && p.old;
    if (!o || !o.painel || !o.colecao || !o.doc_id) { relerLogo(); return; } // sem a chave: a releitura pelo índice tira o que saiu
    apagamentoGestor(o);
    if (escopos().indexOf(o.painel) < 0) return; // apagamento em painel que não é o desta tela
    var c = (mem[o.painel] || {})[o.colecao], a = c && c[o.doc_id];
    if (!a || a.p) return;
    delete c[o.doc_id];
    if (o.painel === COMUM) gravarCache(o.colecao, null, [o.doc_id]);
    avisar(o.painel, o.colecao);
  }
  function aplicarMudanca(escopo, p) {
    if (p && p.eventType === 'DELETE') { aplicarApagamento(p); return; }
    var n = p && p.new;
    if (!n || !n.colecao || !n.doc_id || typeof n.versao !== 'number') return;
    var c = gaveta(escopo, n.colecao), a = c[n.doc_id];
    if (a && a.p) { a.eco = n; return; } // gravação em curso: guarda o eco; gravarDoc usa se a versão bater (etiqueta de autoria, 10/11/2026)
    if (a && a.v > n.versao) return; // versão igual também entra: traz o que o banco acrescentou na gravação (etiqueta de autoria)
    if (!n.dados || typeof n.dados !== 'object') { sincronizar(escopo).catch(function () { }); return; }
    c[n.doc_id] = { v: n.versao, d: n.dados, t: Date.now() };
    if (escopo === COMUM) gravarCache(n.colecao, [n]);
    avisar(escopo, n.colecao);
    if (escopo === COMUM && n.colecao === 'empreendimentos') assinarMaterial();
  }

  /* ---------- Material recebido pela Vivian (tarefa vis-vivian-material-empreendimentos, 18/11/2026): versões ativas de
     public.material_versoes, lidas pela RPC material_versoes_app (só status ativo, só com acesso ativo), a cada leitura do
     _comum (abertura e releitura de ~4 min). Mesma regra da Vivian (juntarVersoes em material.js): a versão ativa entra
     no material da ficha com "versão de dd/mm"; tabela de preços, memorial e book com versão ativa tiram da ficha o
     material antigo do mesmo tipo; plantas e imagens se somam (as substituídas já saem arquivadas do banco). Os arquivos
     ficam no mesmo depósito 'material' (emp/<id>) e abrem pelo mesmo link assinado. Falhou a leitura: fica a lista anterior. ---------- */
  var MV_UNICOS = { tabela_precos: 1, memorial: 1, book: 1 };
  var mv = { lista: [], chave: '' };
  function diaMes(iso) { var t = Date.parse(iso || ''); if (!t) return ''; var d = new Date(t - 3 * 3600000); return ('0' + d.getUTCDate()).slice(-2) + '/' + ('0' + (d.getUTCMonth() + 1)).slice(-2); }
  async function lerVersoes() {
    var r;
    try { r = await Promise.race([sb.rpc('material_versoes_app'), new Promise(function (ok) { setTimeout(function () { ok(null); }, 5000); })]); } catch (e) { return; } // travou 5 s: segue sem esperar (crítico 18/11)
    if (!r || r.error || !Array.isArray(r.data)) return;
    var lista = r.data.filter(function (v) { return v && v.emp_slug && /^[0-9a-f]{32}$/.test(String(v.a || '')); });
    var chave = JSON.stringify(lista.map(function (v) { return [v.id, v.a, v.ativado_em, v.titulo, v.grupo]; }));
    if (chave === mv.chave) return;
    mv.lista = lista; mv.chave = chave;
    avisar(COMUM, 'empreendimentos');
  }
  function comVersoes(dados) {
    if (!dados || !Array.isArray(dados.itens)) return dados;
    var por = {};
    mv.lista.forEach(function (v) { (por[v.emp_slug] || (por[v.emp_slug] = [])).push(v); });
    var mexeu = false, itens = dados.itens.map(function (e) {
      var vs = e && por[e.id];
      if (!vs) return e;
      mexeu = true;
      var unicos = {};
      vs.forEach(function (v) { if (MV_UNICOS[v.tipo]) unicos[v.tipo] = 1; });
      var mat = (Array.isArray(e.material) ? e.material : []).filter(function (m) { return !(m && !m.versao && unicos[m.tipo]); });
      vs.forEach(function (v) {
        var dm = diaMes(v.ativado_em), tit = String(v.titulo || '').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Material';
        mat.push({ a: v.a, ct: String(v.ct || ''), tipo: v.tipo, grupo: v.grupo || '', titulo: dm ? tit + ' (versão de ' + dm + ')' : tit, versao: true, versao_de: dm });
      });
      return Object.assign({}, e, { material: mat });
    });
    return mexeu ? Object.assign({}, dados, { itens: itens }) : dados;
  }

  /* ---------- Material dos empreendimentos (tabela, plantas, book, imagens): os arquivos ficam no Storage, em bucket
     privado, e abrem por link assinado, criado só para quem está logado e com acesso ativo. O link vale 6 horas e é
     renovado sozinho depois de 5. As imagens têm miniatura (pasta min/, mesmo id): a grade mostra a miniatura e o
     clique abre o arquivo cheio; imagem sem miniatura aparece pelo arquivo cheio. ---------- */
  var MAT_BALDE = 'material', MAT_PASTA = 'emp/', MIN_PASTA = 'min/', MAT_VALE = 6 * 3600, MAT_RENOVA = 5 * 3600 * 1000;
  var mat = { url: {}, falhou: {}, min: {}, semMin: {}, em: 0, pedindo: null, tent: 0 };
  function idsMaterial(soImagens) {
    var ids = {}, docs = (mem[COMUM] || {}).empreendimentos || {};
    Object.keys(docs).forEach(function (k) {
      var r = registro(COMUM, 'empreendimentos', k), itens = r && r.d && r.d.itens;
      if (!Array.isArray(itens)) return;
      itens.forEach(function (e) {
        (e && Array.isArray(e.material) ? e.material : []).forEach(function (m) {
          if (m && /^[0-9a-f]{32}$/.test(String(m.a || '')) && (!soImagens || /^image\//.test(String(m.ct || '')))) ids[m.a] = 1;
        });
      });
    });
    return Object.keys(ids);
  }
  function assinarMaterial() {
    if (mat.pedindo) return mat.pedindo;
    var velho = !!mat.em && Date.now() - mat.em > MAT_RENOVA;
    var caminhos = idsMaterial().filter(function (a) { return velho || (!mat.url[a] && !mat.falhou[a]); }).map(function (a) { return MAT_PASTA + a; })
      .concat(idsMaterial(true).filter(function (a) { return velho || (!mat.min[a] && !mat.semMin[a]); }).map(function (a) { return MIN_PASTA + a; }));
    if (!caminhos.length) return Promise.resolve();
    mat.pedindo = (async function () {
      var novo = {}, falhou = {}, min = {}, semMin = {}, i, r;
      for (i = 0; i < caminhos.length; i += 200) {
        var bloco = caminhos.slice(i, i + 200);
        r = await sb.storage.from(MAT_BALDE).createSignedUrls(bloco, MAT_VALE);
        if (r.error) throw r.error;
        (r.data || []).forEach(function (x, k) {
          // sem o caminho na resposta (pode acontecer no item com erro), vale o que foi pedido naquela posição
          var p = x && x.path ? String(x.path) : (x && bloco[k]) || '', ehMin = p.indexOf(MIN_PASTA) === 0;
          if (!ehMin && p.indexOf(MAT_PASTA) !== 0) return;
          var a = p.slice(ehMin ? MIN_PASTA.length : MAT_PASTA.length), ok = !!x.path && !!x.signedUrl && !x.error;
          if (!a) return;
          if (ehMin) { if (ok) min[a] = x.signedUrl; else semMin[a] = 1; }
          else if (ok) novo[a] = x.signedUrl; else falhou[a] = 1;
        });
      }
      if (velho) { mat.url = {}; mat.falhou = {}; mat.min = {}; mat.semMin = {}; }
      Object.keys(novo).forEach(function (a) { mat.url[a] = novo[a]; });
      Object.keys(falhou).forEach(function (a) { mat.falhou[a] = 1; });
      Object.keys(min).forEach(function (a) { mat.min[a] = min[a]; });
      Object.keys(semMin).forEach(function (a) { mat.semMin[a] = 1; });
      if (velho || !mat.em) mat.em = Date.now();
      if (Object.keys(novo).length || Object.keys(min).length) avisar(COMUM, 'empreendimentos');
    })().then(function () { mat.pedindo = null; mat.tent = 0; }, function () {
      mat.pedindo = null; // falhou antes de haver link nenhum: tenta de novo em 1 minuto, até 3 vezes
      if (!mat.em && mat.tent < 3) { mat.tent++; setTimeout(assinarMaterial, 60000); }
    });
    return mat.pedindo;
  }
  function renovarMaterial() { if (mat.em && Date.now() - mat.em > MAT_RENOVA) assinarMaterial(); }
  function arquivoMaterial(a) { return mat.url[String(a || '')] || ''; }
  function miniaturaMaterial(a) { return mat.min[String(a || '')] || ''; }

  /* ---------- Fotos e documentos enviados pelo app (F1a, 17/11/2026, vistoria-celular-corretor) ----------
     O painel.js é o mesmo do claude.ai: guarda {id, nome, tam} e mostra cada arquivo por '/_blob/<id>'. Aqui o arquivo vai
     para o bucket privado pedidos-anexos, em painel/<painel>/<id de 32 hex> (regras do banco: cada um grava só no próprio
     painel; lê o próprio, e a diretoria lê todos), fica registrado em painel_anexos (o robô das fichas leva ao Drive as
     fotos, o lazer, a placa e os documentos do cadastro enviado) e aparece na tela por link assinado de 6 horas, renovado
     depois de 5: a ponte troca na hora todo src/href '/_blob/<id>' que o painel desenhar. Arquivo antigo, enviado pelo
     claude.ai, não existe aqui: a foto mostra o aviso 'foto não disponível no app'. ---------- */
  var ANX_BALDE = 'pedidos-anexos', ANX_VALE = 6 * 3600, ANX_RENOVA = 5 * 3600 * 1000, ANX_MAX = 16 * 1024 * 1024;
  var ANX_TIPOS = /^(image\/(jpeg|png|webp|heic)|application\/pdf)$/;
  var VAZIO = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  var SEM_FOTO = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" fill="#eef1f4"/><text x="80" y="58" font-family="sans-serif" font-size="12" fill="#6b7785" text-anchor="middle">foto não</text><text x="80" y="74" font-family="sans-serif" font-size="12" fill="#6b7785" text-anchor="middle">disponível no app</text></svg>');
  var anx = { url: {}, em: {}, falta: {}, pedir: {}, timer: null, tent: 0 };
  function novoIdArquivo() {
    var b = new Uint8Array(16); crypto.getRandomValues(b);
    return Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  function erroDoEnvio(e) {
    var m = String((e && (e.message || e.error)) || ''), st = Number(e && (e.statusCode || e.status));
    if (/mime|type/i.test(m) && /not supported|invalid|allowed/i.test(m)) return erro('Tipo de arquivo não aceito: envie foto (JPG, PNG, WEBP, HEIC) ou PDF.');
    if (st === 413 || /too large|exceeded|maximum/i.test(m)) return erro('Arquivo acima de 16 MB.');
    if (st === 403 || /row-level|policy|unauthori|permiss/i.test(m)) return erro('Você não tem permissão para enviar arquivos neste painel.');
    if (!st || /fetch|network|Failed|timeout/i.test(m)) return erro('Sem conexão agora.');
    return erro(m || 'erro no envio');
  }
  async function enviarArquivo(blob, op) {
    await entrou;
    if (ctx.ver) throw erro('Visão de outro painel: só leitura.');
    if (!blob || !blob.size) throw erro('Arquivo vazio.');
    // erros sem código de propósito: o painel.js (enviarArquivos) mostra e.code no lugar da mensagem quando há código
    var tipo = String((op && op.type) || blob.type || '').toLowerCase();
    if (tipo === 'image/jpg') tipo = 'image/jpeg';
    if (!ANX_TIPOS.test(tipo)) throw erro('Tipo de arquivo não aceito: envie foto (JPG, PNG, WEBP, HEIC) ou PDF.');
    if (blob.size > ANX_MAX) throw erro('Arquivo acima de 16 MB.');
    var id = novoIdArquivo(), caminho = 'painel/' + ctx.painel + '/' + id, r;
    try { r = await sb.storage.from(ANX_BALDE).upload(caminho, blob, { contentType: tipo, upsert: false, cacheControl: '3600' }); }
    catch (e) { throw erroDoEnvio(e); }
    if (r.error) throw erroDoEnvio(r.error);
    var g;
    try { g = await sb.rpc('painel_anexo_registrar', { p_id: id }); } catch (e) { g = { error: e }; }
    if (g.error) throw erro(erroDoBanco(g.error).message); // sem código: o painel mostra a mensagem
    return { id: id, sizeBytes: blob.size };
  }
  function linkVivo(id) { return anx.url[id] && Date.now() - (anx.em[id] || 0) < ANX_RENOVA ? anx.url[id] : ''; }
  function pintarArquivo(el, id) {
    var url = linkVivo(id), img = el.tagName === 'IMG';
    if (url) { if (img) { if (el.getAttribute('src') !== url) el.setAttribute('src', url); } else if (el.getAttribute('href') !== url) el.setAttribute('href', url); return; }
    if (anx.falta[id]) { if (img) el.setAttribute('src', SEM_FOTO); else { el.removeAttribute('href'); el.title = 'Arquivo não disponível no app'; } return; }
    if (img) el.setAttribute('src', VAZIO); else el.setAttribute('href', '#');
  }
  function trocarBlob(el) {
    var attr = el.tagName === 'IMG' ? 'src' : 'href', m = /^\/_blob\/([0-9a-f]{32})$/.exec(el.getAttribute(attr) || '');
    if (!m) return;
    var id = m[1];
    el.setAttribute('data-arq', id);
    pintarArquivo(el, id);
    if (!linkVivo(id) && !anx.falta[id]) { anx.pedir[id] = 1; if (!anx.timer) anx.timer = setTimeout(pedirLinks, 40); }
  }
  function varrerBlobs(raiz) {
    if (!raiz || raiz.nodeType !== 1) return;
    if (raiz.matches && raiz.matches('img[src^="/_blob/"],a[href^="/_blob/"]')) trocarBlob(raiz);
    if (raiz.querySelectorAll) Array.prototype.forEach.call(raiz.querySelectorAll('img[src^="/_blob/"],a[href^="/_blob/"]'), trocarBlob);
  }
  function repintar(ids) {
    ids.forEach(function (id) { Array.prototype.forEach.call(document.querySelectorAll('[data-arq="' + id + '"]'), function (el) { pintarArquivo(el, id); }); });
  }
  async function pedirLinks() {
    anx.timer = null;
    var ids = Object.keys(anx.pedir); anx.pedir = {};
    if (!ids.length) return;
    try {
      await entrou;
      for (var i = 0; i < ids.length; i += 200) {
        var bloco = ids.slice(i, i + 200), c = await sb.rpc('painel_anexo_caminhos', { p_ids: bloco });
        if (c.error) throw c.error;
        var cam = {};
        (c.data || []).forEach(function (x) { if (x && x.id && x.caminho) cam[x.id] = x.caminho; });
        var lista = bloco.filter(function (id) { return cam[id]; }).map(function (id) { return cam[id]; });
        if (lista.length) {
          var s = await sb.storage.from(ANX_BALDE).createSignedUrls(lista, ANX_VALE);
          if (s.error) throw s.error;
          (s.data || []).forEach(function (x, k) {
            var p = String((x && x.path) || lista[k] || ''), id = p.split('/').pop();
            if (x && x.signedUrl && !x.error) { anx.url[id] = x.signedUrl; anx.em[id] = Date.now(); }
          });
        }
        bloco.forEach(function (id) { if (!linkVivo(id)) anx.falta[id] = 1; });
        repintar(bloco);
      }
      anx.tent = 0;
    } catch (e) {
      ids.forEach(function (id) { anx.pedir[id] = 1; }); // sem conexão ou recusa passageira: tenta de novo em 1 minuto, até 3 vezes
      if (anx.tent < 3) { anx.tent++; anx.timer = setTimeout(pedirLinks, 60000); }
    }
  }
  function vigiarBlobs() {
    if (!document.body || typeof MutationObserver !== 'function') return;
    new MutationObserver(function (lista) {
      lista.forEach(function (m) {
        if (m.type === 'attributes') varrerBlobs(m.target);
        else Array.prototype.forEach.call(m.addedNodes || [], varrerBlobs);
      });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href'] });
    varrerBlobs(document.body);
    // link vencendo: renova o que está na tela (a cada 30 min confere)
    setInterval(function () {
      var vencendo = {};
      Array.prototype.forEach.call(document.querySelectorAll('[data-arq]'), function (el) { var id = el.getAttribute('data-arq'); if (anx.url[id] && !linkVivo(id)) vencendo[id] = 1; });
      Object.keys(vencendo).forEach(function (id) { anx.pedir[id] = 1; });
      if (Object.keys(vencendo).length && !anx.timer) anx.timer = setTimeout(pedirLinks, 40);
    }, 30 * 60 * 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigiarBlobs); else vigiarBlobs();

  /* ---------- Avisos ao painel (o "onSnapshot" do banco dos artefatos) ---------- */
  function fotoDoc(id, reg) { return { id: id, exists: !!reg, data: function () { return reg ? clonar(reg.d) : undefined; } }; }
  function disparar(o) {
    o.disparado = true;
    try {
      var c = (mem[o.escopo] || {})[o.colecao] || {};
      if (o.doc != null) o.cb(fotoDoc(o.doc, registro(o.escopo, o.colecao, o.doc)));
      else {
        var docs = Object.keys(c).sort().map(function (id) { return fotoDoc(id, registro(o.escopo, o.colecao, id)); });
        o.cb({ docs: docs, size: docs.length, empty: !docs.length, forEach: function (f) { docs.forEach(f); } });
      }
    } catch (e) { setTimeout(function () { throw e; }); }
  }
  function avisar(escopo, colecao) { ouvintes.forEach(function (o) { if (o.escopo === escopo && o.colecao === colecao) disparar(o); }); }
  function assinar(escopo, colecao, doc, cb, err) {
    var o = { escopo: escopo, colecao: colecao, doc: doc, cb: cb, err: err, disparado: false };
    ouvintes.push(o);
    if (pronto[escopo] || chegou[escopo + '/' + colecao]) setTimeout(function () { if (!o.disparado) disparar(o); }, 0);
    return function () { var i = ouvintes.indexOf(o); if (i >= 0) ouvintes.splice(i, 1); };
  }

  /* ---------- Gravação: aparece na tela na hora e volta atrás se o banco recusar ---------- */
  async function gravarDoc(escopo, colecao, doc, dados, mesclar) {
    if (escopo === GEST) throw erro('A visão do gestor é só leitura. Abra o painel do corretor para alterar.', 'invalid_argument');
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw erro('Dados inválidos.');
    var limpo = JSON.parse(JSON.stringify(dados));
    var c = gaveta(escopo, colecao), antes = c[doc];
    if (mesclar && !antes) throw erro('Este registro não existe mais. Recarregue a página.');
    c[doc] = { v: antes ? antes.v : 0, d: mesclar ? Object.assign({}, antes.d, limpo) : limpo, p: true };
    avisar(escopo, colecao);
    var r;
    try { r = await sb.rpc('painel_gravar', { p_painel: escopo, p_colecao: colecao, p_doc: String(doc), p_dados: limpo, p_mesclar: !!mesclar }); }
    catch (e) { r = { error: e }; }
    if (r.error) {
      if (antes) c[doc] = antes; else delete c[doc];
      avisar(escopo, colecao);
      throw erroDoBanco(r.error);
    }
    if (c[doc]) { c[doc].v = typeof r.data === 'number' ? r.data : c[doc].v + 1; delete c[doc].p; c[doc].t = Date.now(); }
    if (c[doc] && c[doc].eco) { var eco = c[doc].eco; delete c[doc].eco; if (eco.versao === c[doc].v && eco.dados && typeof eco.dados === 'object') { c[doc].d = eco.dados; avisar(escopo, colecao); } }
    if (c[doc]) espelharGestor(escopo, colecao, String(doc), c[doc].v, c[doc].d);
  }

  function refDoc(alvo) {
    return {
      id: alvo.doc,
      onSnapshot: function (cb, err) { return assinar(alvo.escopo, alvo.colecao, alvo.doc, cb, err); },
      get: async function () { await sincronizar(alvo.escopo).catch(function () { }); return fotoDoc(alvo.doc, registro(alvo.escopo, alvo.colecao, alvo.doc)); },
      set: function (dados) { return gravarDoc(alvo.escopo, alvo.colecao, alvo.doc, dados, false); },
      update: function (dados) { return gravarDoc(alvo.escopo, alvo.colecao, alvo.doc, dados, true); }
    };
  }
  var db = {
    collection: function (nome) {
      return {
        onSnapshot: function (cb, err) { return assinar(escopoDe(nome), nome, null, cb, err); },
        doc: function (id) { return refDoc({ escopo: escopoDe(nome), colecao: nome, doc: String(id) }); }
      };
    },
    doc: function (caminho) { return refDoc(alvoDoc(caminho)); }
  };

  /* ---------- O que o painel enxerga no lugar do claude.ai ---------- */
  var partes = {
    db: db,
    user: { id: async function () { return ctx.uid; }, isOwner: async function () { return ctx.ver; } },
    assets: { upload: function (blob, op) { return enviarArquivo(blob, op); } }, // F1a (17/11/2026)
    sample: null // IA do painel: desligada no app por enquanto
  };
  window.claude = {
    use: async function (nome) { await entrou; return Object.prototype.hasOwnProperty.call(partes, nome) ? partes[nome] : null; }
  };
  // 11/11/2026: nº de imóveis livres do A CAPTAR lido na hora do Supabase (o mesmo cálculo da tela A CAPTAR do app),
  // em vez da foto do dia (acaptar/estado), que ficava parada quando a rotina não rodava (botão mostrava 132 com 343 na base).
  function acaptarLivres() {
    return Promise.all([
      sb.from('ac_imoveis').select('ref,distribuido_para').eq('ativo', true).eq('lista', 'base').limit(5000),
      sb.from('ac_travas').select('ref,travado_em,ultimo_contato_em').is('solto_em', null).limit(5000)
    ]).then(function (r) {
      if (r[0].error || r[1].error) throw (r[0].error || r[1].error);
      var agora = Date.now(), ocup = {};
      (r[1].data || []).forEach(function (t) { var u = new Date(t.ultimo_contato_em || t.travado_em).getTime(); if (agora - u < 7 * 864e5) ocup[t.ref] = 1; });
      return (r[0].data || []).filter(function (v) { return !v.distribuido_para && !ocup[v.ref]; }).length;
    });
  }
  // 15/11/2026 (vis-enderecos-completos-agenciadores, F2): pendências do painel (imóveis e leads) e correção de cadastro.
  // O banco só devolve a lista do que falta (nenhum valor do imóvel ou do proprietário); a correção vale na hora no CRM,
  // no HUB, no site e na ficha do Drive (camada imoveis_correcoes no Supabase).
  async function pendencias() {
    await entrou;
    var r = await sb.rpc('pend_meu_painel', { p_painel: ctx.ver ? ctx.painel : null });
    if (r.error) throw r.error;
    return r.data;
  }
  async function corrigir(imovel, campos, proprietario) {
    await entrou;
    var r = await sb.rpc('corr_gravar_painel', { p_imovel: String(imovel), p_campos: campos || {}, p_proprietario: proprietario || {} });
    if (r.error) throw r.error;
    return r.data;
  }
  // 16/11/2026 (P2 de vis-vivian-cadastro-imovel-ia): placa e áreas de lazer dos imóveis já cadastrados (imoveis_divulgacao);
  // a checagem de dono é do banco (divulg_gravar_painel); as fotos vão pela Vivian.
  async function divulgacao(imovel, placa, lazer) {
    await entrou;
    var r = await sb.rpc('divulg_gravar_painel', { p_imovel: String(imovel), p_placa: placa || null, p_lazer: lazer || null });
    if (r.error) throw r.error;
    return r.data;
  }
  // 17/11/2026 (CRM fatia 5, decisão do Cleiton): IA do app pela função painel-ia (a chave do Claude é a da Vivian, no Supabase).
  // Só dois usos, com limite por pessoa por dia: tipo 'resumo' (✦ Resumo da Vivian do lead) e 'organizar' (Registrar conversa).
  // O resto da IA do painel (sample) segue desligado no app.
  async function chamarIA(corpo, sinal) {
    await entrou;
    var s = await sb.auth.getSession(), tok = s && s.data && s.data.session && s.data.session.access_token;
    if (!tok) throw erro('Sessão expirada. Entre de novo.', 'not_granted');
    var r;
    try { r = await fetch(SB_URL + '/functions/v1/painel-ia', { method: 'POST', headers: { authorization: 'Bearer ' + tok, apikey: SB_CHAVE, 'content-type': 'application/json' }, body: JSON.stringify(corpo), signal: sinal }); }
    catch (e) { if (e && e.name === 'AbortError') throw erro('cancelado', 'cancelled'); throw erro('Sem conexão agora.', 'unavailable'); }
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || !j.ok) { var e2 = erro(j.erro || ('erro ' + r.status), j.codigo || (r.status === 429 ? 'rate_limited' : r.status === 401 || r.status === 403 ? 'not_granted' : 'unavailable')); e2.usados = j.usados; e2.limite = j.limite; throw e2; }
    return j;
  }
  function paraBase64(f) {
    return new Promise(function (ok, falha) { var fr = new FileReader(); fr.onload = function () { ok(String(fr.result).split(',')[1] || ''); }; fr.onerror = function () { falha(fr.error); }; fr.readAsDataURL(f); });
  }
  // 17/11/2026 (perfil do lead, F2): "Gerar perfil" no lead chama a função lead-perfil, que confere no servidor se o lead é do
  // painel de quem pede, conta o limite por pessoa e devolve o perfil (que também fica gravado em perfil_ia, só o servidor grava).
  async function perfil(docId, sinal) {
    await entrou;
    var s = await sb.auth.getSession(), tok = s && s.data && s.data.session && s.data.session.access_token;
    if (!tok) throw erro('Sessão expirada. Entre de novo.', 'not_granted');
    var r;
    try { r = await fetch(SB_URL + '/functions/v1/lead-perfil?acao=pedir', { method: 'POST', headers: { authorization: 'Bearer ' + tok, apikey: SB_CHAVE, 'content-type': 'application/json' }, body: JSON.stringify({ doc_id: String(docId) }), signal: sinal }); }
    catch (e) { if (e && e.name === 'AbortError') throw erro('cancelado', 'cancelled'); throw erro('Sem conexão agora.', 'unavailable'); }
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || !j.ok) { var e2 = erro(j.erro || ('erro ' + r.status), j.codigo || (r.status === 429 ? 'rate_limited' : r.status === 401 || r.status === 403 ? 'not_granted' : 'unavailable')); e2.limite = j.limite; throw e2; }
    return j;
  }
  // 17/11/2026 (F1b da vistoria pelo celular): locações administradas da carteira para a vistoria simples (código, endereço e
  // bairro; nada do inquilino nem do proprietário). Qualquer pessoa com acesso ativo lê (decisão do Cleiton: qualquer corretor).
  async function carteiraVistoria() {
    await entrou;
    var r = await sb.rpc('vist_carteira');
    if (r.error) throw r.error;
    return r.data || [];
  }
  var ia = {
    json: async function (prompt, op) {
      op = op || {};
      var imgs = [];
      for (var i = 0; i < (op.images || []).length; i++) { var f = op.images[i]; imgs.push({ media_type: f.type || 'image/jpeg', data: await paraBase64(f) }); }
      var j = await chamarIA({ tipo: op.tipo || 'organizar', prompt: String(prompt), images: imgs }, op.signal);
      ia.ultimo = { usados: j.usados, limite: j.limite };
      return j.dados;
    },
    limits: async function () { var j = await chamarIA({ tipo: 'limites' }); return { images: j.imagens, limite: j.limite, usados: j.usados }; }
  };
  /* trocas-demandas-auto */ function demandasAuto() { return sb.rpc('demandas_automaticas').then(function (r) { if (r.error) throw r.error; return r.data; }); }
  /* trocas-base-app */ function baseLeads(op, id, dados) { var q = op === 'lista' ? sb.rpc('base_leads_lista') : op === 'pessoa' ? sb.rpc('base_leads_pessoa', { p_id: String(id) }) : sb.rpc('base_leads_acao', { p_id: String(id), p_dados: dados || {} }); return q.then(function (r) { if (r.error) throw r.error; return r.data; }); }
  window.VIVERE_PONTE = { versao: VERSAO, ia: ia, perfil: perfil, acaptarLivres: acaptarLivres, demandasAuto: demandasAuto, baseLeads: baseLeads, pendencias: pendencias, corrigir: corrigir, divulgacao: divulgacao, arquivo: arquivoMaterial, miniatura: miniaturaMaterial, enviarArquivo: enviarArquivo, carteiraVistoria: carteiraVistoria, sair: function () { return sb.auth.signOut(); }, reler: ressincronizar, estado: function () { return { eu_corretor: ctx.eu ? ctx.eu.corretor_id || null : null, eu_nome: ctx.eu ? ctx.eu.nome || null : null, papel: ctx.eu ? ctx.eu.papel : null, painel: ctx.painel, ver: ctx.ver, gestor: ctx.gestor, tempoReal: ctx.tempoReal, tempoRealGestor: ctx.tempoRealG, pronto: Object.keys(pronto) }; } };
})();
