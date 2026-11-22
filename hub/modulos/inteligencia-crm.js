// modulos/inteligencia-crm.js — aba CRM › "🎯 Inteligência" do HUB Vivere (tarefa vivere-inteligencia-crm, fatias 1 a 3, 14/11/2026)
// Fatia 3: 🌅 Briefing do dia por corretor (texto pronto para copiar; o envio pela Vivian é a tarefa vis-vivian-alertas-corretores-hub).
// Fatia 2: 🧩 Match (até 3 imóveis por lead com % de aderência, mesmo motor das Ofertas) e 🏗 O que captar (perfis dos leads
// abertos e das demandas extras ativas sem imóvel com 50%+ de aderência, agrupados por finalidade · tipo · bairro).
// Contrato: _hub\modulos\LEIA-ME.md. Decisões do Cleiton (respostas prévias de 08/11/2026 e cartão de 14/11/2026):
// • Nota 0–100 do lead: recência do contato 40 · perfil × carteira 30 · orçamento 20 · origem 10 (ponto de partida; ele ajusta).
//   Recência: até 2 dias = 40, cai em linha reta até 0 em 30 dias. Orçamento: confirmado pelo corretor = 20, inferido = 10, sem = 0.
//   Origem: Vivian ou painel do corretor = 10 · Meta/Google Ads = 7 · portais (CanalPro, OLX…) = 6 · planilhas e listas de captação = 4.
//   Lead de captação (quem TEM imóvel) não tem perfil × carteira nem orçamento: recência + origem (50 pontos), levadas a 100.
// • Lead parado = 7 dias sem contato. Envio sempre pelo corretor: aqui só se copia a mensagem; nada é enviado nem gravado.
// • Lê: crm_leads (os leads dos painéis do app, pela base-supabase), o motor das Ofertas (H.op: perfil inferido pela campanha →
//   empreendimento e pelo imóvel de interesse; cruzamento com anúncios, fora do site e lançamentos). Não grava em coleção nenhuma.
(function () {
  const H = window.HUB; if (!H || !H.op) return;
  const esc = H.esc, ID = 'inteligencia-crm', PARADO = 7;
  const PESO = { rec: 40, perfil: 30, orc: 20, orig: 10 };
  const E = { cor: 'todos', sec: 'briefing', aberto: '' };

  const sem = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const dia = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; };
  const hoje = () => dia(H.hojeISO ? H.hojeISO() : new Date(Date.now() - 3 * 3600e3).toISOString());
  const diasDesde = (s) => { const d = dia(s), h = hoje(); return d == null || h == null ? null : Math.max(0, Math.round((h - d) / 864e5)); };
  const dtc = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1].slice(2) : '—'; };
  const brlc = (v) => { v = +v; if (!v) return ''; if (v < 1e5) return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); return v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : 'R$ ' + Math.round(v / 1e3) + ' mil'; };
  const nomeCor = (c) => { try { return H.op.nomeCorretor(c) || c || '—'; } catch (_) { return c || '—'; } };
  const prim = (n) => { const p = String(n || '').trim().split(/\s+/)[0] || ''; return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ''; };
  const ABERTA = (e) => (e || 'Novo') !== 'Fechado' && (e || 'Novo') !== 'Perdido';
  const captacao = (l) => /^locador|^vendedor|proprietario/.test(sem(l.interesse)) || l.canal === 'captacao' || /^cap-/.test(l._id || '');

  // ---------------------------------------------------------------- componentes da nota
  function pRec(dd) { if (dd == null) return 0; if (dd <= 2) return PESO.rec; if (dd >= 30) return 0; return Math.round(PESO.rec * (30 - dd) / 28); }
  function origem(l) {
    const c = sem(l.canal), k = sem(l.campanha);
    if (c === 'captacao' || /^cap-/.test(l._id || '')) return [4, 'lista de captação'];
    if (c === 'vivian') return [10, 'Vivian'];
    if (c === 'painel') return [10, 'painel do corretor'];
    if (/meta|facebook|instagram|google/.test(k)) return [7, 'anúncio pago'];
    if (/canal ?pro|portal|olx|zap|viva ?real|imovelweb|chaves na mao|quinto/.test(k) || c === 'portal') return [6, 'portal'];
    return [4, 'planilha'];
  }
  // perfil confirmado no painel do corretor (crm_leads.perfil) — o que conta como orçamento "confirmado"
  function perfilCrm(l) { const p = l.perfil || {}, o = {};
    const fin = sem(p.fin || p.finalidade); if (fin) o.fin = /temp/.test(fin) ? 'Temporada' : /loc|alug/.test(fin) ? 'Locação' : /vend|compr/.test(fin) ? 'Venda' : '';
    if (!o.fin) delete o.fin; if (p.tipo) o.tipo = p.tipo;
    const b = String(p.bairros || '').split(/[,;/]/).map((x) => x.trim()).filter(Boolean); if (b.length) o.bairros = b;
    const n = (v) => { const x = Number(String(v == null ? '' : v).replace(/[^\d]/g, '')); return x > 0 ? x : null; };
    if (n(p.vmin)) o.vmin = n(p.vmin); if (n(p.vmax)) o.vmax = n(p.vmax); if (n(p.dorm)) o.dorm = n(p.dorm); if (n(p.vagas)) o.vagas = n(p.vagas);
    return o; }

  // ---------------------------------------------------------------- cálculo (memória por versão dos dados)
  let MEMO = { k: null, r: null };
  function calcula() {
    const crm = (H.S && H.S.crm_leads) || {}, ctx = H.op.ctx();
    const op = H.S && H.S.oportunidades, lc = H.S && H.S.leads_contatos;
    if (MEMO.k && MEMO.k[0] === crm && MEMO.k[1] === ctx && MEMO.k[2] === hoje() && MEMO.k[3] === op && MEMO.k[4] === lc) return MEMO.r;
    const enc = new Map(); try { (H.op.encaminhados() || []).forEach((x) => enc.set(x.id, x)); } catch (_) {}
    const L = [];
    Object.keys(crm).forEach((id) => { const l = Object.assign({ _id: id }, crm[id] || {}); if (!l.nome || !ABERTA(l.etapa)) return;
      const ult = l.ultimo || l.entrada || '', dd = diasDesde(ult), cap = captacao(l);
      const pc = perfilCrm(l), e = enc.get(id), pe = (e && e.perfil) || null;
      const confirmou = Object.keys(pc).some((k) => k !== 'fin');
      let p = Object.assign({}, pe || {}, pc), inferido = !confirmou && !!pe && pe.origem !== 'confirmado';
      if (!pe) { const emp = ctx.empDaCampanha && ctx.empDaCampanha(l.campanha); if (emp) { p.emp = emp.id; if (!p.bairros) p.bairros = [emp.bairro].filter(Boolean); if (!p.fin) p.fin = 'Venda'; inferido = !confirmou; } }
      if (!p.fin && /locat/.test(sem(l.interesse))) p.fin = 'Locação'; if (!p.fin && /compr/.test(sem(l.interesse))) p.fin = 'Venda';
      const conhecidos = [p.tipo, (p.bairros || []).length || p.emp, p.vmin || p.vmax, p.dorm].filter(Boolean).length;
      let casa = [], ader = 0, pPerf = 0; const temPerfil = !cap && conhecidos > 0;
      if (temPerfil) {
        // o lançamento da própria campanha não conta como match (o lead já chegou por ele); unidades do mesmo empreendimento contam
        try { casa = H.op.casar(p, ctx, { max: 6, relaxa: false, excluir: new Set(p.emp ? ['E:' + p.emp] : []) }) || []; } catch (_) { casa = []; }
        const poss = (p.tipo ? 2 : 0) + ((p.bairros || []).length ? 3 : 0) + (p.emp ? 2 : 0) + (p.vmin || p.vmax ? 2 : 0) + (p.dorm ? 1 : 0) + (p.vagas ? 1 : 0) + (p.amin && p.amax ? 2 : 0) + 1;
        casa = casa.map((c) => Object.assign({}, c, { pct: Math.round(100 * Math.max(0, Math.min(1, c.pts / poss))) }));
        ader = casa.length ? casa[0].pct / 100 : 0;
        pPerf = Math.round(PESO.perfil * ader * Math.min(1, conhecidos / 3));
      }
      const oc = ((H.S && H.S.oportunidades) || {})[id], ocp = (oc && oc.perfil) || {};
      const orcConf = !!(pc.vmin || pc.vmax) || !!(String(ocp.vmin || '').replace(/\D/g, '') || String(ocp.vmax || '').replace(/\D/g, ''));
      const pOrc = cap ? 0 : orcConf ? PESO.orc : (p.vmin || p.vmax) ? Math.round(PESO.orc / 2) : 0;
      const [pOri, oriTxt] = origem(l), pR = pRec(dd);
      const notaF = cap ? Math.round((pR + pOri) * 100 / (PESO.rec + PESO.orig)) : pR + pPerf + pOrc + pOri;
      // imóvel "novo" do perfil: o mais recente da lista casada, de preferência atualizado depois do último contato
      const novo = casa.filter((x) => x.it && x.it.origem !== 'fora').slice().sort((a, b) => String(b.it.atu || '').localeCompare(String(a.it.atu || '')));
      const imNovo = (novo.find((x) => dia(x.it.atu) != null && dia(ult) != null && dia(x.it.atu) > dia(ult)) || novo[0] || null);
      const prox = String(l.data_prox || '').slice(0, 10), h = hoje(), dp = dia(prox);
      L.push({ id, l, nome: l.nome, cor: l.corretor || '', etapa: l.etapa || 'Novo', ult, dd, cap, p, inferido, conhecidos, casa, ader,
        temPerfil, pR, pPerf, pOrc, pOri, oriTxt, nota: Math.max(0, Math.min(100, notaF)), vencido: dp != null && dp < h, hojeRet: dp != null && dp === h, prox, imNovo });
    });
    L.sort((a, b) => b.nota - a.nota || (a.dd == null ? 999 : a.dd) - (b.dd == null ? 999 : b.dd));
    MEMO = { k: [crm, ctx, hoje(), op, lc], r: L }; return L;
  }

  // ---------------------------------------------------------------- textos
  const descImovel = (it) => it ? [it.tipo === 'Empreendimento' ? 'empreendimento ' + (it.nome || it.ref) : it.tipo, it.bairro ? 'no ' + it.bairro : '', it.dorm ? it.dorm + ' dorm.' : '', brlc(it.valor)].filter(Boolean).join(', ') : '';
  function mensagem(x) {
    const n = prim(x.nome), c = prim(nomeCor(x.cor)) || 'a equipe';
    if (x.cap) return /vend/.test(sem(x.l.interesse)) ? `Olá, ${n}! Aqui é ${c}, da Vivere Imóveis Selecionados. Conversamos há alguns dias sobre o seu imóvel. Ele ainda está à venda? Temos compradores procurando na região e posso te mostrar como a gente divulga e qualifica os interessados. Posso te ligar hoje?`
      : `Olá, ${n}! Aqui é ${c}, da Vivere Imóveis Selecionados. Conversamos há alguns dias sobre o seu imóvel. Ele ainda está disponível? Seguimos com interessados na região e posso te explicar como a gente cuida da análise do inquilino e da administração. Posso te ligar hoje?`;
    const it = x.imNovo && x.imNovo.it;
    if (it) return `Olá, ${n}! Aqui é ${c}, da Vivere Imóveis Selecionados. Lembrei de você: separei um imóvel que combina com o que você procura — ${descImovel(it)}.${/^https?:\/\//i.test(it.link || '') ? ' ' + it.link : ''} Quer que eu te mande os detalhes ou marque uma visita?`;
    return `Olá, ${n}! Aqui é ${c}, da Vivere Imóveis Selecionados. Ainda está procurando imóvel? Me conta o que mudou na sua busca (região, valor, quartos) que eu te mando as opções novas desta semana.`;
  }
  const motivoLigar = (x) => [x.vencido ? 'retorno vencido (' + dtc(x.prox) + ')' : x.hojeRet ? 'retorno marcado para hoje' : '', x.etapa === 'Novo' && x.dd != null && x.dd <= 2 ? 'lead novo' : '',
    x.ader >= 0.6 ? Math.round(x.ader * 100) + '% de aderência' : '', x.pOrc === PESO.orc ? 'orçamento confirmado' : ''].filter(Boolean).join(' · ') || 'maior nota';

  // ---------------------------------------------------------------- listas
  function ligarHoje(L) {
    const por = new Map(); L.forEach((x) => { const k = x.cor || '(sem corretor)'; if (!por.has(k)) por.set(k, []); por.get(k).push(x); });
    const out = []; por.forEach((a) => { const v = a.filter((x) => x.vencido || x.hojeRet), resto = a.filter((x) => !(x.vencido || x.hojeRet)).slice(0, 5);
      v.concat(resto).forEach((x) => out.push(x)); });
    return out.sort((a, b) => String(nomeCor(a.cor)).localeCompare(String(nomeCor(b.cor)), 'pt-BR') || (b.vencido - a.vencido) || b.nota - a.nota);
  }
  const parados = (L) => L.filter((x) => x.dd != null && x.dd >= PARADO).sort((a, b) => b.nota - a.nota);

  // ---------------------------------------------------------------- fatia 2: match com % e o que captar
  const FAM = (t) => { const x = sem(t); return /apart|cobert|studio|estudio|loft|garden|duplex|flat|kitnet/.test(x) ? 'Apartamento' : /casa|sobrado|geminad/.test(x) ? 'Casa' : /terren|lote/.test(x) ? 'Terreno' : /comerc|sala|loja|galpa/.test(x) ? 'Comercial' : t ? String(t) : ''; };
  const n0 = (v) => { const x = Number(String(v == null ? '' : v).replace(/[^\d]/g, '')); return x > 0 ? x : null; };
  // demandas extras ativas (aba CRM › Demandas extras), no mesmo formato de perfil do motor
  function demandasAtivas() { const h = H.hojeISO ? H.hojeISO() : new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); return Object.entries((H.S && H.S.demandas) || {}).filter(([, d]) => d && d.status === 'ativa' && String(d.expira_em || '') >= h).map(([id, d]) => ({ id, d,
    p: { fin: d.finalidade === 'Compra' ? 'Venda' : d.finalidade === 'Temporada' ? 'Temporada' : d.finalidade ? 'Locação' : '', tipo: d.tipo && d.tipo !== 'Outro' ? (d.tipo === 'Sala/comercial' ? 'Comercial' : d.tipo) : '',
      bairros: Array.isArray(d.bairros) ? d.bairros.slice() : [], vmax: n0(d.valor_max), vmin: n0(d.valor_min), dorm: n0(d.dorm_min), vagas: n0(d.vagas_min), amin: n0(d.area_min), amax: n0(d.area_max) } })); }
  function captar(L) {
    const ctx = H.op.ctx(), emp = (id) => (ctx.empPorId && ctx.empPorId.get && ctx.empPorId.get(id)) || null, G = new Map();
    const add = (p, ader, quem) => { if (!p || !p.fin || ader >= 0.5) return;
      const bairro = (p.bairros || [])[0] || (p.emp && emp(p.emp) ? emp(p.emp).bairro : '') || '', tipo = FAM(p.tipo);
      if (!bairro && !tipo) return;
      const k = [p.fin, tipo, sem(bairro)].join('|'); let g = G.get(k);
      if (!g) { g = { fin: p.fin, tipo, bairro, leads: 0, dem: 0, notas: 0, vmin: null, vmax: null, dorm: null, cors: new Set(), nomes: [] }; G.set(k, g); }
      if (quem.dem) g.dem++; else { g.leads++; g.notas += quem.nota || 0; }
      if (p.vmin) g.vmin = g.vmin == null ? p.vmin : Math.min(g.vmin, p.vmin); if (p.vmax) g.vmax = g.vmax == null ? p.vmax : Math.max(g.vmax, p.vmax);
      if (p.dorm) g.dorm = g.dorm == null ? p.dorm : Math.min(g.dorm, p.dorm); if (quem.cor) g.cors.add(quem.cor); if (g.nomes.length < 6) g.nomes.push(quem.nome); };
    L.forEach((x) => { if (x.temPerfil) add(x.p, x.ader, { nota: x.nota, cor: x.cor, nome: x.nome }); });
    demandasAtivas().forEach((m) => { let c = []; try { c = H.op.casar(m.p, ctx, { max: 3, relaxa: false }) || []; } catch (_) {} const poss = (m.p.tipo ? 2 : 0) + (m.p.bairros.length ? 3 : 0) + (m.p.vmin || m.p.vmax ? 2 : 0) + (m.p.dorm ? 1 : 0) + (m.p.vagas ? 1 : 0) + (m.p.amin && m.p.amax ? 2 : 0) + 1;
      add(m.p, c.length ? c[0].pts / poss : 0, { dem: true, cor: m.d.autor || '', nome: 'demanda extra' + (m.d.autor ? ' de ' + m.d.autor : '') }); });
    return [...G.values()].map((g) => Object.assign(g, { media: g.leads ? Math.round(g.notas / g.leads) : 0, peso: Math.round((g.leads + 2 * g.dem) * (1 + (g.leads ? g.notas / g.leads : 0) / 100) * 10) / 10 }))
      .sort((a, b) => b.peso - a.peso || b.leads - a.leads);
  }
  const faixaTxt = (g) => g.vmin && g.vmax ? brlc(g.vmin) + ' a ' + brlc(g.vmax) : g.vmax ? 'até ' + brlc(g.vmax) : g.vmin ? 'a partir de ' + brlc(g.vmin) : 'valor não informado';
  const pedidoCaptar = (g) => `Captar: ${g.tipo || 'imóvel'} para ${g.fin === 'Venda' ? 'venda' : g.fin === 'Temporada' ? 'temporada' : 'locação'}${g.bairro ? ' no ' + g.bairro : ''}, ${faixaTxt(g)}${g.dorm ? ', ' + g.dorm + '+ dormitórios' : ''}. `
    + `${g.leads} cliente(s) dos painéis${g.dem ? ' e ' + g.dem + ' demanda(s) extra(s)' : ''} procurando, sem imóvel com 50%+ de aderência na carteira (HUB VIVERE, ${dtc(H.hojeISO ? H.hojeISO() : '')}).`;

  // ---------------------------------------------------------------- aba
  const CSS = `<style id="icrm-css">.icrm-sec{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 12px}.icrm-cor{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
  .icrm-cor .btn,.icrm-sec .btn{white-space:normal;max-width:100%;box-sizing:border-box}
  .icrm-nota{display:inline-block;min-width:2.4em;text-align:center;font-weight:700;padding:1px 6px;border-radius:999px;background:var(--soft)}
  .icrm-nota.a{background:color-mix(in srgb,var(--ok,#2e7d32) 22%,transparent)}.icrm-nota.m{background:color-mix(in srgb,var(--warn,#b8860b) 22%,transparent)}
  .icrm-comp{font-size:12px;color:var(--muted);white-space:normal}.icrm-msg{white-space:normal;font-size:12.5px;color:var(--muted);margin-top:4px}
  #conteudo .icrm-tab td{vertical-align:top}.icrm-lista{display:flex;flex-direction:column;gap:8px}.icrm-bcab{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.icrm-bcab b{margin-right:auto}.icrm-pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:13px;margin:10px 0 0;padding:10px;border-radius:6px;background:var(--soft)}.icrm-como{margin-top:16px}.icrm-como summary{cursor:pointer}.icrm-como li{margin:3px 0}</style>`;
  const clsN = (n) => n >= 60 ? 'a' : n >= 35 ? 'm' : '';
  const notaH = (x) => `<span class="icrm-nota ${clsN(x.nota)}" title="recência ${x.pR} · perfil ${x.cap ? '—' : x.pPerf} · orçamento ${x.cap ? '—' : x.pOrc} · origem ${x.pOri}">${x.nota}</span>`;
  const comp = (x) => `<div class="icrm-comp">rec. ${x.pR}/40 · ${x.cap ? 'captação (sem perfil)' : 'perfil ' + x.pPerf + '/30 · orç. ' + x.pOrc + '/20'} · origem ${x.pOri}/10 (${esc(x.oriTxt)})</div>`;
  const perfTxt = (x) => { if (x.cap) return 'Tem imóvel (captação)'; const um = x.conhecidos === 1 ? ' · só 1 critério' : ''; let d = ''; try { d = H.op.descreve(x.p) || ''; } catch (_) {} return (d || (x.p.fin || 'sem perfil')) + (x.inferido ? ' · inferido' : '') + um; };
  const ultH = (x) => x.dd == null ? '—' : dtc(x.ult) + ` <span class="s">(${x.dd} d)</span>`;

  function tabLigar(L) {
    const V = ligarHoje(L);
    if (!V.length) return H.vazio('Nenhum lead aberto para ligar hoje.');
    return `<div class="tabela"><table class="icrm-tab"><thead><tr><th>Corretor</th><th>Lead</th><th class="n">Nota</th><th>Por quê</th><th>Etapa</th><th>Último contato</th></tr></thead><tbody>${V.map((x) =>
      `<tr><td>${esc(nomeCor(x.cor))}</td><td><b>${esc(x.nome)}</b><div class="icrm-comp">${esc(x.l.campanha || '')}</div></td><td class="n">${notaH(x)}</td><td>${esc(motivoLigar(x))}</td><td>${esc(x.etapa)}</td><td>${ultH(x)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function tabParados(L) {
    const V = parados(L);
    if (!V.length) return H.vazio('Nenhum lead aberto parado há ' + PARADO + ' dias ou mais.');
    return `<div class="tabela"><table class="icrm-tab"><thead><tr><th>Lead</th><th>Corretor</th><th class="n">Dias sem contato</th><th>Imóvel sugerido</th><th>Mensagem</th></tr></thead><tbody>${V.map((x) => { const it = x.imNovo && x.imNovo.it;
      return `<tr><td><b>${esc(x.nome)}</b><div class="icrm-comp">${esc(x.l.campanha || '')} · nota ${x.nota}</div></td><td>${esc(nomeCor(x.cor))}</td><td class="n">${x.dd}</td>
        <td>${it ? `${it.tipo === 'Empreendimento' ? '' : esc(it.ref || '') + ' '}${esc(descImovel(it))}${/^https?:\/\//i.test(it.link || '') ? ` <a href="${esc(it.link)}" target="_blank" rel="noopener">↗</a>` : ''}` : `<span class="s">${x.cap ? 'captação' : 'sem imóvel do perfil'}</span>`}</td>
        <td><button class="btn" data-icrm-copia="${esc(x.id)}">Copiar mensagem</button>${E.aberto === x.id ? `<div class="icrm-msg">${esc(mensagem(x))}</div>` : `<div><button class="btn" data-icrm-ver="${esc(x.id)}" style="margin-top:4px;font-size:12px">Ver texto</button></div>`}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  function tabNotas(L) {
    if (!L.length) return H.vazio('Nenhum lead aberto.');
    return `<div class="tabela"><table class="icrm-tab"><thead><tr><th>Lead</th><th>Corretor</th><th class="n">Nota</th><th>Composição</th><th>Perfil</th><th>Etapa</th><th>Último contato</th></tr></thead><tbody>${L.map((x) =>
      `<tr><td><b>${esc(x.nome)}</b><div class="icrm-comp">${esc(x.l.campanha || '')}</div></td><td>${esc(nomeCor(x.cor))}</td><td class="n">${notaH(x)}</td><td>${comp(x)}</td><td>${esc(perfTxt(x))}</td><td>${esc(x.etapa)}</td><td>${ultH(x)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function tabMatch(L) {
    const V = L.filter((x) => x.temPerfil && x.ader >= 0.5).sort((a, b) => b.ader - a.ader || b.nota - a.nota);
    const sem0 = L.filter((x) => x.temPerfil && x.ader < 0.5).length, semP = L.filter((x) => !x.cap && !x.temPerfil).length;
    const linkIt = (it) => /^https?:\/\//i.test(it.link || '') ? ` <a href="${esc(it.link)}" target="_blank" rel="noopener">↗</a>` : '';
    return `<p class="nota">${V.length} lead(s) com imóvel de 50%+ de aderência · ${sem0} com perfil e nada aderente na carteira (vão para O que captar) · ${semP} sem perfil (só a finalidade ou nada: o corretor precisa perguntar tipo, bairro e valor).</p>`
      + (V.length ? `<div class="tabela"><table class="icrm-tab"><thead><tr><th>Lead</th><th>Corretor</th><th class="n">Aderência</th><th>Perfil</th><th>Imóveis da carteira</th><th></th></tr></thead><tbody>${V.map((x) =>
        `<tr><td><b>${esc(x.nome)}</b><div class="icrm-comp">nota ${x.nota}</div></td><td>${esc(nomeCor(x.cor))}</td><td class="n"><span class="icrm-nota ${clsN(Math.round(x.ader * 100))}">${Math.round(x.ader * 100)}%</span></td><td>${esc(perfTxt(x))}</td>
        <td>${x.casa.filter((c) => c.pct > 0).slice(0, 3).map((c) => `<div>${c.pct}% · ${c.it.tipo === 'Empreendimento' ? '' : esc(c.it.ref || '') + ' '}${esc(descImovel(c.it))}${linkIt(c.it)}${c.alerta ? `<div class="icrm-comp">${esc(c.alerta)}</div>` : ''}</div>`).join('')}</td>
        <td><button class="btn" data-icrm-ofertas="${esc(x.id)}" title="Abre CRM › Ofertas; busque pelo nome do lead">Abrir Ofertas</button></td></tr>`).join('')}</tbody></table></div>` : H.vazio('Nenhum lead com imóvel aderente.'));
  }
  function tabCaptar(L) {
    const G = captar(L); CAPT = G;
    if (!G.length) return H.vazio('Nenhum perfil procurado sem imóvel aderente na carteira.');
    return `<div class="tabela"><table class="icrm-tab"><thead><tr><th class="n">#</th><th>O que captar</th><th>Faixa</th><th class="n">Procurando</th><th class="n">Nota média</th><th>Corretores</th><th></th></tr></thead><tbody>${G.map((g, i) =>
      `<tr><td class="n">${i + 1}</td><td><b>${esc(g.tipo || 'Imóvel')} · ${esc(g.fin)}</b><div class="icrm-comp">${esc(g.bairro || 'bairro não informado')}${g.dorm ? ' · ' + g.dorm + '+ dorm.' : ''}</div></td><td>${esc(faixaTxt(g))}</td>
      <td class="n">${g.leads}${g.dem ? ` <span class="s">+${g.dem} extra</span>` : ''}</td><td class="n">${g.leads ? g.media : '—'}</td><td>${esc([...g.cors].map(nomeCor).join(', ') || '—')}</td>
      <td><button class="btn" data-icrm-captar="${i}">Copiar pedido</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  let CAPT = [];
  // ---------------------------------------------------------------- fatia 3: briefing matinal por corretor
  function briefing(cor, T) {
    const L = T.filter((x) => (x.cor || '(sem corretor)') === cor); if (!L.length) return '';
    const n1 = prim(nomeCor(cor)) || 'corretor', lig = ligarHoje(L), par = parados(L), mat = L.filter((x) => x.temPerfil && x.ader >= 0.6).sort((a, b) => b.ader - a.ader || b.nota - a.nota);
    const h = H.hojeISO ? H.hojeISO() : '', lin = [];
    lin.push(`Bom dia, ${n1}! Seu CRM hoje (${dtc(h)}): ${L.length} lead(s) aberto(s), nota média ${Math.round(L.reduce((s, x) => s + x.nota, 0) / L.length)}.`);
    if (lig.length) { lin.push('', `📞 Ligar hoje (${lig.length}):`); lig.slice(0, 8).forEach((x, i) => lin.push(`${i + 1}. ${x.nome} — ${motivoLigar(x)} (nota ${x.nota})`)); if (lig.length > 8) lin.push(`… e mais ${lig.length - 8} no HUB.`); }
    if (par.length) { lin.push('', `♻️ Reativar (${par.length} sem contato há ${PARADO}+ dias):`); par.slice(0, 5).forEach((x) => lin.push(`• ${x.nome} — ${x.dd} dias${x.imNovo && x.imNovo.it ? '; ofereça ' + descImovel(x.imNovo.it) : ''}`)); if (par.length > 5) lin.push(`• e mais ${par.length - 5}.`); }
    if (mat.length) { lin.push('', '🧩 Imóveis que combinam:'); mat.slice(0, 3).forEach((x) => { const c = x.casa[0]; lin.push(`• ${x.nome}: ${c.pct}% com ${c.it.tipo === 'Empreendimento' ? '' : (c.it.ref || '') + ' '}${descImovel(c.it)}`); }); }
    const venc = L.filter((x) => x.vencido).length; if (venc) lin.push('', `⚠️ ${venc} retorno(s) vencido(s): registre o contato no painel depois de falar com o cliente.`);
    lin.push('', 'Bom trabalho! — Vivere Imóveis Selecionados');
    return lin.join('\n');
  }
  function pBriefing(T) {
    const cors = [...new Set(T.map((x) => x.cor || '(sem corretor)'))].filter((c) => E.cor === 'todos' || c === E.cor).sort((a, b) => nomeCor(a).localeCompare(nomeCor(b), 'pt-BR'));
    if (!cors.length) return H.vazio('Nenhum corretor com lead aberto.');
    return `<div class="icrm-lista">${cors.map((c) => { const t = briefing(c, T), ab = E.aberto === 'b:' + c;
      return `<div class="card icrm-brief"><div class="icrm-bcab"><b>${esc(nomeCor(c))}</b><span class="s">${T.filter((x) => (x.cor || '(sem corretor)') === c).length} lead(s)</span>
        <button class="btn" data-icrm-brief="${esc(c)}">Copiar briefing</button><button class="btn" data-icrm-ver="${esc('b:' + c)}">${ab ? 'Fechar' : 'Ver texto'}</button></div>${ab ? `<pre class="icrm-pre">${esc(t)}</pre>` : ''}</div>`; }).join('')}</div>`;
  }

  function render() {
    const carregou = !!(H.carregado && H.carregado.crm_leads === true) || Object.keys((H.S && H.S.crm_leads) || {}).length > 0;
    const T = calcula(), cors = [...new Set(T.map((x) => x.cor || '(sem corretor)'))].sort((a, b) => nomeCor(a).localeCompare(nomeCor(b), 'pt-BR'));
    if (E.cor !== 'todos' && !cors.includes(E.cor)) E.cor = 'todos';
    const L = E.cor === 'todos' ? T : T.filter((x) => (x.cor || '(sem corretor)') === E.cor);
    const nLig = ligarHoje(L).length, nPar = parados(L).length, media = L.length ? Math.round(L.reduce((s, x) => s + x.nota, 0) / L.length) : 0, nVenc = L.filter((x) => x.vencido).length;
    const kpi = (sec, rot, num, sub, al) => `<button class="kpi ${al ? 'alerta' : ''}" data-icrm-sec="${sec}"><span class="rot">${rot}</span><span class="num">${num}</span><span class="sub">${sub}</span></button>`;
    const chipsCor = `<div class="icrm-cor"><button class="btn" data-icrm-cor="todos" aria-pressed="${E.cor === 'todos'}">Todos (${T.length})</button>${cors.map((c) => `<button class="btn" data-icrm-cor="${esc(c)}" aria-pressed="${E.cor === c}">${esc(nomeCor(c))} (${T.filter((x) => (x.cor || '(sem corretor)') === c).length})</button>`).join('')}</div>`;
    const secs = [['briefing', '🌅 Briefing do dia'], ['ligar', '📞 Ligar hoje'], ['reativar', '♻️ Reativar parados'], ['match', '🧩 Match com a carteira'], ['captar', '🏗 O que captar'], ['notas', '📊 Nota de todos']];
    const corpo = E.sec === 'briefing' ? `<h3>🌅 Briefing do dia por corretor</h3><p class="nota">Resumo para cada corretor começar o dia: quem ligar, quem reativar e os imóveis que combinam. Copie e mande ao corretor (o aviso automático pela Vivian é outra construção, a vis-vivian-alertas-corretores-hub, que vai ler esta mesma conta).</p>${pBriefing(T)}`
      : E.sec === 'match' ? `<h3>🧩 Match: lead × carteira</h3><p class="nota">Aderência = quanto o imóvel atende ao perfil (tipo, bairro ou empreendimento, valor, dormitórios, vagas), pelo mesmo motor das Ofertas. Até 3 imóveis por lead; para ofertar, abra nas Ofertas.</p>${tabMatch(L)}`
      : E.sec === 'captar' ? `<h3>🏗 O que captar primeiro</h3><p class="nota">Perfis procurados pelos leads abertos e pelas demandas extras ativas sem imóvel com 50% de aderência ou mais na carteira, agrupados por finalidade, tipo e bairro. Ordem: clientes procurando (demanda extra vale 2) × nota média. Copie o pedido para o captador.</p>${tabCaptar(L)}`
      : E.sec === 'reativar' ? `<h3>♻️ Reativar: ${PARADO}+ dias sem contato</h3><p class="nota">Mensagem pronta com o imóvel mais novo do perfil. Copie e passe ao corretor: o envio é sempre dele.</p>${tabParados(L)}`
      : E.sec === 'notas' ? `<h3>📊 Nota de todos os leads abertos</h3><p class="nota">Passe o dedo ou o mouse na nota para ver a conta. "Inferido" = perfil deduzido da campanha ou do imóvel de interesse, sem confirmação do corretor.</p>${tabNotas(L)}`
      : `<h3>📞 Ligar hoje</h3><p class="nota">Por corretor: primeiro os retornos vencidos ou marcados para hoje, depois as 5 maiores notas.</p>${tabLigar(L)}`;
    return CSS + `<h2>🎯 Inteligência do CRM</h2>
      <p class="nota">Nota de cada lead aberto dos painéis dos corretores, quem ligar hoje e quem reativar. Só leitura: nada aqui grava nos leads nem envia mensagem.</p>
      ${carregou ? '' : '<div class="aviso">Carregando os leads dos painéis…</div>'}
      <div class="kpis">${kpi('notas', 'Leads abertos', L.length, 'nota média ' + media)}${kpi('ligar', 'Ligar hoje', nLig, nVenc ? nVenc + ' retorno(s) vencido(s)' : 'por corretor', nVenc > 0)}${kpi('reativar', 'Parados', nPar, PARADO + '+ dias sem contato', nPar > 0)}${kpi('notas', 'Nota 60+', L.filter((x) => x.nota >= 60).length, 'leads quentes')}</div>
      ${chipsCor}<div class="icrm-sec">${secs.map(([k, t]) => `<button class="btn" data-icrm-sec="${k}" aria-pressed="${E.sec === k}">${t}</button>`).join('')}</div>
      ${corpo}
      <details class="card icrm-como"><summary><b>Como a nota é calculada</b></summary><ul>
        <li><b>Recência (40):</b> último contato até 2 dias = 40; cai em linha reta até 0 aos 30 dias (sem contato, conta a entrada do lead).</li>
        <li><b>Perfil × carteira (30):</b> quanto o melhor imóvel da carteira (site, fora do site e lançamentos) atende ao perfil, vezes o quanto o perfil é conhecido (tipo, bairro, valor, dormitórios; 3 deles = cheio).</li>
        <li><b>Orçamento (20):</b> faixa de valor confirmada pelo corretor = 20; inferida da campanha ou do imóvel de interesse = 10; sem = 0.</li>
        <li><b>Origem (10):</b> Vivian ou painel do corretor = 10 · Meta/Google Ads = 7 · portais = 6 · planilhas e listas de captação = 4.</li>
        <li>Lead de captação (quem tem imóvel): sem perfil × carteira; recência e origem levadas a 100.</li>
        <li>Pesos de 14/11/2026, ponto de partida: o Cleiton ajusta depois de ver a lista.</li></ul></details>`;
  }

  H.registrar({ id: ID, aba: '🎯 Inteligência', grupo: 'crm', depois: 'crm', colecoes: ['demandas'], render,
    dicaBusca: 'Buscar na Inteligência do CRM: lead, corretor, campanha…' });

  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-icrm-cor],[data-icrm-sec],[data-icrm-copia],[data-icrm-ver],[data-icrm-ofertas],[data-icrm-captar],[data-icrm-brief]'); if (!b) return;
    const d = b.dataset;
    if (d.icrmCor) { E.cor = d.icrmCor; return H.pede(); }
    if (d.icrmSec) { E.sec = d.icrmSec; return H.pede(); }
    if (d.icrmVer) { E.aberto = E.aberto === d.icrmVer ? '' : d.icrmVer; return H.pede(); }
    if (d.icrmBrief) { const t = briefing(d.icrmBrief, calcula()); if (t) H.copiaTexto(t, b); return; }
    if (d.icrmOfertas) { try { H.irPara('oportunidades'); } catch (_) {} return; }
    if (d.icrmCaptar !== undefined) { const g = CAPT[+d.icrmCaptar]; if (g) H.copiaTexto(pedidoCaptar(g), b); return; }
    if (d.icrmCopia) { const x = calcula().find((y) => y.id === d.icrmCopia); if (x) H.copiaTexto(mensagem(x), b); return; }
  });
  // para a fatia 3 (briefing) e para a Vivian (vis-vivian-alertas-corretores-hub) lerem a mesma conta, sem duplicar a regra
  H.inteligenciaCrm = { calcula, ligarHoje, parados, mensagem, captar, pedidoCaptar, briefing, PESO, PARADO };
})();
