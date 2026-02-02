function reportEngine({ pre, type }) {
  const base = {
    message: 'Relatório gerado (modelo inicial)',
    preatendimentoId: pre?.id || null,
    resumo: pre?.resumoProblema || pre?.mensagem || '',
    categoria: pre?.categoria || '',
    urgencia: pre?.urgencia || '',
    status: pre?.status || '',
  };

  if (type === 'pdf') {
    return { ...base, url: null, note: 'Implementar geração de PDF no próximo passo.' };
  }
  if (type === 'email') {
    return { ...base, note: 'Implementar envio por e-mail no próximo passo.' };
  }
  return base;
}

module.exports = { reportEngine };