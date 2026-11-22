// modulos/chamados.js — aba "🔧 Chamados" no grupo Locação do HUB VIVERE (construção "chamados", 14/11/2026, tarefa vivere-chamados-inquilino, fatia 1)
// Contrato: _hub\modulos\LEIA-ME.md. Decisões do Cleiton (respostas prévias de 08/11/2026 e cartão de 14/11/2026 17:43):
// • Chamados e pedidos do inquilino registrados aqui; sugere quem paga pela Lei 8.245/91 (art. 22, locador; art. 23, locatário)
//   e aponta o contrato da locação para conferir a cláusula; o Cleiton decide.
// • Etapas: aberto › orçamento › aprovado (só o Cleiton aprova o orçamento) › em execução › concluído.
// • Cadastro de prestadores no HUB. Proprietário avisado em todo chamado de reparo ou orçamento: o aviso e a resposta ao
//   inquilino saem prontos para copiar; nada é enviado sozinho.
// • F2 (depois): foto e formulário por link para o inquilino. F3: skill de triagem no chat.
// • Lê: contratos_locacao e fichas_locacao_contratos (só leitura). Grava: chamados e chamados_prestadores (nível mestre).
// • F2 (21/11/2026): link do inquilino por contrato (chamados_links, doc_id = sha256 do token; vale até o fim do contrato,
//   revogável) e Recebidos (chamados_entrada, gravados pela função pública chamado-inquilino; fotos em chamados_fotos, lidas
//   uma a uma pelo conector). 'Abrir como chamado' leva o relato ao formulário e resolve a pendência chamado-inq-<id>.
//   Sem CPF, e-mail nem conta bancária nos chamados (trava igual à do Financeiro); telefone só no contato do prestador.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl = H.brl;
  const ID = 'chamados', CC = 'chamados', CP = 'chamados_prestadores', CF = 'fichas_locacao_contratos';
  const ETAPAS = [['aberto', 'Aberto', 'info'], ['orcamento', 'Orçamento', 'warn'], ['aprovado', 'Aprovado', 'warn'], ['execucao', 'Em execução', 'warn'], ['concluido', 'Concluído', 'ok']];
  const ET = Object.fromEntries(ETAPAS.map((e, i) => [e[0], { rot: e[1], cls: e[2], i }]));
  const URG = { alta: ['Urgente', 'bad'], media: ['Média', 'warn'], baixa: ['Baixa', 'info'] };
  const CANAIS = ['WhatsApp', 'Telefone', 'E-mail', 'Presencial', 'Vistoria pelo app', 'Link do inquilino', 'Outro']; // 'Vistoria pelo app': aberto pelo gatilho do banco (F3 da vistoria pelo celular, 17/11/2026)
  const PAGA = { locador: 'Locador', locatario: 'Locatário', condominio: 'Condomínio', definir: 'A definir' };
  // categoria → [rótulo, quem paga sugerido, base legal]. Sugestão: o contrato e o caso concreto prevalecem.
  const CAT = {
    estrutura: ['Estrutura (telhado, laje, rachadura, infiltração externa)', 'locador', 'Lei 8.245/91, art. 22, I e IV (entregar o imóvel em estado de servir e responder pelos vícios anteriores); o dever de mantê-lo assim vem do CC, art. 566, I, aplicado pelo art. 79 da lei.'],
    oculta: ['Instalação embutida (cano ou fiação dentro da parede)', 'locador', 'Lei 8.245/91, art. 22, I e IV, salvo dano causado pelo locatário (art. 23, V).'],
    equipamento: ['Equipamento do imóvel com desgaste natural (aquecedor, ar, eletrodoméstico)', 'locador', 'Lei 8.245/91, art. 22, I, e CC, art. 566, I; a deterioração do uso normal não é do locatário (art. 23, III). Limpeza e manutenção de rotina ficam com o locatário (art. 23, II).'],
    conservacao: ['Conservação do dia a dia (lâmpada, torneira, sifão, resistência, fechadura)', 'locatario', 'Lei 8.245/91, art. 23, II e III: o locatário cuida do imóvel como se fosse seu e o devolve no estado em que recebeu, salvo o desgaste natural; conferir a cláusula de conservação.'],
    dano: ['Dano causado pelo locatário, família ou visita', 'locatario', 'Lei 8.245/91, art. 23, V: o locatário repara de imediato os danos que ele, dependentes, familiares, visitantes ou prepostos causarem.'],
    cond_extra: ['Condomínio: despesa extraordinária (obra, fachada, constituição do fundo de reserva)', 'locador', 'Lei 8.245/91, art. 22, X e parágrafo único.'],
    cond_ord: ['Condomínio: despesa ordinária (taxa do mês, consumo, manutenção comum, reposição do fundo de reserva)', 'locatario', 'Lei 8.245/91, art. 23, XII e § 1º.'],
    administrativo: ['Pedido administrativo (2ª via, contas, encerramento)', 'definir', 'Sem custo de reparo; tratar pelo contrato e pelo Alude.'],
    outro: ['Outro', 'definir', 'Conferir o contrato e o caso.'],
  };
  const PALAVRAS = [[/telhad|laje|rachad|trinc|infiltra|goteira|mofo/i, 'estrutura'], [/embutid|dentro da parede|fia[cç][aã]o|curto|disjuntor/i, 'oculta'],
    [/aquecedor|ar.condicionado|split|geladeira|fog[aã]o|m[aá]quina de lavar|forno|cooktop/i, 'equipamento'], [/quebr(ou|aram) (o|a|os|as)|derrub|manchou|risc/i, 'dano'],
    [/l[aâ]mpada|torneira|sif[aã]o|resist[eê]ncia|fechadura|chuveiro|descarga|entup/i, 'conservacao'], [/2.?a? via|boleto|encerr|desocup|conta de (luz|[aá]gua|g[aá]s)/i, 'administrativo'],
    [/taxa (de |do )?condom|cota condominial/i, 'cond_ord'], [/fachada|obra (do|no) (pr[eé]dio|condom)|chamada extra/i, 'cond_extra']];
  const sugereCat = (t) => { for (const [re, c] of PALAVRAS) if (re.test(t || '')) return c; return ''; };
  const TEL = [/\(?\b\d{2}\)?\s?9\s?\d{4}-?\s?\d{4}\b/, 'telefone'];
  const SENS = [[/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, 'CPF'], [/[\w.+-]+@[\w-]+\.[\w.]+/, 'e-mail'], [/\b(ag[eê]ncia|conta|pix)\b[\s:nº°.-]{0,4}\d{4,}/i, 'conta bancária']];
  const sensivel = (o, comTel) => { const t = JSON.stringify(o || {}); for (const [re, n] of (comTel ? [TEL].concat(SENS) : SENS)) if (re.test(t)) return n; return ''; };
  const agora = () => { const d = new Date(Date.now() - 3 * 3600e3).toISOString(); return d.slice(0, 10) + ' ' + d.slice(11, 16); };
  const F = { filtro: 'abertos', form: '', d: {}, erro: '', salvando: false, prest: false, pd: {}, pform: '', pp: 50, pg: 0, cop: '',
    entrada: '', receb: null, recebTodos: false, links: false, confirma: '', ocupado: false, fotos: {}, amplia: '' };
  const vis = (c) => H.lista(c).filter((x) => !String(x._id).startsWith('_') && !x.removido_em);
  const chamados = () => vis(CC).sort((a, b) => (String(b.aberto_em || '') > String(a.aberto_em || '') ? 1 : -1));
  const prestadores = () => vis(CP).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
  const contratos = () => H.lista('contratos_locacao').filter((c) => H.contratoAtivo(c)).sort((a, b) => String(a._id).localeCompare(String(b._id), 'pt-BR', { numeric: true }));
  const ficha = (cod) => (H.S[CF] || {})[cod] || null;
  const campo = (cod, k) => { const f = ficha(cod); const c = f && f.campos && f.campos[k]; return c && c.v != null ? String(c.v) : ''; };
  const imovelDe = (cod) => campo(cod, 'imovel') || ((H.S.contratos_locacao || {})[cod] || {}).imovel || ((H.S.contratos_locacao || {})[cod] || {}).endereco || '';
  const linkContrato = (cod) => { const f = ficha(cod); return f && /^[\w-]{10,}$/.test(String(f.drive_id || '')) ? 'https://drive.google.com/file/d/' + f.drive_id + '/view' : ''; };
  const tem = (c) => !!(H.carregado && H.carregado[c]);
  const st = 'padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;width:100%;box-sizing:border-box';
  const dv = (k, v) => (k in F.d ? F.d[k] : (v == null ? '' : v));
  const pdv = (k, v) => (k in F.pd ? F.pd[k] : (v == null ? '' : v));
  const rotulo = (r, h) => `<label style="display:block;min-width:0"><span class="s" style="display:block;margin:0 0 3px">${esc(r)}</span>${h}</label>`;
  const sel = (k, opts, v, attr) => `<select data-ch-campo="${k}" style="${st}" ${attr || ''}>${opts.map(([val, rot]) => `<option value="${esc(val)}"${String(v) === String(val) ? ' selected' : ''}>${esc(rot)}</option>`).join('')}</select>`;
  const pill = (txt, cls) => `<span class="pill ${cls || ''}">${esc(txt)}</span>`;
  const sugerido = (x) => { const c = CAT[x.categoria] || CAT.outro; return { paga: c[1], base: c[2] }; };
  const quemPaga = (x) => x.quem_paga || sugerido(x).paga;

  // ------------------------------------------------------------ gravação
  async function grava(col, id, dados, criar) {
    const db = typeof H.db === 'function' ? H.db() : null; if (!db) { F.erro = 'Banco do HUB indisponível. Tente de novo.'; return false; }
    try { if (criar) await db.doc(col + '/' + id).set(dados); else await db.doc(col + '/' + id).update(dados); F.erro = ''; return true; }
    catch (e) { F.erro = 'Não gravou (' + (e && (e.code || e.message) || 'erro') + '). Tente de novo.'; return false; }
  }
  const hist = (x, o_que) => (Array.isArray(x && x.historico) ? x.historico : []).concat([{ em: agora(), o_que }]);

  async function salvaChamado() {
    const id = F.form === 'novo' ? 'ch-' + Date.now().toString(36) : F.form, x = F.form === 'novo' ? null : (H.S[CC] || {})[id];
    const d = Object.assign({}, x || {}, F.d);
    if (!d.cod) { F.erro = 'Escolha o imóvel.'; return H.pede(); }
    if (!String(d.relato || '').trim()) { F.erro = 'Escreva o relato.'; return H.pede(); }
    const campos = { cod: d.cod, canal: d.canal || 'WhatsApp', relato: String(d.relato).trim(), categoria: d.categoria || sugereCat(d.relato) || 'outro', urgencia: d.urgencia || 'media',
      quem_paga: d.quem_paga && d.quem_paga !== 'sugestao' ? d.quem_paga : '', prestador: d.prestador || '', orcamento_valor: d.orcamento_valor === '' || d.orcamento_valor == null ? null : Number(d.orcamento_valor) || 0,
      obs: String(d.obs || '').trim() };
    const s = sensivel(campos, true); if (s) { F.erro = `Tire o ${s} do chamado: CPF, telefone, e-mail e conta bancária não ficam no chamado.`; return H.pede(); }
    const vNovo = campos.orcamento_valor, vAprov = x && x.orcamento_aprovado_valor != null ? Number(x.orcamento_aprovado_valor) : null;
    const reabre = x && ['aprovado', 'execucao', 'concluido'].includes(x.status) && vAprov != null && Number(vNovo || 0) !== vAprov;
    const entF = !x && F.entrada ? (H.S[CE] || {})[F.entrada] : null;
    F.salvando = true; H.pede();
    const ok = x ? await grava(CC, id, Object.assign(campos, { atualizado_em: agora(), historico: hist(x, reabre ? `orçamento ${brl(vAprov)} → ${brl(Number(vNovo || 0))} depois da aprovação: volta à etapa Orçamento` : 'editado') },
        reabre ? { status: 'orcamento', orcamento_aprovado_em: null, orcamento_aprovado_por: null, orcamento_aprovado_valor: null } : {}), false)
      : await grava(CC, id, Object.assign(campos, { status: 'aberto', aberto_em: agora(), atualizado_em: agora() },
          entF ? { origem: 'link_inquilino', entrada_id: F.entrada, fotos: Array.isArray(entF.fotos) ? entF.fotos : [], recebido_em: entF.recebido_em || null, historico: [{ em: agora(), o_que: 'aberto no HUB a partir do link do inquilino (recebido em ' + (entF.recebido_em || '?') + ')' }] }
            : { origem: 'manual', historico: [{ em: agora(), o_que: 'aberto no HUB' }] }), true);
    if (ok && entF) await fechaEntrada(F.entrada, 'aberto', id);
    F.salvando = false; if (ok) { F.form = ''; F.d = {}; F.entrada = ''; } H.pede();
  }
  async function avanca(id) {
    const x = (H.S[CC] || {})[id]; if (!x) return; const i = (ET[x.status] || ET.aberto).i; if (i >= ETAPAS.length - 1) return;
    const prox = ETAPAS[i + 1][0];
    if (prox === 'aprovado' && !(Number(x.orcamento_valor) > 0)) { F.erro = 'Informe o valor do orçamento (Editar) antes de aprovar.'; return H.pede(); }
    const extra = prox === 'aprovado' ? { orcamento_aprovado_em: agora(), orcamento_aprovado_por: 'Cleiton', orcamento_aprovado_valor: Number(x.orcamento_valor) } : prox === 'concluido' ? { concluido_em: agora() } : {};
    if (await grava(CC, id, Object.assign({ status: prox, atualizado_em: agora(), historico: hist(x, 'etapa: ' + ET[prox].rot) }, extra), false)) F.erro = '';
    H.pede();
  }
  async function volta(id) {
    const x = (H.S[CC] || {})[id]; if (!x) return; const i = (ET[x.status] || ET.aberto).i; if (i <= 0) return;
    const ant = ETAPAS[i - 1][0], extra = x.status === 'aprovado' ? { orcamento_aprovado_em: null, orcamento_aprovado_por: null, orcamento_aprovado_valor: null } : x.status === 'concluido' ? { concluido_em: null } : {};
    if (await grava(CC, id, Object.assign({ status: ant, atualizado_em: agora(), historico: hist(x, 'etapa voltou para: ' + ET[ant].rot) }, extra), false)) F.erro = '';
    H.pede();
  }
  async function salvaPrestador() {
    const id = F.pform === 'novo' ? 'pr-' + Date.now().toString(36) : F.pform, x = F.pform === 'novo' ? null : (H.S[CP] || {})[id];
    const d = Object.assign({}, x || {}, F.pd); if (!String(d.nome || '').trim()) { F.erro = 'Escreva o nome do prestador.'; return H.pede(); }
    const campos = { nome: String(d.nome).trim(), servico: String(d.servico || '').trim(), contato: String(d.contato || '').trim(), obs: String(d.obs || '').trim(), ativo: d.ativo !== false && d.ativo !== 'false' };
    const s = sensivel({ nome: campos.nome, servico: campos.servico, obs: campos.obs }, true) || sensivel({ contato: campos.contato }); if (s) { F.erro = `Tire o ${s} do cadastro: o contato leva só o telefone.`; return H.pede(); }
    if (await grava(CP, id, Object.assign(campos, { atualizado_em: agora() }, x ? {} : { criado_em: agora() }), !x)) { F.pform = ''; F.pd = {}; }
    H.pede();
  }

  // ------------------------------------------------------------ textos para copiar (nada sai sozinho)
  function textoProprietario(x) {
    const p = PAGA[quemPaga(x)] || 'A definir', pr = (H.S[CP] || {})[x.prestador], loc = campo(x.cod, 'locador').replace(/\s*\(.*$/, '');
    return [`Olá${loc ? ', ' + loc.split(' ')[0] : ''}! Aqui é da Vivere, sobre o imóvel ${x.cod}${imovelDe(x.cod) ? ' (' + imovelDe(x.cod).split(',').slice(0, 2).join(',') + ')' : ''}.`, '',
      `O locatário abriu um chamado${CAT[x.categoria] && x.categoria !== 'outro' ? ' (assunto: ' + CAT[x.categoria][0].split(' (')[0].replace(/^./, (c) => c.toLowerCase()) + ')' : ''}.`, '', // 21/11/2026 (F3): sem o relato literal, que pode trazer o nome do inquilino; detalhe, se preciso, o Cleiton acrescenta
      `Situação: ${(ET[x.status] || ET.aberto).rot}${pr ? ` · prestador: ${pr.nome}${pr.servico ? ' (' + pr.servico + ')' : ''}` : ''}${Number(x.orcamento_valor) > 0 ? ` · orçamento: ${brl(Number(x.orcamento_valor))}` : ''}.`,
      `Responsável pelo custo, pela nossa análise: ${p}${quemPaga(x) === 'locador' ? ' (a confirmar com o senhor/a senhora antes da execução)' : ''}.`, '',
      'Seguimos acompanhando e avisamos cada passo.'].join('\n');
  }
  function textoInquilino(x) {
    const p = quemPaga(x), u = x.urgencia === 'alta';
    const resp = p === 'locador' ? 'O reparo fica por conta do proprietário; já estamos providenciando.' : p === 'locatario' ? 'Pelo contrato e pela Lei do Inquilinato, esse reparo fica por conta do locatário; podemos indicar um prestador de confiança.' : p === 'condominio' ? 'O assunto é do condomínio; vamos levar à administração do prédio.' : 'Estamos analisando o caso com o contrato e já retornamos.';
    return [`Olá! Recebemos o seu chamado sobre o imóvel ${x.cod}: ${x.relato}`, '', resp, u ? 'Como é urgente, vamos priorizar o atendimento.' : '', '', 'Qualquer novidade, avisamos por aqui. Equipe Vivere.'].filter((l, i, a) => l || a[i - 1]).join('\n');
  }
  function copia(txt, rot) { const ok = () => { F.cop = rot; H.pede(); setTimeout(() => { F.cop = ''; H.pede(); }, 2200); };
    const manual = () => { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { F.erro = 'Não copiou.'; H.pede(); } document.body.removeChild(ta); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, manual); else manual(); }

  // ------------------------------------------------------------ desenho
  function formChamado() {
    const x = F.form === 'novo' ? {} : ((H.S[CC] || {})[F.form] || {}), cod = dv('cod', x.cod), relato = dv('relato', x.relato);
    const catAuto = sugereCat(relato), cat = dv('categoria', x.categoria || catAuto || 'outro'), sg = CAT[cat] || CAT.outro;
    const ctr = contratos(), opCod = [['', 'Escolha o imóvel']].concat(ctr.map((c) => [c._id, `${c._id}${imovelDe(c._id) ? ' — ' + imovelDe(c._id).split(',').slice(0, 2).join(',') : ''}`]));
    if (cod && !ctr.some((c) => c._id === cod)) opCod.push([cod, cod]);
    const pr = prestadores().filter((p) => p.ativo !== false);
    return `<div class="card" style="margin-bottom:14px"><h2>${F.form === 'novo' ? 'Novo chamado' : 'Editar chamado ' + esc(x.cod || '')}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px">
        ${rotulo('Imóvel', sel('cod', opCod, cod))}${rotulo('Canal', sel('canal', CANAIS.map((c) => [c, c]), dv('canal', x.canal || 'WhatsApp')))}
        ${rotulo('Urgência', sel('urgencia', [['alta', 'Urgente (risco, sem água, luz ou segurança)'], ['media', 'Média'], ['baixa', 'Baixa']], dv('urgencia', x.urgencia || 'media')))}
        ${rotulo('Categoria' + (catAuto && !('categoria' in F.d) && !x.categoria ? ' (sugerida pelo relato)' : ''), sel('categoria', Object.entries(CAT).map(([k, v]) => [k, v[0]]), cat))}
      </div>
      <div style="margin-top:10px">${rotulo('Relato do inquilino', `<textarea data-ch-campo="relato" rows="3" style="${st};resize:vertical" placeholder="O que aconteceu, onde, desde quando">${esc(relato)}</textarea>`)}</div>
      ${F.form === 'novo' && F.entrada && (H.S[CE] || {})[F.entrada] ? `<div style="margin-top:8px"><span class="s">Do link do inquilino</span>${blocoFotos('e:' + F.entrada, (H.S[CE] || {})[F.entrada].fotos) || ' <span class="s">(sem fotos)</span>'}</div>` : ''}
      <p class="nota" style="margin:8px 0;white-space:normal;overflow-wrap:anywhere"><b>Quem paga, pela sugestão:</b> ${esc(PAGA[sg[1]])}. ${esc(sg[2])}${linkContrato(cod) ? ` <a href="${esc(linkContrato(cod))}" target="_blank" rel="noopener">Abrir o contrato ↗</a>` : cod ? ' Contrato ainda sem ficha: conferir na pasta da locação.' : ''}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px">
        ${rotulo('Quem paga (decisão)', sel('quem_paga', [['sugestao', 'Seguir a sugestão']].concat(Object.entries(PAGA)), dv('quem_paga', x.quem_paga || 'sugestao')))}
        ${rotulo('Prestador', sel('prestador', [['', '—']].concat(pr.map((p) => [p._id, p.nome + (p.servico ? ' · ' + p.servico : '')])), dv('prestador', x.prestador || '')))}
        ${rotulo('Orçamento (R$)', `<input data-ch-campo="orcamento_valor" type="number" step="0.01" min="0" inputmode="decimal" value="${esc(dv('orcamento_valor', x.orcamento_valor == null ? '' : x.orcamento_valor))}" style="${st}">`)}
        ${rotulo('Observação', `<input data-ch-campo="obs" value="${esc(dv('obs', x.obs || ''))}" style="${st}">`)}
      </div>
      ${F.erro ? `<p class="nota" style="color:var(--bad);margin:8px 0 0">${esc(F.erro)}</p>` : ''}
      <div class="filtros" style="margin:12px 0 0"><button class="btn" data-ch-salva="1"${F.salvando ? ' disabled' : ''}>${F.salvando ? 'Gravando…' : 'Gravar'}</button><button class="btn" data-ch-cancela="1">Cancelar</button></div></div>`;
  }
  function cardChamado(x) {
    const e = ET[x.status] || ET.aberto, u = URG[x.urgencia] || URG.media, sg = sugerido(x), qp = quemPaga(x), pr = (H.S[CP] || {})[x.prestador], prox = ETAPAS[e.i + 1];
    const lk = linkContrato(x.cod);
    return `<div class="card" id="ch-${esc(x._id)}" style="min-width:0">
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px">${pill(e.rot, e.cls)}${pill(u[0], u[1])}${x.origem === 'vistoria_app' ? pill('📱 vistoria do app', 'info') : ''}${x.origem === 'link_inquilino' ? pill('📨 link do inquilino', 'info') : ''}<b style="margin-left:2px">${esc(x.cod || '')}</b><span class="s" style="display:inline">${esc((CAT[x.categoria] || CAT.outro)[0])}</span></div>
      <p style="margin:0 0 6px;white-space:normal;overflow-wrap:anywhere">${esc(x.relato || '')}</p>
      <p class="nota" style="margin:0 0 6px;white-space:normal;overflow-wrap:anywhere"><b>Quem paga:</b> ${esc(PAGA[qp] || 'A definir')}${x.quem_paga && x.quem_paga !== sg.paga ? ' (decisão; a sugestão era ' + esc(PAGA[sg.paga]) + ')' : ' (sugestão)'} · ${esc(sg.base)}${lk ? ` <a href="${esc(lk)}" target="_blank" rel="noopener">Contrato ↗</a>` : ''}</p>
      <p class="nota" style="margin:0 0 8px;white-space:normal">${esc(x.canal || '')} · aberto em ${esc(dt(x.aberto_em) || '')}${pr ? ` · prestador: ${esc(pr.nome)}` : ''}${Number(x.orcamento_valor) > 0 ? ` · orçamento ${esc(brl(Number(x.orcamento_valor)))}` : ''}${x.orcamento_aprovado_em ? ` · aprovado em ${esc(dt(x.orcamento_aprovado_em))}` : ''}${x.obs ? ` · ${esc(x.obs)}` : ''}</p>
      ${x.origem === 'link_inquilino' ? blocoFotos('c:' + x._id, x.fotos) : ''}
      <div class="filtros" style="margin:0">${prox ? `<button class="btn" data-ch-avanca="${esc(x._id)}">${prox[0] === 'aprovado' ? 'Aprovar orçamento ✓' : 'Avançar: ' + esc(prox[1]) + ' ▸'}</button>` : ''}${e.i > 0 ? `<button class="btn" data-ch-volta="${esc(x._id)}" title="Voltar à etapa anterior">◂ Voltar</button>` : ''}<button class="btn" data-ch-edita="${esc(x._id)}">Editar</button>${x.origem === 'vistoria_app' && x.vistoria && x.vistoria.hub_id ? `<button class="btn" data-ch-vist="${esc(x.vistoria.hub_id)}" title="Abrir a vistoria (com o PDF) em HUB › Vistorias">📱 Ver vistoria</button>` : ''}
        <button class="btn" data-ch-copia="prop:${esc(x._id)}">${F.cop === 'prop:' + x._id ? 'Copiado ✓' : 'Aviso ao proprietário'}</button><button class="btn" data-ch-copia="inq:${esc(x._id)}">${F.cop === 'inq:' + x._id ? 'Copiado ✓' : 'Resposta ao inquilino'}</button></div></div>`;
  }
  function blocoPrestadores() {
    const P = prestadores(), x = F.pform && F.pform !== 'novo' ? (H.S[CP] || {})[F.pform] || {} : {};
    const form = F.pform ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:10px;margin:8px 0">
        ${rotulo('Nome', `<input data-ch-pcampo="nome" value="${esc(pdv('nome', x.nome))}" style="${st}">`)}${rotulo('Serviço', `<input data-ch-pcampo="servico" value="${esc(pdv('servico', x.servico))}" placeholder="eletricista, encanador…" style="${st}">`)}
        ${rotulo('Contato', `<input data-ch-pcampo="contato" value="${esc(pdv('contato', x.contato))}" placeholder="telefone" style="${st}">`)}${rotulo('Observação', `<input data-ch-pcampo="obs" value="${esc(pdv('obs', x.obs))}" style="${st}">`)}</div>
        <div class="filtros"><button class="btn" data-ch-psalva="1">Gravar prestador</button><button class="btn" data-ch-pcancela="1">Cancelar</button></div>` : '';
    const lista = P.length ? P.map((p) => `<div class="vlin" style="white-space:normal;flex-direction:row;flex-wrap:wrap;gap:6px;align-items:baseline;border-top:1px solid var(--line);padding-top:6px"><b>${esc(p.nome)}</b><span class="s" style="display:inline">${esc([p.servico, p.contato, p.obs].filter(Boolean).join(' · '))}</span><button class="btn" data-ch-pedita="${esc(p._id)}" style="margin-left:auto">Editar</button></div>`).join('')
      : `<p class="nota" style="margin:0">${tem(CP) ? 'Nenhum prestador cadastrado.' : 'Carregando…'}</p>`;
    return `<div class="card" style="margin-bottom:14px"><h2>Prestadores</h2>${F.pform ? '' : '<div class="filtros"><button class="btn" data-ch-pnovo="1">＋ Novo prestador</button></div>'}${form}${lista}</div>`;
  }

  // ------------------------------------------------------------ F2: link do inquilino e Recebidos (21/11/2026)
  const CL = 'chamados_links', CE = 'chamados_entrada', CFOTO = 'chamados_fotos';
  const URL_FORM = 'https://vivere-imoveis.github.io/app-vivere/chamado.html?t=';
  const TIPO_CAT = { equipamento: 'equipamento', estrutura: 'estrutura', porta: 'conservacao', administrativo: 'administrativo' };
  const URG_INQ = { alta: 'Urgente', media: 'Pode esperar alguns dias', baixa: 'Sem pressa' };
  const semId = (o) => { const c = Object.assign({}, o || {}); delete c._id; return c; };
  const campoCtr = (cod, k) => { const c = (H.S.contratos_locacao || {})[cod] || {};
    for (const f of (k === 'bairro' || k === 'endereco' ? ['alude', 'planilha', 'pasta'] : ['planilha', 'alude', 'pasta'])) if (c[f] && c[f][k] != null && c[f][k] !== '') return String(c[f][k]);
    return c[k] != null ? String(c[k]) : ''; };
  const hojeSP = () => agora().slice(0, 10);
  const situacaoLk = (l) => !l ? 'sem' : l.revogado_em ? 'revogado' : l.expira_em && String(l.expira_em).slice(0, 10) < hojeSP() ? 'vencido' : 'ativo';
  const linksDe = (cod) => vis(CL).filter((l) => l.cod === cod);
  const linkDe = (cod) => linksDe(cod).sort((a, b) => (situacaoLk(a) === 'ativo' ? 0 : 1) - (situacaoLk(b) === 'ativo' ? 0 : 1) || String(b.criado_ts || b.criado_em || '').localeCompare(String(a.criado_ts || a.criado_em || '')))[0] || null;
  const recebidos = () => vis(CE).sort((a, b) => String(b.recebido_em || '').localeCompare(String(a.recebido_em || '')));
  const novos = () => recebidos().filter((x) => x.status === 'novo');
  const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const msgInquilino = (url) => `Olá! Para pedir um reparo ou abrir um chamado do seu imóvel, use este link: ${url}\nÉ só contar o que aconteceu e mandar fotos pelo celular. A Vivere recebe e retorna por aqui.`;
  let pMcp = null;
  const mcp = () => (pMcp = pMcp || (window.claude && window.claude.use ? window.claude.use('mcp') : Promise.resolve(null)));

  async function geraLink(cod) {
    if (F.ocupado) return; F.ocupado = true; F.confirma = ''; H.pede();
    try {
      const b = new Uint8Array(32); crypto.getRandomValues(b);
      const token = btoa(String.fromCharCode.apply(null, Array.from(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const id = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
      const indet = ((((H.S.controle || {}).parametros) || {}).prazo_indeterminado || []).includes(cod);
      const term = indet ? '' : campoCtr(cod, 'termino').slice(0, 10);
      for (const velho of linksDe(cod).filter((l) => situacaoLk(l) === 'ativo'))
        if (!(await grava(CL, velho._id, Object.assign(semId(velho), { revogado_em: agora(), historico: hist(velho, 'revogado: link novo gerado') }), true))) return;
      const ok = await grava(CL, id, { cod, ref: cod, bairro: campoCtr(cod, 'bairro'), token, url: URL_FORM + token, criado_em: agora(), criado_ts: new Date().toISOString(),
        expira_em: /^\d{4}-\d{2}-\d{2}$/.test(term) ? term : null, revogado_em: null, envios: { dia: '', n: 0 }, historico: [{ em: agora(), o_que: 'gerado no HUB' }] }, true);
      if (ok) copia(URL_FORM + token, 'lk:' + cod);
    } catch (e) { F.erro = 'Não gerou o link (' + (e && e.message || 'erro') + ').'; }
    finally { F.ocupado = false; H.pede(); }
  }
  async function revogaLink(cod) {
    const A = linksDe(cod).filter((l) => situacaoLk(l) === 'ativo'); F.confirma = ''; if (!A.length || F.ocupado) return H.pede();
    F.ocupado = true; H.pede();
    for (const l of A) await grava(CL, l._id, Object.assign(semId(l), { revogado_em: agora(), historico: hist(l, 'revogado no HUB') }), true);
    F.ocupado = false; H.pede();
  }
  async function fechaEntrada(id, status, chId) {
    const x = (H.S[CE] || {})[id]; if (!x) return false;
    const ok = await grava(CE, id, Object.assign(semId(x), { status, tratado_em: agora(), chamado_id: chId || null }), true);
    const pid = 'chamado-inq-' + id, p = (H.S.pendencias || {})[pid];
    if (ok && p && p.status === 'aberta') await grava('pendencias', pid, Object.assign(semId(p), { status: 'resolvida', resolvida_em: agora(), atualizado: agora() }), true);
    return ok;
  }
  function abreDeEntrada(id) {
    const x = (H.S[CE] || {})[id]; if (!x) return;
    const extra = [x.local ? 'Local: ' + x.local : '', x.horario ? 'Visita: ' + x.horario : ''].filter(Boolean).join(' · ');
    const relato = String(x.relato || '') + (extra ? '\n' + extra : '');
    F.form = 'novo'; F.entrada = id; F.erro = '';
    F.d = { cod: x.cod, canal: 'Link do inquilino', relato, urgencia: URG[x.urgencia] ? x.urgencia : 'media', categoria: sugereCat(relato) || TIPO_CAT[x.tipo] || 'outro' };
    H.pede(); setTimeout(() => window.scrollTo(0, 0), 30);
  }
  async function carregaFotos(chave, ids) {
    if (!Array.isArray(ids) || !ids.length || F.fotos[chave] === 'carregando') return;
    F.fotos[chave] = 'carregando'; H.pede();
    try {
      const m = await mcp(); if (!m) throw new Error('sem conector');
      const out = [];
      for (const fid of ids.slice(0, 4)) {
        const r = await m.callTool('Vivere Conversas', 'hub_ler', { colecao: CFOTO, doc_id: String(fid) }, { cache: false });
        let p = r && r.payload; if (typeof p === 'string') p = JSON.parse(p);
        const d = (((p && p.itens) || [])[0] || {}).dados || {};
        if (/^image\/(jpeg|png|webp)$/.test(d.mime || '') && /^[A-Za-z0-9+/]+={0,2}$/.test(d.b64 || '')) out.push('data:' + d.mime + ';base64,' + d.b64);
      }
      F.fotos[chave] = out;
    } catch (e) { F.fotos[chave] = 'erro'; }
    H.pede();
  }
  function blocoFotos(chave, ids) {
    const n = Array.isArray(ids) ? ids.length : 0; if (!n) return '';
    const f = F.fotos[chave];
    if (!Array.isArray(f)) return `<button class="btn" data-ch-fotos="${esc(chave)}"${f === 'carregando' ? ' disabled' : ''}>${f === 'carregando' ? 'Carregando fotos…' : f === 'erro' ? 'Fotos: tentar de novo' : `📷 Ver fotos (${n})`}</button>`;
    return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,${F.amplia === chave ? '100%' : '110px'}),1fr));gap:6px;width:100%;max-width:${F.amplia === chave ? '720px' : Math.min(4, f.length) * 150 + 'px'};margin:6px 0">${f.map((u, i) =>
      `<img src="${esc(u)}" alt="Foto ${i + 1}" data-ch-amplia="${esc(chave)}" title="Toque para ${F.amplia === chave ? 'reduzir' : 'ampliar'}" style="width:100%;${F.amplia === chave ? '' : 'aspect-ratio:1;object-fit:cover;'}border-radius:6px;border:1px solid var(--line);cursor:zoom-in;display:block">`).join('')}</div>`;
  }
  function cardEntrada(x) {
    const u = URG[x.urgencia] || URG.media, st2 = x.status === 'novo' ? pill('Novo', 'warn') : x.status === 'aberto' ? pill('Virou chamado', 'ok') : pill('Descartado', '');
    const acoes = x.status === 'novo' ? `<button class="btn" data-ch-eabre="${esc(x._id)}">Abrir como chamado ▸</button>${F.confirma === 'desc:' + x._id
        ? `<button class="btn" data-ch-edesc="${esc(x._id)}" style="color:var(--bad)">Confirmar descarte</button>` : `<button class="btn" data-ch-econf="${esc(x._id)}">Descartar</button>`}`
      : x.chamado_id && (H.S[CC] || {})[x.chamado_id] ? `<button class="btn" data-ch-ever="${esc(x.chamado_id)}">Ver o chamado</button>` : '';
    return `<div class="card" style="min-width:0">
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px">${st2}${pill(URG_INQ[x.urgencia] || u[0], u[1])}<b>${esc(x.cod || '')}</b><span class="s" style="display:inline">${esc(x.tipo_rotulo || '')}</span></div>
      <p style="margin:0 0 6px;white-space:pre-line;overflow-wrap:anywhere">${esc(x.relato || '')}</p>
      <p class="nota" style="margin:0 0 8px;white-space:normal">recebido em ${esc(dt(x.recebido_em) || x.recebido_em || '')}${x.local ? ' · local: ' + esc(x.local) : ''}${x.horario ? ' · visita: ' + esc(x.horario) : ''}${x.dados_removidos ? ' · ' + x.dados_removidos + ' dado(s) pessoal(is) tirado(s) do texto' : ''}${x.tratado_em ? ' · tratado em ' + esc(dt(x.tratado_em) || '') : ''}</p>
      ${blocoFotos('e:' + x._id, x.fotos)}
      <div class="filtros" style="margin:0">${acoes}</div></div>`;
  }
  function blocoRecebidos() {
    const T = recebidos(), V = F.recebTodos ? T : T.filter((x) => x.status === 'novo');
    const lista = !tem(CE) ? '<p class="nota" style="margin:0">Carregando…</p>' : V.length ? `<div style="display:flex;flex-direction:column;gap:10px">${V.slice(0, 50).map(cardEntrada).join('')}</div>`
      : `<p class="nota" style="margin:0">${F.recebTodos ? 'Nenhum chamado recebido pelo link ainda.' : 'Nenhum chamado novo do inquilino.'}</p>`;
    return `<div class="card" style="margin-bottom:14px"><h2>Recebidos pelo link do inquilino</h2>
      <p class="nota" style="white-space:normal">O que o inquilino mandou pelo formulário. "Abrir como chamado" leva o relato ao formulário acima; "Descartar" tira da lista (fica guardado). Cada novo também aparece nas Pendências.</p>
      <div class="filtros"><button class="btn" data-ch-rtodos="1" aria-pressed="${F.recebTodos}">${F.recebTodos ? 'Só os novos' : 'Ver também os tratados'}</button></div>${lista}</div>`;
  }
  function blocoLinks() {
    const linha = (c) => {
      const cod = c._id, l = linkDe(cod), s2 = situacaoLk(l), ativo = s2 === 'ativo';
      const val = ativo ? (l.expira_em ? 'vale até ' + esc(dt(l.expira_em) || l.expira_em) : 'sem data de término: vale até revogar') : s2 === 'vencido' ? 'venceu com o fim do contrato' : '';
      const termAgora = campoCtr(cod, 'termino').slice(0, 10), renovou = ativo && l.expira_em && /^\d{4}-\d{2}-\d{2}$/.test(termAgora) && termAgora > l.expira_em;
      const env = (renovou ? ` · <b>o contrato agora vai até ${esc(dt(termAgora) || termAgora)}: gere outro link</b>` : '') + (ativo && l.envios && l.envios.dia === hojeSP() && l.envios.n ? ` · ${l.envios.n} envio(s) hoje` : '');
      const bts = ativo
        ? `<button class="btn" data-ch-lcopia="${esc(cod)}">${F.cop === 'lk:' + cod ? 'Copiado ✓' : 'Copiar link'}</button><button class="btn" data-ch-lmsg="${esc(cod)}">${F.cop === 'msg:' + cod ? 'Copiado ✓' : 'Copiar mensagem'}</button>`
          + (F.confirma === 'rev:' + cod ? `<button class="btn" data-ch-lrevoga="${esc(cod)}" style="color:var(--bad)">Confirmar: desligar</button>` : `<button class="btn" data-ch-lconf="rev:${esc(cod)}">Revogar</button>`)
          + (F.confirma === 'novo:' + cod ? `<button class="btn" data-ch-lgera="${esc(cod)}" style="color:var(--bad)">Confirmar: o atual para de funcionar</button>` : `<button class="btn" data-ch-lconf="novo:${esc(cod)}">Gerar outro</button>`)
        : `<button class="btn" data-ch-lgera="${esc(cod)}"${F.ocupado ? ' disabled' : ''}>${F.cop === 'lk:' + cod ? 'Gerado e copiado ✓' : 'Gerar link'}</button>`;
      return `<div class="vlin" style="white-space:normal;flex-direction:row;flex-wrap:wrap;gap:6px;align-items:center;border-top:1px solid var(--line);padding-top:8px">
        <b>${esc(cod)}</b><span class="s" style="display:inline">${esc((imovelDe(cod) || '').split(',').slice(0, 2).join(','))}</span>${pill(ativo ? 'Ativo' : s2 === 'sem' ? 'Sem link' : s2 === 'revogado' ? 'Revogado' : 'Vencido', ativo ? 'ok' : s2 === 'sem' ? '' : 'warn')}${c.encerrado ? pill('Contrato encerrado: revogue', 'bad') : ''}
        <span class="s" style="display:inline">${val}${env}</span><span style="flex-basis:100%;height:0"></span><div class="filtros" style="margin:0">${bts}</div></div>`;
    };
    const C = contratos(), ja = new Set(C.map((c) => c._id));
    vis(CL).filter((l) => situacaoLk(l) === 'ativo' && !ja.has(l.cod)).forEach((l) => { ja.add(l.cod); C.push({ _id: l.cod, encerrado: true }); });
    return `<div class="card" style="margin-bottom:14px"><h2>Links do inquilino</h2>
      <p class="nota" style="white-space:normal">Um link por contrato. Você copia e manda ao inquilino (nada sai sozinho); ele abre no celular, sem senha, conta o problema e manda até 4 fotos. O chamado cai em Recebidos. Vale até o fim do contrato; "Revogar" desliga na hora. A página mostra ao inquilino só o código do contrato e o bairro.</p>
      ${C.length ? C.map(linha).join('') : `<p class="nota" style="margin:0">${tem('contratos_locacao') ? 'Nenhum contrato ativo.' : 'Carregando…'}</p>`}</div>`;
  }
  function render() {
    const T = chamados(), ab = T.filter((x) => x.status !== 'concluido');
    const V = F.filtro === 'abertos' ? ab : F.filtro === 'concluidos' ? T.filter((x) => x.status === 'concluido') : T;
    const urg = ab.filter((x) => x.urgencia === 'alta').length, orc = ab.filter((x) => x.status === 'orcamento').length;
    if (F.pg * F.pp >= V.length) F.pg = Math.max(0, Math.ceil(V.length / F.pp) - 1);
    const pag = V.length > 50, ini = pag ? F.pg * F.pp : 0, fim = pag ? ini + F.pp : V.length, nPg = Math.max(1, Math.ceil(V.length / F.pp));
    const bt = (k, rot) => `<button class="btn" data-ch-filtro="${k}" aria-pressed="${F.filtro === k}">${rot}</button>`;
    const nNovos = tem(CE) ? novos().length : 0, verReceb = F.receb === null ? nNovos > 0 : F.receb;
    const cab = `<h2>Chamados do inquilino</h2><p class="nota" style="white-space:normal">Registre o que o inquilino pediu, veja quem paga pela Lei do Inquilinato (sugestão; o contrato e o caso concreto prevalecem), aprove o orçamento e copie o aviso ao proprietário e a resposta ao inquilino. Nada é enviado sozinho.</p>
      <div class="filtros">${bt('abertos', `Em aberto (${ab.length})`)}${bt('concluidos', 'Concluídos')}${bt('todos', 'Todos')}<button class="btn" data-ch-novo="1">＋ Novo chamado</button><button class="btn" data-ch-prest="1" aria-pressed="${F.prest}">Prestadores</button><button class="btn" data-ch-receb="1" aria-pressed="${verReceb}">📥 Recebidos${nNovos ? ` (${nNovos} novo${nNovos === 1 ? '' : 's'})` : ''}</button><button class="btn" data-ch-links="1" aria-pressed="${F.links}">🔗 Links do inquilino</button></div>
      ${ab.length ? `<p class="nota" style="white-space:normal">${urg ? `<b style="color:var(--bad)">${urg} urgente${urg === 1 ? '' : 's'}</b> · ` : ''}${orc ? `${orc} aguardando a sua aprovação de orçamento · ` : ''}${ab.length} em aberto</p>` : ''}`;
    const aviso = !F.form && F.erro ? `<p class="nota" style="color:var(--bad)">${esc(F.erro)}</p>` : '';
    const pagin = pag ? `<div class="filtros" style="margin-top:10px;align-items:center"><button class="btn" data-ch-pg="-1"${F.pg ? '' : ' disabled'}>‹</button><span class="s" style="display:inline">página ${F.pg + 1} de ${nPg}</span><button class="btn" data-ch-pg="1"${F.pg + 1 < nPg ? '' : ' disabled'}>›</button><label class="s" style="display:inline">Por página <select data-ch-pp="1">${[50, 100].map((n) => `<option${F.pp === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>` : '';
    const corpo = !tem(CC) ? '<p class="nota">Carregando os chamados…</p>' : V.length ? `<div style="display:flex;flex-direction:column;gap:12px">${V.slice(ini, fim).map(cardChamado).join('')}</div>${pagin}`
      : `<p class="nota">${F.filtro === 'abertos' ? 'Nenhum chamado em aberto.' : 'Nenhum chamado aqui.'}</p>`;
    return cab + (F.links ? blocoLinks() : '') + (F.prest ? blocoPrestadores() : '') + (F.form ? formChamado() : '') + (verReceb && !F.form ? blocoRecebidos() : '') + aviso + corpo;
  }

  H.registrar({ id: ID, aba: '🔧 Chamados', grupo: 'locacao', depois: 'vistorias', colecoes: [CC, CP, 'contratos_locacao', CF, CL, CE], tipos: { chamado_inquilino: 'Chamado do inquilino' }, render,
    foco(alvo) { if (alvo) { F.filtro = 'todos'; setTimeout(() => { const l = document.getElementById('ch-' + alvo); if (l) l.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 80); } },
    busca(q) { const t = String(q || '').toLowerCase(); if (t.length < 2) return [];
      return chamados().filter((x) => [x.cod, x.relato, x.obs].filter(Boolean).join(' ').toLowerCase().includes(t)).slice(0, 8)
        .map((x) => ({ grp: 'Chamados', tit: `${x.cod} — ${(ET[x.status] || ET.aberto).rot}`, sub: String(x.relato || '').slice(0, 80), ir: { aba: ID, alvo: x._id } })); } });
  H.chamados = { lista: chamados, abertos: () => chamados().filter((x) => x.status !== 'concluido'), quemPaga: (x) => ({ paga: quemPaga(x), base: sugerido(x).base }), textoProprietario, textoInquilino, sugereCat };

  document.addEventListener('click', (e) => {
    const t = (s) => e.target.closest && e.target.closest('[data-ch-' + s + ']'); let b;
    if ((b = t('filtro'))) { F.filtro = b.dataset.chFiltro; F.pg = 0; return H.pede(); }
    if (t('novo')) { F.form = 'novo'; F.d = {}; F.erro = ''; F.entrada = ''; return H.pede(); }
    if ((b = t('vist'))) { return H.irPara('vistorias', b.dataset.chVist); }
    if ((b = t('edita'))) { F.form = b.dataset.chEdita; F.d = {}; F.erro = ''; F.entrada = ''; H.pede(); return setTimeout(() => window.scrollTo(0, 0), 30); }
    if (t('cancela')) { F.form = ''; F.d = {}; F.erro = ''; F.entrada = ''; return H.pede(); }
    if (t('receb')) { F.receb = !(F.receb === null ? (tem(CE) && novos().length > 0) : F.receb); return H.pede(); }
    if (t('rtodos')) { F.recebTodos = !F.recebTodos; return H.pede(); }
    if (t('links')) { F.links = !F.links; F.confirma = ''; return H.pede(); }
    if ((b = t('lconf'))) { F.confirma = b.dataset.chLconf; return H.pede(); }
    if ((b = t('lgera'))) return geraLink(b.dataset.chLgera);
    if ((b = t('lrevoga'))) return revogaLink(b.dataset.chLrevoga);
    if ((b = t('lcopia'))) { const l = linkDe(b.dataset.chLcopia); return l && l.url ? copia(l.url, 'lk:' + b.dataset.chLcopia) : null; }
    if ((b = t('lmsg'))) { const l = linkDe(b.dataset.chLmsg); return l && l.url ? copia(msgInquilino(l.url), 'msg:' + b.dataset.chLmsg) : null; }
    if ((b = t('eabre'))) { F.receb = true; return abreDeEntrada(b.dataset.chEabre); }
    if ((b = t('econf'))) { F.confirma = 'desc:' + b.dataset.chEconf; return H.pede(); }
    if ((b = t('edesc'))) { F.confirma = ''; F.receb = true; if (F.ocupado) return; F.ocupado = true; H.pede(); return fechaEntrada(b.dataset.chEdesc, 'descartado', null).then(() => { F.ocupado = false; H.pede(); }); }
    if ((b = t('ever'))) { F.filtro = 'todos'; H.pede(); return setTimeout(() => { const l = document.getElementById('ch-' + b.dataset.chEver); if (l) l.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 80); }
    if ((b = t('fotos'))) { const k = b.dataset.chFotos, id = k.slice(2), x = k[0] === 'e' ? (H.S[CE] || {})[id] : (H.S[CC] || {})[id]; return carregaFotos(k, x && x.fotos); }
    if ((b = t('amplia'))) { F.amplia = F.amplia === b.dataset.chAmplia ? '' : b.dataset.chAmplia; return H.pede(); }
    if (t('salva')) return salvaChamado();
    if ((b = t('avanca'))) return avanca(b.dataset.chAvanca);
    if ((b = t('volta'))) return volta(b.dataset.chVolta);
    if ((b = t('copia'))) { const [k, id] = b.dataset.chCopia.split(':'); const x = Object.assign({ _id: id }, (H.S[CC] || {})[id] || {}); return copia(k === 'prop' ? textoProprietario(x) : textoInquilino(x), b.dataset.chCopia); }
    if (t('prest')) { F.prest = !F.prest; return H.pede(); }
    if (t('pnovo')) { F.pform = 'novo'; F.pd = {}; F.erro = ''; return H.pede(); }
    if ((b = t('pedita'))) { F.pform = b.dataset.chPedita; F.pd = {}; return H.pede(); }
    if (t('pcancela')) { F.pform = ''; F.pd = {}; F.erro = ''; return H.pede(); }
    if (t('psalva')) return salvaPrestador();
    if ((b = t('pg'))) { F.pg = Math.max(0, F.pg + Number(b.dataset.chPg)); return H.pede(); }
  });
  const guarda = (e) => { const el = e.target; if (!el || !el.dataset) return;
    if (el.dataset.chCampo) { F.d[el.dataset.chCampo] = el.value; if (e.type === 'change' && (el.dataset.chCampo === 'categoria' || el.dataset.chCampo === 'cod')) H.pede(); }
    if (el.dataset.chCampo === 'relato' && !('categoria' in F.d)) { const c = sugereCat(el.value), s2 = document.querySelector('[data-ch-campo=categoria]'); if (c && s2 && !((H.S[CC] || {})[F.form] || {}).categoria) s2.value = c; }
    if (el.dataset.chPcampo) F.pd[el.dataset.chPcampo] = el.value;
    if (el.dataset.chPp && e.type === 'change') { F.pp = Number(el.value) || 50; F.pg = 0; H.pede(); } };
  document.addEventListener('input', guarda); document.addEventListener('change', guarda);
})();
