/* Metas por corretor no app da Vivere (17/11/2026, sessão "VIS - Construção - Ampliação CRM Corretores F7", fatia 7).
   Decisões do Cleiton nos cartões de 17/11/2026: as metas propostas pelos corretores em outubro (até 31/12/2026) vivem na base
   (HUB › metas_corretores); o banco calcula o realizado sozinho (privado.metas_rodar) e grava no painel metas/atual e, sem nomes,
   o placar das equipes em _comum/metas_equipes/placar. Agenciamentos = imóveis da base com o corretor e cadastro no período;
   visitas e fechamentos = etapas do CRM; VGV = valor das vendas fechadas; vídeos = registros do corretor (story ou vídeo sobre
   imóvel ou sobre a Vivere, marcando @vivere) + saldo até hoje declarado (a diretoria confere no HUB). A conexão com a API do
   Instagram da Vivere (tarefa vis-instagram-api-mencoes) vai trocar a fonte dos vídeos depois. Sem dependências. */ /* trocas-inicio-espaco */
(function () {
  if (window.MetasCRM) return;
  const VERSAO = '2026-11-17.1';
  const CAMPOS = [
    ['agenciamentos', 'Agenciamentos', '🏠'], ['visitas', 'Visitas com clientes', '🚶'], ['videos', 'Vídeos e stories', '🎬'],
    ['fech_venda', 'Fechamentos de venda', '🏷'], ['fech_loc', 'Fechamentos de locação', '🔑'], ['vgv', 'VGV', '💰']];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n0 = (v) => { if (v == null || v === '') return null; const n = Number(v); return isFinite(n) ? n : null; };
  const num = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));
  const reais = (v) => { v = n0(v) || 0; return v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  const fmt = (k, v) => (k === 'vgv' ? `<span class="sens">${reais(v)}</span>` : num(v));
  const dBR = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  const ms = (s) => Date.parse(String(s).slice(0, 10) + 'T12:00');
  // ritmo: quanto já deveria ter feito hoje, proporcional ao tempo do período (0 a 1)
  function fracao(per, hoje) { const a = ms(per.de), b = ms(per.ate), h = ms(hoje); if (!isFinite(a) || !isFinite(b) || b <= a) return 1; return Math.max(0, Math.min(1, (h - a) / (b - a))); }
  function linhas(doc, hoje) {
    const M = (doc && doc.metas) || {}, R = (doc && doc.realizado) || {}, f = fracao((doc && doc.periodo) || {}, hoje);
    return CAMPOS.filter(([k]) => n0(M[k]) != null).map(([k, rot, ic]) => {
      const meta = n0(M[k]), real = n0(R[k]) || 0, pct = meta > 0 ? real / meta : real > 0 ? 1 : 0, esperado = meta * f;
      const est = meta === 0 ? 'ok' : real >= meta ? 'feita' : real + 1e-9 >= esperado ? 'ok' : real >= esperado * 0.6 ? 'atencao' : 'atras';
      return { k, rot, ic, meta, real, pct, esperado, est };
    });
  }
  const COR = { feita: 'var(--ok)', ok: 'var(--ok)', atencao: 'var(--brass, #b8862b)', atras: 'var(--bad, #b0402e)' };
  const TXT = { feita: 'meta batida', ok: 'no ritmo', atencao: 'um pouco atrás', atras: 'atrás do ritmo' };
  function barra(pct, est) { return `<div class="barra-prog" role="presentation"><i style="width:${Math.round(Math.min(1, pct) * 100)}%;background:${COR[est]}"></i></div>`; }
  function diasRestam(per, hoje) { const d = Math.ceil((ms(per.ate) - ms(hoje)) / 864e5); return d > 0 ? d : 0; }

  // ---------- bloco do Início ----------
  // opts: {doc, eq, videos, hoje}
  function bloco(o) {
    const doc = o.doc, hoje = o.hoje;
    if (!doc || doc.sem_meta) return '';
    const per = doc.periodo || {}, L = linhas(doc, hoje), det = doc.detalhe || {};
    const cab = `<div class="linha" style="justify-content:space-between;align-items:baseline"><h2 style="margin:0">🎯 Minhas metas</h2><span class="peq mut">${esc(per.rot || '')} · desde ${esc(dBR(per.de))} · faltam ${diasRestam(per, hoje)} dias</span></div>`;
    if (!L.length) return `<div class="painel">${cab}<p class="mut peq" style="margin:6px 0 0">Suas metas ainda não foram lançadas. Fale com a diretoria.</p></div>`;
    const lin = L.map((x) => `<div class="mt-lin">
        <div class="linha" style="justify-content:space-between;gap:6px"><span>${x.ic} ${esc(x.rot)}</span><b class="num">${fmt(x.k, x.real)} <span class="mut">/ ${fmt(x.k, x.meta)}</span></b></div>
        ${barra(x.pct, x.est)}
        <div class="peq mut">${x.est === 'feita' ? '✓ meta batida' : `${esc(TXT[x.est])} · hoje o esperado era ${fmt(x.k, x.k === 'vgv' ? x.esperado : Math.ceil(x.esperado))}`}${x.k === 'videos' ? videosNota(det) : ''}${x.k === 'agenciamentos' && Array.isArray(det.agenciamentos_refs) && det.agenciamentos_refs.length ? ` · <details class="mt-det"><summary>quais</summary>${det.agenciamentos_refs.map(esc).join(', ')}</details>` : ''}${x.k === 'vgv' && det.vgv_sem_valor ? ` · ${det.vgv_sem_valor} venda${det.vgv_sem_valor > 1 ? 's' : ''} fechada${det.vgv_sem_valor > 1 ? 's' : ''} sem valor no lead` : ''}</div>
        ${x.k === 'videos' ? `<div class="linha" style="gap:6px;margin-top:4px"><button class="b p" type="button" data-metavid="novo">+ Registrar vídeo ou story</button><button class="b" type="button" data-metavid="lista">Meus registros</button></div>` : ''}
      </div>`).join('');
    return `<div class="painel mt-bloco">${cab}<div class="mt-grade">${lin}</div>${placar(o.eq, doc.equipe)}
      <p class="peq mut" style="margin:6px 0 0">Agenciamentos contam pela base de imóveis (você como corretor e cadastro no período); visitas e fechamentos pelas etapas dos seus leads; VGV pelo valor das vendas fechadas. Atualiza sozinho.</p></div>`;
  }
  function videosNota(det) {
    const s = n0(det.videos_saldo), reg = n0(det.videos_registrados) || 0;
    if (s == null) return ` · ${reg} registrado${reg === 1 ? '' : 's'} · <button class="copiar" type="button" data-metavid="saldo">informar o que já fez antes</button>`;
    return ` · ${reg} registrado${reg === 1 ? '' : 's'} + ${num(s)} até o registro (${det.videos_saldo_estado === 'conferido' ? 'conferido pela diretoria' : 'declarado, a diretoria confere'})`;
  }
  // placar das equipes: só somas, sem os números de cada corretor
  function placar(eq, minha) {
    const E = eq && eq.equipes; if (!E || !Object.keys(E).length) return '';
    const ordem = ['norte', 'leste_sul'].filter((k) => E[k]);
    const cel = (e, k) => { const m = n0(e.metas && e.metas[k]), r = n0(e.realizado && e.realizado[k]) || 0; if (m == null) return '<td class="mut">—</td>'; const p = m > 0 ? r / m : 0;
      return `<td class="num" title="${esc(fmtTxt(k, r))} de ${esc(fmtTxt(k, m))}">${Math.round(p * 100)}%</td>`; };
    return `<details class="mt-placar"><summary><b>Placar das equipes</b> <span class="peq mut">· % da meta somada de cada equipe</span></summary>
      <div class="tabela"><table class="peq"><thead><tr><th></th>${ordem.map((k) => `<th>${esc(E[k].rot)}${k === minha ? ' (sua)' : ''}</th>`).join('')}</tr></thead>
      <tbody>${CAMPOS.map(([k, rot]) => `<tr><td>${esc(rot)}</td>${ordem.map((q) => cel(E[q], k)).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  }
  const fmtTxt = (k, v) => (k === 'vgv' ? reais(v) : num(v));

  // ---------- gaveta dos vídeos ----------
  // opts: {doc, videos (obj id->dados), modo: 'novo'|'lista'|'saldo', hoje}
  function gaveta(o) {
    const V = o.videos || {}, per = (o.doc && o.doc.periodo) || {}, det = (o.doc && o.doc.detalhe) || {}, hoje = o.hoje;
    const saldo = V._saldo, conferido = det.videos_saldo_estado === 'conferido';
    const regs = Object.entries(V).filter(([id, v]) => id[0] !== '_' && v && !v.removido).sort((a, b) => String(b[1].em || '').localeCompare(String(a[1].em || '')));
    const form = `<div class="painel sec" style="gap:10px"><h2>Registrar vídeo ou story</h2>
      <p class="peq mut" style="margin:0">Vale 1 cada story ou vídeo sobre imóvel ou sobre a Vivere. Marque <b>@vivere</b> na postagem: quando o Instagram da Vivere estiver ligado ao sistema, as marcações vão contar sozinhas.</p>
      <div class="form">
        <label class="c">Data<input id="mvEm" type="date" value="${esc(hoje)}" min="${esc(per.de || '')}" max="${esc(hoje)}"></label>
        <label class="c">Tipo<select id="mvTipo"><option value="story">Story</option><option value="reels">Reels / vídeo no feed</option><option value="video">Vídeo em outro canal</option></select></label>
        <label class="c">Sobre<select id="mvSobre"><option value="imovel">Imóvel</option><option value="vivere">A Vivere</option></select></label>
        <label class="c">Imóvel (ref.)<input id="mvRef" type="text" placeholder="AP336" autocomplete="off"></label>
        <label class="c">Quantos (stories em sequência)<input id="mvQtd" type="number" min="1" max="20" value="1" inputmode="numeric"></label>
        <label class="c">Link (se tiver)<input id="mvLink" type="url" placeholder="https://www.instagram.com/…" autocomplete="off"></label>
      </div>
      <label class="linha peq" style="gap:6px"><input id="mvMarcou" type="checkbox" checked> Marquei @vivere</label>
      <div class="linha"><button class="b p" type="button" data-metavid="gravar">Registrar</button></div></div>`;
    const blSaldo = `<div class="painel sec" style="gap:8px"><h2>O que você já fez antes</h2>
      ${conferido ? `<p class="peq" style="margin:0">${num(det.videos_saldo)} vídeo${n0(det.videos_saldo) === 1 ? '' : 's'}/stories de ${esc(dBR(per.de))} até o início do registro, <b>conferido pela diretoria</b>.</p>`
        : `<p class="peq mut" style="margin:0">Quantos stories e vídeos sobre imóveis ou sobre a Vivere você fez desde ${esc(dBR(per.de))} até hoje, antes de registrar aqui? A diretoria confere.</p>
      <div class="linha"><input id="mvSaldo" type="number" min="0" max="500" inputmode="numeric" value="${esc(saldo && saldo.n != null ? saldo.n : '')}" style="max-width:120px" aria-label="Quantidade até hoje"><button class="b" type="button" data-metavid="gravarsaldo">${saldo ? 'Atualizar' : 'Informar'}</button></div>
      ${saldo ? `<p class="peq mut" style="margin:0">Informado em ${esc(dBR(saldo.em))}: ${num(saldo.n)} (aguardando a diretoria).</p>` : ''}`}</div>`;
    const lista = `<div class="painel sec" style="gap:6px"><h2>Meus registros (${regs.length})</h2>
      ${regs.length ? `<div class="tabela"><table class="peq"><thead><tr><th>Data</th><th>Tipo</th><th>Sobre</th><th>Qtd.</th><th></th></tr></thead><tbody>${regs.map(([id, v]) =>
        `<tr><td>${esc(dBR(v.em))}</td><td>${esc({ story: 'Story', reels: 'Reels', video: 'Vídeo' }[v.tipo] || v.tipo || '')}${v.marcou_vivere ? ' · @vivere' : ''}</td><td>${esc(v.sobre === 'vivere' ? 'Vivere' : v.ref || 'imóvel')}${v.link ? ` · <a href="${esc(/^https:\/\//.test(v.link) ? v.link : '#')}" target="_blank" rel="noopener">link</a>` : ''}</td><td class="num">${num(v.qtd || 1)}</td><td><button class="copiar" type="button" data-metavid="remover" data-id="${esc(id)}">tirar</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="mut peq" style="margin:0">Nenhum registro ainda.</p>'}</div>`;
    const ordem = o.modo === 'lista' ? [lista, form, blSaldo] : o.modo === 'saldo' ? [blSaldo, form, lista] : [form, blSaldo, lista];
    return `<div class="gaveta" role="dialog" aria-modal="true" aria-label="Vídeos e stories da meta">
      <div class="cab"><div><p class="mut peq" style="margin:0">Minhas metas · ${esc(per.rot || '')}</p><h3>🎬 Vídeos e stories</h3></div><button class="b" type="button" data-fechar>Fechar</button></div>
      ${ordem.join('')}</div>`;
  }
  // lê o formulário e devolve o registro (ou {erro})
  function lerForm(hoje, per) {
    const v = (id) => (document.getElementById(id) || {}).value || '';
    const em = v('mvEm') || hoje, qtd = Math.max(1, Math.min(20, parseInt(v('mvQtd'), 10) || 1)), link = v('mvLink').trim();
    if (per && per.de && em < per.de) return { erro: 'A data é anterior ao início da meta.' };
    if (em > hoje) return { erro: 'A data não pode ser futura.' };
    if (link && !/^https:\/\/\S+$/.test(link)) return { erro: 'O link precisa começar com https://' };
    const ref = v('mvRef').trim().toUpperCase().slice(0, 20), sobre = v('mvSobre') === 'vivere' ? 'vivere' : 'imovel';
    return { em, tipo: ['story', 'reels', 'video'].includes(v('mvTipo')) ? v('mvTipo') : 'story', sobre, ref: sobre === 'imovel' ? ref : '', qtd, link: link.slice(0, 500),
      marcou_vivere: !!(document.getElementById('mvMarcou') || {}).checked, origem: 'app', criado_em: new Date().toISOString().slice(0, 19) };
  }
  // trocas-inicio-espaco (23/11/2026): o mesmo conteúdo em 2 cards grandes (Negócios e Atividade), para o Início
  const GRUPOS2 = [['Negócios', 'vendas, locações e VGV', ['fech_venda', 'fech_loc', 'vgv']], ['Atividade', 'agenciamentos, visitas e vídeos', ['agenciamentos', 'visitas', 'videos']]];
  function blocoDuplo(o) {
    const doc = o.doc; if (!doc || doc.sem_meta) return '';
    const um = bloco(o); if (!um || um.indexOf('mt-grade') < 0) return um;
    const per = doc.periodo || {}, L = linhas(doc, o.hoje);
    const tmp = document.createElement('div'); tmp.innerHTML = um;
    const lins = [...tmp.querySelectorAll('.mt-grade > .mt-lin')], plac = tmp.querySelector('.mt-placar'), nota = tmp.querySelector('.mt-bloco > p.peq');
    const porK = {}; L.forEach((x, i) => { if (lins[i]) porK[x.k] = lins[i].outerHTML; });
    const cards = GRUPOS2.map(([t, sub, ks]) => { const h = ks.map((k) => porK[k] || '').join(''); return h ? `<div class="painel mt-card"><h3>${t}<small>${sub}</small></h3><div class="mt-grade">${h}</div></div>` : ''; }).join('');
    return `<div class="mt-duplo"><h2 class="mt-duplo-cab">🎯 Minhas metas <small>${esc(per.rot || '')} · faltam ${diasRestam(per, o.hoje)} dias</small></h2>
      <div class="mt-cards">${cards}</div>${plac ? plac.outerHTML : ''}${nota ? nota.outerHTML : ''}</div>`;
  }
  window.MetasCRM = { VERSAO, CAMPOS, linhas, bloco, blocoDuplo, gaveta, lerForm, fracao };
})();
