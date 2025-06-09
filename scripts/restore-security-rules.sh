#!/bin/bash

echo "🔒 AGV Cable TV - Restoring Security Rules"
echo "========================================="

# Check if backup exists
if [ -f "firestore-backup.rules" ]; then
    echo "1️⃣ Restoring rules from backup..."
    cp firestore-backup.rules firestore.rules
else
    echo "1️⃣ No backup found. Using git to restore rules..."
    git checkout HEAD -- firestore.rules 2>/dev/null || {
        echo "❌ Could not restore from git. Manual restoration required."
        echo ""
        echo "📝 Please manually restore your firestore.rules file with proper security rules"
        echo "📝 Refer to the project documentation for the correct rules"
        exit 1
    }
fi

echo "2️⃣ Deploying proper security rules..."
firebase deploy --only firestore:rules

echo ""
echo "✅ Proper security rules restored and deployed!"
echo ""
echo "🧪 Now test your application again:"
echo "   - If it still works: Great! Your app and rules are properly configured"
echo "   - If it breaks: There's an issue with the rule logic that needs fixing"
echo ""
echo "🔍 If you get permission errors again:"
echo "   1. Check that your user has role: 'admin' and is_active: true"
echo "   2. Ensure the packages collection exists in Firestore"
echo "   3. Verify you're logged in as an admin user"
echo ""
echo "📞 Run FirebaseDebug.runDiagnostics() in browser console for detailed info"
