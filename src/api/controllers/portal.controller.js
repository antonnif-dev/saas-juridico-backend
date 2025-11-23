const clientService = require('../../modules/client/client.service');
const processoService = require('../../modules/case/case.service');

class PortalController {
  async getDashboardSummary(req, res) {
    try {
      const clientId = req.user.clientId;
      const client = await clientService.getClientById(clientId);
      const clientCases = await processoService.getCasesByClientId(clientId);

      const summaryData = {
        clientName: client.name,
        activeCasesCount: clientCases.length,
      };

      res.status(200).json(summaryData);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar dados do dashboard.', error: error.message });
    }
  }

  async getMyCases(req, res) {
    try {
      // O clientId já está disponível em req.user graças ao nosso middleware
      const clientId = req.user.clientId;
      
      // Usamos a função de serviço que já criamos para buscar os processos
      const cases = await processoService.getCasesByClientId(clientId);
      
      res.status(200).json(cases);
    } catch (error) {
      console.error("!!! ERRO no PortalController (getMyCases):", error);
      res.status(500).json({ message: 'Erro ao buscar os processos do cliente.' });
    }
  }

  
}

module.exports = new PortalController();