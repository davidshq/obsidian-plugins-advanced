# Development Workflow

There are two easier ways to develop Obsidian plugins compared to manually copying files:

## Method 1: Using Symlinks (Recommended)

This creates a symbolic link from your vault's plugin directory to your source directory, so changes are automatically reflected.

### Setup (One-time)

1. **Set your vault path** in an environment variable or edit the script:
   ```bash
   export OBSIDIAN_VAULT="/path/to/your/vault"
   ```

2. **Run the setup script**:
   ```bash
   npm run setup:dev
   ```

   This will:
   - Create the plugin directory in your vault
   - Create symlinks for `main.js` and `manifest.json` 
   - Copy `styles.css` (symlinks don't work well for CSS in some cases)

### Development Workflow

1. **Start the dev server** (watches for changes):
   ```bash
   npm run dev
   ```

2. **Make changes** to your TypeScript files

3. **Reload in Obsidian**:
   - Use the Hot-Reload plugin (see Method 2), OR
   - Manually disable/enable the plugin in Settings → Community plugins

The files will automatically update because they're symlinked!

## Method 2: Using Hot-Reload Plugin (Easiest)

The [Hot-Reload plugin](https://github.com/pjeby/hot-reload) automatically reloads your plugin when files change.

### Setup

1. **Install Hot-Reload plugin**:
   - Go to Settings → Community plugins → Browse
   - Search for "Hot-Reload" and install it
   - Enable it

2. **Configure Hot-Reload**:
   - Go to Settings → Hot-Reload
   - Add your plugin's directory: `/path/to/your/vault/.obsidian/plugins/community-plugin-browser`
   - Enable "Watch for changes"

3. **Copy files once** (or use symlinks from Method 1):
   ```bash
   npm run install:dev
   ```

### Development Workflow

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Make changes** - Hot-Reload will automatically:
   - Detect file changes
   - Reload your plugin
   - No manual steps needed!

## Quick Setup Scripts

### Option A: Symlink Setup (Recommended)
```bash
# One-time setup
npm run setup:dev

# Then just run dev server
npm run dev
```

### Option B: Copy Setup (Works with Hot-Reload)
```bash
# One-time setup
npm run install:dev

# Then run dev server (Hot-Reload will auto-reload)
npm run dev
```

## Manual Installation (Fallback)

If the above methods don't work, you can manually copy files:

```bash
# Build the plugin
npm run build

# Copy files manually
cp main.js manifest.json /path/to/vault/.obsidian/plugins/community-plugin-browser/
cp src/styles.css /path/to/vault/.obsidian/plugins/community-plugin-browser/styles.css
```

## Troubleshooting

### Symlinks not working?
- On Windows, you may need to run as Administrator
- On some systems, symlinks require special permissions
- Fall back to Method 2 (Hot-Reload with file copying)

### Hot-Reload not detecting changes?
- Make sure the plugin directory path is correct
- Check that the dev server is running (`npm run dev`)
- Verify file permissions allow reading

### Plugin not updating?
- Check that files are being built (look for `main.js` timestamp)
- Try manually disabling/enabling the plugin
- Check Obsidian console for errors (Ctrl+Shift+I)

