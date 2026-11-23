// modulos/registros.js — 📄 Registros (logs) do HUB VIVERE e dos painéis dos corretores. Entrega 2, 22/11/2026.
// Lê a coleção virtual '_registros' pelo conector Vivere Conversas (hub_ler → public.hub_mestre_ler → privado.registros_pagina).
// Só o nível mestre: a aba só aparece se a leitura do resumo der certo (no HUB da web a leitura é barrada e a aba não nasce).
// Nada se grava aqui. Mostra quando, quem (pessoa, agente, espelho, externo ou rotina), canal, onde, operação e antes → depois.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, ID = 'registros', SERV = 'Vivere Conversas', VERSAO = '2026-11-23.2';
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  const TIPOS = [['pessoa', 'Pessoas'], ['agente', 'Agentes (Vivian, Claude)'], ['externo', 'Externos (site, inquilino)'], ['espelho', 'Espelhos e sincronias'], ['rotina', 'Rotinas automáticas']];
  const PERIODOS = [['1', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['180', '180 dias']];
  const OPS = { incluiu: 'incluiu', alterou: 'alterou', removeu: 'removeu', restaurou: 'restaurou', apagou: 'apagou' };
  const F = {
    dias: ls('hubv.reg.dias') || '7', tipos: (ls('hubv.reg.tipos') || 'pessoa,agente,externo').split(',').filter(Boolean),
    sistema: '', painel: '', operacao: '', busca: '', pp: +(ls('hubv.reg.pp') || 50) === 100 ? 100 : 50,
    cursores: [null], pg: 0, itens: null, proximo: null, carregando: false, erro: '', resumo: null, aberto: {},
    volta: {},   // 23/11/2026: id do registro → 'confirmar' | 'fazendo' | 'ok:…' | 'erro:…'
  };
  let pMcp = null;
  const mcp = () => (pMcp = pMcp || (window.claude && window.claude.use ? window.claude.use('mcp') : Promise.resolve(null)));
  async function ler(docId, apos, limite) {
    const m = await mcp(); if (!m) throw new Error('conector Vivere Conversas indisponível');
    const inp = { colecao: '_registros', doc_id: docId }; if (apos) inp.apos = apos; if (limite) inp.limite = limite;
    const r = await m.callTool(SERV, 'hub_ler', inp, { cache: false });
    let p = r && (r.payload !== undefined ? r.payload : r.structuredContent); if (typeof p === 'string') p = JSON.parse(p);
    if (!p || !Array.isArray(p.itens)) throw new Error((p && (p.erro || p.message)) || 'resposta sem itens');
    return p;
  }
  function filtros() {
    const o = { de: new Date(Date.now() - (+F.dias) * 864e5).toISOString(), tipos: F.tipos };
    if (F.dias === '1') { const d = new Date(); d.setHours(0, 0, 0, 0); o.de = d.toISOString(); }
    if (F.sistema) o.sistema = F.sistema; if (F.painel) o.painel = F.painel; if (F.operacao) o.operacao = F.operacao;
    if (F.busca.trim()) o.busca = F.busca.trim();
    return JSON.stringify(o);
  }
  async function carrega() {
    if (F.carregando) return; F.carregando = true; F.erro = ''; H.pede();
    try {
      const p = await ler(filtros(), F.cursores[F.pg], F.pp);
      F.itens = p.itens.map((x) => x.dados || {}); F.proximo = p.proximo || null;
    } catch (e) { F.erro = (e && e.message) || String(e); F.itens = []; }
    F.carregando = false; H.pede();
  }
  function recomeca() { F.cursores = [null]; F.pg = 0; F.aberto = {}; carrega(); }

  // ---------- voltar ao antes (23/11/2026, fatia 3 do HUB canal central) ----------
  // Só documentos do HUB (privado.hub_docs). A volta é uma gravação nova pelo hub_gravar (fica registrada como as outras)
  // e só acontece se o documento ainda está na versão daquele registro (if_versao): mudou depois = desfazer a mais nova antes.
  //   alterou   → documento atual com os campos do registro trocados pelo "antes" (campo que não existia sai)
  //   removeu   → o mesmo conteúdo de volta, sem a marca de removido
  //   incluiu / restaurou → marca de removido (nada se apaga)
  const PODE_VOLTAR = { alterou: 1, removeu: 1, incluiu: 1, restaurou: 1 };
  const podeVoltar = (x) => x.sistema === 'hub' && PODE_VOLTAR[x.operacao] && x.versao && x.colecao && x.doc_id && x.colecao[0] !== '_';
  async function chama(nome, inp) {
    const m = await mcp(); if (!m) throw new Error('conector Vivere Conversas indisponível');
    const r = await m.callTool(SERV, nome, inp, { cache: false });
    let p = r && (r.payload !== undefined ? r.payload : r.structuredContent); if (typeof p === 'string') p = JSON.parse(p);
    return p || {};
  }
  async function voltar(x) {
    const atual = await chama('hub_ler', { colecao: x.colecao, doc_id: x.doc_id, incluir_removidos: true });
    const d = (atual.itens || [])[0];
    if (!d) throw new Error('o documento não existe mais');
    if (+d.versao !== +x.versao) throw new Error(`o documento mudou depois deste registro (está na versão ${d.versao}, o registro é da ${x.versao}): volte primeiro a mudança mais nova`);
    let op;
    if (x.operacao === 'alterou') {
      const novo = Object.assign({}, d.dados || {}), antes = x.antes || {};
      (x.campos || []).forEach((c) => { if (Object.prototype.hasOwnProperty.call(antes, c)) novo[c] = antes[c]; else delete novo[c]; });
      op = { acao: 'set', colecao: x.colecao, doc_id: x.doc_id, dados: novo, if_versao: +x.versao };
    } else if (x.operacao === 'removeu') {
      op = { acao: 'set', colecao: x.colecao, doc_id: x.doc_id, dados: d.dados || {}, if_versao: +x.versao };
    } else {
      op = { acao: 'remover', colecao: x.colecao, doc_id: x.doc_id, if_versao: +x.versao };
    }
    const r = await chama('hub_gravar', { operacoes: [op] });
    const res = (r.resultados || [])[0] || {};
    if (!/gravado|criado|removido/.test(String(res.resultado || ''))) throw new Error(res.resultado === 'conflito' ? 'o documento mudou agora há pouco: atualize a lista e tente de novo' : String(res.resultado || res.erro || r.erro || 'o banco recusou'));
    return res;
  }

  // ---------- desenho ----------
  const quando = (s) => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
  const val = (v) => { if (v === undefined) return '<span class="s">(não tinha)</span>'; if (v === null) return '<span class="s">vazio</span>';
    let t = typeof v === 'string' ? v : JSON.stringify(v); if (t.length > 300) t = t.slice(0, 300) + '…'; return esc(t); };
  const UM = { pessoa: 'Pessoa', agente: 'Agente', externo: 'Externo', espelho: 'Espelho', rotina: 'Rotina' };
  const pillTipo = (t) => `<span class="pill${t === 'pessoa' || t === 'agente' ? ' warn' : ''}">${esc(UM[t] || t || '')}</span>`;
  function resumoHTML() {
    const R = F.resumo; if (!R) return '';
    const tot = {}; (R.dias || []).forEach((x) => { tot[x.tipo] = (tot[x.tipo] || 0) + (+x.n || 0); });
    const cards = TIPOS.map(([k, t]) => `<div class="card" style="margin:0;flex:1 1 140px"><div class="s">${esc(t)}</div><b style="font-size:1.2em">${(tot[k] || 0).toLocaleString('pt-BR')}</b></div>`).join('');
    return `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0">${cards}</div>
      <p class="nota">Últimos 7 dias. Registro desde ${esc(R.primeiro ? new Date(R.primeiro).toLocaleDateString('pt-BR') : '—')}; guarda 180 dias. Só o nível mestre vê esta aba.</p>`;
  }
  function filtrosHTML() {
    const R = F.resumo || {};
    const sel = (id, ops, v) => `<select id="${id}" class="btn">${ops.map(([k, t]) => `<option value="${esc(k)}"${k === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    const chips = TIPOS.map(([k, t]) => `<label class="btn" style="display:inline-flex;gap:4px;align-items:center${F.tipos.includes(k) ? ';border-color:var(--accent);font-weight:600' : ''}"><input type="checkbox" data-reg-tipo="${k}"${F.tipos.includes(k) ? ' checked' : ''}> ${esc(t)}</label>`).join(' ');
    return `<div class="filtros" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0">
      ${sel('reg-dias', PERIODOS, F.dias)}
      ${sel('reg-sistema', [['', 'HUB, painéis e app'], ['hub', 'Só HUB'], ['painel', 'Só painéis'], ['app', 'Só tabelas do app']], F.sistema)}
      ${sel('reg-painel', [['', 'Todos os painéis']].concat((R.paineis || []).map((p) => [p, p])), F.painel)}
      ${sel('reg-op', [['', 'Toda operação']].concat(Object.keys(OPS).map((k) => [k, OPS[k]])), F.operacao)}
      <input id="reg-q" class="btn" style="min-width:160px;flex:1" placeholder="Buscar documento, pessoa, coleção ou canal" value="${esc(F.busca)}">
      <button class="btn" data-reg-buscar>Buscar</button>
    </div><div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">${chips}</div>`;
  }
  function itemHTML(x) {
    const onde = x.sistema === 'painel' ? `Painel ${esc(x.painel || '?')} · ${esc(x.colecao)}` : x.sistema === 'app' ? `App · ${esc(x.colecao)}${x.painel ? ' · painel ' + esc(x.painel) : ''}` : `HUB · ${esc(x.colecao)}`;
    const campos = (x.campos || []);
    const ab = !!F.aberto[x.id];
    const det = ab ? `<div class="tabela" style="margin-top:6px"><table><thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead><tbody>${
      campos.map((c) => `<tr><td><b>${esc(c)}</b></td><td>${val((x.antes || {})[c])}</td><td>${val((x.depois || {})[c])}</td></tr>`).join('') ||
      '<tr><td colspan="3" class="s">Sem campo alterado (só remoção ou restauração).</td></tr>'}</tbody></table></div>` : '';
    return `<div class="card" style="margin:6px 0">
      <div style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline">
        <b>${esc(quando(x.em))}</b> ${pillTipo(x.tipo)} <span>${esc(x.quem || x.canal || '')}</span>
        <span class="pill">${esc(OPS[x.operacao] || x.operacao)}</span>
      </div>
      <div class="s" style="margin-top:2px;word-break:break-word">${onde} · <b>${esc(x.doc_id)}</b>${x.canal && x.canal !== x.quem ? ' · canal ' + esc(x.canal) : ''}</div>
      ${campos.length ? `<button class="btn" data-reg-abre="${x.id}" style="margin-top:6px">${ab ? 'Fechar' : 'Ver antes → depois'} (${campos.length} campo${campos.length > 1 ? 's' : ''})</button>` : ''}${voltaHTML(x)}${det}</div>`;
  }
  function voltaHTML(x) {
    if (!podeVoltar(x)) return '';
    const v = F.volta[x.id] || '';
    const efeito = x.operacao === 'alterou' ? 'Os campos voltam ao que eram antes' : x.operacao === 'removeu' ? 'O documento volta a aparecer' : 'O documento fica marcado como removido (nada se apaga)';
    if (v === 'confirmar') return `<div class="nota" style="margin-top:6px;border-left:3px solid var(--warn);padding:8px">Voltar <b>${esc(x.doc_id)}</b> ao que era antes desta mudança? ${esc(efeito)}. A volta também fica registrada.
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn" data-reg-volta-ok="${x.id}" style="border-color:var(--warn);font-weight:600">Sim, voltar</button><button class="btn" data-reg-volta-nao="${x.id}">Cancelar</button></div></div>`;
    if (v === 'fazendo') return '<p class="nota" style="margin-top:6px">Voltando…</p>';
    if (v.startsWith('ok:')) return `<p class="nota" style="margin-top:6px;color:var(--ok)">✅ ${esc(v.slice(3))}</p>`;
    const err = v.startsWith('erro:') ? `<p class="nota" style="margin-top:6px;color:var(--bad)">❌ ${esc(v.slice(5))}</p>` : '';
    return `${err}<button class="btn" data-reg-volta="${x.id}" style="margin-top:6px;margin-left:6px">↩ Voltar ao antes</button>`;
  }
  function render() {
    if (F.itens === null && !F.carregando) setTimeout(carrega, 0);
    const lista = F.carregando ? '<p class="nota">Carregando…</p>' : F.erro ? `<p class="nota">Não consegui ler os registros: ${esc(F.erro)}</p>`
      : !(F.itens || []).length ? '<p class="nota">Nenhum registro com esses filtros.</p>' : F.itens.map(itemHTML).join('');
    const pag = `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0">
      <button class="btn" data-reg-pag="-1"${F.pg === 0 ? ' disabled' : ''}>← Mais novos</button>
      <span class="s">Página ${F.pg + 1}</span>
      <button class="btn" data-reg-pag="1"${F.proximo ? '' : ' disabled'}>Mais antigos →</button>
      <span class="s" style="margin-left:auto">Por página</span>
      <select id="reg-pp" class="btn"><option value="50"${F.pp === 50 ? ' selected' : ''}>50</option><option value="100"${F.pp === 100 ? ' selected' : ''}>100</option></select>
      <button class="btn" data-reg-recarregar>Atualizar</button></div>`;
    return `<h2>📄 Registros</h2><p class="nota">Toda inclusão, alteração, remoção e exclusão no HUB, nos painéis dos corretores e nas tabelas do app: quem fez, por qual canal e o que mudou.</p>
      ${resumoHTML()}${filtrosHTML()}${pag}<div id="reg-lista">${lista}</div>${F.itens && F.itens.length ? pag : ''}`;
  }

  // ---------- eventos ----------
  document.addEventListener('click', (e) => {
    const tv = e.target.closest && e.target.closest('[data-reg-volta],[data-reg-volta-ok],[data-reg-volta-nao]');
    if (tv) {
      const id = tv.dataset.regVolta || tv.dataset.regVoltaOk || tv.dataset.regVoltaNao;
      if (tv.hasAttribute('data-reg-volta')) { F.volta[id] = 'confirmar'; H.pede(); return; }
      if (tv.hasAttribute('data-reg-volta-nao')) { delete F.volta[id]; H.pede(); return; }
      const x = (F.itens || []).find((i) => String(i.id) === String(id)); if (!x) return;
      F.volta[id] = 'fazendo'; H.pede();
      voltar(x).then((r) => { F.volta[id] = 'ok:Voltou (versão ' + (r.versao || '?') + '). Recarregue a lista para ver o registro da volta.'; H.pede(); })
        .catch((er) => { F.volta[id] = 'erro:' + ((er && er.message) || er); H.pede(); });
      return;
    }
    const t = e.target.closest && e.target.closest('[data-reg-abre],[data-reg-pag],[data-reg-buscar],[data-reg-recarregar]'); if (!t) return;
    if (t.dataset.regAbre) { const k = t.dataset.regAbre; F.aberto[k] = !F.aberto[k]; H.pede(); return; }
    if (t.dataset.regPag) { const d = +t.dataset.regPag;
      if (d > 0 && F.proximo) { F.cursores[F.pg + 1] = F.proximo; F.pg++; carrega(); }
      else if (d < 0 && F.pg > 0) { F.pg--; carrega(); } return; }
    if (t.hasAttribute('data-reg-buscar')) { const i = document.getElementById('reg-q'); F.busca = i ? i.value : ''; recomeca(); return; }
    if (t.hasAttribute('data-reg-recarregar')) { recomeca(); ler('__resumo__').then((p) => { F.resumo = (p.itens[0] || {}).dados || null; H.pede(); }).catch(() => {}); }
  });
  document.addEventListener('change', (e) => {
    const t = e.target; if (!t) return;
    if (t.dataset && t.dataset.regTipo) { const k = t.dataset.regTipo; F.tipos = t.checked ? F.tipos.concat(k) : F.tipos.filter((x) => x !== k); ls('hubv.reg.tipos', F.tipos.join(',')); recomeca(); return; }
    if (t.id === 'reg-dias') { F.dias = t.value; ls('hubv.reg.dias', F.dias); recomeca(); }
    else if (t.id === 'reg-sistema') { F.sistema = t.value; recomeca(); }
    else if (t.id === 'reg-painel') { F.painel = t.value; recomeca(); }
    else if (t.id === 'reg-op') { F.operacao = t.value; recomeca(); }
    else if (t.id === 'reg-pp') { F.pp = +t.value === 100 ? 100 : 50; ls('hubv.reg.pp', String(F.pp)); recomeca(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && e.target.id === 'reg-q') { F.busca = e.target.value; recomeca(); } });

  // Só registra a aba se a leitura do resumo der certo (nível mestre pelo conector do Cleiton).
  ler('__resumo__').then((p) => {
    F.resumo = (p.itens[0] || {}).dados || null;
    H.registrar({ id: ID, aba: '📄 Registros', grupo: 'gestao', colecoes: [], render, versao: VERSAO,
      busca() { return []; } });
  }).catch(() => { /* sem acesso: a aba não aparece */ });
})();
