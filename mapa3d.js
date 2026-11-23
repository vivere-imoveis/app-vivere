/* Mapa 3D da Vivere (23/11/2026, tarefa vis-mapa-3d-hub-painel) — o mesmo arquivo no app (painel do corretor),
   no HUB VIVERE do claude.ai e no HUB na web.
   Pedido do Cleiton (22/11/2026): o mapa interativo 3D nas 3 frentes (site, HUB e painel do corretor), ao lado do mapa 2D.
   Caminho escolhido por ele: "maquete 3D grátis" — MapLibre + relevo público da AWS + prédios em volume do OpenFreeMap,
   sem chave e sem custo (o mesmo do site, components/MapaBusca.tsx, função vista3D).
   Os pontos, filtros e regras de quem vê o quê continuam sendo os do mapa 2D: esta vista só recebe a lista já filtrada.
   Uso:
     const m = await VivereMapa3D.montar(elemento, { aoClicar(id) { return html_do_cartao_ou_null; }, aoFalhar(msg) {} });
     m.pontos([{ id, lat, lng, cor, aprox, destaque, emp, titulo }]);   // cor aceita var(--x)
     m.focar(id); m.redimensionar(); m.destruir();
   A biblioteca (MapLibre 5.24.1, versão "csp", com o worker em arquivo próprio) fica hospedada só no app (GitHub Pages,
   pasta vendor/): o HUB e o painel a carregam pelo endereço VENDOR abaixo, inclusive no claude.ai. */
