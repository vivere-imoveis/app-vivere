// modulos/financeiro.js — área Financeiro do HUB Vivere (construção "financeiro", 20/10/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Decisões do Cleiton (20/10/2026):
// • Área própria no topo, que vai crescer: por enquanto Visão geral, Receitas (aba do núcleo, saiu da Locação), Contas a receber,
//   Despesas, Contas a pagar e Pagamentos ao Jurídico (saíram da aba Jurídico).
// • Despesas e contas a pagar/receber são lançadas à mão aqui (coleção financeiro_lancamentos) com o que o Cleiton for passando.
//   As planilhas do Deivis entram depois, pela construção à parte "Financeiro do Deivis".
// • Lê do núcleo: receita_mensal, recebimentos_cleiton (planilha V. Claude), cobrancas e contratos_locacao. Grava SÓ financeiro_lancamentos.
// • Sem conta bancária, CPF/CNPJ de pessoa, telefone ou e-mail nos lançamentos (trava igual à das Pessoas).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl = H.brl, brl0 = H.brl0;
  const CL = 'financeiro_lancamentos';
  // 26/10/2026 (pedido do Cleiton, padrão de todo o HUB): receita com "+" em verde e despesa com "−" em vermelho, no texto e no fundo
  const mais = H.mais || ((v, f) => (f || brl)(v)), menos = H.menos || ((v, f) => (f || brl)(v)), cv = H.clsVal || (() => '');
  const sp = (v, neg, f) => (v ? `<span class="${neg ? 'vmenos' : 'vmais'}">${(neg ? menos : mais)(v, f)}</span>` : (f || brl)(v || 0));
  const VCLAUDE = 'https://docs.google.com/spreadsheets/d/1GuK28D6iiNPjWYesk8S7fyIWqpx3azygy0bl7Wo3BSk/edit?gid=763274245#gid=763274245';
  const btVClaude = (txt) => `<a class="btn" href="${VCLAUDE}" target="_blank" rel="noopener" title="Abre a planilha V. Claude (aba PAINEL) no Google Planilhas">${txt}</a>`;
  const CATS = ['Aluguel e condomínio do escritório', 'Portais e anúncios', 'Sistemas e assinaturas', 'Marketing e mídias', 'Comissões de corretores', 'Jurídico', 'Contabilidade', 'Impostos e taxas', 'Tarifas bancárias', 'Manutenção e reparos', 'Pessoal', 'Seguro incêndio (locações)', 'Comissões recebidas (seguros e títulos)', 'Outros'];
  const mesTxt = (s) => { if (!s) return '—'; const [y, m] = String(s).split('-'); const n = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+m - 1]; return n ? `${n}/${y.slice(2)}` : s; };
  const diasDesde = (d) => (d ? Math.round((Date.parse(H.hojeISO()) - Date.parse(String(d).slice(0, 10))) / 864e5) : null);
  const hoje = () => H.hojeISO(); const mesAtual = () => hoje().slice(0, 7);
  const F = { mes: '', novo: '', erro: '', d: {} };
  const L = () => H.lista(CL);
  const mesDe = (x) => String(x.situacao === 'pago' ? (x.pago_em || x.vencimento || '') : (x.vencimento || '')).slice(0, 7);
  const kp = (rot, num, sub, alvo, cls) => `<button class="card" ${alvo ? `data-aba="${alvo}"` : ''} style="text-align:left;cursor:${alvo ? 'pointer' : 'default'};font:inherit;color:inherit${cls === 'bad' ? ';border-color:var(--bad)' : ''}"><div class="nota" style="margin:0;text-transform:uppercase;letter-spacing:.12em;font-size:11px">${rot}</div><div style="font-family:var(--display);font-size:24px;margin:4px 0${cls ? ';color:var(--' + cls + ')' : ''}">${num}</div><div class="nota" style="margin:0">${sub}</div></button>`;
  const SENS = [[/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, 'CPF'], [/[\w.+-]+@[\w-]+\.[\w.]+/, 'e-mail'], [/\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/, 'telefone'], [/\b(ag[eê]ncia|conta|pix)\b.{0,12}\d{3,}/i, 'conta bancária']];
  const sensivel = (o) => { if (typeof H.sensivel === 'function') return H.sensivel(o); const t = JSON.stringify(o || {}); for (const [re, n] of SENS) if (re.test(t)) return n; return ''; }; // regra única do núcleo (hub #15)

  // ------------------------------------------------------------ dados derivados
  // 15/11/2026 (hub #16): regra única do núcleo (temporada = 0), a mesma do Resumo da Locação
  function taxaDe(cod) { if (typeof H.taxaAdm === 'function') return H.taxaAdm(cod); const c = (H.S.contratos_locacao || {})[cod] || {}; const pl = c.planilha || {};
    if (String(cod).startsWith('T') || /temporada/i.test(String(pl.tipo || ''))) return 0;
    return pl.taxa_adm != null ? Number(pl.taxa_adm) : ((H.params().taxas_especiais || {})[cod] != null ? Number(H.params().taxas_especiais[cod]) : 0.10); }
  function aluguelDe(cod) { const c = (H.S.contratos_locacao || {})[cod] || {}; return Number((c.planilha || {}).aluguel_contrato ?? (c.alude || {}).aluguel) || 0; }
  // taxa de administração ainda não recebida: boletos em aberto ou em atraso × taxa do contrato (estimativa)
  function admAReceber() { return H.lista('cobrancas').filter((b) => b.situacao === 'atrasada' || b.situacao === 'aberta')
      .map((b) => ({ b, taxa: taxaDe(b.cod), adm: Math.round(taxaDe(b.cod) * aluguelDe(b.cod) * 100) / 100 })).filter((x) => x.adm > 0)
      .sort((a, z) => String(a.b.competencia).localeCompare(String(z.b.competencia))); }
  // 02/11/2026 (decisão do Cleiton): item pendente sem valor (ex.: venda da planilha) mostra "valor a definir", nunca R$ 0,00.
  const semNorm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const semValor = (k) => ((((H.S.recebimentos_cleiton || {}).pendentes || {}).itens) || []).filter((x) => (x.valor == null || x.valor === '') && (!k || semNorm(x.origem).includes(k))).length;
  const aDef = (n) => `<span class="pill warn">${n > 1 ? n + ' com valor a definir' : 'valor a definir'}</span>`;
  const spPend = (v, n, f) => (n ? (Number(v) ? `${sp(v, true, f)} + ${aDef(n)}` : aDef(n)) : sp(v, true, f));
  const pendJur = () => (((H.S.recebimentos_cleiton || {}).painel || {}).a_receber || {}).total;

  // ------------------------------------------------------------ gravação (só financeiro_lancamentos)
  async function grava(id, campos, desc, criar) { const db = H.db(); if (!db) { F.erro = 'Banco indisponível nesta visualização.'; H.pede(); return false; }
    const s = sensivel(campos); if (s) { F.erro = `Parece haver ${s} no que foi digitado — isso não fica no HUB.`; H.pede(); return false; }
    const x = (H.S[CL] || {})[id] || {}; const hist = (x.historico || []).slice(-30).concat([{ em: hoje(), o_que: desc, por: 'HUB' }]);
    try { if (criar) await db.doc(CL + '/' + id).set(Object.assign({ origem: 'manual', criado_em: hoje() }, campos, { atualizado_em: hoje(), historico: hist }));
      else await db.doc(CL + '/' + id).update(Object.assign({}, campos, { atualizado_em: hoje(), historico: hist })); F.erro = ''; return true; }
    catch (e) { F.erro = 'Não foi possível salvar: ' + (e && e.message || e); H.pede(); return false; } }

  // ------------------------------------------------------------ formulário de lançamento
  const st = 'padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;width:100%;box-sizing:border-box';
  const dv = (k, v) => (k in F.d ? F.d[k] : (v == null ? '' : v));
  const campo = (k, rot, html) => `<label class="nota" style="margin:0">${rot}<br>${html}</label>`;
  const inp = (k, ph, tipo, v) => `<input id="fin-${k}" data-fin-campo="${k}" ${tipo ? `type="${tipo}"` : ''} value="${esc(dv(k, v))}" placeholder="${esc(ph || '')}" ${tipo === 'number' ? 'step="0.01" min="0" inputmode="decimal"' : ''} style="${st}">`;
  const MODOS = { despesa: ['saida', 'pago', 'Lançar despesa (já paga)'], pagar: ['saida', 'aberto', 'Nova conta a pagar'], receber: ['entrada', 'aberto', 'Novo valor a receber'] };
  function form(modo) { const [nat, sit, tit] = MODOS[modo];
    return `<div class="card" style="margin:0 0 14px"><h2 style="margin:0 0 8px">${tit}</h2>
      <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">
        ${campo('descricao', 'Descrição', inp('descricao', modo === 'receber' ? 'Ex.: comissão da venda X' : 'Ex.: CanalPro — outubro'))}
        ${campo('categoria', 'Categoria', `<input id="fin-categoria" data-fin-campo="categoria" list="fin-cats" value="${esc(dv('categoria', ''))}" style="${st}"><datalist id="fin-cats">${CATS.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>`)}
        ${campo('valor', 'Valor (R$)', inp('valor', '0,00', 'number'))}
        ${campo('data', 'Vencimento', inp('data', '', 'date', hoje()))}
        ${sit === 'pago' ? campo('pago', 'Pago em', inp('pago', '', 'date', hoje())) : ''}
        ${campo('quem', nat === 'saida' ? 'Fornecedor / favorecido' : 'Quem paga', inp('quem', 'nome, sem documentos'))}
        ${campo('obs', 'Observação', inp('obs', ''))}</div>
      ${F.erro ? `<p style="color:var(--bad);margin:8px 0 0">${esc(F.erro)}</p>` : ''}
      <div class="filtros" style="margin:10px 0 0"><button class="btn" data-fin-criar="${modo}">Salvar</button><button class="btn" data-fin-novo="">Cancelar</button></div></div>`; }
  function linhas(R, acoes) { if (!R.length) return '';
    return `<div class="tabela"><table><thead><tr><th>Vencimento</th><th>Pago em</th><th>Descrição</th><th>Categoria</th><th class="n">Valor</th><th></th></tr></thead><tbody>${R.map((x) => { const d = x.situacao === 'aberto' ? diasDesde(x.vencimento) : null; const venc = d != null && d > 0;
      return `<tr><td>${dt(x.vencimento)}${venc ? `<span class="s" style="color:var(--bad)">vencida há ${d} d</span>` : ''}</td><td>${x.situacao === 'pago' ? dt(x.pago_em) : '<span class="s">em aberto</span>'}</td><td>${esc(x.descricao || '—')}${x.quem ? `<span class="s">${esc(x.quem)}</span>` : ''}${x.obs ? `<span class="s">${esc(x.obs)}</span>` : ''}</td><td>${esc(x.categoria || '—')}</td><td class="n ${cv(x.valor, x.natureza === 'saida')}">${x.natureza === 'saida' ? menos(x.valor) : mais(x.valor)}</td><td>${H.db() ? acoes(x) : ''}</td></tr>`; }).join('')}</tbody></table></div>`; }
  const total = (R) => R.reduce((t, x) => t + (Number(x.valor) || 0), 0);
  const btnNovo = (modo, t) => H.db() ? `<button class="btn" data-fin-novo="${modo}">${t}</button>` : '';
  const aviso = `<p class="nota">Por enquanto os lançamentos são feitos à mão aqui, com o que o Cleiton for passando. As planilhas do Deivis entram depois, pela construção "Financeiro do Deivis". Sem conta bancária, CPF ou telefone nos campos.</p>`;
  const meses = (R) => [...new Set(R.map(mesDe).filter(Boolean))].sort().reverse();
  const selMes = (R) => `<select id="fin-mes" aria-label="Mês" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit"><option value="">Todos os meses</option>${meses(R).map((m) => `<option value="${m}"${F.mes === m ? ' selected' : ''}>${mesTxt(m)}</option>`).join('')}</select>`;

  // ------------------------------------------------------------ abas
  function pVisao() { const m = mesAtual(); const RM = H.S.receita_mensal || {}; const r = RM[m] || {};
    const desp = L().filter((x) => x.natureza === 'saida' && x.situacao === 'pago'); const despMes = total(desp.filter((x) => mesDe(x) === m));
    const pagar = L().filter((x) => x.natureza === 'saida' && x.situacao === 'aberto'); const venc = pagar.filter((x) => (diasDesde(x.vencimento) || 0) > 0);
    const rec = L().filter((x) => x.natureza === 'entrada' && x.situacao === 'aberto'); const adm = admAReceber();
    const recMes = (r.total || 0) + total(L().filter((x) => x.natureza === 'entrada' && x.situacao === 'pago' && mesDe(x) === m));
    const ms = [...new Set(Object.keys(RM).concat(desp.map(mesDe)))].filter((x) => /^\d{4}-\d{2}$/.test(x)).sort().slice(-6).reverse();
    const tab = ms.map((k) => { const rr = (RM[k] || {}).total || 0; const ee = total(L().filter((x) => x.natureza === 'entrada' && x.situacao === 'pago' && mesDe(x) === k)); const dd = total(desp.filter((x) => mesDe(x) === k));
      const res = rr + ee - dd; return `<tr><td>${mesTxt(k)}</td><td class="n ${cv(rr + ee)}">${rr + ee ? mais(rr + ee) : '—'}</td><td class="n ${cv(dd, true)}">${dd ? menos(dd) : '—'}</td><td class="n ${cv(res, res < 0)}"><b>${res ? (res < 0 ? menos(-res) : mais(res)) : brl(0)}</b></td></tr>`; }).join('');
    return `<h2>Financeiro — visão geral</h2><p class="nota">Primeira versão do financeiro da Vivere: receitas vêm do Alude e da planilha V. Claude (aba Receitas); despesas e contas são lançadas aqui. O resultado só considera as despesas já lançadas.</p>
      <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:16px">
        ${kp(`Receita ${mesTxt(m)}`, sp(recMes, false, brl0), r.total != null ? `adm. ${brl0(r.adm)} · interm. ${brl0(r.intermediacao)} · vendas ${brl0(r.vendas)}` : 'aguardando coleta', 'receita')}
        ${kp(`Despesas ${mesTxt(m)}`, sp(despMes, true, brl0), desp.length ? `${desp.filter((x) => mesDe(x) === m).length} lançamento(s)` : 'nenhuma lançada ainda', 'fin-despesas')}
        ${kp(`Resultado ${mesTxt(m)}`, sp(Math.abs(recMes - despMes), recMes - despMes < 0, brl0), 'receita − despesas lançadas', '', recMes - despMes < 0 ? 'bad' : '')}
        ${kp('Contas a pagar', sp(total(pagar), true, brl0), pagar.length ? `${pagar.length} em aberto${venc.length ? ` · <b style="color:var(--bad)">${venc.length} vencida(s)</b>` : ''}` : 'nenhuma lançada', 'fin-pagar', venc.length ? 'bad' : '')}
        ${kp('A receber', sp(total(rec) + adm.reduce((t, x) => t + x.adm, 0), false, brl0), `adm. estimada de ${adm.length} boleto(s) em aberto${rec.length ? ` + ${rec.length} lançamento(s)` : ''}`, 'fin-receber')}
        ${kp('Pendente ao Jurídico', spPend(pendJur(), semValor(), brl0), 'planilha V. Claude', 'fin-juridico')}</div>
      <h2 style="margin-top:6px">Por mês</h2><div class="tabela"><table><thead><tr><th>Mês</th><th class="n">Receitas</th><th class="n">Despesas lançadas</th><th class="n">Resultado</th></tr></thead><tbody>${tab || '<tr><td colspan="4">Sem dados ainda.</td></tr>'}</tbody></table></div>`; }
  function pReceber() { const adm = admAReceber(); const rec = L().filter((x) => x.natureza === 'entrada').sort((a, b) => String(a.situacao).localeCompare(String(b.situacao)) || String(a.vencimento || '').localeCompare(String(b.vencimento || '')));
    const ab = rec.filter((x) => x.situacao === 'aberto'), pg = rec.filter((x) => x.situacao === 'pago');
    return `<h2>Contas a receber</h2>${aviso}
      <h3 class="pp-sec" style="margin:10px 0 6px">Taxa de administração dos boletos em aberto <span class="s" style="display:inline;text-transform:none;letter-spacing:0">estimativa: taxa do contrato × aluguel</span></h3>
      ${adm.length ? `<div class="tabela"><table><thead><tr><th>Contrato</th><th>Competência</th><th>Situação</th><th class="n">Aluguel</th><th class="n">Taxa</th><th class="n">Adm. a receber</th></tr></thead><tbody>${adm.map((x) => `<tr><td><span class="cod">${esc(x.b.cod)}</span></td><td>${esc(mesTxt(x.b.competencia))}</td><td>${x.b.situacao === 'atrasada' ? `<span class="pill bad">atrasada ${x.b.dias_atraso || 0} d</span>` : '<span class="pill warn">em aberto</span>'}</td><td class="n">${brl(aluguelDe(x.b.cod))}</td><td class="n">${(x.taxa * 100).toLocaleString('pt-BR')}%</td><td class="n ${cv(x.adm)}"><b>${mais(x.adm)}</b></td></tr>`).join('')}<tr><td colspan="5"><b>Total estimado</b></td><td class="n ${cv(adm.reduce((t, x) => t + x.adm, 0))}"><b>${mais(adm.reduce((t, x) => t + x.adm, 0))}</b></td></tr></tbody></table></div>` : H.vazio(H.carregado.cobrancas ? 'Nenhum boleto em aberto.' : 'Carregando…')}
      <h3 class="pp-sec" style="margin:16px 0 6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">Lançamentos a receber ${btnNovo('receber', '+ Novo valor a receber')}</h3>
      ${F.novo === 'receber' ? form('receber') : ''}${linhas(ab, (x) => `<button class="btn" data-fin-baixa="${esc(x._id)}">Recebido</button> <button class="btn" data-fin-del="${esc(x._id)}">Excluir</button>`) || H.vazio('Nenhum valor a receber lançado.')}
      ${pg.length ? `<details style="margin-top:10px"><summary class="s" style="cursor:pointer">Já recebidos (${pg.length})</summary>${linhas(pg, (x) => `<button class="btn" data-fin-reabre="${esc(x._id)}">Reabrir</button>`)}</details>` : ''}`; }
  function pDespesas() { const T = L().filter((x) => x.natureza === 'saida' && x.situacao === 'pago'); const R = T.filter((x) => !F.mes || mesDe(x) === F.mes).sort((a, b) => String(b.pago_em || '').localeCompare(String(a.pago_em || '')));
    const porCat = {}; R.forEach((x) => { const c = x.categoria || 'Sem categoria'; porCat[c] = (porCat[c] || 0) + (Number(x.valor) || 0); });
    return `<h2>Despesas</h2>${aviso}<div class="filtros">${selMes(T)}${btnNovo('despesa', '+ Lançar despesa')}</div>${F.novo === 'despesa' ? form('despesa') : ''}
      ${R.length ? `<p class="nota">${R.length} despesa(s) · total <b>${sp(total(R), true)}</b>${Object.keys(porCat).length ? ' · ' + Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${esc(c)} ${brl0(v)}`).join(' · ') : ''}</p>${linhas(R, (x) => `<button class="btn" data-fin-del="${esc(x._id)}">Excluir</button>`)}` : H.vazio('Nenhuma despesa lançada' + (F.mes ? ' neste mês.' : ' ainda.'))}`; }
  function pPagar() { const R = L().filter((x) => x.natureza === 'saida' && x.situacao === 'aberto').sort((a, b) => String(a.vencimento || '9').localeCompare(String(b.vencimento || '9')));
    const venc = R.filter((x) => (diasDesde(x.vencimento) || 0) > 0);
    return `<h2>Contas a pagar</h2>${aviso}<div class="filtros">${btnNovo('pagar', '+ Nova conta a pagar')}</div>${F.novo === 'pagar' ? form('pagar') : ''}
      ${R.length ? `<p class="nota">${R.length} conta(s) em aberto · total <b>${sp(total(R), true)}</b>${venc.length ? ` · <b style="color:var(--bad)">${venc.length} vencida(s), ${brl(total(venc))}</b>` : ''}. "Paga" transforma a conta em despesa do mês do pagamento.</p>${linhas(R, (x) => `<button class="btn" data-fin-baixa="${esc(x._id)}">Paga</button> <button class="btn" data-fin-del="${esc(x._id)}">Excluir</button>`)}` : H.vazio('Nenhuma conta a pagar lançada.')}`; }
  // pagamentos da Vivere ao Jurídico (mesma seção que ficava na aba Jurídico até 20/10/2026)
  // 02/11/2026 (Cleiton): o que já foi pago aparece só com o check, sem valor; os valores pagos ficam só na gestão pessoal. O que está a pagar segue com valor.
  // na referência de um pagamento já feito, cada valor em reais vira "R$ •••"
  const semValorTxt = (t) => String(t || '').replace(/R\$\s*-?\s*\d[\d.]*(?:,\d{1,2})?/g, 'R$ •••');
  function pJuridico() { const R = H.S.recebimentos_cleiton || {}; const p = R.painel;
    if (!p) return `<h2>Pagamentos da Vivere ao Jurídico</h2>${H.vazio('Aguardando a coleta da planilha V. Claude.')}`;
    const a = p.a_receber || {}; const orig = [['vendas', 'Vendas e contratos'], ['adm', '1/3 da administração'], ['intermediacao', '1/3 da intermediação'], ['extras', 'Contas extras']];
    const pend = ((R.pendentes || {}).itens || []).slice().sort((x, y) => String(x.desde || '').localeCompare(String(y.desde || '')));
    const pag = ((R.pagamentos || {}).itens || []).slice().sort((x, y) => String(y.data).localeCompare(String(x.data)));
    return `<h2 style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">Pagamentos da Vivere ao Jurídico <span style="margin-left:auto">${btVClaude('Abrir a V. Claude')}</span></h2>
      <p class="nota">Espelho do PAINEL da planilha V. Claude (fonte oficial), atualizado em ${dt(p.atualizado)}. Total pendente: <b>${spPend(a.total, semValor())}</b>${p.intermediacao_nao_lancada ? ` · intermediação ainda não lançada no Alude: ${brl(p.intermediacao_nao_lancada)}` : ''}. Até 20/10/2026 esta seção ficava na aba Jurídico.</p>
      <div class="grade">${orig.map(([k, n]) => `<div class="card"><div class="nota" style="margin:0;text-transform:uppercase;letter-spacing:.12em;font-size:11px">${n}</div><div style="font-family:var(--display);font-size:22px;margin-top:4px">${spPend(a[k], semValor(k))}</div></div>`).join('')}</div>
      <h2 style="margin-top:16px;font-size:12px">Em aberto</h2>
      <div class="tabela"><table><thead><tr><th>Referência</th><th>Origem</th><th class="n">Valor</th><th>Desde</th></tr></thead><tbody>${pend.length ? pend.map((x) => { const d = diasDesde(x.desde); return `<tr><td>${esc(x.ref)}</td><td>${esc(x.origem)}</td><td class="n ${cv(x.valor, true)}">${x.valor == null || x.valor === '' ? aDef(1) : menos(x.valor)}</td><td>${dt(x.desde)}${d != null ? `<span class="s">${d} dias</span>` : ''}</td></tr>`; }).join('') : '<tr><td colspan="4">Nada em aberto.</td></tr>'}</tbody></table></div>
      <h2 style="margin-top:16px;font-size:12px">Últimos pagamentos recebidos</h2>
      <p class="nota">Pagamento já feito aparece só com o check; os valores, inclusive os da referência, ficam ocultos.</p>
      <div class="tabela"><table><thead><tr><th>Recebido em</th><th>Origem</th><th>Situação</th><th>Referência</th></tr></thead><tbody>${pag.slice(0, 12).map((x) => `<tr><td>${dt(x.data)}</td><td>${esc(x.origem)}</td><td><span class="pill ok" title="Pago">✓ Pago</span></td><td>${esc(semValorTxt(x.ref))}</td></tr>`).join('') || '<tr><td colspan="4">—</td></tr>'}</tbody></table></div>`; }

  const seguro = (f) => () => { try { return f(); } catch (e) { return `<p class="nota">Erro no Financeiro: ${esc(e && e.message || e)}</p>`; } };
  H.registrar({ id: 'financeiro', aba: 'Visão geral', grupo: 'financeiro', colecoes: [CL, 'recebimentos_cleiton', 'receita_mensal', 'cobrancas', 'contratos_locacao'], render: seguro(pVisao) });
  H.registrar({ id: 'fin-receber', aba: 'Contas a receber', grupo: 'financeiro', colecoes: [CL], render: seguro(pReceber) });
  H.registrar({ id: 'fin-despesas', aba: 'Despesas', grupo: 'financeiro', colecoes: [CL], render: seguro(pDespesas) });
  H.registrar({ id: 'fin-pagar', aba: 'Contas a pagar', grupo: 'financeiro', colecoes: [CL], render: seguro(pPagar) });
  H.registrar({ id: 'fin-juridico', aba: 'Pagamentos ao Jurídico', grupo: 'financeiro', colecoes: ['recebimentos_cleiton'], render: seguro(pJuridico) });

  // ------------------------------------------------------------ ações (prefixo data-fin-)
  document.addEventListener('click', async (e) => { const t = (s) => e.target.closest('[data-fin-' + s + ']'); let b;
    if ((b = t('novo'))) { F.novo = b.dataset.finNovo; F.d = {}; F.erro = ''; H.pede(); return; }
    if ((b = t('criar'))) { const modo = b.dataset.finCriar; const [nat, sit] = MODOS[modo]; const v = (k) => { const el = document.getElementById('fin-' + k); return el ? el.value.trim() : ''; };
      const valor = Number(String(v('valor')).replace(',', '.')); if (!v('descricao') || !(valor > 0) || !v('data') || (sit === 'pago' && !v('pago'))) { F.erro = sit === 'pago' ? 'Preencha descrição, valor, vencimento e data do pagamento.' : 'Preencha descrição, valor e vencimento.'; H.pede(); return; }
      const id = 'f-' + (sit === 'pago' ? v('pago') : v('data')).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 8);
      const c = { natureza: nat, situacao: sit, descricao: v('descricao'), categoria: v('categoria'), valor, quem: v('quem'), obs: v('obs') };
      c.vencimento = v('data'); if (sit === 'pago') c.pago_em = v('pago');
      b.disabled = true; if (await grava(id, c, 'lançado', true)) { F.novo = ''; F.d = {}; H.pede(); } return; }
    if ((b = t('baixa'))) { const x = (H.S[CL] || {})[b.dataset.finBaixa]; if (!x) return; b.disabled = true; await grava(b.dataset.finBaixa, { situacao: 'pago', pago_em: hoje() }, x.natureza === 'saida' ? 'paga' : 'recebido'); H.pede(); return; }
    if ((b = t('reabre'))) { b.disabled = true; await grava(b.dataset.finReabre, { situacao: 'aberto', pago_em: null }, 'reaberto'); H.pede(); return; }
    if ((b = t('del'))) { const x = (H.S[CL] || {})[b.dataset.finDel]; if (!x || !confirm(`Excluir "${x.descricao}" (${brl(x.valor)})?`)) return; const db = H.db(); if (!db) return;
      try { await db.doc(CL + '/' + b.dataset.finDel).delete(); } catch (err) { F.erro = 'Não foi possível excluir: ' + (err && err.message || err); } H.pede(); return; }
  });
  document.addEventListener('input', (e) => { const el = e.target; if (el && el.dataset && el.dataset.finCampo) F.d[el.dataset.finCampo] = el.value; });
  document.addEventListener('change', (e) => { const el = e.target; if (!el) return; if (el.id === 'fin-mes') { F.mes = el.value; H.pede(); return; } if (el.dataset && el.dataset.finCampo) F.d[el.dataset.finCampo] = el.value; });
})();
