const themeService = require('../../modules/theme/theme.service');

class ThemeController {
  async get(req, res) {
    try {
      const theme = await themeService.getTheme();
      if (!theme) {
        return res.status(404).json({ message: 'Nenhum tema configurado.' });
      }
      res.status(200).json(theme);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar tema.', error: error.message });
    }
  }

  async update(req, res) {
    try {
      const updatedTheme = await themeService.updateTheme(req.body);
      res.status(200).json(updatedTheme);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao atualizar tema.', error: error.message });
    }
  }

  async uploadLogo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
      }
      const result = await themeService.uploadLogo(req.file);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Erro no upload do logo.', error: error.message });
    }
  }
}

module.exports = new ThemeController();