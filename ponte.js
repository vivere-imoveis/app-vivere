/* App da Vivere — ponte do painel do corretor (fatia 4b, 09/11/2026).
   O painel.js é o mesmo do modelo dos painéis: ele pede os dados por window.claude (banco, usuário, arquivos, IA).
   Esta ponte entrega esses mesmos comandos lendo e gravando no Supabase, com o login do app.
   Nenhum dado fica neste repositório: quem decide o que cada pessoa lê e grava são as regras do banco. */
(function () {
  'use strict';
  var SB_URL = 'https://jucnlzznbwjthlqqgdlz.supabase.co';
  var SB_CHAVE = 'sb_publishable_N26mrhHO44DyqfD6L28HEQ__uei3fNj'; // chave publicável (feita para o navegador)
  var VERSAO = 'ponte 2026-11-09.1';
  var TESTE_SO_GESTOR = true; // fatia 4b: o painel no app é cópia de teste; enquanto for, só o gestor abre
  var COMUM = '_comum';
  // Coleções iguais para todos os painéis (pauta, catálogo, fotos, equipe e demandas). O resto é de cada painel.
  var COMUNS = { vitrine: 1, catalogo: 1, galeria: 1, galeria_fotos: 1, fotos: 1, empreendimentos: 1, equipe_cartoes: 1, demandas: 1, demandas_pedidos: 1 };
  var PAGINA = 1000;
  var CACHE_NOME = 'vivere-painel', CACHE_LOJA = 'comum';

  var sb = window.supabase.createClient(SB_URL, SB_CHAVE, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  var ctx = { uid: null, eu: null, painel: null, ver: false, tempoReal: false, caiu: false, ultima: 0 };
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
    var q = await sb.from('acessos').select('email,nome,papel,painel,ativo').eq('user_id', ctx.uid).maybeSingle();
    if (q.error) return fatal('Não deu para conferir o seu acesso agora. Recarregue a página.');
    if (!q.data || !q.data.ativo) return paraOInicio();
    ctx.eu = q.data;
    if (TESTE_SO_GESTOR && ctx.eu.papel !== 'gestor') return paraOInicio();
    var diretoria = ctx.eu.papel === 'gestor' || ctx.eu.papel === 'diretor';
    var ver = (new URLSearchParams(location.search).get('ver') || '').trim().toLowerCase();
    if (ver && diretoria && /^[a-z0-9][a-z0-9-]{0,39}$/.test(ver) && ver !== ctx.eu.painel) { ctx.painel = ver; ctx.ver = true; }
    else ctx.painel = ctx.eu.painel;
    if (!ctx.painel) return fatal('O seu painel ainda não foi criado. Fale com a diretoria.');
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
  function escopoDe(colecao) { return COMUNS[colecao] ? COMUM : ctx.painel; }
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
    emCurso[escopo] = sincronizarAgora(escopo).then(function () { delete emCurso[escopo]; }, function (e) { delete emCurso[escopo]; throw e; });
    return emCurso[escopo];
  }
  async function sincronizarAgora(escopo) {
    var primeira = !pronto[escopo];
    if (primeira && escopo === COMUM) await lerCache();
    var indice = await paginas(function () { return sb.from('painel_docs').select('colecao,doc_id,versao').eq('painel', escopo).order('colecao').order('doc_id'); });
    var m = mem[escopo] || (mem[escopo] = {}), vivos = {}, falta = {}, mudou = {};
    indice.forEach(function (x) {
      (vivos[x.colecao] || (vivos[x.colecao] = {}))[x.doc_id] = 1;
      var a = m[x.colecao] && m[x.colecao][x.doc_id];
      if (!a || (a.v !== x.versao && !a.p)) (falta[x.colecao] || (falta[x.colecao] = [])).push(x.doc_id);
    });
    if (primeira) Object.keys(vivos).forEach(function (col) { if (!falta[col]) { chegou[escopo + '/' + col] = true; avisar(escopo, col); } });
    Object.keys(m).forEach(function (col) {
      var saiu = Object.keys(m[col]).filter(function (id) { return !(vivos[col] && vivos[col][id]) && !m[col][id].p; });
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
    if (primeira) ouvintes.forEach(function (o) { if (o.escopo === escopo && !o.disparado) disparar(o); });
    else Object.keys(mudou).forEach(function (col) { avisar(escopo, col); });
  }
  function escopos() { return [ctx.painel, 'u:' + ctx.uid, COMUM]; }
  function ressincronizar() { escopos().forEach(function (e) { sincronizar(e).catch(function () { }); }); }

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
    document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - ctx.ultima > 45000) ressincronizar(); });
    window.addEventListener('online', ressincronizar);
    setInterval(function () { if (!ctx.tempoReal && !document.hidden) ressincronizar(); }, 120000);
  }

  /* ---------- Tempo real: as mudanças chegam na hora; se a ligação cair, a releitura acima cobre ---------- */
  function ligarTempoReal() {
    try {
      var canal = sb.channel('painel-' + ctx.painel);
      escopos().forEach(function (e) {
        canal.on('postgres_changes', { event: '*', schema: 'public', table: 'painel_docs', filter: 'painel=eq.' + e }, function (p) { aplicarMudanca(e, p); });
      });
      canal.subscribe(function (status) {
        var ok = status === 'SUBSCRIBED';
        if (ok && ctx.caiu) { ctx.caiu = false; ressincronizar(); }
        if (!ok) ctx.caiu = true;
        ctx.tempoReal = ok;
      });
    } catch (e) { ctx.tempoReal = false; }
  }
  function aplicarMudanca(escopo, p) {
    var n = p && p.new;
    if (!n || !n.colecao || !n.doc_id || typeof n.versao !== 'number') return;
    var c = gaveta(escopo, n.colecao), a = c[n.doc_id];
    if (a && (a.p || a.v >= n.versao)) return;
    if (!n.dados || typeof n.dados !== 'object') { sincronizar(escopo).catch(function () { }); return; }
    c[n.doc_id] = { v: n.versao, d: n.dados };
    if (escopo === COMUM) gravarCache(n.colecao, [n]);
    avisar(escopo, n.colecao);
  }

  /* ---------- Avisos ao painel (o "onSnapshot" do banco dos artefatos) ---------- */
  function fotoDoc(id, reg) { return { id: id, exists: !!reg, data: function () { return reg ? clonar(reg.d) : undefined; } }; }
  function disparar(o) {
    o.disparado = true;
    try {
      var c = (mem[o.escopo] || {})[o.colecao] || {};
      if (o.doc != null) o.cb(fotoDoc(o.doc, c[o.doc]));
      else {
        var docs = Object.keys(c).sort().map(function (id) { return fotoDoc(id, c[id]); });
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
    if (c[doc]) { c[doc].v = typeof r.data === 'number' ? r.data : c[doc].v + 1; delete c[doc].p; }
  }

  function refDoc(alvo) {
    return {
      id: alvo.doc,
      onSnapshot: function (cb, err) { return assinar(alvo.escopo, alvo.colecao, alvo.doc, cb, err); },
      get: async function () { await sincronizar(alvo.escopo).catch(function () { }); return fotoDoc(alvo.doc, ((mem[alvo.escopo] || {})[alvo.colecao] || {})[alvo.doc]); },
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
    assets: { upload: async function () { throw erro('o envio de fotos e documentos pelo app ainda não está ligado'); } },
    sample: null // IA do painel: desligada no app por enquanto
  };
  window.claude = {
    use: async function (nome) { await entrou; return Object.prototype.hasOwnProperty.call(partes, nome) ? partes[nome] : null; }
  };
  window.VIVERE_PONTE = { versao: VERSAO, sair: function () { return sb.auth.signOut(); }, reler: ressincronizar, estado: function () { return { painel: ctx.painel, ver: ctx.ver, tempoReal: ctx.tempoReal, pronto: Object.keys(pronto) }; } };
})();
