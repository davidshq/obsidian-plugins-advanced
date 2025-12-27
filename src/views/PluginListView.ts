/**
 * Plugin List View - displays all available plugins in a grid or list format
 */

import { ItemView, WorkspaceLeaf } from "obsidian";
import { CommunityPlugin, DisplayMode, SearchFilters } from "../types";
import { PluginService } from "../services/PluginService";
import { InstallationService } from "../services/InstallationService";
import { debounce } from "../utils";

export const VIEW_TYPE_PLUGIN_LIST = "plugin-list-view";

export class PluginListView extends ItemView {
	private pluginService: PluginService;
	private installationService: InstallationService;
	private plugins: CommunityPlugin[] = [];
	private filteredPlugins: CommunityPlugin[] = [];
	private displayMode: DisplayMode = "grid";
	private searchFilters: SearchFilters = {
		query: "",
		showInstalledOnly: false,
	};
	private isLoading = false;
	private searchInputEl: HTMLInputElement | null = null;
	private toggleInstalledEl: HTMLElement | null = null;
	private pluginsContainerEl: HTMLElement | null = null;
	private modeToggleEl: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, pluginService: PluginService, installationService: InstallationService) {
		super(leaf);
		this.pluginService = pluginService;
		this.installationService = installationService;
	}

	getViewType(): string {
		return VIEW_TYPE_PLUGIN_LIST;
	}

	getDisplayText(): string {
		return "Community Plugins";
	}

	getIcon(): string {
		return "package";
	}

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("plugin-browser-container");

		// Create header with search and controls
		this.createHeader(container);

		// Create plugins container
		this.pluginsContainerEl = container.createDiv("plugins-container");
		this.pluginsContainerEl.addClass(this.displayMode);

		// Load plugins
		await this.loadPlugins();
	}

	async onClose() {
		// Cleanup if needed
	}

	/**
	 * Create the header with search bar and controls
	 */
	private createHeader(container: HTMLElement): void {
		const header = container.createDiv("plugin-browser-header");

		// Search bar
		const searchContainer = header.createDiv("search-container");
		const searchIcon = searchContainer.createSpan("search-icon");
		searchIcon.setText("🔍");
		this.searchInputEl = searchContainer.createEl("input", {
			type: "text",
			placeholder: "Search community plugins...",
			cls: "search-input",
		});
		this.searchInputEl.addEventListener(
			"input",
			debounce(() => {
				this.searchFilters.query = this.searchInputEl?.value || "";
				this.filterPlugins();
			}, 300)
		);

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
		checkbox.addEventListener("change", () => {
			this.searchFilters.showInstalledOnly = checkbox.checked;
			this.filterPlugins();
		});
		this.toggleInstalledEl.createSpan({ text: "Show installed only" });

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

		gridBtn.addEventListener("click", () => {
			this.setDisplayMode("grid");
		});
		listBtn.addEventListener("click", () => {
			this.setDisplayMode("list");
		});

		// Refresh button
		const refreshBtn = controlsRow.createEl("button", {
			cls: "refresh-btn",
			text: "Refresh",
		});
		refreshBtn.addEventListener("click", () => {
			this.loadPlugins(true);
		});

		// Plugin count (will be updated after plugins load)
		const countEl = controlsRow.createDiv("plugin-count");
		countEl.setText("Loading plugins...");
		this.updatePluginCount(countEl);
	}

	/**
	 * Load plugins from the service
	 */
	private async loadPlugins(forceRefresh = false): Promise<void> {
		this.isLoading = true;
		this.updateLoadingState();

		try {
			this.plugins = await this.pluginService.fetchCommunityPlugins(forceRefresh);
			await this.checkInstalledStatus();
			this.filterPlugins();
		} catch (error) {
			this.showError("Failed to load plugins. Please try again.");
			console.error("Error loading plugins:", error);
		} finally {
			this.isLoading = false;
			this.updateLoadingState();
		}
	}

	/**
	 * Check which plugins are installed
	 */
	private async checkInstalledStatus(): Promise<void> {
		// This would require checking each plugin, which could be slow
		// For now, we'll skip this and let the detail view handle it
	}

	/**
	 * Filter plugins based on search query and filters
	 */
	private filterPlugins(): void {
		let filtered = [...this.plugins];

		// Apply search query
		if (this.searchFilters.query) {
			filtered = this.pluginService.searchPlugins(filtered, this.searchFilters.query);
		}

		// Apply installed filter (if implemented)
		if (this.searchFilters.showInstalledOnly) {
			// This would require checking installation status for each plugin
			// For performance, we'll skip this for now
		}

		this.filteredPlugins = filtered;
		this.renderPlugins();
		this.updatePluginCount();
	}

	/**
	 * Update plugin count display
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
		countEl.setText(`Showing ${this.filteredPlugins.length} plugins:`);
	}

	/**
	 * Set display mode (grid or list)
	 */
	private setDisplayMode(mode: DisplayMode): void {
		this.displayMode = mode;
		if (this.pluginsContainerEl) {
			this.pluginsContainerEl.removeClass("grid", "list");
			this.pluginsContainerEl.addClass(mode);
		}
		this.renderPlugins();
	}

	/**
	 * Render plugins in the container
	 */
	private renderPlugins(): void {
		if (!this.pluginsContainerEl) return;

		this.pluginsContainerEl.empty();

		if (this.isLoading) {
			this.pluginsContainerEl.createDiv("loading-message").setText("Loading plugins...");
			return;
		}

		if (this.filteredPlugins.length === 0) {
			this.pluginsContainerEl
				.createDiv("empty-message")
				.setText("No plugins found. Try adjusting your search.");
			return;
		}

		for (const plugin of this.filteredPlugins) {
			this.createPluginCard(plugin);
		}
	}

	/**
	 * Create a plugin card element
	 */
	private createPluginCard(plugin: CommunityPlugin): void {
		if (!this.pluginsContainerEl) return;
		
		const card = this.pluginsContainerEl.createDiv("plugin-card");
		card.addEventListener("click", () => {
			this.openPluginDetail(plugin);
		});

		// Plugin header
		const header = card.createDiv("plugin-card-header");
		header.createEl("h3", { cls: "plugin-title", text: plugin.name });
		const installedBadge = header.createDiv("installed-badge");
		installedBadge.setText("INSTALLED");
		installedBadge.style.display = "none"; // Hide for now, would need to check status

		// Plugin meta
		const meta = card.createDiv("plugin-meta");
		meta.createEl("div", { cls: "plugin-author", text: `By ${plugin.author}` });

		// Plugin description
		const description = card.createDiv("plugin-description");
		description.setText(plugin.description);

		// Plugin footer (for grid view)
		if (this.displayMode === "grid") {
			card.createDiv("plugin-card-footer");
			// Could add download count, update date, etc. here if available
		}
	}

	/**
	 * Open plugin detail view
	 */
	private openPluginDetail(plugin: CommunityPlugin): void {
		// This will be handled by the main plugin class
		// For now, we'll emit an event or use a callback
		const event = new CustomEvent("plugin-selected", { detail: plugin });
		this.containerEl.dispatchEvent(event);
	}

	/**
	 * Update loading state UI
	 */
	private updateLoadingState(): void {
		if (this.pluginsContainerEl) {
			if (this.isLoading) {
				this.pluginsContainerEl.addClass("loading");
			} else {
				this.pluginsContainerEl.removeClass("loading");
			}
		}
		this.renderPlugins();
	}

	/**
	 * Show error message
	 */
	private showError(message: string): void {
		if (this.pluginsContainerEl) {
			const errorEl = this.pluginsContainerEl.createDiv("error-message");
			errorEl.setText(message);
		}
	}
}

