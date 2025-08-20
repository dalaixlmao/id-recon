#!/bin/bash

# Security verification script for the Identity Reconciliation Service
echo "🔒 Running Security Verification..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git not initialized. Run 'git init' first.${NC}"
    exit 1
fi

# Check sensitive files are ignored
echo "📋 Checking sensitive files protection..."

# Test environment files
sensitive_files=(
    ".env"
    ".env.production" 
    "env.production"
    "env.development"
    "secrets.json"
    "api_keys.json"
    "dev.db"
    "database.json"
    "private_key"
    "jwt_secret"
)

all_ignored=true

for file in "${sensitive_files[@]}"; do
    if git check-ignore "$file" >/dev/null 2>&1; then
        echo -e "✅ ${GREEN}$file${NC} - Protected"
    else
        echo -e "❌ ${RED}$file${NC} - NOT PROTECTED"
        all_ignored=false
    fi
done

# Check if any actual sensitive files exist and are tracked
echo ""
echo "🔍 Checking for tracked sensitive files..."

if [ -f "env.production" ]; then
    if git ls-files --error-unmatch env.production >/dev/null 2>&1; then
        echo -e "❌ ${RED}CRITICAL: env.production is tracked by git!${NC}"
        all_ignored=false
    else
        echo -e "✅ ${GREEN}env.production exists but is properly ignored${NC}"
    fi
fi

# Check .dockerignore
echo ""
echo "🐳 Checking Docker security..."

if [ -f ".dockerignore" ]; then
    if grep -q "\.env" .dockerignore && grep -q "env\.production" .dockerignore; then
        echo -e "✅ ${GREEN}.dockerignore properly excludes environment files${NC}"
    else
        echo -e "⚠️  ${YELLOW}.dockerignore should include environment files${NC}"
    fi
else
    echo -e "❌ ${RED}.dockerignore not found${NC}"
    all_ignored=false
fi

# Check for common secrets in staged files
echo ""
echo "🔐 Checking for secrets in staged files..."

if git diff --staged --name-only | xargs grep -l "password\|secret\|key\|token" 2>/dev/null; then
    echo -e "⚠️  ${YELLOW}Potential secrets found in staged files. Review carefully.${NC}"
else
    echo -e "✅ ${GREEN}No obvious secrets in staged files${NC}"
fi

# Final result
echo ""
echo "=================================="

if [ "$all_ignored" = true ]; then
    echo -e "🎉 ${GREEN}Security check PASSED!${NC}"
    echo "All sensitive files are properly protected."
    exit 0
else
    echo -e "🚨 ${RED}Security check FAILED!${NC}"
    echo "Some sensitive files are not properly protected."
    echo "Please review your .gitignore configuration."
    exit 1
fi
