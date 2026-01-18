require('dotenv').config();
const { Timestamp } = require('firebase-admin/firestore');
const agendaRepository = require('./agenda.repository');
const { Client } = require("@upstash/qstash");

const processoService = require('../case/case.service');

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

    const newItem = await agendaRepository.create(dataToSave);

    if (itemData.tipo === 'Audiência' && itemData.processoId) {
      try {
        console.log(`Gatilho ativado: Atualizando processo ${itemData.processoId} para 'Aguardando Audiência'`);
        await processoService.updateItem(itemData.processoId, { status: 'Aguardando Audiência' }, userId);
      } catch (e) {
        console.error("Erro ao atualizar status do processo via agenda:", e.message);
      }
    }

    try {
      const dataDoCompromisso = new Date(itemData.dataHora);
      const tempoNotificacao = dataDoCompromisso.getTime() - (1 * 60 * 1000);
      const agora = new Date().getTime();

      if (tempoNotificacao > agora) {
        console.log(`Agendando notificação para o compromisso: ${newItem.id}`);

        const targetUrl = process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/api/notifications/process-agenda`
          : process.env.WEBHOOK_URL;

        if (!targetUrl) {
          throw new Error("URL de destino para o QStash não configurada (BACKEND_URL ou WEBHOOK_URL faltando).");
        }

        const { messageId } = await qstashClient.publishJSON({
          url: targetUrl,
          body: {
            compromissoId: newItem.id,
            userId: userId,
          },
          notBefore: Math.floor(tempoNotificacao / 1000),
        });

        await agendaRepository.update(newItem.id, { qstashMessageId: messageId });
        console.log(`Notificação agendada com sucesso! Message ID: ${messageId}`);
      } else {
        console.warn("A data do compromisso é muito próxima ou já passou. Notificação não agendada.");
      }
    } catch (error) {
      console.error(`!!! FALHA AO AGENDAR NOTIFICAÇÃO NO UPSTASH para o item ${newItem.id}:`, error.message);
    }

    return newItem;
  }

  async updateItem(itemId, dataToUpdate, userId) {
    const item = await agendaRepository.findById(itemId);
    if (!item || item.responsavelUid !== userId) {
      throw new Error('Compromisso não encontrado ou acesso não permitido.');
    }

    if (dataToUpdate.dataHora) {
      if (item.qstashMessageId) {
        try {
          await qstashClient.messages.delete(item.qstashMessageId);
          console.log(`Notificação antiga (${item.qstashMessageId}) cancelada.`);
        } catch (error) {
          console.error('Erro ao cancelar notificação antiga:', error.message);
        }
      }

      const dataDoCompromisso = new Date(dataToUpdate.dataHora);
      const dataDaNotificacao = dataDoCompromisso.getTime() - (1 * 60 * 1000);
      const agora = new Date().getTime();

      if (dataDaNotificacao > agora) {
        const { messageId } = await qstashClient.publishJSON({
          url: process.env.WEBHOOK_URL,
          body: { compromissoId: itemId, userId },
          notBefore: Math.floor(dataDaNotificacao / 1000),
        });
        dataToUpdate.qstashMessageId = messageId;
        console.log(`Nova notificação reagendada! Message ID: ${messageId}`);
      }

      dataToUpdate.dataHora = Timestamp.fromDate(new Date(dataToUpdate.dataHora));
    }

    return await agendaRepository.update(itemId, dataToUpdate);
  }

  async getItemsForUser(userId) {
    const items = await agendaRepository.findByUser(userId);
    return items.sort((a, b) => a.dataHora.seconds - b.dataHora.seconds);
  }

  async listItemsForUser(user) {
    if (user.role === 'cliente') {
      return [];
    }

    const userId = user.uid || user;
    const items = await agendaRepository.findAllByUser(userId);
    return items.sort((a, b) => a.dataHora.seconds - b.dataHora.seconds);
  }

  async getItemById(itemId, user) {
    const userId = user?.uid || user;
    const item = await agendaRepository.findById(itemId);
    if (!item || item.responsavelUid !== userId) {
      throw new Error('Compromisso não encontrado ou acesso não permitido.');
    }
    return item;
  }

  async deleteItem(itemId, user) {
    const userId = user?.uid || user;

    const item = await agendaRepository.findById(itemId);
    if (!item || item.responsavelUid !== userId) {
      throw new Error('Compromisso não encontrado ou acesso não permitido.');
    }

    if (item.qstashMessageId) {
      try {
        await qstashClient.messages.delete(item.qstashMessageId);
        console.log(`Notificação (${item.qstashMessageId}) cancelada antes de excluir.`);
      } catch (error) {
        console.error('Erro ao cancelar notificação antes de excluir:', error.message);
      }
    }

    await agendaRepository.delete(itemId);
    return true;
  }
}
module.exports = new AgendaService();