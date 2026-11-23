/* Roteiro de visitas do mapa (23/11/2026, tarefa vis-mapa-crm-video-otimizacao, fatia 1) — o mesmo arquivo no painel
   do corretor (app), no HUB VIVERE do claude.ai e no HUB na web.
   Pedido do Cleiton (23/11/2026, cartão): melhorias do vídeo do mapa 3D — roteiro de visitas, tour 3D e "o que há por perto".
   O corretor marca os imóveis no mapa (2D ou 3D), o roteiro guarda a ordem no aparelho, organiza pelo caminho mais curto
   e abre a rota no Google Maps (link público, sem chave e sem custo). Até 10 paradas: o link do Google aceita 9 paradas
   intermediárias mais o destino.
   Uso: const R = VivereRoteiro.criar('painel', () => redesenha());
        R.tem(id) · R.alternar({ id, lat, lng, titulo }) · R.tirar(id) · R.lista() · R.limpar() · R.organizar() · R.url() · R.html(prefixo) */
(function () {
  if (window.VivereRoteiro) return;
  const MAX = 10;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dist = (a, b) => { const r = Math.PI / 180, x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r; return Math.sqrt(x * x + y * y) * 6371; };
  (function () {
    if (document.getElementById('css-roteiro-mapa')) return;
    const st = document.createElement('style'); st.id = 'css-roteiro-mapa';
    st.textContent = '.rot-barra{border:1px solid var(--line,#d5d9e0);border-radius:10px;padding:8px 10px;margin:0 0 8px;display:grid;gap:6px;background:var(--panel,#fff)}'
      + '.rot-barra[hidden]{display:none!important}.rot-cab{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}.rot-cab b{font-weight:600}'
      + '.rot-l{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}'
      + '.rot-l li{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line,#d5d9e0);border-radius:999px;padding:2px 4px 2px 8px;font-size:13px}'
      + '.rot-l .rot-n{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--ink,#1c2739);color:var(--panel,#fff);font-size:11px;font-weight:700}'
      + '.rot-l button{border:0;background:none;color:var(--muted,#667);cursor:pointer;font-size:15px;line-height:1;padding:0 4px}'
      + '.rot-ac{display:flex;flex-wrap:wrap;gap:6px}.rot-ac a,.rot-ac button{white-space:nowrap}.rot-aviso{font-size:12px;color:var(--muted,#667)}'
      + '.rot-num{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#1C2739;color:#fff;font:700 11px/1 sans-serif;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)}';
    document.head.appendChild(st);
  })();

  function criar(chave, aoMudar) {
    const K = 'vivere.roteiro.' + chave;
    let L = [];
    try { L = JSON.parse(localStorage.getItem(K) || '[]').filter((x) => x && x.id != null && isFinite(x.lat) && isFinite(x.lng)); } catch (e) { L = []; }
    let aviso = '', ver = null;
    // só as paradas que o mapa mostra agora, na posição atual ("Ver como", filtros): ver(id) → {lat, lng} ou null
    const V = () => (ver ? L.map((x) => { const p = ver(x.id); return p && p.lat != null ? Object.assign({}, x, { lat: +p.lat, lng: +p.lng }) : null; }).filter(Boolean) : L.slice());
    const grava = () => { try { localStorage.setItem(K, JSON.stringify(L)); } catch (e) {} if (aoMudar) aoMudar(); };
    const api = {
      max: MAX,
      tem: (id) => L.some((x) => String(x.id) === String(id)),
      lista: () => V(),
      ocultas: () => L.length - V().length,
      visivel(fn) { ver = typeof fn === 'function' ? fn : null; },
      alternar(it) {
        if (!it) return false;
        aviso = '';
        if (api.tem(it.id)) { L = L.filter((x) => String(x.id) !== String(it.id)); grava(); return false; }
        if (it.lat == null || it.lng == null) return false;
        if (L.length >= MAX) { aviso = 'O roteiro aceita até ' + MAX + ' imóveis (limite do link do Google Maps), contando os que ficaram de fora desta visão.'; if (aoMudar) aoMudar(); return false; }
        L.push({ id: String(it.id), lat: +it.lat, lng: +it.lng, titulo: String(it.titulo || it.id) }); grava(); return true;
      },
      tirar(id) { aviso = ''; L = L.filter((x) => String(x.id) !== String(id)); grava(); },
      limpar() { aviso = ''; L = []; grava(); },
      // caminho mais curto a partir da 1ª parada (vizinho mais próximo; bom o bastante para até 10 paradas)
      organizar() {
        const vis = V(); if (vis.length < 3) return;
        const r = [vis[0]], resto = vis.slice(1);
        while (resto.length) { const u = r[r.length - 1]; let k = 0; resto.forEach((x, i) => { if (dist(u, x) < dist(u, resto[k])) k = i; }); r.push(resto.splice(k, 1)[0]); }
        const ids = new Set(r.map((x) => x.id)); L = r.map((x) => L.find((y) => y.id === x.id)).concat(L.filter((x) => !ids.has(x.id))); grava();
      },
      km() { const v = V(); let s = 0; for (let i = 1; i < v.length; i++) s += dist(v[i - 1], v[i]); return s; },
      url() {
        const v = V(); if (!v.length) return '';
        const p = (x) => x.lat.toFixed(6) + ',' + x.lng.toFixed(6), d = v[v.length - 1], w = v.slice(0, -1);
        return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + encodeURIComponent(p(d)) + (w.length ? '&waypoints=' + encodeURIComponent(w.map(p).join('|')) : '');
      },
      // barra do roteiro; prefixo = atributo de dados do app (ex.: 'pmrot' → data-pmrot-tira, data-pmrot-acao)
      html(prefixo, classeBotao) {
        const b = classeBotao || 'b', Lv = V(), oc = L.length - Lv.length;
        const notaOc = oc ? '<span class="rot-aviso">' + oc + (oc > 1 ? ' paradas ficam' : ' parada fica') + ' de fora nesta visão do mapa</span>' : '';
        if (!Lv.length) return oc ? '<div class="rot-cab">' + notaOc + '<button class="' + b + '" type="button" data-' + prefixo + '-acao="limpar">Limpar o roteiro</button></div>' : aviso ? '<div class="rot-cab"><span class="rot-aviso">' + esc(aviso) + '</span></div>' : '';
        const km = api.km();
        return '<div class="rot-cab"><b>Roteiro de visitas · ' + Lv.length + (Lv.length > 1 ? ' imóveis' : ' imóvel') + '</b>'
          + (Lv.length > 1 ? '<span class="rot-aviso">~' + km.toFixed(1).replace('.', ',') + ' km em linha reta</span>' : '')
          + '<span class="rot-aviso">Saída: onde você estiver</span></div>'
          + notaOc + '<ol class="rot-l">' + Lv.map((x, i) => '<li><span class="rot-n">' + (i + 1) + '</span>' + esc(x.titulo)
            + '<button type="button" data-' + prefixo + '-tira="' + esc(x.id) + '" aria-label="Tirar ' + esc(x.titulo) + ' do roteiro" title="Tirar do roteiro">×</button></li>').join('') + '</ol>'
          + '<div class="rot-ac"><a class="' + b + ' p" href="' + esc(api.url()) + '" target="_blank" rel="noopener">Abrir a rota no Google Maps</a>'
          + (Lv.length > 2 ? '<button class="' + b + '" type="button" data-' + prefixo + '-acao="organizar">Organizar pelo caminho mais curto</button>' : '')
          + '<button class="' + b + '" type="button" data-' + prefixo + '-acao="limpar">Limpar</button></div>'
          + (aviso ? '<span class="rot-aviso">' + esc(aviso) + '</span>' : '');
      },
    };
    return api;
  }
  window.VivereRoteiro = { criar, MAX };
})();
