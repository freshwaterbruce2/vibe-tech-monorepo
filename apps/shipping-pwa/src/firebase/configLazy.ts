/**
 * Lazy-loaded Firebase configuration
 * This wrapper ensures Firebase is only loaded when authentication or cloud features are needed
 */

let firebaseApp: any = null;
let auth: any = null;
let db: any = null;
let analytics: any = null;

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

async function initializeFirebaseApp() {
  if (firebaseApp) return firebaseApp;

  const { initializeApp } = await import('firebase/app');

  const firebaseConfig: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  // Validate required config
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof FirebaseConfig]);

  if (missingFields.length > 0) {
    console.warn('Firebase integration disabled: Missing required environment variables:', missingFields);
    throw new Error('Firebase configuration incomplete');
  }

  try {
    firebaseApp = initializeApp(firebaseConfig);
    console.warn('Firebase app initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw error;
  }
}

export async function getAuth() {
  if (auth) return auth;

  await initializeFirebaseApp();
  const { getAuth } = await import('firebase/auth');
  auth = getAuth(firebaseApp);

  return auth;
}

export async function getFirestore() {
  if (db) return db;

  await initializeFirebaseApp();
  const { getFirestore, connectFirestoreEmulator } = await import('firebase/firestore');

  db = getFirestore(firebaseApp);

  // Connect to emulator in development if enabled
  if (import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true' && import.meta.env.MODE === 'development') {
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.warn('Connected to Firestore emulator');
    } catch (error) {
      console.warn('Failed to connect to Firestore emulator:', error);
    }
  }

  return db;
}

export async function getAnalytics() {
  if (analytics) return analytics;

  await initializeFirebaseApp();

  // Only initialize analytics in production and if measurement ID is provided
  if (import.meta.env.MODE === 'production' && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
    try {
      const { getAnalytics, isSupported } = await import('firebase/analytics');

      if (await isSupported()) {
        analytics = getAnalytics(firebaseApp);
        console.warn('Firebase Analytics initialized');
      } else {
        console.warn('Firebase Analytics not supported in this environment');
      }
    } catch (error) {
      console.warn('Firebase Analytics initialization failed:', error);
    }
  }

  return analytics;
}

// Re-export Firebase types and utilities that might be needed
export type { User } from 'firebase/auth';

// Lazy-loaded Firebase utilities
export async function getFirebaseUtils() {
  const [
    { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword },
    {
      collection,
      doc,
      getDoc,
      setDoc,
      updateDoc,
      deleteDoc,
      query,
      where,
      orderBy,
      limit,
      getDocs,
      onSnapshot,
      addDoc,
      arrayUnion,
      arrayRemove,
      increment,
      serverTimestamp,
      writeBatch
    }
  ] = await Promise.all([
    import('firebase/auth'),
    import('firebase/firestore')
  ]);

  return {
    // Auth utilities
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,

    // Firestore utilities
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    onSnapshot,
    addDoc,
    arrayUnion,
    arrayRemove,
    increment,
    serverTimestamp,
    writeBatch
  };
}