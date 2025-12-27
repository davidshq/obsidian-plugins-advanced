# Community Plugins Data Structure

This document describes the data structures used by the Obsidian community plugins system.

## Data Sources

### community-plugins.json

Located at: `https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json`

This file contains an array of plugin entries, each with the following structure:

```typescript
interface CommunityPlugin {
  id: string; // Unique identifier (matches manifest.json id)
  name: string; // Display name
  author: string; // Author name(s)
  description: string; // Short description
  repo: string; // GitHub repo in format "username/repo-name"
  branch?: string; // Branch to fetch from (default: "master")
  isDesktopOnly?: boolean; // Desktop-only flag
}
```

**Example Entry**:

```json
{
  "id": "excalidraw",
  "name": "Excalidraw",
  "author": "Zsolt Viczian",
  "description": "Edit and view Excalidraw drawings.",
  "repo": "zsviczian/obsidian-excalidraw-plugin",
  "branch": "master"
}
```

### Plugin manifest.json

Each plugin has a `manifest.json` file in its GitHub repository that contains:

```typescript
interface PluginManifest {
  id: string; // Plugin ID (must match community-plugins.json)
  name: string; // Plugin name
  version: string; // Version number (e.g., "1.0.0")
  minAppVersion: string; // Minimum Obsidian version required
  description: string; // Plugin description
  author: string; // Author name
  authorUrl?: string; // Author website URL
  fundingUrl?: string; // Funding/donation URL
  isDesktopOnly?: boolean; // Desktop-only flag
}
```

**Example manifest.json**:

```json
{
  "id": "excalidraw",
  "name": "Excalidraw",
  "version": "2.18.3",
  "minAppVersion": "0.15.0",
  "description": "Edit and view Excalidraw drawings.",
  "author": "Zsolt Viczian",
  "authorUrl": "",
  "fundingUrl": "",
  "isDesktopOnly": false
}
```

### Plugin README.md

Each plugin repository contains a `README.md` file with:

- Full plugin description
- Installation instructions
- Usage guide
- Screenshots
- Configuration options
- Links to documentation

The README is fetched from: `https://raw.githubusercontent.com/{repo}/{branch}/README.md`

### GitHub Releases

Plugins are distributed via GitHub releases. When installing a plugin:

1. Find the latest release tag matching the version in `manifest.json`
2. Download the following files from the release:
   - `main.js` (required)
   - `manifest.json` (required)
   - `styles.css` (optional)

Release files are available at:

- `https://github.com/{repo}/releases/download/{version}/main.js`
- `https://github.com/{repo}/releases/download/{version}/manifest.json`
- `https://github.com/{repo}/releases/download/{version}/styles.css`

## Data Flow

1. **Fetch Plugin List**: Get `community-plugins.json` to get all available plugins
2. **Display List**: Show plugins with basic info (name, author, description)
3. **Fetch Details**: When viewing a plugin, fetch:
   - `manifest.json` from the repo (for version and compatibility)
   - `README.md` from the repo (for full description)
4. **Install Plugin**: Download release files and install to `.obsidian/plugins/{id}/`

## Caching Strategy

- Cache `community-plugins.json` locally to avoid repeated fetches
- Cache `manifest.json` per plugin (versioned)
- Cache `README.md` per plugin (can be stale)
- Cache GitHub release dates for 24 hours to support filtering by update date
- Invalidate cache when:
  - User manually refreshes
  - Cache is older than a threshold (e.g., 1 hour for plugin list, 24 hours for release dates)

## Error Handling

- Network failures: Show user-friendly error message, allow retry
- Invalid JSON: Log error, skip invalid entries
- Missing files: Handle gracefully (e.g., plugin without README)
- Version mismatches: Check `minAppVersion` before installation

## GitHub API Integration

The plugin uses the GitHub API to fetch release information for filtering:

- **Latest Release Date**: `https://api.github.com/repos/{owner}/{repo}/releases/latest`
  - Used to determine when a plugin was last updated
  - Cached for 24 hours to reduce API calls
  - Returns `published_at` date from the latest release
  - Used by the "Updated after" filter to show only recently updated plugins

## Statistics

The `community-plugin-stats.json` file (if available) contains download statistics:

- Download counts per plugin
- Last update dates
- Popularity metrics

This data can enhance the UI but is optional.

## Filtering

The plugin supports several filtering options:

- **Search Query**: Filters by plugin name, author, description, or ID
- **Show Installed Only**: Filters to show only installed plugins (when implemented)
- **Updated After**: Filters plugins by their latest GitHub release date
  - Uses GitHub API to fetch release dates
  - Caches release dates to improve performance
  - Defaults to showing all plugins (filter not set)
