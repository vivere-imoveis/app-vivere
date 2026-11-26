// modulos/pendencias-cadastro.js — aba "Pendências de cadastro" (CRM) no HUB Vivere (construção "pendencias-cadastro", 15/11/2026)
// F4 da tarefa vis-enderecos-completos-agenciadores. Contrato: _hub\modulos\LEIA-ME.md.
// Pedido do Cleiton (15/11/2026): "a Vivere precisa ter SEMPRE o endereço completo de todo imóvel, principalmente nos cadastros";
// escopo ampliado nos cartões: pendências claras por corretor (qual informação falta em qual imóvel) + leads, e a lista do que
// William e Nicollas levam ao Imobibrasil (a correção da Vivian, do painel ou do HUB prevalece sobre a coleta do Imobibrasil).
// • Lê: pendencias_cadastro (um doc por painel + _resumo) e pendencias_levar_ib (um doc por imóvel), nível diretoria.
//   Quem grava: o banco (privado.pend_hub_rodar), em até 1 min depois de cada mudança e a cada 30 min. Este módulo não grava nada.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc;
  const ID = 'pendencias-cadastro', CP = 'pendencias_cadastro', CL = 'pendencias_levar_ib';
  const APP = 'https://vivere-imoveis.github.io/app-vivere/painel.html?ver=';
  // 16/11/2026 (P3a de vis-vivian-cadastro-imovel-ia): grupo 'divulgacao' = placa da Vivere em todo imóvel e fotos das áreas de
  // lazer em condomínio, prédio e loteamento (imoveis_divulgacao; gravam a Vivian e o app). O banco recalcula em até 1 min.
  const GRUPOS = [['endereco', 'Endereço'], ['proprietario', 'Proprietário'], ['valores', 'Valores'], ['caracteristicas', 'Características'], ['divulgacao', 'Placa e lazer']];
  const CAMPO = { logradouro: 'Rua', numero: 'Número', complemento: 'Unidade/complemento', cep: 'CEP', edificio: 'Nome do condomínio',
    bairro: 'Bairro', iptu: 'IPTU', condominio: 'Condomínio (valor)', privativa: 'Área privativa', terreno: 'Área do terreno',
    dormitorios: 'Dormitórios', banheiros: 'Banheiros', garagem: 'Vagas', 'proprietario.cpf': 'CPF/CNPJ do proprietário',
    'proprietario.email': 'E-mail do proprietário', 'proprietario.celular': 'Celular do proprietário' };
  const ORIGEM = { vivian: 'Vivian', painel: 'Painel do corretor', hub: 'HUB', claude: 'Claude' };
  const MOTIVO = { sem_contato_48h: ['Sem contato em 48 h', 'warn'], parado_7d: ['Parado há 7 dias', 'info'] };
  const st = { painel: '', grupo: 'todos', ver: 'imoveis', pg: 0, pp: 50 };
  try { const v = +localStorage.getItem('hubv.pendcad.pp'); if (v === 50 || v === 100) st.pp = v; } catch (_) {}
  const n = (v) => Number(v || 0).toLocaleString('pt-BR');
  const hora = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : (s ? esc(s) : '—'); };
  const resumo = () => (H.S[CP] || {})._resumo || null;
  const paineis = () => H.lista(CP).filter((p) => p._id.charAt(0) !== '_')
    .sort((a, b) => ((b.n_imoveis || 0) + (b.n_leads || 0)) - ((a.n_imoveis || 0) + (a.n_leads || 0)) || String(a.nome || a._id).localeCompare(String(b.nome || b._id), 'pt-BR'));
  const levar = () => H.lista(CL).sort((a, b) => String(a.ref || a._id).localeCompare(String(b.ref || b._id), 'pt-BR'));
  const nLevar = () => levar().reduce((s, x) => s + ((x.itens || []).length), 0);
  const primeiro = (nm) => String(nm || '').split(/\s+/).slice(0, 2).join(' ');
  const grupoN = (p, g) => +((p.grupos || {})[g] || 0);

  function kpis() {
    const r = resumo() || {}; const g = r.grupos || {};
    const c = (rot, num, sub, cor) => `<div class="card"><div class="s">${rot}</div><div class="num"${cor ? ` style="color:var(--${cor})"` : ''}>${num}</div><div class="s">${sub}</div></div>`;
    return `<div class="resumo-cob">
      ${c('Imóveis ativos com pendência', `${n(r.imoveis_pendentes)} de ${n(r.ativos)}`, `${n(r.itens)} informações faltando · ${n(r.orfaos)} de ex-corretores ou sem corretor`, r.imoveis_pendentes ? 'warn' : 'ok')}
      ${c('Imóveis sem endereço completo', n(g.endereco), `${n(g.proprietario)} sem dados do proprietário · ${n(g.valores)} sem valores · ${n(g.caracteristicas)} sem características · ${n(g.divulgacao)} sem placa ou fotos do lazer`, g.endereco ? 'warn' : 'ok')}
      ${c('Leads pendentes', n(r.leads), `${n(r.leads_48h)} sem contato em 48 h · ${n(r.leads_7d)} parados há 7 dias`, r.leads ? 'warn' : 'ok')}
      ${c('Levar ao Imobibrasil', n(r.levar_itens), r.levar_itens ? `informações corrigidas em ${n(r.levar_imoveis)} imóve${r.levar_imoveis === 1 ? 'l' : 'is'}` : 'nenhuma correção esperando o Imobibrasil', r.levar_itens ? 'bad' : 'ok')}
    </div>`;
  }

  function tabCorretores(P) {
    const linhas = P.map((p) => `<tr id="pcad-${esc(p._id)}"${st.painel === p._id ? ' class="realce"' : ''}>
      <td><b>${esc(p.nome || p._id)}</b><span class="s">painel ${esc(p._id)}${p.n_orfaos ? ` · ${n(p.n_orfaos)} de ex-corretores ou sem corretor` : ''}</span></td>
      <td class="n">${n(p.n_imoveis)}</td>${GRUPOS.map(([g]) => `<td class="n">${grupoN(p, g) ? n(grupoN(p, g)) : '—'}</td>`).join('')}
      <td class="n">${n(p.n_leads)}${p.n_leads_48h ? `<span class="s">${n(p.n_leads_48h)} sem contato em 48 h</span>` : ''}</td>
      <td class="ta-acoes"><div class="filtros" style="margin:0"><button class="btn" data-pcad-ver="${esc(p._id)}"${st.painel === p._id ? ' aria-pressed="true"' : ''}>Ver a lista</button><a class="btn" href="${esc(APP + encodeURIComponent(p._id))}" target="_blank" rel="noopener">Abrir no app</a></div></td></tr>`).join('');
    return `<div class="tabela"><table><thead><tr><th>Corretor</th><th class="n">Imóveis</th>${GRUPOS.map(([, r]) => `<th class="n" title="Imóveis com alguma falta em ${r.toLowerCase()}">${r}</th>`).join('')}<th class="n">Leads</th><th>Abrir</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  // ajusta a página antes de fatiar: a lista pode encolher em tempo real (o corretor corrige) com o diretor numa página adiante
  function fatia(L) { const nPg = Math.max(1, Math.ceil(L.length / st.pp)); if (st.pg >= nPg) st.pg = nPg - 1; if (st.pg < 0) st.pg = 0; return L.slice(st.pg * st.pp, (st.pg + 1) * st.pp); }
  function paginador(total, alvo) {
    if (total <= 50) return '';
    const nPg = Math.ceil(total / st.pp);
    return `<div class="filtros pag" data-pcad-pag="${alvo}"><span class="s">${n(st.pg * st.pp + 1)}–${n(Math.min(total, (st.pg + 1) * st.pp))} de ${n(total)}</span>
      <button class="btn" data-pcad-pg="-1"${st.pg ? '' : ' disabled'}>‹ Anterior</button><button class="btn" data-pcad-pg="1"${st.pg < nPg - 1 ? '' : ' disabled'}>Próxima ›</button>
      <span class="pp"><span class="s">Por página</span><button class="btn" data-pcad-pp="50" aria-pressed="${st.pp === 50}">50</button><button class="btn" data-pcad-pp="100" aria-pressed="${st.pp === 100}">100</button></span></div>`;
  }

  function detalhe(P) {
    const p = P.find((x) => x._id === st.painel); if (!p) return '';
    const opts = P.map((x) => `<option value="${esc(x._id)}"${x._id === p._id ? ' selected' : ''}>${esc(x.nome || x._id)} (${n(x.n_imoveis)} imóveis · ${n(x.n_leads)} leads)</option>`).join('');
    const abas = `<div class="filtros"><button class="btn" data-pcad-aba="imoveis" aria-pressed="${st.ver === 'imoveis'}">Imóveis (${n(p.n_imoveis)})</button><button class="btn" data-pcad-aba="leads" aria-pressed="${st.ver === 'leads'}">Leads (${n(p.n_leads)})</button></div>`;
    let corpo;
    if (st.ver === 'leads') {
      const L = p.leads || []; const pg = fatia(L);
      corpo = L.length ? `${paginador(L.length, 'leads')}<div class="tabela"><table><thead><tr><th>Lead</th><th>Etapa</th><th>Pendência</th><th>Desde</th></tr></thead><tbody>${pg.map((l) => { const m = MOTIVO[l.motivo] || [l.rotulo || l.motivo, '']; return `<tr><td><b>${esc(l.nome || '(sem nome)')}</b></td><td>${esc(l.etapa || '—')}</td><td><span class="pill ${m[1]}">${esc(m[0])}</span></td><td>${hora(l.desde)}</td></tr>`; }).join('')}</tbody></table></div>${paginador(L.length, 'leads')}`
        : H.vazio('Nenhum lead pendente neste painel.');
    } else {
      const chips = `<div class="filtros"><span class="s">Falta:</span><button class="btn" data-pcad-grupo="todos" aria-pressed="${st.grupo === 'todos'}">Tudo</button>${GRUPOS.map(([g, r]) => `<button class="btn" data-pcad-grupo="${g}" aria-pressed="${st.grupo === g}">${r} (${n(grupoN(p, g))})</button>`).join('')}</div>`;
      const I = (p.imoveis || []).map((x) => ({ x, f: (x.faltam || []).filter((f) => st.grupo === 'todos' || f[0] === st.grupo) })).filter((y) => y.f.length);
      const pg = fatia(I);
      corpo = chips + (I.length ? `${paginador(I.length, 'imoveis')}<div class="tabela"><table><thead><tr><th>Imóvel</th><th>Bairro</th><th>Agenciador</th><th class="n">Itens</th><th>O que falta</th></tr></thead><tbody>${pg.map(({ x, f }) => `<tr><td><b>${esc(x.ref || x.id)}</b><span class="s">${esc([x.tipo, x.finalidade].filter(Boolean).join(' · '))}</span></td><td>${esc(x.bairro || '—')}</td><td>${esc(x.agenciador || 'sem corretor')}${x.orfao ? ' <span class="pill info">ex-corretor ou sem corretor</span>' : ''}</td><td class="n">${n(f.length)}</td><td class="ta-larga">${f.map((y) => esc(y[1])).join(' · ')}</td></tr>`).join('')}</tbody></table></div>${paginador(I.length, 'imoveis')}`
        : H.vazio('Nada faltando neste grupo.'));
    }
    return `<div class="card" id="pcad-detalhe" style="margin-top:14px"><div class="filtros" style="margin-top:0"><label class="s" for="pcad-sel">Lista de</label><select id="pcad-sel">${opts}</select><a class="btn" href="${esc(APP + encodeURIComponent(p._id))}" target="_blank" rel="noopener">Abrir no app</a><button class="btn" data-pcad-fechar="1">Fechar a lista</button></div>${abas}${corpo}</div>`;
  }

  function textoLevar(L) {
    return L.map((x) => `${x.ref || x.imovel_id} (${x.agenciador || 'sem corretor'})\n` + (x.itens || []).map((i) => `  • ${CAMPO[i.campo] || i.campo}: ${i.valor_correto || '(apagar)'}${i.valor_imobibrasil ? ` — no Imobibrasil hoje: ${i.valor_imobibrasil}` : ''}`).join('\n')).join('\n\n');
  }
  function secLevar() {
    const L = levar();
    const intro = '<h2 style="margin-top:22px">Levar ao Imobibrasil</h2><p class="nota">Informações corrigidas pela Vivian, pelo painel do corretor ou pelo HUB que ainda estão diferentes no Imobibrasil. No HUB, nos painéis, nas fichas do Drive e na vitrine do site a correção já vale; William e Nicollas acertam o anúncio no Imobibrasil e o item sai daqui sozinho na próxima coleta.</p>';
    if (!L.length) return intro + H.vazio(H.carregado[CL] ? 'Nenhuma correção esperando o Imobibrasil.' : 'Carregando…');
    const linhas = L.flatMap((x) => (x.itens || []).map((i, k) => { const s = /^proprietario\./.test(i.campo) ? ' data-sens' : '';
      return `<tr${k ? '' : ` id="plev-${esc(x._id)}"`}><td><b>${esc(x.ref || x.imovel_id)}</b></td><td>${esc(x.agenciador ? (H.op && H.op.nomeCorretor ? H.op.nomeCorretor(x.agenciador) : x.agenciador) : 'sem corretor')}</td><td>${esc(CAMPO[i.campo] || i.campo)}</td><td${s}>${esc(i.valor_imobibrasil || '—')}</td><td${s}><b>${esc(i.valor_correto || '(apagar)')}</b></td><td>${esc(ORIGEM[i.origem] || i.origem || '—')}${i.por ? `<span class="s">${esc(i.por)}</span>` : ''}</td><td>${hora(i.em)}</td></tr>`; })).join('');
    return intro + `<div class="filtros"><button class="btn" data-pcad-copiar="1">Copiar a lista para o Imobibrasil</button></div><div class="tabela"><table><thead><tr><th>Imóvel</th><th>Agenciador</th><th>Informação</th><th>No Imobibrasil</th><th>Correto</th><th>Corrigido por</th><th>Quando</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  function render() {
    const P = paineis();
    const topo = '<h2>Pendências de cadastro</h2><p class="nota">O que falta em cada imóvel ativo pelo padrão de cadastro completo do agenciamento (endereço completo, proprietário com CPF e e-mail, valores e características) e os leads sem contato registrado em 48 h ou parados há 7 dias, por corretor. Imóveis de ex-corretores ou sem corretor ficam com William e Nicollas. Recalculado sozinho em até 1 minuto depois de cada mudança e a cada 30 minutos. O corretor vê e corrige os seus no app, em ⚠ Pendências.</p>';
    if (!P.length && !resumo()) return topo + H.vazio(H.carregado[CP] ? 'Nenhuma pendência de cadastro gravada.' : 'Carregando…') + secLevar();
    if (st.painel && !P.some((p) => p._id === st.painel)) st.painel = '';
    return topo + kpis() + '<h2 style="margin-top:8px">Por corretor</h2>' + tabCorretores(P) + detalhe(P) + secLevar();
  }

  const redesenha = () => H.pede();
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-pcad-ver],[data-pcad-aba],[data-pcad-grupo],[data-pcad-pg],[data-pcad-pp],[data-pcad-fechar],[data-pcad-copiar]');
    if (!t) return;
    const d = t.dataset;
    if (d.pcadVer !== undefined) { st.painel = st.painel === d.pcadVer ? '' : d.pcadVer; st.pg = 0; st.grupo = 'todos'; st.ver = 'imoveis'; redesenha();
      if (st.painel) setTimeout(() => { const el = document.getElementById('pcad-detalhe'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); return; }
    if (d.pcadAba) { st.ver = d.pcadAba; st.pg = 0; redesenha(); return; }
    if (d.pcadGrupo) { st.grupo = d.pcadGrupo; st.pg = 0; redesenha(); return; }
    if (d.pcadPg) { st.pg = Math.max(0, st.pg + (+d.pcadPg)); redesenha(); return; }
    if (d.pcadPp) { st.pp = +d.pcadPp === 100 ? 100 : 50; st.pg = 0; try { localStorage.setItem('hubv.pendcad.pp', String(st.pp)); } catch (_) {} redesenha(); return; }
    if (d.pcadFechar) { st.painel = ''; redesenha(); return; }
    if (d.pcadCopiar) { const txt = textoLevar(levar()); try { H.copiaTexto(txt); } catch (_) { try { navigator.clipboard.writeText(txt); } catch (__) {} } t.textContent = 'Lista copiada'; setTimeout(() => { t.textContent = 'Copiar a lista para o Imobibrasil'; }, 2000); }
  });
  document.addEventListener('change', (e) => { if (e.target && e.target.id === 'pcad-sel') { st.painel = e.target.value; st.pg = 0; st.grupo = 'todos'; redesenha(); } });

  H.registrar({
    id: ID, aba: 'Pendências de cadastro', grupo: 'crm', colecoes: [CP, CL], render,
    dicaBusca: 'Buscar nas pendências: corretor, código do imóvel, bairro ou lead…',
    contador: () => nLevar(),
    foco(alvo) { const P = paineis(); const a = String(alvo || ''); if (P.some((p) => p._id === a)) { st.painel = a; st.pg = 0; st.ver = 'imoveis'; } },
    busca(q) {
      const t = String(q || '').toLowerCase().trim(); if (!t) return [];
      const out = [];
      paineis().forEach((p) => {
        if (String(p.nome || p._id).toLowerCase().includes(t)) out.push({ grp: 'Pendências de cadastro', tit: `${p.nome || p._id} · ${n(p.n_imoveis)} imóveis e ${n(p.n_leads)} leads pendentes`, sub: 'Por corretor', ir: { aba: ID, linha: 'pcad-' + p._id, alvo: p._id } });
        (p.imoveis || []).forEach((x) => { if ([x.ref, x.id, x.bairro].join(' ').toLowerCase().includes(t)) out.push({ grp: 'Pendências de cadastro', tit: `${x.ref || x.id} · falta ${n((x.faltam || []).length)} ${((x.faltam || []).length === 1) ? 'informação' : 'informações'}`, sub: `${primeiro(p.nome)} · ${x.bairro || ''}`, ir: { aba: ID, linha: 'pcad-' + p._id, alvo: p._id } }); });
        (p.leads || []).forEach((l) => { if (String(l.nome || '').toLowerCase().includes(t)) out.push({ grp: 'Pendências de cadastro', tit: `${l.nome} · ${(MOTIVO[l.motivo] || [l.rotulo])[0]}`, sub: `lead de ${primeiro(p.nome)}`, ir: { aba: ID, linha: 'pcad-' + p._id, alvo: p._id } }); });
      });
      levar().forEach((x) => { if ([x.ref, x.imovel_id, x.agenciador].join(' ').toLowerCase().includes(t)) out.push({ grp: 'Pendências de cadastro', tit: `${x.ref || x.imovel_id} · levar ao Imobibrasil`, sub: (x.itens || []).map((i) => CAMPO[i.campo] || i.campo).join(', '), ir: { aba: ID, linha: 'plev-' + x._id } }); });
      return out.slice(0, 12);
    },
  });
})();
