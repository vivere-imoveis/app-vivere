/* captcha.js — barreira contra robôs no login do app (23/11/2026, fatia 4 do plano de 2FA e bloqueio de tentativas).
   1) Captcha grátis da Cloudflare (Turnstile, widget "vivere-app login", modo gerenciado: quase sempre passa sozinho,
      sem clicar). O token vai junto no "Entrar" e no "Esqueci minha senha"; o Supabase confere quando a proteção por
      captcha estiver ligada no painel do Supabase. Antes de ligar, o token é ignorado — por isso este arquivo entra primeiro.
   2) Espera crescente neste aparelho depois de 5 erros seguidos: 30 s, 1 min, 2 min… até 15 min. Acerto zera.
   Se o captcha não carregar (rede ou bloqueio), o login segue sem ele; com a proteção ligada, o Supabase recusa e a
   tela pede para recarregar. Nada de senha ou token fica guardado. */
(function () {
  'use strict';
  var SITEKEY = '0x4AAAAAAGPAAtQJgH7VDVu4';
  var API = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  var CHAVE_ERROS = 'vivere-erros-login';
  var pApi = null;

  function carregaApi() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (pApi) return pApi;
    pApi = new Promise(function (ok) {
      var s = document.createElement('script'); s.src = API; s.async = true;
      var fim = setTimeout(function () { ok(null); }, 8000);
      s.onload = function () { clearTimeout(fim); ok(window.turnstile || null); };
      s.onerror = function () { clearTimeout(fim); ok(null); };
      document.head.appendChild(s);
    });
    return pApi;
  }

  /* monta o captcha dentro do elemento; devolve { token(): Promise<string>, reset() } */
  function montar(el) {
    var id = null, atual = '', esperando = [];
    var entrega = function (t) { atual = t || ''; var e = esperando; esperando = []; e.forEach(function (f) { f(atual); }); };
    var pronto = carregaApi().then(function (ts) {
      if (!ts || !el || !el.isConnected) return null;
      try {
        id = ts.render(el, {
          sitekey: SITEKEY, theme: document.documentElement.dataset.tema === 'escuro' ? 'dark' : 'auto', language: 'pt-br',
          callback: entrega, 'expired-callback': function () { atual = ''; }, 'error-callback': function () { entrega(''); }
        });
      } catch (e) { id = null; }
      return ts;
    });
    return {
      token: function () {
        return pronto.then(function (ts) {
          if (!ts || id == null) return '';
          if (atual) return atual;
          return new Promise(function (ok) { esperando.push(ok); setTimeout(function () { ok(''); }, 15000); });
        });
      },
      reset: function () { atual = ''; pronto.then(function (ts) { if (ts && id != null) { try { ts.reset(id); } catch (e) { } } }); }
    };
  }

  /* ---------- espera crescente depois de erros seguidos (neste aparelho) ---------- */
  function le() { try { return JSON.parse(localStorage.getItem(CHAVE_ERROS) || '{}') || {}; } catch (e) { return {}; } }
  function grava(o) { try { localStorage.setItem(CHAVE_ERROS, JSON.stringify(o)); } catch (e) { } }
  var espera = {
    /* segundos que ainda faltam (0 = pode tentar) */
    falta: function () { var o = le(); return o.ate ? Math.max(0, Math.ceil((o.ate - Date.now()) / 1000)) : 0; },
    erro: function () {
      var o = le(); o.n = (o.n || 0) + 1;
      if (o.n >= 5) o.ate = Date.now() + Math.min(15 * 60, 30 * Math.pow(2, o.n - 5)) * 1000;
      grava(o); return o.n;
    },
    acerto: function () { try { localStorage.removeItem(CHAVE_ERROS); } catch (e) { } },
    texto: function (s) { return s >= 60 ? Math.ceil(s / 60) + ' min' : s + ' s'; }
  };

  window.CAPTCHA = { montar: montar, espera: espera, sitekey: SITEKEY };
})();
