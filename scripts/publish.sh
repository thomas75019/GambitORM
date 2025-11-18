#!/bin/bash

# Publish script for GambitORM
# Usage: ./scripts/publish.sh [patch|minor|major]

set -e

VERSION_TYPE=${1:-patch}

echo "🚀 Publishing GambitORM..."

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "❌ Error: Must be on main branch to publish"
  exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Error: Working directory is not clean"
  exit 1
fi

# Run tests
echo "🧪 Running tests..."
npm test

# Build
echo "🔨 Building..."
npm run build

# Bump version
echo "📦 Bumping version ($VERSION_TYPE)..."
npm version $VERSION_TYPE

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "✨ New version: $NEW_VERSION"

# Push to git
echo "📤 Pushing to git..."
git push
git push --tags

# Publish to npm
echo "📦 Publishing to npm..."
npm publish

echo "✅ Published version $NEW_VERSION successfully!"

