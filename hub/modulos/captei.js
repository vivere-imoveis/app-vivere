// modulos/captei.js — aba "Captei" do CRM no HUB Vivere (construção "captei", 07/11/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Pedido do Cleiton (07/11/2026): cadastro completo de todas as pesquisas feitas no
// Captei (o plano atual não guarda o resultado e reabrir cobra Capcoin de novo), com data, quem pediu, imóvel,
// proprietário, telefones, e-mails e o PDF/print salvo no Drive — à vista no HUB da direção.
// • Lê: captei_consultas (do módulo), gravada pela skill captei-busca-proprietario a cada consulta.
// • Grava: só captei_consultas (botão "Marcar retorno enviado").
// • 11/11/2026 (pedido do Cleiton): coluna "Pedido" com o nº do pedido da Vivian (campo pedido_vivian; registros antigos: lido do canal).
// • Dados de terceiro (LGPD): telefones, e-mails, endereço e inscrição vão marcados com data-sens (botão 👁 do núcleo).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc;
  const ID = 'captei', CL = 'captei_consultas';
  const F = { q: '', sol: '', mes: '', aberto: '' };

  const dtHora = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] + 'h' + m[5] : ''}` : esc(s || '—'); };
  const mesDe = (x) => String(x.data_consulta || '').slice(0, 7);
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const nomeMes = (m) => { const [a, b] = String(m || '').split('-'); return b ? MESES[+b - 1] + '/' + a : '—'; };
  const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const dig = (t) => String(t || '').replace(/\D/g, '');
  const wa = (t) => { const d = dig(t); return d.length === 11 ? 'https://wa.me/55' + d : ''; };
  const prop = (x) => x.proprietario || {};
  const pedNo = (x) => { if (x.pedido_vivian != null && x.pedido_vivian !== '') return String(x.pedido_vivian); const m = String(x.canal || '').match(/pedido\s*n\s*[º°o.]?\s*(\d+)/i); return m ? m[1] : ''; };
  const pedTxt = (x) => { const n = pedNo(x); return n ? 'nº ' + n : ''; };
  const cons = () => H.lista(CL).sort((a, b) => String(b.data_consulta || '').localeCompare(String(a.data_consulta || '')));
  const RET = { pendente: ['Retorno pendente', 'warn'], enviado: ['Retorno enviado', 'ok'] };
  const pillRet = (s) => { const r = RET[s] || [s || '—', '']; return `<span class="pill ${r[1]}">${esc(r[0])}</span>`; };
  const imovelTxt = (x) => [x.endereco_resolvido, x.condominio, x.unidade ? 'unid. ' + x.unidade : ''].filter(Boolean).join(' · ');
  const texto = (x) => sem([imovelTxt(x), pedNo(x) ? 'pedido ' + pedNo(x) + ' n ' + pedNo(x) + ' nº ' + pedNo(x) : '', x.pedido_original, prop(x).nome, x.solicitante, x.aprovado_por, x.executado_por, x.inscricao_imobiliaria,
    (prop(x).telefones || []).join(' '), (prop(x).emails || []).join(' ')].join(' '));

  function filtra(L) {
    const q = sem(F.q).trim(), qd = dig(F.q);
    return L.filter((x) => (!F.sol || (x.solicitante || '') === F.sol) && (!F.mes || mesDe(x) === F.mes) &&
      (!q || texto(x).includes(q) || (qd.length >= 6 && (prop(x).telefones || []).some((t) => dig(t).includes(qd)))));
  }

  function kpis(L) {
    const mesAtual = H.hojeISO().slice(0, 7);
    const gasto = (A) => A.reduce((s, x) => s + (+x.capcoins_gastos || 0), 0);
    const noMes = L.filter((x) => mesDe(x) === mesAtual);
    const ult = L.find((x) => x.capcoins_saldo_apos != null);
    const pend = L.filter((x) => (x.status_retorno_corretor || 'pendente') === 'pendente').length;
    const k = (num, rot) => `<div class="kpi"><div class="num">${num}</div><div class="rot">${rot}</div></div>`;
    return `<div class="kpis">${k(L.length, 'Consultas gravadas')}${k(gasto(noMes), 'Capcoins em ' + nomeMes(mesAtual))}${k(ult ? ult.capcoins_saldo_apos : '—', 'Saldo na última consulta')}${k(pend, 'Retornos pendentes')}</div>`;
  }

  function porSolicitante(L) {
    const m = new Map();
    L.forEach((x) => { const s = x.solicitante || '—'; const a = m.get(s) || { n: 0, c: 0 }; a.n++; a.c += +x.capcoins_gastos || 0; m.set(s, a); });
    if (m.size < 2) return '';
    return `<details class="card" style="margin:0 0 12px"><summary class="s" style="cursor:pointer">Capcoins por solicitante</summary><div class="tabela"><table><thead><tr><th>Solicitante</th><th>Consultas</th><th>Capcoins</th></tr></thead><tbody>${
      [...m.entries()].sort((a, b) => b[1].c - a[1].c).map(([s, a]) => `<tr><td>${esc(s)}</td><td>${a.n}</td><td>${a.c}</td></tr>`).join('')}</tbody></table></div></details>`;
  }

  function filtros(L) {
    const sols = [...new Set(L.map((x) => x.solicitante).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
    const meses = [...new Set(L.map(mesDe).filter(Boolean))].sort().reverse();
    const op = (v, t, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
    return `<div class="filtros" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px">
      <select data-captei-sol style="font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px">${op('', 'Todos os solicitantes', !F.sol)}${sols.map((s) => op(s, s, F.sol === s)).join('')}</select>
      <select data-captei-mes style="font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px">${op('', 'Todos os meses', !F.mes)}${meses.map((m) => op(m, nomeMes(m), F.mes === m)).join('')}</select></div>`;
  }

  function ficha(x) {
    const p = prop(x), pdf = x.arquivo_pdf || {};
    const tels = (p.telefones || []).map((t) => { const w = wa(t); return `<div data-sens>${esc(t)}${w ? ` <a class="lk" href="${w}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</div>`; }).join('') || '—';
    const ems = (p.emails || []).map((e) => `<div data-sens><a class="lk" href="mailto:${esc(e)}">${esc(e)}</a></div>`).join('') || '—';
    const un = (x.unidades_do_endereco || []).map((u) => `<span class="pill ${u.consultada ? 'ok' : ''}" title="${u.consultada ? 'dados abertos' : 'só o primeiro nome (lista gratuita)'}">${esc(u.unidade)} · ${esc(u.primeiro_nome)}</span>`).join(' ');
    const lin = (r, v) => `<div style="display:grid;grid-template-columns:150px 1fr;gap:8px;padding:4px 0;border-bottom:1px solid var(--line)"><span class="s">${r}</span><span>${v}</span></div>`;
    const ret = (x.status_retorno_corretor || 'pendente') === 'pendente'
      ? `<button class="btn" type="button" data-captei-ret="${esc(x._id)}">Marcar retorno enviado</button>` : '';
    return `<div class="card" id="captei-f-${esc(x._id)}" style="margin:8px 0 14px">
      <h3 style="margin:0 0 8px">${esc(p.nome || 'Proprietário não localizado')}</h3>
      ${lin('Imóvel', `<span data-sens>${esc(imovelTxt(x))}</span>${H.mapa ? H.mapa('texto', null, x.endereco_resolvido || '') : ''}`)}
      ${lin('Inscrição imobiliária', `<span data-sens>${esc(x.inscricao_imobiliaria || '—')}</span>`)}
      ${lin('Idade · possível óbito', `${esc(p.idade != null ? p.idade + ' anos' : '—')} · ${esc(p.possivel_obito || '—')}`)}
      ${lin('Telefones', tels + (p.telefones && p.telefones.length && !p.telefones_validados_whatsapp ? '<div class="s">não validados no WhatsApp</div>' : ''))}
      ${lin('E-mails', ems)}
      ${lin('Pedido original', esc(x.pedido_original || '—') + (x.link_maps ? ` <a class="lk" href="${escUrl(x.link_maps)}" target="_blank" rel="noopener">mapa</a>` : ''))}
      ${lin('Pedido da Vivian', pedNo(x) ? `<span class="pill info">${esc(pedTxt(x))}</span>` : '<span class="s">sem nº (pedido direto)</span>')}
      ${lin('Pedido · aprovação', `${esc(x.solicitante || '—')} · aprovado por ${esc(x.aprovado_por || '—')} · ${esc(x.canal || '')}`)}
      ${lin('Execução', `${esc(x.executado_por || '—')} · conta ${esc(x.conta_captei || '—')}${x.busca_registrada_captei_id ? ' · busca nº ' + esc(x.busca_registrada_captei_id) : ''}`)}
      ${lin('Capcoins', `${+x.capcoins_gastos || 0} gasto(s) · saldo após: ${esc(x.capcoins_saldo_apos ?? '—')}`)}
      ${lin('Arquivo', pdf.url ? `<a class="lk" href="${escUrl(pdf.url)}" target="_blank" rel="noopener">${esc(pdf.nome || 'PDF')}</a> <span class="s">${esc(pdf.tipo || '')}</span>` : '<span class="pill warn">sem PDF</span>')}
      ${un ? lin('Unidades do endereço', `<div style="display:flex;flex-wrap:wrap;gap:4px">${un}</div>`) : ''}
      ${x.observacoes ? lin('Observações', esc(x.observacoes)) : ''}
      <div style="display:flex;gap:8px;align-items:center;margin-top:10px">${pillRet(x.status_retorno_corretor || 'pendente')} ${ret}</div></div>`;
  }

  function tabela(L) {
    if (!L.length) return H.vazio('Nenhuma consulta com esses filtros.');
    return `<div class="tabela"><table><thead><tr><th>Data</th><th>Pedido</th><th>Imóvel</th><th>Proprietário</th><th>Contatos</th><th>Solicitante</th><th>Capcoins</th><th>Retorno</th><th>PDF</th></tr></thead><tbody>${
      L.map((x) => { const p = prop(x), pdf = x.arquivo_pdf || {}, ab = F.aberto === x._id;
        return `<tr id="captei-${esc(x._id)}"><td>${dtHora(x.data_consulta)}</td>
          <td style="white-space:nowrap">${pedNo(x) ? `<span class="pill info">${esc(pedTxt(x))}</span>` : '<span class="s">direto</span>'}</td>
          <td><span data-sens>${esc(imovelTxt(x))}</span></td>
          <td><button class="lk" type="button" data-captei-abre="${esc(x._id)}" style="background:none;cursor:pointer;font:inherit">${esc(p.nome || '—')} ${ab ? '▴' : '▾'}</button></td>
          <td>${(p.telefones || []).length} tel. · ${(p.emails || []).length} e-mail</td>
          <td>${esc(x.solicitante || '—')}</td><td>${+x.capcoins_gastos || 0}</td>
          <td>${pillRet(x.status_retorno_corretor || 'pendente')}</td>
          <td>${pdf.url ? `<a class="lk" href="${escUrl(pdf.url)}" target="_blank" rel="noopener">abrir</a>` : '—'}</td></tr>`; }).join('')}</tbody></table></div>`;
  }

  H.registrar({
    id: ID, aba: 'Captei', grupo: 'crm', colecoes: [CL],
    render() {
      const T = cons();
      if (!T.length) return H.vazio(H.carregado[CL] ? 'Nenhuma consulta do Captei gravada ainda.' : 'Carregando…');
      const L = filtra(T), ab = F.aberto && L.find((x) => x._id === F.aberto);
      return `<h2>Captei · consultas de proprietários</h2>
        <p class="nota">Toda consulta feita no Captei (skill captei-busca-proprietario) fica aqui, com o PDF e o print no Drive. O Captei não guarda o resultado e reabrir cobra Capcoin de novo: consulte aqui antes de pedir outra busca.</p>
        ${kpis(T)}${filtros(T)}${porSolicitante(T)}${ab ? ficha(ab) : ''}${tabela(L)}`;
    },
    foco(alvo) { F.aberto = alvo || ''; H.pede(); },
    busca(q) {
      const t = sem(q).trim(); if (t.length < 2) return [];
      return cons().filter((x) => texto(x).includes(t)).slice(0, 8)
        .map((x) => ({ grp: 'Captei', tit: prop(x).nome || 'Consulta Captei', sub: (pedNo(x) ? 'Pedido ' + pedTxt(x) + ' · ' : '') + imovelTxt(x), ir: { aba: ID, linha: 'captei-' + x._id, alvo: x._id } }));
    },
  });

  document.addEventListener('input', (e) => {
    if (e.target.matches && e.target.matches('[data-captei-q]')) { F.q = e.target.value; const pos = e.target.selectionStart; H.pede();
      setTimeout(() => { const el = document.querySelector('[data-captei-q]'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (_) {} } }, 0); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches && e.target.matches('[data-captei-sol]')) { F.sol = e.target.value; H.pede(); }
    if (e.target.matches && e.target.matches('[data-captei-mes]')) { F.mes = e.target.value; H.pede(); }
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-captei-abre]');
    if (a) { F.aberto = F.aberto === a.dataset.capteiAbre ? '' : a.dataset.capteiAbre; H.pede(); return; }
    const r = e.target.closest && e.target.closest('[data-captei-ret]');
    if (r) { if (!H.db()) return; r.disabled = true; Promise.resolve(H.db().doc(CL + '/' + r.dataset.capteiRet).update({ status_retorno_corretor: 'enviado', retorno_enviado_em: new Date().toISOString() })).then(H.pede, (er) => { r.disabled = false; r.textContent = 'Não gravou — tente de novo'; r.title = String((er && er.message) || er || ''); }); } // falha visível (hub #12)
  });
})();
