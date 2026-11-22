// modulos/parceiros.js — aba "Parceiros" da Gestão no HUB Vivere (construção "parceiros", 1ª fatia em 16/11/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Pedido do Cleiton (16/11/2026): relação de parceiros da Vivere, começando pelos
// fornecedores de mantimentos (Fort Atacadista e afins) com entrega nas lojas de Jurerê e do Porto da Lagoa, com
// monitoramento do retorno de cada parceiro (já houve pedido de cadastro ao Fort sem resposta) e o controle dos mantimentos.
// Organização decidida por ele: HUB = base integral e motor > Vivian > CRM dos corretores/diretores e A CAPTAR > site.
// • Coleções do módulo (base única no Supabase; nível diretoria, salvo parceiros_valores = mestre):
//   parceiros_cadastro (parceiros e contatos), parceiros_itens (lista padrão por loja), parceiros_faltas (o que acabou),
//   parceiros_pedidos (pedidos aos fornecedores), parceiros_valores (valor de cada pedido, só o mestre).
// • Documentos com id começando por "_" são de controle (marcam o nível da coleção) e não aparecem na tela.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc;
  const ID = 'parceiros';
  const C = { cad: 'parceiros_cadastro', itens: 'parceiros_itens', faltas: 'parceiros_faltas', ped: 'parceiros_pedidos', val: 'parceiros_valores' };
  const LOJAS = { 'jurere': 'Jurerê', 'porto-lagoa': 'Porto da Lagoa' };
  const LOJA_END = { 'jurere': 'Rua dos Chernes, 90, Loja 01 · Jurerê Internacional · CEP 88053-545', 'porto-lagoa': 'R. Ernesto Meyer Filho, 37, Loja 3C · Lagoa da Conceição (Porto da Lagoa)' };
  const TIPOS = { fornecedor: 'Fornecedor de mantimentos', seguradora: 'Seguradora e garantias', imobiliaria: 'Imobiliária ou corretor parceiro', construtora: 'Construtora', prestador: 'Prestador de serviço', outro: 'Outro' };
  const SIT = { aguardando: ['Aguardando retorno', 'warn'], conversa: ['Em conversa', 'info'], ativo: ['Cadastrado · ativo', 'ok'], pausado: ['Pausado', ''], descartado: ['Descartado', 'bad'] };
  const FALTA = { aberta: ['Em falta', 'bad'], pedido: ['No pedido', 'warn'], resolvida: ['Reposta', 'ok'] };
  const PED = { rascunho: ['Rascunho', ''], enviado: ['Enviado', 'warn'], entregue: ['Entregue', 'ok'], cancelado: ['Cancelado', 'bad'] };
  const QUEM = ['Cleiton', 'Deivis', 'Luciano', 'Nícollas', 'William'];
  const F = { sec: 'parceiros', loja: '', tipo: '', aberto: '', form: '' };

  const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const slug = (s) => sem(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';
  const agora = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const dtHora = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] + 'h' + m[5] : ''}` : '—'; };
  const dig = (t) => String(t || '').replace(/\D/g, '');
  const wa = (t) => { const d = dig(t); return d.length >= 10 ? 'https://wa.me/55' + d.slice(-11) : ''; };
  const pill = (M, s) => { const r = M[s] || [s || '—', '']; return `<span class="pill ${r[1]}">${esc(r[0])}</span>`; };
  const vivos = (c) => H.lista(c).filter((x) => !String(x._id).startsWith('_') && !x.removido_em);
  const lojasTxt = (L) => (L || []).map((l) => LOJAS[l] || l).join(' · ') || '—';
  const atrasado = (p) => p.situacao === 'aguardando' && p.prazo_retorno && String(p.prazo_retorno).slice(0, 10) < H.hojeISO();
  const diasDesde = (s) => { if (!s) return null; const d = new Date(String(s).slice(0, 10) + 'T12:00'); return Math.floor((Date.now() - d) / 864e5); };
  const grava = (path, dados, modo) => { const db = H.db(); if (!db) return Promise.reject(new Error('sem banco')); const r = db.doc(path); return Promise.resolve(modo === 'set' ? r.set(dados) : r.update(dados)); };
  const css = 'font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px';
  const op = (v, t, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
  const sel = (nome, M, v, vazio) => `<select name="${nome}" style="${css}">${vazio ? op('', vazio, !v) : ''}${Object.entries(M).map(([k, t]) => op(k, Array.isArray(t) ? t[0] : t, v === k)).join('')}</select>`;
  const inp = (nome, ph, v, tipo, w) => `<input name="${nome}" type="${tipo || 'text'}" placeholder="${esc(ph)}" value="${esc(v || '')}" style="${css};${w ? 'width:' + w : 'flex:1 1 160px'}">`;
  const form = (id, campos, rot) => `<form data-parc-form="${id}" class="card" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px">${campos}<button class="btn" type="submit">${esc(rot)}</button><button class="btn" type="button" data-parc-fecha>Cancelar</button></form>`;

  // ---------------- Parceiros
  const parceiros = () => vivos(C.cad).sort((a, b) => (atrasado(b) - atrasado(a)) || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt'));
  const textoP = (p) => sem([p.nome, TIPOS[p.tipo], p.canal, lojasTxt(p.lojas), (p.contatos || []).map((c) => [c.rotulo, c.whatsapp, c.telefone].join(' ')).join(' '), p.obs].join(' '));

  function fichaP(p) {
    const cont = (p.contatos || []).map((c) => `<div>${esc(c.rotulo || 'Contato')}: ${c.whatsapp ? `<a class="lk" href="${wa(c.whatsapp)}" target="_blank" rel="noopener">WhatsApp ${esc(c.whatsapp)}</a>` : ''}${c.telefone ? ` · fone ${esc(c.telefone)}` : ''}</div>`).join('') || '—';
    const hist = (p.historico || []).slice().reverse().map((h) => `<div style="padding:4px 0;border-bottom:1px solid var(--line)"><span class="s">${dtHora(h.em)} · ${esc(h.por || '')}</span><div>${esc(h.texto || '')}</div></div>`).join('') || '<span class="s">Sem registros.</span>';
    const lin = (r, v) => `<div style="display:grid;grid-template-columns:minmax(110px,150px) 1fr;gap:8px;padding:4px 0;border-bottom:1px solid var(--line)"><span class="s">${r}</span><span>${v}</span></div>`;
    return `<div class="card" style="margin:8px 0 14px">
      <h3 style="margin:0 0 8px">${esc(p.nome)}</h3>
      ${lin('Tipo', esc(TIPOS[p.tipo] || p.tipo || '—'))}${lin('Lojas atendidas', esc(lojasTxt(p.lojas)))}${lin('Canal', esc(p.canal || '—'))}
      ${lin('Contatos', cont)}${lin('Situação', pill(SIT, p.situacao) + (atrasado(p) ? ' <span class="pill bad">retorno atrasado</span>' : ''))}
      ${lin('Último contato', dtHora(p.ultimo_contato))}${lin('Prazo do retorno', p.prazo_retorno ? dtHora(p.prazo_retorno) : '—')}
      ${p.obs ? lin('Observações', esc(p.obs)) : ''}
      <h4 style="margin:12px 0 4px">Histórico</h4>${hist}
      <form data-parc-form="contato" data-id="${esc(p._id)}" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px">
        ${inp('texto', 'O que aconteceu (ex.: responderam; pediram o cartão CNPJ)', '', 'text')}
        ${sel('situacao', SIT, p.situacao)}<label class="s">Novo prazo ${inp('prazo', '', '', 'date', '150px')}</label>
        <select name="por" style="${css}">${QUEM.map((q) => op(q, q, q === 'Cleiton')).join('')}</select>
        <button class="btn" type="submit">Registrar contato</button></form></div>`;
  }

  function secParceiros() {
    const T = parceiros();
    const L = T.filter((p) => (!F.tipo || p.tipo === F.tipo) && (!F.loja || (p.lojas || []).includes(F.loja)));
    const ab = F.aberto && T.find((p) => p._id === F.aberto);
    const novo = F.form === 'parceiro' ? form('parceiro', inp('nome', 'Nome do parceiro (ex.: Fort Televendas Campeche)') + sel('tipo', TIPOS, 'fornecedor') +
      `<label class="s"><input type="checkbox" name="loja_jurere"> Jurerê</label><label class="s"><input type="checkbox" name="loja_porto"> Porto da Lagoa</label>` +
      inp('canal', 'Canal (Televendas, site, representante…)') + inp('rotulo', 'Contato (nome ou setor)') + inp('whatsapp', 'WhatsApp', '', 'tel', '150px') + inp('telefone', 'Telefone', '', 'tel', '150px') +
      inp('obs', 'Observações'), 'Salvar parceiro') : '';
    const tab = L.length ? `<div class="tabela"><table><thead><tr><th>Parceiro</th><th>Tipo</th><th>Lojas</th><th>Situação</th><th>Último contato</th><th>Prazo</th></tr></thead><tbody>${
      L.map((p) => { const d = diasDesde(p.ultimo_contato);
        return `<tr id="parc-${esc(p._id)}"><td><button class="lk" type="button" data-parc-abre="${esc(p._id)}" style="background:none;cursor:pointer;font:inherit">${esc(p.nome)} ${F.aberto === p._id ? '▴' : '▾'}</button></td>
        <td>${esc(TIPOS[p.tipo] || p.tipo || '—')}</td><td>${esc(lojasTxt(p.lojas))}</td>
        <td>${pill(SIT, p.situacao)}${atrasado(p) ? ' <span class="pill bad">atrasado</span>' : ''}</td>
        <td>${dtHora(p.ultimo_contato)}${d != null && d > 0 ? ` <span class="s">(${d} d)</span>` : ''}</td><td>${p.prazo_retorno ? dtHora(p.prazo_retorno) : '—'}</td></tr>`; }).join('')}</tbody></table></div>`
      : H.vazio(H.carregado[C.cad] ? 'Nenhum parceiro com esses filtros.' : 'Carregando…');
    return `<div class="filtros" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px">
        <select data-parc-tipo style="${css}">${op('', 'Todos os tipos', !F.tipo)}${Object.entries(TIPOS).map(([k, t]) => op(k, t, F.tipo === k)).join('')}</select>
        <select data-parc-loja style="${css}">${op('', 'As duas lojas', !F.loja)}${Object.entries(LOJAS).map(([k, t]) => op(k, t, F.loja === k)).join('')}</select>
        <button class="btn" type="button" data-parc-novo="parceiro">+ Novo parceiro</button></div>${novo}${ab ? fichaP(ab) : ''}${tab}`;
  }

  // ---------------- Mantimentos: lista padrão, faltas e pedidos
  const itens = () => vivos(C.itens).sort((a, b) => (a.loja || '').localeCompare(b.loja || '') || String(a.item || '').localeCompare(String(b.item || ''), 'pt'));
  const faltas = () => vivos(C.faltas).sort((a, b) => String(b.em || '').localeCompare(String(a.em || '')));
  const pedidos = () => vivos(C.ped).sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
  const lojaSel = (v) => sel('loja', LOJAS, v || F.loja || '', '');
  const filtroLoja = () => `<select data-parc-loja style="${css}">${op('', 'As duas lojas', !F.loja)}${Object.entries(LOJAS).map(([k, t]) => op(k, t, F.loja === k)).join('')}</select>`;

  function secItens() {
    const L = itens().filter((x) => !F.loja || x.loja === F.loja);
    const novo = F.form === 'item' ? form('item', lojaSel() + inp('item', 'Item (ex.: café em pó 500 g)') + inp('unidade', 'Unidade (pct, cx, fardo)', '', 'text', '150px') +
      inp('qtd', 'Qtd. padrão', '', 'number', '110px') + inp('minimo', 'Mínimo', '', 'number', '100px'), 'Salvar item') : '';
    const tab = L.length ? `<div class="tabela"><table><thead><tr><th>Loja</th><th>Item</th><th>Unidade</th><th>Qtd. padrão</th><th>Mínimo</th><th></th></tr></thead><tbody>${
      L.map((x) => `<tr><td>${esc(LOJAS[x.loja] || x.loja)}</td><td>${esc(x.item)}</td><td>${esc(x.unidade || '—')}</td><td>${esc(x.qtd ?? '—')}</td><td>${esc(x.minimo ?? '—')}</td>
        <td><button class="btn" type="button" data-parc-falta-item="${esc(x._id)}">Acabou</button></td></tr>`).join('')}</tbody></table></div>`
      : H.vazio(H.carregado[C.itens] ? 'A lista padrão ainda está vazia. Cadastre os itens que cada loja usa.' : 'Carregando…');
    return `<div class="filtros" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px">${filtroLoja()}<button class="btn" type="button" data-parc-novo="item">+ Item na lista</button></div>${novo}${tab}`;
  }

  function secFaltas() {
    const L = faltas().filter((x) => (!F.loja || x.loja === F.loja));
    const abertas = L.filter((x) => x.status !== 'resolvida'), feitas = L.filter((x) => x.status === 'resolvida').slice(0, 30);
    const novo = F.form === 'falta' ? form('falta', lojaSel() + inp('item', 'O que acabou') + inp('qtd', 'Qtd.', '', 'text', '110px') +
      `<select name="quem" style="${css}">${QUEM.map((q) => op(q, q, q === 'Cleiton')).join('')}</select>`, 'Registrar falta') : '';
    const linha = (x) => `<tr><td>${dtHora(x.em)}</td><td>${esc(LOJAS[x.loja] || x.loja)}</td><td>${esc(x.item)}${x.qtd ? ' · ' + esc(x.qtd) : ''}</td><td>${esc(x.quem || '—')}${x.origem === 'vivian' ? ' <span class="pill info">Vivian</span>' : ''}</td>
      <td>${pill(FALTA, x.status || 'aberta')}</td><td>${x.status !== 'resolvida' ? `<button class="btn" type="button" data-parc-repos="${esc(x._id)}">Reposto</button>` : ''}</td></tr>`;
    const tab = (A) => `<div class="tabela"><table><thead><tr><th>Quando</th><th>Loja</th><th>Item</th><th>Quem avisou</th><th>Situação</th><th></th></tr></thead><tbody>${A.map(linha).join('')}</tbody></table></div>`;
    return `<div class="filtros" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px">${filtroLoja()}<button class="btn" type="button" data-parc-novo="falta">+ Registrar falta</button>
      ${Object.keys(LOJAS).map((l) => `<button class="btn" type="button" data-parc-monta="${l}">Montar pedido · ${esc(LOJAS[l])}</button>`).join('')}</div>${novo}
      <h3 style="margin:8px 0">Em falta (${abertas.length})</h3>${abertas.length ? tab(abertas) : H.vazio('Nada em falta.')}
      ${feitas.length ? `<details class="card" style="margin-top:12px"><summary class="s" style="cursor:pointer">Repostas recentes (${feitas.length})</summary>${tab(feitas)}</details>` : ''}`;
  }

  const textoPedido = (x) => {
    return `Pedido Vivere Imóveis Selecionados — loja ${LOJAS[x.loja] || x.loja}\nEntrega: ${LOJA_END[x.loja] || ''}\n` +
      (x.itens || []).map((i) => `- ${i.qtd ? i.qtd + ' ' : ''}${i.unidade ? i.unidade + ' ' : ''}${i.item}`).join('\n') +
      `\nNota fiscal no CNPJ 63.295.886/0001-68.`;
  };

  function secPedidos() {
    const L = pedidos().filter((x) => !F.loja || x.loja === F.loja);
    const forn = parceiros().filter((p) => p.tipo === 'fornecedor');
    const V = H.S[C.val] || {};
    const card = (x) => {
      const p = forn.find((f) => f._id === x.parceiro), v = V[x._id] || {};
      return `<div class="card" id="parc-ped-${esc(x._id)}" style="margin:0 0 12px">
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between"><b>${esc(LOJAS[x.loja] || x.loja)} · ${dtHora(x.data)}</b>${pill(PED, x.status)}</div>
        <div class="s" style="margin:4px 0">Fornecedor: ${esc(p ? p.nome : 'a escolher')} · ${(x.itens || []).length} item(ns)${x.nota ? ' · NF ' + esc(x.nota) : ''}</div>
        <ul style="margin:6px 0 8px 18px">${(x.itens || []).map((i) => `<li>${esc([i.qtd, i.unidade, i.item].filter(Boolean).join(' '))}</li>`).join('')}</ul>
        <form data-parc-form="pedido" data-id="${esc(x._id)}" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <select name="parceiro" style="${css}">${op('', 'Fornecedor…', !x.parceiro)}${forn.map((f) => op(f._id, f.nome, f._id === x.parceiro)).join('')}</select>
          ${sel('status', PED, x.status)}${inp('nota', 'Nº da nota', x.nota, 'text', '130px')}${inp('valor', 'Valor R$ (só você)', v.valor ?? '', 'number', '150px')}
          <button class="btn" type="submit">Salvar</button><button class="btn" type="button" data-parc-copia="${esc(x._id)}">Copiar pedido</button></form></div>`;
    };
    return `<div class="filtros" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px">${filtroLoja()}</div>
      <p class="nota">"Montar pedido" (em Faltas) junta o que está em falta na loja. "Copiar pedido" leva o texto pronto para mandar ao Televendas.</p>
      ${L.length ? L.map(card).join('') : H.vazio(H.carregado[C.ped] ? 'Nenhum pedido ainda.' : 'Carregando…')}`;
  }

  function kpis() {
    const P = parceiros(), A = faltas().filter((x) => x.status !== 'resolvida');
    const k = (num, rot, alerta, sub) => `<div class="kpi${alerta ? ' alerta' : ''}" style="cursor:default"><div class="num">${num}</div><div class="rot">${rot}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
    const porLoja = Object.keys(LOJAS).map((l) => `${LOJAS[l]}: ${A.filter((x) => x.loja === l).length}`).join(' · ');
    return `<div class="kpis">${k(P.filter((p) => p.situacao === 'aguardando').length, 'Aguardando retorno')}${k(P.filter(atrasado).length, 'Retornos atrasados', P.some(atrasado))}${k(A.length, 'Itens em falta', false, esc(porLoja))}${k(pedidos().filter((x) => x.status === 'enviado').length, 'Pedidos a caminho')}</div>`;
  }

  const SECS = { parceiros: 'Parceiros', itens: 'Lista padrão', faltas: 'Faltas', pedidos: 'Pedidos' };
  H.registrar({
    id: ID, aba: 'Parceiros', grupo: 'gestao', colecoes: [C.cad, C.itens, C.faltas, C.ped, C.val],
    render() {
      const corpo = { parceiros: secParceiros, itens: secItens, faltas: secFaltas, pedidos: secPedidos }[F.sec] || secParceiros;
      return `<h2>Parceiros e mantimentos</h2>
        <p class="nota">Parceiros da Vivere, com o retorno de cada um acompanhado, e os mantimentos das lojas de Jurerê e do Porto da Lagoa. A diretoria vê e grava estes dados (também pela Vivian); os valores dos pedidos ficam só com o mestre.</p>
        ${kpis()}<div class="filtros" role="group" style="display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px">${Object.entries(SECS).map(([k, t]) => `<button class="btn${F.sec === k ? ' ativo' : ''}" type="button" data-parc-sec="${k}" aria-pressed="${F.sec === k}">${t}</button>`).join('')}</div>${corpo()}`;
    },
    foco(alvo) { if (alvo === '#itens') { F.sec = 'itens'; } else { F.sec = 'parceiros'; F.aberto = alvo || ''; } H.pede(); },
    busca(q) {
      const t = sem(q).trim(); if (t.length < 2) return [];
      const r = parceiros().filter((p) => textoP(p).includes(t)).slice(0, 6)
        .map((p) => ({ grp: 'Parceiros', tit: p.nome, sub: (TIPOS[p.tipo] || '') + ' · ' + (SIT[p.situacao] || [''])[0], ir: { aba: ID, linha: 'parc-' + p._id, alvo: p._id } }));
      return r.concat(itens().filter((x) => sem(x.item).includes(t)).slice(0, 2).map((x) => ({ grp: 'Mantimentos', tit: x.item, sub: 'Lista padrão · ' + (LOJAS[x.loja] || ''), ir: { aba: ID, alvo: '#itens' } })));
    },
  });

  // ---------------- ações
  const fd = (f) => Object.fromEntries(new FormData(f).entries());
  const fim = () => { F.form = ''; H.pede(); };
  const erro = (b) => (e) => { if (b) b.disabled = false; alert('Não gravou: ' + ((e && e.message) || e)); };

  document.addEventListener('change', (e) => {
    const t = e.target; if (!t.matches) return;
    if (t.matches('[data-parc-tipo]')) { F.tipo = t.value; H.pede(); }
    if (t.matches('[data-parc-loja]')) { F.loja = t.value; H.pede(); }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target.closest && e.target.closest('[data-parc-form]'); if (!f) return;
    e.preventDefault(); const v = fd(f), tipo = f.dataset.parcForm, b = f.querySelector('[type=submit]'); if (b) b.disabled = true;
    const ag = agora();
    if (tipo === 'parceiro') {
      if (!v.nome) { b.disabled = false; return; }
      const lojas = [v.loja_jurere && 'jurere', v.loja_porto && 'porto-lagoa'].filter(Boolean);
      const doc = { nome: v.nome, tipo: v.tipo || 'outro', lojas, canal: v.canal || '', contatos: (v.rotulo || v.whatsapp || v.telefone) ? [{ rotulo: v.rotulo || '', whatsapp: v.whatsapp || '', telefone: v.telefone || '' }] : [],
        situacao: 'aguardando', ultimo_contato: '', prazo_retorno: '', obs: v.obs || '', historico: [{ em: ag, por: 'Cleiton', texto: 'Parceiro cadastrado no HUB.' }], criado_em: ag, origem: 'hub' };
      grava(`${C.cad}/p-${slug(v.nome)}-${Date.now().toString(36)}`, doc, 'set').then(fim, erro(b));
    } else if (tipo === 'contato') {
      const p = H.S[C.cad] && H.S[C.cad][f.dataset.id]; if (!p) { if (b) b.disabled = false; return; }
      const hist = (p.historico || []).concat([{ em: ag, por: v.por || 'Cleiton', texto: v.texto || '(sem texto)' }]);
      grava(`${C.cad}/${f.dataset.id}`, { historico: hist, ultimo_contato: ag, situacao: v.situacao || p.situacao, prazo_retorno: v.prazo || (v.situacao === 'aguardando' ? p.prazo_retorno || '' : '') }).then(fim, erro(b));
    } else if (tipo === 'item') {
      if (!v.item || !v.loja) { b.disabled = false; return; }
      grava(`${C.itens}/i-${v.loja}-${slug(v.item)}`, { loja: v.loja, item: v.item, unidade: v.unidade || '', qtd: v.qtd ? +v.qtd : null, minimo: v.minimo ? +v.minimo : null, ativo: true, criado_em: ag }, 'set').then(fim, erro(b));
    } else if (tipo === 'falta') {
      if (!v.item || !v.loja) { b.disabled = false; return; }
      grava(`${C.faltas}/f-${Date.now().toString(36)}`, { loja: v.loja, item: v.item, qtd: v.qtd || '', quem: v.quem || 'Cleiton', origem: 'hub', em: ag, status: 'aberta' }, 'set').then(fim, erro(b));
    } else if (tipo === 'pedido') {
      const id = f.dataset.id, x = H.S[C.ped] && H.S[C.ped][id]; if (!x) { if (b) b.disabled = false; return; }
      const antes = x.status, fids = (x.faltas || []).slice();
      const muda = { parceiro: v.parceiro || '', status: v.status || x.status, nota: v.nota || '', atualizado_em: ag };
      const ps = [grava(`${C.ped}/${id}`, muda)];
      if (muda.status === 'entregue' && antes !== 'entregue') fids.forEach((fid) => ps.push(grava(`${C.faltas}/${fid}`, { status: 'resolvida', resolvida_em: ag })));
      if (muda.status === 'cancelado' && antes !== 'cancelado') fids.forEach((fid) => ps.push(grava(`${C.faltas}/${fid}`, { status: 'aberta', pedido: '' })));
      if (antes === 'entregue' && muda.status !== 'entregue' && muda.status !== 'cancelado') fids.forEach((fid) => ps.push(grava(`${C.faltas}/${fid}`, { status: 'pedido', resolvida_em: '' })));
      const vAnt = (H.S[C.val] || {})[id] || {}, vNovo = v.valor === '' || v.valor == null ? null : +v.valor;
      Promise.all(ps).then(() => (vNovo !== (vAnt.valor ?? null)
        ? grava(`${C.val}/${id}`, { valor: vNovo, atualizado_em: ag }, 'set').catch(() => alert('Pedido salvo; o valor não foi gravado (só o mestre grava valores).')) : null)).then(fim, erro(b));
    }
  });

  document.addEventListener('click', (e) => {
    const q = (s) => e.target.closest && e.target.closest(s);
    let b;
    if ((b = q('[data-parc-sec]'))) { F.sec = b.dataset.parcSec; F.form = ''; H.pede(); return; }
    if ((b = q('[data-parc-novo]'))) { F.form = F.form === b.dataset.parcNovo ? '' : b.dataset.parcNovo; H.pede(); return; }
    if (q('[data-parc-fecha]')) { fim(); return; }
    if ((b = q('[data-parc-abre]'))) { F.aberto = F.aberto === b.dataset.parcAbre ? '' : b.dataset.parcAbre; H.pede(); return; }
    if ((b = q('[data-parc-falta-item]'))) {
      const x = H.S[C.itens] && H.S[C.itens][b.dataset.parcFaltaItem]; if (!x) return;
      if (faltas().some((f) => f.item_id === b.dataset.parcFaltaItem && f.status !== 'resolvida')) { F.sec = 'faltas'; H.pede(); return; }
      b.disabled = true;
      grava(`${C.faltas}/f-${Date.now().toString(36)}`, { loja: x.loja, item: x.item, qtd: x.qtd ? `${x.qtd} ${x.unidade || ''}`.trim() : '', item_id: b.dataset.parcFaltaItem, quem: 'Cleiton', origem: 'hub', em: agora(), status: 'aberta' }, 'set').then(() => { F.sec = 'faltas'; H.pede(); }, erro(b));
      return;
    }
    if ((b = q('[data-parc-repos]'))) { b.disabled = true; grava(`${C.faltas}/${b.dataset.parcRepos}`, { status: 'resolvida', resolvida_em: agora() }).then(H.pede, erro(b)); return; }
    if ((b = q('[data-parc-monta]'))) {
      const loja = b.dataset.parcMonta, A = faltas().filter((x) => x.loja === loja && (x.status || 'aberta') === 'aberta');
      if (!A.length) { alert('Nenhuma falta aberta em ' + LOJAS[loja] + '.'); return; }
      const I = vivos(C.itens);
      const lista = A.map((x) => { const it = I.find((i) => i._id === x.item_id) || {}; return { item: x.item, qtd: x.qtd || (it.qtd != null ? String(it.qtd) : ''), unidade: x.qtd ? '' : (it.unidade || '') }; });
      const forn = parceiros().find((p) => p.tipo === 'fornecedor' && p.situacao === 'ativo' && (p.lojas || []).includes(loja));
      const id = `pd-${loja}-${Date.now().toString(36)}`; b.disabled = true;
      grava(`${C.ped}/${id}`, { loja, data: agora(), parceiro: forn ? forn._id : '', itens: lista, faltas: A.map((x) => x._id), status: 'rascunho', nota: '', origem: 'hub' }, 'set')
        .then(() => Promise.all(A.map((x) => grava(`${C.faltas}/${x._id}`, { status: 'pedido', pedido: id })))).then(() => { F.sec = 'pedidos'; H.pede(); }, erro(b));
      return;
    }
    if ((b = q('[data-parc-copia]'))) { const x = H.S[C.ped] && H.S[C.ped][b.dataset.parcCopia]; if (x) H.copiaTexto(textoPedido(x), b); }
  });
})();
