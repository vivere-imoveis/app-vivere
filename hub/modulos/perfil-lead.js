// modulos/perfil-lead.js — 🧭 Perfil do cliente pela IA no Funil dos corretores (HUB VIVERE, só diretoria)
// Construção: tarefa vivere-ia-perfil-amplo-leads, F3 (17/11/2026). Contrato: _hub\modulos\LEIA-ME.md.
// • Lê: leads_perfil (base única no Supabase, nível diretoria). Um doc por lead (doc_id = id do lead); dados = {lead_id, perfil{…},
//   gerado_em, gerado_em_local, motivo, modelo, aviso, corretor (= painel do app), nome}. Quem grava: a função lead-perfil (F1).
// • Não grava nada. Só leitura: o botão Gerar/Atualizar fica no app do corretor (decisão do plano da F3).
// • Mesmo layout do bloco 🧭 do app (painel.js, blocoPerfilIA). Fontes só da Vivere e as redes que o próprio cliente informou,
//   com consentimento (decisão do Cleiton, LGPD). Sugestão da IA, não decisão.
// • Núcleo (tabCRM): selo "· 🧭 perfil" no resumo do histórico (temPerfil) e um lugar vazio [data-perfil-lead] dentro dele.
//   O módulo desenha o bloco só quando o histórico está aberto, para não pesar a lista.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, CL = 'leads_perfil';
  const MOM = { explorando: 'Explorando', comparando: 'Comparando', decidido: 'Decidido', parado: 'Parado', indefinido: 'Momento indefinido' };
  const URG = { alta: 'Urgência alta', media: 'Urgência média', baixa: 'Urgência baixa', indefinida: 'Urgência indefinida' };
  const CONF = { alta: 'confiança alta', media: 'confiança média', baixa: 'confiança baixa' };
  const FONTE = { lead: 'cadastro', historico: 'conversas', site: 'site', carteira: 'carteira', redes_informadas: 'redes informadas' };
  const docs = () => H.S[CL] || {};
  // casa pelo id do lead e, quando a linha traz o painel do app, também pelo painel (corretor do perfil)
  function doc(id, painel) {
    const d = docs()[id]; if (!d || !d.perfil || typeof d.perfil !== 'object') return null;
    if (painel && d.corretor && d.corretor !== painel) return null;
    return d;
  }
  const quando = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]} às ${m[4]}` : ''; };
  const arr = (a) => (Array.isArray(a) ? a : (typeof a === 'string' && a.trim() ? [a] : [])).map((x) => String(x == null ? '' : x)).filter((x) => x.trim());
  const lst = (t, a) => { const v = arr(a); return v.length ? `<div class="pl-sec"><b>${esc(t)}</b><ul>${v.slice(0, 8).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''; };

  function bloco(id, painel) {
    const d = doc(id, painel);
    const cab = '<div class="pl-cab">🧭 Perfil do cliente <span class="pl-ia">IA</span></div>';
    if (!d) return `<div class="pl-box">${cab}<p class="pl-mut">${H.carregado[CL] ? 'Ainda sem perfil. A Vivian monta sozinha quando o lead entra e a cada conversa nova (até 40 por dia; os antigos vão em lote). O corretor também pode pedir no app.' : 'Carregando os perfis…'}</p></div>`;
    const p = d.perfil, b = p.busca || {}, ab = p.abordagem || {};
    const pills = [MOM[p.momento], URG[p.urgencia]].filter(Boolean).map((x) => `<span class="pill">${esc(x)}</span>`).join(' ');
    const tx = (x) => String(x == null ? '' : x).trim();
    const partes = [tx(b.finalidade), arr(b.tipos).join(', '), arr(b.bairros).length ? 'em ' + arr(b.bairros).join(', ') : '', b.quartos ? b.quartos + ' quartos' : '']
      .filter(Boolean).map((x) => esc(x));
    if (tx(b.faixa)) partes.push(`<span class="sens">${esc(tx(b.faixa))}</span>`);
    if (tx(b.prazo)) partes.push(esc('prazo: ' + tx(b.prazo)));
    const ims = (Array.isArray(p.imoveis) ? p.imoveis : []).filter((x) => x && x.ref);
    const fontes = arr(p.fontes).map((f) => FONTE[f] || f);
    return `<div class="pl-box">${cab}
      <p>${pills ? pills + ' ' : ''}${esc(p.resumo || '')}</p>
      ${partes.length ? `<p><b>O que busca:</b> ${partes.join(' · ')}</p>` : ''}
      ${lst('Obrigatório para ele', b.obrigatorios)}${lst('Desejável', b.desejaveis)}
      ${ab.tom || arr(ab.ganchos).length || arr(ab.evitar).length || ab.canal_horario ? `<div class="pl-sec"><b>Como abordar</b>${ab.tom ? `<p>${esc(ab.tom)}</p>` : ''}${lst('Assuntos para criar conexão', ab.ganchos)}${lst('Evitar', ab.evitar)}${ab.canal_horario ? `<p class="pl-mut">Canal e horário: ${esc(ab.canal_horario)}</p>` : ''}</div>` : ''}
      ${lst('O que ele contou', p.quem_e)}${lst('Motivações', p.motivacoes)}${lst('Objeções', p.objecoes)}
      ${lst('Perguntas para completar o perfil', p.perguntas)}
      ${p.amplitude ? `<p><b>Além do imóvel que ele viu:</b> ${esc(p.amplitude)}</p>` : ''}
      ${ims.length ? `<div class="pl-sec"><b>Imóveis da carteira que combinam</b><ul>${ims.map((x) => `<li><b>${esc(x.ref)}</b> · ${esc(x.porque || '')}</li>`).join('')}</ul></div>` : ''}
      ${lst('Falta saber', p.lacunas)}
      <p class="pl-mut">Sugestão da IA${p.confianca ? ' (' + esc(CONF[p.confianca] || p.confianca) + ')' : ''}, só com o que o cliente informou nos canais da Vivere${fontes.length ? ': ' + esc(fontes.join(', ')) : ''}. Gerado em ${esc(quando(d.gerado_em_local || d.gerado_em) || '—')}. Confira antes de usar.</p></div>`;
  }

  // desenha nos lugares dos históricos abertos; a chave evita redesenhar o que não mudou
  function pinta(raiz) {
    (raiz || document).querySelectorAll('details[open] [data-perfil-lead]').forEach((el) => {
      const id = el.getAttribute('data-perfil-lead'), pn = el.getAttribute('data-perfil-painel') || '';
      const d = doc(id, pn), k = (d ? String(d.gerado_em || d.gerado_em_local || '1') : (H.carregado[CL] ? 'sem' : 'carregando'));
      if (el.dataset.plk === k) return; el.innerHTML = bloco(id, pn); el.dataset.plk = k;
    });
  }
  document.addEventListener('toggle', (e) => { const t = e.target; if (t && t.tagName === 'DETAILS' && t.open && t.querySelector('[data-perfil-lead]')) pinta(t); }, true);
  let rq = 0;
  const vigia = new MutationObserver(() => { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; pinta(); }); });
  vigia.observe(document.body, { childList: true, subtree: true });

  if (!document.getElementById('pl-css')) {
    const st = document.createElement('style'); st.id = 'pl-css';
    st.textContent = `.pl-box{margin:8px 0;padding:10px 12px;border:1px solid var(--line);border-left:3px solid var(--teal,var(--accent));border-radius:8px;background:var(--panel);font-size:13px;line-height:1.45;overflow-wrap:anywhere}
.pl-box p{margin:6px 0 0}.pl-box ul{margin:4px 0 0;padding-left:18px}.pl-box li{margin:2px 0}
.pl-cab{font-weight:600;font-size:14px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pl-ia{font-size:10px;letter-spacing:.12em;text-transform:uppercase;border:1px solid var(--line);border-radius:999px;padding:1px 6px;color:var(--muted)}
.pl-sec{margin-top:8px}.pl-mut{color:var(--muted);font-size:12px}`;
    document.head.appendChild(st);
  }

  H.registrar({
    id: 'perfil-lead',
    colecoes: [CL],
    temPerfil: (id, painel) => !!doc(id, painel),
    bloco: (id, painel) => bloco(id, painel)
  });
})();
