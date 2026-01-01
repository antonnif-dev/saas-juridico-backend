const express = require('express');
const { z } = require('zod');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const agendaController = require('../controllers/agenda.controller');

const router = express.Router();

router.get('/teste-leitura-direta', async (req, res) => {
  try {
    const { db } = require('../../config/firebase.config');
    const agendaCollection = db.collection('agenda');

    // A consulta mais simples possível: pegue os 5 primeiros documentos
    const snapshot = await agendaCollection.limit(5).get();

    if (snapshot.empty) {
      return res.status(200).json({
        message: "TESTE BEM-SUCEDIDO, mas a coleção 'agenda' está vazia ou a leitura foi bloqueada por regras.",
        documentosEncontrados: 0,
      });
    }

    const documentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return res.status(200).json({
      message: "TESTE BEM-SUCEDIDO: A leitura da coleção 'agenda' funciona.",
      totalDocumentosEncontrados: snapshot.size,
      primeirosDocumentos: documentos,
    });

  } catch (error) {
    return res.status(500).json({
      message: "TESTE FALHOU: Ocorreu um erro ao tentar ler a coleção.",
      error: error.message,
      stack: error.stack,
    });
  }
});

const createAgendaSchema = z.object({
  body: z.object({
    titulo: z.string({ required_error: 'O título é obrigatório.' }),
    // Apenas validamos que é uma string. O serviço cuidará da conversão para data.
    dataHora: z.string({ required_error: 'A data e hora são obrigatórias.' }),
    tipo: z.enum(['Prazo', 'Audiência', 'Reunião', 'Outro']),
    processoId: z.string({ required_error: 'É obrigatório vincular a um processo.' }),
  })
});

// NOVO SCHEMA PARA ATUALIZAÇÃO (campos opcionais)
const updateAgendaSchema = z.object({
  body: z.object({
    titulo: z.string().optional(),
    dataHora: z.string().optional(),
    tipo: z.enum(['Prazo', 'Audiência', 'Reunião', 'Outro']).optional(),
    processoId: z.string().optional(),
    concluido: z.boolean().optional(),
  })
});

// Protege todas as rotas de agenda
router.get('/', authMiddleware(['administrador', 'advogado', 'cliente']), agendaController.list);
router.use(authMiddleware(['administrador', 'advogado']));

router.post('/', validate(createAgendaSchema), agendaController.create);
router.get('/', agendaController.list);
router.get('/:id', agendaController.getById);
// A rota de atualização agora usa o novo schema
router.put('/:id', validate(updateAgendaSchema), agendaController.update);
router.delete('/:id', agendaController.delete);

module.exports = router;