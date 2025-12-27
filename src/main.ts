/**
 * Main plugin file for Community Plugin Browser
 */

import { Plugin, WorkspaceLeaf } from "obsidian";
import { PluginService } from "./services/PluginService";
import { InstallationService } from "./services/InstallationService";
import { PluginListView, VIEW_TYPE_PLUGIN_LIST } from "./views/PluginListView";
import {
  PluginDetailView,
  VIEW_TYPE_PLUGIN_DETAIL,
} from "./views/PluginDetailView";
import {
  CommunityPlugin,
  PluginSettings,
  ViewLocation,
  PluginInfo,
} from "./types";
import { PluginSettingTab } from "./settings/PluginSettingTab";
import { PLUGIN_CONFIG } from "./config";
import { isCustomEvent, hasOpenPopoutLeaf } from "./utils";

const DEFAULT_SETTINGS: PluginSettings = {
  viewLocation: "right",
  displayMode: "grid",
  searchFilters: {
    query: "",
    showInstalledOnly: false,
  },
  paginationThreshold: 200, // Default: load more when within 200px of bottom
  dataRefreshIntervalMinutes: 30, // Default: refresh every 30 minutes (2x/hour)
};

export default class CommunityPluginBrowserPlugin extends Plugin {
  settings!: PluginSettings;
  pluginService!: PluginService; // Made public for settings access
  private installationService!: InstallationService;
  private backgroundRefreshIntervalId: number | undefined = undefined;
  private eventHandlers: Map<WorkspaceLeaf, Record<string, EventListener>> =
    new Map();

  /**
   * Initialize the plugin when Obsidian loads it
   * Sets up services, registers views, adds settings tab, and registers commands
   */
  async onload() {
    // Note: Obsidian automatically loads styles.css from the plugin directory
    // Ensure styles.css is copied to .obsidian/plugins/community-plugin-browser/styles.css

    // Load settings
    await this.loadSettings();

    // Initialize services
    this.pluginService = new PluginService();
    this.installationService = new InstallationService(this.app);

    // Update cache duration based on refresh interval setting
    this.updateCacheDuration();

    // Preload plugin data and stats in the background for faster initial view load
    // This ensures cached data is available immediately when the view opens
    (async () => {
      try {
        await Promise.all([
          this.pluginService.fetchCommunityPlugins(),
          this.pluginService.fetchPluginStats(),
        ]);
      } catch (error) {
        console.warn("Failed to preload plugins or stats:", error);
      }
    })();

    // Start background refresh mechanism to proactively update cache
    this.startBackgroundRefresh();

    // Register views
    this.registerView(VIEW_TYPE_PLUGIN_LIST, (leaf) => {
      return new PluginListView(
        leaf,
        this.pluginService,
        this.installationService,
        this,
      );
    });

    this.registerView(VIEW_TYPE_PLUGIN_DETAIL, (leaf) => {
      return new PluginDetailView(
        leaf,
        this.pluginService,
        this.installationService,
      );
    });

    // Add settings tab
    this.addSettingTab(new PluginSettingTab(this));

    // Register command to open plugin browser
    this.addCommand({
      id: "open-plugin-browser",
      name: "Open Community Plugin Browser",
      callback: () => {
        this.openPluginListView();
      },
    });

    // Add ribbon icon (optional)
    this.addRibbonIcon("package", "Community Plugin Browser", () => {
      this.openPluginListView();
    });
  }

