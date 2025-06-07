# Firebase Setup Guide for CableTV Dashboard

## 🔥 Firebase Project Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `cabletv-dashboard`
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Optionally enable **Google** provider for easier access

### 3. Create Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Choose **Start in test mode** (for development)
3. Select your preferred location

### 4. Get Firebase Configuration

1. Go to **Project Settings** → **General** → **Your apps**
2. Click **Web app** (</>) icon
3. Register app with name: `cabletv-dashboard`
4. Copy the Firebase configuration object

### 5. Update Firebase Config

Replace the demo config in `src/lib/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
};
```

## 🔐 Security Rules

### Firestore Security Rules

Replace default rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - only authenticated users can read their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null &&
                     exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Customers collection
    match /customers/{customerId} {
      allow read, write: if request.auth != null &&
                           exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';

      allow read: if request.auth != null &&
                     exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'employee' &&
                     resource.data.collectorName == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.name;
    }
  }
}
```

## 🏗️ Development Setup

### Option 1: Use Demo Mode (Recommended for Testing)

The app is configured to work with demo data out of the box. Just run:

```bash
npm run dev
```

Demo credentials:

- **Admin**: admin@cabletv.com / admin123
- **Employee**: john.collector@cabletv.com / employee123

### Option 2: Connect to Real Firebase

1. Update `src/lib/firebase.ts` with your Firebase config
2. Deploy security rules to your Firebase project
3. Run the app - demo data will be automatically seeded

### Option 3: Use Firebase Emulators (Advanced)

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init`
4. Start emulators: `firebase emulators:start`
5. Update `src/lib/firebase.ts` to use emulator settings

## 📱 Production Deployment

### 1. Build the App

```bash
npm run build
```

### 2. Deploy to Firebase Hosting

```bash
firebase init hosting
firebase deploy
```

### 3. Update Security Rules

Deploy the production security rules:

```bash
firebase deploy --only firestore:rules
```

## 🔄 Data Migration

### Seed Demo Data

The app automatically seeds demo data in development mode. To manually seed:

```typescript
import { DataSeeder } from "@/utils/seedData";
await DataSeeder.seedAll();
```

### Clear All Data

To reset the database:

```typescript
import { DataSeeder } from "@/utils/seedData";
await DataSeeder.clearAllData();
```

## 🐛 Troubleshooting

### Common Issues

1. **Authentication errors**: Check Firebase Auth configuration
2. **Firestore permission denied**: Verify security rules
3. **Network errors**: Check Firebase project settings

### Debug Mode

Enable debug logging in development:

```typescript
// In src/lib/firebase.ts
import { connectFirestoreEmulator, enableNetwork } from "firebase/firestore";

if (import.meta.env.DEV) {
  // Enable debugging
  console.log("Firebase debug mode enabled");
}
```

## 📊 Monitoring

### Firebase Console

Monitor your app in Firebase Console:

- **Authentication**: User login activity
- **Firestore**: Database usage and performance
- **Hosting**: Website traffic and performance

### Error Tracking

Consider adding Firebase Crashlytics for production error tracking.

## 🔒 Security Best Practices

1. **Never commit Firebase config with real keys to public repos**
2. **Use environment variables for sensitive data**
3. **Regularly review and update security rules**
4. **Enable App Check for production**
5. **Monitor authentication anomalies**
6. **Implement proper user roles and permissions**

## 📈 Scaling Considerations

1. **Database indexing**: Add composite indexes for complex queries
2. **Pagination**: Implement pagination for large customer lists
3. **Caching**: Use Firebase caching for better performance
4. **CDN**: Use Firebase Hosting CDN for static assets
