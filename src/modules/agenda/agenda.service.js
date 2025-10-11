require('dotenv').config();
const { Timestamp } = require('firebase-admin/firestore');
const agendaRepository = require('./agenda.repository');
const { Client } = require("@upstash/qstash");

// Inicializa o cliente do QStash com seu token do .env
const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN,
});

class AgendaService {
  async createItem(itemData, userId) {
    const dataToSave = {
      ...itemData,
      dataHora: Timestamp.fromDate(new Date(itemData.dataHora)),
      responsavelUid: userId,
      concluido: false,
      createdAt: new Date(),
    };

    // 1. Cria o compromisso no seu banco de dados
    const newItem = await agendaRepository.create(dataToSave);

    // 2. Agenda a notificação por e-mail com o Upstash
    try {
      const dataDoCompromisso = new Date(itemData.dataHora);

      // Mudei para 1 minuto antes para facilitar os testes. 
      // Lembre-se de voltar para (24 * 60 * 60 * 1000) para 24h.
      const dataDaNotificacao = dataDoCompromisso.getTime() - (1 * 60 * 1000);
      const agora = new Date().getTime();

      if (dataDaNotificacao > agora) {
        console.log(`Agendando notificação para o compromisso: ${newItem.id}`);

        const { messageId } = await qstashClient.publishJSON({
          url: process.env.WEBHOOK_URL,
          body: {
            compromissoId: newItem.id,
            userId: userId,
          },
          notBefore: Math.floor(dataDaNotificacao / 1000),
        });

        // Opcional, mas recomendado: Salva o ID da mensagem agendada no compromisso.
        // Isso nos permitirá cancelar a notificação se o evento for alterado.
        await agendaRepository.update(newItem.id, { qstashMessageId: messageId });
        console.log(`Notificação agendada com sucesso! Message ID: ${messageId}`);
      }
    } catch (error) {
      console.error('!!! FALHA AO AGENDAR NOTIFICAÇÃO NO UPSTASH:', error);
    }

    return newItem;
  }

  async updateItem(itemId, dataToUpdate, userId) {
    const item = await agendaRepository.findById(itemId);
    if (!item || item.responsavelUid !== userId) {
      throw new Error('Compromisso não encontrado ou acesso não permitido.');
    }

    // Se a data do compromisso for alterada, precisamos reagendar a notificação
    if (dataToUpdate.dataHora) {
      // Cancela a notificação antiga, se existir
      if (item.qstashMessageId) {
        try {
          await qstashClient.messages.delete(item.qstashMessageId);
          console.log(`Notificação antiga (${item.qstashMessageId}) cancelada.`);
        } catch (error) {
          console.error('Erro ao cancelar notificação antiga:', error.message);
        }
      }

      // Agenda a nova notificação
      const dataDoCompromisso = new Date(dataToUpdate.dataHora);
      const dataDaNotificacao = dataDoCompromisso.getTime() - (1 * 60 * 1000); // 1 minuto antes
      const agora = new Date().getTime();

      if (dataDaNotificacao > agora) {
        const { messageId } = await qstashClient.publishJSON({
          url: process.env.WEBHOOK_URL,
          body: { compromissoId: itemId, userId },
          notBefore: Math.floor(dataDaNotificacao / 1000),
        });
        // Salva o ID da nova notificação
        dataToUpdate.qstashMessageId = messageId;
        console.log(`Nova notificação reagendada! Message ID: ${messageId}`);
      }

      // Converte a string de data para Timestamp do Firestore
      dataToUpdate.dataHora = Timestamp.fromDate(new Date(dataToUpdate.dataHora));
    }

    return await agendaRepository.update(itemId, dataToUpdate);
  }
  /*
    async getItemsForUser(userId) {
      return await agendaRepository.findByUser(userId);
    }
  }
  */
 
  async getItemsForUser(userId) {
    const items = await agendaRepository.findByUser(userId);
    // Ordena os resultados em JavaScript
    return items.sort((a, b) => a.dataHora.seconds - b.dataHora.seconds);
  }

  async listItemsForUser(userId) {
    const items = await agendaRepository.findAllByUser(userId);
    return items.sort((a, b) => a.dataHora.seconds - b.dataHora.seconds);
  }

  async getItemById(itemId, userId) {
    const item = await agendaRepository.findById(itemId);
    // Trava de segurança
    if (!item || item.responsavelUid !== userId) {
      throw new Error('Compromisso não encontrado ou acesso não permitido.');
    }
    return item;
  }
}
module.exports = new AgendaService();