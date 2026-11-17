/* Funis do CRM da Vivere (16/11/2026, sessão "VIS - Construção - Ampliação CRM Corretores", fatia 1).
   Decisões do Cleiton nos cartões de 16/11/2026: quatro funis (Locação, Venda, Captação, Temporada), cada um com as suas etapas,
   mais a caixa "A definir" para o lead sem interesse escolhido. O funil sai do campo `interesse` do lead; a etapa gravada continua
   em `etapa` (texto). Lead com etapa antiga (as 9 etapas de antes) é lido na etapa equivalente do funil e só passa a gravar a etapa
   nova quando o corretor mexe nele. Inspirado no Pipedrive: alerta de parado por etapa, motivos de perda por funil e campos
   próprios de cada funil. Fatia 2 (16/11/2026): valor do negócio, probabilidade por etapa, receita estimada da Vivere e previsão do mês. Fonte única: o HUB e a Vivian usam a mesma definição (copiar este arquivo, sem editar lá). */
(function () {
  if (window.FunisCRM) return;
  const FUNIS = {
    locacao: {
      rot: 'Locação', icone: '🔑', ganho: 'Fechado', final: 'Fechado',
      valor: { rot: 'Aluguel mensal (R$)', curto: 'Aluguel' }, receita: { tipo: 'aluguel', n: 1, rot: '1 aluguel (intermediação)' },
      prob: { Novo: 5, 'Contato feito': 10, Qualificado: 20, 'Visita agendada': 30, 'Visita feita': 40, Proposta: 60, 'Análise cadastral': 75, 'Contrato e garantia': 90 },
      etapas: ['Novo', 'Contato feito', 'Qualificado', 'Visita agendada', 'Visita feita', 'Proposta', 'Análise cadastral', 'Contrato e garantia', 'Fechado', 'Perdido'],
      parado: { 'Contato feito': 3, Qualificado: 5, 'Visita agendada': 3, 'Visita feita': 2, Proposta: 3, 'Análise cadastral': 2, 'Contrato e garantia': 3 },
      auto: { 'Contato feito': ['Qualificar: renda, garantia e mudança', 1], Qualificado: ['Enviar opções e marcar visita', 1], 'Visita agendada': ['Confirmar a visita', 1], 'Visita feita': ['Pedir retorno da visita', 1], Proposta: ['Retorno do proprietário', 3], 'Análise cadastral': ['Cobrar documentos do cadastro', 1], 'Contrato e garantia': ['Conferir assinaturas e garantia', 2] },
      motivos: ['Sem retorno', 'Renda insuficiente', 'Reprovado na análise cadastral', 'Sem garantia aceita', 'Alugou com outro', 'Desistiu', 'Sem perfil/orçamento', 'Contato inválido', 'Duplicado', 'Corretor anunciante', 'Outro'],
      campos: [
        { k: 'renda', rot: 'Renda mensal comprovável (R$)', tipo: 'vlr' },
        { k: 'garantia', rot: 'Garantia pretendida', tipo: 'sel', ops: ['Título de capitalização', 'Fiador', 'Seguro fiança', 'Caução', 'A definir'] },
        { k: 'moradores', rot: 'Moradores', tipo: 'num' },
        { k: 'pets', rot: 'Animais', tipo: 'sel', ops: ['Não', 'Sim'] },
        { k: 'mudanca', rot: 'Quer mudar até', tipo: 'data' }],
    },
    venda: {
      rot: 'Venda', icone: '🏷', ganho: 'Fechado', final: 'Fechado',
      valor: { rot: 'Preço do negócio (R$)', curto: 'Preço' }, receita: { tipo: 'pct', pct: 6, rot: '6% do preço (5% em algumas vendas de construtora)' },
      prob: { Novo: 2, 'Contato feito': 5, Qualificado: 10, 'Visita agendada': 15, 'Visita feita': 25, Proposta: 40, Negociação: 55, 'Documentação e financiamento': 80 },
      etapas: ['Novo', 'Contato feito', 'Qualificado', 'Visita agendada', 'Visita feita', 'Proposta', 'Negociação', 'Documentação e financiamento', 'Fechado', 'Perdido'],
      parado: { 'Contato feito': 3, Qualificado: 7, 'Visita agendada': 3, 'Visita feita': 3, Proposta: 3, Negociação: 5, 'Documentação e financiamento': 10 },
      auto: { 'Contato feito': ['Qualificar: valor, financiamento e prazo', 1], Qualificado: ['Enviar opções e marcar visita', 1], 'Visita agendada': ['Confirmar a visita', 1], 'Visita feita': ['Pedir retorno da visita', 1], Proposta: ['Retorno do vendedor', 3], Negociação: ['Fechar condições e minuta', 2], 'Documentação e financiamento': ['Acompanhar documentos e banco', 3] },
      motivos: ['Sem retorno', 'Sem orçamento ou crédito', 'Financiamento negado', 'Comprou com outro', 'Desistiu', 'Sem perfil/orçamento', 'Contato inválido', 'Duplicado', 'Corretor anunciante', 'Outro'],
      campos: [
        { k: 'pagamento', rot: 'Forma de pagamento', tipo: 'multi', ops: ['À vista', 'Financiamento', 'FGTS', 'Permuta', 'Consórcio'] },
        { k: 'credito', rot: 'Crédito', tipo: 'sel', ops: ['Não precisa', 'Não iniciado', 'Em análise', 'Aprovado', 'Negado'] },
        { k: 'entrada_vlr', rot: 'Entrada disponível (R$)', tipo: 'vlr' },
        { k: 'quando', rot: 'Quando quer comprar', tipo: 'txt' }],
    },
    captacao: {
      rot: 'Captação', icone: '🏠', ganho: 'Captado', final: 'No ar',
      valor: { rot: 'Valor pretendido (R$)', curto: 'Valor pretendido', campo: 'valor_pretendido' }, receita: null,
      prob: { 'A captar': 5, 'Contato feito': 15, 'Avaliação do imóvel': 30, 'Proposta de agenciamento': 50 },
      etapas: ['A captar', 'Contato feito', 'Avaliação do imóvel', 'Proposta de agenciamento', 'Captado', 'Cadastro completo', 'No ar', 'Perdido'],
      parado: { 'A captar': 7, 'Contato feito': 2, 'Avaliação do imóvel': 5, 'Proposta de agenciamento': 3, Captado: 3, 'Cadastro completo': 2 },
      auto: { 'Contato feito': ['Marcar avaliação do imóvel', 2], 'Avaliação do imóvel': ['Enviar proposta de agenciamento', 2], 'Proposta de agenciamento': ['Retorno do proprietário', 3], Captado: ['Completar cadastro: fotos, documentos e ficha', 3], 'Cadastro completo': ['Conferir o anúncio no ar', 2] },
      motivos: ['Sem retorno', 'Não aceita autorização ou exclusividade', 'Valor fora do mercado', 'Fechou com outra imobiliária', 'Desistiu de vender ou alugar', 'Documentação irregular', 'Pediu para não ser contatado', 'Contato inválido', 'Duplicado', 'Corretor anunciante', 'Outro'],
      campos: [
        { k: 'valor_pretendido', rot: 'Valor pretendido (R$)', tipo: 'vlr' },
        { k: 'exclusividade', rot: 'Exclusividade', tipo: 'sel', ops: ['Em negociação', 'Sim', 'Não'] },
        { k: 'prazo_aut', rot: 'Prazo da autorização (dias)', tipo: 'num' },
        { k: 'documentacao', rot: 'Documentação', tipo: 'sel', ops: ['A verificar', 'Matrícula', 'Contrato de compra', 'Posse'] },
        { k: 'chaves', rot: 'Onde ficam as chaves', tipo: 'txt' }],
    },
    temporada: {
      rot: 'Temporada', icone: '☀', ganho: 'Contrato assinado', final: 'Concluída',
      valor: { rot: 'Valor total da estadia (R$)', curto: 'Estadia' }, receita: { tipo: 'pct', pct: 15, rot: '15% do total (contrato do Lucas)' },
      prob: { Novo: 10, 'Contato feito': 20, 'Datas e perfil': 30, 'Opções enviadas': 45, Reserva: 75 },
      etapas: ['Novo', 'Contato feito', 'Datas e perfil', 'Opções enviadas', 'Reserva', 'Contrato assinado', 'Entrada', 'Concluída', 'Perdido'],
      parado: { 'Contato feito': 1, 'Datas e perfil': 1, 'Opções enviadas': 2, Reserva: 2 },
      auto: { 'Contato feito': ['Confirmar datas e perfil', 1], 'Datas e perfil': ['Enviar opções', 1], 'Opções enviadas': ['Pedir retorno das opções', 1], Reserva: ['Cobrar sinal de 50%', 1], 'Contrato assinado': ['Combinar entrada e chaves', 1], Entrada: ['Checar se está tudo ok', 1] },
      motivos: ['Sem retorno', 'Sem imóvel nas datas', 'Preço', 'Fechou com outro', 'Desistiu', 'Contato inválido', 'Duplicado', 'Corretor anunciante', 'Outro'],
      campos: [
        { k: 'chegada', rot: 'Chegada', tipo: 'data' },
        { k: 'saida', rot: 'Saída', tipo: 'data' },
        { k: 'hospedes', rot: 'Hóspedes', tipo: 'num' },
        { k: 'pets', rot: 'Animais', tipo: 'sel', ops: ['Não', 'Sim'] }],
    },
    definir: {
      rot: 'A definir', icone: '❔', ganho: null, final: null, valor: null, receita: null, prob: { Novo: 0, 'Contato feito': 0 },
      etapas: ['Novo', 'Contato feito', 'Perdido'],
      parado: { 'Contato feito': 3 },
      motivos: ['Sem retorno', 'Sem perfil/orçamento', 'Desistiu', 'Contato inválido', 'Duplicado', 'Corretor anunciante', 'Outro'],
      campos: [],
    },
  };
  const ORDEM = ['locacao', 'venda', 'captacao', 'temporada', 'definir'];
  const DO_INTERESSE = { comprador: 'venda', locatario_anual: 'locacao', locatario_temporada: 'temporada', vendedor: 'captacao', locador_anual: 'captacao', locador_temporada: 'captacao' };
  // etapas de antes (um funil só, 9 etapas) → etapa do funil; aprovado pelo Cleiton: Negociação em Locação → Proposta; Proposta e Negociação em Captação → Proposta de agenciamento
  const LEGADO = {
    locacao: { 'Negociação': 'Proposta' },
    venda: {},
    captacao: { Novo: 'A captar', Qualificado: 'Avaliação do imóvel', 'Visita agendada': 'Avaliação do imóvel', 'Visita feita': 'Avaliação do imóvel', Proposta: 'Proposta de agenciamento', 'Negociação': 'Proposta de agenciamento', Fechado: 'Captado' },
    temporada: { Qualificado: 'Datas e perfil', 'Visita agendada': 'Opções enviadas', 'Visita feita': 'Opções enviadas', Proposta: 'Reserva', 'Negociação': 'Reserva', Fechado: 'Concluída' },
    definir: {},
  };
  // nível comum das etapas, para levar a etapa de um funil a outro quando o interesse muda (fica na etapa de nível igual ou logo abaixo)
  const NIVEL = { Novo: 0, 'A captar': 0, 'Contato feito': 1, Qualificado: 2, 'Datas e perfil': 2, 'Visita agendada': 3, 'Avaliação do imóvel': 3, 'Opções enviadas': 3, 'Visita feita': 3.5,
    Proposta: 4, 'Proposta de agenciamento': 4, 'Negociação': 4.5, 'Análise cadastral': 5, 'Documentação e financiamento': 5, Reserva: 5, 'Contrato e garantia': 5.5,
    'Contrato assinado': 6, Captado: 6, Fechado: 7, 'Cadastro completo': 7, Entrada: 7, 'No ar': 8, 'Concluída': 8 };

  const funilDoInteresse = (int) => DO_INTERESSE[int] || 'definir';
  const def = (f) => FUNIS[f] || FUNIS.definir;
  function etapaNoFunil(etapa, f) {
    const F = def(f), e = etapa || F.etapas[0];
    if (F.etapas.includes(e)) return e;
    if (e === 'Perdido') return 'Perdido';
    const L = (LEGADO[f] || {})[e]; if (L) return L;
    const n = NIVEL[e]; if (n == null) return F.etapas[0];
    let melhor = F.etapas[0];
    F.etapas.forEach((x) => { if (x !== 'Perdido' && NIVEL[x] != null && NIVEL[x] <= n) melhor = x; });
    return melhor;
  }
  const ordem = (etapa, f) => def(f).etapas.indexOf(etapaNoFunil(etapa, f));
  const aberta = (etapa, f) => { const e = etapaNoFunil(etapa, f), F = def(f); return e !== 'Perdido' && e !== F.final; };
  // ganho = chegou à etapa de ganho do funil ou passou dela (Captação: Captado, Cadastro completo e No ar)
  const ganho = (etapa, f) => { const F = def(f); if (!F.ganho) return false; const e = etapaNoFunil(etapa, f); return e !== 'Perdido' && F.etapas.indexOf(e) >= F.etapas.indexOf(F.ganho); };
  // prazos = controle/prazos.parado_etapa {funil: {etapa: dias | null}}; null = sem alerta naquela etapa
  const paradoDias = (etapa, f, prazos) => { const e = etapaNoFunil(etapa, f), P = prazos && prazos[f];
    if (P && Object.prototype.hasOwnProperty.call(P, e)) return P[e] == null || P[e] === '' ? null : Number(P[e]);
    return def(f).parado[e] ?? null; };
  // ---------- fatia 2 (16/11/2026, decisões do Cleiton): valor, probabilidade por etapa, receita estimada e previsão do mês ----------
  // Probabilidade: tabela padrão acima; a diretoria sobrepõe em controle/prazos.prob_etapa {funil: {etapa: %}}; o corretor ajusta um
  // negócio no campo `prob` do lead (vale até a próxima troca de etapa). Perdido = 0; etapa de ganho em diante = 100.
  const n0 = (v) => { if (v == null || v === '') return null; const n = Number(v); return isFinite(n) ? n : null; };
  const limita = (n) => Math.max(0, Math.min(100, n));
  function probEtapa(etapa, f, tabela) {
    const e = etapaNoFunil(etapa, f), F = def(f);
    if (e === 'Perdido') return 0; if (ganho(e, f)) return 100;
    const T = tabela && tabela[f];
    if (T && Object.prototype.hasOwnProperty.call(T, e) && n0(T[e]) != null) return limita(n0(T[e]));
    return n0((F.prob || {})[e]) ?? 0;
  }
  function probDe(l, f, tabela) {
    const e = etapaNoFunil(l && l.etapa, f);
    if (e === 'Perdido') return 0; if (ganho(e, f)) return 100;
    const p = n0(l && l.prob); return p != null ? limita(p) : probEtapa(e, f, tabela);
  }
  const ajustada = (l, f) => { const e = etapaNoFunil(l && l.etapa, f); return e !== 'Perdido' && !ganho(e, f) && n0(l && l.prob) != null; };
  function valorDe(l, f) { const V = def(f).valor; if (!V || !l) return null; const v = n0(V.campo ? (l.campos || {})[V.campo] : l.valor); return v && v > 0 ? v : null; }
  const receitaPct = (l, f) => { const R = def(f).receita; if (!R || R.tipo !== 'pct') return null; const p = n0(l && l.receita_pct); return p != null && p >= 0 ? p : R.pct; };
  function receitaDe(l, f) {
    const R = def(f).receita, v = valorDe(l, f); if (!R || v == null) return null;
    return R.tipo === 'aluguel' ? v * (R.n || 1) : v * receitaPct(l, f) / 100;
  }
  // previsão de um mês ('AAAA-MM'): itens = [{lead, f}] · abertos com fechamento previsto no mês, ganhos no mês e o que falta preencher
  function previsao(itens, mes, tabela, hoje) {
    const z = () => ({ n: 0, valor: 0, pond: 0, rec: 0, recPond: 0 });
    const P = { mes, abertos: z(), ganhos: z(), semValor: 0, semData: 0, vencidos: 0, porEtapa: {} };
    itens.forEach(({ lead: l, f }) => {
      if (f === 'definir' || !l) return;
      const e = etapaNoFunil(l.etapa, f), v = valorDe(l, f), r = receitaDe(l, f), fp = String(l.fechamento_prev || '');
      if (ganho(e, f)) { if (String(l.data_fechamento || '').slice(0, 7) === mes) { const g = P.ganhos; g.n++; g.valor += v || 0; g.rec += r || 0; } return; }
      if (!aberta(e, f)) return;
      if (v == null) P.semValor++; else if (!fp) P.semData++;
      if (fp && hoje && fp < hoje) P.vencidos++;
      if (fp.slice(0, 7) !== mes) return;
      const p = probDe(l, f, tabela) / 100, a = P.abertos; a.n++; a.valor += v || 0; a.pond += (v || 0) * p; a.rec += r || 0; a.recPond += (r || 0) * p;
      const pe = P.porEtapa[e] = P.porEtapa[e] || z(); pe.n++; pe.valor += v || 0; pe.pond += (v || 0) * p; pe.recPond += (r || 0) * p;
    });
    return P;
  }
  // ---------- fatia 6 (17/11/2026, decisões do Cleiton): automação por etapa ----------
  // Ao entrar na etapa, o BANCO (gatilho no Supabase) preenche a próxima ação e a data (se o corretor não pôs outra na mesma mudança),
  // cria a tarefa na aba Tarefas, avisa a diretoria no ganho e agenda a reativação do perdido em 90 dias. Esta tabela é só o padrão
  // mostrado no app; o banco tem a mesma (privado.auto_etapa_padrao) e lê a sobreposição de controle/prazos.auto_etapa.
  const REATIVAR = { dias: 90, exceto: ['Corretor anunciante', 'Pediu para não ser contatado', 'Contato inválido', 'Duplicado'] };
  function autoEtapa(etapa, f, tabela) {
    const e = etapaNoFunil(etapa, f), T = tabela && tabela[f];
    if (T && Object.prototype.hasOwnProperty.call(T, e)) { const x = T[e]; return x && x.acao ? { acao: String(x.acao), dias: Number(x.dias) >= 0 ? Number(x.dias) : 1 } : null; }
    const p = (def(f).auto || {})[e]; return p ? { acao: p[0], dias: p[1] } : null;
  }
  const todasEtapas = () => { const s = []; ORDEM.forEach((f) => FUNIS[f].etapas.forEach((e) => { if (!s.includes(e)) s.push(e); })); return s; };
  const todosMotivos = () => { const s = []; ORDEM.forEach((f) => FUNIS[f].motivos.forEach((m) => { if (!s.includes(m)) s.push(m); })); return s; };
  window.FunisCRM = { FUNIS, ORDEM, DO_INTERESSE, LEGADO, NIVEL, funilDoInteresse, def, etapaNoFunil, ordem, aberta, ganho, paradoDias, todasEtapas, todosMotivos, probEtapa, probDe, ajustada, valorDe, receitaPct, receitaDe, previsao, autoEtapa, REATIVAR, versao: '2026-11-17.1' };
})();
