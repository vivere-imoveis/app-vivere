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
    f: { q: '', neg: '', praca: '', bairro: '' }, cod: '', ordem: { disp: { k: 'anuncio', d: -1 }, captei: { k: 'bairro', d: 1 }, dir: { k: 'desde', d: 1 } },
    confirmar: null, soltar: null, ocupado: false
  };
  var C = null; // contexto vindo do app.js: { sb, eu, esc, toast, titulo, redesenhar }

  try { var s0 = sessionStorage.getItem('acaptar-sub'); if (s0) A.sub = s0; } catch (e) { }
  try { var b0 = localStorage.getItem('acaptar-bairro'); if (b0) A.f.bairro = b0; } catch (e) { }

  function esc(v) { return C.esc(v); }
  var brl = function (v) { return v == null ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 }); };
  var dataBR = function (s) { if (!s) return '—'; var t = String(s); if (/^\d{4}-\d{2}-\d{2}$/.test(t)) t += 'T12:00:00'; var d = new Date(t); return isNaN(d) ? C.esc(t) : d.toLocaleDateString('pt-BR'); };
  var fmtCep = function (c) { c = String(c || '').replace(/\D/g, ''); return c.length === 8 ? c.slice(0, 5) + '-' + c.slice(5) : c; };
  var fmtTel = function (t) { t = String(t).replace(/\D/g, ''); return t.length === 11 ? '(' + t.slice(0, 2) + ') ' + t.slice(2, 7) + '-' + t.slice(7) : t.length === 10 ? '(' + t.slice(0, 2) + ') ' + t.slice(2, 6) + '-' + t.slice(6) : t; };
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
      sb.from('ac_imoveis').select('id,cod,lista,negocio,tipo,bairro,praca,preco,quartos,area,rua,cep,empreendimento,estrelas,fora_da_ilha,coletado_em,anunciado_em,origem,fonte,distribuido_para').eq('ativo', true).limit(2000),
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

  function filtrar(arr) {
    if (A.cod) return arr.filter(function (v) { return v.cod === A.cod; });
    var q = norm(A.f.q);
    return arr.filter(function (v) {
      if (A.f.neg && v.negocio !== A.f.neg) return false;
      if (A.f.praca && v.praca !== A.f.praca) return false;
      if (A.f.bairro && norm(v.bairro) !== A.f.bairro) return false;
      if (q && norm([v.bairro, TIPO[v.tipo], v.rua, v.empreendimento, v.cod].join(' ')).indexOf(q) < 0) return false;
      return true;
    });
  }

  function celImovel(v) {
    var en = endereco(v);
    return '<td class="c-nome"><b>' + esc(v.bairro || '—') + (v.fora_da_ilha ? ' <span class="s" style="display:inline">(fora da ilha)</span>' : '') + '</b>' +
      (en ? '<span class="s" data-sens>' + esc(en) + '</span>' : '') + (v.cod ? '<span class="cod">' + esc(v.cod) + '</span>' : '') + '</td>';
  }

  function filtros(base) {
    var bairros = {}; base.forEach(function (v) { if (v.bairro) { var k = norm(v.bairro); if (!bairros[k]) bairros[k] = { n: 0, nome: v.bairro }; bairros[k].n++; } });
    var ops = Object.keys(bairros).sort(function (a, b) { return bairros[a].nome.localeCompare(bairros[b].nome, 'pt-BR'); }).map(function (k) { return '<option value="' + esc(k) + '"' + (A.f.bairro === k ? ' selected' : '') + '>' + esc(bairros[k].nome) + ' (' + bairros[k].n + ')</option>'; }).join('');
    return '<div class="filtros-ac">' +
      '<input type="search" id="acBusca" placeholder="Bairro, tipo, rua ou código" aria-label="Buscar" value="' + esc(A.f.q) + '">' +
      '<select id="acNeg" aria-label="Negócio"><option value="">Aluguel e venda</option><option value="aluguel"' + (A.f.neg === 'aluguel' ? ' selected' : '') + '>Aluguel</option><option value="venda"' + (A.f.neg === 'venda' ? ' selected' : '') + '>Venda</option></select>' +
      '<select id="acPraca" aria-label="Região"><option value="">Toda a ilha e continente</option>' + Object.keys(PRACA).map(function (k) { return '<option value="' + k + '"' + (A.f.praca === k ? ' selected' : '') + '>' + PRACA[k] + '</option>'; }).join('') + '</select>' +
      '<select id="acBairro" aria-label="Bairro"><option value="">Todos os bairros</option>' + ops + '</select>' +
      '</div>';
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
        '<td data-r="Anunciado">' + dataBR(an) + '<span class="s">' + esc(origemDe(v)) + '</span></td>' +
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
      return '<article class="cartao cap"><div class="cap-topo"><h3>' + esc((TIPO[v.tipo] || 'Imóvel') + ' · ' + (v.bairro || '—')) + '</h3><span class="pill warn">Expira em ' + rest + (rest === 1 ? ' dia' : ' dias') + '</span></div>' +
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
    var livres = A.im.filter(function (v) { return v.lista === 'base' && situacao(v).k === 'livre'; }).length;
    var minhas = A.tr.filter(function (t) { return t.user_id === C.sessaoUid; }).length;
    var vencendo = A.tr.filter(function (t) { return t.user_id === C.sessaoUid && (EXPIRA * DIA - (Date.now() - ultimo(t))) <= 2 * DIA; }).length;
    var corpo = A.sub === 'minhas' ? telaMinhas() : A.sub === 'captei' ? telaCaptei() : A.sub === 'dir' ? telaDir() : telaDisp();
    raiz.innerHTML =
      '<div class="resumo-ac"><div><b>' + livres + '</b><span>Livres</span></div><div><b>' + minhas + '</b><span>Minhas</span></div>' + (diretoria() ? '<div><b>' + A.tr.length + '</b><span>Em captação (equipe)</span></div>' : '<div><b>' + vencendo + '</b><span>Vencem em até 2 dias</span></div>') + '<div><b>' + A.im.filter(function (v) { return v.lista === 'captei'; }).length + '</b><span>No Captei</span></div></div>' +
      '<div class="cod-ac"><label for="acCod">Código do imóvel</label><input id="acCod" placeholder="AC-XXXXXX" value="' + esc(A.cod) + '" autocomplete="off">' + (A.cod ? '<button class="btn" data-acao="limpar_cod">Limpar</button>' : '') + '</div>' +
      '<nav class="subabas" role="tablist">' + subs.map(function (s) { return '<button type="button" role="tab" data-sub="' + s[0] + '" aria-selected="' + (A.sub === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</nav>' +
      '<div class="lista-acessos">' + corpo + '</div>' +
      '<p class="s" style="margin-top:20px">Base de ' + (A.atualizado || '—') + ' · a lista diária ainda é atualizada no A CAPTAR do claude.ai; aqui, por ora, é a cópia de 09/11/2026.</p>';
    ligar();
  }

  function ligar() {
    raiz.querySelectorAll('[data-sub]').forEach(function (b) { b.onclick = function () { A.sub = b.dataset.sub; A.confirmar = null; A.soltar = null; try { sessionStorage.setItem('acaptar-sub', A.sub); } catch (e) { } desenhar(); }; });
    raiz.querySelectorAll('[data-ord]').forEach(function (b) { b.onclick = function () { var p = b.dataset.ord.split(':'), st = A.ordem[p[0]]; A.ordem[p[0]] = st.k === p[1] ? { k: p[1], d: -st.d } : { k: p[1], d: 1 }; desenhar(); }; });
    raiz.querySelectorAll('[data-copiar]').forEach(function (b) { b.onclick = function () { try { navigator.clipboard.writeText(b.dataset.copiar).then(function () { b.textContent = 'Copiado'; setTimeout(function () { b.textContent = 'Copiar'; }, 1500); }); } catch (e) { } }; });
    var busca = raiz.querySelector('#acBusca');
    if (busca) busca.oninput = function () { A.f.q = busca.value; var pos = busca.selectionStart; desenhar(); var n = raiz.querySelector('#acBusca'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } } };
    [['#acNeg', 'neg'], ['#acPraca', 'praca'], ['#acBairro', 'bairro']].forEach(function (p) { var s = raiz.querySelector(p[0]); if (s) s.onchange = function () { A.f[p[1]] = s.value; if (p[1] === 'bairro') { try { localStorage.setItem('acaptar-bairro', s.value); } catch (e) { } } desenhar(); }; });
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
      A.cod = ''; A.sub = 'disp'; A.confirmar = null; A.soltar = null; A.ocupado = false; A.f = { q: '', neg: '', praca: '', bairro: '' };
      try { sessionStorage.removeItem('acaptar-sub'); } catch (e) { }
    }
  };
})();
