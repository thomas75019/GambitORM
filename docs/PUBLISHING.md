# Publishing Guide

Guide for publishing GambitORM to npm.

## Prerequisites

1. npm account with publish permissions
2. GitHub repository set up
3. All tests passing
4. Documentation complete

## Pre-Publish Checklist

- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Version updated in `package.json`
- [ ] `CHANGELOG.md` updated
- [ ] Documentation is up to date
- [ ] `.npmignore` is configured
- [ ] `package.json` has correct metadata

## Version Management

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backward compatible)
- **PATCH** (0.0.1): Bug fixes (backward compatible)

### Using Version Script

```bash
# Update version
node scripts/version.js 0.2.0

# This will:
# - Update package.json version
# - Update CHANGELOG.md
# - Create git commit
# - Create git tag
```

### Using npm version

```bash
# Patch version (0.1.0 -> 0.1.1)
npm version patch

# Minor version (0.1.0 -> 0.2.0)
npm version minor

# Major version (0.1.0 -> 1.0.0)
npm version major
```

## Publishing Process

### Manual Publishing

1. **Update version:**
   ```bash
   npm version patch  # or minor, major
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Test:**
   ```bash
   npm test
   ```

4. **Publish:**
   ```bash
   npm publish
   ```

5. **Push tags:**
   ```bash
   git push
   git push --tags
   ```

### Using Publish Scripts

**Linux/Mac:**
```bash
chmod +x scripts/publish.sh
./scripts/publish.sh patch  # or minor, major
```

**Windows (PowerShell):**
```powershell
.\scripts\publish.ps1 patch  # or minor, major
```

## CI/CD Publishing

The GitHub Actions workflow automatically publishes when:
- A tag is pushed (e.g., `v0.2.0`)
- On main branch push (if configured)

### Setting up NPM Token

1. Generate npm token:
   - Go to npmjs.com → Account → Access Tokens
   - Create new token with "Automation" type

2. Add to GitHub Secrets:
   - Go to repository → Settings → Secrets
   - Add `NPM_TOKEN` secret

## Post-Publish

1. Create GitHub release
2. Announce on social media/forums
3. Update documentation if needed
4. Monitor for issues

## Troubleshooting

### "Package name already exists"
- Check if package name is available
- Consider scoped package: `@your-org/gambitorm`

### "Unauthorized"
- Check npm login: `npm whoami`
- Login: `npm login`
- Verify token permissions

### "Version already exists"
- Bump version number
- Check npm registry for latest version

## Best Practices

1. **Always test before publishing**
2. **Use semantic versioning**
3. **Update CHANGELOG.md**
4. **Tag releases in git**
5. **Test published package:**
   ```bash
   npm pack
   npm install ./gambitorm-0.1.0.tgz
   ```

