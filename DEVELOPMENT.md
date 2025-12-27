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

---

# Best Practices from Popular Obsidian Plugins

This section documents common best practices and standards observed across popular Obsidian plugins including Excalidraw, Dataview, Templater, Tasks, Advanced Tables, Git, QuickAdd, Omnisearch, Copilot, Recent Files, Tag Wrangler, Smart Connections, Linter, MAKE.md, Advanced URI, Self-hosted LiveSync, and BRAT.

## Project Structure & Organization

### Directory Structure

Popular plugins follow a consistent directory structure:

```
plugin-name/
├── src/
│   ├── main.ts              # Main plugin entry point
│   ├── config.ts            # Configuration constants
│   ├── types.ts             # TypeScript type definitions
│   ├── services/            # Business logic services
│   ├── views/               # Custom views/components
│   ├── settings/            # Settings tab implementation
│   ├── utils/               # Utility functions
│   └── styles.css           # Plugin styles
├── tests/                   # Test files
├── manifest.json            # Plugin manifest
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── esbuild.config.mjs       # Build configuration
├── eslint.config.mjs        # ESLint configuration
├── README.md                # Plugin documentation
└── LICENSE                  # License file
```

### Essential Files

Every plugin should include:

- **README.md**: Comprehensive documentation with purpose, features, installation, and usage
- **LICENSE**: Clear license specifying usage rights (MIT, GPL, etc.)
- **manifest.json**: Plugin metadata (ID, name, version, author, description)
- **versions.json**: Compatibility information for different Obsidian versions

### Manifest.json Best Practices

```json
{
  "id": "plugin-id", // No "obsidian" prefix, no "plugin" suffix
  "name": "Plugin Name", // No "Obsidian" prefix, no "dian" suffix
  "version": "1.0.0", // Semantic versioning
  "minAppVersion": "0.15.0", // Minimum Obsidian version required
  "description": "Clear description.", // Ends with period, no "This plugin" start
  "author": "Author Name",
  "authorUrl": "https://github.com/author",
  "fundingUrl": "", // Optional funding link
  "isDesktopOnly": false // true if mobile incompatible
}
```

## Build Configuration

### esbuild Configuration Patterns

Popular plugins use esbuild with these common patterns:

