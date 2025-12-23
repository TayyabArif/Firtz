# 🚀 Project Setup Complete

## ✅ Setup Steps Completed

1. ✓ Dependencies installed (`npm install`)
2. ✓ Environment file created (`.env.local` from `.env.example`)

## 📋 Required Environment Variables

You need to configure the following environment variables in your `.env.local` file. The file has been created for you - just update the placeholder values with your actual credentials.

### 🔥 Firebase Configuration (REQUIRED - Client-side)

These are used for Firebase Authentication and Firestore database:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**How to get these:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Go to Project Settings (gear icon) > General tab
4. Scroll down to "Your apps" section
5. Click on the web app icon (</>) or add a web app
6. Copy the config values

### 🔐 Firebase Admin SDK (REQUIRED - Server-side)

These are used for server-side authentication and Firestore operations:

```env
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**How to get these:**
1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract `client_email` → `FIREBASE_CLIENT_EMAIL`
5. Extract `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and `\n` characters)

**Important:** The private key must be formatted with `\n` instead of actual newlines.

### 🤖 Azure OpenAI (REQUIRED - Primary AI Provider)

```env
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-01
```

**How to get these:**
1. Create an Azure OpenAI resource in Azure Portal
2. Deploy a model (e.g., gpt-4)
3. Get the API key from "Keys and Endpoint" section
4. Get the endpoint URL (format: `https://your-resource-name.openai.azure.com/`)
5. Note your deployment name

### 🌟 Google Gemini (REQUIRED - Fallback AI Provider)

```env
GOOGLE_AI_API_KEY=your_google_ai_api_key
# Alternative name (both work)
GEMINI_API_KEY=your_google_ai_api_key
```

**How to get this:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the API key

### 🔍 Optional AI Providers

#### OpenAI (for ChatGPT Search)
```env
OPENAI_API_KEY=sk-your_openai_api_key
```
Get from: [OpenAI Platform](https://platform.openai.com/api-keys)

#### Perplexity AI
```env
PERPLEXITY_API_KEY=pplx-your_perplexity_api_key
```
Get from: [Perplexity AI](https://www.perplexity.ai/) > API section

#### DataForSEO (for Google AI Overview monitoring)
```env
DATAFORSEO_USERNAME=your_dataforseo_username
DATAFORSEO_PASSWORD=your_dataforseo_password
```
Get from: [DataForSEO](https://dataforseo.com/) account settings

#### SearchFlows API
```env
SFLY_API_Key=your_searchflows_api_key
```

#### SerpBot API
```env
SBOT_API_KEY=your_serpbot_api_key
```

### ⚙️ Application Configuration

```env
NEXT_PUBLIC_APP_NAME="AI Monitor - AIO/AEO/GEO Tool"
NEXT_PUBLIC_APP_VERSION=9.4.0
NODE_ENV=development
```

### 🔗 NextAuth Configuration (if using NextAuth)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

Generate a secret: `openssl rand -base64 32`

### 🔍 Azure Search (Optional - for web search with citations)

```env
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net/
AZURE_SEARCH_INDEX=your-index-name
AZURE_SEARCH_API_KEY=your_search_key
```

## 🎯 Minimum Required Variables

To get started, you **MUST** configure at minimum:

1. **Firebase Client Config** (all 7 `NEXT_PUBLIC_FIREBASE_*` variables)
2. **Firebase Admin** (`FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`)
3. **Azure OpenAI** (all 4 `AZURE_OPENAI_*` variables)
4. **Google AI** (`GOOGLE_AI_API_KEY` or `GEMINI_API_KEY`)

## 🚀 Next Steps

1. **Update `.env.local`** with your actual credentials
2. **Start the development server:**
   ```bash
   npm run dev
   ```
3. **Open your browser:** [http://localhost:3000](http://localhost:3000)

## 🔒 Security Notes

- ⚠️ **Never commit `.env.local`** to version control (it's already in `.gitignore`)
- 🔑 Keep your API keys and Firebase private key secure
- 🔄 Regularly rotate your API keys
- 🌍 Use different environments for development and production

## 🧪 Testing Your Setup

After configuring your environment variables, you can test:

```bash
# Test Firebase Admin setup
node test-firebase-admin.js

# Test user query with authentication
node test-user-query-with-auth.js
```

## 📚 Additional Resources

- **Firebase Setup Guide:** See `AUTHENTICATION_SETUP.md`
- **Environment Variables:** See `ENV_VARIABLES_SETUP.md`
- **Firestore Setup:** See `FIRESTORE_SETUP.md`
- **Troubleshooting:** See `TROUBLESHOOTING.md`

## ❓ Need Help?

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify all required environment variables are set
3. Test individual providers separately
4. Ensure API keys are valid and have sufficient credits/quota

