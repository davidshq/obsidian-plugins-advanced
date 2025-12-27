/**
 * Plugin List View - displays all available plugins in a grid or list format
 */

import { ItemView, WorkspaceLeaf } from "obsidian";
import {
  CommunityPlugin,
  DisplayMode,
  SearchFilters,
  PluginSortOption,
} from "../types";
import { PluginService } from "../services/PluginService";
import { InstallationService } from "../services/InstallationService";
import {
  debounce,
  sanitizeSearchQuery,
  debugLog,
  formatRelativeTime,
  formatNumber,
} from "../utils";
import CommunityPluginBrowserPlugin from "../main";
import { PLUGIN_CONFIG } from "../config";

/**
 * View type identifier for the plugin list view
 * Used when registering and opening the list view
 */
export const VIEW_TYPE_PLUGIN_LIST = "plugin-list-view";

export class PluginListView extends ItemView {
  private pluginService: PluginService;
  private installationService: InstallationService;
  private plugin: CommunityPluginBrowserPlugin;
  private plugins: CommunityPlugin[] = [];
  private filteredPlugins: CommunityPlugin[] = [];
  private displayMode: DisplayMode = "grid";
  private searchFilters: SearchFilters = {
    query: "",
    showInstalledOnly: false,
  };
  private isLoading = false;
  private isFilteringByDate = false;
  private searchInputEl: HTMLInputElement | null = null;
  private toggleInstalledEl: HTMLElement | null = null;
  private updatedAfterInputEl: HTMLInputElement | null = null;
  private pluginsContainerEl: HTMLElement | null = null;
  private modeToggleEl: HTMLElement | null = null;
  private filterAbortController: AbortController | null = null;
  private installedStatusCache: Map<string, boolean> = new Map();
  private refreshButtonEl: HTMLElement | null = null;
  private sortOption: PluginSortOption = "name";
  private sortDirection: "asc" | "desc" = "asc";
  // Track event listeners that need manual cleanup (debounced handlers)
  private trackedListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];
  // Track release info loading to prevent duplicate requests and rate limiting
  private releaseInfoLoading = new Set<string>(); // Set of plugin IDs currently loading
  private releaseInfoQueue: Array<{
    plugin: CommunityPlugin;
    card: HTMLElement;
  }> = [];
  private releaseInfoProcessing = false;
  // Pagination state
  private visiblePluginsCount: number = 0; // Number of plugins currently visible
  private isLoadingMore: boolean = false; // Prevent multiple simultaneous loads
  private intersectionObserver: IntersectionObserver | null = null; // Observer for auto-loading
  private loadMoreSentinel: HTMLElement | null = null; // Sentinel element for IntersectionObserver
  private loadingIndicatorEl: HTMLElement | null = null; // Loading indicator element

  /**
   * Create a new PluginListView instance
   * @param leaf The workspace leaf this view is attached to
   * @param pluginService Service for fetching plugin data
   * @param installationService Service for managing plugin installations
   * @param plugin Reference to the main plugin instance
   */
  constructor(
    leaf: WorkspaceLeaf,
    pluginService: PluginService,
    installationService: InstallationService,
    plugin: CommunityPluginBrowserPlugin,
  ) {
    super(leaf);
    this.pluginService = pluginService;
    this.installationService = installationService;
    this.plugin = plugin;
  }

  /**
   * Get the view type identifier for this view
   * @returns The view type string
   */
  getViewType(): string {
    return VIEW_TYPE_PLUGIN_LIST;
  }

  /**
   * Get the display text shown in the view header
   * @returns The display text for this view
   */
  getDisplayText(): string {
    return "Community Plugins";
  }

  /**
   * Get the icon identifier for this view
   * @returns The icon string identifier
   */
  getIcon(): string {
    return "package";
  }

  /**
   * Initialize the view when it is opened
   * Loads settings, creates the UI, and loads plugins with cache optimization
   */
  async onOpen() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("plugin-browser-container");

    // Load persisted settings
    if (this.plugin.settings.displayMode) {
      this.displayMode = this.plugin.settings.displayMode;
    }
    if (this.plugin.settings.searchFilters) {
      this.searchFilters = {
        query: this.plugin.settings.searchFilters.query || "",
        showInstalledOnly:
          this.plugin.settings.searchFilters.showInstalledOnly || false,
        updatedAfter: this.plugin.settings.searchFilters.updatedAfter
          ? new Date(this.plugin.settings.searchFilters.updatedAfter)
          : undefined,
      };
    }

    // Create header with search and controls
    this.createHeader(container);

    // Create plugins container
    this.pluginsContainerEl = container.createDiv("plugins-container");
    this.pluginsContainerEl.addClass(this.displayMode);

    // Restore search input value
    if (this.searchInputEl && this.searchFilters.query) {
      this.searchInputEl.value = this.searchFilters.query;
    }

    // Restore date filter
    if (this.updatedAfterInputEl && this.searchFilters.updatedAfter) {
      const date = this.searchFilters.updatedAfter;
      const dateString = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
      this.updatedAfterInputEl.value = dateString;
    }

    // Restore installed filter
    if (this.toggleInstalledEl) {
      const checkbox = this.toggleInstalledEl.querySelector(
        "input[type='checkbox']",
      ) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = this.searchFilters.showInstalledOnly;
      }
    }

    // Set up IntersectionObserver for auto-loading
    this.setupIntersectionObserver();

    // Try to load cached plugins first for immediate display
    // Then refresh in the background if cache is stale
    await this.loadPluginsWithCache();
  }

  /**
   * Cleanup when the view is closed
   * Cancels pending operations, removes tracked event listeners, and persists settings
   */
  async onClose() {
    // Cancel any pending filter operations
    if (this.filterAbortController) {
      this.filterAbortController.abort();
      this.filterAbortController = null;
    }

    // Remove tracked event listeners (debounced handlers)
    for (const { element, event, handler } of this.trackedListeners) {
      try {
        element.removeEventListener(event, handler);
      } catch (error) {
        console.warn(`Failed to remove ${event} listener:`, error);
      }
    }
    this.trackedListeners = [];

    // Remove IntersectionObserver
    this.removeIntersectionObserver();

    // Clean up loading indicator if present
    this.hideLoadingIndicator();

    // Clear release info queue and loading state
    this.releaseInfoQueue = [];
    this.releaseInfoLoading.clear();
    this.releaseInfoProcessing = false;

    // Persist settings
    this.plugin.settings.displayMode = this.displayMode;
    this.plugin.settings.searchFilters = {
      query: this.searchFilters.query,
      showInstalledOnly: this.searchFilters.showInstalledOnly,
      updatedAfter: this.searchFilters.updatedAfter?.toISOString(),
    };
    await this.plugin.saveSettings();
  }

  /**
   * Create the header with search bar and controls
   * Sets up search input, filters, display mode toggle, and refresh button.
   * Initializes event listeners for search (debounced), filters, sorting, and display mode.
   * @param container The container element to add the header to
   * @returns void
   */
  private createHeader(container: HTMLElement): void {
    const header = container.createDiv("plugin-browser-header");

    // Search bar with refresh button
    const searchContainer = header.createDiv("search-container");
    const searchIcon = searchContainer.createSpan("search-icon");
    searchIcon.setText("🔍");
    this.searchInputEl = searchContainer.createEl("input", {
      type: "text",
      placeholder: "Search community plugins...",
      cls: "search-input",
    });
    // Track debounced handler for manual cleanup
    const searchHandler = debounce(async () => {
      const rawQuery = this.searchInputEl?.value || "";
      this.searchFilters.query = sanitizeSearchQuery(rawQuery);
      await this.filterPlugins();
    }, PLUGIN_CONFIG.constants.debounceDelay);
    this.searchInputEl.addEventListener("input", searchHandler);
    this.trackedListeners.push({
      element: this.searchInputEl,
      event: "input",
      handler: searchHandler,
    });

    // Refresh button
    this.refreshButtonEl = searchContainer.createEl("button", {
      cls: "refresh-button",
      attr: {
        "aria-label": "Refresh plugin list",
        title: "Refresh plugin list",
      },
    });
    this.refreshButtonEl.setText("↻");
    // Use registerDomEvent for automatic cleanup
    this.registerDomEvent(this.refreshButtonEl, "click", async () => {
      await this.refreshPlugins();
    });

    // Controls row
    const controlsRow = header.createDiv("controls-row");

    // Show installed only toggle
    const toggleContainer = controlsRow.createDiv("toggle-container");
    this.toggleInstalledEl = toggleContainer.createEl("label", {
      cls: "toggle-label",
    });
    const checkbox = this.toggleInstalledEl.createEl("input", {
      type: "checkbox",
      cls: "toggle-checkbox",
    });
    // Use registerDomEvent for automatic cleanup
    this.registerDomEvent(checkbox, "change", async () => {
      this.searchFilters.showInstalledOnly = checkbox.checked;
      await this.filterPlugins();
    });
    this.toggleInstalledEl.createSpan({ text: "Show installed only" });

    // Updated after filter
    const updatedAfterContainer = controlsRow.createDiv(
      "updated-after-container",
    );
    const updatedAfterLabel = updatedAfterContainer.createEl("label", {
      cls: "updated-after-label",
      text: "Updated after:",
    });
    this.updatedAfterInputEl = updatedAfterContainer.createEl("input", {
      type: "date",
      cls: "updated-after-input",
      attr: { id: "updated-after-input" },
    });
    updatedAfterLabel.setAttribute("for", "updated-after-input");

    // Handler function for date changes
    const handleDateChange = async () => {
      const dateValue = this.updatedAfterInputEl?.value;
      debugLog("=== DATE INPUT EVENT FIRED ===");
      debugLog("Date input value:", dateValue);
      debugLog("Date input element:", this.updatedAfterInputEl);

      if (dateValue) {
        // Parse date input value (YYYY-MM-DD format) and create Date at midnight UTC
        const dateParts = dateValue.split("-");
        if (dateParts.length === 3) {
          const [year, month, day] = dateParts.map(Number);
          // Validate date components are valid numbers
          if (
            !isNaN(year) &&
            !isNaN(month) &&
            !isNaN(day) &&
            year > 0 &&
            month >= 1 &&
            month <= 12 &&
            day >= 1 &&
            day <= 31
          ) {
            // Create date and validate it's actually valid (handles month/day mismatches)
            const date = new Date(Date.UTC(year, month - 1, day));
            // Check if date is valid and matches input (catches invalid dates like Feb 31)
            if (
              !isNaN(date.getTime()) &&
              date.getUTCFullYear() === year &&
              date.getUTCMonth() === month - 1 &&
              date.getUTCDate() === day
            ) {
              this.searchFilters.updatedAfter = date;
              debugLog("Date filter set to:", date.toISOString());
            } else {
              console.warn("Invalid date:", dateValue);
              this.searchFilters.updatedAfter = undefined;
              this.isFilteringByDate = false;
            }
          } else {
            console.warn("Invalid date format:", dateValue);
            this.searchFilters.updatedAfter = undefined;
            this.isFilteringByDate = false;
          }
        } else {
          console.warn("Invalid date format:", dateValue);
          this.searchFilters.updatedAfter = undefined;
          this.isFilteringByDate = false;
        }
      } else {
        debugLog("Date input cleared, removing filter");
        this.searchFilters.updatedAfter = undefined;
        this.isFilteringByDate = false;
      }
      // Let filterPlugins() handle setting isFilteringByDate appropriately
      await this.filterPlugins();
    };

    // Add both change and input event listeners
    // 'change' fires when the input loses focus after value changes (most reliable for date inputs)
    // 'input' fires immediately when the value changes
    // Use a shorter debounce for date changes to make it more responsive
    const dateDebounceDelay = 100; // Shorter delay for date changes
    // Track debounced handlers for manual cleanup
    const debouncedDateHandler = debounce(handleDateChange, dateDebounceDelay);
    this.updatedAfterInputEl.addEventListener("change", debouncedDateHandler);
    this.updatedAfterInputEl.addEventListener("input", debouncedDateHandler);
    this.trackedListeners.push(
      {
        element: this.updatedAfterInputEl,
        event: "change",
        handler: debouncedDateHandler,
      },
      {
        element: this.updatedAfterInputEl,
        event: "input",
        handler: debouncedDateHandler,
      },
    );

    debugLog("Date input element created and listeners attached");

    // Display mode toggle
    this.modeToggleEl = controlsRow.createDiv("mode-toggle");
    const gridBtn = this.modeToggleEl.createEl("button", {
      cls: "mode-btn",
      text: "Grid",
    });
    const listBtn = this.modeToggleEl.createEl("button", {
      cls: "mode-btn",
      text: "List",
    });

    // Set initial active state
    if (this.displayMode === "grid") {
      gridBtn.addClass("active");
    } else {
      listBtn.addClass("active");
    }

    const gridHandler = async () => {
      await this.setDisplayMode("grid");
      gridBtn.addClass("active");
      listBtn.removeClass("active");
    };
    const listHandler = async () => {
      await this.setDisplayMode("list");
      gridBtn.removeClass("active");
      listBtn.addClass("active");
    };

    // Use registerDomEvent for automatic cleanup
    this.registerDomEvent(gridBtn, "click", gridHandler);
    this.registerDomEvent(listBtn, "click", listHandler);

    // Sort dropdown
    const sortContainer = controlsRow.createDiv("sort-container");
    const _sortLabel = sortContainer.createEl("label", {
      cls: "sort-label",
      text: "Sort by:",
    });
    const sortSelect = sortContainer.createEl("select", {
      cls: "sort-select",
    });
    sortSelect.createEl("option", { value: "name", text: "Name" });
    sortSelect.createEl("option", { value: "author", text: "Author" });
    sortSelect.createEl("option", { value: "installed", text: "Installed" });
    sortSelect.value = this.sortOption;
    // Use registerDomEvent for automatic cleanup
    this.registerDomEvent(sortSelect, "change", async () => {
      this.sortOption = sortSelect.value as PluginSortOption;
      await this.filterPlugins();
    });

    // Sort direction toggle
    const sortDirBtn = sortContainer.createEl("button", {
      cls: "sort-direction-btn",
      text: this.sortDirection === "asc" ? "↑" : "↓",
      attr: {
        "aria-label": `Sort ${this.sortDirection === "asc" ? "descending" : "ascending"}`,
      },
    });
    // Use registerDomEvent for automatic cleanup
    this.registerDomEvent(sortDirBtn, "click", async () => {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      sortDirBtn.setText(this.sortDirection === "asc" ? "↑" : "↓");
      sortDirBtn.setAttr(
        "aria-label",
        `Sort ${this.sortDirection === "asc" ? "descending" : "ascending"}`,
      );
      await this.filterPlugins();
    });

    // Plugin count (will be updated after plugins load)
    const countEl = controlsRow.createDiv("plugin-count");
    countEl.setText("Loading plugins...");
    this.updatePluginCount(countEl);
  }

  /**
   * Load plugins with cache optimization - shows cached data immediately, then refreshes
   * First attempts to load from cache for immediate display, then refreshes in background
   * if cache is stale. Falls back to normal load if no cache is available.
   * This provides a better user experience by showing data immediately while updating in the background.
   * @returns Promise that resolves when initial load is complete (background refresh continues asynchronously)
   */
  private async loadPluginsWithCache(): Promise<void> {
    // First, try to get cached plugins for immediate display
    try {
      const cachedPlugins =
        await this.pluginService.fetchCommunityPlugins(false);
      if (cachedPlugins && cachedPlugins.length > 0) {
        this.plugins = cachedPlugins;
        await this.filterPlugins();
        // Now refresh in the background to get latest data
        // Don't await - let it run in background
        (async () => {
          try {
            await this.loadPlugins(true);
          } catch (error) {
            console.warn("Background refresh failed:", error);
            // Optionally show a subtle notification that refresh failed
            // but don't disrupt the user experience
          }
        })();
        return;
      }
    } catch (error) {
      console.warn("Failed to load cached plugins:", error);
    }

    // If no cache available, load normally
    await this.loadPlugins(false);
  }

  /**
   * Load plugins from the service
   * Fetches plugins, checks installation status, and applies current filters.
   * Updates loading state and handles errors gracefully.
   * @param forceRefresh If true, bypasses cache and forces a fresh fetch
   * @returns Promise that resolves when plugins are loaded and filtered
   */
  private async loadPlugins(forceRefresh = false): Promise<void> {
    this.isLoading = true;
    this.updateLoadingState();

    try {
      this.plugins =
        await this.pluginService.fetchCommunityPlugins(forceRefresh);

      // Filter and render plugins immediately without waiting for installed status
      // This ensures plugins show up right away
      await this.filterPlugins();

      // Check installed status in the background and update badges when done
      // Don't await - let it run in background so UI is responsive
      this.checkInstalledStatus()
        .then(() => {
          // Update installed badges after status check completes
          this.updateInstalledBadges();
        })
        .catch((error) => {
          console.warn("Failed to check installed status:", error);
        });

      // Clear any previous errors on successful load
      if (this.pluginsContainerEl) {
        const existingErrors =
          this.pluginsContainerEl.querySelectorAll(".error-message");
        existingErrors.forEach((el) => el.remove());
      }
    } catch (error) {
      this.showError("Failed to load plugins. Please try again.");
      console.error("Error loading plugins:", error);
      // Ensure filtering state is reset on error
      this.isFilteringByDate = false;
    } finally {
      this.isLoading = false;
      this.updateLoadingState();
    }
  }

  /**
   * Refresh plugins manually (user-initiated refresh)
   * Forces a refresh even if cache is still valid. Updates the refresh button UI
   * to show loading state during the operation.
   * @returns Promise that resolves when the refresh is complete
   */
  async refreshPlugins(): Promise<void> {
    if (this.refreshButtonEl) {
      this.refreshButtonEl.addClass("refreshing");
      this.refreshButtonEl.setAttr("disabled", "true");
    }

    try {
      // Force refresh - bypasses cache and uses conditional requests
      // If data hasn't changed, we'll get 304 and use cached data
      // If data has changed, we'll download and update cache
      await this.loadPlugins(true);
    } finally {
      if (this.refreshButtonEl) {
        this.refreshButtonEl.removeClass("refreshing");
        this.refreshButtonEl.removeAttribute("disabled");
      }
    }
  }

  /**
   * Check which plugins are installed and cache the results
   * This is called when plugins are loaded to populate the cache.
   * Uses batched parallel checking to avoid overwhelming the file system.
   * @returns Promise that resolves when all installation status checks are complete
   */
  private async checkInstalledStatus(): Promise<void> {
    // Don't clear cache - preserve existing entries to avoid flicker
    // Only check plugins that aren't already cached

    // Check installation status in batches to avoid overwhelming the file system
    const BATCH_SIZE = PLUGIN_CONFIG.constants.statusCheckBatchSize;

    // Filter to only check plugins not in cache
    const pluginsToCheck = this.plugins.filter(
      (plugin) => !this.installedStatusCache.has(plugin.id),
    );

    for (let i = 0; i < pluginsToCheck.length; i += BATCH_SIZE) {
      const batch = pluginsToCheck.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const statusChecks = batch.map(async (plugin) => {
        const isInstalled = await this.installationService.isPluginInstalled(
          plugin.id,
        );
        this.installedStatusCache.set(plugin.id, isInstalled);
        return { pluginId: plugin.id, isInstalled };
      });

      await Promise.all(statusChecks);
    }
  }

  /**
   * Update installed badges on plugin cards after status check completes
   * @returns void
   */
  private updateInstalledBadges(): void {
    if (!this.pluginsContainerEl) return;

    // Find all plugin cards and update their installed badges
    const cards = this.pluginsContainerEl.querySelectorAll(".plugin-card");
    cards.forEach((cardEl) => {
      const card = cardEl as HTMLElement;
      const titleEl = card.querySelector(".plugin-title");
      if (!titleEl) return;

      // Find plugin ID from card (we need to store it or find another way)
      // For now, we'll update based on the cache
      // A better approach would be to store plugin ID as data attribute
      const badge = card.querySelector(".installed-badge");
      if (!badge) return;

      // We need plugin ID - let's add it as a data attribute when creating cards
      const pluginId = card.getAttribute("data-plugin-id");
      if (!pluginId) return;

      const isInstalled = this.installedStatusCache.get(pluginId) ?? false;
      if (isInstalled) {
        badge.removeClass("hidden");
      } else {
        badge.addClass("hidden");
      }
    });
  }

  /**
   * Apply search query filter to plugins
   * @param plugins Array of plugins to filter
   * @returns Filtered array of plugins matching the search query
   */
  private applySearchFilter(plugins: CommunityPlugin[]): CommunityPlugin[] {
    if (!this.searchFilters.query) {
      return plugins;
    }
    return this.pluginService.searchPlugins(plugins, this.searchFilters.query);
  }

  /**
   * Apply installed filter to plugins
   * Uses cached installation status. If cache is empty and filter is active,
   * starts checking status in background but returns empty array initially
   * (will update when status check completes)
   * @param plugins Array of plugins to filter
   * @returns Filtered array containing only installed plugins (if filter is active)
   */
  private async applyInstalledFilter(
    plugins: CommunityPlugin[],
  ): Promise<CommunityPlugin[]> {
    if (!this.searchFilters.showInstalledOnly) {
      return plugins;
    }

    // If cache is empty, start checking in background but don't wait
    // This prevents blocking the UI - user will see plugins appear as status is checked
    if (this.installedStatusCache.size === 0) {
      // Start checking in background
      this.checkInstalledStatus()
        .then(() => {
          // Re-filter and re-render when status check completes
          this.filterPlugins();
        })
        .catch((error) => {
          console.warn("Failed to check installed status for filter:", error);
        });
      // Return empty array initially - plugins will appear as status is checked
      return [];
    }

    // Filter to only show installed plugins using cached status
    return plugins.filter((plugin) => {
      const isInstalled = this.installedStatusCache.get(plugin.id) ?? false;
      return isInstalled;
    });
  }

  /**
   * Apply date filter to plugins based on latest release date
   * Uses batched parallel requests to check release dates efficiently
   * @param plugins Array of plugins to filter
   * @param signal AbortSignal to cancel the operation if needed
   * @returns Filtered array of plugins updated after the selected date
   */
  private async applyDateFilter(
    plugins: CommunityPlugin[],
    signal: AbortSignal,
  ): Promise<CommunityPlugin[]> {
    if (!this.searchFilters.updatedAfter) {
      debugLog("No date filter set, returning all plugins");
      return plugins;
    }

    // If no plugins to filter, return empty array immediately
    if (plugins.length === 0) {
      debugLog("No plugins to filter by date");
      return [];
    }

    // The date is already normalized to UTC midnight from the input handler
    const updatedAfterNormalized = this.searchFilters.updatedAfter;
    debugLog(
      "Applying date filter for plugins updated after:",
      updatedAfterNormalized.toISOString(),
    );
    debugLog("Total plugins to filter:", plugins.length);
    const filteredWithDates: CommunityPlugin[] = [];
    this.isFilteringByDate = true;
    this.updateLoadingState();

    try {
      // Process plugins in batches to avoid rate limiting while improving performance
      // GitHub API allows 60 requests/hour for unauthenticated requests
      // Using batch size of 10 with small delay between batches provides good balance
      // These values balance performance with rate limit compliance
      const BATCH_SIZE = PLUGIN_CONFIG.constants.batchSize;
      const BATCH_DELAY_MS = PLUGIN_CONFIG.constants.batchDelay;

      for (let i = 0; i < plugins.length; i += BATCH_SIZE) {
        // Check if operation was aborted
        if (signal.aborted) {
          this.isFilteringByDate = false;
          return [];
        }

        const batch = plugins.slice(i, i + BATCH_SIZE);

        // Process batch in parallel for better performance
        const batchResults = await this.processDateFilterBatch(
          batch,
          updatedAfterNormalized,
        );

        // Check again after async operation
        if (signal.aborted) {
          this.isFilteringByDate = false;
          this.updateLoadingState();
          return [];
        }

        // Add valid results to filtered list
        for (const result of batchResults) {
          if (result) {
            filteredWithDates.push(result);
          }
        }

        // Add delay between batches to avoid rate limiting (except for last batch)
        if (i + BATCH_SIZE < plugins.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      debugLog(
        "Date filter complete. Filtered plugins:",
        filteredWithDates.length,
      );
      return filteredWithDates;
    } finally {
      this.isFilteringByDate = false;
      this.updateLoadingState();
    }
  }

  /**
   * Process a batch of plugins to check their release dates
   * Checks release dates for all plugins in the batch in parallel for better performance
   * @param batch Array of plugins in the current batch
   * @param updatedAfterNormalized The normalized date (midnight UTC) to compare against
   * @returns Array of plugins that match the date filter (updated on or after the date), or null for plugins that don't match or have no release date
   */
  private async processDateFilterBatch(
    batch: CommunityPlugin[],
    updatedAfterNormalized: Date,
  ): Promise<(CommunityPlugin | null)[]> {
    const batchPromises = batch.map(async (plugin) => {
      try {
        const releaseDate =
          await this.pluginService.getLatestReleaseDate(plugin);

        if (releaseDate) {
          // Normalize release date to midnight UTC for date-only comparison
          // GitHub API returns dates in ISO format (UTC), so we extract the date components
          const releaseDateNormalized = new Date(
            Date.UTC(
              releaseDate.getUTCFullYear(),
              releaseDate.getUTCMonth(),
              releaseDate.getUTCDate(),
            ),
          );
          // Use >= to include plugins updated on or after the selected date
          // This matches user expectations for "updated after" filter
          const matches = releaseDateNormalized >= updatedAfterNormalized;
          if (matches) {
            return plugin;
          }
        }
        // If we can't get release date, exclude the plugin when filtering by date
        // This ensures we only show plugins we can verify meet the date criteria
        return null;
      } catch (error) {
        // Log error but continue filtering other plugins
        console.warn(`Failed to get release date for ${plugin.id}:`, error);
        // Exclude plugin from results if we can't verify its release date
        return null;
      }
    });

    return Promise.all(batchPromises);
  }

  /**
   * Filter plugins based on search query and filters
   * Prevents race conditions by aborting previous filter operations.
   * Applies search query, installed filter, and date filter sequentially.
   * Date filtering uses batched parallel requests for better performance.
   * @returns Promise that resolves when filtering is complete and UI is updated
   */
  private async filterPlugins(): Promise<void> {
    debugLog("=== filterPlugins() called ===");
    debugLog("Search query:", this.searchFilters.query);
    debugLog("Show installed only:", this.searchFilters.showInstalledOnly);
    debugLog("Updated after:", this.searchFilters.updatedAfter?.toISOString());
    debugLog("Total plugins:", this.plugins.length);

    // Cancel any pending filter operation
    if (this.filterAbortController) {
      this.filterAbortController.abort();
    }
    this.filterAbortController = new AbortController();
    const signal = this.filterAbortController.signal;

    // Ensure isFilteringByDate is reset if we don't have a date filter
    // This prevents stuck state when date filter is cleared or plugins are empty
    if (!this.searchFilters.updatedAfter) {
      this.isFilteringByDate = false;
    }

    // Apply filters sequentially
    let filtered = this.applySearchFilter([...this.plugins]);
    debugLog("After search filter:", filtered.length);
    filtered = await this.applyInstalledFilter(filtered);
    debugLog("After installed filter:", filtered.length);
    filtered = await this.applyDateFilter(filtered, signal);
    debugLog("After date filter:", filtered.length);

    // Only update if not aborted
    if (!signal.aborted) {
      // Sort plugins before displaying
      this.filteredPlugins = this.sortPlugins(filtered);
      // Reset pagination when filters change (renderPlugins will handle this)
      this.renderPlugins(true); // Reset pagination
      this.updatePluginCount();
      debugLog(
        "Filter complete. Displaying",
        this.filteredPlugins.length,
        "plugins",
      );
    } else {
      debugLog("Filter operation was aborted");
      // Ensure state is reset even if aborted
      this.isFilteringByDate = false;
      this.updateLoadingState();
    }
  }

  /**
   * Update plugin count display
   * Updates the count text showing how many plugins are currently displayed
   * Shows pagination info if applicable
   * @param countEl Optional element to update. If not provided, finds the count element in the DOM.
   * @returns void
   */
  private updatePluginCount(countEl?: HTMLElement): void {
    if (!countEl) {
      const existing = this.containerEl.querySelector(".plugin-count");
      if (existing) {
        countEl = existing as HTMLElement;
      } else {
        return;
      }
    }
    const totalCount = this.filteredPlugins.length;
    const visibleCount = Math.min(this.visiblePluginsCount, totalCount);
    // Show "X of Y" format when auto-loading, or just total when all are shown
    if (visibleCount < totalCount) {
      countEl.setText(`Showing ${visibleCount} of ${totalCount} plugins:`);
    } else {
      countEl.setText(`Showing ${totalCount} plugins:`);
    }
  }

  /**
   * Set display mode (grid or list)
   * Updates the CSS class on the plugins container and re-renders plugins
   * Preserves pagination state when changing display mode
   * @param mode The display mode to use ("grid" or "list")
   * @returns Promise that resolves when the display mode is set and settings are saved
   */
  private async setDisplayMode(mode: DisplayMode): Promise<void> {
    this.displayMode = mode;
    if (this.pluginsContainerEl) {
      this.pluginsContainerEl.removeClass("grid", "list");
      this.pluginsContainerEl.addClass(mode);
    }
    // Re-render without resetting pagination (preserve visible count)
    // We need to re-render to apply the new display mode classes
    const currentVisibleCount = this.visiblePluginsCount;
    this.renderPlugins(false); // Don't reset pagination
    // Restore pagination state by loading more plugins up to the previous visible count
    if (currentVisibleCount > 0 && this.filteredPlugins.length > 0) {
      const pluginsPerPage = PLUGIN_CONFIG.constants.pluginsPerPage;
      const pagesToShow = Math.ceil(currentVisibleCount / pluginsPerPage);
      // Load additional pages if needed
      for (let i = 1; i < pagesToShow; i++) {
        this.loadMorePlugins();
      }
    }
    // Persist display mode
    this.plugin.settings.displayMode = mode;
    await this.plugin.saveSettings();
  }

  /**
   * Render plugins in the container
   * Optimized to show cached data immediately while loading updates in background.
   * Shows loading indicators when appropriate and handles empty states.
   * Implements pagination to show only a subset of plugins at a time.
   * @param resetPagination If true, resets pagination to show first page. Defaults to true.
   * @returns void
   */
  private renderPlugins(resetPagination = true): void {
    if (!this.pluginsContainerEl) return;

    // Reset pagination when filters change (new search, filter applied, etc.)
    // This ensures we start from the beginning when filtering
    if (resetPagination) {
      this.visiblePluginsCount = 0;
    }

    // If we have plugins to show (even if loading), display them
    // This allows cached data to appear immediately
    if (this.filteredPlugins.length > 0) {
      // Clear container and reset release info queue (plugins are being re-rendered)
      this.pluginsContainerEl.empty();
      this.releaseInfoQueue = [];
      this.releaseInfoLoading.clear();
      this.releaseInfoProcessing = false;

      // Calculate how many plugins to show (pagination)
      const pluginsPerPage = PLUGIN_CONFIG.constants.pluginsPerPage;
      const pluginsToShow = Math.min(
        this.visiblePluginsCount + pluginsPerPage,
        this.filteredPlugins.length,
      );
      const visiblePlugins = this.filteredPlugins.slice(0, pluginsToShow);

      // Render visible plugins
      for (const plugin of visiblePlugins) {
        this.createPluginCard(plugin);
      }

      // Update visible count
      this.visiblePluginsCount = pluginsToShow;

      // Update sentinel element for IntersectionObserver
      this.updateLoadMoreSentinel();

      // If still loading or filtering, add a subtle indicator
      if (this.isLoading || this.isFilteringByDate) {
        const loadingIndicator =
          this.pluginsContainerEl.createDiv("loading-indicator");
        loadingIndicator.setText(
          this.isFilteringByDate ? "Filtering by date..." : "Refreshing...",
        );
      }
      return;
    }

    // No plugins to show - show appropriate message
    this.pluginsContainerEl.empty();

    if (this.isLoading) {
      this.pluginsContainerEl
        .createDiv("loading-message")
        .setText("Loading plugins...");
      return;
    }

    if (this.isFilteringByDate) {
      this.pluginsContainerEl
        .createDiv("loading-message")
        .setText("Filtering by date...");
      return;
    }

    // Show empty state message (redundant check removed)
    let message = "No plugins found. Try adjusting your search.";
    if (
      this.searchFilters.showInstalledOnly &&
      this.searchFilters.updatedAfter
    ) {
      message =
        "No installed plugins found updated after the selected date. Try adjusting your filters.";
    } else if (this.searchFilters.showInstalledOnly) {
      message = "No installed plugins found. Try adjusting your filters.";
    } else if (this.searchFilters.updatedAfter) {
      message =
        "No plugins found updated after the selected date. Try adjusting your filters.";
    }
    this.pluginsContainerEl.createDiv("empty-message").setText(message);
    // Reset pagination on empty state
    this.visiblePluginsCount = 0;
    return;
  }

  /**
   * Set up IntersectionObserver for auto-loading plugins
   * Uses IntersectionObserver API for better performance than scroll events
   * Automatically loads more plugins when sentinel element becomes visible
   * Uses configurable threshold from settings
   * Public method to allow settings tab to update observer when threshold changes
   * @returns void
   */
  public setupIntersectionObserver(): void {
    // Remove existing observer if any
    this.removeIntersectionObserver();

    // Get pagination threshold from settings (default: 200px)
    const threshold = this.plugin.settings.paginationThreshold ?? 200;

    // Create IntersectionObserver with rootMargin to trigger before reaching bottom
    // rootMargin creates a "trigger zone" - positive value extends the viewport
    // so the observer triggers when sentinel is within threshold pixels of viewport
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !this.isLoadingMore) {
            this.loadMorePlugins();
          }
        }
      },
      {
        rootMargin: `0px 0px ${threshold}px 0px`, // Trigger when sentinel is within threshold pixels of bottom
        threshold: 0.0, // Trigger as soon as any part of sentinel enters viewport
      },
    );

    // Create sentinel element if it doesn't exist
    this.updateLoadMoreSentinel();
  }

  /**
   * Remove IntersectionObserver
   * Cleans up the observer and sentinel element
   * @returns void
   */
  /**
   * Remove IntersectionObserver
   * Cleans up the observer and sentinel element.
   * Properly unobserves sentinel before removing to prevent memory leaks.
   * @returns void
   */
  private removeIntersectionObserver(): void {
    // Unobserve sentinel before disconnecting observer
    if (this.loadMoreSentinel && this.intersectionObserver) {
      this.intersectionObserver.unobserve(this.loadMoreSentinel);
    }

    // Disconnect observer (this also unobserves all observed elements)
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // Remove sentinel element
    if (this.loadMoreSentinel) {
      this.loadMoreSentinel.remove();
      this.loadMoreSentinel = null;
    }
  }

  /**
   * Update or create the sentinel element for IntersectionObserver
   * The sentinel is placed at the bottom of the plugin list to trigger loading.
   * Automatically unobserves old sentinel before creating new one to prevent memory leaks.
   * @returns void
   */
  private updateLoadMoreSentinel(): void {
    if (!this.pluginsContainerEl) return;

    // Unobserve existing sentinel before removing it
    if (this.loadMoreSentinel && this.intersectionObserver) {
      this.intersectionObserver.unobserve(this.loadMoreSentinel);
      this.loadMoreSentinel.remove();
      this.loadMoreSentinel = null;
    }

    // Only create sentinel if there are more plugins to load
    if (this.visiblePluginsCount < this.filteredPlugins.length) {
      // Create sentinel element (invisible element at bottom of list)
      this.loadMoreSentinel =
        this.pluginsContainerEl.createDiv("load-more-sentinel");
      // Set CSS properties using Obsidian's setCssProps for better theming
      this.loadMoreSentinel.setCssProps({
        height: "1px",
        width: "100%",
      });

      // Observe the sentinel element
      if (this.intersectionObserver) {
        this.intersectionObserver.observe(this.loadMoreSentinel);
      }
    }
  }

  /**
   * Load more plugins (pagination)
   * Increases the visible plugins count and renders more plugin cards.
   * Called automatically when IntersectionObserver detects sentinel element.
   * Prevents multiple simultaneous loads using isLoadingMore flag.
   * Shows loading indicator during load.
   * @returns void
   */
  private loadMorePlugins(): void {
    if (
      !this.pluginsContainerEl ||
      this.isLoadingMore ||
      this.visiblePluginsCount >= this.filteredPlugins.length
    ) {
      return;
    }

    this.isLoadingMore = true;
    this.showLoadingIndicator();

    const pluginsPerPage = PLUGIN_CONFIG.constants.pluginsPerPage;
    const pluginsToShow = Math.min(
      this.visiblePluginsCount + pluginsPerPage,
      this.filteredPlugins.length,
    );
    const newPlugins = this.filteredPlugins.slice(
      this.visiblePluginsCount,
      pluginsToShow,
    );

    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      try {
        // Render new plugins
        for (const plugin of newPlugins) {
          this.createPluginCard(plugin);
        }

        // Update visible count
        this.visiblePluginsCount = pluginsToShow;

        // Update plugin count display
        this.updatePluginCount();

        // Update sentinel element
        this.updateLoadMoreSentinel();

        // Hide loading indicator
        this.hideLoadingIndicator();

        this.isLoadingMore = false;
      } catch (error) {
        // Ensure cleanup on error
        console.error("Error loading more plugins:", error);
        this.hideLoadingIndicator();
        this.isLoadingMore = false;
      }
    });
  }

  /**
   * Show loading indicator when auto-loading more plugins
   * Creates a subtle loading indicator at the bottom of the list
   * @returns void
   */
  private showLoadingIndicator(): void {
    if (!this.pluginsContainerEl || this.loadingIndicatorEl) return;

    this.loadingIndicatorEl = this.pluginsContainerEl.createDiv(
      "pagination-loading-indicator",
    );
    this.loadingIndicatorEl.setText("Loading more plugins...");
  }

  /**
   * Hide loading indicator after plugins are loaded
   * @returns void
   */
  private hideLoadingIndicator(): void {
    if (this.loadingIndicatorEl) {
      this.loadingIndicatorEl.remove();
      this.loadingIndicatorEl = null;
    }
  }

  /**
   * Create a plugin card element
   * Creates a clickable card displaying plugin information (name, author, description)
   * @param plugin The plugin to create a card for
   * @returns void
   */
  private createPluginCard(plugin: CommunityPlugin): void {
    if (!this.pluginsContainerEl) return;

    const card = this.pluginsContainerEl.createDiv("plugin-card");
    // Store plugin ID as data attribute for later badge updates
    card.setAttribute("data-plugin-id", plugin.id);
    // Use registerDomEvent for automatic cleanup (card is recreated on each render, but this ensures cleanup)
    this.registerDomEvent(card, "click", () => {
      this.openPluginDetail(plugin);
    });

    // Plugin header
    const header = card.createDiv("plugin-card-header");
    header.createEl("h3", { cls: "plugin-title", text: plugin.name });
    const installedBadge = header.createDiv("installed-badge");
    installedBadge.setText("INSTALLED");
    // Show badge if plugin is installed (check cache, fallback to false if not cached)
    const isInstalled = this.installedStatusCache.get(plugin.id) ?? false;
    if (!isInstalled) {
      installedBadge.addClass("hidden");
    }

    // Plugin meta
    const meta = card.createDiv("plugin-meta");
    meta.createEl("div", { cls: "plugin-author", text: `By ${plugin.author}` });

    // Plugin description
    const description = card.createDiv("plugin-description");
    description.setText(plugin.description);

    // Queue release info loading instead of loading immediately
    // This prevents overwhelming the GitHub API with hundreds of simultaneous requests
    // Release info will be loaded lazily in batches
    this.queueReleaseInfo(plugin, card);
  }

  /**
   * Queue release info loading for a plugin card
   * Adds the plugin to a queue that will be processed in batches to avoid rate limiting
   * @param plugin The plugin to load release info for
   * @param card The card element to update
   * @returns void
   */
  private queueReleaseInfo(plugin: CommunityPlugin, card: HTMLElement): void {
    // Skip if already loading or queued
    if (this.releaseInfoLoading.has(plugin.id)) {
      return;
    }

    // Add to queue
    this.releaseInfoQueue.push({ plugin, card });

    // Start processing queue if not already processing
    if (!this.releaseInfoProcessing) {
      this.processReleaseInfoQueue();
    }
  }

  /**
   * Process the release info queue in batches
   * Processes plugins in small batches with delays to avoid GitHub API rate limits
   * @returns void
   */
  private async processReleaseInfoQueue(): Promise<void> {
    if (this.releaseInfoProcessing) {
      return;
    }

    this.releaseInfoProcessing = true;
    const BATCH_SIZE = 5; // Process 5 plugins at a time
    const BATCH_DELAY = 2000; // 2 second delay between batches to avoid rate limits

    while (this.releaseInfoQueue.length > 0) {
      // Take a batch from the queue
      const batch = this.releaseInfoQueue.splice(0, BATCH_SIZE);

      // Process batch in parallel
      const promises = batch.map(({ plugin, card }) =>
        this.loadReleaseInfo(plugin, card),
      );

      await Promise.allSettled(promises);

      // Wait before processing next batch (unless queue is empty)
      if (this.releaseInfoQueue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }

    this.releaseInfoProcessing = false;
  }

  /**
   * Load release information (date and downloads) for a plugin card
   * Fetches data asynchronously and updates the card when available
   * @param plugin The plugin to load release info for
   * @param card The card element to update
   * @returns void
   */
  private async loadReleaseInfo(
    plugin: CommunityPlugin,
    card: HTMLElement,
  ): Promise<void> {
    // Skip if already loading
    if (this.releaseInfoLoading.has(plugin.id)) {
      return;
    }

    this.releaseInfoLoading.add(plugin.id);

    try {
      const releaseInfo = await this.pluginService.getLatestReleaseInfo(
        plugin,
        false,
      );

      if (!releaseInfo) {
        // No release info available, don't show footer
        return;
      }

      // Only create footer if we have data to show
      // Check if card still exists (user might have navigated away)
      if (!card.parentElement) {
        return;
      }

      // Create footer only in grid view
      if (this.displayMode === "grid") {
        const footer = card.createDiv("plugin-card-footer");
        const footerContent = footer.createDiv("plugin-footer-content");

        // Add downloads if available
        if (releaseInfo.downloads > 0) {
          const downloadsEl = footerContent.createSpan("plugin-downloads");
          downloadsEl.setText(
            `📥 ${formatNumber(releaseInfo.downloads)} downloads`,
          );
        }

        // Add separator between downloads and updated if downloads exist
        if (releaseInfo.downloads > 0) {
          footerContent.createSpan("plugin-footer-separator").setText(" • ");
        }

        // Add updated date
        const updatedEl = footerContent.createSpan("plugin-updated");
        updatedEl.setText(
          `Updated ${formatRelativeTime(releaseInfo.date.toISOString())}`,
        );
      }
    } catch (error) {
      // Silently fail - release info is nice to have but not critical
      console.warn(`Failed to load release info for ${plugin.id}:`, error);
    } finally {
      this.releaseInfoLoading.delete(plugin.id);
    }
  }

  /**
   * Open plugin detail view
   * Dispatches a custom event that the main plugin class listens for
   * @param plugin The plugin to show details for
   * @returns void
   */
  private openPluginDetail(plugin: CommunityPlugin): void {
    // This will be handled by the main plugin class
    // For now, we'll emit an event or use a callback
    const event = new CustomEvent("plugin-selected", { detail: plugin });
    this.containerEl.dispatchEvent(event);
  }

  /**
   * Update loading state UI
   * Adds or removes loading CSS class and triggers re-render.
   * Note: renderPlugins() is called separately to avoid double rendering.
   * Preserves pagination state when updating loading state.
   * @returns void
   */
  private updateLoadingState(): void {
    if (this.pluginsContainerEl) {
      if (this.isLoading || this.isFilteringByDate) {
        this.pluginsContainerEl.addClass("loading");
      } else {
        this.pluginsContainerEl.removeClass("loading");
        // Remove any loading indicators when loading completes
        const loadingIndicator =
          this.pluginsContainerEl.querySelector(".loading-indicator");
        if (loadingIndicator) {
          loadingIndicator.remove();
        }
      }
    }
    // Render plugins to update UI state, preserve pagination
    this.renderPlugins(false);
  }

  /**
   * Sort plugins based on current sort option and direction
   * @param plugins Array of plugins to sort
   * @returns Sorted array of plugins
   */
  private sortPlugins(plugins: CommunityPlugin[]): CommunityPlugin[] {
    const sorted = [...plugins];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (this.sortOption) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "author":
          comparison = a.author.localeCompare(b.author);
          break;
        case "installed": {
          const aInstalled = this.installedStatusCache.get(a.id) ?? false;
          const bInstalled = this.installedStatusCache.get(b.id) ?? false;
          comparison = aInstalled === bInstalled ? 0 : aInstalled ? -1 : 1;
          break;
        }
        case "updated":
          // For updated, we'd need to fetch release dates, which is expensive
          // For now, fall back to name sorting
          comparison = a.name.localeCompare(b.name);
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }

      return this.sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Show error message
   * Clears any existing error messages first, then displays the new error message
   * @param message The error message to display
   * @returns void
   */
  private showError(message: string): void {
    if (this.pluginsContainerEl) {
      // Remove any existing error messages
      const existingErrors =
        this.pluginsContainerEl.querySelectorAll(".error-message");
      existingErrors.forEach((el) => el.remove());

      const errorEl = this.pluginsContainerEl.createDiv("error-message");
      errorEl.setText(message);
    }
  }
}
