# NPM Publish Checklist

Use this checklist before publishing to npm.

## Pre-Publish

- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles without errors
- [ ] No console.log or debug code
- [ ] All documentation is up to date

## Version & Metadata

- [ ] Version number updated in `package.json`
- [ ] `CHANGELOG.md` updated with new version
- [ ] `package.json` has correct:
  - [ ] Description
  - [ ] Keywords
  - [ ] Author information
  - [ ] Repository URL
  - [ ] Homepage URL
  - [ ] Bugs URL
  - [ ] License
  - [ ] Engine requirements

## Files

- [ ] `.npmignore` configured correctly
- [ ] `package.json` `files` array includes:
  - [ ] `dist/`
  - [ ] `README.md`
  - [ ] `LICENSE`
  - [ ] `CHANGELOG.md` (optional)

## Documentation

- [ ] README.md is complete
- [ ] Examples are working
- [ ] API documentation is accurate
- [ ] Badges are correct

## CI/CD

- [ ] GitHub Actions workflows configured
- [ ] NPM_TOKEN secret added to GitHub
- [ ] CI tests are passing

## Publishing

- [ ] Login to npm: `npm login`
- [ ] Verify package name availability
- [ ] Test package locally: `npm pack`
- [ ] Publish: `npm publish` (or use script)
- [ ] Create git tag: `git tag v0.1.0`
- [ ] Push tag: `git push --tags`
- [ ] Create GitHub release

## Post-Publish

- [ ] Verify package on npmjs.com
- [ ] Test installation: `npm install gambitorm`
- [ ] Monitor for issues
- [ ] Announce release

## Quick Commands

```bash
# Test everything
npm test && npm run build && npm run lint

# Version bump
npm version patch  # or minor, major

# Publish
npm publish

# Or use script
./scripts/publish.sh patch  # Linux/Mac
.\scripts\publish.ps1 patch  # Windows
```

