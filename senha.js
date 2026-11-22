/* senha.js — tela "Minha senha" do app da Vivere como módulo (22/11/2026), para abrir igual no app (index.html) e dentro
   do painel (painel-app.js › abreNativo, também no PAINEL DO GESTOR do claude.ai, onde a troca passa pela ponte do conector).
   Também guarda o campo de senha com o botão de olho (2026-11-15.1, sugestão nº 26 do Jorlei), usado no login do app.
   window.SENHA.tela(raiz, ctx, op): ctx = { sb, esc, toast, titulo, email }; op = { primeira, aoSalvar } */
(function () {
  'use strict';
  var OLHO_ABERTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var OLHO_FECHADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.1 10.1 0 0 1 12 19c-7 0-11-7-11-7a18.5 18.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 7 11 7a18.6 18.6 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  var escP = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function campo(rotulo, nome, auto, extra) {
    return '<label>' + rotulo + '<span class="senha-campo"><input type="password" name="' + nome + '" autocomplete="' + auto + '"' + (extra || '') + ' required>' +
      '<button type="button" class="ver-senha" aria-label="Mostrar a senha" aria-pressed="false" title="Mostrar a senha">' + OLHO_ABERTO + '</button></span></label>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.ver-senha'); if (!b) return;
    e.preventDefault();
    var i = b.parentNode.querySelector('input'); if (!i) return;
    var mostrar = i.type === 'password';
    i.type = mostrar ? 'text' : 'password';
    b.setAttribute('aria-pressed', mostrar ? 'true' : 'false');
    b.setAttribute('aria-label', mostrar ? 'Ocultar a senha' : 'Mostrar a senha'); b.title = b.getAttribute('aria-label');
    b.innerHTML = mostrar ? OLHO_FECHADO : OLHO_ABERTO;
    i.focus();
  });
  function tela(raiz, ctx, op) {
    op = op || {}; var esc = ctx.esc || escP, primeira = !!op.primeira;
    if (ctx.titulo) ctx.titulo(primeira ? 'Criar sua senha' : 'Minha senha');
    raiz.innerHTML = '<form class="form cartao" novalidate><h2>' + (primeira ? 'Crie a sua senha' : 'Trocar minha senha') + '</h2>' +
      '<p class="s">Mínimo de 8 caracteres. Use uma senha só sua, que você não usa em outro lugar.</p>' +
      '<input type="email" name="username" autocomplete="username" value="' + esc(ctx.email || '') + '" hidden>' +
      campo('Nova senha', 's1', 'new-password', ' minlength="8"') +
      campo('Repita a senha', 's2', 'new-password', ' minlength="8"') + '<div class="msg-senha" role="status" aria-live="polite"></div>' +
      '<button class="btn pri" type="submit">Salvar a senha</button></form>';
    var f = raiz.querySelector('form'), m = raiz.querySelector('.msg-senha');
    f.onsubmit = async function (e) {
      e.preventDefault(); var s1 = f.s1.value, s2 = f.s2.value;
      if (s1.length < 8) { m.innerHTML = '<div class="msg erro">A senha precisa de pelo menos 8 caracteres.</div>'; return; }
      if (s1 !== s2) { m.innerHTML = '<div class="msg erro">As duas senhas não são iguais.</div>'; return; }
      var b = f.querySelector('button[type="submit"]'); b.disabled = true;
      var r;
      try { r = await ctx.sb.auth.updateUser({ password: s1 }); } catch (x) { r = { error: x }; }
      b.disabled = false;
      if (r.error) { m.innerHTML = '<div class="msg erro">Não deu para salvar: ' + esc(r.error.message || r.error) + '</div>'; return; }
      f.s1.value = ''; f.s2.value = '';
      if (ctx.toast) ctx.toast('Senha salva.');
      if (op.aoSalvar) op.aoSalvar(); else m.innerHTML = '<div class="msg ok">Senha salva. Use a nova no próximo login.</div>';
    };
  }
  window.SENHA = { campo: campo, tela: tela };
})();
