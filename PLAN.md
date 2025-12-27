# Obsidian Community Plugin Browser Plugin

## Overview

This plugin replicates Obsidian's built-in community plugin browser functionality, providing users with a custom interface to browse, search, view details, and install community plugins from the [obsidian-releases repository](https://github.com/obsidianmd/obsidian-releases).

## Architecture

The plugin will consist of:

1. **Main Plugin Class** (`src/main.ts`): Core plugin logic, data fetching, and view management
2. **Plugin List View** (`src/views/PluginListView.ts`): Grid/list view showing all available plugins with search functionality
3. **Plugin Detail View** (`src/views/PluginDetailView.ts`): Detailed view for individual plugins with installation capability
4. **Data Models** (`src/types.ts`): TypeScript interfaces for plugin data structures
5. **API Service** (`src/services/PluginService.ts`): Service for fetching and managing plugin data
6. **Installation Service** (`src/services/InstallationService.ts`): Handles plugin installation logic

## Data Flow

```
User Opens View → Fetch community-plugins.json → Parse & Cache → Display List
                                                      ↓
User Clicks Plugin → Fetch manifest.json & README.md → Display Details
                                                      ↓
User Clicks Install → Download Release Files → Install to .obsidian/plugins → Enable Plugin
```

## Key Components

### 1. Plugin Structure
- `manifest.json`: Plugin metadata (id, name, version, minAppVersion)
- `src/main.ts`: Main plugin class extending `Plugin`
- `src/styles.css`: Custom styling for the UI
- `package.json`: Dependencies and build configuration

### 2. Data Sources
- **community-plugins.json**: List of all community plugins (from obsidian-releases)
- **manifest.json**: Plugin metadata from each plugin's GitHub repo
- **README.md**: Plugin documentation from each plugin's GitHub repo
- **GitHub Releases**: Plugin files (main.js, styles.css) for installation

### 3. UI Components

#### Plugin List View
- Search bar with filter functionality
- Grid/list toggle for display mode
- Plugin cards showing:
  - Name, author, description
  - Download count (if available)
  - Last updated date
  - Installed status indicator
- Pagination or virtual scrolling for performance

#### Plugin Detail View
- Full plugin information
- Version and compatibility info
- Full description from README.md
- Install/Uninstall button
- Repository link
- Back navigation

## Implementation Details

### Data Fetching
- Use Obsidian's `requestUrl` API for fetching JSON and markdown files
- Cache plugin list to avoid repeated fetches
- Handle network errors gracefully with user notifications

### Plugin Installation
- Download plugin files from GitHub releases
- Use Obsidian's `PluginManager` API if available, or manually:
  - Create plugin directory in `.obsidian/plugins/{plugin-id}/`
  - Write `main.js`, `manifest.json`, and `styles.css` files
  - Enable plugin via Obsidian's internal API or settings

### View Management
- Register custom view type using `WorkspaceLeaf`
- Create view instances using `workspace.getLeaf()` or `workspace.getRightLeaf()`
- Implement proper cleanup in `onClose()` methods

## Files to Create

1. **Documentation Files**:
   - `docs/plugin-development.md`: Obsidian plugin development guide
   - `docs/data-structure.md`: Community plugins data structure documentation
   - `PLAN.md`: This plan document

2. **Source Files**:
   - `src/main.ts`: Main plugin class
   - `src/types.ts`: TypeScript type definitions
   - `src/views/PluginListView.ts`: List/grid view component
   - `src/views/PluginDetailView.ts`: Detail view component
   - `src/services/PluginService.ts`: Data fetching service
   - `src/services/InstallationService.ts`: Installation logic
   - `src/utils.ts`: Utility functions

3. **Configuration Files**:
   - `manifest.json`: Plugin manifest
   - `package.json`: NPM dependencies
   - `tsconfig.json`: TypeScript configuration
   - `src/styles.css`: Plugin styles

4. **Other Files**:
   - `README.md`: Plugin documentation
   - `.gitignore`: Git ignore rules

## Development Steps

1. Set up project structure with TypeScript and build configuration
2. Create documentation files about Obsidian plugin development
3. Implement data models and types
4. Create PluginService for fetching community-plugins.json
5. Implement PluginListView with search and grid display
6. Implement PluginDetailView with plugin information display
7. Implement InstallationService for plugin installation
8. Add styling to match Obsidian's design language
9. Test plugin installation and functionality
10. Add error handling and user feedback
11. Create README with usage instructions

## Technical Considerations

- **Performance**: Implement caching and lazy loading for plugin data
- **Error Handling**: Graceful degradation when network requests fail
- **Security**: Validate plugin files before installation
- **Compatibility**: Check Obsidian version compatibility before installation
- **UI/UX**: Match Obsidian's design patterns and styling
- **Permissions**: Handle file system access for plugin installation

## Dependencies

- Obsidian API (provided by Obsidian)
- TypeScript for type safety
- No external npm packages required (use Obsidian's built-in APIs)

## Testing Strategy

- Test in a development Obsidian vault
- Test plugin fetching and parsing
- Test search and filtering functionality
- Test plugin installation process
- Test error scenarios (network failures, invalid data)
- Test with various Obsidian versions for compatibility

