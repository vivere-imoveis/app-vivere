/* pendencias.js — Pendências do corretor no painel do app da Vivere (15/11/2026, tarefa vis-enderecos-completos-agenciadores, F2).
   Botão "Pendências" no cabeçalho (e na lateral) abre uma tela por cima do painel com:
   - Imóveis: o que falta em cada imóvel do corretor (endereço completo, características, valores, proprietário) e o
     formulário para informar o que falta. A correção grava na camada imoveis_correcoes do Supabase e vale na hora no CRM,
     no HUB, no site e na ficha do Drive.
   - Leads: os que estão sem contato registrado em 48 h ou parados há 7 dias.
   O banco só devolve a lista do que falta (nenhum dado do imóvel ou do proprietário). O painel.js do modelo não muda. */
(function () {
  'use strict';
  var GRUPOS = { endereco: 'Endereço', caracteristicas: 'Características', valores: 'Valores', anuncio: 'Anúncio', proprietario: 'Proprietário' };
  var ORDEM_G = ['endereco', 'caracteristicas', 'valores', 'proprietario', 'anuncio'];
  // campos que o corretor informa aqui: rótulo, tipo de entrada e dica
  var CAMPOS = {
    cep: { t: 'CEP', tipo: 'cep', ph: '88000-000' },
    logradouro: { t: 'Rua (logradouro)', tipo: 'txt', ph: 'Ex.: Rua das Gaivotas' },
    numero: { t: 'Número', tipo: 'txt', ph: 'Ex.: 125 ou S/N' },
    complemento: { t: 'Unidade / complemento', tipo: 'txt', ph: 'Ex.: Ap 302, Bloco B' },
    edificio: { t: 'Nome do condomínio', tipo: 'txt', ph: 'Ex.: Residencial Atlântico' },
    dormitorios: { t: 'Dormitórios', tipo: 'int' },
    banheiros: { t: 'Banheiros', tipo: 'int' },
    garagem: { t: 'Vagas', tipo: 'int' },
    privativa: { t: 'Área privativa (m²)', tipo: 'num', ph: 'Ex.: 85,50' },
    terreno: { t: 'Área do terreno (m²)', tipo: 'num', ph: 'Ex.: 360' },
    condominio: { t: 'Condomínio (R$/mês)', tipo: 'num', ph: 'Ex.: 650,00' },
    iptu: { t: 'IPTU (R$/ano)', tipo: 'num', ph: 'Ex.: 1.200,00' },
    celular: { t: 'Celular do proprietário', tipo: 'tel', ph: '(48) 99999-0000', dono: true },
    email: { t: 'E-mail do proprietário', tipo: 'email', ph: 'nome@exemplo.com', dono: true },
    cpf: { t: 'CPF/CNPJ do proprietário', tipo: 'doc', ph: 'Só números', dono: true, sens: true }
  };
  var FORA = { descricao: 'A descrição passa pela aprovação da diretoria: peça pela aba Solicitações.',
    proprietario: 'O proprietário é vinculado no Imobibrasil: avise o William ou o Nicollas.' };

  var dados = null, carregando = false, erroCarga = '', aba = 'imoveis', filtro = '', aberto = null, porPag = lePorPag(), pag = 0;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lePorPag() { try { var v = +localStorage.getItem('pend.porPag'); return v === 100 ? 100 : 50; } catch (e) { return 50; } }
  function ponte() { return window.VIVERE_PONTE; }
  function toast(t) { var el = document.getElementById('toast'); if (!el) return; el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 4200); }
  function dataBR(s) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s || ''); return m ? m[3] + '/' + m[2] + (m[4] ? ' ' + m[4] + 'h' + m[5] : '') : ''; }
  function total() { return dados ? (dados.imoveis || []).length + (dados.leads || []).length : null; }

  function carrega() {
    var P = ponte(); if (!P || !P.pendencias || carregando) return Promise.resolve();
    carregando = true;
    return P.pendencias().then(function (d) { dados = d || { imoveis: [], leads: [] }; erroCarga = ''; },
      function (e) { erroCarga = (e && e.message) || 'erro'; })
      .then(function () { carregando = false; pintaBotao(); if (tela()) desenha(); });
  }

  /* ---------- botão do cabeçalho ---------- */
  function pintaBotao() {
    var tema = document.getElementById('btnTema'); if (!tema) return;
    var b = document.getElementById('btnPendApp');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.id = 'btnPendApp'; b.className = 'btn-tema btn-pend';
      b.addEventListener('click', abrir);
      tema.parentNode.insertBefore(b, tema);
    }
    var n = total();
    var h = '<span class="bp-ic" aria-hidden="true">⚠</span><span class="bp-t">Pendências</span>' +
      (n == null ? '' : '<span class="bp-n' + (n ? ' tem' : '') + '"><b>' + n + '</b></span>');
    if (b.innerHTML !== h) { b.innerHTML = h; if (window.MenuLateral) MenuLateral.atualiza(); }
    var rot = n == null ? 'Abrir as pendências dos seus imóveis e leads' : n ? n + ' pendência' + (n === 1 ? '' : 's') + ' nos seus imóveis e leads. Abrir.' : 'Nenhuma pendência. Abrir.';
    if (b.title !== rot) { b.title = rot; b.setAttribute('aria-label', rot); }
  }

  /* ---------- tela ---------- */
  function tela() { return document.getElementById('pendTela'); }
  function abrir() {
    var t = tela();
    if (!t) {
      t = document.createElement('div'); t.id = 'pendTela'; t.className = 'pend-tela';
      t.setAttribute('role', 'dialog'); t.setAttribute('aria-modal', 'true'); t.setAttribute('aria-labelledby', 'pendTit');
      t.innerHTML = '<div class="pend-caixa" tabindex="-1"><div class="pend-topo"><h2 id="pendTit">Pendências</h2>' +
        '<button type="button" class="b" data-pend="fechar" aria-label="Fechar as pendências">✕ Fechar</button></div><div class="pend-corpo" id="pendCorpo"></div></div>';
      t.addEventListener('click', clique); t.addEventListener('submit', salvar); t.addEventListener('change', muda);
      document.body.appendChild(t);
    }
    t.hidden = false; document.documentElement.classList.add('pend-aberta');
    desenha(); carrega();
    var cx = t.querySelector('.pend-caixa'); if (cx) cx.focus();
  }
  function fechar() { var t = tela(); if (t) t.hidden = true; document.documentElement.classList.remove('pend-aberta'); aberto = null; var b = document.getElementById('btnPendApp'); if (b) b.focus(); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && tela() && !tela().hidden) fechar(); });

  function desenha() {
    var c = document.getElementById('pendCorpo'); if (!c) return;
    if (!dados) { c.innerHTML = '<div class="vazio">' + (erroCarga ? 'Não deu para ler as pendências agora (' + esc(erroCarga) + '). <button type="button" class="b" data-pend="reler">Tentar de novo</button>' : 'Carregando as pendências…') + '</div>'; return; }
    var im = dados.imoveis || [], ld = dados.leads || [];
    var h = '<p class="pend-sub">Complete o que falta e a Vivere passa a ter o cadastro completo: o que você informar aqui já vale no CRM, no HUB, no site e na ficha do Drive. ' +
      (dados.painel ? '<span class="mut">Painel: ' + esc(dados.painel) + (dados.gerado_em ? ' · ' + esc(dataBR(dados.gerado_em)) : '') + '</span>' : '') + '</p>';
    h += '<div class="chips pend-abas" role="tablist">' +
      '<button type="button" role="tab" data-pend-aba="imoveis" aria-pressed="' + (aba === 'imoveis') + '">Imóveis (' + im.length + ')</button>' +
      '<button type="button" role="tab" data-pend-aba="leads" aria-pressed="' + (aba === 'leads') + '">Leads (' + ld.length + ')</button></div>';
    h += aba === 'imoveis' ? listaImoveis(im) : listaLeads(ld);
    c.innerHTML = h;
    enche();
  }
  // grade sem linha incompleta: o último cartão estica até a borda (padrão dos apps, 08/11/2026)
  function enche() {
    [].forEach.call(document.querySelectorAll('.pend-lista'), function (g) {
      var f = g.children, n = f.length; if (!n) return;
      [].forEach.call(f, function (x) { x.style.gridColumn = ''; });
      var cols = getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length || 1, resto = n % cols;
      if (resto) f[n - 1].style.gridColumn = 'span ' + (cols - resto + 1);
    });
  }
  window.addEventListener('resize', function () { if (tela() && !tela().hidden) enche(); });

  function listaImoveis(im) {
    if (!im.length) return '<div class="vazio">Nenhum imóvel com pendência. 👏</div>';
    var cont = {}; im.forEach(function (x) { var vistos = {}; (x.faltam || []).forEach(function (f) { if (!vistos[f.grupo]) { vistos[f.grupo] = 1; cont[f.grupo] = (cont[f.grupo] || 0) + 1; } }); });
    var h = '<div class="chips pend-filtro"><button type="button" data-pend-f="" aria-pressed="' + (!filtro) + '">Todos (' + im.length + ')</button>';
    ORDEM_G.forEach(function (g) { if (cont[g]) h += '<button type="button" data-pend-f="' + g + '" aria-pressed="' + (filtro === g) + '">' + GRUPOS[g] + ' (' + cont[g] + ')</button>'; });
    h += '</div>';
    var lista = filtro ? im.filter(function (x) { return (x.faltam || []).some(function (f) { return f.grupo === filtro; }); }) : im;
    var nPag = Math.max(1, Math.ceil(lista.length / porPag)); if (pag >= nPag) pag = nPag - 1;
    var fatia = lista.slice(pag * porPag, (pag + 1) * porPag);
    h += '<div class="pend-lista">' + fatia.map(cartaoImovel).join('') + '</div>';
    if (lista.length > 50) h += paginador(lista.length, nPag);
    return h;
  }
  function paginador(n, nPag) {
    var h = '<div class="pend-pag"><span class="mut">' + n + ' imóveis · página ' + (pag + 1) + ' de ' + nPag + '</span>';
    h += '<button type="button" class="b" data-pend="ant"' + (pag ? '' : ' disabled') + '>‹ Anterior</button>';
    h += '<button type="button" class="b" data-pend="prox"' + (pag < nPag - 1 ? '' : ' disabled') + '>Próxima ›</button>';
    h += '<label class="c pend-pp">Por página <select data-pend="porpag"><option' + (porPag === 50 ? ' selected' : '') + '>50</option><option' + (porPag === 100 ? ' selected' : '') + '>100</option></select></label></div>';
    return h;
  }
  function cartaoImovel(x) {
    var por = {}; (x.faltam || []).forEach(function (f) { (por[f.grupo] = por[f.grupo] || []).push(f); });
    var h = '<article class="cartao pend-im" data-id="' + esc(x.id) + '"><div class="pend-im-topo"><div><b class="pend-ref">' + esc(x.ref || x.id) + '</b> <span class="mut">' + esc([x.tipo, x.bairro].filter(Boolean).join(' · ')) + '</span>' +
      (x.orfao ? '<div class="pend-orfao">Agenciador fora da equipe' + (x.agenciador ? ' (' + esc(x.agenciador) + ')' : '') + ': fica com a diretoria</div>' : '') +
      '</div><span class="pill ' + (x.n >= 5 ? 'alta' : 'media') + '">' + x.n + ' pendência' + (x.n === 1 ? '' : 's') + '</span></div><div class="pend-grupos">';
    ORDEM_G.forEach(function (g) { if (por[g]) h += '<div class="pend-g"><span class="pend-g-t">' + GRUPOS[g] + '</span><span class="chips2">' + por[g].map(function (f) { return '<span>' + esc(f.rotulo) + '</span>'; }).join('') + '</span></div>'; });
    h += '</div>';
    if (aberto === x.id) h += formulario(x);
    else h += '<div class="pend-acao"><button type="button" class="b p" data-pend="informar">Informar o que falta</button></div>';
    return h + '</article>';
  }
  function formulario(x) {
    var campos = [], foras = [];
    (x.faltam || []).forEach(function (f) { if (CAMPOS[f.campo]) campos.push(f.campo); else if (FORA[f.campo]) foras.push(FORA[f.campo]); });
    var h = '<form class="pend-form" data-id="' + esc(x.id) + '" novalidate><div class="form">';
    campos.forEach(function (k) {
      var c = CAMPOS[k], tipo = c.tipo === 'int' ? 'number' : c.tipo === 'email' ? 'email' : c.tipo === 'tel' ? 'tel' : 'text';
      var modo = c.tipo === 'int' || c.tipo === 'cep' || c.tipo === 'doc' ? 'numeric' : c.tipo === 'num' ? 'decimal' : c.tipo === 'tel' ? 'tel' : c.tipo === 'email' ? 'email' : 'text';
      h += '<label class="c' + (k === 'logradouro' ? ' pend-largo' : '') + '">' + esc(c.t) + '<input name="' + k + '" type="' + tipo + '" inputmode="' + modo + '"' +
        (c.tipo === 'int' ? ' min="0" max="99" step="1"' : '') + (c.ph ? ' placeholder="' + esc(c.ph) + '"' : '') + (c.sens ? ' data-sens' : '') +
        ' autocomplete="off" maxlength="' + (c.tipo === 'txt' ? 120 : 40) + '"></label>';
    });
    h += '</div>';
    if (foras.length) h += '<ul class="pend-fora">' + foras.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    h += '<p class="mut pend-aviso">Preencha só o que você sabe; o que ficar em branco continua pendente. Dados do proprietário vão só para a diretoria.</p>';
    h += '<div class="pend-acao"><button type="button" class="b" data-pend="cancelar">Cancelar</button>' + (campos.length ? '<button type="submit" class="b p">Salvar</button>' : '') + '</div><p class="pend-msg" role="status" aria-live="polite"></p></form>';
    return h;
  }
  function listaLeads(ld) {
    if (!ld.length) return '<div class="vazio">Nenhum lead parado. 👏</div>';
    var h = '<p class="mut pend-sub2">Registre cada contato na aba <b>Leads</b> (ligação, WhatsApp ou visita) e mude a etapa: o lead sai daqui sozinho.</p><div class="pend-lista">';
    h += ld.slice(0, 200).map(function (l) {
      return '<article class="cartao pend-ld"><div class="pend-im-topo"><div><b class="sens">' + esc(l.nome || 'Lead sem nome') + '</b> <span class="pill">' + esc(l.etapa || '') + '</span></div>' +
        '<span class="pill ' + (l.motivo === 'sem_contato_48h' ? 'alta' : 'media') + '">' + esc(l.rotulo) + '</span></div>' +
        '<div class="mut">' + (l.motivo === 'sem_contato_48h' ? 'Entrou em ' : 'Última atualização em ') + esc(dataBR(l.desde)) + '</div></article>';
    }).join('');
    return h + '</div>' + (ld.length > 200 ? '<p class="mut">Mostrando 200 de ' + ld.length + '.</p>' : '');
  }

  /* ---------- ações ---------- */
  function clique(e) {
    if (e.target === tela()) return fechar();
    var a = e.target.closest('[data-pend],[data-pend-aba],[data-pend-f]'); if (!a || a.tagName === 'SELECT') return;
    if (a.hasAttribute('data-pend-aba')) { aba = a.getAttribute('data-pend-aba'); aberto = null; return desenha(); }
    if (a.hasAttribute('data-pend-f')) { filtro = a.getAttribute('data-pend-f'); pag = 0; aberto = null; return desenha(); }
    var acao = a.getAttribute('data-pend'), card = a.closest('[data-id]');
    if (acao === 'fechar') return fechar();
    if (acao === 'reler') { erroCarga = ''; desenha(); return carrega(); }
    if (acao === 'ant') { pag = Math.max(0, pag - 1); return desenha(); }
    if (acao === 'prox') { pag++; return desenha(); }
    if (acao === 'informar' && card) { aberto = card.getAttribute('data-id'); desenha(); var f = tela().querySelector('.pend-form input'); if (f) f.focus(); return; }
    if (acao === 'cancelar') { aberto = null; return desenha(); }
  }
  function muda(e) { if (e.target.getAttribute('data-pend') === 'porpag') { porPag = +e.target.value === 100 ? 100 : 50; pag = 0; try { localStorage.setItem('pend.porPag', String(porPag)); } catch (x) { } desenha(); } }

  function numBR(v) { // "85.5" / "85,5" / "1.200" → "85,50" / "1.200,00"
    var s = String(v).trim().replace(/\s|R\$/g, ''); if (!s) return '';
    if (/,/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    var n = Number(s); if (!isFinite(n) || n < 0) return null;
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function normaliza(k, v) {
    var c = CAMPOS[k]; v = String(v || '').trim(); if (!v) return '';
    if (c.tipo === 'cep') { var d = v.replace(/\D/g, ''); return d.length === 8 ? d.slice(0, 5) + '-' + d.slice(5) : null; }
    if (c.tipo === 'int') return /^\d{1,2}$/.test(v) ? String(+v) : null;
    if (c.tipo === 'num') return numBR(v);
    if (c.tipo === 'tel') { var t = v.replace(/\D/g, ''); return t.length >= 10 && t.length <= 13 ? t : null; }
    if (c.tipo === 'doc') { var x = v.replace(/\D/g, ''); return x.length === 11 || x.length === 14 ? x : null; }
    if (c.tipo === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? v : null;
    return v.replace(/\s+/g, ' ');
  }
  function salvar(e) {
    var f = e.target; if (!f.classList.contains('pend-form')) return; e.preventDefault();
    var id = f.getAttribute('data-id'), campos = {}, dono = {}, ruins = [], n = 0, msg = f.querySelector('.pend-msg');
    [].forEach.call(f.querySelectorAll('input[name]'), function (i) {
      var k = i.name, v = normaliza(k, i.value);
      i.removeAttribute('aria-invalid');
      if (v === null) { ruins.push(CAMPOS[k].t); i.setAttribute('aria-invalid', 'true'); return; }
      if (!v) return;
      n++; if (CAMPOS[k].dono) dono[k] = v; else campos[k] = v;
    });
    if (ruins.length) { msg.textContent = 'Confira: ' + ruins.join(', ') + '.'; return; }
    if (!n) { msg.textContent = 'Preencha pelo menos um campo.'; return; }
    var bt = f.querySelector('button[type="submit"]'); if (bt) { bt.disabled = true; bt.textContent = 'Salvando…'; }
    msg.textContent = '';
    ponte().corrigir(id, campos, dono).then(function (r) {
      aberto = null;
      toast('Gravado (' + ((r && r.gravados) || []).length + ' campo' + (((r && r.gravados) || []).length === 1 ? '' : 's') + '). O CRM, o HUB, o site e a ficha do Drive já mostram.');
      return carrega();
    }, function (er) {
      if (bt) { bt.disabled = false; bt.textContent = 'Salvar'; }
      msg.textContent = 'Não gravou: ' + ((er && er.message) || 'tente de novo') + '.';
    });
  }

  /* ---------- lateral (menu-lateral.js) ---------- */
  var E0 = window.MENU_LATERAL_EXTRAS || { itens: function () { return []; }, abre: function (h) { location.href = h; } };
  window.MENU_LATERAL_EXTRAS = {
    itens: function () { var n = total(); return [{ id: 'pendencias', t: 'Pendências', ic: 'alerta', href: '#pendencias', n: n == null ? '' : String(n) }].concat(E0.itens ? E0.itens() || [] : []); },
    abre: function (href) { if (href === '#pendencias') return abrir(); return E0.abre ? E0.abre(href) : (location.href = href); }
  };

  function liga() {
    var abas = document.getElementById('abas'); if (!abas) return;
    pintaBotao();
    new MutationObserver(function () { if (!document.getElementById('btnPendApp')) pintaBotao(); }).observe(document.querySelector('.marca') || abas, { childList: true });
    carrega(); setInterval(function () { if (!document.hidden) carrega(); }, 240000);
    if (/[?&]pendencias=1\b/.test(location.search)) abrir();
  }
  window.PENDENCIAS = { abrir: abrir, fechar: fechar, reler: carrega };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
})();
