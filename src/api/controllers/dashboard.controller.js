const dashboardService = require('../../modules/dashboard/dashboard.service');

class DashboardController {
  async getSummary(req, res) {
    try {
      const summaryData = await dashboardService.getSummary(req.user.uid);
      res.status(200).json(summaryData);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar dados do dashboard.', error: error.message });
    }
  }
}

module.exports = new DashboardController();