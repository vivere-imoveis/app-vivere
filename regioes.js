/* Regiões, bairros e sub-regiões da Vivere (sugestão 171, fatia 2 — 26/11/2026).
   Lê a lista public.regioes do banco uma vez (cerca de 5 KB; guardada no aparelho para a próxima abertura) e expõe
   window.VIVERE_REGIOES para o painel e o HUB:
     sub(termo)            → nomes e apelidos de tudo o que fica dentro do termo (Lagoa da Conceição → Canto da Lagoa, Porto da Lagoa…)
     bate(pedidos, bairro) → o bairro do imóvel está dentro de algum dos bairros ou regiões pedidos (mesma regra do banco: nome igual ou prefixo)
     maes(presentes)       → regiões e bairros-mãe que abrangem algum dos bairros presentes, para oferecer nos filtros
   Sem a lista (banco fora do ar), tudo segue como antes: bate() responde só pelo nome. Ao chegar, avisa com o evento 'vivere-regioes'. */
(function () {
  'use strict';
  var LOJA = 'vivere.regioes.v1';
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); };
  var R = { pronto: false, nos: [], versao: 'regioes 2026-11-26.1' };
  var porNome = {}, filhos = {}, alcance = {}, alcanceN = {}, memo = new Map(), memoN = new Map();

  function montar(lista) {
    porNome = {}; filhos = {}; alcance = {}; alcanceN = {}; memo = new Map(); memoN = new Map();
    var nos = (lista || []).filter(function (n) { return n && n.id && n.nome && n.ativo !== false; });
    nos.forEach(function (n) { if (n.pai) (filhos[n.pai] = filhos[n.pai] || []).push(n.id); });
    var porId = {}; nos.forEach(function (n) { porId[n.id] = n; });
    var termos = function (n) { return [n.nome].concat(n.apelidos || []).filter(Boolean); };
    var desce = function (id, visto) { // nomes e apelidos do nó e de tudo abaixo dele (o banco barra ciclo; aqui também)
      if (visto[id]) return []; visto[id] = 1; var n = porId[id]; if (!n) return [];
      var out = termos(n); (filhos[id] || []).forEach(function (f) { out = out.concat(desce(f, visto)); }); return out;
    };
    nos.forEach(function (n) {
      var alvo = desce(n.id, {});
      termos(n).forEach(function (t) { var k = norm(t); if (!k) return; porNome[k] = n.id; alcance[k] = (alcance[k] || []).concat(alvo); });
    });
    Object.keys(alcance).forEach(function (k) { alcanceN[k] = alcance[k].map(norm).filter(Boolean); });
    R.nos = nos; R.porId = porId; R.pronto = nos.length > 0;
  }
  var prefixo = function (x, y) { return !!x && !!y && (x === y || y.indexOf(x) === 0 || x.indexOf(y) === 0); };

  R.norm = norm;
  R.sub = function (termo) { return (alcance[norm(termo)] || []).slice(); };
  R.expandir = function (lista) {
    var out = [], visto = {};
    (lista || []).forEach(function (t) { [t].concat(R.sub(t)).forEach(function (x) { var k = norm(x); if (k && !visto[k]) { visto[k] = 1; out.push(x); } }); });
    return out;
  };
  var n1 = function (s) { var k = String(s || ''), v = memoN.get(k); if (v === undefined) { v = norm(k); if (memoN.size > 5000) memoN.clear(); memoN.set(k, v); } return v; };
  var bate1 = function (p, y) { // o motor das Oportunidades chama isto para cada lead × imóvel: resposta guardada por par
    var k = p + '\u0001' + y, v = memo.get(k); if (v !== undefined) return v;
    v = prefixo(p, y) || (alcanceN[p] || []).some(function (s) { return prefixo(s, y); });
    if (memo.size > 20000) memo.clear(); memo.set(k, v); return v;
  };
  R.bate = function (pedidos, bairro) {
    var y = n1(bairro); if (!y) return false;
    return (pedidos || []).some(function (p) { return bate1(n1(p), y); });
  };
  R.maes = function (presentes) { // [{nome, nivel}] das regiões e bairros-mãe que abrangem algum presente e ainda não estão na lista
    var tem = {}; (presentes || []).forEach(function (b) { tem[norm(b)] = 1; });
    return R.nos.filter(function (n) { return (filhos[n.id] || []).length && !tem[norm(n.nome)]; })
      .filter(function (n) { return (presentes || []).some(function (b) { return R.bate([n.nome], b); }); })
      .sort(function (a, b) { return (a.nivel === 'regiao' ? 0 : 1) - (b.nivel === 'regiao' ? 0 : 1) || (a.ordem || 0) - (b.ordem || 0) || a.nome.localeCompare(b.nome, 'pt-BR'); })
      .map(function (n) { return { nome: n.nome, nivel: n.nivel }; });
  };
  R.temSub = function (nome) { var id = porNome[norm(nome)]; return !!(id && (filhos[id] || []).length); };
  // opções de um filtro de bairros: regiões e bairros-mãe primeiro, depois os bairros presentes ([valor, rótulo])
  R.opcoes = function (lista) {
    lista = lista || []; if (!R.pronto) return lista.map(function (b) { return [b, b]; });
    var rot = function (b) { return R.temSub(b) ? b + ' (com sub-regiões)' : b; };
    return R.maes(lista).map(function (n) { return [n.nome, n.nivel === 'regiao' ? 'Região: ' + n.nome : rot(n.nome)]; })
      .concat(lista.map(function (b) { return [b, rot(b)]; }));
  };
  // filtro: o bairro passa se foi escolhido ou se está dentro de uma região ou bairro-mãe escolhido
  R.noFiltro = function (sel, bairro) {
    sel = sel || []; if (sel.indexOf(bairro) >= 0) return true; if (!R.pronto) return false;
    return R.bate(sel.filter(function (s) { return R.temSub(s); }), bairro);
  };

  function avisar() { try { window.dispatchEvent(new CustomEvent('vivere-regioes')); } catch (e) { } }
  try { var guardada = JSON.parse(localStorage.getItem(LOJA) || 'null'); if (guardada && guardada.lista) montar(guardada.lista); } catch (e) { }

  var tentativas = 0;
  function carregar() {
    var p = window.VIVERE_PONTE && window.VIVERE_PONTE.contextoApp && window.VIVERE_PONTE.contextoApp();
    var sb = p && p.sb;
    if (!sb) { if (++tentativas < 40) setTimeout(carregar, 250); return; } // a ponte ainda não ficou pronta
    var limite = new Promise(function (ok) { setTimeout(function () { ok({ error: 'tempo' }); }, 8000); });
    Promise.race([sb.from('regioes').select('id,nome,pai,nivel,apelidos,ordem,ativo').eq('ativo', true).limit(2000), limite]).then(function (r) {
      if (!r || r.error || !Array.isArray(r.data) || !r.data.length) return;
      var antes = JSON.stringify(R.nos.map(function (n) { return [n.id, n.nome, n.pai, n.apelidos]; }));
      montar(r.data);
      try { localStorage.setItem(LOJA, JSON.stringify({ em: Date.now(), lista: r.data })); } catch (e) { }
      if (JSON.stringify(R.nos.map(function (n) { return [n.id, n.nome, n.pai, n.apelidos]; })) !== antes) avisar();
    }, function () { });
  }
  window.VIVERE_REGIOES = R;
  if (R.pronto) setTimeout(avisar, 0);
  setTimeout(carregar, 0);
})();
