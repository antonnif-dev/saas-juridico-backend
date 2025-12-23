module.exports.requireSameTenant = (req, res, next) => {
  const resourceTenant = req.resourceTenantId; // definido no controller
  const userTenant = req.user.tenantId;

  if (!resourceTenant || !userTenant || resourceTenant !== userTenant) {
    return res.status(403).json({ message: "Tenant inválido." });
  }

  next();
};