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
     m.tour(id);   // Tour 3D: voa até o ponto e gira a câmera em volta (para ao tocar no mapa; sem giro com "reduzir movimento")
     m.perto(id);  // O que há por perto: liga as camadas de praias, mercados, escolas… (OpenStreetMap, sem custo) com o ponto como referência
   A biblioteca (MapLibre 5.24.1, versão "csp", com o worker em arquivo próprio) fica hospedada só no app (GitHub Pages,
   pasta vendor/): o HUB e o painel a carregam pelo endereço VENDOR abaixo, inclusive no claude.ai. */
(function () {
  if (window.VivereMapa3D) return;
  const VERSAO = '2026-11-23.6'; // .6: por perto com 13 tipos em 4 grupos de um toque (vis-mapa-proximidades-imovel, fatia C)
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
      + '.m3d-parar{position:absolute;left:50%;bottom:34px;transform:translateX(-50%);z-index:3;border:1px solid var(--line,#d5d9e0);border-radius:999px;background:var(--panel,#fff);color:var(--ink,#1c2739);font:inherit;font-size:13px;font-weight:600;padding:7px 14px;box-shadow:0 4px 14px rgba(0,0,0,.18);cursor:pointer}.m3d-parar[hidden]{display:none}'
      + '.m3d-perto{position:absolute;top:10px;right:10px;z-index:3;max-width:calc(100% - 64px);max-height:calc(100% - 46px);display:flex;flex-direction:column;align-items:flex-end;gap:6px;font-size:13px}'
      + '.m3d-perto-b{border:1px solid var(--line,#d5d9e0);border-radius:999px;background:var(--panel,#fff);color:var(--ink,#1c2739);font:inherit;font-weight:600;padding:6px 12px;box-shadow:0 3px 10px rgba(0,0,0,.15);cursor:pointer}.m3d-perto-b[aria-expanded=true]{border-color:var(--brass,#b08d57)}'
      + '.m3d-perto-p{width:290px;max-width:100%;min-height:0;flex:0 1 auto;overflow:auto;background:var(--panel,#fff);color:var(--ink,#1c2739);border:1px solid var(--line,#d5d9e0);border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.18);padding:10px 12px}.m3d-perto-p[hidden]{display:none}'
      + '.m3d-perto-t{font-weight:700;margin:0 0 6px}.m3d-perto-c{display:flex;flex-wrap:wrap;gap:5px}.m3d-perto-c button{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line,#d5d9e0);border-radius:999px;background:transparent;color:inherit;font:inherit;font-size:12px;padding:4px 9px;cursor:pointer;opacity:.62}'
      + '.m3d-perto-c button[aria-pressed=true]{opacity:1;border-color:currentColor;font-weight:600}.m3d-perto-c i{width:10px;height:10px;border-radius:50%;display:inline-block;flex:none}'
      + '.m3d-perto-g{display:grid;grid-template-columns:1fr 1fr;gap:5px}.m3d-perto-g button{border:1px solid var(--line,#d5d9e0);border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:12.5px;font-weight:600;padding:6px 8px;cursor:pointer;text-align:center;opacity:.7}'
      + '.m3d-perto-g button[aria-pressed=true]{opacity:1;border-color:var(--brass,#b08d57);background:color-mix(in srgb,var(--brass,#b08d57) 16%,transparent)}.m3d-perto-g button[aria-pressed=mixed]{opacity:1;border-style:dashed;border-color:var(--brass,#b08d57)}.m3d-perto-g small{font-weight:400;opacity:.8}'
      + '.m3d-perto-aj{margin:6px 0 4px;border:0;background:none;padding:0;color:var(--muted,#6b7280);font:inherit;font-size:12px;cursor:pointer;text-decoration:underline}.m3d-perto-c[hidden]{display:none}'
      + '.m3d-perto-l{margin:8px 0 0;padding:0;list-style:none}.m3d-perto-l li{display:flex;gap:6px;align-items:baseline;padding:3px 0;border-top:1px solid var(--line,#e4e7ec);font-size:12px;line-height:1.35}.m3d-perto-l li:first-child{border-top:0}.m3d-perto-l b{white-space:nowrap}.m3d-perto-l span{flex:1;min-width:0;overflow-wrap:anywhere}.m3d-perto-l em{font-style:normal;white-space:nowrap;color:var(--muted,#6b7280)}'
      + '.m3d-perto-r,.m3d-perto-n{margin:6px 0 0;font-size:11px;color:var(--muted,#6b7280)}@media (max-width:560px){.m3d-perto-p{width:250px}}'
      + '.m3d-caixa .maplibregl-ctrl-attrib{font-size:10px;background:color-mix(in srgb,var(--panel,#fff) 88%,transparent)!important;color:var(--muted,#667)}.m3d-caixa .maplibregl-ctrl-attrib a{color:inherit}';
    document.head.appendChild(st);
  })();

  // O que há por perto (23/11/2026, fatia 3): pontos de interesse do próprio OpenFreeMap (OpenStreetMap), camada 'poi', e as
  // faixas de areia (camada 'landcover', subclasse beach, sem nome). Sem chave nem custo. Escolha dos tipos guardada no aparelho.
  // 13 tipos em 4 grupos de um toque (23/11/2026, fatia C; decisão do Cleiton às 12h08: "bem simples e rápido organizar os filtros
  // pra não ficar o mapa muito poluído"). Os mesmos tipos da função proximidades do Supabase (cartão "Perto daqui").
  const TIPOS = [
    { id: 'mercado', nome: 'Mercados', cor: '#2e8b57', sub: ['supermarket', 'convenience', 'greengrocer', 'grocery'] },
    { id: 'farmacia', nome: 'Farmácias', cor: '#0f9b9b', cls: ['pharmacy'], sub: ['pharmacy', 'chemist'] },
    { id: 'saude', nome: 'Saúde', cor: '#d23c3c', cls: ['hospital'], sub: ['hospital', 'clinic'] },
    { id: 'escola', nome: 'Escolas', cor: '#3b6fd8', cls: ['school', 'college'], sub: ['school', 'kindergarten', 'college', 'university'] },
    { id: 'praia', nome: 'Praias', cor: '#d9a520' },
    { id: 'parque', nome: 'Parques e praças', cor: '#5a9e3a', cls: ['park'], sub: ['park'] },
    { id: 'academia', nome: 'Academias e clubes', cor: '#e07a1f', sub: ['fitness_centre', 'fitness_station', 'sports_centre'] },
    { id: 'restaurante', nome: 'Restaurantes', cor: '#8b5cf6', cls: ['restaurant', 'fast_food'], sub: ['restaurant', 'fast_food'] },
    { id: 'onibus', nome: 'Pontos de ônibus', cor: '#4b5563', sub: ['bus_stop'] },
    { id: 'terminal', nome: 'Terminais', cor: '#1f2937', sub: ['bus_station'] },
    { id: 'posto', nome: 'Postos', cor: '#b45309', cls: ['fuel'], sub: ['fuel'] },
    { id: 'banco', nome: 'Bancos', cor: '#0e7490', cls: ['bank'], sub: ['bank'] },
    { id: 'shopping', nome: 'Shoppings', cor: '#be185d', sub: ['mall'] },
  ];
  const GRUPOS = [
    { id: 'essenciais', nome: 'Essenciais', tipos: ['mercado', 'farmacia', 'saude', 'escola'] },
    { id: 'lazer', nome: 'Lazer', tipos: ['praia', 'parque', 'academia', 'restaurante'] },
    { id: 'transporte', nome: 'Transporte', tipos: ['onibus', 'terminal', 'posto'] },
    { id: 'servicos', nome: 'Serviços', tipos: ['banco', 'shopping'] },
  ];
  const TIPOS_PADRAO = ['mercado', 'farmacia', 'saude', 'escola', 'praia']; // Essenciais + praia
  const CHAVE_PERTO = 'vivere.mapa.perto';
  // a subclasse decide primeiro (ponto × terminal de ônibus; loja de departamento não é mercado), como na função do Supabase
  const tipoDoPoi = (p) => TIPOS.find((t) => t.id !== 'praia' && (t.sub || []).includes(p.subclass)) || TIPOS.find((t) => t.id !== 'praia' && (t.cls || []).includes(p.class));
  const condTipo = (t) => {
    const porSub = ['in', ['get', 'subclass'], ['literal', t.sub || []]];
    // pela classe só quando a subclasse não é de outro tipo (mesma regra do tipoDoPoi)
    const outros = TIPOS.filter((u) => u !== t && u.id !== 'praia').reduce((a, u) => a.concat(u.sub || []), []);
    return ['any', porSub, ['all', ['in', ['get', 'class'], ['literal', t.cls || []]], ['!', ['in', ['get', 'subclass'], ['literal', outros]]]]]; };
  function distM(a, b) { const R = 6371000, r = Math.PI / 180, dLa = (b[1] - a[1]) * r, dLo = (b[0] - a[0]) * r;
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
  const distTxt = (m) => m < 1000 ? Math.max(10, Math.round(m / 10) * 10) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
  function anel(c, raio) { const p = [], n = 64, la = c[1] * Math.PI / 180;
    for (let i = 0; i <= n; i++) { const a = 2 * Math.PI * i / n; p.push([c[0] + (raio / (111320 * Math.cos(la))) * Math.cos(a), c[1] + (raio / 110540) * Math.sin(a)]); }
    return { type: 'Feature', geometry: { type: 'LineString', coordinates: p }, properties: {} }; }

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
    let ok3d = false, girando = false, tourPend = null, pertoPend = false, ref = null, pertoAberto = false, pertoT = null;
    let pertoOn = new Set(); try { const g = JSON.parse(localStorage.getItem(CHAVE_PERTO) || 'null'); if (Array.isArray(g)) g.forEach((t) => TIPOS.some((x) => x.id === t) && pertoOn.add(t)); } catch (e) {}
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
      camadasPerto(vet && vet[0]);
      ok3d = true;
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
    function camadasPerto(fonte) {
      if (!fonte) return; const claro = tema === 'claro';
      if (!mapa.getLayer('perto-praia')) mapa.addLayer({ id: 'perto-praia', type: 'fill', source: fonte, 'source-layer': 'landcover', filter: ['==', ['get', 'subclass'], 'beach'],
        layout: { visibility: 'none' }, paint: { 'fill-color': '#f2cf6b', 'fill-opacity': claro ? 0.55 : 0.4, 'fill-outline-color': '#d9a520' } }, mapa.getLayer('predios-3d') ? 'predios-3d' : 'grupos');
      if (!mapa.getLayer('perto-praia-t')) mapa.addLayer({ id: 'perto-praia-t', type: 'symbol', source: fonte, 'source-layer': 'landcover', filter: ['==', ['get', 'subclass'], 'beach'], minzoom: 13,
        layout: { visibility: 'none', 'text-field': 'Praia', 'text-size': 11, 'text-font': ['Noto Sans Bold'] },
        paint: { 'text-color': claro ? '#8a6510' : '#f2cf6b', 'text-halo-color': claro ? '#ffffff' : '#0f1620', 'text-halo-width': 1.4 } }, 'grupos');
      if (!mapa.getSource('perto-anel')) mapa.addSource('perto-anel', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      if (!mapa.getLayer('perto-anel')) mapa.addLayer({ id: 'perto-anel', type: 'line', source: 'perto-anel', layout: { visibility: 'none' },
        paint: { 'line-color': claro ? '#1C2739' : '#d8c3a5', 'line-width': 1.6, 'line-opacity': 0.55, 'line-dasharray': [3, 2] } }, 'grupos');
      const cor = ['case']; TIPOS.forEach((t) => { if (t.id !== 'praia') cor.push(condTipo(t), t.cor); }); cor.push('#7a8699');
      if (!mapa.getLayer('perto-poi')) mapa.addLayer({ id: 'perto-poi', type: 'circle', source: fonte, 'source-layer': 'poi', layout: { visibility: 'none' },
        filter: ['==', ['literal', 1], 0], paint: { 'circle-color': cor, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3.5, 16, 6.5], 'circle-stroke-color': claro ? '#ffffff' : '#0f1620', 'circle-stroke-width': 1.4, 'circle-pitch-alignment': 'viewport' } }, 'grupos');
      if (!mapa.getLayer('perto-poi-t')) mapa.addLayer({ id: 'perto-poi-t', type: 'symbol', source: fonte, 'source-layer': 'poi', minzoom: 15, layout: { visibility: 'none',
        'text-field': ['coalesce', ['get', 'name'], ''], 'text-size': 11, 'text-font': ['Noto Sans Regular'], 'text-offset': [0, 0.9], 'text-anchor': 'top', 'text-max-width': 9, 'text-optional': true },
        filter: ['==', ['literal', 1], 0], paint: { 'text-color': claro ? '#33404f' : '#dfe5ee', 'text-halo-color': claro ? '#ffffff' : '#0f1620', 'text-halo-width': 1.3 } }, 'grupos');
      aplicaPerto();
    }
    // liga/desliga as camadas conforme os tipos marcados e redesenha o seletor
    function aplicaPerto() {
      if (!mapa.getLayer('perto-poi')) return;
      const ts = TIPOS.filter((t) => t.id !== 'praia' && pertoOn.has(t.id)), vis = (b) => (b ? 'visible' : 'none');
      const f = ts.length ? ['any'].concat(ts.map(condTipo)) : ['==', ['literal', 1], 0];
      mapa.setFilter('perto-poi', f); mapa.setFilter('perto-poi-t', f);
      mapa.setLayoutProperty('perto-poi', 'visibility', vis(ts.length)); mapa.setLayoutProperty('perto-poi-t', 'visibility', vis(ts.length));
      mapa.setLayoutProperty('perto-praia', 'visibility', vis(pertoOn.has('praia'))); mapa.setLayoutProperty('perto-praia-t', 'visibility', vis(pertoOn.has('praia')));
      const an = mapa.getSource('perto-anel'); if (an) an.setData({ type: 'FeatureCollection', features: ref && pertoOn.size ? [anel([ref.lng, ref.lat], 1000)] : [] });
      mapa.setLayoutProperty('perto-anel', 'visibility', vis(ref && pertoOn.size));
      pintaPerto();
    }
    // seletor "Por perto" no canto do mapa: tipos e o mais perto de cada um (a partir do imóvel escolhido ou do centro do mapa)
    const ui = document.createElement('div'); ui.className = 'm3d-perto';
    ui.innerHTML = '<button type="button" class="m3d-perto-b" aria-expanded="false" title="Essenciais, lazer, transporte e serviços por perto">📍 Por perto</button>'
      + '<div class="m3d-perto-p" role="group" aria-label="O que há por perto" hidden><p class="m3d-perto-t">O que há por perto</p><div class="m3d-perto-g"></div>'
      + '<button type="button" class="m3d-perto-aj" aria-expanded="false">Ajustar tipos ▾</button><div class="m3d-perto-c" hidden></div><ul class="m3d-perto-l"></ul><p class="m3d-perto-r"></p><p class="m3d-perto-n">Lugares do OpenStreetMap: pode faltar algum.</p></div>';
    let ajustar = false;
    const parar = document.createElement('button'); parar.type = 'button'; parar.className = 'm3d-parar'; parar.hidden = true; parar.textContent = '⏹ Parar o tour';
    el.appendChild(ui); el.appendChild(parar);
    function maisPerto() {
      const c = ref ? [ref.lng, ref.lat] : mapa.getCenter().toArray(), melhor = {}; let fs = [];
      try { fs = mapa.querySourceFeatures(mapa.getLayer('perto-poi').source, { sourceLayer: 'poi' }); } catch (e) {}
      fs.forEach((f) => { const t = tipoDoPoi(f.properties || {}); if (!t || !pertoOn.has(t.id) || !f.geometry || f.geometry.type !== 'Point') return;
        const d = distM(c, f.geometry.coordinates); if (d <= 3000 && (!melhor[t.id] || d < melhor[t.id].d)) melhor[t.id] = { d, n: f.properties.name || t.nome }; });
      if (pertoOn.has('praia')) { let ps = []; try { ps = mapa.querySourceFeatures(mapa.getLayer('perto-praia').source, { sourceLayer: 'landcover', filter: ['==', ['get', 'subclass'], 'beach'] }); } catch (e) {}
        ps.forEach((f) => { const g = f.geometry || {}, an = g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? [].concat(...g.coordinates) : [];
          an.forEach((r) => r.forEach((p) => { const d = distM(c, p); if (d <= 3000 && (!melhor.praia || d < melhor.praia.d)) melhor.praia = { d, n: 'faixa de areia' }; })); }); }
      return melhor;
    }
    function pintaPerto() {
      const p = ui.querySelector('.m3d-perto-p'), b = ui.querySelector('.m3d-perto-b'); p.hidden = !pertoAberto; b.setAttribute('aria-expanded', String(pertoAberto));
      if (!pertoAberto) return;
      ui.querySelector('.m3d-perto-g').innerHTML = GRUPOS.map((g) => { const n = g.tipos.filter((k) => pertoOn.has(k)).length;
        return '<button type="button" data-grupo="' + g.id + '" aria-pressed="' + (n === g.tipos.length ? 'true' : n ? 'mixed' : 'false') + '">' + esc(g.nome) + (n && n < g.tipos.length ? ' <small>' + n + '/' + g.tipos.length + '</small>' : '') + '</button>'; }).join('');
      const c = ui.querySelector('.m3d-perto-c'), aj = ui.querySelector('.m3d-perto-aj'); c.hidden = !ajustar; aj.setAttribute('aria-expanded', String(ajustar)); aj.textContent = ajustar ? 'Ajustar tipos ▴' : 'Ajustar tipos ▾';
      c.innerHTML = TIPOS.map((t) => '<button type="button" data-perto="' + t.id + '" aria-pressed="' + pertoOn.has(t.id) + '"><i style="background:' + t.cor + '"></i>' + esc(t.nome) + '</button>').join('');
      const m = maisPerto(), L = TIPOS.filter((t) => pertoOn.has(t.id));
      ui.querySelector('.m3d-perto-l').innerHTML = L.map((t) => '<li><b>' + esc(t.nome) + '</b><span>' + (m[t.id] ? esc(m[t.id].n) : 'nada a até 3 km nesta área do mapa') + '</span>' + (m[t.id] ? '<em>' + distTxt(m[t.id].d) + '</em>' : '') + '</li>').join('');
      ui.querySelector('.m3d-perto-r').textContent = !L.length ? 'Marque os tipos para ver no mapa.' : ref ? 'Distâncias em linha reta a partir de ' + (ref.titulo || 'o imóvel escolhido') + '; o círculo tracejado marca 1 km.' : 'Distâncias em linha reta a partir do centro do mapa.';
    }
    ui.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.classList.contains('m3d-perto-b')) { pertoAberto = !pertoAberto; if (pertoAberto && !pertoOn.size) TIPOS_PADRAO.forEach((x) => pertoOn.add(x)); }
      else if (t.dataset.perto) { const k = t.dataset.perto; if (pertoOn.has(k)) pertoOn.delete(k); else pertoOn.add(k); }
      else if (t.dataset.grupo) { const g = GRUPOS.find((x) => x.id === t.dataset.grupo); if (!g) return; // um toque: liga o grupo inteiro; tudo ligado → desliga
        const todos = g.tipos.every((k) => pertoOn.has(k)); g.tipos.forEach((k) => (todos ? pertoOn.delete(k) : pertoOn.add(k))); }
      else if (t.classList.contains('m3d-perto-aj')) { ajustar = !ajustar; pintaPerto(); return; }
      else return;
      try { localStorage.setItem(CHAVE_PERTO, JSON.stringify([...pertoOn])); } catch (e2) {}
      aplicaPerto(); if (!mapa.getLayer('perto-poi')) pintaPerto();
    });
    // a lista do mais perto acompanha o mapa (depois que os pedaços do mapa carregam)
    mapa.on('idle', () => { if (!pertoAberto || !pertoOn.size) return; clearTimeout(pertoT); pertoT = setTimeout(() => vivo && pintaPerto(), 150); });

    // Tour 3D (23/11/2026, fatia 2): voa até o ponto e dá uma volta inteira em 4 giros de 90°; qualquer toque no mapa para.
    function pararTour() { tourPend = null; if (!girando) return; girando = false; parar.hidden = true; try { mapa.stop(); } catch (e) {} }
    ['mousedown', 'touchstart', 'wheel', 'keydown'].forEach((ev) => el.addEventListener(ev, (e) => { if (girando && e.target !== parar) pararTour(); }, { passive: true }));
    parar.addEventListener('click', pararTour);
    const achar = (id) => lista.find((y) => y && String(y.id) === String(id) && y.lat != null);
    const pronto = () => ok3d && vivo; // ligado no fim de camadas(); desligado na troca de tema (o isStyleLoaded fica falso enquanto carrega pedaços)
    function tour(id) {
      const x = achar(id); if (!x) return false;
      if (!pronto()) { tourPend = id; return true; }
      pararTour(); if (popup) { popup.remove(); popup = null; }
      ref = { lat: +x.lat, lng: +x.lng, titulo: x.titulo || '' }; aplicaPerto();
      const alvo = { center: [+x.lng, +x.lat], zoom: 16.6, pitch: 62, padding: { top: 0, bottom: 0, left: 0, right: 0 } };
      if (semAnimacao()) { mapa.jumpTo(alvo); return true; } // "reduzir movimento": só mostra o ponto inclinado, sem girar
      mapa.stop(); girando = true; parar.hidden = false; let volta = 0;
      const gira = () => { if (!girando || !vivo) return; if (volta++ >= 4) { girando = false; parar.hidden = true; return; }
        mapa.once('moveend', gira); mapa.rotateTo(mapa.getBearing() + 90, { duration: 6500, easing: (t) => t }); };
      mapa.once('moveend', gira); mapa.flyTo(Object.assign({ bearing: mapa.getBearing(), duration: 2200 }, alvo));
      return true;
    }
    function perto(id) {
      const x = achar(id); if (x) ref = { lat: +x.lat, lng: +x.lng, titulo: x.titulo || '' };
      if (!pertoOn.size) TIPOS_PADRAO.forEach((t) => pertoOn.add(t)); try { localStorage.setItem(CHAVE_PERTO, JSON.stringify([...pertoOn])); } catch (e) {}
      pertoAberto = true;
      if (!pronto()) { pertoPend = x ? id : true; pintaPerto(); return !!x; }
      pararTour(); if (popup) { popup.remove(); popup = null; } aplicaPerto();
      if (x) mapa.easeTo({ center: [+x.lng, +x.lat], zoom: 15.3, pitch: 50, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: semAnimacao() ? 0 : 1000 });
      return !!x;
    }
    // pedidos que chegaram antes de o mapa ficar pronto (abrir o 3D pelo cartão, troca de tema)
    function rodaPend() { const tp = tourPend, pp = pertoPend; tourPend = null; pertoPend = false;
      if (pp) perto(pp === true ? null : pp); if (tp) tour(tp); }
    function inclinar(dur) { mapa.easeTo({ pitch: 60, bearing: -18, duration: dur }); }

    mapa.on('load', () => { clearTimeout(tempo); if (!vivo) return; const at = el.querySelector('.maplibregl-ctrl-attrib'); if (at) at.classList.remove('maplibregl-compact-show'); camadas(); inclinar(semAnimacao() ? 0 : 1200); if (op.aoAbrir) op.aoAbrir();
      rodaPend(); });
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
      pararTour(); ok3d = false; mapa.once('style.load', () => { camadas(); rodaPend(); }); mapa.setStyle(ESTILO[tema], { diff: false });
    };
    const obs = new MutationObserver(trocaTema);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null; if (mq && mq.addEventListener) mq.addEventListener('change', trocaTema);

    const inst = {
      versao: VERSAO, mapa,
      pontos(L) { lista = Array.isArray(L) ? L : []; if (!mapa.isStyleLoaded() || !mapa.getSource('pontos')) return; imagens(); mapa.getSource('pontos').setData(dados()); },
      focar(id) {
        pararTour();
        const x = lista.find((y) => y && String(y.id) === String(id)); if (!x || x.lat == null) return;
        mapa.easeTo({ center: [+x.lng, +x.lat], zoom: 16.5, pitch: 60, padding: { top: Math.round(el.clientHeight * 0.45), bottom: 0, left: 0, right: 0 }, duration: semAnimacao() ? 0 : 900 });
        if (op.aoClicar) { const html = op.aoClicar(x.id); if (popup) popup.remove(); popup = html ? new ml.Popup({ maxWidth: '290px', offset: 12, className: 'm3d-pop' }).setLngLat([+x.lng, +x.lat]).setHTML(html).addTo(mapa) : null; }
      },
      tour, perto, pararTour,
      roteiro(L) { rota = Array.isArray(L) ? L : []; const f = mapa.getSource('rota'); if (f) f.setData(dadosRota()); },
      redimensionar() { mapa.resize(); },
      destruir() { if (window.VivereMapa3D.ultimo === inst) window.VivereMapa3D.ultimo = null; girando = false; vivo = false; clearTimeout(tempo); clearTimeout(pertoT); ui.remove(); parar.remove(); obs.disconnect(); if (mq && mq.removeEventListener) mq.removeEventListener('change', trocaTema); if (popup) popup.remove(); mapa.remove(); },
    };
    window.VivereMapa3D.ultimo = inst; // para conferência pelo console
    return inst;
  }

  window.VivereMapa3D = { montar, versao: VERSAO, VENDOR };
})();
