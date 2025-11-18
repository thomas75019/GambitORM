# CI/CD Documentation

Complete guide to GambitORM's Continuous Integration and Continuous Deployment setup.

## Overview

GambitORM uses GitHub Actions for CI/CD, which automatically:
- Runs tests on every push and pull request
- Builds the project on multiple platforms
- Publishes to npm when a new version is tagged
- Performs security analysis

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Purpose:** Run tests and checks on every code change.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**What it does:**

1. **Matrix Strategy**: Runs tests on multiple configurations:
   - **Operating Systems**: Ubuntu, Windows, macOS
   - **Node.js Versions**: 16.x, 18.x, 20.x, 22.x
   - Total: 12 different combinations (3 OS × 4 Node versions)

2. **Steps for each job:**
   ```yaml
   - Checkout code
   - Setup Node.js with caching
   - Install dependencies (npm ci)
   - Run linter
   - Build project
   - Run tests
   - Upload coverage reports
   ```

3. **Publish Job** (runs only on main branch):
   - Automatically publishes to npm if all tests pass
   - Requires `NPM_TOKEN` secret

**Example Flow:**
```
Developer pushes code → GitHub Actions triggered
  ↓
Checkout code
  ↓
Setup Node.js 20.x on Ubuntu
  ↓
Install dependencies
  ↓
Run linter (ESLint)
  ↓
Build TypeScript → JavaScript
  ↓
Run Jest tests
  ↓
Upload coverage to Codecov
  ↓
✅ All tests pass → Ready for merge
```

### 2. Release Workflow (`.github/workflows/release.yml`)

**Purpose:** Automatically publish to npm when a new version is released.

**Triggers:**
- Push of a tag matching pattern `v*` (e.g., `v0.2.0`)

**What it does:**

1. **Checks out code** with full git history
2. **Sets up Node.js** and npm registry
3. **Installs dependencies**
4. **Builds the project**
5. **Runs tests** (safety check)
6. **Publishes to npm** using `NPM_TOKEN`
7. **Creates GitHub Release** with changelog

**Example Flow:**
```
Developer creates tag: git tag v0.2.0 && git push --tags
  ↓
GitHub Actions detects tag push
  ↓
Checkout code
  ↓
Setup Node.js
  ↓
Install dependencies
  ↓
Build project
  ↓
Run tests (verify everything works)
  ↓
Publish to npm (npm publish)
  ↓
Create GitHub Release
  ↓
✅ Package available on npm!
```

### 3. CodeQL Analysis (`.github/workflows/codeql.yml`)

**Purpose:** Security vulnerability scanning.

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Weekly schedule (every Sunday)

**What it does:**
- Scans JavaScript/TypeScript code for security vulnerabilities
- Uses GitHub's CodeQL engine
- Reports findings in Security tab

## How It Works Together

### Development Workflow

```
1. Developer creates feature branch
   └─> git checkout -b feature/new-feature

2. Developer makes changes and commits
   └─> git commit -m "Add new feature"

3. Developer pushes to GitHub
   └─> git push origin feature/new-feature

4. Developer creates Pull Request
   └─> CI workflow automatically runs:
       - Tests on 12 different configurations
       - Linting
       - Building
       - All must pass for PR to be mergeable

5. After review, PR is merged to main
   └─> CI workflow runs again on main branch
```

### Release Workflow

```
1. Developer updates version
   └─> npm version patch  # Updates package.json

2. Developer creates git tag
   └─> git tag v0.2.0
   └─> git push --tags

3. Release workflow automatically:
   - Builds project
   - Runs tests
   - Publishes to npm
   - Creates GitHub release

4. Package is now available:
   └─> npm install gambitorm@0.2.0
```

## Configuration

### Required Secrets

Add these in GitHub repository Settings → Secrets:

1. **NPM_TOKEN** (required for publishing)
   - Get from: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Create token with "Automation" type
   - Add to GitHub Secrets as `NPM_TOKEN`

### Environment Variables

Workflows use these environment variables:
- `NODE_AUTH_TOKEN`: For npm authentication
- `GITHUB_TOKEN`: Automatically provided by GitHub

## Workflow Status

You can check workflow status:
- In GitHub: Repository → Actions tab
- Badge in README: Shows build status
- Email notifications (if configured)

## Troubleshooting

### Tests Failing

1. Check Actions tab for error details
2. Look at specific job logs
3. Run tests locally: `npm test`
4. Fix issues and push again

### Publish Failing

1. Check `NPM_TOKEN` secret is set
2. Verify npm login: `npm whoami`
3. Check package name availability
4. Ensure version number is unique

### Build Failing

1. Check TypeScript errors: `npm run build`
2. Verify Node.js version compatibility
3. Check for missing dependencies

## Manual Triggers

You can manually trigger workflows:
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Choose branch and run

## Best Practices

1. **Always run tests locally** before pushing
2. **Check CI status** before merging PRs
3. **Use semantic versioning** for releases
4. **Update CHANGELOG.md** before releasing
5. **Test published package** after release

## Workflow Files Location

```
.github/
├── workflows/
│   ├── ci.yml          # Main CI workflow
│   ├── release.yml     # Release/publish workflow
│   └── codeql.yml      # Security analysis
```

## Example Timeline

```
Day 1: Developer pushes code
  └─> CI runs (5-10 minutes)
  └─> All tests pass ✅

Day 2: PR merged to main
  └─> CI runs again ✅
  └─> CodeQL analysis runs ✅

Day 3: Ready to release
  └─> npm version patch
  └─> git push --tags
  └─> Release workflow runs (2-3 minutes)
  └─> Published to npm ✅
  └─> GitHub release created ✅
```

## Monitoring

- **GitHub Actions**: View all runs and status
- **npm**: Check published versions
- **Codecov**: View test coverage trends
- **Security**: View vulnerability reports

