// modulos/cadastro-corretores.js — módulo "Cadastro de corretores" do HUB Vivere (19/10/2026; v5 19/10 à noite: Diretoria à parte e classes; v6: botões Abrir respostas e Abrir pasta na lista; v7: convite sem pedido de documentos; v8: aba na Gestão)
// Contrato: _hub\modulos\LEIA-ME.md. Coleções próprias: cadastro-corretores_fichas (uma ficha por pessoa, mesmo id da coleção
// `corretores`) e cadastro-corretores_config (doc `geral`: itens do checklist, acessos, documentos, pasta raiz).
// A ficha é a FONTE do cadastro: o consolidar.py (núcleo) lê as fichas e só usa parametros.corretores_info como reserva.
// Dados pessoais (CPF, RG, telefone, e-mail, conta) NUNCA entram aqui: ficam na pasta do corretor no PC (decisão do Cleiton, 19/10/2026).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt;
  const ID = 'cadastro-corretores', CF = 'cadastro-corretores_fichas', CG = 'cadastro-corretores_config';
  const SIT = { em_entrada: ['Em entrada', 'warn'], ativo: ['Ativo', 'ok'], em_saida: ['Em saída', 'bad'], saiu: ['Saiu', ''] };
  const TIPO = { corretor: 'Corretor', diretor: 'Diretor (sócio)', vinculado: 'Vinculado à diretoria', parceiro: 'Parceiro (não compete nas metas)' };
  const TIPO_EQ = [['corretor', 'Corretor'], ['parceiro', 'Parceiro (não compete nas metas)']];
  // vínculo: 'diretoria' = bloco à parte (sócios e vinculados), fora das equipes de corretores. Classes: várias por pessoa (decisão do Cleiton, 19/10/2026)
  const CLS0 = [['diretor', 'Diretor (sócio)'], ['corretor', 'Corretor'], ['juridico', 'Advogado / Jurídico'], ['gestor', 'Gestor imobiliário'], ['marketing', 'Marketing']];
  const clsL = () => (cfg().classes && cfg().classes.length ? cfg().classes : CLS0);
  const naDir = (x) => x.vinculo === 'diretoria';
  const clsPills = (x) => (x.classes || []).map((k) => `<span class="pill info">${esc((clsL().find((z) => z[0] === k) || [k, k])[1])}</span>`).join(' ');
  const EQ = ['Norte', 'Leste/Sul'];
  const EQ_TXT = { 'Norte': 'Norte (Jurerê)', 'Leste/Sul': 'Leste/Sul (Porto da Lagoa)' };
  const ST_AC = { ok: ['tem', 'ok'], pendente: ['pendente', 'warn'], na: ['não se aplica', ''], revogado: ['revogado', 'info'] };
  const ST_DOC = { assinado: ['assinado', 'ok'], pendente: ['pendente', 'warn'], na: ['não se aplica', ''] };
  const METAS = [['captacoes', 'Captações (imóveis agenciados)', 'n'], ['negocios', 'Negócios fechados', 'n'], ['vgv', 'VGV (R$)', 'r'], ['atividade', 'Atividade (visitas, contatos)', 't']];
  const PER = [['2026', 'Até dez/2026 — metas que eles propuseram'], ['2027', '2027 — metas da diretoria']];
  const F = { sit: 'atuais', eq: '', q: '', sel: '', edit: false, novo: false, draft: {}, erro: '' };
  const cfg = () => (H.S[CG] || {}).geral || {};
  const fichas = () => H.lista(CF);
  const nrm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const slug = (s) => nrm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pill = (m, k) => { const x = m[k]; return x ? `<span class="pill ${x[1]}">${esc(x[0])}</span>` : '<span class="pill">—</span>'; };
  const itens = (k) => cfg()[k] || [];
  const nomeDe = (x) => x.nome_completo || x.nome || x._id;
  const brl0 = H.brl0 || ((v) => v);

  // ---------------------------------------------------------------- trava de dados pessoais
  const SENS = [[/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, 'CPF'], [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/, 'CNPJ'], [/[\w.+-]+@[\w-]+\.[\w.]+/, 'e-mail'], [/\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/, 'telefone'], [/\b(ag[eê]ncia|conta|pix)\b.{0,12}\d{3,}/i, 'conta bancária']];
  function sensivel(obj) { if (typeof H.sensivel === 'function') return H.sensivel(obj); const t = JSON.stringify(obj || {}); for (const [re, nome] of SENS) if (re.test(t)) return nome; return ''; } // regra única do núcleo (hub #15)

  // ---------------------------------------------------------------- contagens
  function checkStat(x, k) { const L = itens(k === 'checklist_saida' ? 'saida' : 'entrada'); const C = x[k] || {};
    const feitos = L.filter(([i]) => C[i] && (C[i].st === 'feito' || C[i].st === 'na')).length; return { feitos, total: L.length, falta: L.filter(([i]) => !(C[i] && (C[i].st === 'feito' || C[i].st === 'na'))).map((z) => z[1]) }; }
  // realizado das metas: captações (Imobibrasil, pelo cadastro do imóvel) e negócios/VGV (planilha de vendas), a partir de `desde`
  function casaNome(txt, x) { const t = nrm(txt).trim(); if (!t) return false; const nomes = [x.nome_completo, x.nome].concat(x.apelidos || []).filter(Boolean).map((n) => nrm(n).trim());
    if (nomes.includes(t)) return true; const ex = (H.params().imobibrasil_corretores || {}); const k = Object.keys(ex).find((n) => nrm(n) === t); if (k) return ex[k] === x._id;
    const p = t.split(/\s+/)[0]; if (t.split(/\s+/).length > 1) return false; // nome composto que não bateu: não é esta pessoa
    const mesmos = fichas().filter((y) => nrm((y.nome_completo || y.nome || '').split(/\s+/)[0]) === p); return mesmos.length === 1 && mesmos[0]._id === x._id; }
  function realizado(x, desde, ate) { const dentro = (d) => d && (!desde || d >= desde) && (!ate || d <= ate);
    const cap = H.lista('imoveis').filter((i) => dentro(i.cadastrado_em) && casaNome(i.corretor, x)).length;
    const V = H.lista('vendas').filter((v) => dentro(v.data) && !/sem comiss/i.test(String(v.status || '')) && String(v.corretores || '').split(/\s+e\s+|,|\/|;|\+/i).some((n) => casaNome(n.replace(/\(.*?\)/g, ''), x)));
    return { captacoes: cap, negocios: V.length, vgv: V.reduce((t, v) => t + (Number(v.valor_transacao) || 0), 0) }; }

  // ---------------------------------------------------------------- gravação
  async function grava(id, campos, desc, criar) {
    const db = H.db(); if (!db) { alert('Banco indisponível nesta visualização.'); return false; }
    const s = sensivel(campos); if (s) { alert(`Parece haver ${s} no que foi digitado. Dados pessoais ficam na pasta do corretor no PC, não no HUB.`); return false; }
    const x = (H.S[CF] || {})[id] || {}; const hoje = H.hojeISO();
    const hist = (x.historico || []).slice(-60).concat([{ em: hoje, o_que: desc || 'ficha editada', por: 'HUB' }]);
    try { if (criar) await db.doc(CF + '/' + id).set(Object.assign({ criado_em: hoje, origem: 'HUB' }, campos, { atualizado_em: hoje, historico: hist }));
      else await db.doc(CF + '/' + id).update(Object.assign({}, campos, { atualizado_em: hoje, historico: hist })); return true; }
    catch (e) { alert('Não foi possível salvar: ' + (e && e.message || e)); return false; }
  }

  // ---------------------------------------------------------------- lista
  function filtra() { const q = nrm(F.q).trim();
    return fichas().filter((x) => (F.sit === 'todos' || (F.sit === 'atuais' ? x.situacao !== 'saiu' && !naDir(x) : F.sit === 'parceiros' ? x.tipo === 'parceiro' && x.situacao !== 'saiu' && !naDir(x) : x.situacao === F.sit))
      && (!F.eq || x.equipe === F.eq) && (!q || nrm([x.nome, x.nome_completo, x.creci, x.papel, (x.apelidos || []).join(' ')].join(' ')).includes(q)))
      .sort((a, b) => ({ em_saida: 0, em_entrada: 1, ativo: 2, saiu: 3 }[a.situacao] ?? 4) - ({ em_saida: 0, em_entrada: 1, ativo: 2, saiu: 3 }[b.situacao] ?? 4)
        || (a.tipo === 'parceiro') - (b.tipo === 'parceiro') || EQ.indexOf(a.equipe) - EQ.indexOf(b.equipe) || nomeDe(a).localeCompare(nomeDe(b), 'pt-BR')); }
  function resumoAcessos(x) { const A = x.acessos || {}; const L = itens('acessos'); if (!L.length) return '—';
    const ok = L.filter(([k]) => A[k] === 'ok').length, pd = L.filter(([k]) => A[k] === 'pendente').length, rv = L.filter(([k]) => A[k] === 'ok' && x.situacao === 'em_saida').length;
    if (!L.some(([k]) => A[k])) return '<span class="s" style="display:inline">não preenchido</span>';
    return `${ok}/${L.filter(([k]) => A[k] !== 'na').length}${pd ? ` <span class="pill warn">${pd} pend.</span>` : ''}${rv ? ` <span class="pill bad">${rv} a revogar</span>` : ''}`; }
  function resumoDocs(x) { const D = x.documentos || {}; const L = itens('documentos'); if (!L.some(([k]) => D[k])) return '<span class="s" style="display:inline">não preenchido</span>';
    return L.map(([k, t]) => D[k] ? `<span class="pill ${(ST_DOC[D[k]] || ['', ''])[1]}" title="${esc(t)}: ${esc((ST_DOC[D[k]] || [D[k]])[0])}">${esc(t.split(' ')[0])}</span>` : '').join(' '); }
  function resumoMeta(x) { const m = (x.metas || {})['2026']; if (!m || !METAS.some(([k]) => m[k])) return '—';
    const r = realizado(x, m.desde || '', '2026-12-31'); return METAS.filter(([k, , t]) => m[k] && t !== 't').map(([k, , t]) => `${t === 'r' ? brl0(r[k]) : r[k]} / ${t === 'r' ? brl0(m[k]) : m[k]}<span class="s" style="display:inline"> ${k === 'captacoes' ? 'capt.' : k === 'negocios' ? 'neg.' : 'VGV'}</span>`).join('<br>') || esc(m.atividade || '—'); }

  function linhasDe(R) { return R.map((x) => { const ce = checkStat(x, 'checklist_entrada'), cs = checkStat(x, 'checklist_saida');
      const ck = x.situacao === 'em_saida' || x.situacao === 'saiu' ? `saída ${cs.feitos}/${cs.total}` : `entrada ${ce.feitos}/${ce.total}`;
      return `<tr${x.situacao === 'saiu' ? ' style="opacity:.6"' : ''}><td><button class="btn" data-cc-sel="${esc(x._id)}" title="Abrir a ficha">${esc(x.nome || nomeDe(x))}</button>${x.nome_completo && x.nome_completo !== x.nome ? `<span class="s">${esc(x.nome_completo)}</span>` : ''}${x.papel ? `<span class="s">${esc(x.papel)}</span>` : ''}${(x.classes || []).length ? `<span class="s">${clsPills(x)}</span>` : ''}${x.pasta ? `<a class="btn pasta" href="abrirpasta:${encodeURIComponent(x.pasta)}" target="_blank" rel="noopener" data-abrir-pasta="${esc(x.pasta)}" title="Abre a pasta da pessoa no Explorador (documentos) e copia o caminho">Abrir pasta</a>` : '<span class="s">sem pasta no PC</span>'}</td>
        <td>${esc(naDir(x) ? (x.equipe ? 'homologa ' + x.equipe : '—') : (x.equipe || '—'))}<span class="s">${esc(naDir(x) ? 'Diretoria' : (TIPO[x.tipo] || ''))}</span></td><td>${pill(SIT, x.situacao)}${x.entrada ? `<span class="s">desde ${esc(String(x.entrada).length === 7 ? x.entrada.split('-').reverse().join('/') : dt(x.entrada))}</span>` : ''}${x.saida ? `<span class="s">saiu ${esc(String(x.saida).length <= 7 ? String(x.saida).split('-').reverse().join('/') : dt(x.saida))}</span>` : ''}</td>
        <td>${esc(x.creci || '—')}</td><td>${ck}${(x.situacao === 'em_entrada' && ce.falta.length) || (x.situacao === 'em_saida' && cs.falta.length) ? `<span class="s">falta: ${esc((x.situacao === 'em_saida' ? cs : ce).falta.slice(0, 2).join('; '))}${(x.situacao === 'em_saida' ? cs : ce).falta.length > 2 ? '…' : ''}</span>` : ''}</td>
        <td>${resumoAcessos(x)}</td><td>${resumoDocs(x)}</td><td class="n">${resumoMeta(x)}</td></tr>`; }).join(''); }

  function render() {
    const L = fichas(); if (!L.length) return '<h2>Cadastro de corretores</h2>' + H.vazio(H.carregado[CF] ? 'Nenhuma ficha cadastrada.' : 'Carregando o cadastro…');
    const n = (f) => L.filter(f).length;
    const kp = (rot, num, sub, alvo, al) => `<button class="card" data-cc-sit="${esc(alvo)}" aria-pressed="${F.sit === alvo}" style="text-align:left;cursor:pointer;font:inherit;color:inherit${al ? ';border-color:var(--bad)' : ''}"><div class="nota" style="margin:0;text-transform:uppercase;letter-spacing:.12em;font-size:11px">${rot}</div><div style="font-size:28px;margin:4px 0">${num}</div><div class="nota" style="margin:0">${sub}</div></button>`;
    const nEnt = n((x) => x.situacao === 'em_entrada'), nSai = n((x) => x.situacao === 'em_saida');
    const at = L.filter((x) => x.situacao !== 'saiu' && x.tipo !== 'parceiro' && !naDir(x));
    const DIR = L.filter((x) => naDir(x) && x.situacao !== 'saiu');
    const cards = `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px">
      ${kp('Equipe atual', at.length, EQ.map((e) => `${e} ${at.filter((x) => x.equipe === e).length}`).join(' · '), 'atuais')}
      ${kp('Diretoria', DIR.length, `${DIR.filter((x) => (x.classes || []).includes('diretor')).length} diretores · ${DIR.filter((x) => !(x.classes || []).includes('diretor')).length} vinculados`, 'diretoria')}
      ${kp('Em entrada', nEnt, nEnt ? 'checklist de entrada em aberto' : 'nenhum', 'em_entrada', false)}
      ${kp('Em saída', nSai, nSai ? 'acessos a revogar' : 'nenhum', 'em_saida', nSai > 0)}
      ${kp('Parceiros', n((x) => x.tipo === 'parceiro' && x.situacao !== 'saiu'), 'agenciam, fora das metas', 'parceiros')}
      ${kp('Saíram', n((x) => x.situacao === 'saiu'), 'histórico', 'saiu')}</div>`;
    const R = filtra();
    const q0 = nrm(F.q).trim();
    const Dv = (F.sit === 'atuais' || F.sit === 'diretoria') ? DIR.filter((x) => !F.eq || x.equipe === F.eq).filter((x) => !q0 || nrm([x.nome, x.nome_completo, x.creci, x.papel, (x.apelidos || []).join(' ')].join(' ')).includes(q0))
      .sort((a, b) => ((b.classes || []).includes('diretor') - (a.classes || []).includes('diretor')) || nomeDe(a).localeCompare(nomeDe(b), 'pt-BR')) : [];

    const selEq = `<select id="cc-feq" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit"><option value="">Todas as equipes</option>${EQ.map((e) => `<option value="${esc(e)}"${F.eq === e ? ' selected' : ''}>${esc(EQ_TXT[e])}</option>`).join('')}</select>`;
    const bt = (v, t) => `<button class="btn" data-cc-sit="${v}" aria-pressed="${F.sit === v}">${t}</button>`;
    return `<h2>Cadastro de corretores</h2><p class="nota">Ficha de cada corretor: dados profissionais, acessos, documentos, checklist de entrada e de saída e metas. Esta ficha é a fonte da aba Corretores (equipe, nome completo, entrada, saída). CPF, RG, telefone, e-mail e conta <b>não</b> ficam no HUB: ficam na pasta do corretor no PC. Ativar no CRM e compartilhar a planilha continuam com o seu OK.</p>
    ${cards}${(() => { const fm = cfg().formulario; return fm && fm.link_curto ? `<div class="card" style="margin-bottom:14px"><b>Formulário dos corretores</b> — prazo ${dt(fm.prazo)}. <a class="btn" href="${escUrl(fm.link_curto)}" target="_blank" rel="noopener">Abrir formulário</a>${fm.planilha_id ? ` <a class="btn" href="https://docs.google.com/spreadsheets/d/${esc(fm.planilha_id)}/edit" target="_blank" rel="noopener" title="Planilha das respostas (aba Cadastro, já formatada) — só abre na sua conta Google">Abrir respostas</a>` : ''} <button class="btn" data-cc-convite="1">Copiar convite para o WhatsApp</button><span class="s" style="display:block;margin-top:6px">As respostas (com CPF, endereço e conta) ficam só na planilha do Google, na sua conta. O HUB importa nome, CRECI, equipe, início e acessos quando você pedir ao Claude: "importa o formulário dos corretores".</span></div>` : ''; })()}
    <div class="filtros">${bt('atuais', 'Atuais')}${bt('em_entrada', 'Em entrada')}${bt('em_saida', 'Em saída')}${bt('diretoria', 'Diretoria')}${bt('parceiros', 'Parceiros')}${bt('saiu', 'Saíram')}${bt('todos', 'Todos')}${selEq}<input id="cc-fq" type="search" placeholder="Buscar nome, CRECI, papel…" value="${esc(F.q)}" style="flex:1 1 180px;min-width:0;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit"><button class="btn" data-cc-novo="1" style="margin-left:auto">+ Novo corretor</button></div>
    ${F.novo ? formNovo() : ''}${F.sel ? ficha((H.S[CF] || {})[F.sel] ? Object.assign({ _id: F.sel }, H.S[CF][F.sel]) : null) : ''}
    ${Dv.length ? `<h3 style="margin:14px 0 6px">Diretoria <span class="s" style="display:inline">diretores (sócios) e pessoas vinculadas à diretoria — fora das equipes de corretores</span></h3>${tabela(Dv, 'Pessoa')}` : ''}
    ${F.sit === 'diretoria' ? (Dv.length ? '' : H.vazio('Ninguém na Diretoria.')) : `${Dv.length ? '<h3 style="margin:14px 0 6px">Corretores</h3>' : ''}${R.length ? tabela(R, 'Corretor') : H.vazio('Ninguém neste filtro.')}`}`;
  }
  function tabela(R, rot) { const linhas = linhasDe(R);
    return `<div class="tabela"><table><thead class="quebra"><tr><th>${rot}</th><th>Equipe</th><th>Situação</th><th>CRECI</th><th>Checklist</th><th>Acessos</th><th>Documentos</th><th class="n">Metas 2026<br>realizado / meta</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  // ---------------------------------------------------------------- campos (com rascunho, para o redesenho não apagar o que foi digitado)
  const dv = (k, v) => (k in F.draft ? F.draft[k] : (v == null ? '' : v));
  const st = 'padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;width:100%;box-sizing:border-box';
  const inp = (k, v, ph, tipo) => `<input id="cc-e-${k}" data-cc-campo="${k}" ${tipo ? `type="${tipo}"` : ''} value="${esc(dv(k, v))}" placeholder="${esc(ph || '')}" style="${st}">`;
  const sel = (k, v, ops) => `<select id="cc-e-${k}" data-cc-campo="${k}" style="${st}">${ops.map(([o, t]) => `<option value="${esc(o)}"${String(dv(k, v)) === o ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  // herdeiro dos agenciamentos na saída (regra do Cleiton, 18/11/2026): corretor interno indicado por quem sai; sem indicação, a Vivere assume
  const HERD_VIV = 'vivere';
  const herdOps = (x) => [['', '— não indicado'], [HERD_VIV, 'Vivere assume (Diretoria pode redistribuir)']].concat(fichas().filter((y) => y._id !== x._id && y.situacao !== 'saiu').sort((a, b) => nomeDe(a).localeCompare(nomeDe(b), 'pt-BR')).map((y) => [y._id, nomeDe(y) + (naDir(y) ? ' (Diretoria)' : '')]));
  const herdTxt = (v) => { if (!v) return ''; if (v === HERD_VIV) return 'Vivere assume'; const y = (H.S[CF] || {})[v]; return y ? nomeDe(Object.assign({ _id: v }, y)) : v; };
  const lab = (t, html) => `<label class="nota" style="margin:0">${t}<br>${html}</label>`;
  const val = (k) => { const el = document.getElementById('cc-e-' + k); return el ? el.value.trim() : (k in F.draft ? String(F.draft[k]).trim() : ''); };

  function formNovo() {
    return `<div class="card" style="margin-bottom:14px"><h2 style="margin:0 0 6px">Novo corretor</h2><p class="nota">Cria a ficha em "Em entrada" com o checklist de entrada. Só dados profissionais — documentos pessoais vão para a pasta do corretor.</p>
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
      ${lab('Nome completo', inp('n_nome_completo', '', 'Ex.: Fernanda Carvalho'))}${lab('Como é chamado (nome curto)', inp('n_nome', '', 'Ex.: Fernanda C.'))}
      ${lab('Equipe', sel('n_equipe', '', [['', '—']].concat(EQ.map((e) => [e, EQ_TXT[e]]))))}${lab('Vínculo', sel('n_vinculo', '', [['', 'Equipe de corretores'], ['diretoria', 'Diretoria']]))}${lab('Tipo (equipe de corretores)', sel('n_tipo', 'corretor', TIPO_EQ))}
      ${lab('CRECI (número)', inp('n_creci', '', 'Ex.: 12.345'))}${lab('Data de entrada', inp('n_entrada', H.hojeISO(), '', 'date'))}</div>
    ${F.erro ? `<p style="color:var(--bad);margin:8px 0 0">${esc(F.erro)}</p>` : ''}
    <div class="filtros" style="margin:10px 0 0"><button class="btn" data-cc-criar="1">Criar ficha</button><button class="btn" data-cc-novo="0">Cancelar</button></div></div>`;
  }

  function ficha(x) {
    if (!x) return '';
    const ed = F.edit && H.db(); const C = H.S.corretores && H.S.corretores[x._id]; const raiz = cfg().pastas_raiz || '';
    const pasta = x.pasta ? `<a class="btn pasta" href="abrirpasta:${encodeURIComponent(x.pasta)}" target="_blank" rel="noopener" data-abrir-pasta="${esc(x.pasta)}" title="Abre a pasta no Explorador e copia o caminho">Abrir pasta</a>` : '<span class="s" style="display:inline">sem pasta</span>';
    const dados = ed ? `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
        ${lab('Nome completo', inp('nome_completo', x.nome_completo))}${lab('Nome curto', inp('nome', x.nome))}
        ${lab('Apelidos / grafias nas planilhas (separe por vírgula)', inp('apelidos', (x.apelidos || []).join(', ')))}
        ${lab('Vínculo', sel('vinculo', x.vinculo || '', [['', 'Equipe de corretores'], ['diretoria', 'Diretoria']]))}${lab('Tipo (equipe de corretores)', sel('tipo', naDir(x) ? 'corretor' : (x.tipo || 'corretor'), TIPO_EQ))}${lab('Papel', inp('papel', x.papel, 'Ex.: Diretor (homologa o Norte)'))}
        ${lab('Classes na Vivere (marque todas)', `<span style="display:flex;flex-wrap:wrap;gap:4px 12px;padding:4px 0">${clsL().map(([k, t]) => { const on = ('cls_' + k) in F.draft ? F.draft['cls_' + k] : (x.classes || []).includes(k); return `<label style="display:inline-flex;gap:4px;align-items:center;color:var(--ink)"><input type="checkbox" id="cc-e-cls-${esc(k)}" data-cc-cls="${esc(k)}"${on ? ' checked' : ''}>${esc(t)}</label>`; }).join('')}</span>`)}
        ${lab('Equipe', sel('equipe', x.equipe || '', [['', '—']].concat(EQ.map((e) => [e, EQ_TXT[e]]))))}
        ${lab('Situação', sel('situacao', x.situacao || 'ativo', Object.entries(SIT).map(([k, v]) => [k, v[0]])))}
        ${lab('CRECI', inp('creci', x.creci))}${lab('Entrada (AAAA-MM ou data)', inp('entrada', x.entrada))}${lab('Saída (AAAA-MM ou data)', inp('saida', x.saida))}
        ${lab('Motivo da saída', inp('saida_motivo', x.saida_motivo))}${lab('Herdeiro dos agenciamentos', sel('herdeiro_agenciamentos', x.herdeiro_agenciamentos || '', herdOps(x)))}${lab('Pasta no PC', inp('pasta', x.pasta, raiz ? raiz + '\\Nome' : ''))}</div>
        ${lab('Observações (sem dados pessoais)', `<textarea id="cc-e-obs" data-cc-campo="obs" rows="2" style="${st}">${esc(dv('obs', x.obs))}</textarea>`)}`
      : `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px 14px;font-size:13px">
        <div><span class="s" style="display:block">Nome completo</span>${esc(x.nome_completo || '—')}</div><div><span class="s" style="display:block">Equipe</span>${esc(EQ_TXT[x.equipe] || x.equipe || '—')}</div>
        <div><span class="s" style="display:block">Vínculo · tipo · papel</span>${naDir(x) ? 'Diretoria · ' : ''}${esc(TIPO[x.tipo] || '—')}${x.papel ? ' · ' + esc(x.papel) : ''}</div><div><span class="s" style="display:block">Classes</span>${clsPills(x) || '—'}</div><div><span class="s" style="display:block">CRECI</span>${esc(x.creci || '—')}</div>
        <div><span class="s" style="display:block">Entrada · saída</span>${esc(x.entrada || '—')}${x.saida ? ' · ' + esc(x.saida) : ''}${x.saida_motivo ? ` (${esc(x.saida_motivo)})` : ''}</div>${x.herdeiro_agenciamentos || x.situacao === 'em_saida' || x.situacao === 'saiu' ? `<div><span class="s" style="display:block">Herdeiro dos agenciamentos</span>${x.herdeiro_agenciamentos ? esc(herdTxt(x.herdeiro_agenciamentos)) : '<span class="pill warn">não indicado</span>'}</div>` : ''}
        <div><span class="s" style="display:block">Apelidos nas planilhas</span>${esc((x.apelidos || []).join(', ') || '—')}</div><div><span class="s" style="display:block">Pasta</span>${pasta}</div></div>${x.obs ? `<p class="nota" style="margin:8px 0 0">${esc(x.obs)}</p>` : ''}`;
    const blocoSel = (tit, k, L, M) => `<div class="card"><h2 style="margin:0 0 8px">${tit}</h2>${L.map(([i, t]) => { const v = (x[k] || {})[i] || '';
      return `<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin:4px 0"><span>${esc(t)}</span><select data-cc-sel3="${k}|${esc(i)}" aria-label="${esc(t)}" style="padding:3px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;font-size:12px"${H.db() ? '' : ' disabled'}><option value="">—</option>${Object.entries(M).map(([o, z]) => `<option value="${o}"${v === o ? ' selected' : ''}>${esc(z[0])}</option>`).join('')}</select></div>`; }).join('')}</div>`;
    const blocoCheck = (tit, k, L) => { const s = checkStat(x, k); return `<div class="card"><h2 style="margin:0 0 8px">${tit} <span class="pill ${s.feitos === s.total ? 'ok' : 'warn'}">${s.feitos}/${s.total}</span></h2>${L.map(([i, t]) => { const c = (x[k] || {})[i] || {};
      const ic = c.st === 'feito' ? '☑' : c.st === 'na' ? '–' : '☐';
      return `<div style="display:flex;gap:8px;align-items:flex-start;margin:4px 0"><button class="btn" data-cc-ck="${k}|${esc(i)}" title="Clique: feito → não se aplica → em aberto" style="min-width:28px;text-align:center"${H.db() ? '' : ' disabled'}>${ic}</button><span style="flex:1">${esc(t)}${c.em ? `<span class="s">${c.st === 'na' ? 'não se aplica' : 'feito'} em ${dt(c.em)}</span>` : ''}</span></div>`; }).join('')}</div>`; };
    const metas = PER.map(([p, tit]) => { const m = (x.metas || {})[p] || {}; const r = p === '2026' ? realizado(x, m.desde || '', '2026-12-31') : null;
      const campos = ed ? `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">${METAS.map(([k, t, tp]) => lab(t, inp(`m${p}_${k}`, m[k], tp === 't' ? 'texto livre' : '', tp === 't' ? '' : 'number'))).join('')}${lab('Vale a partir de', inp(`m${p}_desde`, m.desde, '', 'date'))}</div>${lab('Observação', inp(`m${p}_obs`, m.obs, p === '2026' ? 'Ex.: definida na reunião de Jurerê (16/10)' : ''))}`
        : (METAS.some(([k]) => m[k]) ? `<table style="font-size:13px"><tbody>${METAS.map(([k, t, tp]) => m[k] ? `<tr><td>${esc(t)}</td><td class="n"><b>${tp === 'r' ? brl0(m[k]) : esc(m[k])}</b></td><td class="n">${r && tp !== 't' ? `realizado ${tp === 'r' ? brl0(r[k]) : r[k]}` : ''}</td></tr>` : '').join('')}</tbody></table>${m.desde ? `<p class="nota" style="margin:4px 0 0">Conta a partir de ${dt(m.desde)}.${m.obs ? ' ' + esc(m.obs) : ''}</p>` : (m.obs ? `<p class="nota" style="margin:4px 0 0">${esc(m.obs)}</p>` : '')}` : '<p class="nota" style="margin:0">Sem meta registrada.</p>');
      return `<div class="card"><h2 style="margin:0 0 8px">${esc(tit)}</h2>${campos}</div>`; }).join('');
    const naAba = C ? `<p class="nota" style="margin:8px 0 0">Na aba Corretores: ${C.agenciamentos ? `${C.agenciamentos.ativos} imóveis ativos agenciados (${C.agenciamentos.total} no total)` : 'sem agenciamentos'}${C.leads ? ` · ${C.leads.total} leads recebidos` : ''}${C.ranking && Number(C.ranking.pos) > 0 ? ` · ${C.ranking.pos}º no Placar` : ''}. <button class="btn" data-aba="corretores">Abrir Corretores</button></p>` : '<p class="nota" style="margin:8px 0 0">Ainda não aparece na aba Corretores (entra na próxima atualização do HUB).</p>';
    const saida = x.situacao === 'em_saida' || x.situacao === 'saiu';
    const acoes = H.db() ? (ed ? `<button class="btn" data-cc-salvar="${esc(x._id)}">Salvar</button><button class="btn" data-cc-edit="0">Cancelar</button>`
      : `<button class="btn" data-cc-edit="1">Editar ficha</button>${x.situacao === 'em_entrada' && checkStat(x, 'checklist_entrada').feitos === checkStat(x, 'checklist_entrada').total ? `<button class="btn" data-cc-mudar="ativo">Concluir entrada</button>` : ''}${!saida ? `<button class="btn" data-cc-mudar="em_saida">Registrar saída</button>` : ''}${x.situacao === 'em_saida' ? `<button class="btn" data-cc-mudar="saiu">Concluir saída</button>` : ''}`) : '';
    return `<div class="card" id="cc-ficha" style="margin-bottom:14px;border-color:var(--accent)">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><h3 style="margin:0">${esc(nomeDe(x))} ${pill(SIT, x.situacao)}</h3><div class="filtros" style="margin:0">${acoes}<button class="btn" data-cc-fechar="1">Fechar</button></div></div>
      ${F.erro ? `<p style="color:var(--bad);margin:8px 0 0">${esc(F.erro)}</p>` : ''}
      <div style="margin-top:10px">${dados}</div>${naAba}
      <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:12px">
        ${blocoSel('Acessos', 'acessos', itens('acessos'), ST_AC)}${blocoSel('Documentos', 'documentos', itens('documentos'), ST_DOC)}
        ${blocoCheck('Checklist de entrada', 'checklist_entrada', itens('entrada'))}${saida ? blocoCheck('Checklist de saída', 'checklist_saida', itens('saida')) : ''}
      </div>
      <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:12px">${metas}</div>
      ${(x.historico || []).length ? `<details style="margin-top:10px"><summary class="s" style="cursor:pointer">Histórico (${x.historico.length})</summary><ul style="margin:6px 0 0 16px;padding:0">${x.historico.slice(-15).reverse().map((h) => `<li class="s">${dt(h.em)} — ${esc(h.o_que)}</li>`).join('')}</ul></details>` : ''}
    </div>`;
  }

  // ---------------------------------------------------------------- ações
  async function salvar(id) { const x = (H.S[CF] || {})[id] || {}; F.erro = '';
    const c = {}; ['nome_completo', 'nome', 'vinculo', 'tipo', 'papel', 'equipe', 'situacao', 'creci', 'entrada', 'saida', 'saida_motivo', 'herdeiro_agenciamentos', 'pasta', 'obs'].forEach((k) => { c[k] = val(k); });
    c.apelidos = val('apelidos').split(',').map((s) => s.trim()).filter(Boolean);
    c.classes = clsL().filter(([k]) => { const el = document.getElementById('cc-e-cls-' + k); return el ? el.checked : ('cls_' + k) in F.draft ? !!F.draft['cls_' + k] : (x.classes || []).includes(k); }).map((z) => z[0]);
    if (c.vinculo === 'diretoria') c.tipo = c.classes.includes('diretor') ? 'diretor' : 'vinculado';
    if (!c.nome_completo && !c.nome) { F.erro = 'Informe ao menos o nome.'; H.pede(); return; }
    const metas = Object.assign({}, x.metas || {}); PER.forEach(([p]) => { const m = {}; METAS.concat([['desde'], ['obs']]).forEach(([k, , tp]) => { const v = val(`m${p}_${k}`); if (v !== '') m[k] = tp === 'n' || tp === 'r' ? Number(v) : v; });
      if (Object.keys(m).length) metas[p] = Object.assign({ definida_em: (x.metas && x.metas[p] && x.metas[p].definida_em) || H.hojeISO() }, m); else delete metas[p]; });
    c.metas = metas;
    const mud = Object.keys(c).filter((k) => JSON.stringify(c[k] ?? '') !== JSON.stringify(x[k] ?? (k === 'apelidos' || k === 'classes' ? [] : k === 'metas' ? {} : '')));
    if (!mud.length) { F.edit = false; F.draft = {}; H.pede(); return; }
    if (await grava(id, c, 'editado: ' + mud.join(', '))) { F.edit = false; F.draft = {}; H.pede(); } }
  async function criar() { F.erro = ''; const nc = val('n_nome_completo'), nm = val('n_nome') || nc;
    if (!nc) { F.erro = 'Informe o nome completo.'; H.pede(); return; }
    const usados = new Set(Object.keys(H.S[CF] || {}).concat(Object.keys(H.S.corretores || {})).concat(Object.keys(H.params().corretores_info || {})));
    let id = slug(nc.split(/\s+/)[0]); if (usados.has(id)) id = slug(nc); let k = 2; const b = id; while (usados.has(id)) id = b + '-' + (k++);
    const ent = val('n_entrada') || H.hojeISO();
    const dir = val('n_vinculo') === 'diretoria'; const tp = dir ? 'vinculado' : (val('n_tipo') || 'corretor'); const raizP = (dir ? cfg().pastas_diretoria : cfg().pastas_raiz) || '';
    const ok = await grava(id, { nome: nm, nome_completo: nc, nome_fonte: 'cadastro no HUB', apelidos: [], tipo: tp, vinculo: dir ? 'diretoria' : '', classes: tp === 'corretor' ? ['corretor'] : [], papel: '', equipe: val('n_equipe'), situacao: 'em_entrada', entrada: ent, saida: '', creci: val('n_creci'), pasta: raizP ? raizP + '\\' + nc : '', obs: '', acessos: {}, documentos: {}, checklist_entrada: {}, checklist_saida: {}, metas: {} }, 'ficha criada', true);
    if (ok) { F.novo = false; F.draft = {}; F.sel = id; F.edit = false; H.pede(); } }
  async function mudar(id, para) { const x = (H.S[CF] || {})[id] || {}; const c = { situacao: para };
    if (para === 'em_saida') { if (!confirm(`Registrar a saída de ${nomeDe(x)}? Abre o checklist de saída. Pela regra de 18/11/2026, quem sai indica o corretor que herda os agenciamentos (Editar ficha › Herdeiro dos agenciamentos); sem indicação, a Vivere assume.`)) return; c.saida = H.hojeISO(); }
    if (para === 'saiu') { const s = checkStat(Object.assign({ _id: id }, x), 'checklist_saida'); if (s.feitos < s.total && !confirm(`Ainda falta ${s.total - s.feitos} item(ns) do checklist de saída. Concluir mesmo assim?`)) return;
      if (!x.herdeiro_agenciamentos) { if (!confirm(`${nomeDe(x)} não indicou herdeiro dos agenciamentos. Pela regra de 18/11/2026, a Vivere assume e a Diretoria pode redistribuí-los. Concluir a saída assim?`)) return; c.herdeiro_agenciamentos = HERD_VIV; } }
    await grava(id, c, 'situação: ' + (SIT[para] || [para])[0]); }
  async function ciclo(id, k, i) { const x = (H.S[CF] || {})[id] || {}; const C = Object.assign({}, x[k] || {}); const cur = (C[i] || {}).st;
    const nx = cur === 'feito' ? 'na' : cur === 'na' ? '' : 'feito'; if (nx) C[i] = { st: nx, em: H.hojeISO() }; else delete C[i];
    const L = itens(k === 'checklist_saida' ? 'saida' : 'entrada'); const t = (L.find((z) => z[0] === i) || [i, i])[1];
    await grava(id, { [k]: C }, `${k === 'checklist_saida' ? 'saída' : 'entrada'}: ${t} → ${nx === 'feito' ? 'feito' : nx === 'na' ? 'não se aplica' : 'em aberto'}`); }
  async function sel3(id, k, i, v) { const x = (H.S[CF] || {})[id] || {}; const C = Object.assign({}, x[k] || {}); if (v) C[i] = v; else delete C[i];
    const L = itens(k); const t = (L.find((z) => z[0] === i) || [i, i])[1]; await grava(id, { [k]: C }, `${k === 'acessos' ? 'acesso' : 'documento'}: ${t} → ${v ? ((k === 'acessos' ? ST_AC : ST_DOC)[v] || [v])[0] : '—'}`); }

  // ---------------------------------------------------------------- registro e eventos (prefixo data-cc-)
  H.registrar({ id: ID, aba: 'Cadastro', grupo: 'gestao', colecoes: [CF, CG], // na Gestão desde 19/10/2026 (pedido do Cleiton)
    tipos: { cc_entrada: 'Cadastro — entrada parada', cc_saida: 'Cadastro — saída com acessos', cc_ficha: 'Cadastro — ficha incompleta' },
    render, foco(alvo) { if (alvo && (H.S[CF] || {})[alvo]) { F.sel = alvo; F.edit = false; } } });
  document.addEventListener('click', async (e) => {
    const t = (s) => e.target.closest('[data-cc-' + s + ']'); let b;
    if ((b = t('sit'))) { F.sit = b.dataset.ccSit; H.pede(); return; }
    if ((b = t('convite'))) { const fm = cfg().formulario || {}; H.copiaTexto(`Olá! Para atualizar o seu cadastro na Vivere, preencha este formulário até sexta, ${dt(fm.prazo)}: ${fm.link_curto}\nLeva uns 5 minutos. Obrigado!`, b); return; }
    if ((b = t('sel'))) { F.sel = F.sel === b.dataset.ccSel ? '' : b.dataset.ccSel; F.edit = false; F.draft = {}; F.erro = ''; H.pede(); setTimeout(() => { const el = document.getElementById('cc-ficha'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); return; }
    if ((b = t('fechar'))) { F.sel = ''; F.edit = false; F.draft = {}; F.erro = ''; H.pede(); return; }
    if ((b = t('edit'))) { F.edit = b.dataset.ccEdit === '1'; F.draft = {}; F.erro = ''; H.pede(); return; }
    if ((b = t('novo'))) { F.novo = b.dataset.ccNovo === '1'; F.draft = {}; F.erro = ''; H.pede(); return; }
    if ((b = t('criar'))) { b.disabled = true; await criar(); return; }
    if ((b = t('salvar'))) { b.disabled = true; await salvar(b.dataset.ccSalvar); return; }
    if ((b = t('mudar'))) { await mudar(F.sel, b.dataset.ccMudar); return; }
    if ((b = t('ck'))) { const [k, i] = b.dataset.ccCk.split('|'); b.disabled = true; await ciclo(F.sel, k, i); return; }
  });
  document.addEventListener('change', async (e) => { const el = e.target; if (!el) return;
    if (el.id === 'cc-feq') { F.eq = el.value; H.pede(); return; }
    if (el.dataset && el.dataset.ccCls) { F.draft['cls_' + el.dataset.ccCls] = el.checked; return; }
    if (el.dataset && el.dataset.ccSel3) { const [k, i] = el.dataset.ccSel3.split('|'); await sel3(F.sel, k, i, el.value); return; }
    if (el.dataset && el.dataset.ccCampo) F.draft[el.dataset.ccCampo] = el.value; });
  let tq = null; document.addEventListener('input', (e) => { const el = e.target; if (!el) return;
    if (el.dataset && el.dataset.ccCampo) { F.draft[el.dataset.ccCampo] = el.value; return; }
    if (el.id !== 'cc-fq') return; clearTimeout(tq); const v = el.value;
    tq = setTimeout(() => { F.q = v; H.pede(); setTimeout(() => { const x = document.getElementById('cc-fq'); if (x) { x.focus(); x.setSelectionRange(v.length, v.length); } }, 30); }, 300); });
})();
