// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase configuration
if (!firebaseConfig.apiKey) {
  console.error('❌ Firebase Error: NEXT_PUBLIC_FIREBASE_API_KEY is missing. Please check your .env.local file.');
  throw new Error('Firebase API key is missing. Please set NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file.');
}

if (!firebaseConfig.projectId) {
  console.error('❌ Firebase Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing. Please check your .env.local file.');
  throw new Error('Firebase Project ID is missing. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env.local file.');
}

// Initialize Firebase
let firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore
export const db = getFirestore(firebase_app);

// This line exports the initialized Firebase app instance as the default export of this module.
// By doing so, other parts of the application can import this file and use the Firebase app instance directly.
export default firebase_app;