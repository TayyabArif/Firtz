# 🔐 Firebase Authentication Setup Guide

## ❌ Error: CONFIGURATION_NOT_FOUND

If you're seeing the error:
```json
{
  "error": {
    "code": 400,
    "message": "CONFIGURATION_NOT_FOUND"
  }
}
```

This means **Email/Password authentication is not enabled** in your Firebase project.

## ✅ Solution: Enable Email/Password Authentication

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`fritz-da59f`)

### Step 2: Enable Email/Password Authentication
1. Click on **Authentication** in the left sidebar
2. Click on the **Sign-in method** tab
3. Find **Email/Password** in the list of providers
4. Click on **Email/Password**
5. Toggle **Enable** to ON
6. Click **Save**

### Step 3: Enable Google Sign-In (Optional but Recommended)
1. Still in **Sign-in method** tab
2. Find **Google** in the list
3. Click on **Google**
4. Toggle **Enable** to ON
5. Enter a **Project support email** (your email)
6. Click **Save**

### Step 4: Verify Your Configuration
Make sure your `.env.local` file has the correct Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC51FfGX64bKF6zhv6nrSgfVE-UON-tWtU
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fritz-da59f.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fritz-da59f
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fritz-da59f.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=856634999670
NEXT_PUBLIC_FIREBASE_APP_ID=1:856634999670:web:aebb9933a2c90df805f057
```

### Step 5: Restart Your Development Server
After enabling authentication, restart your Next.js server:

```bash
# Stop the server (Ctrl+C) and restart:
npm run dev
```

## 🔍 Additional Troubleshooting

### Check Firebase Project Status
1. Go to Firebase Console > Project Settings
2. Verify your project is active and not suspended
3. Check that billing is enabled (if required for your plan)

### Verify API Key
1. Go to Firebase Console > Project Settings > General
2. Scroll to "Your apps" section
3. Verify the API key matches your `.env.local` file

### Check Browser Console
Open browser DevTools (F12) and check the Console tab for detailed error messages.

### Common Issues

#### Issue: "auth/operation-not-allowed"
- **Solution**: Enable Email/Password in Firebase Console > Authentication > Sign-in method

#### Issue: "auth/invalid-api-key"
- **Solution**: Verify your API key in `.env.local` matches Firebase Console
- Make sure the file is UTF-8 encoded (not UTF-16)

#### Issue: "auth/network-request-failed"
- **Solution**: Check your internet connection
- Verify Firebase services are accessible

## 📚 Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Enable Email/Password Authentication](https://firebase.google.com/docs/auth/web/password-auth)
- [Firebase Console](https://console.firebase.google.com/)

## ✅ Verification Checklist

- [ ] Email/Password authentication is enabled in Firebase Console
- [ ] Google Sign-In is enabled (optional)
- [ ] `.env.local` file has all Firebase configuration variables
- [ ] `.env.local` file is UTF-8 encoded
- [ ] Development server has been restarted
- [ ] Browser console shows no errors

After completing these steps, try signing up again!

