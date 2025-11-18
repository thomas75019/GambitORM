# Release Process

Step-by-step guide for releasing a new version of GambitORM.

## Release Checklist

### Before Release

- [ ] All features complete and tested
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No breaking changes (or documented)
- [ ] Version number decided

### Release Steps

1. **Update CHANGELOG.md**
   - Move items from "Unreleased" to new version
   - Add release date
   - Categorize changes (Added, Changed, Fixed, etc.)

2. **Update Version**
   ```bash
   npm version patch  # or minor, major
   ```

3. **Build and Test**
   ```bash
   npm run build
   npm test
   ```

4. **Create Release Branch** (optional)
   ```bash
   git checkout -b release/v0.2.0
   git push origin release/v0.2.0
   ```

5. **Tag Release**
   ```bash
   git tag -a v0.2.0 -m "Release version 0.2.0"
   git push origin v0.2.0
   ```

6. **Publish to npm**
   ```bash
   npm publish
   ```

7. **Create GitHub Release**
   - Go to GitHub → Releases → Draft new release
   - Tag: v0.2.0
   - Title: Release v0.2.0
   - Description: Copy from CHANGELOG.md
   - Publish release

8. **Announce**
   - Update project website (if any)
   - Post on social media
   - Update community forums

## Version Strategy

### Development Versions

- Use `0.x.x` for initial development
- Use `1.0.0` for first stable release

### Release Types

- **Patch** (0.1.0 → 0.1.1): Bug fixes
- **Minor** (0.1.0 → 0.2.0): New features
- **Major** (0.1.0 → 1.0.0): Breaking changes

## Hotfix Process

For critical bugs:

1. Create hotfix branch from main
2. Fix the bug
3. Add test
4. Bump patch version
5. Publish immediately
6. Merge back to main

## Rollback

If a release has critical issues:

1. **Unpublish** (within 72 hours):
   ```bash
   npm unpublish gambitorm@0.2.0
   ```

2. **Fix and republish:**
   ```bash
   npm version patch
   npm publish
   ```

## Release Notes Template

```markdown
## [Version] - YYYY-MM-DD

### Added
- New feature 1
- New feature 2

### Changed
- Improvement 1
- Improvement 2

### Fixed
- Bug fix 1
- Bug fix 2

### Deprecated
- Feature to be removed

### Removed
- Removed feature

### Security
- Security fix
```

