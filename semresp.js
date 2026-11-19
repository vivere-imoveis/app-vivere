/* Imóveis sem responsável — aba do painel do corretor, aberta no app (19/11/2026, decisões do Cleiton).
   Imóveis ativos da Vivere sem agenciador ou de ex-corretor: já foram captados no passado e só precisam ser atualizados.
   "Atualizar este imóvel" trava na hora por 3 dias (limite de 5 ao mesmo tempo) e o Cleiton recebe o aviso; o contato do
   proprietário (quando há na base) abre em A CAPTAR › Minhas captações. O imóvel só passa a ser do corretor depois que ele
   o atualizar (Vivian ou CRM) e o Cleiton autorizar. Leitura e escrita só pelas funções app_sa_listar e app_sa_travar.
   Lista no mesmo padrão do A CAPTAR (tabela com foto, ordenação e busca); a capa vem do anúncio no site (og:image). */
(function () {
  'use strict';
  var C = null, raiz = null;
  var S0 = function () { return { itens: [], vagas: null, q: '', confirmar: null, ocupado: false, ordem: { k: 'situacao', d: 1 } }; };
  var S = S0();
  var MOT = { em_captacao: 'Outro corretor já está atualizando este imóvel.', limite_5: 'Você já tem 5 imóveis em atualização ao mesmo tempo. A vaga volta quando um deles for atualizado e autorizado, ou quando a trava de 3 dias vencer.',
    imovel_indisponivel: 'Este imóvel não está mais disponível.', ja_tem_agenciador: 'Este imóvel já tem agenciador.', sem_app: 'Seu acesso ao app não está ativo.' };
  var SIT = { em_captacao_por_voce: ['Com você', 'warn', 0], livre: ['Livre', 'ok', 1], pedido_seu_pendente: ['Na sua fila', '', 2], em_captacao: ['Com outro corretor', '', 3], pedido_de_outro_pendente: ['Pedido de outro corretor', '', 4] };
  function esc(v) { return C.esc(v); }
  var num = function (v) { var n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(n) && n > 0 ? n : 0; };
  var brl = function (v) { var n = num(v); return n ? 'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '—'; };
  var dataBR = function (s) { if (!s) return ''; var t = String(s); if (/^\d{4}-\d{2}-\d{2}$/.test(t)) t += 'T12:00:00'; var d = new Date(t); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var capaOk = function (u) { return /^https:\/\/www\.viverenapraia\.com\.br\/imagens\//.test(String(u || '')); };

  async function carregar() {
    var r = await C.sb.rpc('app_sa_listar');
    if (r.error) { S.erro = r.error.message; return; }
    S.erro = null; S.itens = (r.data && r.data.itens) || []; S.vagas = (r.data && r.data.vagas) || null;
  }

  function foto(v) {
    return capaOk(v.capa) ? '<img class="ac-foto" src="' + esc(v.capa) + '" alt="Foto do imóvel" loading="lazy">' : '<span class="ac-foto sem" aria-hidden="true" title="Sem foto">⌂</span>';
  }
  function caracteristicas(v) {
    var d = num(v.dorm), s = num(v.suites), g = num(v.vagas), b = num(v.banh), a = num(v.area);
    var l1 = d ? d + (d === 1 ? ' dorm' : ' dorms') + (s ? ' (' + s + (s === 1 ? ' suíte' : ' suítes') + ')' : '') : 'dorms —';
    var l2 = [a ? a.toLocaleString('pt-BR') + ' m²' : '', g ? g + (g === 1 ? ' vaga' : ' vagas') : '', b ? b + (b === 1 ? ' banh.' : ' banhs.') : ''].filter(Boolean).join(' · ');
    return l1 + '<span class="s">' + (l2 || 'área —') + '</span>';
  }
  function ordenar(L) {
    var o = S.ordem, k = o.k;
    var val = function (v) {
      if (k === 'valor') return num(v.valor); if (k === 'area') return num(v.area); if (k === 'dorm') return num(v.dorm);
      if (k === 'bairro') return norm(v.bairro); if (k === 'ref') return String(v.ref || '');
      return (SIT[v.situacao] || [0, 0, 9])[2];
    };
    return L.slice().sort(function (a, b) { var x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : String(a.ref).localeCompare(String(b.ref))) * o.d; });
  }

  function linha(v) {
    var sit = SIT[v.situacao] || [v.situacao, '', 9];
    var origem = v.motivo === 'ex_corretor' ? 'De ex-corretor' + (v.agenciador_antigo ? ' · ' + esc(v.agenciador_antigo) : '') : 'Sem agenciador';
    var vm2 = num(v.valor) && num(v.area) ? 'R$ ' + Math.round(num(v.valor) / num(v.area)).toLocaleString('pt-BR') + '/m²' : '';
    var acoes = '';
    if (v.situacao === 'livre' || v.situacao === 'pedido_seu_pendente') acoes += '<button class="btn pri" data-sa="confirmar" data-ref="' + esc(v.ref) + '"' + (S.ocupado ? ' disabled' : '') + '>Atualizar este imóvel</button>';
    else if (v.situacao === 'em_captacao_por_voce') acoes += '<a class="btn" href="index.html?aba=acaptar">Ver contato</a>';
    if (v.link) acoes += '<a class="btn" href="' + esc(v.link) + '" target="_blank" rel="noopener">Anúncio</a>';
    if (v.gmaps) acoes += '<a class="btn" href="' + esc(v.gmaps) + '" target="_blank" rel="noopener">Mapa</a>';
    var conf = S.confirmar === v.ref ? '<div class="msg aviso" style="margin-top:8px">O <b>' + esc(v.ref) + '</b> fica com você por <b>3 dias</b> (cada contato registrado renova). '
      + (v.contato_na_base ? 'O contato do proprietário abre em A CAPTAR › Minhas captações.' : 'A base não tem o contato do proprietário: peça o Captei pela Vivian.')
      + ' Quando você atualizar o imóvel (valor, fotos, dados ou a conversa com o proprietário) pela Vivian ou no CRM, a diretoria autoriza e ele passa a ser seu.'
      + '<div class="linha-acoes" style="margin-top:8px"><button class="btn pri" data-sa="travar" data-ref="' + esc(v.ref) + '">Confirmar</button><button class="btn" data-sa="cancelar">Cancelar</button></div></div>' : '';
    var titulo = v.edificio || v.titulo || '';
    return '<tr>'
      + '<td class="c-nome"><div class="ac-im">' + foto(v) + '<div class="ac-im-t"><b>' + esc(v.bairro || '—') + (v.cidade && v.cidade !== 'Florianópolis' ? ' · ' + esc(v.cidade) : '') + '</b>'
      + (titulo ? '<span class="s">' + esc(titulo) + '</span>' : '') + '<span class="cod">' + esc(v.ref) + '</span></div></div></td>'
      + '<td data-r="Negócio e tipo">' + esc(v.fin || '—') + '<span class="s">' + esc(v.tipo || 'Tipo não informado') + '</span></td>'
      + '<td data-r="Valor" class="num" data-sens>' + brl(v.valor) + (vm2 ? '<span class="s">' + vm2 + '</span>' : '') + '</td>'
      + '<td data-r="Características" class="num">' + caracteristicas(v) + '</td>'
      + '<td data-r="Origem">' + origem + '<span class="s">' + (v.contato_na_base ? 'Contato na base' : 'Sem contato na base') + (v.atualizado ? ' · atualizado em ' + dataBR(v.atualizado) : '') + '</span>'
      + (v.trava_ate ? '<span class="s">Com você até ' + dataBR(v.trava_ate) + '</span>' : '') + '</td>'
      + '<td class="c-acoes c-sit"><div class="linha-acoes"><span class="pill ' + sit[1] + '">' + esc(sit[0]) + '</span>' + acoes + '</div>' + conf + '</td></tr>';
  }

  function desenhar() {
    if (!raiz) return;
    if (S.erro) { raiz.innerHTML = '<div class="msg erro">Não foi possível abrir a lista agora: ' + esc(S.erro) + '</div>'; return; }
    var q = norm(S.q);
    var L = ordenar(S.itens.filter(function (v) { return !q || norm([v.ref, v.tipo, v.bairro, v.edificio, v.titulo, v.fin, v.agenciador_antigo].join(' ')).indexOf(q) >= 0; }));
    var vg = S.vagas || {};
    var cols = [['ref', 'Imóvel'], ['fin', 'Negócio e tipo'], ['valor', 'Valor'], ['dorm', 'Características'], ['origem', 'Origem'], ['situacao', 'Situação']];
    var ordBtn = [['situacao', 'Situação'], ['bairro', 'Bairro'], ['valor', 'Valor'], ['area', 'Área'], ['dorm', 'Dormitórios'], ['ref', 'Código']];
    raiz.innerHTML = '<section class="sec" style="margin-top:0;container-type:inline-size"><h2 class="tit-sec">Imóveis sem responsável</h2>'
      + '<p class="s" style="margin:0 0 8px">Imóveis da Vivere que já foram captados, mas estão sem agenciador ou eram de corretor que saiu. Atualize até <b>5 ao mesmo tempo</b>: cada um fica com você por 3 dias e a diretoria é avisada.</p>'
      + '<div class="msg ' + (vg.vagas > 0 ? 'ok' : 'aviso') + '" style="margin:0 0 10px">Com você agora: <b>' + (vg.ativas || 0) + ' de ' + (vg.limite || 5) + '</b>' + (vg.fila ? ' · ' + vg.fila + ' na sua fila' : '') + (vg.vagas > 0 ? ' · ' + vg.vagas + (vg.vagas > 1 ? ' vagas livres' : ' vaga livre') : ' · sem vaga agora') + '</div>'
      + '<input id="saQ" class="campo" type="search" placeholder="Buscar por código, bairro, prédio, tipo…" value="' + esc(S.q) + '" style="width:100%;margin-bottom:10px">'
      + '<p class="s" style="margin:0 0 10px">' + L.length + ' de ' + S.itens.length + ' imóveis</p>'
      + '<div class="ordenar" aria-label="Ordenar por"><span>Ordenar por:</span>' + ordBtn.map(function (c) { return '<button type="button" data-saord="' + c[0] + '" aria-pressed="' + (S.ordem.k === c[0]) + '">' + c[1] + (S.ordem.k === c[0] ? (S.ordem.d > 0 ? ' ▲' : ' ▼') : '') + '</button>'; }).join('') + '</div>'
      + (L.length ? '<table class="ac ac-disp"><thead><tr>' + cols.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + '</tr></thead><tbody>' + L.map(linha).join('') + '</tbody></table>'
        : '<div class="vazio">Nenhum imóvel nesta busca.</div>') + '</section>';
    var qi = raiz.querySelector('#saQ');
    if (qi) qi.oninput = function () { S.q = qi.value; var p = qi.selectionStart; desenhar(); var n = raiz.querySelector('#saQ'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (e) { } } };
    raiz.querySelectorAll('[data-saord]').forEach(function (b) { b.onclick = function () { var k = b.dataset.saord; S.ordem = { k: k, d: S.ordem.k === k ? -S.ordem.d : 1 }; desenhar(); }; });
    raiz.querySelectorAll('[data-sa]').forEach(function (b) {
      b.onclick = async function () {
        var a = b.dataset.sa, ref = b.dataset.ref;
        if (a === 'confirmar') { S.confirmar = ref; desenhar(); return; }
        if (a === 'cancelar') { S.confirmar = null; desenhar(); return; }
        if (a === 'travar' && !S.ocupado) {
          S.ocupado = true; b.disabled = true;
          var r = await C.sb.rpc('app_sa_travar', { p_ref: ref });
          S.ocupado = false; S.confirmar = null;
          if (r.error) C.toast('Não foi possível travar agora: ' + r.error.message);
          else if (r.data && r.data.ok) C.toast(r.data.ja_era_sua ? 'Este imóvel já está com você.' : ref + ' está com você por 3 dias. ' + (r.data.contato ? 'O contato está em A CAPTAR › Minhas captações.' : 'Sem contato na base: peça o Captei pela Vivian.'));
          else C.toast(MOT[r.data && r.data.motivo] || 'A trava não saiu.');
          await carregar(); desenhar();
        }
      };
    });
  }

  window.SEMRESP = {
    tela: async function (main, ctx) {
      C = ctx; C.titulo('Imóveis sem responsável');
      main.innerHTML = '<div id="saRaiz"><div class="vazio">Carregando os imóveis sem responsável…</div></div>';
      raiz = main.querySelector('#saRaiz');
      await carregar(); desenhar();
    },
    sair: function () { S = S0(); raiz = null; }
  };
})();
