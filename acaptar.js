/* A CAPTAR no app da Vivere — fatia 3 (09/11/2026).
   Lê do Supabase (tabelas ac_*), com as regras no banco: o corretor vê os imóveis livres e os dele;
   o contato do proprietário só chega a quem travou o imóvel; gestor e diretoria veem tudo.
   Escrita só pelas funções ac_travar, ac_registrar_contato, ac_soltar, ac_pedir_captei, ac_decidir_pedido e ac_liberar.
   Nenhum dado fica neste arquivo. */
(function () {
  'use strict';
  var DIA = 864e5, EXPIRA = 7;
  var TIPO = { apartment: 'Apartamento', house: 'Casa', land: 'Terreno', commercial: 'Comercial' };
  var NEG = { aluguel: 'Aluguel', venda: 'Venda' };
  var PRACA = { principal: 'Bairros principais', subsidiaria: 'Subsidiários', continente: 'Continente' };
  var ORIGEM = { olx: 'OLX', chavesnamao: 'Chaves na Mão', facebook: 'Facebook', vivareal: 'Viva Real', zap: 'ZAP', captei: 'Captei' };

  var A = {
    sub: 'disp', im: [], tr: [], ped: [], ct: {}, carregado: false, carregando: false,
    f: { q: '', neg: '' }, bs: {}, bAberto: false, bq: '', cod: '', ordem: { disp: { k: 'anuncio', d: -1 }, captei: { k: 'bairro', d: 1 }, dir: { k: 'desde', d: 1 } },
    confirmar: null, soltar: null, ocupado: false
  };
  var C = null; // contexto vindo do app.js: { sb, eu, esc, toast, titulo, redesenhar }

  try { var s0 = sessionStorage.getItem('acaptar-sub'); if (s0) A.sub = s0; } catch (e) { }
  try { var b1 = JSON.parse(localStorage.getItem('acaptar-bairros') || '[]'); if (Array.isArray(b1)) b1.forEach(function (k) { A.bs[String(k)] = 1; }); var b0 = localStorage.getItem('acaptar-bairro'); if (b0 && !b1.length) A.bs[b0] = 1; } catch (e) { }

  function esc(v) { return C.esc(v); }
  var brl = function (v) { return v == null ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 }); };
  var dataBR = function (s) { if (!s) return '—'; var t = String(s); if (/^\d{4}-\d{2}-\d{2}$/.test(t)) t += 'T12:00:00'; var d = new Date(t); return isNaN(d) ? C.esc(t) : d.toLocaleDateString('pt-BR'); };
  var fmtCep = function (c) { c = String(c || '').replace(/\D/g, ''); return c.length === 8 ? c.slice(0, 5) + '-' + c.slice(5) : c; };
  var fmtTel = function (t) { t = String(t).replace(/\D/g, ''); return t.length === 11 ? '(' + t.slice(0, 2) + ') ' + t.slice(2, 7) + '-' + t.slice(7) : t.length === 10 ? '(' + t.slice(0, 2) + ') ' + t.slice(2, 6) + '-' + t.slice(6) : t; };
  // 11/11/2026: sites onde o anúncio foi achado (coluna plataformas, sem link); a linha só aparece com 2 ou mais
  var PLAT = { olx: 'OLX', chavesnamao: 'Chaves na Mão', facebook: 'Facebook', vivareal: 'Viva Real', zap: 'ZAP', captei: 'Captei', imovelweb: 'Imovelweb' };
  var sitesDe = function (v) {
    var p = Array.isArray(v.plataformas) ? v.plataformas.filter(Boolean) : [];
    return p.length >= 2 ? '<span class="s sites">Em ' + p.length + ' sites: ' + esc(p.map(function (x) { return PLAT[x] || x; }).join(' · ')) + '</span>' : '';
  };
  var origemDe = function (v) { return ORIGEM[v.origem] || ORIGEM[v.fonte] || 'site do anúncio'; };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); };
  function endereco(v) { var p = [v.empreendimento, v.rua].filter(Boolean); if (v.cep) p.push('CEP ' + fmtCep(v.cep)); return p.join(' · '); }
  function ultimo(t) { return new Date(t.ultimo_contato_em || t.travado_em).getTime(); }
  function ativa(t) { return !t.solto_em && (Date.now() - ultimo(t)) < EXPIRA * DIA; }
  function diretoria() { return C.eu.papel === 'gestor' || C.eu.papel === 'diretor'; }
  function estrelas(n) { n = n || 0; return '★'.repeat(n) + '☆'.repeat(Math.max(0, 4 - n)); }

  var geracao = 0;
  async function carregar() {
    A.carregando = true;
    var sb = C.sb, minha = ++geracao, uid = C.sessaoUid;
    var r = await Promise.all([
      sb.from('ac_imoveis').select('id,cod,lista,negocio,tipo,bairro,praca,preco,quartos,area,rua,cep,empreendimento,estrelas,fora_da_ilha,coletado_em,anunciado_em,origem,fonte,distribuido_para,foto_id,plataformas').eq('ativo', true).limit(2000),
      sb.from('ac_travas').select('id,imovel_id,user_id,nome,email,travado_em,ultimo_contato_em,contatos,solto_em').is('solto_em', null).limit(2000),
      sb.from('ac_pedidos_captei').select('imovel_id,user_id,nome,pedido_em,status,decidido_em,decidido_por').limit(2000)
    ]);
    if (minha !== geracao || uid !== C.sessaoUid) return;
    var erro = r[0].error || r[1].error || r[2].error;
    if (erro) { C.toast('Não foi possível carregar o A CAPTAR: ' + erro.message); A.carregando = false; return; }
    A.im = r[0].data || []; A.tr = (r[1].data || []).filter(ativa); A.ped = r[2].data || [];
    var meus = A.tr.filter(function (t) { return t.user_id === C.sessaoUid; }).map(function (t) { return t.imovel_id; });
    A.ct = {};
    if (meus.length) {
      var q = await sb.from('ac_contatos').select('imovel_id,nome,telefones,emails,link,titulo,descricao').in('imovel_id', meus);
      if (minha !== geracao) return;
      (q.data || []).forEach(function (c) { A.ct[c.imovel_id] = c; });
    }
    A.carregado = true; A.carregando = false;
  }

  function dono(id) { for (var i = 0; i < A.tr.length; i++) if (A.tr[i].imovel_id === id) return A.tr[i]; return null; }
  function situacao(v) {
    if (v.distribuido_para) return { k: 'ocup', t: 'Com a diretoria (' + v.distribuido_para + ')' };
    var t = dono(v.id);
    if (!t) return { k: 'livre', t: 'Livre' };
    if (t.user_id === C.sessaoUid) return { k: 'meu', t: 'Em captação por você' };
    return { k: 'ocup', t: 'Em captação por ' + (t.nome || 'outro corretor') };
  }

  function ordenar(arr, st, val) {
    return arr.sort(function (a, b) {
      var x = val(a, st.k), y = val(b, st.k);
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR')) * st.d;
    });
  }
  function thOrd(qual, k, r) { var st = A.ordem[qual]; return '<th><button type="button" data-ord="' + qual + ':' + k + '" aria-label="Ordenar por ' + r + '">' + r + (st.k === k ? (st.d > 0 ? ' ▲' : ' ▼') : ' ↕') + '</button></th>'; }
  function barraOrd(qual, cols) { var st = A.ordem[qual]; return '<div class="ordenar" aria-label="Ordenar por"><span>Ordenar por:</span>' + cols.map(function (c) { return '<button type="button" data-ord="' + qual + ':' + c[0] + '" aria-pressed="' + (st.k === c[0]) + '">' + c[1] + (st.k === c[0] ? (st.d > 0 ? ' ▲' : ' ▼') : '') + '</button>'; }).join('') + '</div>'; }
  var nulo = function (v) { return v == null || v === '' ? null : v; };
  function valImovel(v, k) {
    if (k === 'anuncio') return nulo(v.anunciado_em || v.coletado_em);
    if (k === 'negocio') return nulo(NEG[v.negocio]); if (k === 'tipo') return nulo(TIPO[v.tipo]);
    if (k === 'situacao') return situacao(v).t;
    return nulo(v[k]);
  }

  // ---- Busca inteligente (11/11/2026, como a do HUB): "Campeche, aluguel, 3 dorm, até 4 mil" ----
  // Entende negócio, tipo, quartos (exato; "3+" ou "3 ou mais" = mínimo; kitnet/studio = até 1), área em m² (± 20%),
  // valores ("800 mil" = ± 20%; "até 4 mil" = teto; "acima de 1 mi" = piso; "entre 2 e 3 mil" = faixa) e bairros
  // (vários = qualquer um deles). Tipos diferentes de critério somam (E); o resto é texto (rua, empreendimento, código).
  var CONECT = { e: 1, com: 1, de: 1, do: 1, da: 1, dos: 1, das: 1, no: 1, na: 1, nos: 1, nas: 1, em: 1, ou: 1, para: 1, pra: 1, a: 1, o: 1, um: 1, uma: 1, imovel: 1, imoveis: 1, r: 1, reais: 1, valor: 1, bairro: 1, bairros: 1 };
  var NEGW = { aluguel: 'aluguel', alugar: 'aluguel', aluga: 'aluguel', locacao: 'aluguel', locar: 'aluguel', loc: 'aluguel', venda: 'venda', vender: 'venda', vende: 'venda', compra: 'venda', comprar: 'venda' };
  var TIPOW = { apartamento: 'apartment', apartamentos: 'apartment', apto: 'apartment', aptos: 'apartment', ap: 'apartment', apart: 'apartment', cobertura: 'apartment', casa: 'house', casas: 'house', sobrado: 'house', terreno: 'land', terrenos: 'land', lote: 'land', comercial: 'commercial', sala: 'commercial', loja: 'commercial', galpao: 'commercial', ponto: 'commercial' };
  function numBR(s) { s = String(s); if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return +s.replace(/\./g, '').replace(',', '.'); return +s.replace(',', '.'); }
  function vUnid(n, u) { u = u || ''; return /^(mi|milhao|milhoes|mm)$/.test(u) ? n * 1e6 : /^(mil|k)$/.test(u) ? n * 1e3 : n; }
  function entender(q, nomes) {
    var e = { neg: {}, tipo: {}, ilha: null, qMin: null, qMax: null, vMin: null, vMax: null, aMin: null, aMax: null, bairros: {}, txt: [], rot: [] };
    var t = ' ' + norm(q).replace(/r\$\s*/g, '').replace(/m²/g, 'm2') + ' ';
    var VAL = '(\\d+(?:[.,]\\d+)*)\\s*(milhoes|milhao|mil|mi|mm|k)?';
    // área
    t = t.replace(/(ate|abaixo de|menos de|acima de|a partir de|mais de|minimo|maximo)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|metros quadrados|metros|mts)(?![a-z0-9])/g, function (m, p, n) {
      var a = numBR(n); if (/ate|abaixo|menos|maximo/.test(p || '')) e.aMax = a; else if (p) e.aMin = a; else { e.aMin = Math.round(a * 0.8); e.aMax = Math.round(a * 1.2); }
      e.rot.push((p ? (e.aMax === a ? 'até ' : 'a partir de ') : '') + a + ' m²' + (p ? '' : ' ± 20%')); return ' '; });
    // quartos
    t = t.replace(/(\d+)\s*(\+|ou mais)?\s*(?:dormitorios?|dormes?|dorms?|quartos?|qtos?|qto|dts?)(?![a-z])(\s*ou mais|\s*\+)?/g, function (m, n, p1, p2) {
      n = +n; if (p1 || p2) { e.qMin = n; e.rot.push(n + '+ quartos'); } else { e.qMin = n; e.qMax = n; e.rot.push(n + (n === 1 ? ' quarto' : ' quartos')); } return ' '; });
    t = t.replace(/(?:^|\s)(kitnet|kitinete|kit|studio|estudio|conjugado|jk|loft)(?=\s)/g, function () { e.qMax = 1; e.rot.push('kitnet/studio (até 1 quarto)'); return ' '; });
    // valores: faixa, teto, piso e aproximado
    t = t.replace(new RegExp('(?:entre|de)\\s+' + VAL + '\\s+(?:e|a|ate)\\s+' + VAL + '(?![a-z0-9])', 'g'), function (m, a, ua, b, ub) {
      var y = vUnid(numBR(b), ub), x = vUnid(numBR(a), ua || ub); if (y < 500) return m; e.vMin = x; e.vMax = y; e.rot.push(brl(x) + ' a ' + brl(y)); return ' '; });
    t = t.replace(new RegExp('(ate|abaixo de|menos de|maximo|max|no maximo|acima de|a partir de|mais de|minimo|min|desde)\\s+' + VAL + '(?![a-z0-9])', 'g'), function (m, p, a, u) {
      var v = vUnid(numBR(a), u); if (v < 500) return m; if (/ate|abaixo|menos|max/.test(p)) { e.vMax = v; e.rot.push('até ' + brl(v)); } else { e.vMin = v; e.rot.push('a partir de ' + brl(v)); } return ' '; });
    t = t.replace(new RegExp('(?:^|\\s)' + VAL + '(?=\\s)', 'g'), function (m, a, u) {
      var v = vUnid(numBR(a), u); if (!u && v < 10000 && !/[.,]\d{3}/.test(a)) return m; e.vMin = Math.round(v * 0.8); e.vMax = Math.round(v * 1.2); e.rot.push(brl(v) + ' ± 20%'); return ' '; });
    // palavras: negócio, tipo, bairros e texto
    var w = t.split(/[\s,;]+/).filter(Boolean), i = 0, ks = nomes.map(function (b) { return ' ' + b.k + ' '; });
    while (i < w.length) {
      var x = w[i];
      if (NEGW[x]) { e.neg[NEGW[x]] = 1; i++; continue; }
      if (TIPOW[x]) { e.tipo[TIPOW[x]] = 1; i++; continue; }
      if (x === 'continente') { e.ilha = false; e.rot.push('Continente'); i++; continue; }
      if (x === 'ilha') { e.ilha = true; e.rot.push('Só a ilha'); i++; continue; }
      if (CONECT[x]) { i++; continue; }
      var achou = false;
      for (var n = Math.min(5, w.length - i); n >= 1 && !achou; n--) {
        var ph = w.slice(i, i + n).join(' '); if (ph.length < 3) continue;
        var ex = [], pre = [];
        nomes.forEach(function (b, j) { if (b.k === ph) ex.push(b); else if (ks[j].indexOf(' ' + ph) >= 0) pre.push(b); });
        var ok = ex.concat(pre);
        if (ok.length) { ok.forEach(function (b) { e.bairros[b.k] = b.nome; }); i += n; achou = true; }
      }
      if (achou) continue;
      if (x.length >= 2) e.txt.push(x); i++;
    }
    Object.keys(e.neg).forEach(function (k) { e.rot.unshift(NEG[k]); });
    Object.keys(e.tipo).forEach(function (k) { e.rot.push(TIPO[k]); });
    Object.keys(e.bairros).forEach(function (k) { e.rot.push(e.bairros[k]); });
    e.txt.forEach(function (s) { e.rot.push('“' + s + '”'); });
    return e;
  }
  function atende(v, e) {
    if (Object.keys(e.neg).length && !e.neg[v.negocio]) return false;
    if (Object.keys(e.tipo).length && !e.tipo[v.tipo]) return false;
    if (e.qMin != null && (v.quartos == null || v.quartos < e.qMin)) return false;
    if (e.qMax != null && (v.quartos == null || v.quartos > e.qMax)) return false;
    if (e.vMin != null && (v.preco == null || v.preco < e.vMin)) return false;
    if (e.vMax != null && (v.preco == null || v.preco > e.vMax)) return false;
    if (e.aMin != null && (v.area == null || v.area < e.aMin)) return false;
    if (e.aMax != null && (v.area == null || v.area > e.aMax)) return false;
    if (Object.keys(e.bairros).length && !e.bairros[norm(v.bairro)]) return false;
    if (e.ilha != null && (pracaDe(v) === 'continente') === e.ilha) return false;
    if (e.txt.length) { var h = ' ' + norm([v.bairro, TIPO[v.tipo], NEG[v.negocio], v.rua, v.empreendimento, v.cod, v.cep].join(' ')); for (var i = 0; i < e.txt.length; i++) { var x = e.txt[i]; if (/^\d+$/.test(x) ? !new RegExp('(^|\\D)' + x + '(\\D|$)').test(h) : h.indexOf(x) < 0) return false; } }
    return true;
  }
  // ---- Vários bairros (11/11/2026): substitui "Toda a ilha e continente" + "um bairro" ----
  function pracaDe(v) { return PRACA[v.praca] ? v.praca : (v.fora_da_ilha ? 'continente' : 'subsidiaria'); }
  function bairrosDe(base) {
    var m = {}; base.forEach(function (v) { if (!v.bairro) return; var k = norm(v.bairro); if (!m[k]) m[k] = { k: k, nome: v.bairro, praca: pracaDe(v), n: 0 }; m[k].n++; });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  }
  function guardarBairros() { try { localStorage.setItem('acaptar-bairros', JSON.stringify(Object.keys(A.bs))); } catch (e) { } }

  function filtrar(arr) {
    if (A.cod) return arr.filter(function (v) { return v.cod === A.cod; });
    var e = entender(A.f.q, bairrosDe(A.im)), temB = Object.keys(A.bs).length > 0;
    return arr.filter(function (v) {
      if (A.f.neg && v.negocio !== A.f.neg) return false;
      if (temB && !A.bs[norm(v.bairro)]) return false;
      return atende(v, e);
    });
  }

  // foto (11/11/2026): 1 foto por anúncio, guardada pela função acaptar-app no depósito público acaptar-fotos do Supabase
  function fotoUrl(v) { if (!v || !v.foto_id || !/^[0-9a-f]{16}\.(jpg|png|webp)$/.test(v.foto_id)) return ''; try { return C.sb.storage.from('acaptar-fotos').getPublicUrl(v.foto_id).data.publicUrl || ''; } catch (e) { return ''; } }
  function fotoAc(v, cls) {
    var u = fotoUrl(v), c = 'ac-foto' + (cls ? ' ' + cls : '');
    return u ? '<img class="' + c + '" src="' + esc(u) + '" alt="Foto do anúncio" loading="lazy">' : '<span class="' + c + ' sem" aria-hidden="true" title="Sem foto no anúncio">⌂</span>';
  }
  // foto que não carregou vira o ícone (sem atributo inline: a política do app barra script inline)
  document.addEventListener('error', function (ev) { var t = ev.target; if (t && t.tagName === 'IMG' && t.classList.contains('ac-foto')) { var sp = document.createElement('span'); sp.className = t.className + ' sem'; sp.setAttribute('aria-hidden', 'true'); sp.textContent = '⌂'; t.replaceWith(sp); } }, true);
  function celImovel(v) {
    var en = endereco(v);
    return '<td class="c-nome"><div class="ac-im">' + fotoAc(v) + '<div class="ac-im-t"><b>' + esc(v.bairro || '—') + (v.fora_da_ilha ? ' <span class="s" style="display:inline">(fora da ilha)</span>' : '') + '</b>' +
      (en ? '<span class="s" data-sens>' + esc(en) + '</span>' : '') + (v.cod ? '<span class="cod">' + esc(v.cod) + '</span>' : '') + '</div></div></td>';
  }

  function filtros(base) {
    var bs = bairrosDe(base), sel = Object.keys(A.bs), nomeK = {}; bs.forEach(function (b) { nomeK[b.k] = b.nome; });
    var e = entender(A.f.q, bairrosDe(A.im));
    var rotB = !sel.length ? 'Bairros: todos' : sel.length === 1 ? 'Bairro: ' + (nomeK[sel[0]] || sel[0]) : sel.length + ' bairros';
    var h = '<div class="filtros-ac">' +
      '<input type="search" id="acBusca" placeholder="Ex.: Campeche, aluguel, 3 dorm, até 4 mil" aria-label="Busca inteligente" value="' + esc(A.f.q) + '" autocomplete="off">' +
      '<select id="acNeg" aria-label="Negócio"><option value="">Aluguel e venda</option><option value="aluguel"' + (A.f.neg === 'aluguel' ? ' selected' : '') + '>Aluguel</option><option value="venda"' + (A.f.neg === 'venda' ? ' selected' : '') + '>Venda</option></select>' +
      '<button type="button" class="btn btn-bairros" data-acao="bairros" aria-expanded="' + A.bAberto + '">' + esc(rotB) + ' ' + (A.bAberto ? '▴' : '▾') + '</button>' +
      '</div>';
    if (sel.length) h += '<div class="chips-ac">' + sel.map(function (k) { return '<button type="button" class="chip-ac" data-acao="bx" data-id="' + esc(k) + '" aria-label="Tirar ' + esc(nomeK[k] || k) + '">' + esc(nomeK[k] || k) + ' ×</button>'; }).join('') + '<button type="button" class="chip-ac limpar" data-acao="blimpar">Limpar bairros</button></div>';
    if (A.bAberto) {
      var bq = norm(A.bq);
      var grupos = Object.keys(PRACA).map(function (g) {
        var itens = bs.filter(function (b) { return b.praca === g && (!bq || norm(b.nome).indexOf(bq) >= 0); });
        if (!itens.length) return '';
        var todos = itens.every(function (b) { return A.bs[b.k]; });
        return '<div class="grp-b"><div class="grp-b-t"><b>' + PRACA[g] + '</b><button type="button" class="btn" data-acao="bgrupo" data-id="' + g + '">' + (todos ? 'Desmarcar o grupo' : 'Marcar o grupo') + '</button></div><div class="ops-b">' +
          itens.map(function (b) { return '<label><input type="checkbox" data-bk="' + esc(b.k) + '"' + (A.bs[b.k] ? ' checked' : '') + '> <span>' + esc(b.nome) + '</span> <small>' + b.n + '</small></label>'; }).join('') + '</div></div>';
      }).join('');
      h += '<div class="pn-bairros"><input type="search" id="acBq" placeholder="Filtrar a lista de bairros" aria-label="Filtrar bairros" value="' + esc(A.bq) + '" autocomplete="off">' +
        (grupos || '<div class="vazio">Nenhum bairro com esse nome.</div>') +
        '<div class="linha-acoes"><button type="button" class="btn" data-acao="blimpar">Limpar</button><button type="button" class="btn pri" data-acao="bairros">Pronto</button></div></div>';
    }
    if (String(A.f.q || '').trim()) h += '<p class="s entendi">' + (e.rot.length ? 'Entendi: ' + e.rot.map(function (r) { return '<span class="pill">' + esc(r) + '</span>'; }).join(' ') : 'Nada reconhecido; busco o texto como está.') + '</p>';
    else h += '<details class="ajuda-busca"><summary>Como buscar</summary><p class="s">Escreva do seu jeito, com ou sem vírgulas: <b>Campeche aluguel 3 dorm</b> · <b>venda apto 2 quartos até 800 mil</b> · <b>casa 3+ dorm Rio Tavares, Campeche</b> · <b>kitnet centro até 2 mil</b> · <b>80 m2</b> · <b>entre 2 e 3 mil</b> · código <b>AC-XXXXXX</b>. Quartos e valores aproximados (“800 mil”, “80 m2”) aceitam 20% para mais e para menos; vários bairros valem qualquer um deles.</p></details>';
    return h;
  }

  function telaDisp() {
    var base = A.im.filter(function (v) { return v.lista === 'base'; });
    var arr = ordenar(filtrar(base), A.ordem.disp, valImovel);
    var cols = [['bairro', 'Imóvel'], ['negocio', 'Negócio e tipo'], ['preco', 'Valor'], ['area', 'Quartos · área'], ['estrelas', 'Prioridade'], ['anuncio', 'Anunciado'], ['situacao', 'Situação']];
    var colsBarra = [['bairro', 'Bairro'], ['negocio', 'Negócio'], ['tipo', 'Tipo'], ['preco', 'Valor'], ['quartos', 'Quartos'], ['area', 'Área'], ['estrelas', 'Prioridade'], ['anuncio', 'Anunciado'], ['situacao', 'Situação']];
    var h = filtros(base);
    if (!base.length) return h + '<div class="vazio">A base ainda não chegou ao app.</div>';
    if (!arr.length) return h + '<div class="vazio">Nenhum imóvel com esses filtros.</div>';
    var linhas = arr.map(function (v) {
      var s = situacao(v), ac = '';
      if (s.k === 'livre') ac = '<button class="btn pri" data-acao="confirmar" data-id="' + esc(v.id) + '"' + (A.ocupado ? ' disabled' : '') + '>Ver e captar</button>';
      else if (s.k === 'meu') ac = '<button class="btn" data-sub="minhas">Abrir em Minhas</button>';
      var conf = A.confirmar === v.id ? '<div class="msg aviso" style="margin-top:8px">O imóvel fica em captação por você, em nome da Vivere, por 7 dias renovados a cada contato registrado. A equipe verá que ele está com você, e o contato do proprietário abre em “Minhas captações”.<div class="linha-acoes" style="margin-top:8px"><button class="btn pri" data-acao="captar" data-id="' + esc(v.id) + '">Confirmar e captar</button><button class="btn" data-acao="cancelar">Cancelar</button></div></div>' : '';
      var an = v.anunciado_em || v.coletado_em;
      return '<tr' + (A.cod ? ' class="alvo"' : '') + '>' + celImovel(v) +
        '<td data-r="Negócio e tipo">' + esc(NEG[v.negocio] || '—') + '<span class="s">' + esc(TIPO[v.tipo] || 'Tipo não informado') + '</span></td>' +
        '<td data-r="Valor" class="num" data-sens>' + brl(v.preco) + '</td>' +
        '<td data-r="Quartos · área" class="num">' + (v.quartos == null ? '—' : v.quartos + (v.quartos === 1 ? ' quarto' : ' quartos')) + '<span class="s">' + (v.area ? v.area + ' m²' : 'área —') + '</span></td>' +
        '<td data-r="Prioridade"><span class="est" title="' + esc(PRACA[v.praca] || '') + '">' + estrelas(v.estrelas) + '</span></td>' +
        '<td data-r="Anunciado">' + dataBR(an) + '<span class="s">' + esc(origemDe(v)) + '</span>' + sitesDe(v) + '</td>' +
        '<td class="c-acoes c-sit"><div class="linha-acoes"><span class="pill ' + (s.k === 'livre' ? 'ok' : s.k === 'meu' ? 'warn' : '') + '">' + esc(s.t) + '</span>' + ac + '</div>' + conf + '</td></tr>';
    }).join('');
    return h + '<p class="s" style="margin:0 0 10px">' + arr.length + ' de ' + base.length + ' imóveis</p>' + barraOrd('disp', colsBarra) +
      '<table class="ac ac-disp"><thead><tr>' + cols.map(function (c) { return thOrd('disp', c[0], c[1]); }).join('') + '</tr></thead><tbody>' + linhas + '</tbody></table>';
  }

  function telaMinhas() {
    var meus = A.tr.filter(function (t) { return t.user_id === C.sessaoUid; });
    if (A.cod) { var alvo = meus.filter(function (t) { var v = acharIm(t.imovel_id); return v && v.cod === A.cod; }); if (alvo.length) meus = alvo; }
    if (!meus.length) return '<div class="vazio">Você ainda não está captando nenhum imóvel. Escolha um em “Disponíveis”.</div>';
    meus.sort(function (a, b) { return new Date(b.travado_em) - new Date(a.travado_em); });
    return '<div class="grade-cap">' + meus.map(function (t) {
      var v = acharIm(t.imovel_id) || { id: t.imovel_id }, c = A.ct[t.imovel_id], en = endereco(v);
      var rest = Math.max(0, Math.ceil((EXPIRA * DIA - (Date.now() - ultimo(t))) / DIA));
      var hist = (t.contatos || []).slice().reverse().map(function (x) { return '<li>' + dataBR(x.em) + ' — ' + esc(x.nota || 'contato feito') + '</li>'; }).join('');
      var dados = '';
      if (c) {
        var tels = (c.telefones || []).map(function (n) { return '<span class="tel" data-sens>' + esc(fmtTel(n)) + '</span> <button class="copiar" data-copiar="' + esc(n) + '">Copiar</button>'; }).join('<br>');
        var mails = (c.emails || []).map(function (m) { return '<span data-sens>' + esc(m) + '</span> <button class="copiar" data-copiar="' + esc(m) + '">Copiar</button>'; }).join('<br>');
        dados = '<dl class="campos">' +
          '<div><dt>Proprietário</dt><dd data-sens>' + esc(c.nome || '—') + '</dd></div>' +
          '<div><dt>' + (mails ? 'Telefone e e-mail' : 'Telefone') + '</dt><dd>' + (tels || '—') + (mails ? '<br>' + mails : '') + '</dd></div>' +
          '<div><dt>Achado em</dt><dd>' + (/^https?:\/\//i.test(c.link || '') ? '<a href="' + esc(c.link) + '" target="_blank" rel="noopener noreferrer">' + esc(origemDe(v)) + ' ↗</a>' : esc(origemDe(v))) + '</dd></div>' +
          '<div><dt>Captado em</dt><dd>' + dataBR(t.travado_em) + '<span class="s">' + nContatos(t) + '</span></dd></div>' +
          (c.titulo ? '<div class="largo"><dt>Anúncio</dt><dd>' + esc(c.titulo) + '</dd></div>' : '') +
          (c.descricao ? '<div class="largo"><dt>Descrição</dt><dd>' + esc(c.descricao) + '</dd></div>' : '') +
          '</dl>';
      } else dados = '<div class="msg aviso">O contato deste imóvel não chegou. Avise a diretoria.</div>';
      var conf = A.soltar === t.imovel_id;
      return '<article class="cartao cap">' + fotoAc(v, 'g') + '<div class="cap-topo"><h3>' + esc((TIPO[v.tipo] || 'Imóvel') + ' · ' + (v.bairro || '—')) + '</h3><span class="pill warn">Expira em ' + rest + (rest === 1 ? ' dia' : ' dias') + '</span></div>' +
        '<p class="s"><span data-sens>' + esc((NEG[v.negocio] || '') + ' · ' + brl(v.preco)) + '</span>' + (v.area ? ' · ' + v.area + ' m²' : '') + (v.cod ? ' · <span class="cod">' + esc(v.cod) + '</span>' : '') + '</p>' +
        (en ? '<p class="s" data-sens>' + esc(en) + '</p>' : '') + dados +
        (hist ? '<ul class="registro">' + hist + '</ul>' : '') +
        '<textarea id="nota-' + esc(t.imovel_id) + '" maxlength="500" placeholder="Como foi o contato? (opcional)" aria-label="Nota do contato"></textarea>' +
        '<div class="linha-acoes"><button class="btn pri" data-acao="registrar" data-id="' + esc(t.imovel_id) + '"' + (A.ocupado ? ' disabled' : '') + '>Registrar contato</button>' +
        (conf ? '<button class="btn perigo" data-acao="soltar_ok" data-id="' + esc(t.imovel_id) + '">Confirmar: soltar</button><button class="btn" data-acao="cancelar">Cancelar</button>' : '<button class="btn perigo" data-acao="soltar" data-id="' + esc(t.imovel_id) + '">Soltar imóvel</button>') +
        '</div></article>';
    }).join('') + '</div>';
  }

  function nContatos(t) { var n = (t.contatos || []).length; return n ? n + (n === 1 ? ' contato registrado' : ' contatos registrados') : 'nenhum contato ainda'; }
  function acharIm(id) { for (var i = 0; i < A.im.length; i++) if (A.im[i].id === id) return A.im[i]; return null; }

  function telaCaptei() {
    var base = A.im.filter(function (v) { return v.lista === 'captei'; });
    var arr = ordenar(filtrar(base), A.ordem.captei, valImovel);
    var cols = [['bairro', 'Imóvel'], ['negocio', 'Negócio'], ['tipo', 'Tipo'], ['preco', 'Valor'], ['area', 'Área']];
    var h = '<p class="s" style="margin:0 0 10px">Imóveis localizados no Captei. A lista é grátis; abrir o proprietário custa 1 Capcoin, por isso cada busca passa pelo OK da diretoria.</p>' + filtros(base);
    if (!arr.length) return h + '<div class="vazio">Nenhum imóvel do Captei com esses filtros.</div>';
    var linhas = arr.map(function (v) {
      var p = null; A.ped.forEach(function (x) { if (x.imovel_id === v.id && x.user_id === C.sessaoUid) p = x; });
      var ac = p ? '<span class="pill ' + (p.status === 'aprovado' ? 'ok' : p.status === 'recusado' ? 'bad' : 'warn') + '">' + (p.status === 'aprovado' ? 'Aprovado pela diretoria' : p.status === 'recusado' ? 'Recusado pela diretoria' : 'Aguardando OK da diretoria') + '</span>'
        : '<button class="btn" data-acao="pedir" data-id="' + esc(v.id) + '"' + (A.ocupado ? ' disabled' : '') + '>Pedir a busca (1 Capcoin)</button>';
      return '<tr' + (A.cod ? ' class="alvo"' : '') + '>' + celImovel(v) + '<td data-r="Negócio">' + esc(NEG[v.negocio] || '—') + '</td><td data-r="Tipo">' + esc(TIPO[v.tipo] || '—') + '</td><td data-r="Valor" class="num" data-sens>' + brl(v.preco) + '</td><td data-r="Área" class="num">' + (v.area ? v.area + ' m²' : '—') + '</td><td class="c-acoes"><div class="linha-acoes">' + ac + '</div></td></tr>';
    }).join('');
    return h + barraOrd('captei', cols) + '<table class="ac"><thead><tr>' + cols.map(function (c) { return thOrd('captei', c[0], c[1]); }).join('') + '<th></th></tr></thead><tbody>' + linhas + '</tbody></table>';
  }

  function telaDir() {
    var cols = [['imovel', 'Imóvel'], ['corretor', 'Corretor'], ['desde', 'Desde'], ['contatos', 'Contatos'], ['ultimo', 'Último contato']];
    var val = function (t, k) {
      var v = acharIm(t.imovel_id) || {};
      if (k === 'imovel') return (TIPO[v.tipo] || 'Imóvel') + ' ' + (v.bairro || '');
      if (k === 'corretor') return nulo(t.nome); if (k === 'desde') return t.travado_em;
      if (k === 'contatos') return (t.contatos || []).length; return nulo(t.ultimo_contato_em);
    };
    var arr = ordenar(A.tr.slice(), A.ordem.dir, val);
    var travas = !arr.length ? '<div class="vazio">Nenhum imóvel em captação agora.</div>' :
      barraOrd('dir', cols) + '<table class="ac"><thead><tr>' + cols.map(function (c) { return thOrd('dir', c[0], c[1]); }).join('') + '<th></th></tr></thead><tbody>' +
      arr.map(function (t) {
        var v = acharIm(t.imovel_id) || {};
        var conf = A.soltar === 'dir:' + t.imovel_id;
        return '<tr><td class="c-nome"><b>' + esc((TIPO[v.tipo] || 'Imóvel') + ' · ' + (v.bairro || t.imovel_id)) + '</b><span class="s" data-sens>' + brl(v.preco) + '</span>' + (v.cod ? '<span class="cod">' + esc(v.cod) + '</span>' : '') + '</td>' +
          '<td data-r="Corretor">' + esc(t.nome || '—') + '</td><td data-r="Desde">' + dataBR(t.travado_em) + '</td><td data-r="Contatos" class="num">' + (t.contatos || []).length + '</td><td data-r="Último contato">' + dataBR(t.ultimo_contato_em) + '</td>' +
          '<td class="c-acoes"><div class="linha-acoes">' + (conf ? '<button class="btn perigo" data-acao="liberar_ok" data-id="' + esc(t.imovel_id) + '">Confirmar: liberar</button><button class="btn" data-acao="cancelar">Cancelar</button>' : '<button class="btn perigo" data-acao="liberar" data-id="' + esc(t.imovel_id) + '">Liberar imóvel</button>') + '</div></td></tr>';
      }).join('') + '</tbody></table>';
    var pend = A.ped.filter(function (p) { return p.status === 'aguardando'; });
    var peds = !pend.length ? '<div class="vazio">Nenhum pedido do Captei aguardando.</div>' :
      '<table class="ac"><thead><tr><th>Imóvel</th><th>Corretor</th><th>Pedido em</th><th></th></tr></thead><tbody>' + pend.map(function (p) {
        var v = acharIm(p.imovel_id) || {};
        return '<tr><td class="c-nome"><b>' + esc((TIPO[v.tipo] || 'Imóvel') + ' · ' + (v.bairro || p.imovel_id)) + '</b><span class="s" data-sens>' + esc(endereco(v)) + '</span></td><td data-r="Corretor">' + esc(p.nome || '—') + '</td><td data-r="Pedido em">' + dataBR(p.pedido_em) + '</td>' +
          '<td class="c-acoes"><div class="linha-acoes"><button class="btn pri" data-acao="aprovar" data-id="' + esc(p.imovel_id) + '" data-u="' + esc(p.user_id) + '">Aprovar</button><button class="btn" data-acao="recusar" data-id="' + esc(p.imovel_id) + '" data-u="' + esc(p.user_id) + '">Recusar</button></div></td></tr>';
      }).join('') + '</tbody></table>';
    return '<section class="sec" style="margin-top:0"><h2 class="tit-sec">Em captação</h2>' + travas + '</section><section class="sec"><h2 class="tit-sec">Pedidos do Captei</h2>' + peds + '</section>';
  }

  async function rpc(nome, args, msgOk) {
    if (A.ocupado) return null;
    A.ocupado = true; desenhar();
    var r = await C.sb.rpc(nome, args);
    A.ocupado = false;
    if (r.error) { C.toast('Não foi possível gravar agora: ' + r.error.message); desenhar(); return null; }
    if (r.data && r.data.ok === false) {
      var m = r.data.motivo === 'em_captacao' ? 'Outro corretor pegou este imóvel antes de você.' : r.data.motivo === 'imovel_indisponivel' ? 'Este imóvel não está mais disponível.' : 'Nada foi alterado.';
      C.toast(m);
    } else if (msgOk) C.toast(msgOk);
    await carregar(); desenhar();
    return r.data;
  }

  var raiz = null;
  function desenhar() {
    if (!raiz) return;
    var subs = [['disp', 'Disponíveis'], ['minhas', 'Minhas captações'], ['captei', 'Captei · 1 Capcoin']];
    if (diretoria()) subs.push(['dir', 'Diretoria']);
    if (!subs.some(function (s) { return s[0] === A.sub; })) A.sub = 'disp';
    var total = A.im.filter(function (v) { return v.lista === 'base'; }).length;
    var livres = A.im.filter(function (v) { return v.lista === 'base' && situacao(v).k === 'livre'; }).length;
    var minhas = A.tr.filter(function (t) { return t.user_id === C.sessaoUid; }).length;
    var vencendo = A.tr.filter(function (t) { return t.user_id === C.sessaoUid && (EXPIRA * DIA - (Date.now() - ultimo(t))) <= 2 * DIA; }).length;
    var corpo = A.sub === 'minhas' ? telaMinhas() : A.sub === 'captei' ? telaCaptei() : A.sub === 'dir' ? telaDir() : telaDisp();
    raiz.innerHTML =
      '<div class="resumo-ac"><div class="tot"><b>' + total + '</b><span>Total disponível</span></div><div><b>' + livres + '</b><span>Livres</span></div><div><b>' + minhas + '</b><span>Minhas</span></div>' + (diretoria() ? '<div><b>' + A.tr.length + '</b><span>Em captação (equipe)</span></div>' : '<div><b>' + vencendo + '</b><span>Vencem em até 2 dias</span></div>') + '<div><b>' + A.im.filter(function (v) { return v.lista === 'captei'; }).length + '</b><span>No Captei</span></div></div>' +
      '<div class="cod-ac"><label for="acCod">Código do imóvel</label><input id="acCod" placeholder="AC-XXXXXX" value="' + esc(A.cod) + '" autocomplete="off">' + (A.cod ? '<button class="btn" data-acao="limpar_cod">Limpar</button>' : '') + '</div>' +
      '<nav class="subabas" role="tablist">' + subs.map(function (s) { return '<button type="button" role="tab" data-sub="' + s[0] + '" aria-selected="' + (A.sub === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</nav>' +
      '<div class="lista-acessos">' + corpo + '</div>' +
      '<p class="s" style="margin-top:20px">Base com anúncios coletados até ' + (A.atualizado || '—') + '.</p>';
    ligar();
  }

  function ligar() {
    raiz.querySelectorAll('[data-sub]').forEach(function (b) { b.onclick = function () { A.sub = b.dataset.sub; A.confirmar = null; A.soltar = null; try { sessionStorage.setItem('acaptar-sub', A.sub); } catch (e) { } desenhar(); }; });
    raiz.querySelectorAll('[data-ord]').forEach(function (b) { b.onclick = function () { var p = b.dataset.ord.split(':'), st = A.ordem[p[0]]; A.ordem[p[0]] = st.k === p[1] ? { k: p[1], d: -st.d } : { k: p[1], d: 1 }; desenhar(); }; });
    raiz.querySelectorAll('[data-copiar]').forEach(function (b) { b.onclick = function () { try { navigator.clipboard.writeText(b.dataset.copiar).then(function () { b.textContent = 'Copiado'; setTimeout(function () { b.textContent = 'Copiar'; }, 1500); }); } catch (e) { } }; });
    var busca = raiz.querySelector('#acBusca');
    if (busca) busca.oninput = function () { A.f.q = busca.value; var pos = busca.selectionStart; desenhar(); var n = raiz.querySelector('#acBusca'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } } };
    var neg = raiz.querySelector('#acNeg'); if (neg) neg.onchange = function () { A.f.neg = neg.value; desenhar(); };
    var bq = raiz.querySelector('#acBq');
    if (bq) bq.oninput = function () { A.bq = bq.value; var pos = bq.selectionStart; desenhar(); var n = raiz.querySelector('#acBq'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } } };
    raiz.querySelectorAll('[data-bk]').forEach(function (c) { c.onchange = function () { if (c.checked) A.bs[c.dataset.bk] = 1; else delete A.bs[c.dataset.bk]; guardarBairros(); desenhar(); }; });
    var cod = raiz.querySelector('#acCod');
    if (cod) cod.onchange = function () { usarCodigo(cod.value); desenhar(); };
    raiz.querySelectorAll('[data-acao]').forEach(function (b) {
      b.onclick = function () {
        var id = b.dataset.id, a = b.dataset.acao;
        if (a === 'confirmar') { A.confirmar = id; desenhar(); }
        else if (a === 'cancelar') { A.confirmar = null; A.soltar = null; desenhar(); }
        else if (a === 'captar') { A.confirmar = null; rpc('ac_travar', { p_imovel: id }, 'Imóvel em captação por você. O contato está em “Minhas captações”.').then(function (d) { if (d && d.ok) { A.sub = 'minhas'; desenhar(); } }); }
        else if (a === 'registrar') { var ta = raiz.querySelector('#nota-' + CSS.escape(id)); rpc('ac_registrar_contato', { p_imovel: id, p_nota: ta ? ta.value : '' }, 'Contato registrado. O prazo de 7 dias recomeçou.'); }
        else if (a === 'soltar') { A.soltar = id; desenhar(); }
        else if (a === 'soltar_ok') { A.soltar = null; rpc('ac_soltar', { p_imovel: id }, 'Imóvel solto. Ele voltou para os disponíveis.'); }
        else if (a === 'pedir') rpc('ac_pedir_captei', { p_imovel: id }, 'Pedido enviado à diretoria.');
        else if (a === 'aprovar' || a === 'recusar') rpc('ac_decidir_pedido', { p_imovel: id, p_user: b.dataset.u, p_status: a === 'aprovar' ? 'aprovado' : 'recusado' }, a === 'aprovar' ? 'Pedido aprovado.' : 'Pedido recusado.');
        else if (a === 'liberar') { A.soltar = 'dir:' + id; desenhar(); }
        else if (a === 'liberar_ok') { A.soltar = null; rpc('ac_liberar', { p_imovel: id }, 'Imóvel liberado.'); }
        else if (a === 'limpar_cod') { A.cod = ''; desenhar(); }
        else if (a === 'bairros') { A.bAberto = !A.bAberto; if (!A.bAberto) A.bq = ''; desenhar(); }
        else if (a === 'bx') { delete A.bs[id]; guardarBairros(); desenhar(); }
        else if (a === 'blimpar') { A.bs = {}; guardarBairros(); desenhar(); }
        else if (a === 'bgrupo') { var lista = bairrosDe(A.im.filter(function (v) { return v.lista === (A.sub === 'captei' ? 'captei' : 'base'); })).filter(function (b) { return b.praca === id && (!A.bq || norm(b.nome).indexOf(norm(A.bq)) >= 0); }); var todos = lista.every(function (b) { return A.bs[b.k]; }); lista.forEach(function (b) { if (todos) delete A.bs[b.k]; else A.bs[b.k] = 1; }); guardarBairros(); desenhar(); }
      };
    });
  }

  function usarCodigo(c) {
    c = String(c || '').trim().toUpperCase().replace(/\s/g, '');
    if (c && !/^AC-/.test(c)) c = 'AC-' + c;
    A.cod = /^AC-[0-9A-Z]{6}$/.test(c) ? c : '';
    if (!A.cod) return;
    var v = A.im.filter(function (x) { return x.cod === A.cod; })[0];
    if (!v) { C.toast('Código não encontrado na base.'); return; }
    var s = v.lista === 'captei' ? null : situacao(v);
    A.sub = v.lista === 'captei' ? 'captei' : s.k === 'meu' ? 'minhas' : 'disp';
  }

  window.ACAPTAR = {
    resumo: async function (ctx) {
      C = ctx; if (!A.carregado && !A.carregando) await carregar();
      return { livres: A.im.filter(function (v) { return v.lista === 'base' && situacao(v).k === 'livre'; }).length, minhas: A.tr.filter(function (t) { return t.user_id === C.sessaoUid; }).length };
    },
    tela: async function (main, ctx, cod) {
      C = ctx; C.titulo('A CAPTAR');
      main.innerHTML = '<div id="acRaiz"><div class="vazio">Carregando o A CAPTAR…</div></div>';
      raiz = main.querySelector('#acRaiz');
      await carregar();
      if (cod) usarCodigo(cod);
      var max = A.im.reduce(function (m, v) { return v.coletado_em && v.coletado_em > m ? v.coletado_em : m; }, '');
      A.atualizado = max ? dataBR(max) : null;
      desenhar();
    },
    sair: function () {
      geracao++; raiz = null;
      A.carregado = false; A.carregando = false; A.im = []; A.tr = []; A.ped = []; A.ct = {};
      A.cod = ''; A.sub = 'disp'; A.confirmar = null; A.soltar = null; A.ocupado = false; A.f = { q: '', neg: '' }; A.bAberto = false; A.bq = '';
      try { sessionStorage.removeItem('acaptar-sub'); } catch (e) { }
    }
  };
})();
