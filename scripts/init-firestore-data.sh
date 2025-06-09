#!/bin/bash

# AGV Cable TV Management System - Initialize Firestore Data
echo "🔧 AGV Cable TV - Initializing Firestore Data"
echo "============================================="

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

echo "📦 Creating sample package data structure..."

# Create a temporary JS file to initialize data
cat > temp_init_firestore.js << 'EOF'
const admin = require('firebase-admin');

// Initialize Firebase Admin (requires service account key)
// This is just a template - you'll need to set up proper credentials

const samplePackages = [
  {
    name: "Basic Cable",
    price: 299,
    description: "Essential channels package with local and basic cable networks",
    channels: 50,
    features: ["Local channels", "Basic cable networks", "Standard definition", "24/7 support"],
    is_active: true,
    portal_amount: 299,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    created_by: "system"
  },
  {
    name: "Premium HD",
    price: 599,
    description: "High definition premium package with movie and sports channels",
    channels: 120,
    features: ["HD channels", "Premium networks", "Movie channels", "Sports channels", "On-demand content"],
    is_active: true,
    portal_amount: 599,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    created_by: "system"
  },
  {
    name: "Family Bundle",
    price: 499,
    description: "Perfect family entertainment package with kids and educational content",
    channels: 85,
    features: ["Kids channels", "Educational content", "Family movies", "Parental controls", "Music channels"],
    is_active: true,
    portal_amount: 499,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    created_by: "system"
  }
];

console.log('Sample package data structure:');
console.log(JSON.stringify(samplePackages, null, 2));
EOF

echo "✅ Sample package structure created in temp_init_firestore.js"
echo ""

echo "🔧 Manual Setup Instructions:"
echo "============================="
echo "1. Go to Firebase Console: https://console.firebase.google.com/project/$PROJECT/firestore"
echo ""
echo "2. Create 'packages' collection manually:"
echo "   - Click 'Start collection'"
echo "   - Collection ID: packages"
echo "   - Add a sample document with these fields:"
echo ""
echo "   Document ID: basic-cable"
echo "   Fields:"
echo "   • name (string): 'Basic Cable'"
echo "   • price (number): 299"
echo "   • description (string): 'Essential channels package'"
echo "   • channels (number): 50"
echo "   • features (array): ['Local channels', 'Basic cable networks']"
echo "   • is_active (boolean): true"
echo "   • portal_amount (number): 299"
echo "   • created_at (timestamp): (current time)"
echo "   • updated_at (timestamp): (current time)"
echo "   • created_by (string): 'system'"
echo ""

echo "3. Verify your user document in 'users' collection:"
echo "   - Collection: users"
echo "   - Document ID: (your Firebase Auth UID)"
echo "   - Required fields:"
echo "   • name (string): 'Your Name'"
echo "   • role (string): 'admin'"
echo "   • is_active (boolean): true"
echo "   • email (string): 'your-email@example.com'"
echo "   • created_at (timestamp): (current time)"
echo ""

echo "4. Deploy security rules:"
echo "   firebase deploy --only firestore:rules"
echo ""

echo "5. Test the application"
echo ""

echo "🚀 Quick Start Commands:"
echo "======================="
echo "# Deploy security rules"
echo "firebase deploy --only firestore:rules"
echo ""
echo "# Check Firestore data"
echo "firebase firestore:collections list"
echo ""
echo "# View deployed rules"
echo "firebase firestore:rules get"

# Clean up
rm -f temp_init_firestore.js

echo ""
echo "📋 Troubleshooting:"
echo "=================="
echo "If you still get permission errors:"
echo "1. Ensure you're logged into the app with an admin user"
echo "2. Check the browser console for detailed error messages"
echo "3. Verify the user document exists in Firestore with role: 'admin'"
echo "4. Make sure security rules are deployed"
echo "5. Try refreshing the page after making Firestore changes"
