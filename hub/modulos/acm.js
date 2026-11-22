// modulos/acm.js — aba "Estudo de Mercado" (ACM) do CRM no HUB Vivere (construção "acm", fatia 3, 18/11/2026)
// Tarefa vivere-parecer-preco-comparaveis. Contrato: _hub\modulos\LEIA-ME.md.
// • Fila de aprovação dos estudos que os corretores mandam pelo app (módulo Estudo de Mercado, fatia 2), painel de todos os
//   estudos e configuração dos fatores e das faixas (acm_config). Qualquer diretor aprova; no HUB, quem decide é o Cleiton.
// • Lê e grava SÓ pelo conector Vivere Conversas, direto no Supabase (nada no banco do artefato):
//   - acm_estudos/<código> e acm_config/padrao = espelho das tabelas public.acm_* (gatilho acm_espelho, migração acm_f3_hub_20261118);
//   - acm_comandos/<id> = comando executado na hora por um gatilho com as funções acm_* (mesmas travas do app); o resultado volta
//     no próprio documento (ok, erro, resposta). Sem o conector, a aba só avisa.
// • Valores e nome do cliente com data-sens (botão 👁 do núcleo). Tabelas ordenáveis pelo cabeçalho (padrão th.ord do núcleo).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, ID = 'acm', SERV = 'Vivere Conversas', POR = 'Cleiton (HUB)';
  const APP = 'https://vivere-imoveis.github.io/app-vivere/index.html?aba=acm&estudo=';

  const ST = { criado: ['Criado', ''], em_analise: ['Em análise', 'warn'], devolvido: ['Devolvido', 'bad'], aprovado: ['Aprovado', 'ok'],
    apresentado: ['Apresentado', 'info'], assinado: ['Assinado', 'info'], vendido: ['Vendido', 'ok'], suspenso: ['Suspenso', 'int'] };
  const FX = { competitivo: ['Competitivo', 'ok'], mercado: ['Mercado', 'info'], improvavel: ['Improvável', 'bad'] };
  const FAT = [
    ['conservacao', 'Conservação', [['nova', 'Nova'], ['otima', 'Ótima'], ['regular', 'Regular'], ['reforma', 'Precisa de reforma']]],
    ['padrao', 'Padrão', [['alto', 'Alto'], ['medio', 'Médio'], ['simples', 'Simples']]],
    ['vista', 'Vista', [['panoramica', 'Panorâmica'], ['parcial', 'Parcial'], ['sem', 'Sem vista']]],
    ['solar', 'Posição solar', [['norte', 'Norte'], ['leste', 'Leste'], ['oeste_sul', 'Oeste/Sul']]],
    ['andar', 'Andar', [['terreo', 'Térreo/1º'], ['intermediario', 'Intermediário'], ['alto', 'Alto/último']]],
    ['lazer', 'Lazer', [['completo', 'Completo'], ['basico', 'Básico'], ['sem', 'Sem lazer']]],
    ['mobiliado', 'Mobília', [['mobiliado', 'Mobiliado'], ['semi', 'Semimobiliado'], ['sem', 'Sem mobília']]],
    ['praia', 'Distância da praia', [['ate200', 'Até 200 m'], ['ate500', '200 a 500 m'], ['ate1000', '500 m a 1 km'], ['acima1000', 'Acima de 1 km']]],
  ];
  const PARAM = [['margem_faixa', 'Margem das faixas (%)', 'Competitivo = abaixo de −margem; Mercado = ±margem; Improvável = acima de +margem', 1, 30],
    ['min_amostras', 'Mínimo de amostras', 'abaixo disso o estudo sai como baixa confiança', 1, 30],
    ['desc_oferta', 'Desconto de oferta (%)', 'valor pedido do anúncio → valor provável de venda (negativo)', -40, 0],
    ['corte_saneamento', 'Corte do saneamento (%)', 'descarta amostra mais longe que isso da média homogeneizada', 5, 100],
    ['area_tol', 'Tolerância de área (%)', 'amostras sugeridas do HUB: área do avaliado ± este percentual', 5, 60],
    ['max_sugeridas', 'Máximo de amostras sugeridas', 'por estudo, vindas dos anúncios da Vivere', 5, 40]];

  const E = { estudos: [], cfg: null, carregado: false, carregando: false, lidoEm: 0, erro: '', semConector: false,
    aba: 'fila', aberto: '', ocupado: '', msg: {}, txt: {}, cfgEd: null, F: { q: '', st: '', painel: '' }, ord: { todos: null, amostras: null } };

  // ---------------- conector ----------------
  let pM = null;
  const mcp = () => (pM ||= (window.claude && window.claude.use ? window.claude.use('mcp') : Promise.resolve(null)).catch(() => null));
  const prazo = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r({ code: 'prazo' }), ms))]);
  async function chama(nome, args) {
    const m = await mcp();
    if (!m) { E.semConector = true; throw new Error('sem o conector Vivere Conversas neste aparelho'); }
    const r = await prazo(m.callTool(SERV, nome, args, { cache: false }), 20000);
    let p = r && r.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { /* texto */ } }
    if (r && r.isError) throw new Error(typeof p === 'string' ? p : 'o conector recusou');
    return p;
  }
  async function lerColecao(col) {
    const out = []; let apos = null;
    for (let i = 0; i < 20; i++) {
      const p = await chama('hub_ler', apos ? { colecao: col, limite: 500, apos } : { colecao: col, limite: 500 });
      (p && p.itens || []).forEach((x) => out.push({ ...(x.dados || {}), _id: x.doc_id }));
      apos = p && p.proximo; if (!apos) break;
    }
    return out;
  }
  async function carrega(forcar) {
    if (E.carregando || (!forcar && E.carregado && Date.now() - E.lidoEm < 300000)) return;
    E.carregando = true; H.pede();
    try {
      const [es, cf] = await Promise.all([lerColecao('acm_estudos'), lerColecao('acm_config')]);
      E.estudos = es; E.cfg = cf.find((x) => x._id === 'padrao') || null; E.erro = ''; E.carregado = true; E.lidoEm = Date.now();
    } catch (e) { E.erro = (e && (e.message || e.code)) || 'erro na leitura'; }
    E.carregando = false; H.pede();
  }
  async function comando(dados) {
    const id = 'hub-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    await chama('hub_gravar', { operacoes: [{ acao: 'set', colecao: 'acm_comandos', doc_id: id, if_versao: 0,
      dados: { ...dados, por: POR, pedido_em: new Date().toISOString() } }] });
    const p = await chama('hub_ler', { colecao: 'acm_comandos', doc_id: id });
    const d = (p && p.itens && p.itens[0] && p.itens[0].dados) || {};
    if (!d.aplicado_em) throw new Error('o comando não foi executado (gatilho ausente?)');
    if (d.ok !== true) throw new Error(d.erro || 'recusado pelo banco');
    return d.resposta || {};
  }
  async function executa(chave, dados, ok) {
    if (E.ocupado) return; E.ocupado = chave; E.msg[chave] = null; H.pede();
    try { await comando(dados); E.msg[chave] = { ok: true, t: ok }; await carrega(true); }
    catch (e) { E.msg[chave] = { ok: false, t: 'Não foi: ' + ((e && (e.message || e.code)) || 'erro') }; }
    E.ocupado = ''; H.pede();
  }

  // ---------------- formatos ----------------
  const n = (v) => (v === null || v === undefined || v === '' || isNaN(+v) ? null : +v);
  const brl0 = (v) => (n(v) === null ? '—' : H.brl0 ? H.brl0(+v) : 'R$ ' + Math.round(+v).toLocaleString('pt-BR'));
  const m2 = (v) => (n(v) === null ? '—' : 'R$ ' + (+v).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + '/m²');
  const num = (v, d = 0) => (n(v) === null ? '—' : (+v).toLocaleString('pt-BR', { maximumFractionDigits: d }));
  const pct = (v) => (n(v) === null ? '—' : (+v > 0 ? '+' : '') + num(v, 1) + '%');
  const sens = (t) => `<span data-sens>${t}</span>`;
  const pill = (map, k) => { const r = map[k] || [k || '—', '']; return `<span class="pill ${r[1]}">${esc(r[0])}</span>`; };
  const dtBR = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] + 'h' + m[5] : ''}` : '—'; };
  const corretor = (p) => String(p || '—').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const rotFat = (f, v) => { const x = FAT.find((y) => y[0] === f); const o = x && x[2].find((y) => y[0] === v); return o ? o[1] : (v || '—'); };
  const res = (e) => e.resultado || {};
  const fila = () => E.estudos.filter((e) => e.status === 'em_analise').sort((a, b) => String(a.atualizado_em).localeCompare(String(b.atualizado_em)));

  function ordena(L, o, chave) {
    if (!o) return L;
    const v = (x) => { const r = chave(x, o.k); return r === null || r === undefined ? '' : r; };
    return [...L].sort((a, b) => { const x = v(a), y = v(b); const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt', { numeric: true });
      return o.dir === 'asc' ? c : -c; });
  }
  const th = (grupo, k, rot) => { const o = E.ord[grupo], d = o && o.k === k ? o.dir : '';
    return `<th class="ord" data-acm-ord="${grupo}:${k}" tabindex="0" role="button"${d ? ` data-dir="${d}" aria-sort="${d === 'asc' ? 'ascending' : 'descending'}"` : ''} title="Ordenar: 1º clique maior → menor, 2º menor → maior, 3º volta à ordem original">${rot}</th>`; };

  // ---------------- partes da tela ----------------
  function kpis() {
    const L = E.estudos, k = (v, r, alvo) => `<div class="kpi"${alvo ? ` data-acm-ir="${alvo}" style="cursor:pointer"` : ''}><div class="num">${v}</div><div class="rot">${r}</div></div>`;
    const c = (s) => L.filter((e) => s.includes(e.status)).length;
    const baixa = L.filter((e) => res(e).confianca === 'baixa' && !['vendido', 'suspenso'].includes(e.status)).length;
    return `<div class="kpis">${k(c(['em_analise']), 'Na fila de aprovação', 'fila')}${k(c(['devolvido', 'criado']), 'Com o corretor (criado ou devolvido)', 'todos')}${
      k(c(['aprovado', 'apresentado', 'assinado']), 'Aprovados em uso', 'todos')}${k(c(['vendido']), 'Vendidos')}${k(baixa, 'Com baixa confiança', 'todos')}${k(L.length, 'Estudos no total', 'todos')}</div>`;
  }
  function abas() {
    const b = (k, t) => `<button type="button" class="btn${E.aba === k ? ' ativo' : ''}" data-acm-aba="${k}" style="${E.aba === k ? 'outline:2px solid var(--accent);' : ''}">${t}</button>`;
    return `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px">${b('fila', `Fila de aprovação (${fila().length})`)}${b('todos', 'Todos os estudos')}${b('config', 'Configuração')}
      <span class="s" style="margin-left:auto">${E.carregando ? 'lendo o Supabase…' : E.lidoEm ? 'lido às ' + new Date(E.lidoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
      <button type="button" class="btn" data-acm-atualizar${E.carregando ? ' disabled' : ''}>↻ Atualizar</button></div>`;
  }
  const lin = (r, v) => `<div style="display:grid;grid-template-columns:minmax(110px,40%) 1fr;gap:8px;padding:4px 0;border-bottom:1px solid var(--line)"><span class="s">${r}</span><span>${v}</span></div>`;
  const msg = (k) => { const m = E.msg[k]; return m ? `<div class="s" style="margin:6px 0;color:var(--${m.ok ? 'ok' : 'bad'})">${esc(m.t)}</div>` : ''; };
  const estiloCampo = 'font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px;width:100%;box-sizing:border-box';
  const campo = (k, ph, tipo) => (tipo === 'area'
    ? `<textarea rows="2" data-acm-txt="${k}" placeholder="${esc(ph)}" style="${estiloCampo}">${esc(E.txt[k] || '')}</textarea>`
    : `<input type="${tipo || 'text'}" data-acm-txt="${k}" placeholder="${esc(ph)}" value="${esc(E.txt[k] || '')}" style="${estiloCampo}">`);

  function ficha(e) {
    const f = e.ficha || {};
    const base = [['Tipo', esc(f.tipo || '—')], ['Bairro', esc(f.bairro || '—')], ['Área privativa', f.area ? num(f.area, 2) + ' m²' : '—'],
      ['Dormitórios / suítes', `${num(f.dorm)} / ${num(f.suites)}`], ['Vagas', num(f.vagas)], ['Valor pedido', sens(brl0(f.valor_pedido))]];
    const fat = FAT.map(([k, r]) => [r, f[k] ? esc(rotFat(k, f[k])) : '<span class="s">não informado</span>']);
    return `<div class="card" style="margin:0"><h3 style="margin:0 0 6px">Imóvel avaliado</h3>${base.concat(fat).map(([a, b]) => lin(a, b)).join('')}</div>`;
  }
  function resultado(e) {
    const r = res(e), fx = r.faixas || {};
    if (!r.calculado_em) return `<div class="card" style="margin:0"><h3 style="margin:0 0 6px">Resultado</h3><p class="s">Ainda sem cálculo.</p></div>`;
    const am = e.ajuste_manual;
    return `<div class="card" style="margin:0"><h3 style="margin:0 0 6px">Resultado</h3>
      ${lin('Valor de mercado', `<b>${sens(brl0(r.valor_final))}</b>${r.ajuste_manual ? ` <span class="pill warn" title="${esc(am && am.motivo || '')}">ajuste manual</span>` : ''}`)}
      ${r.ajuste_manual ? lin('Calculado pelas amostras', sens(brl0(r.valor_mercado_calculado))) + lin('Motivo do ajuste', esc(am && am.motivo || '—') + (am && am.por ? ` <span class="s">(${esc(am.por)})</span>` : '')) : ''}
      ${lin('Competitivo', sens('até ' + brl0(fx.competitivo_ate)))}
      ${lin('Mercado', sens(brl0(fx.mercado_de) + ' a ' + brl0(fx.mercado_ate)))}
      ${lin('Improvável', sens('acima de ' + brl0(fx.improvavel_acima)))}
      ${lin('Valor pedido', r.valor_pedido ? sens(brl0(r.valor_pedido)) + ' ' + pill(FX, r.faixa_do_pedido) + ` <span class="s">${pct(r.diferenca_pct)} sobre o mercado</span>` : '—')}
      ${lin('R$/m² médio', m2(r.rs_m2_medio) + ` <span class="s">· CV ${num(r.coef_variacao, 1)}%</span>`)}
      ${lin('Amostras', `${num(r.amostras_validas)} válidas de ${num(r.amostras_incluidas)} incluídas (${num(r.amostras_saneadas)} saneadas${r.vendidos_validos ? `; ${num(r.vendidos_validos)} vendidos` : ''}) · mínimo ${num(r.minimo)} ` +
        (r.confianca === 'baixa' ? '<span class="pill bad">baixa confiança</span>' : '<span class="pill ok">confiança normal</span>'))}
      ${lin('Calculado em', dtBR(r.calculado_em) + (r.parametros ? ` <span class="s">· oferta ${pct(r.parametros.desc_oferta)} · corte ${num(r.parametros.corte_saneamento)}%${r.parametros.peso_vendido != null ? ` · vendido peso ${num(r.parametros.peso_vendido)}` : ''}</span>` : ''))}</div>`;
  }
  const ORIG = { hub: 'Vivere', concorrente: 'Concorrente', portal: 'Portal', manual: 'Manual' };
  function amostras(e) {
    const L0 = (e.amostras || []).map((a, i) => ({ ...a, _i: i }));
    if (!L0.length) return '<p class="s">Sem amostras.</p>';
    const ch = (a, k) => ({ orig: a.valor_fechado ? 'Vendido' : ORIG[a.origem] || a.origem, ref: a.ref || a.fonte_nome || '', bairro: a.bairro || '', area: n(a.area), valor: n(a.valor),
      rs: n(a.calc && a.calc.rs_m2), aj: n(a.calc && a.calc.ajuste_total), hom: n(a.calc && a.calc.rs_m2_homog), sit: !a.incluida ? 2 : a.calc && a.calc.saneada ? 1 : 0 })[k];
    const L = ordena(L0, E.ord.amostras, ch);
    const sit = (a) => (!a.incluida ? `<span class="pill int" title="${esc(a.motivo_exclusao || '')}">excluída</span>` : a.calc && a.calc.saneada ? '<span class="pill warn">saneada</span>' : '<span class="pill ok">válida</span>');
    const ajTit = (a) => Object.entries((a.calc && a.calc.ajustes) || {}).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}%`).join(' · ');
    return `<div class="tabela"><table><thead><tr>${th('amostras', 'orig', 'Fonte')}${th('amostras', 'ref', 'Anúncio')}${th('amostras', 'bairro', 'Bairro')}${th('amostras', 'area', 'Área')}${
      th('amostras', 'valor', 'Valor')}${th('amostras', 'rs', 'R$/m²')}${th('amostras', 'aj', 'Ajuste')}${th('amostras', 'hom', 'R$/m² homog.')}${th('amostras', 'sit', 'Situação')}</tr></thead><tbody>${
      L.map((a) => `<tr><td>${esc(a.valor_fechado ? 'Vendido' : ORIG[a.origem] || a.origem)}${a.fonte_nome && a.origem !== 'hub' ? `<div class="s">${esc(a.fonte_nome)}</div>` : ''}</td>
        <td>${a.link ? `<a class="lk" href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.ref || 'abrir')}</a>` : esc(a.ref || '—')}${a.coletado_em && a.origem !== 'hub' ? `<div class="s">${dtBR(a.coletado_em)}</div>` : ''}</td>
        <td>${esc(a.bairro || '—')}</td><td>${num(a.area, 2)} m²</td><td>${brl0(a.valor)}${a.valor_fechado ? ' <span class="pill info">fechado</span>' : ''}</td>
        <td>${m2(a.calc && a.calc.rs_m2)}</td><td title="${esc(ajTit(a))}">${pct(a.calc && a.calc.ajuste_total)}</td><td>${m2(a.calc && a.calc.rs_m2_homog)}</td><td>${sit(a)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function acoes(e) {
    const c = e.codigo, s = e.status, oc = E.ocupado ? ' disabled' : '';
    const b = (acao, rot, extra) => `<button type="button" class="btn" data-acm-cmd="${acao}" data-acm-cod="${esc(c)}"${oc}${extra || ''}>${E.ocupado === c + ':' + acao ? '…' : rot}</button>`;
    const blocos = [];
    if (s === 'em_analise') blocos.push(`<div style="display:grid;gap:6px"><b>Decisão</b>${campo(c + ':obs', 'Observação (obrigatória para devolver; opcional ao aprovar)', 'area')}
      <div style="display:flex;flex-wrap:wrap;gap:8px">${b('aprovar', '✔ Aprovar', ' style="border-color:var(--ok)"')}${b('devolver', '↩ Devolver ao corretor', ' style="border-color:var(--bad)"')}</div></div>`);
    const fluxo = { aprovado: [['apresentado', 'Marcar apresentado ao cliente']], apresentado: [['assinado', 'Marcar assinado'], ['vendido', 'Marcar vendido']], assinado: [['vendido', 'Marcar vendido']] }[s] || [];
    if (fluxo.length) blocos.push(`<div style="display:flex;flex-wrap:wrap;gap:8px">${fluxo.map(([a, r]) => b(a, r)).join('')}</div>`);
    if (!['vendido', 'suspenso'].includes(s)) {
      blocos.push(`<div style="display:grid;gap:6px"><b>Ajuste manual do valor</b><span class="s">${e.ajuste_bloqueado ? 'Bloqueado para o corretor.' : 'Liberado para o corretor.'} A diretoria ajusta sempre.</span>
        <div style="display:grid;grid-template-columns:minmax(120px,1fr) 2fr;gap:6px">${campo(c + ':valor', 'Valor (R$)', 'number')}${campo(c + ':motivo', 'Motivo do ajuste')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${b('ajuste_manual', 'Aplicar ajuste')}${e.ajuste_manual ? b('tirar_ajuste', 'Voltar ao valor calculado') : ''}${
        b(e.ajuste_bloqueado ? 'liberar_ajuste' : 'bloquear_ajuste', e.ajuste_bloqueado ? 'Liberar ajuste ao corretor' : 'Bloquear ajuste do corretor')}${b('calcular', '↻ Recalcular')}</div></div>`);
      blocos.push(`<div style="display:flex;flex-wrap:wrap;gap:8px">${b('suspender', 'Suspender estudo')}</div>`);
    } else if (s === 'suspenso') blocos.push(`<div style="display:flex;flex-wrap:wrap;gap:8px">${b('reabrir', 'Reabrir (volta para criado)')}</div>`);
    return `<div class="card" style="margin:0;display:grid;grid-template-columns:minmax(0,1fr);gap:12px"><h3 style="margin:0">Ações</h3>${msg(c)}${blocos.join('')}</div>`;
  }
  function detalhe(e) {
    const hist = (e.historico || []).slice().reverse();
    return `<div class="card" id="acm-${esc(e.codigo)}" style="margin:8px 0 14px;display:grid;grid-template-columns:minmax(0,1fr);gap:12px">
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><h3 style="margin:0">${esc(e.codigo)}</h3>${pill(ST, e.status)}
        <span class="s">${esc(corretor(e.painel))} · ${e.destinatario === 'comprador' ? 'para comprador' : 'para vendedor'} · ${e.finalidade === 'locacao' ? 'locação' : 'venda'}${e.imovel_ref ? ' · ' + esc(e.imovel_ref) : ''}</span>
        <span style="margin-left:auto;display:flex;gap:8px"><a class="lk" href="${APP + encodeURIComponent(e.codigo)}" target="_blank" rel="noopener">abrir no app</a>
        <button type="button" class="btn" data-acm-fecha>Fechar</button></span></div>
      ${lin('Cliente', e.cliente_nome ? sens(esc(e.cliente_nome)) : '—')}${lin('Criado', dtBR(e.criado_em) + (e.criado_por ? ' · ' + esc(e.criado_por) : ''))}${e.aprovado_por ? lin('Aprovado', esc(e.aprovado_por) + ' · ' + dtBR(e.aprovado_em)) : ''}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:12px">${ficha(e)}${resultado(e)}${acoes(e)}</div>
      <div><h3 style="margin:0 0 6px">Amostras (${(e.amostras || []).length})</h3>${amostras(e)}</div>
      <details><summary class="s" style="cursor:pointer">Histórico (${hist.length})</summary>${hist.map((h) => `<div style="padding:3px 0;border-bottom:1px solid var(--line)"><span class="s">${dtBR(h.em)} · ${esc(h.por || '')}</span> — ${esc(h.o_que || '')}</div>`).join('')}</details></div>`;
  }
  function filaTela() {
    const L = fila();
    if (!L.length) return H.vazio('Nenhum estudo esperando aprovação. Os corretores mandam pelo app (Estudo de Mercado › Enviar para análise).');
    return L.map((e) => {
      const r = res(e);
      return E.aberto === e.codigo ? detalhe(e) : `<div class="card" style="margin:0 0 10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr));gap:8px;align-items:center">
        <div><b>${esc(e.codigo)}</b> ${pill(ST, e.status)}<div class="s">${esc(corretor(e.painel))} · ${esc(dtBR(e.atualizado_em))}</div></div>
        <div>${esc((e.ficha || {}).tipo || '')} · ${esc((e.ficha || {}).bairro || '')}<div class="s">${e.imovel_ref ? esc(e.imovel_ref) + ' · ' : ''}${(e.ficha || {}).area ? num(e.ficha.area, 2) + ' m²' : ''}</div></div>
        <div>${sens(brl0(r.valor_final))}<div class="s">pedido ${sens(brl0(r.valor_pedido))} ${r.faixa_do_pedido ? pill(FX, r.faixa_do_pedido) : ''}</div></div>
        <div>${num(r.amostras_validas)} amostras ${r.confianca === 'baixa' ? '<span class="pill bad">baixa confiança</span>' : ''}</div>
        <div style="text-align:right"><button type="button" class="btn" data-acm-abre="${esc(e.codigo)}">Analisar</button></div></div>`;
    }).join('');
  }
  function todosTela() {
    const q = sem(E.F.q).trim();
    let L = E.estudos.filter((e) => (!E.F.st || e.status === E.F.st) && (!E.F.painel || e.painel === E.F.painel) &&
      (!q || sem([e.codigo, e.imovel_ref, e.cliente_nome, e.painel, (e.ficha || {}).bairro, (e.ficha || {}).tipo].join(' ')).includes(q)));
    const ch = (e, k) => ({ cod: e.codigo, st: e.status, cor: e.painel, imv: [(e.ficha || {}).tipo, (e.ficha || {}).bairro].join(' '), vm: n(res(e).valor_final),
      ped: n(res(e).valor_pedido), dif: n(res(e).diferenca_pct), am: n(res(e).amostras_validas), at: e.atualizado_em })[k];
    L = ordena(L.sort((a, b) => String(b.atualizado_em).localeCompare(String(a.atualizado_em))), E.ord.todos, ch);
    const pains = [...new Set(E.estudos.map((e) => e.painel).filter(Boolean))].sort();
    const op = (v, t, s) => `<option value="${esc(v)}"${s ? ' selected' : ''}>${esc(t)}</option>`;
    const sel = 'font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px';
    const filtros = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px">
      <input type="search" data-acm-q placeholder="Buscar código, imóvel, cliente, bairro…" value="${esc(E.F.q)}" style="${sel};min-width:220px;flex:1">
      <select data-acm-fst style="${sel}">${op('', 'Todas as situações', !E.F.st)}${Object.entries(ST).map(([k, v]) => op(k, v[0], E.F.st === k)).join('')}</select>
      <select data-acm-fpa style="${sel}">${op('', 'Todos os corretores', !E.F.painel)}${pains.map((p) => op(p, corretor(p), E.F.painel === p)).join('')}</select></div>`;
    const ab = E.aberto && E.estudos.find((e) => e.codigo === E.aberto);
    if (!E.estudos.length) return filtros + H.vazio('Nenhum estudo de mercado criado ainda.');
    return filtros + (ab ? detalhe(ab) : '') + `<div class="tabela"><table><thead><tr>${th('todos', 'cod', 'Código')}${th('todos', 'st', 'Situação')}${th('todos', 'cor', 'Corretor')}${
      th('todos', 'imv', 'Imóvel')}${th('todos', 'vm', 'Mercado')}${th('todos', 'ped', 'Pedido')}${th('todos', 'dif', 'Diferença')}${th('todos', 'am', 'Amostras')}${th('todos', 'at', 'Atualizado')}</tr></thead><tbody>${
      L.map((e) => { const r = res(e); return `<tr id="acm-l-${esc(e.codigo)}" data-acm-abre="${esc(e.codigo)}" style="cursor:pointer${E.aberto === e.codigo ? ';outline:2px solid var(--accent)' : ''}">
        <td><b>${esc(e.codigo)}</b></td><td>${pill(ST, e.status)}</td><td>${esc(corretor(e.painel))}</td>
        <td>${esc([(e.ficha || {}).tipo, (e.ficha || {}).bairro].filter(Boolean).join(' · ') || '—')}${e.imovel_ref ? `<div class="s">${esc(e.imovel_ref)}</div>` : ''}</td>
        <td>${sens(brl0(r.valor_final))}</td><td>${sens(brl0(r.valor_pedido))}</td><td>${r.faixa_do_pedido ? pill(FX, r.faixa_do_pedido) + ' ' + pct(r.diferenca_pct) : '—'}</td>
        <td>${num(r.amostras_validas)}${r.confianca === 'baixa' ? ' <span class="pill bad">baixa</span>' : ''}</td><td>${dtBR(e.atualizado_em)}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  function configTela() {
    const c = E.cfg; if (!c) return H.vazio('Configuração não encontrada no Supabase.');
    const ed = E.cfgEd || (E.cfgEd = JSON.parse(JSON.stringify(c)));
    const inp = (attr, v, min, max) => `<input type="number" step="1" min="${min}" max="${max}" ${attr} value="${esc(v ?? '')}" style="font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:4px 6px;width:80px">`;
    const mudou = JSON.stringify(ed) !== JSON.stringify(c);
    return `<p class="nota">Percentuais aplicados sobre o R$/m² de cada amostra: o ajuste é a diferença entre o fator do imóvel avaliado e o da amostra. Vale para os próximos cálculos; os estudos já calculados mudam só quando forem recalculados. Última alteração: ${dtBR(c.atualizado_em)}${c.atualizado_por ? ' · ' + esc(c.atualizado_por) : ''}.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:12px">
        <div class="card" style="margin:0"><h3 style="margin:0 0 6px">Faixas e amostras</h3>${PARAM.map(([k, r, d, mi, ma]) => lin(`${r}<div class="s">${d}</div>`, inp(`data-acm-par="${k}"`, ed[k], mi, ma))).join('')}
          ${lin('Vagas (% por vaga de diferença)', inp('data-acm-fat="vagas_por_unidade"', (ed.fatores || {}).vagas_por_unidade, 0, 20))}
          ${lin('Peso do vendido na média<div class="s">imóvel vendido (valor fechado) conta este número de vezes; anúncio conta 1</div>', inp('data-acm-fat="peso_vendido"', (ed.fatores || {}).peso_vendido ?? 2, 1, 5))}</div>
        ${FAT.map(([k, r, ops]) => `<div class="card" style="margin:0"><h3 style="margin:0 0 6px">${r}</h3>${ops.map(([o, ro]) => lin(ro, inp(`data-acm-fat="${k}.${o}"`, ((ed.fatores || {})[k] || {})[o], -50, 50) + ' %')).join('')}</div>`).join('')}
      </div>${msg('config')}
      <div style="display:flex;gap:8px;margin:12px 0"><button type="button" class="btn" data-acm-salvacfg${mudou && !E.ocupado ? '' : ' disabled'}>${E.ocupado === 'config' ? 'Salvando…' : 'Salvar configuração'}</button>
        <button type="button" class="btn" data-acm-descartacfg${mudou ? '' : ' disabled'}>Descartar alterações</button></div>`;
  }

  H.registrar({
    id: ID, aba: 'Estudo de Mercado', grupo: 'crm', colecoes: [],
    render() {
      carrega(false);
      const topo = `<h2>Estudo de Mercado (ACM)</h2><p class="nota">Estudos de preço por comparáveis que os corretores fazem no app. Aqui a diretoria aprova ou devolve, acompanha o fluxo (aprovado → apresentado → assinado → vendido) e ajusta os fatores e as faixas. Lê e grava direto no Supabase pelo conector Vivere Conversas.</p>`;
      if (E.semConector) return topo + H.vazio('Esta aba precisa do conector Vivere Conversas (só no aparelho do Cleiton). Os outros diretores aprovam pelo app.');
      if (!E.carregado) return topo + (E.erro ? `<div class="card"><p>Não consegui ler o Supabase: ${esc(E.erro)}</p><button type="button" class="btn" data-acm-atualizar>Tentar de novo</button></div>` : H.vazio('Carregando os estudos…'));
      return topo + (E.erro ? `<p class="s" style="color:var(--bad)">Última leitura falhou (${esc(E.erro)}); mostrando a anterior.</p>` : '') + kpis() + abas() +
        (E.aba === 'config' ? configTela() : E.aba === 'todos' ? todosTela() : filaTela());
    },
    foco(alvo) { if (alvo) { E.aberto = alvo; const e = E.estudos.find((x) => x.codigo === alvo); E.aba = e && e.status === 'em_analise' ? 'fila' : 'todos'; } H.pede(); },
    busca(q) {
      const t = sem(q).trim(); if (t.length < 2) return [];
      return E.estudos.filter((e) => sem([e.codigo, e.imovel_ref, e.cliente_nome, e.painel, (e.ficha || {}).bairro].join(' ')).includes(t)).slice(0, 8)
        .map((e) => ({ grp: 'Estudo de Mercado', tit: e.codigo + ' · ' + (ST[e.status] || [e.status])[0], sub: [corretor(e.painel), e.imovel_ref, (e.ficha || {}).bairro].filter(Boolean).join(' · '), ir: { aba: ID, alvo: e.codigo } }));
    },
  });

  // ---------------- eventos ----------------
  const naAba = (el) => el && el.closest && el.closest('[data-acm-q],[data-acm-fst],[data-acm-fpa],[data-acm-txt],[data-acm-par],[data-acm-fat]');
  document.addEventListener('input', (ev) => {
    const t = ev.target; if (!naAba(t)) return;
    if (t.matches('[data-acm-txt]')) { E.txt[t.dataset.acmTxt] = t.value; return; } // sem redesenhar: não perde o foco
    if (t.matches('[data-acm-par]')) { E.cfgEd[t.dataset.acmPar] = t.value === '' ? null : +t.value; ajustaBotoesCfg(); return; }
    if (t.matches('[data-acm-fat]')) { const [k, o] = t.dataset.acmFat.split('.'); const f = (E.cfgEd.fatores ||= {});
      if (o) (f[k] ||= {})[o] = t.value === '' ? null : +t.value; else f[k] = t.value === '' ? null : +t.value; ajustaBotoesCfg(); return; }
    if (t.matches('[data-acm-q]')) { E.F.q = t.value; const pos = t.selectionStart; H.pede();
      setTimeout(() => { const el = document.querySelector('[data-acm-q]'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (_) {} } }, 0); }
  });
  function ajustaBotoesCfg() {
    const mudou = JSON.stringify(E.cfgEd) !== JSON.stringify(E.cfg);
    const s = document.querySelector('[data-acm-salvacfg]'), d = document.querySelector('[data-acm-descartacfg]');
    if (s) s.disabled = !mudou || !!E.ocupado; if (d) d.disabled = !mudou;
  }
  document.addEventListener('change', (ev) => {
    const t = ev.target; if (!naAba(t)) return;
    if (t.matches('[data-acm-fst]')) { E.F.st = t.value; H.pede(); }
    if (t.matches('[data-acm-fpa]')) { E.F.painel = t.value; H.pede(); }
  });
  const ordClique = (el) => { const [g, k] = el.dataset.acmOrd.split(':'); const o = E.ord[g];
    E.ord[g] = !o || o.k !== k ? { k, dir: 'desc' } : o.dir === 'desc' ? { k, dir: 'asc' } : null; H.pede(); };
  document.addEventListener('keydown', (ev) => { const el = ev.target.closest && ev.target.closest('[data-acm-ord]'); if (el && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); ordClique(el); } });
  document.addEventListener('click', (ev) => {
    const q = (s) => ev.target.closest && ev.target.closest(s);
    let el;
    if ((el = q('[data-acm-ord]'))) { ordClique(el); return; }
    if ((el = q('[data-acm-atualizar]'))) { carrega(true); return; }
    if ((el = q('[data-acm-aba]'))) { E.aba = el.dataset.acmAba; E.aberto = ''; H.pede(); return; }
    if ((el = q('[data-acm-ir]'))) { E.aba = el.dataset.acmIr; E.aberto = ''; H.pede(); return; }
    if ((el = q('[data-acm-fecha]'))) { E.aberto = ''; H.pede(); return; }
    if ((el = q('[data-acm-cmd]'))) {
      const a = el.dataset.acmCmd, c = el.dataset.acmCod, obs = (E.txt[c + ':obs'] || '').trim();
      const e = E.estudos.find((x) => x.codigo === c); if (!e) return;
      let dados = { acao: a, estudo_id: e.id, codigo: c }, ok = 'Feito.';
      if (a === 'devolver') { if (!obs) { E.msg[c] = { ok: false, t: 'Escreva o motivo da devolução na observação.' }; H.pede(); return; } dados.obs = obs; ok = 'Devolvido ao corretor.'; }
      else if (a === 'aprovar') { if (obs) dados.obs = obs; ok = 'Aprovado.'; }
      else if (a === 'ajuste_manual') {
        const v = +String(E.txt[c + ':valor'] || '').replace(',', '.'), m = (E.txt[c + ':motivo'] || '').trim();
        if (!(v > 0) || !m) { E.msg[c] = { ok: false, t: 'Informe o valor e o motivo do ajuste.' }; H.pede(); return; }
        dados.valor = v; dados.motivo = m; ok = 'Ajuste aplicado e estudo recalculado.';
      } else if (a === 'tirar_ajuste') { dados = { acao: 'ajuste_manual', estudo_id: e.id, codigo: c, valor: null, motivo: null }; ok = 'Ajuste removido: vale o valor calculado.'; }
      else if (['suspender', 'reabrir', 'apresentado', 'assinado', 'vendido'].includes(a)) { if (obs) dados.obs = obs; ok = 'Situação atualizada.'; }
      else if (a === 'calcular') ok = 'Recalculado com a configuração atual.';
      if (a === 'suspender' && !window.confirm('Suspender o estudo ' + c + '?')) return;
      executa(c + ':' + a, dados, ok).then(() => { E.msg[c] = E.msg[c + ':' + a]; if (E.msg[c] && E.msg[c].ok) { delete E.txt[c + ':obs']; if (a === 'ajuste_manual') { delete E.txt[c + ':valor']; delete E.txt[c + ':motivo']; } } H.pede(); });
      return;
    }
    if ((el = q('[data-acm-abre]'))) { const c = el.dataset.acmAbre; E.aberto = E.aberto === c ? '' : c; H.pede(); return; }
    if ((el = q('[data-acm-descartacfg]'))) { E.cfgEd = null; E.msg.config = null; H.pede(); return; }
    if ((el = q('[data-acm-salvacfg]'))) {
      const ed = E.cfgEd, c = E.cfg, cfg = {};
      for (const [k, rot, , mi, ma] of PARAM) { if (ed[k] !== c[k]) { if (ed[k] === null || ed[k] < mi || ed[k] > ma) { E.msg.config = { ok: false, t: `${rot}: use um valor de ${mi} a ${ma}.` }; H.pede(); return; } cfg[k] = ed[k]; } }
      const fat = {}; for (const k of Object.keys(ed.fatores || {})) if (JSON.stringify(ed.fatores[k]) !== JSON.stringify((c.fatores || {})[k])) {
        const v = ed.fatores[k]; const vals = typeof v === 'object' ? Object.values(v) : [v];
        if (vals.some((x) => x === null || isNaN(x) || x < -50 || x > 50 || (k === 'vagas_por_unidade' && x < 0) || (k === 'peso_vendido' && (x < 1 || x > 5)))) { E.msg.config = { ok: false, t: 'Fator com valor vazio ou fora de −50 a 50.' }; H.pede(); return; }
        fat[k] = v; }
      if (Object.keys(fat).length) cfg.fatores = fat;
      if (!Object.keys(cfg).length) return;
      executa('config', { acao: 'config', config: cfg }, 'Configuração salva.').then(() => { if (E.msg.config && E.msg.config.ok) E.cfgEd = null; H.pede(); });
    }
  });
})();
