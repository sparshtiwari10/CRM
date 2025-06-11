# Firebase Hosting Deployment Guide - AGV Cable TV Management System

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Project Setup](#firebase-project-setup)
3. [Local Environment Configuration](#local-environment-configuration)
4. [Firebase CLI Installation](#firebase-cli-installation)
5. [Project Configuration](#project-configuration)
6. [Build and Deploy Process](#build-and-deploy-process)
7. [Environment Variables](#environment-variables)
8. [Custom Domain Setup](#custom-domain-setup)
9. [Security Rules Deployment](#security-rules-deployment)
10. [Continuous Deployment](#continuous-deployment)
11. [Monitoring and Analytics](#monitoring-and-analytics)
12. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying to Firebase Hosting, ensure you have:

- **Node.js 18+** installed on your system
- **npm** or **yarn** package manager
- **Git** for version control
- **Firebase account** (Google account)
- **Project dependencies** installed (`npm install`)

### System Requirements

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Verify project builds locally
npm run build
```

## Firebase Project Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** or **"Add project"**
3. Enter project name: `agv-cable-tv-system` (or your preferred name)
4. Configure Google Analytics (optional but recommended)
5. Wait for project creation to complete

### 2. Enable Required Services

#### Authentication Setup

1. In Firebase Console, go to **Authentication → Sign-in method**
2. Enable **Email/Password** authentication
3. Add authorized domains if needed

#### Firestore Database Setup

1. Go to **Firestore Database → Create database**
2. Choose **Start in production mode** (security rules will be deployed)
3. Select your preferred location (closest to your users)

#### Hosting Setup

1. Go to **Hosting → Get started**
2. Follow the initial setup (we'll configure via CLI)

### 3. Get Firebase Configuration

1. Go to **Project Settings → General**
2. Scroll down to **Your apps**
3. Click **Add app → Web app**
4. Enter app name: `AGV Cable TV System`
5. **Enable Firebase Hosting** (check the box)
6. Copy the configuration object:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
};
```

## Local Environment Configuration

### 1. Create Environment File

Create `.env` file in the project root:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id

# Environment
VITE_NODE_ENV=production
```

### 2. Update Firebase Configuration

Update `src/lib/firebase.ts` with your configuration:

```typescript
// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
```

## Firebase CLI Installation

### 1. Install Firebase CLI

```bash
# Install globally via npm
npm install -g firebase-tools

# Verify installation
firebase --version
```

### 2. Login to Firebase

```bash
# Login to your Firebase account
firebase login

# Verify login
firebase projects:list
```

### 3. Initialize Firebase in Project

```bash
# Navigate to your project directory
cd path/to/agv-cable-tv-system

# Initialize Firebase
firebase init
```

#### Firebase Init Configuration

When running `firebase init`, select:

1. **Features to set up:**

   - ✅ Firestore: Deploy rules and create indexes
   - ✅ Hosting: Configure files for Firebase Hosting
   - ❌ Functions (not needed for this project)
   - ❌ Storage (not currently used)

2. **Firestore Setup:**

   - Use existing `firestore.rules` file
   - Use existing `firestore.indexes.json` file

3. **Hosting Setup:**
   - **Public directory:** `dist` (Vite build output)
   - **Configure as SPA:** Yes
   - **Set up automatic builds:** No (we'll do this manually)
   - **File overwrites:** No (keep existing files)

## Project Configuration

### 1. Firebase Configuration File

Ensure your `firebase.json` looks like this:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|jsx|ts|tsx)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(css|scss)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### 2. Build Configuration

Update `vite.config.ts` for production optimization:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false, // Disable for production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
        },
      },
    },
  },
});
```

## Build and Deploy Process

### 1. Pre-deployment Checklist

```bash
# 1. Install dependencies
npm install

# 2. Run type checking
npm run typecheck

# 3. Run tests (if available)
npm test

# 4. Build the project
npm run build

# 5. Test build locally (optional)
npx serve dist
```

### 2. Deploy Security Rules First

```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

### 3. Deploy to Firebase Hosting

```bash
# Build and deploy in one command
npm run firebase:deploy

# Or manually
npm run build
firebase deploy --only hosting
```

### 4. Deploy Everything

```bash
# Deploy hosting, rules, and indexes together
firebase deploy
```

### 5. Verify Deployment

After successful deployment:

1. **Check Console Output** for hosting URL
2. **Visit the URL** to verify the app loads
3. **Test Authentication** with your admin credentials
4. **Check Firebase Console** for any errors

Example successful output:

```bash
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project-id/overview
Hosting URL: https://your-project-id.web.app
```

## Environment Variables

### 1. Production Environment Variables

For Firebase Hosting, environment variables are built into the application during build time. Ensure your `.env` file contains:

```bash
# Production Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyExample123...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Application Settings
VITE_NODE_ENV=production
VITE_APP_VERSION=1.0.0
```

### 2. Environment Variable Security

⚠️ **Important Security Notes:**

- **API Keys:** Firebase API keys for web apps are safe to expose (they identify your project)
- **Sensitive Data:** Never put sensitive server keys in frontend environment variables
- **Firestore Security:** All security is handled by Firestore rules, not environment variables

### 3. Multiple Environments

For different environments (staging, production):

```bash
# Create environment-specific files
.env.development    # Local development
.env.staging       # Staging environment
.env.production    # Production environment
```

## Custom Domain Setup

### 1. Add Custom Domain

1. Go to **Firebase Console → Hosting**
2. Click **Add custom domain**
3. Enter your domain: `agv-cable-tv.com`
4. Follow verification steps

### 2. DNS Configuration

Add these DNS records to your domain provider:

```
Type: A
Name: @ (or your domain)
Value: [Firebase IP addresses provided]

Type: TXT
Name: @ (or your domain)
Value: [Verification string provided by Firebase]
```

### 3. SSL Certificate

Firebase automatically provisions SSL certificates for custom domains. This may take up to 24 hours.

### 4. Redirect Setup

Configure redirects in `firebase.json`:

```json
{
  "hosting": {
    "redirects": [
      {
        "source": "/old-path",
        "destination": "/new-path",
        "type": 301
      }
    ]
  }
}
```

## Security Rules Deployment

### 1. Firestore Security Rules

Ensure your `firestore.rules` file is properly configured:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function isAdmin() {
      return isAuthenticated() && getUserDoc().data.role == "admin";
    }

    function canAccessArea(area) {
      let userData = getUserDoc().data;
      return isAdmin() ||
             userData.collector_name == area ||
             (userData.assigned_areas != null && area in userData.assigned_areas);
    }

    function isActiveUser() {
      return isAuthenticated() && getUserDoc().data.is_active == true;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow read, write: if isAdmin();
      allow create: if isAuthenticated() && request.auth.uid == userId;
    }

    // Customers collection
    match /customers/{customerId} {
      allow read, write: if isAdmin() && isActiveUser();
      allow read, write: if isAuthenticated() &&
                          isActiveUser() &&
                          canAccessArea(resource.data.collectorName);
    }

    // Add other collections as needed...
  }
}
```

### 2. Deploy Rules

```bash
# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Test rules in Firebase Console
# Go to Firestore → Rules → Rules playground
```

### 3. Rules Testing

Test your security rules:

1. **Firebase Console → Firestore → Rules**
2. **Click "Rules playground"**
3. **Test different scenarios:**
   - Admin user accessing all data
   - Employee accessing only assigned areas
   - Unauthenticated access (should be denied)

## Continuous Deployment

### 1. GitHub Actions Setup

Create `.github/workflows/firebase-hosting.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run typecheck

      - name: Build project
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: your-project-id
```

### 2. GitHub Secrets

Add these secrets to your GitHub repository:

1. **Go to:** Repository → Settings → Secrets and variables → Actions
2. **Add secrets:**
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `FIREBASE_SERVICE_ACCOUNT` (JSON key from Firebase)

### 3. Firebase Service Account

1. **Firebase Console → Project Settings → Service accounts**
2. **Generate new private key**
3. **Copy the entire JSON content**
4. **Add as `FIREBASE_SERVICE_ACCOUNT` secret in GitHub**

## Monitoring and Analytics

### 1. Firebase Analytics

Add Google Analytics to your project:

```typescript
// src/lib/firebase.ts
import { getAnalytics } from "firebase/analytics";

// Initialize Analytics
export const analytics = getAnalytics(app);
```

### 2. Performance Monitoring

```bash
# Install Performance SDK
npm install firebase/performance

# Add to your app
import { getPerformance } from "firebase/performance";
const perf = getPerformance(app);
```

### 3. Error Monitoring

Implement error tracking:

```typescript
// src/utils/errorTracking.ts
import { getAuth } from "firebase/auth";

export const logError = (error: Error, context?: string) => {
  console.error(`[${context}] Error:`, error);

  // Log to Firebase or external service
  // You can integrate with services like Sentry here
};
```

### 4. Usage Analytics

Monitor your application usage:

1. **Firebase Console → Analytics**
2. **Set up conversion events**
3. **Monitor user engagement**
4. **Track feature usage**

## Troubleshooting

### Common Deployment Issues

#### 1. Build Failures

**Problem:** `npm run build` fails

**Solutions:**

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run typecheck

# Check for environment variables
cat .env
```

#### 2. Firebase CLI Issues

**Problem:** `firebase deploy` fails

**Solutions:**

```bash
# Re-login to Firebase
firebase logout
firebase login

# Check project association
firebase use --add

# Verify permissions
firebase projects:list
```

#### 3. Environment Variable Issues

**Problem:** App loads but Firebase connection fails

**Solutions:**

```bash
# Verify environment variables are loaded
npm run build
# Check that dist/assets/index-*.js contains your config

# Test Firebase connection locally
npm run dev
# Open browser console and check for Firebase errors
```

#### 4. Security Rules Issues

**Problem:** "Missing or insufficient permissions" errors

**Solutions:**

```bash
# Deploy rules
firebase deploy --only firestore:rules

# Test rules in console
# Firebase Console → Firestore → Rules → Rules playground

# Check user authentication state
# Browser console → Application → LocalStorage → Firebase Auth
```

#### 5. Hosting Issues

**Problem:** App shows 404 or doesn't load

**Solutions:**

```bash
# Check firebase.json rewrites
cat firebase.json

# Verify build output
ls -la dist/

# Check hosting configuration
firebase hosting:sites:list
```

### 6. Performance Issues

**Problem:** Slow loading times

**Solutions:**

```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Optimize images
# Use WebP format for images
# Implement lazy loading

# Enable compression in firebase.json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=3600"
          }
        ]
      }
    ]
  }
}
```

### Debug Commands

```bash
# Firebase debug info
firebase --debug deploy

# Check Firebase project status
firebase use
firebase projects:list

# Validate firebase.json
firebase serve --host 0.0.0.0 --port 5000

# Check hosting status
firebase hosting:sites:list
firebase hosting:channels:list

# Local testing
npm run build
firebase serve
```

### Getting Help

1. **Firebase Documentation:** https://firebase.google.com/docs/hosting
2. **Firebase Console Logs:** Check deployment logs in Firebase Console
3. **Browser Console:** Check for JavaScript errors
4. **Network Tab:** Monitor failed requests
5. **Firebase Support:** Use Firebase support for complex issues

---

## Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Firebase project created and configured
- [ ] Security rules updated
- [ ] Local build successful (`npm run build`)
- [ ] TypeScript compilation successful (`npm run typecheck`)

### Deployment

- [ ] Security rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Application deployed (`firebase deploy --only hosting`)
- [ ] Deployment URL accessible
- [ ] Authentication working
- [ ] Database connections working

### Post-Deployment

- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Analytics configured
- [ ] Error monitoring set up
- [ ] Performance monitoring enabled
- [ ] Backup and monitoring procedures established

### Production Maintenance

- [ ] Regular security rule reviews
- [ ] Monitoring deployment logs
- [ ] Database usage monitoring
- [ ] Performance optimization
- [ ] User feedback integration

---

## Conclusion

Your AGV Cable TV Management System is now ready for production deployment on Firebase Hosting. This setup provides:

- **Scalable Infrastructure:** Firebase automatically scales with your user base
- **Security:** Enterprise-grade authentication and database security
- **Performance:** Global CDN with automatic SSL certificates
- **Monitoring:** Built-in analytics and performance monitoring
- **Maintenance:** Automated deployments with GitHub Actions

The system is production-ready with comprehensive security rules, optimized build configuration, and professional deployment practices.

For ongoing maintenance, regularly monitor the Firebase Console for:

- **Authentication activity**
- **Database usage and performance**
- **Hosting bandwidth and requests**
- **Error logs and user feedback**

Your Cable TV Management System is now live and ready to serve your users efficiently and securely.
