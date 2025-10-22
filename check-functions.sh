#!/bin/bash
echo "🔍 Checking Firebase Functions deployment..."

PROJECT="psych-dev-site-prod"

echo "📋 List of deployed functions:"
firebase functions:list --project="$PROJECT"

echo ""

echo "📜 Recent function logs:"
firebase functions:log --project="$PROJECT" --limit=50
