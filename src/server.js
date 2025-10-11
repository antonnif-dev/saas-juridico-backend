// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// Importa a aplicação Express configurada
const app = require('./app');

// Define a porta. Pega da variável de ambiente ou usa 3001 como padrão.
const PORT = process.env.PORT || 3001;

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});