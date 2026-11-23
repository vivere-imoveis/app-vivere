// modulos/central-vivian.js — 💬 Central da Vivian dentro do HUB VIVERE (23/11/2026, fatia 2 do HUB canal central).
// Pedido do Cleiton (23/11): levar a Central da Vivian para dentro do HUB, ao lado do agente de WhatsApp, "num espaço mais
// bem organizado". A página da Central roda inteira, sem mudança de comportamento, dentro desta aba (modulos/central-vivian.html
// = cópia da 🔵💬CENTRAL DA VIVIAN com uma linha a mais no topo que usa a ligação do HUB com o conector Vivere Conversas).
// • claude.ai: conversas, regras, cadernos, IA, uso e pedidos pelo conector (mesmas ferramentas da Central, liberadas no HUB).
// • Web (app): o conector não chega ao navegador; a aba aparece só para o gestor, com o atalho para abrir no claude.ai.
// Só o gestor vê a aba (decisão "só você", 23/11). As ações ficam registradas como na Central (registros do Supabase).
(function () {
  'use strict';
  const H = window.HUB; if (!H) return;
  const ID = 'central-vivian', SERV = 'Vivere Conversas', VERSAO = '2026-11-23.5';
  const HUB_CLAUDE = 'https://claude.ai/artifact/LR3j38He26qquNQHKunkMx';
  const WEB = () => !!window.__hubWebSb;
  const E = { quadro: null, altura: 0 };

  function render() {
    if (WEB()) return `<div class="nota" style="padding:16px;line-height:1.5"><b>Central da Vivian</b><br>
      Conversas, regras, cadernos e pedidos dos corretores passam pelo conector do Claude, que só existe no HUB do claude.ai.<br>
      <a href="${HUB_CLAUDE}" target="_blank" rel="noopener">Abrir o HUB no claude.ai ↗</a> e ir em Equipe › Central da Vivian.</div>`;
    setTimeout(posiciona, 0);
    return '<div id="cv-ancora" style="min-height:70vh"></div>';
  }
  // O HUB redesenha a aba por innerHTML, e um iframe tirado da página recarrega. Por isso o quadro da Central fica fora do
  // conteúdo do HUB (no fim do body), posicionado por cima da âncora da aba; some quando a aba não está aberta.
  function quadro() {
    if (E.quadro) return E.quadro;
    const q = document.createElement('iframe');
    q.title = 'Central da Vivian';
    q.src = 'modulos/central-vivian.html?v=' + VERSAO;
    q.style.cssText = 'position:absolute;display:none;border:0;background:transparent;z-index:1';
    q.setAttribute('allow', 'clipboard-write; microphone');
    document.body.appendChild(q);
    return (E.quadro = q);
  }
  function posiciona() {
    const a = document.getElementById('cv-ancora');
    if (!a) { if (E.quadro) E.quadro.style.display = 'none'; return; }
    const q = quadro(), r = a.getBoundingClientRect();
    if (!r.width) { q.style.display = 'none'; return; }
    try {   // altura = a da página da Central (mesma origem), sem rolagem dupla; o tema do HUB vale lá dentro
      const d = q.contentDocument;
      if (d && d.documentElement) {
        const h = Math.max(d.documentElement.scrollHeight, d.body ? d.body.scrollHeight : 0, Math.round(innerHeight * 0.85));
        if (Math.abs(h - E.altura) > 4) { E.altura = h; }
        const t = document.documentElement.dataset.theme;
        if (t && d.documentElement.getAttribute('data-theme') !== t) d.documentElement.setAttribute('data-theme', t);
      }
    } catch (e) { /* outra origem: altura mínima */ }
    const h = E.altura || Math.round(innerHeight * 0.85);
    if (a.style.height !== h + 'px') a.style.height = h + 'px';
    const top = r.top + scrollY, left = r.left + scrollX;
    Object.assign(q.style, { display: 'block', top: top + 'px', left: left + 'px', width: r.width + 'px', height: h + 'px' });
  }
  async function gestor() {
    if (WEB()) {
      const sb = window.__hubWebSb, u = await sb.auth.getUser(), uid = u && u.data && u.data.user && u.data.user.id;
      if (!uid) return false;
      const r = await sb.from('acessos').select('papel').eq('user_id', uid).limit(1);
      return !!(r.data && r.data[0] && r.data[0].papel === 'gestor');
    }
    if (!window.claude || !window.claude.use) return false;
    const m = await window.claude.use('mcp'); if (!m) return false;
    const r = await m.callTool(SERV, 'ping', {}, { cache: false });   // a ferramenta da Central só responde ao dono do conector
    return !!r;
  }
  gestor().then((ok) => {
    if (!ok) return;
    if (!WEB()) { setInterval(posiciona, 250); addEventListener('resize', posiciona); addEventListener('scroll', posiciona, { passive: true }); }
    H.registrar({ id: ID, aba: '💬 Central da Vivian', grupo: 'equipe', depois: 'whatsapp-ia', colecoes: [], render, versao: VERSAO, busca() { return []; } });
  }).catch(() => { /* sem acesso: a aba não nasce */ });
})();
