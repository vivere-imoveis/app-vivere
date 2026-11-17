/* pendencias.js — Pendências do corretor no painel do app da Vivere (15/11/2026, tarefa vis-enderecos-completos-agenciadores, F2).
   Botão "Pendências" no cabeçalho (e na lateral) abre uma tela por cima do painel com:
   - Imóveis: o que falta em cada imóvel do corretor (endereço completo, características, valores, proprietário) e o
     formulário para informar o que falta. A correção grava na camada imoveis_correcoes do Supabase e vale na hora no CRM,
     no HUB, no site e na ficha do Drive.
   - Leads: os que estão sem contato registrado em 48 h ou parados há 7 dias.
   O banco só devolve a lista do que falta (nenhum dado do imóvel ou do proprietário). O painel.js do modelo não muda. */
(function () {
  'use strict';
  var GRUPOS = { endereco: 'Endereço', caracteristicas: 'Características', valores: 'Valores', anuncio: 'Anúncio', proprietario: 'Proprietário', divulgacao: 'Placa e lazer' };
  var ORDEM_G = ['endereco', 'caracteristicas', 'valores', 'proprietario', 'divulgacao', 'anuncio'];
  // P2 (16/11/2026, vis-vivian-cadastro-imovel-ia): placa da Vivere em todo imóvel e áreas de lazer em condomínio, prédio e
  // loteamento, também nos já cadastrados. As fotos vão pela Vivian (o envio de arquivos pelo app não está ligado).
  var PLACA = [['sim', 'Sim, já colocada'], ['ainda_nao', 'Ainda não'], ['nao_permitido', 'Não é permitido']];
  var LAZER = [['tem', 'Tem área de lazer'], ['nao_tem', 'Não tem área de lazer'], ['ja_no_anuncio', 'As fotos do lazer já estão no anúncio'], ['nao_e_cond', 'Não é condomínio, prédio nem loteamento']];
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
      .then(function () { carregando = false; pintaBotao(); if (tela() && !tela().hidden && !aberto) desenha(); });
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
  document.addEventListener('keydown', function (e) {
    var t = tela(); if (!t || t.hidden) return;
    if (e.key === 'Escape') return fechar();
    if (e.key !== 'Tab') return;
    var f = [].filter.call(t.querySelectorAll('button:not([disabled]),input,select,a[href]'), function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

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
    var campos = [], foras = [], fPlaca = null, fLazer = null;
    (x.faltam || []).forEach(function (f) {
      if (f.grupo === 'divulgacao' && f.campo === 'placa') fPlaca = f; else if (f.grupo === 'divulgacao' && f.campo === 'lazer') fLazer = f;
      else if (CAMPOS[f.campo]) campos.push(f.campo); else if (FORA[f.campo]) foras.push(FORA[f.campo]);
    });
    var h = '<form class="pend-form" data-id="' + esc(x.id) + '" novalidate><div class="form">';
    campos.forEach(function (k) {
      var c = CAMPOS[k], tipo = c.tipo === 'int' ? 'number' : c.tipo === 'email' ? 'email' : c.tipo === 'tel' ? 'tel' : 'text';
      var modo = c.tipo === 'int' || c.tipo === 'cep' || c.tipo === 'doc' ? 'numeric' : c.tipo === 'num' ? 'decimal' : c.tipo === 'tel' ? 'tel' : c.tipo === 'email' ? 'email' : 'text';
      h += '<label class="c' + (k === 'logradouro' ? ' pend-largo' : '') + '">' + esc(c.t) + '<input name="' + k + '" type="' + tipo + '" inputmode="' + modo + '"' +
        (c.tipo === 'int' ? ' min="0" max="99" step="1"' : '') + (c.ph ? ' placeholder="' + esc(c.ph) + '"' : '') + (c.sens ? ' data-sens' : '') +
        ' autocomplete="off" maxlength="' + (c.tipo === 'txt' ? 120 : 40) + '"></label>';
    });
    h += '</div>';
    if (fPlaca || fLazer) h += blocoDivulg(fPlaca, fLazer);
    if (foras.length) h += '<ul class="pend-fora">' + foras.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    h += '<p class="mut pend-aviso">Preencha só o que você sabe; o que ficar em branco continua pendente. Dados do proprietário vão só para a diretoria.</p>';
    h += '<div class="pend-acao"><button type="button" class="b" data-pend="cancelar">Cancelar</button>' + (campos.length || fPlaca || fLazer ? '<button type="submit" class="b p">Salvar</button>' : '') + '</div><p class="pend-msg" role="status" aria-live="polite"></p></form>';
    return h;
  }
  function opcoes(lista) { return '<option value="">Escolha…</option>' + lista.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join(''); }
  function hoje() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function blocoDivulg(fPlaca, fLazer) {
    var h = '<div class="form pend-div">';
    if (fPlaca) h += '<label class="c pend-largo">Placa da Vivere' + (fPlaca.rotulo !== 'Placa da Vivere' ? ' <span class="mut">(' + esc(fPlaca.rotulo) + ')</span>' : '') + '<select name="placa_sit">' + opcoes(PLACA) + '</select></label>' +
      '<label class="c" data-se="sim" hidden>Data em que foi colocada<input name="placa_data" type="date" max="' + hoje() + '" min="2015-01-01"></label>' +
      '<label class="c pend-largo" data-se="nao_permitido" hidden>Motivo (quem não deixa e por quê)<input name="placa_motivo" type="text" maxlength="300" placeholder="Ex.: o condomínio não deixa placa na fachada" autocomplete="off"></label>' +
      '<p class="mut pend-largo" data-se="sim" hidden>A foto da placa vai pela Vivian: mande no WhatsApp dela dizendo a ref do imóvel.</p>';
    if (fLazer) h += '<label class="c pend-largo">Áreas de lazer' + (fLazer.rotulo !== 'Fotos das áreas de lazer' ? ' <span class="mut">(' + esc(fLazer.rotulo) + ')</span>' : '') + '<select name="lazer_sit">' + opcoes(LAZER) + '</select></label>' +
      '<p class="mut pend-largo" data-se-lazer="tem" hidden>Mande pelo menos 3 fotos das áreas de lazer e de uso comum (piscina, salão, academia, playground, fachada, hall) no WhatsApp da Vivian, dizendo a ref do imóvel.</p>';
    return h + '</div>';
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
  function muda(e) {
    var nm = e.target.name;
    if (nm === 'placa_sit' || nm === 'lazer_sit') {
      var f = e.target.closest('.pend-form'), at = nm === 'placa_sit' ? 'data-se' : 'data-se-lazer';
      if (f) [].forEach.call(f.querySelectorAll('[' + at + ']'), function (el) { el.hidden = el.getAttribute(at) !== e.target.value; });
      return;
    }
    if (e.target.getAttribute('data-pend') === 'porpag') { porPag = +e.target.value === 100 ? 100 : 50; pag = 0; try { localStorage.setItem('pend.porPag', String(porPag)); } catch (x) { } desenha(); } }

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
    var placa = {}, lazer = {};
    [].forEach.call(f.querySelectorAll('[name="placa_data"],[name="placa_motivo"]'), function (i) { i.removeAttribute('aria-invalid'); });
    var sp = f.querySelector('select[name="placa_sit"]'), sl = f.querySelector('select[name="lazer_sit"]');
    if (sp && sp.value) {
      placa.situacao = sp.value;
      var dt = f.querySelector('input[name="placa_data"]'), mo = f.querySelector('input[name="placa_motivo"]');
      if (sp.value === 'sim' && dt && dt.value) { if (dt.value > hoje() || dt.value < '2015-01-01') { ruins.push('Data da placa'); dt.setAttribute('aria-invalid', 'true'); } else placa.data = dt.value; }
      if (sp.value === 'nao_permitido') { var m = mo ? mo.value.trim().replace(/\s+/g, ' ') : ''; if (!m) { ruins.push('Motivo de não poder colocar a placa'); if (mo) mo.setAttribute('aria-invalid', 'true'); } else placa.motivo = m; }
      n++;
    }
    if (sl && sl.value) { lazer.situacao = sl.value; n++; }
    [].forEach.call(f.querySelectorAll('input[name]'), function (i) {
      var k = i.name; if (!CAMPOS[k]) return;
      var v = normaliza(k, i.value);
      i.removeAttribute('aria-invalid');
      if (v === null) { ruins.push(CAMPOS[k].t); i.setAttribute('aria-invalid', 'true'); return; }
      if (!v) return;
      n++; if (CAMPOS[k].dono) dono[k] = v; else campos[k] = v;
    });
    if (ruins.length) { msg.textContent = 'Confira: ' + ruins.join(', ') + '.'; return; }
    if (!n) { msg.textContent = 'Preencha pelo menos um campo.'; return; }
    var bt = f.querySelector('button[type="submit"]'); if (bt) { bt.disabled = true; bt.textContent = 'Salvando…'; }
    msg.textContent = '';
    var temCampos = Object.keys(campos).length || Object.keys(dono).length, temDiv = placa.situacao || lazer.situacao;
    var passo1 = temCampos ? ponte().corrigir(id, campos, dono) : Promise.resolve({ gravados: [] }), ngFeito = 0;
    passo1.then(function (r) {
      var ng = ((r && r.gravados) || []).length; ngFeito = ng;
      if (!temDiv) return { ng: ng };
      if (!ponte().divulgacao) throw new Error('atualize a página (versão nova do app)');
      return ponte().divulgacao(id, placa.situacao ? placa : null, lazer.situacao ? lazer : null).then(function (d) { return { ng: ng, d: d }; });
    }).then(function (o) {
      aberto = null;
      var falta = o.d ? [o.d.falta_placa, o.d.falta_lazer].filter(Boolean) : [];
      toast('Gravado' + (o.ng ? ' (' + o.ng + ' campo' + (o.ng === 1 ? '' : 's') + ')' : '') + (o.d ? (o.ng ? ' + ' : ': ') + [placa.situacao ? 'placa' : '', lazer.situacao ? 'áreas de lazer' : ''].filter(Boolean).join(' e ') : '') + '.' +
        (falta.length ? ' Ainda falta: ' + falta.join('; ') + (/foto/i.test(falta.join(' ')) ? ' (fotos pela Vivian).' : '.') : ' O CRM e o HUB já mostram.'));
      return carrega();
    }, function (er) {
      if (bt) { bt.disabled = false; bt.textContent = 'Salvar'; }
      msg.textContent = (ngFeito ? 'Os campos foram gravados, mas a placa e o lazer não: ' : 'Não gravou: ') + ((er && er.message) || 'tente de novo') + '.';
      if (ngFeito) carrega();
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
