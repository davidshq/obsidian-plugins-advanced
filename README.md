# Community Plugin Browser

An Obsidian plugin that replicates the built-in community plugin browser functionality, allowing you to browse, search, view details, and install community plugins directly from within Obsidian.

## Features

- **Browse Plugins**: View all available community plugins in a beautiful grid or list layout
- **Search & Filter**: Quickly find plugins by name, author, or description
  - Filter by update date: Show only plugins updated after a specific date
  - Show installed plugins only
- **Plugin Details**: View comprehensive information about each plugin including:
  - Full description from README.md
  - Version and compatibility information
  - Author and repository links
  - Installation status
- **Install & Uninstall**: Install plugins directly from the browser or uninstall them with a single click
- **Responsive Design**: Works seamlessly on desktop and mobile Obsidian clients

## Installation

### For Development (Recommended)

See [DEVELOPMENT.md](DEVELOPMENT.md) for easier development workflows using:

- **Symlinks** - Automatic file updates (like browser extensions)
- **Hot-Reload Plugin** - Automatic plugin reloading

Quick start:

```bash
# Set your vault path
export OBSIDIAN_VAULT="/path/to/your/vault"

# Option 1: Symlink setup (files update automatically)
npm run setup:dev

# Option 2: Copy setup (works with Hot-Reload plugin)
npm run install:dev

# Then start dev server
npm run dev
```

### Manual Installation

1. Download the latest release from the [Releases page](https://github.com/yourusername/obsidian-community-plugin-browser/releases)
2. Extract the files to your vault's `.obsidian/plugins/community-plugin-browser/` directory
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

### From Source

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/obsidian-community-plugin-browser.git
   cd obsidian-community-plugin-browser
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the plugin:

   ```bash
   npm run build
   ```

4. Copy the following files to your vault's `.obsidian/plugins/community-plugin-browser/` directory:
   - `main.js`
   - `manifest.json`
   - `styles.css`

5. Reload Obsidian and enable the plugin

## Usage

### Opening the Plugin Browser

- **Command Palette**: Press `Ctrl+P` (or `Cmd+P` on Mac) and search for "Open Community Plugin Browser"
- **Ribbon Icon**: Click the package icon in the left ribbon
- **Command**: Use the command "Open Community Plugin Browser"

### Browsing Plugins

1. The plugin browser opens showing all available community plugins
2. Use the search bar to filter plugins by name, author, or description
3. Use the "Updated after" date filter to show only plugins that have been updated since a specific date
4. Toggle "Show installed only" to filter to plugins you've already installed
5. Toggle between grid and list view using the mode buttons
6. Click on any plugin card to view detailed information

### Viewing Plugin Details

When you click on a plugin, you'll see:

- Plugin name and version
- Author information with link to their profile
- Repository link
- Minimum Obsidian version requirement
- Full description rendered from the plugin's README.md
- Install/Uninstall button
- Share link button
- Donate button (if available)

### Installing Plugins

1. Click on a plugin to open its detail view
2. Click the "Install" button
3. The plugin will be downloaded and installed automatically
4. You'll be prompted to enable the plugin in Settings → Community plugins

### Uninstalling Plugins

1. Open the plugin detail view
2. Click the "Uninstall" button
3. Confirm the uninstallation
4. The plugin will be removed from your vault

## Development

### Project Structure

```
obsidian-community-plugin-browser/
├── src/
│   ├── main.ts                 # Main plugin class
│   ├── types.ts                # TypeScript type definitions
│   ├── utils.ts                # Utility functions
│   ├── views/
│   │   ├── PluginListView.ts   # Plugin list view component
│   │   └── PluginDetailView.ts # Plugin detail view component
│   ├── services/
│   │   ├── PluginService.ts    # Plugin data fetching service
│   │   └── InstallationService.ts # Plugin installation service
│   └── styles.css              # Plugin styles
├── docs/
│   ├── plugin-development.md   # Obsidian plugin development guide
│   └── data-structure.md       # Data structure documentation
├── manifest.json               # Plugin manifest
├── package.json                # NPM dependencies
├── tsconfig.json               # TypeScript configuration
└── README.md                    # This file
```

### Building

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

### Development Workflow

1. Make changes to the source files in `src/`
2. Run `npm run dev` to build in watch mode
3. Copy the built files to your test vault's `.obsidian/plugins/community-plugin-browser/` directory
4. Reload Obsidian to see your changes

## How It Works

The plugin fetches plugin data from the [obsidian-releases repository](https://github.com/obsidianmd/obsidian-releases), specifically the `community-plugins.json` file. When you view a plugin's details, it fetches:

- `manifest.json` from the plugin's GitHub repository for version and compatibility info
- `README.md` from the plugin's GitHub repository for the full description

When installing a plugin, it downloads the required files from the plugin's GitHub releases:

- `main.js` (required)
- `manifest.json` (required)
- `styles.css` (optional)

These files are then placed in `.obsidian/plugins/{plugin-id}/` directory.

## Data Sources

- **Plugin List**: `https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json`
- **Plugin Statistics**: `https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json` (download counts, update dates)
- **Plugin Manifest**: `https://raw.githubusercontent.com/{repo}/{branch}/manifest.json`
- **Plugin README**: `https://raw.githubusercontent.com/{repo}/{branch}/README.md`
- **Plugin Releases**: `https://github.com/{repo}/releases/download/{version}/{file}`

## Settings

The plugin includes configurable settings accessible via Obsidian's Settings → Community Plugin Browser:

- **View Location**: Choose where the plugin browser opens (right sidebar, main editor, or new window)
- **Data Refresh Interval**: How often to refresh plugin data (default: 30 minutes = 2x/hour). The cache duration is automatically set to refresh interval + 5 minutes to ensure data freshness.
- **Pagination Threshold**: Distance from bottom to trigger auto-loading more plugins
- **Clear Cache**: Manually clear all cached data and force a fresh fetch

## Troubleshooting

### Plugins Not Loading

- Check your internet connection
- Try clicking the "Refresh" button
- Check the console for error messages (Ctrl+Shift+I)

### Installation Fails

- Ensure you have write permissions to your vault directory
- Check that the plugin is compatible with your Obsidian version
- Verify the plugin's GitHub repository is accessible

### Plugin Not Appearing After Installation

- Go to Settings → Community plugins
- Find the plugin in the list
- Enable it manually
- Reload Obsidian if necessary

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built for the Obsidian community
- Uses data from [obsidian-releases](https://github.com/obsidianmd/obsidian-releases)
- Inspired by Obsidian's built-in plugin browser

## Support

If you encounter any issues or have questions, please:

1. Check the [Issues](https://github.com/yourusername/obsidian-community-plugin-browser/issues) page
2. Create a new issue with details about your problem
3. Include Obsidian version and plugin version in your report
