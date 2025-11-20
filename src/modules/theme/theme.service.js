const themeRepository = require('./theme.repository');

class ThemeService {
  async getTheme() {
    return await themeRepository.getTheme();
  }

  async updateTheme(themeData) {
    return await themeRepository.updateTheme(themeData);
  }

  async uploadLogo(file) {
    const cloudinary = require('../../config/cloudinary.config');
    
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'configuracao/identidade', // Pasta organizada
          public_id: 'logotipo_principal',   // Nome fixo (substitui o anterior ao atualizar)
          overwrite: true,
          tags: ['logotipo', 'identidade_visual'] // Etiquetas solicitadas
        },
        (error, result) => {
          if (error) return reject(error);
          // Retorna a URL segura da imagem
          resolve({ url: result.secure_url });
        }
      );
      uploadStream.end(file.buffer);
    });
  }
}

module.exports = new ThemeService();