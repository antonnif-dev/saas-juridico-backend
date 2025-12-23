const { db } = require('../../config/firebase.config');
const { auth } = require('../../config/firebase.config');

module.exports = async function requireMessageOwnership(req, res, next) {
  try {
    const { threadId } = req.params;
    const user = req.user;

    const snap = await db.collection('mensagens').doc(threadId).get();
    if (!snap.exists) return res.status(404).json({ message: 'Thread não encontrada.' });

    const data = snap.data();

    // Admin / adv podem tudo
    if (user.role === 'administrador' || user.role === 'advogado') {
      req.thread = data;
      return next();
    }

    // Cliente só pode ver se a thread pertence ao processo dele
    if (user.role === 'cliente' && data.clientId === user.uid) {
      req.thread = data;
      return next();
    }

    return res.status(403).json({ message: 'Acesso não permitido.' });
  } catch (e) {
    return res.status(500).json({ message: 'Erro interno.', error: e.message });
  }
};
