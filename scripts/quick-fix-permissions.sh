#!/bin/bash

echo "🚨 AGV Cable TV - Quick Permission Fix"
echo "====================================="

# Check if Firebase CLI is available
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

echo "1️⃣ Backing up current rules..."
cp firestore.rules firestore-backup.rules 2>/dev/null || echo "No existing rules to backup"

echo "2️⃣ Applying temporary debug rules..."
cat > firestore.rules << 'EOF'
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
EOF

echo "3️⃣ Deploying debug rules..."
firebase deploy --only firestore:rules

echo ""
echo "✅ Debug rules deployed successfully!"
echo ""
echo "🧪 Now test your application:"
echo "   - The permission errors should be gone"
echo "   - You should be able to access packages and customers"
echo ""
echo "⚠️  IMPORTANT: These are temporary debug rules!"
echo "⚠️  They allow any authenticated user full access to your data"
echo ""
echo "🔄 To restore proper security rules later:"
echo "   1. Test that your app works with debug rules"
echo "   2. Run: ./scripts/restore-security-rules.sh"
echo ""
echo "📝 If the app works with debug rules, the issue is with rule logic"
echo "📝 If it still doesn't work, the issue is with authentication or collections"
