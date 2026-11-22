/* App da Vivere — fatia 2 (09/11/2026): login, criar/trocar senha e tela de Acessos do gestor.
   Sem dados neste repositório: tudo vem do Supabase, protegido pelo login e pelas regras de cada corretor.
   A chave abaixo é a publicável (feita para ficar no navegador); a chave secreta fica só no Supabase. */
(function () {
  'use strict';
  var SB_URL = 'https://jucnlzznbwjthlqqgdlz.supabase.co';
  var SB_CHAVE = 'sb_publishable_N26mrhHO44DyqfD6L28HEQ__uei3fNj';
  var APP_URL = location.origin + location.pathname;
  /* 22/11/2026 (pedido do Cleiton): ?embed=1 = esta página aberta numa janela dentro do painel (A CAPTAR, Estudo de
     Mercado, Minha senha, Acessos). Some o topo e o menu desta página; um link para o painel fecha a janela. */
  var EMBED = /[?&]embed=1\b/.test(location.search) && window.parent !== window;
  if (EMBED) {
    document.documentElement.classList.add('embed');
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href]'); if (!a) return;
      var h = a.getAttribute('href') || '';
      if (/^painel\.html/.test(h) && !a.target) { ev.preventDefault(); try { window.parent.postMessage({ vivere: 'fechar-janela' }, location.origin); } catch (e) { } }
    }, true);
  }
  var VERSAO = 'app-vivere 2026-11-19.1'; // melhorias 122 (só o V no cabeçalho) e 123 (menu lateral com animação leve) · antes: // aba Estudo de Mercado (ACM, tarefa vivere-parecer-preco-comparaveis)

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
  /* 18/11/2026 (ACM): ?aba=acm&ref=AP146 abre um estudo novo para o anúncio; ?aba=acm&estudo=ACM-2026-0001 abre o estudo */
  var acmParams = abaParam === 'acm' ? { ref: (new URLSearchParams(location.search).get('ref') || '').trim().slice(0, 30), estudo: (new URLSearchParams(location.search).get('estudo') || '').trim().slice(0, 40) } : null;
  if (abaParam) history.replaceState(null, '', APP_URL + location.hash);

  var estado = { sessao: null, eu: null, aba: (codParam || abaParam === 'acaptar') ? 'acaptar' : (abaParam === 'senha' || abaParam === 'acessos' || abaParam === 'destaques' || abaParam === 'acm' || abaParam === 'semresp') ? abaParam : 'inicio', acessos: [], registro: [], ordem: { campo: 'nome', dir: 1 }, link: null, confirmar: null, carregando: false };

  sb.auth.onAuthStateChange(function (evento, sessao) {
    if (evento === 'PASSWORD_RECOVERY') modoSenha = true;
    var mudou = (!!sessao) !== (!!estado.sessao) || evento === 'PASSWORD_RECOVERY';
    estado.sessao = sessao;
    if (evento === 'SIGNED_OUT') { estado.eu = null; estado.aba = 'inicio'; if (window.ACAPTAR) window.ACAPTAR.sair(); if (window.DESTAQUES) window.DESTAQUES.sair(); if (window.ACM) window.ACM.sair(); }
    if (mudou) setTimeout(iniciar, 0);
  });

  async function iniciar() {
    var r = await sb.auth.getSession();
    estado.sessao = r.data.session;
    if (estado.sessao && !estado.eu) {
      var q = await sb.from('acessos').select('email,nome,papel,painel,ativo').eq('user_id', estado.sessao.user.id).maybeSingle();
      estado.eu = q.data || null;
      // painel oficial no app (depois do corte): só então quem não é gestor abre o próprio painel
      estado.oficial = false;
      if (estado.eu && estado.eu.ativo && estado.eu.painel && estado.eu.papel !== 'gestor') {
        var o = await sb.rpc('meu_painel_oficial').then(function (x) { return x; }, function () { return { error: true }; });
        estado.oficial = !!o && !o.error && o.data === true;
      }
    }
    desenhar();
  }

  /* ---------- Telas ---------- */
  function titulo(t) { $('#titulo').textContent = t; document.title = 'Vivere · ' + t; }

  function desenhar() {
    var main = $('#conteudo'), abas = $('#abas');
    if (erroLink && !estado.sessao) {
      abas.hidden = true; titulo('Link expirado');
      main.innerHTML = '<div class="form cartao"><h2>Link expirado ou já usado</h2><div class="msg aviso">' + esc(decodeURIComponent(erroLink[1].replace(/\+/g, ' '))) + '</div><p>Clique abaixo para receber um link novo no seu e-mail. Use só o e-mail mais recente; os anteriores deixam de valer.</p><button class="btn pri" id="novoLink">Esqueci minha senha</button><button class="link" type="button" id="voltar">Ir para o login</button></div>';
      $('#voltar').onclick = function () { erroLink = null; history.replaceState(null, '', APP_URL); desenhar(); };
      $('#novoLink').onclick = function () { erroLink = null; history.replaceState(null, '', APP_URL); telaEntrar(main, true); };
      return;
    }
    if (!estado.sessao) { abas.hidden = true; return telaEntrar(main); }
    if (modoSenha) { abas.hidden = true; return telaSenha(main, true); }
    if (!estado.eu || !estado.eu.ativo) {
      abas.hidden = true; titulo('Acesso não liberado');
      main.innerHTML = '<div class="form cartao"><h2>Acesso não liberado</h2><div class="msg erro">Este login não tem acesso ativo ao app da Vivere. Fale com a diretoria.</div><button class="btn" id="sair">Sair</button></div>';
      $('#sair').onclick = sair; return;
    }
    var lista = [['inicio', 'Início'], ['acaptar', 'A CAPTAR'], ['semresp', 'Imóveis sem responsável'], ['acm', 'Estudo de Mercado'], ['senha', 'Minha senha']]; /* 19/11/2026: aba Imóveis sem responsável */
    /* quem veio do painel (aba A CAPTAR ou botão Captar) ganha a aba de volta para ele */
    var volta = ''; try { volta = sessionStorage.getItem('painel.volta') || ''; } catch (e) { }
    if (!/^painel\.html(\?ver=[a-z0-9_-]{1,40})?$/.test(volta)) volta = '';
    /* 14/11/2026 (pedido do Cleiton): "Meu painel" sempre no menu para quem já abre o painel (gestor sempre; corretor com o painel oficial). */
    if (!volta && (estado.eu.papel === 'gestor' || estado.oficial)) volta = 'painel.html';
    if (volta) lista.splice(1, 0, ['painel', volta.indexOf('?ver=') > 0 ? 'Painel · ' + esc(volta.split('?ver=')[1]) : 'Meu painel']);
    /* 18/11/2026 (tarefa vis-site-23): Destaques do site para o gestor, o Nícollas e o William; o banco confere de novo */
    var dst = window.DESTAQUES && window.DESTAQUES.pode(estado.eu);
    if (dst) lista.splice(lista.length - 1, 0, ['destaques', 'Destaques do site']);
    if (estado.eu.papel === 'gestor') lista.push(['acessos', 'Acessos']);
    abas.hidden = false;
    abas.innerHTML = lista.map(function (a) { return '<button role="tab" data-aba="' + a[0] + '" aria-selected="' + (estado.aba === a[0]) + '">' + a[1] + '</button>'; }).join('');
    abas.querySelectorAll('button').forEach(function (b) { b.onclick = function () { if (b.dataset.aba === 'painel') { location.href = volta; return; } estado.aba = b.dataset.aba; estado.link = null; estado.confirmar = null; desenhar(); }; });
    if (estado.aba === 'senha') return telaSenha(main, false);
    if (estado.aba === 'acessos' && estado.eu.papel === 'gestor' && window.ACESSOS) return window.ACESSOS.tela(main, contexto()); /* 22/11/2026: acessos.js */
    if (estado.aba === 'destaques' && dst) return window.DESTAQUES.tela(main, contexto());
    if (estado.aba === 'acm' && window.ACM) { var ap = acmParams; acmParams = null; return window.ACM.tela(main, contexto(), ap); }
    if (estado.aba === 'semresp' && window.SEMRESP) return window.SEMRESP.tela(main, contexto());
    if (estado.aba === 'acaptar' && window.ACAPTAR) { var cod = codParam; codParam = ''; try { sessionStorage.removeItem('acaptar-cod'); } catch (e) { } return window.ACAPTAR.tela(main, contexto(), cod); }
    telaInicio(main);
  }

  /* 2026-11-15.1: campo de senha com o botão de olho — desde 22/11/2026 no senha.js (mesma tela no app e no painel) */
  var campoSenha = window.SENHA.campo;

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
      campoSenha('Senha', 'senha', 'current-password') + '<div id="m"></div>' +
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
    return window.SENHA.tela(main, { sb: sb, esc: esc, toast: toast, titulo: titulo, email: estado.sessao.user.email }, {
      primeira: primeira,
      aoSalvar: function () { modoSenha = false; history.replaceState(null, '', APP_URL); estado.aba = 'inicio'; iniciar(); }
    });
  }

  /* Painel do corretor no app: o gestor abre sempre (o dele e, pelo Ver como, o de cada um); quem não é gestor abre o próprio
     depois que o painel dele for marcado como oficial (meu_painel_oficial, no corte de cada painel). */
  function cartaoPainel() {
    if (estado.eu.papel !== 'gestor' && estado.oficial) return '<div class="cartao"><h3>Meu painel</h3><p>Seus leads, imóveis, ofertas e tarefas.</p><div class="linha-acoes"><a class="btn pri" href="painel.html">Abrir o meu painel</a></div></div>';
    if (estado.eu.papel !== 'gestor') return '<div class="cartao"><h3>Meu painel</h3><p>O seu painel do corretor vai abrir aqui, com o mesmo login.</p><span class="pill warn">Em construção</span></div>';
    return '<div class="cartao"><h3>Meu painel</h3><p>O seu painel e, pelo Ver como, o de cada corretor.</p><div class="linha-acoes">' +
      '<a class="btn pri" href="painel.html">Abrir o painel</a></div></div>';
  }

  function telaInicio(main) {
    titulo('Olá, ' + (estado.eu.nome || '').split(' ')[0]);
    main.innerHTML = '<div class="grade">' +
      cartaoPainel() +
      '<div class="cartao"><h3>A CAPTAR</h3><p id="acResumo">Imóveis a captar: os livres e os seus.</p><button class="btn pri" id="irAcaptar">Abrir o A CAPTAR</button></div>' +
      (window.ACM ? '<div class="cartao"><h3>Estudo de Mercado</h3><p id="acmResumo">Comparativo de preço do imóvel com 3 faixas, para vendedor ou comprador.</p><button class="btn pri" id="irAcm">Abrir os estudos</button></div>' : '') +
      (window.DESTAQUES && window.DESTAQUES.pode(estado.eu) ? '<div class="cartao"><h3>Destaques do site</h3><p>Escolha até 8 anúncios para a vitrine da home do site.</p><button class="btn pri" id="irDestaques">Abrir os destaques</button></div>' : '') +
      '<div class="cartao"><h3>Minha conta</h3><p data-sens>' + esc(estado.eu.email) + '</p><div class="linha-acoes"><button class="btn" id="irSenha">Trocar senha</button><button class="btn" id="sair">Sair</button></div></div>' +
      '</div><p class="s" style="margin-top:24px">' + VERSAO + '</p>';
    $('#sair').onclick = sair;
    $('#irSenha').onclick = function () { estado.aba = 'senha'; desenhar(); };
    $('#irAcaptar').onclick = function () { estado.aba = 'acaptar'; desenhar(); };
    if ($('#irDestaques')) $('#irDestaques').onclick = function () { estado.aba = 'destaques'; desenhar(); };
    if ($('#irAcm')) $('#irAcm').onclick = function () { estado.aba = 'acm'; desenhar(); };
    if (window.ACM) window.ACM.resumo(contexto()).then(function (r) { var p = $('#acmResumo'); if (p && r.total) p.textContent = r.total + ' estudo' + (r.total === 1 ? '' : 's') + (r.analise ? ' · ' + r.analise + ' em análise' : '') + '.'; }).catch(function () { });
    if (window.ACAPTAR) window.ACAPTAR.resumo(contexto()).then(function (r) { var p = $('#acResumo'); if (p) p.textContent = r.livres + ' livres para captar · ' + r.minhas + ' em captação por você.'; }).catch(function () { });
  }

  function contexto() { return { sb: sb, eu: estado.eu, sessaoUid: estado.sessao.user.id, esc: esc, toast: toast, titulo: titulo }; }

  async function sair() { if (window.ACAPTAR) window.ACAPTAR.sair(); if (window.SEMRESP) window.SEMRESP.sair(); if (window.DESTAQUES) window.DESTAQUES.sair(); if (window.ACM) window.ACM.sair(); if (window.ACESSOS) window.ACESSOS.sair(); try { indexedDB.deleteDatabase('vivere-painel'); } catch (e) { } await sb.auth.signOut(); estado.eu = null; estado.sessao = null; desenhar(); }

  iniciar();
})();
