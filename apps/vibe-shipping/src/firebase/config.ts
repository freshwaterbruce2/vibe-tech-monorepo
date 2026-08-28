import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration object - all values come from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate that required environment variables are present
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !import.meta.env[envVar]
);

if (missingEnvVars.length > 0) {
  console.warn(
    'Missing Firebase environment variables:',
    missingEnvVars.join(', ')
  );
  console.warn(
    'Firebase services may not work properly. Please check your .env file.'
  );
}

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics only if measurement ID is provided and we're not in development
export const analytics =
  import.meta.env.VITE_FIREBASE_MEASUREMENT_ID &&
  import.meta.env.PROD
    ? getAnalytics(app)
    : null;

// Connect to Firestore emulator in development if configured
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.warn('Connected to Firestore emulator');
  } catch (error) {
    console.warn('Failed to connect to Firestore emulator:', error);
  }
}

// Export the Firebase app instance
export default app;

// Type definitions for Firebase services
export type { User } from 'firebase/auth';
export type {
  DocumentData,
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  FirestoreError
} from 'firebase/firestore';