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
  var VERSAO = 'app-vivere 2026-11-23.1'; // 2FA: código do autenticador no login e Segurança da conta (seguranca.js) · antes: 'app-vivere 2026-11-22.2'; // Site sem os Destaques (ficam só no HUB) · 2026-11-22.1: central de login: só a escolha de painel, HUB e site (tarefa vis-app-inicio-central-login) · antes: 'app-vivere 2026-11-19.1'; // melhorias 122 (só o V no cabeçalho) e 123 (menu lateral com animação leve) · antes: // aba Estudo de Mercado (ACM, tarefa vivere-parecer-preco-comparaveis)

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

  var estado = { sessao: null, eu: null, aba: (codParam || abaParam === 'acaptar') ? 'acaptar' : (abaParam === 'senha' || abaParam === 'seguranca' || abaParam === 'acessos' || abaParam === 'destaques' || abaParam === 'acm' || abaParam === 'semresp' || abaParam === 'site') ? abaParam : 'inicio', acessos: [], registro: [], ordem: { campo: 'nome', dir: 1 }, link: null, confirmar: null, carregando: false };

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
    /* 23/11/2026 (2FA, fatia 1): conta com autenticador e sessão ainda sem o código → nada é lido antes do código */
    estado.precisaCodigo = !!estado.sessao && !!window.SEGURANCA && await window.SEGURANCA.precisaCodigo(sb);
    if (estado.precisaCodigo) { estado.eu = null; return desenhar(); }
    if (estado.sessao && !estado.eu) {
      var q = await sb.from('acessos').select('email,nome,papel,painel,ativo,hub').eq('user_id', estado.sessao.user.id).maybeSingle();
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
    if (estado.precisaCodigo) { abas.hidden = true; return window.SEGURANCA.telaCodigo(main, { sb: sb, esc: esc, titulo: titulo, sair: sair }, function () { estado.precisaCodigo = false; iniciar(); }); }
    if (modoSenha) { abas.hidden = true; return telaSenha(main, true); }
    if (!estado.eu || !estado.eu.ativo) {
      abas.hidden = true; titulo('Acesso não liberado');
      main.innerHTML = '<div class="form cartao"><h2>Acesso não liberado</h2><div class="msg erro">Este login não tem acesso ativo ao app da Vivere. Fale com a diretoria.</div><button class="btn" id="sair">Sair</button></div>';
      $('#sair').onclick = sair; return;
    }
    /* 22/11/2026 (pedido do Cleiton): esta página é a central de login. No Início não há menu: só os cartões de escolha
       (painel, HUB, site e minha conta). As telas A CAPTAR, Estudo de Mercado, Sem responsável, Minha senha, Acessos e Destaques
       continuam abrindo pelo endereço (?aba=…), que é como o painel as chama; nelas o menu mostra só a volta à central. */
    var volta = ''; try { volta = sessionStorage.getItem('painel.volta') || ''; } catch (e) { }
    if (!/^painel\.html(\?ver=[a-z0-9_-]{1,40})?$/.test(volta)) volta = '';
    var dst = window.DESTAQUES && window.DESTAQUES.pode(estado.eu);
    var NOMES = { acaptar: 'A CAPTAR', semresp: 'Imóveis sem responsável', acm: 'Estudo de Mercado', senha: 'Minha senha', seguranca: 'Segurança da conta', acessos: 'Acessos', destaques: 'Destaques do site', site: 'Site' };
    if (estado.aba === 'site' && !souDiretoria()) estado.aba = 'inicio';
    if ((estado.aba === 'destaques' && !dst) || (estado.aba === 'acessos' && estado.eu.papel !== 'gestor')) estado.aba = 'inicio';
    if (estado.aba === 'inicio' || !NOMES[estado.aba]) { estado.aba = 'inicio'; abas.hidden = true; abas.innerHTML = ''; }
    else {
      var lista = [['inicio', 'Central']];
      if (estado.aba === 'destaques' && souDiretoria()) lista.push(['site', 'Site']);
      lista.push([estado.aba, NOMES[estado.aba]]);
      if (volta) lista.push(['painel', volta.indexOf('?ver=') > 0 ? 'Painel · ' + esc(volta.split('?ver=')[1]) : 'Voltar ao painel']);
      abas.hidden = false;
      abas.innerHTML = lista.map(function (a) { return '<button role="tab" data-aba="' + a[0] + '" aria-selected="' + (estado.aba === a[0]) + '">' + a[1] + '</button>'; }).join('');
      abas.querySelectorAll('button').forEach(function (b) { b.onclick = function () { if (b.dataset.aba === 'painel') { location.href = volta; return; } estado.aba = b.dataset.aba; estado.link = null; estado.confirmar = null; desenhar(); }; });
    }
    if (estado.aba === 'site') return telaSite(main);
    if (estado.aba === 'senha') return telaSenha(main, false);
    if (estado.aba === 'seguranca' && window.SEGURANCA) return window.SEGURANCA.tela(main, contexto());
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

  /* ---------- Central (Início) — 22/11/2026 ----------
     Corretor: o painel dele. Diretoria (diretor e gestor): o próprio painel (com a aba Gestor), a lista dos painéis dos
     corretores (painel.html?ver=…, o banco confere de novo), o HUB VIVERE (quem tem a marca hub) e a tela Site.
     Minha conta fica em todos; a segurança da conta (2FA, fatia 1) entra neste mesmo cartão. */
  var SITE_NOVO = 'https://vivere-site.cleitonpazds.workers.dev/';
  var SITE_ATUAL = 'https://www.viverenapraia.com.br/';
  var SITE_GITHUB = 'https://github.com/vivere-imoveis/vivere-site';
  function souDiretoria() { return !!estado.eu && (estado.eu.papel === 'gestor' || estado.eu.papel === 'diretor'); }
  function abrePainel() { return estado.eu.papel === 'gestor' || estado.oficial; }
  function irPainel(aba) { try { sessionStorage.removeItem('painel.volta'); if (aba) sessionStorage.setItem('painel.aba', aba); } catch (e) { } location.href = 'painel.html'; }

  function cartaoPainel() {
    if (estado.eu.papel === 'gestor') return '<div class="cartao"><h3>Painel do gestor</h3><p>A visão geral de todos os painéis e o seu painel.</p><div class="linha-acoes"><button class="btn pri" id="irGestor">Abrir o painel do gestor</button></div></div>';
    if (abrePainel()) return '<div class="cartao"><h3>Meu painel</h3><p>' + (souDiretoria() ? 'O seu painel e a aba Gestor, com a visão de todos.' : 'Seus leads, imóveis, ofertas e tarefas.') + '</p><div class="linha-acoes"><button class="btn pri" id="irPainel">Abrir o meu painel</button></div></div>';
    return '<div class="cartao"><h3>Meu painel</h3><p>O seu painel do corretor vai abrir aqui, com o mesmo login.</p><span class="pill warn">Em construção</span></div>';
  }
  function cartaoPaineis() {
    if (!souDiretoria() || !abrePainel()) return '';
    return '<div class="cartao cartao-largo"><h3>Painéis dos corretores</h3><p id="pnResumo">Carregando a lista…</p><div class="linha-acoes lista-paineis" id="pnLista"></div></div>';
  }
  function cartaoHub() {
    if (!(estado.eu.papel === 'gestor' || estado.eu.hub)) return '';
    return '<div class="cartao"><h3>HUB VIVERE</h3><p>Imóveis, locações, leads, metas e pendências da Vivere.</p><div class="linha-acoes"><a class="btn pri" href="hub/">Abrir o HUB</a></div></div>';
  }
  function cartaoSite() {
    if (!souDiretoria()) return '';
    return '<div class="cartao"><h3>Site</h3><p>Atualizações e construções do site próprio.</p><div class="linha-acoes"><button class="btn pri" id="irSite">Abrir o site</button></div></div>';
  }
  function cartaoConta() {
    return '<div class="cartao"><h3>Minha conta</h3><p data-sens>' + esc(estado.eu.email) + '</p><div class="linha-acoes"><button class="btn" id="irSenha">Trocar senha</button><button class="btn" id="irSeg">Segurança (2FA)</button><button class="btn" id="sair">Sair</button></div></div>';
  }

  /* Grade sem espaço vazio (padrão de 08/11/2026): os cartões curtos ocupam uma linha só no computador (colunas = quantidade,
     até 4) e, no celular (2 por linha), o último curto de uma quantidade ímpar estica até a borda. O cartão largo vem depois. */
  function grade(curtos, largo) {
    var L = curtos.filter(Boolean), n = Math.min(Math.max(L.length, 1), 4);
    if (L.length % 2) L[L.length - 1] = L[L.length - 1].replace('<div class="cartao"', '<div class="cartao estica-cel"');
    return '<div class="grade grade-central" style="--n:' + n + '">' + L.join('') + (largo || '') + '</div>';
  }

  function telaInicio(main) {
    titulo('Olá, ' + (estado.eu.nome || '').split(' ')[0]);
    main.innerHTML = grade([cartaoPainel(), cartaoHub(), cartaoSite(), cartaoConta()], cartaoPaineis()) + '<p class="s" style="margin-top:24px">' + VERSAO + '</p>';
    $('#sair').onclick = sair;
    $('#irSenha').onclick = function () { estado.aba = 'senha'; desenhar(); };
    $('#irSeg').onclick = function () { estado.aba = 'seguranca'; desenhar(); };
    if ($('#irGestor')) $('#irGestor').onclick = function () { irPainel('gestor'); };
    if ($('#irPainel')) $('#irPainel').onclick = function () { irPainel(''); };
    if ($('#irSite')) $('#irSite').onclick = function () { estado.aba = 'site'; desenhar(); };
    if ($('#pnLista')) listarPaineis();
  }

  /* Lista dos painéis: o mesmo registro controle/info que a aba Gestor usa. O banco só entrega à diretoria. */
  async function listarPaineis() {
    var r = await sb.from('painel_docs').select('painel,dados').eq('colecao', 'controle').eq('doc_id', 'info').neq('painel', '_comum').not('painel', 'like', 'u:%').not('painel', 'like', 'g:%').neq('painel', 'mestre')
      .then(function (x) { return x; }, function () { return { error: true }; });
    var p = $('#pnResumo'), box = $('#pnLista'); if (!p || !box) return;
    if (!r || r.error) { p.textContent = 'Não deu para carregar a lista agora. Recarregue a página.'; return; }
    var L = (r.data || []).filter(function (x) { return x.painel && x.painel !== estado.eu.painel; }).map(function (x) {
      var d = x.dados || {}; return { slug: x.painel, nome: String(d.corretor || d.saudacao || x.painel).trim(), ordem: typeof d.ordem === 'number' ? d.ordem : 999 };
    });
    L.sort(function (a, b) { return a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'); });
    if (!L.length) { p.textContent = 'Nenhum painel de corretor ainda.'; return; }
    p.textContent = L.length + ' painéis. Abra o de cada corretor (só leitura nos leads).';
    box.innerHTML = L.map(function (x) { return '<a class="btn" href="painel.html?ver=' + encodeURIComponent(x.slug) + '">' + esc(x.nome) + '</a>'; }).join('');
    box.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { try { sessionStorage.removeItem('painel.volta'); sessionStorage.removeItem('painel.aba'); } catch (e) { } }); });
  }

  /* Tela Site (22/11/2026): o site no ar, a prévia do site próprio e o repositório das construções (só quem tem acesso no
     GitHub consegue abrir). Os destaques da home ficam só no HUB (pedido do Cleiton, 22/11/2026, 21h49). */
  function telaSite(main) {
    titulo('Site');
    main.innerHTML = grade([
      '<div class="cartao"><h3>Site próprio (novo)</h3><p>A versão nova, em construção, com o que já foi publicado.</p><div class="linha-acoes"><a class="btn pri" href="' + SITE_NOVO + '" target="_blank" rel="noopener">Abrir o site novo</a></div></div>',
      '<div class="cartao"><h3>Site atual</h3><p>O site no ar hoje, pelo Imobibrasil, até a virada do domínio.</p><div class="linha-acoes"><a class="btn" href="' + SITE_ATUAL + '" target="_blank" rel="noopener">Abrir o site atual</a></div></div>',
      '<div class="cartao"><h3>Construções e melhorias</h3><p>O código e as mudanças do site, no GitHub. Abre só para quem tem acesso ao repositório.</p><div class="linha-acoes"><a class="btn" href="' + SITE_GITHUB + '" target="_blank" rel="noopener">Abrir no GitHub</a></div></div>']);
  }

  function contexto() { return { sb: sb, eu: estado.eu, sessaoUid: estado.sessao.user.id, esc: esc, toast: toast, titulo: titulo }; }

  async function sair() { if (window.ACAPTAR) window.ACAPTAR.sair(); if (window.SEMRESP) window.SEMRESP.sair(); if (window.DESTAQUES) window.DESTAQUES.sair(); if (window.ACM) window.ACM.sair(); if (window.ACESSOS) window.ACESSOS.sair(); if (window.SEGURANCA) window.SEGURANCA.sair(); try { indexedDB.deleteDatabase('vivere-painel'); } catch (e) { } await sb.auth.signOut(); estado.eu = null; estado.sessao = null; desenhar(); }

  iniciar();
})();
