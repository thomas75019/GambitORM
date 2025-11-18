# Publish script for GambitORM (PowerShell)
# Usage: .\scripts\publish.ps1 [patch|minor|major]

param(
    [string]$VersionType = "patch"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Publishing GambitORM..." -ForegroundColor Cyan

# Check if we're on main branch
$CurrentBranch = git branch --show-current
if ($CurrentBranch -ne "main") {
    Write-Host "❌ Error: Must be on main branch to publish" -ForegroundColor Red
    exit 1
}

# Check if working directory is clean
$Status = git status --porcelain
if ($Status) {
    Write-Host "❌ Error: Working directory is not clean" -ForegroundColor Red
    exit 1
}

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed" -ForegroundColor Red
    exit 1
}

# Build
Write-Host "🔨 Building..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Bump version
Write-Host "📦 Bumping version ($VersionType)..." -ForegroundColor Yellow
npm version $VersionType
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Version bump failed" -ForegroundColor Red
    exit 1
}

# Get new version
$PackageJson = Get-Content package.json | ConvertFrom-Json
$NewVersion = $PackageJson.version
Write-Host "✨ New version: $NewVersion" -ForegroundColor Green

# Push to git
Write-Host "📤 Pushing to git..." -ForegroundColor Yellow
git push
git push --tags
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git push failed" -ForegroundColor Red
    exit 1
}

# Publish to npm
Write-Host "📦 Publishing to npm..." -ForegroundColor Yellow
npm publish
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm publish failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Published version $NewVersion successfully!" -ForegroundColor Green

