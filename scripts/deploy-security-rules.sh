#!/bin/bash

# AGV Cable TV Management System - Firestore Security Rules Deployment Script
# This script deploys the comprehensive security rules to Firebase

echo "🔐 AGV Cable TV - Deploying Firestore Security Rules"
echo "================================================="

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

# Check if firestore.rules exists
if [ ! -f "firestore.rules" ]; then
    echo "❌ firestore.rules file not found in project root"
    echo "   Make sure the security rules file exists"
    exit 1
fi

echo "📋 Checking current Firebase project..."
PROJECT=$(firebase use --project 2>/dev/null | grep "Now using project" | cut -d' ' -f4)

if [ -z "$PROJECT" ]; then
    echo "❌ No Firebase project selected. Please run:"
    echo "   firebase use <project-id>"
    exit 1
fi

echo "✅ Using Firebase project: $PROJECT"
echo ""

# Validate the rules syntax
echo "🔍 Validating Firestore security rules syntax..."
if firebase firestore:rules validate firestore.rules; then
    echo "✅ Security rules syntax is valid"
else
    echo "❌ Security rules syntax validation failed"
    exit 1
fi

echo ""
echo "🚀 Deploying security rules to Firebase..."
echo "   This will replace the existing security rules"
echo ""

# Ask for confirmation
read -p "   Do you want to continue? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Deploying to Firebase..."
    
    if firebase deploy --only firestore:rules; then
        echo ""
        echo "✅ Security rules deployed successfully!"
        echo ""
        echo "📋 Security Features Deployed:"
        echo "   • Role-based access control (Admin/Employee)"
        echo "   • Server-side user authentication validation"
        echo "   • Customer access based on collector assignments"
        echo "   • Employee-scoped billing record access"
        echo "   • Admin-only package and user management"
        echo "   • Request workflow protection"
        echo "   • Data integrity validation"
        echo "   • Automatic timestamp enforcement"
        echo ""
        echo "🔒 Security Rules Active - Your Firebase is now protected!"
        
        # Test the deployment
        echo ""
        echo "🧪 Testing security rules deployment..."
        if firebase firestore:rules list &> /dev/null; then
            echo "✅ Security rules are active and accessible"
        else
            echo "⚠️  Could not verify rules status - please check Firebase console"
        fi
        
    else
        echo "❌ Deployment failed. Please check the error messages above."
        exit 1
    fi
else
    echo "🚫 Deployment cancelled"
    exit 0
fi

echo ""
echo "📖 Next Steps:"
echo "   1. Test the application with different user roles"
echo "   2. Verify permission errors are shown for unauthorized actions"
echo "   3. Check Firebase console for security rule violations"
echo "   4. Monitor application logs for security events"
echo ""
echo "🔗 Useful Commands:"
echo "   firebase firestore:rules list    # List current rules"
echo "   firebase firestore:rules get     # View current rules"
echo "   firebase logs --tail             # Monitor real-time logs"
echo ""
echo "🎉 Security deployment complete!"
