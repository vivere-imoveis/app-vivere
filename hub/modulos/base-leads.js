// modulos/base-leads.js — aba "Base de leads" (CRM) no HUB Vivere (construção "base-leads", 20/11/2026)
// Pedido do Cleiton (20/11/2026): nenhum corretor exclui lead; quem larga o lead arquiva, e o lead volta à diretoria como arquivado,
// que pode redistribuir; tudo sedimenta uma base por pessoa para follow-up, revisitação e remarketing.
// • Lê: base_leads (um doc por pessoa = telefone; gravado pelo banco, privado.base_pessoa_recalc): situação, interesse, painéis,
//   leads_detalhe (um item por lead de painel), eventos (últimos 40), nao_contatar, revisitar_em. site_leads/_resumo para os corretores.
// • Grava: só nao_contatar, nao_contatar_motivo, revisitar_em e acao {tipo: redistribuir|reativar, painel, doc_id, corretor, obs, por}.
//   O gatilho privado.base_hub_acao aplica (lead_redistribuir / desarquiva), recalcula e devolve o doc (com "erro" se falhar).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc;
  const ID = 'base-leads', C = 'base_leads';
  const SIT = { ativo: ['Ativo', 'ok'], arquivado: ['Arquivado', 'warn'], a_classificar: ['A classificar', 'info'], descartado: ['Descartado', 'info'], sem_lead: ['Sem lead', 'info'] };
  const INT = { comprador: 'Procura comprar', vendedor: 'Tem para vender', comprador_vendedor: 'Vende e compra', locatario_anual: 'Procura alugar', locatario_temporada: 'Procura temporada', locador_anual: 'Tem para alugar', locador_temporada: 'Tem para temporada', a_definir: 'A definir' };
  const EV = { entrada: 'Entrada', atendimento: 'Atendimento', etapa: 'Etapa', interesse: 'Interesse', arquivado: 'Arquivado', desarquivado: 'Reativado', descartado: 'Descartado', distribuido: 'Distribuído', nao_contatar: 'Não contatar', contato_liberado: 'Contato liberado' };
  const st = { filtro: '', int: '', painel: '', rev: '', q: '', abre: '', modo: '', alvo: '', pg: 0, pp: 50, salvando: false, falha: null };
  try { const v = +localStorage.getItem('hubv.bl.pp'); if (v === 50 || v === 100) st.pp = v; } catch (_) {}
  const n = (v) => Number(v || 0).toLocaleString('pt-BR');
  const dataBR = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : '—'; };
  const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const todos = () => H.lista(C).sort((a, b) => String(b.ultimo_evento_em || '').localeCompare(String(a.ultimo_evento_em || '')));
  const corretores = () => (((H.S.site_leads || {})._resumo || {}).corretores || []).slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const det = (x) => Array.isArray(x.leads_detalhe) ? x.leads_detalhe : [];
  const arqPend = (x) => det(x).filter((l) => l.arquivado && !l.redistribuido_para);
  const nArq = () => todos().filter((x) => arqPend(x).length && x.situacao === 'arquivado').length;
  const telFmt = (t) => { const s = String(t || ''); if (s.startsWith('+')) return s; const d = s.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : s; };
  const waNum = (t) => { const s = String(t || ''), d = s.replace(/\D/g, ''); if (!d) return ''; return s.startsWith('+') ? d : (d.length <= 11 ? '55' + d : d); };
  const nomeCor = (l) => l.corretor_nome || l.painel || '—';

  function kpis(L) {
    const c = (k) => L.filter((x) => x.situacao === k).length;
    const vencidos = L.filter((x) => x.revisitar_em && x.revisitar_em <= hoje() && !x.nao_contatar).length;
    const cx = (rot, num, sub, cor) => `<div class="card"><div class="s">${rot}</div><div class="num"${cor ? ` style="color:var(--${cor})"` : ''}>${num}</div><div class="s">${sub}</div></div>`;
    return `<div class="resumo-cob">
      ${cx('Pessoas na base', n(L.length), `${n(c('ativo'))} com corretor · ${n(c('a_classificar'))} a classificar`, '')}
      ${cx('Arquivados', n(c('arquivado')), c('arquivado') ? 'voltaram à diretoria: redistribua ou reative' : 'nenhum lead arquivado', c('arquivado') ? 'warn' : 'ok')}
      ${cx('Revisitar', n(vencidos), 'com data de revisita vencida', vencidos ? 'warn' : '')}
      ${cx('Não contatar', n(L.filter((x) => x.nao_contatar).length), 'fora de follow-up e remarketing', '')}
    </div>`;
  }

  function filtrar(L0) {
    const q = st.q.toLowerCase().trim(), qd = q.replace(/\D/g, ''), h = hoje();
    return L0.filter((x) => {
      if (st.filtro === 'nao_contatar' ? !x.nao_contatar : st.filtro && x.situacao !== st.filtro) return false;
      if (st.int && (x.interesse || 'a_definir') !== st.int) return false;
      if (st.painel && !(x.paineis || []).includes(st.painel)) return false;
      if (st.rev === 'vencido' && !(x.revisitar_em && x.revisitar_em <= h)) return false;
      if (st.rev === 'marcado' && !x.revisitar_em) return false;
      if (q && !([x.nome, ...det(x).map((l) => [l.campanha, l.corretor_nome, l.arquivado_motivo].join(' '))].join(' ').toLowerCase().includes(q) || (qd.length >= 4 && String(x.telefone || x._id).replace(/\D/g, '').includes(qd)))) return false;
      return true;
    });
  }

  function pillsLeads(x) {
    return det(x).map((l) => `<span class="pill ${l.arquivado ? (l.redistribuido_para ? 'info' : 'warn') : 'ok'}" title="${esc([l.campanha, l.origem].filter(Boolean).join(' · '))}">${esc(nomeCor(l))} · ${esc(l.arquivado ? (l.redistribuido_para ? 'redistribuído' : 'arquivado') : (l.etapa || 'Novo'))}</span>`).join(' ') || '<span class="s">sem corretor</span>';
  }

  function linha(x) {
    const s = SIT[x.situacao] || [x.situacao || '—', ''];
    const tel = telFmt(x.telefone), wa = waNum(x.telefone);
    const ult = (x.eventos || [])[0];
    const aberto = st.abre === x._id;
    return `<tr id="bl-${esc(x._id)}">
      <td><b>${esc(x.nome || '(sem nome)')}</b><span class="s" data-sens>${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener">${esc(tel)}</a>` : esc(tel || '—')}${x.nao_contatar ? ' · <span class="pill bad">não contatar</span>' : ''}</span></td>
      <td>${esc(INT[x.interesse] || x.interesse || 'A definir')}<span class="s"><span class="pill ${s[1]}">${esc(s[0])}</span></span></td>
      <td class="ta-larga">${pillsLeads(x)}</td>
      <td>${ult ? `${dataBR(ult.em)}<span class="s">${esc(EV[ult.tipo] || ult.tipo)}${ult.painel ? ' · ' + esc(ult.painel) : ''}</span>` : '—'}</td>
      <td>${x.revisitar_em ? `<span class="${x.revisitar_em <= hoje() ? 'pill warn' : ''}">${dataBR(x.revisitar_em)}</span>` : '—'}</td>
      <td class="ta-acoes"><div class="filtros" style="margin:0"><button class="btn" data-bl-abre="${esc(x._id)}" aria-expanded="${aberto}">${aberto ? 'Fechar' : 'Abrir'}</button></div></td></tr>
      ${aberto ? `<tr class="bl-det"><td colspan="6">${detalhe(x)}</td></tr>` : ''}`;
  }

  function seletor(l) {
    const cs = corretores().filter((c) => c.id !== l.corretor_id);
    return `<select data-bl-cor="1" aria-label="Novo corretor"><option value="">Escolha o corretor</option>${cs.map((c) => `<option value="${esc(c.id)}">${esc(c.nome)}${c.papel === 'diretoria' ? ' (diretoria)' : ''}</option>`).join('')}</select>`;
  }

  function detalhe(x) {
    const id = esc(x._id);
    const leads = det(x).map((l, i) => {
      const alvo = st.alvo === String(i);
      let acoes = '';
      if (l.arquivado && !l.redistribuido_para) {
        acoes = alvo && st.modo === 'redistribuir'
          ? `<div class="filtros" style="margin:4px 0 0">${seletor(l)}<input type="text" data-bl-obs="1" maxlength="200" placeholder="Observação ao corretor (opcional)" aria-label="Observação"><button class="btn" data-bl-redok="${i}">Redistribuir</button><button class="btn" data-bl-cancela="1">Cancelar</button></div>`
          : `<div class="filtros" style="margin:4px 0 0"><button class="btn" data-bl-red="${i}">Redistribuir</button><button class="btn" data-bl-reat="${i}">Reativar com ${esc(nomeCor(l))}</button></div>`;
      }
      return `<div class="bl-lead" style="display:block;position:static;margin:6px 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px"><b>${esc(nomeCor(l))}</b> · ${esc(l.etapa || 'Novo')}${l.campanha ? ' · ' + esc(l.campanha) : ''}${l.entrada ? ' · entrada ' + dataBR(l.entrada) : ''}
        ${l.arquivado ? `<span class="s">Arquivado ${l.arquivado_por === 'corretor' ? 'pelo corretor' : 'pela diretoria'}${l.arquivado_em ? ' em ' + dataBR(l.arquivado_em) : ''}${l.arquivado_motivo ? ' · ' + esc(l.arquivado_motivo) : ''}${l.redistribuido_para ? ' · redistribuído para ' + esc(l.redistribuido_para) : ''}</span>` : ''}
        ${l.redistribuido_de ? `<span class="s">Veio de ${esc(l.redistribuido_de)} (redistribuído)</span>` : ''}${acoes}</div>`;
    }).join('') || '<p class="s">Sem lead em painel de corretor (está em Leads a classificar ou foi descartado).</p>';
    const fu = `<div class="filtros" style="margin:8px 0"><label><input type="checkbox" data-bl-nc="1"${x.nao_contatar ? ' checked' : ''}> Não contatar</label>
      <input type="text" data-bl-ncm="1" maxlength="200" value="${esc(x.nao_contatar_motivo || '')}" placeholder="Motivo (ex.: pediu para não ligar)" aria-label="Motivo do não contatar">
      <span class="s">Revisitar em</span><input type="date" data-bl-rev="1" value="${esc(x.revisitar_em || '')}" aria-label="Revisitar em">
      <button class="btn" data-bl-fu="${id}">Salvar follow-up</button></div>`;
    const evs = (x.eventos || []).map((e) => `<div class="i"><span class="s">${dataBR(e.em)} · ${esc(EV[e.tipo] || e.tipo)}${e.painel ? ' · ' + esc(e.painel) : ''}${e.por && e.por !== e.painel ? ' · por ' + esc(e.por) : ''}</span>${esc([e.canal, e.etapa, e.motivo, e.texto].filter(Boolean).join(' · ') || '—')}</div>`).join('');
    const aviso = (x.erro ? `<span class="pill bad">${esc(x.erro)}</span>` : '') + (st.salvando ? '<span class="s">Gravando…</span>' : '') + (st.falha ? `<span class="pill bad">${esc(st.falha)}</span>` : '');
    return `<div style="display:grid;gap:8px">${aviso}<div><b>Leads com corretores</b>${leads}</div><div><b>Follow-up</b>${fu}</div>
      <details${(x.eventos || []).length <= 6 ? ' open' : ''}><summary>Linha do tempo (${n(x.eventos_total || (x.eventos || []).length)} registros${(x.eventos_total || 0) > 40 ? ', últimos 40' : ''})</summary><div class="hist" style="margin-top:6px">${evs}</div></details></div>`;
  }

  function tabela(L0) {
    const cont = {}; L0.forEach((x) => { cont[x.situacao] = (cont[x.situacao] || 0) + 1; });
    const ints = Object.keys(INT).filter((k) => L0.some((x) => (x.interesse || 'a_definir') === k));
    const pains = [...new Set(L0.flatMap((x) => det(x).map((l) => l.painel + '|' + nomeCor(l))))].sort((a, b) => a.split('|')[1].localeCompare(b.split('|')[1], 'pt-BR'));
    const L = filtrar(L0);
    const PP = st.pp, nPg = Math.max(1, Math.ceil(L.length / PP)); if (st.pg >= nPg) st.pg = nPg - 1;
    const pg = L.slice(st.pg * PP, (st.pg + 1) * PP);
    const chips = `<div class="filtros"><span class="s">Situação:</span>${[['', 'Todos', L0.length], ['arquivado', 'Arquivados', cont.arquivado], ['ativo', 'Com corretor', cont.ativo], ['a_classificar', 'A classificar', cont.a_classificar], ['descartado', 'Descartados', cont.descartado], ['nao_contatar', 'Não contatar', L0.filter((x) => x.nao_contatar).length]].map(([k, r, c]) => `<button class="btn" data-bl-filtro="${k}" aria-pressed="${st.filtro === k}">${r} (${n(c || 0)})</button>`).join('')}</div>
      <div class="filtros"><span class="s">Interesse:</span><select data-bl-int="1" aria-label="Interesse"><option value="">Todos</option>${ints.map((k) => `<option value="${k}"${st.int === k ? ' selected' : ''}>${esc(INT[k])}</option>`).join('')}</select>
      <span class="s">Corretor:</span><select data-bl-pai="1" aria-label="Corretor"><option value="">Todos</option>${pains.map((p) => { const [k, nm] = p.split('|'); return `<option value="${esc(k)}"${st.painel === k ? ' selected' : ''}>${esc(nm)}</option>`; }).join('')}</select>
      <span class="s">Revisita:</span><select data-bl-revf="1" aria-label="Revisita"><option value="">Todas</option><option value="vencido"${st.rev === 'vencido' ? ' selected' : ''}>Vencidas</option><option value="marcado"${st.rev === 'marcado' ? ' selected' : ''}>Com data</option></select>
      <input type="search" data-bl-q="1" value="${esc(st.q)}" placeholder="Nome, telefone, campanha, motivo…" aria-label="Buscar na base de leads"></div>`;
    const pag = L.length > 50 ? `<div class="filtros pag"><span class="s">${n(st.pg * PP + 1)}–${n(Math.min(L.length, (st.pg + 1) * PP))} de ${n(L.length)}</span><button class="btn" data-bl-pg="-1"${st.pg ? '' : ' disabled'}>‹ Anterior</button><button class="btn" data-bl-pg="1"${st.pg < nPg - 1 ? '' : ' disabled'}>Próxima ›</button><span class="s">Por página:</span><select data-bl-pp="1" aria-label="Por página"><option${PP === 50 ? ' selected' : ''}>50</option><option${PP === 100 ? ' selected' : ''}>100</option></select></div>` : '';
    if (!L.length) return chips + H.vazio(H.carregado[C] ? 'Nenhuma pessoa neste filtro.' : 'Carregando a base…');
    return chips + pag + `<div class="tabela"><table><thead><tr><th>Pessoa</th><th>Interesse e situação</th><th>Corretores</th><th>Última atividade</th><th>Revisitar</th><th>Ação</th></tr></thead><tbody>${pg.map(linha).join('')}</tbody></table></div>` + pag;
  }

  function render() {
    const L0 = todos();
    const topo = '<h2>Base de leads</h2><p class="nota">Cada pessoa uma vez só (pelo telefone), com todos os leads dela nos painéis, nos leads a classificar e nas listas, e a linha do tempo de atendimentos: quem atendeu, quando e como. <b>Nenhum lead se apaga</b>: quando o corretor larga o lead, ele arquiva com motivo; o lead continua no painel dele, em Arquivados, e volta aqui. A diretoria <b>redistribui</b> (o lead entra no painel do novo corretor com o histórico inteiro) ou <b>reativa</b> com o mesmo corretor. "Não contatar" e "Revisitar em" preparam o follow-up e o remarketing.</p>';
    return topo + kpis(L0) + tabela(L0);
  }

  const quem = () => { try { return (H.usuario && (H.usuario.nome || H.usuario.email)) || 'Diretoria (HUB)'; } catch (_) { return 'Diretoria (HUB)'; } };
  async function grava(id, campos) {
    const DB = H.db(); const x = (H.S[C] || {})[id]; if (!DB || !x) return;
    st.salvando = true; st.falha = null; H.pede();
    const doc = Object.assign({}, x, campos); delete doc._id; delete doc.erro;
    try { await DB.doc(C + '/' + id).set(doc); st.modo = ''; st.alvo = ''; }
    catch (e) { st.falha = 'Não consegui gravar (' + ((e && e.code) || 'erro') + '). Tente de novo.'; }
    st.salvando = false; H.pede();
  }
  const campo = (sel) => { const r = document.querySelector(`#bl-${CSS.escape(st.abre)} + tr.bl-det ${sel}`); return r; };

  document.addEventListener('change', (e) => {
    const t = e.target; if (!t || !t.dataset) return;
    if (t.dataset.blInt !== undefined) { st.int = t.value; st.pg = 0; H.pede(); }
    else if (t.dataset.blPai !== undefined) { st.painel = t.value; st.pg = 0; H.pede(); }
    else if (t.dataset.blRevf !== undefined) { st.rev = t.value; st.pg = 0; H.pede(); }
    else if (t.dataset.blPp !== undefined) { st.pp = +t.value === 100 ? 100 : 50; st.pg = 0; try { localStorage.setItem('hubv.bl.pp', String(st.pp)); } catch (_) {} H.pede(); }
  });
  let qT = null;
  document.addEventListener('input', (e) => {
    const t = e.target; if (!t || !t.dataset || t.dataset.blQ === undefined) return;
    clearTimeout(qT); qT = setTimeout(() => { st.q = t.value; st.pg = 0; H.pede();
      setTimeout(() => { const i = document.querySelector('[data-bl-q]'); if (i) { i.focus(); const v = i.value; i.setSelectionRange(v.length, v.length); } }, 30); }, 300);
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-bl-filtro],[data-bl-abre],[data-bl-red],[data-bl-redok],[data-bl-reat],[data-bl-cancela],[data-bl-fu],[data-bl-pg]');
    if (!t) return;
    const d = t.dataset;
    if (d.blFiltro !== undefined) { st.filtro = d.blFiltro; st.pg = 0; H.pede(); return; }
    if (d.blPg) { st.pg = Math.max(0, st.pg + (+d.blPg)); H.pede(); return; }
    if (d.blAbre) { st.abre = st.abre === d.blAbre ? '' : d.blAbre; st.modo = ''; st.alvo = ''; st.falha = null; H.pede(); return; }
    if (d.blCancela) { st.modo = ''; st.alvo = ''; H.pede(); return; }
    const x = (H.S[C] || {})[st.abre]; if (!x) return;
    if (d.blRed !== undefined) { st.modo = 'redistribuir'; st.alvo = d.blRed; H.pede(); return; }
    if (d.blRedok !== undefined) {
      const l = det(x)[+d.blRedok]; const sel = campo('[data-bl-cor]'); const cor = sel && sel.value; if (!l) return;
      if (!cor) { if (sel) sel.focus(); return; }
      const obs = ((campo('[data-bl-obs]') || {}).value || '').trim();
      grava(st.abre, { acao: { tipo: 'redistribuir', painel: l.painel, doc_id: l.doc_id, corretor: cor, obs, por: quem() } }); return;
    }
    if (d.blReat !== undefined) {
      const l = det(x)[+d.blReat]; if (!l) return;
      if (!t.dataset.confirma) { t.dataset.confirma = '1'; t.textContent = 'Toque de novo para reativar'; return; }
      grava(st.abre, { acao: { tipo: 'reativar', painel: l.painel, doc_id: l.doc_id, por: quem() } }); return;
    }
    if (d.blFu) {
      const nc = !!(campo('[data-bl-nc]') || {}).checked, ncm = ((campo('[data-bl-ncm]') || {}).value || '').trim(), rev = (campo('[data-bl-rev]') || {}).value || '';
      if (nc && !ncm) { const i = campo('[data-bl-ncm]'); if (i) i.focus(); st.falha = 'Informe o motivo do "não contatar".'; H.pede(); return; }
      grava(st.abre, { nao_contatar: nc, nao_contatar_motivo: nc ? ncm : '', revisitar_em: rev, acao: { tipo: 'follow_up', por: quem() } });
    }
  });

  H.registrar({
    id: ID, aba: 'Base de leads', grupo: 'crm', depois: 'leads-a-classificar', colecoes: [C, 'site_leads'], render,
    dicaBusca: 'Buscar na base de leads: nome, telefone, campanha ou motivo…',
    contador: () => nArq(),
    foco(alvo) { const x = (H.S[C] || {})[String(alvo || '')]; if (x) { st.filtro = ''; st.int = ''; st.painel = ''; st.rev = ''; st.q = ''; st.pg = 0; st.abre = x._id; } },
    busca(q) {
      const t = String(q || '').toLowerCase().trim(); if (!t) return [];
      const td = t.replace(/\D/g, '');
      return todos().filter((x) => String(x.nome || '').toLowerCase().includes(t) || (td.length >= 4 && String(x.telefone || x._id).replace(/\D/g, '').includes(td))).slice(0, 12)
        .map((x) => ({ grp: 'Base de leads', tit: x.nome || '(sem nome)', sub: `${(SIT[x.situacao] || [''])[0]} · ${INT[x.interesse] || 'A definir'}`, ir: { aba: ID, linha: 'bl-' + x._id, alvo: x._id } }));
    },
  });
})();
