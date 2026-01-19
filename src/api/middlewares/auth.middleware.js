const { auth, db } = require('../../config/firebase.config');

const authMiddleware = (allowedRoles = []) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send({ message: 'Acesso não autorizado. Token não fornecido.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await auth.verifyIdToken(idToken);

      let userDocData = null;
      try {
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        userDocData = userDoc.exists ? (userDoc.data() || null) : null;
      } catch (e) {
        userDocData = null;
      }

      const resolvedRole = decodedToken.role || userDocData?.role || 'cliente';
      const resolvedClientId =
        userDocData?.clientId ||
        userDocData?.clienteId ||
        userDocData?.client?.id ||
        (resolvedRole === 'cliente' ? decodedToken.uid : undefined);

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.displayName || userDocData?.name,
        role: resolvedRole,
        isAdmin: resolvedRole === 'administrador',
        clientId: resolvedClientId,
        tenantId: userDocData?.tenantId || decodedToken.tenantId || decodedToken.tenant || undefined,
      };

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