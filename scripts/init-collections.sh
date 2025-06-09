#!/bin/bash

echo "🔧 AGV Cable TV - Initialize Firestore Collections"
echo "================================================="

PROJECT=$(firebase use 2>/dev/null | grep "Now using project" | cut -d' ' -f4)
if [ -z "$PROJECT" ]; then
    echo "❌ No Firebase project selected. Please run:"
    echo "   firebase use <project-id>"
    exit 1
fi

echo "✅ Using project: $PROJECT"
echo ""

echo "📦 Setting up Firestore collections..."
echo ""

echo "Since we can't create collections via CLI, please follow these steps:"
echo ""

echo "1️⃣ Go to Firebase Console:"
echo "   https://console.firebase.google.com/project/$PROJECT/firestore"
echo ""

echo "2️⃣ Create 'packages' collection:"
echo "   - Click 'Start collection'"
echo "   - Collection ID: packages"
echo "   - Document ID: basic-cable"
echo "   - Add these fields:"
echo ""
echo "   📝 Document fields for basic-cable:"
echo "   ┌──────��──────────┬────────┬─────────────────────────────────────┐"
echo "   │ Field           │ Type   │ Value                               │"
echo "   ├─────────────────┼────────┼─────────────────────────────────────┤"
echo "   │ name            │ string │ Basic Cable                         │"
echo "   │ price           │ number │ 299                                 │"
echo "   │ description     │ string │ Essential channels package          │"
echo "   │ channels        │ number │ 50                                  │"
echo "   │ features        │ array  │ ['Local channels', 'Basic networks']│"
echo "   │ is_active       │ bool   │ true                                │"
echo "   │ portal_amount   │ number │ 299                                 │"
echo "   │ created_at      │ timestamp │ (current time)                  │"
echo "   │ updated_at      │ timestamp │ (current time)                  │"
echo "   │ created_by      │ string │ system                              │"
echo "   └─────────────────┴────────┴─────────────────────────────────────┘"
echo ""

echo "3️⃣ Check your user document in 'users' collection:"
echo "   - Collection: users"
echo "   - Document ID: (your Firebase Auth UID)"
echo "   - Required fields:"
echo ""
echo "   📝 User document fields:"
echo "   ┌─────────────────┬────────┬─────────────────────────────────────┐"
echo "   │ Field           │ Type   │ Value                               │"
echo "   ├─────────────────┼────────┼────────────────────��────────────────┤"
echo "   │ name            │ string │ Your Name                           │"
echo "   │ role            │ string │ admin                               │"
echo "   │ is_active       │ bool   │ true                                │"
echo "   │ email           │ string │ your-email@example.com              │"
echo "   │ created_at      │ timestamp │ (current time)                  │"
echo "   └─────────────────┴────────┴─────────────────────────────────────┘"
echo ""

echo "4️⃣ After creating the collections:"
echo "   - Refresh your application"
echo "   - The permission errors should be resolved"
echo ""

echo "🔍 To check if collections exist:"
echo "   firebase firestore:collections list"
echo ""

echo "📞 If you still get errors after this:"
echo "   1. Make sure you're logged in as an admin"
echo "   2. Run debug rules: ./scripts/quick-fix-permissions.sh"
echo "   3. Check browser console: FirebaseDebug.runDiagnostics()"