```javascript
// esbuild.config.mjs
import esbuild from "esbuild";
import builtins from "builtin-modules";

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository
*/`;

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  banner: { js: banner },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/*", // All CodeMirror packages
    ...builtins,
  ],
  format: "cjs",
  target: "es2018", // Common target for Obsidian compatibility
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

### TypeScript Configuration

Common tsconfig.json settings:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2022",
    "allowJs": true,
    "noImplicitAny": true,
    "moduleResolution": "bundler",
    "importHelpers": true,
    "strictNullChecks": true,
    "strict": true,
    "skipLibCheck": true,
    "lib": ["DOM", "ES2022"]
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### Package.json Scripts

Standard scripts used across plugins:

```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "version": "node version-bump.mjs && git add manifest.json versions.json",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Code Organization Patterns

### Main Plugin Class Structure

```typescript
export default class MyPlugin extends Plugin {
  settings!: PluginSettings;
  private service!: Service;
  private interval: number | null = null;

  async onload() {
    await this.loadSettings();

    // Initialize services
    this.service = new Service(this.app);

    // Register views
    this.registerView(VIEW_TYPE, (leaf) => new MyView(leaf));

    // Add settings tab
    this.addSettingTab(new MySettingTab(this));

    // Register commands
    this.addCommand({
      id: "command-id",
      name: "Command Name",
      callback: () => this.handleCommand(),
    });

    // Add ribbon icon (optional)
    this.addRibbonIcon("icon-name", "Tooltip", () => this.handleClick());
  }

  async onunload() {
    // Cleanup: intervals, event listeners, etc.
    if (this.interval) {
      window.clearInterval(this.interval);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

### Service Layer Pattern

Separate business logic into service classes:

```typescript
export class MyService {
  constructor(private app: App) {}

  async fetchData(): Promise<Data> {
    // Business logic here
  }

  private validateInput(input: string): boolean {
    // Validation logic
  }
}
```

### Configuration Constants

Centralize configuration in a config file:

```typescript
// src/config.ts
export const PLUGIN_CONFIG = {
  urls: {
    api: "https://api.example.com",
  },
  constants: {
    cacheDuration: 60 * 60 * 1000, // 1 hour
    batchSize: 10,
    debounceDelay: 300,
  },
};
```

## Memory Management & Lifecycle

### Event Registration Best Practices

Always use `this.registerEvent()` for automatic cleanup:

```typescript
// ✅ Good: Automatic cleanup
this.registerEvent(
  this.app.vault.on("modify", (file) => {
    this.handleFileModify(file);
  }),
);

// ❌ Bad: Manual cleanup required
this.app.vault.on("modify", this.handleFileModify);
```

### DOM Event Registration

Use `registerDomEvent()` for DOM events with automatic cleanup:

```typescript
// ✅ Good: Automatic cleanup
this.registerDomEvent(window, "click", (evt) => {
  this.handleClick(evt);
});

this.registerDomEvent(document, "keydown", (evt) => {
  if (evt.key === "Escape") {
    this.closeModal();
  }
});

// ❌ Bad: Manual cleanup required
window.addEventListener("click", this.handleClick);
```

### Event Listener Management in Views

When working with `ItemView` or `Component` subclasses, prefer `registerDomEvent()` when possible. However, for debounced handlers or when you need direct control, track listeners manually:

```typescript
export class MyView extends ItemView {
  // Track listeners that need manual cleanup (e.g., debounced handlers)
  private trackedListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

  onOpen() {
    const input = this.containerEl.createEl("input");

    // ✅ Good: Use registerDomEvent when possible
    this.registerDomEvent(input, "focus", () => {
      this.handleFocus();
    });

    // For debounced handlers, track manually
    const debouncedHandler = debounce(() => {
      this.handleInput(input.value);
    }, 300);

    input.addEventListener("input", debouncedHandler);
    this.trackedListeners.push({
      element: input,
      event: "input",
      handler: debouncedHandler,
    });
  }

  async onClose() {
    // ✅ Good: Explicitly remove tracked listeners
    for (const { element, event, handler } of this.trackedListeners) {
      try {
        element.removeEventListener(event, handler);
      } catch (error) {
        console.warn(`Failed to remove ${event} listener:`, error);
      }
    }
    this.trackedListeners = [];
  }
}
```

**Important Notes:**

- `registerDomEvent()` automatically cleans up when the component is unloaded
- For debounced/throttled handlers, you must track and manually remove them
- Don't rely solely on Obsidian cleaning up DOM - explicitly track listeners that need cleanup
- Always wrap `removeEventListener` in try/catch to handle edge cases gracefully

### Interval Registration

Use `registerInterval()` for intervals with automatic cleanup:

```typescript
// ✅ Good: Automatic cleanup
this.registerInterval(
  window.setInterval(() => {
    this.refresh();
  }, 60000)
);

// ❌ Bad: Manual cleanup required
private refreshInterval: number | null = null;

onload() {
  this.refreshInterval = window.setInterval(() => {
    this.refresh();
  }, 60000);
}

onunload() {
  if (this.refreshInterval !== null) {
    window.clearInterval(this.refreshInterval);
  }
}
```

### Manual Interval/Timeout Cleanup

If you must use manual intervals/timeouts, always clear them in `onunload()`:

```typescript
export default class MyPlugin extends Plugin {
  private refreshInterval: number | null = null;
  private debounceTimer: number | null = null;

  onload() {
    this.refreshInterval = window.setInterval(() => {
      this.refresh();
    }, 60000);
  }

  onunload() {
    if (this.refreshInterval !== null) {
      window.clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
```

### Event Listener Cleanup

Track and remove custom event listeners:

```typescript
private eventHandlers: Map<WorkspaceLeaf, EventListener> = new Map();

onload() {
  const handler = (event: Event) => { /* ... */ };
  this.eventHandlers.set(leaf, handler);
  element.addEventListener("custom-event", handler);
}

onunload() {
  for (const [leaf, handler] of this.eventHandlers) {
    leaf.view.containerEl.removeEventListener("custom-event", handler);
  }
  this.eventHandlers.clear();
}
```

### AbortController for Async Cancellation

Use `AbortController` to cancel pending async operations (e.g., search, filtering):

```typescript
export class MyView extends ItemView {
  private filterAbortController: AbortController | null = null;

  async filterData(query: string) {
    // Cancel any pending filter operation
    if (this.filterAbortController) {
      this.filterAbortController.abort();
    }

    // Create new controller for this operation
    this.filterAbortController = new AbortController();
    const signal = this.filterAbortController.signal;

    try {
      const results = await this.performSearch(query, { signal });
      // Handle results
    } catch (error) {
      // Ignore abort errors (expected when user types quickly)
      if (error.name !== "AbortError") {
        console.error("Search failed:", error);
      }
    }
  }

  async onClose() {
    // ✅ Good: Cancel pending operations
    if (this.filterAbortController) {
      this.filterAbortController.abort();
      this.filterAbortController = null;
    }
  }
}

// In your async function
async performSearch(query: string, options?: { signal?: AbortSignal }) {
  const response = await requestUrl({
    url: `https://api.example.com/search?q=${query}`,
    method: "GET",
  });

  // Check if aborted before processing
  if (options?.signal?.aborted) {
    throw new Error("Aborted");
  }

  return response.json;
}
```

**Benefits:**

- Prevents race conditions when user input changes rapidly
- Avoids unnecessary network requests
- Improves performance by canceling outdated operations

### Resource Disposal Pattern

Implement cleanup for all resources:

```typescript
async onunload() {
  // Stop intervals/timeouts
  this.stopBackgroundRefresh();

  // Remove event listeners
  this.cleanupEventListeners();

  // Dispose of views
  this.app.workspace.detachLeavesOfType(VIEW_TYPE);

  // Clear caches
  this.cache.clear();
}
```

## Settings Management

### Settings Structure

```typescript
// Define default settings
const DEFAULT_SETTINGS: PluginSettings = {
  setting1: "default",
  setting2: true,
  nested: {
    value: 0,
  },
};

