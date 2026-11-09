/* Botão do olho (ocultar valores e dados sensíveis): o mesmo dos painéis. */
(function(){
  var CHAVE='olho-privado';
  // R$ · CPF · CNPJ · e-mail · telefone com hífen · CEP
  var RE=/R\$\s?-?\s?\d[\d.]*(?:,\d{1,2})?|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|(?:\+55\s?)?\(?\b\d{2}\)?\s?9?\s?\d{4}-\d{4}(?![\d.])|\b\d{5}-\d{3}\b(?![\d.])/g;
  var PULAR={SCRIPT:1,STYLE:1,NOSCRIPT:1,TEXTAREA:1,INPUT:1,SELECT:1,OPTION:1,CODE:1,PRE:1,SVG:1};
  var ativo=false, obs=null, agendado=false;

  function ler(){try{return localStorage.getItem(CHAVE)==='1';}catch(e){return false;}}
  function gravar(v){try{localStorage.setItem(CHAVE,v?'1':'0');}catch(e){}}

  function deveSaltar(el){
    for(var n=el;n&&n.nodeType===1;n=n.parentNode){
      if(PULAR[n.nodeName.toUpperCase()]||n.classList.contains('sens')||n.hasAttribute('data-sens')||n.hasAttribute('data-sens-ignorar')||n.id==='btnPrivado')return true;
    }
    return false;
  }

  function varrer(raiz){
    if(!raiz||!document.body)return;
    var w=document.createTreeWalker(raiz,NodeFilter.SHOW_TEXT,null),lista=[],t;
    while((t=w.nextNode())){RE.lastIndex=0;if(t.nodeValue&&RE.test(t.nodeValue)&&!deveSaltar(t.parentNode))lista.push(t);}
    lista.forEach(function(no){
      var txt=no.nodeValue,frag=document.createDocumentFragment(),ult=0,m;RE.lastIndex=0;
      while((m=RE.exec(txt))){
        if(m.index>ult)frag.appendChild(document.createTextNode(txt.slice(ult,m.index)));
        var s=document.createElement('span');s.className='sens';s.textContent=m[0];frag.appendChild(s);ult=m.index+m[0].length;
      }
      if(ult<txt.length)frag.appendChild(document.createTextNode(txt.slice(ult)));
      if(no.parentNode)no.parentNode.replaceChild(frag,no);
    });
    var campos=raiz.querySelectorAll?raiz.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])'):[];
    for(var i=0;i<campos.length;i++){RE.lastIndex=0;campos[i].classList.toggle('sens',!!campos[i].value&&RE.test(campos[i].value));}
  }

  function agendar(){
    if(agendado)return;agendado=true;
    requestAnimationFrame(function(){agendado=false;if(!ativo)return;if(obs)obs.disconnect();varrer(document.body);ligarObs();});
  }
  function ligarObs(){
    if(!obs)obs=new MutationObserver(agendar);
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  function aplicar(v){
    ativo=v;
    document.documentElement.setAttribute('data-privado',v?'1':'0');
    var b=document.getElementById('btnPrivado');
    if(b){
      b.setAttribute('aria-pressed',v?'true':'false');
      var r=v?'Mostrar valores e dados sensíveis':'Ocultar valores e dados sensíveis';
      b.title=r;b.setAttribute('aria-label',r);
    }
    if(v){varrer(document.body);ligarObs();}else if(obs){obs.disconnect();}
  }

  document.addEventListener('input',function(e){if(ativo&&e.target&&e.target.tagName==='INPUT'){RE.lastIndex=0;e.target.classList.toggle('sens',!!e.target.value&&RE.test(e.target.value));}},true);
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#btnPrivado');if(!b)return;var v=!ativo;gravar(v);aplicar(v);});

  function iniciar(){aplicar(ler());}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
  window.olhoPrivado={aplicar:aplicar,varrer:function(){if(ativo)varrer(document.body);}};
})();
