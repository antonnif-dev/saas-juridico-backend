const { safeText } = require('../ai.utils');

function draftEngine({ type, pre }) {
  const t = safeText(type, 40) || 'peça';

  const titulo = `Minuta de ${t}`;
  const conteudo =
    `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ.\n\n` +
    `Resumo dos fatos (pré-atendimento):\n${safeText(pre?.resumoProblema || pre?.mensagem, 2000) || '[Sem descrição]'}\n\n` +
    `[Estruture aqui: fatos → fundamentos → pedidos.]\n`;

  return { titulo, conteudo, status: 'Draft gerado (modelo inicial)' };
}

module.exports = { draftEngine };