// Load with merge
async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

// Save settings
async saveSettings() {
  await this.saveData(this.settings);
}
```

### Settings Tab Pattern

```typescript
export class MySettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Plugin Name Settings" });

    new Setting(containerEl)
      .setName("Setting Name")
      .setDesc("Setting description")
      .addText((text) =>
        text
          .setPlaceholder("Enter value")
          .setValue(this.plugin.settings.setting1)
          .onChange(async (value) => {
            this.plugin.settings.setting1 = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
```

### Settings UI Best Practices

- Use `.setHeading()` for section headings
- Group related settings together
- Provide clear descriptions
- Use appropriate input types (text, dropdown, toggle, etc.)
- Save immediately on change (don't require a "Save" button)

## TypeScript Best Practices

### Type Definitions

Create comprehensive type definitions:

```typescript
// src/types.ts
export interface PluginSettings {
  setting1: string;
  setting2: boolean;
  nested?: {
    value: number;
  };
}

export interface PluginData {
  id: string;
  name: string;
  version: string;
}
```

### Strict Type Checking

Enable strict mode in tsconfig.json:

- `strict: true`
- `strictNullChecks: true`
- `noImplicitAny: true`

### Type Guards

Use type guards for safe type checking:

```typescript
function isTFile(file: TAbstractFile): file is TFile {
  return file instanceof TFile;
}

const file = this.app.vault.getAbstractFileByPath("path");
if (isTFile(file)) {
  const content = await this.app.vault.read(file);
}
```

## Security Best Practices

### Path Normalization

Always use `normalizePath()` for user-defined paths:

```typescript
import { normalizePath } from "obsidian";

const userPath = normalizePath(app.vault.configDir + "/plugins/my-plugin");
```

### XSS Prevention

Sanitize user input before displaying:

```typescript
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Use textContent instead of innerHTML when possible
element.textContent = userInput; // ✅ Safe
element.innerHTML = userInput; // ❌ Dangerous
```

### Input Validation

Validate all user inputs:

```typescript
function validatePath(path: string): boolean {
  if (!path || path.length === 0) return false;
  if (path.includes("..")) return false; // Prevent directory traversal
  return true;
}
```

### Network Requests

Use Obsidian's `requestUrl` instead of `fetch`:

```typescript
import { requestUrl } from "obsidian";

// ✅ Good: Uses Obsidian's API
const response = await requestUrl({
  url: "https://api.example.com/data",
  method: "GET",
});
const data = response.json;

// ❌ Bad: Uses native fetch (may not respect Obsidian settings)
const response = await fetch("https://api.example.com/data");
```

### Retry Logic for Network Requests

Implement retry logic for unreliable network operations:

```typescript
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await requestUrl({ url });
      return response.json;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
}
```

### Graceful Degradation

Handle network failures gracefully:

```typescript
async fetchData(): Promise<Data | null> {
  try {
    const response = await requestUrl({ url: this.apiUrl });
    return response.json;
  } catch (error) {
    // Return cached data if available
    if (this.cachedData) {
      console.warn("Using cached data due to network error:", error);
      return this.cachedData;
    }
    // Show user-friendly error
    new Notice("Failed to fetch data. Please check your connection.");
    return null;
  }
}
```

## Performance Optimization

### Caching Patterns

Implement caching for expensive operations:

```typescript
private cache: Map<string, { data: any; timestamp: number }> = new Map();
private readonly CACHE_DURATION = 60 * 60 * 1000;  // 1 hour

async getCachedData(key: string): Promise<any> {
  const cached = this.cache.get(key);
  if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
    return cached.data;
  }

  const data = await this.fetchData(key);
  this.cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

### Conditional Requests (ETags)

Use ETags for efficient updates:

```typescript
async fetchWithETag(url: string, etag?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (etag) {
    headers["If-None-Match"] = etag;
  }

  const response = await requestUrl({ url, headers });
  if (response.status === 304) {
    // Not modified, use cached data
    return cachedData;
  }
  return response.json;
}
```

### Debouncing User Input

Debounce expensive operations triggered by user input:

```typescript
private debounceTimer: number | null = null;

handleSearch(query: string) {
  if (this.debounceTimer) {
    clearTimeout(this.debounceTimer);
  }

  this.debounceTimer = window.setTimeout(() => {
    this.performSearch(query);
  }, 300);
}
```

### Batch Processing

Process items in batches to avoid blocking:

```typescript
async processBatch<T>(items: T[], batchSize: number = 10): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(item => this.processItem(item)));

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

### Background Refresh

Use intervals for background updates:

```typescript
private startBackgroundRefresh(): void {
  this.stopBackgroundRefresh();

  this.refreshInterval = window.setInterval(async () => {
    try {
      await this.refreshData();
    } catch (error) {
      console.warn("Background refresh failed:", error);
    }
  }, 30 * 60 * 1000);  // 30 minutes
}
```

## Testing Patterns

### Test Structure

Organize tests mirroring source structure:

```
tests/
├── setup.ts              # Test setup and mocks
├── mocks/
│   └── obsidian.ts      # Obsidian API mocks
└── services/
    └── MyService.test.ts
```

### Vitest Configuration

Common vitest.config.mts setup (note: use `.mts` extension to avoid Vite CJS deprecation warning):

```typescript
import { defineConfig } from "vitest/config";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      obsidian: path.resolve(__dirname, "./tests/mocks/obsidian-module.ts"),
    },
  },
});
```

**Note**: Use `.mts` extension (not `.ts`) for the Vitest config file to ensure it's treated as an ES Module. This prevents the "CJS build of Vite's Node API is deprecated" warning.

### Mocking Obsidian API

Create mocks for Obsidian types. Use `vi.importActual()` to preserve actual functionality while mocking specific parts:

```typescript
// tests/mocks/obsidian.ts
export const mockApp = {
  vault: {
    read: vi.fn(),
    write: vi.fn(),
    getAbstractFileByPath: vi.fn(),
  },
  workspace: {
    getLeavesOfType: vi.fn(),
  },
} as unknown as App;

