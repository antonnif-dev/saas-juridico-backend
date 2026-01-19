const clientService = require('../../modules/client/client.service');
const processoService = require('../../modules/case/case.service');
const { db } = require('../../config/firebase.config');
//const userService = require('../services/user.service');

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
      const clientId = req.user?.clientId;
      if (!clientId) {
        return res.status(400).json({ message: 'clientId não encontrado no token/usuário. Verifique o auth middleware.' });
      }

      const cases = await processoService.getCasesByClientId(clientId);

      res.status(200).json(cases);
    } catch (error) {
      console.error("!!! ERRO no PortalController (getMyCases):", error);
      res.status(500).json({ message: 'Erro ao buscar os processos do cliente.' });
    }
  }

  async listLawyers(req, res) {
    try {
      const snap = await db.collection("users").where("role", "==", "advogado").get();

      const lawyers = snap.docs.map((doc) => {
        const u = doc.data() || {};
        return {
          id: doc.id,
          uid: u.uid || doc.id,
          name: u.name || u.displayName || u.nome || "Advogado",
          photoUrl: u.photoUrl || u.photoURL || u.avatarUrl || null,
          oab: u.oab || null,
        };
      });

      return res.status(200).json(lawyers);
    } catch (error) {
      console.error("Erro ao buscar advogados (portal):", error);
      return res.status(500).json({ message: "Erro ao buscar advogados." });
    }
  }

  async getMyCaseDetails(req, res) {
    try {
      const { id } = req.params;

      const processo = await processoService.getCaseById(id, req.user);

      return res.status(200).json(processo);
    } catch (error) {
      const statusCode = error.message?.includes('Acesso não permitido') ? 403 : 404;
      return res.status(statusCode).json({ message: error.message || 'Erro ao buscar detalhes do processo.' });
    }
  }
}



module.exports = new PortalController();