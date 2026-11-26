/* base-supabase.js — HUB VIVERE, base única (fatia 1d-3a, 11/11/2026; virada 1d-5 fatia 4, 11/11/2026).
   Envolve o banco do artefato (DB) com duas funções, sem mudar o resto do HUB:
   1) Gravação dupla, PRIMEIRO no Supabase (virada): todo set/update/delete feito pelo HUB (núcleo e módulos, via DB ou
      HUB.db()) vai antes ao Supabase pelo conector Vivere Conversas (hub_gravar, em lotes, na ordem; delete = remover, que
      só marca a data) e só depois ao banco do artefato. O que o Supabase não confirmar (falha, prazo, sem conector) segue
      pelo caminho antigo: grava no artefato e copia ao Supabase o documento como ficou; update com objeto dentro também
      recebe essa cópia, para o Supabase ficar igual ao artefato. add() segue no caminho antigo (o id nasce no artefato).
   2) Chave de fonte por aparelho (hub-fonte-base-2): "supabase" (padrão desde a virada) ou "artefato" (reserva). No modo
      Supabase, collection(c).onSnapshot lê pelo hub_ler, 500 por página, 12 coleções em paralelo (6 até 16/11), na ordem Início →
      Imóveis → Leads → resto; leitura que falha cai para o artefato naquela coleção.
   Selo no topo (ao lado do 👁): fonte atual e gravações pendentes; clique abre o painel da base. */
