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
      console.log("=== DEBUG AUTH ===");
      console.log("UID:", decodedToken.uid);
      console.log("CLAIMS COMPLETAS:", decodedToken); // Veja se 'role' aparece aqui
      console.log("ROLE ENCONTRADA:", decodedToken.role);

      // Mapeamos as propriedades do Firebase para o padrão do seu sistema
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.displayName,
        role: decodedToken.role || 'cliente', // Fallback caso a claim não exista
        isAdmin: decodedToken.role === 'administrador'
      };

      const userRole = req.user.role;

      // Verificação de permissões
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