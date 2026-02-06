require("dotenv").config();
const { auth, db } = require("./src/config/firebase.config");

async function main() {
  const uid = process.argv[2];
  const role = process.argv[3] || "administrador";

  if (!uid) {
    console.log("Uso:");
    console.log("  node set-admin-claim.js <UID> [role]");
    console.log("Exemplo:");
    console.log("  node set-admin-claim.js c6nO2ZibLv09DPTtss2l administrador");
    process.exit(1);
  }

  await auth.setCustomUserClaims(uid, { role });
  
  await db.collection("users").doc(uid).set(
    {
      role,
      updatedAt: new Date(),
    },
    { merge: true }
  );
  const user = await auth.getUser(uid);
  console.log("✅ Custom claims atualizadas para:", uid);
  console.log("Claims atuais:", user.customClaims || {});
  console.log("Role no Firestore (/users/{uid}) atualizado (merge).");

  console.log("\n⚠️ IMPORTANTE:");
  console.log("O usuário precisa DESLOGAR e LOGAR novamente (ou forçar refresh do token).");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro ao setar claim:", err);
  process.exit(1);
});

/* Aplicar role à usuários
node set-admin-claim.js SEU_UID administrador
node set-admin-claim.js SEU_UID superadmin
*/