#!/bin/bash

# AGV Cable TV Management System - Firebase Permissions Debug Script
echo "🔍 AGV Cable TV - Firebase Permissions Debugging"
echo "==============================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "   firebase login"
    exit 1
fi

# Get current project
PROJECT=$(firebase use --project 2>/dev/null | grep "Now using project" | cut -d' ' -f4)
if [ -z "$PROJECT" ]; then
    echo "❌ No Firebase project selected. Please run:"
    echo "   firebase use <project-id>"
    exit 1
fi

echo "✅ Using Firebase project: $PROJECT"
echo ""

echo "📋 Current Firestore Security Rules:"
echo "===================================="
firebase firestore:rules get 2>/dev/null || echo "❌ Could not retrieve current rules"

echo ""
echo "🔧 Debugging Steps:"
echo "==================="

echo "1. Check if security rules are deployed:"
firebase firestore:rules list 2>/dev/null && echo "✅ Rules are deployed" || echo "❌ Rules may not be deployed"

echo ""
echo "2. Check collections in Firestore:"
echo "   - Go to Firebase Console: https://console.firebase.google.com/project/$PROJECT/firestore"
echo "   - Verify these collections exist:"
echo "     • users (with your user document)"
echo "     • packages (may be empty, but should exist)"
echo "     • customers (if you have customer data)"

echo ""
echo "3. Quick fixes to try:"
echo "   a) Deploy the security rules:"
echo "      firebase deploy --only firestore:rules"
echo ""
echo "   b) Create a test package in Firestore console to initialize collection"
echo ""
echo "   c) Check your user document in Firestore:"
echo "      - Collection: users"
echo "      - Document ID: your auth UID"
echo "      - Required fields: role, is_active, name"

echo ""
echo "4. Temporary development rules (ONLY for debugging):"
echo "   If you need to bypass rules temporarily, use these rules:"
echo "   ----------------------------------------"
echo "   rules_version = '2';"
echo "   service cloud.firestore {"
echo "     match /databases/{database}/documents {"
echo "       match /{document=**} {"
echo "         allow read, write: if request.auth != null;"
echo "       }"
echo "     }"
echo "   }"
echo "   ----------------------------------------"
echo "   ⚠️  WARNING: These rules allow any authenticated user full access!"
echo "   ⚠️  Only use for debugging, then restore proper security rules!"

echo ""
echo "5. Check authentication in browser console:"
echo "   - Open browser dev tools"
echo "   - Check if user is logged in and has proper role"
echo "   - Look for any authentication errors"

echo ""
echo "📞 If issues persist:"
echo "   1. Share the Firebase project console screenshots"
echo "   2. Check browser console for detailed error messages"
echo "   3. Verify user document structure in Firestore"