// ✅ Good: Partial mocking pattern
vi.mock("obsidian", async () => {
  const actual = await vi.importActual("obsidian");
  return {
    ...actual,
    requestUrl: vi.fn(), // Mock only requestUrl
    // Other actual exports remain unchanged
  };
});

// ✅ Good: Mock utility functions separately
vi.mock("../../src/utils", async () => {
  const actual = await vi.importActual("../../src/utils");
  return {
    ...actual,
    showError: vi.fn(), // Mock only showError
  };
});
```

### Vitest Configuration Best Practices

Use `.mts` extension for Vitest config to avoid CJS deprecation warnings:

```typescript
// vitest.config.mts (note: .mts extension, not .ts)
import { defineConfig } from "vitest/config";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom", // Use happy-dom for DOM testing
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.config.*",
        "**/main.ts", // Main plugin entry point - hard to test without full Obsidian context
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      obsidian: path.resolve(__dirname, "./tests/mocks/obsidian-module.ts"), // Mock obsidian module
    },
  },
});
```

**Key Points:**

- Use `.mts` extension to ensure ES Module treatment
- Use `happy-dom` environment for DOM testing (faster than jsdom)
- Set up aliases to mock Obsidian module automatically
- Exclude main plugin entry point from coverage (hard to test without full Obsidian context)

## Documentation Standards

### README.md Structure

Include these sections:

1. **Description**: What the plugin does
2. **Features**: Key features list
3. **Installation**: How to install
4. **Usage**: How to use the plugin
5. **Settings**: Available settings
6. **Commands**: Available commands
7. **Examples**: Usage examples
8. **Contributing**: How to contribute
9. **License**: License information

### Code Documentation

Document all public APIs:

```typescript
/**
 * Fetches plugin data from the community API
 * @param pluginId - The ID of the plugin to fetch
 * @returns Promise resolving to plugin data
 * @throws Error if the plugin is not found
 */
async fetchPlugin(pluginId: string): Promise<PluginData> {
  // Implementation
}
```

### JSDoc Comments

Use JSDoc for better IDE support:

```typescript
/**
 * Configuration constants for the plugin
 */
export const CONFIG = {
  /** Cache duration in milliseconds */
  cacheDuration: 60 * 60 * 1000,
};
```

## Command Registration

### Command Naming

- Don't include "command" in command names or IDs
- Use descriptive, action-oriented names
- Avoid default hotkeys to prevent conflicts

```typescript
// ✅ Good
this.addCommand({
  id: "open-plugin-browser",
  name: "Open Plugin Browser",
  callback: () => this.openBrowser(),
});

// ❌ Bad
this.addCommand({
  id: "open-command",
  name: "Open Command",
  callback: () => this.openBrowser(),
});
```

### Command with Editor Check

Check if editor is available when needed:

```typescript
this.addCommand({
  id: "format-selection",
  name: "Format Selection",
  editorCallback: (editor: Editor, view: MarkdownView) => {
    // Editor is guaranteed to be available
    const selection = editor.getSelection();
    editor.replaceSelection(this.formatText(selection));
  },
});

// Or check manually
this.addCommand({
  id: "format-selection",
  name: "Format Selection",
  checkCallback: (checking: boolean) => {
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (markdownView) {
      if (!checking) {
        const editor = markdownView.editor;
        const selection = editor.getSelection();
        editor.replaceSelection(this.formatText(selection));
      }
      return true;
    }
    return false;
  },
});
```

### Command with Hotkeys

Register hotkeys for commands:

```typescript
this.addCommand({
  id: "toggle-view",
  name: "Toggle View",
  hotkeys: [{ modifiers: ["Mod"], key: "v" }], // Cmd/Ctrl+V
  callback: () => this.toggleView(),
});
```

## Status Bar Items

### Adding Status Bar Items

Use status bar items to show plugin state or information:

```typescript
private statusBarItem: HTMLElement;

onload() {
  this.statusBarItem = this.addStatusBarItem();
  this.statusBarItem.setText("Plugin Ready");
  this.statusBarItem.addClass("my-plugin-status");
}

updateStatusBar(text: string) {
  this.statusBarItem.setText(text);
}

