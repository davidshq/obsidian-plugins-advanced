/**
 * Main plugin file for Community Plugin Browser
 */

import { Plugin, WorkspaceLeaf } from "obsidian";
import { PluginService } from "./services/PluginService";
import { InstallationService } from "./services/InstallationService";
import { PluginListView, VIEW_TYPE_PLUGIN_LIST } from "./views/PluginListView";
import { PluginDetailView, VIEW_TYPE_PLUGIN_DETAIL } from "./views/PluginDetailView";
import { CommunityPlugin, PluginSettings, ViewLocation } from "./types";
import { PluginSettingTab } from "./settings/PluginSettingTab";

const DEFAULT_SETTINGS: PluginSettings = {
	viewLocation: "right",
};

export default class CommunityPluginBrowserPlugin extends Plugin {
	settings: PluginSettings;
	private pluginService: PluginService;
	private installationService: InstallationService;

	async onload() {
		// Load settings
		await this.loadSettings();

		// Initialize services
		this.pluginService = new PluginService();
		this.installationService = new InstallationService(this.app);

		// Register views
		this.registerView(VIEW_TYPE_PLUGIN_LIST, (leaf) => {
			return new PluginListView(leaf, this.pluginService, this.installationService);
		});

		this.registerView(VIEW_TYPE_PLUGIN_DETAIL, (leaf) => {
			return new PluginDetailView(leaf, this.pluginService, this.installationService);
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

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async onunload() {
		// Cleanup if needed
	}

	/**
	 * Open the plugin list view based on settings
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
		if (leaf) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			
			// Listen for plugin selection events
			if (leaf.view instanceof PluginListView) {
				leaf.view.containerEl.addEventListener("plugin-selected", async (event: CustomEvent) => {
					const plugin: CommunityPlugin = event.detail;
					await this.openPluginDetailView(plugin);
				});
			}
		}
	}

	/**
	 * Create a leaf in the specified location
	 */
	private async createLeafInLocation(location: ViewLocation): Promise<WorkspaceLeaf | null> {
		const { workspace } = this.app;

		switch (location) {
			case "main": {
				// Open in main editor area
				return workspace.getLeaf(true);
			}

			case "window": {
				// Open in new window
				// Note: openPopoutLeaf may not be available in all Obsidian versions
				const workspaceAny = workspace as unknown as { openPopoutLeaf?: () => WorkspaceLeaf };
				if (workspaceAny.openPopoutLeaf) {
					return workspaceAny.openPopoutLeaf();
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
				await leaf.view.loadPlugin(plugin);

				// Listen for back navigation
				leaf.view.containerEl.addEventListener("navigate-back", () => {
					this.openPluginListView();
				});
			}
		}
	}
}

