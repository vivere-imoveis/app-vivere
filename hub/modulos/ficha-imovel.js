/* HUB VIVERE — módulo ficha-imovel (31/10/2026)
   Completa o perfil de Cadastros › Imóveis com tudo o que está no anúncio do site:
   galeria completa (com visualizador), título, descrição, valor por m² e a pasta de fotos no Drive
   (ficha-imovel_config/pastas → p: { REF: [{ id, c }] }: uma pasta abre direto; várias, um botão por pasta; nenhuma, busca pela ref.).
   Dados: ficha-imovel_galeria (g0…gN → i: { 'i-<id do anúncio>': { t, d, f:[foto], lido_em } }) e ficha-imovel_config/geral.
   Sem aba própria: o módulo cadastro-imoveis chama window.HUB_FICHA.bloco(L) dentro do perfil.
   Em standby (decisão do Cleiton, 31/10/2026): marca d'água padrão e subpastas 01 Originais · 02 Editadas · 03 Site com marca,
   a definir com o Nícollas e o William. Até lá, "alta qualidade" = maior tamanho publicado no site. */
(function () {
  const H = window.HUB; if (!H) return;
  const ID = 'ficha-imovel', GAL = 'ficha-imovel_galeria', CF = 'ficha-imovel_config', CAP = 'ficha-imovel_capas', FT = 'ficha-imovel_fotos';
  // ficha-imovel_fotos (02/11/2026): f0…fN → i: { <id do anúncio>: { n, s:[{ a:'/_blob/<id>', o:[[y, altura]] }], sig, em } }
  // uma imagem por anúncio (fotos empilhadas, 480 px) nos arquivos do próprio HUB; a grade recorta cada foto. Fonte única: os painéis recebem cópia.
  // ficha-imovel_capas (02/11/2026): c0…cN → i: { <id do anúncio>: miniatura da 1ª foto em data URI } — a página publicada não carrega imagem de fora
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cfg = () => ((H.S[CF] || {}).geral) || {};
  const CDN = () => cfg().cdn || 'https://www.viverenapraia.com.br/imagens/imoveis/';
  const url = (f) => /^https:\/\//.test(f) ? f : CDN() + (/\.[a-z]{3,4}$/i.test(f) ? f : f + '.jpg'); /* 22/11/2026: foto do site novo (endereço completo) */
  // 17/11/2026 (vis-hub-app-carregamento-rapido, escolha do Cleiton: carregar só ao abrir a aba): a galeria (~0,7 MB) e as capas
  // (~2,3 MB, lidas do banco do artefato) só são pedidas quando uma tela usa foto (Imóveis, Cadastros, perfil). Antes vinham na abertura do HUB.
  let PEDIU = false;
  function pedeDados() { if (PEDIU) return; PEDIU = true; setTimeout(() => { try { H.registrar({ id: 'ficha-imovel-dados', colecoes: [GAL, CAP] }); } catch (e) { PEDIU = false; } }, 0); }
  let IDX = null, IDX_SIG = '';
  function indice() { pedeDados(); const G = H.S[GAL] || {}; const sig = Object.keys(G).map((k) => k + ':' + ((G[k] || {}).em || '')).join('|');
    if (IDX && sig === IDX_SIG) return IDX; IDX = {}; IDX_SIG = sig; Object.values(G).forEach((doc) => Object.assign(IDX, (doc && doc.i) || {})); return IDX; }
  const de = (anuId) => indice()['i-' + anuId] || null;
  let CI = null, CI_SIG = '';
  function capa(anuId) { pedeDados(); const C = H.S[CAP] || {}; const sig = Object.keys(C).map((k) => k + ':' + ((C[k] || {}).em || '')).join('|');
    if (!CI || sig !== CI_SIG) { CI = {}; CI_SIG = sig; Object.values(C).forEach((doc) => Object.assign(CI, (doc && doc.i) || {})); } return CI[anuId] || null; }
  let FI = null, FI_SIG = '';
  function guardadas(anuId) { const C = H.S[FT] || {}; const sig = Object.keys(C).map((k) => k + ':' + ((C[k] || {}).em || '')).join('|');
    if (!FI || sig !== FI_SIG) { FI = {}; FI_SIG = sig; Object.values(C).forEach((doc) => Object.assign(FI, (doc && doc.i) || {})); } return FI[anuId] || null; }
  // quadros de um anúncio guardado no HUB: [{ a, y, h, f }] (f = nome da foto no site, só quando a contagem bate)
  function quadros(anuId, nomes) { const g = guardadas(anuId); if (!g || !Array.isArray(g.s)) return null; const q = [];
    g.s.forEach((p) => (p.o || []).forEach((c) => { if (p.a && /^\/_blob\/[0-9a-f]+$/.test(p.a)) q.push({ a: p.a, y: +c[0] || 0, h: +c[1] || 1 }); }));
    if (Array.isArray(g.f) && g.f.length === q.length) nomes = g.f; // nomes gravados junto com a cópia (02/11/2026)
    const bate = Array.isArray(nomes) && nomes.length === q.length; q.forEach((x, i) => { x.f = bate ? nomes[i] : ''; }); return q.length ? q : null; }
  // recorte: a caixa mostra só a faixa [y, y+h] da imagem empilhada (480 px); margin-top em % conta sobre a largura
  // na miniatura (caixa 4:3) a foto cobre a caixa: mais larga que 4:3 cresce na largura; mais alta transborda em cima e embaixo
  function recorte(q, alt, mini) { const ar = 480 / q.h; const w = mini && ar > 4 / 3 ? `;width:${(ar / (4 / 3) * 100).toFixed(2)}%` : '';
    return `<span class="fi-cr" style="aspect-ratio:${ar.toFixed(4)}${w}"><img src="${esc(q.a)}" alt="${esc(alt || '')}" loading="lazy" style="margin-top:-${(q.y / 4.8).toFixed(4)}%"></span>`; }
  const brl = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  const dt = (s) => s ? String(s).slice(0, 10).split('-').reverse().join('/') : '';

  // visualizador (um só para a página)
  const V = { fotos: [], i: 0, ref: '' };
  function abre(fotos, i, ref) { V.fotos = fotos; V.i = i; V.ref = ref; desenha(); }
  function fecha() { const el = document.getElementById('fi-vis'); if (el) el.remove(); document.removeEventListener('keydown', tecla); }
  function tecla(e) { if (e.key === 'Escape') fecha(); else if (e.key === 'ArrowRight') passo(1); else if (e.key === 'ArrowLeft') passo(-1); }
  function passo(n) { if (!V.fotos.length) return; V.i = (V.i + n + V.fotos.length) % V.fotos.length; desenha(); }
  function desenha() {
    let el = document.getElementById('fi-vis');
    if (!el) { el = document.createElement('div'); el.id = 'fi-vis'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Fotos do anúncio');
      el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);display:flex;flex-direction:column;color:#fff';
      document.body.appendChild(el); document.addEventListener('keydown', tecla);
      let x0 = null; el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) passo(dx < 0 ? 1 : -1); x0 = null; }, { passive: true }); }
    const q = V.fotos[V.i]; const u = q.f ? url(q.f) : ''; const ar = 480 / q.h;
    el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;flex-wrap:wrap">
        <b style="flex:1;min-width:0">${esc(V.ref)} · foto ${V.i + 1} de ${V.fotos.length}</b>
        ${u ? `<a href="${escUrl(u)}" target="_blank" rel="noopener" style="color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:6px;padding:6px 10px;text-decoration:none;white-space:nowrap">Abrir no maior tamanho ↗</a>` : ''}
        <button data-fi-x="1" aria-label="Fechar" style="background:none;border:1px solid rgba(255,255,255,.5);color:#fff;border-radius:6px;padding:6px 12px;font-size:16px;cursor:pointer">✕</button></div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;min-height:0;padding:0 6px 6px">
        <button data-fi-p="-1" aria-label="Anterior" style="background:rgba(255,255,255,.12);border:0;color:#fff;font-size:26px;width:44px;height:64px;border-radius:6px;cursor:pointer;flex:none">‹</button>
        <span class="fi-vq" style="aspect-ratio:${ar.toFixed(4)};width:min(calc(100vw - 112px), calc((100dvh - 150px) * ${ar.toFixed(4)}), 960px)">${recorte(q, 'Foto ' + (V.i + 1) + ' do anúncio ' + V.ref)}</span>
        <button data-fi-p="1" aria-label="Próxima" style="background:rgba(255,255,255,.12);border:0;color:#fff;font-size:26px;width:44px;height:64px;border-radius:6px;cursor:pointer;flex:none">›</button></div>
      <p style="margin:0;padding:6px 12px 12px;font-size:12px;opacity:.75">Cópia guardada no HUB (480 px); o maior tamanho fica no site (até 1200 px). Fotos em alta qualidade, editadas e com a marca padrão: a organizar no Drive com o Nícollas e o William.</p>`;
  }

  // bloco do perfil — L = anúncios da unidade (objetos de imoveis com _id, ref, valor, finalidade, ativo); det = características
  function bloco(L, det) {
    L = (L || []).filter((x) => x && x._id); if (!L.length) return '';
    const comDados = L.map((x) => ({ x, g: de(x._id) })).filter((o) => o.g);
    const site = []; const vistos = new Set(); let ref = L[0].ref || '';
    comDados.forEach((o) => (o.g.f || []).forEach((f) => { if (!vistos.has(f)) { vistos.add(f); site.push(f); } }));
    // fotos guardadas no HUB, sem repetir a mesma foto entre os anúncios da unidade (venda, aluguel, temporada)
    const fotos = []; const ja = new Set();
    L.forEach((x) => { const g = de(x._id); const q = quadros(x._id, g && g.f); if (!q) return;
      if (q.some((z) => !z.f)) { if (!fotos.length) fotos.push(...q); return; }  // sem nomes não dá para tirar repetidas: só vale como primeira
      if (fotos.length && !fotos[0].f) return; q.forEach((z) => { if (ja.has(z.f)) return; ja.add(z.f); fotos.push(z); }); });
    if (comDados[0]) ref = comDados[0].x.ref || ref;
    const g0 = (comDados[0] || {}).g || {};
    const area = det && (det.area_util || det.area);
    const m2 = H.m2 ? L.map((x) => { const m = H.m2.anu(x._id); return m ? `${H.m2.fmt(m.v)} (${m.fin === 'V' ? 'venda' : 'aluguel'}${x.ativo === false ? ', inativo' : ''})` : ''; }).filter(Boolean) : area ? L.filter((x) => x.valor && x.ativo !== false).map((x) => {
      const fin = /_V$/.test(x._id) ? 'venda' : /_T$/.test(x._id) ? 'temporada' : 'aluguel';
      return fin === 'venda' ? `${brl(x.valor / area)}/m² (venda)` : fin === 'aluguel' ? `${brl(x.valor / area)}/m² (aluguel)` : '';
    }).filter(Boolean) : [];
    const refs = [...new Set(L.map((x) => x.ref).filter(Boolean))];
    const PM = ((H.S[CF] || {}).pastas || {}).p || {};
    const drive = refs.map((r) => {
      const P = PM[String(r).toUpperCase()] || [];
      if (P.length === 1) return `<a class="btn" href="https://drive.google.com/drive/folders/${encodeURIComponent(P[0].id)}" target="_blank" rel="noopener" title="${esc(P[0].c)} (00 - Imóveis Site)">📁 Pasta ${esc(r)} no Drive</a>`;
      if (P.length > 1) return P.map((x) => `<a class="btn" href="https://drive.google.com/drive/folders/${encodeURIComponent(x.id)}" target="_blank" rel="noopener" title="${esc(x.c)} (00 - Imóveis Site)">📁 ${esc(x.c.split(' / ').pop())}</a>`).join('');
      return `<a class="btn" href="https://drive.google.com/drive/search?q=${encodeURIComponent(r)}" target="_blank" rel="noopener" title="Pasta ainda não ligada: procura ${esc(r)} no Drive da Vivere (00 - Imóveis Site)">📁 Pasta ${esc(r)} no Drive 🔎</a>`;
    }).join('');
    const mostra = fotos.slice(0, 12);
    const grade = fotos.length ? `<div class="fi-grade">${mostra.map((q, i) => `<button class="fi-th" data-fi-abre="${i}" data-fi-ref="${esc(ref)}" aria-label="Abrir foto ${i + 1}">${recorte(q, '', true)}</button>`).join('')}</div>
      ${fotos.length > mostra.length ? `<button class="btn" data-fi-abre="${mostra.length}" data-fi-ref="${esc(ref)}" style="margin-top:8px">Ver todas as ${fotos.length} fotos</button>` : ''}`
      : site.length ? `<p class="nota" style="margin:0">${site.length} foto${site.length === 1 ? '' : 's'} no site, ainda não copiada${site.length === 1 ? '' : 's'} para o HUB: entram na próxima atualização.</p>`
      : '<p class="nota" style="margin:0">Sem fotos lidas no anúncio do site.</p>';
    const desc = g0.d ? `<details class="fi-desc"${g0.d.length < 600 ? ' open' : ''}><summary>Descrição do anúncio</summary><div style="white-space:pre-line;margin-top:6px">${esc(g0.d)}</div></details>` : '';
    window.__fiFotos = window.__fiFotos || {}; window.__fiFotos[ref] = fotos;
    return `<style>.fi-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px}
      .fi-th{padding:0;border:1px solid var(--line);border-radius:6px;overflow:hidden;background:none;cursor:pointer;aspect-ratio:4/3;position:relative;min-width:0}
      .fi-cr{display:block;overflow:hidden;width:100%}
      .fi-th .fi-cr{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}
      .fi-cr img{display:block;width:100%;max-width:none;height:auto}
      .fi-vq{display:block;max-width:100%;border-radius:4px;overflow:hidden}
      .fi-desc summary{cursor:pointer;font-weight:600}
      .fi-acoes{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}</style>
      <h3 class="ci-sec">Fotos e anúncio<span class="s">${site.length} foto${site.length === 1 ? '' : 's'} do site${g0.lido_em ? ' · lido em ' + dt(g0.lido_em) : ''}</span></h3>
      <div class="card">${g0.t ? `<p style="margin:0 0 8px;font-weight:600">${esc(g0.t)}</p>` : ''}${grade}
        ${m2.length ? `<p class="nota" style="margin:8px 0 0">Valor por m²: ${esc(m2.join(' · '))}</p>` : ''}
        ${desc ? `<div style="margin-top:10px">${desc}</div>` : ''}
        <div class="fi-acoes">${drive}</div></div>`;
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-fi-abre]'); if (a) { const ref = a.dataset.fiRef; const f = (window.__fiFotos || {})[ref] || []; if (f.length) abre(f, Number(a.dataset.fiAbre) || 0, ref); return; }
    if (!document.getElementById('fi-vis')) return;
    const p = e.target.closest('[data-fi-p]'); if (p) { passo(Number(p.dataset.fiP)); return; }
    if (e.target.closest('[data-fi-x]') || e.target.id === 'fi-vis') fecha();
  });

  window.HUB_FICHA = { bloco, de, url, capa, quadros, versao: '2026-11-17.1' };
  H.registrar({ id: ID, colecoes: [CF, FT] }); // GAL e CAP: pedeDados(), na 1ª tela que usa foto
})();
/* m2-privativa-20261107: R$/m² de área privativa (HUB.m2) */
