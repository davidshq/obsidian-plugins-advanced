# Obsidian Plugin Development Guide

This document contains key information about Obsidian plugin development that is relevant to building the Community Plugin Browser.

## Plugin Structure

An Obsidian plugin consists of:

- **`main.ts`**: The main TypeScript file containing the plugin's core logic
- **`manifest.json`**: Metadata about the plugin (id, name, version, minAppVersion)
- **`styles.css`**: Optional CSS file for styling the plugin's UI
- **`package.json`**: NPM dependencies and build scripts

## Plugin Lifecycle

The main plugin class extends Obsidian's `Plugin` class and implements lifecycle methods:

```typescript
import { Plugin } from "obsidian";

export default class MyPlugin extends Plugin {
  async onload() {
    // Initialize plugin functionality
    // Register views, commands, settings, etc.
  }

  async onunload() {
    // Cleanup resources
    // Remove event listeners, close views, etc.
  }
}
```

## Key APIs

### View Management

**Creating Custom Views**: Use `ItemView` to create custom views that can be displayed in Obsidian's workspace:

```typescript
import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_MY_VIEW = "my-view";

export class MyView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_MY_VIEW;
  }

  getDisplayText(): string {
    return "My View";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    // Render your UI here
  }

  async onClose() {
    // Cleanup
  }
}
```

**Registering Views**: Register your view type in the plugin's `onload()`:

```typescript
this.registerView(VIEW_TYPE_MY_VIEW, (leaf) => new MyView(leaf));
```

**Opening Views**: Open a view in a leaf:

```typescript
const leaf = this.app.workspace.getLeaf(true);
await leaf.setViewState({
  type: VIEW_TYPE_MY_VIEW,
  active: true,
});
```

### Network Requests

**Fetching Data**: Use Obsidian's `requestUrl` API for making HTTP requests:

```typescript
import { requestUrl } from "obsidian";

const response = await requestUrl({
  url: "https://api.example.com/data",
  method: "GET",
});

const data = response.json;
```

### File System Operations

**Reading Files**: Use the Vault API:

```typescript
const file = this.app.vault.getAbstractFileByPath("path/to/file.md");
if (file instanceof TFile) {
  const content = await this.app.vault.read(file);
}
```

**Writing Files**:

```typescript
await this.app.vault.create("path/to/file.md", content);
```

**Accessing Plugin Directory**: Get the plugin's directory:

```typescript
const pluginDir = this.app.vault.configDir + "/plugins/" + this.manifest.id;
```

### Notifications

**Showing Notifications**: Use the `Notice` class:

```typescript
import { Notice } from "obsidian";

new Notice("Plugin installed successfully!");
```

### Commands

**Registering Commands**: Add commands to the command palette:

```typescript
this.addCommand({
  id: "open-plugin-browser",
  name: "Open Plugin Browser",
  callback: () => {
    // Open the view
  },
});
```

### Settings

**Creating Settings Tab**: Extend `PluginSettingTab`:

```typescript
import { PluginSettingTab, Setting } from "obsidian";

export class MyPluginSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Setting name")
      .setDesc("Setting description")
      .addText((text) =>
        text
          .setPlaceholder("Enter value")
          .setValue(this.plugin.settings.settingValue)
          .onChange(async (value) => {
            this.plugin.settings.settingValue = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
```

## Plugin Installation

Plugins are installed in `.obsidian/plugins/{plugin-id}/` and consist of:

- `main.js`: Compiled JavaScript
- `manifest.json`: Plugin metadata
- `styles.css`: Optional styles

## Development Workflow

1. **Setup**: Clone the sample plugin template or create a new plugin structure
2. **Development**: Write code in TypeScript, compile with `npm run dev`
3. **Testing**: Copy compiled files to `.obsidian/plugins/{plugin-id}/` in a test vault
4. **Reload**: Disable and re-enable the plugin in Obsidian settings, or use Hot-Reload plugin

## Important Considerations

- **Permissions**: Plugins run with full access to the vault and file system
- **Security**: Validate user input and external data
- **Performance**: Cache data when appropriate, use virtual scrolling for large lists
- **Error Handling**: Always handle network errors and invalid data gracefully
- **UI/UX**: Match Obsidian's design patterns and styling
- **Compatibility**: Check `minAppVersion` in manifest.json

## Resources

- [Obsidian Plugin Developer Documentation](https://docs.obsidian.md/Plugins)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Obsidian API Reference](https://github.com/obsidianmd/obsidian-api)
