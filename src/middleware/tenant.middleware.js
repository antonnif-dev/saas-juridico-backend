module.exports = async function tenantMiddleware(req, res, next) {
  const host =
    req.headers["x-tenant-host"] ||
    req.headers["x-forwarded-host"] ||
    req.hostname;

  let tenant = await findTenantByHost(host); // seu método real

  if (!tenant) {
    const fallback = process.env.DEFAULT_TENANT_ID;
    if (fallback) {
      req.tenantId = fallback;
      return next();
    }
    return res.status(404).json({ message: "Tenant não encontrado para este domínio." });
  }

  req.tenantId = tenant.id;
  next();
};
