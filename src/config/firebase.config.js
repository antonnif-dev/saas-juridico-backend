require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./saas-juridico-firebase-adminsdk.json');

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  // Em produção (Vercel)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  // Em desenvolvimento local
  serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'saas-juridico-cfb2e.appspot.com'
});

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage().bucket();

module.exports = { db, auth, storage };