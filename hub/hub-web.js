/* HUB VIVERE na web — ponte do HUB para a diretoria (fatia F2 de hub-web-diretoria, 21/11/2026).
   O HUB é o mesmo publicado no claude.ai: index.html, núcleo e módulos não mudam. Eles pedem tudo por window.claude.use(...)
   ('db', 'mcp', 'user', 'sample', 'downloads', 'dictation'). Esta ponte entrega esses pedidos lendo do Supabase com o login do
   app (o mesmo dos corretores), pelas funções public.hub_web_colecoes() e public.hub_web_ler(), que conferem no banco quem
   pode ver o quê (acessos.hub por pessoa; diretor não vê o nível mestre).
   PRIMEIRA VERSÃO SÓ LEITURA: toda gravação é recusada aqui e no banco (não há função de gravar para a web).
   Nenhum dado fica neste arquivo. */
(function () {
  'use strict';
  var SB_URL = 'https://jucnlzznbwjthlqqgdlz.supabase.co';
  var SB_CHAVE = 'sb_publishable_N26mrhHO44DyqfD6L28HEQ__uei3fNj'; // chave publicável (feita para o navegador), a mesma do app
  var VERSAO = 'hub-web 2026-11-21.1';
  var PAGINA = 500, VOLTAS = 60;
  var SO_LEITURA = 'Esta versão do HUB na web é só leitura. Para alterar, use o HUB no Claude.';

  var sb = window.supabase.createClient(SB_URL, SB_CHAVE, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  var ctx = { uid: null, usuario: null, colecoes: null, semAcesso: {}, recusas: 0 };
  var nunca = function () { return new Promise(function () { }); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function erro(texto, codigo) { var e = new Error(texto); if (codigo) e.code = codigo; return e; }
  function clonar(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

  /* ---------- tela de bloqueio (sem login, sem acesso, falha) ---------- */
  function bloqueio(titulo, texto) {
    var pinta = function () {
      var d = document.getElementById('hubweb-bloqueio');
      if (!d) { d = document.createElement('div'); d.id = 'hubweb-bloqueio'; document.body.appendChild(d); }
      d.innerHTML = '<div class="hw-caixa"><h2>' + esc(titulo) + '</h2><p>' + esc(texto) + '</p>' +
        '<p class="hw-acoes"><a class="hw-b" href="../painel.html">Voltar ao meu painel</a><a class="hw-b" href="../index.html">Início do app</a></p></div>';
    };
    if (document.body) pinta(); else document.addEventListener('DOMContentLoaded', pinta);
    return nunca();
  }
  function aviso(texto) {
    var a = document.getElementById('hubweb-aviso');
    if (!a) { a = document.createElement('div'); a.id = 'hubweb-aviso'; a.setAttribute('role', 'status'); (document.body || document.documentElement).appendChild(a); }
    a.textContent = texto; a.classList.add('vis');
    clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.classList.remove('vis'); }, 6000);
  }
  function recusaGravar(onde) { ctx.recusas++; if (onde) ctx.ultimaRecusa = onde; aviso(SO_LEITURA); return Promise.reject(erro(SO_LEITURA, 'permission-denied')); }

  /* ---------- entrada: sessão do app e marca de acesso ao HUB ---------- */
  var entrou = (async function () {
    var s = await sb.auth.getSession();
    var sessao = s && s.data && s.data.session;
    if (!sessao) { location.replace('../index.html'); return nunca(); }
    ctx.uid = sessao.user.id;
    var r = await sb.rpc('hub_web_colecoes');
    if (r.error) {
      if (r.error.code === '42501') return bloqueio('HUB sem acesso', 'O seu login ainda não tem acesso ao HUB VIVERE. Peça ao Cleiton para liberar.');
      return bloqueio('HUB indisponível', 'Não deu para abrir o HUB agora (sem conexão ou falha do banco). Recarregue a página em instantes.');
    }
    ctx.usuario = (r.data && r.data.usuario) || {};
    ctx.colecoes = (r.data && r.data.colecoes) || [];
    faixa();
    var sb2 = document.getElementById('sem-banco'); if (sb2) sb2.hidden = true;
    return true;
  })().catch(function () { return bloqueio('HUB indisponível', 'Não deu para abrir o HUB agora. Recarregue a página em instantes.'); });
  sb.auth.onAuthStateChange(function (evento) { if (evento === 'SIGNED_OUT') location.replace('../index.html'); });

  /* ---------- leitura no banco ---------- */
  function visivel(col) { return !ctx.colecoes || ctx.colecoes.some(function (c) { return c.colecao === col; }); }
  async function lerPagina(col, apos, limite, doc, removidos) {
    // coleção fora da lista desta pessoa (nível mestre para a diretoria): vazia, sem ir ao banco (o banco recusaria do mesmo jeito)
    if (!visivel(col)) { ctx.semAcesso[col] = 1; return { colecao: col, itens: [], total: 0, proximo: null, sem_acesso: true }; }
    var r = await sb.rpc('hub_web_ler', { p_colecao: col, p_apos: apos || null, p_limite: limite || PAGINA, p_doc: doc || null, p_incluir_removidos: !!removidos });
    if (r.error) {
      if (r.error.code === '42501' || r.error.code === '22023') { ctx.semAcesso[col] = 1; return { colecao: col, itens: [], total: 0, proximo: null, sem_acesso: true }; }
      throw erro('Sem conexão agora.', 'unavailable');
    }
    return r.data || { colecao: col, itens: [], total: 0, proximo: null };
  }
  async function lerTudo(col) {
    var itens = [], apos = null, voltas = 0;
    do {
      var p = await lerPagina(col, apos, PAGINA);
      itens = itens.concat(p.itens || []); var prox = p.proximo || null;
      if (prox && prox === apos) break; apos = prox; voltas++;
    } while (apos && voltas < VOLTAS);
    return itens;
  }

  /* ---------- 'mcp': o conector Vivere Conversas, só com as três ferramentas do HUB ---------- */
  var MCP = {
    callTool: function (serv, nome, args) {
      args = args || {};
      return entrou.then(function () {
        if (nome === 'hub_colecoes') return { payload: { versao: VERSAO, colecoes: clonar(ctx.colecoes) } };
        if (nome === 'hub_ler') {
          if (!args.colecao) return Promise.reject(erro('coleção não informada', 'invalid_argument'));
          return lerPagina(String(args.colecao), args.apos, Math.min(Number(args.limite) || 100, PAGINA), args.doc_id, args.incluir_removidos)
            .then(function (p) { return { payload: p }; });
        }
        if (nome === 'hub_gravar') return recusaGravar('hub_gravar ' + ((args.operacoes || []).map(function (o) { return o.colecao + '/' + o.doc_id; }).join(',')));
        return Promise.reject(erro('Ferramenta não disponível no HUB na web: ' + nome, 'unavailable'));
      });
    }
  };

  /* ---------- 'db': banco no formato que o núcleo usa (coleção/documento), lendo do Supabase ---------- */
  function docSnap(id, dados, ref) {
    var d = dados == null ? undefined : dados;
    return { id: id, exists: d !== undefined, ref: ref, data: function () { return d === undefined ? undefined : clonar(d); }, get: function (k) { return d && d[k]; },
      metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function colSnap(c, itens) {
    var docs = itens.map(function (x) { return docSnap(x.doc_id, x.dados, docRef(c + '/' + x.doc_id)); });
    return { docs: docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false, hasPendingWrites: false },
      forEach: function (f) { docs.forEach(f); },
      docChanges: function () { return docs.map(function (d, i) { return { type: 'added', doc: d, oldIndex: -1, newIndex: i }; }); } };
  }
  // Documentos locais (preferências da pessoa: data/users/<uid>/...): ficam no aparelho, como no artefato.
  var LOCAL = 'hubweb:', ouvLocal = {};
  function ehLocal(path) { return /^data\//.test(path); }
  function lerLocal(path) { try { var v = localStorage.getItem(LOCAL + path); return v ? JSON.parse(v) : undefined; } catch (e) { return undefined; } }
  function gravarLocal(path, dados) {
    try { if (dados === undefined) localStorage.removeItem(LOCAL + path); else localStorage.setItem(LOCAL + path, JSON.stringify(dados)); } catch (e) { }
    (ouvLocal[path] || []).forEach(function (f) { try { f(); } catch (e) { } });
    return Promise.resolve();
  }
  function docRef(path) {
    path = String(path || '').replace(/^\/+|\/+$/g, '');
    var seg = path.split('/'), id = seg[seg.length - 1], col = seg.slice(0, -1).join('/');
    var ref = {
      id: id, path: path, parent: null,
      collection: function (p) { return colRef(path + '/' + p); },
      get: function () {
        if (ehLocal(path)) return Promise.resolve(docSnap(id, lerLocal(path), ref));
        if (seg.length !== 2) return Promise.resolve(docSnap(id, undefined, ref));
        return entrou.then(function () { return lerPagina(col, null, 1, id); })
          .then(function (p) { var x = (p.itens || [])[0]; return docSnap(id, x ? x.dados : undefined, ref); });
      },
      onSnapshot: function (ok, err) {
        var parado = false;
        var vai = function () { ref.get().then(function (s) { if (!parado) ok(s); }, function (e) { if (!parado && err) err(e); }); };
        if (ehLocal(path)) (ouvLocal[path] = ouvLocal[path] || []).push(vai);
        vai();
        return function () { parado = true; if (ouvLocal[path]) ouvLocal[path] = ouvLocal[path].filter(function (f) { return f !== vai; }); };
      },
      set: function (d, opt) {
        if (!ehLocal(path)) return recusaGravar('set ' + path);
        var base = (opt && (opt.merge || opt.mergeFields)) ? (lerLocal(path) || {}) : {};
        return gravarLocal(path, Object.assign(base, clonar(d)));
      },
      update: function (d) { if (!ehLocal(path)) return recusaGravar('update ' + path); return gravarLocal(path, Object.assign(lerLocal(path) || {}, clonar(d))); },
      delete: function () { if (!ehLocal(path)) return recusaGravar('delete ' + path); return gravarLocal(path, undefined); }
    };
    return ref;
  }
  function colRef(c) {
    c = String(c || '').replace(/^\/+|\/+$/g, '');
    var ref = {
      id: c.split('/').pop(), path: c,
      doc: function (id) { return docRef(c + '/' + (id || ('w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)))); },
      add: function () { return recusaGravar(); },
      get: function () {
        if (c.indexOf('/') >= 0) return Promise.resolve(colSnap(c, []));
        return entrou.then(function () { return lerTudo(c); }).then(function (it) { return colSnap(c, it); });
      },
      onSnapshot: function (ok, err) {
        var parado = false;
        ref.get().then(function (s) { if (!parado) ok(s); }, function (e) { if (!parado && err) err(e); });
        return function () { parado = true; };
      },
      where: function () { return ref; }, orderBy: function () { return ref; }, limit: function () { return ref; }
    };
    return ref;
  }
  var DB = { doc: docRef, collection: colRef, batch: function () { return { set: function () { }, update: function () { }, delete: function () { }, commit: recusaGravar }; } };

  /* ---------- 'downloads': baixa o arquivo no aparelho (relatório em PDF) ---------- */
  var DOWN = {
    save: function (o) {
      o = o || {}; var dados = o.data, nome = String(o.filename || 'arquivo');
      var blob = dados instanceof Blob ? dados : new Blob([dados], { type: o.mimeType || 'application/octet-stream' });
      var u = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 30000);
      return Promise.resolve({ ok: true });
    }
  };

  /* ---------- window.claude: só o que o HUB pede ---------- */
  window.claude = {
    use: function (nome) {
      if (nome === 'db') return entrou.then(function () { return DB; });
      if (nome === 'mcp') return entrou.then(function () { return MCP; });
      if (nome === 'user') return entrou.then(function () {
        return { id: function () { return Promise.resolve(ctx.uid); }, me: function () { return Promise.resolve({ name: (ctx.usuario && ctx.usuario.nome) || '' }); } };
      });
      if (nome === 'downloads') return Promise.resolve(DOWN);
      return Promise.resolve(null); // 'sample' (IA), 'dictation' e o resto: não há nesta versão
    }
  };

  /* ---------- faixa no topo: quem está logado, só leitura, voltar ---------- */
  function faixa() {
    var pinta = function () {
      if (document.getElementById('hubweb-faixa')) return;
      var f = document.createElement('div'); f.id = 'hubweb-faixa';
      var u = ctx.usuario || {};
      f.innerHTML = '<span class="hw-t"><b>HUB na web</b> · só leitura · ' + esc(u.nome || '') + '</span>' +
        '<span class="hw-a"><a href="../painel.html">Meu painel</a><button type="button" id="hubweb-sair">Sair</button></span>';
      document.body.insertBefore(f, document.body.firstChild);
      document.getElementById('hubweb-sair').addEventListener('click', function () { sb.auth.signOut().then(function () { location.replace('../index.html'); }); });
    };
    if (document.body) pinta(); else document.addEventListener('DOMContentLoaded', pinta);
  }
  var css = document.createElement('style');
  css.textContent =
    '#hubweb-faixa{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;justify-content:space-between;padding:6px 14px;font:13px/1.35 var(--body,system-ui);background:var(--soft,#eceee6);color:var(--ink,#1d2840);border-bottom:1px solid var(--line,#dcdfd5)}' +
    '#hubweb-faixa .hw-a{display:flex;gap:10px;align-items:center}#hubweb-faixa a,#hubweb-faixa button{font:inherit;color:inherit;background:none;border:1px solid var(--line,#ccc);border-radius:7px;padding:4px 10px;cursor:pointer;text-decoration:none;min-height:32px;display:inline-flex;align-items:center}' +
    '#hubweb-aviso{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);max-width:min(420px,calc(100vw - 32px));padding:10px 14px;border-radius:10px;background:var(--ink,#1d2840);color:var(--bg,#fff);font:14px/1.4 var(--body,system-ui);box-shadow:0 6px 24px rgba(0,0,0,.25);opacity:0;pointer-events:none;transition:opacity .2s;z-index:9999}#hubweb-aviso.vis{opacity:1}' +
    '#hubweb-bloqueio{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:var(--bg,#f4f5f0);padding:20px}#hubweb-bloqueio .hw-caixa{max-width:420px;background:var(--panel,#fff);border:1px solid var(--line,#dcdfd5);border-radius:12px;padding:22px;font:15px/1.5 var(--body,system-ui);color:var(--ink,#1d2840)}' +
    '#hubweb-bloqueio h2{margin:0 0 8px;font:500 15px var(--display,system-ui);letter-spacing:.12em;text-transform:uppercase}#hubweb-bloqueio .hw-acoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}#hubweb-bloqueio .hw-b{border:1px solid var(--line,#ccc);border-radius:8px;padding:8px 12px;color:inherit;text-decoration:none}';
  (document.head || document.documentElement).appendChild(css);

  window.HUB_WEB = { versao: VERSAO, estado: function () { return { uid: ctx.uid, usuario: ctx.usuario, colecoes: ctx.colecoes ? ctx.colecoes.length : 0, sem_acesso: Object.keys(ctx.semAcesso), recusas: ctx.recusas, ultima_recusa: ctx.ultimaRecusa || null }; } };
})();
