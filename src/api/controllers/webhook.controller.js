const { Receiver } = require('@upstash/qstash');
const { auth } = require('../../config/firebase.config');
const agendaService = require('../../modules/agenda/agenda.service');
const { sendReminderEmail } = require('../../services/email.service'); // O serviço de e-mail que já planejamos

// Configura o 'Receiver' para verificar a autenticidade das chamadas do Upstash
const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
});

class WebhookController {
  async handleQStash(req, res) {
    try {
      // 1. Verifica se a requisição veio mesmo do Upstash (segurança)
      const isValid = await qstashReceiver.verify({
        signature: req.headers['upstash-signature'],
        body: JSON.stringify(req.body), // Verifique se o body-parser está configurado para JSON
      });

      if (!isValid) {
        return res.status(401).send('Assinatura inválida.');
      }

      console.log('Webhook do Upstash recebido com sucesso:', req.body);
      const { compromissoId, userId } = req.body;

      // 2. Busca os detalhes do compromisso e do usuário
      const compromisso = await agendaService.getItemById(compromissoId, userId);
      const userRecord = await auth.getUser(userId);

      if (compromisso && userRecord.email) {
        // 3. Envia o e-mail usando o serviço Resend
        console.log(`Enviando lembrete por e-mail para ${userRecord.email}`);
        await sendReminderEmail(userRecord.email, compromisso);
      }
      
      res.status(200).send('Lembrete processado.');
    } catch (error) {
      console.error('!!! ERRO NO WEBHOOK DO QSTASH:', error);
      res.status(500).send('Erro ao processar o lembrete.');
    }
  }
}

module.exports = new WebhookController();