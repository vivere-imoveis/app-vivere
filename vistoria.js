/* Vistoria simples pelo celular, só no app da Vivere (17/11/2026, tarefa vistoria-celular-corretor, fatia F1b).
   Decisões do Cleiton nos cartões de 17/11/2026: só vistorias SIMPLES (periódica, constatação de dano, visita e conferência
   de chaves; entrada e saída seguem com a Rede Vistorias); qualquer corretor faz a de qualquer imóvel da carteira, com quem
   fez e quando; imóveis = locações administradas da carteira (lista própria, RPC vist_carteira, sem dado de inquilino) e o
   botão "Vistoria" na ficha de qualquer imóvel do catálogo; só no app (o painel.js do modelo não muda).
   A vistoria fica no painel de quem fez, coleção `vistorias` (rascunho salvo sozinho; "Enviar" fecha). As fotos sobem pelo
   envio do app (ponte 2026-11-17.4, bucket pedidos-anexos) e aparecem por '/_blob/<id>', que a ponte troca pelo link.
   Depois (F2 e F3): relatório PDF na pasta do imóvel, HUB › Vistorias, dano vira chamado e aviso da Vivian.
   F2b (17/11/2026): botão "Ver PDF" na vistoria enviada, pelo campo `relatorio` que só o robô grava (gatilho vist_trava);
   em rascunho o campo é ignorado, e o link é montado do id do arquivo, nunca do texto do campo. */
