const admin = require('firebase-admin');
const serviceAccount = require('./saas-juridico-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'saas-juridico-cfb2e.appspot.com'
});

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage().bucket();

module.exports = { db, auth, storage };