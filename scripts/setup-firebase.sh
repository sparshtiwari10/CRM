#!/bin/bash

# Firebase Setup Script for AGV Cable TV Management System
# Run this script after creating your Firebase project

echo "🚀 Setting up Firebase for AGV Cable TV Management System"
echo "=================================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

echo "📋 Please ensure you have:"
echo "1. Created a Firebase project at https://console.firebase.google.com"
echo "2. Enabled Firestore Database"
echo "3. Updated your .env file with Firebase credentials"
echo ""

read -p "Have you completed the above steps? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please complete the setup steps first."
    echo "📖 See FIREBASE_SETUP_GUIDE.md for detailed instructions."
    exit 1
fi

echo "🔐 Logging into Firebase..."
firebase login

echo "🔧 Initializing Firebase project..."
firebase init

echo "📤 Deploying Firestore rules..."
firebase deploy --only firestore:rules

echo "📊 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

echo "✅ Firebase setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Run 'npm run dev' to start development server"
echo "2. Login with admin credentials: admin / admin123"
echo "3. Create additional users and import data as needed"
echo ""
echo "🌐 To deploy your app to Firebase Hosting:"
echo "1. Run 'npm run build'"
echo "2. Run 'firebase deploy --only hosting'"
echo ""
echo "📖 For detailed instructions, see FIREBASE_SETUP_GUIDE.md"
