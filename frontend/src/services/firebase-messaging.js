import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

function getFirebaseConfig() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  return Object.values(config).every(Boolean) ? config : null;
}

export async function getAlertPushToken() {
  const config = getFirebaseConfig();
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!config || !vapidKey) {
    return { token: `in-app-${Date.now()}`, channel: 'in_app', reason: 'Firebase config not set' };
  }

  const supported = await isSupported();
  if (!supported || Notification.permission === 'denied') {
    return { token: `in-app-${Date.now()}`, channel: 'in_app', reason: 'Browser notifications unavailable' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { token: `in-app-${Date.now()}`, channel: 'in_app', reason: 'Notification permission not granted' };
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const app = initializeApp(config);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    return { token, channel: 'web_push', reason: '' };
  } catch (err) {
    return { token: `in-app-${Date.now()}`, channel: 'in_app', reason: err.message };
  }
}