onunload() {
  // Status bar items are automatically removed
}
```

## Markdown Processors

### Code Block Processors

Process code blocks in markdown:

```typescript
this.registerMarkdownCodeBlockProcessor("my-code-block", (source, el, ctx) => {
  // source: content between code fences
  // el: container element
  // ctx: context with file path, etc.

  const container = el.createEl("div", { cls: "my-code-block" });
  container.textContent = source;

  // Add interactive elements
  const button = container.createEl("button", { text: "Execute" });
  button.onclick = () => this.executeCode(source);
});
```

### Post Processors

Process rendered markdown after rendering:

```typescript
this.registerMarkdownPostProcessor((element, context) => {
  // Process all markdown elements
  const links = element.querySelectorAll("a.internal-link");
  links.forEach((link) => {
    // Modify links, add tooltips, etc.
    link.setAttr("title", "Click to open");
  });
});
```

### Syntax Highlighting

Register custom syntax highlighting:

```typescript
import { MarkdownRenderer } from "obsidian";

this.registerMarkdownCodeBlockProcessor("mermaid", (source, el, ctx) => {
  // Render custom syntax
  const container = el.createEl("div", { cls: "mermaid-container" });
  this.renderMermaid(source, container);
});
```

## Editor Extensions (CodeMirror)

### Registering Editor Extensions

Extend the editor with CodeMirror extensions:

```typescript
import { Editor, MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";

this.registerEditorExtension(
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      // Handle editor changes
      this.onEditorChange(update);
    }
  }),
);
```

### Custom Key Bindings

Add custom keyboard shortcuts:

```typescript
import { keymap } from "@codemirror/view";

this.registerEditorExtension(
  keymap.of([
    {
      key: "Mod-s",
      run: () => {
        this.saveCustom();
        return true; // Prevent default behavior
      },
    },
  ]),
);
```

## View Management

### View Registration Pattern

```typescript
const VIEW_TYPE = "my-plugin-view";

this.registerView(VIEW_TYPE, (leaf) => {
  return new MyView(leaf, this.service);
});

// Open view
const leaf = await this.app.workspace.getLeaf(true);
await leaf.setViewState({ type: VIEW_TYPE, active: true });
```

### View Lifecycle

```typescript
export class MyView extends ItemView {
  async onOpen() {
    // Initialize view
  }

  async onClose() {
    // Cleanup view resources
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "My View";
  }

  getIcon(): string {
    return "icon-name";
  }
}
```

### View State Persistence

Save and restore view state:

```typescript
export class MyView extends ItemView {
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();

    // Restore state if available
    const state = this.getState();
    if (state) {
      this.restoreState(state);
    }
  }

  getState(): any {
    return {
      scrollPosition: this.containerEl.scrollTop,
      selectedItem: this.selectedItemId,
    };
  }

  setState(state: any): void {
    if (state.scrollPosition) {
      this.containerEl.scrollTop = state.scrollPosition;
    }
    if (state.selectedItem) {
      this.selectedItemId = state.selectedItem;
    }
  }
}
```

## Error Handling

### Consistent Error Handling

```typescript
try {
  await this.performOperation();
} catch (error) {
  console.error("Operation failed:", error);
  new Notice(`Failed to perform operation: ${error.message}`);
}
```

### User-Friendly Error Messages

```typescript
catch (error) {
  const message = error instanceof Error
    ? error.message
    : "An unknown error occurred";
  new Notice(`Plugin error: ${message}`);
}
```

### Error Handling Strategy

Distinguish between critical and non-critical errors:

```typescript
// Critical errors: Show to user, block functionality
try {
  await this.installPlugin();
} catch (error) {
  showError(`Failed to install plugin: ${error.message}`);
  throw error; // Re-throw to prevent continuation
}

// Non-critical errors: Log, use fallback, continue
try {
  await this.fetchOptionalData();
} catch (error) {
  console.warn("Failed to fetch optional data:", error);
  // Continue with default values
  return this.getDefaultData();
}
```

### Async Error Handling

Handle errors in async operations properly:

```typescript
// ✅ Good: Handle errors in async IIFE
(async () => {
  try {
    await this.preloadData();
  } catch (error) {
    console.warn("Preload failed:", error);
    // Don't block plugin initialization
  }
})();

// ❌ Bad: Unhandled promise rejection
this.preloadData(); // Errors will be unhandled
```

## Platform Compatibility

### Mobile Considerations

- Test on mobile devices
- Avoid desktop-only APIs when possible
- Set `isDesktopOnly: true` in manifest if necessary
- Handle platform-specific limitations gracefully

### Cross-Platform Path Handling

Always use `normalizePath()` and Obsidian's Vault API for file operations:

```typescript
import { normalizePath } from "obsidian";

const path = normalizePath(this.app.vault.configDir + "/plugins/my-plugin");
```

### Platform Detection

Check platform capabilities when needed:

```typescript
// Check if running on mobile
const isMobile = this.app.isMobile;

// Check if feature is available
if (this.app.vault.adapter.exists) {
  // Use file system adapter
}

