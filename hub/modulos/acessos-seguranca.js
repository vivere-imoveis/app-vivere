// modulos/acessos-seguranca.js — 🔐 Acessos e Segurança dentro do HUB VIVERE (23/11/2026, fatia 1 do HUB canal central).
// Pedido do Cleiton (23/11): o HUB é o canal central; dentro dele entram Acessos e Segurança e a Central da Vivian.
// Só o gestor vê a aba (decisão "só você", 23/11). Reaproveita a MESMA tela de Acessos do app (modulos/acessos.js é cópia
// byte a byte do acessos.js do app; estilo em modulos/app-nativo.css, também cópia do app).
//   • HUB no claude.ai: os pedidos vão pelo conector Vivere Conversas (painel_sessao / painel_api), o mesmo caminho do
//     PAINEL DO GESTOR; quando o Cleiton tem 2FA e a sessão com código venceu, o conector avisa precisa_codigo e esta aba
//     pede o código de 6 números (o código não fica guardado). "Zerar 2FA" não passa pela ponte: só no app e na web.
//   • HUB na web (app): usa o login do app (window.__hubWebSb, exposto pelo hub-web.js), que já entrou com o código.
// Toda ação da tela fica registrada (public.acessos_registro + aba Registros).
(function () {
  'use strict';
  const H = window.HUB; if (!H) return;
  const ID = 'acessos-seguranca', SERV = 'Vivere Conversas', VERSAO = '2026-11-23.1';
  const APP = 'https://vivere-imoveis.github.io/app-vivere/painel.html';
  const esc = H.esc || ((v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const WEB = () => !!window.__hubWebSb;
  const E = { eu: null, uid: '', erro: '', fatores: null, montado: false, raiz: null };

  // ---------- conector (claude.ai) ----------
  let pMcp = null;
  const mcp = () => (pMcp = pMcp || (window.claude && window.claude.use ? window.claude.use('mcp') : Promise.resolve(null)));
  async function tool(nome, ent) {
    const m = await mcp(); if (!m) throw new Error('conector Vivere Conversas indisponível');
    const r = await m.callTool(SERV, nome, ent || {}, { cache: false });
    let p = r && (r.payload !== undefined ? r.payload : r.structuredContent);
    if (p === undefined && r && Array.isArray(r.content) && r.content[0]) p = r.content[0].text;
    if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { throw new Error(p); } }
    return p || {};
  }
  async function api(metodo, caminho, corpo) {
    const ent = { metodo, caminho, cabecalhos: { 'content-type': 'application/json' } };
    if (corpo !== undefined) ent.corpo = JSON.stringify(corpo);
    let p = await tool('painel_api', ent);
    if (p && p.precisa_codigo) { await pedirCodigo(); p = await tool('painel_api', ent); }
    if (p && p.precisa_codigo) throw new Error('O código do autenticador não foi aceito.');
    if (p && p.erro && p.status === undefined) throw new Error(p.erro);
    let j = null; try { j = p.corpo ? JSON.parse(p.corpo) : null; } catch (e) { j = p.corpo; }
    return { status: Number(p.status) || 200, json: j };
  }
  // mesmo formato do supabase-js para a tela de Acessos (functions.invoke e rpc)
  const sbConector = {
    functions: { async invoke(nome, op) {
      const r = await api('POST', '/functions/v1/' + nome, (op && op.body) || {});
      if (r.status >= 300) { const j = r.json || {}; return { data: null, error: { message: j.erro || j.message || ('erro ' + r.status), context: { json: async () => j } } }; }
      return { data: r.json, error: null };
    } },
    async rpc(fn, args) {
      const r = await api('POST', '/rest/v1/rpc/' + fn, args || {});
      return r.status >= 300 ? { data: null, error: { message: (r.json && r.json.message) || ('erro ' + r.status) } } : { data: r.json, error: null };
    },
  };

  // ---------- janela do código (2FA) ----------
  let pCodigo = null;
  function pedirCodigo() {
    if (pCodigo) return pCodigo;
    pCodigo = new Promise((ok, falha) => {
      const fundo = document.createElement('div');
      fundo.className = 'hubac-fundo';
      fundo.innerHTML = `<div class="hubac-janela" role="dialog" aria-modal="true" aria-labelledby="hubac-tit">
        <h3 id="hubac-tit">🔐 Código do autenticador</h3>
        <p>Digite os 6 números que aparecem agora no autenticador do seu celular.</p>
        <input id="hubac-cod" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
        <p class="hubac-msg" id="hubac-msg"></p>
        <div class="hubac-botoes"><button type="button" class="btn" data-hubac="cancelar">Cancelar</button><button type="button" class="btn pri" data-hubac="enviar">Confirmar</button></div></div>`;
      document.body.appendChild(fundo);
      const campo = fundo.querySelector('#hubac-cod'), msg = fundo.querySelector('#hubac-msg');
      setTimeout(() => campo.focus(), 30);
      const fecha = () => { fundo.remove(); pCodigo = null; };
      async function envia() {
        const c = campo.value.replace(/\D/g, ''); campo.value = '';
        if (c.length !== 6) { msg.textContent = 'Digite os 6 números do código.'; return; }
        msg.textContent = 'Conferindo…';
        try {
          const p = await tool('painel_api', { metodo: 'POST', caminho: '/painel/2fa/codigo', corpo: JSON.stringify({ codigo: c }) });
          let j = p; try { if (p && typeof p.corpo === 'string') j = JSON.parse(p.corpo); } catch (e) { j = p; }
          if (j && j.ok) { fecha(); ok(); return; }
          msg.textContent = (j && j.erro) || 'Código não confere.';
        } catch (e) { msg.textContent = (e && e.message) || String(e); }
      }
      fundo.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('[data-hubac]');
        if (e.target === fundo || (b && b.dataset.hubac === 'cancelar')) { fecha(); falha(new Error('Código não informado.')); return; }
        if (b && b.dataset.hubac === 'enviar') envia();
      });
      campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') envia(); if (e.key === 'Escape') { fecha(); falha(new Error('Código não informado.')); } });
    });
    return pCodigo;
  }

  // ---------- quem sou (só o gestor vê a aba) ----------
  async function quemSou() {
    if (WEB()) {
      const sb = window.__hubWebSb, u = await sb.auth.getUser(); const uid = u && u.data && u.data.user && u.data.user.id;
      if (!uid) throw new Error('sem login');
      const r = await sb.from('acessos').select('nome,papel,email').eq('user_id', uid).limit(1);
      const f = await sb.auth.mfa.listFactors();
      E.fatores = ((f && f.data && f.data.all) || []).filter((x) => x.status === 'verified');
      return { uid, eu: (r.data || [])[0] || null };
    }
    const s = await tool('painel_sessao', {});
    if (!s || !s.user_id) { if (s && s.precisa_codigo) { await pedirCodigo(); return quemSou(); } throw new Error((s && (s.erro || s.message)) || 'sessão do dono indisponível'); }
    const r = await api('GET', '/rest/v1/acessos?select=nome,papel,email&user_id=eq.' + encodeURIComponent(s.user_id) + '&limit=1');
    try { const u = await api('GET', '/auth/v1/user'); E.fatores = (((u.json || {}).factors) || []).filter((x) => x.status === 'verified'); } catch (e) { E.fatores = null; }
    return { uid: s.user_id, eu: (Array.isArray(r.json) ? r.json : [])[0] || null };
  }

  // ---------- tela ----------
  function aviso(t) {
    const d = document.createElement('div'); d.className = 'hubac-aviso'; d.setAttribute('role', 'status'); d.textContent = t;
    document.body.appendChild(d); setTimeout(() => d.remove(), 3500);
  }
  function cartaoSeguranca() {
    const f = E.fatores;
    const st = f == null ? '<span class="pill">não conferi</span>' : f.length ? `<span class="pill ok">ligado · ${f.length} aparelho${f.length > 1 ? 's' : ''}</span>` : '<span class="pill bad">desligado</span>';
    const nomes = (f || []).map((x) => esc(x.friendly_name || 'autenticador')).join(', ');
    return `<section class="sec cartao hubac-seg"><h3>Sua conta</h3>
      <p>Verificação em duas etapas (2FA): ${st}${nomes ? ` <span class="s">${nomes}</span>` : ''}</p>
      <p class="s">Editar e excluir no ecossistema exigem o código do autenticador. ${WEB() ? '' : 'Aqui no claude.ai o código é pedido quando a sessão com código vence. '}Para cadastrar outro aparelho ou remover um, use a Segurança da conta no app.</p>
      <div class="linha-acoes"><a class="btn" href="${APP}" target="_blank" rel="noopener">Segurança da conta no app ↗</a></div></section>`;
  }
  function render() {
    if (E.erro) return `<p class="nota">Não consegui abrir Acessos e Segurança: ${esc(E.erro)}</p>`;
    return '<div class="hubac" id="hubac-ancora"></div>';
  }
  // o HUB redesenha a aba por innerHTML; a tela de Acessos fica num nó próprio, recolocado na âncora a cada desenho
  function encaixa() {
    const a = document.getElementById('hubac-ancora'); if (!a || !E.raiz || a.contains(E.raiz)) return;
    a.appendChild(E.raiz);
    if (!E.montado && window.ACESSOS) {
      E.montado = true;
      E.raiz.firstChild.innerHTML = cartaoSeguranca();
      window.ACESSOS.tela(E.raiz.lastChild, {
        sb: WEB() ? window.__hubWebSb : sbConector, eu: E.eu, esc,
        toast: aviso, titulo: null,
      });
    }
  }
  function carrega(src) {
    return new Promise((ok, falha) => {
      if (/\.css$/.test(src)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = src; l.onload = ok; l.onerror = () => falha(new Error(src + ' não carregou')); document.head.appendChild(l); return; }
      const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => falha(new Error(src + ' não carregou')); document.head.appendChild(s);
    });
  }
  const css = document.createElement('style');
  css.textContent = `#app-nativo .hubac-seg{margin:0 0 14px;padding:14px 16px}#app-nativo .hubac-seg h3{margin:0 0 4px}#app-nativo .hubac-seg p{margin:6px 0}
  .hubac-fundo{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px}
  .hubac-janela{background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:12px;max-width:360px;width:100%;padding:18px;font:15px/1.5 var(--body)}
  .hubac-janela h3{margin:0 0 6px}.hubac-janela input{width:100%;font-size:22px;letter-spacing:6px;text-align:center;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}
  .hubac-msg{min-height:1.4em;color:var(--bad);margin:6px 0}.hubac-botoes{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
  .hubac-botoes .btn{padding:7px 14px;border-radius:8px;border:1px solid var(--line);background:var(--panel);color:var(--ink);cursor:pointer}
  .hubac-botoes .btn.pri{background:var(--accent);color:var(--bg)}
  .hubac-aviso{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:9px 16px;border-radius:10px;z-index:2147483601;font:14px/1.4 var(--body);max-width:92vw}`;
  document.head.appendChild(css);

  (async () => {
    try {
      const q = await quemSou(); E.uid = q.uid; E.eu = q.eu;
      if (!E.eu || E.eu.papel !== 'gestor') return;            // só o gestor: a aba nem nasce
      if (!WEB()) window.__artefatoLoja = window.__artefatoLoja || true; // sem "Zerar 2FA" pela ponte do conector
      await carrega('modulos/app-nativo.css');
      await carrega('modulos/acessos.js');
      E.raiz = document.createElement('div'); E.raiz.id = 'app-nativo'; E.raiz.appendChild(document.createElement('div')); E.raiz.appendChild(document.createElement('div'));
    } catch (e) { if (!E.eu) return; E.erro = (e && e.message) || String(e); }
    new MutationObserver(encaixa).observe(document.body, { childList: true, subtree: true });
    H.registrar({ id: ID, aba: '🔐 Acessos e Segurança', grupo: 'gestao', depois: 'registros', colecoes: [], render, versao: VERSAO, busca() { return []; } });
  })();
})();
