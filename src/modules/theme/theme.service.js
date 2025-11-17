const themeRepository = require('./theme.repository');

class ThemeService {
  async getTheme() {
    return await themeRepository.getTheme();
  }

  async updateTheme(themeData) {
    return await themeRepository.updateTheme(themeData);
  }
}

module.exports = new ThemeService();