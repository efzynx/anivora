#!/usr/bin/env bash
set -e

# Version Bumper and Release Tagging script for ANIVORA
# Usage: ./scripts/bump-version.sh [patch|minor|major]

BUMP_TYPE=${1:-patch}

if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Usage: ./scripts/bump-version.sh [patch|minor|major]"
  exit 1
fi

echo "🚀 Bumping ANIVORA version ($BUMP_TYPE)..."

# Read current root package version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Use npm version (without git-tag-version) to calculate next semver
NEXT_VERSION=$(npm --no-git-tag-version version $BUMP_TYPE)
NEXT_VERSION=${NEXT_VERSION#v}
echo "Next version: $NEXT_VERSION"

# Sync version to all apps & packages package.json
node -e "
const fs = require('fs');
const files = [
  'package.json',
  'apps/api/package.json',
  'apps/worker/package.json',
  'apps/tv/package.json',
  'packages/database/package.json',
  'packages/types/package.json'
];
files.forEach(file => {
  if (fs.existsSync(file)) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    pkg.version = '$NEXT_VERSION';
    fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
    console.log('Updated ' + file);
  }
});
"

# Sync CURRENT_APP_VERSION in apps/tv/src/components/UpdateDialog.tsx
sed -i -E "s/export const CURRENT_APP_VERSION = '[^']+';/export const CURRENT_APP_VERSION = '$NEXT_VERSION';/" apps/tv/src/components/UpdateDialog.tsx

echo ""
echo "✅ Version updated to $NEXT_VERSION across monorepo."
echo ""
echo "To commit and trigger GitHub Release workflow, run:"
echo "  git add ."
echo "  git commit -m \"chore(release): bump version to v$NEXT_VERSION\""
echo "  git tag v$NEXT_VERSION"
echo "  git push origin main --tags"
