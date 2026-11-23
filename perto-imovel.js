/* Perto daqui (23/11/2026, tarefa vis-mapa-proximidades-imovel, fatia B) — o mesmo arquivo no app (painel do corretor),
   no HUB VIVERE do claude.ai e no HUB na web.
   Pedido do Cleiton (23/11/2026 12h07): ao clicar no imóvel, o cartão já traz as proximidades (o mais perto de cada tipo,
   com a distância), no 2D e no 3D, sem abrir o 3D. As proximidades vêm prontas do HUB (coleção mapa_proximidades, calculada
   pela função proximidades do Supabase a partir do OpenStreetMap); aqui só se desenha.
   Classes com prefixo pxp- (vp- já é do núcleo do HUB). Uso:
     VivereProx.bloco(ref)              → '<div class="pxp-caixa" data-pxpref="REF"></div>' (lugar no cartão)
     VivereProx.encher(raiz, leitor[, depois]) → preenche os blocos vazios dentro de raiz; leitor(ref) → Promise<documento|null>
     VivereProx.encherDepois(leitor[, depois]) → o mesmo no documento inteiro, tentando por ~1 s (cartão que ainda vai ser desenhado)
   Mostra até 6 linhas, a mais perto primeiro, e "Ver todas". */
(function () {
  if (window.VivereProx) return;
  const VERSAO = '2026-11-23.2'; // .2: classes pxp- (as vp- já eram do núcleo do HUB e desmontavam a lista)
  const TIPOS = {
    praia: ['🏖️', 'Praia'], mercado: ['🛒', 'Mercado'], farmacia: ['💊', 'Farmácia'], saude: ['🏥', 'Saúde'],
    escola: ['🏫', 'Escola'], parque: ['🌳', 'Parque ou praça'], academia: ['🏋🏼', 'Academia ou clube'],
    restaurante: ['🍽️', 'Restaurante'], onibus: ['🚏', 'Ponto de ônibus'], terminal: ['🚌', 'Terminal de ônibus'],
    posto: ['⛽', 'Posto de combustível'], banco: ['🏦', 'Banco'], shopping: ['🛍️', 'Shopping'],
  };
  const LINHAS = 6;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const distTxt = (m) => m < 1000 ? Math.max(10, Math.round(m / 10) * 10) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
  const REF = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

  (function () {
    if (document.getElementById('css-perto-imovel')) return;
    const st = document.createElement('style'); st.id = 'css-perto-imovel';
    st.textContent = '.pxp-caixa{margin:8px 0 2px;padding:7px 0 0;border-top:1px solid var(--line,#e4e7ec);font-size:12.5px;line-height:1.35;text-align:left}'
      + '.pxp-caixa:empty{display:none}.pxp-t{margin:0 0 3px;font-weight:700;font-size:12.5px}'
      + '.pxp-l{margin:0;padding:0;list-style:none}.pxp-l li{display:flex;gap:6px;align-items:baseline;padding:2px 0}'
      + '.pxp-l .pxp-i{flex:none;width:1.3em;text-align:center}.pxp-l b{flex:none;white-space:nowrap;font-weight:600}'
      + '.pxp-l .pxp-n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted,#6b7280)}'
      + '.pxp-l em{flex:none;font-style:normal;font-weight:600;white-space:nowrap;margin-left:auto}'
      + '.pxp-mais{margin:4px 0 0;border:0;background:none;padding:2px 0;color:var(--brass,#b08d57);font:inherit;font-weight:600;cursor:pointer;text-decoration:underline}'
      + '.pxp-r{margin:3px 0 0;font-size:11px;color:var(--muted,#6b7280)}';
    document.head.appendChild(st);
  })();

  const cache = new Map(); // ref → Promise<doc|null>
  function ler(ref, leitor) {
    const k = String(ref).toUpperCase();
    if (!cache.has(k)) {
      const p = Promise.resolve().then(() => leitor(k)).then((d) => (d && Array.isArray(d.itens) && !(d.parcial && !d.itens.length) ? d : null));
      p.catch(() => cache.delete(k)); // falha de rede: tenta de novo no próximo clique
      cache.set(k, p);
    }
    return cache.get(k);
  }

  function linha(x, todas) {
    const t = TIPOS[x.t]; if (!t || !(x.d >= 0)) return '';
    const n = x.n || (x.t === 'praia' ? 'faixa de areia' : '');
    const mais = todas && x.n1 > 1 ? ' · ' + x.n1 + ' até 1 km' : '';
    return '<li><span class="pxp-i" aria-hidden="true">' + t[0] + '</span><b>' + esc(t[1]) + '</b><span class="pxp-n" title="' + esc(n + mais) + '">'
      + esc(n + mais) + '</span><em>' + distTxt(x.d) + '</em></li>';
  }
  function html(doc, todas) {
    if (!doc) return '<p class="pxp-t">📍 Perto daqui</p><p class="pxp-r">Ainda sem o cálculo: vale para os anúncios ativos, e os novos entram em até 15 min.</p>';
    const L = doc.itens.filter((x) => TIPOS[x.t]);
    if (!L.length) return '<p class="pxp-t">📍 Perto daqui</p><p class="pxp-r">Nada a até 3 km no OpenStreetMap.</p>';
    const ver = todas ? L : L.slice(0, LINHAS);
    return '<p class="pxp-t">📍 Perto daqui</p><ul class="pxp-l">' + ver.map((x) => linha(x, todas)).join('') + '</ul>'
      + (L.length > LINHAS ? '<button type="button" class="pxp-mais" data-pxpmais="' + (todas ? '0' : '1') + '">' + (todas ? 'Ver menos' : 'Ver todas (' + L.length + ')') + '</button>' : '')
      + '<p class="pxp-r">Distância em linha reta · OpenStreetMap, pode faltar algum' + (doc.aprox ? ' · ponto aproximado (centro do bairro)' : '') + '</p>';
  }

  function encher(raiz, leitor, depois) {
    if (!raiz || typeof leitor !== 'function') return 0;
    const bs = raiz.querySelectorAll ? raiz.querySelectorAll('.pxp-caixa[data-pxpref]:not([data-pxpok])') : [];
    bs.forEach((b) => {
      const ref = b.dataset.pxpref; b.dataset.pxpok = '1';
      if (!REF.test(ref || '')) { b.innerHTML = ''; return; }
      b.innerHTML = '<p class="pxp-t">📍 Perto daqui</p><p class="pxp-r">Carregando…</p>';
      ler(ref, leitor).then((d) => { b._pxpDoc = d; b._pxpDepois = depois; b.innerHTML = html(d, false); if (depois) try { depois(b); } catch (e) {} },
        () => { b.innerHTML = '<p class="pxp-t">📍 Perto daqui</p><p class="pxp-r">Não consegui carregar agora. Feche e abra o cartão de novo.</p>'; });
    });
    return bs.length;
  }
  function encherDepois(leitor, depois) {
    let n = 0; const tenta = () => { if (encher(document, leitor, depois) || ++n > 16) return; setTimeout(tenta, 70); };
    setTimeout(tenta, 0);
  }

  document.addEventListener('click', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('.pxp-mais') : null; if (!b) return;
    const caixa = b.closest('.pxp-caixa'); if (!caixa || caixa._pxpDoc === undefined) return;
    e.preventDefault(); e.stopPropagation();
    caixa.innerHTML = html(caixa._pxpDoc, b.dataset.pxpmais === '1');
    if (caixa._pxpDepois) try { caixa._pxpDepois(caixa); } catch (e2) {}
  }, true);

  window.VivereProx = { versao: VERSAO, TIPOS, bloco: (ref) => REF.test(String(ref || '')) ? '<div class="pxp-caixa" data-pxpref="' + esc(String(ref).toUpperCase()) + '"></div>' : '', encher, encherDepois, html };
})();
