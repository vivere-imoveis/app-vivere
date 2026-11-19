/* Imóveis sem responsável — aba do painel do corretor, aberta no app (19/11/2026, decisões do Cleiton).
   Imóveis ativos da Vivere sem agenciador ou de ex-corretor: já foram captados no passado e só precisam ser atualizados.
   "Atualizar este imóvel" trava na hora por 3 dias (limite de 5 ao mesmo tempo) e o Cleiton recebe o aviso; o contato do
   proprietário (quando há na base) abre em A CAPTAR › Minhas captações. O imóvel só passa a ser do corretor depois que ele
   o atualizar (Vivian ou CRM) e o Cleiton autorizar. Leitura e escrita só pelas funções app_sa_listar e app_sa_travar. */
(function () {
  'use strict';
  var C = null, raiz = null;
  var S = { itens: [], vagas: null, q: '', confirmar: null, ocupado: false, carregado: false };
  var MOT = { em_captacao: 'Outro corretor já está atualizando este imóvel.', limite_5: 'Você já tem 5 imóveis em atualização ao mesmo tempo. A vaga volta quando um deles for atualizado e autorizado, ou quando a trava de 3 dias vencer.',
    imovel_indisponivel: 'Este imóvel não está mais disponível.', ja_tem_agenciador: 'Este imóvel já tem agenciador.', sem_app: 'Seu acesso ao app não está ativo.' };
  var SIT = { livre: ['Livre', ''], em_captacao_por_voce: ['Com você', 'ok'], em_captacao: ['Com outro corretor', 'mut'], pedido_seu_pendente: ['Na sua fila', 'aviso'], pedido_de_outro_pendente: ['Pedido de outro corretor', 'mut'] };
  function esc(v) { return C.esc(v); }
  var brl = function (v) { var n = Number(String(v || '').replace(/[^0-9.]/g, '')); return n > 0 ? 'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : ''; };
  var dataBR = function (s) { var d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };

  async function carregar() {
    var r = await C.sb.rpc('app_sa_listar');
    if (r.error) { S.erro = r.error.message; return; }
    S.erro = null; S.itens = (r.data && r.data.itens) || []; S.vagas = (r.data && r.data.vagas) || null; S.carregado = true;
  }

  function cartao(v) {
    var sit = SIT[v.situacao] || [v.situacao, ''];
    var med = [v.dorm ? v.dorm + ' dorm' : '', v.area ? Number(String(v.area).replace(/[^0-9.]/g, '')) + ' m²' : ''].filter(Boolean).join(' · ');
    var origem = v.motivo === 'ex_corretor' ? 'De ex-corretor' + (v.agenciador_antigo ? ' (' + esc(v.agenciador_antigo) + ')' : '') : 'Sem agenciador';
    var botao = '';
    if (v.situacao === 'livre' || v.situacao === 'pedido_seu_pendente') botao = '<button class="btn pri" data-sa="confirmar" data-ref="' + esc(v.ref) + '">Atualizar este imóvel</button>';
    else if (v.situacao === 'em_captacao_por_voce') botao = '<a class="btn" href="index.html?aba=acaptar">Ver contato em Minhas captações</a>';
    var conf = S.confirmar === v.ref ? '<div class="msg aviso" style="margin-top:8px">O <b>' + esc(v.ref) + '</b> fica com você por <b>3 dias</b> (cada contato registrado renova). '
      + (v.contato_na_base ? 'O contato do proprietário abre em A CAPTAR › Minhas captações.' : 'A base não tem o contato do proprietário: peça o Captei pela Vivian.')
      + ' Quando você atualizar o imóvel (valor, fotos, dados ou a conversa com o proprietário) pela Vivian ou no CRM, a diretoria autoriza e ele passa a ser seu.'
      + '<div class="linha-acoes" style="margin-top:8px"><button class="btn pri" data-sa="travar" data-ref="' + esc(v.ref) + '">Confirmar</button><button class="btn" data-sa="cancelar">Cancelar</button></div></div>' : '';
    return '<div class="cartao" style="margin-bottom:10px"><div class="linha" style="justify-content:space-between;gap:8px;flex-wrap:wrap">'
      + '<div><b>' + esc(v.ref) + '</b> · ' + esc(v.tipo || 'Imóvel') + (v.fin ? ' · ' + esc(v.fin) : '') + '<div class="s">' + [esc(v.bairro || ''), v.edificio ? esc(v.edificio) : '', brl(v.valor), med].filter(Boolean).join(' · ') + '</div>'
      + '<div class="s">' + origem + ' · ' + (v.contato_na_base ? 'contato na base' : 'sem contato na base') + (v.trava_ate ? ' · com você até ' + dataBR(v.trava_ate) : '') + '</div></div>'
      + '<span class="pill ' + sit[1] + '">' + esc(sit[0]) + '</span></div>'
      + '<div class="linha-acoes" style="margin-top:8px">' + botao + (v.link ? '<a class="btn" href="' + esc(v.link) + '" target="_blank" rel="noopener">Anúncio</a>' : '') + '</div>' + conf + '</div>';
  }

  function desenhar() {
    if (!raiz) return;
    if (S.erro) { raiz.innerHTML = '<div class="msg erro">Não foi possível abrir a lista agora: ' + esc(S.erro) + '</div>'; return; }
    var q = norm(S.q);
    var L = S.itens.filter(function (v) { return !q || norm([v.ref, v.tipo, v.bairro, v.edificio, v.fin].join(' ')).indexOf(q) >= 0; });
    var ordem = { em_captacao_por_voce: 0, livre: 1, pedido_seu_pendente: 2, em_captacao: 3, pedido_de_outro_pendente: 4 };
    L.sort(function (a, b) { return (ordem[a.situacao] ?? 9) - (ordem[b.situacao] ?? 9) || String(a.ref).localeCompare(String(b.ref)); });
    var vg = S.vagas || {};
    raiz.innerHTML = '<section class="sec" style="margin-top:0"><h2 class="tit-sec">Imóveis sem responsável</h2>'
      + '<p class="s">Imóveis da Vivere que já foram captados, mas estão sem agenciador ou eram de corretor que saiu. Atualize até <b>5 ao mesmo tempo</b>: cada um fica com você por 3 dias e a diretoria é avisada.</p>'
      + '<div class="msg ' + (vg.vagas > 0 ? 'ok' : 'aviso') + '" style="margin:8px 0">Com você agora: <b>' + (vg.ativas || 0) + ' de ' + (vg.limite || 5) + '</b>' + (vg.fila ? ' · ' + vg.fila + ' na sua fila' : '') + (vg.vagas > 0 ? ' · ' + vg.vagas + ' vaga' + (vg.vagas > 1 ? 's' : '') + ' livre' + (vg.vagas > 1 ? 's' : '') : ' · sem vaga agora') + '</div>'
      + '<input id="saQ" class="campo" type="search" placeholder="Buscar por código, bairro, prédio…" value="' + esc(S.q) + '" style="width:100%;margin-bottom:10px">'
      + '<p class="s">' + L.length + ' imóve' + (L.length === 1 ? 'l' : 'is') + '</p>'
      + (L.map(cartao).join('') || '<div class="vazio">Nenhum imóvel nesta busca.</div>') + '</section>';
    var qi = raiz.querySelector('#saQ');
    if (qi) qi.oninput = function () { S.q = qi.value; var p = qi.selectionStart; desenhar(); var n = raiz.querySelector('#saQ'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (e) { } } };
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
    sair: function () { S = { itens: [], vagas: null, q: '', confirmar: null, ocupado: false, carregado: false }; raiz = null; }
  };
})();
