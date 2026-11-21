/* chamado.js — página pública do chamado do inquilino (F2 dos chamados, 21/11/2026).
   Lê o token do endereço (?t=), pergunta à função chamado-inquilino a ref. e o bairro, e envia relato, tipo, urgência
   e até 4 fotos reduzidas no próprio celular (lado maior 1280 px, JPEG). Nada fica guardado no aparelho além do tema. */
(function () {
  'use strict';
  var FUNCAO = 'https://jucnlzznbwjthlqqgdlz.supabase.co/functions/v1/chamado-inquilino';
  var MAX_FOTOS = 4, LADO = 1280, ALVO = 420 * 1024; // bytes da foto já reduzida
  var $ = function (id) { return document.getElementById(id); };
  var token = (new URLSearchParams(location.search).get('t') || '').trim();
  var fotos = [], enviando = false;

  // tema (claro/escuro), guardado só neste aparelho
  try { var tg = localStorage.getItem('vivere-tema'); if (tg === 'dark' || tg === 'light') document.documentElement.dataset.theme = tg; } catch (e) {}
  $('btnTema').addEventListener('click', function () {
    var atual = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var novo = atual === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = novo;
    try { localStorage.setItem('vivere-tema', novo); } catch (e) {}
  });

  function mostra(id) { ['carregando', 'erro', 'form', 'ok'].forEach(function (s) { $(s).hidden = s !== id; }); window.scrollTo(0, 0); }
  function erroLink(msg) { $('erroMsg').textContent = msg || 'Este link não é válido. Peça um link novo à Vivere.'; mostra('erro'); }
  function msg(t) { $('msg').textContent = t || ''; $('msg').hidden = !t; }

  async function chama(corpo) {
    var r = await fetch(FUNCAO, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), cache: 'no-store', referrerPolicy: 'no-referrer' });
    var j = null; try { j = await r.json(); } catch (e) {}
    return { status: r.status, j: j || {} };
  }

  async function abre() {
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return erroLink();
    try {
      var r = await chama({ acao: 'info', t: token });
      if (!r.j.ok) return erroLink(r.j.erro);
      $('ref').textContent = r.j.ref || '';
      $('bairro').textContent = r.j.bairro ? ' · ' + r.j.bairro : '';
      var sel = $('tipo'); Object.keys(r.j.tipos || {}).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = r.j.tipos[k]; sel.appendChild(o); });
      var ug = $('urgencias'); Object.keys(r.j.urgencias || {}).forEach(function (k) {
        var l = document.createElement('label'), i = document.createElement('input'); i.type = 'radio'; i.name = 'urgencia'; i.value = k; if (k === 'media') i.checked = true;
        l.appendChild(i); l.appendChild(document.createTextNode(r.j.urgencias[k])); ug.appendChild(l); });
      mostra('form');
    } catch (e) { erroLink('Sem conexão agora. Confira a internet e abra o link de novo.'); }
  }

  // ---------- fotos: reduz no aparelho ----------
  function carrega(arq) {
    return new Promise(function (ok, falha) {
      var url = URL.createObjectURL(arq), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); falha(new Error('imagem')); };
      img.src = url;
    });
  }
  function paraJpeg(img, lado, q) {
    var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, lado / Math.max(w, h));
    var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    var d = c.toDataURL('image/jpeg', q), b64 = d.slice(d.indexOf(',') + 1);
    return { b64: b64, bytes: Math.floor(b64.length * 3 / 4), largura: c.width, altura: c.height, url: d };
  }
  async function reduz(arq) {
    var img = await carrega(arq), tent = [[LADO, 0.72], [1024, 0.62], [800, 0.55]], f;
    for (var i = 0; i < tent.length; i++) { f = paraJpeg(img, tent[i][0], tent[i][1]); if (f.bytes <= ALVO) break; }
    return f;
  }
  function pintaFotos() {
    var el = $('fotos'); el.textContent = '';
    fotos.forEach(function (f, i) {
      var d = document.createElement('div'), im = document.createElement('img'), b = document.createElement('button');
      d.className = 'foto'; im.src = f.url; im.alt = 'Foto ' + (i + 1); b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', 'Tirar a foto ' + (i + 1));
      b.addEventListener('click', function () { fotos.splice(i, 1); pintaFotos(); });
      d.appendChild(im); d.appendChild(b); el.appendChild(d);
    });
    $('addFoto').classList.toggle('cheio', fotos.length >= MAX_FOTOS);
  }
  $('arquivo').addEventListener('change', async function (e) {
    var arqs = Array.prototype.slice.call(e.target.files || []); e.target.value = ''; msg('');
    for (var i = 0; i < arqs.length; i++) {
      if (fotos.length >= MAX_FOTOS) { msg('No máximo ' + MAX_FOTOS + ' fotos.'); break; }
      try { fotos.push(await reduz(arqs[i])); } catch (er) { msg('Não consegui abrir uma das fotos. Tente tirar de novo pela câmera.'); }
    }
    pintaFotos();
  });

  $('relato').addEventListener('input', function () { $('nRelato').textContent = this.value.length; });

  $('enviar').addEventListener('click', async function () {
    if (enviando) return; msg('');
    var urg = document.querySelector('input[name=urgencia]:checked');
    var corpo = { acao: 'enviar', t: token, tipo: $('tipo').value, urgencia: urg ? urg.value : '', relato: $('relato').value.trim(),
      local: $('local').value.trim(), horario: $('horario').value.trim(),
      fotos: fotos.map(function (f) { return { b64: f.b64, largura: f.largura, altura: f.altura }; }) };
    if (!corpo.tipo) return msg('Escolha o tipo do problema.');
    if (corpo.relato.length < 10) return msg('Conte o problema com um pouco mais de detalhe.');
    enviando = true; var b = $('enviar'); b.disabled = true; b.textContent = 'Enviando…';
    try {
      var r = await chama(corpo);
      if (r.j.ok) {
        $('protocolo').textContent = r.j.protocolo || '';
        fotos = []; pintaFotos(); $('relato').value = ''; $('nRelato').textContent = '0'; $('local').value = ''; $('horario').value = ''; $('tipo').value = '';
        mostra('ok');
      } else if (r.j.motivo) erroLink(r.j.erro);
      else msg(r.j.erro || 'Não conseguimos registrar agora. Tente de novo em alguns minutos.');
    } catch (e) { msg('Sem conexão agora. Confira a internet e tente de novo; o que você escreveu continua aqui.'); }
    enviando = false; b.disabled = false; b.textContent = 'Enviar chamado';
  });
  $('outro').addEventListener('click', function () { mostra('form'); });

  abre();
})();
