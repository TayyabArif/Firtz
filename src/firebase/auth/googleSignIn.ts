import firebase_app from "../config";
import { signInWithPopup, GoogleAuthProvider, getAuth } from "firebase/auth";

// Get the authentication instance using the Firebase app
const auth = getAuth(firebase_app);

// Create a Google Auth Provider instance with proper configuration
const googleProvider = new GoogleAuthProvider();

// Configure the Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account' // Force account selection each time
});

// Add scopes if needed (default scopes include profile and email)
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Function to sign in with Google
export default async function googleSignIn() {
  let result = null, // Variable to store the sign-in result
    error = null; // Variable to store any error that occurs

  try {
    result = await signInWithPopup(auth, googleProvider); // Sign in with Google popup
    console.log('✅ Google sign-in successful:', {
      email: result.user.email,
      displayName: result.user.displayName,
      uid: result.user.uid,
      projectId: firebase_app.options.projectId
    });
  } catch (e: any) {
    error = e; // Catch and store any error that occurs during sign-in
    console.error('❌ Google sign-in error:', {
      code: e.code,
      message: e.message,
      projectId: firebase_app.options.projectId
    });
  }

  return { result, error }; // Return the sign-in result and error (if any)
} 