// src/modules/auth/auth.service.js

const authRepository = require("./auth.repository");
const UserModel = require("../../models/user.model");

class AuthService {

  async createUser({ name, email, password, role, tenantId }) {
    
    const firebaseUser = await authRepository.createUserInAuth(email, password);

    await authRepository.setUserRole(firebaseUser.uid, role);

    const userData = new UserModel({
      uid: firebaseUser.uid,
      name,
      email,
      role,
      tenantId,
    });

    return authRepository.saveUserToTenant(tenantId, userData);
  }

  async getUserProfile(tenantId, uid) {
    return authRepository.getUserById(tenantId, uid);
  }
}

module.exports = new AuthService();