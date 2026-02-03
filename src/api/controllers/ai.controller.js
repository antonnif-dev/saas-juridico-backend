const aiPreService = require('../../modules/ai/ai.pre.service');
const aiAtendimentoService = require('../../modules/ai/ai.atendimento.service');
const aiPosService = require("../../modules/ai/ai.pos.service");

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

  async atendimentoWhatsApp(req, res) {
    try {
      const processoId = req.body?.processoId;
      if (!processoId) return res.status(400).json({ error: 'processoId é obrigatório.' });

      const result = await aiAtendimentoService.mensagemCobrancaWhatsApp({ processoId, user: req.user });
      if (!result) return res.status(404).json({ error: 'Processo não encontrado.' });

      return res.json(result);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao gerar mensagem.' });
    }
  }

  async salvarMinuta(req, res) {
    try {
      const processoId = req.body?.processoId;
      const minuta = req.body?.minuta;
      const tom = req.body?.tom || 'Objetivo e técnico';
      if (!processoId || !minuta) return res.status(400).json({ error: 'processoId e minuta são obrigatórios.' });

      const result = await aiAtendimentoService.salvarMinuta({ processoId, user: req.user, minuta, tom });
      if (!result) return res.status(404).json({ error: 'Processo não encontrado.' });

      return res.json(result);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao salvar minuta.' });
    }
  }

  async regenerarMinuta(req, res) {
    try {
      const processoId = req.body?.processoId;
      const tom = req.body?.tom || 'Mais Formal';
      if (!processoId) return res.status(400).json({ error: 'processoId é obrigatório.' });

      const result = await aiAtendimentoService.regenerarMinuta({ processoId, user: req.user, tom });
      if (!result) return res.status(404).json({ error: 'Processo não encontrado.' });

      return res.json(result);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao regenerar minuta.' });
    }
  }

  async baixarPdf(req, res) {
    try {
      const processoId = req.body?.processoId;
      const tom = req.body?.tom || 'Objetivo e técnico';
      if (!processoId) return res.status(400).json({ error: 'processoId é obrigatório.' });

      const pdf = await aiAtendimentoService.baixarPdf({ processoId, user: req.user, tom });
      if (!pdf) return res.status(404).json({ error: 'Processo não encontrado.' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
      return res.send(pdf.buffer);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao gerar PDF.' });
    }
  }

  async exportarZip(req, res) {
    try {
      const processoId = req.body?.processoId;
      const tom = req.body?.tom || 'Objetivo e técnico';
      if (!processoId) return res.status(400).json({ error: 'processoId é obrigatório.' });

      const zip = await aiAtendimentoService.exportarZip({ processoId, user: req.user, tom });
      if (!zip) return res.status(404).json({ error: 'Processo não encontrado.' });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zip.filename}"`);
      return res.send(zip.buffer);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao exportar ZIP.' });
    }
  }

  async executarAtendimento(req, res) {
    try {
      const processoId = req.body?.processoId;
      const tom = req.body?.tom || 'Objetivo e Contundente';
      if (!processoId) return res.status(400).json({ error: 'processoId é obrigatório.' });

      const pack = await aiAtendimentoService.executar({ processoId, user: req.user, tom });
      if (!pack) return res.status(404).json({ error: 'Processo não encontrado.' });

      return res.json(pack.result); // <- exatamente o que o frontend usa
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao executar IA.' });
    }
  }

  async atendimentoWhatsApp(req, res) {
    try {
      const processoId = req.body?.processoId;
      if (!processoId) return res.status(400).json({ error: 'processoId é obrigatório.' });

      const result = await aiAtendimentoService.gerarWhatsApp({ processoId, user: req.user });
      if (!result) return res.status(404).json({ error: 'Processo não encontrado.' });

      return res.json(result);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao gerar mensagem.' });
    }
  }

  async atendimentoPdf(req, res) {
    try {
      const processoId = req.body?.processoId;
      const tom = req.body?.tom || 'Objetivo e Contundente';
      if (!processoId) return res.status(400).json({ error: 'processoId é obrigatório.' });

      const pdf = await aiAtendimentoService.gerarPdfBuffer({ processoId, user: req.user, tom });
      if (!pdf) return res.status(404).json({ error: 'Processo não encontrado.' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
      return res.send(pdf.buffer);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao gerar PDF.' });
    }
  }

  async atendimentoExportar(req, res) {
    try {
      const processoId = req.body?.processoId;
      const tom = req.body?.tom || 'Objetivo e Contundente';
      if (!processoId) return res.status(400).json({ error: 'processoId é obrigatório.' });

      const zip = await aiAtendimentoService.gerarZipBuffer({ processoId, user: req.user, tom });
      if (!zip) return res.status(404).json({ error: 'Processo não encontrado.' });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zip.filename}"`);
      return res.send(zip.buffer);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Erro ao exportar.' });
    }
  }

  async posAnalisarSentenca(req, res) {
    try {
      const processoId = req.body?.processoId;
      if (!processoId) return res.status(400).json({ error: "processoId é obrigatório." });

      const r = await aiPosService.analisarSentenca({ processoId, user: req.user });
      if (!r) return res.status(404).json({ error: "Processo não encontrado." });
      if (r.error) return res.status(400).json(r);

      return res.json(r);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Erro ao analisar sentença." });
    }
  }

  async posTradutorCliente(req, res) {
    try {
      const processoId = req.body?.processoId;
      if (!processoId) return res.status(400).json({ error: "processoId é obrigatório." });

      const r = await aiPosService.tradutorCliente({ processoId, user: req.user });
      if (!r) return res.status(404).json({ error: "Processo não encontrado." });

      return res.json(r);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Erro no tradutor." });
    }
  }

  async posRelatorioMensal(req, res) {
    try {
      const processoId = req.body?.processoId;
      if (!processoId) return res.status(400).json({ error: "processoId é obrigatório." });

      const r = await aiPosService.relatorioMensal({ processoId, user: req.user });
      if (!r) return res.status(404).json({ error: "Processo não encontrado." });

      return res.json(r);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Erro no relatório." });
    }
  }

  async posEstrategiaRecursal(req, res) {
    try {
      const processoId = req.body?.processoId;
      if (!processoId) return res.status(400).json({ error: "processoId é obrigatório." });

      const r = await aiPosService.estrategiaRecursal({ processoId, user: req.user });
      if (!r) return res.status(404).json({ error: "Processo não encontrado." });
      if (r.error) return res.status(400).json(r);

      return res.json(r);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Erro na estratégia." });
    }
  }

  async posDatajudVisual(req, res) {
    try {
      const processoId = req.body?.processoId;
      if (!processoId) return res.status(400).json({ error: "processoId é obrigatório." });

      const r = await aiPosService.consultaDatajudVisual({ processoId, user: req.user });
      if (!r) return res.status(404).json({ error: "Processo não encontrado." });

      return res.json(r);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Erro na consulta visual." });
    }
  }

  async posMinutarRecurso(req, res) {
    try {
      const processoId = req.body?.processoId;
      if (!processoId) return res.status(400).json({ error: "processoId é obrigatório." });

      const r = await aiPosService.minutarRecurso({ processoId, user: req.user });
      if (!r) return res.status(404).json({ error: "Processo não encontrado." });
      if (r.error) return res.status(400).json(r);

      return res.json(r);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Erro ao minutar." });
    }
  }

  async posPdf(req, res) {
    try {
      const titulo = req.body?.titulo;
      const conteudo = req.body?.conteudo;
      if (!titulo || !conteudo) return res.status(400).json({ error: "titulo e conteudo são obrigatórios." });

      const pdf = await aiPosService.pdfFromResult({ titulo, conteudo });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${pdf.filename}"`);
      return res.send(pdf.buffer);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Erro ao gerar PDF." });
    }
  }
}

module.exports = new AiController();