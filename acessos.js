/* acessos.js — tela "Acessos" do gestor como módulo (22/11/2026), para abrir igual no app (index.html) e dentro do painel
   (painel-app.js › abreNativo, também no PAINEL DO GESTOR do claude.ai, onde a função acessos-admin passa pela ponte do
   conector — liberada pelo Cleiton em 22/11, 19h12). Código movido do app.js sem mudar o comportamento.
   window.ACESSOS.tela(raiz, ctx): ctx = { sb, eu, esc, toast, titulo }. O banco e a função conferem que é o gestor. */
(function () {
  'use strict';
  var C = { sb: null, eu: null, toast: function () { }, titulo: null };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dataHora = function (iso) { if (!iso) return '—'; var d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  var estado = { acessos: [], registro: [], ordem: { campo: 'nome', dir: 1 }, link: null, confirmar: null, carregando: false };
  async function chamar(corpo) {
    var r = await C.sb.functions.invoke('acessos-admin', { body: corpo });
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
    catch (e) { C.toast('Erro ao carregar: ' + e.message); }
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
    var f = campo.files && campo.files[0], msg = document.getElementById('cargaMsg'); if (!f) return;
    campo.disabled = true;
    try {
      var pac = JSON.parse(await f.text()), itens = pac && pac.itens;
      if (!Array.isArray(itens) || !itens.length) throw new Error('o arquivo não tem a lista de documentos');
      var lote = [], tam = 0, feitos = 0, mudou = 0;
      var enviar = async function () {
        if (!lote.length) return;
        var r = await C.sb.rpc('painel_carga', { p_itens: lote });
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
    if (C.titulo) C.titulo('Acessos');
    if (!estado.acessos.length && !estado.carregando) { main.innerHTML = '<div class="vazio">Carregando os acessos…</div>'; await carregarAcessos(); }
    var linhas = ordenar(estado.acessos).map(function (a) {
      var st = situacao(a), eu = a.email === ((C.eu || {}).email || ''), ac = [];
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

    main.querySelector('#arqCarga').onchange = function () { carga(this); };
    main.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { var c = b.dataset.o; estado.ordem = { campo: c, dir: estado.ordem.campo === c ? -estado.ordem.dir : 1 }; telaAcessos(main); }; });
    main.querySelector('#atualizar').onclick = async function () { estado.link = null; estado.confirmar = null; await carregarAcessos(); telaAcessos(main); };
    main.querySelector('#novo').onsubmit = async function (e) {
      e.preventDefault(); var f = this;
      try { await chamar({ acao: 'cadastrar', nome: f.nome.value.trim(), email: f.email.value.trim(), papel: f.papel.value, painel: f.painel.value.trim() || null }); C.toast('Cadastrado.'); await carregarAcessos(); telaAcessos(main); }
      catch (err) { C.toast('Erro: ' + err.message); }
    };
    main.querySelectorAll('[data-a]').forEach(function (b) {
      b.onclick = async function () {
        var a = b.dataset.a, email = b.dataset.e;
        if (a === 'cancelar') { estado.confirmar = null; return telaAcessos(main); }
        if (a === 'tirar') { estado.confirmar = email; estado.link = null; return telaAcessos(main); }
        if (a === 'copiar') { try { await navigator.clipboard.writeText(estado.link.link); C.toast('Link copiado.'); } catch (e) { C.toast('Copie o link manualmente.'); } return; }
        b.disabled = true;
        try {
          if (a === 'tirar_ok') { await chamar({ acao: 'tirar_acesso', email: email }); estado.confirmar = null; C.toast('Acesso tirado.'); }
          else if (a === 'gerar_link') { var d = await chamar({ acao: 'gerar_link', email: email }); estado.link = { email: email, link: d.link }; }
          else { await chamar({ acao: a, email: email }); C.toast(a === 'reativar' ? 'Acesso reativado.' : 'E-mail enviado para ' + email + '.'); }
          await carregarAcessos();
        } catch (err) { C.toast('Erro: ' + err.message); }
        telaAcessos(main);
      };
    });
  }

  window.ACESSOS = {
    tela: function (raiz, ctx) {
      C = { sb: ctx.sb, eu: ctx.eu, toast: ctx.toast || function () { }, titulo: ctx.titulo || null };
      if (!C.eu || C.eu.papel !== 'gestor') { raiz.innerHTML = '<div class="vazio">Acessos é só do gestor.</div>'; return; }
      estado.link = null; estado.confirmar = null;
      return telaAcessos(raiz);
    },
    sair: function () { estado.acessos = []; estado.registro = []; estado.link = null; estado.confirmar = null; }
  };
})();