// Check Obsidian version
const minVersion = "0.15.0";
if (this.app.vault.configDir) {
  // Feature available
}
```

### Graceful Feature Degradation

Provide fallbacks for unavailable features:

```typescript
async openFile(file: TFile) {
  if (this.app.workspace.openLinkText) {
    // Modern API
    await this.app.workspace.openLinkText(file.path, "");
  } else {
    // Fallback for older versions
    const leaf = this.app.workspace.getLeaf();
    await leaf.openFile(file);
  }
}
```

## ESLint Configuration

### Obsidian-Specific Rules

Use `eslint-plugin-obsidianmd` for Obsidian-specific linting:

```javascript
// eslint.config.mjs
import obsidian from "eslint-plugin-obsidianmd";

export default [
  {
    plugins: {
      obsidian,
    },
    rules: {
      "obsidian/no-var": "error",
      // ... other Obsidian rules
    },
  },
];
```

## Version Management

### Version Bumping

Create a version bump script:

```javascript
// version-bump.mjs
import { readFileSync, writeFileSync } from "fs";

const version = process.argv[2];
const manifest = JSON.parse(readFileSync("manifest.json"));
manifest.version = version;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));
```

### Semantic Versioning

Follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Version File Maintenance

Keep `versions.json` up to date with all plugin versions:

```json
{
  "0.1.0": "0.15.0",
  "0.2.0": "0.15.0",
  "1.0.0": "0.16.0"
}
```

**Important:**

- Add each new version to `versions.json` when releasing
- Map each plugin version to the minimum Obsidian version it requires
- This helps users understand compatibility across versions

### Manifest.json Completeness

Always fill out all manifest fields:

```json
{
  "id": "plugin-id",
  "name": "Plugin Name",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "Clear description.",
  "author": "Your Name", // ✅ Don't leave empty
  "authorUrl": "https://github.com/yourusername", // ✅ Don't leave empty
  "fundingUrl": "", // Optional
  "isDesktopOnly": false
}
```

**Common Mistakes:**

- ❌ Leaving `author` and `authorUrl` empty
- ❌ Starting description with "This plugin"
- ❌ Including "Obsidian" or "plugin" in ID/name unnecessarily

## File System Operations

### File Watchers

Watch for file changes:

```typescript
// Watch for file modifications
this.registerEvent(
  this.app.vault.on("modify", (file) => {
    if (file instanceof TFile && file.extension === "md") {
      this.handleFileModify(file);
    }
  }),
);

// Watch for file creation
this.registerEvent(
  this.app.vault.on("create", (file) => {
    this.handleFileCreate(file);
  }),
);

// Watch for file deletion
this.registerEvent(
  this.app.vault.on("delete", (file) => {
    this.handleFileDelete(file);
  }),
);

// Watch for file renames
this.registerEvent(
  this.app.vault.on("rename", (file, oldPath) => {
    this.handleFileRename(file, oldPath);
  }),
);
```

### Safe File Operations

Always check file existence and handle errors:

```typescript
async safeReadFile(path: string): Promise<string | null> {
  try {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      return await this.app.vault.read(file);
    }
    return null;
  } catch (error) {
    console.error(`Failed to read file ${path}:`, error);
    return null;
  }
}
```

## Async Initialization Patterns

### Background Initialization

Initialize heavy operations in the background:

```typescript
async onload() {
  // Load critical settings first
  await this.loadSettings();

  // Initialize UI immediately
  this.setupUI();

  // Load data in background (don't await)
  this.initializeData().catch((error) => {
    console.warn("Background initialization failed:", error);
  });
}

private async initializeData() {
  // Heavy operations that don't block UI
  await this.preloadCache();
  await this.fetchRemoteData();
}
```

### Progressive Loading

Load data progressively as needed:

```typescript
private dataLoaded = false;

async getData(): Promise<Data> {
  if (!this.dataLoaded) {
    await this.loadData();
    this.dataLoaded = true;
  }
  return this.cachedData;
}
```

## Modal Patterns

### Creating Modals

Use Obsidian's Modal class:

```typescript
import { Modal } from "obsidian";

export class MyModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "My Modal" });

    const input = contentEl.createEl("input", { type: "text" });
    input.placeholder = "Enter value";

    const button = contentEl.createEl("button", { text: "Submit" });
    button.onclick = () => {
      this.onSubmit(input.value);
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  onSubmit(value: string) {
    // Handle submission
  }
}

// Usage
const modal = new MyModal(this.app);
modal.open();
```

### Suggest Modals

Use Suggest for autocomplete:

```typescript
import { FuzzySuggestModal } from "obsidian";

export class MySuggestModal extends FuzzySuggestModal<string> {
  items: string[];

  constructor(app: App, items: string[]) {
    super(app);
    this.items = items;
  }

  getItems(): string[] {
    return this.items;
  }

  getItemText(item: string): string {
    return item;
  }

  onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
    this.onSelect(item);
  }

  onSelect(item: string) {
    // Handle selection
  }
}
```

## Things to Avoid

### Event Listener Management

**❌ Don't:** Rely solely on Obsidian cleaning up DOM elements

```typescript
// Bad: Event listeners may leak if view is closed unexpectedly
onOpen() {
  this.inputEl.addEventListener("input", this.handleInput);
  // No cleanup in onClose()
}
```

**✅ Do:** Explicitly track and clean up event listeners

```typescript
// Good: Track and remove listeners
private trackedListeners: Array<{ element: HTMLElement; event: string; handler: EventListener }> = [];