(function () {
  if (window.VivereMapa3D) return;
  const VERSAO = '2026-11-23.4';
  const VENDOR = 'https://vivere-imoveis.github.io/app-vivere/vendor/';
  const ESTILO = { claro: 'https://tiles.openfreemap.org/styles/positron', escuro: 'https://tiles.openfreemap.org/styles/dark' };
  const RELEVO = 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png';
  const ILHA = [[-48.62, -27.85], [-48.33, -27.37]];
  const semAnimacao = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const temaEscuro = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // aparência da caixa e do cartão (claro e escuro pelas cores do próprio app)
  (function () {
    if (document.getElementById('css-mapa3d')) return;
    const st = document.createElement('style'); st.id = 'css-mapa3d';
    st.textContent = '.m3d-caixa{position:relative;border:1px solid var(--line,#d5d9e0);border-radius:10px;overflow:hidden;background:var(--mp-agua,#cfd8e3);z-index:0}'
      + '#pm-mapa3d{height:min(70vh,640px)}#mp-raiz #mp-mapa3d{height:min(72vh,720px);min-height:420px}'
      + '@media (max-width:900px){#mp-raiz #mp-mapa3d{height:60vh;min-height:340px}}@media (max-width:560px){#pm-mapa3d{height:62vh;min-height:320px}}'
      + '.m3d-caixa[hidden]{display:none!important}.m3d-aviso{margin:6px 0 0}'
      + '.m3d-pop .maplibregl-popup-content{background:var(--panel,#fff);color:var(--ink,#1c2739);border:1px solid var(--line,#d5d9e0);border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.18);padding:12px 14px;font:inherit}'
      + '.m3d-pop .maplibregl-popup-close-button{color:var(--muted,#6b7280);font-size:18px;padding:0 6px}'
      + '.m3d-pop.maplibregl-popup-anchor-bottom .maplibregl-popup-tip,.m3d-pop.maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip,.m3d-pop.maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip{border-top-color:var(--panel,#fff)}'
      + '.m3d-pop.maplibregl-popup-anchor-top .maplibregl-popup-tip,.m3d-pop.maplibregl-popup-anchor-top-left .maplibregl-popup-tip,.m3d-pop.maplibregl-popup-anchor-top-right .maplibregl-popup-tip{border-bottom-color:var(--panel,#fff)}'
      + '.m3d-pop.maplibregl-popup-anchor-left .maplibregl-popup-tip{border-right-color:var(--panel,#fff)}.m3d-pop.maplibregl-popup-anchor-right .maplibregl-popup-tip{border-left-color:var(--panel,#fff)}'
      + '.m3d-caixa .maplibregl-ctrl-attrib{font-size:10px;background:color-mix(in srgb,var(--panel,#fff) 88%,transparent)!important;color:var(--muted,#667)}.m3d-caixa .maplibregl-ctrl-attrib a{color:inherit}';
    document.head.appendChild(st);
  })();

  let carga = null;
  function script(src) { return new Promise((ok, er) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => er(new Error('não carregou ' + src)); document.head.appendChild(s); }); }
  function estilo(href) { if (document.querySelector('link[data-mapa3d]')) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.setAttribute('data-mapa3d', '1'); document.head.appendChild(l); }
  function carregar(vendor) {
    if (carga) return carga;
    carga = (async () => {
      estilo(vendor + 'maplibre-gl-5.24.1.css');
      if (!window.maplibregl) await script(vendor + 'maplibre-gl-csp-5.24.1.js');
      // o worker tem de ser da mesma origem da página; vindo de outra (HUB e PAINEL DO GESTOR no claude.ai, que carregam a
      // biblioteca do app), entra por um worker de uma linha que importa o arquivo
      const w = new URL(vendor + 'maplibre-gl-csp-worker-5.24.1.js', document.baseURI);
      window.maplibregl.setWorkerUrl(w.origin === location.origin ? w.href : URL.createObjectURL(new Blob(["importScripts('" + w.href + "');"], { type: 'text/javascript' })));
      return window.maplibregl;
    })();
    carga.catch(() => { carga = null; });
    return carga;
  }

  // cor de CSS (var(--x), #hex, rgb) → texto que o MapLibre entende, lido no elemento do mapa
  function corReal(el, c) {
    if (!c) return '#7a8699';
    const m = String(c).match(/^var\((--[\w-]+)\)$/); if (!m) return c;
    const v = getComputedStyle(el).getPropertyValue(m[1]).trim(); return v || '#7a8699';
  }
  // losango (empreendimentos) desenhado em pixels, uma imagem por cor
  function losango(cor, tam) {
    const cv = document.createElement('canvas'); cv.width = cv.height = tam; const g = cv.getContext('2d');
    g.fillStyle = cor; g.fillRect(0, 0, 1, 1); const [r, gg, b, a] = g.getImageData(0, 0, 1, 1).data; g.clearRect(0, 0, tam, tam);
    const d = new Uint8Array(tam * tam * 4), h = (tam - 1) / 2;
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
      const k = Math.abs(x - h) + Math.abs(y - h), i = (y * tam + x) * 4;
      if (k <= h - 2) { d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = a; } else if (k <= h) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 255; }
    }
    return { width: tam, height: tam, data: d };
  }

  async function montar(el, op) {
    op = op || {}; el.classList.add('m3d-caixa');
    const ml = await carregar(op.vendor || VENDOR);
    let tema = temaEscuro() ? 'escuro' : 'claro', lista = [], rota = [], vivo = true, popup = null, falhou = false;
    const mapa = new ml.Map({ container: el, style: ESTILO[tema], bounds: ILHA, maxZoom: 18, minZoom: 8, maxPitch: 75,
      attributionControl: { compact: true, customAttribution: 'Relevo: Terrain Tiles (AWS)' } });
    mapa.addControl(new ml.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-left');
    const falha = (msg) => { if (falhou || !vivo) return; falhou = true; if (op.aoFalhar) op.aoFalhar(msg); };
    const tempo = setTimeout(() => { if (!mapa.isStyleLoaded()) falha('O mapa 3D não respondeu: a rede deste aparelho ou desta página pode estar bloqueando os mapas.'); }, 30000);
    mapa.on('error', (e) => { const msg0 = String((e && e.error && e.error.message) || ''); if (/worker/i.test(msg0) || (!mapa.isStyleLoaded() && /fetch|Failed|NetworkError|style|CSP|Refused/i.test(msg0))) falha('Não consegui abrir o mapa 3D aqui: ' + msg0 + '.'); });

    function dados() {
      const fs = lista.filter((x) => x && x.lat != null && x.lng != null).map((x) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [+x.lng, +x.lat] },
        properties: { id: String(x.id), cor: corReal(el, x.cor), aprox: x.aprox ? 1 : 0, destaque: x.destaque ? 1 : 0, emp: x.emp ? 1 : 0, ic: x.emp ? 'los-' + corReal(el, x.cor) : '', titulo: x.titulo || '' } }));
      return { type: 'FeatureCollection', features: fs };
    }
    // roteiro de visitas: linha tracejada na ordem das paradas e o número de cada uma (roteiro-mapa.js)
    function dadosRota() {
      const p = rota.filter((x) => x && x.lat != null).map((x) => [+x.lng, +x.lat]);
      const fs = p.map((c, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: { n: String(i + 1) } }));
      if (p.length > 1) fs.unshift({ type: 'Feature', geometry: { type: 'LineString', coordinates: p }, properties: {} });
      return { type: 'FeatureCollection', features: fs };
    }
    function imagens() {
      lista.forEach((x) => { if (!x || !x.emp) return; const c = corReal(el, x.cor), n = 'los-' + c; if (!mapa.hasImage(n)) mapa.addImage(n, losango(c, 22), { pixelRatio: 1.4 }); });
    }
    function camadas() {
      const fundoClaro = tema === 'claro';
      if (!mapa.getSource('relevo')) {
        mapa.addSource('relevo', { type: 'raster-dem', tiles: [RELEVO], tileSize: 256, encoding: 'terrarium', maxzoom: 14 });
        mapa.addSource('relevo-sombra', { type: 'raster-dem', tiles: [RELEVO], tileSize: 256, encoding: 'terrarium', maxzoom: 14 });
      }
      const rot = (mapa.getStyle().layers || []).find((l) => l.type === 'symbol'); const antes = rot && rot.id;
      if (!mapa.getLayer('relevo-sombra')) mapa.addLayer({ id: 'relevo-sombra', type: 'hillshade', source: 'relevo-sombra',
        paint: { 'hillshade-exaggeration': fundoClaro ? 0.35 : 0.5, 'hillshade-shadow-color': fundoClaro ? '#5b6474' : '#000000', 'hillshade-highlight-color': fundoClaro ? '#ffffff' : '#3a4456' } }, antes);
      const vet = Object.entries(mapa.getStyle().sources || {}).find(([, v]) => v.type === 'vector');
      if (vet && !mapa.getLayer('predios-3d')) mapa.addLayer({ id: 'predios-3d', type: 'fill-extrusion', source: vet[0], 'source-layer': 'building', minzoom: 13,
        paint: { 'fill-extrusion-color': fundoClaro ? '#D9D3CA' : '#3b4352', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 0.88 } }, antes);
      mapa.setTerrain({ source: 'relevo', exaggeration: 1.5 });
      try { mapa.setSky(fundoClaro ? { 'sky-color': '#dfe9f3', 'horizon-color': '#f3f4ef', 'fog-color': '#f3f4ef', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6 } : { 'sky-color': '#0f1620', 'horizon-color': '#1b2230', 'fog-color': '#1b2230', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6 }); } catch (e) {}
      if (!mapa.getSource('pontos')) mapa.addSource('pontos', { type: 'geojson', data: dados(), cluster: true, clusterRadius: 38, clusterMaxZoom: 16 });
      const borda = fundoClaro ? '#ffffff' : '#0f1620';
      if (!mapa.getLayer('grupos')) mapa.addLayer({ id: 'grupos', type: 'circle', source: 'pontos', filter: ['has', 'point_count'],
        paint: { 'circle-color': fundoClaro ? '#1C2739' : '#d8c3a5', 'circle-radius': ['step', ['get', 'point_count'], 15, 10, 19, 40, 24], 'circle-stroke-color': borda, 'circle-stroke-width': 2 } });
      if (!mapa.getLayer('grupos-n')) mapa.addLayer({ id: 'grupos-n', type: 'symbol', source: 'pontos', filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true },
        paint: { 'text-color': fundoClaro ? '#ffffff' : '#1C2739' } });
      if (!mapa.getLayer('pontos-c')) mapa.addLayer({ id: 'pontos-c', type: 'circle', source: 'pontos', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'emp'], 0]],
        paint: { 'circle-color': ['get', 'cor'], 'circle-opacity': ['case', ['==', ['get', 'aprox'], 1], 0.25, 1],
          'circle-radius': ['case', ['==', ['get', 'destaque'], 1], 8, 6.5], 'circle-stroke-width': ['case', ['==', ['get', 'aprox'], 1], 2.4, 1.6],
          'circle-stroke-color': ['case', ['==', ['get', 'aprox'], 1], ['get', 'cor'], borda], 'circle-pitch-alignment': 'viewport' } });
      imagens();
      if (!mapa.getLayer('pontos-e')) mapa.addLayer({ id: 'pontos-e', type: 'symbol', source: 'pontos', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'emp'], 1]],
        layout: { 'icon-image': ['get', 'ic'], 'icon-allow-overlap': true, 'icon-ignore-placement': true }, paint: { 'icon-opacity': ['case', ['==', ['get', 'aprox'], 1], 0.55, 1] } });
      camadasRota();
    }
    function camadasRota() {
      if (!mapa.getSource('rota')) mapa.addSource('rota', { type: 'geojson', data: dadosRota() });
      if (!mapa.getLayer('rota-l')) mapa.addLayer({ id: 'rota-l', type: 'line', source: 'rota', filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': tema === 'claro' ? '#1C2739' : '#d8c3a5', 'line-width': 3, 'line-dasharray': [2, 1.5] } });
      if (!mapa.getLayer('rota-c')) mapa.addLayer({ id: 'rota-c', type: 'circle', source: 'rota', filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-color': tema === 'claro' ? '#1C2739' : '#d8c3a5', 'circle-radius': 10, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-pitch-alignment': 'viewport' } });
      if (!mapa.getLayer('rota-t')) mapa.addLayer({ id: 'rota-t', type: 'symbol', source: 'rota', filter: ['==', ['geometry-type'], 'Point'],
        layout: { 'text-field': ['get', 'n'], 'text-size': 11, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true, 'text-ignore-placement': true },
        paint: { 'text-color': tema === 'claro' ? '#ffffff' : '#1C2739' } });
    }
    function inclinar(dur) { mapa.easeTo({ pitch: 60, bearing: -18, duration: dur }); }

    mapa.on('load', () => { clearTimeout(tempo); if (!vivo) return; const at = el.querySelector('.maplibregl-ctrl-attrib'); if (at) at.classList.remove('maplibregl-compact-show'); camadas(); inclinar(semAnimacao() ? 0 : 1200); if (op.aoAbrir) op.aoAbrir(); });
    mapa.on('click', 'grupos', async (e) => {
      const f = e.features && e.features[0]; if (!f) return;
      const z = await mapa.getSource('pontos').getClusterExpansionZoom(f.properties.cluster_id);
      mapa.easeTo({ center: f.geometry.coordinates, zoom: Math.min(z + 0.2, 18), duration: semAnimacao() ? 0 : 600 });
    });
    const clicaPonto = (e) => {
      const f = e.features && e.features[0]; if (!f || !op.aoClicar) return;
      const html = op.aoClicar(f.properties.id); if (popup) { popup.remove(); popup = null; }
      if (html) popup = new ml.Popup({ maxWidth: '290px', offset: 12, className: 'm3d-pop' }).setLngLat(f.geometry.coordinates).setHTML(html).addTo(mapa);
    };
    mapa.on('click', 'pontos-c', clicaPonto); mapa.on('click', 'pontos-e', clicaPonto);
    ['grupos', 'pontos-c', 'pontos-e'].forEach((l) => { mapa.on('mouseenter', l, () => { mapa.getCanvas().style.cursor = 'pointer'; }); mapa.on('mouseleave', l, () => { mapa.getCanvas().style.cursor = ''; }); });

    // tema claro/escuro acompanha o botão do app
    const trocaTema = () => {
      const t = temaEscuro() ? 'escuro' : 'claro'; if (t === tema || !vivo) return; tema = t;
      mapa.once('style.load', () => { camadas(); }); mapa.setStyle(ESTILO[tema], { diff: false });
    };
    const obs = new MutationObserver(trocaTema);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null; if (mq && mq.addEventListener) mq.addEventListener('change', trocaTema);

    const inst = {
      versao: VERSAO, mapa,
      pontos(L) { lista = Array.isArray(L) ? L : []; if (!mapa.isStyleLoaded() || !mapa.getSource('pontos')) return; imagens(); mapa.getSource('pontos').setData(dados()); },
      focar(id) {
        const x = lista.find((y) => y && String(y.id) === String(id)); if (!x || x.lat == null) return;
        mapa.easeTo({ center: [+x.lng, +x.lat], zoom: 16.5, pitch: 60, padding: { top: Math.round(el.clientHeight * 0.45), bottom: 0, left: 0, right: 0 }, duration: semAnimacao() ? 0 : 900 });
        if (op.aoClicar) { const html = op.aoClicar(x.id); if (popup) popup.remove(); popup = html ? new ml.Popup({ maxWidth: '290px', offset: 12, className: 'm3d-pop' }).setLngLat([+x.lng, +x.lat]).setHTML(html).addTo(mapa) : null; }
      },
      roteiro(L) { rota = Array.isArray(L) ? L : []; const f = mapa.getSource('rota'); if (f) f.setData(dadosRota()); },
      redimensionar() { mapa.resize(); },
      destruir() { if (window.VivereMapa3D.ultimo === inst) window.VivereMapa3D.ultimo = null; vivo = false; clearTimeout(tempo); obs.disconnect(); if (mq && mq.removeEventListener) mq.removeEventListener('change', trocaTema); if (popup) popup.remove(); mapa.remove(); },
    };
    window.VivereMapa3D.ultimo = inst; // para conferência pelo console
    return inst;
  }

  window.VivereMapa3D = { montar, versao: VERSAO, VENDOR };
})();
