// modulos/demandas-auto.js — aba "Demandas automáticas" (CRM) no HUB Vivere (construção "demandas-auto", 21/11/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Tarefa vis-demandas-automaticas-leads (fatia 3c). Pedido do Cleiton (20/11/2026): Demandas em dois
// módulos — extras (qualquer pessoa registra) e automáticas, nascidas da base de leads, só com o perfil e o corretor responsável.
// • Lê: demandas_auto (um doc por lead aberto, a-<hash>, gravado pelo gatilho privado.dem_auto_gatilho; nível diretoria; sem nome nem
//   telefone), acaptar_imoveis (cruzamento) e site_leads/_resumo (nome dos corretores). Não grava nada.
// • Agrupa perfis iguais do mesmo corretor numa linha com a quantidade de clientes (só a diretoria vê a contagem; no app, o corretor não).
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, ID = 'demandas-auto', C = 'demandas_auto';
  const st = { fin: '', q: '', abre: '', pg: 0, pp: 50 };
  try { const v = +localStorage.getItem('hubv.da.pp'); if (v === 50 || v === 100) st.pp = v; } catch (_) {}
  const nrm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const brl = (v) => { v = +v; if (!v) return ''; return v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : v >= 1e3 ? 'R$ ' + Math.round(v / 1e3).toLocaleString('pt-BR') + ' mil' : 'R$ ' + v.toLocaleString('pt-BR'); };
  const valor = (g) => g.vmin && g.vmax ? brl(g.vmin) + ' a ' + brl(g.vmax) : g.vmax ? 'até ' + brl(g.vmax) : g.vmin ? 'a partir de ' + brl(g.vmin) : '—';
  const comodos = (g) => [g.dorm ? g.dorm + '+ dorm.' : '', g.vagas ? g.vagas + '+ vaga' + (g.vagas > 1 ? 's' : '') : ''].filter(Boolean).join(' · ') || '—';
  const nomeCor = (p) => { const c = ((((H.S.site_leads || {})._resumo || {}).corretores) || []).find((x) => x.id === p); return c ? String(c.nome || p).split(' ')[0] : p; };
  const familia = (t) => { t = nrm(t); return /cobertura/.test(t) ? 'Cobertura' : /(apart|studio|loft|flat|kitnet|apto)/.test(t) ? 'Apartamento' : /(casa|house|sobrado|geminad)/.test(t) ? 'Casa' : /(terreno|lote|land|gleba)/.test(t) ? 'Terreno' : /(comerc|sala|loja|galp|ponto)/.test(t) ? 'Sala/comercial' : ''; };
  const bairroBate = (bs, b) => { const x = nrm(b); if (!x) return false; if (bs.some((y) => { y = nrm(y); return y && (x === y || x.startsWith(y + ' ') || y.startsWith(x + ' ')); })) return true; const R = window.VIVERE_REGIOES; return !!(R && R.pronto && R.bate(bs, b)); };   // 171: região ou bairro-mãe abrange as sub-regiões
  function grupos() {
    const M = new Map();
    Object.entries(H.S[C] || {}).forEach(([, d]) => {
      if (!d || typeof d !== 'object' || !d.painel) return;
      const k = [d.painel, d.finalidade, d.tipo || '', d.bk || '', d.valor_min || '', d.valor_max || '', d.dorm_min || '', d.vagas_min || ''].join('|');
      const g = M.get(k) || { id: k, painel: d.painel, fin: d.finalidade, tipo: d.tipo || '', bairros: d.bairros || [], vmin: +d.valor_min || 0, vmax: +d.valor_max || 0, dorm: +d.dorm_min || 0, vagas: +d.vagas_min || 0, n: 0, conf: false };
      g.n++; g.conf = g.conf || d.fonte === 'confirmado'; M.set(k, g);
    });
    return [...M.values()];
  }
  function acap(g) {
    const neg = g.fin === 'Compra' ? 'venda' : g.fin === 'Locação anual' ? 'aluguel' : ''; if (!neg) return 0;
    return Object.values(H.S.acaptar_imoveis || {}).filter((m) => m && m.ativo && m.lista === 'base' && !m.distribuido_para && m.negocio === neg && bairroBate(g.bairros, m.bairro)
      && (!g.tipo || !familia(m.tipo) || familia(m.tipo) === g.tipo || (g.tipo === 'Apartamento' && familia(m.tipo) === 'Cobertura'))
      && (!m.preco || !g.vmax || m.preco <= g.vmax * 1.1) && (!m.preco || !g.vmin || m.preco >= g.vmin * 0.8) && (!g.dorm || !m.quartos || m.quartos >= g.dorm)).length;
  }
  function site(g) {
    if (!H.op || !H.carregado.imoveis) return null;
    try { return (H.op.casar({ fin: g.fin === 'Compra' ? 'Venda' : g.fin === 'Temporada' ? 'Temporada' : 'Locação', tipo: g.tipo === 'Sala/comercial' ? 'Comercial' : g.tipo, bairros: g.bairros.slice(), vmin: g.vmin, vmax: g.vmax, dorm: g.dorm, vagas: g.vagas }, H.op.ctx(), { max: 300, relaxa: false }) || []).slice(0, 20); } catch (_) { return []; }
  }
  function render() {
    if (!H.carregado[C]) return '<p class="nota">Carregando as demandas automáticas…</p>';
    const q = nrm(st.q);
    const L = grupos().filter((g) => (!st.fin || g.fin === st.fin) && (!q || nrm([nomeCor(g.painel), g.fin, g.tipo, ...g.bairros].join(' ')).includes(q)))
      .map((g) => Object.assign(g, { ac: acap(g) })).sort((a, b) => b.ac - a.ac || b.n - a.n || String(a.fin).localeCompare(String(b.fin)));
    const nCli = L.reduce((s, g) => s + g.n, 0), tot = Math.max(1, Math.ceil(L.length / st.pp)); st.pg = Math.min(st.pg, tot - 1);
    const vis = L.slice(st.pg * st.pp, st.pg * st.pp + st.pp);
    const chip = (v, t) => `<button class="btn${st.fin === v ? ' ativo' : ''}" data-da-fin="${esc(v)}" aria-pressed="${st.fin === v}">${t}</button>`;
    const ab = st.abre && L.find((g) => g.id === st.abre), A = ab ? site(ab) : null;
    const det = ab ? `<div class="card" style="margin:8px 0"><div class="filtros" style="justify-content:space-between;margin:0"><b>Imóveis do site que atendem: ${esc(ab.fin)} · ${esc(ab.tipo || 'qualquer tipo')} · ${esc(ab.bairros.join(', '))}</b><button class="btn" data-da-abre="">Fechar</button></div>
      ${A == null ? '<p class="nota">Carregando os imóveis…</p>' : A.length ? `<ul style="margin:6px 0 0;padding-left:18px">${A.map((x) => { const it = x.it || {}; return `<li>${esc(it.ref || it.cod || '')} · ${esc(it.tipo || '')} · ${esc(it.bairro || '')} · ${esc(brl(it.valor) || '—')}</li>`; }).join('')}</ul>` : '<p class="nota">Nenhum imóvel do site combina agora.</p>'}</div>` : '';
    const linha = (g) => { const s = site(g); return `<tr><td>${esc(nomeCor(g.painel))}${g.n > 1 ? ` <span class="nota">(${g.n} clientes)</span>` : ''}</td><td>${esc(g.fin)} · ${esc(g.tipo || 'qualquer tipo')}</td><td>${esc(g.bairros.join(', '))}</td><td class="num">${esc(valor(g))}</td><td>${esc(comodos(g))}</td><td>${g.conf ? 'confirmado' : 'sugerido'}</td>
      <td>${s == null ? '…' : s.length ? `<button class="btn" data-da-abre="${esc(g.id)}">${s.length} no site</button>` : '<span class="nota">nenhum</span>'}</td><td class="num">${g.ac ? `${g.ac} no A CAPTAR` : '<span class="nota">nenhum</span>'}</td></tr>`; };
    const pag = L.length > 50 ? `<div class="filtros"><span class="nota">${st.pg * st.pp + 1}–${Math.min(L.length, st.pg * st.pp + st.pp)} de ${L.length}</span><button class="btn" data-da-pg="-1" ${st.pg ? '' : 'disabled'}>‹</button><button class="btn" data-da-pg="1" ${st.pg < tot - 1 ? '' : 'disabled'}>›</button><select data-da-pp aria-label="Por página">${[50, 100].map((v) => `<option${v === st.pp ? ' selected' : ''}>${v}</option>`).join('')}</select></div>` : '';
    return `<h2>Demandas automáticas</h2>
      <p class="nota">Nascem sozinhas do perfil dos leads em aberto dos painéis (confirmado pelo corretor ou sugerido pela Vivian) e somem quando o lead fecha, perde ou é arquivado. Só o perfil e o corretor, sem dado do cliente. Perfis iguais do mesmo corretor ficam numa linha; a quantidade de clientes só aparece aqui (no app, o corretor não vê). "No A CAPTAR" conta os imóveis da base sem distribuição, como estimativa.</p>
      <div class="resumo-cob"><div class="card"><div class="s">Linhas</div><div class="num">${L.length}</div><div class="s">${nCli} lead${nCli === 1 ? '' : 's'} em aberto com perfil</div></div><div class="card"><div class="s">Com imóvel no A CAPTAR</div><div class="num">${L.filter((g) => g.ac).length}</div><div class="s">para captar já pensando no cliente</div></div></div>
      <div class="filtros">${chip('', 'Todas')}${chip('Compra', 'Compra')}${chip('Locação anual', 'Locação anual')}${chip('Temporada', 'Temporada')}<input type="search" id="da-q" data-da-q value="${esc(st.q)}" placeholder="Bairro, tipo ou corretor" aria-label="Buscar nas demandas automáticas"></div>${det}
      <div class="tabela"><table><thead><tr><th>Corretor</th><th>Procura</th><th>Bairros</th><th class="num">Valor</th><th>Cômodos</th><th>Perfil</th><th>Imóveis do site</th><th class="num">A captar</th></tr></thead><tbody>${vis.length ? vis.map(linha).join('') : '<tr><td colspan="8" class="nota">Nenhuma demanda com esses filtros.</td></tr>'}</tbody></table></div>${pag}`;
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-da-fin],[data-da-abre],[data-da-pg]'); if (!t) return;
    if (t.hasAttribute('data-da-fin')) { st.fin = t.dataset.daFin; st.pg = 0; }
    else if (t.hasAttribute('data-da-abre')) st.abre = st.abre === t.dataset.daAbre ? '' : t.dataset.daAbre;
    else if (t.hasAttribute('data-da-pg')) st.pg = Math.max(0, st.pg + (+t.dataset.daPg));
    H.pede();
  });
  document.addEventListener('change', (e) => { const t = e.target; if (!t || !t.hasAttribute || !t.hasAttribute('data-da-pp')) return; st.pp = +t.value === 100 ? 100 : 50; st.pg = 0; try { localStorage.setItem('hubv.da.pp', st.pp); } catch (_) {} H.pede(); });
  let tq = 0;
  document.addEventListener('input', (e) => { const t = e.target; if (!t || t.id !== 'da-q') return; st.q = t.value; st.pg = 0; clearTimeout(tq);
    tq = setTimeout(() => { const p = t.selectionStart; H.pede(); setTimeout(() => { const n = document.getElementById('da-q'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (_) {} } }, 0); }, 300); });
  H.registrar({ id: ID, aba: 'Demandas automáticas', grupo: 'crm', depois: 'demandas', colecoes: [C, 'acaptar_imoveis', 'site_leads'], render,
    dicaBusca: 'Buscar nas demandas automáticas: bairro, tipo ou corretor…' });
})();