  /**
   * Load plugin settings from Obsidian's data storage
   * Merges loaded data with default settings
   */
  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData ?? {});
  }

  /**
   * Save plugin settings to Obsidian's data storage
   */
  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Cleanup when the plugin is unloaded
   *
   * Removes all custom event listeners registered through `registerCustomEventListener()`.
   * This ensures proper cleanup of cross-view communication handlers.
   *
   * **Automatic Cleanup:**
   * - Background refresh interval is automatically cleaned up via `registerInterval()`
   * - DOM event listeners in views are cleaned up via `registerDomEvent()` or manual tracking
   *
   * **Manual Cleanup:**
   * - Custom event listeners are manually removed here since they're not standard DOM events
   */
  async onunload() {
    // Clean up event listeners from all open views
    const { workspace } = this.app;
    const listLeaves = workspace.getLeavesOfType(VIEW_TYPE_PLUGIN_LIST);
    const detailLeaves = workspace.getLeavesOfType(VIEW_TYPE_PLUGIN_DETAIL);

    // Clean up list view handlers
    for (const leaf of listLeaves) {
      if (leaf.view instanceof PluginListView) {
        const handlers = this.eventHandlers.get(leaf);
        const handler = handlers?.["plugin-selected"];
        if (handler) {
          try {
            leaf.view.containerEl.removeEventListener(
              "plugin-selected",
              handler,
            );
          } catch (error) {
            console.warn("Failed to remove plugin-selected listener:", error);
          }
        }
      }
    }

    // Clean up detail view handlers
    for (const leaf of detailLeaves) {
      if (leaf.view instanceof PluginDetailView) {
        const handlers = this.eventHandlers.get(leaf);
        const handler = handlers?.["navigate-back"];
        if (handler) {
          try {
            leaf.view.containerEl.removeEventListener("navigate-back", handler);
          } catch (error) {
            console.warn("Failed to remove navigate-back listener:", error);
          }
        }
      }
    }

    // Clear handlers map
    this.eventHandlers.clear();
  }

  /**
   * Get the background refresh interval in milliseconds
   * Uses the user's setting or defaults to 30 minutes (2x/hour)
   * @returns Refresh interval in milliseconds
   */
  private getBackgroundRefreshInterval(): number {
    const minutes = this.settings.dataRefreshIntervalMinutes ?? 30;
    return minutes * 60 * 1000; // Convert minutes to milliseconds
  }

  /**
   * Calculate cache duration based on refresh interval
   * Cache duration is refresh interval + 5 minute buffer to account for timing variations
   * @returns Cache duration in milliseconds
   */
  private getCacheDuration(): number {
    const refreshIntervalMs = this.getBackgroundRefreshInterval();
    const bufferMs = 5 * 60 * 1000; // 5 minute buffer
    return refreshIntervalMs + bufferMs;
  }

  /**
   * Update cache duration in PluginService based on current settings
   * Should be called when settings change
   */
  private updateCacheDuration(): void {
    if (this.pluginService) {
      const cacheDuration = this.getCacheDuration();
      this.pluginService.setCacheDuration(cacheDuration);
    }
  }

  /**
   * Start background refresh mechanism
   * Checks for plugin updates at the configured interval using conditional requests.
   * Only downloads data if it has actually changed (via ETags).
   * Restarts the interval if it's already running (e.g., when settings change).
   * Made public so settings tab can restart it when refresh interval changes.
   */
  startBackgroundRefresh(): void {
    // Ensure services are initialized before starting refresh
    if (!this.pluginService) {
      console.warn(
        "Cannot start background refresh: pluginService not initialized",
      );
      return;
    }

    // Stop existing interval if running (e.g., settings changed)
    // clearInterval is safe to call with undefined, so no check needed
    window.clearInterval(this.backgroundRefreshIntervalId);

    const intervalMs = this.getBackgroundRefreshInterval();

    // Set up interval to refresh plugins and stats periodically
    // Uses conditional requests (ETags) so only downloads if data changed
    const intervalId = window.setInterval(async () => {
      try {
        if (this.pluginService) {
          // Refresh both plugins and stats in parallel
          await Promise.all([
            this.pluginService.refreshPluginsIfChanged(),
            this.pluginService.fetchPluginStats(false), // Uses conditional request
          ]);
        }
      } catch (error) {
        console.warn("Background refresh failed:", error);
      }
    }, intervalMs);

    // Store interval ID and register for automatic cleanup on plugin unload
    this.backgroundRefreshIntervalId = intervalId;
    this.registerInterval(intervalId);
  }

  /**
   * Register a custom event listener for a workspace leaf
   *
   * This method manages custom event listeners that communicate between views.
   * Custom events (like "plugin-selected" and "navigate-back") are used to coordinate
   * navigation between PluginListView and PluginDetailView.
   *
   * **Cleanup Strategy:**
   * - All listeners registered through this method are automatically cleaned up in `onunload()`
   * - Handlers are stored in `eventHandlers` Map keyed by WorkspaceLeaf
   * - This ensures no memory leaks when the plugin is unloaded or views are closed
   *
   * **Why not use registerDomEvent?**
   * - `registerDomEvent` is designed for standard DOM events (click, input, etc.)
   * - Custom events require manual tracking since they're not part of the standard DOM event system
   * - This pattern allows us to cleanly manage cross-view communication
   *
   * @param element The element to attach the listener to (typically view.containerEl)
   * @param eventType The custom event type to listen for (e.g., "plugin-selected", "navigate-back")
   * @param handler The event handler function to execute when the event fires
   * @param leaf The workspace leaf associated with this listener (used for cleanup tracking)
   */
  private registerCustomEventListener(
    element: HTMLElement,
    eventType: string,
    handler: EventListener,
    leaf: WorkspaceLeaf,
  ): void {
    // Get or create handlers map entry for this leaf
    let handlers = this.eventHandlers.get(leaf);
    if (!handlers) {
      handlers = {};
      this.eventHandlers.set(leaf, handlers);
    }

    // Remove existing listener if any to prevent duplicates
    const existingHandler = handlers[eventType];
    if (existingHandler) {
      try {
        element.removeEventListener(eventType, existingHandler);
      } catch (error) {
        console.warn(`Failed to remove existing ${eventType} listener:`, error);
      }
    }

    // Store and add new listener
    handlers[eventType] = handler;
    element.addEventListener(eventType, handler);
  }

  /**
   * Open the plugin list view based on settings
   * Creates or activates the plugin list view in the configured location.
   * Sets up event listeners for plugin selection after a short delay
   * to ensure the view is fully initialized.
   */
  private async openPluginListView(): Promise<void> {
    const { workspace } = this.app;
    const location = this.settings.viewLocation;

    // Check if view is already open
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_PLUGIN_LIST);
    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      // Create new leaf based on location preference
      leaf = await this.createLeafInLocation(location);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_PLUGIN_LIST,
          active: true,
        });
      }
    }

    // Set the leaf as active
    if (leaf) {
      workspace.setActiveLeaf(leaf, { focus: true });
    }

    // Wait for view to be ready, then set up event listener
    // Use a named function so we can remove it later to prevent duplicates
    if (leaf) {
      // Small delay to ensure view is fully initialized before attaching event listeners
      // This prevents race conditions where the view might not be ready to receive events
      await new Promise((resolve) =>
        window.setTimeout(
          resolve,
          PLUGIN_CONFIG.constants.viewInitializationDelay,
        ),
      );

      // Listen for plugin selection events
      if (leaf.view instanceof PluginListView) {
        // Create handler for plugin selection
        const handler: EventListener = async (event: Event) => {
          if (isCustomEvent<CommunityPlugin>(event)) {
            const plugin: CommunityPlugin = event.detail;
            await this.openPluginDetailView(plugin);
          }
        };

        // Register the event listener using helper method
        this.registerCustomEventListener(
          leaf.view.containerEl,
          "plugin-selected",
          handler,
          leaf,
        );
      }
    }
  }

  /**
   * Create a leaf in the specified location
   * Creates a new workspace leaf in the requested location (main, right sidebar, or new window)
   * @param location The location where the leaf should be created
   * @returns The created leaf, or null if creation failed
   */
  private async createLeafInLocation(
    location: ViewLocation,
  ): Promise<WorkspaceLeaf | null> {
    const { workspace } = this.app;

    switch (location) {
      case "main": {
        // Open in main editor area
        return workspace.getLeaf(true);
      }

      case "window": {
        // Open in new window
        // Note: openPopoutLeaf may not be available in all Obsidian versions
        try {
          if (hasOpenPopoutLeaf(workspace)) {
            return workspace.openPopoutLeaf();
          }
        } catch (error) {
          console.warn("openPopoutLeaf not available:", error);
        }
        // Fallback to main area if popout not available
        return workspace.getLeaf(true);
      }

      case "right":
      default: {
        // Open in right sidebar (default behavior)
        const rightLeaf = workspace.getRightLeaf(false);
        if (rightLeaf) {
          return rightLeaf;
        }
        const mostRecent = workspace.getMostRecentLeaf();
        if (mostRecent) {
          return workspace.createLeafBySplit(mostRecent);
        }
        return workspace.getLeaf(true);
      }
    }
  }

  /**
   * Open the plugin detail view
   * Creates or activates the plugin detail view and loads the specified plugin's details.
   * Sets up event listeners for back navigation.
   * @param plugin The plugin to show details for
   */
  private async openPluginDetailView(plugin: CommunityPlugin): Promise<void> {
    const { workspace } = this.app;
    const location = this.settings.viewLocation;

    // Create or get detail view leaf
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_PLUGIN_DETAIL);
    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      // Create new leaf based on location preference
      leaf = await this.createLeafInLocation(location);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_PLUGIN_DETAIL,
          active: true,
        });
      }
    }

    // Set the leaf as active
    if (leaf) {
      workspace.setActiveLeaf(leaf, { focus: true });

      // Load plugin details
      if (leaf.view instanceof PluginDetailView) {
        // Convert CommunityPlugin to PluginInfo format expected by loadPlugin
        const pluginInfo: PluginInfo = {
          ...plugin,
          manifest: undefined,
          readme: undefined,
          installed: undefined,
          installedVersion: undefined,
        };
        await leaf.view.loadPlugin(pluginInfo);

        // Listen for back navigation
        const backHandler: EventListener = () => {
          this.openPluginListView();
        };

        // Register the event listener using helper method
        this.registerCustomEventListener(
          leaf.view.containerEl,
          "navigate-back",
          backHandler,
          leaf,
        );
      }
    }
  }
}
