class UserModel {
  constructor({ uid, name, email, role, tenantId, createdAt }) {
    this.uid = uid;
    this.name = name;
    this.email = email;
    this.role = role;
    this.tenantId = tenantId;
    this.createdAt = createdAt || new Date().toISOString();
  }
}

module.exports = UserModel;