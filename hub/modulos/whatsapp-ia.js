// modulos/whatsapp-ia.js — aba "WhatsApp IA" do CRM no HUB Vivere (construção "whatsapp-ia", etapa 3, 01/11/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Agente de IA no WhatsApp dos corretores (Meta Cloud API + Supabase + API do Claude).
// • Lê (coleções do módulo, gravadas pela rotina _hub\modulos\whatsapp-ia\ROTINA.md a partir do Supabase):
//     whatsapp-ia_situacao/geral       — etapa, agente ligado, modelo, teto, última carga, retenção (90 d) e aviso (7 d)
//     whatsapp-ia_corretores/<id>      — números autorizados (só os 4 últimos dígitos; o número inteiro fica no Supabase)
//     whatsapp-ia_conversas/<id>-<dia> — cópia das conversas do dia, com CPF/telefone mascarados pela rotina
//     whatsapp-ia_fila/<id>            — espelho da fila de avisos e cobranças (fila_aprovacao do Supabase)
// • Grava (botões, só quem edita o HUB): decisão da fila (aprovado/recusado/pendente), conversa auditada e o
//   resultado do teste de conexão direta (whatsapp-ia_situacao/teste_conexao). Nada sai pelo WhatsApp daqui:
//   a rotina leva as decisões ao Supabase e chama a função do servidor para enviar os aprovados.
// • Sem CPF/CNPJ, telefone inteiro, e-mail ou conta bancária. O texto mostrado passa por máscara de novo (defesa em dobro).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt;
  const ID = 'whatsapp-ia', VERSAO = '2026-11-01.4';
  const C_SIT = 'whatsapp-ia_situacao', C_COR = 'whatsapp-ia_corretores', C_CONV = 'whatsapp-ia_conversas', C_FILA = 'whatsapp-ia_fila';
  const F = { vista: 'fila', fila: 'pendente', cor: '', ordC: 'dia', dirC: -1, aberta: '', foco: '' };
  const hoje = () => H.hojeISO();
  const dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  const somaDias = (iso, n) => new Date(Date.parse(String(iso).slice(0, 10)) + n * 864e5).toISOString().slice(0, 10);
  const agoraBR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
  const dtH = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : esc(s || '—'); };

  const sit = () => ((H.S[C_SIT] || {}).geral) || {};
  const teste = () => ((H.S[C_SIT] || {}).teste_conexao) || null;
  const RET = () => +sit().retencao_dias || 90;
  const AVISO = () => +sit().aviso_dias || 7;
  const cors = () => H.lista(C_COR).sort((a, b) => (a.papel === 'diretoria' ? -1 : 1) - (b.papel === 'diretoria' ? -1 : 1) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const convs = () => H.lista(C_CONV);
  const fila = () => H.lista(C_FILA).sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
  // coleção vazia nunca avisa "carregado": basta a situação ter chegado (as quatro vêm na mesma rotina)
  const pronto = (c) => !!(H.carregado[c] || H.carregado[C_SIT]);
  const nomeCor = (id) => ((H.S[C_COR] || {})[id] || {}).nome || id || '—';

  // máscara: CPF, CNPJ, telefone e e-mail nunca aparecem inteiros no HUB
  // 15/11/2026 (hub #15): regra única do núcleo (H.mascaraSens); a antiga fica só de reserva
  const mascaraAntiga = (t) => String(t == null ? '' : t)
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[e-mail]')
    .replace(/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, '[telefone]');
  const mascara = (t) => (typeof H.mascaraSens === 'function' ? H.mascaraSens(t) : mascaraAntiga(t));

  const expiraEm = (c) => c.expira_em || (c.dia ? somaDias(c.dia, RET()) : '');
  const aExpirar = () => convs().filter((c) => { const e = expiraEm(c); return e && !c.auditada_em && dias(hoje(), e) <= AVISO() && dias(hoje(), e) >= 0; })
    .sort((a, b) => String(expiraEm(a)).localeCompare(String(expiraEm(b))));

  const ST_FILA = { pendente: ['Aguardando você', 'warn'], aprovado: ['Aprovado · sai na rotina', 'info'], recusado: ['Recusado', ''], enviado: ['Enviado', 'ok'], erro: ['Erro no envio', 'bad'] };
  const TIPO_FILA = { aviso: 'Aviso', cobranca: 'Cobrança', resumo: 'Resumo do dia' };
  const pill = (M, s) => { const x = M[s] || [s || '—', '']; return `<span class="pill ${x[1]}">${esc(x[0])}</span>`; };
  const ETAPAS = ['Código do agente e banco', 'Exportador e retorno', 'Aba no HUB', 'Contas (chip, Meta, Supabase, API do Claude)', 'Ligar: teste → Cleiton → Kamily'];

  // ------------------------------------------------------------ situação
  function cardsSituacao() {
    const s = sit(), C = cors(), P = fila().filter((f) => f.status === 'pendente'), X = aExpirar();
    const ativos = C.filter((c) => c.ativo !== false);
    const desde7 = somaDias(hoje(), -7);
    const msg7 = convs().filter((c) => (c.dia || '') >= desde7).reduce((n, c) => n + (+c.n_msgs || (c.mensagens || []).length || 0), 0);
    const lig = s.agente_ligado === true;
    return `<div class="grade" style="margin-bottom:14px">
      <div class="card"><h2>Agente</h2><div style="font-family:var(--display);font-size:22px;color:var(--${lig ? 'ok' : 'muted'})">${lig ? 'Ligado' : 'Desligado'}</div><p class="nota" style="margin:0">etapa ${esc(s.etapa || 3)} de 5 · ${esc(ETAPAS[(+s.etapa || 3) - 1] || '')}</p></div>
      <div class="card"><h2>Números autorizados</h2><div style="font-family:var(--display);font-size:26px">${ativos.length}</div><p class="nota" style="margin:0">${C.length - ativos.length ? (C.length - ativos.length) + ' sem acesso' : 'todos com acesso'}${s.recusados_7d ? ` · ${esc(s.recusados_7d)} tentativa(s) de número fora da lista` : ''}</p></div>
      <div class="card"><h2>Mensagens · 7 dias</h2><div style="font-family:var(--display);font-size:26px">${msg7}</div><p class="nota" style="margin:0">${s.ultima_carga ? 'cópia de ' + dtH(s.ultima_carga) : 'nenhuma conversa ainda'}</p></div>
      <div class="card"${P.length ? ' style="border-color:var(--warn)"' : ''}><h2>Fila de aprovação</h2><div style="font-family:var(--display);font-size:26px${P.length ? ';color:var(--warn)' : ''}">${P.length}</div><p class="nota" style="margin:0">${P.length ? 'avisos e cobranças esperando você' : 'nada esperando'}</p></div>
      <div class="card"${X.length ? ' style="border-color:var(--bad)"' : ''}><h2>Expira em ${AVISO()} dias</h2><div style="font-family:var(--display);font-size:26px${X.length ? ';color:var(--bad)' : ''}">${X.length}</div><p class="nota" style="margin:0">conversas apagadas aos ${RET()} dias</p></div>
    </div>
    <p class="nota">Modelo: ${esc(s.modelo || 'a definir na etapa 4')} · teto mensal da API do Claude: ${s.teto_mensal ? H.brl(+s.teto_mensal) : 'a definir'}${s.gasto_mes != null ? ' · gasto no mês: ' + H.brl(+s.gasto_mes) : ''} · retorno ao HUB: ${esc(s.retorno || 'rotina diária dos dias úteis')}.</p>`;
  }

  // ------------------------------------------------------------ fila de aprovação
  function vistaFila() {
    const T = fila();
    const L = T.filter((f) => F.fila === 'todos' ? true : F.fila === 'decididos' ? f.status !== 'pendente' : f.status === 'pendente');
    const fil = `<div class="filtros">${[['pendente', 'Aguardando você'], ['decididos', 'Decididos'], ['todos', 'Todos']].map(([k, t]) => `<button class="btn" data-wa-fila="${k}" aria-pressed="${F.fila === k}">${t}</button>`).join('')}</div>`;
    if (!L.length) return fil + H.vazio(pronto(C_FILA) ? (F.fila === 'pendente' ? 'Nenhum aviso ou cobrança esperando aprovação. A rotina coloca aqui o que o agente quer mandar aos corretores; nada sai sem o seu OK.' : 'Nada neste filtro.') : 'Carregando…');
    const pode = !!H.db();
    const itens = L.map((f) => {
      const bt = !pode ? '' : f.status === 'pendente'
        ? `<button class="btn" data-wa-dec="aprovado" data-wa-id="${esc(f._id)}" style="border-color:var(--ok)">Aprovar</button><button class="btn" data-wa-dec="recusado" data-wa-id="${esc(f._id)}">Recusar</button>`
        : (['aprovado', 'recusado'].includes(f.status) && !f.levado_em && !f.enviado_em ? `<button class="btn" data-wa-dec="pendente" data-wa-id="${esc(f._id)}">Desfazer</button>` : '');
      return `<div class="pend ${f.status === 'pendente' ? 'media' : f.status === 'erro' ? 'alta' : 'baixa'}" id="wa-f-${esc(f._id)}"><div class="faixa"></div><div class="corpo">
        <div class="tit">${esc(TIPO_FILA[f.tipo] || f.tipo)} para ${esc(nomeCor(f.corretor_id))}</div>
        ${pode && f.status === 'pendente' ? '<div class="s" style="margin:2px 0">Texto exato que será enviado (sem máscara, para conferir número e endereço):</div>' : ''}<div class="det" style="white-space:pre-line">${esc(pode && f.status === 'pendente' ? String(f.texto || '') : mascara(f.texto))}</div>
        <div class="meta">${pill(ST_FILA, f.status)}<span class="s">criado ${dtH(f.criado_em)}${f.origem ? ' · ' + esc(String(f.origem).replace(/^rotina:/, '')) : ''}${f.decidido_em ? ' · decidido ' + dtH(f.decidido_em) : ''}${f.enviado_em ? ' · enviado ' + dtH(f.enviado_em) : ''}${f.erro ? ' · ' + esc(f.erro) : ''}</span></div>
        </div><div class="acoes">${bt}</div></div>`;
    }).join('');
    return `${fil}<p class="nota">Aprovar não envia na hora: a rotina leva a decisão ao agente e ele manda os aprovados. Enquanto a decisão não foi levada, dá para desfazer.</p>${itens}`;
  }

  // ------------------------------------------------------------ expiração
  function vistaExpira() {
    const X = aExpirar();
    const topo = `<p class="nota">As conversas guardadas pelo agente são apagadas ${RET()} dias depois do dia da conversa (decisão de 01/11/2026). Com ${AVISO()} dias de antecedência a lista aparece aqui, vira pendência no HUB e tarefa na Central, e o agente avisa você no WhatsApp. Abra cada conversa, confira e marque como auditada.</p>`;
    if (!X.length) return topo + H.vazio(pronto(C_CONV) ? `Nenhuma conversa expira nos próximos ${AVISO()} dias.` : 'Carregando…');
    const pode = !!H.db();
    return topo + `<div class="tabela"><table><thead><tr><th>Expira em</th><th>Corretor</th><th>Dia da conversa</th><th class="n">Mensagens</th><th></th></tr></thead><tbody>${X.map((c) => {
      const e = expiraEm(c), d = dias(hoje(), e);
      return `<tr><td>${dt(e)}<span class="s" style="color:var(--${d <= 2 ? 'bad' : 'warn'})">${d === 0 ? 'hoje' : d === 1 ? 'amanhã' : 'em ' + d + ' dias'}</span></td><td>${esc(nomeCor(c.corretor_id))}</td><td>${dt(c.dia)}</td><td class="n">${+c.n_msgs || (c.mensagens || []).length}</td>
        <td><div class="filtros" style="margin:0"><button class="btn" data-wa-abre="${esc(c._id)}">Ver conversa</button>${pode ? `<button class="btn" data-wa-aud="${esc(c._id)}">Auditada</button>` : ''}</div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  // ------------------------------------------------------------ números autorizados
  function vistaNumeros() {
    const C = cors();
    const topo = `<p class="nota">Só estes números conversam com o agente; mensagem de qualquer outro número é recusada antes de chegar à IA. O número inteiro fica guardado só no banco do agente; aqui aparecem os 4 últimos dígitos. Incluir ou retirar um corretor: pedir ao Claude, com o número, numa sessão da Vivere.</p>`;
    if (!C.length) return topo + H.vazio(pronto(C_COR) ? 'Nenhum número autorizado ainda.' : 'Carregando…');
    const ultima = {}; convs().forEach((c) => { if (!ultima[c.corretor_id] || c.dia > ultima[c.corretor_id]) ultima[c.corretor_id] = c.dia; });
    return topo + `<div class="tabela"><table><thead><tr><th>Nome</th><th>Papel</th><th>Equipe</th><th>Número</th><th>Situação</th><th>Última conversa</th></tr></thead><tbody>${C.map((c) => `<tr>
      <td>${esc(c.nome)}</td><td>${esc(c.papel === 'diretoria' ? 'Diretoria' : 'Corretor')}</td><td>${esc(c.equipe || '—')}</td>
      <td>${c.final ? '•••• ' + esc(String(c.final).replace(/\D/g, '').slice(-4)) : '<span class="s" style="color:var(--warn)">a cadastrar</span>'}</td>
      <td>${c.ativo === false ? '<span class="pill">Sem acesso</span>' : c.final ? '<span class="pill ok">Autorizado</span>' : '<span class="pill warn">Aguarda número</span>'}${c.desde ? `<span class="s">desde ${dt(c.desde)}</span>` : ''}</td>
      <td>${ultima[c._id] ? dt(ultima[c._id]) : '<span class="s">—</span>'}</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ------------------------------------------------------------ histórico de conversas
  const CH = { dia: (c) => c.dia || '', cor: (c) => nomeCor(c.corretor_id), n: (c) => +c.n_msgs || (c.mensagens || []).length, exp: (c) => expiraEm(c) };
  const ROT = { dia: 'Dia', cor: 'Corretor', n: 'Mensagens', exp: 'Apaga em' };
  const seta = (k) => (F.ordC === k ? (F.dirC > 0 ? ' ▲' : ' ▼') : ' ↕');
  function conversa(c) {
    const M = c.mensagens || [];
    if (!M.length) return '<p class="nota">Só a contagem desta conversa chegou ao HUB.</p>';
    return `<div style="display:grid;gap:6px;margin-top:8px">${M.map((m) => {
      const ag = m.papel === 'agente', sis = m.papel === 'sistema';
      return `<div style="max-width:min(560px,92%);justify-self:${ag ? 'end' : 'start'};background:var(--${ag ? 'panel' : 'bg'});border:1px solid var(--line);border-radius:10px;padding:6px 10px;${sis ? 'opacity:.75;font-style:italic;' : ''}">
        <div class="s">${esc(ag ? 'Agente' : sis ? 'Sistema' : nomeCor(c.corretor_id))}${m.h ? ' · ' + esc(m.h) : ''}</div><div style="white-space:pre-line;overflow-wrap:anywhere">${esc(mascara(m.texto))}</div></div>`;
    }).join('')}</div>`;
  }
  function vistaConversas() {
    const C = cors();
    let L = convs().filter((c) => !F.cor || c.corretor_id === F.cor);
    const k = CH[F.ordC] || CH.dia;
    L = L.sort((a, b) => { const x = k(a), y = k(b); return (x > y ? 1 : x < y ? -1 : 0) * F.dirC; });
    const fil = `<div class="filtros"><button class="btn" data-wa-cor="" aria-pressed="${!F.cor}">Todos</button>${C.map((c) => `<button class="btn" data-wa-cor="${esc(c._id)}" aria-pressed="${F.cor === c._id}">${esc(c.nome)}</button>`).join('')}</div>`;
    const ord = `<div class="filtros ordenar-movel"><span class="s">Ordenar por</span>${Object.keys(ROT).map((x) => `<button class="btn" data-wa-ord="${x}">${ROT[x]}${seta(x)}</button>`).join('')}</div>`;
    if (!L.length) return fil + H.vazio(pronto(C_CONV) ? 'Nenhuma conversa guardada ainda. Depois que o agente for ligado (etapa 5), a rotina traz aqui a cópia de cada dia, com CPF e telefones mascarados.' : 'Carregando…');
    const linhas = L.map((c) => {
      const ab = F.aberta === c._id, e = expiraEm(c);
      return `<tr id="wa-c-${esc(c._id)}"${F.foco === c._id ? ' class="foco"' : ''}><td>${dt(c.dia)}</td><td>${esc(nomeCor(c.corretor_id))}</td><td class="n">${CH.n(c)}</td>
        <td>${e ? dt(e) : '—'}${c.auditada_em ? '<span class="s" style="color:var(--ok)">auditada</span>' : ''}</td>
        <td><button class="btn" data-wa-abre="${esc(c._id)}">${ab ? 'Fechar' : 'Ver'}</button></td></tr>${ab ? `<tr><td colspan="5">${c.resumo ? `<p class="nota" style="margin:0">${esc(mascara(c.resumo))}</p>` : ''}${conversa(c)}</td></tr>` : ''}`;
    }).join('');
    return `${fil}${ord}<div class="tabela"><table><thead><tr><th>${ROT.dia}</th><th>${ROT.cor}</th><th class="n">${ROT.n}</th><th>${ROT.exp}</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  // ------------------------------------------------------------ teste: a página do HUB lê o Supabase direto?
  function vistaTeste() {
    const t = teste();
    const res = t ? `<p class="nota" style="margin:8px 0 0">Último teste: ${dtH(t.em)} · ${t.ok ? '<b style="color:var(--ok)">a página alcançou o servidor</b>' : `<b style="color:var(--bad)">bloqueado</b> (${esc(t.motivo || '')})`}${t.detalhe ? ' · ' + esc(t.detalhe) : ''}</p>` : '<p class="nota" style="margin:8px 0 0">Ainda não testado neste aparelho.</p>';
    return `<div class="card" style="margin-top:14px"><h2>Tempo real: a página consegue ler o banco do agente?</h2>
      <p class="nota" style="margin:0">O teste tenta uma leitura simples no endereço do Supabase (sem chave e sem dado nenhum) e registra se a página do HUB foi barrada. Se for barrada, as conversas continuam chegando pela rotina, e o tempo real passa pela construção “Sistema próprio”.</p>
      <div class="filtros" style="margin:8px 0 0"><button class="btn" data-wa-teste="1">Testar conexão direta</button></div>${res}</div>`;
  }
  async function testar(botao) {
    const alvo = (sit().supabase_url || 'https://teste-conexao.supabase.co') + '/rest/v1/';
    let csp = '';
    const ouvir = (e) => { if (String(e.blockedURI || '').includes('supabase')) csp = e.violatedDirective || 'connect-src'; };
    document.addEventListener('securitypolicyviolation', ouvir);
    if (botao) botao.textContent = 'Testando…';
    const r = { em: agoraBR(), alvo: alvo.replace(/^https:\/\//, '').split('/')[0], ok: false, motivo: '', detalhe: navigator.userAgent.includes('Mobile') ? 'celular' : 'computador' };
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 8000);
      const resp = await fetch(alvo, { method: 'GET', mode: 'cors', signal: ctl.signal }); clearTimeout(tm);
      r.ok = true; r.motivo = 'resposta HTTP ' + resp.status;
    } catch (e) {
      await new Promise((ok) => setTimeout(ok, 50));
      r.motivo = csp ? 'política de segurança do artefato (' + csp + ')' : (e && e.name === 'AbortError' ? 'sem resposta em 8 s' : 'rede ou CORS: ' + String(e && e.message || e).slice(0, 80));
    }
    document.removeEventListener('securitypolicyviolation', ouvir);
    const db = H.db();
    if (db) { try { await db.doc(C_SIT + '/teste_conexao').set(r); } catch (_) { if (botao) botao.textContent = 'Testado (não gravou)'; } }
    if (!db && botao) botao.textContent = r.ok ? 'Alcançou' : 'Bloqueado';
    H.pede();
  }

  // ------------------------------------------------------------ gravações
  async function decide(id, st, botao) {
    const db = H.db(); if (!db) return;
    const f = (H.S[C_FILA] || {})[id]; if (!f) return;
    const upd = { status: st, decidido_em: st === 'pendente' ? null : agoraBR(), historico: [...(f.historico || []), { em: agoraBR(), o_que: st === 'pendente' ? 'decisão desfeita no HUB' : st + ' no HUB' }].slice(-20) };
    if (botao) botao.textContent = 'Gravando…';
    try { await db.doc(C_FILA + '/' + id).update(upd); } catch (e) { if (botao) botao.textContent = 'Não gravou — tente de novo'; }
  }
  async function auditada(id, botao) {
    const db = H.db(); if (!db) return;
    if (botao) botao.textContent = 'Gravando…';
    try { await db.doc(C_CONV + '/' + id).update({ auditada_em: agoraBR() }); } catch (e) { if (botao) botao.textContent = 'Não gravou — tente de novo'; }
  }

  // ------------------------------------------------------------ aba
  const VISTAS = [['fila', 'Fila de aprovação'], ['expira', 'A expirar'], ['conversas', 'Conversas'], ['numeros', 'Números autorizados']];
  function render() {
    const nP = fila().filter((f) => f.status === 'pendente').length, nX = aExpirar().length;
    const cont = { fila: nP, expira: nX };
    const nav = `<div class="filtros" role="group" aria-label="Partes da aba">${VISTAS.map(([k, t]) => `<button class="btn" data-wa-vista="${k}" aria-pressed="${F.vista === k}">${t}${cont[k] ? ` <span class="pill ${k === 'expira' ? 'bad' : 'warn'}">${cont[k]}</span>` : ''}</button>`).join('')}</div>`;
    const corpo = F.vista === 'expira' ? vistaExpira() : F.vista === 'conversas' ? vistaConversas() : F.vista === 'numeros' ? vistaNumeros() : vistaFila();
    return `<h2>Agente de IA no WhatsApp</h2><p class="nota">Número próprio da Vivere na API oficial do WhatsApp, conversa 1:1 com cada corretor. O agente responde sozinho às consultas (imóveis, leads, empreendimentos, oportunidades); avisos e cobranças passam pela sua aprovação no piloto. Proprietário só para o corretor agenciador; nada financeiro, fiscal ou tributário da Vivere.</p>
      <p style="display:flex;gap:8px 12px;flex-wrap:wrap;align-items:center;margin:0 0 14px"><a class="btn" href="https://claude.ai/artifact/UWq6TXqyoBPdiGZNV2aQiw" target="_blank" rel="noopener noreferrer">🔵💬 Abrir a CENTRAL DA VIVIAN</a><span class="nota" style="margin:0">conversas, regras, cadernos e uso da Vivian em tempo real (só o Cleiton)</span></p>
      ${cardsSituacao()}${nav}${corpo}${vistaTeste()}`;
  }

  H.registrar({
    id: ID, aba: 'WhatsApp IA', grupo: 'crm', depois: 'crm', colecoes: [C_SIT, C_COR, C_CONV, C_FILA],
    tipos: {
      'whatsapp-ia_fila': 'WhatsApp IA — aviso ou cobrança para aprovar', 'whatsapp-ia_expiracao': 'WhatsApp IA — conversas a expirar',
      'whatsapp-ia_trava': 'WhatsApp IA — carga barrada pela trava', 'whatsapp-ia_erro_envio': 'WhatsApp IA — erro de envio',
      'whatsapp-ia_registro': 'WhatsApp IA — registro do chat sem lead', 'whatsapp-ia_recusados': 'WhatsApp IA — número fora da lista tentou falar',
    },
    render,
    foco(alvo) {
      const a = String(alvo || '');
      if (a === 'fila' || a === 'expira' || a === 'conversas' || a === 'numeros') { F.vista = a; }
      else if (a.startsWith('f-')) { F.vista = 'fila'; F.fila = 'todos'; }
      else if (a) { F.vista = 'conversas'; F.aberta = a; F.foco = a; }
      H.pede();
      setTimeout(() => { const l = document.getElementById('wa-c-' + a) || document.getElementById('wa-f-' + a.replace(/^f-/, '')); if (l) l.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 80);
    },
    busca(q) {
      const t = String(q || '').toLowerCase(); if (t.length < 2) return [];
      const R = [];
      if ('whatsapp agente ia'.includes(t) || t.includes('whats')) R.push({ grp: 'WhatsApp IA', tit: 'Agente de IA no WhatsApp', sub: 'situação, fila, conversas e números', ir: { aba: ID } });
      fila().filter((f) => [f.texto, nomeCor(f.corretor_id), TIPO_FILA[f.tipo]].join(' ').toLowerCase().includes(t)).slice(0, 4)
        .forEach((f) => R.push({ grp: 'WhatsApp IA', tit: `${TIPO_FILA[f.tipo] || f.tipo} para ${nomeCor(f.corretor_id)}`, sub: (ST_FILA[f.status] || [f.status])[0], ir: { aba: ID, alvo: 'f-' + f._id } }));
      convs().filter((c) => [c.resumo, nomeCor(c.corretor_id)].join(' ').toLowerCase().includes(t)).slice(0, 4)
        .forEach((c) => R.push({ grp: 'WhatsApp IA', tit: `Conversa de ${nomeCor(c.corretor_id)} · ${dt(c.dia)}`, sub: mascara(c.resumo || '').slice(0, 80), ir: { aba: ID, alvo: c._id } }));
      return R.slice(0, 8);
    },
  });
  window.HUB_WHATSAPP_IA = { versao: VERSAO, mascara };

  document.addEventListener('click', (e) => {
    const v = e.target.closest('[data-wa-vista]'); if (v) { F.vista = v.dataset.waVista; H.pede(); return; }
    const f = e.target.closest('[data-wa-fila]'); if (f) { F.fila = f.dataset.waFila; H.pede(); return; }
    const c = e.target.closest('[data-wa-cor]'); if (c) { F.cor = c.dataset.waCor; H.pede(); return; }
    const o = e.target.closest('[data-wa-ord]'); if (o) { const k = o.dataset.waOrd; if (F.ordC === k) F.dirC = -F.dirC; else { F.ordC = k; F.dirC = k === 'cor' ? 1 : -1; } H.pede(); return; }
    const a = e.target.closest('[data-wa-abre]'); if (a) { const id = a.dataset.waAbre; if (F.vista !== 'conversas') { F.vista = 'conversas'; F.aberta = id; F.foco = id; } else F.aberta = F.aberta === id ? '' : id; H.pede(); return; }
    const d = e.target.closest('[data-wa-dec]'); if (d) { decide(d.dataset.waId, d.dataset.waDec, d); return; }
    const u = e.target.closest('[data-wa-aud]'); if (u) { auditada(u.dataset.waAud, u); return; }
    const t = e.target.closest('[data-wa-teste]'); if (t) { testar(t); }
  });
})();
