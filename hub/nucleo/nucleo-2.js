
/* Visões do CRM (30/10/2026, pedido do Cleiton): Lista, Kanban, Pipeline, Funil e Agenda — o mesmo código no HUB VIVERE
   (Funil dos corretores, Leads e Oportunidades) e no painel de cada corretor (Meus leads). Seleção única (05/11/2026, pedido
   do Cleiton): uma visão por vez, ou Todas empilhadas; escolha antiga com várias marcadas vira a primeira delas. A escolha fica no banco (data/users/<id>/preferencias, campo visoes_crm) e no aparelho.
   O Kanban permite arrastar o cartão (computador) ou usar "Mover para" (celular) quando a página libera a mudança de etapa. */
(function () {
  if (window.VisoesCRM) return;
  const VISOES = [['lista', 'Lista'], ['kanban', 'Kanban'], ['pipeline', 'Pipeline'], ['funil', 'Funil'], ['agenda', 'Agenda']];
  const PADRAO = ['lista'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dtc = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}` : ''; };
  const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  let H = { mover: null, etapa: null, mudou: null, salvar: null };

  // ---------- escolha das visões ----------
  const LS = 'visoes_crm';
  function lerLocal() { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } }
  function ativas(chave, prefs) {
    const p = (prefs && prefs.visoes_crm) || lerLocal();
    const v = Array.isArray(p[chave]) ? p[chave].filter((x) => VISOES.some((y) => y[0] === x)) : null;
    if (!v || !v.length) return PADRAO.slice();
    return [VISOES.map((x) => x[0]).find((x) => v.includes(x))];
  }
  function alternar(chave, prefs, v) {
    let a = ativas(chave, prefs);
    if (v === '*') a = PADRAO.slice();
    else if (VISOES.some((y) => y[0] === v)) a = [v];
    const loc = lerLocal(); loc[chave] = a; try { localStorage.setItem(LS, JSON.stringify(loc)); } catch (e) {}
    const todas = Object.assign({}, lerLocal(), (prefs && prefs.visoes_crm) || {}, { [chave]: a });
    return { a, todas };
  }
  function seletor(chave, prefs) {
    const a = ativas(chave, prefs);
    return `<div class="vcrm-sel"><span class="vcrm-r">Visões</span><div class="chips vcrm-chips" role="group" aria-label="Visões">${VISOES.map(([k, t]) => `<button type="button" class="vcrm-b" data-vcrm-tog="${esc(chave)}|${k}" aria-pressed="${a.length === 1 && a[0] === k}">${t}</button>`).join('')}</div></div>`;
  }

  // ---------- Kanban ----------
  // itens: {id, nome, etapa, sub (html), pills (html), prox, data_prox, alerta, abre (atributo html), marca (texto)}
  function cartao(chave, x, cfg) {
    const mover = cfg.podeMover && (!cfg.podeMoverItem || cfg.podeMoverItem(x));
    const venc = x.data_prox && x.data_prox < hoje();
    return `<div class="vk-card${x.alerta ? ' alerta' : ''}" ${mover ? `data-vk-drag="${esc(chave)}|${esc(x.id)}"` : ''}>
      <div class="vk-l1">${x.abre ? `<button type="button" class="vk-nome" ${x.abre}>${esc(x.nome || '—')}</button>` : `<b class="vk-nome">${esc(x.nome || '—')}</b>`}${x.pills || ''}</div>
      ${x.sub ? `<div class="vk-s">${x.sub}</div>` : ''}
      ${x.prox || x.data_prox ? `<div class="vk-s${venc ? ' venc' : ''}">↳ ${esc(x.prox || 'Ação')}${x.data_prox ? ' · ' + dtc(x.data_prox) : ''}</div>` : ''}
      ${x.marca ? `<div class="vk-s vk-marca">${esc(x.marca)}</div>` : ''}
      ${mover ? `<label class="vk-mv"><span>Mover para</span><select data-vk-mover="${esc(chave)}|${esc(x.id)}"><option value="">—</option>${(cfg.destinos || cfg.etapas).filter((e) => e !== x.etapa).map((e) => `<option>${esc(e)}</option>`).join('')}</select></label>` : ''}
    </div>`;
  }
  function kanban(chave, itens, cfg) {
    const por = {}; cfg.etapas.forEach((e) => (por[e] = []));
    itens.forEach((x) => { const e = por[x.etapa] ? x.etapa : cfg.etapas[0]; por[e].push(x); });
    const ocultas = new Set(cfg.ocultarVazias ? cfg.etapas.filter((e) => !por[e].length) : []);
    return `<div class="vk" data-vk="${esc(chave)}">${cfg.etapas.filter((e) => !ocultas.has(e)).map((e) => `<div class="vk-col" data-vk-col="${esc(chave)}|${esc(e)}"${cfg.destinos && !cfg.destinos.includes(e) ? ' data-vk-fixa="1"' : ''}><div class="vk-cab"><span>${esc(e)}</span><b>${por[e].length}</b></div><div class="vk-lista">${por[e].slice(0, cfg.max || 200).map((x) => cartao(chave, x, cfg)).join('') || '<div class="vk-vazio">—</div>'}${por[e].length > (cfg.max || 200) ? `<div class="vk-vazio">e mais ${por[e].length - (cfg.max || 200)}</div>` : ''}</div></div>`).join('')}</div>
      ${cfg.podeMover ? `<p class="vcrm-nota">Arraste o cartão para outra coluna (no celular, toque e segure o cartão e arraste, ou use "Mover para").${cfg.notaMover ? ' ' + esc(cfg.notaMover) : ''}</p>` : cfg.notaLeitura ? `<p class="vcrm-nota">${esc(cfg.notaLeitura)}</p>` : ''}`;
  }

  // ---------- Pipeline ----------
  // dias = dias desde o último registro de cada item (número ou null)
  function pipeline(chave, itens, cfg) {
    const tot = itens.length || 1, max = Math.max(1, ...cfg.etapas.map((e) => itens.filter((x) => x.etapa === e).length));
    const linhas = cfg.etapas.map((e) => {
      const L = itens.filter((x) => x.etapa === e), n = L.length;
      const ds = L.map((x) => x.dias).filter((d) => typeof d === 'number'), med = ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : null;
      const al = L.filter((x) => x.alerta).length, venc = L.filter((x) => x.data_prox && x.data_prox < hoje()).length;
      return `<button type="button" class="vp-l" data-vp-etapa="${esc(chave)}|${esc(e)}" title="Ver os leads em ${esc(e)}" ${n ? '' : 'disabled'}>
        <span class="vp-e">${esc(e)}</span><span class="vp-bar"><i style="width:${Math.round((n / max) * 100)}%"></i></span>
        <span class="vp-n"><b>${n}</b> · ${Math.round((n / tot) * 100)}%</span>
        <span class="vp-d">${med == null ? '—' : med + ' dia' + (med === 1 ? '' : 's') + ' sem registro (média)'}</span>
        <span class="vp-a">${al ? `<span class="pill bad alta">${al} com alerta</span>` : ''}${venc ? ` <span class="pill warn media">${venc} ação vencida</span>` : ''}</span></button>`;
    }).join('');
    return `<div class="vp">${linhas}</div><p class="vcrm-nota">Clique numa etapa para filtrar a lista e o kanban.</p>`;
  }

  // ---------- Funil ----------
  // degraus: [{rot, n, sub}] em ordem; o host decide quem "chegou" a cada degrau
  function funil(chave, degraus, cfg) {
    const top = Math.max(1, degraus[0] ? degraus[0].n : 1);
    const h = degraus.map((d, i) => {
      const w = Math.max(8, Math.round((d.n / top) * 100)), ant = i ? degraus[i - 1].n : null;
      const conv = d.saida ? Math.round((d.n / top) * 100) + '% das entradas' : ant != null ? (ant ? Math.round((d.n / ant) * 100) : 0) + '% da etapa anterior' : 'entrada';
      return `<div class="vf-l${d.saida ? ' saida' : ''}"><div class="vf-rot">${esc(d.rot)}</div><div class="vf-trilho"><div class="vf-bar" style="width:${w}%"><b>${d.n}</b></div></div><div class="vf-conv">${conv}${d.sub ? ` · ${esc(d.sub)}` : ''}</div></div>`;
    }).join('');
    return `<div class="vf">${h}</div>${cfg && cfg.nota ? `<p class="vcrm-nota">${esc(cfg.nota)}</p>` : ''}`;
  }
  // degraus a partir das etapas: chegou à etapa i quem está nela ou depois (sem contar as etapas de saída, como Perdido)
  function degrausEtapas(itens, etapas, saidas) {
    const seq = etapas.filter((e) => !saidas.includes(e));
    const idx = (e) => seq.indexOf(e);
    const D = seq.map((e, i) => ({ rot: e, n: itens.filter((x) => idx(x.etapa) >= i).length }));
    saidas.forEach((s) => { const n = itens.filter((x) => x.etapa === s).length; if (n) D.push({ rot: s, n, sub: 'saíram do funil', saida: true }); });
    return D;
  }

  // ---------- Agenda ----------
  function agenda(chave, itens, cfg) {
    const h0 = hoje(), am = somaDias(h0, 1), sem = somaDias(h0, 7);
    const G = [['Vencidas', (d) => d && d < h0, 'bad'], ['Hoje', (d) => d === h0, 'warn'], ['Amanhã', (d) => d === am, ''], ['Próximos 7 dias', (d) => d && d > am && d <= sem, ''], ['Depois', (d) => d && d > sem, ''], ['Sem próxima ação', (d) => !d, 'muted']];
    const L = itens.filter((x) => !cfg.so || cfg.so(x));
    const blocos = G.map(([rot, f, c]) => {
      const X = L.filter((x) => f(x.data_prox || '')).sort((a, b) => String(a.data_prox || '').localeCompare(String(b.data_prox || '')));
      if (!X.length) return '';
      return `<div class="va-g ${c}"><div class="va-cab">${rot} <b>${X.length}</b></div>${X.slice(0, 60).map((x) => `<div class="va-i"><span class="va-d">${x.data_prox ? dtc(x.data_prox) : '—'}</span>${x.abre ? `<button type="button" class="vk-nome" ${x.abre}>${esc(x.nome)}</button>` : `<b class="vk-nome">${esc(x.nome)}</b>`}${x.pills ? `<span class="va-p">${x.pills}</span>` : ''}<span class="va-t">${esc(x.prox || '')}${x.etapa ? ` · ${esc(x.etapa)}` : ''}${x.quem ? ` · ${esc(x.quem)}` : ''}</span></div>`).join('')}${X.length > 60 ? `<div class="vk-vazio">e mais ${X.length - 60}</div>` : ''}</div>`;
    }).join('');
    return blocos ? `<div class="va">${blocos}</div>` : `<p class="vcrm-nota">${esc(cfg.vazio || 'Nenhuma próxima ação marcada.')}</p>`;
  }

  // ---------- montagem: as visões ligadas, na ordem fixa ----------
  function montar(chave, prefs, partes) {
    const a = ativas(chave, prefs);
    return seletor(chave, prefs) + VISOES.filter(([k]) => a.includes(k) && partes[k]).map(([k, t]) => {
      const corpo = typeof partes[k] === 'function' ? partes[k]() : partes[k];
      return `<section class="vcrm-v" data-vcrm-v="${k}">${a.length > 1 ? `<h3 class="vcrm-h">${t}</h3>` : ''}${corpo}</section>`;
    }).join('');
  }

  // ---------- motivo da perda (janela própria: prompt() não funciona em todo lugar) ----------
  function pedeMotivo(motivos) {
    return new Promise((ok) => {
      const d = document.createElement('div'); d.className = 'vcrm-modal';
      d.innerHTML = `<div class="vcrm-caixa" role="dialog" aria-modal="true" aria-label="Motivo da perda"><b>Motivo da perda</b><select id="vcrmMot"><option value="">Escolha</option>${motivos.map((m) => `<option>${esc(m)}</option>`).join('')}</select><div class="vcrm-bts"><button type="button" class="vcrm-b" data-x="0">Cancelar</button><button type="button" class="vcrm-b p" data-x="1">Mover para Perdido</button></div></div>`;
      document.body.appendChild(d);
      const fim = (v) => { d.remove(); ok(v); };
      d.addEventListener('click', (e) => { const b = e.target.closest('[data-x]'); if (e.target === d) return fim(null); if (!b) return; if (b.dataset.x === '0') return fim(null); const v = d.querySelector('#vcrmMot').value; if (!v) { d.querySelector('#vcrmMot').focus(); return; } fim(v); });
      d.querySelector('#vcrmMot').focus();
    });
  }

  // ---------- eventos ----------
  let arrastando = null;
  function instalar(h) {
    H = Object.assign(H, h || {});
    if (window.__vcrmOk) return; window.__vcrmOk = true;
    document.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('[data-vcrm-tog],[data-vp-etapa]'); if (!t) return;
      if (t.dataset.vcrmTog) { const [c, v] = t.dataset.vcrmTog.split('|'); if (H.mudou) H.mudou(c, v); return; }
      if (t.dataset.vpEtapa) { const [c, et] = t.dataset.vpEtapa.split('|'); if (H.etapa) H.etapa(c, et); }
    });
    document.addEventListener('change', (e) => {
      const s = e.target.closest && e.target.closest('[data-vk-mover]'); if (!s || !s.value) return;
      const [c, id] = s.dataset.vkMover.split('|'); const et = s.value; s.value = ''; if (H.mover) H.mover(c, id, et);
    });
    // ---------- arrastar: mouse e toque pelo mesmo gesto (pointer events) ----------
    // 05/11/2026 (pedido do Cleiton): o mouse deixou o arrastar nativo do navegador, que dentro do claude.ai abria a área de
    // soltar arquivos do app por cima da página. Mouse: começa ao mover mais de 6 px com o botão apertado; toque: segurar ~0,4 s.
    const ESPERA = 400, FOLGA = 10, FOLGA_MOUSE = 6, BORDA = 56, PARTIDA = 24;
    let tq = null, suprime = 0;
    window.addEventListener('click', (e) => { if (Date.now() < suprime) { e.preventDefault(); e.stopPropagation(); suprime = 0; } }, true);
    document.addEventListener('touchmove', (e) => { if (tq && tq.ativo && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('contextmenu', (e) => { if (tq) e.preventDefault(); }, true);
    document.addEventListener('selectstart', (e) => { if (tq) e.preventDefault(); }, true);
    document.addEventListener('dragstart', (e) => { if (tq || (e.target.closest && e.target.closest('[data-vk-drag]'))) { e.preventDefault(); e.stopPropagation(); } }, true); // nada de arrastar nativo dentro do cartão
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tq) fimToque(false); }, true);
    window.addEventListener('blur', () => { if (tq) fimToque(false); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && tq) fimToque(false); });
    document.addEventListener('pointerdown', (e) => {
      if (e.isPrimary === false) return;
      const mouse = e.pointerType === 'mouse'; if (mouse && e.button !== 0) return;
      const c = e.target.closest && e.target.closest('[data-vk-drag]'); if (!c || e.target.closest('select,label,input,textarea,a')) return;
      if (tq) fimToque(false);
      const de = c.closest('[data-vk-col]'), r = c.getBoundingClientRect();
      tq = { c, mouse, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, dx: mouse ? e.clientX - r.left : r.width / 2, dy: mouse ? e.clientY - r.top : r.height * 0.6, ativo: false, col: null, vk: c.closest('.vk'), de: de ? de.dataset.vkCol : '' };
      if (!mouse) { c.classList.add('vk-segura'); tq.t = setTimeout(ativaToque, ESPERA); }
      document.addEventListener('pointermove', moveToque, true);
      document.addEventListener('pointerup', soltaToque, true);
      document.addEventListener('pointercancel', cancelaToque, true);
    }, true);
    function ativaToque() {
      if (!tq || tq.ativo) return; tq.ativo = true; clearTimeout(tq.t);
      const c = tq.c; c.classList.remove('vk-segura'); c.classList.add('arrastando'); document.documentElement.classList.add('vk-agarrando'); if (tq.vk) tq.vk.classList.add('vk-solto');
      try { const s = window.getSelection && window.getSelection(); if (s) s.removeAllRanges(); } catch (er) {}
      if (tq.mouse) { try { c.setPointerCapture(tq.id); } catch (er) {} }
      const f = c.cloneNode(true); f.classList.remove('arrastando'); f.classList.add('vk-fantasma'); f.removeAttribute('data-vk-drag'); f.setAttribute('aria-hidden', 'true');
      f.querySelectorAll('.vk-mv,[id]').forEach((x) => (x.classList.contains('vk-mv') ? x.remove() : x.removeAttribute('id')));
      f.style.width = c.offsetWidth + 'px'; document.body.appendChild(f); tq.f = f; posToque(); achaCol();
      if (!tq.mouse) { try { if (navigator.vibrate) navigator.vibrate(12); } catch (er) {} }
      const passo = () => { if (!tq || !tq.ativo) return; rolaToque(); tq.raf = requestAnimationFrame(passo); }; tq.raf = requestAnimationFrame(passo);
    }
    function posToque() { if (tq && tq.f) { tq.f.style.left = (tq.x - tq.dx) + 'px'; tq.f.style.top = (tq.y - tq.dy) + 'px'; } }
    function achaCol() {
      const el = document.elementFromPoint(tq.x, tq.y), col = el && el.closest && el.closest('[data-vk-col]');
      const ok = col && !col.dataset.vkFixa && col.dataset.vkCol.split('|')[0] === tq.c.dataset.vkDrag.split('|')[0] ? col : null;
      if (ok !== tq.col) { if (tq.col) tq.col.classList.remove('sobre'); if (ok) ok.classList.add('sobre'); tq.col = ok; }
    }
    function rolaToque() {
      // rolagem só depois que o cartão saiu do lugar, mais rápida quanto mais perto da borda (no máximo 8 px por quadro)
      if (Math.hypot(tq.x - tq.x0, tq.y - tq.y0) < PARTIDA) return;
      const vel = (d) => Math.ceil(8 * Math.min(1, (BORDA - d) / BORDA));
      let mexeu = false;
      if (tq.vk) { const r = tq.vk.getBoundingClientRect(), a = tq.vk.scrollLeft; if (tq.x < r.left + BORDA) tq.vk.scrollLeft -= vel(tq.x - r.left); else if (tq.x > r.right - BORDA) tq.vk.scrollLeft += vel(r.right - tq.x); mexeu = tq.vk.scrollLeft !== a; }
      if (tq.y < BORDA) { window.scrollBy(0, -vel(tq.y)); mexeu = true; } else if (tq.y > window.innerHeight - BORDA) { window.scrollBy(0, vel(window.innerHeight - tq.y)); mexeu = true; }
      if (mexeu) achaCol();
    }
    function moveToque(e) {
      if (!tq || e.pointerId !== tq.id) return; tq.x = e.clientX; tq.y = e.clientY;
      if (!tq.ativo) {
        const d = Math.hypot(tq.x - tq.x0, tq.y - tq.y0);
        if (tq.mouse) { if (d > FOLGA_MOUSE) ativaToque(); else return; }
        else { if (d > FOLGA) fimToque(false); return; } // no toque, mexer antes do tempo é rolar a página
      }
      if (e.cancelable) e.preventDefault(); posToque(); achaCol();
    }
    function soltaToque(e) { if (!tq || e.pointerId !== tq.id) return; fimToque(tq.ativo); }
    function cancelaToque(e) { if (!tq || e.pointerId !== tq.id) return; fimToque(false); }
    function fimToque(soltar) {
      const t = tq; tq = null; if (!t) return; clearTimeout(t.t); if (t.raf) cancelAnimationFrame(t.raf);
      document.removeEventListener('pointermove', moveToque, true); document.removeEventListener('pointerup', soltaToque, true); document.removeEventListener('pointercancel', cancelaToque, true);
      if (t.mouse) { try { t.c.releasePointerCapture(t.id); } catch (er) {} }
      t.c.classList.remove('vk-segura', 'arrastando'); document.documentElement.classList.remove('vk-agarrando'); if (t.vk) t.vk.classList.remove('vk-solto'); if (t.f) t.f.remove(); if (t.col) t.col.classList.remove('sobre');
      if (!t.ativo) return; suprime = Date.now() + 500;
      if (!soltar || !t.col || t.col.dataset.vkCol === t.de) return;
      const [c, id] = t.c.dataset.vkDrag.split('|'), [c2, et] = t.col.dataset.vkCol.split('|');
      if (c === c2 && H.mover) H.mover(c, id, et);
    }
  }

  // ---------- estilo (usa as cores de cada página: --panel, --line, --ink, --muted, --soft, --brass, --bad, --warn) ----------
  const css = `
.vcrm-sel{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0 12px}
.vcrm-r{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.vcrm-chips{display:flex;gap:6px;flex-wrap:wrap;flex:1 1 auto;min-width:0}
.vcrm-b{border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:999px;padding:5px 12px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer}
.vcrm-b[aria-pressed="true"]{background:var(--ink);color:var(--panel);border-color:var(--ink)}
.vcrm-b.p{background:var(--ink);color:var(--panel);border-color:var(--ink)}
.vcrm-v{margin:0 0 22px;min-width:0;max-width:100%;overflow:hidden}.vcrm-sel{min-width:0;max-width:100%}.vcrm-h{font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--brass);margin:0 0 10px;padding:7px 12px;background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--brass);border-radius:6px}
.vcrm-nota{font-size:12px;color:var(--muted);margin:6px 0 0}
.vk{max-width:100%;display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}
.vk-col{flex:0 0 250px;max-width:82vw;background:var(--soft);border:1px solid var(--line);border-radius:8px;display:flex;flex-direction:column;max-height:70vh;scroll-snap-align:start}
.vk-col.sobre{outline:2px dashed var(--brass);outline-offset:-2px}
.vk-cab{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)}
.vk-cab b{color:var(--ink);font-size:13px}
.vk-lista{overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px}
.vk-card{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:8px 10px;font-size:13px;display:flex;flex-direction:column;gap:3px}
.vk-card[data-vk-drag]{cursor:grab;-webkit-touch-callout:none}.vk-card.arrastando{opacity:.45}
.vk-card.vk-segura{transition:transform .38s ease-out;transform:scale(.97)}
.vk-fantasma{position:fixed;z-index:1000;pointer-events:none;margin:0;transform:rotate(2deg);border-color:var(--brass);box-shadow:0 8px 22px rgba(0,0,0,.28);opacity:.95;box-sizing:border-box}
.vk.vk-solto{scroll-snap-type:none}
html.vk-agarrando,html.vk-agarrando *{cursor:grabbing!important}
@media (hover:none){.vk-card[data-vk-drag]{-webkit-user-select:none;user-select:none}}
@media (prefers-reduced-motion:reduce){.vk-card.vk-segura{transition:none}}
.vk-card.alerta{border-left:3px solid var(--bad)}
.vk-l1{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.vk-nome{all:unset;cursor:pointer;font-weight:600;color:var(--ink);overflow-wrap:anywhere}.vk-nome:hover{text-decoration:underline}.vk-nome:focus-visible{outline:2px solid var(--brass)}
.vk-s{font-size:12px;color:var(--muted);overflow-wrap:anywhere}.vk-s.venc{color:var(--bad)}.vk-marca{color:var(--brass)}
.vk-mv{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);margin-top:4px}
.vk-mv select{flex:1;min-width:0;font:inherit;font-size:12px;padding:3px 4px;border:1px solid var(--line);border-radius:4px;background:var(--panel);color:var(--ink)}
.vk-vazio{font-size:12px;color:var(--muted);text-align:center;padding:6px}
.vp{display:flex;flex-direction:column;gap:6px}
.vp-l{all:unset;box-sizing:border-box;display:grid;grid-template-columns:140px minmax(80px,1fr) 90px;grid-template-areas:"e bar n" "d d a";gap:4px 10px;align-items:center;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);cursor:pointer;font-size:13px}
.vp-l:hover:not([disabled]){border-color:var(--brass)}.vp-l.on{border-color:var(--brass);box-shadow:inset 4px 0 0 var(--brass)}.vk-col.on{outline:2px solid var(--brass);outline-offset:-2px}.vp-l[disabled]{opacity:.5;cursor:default}.vp-l:focus-visible{outline:2px solid var(--brass)}
.vp-e{grid-area:e;font-weight:600}.vp-bar{grid-area:bar;height:10px;background:var(--soft);border-radius:5px;overflow:hidden}.vp-bar i{display:block;height:100%;background:var(--brass);border-radius:5px}
.vp-n{grid-area:n;text-align:right;color:var(--muted)}.vp-n b{color:var(--ink)}.vp-d{grid-area:d;font-size:12px;color:var(--muted)}.vp-a{grid-area:a;text-align:right;display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;min-width:0}
.vf{display:flex;flex-direction:column;gap:6px}
.vf-l{display:grid;grid-template-columns:130px 1fr;grid-template-areas:"rot trilho" ". conv";gap:2px 10px;align-items:center}
.vf-rot{grid-area:rot;font-size:13px;font-weight:600}.vf-trilho{grid-area:trilho;display:flex;justify-content:center}
.vf-bar{background:var(--ink);color:var(--panel);border-radius:4px;padding:5px 8px;text-align:center;font-size:13px;min-width:34px;box-sizing:border-box}
.vf-l.saida{margin-top:6px;padding-top:6px;border-top:1px dashed var(--line)}.vf-l.saida .vf-bar{background:var(--muted)}
.vf-conv{grid-area:conv;font-size:12px;color:var(--muted);text-align:center}
.va{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.va-g{border:1px solid var(--line);border-radius:8px;background:var(--panel);padding:8px 10px}
.va-g.bad{border-color:var(--bad)}.va-g.warn{border-color:var(--warn)}
.va-cab{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px}.va-g.bad .va-cab{color:var(--bad)}.va-g.warn .va-cab{color:var(--warn)}.va-cab b{color:var(--ink)}
.va-i{display:grid;grid-template-columns:44px 1fr;gap:0 8px;padding:4px 0;border-top:1px solid var(--line);font-size:13px}.va-i:first-of-type{border-top:0}
.va-d{color:var(--muted);font-size:12px;grid-row:span 3}.va-p{grid-column:2;display:flex;gap:4px;flex-wrap:wrap;margin:2px 0}.va-t{font-size:12px;color:var(--muted);grid-column:2}
.vcrm-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.vcrm-caixa{background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px;width:min(360px,100%)}
.vcrm-caixa select{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink)}
.vcrm-bts{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
@media (max-width:640px){.vp-a{justify-content:flex-start}.vp-l{grid-template-columns:1fr 70px;grid-template-areas:"e n" "bar bar" "d d" "a a"}.vp-a{text-align:left}.vf-l{grid-template-columns:96px 1fr}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  window.VisoesCRM = { VISOES, ativas, alternar, seletor, kanban, pipeline, funil, degrausEtapas, agenda, montar, pedeMotivo, instalar };
})();
