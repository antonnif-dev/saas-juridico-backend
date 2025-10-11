const caseRepository = require('../case/case.repository');
const agendaRepository = require('../agenda/agenda.repository');
const clientRepository = require('../client/client.repository');

class DashboardService {
  async getSummary(userId) {
    // Busca todos os processos e compromissos do usuário logado
    const [casos, compromissos, clientes] = await Promise.all([
      caseRepository.findAllByOwner(userId),
      agendaRepository.findByUser(userId),
      clientRepository.findAll(), // Busca todos os clientes
    ]);

    // 1. Contar processos ativos
    const processosAtivosCount = casos.filter(
      c => c.status === 'Em andamento' || c.status === 'Suspenso'
    ).length;

    // 2. Filtrar e pegar os próximos 5 compromissos
    const agora = new Date();
    const proximosCompromissos = compromissos
      .filter(c => new Date(c.dataHora.seconds * 1000) >= agora)
      .slice(0, 5); // Pega os 5 primeiros (já estão ordenados por data)

    // 3. Contar total de clientes
    const totalClientesCount = clientes.length;

    // Retorna um único objeto com todos os dados
    return {
      processosAtivosCount,
      proximosCompromissos,
      totalClientesCount,
    };
  }
}

module.exports = new DashboardService();