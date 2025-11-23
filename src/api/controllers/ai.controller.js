class AiController {
  
  // Gera análise para Pré-Atendimento (Triagem)
  async analyzeTriagem(req, res) {
    // Aqui no futuro conectaremos com OpenAI
    const mockResponse = {
      triagem: "O caso apresenta alta probabilidade de êxito...",
      resumo: "Cliente relata vínculo sem registro...",
      documentos: ["CTPS", "Extratos", "Conversas WhatsApp"],
      parecer: "Recomenda-se ajuizamento imediato."
    };
    // Simula delay de processamento
    setTimeout(() => res.json(mockResponse), 1500);
  }

  // Gera peças para Atendimento
  async generateDraft(req, res) {
    const { type } = req.body; // 'peticao', 'contestacao', 'recurso'
    const mockResponse = {
      titulo: `Minuta de ${type || 'Peça Jurídica'}`,
      conteudo: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ...\n\n[Conteúdo gerado pela IA baseado nos fatos do processo...]",
      status: "Draft gerado com sucesso"
    };
    setTimeout(() => res.json(mockResponse), 2000);
  }

  // Gera Relatório Final e NPS
  async generateReport(req, res) {
    const { processoId, type } = req.body;
    let response = {};

    if (type === 'pdf') {
      response = { url: 'https://exemplo.com/relatorio-final.pdf', message: 'PDF Gerado' };
    } else if (type === 'email') {
      response = { message: 'E-mail de encerramento enviado ao cliente.' };
    }

    setTimeout(() => res.json(response), 1500);
  }
}

module.exports = new AiController();