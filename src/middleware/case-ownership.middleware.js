const { db } = require("../config/firebase.config");

module.exports.requireCaseOwnership = async (req, res, next) => {
  try {
    const caseId = req.params.id || req.params.processoId;
    const user = req.user;
    const snap = await db.collection("cases").doc(caseId).get();
    if (!snap.exists) {
      return res.status(404).json({ message: "Processo não encontrado." });
    }
    const processo = snap.data();

    // Admin & Advogado sempre podem
    if (["administrador", "advogado"].includes(user.role)) {
      req.processo = processo;
      return next();
    }
    // Cliente pode SOMENTE visualizar processos dele
    if (user.role === "cliente") {
      if (processo.clientId !== user.uid) {
        return res.status(403).json({ message: "Acesso negado a processo de outro cliente." });
      }
      req.processo = processo;
      return next();
    }
    return res.status(403).json({ message: "Acesso negado." });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao validar permissão.", error: error.message });
  }
};
