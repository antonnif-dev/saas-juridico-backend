// src/modules/auth/auth.repository.js

const { auth, db } = require("../../config/firebase.config");

class AuthRepository {

  async createUserInAuth(email, password) {
    return auth.createUser({ email, password });
  }

  async setUserRole(uid, role) {
    return auth.setCustomUserClaims(uid, { role });
  }

  async saveUserToTenant(tenantId, userData) {
    const userRef = db
      .collection("tenants")
      .doc(tenantId)
      .collection("users")
      .doc(userData.uid);

    await userRef.set(userData);

    return userData;
  }

  async getUserById(tenantId, uid) {
    const doc = await db
      .collection("tenants")
      .doc(tenantId)
      .collection("users")
      .doc(uid)
      .get();

    return doc.exists ? doc.data() : null;
  }
}

module.exports = new AuthRepository();