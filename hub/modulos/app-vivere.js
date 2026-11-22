// modulos/app-vivere.js — aba "App Vivere" (Gestão) no HUB Vivere (construção "app-vivere", 09/11/2026)
// Contrato: _hub\modulos\LEIA-ME.md. Pedido do Cleiton (09/11/2026): "deixe os links de todos disponibilizados em uma aba no hub vivere".
// • Lê: app-vivere_paineis (do módulo; um doc por painel do app, chave = painel em public.acessos; doc `_situacao` = texto do andamento).
//   Quem grava: a sessão de construção do app (ou a rotina que vier a manter a lista), sempre a partir do banco do app (Supabase).
// • Não grava nada. Só nome, papel e contagens: sem e-mail, telefone ou CPF.
(function () {
  const H = window.HUB; if (!H) return;
  const esc = H.esc, dt = H.dt;
  const ID = 'app-vivere', CL = 'app-vivere_paineis';
  const BASE = 'https://vivere-imoveis.github.io/app-vivere/';
  const PAPEL = { gestor: ['Gestor', 0], diretor: ['Diretor', 1], corretor: ['Corretor', 2] };
  const linkVer = (ch) => BASE + 'painel.html?ver=' + encodeURIComponent(ch);
  const n = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR'));
  const hora = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]} às ${m[4]}` : dt(s); };
  const paineis = () => H.lista(CL).filter((p) => p._id.charAt(0) !== '_')
    .sort((a, b) => ((PAPEL[a.papel] || [0, 9])[1] - (PAPEL[b.papel] || [0, 9])[1]) || String(a.nome || a._id).localeCompare(String(b.nome || b._id), 'pt-BR'));
  const sit = (p) => (p.oficial ? '<span class="pill ok">Oficial no app</span>' : '<span class="pill warn">Em teste</span>');
  const acesso = (p) => {
    const t = +p.acessos || 0, l = +p.com_login || 0, c = +p.convidados || 0;
    const a = l ? `<span class="pill ok">Já entrou${t > 1 ? ' (' + l + ' de ' + t + ')' : ''}</span>` : c ? '<span class="pill info">Convite enviado</span>' : '<span class="pill">Sem convite</span>';
    return a + (t > 1 ? `<span class="s">${t} acessos neste painel</span>` : '');
  };

  function render() {
    const P = paineis();
    if (!P.length) return '<h2>App Vivere</h2>' + H.vazio(H.carregado[CL] ? 'A lista dos painéis do app ainda não foi gravada.' : 'Carregando…');
    const S = (H.S[CL] || {})._situacao || {};
    const acessos = P.reduce((s, p) => s + (+p.acessos || 0), 0), ofi = P.filter((p) => p.oficial).length;
    const login = P.reduce((s, p) => s + (+p.com_login || 0), 0), imv = P.reduce((s, p) => s + (+p.meus_imoveis || 0), 0), lds = P.reduce((s, p) => s + (+p.leads || 0), 0);
    const topo = `<div class="filtros"><a class="btn" href="${escUrl(BASE)}" target="_blank" rel="noopener" style="border-color:var(--accent);font-weight:600">Abrir o app</a><a class="btn" href="${escUrl(BASE + 'painel.html')}" target="_blank" rel="noopener">Meu painel</a><button class="btn" data-appv-copia="${esc(BASE)}">Copiar o link do app</button></div>`;
    const cards = `<div class="resumo-cob">
      <div class="card"><div class="s">Painéis no app</div><div class="num">${P.length}</div><div class="s">${acessos} ${acessos === 1 ? 'acesso cadastrado' : 'acessos cadastrados'}</div></div>
      <div class="card"><div class="s">Oficiais (corte feito)</div><div class="num" style="color:var(--${ofi ? 'ok' : 'muted'})">${ofi} de ${P.length}</div><div class="s">${ofi ? (ofi === P.length ? 'todos no app' : 'os demais seguem em teste') : 'todos seguem em teste'}</div></div>
      <div class="card"><div class="s">Já entraram no app</div><div class="num">${login}</div><div class="s">de ${acessos} acessos</div></div>
      <div class="card"><div class="s">Carga dos painéis</div><div class="num">${n(imv)}</div><div class="s">meus imóveis · ${n(lds)} leads (soma dos painéis)</div></div>
    </div>`;
    const linhas = P.map((p) => { const pp = PAPEL[p.papel] || [p.papel || '—']; const u = linkVer(p._id);
      return `<tr id="appv-${esc(p._id)}"><td><b>${esc(p.nome || p._id)}</b><span class="s">painel ${esc(p._id)}</span></td>
      <td>${esc(pp[0])}</td>
      <td class="n">${n(p.meus_imoveis)}</td><td class="n">${n(p.leads)}</td><td class="n">${n(p.ofertas)}</td>
      <td>${sit(p)}</td><td>${acesso(p)}</td>
      <td><div class="filtros" style="margin:0"><a class="btn" href="${escUrl(u)}" target="_blank" rel="noopener">Ver como</a><button class="btn" data-appv-copia="${esc(u)}">Copiar link</button></div></td></tr>`; }).join('');
    const tabela = `<div class="tabela"><table><thead><tr><th>Painel de</th><th>Papel</th><th class="n">Meus imóveis</th><th class="n">Leads</th><th class="n">Ofertas</th><th>Situação</th><th>Acesso</th><th>Abrir</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
    return `<h2>App Vivere</h2>
      <p class="nota">Aplicativo da Vivere fora do Claude (painéis dos corretores e da diretoria). Entre com o seu login em "Abrir o app"; depois, "Ver como" abre o painel de cada pessoa na visão do gestor. Os links abrem em outra aba e só funcionam para quem tem acesso de gestor.</p>
      ${topo}${cards}
      ${S.texto ? `<div class="card" style="margin-bottom:14px"><b>Andamento${S.fatia ? ' · fatia ' + esc(S.fatia) : ''}</b><div style="margin-top:6px">${esc(S.texto)}</div>${S.proximo ? `<div class="s" style="margin-top:6px">Próximo passo: ${esc(S.proximo)}</div>` : ''}<div class="s" style="margin-top:6px">${S.versao_app ? 'App: ' + esc(S.versao_app) + ' · ' : ''}lido do banco do app em ${hora(S.atualizado_em)}</div></div>` : ''}
      ${tabela}
      <p class="nota" style="margin-top:10px">Contagens lidas do banco do app na data acima; não se atualizam sozinhas. "Em teste" = o corte para o app ainda não foi feito; "Oficial no app" = corte feito.</p>`;
  }

  H.registrar({
    id: ID, aba: 'App Vivere', grupo: 'gestao', depois: 'tarefas', colecoes: [CL], render,
    busca(q) {
      const t = String(q || '').toLowerCase(); if (!t) return [];
      return paineis().filter((p) => [p.nome, p._id].join(' ').toLowerCase().includes(t)).slice(0, 8)
        .map((p) => ({ grp: 'App Vivere', tit: `${p.nome || p._id} · painel no app`, sub: p.oficial ? 'Oficial no app' : 'Em teste', ir: { aba: ID, linha: 'appv-' + p._id } }));
    },
  });

  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-appv-copia]'); if (c) H.copiaTexto(c.dataset.appvCopia, c);
  });
})();
