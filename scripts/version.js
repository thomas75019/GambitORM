#!/usr/bin/env node

/**
 * Version management script
 * Updates CHANGELOG.md when npm version is run
 * This script is called by npm's "version" lifecycle hook
 * 
 * When npm runs "version" hook, it has already updated package.json
 * with the new version, so we read it from there.
 */

const fs = require('fs');
const path = require('path');

// When called by npm version, the new version is already in package.json
// npm updates package.json BEFORE running the "version" hook
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
const version = packageJson.version;

if (!version) {
  console.error('Could not determine version from package.json');
  process.exit(1);
}

// Validate version format
if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error('Invalid version format. Use semantic versioning (e.g., 0.2.0)');
  process.exit(1);
}

console.log(`Updating CHANGELOG.md for version ${version}`);

// Update CHANGELOG if it exists
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
  let changelog = fs.readFileSync(changelogPath, 'utf-8');
  const today = new Date().toISOString().split('T')[0];
  
  // Check if version entry already exists
  if (!changelog.includes(`## [${version}]`)) {
    const unreleasedIndex = changelog.indexOf('## [Unreleased]');
    if (unreleasedIndex !== -1) {
      const newEntry = `## [${version}] - ${today}\n\n### Added\n- \n\n### Changed\n- \n\n### Fixed\n- \n\n`;
      changelog = changelog.replace('## [Unreleased]', `## [Unreleased]\n\n${newEntry}`);
      fs.writeFileSync(changelogPath, changelog);
      console.log('✓ CHANGELOG.md updated');
    } else {
      console.log('⚠ CHANGELOG.md does not have [Unreleased] section');
    }
  } else {
    console.log('✓ CHANGELOG.md already has entry for this version');
  }
} else {
  console.log('⚠ CHANGELOG.md not found, skipping');
}

console.log(`✓ Version ${version} is ready`);