(function () {
  'use strict';
  if (window.VistoriaApp) return;
  var VERSAO = 'vistoria 2026-11-17.2';
  var TIPOS = [['periodica', 'Periódica'], ['dano', 'Constatação de dano'], ['visita', 'Visita'], ['chaves', 'Conferência de chaves']];
  var ESTADOS = [['bom', 'Bom'], ['regular', 'Regular'], ['ruim', 'Ruim']];
  var COMODOS = ['Sala', 'Cozinha', 'Quarto', 'Suíte', 'Banheiro', 'Lavabo', 'Área de serviço', 'Varanda', 'Garagem', 'Área externa', 'Fachada'];
  var MAX_FOTOS = 20;
  var V = { db: null, docs: {}, carteira: null, cartErro: '', tela: null, atual: null, sujo: false, timer: null, salvoEm: '', enviando: 0, aviso: '' };

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var P = function () { return window.VIVERE_PONTE || null; };
  var est = function () { try { return (P() && P().estado && P().estado()) || {}; } catch (e) { return {}; } };
  var soLeitura = function () { return !!est().ver; };
  var agora = function () {
    var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };
  var dBR = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}:\d{2}))?/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] : '') : ''; };
  // Relatório PDF (F2b): só em vistoria enviada; o link sai do id do arquivo no Drive, não do texto gravado.
  var urlPdf = function (d) {
    var r = d && d.status === 'enviada' && d.relatorio, id = r && String(r.drive_id || '');
    return id && /^[A-Za-z0-9_-]{10,}$/.test(id) ? 'https://drive.google.com/file/d/' + id + '/view' : '';
  };
  var atrasado = function (d) { // enviada há mais de 30 min sem PDF (horário do aparelho, o mesmo de enviado_em)
    var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(String((d && d.enviado_em) || ''));
    return !!m && Date.now() - new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() > 30 * 60e3;
  };
  var rot = function (lista, k) { for (var i = 0; i < lista.length; i++) if (lista[i][0] === k) return lista[i][1]; return k || ''; };
  var novoId = function () { return 'v-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };

  /* ---------- dados ---------- */
  var ligando = null;
  function ligarDb() { if (!ligando) ligando = ligarDb1().then(function () { if (!V.db) ligando = null; }); return ligando; }
  async function ligarDb1() {
    if (V.db || !window.claude) return;
    try { V.db = await window.claude.use('db'); } catch (e) { V.db = null; }
    if (!V.db) return;
    V.db.collection('vistorias').onSnapshot(function (snap) {
      var n = {};
      snap.forEach(function (d) { n[d.id] = d.data() || {}; });
      V.docs = n;
      if (V.tela === 'lista') desenhar();
      else if (V.tela === 'form' && V.atual && V.atual.status === 'enviada' && n[V.atual.id] && !urlPdf(V.atual) && urlPdf(n[V.atual.id])) {
        V.atual.relatorio = n[V.atual.id].relatorio; desenhar();
      }
    }, function () { });
  }
  async function lerCarteira() {
    var p = P();
    if (!p || !p.carteiraVistoria) { V.cartErro = 'Lista da carteira indisponível.'; return; }
    try { V.carteira = await p.carteiraVistoria(); V.cartErro = ''; }
    catch (e) { V.cartErro = 'Não deu para ler a carteira agora.'; }
    if (V.tela === 'lista') desenhar();
  }
  function gravarAgora() {
    if (!V.atual || !V.db || soLeitura()) return Promise.resolve();
    clearTimeout(V.timer); V.timer = null;
    var a = V.atual; a.atualizado_em = agora();
    var copia = JSON.parse(JSON.stringify(a)); delete copia.id;
    V.sujo = false;
    return V.db.collection('vistorias').doc(a.id).set(copia).then(function () {
      V.salvoEm = a.atualizado_em.slice(11); pintarSalvo('Rascunho salvo às ' + V.salvoEm);
    }, function (e) { V.sujo = true; pintarSalvo('Não salvou: ' + ((e && e.message) || 'erro') + '. Tento de novo ao mexer.'); });
  }
  function mudou() {
    if (!V.atual || V.atual.status === 'enviada') return;
    V.sujo = true; pintarSalvo('Salvando…');
    clearTimeout(V.timer); V.timer = setTimeout(gravarAgora, 1200);
  }
  function pintarSalvo(t) { var el = document.getElementById('vsSalvo'); if (el) el.textContent = t; }

  /* ---------- fotos ---------- */
  function comprimir(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 900000) return Promise.resolve(file);
    return createImageBitmap(file).then(function (bmp) {
      var max = 2560, s = Math.min(1, max / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
      c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (ok) { c.toBlob(function (b) { ok(b || file); }, 'image/jpeg', 0.86); });
    }).catch(function () { return file; });
  }
  async function enviarFotos(i, files) {
    var c = V.atual && V.atual.comodos[i], p = P(), vid = V.atual && V.atual.id;
    if (!c || !p || !p.enviarArquivo) return;
    var lista = Array.prototype.slice.call(files, 0, Math.max(0, MAX_FOTOS - (c.fotos || []).length));
    if (!lista.length) { V.aviso = 'Limite de ' + MAX_FOTOS + ' fotos por cômodo.'; desenhar(); return; }
    V.enviando += lista.length; V.aviso = ''; desenhar();
    for (var k = 0; k < lista.length; k++) {
      try {
        var b = await comprimir(lista[k]);
        var r = await p.enviarArquivo(b, { type: b.type || lista[k].type });
        if (!V.atual || V.atual.id !== vid) continue; // a saída fica travada durante o envio; isto é só proteção
        (c.fotos = c.fotos || []).push({ id: r.id, nome: lista[k].name || 'foto.jpg', tam: r.sizeBytes, em: agora() });
        mudou();
      } catch (e) { V.aviso = 'Não foi possível enviar ' + (lista[k].name || 'a foto') + ': ' + ((e && e.message) || 'erro') + '.'; }
      V.enviando--; desenhar();
    }
    gravarAgora();
  }

  /* ---------- telas ---------- */
  function raiz() {
    var r = document.getElementById('vistSobre');
    if (!r) {
      r = document.createElement('div'); r.id = 'vistSobre'; document.body.appendChild(r);
      r.addEventListener('click', aoClicar); r.addEventListener('change', aoMudar); r.addEventListener('input', aoDigitar);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && V.tela) { e.stopPropagation(); fecharTudo(); } }, true);
    }
    return r;
  }
  function abrirLista() { if (saidaTravada()) return; ligarDb(); V.tela = 'lista'; V.atual = null; if (!V.carteira) lerCarteira(); desenhar(); }
  function abrirVistoria(id) { var d = V.docs[id]; if (!d) return; V.atual = JSON.parse(JSON.stringify(d)); V.atual.id = id; V.atual.comodos = V.atual.comodos || []; V.tela = 'form'; V.aviso = ''; desenhar(); }
  var criando = false;
  function novaVistoria(imovel) {
    if (soLeitura() || criando || saidaTravada()) return;
    criando = true; setTimeout(function () { criando = false; }, 1500); // dois toques rápidos não criam dois rascunhos
    ligarDb().then(function () {
      var e = est();
      V.atual = { id: novoId(), imovel: imovel, tipo: '', comodos: [], chaves: { conferidas: false, qtd: '', obs: '' }, obs: '', status: 'rascunho',
        criado_em: agora(), por: { nome: e.eu_nome || '', corretor_id: e.eu_corretor || '', painel: e.painel || '' } };
      V.tela = 'form'; V.aviso = ''; desenhar(); gravarAgora();
    });
  }
  function saidaTravada() {
    if (!V.enviando) return false;
    V.aviso = 'Aguarde as fotos terminarem de subir (' + V.enviando + ').'; desenhar(); return true;
  }
  function fecharTudo() {
    if (saidaTravada()) return;
    if (V.sujo) gravarAgora();
    V.tela = null; V.atual = null; var r = document.getElementById('vistSobre'); if (r) r.innerHTML = '';
  }
  function chip(atr, k, t, on) { return '<button type="button" class="vs-chip' + (on ? ' on' : '') + '" ' + atr + '="' + esc(k) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(t) + '</button>'; }
  function htmlLista() {
    var ro = soLeitura(), meus = Object.keys(V.docs).map(function (id) { return [id, V.docs[id]]; })
      .sort(function (a, b) { return String(b[1].atualizado_em || b[1].criado_em || '').localeCompare(String(a[1].atualizado_em || a[1].criado_em || '')); });
    var rasc = meus.filter(function (x) { return x[1].status === 'rascunho'; }), env = meus.filter(function (x) { return x[1].status === 'enviada'; });
    var linhaV = function (x) {
      var d = x[1], im = d.imovel || {}, nf = (d.comodos || []).reduce(function (s, c) { return s + ((c.fotos || []).length); }, 0);
      return '<button type="button" class="vs-item" data-vabre="' + esc(x[0]) + '"><b>' + esc(im.ref || im.cod || 'Imóvel') + '</b> · ' + esc(rot(TIPOS, d.tipo) || 'sem tipo') +
        '<span class="mut peq">' + esc(im.endereco || '') + (im.bairro ? ' · ' + esc(im.bairro) : '') + '</span><span class="mut peq">' +
        (d.status === 'enviada' ? 'Enviada ' + esc(dBR(d.enviado_em)) + (urlPdf(d) ? ' · PDF pronto' : ' · PDF em preparo') : 'Rascunho de ' + esc(dBR(d.atualizado_em || d.criado_em))) + ' · ' + (d.comodos || []).length + ' cômodo(s) · ' + nf + ' foto(s)</span></button>';
    };
    var cart = V.carteira == null ? '<p class="mut peq">' + esc(V.cartErro || 'Lendo a carteira…') + '</p>'
      : !V.carteira.length ? '<p class="mut peq">Nenhuma locação ativa na carteira.</p>'
        : '<input class="vs-busca" id="vsBusca" type="search" placeholder="Buscar por código, endereço ou bairro" autocomplete="off">' +
          '<div class="vs-lista" id="vsCart">' + V.carteira.map(function (c) {
            return '<button type="button" class="vs-item" data-vcart="' + esc(c.cod) + '" data-busca="' + esc((c.cod + ' ' + (c.endereco || '') + ' ' + (c.bairro || '')).toLowerCase()) + '"' + (ro ? ' disabled' : '') +
              '><b>' + esc(c.cod) + '</b><span class="mut peq">' + esc(c.endereco || '') + (c.bairro ? ' · ' + esc(c.bairro) : '') + '</span></button>';
          }).join('') + '</div>';
    return '<div class="cab"><div><p class="mut peq" style="margin:0">Vistoria simples pelo celular</p><h3>Vistorias</h3></div><button class="b" type="button" data-vfechar>Fechar</button></div>' +
      (ro ? '<p class="vs-aviso">Visão de outro painel: só leitura.</p>' : '') +
      '<p class="mut peq" style="margin:0">Periódica, constatação de dano, visita e conferência de chaves. Entrada e saída seguem com a Rede Vistorias.</p>' +
      (rasc.length ? '<section class="vs-sec"><h4>Rascunhos</h4><div class="vs-lista">' + rasc.map(linhaV).join('') + '</div></section>' : '') +
      '<section class="vs-sec"><h4>Nova vistoria · locações administradas</h4>' + cart +
      '<p class="mut peq">Outro imóvel: abra a ficha dele no painel (Pesquisa ou Meus imóveis) e toque em <b>Vistoria</b>.</p></section>' +
      (env.length ? '<section class="vs-sec"><h4>Enviadas</h4><div class="vs-lista">' + env.slice(0, 50).map(linhaV).join('') + '</div></section>' : '');
  }
  function htmlForm() {
    var a = V.atual, im = a.imovel || {}, fechada = a.status === 'enviada' || soLeitura(), dis = fechada ? ' disabled' : '';
    var com = a.comodos.map(function (c, i) {
      return '<div class="vs-comodo" data-i="' + i + '"><div class="linha vs-cl"><input class="vs-nome" data-vcnome="' + i + '" value="' + esc(c.nome) + '" aria-label="Nome do cômodo"' + dis + '>' +
        (fechada ? '' : '<button type="button" class="copiar" data-vcrem="' + i + '">Remover</button>') + '</div>' +
        '<div class="vs-chips">' + ESTADOS.map(function (e) { return chip('data-vcest', i + '|' + e[0], e[1], c.estado === e[0]).replace('<button', fechada ? '<button disabled' : '<button'); }).join('') + '</div>' +
        '<textarea data-vcobs="' + i + '" rows="2" placeholder="Observação (o que viu, o que precisa de reparo)"' + dis + '>' + esc(c.obs || '') + '</textarea>' +
        '<div class="fotos">' + (c.fotos || []).map(function (f, k) {
          return '<figure><img src="' + esc('/_blob/' + f.id) + '" alt="Foto ' + (k + 1) + ' de ' + esc(c.nome) + '" loading="lazy">' +
            (fechada ? '' : '<button type="button" data-vfrem="' + i + '|' + k + '" aria-label="Remover foto ' + (k + 1) + '">×</button>') + '</figure>';
        }).join('') + '</div>' +
        (fechada ? '' : '<label class="b vs-foto">📷 Fotos<input type="file" accept="image/*" multiple data-vcfoto="' + i + '" hidden></label>') + '</div>';
    }).join('');
    var chv = a.chaves || {};
    return '<div class="cab"><div><p class="mut peq" style="margin:0">' + esc(im.origem === 'carteira' ? 'Locação administrada' : 'Imóvel do catálogo') + ' · ' + esc(dBR(a.criado_em)) + '</p><h3>Vistoria · ' + esc(im.ref || im.cod || '') + '</h3></div>' +
      '<div class="linha"><button class="b" type="button" data-vvolta>Lista</button><button class="b" type="button" data-vfechar>Fechar</button></div></div>' +
      '<div><span data-sens>' + esc(im.endereco || '') + '</span><div class="mut peq">' + esc(im.bairro || '') + '</div></div>' +
      (a.status === 'enviada' ? '<p class="vs-ok">Enviada em ' + esc(dBR(a.enviado_em)) + ' por ' + esc((a.por && a.por.nome) || '—') + '. Não se altera mais.</p>' +
        (urlPdf(a) ? '<p class="linha" style="margin:0"><a class="b p" href="' + esc(urlPdf(a)) + '" target="_blank" rel="noopener noreferrer">📄 Ver PDF</a><span class="mut peq">Relatório no Drive da Vivere</span></p>'
          : '<p class="mut peq" style="margin:0">' + (atrasado(a) ? 'O relatório PDF ainda não saiu. Avise a diretoria.' : 'O relatório PDF fica pronto em 1 a 2 minutos; o botão <b>Ver PDF</b> aparece aqui.') + '</p>') : '') +
      (V.aviso ? '<p class="vs-aviso" role="alert">' + esc(V.aviso) + '</p>' : '') +
      '<section class="vs-sec"><h4>Tipo</h4><div class="vs-chips">' + TIPOS.map(function (t) { return chip('data-vtipo', t[0], t[1], a.tipo === t[0]).replace('<button', fechada ? '<button disabled' : '<button'); }).join('') + '</div></section>' +
      '<section class="vs-sec"><h4>Cômodos</h4>' + (com || '<p class="mut peq">Nenhum cômodo ainda.</p>') +
      (fechada ? '' : '<div class="vs-chips vs-add">' + COMODOS.map(function (n) { return '<button type="button" class="vs-chip" data-vcadd="' + esc(n) + '">+ ' + esc(n) + '</button>'; }).join('') + '<button type="button" class="vs-chip" data-vcadd="">+ Outro</button></div>') + '</section>' +
      '<section class="vs-sec"><h4>Chaves</h4><label class="vs-ck"><input type="checkbox" data-vchk' + (chv.conferidas ? ' checked' : '') + dis + '> Chaves conferidas</label>' +
      '<div class="linha"><input class="vs-qtd" data-vchq inputmode="numeric" placeholder="Quantidade" value="' + esc(chv.qtd || '') + '"' + dis + '><input class="vs-cobs" data-vcho placeholder="Observação das chaves" value="' + esc(chv.obs || '') + '"' + dis + '></div></section>' +
      '<section class="vs-sec"><h4>Observação geral</h4><textarea data-vobs rows="3"' + dis + '>' + esc(a.obs || '') + '</textarea></section>' +
      (fechada ? '' : '<div class="linha vs-fim"><button class="b p" type="button" data-venviar' + (V.enviando ? ' disabled' : '') + '>Enviar vistoria</button><button class="copiar" type="button" data-vdesc>Descartar rascunho</button>' +
        '<span class="mut peq" id="vsSalvo" aria-live="polite">' + (V.enviando ? 'Enviando ' + V.enviando + ' foto(s)…' : V.salvoEm ? 'Rascunho salvo às ' + esc(V.salvoEm) : 'O rascunho é salvo sozinho.') + '</span></div>');
  }
  function desenhar() {
    if (!V.tela) return;
    var r = raiz(), g = r.querySelector('.gaveta'), y = g ? g.scrollTop : 0;
    var busca = document.getElementById('vsBusca'), q = busca ? busca.value : '';
    r.innerHTML = '<div class="sobre vs-fundo" data-vfundo><div class="gaveta vs-gaveta" role="dialog" aria-modal="true" aria-label="Vistoria">' + (V.tela === 'form' ? htmlForm() : htmlLista()) + '</div></div>';
    var g2 = r.querySelector('.gaveta'); if (g2) g2.scrollTop = y;
    if (q) { var b2 = document.getElementById('vsBusca'); if (b2) { b2.value = q; filtrar(q); } }
  }
  function filtrar(q) {
    q = String(q || '').toLowerCase().trim();
    Array.prototype.forEach.call(document.querySelectorAll('#vsCart [data-vcart]'), function (b) { b.hidden = !!q && b.getAttribute('data-busca').indexOf(q) < 0; });
  }
  function validar(a) {
    if (!a.tipo) return 'Escolha o tipo da vistoria.';
    if (!a.comodos.length) return 'Inclua pelo menos um cômodo.';
    for (var i = 0; i < a.comodos.length; i++) if (!a.comodos[i].estado) return 'Marque o estado de "' + (a.comodos[i].nome || 'cômodo') + '".';
    var nf = a.comodos.reduce(function (s, c) { return s + (c.fotos || []).length; }, 0);
    if (a.tipo === 'dano' && !nf) return 'Constatação de dano precisa de pelo menos uma foto.';
    if (a.tipo === 'chaves' && !(a.chaves && a.chaves.conferidas)) return 'Marque "Chaves conferidas" (ou troque o tipo).';
    return '';
  }

  /* ---------- eventos (dentro da vistoria; não sobem ao painel) ---------- */
  function aoClicar(ev) {
    ev.stopPropagation();
    var t = ev.target.closest('button,[data-vfundo],label'); if (!t) return;
    if (t.matches('[data-vfundo]') && ev.target === t) return fecharTudo();
    var d = t.dataset, a = V.atual;
    if (d.vfechar !== undefined) return fecharTudo();
    if (d.vvolta !== undefined) { if (saidaTravada()) return; if (V.sujo) gravarAgora(); return abrirLista(); }
    if (d.vabre) return abrirVistoria(d.vabre);
    if (d.vcart) { var c = (V.carteira || []).filter(function (x) { return x.cod === d.vcart; })[0]; if (c) novaVistoria({ origem: 'carteira', cod: c.cod, ref: c.cod, endereco: c.endereco || '', bairro: c.bairro || '' }); return; }
    if (!a || a.status === 'enviada' || soLeitura()) return;
    if (d.vtipo) { a.tipo = d.vtipo; mudou(); return desenhar(); }
    if (d.vcadd !== undefined) {
      var nome = d.vcadd || 'Outro cômodo', n = a.comodos.filter(function (x) { return String(x.nome).indexOf(nome) === 0; }).length;
      a.comodos.push({ nome: n ? nome + ' ' + (n + 1) : nome, estado: '', obs: '', fotos: [] }); mudou(); desenhar();
      var ult = document.querySelector('.vs-comodo:last-of-type'); if (ult && ult.scrollIntoView) ult.scrollIntoView({ block: 'center' });
      return;
    }
    if (d.vcest) { var p = d.vcest.split('|'); a.comodos[+p[0]].estado = p[1]; mudou(); return desenhar(); }
    if (d.vcrem !== undefined) { var cm = a.comodos[+d.vcrem]; if (cm && (cm.fotos || []).length && !confirmar(t, 'Remover o cômodo e as fotos dele?')) return; a.comodos.splice(+d.vcrem, 1); mudou(); return desenhar(); }
    if (d.vfrem) { var q = d.vfrem.split('|'); a.comodos[+q[0]].fotos.splice(+q[1], 1); mudou(); return desenhar(); }
    if (d.vdesc !== undefined) {
      if (!confirmar(t, 'Toque de novo para descartar o rascunho.')) return;
      clearTimeout(V.timer); V.sujo = false;
      V.db.collection('vistorias').doc(a.id).set({ status: 'descartada', imovel: a.imovel, criado_em: a.criado_em, descartada_em: agora(), por: a.por }).then(abrirLista, function () { V.aviso = 'Não deu para descartar agora.'; desenhar(); });
      return;
    }
    if (d.venviar !== undefined) {
      var erroV = validar(a); if (erroV) { V.aviso = erroV; return desenhar(); }
      if (!confirmar(t, 'Toque de novo para enviar. Depois de enviada, a vistoria não se altera.')) return;
      a.status = 'enviada'; a.enviado_em = agora(); var e = est();
      a.por = { nome: e.eu_nome || (a.por && a.por.nome) || '', corretor_id: e.eu_corretor || (a.por && a.por.corretor_id) || '', painel: e.painel || (a.por && a.por.painel) || '' };
      V.aviso = ''; t.disabled = true;
      gravarAgora().then(function () { if (V.sujo) { a.status = 'rascunho'; V.aviso = 'Não enviou. Confira a conexão e tente de novo.'; } desenhar(); });
    }
  }
  // confirmação em dois toques no próprio botão (o app não usa janelas do navegador)
  function confirmar(btn, texto) {
    if (btn.dataset.vconf === '1') return true;
    btn.dataset.vconf = '1'; var antes = btn.textContent; btn.textContent = texto;
    setTimeout(function () { if (btn.isConnected) { btn.dataset.vconf = ''; btn.textContent = antes; } }, 4000);
    return false;
  }
  function aoMudar(ev) {
    var t = ev.target, d = t.dataset, a = V.atual;
    if (d.vcfoto !== undefined && t.files && t.files.length) { var fs = Array.prototype.slice.call(t.files); t.value = ''; enviarFotos(+d.vcfoto, fs); return; }
    if (!a || a.status === 'enviada' || soLeitura()) return;
    if (d.vchk !== undefined) { a.chaves = a.chaves || {}; a.chaves.conferidas = !!t.checked; mudou(); }
  }
  function aoDigitar(ev) {
    var t = ev.target, d = t.dataset, a = V.atual;
    if (t.id === 'vsBusca') return filtrar(t.value);
    if (!a || a.status === 'enviada' || soLeitura()) return;
    if (d.vcnome !== undefined) a.comodos[+d.vcnome].nome = t.value.slice(0, 60);
    else if (d.vcobs !== undefined) a.comodos[+d.vcobs].obs = t.value.slice(0, 2000);
    else if (d.vchq !== undefined) { a.chaves = a.chaves || {}; a.chaves.qtd = t.value.replace(/\D/g, '').slice(0, 3); }
    else if (d.vcho !== undefined) { a.chaves = a.chaves || {}; a.chaves.obs = t.value.slice(0, 300); }
    else if (d.vobs !== undefined) a.obs = t.value.slice(0, 3000);
    else return;
    mudou();
  }

  /* ---------- entradas: botão no cabeçalho, menu lateral e botão na ficha do imóvel ---------- */
  function botaoCabecalho() {
    var tema = document.getElementById('btnTema'); if (!tema || document.getElementById('btnVistApp')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'btnVistApp'; b.className = 'btn-tema';
    b.innerHTML = '<span aria-hidden="true">📋</span><span class="bv-t">Vistorias</span>'; b.title = 'Vistoria simples pelo celular';
    b.addEventListener('click', abrirLista);
    tema.parentNode.insertBefore(b, tema);
  }
  function botaoNaFicha(g) {
    if (!g || g.querySelector('[data-vficha]')) return;
    var h3 = g.querySelector('.cab h3'); if (!h3) return;
    var ref = String(h3.textContent || '').split(' · ')[0].trim(); if (!ref) return;
    var end = g.querySelector('[data-sens]'), bai = end && end.parentNode ? end.parentNode.querySelector('.mut.peq') : null;
    var linhas = g.querySelectorAll(':scope > .linha'), alvo = linhas[linhas.length - 1] || g;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'b'; b.setAttribute('data-vficha', ref); b.textContent = '📋 Vistoria';
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      novaVistoria({ origem: 'catalogo', ref: ref, endereco: end ? String(end.textContent || '').trim() : '', bairro: bai ? String(bai.textContent || '').split(' · ')[0].trim() : '' });
    });
    if (soLeitura()) return;
    alvo.insertBefore(b, alvo.firstChild);
  }
  function vigiar() {
    var sobre = document.getElementById('sobre');
    if (sobre) new MutationObserver(function () { botaoNaFicha(sobre.querySelector('.gaveta[aria-label="Imóvel"]')); }).observe(sobre, { childList: true, subtree: true });
    botaoCabecalho();
    var cab = document.getElementById('btnTema'); if (!cab) new MutationObserver(function (m, o) { if (document.getElementById('btnTema')) { botaoCabecalho(); o.disconnect(); } }).observe(document.body, { childList: true, subtree: true });
    var E = window.MENU_LATERAL_EXTRAS;
    if (E && typeof E.itens === 'function' && !E.vist) {
      var itens = E.itens, abre = E.abre;
      E.itens = function () { var l = itens.apply(this, arguments) || []; l.splice(1, 0, { id: 'vistorias', t: 'Vistorias', ic: 'prancheta', href: '#vistorias' }); return l; };
      E.abre = function (href) { if (href === '#vistorias') return abrirLista(); return abre.apply(this, arguments); };
      E.vist = true;
      if (window.MenuLateral && MenuLateral.atualiza) MenuLateral.atualiza();
    }
    ligarDb();
    // celular trocando de app ou fechando a aba: grava o que estiver pendente
    document.addEventListener('visibilitychange', function () { if (document.hidden && V.sujo) gravarAgora(); });
    window.addEventListener('pagehide', function () { if (V.sujo) gravarAgora(); });
  }
  window.VistoriaApp = { versao: VERSAO, abrir: abrirLista, nova: novaVistoria };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigiar); else vigiar();
})();
