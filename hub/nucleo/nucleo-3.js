
(function(){
const COLS=['imoveis','contratos_locacao','cobrancas','repasses','receita_mensal','vendas','recebimentos_cleiton','documentos','tarefas','corretores','pendencias','controle','drive_mapa','leads','leads_contatos','crm_leads','crm','construcoes','mapa_detalhes','pessoas_dados','fichas-locacao_dados','oportunidades','drive_pastas','crm_etapas'];
const S={}; COLS.forEach(c=>S[c]={});
let DB=null, carregado={};
const ABAS=[
  ['pendencias','Pendências'],['imoveis','Imóveis'],['carteira','Carteira'],['cobranca','Cobrança'],['receita','Receita'],
  ['crm-visao','Visão geral'],['leads','Leads'],['oportunidades','Oportunidades'],['crm','Funil dos corretores'],['vendas','Vendas'],
  ['documentos','Documentos'],['tarefas','Tarefas'],['construcoes','Construções']];
// Abas agrupadas por área (18/10/2026): a barra de cima mostra os grupos; a de baixo, as abas do grupo escolhido.
// Módulo novo informa `grupo` (e `depois`) no HUB.registrar; sem isso, o grupo vem da área da construção.
// 20/10/2026 (decisão do Cleiton, construção "Pessoas"): a área Imóveis virou **Cadastros** — a base (imóveis, empreendimentos,
// construtoras, pessoas, funções, empresas do grupo); Locação e Comercial são as áreas de operação, que só consomem e ligam.
// O núcleo decide a área e a ordem das abas (GRUPO_FORCA, ORDEM_ABAS, ROT_ABA): nenhum arquivo de módulo precisa mudar.
// 26/10/2026 (decisão do Cleiton, tarefa "separacao-hub-vivere-erp-crm"): Cadastros + Comercial viraram a área **CRM**, módulo próprio
// dentro do HUB — anúncios, cadastros de imóveis e pessoas, mapa, empreendimentos, agenciamentos, leads, funil dos corretores e portais
// (base dos painéis dos corretores e do futuro site). O resto é a parte de gestão (ERP): Locação, Financeiro (com Vendas: contrato,
// comissão e a receber) e Gestão (com Empresas do grupo). Não há plano de separar o CRM em outro artefato.
const GRUPOS=[['inicio','Início'],['crm','Leads'],['estoque','Imóveis'],['marketing','Marketing'],['cadastros','Cadastros'],['equipe','Equipe'],['locacao','Locação'],['financeiro','Financeiro'],['gestao','Gestão'],['construcoes','Construções']]; /* hub-redesenho-f1 */ // 22/11/2026: o CRM virou 5 áreas (Leads, Imóveis, Marketing, Cadastros, Equipe); o id 'crm' segue sendo a área de Leads
const GRUPO_DE={pendencias:'inicio','crm-visao':'crm',imoveis:'estoque',carteira:'locacao',cobranca:'locacao',receita:'financeiro',leads:'crm',oportunidades:'crm',crm:'crm',vendas:'financeiro',documentos:'gestao',tarefas:'gestao',construcoes:'construcoes'};
// 26/10/2026 (decisão do Cleiton, construção "locacao-resumo"): Locação abre pelo Resumo — locados, adm. por mês, intermediação a receber e entradas.
const GRUPO_ALIAS={imoveis:'estoque',comercial:'estoque'}; /* hub-redesenho-f1 */ // grupos antigos pedidos pelos módulos (imoveis, cadastros, comercial) → CRM
const GRUPO_FORCA={'base-leads':'crm','leads-a-classificar':'crm','demandas':'crm','demandas-auto':'crm','inteligencia-crm':'crm','captacao-leads':'crm','cadastro-imoveis':'estoque','empreendimentos':'estoque','portais':'estoque','inatividade-agenciamento':'estoque','mapa':'estoque','link-mapa':'estoque','pendencias-cadastro':'estoque','captei':'estoque','acm':'estoque','marketing':'marketing','site-leads':'marketing','concorrentes':'marketing','pessoas':'cadastros','pessoas-funcoes':'cadastros','empreendimentos-construtoras':'cadastros','cadastro-corretores':'equipe','metas-corretores':'equipe','solicitacoes':'equipe','whatsapp-ia':'equipe','app-vivere':'equipe','institucional':'gestao'}; /* hub-redesenho-f1b: famílias de sub-abas (SUBS) sempre na mesma área */
const ORDEM_ABAS={'crm':['crm-visao','crm','leads','base-leads','leads-a-classificar','oportunidades','captacao-leads','demandas','demandas-auto','inteligencia-crm'],'estoque':['cadastro-imoveis','imoveis','mapa','empreendimentos','portais','inatividade-agenciamento','pendencias-cadastro','captei','acm','link-mapa'],'marketing':['marketing','site-leads','concorrentes'],'cadastros':['pessoas','pessoas-funcoes','empreendimentos-construtoras'],'equipe':['cadastro-corretores','metas-corretores','solicitacoes','whatsapp-ia','app-vivere'],'locacao':['locacao-resumo','carteira','fichas-locacao','boletos','cobranca','vistorias'],'financeiro':['financeiro','receita','vendas','fin-receber','fin-despesas','fin-pagar','fin-juridico'],'gestao':['tarefas','documentos','juridico','institucional-cultura','institucional']}; /* hub-redesenho-f1b */
const ROT_ABA={crm:'Gestão de leads',oportunidades:'Ofertas',pessoas:'Pessoas',demandas:'Demandas extras',institucional:'Empresas do grupo',receita:'Receitas',imoveis:'Anúncios do site',captei:'Arquivo Captei'}; /* hub-redesenho-f1c */ // Receita saiu da Locação para o Financeiro (20/10/2026)
const ABA_ALIAS={meus:'juridico',corretores:'pessoas','cadastro-corretores':'pessoas'}; // abas que mudaram de nome ou foram absorvidas
const abaReal=a=>ABA_ALIAS[a]||a;
const abaPend=x=>x.tipo==='a_receber_antigo'&&ABAS.some(a=>a[0]==='fin-juridico')?'fin-juridico':abaReal(x.aba);
const rotAba=id=>ROT_ABA[id]||((ABAS.find(a=>a[0]===id)||[])[1])||'';
const grupoDe=id=>GRUPO_DE[id]||'gestao';
function abasPadraoDoGrupo(gr){ const o=ORDEM_ABAS[gr]||[]; const ix=id=>{const i=o.indexOf(id); return i<0?999:i;};
  return ABAS.map((a,i)=>[a,i]).filter(([a])=>grupoDe(a[0])===gr).sort((x,y)=>ix(x[0][0])-ix(y[0][0])||x[1]-y[1]).map(([a])=>[a[0],rotAba(a[0])]); }
// Ordem das áreas e das abas de cada pessoa (26/10/2026): banco data/users/<id>/preferencias (campo ordem_abas = {_grupos:[…], <área>:[…]});
// a cópia no aparelho (hubv.ordemAbas) só serve para o HUB já abrir na ordem dela. O objeto lido do banco vem congelado: só copiar.
const ORD_LS='hubv.ordemAbas'; let ORD=(()=>{ try{ const v=JSON.parse(localStorage.getItem(ORD_LS)||'null'); return v&&typeof v==='object'&&!Array.isArray(v)?v:null; }catch(e){ return null; } })(); let PREFS={}, UID=null;
const ordLocal=v=>{ try{ if(v) localStorage.setItem(ORD_LS,JSON.stringify(v)); else localStorage.removeItem(ORD_LS); }catch(e){} };
function abasDoGrupo(gr){ const pad=abasPadraoDoGrupo(gr), s=ORD&&ORD[gr]; if(!s) return pad; const m=new Map(pad.map(a=>[a[0],a])); return ReordAbas.ordena(pad.map(a=>a[0]),s).map(k=>m.get(k)); }
const gruposOrdenados=()=>ReordAbas.ordena(GRUPOS.map(g=>g[0]),ORD&&ORD._grupos).map(k=>GRUPOS.find(g=>g[0]===k));
function guardarOrdem(nivel,ordem){ // nivel: '_grupos', id da área ou '*' (tudo de volta ao padrão)
  const novo=nivel==='*'?{}:{...(ORD||{})};
  if(nivel!=='*'){ const pad=nivel==='_grupos'?GRUPOS.map(g=>g[0]):abasPadraoDoGrupo(nivel).map(a=>a[0]); const fin=ordem?ReordAbas.ordena(pad,ordem):pad; if(ReordAbas.igual(fin,pad)) delete novo[nivel]; else novo[nivel]=fin; }
  ORD=Object.keys(novo).length?novo:null; ordLocal(ORD); render();
  const naConta=!!(DB&&UID);
  if(naConta) gravaPref({ordem_abas:ORD},'Não consegui guardar a ordem na sua conta: por enquanto ela vale só neste aparelho.');
  ReordAbas.aviso(ORD?(naConta?'Ordem salva (vale no celular e no computador).':'Ordem salva neste aparelho.'):'Áreas e abas de volta à ordem padrão.',ORD?()=>guardarOrdem('*',null):null);
}
// 15/11/2026 (hub #12): preferência grava só o campo que mudou (update; sem o documento, set com merge) — nunca o documento inteiro da cópia local, que apagava a ordem das abas ao trocar a visão do CRM; falha avisa
async function gravaPref(campos,msgFalha){ if(!(DB&&UID)) return; const ref=DB.doc('data/users/'+UID+'/preferencias'), c=Object.assign({},campos,{atualizado_em:new Date().toISOString()});
  try{ await ref.update(c); }catch(e){ try{ await ref.set(c,{merge:true}); }catch(e2){ if(msgFalha&&window.ReordAbas&&ReordAbas.aviso) ReordAbas.aviso(msgFalha); } } }
const ULT_GRUPO={}; try{Object.assign(ULT_GRUPO,JSON.parse(localStorage.getItem('hubv.grupos')||'{}'));}catch(e){}
let aba='pendencias', abaGuardada=''; try{const a=abaReal(localStorage.getItem('hubv.aba')||''); abaGuardada=a; if(a&&ABAS.some(x=>x[0]===a)) aba=a;}catch(e){}
if(/^#[a-z0-9-]+$/.test(location.hash)) abaGuardada=abaReal(location.hash.slice(1));
if(/^#[a-z]+$/.test(location.hash) && ABAS.some(x=>x[0]===abaReal(location.hash.slice(1)))) aba=abaReal(location.hash.slice(1));
let focoLinha=''; // linha realçada ao chegar pela busca (carteira: car-<cód>; vendas: ven-<id>)
let filtroPend='abertas'; let filtroDoc='todos'; let destCob=null;
let fImv={q:'',fin:'todas',st:'ativos',pg:0,de:'',ate:'',alerta:'',foco:[],focoTxt:'',c:{},por:(()=>{ try{ const v=+localStorage.getItem('hub_imv_por'); return [50,100].includes(v)?v:100; }catch(e){ return 100; } })()}; // por = imóveis por página (50 ou 100; o 20 saiu em 13/11/2026, pedido do Cleiton), escolha guardada por leitor (02/11/2026)
let fLeads={q:'',cor:'',camp:'',mes:'',st:'',pg:0,int:''};
let fCRM={q:'',cor:'',et:'',al:'',sel:'',int:''};
// tema claro/escuro (20/10/2026, pedido do Cleiton): sem escolha, segue o aparelho; o botão do cabeçalho troca e o navegador lembra (hubv.tema)
(()=>{ let t=''; try{ t=localStorage.getItem('hubv.tema')||''; }catch(e){} if(t==='light'||t==='dark') document.documentElement.dataset.theme=t; })();
const temaAtual=()=>{ const t=document.documentElement.dataset.theme; return t==='light'||t==='dark'?t:(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); };
function pintaTema(){ const b=document.getElementById('tema-btn'); if(!b) return; const d=temaAtual()==='dark'; b.textContent=d?'☀':'☾'; b.title=d?'Mudar para o modo claro':'Mudar para o modo escuro'; b.setAttribute('aria-label',b.title); }
document.addEventListener('click',e=>{ if(!e.target.closest||!e.target.closest('#tema-btn')) return; const n=temaAtual()==='dark'?'light':'dark'; document.documentElement.dataset.theme=n; try{localStorage.setItem('hubv.tema',n)}catch(_){} pintaTema(); });
try{ matchMedia('(prefers-color-scheme: dark)').addEventListener('change',pintaTema); }catch(e){}
const IMOB='https://painel2.imobibrasil.app.br/imobiliarias/imovel_alterar.php?cod=';

const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* escUrl (14/11/2026, revisão do Lucas, hub #19): link vindo do banco só vai ao href com esquema seguro; o resto vira '#'. */
function escUrl(u){ const s=String(u==null?'':u).trim(); const t=s.replace(/[\u0000-\u0020\u007f]/g,''); const m=/^([a-z][a-z0-9+.\-]*):/i.exec(t); return esc(m&&!/^(https?|mailto|tel|abrirpasta)$/i.test(m[1])?'#':s); }
window.escUrl=escUrl;
const brl=v=>v==null||v===''||isNaN(v)?'—':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const brl0=v=>v==null||isNaN(v)?'—':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
// mais(v)/menos(v): valor com sinal; clsVal(v,negativo): classe da célula (receita = verde, despesa = vermelho)
const sinal=(v,f,neg)=>v==null||v===''||isNaN(v)?'—':(neg?'− ':'+ ')+(f||brl)(Math.abs(Number(v)));
const mais=(v,f)=>sinal(v,f,false), menos=(v,f)=>sinal(v,f,true);
const clsVal=(v,neg)=>v==null||v===''||isNaN(v)||!Number(v)?'':(neg?'vmenos':'vmais');
const pct=v=>v==null||v===''||isNaN(v)?'—':(Number(v)*100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
const dt=s=>{if(!s)return '—'; const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); return m?`${m[3]}/${m[2]}/${m[1]}`:esc(s)};
const mesTxt=s=>{if(!s)return '—'; const [y,m]=String(s).split('-'); const n=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][+m-1]; return n?`${n}/${y.slice(2)}`:s};
const hojeISO=()=>{const d=new Date(Date.now()-3*3600e3);return d.toISOString().slice(0,10)};
const dias=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
const lista=c=>Object.entries(S[c]).map(([id,d])=>Object.assign({_id:id},d));
const ordCod=(a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true});

function campo(c,k){ // precedência: planilha (contrato) > alude > pasta; endereço curto vem do Alude
  for(const f of (k==='endereco'||k==='bairro'?['alude','planilha','pasta']:['planilha','alude','pasta'])){ if(c[f]&&c[f][k]!=null&&c[f][k]!=='') return c[f][k]; }
  return c[k]!=null?c[k]:null;
}
function contratos(){ return lista('contratos_locacao').sort((a,b)=>ordCod(a._id,b._id)); }
function indet(c){ return (params().prazo_indeterminado||[]).includes(c._id); }
function ativo(c){ if(indet(c)) return !(c.alude&&c.alude.arquivado); const st=campo(c,'status'); if(st) return st==='ativo'; if(c.alude&&c.alude.arquivado) return false; const t=campo(c,'termino'); return !t||t>=hojeISO(); }
function params(){ return Object.assign({meta_locacao:40,meta_prazo:'2026-12-31',boleto_dias:5,boleto_vermelho:10},S.controle.parametros||{}); }
// taxa de administração (15/11/2026, revisão do Lucas hub #16): regra única do Financeiro e do Resumo da Locação.
// Temporada não tem administração (só intermediação) → 0; senão a da planilha, a especial dos parâmetros ou 10%.
function taxaAdm(x){ const id=typeof x==='string'?x:((x&&(x._id||x.cod))||''); const c=typeof x==='string'?((S.contratos_locacao||{})[x]||{}):(x||{});
  const pl=c.planilha||{}, al=c.alude||{}; const tipo=String(pl.tipo!=null?pl.tipo:(al.tipo||''));
  if(String(id).startsWith('T')||/temporada/i.test(tipo)) return 0;
  if(pl.taxa_adm!=null&&pl.taxa_adm!=='') return Number(pl.taxa_adm)||0;
  const e=(params().taxas_especiais||{})[id]; return e!=null?(Number(e)||0):0.10; }
// data de Brasília de n dias atrás (15/11/2026, hub #22): as contas de "hoje" e "últimos n dias" usam o dia de Brasília, não o UTC (que vira às 21h)
const diasAtrasISO=n=>new Date(Date.now()-3*3600e3-(Number(n)||0)*864e5).toISOString().slice(0,10);
// próximo dia útil (15/11/2026, hub #24): sábado, domingo e feriados nacionais (fixos, Carnaval, Sexta-feira Santa e Corpus Christi) empurram o vencimento
function pascoaUTC(y){ const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114; return Date.UTC(y,Math.floor(n/31)-1,n%31+1); }
const FERIADOS_FIXOS=['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'];
function feriadoNac(iso){ if(FERIADOS_FIXOS.includes(iso.slice(5,10))) return true; const p=pascoaUTC(+iso.slice(0,4)), t=Date.parse(iso.slice(0,10)+'T00:00:00Z'); return [-48,-47,-2,60].some(n=>p+n*864e5===t); }
function diaUtil(iso){ let t=Date.parse(String(iso||'').slice(0,10)+'T00:00:00Z'); if(isNaN(t)) return iso; for(let i=0;i<15;i++){ const d=new Date(t), s=d.toISOString().slice(0,10), w=d.getUTCDay(); if(w!==0&&w!==6&&!feriadoNac(s)) return s; t+=864e5; } return new Date(t).toISOString().slice(0,10); }
// trava de dado pessoal (15/11/2026, hub #15): uma regra só para todos os módulos — lembrete, não garantia.
// Pega telefone com separador ou celular corrido (DDD + 9 + 8), CPF/CNPJ com ou sem pontos e espaços, e-mail e conta;
// número corrido sem formato de telefone (nota, boleto, versão) passa.
const RE_SENS=[['CNPJ',/(?<!\d)\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}(?!\d)/],['CPF',/(?<!\d)\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}(?!\d)/],['e-mail',/[\w.+-]+@[\w-]+\.[\w.]+/],
  ['telefone',/(?<!\d)(?:\+?55[\s-]?)?(?:\(\s?[1-9]\d\s?\)[\s-]?|[1-9]\d[\s-])(?:9[\s-]?)?\d{4}[\s-]?\d{4}(?!\d)|(?<!\d)(?:55)?[1-9]\d9\d{8}(?!\d)/],['conta bancária',/\b(ag[eê]ncia|conta|pix)\b.{0,12}\d{3,}/i]];
function sensivel(o){ const t=typeof o==='string'?o:JSON.stringify(o||{}); for(const [n,re] of RE_SENS) if(re.test(t)) return n; return ''; }
function mascaraSens(t){ let s=String(t==null?'':t); for(const [n,re] of RE_SENS) s=s.replace(new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'),'['+n+']'); return s; }

/* ---------- cabeçalho ---------- */
function pintaColetas(){
  // 22/11/2026 (pedido do Cleiton, tarefa vis-app-carregamento-transicoes): as 9 coletas viram um resumo de 1 linha
  // ("Coletas em dia · 8 de 9 · hora", vermelho se alguma falhou); o toque abre o detalhe de cada fonte.
  const c=S.controle.coletas||{}; const nomes={alude:'Alude',planilha:'Planilha',imobibrasil:'Imobibrasil',pastas:'Pastas',tarefas:'Tarefas',leads:'Leads',drive:'Drive',crm:'CRM',pendencias:'Pendências'};
  const el=document.getElementById('coletas'); const ks=Object.keys(nomes); let ok=0, falha=0, ult=0;
  const chips=ks.map(k=>{const x=c[k]||{}; const st=x.status||''; if(st==='ok') ok++; if(st==='falhou') falha++;
    const t=x.em?Date.parse(x.em):NaN; if(t>ult) ult=t;
    const quando=x.em?new Date(x.em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'sem coleta';
    return `<span class="chip ${esc(st)}" title="${esc(x.msg||'')}"><i></i>${nomes[k]} · ${esc(st==='falhou'?'falhou':quando)}</span>`}).join('');
  const hora=ult?new Date(ult).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'sem coleta';
  const txt=falha?`${falha===1?'1 coleta falhou':falha+' coletas falharam'} · ${ok} de ${ks.length} em dia`:`Coletas em dia · ${ok} de ${ks.length}`;
  const html=`<details class="col-res"><summary class="chip ${falha?'falhou':ok===ks.length?'ok':'pulado'}" title="Ver a última coleta de cada fonte"><i></i><span class="col-tx">${txt}</span><span class="col-h">· ${esc(hora)}</span></summary><div class="col-det">${chips}</div></details>`;
  if(el._h===html) return; const aberto=!!el.querySelector('details[open]'); el._h=html; el.innerHTML=html; if(aberto) el.firstElementChild.open=true;
  el.classList.toggle('com-falha',!!falha);
}
function pintaKpis(){
  // Régua do topo (decisão do Cleiton em 18/10/2026, a partir dos indicadores dos sistemas de gestão imobiliária):
  // locação (carteira, VGL, inadimplência, receita) → vendas e comercial (VGV, leads) → imóveis (estoque) → pendências.
  const p=params(); const cs=contratos().filter(ativo); const n=cs.length; const meta=p.meta_locacao;
  const atras=lista('cobrancas').filter(b=>b.situacao==='atrasada'&&(b.dias_atraso||0)>=p.boleto_dias);
  const vAtras=atras.reduce((t,b)=>t+(Number(b.valor)||0),0);
  const cAtras=new Set(atras.map(b=>b.cod)).size; const pctAtras=n?Math.round(cAtras/n*100):0;
  const mes=hojeISO().slice(0,7); const r=S.receita_mensal[mes]||{};
  const vgl=cs.reduce((t,c)=>t+(Number(campo(c,'aluguel_contrato')??campo(c,'aluguel'))||0),0);
  // VGV (decisão de 18/10/2026): só negócios de imóvel (PCV, cessão, dação, permuta, promessa) com comissão — sem aditivo, corretagem, bens móveis e "Sem comissão"
  const ano=hojeISO().slice(0,4); const vAno=lista('vendas').filter(v=>String(v.data||'').startsWith(ano)&&/^(PCV|CESS|PERMUTA|DA[CÇ][AÃ]O|PROMESSA)/i.test(String(v.tipo||'').trim())&&!/sem comiss/i.test(String(v.status||'')));
  const somaV=k=>vAno.reduce((t,v)=>t+(Number(v[k])||0),0);
  const LM=leadsTodos(); const mesAnt=(()=>{const [y,m]=mes.split('-').map(Number); return m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,'0')}`;})();
  const R0=(S.leads||{}).resumo; const pm=R0?(mesclaResumo(R0,extraLeads()).por_mes||{}):null;
  const nMes=pm?(pm[mes]||0):LM.filter(x=>x.mes===mes).length, nAnt=pm?(pm[mesAnt]||0):LM.filter(x=>x.mes===mesAnt).length;
  const avanc=LM.filter(x=>x.mes===mes&&['em_contato','visita','vendido'].includes(x.status)).length;
  const IM=lista('imoveis').filter(x=>x.ativo); const nFin=f=>IM.filter(x=>finDe(x._id)===f).length;
  const parados=new Set(lista('pendencias').filter(x=>x.status==='aberta'&&x.tipo==='site_anuncio_parado').flatMap(x=>x.refs||[])).size;
  const pend=lista('pendencias').filter(x=>x.status==='aberta'); const alta=pend.filter(x=>x.prioridade==='alta').length;
  const k=[
    {aba:'carteira',rot:'Carteira de locação',num:`${esc(n)}<span style="font-size:16px;color:var(--muted)"> / ${esc(meta)}</span>`,sub:`<div class="meter" role="img" aria-label="${esc(n)} de ${esc(meta)}"><b style="width:${Math.min(100,n/meta*100)}%"></b></div><span>faltam ${esc(Math.max(0,meta-n))} até ${dt(p.meta_prazo)}</span>`},
    {aba:'carteira',rot:'VGL da carteira',num:n?brl0(vgl):'—',sub:n?`ticket médio ${brl0(vgl/n)} · ${n} contrato${n===1?'':'s'} ativo${n===1?'':'s'}`:'aguardando coleta'},
    {aba:'cobranca',rot:`Boletos em atraso (≥ ${p.boleto_dias} d)`,num:atras.length,sub:atras.length?`${brl(vAtras)} em aberto<br>${cAtras} de ${n} contrato${n===1?'':'s'} · ${pctAtras}% da carteira`:'nenhum · 0% da carteira',alerta:atras.length>0},
    {aba:'receita',rot:`Receita locação ${mesTxt(mes)}`,num:r.total!=null?`<span class="vmais">${mais((r.adm||0)+(r.intermediacao||0),brl0)}</span>`:'—',sub:r.total!=null?`adm. ${brl0(r.adm)} · interm. ${brl0(r.intermediacao)}<br>comissões de venda (contratos do mês) ${brl0(r.vendas)}`:'aguardando coleta'},
    {aba:'vendas',rot:`Vendas em ${ano} (VGV)`,num:carregado.vendas||vAno.length?(v=>v>=1e6?`<span title="${brl0(v)}">R$ ${(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})} mi</span>`:brl0(v))(somaV('valor_transacao')):'—',sub:vAno.length?`${vAno.length} negócio${vAno.length===1?'':'s'} com comissão · comissão da imob. ${brl0(somaV('comissao_imob'))}`:'nenhum negócio no ano'},
    {aba:'leads',rot:`Leads ${mesTxt(mes)}`,num:nMes,sub:`${mesTxt(mesAnt)}: ${nAnt}${avanc?` · ${avanc} em contato, visita ou fechado`:''}`},
    {aba:'imoveis',rot:'Estoque anunciado',num:IM.length,sub:`venda ${nFin('V')} · locação ${nFin('A')} · temporada ${nFin('T')}${parados?`<br>${parados} sem atualização (alerta do site)`:''}`},
    {aba:'pendencias',rot:'Pendências abertas',num:pend.length,sub:alta?`${alta} de prioridade alta`:'nenhuma alta',alerta:alta>0},
  ];
  document.getElementById('kpis').innerHTML=k.map(x=>`<button class="kpi ${x.alerta?'alerta':''}" data-aba="${x.aba}"><span class="rot">${x.rot}</span><span class="num">${x.num}</span><span class="sub">${x.sub}</span></button>`).join('');
}
function pintaAbas(){
  if(ReordAbas.ativo()) return; // não redesenha no meio do arraste
  const nCob=lista('cobrancas').filter(b=>b.situacao==='atrasada'&&(b.dias_atraso||0)>=params().boleto_vermelho).length;
  const nPend=lista('pendencias').filter(x=>x.status==='aberta'&&x.prioridade==='alta').length;
  // selo de módulo (31/10/2026, aba Demandas): o módulo informa contador() — novidades e pedidos em aberto
  const nMod=id=>{ const m=MODS[id]; if(!m||typeof m.contador!=='function') return 0; try{ return +m.contador()||0; }catch(_){ return 0; } };
  const badge=id=>{ const nm=nMod(id); return id==='pendencias'&&nPend?`<span class="badge">${nPend}</span>`:id==='cobranca'&&nCob?`<span class="badge">${nCob}</span>`:nm?`<span class="badge">${nm}</span>`:''; };
  const g=grupoDe(aba); ULT_GRUPO[g]=aba; try{localStorage.setItem('hubv.grupos',JSON.stringify(ULT_GRUPO))}catch(_){}
  const abasDo=abasDoGrupo;
  const badgeG=gr=>{ const n=(gr==='inicio'?nPend:0)+(gr==='locacao'?nCob:0)+(gr==='crm'?nMod('demandas'):0); return n?`<span class="badge">${n}</span>`:''; };
  document.getElementById('abas').innerHTML=gruposOrdenados().filter(([gr])=>abasDo(gr).length).map(([gr,t])=>`<button id="grupo-${gr}" aria-current="${gr===g?'page':'false'}" aria-selected="${gr===g}" data-grupo="${gr}" title="${esc(abasDo(gr).map(a=>a[1]).join(' · '))}">${t}${badgeG(gr)}</button>`).join('')+ReordAbas.botao(); // ↺ Ordem padrão sempre no fim da barra de áreas (31/10/2026); na ordem original o clique não faz nada
  // 03/11/2026 (pedido do Cleiton): Demandas virou a sub-aba "Demandas extras" dentro de Oportunidades — sai da barra e soma o selo em Oportunidades
  // 03/11/2026: Captação também virou sub-aba de Oportunidades (ordem: Oportunidades · Captação · Demandas extras)
  // 03/11/2026: Imóveis também ganhou sub-abas (Anúncios do site · Mapa · Empreendimentos) — tabela SUBS
  const dentro=subsDentroTodos(), sub=abasDo(g).filter(([id])=>!dentro.includes(id)), el=document.getElementById('subabas');
  const badgeS=id=>{ const f=subsFilhas(id); if(!f.length) return badge(id); const n=f.reduce((s,k)=>s+nMod(k),0); return badge(id)+(n?`<span class="badge">${n}</span>`:''); };
  if(sub.length>1){ el.hidden=false; el.innerHTML=sub.map(([id,t])=>`<button role="tab" id="aba-${id}" aria-selected="${id===aba||subsPai(aba)===id}" data-aba="${id}">${t}${badgeS(id)}</button>`).join(''); }
  else { el.hidden=true; el.innerHTML=''; }
}
ReordAbas.liga(document.getElementById('abas'),{sel:'button[data-grupo]',attr:'grupo',aoSoltar:o=>guardarOrdem('_grupos',o),redesenha:()=>pintaAbas()});
ReordAbas.liga(document.getElementById('subabas'),{sel:'button[data-aba]',attr:'aba',aoSoltar:o=>guardarOrdem(grupoDe(aba),o),redesenha:()=>pintaAbas()});
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('[data-ord-reset]')&&ORD) guardarOrdem('*',null); });
document.addEventListener('click',e=>{
  if(aba==='imoveis'&&carEvento(e,'imvc',fImv.c)){ fImv.pg=0; fImv.alerta=''; fImv.foco=[]; render(); return; }
  const hm=e.target.closest('[data-hubmapa]'); if(hm){ e.preventDefault(); irMapaHub(hm.dataset.hubmapa); return; }
  const ex=e.target.closest('[data-imvex]'); if(ex){ fImv.q=ex.dataset.imvex; fImv.pg=0; fImv.ord=null; const i=document.getElementById('imv-q'); if(i) i.value=fImv.q; const el=document.getElementById('imv-res'); if(el){ el.innerHTML=tabImoveis(); el.scrollIntoView({block:'start',behavior:'smooth'}); } return; }
  const oi=e.target.closest('[data-ordimv]'); if(oi){ fImv.ord=proxOrd(fImv.ord,oi.dataset.ordimv); fImv.pg=0; const el=document.getElementById('imv-res'); if(el) el.innerHTML=tabImoveis(); return; }
  const ol=e.target.closest('[data-ordlead]'); if(ol){ fLeads.ord=proxOrd(fLeads.ord,ol.dataset.ordlead); fLeads.pg=0; const el=document.getElementById('leads-res'); if(el) el.innerHTML=resLeads(); return; }
  const pe=e.target.closest('[data-pessoa]'); if(pe){ e.preventDefault(); window.HUB.abrirPessoa(pe.dataset.pessoa); return; }
  const fl=e.target.closest('[data-ficha-loc]'); if(fl){ e.preventDefault(); window.HUB.irPara('fichas-locacao',null,fl.dataset.fichaLoc); return; }
  const iu=e.target.closest('[data-imovel-u]'); if(iu){ e.preventDefault(); window.HUB.abrirUnidade(iu.dataset.imovelU); return; }
  const gb=e.target.closest('[data-grupo]'); if(gb){ const gr=gb.dataset.grupo; const sub=abasDoGrupo(gr); if(!sub.length) return; aba=sub.some(a=>a[0]===ULT_GRUPO[gr])?ULT_GRUPO[gr]:sub[0][0]; fImv.foco=[]; fImv.focoTxt=''; try{localStorage.setItem('hubv.aba',aba)}catch(_){}; render(); return; }
  const sl=e.target.closest('[data-selo-mod]'); if(sl){ const m=MODS[sl.dataset.seloMod]; if(m&&ABAS.some(a=>a[0]===m.id)){ aba=m.id; try{localStorage.setItem('hubv.aba',aba)}catch(_){}; if(typeof m.foco==='function'){ try{ m.foco(sl.dataset.seloAlvo); }catch(_){} } render(); } return; }
  const fo=e.target.closest('[data-imvfoco]'); if(fo){ fImv.foco=[]; fImv.focoTxt=''; fImv.pg=0; render(); return; }
  const b=e.target.closest('[data-aba]'); if(b){aba=abaReal(b.dataset.aba); fImv.foco=[]; fImv.focoTxt=''; if(b.dataset.alerta){ Object.assign(fImv,{foco:[],alerta:b.dataset.alerta,fin:'todas',st:'todos',q:'',de:'',ate:'',per:'0',pg:0}); } destCob=b.dataset.cod||null; if(destCob) setTimeout(()=>{const l=document.getElementById('dev-'+destCob)||document.getElementById('cob-'+destCob); if(l) l.scrollIntoView({block:'center',behavior:'smooth'});},60); try{localStorage.setItem('hubv.aba',aba)}catch(_){}; render(); return;}
  const f=e.target.closest('[data-fpend]'); if(f){filtroPend=f.dataset.fpend; render(); return;}
  const fd=e.target.closest('[data-fdoc]'); if(fd){filtroDoc=fd.dataset.fdoc; render(); return;}
  const fi=e.target.closest('[data-fimv]'); if(fi){const [k,v]=fi.dataset.fimv.split(':'); fImv[k]=v; fImv.alerta=''; fImv.foco=[]; fImv.pg=0; render(); return;}
  const al=e.target.closest('[data-imvalerta]'); if(al){ fImv.alerta=al.dataset.imvalerta; fImv.foco=[]; if(fImv.alerta){ Object.assign(fImv,{fin:'todas',st:'todos',q:'',de:'',ate:'',per:'0'}); } fImv.pg=0; render(); return; }
  const per=e.target.closest('[data-imvper]'); if(per){ const v=per.dataset.imvper; const h=hojeISO(); fImv.ate=''; fImv.de=v==='0'?'':v==='ano'?h.slice(0,4)+'-01-01':new Date(Date.now()-3*3600e3-Number(v)*864e5).toISOString().slice(0,10); fImv.per=v; fImv.alerta=''; fImv.foco=[]; fImv.pg=0; render(); return; }
  const ca=e.target.closest('[data-crmal]'); if(ca){ Object.assign(fCRM,{al:ca.dataset.crmal,cor:ca.dataset.crmcor||'',sel:ca.dataset.crmcor||'*',et:'',q:''}); aba='crm'; try{localStorage.setItem('hubv.aba',aba)}catch(_){}; render(); setTimeout(()=>{const l=document.getElementById('lista-crm'); if(l) l.scrollIntoView({block:'start'});},60); return; }
  const cm=e.target.closest('[data-crmmsg]'); if(cm){ copiaTexto(msgCobrar(cm.dataset.crmmsg),cm); return; }
  const lc=e.target.closest('[data-leadcor]'); if(lc){ Object.assign(fLeads,{cor:lc.dataset.leadcor,camp:'',mes:'',st:'',q:'',pg:0}); aba='leads'; try{localStorage.setItem('hubv.aba',aba)}catch(_){}; render(); setTimeout(()=>{const l=document.getElementById('lista-leads'); if(l) l.scrollIntoView({block:'start'});},60); return; }
  const lp=e.target.closest('[data-leadpg]'); if(lp){ if(lp.disabled) return; fLeads.pg=Math.max(0,fLeads.pg+Number(lp.dataset.leadpg)); const el=document.getElementById('leads-tab')||document.getElementById('leads-res'); if(el){ el.innerHTML=tabLeads(); el.scrollIntoView({block:'start'}); } return; }
  const pp=e.target.closest('[data-imvpor]'); if(pp){ fImv.por=Number(pp.dataset.imvpor)||100; fImv.pg=0; try{ localStorage.setItem('hub_imv_por',String(fImv.por)); }catch(_){} const el=document.getElementById('imv-res'); if(el){ el.innerHTML=tabImoveis(); if(pp.dataset.lugar==='baixo') el.scrollIntoView({block:'start'}); } return; }
  const pg=e.target.closest('[data-imvpg]'); if(pg){ if(pg.disabled) return; fImv.pg=Math.max(0,fImv.pg+Number(pg.dataset.imvpg)); const el=document.getElementById('imv-res'); if(el){ el.innerHTML=tabImoveis(); if(pg.dataset.lugar==='baixo') el.scrollIntoView({block:'start'}); } return;}
  const d=e.target.closest('[data-disp]'); if(d){alterna(d.dataset.disp,d.dataset.para); return;}
  const fc=e.target.closest('[data-fconst]'); if(fc){fConst=fc.dataset.fconst; render(); return;}
  const ins=e.target.closest('[data-instalar]'); if(ins){instalarId=ins.dataset.instalar; render(); setTimeout(()=>{const t=document.getElementById('briefing-txt'); if(t) t.focus();},30); return;}
  const cb=e.target.closest('[data-copiar-briefing]'); if(cb){ const x=(S.construcoes||{})[cb.dataset.copiarBriefing]; if(x){ copiaTexto(briefingComNome(x),cb); marcaBriefing(cb.dataset.copiarBriefing); } return; }
  const fm=e.target.closest('[data-fechar-modal]'); if(fm&&(e.target===fm||e.target.matches('button'))){instalarId=''; render(); return;}
});

document.addEventListener('input',e=>{ if(e.target.id&&e.target.id.startsWith('cf-')){ fCRM[e.target.id.slice(3)]=e.target.value; const el=document.getElementById('crm-res'); if(el) el.innerHTML=resCRM(); return; }
  if(e.target.id&&e.target.id.startsWith('lf-')){ fLeads[e.target.id.slice(3)]=e.target.value; fLeads.pg=0; const el=document.getElementById('leads-res'); if(el) el.innerHTML=resLeads(); return; }
  if(e.target.id==='imv-de'||e.target.id==='imv-ate'){ fImv[e.target.id.slice(4)]=e.target.value; fImv.pg=0; document.querySelectorAll('[data-imvper]').forEach(b=>b.setAttribute('aria-pressed','false')); const el=document.getElementById('imv-res'); if(el) el.innerHTML=tabImoveis(); return; }
  if(e.target.id&&e.target.id.startsWith('imvc-')){ carEvento(e,'imvc',fImv.c); fImv.pg=0; const el=document.getElementById('imv-res'); if(el) el.innerHTML=tabImoveis(); return; }
  if(e.target.id==='imv-q'){ fImv.q=e.target.value; fImv.pg=0; if(fImv.foco.length){ fImv.foco=[]; fImv.focoTxt=''; render(); return; } const el=document.getElementById('imv-res'); if(el) el.innerHTML=tabImoveis(); } });

/* ---------- abrir pasta (mesmo padrão do HUB de petições) ---------- */
function botaoPasta(cam){ if(!cam) return ''; return `<a class="btn pasta" href="abrirpasta:${encodeURIComponent(cam)}" target="_blank" rel="noopener" data-abrir-pasta="${esc(cam)}" title="Abre a pasta no Explorador e copia o caminho">Abrir pasta</a>`; }
function copiaTexto(txt,botao){ const antes=botao.textContent; const feito=()=>{botao.textContent='Copiado'; setTimeout(()=>{botao.textContent=antes;},1500);};
  const manual=()=>{const ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy'); feito();}catch(e){botao.textContent='Selecione à mão';} document.body.removeChild(ta);};
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(feito,manual); else manual(); }
let timerPasta=null;
/* ---------- botão do mapa no fim de todo endereço (19/10/2026, pedido do Cleiton) ----------
   O endereço vem do módulo link-mapa (window.HUB_LINKMAPA: Imobibrasil + CEP + correções do HUB + empreendimento);
   sem o módulo carregado, o link usa o próprio texto. Módulos usam HUB.mapa(tipo, ref, texto, extra). */
function btnMapa(url,tit){ return url?`<a class="lk mapa" href="${escUrl(url)}" target="_blank" rel="noopener" title="${esc(tit||'Abrir no Google Maps')}" aria-label="Abrir no Google Maps">📍</a>`:''; }
function mapaDe(tipo,ref,txt,extra){ const L=window.HUB_LINKMAPA; let r=null;
  try{ if(L) r=tipo==='imovel'?L.imovel(ref):tipo==='empreendimento'?L.empreendimento(ref):tipo==='objeto'?L.deObjeto(txt):L.deTexto(txt,extra||{}); }catch(e){ r=null; }
  if(r&&r.url) return btnMapa(r.url,'Abrir no Google Maps: '+r.consulta+(r.qual&&r.qual!=='completo'?' (endereço incompleto)':''));
  const t0=[].concat(txt||[]).filter(Boolean)[0];
  if(!L&&t0&&tipo!=='objeto') return btnMapa('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(t0+', Florianópolis - SC'));
  return ''; }
function mapaLocacao(c){ if(!c) return ''; const al=c.alude||{}, pl=c.planilha||{};
  return mapaDe('texto',null,al.endereco||pl.endereco||campo(c,'endereco'),{bairro:campo(c,'bairro'),textos:[pl.endereco,al.endereco]}); }
function mapaVenda(v){ const g=driveDaVenda(v); return mapaDe('objeto',null,[v.objeto,g&&g.nome]); }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-abrir-pasta]'); if(!b) return;
  copiaTexto(b.getAttribute('data-abrir-pasta'),b);
  let a=document.getElementById('aviso-pasta'); if(!a){a=document.createElement('div'); a.id='aviso-pasta'; a.setAttribute('role','status'); document.body.appendChild(a);}
  a.innerHTML='Caminho copiado. Se a pasta não abriu: <b>Win+R</b> → <b>Ctrl+V</b> → <b>Enter</b>'; a.classList.add('visivel'); clearTimeout(timerPasta); timerPasta=setTimeout(()=>a.classList.remove('visivel'),5000); });
/* ---------- botão "Drive" ao lado de todo "Abrir pasta" (26/10/2026, pedido do Cleiton) ----------
   A Área de trabalho do PC é sincronizada com o Google Drive (conta cleitonpazds). A coleção drive_pastas guarda o índice
   caminho do Windows → id da pasta no Drive (doc `indice`, lista `itens` de {caminho, id, nome}; ROTINA, passo 7e). Com o id, o botão abre a própria pasta no Drive (no celular,
   no app do Drive); sem o id, abre a busca do Drive pelo nome da pasta (botão "Drive 🔎").
   Vale para o núcleo e para todos os módulos sem mexer neles: depois de cada desenho, todo link abrirpasta: ganha o vizinho. */
const normCam=c=>String(c||'').normalize('NFC').replace(/\//g,'\\').replace(/\\+$/,'').replace(/\s+/g,' ').trim().toLowerCase();
let IDX_DRIVE=null, IDX_DRIVE_SRC=null;
function idxDrive(){ const src=S.drive_pastas||{}; if(IDX_DRIVE&&IDX_DRIVE_SRC===src) return IDX_DRIVE; const m={};
  for(const k in src){ const d=src[k]||{}; (Array.isArray(d.itens)?d.itens:[d]).forEach(x=>{ if(x&&x.caminho&&x.id) m[normCam(x.caminho)]=x.id; }); } IDX_DRIVE=m; IDX_DRIVE_SRC=src; return m; }
function linkDrive(cam){ if(!cam) return null; const id=idxDrive()[normCam(cam)];
  if(id) return {url:'https://drive.google.com/drive/folders/'+encodeURIComponent(id), exato:true};
  const nome=String(cam).split(/[\\/]/).filter(Boolean).pop()||''; if(!nome) return null;
  return {url:'https://drive.google.com/drive/search?q='+encodeURIComponent('type:folder "'+nome+'"'), exato:false}; }
function camDoLink(a){ const d=a.getAttribute('data-abrir-pasta'); if(d) return d; try{ return decodeURIComponent(a.getAttribute('href').slice('abrirpasta:'.length)); }catch(e){ return ''; } }
function poeDrive(){ document.querySelectorAll('a[href^="abrirpasta:"]').forEach(a=>{ const cam=camDoLink(a), L=linkDrive(cam); let b=a.nextElementSibling;
    if(!(b&&b.hasAttribute('data-drive-de'))){ if(!L) return; b=document.createElement('a'); b.setAttribute('data-drive-de',''); b.target='_blank'; b.rel='noopener'; a.insertAdjacentElement('afterend',b); }
    if(!L){ b.remove(); return; }
    const cls=(a.className||'btn')+' drive', txt=L.exato?'Drive':'Drive 🔎', tit=L.exato?'Abre a mesma pasta no Google Drive':'Procura a pasta no Google Drive pelo nome (endereço exato ainda fora do índice)';
    if(b.getAttribute('href')!==L.url) b.setAttribute('href',L.url); if(b.className!==cls) b.className=cls; if(b.title!==tit) b.title=tit; if(b.textContent!==txt) b.textContent=txt; }); }
let rafDrive=0; const pedeDrive=()=>{ if(rafDrive) return; rafDrive=requestAnimationFrame(()=>{ rafDrive=0; poeDrive(); }); };
new MutationObserver(pedeDrive).observe(document.body,{childList:true,subtree:true}); pedeDrive();
const normTxt=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ');
const PARADA=new Set('e x de da do dos das a o outros outra outro contrato pcv cessao direitos com alienacao financ deivis ltda participacoes imoveis ilha sc'.split(' '));
const tokens=t=>normTxt(t).split(/\s+/).filter(w=>w.length>2&&!PARADA.has(w));
function pastaDoCodigo(cod){ const d=lista('documentos').find(x=>x.cod===cod&&x.caminho); return d?d.caminho:null; }
function pastaDaVenda(v){ const pv=(params().pastas_vendas||{})[v._id]; if(pv&&S.documentos&&S.documentos[pv]&&S.documentos[pv].caminho) return S.documentos[pv].caminho; const tv=tokens(v.vendedor), tc=tokens(v.comprador); if(!tv.length||!tc.length) return null; let best=null,bs=0;
  for(const d of lista('documentos')){ if(d.area!=='venda'||!d.caminho) continue; const dn=new Set(normTxt(d.nome).split(/\s+/));
    const sv=new Set(tv.filter(w=>dn.has(w))).size, sc=new Set(tc.filter(w=>dn.has(w))).size; if(sv<1||sc<1) continue; if(sv+sc>bs){bs=sv+sc; best=d;} }
  return best?best.caminho:null; }

/* ---------- painéis ---------- */
const vazio=t=>`<div class="vazio">${t}</div>`;
const TIPOS={site_endereco:'Sem endereço completo',crm_cobranca:'CRM — cobrar retorno',crm_cadastro:'CRM — cadastro',boleto_atraso:'Boleto em atraso',vencimento_contrato:'Contrato vencendo',reajuste:'Reajuste',divergencia:'Divergência Alude × contrato',garantia_seguro:'Garantia / seguro',a_receber_antigo:'Pagamento pendente ao Jurídico',coleta_falhou:'Coleta falhou',contrato_sem_cadastro:'Contrato sem cadastro',pasta_parada:'Pasta parada',site_anuncio_parado:'Anúncio parado',site_cadastro:'Cadastro do site',site_locado_anunciado:'Locado ainda anunciado',site_preco:'Preço anúncio × contrato',drive_negocio:'Negócio novo no Drive',drive_certidao:'Certidão positiva (Drive)'};
/* 02/11/2026: rótulos que apareciam crus (Pendências, Visão geral, Imóveis); tipo novo sem rótulo vira texto legível */
Object.assign(TIPOS,{vistorias_assinatura:'Vistoria a assinar',vistorias_agenda:'Vistoria a agendar',cc_formulario:'Formulário do cliente',site_publicado_fora_do_site:'Publicado fora do site',mapa_pontos_duvidosos:'Pontos duvidosos no mapa'});
const rotTipo=t=>TIPOS[t]||(s=>s.charAt(0).toUpperCase()+s.slice(1))(String(t||'').replace(/_/g,' '));
// área de cada pendência (26/10/2026): pela aba que ela abre; sem aba, pelo tipo (crm_, site_, portais_… = CRM). O resto é da gestão (ERP).
const TIPO_CRM=/^(crm_|site_|portais_|agenciamento_|mapa_|link_mapa_|empreendimentos_|cc_)/;
function areaPend(x){ const a=x.aba?abaPend(x):''; if(a&&ABAS.some(z=>z[0]===a)) return grupoDe(a)==='crm'?'crm':'erp'; return TIPO_CRM.test(String(x.tipo||''))?'crm':'erp'; }
const ORD_PRIO={alta:0,media:1,baixa:2};
const ordPend=(a,b)=>(ORD_PRIO[a.prioridade]??3)-(ORD_PRIO[b.prioridade]??3)||String(a.desde||'').localeCompare(String(b.desde||''));
document.addEventListener('change',e=>{ const sel=e.target.closest&&e.target.closest('[data-fpend-sel]'); if(sel){ filtroPend=sel.value; render(); } });
function pPendencias(){
  const todas=lista('pendencias');
  let L=todas.filter(x=>filtroPend==='abertas'?x.status==='aberta':filtroPend==='dispensadas'?x.status==='dispensada':filtroPend.startsWith('area:')?x.status==='aberta'&&areaPend(x)===filtroPend.slice(5):x.status==='aberta'&&x.tipo===filtroPend);
  L.sort(ordPend);
  const abertas=todas.filter(x=>x.status==='aberta');
  const tiposPres=[...new Set(abertas.map(x=>x.tipo))];
  const nArea=a=>abertas.filter(x=>areaPend(x)===a).length;
  /* 02/11/2026, pedido do Cleiton: um seletor único no lugar da fileira de botões, cada opção com a contagem */
  const nDisp=todas.filter(x=>x.status==='dispensada').length;
  const op=(v,t)=>`<option value="${esc(v)}"${filtroPend===v?' selected':''}>${esc(t)}</option>`;
  const porTipo=tiposPres.map(t=>[t,abertas.filter(x=>x.tipo===t).length]).sort((a,b)=>b[1]-a[1]||rotTipo(a[0]).localeCompare(rotTipo(b[0]),'pt-BR'));
  const fil=`<div class="filtros fpend-sel"><label for="fpend-sel">Mostrar</label><select id="fpend-sel" data-fpend-sel>${op('abertas',`Todas as abertas (${abertas.length})`)}${op('area:crm',`CRM (${nArea('crm')})`)}${op('area:erp',`Gestão (${nArea('erp')})`)}${porTipo.length?`<optgroup label="Por tipo">${porTipo.map(([t,n])=>op(t,`${rotTipo(t)} (${n})`)).join('')}</optgroup>`:''}${op('dispensadas',`Dispensadas (${nDisp})`)}</select></div>`;
  return `<h2>Pendências e alertas</h2><p class="nota">Lista única, gerada a cada coleta. Vermelho = alta, âmbar = média, verde-azulado = baixa. "Dispensar" tira o item da lista e o coletor não o reabre. "CRM" e "Gestão" separam as pendências das duas partes do HUB.</p>${fil}${L.length?L.map(itemPend).join(''):vazio(carregado.pendencias?'Nada pendente neste filtro.':'Aguardando a primeira coleta.')}`;
}
function itemPend(x){ return `<div class="pend ${esc(x.prioridade)} ${x.status==='dispensada'?'dispensada':''}"><div class="faixa"></div><div class="corpo">
    <div class="tit">${esc(x.titulo)}</div><div class="det">${esc(x.detalhe||'')}</div>
    <div class="meta"><span class="pill">${esc(rotTipo(x.tipo))}</span>${x.cod?`<span class="cod">${esc(x.cod)}</span>`:''}${x.valor!=null?`<span>${brl(x.valor)}</span>`:''}${x.desde?`<span>desde ${dt(x.desde)}</span>`:''}${x.prazo?`<span>prazo ${dt(x.prazo)}</span>`:''}</div></div>
    <div class="acoes">${x.aba&&ABAS.some(a=>a[0]===abaPend(x))?`<button class="btn" data-aba="${esc(abaPend(x))}" style="margin-right:6px">Abrir ${esc(rotAba(abaPend(x)))}</button>`:''}${x.refs_crm&&x.refs_crm.length?`<button class="btn" data-crmal="${esc(x.filtro_crm||'')}" style="margin-right:6px">Ver no CRM</button>`:''}${x.refs&&x.refs.length?`<button class="btn" data-aba="imoveis" data-alerta="${esc(x._id)}" style="margin-right:6px">Ver na aba Imóveis</button>`:''}${x.tipo==='boleto_atraso'?`<button class="btn" data-aba="cobranca" data-cod="${esc(x.cod||'')}" style="margin-right:6px">Ver na Cobrança</button>`:''}${x.cod&&pastaDoCodigo(x.cod)?`<span style="margin-right:6px">${botaoPasta(pastaDoCodigo(x.cod))}</span>`:''}${x.drive?`<span style="margin-right:6px">${botaoDrive('https://drive.google.com/drive/folders/'+x.drive)}</span>`:''}${DB?(x.status==='dispensada'?`<button class="btn" data-disp="${esc(x._id)}" data-para="aberta">Reabrir</button>`:`<button class="btn" data-disp="${esc(x._id)}" data-para="dispensada">Dispensar</button>`):''}</div></div>`; }
async function alterna(id,para){
  if(!DB) return;
  try{ await DB.doc('pendencias/'+id).update(para==='dispensada'?{status:'dispensada',dispensado_em:new Date().toISOString()}:{status:'aberta',dispensado_em:null}); }
  catch(e){ const el=document.createElement('div'); el.className='aviso'; el.textContent='Não consegui gravar: '+(e&&e.code||'erro')+'. Tente de novo.'; document.getElementById('conteudo').prepend(el); }
}
function sitPill(s){const m={em_dia:['Em dia','ok'],atrasada:['Atrasada','bad'],aberta:['Em aberto','warn'],paga:['Paga','ok'],a_emitir:['A emitir',''],cancelada:['Cancelada','']}; const x=m[s]||[s||'—',''];return `<span class="pill ${x[1]}">${esc(x[0])}</span>`}
function pCarteira(){
  const cs=contratos(); if(!cs.length) return `<h2>Carteira de locação</h2>`+vazio('Aguardando a primeira coleta do Alude e da planilha.');
  const hoje=hojeISO();
  const linha=c=>{
    const ter=campo(c,'termino'); const meses=ter?Math.round(dias(hoje,ter)/30.4):null;
    const g=Object.assign({}, campo(c,'garantia')||{tipo:campo(c,'garantia_txt')}); const rj=campo(c,'reajuste')||{}; const cob=(c.alude&&c.alude.cobranca)||{};
    const tx=campo(c,'taxa_adm'); const corr=campo(c,'corretores')||{};
    const fontes=['alude','planilha','pasta'].filter(f=>c[f]).map(f=>({alude:'Alude',planilha:'Planilha',pasta:'Pasta'}[f])).join(' · ');
    const [imv,nLoc]=String(c._id).split('-');
    // 26/10/2026: "A1" abre o cadastro do imóvel; "/1" abre a ficha da locação (Locação › Fichas), quando o módulo e a ficha existem
    const temFicha=ABAS.some(a=>a[0]==='fichas-locacao')&&(S['fichas-locacao_dados']||{})[c._id];
    const locTxt=`<span style="color:var(--brass)">/${esc(nLoc||1)}</span>`;
    const locBtn=temFicha?`<button class="lk imv cod" data-ficha-loc="${esc(c._id)}" title="Abrir a ficha da locação ${esc(imv)}/${esc(nLoc||1)} (seguro incêndio, encargos, cobrança e repasse)">${locTxt}</button>`:locTxt;
    return `<tr id="car-${esc(c._id)}"${focoLinha==='car-'+c._id?' class="foco"':''}><td>${(u=>u?`<button class="lk imv cod" data-imovel-u="${esc(u)}" title="Abrir o cadastro do imóvel ${esc(imv)}">${esc(imv)}</button>${locBtn}`:`<span class="cod" title="Imóvel ${esc(imv)}">${esc(imv)}</span>${locBtn}`)(uidCod(c._id))}<span class="s">${ativo(c)?'ativo':'encerrado'}</span>${botaoPasta(pastaDoCodigo(c._id))}</td>
      <td><span data-sens>${imvLk(campo(c,'endereco')||'—',{fonte:'contrato',cod:c._id})}</span>${mapaLocacao(c)}<span class="s">${esc(campo(c,'bairro')||'')}${campo(c,'tipo')?' · '+esc(campo(c,'tipo')):''}</span></td>
      <td>${pes(campo(c,'locador'),{fonte:'contrato',cod:c._id,papel:'locador'})||'—'}<span class="s">${pes(campo(c,'locatario'),{fonte:'contrato',cod:c._id,papel:'locatario'})}</span></td>
      <td>${dt(campo(c,'inicio'))}<span class="s">${indet(c)?'prazo indeterminado (veio locado)':`até ${dt(ter)}${meses!=null&&meses>=0?` · ${meses} m`:''}`}</span></td>
      <td class="n">${brl(campo(c,'aluguel_contrato')??campo(c,'aluguel'))}<span class="s">adm. ${pct(tx)}</span></td>
      <td>${esc(g.tipo||'—')}<span class="s">${g.valor?brl(g.valor):''}</span></td>
      <td>${dt(rj.proximo)}<span class="s">${esc(({igpm:'IGP-M',ipca:'IPCA',ivar:'IVAR',incc:'INCC',fixed:'percentual fixo'})[rj.indice]||(rj.indice||'').toUpperCase())}</span></td>
      <td>${c.alude?sitPill(cob.situacao):'<span class="pill">fora do Alude</span>'}</td>
      <td>${[corr.agenciador,corr.fechador].filter(Boolean).map(pesCor).join(' / ')||'—'}</td>
      <td><span class="s">${esc(fontes)}</span></td></tr>`};
  // locações encerradas num bloco recolhido (18/10/2026); pastas em 02 Pastas locações\02 Locações encerradas\(Anual | Temporada)
  const atv=cs.filter(ativo), enc=cs.filter(c=>!ativo(c));
  const cab=`<thead><tr><th>Imóvel/locação</th><th>Imóvel</th><th>Locador / locatário</th><th>Prazo</th><th class="n">Aluguel</th><th>Garantia</th><th>Reajuste</th><th>Cobrança</th><th>Corretores</th><th>Fontes</th></tr></thead>`;
  const linhas=atv.map(linha).join('');
  const blocoEnc=enc.length?`<details class="card" style="margin-top:14px"><summary style="cursor:pointer;font-family:var(--display);text-transform:uppercase;letter-spacing:.14em;font-size:12px">Locações encerradas (${enc.length})</summary><p class="nota" style="margin:8px 0">Contratos que já terminaram. As pastas ficam em 02 Pastas locações › 02 Locações encerradas (Anual ou Temporada).</p><div class="tabela"><table class="car-cards">${cab}<tbody>${enc.map(linha).join('')}</tbody></table></div></details>`:'';
  return `<h2>Carteira de locação</h2><p class="nota">Código: <b>A1</b> é o imóvel (A = anual, T = temporada) e o número depois da barra é a locação daquele imóvel — <b>A1/1</b> = imóvel A1, 1ª locação; uma nova locação do mesmo imóvel será A1/2. Toque em <b>A1</b> para abrir o cadastro do imóvel e em <b>/1</b> para abrir a ficha da locação. Valores do contrato (planilha) têm preferência sobre os do Alude; a diferença vira pendência.</p>
  <div class="tabela"><table class="car-cards">${cab}<tbody>${linhas||'<tr><td colspan="10">Nenhuma locação ativa.</td></tr>'}</tbody></table></div>${blocoEnc}`;
}
// Emissão suspensa (02/11/2026, decisão do Cleiton): cobranças sem boleto + boletos suspensos do lote mais recente (boletos_lote), um por contrato, cada um com o atraso que causou a suspensão
function suspensoes(B){ assina('boletos_lote'); const L=S.boletos_lote||{}; const ult=Object.keys(L).filter(k=>/^\d{4}-\d{2}$/.test(k)).sort().pop(); const lote=ult?(L[ult]||{}):{};
  const doLote=[...(Array.isArray(lote.boletos)?lote.boletos:[]).filter(b=>b&&b.status==='suspenso'),...(Array.isArray(lote.suspensos)?lote.suspensos:[])].map(b=>b&&b.cod).filter(Boolean);
  const cods=[...new Set([...B.filter(b=>suspensa(b,B)).map(b=>b.cod),...doLote])].sort(ordCod);
  return cods.map(c=>{ const at=B.filter(x=>x.cod===c&&x.situacao==='atrasada').sort((a,b)=>(b.dias_atraso||0)-(a.dias_atraso||0))[0];
    return {cod:c,atraso:at?`${mesTxt(at.competencia)} em atraso há ${at.dias_atraso||0} d`:'sem atraso registrado no Alude'}; }); }
function suspensa(b,B){ return b.sem_boleto&&B.some(x=>x.cod===b.cod&&x.competencia<b.competencia&&x.situacao==='atrasada'&&!x.sem_boleto); }

/* ---------- Oportunidades: motor comum do HUB e dos painéis dos corretores (26/10/2026) ----------
   Decisões do Cleiton (26/10/2026): modo híbrido — o cruzamento perfil × imóveis roda na hora, sem custo; o botão "Pedir à IA"
   lê campanha, imóvel de interesse e histórico, sugere o perfil (o corretor confirma) e escolhe as ofertas com justificativa.
   Base de imóveis: anúncios ativos do site + empreendimentos + agenciamentos fora do site (inativos no Imobibrasil, com aviso
   "confirmar disponibilidade"). Ofertar = mensagem pronta + registro no histórico do lead; Descartar some da lista.
   Perfil usado = automático (campanha → empreendimento; imóvel de interesse) < sugerido pela IA < confirmado pelo corretor. */
const OP = (() => {
  // memória de cálculo (02/11/2026, Fatia C): o casamento perfil × imóveis normaliza os mesmos textos milhares de vezes; o resultado é o mesmo, só não se recalcula
  const memo = (f) => { const m = new Map(); return (s) => { const k = s == null ? '' : String(s); let r = m.get(k); if (r === undefined) { if (m.size > 50000) m.clear(); r = f(k); m.set(k, r); } return r; }; };
  const sem = memo((s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
  const limpa = memo((s) => sem(s).replace(/[^a-z0-9]+/g, ' ').trim());
  const num = (v) => { if (v == null || v === '') return null; const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) && n > 0 ? n : null; };
  const FAMILIA = { apartamento: 'apto', cobertura: 'apto', studio: 'apto', estudio: 'apto', loft: 'apto', garden: 'apto', duplex: 'apto', flat: 'apto', kitnet: 'apto',
    casa: 'casa', sobrado: 'casa', 'casa geminada': 'casa', geminada: 'casa', 'casa em condominio': 'casa', terreno: 'terreno', lote: 'terreno', comercial: 'comercial', sala: 'comercial', loja: 'comercial', galpao: 'comercial', pousada: 'comercial' };
  const familia = memo((t) => { const s = limpa(t); if (!s) return ''; if (FAMILIA[s]) return FAMILIA[s]; const k = Object.keys(FAMILIA).find((x) => s.includes(x)); return k ? FAMILIA[k] : s; });
  const TIPO_REF = { AP: 'Apartamento', CA: 'Casa', CO: 'Cobertura', LF: 'Loft', ST: 'Studio', TE: 'Terreno', GE: 'Casa Geminada', LJ: 'Comercial', SL: 'Comercial' };
  const tipoDeRef = (ref) => TIPO_REF[String(ref || '').slice(0, 2).toUpperCase()] || '';
  const finN = memo((f) => { const s = sem(f); return /temp/.test(s) ? 'Temporada' : /loc|alug/.test(s) ? 'Locação' : /vend|compr/.test(s) || s === 'v' ? 'Venda' : ''; });
  const bairros = (b) => (Array.isArray(b) ? b : String(b || '').split(/[,;/]| e (?=[A-Z])/)).map((x) => String(x).trim()).filter(Boolean);
  const mesmoBairro = (a, b) => { const x = limpa(a), y = limpa(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
  const dormDe = (txt) => { const ns = []; sem(txt).replace(/(\d)(?:\s*(?:e|a|,)\s*\d)*\s*(?:dorm|quarto|suite|qto)/g, (m, a) => { ns.push(+a); return m; }); return ns.length ? Math.min(...ns) : null; };
  const areaDe = (txt) => { const m = sem(txt).match(/(\d{2,4})\s*(?:a|–|-|até)\s*(\d{2,4})\s*m/); return m ? [+m[1], +m[2]] : null; };
  const vagasDe = (txt) => { const m = sem(txt).match(/(\d)\s*vaga/); return m ? +m[1] : null; };

  /* contexto: itens = [{id, ref, fin, tipo, bairro, cidade, end, valor, dorm, suites, vagas, area, cond, link, gmaps, lat, lng, cor, atu, origem:'site'|'fora'|'emp', emp, nome, tipologias, status, entrega}] */
  function contexto(vitrine, fora, emps) {
    const empDe = new Map(), porId = new Map(), E = [];
    (emps || []).forEach((e) => { (e.anuncios || []).forEach((a) => empDe.set(typeof a === 'string' ? a : a.id, e.id)); E.push(e); });
    const itens = [];
    (vitrine || []).forEach((v) => itens.push(Object.assign({}, v, { origem: 'site', emp: empDe.get(v.id) || null })));
    const noSite = new Set(itens.map((x) => x.id));
    (fora || []).forEach((v) => { if (!noSite.has(v.id)) itens.push(Object.assign({}, v, { origem: 'fora', emp: empDe.get(v.id) || null })); });
    E.forEach((e) => { if (!['lancamento', 'previsto'].includes(e.status)) return;
      itens.push({ id: 'E:' + e.id, ref: e.nome, nome: e.nome, fin: 'Venda', tipo: 'Empreendimento', bairro: e.bairro, cidade: e.cidade, end: e.endereco, tipologias: e.tipologias, status: e.status, entrega: e.entrega,
        link: e.site || e.link || null, origem: 'emp', emp: e.id, dorm: null, valor: null }); });
    itens.forEach((x) => porId.set(x.id, x));
    const empPorId = new Map(E.map((e) => [e.id, e]));
    const empDaCampanha0 = (camp) => { const c = limpa(camp); if (!c) return null;
      for (const e of E) { if ((e.campanhas || []).some((k) => limpa(k.campanha || k) === c)) return e; }
      for (const e of E) { const n = limpa(e.nome).split(' ').filter((w) => w.length >= 4 && !['residencial', 'jurere', 'beach', 'home', 'boutique', 'condominio', 'edificio'].includes(w));
        if (n.some((w) => c.split(' ').includes(w))) return e; }
      return null; };
    // velocidade (02/11/2026, Fatia F3): empreendimento da campanha calculado uma vez por campanha; refs dos itens indexadas
    const campM = new Map(); const empDaCampanha = (camp) => { const k = camp == null ? '' : String(camp); if (campM.has(k)) return campM.get(k); const r = empDaCampanha0(camp); campM.set(k, r); return r; };
    const porRef = new Map(); itens.forEach((x) => { if (x.ref) { const k = String(x.ref).toUpperCase(); if (!porRef.has(k)) porRef.set(k, []); porRef.get(k).push(x.id); } });
    return { itens, porId, empPorId, empDaCampanha, porRef };
  }

  const REFM = new WeakMap(), DER = new WeakMap(), CASM = new WeakMap();
  // campos do item já normalizados (finalidade, família do tipo, bairro), calculados uma vez por item
  const der = (it) => { let d = DER.get(it); if (!d) { d = { fn: it.fin ? finN(it.fin) : '', fa: familia(it.tipo), lb: limpa(it.bairro) }; DER.set(it, d); } return d; };
  /* lead normalizado: {nome, campanha, imovel_interesse, perfil, perfil_sugerido, historico, etapa} */
  function perfilAuto(lead, ctx) {
    const p = { fontes: [] };
    const ref = String(lead.imovel_interesse || '').toUpperCase().split(/[,\s]+/).filter(Boolean)[0];
    if (ref) { let rm = REFM.get(ctx); if (!rm) { rm = new Map(); REFM.set(ctx, rm); }
      let it = rm.get(ref); if (it === undefined) { it = ctx.itens.find((x) => String(x.ref || '').toUpperCase() === ref || String(x.id || '').toUpperCase().startsWith(ref + '_')) || null; rm.set(ref, it); }
      if (it) { p.fin = it.fin; p.tipo = it.tipo !== 'Empreendimento' ? it.tipo : ''; p.bairros = [it.bairro].filter(Boolean); if (it.valor) { p.vmin = Math.round(it.valor * 0.75); p.vmax = Math.round(it.valor * 1.25); }
        if (it.dorm) p.dorm = it.dorm; if (it.emp) p.emp = it.emp; p.fontes.push('imóvel de interesse ' + (it.ref || ref)); } }
    const e = ctx.empDaCampanha(lead.campanha);
    if (e) { p.emp = p.emp || e.id; if (!p.bairros || !p.bairros.length) p.bairros = [e.bairro].filter(Boolean); p.fin = p.fin || 'Venda';
      const an = (e.anuncios || []).map((a) => (typeof a === 'string' ? ctx.porId.get(a) : a)).filter(Boolean);
      const vals = an.filter((a) => finN(a.fin) !== 'Locação' && finN(a.fin) !== 'Temporada').map((a) => +a.valor).filter((v) => v >= 50000).sort((a, b) => a - b);
      const q = (f) => vals[Math.min(vals.length - 1, Math.max(0, Math.round((vals.length - 1) * f)))];
      if (!p.vmax && vals.length) { p.vmin = Math.round(q(0.25) * 0.8); p.vmax = Math.round(q(0.75) * 1.25); }
      const ar = areaDe(e.tipologias); if (ar) { p.amin = ar[0]; p.amax = ar[1]; } else { const m1 = sem(e.tipologias).match(/~?\s*(\d{2,4})\s*m(?:2|²|\b)/); if (m1) { p.amin = Math.round(+m1[1] * 0.85); p.amax = Math.round(+m1[1] * 1.15); } }
      if (!p.tipo && e.tipologias) { const tt = sem(e.tipologias); const ach = [['casa', 'Casa'], ['apart', 'Apartamento'], ['studio', 'Studio'], ['loft', 'Loft'], ['terreno', 'Terreno'], ['lote', 'Terreno']].filter(([k]) => tt.includes(k)); if (ach.length === 1) p.tipo = ach[0][1]; }
      if (!p.tipo) { const ts = [...new Set(an.map((a) => a.tipo || tipoDeRef(a.ref)).filter(Boolean))]; if (ts.length === 1) p.tipo = ts[0]; }
      if (!p.dorm) p.dorm = dormDe(e.tipologias);
      p.fontes.push('campanha ' + (lead.campanha || '') + ' → ' + e.nome); }
    return p.fontes.length ? p : null;
  }
  function deFormulario(f) { if (!f) return null; const o = {};
    const fin = finN(f.finalidade || f.fin); if (fin) o.fin = fin; if (f.tipo) o.tipo = f.tipo; const b = bairros(f.bairros); if (b.length) o.bairros = b;
    const vmin = num(f.vmin), vmax = num(f.vmax); if (vmin) o.vmin = vmin; if (vmax) o.vmax = vmax;
    const d = num(f.dorm) || dormDe(f.obs), g = num(f.vagas) || vagasDe(f.obs); if (d) o.dorm = d; if (g) o.vagas = g; if (f.obs) o.obs = f.obs;
    return Object.keys(o).length ? o : null; }
  // perfil efetivo: automático < sugerido pela IA < confirmado (campo a campo)
  function perfilDo(lead, ctx) {
    const auto = perfilAuto(lead, ctx), ia = deFormulario(lead.perfil_sugerido), conf = deFormulario(lead.perfil);
    if (!auto && !ia && !conf) return null;
    const p = Object.assign({}, auto || {}, ia || {}, conf || {});
    p.origem = conf ? 'confirmado' : ia ? 'ia' : 'auto'; p.fontes = (auto && auto.fontes) || []; p.emp = (auto && auto.emp) || null;
    return p;
  }
  function descrevePerfil(p, semFin) { if (!p) return ''; const brl = (v) => v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : 'R$ ' + Math.round(v / 1e3) + ' mil';
    return [semFin ? '' : p.fin, p.tipo, (p.bairros || []).join(', '), p.vmin && p.vmax ? brl(p.vmin) + ' a ' + brl(p.vmax) : p.vmax ? 'até ' + brl(p.vmax) : p.vmin ? 'a partir de ' + brl(p.vmin) : '', p.dorm ? p.dorm + '+ dorm.' : '', p.vagas ? p.vagas + '+ vagas' : ''].filter(Boolean).join(' · '); }

  /* casa o perfil com a base; devolve [{it, pts, motivos, alerta}] em ordem. opt: {max, excluir:Set(ids), relaxa} */
  function casar(p, ctx, opt) {
    opt = opt || {}; if (!p) return [];
    const excl0 = opt.excluir || new Set();
    // mesmo perfil, mesmas exclusões e mesmas opções no mesmo contexto = mesmo resultado (leads da mesma campanha)
    let cm = CASM.get(ctx); if (!cm) { cm = new Map(); CASM.set(ctx, cm); } if (cm.size > 5000) cm.clear();
    const ck = JSON.stringify([p, [...excl0].sort(), opt.max || 8, +opt.folga || 0, opt.relaxa]);
    const hit = cm.get(ck); if (hit) return hit.map((x) => Object.assign({}, x, { motivos: x.motivos.slice() }));
    const res = casar0(p, ctx, opt); cm.set(ck, res); return res.map((x) => Object.assign({}, x, { motivos: x.motivos.slice() }));
  }
  function casar0(p, ctx, opt) {
    const fam = familia(p.tipo), B = p.bairros || [], LB = B.map((b) => limpa(b)), excl = opt.excluir || new Set(), out = [];
    const passo = (relaxaBairro) => { const r = [];
      for (const it of ctx.itens) {
        if (excl.has(it.id)) continue; const m = []; let pts = 0; const D = der(it);
        if (p.fin && it.fin && D.fn !== p.fin) continue;
        if (p.fin) m.push(p.fin);
        if (it.origem === 'emp') { if (p.fin && p.fin !== 'Venda') continue; }
        else if (fam) { const f2 = D.fa; if (f2 && f2 !== fam) continue; if (f2 === fam) { pts += 2; m.push(it.tipo); } }
        const mesmoEmp = p.emp && it.emp === p.emp;
        const y = D.lb; const bOk = B.length ? !!y && LB.some((x) => !!x && (x === y || x.includes(y) || y.includes(x))) : false;
        if (B.length && !bOk && !mesmoEmp && !relaxaBairro) continue;
        if (bOk) { pts += 3; m.push(it.bairro); } else if (B.length && !mesmoEmp) { pts -= 1; m.push('outro bairro: ' + (it.bairro || '?')); }
        if (mesmoEmp) { pts += 2; m.push('mesmo empreendimento'); }
        const v = +it.valor || null;
        const fo = +opt.folga || 0; // folga ±20% nos captados (decisão do Cleiton, 01/11/2026); sem folga, regra antiga
        if (v) { if (p.vmax && v > p.vmax * (fo ? 1 + fo : 1.1)) continue; if (p.vmin && v < p.vmin * (fo ? 1 - fo : 0.7)) continue; if (p.vmax || p.vmin) { pts += 2; m.push('dentro do valor'); } }
        if (p.dorm) { if (it.dorm != null && it.dorm < p.dorm) continue; if (it.dorm >= p.dorm) { pts += 1; m.push(it.dorm + ' dorm.'); } else if (it.origem === 'emp' && dormDe(it.tipologias) >= p.dorm) { pts += 1; m.push('tipologia com ' + p.dorm + '+ dorm.'); } }
        if (p.vagas) { if (it.vagas != null && it.vagas < p.vagas) continue; if (it.vagas >= p.vagas) { pts += 1; m.push(it.vagas + ' vagas'); } }
        if (p.amin && p.amax && +it.area) { if (it.area >= p.amin * (fo ? 1 - fo : 0.8) && it.area <= p.amax * (fo ? 1 + fo : 1.25)) { pts += 2; m.push(Math.round(it.area) + ' m²'); } else if (fo) continue; else pts -= 1; }
        let alerta = '';
        if (it.origem === 'site') pts += 1;
        else if (it.origem === 'fora') { pts -= 3; alerta = 'fora do site: confirmar disponibilidade com o agenciador'; }
        else alerta = (it.status === 'previsto' ? 'previsto' : 'lançamento') + (it.entrega ? ', entrega ' + it.entrega : '') + ': confirmar tabela com a construtora';
        r.push({ it, pts, motivos: [...new Set(m)], alerta });
      }
      return r; };
    let r = passo(false); if (r.length < 3 && B.length && opt.relaxa !== false) { const ja = new Set(r.map((x) => x.it.id)); passo(true).forEach((x) => { if (!ja.has(x.it.id)) r.push(x); }); }
    const alvo = p.vmin && p.vmax ? (p.vmin + p.vmax) / 2 : p.vmax || p.vmin || null;
    r.sort((a, b) => b.pts - a.pts || (alvo ? Math.abs((+a.it.valor || alvo * 3) - alvo) - Math.abs((+b.it.valor || alvo * 3) - alvo) : 0) || String(b.it.atu || '').localeCompare(String(a.it.atu || '')));
    return r.slice(0, opt.max || 8);
  }

  const compacto = (it) => { const o = { id: it.id, ref: it.ref, origem: it.origem, fin: it.fin, tipo: it.tipo, bairro: it.bairro };
    ['valor', 'dorm', 'suites', 'vagas', 'area', 'tipologias', 'entrega', 'status', 'nome'].forEach((k) => { if (it[k] != null && it[k] !== '') o[k] = it[k]; });
    if (it.comodos) o.itens = [].concat(it.comodos || [], it.cond_itens || []).slice(0, 8); return o; };
  function promptIA(lead, ctx, hoje) {
    const p = perfilDo(lead, ctx) || {};
    const c1 = casar(p, ctx, { max: 25 }), c2 = casar(Object.assign({}, p, { bairros: [] }), ctx, { max: 25 }), c3 = ctx.itens.filter((x) => x.origem === 'emp').slice(0, 20).map((it) => ({ it }));
    const vis = new Set(), cands = [];
    [...c1, ...c2, ...c3].forEach((x) => { if (!vis.has(x.it.id) && cands.length < 50) { vis.add(x.it.id); cands.push(compacto(x.it)); } });
    if (cands.length < 15) ctx.itens.filter((x) => x.origem === 'site').sort((a, b) => String(b.atu || '').localeCompare(String(a.atu || ''))).forEach((it) => { if (!vis.has(it.id) && cands.length < 40) { vis.add(it.id); cands.push(compacto(it)); } });
    const hist = (lead.historico || []).slice(-12).map((h) => `${String(h.em || '').slice(0, 10)} ${h.tipo || ''}: ${h.texto || ''}`);
    const e = ctx.empDaCampanha(lead.campanha);
    return `Você é o assistente comercial da Vivere Imóveis Selecionados (Florianópolis/SC). Hoje é ${hoje}.
Tarefa: descobrir o perfil de compra ou locação deste cliente e escolher, SÓ entre os imóveis da lista, até 6 que façam sentido oferecer agora.
Regras:
- Use o que o cliente disse no histórico, a campanha pela qual chegou e o imóvel de interesse. Não invente.
- Campanha de um empreendimento indica a região, o padrão e a faixa de preço que atraíram o cliente.
- "origem": "site" = anúncio ativo; "fora" = agenciamento fora do site (avise para confirmar disponibilidade); "emp" = empreendimento em lançamento (sem preço na lista).
- Prefira imóveis no mesmo bairro ou em bairros vizinhos de perfil parecido, na faixa de valor e com o número de dormitórios pedido.
- Motivo de cada oferta: 1 frase curta, em português, dizendo por que combina (sem repetir o endereço).
- Perfil: finalidade (Venda, Locação ou Temporada), tipo, bairros separados por vírgula, valores em reais como números inteiros, dormitórios e vagas mínimos; null no que não der para deduzir.
Responda só com JSON neste formato:
{"perfil":{"finalidade":null,"tipo":null,"bairros":null,"vmin":null,"vmax":null,"dorm":null,"vagas":null,"obs":null},"ofertas":[{"id":"<id da lista>","motivo":"..."}],"comentario":"1 frase para o corretor sobre a abordagem"}

Cliente: ${JSON.stringify({ nome: String(lead.nome || '').split(' ')[0], campanha: lead.campanha || null, empreendimento_da_campanha: e ? { nome: e.nome, bairro: e.bairro, tipologias: e.tipologias || null, status: e.status } : null, imovel_interesse: lead.imovel_interesse || null, etapa: lead.etapa || null, perfil_atual: deFormulario(lead.perfil), historico: hist })}

Imóveis disponíveis (JSON): ${JSON.stringify(cands)}`;
  }
  function validaIA(r, ctx) { const of = ((r && r.ofertas) || []).filter((o) => o && ctx.porId.has(o.id)).slice(0, 6).map((o) => ({ id: o.id, motivo: String(o.motivo || '').slice(0, 220) }));
    const pf = (r && r.perfil) || {}; const perfil = {};
    if (pf.finalidade) perfil.finalidade = finN(pf.finalidade) || String(pf.finalidade); if (pf.tipo) perfil.tipo = String(pf.tipo);
    if (pf.bairros) perfil.bairros = Array.isArray(pf.bairros) ? pf.bairros.join(', ') : String(pf.bairros);
    ['vmin', 'vmax', 'dorm', 'vagas'].forEach((k) => { const n = num(pf[k]); if (n) perfil[k] = n; }); if (pf.obs) perfil.obs = String(pf.obs).slice(0, 200);
    return { perfil, ofertas: of, comentario: String((r && r.comentario) || '').slice(0, 300) }; }
  function mensagem(lead, it, corretor) {
    const nome = String(lead.nome || '').split(' ')[0] || '';
    const valor = it.valor ? (+it.valor >= 1e6 ? 'R$ ' + (+it.valor / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' milhões' : (+it.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })) : '';
    const fatos = [it.dorm ? it.dorm + (it.dorm > 1 ? ' dormitórios' : ' dormitório') + (it.suites ? ` (${it.suites} suíte${it.suites > 1 ? 's' : ''})` : '') : '', it.vagas ? it.vagas + (it.vagas > 1 ? ' vagas' : ' vaga') : '', it.area ? Math.round(it.area) + ' m²' : ''].filter(Boolean).join(', ');
    const oque = it.origem === 'emp' ? `o ${it.nome}, em ${it.bairro}${it.tipologias ? ` (${it.tipologias})` : ''}` : `${/^[aeiou]/i.test(it.tipo || '') ? 'um' : 'uma'} ${String(it.tipo || 'imóvel').toLowerCase()} em ${it.bairro}${fatos ? ', ' + fatos : ''}${valor ? ', por ' + valor : ''}`;
    return `Olá${nome ? ', ' + nome : ''}! ${corretor ? 'Aqui é ' + corretor + ', da Vivere Imóveis.' : 'Aqui é da Vivere Imóveis Selecionados.'} Separei ${oque}, que combina com o que você procura.${it.link && it.origem !== 'fora' ? ' Veja: ' + it.link : ''} Quer que eu agende uma visita ou envie mais detalhes?`.replace(/\s+/g, ' ').trim();
  }
  return { sem, contexto, perfilAuto, perfilDo, deFormulario, descrevePerfil, casar, promptIA, validaIA, mensagem, finN, familia, tipoDeRef, mesmoBairro };
})();

/* ---------- aba Oportunidades do CRM (gestão) — 26/10/2026 ----------
   Todos os leads das planilhas (+ CRM dos corretores), o perfil (automático, sugerido pela IA ou confirmado) e os imóveis
   para ofertar: anúncios ativos, empreendimentos em lançamento e agenciamentos fora do site. Grava em `oportunidades/<id do lead>`
   (perfil, perfil_sugerido, ia, marcas). O painel de cada corretor tem a mesma aba, com os leads dele (coleção leads do painel). */
let OPH={ctx:null}; const fOp={cor:'',camp:'',st:'ofertas',pg:0,lado:'procura',tem:'com',pgT:0,int:''}; const OPST={}, OPMAIS={}; let OPMEMO={ctx:null,m:new Map()}; let SAMPLE;
function ctxHub(){ const im=S.imoveis, md=S.mapa_detalhes, ef=S.empreendimentos_fichas||{};
  if(OPH.ctx&&OPH.im===im&&OPH.md===md&&OPH.ef===ef) return OPH.ctx;
  const det={}; Object.values(md||{}).forEach(d=>Object.entries((d&&d.i)||{}).forEach(([k,v])=>{ det[k.slice(2)]=v; }));
  const item=(k,d)=>{ const x=det[k]||{}; return {id:k,ref:d.ref,fin:d.finalidade,tipo:d.tipo,bairro:d.bairro,cidade:d.cidade,end:d.endereco,valor:d.valor,cor:d.corretor,atu:d.atualizado_em,link:d.link_site,dorm:x.dormitorios,suites:x.suites,banh:x.banheiros,vagas:x.vagas,area:x.area_util||x.area,comodos:x.comodos,cond_itens:x.cond_itens}; };
  const L=Object.entries(im||{}).filter(([k,d])=>d&&d.ref);
  OPH={im,md,ef,ctx:OP.contexto(L.filter(([k,d])=>d.ativo).map(([k,d])=>item(k,d)),L.filter(([k,d])=>!d.ativo).map(([k,d])=>item(k,d)),Object.entries(ef).map(([id,e])=>Object.assign({id},e)))};
  return OPH.ctx; }
const FECHADO_ST=new Set(['vendido','descartado']);
function leadsOp(){ const crm=S.crm_leads||{}, op=S.oportunidades||{};
  return leadsTodos().map(x=>{ const id=x._id||('x-'+semAc(x.nome+x.data)); const c=crm[id]||{}, o=op[id]||{}, pc=c.perfil||{};
    const pCrm={finalidade:pc.fin||'',tipo:pc.tipo||'',bairros:pc.bairros||'',vmin:pc.vmin||null,vmax:pc.vmax||null,obs:pc.obs||''};
    return {id,nome:x.nome,campanha:x.campanha,canal:x.canal,corretor:x.corretor,data:x.data,status:x.status,progresso:x.progresso,etapa:c.etapa||null,
      imovel_interesse:c.imovel_int||x.imovel||'',perfil:o.perfil||(Object.values(pCrm).some(Boolean)?pCrm:null),perfil_sugerido:o.perfil_sugerido||(x.perfil_busca?Object.assign({},x.perfil_busca,{por:'captacao'}):null),
      lado:x.lado==='tem'?'tem':'procura',papel:x.papel||'',_int:intHub(x,intOp(crm[id],id)),imovel_tem:x.imovel_tem||'',capt_id:x.capt_id||'',
      historico:[...(c.hist||[]).map(h=>({em:h.dh,tipo:h.tipo,texto:h.txt})),...(x.progresso?[{em:x.data,tipo:'Progresso',texto:x.progresso}]:[])],oport:o,
      aberto:!(FECHADO_ST.has(x.status)||!ABERTAS_CRM.has(c.etapa))}; }); }
function opsHub(l){ const ctx=ctxHub(); if(OPMEMO.ctx!==ctx) OPMEMO={ctx,m:new Map()};
  const sig=JSON.stringify([l.perfil,l.perfil_sugerido,l.oport,l.campanha,l.imovel_interesse,l.historico.length,l.lado,(ctxCapt(),CAPTC.k)]); const c=OPMEMO.m.get(l.id); if(c&&c.sig===sig) return c.r;
  const p=OP.perfilDo(l,ctx), marcas=(l.oport||{}).marcas||{}, ia=(l.oport||{}).ia||null;
  const iaIts=ia?(ia.ofertas||[]).map(o=>{ const it=ctx.porId.get(o.id); return it?{it,motivos:[],ia:o.motivo,alerta:it.origem==='fora'?'fora do site: confirmar disponibilidade com o agenciador':it.origem==='emp'?'lançamento: confirmar tabela com a construtora':''}:null; }).filter(Boolean):[];
  const refs=String(l.imovel_interesse||'').toUpperCase().split(/[,\s]+/).filter(Boolean);
  const excl=new Set([...iaIts.map(x=>x.it.id),...Object.keys(marcas).filter(k=>marcas[k].st==='ofertado'||marcas[k].st==='descartado'),...(ctx.porRef?refs.flatMap(r=>ctx.porRef.get(r)||[]):ctx.itens.filter(x=>x.ref&&refs.includes(String(x.ref).toUpperCase())).map(x=>x.id))]);
  const auto=p?OP.casar(p,ctx,{max:8,excluir:excl}):[];
  const marc=st=>Object.entries(marcas).filter(([,m])=>m.st===st).map(([id,m])=>Object.assign({id,it:ctx.porId.get(id)},m)).sort((a,b)=>String(b.em).localeCompare(String(a.em)));
  const r={p,ia,novas:[...iaIts.filter(x=>!(marcas[x.it.id]&&/ofertado|descartado/.test(marcas[x.it.id].st))),...auto],ofertados:marc('ofertado'),descartados:marc('descartado'),
    capt:l.lado==='tem'?[]:captDoPerfil(p,6)};
  OPMEMO.m.set(l.id,{sig,r}); return r; }
const curtoOp=v=>v==null||v===''?'':+v>=1e6?brl0(v)+' ('+(+v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:2})+' mi)':brl0(v);
function ofertaHub(l,x){ const it=x.it; const fat=it.origem==='emp'?[it.tipologias||'tipologias a confirmar',it.entrega?'entrega '+it.entrega:''].filter(Boolean).join(' · '):[it.dorm?it.dorm+' dorm.'+(it.suites?` (${it.suites} suíte${it.suites>1?'s':''})`:''):'',it.banh?it.banh+' banh.':'',it.vagas?it.vagas+(it.vagas>1?' vagas':' vaga'):'',it.area?Math.round(it.area)+' m²':'',(m=>m?m2Fmt(m.v)+(m.fin==='A'?' (aluguel)':''):'')(it.id&&it.origem!=='emp'?m2Anu(it.id):null)].filter(Boolean).join(' · ');
  return `<div class="op-of cap${x.ia?' ia':''}"><span class="selo-cap">🟢 PAUTA · pode ofertar</span><div class="l1"><b>${esc(it.ref||'')}</b><span class="s" style="color:var(--muted)">${esc(it.origem==='emp'?'Empreendimento':it.tipo||'')} · ${esc(it.bairro||'')}</span><span class="v">${it.valor?esc(curtoOp(it.valor)):it.origem==='emp'?'sob consulta':'—'}</span></div>
    ${fat?`<div style="color:var(--muted)">${esc(fat)}</div>`:''}${x.ia?`<div>✦ ${esc(x.ia)}</div>`:''}${x.motivos&&x.motivos.length?`<div class="chips2">${x.motivos.map(m=>`<span>${esc(m)}</span>`).join('')}</div>`:''}${x.alerta?`<div class="alerta">${esc(x.alerta)}</div>`:''}
    <div class="acoes"><button class="btn" data-hopcopia="${esc(l.id)}|${esc(it.id)}" title="Copia a mensagem para o WhatsApp e marca como ofertado">Copiar mensagem</button><button class="btn" data-hopdesc="${esc(l.id)}|${esc(it.id)}">Descartar</button>${it.link&&it.origem!=='fora'?`<a class="btn" href="${escUrl(it.link)}" target="_blank" rel="noopener">${it.origem==='emp'?'Site':'Anúncio'} ↗</a>`:''}${it.origem!=='emp'?`<button class="btn" data-hopimv="${esc(it.ref||'')}">Ver em Anúncios</button>`:''}</div></div>`; }
const PAPEL_CAPT={locador:'Locador',vendedor:'Vendedor',operador_renda:'Operador de renda',locatario:'Locatário',comprador:'Comprador'};
function captHub(x){ const it=x.it; const fat=[it.dorm?it.dorm+' dorm.':'',it.area?Math.round(it.area)+' m²':''].filter(Boolean).join(' · ');
  const quem=it.situacao==='distribuido'?'em captação com '+(it.corretor_nome?esc(nomeCorPes(it.corretor_nome)):'um corretor'):'ainda sem corretor';
  return `<div class="op-capt"><div class="selo-na">🟠 A CAPTAR · captar antes de ofertar</div>
    <div class="l1" style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline"><b>${esc(it.tipo||'Imóvel')} · ${esc(it.bairro||'')}</b><span class="s" style="color:var(--muted)">${esc(it.fin||'')}${fat?' · '+esc(fat):''}</span><span style="margin-left:auto;font-weight:600">${it.valor?esc(curtoOp(it.valor)):'—'}</span></div>
    ${x.motivos&&x.motivos.length?`<div class="chips2">${x.motivos.map(m=>`<span>${esc(m)}</span>`).join('')}</div>`:''}
    <div class="gatilho">⚡ Proprietário anuncia direto (${quem}). Capte este imóvel primeiro: não oferte antes de agenciar.</div>
    <div class="acoes"><button class="btn" data-hopcapt="${esc(it.lead||'')}" title="Abre o lead na aba Captação para distribuir ao corretor">⚡ Captar este imóvel primeiro</button></div></div>`; }
function pOportTem(){
  const cc=ctxCapt(), I=interessadosCapt(), busca=qAba().trim().toLowerCase();
  const L0=cc.itens.map(it=>{ const ints=I.get(it.id)||[]; return {it:Object.assign({},it,{estrelas_ef:Math.min(5,(+it.estrelas||0)+(ints.length>=3?2:ints.length?1:0))}),ints}; });
  const base=L0.filter(x=>!fOp.cor||chaveCorretor(x.it.corretor_nome||'')===fOp.cor||x.ints.some(y=>chaveCorretor(y.corretor)===fOp.cor));
  const L=(busca?base.filter(x=>[x.it.dono,x.it.tipo,x.it.bairro,x.it.titulo,PAPEL_CAPT[x.it.papel],...x.ints.map(y=>y.nome+' '+y.corretor)].join(' ').toLowerCase().includes(busca)):fOp.tem==='com'?base.filter(x=>x.ints.length):base)
    .sort((a,b)=>b.ints.length-a.ints.length||(+b.it.estrelas_ef||0)-(+a.it.estrelas_ef||0)||String(b.it.coletado_em||'').localeCompare(String(a.it.coletado_em||'')));
  const POR=busca?1e9:pagTam(), nPg=Math.max(1,Math.ceil(L.length/POR)); if(fOp.pgT>nPg-1) fOp.pgT=nPg-1; const ini=fOp.pgT*POR, V=L.slice(ini,ini+POR);
  const nav=(nPg>1||(!busca&&L.length>50))?`<div class="pag"><button class="btn" data-hoppgt="-1" ${fOp.pgT===0?'disabled':''} aria-label="Página anterior">&lt;</button><span>${ini+1}–${Math.min(ini+POR,L.length)} de ${L.length} · página ${fOp.pgT+1} de ${nPg}</span><button class="btn" data-hoppgt="1" ${fOp.pgT>=nPg-1?'disabled':''} aria-label="Próxima página">&gt;</button><span class="pp" role="group" aria-label="Itens por página"><span>Por página</span>${[50,100].map(n=>`<button class="btn" type="button" data-pagsel="${n}" aria-pressed="${pagTam()===n}">${n}</button>`).join('')}</span></div>`:'';
  const est=n=>{ n=Math.max(0,Math.min(5,+n||0)); return '★'.repeat(n)+'☆'.repeat(5-n); };
  const cards=V.map(({it,ints})=>{ const sobe=(+it.estrelas_ef||0)-(+it.estrelas||0);
    return `<div class="card op-card"><div class="op-cab"><span class="pill info">🏠 ${esc(PAPEL_CAPT[it.papel]||'Proprietário')}</span><b>${esc(it.dono||'Proprietário')}</b><span style="color:var(--brass)" title="${esc((it.estrelas||0)+' de 5'+(sobe>0?' · +'+sobe+' por clientes interessados':''))}">${est(it.estrelas_ef)}${sobe>0?' ↑':''}</span>
      <span class="s" style="color:var(--muted);font-size:12px">${it.situacao==='distribuido'?'com '+esc(nomeCorPes(it.corretor_nome||'')):'sem corretor'} · coletado ${it.coletado_em?dt(it.coletado_em):'—'}</span></div>
      <div class="op-perfil"><div><b>Imóvel que tem:</b> ${esc([it.fin,it.tipo,it.bairro,it.dorm?it.dorm+' dorm.':'',it.area?Math.round(it.area)+' m²':'',it.valor?curtoOp(it.valor):''].filter(Boolean).join(' · '))}</div>
        <div class="selo-na" style="color:var(--warn);font-size:12px;font-weight:600">🟠 A CAPTAR · captar antes de ofertar</div></div>
      ${ints.length?`<div class="op-int"><b>👥 ${ints.length} cliente${ints.length===1?' procura':'s procuram'} um imóvel assim</b><div class="op-clis">${ints.slice(0,8).map(y=>`<span class="op-cli">${esc(y.nome||'—')} · <span style="color:var(--muted)">${y.corretor?esc(nomeCorPes(y.corretor)):'sem corretor'}${y.campanha?' · '+esc(y.campanha):''}</span></span>`).join('')}${ints.length>8?`<span class="op-cli op-cli-mais" style="color:var(--muted)">e mais ${ints.length-8}</span>`:''}</div></div>`:'<p class="nota" style="margin:0">Nenhum cliente com perfil parecido agora.</p>'}
      <div class="acoes" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-hopcapt="${esc(it.lead||'')}">${it.situacao==='distribuido'?'Abrir na Captação':'⚡ Distribuir na Captação'}</button></div></div>`; }).join('');
  const nCom=base.filter(x=>x.ints.length).length;
  return `<div class="op-filtros">${busca?'<span class="nota" style="margin:0">Com a busca, a lista procura em todos os proprietários e clientes.</span>':`<span class="filtros" style="margin:0"><button class="btn" data-hoptem="com" aria-pressed="${fOp.tem==='com'}">Com clientes interessados (${nCom})</button><button class="btn" data-hoptem="todos" aria-pressed="${fOp.tem==='todos'}">Todos (${base.length})</button></span>`}</div>
    ${cc.itens.length?`${nav}${V.length?`<div class="grade op-grade">${cards}</div>`:vazio('Nenhum proprietário neste filtro.')}${nav}`:vazio('Nenhum imóvel a captar ainda. A coleta da aba Captação grava aqui.')}`; }
/* lista compacta das Oportunidades (01/11/2026, pedido do Cleiton): uma linha por lead; o toque abre o cartão completo de antes logo abaixo, um por vez */
const ORD_OP={nome:['Lead',x=>x.l.nome||null],etapa:['Etapa',x=>x.l.etapa||(STL[x.l.status]||[])[0]||null],corretor:['Corretor',x=>x.l.corretor?nomeCorPes(x.l.corretor):null],
  campanha:['Origem',x=>x.l.campanha||null],data:['Entrada',x=>x.l.data||null],interesse:['Interesse',x=>x.l._int&&INT_POR[x.l._int.k]?INT_POR[x.l._int.k].i:null],perfil:['Perfil',x=>x.o.p?(OP.descrevePerfil(x.o.p,1)||null):null],ofertas:['🟢 Pauta',x=>x.o.novas.length],capt:['🟠 A captar',x=>x.o.capt.length]};
let OPAB='';
const setaOp=k=>{ const o=fOp.ord; return o&&o.k===k?(o.dir==='asc'?' ▲':' ▼'):' ↕'; };
/* filtros dentro da lista (01/11/2026, volta 2): busca só da lista, etapa, origem, data de/até e com/sem 🔶; o funil ⏷ do título leva ao filtro da coluna */
const FL_OP=()=>fOp.fl||(fOp.fl={q:'',etapa:'',origem:'',de:'',ate:'',capt:''});
const isoOp=v=>{ const s=String(v||''); let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[0]; m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m?`${m[3]}-${m[2]}-${m[1]}`:''; };
const semAcOp=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const VAL_OP={etapa:x=>x.l.etapa||(STL[x.l.status]||[])[0]||'',origem:x=>x.l.campanha||'',data:x=>isoOp(x.l.data),capt:x=>x.o.capt.length,
  txt:x=>[x.l.nome,x.l.telefone,x.l.whatsapp,x.l.email,x.l.campanha,x.l.corretor?nomeCorPes(x.l.corretor):'',x.o.p?OP.descrevePerfil(x.o.p):'',VAL_OP.etapa(x)].filter(Boolean).join(' ')};
const FIL_OP={nome:'q',etapa:'etapa',corretor:'#hop-cor',campanha:'origem',data:'de',perfil:'q',capt:'capt'};
let OPLB=[];
function filtraOpl(L,f){ const q=semAcOp(f.q).trim(), t=q?q.split(/\s+/):[];
  return L.filter(x=>{ const d=VAL_OP.data(x), c=VAL_OP.capt(x);
    return (!f.etapa||VAL_OP.etapa(x)===f.etapa)&&(!f.origem||(f.origem==='—'?!x.l.campanha:VAL_OP.origem(x)===f.origem))&&(!f.de||(d&&d>=f.de))&&(!f.ate||(d&&d<=f.ate))
      &&(!f.capt||(f.capt==='com'?c>0:c===0))&&(!t.length||(s=>t.every(w=>s.includes(w)))(semAcOp(VAL_OP.txt(x)))); }); }
const filOn=k=>{ const f=FL_OP(), a=FIL_OP[k]; return a==='#hop-cor'?!!fOp.cor:a==='de'?!!(f.de||f.ate):!!(a&&f[a]); };
function barraOp(){ const f=FL_OP(), uniq=g=>[...new Set(OPLB.map(g).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR'));
  const uniqS=(g,s)=>{ const v=uniq(g); if(s&&s!=='—'&&!v.includes(s)) v.unshift(s); return v; }; /* valor escolhido fica no select mesmo fora da lista atual (crítico, volta 2) */
  const opt=(v,t,s)=>`<option value="${esc(v)}"${s===v?' selected':''}>${esc(t)}</option>`, n=['q','etapa','origem','de','ate','capt'].filter(k=>f[k]).length;
  return `<div class="opl-fil" role="search" aria-label="Filtrar a lista"><span class="rot">Filtrar a lista</span><input type="search" id="oplf-q" placeholder="Buscar na lista: nome, perfil, origem…" value="${esc(f.q)}" aria-label="Buscar na lista">`+
    `<select id="oplf-etapa" aria-label="Etapa">${opt('','Todas as etapas',f.etapa)}${uniqS(VAL_OP.etapa,f.etapa).map(v=>opt(v,v,f.etapa)).join('')}</select>`+
    `<select id="oplf-origem" aria-label="Origem">${opt('','Todas as origens',f.origem)}${uniqS(VAL_OP.origem,f.origem).map(v=>opt(v,v,f.origem)).join('')}${OPLB.some(x=>!x.l.campanha)?opt('—','Sem origem',f.origem):''}</select>`+
    `<label>Data de <input type="date" id="oplf-de" value="${esc(f.de)}"></label><label>até <input type="date" id="oplf-ate" value="${esc(f.ate)}"></label>`+
    `<select id="oplf-capt" aria-label="A captar">${opt('','🟠 A captar: todos',f.capt)}${opt('com','Com 🟠 a captar',f.capt)}${opt('sem','Sem 🟠 a captar',f.capt)}</select>`+
    `${n?`<button type="button" class="btn" data-oplimpa="1">Limpar filtros (${n})</button>`:''}</div>`; }
function focaFilOp(k){ const a=FIL_OP[k]; if(!a) return; const el=document.getElementById(a==='#hop-cor'?'hop-cor':'oplf-'+a); if(!el) return;
  el.scrollIntoView({block:'nearest'}); el.focus(); el.classList.add('alvo'); setTimeout(()=>el.classList.remove('alvo'),1500); }
let TOPLQ;
document.addEventListener('input',e=>{ if(e.target.id!=='oplf-q') return; FL_OP().q=e.target.value; fOp.pg=0; clearTimeout(TOPLQ);
  TOPLQ=setTimeout(()=>{ const s=[e.target.selectionStart,e.target.selectionEnd]; render(); const el=document.getElementById('oplf-q'); if(el){ el.focus(); try{ el.setSelectionRange(s[0],s[1]); }catch(_){} } },250); });
document.addEventListener('change',e=>{ const id=e.target&&e.target.id; if(!id||!id.startsWith('oplf-')||id==='oplf-q') return; FL_OP()[id.slice(5)]=e.target.value; fOp.pg=0; OPAB=''; render(); });
function resumoOp(L){ const c=new Map(), m=new Map(); L.forEach(({l})=>{ const a=l.corretor?nomeCorPes(l.corretor):'sem corretor'; c.set(a,(c.get(a)||0)+1); const b=l.campanha||'sem origem'; m.set(b,(m.get(b)||0)+1); });
  const top=(M,n)=>{ const a=[...M].sort((x,y)=>y[1]-x[1]||String(x[0]).localeCompare(String(y[0]),'pt-BR')); return a.slice(0,n).map(([k,v])=>`<span><b>${v}</b> ${esc(k)}</span>`).join('')+(a.length>n?`<span class="mut">+${a.length-n} outr${a.length-n===1?'a':'as'}</span>`:''); };
  const nOf=L.filter(x=>x.o.novas.length).length, nCa=L.filter(x=>x.o.capt.length).length;
  return `<div class="opl-res"><div><b>${L.length}</b> lead${L.length===1?'':'s'} · <b>${nOf}</b> com 🟢 na pauta · <b>${nCa}</b> com 🟠 a captar</div>${L.length?`<div class="opl-gr"><span class="rot">Por corretor</span>${top(c,8)}</div><div class="opl-gr"><span class="rot">Por origem</span>${top(m,6)}</div>`:''}</div>`; }
function listaOp(L,V,cardOp,nav){
  const cab=Object.entries(ORD_OP).map(([k,[r]])=>`<span class="c hc${k==='ofertas'||k==='capt'?' n':''}"><button type="button" data-hopord="${k}" title="${k==='capt'?'A captar: capte antes de ofertar · ':k==='ofertas'?'Pauta: pode ofertar · ':''}Ordenar: 1º toque maior → menor, 2º menor → maior, 3º volta à ordem original">${r}${setaOp(k)}</button>${FIL_OP[k]?`<button type="button" class="fil${filOn(k)?' on':''}" data-oplfil="${k}" title="Filtrar por ${esc(r.replace(/^[🟢🟠] /u,''))}" aria-label="Filtrar por ${esc(r.replace(/^[🟢🟠] /u,''))}">⏷</button>`:''}</span>`).join('')+'<span></span>';
  const ordCel=`<div class="opl-ord" role="group" aria-label="Ordenar por"><span class="rot">Ordenar por</span>${Object.entries(ORD_OP).filter(([k])=>k!=='perfil').map(([k,[r]])=>`<button type="button" class="btn" data-hopord="${k}" aria-pressed="${!!(fOp.ord&&fOp.ord.k===k)}">${r}${setaOp(k)}</button>`).join('')}<button type="button" class="btn" data-oplfil="nome">⏷ Filtrar</button></div>`;
  const lin=V.map(x=>{ const {l,o}=x, ab=OPAB===l.id, st=STL[l.status], et=l.etapa||(st?st[0]:''), per=o.p?(OP.descrevePerfil(o.p,1)||'—'):'sem perfil', cor=l.corretor?nomeCorPes(l.corretor):'sem corretor';
    const oculto=[...o.novas,...o.capt.slice(0,3)].map(n=>[n.it.ref,n.it.tipo,n.it.bairro].filter(Boolean).join(' ')).join(' · ');
    return `<div class="opl-item"><button type="button" class="opl-lin" data-hopab="${esc(l.id)}" aria-expanded="${ab}" aria-label="${esc(l.nome+': '+o.novas.length+' na pauta, '+o.capt.length+' a captar. '+(ab?'Fechar':'Abrir')+' as oportunidades')}">`+
      `<span class="c c-nome"><b>${esc(l.nome)}</b></span><span class="c c-etapa"><i class="rt">Etapa: </i>${et?`<span class="pill ${l.etapa?'':st[1]}">${esc(et)}</span>`:'—'}</span>`+
      `<span class="c c-corretor">${esc(cor)}</span><span class="c c-campanha" title="${esc(l.campanha||'')}">${esc(l.campanha||'—')}</span><span class="c c-data">${l.data?dt(l.data):'—'}</span>`+
      `<span class="c c-meta">${esc('Corretor: '+cor+' · Origem: '+(l.campanha||'sem origem')+' · Entrada: '+(l.data?dt(l.data):'—'))}</span>`+
      `<span class="c c-int"><i class="rt">Interesse: </i>${pillIntK(l._int)||'—'}</span>`+
      `<span class="c c-perfil${o.p?'':' falta'}" title="${esc(per)}"><i class="rt">Perfil: </i>${esc(per)}</span>`+
      `<span class="c c-ofertas n${o.novas.length?'':' zero'}" title="Pauta: pode ofertar">🟢 ${o.novas.length}<i> na pauta</i></span><span class="c c-capt n${o.capt.length?'':' zero'}" title="A captar: capte antes de ofertar">🟠 ${o.capt.length}<i> a captar</i></span><span class="c c-seta" aria-hidden="true">${ab?'▾':'▸'}</span>`+
      `${oculto?`<span class="vh" aria-hidden="true">${esc(oculto)}</span>`:''}</button>${ab?`<div class="opl-det">${cardOp(x)}</div>`:''}</div>`; }).join('');
  return `<div class="opl-wrap">${resumoOp(L)}${barraOp()}${ordCel}${nav}${V.length?`<div class="opl"><div class="opl-cab">${cab}</div>${lin}</div>`:''}</div>`; }
function pOport(){
  if(!ASSINADAS.empreendimentos_fichas) assina('empreendimentos_fichas');
  if(!carregado.imoveis||!carregado.leads_contatos) return `<h2>Ofertas</h2>`+vazio('Carregando leads e imóveis…');
  const busca=!!qAba(); const LA=leadsOp(), L0=LA.filter(l=>l.lado!=='tem').map(l=>({l,o:opsHub(l)}));
  L0.forEach(x=>{ if(x.l._int&&!x.l._int.conf&&x.l._int.k==='a_definir'&&x.o.p){ const f=finInt(x.o.p.fin||x.o.p.finalidade); if(f) x.l._int={k:f==='venda'?'comprador':f==='anual'?'locatario_anual':'locatario_temporada',conf:false}; } });
  const nTem=ctxCapt().itens.length, nProc=L0.length;
  const lados=`<div class="filtros op-lados" role="group" aria-label="Lado"><button class="btn" data-hoplado="procura" aria-pressed="${fOp.lado==='procura'}">🔎 Compradores e locatários<span class="op-l2">&nbsp;→ imóveis para oferecer</span>&nbsp;(${nProc})</button><button class="btn" data-hoplado="tem" aria-pressed="${fOp.lado==='tem'}">🏠 Vendedores e locadores<span class="op-l2">&nbsp;→ clientes interessados</span>&nbsp;(${nTem})</button></div>`;
  const F={ofertas:x=>x.l.aberto&&(x.o.novas.length||x.o.capt.length),abertos:x=>x.l.aberto,sem_perfil:x=>x.l.aberto&&!x.o.p,todos:()=>true};
  const base0=L0.filter(x=>(!fOp.cor||chaveCorretor(x.l.corretor)===fOp.cor)&&(!fOp.camp||x.l.campanha===fOp.camp));
  const base=base0.filter(x=>!fOp.int||x.l._int.k===fOp.int);
  const cont=k=>base.filter(F[k]).length;
  const L=(busca?base:base.filter(F[fOp.st]||F.ofertas)).sort((a,b)=>String(b.l.data||'').localeCompare(String(a.l.data||'')));
  OPLB=L.slice(); L.splice(0,L.length,...filtraOpl(L,FL_OP()));
  if(fOp.ord&&ORD_OP[fOp.ord.k]){ const f=ORD_OP[fOp.ord.k][1]; L.sort((a,b)=>cmpOrd(f(a),f(b),fOp.ord.dir)); }
  const POR=busca?1e9:pagTam(), nPg=Math.max(1,Math.ceil(L.length/POR)); if(fOp.pg>nPg-1) fOp.pg=nPg-1; const ini=fOp.pg*POR, V=L.slice(ini,ini+POR);
  const cors=[...new Set(L0.map(x=>chaveCorretor(x.l.corretor)).filter(Boolean))].map(k=>[k,nomeCorretor(k)]).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
  const camps=[...new Set(L0.map(x=>x.l.campanha).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const ORIG={confirmado:['perfil confirmado','ok'],ia:['sugerido pela IA · confirme','warn'],auto:['automático · confirme','info']};
  const nav=(nPg>1||(!busca&&L.length>50))?`<div class="pag"><button class="btn" data-hoppg="-1" ${fOp.pg===0?'disabled':''} aria-label="Página anterior">&lt;</button><span>${ini+1}–${Math.min(ini+POR,L.length)} de ${L.length} · página ${fOp.pg+1} de ${nPg}</span><button class="btn" data-hoppg="1" ${fOp.pg>=nPg-1?'disabled':''} aria-label="Próxima página">&gt;</button><span class="pp" role="group" aria-label="Itens por página"><span>Por página</span>${[50,100].map(n=>`<button class="btn" type="button" data-pagsel="${n}" aria-pressed="${pagTam()===n}">${n}</button>`).join('')}</span></div>`:'';
  const cardOp=({l,o})=>{ const og=o.p?(o.p.origem==='confirmado'&&(l.perfil||{}).por==='corretor'?['perfil confirmado pelo corretor','ok']:o.p.origem==='ia'&&(l.perfil_sugerido||{}).por==='captacao'?['da captação · confirme','info']:ORIG[o.p.origem]):null, mais=OPMAIS[l.id], vis=mais?o.novas:o.novas.slice(0,4), st=STL[l.status];
    return `<div class="card op-card"><div class="op-cab"><b>${esc(l.nome)}</b>${pillIntK(l._int)}${st?`<span class="pill ${st[1]}">${st[0]}</span>`:''}${l.etapa?`<span class="pill">${esc(l.etapa)}</span>`:''}<span class="s" style="color:var(--muted);font-size:12px">${esc(l.campanha||'')} · ${l.corretor?esc(nomeCorPes(l.corretor)):'sem corretor'} · ${l.data?dt(l.data):'—'}</span></div>
      <div class="op-perfil"><div><b>Perfil:</b> ${o.p?esc(OP.descrevePerfil(o.p,1))||'—':'<span style="color:var(--warn)">sem perfil — peça à IA ou confirme no CRM do corretor</span>'} ${og?`<span class="pill ${og[1]}">${og[0]}</span>`:''}</div>
        ${o.p&&o.p.origem==='auto'&&o.p.fontes&&o.p.fontes.length?`<div style="color:var(--muted)">De onde veio: ${esc(o.p.fontes.join(' · '))}</div>`:''}${o.ia&&o.ia.comentario?`<div>✦ ${esc(o.ia.comentario)} <span style="color:var(--muted)">(${dt(o.ia.em)})</span></div>`:''}
        <div class="acoes" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><button class="btn" data-hopia="${esc(l.id)}">✦ ${o.ia?'Pedir à IA de novo':'Pedir à IA'}</button>${o.p&&o.p.origem!=='confirmado'?`<button class="btn" data-hopconf="${esc(l.id)}">Confirmar perfil</button>`:''}<span style="color:var(--muted);font-size:12px">${esc(OPST[l.id]||'')}</span></div></div>
      ${vis.length?`<div class="op-bt cap">🟢 Pauta · pode ofertar agora · ${o.novas.length}</div><div class="op-ofs">${vis.map(x=>ofertaHub(l,x)).join('')}</div>${o.novas.length>4?`<button class="btn" data-hopmais="${esc(l.id)}" style="justify-self:start">${mais?'Mostrar menos':'Mostrar mais '+(o.novas.length-4)}</button>`:''}`:o.p?'<p class="nota" style="margin:0">Nenhum imóvel captado novo combina com o perfil agora.</p>':''}
      ${o.capt.length?`<div class="op-bt nao">🟠 A captar · capte antes de ofertar · ${o.capt.length>3?'3 de '+o.capt.length:o.capt.length}</div><div class="op-ofs">${o.capt.slice(0,3).map(captHub).join('')}</div>`:''}
      ${o.ofertados.length?`<details><summary>Já ofertados (${o.ofertados.length})</summary>${o.ofertados.map(m=>`<div style="font-size:13px;margin-top:4px">${dt(m.em)} · ${esc(m.por||'')} · <b>${esc(m.it?m.it.ref:m.id)}</b> ${m.it?esc([m.it.tipo,m.it.bairro].filter(Boolean).join(', ')):''} <button class="btn" data-hopreabre="${esc(l.id)}|${esc(m.id)}">voltar para a lista</button></div>`).join('')}</details>`:''}
      ${o.descartados.length?`<details><summary>Descartados (${o.descartados.length})</summary>${o.descartados.map(m=>`<div style="font-size:13px;margin-top:4px">${dt(m.em)} · <b>${esc(m.it?m.it.ref:m.id)}</b> <button class="btn" data-hopreabre="${esc(l.id)}|${esc(m.id)}">voltar para a lista</button></div>`).join('')}</details>`:''}</div>`; };
  const chips=[['ofertas',`Com ofertas (${cont('ofertas')})`],['abertos',`Em aberto (${cont('abertos')})`],['sem_perfil',`Sem perfil (${cont('sem_perfil')})`],['todos',`Todos (${cont('todos')})`]];
  return `<h2>Ofertas</h2><div class="op-leg"><div><b>🔎 Compradores e locatários</b>: cada cliente com os imóveis que combinam com o que ele procura. <b>🏠 Vendedores e locadores</b>: cada imóvel não captado com os clientes que procuram um assim.</div><div><span class="selo-cap">🟢 PAUTA</span> imóvel nosso (site, lançamento ou agenciamento): pode ofertar. <span class="selo-nao">🟠 A CAPTAR</span> proprietário anuncia direto: capte antes de ofertar.</div></div><details class="op-como"><summary>Como funciona</summary><p class="nota">Para cada lead, os imóveis que combinam com o perfil: anúncios ativos do site, empreendimentos em lançamento e agenciamentos fora do site (confirmar disponibilidade). O perfil vem da campanha (empreendimento), do imóvel de interesse e do CRM do corretor; <b>✦ Pedir à IA</b> lê também o histórico, sugere o perfil e escolhe as ofertas com justificativa. <b>Copiar mensagem</b> copia o texto para o WhatsApp e marca como ofertado. Cada corretor tem a mesma aba no painel dele, com os leads dele.</p></details>${lados}
  <div class="op-filtros"><select id="hop-cor" aria-label="Corretor"><option value="">Todos os corretores</option>${cors.map(([k,t])=>`<option value="${esc(k)}"${fOp.cor===k?' selected':''}>${esc(t)}</option>`).join('')}</select><select id="hop-camp" aria-label="Campanha"${fOp.lado==='tem'?' hidden':''}><option value="">Todas as campanhas</option>${camps.map(c=>`<option${fOp.camp===c?' selected':''}>${esc(c)}</option>`).join('')}</select>
  ${fOp.lado==='tem'?'':busca?'<span class="nota" style="margin:0">Com a busca, a lista procura em todos os leads e nos imóveis sugeridos.</span>':`<span class="filtros" style="margin:0">${chips.map(([k,t])=>`<button class="btn" data-hopst="${k}" aria-pressed="${fOp.st===k}">${esc(t)}</button>`).join('')}</span>`}</div>
  ${fOp.lado==='tem'?'':chipsInt('oport',base0.map(x=>x.l._int),fOp.int)}
  ${fOp.lado==='tem'?pOportTem():VisoesCRM.montar('oport',PREFS,Object.assign({lista:()=>`${listaOp(L,V,cardOp,nav)}${V.length?'':vazio(busca?'Nenhum lead atende à busca.':OPLB.length?'Nenhum lead atende aos filtros da lista.':'Nenhum lead neste filtro.')}${V.length?nav:''}`},visoesOport(busca?L:base)))}`;
}
async function hopGrava(id,patch,msg){ if(!DB) return false; const atual=(S.oportunidades||{})[id]||{}; const novo=Object.assign({},JSON.parse(JSON.stringify(atual)),patch,{atualizado_em:new Date(Date.now()-3*3600e3).toISOString().slice(0,19)});
  try{ await DB.doc('oportunidades/'+id).set(novo); S.oportunidades=Object.assign({},S.oportunidades,{[id]:novo}); OPST[id]=msg||''; render(); return true; }catch(e){ OPST[id]='Não foi possível salvar: '+((e&&e.message)||e); render(); return false; } }
async function hopMarca(id,iid,st,via){ const o=JSON.parse(JSON.stringify((S.oportunidades||{})[id]||{})); o.marcas=o.marcas||{}; const it=ctxHub().porId.get(iid)||{};
  o.marcas[iid]={st:st||'reaberto',em:new Date(Date.now()-3*3600e3).toISOString().slice(0,16),por:'diretoria',via:via||'',ref:it.ref||''}; // 'reaberto' em vez de apagar (espelho com o painel)
  return hopGrava(id,{marcas:o.marcas},st==='ofertado'?'Mensagem copiada e oferta registrada.':st==='descartado'?'Imóvel descartado para este lead.':'Imóvel voltou para a lista.'); }
async function hopIA(id){ const l=leadsOp().find(x=>x.id===id); if(!l) return;
  if(SAMPLE===undefined){ try{ SAMPLE=window.claude&&window.claude.use?await window.claude.use('sample'):null; }catch(e){ SAMPLE=null; } }
  if(!SAMPLE){ OPST[id]='A IA não está liberada nesta visualização do HUB.'; render(); return; }
  OPST[id]='A IA está lendo o lead e escolhendo os imóveis…'; render();
  try{ const ctx=ctxHub(), r=await SAMPLE.json(OP.promptIA(l,ctx,hojeISO()),{modelTier:'default'}), v=OP.validaIA(r,ctx), em=new Date(Date.now()-3*3600e3).toISOString().slice(0,16);
    await hopGrava(id,{perfil_sugerido:Object.assign({},v.perfil,{em,por:'ia'}),ia:{em,ofertas:v.ofertas,comentario:v.comentario}},`A IA sugeriu ${v.ofertas.length} imóve${v.ofertas.length===1?'l':'is'}. Confira o perfil.`); }
  catch(e){ OPST[id]=e&&e.code==='rate_limited'?'Limite de uso da IA atingido agora. Tente mais tarde.':e&&e.code==='not_granted'?'A IA não foi liberada nesta visualização.':'A IA não respondeu agora. Tente de novo.'; render(); } }
async function hopConfirma(id){ const l=leadsOp().find(x=>x.id===id); if(!l) return; const p=OP.perfilDo(l,ctxHub()); if(!p) return;
  hopGrava(id,{perfil:{finalidade:p.fin||'',tipo:p.tipo||'',bairros:(p.bairros||[]).join(', '),vmin:p.vmin||null,vmax:p.vmax||null,dorm:p.dorm||null,vagas:p.vagas||null,obs:p.obs||'',por:'diretoria',em:hojeISO()}},'Perfil confirmado pela gestão.'); }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-hopab],[data-hopord],[data-oplfil],[data-oplimpa],[data-hoplado],[data-hoptem],[data-hoppgt],[data-hopcapt],[data-hopst],[data-hoppg],[data-hopmais],[data-hopia],[data-hopconf],[data-hopcopia],[data-hopdesc],[data-hopreabre],[data-hopimv]'); if(!b) return; const d=b.dataset;
  if(d.hopab){ OPAB=OPAB===d.hopab?'':d.hopab; render(); return; }
  if(d.hopord){ fOp.ord=proxOrd(fOp.ord,d.hopord); fOp.pg=0; render(); return; }
  if(d.oplfil){ focaFilOp(d.oplfil); return; }
  if(d.oplimpa){ fOp.fl={q:'',etapa:'',origem:'',de:'',ate:'',capt:''}; fOp.pg=0; render(); return; }
  if(d.hoplado){ fOp.lado=d.hoplado; render(); return; }
  if(d.hoptem){ fOp.tem=d.hoptem; fOp.pgT=0; render(); return; }
  if(d.hoppgt){ fOp.pgT=Math.max(0,fOp.pgT+(+d.hoppgt)); render(); window.scrollTo(0,0); return; }
  if(d.hopcapt!==undefined){ if(MODS['captacao-leads']&&ABAS.some(a=>a[0]==='captacao-leads')) irBusca({ir:{aba:'captacao-leads',linha:'capt-'+d.hopcapt,alvo:d.hopcapt}}); return; }
  if(d.hopst){ fOp.st=d.hopst; fOp.pg=0; render(); return; }
  if(d.hoppg){ fOp.pg=Math.max(0,fOp.pg+(+d.hoppg)); render(); window.scrollTo(0,0); return; }
  if(d.hopmais){ OPMAIS[d.hopmais]=!OPMAIS[d.hopmais]; render(); return; }
  if(d.hopia){ hopIA(d.hopia); return; }
  if(d.hopconf){ hopConfirma(d.hopconf); return; }
  if(d.hopcopia){ const [id,iid]=d.hopcopia.split('|'); const l=leadsOp().find(x=>x.id===id)||{}, it=ctxHub().porId.get(iid)||{}; copiaTexto(OP.mensagem(l,it,null),b); hopMarca(id,iid,'ofertado','mensagem copiada no HUB'); return; }
  if(d.hopdesc){ const [id,iid]=d.hopdesc.split('|'); hopMarca(id,iid,'descartado'); return; }
  if(d.hopreabre){ const [id,iid]=d.hopreabre.split('|'); hopMarca(id,iid,null); return; }
  if(d.hopimv){ aba='imoveis'; Object.assign(fImv,{foco:[],alerta:'',fin:'todas',st:'todos',q:d.hopimv,de:'',ate:'',per:'0',pg:0}); try{localStorage.setItem('hubv.aba',aba)}catch(_){}; render(); window.scrollTo(0,0); return; } });
document.addEventListener('change',e=>{ if(e.target.id==='hop-cor'){ fOp.cor=e.target.value; fOp.pg=0; render(); } else if(e.target.id==='hop-camp'){ fOp.camp=e.target.value; fOp.pg=0; render(); } });

/* ---------- relatório de dívida com composição (Cobrança, 26/10/2026) ----------
   Modelo: "Inadimplência com composição" da Borba/Voilar. Por boleto vencido e não pago: itens do boleto
   (aluguel + encargos da ficha da locação, fechando no valor do boleto do Alude), depois juros, multa,
   atualização e honorários, com saldo corrido. Juros e multa vêm da ficha da locação (Alude);
   atualização pelo IGP-M (controle/indices.igpm, % ao mês por competência AAAA-MM), sem deflação. */
let REL=null; let JSPDF=null;
const r2=v=>Math.round((+v||0)*100)/100;
const ymd=s=>String(s||'').slice(0,10);
const ymAdd=(ym,n)=>{let [y,m]=String(ym).split('-').map(Number); m+=n; y+=Math.floor((m-1)/12); m=((m-1)%12+12)%12+1; return y+'-'+String(m).padStart(2,'0');};
const mesesEntre=(a,b)=>{const [y1,m1]=String(a).split('-').map(Number),[y2,m2]=String(b).split('-').map(Number); return (y2-y1)*12+(m2-m1);};
const diasEntre=(a,b)=>Math.round((Date.parse(ymd(b)+'T12:00:00Z')-Date.parse(ymd(a)+'T12:00:00Z'))/864e5);
const compTxt=c=>{const [y,m]=String(c||'').split('-'); return m?m+'/'+y:'—';};
const nBR=v=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const dBR=s=>{const m=ymd(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?`${m[3]}/${m[2]}/${m[1]}`:'';};
function fichaLoc(cod){ return (((S['fichas-locacao_dados']||{})[cod])||{}).alude||{}; }
const emAberto=b=>b&&b.vencimento&&!['paga','cancelada'].includes(b.situacao);
function devidosDe(cod,ate){ return lista('cobrancas').filter(b=>b.cod===cod&&emAberto(b)&&ymd(b.vencimento)<ate).sort((a,b)=>String(a.competencia).localeCompare(String(b.competencia))); }
function codsDevedores(ate){ return [...new Set(lista('cobrancas').filter(b=>emAberto(b)&&ymd(b.vencimento)<ate).map(b=>b.cod))].sort(ordCod); }
function composicaoBoleto(cod,b){
  const a=fichaLoc(cod), comp=String(b.competencia||''), it=[];
  (a.encargos_cobranca||[]).forEach(e=>{ let v=null, d=e.nome||e.categoria||'Encargo';
    if(e.fixo) v=e.valor_total;
    else if(e.de&&e.ate&&comp>=e.de&&comp<=e.ate){ v=(e.proxima&&e.proxima.ref===comp&&e.proxima.valor!=null)?e.proxima.valor:e.valor_parcela;
      if(e.descricao&&e.descricao!==e.nome) d=String(e.descricao).toLowerCase().startsWith(String(d).toLowerCase())?e.descricao:d+' - '+e.descricao; if(e.parcelas) d+=` - parcela ${mesesEntre(e.de,comp)+1} de ${e.parcelas}`; }
    if(v) it.push({d,v:r2(v)}); });
  const enc=r2(it.reduce((t,x)=>t+x.v,0));
  let al=a.aluguel!=null?r2(a.aluguel):null; const resto=b.valor!=null?r2(b.valor-enc):null;
  if(resto!=null&&resto>0&&(al==null||Math.abs(resto-al)<=al*0.3)) al=resto;   // o boleto do Alude manda (reajuste, proporcional)
  it.unshift({d:'Aluguel - competência '+compTxt(comp),v:al||0});
  if(b.valor!=null){ const dif=r2(b.valor-it.reduce((t,x)=>t+x.v,0)); if(Math.abs(dif)>=0.05) it.push({d:'Diferença conforme o boleto do Alude',v:dif}); }
  return it;
}
function fatorIGPM(venc,ate){ const idx=((S.controle||{}).indices||{}).igpm||{}; let f=1; const usados=[], faltam=[];
  const fim=ymAdd(ymd(ate).slice(0,7),-1);
  // 15/11/2026 (hub #23): mês do vencimento proporcional aos dias que restam nele (dia do vencimento incluído), meses cheios depois
  // e o mês do cálculo fora — o critério do Ábacus e da Calculadora do escritório (calc-motor, modo 'abacus')
  const v0=ymd(venc), m0=v0.slice(0,7), dm=new Date(Date.UTC(+m0.slice(0,4),+m0.slice(5,7),0)).getUTCDate(), fr=(dm-(+v0.slice(8,10))+1)/dm;
  for(let m=m0; m<=fim; m=ymAdd(m,1)){ if(idx[m]!=null){ f*=1+(Number(idx[m])/100)*(m===m0?fr:1); usados.push(m); } else faltam.push(m); }
  return {f:Math.max(1,f),usados,faltam}; }
function calcDivida(cod,ate,honPct,extras){
  const a=fichaLoc(cod), cb=a.cobranca||{}; const jur=cb.juros_pct_mes!=null?+cb.juros_pct_mes:1, mul=cb.multa_pct!=null?+cb.multa_pct:10;
  const blocos=[]; let saldo=0; const meses=new Set(), faltam=new Set();
  const bloco=(cab,itens,venc)=>{ const dias=Math.max(0,diasEntre(venc,ate)); const base=r2(itens.reduce((t,x)=>t+x.v,0));
    const fi=fatorIGPM(venc,ate); fi.usados.forEach(m=>meses.add(m)); fi.faltam.forEach(m=>faltam.add(m));
    const atual=r2(base*(fi.f-1)), corr=base+atual, juros=r2(corr*jur/100*dias/30), multa=dias>0?r2(corr*mul/100):0, hon=r2((corr+juros+multa)*(honPct||0)/100);
    const linhas=itens.map(x=>Object.assign({},x));
    if(juros) linhas.push({d:'Juros',v:juros,enc:1}); if(multa) linhas.push({d:'Multa',v:multa,enc:1});
    if(atual) linhas.push({d:'Atualização (IGP-M)',v:atual,enc:1}); if(hon) linhas.push({d:'Honorários',v:hon,enc:1});
    linhas.forEach(x=>{ saldo=r2(saldo+x.v); x.s=saldo; });
    blocos.push(Object.assign({venc,dias,linhas,base,atual,juros,multa,hon,total:r2(base+atual+juros+multa+hon)},cab)); };
  devidosDe(cod,ate).forEach(b=>bloco({comp:b.competencia,obs:(b.sem_boleto||b.situacao==='a_emitir')?'boleto não emitido pelo Alude':''},composicaoBoleto(cod,b),ymd(b.vencimento)));
  (extras||[]).filter(x=>x&&x.v).forEach(x=>bloco({comp:'',obs:'lançamento avulso'},[{d:x.desc||'Outros débitos',v:r2(x.v)}],x.venc||ate));
  const soma=k=>r2(blocos.reduce((t,b)=>t+b[k],0));
  return {blocos,total:saldo,jur,mul,hon:honPct||0,base:soma('base'),atual:soma('atual'),juros:soma('juros'),multa:soma('multa'),honV:soma('hon'),meses:[...meses].sort(),faltam:[...faltam].sort()};
}
function dadosLoc(cod){ const c=(S.contratos_locacao||{})[cod]||{}; const a=fichaLoc(cod);
  return {num:a.numero||(cod+'/1'), locatario:campo(c,'locatario')||'', locador:campo(c,'locador')||'', endereco:campo(c,'endereco')||''}; }
function criterios(r,ate){ return `Valores atualizados até ${dBR(ate)} · juros de ${nBR(r.jur).replace(',00','')}% ao mês pro rata die · multa de ${nBR(r.mul).replace(',00','')}% · atualização pelo IGP-M (FGV)${r.meses.length?(r.meses.length===1?' de '+compTxt(r.meses[0]):' de '+compTxt(r.meses[0])+' a '+compTxt(r.meses[r.meses.length-1])):', sem mês fechado no período'}${r.hon?` · honorários de ${r.hon}%`:' · sem honorários'}`; }
function relHTML(){ if(!REL) return ''; const {cod,ate,hon,extras}=REL; const r=calcDivida(cod,ate,hon,extras), L=dadosLoc(cod);
  const linhas=r.blocos.map(b=>b.linhas.map((x,i)=>`<tr class="${i===0?'ini':''}${x.enc?' enc':''}">${i===0?`<td>${b.comp?compTxt(b.comp):'Avulso'}${b.obs?`<div class="nota" style="margin:0;font-size:11px">${esc(b.obs)}</div>`:''}</td><td>${dBR(b.venc)}</td><td class="n">${b.dias}</td>`:'<td></td><td></td><td></td>'}<td class="dsc">${esc(x.d)}</td><td class="n" data-sens>${nBR(x.v)}</td><td class="n" data-sens>${nBR(x.s)}</td></tr>`).join('')).join('');
  const av=(extras||[]).map((x,i)=>`<li>${esc(x.desc||'Outros débitos')} · ${brl(x.v)} · vencimento ${dBR(x.venc||ate)} <button class="btn" data-rel-del="${i}">Remover</button></li>`).join('');
  const sel=v=>+hon===v?' selected':'';
  return `<div class="modal-fundo" data-rel-fundo="1"><div class="modal rel" role="dialog" aria-modal="true" aria-labelledby="rel-tit">
  <h2 id="rel-tit" style="margin-top:0">Relatório de dívida · ${esc(L.num)}</h2>
  <div class="rel-ctl"><div><label for="rel-ate">Atualizar até</label><input type="date" id="rel-ate" value="${esc(ate)}"></div>
    <div><label for="rel-hon">Honorários</label><select id="rel-hon"><option value="0"${sel(0)}>Sem honorários</option><option value="10"${sel(10)}>10% (extrajudicial)</option><option value="20"${sel(20)}>20% (judicial)</option></select></div></div>
  <div class="rel-av"><b style="font-size:13px">Outros débitos (opcional)</b><p class="nota" style="margin:2px 0 8px">Reparos da vistoria, condomínio, água, luz ou IPTU pagos pelo locador. Entram com os mesmos juros, multa e atualização desde o vencimento. Não ficam salvos: valem para este relatório.</p>${av?`<ul>${av}</ul>`:''}
    <div class="lin-av"><div class="d"><label for="rel-av-d" class="nota" style="margin:0">Descrição</label><input id="rel-av-d" placeholder="Ex.: Reparos conforme vistoria de saída"></div><div><label for="rel-av-v" class="nota" style="margin:0">Valor (R$)</label><input id="rel-av-v" inputmode="decimal" placeholder="0,00"></div><div><label for="rel-av-venc" class="nota" style="margin:0">Vencimento</label><input id="rel-av-venc" type="date" value="${esc(ate)}"></div><button class="btn" data-rel-add="1">Incluir</button></div></div>
  <div class="rel-doc"><div class="cab"><b>Vivere Imóveis Selecionados</b><span>Inadimplência com composição</span></div>
    <p class="crit">${esc(criterios(r,ate))}</p>
    <p class="cli"><b>${esc(L.num)}</b> · Locatário: ${esc(L.locatario||'—')}<br>Locador: ${esc(L.locador||'—')} · Imóvel: <span data-sens>${esc(L.endereco||'—')}</span></p>
    ${r.blocos.length?`<div class="tabela"><table data-ord-dados="nao"><thead><tr><th>Competência</th><th>Vencimento</th><th class="n">Dias</th><th>Descrição</th><th class="n">Valor</th><th class="n">Saldo</th></tr></thead><tbody>${linhas}<tr class="tot"><td colspan="3">${r.blocos.length} cobrança${r.blocos.length===1?'':'s'}</td><td>Total devido em ${dBR(ate)}</td><td></td><td class="n" data-sens>${nBR(r.total)}</td></tr></tbody></table></div>`:'<p class="nota">Nenhum boleto vencido e não pago nesta data.</p>'}
    <p class="rod">Resumo: boletos e débitos ${brl(r.base)} · atualização ${brl(r.atual)} · juros ${brl(r.juros)} · multa ${brl(r.multa)} · honorários ${brl(r.honV)} · <b>total ${brl(r.total)}</b>.<br>Itens do boleto montados com a ficha da locação (encargos do Alude), fechando no valor de cada boleto do Alude. Juros e multa conforme o cadastro da cobrança no Alude; atualização pelo IGP-M do vencimento até o mês anterior ao do cálculo, com o mês do vencimento proporcional aos dias (critério do Ábacus), sem deflação.${r.faltam.length?` IGP-M ainda não carregado no HUB: ${r.faltam.map(compTxt).join(', ')}.`:''}</p></div>
  <div class="acoes" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-rel-pdf="1"${r.blocos.length?'':' disabled'}>Baixar PDF</button><button class="btn" data-rel-txt="1">Copiar texto</button><button class="btn" data-rel-fechar="1">Fechar</button><span id="rel-msg" class="nota" style="margin:0;align-self:center"></span></div>
  </div></div>`; }
function relTexto(){ const {cod,ate,hon,extras}=REL; const r=calcDivida(cod,ate,hon,extras), L=dadosLoc(cod);
  const t=['VIVERE IMÓVEIS SELECIONADOS — Inadimplência com composição',criterios(r,ate),'',`${L.num} · Locatário: ${L.locatario}`,`Locador: ${L.locador} · Imóvel: ${L.endereco}`,''];
  r.blocos.forEach(b=>{ t.push(`${b.comp?'Competência '+compTxt(b.comp):'Avulso'} · vencimento ${dBR(b.venc)} · ${b.dias} dias${b.obs?' · '+b.obs:''}`); b.linhas.forEach(x=>t.push(`  ${x.d}: R$ ${nBR(x.v)} (saldo R$ ${nBR(x.s)})`)); t.push(''); });
  t.push(`${r.blocos.length} cobrança(s) · TOTAL DEVIDO EM ${dBR(ate)}: R$ ${nBR(r.total)}`); return t.join('\n'); }
function carregaJsPDF(){ if(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API.autoTable) return Promise.resolve(window.jspdf);
  if(JSPDF) return JSPDF;
  const scr=src=>new Promise((ok,er)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>er(new Error('falhou '+src)); document.head.appendChild(s); });
  JSPDF=scr('modulos/vendor/jspdf-2.5.1.umd.min.js').then(()=>scr('modulos/vendor/jspdf-autotable-3.8.2.min.js')).then(()=>window.jspdf);
  JSPDF.catch(()=>{ JSPDF=null; }); return JSPDF; }
async function relPDF(){ const {cod,ate,hon,extras}=REL; const r=calcDivida(cod,ate,hon,extras), L=dadosLoc(cod);
  const {jsPDF}=await carregaJsPDF(); const doc=new jsPDF({unit:'mm',format:'a4'}); const W=doc.internal.pageSize.getWidth();
  doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('VIVERE IMÓVEIS SELECIONADOS',14,16);
  doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.text('Inadimplência com composição',W-14,16,{align:'right'});
  doc.setFontSize(8.5); doc.setTextColor(90); doc.text(doc.splitTextToSize(criterios(r,ate),W-28),14,22);
  doc.setTextColor(20); doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.text(`${L.num} - Locatário: ${L.locatario}`,14,32,{maxWidth:W-28});
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.text(doc.splitTextToSize(`Locador: ${L.locador} · Imóvel: ${L.endereco}`,W-28),14,37);
  const body=[]; r.blocos.forEach(b=>b.linhas.forEach((x,i)=>body.push({cells:[i===0?(b.comp?compTxt(b.comp):'Avulso'):'',i===0?dBR(b.venc):'',i===0?String(b.dias):'',x.d+(i===0&&b.obs?` (${b.obs})`:''),nBR(x.v),nBR(x.s)],ini:i===0,enc:!!x.enc})));
  doc.autoTable({startY:44,head:[['Competência','Vencimento','Dias','Descrição','Valor','Saldo']],body:body.map(x=>x.cells),
    foot:[[{content:`${r.blocos.length} cobrança${r.blocos.length===1?'':'s'}`,colSpan:3},`Total devido em ${dBR(ate)}`,'',nBR(r.total)]],
    theme:'plain',styles:{font:'helvetica',fontSize:8.5,cellPadding:1.6,textColor:20},headStyles:{fontStyle:'bold',fillColor:[236,238,242]},footStyles:{fontStyle:'bold',fillColor:[236,238,242]},
    columnStyles:{0:{cellWidth:22},1:{cellWidth:21},2:{cellWidth:11,halign:'right'},4:{cellWidth:24,halign:'right'},5:{cellWidth:26,halign:'right'}},
    didParseCell:d=>{ if(d.section!=='body') return; const m=body[d.row.index]; if(m.enc&&d.column.index===3){ d.cell.styles.fontStyle='italic'; d.cell.styles.textColor=90; } if(m.ini){ d.cell.styles.lineWidth={top:0.3}; d.cell.styles.lineColor=160; } },
    margin:{left:14,right:14,bottom:20},
    didDrawPage:()=>{ doc.setFontSize(7.5); doc.setTextColor(110); doc.text('Vivere Jurerê Internacional Ltda · CNPJ 63.295.886/0001-68 · CRECI 8883 J · Rua dos Chernes, 90, Sala 01, Jurerê Internacional, Florianópolis/SC, CEP 88053-545 · (48) 99197-9159',W/2,doc.internal.pageSize.getHeight()-10,{align:'center',maxWidth:W-28}); doc.setTextColor(20); } });
  let y=doc.lastAutoTable.finalY+6; doc.setFontSize(8); doc.setTextColor(90);
  const nota=`Resumo: boletos e débitos R$ ${nBR(r.base)} · atualização R$ ${nBR(r.atual)} · juros R$ ${nBR(r.juros)} · multa R$ ${nBR(r.multa)} · honorários R$ ${nBR(r.honV)} · total R$ ${nBR(r.total)}. Itens de cada boleto conforme a ficha da locação e o valor do boleto no Alude; atualização pelo IGP-M do vencimento até o mês anterior ao do cálculo, com o mês do vencimento proporcional aos dias (critério do Ábacus), sem deflação.${r.faltam.length?' IGP-M não disponível no cálculo: '+r.faltam.map(compTxt).join(', ')+'.':''}`;
  const ln=doc.splitTextToSize(nota,W-28); if(y+ln.length*3.6>doc.internal.pageSize.getHeight()-22){ doc.addPage(); y=20; } doc.text(ln,14,y);
  const n=doc.getNumberOfPages(); for(let i=1;i<=n;i++){ doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(110); doc.text(`${i} de ${n}`,W-14,doc.internal.pageSize.getHeight()-5,{align:'right'}); }
  const quem=(L.locatario||'').split(/\s+e\s+/)[0].trim(); const [y4,m2,d2]=ate.split('-');
  let nome=`VIS - Relatório de Dívida - ${L.num.replace('/','-')} - ${quem}`.slice(0,70)+` - ${d2}.${m2}.${y4}.pdf`;
  return {nome,dados:doc.output('blob')}; }
async function baixaRelPDF(btn){ const msg=document.getElementById('rel-msg'); const diz=t=>{ const m=document.getElementById('rel-msg'); if(m) m.textContent=t; };
  const antes=btn.textContent; btn.textContent='Gerando…'; btn.disabled=true;
  try{ const dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;
    const {nome,dados}=await relPDF();
    if(!dl||typeof dl.save!=='function'){ diz('Esta visualização não permite baixar arquivo. Use "Copiar texto".'); return; }
    await dl.save({filename:nome,data:dados}); diz('PDF salvo: '+nome);
  }catch(e){ const c=e&&e.code; diz(c==='declined'?'Download cancelado.':c==='rate_limited'?'Já há um download aguardando confirmação.':'Não foi possível gerar o PDF ('+((e&&e.message)||c||'erro')+').'); }
  finally{ btn.textContent=antes; btn.disabled=false; } }
function abreRel(cod){ REL={cod,ate:hojeISO(),hon:10,extras:[]}; render(); }
document.addEventListener('click',e=>{ if(!e.target.closest) return;
  const a=e.target.closest('[data-rel]'); if(a){ abreRel(a.dataset.rel); return; }
  if(!REL) return;
  if(e.target.closest('[data-rel-fechar]')||e.target.matches('[data-rel-fundo]')){ REL=null; render(); return; }
  const d=e.target.closest('[data-rel-del]'); if(d){ REL.extras.splice(+d.dataset.relDel,1); render(); return; }
  if(e.target.closest('[data-rel-add]')){ const ds=document.getElementById('rel-av-d').value.trim(), vs=document.getElementById('rel-av-v').value.trim(), vc=document.getElementById('rel-av-venc').value||REL.ate;
    const v=parseFloat(vs.replace(/\s|R\$/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.'));
    if(!(v>0)){ const m=document.getElementById('rel-msg'); if(m) m.textContent=v<0?'O débito avulso não pode ser negativo; abatimento entra fora do relatório.':'Informe o valor do débito avulso.'; return; }
    REL.extras.push({desc:ds||'Outros débitos',v:r2(v),venc:vc}); render(); return; }
  const p=e.target.closest('[data-rel-pdf]'); if(p){ baixaRelPDF(p); return; }
  const t=e.target.closest('[data-rel-txt]'); if(t){ copiaTexto(relTexto(),t); return; }
});
document.addEventListener('change',e=>{ if(!REL||!e.target) return;
  if(e.target.id==='rel-ate'&&e.target.value){ REL.ate=e.target.value; render(); }
  else if(e.target.id==='rel-hon'){ REL.hon=+e.target.value; render(); } });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&REL){ REL=null; render(); } });
function listaDevedores(){ const hoje=hojeISO(); const cods=codsDevedores(hoje);
  if(!cods.length) return `<div class="card" style="margin-top:14px"><h2>Locações em atraso</h2><p class="nota" style="margin:0">Nenhum boleto vencido e não pago hoje.</p></div>`;
  const tot={b:0,e:0,t:0};
  const rows=cods.map(cod=>{ const r=calcDivida(cod,hoje,0,[]), L=dadosLoc(cod); const enc=r2(r.atual+r.juros+r.multa); tot.b+=r.base; tot.e+=enc; tot.t+=r.total;
    const bols=r.blocos.map(b=>`<div><b>${compTxt(b.comp)}</b> · venc. ${dBR(b.venc)} · ${b.dias} d · ${brl(b.base)}${b.obs?` · ${esc(b.obs)}`:''}</div>`).join('');
    const pend=b=>b.dias>=params().boleto_vermelho;
    return `<tr id="dev-${esc(cod)}"${destCob===cod?' class="destaque"':''}><td class="cod"><b>${esc(L.num)}</b></td><td>${esc(L.locatario||'—')}<div class="nota" data-sens style="margin:0;font-size:11px">${esc(L.endereco||'')}</div></td><td class="bols">${bols}</td><td class="n">${brl(r.base)}</td><td class="n">${brl(enc)}</td><td class="n"><b${r.blocos.some(pend)?' style="color:var(--bad)"':''}>${brl(r.total)}</b></td><td><button class="btn" data-rel="${esc(cod)}">Relatório de dívida</button></td></tr>`; }).join('');
  return `<div class="card" style="margin-top:14px"><h2>Locações em atraso</h2><p class="nota">Boletos vencidos e não pagos em ${dBR(hoje)}, inclusive os que o Alude deixou de emitir. O total já inclui atualização, juros e multa até hoje, sem honorários. Toque em <b>Relatório de dívida</b> para ver a composição de cada boleto e baixar o PDF.</p>
  <div class="tabela"><table class="dev-lista"><thead class="quebra"><tr><th>Locação</th><th>Locatário</th><th>Boletos em atraso</th><th class="n">Valor dos boletos</th><th class="n">Atualização, juros e multa</th><th class="n">Total hoje</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>`; }
function pCobranca(){
  const B=lista('cobrancas'); if(!B.length) return `<h2>Cobrança e inadimplência</h2>`+vazio('Aguardando a primeira coleta do Alude.');
  const p=params();
  const abertos=B.filter(b=>b.situacao==='atrasada'||b.situacao==='aberta').sort((a,b)=>(b.dias_atraso||0)-(a.dias_atraso||0));
  const atras=abertos.filter(b=>b.situacao==='atrasada'); const tot=atras.reduce((t,b)=>t+(Number(b.valor)||0),0); const enc=atras.reduce((t,b)=>t+(b.multa_est||0)+(b.juros_est||0),0);
  const maior=atras.reduce((m,b)=>(b.dias_atraso||0)>(m?m.dias_atraso||0:-1)?b:m,null); const suspInfo=suspensoes(B); const susp=suspInfo.length;
  const card=(rot,num,sub,al)=>`<div class="card${al?' alerta':''}"><div class="rot" style="font-family:var(--display);text-transform:uppercase;letter-spacing:.16em;font-size:11px;color:var(--muted)">${rot}</div><div class="num">${num}</div><div class="s" style="color:var(--muted);font-size:12px">${sub}</div></div>`;
  const tab=`<div class="resumo-cob">${card('Em atraso',brl(tot),`${atras.length} boleto${atras.length===1?'':'s'} · multa + juros est. ${brl(enc)}`,atras.length>0)}${card('Contratos com atraso',new Set(atras.map(b=>b.cod)).size,[...new Set(atras.map(b=>b.cod))].sort(ordCod).join(', ')||'nenhum',false)}${card('Maior atraso',maior?maior.dias_atraso+' d':'—',maior?`${esc(maior.cod)} · ${mesTxt(maior.competencia)}`:'',maior&&(maior.dias_atraso||0)>=p.boleto_vermelho)}${card('Emissão suspensa',susp,susp?suspInfo.map(s=>`<b>${esc(s.cod)}</b> · ${esc(s.atraso)}`).join('<br>')+'<br>boleto não emitido pelo Alude':'nenhuma',susp>0)}</div><p class="nota">Cada boleto atrasado aparece como item na aba <button class="btn" data-aba="pendencias">Pendências</button>, onde se acompanha e dispensa.</p>`;
  const meses=[...new Set(B.map(b=>b.competencia))].sort().slice(-8);
  const cods=[...new Set(B.map(b=>b.cod))].sort(ordCod);
  const mapa=`<div class="card" style="margin-top:14px"><h2>Últimas competências</h2><div class="mapa" style="--cols:${meses.length};overflow-x:auto"><div class="lin"><span></span>${meses.map(m=>`<span style="text-align:center;color:var(--muted)">${mesTxt(m)}</span>`).join('')}</div>${cods.map(c=>`<div class="lin${destCob===c?' destaque':''}" id="cob-${esc(c)}"><span class="cod">${esc(c)}</span>${meses.map(m=>{const b=B.filter(x=>x.cod===c&&x.competencia===m&&x.situacao!=='cancelada')[0]; return b?`<span class="q ${esc(b.situacao)}" title="${esc(c+' '+m+' — '+b.situacao+(b.dias_atraso?' '+b.dias_atraso+' d':''))}">${b.situacao==='atrasada'?b.dias_atraso:b.baixa_manual?'fora':''}</span>`:'<span class="q"></span>'}).join('')}</div>`).join('')}</div>
  <div class="legenda"><span style="--c:var(--ok-bg)">paga</span><span style="--c:var(--warn-bg)">em aberto</span><span style="--c:var(--bad)">atrasada (dias)</span><span style="--c:var(--soft)">sem boleto</span><span>"fora" = baixa manual no Alude</span></div></div>`;
  return `<h2>Cobrança e inadimplência</h2><p class="nota">Boletos do Alude. Alerta a partir de ${p.boleto_dias} dias de atraso; vermelho a partir de ${p.boleto_vermelho}. Com um aluguel em atraso, o Alude suspende a emissão dos boletos seguintes. A9, A10 e T1 ficam fora do Alude.</p>${blocoRegua()}${tab}${mapa}${listaDevedores()}${relHTML()}`;
}
// Régua do dia (17/11/2026, tarefa vivere-regua-cobranca-carteira; decisão do Cleiton: dentro de Locação › Cobrança): o bloco vem do módulo regua-cobranca
function blocoRegua(){ const m=MODS['regua-cobranca']; if(!m||typeof m.bloco!=='function') return ''; try{ return m.bloco(); }catch(e){ return `<p class="nota">Erro na régua de cobrança: ${esc(e&&e.message||e)}</p>`; } }
function pReceita(){
  const R=lista('receita_mensal').sort((a,b)=>a._id.localeCompare(b._id)).slice(-12);
  if(!R.length) return `<h2>Receita da imobiliária</h2>`+vazio('Aguardando a primeira consolidação.');
  const series=[['adm','Administração','var(--accent)'],['intermediacao','Intermediação','var(--brass)']];
  const W=760,H=240,pl=56,pb=26,pt=10; const max=Math.max(1,...R.map(r=>(r.adm||0)+(r.intermediacao||0)));
  const passo=(()=>{const e=Math.pow(10,Math.floor(Math.log10(max/4)));for(const m of [1,2,2.5,5,10]) if(max/(m*e)<=5) return m*e;return 10*e})();
  const topo=Math.ceil(max/passo)*passo; const y=v=>pt+(H-pt-pb)*(1-v/topo); const bw=(W-pl-10)/R.length;
  let g=''; for(let v=0;v<=topo+1e-6;v+=passo){g+=`<line x1="${pl}" x2="${W-6}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${pl-6}" y="${y(v)+4}" text-anchor="end">${(v/1000).toLocaleString('pt-BR')} mil</text>`}
  R.forEach((r,i)=>{let acc=0; const x=pl+i*bw+bw*.18, w=bw*.64;
    series.forEach(([k,n,c])=>{const v=r[k]||0; if(v>0){g+=`<rect x="${x}" y="${y(acc+v)}" width="${w}" height="${Math.max(0,y(acc)-y(acc+v))}" fill="${c}" data-tip="${esc(mesTxt(r._id)+' · '+n+': '+brl(v))}"/>`; acc+=v;}});
    g+=`<text x="${x+w/2}" y="${H-8}" text-anchor="middle">${mesTxt(r._id)}</text>`});
  const tab=`<div class="tabela" style="margin-top:14px"><table><thead><tr><th>Mês</th><th class="n">Administração</th><th class="n">Intermediação</th><th class="n">Comissões de venda</th><th class="n">Total</th></tr></thead><tbody>${R.slice().reverse().map(r=>`<tr><td>${mesTxt(r._id)}</td><td class="n ${clsVal(r.adm)}">${r.adm?mais(r.adm):'—'}</td><td class="n ${clsVal(r.intermediacao)}">${r.intermediacao?mais(r.intermediacao):'—'}</td><td class="n ${clsVal(r.vendas)}">${r.vendas?mais(r.vendas):'—'}</td><td class="n ${clsVal(r.total)}"><b>${r.total?mais(r.total):'—'}</b></td></tr>`).join('')}</tbody></table></div>`;
  return `<h2>Receita da imobiliária</h2><p class="nota">Administração e intermediação retidas pela Vivere nos repasses do Alude (mês do pagamento) + comissão de venda da imobiliária pela data do contrato (planilha). Valores brutos, antes de nota e corretores.</p>
  <div class="card grafico"><h2>Locação por mês</h2><svg data-sens viewBox="0 0 ${W} ${H}" role="img" aria-label="Receita mensal de locação empilhada">${g}</svg><div class="legenda">${series.map(s=>`<span style="--c:${s[2]}">${s[1]}</span>`).join('')}</div></div>${tab}`;
}
function stVenda(s){const t=String(s||'').toLowerCase(); const c=t.startsWith('pago parcial')?'warn':t.startsWith('pago')?'ok':t.includes('receber')?'bad':'';return `<span class="pill ${c}">${esc(s||'—')}</span>`}
function botaoDrive(url){ return url?`<a class="btn pasta" href="${escUrl(url)}" target="_blank" rel="noopener" title="Abre a pasta do negócio no Drive Central">Abrir no Drive</a>`:''; }
function driveDaVenda(v){ return lista('drive_mapa').find(d=>(d.vendas||[]).includes(v._id)); }
const ESF=[['cert_federal','federal'],['cert_estadual','estadual'],['cert_municipal','municipal'],['cert_trabalhista','trabalhista'],['cert_judicial','TJ']];
function esferas(c){ c=c||{}; const tem=ESF.filter(([k])=>(c[k]||0)>0), falta=ESF.filter(([k])=>!(c[k]||0)).map(x=>x[1]); return `<span title="${falta.length?'Falta: '+esc(falta.join(', ')):'Completo'}">${tem.length} de 5</span>${falta.length&&falta.length<5?`<span class="s">falta ${esc(falta.join(', '))}</span>`:''}`; }
function tabNegociosDrive(){
  const N=lista('drive_mapa').filter(d=>d.tipo==='negocio').sort((a,b)=>String(b.criada||'').localeCompare(String(a.criada||'')));
  if(!N.length) return '';
  const SIT={fechado:['Fechado','ok'],caiu:['Caiu / não seguiu',''],arquivado:['Arquivado','info'],em_andamento:['Em andamento','warn']};
  const linhas=N.map(d=>{ const st=SIT[d.situacao]||[d.situacao||'—','']; const v=(d.vendas||[]).map(id=>S.vendas&&S.vendas[id]).filter(Boolean)[0]; const doc=d.pasta_pc&&S.documentos?S.documentos[d.pasta_pc]:null; const ck=d.checklist||{}; const im=ck.imovel||{};
    return `<tr><td>${imvLk(d.nome||'—',{fonte:'drive',vendas:d.vendas||[]})}${mapaDe('objeto',null,[d.nome,v&&v.objeto])}<span class="s">criada ${dt(d.criada)} · ${d.total_arquivos??'—'} arquivos</span>${botaoDrive(d.link)}</td><td><span class="pill ${st[1]}">${esc(st[0])}</span>${d.ligacao==='sugerido'?'<span class="s">ligação a confirmar</span>':''}</td><td>${v?`${esc(v.objeto||'')}<span class="s">${dt(v.data)}</span>`:'—'}</td><td>${doc&&doc.caminho?botaoPasta(doc.caminho):'—'}</td><td>${esferas(ck.vendedor)}</td><td>${esferas(ck.comprador)}</td><td>${(im.cert_imovel||0)?'matrícula':'<b>sem matrícula</b>'}<span class="s">${(im.cert_municipal||0)?'com municipal':'sem municipal'}</span></td><td>${(d.positivas||[]).length?`<span class="pill ${d.situacao==='em_andamento'?'bad':''}" title="${esc(d.positivas.join('; '))}">${d.positivas.length}</span>`:'—'}${d.obs?`<span class="s">${esc(d.obs)}</span>`:''}</td></tr>`; }).join('');
  return `<h2 style="margin-top:28px">Negócios no Drive (03 Negócios)</h2><p class="nota">Pastas de negócio do Drive Central ligadas à venda e à pasta do contrato no PC. Certidões contadas pelo nome dos arquivos (federal, estadual, municipal, trabalhista e TJ); passe o mouse para ver o que falta. Certidão positiva só vira pendência em negócio em andamento.</p>
  <div class="tabela"><table><thead class="quebra"><tr><th>Pasta no Drive</th><th>Situação</th><th>Venda</th><th>Pasta<br>no PC</th><th>Certidões<br>vendedor</th><th>Certidões<br>comprador</th><th>Imóvel</th><th>Positivas</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
}
function pVendas(){
  const V=lista('vendas').sort((a,b)=>String(b.data||'').localeCompare(String(a.data||'')));
  if(!V.length) return `<h2>Vendas</h2>`+vazio('Aguardando a primeira coleta da planilha.');
  const ano=hojeISO().slice(0,4); const doAno=V.filter(v=>String(v.data||'').startsWith(ano));
  const tot=k=>doAno.reduce((t,v)=>t+(Number(v[k])||0),0);
  return `<h2>Vendas</h2><p class="nota">Espelho de CONTROLE VENDAS (planilha V. Claude). Em ${ano}: ${doAno.length} documentos · valor transacionado ${brl0(tot('valor_transacao'))} · comissão total ${brl0(tot('comissao_total'))} · parte da imobiliária ${brl0(tot('comissao_imob'))}.</p>
  <div class="tabela"><table><thead><tr><th>Data</th><th>Tipo</th><th>Objeto</th><th>Partes</th><th>Corretores</th><th class="n">Valor</th><th class="n">Comissão</th><th class="n">% corr.</th><th class="n">Imob.</th><th class="n">Jurídico (5%)</th><th>Status</th></tr></thead><tbody>${V.map(v=>`<tr id="ven-${esc(v._id)}"${focoLinha==='ven-'+v._id?' class="foco"':''}><td>${dt(v.data)}</td><td>${esc(v.tipo||'—')}</td><td>${imvLk(v.objeto||'—',{fonte:'venda',id:v._id})}${mapaVenda(v)}${(()=>{const c=pastaDaVenda(v), g=driveDaVenda(v); return (c||g)?'<br>'+(c?botaoPasta(c):'')+(g?' '+botaoDrive(g.link):''):''})()}</td><td>${pes(v.vendedor,{fonte:'venda',id:v._id,lado:'vendedor'})}<span class="s">${pes(v.comprador,{fonte:'venda',id:v._id,lado:'comprador'})}</span></td><td>${v.corretores?corsVenda(v.corretores):'—'}</td><td class="n">${brl0(v.valor_transacao)}</td><td class="n ${clsVal(v.comissao_total)}">${v.comissao_total?mais(v.comissao_total):'—'}</td><td class="n">${pct(v.pct_corretores)}</td><td class="n ${clsVal(v.comissao_imob)}">${v.comissao_imob?mais(v.comissao_imob):'—'}</td><td class="n ${clsVal(v.valor_pago??v.esperado_cleiton,true)}">${(v.valor_pago??v.esperado_cleiton)?menos(v.valor_pago??v.esperado_cleiton):'—'}<span class="s">${v.valor_pago==null&&v.esperado_cleiton!=null?'esperado':''}</span></td><td>${stVenda(v.status)}</td></tr>`).join('')}</tbody></table></div>${tabNegociosDrive()}`;
}
function stDoc(s){const m={em_andamento:['Em andamento','warn'],assinado:['Assinado','ok'],arquivado:['Arquivado','info'],nao_seguiu:['Não seguiu',''],indefinido:['A classificar','bad']};const x=m[s]||[s||'—',''];return `<span class="pill ${x[1]}">${esc(x[0])}</span>`}
function pDocumentos(){
  const D=lista('documentos'); if(!D.length) return `<h2>Documentos</h2>`+vazio('Aguardando a primeira varredura das pastas.');
  const areas=[...new Set(D.map(d=>d.area))];
  const L=D.filter(d=>filtroDoc==='todos'||d.status===filtroDoc||d.area===filtroDoc).sort((a,b)=>String(b.modificado_em||'').localeCompare(String(a.modificado_em||'')));
  const sts=['em_andamento','assinado','arquivado','nao_seguiu','indefinido'].filter(s=>D.some(d=>d.status===s));
  return `<h2>Documentos</h2><p class="nota">Status de cada pasta de caso: pasta-mãe da Vivere e "Contratos em Andamento" da área de trabalho (só o que for da Vivere).</p>
  <div class="filtros"><button class="btn" data-fdoc="todos" aria-pressed="${filtroDoc==='todos'}">Todos (${D.length})</button>${sts.map(s=>`<button class="btn" data-fdoc="${s}" aria-pressed="${filtroDoc===s}">${stDoc(s).replace(/<[^>]+>/g,'')} (${D.filter(d=>d.status===s).length})</button>`).join('')}</div>
  <div class="tabela"><table><thead><tr><th>Pasta</th><th>Área</th><th>Status</th><th>Contratos</th><th>Falta</th><th>Modificada</th></tr></thead><tbody>${L.map(d=>`<tr><td>${d.cod?`<span class="cod">${esc(d.cod)}</span> `:''}${imvLk(d.nome,{fonte:'pasta',caminho:d.caminho,cod:d.cod?String(d.cod).split('/')[0]:''})}${d.cod?mapaLocacao((S.contratos_locacao||{})[String(d.cod).split('/')[0]]):''}${d.obs?`<span class="s">${esc(d.obs)}</span>`:''}${botaoPasta(d.caminho)}</td><td>${esc(d.area||'—')}</td><td>${stDoc(d.status)}</td><td>${(d.contratos||[]).map(k=>`${esc(k.tipo)} ${k.assinado?'✓':'○'}`).join('<br>')||'—'}</td><td>${esc((d.faltando||[]).join(', ')||'—')}</td><td>${dt(d.modificado_em)}${d.dias_parada!=null?`<span class="s">${d.dias_parada} d parada</span>`:''}</td></tr>`).join('')}</tbody></table></div>`;
}
function pTarefas(){
  const T=lista('tarefas').sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));
  if(!T.length) return `<h2>Tarefas e sessões</h2>`+vazio('Aguardando a primeira coleta das tarefas agendadas.');
  const st=s=>{const t=String(s||'');return t.includes('SUCCEEDED')?'<span class="pill ok">ok</span>':t.includes('FAIL')?'<span class="pill bad">falhou</span>':t?`<span class="pill">${esc(({PENDING:'pendente',RUNNING:'rodando',IN_PROGRESS:'rodando',QUEUED:'na fila',CANCELLED:'cancelada',CANCELED:'cancelada',SKIPPED:'pulada',TIMEOUT:'tempo esgotado',TIMED_OUT:'tempo esgotado'})[t.replace('ROUTINE_RUN_STATUS_','').toUpperCase()]||t.replace('ROUTINE_RUN_STATUS_','').toLowerCase())}</span>`:'<span class="pill">sem execução</span>'};
  return `<h2>Tarefas e sessões</h2><p class="nota">Rotinas agendadas da Vivere (inclui a do sócio Deivis) e o resultado da última execução. As do escritório e as pessoais ficam fora do HUB.</p>
  <div class="tabela"><table><thead><tr><th>Tarefa</th><th>Área</th><th>Agenda</th><th>Ativa</th><th>Última execução</th><th>Resultado</th><th>Próxima</th></tr></thead><tbody>${T.map(t=>`<tr><td>${esc(t.nome)}</td><td>${esc(t.area||'—')}</td><td><span class="s">${esc(t.agenda||'—')}</span></td><td>${t.ativa?'<span class="pill ok">sim</span>':'<span class="pill">não</span>'}</td><td>${t.ultima&&t.ultima.em?new Date(t.ultima.em).toLocaleString('pt-BR'):'—'}</td><td>${st(t.ultima&&t.ultima.status)}</td><td>${t.proxima?new Date(t.proxima).toLocaleString('pt-BR'):'—'}</td></tr>`).join('')}</tbody></table></div>`;
}
// A antiga aba Comercial › Corretores saiu em 20/10/2026: equipe, Diretoria e números de cada pessoa estão em Cadastros › Pessoas
// (módulo `pessoas`). Links antigos para 'corretores' abrem Pessoas (ABA_ALIAS).
const FIN={A:'Locação anual',V:'Venda',T:'Temporada'};
const finDe=id=>(String(id).match(/_([AVT])(?:_\d+)?$/)||[])[1]||'';
const SEMAC=new Map(); const semAc=t=>{ const k=String(t||''); let r=SEMAC.get(k); if(r===undefined){ if(SEMAC.size>50000) SEMAC.clear(); r=k.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); SEMAC.set(k,r); } return r; }; /* memória de cálculo (02/11/2026, Fatia C) */
function ponte(){ const P=params().ponte_codigos||{}; const m={}; Object.entries(P).forEach(([cod,v])=>{ if(v&&v.imovel){ (m[v.imovel]=m[v.imovel]||[]).push({cod,status:v.status}); } }); return m; }
// 17/11/2026 (vis-hub-app-carregamento-rapido, print do Cleiton): as pendências site_endereco (uma por agenciador) viram UM botão
// 'Sem endereço completo' (grupo virtual grp:site_endereco = todos os refs) e, aberto, uma linha com um botão por agenciador
const ALG_END='grp:site_endereco';
function alertaImv(){ if(fImv.alerta===ALG_END){ const E=alertasSite().filter(x=>x.tipo==='site_endereco'); if(!E.length) return null; const refs=[...new Set(E.flatMap(x=>x.refs))]; return {_id:ALG_END,tipo:'site_endereco',titulo:`Sem endereço completo: ${refs.length} imóveis ativos de ${E.length} agenciadores`,refs}; }
  const p=fImv.alerta&&S.pendencias?S.pendencias[fImv.alerta]:null; return p&&p.refs?p:null; }
function alertasSite(){ return lista('pendencias').filter(x=>x.status==='aberta'&&x.refs&&x.refs.length).sort((a,b)=>({alta:0,media:1,baixa:2}[a.prioridade]??3)-({alta:0,media:1,baixa:2}[b.prioridade]??3)); }
function diasDesde(iso){ return iso?Math.round((new Date(hojeISO()+'T12:00:00')-new Date(String(iso).slice(0,10)+'T12:00:00'))/864e5):null; }
// ---------- características dos anúncios (19/10/2026): coleção mapa_detalhes (fatias d0..d3, {i:{'i-<id>':{...}}}), lida pela rotina do
// módulo Mapa na página pública de cada anúncio (= Imobibrasil publicado). Usado na aba Imóveis e, via HUB.car, na aba Mapa.
let DETJ={s:null,t:{}};
function detImv(id){ const S0=S.mapa_detalhes||{}; if(DETJ.s!==S0){ const t={}; Object.values(S0).forEach(d=>Object.assign(t,(d&&d.i)||{})); DETJ={s:S0,t}; } return DETJ.t['i-'+id]||null; }
const CAR_NUM=[['dorm','dormitorios','Dormitórios'],['suites','suites','Suítes'],['banh','banheiros','Banheiros'],['vagas','vagas','Vagas']];
const CAR_FX=[['priv','area_util','Área privativa (m²)'],['tot','area_total','Área total (m²)'],['cond','condominio','Condomínio (R$)'],['iptu','iptu','IPTU (R$)'],['m2v','_m2v','R$/m² venda'],['m2a','_m2a','R$/m² aluguel']]; // R$/m²: 07/11/2026
const carN=v=>{ const s=String(v==null?'':v).replace(/[^\d,.]/g,''); if(!s) return 0; return +(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s.replace(/\.(?=\d{3}(\D|$))/g,''))||0; };
function carAtivos(c){ c=c||{}; return CAR_NUM.filter(([k])=>+c[k]>0).length+CAR_FX.reduce((n,[k])=>n+(carN(c[k+'Min'])?1:0)+(carN(c[k+'Max'])?1:0),0)+(c.com||[]).length+(c.ci||[]).length+(c.pos||[]).length; }
function carOk(d,c,id){ if(!carAtivos(c)) return true; d=d||{};
  for(const [k,f] of CAR_NUM) if(+c[k]>0&&!((+d[f]||0)>=+c[k])) return false;
  for(const [k,f] of CAR_FX){ const mn=carN(c[k+'Min']), mx=carN(c[k+'Max']); if(!(mn||mx)) continue; const v=f[0]==='_'?m2Campo(id,f):d[f]; if(!(v>0&&(!mn||v>=mn)&&(!mx||v<=mx))) return false; }
  for(const x of c.com||[]) if(!(d.comodos||[]).includes(x)) return false;
  for(const x of c.ci||[]) if(!(d.cond_itens||[]).includes(x)) return false;
  if((c.pos||[]).length&&!(c.pos||[]).some(x=>(d.posicao||[]).includes(x))) return false;
  return true; }
function carTexto(d){ d=d||{}; return [...(d.comodos||[]),...(d.cond_itens||[]),...(d.posicao||[])].join(' '); }
function carResumo(d,semEnc){ if(!d) return ''; const m=v=>String(v).replace('.',','); const r=v=>'R$ '+Math.round(v).toLocaleString('pt-BR');
  return [d.dormitorios&&d.dormitorios+' dorm.',d.suites&&d.suites+(d.suites>1?' suítes':' suíte'),d.banheiros&&d.banheiros+' banh.',d.vagas&&d.vagas+(d.vagas>1?' vagas':' vaga'),
    d.area_util?m(d.area_util)+' m² priv.':d.area&&m(d.area)+' m²',d.area_total&&m(d.area_total)+' m² total',!semEnc&&d.condominio&&'cond. '+r(d.condominio),!semEnc&&d.iptu&&'IPTU '+r(d.iptu)].filter(Boolean).join(' · '); }
// encargos do anúncio (condomínio e IPTU de mapa_detalhes), coluna própria na aba Anúncios do site (20/10/2026)
function carEncargos(d){ if(!d) return ''; const r=v=>'R$ '+Math.round(v).toLocaleString('pt-BR'); return [d.condominio&&'Cond. '+r(d.condominio),d.iptu&&'IPTU '+r(d.iptu)].filter(Boolean).map((x,i)=>i?`<span class="s">${esc(x)}</span>`:esc(x)).join(''); }
/* ---------- R$/m² de área privativa (07/11/2026, pedido do Cleiton; marca m2-privativa-20261107) ----------
   Valor de venda (ou do aluguel anual) ÷ área privativa, calculado na página (sem campo no banco). Área, nesta ordem: cadastro do imóvel
   no HUB (CRM › Imóveis), depois a área privativa do anúncio no site (sem ela, a área do anúncio). Fica de fora: temporada, terreno, lote,
   gleba, sítio, chácara, fazenda e área fora de 10 a 3.000 m². O painel do corretor usa a mesma regra (painel.js, m2De). */
const M2_FORA=/^(terreno|lote|gleba|area|sitio|chacara|fazenda)/;
let M2C={t:0,m:new Map()};
function m2Area(id){ const now=Date.now(); if(now-M2C.t>1500) M2C={t:now,m:new Map()}; if(M2C.m.has(id)) return M2C.m.get(id);
  const x=(S.imoveis||{})[id]||{}; let r=null;
  try{ const M=window.HUB_IMOVEIS; const uid=M&&M.id?M.id({fonte:'anuncio',id}):''; const u=uid&&M.unidade?M.unidade(uid):null;
    const t=u?((u.ficha&&u.ficha.dados&&u.ficha.dados.area_privativa)||(u.d&&u.d.area_privativa)):''; const a=carN(t); if(a>=10&&a<=3000) r={a,fonte:'cadastro do imóvel'}; }catch(e){ r=null; }
  if(!r&&!M2_FORA.test(semAc(x.tipo||''))){ const d=detImv(id)||{}; const a=+d.area_util||+d.area||0; if(a>=10&&a<=3000) r={a,fonte:d.area_util?'anúncio do site':'área do anúncio'}; }
  M2C.m.set(id,r); return r; }
function m2Anu(id){ const x=(S.imoveis||{})[id]; if(!x) return null; const f=finDe(id); if(f!=='V'&&f!=='A') return null; if(!(+x.valor>0)) return null;
  const ar=m2Area(id); return ar?{v:+x.valor/ar.a,a:ar.a,fonte:ar.fonte,fin:f}:null; }
const m2Fx=(a,b)=>'R$ '+Math.round(a).toLocaleString('pt-BR')+' – '+Math.round(b).toLocaleString('pt-BR')+'/m²';
const m2Fmt=v=>v==null||!isFinite(v)?'':'R$ '+Math.round(v).toLocaleString('pt-BR')+'/m²';
function m2Tit(id){ const x=(S.imoveis||{})[id]||{}, m=m2Anu(id); return m?`${brl0(x.valor)} ÷ ${String(Math.round(m.a*100)/100).replace('.',',')} m² (${m.fonte})`:''; }
function m2Stats(vals){ const v=(vals||[]).filter(n=>n>0).sort((a,b)=>a-b); if(!v.length) return null; const n=v.length;
  return {n,media:v.reduce((a,b)=>a+b,0)/n,mediana:n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2,min:v[0],max:v[n-1]}; }
// bairro e prédio de um anúncio: prédio = empreendimento ligado; sem ele, o nome entre parênteses do endereço; sem ele, rua e número
function m2Grupo(id){ const x=(S.imoveis||{})[id]||{}; let p='';
  try{ const E=selosEmp(id); if(E.length) p=E[0].nome; }catch(e){}
  if(!p){ const m=String(x.endereco||'').match(/\(([^()]+)\)\s*$/); if(m) p=m[1].trim(); }
  if(!p){ const r=String(x.endereco||'').split(' — ')[0].trim(); if(/\d/.test(r)) p=r; }
  return {bairro:String(x.bairro||'').trim()||'',predio:p}; }
// faixa de um conjunto de anúncios (empreendimento): {V:{n,media,...}, A:{...}}
function m2Faixa(ids){ const o={}; ['V','A'].forEach(f=>{ const s=m2Stats((ids||[]).map(m2Anu).filter(m=>m&&m.fin===f).map(m=>m.v)); if(s) o[f]=s; }); return o; }
// valor do filtro de Características (_m2v = venda, _m2a = aluguel)
function m2Campo(id,f){ const m=id?m2Anu(id):null; return m&&m.fin===(f==='_m2v'?'V':'A')?m.v:null; }
// célula R$/m² da aba Anúncios do site (uma linha por finalidade com área; inativo marcado)
function m2Celula(A){ const out=['V','A'].map(f=>{ const V=A.filter(x=>finDe(x._id)===f); const vs=V.map(x=>{ const m=m2Anu(x._id); return m?`<span title="${esc(m2Tit(x._id))}">${m2Fmt(m.v)}${x.ativo?'':'<span class="s">inativo</span>'}</span>`:''; }).filter(Boolean);
    return vs.length?`<div class="vlin"><span>${FIN_VAL[f]}:</span><span class="vr">${vs.join(' / ')}</span></div>`:''; }).join('');
  return out||'<span class="s" style="display:inline" title="Sem área privativa no anúncio nem no cadastro do imóvel (ou terreno/temporada)">—</span>'; }
// bloco "R$/m² médio por bairro e por prédio" (segue os filtros e a busca da aba)
function m2Bloco(anus){ const L={V:[],A:[]}; let tot=0;
  anus.forEach(x=>{ const f=finDe(x._id); if(f!=='V'&&f!=='A') return; tot++; const m=m2Anu(x._id); if(m) L[f].push({x,m}); });
  const fins=['V','A'].filter(f=>L[f].length); if(!fins.length) return '';
  const tab=(f,tipo)=>{ const G=new Map(); L[f].forEach(({x,m})=>{ const g=m2Grupo(x._id)[tipo]; if(!g) return; if(!G.has(g)) G.set(g,[]); G.get(g).push(m.v); });
    const R=[...G.entries()].map(([g,v])=>[g,m2Stats(v)]).sort((a,b)=>b[1].n-a[1].n||b[1].media-a[1].media);
    if(!R.length) return '<p class="nota">Sem dados.</p>';
    const t=Rs=>`<div class="tabela"><table class="m2-tab"><thead><tr><th>${tipo==='bairro'?'Bairro':'Prédio / empreendimento'}</th><th class="n">Anúncios</th><th class="n">Média</th><th class="n">Mínimo – máximo</th></tr></thead><tbody>${Rs.map(([g,s])=>`<tr><td>${esc(g)}</td><td class="n">${s.n}</td><td class="n"><b>${m2Fmt(s.media)}</b></td><td class="n">${s.n>1?`${m2Fx(s.min,s.max)}`:'—'}</td></tr>`).join('')}</tbody></table></div>`;
    return R.length>10?`${t(R.slice(0,10))}<details class="m2-todos"><summary>Ver todos os ${R.length} ${tipo==='bairro'?'bairros':'prédios'}</summary>${t(R)}</details>`:t(R); };
  const geral=f=>{ const s=m2Stats(L[f].map(o=>o.m.v)); return `<span class="pill info">${FIN_VAL[f]}: média ${m2Fmt(s.media)} · ${s.n}</span>`; };
  return `<details class="m2-med"${fImv.m2ab?' open':''}><summary><b>R$/m² médio por bairro e por prédio</b> <span class="s" style="display:inline">${L.V.length+L.A.length} de ${tot} anúncios de venda e aluguel deste filtro têm área privativa</span> ${fins.map(geral).join(' ')}</summary>
    ${fins.map(f=>`<h3 class="m2-h">${FIN_VAL[f]}</h3><div class="m2-gr"><div>${tab(f,'bairro')}</div><div>${tab(f,'predio')}</div></div>`).join('')}
    <p class="nota" style="margin:8px 0 0">Valor do anúncio ÷ área privativa (cadastro do imóvel no HUB ou anúncio do site). Segue os filtros e a busca acima. Sem temporada, terrenos e lotes. Cada tabela mostra os 10 com mais anúncios; Ver todos abre a lista inteira. Toque no cabeçalho para ordenar.</p></details>`; }
document.addEventListener('toggle',e=>{ const t=e.target; if(t&&t.matches&&t.matches('details.m2-med')) fImv.m2ab=t.open; },true);
function carOpcoes(ids){ const com={}, ci={}, pos={}; ids.forEach(id=>{ const d=detImv(id); if(!d) return; (d.comodos||[]).forEach(x=>com[x]=(com[x]||0)+1); (d.cond_itens||[]).forEach(x=>ci[x]=(ci[x]||0)+1); (d.posicao||[]).forEach(x=>pos[x]=(pos[x]||0)+1); });
  const ord=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'pt-BR')); return {com:ord(com),ci:ord(ci),pos:ord(pos)}; }
// HTML dos filtros: campos com id `${pref}-<chave>` (evento input) e botões data-carcom="pref|com|valor" / data-cartog="pref" (evento click)
function carFiltrosHTML(c,pref,ids){ c=c||{}; const n=carAtivos(c), o=carOpcoes(ids||[]), aberto=c._open||n>0;
  const sel=(k,rot)=>`<label class="car-c">${rot}<select id="${pref}-${k}">${['','1','2','3','4','5'].map(v=>`<option value="${v}"${String(c[k]||'')===v?' selected':''}>${v?v+'+':'—'}</option>`).join('')}</select></label>`;
  const fx=(k,rot)=>`<label class="car-c">${rot}<span class="car-fx"><input id="${pref}-${k}Min" inputmode="decimal" placeholder="de" value="${esc(c[k+'Min']||'')}"><input id="${pref}-${k}Max" inputmode="decimal" placeholder="até" value="${esc(c[k+'Max']||'')}"></span></label>`;
  const chips=(lst,tipo,rot)=>lst.length?`<div class="car-lista"><span class="rot">${rot}</span>${lst.slice(0,40).map(([v,q])=>`<button class="btn car-chip" type="button" data-carcom="${esc(pref)}|${tipo}|${esc(v)}" aria-pressed="${(c[tipo]||[]).includes(v)}">${esc(v)} <span class="s" style="display:inline">${q}</span></button>`).join('')}</div>`:'';
  return `<details class="car"${aberto?' open':''}><summary data-cartog="${esc(pref)}">Características <b class="car-n">${n?`(${n} filtro${n>1?'s':''})`:''}</b><span class="s" style="display:inline"> — quartos, áreas, R$/m², condomínio, IPTU, cômodos</span></summary>
    <div class="car-grade">${CAR_NUM.map(([k,,r])=>sel(k,r+' (mín.)')).join('')}${CAR_FX.map(([k,,r])=>fx(k,r)).join('')}</div>
    ${chips(o.com,'com','Cômodos (tem):')}${chips(o.ci,'ci','Condomínio (tem):')}${chips(o.pos,'pos','Posição solar (qualquer uma):')}
    ${n?`<button class="btn" type="button" data-carlimpa="${esc(pref)}">Limpar características</button>`:''}
    ${!o.com.length&&!o.ci.length?'<p class="nota">Cômodos e áreas aparecem depois da coleta das páginas dos anúncios (rotina do Mapa).</p>':''}</details>`; }
// trata um evento dos filtros acima; devolve true se mudou algo
function carEvento(e,pref,c){
  const t=e.target; if(e.type==='input'&&t.id&&t.id.startsWith(pref+'-')){ c[t.id.slice(pref.length+1)]=t.value;
    const nb=t.closest('details.car'), cn=nb&&nb.querySelector('.car-n'), n=carAtivos(c); if(cn) cn.textContent=n?`(${n} filtro${n>1?'s':''})`:''; return true; }
  if(e.type!=='click') return false;
  const b=t.closest('[data-carcom]'); if(b){ const [p,tipo,v]=b.dataset.carcom.split('|'); if(p!==pref) return false; const L=c[tipo]=(c[tipo]||[]).slice(); const i=L.indexOf(v); if(i<0) L.push(v); else L.splice(i,1); c._open=true; return true; }
  const g=t.closest('[data-cartog]'); if(g&&g.dataset.cartog===pref){ e.preventDefault(); c._open=!(c._open||carAtivos(c)>0&&g.parentNode.open); return true; }
  const l=t.closest('[data-carlimpa]'); if(l&&l.dataset.carlimpa===pref){ Object.keys(c).forEach(k=>{ if(k!=='_open') delete c[k]; }); return true; }
  return false; }
function filtraImoveis(){
  BT=[]; BA_HIT.clear();
  // SO_ATIVOS_20261118 (pedido do Cleiton, 18/11/2026): Anúncios do site = só anúncio ATIVO no site; os inativos ficam em Cadastros › Imóveis
  if(fImv.foco&&fImv.foco.length){ const fs=new Set(fImv.foco); return lista('imoveis').filter(x=>x.ativo&&fs.has(x._id)); }
  const q=semAc(fImv.q).trim(); const pt=ponte(); const al=alertaImv();
  if(al){ const ordem=new Map(al.refs.map((r,i)=>[r,i])); return lista('imoveis').filter(x=>x.ativo&&ordem.has(x._id)&&(!q||semAc([x.ref,x.bairro,x.endereco,x.corretor,x.proprietario,x.corretor?nomeCorPes(x.corretor):'',x.proprietario?nomePes(x.proprietario,{fonte:'imovel',id:x._id}):''].join(' ')).includes(q))).sort((a,b)=>ordem.get(a._id)-ordem.get(b._id)); }
  BT=baTermos(fImv.q);
  return lista('imoveis').filter(x=>{ const f=finDe(x._id);
    if(fImv.fin!=='todas'&&f!==fImv.fin) return false;
    if(fImv.de&&!(x.cadastrado_em&&x.cadastrado_em>=fImv.de)) return false; if(fImv.ate&&!(x.cadastrado_em&&x.cadastrado_em<=fImv.ate)) return false;
    if(!x.ativo) return false;
    const dd=detImv(x._id); if(!carOk(dd,fImv.c,x._id)) return false;
    if(!BT.length) return true;
    const cods=(pt[x._id]||[]).map(c=>c.cod).join(' '), rc=endCompleto(x._id);
    const txt=semAc([x.ref,x.tipo,x.bairro,x.cidade,x.endereco,rc&&rc.consulta,x.corretor,x.proprietario,x.corretor?nomeCorPes(x.corretor):'',x.proprietario?nomePes(x.proprietario,{fonte:'imovel',id:x._id}):'',cods,carTexto(dd)].join(' '));
    const hit=baAtende(BT,x,dd,txt); if(!hit.size) return false; BA_HIT.set(x._id,hit); return true;
  }).sort((a,b)=>String(b.cadastrado_em||'').localeCompare(String(a.cadastrado_em||''))||ordCod(a.ref,b.ref));
}
/* ---------- busca ampla dos Anúncios do site (25/10/2026, pedido do Cleiton) ----------
   Termos separados por vírgula, ponto-e-vírgula, ponto final ou quebra de linha. Basta atender a UM termo; a lista vem
   ordenada por quantos termos cada imóvel atende (até alguém escolher uma coluna). Dentro de cada termo:
   "2 dorm" / "3 quartos" / "1 suíte" / "2 banheiros" / "2 vagas" = número exato (características do anúncio);
   valores ("1 milhão e 500", "1,5 mi", "800 mil", "1.500.000", "R$ 950.000") = faixa de 20% para baixo e para cima;
   o que sobra é texto (bairro, rua, cômodo, item do condomínio, ref., corretor, proprietário…). */
let BT=[]; const BA_HIT=new Map();
const BA_NUM=[['dormitorios',/(\d+)\s*(?:dormitorios?|dormes?|dorms?|quartos?|qtos?|dts?)(?![a-z])/g,n=>n+(n==1?' dorm.':' dorm.')],
  ['suites',/(\d+)\s*suites?(?![a-z])/g,n=>n+(n==1?' suíte':' suítes')],['banheiros',/(\d+)\s*(?:banheiros?|banhs?|bwc|wc)(?![a-z])/g,n=>n+' banh.'],['vagas',/(\d+)\s*vagas?(?![a-z])/g,n=>n+(n==1?' vaga':' vagas')]];
const BA_CONECT=new Set('e com de do da dos das no na nos nas em ou ate r$ reais imovel imoveis valor'.split(' '));
const numBR=s=>{ s=String(s); if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return +s.replace(/\./g,'').replace(',','.'); return +s.replace(',','.'); };
const soDig=s=>String(s||'').replace(/\D/g,'');
// 26/10/2026: CPF, CNPJ, telefone, CEP e e-mail viram termos próprios (antes, "123.456.789-00" virava valor)
function baTermos(q){ const out=[];
  String(q||'').split(/[;\n]|,(?!\d)|(?<!\d),/).forEach(parte=>{ let p=parte;
    p=p.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*/g,m=>{ out.push({tipo:'mail',e:m.toLowerCase(),rot:m}); return ' '; });
    p=p.replace(/(?:\+?55\s?)?\(?\d[\d.\-\/()\s]{3,}\d/g,m=>{ const d=soDig(m), fmt=/[-\/()]/.test(m), pontos=/\./.test(m);
      if(d.length>=10||(d.length>=8&&(fmt||!pontos))||(d.length>=5&&fmt&&!/^\d{1,3}(\.\d{3})+$/.test(m.trim()))){ out.push({tipo:'doc',d,rot:m.trim()}); return ' '; } return m; });
    if(p.trim()) baTermos0(p).forEach(t=>out.push(t)); });
  const vis=new Set(); return out.filter(x=>{ const k=JSON.stringify([x.tipo,x.campo,x.n,x.v,x.s,x.d,x.e]); if(vis.has(k)) return false; vis.add(k); return true; }); }
function baTermos0(q){ const out=[];
  String(q||'').split(/[;\n]|,(?!\d)|(?<!\d),|\.(?!\d)|(?<!\d)\./).forEach(parte=>{ let t=semAc(parte).replace(/\s+/g,' ').trim(); if(!t) return;
    BA_NUM.forEach(([campo,re,rot])=>{ t=t.replace(re,(m,n)=>{ out.push({tipo:'num',campo,n:+n,rot:rot(+n)}); return ' '; }); });
    t=t.replace(/(\d+(?:[.,]\d+)?)\s*(?:milhoes|milhao|mi|mm)(?![a-z])(?:\s*e\s*(\d{1,3})(?:\s*mil)?(?![a-z\d]))?/g,(m,a,b)=>{ out.push(baValor(numBR(a)*1e6+(b?+b*1e3:0))); return ' '; });
    t=t.replace(/(\d+(?:[.,]\d+)?)\s*(?:mil|k)(?![a-z])/g,(m,a)=>{ out.push(baValor(numBR(a)*1e3)); return ' '; });
    t=t.replace(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{5,}(?:,\d{1,2})?)(?![\d.,])/g,(m,a)=>{ const v=numBR(a); if(v>=10000){ out.push(baValor(v)); return ' '; } return m; });
    const w=t.split(' ').filter(Boolean); while(w.length&&BA_CONECT.has(w[0])) w.shift(); while(w.length&&BA_CONECT.has(w[w.length-1])) w.pop();
    const s=w.join(' '); if(s.length>=2){ const ws=new Set(w), orig=parte.trim().split(/\s+/).filter(p=>ws.has(semAc(p).replace(/[^a-z0-9$]/g,''))).join(' ');
      out.push({tipo:'txt',s,rot:orig||s}); } });
  const vis=new Set(); return out.filter(x=>{ const k=JSON.stringify([x.tipo,x.campo,x.n,x.v,x.s]); if(vis.has(k)) return false; vis.add(k); return true; }); }
/* ---------- dados pessoais no HUB (26/10/2026, decisão do Cleiton): pessoas_dados (fatias d0..dN, {p:{id:{nome,pj,cpf,cnpj,rg,telefones,emails,fontes}}}).
   A busca acha a pessoa pelo CPF/telefone/e-mail e marca toda linha da aba que a cita (pelo id da pessoa ou pelo nome). */
let PDJ={s:null,m:{}};
const nomeN=s=>' '+semAc(s).replace(/[^a-z0-9]+/g,' ').trim()+' ';
function pessoasDados(){ const S0=S.pessoas_dados||{}; if(PDJ.s!==S0){ const m={}; Object.values(S0).forEach(d=>Object.assign(m,(d&&d.p)||{})); PDJ={s:S0,m}; } return PDJ.m; }
function docsDe(x){ return [...(x.cpf||[]),...(x.cnpj||[]),...(x.rg||[]).map(soDig),...(x.telefones||[])].filter(Boolean); }
function pessoasDoTermo(t){ if(t._p) return t._p; const M=pessoasDados(), ids=new Set();
  Object.entries(M).forEach(([id,x])=>{ if(t.tipo==='doc'?docsDe(x).some(d=>d.includes(t.d)):(x.emails||[]).some(e=>e.includes(t.e))) ids.add(id); });
  t._p={ids,nomes:[...ids].map(id=>nomeN(M[id].nome)).filter(n=>n.trim().length>=5)}; return t._p; }
// texto (bruto) e ids de pessoa de uma linha/cartão × termo de documento ou e-mail
function docHit(t,txt,ids){ const P=pessoasDoTermo(t);
  if((ids||[]).some(id=>P.ids.has(id))) return true;
  const tn=nomeN(txt); if(P.nomes.some(n=>tn.includes(n))) return true;
  if(t.tipo==='mail') return String(txt||'').toLowerCase().includes(t.e);
  return t.d.length>=4&&(String(txt||'').match(/\d[\d.\-\/()]*\d|\d/g)||[]).some(r=>soDig(r).includes(t.d)); }
// casamento genérico de um texto com os termos (abas sem busca própria): texto, documento, e-mail, quartos/vagas no texto e valores do texto ±20%
function valoresTxt(txt){ const out=[]; String(txt||'').replace(/R\$\s*([\d.]+(?:,\d+)?)|(\d+(?:,\d+)?)\s*(mi|mil)\b|(?<![\d.,])(\d{1,3}(?:\.\d{3})+(?:,\d+)?)(?![\d.,])/gi,(m,a,b,u,c)=>{ let v=a?numBR(a):b?numBR(b)*(u.toLowerCase()==='mi'?1e6:1e3):numBR(c); if(v>0) out.push(v); return m; }); return out; }
function atendeTexto(T,txt,ids){ const h=new Set(); let tn=null, vs=null;
  T.forEach((t,i)=>{ if(t.tipo==='doc'||t.tipo==='mail'){ if(docHit(t,txt,ids)) h.add(i); return; }
    if(t.tipo==='txt'){ if(tn==null) tn=semAc(txt); if(tn.includes(t.s)) h.add(i); return; }
    if(t.tipo==='num'){ if(tn==null) tn=semAc(txt); const re=new RegExp('(^|\\D)'+t.n+'\\s*(?:'+({dormitorios:'dorm|quarto',suites:'su[ií]te',banheiros:'banh',vagas:'vaga'}[t.campo]||'x')+')','i'); if(re.test(tn)) h.add(i); return; }
    if(vs==null) vs=valoresTxt(txt); if(vs.some(v=>v>=t.min&&v<=t.max)) h.add(i); });
  return h; }
function baValor(v){ const f=n=>n>=1e6?'R$ '+(n/1e6).toLocaleString('pt-BR',{maximumFractionDigits:2})+' mi':brl0(n); return {tipo:'valor',v,min:v*0.8,max:v*1.2,rot:f(v)+' ± 20%',tit:'de '+brl0(v*0.8)+' a '+brl0(v*1.2)}; }
function baAtende(T,x,dd,txt){ const h=new Set(); T.forEach((t,i)=>{ if(t.tipo==='doc'||t.tipo==='mail'){ if(docHit(t,(x.proprietario?nomePes(x.proprietario,{fonte:'imovel',id:x._id})+' ':'')+(x.proprietario||'')+' '+(x.corretor||''),[])) h.add(i); return; } if(t.tipo==='txt'?txt.includes(t.s):t.tipo==='num'?(dd&&+dd[t.campo]===t.n):(x.valor!=null&&+x.valor>=t.min&&+x.valor<=t.max)) h.add(i); }); return h; }
function baDoGrupo(A){ const s=new Set(); A.forEach(x=>(BA_HIT.get(x._id)||[]).forEach(i=>s.add(i))); return s; }
/* ---------- ordenação por coluna dos Anúncios (todas as páginas, não só a da tela) ---------- */
const ORD_IMV={ref:['Ref.',A=>refA(A).ref],fin:['Finalidade',A=>FIN_ORD.filter(f=>A.some(x=>finDe(x._id)===f)).map(f=>FIN[f]).join(' ')],bairro:['Bairro / endereço',A=>refA(A).bairro],
  valor:['Valor',A=>{ const fs=fImv.fin!=='todas'?[fImv.fin]:FIN_ORD; for(const f of fs){ const v=A.filter(x=>finDe(x._id)===f&&x.valor!=null).map(x=>+x.valor); if(v.length) return Math.max(...v); } return null; }],
  m2:['R$/m²',A=>{ const fs=fImv.fin==='V'||fImv.fin==='A'?[fImv.fin]:['V','A']; for(const f of fs){ const v=A.filter(x=>finDe(x._id)===f).map(x=>m2Anu(x._id)).filter(Boolean).map(m=>m.v); if(v.length) return Math.max(...v); } return null; }],
  enc:['Encargos',A=>{ const d=A.map(x=>detImv(x._id)).find(d=>d&&(d.condominio||d.iptu)); return d?(+d.condominio||+d.iptu||null):null; }],
  ag:['Agenciador',A=>{ const x=A.find(x=>x.corretor); return x?nomeCorPes(x.corretor):null; }],pr:['Proprietário',A=>{ const x=A.find(x=>x.proprietario); return x?nomePes(x.proprietario,{fonte:'imovel',id:x._id}):null; }],
  cad:['Cadastro',A=>A.map(x=>x.cadastrado_em).filter(Boolean).sort()[0]||null],atu:['Atualizado',A=>A.map(x=>x.atualizado_em).filter(Boolean).sort().pop()||null],
  sit:['Situação',A=>A.filter(x=>x.ativo).length]};
function refA(A){ return A.find(x=>x.ativo&&x.endereco)||A.find(x=>x.ativo)||A.find(x=>x.endereco)||A[0]; }
// compara dois valores de coluna: vazio sempre no fim; número com número, o resto como texto (pt-BR, com números naturais)
function cmpOrd(a,b,dir){ const va=a==null||a==='', vb=b==null||b===''; if(va||vb) return va&&vb?0:va?1:-1;
  const r=typeof a==='number'&&typeof b==='number'?a-b:String(a).localeCompare(String(b),'pt-BR',{numeric:true,sensitivity:'base'}); return dir==='asc'?r:-r; }
function proxOrd(o,k){ return !o||o.k!==k?{k,dir:'desc'}:o.dir==='desc'?{k,dir:'asc'}:null; }
function thOrd(attr,k,rot,o,extra){ const d=o&&o.k===k?o.dir:''; return `<th class="ord"${extra||''} ${attr}="${k}" tabindex="0" role="button"${d?` data-dir="${d}" aria-sort="${d==='asc'?'ascending':'descending'}"`:''} title="Ordenar: 1º clique maior → menor, 2º menor → maior, 3º volta à ordem original">${rot}</th>`; }
// selos que os módulos põem em cada imóvel (ex.: Portais = "no portal"); clicar abre a aba do módulo naquele item
// (19/10/2026) o selo do módulo Empreendimentos vai para a coluna do endereço (selosEmp); os demais seguem na Situação
function selosImovel(id,soEmp){ return Object.values(MODS).filter(m=>typeof m.selos==='function'&&ABAS.some(a=>a[0]===m.id)&&(soEmp===undefined||(m.id==='empreendimentos')===!!soEmp)).map(m=>{ try{ return (m.selos(id)||[]).map(z=>`<br><button class="pill ${esc(z.cls||'info')} selo" data-selo-mod="${esc(m.id)}" data-selo-alvo="${esc(z.alvo||'')}" title="${esc(z.titulo||'Abrir na aba '+((ABAS.find(a=>a[0]===m.id)||[])[1]||''))}">${esc(z.txt)}</button>`).join(''); }catch(e){ return ''; } }).join(''); }
function selosEmp(id){ const m=MODS.empreendimentos; if(!m||typeof m.selos!=='function'||!ABAS.some(a=>a[0]==='empreendimentos')) return []; try{ return (m.selos(id)||[]).map(z=>({alvo:z.alvo||'',nome:String(z.txt||'').replace(/^empreend\.:\s*/i,''),titulo:z.titulo||'Abrir a ficha do empreendimento'})); }catch(e){ return []; } }
// botão 🗺 "ver no mapa do HUB" ao lado do 📍 (25/10/2026, pedido do Cleiton): abre a aba Mapa já no ponto do item
// (alvo = id do item no módulo mapa: i-<anúncio>, l-<código de locação>, v-<venda>, e-<empreendimento>)
function btnHubMapa(alvo){ return alvo&&MODS.mapa&&ABAS.some(a=>a[0]==='mapa')?`<button class="lk mapa hubmapa" type="button" data-hubmapa="${esc(alvo)}" title="Ver no mapa do HUB" aria-label="Ver no mapa do HUB">🗺</button>`:''; }
function irMapaHub(alvo){ const m=MODS.mapa; if(!m||!ABAS.some(a=>a[0]==='mapa')) return; aba='mapa'; try{localStorage.setItem('hubv.aba',aba)}catch(_){}; render(); window.scrollTo(0,0); if(typeof m.foco==='function'){ try{ m.foco(alvo); }catch(_){} } }
// endereço completo (rua, número, bairro, cidade e CEP) resolvido pelo módulo link-mapa — o mesmo do 📍 e do mapa
function endCompleto(id){ try{ const L=window.HUB_LINKMAPA; const r=L&&L.imovel?L.imovel(id):null; return r&&r.consulta?r:null; }catch(e){ return null; } }
function enderecoImovel(x){ const E=selosEmp(x._id), end=String(x.endereco||'').trim(), so=s=>semAc(s).replace(/[^a-z0-9]+/g,'');
  const btn=E.map(e=>`<button class="lk emp selo" data-selo-mod="empreendimentos" data-selo-alvo="${esc(e.alvo)}" title="${esc(e.titulo)}">🏢 ${esc(e.nome)}</button>`).join(' ');
  const soNome=end&&E.some(e=>so(end)===so(e.nome)); // endereço do cadastro é só o nome do empreendimento: mostra só o botão
  const rc=endCompleto(x._id), uni=(end.split(' — ')[1]||'').trim(), endMostra=rc&&rc.qual!=='so_bairro'?rc.consulta+(uni?' · '+uni:''):end;
  const txt=soNome&&!(rc&&rc.log)?'':(endMostra?imvLk(endMostra,{fonte:'anuncio',id:x._id}):esc(E.length?'':'sem endereço no cadastro'));
  return `<span class="s">${txt?`<span data-sens>${txt}</span>`:''}${txt&&btn?' · ':''}${btn}<span class="mapas">${mapaDe('imovel',x._id,[x.endereco,x.bairro].filter(Boolean).join(', '))}${btnHubMapa('i-'+x._id)}</span></span>`; }
// (20/10/2026) uma linha por ref: venda, locação anual e temporada da mesma ref juntas (unificação dos cadastros no HUB);
// os filtros valem por anúncio e a linha mostra todos os anúncios da ref
const FIN_ORD=['V','A','T'], FIN_VAL={V:'Venda',A:'Aluguel anual',T:'Aluguel temporada'}, FIN_CURTO={V:'venda',A:'anual',T:'temporada'};
let GREF={s:null,m:null};
function refKey(x){ return String(x.ref||'').trim().toUpperCase()||x._id; }
function gruposRef(){ const S0=S.imoveis; if(GREF.s!==S0){ const m=new Map(); lista('imoveis').forEach(x=>{ const k=refKey(x); if(!m.has(k)) m.set(k,[]); m.get(k).push(x); });
  m.forEach(L=>L.sort((a,b)=>FIN_ORD.indexOf(finDe(a._id))-FIN_ORD.indexOf(finDe(b._id)))); GREF={s:S0,m}; } return GREF.m; }
function agrupaRef(L){ const G=gruposRef(), vis=new Set(), out=[]; L.forEach(x=>{ const k=refKey(x); if(vis.has(k)) return; vis.add(k); out.push(G.get(k)||[x]); }); return out; }
// (18/11/2026, tarefa vis-site-24) cadastro único no site: código do imóvel no site próprio quando é outro (refs juntadas no
// cadastro) e as modalidades desligadas no Cadastros › Imóveis (anúncio com site_oculto); a regra mora no módulo cadastro-imoveis
function siteUnico(A,p){ try{ const M=window.HUB_IMOVEIS; const c=M&&M.codigoSite?M.codigoSite(p._id):null;
  const fora=A.filter(x=>x.ativo&&x.site_oculto===true).map(x=>FIN_CURTO[finDe(x._id)]||'').filter(Boolean);
  const t=[c&&c.codigo&&c.codigo!==String(p.ref||'').toUpperCase()?'no site: '+c.codigo:'', fora.length?'fora do site próprio: '+fora.join(', '):'', c&&c.juntar?'refs a juntar':''].filter(Boolean).join(' · ');
  return t?`<span class="s">${esc(t)}</span>`:''; }catch(e){ return ''; } }
function linhaRef(A){ const p=A.find(x=>x.ativo&&x.endereco)||A.find(x=>x.ativo)||A.find(x=>x.endereco)||A[0]; const pt=ponte(), varios=A.length>1;
  const rot=x=>varios?` · ${FIN_CURTO[finDe(x._id)]||''}`:'';
  const cods=[...new Map(A.flatMap(x=>pt[x._id]||[]).map(c=>[c.cod,c])).values()];
  const pc=cods.map(c=>`<span class="cod" title="${c.status==='confirmado'?'confirmado':'a confirmar'}">${esc(c.cod)}${c.status==='confirmado'?'':'?'}</span>`).join(' ');
  const uid=(()=>{ try{ const M=window.HUB_IMOVEIS; return M&&M.id?M.id({fonte:'anuncio',id:p._id}):''; }catch(e){ return ''; } })();
  const links=A.map(x=>`${x.link_site?`<a class="lk site" href="${escUrl(x.link_site)}" target="_blank" rel="noopener" title="Anúncio no site viverenapraia.com.br">Site Vivere${rot(x)}</a>`:`<span class="lk off" title="Sem anúncio publicado no site">sem anúncio${rot(x)}</span>`}${x.imobibrasil_id?`<a class="lk imob" href="${IMOB}${encodeURIComponent(x.imobibrasil_id)}" target="_blank" rel="noopener" title="Cadastro no painel do Imobibrasil (precisa estar logado)">Imobibrasil${rot(x)}</a>`:''}`).join('');
  const fins=FIN_ORD.filter(f=>A.some(x=>finDe(x._id)===f)).map(f=>FIN[f]); const det=A.map(x=>detImv(x._id)).find(Boolean);
  const valor=FIN_ORD.map(f=>{ const V=A.filter(x=>finDe(x._id)===f); if(!V.length) return `<div class="vlin vaz"><span>${FIN_VAL[f]}:</span><span class="vr">-</span></div>`;
    return `<div class="vlin"><span>${FIN_VAL[f]}:</span><span class="vr">${V.map(x=>(x.valor==null?'-':(f==='V'?brl0(x.valor):brl(x.valor)))+(x.ativo?'':'<span class="s">inativo</span>')).join(' / ')}</span></div>`; }).join('');
  const enc=A.map(x=>carEncargos(detImv(x._id))).find(Boolean)||'—';
  const uni=(L,kf,hf)=>{ const m=new Map(); L.forEach(x=>{ const k=kf(x); if(!k) return; if(!m.has(k)) m.set(k,{x,f:[]}); m.get(k).f.push(FIN_CURTO[finDe(x._id)]); }); const V=[...m.values()];
    if(!V.length) return '—'; return V.map(o=>hf(o.x)+(V.length>1?`<span class="s" style="display:inline"> (${esc(o.f.join(', '))})</span>`:'')).join('<br>'); };
  const ag=uni(A.filter(x=>x.corretor),x=>chaveCorretor(x.corretor)||semAc(x.corretor),x=>pesCor(x.corretor));
  const pr=uni(A.filter(x=>x.proprietario),x=>semAc(nomePes(x.proprietario,{fonte:'imovel',id:x._id})),x=>pes(x.proprietario,{fonte:'imovel',id:x._id}));
  const cad=A.map(x=>x.cadastrado_em).filter(Boolean).sort()[0]; const atu=A.map(x=>x.atualizado_em).filter(Boolean).sort().pop();
  const sit=(varios?A.map(x=>`<span class="pill ${x.ativo?'ok':''}" title="${esc(FIN[finDe(x._id)]||'')}">${esc(FIN_CURTO[finDe(x._id)]||'')} ${x.ativo?'ativo':'inativo'}</span>`).join(' '):(p.ativo?'<span class="pill ok">Ativo</span>':'<span class="pill">Inativo</span>'))+(A.some(x=>x.ativo&&x.destaque_site===true)?' <span class="pill warn" title="Na vitrine Imóveis selecionados da home do site">⭐ destaque</span>':'');
  const foto=(()=>{ try{ const F=window.HUB_FICHA; if(!F||!F.capa) return ''; const o=[...A].sort((a,b)=>(b.ativo?1:0)-(a.ativo?1:0)).map(x=>F.capa(x._id)).find(Boolean); return o||''; }catch(e){ return ''; } })();
  return `<tr><td class="ta-foto">${foto?`<img src="${esc(foto)}" alt="Foto de ${esc(p.ref||'')}" loading="lazy">`:'<span class="sem">sem foto</span>'}</td><td class="cod">${uid?`<button class="lk imv" data-imovel-u="${esc(uid)}" title="Abrir a ficha do imóvel">${esc(p.ref)}</button>`:esc(p.ref)}${pc?`<span class="s">${pc}</span>`:''}${siteUnico(A,p)}${baMostra()?(h=>`<span class="ba-hit" title="${esc([...h].map(i=>BT[i].tit||BT[i].rot).join(' · '))}">atende ${h.size} de ${BT.length}: ${esc([...h].sort((a,b)=>a-b).map(i=>BT[i].rot).join(' · '))}</span>`)(baDoGrupo(A)):''}<div class="lnk-ref">${links}</div></td><td>${esc(fins.join(' · ')||p.finalidade||'—')}<span class="s">${esc(p.tipo||'')}</span>${(r=>r?`<span class="s">${esc(r)}</span>`:'')(carResumo(det,true))}${(c=>c.length?`<span class="s" title="${esc(c.join(', '))}">Cômodos: ${esc(c.slice(0,6).join(', '))}${c.length>6?'…':''}</span>`:'')([...new Set(A.flatMap(x=>(detImv(x._id)||{}).comodos||[]))])}</td><td>${esc(p.bairro||'—')}${p.cidade&&p.cidade!=='Florianópolis'?' · '+esc(p.cidade):''}${enderecoImovel(p)}</td><td>${valor}</td><td class="m2c">${m2Celula(A)}</td><td style="white-space:nowrap">${enc}</td><td>${ag}</td><td>${pr}</td><td>${dt(cad)}</td><td>${atu?`${dt(atu)}<span class="s">${(d=>d===0?'hoje':d+' dia'+(d===1?'':'s'))(diasDesde(atu))}</span>`:'—'}</td><td>${sit}${A.map(x=>selosImovel(x._id,false)).join('')}</td></tr>`; }
const baMostra=()=>BT.length>1||BT.some(t=>t.tipo!=='txt');
// ajuda fixa da busca ampla (25/10/2026, pedido do Cleiton): deixar claro ao corretor que a busca não precisa ser precisa
const BA_EX=['Campeche, 2 dorm, 1,5 milhão, Lagoa, Rio Tavares','Jurerê 3 quartos 2 vagas','churrasqueira, piscina, 800 mil','apartamento, 2 suítes, 2 milhões'];
function baAjuda(semEx){ return `<div class="ba-ajuda"><p><b>Busca ampla: não precisa ser exato.</b> Escreva do jeito que o cliente pediu, separando por vírgula. O HUB traz <b>todo imóvel que atende a pelo menos um termo</b> e mostra primeiro os que atendem mais.</p>
  <ul><li><b>Lugar ou característica</b> (bairro, rua, empreendimento, cômodo, item do condomínio, ref.): <i>Campeche</i>, <i>churrasqueira</i>, <i>piscina</i>, <i>AP381</i></li>
  <li><b>CPF, CNPJ, telefone</b> (com ou sem pontos) ou <b>e-mail</b> do proprietário</li>
  <li><b>Quartos, suítes, banheiros, vagas</b>: <i>2 dorm</i>, <i>3 quartos</i>, <i>1 suíte</i>, <i>2 vagas</i> — número exato</li>
  <li><b>Valor</b>: <i>1 milhão e 500</i>, <i>1,5 mi</i>, <i>800 mil</i>, <i>R$ 950.000</i> — o HUB procura <b>20% para baixo e para cima</b> (1,5 milhão = de R$ 1,2 mi a R$ 1,8 mi); dois valores = duas faixas</li></ul>
  ${semEx?'':`<div class="ba-ex"><span>Toque para testar:</span>${BA_EX.map(x=>`<button class="btn" type="button" data-imvex="${esc(x)}">${esc(x)}</button>`).join('')}</div>`}</div>`; }
function tabImoveis(){
  const F0=filtraImoveis(), L=agrupaRef(F0).map(A=>A.filter(x=>x.ativo)).filter(A=>A.length), POR=fImv.por||100;
  if(baMostra()){ const sc=new Map(L.map(A=>[A,baDoGrupo(A).size])); L.sort((a,b)=>sc.get(b)-sc.get(a)); } // estável: empate mantém a ordem de cadastro
  if(fImv.ord&&ORD_IMV[fImv.ord.k]){ const fk=ORD_IMV[fImv.ord.k][1], ch=new Map(L.map(A=>[A,fk(A)])); L.sort((a,b)=>cmpOrd(ch.get(a),ch.get(b),fImv.ord.dir)); }
  const nPg=Math.max(1,Math.ceil(L.length/POR)); if(fImv.pg>nPg-1) fImv.pg=nPg-1; const ini=fImv.pg*POR, fim=Math.min(L.length,ini+POR);
  const crit=baMostra()?`<div class="ba-crit"><span>Busca ampla — basta atender a um termo; a lista vem por quantos termos cada imóvel atende:</span>${BT.map(t=>`<span class="pill info" title="${esc(t.tit||'')}">${esc(t.rot)}</span>`).join('')}</div>`:'';
  if(!L.length) return crit+vazio(carregado.imoveis?'Nenhum imóvel com esse filtro.':'Aguardando a coleta do Imobibrasil.');
  const linhas=L.slice(ini,fim).map(linhaRef).join('');
  const nav=lugar=>`<div class="pag imv-pag"><button class="btn" data-imvpg="-99999" data-lugar="${lugar}" aria-label="Primeira página" title="Primeira página" ${fImv.pg===0?'disabled':''}>&laquo;</button><button class="btn" data-imvpg="-1" data-lugar="${lugar}" aria-label="Página anterior" ${fImv.pg===0?'disabled':''}>&lt;</button><span>${ini+1}–${fim} de ${L.length} imóve${L.length===1?'l':'is'}${nPg>1?` · página ${fImv.pg+1} de ${nPg}`:''}</span><button class="btn" data-imvpg="1" data-lugar="${lugar}" aria-label="Próxima página" ${fImv.pg>=nPg-1?'disabled':''}>&gt;</button><button class="btn" data-imvpg="99999" data-lugar="${lugar}" aria-label="Última página" title="Última página" ${fImv.pg>=nPg-1?'disabled':''}>&raquo;</button><span class="pp" role="group" aria-label="Imóveis por página"><span>Por página</span>${[50,100].map(n=>`<button class="btn" type="button" data-imvpor="${n}" data-lugar="${lugar}" aria-pressed="${fImv.por===n}">${n}</button>`).join('')}</span></div>`;
  return `${crit}${m2Bloco(F0)}${nav('cima')}
  <div class="tabela"><table class="anu" data-ord-dados="1" data-cartao-largo="1"><thead><tr><th class="ta-foto" aria-label="Foto"></th>${Object.entries(ORD_IMV).map(([k,[rot]])=>thOrd('data-ordimv',k,esc(rot),fImv.ord)).join('')}</tr></thead><tbody>${linhas}</tbody></table></div>${nPg>1?nav('baixo'):''}`;
}
function pImoveis(){
  const T=lista('imoveis').filter(x=>x.ativo); const GR=[...gruposRef().values()].map(A=>A.filter(x=>x.ativo)).filter(A=>A.length); const n=f=>GR.filter(A=>A.some(x=>finDe(x._id)===f)).length;
  const b=(k,v,t)=>`<button class="btn" data-fimv="${k}:${v}" aria-pressed="${fImv[k]===v}">${t}</button>`;
  return `<h2>Anúncios do site (Imobibrasil)</h2><p class="nota"><b>Só os anúncios ativos no site.</b> Os inativos, os locados, os vendidos e os demais cadastrados ficam em <b>Cadastros › Imóveis</b>. Cadastro do Imobibrasil, que alimenta o site, com <b>uma linha por ref.</b>: venda, aluguel anual e temporada da mesma ref. ficam juntos (no Imobibrasil ainda são cadastros separados). Clique na ref. para abrir a ficha do imóvel (CRM › Imóveis); abaixo dela aparecem o código da Vivere (A1…) quando já ligado (com "?" = a confirmar) e os links: "Site Vivere" abre o anúncio publicado; "Imobibrasil" abre o cadastro no painel (precisa estar logado). Contatos do proprietário não ficam aqui: peça ao Claude.</p>
  <div class="filtros"><input id="imv-q" type="search" placeholder="Ex.: Campeche, 2 dorm, 1,5 milhão, Lagoa — não precisa ser exato" value="${esc(fImv.q)}" style="flex:1 1 260px;min-width:0;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit"></div>
  ${baAjuda(true)}
  <div class="filtros">${b('fin','todas',`Todas (${GR.length})`)}${b('fin','A',`Locação anual (${n('A')})`)}${b('fin','V',`Venda (${n('V')})`)}${b('fin','T',`Temporada (${n('T')})`)}</div>
  <div id="imv-car">${carFiltrosHTML(fImv.c,'imvc',T.filter(x=>x.ativo).map(x=>x._id))}</div>
  ${(()=>{ const A=alertasSite(); if(!A.length) return ''; const al=alertaImv(); const E=A.filter(p=>p.tipo==='site_endereco'), A2=A.filter(p=>p.tipo!=='site_endereco'); const nE=new Set(E.flatMap(p=>p.refs)).size, abreE=fImv.alerta===ALG_END||E.some(p=>p._id===fImv.alerta); return `<div class="filtros datas"><span class="rot">Alertas do site:</span>${A2.map(p=>`<button class="btn" data-imvalerta="${esc(p._id)}" aria-pressed="${fImv.alerta===p._id}" title="${esc(p.titulo)}">${esc(rotTipo(p.tipo))}${p.tipo==='site_anuncio_parado'?(p.filtro==='parado_venda'?' · venda':' · locação'):p.filtro==='sem_corretor'?' · sem corretor':p.filtro==='sem_proprietario'?' · sem proprietário':''} (${p.refs.length})</button>`).join('')}${E.length?`<button class="btn" data-imvalerta="${ALG_END}" aria-pressed="${fImv.alerta===ALG_END}" aria-expanded="${abreE}" title="Imóveis ativos sem rua ou número no Imobibrasil, por agenciador">Sem endereço completo (${nE})</button>`:''}${al?`<button class="btn" data-imvalerta="">Limpar alerta</button>`:''}</div>${E.length&&abreE?`<div class="filtros datas"><span class="rot">Por agenciador:</span>${E.slice().sort((a,b)=>b.refs.length-a.refs.length||String(a.corretor||'').localeCompare(String(b.corretor||''),'pt-BR')).map(p=>`<button class="btn" data-imvalerta="${esc(p._id)}" aria-pressed="${fImv.alerta===p._id}" title="${esc(p.detalhe||p.titulo)}">${esc(p.corretor||String(p.titulo||'').split(' — ')[0]||p._id)} (${p.refs.length})</button>`).join('')}</div>`:''}${al?`<p class="nota" style="margin:4px 0 8px"><b>${esc(al.titulo)}.</b> Os demais filtros ficam de lado enquanto o alerta está ligado; a busca continua valendo.</p>`:''}`; })()}
  <div class="filtros datas"><span class="rot">Cadastro no Imobibrasil:</span>${[['0','Qualquer data'],['30','Últimos 30 dias'],['90','Últimos 90 dias'],['ano','Este ano']].map(([v,t])=>`<button class="btn" data-imvper="${v}" aria-pressed="${(fImv.per||'0')===v&&!(!fImv.de&&v!=='0')}">${t}</button>`).join('')}<label>de <input id="imv-de" type="date" value="${esc(fImv.de)}"></label><label>até <input id="imv-ate" type="date" value="${esc(fImv.ate)}"></label></div>
  ${fImv.foco&&fImv.foco.length?`<div class="aviso" style="margin:0 0 10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span><b>${esc(fImv.focoTxt||'Imóvel selecionado')}</b> — os demais filtros ficam de lado.</span><button class="btn" data-imvfoco="">Mostrar todos os imóveis</button></div>`:''}
  <div id="imv-res">${tabImoveis()}</div>`;
}
let CHC={c:null,p:null,m:null};
function chaveCorretor(nm){ const c0=S.corretores, p0=(S.controle||{}).parametros; if(CHC.c!==c0||CHC.p!==p0||!CHC.m) CHC={c:c0,p:p0,m:new Map()};
  const k0=String(nm==null?'':nm); if(CHC.m.has(k0)) return CHC.m.get(k0); const r0=chaveCorretor0(nm); CHC.m.set(k0,r0); return r0; }
function chaveCorretor0(nm){ nm=String(nm||'').trim(); if(!nm||nm.startsWith('(')) return ''; const CI=params().corretores_info||{}; const ex=params().imobibrasil_corretores||{};
  let k=Object.entries(ex).find(([n])=>n.toLowerCase()===nm.toLowerCase()); if(k) return k[1];
  // nome completo bate com o cadastro (ex.: "Fernanda Crissie" ≠ "Fernanda Silva"): só depois disso o primeiro nome decide (19/10/2026)
  { const C0=S.corretores||{}; const kn=Object.keys(C0).find(c=>[C0[c].nome_completo,C0[c].nome].some(n=>n&&semAc(n).trim()===semAc(nm))); if(kn) return kn; }
  let k1=semAc(nm.split(/\s+/)[0]).replace(/[^a-z0-9]+/g,'-'); const vistos=new Set(); while(CI[k1]&&CI[k1].alias_de&&!vistos.has(k1)){vistos.add(k1); k1=CI[k1].alias_de;}
  const C=S.corretores||{}; if(C[k1]) return k1; const c=Object.keys(C).filter(x=>x.split('-')[0]===k1); return c.length===1?c[0]:'nome:'+semAc(nm); }
function nomeCorretor(k){ if(!k) return '—'; if(k.startsWith('nome:')) return k.slice(5); const c=(S.corretores||{})[k]; return c?c.nome:k; }
const STL={vendido:['vendido','ok'],visita:['visita','ok'],em_contato:['em contato','info'],sem_retorno:['sem retorno','warn'],descartado:['descartado',''],outro:['outro',''],sem_registro:['sem registro','']};
// leads que os módulos acrescentam à aba Leads (ex.: Portais = leads do CanalPro ainda fora das planilhas). Mesmo formato de leads_contatos.
// Captação em dois lados (01/11/2026): módulos com o gancho imoveisCaptados() entregam o imóvel de quem TEM (proprietário que
// anuncia direto, ainda NÃO AGENCIADO). Entra no cruzamento de quem PROCURA com selo próprio, sem Ofertar e sem link do anúncio.
function extraCaptados(){ const out=[]; Object.values(MODS).forEach(m=>{ if(typeof m.imoveisCaptados!=='function') return; try{ (m.imoveisCaptados()||[]).forEach(x=>out.push(Object.assign({},x,{origem:'captado',_mod:m.id}))); }catch(e){} }); return out; }
let CAPTC={k:null,ctx:null,ids:null};
// recalcula só quando muda alguma coleção dos módulos que entregam captados (o banco troca o objeto a cada atualização)
function ctxCapt(){ const ms=Object.values(MODS).filter(m=>typeof m.imoveisCaptados==='function'), ids=ms.flatMap(m=>(m.colecoes||[]).map(c=>S[c])).concat([S.leads_contatos,S.crm_leads,S.oportunidades]);
  if(CAPTC.ctx&&CAPTC.ids&&CAPTC.ids.length===ids.length&&CAPTC.ids.every((v,i)=>v===ids[i])) return CAPTC.ctx;
  const L=extraCaptados(); const k=JSON.stringify(L.map(x=>[x.id,x.fin,x.tipo,x.bairro,x.valor,x.dorm,x.area,x.situacao,x.corretor_nome]));
  CAPTC={k,ids,ctx:{itens:L,porId:new Map(L.map(x=>[x.id,x])),empPorId:new Map(),empDaCampanha:()=>null}}; return CAPTC.ctx; }
// casa um perfil de quem procura com os captados: só com bairro definido (sem bairro casaria com tudo)
function captDoPerfil(p,max){ if(!p||!(p.bairros||[]).length) return []; return OP.casar(p,ctxCapt(),{max:max||20,relaxa:false,folga:0.2}).map(x=>Object.assign({},x,{alerta:''})); }
let INTC={k:null,m:null};
function interessadosCapt(){ ctxCapt(); const k=[CAPTC.k,S.leads_contatos,S.crm_leads,S.oportunidades,S.imoveis,S.empreendimentos_fichas,extraLeads().length];
  if(INTC.m&&INTC.k&&INTC.k.every((v,i)=>v===k[i])) return INTC.m; const m=new Map();
  leadsOp().forEach(l=>{ if(!l.aberto||l.lado==='tem') return; const o=opsHub(l); (o.capt||[]).forEach(x=>{ const a=m.get(x.it.id)||[]; a.push({id:l.id,nome:l.nome,corretor:l.corretor||'',campanha:l.campanha||''}); m.set(x.it.id,a); }); });
  INTC={k,m}; return m; }
function extraLeads(){ const out=[]; Object.values(MODS).forEach(m=>{ if(typeof m.leads!=='function') return; try{ (m.leads()||[]).forEach(x=>out.push(Object.assign({_mod:m.id},x))); }catch(e){} }); return out; }
function leadsTodos(){ return lista('leads_contatos').concat(extraLeads()); }
function campanhasExtras(E){ const m={}; E.forEach(x=>{ const k=x.campanha||'(módulo)'; const c=m[k]=m[k]||{_id:'extra-'+k,campanha:k,planilha:x.planilha||'',canal:x.canal||'',total:0,por_corretor:{},status:{},origem:{},primeiro_corretor:{},imoveis:{},eventos:[],primeiro:null,ultimo:null,extra:true};
  c.total++; const cor=x.corretor||'(sem corretor)'; c.por_corretor[cor]=(c.por_corretor[cor]||0)+1; if(x.status) c.status[x.status]=(c.status[x.status]||0)+1;
  if(x.mes){ if(!c.primeiro||x.mes<c.primeiro) c.primeiro=x.mes; if(!c.ultimo||x.mes>c.ultimo) c.ultimo=x.mes; } if(x.imovel) String(x.imovel).split(/,\s*/).forEach(i=>{ if(i) c.imoveis[i]=(c.imoveis[i]||0)+1; }); });
  return Object.values(m); }
function mesclaResumo(R,E){ if(!E.length) return R; const r=JSON.parse(JSON.stringify(R)); r.total_linhas=(r.total_linhas||0)+E.length; r.campanhas=(r.campanhas||0)+campanhasExtras(E).length;
  E.forEach(x=>{ const cor=x.corretor||'(sem corretor)'; r.por_corretor=r.por_corretor||{}; r.por_corretor[cor]=(r.por_corretor[cor]||0)+1; r.por_canal=r.por_canal||{}; r.por_canal[x.canal||'Outros']=(r.por_canal[x.canal||'Outros']||0)+1; if(x.mes){ r.por_mes=r.por_mes||{}; r.por_mes[x.mes]=(r.por_mes[x.mes]||0)+1; } });
  r.fontes=(r.fontes||[]).concat([...new Set(E.map(x=>x.planilha).filter(Boolean))]); return r; }
/* Interesse do lead (07/11/2026, pedido do Cleiton; mesmos valores do painel do corretor). Campo `interesse` (vem do painel pela
   rotina para crm_leads). Sem o campo: captação (papel e finalidade) → finalidade do perfil → campanha de empreendimento à venda
   (Meta-Ads, Repasses) = Comprador, como na carga de 07/11 → senão "A definir". O deduzido aparece com borda tracejada. */
const INTERESSES=[['comprador','Comprador','🔎 Comprador','procura'],['locatario_anual','Locatário anual','🔎 Locatário anual','procura'],['locatario_temporada','Locatário temporada','🔎 Locatário temporada','procura'],['vendedor','Vendedor','🏠 Vendedor','tem'],['locador_anual','Locador anual','🏠 Locador anual','tem'],['locador_temporada','Locador temporada','🏠 Locador temporada','tem'],['a_definir','A definir','❔ A definir','def']];
const INT_POR=Object.fromEntries(INTERESSES.map((x,i)=>[x[0],{i,rot:x[1],curto:x[2],lado:x[3]}]));
const finInt=(f)=>{ const s=semAc(String(f||'')).toLowerCase(); return /temp/.test(s)?'temporada':/loc|alug|anual/.test(s)?'anual':/vend|compr/.test(s)?'venda':''; };
function intOp(c,id){ const o=(S.oportunidades||{})[id]; return o&&INT_POR[o.interesse]?Object.assign({},c||{},{interesse:o.interesse}):c; }
function intHub(x,c){ x=x||{}; c=c||{}; const dado=INT_POR[c.interesse]?c.interesse:INT_POR[x.interesse]?x.interesse:''; if(dado) return {k:dado,conf:true};
  const pb=x.perfil_busca||{}, fp=finInt((c.perfil||{}).fin||(c.perfil||{}).finalidade||pb.finalidade||pb.fin), p=x.papel||'';
  let k='';
  if(p==='vendedor') k='vendedor';
  else if(p==='locador') k=fp==='temporada'?'locador_temporada':fp==='anual'?'locador_anual':'a_definir';
  else if(p==='comprador') k='comprador';
  else if(p==='locatario') k=fp==='temporada'?'locatario_temporada':fp==='anual'?'locatario_anual':'a_definir';
  else if(fp) k=fp==='venda'?'comprador':fp==='anual'?'locatario_anual':'locatario_temporada';
  else if(/meta.?ads|repasse/i.test(String(x.campanha||c.campanha||''))) k='comprador';
  return {k:k||'a_definir',conf:false}; }
function pillIntK(r){ if(!r) return ''; const x=INT_POR[r.k]; return `<span class="pill int-${x.lado}${r.conf?'':' int-ded'}" title="Interesse: ${esc(x.rot)}${r.conf?'':' (deduzido; o corretor confirma no painel)'}">${esc(x.curto)}</span>`; }
function chipsInt(ctx,lista,sel){ const n={}; lista.forEach(r=>{ n[r.k]=(n[r.k]||0)+1; });
  return `<div class="filtros int-filtros" role="group" aria-label="Filtrar por interesse"><button class="btn" data-hubint="${ctx}|" aria-pressed="${!sel}">Todos os interesses (${lista.length})</button>${INTERESSES.filter(([k])=>n[k]||sel===k).map(([k,,curto])=>`<button class="btn" data-hubint="${ctx}|${k}" aria-pressed="${sel===k}">${esc(curto)} (${n[k]||0})</button>`).join('')}</div>`; }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-hubint]'); if(!b) return; const [c,k]=b.dataset.hubint.split('|');
  const f=c==='funil'?fCRM:c==='leads'?fLeads:fOp; f.int=(f.int===k||!k)?'':k; if('pg' in f) f.pg=0; render(); });
(function(){ const st=document.createElement('style'); st.textContent='.pill.int-tem{background:var(--ok-bg);color:var(--ok)}.pill.int-def{background:transparent;color:var(--muted);border:1px dashed var(--line)}.pill.int-ded{outline:1px dashed var(--line);outline-offset:-1px}.int-filtros{margin:0 0 10px;flex-wrap:wrap}.int-filtros .btn{white-space:nowrap}'; document.head.appendChild(st); })();
function filtraLeads(semInt){ const q=semAc(fLeads.q).trim(); const crmI=S.crm_leads||{};
  return leadsTodos().map(x=>Object.assign({},x,{_int:intHub(x,intOp(crmI[x._id],x._id))})).filter(x=>(semInt||!fLeads.int||x._int.k===fLeads.int)&&(!fLeads.cor||chaveCorretor(x.corretor)===fLeads.cor)&&(!fLeads.camp||x.campanha===fLeads.camp)&&(!fLeads.mes||x.mes===fLeads.mes)&&(!fLeads.st||(x.status||'sem_status')===fLeads.st)&&(!q||semAc([x.nome,x.progresso,x.imovel].join(' ')).includes(q)))
    .sort((a,b)=>String(b.data||'').localeCompare(String(a.data||''))||String(a.nome).localeCompare(String(b.nome)))
    .sort((a,b)=>{ const o=fLeads.ord; if(!o||!ORD_LEAD[o.k]) return 0; const f=ORD_LEAD[o.k][1]; return cmpOrd(f(a),f(b),o.dir); }); }
const ORD_LEAD={data:['Data',x=>x.data||null],nome:['Lead',x=>x.nome||null],campanha:['Campanha',x=>x.campanha||null],corretor:['Corretor',x=>x.corretor?nomeCorPes(x.corretor):null],
  status:['Status /<br>progresso',x=>(STL[x.status]||[])[0]||null],imovel:['Imóvel',x=>x.imovel||null],tambem:['Também<br>em',x=>(x.tambem_em||[]).length?x.tambem_em.join(', '):null]};
function tabLeads(){ const L=filtraLeads(), POR=qAba()?1e9:pagTam(), nPg=Math.max(1,Math.ceil(L.length/POR)); if(fLeads.pg>nPg-1) fLeads.pg=nPg-1; const ini=fLeads.pg*POR, fim=Math.min(L.length,ini+POR);
  if(!L.length) return vazio(carregado.leads_contatos?'Nenhum lead com esse filtro.':'Aguardando a coleta dos leads.');
  const nav=`<div class="pag"><button class="btn" data-leadpg="-99999" ${fLeads.pg===0?'disabled':''} aria-label="Primeira página" title="Primeira página">&laquo;</button><button class="btn" data-leadpg="-1" ${fLeads.pg===0?'disabled':''} aria-label="Página anterior">&lt;</button><span>${ini+1}–${fim} de ${L.length} lead${L.length===1?'':'s'}${nPg>1?` · página ${fLeads.pg+1} de ${nPg}`:''}</span><button class="btn" data-leadpg="1" ${fLeads.pg>=nPg-1?'disabled':''} aria-label="Próxima página">&gt;</button><button class="btn" data-leadpg="99999" ${fLeads.pg>=nPg-1?'disabled':''} aria-label="Última página" title="Última página">&raquo;</button><span class="pp" role="group" aria-label="Itens por página"><span>Por página</span>${[50,100].map(n=>`<button class="btn" type="button" data-pagsel="${n}" aria-pressed="${pagTam()===n}">${n}</button>`).join('')}</span></div>`;
  const linhas=L.slice(ini,fim).map(x=>{ const st=STL[x.status]; return `<tr><td>${x.data?dt(x.data):'—'}</td><td>${esc(x.nome)} ${pillIntK(x._int)}</td><td>${esc(x.campanha)}<span class="s">${esc(x.canal||'')}${x.origem?' · '+esc(x.origem):''}</span></td><td>${x.corretor?pesCor(x.corretor):'—'}${x.primeiro_corretor?`<span class="s">1º atendimento: ${esc(x.primeiro_corretor)}</span>`:''}</td><td>${st?`<span class="pill ${st[1]}">${st[0]}</span>`:'—'}${x.progresso?`<span class="s">${esc(x.progresso)}</span>`:''}</td><td>${esc(x.imovel||'—')}</td><td>${(x.tambem_em||[]).length?esc(x.tambem_em.join(', ')):'—'}</td></tr>`; }).join('');
  return `${nav}<div class="tabela"><table data-ord-dados="1"><thead class="quebra"><tr>${Object.entries(ORD_LEAD).map(([k,[rot]])=>thOrd('data-ordlead',k,rot,fLeads.ord)).join('')}</tr></thead><tbody>${linhas}</tbody></table></div>${nPg>1?nav:''}`; }
function pLeads(){
  const E=extraLeads(); const R0=(S.leads||{}).resumo; const R=R0?mesclaResumo(R0,E):null; const C=lista('leads').filter(x=>x._id!=='resumo').concat(campanhasExtras(E)).sort((a,b)=>String(b.ultimo||'').localeCompare(String(a.ultimo||''))||(b.total||0)-(a.total||0));
  if(!R) return `<h2>Leads captados</h2>`+vazio(carregado.leads?'Nenhum lead coletado.':'Aguardando a primeira coleta das planilhas de leads.');
  const ord=o=>Object.entries(o||{}).sort((a,b)=>b[1]-a[1]);
  const top=(o,n)=>ord(o).slice(0,n).map(([k,v])=>`${esc(k)} ${v}`).join(' · ');
  const ST=[['vendido','vendido','ok'],['visita','visita','ok'],['em_contato','em contato','info'],['sem_retorno','sem retorno','warn'],['descartado','descartado',''],['outro','outro',''],['sem_registro','sem registro','']];
  const st=o=>ST.filter(([k])=>(o||{})[k]).map(([k,t,c])=>`<span class="pill ${c}">${t} ${o[k]}</span>`).join(' ')||'—';
  const meses=Object.keys(R.por_mes||{}).filter(m=>/^\d{4}-\d{2}$/.test(m)).sort();
  const kp=(rot,num,sub)=>`<div class="card"><div class="nota" style="margin:0;text-transform:uppercase;letter-spacing:.12em;font-size:11px">${rot}</div><div style="font-size:30px;margin:4px 0">${num}</div><div class="nota" style="margin:0">${sub}</div></div>`;
  const linhas=C.map(c=>`<tr><td>${esc(c.campanha)}<span class="s">${esc(c.planilha)}</span></td><td>${esc(c.canal||'—')}</td><td>${c.primeiro?mesTxt(c.primeiro)+(c.ultimo&&c.ultimo!==c.primeiro?' a '+mesTxt(c.ultimo):''):'—'}</td><td class="n"><b>${c.total||0}</b>${c.repetidos_em_outra?`<span class="s">${c.repetidos_em_outra} também em outra</span>`:''}</td><td>${st(c.status)}${Object.keys(c.origem||{}).length?`<span class="s">${top(c.origem,3)}</span>`:''}</td><td>${top(c.por_corretor,4)}${Object.keys(c.por_corretor||{}).length>4?' …':''}${Object.keys(c.primeiro_corretor||{}).length?`<span class="s">1º atendimento: ${top(c.primeiro_corretor,3)}</span>`:''}</td><td>${(c.eventos||[]).map(e=>esc(e.tipo.toLowerCase())+(e.mes?' '+mesTxt(e.mes):'')).join(', ')||'—'}${Object.keys(c.imoveis||{}).length?`<span class="s">imóveis: ${esc(Object.keys(c.imoveis).join(', '))}</span>`:''}</td></tr>`).join('');
  const corr=ord(R.por_corretor).map(([k,v])=>`<tr><td>${k.startsWith('(')?esc(k):pesCor(k)}</td><td class="n">${k.startsWith('(')?`<b>${v}</b>`:`<button class="btn" data-leadcor="${esc(chaveCorretor(k))}" title="Ver os leads de ${esc(k)}"><b>${v}</b></button>`}</td><td>${C.filter(c=>(c.por_corretor||{})[k]).map(c=>`${esc(c.campanha)} ${c.por_corretor[k]}`).join(' · ')}</td></tr>`).join('');
  return `<h2>Leads captados</h2><p class="nota">Totais das planilhas de "04 - Organização de Leads" do Drive Central (${esc((R.fontes||[]).join(', '))}). Nomes e datas dos leads ficam no HUB (base do CRM); telefone e e-mail nunca saem das planilhas. "Também em outra" = mesma pessoa (pelo telefone) em mais de uma campanha — o Repasses VISTA reaproveita os leads da campanha Wynn. Status vem da coluna Progresso, quando preenchida.</p>
  <div class="grade" style="margin-bottom:18px">${kp('Leads registrados',R.total_linhas,`${R.campanhas} campanhas/planilhas`)}${kp('Pessoas únicas',R.pessoas_unicas_com_telefone,`${R.repetidos_entre_campanhas} aparecem em mais de uma campanha`)}${kp('Por canal',ord(R.por_canal).map(([k,v])=>v).join(' · '),esc(ord(R.por_canal).map(([k])=>k).join(' · ')))}${kp('Último mês'+(meses.length?' ('+mesTxt(meses[meses.length-1])+')':''),meses.length?R.por_mes[meses[meses.length-1]]:'—',meses.map(m=>mesTxt(m)+' '+R.por_mes[m]).join(' · '))}</div>
  <h2>Por campanha</h2><div class="tabela"><table><thead class="quebra"><tr><th>Campanha</th><th>Canal</th><th>Período</th><th class="n">Leads</th><th>Status (Progresso)</th><th>Corretores</th><th>Eventos da campanha</th></tr></thead><tbody>${linhas}</tbody></table></div>
  <h2 style="margin-top:24px">Por corretor</h2><p class="nota">O nome abre o cadastro da pessoa (CRM › Pessoas); o número abre a lista de leads dela.</p><div class="tabela"><table><thead><tr><th>Corretor</th><th class="n">Leads</th><th>Onde</th></tr></thead><tbody>${corr}</tbody></table></div>
  ${(()=>{ const T=leadsTodos(); if(!T.length) return ''; const opt=(arr,sel,todos)=>`<option value="">${todos}</option>`+arr.map(([v,t])=>`<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(t)}</option>`).join('');
    const cors=[...new Map(T.map(x=>[chaveCorretor(x.corretor),1])).keys()].filter(Boolean).map(k=>[k,nomeCorretor(k)]).sort((a,b)=>a[1].localeCompare(b[1]));
    const camps=[...new Set(T.map(x=>x.campanha))].sort().map(c=>[c,c]); const ms=[...new Set(T.map(x=>x.mes).filter(Boolean))].sort().reverse().map(m=>[m,mesTxt(m)]);
    const sts=Object.entries(STL).map(([k,v])=>[k,v[0]]).concat([['sem_status','sem coluna de status']]);
    const sel=(id,html)=>`<select id="lf-${id}" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;min-width:0;max-width:100%">${html}</select>`;
    return `<h2 id="lista-leads" style="margin-top:24px">Lista de leads</h2><p class="nota">Um lead por linha, como está nas planilhas (nome, data, campanha, corretor que recebeu e o que foi anotado em Progresso). Telefone e e-mail ficam só nas planilhas. "Também em" = a mesma pessoa entrou por outra campanha. Base do futuro CRM dos corretores.</p>
    <div class="filtros">${sel('cor',opt(cors,fLeads.cor,'Todos os corretores'))}${sel('camp',opt(camps,fLeads.camp,'Todas as campanhas'))}${sel('mes',opt(ms,fLeads.mes,'Todos os meses'))}${sel('st',opt(sts,fLeads.st,'Todos os status'))}<input id="lf-q" type="search" placeholder="Buscar nome, imóvel ou anotação…" value="${esc(fLeads.q)}" style="flex:1 1 200px;min-width:0;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit"></div>
    <div id="leads-res">${resLeads()}</div>`; })()}`;
}

/* ---------- vínculos com Cadastros › Pessoas (20/10/2026) ----------
   O módulo `pessoas` expõe window.HUB_PESSOAS: html(texto, ctx) devolve o texto com cada pessoa reconhecida como link
   (data-pessoa); corretor(nome) devolve o id da pessoa da equipe. Sem o módulo carregado, o texto aparece como antes. */
function uidCod(cod){ try{ const M=window.HUB_IMOVEIS; return M&&M.id?M.id({fonte:'contrato',cod}):''; }catch(e){ return ''; } }
function imvLk(txt,ctx){ if(txt==null||txt==='') return ''; const M=window.HUB_IMOVEIS; if(M&&typeof M.html==='function'){ try{ const h=M.html(String(txt),ctx||{}); if(h) return h; }catch(e){} } return esc(txt); }
function nomePadrao(s){ const P=window.HUB_PESSOAS; try{ if(P&&typeof P.padrao==='function') return P.padrao(String(s||'')); }catch(e){} return String(s||''); }
function pes(txt,ctx){ if(txt==null||txt==='') return ''; const P=window.HUB_PESSOAS; if(P&&typeof P.html==='function'){ try{ const h=P.html(String(txt),ctx||{}); if(h) return h; }catch(e){} } return esc(nomePadrao(txt)); }
// nome de exibição de uma pessoa (cadastro de Pessoas), para busca e títulos
function nomePes(txt,ctx){ const P=window.HUB_PESSOAS; try{ const id=P&&P.id&&P.id(String(txt||''),ctx||{}); const p=id&&P.pessoa(id); if(p&&p.nome) return p.nome; }catch(e){} return nomePadrao(txt); }
function nomeCorPes(nm){ const k=chaveCorretor(nm); const P=window.HUB_PESSOAS; if(k&&!k.startsWith('nome:')){ try{ const p=P&&P.pessoa&&P.pessoa(k); if(p&&p.nome) return p.nome; }catch(e){} const c=(S.corretores||{})[k]; if(c) return c.nome_completo||c.nome; } return nomePadrao(nm); }
function pesCor(nm){ const k=chaveCorretor(nm); const t=nomeCorPes(nm); if(k&&!k.startsWith('nome:')&&window.HUB_PESSOAS) return `<button class="lk pes" data-pessoa="${esc(k)}" title="Abrir o cadastro de ${esc(t)}">${esc(t)}</button>`; return esc(t); }
// "KAMILY AG/JAIME", "LUCIANO E DEIVIS", "DEIVIS/MILENA AG": cada nome vira link para a pessoa da equipe
function corsVenda(t){ return String(t).split(/(\/|,| E )/).map(p=>{ if(/^(\/|,| E )$/.test(p)) return esc(p); const m=p.trim().match(/^(.*?)(\s+AG)?$/i); return m&&m[1]?pesCor(m[1])+(m[2]?esc(m[2]):''):esc(p); }).join(''); }

/* ---------- busca única (20/10/2026) ---------- */
let BQ={q:'',res:[],sel:0};
function buscaHUB(q){ const t=semAc(q).trim(); if(t.length<2) return []; const R=[]; const tem=v=>semAc(v).includes(t); const ini=v=>semAc(v).startsWith(t);
  const add=(grp,x)=>R.push(Object.assign({grp},x));
  // módulos com gancho busca(q): Pessoas (equipe e clientes), etc.
  Object.values(MODS).forEach(m=>{ if(typeof m.busca!=='function') return; try{ (m.busca(q)||[]).slice(0,8).forEach(x=>add(x.grp||m.aba||m.id,x)); }catch(e){} });
  const C=contratos().filter(c=>ini(c._id)||[campo(c,'locador'),campo(c,'locatario'),campo(c,'endereco')].some(tem)).slice(0,6);
  C.forEach(c=>add('Contratos de locação',{tit:`${c._id} · ${campo(c,'endereco')||''}`,sub:[campo(c,'locador'),campo(c,'locatario')].filter(Boolean).join(' × '),ir:{aba:'carteira',linha:'car-'+c._id}}));
  const E=Object.entries(S.empreendimentos_fichas||{}).filter(([id,x])=>[x.nome,(x.nomes||[]).join(' '),x.bairro,x.construtora_nome].some(tem)).slice(0,6);
  E.forEach(([id,x])=>add('Empreendimentos',{tit:x.nome||id,sub:[x.bairro,x.construtora_nome,x.estagio].filter(Boolean).join(' · '),ir:{aba:'empreendimentos',alvo:id}}));
  const K=Object.entries(S.empreendimentos_construtoras||{}).filter(([id,x])=>[x.nome,x.razao_social].some(tem)).slice(0,4);
  K.forEach(([id,x])=>add('Construtoras',{tit:x.nome||id,sub:[x.razao_social,x.empreendimentos!=null?x.empreendimentos+' empreendimentos':''].filter(Boolean).join(' · '),ir:{aba:'empreendimentos-construtoras',alvo:id}}));
  const pt=ponte(); const I=lista('imoveis').filter(x=>ini(x.ref)||[x.endereco,x.bairro,x.proprietario].some(tem)||(pt[x._id]||[]).some(z=>ini(z.cod))).sort((a,b)=>(b.ativo?1:0)-(a.ativo?1:0)||ordCod(a.ref,b.ref)).slice(0,8);
  I.forEach(x=>add('Anúncios do site',{tit:`${x.ref} · ${FIN[finDe(x._id)]||''} · ${x.bairro||''}`,sub:[x.endereco,x.ativo?'ativo':'inativo',x.proprietario].filter(Boolean).join(' · '),imovel:x._id}));
  const V=lista('vendas').filter(v=>[v.objeto,v.vendedor,v.comprador].some(tem)).sort((a,b)=>String(b.data||'').localeCompare(String(a.data||''))).slice(0,6);
  V.forEach(v=>add('Vendas e contratos',{tit:`${v.objeto||v.tipo}`,sub:`${dt(v.data)} · ${v.tipo||''} · ${[v.vendedor,v.comprador].filter(Boolean).join(' × ')}`,ir:{aba:'vendas',linha:'ven-'+v._id}}));
  ABAS.filter(a=>tem(rotAba(a[0]))).slice(0,4).forEach(a=>add('Abas',{tit:'Abrir '+rotAba(a[0]),sub:(GRUPOS.find(g=>g[0]===grupoDe(a[0]))||[])[1]||'',ir:{aba:a[0]}}));
  return R; }
function pintaBusca(){ const el=document.getElementById('busca-res'); if(!el) return; if(!BQ.q||semAc(BQ.q).trim().length<2){ el.hidden=true; el.innerHTML=''; return; }
  const R=BQ.res; if(!R.length){ el.hidden=false; el.innerHTML=`<div class="nada">Nada encontrado para "${esc(BQ.q)}".</div>`; return; }
  let g='', h=''; R.forEach((x,i)=>{ if(x.grp!==g){ g=x.grp; h+=`<div class="grp">${esc(g)}</div>`; } h+=`<button type="button" data-bres="${i}" class="${i===BQ.sel?'ativo':''}">${esc(x.tit)}${x.sub?`<span class="s">${esc(x.sub)}</span>`:''}</button>`; });
  el.hidden=false; el.innerHTML=h; }
function irBusca(x){ const inp=document.getElementById('busca-q'); BQ={q:'',res:[],sel:0}; if(inp){ inp.value=''; inp.blur(); } pintaBusca();
  if(x.pessoa){ window.HUB.abrirPessoa(x.pessoa); return; }
  if(x.unidade){ window.HUB.abrirUnidade(x.unidade); return; }
  if(x.imovel){ window.HUB.abrirImovel([x.imovel],'Busca: '+(((S.imoveis||{})[x.imovel]||{}).ref||x.imovel)); return; }
  if(x.acao&&typeof x.acao==='function'){ try{ x.acao(); }catch(e){} return; }
  const ir=x.ir||{}; if(!ir.aba||!ABAS.some(a=>a[0]===ir.aba)) return; aba=ir.aba; fImv.foco=[]; fImv.focoTxt=''; focoLinha=ir.linha||''; try{localStorage.setItem('hubv.aba',aba)}catch(_){}
  const m=MODS[ir.aba]; if(ir.alvo&&m&&typeof m.foco==='function'){ try{ m.foco(ir.alvo); }catch(_){} }
  render(); window.scrollTo(0,0);
  if(focoLinha) setTimeout(()=>{ const l=document.getElementById(focoLinha); if(l) l.scrollIntoView({block:'center',behavior:'smooth'}); setTimeout(()=>{ focoLinha=''; },4000); },80); }
document.addEventListener('input',e=>{ if(e.target.id!=='busca-q') return; BQ.q=e.target.value; BQ.res=buscaHUB(BQ.q); BQ.sel=0; pintaBusca(); });
document.addEventListener('keydown',e=>{ if(e.target.id!=='busca-q') return; const n=BQ.res.length;
  if(e.key==='ArrowDown'&&n){ e.preventDefault(); BQ.sel=(BQ.sel+1)%n; pintaBusca(); }
  else if(e.key==='ArrowUp'&&n){ e.preventDefault(); BQ.sel=(BQ.sel-1+n)%n; pintaBusca(); }
  else if(e.key==='Enter'&&n){ e.preventDefault(); irBusca(BQ.res[BQ.sel]); }
  else if(e.key==='Escape'){ e.target.value=''; BQ={q:'',res:[],sel:0}; pintaBusca(); } });
document.addEventListener('click',e=>{ const b=e.target.closest('[data-bres]'); if(b){ irBusca(BQ.res[+b.dataset.bres]); return; }
  if(!e.target.closest('.busca')){ const el=document.getElementById('busca-res'); if(el&&!el.hidden){ el.hidden=true; } }
  else if(e.target.id==='busca-q'&&BQ.q){ pintaBusca(); } });

/* ---------- CRM — gestão (fase 3: CRM dos corretores no Google) ---------- */
const ETAPAS_CRM=['Novo','Contato feito','Qualificado','Visita agendada','Visita feita','Proposta','Negociação','Fechado','Perdido'];
// 16/11/2026 (ampliação do CRM, fatia 1): quatro funis (Locação, Venda, Captação, Temporada) e a caixa A definir, pela mesma
// definição do app (modulos/funis-crm.js). O funil sai do interesse do lead; etapa antiga aparece na equivalente do funil.
const ABERTAS_CRM={has:e=>{ e=e||'Novo'; return e!=='Perdido'&&e!=='Fechado'&&e!=='No ar'&&e!=='Concluída'; }};
const GANHO_CRM=new Set(['Fechado','Captado','Cadastro completo','No ar','Contrato assinado','Entrada','Concluída']);
const FCH=window.FunisCRM||null;
const funilCRM=x=>FCH?FCH.funilDoInteresse(x&&x._int?x._int.k:''):'';
let fFunilCRM=(()=>{ try{ return localStorage.getItem('hub.funilCRM')||''; }catch(e){ return ''; } })();
const okFunilCRM=x=>!FCH||!fFunilCRM||fFunilCRM==='todos'||FCH.funilDoInteresse(x&&x._int?x._int.k:'')===fFunilCRM;
const etapasFiltroCRM=()=>FCH?(FCH.FUNIS[fFunilCRM]?FCH.FUNIS[fFunilCRM].etapas:FCH.todasEtapas()):ETAPAS_CRM;
function chipsFunilCRM(L){ if(!FCH) return ''; const c={}; L.forEach(x=>{ const f=FCH.funilDoInteresse(x&&x._int?x._int.k:''); c[f]=(c[f]||0)+1; });
  if(fFunilCRM!=='todos'&&!FCH.FUNIS[fFunilCRM]) fFunilCRM=FCH.ORDEM.find(f=>c[f])||'locacao';
  return `<div class="filtros int-filtros" role="group" aria-label="Funil" style="margin:0 0 6px">${FCH.ORDEM.filter(f=>f!=='definir'||c.definir).map(f=>`<button class="btn" style="font-weight:600" data-funilcrm="${f}" aria-pressed="${fFunilCRM===f}">${esc(FCH.FUNIS[f].rot)} (${c[f]||0})</button>`).join('')}<button class="btn" style="font-weight:600" data-funilcrm="todos" aria-pressed="${fFunilCRM==='todos'}">Todos (${L.length})</button></div>`; }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-funilcrm]'); if(!b) return; fFunilCRM=b.dataset.funilcrm; fCRM.et=''; fCRM.int=''; try{ localStorage.setItem('hub.funilCRM',fFunilCRM); }catch(x){} render(); });
const AL_CRM={primeiro:['sem 1º contato','bad'],vencida:['ação vencida','bad'],parado:['parado','warn'],sem_prox:['sem próxima ação','warn']};
const alc=m=>AL_CRM[m]||[String(m),''];
const etPill=e=>`<span class="pill ${GANHO_CRM.has(e)?'ok':e==='Perdido'?'':(e==='Novo'||e==='A captar')?'warn':'info'}">${esc(e||'Novo')}</span>`;
function crmBase(){ return (S.crm||{}).base||{}; }
function crmRes(){ return (S.crm||{}).resumo||{}; }
function nomeCRM(slug){ const c=(crmBase().corretores||[]).find(x=>x.slug===slug); return c?c.nome:nomeCorretor(slug); }
function motivosLead(id){ const R=crmRes().cobrar||{}; for(const k in R){ const x=R[k].find(y=>y.id===id); if(x) return x.motivos; } return []; }
function msgCobrar(slug){ const L=(crmRes().cobrar||{})[slug]||[]; const t={primeiro:'sem primeiro contato',vencida:'próxima ação vencida',parado:'sem registro há '+(crmRes().parado_dias||15)+'+ dias',sem_prox:'sem próxima ação marcada'};
  return `${nomeCRM(slug).split(' (')[0]}, retornos pendentes no CRM (planilha "CRM Vivere"):\n`+L.map(x=>`• ${x.nome} — ${x.motivos.map(m=>t[m]||m).join(', ')}${x.data_prox&&x.motivos.includes('vencida')?` (era ${dt(x.data_prox)})`:''}`).join('\n')+`\nRegistre o contato na aba Histórico e marque a próxima ação. Obrigado!`; }
function etapaCRM(x){ const m=(S.crm_etapas||{})[x._id]; return m&&m.etapa?m.etapa:(x.etapa||'Novo'); }
function filtraCRM(semInt){ const q=semAc(fCRM.q).trim(); const LCi=S.leads_contatos||{};
  return lista('crm_leads').map(x=>{ const y=Object.assign({},x,{_mov:(S.crm_etapas||{})[x._id]||null,_int:intHub(LCi[x._id],intOp(x,x._id))}); y._etRaw=etapaCRM(x); y.etapa=FCH?FCH.etapaNoFunil(y._etRaw,funilCRM(y)):y._etRaw; return y; }).filter(x=>(semInt||!fCRM.int||x._int.k===fCRM.int)&&(!fCRM.cor||x.corretor===fCRM.cor)&&(!fCRM.et||(x.etapa||'Novo')===fCRM.et)&&(!fCRM.al||(fCRM.al==='abertos'?ABERTAS_CRM.has(x.etapa||'Novo'):fCRM.al==='cobrar'?motivosLead(x._id).length>0:motivosLead(x._id).includes(fCRM.al)))&&(!q||semAc([x.nome,x.campanha,x.prox,x.imovel_int,(x.perfil||{}).bairros].join(' ')).includes(q)))
    .sort((a,b)=>String(b.entrada||'').localeCompare(String(a.entrada||''))||String(a.nome).localeCompare(String(b.nome))); }
// 17/11/2026 (vivere-ia-perfil-amplo-leads, F3): perfil do lead pela IA (modulos/perfil-lead.js, coleção leads_perfil, só diretoria).
// O núcleo só deixa o selo no resumo e o lugar [data-perfil-lead] no histórico; o módulo desenha o bloco quando o histórico abre.
const perfilIACRM=x=>{ try{ const m=MODS['perfil-lead']; return !!(m&&typeof m.temPerfil==='function'&&m.temPerfil(x._id,x.painel||'')); }catch(_){ return false; } };
function tabCRM(){ const L=filtraCRM().filter(okFunilCRM); if(!L.length) return vazio(carregado.crm_leads?'Nenhum lead com esse filtro.':'Aguardando a coleta do CRM.');
  const linhas=L.map(x=>{ const mo=motivosLead(x._id); const p=x.perfil||{}; const H=x.hist||[]; const O=x.ops;
    const det=`<details><summary class="s" style="cursor:pointer">histórico (${x.n_hist||0})${O?` · oportunidades: ${O.abertas||0} abertas, ${O.ofereci||0} oferecidas`:''}${perfilIACRM(x)?' · 🧭 perfil':''}</summary>
      <div data-perfil-lead="${esc(x._id)}" data-perfil-painel="${esc(x.painel||'')}"></div>
      ${p.fin||p.bairros||p.vmax?`<div class="s"><b>Perfil:</b> ${esc([p.fin,p.tipo,p.bairros,(p.vmin||p.vmax)?`${p.vmin?brl0(p.vmin):''}–${p.vmax?brl0(p.vmax):''}`:'',p.obs].filter(Boolean).join(' · '))}</div>`:''}
      ${H.length?`<ul style="margin:6px 0 0 16px;padding:0">${H.map(h=>`<li class="s">${dt(h.dh)}${esc(String(h.dh||'').slice(10,16))} · <b>${esc(h.tipo)}</b> — ${esc(h.txt)}</li>`).join('')}</ul>`:'<div class="s">Nenhum registro ainda.</div>'}
      ${O&&O.ult&&O.ult.length?`<div class="s" style="margin-top:4px"><b>Imóveis sugeridos:</b> ${O.ult.map(o=>`${esc(o.ref)}${o.st?` (${esc(o.st.toLowerCase())})`:''}`).join(', ')}</div>`:''}</details>`;
    return `<tr><td>${x.entrada?dt(x.entrada):'—'}</td><td>${esc(x.nome)} ${pillIntK(x._int)}${det}</td><td>${esc(nomeCRM(x.corretor))}</td><td>${etPill(x.etapa)}${x.motivo?`<span class="s">${esc(x.motivo)}</span>`:''}${x.etapa==='Fechado'&&x.valor?`<span class="s">${brl0(x.valor)}</span>`:''}</td><td>${x.prox?esc(x.prox):'—'}${x.data_prox?`<span class="s">${dt(x.data_prox)}</span>`:''}</td><td>${x.ultimo?dt(x.ultimo):'—'}</td><td>${mo.map(m=>`<span class="pill ${alc(m)[1]}">${esc(alc(m)[0])}</span>`).join(' ')||'—'}</td><td>${esc(x.campanha||'—')}${x.imovel_int?`<span class="s">interesse: ${esc(x.imovel_int)}</span>`:''}</td></tr>`; }).join('');
  return `<p class="nota" style="margin:6px 0">${L.length} lead${L.length===1?'':'s'}</p><div class="tabela"><table><thead class="quebra"><tr><th>Entrada</th><th>Lead</th><th>Corretor</th><th>Etapa</th><th>Próxima<br>ação</th><th>Último<br>registro</th><th>Alertas</th><th>Campanha /<br>interesse</th></tr></thead><tbody>${linhas}</tbody></table></div>`; }
function pCRM(){
  const B=crmBase(), R=crmRes(), T=lista('crm_leads'); const cors=(B.corretores||[]);
  if(!B.corretores&&!T.length) return `<h2>Funil dos corretores</h2>`+vazio(carregado.crm?'O CRM ainda não foi coletado.':'Aguardando a primeira coleta do CRM.');
  const al=R.alertas||{}; const ativos=cors.filter(c=>c.ativo); const fech=T.filter(x=>GANHO_CRM.has(x.etapa)).length;
  const kp=(rot,num,sub,alerta)=>`<div class="card"${alerta?' style="border-color:var(--bad)"':''}><div class="nota" style="margin:0;text-transform:uppercase;letter-spacing:.12em;font-size:11px">${rot}</div><div style="font-size:30px;margin:4px 0">${num}</div><div class="nota" style="margin:0">${sub}</div></div>`;
  const leadsDe=k=>(R.por_corretor||{})[k]||{}; const nPlan=k=>lista('leads_contatos').filter(x=>chaveCorretor(x.corretor)===k||chaveCorretor(x.corretor)===((params().corretores_info||{})[k]||{}).alias_de).length;
  const funil=o=>(FCH?FCH.todasEtapas():ETAPAS_CRM).filter(e=>(o||{})[e]).map(e=>`${etPill(e)} ${o[e]}`).join(' ')||'—';
  const linCor=cors.filter(c=>!/\(saiu\)/.test(c.nome)||c.ativo).map(c=>{ const m=leadsDe(c.slug); const nc=((R.cobrar||{})[c.slug]||[]).length;
    return `<tr><td>${esc(c.nome)}<span class="s">${esc(c.equipe||'')}</span></td><td>${c.ativo?(c.planilha?`<a class="btn" href="${escUrl(c.planilha)}" target="_blank" rel="noopener">Abrir painel</a>`:'criando…')+`<span class="s">${c.compartilhada?'compartilhada':'ainda não compartilhada'}</span>`:'<span class="pill">fora do CRM</span><span class="s">sem painel no app</span>'}</td><td class="n">${c.ativo?(m.total||0):'—'}</td><td>${c.ativo?funil(m.etapas):'—'}</td><td class="n">${c.ativo?(m.fechados||0):'—'}</td><td class="n">${c.ativo&&m.total?pct(m.conversao):'—'}</td><td>${nc?`<button class="btn" data-crmal="cobrar" data-crmcor="${esc(c.slug)}">${nc} a cobrar</button> <button class="btn" data-crmmsg="${esc(c.slug)}" title="Copia uma mensagem pronta para mandar ao corretor">Copiar mensagem</button>`:c.ativo?'<span class="pill ok">em dia</span>':'—'}</td></tr>`; }).join('');
  const camps=Object.entries(R.por_campanha||{}).sort((a,b)=>b[1].total-a[1].total);
  const linCamp=camps.map(([k,m])=>`<tr><td>${esc(k)}</td><td class="n">${m.total}</td><td>${funil(m.etapas)}</td><td class="n">${m.fechados}</td><td class="n">${pct(m.conversao)}</td></tr>`).join('');
  const cob=Object.entries(R.cobrar||{}).map(([k,L])=>`<div class="card"><h2 style="margin:0 0 6px">${esc(nomeCRM(k))} <span class="pill bad">${L.length}</span></h2><ul style="margin:0 0 8px 16px;padding:0">${L.slice(0,12).map(x=>`<li class="s">${esc(x.nome)} — ${esc(x.motivos.map(m=>alc(m)[0]).join(', '))}</li>`).join('')}${L.length>12?`<li class="s">e mais ${L.length-12}</li>`:''}</ul><button class="btn" data-crmmsg="${esc(k)}">Copiar mensagem</button> <button class="btn" data-crmal="cobrar" data-crmcor="${esc(k)}">Ver na lista</button></div>`).join('');
  const opt=(arr,sel,todos)=>`<option value="">${todos}</option>`+arr.map(([v,t])=>`<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(t)}</option>`).join('');
  const sel=(id,html)=>`<select id="cf-${id}" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;min-width:0;max-width:100%">${html}</select>`;
  const sem=B.sem_corretor||[];
  return `<h2>Funil dos corretores</h2><p class="nota">Cada corretor registra os leads no painel dele, no app da Vivere: lead novo das campanhas entra no painel, e ele registra etapa, próxima ação, histórico e o perfil do cliente. O HUB lê os painéis do app em tempo real pela base única no Supabase (desde 11/11/2026). Telefone só no painel do corretor.</p>
  <div class="grade" style="margin-bottom:18px">${kp('Leads no CRM',T.length,`${ativos.length} de ${cors.filter(c=>!/\(saiu\)/.test(c.nome)).length} corretores no CRM`)}${kp('Sem 1º contato (24 h)',al.primeiro||0,'lead novo sem registro',al.primeiro>0)}${kp('Próxima ação vencida',al.vencida||0,'data já passou',al.vencida>0)}${kp('Parados',al.parado||0,`sem registro há ${R.parado_dias||15}+ dias`)}${kp('Conversão',T.length?pct(fech/T.length):'—',`${fech} fechado${fech===1?'':'s'} de ${T.length}`)}</div>
  ${blocoPrevisaoCRM(cors)}
  ${blocoRelCRM(cors)}
  <h2>Por corretor</h2><p class="nota">Os leads vêm dos painéis do app de cada corretor e entram aqui na hora em que ele grava (11/11/2026). Corretor sem painel no app aparece como fora do CRM.</p>
  <div class="tabela"><table><thead class="quebra"><tr><th>Corretor</th><th>Painel</th><th class="n">Leads</th><th>Funil</th><th class="n">Fechados</th><th class="n">Conversão</th><th>Cobrar<br>retorno</th></tr></thead><tbody>${linCor}</tbody></table></div>
  ${blocoDiretores()}
  ${cob?`<h2 style="margin-top:24px">Cobrar retorno</h2><p class="nota">"Copiar mensagem" monta o texto para mandar ao corretor pelo WhatsApp.</p><div class="grade">${cob}</div>`:''}
  <h2 style="margin-top:24px">Por campanha</h2><div class="tabela"><table><thead><tr><th>Campanha</th><th class="n">Leads</th><th>Funil</th><th class="n">Fechados</th><th class="n">Conversão</th></tr></thead><tbody>${linCamp||'<tr><td colspan="5">—</td></tr>'}</tbody></table></div>
  <h2 id="lista-crm" style="margin-top:24px">Leads e histórico</h2><p class="nota">Clique em "histórico" para ver as tratativas, o perfil e os imóveis sugeridos de cada lead.</p>
  ${cartoesCor(ativos)}
  ${fCRM.sel?`<div class="crm-aberto"><div class="crm-aberto-cab"><b>${fCRM.sel==='*'?'Todos os corretores':esc(nomeCRM(fCRM.sel))}</b><button class="btn" data-crmsel="">Minimizar</button></div>
  <div class="filtros">${sel('et',opt(etapasFiltroCRM().map(e=>[e,e]),fCRM.et,'Todas as etapas'))}${sel('al',opt([['abertos','Só abertos'],['cobrar','A cobrar (qualquer alerta)'],...Object.entries(AL_CRM).map(([k,v])=>[k,v[0]])],fCRM.al,'Todos (com e sem alerta)'))}<input id="cf-q" type="search" placeholder="Buscar nome, campanha, imóvel ou bairro…" value="${esc(fCRM.q)}" style="flex:1 1 200px;min-width:0;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit"></div>
  <div id="crm-res">${resCRM()}</div></div>`:'<p class="nota">Clique num corretor para ver os leads dele na lista, no kanban, no pipeline, no funil ou na agenda.</p>'}
  ${sem.length?`<h2 style="margin-top:24px">Leads sem corretor reconhecido</h2><p class="nota">Não entram no CRM até ter corretor na planilha de leads (ou o nome acrescentado na aba Config da Base).</p><div class="tabela"><table><thead><tr><th>Entrada</th><th>Lead</th><th>Campanha</th><th>Na planilha</th></tr></thead><tbody>${sem.map(x=>`<tr><td>${dt(x.entrada)}</td><td>${esc(x.nome)}</td><td>${esc(x.campanha)}</td><td>${esc(x.corretor_planilha||'')}<span class="s">${esc(x.situacao||'')}</span></td></tr>`).join('')}</tbody></table></div>`:''}`;
}


/* 16/11/2026 (ampliação do CRM, fatia 2b; decisões do Cleiton): previsão do mês por corretor e no total. Valor, fechamento
   previsto, % ajustada e comissão vêm do painel do corretor (gatilho hub_lead_do_painel); probabilidade padrão por etapa e receita
   da Vivere (Locação 1 aluguel, Venda 6%, Temporada 15%, Captação sem receita) em modulos/funis-crm.js (FC.previsao), como no app.
   A etapa considera a mudança feita pela diretoria no kanban (crm_etapas). */
let mesPrevCRM='este';
function leadsPrevCRM(){ const LCi=S.leads_contatos||{};
  return lista('crm_leads').map(x=>{ const it=intHub(LCi[x._id],intOp(x,x._id)), f=FCH.funilDoInteresse(it?it.k:'');
    return {cor:x.corretor,f,lead:{etapa:etapaCRM(x),valor:x.valor,fechamento_prev:x.fechamento_prev,prob:x.prob,receita_pct:x.receita_pct,campos:{valor_pretendido:x.valor_pretendido},data_fechamento:x.data_fech}}; }); }
function blocoPrevisaoCRM(cors){
  if(!FCH||!FCH.previsao) return '';
  const hoje=new Date(Date.now()-3*3600e3).toISOString().slice(0,10), m0=hoje.slice(0,7), seg=m=>{ const [a,b]=m.split('-').map(Number); return b===12?`${a+1}-01`:`${a}-${String(b+1).padStart(2,'0')}`; };
  const mes=mesPrevCRM==='prox'?seg(m0):m0, [ma,mb]=mes.split('-').map(Number), rot=new Date(ma,mb-1,15).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const chips=chipsFunilCRM(lista('crm_leads').map(x=>Object.assign({},x,{_int:intHub((S.leads_contatos||{})[x._id],intOp(x,x._id))})));   // antes do funil: acerta o funil escolhido
  const fu=FCH.FUNIS[fFunilCRM]&&fFunilCRM!=='definir'?fFunilCRM:null, F=fu?FCH.def(fu):null, comRec=!F||!!F.receita;
  const T=leadsPrevCRM().filter(x=>!fu||x.f===fu), prev=L=>FCH.previsao(L.map(x=>({lead:x.lead,f:x.f})),mes,null,hoje);
  const P=prev(T), v=n=>`<span class="sens">${brl0(Math.round(n))}</span>`;
  const kp=(r,n,sub,al)=>`<div class="card"${al?' style="border-color:var(--bad)"':''}><div class="nota" style="margin:0;text-transform:uppercase;letter-spacing:.12em;font-size:11px">${r}</div><div style="font-size:26px;margin:4px 0">${n}</div><div class="nota" style="margin:0">${sub}</div></div>`;
  const bt=(k,t)=>`<button class="btn" data-mesprevcrm="${k}" aria-pressed="${mesPrevCRM===k}">${t}</button>`;
  const lin=cors.filter(c=>c.ativo).map(c=>{ const Q=prev(T.filter(x=>x.cor===c.slug)); const falta=Q.semValor+Q.semData;
    return {c,Q,falta}; }).filter(o=>o.Q.abertos.n||o.Q.ganhos.n||o.falta).sort((a,b)=>b.Q.abertos.recPond-a.Q.abertos.recPond||b.Q.abertos.pond-a.Q.abertos.pond)
    .map(({c,Q,falta})=>`<tr><td>${esc(c.nome)}</td><td class="n">${Q.abertos.n}</td>${F?`<td class="n">${v(Q.abertos.pond)}</td>`:''}${comRec?`<td class="n">${v(Q.abertos.recPond)}</td>`:''}<td class="n">${Q.ganhos.n}</td>${comRec?`<td class="n">${v(Q.ganhos.rec)}</td>`:''}<td class="n">${falta?`${Q.semValor} sem valor · ${Q.semData} sem data`:'—'}${Q.vencidos?` <span class="pill bad">${Q.vencidos} vencido${Q.vencidos>1?'s':''}</span>`:''}</td></tr>`).join('');
  const cab=`<th>Corretor</th><th class="n">Negócios<br>no mês</th>${F?`<th class="n">${esc(F.valor.curto)}<br>ponderado</th>`:''}${comRec?'<th class="n">Receita<br>ponderada</th>':''}<th class="n">Ganhos<br>no mês</th>${comRec?'<th class="n">Receita<br>dos ganhos</th>':''}<th class="n">Falta<br>preencher</th>`;
  return `<h2 style="margin-top:4px">Previsão de ${esc(rot)}${F?` · ${esc(F.rot)}`:''}</h2><p class="nota">Valor × probabilidade (da etapa ou ajustada pelo corretor) dos negócios em aberto com fechamento previsto no mês; ganhos = chegaram à etapa de ganho com fechamento no mês. Receita da Vivere: Locação 1 aluguel, Venda 6% e Temporada 15% (o corretor ajusta no negócio); Captação sem receita. Os dados vêm do painel de cada corretor.</p>
  <div class="filtros" role="group" aria-label="Mês da previsão" style="margin:0 0 6px">${bt('este','Este mês')}${bt('prox','Próximo mês')}</div>${chips}
  <div class="grade" style="margin-bottom:12px">${comRec?kp('Receita prevista (ponderada)',v(P.abertos.recPond),`sem ponderar ${v(P.abertos.rec)} · ${P.abertos.n} negócio${P.abertos.n===1?'':'s'}`):''}${F?kp(`${esc(F.valor.curto)} previsto (ponderado)`,v(P.abertos.pond),`de ${v(P.abertos.valor)}`):''}${kp('Ganhos no mês',P.ganhos.n,comRec?`receita ${v(P.ganhos.rec)}`:F?v(P.ganhos.valor):'')}${kp('Falta preencher',P.semValor+P.semData,`${P.semValor} sem valor · ${P.semData} sem fechamento previsto${P.vencidos?` · ${P.vencidos} vencido${P.vencidos>1?'s':''}`:''}`,P.vencidos>0)}</div>
  ${lin?`<div class="tabela" style="margin-bottom:18px"><table><thead class="quebra"><tr>${cab}</tr></thead><tbody>${lin}</tbody></table></div>`:'<p class="nota" style="margin-bottom:18px">Nenhum corretor com negócio previsto, ganho ou dado a preencher neste mês e funil.</p>'}`;
}
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-mesprevcrm]'); if(!b) return; mesPrevCRM=b.dataset.mesprevcrm==='prox'?'prox':'este'; render(); });
/* 16/11/2026 (ampliação do CRM, fatia 3; decisões do Cleiton): relatórios e exportação no Funil dos corretores, com o mesmo módulo
   do app (modulos/relatorios-crm.js): conversão por etapa, tempo por etapa, motivos de perda e origem, mais o ranking por corretor,
   filtro por corretor e período escolhido (pela entrada do lead). Baixar em Excel, CSV e PDF. A lista de leads sai sem telefone e
   e-mail (o HUB não recebe contato do painel). Custo por origem: fica para a integração com o Meta e o Google Ads.
   A etapa considera a mudança feita pela diretoria no kanban (crm_etapas); o tempo por etapa sai das trocas do histórico do painel. */
let relCRM=(()=>{ try{ return Object.assign({per:'tudo',de:'',ate:'',cor:''},JSON.parse(localStorage.getItem('hub.relCRM')||'{}')); }catch(e){ return {per:'tudo',de:'',ate:'',cor:''}; } })();
const relCRMGuarda=()=>{ try{ localStorage.setItem('hub.relCRM',JSON.stringify(relCRM)); }catch(e){} };
function relCRMItens(){ const LCi=S.leads_contatos||{};
  return lista('crm_leads').map(x=>{ const it=intHub(LCi[x._id],intOp(x,x._id)), f=FCH.funilDoInteresse(it?it.k:'');
    return {cor:x.corretor,f,intRot:(INT_POR[it&&it.k]||{}).rot||'',lead:{nome:x.nome,etapa:etapaCRM(x),motivo:x.motivo,entrada:x.entrada,data_fechamento:x.data_fech,campanha:x.campanha,hist:x.hist||[],
      valor:x.valor,fechamento_prev:x.fechamento_prev,prob:x.prob,receita_pct:x.receita_pct,campos:{valor_pretendido:x.valor_pretendido},prox:x.prox,data_prox:x.data_prox}}; }); }
function relCRMOpts(){ const RC=window.RelatoriosCRM, hoje=new Date(Date.now()-3*3600e3).toISOString().slice(0,10), fu=FCH.FUNIS[fFunilCRM]?fFunilCRM:'';
  return {periodo:RC.periodo(relCRM.per,hoje,relCRM.de,relCRM.ate),funil:fu,cor:relCRM.cor,hoje,ranking:!relCRM.cor,nomeCor:k=>nomeCRM(k),comCorretor:true}; }
function relCRMSub(o){ const P=o.periodo, dB=x=>x?x.split('-').reverse().join('/'):'…';
  return `${o.cor?nomeCRM(o.cor):'todos os corretores'} · ${o.funil?FCH.def(o.funil).rot:'todos os funis'} · ${P.k==='tudo'?'todo o período':`entrada de ${dB(P.de)} a ${dB(P.ate)}`}`; }
function blocoRelCRM(cors){
  const RC=window.RelatoriosCRM; if(!FCH||!RC) return '';
  const o=relCRMOpts(), Sx=RC.secoes(RC.calcular(relCRMItens(),o),o);
  const bt=(k,t)=>`<button class="btn" data-relcrmper="${k}" aria-pressed="${relCRM.per===k}">${esc(t)}</button>`;
  const ops=cors.filter(c=>c.ativo).map(c=>`<option value="${esc(c.slug)}" ${relCRM.cor===c.slug?'selected':''}>${esc(c.nome)}</option>`).join('');
  const bx=(q,f,t)=>`<button class="btn" data-relcrmbx="${q}|${f}">${t}</button>`;
  return `<h2 style="margin-top:24px">Relatórios do CRM</h2><p class="nota">Conversão por etapa, tempo por etapa, motivos de perda, origem dos leads e ranking por corretor, com o funil escolhido acima (${esc(o.funil?FCH.def(o.funil).rot:'Todos')}). O período conta pela data de entrada do lead. O custo por origem entra com a integração do Meta e do Google Ads.</p>
  <div class="filtros" role="group" aria-label="Período" style="margin:0 0 6px">${RC.PERIODOS.map(([k,t])=>bt(k,t)).join('')}</div>
  <div class="filtros" style="margin:0 0 6px"><select id="relcrm-cor" aria-label="Corretor" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit"><option value="">Todos os corretores (com ranking)</option>${ops}</select>${relCRM.per==='intervalo'?`<label class="nota" style="margin:0">De <input type="date" id="relcrm-de" value="${esc(relCRM.de)}"></label><label class="nota" style="margin:0">Até <input type="date" id="relcrm-ate" value="${esc(relCRM.ate)}"></label>`:''}</div>
  <div class="filtros" style="margin:0 0 10px"><span class="nota" style="margin:0;align-self:center">Baixar relatórios:</span>${bx('rel','xlsx','Excel')}${bx('rel','csv','CSV')}${bx('rel','pdf','PDF')}<span class="nota" style="margin:0 0 0 10px;align-self:center">Lista de leads:</span>${bx('lista','xlsx','Excel')}${bx('lista','csv','CSV')}${bx('lista','pdf','PDF')}<span id="relcrm-msg" class="nota" style="margin:0;align-self:center"></span></div>
  <div class="card" style="margin-bottom:18px">${RC.html(Sx)}</div>`; }
async function relCRMBaixar(q,fmt){ const RC=window.RelatoriosCRM, o=relCRMOpts(), it=relCRMItens(), msg=t=>{ const m=document.getElementById('relcrm-msg'); if(m) m.textContent=t; };
  const Sx=q==='lista'?[RC.secaoLista(it,o)]:RC.secoes(RC.calcular(it,o),o);
  if(!Sx.length||(q==='lista'&&!Sx[0].linhas.length)) return msg('Nada para baixar neste filtro.');
  const titulo=q==='lista'?'Lista de leads':'Relatórios do CRM', sub=relCRMSub(o), nome=ext=>RC.nomeArq(['VIS',titulo,o.cor?nomeCRM(o.cor):'Todos',o.funil?FCH.def(o.funil).rot:'',o.hoje],ext);
  try{ if(fmt==='csv') RC.baixar(RC.csv(Sx,`${titulo} · ${sub}`),nome('csv'));
    else if(fmt==='xlsx') RC.baixar(RC.xlsx(RC.abasDe(Sx),`${titulo} · ${sub}`),nome('xlsx'));
    else { msg('Gerando o PDF…'); const jp=await carregaJsPDF(); RC.baixar(RC.pdf(jp,Sx,{titulo,sub,rodape:`Vivere · HUB · ${titulo} · ${o.hoje.split('-').reverse().join('/')}`}),nome('pdf')); msg(''); }
  }catch(e){ msg('Não consegui gerar o arquivo. Tente de novo.'); } }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-relcrmper],[data-relcrmbx]'); if(!b) return;
  if(b.dataset.relcrmper){ relCRM.per=b.dataset.relcrmper; relCRMGuarda(); return render(); }
  const [q,f]=b.dataset.relcrmbx.split('|'); relCRMBaixar(q,f); });
document.addEventListener('change',e=>{ const t=e.target; if(!t||!['relcrm-cor','relcrm-de','relcrm-ate'].includes(t.id)) return;
  if(t.id==='relcrm-cor') relCRM.cor=t.value; else if(t.id==='relcrm-de') relCRM.de=t.value; else relCRM.ate=t.value; relCRMGuarda(); render(); });

/* 05/11/2026 (pedido do Cleiton): Diretores com espaço próprio no Funil dos corretores. Recebem leads das campanhas, mas não
   estão no CRM dos corretores: os números vêm das planilhas de leads (coluna Progresso). Quem é diretor: controle/paineis_corretor (papel diretor). */
function diretoresLeads(){ const it=(((S.controle||{}).paineis_corretor||{}).itens)||{}, p1=s=>semAc(String(s||'').trim().split(/\s+/)[0]||'').toLowerCase();
  const um=s=>String(s||'').trim().split(/\s+/).length===1; // 1º nome só quando a planilha traz uma palavra só (evita "Luciano Fulano")
  const D=Object.entries(it).filter(([,v])=>v&&v.papel==='diretor').map(([slug,v])=>({slug,nome:v.nome_painel||slug,p:p1(v.nome_painel||slug),k:chaveCorretor(v.nome_painel||'')}))
    .sort((a,b)=>a.nome.localeCompare(b.nome,'pt')); const T=leadsTodos();
  return D.map(d=>{ const L=T.filter(x=>x.corretor&&((d.k&&chaveCorretor(x.corretor)===d.k)||(um(x.corretor)&&p1(x.corretor)===d.p)));
    const fr={}; L.forEach(x=>{ const c=chaveCorretor(x.corretor); if(c) fr[c]=(fr[c]||0)+1; }); const chave=Object.keys(fr).sort((a,b)=>fr[b]-fr[a])[0]||d.k;
    return Object.assign(d,{L,chave}); }); }
function blocoDiretores(){ const D=diretoresLeads(); if(!D.length) return '';
  const lin=D.map(d=>{ const n=d.L.length, por={}; d.L.forEach(x=>{ const s=x.status||'sem_status'; por[s]=(por[s]||0)+1; }); const vend=por.vendido||0;
    const fun=Object.keys(STL).concat(['sem_status']).filter(k=>por[k]).map(k=>`<span class="pill ${(STL[k]||['',''])[1]}">${esc((STL[k]||['sem status'])[0])}</span> ${por[k]}`).join(' ')||'—';
    return `<tr><td>${esc(d.nome)}<span class="s">diretor</span></td><td class="n">${n}</td><td>${fun}</td><td class="n">${vend}</td><td class="n" style="white-space:nowrap">${n?pct(vend/n):'—'}${n&&d.chave?` <button class="btn" data-leadcor="${esc(d.chave)}" style="margin-left:8px">Ver leads</button>`:''}</td></tr>`; }).join('');
  return `<h2 style="margin-top:24px">Diretores</h2><p class="nota">Também recebem leads das campanhas, mas não estão no CRM dos corretores: os números vêm das planilhas de leads (coluna Progresso). "Ver leads" abre a Lista de leads de cada um.</p>
  <div class="tabela"><table><thead class="quebra"><tr><th>Diretor</th><th class="n">Leads</th><th>Funil (status da planilha)</th><th class="n">Vendidos</th><th class="n">Conversão</th></tr></thead><tbody>${lin}</tbody></table></div>`; }

/* cartões dos corretores no Funil dos corretores (30/10/2026, pedido do Cleiton): todos minimizados; o clique abre os leads
   daquele corretor com as visões escolhidas (Lista, Kanban, Pipeline, Funil, Agenda). "Todos" abre a carteira inteira. */
function cartoesCor(ativos){ const T=lista('crm_leads').map(x=>Object.assign({},x,{etapa:etapaCRM(x)}));
  const num=L=>({t:L.length,ab:L.filter(x=>ABERTAS_CRM.has(x.etapa)).length,fe:L.filter(x=>GANHO_CRM.has(x.etapa)).length,al:L.filter(x=>motivosLead(x._id).length).length});
  const cart=(k,nome,sub,L)=>{ const n=num(L), on=fCRM.sel===k;
    return `<button type="button" class="crm-cor${on?' on':''}${n.al?' alerta':''}" data-crmsel="${esc(on?'':k)}" aria-pressed="${on}"><span class="nm">${esc(nome)}</span>${sub?`<span class="sb">${esc(sub)}</span>`:''}
      <span class="nn"><b>${n.t}</b> lead${n.t===1?'':'s'} · ${n.ab} em aberto · ${n.fe} fechado${n.fe===1?'':'s'}</span>${n.al?`<span class="pill bad">${n.al} a cobrar</span>`:'<span class="pill ok">em dia</span>'}</button>`; };
  const cs=ativos.map(c=>cart(c.slug,c.nome,c.equipe||'',T.filter(x=>x.corretor===c.slug)));
  return `<div class="crm-cors">${cart('*','Todos os corretores',ativos.length+' no CRM',T)}${cs.join('')}</div>`; }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-crmsel]'); if(!b) return; const k=b.dataset.crmsel;
  Object.assign(fCRM,{sel:k,cor:k==='*'?'':k}); render(); if(k) setTimeout(()=>{ const t=document.querySelector('.crm-aberto'); if(t) t.scrollIntoView({block:'start',behavior:'smooth'}); },60); });
/* ---------- Visões do CRM (30/10/2026, pedido do Cleiton): Lista, Kanban, Pipeline, Funil e Agenda ----------
   Biblioteca VisoesCRM (mesma do painel do corretor). Funil dos corretores: a diretoria move o lead no kanban; a mudança fica em
   crm_etapas/<id do lead> (por: diretoria) e a rotina diária a leva ao painel do corretor (espelho_etapas.py, passo 7d). Mudança feita
   pelo corretor no painel volta para crm_etapas (por: corretor). Leads e Oportunidades: kanban só para ver (fonte só leitura). */
const diasDe=(a)=>{ if(!a) return null; const d=Math.round((new Date(hojeISO()+'T12:00')-new Date(String(a).slice(0,10)+'T12:00'))/864e5); return isNaN(d)?null:d; };
const agoraLocal=()=>new Date(Date.now()-3*3600e3).toISOString().slice(0,19);
function temPainel(slug){ const it=(((S.controle||{}).paineis_corretor||{}).itens||{})[slug]; return !!(it&&it.url); }
function itemCRM(x){ const mo=motivosLead(x._id), m=x._mov; const alerta=mo.includes('primeiro')||mo.includes('vencida');
  const marca=m&&m.por==='diretoria'&&!m.aplicado_em?(temPainel(x.corretor)?'movido pela diretoria · vai ao painel do corretor na próxima rotina':'movido pela diretoria · o corretor ainda não tem painel: ajustar também na planilha dele'):m&&m.por==='corretor'?'atualizado pelo corretor no painel':'';
  return {id:x._id,nome:x.nome,etapa:x.etapa||'Novo',prox:x.prox,data_prox:x.data_prox,alerta,abre:`data-vcrmlead="${esc(x._id)}"`,quem:nomeCRM(x.corretor),
    pills:pillIntK(x._int)+mo.map(k=>`<span class="pill ${alc(k)[1]}">${esc(alc(k)[0])}</span>`).join(''),sub:esc([nomeCRM(x.corretor),x.campanha,x.imovel_int].filter(Boolean).join(' · ')),dias:diasDe(x.ultimo||x.entrada),marca}; }
const NE_CRM='Não entregue', ETAPAS_TODAS=[NE_CRM].concat(ETAPAS_CRM);
// 04/11/2026 (opção A, fatia 2b): lead de campanha que ainda não está no CRM de nenhum corretor (mesmo id em leads_contatos e crm_leads)
function naoEntregues(semInt){ if(fCRM.cor||fCRM.al) return []; const C=S.crm_leads||{}, q=semAc(fCRM.q||'').trim();
  return lista('leads_contatos').filter(x=>x&&x._id&&!C[x._id]&&(!q||semAc([x.nome,x.campanha,x.imovel,x.corretor].join(' ')).includes(q)))
    .map(x=>Object.assign({},x,{_int:intHub(x,null)})).filter(x=>semInt||!fCRM.int||x._int.k===fCRM.int)
    .sort((a,b)=>String(b.data||'').localeCompare(String(a.data||''))).map(x=>{ const st=STL[x.status]||null;
      return {id:x._id,nome:x.nome,etapa:NE_CRM,quem:x.corretor||'sem corretor',_int:x._int,pills:pillIntK(x._int)+(st?`<span class="pill ${st[1]}">${esc(st[0])}</span>`:''),
        sub:esc([x.corretor,x.campanha,x.imovel].filter(Boolean).join(' · ')),dias:diasDe(x.data),marca:'ainda não entregue a um corretor: está só na planilha da campanha'}; }); }
function resCRM(){ const et0=fCRM.et; fCRM.et=''; const L0=filtraCRM(true), N0=naoEntregues(true); fCRM.et=et0; // a etapa escolhida filtra só a lista
  const chF=chipsFunilCRM(L0.concat(N0)), FU=FCH&&FCH.FUNIS[fFunilCRM]?FCH.FUNIS[fFunilCRM]:null, ETF=FU?[NE_CRM].concat(FU.etapas):ETAPAS_TODAS;
  const okI=x=>(!fCRM.int||x._int.k===fCRM.int)&&okFunilCRM(x), L=L0.filter(okI), I=L.map(itemCRM), T=N0.filter(okI).map(({_int,...r})=>r).concat(I);
  const pede=`<p class="nota" style="margin:6px 0">Kanban, Pipeline e Funil mostram um funil por vez: escolha Locação, Venda, Captação, Temporada ou A definir acima.</p>`;
  return chF+chipsInt('funil',L0.filter(okFunilCRM).map(x=>x._int).concat(N0.filter(okFunilCRM).map(x=>x._int)),fCRM.int)+VisoesCRM.montar('funil',PREFS,{lista:()=>tabCRM(),
    kanban:()=>FCH&&!FU?pede:T.length?VisoesCRM.kanban('funil',T,{etapas:ETF,podeMover:!!DB,notaMover:'A mudança fica registrada como da diretoria e vai ao painel do corretor na rotina diária.'}):vazio('Nenhum lead com esse filtro.'),
    pipeline:()=>FCH&&!FU?pede:VisoesCRM.pipeline('funil',T,{etapas:ETF}),
    funil:()=>FCH&&!FU?pede:VisoesCRM.funil('funil',VisoesCRM.degrausEtapas(T,ETF,['Perdido']),{nota:'Cada degrau conta quem chegou àquela etapa ou passou dela. O 1º degrau soma os leads das campanhas, entregues ou não. Perdidos saem do funil. Respeita os filtros acima.'}),
    agenda:()=>VisoesCRM.agenda('funil',I,{so:x=>ABERTAS_CRM.has(x.etapa),vazio:'Nenhum lead em aberto com esse filtro.'})}); }
async function moverCRM(id,etapa,rep){ rep=rep||(()=>pintaRes('crm-res',resCRM)); const x=(S.crm_leads||{})[id]; if(!x&&(S.leads_contatos||{})[id]){ rep(); alert('Este lead ainda não foi entregue a um corretor: entregue pela planilha da campanha para movê-lo no funil.'); return; } if(!x||!DB||!(FCH?FCH.todasEtapas():ETAPAS_CRM).includes(etapa)) return; const de=etapaCRM(Object.assign({_id:id},x)); if(de===etapa) return;
  let motivo=''; if(etapa==='Perdido'){ motivo=await VisoesCRM.pedeMotivo(FCH?FCH.todosMotivos():['Sem retorno','Sem perfil/orçamento','Comprou/alugou com outro','Desistiu','Contato inválido','Duplicado','Outro']); if(!motivo) return; }
  const doc={etapa,de,motivo,em:agoraLocal(),por:'diretoria',uid:UID||'',corretor:x.corretor||'',nome:x.nome||''};
  const antes=S.crm_etapas; S.crm_etapas=Object.assign({},S.crm_etapas,{[id]:doc}); rep();
  try{ await DB.doc('crm_etapas/'+id).set(doc); }catch(e){ S.crm_etapas=antes; rep(); alert('Não foi possível mover: '+((e&&e.message)||e)); } }
function pintaRes(id,f){ const el=document.getElementById(id); if(el) el.innerHTML=f(); }
// Leads (campanhas): status da coluna Progresso
const ST_ORD=[['sem_registro','sem registro'],['em_contato','em contato'],['sem_retorno','sem retorno'],['visita','visita'],['vendido','vendido'],['descartado','descartado'],['outro','outro'],['sem_status','sem status']];
const ST_ROT=Object.fromEntries(ST_ORD), ST_KEY=Object.fromEntries(ST_ORD.map(([k,t])=>[t,k]));
function resLeads(){ const st0=fLeads.st; let L, L0; try{ fLeads.st=''; L0=filtraLeads(true); }finally{ fLeads.st=st0; } L=L0.filter(x=>!fLeads.int||x._int.k===fLeads.int); const crm=S.crm_leads||{}; // 05/11/2026: a etapa escolhida filtra só a Lista e a Agenda
  const I=L.map(x=>{ const c=crm[x._id]||{}; const st=x.status||'sem_status'; return {id:x._id||x.nome,nome:x.nome,etapa:ST_ROT[st]||'outro',prox:c.prox,data_prox:c.data_prox,quem:x.corretor?nomeCorPes(x.corretor):'sem corretor',
    pills:pillIntK(x._int),sub:esc([x.campanha,x.corretor?nomeCorPes(x.corretor):'sem corretor',x.data?dt(x.data):''].filter(Boolean).join(' · ')),marca:x.progresso?String(x.progresso).slice(0,90):'',dias:diasDe(x.data)}; });
  const n=f=>L.filter(f).length, s=x=>x.status||'sem_status';
  const deg=[{rot:'Entradas',n:L.length},{rot:'Com registro',n:n(x=>!['sem_registro','sem_status'].includes(s(x)))},{rot:'Em contato ou além',n:n(x=>['em_contato','visita','vendido'].includes(s(x)))},{rot:'Visita',n:n(x=>['visita','vendido'].includes(s(x)))},{rot:'Vendido',n:n(x=>s(x)==='vendido')}];
  ['sem_retorno','descartado'].forEach(k=>{ const q=n(x=>s(x)===k); if(q) deg.push({rot:ST_ROT[k],n:q,saida:true,sub:'saíram do funil'}); });
  const et=ST_ORD.map(z=>z[1]);
  // 05/11/2026 (pedido do Cleiton): o Kanban da Lista usa as etapas do CRM e a diretoria arrasta os leads já entregues (grava crm_etapas, como no Funil dos corretores)
  const ET=S.crm_etapas||{};
  const IK=L.map(x=>{ const c=crm[x._id], quem=x.corretor?nomeCorPes(x.corretor):'sem corretor';
    const b={id:x._id||x.nome,nome:x.nome,quem,pills:pillIntK(x._int),sub:esc([x.campanha,quem,x.data?dt(x.data):''].filter(Boolean).join(' · ')),dias:diasDe(x.data)};
    if(!c) return Object.assign(b,{etapa:NE_CRM,_fu:funilCRM(x),marca:'ainda não entregue a um corretor: está só na planilha da campanha'});
    const m=ET[x._id];
    const e0=etapaCRM(Object.assign({_id:x._id},c));
    return Object.assign(b,{etapa:FCH?FCH.etapaNoFunil(e0,funilCRM(x)):e0,_fu:funilCRM(x),prox:c.prox,data_prox:c.data_prox,
      marca:m&&m.por==='diretoria'&&!m.aplicado_em?(temPainel(c.corretor)?'movido pela diretoria · vai ao painel do corretor na próxima rotina':'movido pela diretoria · o corretor ainda não tem painel: ajustar também na planilha dele'):m&&m.por==='corretor'?'atualizado pelo corretor no painel':''}); });
  return chipsInt('leads',L0.map(x=>x._int),fLeads.int)+VisoesCRM.montar('leads',PREFS,{lista:()=>`<div id="leads-tab">${tabLeads()}</div>`,
    kanban:()=>{ const chFk=chipsFunilCRM(L0), FUk=FCH&&FCH.FUNIS[fFunilCRM]?FCH.FUNIS[fFunilCRM]:null;   // 16/11/2026: um funil por vez (ampliação do CRM, fatia 1b)
      if(FCH&&!FUk) return chFk+'<p class="nota" style="margin:6px 0">O Kanban mostra um funil por vez: escolha Locação, Venda, Captação, Temporada ou A definir acima.</p>';
      return chFk+VisoesCRM.kanban('leads',FUk?IK.filter(y=>y._fu===fFunilCRM):IK,{etapas:FUk?[NE_CRM].concat(FUk.etapas):ETAPAS_TODAS,destinos:FUk?FUk.etapas:ETAPAS_CRM,podeMover:!!DB,podeMoverItem:x=>x.etapa!==NE_CRM,max:80,notaMover:'Colunas = etapas do CRM; só os leads já entregues a um corretor movem. A mudança fica registrada como da diretoria e vai ao painel do corretor na rotina diária.',notaLeitura:'Colunas = etapas do CRM (só para ver nesta sessão).'}); },
    pipeline:()=>marcaEtapaLeads(VisoesCRM.pipeline('leads',I,{etapas:et}),st0),
    funil:()=>VisoesCRM.funil('leads',deg,{nota:'Pelo status das planilhas de leads, com os filtros de corretor, campanha e mês (todas as etapas).'}),
    agenda:()=>VisoesCRM.agenda('leads',I,{so:x=>!['vendido','descartado'].includes(x.etapa)&&(!st0||x.etapa===ST_ROT[st0]),vazio:'Nenhuma próxima ação marcada no CRM para estes leads.'})}); }
// 05/11/2026 (pedido do Cleiton): no Pipeline da Lista de leads a etapa escolhida fica destacada e clicar de novo nela limpa o filtro (a biblioteca VisoesCRM não muda)
function marcaColLeads(html,st){ const e=st?ST_ROT[st]:''; return e?html.replace(`class="vk-col" data-vk-col="leads|${esc(e)}"`,`class="vk-col on" data-vk-col="leads|${esc(e)}"`):html; }
function marcaEtapaLeads(html,st){ const nota='Clique numa etapa para ver os leads dela na Lista; a etapa escolhida fica destacada aqui, e clicar de novo nela limpa o filtro.';
  html=html.replace('Clique numa etapa para filtrar a lista e o kanban.',nota); const e=st?ST_ROT[st]:''; if(!e) return html;
  return html.replace(`class="vp-l" data-vp-etapa="leads|${esc(e)}" title="Ver os leads em ${esc(e)}"`,`class="vp-l on" aria-pressed="true" data-vp-etapa="leads|${esc(e)}" title="Etapa escolhida: clique para limpar o filtro"`); }
// Oportunidades: situação das ofertas de cada lead
const OP_ET=['Sem perfil','Com ofertas','Sem imóvel que combine','Já ofertado','Encerrado'];
function etOp(x){ if(!x.l.aberto) return 'Encerrado'; if(!x.o.p) return 'Sem perfil'; if(x.o.novas.length) return 'Com ofertas'; if(x.o.ofertados.length) return 'Já ofertado'; return 'Sem imóvel que combine'; }
function visoesOport(base){ const crm=S.crm_leads||{};
  const I=base.map(x=>{ const c=crm[x.l.id]||{}; return {id:x.l.id,nome:x.l.nome,pills:pillIntK(x.l._int),etapa:etOp(x),prox:c.prox,data_prox:c.data_prox,quem:x.l.corretor?nomeCorPes(x.l.corretor):'sem corretor',
    sub:esc([x.l.campanha,x.l.corretor?nomeCorPes(x.l.corretor):'sem corretor'].filter(Boolean).join(' · ')),marca:x.o.novas.length?x.o.novas.length+' imóve'+(x.o.novas.length===1?'l':'is')+' para ofertar':x.o.ofertados.length?x.o.ofertados.length+' já ofertado'+(x.o.ofertados.length===1?'':'s'):'',dias:diasDe(x.l.data)}; });
  const A=base.filter(x=>x.l.aberto);
  return {kanban:()=>VisoesCRM.kanban('oport',I,{etapas:OP_ET,podeMover:false,max:80,notaLeitura:'Só para ver: a coluna muda sozinha conforme o perfil, as ofertas e a etapa do lead no CRM.'}),
    pipeline:()=>VisoesCRM.pipeline('oport',I,{etapas:OP_ET}),
    funil:()=>VisoesCRM.funil('oport',[{rot:'Leads em aberto',n:A.length},{rot:'Com perfil',n:A.filter(x=>x.o.p).length},{rot:'Com imóvel que combina',n:A.filter(x=>x.o.p&&(x.o.novas.length||x.o.ofertados.length)).length},{rot:'Já ofertado',n:A.filter(x=>x.o.ofertados.length).length}],{nota:'Leads em aberto, com os filtros de corretor e campanha acima.'}),
    agenda:()=>VisoesCRM.agenda('oport',I.filter(x=>x.etapa!=='Encerrado'),{vazio:'Nenhuma próxima ação marcada no CRM para estes leads.'})}; }
function mudouVisoes(c,v){ const r=VisoesCRM.alternar(c,PREFS,v); PREFS=Object.assign({},PREFS,{visoes_crm:r.todas}); render();
  gravaPref({visoes_crm:r.todas},'Não consegui guardar a visão do CRM na sua conta: por enquanto ela vale só neste aparelho.'); }
function ligaLista(c){ if(!VisoesCRM.ativas(c,PREFS).includes('lista')){ const r=VisoesCRM.alternar(c,PREFS,'lista'); PREFS=Object.assign({},PREFS,{visoes_crm:r.todas}); } }
VisoesCRM.instalar({ mudou:mudouVisoes, mover:(c,id,et)=>{ if(c==='funil') moverCRM(id,et); else if(c==='leads') moverCRM(id,et,()=>pintaRes('leads-res',resLeads)); },
  etapa:(c,et)=>{ if(c==='leads'&&fLeads.st&&fLeads.st===(ST_KEY[et]||'')){ fLeads.st=''; fLeads.pg=0; render(); return; } ligaLista(c);
    if(c==='funil'){ fCRM.et=et; fCRM.al=''; }
    else if(c==='leads'){ fLeads.st=ST_KEY[et]||''; fLeads.pg=0; }
    else if(c==='oport'){ fOp.st=et==='Com ofertas'?'ofertas':et==='Sem perfil'?'sem_perfil':'todos'; fOp.pg=0; }
    render(); setTimeout(()=>{ const t=document.querySelector('[data-vcrm-v="lista"]'); if(t) t.scrollIntoView({block:'start',behavior:'smooth'}); },60); } });
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-vcrmlead]'); if(!b) return; const x=(S.crm_leads||{})[b.dataset.vcrmlead]; if(!x) return;
  ligaLista('funil'); Object.assign(fCRM,{q:x.nome||'',et:'',al:'',sel:x.corretor||'*',cor:x.corretor||''}); render(); setTimeout(()=>{ const t=document.getElementById('lista-crm'); if(t) t.scrollIntoView({block:'start',behavior:'smooth'}); },60); });
/* ---------- CRM › Visão geral (26/10/2026): a porta de entrada da área CRM ---------- */
function leadsMes(){ const mes=hojeISO().slice(0,7); const [y,m]=mes.split('-').map(Number); const ant=m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,'0')}`;
  const R0=(S.leads||{}).resumo; const pm=R0?(mesclaResumo(R0,extraLeads()).por_mes||{}):null; const LM=leadsTodos();
  return {mes,ant,n:pm?(pm[mes]||0):LM.filter(x=>x.mes===mes).length,nAnt:pm?(pm[ant]||0):LM.filter(x=>x.mes===ant).length}; }
function pCRMVisao(){
  const temAba=id=>ABAS.some(a=>a[0]===id);
  const IM=lista('imoveis').filter(x=>x.ativo); const nFin=f=>IM.filter(x=>finDe(x._id)===f).length;
  const parados=new Set(lista('pendencias').filter(x=>x.status==='aberta'&&x.tipo==='site_anuncio_parado').flatMap(x=>x.refs||[])).size;
  const LD=leadsMes(), semCor=leadsTodos().filter(x=>!x.corretor).length;
  const T=lista('crm_leads'), al=crmRes().alertas||{}, nAl=(al.primeiro||0)+(al.vencida||0);
  const pl=((S.portais_plano||{}).canalpro)||null; const E=Object.keys(S.empreendimentos_fichas||{}).length;
  const P=lista('pendencias').filter(x=>x.status==='aberta'&&areaPend(x)==='crm').sort(ordPend);
  const nAg=P.filter(x=>/^agenciamento_/.test(String(x.tipo||''))).length;
  const k=[
    {aba:'imoveis',rot:'Anúncios no site',num:IM.length,sub:`venda ${nFin('V')} · locação ${nFin('A')} · temporada ${nFin('T')}${parados?`<br>${parados} sem atualização`:''}`},
    {aba:'leads',rot:`Leads ${mesTxt(LD.mes)}`,num:LD.n,sub:`${mesTxt(LD.ant)}: ${LD.nAnt}${semCor?` · ${semCor} sem corretor`:''}`},
    {aba:'crm',rot:'Funil dos corretores',num:T.length,sub:T.length?`${al.primeiro||0} sem 1º contato · ${al.vencida||0} ação vencida · ${al.parado||0} parados`:'nenhum corretor ativo no CRM',alerta:nAl>0},
    temAba('portais')?{aba:'portais',rot:'Portais (30 dias)',num:pl?pl.leads_30d??'—':'—',sub:pl?`leads do CanalPro · ${pl.anuncios_usados??'—'} de ${pl.anuncios_contratados??'—'} anúncios no plano`:'aguardando coleta do CanalPro'}:null,
    temAba('empreendimentos')?{aba:'empreendimentos',rot:'Empreendimentos',num:E||'—',sub:'fichas no cadastro'}:null,
    temAba('inatividade-agenciamento')?{aba:'inatividade-agenciamento',rot:'Agenciamentos',num:nAg,sub:'avisos de 20 dias e divisões em aberto<br>regra vale com o app dos corretores no ar',alerta:false}:null,
    {aba:'pendencias',rot:'Pendências do CRM',num:P.length,sub:(n=>n?`${n} de prioridade alta`:'nenhuma alta')(P.filter(x=>x.prioridade==='alta').length),alerta:P.some(x=>x.prioridade==='alta')},
  ].filter(Boolean);
  const co=S.controle.coletas||{}; const FONTES=[['imobibrasil','Imobibrasil','anúncios e proprietários'],['leads','Leads','planilhas de campanhas'],['crm','CRM','planilhas dos corretores'],['drive','Drive','03 Negócios']];
  const velhas=FONTES.filter(([f])=>{ const x=co[f]||{}; const d=x.em?diasDesde(String(x.em).slice(0,10)):null; return x.status==='falhou'||d==null||d>3; });
  const fontes=FONTES.map(([f,n,o])=>{ const x=co[f]||{}; const d=x.em?diasDesde(String(x.em).slice(0,10)):null; const ruim=x.status==='falhou'||d==null||d>3;
    return `<span class="chip ${ruim?'falhou':'ok'}" title="${esc(o+(x.msg?' — '+x.msg:''))}"><i></i>${n} · ${x.em?dt(String(x.em).slice(0,10))+(d?` (${d} d)`:''):'sem coleta'}</span>`; }).join(' ');
  const aviso=velhas.length?`<div class="aviso" style="margin:0 0 14px">Coleta parada ou com falha: <b>${velhas.map(v=>v[1]).join(', ')}</b>. ${velhas.some(v=>v[0]==='imobibrasil')?'Os anúncios só se atualizam com o login no Imobibrasil feito no navegador do app (a rotina nunca digita senha).':''}</div>`:'';
  return `<h2>CRM — visão geral</h2><p class="nota">A parte comercial da Vivere num lugar só: anúncios e cadastros de imóveis, mapa, empreendimentos, agenciamentos, leads, funil dos corretores, portais e pessoas. É a base dos painéis dos corretores e do futuro site. Carteira, cobrança, vendas fechadas (contrato, comissão e a receber) e o financeiro ficam em Locação e Financeiro.</p>
  ${aviso}<div class="filtros datas" style="margin-bottom:14px"><span class="rot">Fontes do CRM:</span>${fontes}</div>
  <div class="kpis" style="margin-top:0">${k.map(x=>`<button class="kpi ${x.alerta?'alerta':''}" data-aba="${x.aba}"><span class="rot">${x.rot}</span><span class="num">${x.num}</span><span class="sub">${x.sub}</span></button>`).join('')}</div>
  <h2 style="margin-top:8px">Pendências do CRM</h2><p class="nota">As mesmas da aba Pendências (Início), só as da parte comercial.</p>
  ${P.length?P.map(itemPend).join(''):vazio(carregado.pendencias?'Nenhuma pendência do CRM em aberto.':'Carregando…')}`;
}
// ---------------------------------------------------------------- Construções (organograma) e módulos
// Cada construção é independente: documento em `construcoes/<id>` (status feito | piloto | a_fazer | em_construcao, área, resumo, briefing)
// e, quando instalada, um arquivo publicado `modulos/<id>.js` que se registra com HUB.registrar(...). Contrato: _hub\modulos\LEIA-ME.md
const AREAS_C=[['base','Base de dados e rotina'],['comercial','Comercial e clientes'],['imoveis','Imóveis e empreendimentos'],['documentos','Documentos'],['marketing','Marketing e mídias'],['pessoas','Pessoas e parceiros'],['juridico','Jurídico'],['financeiro','Financeiro']];
const ST_C={feito:['Instalada','ok'],piloto:['Instalada · em testes','warn'],em_construcao:['Em construção','warn'],a_fazer:['A fazer','info']};
// 18/10/2026: piloto = instalada, com a observação de que está em testes; conta em "Instaladas" e não mostra Instalar
const instalada=x=>x.status==='feito'||x.status==='piloto';
let fConst='todas', instalarId='';
// "Nova instalação": o Cleiton registra o conceito; a rotina (passo 6c) lê o pedido e escreve o briefing
let novaAberta=false, NC={titulo:'',area:'',conceito:'',obs:''}, ncErro='', ncSalvando=false, cancelarPend='';
function pConstrucoes(){
  const L=lista('construcoes').sort((a,b)=>(a.ordem||0)-(b.ordem||0));
  if(!L.length) return vazio(carregado.construcoes?'Nenhuma construção cadastrada.':'Carregando as construções…');
  const n=k=>L.filter(x=>k==='feitas'?instalada(x):k==='a_fazer'?!instalada(x):k==='testes'?x.status==='piloto':true).length;
  const ver=L.filter(x=>fConst==='todas'||(fConst==='feitas'?instalada(x):!instalada(x)));
  const areas=AREAS_C.concat([...new Set(L.map(x=>x.area))].filter(a=>!AREAS_C.some(z=>z[0]===a)).map(a=>[a,(L.find(x=>x.area===a)||{}).area_nome||a]));
  const item=x=>{ const pend=x.briefing_status==='pendente', duv=x.briefing_status==='duvida'; const st=pend?['Aguardando briefing','warn']:duv?['Briefing com dúvida','bad']:(ST_C[x.status]||[esc(x.status||'—'),'']); const m=MODS_ERRO[x._id];
    return `<div class="org-item ${esc(x.status)}"><span class="pill ${st[1]}">${st[0]}</span>${x.quando?` <span class="s" style="display:inline">${esc(x.quando)}</span>`:''}
      <h4>${esc(x.titulo)}</h4><p>${esc(x.resumo||'')}</p>${x.status==='piloto'?`<p style="margin-top:4px">Em testes: já está no HUB e em uso; ajustes ainda podem mudar a aba.</p>`:''}${x.briefing_copiado_em&&!instalada(x)?`<p style="margin-top:4px">Briefing copiado em ${dt(x.briefing_copiado_em)}.</p>`:''}${m?`<p style="color:var(--bad)">Módulo não carregou: ${esc(m)}</p>`:''}${pend?`<p style="margin-top:4px">Pedido em ${dt(x.pedido_em)}. O briefing sai na próxima atualização do HUB (dias úteis, 10h30).</p>`:''}${duv?`<p style="margin-top:4px;color:var(--bad)">O Claude precisa de mais detalhe antes do briefing: ${esc(x.briefing_duvida||'')} Cancele e registre de novo com a resposta, ou responda numa tarefa deste projeto.</p>`:''}
      <div class="acoes">${!instalada(x)&&x.briefing?`<button class="btn" data-instalar="${esc(x._id)}">Instalar</button>`:''}${(pend||duv)&&x.origem==='botao'?`<button class="btn" data-cancelar-pedido="${esc(x._id)}">${cancelarPend===x._id?'Confirmar cancelamento':'Cancelar pedido'}</button>`:''}${MODS[x._id]&&MODS[x._id].aba?`<button class="btn" data-aba="${esc(x._id)}">Abrir aba</button>`:''}</div></div>`; };
  const ramos=areas.map(([a,nome])=>{ const it=ver.filter(x=>x.area===a); return it.length?`<div class="org-ramo"><h3>${esc(nome)}</h3>${it.map(item).join('')}</div>`:''; }).join('');
  return `<h2>Construções do HUB</h2><p class="nota">Cada parte do HUB é uma construção independente: várias podem ser construídas ao mesmo tempo, cada uma na sua tarefa. Em "A fazer", <b>Instalar</b> abre o briefing para colar numa nova tarefa deste projeto; o Claude começa pelas perguntas-chave. Ideia nova: <b>Nova instalação</b> — você descreve o conceito e, na próxima atualização do HUB, o Claude escreve o briefing.</p>
  <div class="filtros"><button class="btn" data-fconst="todas" aria-pressed="${fConst==='todas'}">Todas (${n('todas')})</button><button class="btn" data-fconst="a_fazer" aria-pressed="${fConst==='a_fazer'}">A fazer (${n('a_fazer')})</button><button class="btn" data-fconst="feitas" aria-pressed="${fConst==='feitas'}">Instaladas (${n('feitas')})</button><button class="btn" data-nova-instalacao="1" style="margin-left:auto">+ Nova instalação</button></div>
  <div class="org-raiz"><b>HUB Vivere</b><div class="s">${n('feitas')} instaladas${n('testes')?` (${n('testes')} em testes)`:''} · ${n('a_fazer')} a fazer</div></div><div class="org-tronco"></div>
  <div class="org-ramos">${ramos}</div>${instalarId?modalInstalar():''}${novaAberta?modalNova():''}`;
}
function modalInstalar(){ const x=(S.construcoes||{})[instalarId]; if(!x) return '';
  return `<div class="modal-fundo" data-fechar-modal="1"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mod-tit">
    <h2 id="mod-tit" style="margin-top:0">Instalar: ${esc(x.titulo)}</h2>
    <ol><li>Abra uma <b>nova tarefa</b> no projeto Vivere Imóveis Selecionados.</li><li>Cole o briefing abaixo e envie.</li><li>O Claude começa pelas perguntas-chave e só depois constrói.</li></ol>
    <textarea id="briefing-txt" readonly>${esc(briefingComNome(x))}</textarea>
    <div class="acoes" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-copiar-briefing="${esc(instalarId)}">Copiar briefing</button><button class="btn" data-fechar-modal="1">Fechar</button></div>
  </div></div>`; }
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&instalarId){ instalarId=''; render(); } else if(e.key==='Escape'&&novaAberta){ novaAberta=false; ncErro=''; render(); } });
function modalNova(){ const ar=AREAS_C.map(([k,v])=>`<option value="${esc(k)}"${NC.area===k?' selected':''}>${esc(v)}</option>`).join('');
  return `<div class="modal-fundo" data-fechar-nova="1"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="nc-tit">
    <h2 id="nc-tit" style="margin-top:0">Nova instalação</h2>
    <p class="nota">Descreva a ideia com as suas palavras. Na próxima atualização do HUB (dias úteis, 10h30) o Claude lê o conceito, confere o que já existe no HUB e escreve o briefing com as perguntas-chave. Depois é só usar <b>Instalar</b>.</p>
    <div class="form-nc">
      <label for="nc-titulo">Nome da construção</label><input id="nc-titulo" maxlength="60" value="${esc(NC.titulo)}" placeholder="Ex.: Agenda de vistorias">
      <label for="nc-area">Área do organograma</label><select id="nc-area"><option value="">Escolha a área</option>${ar}</select>
      <label for="nc-conceito">Conceito</label><textarea id="nc-conceito" rows="6" placeholder="O que você quer, para quem e que problema resolve">${esc(NC.conceito)}</textarea>
      <label for="nc-obs">Observações (opcional)</label><textarea id="nc-obs" rows="3" placeholder="Fontes, pessoas envolvidas, o que já existe, urgência">${esc(NC.obs)}</textarea>
    </div>
    ${ncErro?`<p style="color:var(--bad);margin:10px 0 0">${esc(ncErro)}</p>`:''}
    <div class="acoes" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-salvar-nova="1"${ncSalvando?' disabled':''}>${ncSalvando?'Registrando…':'Registrar pedido'}</button><button class="btn" data-fechar-nova="1">Cancelar</button></div>
  </div></div>`; }
async function salvaNova(){ if(!DB||ncSalvando) return; const t=NC.titulo.trim(), c=NC.conceito.trim();
  if(!t||!c||!NC.area){ ncErro='Preencha o nome, a área e o conceito.'; render(); return; }
  const base=t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36)||'construcao';
  // 15/11/2026 (hub #26): id com sufixo curto e conferido no banco, para dois registros do mesmo título não se sobrescreverem
  const suf=()=>Date.now().toString(36).slice(-4)+Math.floor(Math.random()*36).toString(36);
  let id=base+'-'+suf(); for(let k=0;k<5;k++){ let ex=!!(S.construcoes||{})[id]; if(!ex){ try{ const d=await DB.doc('construcoes/'+id).get(); ex=!!(d&&(typeof d.exists==='function'?d.exists():d.exists)); }catch(_){ ex=false; } } if(!ex) break; id=base+'-'+suf(); }
  const ordem=Math.max(0,...lista('construcoes').map(x=>x.ordem||0))+1; const area=AREAS_C.find(a=>a[0]===NC.area);
  ncSalvando=true; ncErro=''; render();
  try{ await DB.doc('construcoes/'+id).set({titulo:t, area:NC.area, area_nome:area?area[1]:NC.area, status:'a_fazer', briefing_status:'pendente',
      conceito:c, observacoes:NC.obs.trim(), resumo:c.length>160?c.slice(0,157)+'…':c, quando:'pedido em '+dt(hojeISO()), pedido_em:hojeISO(), origem:'botao', ordem});
    NC={titulo:'',area:'',conceito:'',obs:''}; novaAberta=false; fConst='todas';
  }catch(e){ ncErro='Não consegui registrar ('+(e&&e.code||'erro')+'). Tente de novo.'; }
  ncSalvando=false; render(); }
async function cancelaPedido(id){ const x=(S.construcoes||{})[id]; if(!DB||!x||!['pendente','duvida'].includes(x.briefing_status)||x.origem!=='botao') return;
  if(cancelarPend!==id){ cancelarPend=id; render(); return; }
  cancelarPend=''; try{ await DB.doc('construcoes/'+id).delete(); }catch(e){ alert('Não foi possível excluir: '+((e&&e.message)||e)); } render(); }
document.addEventListener('click',e=>{
  if(e.target.closest('[data-nova-instalacao]')){ novaAberta=true; ncErro=''; render(); setTimeout(()=>{const t=document.getElementById('nc-titulo'); if(t) t.focus();},30); return; }
  if(e.target.closest('[data-salvar-nova]')){ salvaNova(); return; }
  const fn=e.target.closest('[data-fechar-nova]'); if(fn&&(e.target===fn||e.target.matches('button'))){ novaAberta=false; ncErro=''; render(); return; }
  const cp=e.target.closest('[data-cancelar-pedido]'); if(cp){ cancelaPedido(cp.dataset.cancelarPedido); return; }
});
document.addEventListener('input',e=>{ if(e.target.id&&e.target.id.startsWith('nc-')) NC[e.target.id.slice(3)]=e.target.value; });
/* nome da sessão (24/10/2026) — padrao-portugues, Parte 2: SIGLA - Tipo - Partes, até 50 caracteres.
   O título vira o bloco "Partes": sem conectivos, sem travessão; acima de 50, abrevia o tipo,
   tira parênteses e datas e, por fim, corta palavras do fim. */
const NOME_INSTR=n=>'ANTES DE TUDO: abra toda resposta com '+n+' sozinho num bloco de código (card de copiar, sem rótulo nem negrito), igual letra por letra. Se o nome fugir da skill padrao-portugues (tipo ou partes), corrija só na 1ª resposta e mantenha o corrigido; ele só muda se a tarefa mudar de natureza ou aparecer a outra parte.';
const NOME_MAX=50;
const NOME_ABREV={'Execução':'Exec.','Construção':'Constr.','Configuração':'Config.','Auditoria':'Audit.','Lembrete':'Lembrete','Skill':'Skill','Organização':'Org.','Automação':'Autom.','Tarefa':'Tarefa'};
const NOME_CONECT=new Set(['e','de','da','do','das','dos','para','pra','com','em','no','na','nos','nas','o','a','os','as','ao','aos','à','às','um','uma','por','pelo','pela','que']);
const NOME_PONTA=new Set(['sem','se','ainda','antes','depois','ou','mais','algum','alguma','cada','entre','sobre','até','quando','como']);
function nomeLimpa(t,semParen){
  let s=String(t||'').replace(/[“”"'`]/g,'').replace(/\s*[—–]\s*/g,' ').replace(/\s*[×]\s*/g,' x ').replace(/[,;:!?⇄→›»«]/g,' ');
  if(semParen) s=s.replace(/\([^)]*\)/g,' ').replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g,' ').replace(/\b\d{1,2}h(\d{2})?\b/g,' ');
  s=s.replace(semParen?/[()\[\]]/g:/[\[\]]/g,' ');
  const w=s.split(/\s+/).filter(Boolean).filter((x,i)=>i===0||!NOME_CONECT.has(x.toLowerCase()));
  while(w.length&&NOME_CONECT.has(w[0].toLowerCase())) w.shift();
  while(w.length>1&&NOME_PONTA.has(w[w.length-1].toLowerCase())) w.pop();
  return w;
}
function nomeSessao(sigla,tipo,texto){
  const tipos=[tipo,NOME_ABREV[tipo]||tipo];
  const monta=(tp,w)=>sigla+' - '+tp+(w.length?' - '+w.join(' '):'');
  for(const semP of [false,true]) for(const tp of tipos){ const n=monta(tp,nomeLimpa(texto,semP)); if(n.length<=NOME_MAX) return n; }
  const tp=tipos[1]; let w=nomeLimpa(texto,true);
  while(w.length>1&&monta(tp,w).length>NOME_MAX) w.pop();
  while(w.length>1&&(/^[-.x+&/]$/i.test(w[w.length-1])||NOME_PONTA.has(w[w.length-1].toLowerCase()))) w.pop();
  let n=monta(tp,w); if(n.length>NOME_MAX) n=n.slice(0,NOME_MAX).trim();
  return n;
}
function briefingComNome(x){ const b=String(x.briefing||''); if(!b||/^VIS - /.test(b)) return b; const n=String(x.nome_sessao||'').trim()||nomeSessao('VIS','Construção',x.titulo||x.id||''); return n+'\n'+NOME_INSTR(n)+'\n\n'+b; }
async function marcaBriefing(id){ if(!DB) return; try{ await DB.doc('construcoes/'+id).update({briefing_copiado_em:hojeISO()}); }catch(e){ alert('O briefing foi copiado, mas não consegui marcar no HUB: '+((e&&e.message)||e)); } }

const PAIN={'crm-visao':pCRMVisao,oportunidades:pOport,crm:pCRM,leads:pLeads,pendencias:pPendencias,carteira:pCarteira,imoveis:pImoveis,cobranca:pCobranca,receita:pReceita,vendas:pVendas,documentos:pDocumentos,tarefas:pTarefas,construcoes:pConstrucoes};

// ---------------------------------------------------------------- módulos (construções independentes)
const MODS={}, MODS_ERRO={}, MODS_PEDIDOS={};
window.HUB={ versao:1, mais, menos, clsVal, S, lista, esc, dt, brl, brl0, hojeISO, copiaTexto, vazio, params, carregado, tipos:TIPOS, relDivida:{calc:calcDivida, abrir:abreRel, devedores:codsDevedores},
  db:()=>DB, pede:()=>pede(),
  // motor das Oportunidades para os módulos (31/10/2026, aba Demandas): contexto (anúncios, fora do site, lançamentos) e cruzamento perfil × imóveis
  op:{ctx:()=>ctxHub(), casar:(p,c,o)=>OP.casar(p,c,o), descreve:p=>OP.descrevePerfil(p),
    // Captação em dois lados (01/11/2026): Map id do captado ('C:<lead>') → [{id, nome, corretor, campanha}] de quem procura um imóvel assim
    interessados:()=>interessadosCapt(),
    // Encaminhados (01/11/2026): leads repassados a corretor fora da Captação (portais, campanhas, planilhas), com o perfil efetivo
    encaminhados:()=>{ const ctx=ctxHub(); return leadsOp().filter(l=>!l.capt_id&&l.corretor&&!String(l.corretor).startsWith('(')).map(l=>({id:l.id,nome:l.nome,campanha:l.campanha||'',canal:l.canal||'',corretor:l.corretor,corretor_nome:nomeCorPes(l.corretor),data:l.data||'',status:l.status||'',etapa:l.etapa||'',aberto:l.aberto,imovel_interesse:l.imovel_interesse||'',perfil:OP.perfilDo(l,ctx)})); },
    nomeCorretor:nm=>{ try{ return nomeCorPes(nm)||nm; }catch(_){ return nm; } }},
  // botão 📍 do mapa no fim de um endereço: HUB.mapa('empreendimento', id) | ('imovel', id) | ('objeto', null, texto) | ('texto', null, texto, {bairro})
  mapa:(tipo,ref,txt,extra)=>mapaDe(tipo,ref,txt,extra),
  // botão 🗺 "ver no mapa do HUB" (alvo = i-<anúncio> | l-<locação> | v-<venda> | e-<empreendimento>) e o salto direto
  mapaHub:alvo=>btnHubMapa(alvo), irMapaHub:alvo=>irMapaHub(alvo),
  // características dos anúncios (mapa_detalhes): mesmos filtros e mesma busca na aba Imóveis e na aba Mapa
  car:{det:detImv,ok:carOk,resumo:carResumo,texto:carTexto,html:carFiltrosHTML,evento:carEvento,ativos:carAtivos},
  // R$/m² de área privativa (07/11/2026): anu(id) → {v, a, fonte, fin} | null; faixa(ids) → {V:{n,media,mediana,min,max}, A:{…}}
  m2:{anu:m2Anu,area:m2Area,fmt:m2Fmt,fx:m2Fx,titulo:m2Tit,stats:m2Stats,faixa:m2Faixa,grupo:m2Grupo},
  // busca ampla (25/10/2026): os módulos usam os mesmos termos da aba Anúncios do site (vírgula separa; quartos/vagas exatos; valor ±20%)
  buscaAmpla:{termos:q=>baTermos(q), ajuda:()=>baAjuda(true).replace(/data-imvex=/g,'data-baex='), /* 17/11/2026: sem exemplos também em Cadastros › Imóveis (pedido do Cleiton) */
    // 26/10/2026: termo de documento (CPF/CNPJ/RG/telefone/CEP) ou e-mail × texto e ids de pessoa
    docHit:(t,txt,ids)=>docHit(t,txt,ids), atende:(q,txt,ids)=>atendeTexto(typeof q==='string'?baTermos(q):q,txt,ids)},
  // busca da barra da aba (26/10/2026): os módulos paginados mostram a lista inteira quando ativa()
  buscaAba:{ativa:()=>!!qAba().trim(), q:()=>qAba(), termos:()=>baTermos(qAba())},
  dadosPessoa:id=>pessoasDados()[id]||null,
  // abre a aba Imóveis mostrando só estes ids de `imoveis` (com um aviso e "Mostrar todos")
  // abre Cadastros › Pessoas no perfil da pessoa (id da ficha da equipe, ib-<id Imobibrasil>, n-<nome> ou id manual)
  abrirUnidade(id){ const m=MODS['cadastro-imoveis']; if(!m||!ABAS.some(a=>a[0]==='cadastro-imoveis')) return; aba='cadastro-imoveis'; try{localStorage.setItem('hubv.aba',aba)}catch(_){}; if(typeof m.foco==='function'){ try{ m.foco(id); }catch(_){} } render(); },
  pastaDaVenda:v=>pastaDaVenda(v), pastaDoCodigo:c=>pastaDoCodigo(c), contratoAtivo:c=>ativo(c), taxaAdm:x=>taxaAdm(x), diaUtil:d=>diaUtil(d), diasAtrasISO:n=>diasAtrasISO(n), sensivel:o=>sensivel(o), mascaraSens:t=>mascaraSens(t),
  abrirPessoa(id){ const m=MODS.pessoas; if(!m||!ABAS.some(a=>a[0]==='pessoas')) return; aba='pessoas'; try{localStorage.setItem('hubv.aba',aba)}catch(_){}; if(typeof m.foco==='function'){ try{ m.foco(id); }catch(_){} } render(); },
  rotAba, abaReal,
  // abre uma aba já realçando uma linha (carteira: car-<cód>; vendas: ven-<id>) ou o item de um módulo (alvo → foco)
  irPara(aba,linha,alvo){ irBusca({ir:{aba,linha,alvo}}); },
  abrirImovel(ids,txt){ const I0=S.imoveis||{}, ids0=[].concat(ids||[]).filter(Boolean);
    if(ids0.length&&!ids0.some(i=>(I0[i]||{}).ativo)){ try{ const M=window.HUB_IMOVEIS, u=M&&M.id?M.id({fonte:'anuncio',id:ids0[0]}):''; if(u&&window.HUB.abrirUnidade){ window.HUB.abrirUnidade(u); return; } }catch(e){} }
    fImv.foco=ids0.filter(i=>(I0[i]||{}).ativo); fImv.focoTxt=txt||''; fImv.alerta=''; fImv.pg=0; aba='imoveis'; try{localStorage.setItem('hubv.aba',aba)}catch(_){}; render(); window.scrollTo(0,0); },
  registrar(m){
    if(!m||!/^[a-z0-9-]+$/.test(m.id||'')||MODS[m.id]||ABA_ALIAS[m.id]) return;
    MODS[m.id]=m; delete MODS_ERRO[m.id];
    (m.colecoes||[]).forEach(assina);
    if(m.tipos) Object.assign(TIPOS,m.tipos);
    if(m.aba&&typeof m.render==='function'&&!ABAS.some(a=>a[0]===m.id)){
      const AREA_GRUPO={imoveis:'crm',comercial:'crm',pessoas:'crm',marketing:'crm',documentos:'gestao',base:'gestao'};
      const g0=GRUPO_FORCA[m.id]||GRUPO_ALIAS[m.grupo]||m.grupo;
      const gr=GRUPOS.some(g=>g[0]===g0)?g0:(AREA_GRUPO[((S.construcoes||{})[m.id]||{}).area]||'gestao'); GRUPO_DE[m.id]=gr;
      let pos=m.depois&&grupoDe(m.depois)===gr?ABAS.findIndex(a=>a[0]===m.depois)+1:0;
      if(pos<=0){ const ult=ABAS.map(a=>grupoDe(a[0])).lastIndexOf(gr); pos=ult<0?ABAS.findIndex(a=>a[0]==='construcoes'):ult+1; if(pos<0) pos=ABAS.length; }
      ABAS.splice(pos,0,[m.id,m.aba]);
      PAIN[m.id]=()=>{ try{ return m.render(); }catch(e){ return `<p class="nota">Erro no módulo ${esc(m.id)}: ${esc(e&&e.message||e)}</p>`; } };
      if(abaGuardada===m.id) aba=m.id;
    }
    pede();
  }
};
function carregaModulos(){
  lista('construcoes').forEach(x=>{
    const ok=x.modulo&&/^modulos\/[a-z0-9-]+\.js$/.test(x.modulo)&&(x.status==='feito'||x.status==='piloto'||x.modulo_ativo===true);
    if(!ok||MODS_PEDIDOS[x._id]) return; MODS_PEDIDOS[x._id]=true;
    const sc=document.createElement('script'); sc.src=x.modulo+(x.modulo_versao?'?v='+encodeURIComponent(x.modulo_versao):'');
    sc.onerror=()=>{ MODS_ERRO[x._id]='arquivo '+x.modulo+' não encontrado'; pede(); };
    document.head.appendChild(sc);
  });
}

let agendado=false;
function pintaPaineis(){ const el=document.getElementById('paineis-menu'); if(!el) return;
  // 22/11/2026 (pedido do Cleiton): o menu lista todos os painéis do app (controle/paineis_app), sem os rótulos antigos "teste"/"piloto";
  // sem essa lista, volta à lista antiga das rotinas (controle/paineis_corretor), também sem rótulo.
  const A=(S.controle||{}).paineis_app||{}, base=A.base||'https://vivere-imoveis.github.io/app-vivere/painel.html?ver=';
  const d=(S.controle||{}).paineis_corretor||{};
  let it=Object.entries(A.itens||{}).map(([k,x])=>({nome:(x&&x.nome)||k,url:(x&&x.url)||base+encodeURIComponent(k)}));
  if(!it.length) it=Object.values(d.itens||{}).filter(x=>x&&x.url).map(x=>({nome:x.nome_painel||x.nome,url:x.url}));
  it.sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
  // 22/11/2026 (pedido do Cleiton): Painel do gestor em primeiro. No HUB do claude.ai abre o PAINEL DO GESTOR (artefato); no HUB da web (app), o painel do app.
  const gUrl=/github\.io$/.test(location.hostname)?'https://vivere-imoveis.github.io/app-vivere/painel.html':'https://claude.ai/artifact/EfWNvH7UVZkn2mUyuChf4X';
  const h=`<a href="${escUrl(gUrl)}" target="_blank" rel="noopener"><span>Painel do gestor</span><span class="s">↗</span></a>`+it.map(x=>`<a href="${escUrl(x.url)}" target="_blank" rel="noopener"><span>${esc(x.nome)}</span><span class="s">↗</span></a>`).join('')+`<p>${it.length} painéis no app da Vivere. Cada um abre como o corretor vê.</p>`;
  if(el.innerHTML!==h) el.innerHTML=h; }
document.addEventListener('click',e=>{ const d=document.getElementById('lk-paineis'); if(d&&d.open&&!d.contains(e.target)) d.open=false; });
/* 03/11/2026: menu Painéis dos corretores não sai da tela (a 900 px passava 17 px): ancora à direita do botão quando não cabe à esquerda */
(()=>{ const d=document.getElementById('lk-paineis'); if(!d) return; const m=d.querySelector('.menu'); if(!m) return;
  const encaixa=()=>{ m.style.left=''; m.style.right=''; if(innerWidth<=700) return; if(m.getBoundingClientRect().right>innerWidth-8){ m.style.left='auto'; m.style.right='0'; } };
  d.addEventListener('toggle',encaixa); addEventListener('resize',encaixa); encaixa(); })();
// sub-abas de Oportunidades (03/11/2026): Oportunidades · Captação · Demandas extras (cada módulo continua com a aba própria por baixo)
// aba-mãe → sub-abas (rótulo da mãe na linha de sub-abas, filhas). Cada filha continua com a aba própria por baixo.
// 04/11/2026 (opção A, fatia 2a): Leads e Funil dos corretores viram uma sub-aba só, "Leads"; a 3ª posição guarda as filhas que ficam dentro da mãe, num seletor próprio
const SUBS={crm:['Leads captados',[['oportunidades','Ofertas'],['demandas','Demandas extras']],[['leads','Entrada das campanhas']]],
  'cadastro-imoveis':['Imóveis cadastrados',[['imoveis','Anúncios do site'],['mapa','Mapa'],['empreendimentos','Empreendimentos'],['portais','Portais'],['inatividade-agenciamento','Agenciamentos']]]}; /* hub-redesenho-f1c */ // 22/11/2026: Captação, Pessoas, Funções e Construtoras viraram menus próprios da área (pedido do Cleiton)
const temAba=k=>ABAS.some(a=>a[0]===k);
function subsFilhas(p){ return SUBS[p]&&temAba(p)?SUBS[p][1].concat(SUBS[p][2]||[]).map(s=>s[0]).filter(temAba):[]; }
function subsPai(k){ return Object.keys(SUBS).find(p=>subsFilhas(p).includes(k))||''; }
function subsDentroTodos(){ return Object.keys(SUBS).flatMap(subsFilhas); }
function subOp(){ const pai=SUBS[aba]?aba:subsPai(aba), d=subsFilhas(pai); if(!d.length) return '';
  const nM=k=>{ const m=MODS[k]; if(!m||typeof m.contador!=='function') return 0; try{ return +m.contador()||0; }catch(_){ return 0; } };
  const oc=(SUBS[pai][2]||[]).filter(s=>d.includes(s[0])), naMae=aba===pai||oc.some(s=>s[0]===aba);
  const bt=(k,t,on)=>{ const n=SUBS[k]?0:nM(k); const p=on===undefined?aba===k:on; return `<button class="btn" role="tab" data-aba="${k}" aria-pressed="${p}" aria-selected="${p}">${t}${n?` <span class="badge">${n}</span>`:''}</button>`; };
  const lin=`<div class="filtros sub-op" role="tablist" aria-label="${esc(SUBS[pai][0])}">${bt(pai,SUBS[pai][0],naMae)}${SUBS[pai][1].filter(s=>d.includes(s[0])).map(s=>bt(s[0],s[1])).join('')}</div>`;
  const sel=oc.length&&naMae?`<div class="filtros sub-op sub-op-dentro" role="tablist" aria-label="${esc(SUBS[pai][0])}: visão">${bt(pai,rotPadrao(pai))}${oc.map(s=>bt(s[0],s[1])).join('')}</div>`:'';
  return lin+sel; }
function rotPadrao(k){ return ((ABAS.find(a=>a[0]===k)||[])[1])||k; }
function render(){ agendado=false;
  // 15/11/2026 (hub #17): mantém foco e cursor em QUALQUER campo com id da aba, e as caixas <details> abertas ou fechadas,
  // quando a página redesenha com dado novo do banco (antes só os campos nc-* e oplf-q)
  const cont=document.getElementById('conteudo'), ae=document.activeElement;
  const fid=ae&&ae.id&&(ae.id.startsWith('nc-')||ae.id==='oplf-q'||(cont&&cont.contains(ae)&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)))?ae.id:null;
  const sel=fid&&typeof ae.selectionStart==='number'?[ae.selectionStart,ae.selectionEnd]:null;
  const chaveDet=(d,n)=>{ const s=d.querySelector(':scope>summary'); return (d.id||'')+'|'+(s?s.textContent.trim().slice(0,80):'')+'|'+n; };
  const detAntes=new Map(); if(cont){ const vis={}; cont.querySelectorAll('details').forEach(d=>{ const b=chaveDet(d,0); vis[b]=(vis[b]||0)+1; detAntes.set(chaveDet(d,vis[b]),d.open); }); }
  pintaColetas(); pintaPaineis(); pintaKpis(); pintaAbas(); pintaTema(); pintaBarraAba(); if(BQ.q){ BQ.res=buscaHUB(BQ.q); if(BQ.sel>=BQ.res.length) BQ.sel=0; pintaBusca(); }
  { /* transicao-suave (22/11/2026, pedido do Cleiton): dado igual vindo do banco não redesenha; mesma aba mantém a posição; troca de aba entra suave e volta ao começo */
    const html=`<section class="painel" role="tabpanel" aria-label="${esc(rotAba(aba)||'')}">${subOp()}${PAIN[aba]()}</section>`, c=document.getElementById('conteudo'), mesma=c._vista===aba;
    if(!(mesma&&c._hc===html&&performance.now()-(window.__hubAcao||0)>1500)){ const y=scrollY; c.innerHTML=html; c._hc=html;
      if(mesma){ if(Math.abs(scrollY-y)>1) scrollTo(0,y); }
      else if(c._vista!==undefined){ const t=c.getBoundingClientRect().top+scrollY-90; if(scrollY>t) scrollTo(0,Math.max(0,t)); if(!matchMedia('(prefers-reduced-motion: reduce)').matches){ c.classList.remove('vista-nova'); void c.offsetWidth; c.classList.add('vista-nova'); } }
      c._vista=aba; } }
  if(detAntes.size&&cont){ const vis={}; cont.querySelectorAll('details').forEach(d=>{ const b=chaveDet(d,0); vis[b]=(vis[b]||0)+1; const k=chaveDet(d,vis[b]); if(detAntes.has(k)&&d.open!==detAntes.get(k)) d.open=detAntes.get(k); }); }
  if(fid){ const el=document.getElementById(fid); if(el){ el.focus(); if(sel&&el.setSelectionRange) try{ el.setSelectionRange(sel[0],sel[1]); }catch(_){} } } }
function pede(){ if(!agendado){agendado=true; requestAnimationFrame(render);} }
['click','submit','change','keydown'].forEach(t=>document.addEventListener(t,()=>{ window.__hubAcao=performance.now(); },true));   // transicao-suave: redesenho logo após ação da pessoa segue como sempre

// barra de rolagem lateral também em cima de toda tabela mais larga que a tela (padrão do HUB)
function barrasTopo(){
  document.querySelectorAll('#conteudo .tabela').forEach(t=>{
    let bar=t.previousElementSibling; const tem=bar&&bar.classList.contains('rolagem-topo');
    const precisa=t.scrollWidth>t.clientWidth+2;
    if(!precisa){ if(tem) bar.remove(); return; }
    if(!tem){ bar=document.createElement('div'); bar.className='rolagem-topo'; bar.setAttribute('aria-hidden','true'); bar.appendChild(document.createElement('div')); t.parentNode.insertBefore(bar,t);
      let trava=false; bar.addEventListener('scroll',()=>{ if(trava){trava=false;return;} trava=true; t.scrollLeft=bar.scrollLeft; });
      t.addEventListener('scroll',()=>{ if(trava){trava=false;return;} trava=true; bar.scrollLeft=t.scrollLeft; }); }
    bar.firstChild.style.width=t.scrollWidth+'px'; bar.scrollLeft=t.scrollLeft;
  });
}
/* ordenação por coluna em toda tabela do HUB, inclusive as dos módulos (25/10/2026, pedido do Cleiton): o cabeçalho vira botão;
   1º clique maior → menor, 2º menor → maior, 3º volta à ordem original. Lê o texto das células (data dd/mm/aaaa, R$, número, %, texto).
   Tabelas paginadas ordenam os dados inteiros no próprio painel (data-ord-dados: Anúncios do site e Leads). A escolha vale até recarregar. */
const ORD_DOM={};
function chaveTab(t){ return aba+'|'+[...t.tHead.rows[0].cells].map(c=>c.textContent.trim()).join('|'); }
function valCel(td){ if(!td) return null; const t=String(td.innerText||td.textContent||'').replace(/\s+/g,' ').trim(); if(!t||/^[—–-]$/.test(t)) return null;
  let m=t.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if(m) return +(m[3]+m[2]+m[1]);
  m=t.match(/^(-?)\s*(?:R\$\s*)?(\d[\d.]*(?:,\d+)?)\s*(mi|mil|%)?(?![\d\/a-z])/i);
  if(m){ let s=m[2]; s=s.includes(',')?s.replace(/\./g,'').replace(',','.'):/^\d{1,3}(\.\d{3})+$/.test(s)?s.replace(/\./g,''):s; let v=+s; if(isNaN(v)) return t; const u=(m[3]||'').toLowerCase(); if(u==='mi') v*=1e6; else if(u==='mil') v*=1e3; return m[1]?-v:v; }
  return t; }
function ordenaTabelas(){
  document.querySelectorAll('#conteudo table').forEach(t=>{
    if(t.dataset.ordDados||!t.tHead||t.tHead.rows.length!==1||!t.tBodies[0]) return;
    const hs=[...t.tHead.rows[0].cells]; if(hs.some(h=>h.colSpan>1||h.rowSpan>1)) return;
    const k=chaveTab(t), o=ORD_DOM[k];
    hs.forEach((h,i)=>{ if(!h.classList.contains('ord')){ h.classList.add('ord'); h.tabIndex=0; h.setAttribute('role','button'); h.title='Ordenar: 1º clique maior → menor, 2º menor → maior, 3º volta à ordem original'; }
      h.dataset.ordcol=i; if(o&&o.k===i){ h.dataset.dir=o.dir; h.setAttribute('aria-sort',o.dir==='asc'?'ascending':'descending'); } else { delete h.dataset.dir; h.removeAttribute('aria-sort'); } });
    const tb=t.tBodies[0], rows=[...tb.rows]; if(rows.some(r=>[...r.cells].some(c=>c.rowSpan>1))) return;
    if(!t._ordOrig||t._ordOrig.some(r=>r.parentNode!==tb)||t._ordOrig.length!==rows.length) t._ordOrig=rows.slice();
    const sig=o?o.k+o.dir+rows.length:'orig'+rows.length; if(t.dataset.ordSig===sig) return; t.dataset.ordSig=sig;
    // linha de uma célula só (detalhe/aviso) acompanha a linha de cima; a primeira, se for assim, fica no topo
    const grupos=[]; let topo=[]; t._ordOrig.forEach(r=>{ const solo=r.cells.length===1&&r.cells[0].colSpan>1; if(solo&&grupos.length) grupos[grupos.length-1].push(r); else if(solo) topo.push(r); else grupos.push([r]); });
    if(o) grupos.sort((a,b)=>cmpOrd(valCel(a[0].cells[o.k]),valCel(b[0].cells[o.k]),o.dir));
    const fr=document.createDocumentFragment(); topo.concat(...grupos).forEach(r=>fr.appendChild(r)); tb.appendChild(fr); });
}
document.addEventListener('click',e=>{ const h=e.target.closest&&e.target.closest('#conteudo table th.ord[data-ordcol]'); if(!h) return; const t=h.closest('table'); if(t.dataset.ordDados) return;
  const k=chaveTab(t), n=proxOrd(ORD_DOM[k],+h.dataset.ordcol); if(n) ORD_DOM[k]=n; else delete ORD_DOM[k];
  document.querySelectorAll('#conteudo table').forEach(x=>{ if(!x.dataset.ordDados&&x.tHead&&x.tHead.rows.length===1&&chaveTab(x)===k) delete x.dataset.ordSig; }); ordenaTabelas(); });
document.addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('#conteudo th.ord')){ e.preventDefault(); e.target.click(); } });
/* ---------- busca ampla de cada aba (26/10/2026, pedido do Cleiton) ----------
   Primeira coisa de toda aba: uma barra só, fora do #conteudo (o redesenho não tira o foco). Procura no que a aba mostra
   (linhas de tabela, pendências, cartões) e nos dados pessoais das pessoas citadas em cada linha (pessoas_dados).
   Abas com busca ampla própria (Anúncios do site e Cadastro de imóveis) usam a delas. Com busca ativa, as listas paginadas vêm inteiras. */
const BUSCA_PROPRIA=new Set(['imoveis','cadastro-imoveis','mapa']); // Mapa: a busca (ampla) fica no painel do mapa
const QABA={}; let TQABA=null;
function qAba(){ return BUSCA_PROPRIA.has(aba)?'':String(QABA[aba]||''); }
function pintaBarraAba(){ const b=document.getElementById('barra-aba'), i=document.getElementById('ba-q'); if(!b||!i) return;
  const prop=BUSCA_PROPRIA.has(aba); b.hidden=prop; if(prop) return;
  if(document.activeElement!==i&&i.value!==(QABA[aba]||'')) i.value=QABA[aba]||'';
  i.placeholder=(MODS[aba]&&MODS[aba].dicaBusca)||('Buscar em '+(rotAba(aba)||'esta aba')+': nome, CPF ou telefone (com ou sem pontos), código, endereço, valor…'); } // dicaBusca: texto próprio do módulo (31/10/2026)
const UNID='#conteudo tbody > tr, #conteudo .opl > .opl-item, #conteudo .pend, #conteudo .org-item, #conteudo .pp-grade > *, #conteudo .grade > .card';
function aplicaBusca(){ const q=qAba().trim(), res=document.getElementById('ba-res');
  const U=[...document.querySelectorAll(UNID)].filter(u=>!u.closest('.kpis')&&!u.closest('.modal')&&!(u.matches('.grade > .card')&&!u.querySelector('button,a,[data-pessoa]')));
  if(!q){ U.forEach(u=>{ if(u.dataset.baOcul){ u.hidden=false; delete u.dataset.baOcul; } if(u.hasAttribute('data-bahit')) u.removeAttribute('data-bahit'); }); if(res&&res.textContent) res.textContent=''; return; }
  const T=baTermos(q); if(!T.length){ if(res) res.textContent=''; return; }
  const mostra=T.length>1||T.some(t=>t.tipo!=='txt'); let n=0; const pais=new Map();
  U.forEach(u=>{ const txt=u.innerText||u.textContent||''; const ids=[...u.querySelectorAll('[data-pessoa],[data-pp-sel]')].map(b=>b.dataset.pessoa||b.dataset.ppSel); if(u.dataset.ppSel) ids.push(u.dataset.ppSel);
    const h=atendeTexto(T,txt,ids), ok=h.size>0; u._baN=h.size;
    if(ok){ n++; if(u.dataset.baOcul){ u.hidden=false; delete u.dataset.baOcul; } const r=mostra?`atende ${h.size} de ${T.length}`:''; if(r){ if(u.getAttribute('data-bahit')!==r) u.setAttribute('data-bahit',r); } else if(u.hasAttribute('data-bahit')) u.removeAttribute('data-bahit'); }
    else { if(!u.hidden){ u.hidden=true; u.dataset.baOcul='1'; } if(u.hasAttribute('data-bahit')) u.removeAttribute('data-bahit'); }
    const p=u.parentNode; if(!pais.has(p)) pais.set(p,[]); pais.get(p).push(u); });
  // quem atende mais termos vem primeiro (com mais de um termo, sem ordenação por coluna e só em listas sem outros elementos no meio)
  if(T.length>1) pais.forEach((L,p)=>{ if(p.children.length!==L.length) return; const t=p.closest&&p.closest('table'); if(t&&t.tHead&&ORD_DOM[chaveTab(t)]) return;
    const o=L.slice().sort((a,b)=>b._baN-a._baN); if(o.some((x,i)=>x!==L[i])) o.forEach(x=>p.appendChild(x)); });
  const txtRes=U.length?`${n} de ${U.length} ${U.length===1?'item atende':'itens atendem'}`:'nada para filtrar nesta aba';
  if(res&&res.textContent!==txtRes) res.textContent=txtRes; }
document.addEventListener('input',e=>{ if(e.target.id!=='ba-q') return; QABA[aba]=e.target.value; clearTimeout(TQABA); TQABA=setTimeout(()=>render(),220); });
document.addEventListener('keydown',e=>{ if(e.target.id==='ba-q'&&e.key==='Escape'){ e.target.value=''; QABA[aba]=''; render(); } });
/* ---------- tabela vira cartão no celular, em toda aba (01/11/2026, pedido do Cleiton) ----------
   "esse problema de cortar informações no celular ou não comprimir os cards para o celular está afetando outras abas".
   Até 760 px, toda tabela do #conteudo sem versão própria de celular vira uma pilha de cartões: o cabeçalho some, cada
   célula leva o nome da coluna em cima, a 1ª coluna abre o cartão em largura total e o texto longo, os botões e os
   detalhes ocupam a linha inteira. Nada cortado, sem rolagem lateral interna. A ordenação continua: a linha
   "Ordenar por" (só no celular) clica no cabeçalho escondido. Tabela com versão própria fica de fora:
   table.cl-cards (Captação › Leads), .tabela.tem-cm com .lista-m, ou marcada com data-sem-cartao. */
(function(){
  if(!document.getElementById('tab-auto-css')){ const st=document.createElement('style'); st.id='tab-auto-css'; st.textContent=`
.ord-movel-auto{display:none!important}
.ord-movel-auto.ta-mostra{display:flex!important;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}
.ord-movel-auto.ta-mostra .s{display:inline;color:var(--muted);font-size:12px}
.ord-movel-auto.ta-mostra button{font-size:12px;padding:5px 9px}
@media (max-width:760px){
  .tabela:has(>table.tab-auto){overflow:visible!important;background:none!important;border:0!important}
  table.tab-auto{display:block!important;min-width:0!important;width:100%!important;border:0!important}
  table.tab-auto>thead{display:none!important}
  table.tab-auto>tbody,table.tab-auto>tfoot{display:block!important}
  table.tab-auto>tbody>tr,table.tab-auto>tfoot>tr{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-flow:row dense;gap:6px 12px;padding:10px 12px;margin:0 0 8px;background:var(--panel);border:1px solid var(--line);border-radius:6px}
  table.tab-auto>tbody>tr[hidden]{display:none!important}
  table.tab-auto>tbody>tr>td,table.tab-auto>tfoot>tr>td{display:block!important;padding:0!important;border:0!important;min-width:0!important;max-width:none!important;width:auto!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere;word-break:normal;text-align:left!important;-webkit-line-clamp:unset!important}
  table.tab-auto>tbody>tr>td *{max-width:100%}
  table.tab-auto>tbody>tr>td :is(span,div,b,a,p,small){white-space:normal!important;overflow:visible!important;text-overflow:clip!important;-webkit-line-clamp:unset!important}
  table.tab-auto>tbody>tr>td[data-rot]:not([data-rot=""])::before{content:attr(data-rot);display:block;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:1px}
  table.tab-auto>tbody>tr>td.ta-larga,table.tab-auto>tbody>tr>td:first-child,table.tab-auto>tbody>tr>td[colspan]{grid-column:1/-1}
  table.tab-auto>tbody>tr>td:first-child{font-weight:600}
  table.tab-auto>tbody>tr>td:first-child::before{font-weight:400}
  table.tab-auto>tbody>tr>td.ta-vazia{display:none!important}
  table.tab-auto>tbody>tr>td.ta-acoes{display:flex!important;flex-wrap:wrap;gap:6px}
  table.tab-auto>tbody>tr>td.ta-acoes::before{flex:1 0 100%}
  .kpi .sub{display:block!important;-webkit-line-clamp:unset!important;overflow:visible!important}
  .mapa[style*="--cols"]{overflow-x:visible!important}
  .mapa .lin{grid-template-columns:38px repeat(var(--cols),minmax(0,1fr))!important;gap:2px!important}
  .mapa .q{font-size:9px!important;min-width:0}
  /* Carteira › desenho próprio (padrão Captação › Leads, 01/11/2026) */
  .tabela:has(>table.car-cards){overflow:visible!important;background:none!important;border:0!important}
  table.car-cards{display:block!important;min-width:0!important;width:100%!important;border:0!important}
  table.car-cards>thead{display:none!important}
  table.car-cards>tbody{display:flex!important;flex-direction:column;gap:8px}
  table.car-cards>tbody>tr{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"cod cob" "imo imo" "pes alu" "pra gar" "rea cor" "fon fon";gap:4px 12px;padding:10px 12px;background:var(--panel);border:1px solid var(--line);border-radius:10px}
  table.car-cards>tbody>tr[hidden]{display:none!important}
  table.car-cards>tbody>tr>td{display:block!important;padding:0!important;border:0!important;min-width:0!important;width:auto!important;white-space:normal!important;overflow-wrap:anywhere;text-align:left!important;font-size:13px;line-height:1.35}
  table.car-cards>tbody>tr>td[colspan]{grid-column:1/-1}
  table.car-cards>tbody>tr>td:nth-child(1){grid-area:cod}
  table.car-cards>tbody>tr>td:nth-child(1) .s{display:inline!important;margin:0 6px!important}
  table.car-cards>tbody>tr>td:nth-child(2){grid-area:imo}
  table.car-cards>tbody>tr>td:nth-child(3){grid-area:pes}
  table.car-cards>tbody>tr>td:nth-child(4){grid-area:pra}
  table.car-cards>tbody>tr>td:nth-child(5){grid-area:alu;text-align:right!important;font-weight:600}
  table.car-cards>tbody>tr>td:nth-child(5) .s{font-weight:400}
  table.car-cards>tbody>tr>td:nth-child(6){grid-area:gar;text-align:right!important}
  table.car-cards>tbody>tr>td:nth-child(7){grid-area:rea}
  table.car-cards>tbody>tr>td:nth-child(8){grid-area:cob;text-align:right!important}
  table.car-cards>tbody>tr>td:nth-child(9){grid-area:cor;text-align:right!important}
  table.car-cards>tbody>tr>td:nth-child(10){grid-area:fon;font-size:12px}
  table.car-cards>tbody>tr>td:nth-child(4)::before{content:"Início · prazo";display:block;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  table.car-cards>tbody>tr>td:nth-child(6)::before{content:"Garantia";display:block;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  table.car-cards>tbody>tr>td:nth-child(7)::before{content:"Próximo reajuste";display:block;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  table.car-cards>tbody>tr>td:nth-child(9)::before{content:"Corretores";display:block;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  .ord-movel-auto{display:flex!important;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}
  .ord-movel-auto:empty{display:none!important}
  .ord-movel-auto .s{display:inline;color:var(--muted);font-size:12px}
  .ord-movel-auto button{font-size:12px;padding:5px 9px}
}`; 
    // 02/11/2026 (pedido do Cleiton): nas tabelas de imóveis (Anúncios do site e Cadastros › Imóveis), quando a largura aperta e a tabela não cabe,
    // ela vira os mesmos cartões do celular em vez de rolar de lado (revisto em 02/11/2026 à noite: ver estreito() e ajusta() em cartaoAuto). As regras de cartão do bloco do celular valem também sob .tabela.ta-cartao.
    { const m=st.textContent.match(/@media \(max-width:760px\)\{([\s\S]*)\}\s*$/); const corpo=m?m[1]:'';
      st.textContent+='\n'+corpo.split('\n').filter(l=>/table\.tab-auto/.test(l)).map(l=>l.replace(/\.tabela:has\(>table\.tab-auto\)/g,'.tabela.ta-cartao').replace(/(^|[\s,])table\.tab-auto/g,'$1.tabela.ta-cartao>table.tab-auto')).join('\n')+'\n.tabela.ta-cartao>table.tab-auto>tbody{display:flex!important;flex-direction:column;gap:8px}\n.tabela.ta-cartao>table.tab-auto>tbody>tr{margin:0!important}'+'\n/* 02/11/2026 (pedido do Cleiton): cartão horizontal, 1 por linha, campos lado a lado em cerca de 2 linhas */'+'\nhtml .tabela.ta-cartao>table.tab-auto>tbody>tr{display:flex!important;flex-wrap:wrap;align-items:flex-start;gap:6px 18px!important;padding:8px 12px!important}'+'\nhtml .tabela.ta-cartao>table.tab-auto>tbody>tr>td{flex:1 1 130px}'+'\nhtml .tabela.ta-cartao>table.tab-auto>tbody>tr>td.ta-larga{flex:2 1 230px}'+'\nhtml .tabela.ta-cartao>table.tab-auto>tbody>tr>td:first-child{flex:0 1 auto}'+'\nhtml .tabela.ta-cartao>table.tab-auto>tbody>tr>td[colspan]{flex:1 1 100%}'+'\nhtml .tabela.ta-cartao>table.tab-auto>tbody>tr>td img{max-height:96px!important;width:auto!important;max-width:100%!important;object-fit:cover}';
      /* F5a 02/11/2026: a Carteira (desenho próprio car-cards) também vira os seus cartões no computador quando não cabe */
      st.textContent+='\n'+corpo.split('\n').filter(l=>/table\.car-cards/.test(l)).map(l=>l.replace(/\.tabela:has\(>table\.car-cards\)/g,'.tabela.ta-cartao').replace(/(^|[\s,])table\.car-cards/g,'$1.tabela.ta-cartao>table.car-cards')).join('\n')+'\n.tabela.ta-cartao>table.car-cards>tbody{display:flex!important;flex-direction:column;gap:8px}'+'\nhtml .tabela.ta-cartao>table.car-cards>tbody>tr{grid-template-columns:repeat(6,minmax(0,1fr))!important;grid-template-areas:"cod imo imo pes pes cob" "alu pra gar rea cor fon"!important;gap:4px 14px!important;padding:8px 12px!important}'; }
    document.head.appendChild(st); }
  const PROPRIA=(t)=>t.matches('.cl-cards,.car-cards,.enc-cards')||t.hasAttribute('data-sem-cartao')||(t.closest('.tabela.tem-cm')&&t.closest('.tabela').parentElement.querySelector(':scope > .lista-m'));
  const curta=(s)=>String(s||'').replace(/[▲▼↕]/g,'').replace(/\s+/g,' ').trim(); const thTxt=(e)=>{ const k=e.cloneNode(true); k.querySelectorAll('br').forEach(b=>b.replaceWith(' ')); return k.textContent; }; /* 22/11/2026: rótulo do cartão com o <br> do cabeçalho virando espaço ("Negócios no mês", não "Negóciosno mês") */
  function rotulos(t){ const hr=t.tHead&&t.tHead.rows[0]; if(!hr) return []; const R=[]; [...hr.cells].forEach(c=>{ for(let i=0;i<(c.colSpan||1);i++) R.push(curta(thTxt(c))); }); return R; }
  // 02/11/2026: a barra de rolagem do topo (.rolagem-topo, barrasTopo) fica entre a linha "Ordenar por" e a tabela; sem pular por cima dela,
  // as duas rotinas se recriavam em laço (centenas de linhas "Ordenar por" antes da tabela, Anúncios do site sem imóveis à vista)
  function ordLinha(t,R){ const tab=t.closest('.tabela')||t; const ref=(tab.previousElementSibling&&tab.previousElementSibling.classList.contains('rolagem-topo'))?tab.previousElementSibling:tab; let nav=ref.previousElementSibling;
    if(!(nav&&nav.classList.contains('ord-movel-auto'))){ if(nav&&nav.classList.contains('ordenar-movel')) return; nav=document.createElement('div'); nav.className='filtros ord-movel-auto'; ref.parentNode.insertBefore(nav,ref); }
    const hs=[...t.tHead.rows[0].cells]; const sig=hs.map(h=>h.textContent+'|'+(h.dataset.dir||'')).join('#'); if(nav.dataset.sig===sig) return; nav.dataset.sig=sig;
    const bt=hs.map((h,i)=>{ const n=curta(thTxt(h)); if(!n||!h.classList.contains('ord')) return ''; const d=h.dataset.dir; return `<button type="button" class="btn" data-ta-ord="${i}">${n.replace(/[<>&"]/g,'')}${d==='asc'?' ▲':d==='desc'?' ▼':' ↕'}</button>`; }).join('');
    nav.innerHTML=bt?`<span class="s">Ordenar por</span>${bt}`:''; nav._tab=t; }
  /* 02/11/2026 (pedido do Cleiton, revoga a F5a): no computador, cartão só com a janela menor que metade da largura da tela; acima disso, lista.
     Lista larga que não cabe: as células quebram linha sem partir palavra (ta-ajusta); se ainda não couber, cartão horizontal (1 por linha). */
  const estreito=()=>innerWidth>760&&!!(screen&&screen.width>0)&&innerWidth<screen.width*0.35; /* 04/11/2026 (pedido do Cleiton): lista até ~35% da tela; cartão abaixo disso ou no celular */
  /* 23/11/2026 (revisão de responsividade, tablet): lista só quando todas as colunas cabem; coluna com menos de 80 px e texto em 3 linhas ou mais = espremida, vira cartão */
  function espremida(t){ const R=[...(t.tHead?t.tHead.rows:[])]; [...t.tBodies].forEach(b=>R.push(...[...b.rows].slice(0,30))); const rg=document.createRange();
    for(const r of R){ if(r.cells.length<3) continue; for(const c of r.cells){ const w=c.clientWidth; if(!w||w>=80||c.colSpan>1||!c.textContent.trim()) continue;
      const cs=getComputedStyle(c); const lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.3||17; rg.selectNodeContents(c); if(rg.getBoundingClientRect().height>lh*2.6) return true; } } return false; }
  function ajusta(bx,t){ bx.classList.remove('ta-ajusta'); if(innerWidth<=760||bx.classList.contains('ta-cartao')) return; if(t.scrollWidth<=bx.clientWidth+2&&!espremida(t)) return; bx.classList.add('ta-ajusta'); if(t.scrollWidth>bx.clientWidth+2||espremida(t)){ bx.classList.remove('ta-ajusta'); bx.classList.add('ta-cartao'); } }
  function cartaoAuto(){
    document.querySelectorAll('#conteudo table').forEach(t=>{
      if(t.classList.contains('car-cards')&&t.tHead&&t.tHead.rows.length===1){ ordLinha(t,rotulos(t)); const bx=t.closest('.tabela'); if(bx){ bx.classList.toggle('ta-cartao',estreito()); ajusta(bx,t); let nv=bx.previousElementSibling; if(nv&&nv.classList.contains('rolagem-topo')) nv=nv.previousElementSibling; if(nv&&nv.classList.contains('ord-movel-auto')) nv.classList.toggle('ta-mostra',bx.classList.contains('ta-cartao')); } return; }
      if(t.matches('.cl-cards,.enc-cards')){ const bx=t.closest('.tabela'); if(bx){ bx.classList.toggle('ta-cartao',estreito()); ajusta(bx,t); } return; } /* 02/11/2026 (pedido do Cleiton): Captação sem texto na vertical, mesma regra de lista × cartão */
      if(PROPRIA(t)||t.closest('.modal')&&!t.closest('.tabela')) return;
      if(!t.tBodies[0]) return;
      const R=rotulos(t); t.classList.add('tab-auto');
      [...t.tBodies].concat(t.tFoot?[t.tFoot]:[]).forEach(tb=>[...tb.rows].forEach(r=>{ let col=0;
        [...r.cells].forEach(c=>{ const rot=r.cells.length===1?'':(R[col]||''); if(c.dataset.rot!==rot) c.dataset.rot=rot; col+=c.colSpan||1;
          const txt=curta(c.innerText||c.textContent); const so=!txt&&!c.querySelector('img,svg,input,select,button,a,i.ic,i.pt');
          c.classList.toggle('ta-vazia',so);
          const acoes=!!c.querySelector('button,a.btn,select')&&txt.length<60&&!c.querySelector('details');
          c.classList.toggle('ta-acoes',acoes&&!c.matches(':first-child'));
          c.classList.toggle('ta-larga',acoes||txt.length>26||!!c.querySelector('details,ul,table,.pill+.pill'));
        }); }));
      if(t.tHead&&t.tHead.rows.length===1) ordLinha(t,R);
      const box=t.closest('.tabela'); if(box){ /* 02/11/2026 (revoga a F5a): cartão só na janela estreita ou quando a lista nem quebrando linha cabe (estreito, ajusta) */
        box.classList.toggle('ta-cartao',estreito()); ajusta(box,t);
        let nav=box.previousElementSibling; if(nav&&nav.classList.contains('rolagem-topo')) nav=nav.previousElementSibling;
        if(nav&&nav.classList.contains('ord-movel-auto')) nav.classList.toggle('ta-mostra',box.classList.contains('ta-cartao')); } });
  }
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-ta-ord]'); if(!b) return; const nav=b.closest('.ord-movel-auto'); const t=nav&&nav._tab; if(!t||!t.isConnected) return;
    const h=t.tHead.rows[0].cells[+b.dataset.taOrd]; if(h) h.click(); });
  window.cartaoAuto=cartaoAuto;
})();

/* 13/11/2026 (pedido do Cleiton, tarefa hub-funil-nao-entregues-paginacao): toda tabela com mais de 50 linhas ganha paginação
   50 / 100 por página (a escolha fica guardada por aparelho). Só esconde linhas (atributo data-pg-ocul), nada muda no banco;
   respeita a busca da aba (linha escondida pela busca não conta) e a ordenação (linha de detalhe acompanha a de cima). */
const PAG_PAG={};
function pagTam(){ try{ return +localStorage.getItem('hubv.pagTam')===100?100:50; }catch(e){ return 50; } }
(function(){ if(document.getElementById('pag-css')) return; const st=document.createElement('style'); st.id='pag-css';
  st.textContent='#conteudo tr[data-pg-ocul]{display:none!important}';
  document.head.appendChild(st); })();
function paginaTabelas(){
  const tam=pagTam();
  document.querySelectorAll('#conteudo table').forEach(t=>{
    const tb=t.tBodies[0]; const box=t.closest('.tabela')||t; let nav=box.nextElementSibling; if(!(nav&&nav.classList.contains('pag-nav'))) nav=null;
    const limpa=()=>{ if(tb) [...tb.rows].forEach(r=>{ if(r.hasAttribute('data-pg-ocul')) r.removeAttribute('data-pg-ocul'); }); if(nav) nav.remove(); };
    if(!tb||t.closest('.modal')||t.dataset.ordDados==='1'||t.hasAttribute('data-sem-pagina')||!t.tHead||!t.tHead.rows.length){ limpa(); return; }
    const rows=[...tb.rows]; if(rows.some(r=>[...r.cells].some(c=>c.rowSpan>1))){ limpa(); return; }
    const grupos=[]; rows.forEach(r=>{ const solo=r.cells.length===1&&r.cells[0].colSpan>1; if(solo&&grupos.length) grupos[grupos.length-1].push(r); else grupos.push([r]); });
    const vis=grupos.filter(g=>!g[0].hidden);
    if(vis.length<=50){ limpa(); return; }
    const k=chaveTab(t), tot=Math.ceil(vis.length/tam); let p=PAG_PAG[k]||0; if(p>=tot) p=tot-1; if(p<0) p=0; PAG_PAG[k]=p;
    const de=p*tam, ate=Math.min(vis.length,de+tam); const mostrar=new Set(vis.slice(de,ate));
    grupos.forEach(g=>{ const ok=mostrar.has(g)||g[0].hidden; g.forEach(r=>{ if(ok){ if(r.hasAttribute('data-pg-ocul')) r.removeAttribute('data-pg-ocul'); } else if(!r.hasAttribute('data-pg-ocul')) r.setAttribute('data-pg-ocul','1'); }); });
    const sig=[de,ate,vis.length,tam,tot].join('|');
    if(!nav){ nav=document.createElement('div'); nav.className='pag pag-nav'; box.parentNode.insertBefore(nav,box.nextSibling); }
    nav._tab=t; if(nav.dataset.sig===sig) return; nav.dataset.sig=sig;
    nav.innerHTML=`<button type="button" class="btn" data-pag-ir="-1"${p===0?' disabled':''} aria-label="Página anterior">&lt;</button><span>${de+1}–${ate} de ${vis.length} · página ${p+1} de ${tot}</span><button type="button" class="btn" data-pag-ir="1"${p>=tot-1?' disabled':''} aria-label="Próxima página">&gt;</button><span class="pp" role="group" aria-label="Itens por página"><span>Por página</span>${[50,100].map(n=>`<button class="btn" type="button" data-pag-tam="${n}" aria-pressed="${tam===n}">${n}</button>`).join('')}</span>`;
  });
}
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-pag-ir],[data-pag-tam]'); if(!b||b.disabled) return; const nav=b.closest('.pag-nav'); const t=nav&&nav._tab; if(!t||!t.isConnected) return;
  if(b.dataset.pagTam){ try{ localStorage.setItem('hubv.pagTam',b.dataset.pagTam); }catch(_){} Object.keys(PAG_PAG).forEach(x=>PAG_PAG[x]=0); }
  else { const k=chaveTab(t); PAG_PAG[k]=(PAG_PAG[k]||0)+(+b.dataset.pagIr); }
  delete nav.dataset.sig; paginaTabelas(); const box=t.closest('.tabela')||t; if(b.dataset.pagIr&&box.getBoundingClientRect().top<0) box.scrollIntoView({block:'start'}); });
window.paginaTabelas=paginaTabelas;
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-pagsel]'); if(!b) return; try{ localStorage.setItem('hubv.pagTam',b.dataset.pagsel); }catch(_){} if(typeof fOp!=='undefined'){ fOp.pg=0; fOp.pgT=0; } if(typeof fLeads!=='undefined') fLeads.pg=0; Object.keys(PAG_PAG).forEach(x=>PAG_PAG[x]=0); render(); });

let agBarras=false; const pedeBarras=()=>{ if(!agBarras){ agBarras=true; requestAnimationFrame(()=>{ agBarras=false; try{ aplicaBusca(); }catch(_){} try{ ordenaTabelas(); }catch(_){} try{ cartaoAuto(); }catch(_){} try{ paginaTabelas(); }catch(_){} barrasTopo(); }); } };
new MutationObserver(pedeBarras).observe(document.getElementById('conteudo'),{childList:true,subtree:true});
window.addEventListener('resize',pedeBarras);

// tooltip do gráfico
const tip=document.getElementById('tip');
document.addEventListener('mousemove',e=>{const t=e.target.closest&&e.target.closest('[data-tip]'); if(!t){tip.hidden=true;return;} tip.textContent=t.dataset.tip; tip.hidden=false;
  const x=Math.min(window.innerWidth-tip.offsetWidth-8,e.clientX+12), y=Math.max(8,e.clientY-36); tip.style.left=x+'px'; tip.style.top=y+'px';});

const ASSINADAS={};
function assina(c){ if(!S[c]) S[c]={}; if(!DB||ASSINADAS[c]) return; ASSINADAS[c]=true;
  DB.collection(c).onSnapshot(snap=>{ const m={}; snap.docs.forEach(d=>{ if(d.exists) m[d.id]=d.data(); }); S[c]=m; carregado[c]=true; if(c==='construcoes') carregaModulos(); pede(); },
    err=>{ if(err&&err.code==='revoked') document.getElementById('sem-banco').hidden=false; }); }
render();
const espera=setTimeout(()=>{ if(!DB) document.getElementById('sem-banco').hidden=false; },10000);
(window.claude&&window.claude.use?window.claude.use('db'):Promise.resolve(null)).then(db=>{
  if(!db){ document.getElementById('sem-banco').hidden=false; return; }
  clearTimeout(espera); DB=(window.BaseSupabase?window.BaseSupabase.envolve(db):db); /* 11/11/2026 base única 1d-3a: gravação dupla e chave de fonte (modulos/base-supabase.js) */
  COLS.forEach(assina);
  (async()=>{ try{ const u=await window.claude.use('user'); UID=u?await u.id():null; }catch(e){ UID=null; } if(!UID) return;
    DB.doc('data/users/'+UID+'/preferencias').onSnapshot(d=>{
      PREFS=d.exists?{...d.data()}:{};
      if(!d.exists&&ORD) return; // ainda não foi guardada na conta: fica a do aparelho
      const o=PREFS.ordem_abas, v=o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length?JSON.parse(JSON.stringify(o)):null;
      if(JSON.stringify(v)===JSON.stringify(ORD)) return;
      ORD=v; ordLocal(v); render();
    },()=>{});
  })();
}).catch(()=>{ document.getElementById('sem-banco').hidden=false; });
window.VZ_CFG={ ids:['busca-q','ba-q','imv-q'],
  contexto:(id)=>{ const r=(typeof rotAba==='function'&&rotAba(aba))||aba;
    if(id==='busca-q') return {onde:'busca geral do HUB da diretoria, que acha uma pessoa, um imóvel, um código ou um empreendimento', sintaxe:'Sintaxe: um termo só (nome da pessoa, código do imóvel como A8 ou AP346, nome do empreendimento, rua ou bairro). Se a frase trouxer vários filtros, devolva só o termo principal em "q".'};
    if(id==='imv-q') return {onde:'lista de imóveis anunciados no site, no HUB da diretoria (ref., bairro, rua, corretor, proprietário, dormitórios, vagas, valor, itens)'};
    return {onde:'aba "'+r+'" do HUB da diretoria da Vivere'}; } };
/* ---------- busca por voz e com IA (30/10/2026, pedido do Cleiton) ----------
   Em cada barra de busca listada em VZ_CFG.ids entram dois botões: 🎤 (falar) e ✨ IA (entender a frase).
   O microfone usa o reconhecimento de voz do navegador; onde a página não tem o microfone liberado,
   cai no ditado do teclado (🎤 do teclado no celular, Win + H no Windows) e o ✨ IA converte o texto ditado.
   A IA só traduz a frase para a sintaxe de busca que a página já entende (termos separados por vírgula). */
(() => {
  const CFG = window.VZ_CFG || { ids: [] };
  let IA, ouvindo = null, tAviso = null, pend = 0;
  const movel = (() => { try { return matchMedia('(pointer:coarse)').matches; } catch (e) { return false; } })();
  const hoje = () => { const d = new Date(); return d.toLocaleDateString('pt-BR'); };
  const amanha = () => { const d = new Date(Date.now() + 864e5); return d.toLocaleDateString('pt-BR'); };
  function aviso(txt, ms) {
    let a = document.getElementById('vz-aviso');
    if (!a) { a = document.createElement('div'); a.id = 'vz-aviso'; a.setAttribute('role', 'status'); a.setAttribute('aria-live', 'polite'); document.body.appendChild(a); }
    a.textContent = txt; a.classList.add('visivel'); clearTimeout(tAviso);
    if (ms !== 0) tAviso = setTimeout(() => a.classList.remove('visivel'), ms || 5000);
  }
  function grupo(id) {
    const g = document.createElement('span'); g.className = 'vz'; g.dataset.vzPara = id;
    g.innerHTML = '<button type="button" class="vz-b" data-vz-mic aria-label="Buscar falando" title="Buscar falando">🎤</button>'
      + '<button type="button" class="vz-b vz-ia" data-vz-ia aria-label="Buscar com IA: entender a frase e montar a busca" title="Entender a frase e montar a busca">✨ IA</button>';
    return g;
  }
  function anexa() {
    (CFG.ids || []).forEach((id) => {
      const i = document.getElementById(id); if (!i) return;
      const n = i.nextElementSibling; if (n && n.classList && n.classList.contains('vz')) return;
      i.after(grupo(id));
    });
  }
  function marca(id, on) { document.querySelectorAll('.vz[data-vz-para="' + id + '"] [data-vz-mic]').forEach((b) => { b.classList.toggle('ouvindo', !!on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
  function dica(id) {
    const i = document.getElementById(id);
    MODO[id] = true;
    if (i) { try { i.focus(); i.select(); } catch (e) {} }
    aviso(movel ? 'Toque no 🎤 do teclado, fale o que procura e depois em Buscar (ou ✨ IA).'
      : 'Dite com Win + H (Windows) ou digite a frase e tecle Enter (ou ✨ IA).', 12000);
  }
  // celular: a página não tem o microfone liberado, então o 🎤 abre o teclado para o ditado dele;
  // depois de falar, o "Buscar"/Enter do teclado (ou o ✨ IA) manda a frase para a IA.
  const MODO = {};
  function ouvir(id) {
    if (ouvindo) { try { ouvindo.stop(); } catch (e) {} return; }
    if (movel) return dica(id);
    const C = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!C) return dica(id);
    let r; try { r = new C(); } catch (e) { return dica(id); }
    r.lang = 'pt-BR'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
    let fala = '', erro = '';
    r.onresult = (e) => { let t = ''; for (const x of e.results) t += x[0].transcript; fala = t; const el = document.getElementById(id); if (el) el.value = t; aviso('🎤 ' + t, 0); };
    r.onerror = (e) => { erro = (e && e.error) || 'erro'; };
    r.onend = () => { ouvindo = null; marca(id, false);
      if (fala.trim()) return entender(id, fala);
      if (erro && erro !== 'no-speech' && erro !== 'aborted') return dica(id);
      aviso('Não ouvi nada. Toque no 🎤 e fale de novo.'); };
    try { r.start(); ouvindo = r; marca(id, true); aviso('Ouvindo… fale o que procura.', 0); } catch (e) { ouvindo = null; dica(id); }
  }
  const SINTAXE = 'Sintaxe da busca: termos separados por vírgula; aparece o que atende a pelo menos um termo, primeiro o que atende mais. '
    + 'Cada termo é procurado no texto da lista e nos dados das pessoas: nome, telefone, CPF, e-mail, código ou referência (A8, AP346), bairro, rua, empreendimento, '
    + 'construtora, tipo (casa, apartamento, terreno, sala), item (piscina, churrasqueira, mobiliado, vista mar), situação, etapa ou origem, data no formato dd/mm/aaaa. '
    + 'Valores: "1,5 mi", "800 mil", "R$ 950.000" (pega 20% para mais e para menos). Dormitórios: "3 dorm"; suítes: "1 suíte"; garagem: "2 vagas".';
  function prompt(id, texto) {
    const c = (CFG.contexto && CFG.contexto(id)) || {};
    const abas = (CFG.abas && id === CFG.idAbas) ? CFG.abas : null;
    return 'Você converte o pedido de busca de um corretor de imóveis (dito em voz alta ou digitado) nos termos de busca de um painel da Vivere Imóveis, em Florianópolis.\n'
      + 'Hoje é ' + hoje() + ' (amanhã: ' + amanha() + ').\n'
      + 'Onde a busca vai rodar: ' + (c.onde || 'lista da página') + '.\n'
      + (c.sintaxe || SINTAXE) + '\n'
      + 'Regras: tire verbos e palavras de ligação ("quero", "procuro", "me mostra", "com", "no", "de"); quartos ou dormitórios viram "N dorm"; '
      + '"até", "por volta de" ou "na faixa de" um valor viram o próprio valor; "hoje" e "amanhã" viram a data; corrija erros comuns do reconhecimento de voz em nomes de bairros de Florianópolis '
      + '(Campeche, Rio Tavares, Itacorubi, Córrego Grande, Trindade, Jurerê, Ingleses, Santo Antônio de Lisboa, Coqueiros, Estreito, Lagoa da Conceição, Saco Grande, João Paulo); '
      + 'no máximo 6 termos; nunca invente nome, telefone ou código que não foi dito.\n'
      + (abas ? 'Abas do painel (id: o que mostra): ' + abas.map((a) => a[0] + ': ' + a[1]).join('; ') + '. Aba atual: ' + (c.aba || '') + '. Se o pedido for claramente de outra aba (ex.: "leads para ligar hoje" → leads; "apartamento de 2 quartos no Campeche" → pesquisa), devolva o id dela em "aba"; senão, "".\n' : '')
      + 'Responda só com JSON: {"aba": "id ou vazio", "q": "termos separados por vírgula", "resumo": "frase curta dizendo o que vai ser buscado"}.\n'
      + 'Pedido: "' + String(texto).replace(/"/g, "'").slice(0, 400) + '"';
  }
  function aplicaPadrao(id, q) {
    const i = document.getElementById(id); if (!i) return;
    i.value = q; i.dispatchEvent(new Event('input', { bubbles: true }));
  }
  async function entender(id, texto) {
    const i = document.getElementById(id);
    texto = String(texto || (i && i.value) || '').trim();
    if (!texto) { if (i) { try { i.focus(); } catch (e) {} } return aviso('Escreva ou dite a frase e toque em ✨ IA.'); }
    if (IA === undefined) { try { IA = window.claude && window.claude.use ? await window.claude.use('sample') : null; } catch (e) { IA = null; } }
    const aplica = CFG.aplica || ((x, q) => aplicaPadrao(x, q));
    if (!IA) { aplica(id, texto, ''); return aviso('A IA não está liberada nesta visualização; busquei o texto como foi dito.', 7000); }
    aviso('✨ Entendendo a busca…', 0);
    document.querySelectorAll('.vz[data-vz-para="' + id + '"] [data-vz-ia]').forEach((b) => { b.disabled = true; });
    try {
      const r = await IA.json(prompt(id, texto), { modelTier: 'quick' });
      const q = String((r && r.q) || '').trim() || texto;
      const ab = (CFG.abas && r && r.aba && CFG.abas.some((a) => a[0] === r.aba)) ? r.aba : '';
      aplica(id, q, ab);
      aviso('✨ ' + ((r && r.resumo) ? r.resumo + ' — ' : '') + 'busca: ' + q, 8000);
    } catch (e) {
      aplica(id, texto, '');
      aviso(e && e.code === 'rate_limited' ? 'A IA está ocupada agora; busquei o texto como foi dito.'
        : e && e.code === 'not_granted' ? 'A IA não foi liberada nesta página; busquei o texto como foi dito.'
        : 'Não consegui usar a IA; busquei o texto como foi dito.', 7000);
    } finally {
      document.querySelectorAll('.vz [data-vz-ia]').forEach((b) => { b.disabled = false; });
    }
  }
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('.vz [data-vz-mic], .vz [data-vz-ia]'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    const id = b.closest('.vz').dataset.vzPara;
    if (b.hasAttribute('data-vz-mic')) ouvir(id); else { MODO[id] = false; entender(id); }
  }, true);
  // no modo voz, o Enter/"Buscar" do teclado manda a frase para a IA (antes dos atalhos da própria página)
  document.addEventListener('keydown', (ev) => {
    const id = ev.target && ev.target.id; if (!id || !MODO[id] || ev.key !== 'Enter') return;
    ev.preventDefault(); ev.stopPropagation(); MODO[id] = false;
    try { ev.target.blur(); } catch (e) {}
    entender(id);
  }, true);
  document.addEventListener('focusout', (ev) => { const id = ev.target && ev.target.id; if (id && MODO[id]) setTimeout(() => { if (document.activeElement !== ev.target) MODO[id] = false; }, 400); }, true);
  const obs = new MutationObserver(() => { if (pend) return; pend = 1; requestAnimationFrame(() => { pend = 0; anexa(); }); });
  const liga = () => { anexa(); obs.observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
  window.VZ = { entender, ouvir };
})();

/* ---------- grades de cards em linhas cheias (30/10/2026, pedido do Cleiton) ----------
   Mesma regra dos menus (MenusCheios): nenhum grupo de cards deixa espaço vazio no fim da linha.
   Para toda grade de colunas iguais dentro de #conteudo: mede quantas colunas cabem na largura atual,
   reparte os cards em linhas com quantidades que diferem no máximo em 1 (as linhas maiores primeiro)
   e faz cada card da linha ocupar a fração certa (grade fina com o MMC das duas quantidades). */
(() => {
  if (window.GradesCheias) return;
  const RAIZ = '#conteudo';
  const CARDS = '.kpis, .grade, .resumo-cob, .crm-cors, .op-ofs, .org-ramos, .rel-ctl, .va, .cartoes, .fatos, .fatos-emp, .pp-grade, .pp-fun, .jur-kpis, .car-grade';
  const IGNORA = '.form, .fotos, .tabela, table, .mapa, .vk, [data-sem-cheio]';
  const mdc = (a, b) => (b ? mdc(b, a % b) : a);
  const mmc = (a, b) => (a * b) / mdc(a, b);
  const visiveis = (g) => [...g.children].filter((k) => !k.hidden && getComputedStyle(k).display !== 'none' && getComputedStyle(k).position !== 'absolute');
  function limpa(g) {
    if (!g._gcOn) return;
    g.style.removeProperty('grid-template-columns');
    [...g.children].forEach((k) => { if (k._gcSpan) { k.style.removeProperty('grid-column'); k._gcSpan = 0; } });
    g._gcOn = false;
  }
  function trilhas(g) {
    const t = getComputedStyle(g).gridTemplateColumns;
    if (!t || t === 'none') return null;
    const L = t.split(' ').map(parseFloat).filter((x) => x > 0);
    if (L.length < 2) return null;
    const min = Math.min(...L), max = Math.max(...L);
    return max - min <= 1.5 ? L.length : null; // só colunas iguais (cards), nunca linhas de tabela/listas com colunas fixas
  }
  function equilibra(g) {
    limpa(g);
    if (g.closest(IGNORA) || g.matches(IGNORA)) return;
    const ks = visiveis(g);
    if (ks.length < 2) return;
    if (ks.some((k) => { const c = k.style.gridColumn || getComputedStyle(k).gridColumnEnd; return c && c !== 'auto'; })) return;
    const cols = trilhas(g); if (!cols) return;
    const n = ks.length;
    if (n % cols === 0) return;               // já fecha em linhas cheias
    const linhas = Math.ceil(n / cols);
    const base = Math.floor(n / linhas), extra = n % linhas; // `extra` linhas com base+1, o resto com base
    const L = extra ? mmc(base, base + 1) : base;
    if (L > 60) return;
    g.style.setProperty('grid-template-columns', `repeat(${L}, minmax(0, 1fr))`, 'important'); // F5a 02/11/2026: sem prioridade, perdia para .kpis{…!important} e cada card ocupava a linha inteira
    let i = 0;
    for (let l = 0; l < linhas; l++) {
      const m = base + (l < extra ? 1 : 0), sp = L / m;
      for (let j = 0; j < m; j++, i++) { ks[i].style.setProperty('grid-column', `span ${sp}`, 'important'); ks[i]._gcSpan = sp; }
    }
    g._gcOn = true;
  }
  let pedido = 0, obs;
  function roda() {
    pedido = 0;
    const raiz = document.querySelector(RAIZ); if (!raiz) return;
    // só os blocos de cards conhecidos (varrer todos os elementos com getComputedStyle travava páginas grandes)
    const gs = [...raiz.querySelectorAll(CARDS)].filter((el) => el.children.length >= 2 && el.children.length <= 200 && getComputedStyle(el).display === 'grid');
    gs.forEach((g) => { try { equilibra(g); } catch (e) {} });
    if (obs) obs.takeRecords();
  }
  function agenda() { if (!pedido) pedido = requestAnimationFrame(roda); }
  obs = new MutationObserver(agenda);
  const liga = () => { obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }); agenda(); };
  addEventListener('resize', agenda);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(agenda);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liga); else liga();
  window.GradesCheias = { atualiza: agenda };
})();

})();
