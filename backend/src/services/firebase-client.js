const admin = require('firebase-admin');

let app = null;

function getFirebaseApp() {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

async function sendWebPush({ token, title, body, data = {} }) {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return { configured: false, status: 'logged_only' };
  }

  const response = await admin.messaging().send({
    token,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])),
    webpush: {
      fcmOptions: { link: data.link || '/' },
    },
  });

  return { configured: true, status: 'sent', response };
}

module.exports = {
  sendWebPush,
};
