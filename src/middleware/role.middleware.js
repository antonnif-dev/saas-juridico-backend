module.exports.requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(403).json({ message: "Função do usuário não encontrada." });
    }
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Acesso negado: permissão insuficiente." });
    }
    next();
  };
};