onOpen() {
  const handler = this.handleInput.bind(this);
  this.inputEl.addEventListener("input", handler);
  this.trackedListeners.push({ element: this.inputEl, event: "input", handler });
}

onClose() {
  for (const { element, event, handler } of this.trackedListeners) {
    element.removeEventListener(event, handler);
  }
  this.trackedListeners = [];
}
```

**❌ Don't:** Use `addEventListener` directly in views without tracking

```typescript
// Bad: No way to clean up
this.searchInput.addEventListener(
  "input",
  debounce(() => {
    this.search();
  }, 300),
);
```

**✅ Do:** Use `registerDomEvent()` when possible, or track debounced handlers

```typescript
// Good: Automatic cleanup
this.registerDomEvent(this.searchInput, "input", () => {
  this.search();
});

// Or for debounced handlers, track manually
const debouncedHandler = debounce(() => this.search(), 300);
this.searchInput.addEventListener("input", debouncedHandler);
this.trackedListeners.push({
  element: this.searchInput,
  event: "input",
  handler: debouncedHandler,
});
```

### Async Operations

**❌ Don't:** Ignore race conditions in async operations

```typescript
// Bad: Multiple rapid calls can cause race conditions
async handleSearch(query: string) {
  const results = await this.search(query);
  this.displayResults(results); // May show stale results
}
```

**✅ Do:** Use AbortController to cancel outdated operations

```typescript
// Good: Cancel previous operations
private searchAbortController: AbortController | null = null;

async handleSearch(query: string) {
  if (this.searchAbortController) {
    this.searchAbortController.abort();
  }
  this.searchAbortController = new AbortController();

  try {
    const results = await this.search(query, { signal: this.searchAbortController.signal });
    this.displayResults(results);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Search failed:", error);
    }
  }
}
```

### Testing

**❌ Don't:** Use `.ts` extension for Vitest config

```typescript
// Bad: May cause CJS deprecation warnings
// vitest.config.ts
export default defineConfig({ ... });
```

**✅ Do:** Use `.mts` extension for Vitest config

```typescript
// Good: Ensures ES Module treatment
// vitest.config.mts
export default defineConfig({ ... });
```

**❌ Don't:** Mock entire modules when you only need to mock specific functions

```typescript
// Bad: Loses all actual functionality
vi.mock("obsidian", () => ({
  requestUrl: vi.fn(),
}));
```

**✅ Do:** Use `vi.importActual()` to preserve actual functionality

```typescript
// Good: Preserves actual exports, only mocks what's needed
vi.mock("obsidian", async () => {
  const actual = await vi.importActual("obsidian");
  return {
    ...actual,
    requestUrl: vi.fn(),
  };
});
```

### Error Handling

**❌ Don't:** Swallow all errors silently

```typescript
// Bad: Errors are hidden
try {
  await this.operation();
} catch (error) {
  // Silent failure
}
```

**✅ Do:** Distinguish between expected and unexpected errors

```typescript
// Good: Handle expected errors, log unexpected ones
try {
  await this.operation();
} catch (error) {
  if (error.name === "AbortError") {
    // Expected - user canceled, ignore
    return;
  }
  console.error("Unexpected error:", error);
  new Notice(`Operation failed: ${error.message}`);
}
```

### Memory Management

**❌ Don't:** Forget to clean up intervals/timeouts in onunload

```typescript
// Bad: Interval continues after plugin unloads
onload() {
  this.interval = setInterval(() => this.refresh(), 60000);
}
```

**✅ Do:** Always clean up in onunload or use registerInterval

```typescript
// Good: Automatic cleanup
onload() {
  this.registerInterval(window.setInterval(() => this.refresh(), 60000));
}

// Or manual cleanup
onunload() {
  if (this.interval) {
    clearInterval(this.interval);
    this.interval = null;
  }
}
```

### Type Safety

**❌ Don't:** Use `any` or unsafe type assertions

```typescript
// Bad: Unsafe type assertion
const file = this.app.vault.getAbstractFileByPath(path) as TFile;
const content = await this.app.vault.read(file);
```

**✅ Do:** Use type guards for safe type checking

```typescript
// Good: Type guard ensures safety
const file = this.app.vault.getAbstractFileByPath(path);
if (file instanceof TFile) {
  const content = await this.app.vault.read(file);
}
```

## Accessibility Best Practices

### ARIA Labels and Roles

Always provide ARIA labels for interactive elements that don't have visible text:

```typescript
// ✅ Good: Button with icon only
const refreshBtn = container.createEl("button", {
  cls: "refresh-button",
  text: "↻",
  attr: {
    "aria-label": "Refresh plugin list",
    type: "button",
  },
});

// ✅ Good: Input with label association
const label = container.createEl("label", {
  text: "Search:",
  attr: { for: "search-input" },
});
const input = container.createEl("input", {
  type: "text",
  attr: {
    id: "search-input",
    "aria-label": "Search plugins",
    role: "searchbox",
  },
});

