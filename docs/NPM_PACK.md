# npm pack Guide

## What is npm pack?

`npm pack` creates a tarball (`.tgz` file) of your package exactly as it would be published to npm. This is useful for:

- Testing your package before publishing
- Verifying what files will be included
- Testing installation locally
- Sharing with others for testing

## Usage

```bash
# Create a tarball
npm pack

# This creates: gambitorm-0.1.0.tgz
```

## What Gets Included?

The tarball includes only files specified in `package.json` `files` array:
- `dist/` - Compiled JavaScript
- `README.md`
- `LICENSE`
- `CHANGELOG.md`

## Testing the Package

```bash
# 1. Create the tarball
npm pack

# 2. Test installation in a temporary directory
mkdir test-install
cd test-install
npm init -y
npm install ../gambitorm-0.1.0.tgz

# 3. Test importing
node -e "const { GambitORM } = require('gambitorm'); console.log('Works!');"

# 4. Clean up
cd ..
rm -rf test-install
rm gambitorm-0.1.0.tgz
```

## Should You Commit .tgz Files?

**NO!** Never commit `.tgz` files to git because:

1. **They're build artifacts** - Generated from source code
2. **They change frequently** - Every version creates a new file
3. **They're large** - Unnecessary bloat in repository
4. **They're reproducible** - Can be generated anytime with `npm pack`

## Git Ignore

The `.gitignore` file already includes:
```
*.tgz
gambitorm-*.tgz
```

## When to Use npm pack

- **Before publishing** - Verify package contents
- **Testing locally** - Test installation process
- **CI/CD** - Some workflows use it for testing
- **Sharing** - Send to others for testing (not via git)

## Clean Up

After testing, always delete the tarball:

```bash
# Delete the tarball
rm gambitorm-*.tgz

# Or on Windows
del gambitorm-*.tgz
```

## Best Practices

1. ✅ Use `npm pack` to test before publishing
2. ✅ Delete `.tgz` files after testing
3. ✅ Never commit `.tgz` files
4. ✅ Use `.gitignore` to prevent accidental commits
5. ✅ Test installation from tarball before publishing

