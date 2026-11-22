// modulos/concorrentes.js — aba "Concorrentes" do HUB Vivere (construção "concorrentes", 1ª fatia em 17/11/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Pedido do Cleiton (17/11/2026): monitorar as imobiliárias concorrentes da Ilha
// (Buzz, Ibagy, On House, Santa Ilha, Auxiliadora Predial e outras que vierem): imóveis anunciados, captações vindas
// delas, taxas e condições, cadastro e o que for captado ao longo do tempo. A aba vai para o módulo estratégico de SWOT
// quando ele existir (área "Estratégia", tarefa do núcleo); até lá fica em Gestão.
// • Coleções (base única no Supabase, nível diretoria): concorrentes_cadastro (uma ficha por imobiliária) e
//   concorrentes_ocorrencias (fatos datados: captação vinda dela, imóvel perdido para ela, anúncio, taxa, outro).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc;
  const ID = 'concorrentes';
  const C = { cad: 'concorrentes_cadastro', oc: 'concorrentes_ocorrencias' };
  const TIPOS = {
    captacao: ['Captação vinda dela', 'ok'],
    perda: ['Imóvel perdido para ela', 'bad'],
    anuncio: ['Anúncio ou preço', 'info'],
    taxa: ['Taxa ou condição', 'warn'],
    outro: ['Outro', '']
  };
  const QUEM = ['Cleiton', 'Deivis', 'Luciano', 'Nícollas', 'William'];
  const CAMPOS = [
    ['regiao', 'Região de atuação'], ['frentes', 'Frentes'], ['agencias', 'Agências'], ['creci', 'CRECI'],
    ['fundacao', 'Fundação'], ['site', 'Site'], ['site_ficha', 'Como funciona o site'], ['telefone', 'Telefone'],
    ['taxa_adm', 'Taxa de administração'], ['taxa_intermediacao', 'Intermediação / 1º aluguel'], ['garantias', 'Garantias aceitas'],
    ['anuncios_qtd', 'Imóveis anunciados'], ['anuncios_em', 'Contagem em'],
    ['fonte_info', 'Fonte das informações'], ['a_confirmar', 'A levantar'], ['obs', 'Observações']
  ];
  const F = { aberto: '', form: '', edita: '', tipo: '' };

  const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const slug = (s) => sem(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';
  const agora = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const dt = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; };
  const pill = (t) => { const r = TIPOS[t] || [t || '—', '']; return `<span class="pill ${r[1]}">${esc(r[0])}</span>`; };
  const vivos = (c) => H.lista(c).filter((x) => !String(x._id).startsWith('_') && !x.removido_em);
  const grava = (path, dados, modo) => { const db = H.db(); if (!db) return Promise.reject(new Error('sem banco')); const r = db.doc(path); return Promise.resolve(modo === 'set' ? r.set(dados) : r.update(dados)); };
  const css = 'font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px';
  const op = (v, t, s) => `<option value="${esc(v)}"${s ? ' selected' : ''}>${esc(t)}</option>`;
  const inp = (nome, ph, v, tipo, w) => `<input name="${nome}" type="${tipo || 'text'}" placeholder="${esc(ph)}" value="${esc(v == null ? '' : v)}" style="${css};${w ? 'width:' + w : 'flex:1 1 180px'}">`;

  const fichas = () => vivos(C.cad).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt'));
  const ocorr = () => vivos(C.oc).sort((a, b) => String(b.data || b.em || '').localeCompare(String(a.data || a.em || '')));
  const ocDe = (id) => ocorr().filter((o) => o.concorrente === id);
  const nomeDe = (id) => { const x = (H.S[C.cad] || {})[id]; return x ? x.nome : id; };
  const taxasTxt = (x) => [x.taxa_adm && `adm. ${x.taxa_adm}`, x.taxa_intermediacao && `interm. ${x.taxa_intermediacao}`].filter(Boolean).join(' · ') || '—';

  function kpis() {
    const L = fichas(), O = ocorr(), mes = H.hojeISO().slice(0, 7);
    const capt = O.filter((o) => o.tipo === 'captacao').length;
    const noMes = O.filter((o) => String(o.data || '').slice(0, 7) === mes).length;
    const falta = L.filter((x) => x.a_confirmar).length;
    const k = (n, t, cls) => `<div class="card"><div class="s">${t}</div><div style="font-size:1.6em;font-weight:700"${cls ? ` class="${cls}"` : ''}>${n}</div></div>`;
    return `<div class="grade" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 12px">${
      k(L.length, 'Concorrentes monitoradas')}${k(capt, 'Captações vindas delas', capt ? 'vmais' : '')}${k(noMes, 'Ocorrências no mês')}${k(falta, 'Fichas com dado a levantar')}</div>`;
  }

  function fichaC(x) {
    const lin = (r, v) => `<div style="display:grid;grid-template-columns:minmax(120px,170px) 1fr;gap:8px;padding:4px 0;border-bottom:1px solid var(--line)"><span class="s">${r}</span><span>${v}</span></div>`;
    const val = (k, v) => k === 'site' && v ? `<a class="lk" href="${esc(/^https?:/.test(v) ? v : 'https://' + v)}" target="_blank" rel="noopener">${esc(v)}</a>`
      : k === 'anuncios_em' ? dt(v) : esc(v);
    const dados = CAMPOS.filter(([k]) => x[k] != null && x[k] !== '').map(([k, r]) => lin(r, val(k, x[k]))).join('') || '<span class="s">Sem dados ainda.</span>';
    const hist = ocDe(x._id).map((o) => `<div style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="s">${dt(o.data)} · ${esc(o.por || '')}</span> ${pill(o.tipo)}<div>${esc(o.texto || '')}</div></div>`).join('') || '<span class="s">Nenhuma ocorrência.</span>';
    const edita = F.edita === x._id ? `<form data-conc-form="edita" data-id="${esc(x._id)}" class="card" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0">
        ${CAMPOS.map(([k, r]) => `<label class="s" style="display:flex;flex-direction:column;gap:2px;flex:1 1 200px">${esc(r)}${inp(k, r, x[k], k === 'anuncios_em' ? 'date' : k === 'anuncios_qtd' ? 'number' : 'text', '100%')}</label>`).join('')}
        <button class="btn" type="submit">Salvar ficha</button><button class="btn" type="button" data-conc-fecha>Cancelar</button></form>` : '';
    return `<div class="card" style="margin:8px 0 14px">
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between"><h3 style="margin:0">${esc(x.nome)}</h3>
        <span style="display:flex;flex-wrap:wrap;gap:6px"><button class="btn" type="button" data-conc-edita="${esc(x._id)}">Editar ficha</button><button class="btn" type="button" data-conc-fecha>Fechar</button></span></div>
      ${edita}<div style="margin-top:8px">${dados}</div>
      <h4 style="margin:12px 0 4px">Ocorrências</h4>${hist}
      <form data-conc-form="ocorrencia" data-id="${esc(x._id)}" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px">
        <select name="tipo" style="${css}">${Object.entries(TIPOS).map(([k, t]) => op(k, t[0], k === 'captacao')).join('')}</select>
        ${inp('texto', 'O que aconteceu (ex.: proprietário saiu dela e veio para a Vivere)')}
        ${inp('data', '', H.hojeISO(), 'date', '150px')}
        <select name="por" style="${css}">${QUEM.map((q) => op(q, q, q === 'Cleiton')).join('')}</select>
        <button class="btn" type="submit">Registrar ocorrência</button></form></div>`;
  }

  function tabela() {
    const L = fichas();
    if (!L.length) return H.vazio(H.carregado[C.cad] ? 'Nenhuma concorrente cadastrada.' : 'Carregando…');
    return `<div class="tabela"><table><thead><tr><th>Imobiliária</th><th>Região</th><th>Frentes</th><th>Taxas</th><th>Captações vindas</th><th>Anúncios</th><th>Última ocorrência</th></tr></thead><tbody>${
      L.map((x) => { const O = ocDe(x._id), cap = O.filter((o) => o.tipo === 'captacao').length;
        return `<tr id="conc-${esc(x._id)}"><td><button class="lk" type="button" data-conc-abre="${esc(x._id)}" style="background:none;border:0;cursor:pointer;font:inherit;padding:0;text-align:left">${esc(x.nome)} ${F.aberto === x._id ? '▴' : '▾'}</button>${x.a_confirmar ? ' <span class="pill warn">a levantar</span>' : ''}</td>
        <td>${esc(x.regiao || '—')}</td><td>${esc(x.frentes || '—')}</td><td>${esc(taxasTxt(x))}</td>
        <td class="n">${cap}</td><td class="n">${x.anuncios_qtd != null && x.anuncios_qtd !== '' ? esc(x.anuncios_qtd) + (x.anuncios_em ? ` <span class="s">(${dt(x.anuncios_em)})</span>` : '') : '—'}</td>
        <td>${O[0] ? dt(O[0].data) : '—'}</td></tr>`; }).join('')}</tbody></table></div>`;
  }

  function secOcorrencias() {
    const O = ocorr().filter((o) => !F.tipo || o.tipo === F.tipo);
    const filtro = `<select data-conc-tipo style="${css}">${op('', 'Todos os tipos', !F.tipo)}${Object.entries(TIPOS).map(([k, t]) => op(k, t[0], F.tipo === k)).join('')}</select>`;
    const tab = O.length ? `<div class="tabela"><table><thead><tr><th>Data</th><th>Imobiliária</th><th>Tipo</th><th>O que aconteceu</th><th>Quem</th></tr></thead><tbody>${
      O.map((o) => `<tr><td>${dt(o.data)}</td><td>${esc(nomeDe(o.concorrente))}</td><td>${pill(o.tipo)}</td><td>${esc(o.texto || '')}</td><td>${esc(o.por || '')}</td></tr>`).join('')}</tbody></table></div>`
      : H.vazio(H.carregado[C.oc] ? 'Nenhuma ocorrência com esse filtro.' : 'Carregando…');
    return `<h3 style="margin:18px 0 8px">Histórico de ocorrências</h3><div class="filtros" style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px">${filtro}</div>${tab}`;
  }

  H.registrar({
    id: ID, aba: 'Concorrentes', grupo: 'gestao', colecoes: [C.cad, C.oc],
    render() {
      const ab = F.aberto && fichas().find((x) => x._id === F.aberto);
      const novo = F.form === 'nova' ? `<form data-conc-form="nova" class="card" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px">
          ${inp('nome', 'Nome da imobiliária')}${inp('regiao', 'Região de atuação')}${inp('frentes', 'Frentes (venda, locação…)')}${inp('site', 'Site')}
          <button class="btn" type="submit">Salvar concorrente</button><button class="btn" type="button" data-conc-fecha>Cancelar</button></form>` : '';
      return `<h2>Concorrentes</h2>
        <p class="nota">Imobiliárias da Ilha que a Vivere acompanha: cadastro, taxas e condições, imóveis anunciados e as captações vindas de cada uma. A diretoria vê e grava. Esta aba vai para o módulo de estratégia (SWOT) quando ele existir.</p>
        ${kpis()}<div class="filtros" style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px"><button class="btn" type="button" data-conc-nova>+ Concorrente</button></div>
        ${novo}${ab ? fichaC(ab) : ''}${tabela()}${secOcorrencias()}`;
    },
    foco(alvo) { F.aberto = alvo || ''; H.pede(); },
    busca(q) {
      const s = sem(q); if (!s) return [];
      return fichas().filter((x) => sem([x.nome, x.regiao, x.frentes, x.agencias, x.obs].join(' ')).includes(s)).slice(0, 8)
        .map((x) => ({ grp: 'Concorrentes', tit: x.nome, sub: x.regiao || x.frentes || '', ir: { aba: ID, alvo: x._id } }));
    }
  });

  const fim = () => { F.form = ''; F.edita = ''; H.pede(); };
  const erro = (b) => (e) => { if (b) b.disabled = false; alert('Não gravou: ' + (e && e.message || e)); };

  document.addEventListener('submit', (e) => {
    const f = e.target.closest && e.target.closest('form[data-conc-form]'); if (!f) return;
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f).entries()), b = f.querySelector('button[type=submit]'); if (b) b.disabled = true;
    const tipo = f.dataset.concForm, id = f.dataset.id;
    if (tipo === 'nova') {
      const nome = String(v.nome || '').trim(); if (!nome) { if (b) b.disabled = false; alert('Informe o nome.'); return; }
      let nid = slug(nome); if ((H.S[C.cad] || {})[nid]) nid += '-' + Date.now().toString(36).slice(-4);
      grava(`${C.cad}/${nid}`, { nome, regiao: v.regiao || '', frentes: v.frentes || '', site: v.site || '', monitorar: true, criado_em: H.hojeISO(), a_confirmar: 'taxas, agências e anúncios' }, 'set')
        .then(() => { F.aberto = nid; fim(); }, erro(b));
      return;
    }
    if (tipo === 'edita') {
      const muda = {}; CAMPOS.forEach(([k]) => { if (k in v) muda[k] = k === 'anuncios_qtd' && v[k] !== '' ? +v[k] : v[k]; });
      muda.atualizado_em = agora();
      grava(`${C.cad}/${id}`, muda).then(fim, erro(b));
      return;
    }
    if (tipo === 'ocorrencia') {
      const texto = String(v.texto || '').trim(); if (!texto) { if (b) b.disabled = false; alert('Descreva a ocorrência.'); return; }
      const oid = `oc-${String(v.data || H.hojeISO()).replace(/-/g, '')}-${id}-${Date.now().toString(36).slice(-5)}`;
      grava(`${C.oc}/${oid}`, { concorrente: id, tipo: v.tipo || 'outro', texto, data: v.data || H.hojeISO(), por: v.por || 'Cleiton', em: agora() }, 'set').then(fim, erro(b));
    }
  });

  document.addEventListener('change', (e) => { const s = e.target.closest && e.target.closest('[data-conc-tipo]'); if (s) { F.tipo = s.value; H.pede(); } });

  document.addEventListener('click', (e) => {
    const q = (s) => e.target.closest && e.target.closest(s);
    let b;
    if ((b = q('[data-conc-abre]'))) { F.aberto = F.aberto === b.dataset.concAbre ? '' : b.dataset.concAbre; F.edita = ''; H.pede(); return; }
    if ((b = q('[data-conc-edita]'))) { F.edita = F.edita === b.dataset.concEdita ? '' : b.dataset.concEdita; H.pede(); return; }
    if (q('[data-conc-nova]')) { F.form = F.form === 'nova' ? '' : 'nova'; H.pede(); return; }
    if (q('[data-conc-fecha]')) { if (F.form || F.edita) fim(); else { F.aberto = ''; H.pede(); } }
  });
})();
