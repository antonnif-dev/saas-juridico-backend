const clientService = require('../../modules/client/client.service');
const processoService = require('../../modules/case/case.service');
const { db } = require('../../config/firebase.config');

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

      // Reaproveita a regra de permissão/ownership do seu service
      const processo = await processoService.getCaseById(id, req.user);

      return res.status(200).json(processo);
    } catch (error) {
      const statusCode = error.message?.includes('Acesso não permitido') ? 403 : 404;
      return res.status(statusCode).json({ message: error.message || 'Erro ao buscar detalhes do processo.' });
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

  async getMyPreAtendimentos(req, res) {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) return res.status(401).json({ message: 'Não autenticado.' });

      const svc = getPreAtendimentoServiceSafely();
      if (svc?.getByClientId) {
        const items = await svc.getByClientId(clientId);
        return res.status(200).json(items || []);
      }

      if (!db) {
        return res.status(500).json({
          message:
            'DB não disponível. Verifique ../../config/firebase.config (export { db }).',
        });
      }

      const snap = await db
        .collection('preatendimentos')
        .where('clientId', '==', clientId)
        .orderBy('createdAt', 'desc')
        .get();

      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return res.status(200).json(items);
    } catch (err) {
      console.error('getMyPreAtendimentos error:', err);
      return res.status(500).json({ message: 'Erro ao buscar atendimentos do cliente.' });
    }
  }

  async getPreAtendimentoById(req, res) {
    try {
      const clientId = req.user?.clientId;
      const { id } = req.params;
      if (!clientId) return res.status(401).json({ message: 'Não autenticado.' });

      const svc = getPreAtendimentoServiceSafely();
      if (svc?.getById) {
        const item = await svc.getById(id);
        if (!item) return res.status(404).json({ message: 'Atendimento não encontrado.' });
        if (item.clientId && item.clientId !== clientId) {
          return res.status(403).json({ message: 'Acesso negado.' });
        }
        return res.status(200).json(item);
      }

      if (!db) {
        return res.status(500).json({
          message:
            'DB não disponível. Verifique ../../config/firebase.config (export { db }).',
        });
      }

      const ref = db.collection('preatendimentos').doc(id);
      const doc = await ref.get();

      if (!doc.exists) return res.status(404).json({ message: 'Atendimento não encontrado.' });

      const data = { id: doc.id, ...doc.data() };
      if (data.clientId && data.clientId !== clientId) {
        return res.status(403).json({ message: 'Acesso negado.' });
      }

      return res.status(200).json(data);
    } catch (err) {
      console.error('getPreAtendimentoById error:', err);
      return res.status(500).json({ message: 'Erro ao buscar atendimento.' });
    }
  }

}

module.exports = new PortalController();