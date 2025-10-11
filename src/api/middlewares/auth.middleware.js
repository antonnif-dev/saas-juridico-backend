const { auth } = require('../../config/firebase.config');

const authMiddleware = (allowedRoles = []) => {
  return async (req, res, next) => {
    console.log('--- Auth Middleware: Iniciando verificação ---');
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send({ message: 'Acesso não autorizado. Token não fornecido.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      console.log('--- Auth Middleware: Token verificado com sucesso! ---');
      req.user = decodedToken;
      
      const userRole = decodedToken.role;
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return res.status(403).send({ message: 'Acesso negado. Permissão insuficiente.' });
      }

      next();
    } catch (error) {
      console.error('!!! ERRO no Auth Middleware:', error);
      return res.status(403).send({ message: 'Token inválido ou expirado.' });
    }
  };
};

module.exports = authMiddleware;