(function(){
  'use strict';
  var SERV='Vivere Conversas', CHAVE='hub-fonte-base-2', PRAZO=12000; // chave nova na virada: a escolha "artefato" da fase de teste não vale mais
  var PRIORIDADE=[
    // Início e afins
    'construcoes','controle','pendencias','tarefas','corretores','crm_etapas','documentos','drive_mapa','drive_pastas',
    // Imóveis
    'imoveis','empreendimentos_fichas','empreendimentos_construtoras','empreendimentos_config','mapa_detalhes','mapa_pontos','mapa_manual',
    'ficha-imovel_config','link-mapa_enderecos','portais_anuncios','inatividade-agenciamento_config',
    // Leads
    'leads','leads_contatos','crm_leads','crm','oportunidades','captacao-leads_leads','portais_leads','captei_consultas','demandas'
  ];
  var lerFonte=function(){ try{ return localStorage.getItem(CHAVE)==='artefato'?'artefato':'supabase'; }catch(e){ return 'supabase'; } };
  var E={ fonte:lerFonte(), mcp:null, mcpPronto:false, semConector:false, mapa:null,
          espelhadas:0, diretas:0, falhas:0, puladas:0, ultimaFalha:'', fila:new Map(), timer:null, enviando:false,
          lidas:{}, leituraErros:{}, caiuArtefato:{}, sig:{}, semMudanca:{}, semCopia:0, leadsPaineis:0, leadsErro:'', leadsEm:null };

  /* ---------- conector ---------- */
  var pMcp=(window.claude&&window.claude.use?window.claude.use('mcp'):Promise.resolve(null)).then(function(m){
    E.mcp=m; E.mcpPronto=true; if(!m){ E.semConector=true; desenhaSelo(); return null; }
    return comPrazo(m.callTool(SERV,'hub_colecoes',{},{cache:false}),PRAZO).then(function(r){
      var p=r&&r.payload; if(typeof p==='string'){ try{p=JSON.parse(p);}catch(e){} }
      var mapa={}, sig={}; ((p&&p.colecoes)||[]).forEach(function(c){ mapa[c.colecao]=c.nivel; if(c.sig) sig[c.colecao]=String(c.sig); }); E.mapa=mapa; E.sig=sig; E.sigEm=Date.now(); desenhaSelo(); agenda(); return m;
    }).catch(function(e){ E.semConector=true; E.ultimaFalha=(e&&e.code)||'erro'; desenhaSelo(); return null; });
  }).catch(function(){ E.mcpPronto=true; E.semConector=true; desenhaSelo(); return null; });

  var TAM=function(t){ try{ return new TextEncoder().encode(t).length; }catch(e){ return t.length*3; } }; // bytes, não caracteres
  function payload(r){ var p=r&&r.payload; if(typeof p==='string'){ try{ p=JSON.parse(p); }catch(e){} } return p; }
  function partes(path){ var s=String(path||'').split('/'); return s.length===2&&s[0]&&s[1]&&s[0]!=='data'?{col:s[0],id:s[1]}:null; }
  function espelhavel(col){ return !!(E.mapa&&E.mapa[col]&&E.mapa[col]!=='fora'); }

  /* ---------- gravação dupla: fila com o estado final do documento ---------- */
  function marca(realDoc){
    var pt=partes(realDoc&&realDoc.path); if(!pt){ return; }
    E.fila.set(realDoc.path,{ref:realDoc, pt:pt}); desenhaSelo(); agenda();
  }
  function agenda(){ if(E.timer) clearTimeout(E.timer); E.timer=setTimeout(envia,800); }
  async function envia(){
    E.timer=null; if(E.enviando||!E.fila.size) return;
    if(!E.mcpPronto||(!E.mapa&&!E.semConector)){ agenda(); return; }
    if(E.semConector||!E.mcp){ if(E.fonte==='supabase') E.fila.forEach(function(it){ caiParaArtefato(it.pt.col); }); E.semCopia+=E.fila.size; E.fila.clear(); desenhaSelo(); return; }
    E.enviando=true;
    var itens=Array.from(E.fila.values()); E.fila.clear(); var ops=[], afetadas={}, bytes=0;
    for(var i=0;i<itens.length;i++){
      var it=itens[i];
      if(!espelhavel(it.pt.col)){ E.puladas++; continue; }
      try{
        var snap=await it.ref.get();
        var op=snap.exists?{acao:'set',colecao:it.pt.col,doc_id:it.pt.id,dados:snap.data()}:{acao:'remover',colecao:it.pt.col,doc_id:it.pt.id};
        var tam=TAM(JSON.stringify(op));
        if(!ops.length&&tam>900000){ E.falhas++; E.ultimaFalha='documento grande demais'; continue; }
        if(ops.length>=500||bytes+tam>900000){ E.fila.set(it.ref.path,it); continue; } // o resto vai na próxima rodada
        ops.push(op); bytes+=tam; afetadas[it.pt.col]=1;
      }catch(e){ E.falhas++; E.ultimaFalha='leitura do artefato'; }
    }
    if(ops.length){
      try{
        var r=await comPrazo(E.mcp.callTool(SERV,'hub_gravar',{operacoes:ops},{cache:false}),PRAZO);
        var p=payload(r)||{};
        (p.resultados||[]).forEach(function(x){ if(OKS[x.resultado]) E.espelhadas++; else { E.falhas++; E.ultimaFalha=x.resultado||'?'; } });
        if(E.fonte==='supabase') Object.keys(afetadas).forEach(function(c){ setTimeout(function(){ releia(c); },300); });
      }catch(e){
        // server_unavailable/upstream_error são ambíguos: não repetir sozinho; o espelho diário cobre
        E.falhas+=ops.length; E.ultimaFalha=(e&&e.code)||'erro';
        if(E.fonte==='supabase') Object.keys(afetadas).forEach(caiParaArtefato); // a tela volta a mostrar a gravação, pelo artefato
        if(e&&(e.code==='server_not_connected'||e.code==='not_in_manifest'||e.code==='needs_reauth')) E.semConector=true;
        if(e&&e.code==='prazo'){ abreDisjuntor(); itens.forEach(function(it){ recopia(it.ref); }); }
      }
    }
    E.enviando=false; desenhaSelo(); if(E.fila.size) agenda();
  }

  /* ---------- gravação direta no Supabase (virada 1d-5, fatia 4): primeiro o Supabase, depois o artefato ---------- */
  var DIR={fila:[], enviando:false, timer:null}, DISJ=0, RECOP={}, ORDEM={};
  // disjuntor: depois de um prazo estourado, 60 s sem gravação direta (cada gravação não espera 12 s em série)
  function abreDisjuntor(){ DISJ=Date.now()+60000; }
  // resposta que não chegou no prazo pode chegar depois e regravar o Supabase com um estado velho: 90 s depois,
  // copia de novo o documento como está no artefato (até 2 vezes por documento)
  function recopia(ref){ var k=ref&&ref.path; if(!k) return; RECOP[k]=(RECOP[k]||0)+1; if(RECOP[k]>2) return;
    setTimeout(function(){ marca(ref); },90000); }
  // ordem por documento: a gravação seguinte do mesmo documento só começa quando a anterior terminou (Supabase e artefato)
  function emOrdem(path, f){ var ant=ORDEM[path]||Promise.resolve(); var p=ant.then(f,f); var fim=p.catch(function(){});
    ORDEM[path]=fim; fim.then(function(){ if(ORDEM[path]===fim) delete ORDEM[path]; }); return p; }
  function comPrazo(p,ms){ var t; return Promise.race([p,new Promise(function(_,rej){ t=setTimeout(function(){ rej({code:'prazo'}); },ms); })]).then(function(v){ clearTimeout(t); return v; },function(e){ clearTimeout(t); throw e; }); }
  function temObjeto(d){ return !!d&&Object.keys(d).some(function(k){ var v=d[k]; return k.indexOf('.')>=0||(v!==null&&typeof v==='object'&&!Array.isArray(v)); }); }
  var OKS={criado:1,gravado:1,removido:1,nao_existe:1,nao_encontrado:1}; // remover de doc que não existe no Supabase = nada a fazer
  function direto(real, acao, d){
    // devolve true quando o Supabase confirmou a gravação; false = seguir pelo caminho antigo (artefato + cópia)
    var pt=partes(real&&real.path);
    if(!pt||E.semConector||Date.now()<DISJ||(E.mapa&&E.mapa[pt.col]==='fora')) return Promise.resolve(false); // não espera o conector
    return comPrazo(pMcp,PRAZO).then(function(m){
      if(!m||!E.mcp||E.semConector||(E.mapa&&E.mapa[pt.col]==='fora')) return false;
      var op={acao:acao, colecao:pt.col, doc_id:pt.id};
      if(acao!=='remover'){ var dd; try{ dd=JSON.parse(JSON.stringify(d)); }catch(e){ return false; }
        if(!dd||typeof dd!=='object'||Array.isArray(dd)) return false; op.dados=dd; }
      var tam=TAM(JSON.stringify(op)); if(tam>900000) return false;
      return new Promise(function(res){ DIR.fila.push({op:op, tam:tam, res:res}); desenhaSelo();
        if(!DIR.enviando&&!DIR.timer) DIR.timer=setTimeout(enviaDireto,30); });
    }).catch(function(){ return false; });
  }
  async function enviaDireto(){
    DIR.timer=null; if(DIR.enviando||!DIR.fila.length) return; DIR.enviando=true;
    if(Date.now()<DISJ){ var tudo=DIR.fila.splice(0); tudo.forEach(function(x){ x.res(false); }); DIR.enviando=false; desenhaSelo(); return; } // disjuntor aberto: a fila segue pelo caminho antigo
    var lote=[], bytes=0;
    while(DIR.fila.length&&lote.length<500&&!(lote.length&&bytes+DIR.fila[0].tam>900000)){ bytes+=DIR.fila[0].tam; lote.push(DIR.fila.shift()); }
    var afetadas={};
    try{
      var p=payload(await comPrazo(E.mcp.callTool(SERV,'hub_gravar',{operacoes:lote.map(function(x){ return x.op; })},{cache:false}),PRAZO))||{};
      var rs=p.resultados||[];
      lote.forEach(function(x,i){
        var r=rs[i]; if(r&&r.doc_id&&(r.doc_id!==x.op.doc_id||(r.colecao&&r.colecao!==x.op.colecao))) r=rs.find(function(y){ return y&&y.doc_id===x.op.doc_id&&(!y.colecao||y.colecao===x.op.colecao); });
        var ok=!!(r&&OKS[r.resultado]);
        if(ok){ E.diretas++; afetadas[x.op.colecao]=1; delete RECOP[x.op.colecao+'/'+x.op.doc_id]; if(E.mapa&&!E.mapa[x.op.colecao]) E.mapa[x.op.colecao]='mestre'; }
        else { E.falhas++; E.ultimaFalha=(r&&r.resultado)||'sem resposta'; if(E.fonte==='supabase') caiParaArtefato(x.op.colecao); }
        x.res(ok);
      });
    }catch(e){
      // prazo, server_unavailable e afins são ambíguos: o caminho antigo grava no artefato e copia o estado final (iguala os dois)
      E.falhas+=lote.length; E.ultimaFalha=(e&&e.code)||'erro';
      if(E.fonte==='supabase') lote.forEach(function(x){ caiParaArtefato(x.op.colecao); }); // a tela volta ao artefato, que terá a gravação
      if(e&&(e.code==='server_not_connected'||e.code==='not_in_manifest'||e.code==='needs_reauth')) E.semConector=true;
      if(e&&e.code==='prazo'){ abreDisjuntor(); lote.forEach(function(x){ x.prazo=true; }); }
      lote.forEach(function(x){ x.res(x.prazo?'prazo':false); });
    }
    if(E.fonte==='supabase') Object.keys(afetadas).forEach(function(c){ setTimeout(function(){ releia(c); },300); });
    DIR.enviando=false; desenhaSelo(); if(DIR.fila.length) enviaDireto();
  }

  /* ---------- leitura pelo Supabase (padrão desde a virada) ---------- */
  var OUVINTES={}, filaLeitura=[], ativos=0, PARALELO=12; // 17/11/2026 (vis-hub-app-carregamento-rapido, escolha do Cleiton): 6 → 12 leituras ao mesmo tempo
  function prio(c){ var i=PRIORIDADE.indexOf(c); return i<0?PRIORIDADE.length:i; }
  function snapFalso(itens){
    var docs=itens.map(function(x){ var d=x.dados; return {id:x.doc_id, exists:true, data:function(){ return d; }, metadata:{fromCache:false,hasPendingWrites:false}}; });
    return {docs:docs, size:docs.length, empty:!docs.length, metadata:{fromCache:false,hasPendingWrites:false},
            docChanges:function(){ return docs.map(function(d,i){ return {type:'added',doc:d,oldIndex:-1,newIndex:i}; }); }};
  }
  async function lerTudo(c){
    var itens=[], apos=null, voltas=0;
    do{
      var inp={colecao:c, limite:500}; if(apos) inp.apos=apos;
      var p=payload(await E.mcp.callTool(SERV,'hub_ler',inp,{cache:false}))||{};
      itens=itens.concat(p.itens||[]); var prox=p.proximo||null;
      if(prox&&prox===apos) break; apos=prox; voltas++;
    } while(apos&&voltas<60);
    return itens;
  }
  function proximaLeitura(){
    while(ativos<PARALELO&&filaLeitura.length){
      filaLeitura.sort(function(a,b){ return prio(a)-prio(b); });
      var c=filaLeitura.shift(); ativos++;
      (function(c){
        lerTudo(c).then(function(itens){
          E.lidas[c]=itens.length; delete E.doCache[c]; delete E.semMudanca[c]; cacheGravar(c,itens,E.sig[c]); var s=snapFalso(itens);
          (OUVINTES[c]||[]).forEach(function(o){ if(!o.parado){ try{ o.ok(s); }catch(e){} } });
        }).catch(function(e){
          E.leituraErros[c]=(e&&e.code)||'erro'; caiParaArtefato(c);
        }).then(function(){ ativos--; desenhaSelo(); proximaLeitura(); });
      })(c);
    }
  }
  var kick=null; function chuta(){ if(!kick) kick=setTimeout(function(){ kick=null; proximaLeitura(); },60); } // junta os pedidos do início para valer a ordem de prioridade
  function releia(c){ if(E.sig) delete E.sig[c]; /* gravação do HUB em c: a assinatura da abertura deixa de valer */ if(E.caiuArtefato[c]||!OUVINTES[c]||filaLeitura.indexOf(c)>=0) return; filaLeitura.push(c); proximaLeitura(); }
  function caiParaArtefato(c){
    E.caiuArtefato[c]=1;
    (OUVINTES[c]||[]).forEach(function(o){ if(o.parado||o.real) return; try{ o.real=o.db.collection(c).onSnapshot(o.ok,o.err); }catch(e){} });
  }
  /* ---------- abrir com a última visita (17/11/2026, vis-hub-app-carregamento-rapido, escolha do Cleiton) ----------
     Cada coleção lida do Supabase fica guardada no próprio aparelho (IndexedDB do HUB). Ao abrir, a tela desenha na hora com essa
     cópia (até 3 dias) e troca pela leitura nova assim que ela chega. Falha do navegador = segue como antes, só pela rede. */
  var CACHE_P=null, CACHE_MAX=3*86400e3;
  function cacheDb(){
    if(CACHE_P) return CACHE_P;
    CACHE_P=new Promise(function(res){ try{ var rq=indexedDB.open('hub-vivere-cache',1);
      rq.onupgradeneeded=function(){ try{ rq.result.createObjectStore('col'); }catch(e){} };
      rq.onsuccess=function(){ res(rq.result); }; rq.onerror=function(){ res(null); }; rq.onblocked=function(){ res(null); };
    }catch(e){ res(null); } });
    return CACHE_P;
  }
  function cacheLer(c){ return cacheDb().then(function(d){ if(!d) return null; return new Promise(function(res){ try{
    var g=d.transaction('col','readonly').objectStore('col').get(c); g.onsuccess=function(){ res(g.result||null); }; g.onerror=function(){ res(null); };
  }catch(e){ res(null); } }); }).catch(function(){ return null; }); }
  function cacheGravar(c,itens,sig){ cacheDb().then(function(d){ if(!d) return; try{ d.transaction('col','readwrite').objectStore('col').put({em:Date.now(),itens:itens,sig:sig||null},c); }catch(e){} }).catch(function(){}); }
  E.doCache={};

  function ouveSupabase(db,c,ok,err){
    var o={ok:ok,err:err,db:db,parado:false,real:null};
    (OUVINTES[c]=OUVINTES[c]||[]).push(o);
    if(!(c in E.lidas)) cacheLer(c).then(function(x){
      if(!x||!Array.isArray(x.itens)||Date.now()-(x.em||0)>CACHE_MAX) return;
      if(o.parado||o.real||(c in E.lidas)) return; // a leitura nova (ou o artefato) já chegou: a cópia não volta por cima
      E.doCache[c]=1; o.viuCache=1; try{ ok(snapFalso(x.itens)); }catch(e){} desenhaSelo();
    });
    pMcp.then(function(m){
      if(o.parado) return;
      if(!m||!espelhavel(c)){ o.real=db.collection(c).onSnapshot(ok,err); return; } // fora do mapa ou sem conector: artefato
      if(E.caiuArtefato[c]){ o.real=db.collection(c).onSnapshot(ok,err); return; }
      // 25/11/2026 (vis-revisita-carregamento-hub-painel F1): assinatura igual à da cópia do aparelho = a coleção não mudou;
      // usa a cópia e não baixa de novo. Sem assinatura (HUB web, conector antigo) ou diferente = lê como antes.
      // Vale só nos primeiros 30 s depois do mapa (abertura); inscrição depois disso relê como antes (pega mudança de terceiros).
      var sg=E.sig&&E.sig[c]; if(!sg||Date.now()-(E.sigEm||0)>30000){ enfileira(); return; }
      cacheLer(c).then(function(x){
        if(o.parado||o.real) return;
        if(!x||x.sig!==sg||!Array.isArray(x.itens)){ enfileira(); return; }
        if(!(c in E.lidas)){ E.lidas[c]=x.itens.length; E.semMudanca[c]=1; }
        delete E.doCache[c]; if(!o.viuCache){ try{ ok(snapFalso(x.itens)); }catch(e){} } desenhaSelo();
      });
    });
    function enfileira(){ if(filaLeitura.indexOf(c)<0) filaLeitura.push(c); chuta(); }
    return function(){ o.parado=true; if(typeof o.real==='function') o.real(); };
  }

  /* ---------- Gestão de leads: leads dos painéis do app (11/11/2026) ----------
     crm_leads deixou de ser alimentada quando os painéis foram para o app. Um gatilho no Supabase copia os leads de
     public.painel_docs para a coleção paineis_leads (sem telefone, histórico mascarado). Aqui, quem assina crm_leads
     recebe primeiro o artefato (a tela não fica vazia) e, assim que os painéis chegam, só os painéis; relê a cada 5 min. */
  var RECARGAS=[], LEADS=null, CRM_OUV=[], CRM_ART=null;
  // 16/11/2026 (ampliação do CRM, fatia 1): etapas finais e de ganho dos quatro funis (funis-crm.js)
  var ABERTA=function(e){ e=e||'Novo'; return e!=='Fechado'&&e!=='Perdido'&&e!=='No ar'&&e!=='Concluída'; };
  var GANHO={'Fechado':1,'Captado':1,'Cadastro completo':1,'No ar':1,'Contrato assinado':1,'Entrada':1,'Concluída':1};
  // painel do app (ex.: magda-haben) → chave do corretor no CRM do HUB (ex.: magda)
  var semAc=function(t){ return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); };
  // painel do app → corretor(es) do CRM. Exato pelo slug; senão pelas palavras (4+ letras) do painel contra slug e nome do
  // corretor. Um painel pode valer para dois corretores (CRM compartilhado, ex.: fe-crissie-thaymison).
  function mapaSlugs(cors, paineis){
    var M={};
    paineis.forEach(function(p){
      var ex=cors.find(function(x){ return x.slug===p; }); if(ex){ M[p]=[ex.slug]; return; }
      var tk=p.split('-').filter(function(t){ return t.length>=4; });
      var achou=cors.filter(function(x){ var ws=(x.slug+' '+semAc(x.nome)).split(/[\s-]+/); return tk.some(function(t){ return ws.indexOf(t)>=0; }); });
      if(achou.length>1){ var pri=achou.filter(function(x){ return x.slug.split('-')[0]===tk[0]||semAc(x.nome).split(' ')[0]===tk[0]; }); if(pri.length) achou=pri.concat(achou.filter(function(x){ return pri.indexOf(x)<0&&tk.slice(1).some(function(t){ return (x.slug+' '+semAc(x.nome)).indexOf(t)>=0; }); })); }
      M[p]=achou.length?achou.map(function(x){ return x.slug; }):[p]; });
    return M;
  }
  function resumoDe(L, base, antigo){
    var hoje=new Date().toISOString().slice(0,10), agora=Date.now(), H1=((base&&base.primeiro_contato_h)||24)*3600e3, PD=(antigo&&antigo.parado_dias)||15;
    var por={}, camp={}, cobrar={}, al={primeiro:0,vencida:0,parado:0,sem_prox:0};
    function soma(T,k,x){ var m=T[k]=T[k]||{total:0,etapas:{},fechados:0,perdidos:0,conversao:0,valor_fechado:0}; var e=x.etapa||'Novo';
      m.total++; m.etapas[e]=(m.etapas[e]||0)+1; if(GANHO[e]){ m.fechados++; m.valor_fechado+=Number(x.valor)||0; } if(e==='Perdido') m.perdidos++; m.conversao=m.total?m.fechados/m.total:0; }
    L.forEach(function(x){ soma(por,x.corretor||'?',x); soma(camp,x.campanha||'(sem campanha)',x);
      if(!ABERTA(x.etapa)) return; var mo=[], ent=Date.parse(x.entrada||'')||0, ult=Date.parse(x.ultimo||x.entrada||'')||0;
      if(((x.etapa||'Novo')==='Novo'||x.etapa==='A captar')&&!(x.n_hist>0)&&ent&&agora-ent>H1){ mo.push('primeiro'); al.primeiro++; }
      if(x.data_prox&&String(x.data_prox).slice(0,10)<hoje){ mo.push('vencida'); al.vencida++; }
      if(ult&&agora-ult>PD*864e5){ mo.push('parado'); al.parado++; }
      if(!x.data_prox){ mo.push('sem_prox'); al.sem_prox++; }
      if(mo.length&&!(mo.length===1&&mo[0]==='sem_prox')) (cobrar[x.corretor]=cobrar[x.corretor]||[]).push({id:x._id,nome:x.nome,motivos:mo,data_prox:x.data_prox||null,entrada:x.entrada||null,etapa:x.etapa||'Novo',ultimo:x.ultimo||null}); });
    return Object.assign({},antigo||{},{total:L.length,por_corretor:por,por_campanha:camp,alertas:al,cobrar:cobrar,parado_dias:PD,fonte:'paineis'});
  }
  function emiteCrm(){
    if(!CRM_ART) return; var docs=CRM_ART.docs.map(function(d){ return {id:d.id,dados:d.exists?d.data():null}; });
    if(LEADS){ docs=docs.map(function(d){ if(d.id==='base'&&d.dados) return {id:d.id,dados:LEADS.base}; if(d.id==='resumo'&&d.dados) return {id:d.id,dados:LEADS.resumo}; return d; }); }
    var s=snapFalso(docs.filter(function(d){ return d.dados; }).map(function(d){ return {doc_id:d.id,dados:d.dados}; }));
    CRM_OUV.forEach(function(f){ try{ f(s); }catch(e){} });
  }
  function ouveCrm(db, ok, err){
    var o={parado:false}; var f=function(s){ if(!o.parado) ok(s); }; CRM_OUV.push(f);
    var u=db.collection('crm').onSnapshot(function(s){ CRM_ART=s; emiteCrm(); }, err);
    return function(){ o.parado=true; CRM_OUV=CRM_OUV.filter(function(g){ return g!==f; }); if(typeof u==='function') u(); };
  }
  function ouveLeads(db, ok, err){
    var o={parado:false, real:null, viaPaineis:false};
    o.real=db.collection('crm_leads').onSnapshot(function(s){ if(!o.viaPaineis&&!o.parado) ok(s); }, err);
    function carrega(){ return pMcp.then(function(m){ if(!m||o.parado) return;
      return Promise.all([lerTudo('paineis_leads'), db.doc('crm/base').get().catch(function(){return null;}), db.doc('crm/resumo').get().catch(function(){return null;}), db.doc('controle/paineis_corretor').get().catch(function(){return null;}),
                          lerTudo('paineis_app').catch(function(){ return []; }), db.collection('corretores').get().catch(function(){ return null; })])
      .then(function(r){ var itens=r[0]; if(o.parado) return; if(!itens.length){ E.leadsErro='vazio'; desenhaSelo(); return; }
        var base=(r[1]&&r[1].exists)?r[1].data():{}, resA=(r[2]&&r[2].exists)?r[2].data():{}, pc=(r[3]&&r[3].exists)?r[3].data():{}, IT=pc.itens||{};
        var paineis=[], add=function(p){ if(p&&!/^(_|u:)/.test(p)&&paineis.indexOf(p)<0) paineis.push(p); };
        itens.forEach(function(x){ add((x.dados||{}).corretor); }); Object.keys(IT).forEach(add); (r[4]||[]).forEach(function(x){ add(x.doc_id); });
        // universo: cadastro de corretores do HUB (situação); sem ele, a Base antiga
        var U=[]; if(r[5]&&r[5].docs&&r[5].docs.length){ r[5].docs.forEach(function(d){ var x=d.data()||{}; U.push({slug:d.id,nome:x.nome||d.id,equipe:x.equipe||'',situacao:x.situacao||''}); }); }
        else U=((base.corretores)||[]).map(function(c){ return {slug:c.slug,nome:String(c.nome||c.slug).replace(/\s*\(saiu\)/,''),equipe:c.equipe||'',situacao:/\(saiu\)/.test(c.nome||'')?'saiu':''}; });
        var raiz=null; Object.keys(IT).some(function(k){ try{ var u=new URL(IT[k].url); raiz=u.origin+'/'+(u.pathname.split('/')[1]||'')+'/'; return true; }catch(e){ return false; } });
        var M=mapaSlugs(U,paineis), urlDe={}, ativos={}, grupo={};
        paineis.forEach(function(p){ var u=(IT[p]||{}).url; M[p].forEach(function(k){ ativos[k]=true; grupo[k]=M[p]; if(u&&!urlDe[k]) urlDe[k]=u; }); });
        var lista2=itens.map(function(x){ var d=Object.assign({},x.dados); d.painel=d.corretor; d.corretor=(M[d.corretor]||[d.corretor])[0]; return {doc_id:x.doc_id,dados:d}; });
        var FORA={saiu:1,fora_da_equipe:1,parceiro:1};
        var cors=U.filter(function(c){ return ativos[c.slug]||!FORA[c.situacao]; }).map(function(c){
          return {slug:c.slug,nome:c.nome+(FORA[c.situacao]?' (saiu)':''),equipe:c.equipe,ativo:!!ativos[c.slug],planilha:urlDe[c.slug]||raiz||null,compartilhada:true,
                  junto:(grupo[c.slug]&&grupo[c.slug].length>1)?grupo[c.slug].filter(function(k){ return k!==c.slug; }):undefined}; });
        Object.keys(ativos).forEach(function(k){ if(!cors.some(function(c){ return c.slug===k; })) cors.push({slug:k,nome:k,equipe:'',ativo:true,planilha:urlDe[k]||raiz||null,compartilhada:true}); });
        var Lr=lista2.map(function(x){ return Object.assign({_id:x.doc_id},x.dados); });
        var res=resumoDe(Lr,base,resA);
        // CRM compartilhado: os demais corretores do mesmo painel mostram os mesmos números e a mesma lista de cobrança
        Object.keys(grupo).forEach(function(k){ var pri=grupo[k][0]; if(k!==pri){ if(res.por_corretor[pri]) res.por_corretor[k]=res.por_corretor[pri]; if(res.cobrar[pri]) res.cobrar[k]=res.cobrar[pri]; } });
        LEADS={base:Object.assign({},base,{corretores:cors,fonte:'paineis'}), resumo:res};
        o.viaPaineis=true; E.leadsPaineis=itens.length; E.leadsErro=''; E.leadsEm=new Date(); ok(snapFalso(lista2)); emiteCrm(); desenhaSelo(); })
      .catch(function(e){ E.leadsErro=(e&&e.code)||'erro'; desenhaSelo(); }); }); }
    carrega(); var t=setInterval(carrega,5*60*1000); RECARGAS.push(carrega);
    return function(){ o.parado=true; clearInterval(t); if(typeof o.real==='function') o.real(); };
  }

  /* ---------- o envoltório ---------- */
  // 1º o Supabase (direto), depois o artefato (art). Copia o estado final do artefato ao Supabase quando: o Supabase não
  // confirmou; o update pode ter mesclado diferente (objeto dentro); o artefato recusou depois de o Supabase gravar (desfaz
  // a diferença). Depois de prazo estourado, nova cópia 90 s depois (resposta atrasada não deixa o Supabase com estado velho).
  function grava(real, acao, d, art, copiar){
    return emOrdem(String(real&&real.path), function(){
      return direto(real,acao,d).then(function(ok){
        if(ok==='prazo') recopia(real);
        return art().then(function(v){ if(ok!==true||copiar) marca(real); return v; },
                          function(e){ if(ok===true){ marca(real); if(E.fonte==='supabase'){ var pt=partes(real.path); if(pt) setTimeout(function(){ releia(pt.col); },1500); } } throw e; });
      });
    });
  }
  function envolveDoc(real){
    var w={};
    return new Proxy(w,{ get:function(_,k){
      if(k==='set') return function(d,opt){ var mg=!!(opt&&(opt.merge||opt.mergeFields)); return grava(real,mg?'update':'set',d,function(){ return real.set(d,opt); },mg&&temObjeto(d)); };
      if(k==='update') return function(d){ return grava(real,'update',d,function(){ return real.update(d); },temObjeto(d)); };
      if(k==='delete') return function(){ return grava(real,'remover',null,function(){ return real.delete(); },false); };
      if(k==='collection') return function(p){ return envolveCol(real.collection(p), null); };
      var v=real[k]; return typeof v==='function'?v.bind(real):v; } });
  }
  function envolveCol(real, db){
    var w={};
    return new Proxy(w,{ get:function(_,k){
      if(k==='doc') return function(id){ return envolveDoc(arguments.length?real.doc(id):real.doc()); };
      if(k==='add') return function(d){ return real.add(d).then(function(ref){ marca(ref); return envolveDoc(ref); }); };
      if(k==='onSnapshot'&&db&&real.path==='crm_leads'){ return function(ok,err){ return ouveLeads(db,ok,err); }; }
      if(k==='onSnapshot'&&db&&real.path==='crm'){ return function(ok,err){ return ouveCrm(db,ok,err); }; }
      if(k==='onSnapshot'&&db&&E.fonte==='supabase'){ var c=real.path; return function(ok,err){ return ouveSupabase(db,c,ok,err); }; }
      var v=real[k]; return typeof v==='function'?v.bind(real):v; } });
  }
  function envolve(db){
    if(!db) return db;
    var w={};
    return new Proxy(w,{ get:function(_,k){
      if(k==='doc') return function(p){ return envolveDoc(db.doc(p)); };
      if(k==='collection') return function(p){ var r=db.collection(p); return String(p).indexOf('/')<0?envolveCol(r,db):envolveCol(r,null); };
      var v=db[k]; return typeof v==='function'?v.bind(db):v; } });
  }

  /* ---------- selo e painel ---------- */
  var css=document.createElement('style');
  css.textContent='.fonte-base{position:relative;font-size:15px}.fonte-base .n{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;font:600 10px/16px var(--body,system-ui);background:var(--bad,#b0402e);color:#fff;text-align:center}'+
    '.fonte-painel{position:absolute;z-index:40;right:16px;top:64px;width:min(340px,calc(100vw - 32px));background:var(--panel,#fff);color:var(--ink,#111);border:1px solid var(--line,#ccc);border-radius:10px;padding:14px;box-shadow:0 8px 24px rgba(0,0,0,.18);font-size:14px}'+
    '.fonte-painel h3{margin:0 0 6px;font:500 12px var(--display,system-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--muted,#555)}'+
    '.fonte-painel p{margin:4px 0;color:var(--muted,#555)}.fonte-painel .acoes{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}'+
    '.fonte-painel button{border:1px solid var(--line,#ccc);background:var(--bg,#f6f6f6);color:inherit;border-radius:8px;padding:8px;font:inherit;cursor:pointer;min-height:40px}'+
    '.fonte-painel button[aria-pressed="true"]{background:var(--accent,#1d2840);color:var(--on-accent,#fff);border-color:var(--accent,#1d2840)}'+
    '.fonte-painel .larga{grid-column:1/-1}';
  document.head.appendChild(css);
  var btn=null, painel=null;
  function pendentes(){ return E.fila.size+(E.enviando?1:0)+DIR.fila.length; }
  function desenhaSelo(){
    if(!btn){
      var olho=document.getElementById('btnPrivado'); if(!olho||!olho.parentNode) return;
      btn=document.createElement('button'); btn.type='button'; btn.id='fonte-base'; btn.className='tema-btn fonte-base';
      olho.parentNode.insertBefore(btn,olho.nextSibling);
      btn.addEventListener('click',function(e){ e.stopPropagation(); if(painel){ painel.remove(); painel=null; } else abrePainel(); });
      document.addEventListener('click',function(e){ if(painel&&!painel.contains(e.target)&&e.target!==btn){ painel.remove(); painel=null; } });
    }
    var sup=E.fonte==="supabase"&&!E.semConector;
    btn.innerHTML=(sup?'☁':'🗄')+(pendentes()?'<span class="n">'+pendentes()+'</span>':'');
    var nC=Object.keys(E.doCache||{}).length;
    var t='Base: '+(sup?'Supabase':'artefato')+(E.semConector?' · sem o conector Vivere Conversas':' · grava primeiro no Supabase')+(pendentes()?' · '+pendentes()+' gravações a enviar':'')+(nC?' · '+nC+' coleções da última visita, atualizando':'');
    btn.title=t; btn.setAttribute('aria-label',t);
    if(painel) preenche();
  }
  function abrePainel(){
    painel=document.createElement('div'); painel.className='fonte-painel'; painel.setAttribute('role','dialog'); painel.setAttribute('aria-label','Base de dados do HUB');
    document.body.appendChild(painel); preenche();
    try{ var r=btn.getBoundingClientRect(); painel.style.top=Math.round(r.bottom+window.scrollY+8)+'px'; }catch(e){}
  }
  function preenche(){
    var sup=E.fonte==='supabase'&&!E.semConector;
    var lidas=Object.keys(E.lidas).length, erros=Object.keys(E.leituraErros);
    painel.innerHTML='<h3>Base de dados do HUB</h3>'+
      '<p><b>Fonte neste aparelho:</b> '+(sup?'Supabase (padrão)':E.semConector?'artefato (sem o conector)':'artefato (reserva)')+'</p>'+
      '<p><b>Gravação:</b> '+(E.semConector?'só no artefato (sem o conector); o espelho diário copia':'primeiro no Supabase, depois no artefato')+' · diretas '+E.diretas+' · copiadas '+E.espelhadas+' · a enviar '+pendentes()+' · falhas '+E.falhas+(E.puladas?' · fora do mapa '+E.puladas:'')+(E.semCopia?' · não copiadas '+E.semCopia:'')+'</p>'+
      (E.falhas?'<p>Última falha: '+String(E.ultimaFalha).replace(/[<>&]/g,'')+'. O espelho diário cobre.</p>':'')+
      '<p><b>Gestão de leads:</b> '+(E.leadsPaineis?E.leadsPaineis+' leads dos painéis'+(E.leadsEm?' · lidos às '+E.leadsEm.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''):(E.semConector?'sem o conector; mostrando o artefato':E.leadsErro?'painéis indisponíveis ('+String(E.leadsErro).replace(/[<>&]/g,'')+'); mostrando o artefato':'lendo os painéis…'))+'</p>'+
      (sup?'<p>Coleções lidas do Supabase: '+lidas+(Object.keys(E.semMudanca).length?' (sem mudança, da cópia do aparelho: '+Object.keys(E.semMudanca).length+')':'')+(filaLeitura.length||ativos?' · lendo…':'')+(erros.length?' · voltaram ao artefato: '+erros.length:'')+'</p>':'')+
      '<div class="acoes"><button type="button" data-fonte="supabase" aria-pressed="'+sup+'"'+(E.semConector?' disabled':'')+'>Supabase</button>'+
      '<button type="button" data-fonte="artefato" aria-pressed="'+(!sup)+'">Artefato (reserva)</button>'+
      '<button type="button" class="larga" data-releitura="1">'+(sup?'Reler tudo do Supabase':'Reler os leads dos painéis')+'</button></div>';
    painel.querySelectorAll('[data-fonte]').forEach(function(b){ b.addEventListener('click',function(){
      var f=b.dataset.fonte; if(f===E.fonte) return; try{ localStorage.setItem(CHAVE,f); }catch(e){}
      location.reload(); }); });
    var rl=painel.querySelector('[data-releitura]'); if(rl) rl.addEventListener('click',function(){ if(E.fonte==='supabase') Object.keys(OUVINTES).forEach(releia); RECARGAS.forEach(function(f){ f(); }); preenche(); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',desenhaSelo); else desenhaSelo();

  window.BaseSupabase={ envolve:envolve, estado:function(){ return {fonte:E.fonte, diretas:E.diretas, espelhadas:E.espelhadas, falhas:E.falhas, puladas:E.puladas, semCopia:E.semCopia, pendentes:pendentes(), leadsPaineis:E.leadsPaineis, leadsErro:E.leadsErro, lidas:Object.assign({},E.lidas), semConector:E.semConector}; } };
})();
