/* App da Vivere — fatia 2 (09/11/2026): login, criar/trocar senha e tela de Acessos do gestor.
   Sem dados neste repositório: tudo vem do Supabase, protegido pelo login e pelas regras de cada corretor.
   A chave abaixo é a publicável (feita para ficar no navegador); a chave secreta fica só no Supabase. */
(function () {
  'use strict';
  var SB_URL = 'https://jucnlzznbwjthlqqgdlz.supabase.co';
  var SB_CHAVE = 'sb_publishable_N26mrhHO44DyqfD6L28HEQ__uei3fNj';
  var APP_URL = location.origin + location.pathname;
  var VERSAO = 'app-vivere 2026-11-09.6';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ler = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var gravar = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } };
  var dataHora = function (iso) { if (!iso) return '—'; var d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };

  /* ---------- Tema e olho ---------- */
  function temaEscuroAgora() { var t = document.documentElement.getAttribute('data-theme'); if (t) return t === 'dark'; return matchMedia('(prefers-color-scheme: dark)').matches; }
  function aplicarTema(t) { if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
  aplicarTema(ler('tema'));
  $('#btnTema').addEventListener('click', function () { var t = temaEscuroAgora() ? 'light' : 'dark'; gravar('tema', t); aplicarTema(t); });
  function aplicarOlho(v) { document.documentElement.setAttribute('data-privado', v ? '1' : '0'); var b = $('#btnPrivado'); b.setAttribute('aria-pressed', v ? 'true' : 'false'); var r = v ? 'Mostrar e-mails e dados sensíveis' : 'Ocultar e-mails e dados sensíveis'; b.title = r; b.setAttribute('aria-label', r); }
  aplicarOlho(ler('olho-privado') === '1');
  $('#btnPrivado').addEventListener('click', function () { var v = document.documentElement.getAttribute('data-privado') !== '1'; gravar('olho-privado', v ? '1' : '0'); aplicarOlho(v); });

  var toastT = null;
  function toast(t) { var el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 3500); }

  /* ---------- Supabase ---------- */
  var hashInicial = location.hash || '';
  var modoSenha = /type=(invite|recovery)/.test(hashInicial);
  var erroLink = /error_description=([^&]+)/.exec(hashInicial);
  var sb = window.supabase.createClient(SB_URL, SB_CHAVE, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });

  /* Link direto ao imóvel do A CAPTAR: ?cod=AC-XXXXXX (guardado até depois do login). */
  var codParam = (new URLSearchParams(location.search).get('cod') || '').trim();
  if (codParam) { try { sessionStorage.setItem('acaptar-cod', codParam); } catch (e) { } history.replaceState(null, '', APP_URL + location.hash); }
  try { codParam = codParam || sessionStorage.getItem('acaptar-cod') || ''; } catch (e) { }

  var abaParam = (new URLSearchParams(location.search).get('aba') || '').trim();
  if (abaParam) history.replaceState(null, '', APP_URL + location.hash);

  var estado = { sessao: null, eu: null, aba: (codParam || abaParam === 'acaptar') ? 'acaptar' : 'inicio', acessos: [], registro: [], ordem: { campo: 'nome', dir: 1 }, link: null, confirmar: null, carregando: false };

  sb.auth.onAuthStateChange(function (evento, sessao) {
    if (evento === 'PASSWORD_RECOVERY') modoSenha = true;
    var mudou = (!!sessao) !== (!!estado.sessao) || evento === 'PASSWORD_RECOVERY';
    estado.sessao = sessao;
    if (evento === 'SIGNED_OUT') { estado.eu = null; estado.aba = 'inicio'; if (window.ACAPTAR) window.ACAPTAR.sair(); }
    if (mudou) setTimeout(iniciar, 0);
  });

  async function iniciar() {
    var r = await sb.auth.getSession();
    estado.sessao = r.data.session;
    if (estado.sessao && !estado.eu) {
      var q = await sb.from('acessos').select('email,nome,papel,painel,ativo').eq('user_id', estado.sessao.user.id).maybeSingle();
      estado.eu = q.data || null;
    }
    desenhar();
  }

  /* ---------- Telas ---------- */
  function titulo(t) { $('#titulo').textContent = t; document.title = 'Vivere · ' + t; }

  function desenhar() {
    var main = $('#conteudo'), abas = $('#abas');
    if (erroLink && !estado.sessao) {
      abas.hidden = true; titulo('Link expirado');
      main.innerHTML = '<div class="form cartao"><h2>Link expirado ou já usado</h2><div class="msg aviso">' + esc(decodeURIComponent(erroLink[1].replace(/\+/g, ' '))) + '</div><p>Peça um link novo à Vivere ou use “Esqueci minha senha”.</p><button class="btn pri" id="voltar">Ir para o login</button></div>';
      $('#voltar').onclick = function () { erroLink = null; history.replaceState(null, '', APP_URL); desenhar(); };
      return;
    }
    if (!estado.sessao) { abas.hidden = true; return telaEntrar(main); }
    if (modoSenha) { abas.hidden = true; return telaSenha(main, true); }
    if (!estado.eu || !estado.eu.ativo) {
      abas.hidden = true; titulo('Acesso não liberado');
      main.innerHTML = '<div class="form cartao"><h2>Acesso não liberado</h2><div class="msg erro">Este login não tem acesso ativo ao app da Vivere. Fale com a diretoria.</div><button class="btn" id="sair">Sair</button></div>';
      $('#sair').onclick = sair; return;
    }
    var lista = [['inicio', 'Início'], ['acaptar', 'A CAPTAR'], ['senha', 'Minha senha']];
    /* quem veio do painel (aba A CAPTAR ou botão Captar) ganha a aba de volta para ele */
    var volta = ''; try { volta = sessionStorage.getItem('painel.volta') || ''; } catch (e) { }
    if (!/^painel\.html(\?ver=[a-z0-9_-]{1,40})?$/.test(volta)) volta = '';
    if (volta) lista.splice(1, 0, ['painel', volta.indexOf('?ver=') > 0 ? 'Painel · ' + esc(volta.split('?ver=')[1]) : 'Meu painel']);
    if (estado.eu.papel === 'gestor') lista.push(['acessos', 'Acessos']);
    abas.hidden = false;
    abas.innerHTML = lista.map(function (a) { return '<button role="tab" data-aba="' + a[0] + '" aria-selected="' + (estado.aba === a[0]) + '">' + a[1] + '</button>'; }).join('');
    abas.querySelectorAll('button').forEach(function (b) { b.onclick = function () { if (b.dataset.aba === 'painel') { location.href = volta; return; } estado.aba = b.dataset.aba; estado.link = null; estado.confirmar = null; desenhar(); }; });
    if (estado.aba === 'senha') return telaSenha(main, false);
    if (estado.aba === 'acessos' && estado.eu.papel === 'gestor') return telaAcessos(main);
    if (estado.aba === 'acaptar' && window.ACAPTAR) { var cod = codParam; codParam = ''; try { sessionStorage.removeItem('acaptar-cod'); } catch (e) { } return window.ACAPTAR.tela(main, contexto(), cod); }
    telaInicio(main);
  }

  function telaEntrar(main, esqueci) {
    titulo(esqueci ? 'Esqueci minha senha' : 'Entrar');
    if (esqueci) {
      main.innerHTML = '<form class="form cartao" id="f" novalidate><h2>Esqueci minha senha</h2><p class="s">Digite o e-mail cadastrado na Vivere. Se ele tiver acesso, chega um link para criar uma senha nova.</p>' +
        '<label>E-mail<input type="email" name="email" autocomplete="email" required></label><div id="m"></div>' +
        '<button class="btn pri" type="submit">Enviar o link</button><button class="link" type="button" id="volta">Voltar ao login</button></form>';
      $('#volta').onclick = function () { telaEntrar(main, false); };
      $('#f').onsubmit = async function (e) {
        e.preventDefault(); var email = this.email.value.trim().toLowerCase(); if (!email) return;
        var b = this.querySelector('button[type=submit]'); b.disabled = true;
        await sb.auth.resetPasswordForEmail(email, { redirectTo: APP_URL });
        $('#m').innerHTML = '<div class="msg ok">Se este e-mail tiver acesso, o link chega em instantes. Confira também a caixa de spam.</div>'; b.disabled = false;
      };
      return;
    }
    main.innerHTML = '<form class="form cartao" id="f" novalidate><h2>Entrar</h2>' +
      '<label>E-mail<input type="email" name="email" autocomplete="username" required></label>' +
      '<label>Senha<input type="password" name="senha" autocomplete="current-password" required></label><div id="m"></div>' +
      '<button class="btn pri" type="submit">Entrar</button><button class="link" type="button" id="esq">Esqueci minha senha</button></form>';
    $('#esq').onclick = function () { telaEntrar(main, true); };
    $('#f').onsubmit = async function (e) {
      e.preventDefault(); var email = this.email.value.trim().toLowerCase(), senha = this.senha.value;
      if (!email || !senha) { $('#m').innerHTML = '<div class="msg erro">Preencha e-mail e senha.</div>'; return; }
      var b = this.querySelector('button[type=submit]'); b.disabled = true;
      var r = await sb.auth.signInWithPassword({ email: email, password: senha });
      b.disabled = false;
      if (r.error) { $('#m').innerHTML = '<div class="msg erro">' + (/banned/i.test(r.error.message) ? 'Este acesso foi desligado.' : 'E-mail ou senha não conferem.') + '</div>'; return; }
    };
  }

  function telaSenha(main, primeira) {
    titulo(primeira ? 'Criar sua senha' : 'Minha senha');
    main.innerHTML = '<form class="form cartao" id="f" novalidate><h2>' + (primeira ? 'Crie a sua senha' : 'Trocar minha senha') + '</h2>' +
      '<p class="s">Mínimo de 8 caracteres. Use uma senha só sua, que você não usa em outro lugar.</p>' +
      '<input type="email" name="username" autocomplete="username" value="' + esc(estado.sessao.user.email) + '" hidden>' +
      '<label>Nova senha<input type="password" name="s1" autocomplete="new-password" minlength="8" required></label>' +
      '<label>Repita a senha<input type="password" name="s2" autocomplete="new-password" minlength="8" required></label><div id="m"></div>' +
      '<button class="btn pri" type="submit">Salvar a senha</button></form>';
    $('#f').onsubmit = async function (e) {
      e.preventDefault(); var s1 = this.s1.value, s2 = this.s2.value;
      if (s1.length < 8) { $('#m').innerHTML = '<div class="msg erro">A senha precisa de pelo menos 8 caracteres.</div>'; return; }
      if (s1 !== s2) { $('#m').innerHTML = '<div class="msg erro">As duas senhas não são iguais.</div>'; return; }
      var b = this.querySelector('button'); b.disabled = true;
      var r = await sb.auth.updateUser({ password: s1 });
      b.disabled = false;
      if (r.error) { $('#m').innerHTML = '<div class="msg erro">Não deu para salvar: ' + esc(r.error.message) + '</div>'; return; }
      modoSenha = false; history.replaceState(null, '', APP_URL); estado.aba = 'inicio';
      toast('Senha salva.'); iniciar();
    };
  }

  /* Painel do corretor no app (fatia 4b): em teste. Só o gestor abre por enquanto; o painel de teste é o do Hugo. */
  var PAINEL_TESTE = 'hugo';
  function cartaoPainel() {
    if (estado.eu.papel !== 'gestor') return '<div class="cartao"><h3>Meu painel</h3><p>O seu painel do corretor vai abrir aqui, com o mesmo login.</p><span class="pill warn">Em construção</span></div>';
    return '<div class="cartao"><h3>Meu painel</h3><p>Painel do corretor no app, em teste. Os dados são uma cópia: o artefato continua oficial.</p><div class="linha-acoes">' +
      (estado.eu.painel ? '<a class="btn" href="painel.html">Abrir o meu</a>' : '') +
      '<a class="btn pri" href="painel.html?ver=' + encodeURIComponent(PAINEL_TESTE) + '">Ver o painel de teste (' + esc(PAINEL_TESTE) + ')</a></div><span class="pill warn">Em teste</span></div>';
  }

  function telaInicio(main) {
    titulo('Olá, ' + (estado.eu.nome || '').split(' ')[0]);
    main.innerHTML = '<div class="grade">' +
      cartaoPainel() +
      '<div class="cartao"><h3>A CAPTAR</h3><p id="acResumo">Imóveis a captar: os livres e os seus.</p><button class="btn pri" id="irAcaptar">Abrir o A CAPTAR</button></div>' +
      '<div class="cartao"><h3>Minha conta</h3><p data-sens>' + esc(estado.eu.email) + '</p><div class="linha-acoes"><button class="btn" id="irSenha">Trocar senha</button><button class="btn" id="sair">Sair</button></div></div>' +
      '</div><p class="s" style="margin-top:24px">' + VERSAO + '</p>';
    $('#sair').onclick = sair;
    $('#irSenha').onclick = function () { estado.aba = 'senha'; desenhar(); };
    $('#irAcaptar').onclick = function () { estado.aba = 'acaptar'; desenhar(); };
    if (window.ACAPTAR) window.ACAPTAR.resumo(contexto()).then(function (r) { var p = $('#acResumo'); if (p) p.textContent = r.livres + ' livres para captar · ' + r.minhas + ' em captação por você.'; }).catch(function () { });
  }

  function contexto() { return { sb: sb, eu: estado.eu, sessaoUid: estado.sessao.user.id, esc: esc, toast: toast, titulo: titulo }; }

  async function sair() { if (window.ACAPTAR) window.ACAPTAR.sair(); try { indexedDB.deleteDatabase('vivere-painel'); } catch (e) { } await sb.auth.signOut(); estado.eu = null; estado.sessao = null; desenhar(); }

  /* ---------- Acessos (só o gestor) ---------- */
  async function chamar(corpo) {
    var r = await sb.functions.invoke('acessos-admin', { body: corpo });
    if (r.error) {
      var msg = r.error.message;
      try { var j = await r.error.context.json(); if (j && j.erro) msg = j.erro; } catch (e) { }
      throw new Error(msg);
    }
    return r.data;
  }

  async function carregarAcessos() {
    estado.carregando = true;
    try { var d = await chamar({ acao: 'listar' }); estado.acessos = d.acessos || []; estado.registro = d.registro || []; }
    catch (e) { toast('Erro ao carregar: ' + e.message); }
    estado.carregando = false;
  }

  function situacao(a) {
    if (!a.ativo) return ['Desligado', 'bad'];
    if (a.senha_criada) return ['Ativo', 'ok'];
    if (a.convidado_em) return ['Convidado', 'warn'];
    return ['Sem convite', ''];
  }

  var COLS = [['nome', 'Nome'], ['papel', 'Papel'], ['situacao', 'Situação'], ['ultimo_acesso', 'Último acesso']];
  function valorOrdem(a, c) { return c === 'situacao' ? situacao(a)[0] : (a[c] || ''); }
  function ordenar(lista) {
    var o = estado.ordem;
    return lista.slice().sort(function (x, y) {
      var a = valorOrdem(x, o.campo), b = valorOrdem(y, o.campo);
      if (!a && b) return 1; if (a && !b) return -1;
      return String(a).localeCompare(String(b), 'pt-BR') * o.dir;
    });
  }
  function seta(c) { return estado.ordem.campo === c ? (estado.ordem.dir === 1 ? ' ▲' : ' ▼') : ' ↕'; }

  /* Carga dos painéis: o arquivo traz { itens: [{ painel, colecao, doc_id, dados }] }. Vai em lotes; só o gestor consegue (o banco confere). */
  async function carga(campo) {
    var f = campo.files && campo.files[0], msg = $('#cargaMsg'); if (!f) return;
    campo.disabled = true;
    try {
      var pac = JSON.parse(await f.text()), itens = pac && pac.itens;
      if (!Array.isArray(itens) || !itens.length) throw new Error('o arquivo não tem a lista de documentos');
      var lote = [], tam = 0, feitos = 0, mudou = 0;
      var enviar = async function () {
        if (!lote.length) return;
        var r = await sb.rpc('painel_carga', { p_itens: lote });
        if (r.error) throw new Error(r.error.message || 'o banco recusou');
        mudou += r.data || 0; feitos += lote.length; lote = []; tam = 0;
        msg.textContent = 'Enviando… ' + feitos + ' de ' + itens.length;
      };
      for (var i = 0; i < itens.length; i++) {
        var t = JSON.stringify(itens[i]).length;
        if (lote.length && (tam + t > 400000 || lote.length >= 200)) await enviar();
        lote.push(itens[i]); tam += t;
      }
      await enviar();
      msg.textContent = 'Carga concluída: ' + itens.length + ' documentos conferidos, ' + mudou + ' novos ou alterados.';
    } catch (e) { msg.textContent = 'A carga parou: ' + (e && e.message || e); }
    campo.disabled = false; campo.value = '';
  }

  async function telaAcessos(main) {
    titulo('Acessos');
    if (!estado.acessos.length && !estado.carregando) { main.innerHTML = '<div class="vazio">Carregando os acessos…</div>'; await carregarAcessos(); }
    var linhas = ordenar(estado.acessos).map(function (a) {
      var st = situacao(a), eu = a.email === estado.eu.email, ac = [];
      if (!a.ativo) ac.push('<button class="btn" data-a="reativar" data-e="' + esc(a.email) + '">Reativar</button>');
      else {
        if (a.senha_criada) ac.push('<button class="btn" data-a="redefinir" data-e="' + esc(a.email) + '">Enviar link de nova senha</button>');
        else ac.push('<button class="btn pri" data-a="convidar" data-e="' + esc(a.email) + '">' + (a.convidado_em ? 'Reenviar convite' : 'Enviar convite') + '</button>');
        ac.push('<button class="btn" data-a="gerar_link" data-e="' + esc(a.email) + '">Gerar link</button>');
        if (!eu) ac.push('<button class="btn perigo" data-a="tirar" data-e="' + esc(a.email) + '">Tirar acesso</button>');
      }
      var extra = '';
      if (estado.confirmar === a.email) extra = '<div class="confirmar">Tirar o acesso de ' + esc(a.nome) + '? Ele sai do app na hora e não entra mais até você reativar.<div class="linha-acoes"><button class="btn perigo" data-a="tirar_ok" data-e="' + esc(a.email) + '">Sim, tirar acesso</button><button class="btn" data-a="cancelar">Cancelar</button></div></div>';
      if (estado.link && estado.link.email === a.email) extra = '<div class="msg aviso" style="margin-top:8px">Link de uso único para ' + esc(a.nome) + ' (vale por tempo limitado; mande só para ele):<input readonly value="' + esc(estado.link.link) + '" data-sens style="margin-top:6px"><div class="linha-acoes" style="margin-top:6px"><button class="btn" data-a="copiar">Copiar o link</button></div></div>';
      return '<tr class="' + (a.ativo ? '' : 'desligado') + '"><td class="c-nome"><b>' + esc(a.nome) + '</b><span class="s" data-sens>' + esc(a.email) + '</span>' + (a.painel ? '<span class="s">painel: ' + esc(a.painel) + '</span>' : '') + '</td>' +
        '<td data-r="Papel">' + esc(a.papel) + '</td><td data-r="Situação"><span class="pill ' + st[1] + '">' + st[0] + '</span>' + (a.convidado_em && !a.senha_criada ? '<span class="s">convite ' + dataHora(a.convidado_em) + '</span>' : '') + '</td>' +
        '<td data-r="Último acesso">' + dataHora(a.ultimo_acesso) + '</td><td class="c-acoes"><div class="linha-acoes">' + ac.join('') + '</div>' + extra + '</td></tr>';
    }).join('');
    var reg = estado.registro.slice(0, 20).map(function (r) { return '<li>' + dataHora(r.quando) + ' · ' + esc(r.acao) + (r.email ? ' · <span data-sens>' + esc(r.email) + '</span>' : '') + (r.detalhe ? ' · ' + esc(r.detalhe) : '') + '</li>'; }).join('');
    main.innerHTML =
      '<div class="linha-acoes" style="justify-content:space-between;margin-bottom:12px"><p class="s" style="margin:0">' + estado.acessos.length + ' acessos · senhas ficam cifradas no Supabase; ninguém as lê.</p><button class="btn" id="atualizar">Atualizar</button></div>' +
      '<div class="lista-acessos"><div class="ordenar">Ordenar por: ' + COLS.map(function (c) { return '<button data-o="' + c[0] + '">' + c[1] + seta(c[0]) + '</button>'; }).join('') + '</div>' +
      '<table class="ac"><thead><tr>' + COLS.map(function (c) { return '<th><button data-o="' + c[0] + '">' + c[1] + seta(c[0]) + '</button></th>'; }).join('') + '<th>Ações</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
      '<div class="sec cartao"><h2>Cadastrar acesso</h2><form id="novo" class="grade" novalidate style="align-items:end">' +
      '<label>Nome<input name="nome" required></label><label>E-mail (é o login)<input name="email" type="email" required></label>' +
      '<label>Papel<select name="papel"><option value="corretor">Corretor</option><option value="diretor">Diretor</option><option value="gestor">Gestor</option></select></label>' +
      '<label>Painel (ex.: hugo)<input name="painel"></label><button class="btn pri" type="submit">Cadastrar</button></form><p class="s">Cadastrar não envia nada; o convite sai só quando você clicar em Enviar convite.</p></div>' +
      '<div class="sec cartao"><h2>Carga de dados dos painéis</h2><p class="s">Arquivo de carga (.json) preparado pelo Claude. Grava os documentos dos painéis no banco; nada é apagado e o que já está igual não muda.</p>' +
      '<input type="file" id="arqCarga" accept="application/json,.json"><p class="s" id="cargaMsg" role="status" aria-live="polite"></p></div>' +
      '<div class="sec cartao"><h2>Registro</h2>' + (reg ? '<ol class="registro">' + reg + '</ol>' : '<p class="s">Nada registrado ainda.</p>') + '</div>';

    $('#arqCarga').onchange = function () { carga(this); };
    main.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { var c = b.dataset.o; estado.ordem = { campo: c, dir: estado.ordem.campo === c ? -estado.ordem.dir : 1 }; telaAcessos(main); }; });
    $('#atualizar').onclick = async function () { estado.link = null; estado.confirmar = null; await carregarAcessos(); telaAcessos(main); };
    $('#novo').onsubmit = async function (e) {
      e.preventDefault(); var f = this;
      try { await chamar({ acao: 'cadastrar', nome: f.nome.value.trim(), email: f.email.value.trim(), papel: f.papel.value, painel: f.painel.value.trim() || null }); toast('Cadastrado.'); await carregarAcessos(); telaAcessos(main); }
      catch (err) { toast('Erro: ' + err.message); }
    };
    main.querySelectorAll('[data-a]').forEach(function (b) {
      b.onclick = async function () {
        var a = b.dataset.a, email = b.dataset.e;
        if (a === 'cancelar') { estado.confirmar = null; return telaAcessos(main); }
        if (a === 'tirar') { estado.confirmar = email; estado.link = null; return telaAcessos(main); }
        if (a === 'copiar') { try { await navigator.clipboard.writeText(estado.link.link); toast('Link copiado.'); } catch (e) { toast('Copie o link manualmente.'); } return; }
        b.disabled = true;
        try {
          if (a === 'tirar_ok') { await chamar({ acao: 'tirar_acesso', email: email }); estado.confirmar = null; toast('Acesso tirado.'); }
          else if (a === 'gerar_link') { var d = await chamar({ acao: 'gerar_link', email: email }); estado.link = { email: email, link: d.link }; }
          else { await chamar({ acao: a, email: email }); toast(a === 'reativar' ? 'Acesso reativado.' : 'E-mail enviado para ' + email + '.'); }
          await carregarAcessos();
        } catch (err) { toast('Erro: ' + err.message); }
        telaAcessos(main);
      };
    });
  }

  iniciar();
})();
