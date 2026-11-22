/* Relatórios e exportação do CRM da Vivere (16/11/2026, sessão "VIS - Construção - Ampliação CRM Corretores F3", fatia 3).
   Decisões do Cleiton nos cartões de 16/11/2026: o mesmo módulo no app (só os leads do corretor) e no HUB (todos os corretores).
   Relatórios: conversão por etapa, tempo por etapa, motivos de perda e origem dos leads; no HUB também ranking por corretor e
   filtro por corretor. Período escolhido em todos (pela data de entrada do lead). Exportação em Excel (.xlsx), CSV e PDF.
   LGPD: o corretor baixa os relatórios e a lista SEM telefone e e-mail (o módulo nunca exporta contato). Custo por origem fica
   para a integração com o Meta e o Google Ads (decisão de 16/11/2026). Depende de funis-crm.js (window.FunisCRM).
   Fonte única: o HUB usa este mesmo arquivo em modulos/ (copiar, sem editar lá). */
(function () {
  if (window.RelatoriosCRM) return;
  const FC = () => window.FunisCRM;
  const VERSAO = '2026-11-16.3';

  // ---------- datas ----------
  const hojeBR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const d10 = (s) => { const t = String(s || '').trim(); let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
  const ms = (s) => { const x = String(s || ''); const t = Date.parse(x.length === 10 ? x + 'T12:00' : x.slice(0, 16)); return isFinite(t) ? t : null; };
  const diasEntre = (a, b) => (a == null || b == null ? null : Math.max(0, (b - a) / 864e5));
  const mesSeg = (m, n) => { let [a, b] = m.split('-').map(Number); b += n; while (b > 12) { b -= 12; a++; } while (b < 1) { b += 12; a--; } return `${a}-${String(b).padStart(2, '0')}`; };
  const ultimoDia = (m) => { const [a, b] = m.split('-').map(Number); return `${m}-${String(new Date(a, b, 0).getDate()).padStart(2, '0')}`; };
  // períodos prontos; {de, ate} em AAAA-MM-DD (vazio = sem limite)
  function periodo(k, hoje, de, ate) {
    const h = hoje || hojeBR(), m = h.slice(0, 7);
    if (k === 'mes') return { k, de: m + '-01', ate: h, rot: 'Este mês' };
    if (k === 'mes_ant') { const p = mesSeg(m, -1); return { k, de: p + '-01', ate: ultimoDia(p), rot: 'Mês passado' }; }
    if (k === '90d') { const t = new Date(Date.parse(h + 'T12:00') - 89 * 864e5).toISOString().slice(0, 10); return { k, de: t, ate: h, rot: 'Últimos 90 dias' }; }
    if (k === 'ano') return { k, de: h.slice(0, 4) + '-01-01', ate: h, rot: 'Este ano' };
    if (k === 'intervalo') return { k, de: d10(de), ate: d10(ate), rot: 'Intervalo' };
    return { k: 'tudo', de: '', ate: '', rot: 'Todo o período' };
  }
  const PERIODOS = [['mes', 'Este mês'], ['mes_ant', 'Mês passado'], ['90d', '90 dias'], ['ano', 'Este ano'], ['tudo', 'Tudo'], ['intervalo', 'Intervalo']];
  const noPeriodo = (l, P) => { if (!P || (!P.de && !P.ate)) return true; const e = d10(l.entrada); if (!e) return false; return (!P.de || e >= P.de) && (!P.ate || e <= P.ate); };

  // ---------- histórico de etapas ----------
  // app: historico [{em, tipo, texto}] · HUB: hist [{dh, tipo, txt}] (últimos 30). Troca de etapa = "Etapa: A → B (motivo)."
  const RX = /^\s*Etapa:\s*(.+?)\s*→\s*(.+?)(?:\s*\(.*\))?\.?\s*$/;
  function trocas(l) {
    const H = Array.isArray(l.historico) ? l.historico : Array.isArray(l.hist) ? l.hist : [];
    return H.map((h) => { const m = RX.exec(String(h.texto != null ? h.texto : h.txt || '')); const t = ms(h.em || h.dh); return m && t != null ? { de: m[1], para: m[2].replace(/\.$/, ''), t } : null; })
      .filter(Boolean).sort((a, b) => a.t - b.t);
  }
  // estadias em cada etapa: [{e, ini, fim|null}] (fim null = ainda nela)
  function estadias(l, f) {
    const F = FC(), T = trocas(l), ent = ms(l.entrada), out = [];
    const D = F.def(f), atual0 = F.etapaNoFunil(l.etapa, f);
    // sem troca registrada: só se sabe quando entrou na etapa atual se ela é a 1ª do funil (desde a entrada) ou pelo etapa_em
    let e = T.length ? F.etapaNoFunil(T[0].de, f) : atual0, ini = T.length || atual0 === D.etapas[0] ? ent : ms(l.etapa_em);
    T.forEach((x) => { const para = F.etapaNoFunil(x.para, f); if (ini != null && x.t >= ini) out.push({ e, ini, fim: x.t }); e = para; ini = x.t; });
    const atual = F.etapaNoFunil(l.etapa, f);
    if (T.length && atual !== e) { const t = ms(l.etapa_em); if (t != null && ini != null && t >= ini) out.push({ e, ini, fim: t }); e = atual; ini = t != null ? t : ini; }
    if (ini == null && l.etapa_em) ini = ms(l.etapa_em);
    if (ini != null) out.push({ e, ini, fim: null });
    return out;
  }
  // maior etapa a que o lead chegou (índice no funil); Perdido conta o que ele alcançou antes de perder
  function alcance(l, f) {
    const F = FC(), D = F.def(f), atual = F.etapaNoFunil(l.etapa, f);
    let max = atual === 'Perdido' ? 0 : D.etapas.indexOf(atual);
    trocas(l).forEach((x) => [x.de, x.para].forEach((y) => { const e = F.etapaNoFunil(y, f); if (e !== 'Perdido') max = Math.max(max, D.etapas.indexOf(e)); }));
    return Math.max(0, max);
  }

  // ---------- cálculo ----------
  // itens = [{lead, f, cor?, corRot?}] · opts = {periodo:{de,ate}, funil: 'locacao'|...|'' (todos), cor: '' (todos), hoje}
  function calcular(itens, opts) {
    const F = FC(), o = opts || {}, hoje = o.hoje || hojeBR(), agora = ms(hoje + 'T23:59');
    const L = (itens || []).filter((x) => x && x.lead && (!o.funil || x.f === o.funil) && (!o.cor || x.cor === o.cor) && noPeriodo(x.lead, o.periodo));
    const funis = (o.funil ? [o.funil] : F.ORDEM).filter((f) => L.some((x) => x.f === f));
    const R = { versao: VERSAO, n: L.length, periodo: o.periodo || null, funis, conversao: {}, tempo: {}, motivos: {}, origem: [], ranking: [] };
    funis.forEach((f) => {
      const D = F.def(f), X = L.filter((x) => x.f === f), et = D.etapas.filter((e) => e !== 'Perdido');
      const al = X.map((x) => alcance(x.lead, f));
      const ganhos = X.filter((x) => F.ganho(x.lead.etapa, f)).length, perd = X.filter((x) => F.etapaNoFunil(x.lead.etapa, f) === 'Perdido').length;
      R.conversao[f] = { total: X.length, ganhos, perdidos: perd, abertos: X.filter((x) => F.aberta(x.lead.etapa, f)).length, taxa: X.length ? ganhos / X.length : 0,
        etapas: et.map((e, i) => { const n = al.filter((a) => a >= D.etapas.indexOf(e)).length, ant = i ? al.filter((a) => a >= D.etapas.indexOf(et[i - 1])).length : X.length;
          return { e, n, pctInicio: X.length ? n / X.length : 0, pctAnterior: ant ? n / ant : 0, ganho: e === D.ganho }; }) };
      const T = {}; X.forEach((x) => estadias(x.lead, f).forEach((s) => { if (s.e === 'Perdido' || !F.aberta(s.e, f) && s.fim == null) return;
        const k = T[s.e] = T[s.e] || { conc: [], cur: [] }; const d = diasEntre(s.ini, s.fim != null ? s.fim : agora); if (d == null) return; (s.fim != null ? k.conc : k.cur).push(d); }));
      const med = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null), mediana = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
      R.tempo[f] = et.filter((e) => T[e]).map((e) => ({ e, n: T[e].conc.length, media: med(T[e].conc), mediana: mediana(T[e].conc), emCurso: T[e].cur.length, mediaAtual: med(T[e].cur), alerta: F.paradoDias(e, f, o.prazos) }));
      const M = {}; X.filter((x) => F.etapaNoFunil(x.lead.etapa, f) === 'Perdido').forEach((x) => { const m = String(x.lead.motivo || '').trim() || 'Sem motivo'; M[m] = (M[m] || 0) + 1; });
      R.motivos[f] = Object.entries(M).sort((a, b) => b[1] - a[1]).map(([m, n]) => ({ m, n, pct: perd ? n / perd : 0 }));
    });
    const grupo = (chave) => { const G = {}; L.forEach((x) => { const k = chave(x), g = G[k] = G[k] || { k, n: 0, abertos: 0, ganhos: 0, perdidos: 0, valorGanho: 0, receitaGanha: 0, semProx: 0, rot: x.corRot };
      const e = x.lead.etapa; g.n++; if (F.aberta(e, x.f)) { g.abertos++; if (!x.lead.prox_acao && !x.lead.prox && !x.lead.data_prox) g.semProx++; }
      if (F.etapaNoFunil(e, x.f) === 'Perdido') g.perdidos++;
      if (F.ganho(e, x.f)) { g.ganhos++; g.valorGanho += F.valorDe(x.lead, x.f) || 0; g.receitaGanha += F.receitaDe(x.lead, x.f) || 0; } });
      return Object.values(G).map((g) => Object.assign(g, { taxa: g.n ? g.ganhos / g.n : 0, taxaDecididos: g.ganhos + g.perdidos ? g.ganhos / (g.ganhos + g.perdidos) : null })); };
    R.origem = grupo((x) => String(x.lead.campanha || '').trim() || 'Sem origem').sort((a, b) => b.n - a.n || a.k.localeCompare(b.k, 'pt'));
    if (o.ranking) R.ranking = grupo((x) => x.cor || '?').sort((a, b) => b.receitaGanha - a.receitaGanha || b.ganhos - a.ganhos || b.n - a.n);
    return R;
  }

  // ---------- tabelas (mesma fonte para a tela, o Excel, o CSV e o PDF) ----------
  const pct = (v) => (v == null ? '—' : (Math.round(v * 1000) / 10).toLocaleString('pt-BR') + '%');
  const d1 = (v) => (v == null ? '—' : (Math.round(v * 10) / 10).toLocaleString('pt-BR'));
  const brl = (v) => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');
  // célula: {v: valor para o Excel (número ou texto), t: texto para a tela/PDF}
  const C = (v, t) => ({ v, t: t != null ? t : v == null ? '—' : String(v) });
  function secoes(R, opts) {
    const F = FC(), o = opts || {}, S = [];
    const nomeF = (f) => F.def(f).rot;
    R.funis.forEach((f) => { const c = R.conversao[f]; if (!c || !c.total) return;
      S.push({ id: 'conv-' + f, grupo: 'conversao', titulo: `Conversão por etapa · ${nomeF(f)}`, nota: `${c.total} lead${c.total === 1 ? '' : 's'} · ${c.ganhos} ganho${c.ganhos === 1 ? '' : 's'} (${pct(c.taxa)}) · ${c.perdidos} perdido${c.perdidos === 1 ? '' : 's'} · ${c.abertos} em aberto. Cada etapa conta quem chegou a ela ou passou dela.`,
        cab: ['Etapa', 'Chegaram', '% do total', '% da etapa anterior'], num: [1, 2, 3],
        linhas: c.etapas.map((x) => [C(x.e + (x.ganho ? ' (ganho)' : '')), C(x.n), C(x.pctInicio, pct(x.pctInicio)), C(x.pctAnterior, pct(x.pctAnterior))]) }); });
    R.funis.forEach((f) => { const T = R.tempo[f]; if (!T || !T.length) return;
      S.push({ id: 'tempo-' + f, grupo: 'tempo', titulo: `Tempo por etapa · ${nomeF(f)}`, nota: 'Dias em cada etapa: média e mediana de quem já saiu dela; "agora" é quem ainda está nela. O tempo sai das trocas de etapa registradas no histórico.',
        cab: ['Etapa', 'Saíram', 'Média (dias)', 'Mediana (dias)', 'Estão agora', 'Média de quem está (dias)', 'Alerta de parado (dias)'], num: [1, 2, 3, 4, 5, 6],
        linhas: T.map((x) => [C(x.e), C(x.n), C(x.media, d1(x.media)), C(x.mediana, d1(x.mediana)), C(x.emCurso), C(x.mediaAtual, d1(x.mediaAtual)), C(x.alerta, x.alerta == null ? '—' : String(x.alerta))]) }); });
    R.funis.forEach((f) => { const M = R.motivos[f]; if (!M || !M.length) return;
      S.push({ id: 'mot-' + f, grupo: 'motivos', titulo: `Motivos de perda · ${nomeF(f)}`, cab: ['Motivo', 'Perdidos', '% dos perdidos'], num: [1, 2],
        linhas: M.map((x) => [C(x.m), C(x.n), C(x.pct, pct(x.pct))]) }); });
    if (R.origem.length) S.push({ id: 'origem', grupo: 'origem', titulo: 'Origem dos leads', nota: 'Origem = campanha ou canal de entrada do lead. Conversão = ganhos ÷ leads; "dos decididos" = ganhos ÷ (ganhos + perdidos). O custo por origem entra com a integração do Meta e do Google Ads.',
      cab: ['Origem', 'Leads', 'Em aberto', 'Ganhos', 'Perdidos', 'Conversão', 'Conversão dos decididos', 'Receita dos ganhos (R$)'], num: [1, 2, 3, 4, 5, 6, 7],
      linhas: R.origem.map((g) => [C(g.k), C(g.n), C(g.abertos), C(g.ganhos), C(g.perdidos), C(g.taxa, pct(g.taxa)), C(g.taxaDecididos, pct(g.taxaDecididos)), C(Math.round(g.receitaGanha), brl(g.receitaGanha))]) });
    if (R.ranking && R.ranking.length) S.push({ id: 'ranking', grupo: 'ranking', titulo: 'Ranking por corretor', nota: 'Ordem: receita estimada dos ganhos, depois ganhos e leads. Receita da Vivere: Locação 1 aluguel, Venda 6%, Temporada 15% (ou o % ajustado no negócio).',
      cab: ['Corretor', 'Leads', 'Em aberto', 'Sem próxima ação', 'Ganhos', 'Perdidos', 'Conversão', 'Valor dos ganhos (R$)', 'Receita dos ganhos (R$)'], num: [1, 2, 3, 4, 5, 6, 7, 8],
      linhas: R.ranking.map((g) => [C(o.nomeCor ? o.nomeCor(g.k) : g.rot || g.k), C(g.n), C(g.abertos), C(g.semProx), C(g.ganhos), C(g.perdidos), C(g.taxa, pct(g.taxa)), C(Math.round(g.valorGanho), brl(g.valorGanho)), C(Math.round(g.receitaGanha), brl(g.receitaGanha))]) });
    return S;
  }
  // lista de leads para baixar: NUNCA leva telefone, e-mail ou documento (decisão LGPD de 16/11/2026)
  function secaoLista(itens, opts) {
    const F = FC(), o = opts || {}, hoje = o.hoje || hojeBR();
    const L = (itens || []).filter((x) => x && x.lead && (!o.funil || x.f === o.funil) && (!o.cor || x.cor === o.cor) && noPeriodo(x.lead, o.periodo))
      .sort((a, b) => String(b.lead.entrada || '').localeCompare(String(a.lead.entrada || '')));
    const cab = ['Nome', ...(o.comCorretor ? ['Corretor'] : []), 'Funil', 'Interesse', 'Etapa', 'Motivo da perda', 'Valor (R$)', 'Probabilidade', 'Receita estimada (R$)', 'Fechamento previsto', 'Próxima ação', 'Data da próxima ação', 'Entrada', 'Origem'];
    const dBR = (s) => { const x = d10(s); return x ? x.split('-').reverse().join('/') : ''; };
    const linhas = L.map((x) => { const l = x.lead, f = x.f, v = F.valorDe(l, f), r = F.receitaDe(l, f), p = F.aberta(l.etapa, f) ? F.probDe(l, f, o.probTabela) : null;
      return [C(l.nome || ''), ...(o.comCorretor ? [C(o.nomeCor ? o.nomeCor(x.cor) : x.corRot || x.cor || '')] : []), C(F.def(f).rot), C(x.intRot || ''), C(F.etapaNoFunil(l.etapa, f)), C(l.motivo || ''),
        C(v == null ? null : Math.round(v), v == null ? '' : brl(v)), C(p == null ? null : p / 100, p == null ? '' : p + '%'), C(r == null ? null : Math.round(r), r == null ? '' : brl(r)),
        C(dBR(l.fechamento_prev)), C(l.prox_acao || l.prox || ''), C(dBR(l.data_prox)), C(dBR(l.entrada)), C(l.campanha || '')]; });
    return { id: 'lista', grupo: 'lista', titulo: 'Lista de leads', nota: `${L.length} lead${L.length === 1 ? '' : 's'} · sem telefone e e-mail · gerada em ${dBR(hoje)}`, cab, num: [6, 7, 8].map((i) => i + (o.comCorretor ? 1 : 0)), linhas, pctCol: 7 + (o.comCorretor ? 1 : 0) };
  }

  // ---------- tela ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let cssOk = false;
  function css() { if (cssOk || typeof document === 'undefined') return; cssOk = true; const s = document.createElement('style'); s.textContent =
    '.rcrm{min-width:0;max-width:100%}.rcrm-sec{margin:0 0 18px;min-width:0;max-width:100%}.rcrm-sec h3{margin:0 0 4px;font-size:15px}.rcrm-nota{margin:0 0 6px;font-size:12px;opacity:.75}.rcrm-tab{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.rcrm-tab table{border-collapse:collapse;width:100%;font-size:13px}.rcrm-tab th,.rcrm-tab td{padding:5px 8px;border-bottom:1px solid rgba(128,128,128,.25);text-align:left;vertical-align:top}' +
    '.rcrm-tab th{font-weight:600;font-size:12px;white-space:nowrap}.rcrm-tab td.n,.rcrm-tab th.n{text-align:right;white-space:nowrap}.rcrm-bar{display:inline-block;height:6px;border-radius:3px;background:currentColor;opacity:.35;vertical-align:middle;margin-left:6px}' +
    '.rcrm-vazio{padding:10px 0;opacity:.7}'; document.head.appendChild(s); }
  function html(S) {
    css(); if (!S.length) return '<p class="rcrm-vazio">Nenhum lead no período e no filtro escolhidos.</p>';
    return '<div class="rcrm">' + S.map((s) => `<div class="rcrm-sec" id="rcrm-${esc(s.id)}"><h3>${esc(s.titulo)}</h3>${s.nota ? `<p class="rcrm-nota">${esc(s.nota)}</p>` : ''}<div class="rcrm-tab"><table><thead><tr>${s.cab.map((c, i) => `<th${s.num.includes(i) ? ' class="n"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${
      s.linhas.map((l) => `<tr>${l.map((c, i) => `<td${s.num.includes(i) ? ' class="n"' : ''}>${/^R\$ /.test(c.t) ? `<span class="sens">${esc(c.t)}</span>` : esc(c.t)}${s.grupo === 'conversao' && i === 2 && typeof c.v === 'number' ? `<span class="rcrm-bar" style="width:${Math.round(c.v * 60)}px"></span>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`).join('') + '</div>';
  }

  // ---------- CSV (separador ; e BOM, para o Excel em português) ----------
  const csvCel = (c) => { const o = c && typeof c === 'object'; let v = o ? c.v : c; if (v == null) v = '';
    if (typeof v === 'number') return o && (/%$/.test(c.t) || !Number.isInteger(v)) ? csvCel(c.t) : String(v).replace('.', ',');   // fração: vai o texto (66,7% · 1,5)
    v = String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  function csv(S, cabecalho) {
    const out = []; if (cabecalho) out.push(csvCel(cabecalho), '');
    S.forEach((s, k) => { if (S.length > 1) out.push(csvCel(s.titulo)); out.push(s.cab.map(csvCel).join(';')); s.linhas.forEach((l) => out.push(l.map(csvCel).join(';'))); if (k < S.length - 1) out.push(''); });
    return new Blob(['﻿' + out.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
  }

  // ---------- Excel .xlsx (escrito aqui, sem biblioteca: zip sem compressão + SpreadsheetML) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(arquivos) {
    const enc = new TextEncoder(), partes = [], central = []; let pos = 0;
    const u16 = (v) => [v & 255, (v >>> 8) & 255], u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    arquivos.forEach(([nome, txt]) => { const n = enc.encode(nome), d = enc.encode(txt), c = crc32(d);
      const loc = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(d.length), ...u32(d.length), ...u16(n.length), ...u16(0)]);
      partes.push(loc, n, d); central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(d.length), ...u32(d.length), ...u16(n.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos)]), n);
      pos += loc.length + n.length + d.length; });
    const tamC = central.reduce((s, x) => s + x.length, 0);
    const fim = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(arquivos.length), ...u16(arquivos.length), ...u32(tamC), ...u32(pos), ...u16(0)]);
    return new Blob([...partes, ...central, fim], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const xe = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const colL = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const nomeAba = (t, usados) => { let n = String(t).replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Aba'; let k = 2; const b = n; while (usados.has(n)) n = (b.slice(0, 28) + ' ' + k++).slice(0, 31); usados.add(n); return n; };
  // abas = [{nome, secoes:[secao]}] · cada seção vira um bloco (título, cabeçalho, linhas) na aba
  function xlsx(abas, titulo) {
    const usados = new Set(), sheets = abas.map((a) => {
      const rows = []; let r = 0; const add = (cells) => { r++; rows.push(`<row r="${r}">${cells.join('')}</row>`); };
      const sT = (i, txt, st) => `<c r="${colL(i)}${r + 1}" t="inlineStr"${st ? ` s="${st}"` : ''}><is><t xml:space="preserve">${xe(txt)}</t></is></c>`;
      const sN = (i, v, st) => `<c r="${colL(i)}${r + 1}"${st ? ` s="${st}"` : ''}><v>${v}</v></c>`;
      let largura = []; const mede = (i, t) => { largura[i] = Math.min(60, Math.max(largura[i] || 8, String(t).length + 2)); };
      if (titulo && a === abas[0]) { add([sT(0, titulo, 1)]); add([]); }
      a.secoes.forEach((s, k) => {
        if (a.secoes.length > 1 || s.nota) { add([sT(0, s.titulo, 1)]); if (s.nota) add([sT(0, s.nota, 0)]); }
        add(s.cab.map((c, i) => { mede(i, c); return sT(i, c, 2); }));
        s.linhas.forEach((l) => add(l.map((c, i) => { const v = c && typeof c === 'object' ? c.v : c; if (typeof v === 'number' && isFinite(v)) { mede(i, c.t); const st = s.grupo === 'lista' && i === s.pctCol ? 3 : /%$/.test(c.t || '') ? 3 : /^R\$/.test(c.t || '') ? 4 : 0; return sN(i, v, st); }
          const t = v == null ? '' : String(v); mede(i, t); return t ? sT(i, t, 0) : ''; })));
        if (k < a.secoes.length - 1) add([]); });
      const cols = largura.length ? `<cols>${largura.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w || 8}" customWidth="1"/>`).join('')}</cols>` : '';
      return { nome: nomeAba(a.nome, usados), xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${rows.join('')}</sheetData></worksheet>` };
    });
    const ns = 'http://schemas.openxmlformats.org/', rel = ns + 'officeDocument/2006/relationships';
    return zip([
      ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${ns}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
      ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}spreadsheetml/2006/main" xmlns:r="${rel}"><sheets>${sheets.map((s, i) => `<sheet name="${xe(s.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="${rel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${rel}/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${ns}spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8ECF2"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`],
      ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, s.xml])]);
  }
  // abas padrão: uma por grupo (Conversão, Tempo, Motivos, Origem, Ranking, Lista)
  const ROT_GRUPO = { conversao: 'Conversão', tempo: 'Tempo por etapa', motivos: 'Motivos de perda', origem: 'Origem', ranking: 'Ranking', lista: 'Lista de leads' };
  const abasDe = (S) => { const A = []; S.forEach((s) => { let a = A.find((x) => x.g === s.grupo); if (!a) A.push(a = { g: s.grupo, nome: ROT_GRUPO[s.grupo] || s.grupo, secoes: [] }); a.secoes.push(s); }); return A; };

  // ---------- PDF (jsPDF + autoTable; o app e o HUB carregam de vendor/) ----------
  // as fontes padrão do jsPDF só têm o alfabeto latino: troca setas e travessões e tira emoji e o que não cabe
  const lat = (t) => String(t == null ? '' : t).replace(/[\u2013\u2014]/g, '-').replace(/\u2192/g, '->').replace(/\u2026/g, '...').replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\u0000-\u00ff]/g, '').replace(/\s{2,}/g, ' ').trim();
  function pdf(jspdf, S0, cab0) {
    const S = S0.map((s) => Object.assign({}, s, { titulo: lat(s.titulo), nota: s.nota ? lat(s.nota) : '', cab: s.cab.map(lat), linhas: s.linhas.map((l) => l.map((c) => (c && typeof c === 'object' ? { v: c.v, t: lat(c.t) } : lat(c)))) }));
    const cab = { titulo: lat(cab0.titulo), sub: lat(cab0.sub), rodape: lat(cab0.rodape) };
    const { jsPDF } = jspdf, larga = S.some((s) => s.cab.length > 8), doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: larga ? 'landscape' : 'portrait' });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('VIVERE IMÓVEIS SELECIONADOS', 14, 15);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.text(cab.titulo || 'Relatórios do CRM', W - 14, 15, { align: 'right' });
    doc.setFontSize(8.5); doc.setTextColor(90); doc.text(doc.splitTextToSize(cab.sub || '', W - 28), 14, 21); doc.setTextColor(20);
    let y = 28;
    S.forEach((s) => {
      if (y > H - 30) { doc.addPage(); y = 16; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(s.titulo, 14, y); y += 4;
      if (s.nota) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90); const t = doc.splitTextToSize(s.nota, W - 28); doc.text(t, 14, y + 2); y += t.length * 3.4 + 1; doc.setTextColor(20); }
      const colStyles = {}; s.num.forEach((i) => { colStyles[i] = { halign: 'right' }; });
      doc.autoTable({ startY: y + 1, head: [s.cab], body: s.linhas.map((l) => l.map((c) => (c && typeof c === 'object' ? c.t : c))), theme: 'grid', margin: { left: 14, right: 14 },
        styles: { fontSize: s.cab.length > 10 ? 6.5 : 8, cellPadding: 1.4, overflow: 'linebreak' }, headStyles: { fillColor: [31, 56, 100], textColor: 255, fontStyle: 'bold' }, columnStyles: colStyles });
      y = doc.lastAutoTable.finalY + 8; });
    const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(120); doc.text(`${cab.rodape || ''}  ·  página ${i} de ${n}`, W / 2, H - 7, { align: 'center' }); }
    return doc.output('blob');
  }

  // ---------- baixar ----------
  function baixar(blob, nome) {
    const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nome; a.rel = 'noopener'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 4000);
  }
  // nome de arquivo sem acento, só ponto e traço (padrão do Cleiton)
  const nomeArq = (partes, ext) => partes.filter(Boolean).join(' - ').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w .-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) + '.' + ext;

  window.RelatoriosCRM = { versao: VERSAO, PERIODOS, periodo, noPeriodo, trocas, estadias, alcance, calcular, secoes, secaoLista, html, csv, xlsx, abasDe, pdf, baixar, nomeArq, zip, crc32 };
})();
