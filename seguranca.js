/* seguranca.js — "Segurança da conta" (2FA) e a tela do código no login do app da Vivere (23/11/2026, fatia 1 do plano
   claude/seguranca/PLANO_2FA_BLOQUEIO_2026-11-22.md). Autenticador por QR Code (Google ou Microsoft Authenticator), pelo
   Supabase Auth (TOTP). Nenhum código, segredo ou QR é guardado: o QR fica só na tela enquanto a pessoa cadastra.
   window.SEGURANCA.precisaCodigo(sb) → true se a conta tem 2FA e a sessão ainda não passou pelo código
   window.SEGURANCA.telaCodigo(raiz, ctx, aoEntrar)  — login: pede os 6 dígitos (ctx = { sb, esc, titulo, sair })
   window.SEGURANCA.tela(raiz, ctx)                 — Minha conta › Segurança da conta (ctx = { sb, esc, toast, titulo }) */
(function () {
  'use strict';
  var escP = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var soDigitos = function (v) { return String(v || '').replace(/\D/g, '').slice(0, 6); };
  var dataBR = function (iso) { if (!iso) return ''; var d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  function campoCodigo(nome) {
    return '<label>Código de 6 dígitos<input name="' + nome + '" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required class="campo-codigo" placeholder="000000"></label>';
  }
  function msgErro(e) {
    var m = String((e && (e.message || e.msg)) || e || '');
    if (/invalid|incorrect|expired|não confere/i.test(m)) return 'Código não confere. Use o código que está na tela agora e confira se a hora do celular está automática.';
    if (/rate|too many|limit/i.test(m)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
    if (/aal2|AAL2/.test(m)) return 'Para mexer nisso, entre de novo usando o código do autenticador.';
    if (/fetch|network|Failed/i.test(m)) return 'Sem conexão agora. Tente de novo em instantes.';
    return 'Não deu certo: ' + m;
  }

  async function precisaCodigo(sb) {
    try {
      var r = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      return !!(r && r.data && r.data.nextLevel === 'aal2' && r.data.currentLevel !== 'aal2');
    } catch (e) { return false; }
  }

  async function fatores(sb) {
    var r = await sb.auth.mfa.listFactors();
    if (r.error) throw r.error;
    return (r.data && r.data.totp) || [];
  }

  /* ---------- Login: o código depois da senha ---------- */
  var vezCodigo = 0;
  async function telaCodigo(raiz, ctx, aoEntrar) {
    var esc = ctx.esc || escP, minha = ++vezCodigo;   /* o app pode desenhar duas vezes seguidas: só a última chamada desenha */
    if (ctx.titulo) ctx.titulo('Código do autenticador');
    if (raiz.querySelector('form.tela-codigo')) return;   /* já está na tela: não apaga o que a pessoa digitou */
    raiz.innerHTML = '<div class="form cartao"><div class="vazio">Carregando…</div></div>';
    var L = [];
    try { L = await fatores(ctx.sb); } catch (e) { }
    if (minha !== vezCodigo) return;
    var escolha = L.length > 1 ? '<label>Aparelho<select name="fator">' + L.map(function (f) { return '<option value="' + esc(f.id) + '">' + esc(f.friendly_name || 'Autenticador') + '</option>'; }).join('') + '</select></label>' : '';
    raiz.innerHTML = '<form class="form cartao tela-codigo" novalidate><h2>Código do autenticador</h2>' +
      '<p class="s">Esta conta tem a verificação em duas etapas ligada. Abra o aplicativo autenticador no celular e digite o código da Vivere.</p>' +
      escolha + campoCodigo('codigo') + '<div class="msg-cod" role="status" aria-live="polite"></div>' +
      '<button class="btn pri" type="submit">Confirmar</button>' +
      '<details class="s" style="margin-top:10px"><summary>Perdi o celular ou troquei de aparelho</summary><p>Se você cadastrou um 2º aparelho, use o código dele. Se não, peça ao gestor da Vivere para zerar o seu 2FA na tela Acessos; depois você cadastra de novo em Minha conta.</p></details>' +
      '<button class="link" type="button" data-sair>Sair</button></form>';
    var f = raiz.querySelector('form'), m = raiz.querySelector('.msg-cod'), cod = f.codigo;
    cod.addEventListener('input', function () { var v = soDigitos(cod.value); if (cod.value !== v) cod.value = v; if (v.length === 6) f.requestSubmit ? f.requestSubmit() : f.onsubmit(new Event('submit')); });
    raiz.querySelector('[data-sair]').onclick = function () { if (ctx.sair) ctx.sair(); };
    setTimeout(function () { try { cod.focus(); } catch (e) { } }, 50);
    var enviando = false;
    f.onsubmit = async function (e) {
      if (e && e.preventDefault) e.preventDefault();
      if (enviando) return;
      var v = soDigitos(cod.value);
      if (v.length !== 6) { m.innerHTML = '<div class="msg erro">Digite os 6 dígitos.</div>'; return; }
      var id = f.fator ? f.fator.value : (L[0] && L[0].id);
      if (!id) { m.innerHTML = '<div class="msg erro">Não achei o autenticador desta conta. Saia e entre de novo.</div>'; return; }
      enviando = true; var b = f.querySelector('button[type=submit]'); b.disabled = true;
      var r;
      try { r = await ctx.sb.auth.mfa.challengeAndVerify({ factorId: id, code: v }); } catch (x) { r = { error: x }; }
      enviando = false; b.disabled = false; cod.value = '';
      if (r.error) { m.innerHTML = '<div class="msg erro">' + esc(msgErro(r.error)) + '</div>'; cod.focus(); return; }
      if (aoEntrar) aoEntrar();
    };
  }

  /* ---------- Minha conta › Segurança da conta ---------- */
  var ativo = { raiz: null, ctx: null, cadastro: null };

  async function tela(raiz, ctx) {
    ativo.raiz = raiz; ativo.ctx = ctx; ativo.cadastro = null;
    return desenhar();
  }

  var vezTela = 0;
  async function desenhar() {
    var raiz = ativo.raiz, ctx = ativo.ctx, esc = ctx.esc || escP, minha = ++vezTela;
    if (ctx.titulo) ctx.titulo('Segurança da conta');
    if (ativo.cadastro) return desenharCadastro();
    raiz.innerHTML = '<div class="form cartao"><div class="vazio">Carregando…</div></div>';
    var L, nivel = null;
    try { L = await fatores(ctx.sb); } catch (e) { raiz.innerHTML = '<div class="form cartao"><div class="msg erro">' + esc(msgErro(e)) + '</div></div>'; return; }
    try { var a = await ctx.sb.auth.mfa.getAuthenticatorAssuranceLevel(); nivel = a && a.data && a.data.currentLevel; } catch (e) { }
    if (minha !== vezTela || ativo.raiz !== raiz) return;
    var lista = L.map(function (f) {
      return '<li class="fator"><span><b>' + esc(f.friendly_name || 'Autenticador') + '</b><span class="s">cadastrado em ' + esc(dataBR(f.created_at)) + '</span></span>' +
        '<button class="btn perigo" type="button" data-tirar="' + esc(f.id) + '" data-nome="' + esc(f.friendly_name || 'Autenticador') + '">Remover</button></li>';
    }).join('');
    raiz.innerHTML = '<div class="form cartao seg2fa"><h2>Verificação em duas etapas</h2>' +
      (L.length
        ? '<div class="msg ok">Ligada. No login, depois da senha, o app pede o código do autenticador.</div><ul class="fatores">' + lista + '</ul>' +
          '<p class="s">Recomendado: cadastre também um 2º aparelho (outro celular, tablet ou o autenticador de outra pessoa de confiança) para não ficar sem acesso se perder o celular.</p>' +
          '<button class="btn" type="button" id="seg-add">Cadastrar outro aparelho</button>'
        : '<p>Com ela ligada, o app pede, além da senha, o código de 6 dígitos que só o seu celular mostra.</p>' +
          '<ol class="passos s"><li>Instale no celular o <b>Google Authenticator</b> ou o <b>Microsoft Authenticator</b> (grátis).</li><li>Toque em Ativar e leia o QR Code com o aplicativo.</li><li>Digite o código de 6 dígitos que aparecer.</li></ol>' +
          '<button class="btn pri" type="button" id="seg-add">Ativar</button>') +
      '<div class="msg-seg" role="status" aria-live="polite"></div></div>';
    raiz.querySelector('#seg-add').onclick = iniciarCadastro;
    raiz.querySelectorAll('[data-tirar]').forEach(function (b) {
      b.onclick = function () {
        var box = raiz.querySelector('.msg-seg');
        if (L.length === 1) box.innerHTML = '<div class="confirmar">Remover o único aparelho desliga a verificação em duas etapas desta conta. Confirma?<div class="linha-acoes"><button class="btn perigo" type="button" data-ok>Sim, remover</button><button class="btn" type="button" data-nao>Cancelar</button></div></div>';
        else box.innerHTML = '<div class="confirmar">Remover "' + esc(b.dataset.nome) + '"? Ele deixa de gerar códigos válidos.<div class="linha-acoes"><button class="btn perigo" type="button" data-ok>Sim, remover</button><button class="btn" type="button" data-nao>Cancelar</button></div></div>';
        box.querySelector('[data-nao]').onclick = function () { box.innerHTML = ''; };
        box.querySelector('[data-ok]').onclick = async function () {
          this.disabled = true;
          var r; try { r = await ctx.sb.auth.mfa.unenroll({ factorId: b.dataset.tirar }); } catch (x) { r = { error: x }; }
          if (r.error) { box.innerHTML = '<div class="msg erro">' + esc(msgErro(r.error)) + '</div>'; return; }
          try { await ctx.sb.auth.refreshSession(); } catch (x) { }
          if (ctx.toast) ctx.toast('Aparelho removido.');
          desenhar();
        };
      };
    });
    if (L.length && nivel !== 'aal2') raiz.querySelector('.msg-seg').innerHTML = '<div class="msg aviso">Para cadastrar ou remover aparelhos, saia e entre de novo usando o código.</div>';
  }

  async function iniciarCadastro() {
    var ctx = ativo.ctx, raiz = ativo.raiz, esc = ctx.esc || escP, box = raiz.querySelector('.msg-seg');
    var L = []; try { L = await fatores(ctx.sb); } catch (e) { }
    try {   /* cadastro abandonado (sem Cancelar) deixa autenticador não confirmado: some antes de começar outro */
      var t = await ctx.sb.auth.mfa.listFactors(), soltos = ((t && t.data && t.data.all) || []).filter(function (f) { return f.status !== 'verified'; });
      for (var i = 0; i < soltos.length; i++) { try { await ctx.sb.auth.mfa.unenroll({ factorId: soltos[i].id }); } catch (e) { } }
    } catch (e) { }
    var nome = (L.length ? 'Aparelho ' + (L.length + 1) : 'Celular') + ' · ' + new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var r; try { r = await ctx.sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: nome, issuer: 'Vivere' }); } catch (x) { r = { error: x }; }
    if (r.error || !r.data || !r.data.totp) { if (box) box.innerHTML = '<div class="msg erro">' + esc(msgErro(r.error || 'sem QR Code')) + '</div>'; return; }
    ativo.cadastro = { id: r.data.id, qr: r.data.totp.qr_code, segredo: r.data.totp.secret, nome: nome };
    desenharCadastro();
  }

  function desenharCadastro() {
    var raiz = ativo.raiz, ctx = ativo.ctx, esc = ctx.esc || escP, c = ativo.cadastro;
    /* o Supabase devolve "data:image/svg+xml;utf-8,<svg…>" sem codificar: refaz o endereço codificado para a imagem abrir sempre */
    var svg = String(c.qr || ''), i = svg.indexOf('<svg');
    var qr = i >= 0 ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.slice(i)) : svg;
    var grupos = String(c.segredo || '').replace(/(.{4})/g, '$1 ').trim();
    raiz.innerHTML = '<form class="form cartao seg2fa" novalidate><h2>Ler o QR Code</h2>' +
      '<p class="s">No aplicativo autenticador, toque em <b>+</b> (Adicionar) › <b>Ler código QR</b> e aponte para a imagem.</p>' +
      '<div class="qr-caixa"><img alt="QR Code para o aplicativo autenticador" width="200" height="200"></div>' +
      '<details class="s"><summary>Não consigo ler o QR (estou no próprio celular)</summary><p>No aplicativo, escolha <b>Inserir chave de configuração</b> e digite esta chave (tipo: baseada em tempo):</p><p class="chave-2fa" data-sens>' + esc(grupos) + '</p></details>' +
      campoCodigo('codigo') + '<div class="msg-cad" role="status" aria-live="polite"></div>' +
      '<div class="linha-acoes"><button class="btn pri" type="submit">Confirmar e ativar</button><button class="btn" type="button" data-cancelar>Cancelar</button></div></form>';
    raiz.querySelector('.qr-caixa img').src = qr;
    var f = raiz.querySelector('form'), m = raiz.querySelector('.msg-cad'), cod = f.codigo;
    cod.addEventListener('input', function () { var v = soDigitos(cod.value); if (cod.value !== v) cod.value = v; });
    raiz.querySelector('[data-cancelar]').onclick = async function () {
      var id = c.id; ativo.cadastro = null;
      try { await ctx.sb.auth.mfa.unenroll({ factorId: id }); } catch (e) { }   /* fator não confirmado: some sem deixar rastro */
      desenhar();
    };
    f.onsubmit = async function (e) {
      e.preventDefault();
      var v = soDigitos(cod.value);
      if (v.length !== 6) { m.innerHTML = '<div class="msg erro">Digite os 6 dígitos que o aplicativo mostra.</div>'; return; }
      var b = f.querySelector('button[type=submit]'); b.disabled = true;
      var r; try { r = await ctx.sb.auth.mfa.challengeAndVerify({ factorId: c.id, code: v }); } catch (x) { r = { error: x }; }
      b.disabled = false; cod.value = '';
      if (r.error) { m.innerHTML = '<div class="msg erro">' + esc(msgErro(r.error)) + '</div>'; return; }
      ativo.cadastro = null;   /* o QR e a chave saem da memória da tela */
      if (ctx.toast) ctx.toast('Verificação em duas etapas ativada.');
      desenhar();
    };
  }

  window.SEGURANCA = { precisaCodigo: precisaCodigo, telaCodigo: telaCodigo, tela: tela, sair: function () { ativo.cadastro = null; ativo.raiz = null; } };
})();
