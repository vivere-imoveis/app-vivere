/* Funis do CRM da Vivere (16/11/2026, sessão "VIS - Construção - Ampliação CRM Corretores", fatia 1).
   Decisões do Cleiton nos cartões de 16/11/2026: quatro funis (Locação, Venda, Captação, Temporada), cada um com as suas etapas,
   mais a caixa "A definir" para o lead sem interesse escolhido. O funil sai do campo `interesse` do lead; a etapa gravada continua
   em `etapa` (texto). Lead com etapa antiga (as 9 etapas de antes) é lido na etapa equivalente do funil e só passa a gravar a etapa
   nova quando o corretor mexe nele. Inspirado no Pipedrive: alerta de parado por etapa, motivos de perda por funil e campos
   próprios de cada funil. Fonte única: o HUB e a Vivian usam a mesma definição (copiar este arquivo, sem editar lá). */
(function () {
  if (window.FunisCRM) return;
  const FUNIS = {
    locacao: {
      rot: 'Locação', icone: '🔑', ganho: 'Fechado', final: 'Fechado',
      etapas: ['Novo', 'Contato feito', 'Qualificado', 'Visita agendada', 'Visita feita', 'Proposta', 'Análise cadastral', 'Contrato e garantia', 'Fechado', 'Perdido'],
      parado: { 'Contato feito': 3, Qualificado: 5, 'Visita agendada': 3, 'Visita feita': 2, Proposta: 3, 'Análise cadastral': 2, 'Contrato e garantia': 3 },
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
      etapas: ['Novo', 'Contato feito', 'Qualificado', 'Visita agendada', 'Visita feita', 'Proposta', 'Negociação', 'Documentação e financiamento', 'Fechado', 'Perdido'],
      parado: { 'Contato feito': 3, Qualificado: 7, 'Visita agendada': 3, 'Visita feita': 3, Proposta: 3, Negociação: 5, 'Documentação e financiamento': 10 },
      motivos: ['Sem retorno', 'Sem orçamento ou crédito', 'Financiamento negado', 'Comprou com outro', 'Desistiu', 'Sem perfil/orçamento', 'Contato inválido', 'Duplicado', 'Corretor anunciante', 'Outro'],
      campos: [
        { k: 'pagamento', rot: 'Forma de pagamento', tipo: 'multi', ops: ['À vista', 'Financiamento', 'FGTS', 'Permuta', 'Consórcio'] },
        { k: 'credito', rot: 'Crédito', tipo: 'sel', ops: ['Não precisa', 'Não iniciado', 'Em análise', 'Aprovado', 'Negado'] },
        { k: 'entrada_vlr', rot: 'Entrada disponível (R$)', tipo: 'vlr' },
        { k: 'quando', rot: 'Quando quer comprar', tipo: 'txt' }],
    },
    captacao: {
      rot: 'Captação', icone: '🏠', ganho: 'Captado', final: 'No ar',
      etapas: ['A captar', 'Contato feito', 'Avaliação do imóvel', 'Proposta de agenciamento', 'Captado', 'Cadastro completo', 'No ar', 'Perdido'],
      parado: { 'A captar': 7, 'Contato feito': 2, 'Avaliação do imóvel': 5, 'Proposta de agenciamento': 3, Captado: 3, 'Cadastro completo': 2 },
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
      etapas: ['Novo', 'Contato feito', 'Datas e perfil', 'Opções enviadas', 'Reserva', 'Contrato assinado', 'Entrada', 'Concluída', 'Perdido'],
      parado: { 'Contato feito': 1, 'Datas e perfil': 1, 'Opções enviadas': 2, Reserva: 2 },
      motivos: ['Sem retorno', 'Sem imóvel nas datas', 'Preço', 'Fechou com outro', 'Desistiu', 'Contato inválido', 'Duplicado', 'Corretor anunciante', 'Outro'],
      campos: [
        { k: 'chegada', rot: 'Chegada', tipo: 'data' },
        { k: 'saida', rot: 'Saída', tipo: 'data' },
        { k: 'hospedes', rot: 'Hóspedes', tipo: 'num' },
        { k: 'pets', rot: 'Animais', tipo: 'sel', ops: ['Não', 'Sim'] }],
    },
    definir: {
      rot: 'A definir', icone: '❔', ganho: null, final: null,
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
  const todasEtapas = () => { const s = []; ORDEM.forEach((f) => FUNIS[f].etapas.forEach((e) => { if (!s.includes(e)) s.push(e); })); return s; };
  const todosMotivos = () => { const s = []; ORDEM.forEach((f) => FUNIS[f].motivos.forEach((m) => { if (!s.includes(m)) s.push(m); })); return s; };
  window.FunisCRM = { FUNIS, ORDEM, DO_INTERESSE, LEGADO, NIVEL, funilDoInteresse, def, etapaNoFunil, ordem, aberta, ganho, paradoDias, todasEtapas, todosMotivos, versao: '2026-11-16.1' };
})();
