
(function(){
  const LS='hubv.menuModo', LSM='hubv.menuMin';
  const IC={inicio:'casa',crm:'pessoas',locacao:'chave',financeiro:'cifrao',gestao:'grafico',construcoes:'obra'}; /* 13/11/2026: ícones de traço (icones-vivere) no lugar dos emojis */
  const icone=(g,t)=>window.VIVERE_ICONES&&VIVERE_ICONES.html?VIVERE_ICONES.html(IC[g]||'blocos'):t.slice(0,2);
  /* 18/11/2026 (pedido do Cleiton): símbolo de traço ao lado de toda área, aba e sub-aba, no topo e na lateral; nada de emoji */
  const ICA={pendencias:'alerta','crm-visao':'grafico','cadastro-imoveis':'casa',imoveis:'etiqueta',mapa:'mapa','link-mapa':'pino',empreendimentos:'predio','empreendimentos-construtoras':'obra',
    'inatividade-agenciamento':'sino',leads:'pessoas',oportunidades:'alvo','captacao-leads':'lupa',demandas:'balao',crm:'lista',portais:'nuvem',pessoas:'pessoas','pessoas-funcoes':'etiqueta',
    carteira:'chave','locacao-resumo':'prancheta','fichas-locacao':'arquivo',boletos:'documento',cobranca:'sino','regua-cobranca':'sino',vistorias:'camera',
    financeiro:'grafico',receita:'cifrao',vendas:'documento','fin-receber':'cifrao','fin-despesas':'baixo','fin-pagar':'cifrao','fin-juridico':'escudo',
    'institucional-cultura':'livro',institucional:'predio',juridico:'escudo',documentos:'pasta',tarefas:'prancheta',construcoes:'obra',orcamento:'cadeado',
    'whatsapp-ia':'balao','ia-hub':'brilho','inteligencia-crm':'alvo','brief-semanal':'livro',chamados:'ferramenta','metas-corretores':'alvo','relatorios-crm':'grafico',
    'funis-crm':'lista','site-leads':'enviar',solicitacoes:'enviar',captei:'lupa',concorrentes:'olho',parceiros:'pessoas','app-vivere':'celular','perfil-lead':'pessoas',
    'cadastro-corretores':'pessoas','pendencias-cadastro':'alerta','ficha-imovel':'imagem'};
  const icPor=t=>{ t=String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const R=[[/lead/,'pessoas'],[/imov|anunc/,'casa'],[/mapa/,'mapa'],[/empreend/,'predio'],[/constru/,'obra'],[/financ|receit|pag|cobr|boleto|venda/,'cifrao'],[/document|pasta/,'pasta'],[/tarefa|agenda/,'prancheta'],[/juridic/,'escudo'],[/relat|grafic|visao|metric/,'grafico'],[/whats|chat|convers|mensag/,'balao'],[/seguran|senha/,'cadeado'],[/vistori|foto/,'camera'],[/pesso|corretor|equipe/,'pessoas']];
    const r=R.find(x=>x[0].test(t)); return r?r[1]:'blocos'; };
  const icTab=b=>ICA[b.dataset.aba]||icPor(b.textContent);
  function decora(){ if(!window.VIVERE_ICONES) return;
    document.querySelectorAll('#abas button[data-grupo], #subabas button[data-aba], .sub-op button[data-aba]').forEach(b=>{
      if(b.closest('#ml')||(b.firstElementChild&&b.firstElementChild.classList.contains('ic'))) return;
      const i=document.createElement('i'); i.className='ic ic-'+(b.dataset.grupo?(IC[b.dataset.grupo]||'blocos'):icTab(b)); i.setAttribute('aria-hidden','true'); b.insertBefore(i,b.firstChild); }); }
  const ler=k=>{ try{ return localStorage.getItem(k); }catch(_){ return null; } };
  const grava=(k,v)=>{ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(_){} };
  const telaCheia=()=>innerWidth>=1440&&!!(screen&&screen.width)&&innerWidth>=screen.width*0.9;
  const modo=()=>{ if(innerWidth<900) return 'topo'; const m=ler(LS); return m==='lateral'||m==='topo'?m:(telaCheia()?'lateral':'topo'); };
  let aside=null, sig='';
  function botaoTroca(){ const t=document.querySelector('.topo')||document.querySelector('header'); if(!t||document.getElementById('ml-troca')) return;
    const b=document.createElement('button'); b.type='button'; b.id='ml-troca'; b.className='tema-btn ml-troca'; b.textContent='☰';
    const tema=document.getElementById('tema-btn'); if(tema&&tema.parentNode===t) t.insertBefore(b,tema); else t.appendChild(b); }
  function titBotao(){ const b=document.getElementById('ml-troca'); if(!b) return; const lat=document.body.classList.contains('ml-on');
    b.title=lat?'Menu no topo':'Menu lateral'; b.setAttribute('aria-label',b.title); b.hidden=innerWidth<900; }
  function monta(){
    decora();
    const on=modo()==='lateral'; const mudou=document.body.classList.contains('ml-on')!==on; document.body.classList.toggle('ml-on',on); if(mudou&&window.MenusCheios) requestAnimationFrame(()=>{ try{ MenusCheios.atualiza(); }catch(_){} }); document.body.classList.toggle('ml-min',on&&ler(LSM)==='1'); titBotao();
    if(!on) return;
    if(!aside){ aside=document.createElement('aside'); aside.id='ml'; aside.setAttribute('aria-label','Menu do HUB'); document.body.insertBefore(aside,document.body.firstChild); }
    const gs=[...document.querySelectorAll('#abas button[data-grupo]')], ss=document.getElementById('subabas');
    const subs=ss&&!ss.hidden?[...ss.querySelectorAll('button[data-aba]')]:[];
    const novo=gs.map(b=>b.dataset.grupo+(b.getAttribute('aria-selected')==='true'?'*':'')+b.innerHTML).join('|')+'#'+subs.map(b=>b.dataset.aba+b.getAttribute('aria-selected')+b.innerHTML).join('|')+(document.body.classList.contains('ml-min')?'m':'');
    if(novo===sig) return; sig=novo;
    const txt=b=>{ const c=b.cloneNode(true); c.querySelectorAll('.badge,.ic,.pt').forEach(x=>x.remove()); return c.textContent.trim(); };
    const bad=b=>[...b.querySelectorAll('.badge')].map(x=>x.outerHTML).join('');
    const min=document.body.classList.contains('ml-min');
    aside.innerHTML=`<div class="ml-topo"><span class="ml-tit">Menu</span><button type="button" class="ml-x" data-ml-min title="${min?'Abrir o menu':'Recolher o menu'}" aria-label="${min?'Abrir o menu':'Recolher o menu'}">${min?'»':'«'}</button></div>`+
      gs.map(b=>{ const g=b.dataset.grupo, sel=b.getAttribute('aria-selected')==='true';
        return `<button type="button" class="ml-g" data-ml-g="${g}" aria-current="${sel?'page':'false'}" title="${txt(b).replace(/"/g,'&quot;')}"><span class="ml-ic">${icone(g,txt(b))}</span><span class="ml-tx">${txt(b)}</span>${bad(b)}</button>`+
          (sel&&subs.length?`<div class="ml-subs">${subs.map(s=>`<button type="button" class="ml-s" data-ml-s="${s.dataset.aba}" aria-selected="${s.getAttribute('aria-selected')}"><span class="ml-ic">${window.VIVERE_ICONES?VIVERE_ICONES.html(icTab(s)):''}</span><span class="ml-tx">${txt(s)}</span>${bad(s)}</button>`).join('')}</div>`:''); }).join('');
    mede();
  }
  /* 14/11/2026 (pedido do Cleiton): a lateral tem a largura do maior título, sem sobra em branco; o conteúdo acompanha. */
  function mede(){ if(!aside||!document.body.classList.contains('ml-on')) return; document.body.style.setProperty('--ml-w',Math.ceil(aside.getBoundingClientRect().width)+'px'); }
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>mede());
  let pend=0; const agenda=()=>{ if(!pend) pend=requestAnimationFrame(()=>{ pend=0; try{ monta(); }catch(_){} }); };
  document.addEventListener('click',e=>{
    const t=e.target.closest&&e.target.closest('#ml-troca,[data-ml-g],[data-ml-s],[data-ml-min]'); if(!t) return;
    if(t.id==='ml-troca'){ const novo=document.body.classList.contains('ml-on')?'topo':'lateral', auto=telaCheia()?'lateral':'topo'; grava(LS,novo===auto?null:novo); sig=''; monta(); return; } /* escolha igual ao automático volta ao automático */
    if(t.hasAttribute('data-ml-min')){ grava(LSM,document.body.classList.contains('ml-min')?null:'1'); sig=''; monta(); return; }
    const alvo=t.dataset.mlG?document.querySelector('#abas button[data-grupo="'+t.dataset.mlG+'"]'):document.querySelector('#subabas button[data-aba="'+t.dataset.mlS+'"]');
    if(alvo){ alvo.click(); scrollTo({top:0}); } });
  function inicia(){ botaoTroca(); const o=new MutationObserver(agenda); ['abas','subabas'].forEach(id=>{ const el=document.getElementById(id); if(el) o.observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-selected','hidden']}); });
    addEventListener('resize',agenda); monta(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',inicia); else inicia();
  window.MenuLateral={atualiza:()=>{ sig=''; monta(); }};
})();
