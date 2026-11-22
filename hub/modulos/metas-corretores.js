// modulos/metas-corretores.js — aba "Metas dos corretores" (CRM) no HUB Vivere (construção "metas-corretores", fatia 7 da
// ampliacao-crm-corretores, 17/11/2026). Contrato: _hub\modulos\LEIA-ME.md.
// Decisões do Cleiton (cartões de 17/11/2026): as metas que cada corretor propôs nas reuniões de 16 e 20/10 (até 31/12/2026)
// vêm para a base; o realizado é automático (agenciamentos pela base de imóveis, visitas e fechamentos pelas etapas do CRM, VGV
// pelo valor das vendas fechadas) e os vídeos vêm do registro do corretor no app + saldo declarado, que a diretoria confere aqui.
// No app o corretor vê a meta dele e o placar das equipes sem os colegas; aqui a diretoria vê todos e edita as metas.
// O artefato METAS DOS CORRETORES vira histórico. Instagram: regra @vivere; a conexão é a tarefa vis-instagram-api-mencoes.
// • Lê: metas_corretores (doc por painel + _config) e metas_placar (doc por painel + _equipes, gravado só pelo banco,
//   privado.metas_rodar, que roda sozinho quando muda lead, vídeo, imóvel ou meta).
// • Grava: metas_corretores/<painel> (documento inteiro, set): metas, período, equipe, status e videos_saldo (conferência).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc;
  const ID = 'metas-corretores', CM = 'metas_corretores', CP = 'metas_placar';
  const CAMPOS = [['agenciamentos', 'Agenciamentos'], ['visitas', 'Visitas'], ['videos', 'Vídeos e stories'], ['fech_venda', 'Fech. venda'], ['fech_loc', 'Fech. locação'], ['vgv', 'VGV']];
  const EQ = { norte: 'Norte (Jurerê)', leste_sul: 'Leste/Sul (Porto da Lagoa)' };
  const st = { equipe: '', edita: '', salvando: false, falha: null };
  const n0 = (v) => { if (v == null || v === '') return null; const n = Number(String(v).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; };
  const num = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));
  const reais = (v) => { v = Number(v) || 0; return v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  const fmt = (k, v) => (k === 'vgv' ? `<span class="sens">${reais(v)}</span>` : num(v));
  const dt = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; };
  const ms = (s) => Date.parse(String(s).slice(0, 10) + 'T12:00');
  const fracao = (per) => { const a = ms(per.de), b = ms(per.ate), h = ms(H.hojeISO()); if (!isFinite(a) || !isFinite(b) || b <= a) return 1; return Math.max(0, Math.min(1, (h - a) / (b - a))); };
  const metas = () => H.lista(CM).filter((x) => !String(x._id).startsWith('_') && !x.removido_em).sort((a, b) => String(a.equipe || '').localeCompare(String(b.equipe || '')) || String(a.nome || a._id).localeCompare(String(b.nome || b._id), 'pt-BR'));
  const placar = (id) => (H.S[CP] || {})[id] || null;
  const quem = () => { try { return (H.usuario && (H.usuario.nome || H.usuario.email)) || 'Diretoria (HUB)'; } catch (_) { return 'Diretoria (HUB)'; } };

  function cel(k, meta, real, per) {
    if (meta == null) return '<td class="n s">—</td>';
    const esp = meta * fracao(per), p = meta > 0 ? real / meta : 1;
    const cor = real >= meta ? 'ok' : real + 1e-9 >= esp ? 'ok' : real >= esp * 0.6 ? 'warn' : 'bad';
    return `<td class="n" title="esperado hoje: ${esc(k === 'vgv' ? reais(esp) : Math.ceil(esp))}"><b style="color:var(--${cor === 'ok' ? 'ok' : cor === 'warn' ? 'warn' : 'bad'})">${fmt(k, real)}</b><span class="s"> / ${fmt(k, meta)} · ${Math.round(p * 100)}%</span></td>`;
  }

  function equipes() {
    const E = ((H.S[CP] || {})._equipes || {}).equipes || {};
    const ks = ['norte', 'leste_sul'].filter((k) => E[k]); if (!ks.length) return '';
    return `<div class="grade" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin:0 0 12px">${ks.map((k) => {
      const e = E[k]; return `<div class="card"><div class="s">${esc(e.rot)} · ${e.corretores} corretor${e.corretores === 1 ? '' : 'es'} com meta</div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:6px">${CAMPOS.map(([c, r]) => { const m = n0((e.metas || {})[c]), v = n0((e.realizado || {})[c]) || 0;
          return `<div><div class="s">${esc(r)}</div><b>${m ? Math.round(v / m * 100) + '%' : '—'}</b><div class="s">${fmt(c, v)} / ${fmt(c, m)}</div></div>`; }).join('')}</div></div>`; }).join('')}</div>`;
  }

  function linhaEdicao(x) {
    const M = x.metas || {}, s = x.videos_saldo || {}, P = placar(x._id) || {}, det = P.detalhe || {};
    const inp = (nome, v, w, tipo) => `<input name="${nome}" type="${tipo || 'text'}" inputmode="${tipo === 'date' ? '' : 'decimal'}" value="${esc(v == null ? '' : v)}" style="width:${w || '90px'};font:inherit;padding:5px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink)">`;
    const decl = det.videos_saldo_estado === 'declarado' ? `<div class="s">Declarado pelo corretor: <b>${num(det.videos_saldo)}</b> (aguardando conferência)</div>` : '';
    return `<tr><td colspan="9"><form data-mt-form="${esc(x._id)}" class="card" style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:4px 0">
      ${CAMPOS.map(([k, r]) => `<label class="s" style="display:flex;flex-direction:column;gap:2px">${esc(r)}${k === 'vgv' ? ' (R$)' : ''}${inp(k, M[k], k === 'vgv' ? '130px' : '80px')}</label>`).join('')}
      <label class="s" style="display:flex;flex-direction:column;gap:2px">Equipe<select name="equipe" style="font:inherit;padding:5px">${Object.entries(EQ).map(([k, t]) => `<option value="${k}"${x.equipe === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label class="s" style="display:flex;flex-direction:column;gap:2px">Desde${inp('de', x.de, '150px', 'date')}</label>
      <label class="s" style="display:flex;flex-direction:column;gap:2px">Até${inp('ate', x.ate, '150px', 'date')}</label>
      <label class="s" style="display:flex;flex-direction:column;gap:2px">Situação<select name="status" style="font:inherit;padding:5px"><option value="ativo"${(x.status || 'ativo') === 'ativo' ? ' selected' : ''}>Ativa</option><option value="fora"${x.status === 'fora' ? ' selected' : ''}>Fora das metas</option></select></label>
      <label class="s" style="display:flex;flex-direction:column;gap:2px">Vídeos antes do registro (conferido)${inp('saldo', s.n, '90px')}</label>
      <div style="flex:1 1 200px">${decl}${s.n != null ? `<div class="s">Conferido por ${esc(s.por || '')} em ${dt(s.em)}</div>` : ''}</div>
      <span style="display:flex;gap:6px"><button class="btn" type="submit"${st.salvando ? ' disabled' : ''}>Salvar</button><button class="btn" type="button" data-mt-fecha>Cancelar</button></span>
      ${st.falha && st.falha.id === x._id ? `<div class="s" style="color:var(--bad);flex-basis:100%">${esc(st.falha.msg)}</div>` : ''}</form></td></tr>`;
  }

  function tabela() {
    const L = metas().filter((x) => !st.equipe || x.equipe === st.equipe);
    if (!L.length) return H.vazio(H.carregado[CM] ? 'Nenhum corretor com meta.' : 'Carregando…');
    const linhas = L.map((x) => {
      const P = placar(x._id) || {}, R = P.realizado || {}, M = x.metas || {}, per = { de: x.de, ate: x.ate }, det = P.detalhe || {};
      const pend = det.videos_saldo_estado === 'declarado' ? ' <span class="pill warn">saldo de vídeos a conferir</span>' : '';
      const fora = (x.status || 'ativo') !== 'ativo' ? ' <span class="pill info">fora</span>' : '';
      const semMeta = !Object.keys(M).some((k) => n0(M[k]) != null) ? ' <span class="pill warn">sem meta</span>' : '';
      const semId = det.sem_id_imobibrasil ? ' <span class="pill warn" title="Sem código do corretor no Imobibrasil: os agenciamentos não contam">sem código IB</span>' : '';
      return `<tr id="mt-${esc(x._id)}"><td><b>${esc(x.nome || x._id)}</b>${fora}${semMeta}${semId}${pend}<span class="s">${esc(EQ[x.equipe] || '—')} · ${dt(x.de)} a ${dt(x.ate)}</span></td>
        ${CAMPOS.map(([k]) => cel(k, n0(M[k]), n0(R[k]) || 0, per)).join('')}
        <td><button class="btn" type="button" data-mt-edita="${esc(x._id)}">Editar</button></td></tr>${st.edita === x._id ? linhaEdicao(x) : ''}`;
    }).join('');
    return `<div class="tabela"><table><thead><tr><th>Corretor</th>${CAMPOS.map(([, r]) => `<th class="n">${esc(r)}</th>`).join('')}<th></th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  function render() {
    const cfg = (H.S[CM] || {})._config || {};
    const nPend = metas().filter((x) => ((placar(x._id) || {}).detalhe || {}).videos_saldo_estado === 'declarado').length;
    return `<h2>Metas dos corretores</h2>
      <p class="nota">${esc(cfg.rot || 'Metas do período')}: as metas que cada corretor propôs nas reuniões de outubro. O realizado se atualiza sozinho: <b>agenciamentos</b> pela base de imóveis (corretor e data de cadastro no período), <b>visitas</b> e <b>fechamentos</b> pelas etapas dos leads no app, <b>VGV</b> pelo valor das vendas fechadas e <b>vídeos</b> pelo registro do corretor no app (story ou vídeo sobre imóvel ou sobre a Vivere, marcando @vivere) mais o saldo de antes do registro, que a diretoria confere aqui. Cor: verde no ritmo, amarelo um pouco atrás, vermelho atrás do esperado para hoje. No app, o corretor vê só a dele e o placar das equipes. A diretoria fica fora das metas.${nPend ? ` <b>${nPend} saldo${nPend > 1 ? 's' : ''} de vídeos a conferir.</b>` : ''}</p>
      ${equipes()}
      <div class="filtros" style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px">${[['', 'Todas'], ...Object.entries(EQ)].map(([k, t]) => `<button class="btn${st.equipe === k ? ' ativo' : ''}" type="button" data-mt-eq="${k}" aria-pressed="${st.equipe === k}">${esc(t)}</button>`).join('')}</div>
      ${tabela()}
      <p class="nota" style="margin-top:10px">Para incluir um corretor, ele precisa ter o app (painel). Metas de 2027: a diretoria define em dezembro e lança aqui, trocando o período.</p>`;
  }

  async function salvar(id, f) {
    const DB = H.db(); const x = (H.S[CM] || {})[id]; if (!DB || !x) return;
    const v = Object.fromEntries(new FormData(f).entries());
    const M = {}; for (const [k] of CAMPOS) { const n = n0(v[k]); if (v[k] !== '' && (n == null || n < 0)) { st.falha = { id, msg: 'Valor inválido em ' + k + '.' }; return H.pede(); } if (n != null) M[k] = n; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.de || '') || !/^\d{4}-\d{2}-\d{2}$/.test(v.ate || '') || v.ate < v.de) { st.falha = { id, msg: 'Confira as datas do período.' }; return H.pede(); }
    const doc = Object.assign({}, x, { metas: M, equipe: v.equipe, de: v.de, ate: v.ate, status: v.status || 'ativo', atualizado_em: new Date().toISOString().slice(0, 16), atualizado_por: quem() });
    const sn = n0(v.saldo);
    if (v.saldo === '' ) delete doc.videos_saldo;
    else if (sn == null || sn < 0) { st.falha = { id, msg: 'Saldo de vídeos inválido.' }; return H.pede(); }
    else if (!x.videos_saldo || n0(x.videos_saldo.n) !== sn) doc.videos_saldo = { n: sn, por: quem(), em: H.hojeISO() };
    delete doc._id;
    st.salvando = true; st.falha = null; H.pede();
    // documento inteiro (set): os docs nascem no Supabase; um update falharia no artefato (lição do site-leads, 16/11/2026)
    try { await DB.doc(CM + '/' + id).set(doc); st.edita = ''; } catch (e) { st.falha = { id, msg: 'Não consegui gravar (' + ((e && e.code) || 'erro') + '). Tente de novo.' }; }
    st.salvando = false; H.pede();
  }

  document.addEventListener('submit', (e) => { const f = e.target.closest && e.target.closest('form[data-mt-form]'); if (!f) return; e.preventDefault(); salvar(f.dataset.mtForm, f); });
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-mt-eq],[data-mt-edita],[data-mt-fecha]'); if (!t) return;
    const d = t.dataset;
    if (d.mtEq !== undefined) { st.equipe = d.mtEq; H.pede(); return; }
    if (d.mtEdita) { st.edita = st.edita === d.mtEdita ? '' : d.mtEdita; st.falha = null; H.pede(); return; }
    if (t.hasAttribute('data-mt-fecha')) { st.edita = ''; st.falha = null; H.pede(); }
  });

  H.registrar({
    id: ID, aba: 'Metas dos corretores', grupo: 'crm', depois: 'site-leads', colecoes: [CM, CP], render,
    dicaBusca: 'Buscar nas metas: nome do corretor…',
    contador: () => metas().filter((x) => ((placar(x._id) || {}).detalhe || {}).videos_saldo_estado === 'declarado').length,
    foco(alvo) { if (alvo) { st.edita = String(alvo); st.equipe = ''; } },
    busca(q) {
      const t = String(q || '').toLowerCase().trim(); if (!t) return [];
      return metas().filter((x) => String(x.nome || x._id).toLowerCase().includes(t)).slice(0, 8)
        .map((x) => ({ grp: 'Metas dos corretores', tit: x.nome || x._id, sub: EQ[x.equipe] || '', ir: { aba: ID, linha: 'mt-' + x._id, alvo: x._id } }));
    },
  });
})();
