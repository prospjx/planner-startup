import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("Firebase auth is only available in the browser.");
  }
}

function getFirebaseApp(): FirebaseApp {
  const hasConfig = Object.values(firebaseConfig).every(Boolean);
  if (!hasConfig) {
    throw new Error("Missing Firebase config env vars (NEXT_PUBLIC_FIREBASE_*).");
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function getFirebaseAuth(): Auth {
  ensureBrowser();
  return getAuth(getFirebaseApp());
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function uploadDocument(file: File) {
  const app = getFirebaseApp();
  const storage = getStorage(app);
  const objectRef = ref(storage, `uploads/${Date.now()}-${file.name}`);
  const snapshot = await uploadBytes(objectRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return { storageUrl: url, bytes: snapshot.metadata.size };
}
