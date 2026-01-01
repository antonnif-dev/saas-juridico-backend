const agendaService = require('../../modules/agenda/agenda.service');

class AgendaController {
  async create(req, res) {
    try {
      const newItem = await agendaService.createItem(req.body, req.user.uid);
      res.status(201).json(newItem);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao criar compromisso.', error: error.message });
    }
  }

  async list(req, res) {
  try {
    //const items = await agendaService.getItemsForUser(req.user.uid);
    const items = await agendaService.listItemsForUser(req.user);
    const formattedItems = items.map(item => ({
      ...item,
      dataHora: item.dataHora.toDate().toISOString(),
      createdAt: item.createdAt.toDate().toISOString(),
    }));
    res.status(200).json(formattedItems);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar compromissos.', error: error.message });
  }
}

  // Implemente os controllers para update e delete seguindo o mesmo padrão...
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
      //await agendaService.deleteItem(id, req.user.uid);
      await agendaService.deleteItem(id, req.user);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const item = await agendaService.getItemById(id, req.user.uid);
      res.status(200).json(item);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }
}

module.exports = new AgendaController();