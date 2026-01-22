const agendaService = require('../../modules/agenda/agenda.service');
const { db } = require('../../config/firebase.config');

class AgendaController {
  async create(req, res) {
    try {
      const newItem = await agendaService.createItem(req.body, req.user.uid);
      res.status(201).json(newItem);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao criar compromisso.', error: error.message });
    }
  }

  // helpers
  _tsToIso(value) {
    try {
      if (!value) return null;
      if (typeof value === 'string') return value;
      if (value.toDate) return value.toDate().toISOString();
      return null;
    } catch {
      return null;
    }
  }

  _formatItem(item) {
    return {
      ...item,
      dataHora: this._tsToIso(item.dataHora),
      createdAt: this._tsToIso(item.createdAt),
      updatedAt: this._tsToIso(item.updatedAt),
    };
  }

  _chunk(arr, size = 10) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  async list(req, res) {
    try {
      if (req.user?.role === 'cliente') {
        const clientUid = req.user?.uid;
        if (!clientUid) return res.status(401).json({ message: 'Não autenticado.' });

        const casesSnap = await db.collection('cases').where('clientId', '==', clientUid).get();
        const caseIds = casesSnap.docs.map((d) => d.id);

        if (caseIds.length === 0) return res.status(200).json([]);

        const chunks = this._chunk(caseIds, 10);
        const all = [];

        for (const chunk of chunks) {
          const agSnap = await db.collection('agenda').where('processoId', 'in', chunk).get();
          agSnap.docs.forEach((d) => all.push({ id: d.id, ...d.data() }));
        }

        all.sort((a, b) => {
          const aMs = a?.dataHora?.toDate ? a.dataHora.toDate().getTime() : 0;
          const bMs = b?.dataHora?.toDate ? b.dataHora.toDate().getTime() : 0;
          return bMs - aMs;
        });

        const formatted = all.map((it) => this._formatItem(it));
        return res.status(200).json(formatted);
      }

      const items = await agendaService.listItemsForUser(req.user);
      const formattedItems = items.map((item) => this._formatItem(item));
      return res.status(200).json(formattedItems);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar compromissos.', error: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const updatedItem = await agendaService.updateItem(id, req.body, req.user.uid);
      res.status(200).json(updatedItem);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await agendaService.deleteItem(id, req.user);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;

      if (req.user?.role === 'cliente') {
        const clientUid = req.user?.uid;
        if (!clientUid) return res.status(401).json({ message: 'Não autenticado.' });

        const ref = db.collection('agenda').doc(id);
        const doc = await ref.get();
        if (!doc.exists) return res.status(404).json({ message: 'Compromisso não encontrado.' });

        const data = { id: doc.id, ...doc.data() };

        if (data.processoId) {
          const caseSnap = await db.collection('cases').doc(data.processoId).get();
          if (!caseSnap.exists) return res.status(404).json({ message: 'Processo não encontrado.' });

          const processo = caseSnap.data();
          if (processo?.clientId !== clientUid) {
            return res.status(403).json({ message: 'Acesso negado.' });
          }
        }

        return res.status(200).json(this._formatItem(data));
      }

      const item = await agendaService.getItemById(id, req.user);
      return res.status(200).json(item);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }
}

module.exports = new AgendaController();