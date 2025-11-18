#!/usr/bin/env node

/**
 * Version management script
 * Updates version in package.json and creates a git tag
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/version.js <version>');
  console.error('Example: node scripts/version.js 0.2.0');
  process.exit(1);
}

// Validate version format
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Invalid version format. Use semantic versioning (e.g., 0.2.0)');
  process.exit(1);
}

// Update version
packageJson.version = version;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version updated to ${version}`);

// Update CHANGELOG if it exists
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
  let changelog = fs.readFileSync(changelogPath, 'utf-8');
  const today = new Date().toISOString().split('T')[0];
  
  // Add new version entry if not exists
  if (!changelog.includes(`## [${version}]`)) {
    const unreleasedIndex = changelog.indexOf('## [Unreleased]');
    if (unreleasedIndex !== -1) {
      const newEntry = `## [${version}] - ${today}\n\n### Added\n- \n\n### Changed\n- \n\n### Fixed\n- \n\n`;
      changelog = changelog.replace('## [Unreleased]', `## [Unreleased]\n\n${newEntry}`);
      fs.writeFileSync(changelogPath, changelog);
      console.log('CHANGELOG.md updated');
    }
  }
}

// Create git tag
try {
  execSync(`git add package.json CHANGELOG.md`, { stdio: 'inherit' });
  execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
  execSync(`git tag -a v${version} -m "Version ${version}"`, { stdio: 'inherit' });
  console.log(`\n✓ Version ${version} tagged successfully`);
  console.log(`\nTo publish, run: git push && git push --tags && npm publish`);
} catch (error) {
  console.error('Error creating git tag:', error.message);
  process.exit(1);
}

