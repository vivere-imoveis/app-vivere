// modulos/institucional.js — módulo Institucional do HUB Vivere
// Dados das empresas (Vivere Jurerê Internacional, Imóveis na Ilha SC, G Donelli) e resumo da parceria Deivis × Luciano.
// Contrato: _hub\modulos\LEIA-ME.md. Lê só as coleções institucional_*; não grava nada no banco.
// Dados de empresa (CNPJ, contatos institucionais e contas PJ) liberados pelo Cleiton em 18/10/2026. Sem CPF de pessoas.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt, brl0 = H.brl0;

  if (!document.getElementById('inst-css')) {
    const st = document.createElement('style'); st.id = 'inst-css';
    st.textContent = `
.inst-emp{display:flex;flex-direction:column;gap:10px}
.inst-emp h3{margin:0;font-family:var(--display);font-weight:500;font-size:16px;letter-spacing:.04em}
.inst-emp .papel{font-size:13px;color:var(--muted);margin:0}
.inst-dl{display:grid;grid-template-columns:minmax(96px,34%) 1fr;gap:4px 10px;margin:0;font-size:13px}
.inst-dl dt{color:var(--muted);font-size:12px}
.inst-dl dd{margin:0;overflow-wrap:anywhere}
.inst-sec{font-family:var(--display);text-transform:uppercase;letter-spacing:.14em;font-size:11px;color:var(--muted);margin:6px 0 2px}
.inst-lista{margin:0;padding:0 0 0 16px;font-size:13px}
.inst-lista li{margin:2px 0}
.inst-emp .s{display:block;color:var(--muted);font-size:12px}
.inst-alerta{background:var(--warn-bg);color:var(--warn);border-radius:6px;padding:8px 10px;font-size:12px}
.inst-alerta ul{margin:0;padding-left:16px}
.inst-acoes{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.inst-par{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.inst-par .card h4{margin:0 0 4px;font-size:13px}
.inst-par .card p{margin:0;font-size:13px}`;
    document.head.appendChild(st);
  }

  const pasta = (cam) => cam ? `<a class="btn pasta" href="abrirpasta:${encodeURIComponent(cam)}" target="_blank" rel="noopener" data-abrir-pasta="${esc(cam)}" title="Abre a pasta no Explorador e copia o caminho">Abrir pasta</a>` : '';
  const linha = (rot, val) => val ? `<dt>${rot}</dt><dd>${val}</dd>` : '';

  function cartao(e) {
    const sit = String(e.situacao || '').toLowerCase() === 'ativa' ? 'ok' : 'warn';
    const contas = (e.contas || []).map((c) => `<li>${c.atual ? '<span class="pill ok">em uso</span> ' : '<span class="pill">anterior</span> '}<b>${esc(c.banco)}</b> · ag. ${esc(c.agencia)} · conta ${esc(c.conta)}${c.pix ? `<span class="s">PIX: ${esc(c.pix)}</span>` : ''}${c.obs ? `<span class="s">${esc(c.obs)}</span>` : ''}</li>`).join('');
    const ct = e.contatos || {};
    const contatos = [ct.email ? `e-mail ${esc(ct.email)}` : '', ct.telefone ? `telefone ${esc(ct.telefone)}` : '', ct.site ? `<a href="${escUrl(ct.site)}" target="_blank" rel="noopener">${esc(ct.site.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : ''].filter(Boolean).join(' · ');
    return `<div class="card inst-emp" id="inst-${esc(e._id)}">
      <div><span class="pill ${sit}">${esc(e.situacao || '—')}</span> <span class="pill info">CNPJ ${esc(e.cnpj)}</span></div>
      <h3>${esc(e.razao)}</h3>
      <p class="papel">${esc(e.papel || '')}</p>
      <dl class="inst-dl">
        ${linha('Nome fantasia (Receita)', esc(e.fantasia_receita || ''))}
        ${linha('CRECI', esc(e.creci || ''))}
        ${linha('NIRE', esc(e.nire || ''))}
        ${linha('Inscrição municipal', esc(e.inscricao_municipal || ''))}
        ${linha('Abertura', e.abertura ? dt(e.abertura) : '')}
        ${linha('Porte', esc(e.porte || ''))}
        ${linha('Natureza', esc(e.natureza || ''))}
        ${linha('Capital social', e.capital != null ? brl0(e.capital) : '')}
        ${linha('Atividade principal', esc(e.cnae_principal || ''))}
        ${linha('Secundárias', (e.cnaes_sec || []).map(esc).join('<br>'))}
        ${linha('Endereço na Receita', esc(e.endereco_receita || ''))}
        ${linha('Endereço operacional', esc(e.endereco_operacional || ''))}
        ${linha('Contatos', contatos)}
      </dl>
      <div class="inst-sec">Sócios e administração</div>
      <ul class="inst-lista">${(e.socios || []).map((s) => `<li><b>${esc(s.nome)}</b> — ${esc(s.qualificacao || '')}${s.participacao ? ` · ${esc(s.participacao)}` : ''}</li>`).join('') || '<li>—</li>'}</ul>
      ${contas ? `<div class="inst-sec">Contas da empresa</div><ul class="inst-lista" style="list-style:none;padding:0">${contas}</ul>` : ''}
      ${(e.alertas || []).length ? `<div class="inst-alerta"><ul>${e.alertas.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
      <div class="inst-acoes">${e.qualificacao ? `<button class="btn" data-inst-qualif="${esc(e._id)}" title="${esc(e.qualificacao_obs || '')}">Copiar qualificação</button>` : ''}${pasta(e.pasta)}</div>
      <p class="nota" style="margin:0">Documentos: ${esc((e.docs || []).join(' · ') || '—')}. Fontes: ${esc(e.fontes || '—')}.${e.atualizado ? ' Conferido em ' + dt(e.atualizado) + '.' : ''}</p>
    </div>`;
  }

  function parceria() {
    const p = (H.S.institucional_parceria || {})['deivis-luciano']; if (!p) return '';
    return `<h2 style="margin-top:28px">${esc(p.titulo)}</h2>
      <p class="nota">Resumo do contrato de ${dt(p.data)} · prazo ${esc((p.prazo || '').toLowerCase())}. ${(p.partes || []).map((x) => `<b>${esc(x.papel)}</b>: ${esc(x.empresa)} (${esc(x.representante)})`).join(' · ')}. ${pasta(p.pasta)}</p>
      <div class="inst-par">${(p.blocos || []).map((b) => `<div class="card"><h4>${esc(b.t)}</h4><p>${esc(b.x)}</p></div>`).join('')}</div>
      ${(p.alertas || []).length ? `<div class="inst-alerta" style="margin-top:12px"><ul>${p.alertas.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
      <p class="nota" style="margin-top:8px">Fonte: ${esc(p.fonte || '')}.</p>`;
  }

  H.registrar({
    id: 'institucional', aba: 'Institucional', grupo: 'gestao',   // sem "depois": fica no fim do grupo, qualquer que seja a ordem de carga dos módulos
    colecoes: ['institucional_empresas', 'institucional_parceria'],
    render() {
      const L = H.lista('institucional_empresas').sort((a, b) => (a.ordem || 99) - (b.ordem || 99));
      if (!L.length) return `<h2>Institucional</h2>` + H.vazio(H.carregado.institucional_empresas ? 'Nenhuma empresa cadastrada.' : 'Carregando…');
      return `<h2>Institucional</h2>
        <p class="nota">Dados das empresas ligadas à Vivere, tirados do contrato social, do cartão CNPJ e da consulta pública da Receita. "Copiar qualificação" copia o texto para usar em contratos. Dados pessoais dos sócios (CPF, RG, endereço) não ficam aqui.</p>
        <div class="grade">${L.map(cartao).join('')}</div>${parceria()}`;
    }
  });

  // ---------------------------------------------------------------- Gestão › Institucional (20/10/2026, pedido do Cleiton)
  // Missão, visão, valores e afins em blocos editáveis (coleção institucional_cultura, doc 'geral'). O panorama inicial foi escrito
  // pelo Claude com o que o HUB sabe da Vivere e fica marcado "rascunho" até o Cleiton salvar cada bloco. O bloco Panorama mostra números ao vivo.
  const CC = 'institucional_cultura';
  const FC = { ed: '', draft: '', erro: '', novo: false, nt: '' };
  const blocos = () => { const g = (H.S[CC] || {}).geral || {}; return (g.blocos || []).slice().sort((x, y) => (x.ordem || 99) - (y.ordem || 99)); };
  function numeros() {
    const C = H.lista('contratos_locacao'); const at = C.filter((c) => (H.contratoAtivo ? H.contratoAtivo(c) : true)).length;
    const I = H.lista('imoveis').filter((x) => x.ativo); const fin = (f) => I.filter((x) => new RegExp(f, 'i').test(x.finalidade || '')).length;
    const E = H.lista('empreendimentos_fichas').length; const cor = H.lista('cadastro-corretores_fichas').filter((x) => x.situacao !== 'saiu' && x.vinculo !== 'diretoria');
    const ano = H.hojeISO().slice(0, 4); const V = H.lista('vendas').filter((v) => String(v.data || '').startsWith(ano)).length;
    const kp = (rot, n, sub) => `<div class="card"><div class="nota" style="margin:0;text-transform:uppercase;letter-spacing:.12em;font-size:11px">${rot}</div><div style="font-size:26px;margin:4px 0">${n}</div><div class="nota" style="margin:0">${sub}</div></div>`;
    return `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:8px 0">${kp('Carteira de locação', at, 'contratos administrados · meta 40')}${kp('Anúncios no site', I.length, `${fin('venda')} venda · ${fin('loca')} locação`)}${kp('Empreendimentos', E || '—', 'no cadastro')}${kp('Corretores', cor.length, `Norte ${cor.filter((x) => x.equipe === 'Norte').length} · Leste/Sul ${cor.filter((x) => x.equipe === 'Leste/Sul').length}`)}${kp('Contratos de venda em ' + ano, V, 'planilha V. Claude')}</div><p class="nota" style="margin:0 0 6px">Números ao vivo do HUB.</p>`;
  }
  const par = (s) => esc(s || '').split(/\n{2,}/).map((x) => `<p style="margin:0 0 8px">${x.split('\n').map((l) => /^\s*[-•]\s+/.test(l) ? '• ' + l.replace(/^\s*[-•]\s+/, '') : l).join('<br>')}</p>`).join('');
  function renderCultura() {
    const g = (H.S[CC] || {}).geral; const db = H.db();
    if (!g) return '<h2>Institucional</h2>' + H.vazio(H.carregado[CC] ? 'Nenhum conteúdo ainda.' : 'Carregando…');
    const st = 'width:100%;box-sizing:border-box;font:inherit;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink)';
    const card = (b) => { const ed = FC.ed === b.k && db;
      return `<div class="card" id="ic-${esc(b.k)}" style="margin-bottom:12px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:space-between"><h2 style="margin:0">${esc(b.titulo)} ${b.rascunho ? '<span class="pill warn" title="Escrito pelo Claude com o que o HUB sabe da Vivere; revise e salve">rascunho</span>' : ''}</h2>${db && !ed ? `<button class="btn" data-ic-edit="${esc(b.k)}">Editar</button>` : ''}</div>
        ${b.k === 'panorama' ? numeros() : ''}
        ${ed ? `<textarea id="ic-txt" rows="${Math.min(18, Math.max(5, String(FC.draft).split('\n').length + 2))}" style="${st};margin-top:8px">${esc(FC.draft)}</textarea><p class="nota" style="margin:4px 0">Parágrafos separados por linha em branco; linhas que começam com "- " viram itens.</p><div class="filtros" style="margin:6px 0 0"><button class="btn" data-ic-salvar="${esc(b.k)}">Salvar</button><button class="btn" data-ic-edit="">Cancelar</button>${b.k !== 'panorama' ? `<button class="btn" data-ic-del="${esc(b.k)}" style="margin-left:auto">Excluir bloco</button>` : ''}</div>`
          : `<div style="margin-top:8px;font-size:14px;line-height:1.55">${par(b.texto) || '<p class="nota">A preencher.</p>'}</div>${b.atualizado_em ? `<p class="nota" style="margin:4px 0 0">Atualizado em ${dt(b.atualizado_em)}${b.rascunho ? ' (rascunho)' : ''}.</p>` : ''}`}</div>`; };
    return `<h2>Institucional</h2><p class="nota">Quem é a Vivere: missão, visão, valores, propósito, cultura e história, para a equipe consultar e para usar em apresentações, site e treinamentos. Cada bloco é editável; o que está marcado "rascunho" foi escrito pelo Claude a partir do que o HUB sabe e espera a sua revisão. Dados das empresas (CNPJ, sócios, contas) ficam em Cadastros › Empresas do grupo.</p>
      ${FC.erro ? `<p style="color:var(--bad)">${esc(FC.erro)}</p>` : ''}${blocos().map(card).join('')}
      ${db ? (FC.novo ? `<div class="card"><label class="nota" style="margin:0">Título do bloco novo<br><input id="ic-nt" value="${esc(FC.nt)}" placeholder="Ex.: Código de conduta" style="${st}"></label><div class="filtros" style="margin:8px 0 0"><button class="btn" data-ic-criar="1">Criar</button><button class="btn" data-ic-novo="0">Cancelar</button></div></div>` : '<div class="filtros"><button class="btn" data-ic-novo="1">+ Novo bloco</button></div>') : ''}`;
  }
  async function gravaBlocos(L, desc) { const db = H.db(); if (!db) return false; const g = (H.S[CC] || {}).geral || {};
    if (/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(JSON.stringify(L))) { FC.erro = 'Parece haver CPF no texto; não salvo.'; H.pede(); return false; }
    try { await db.doc(CC + '/geral').update({ blocos: L, atualizado_em: H.hojeISO(), historico: (g.historico || []).slice(-40).concat([{ em: H.hojeISO(), o_que: desc }]) }); FC.erro = ''; return true; }
    catch (e) { FC.erro = 'Não foi possível salvar: ' + (e && e.message || e); H.pede(); return false; } }
  H.registrar({ id: 'institucional-cultura', aba: 'Institucional', grupo: 'gestao', colecoes: [CC, 'contratos_locacao', 'imoveis', 'empreendimentos_fichas', 'cadastro-corretores_fichas', 'vendas'], render: renderCultura });
  document.addEventListener('input', (ev) => { if (ev.target && ev.target.id === 'ic-txt') FC.draft = ev.target.value; if (ev.target && ev.target.id === 'ic-nt') FC.nt = ev.target.value; });
  document.addEventListener('click', async (ev) => { const t = (s) => ev.target.closest('[data-ic-' + s + ']'); let b;
    if ((b = t('edit'))) { FC.ed = b.dataset.icEdit; const x = blocos().find((z) => z.k === FC.ed); FC.draft = x ? x.texto || '' : ''; FC.erro = ''; H.pede(); return; }
    if ((b = t('salvar'))) { const k = b.dataset.icSalvar; const el = document.getElementById('ic-txt'); const v = el ? el.value : FC.draft; b.disabled = true;
      const L = blocos().map((z) => z.k === k ? Object.assign({}, z, { texto: v.trim(), rascunho: false, atualizado_em: H.hojeISO() }) : z);
      if (await gravaBlocos(L, 'bloco ' + k + ' editado')) { FC.ed = ''; FC.draft = ''; H.pede(); } return; }
    if ((b = t('del'))) { const k = b.dataset.icDel; if (!confirm('Excluir este bloco?')) return; if (await gravaBlocos(blocos().filter((z) => z.k !== k), 'bloco ' + k + ' excluído')) { FC.ed = ''; H.pede(); } return; }
    if ((b = t('novo'))) { FC.novo = b.dataset.icNovo === '1'; FC.nt = ''; H.pede(); return; }
    if ((b = t('criar'))) { const nt = (document.getElementById('ic-nt') || {}).value || FC.nt; if (!nt.trim()) return; const L = blocos(); const k = nt.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
      if (await gravaBlocos(L.concat([{ k, titulo: nt.trim(), texto: '', ordem: (Math.max(0, ...L.map((z) => z.ordem || 0)) + 1), rascunho: false, atualizado_em: H.hojeISO() }]), 'bloco novo: ' + nt.trim())) { FC.novo = false; FC.ed = k; FC.draft = ''; H.pede(); } return; }
  });

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-inst-qualif]'); if (!b) return;
    const e = (H.S.institucional_empresas || {})[b.dataset.instQualif];
    if (e && e.qualificacao) H.copiaTexto(e.qualificacao, b);
  });
})();
