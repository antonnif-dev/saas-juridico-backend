// src/api/middlewares/auth.middleware.js
const { auth } = require('../../config/firebase.config');

const authMiddleware = (allowedRoles = []) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send({ message: 'Acesso não autorizado. Token não fornecido.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await auth.verifyIdToken(idToken);

      const role = (decodedToken.role || 'cliente').toLowerCase();

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.displayName,
        role,
        isAdmin: role === 'administrador',
        clientId: role === 'cliente' ? decodedToken.uid : null,
      };

      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        return res.status(403).send({ message: 'Acesso negado. Permissão insuficiente.' });
      }

      next();
    } catch (error) {
      console.error('!!! ERRO no Auth Middleware:', error);
      return res.status(403).send({ message: 'Token inválido ou expirado.' });
    }
  };
};

const optionalAuthMiddleware = () => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Se não tem token, segue como público
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await auth.verifyIdToken(idToken);

      const role = (decodedToken.role || 'cliente').toLowerCase();

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.displayName,
        role,
        isAdmin: role === 'administrador',
        clientId: role === 'cliente' ? decodedToken.uid : null,
      };

      return next();
    } catch (error) {
      console.error('!!! ERRO no Optional Auth Middleware:', error);
      return res.status(403).send({ message: 'Token inválido ou expirado.' });
    }
  };
};

module.exports = authMiddleware;
module.exports.optional = optionalAuthMiddleware;