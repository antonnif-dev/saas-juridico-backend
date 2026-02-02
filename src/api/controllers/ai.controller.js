const preatendimentoService = require('../../modules/preatendimento/preatendimento.service');
const aiPreService = require('../../modules/ai/ai.pre.service');

class AiController {

  async analyzeTriagem(req, res) {
    try {
      const leadId = req.body?.leadId || req.body?.preatendimentoId;
      const persist = !!req.body?.persist;

      if (!leadId || typeof leadId !== 'string') {
        return res.status(400).json({ error: 'leadId (ou preatendimentoId) é obrigatório.' });
      }

      const result = await aiPreService.triagem({ leadId, persist, user: req.user || null });

      if (!result) {
        return res.status(404).json({ error: 'Pré-atendimento não encontrado.' });
      }

      return res.json(result);
    } catch (err) {
      console.error('Erro em analyzeTriagem:', err);
      return res.status(500).json({ error: 'Erro ao gerar triagem.' });
    }
  }

  async generateDraft(req, res) {
    try {
      const leadId = req.body?.leadId || req.body?.preatendimentoId;
      const type = req.body?.type;

      if (!leadId || typeof leadId !== 'string') {
        return res.status(400).json({ error: 'leadId (ou preatendimentoId) é obrigatório.' });
      }

      const result = await aiPreService.draft({ leadId, type });
      if (!result) return res.status(404).json({ error: 'Pré-atendimento não encontrado.' });

      return res.json(result);
    } catch (err) {
      console.error('Erro em generateDraft:', err);
      return res.status(500).json({ error: 'Erro ao gerar draft.' });
    }
  }

  async generateReport(req, res) {
    try {
      const leadId = req.body?.leadId || req.body?.preatendimentoId;
      const type = req.body?.type;

      if (!leadId || typeof leadId !== 'string') {
        return res.status(400).json({ error: 'leadId (ou preatendimentoId) é obrigatório.' });
      }

      const result = await aiPreService.report({ leadId, type });
      if (!result) return res.status(404).json({ error: 'Pré-atendimento não encontrado.' });

      return res.json(result);
    } catch (err) {
      console.error('Erro em generateReport:', err);
      return res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
  }
}

module.exports = new AiController();