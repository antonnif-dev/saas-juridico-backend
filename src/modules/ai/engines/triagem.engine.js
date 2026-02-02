const { normalizeCategoria, pickResumo, normalizeDocsList, safeText } = require('../ai.utils');

function triagemEngine(pre) {
  const categoria = normalizeCategoria(pre?.categoria);
  const urgencia = safeText(pre?.urgencia, 40).toLowerCase();

  const resumoBase = pickResumo(pre);
  const docsEnviados = normalizeDocsList(pre?.documentos);
  const docsSugeridos = new Set();

  if (categoria.includes('trabalh')) {
    ['CTPS', 'Holerites', 'Extrato FGTS', 'Comprovantes de ponto', 'Conversas/Emails'].forEach(d => docsSugeridos.add(d));
  } else if (categoria.includes('fam')) {
    ['Certidões (nascimento/casamento)', 'Comprovante de residência', 'Provas (mensagens/fotos)', 'Documentos das partes'].forEach(d => docsSugeridos.add(d));
  } else if (categoria.includes('consum')) {
    ['Contrato/Comprovante de compra', 'Nota fiscal', 'Protocolos de atendimento', 'Prints/Conversas'].forEach(d => docsSugeridos.add(d));
  } else if (categoria.includes('civel') || categoria.includes('civil')) {
    ['Contratos', 'Comprovantes de pagamento', 'Notificações', 'Conversas/Emails'].forEach(d => docsSugeridos.add(d));
  } else {
    ['Documentos pessoais', 'Comprovantes relacionados ao fato', 'Conversas/Emails/Prints', 'Contratos (se houver)'].forEach(d => docsSugeridos.add(d));
  }

  const documentos = Array.from(docsSugeridos);

  const pontos = [];
  if (!safeText(pre?.dataProblema, 40)) pontos.push('Data do fato não informada (atenção a prazos).');
  if (!safeText(pre?.objetivo, 200)) pontos.push('Objetivo do cliente não está claro.');
  if (!safeText(pre?.tipoRelacao, 120)) pontos.push('Tipo de relação não informado.');
  if (docsEnviados.length === 0) pontos.push('Nenhum documento foi anexado até o momento.');

  const prioridade =
    urgencia.includes('alta') ? 'Alta' :
    urgencia.includes('baixa') ? 'Baixa' :
    'Média';

  const triagem =
    `Categoria: ${pre?.categoria || 'Não informado'} | Urgência: ${pre?.urgencia || 'Média'} | Prioridade sugerida: ${prioridade}.\n` +
    (pontos.length ? `Pontos a confirmar:\n- ${pontos.join('\n- ')}` : 'Informações mínimas parecem suficientes para avançar.');

  const parecer =
    `Parecer inicial (heurístico): com base nas informações fornecidas, recomenda-se ` +
    `solicitar os documentos sugeridos e validar datas/objetivo antes de qualquer medida. ` +
    `Se houver prazos, priorize contato e coleta documental.`;

  return {
    resumo: resumoBase,
    triagem,
    documentos,
    parecer,
    meta: {
      prioridade,
      docsEnviados,
    },
  };
}

module.exports = { triagemEngine };