// ✅ Good: Decorative icons
const icon = container.createSpan("icon");
icon.setAttribute("aria-hidden", "true"); // Hide from screen readers
```

### Keyboard Navigation

Ensure all interactive elements are keyboard accessible:

```typescript
// ✅ Good: Card with keyboard support
const card = container.createDiv("plugin-card");
card.setAttribute("role", "button");
card.setAttribute("tabindex", "0");
card.setAttribute("aria-label", "Plugin: Example Plugin");

this.registerDomEvent(card, "keydown", (evt: KeyboardEvent) => {
  if (evt.key === "Enter" || evt.key === " ") {
    evt.preventDefault();
    this.openPlugin(card);
  }
});

// ✅ Good: Escape key support
this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
  if (evt.key === "Escape") {
    this.close();
  }
});
```

### Focus Management

Manage focus appropriately for better keyboard navigation:

```typescript
// ✅ Good: Set initial focus
async onOpen() {
  this.createUI();
  // Use setTimeout to ensure DOM is ready
  setTimeout(() => {
    this.searchInput?.focus();
  }, 0);
}

// ✅ Good: Return focus after actions
async handleAction() {
  const previousFocus = document.activeElement;
  await this.performAction();
  // Return focus to previous element
  if (previousFocus instanceof HTMLElement) {
    previousFocus.focus();
  }
}
```

### Screen Reader Support

Use live regions for dynamic content updates:

```typescript
// ✅ Good: Status updates with live regions
const statusEl = container.createDiv("status");
statusEl.setAttribute("role", "status");
statusEl.setAttribute("aria-live", "polite"); // Non-intrusive updates
statusEl.setAttribute("aria-atomic", "true"); // Read entire content
statusEl.setText("Loading plugins...");

// ✅ Good: Error messages with assertive live region
const errorEl = container.createDiv("error-message");
errorEl.setAttribute("role", "alert");
errorEl.setAttribute("aria-live", "assertive"); // Interruptive updates
errorEl.setText("Failed to load plugins");
```

### Semantic HTML

Use proper semantic elements and roles:

```typescript
// ✅ Good: Proper heading hierarchy
container.createEl("h1", { text: "Main Title" });
container.createEl("h2", { text: "Section Title" });

// ✅ Good: Regions and landmarks
const mainContent = container.createDiv("main-content");
mainContent.setAttribute("role", "main");
mainContent.setAttribute("aria-label", "Plugin list");

// ✅ Good: Button groups
const buttonGroup = container.createDiv("button-group");
buttonGroup.setAttribute("role", "group");
buttonGroup.setAttribute("aria-label", "Display options");
```

### Focus Indicators

Always provide visible focus indicators in CSS:

```css
/* ✅ Good: Visible focus indicators */
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}

.plugin-card:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
  border-color: var(--interactive-accent);
}
```

### Toggle Buttons

Use proper ARIA attributes for toggle buttons:

```typescript
// ✅ Good: Toggle button with aria-pressed
const toggleBtn = container.createEl("button", {
  text: "Grid",
  attr: {
    "aria-label": "Grid view",
    "aria-pressed": isActive ? "true" : "false",
    type: "button",
  },
});

// Update aria-pressed when state changes
toggleBtn.setAttribute("aria-pressed", "true");
```

### Links

Provide context for external links:

```typescript
// ✅ Good: External link with context
const link = container.createEl("a", {
  href: "https://example.com",
  text: "Learn more",
  attr: {
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": "Learn more (opens in new tab)",
  },
});
```

### Form Controls

Properly associate labels with form controls:

```typescript
// ✅ Good: Label association
const label = container.createEl("label", {
  text: "Filter by date:",
  attr: { for: "date-input" },
});
const input = container.createEl("input", {
  type: "date",
  attr: {
    id: "date-input",
    "aria-label": "Filter plugins updated after this date",
  },
});
```

### Common Accessibility Patterns

1. **All interactive elements should be keyboard accessible**
   - Use `tabindex="0"` for custom interactive elements
   - Handle Enter and Space keys for buttons/cards
   - Handle Escape key for closing modals/views

2. **Provide ARIA labels for all icons and icon-only buttons**
   - Use `aria-label` for descriptive labels
   - Use `aria-hidden="true"` for decorative icons

3. **Use live regions for dynamic content**
   - `aria-live="polite"` for status updates
   - `aria-live="assertive"` for error messages
   - `role="status"` or `role="alert"` as appropriate

4. **Maintain proper heading hierarchy**
   - Use h1, h2, h3 in order
   - Don't skip heading levels

5. **Ensure sufficient color contrast**
   - Use Obsidian's CSS variables for theming
   - Test with screen readers and keyboard navigation

## Additional Resources

- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin) - Official template
- [Obsidian Developer Documentation](https://docs.obsidian.md) - Official docs
- [Obsidian Plugin Developer Docs](https://marcusolsson.github.io/obsidian-plugin-docs/) - Community docs
- [Obsidian Discord #plugin-dev](https://discord.com/channels/686053708261228577/840286264964022302) - Developer community
- [Obsidian Plugin Submission Guidelines](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin) - Submission requirements
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Web Content Accessibility Guidelines
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) - ARIA best practices
