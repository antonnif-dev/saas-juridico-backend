const { db } = require('../../config/firebase.config');
const configCollection = db.collection('configuracao');
const TEMA_DOC_ID = 'tema_global';

class ThemeRepository {
  async getTheme() {
    const doc = await configCollection.doc(TEMA_DOC_ID).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data();
  }

  async updateTheme(themeData) {
    await configCollection.doc(TEMA_DOC_ID).set(themeData, { merge: true });
    return themeData;
  }
}

module.exports = new ThemeRepository();