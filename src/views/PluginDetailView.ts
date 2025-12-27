/**
 * Plugin Detail View - displays detailed information about a selected plugin
 */

import { ItemView, WorkspaceLeaf, MarkdownRenderer, Component } from "obsidian";
import { PluginInfo } from "../types";
import { PluginService } from "../services/PluginService";
import { InstallationService } from "../services/InstallationService";
import { showSuccess, showError } from "../utils";

export const VIEW_TYPE_PLUGIN_DETAIL = "plugin-detail-view";

export class PluginDetailView extends ItemView {
	private pluginService: PluginService;
	private installationService: InstallationService;
	private pluginInfo: PluginInfo | null = null;
	private isLoading = false;

	constructor(leaf: WorkspaceLeaf, pluginService: PluginService, installationService: InstallationService) {
		super(leaf);
		this.pluginService = pluginService;
		this.installationService = installationService;
	}

	getViewType(): string {
		return VIEW_TYPE_PLUGIN_DETAIL;
	}

	getDisplayText(): string {
		return this.pluginInfo ? this.pluginInfo.name : "Plugin Details";
	}

	getIcon(): string {
		return "info";
	}

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("plugin-detail-container");
		this.contentEl = container;
	}

	async onClose() {
		// Cleanup if needed
	}

	/**
	 * Load and display plugin details
	 */
	async loadPlugin(plugin: PluginInfo): Promise<void> {
		this.isLoading = true;
		this.renderLoading();

		try {
			// Fetch full plugin info if not already loaded
			if (!plugin.manifest || !plugin.readme) {
				this.pluginInfo = await this.pluginService.getPluginInfo(plugin);
			} else {
				this.pluginInfo = plugin;
			}

			// Check if plugin is installed
			const isInstalled = await this.installationService.isPluginInstalled(this.pluginInfo.id);
			this.pluginInfo.installed = isInstalled;
			if (isInstalled) {
				const version = await this.installationService.getInstalledVersion(this.pluginInfo.id);
				this.pluginInfo.installedVersion = version || undefined;
			}

			this.renderPluginDetails();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.renderError(`Failed to load plugin details: ${errorMessage}`);
			console.error("Error loading plugin details:", error);
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Render loading state
	 */
	private renderLoading(): void {
		if (!this.contentEl) return;
		this.contentEl.empty();
		this.contentEl.createDiv("loading-message").setText("Loading plugin details...");
	}

	/**
	 * Render error message
	 */
	private renderError(message: string): void {
		if (!this.contentEl) return;
		this.contentEl.empty();
		this.contentEl.createDiv("error-message").setText(message);
	}

	/**
	 * Render plugin details
	 */
	private renderPluginDetails(): void {
		if (!this.contentEl || !this.pluginInfo) return;

		this.contentEl.empty();

		// Header with back button
		const header = this.contentEl.createDiv("plugin-detail-header");
		const backBtn = header.createEl("button", { cls: "back-button", text: "← Back" });
		backBtn.addEventListener("click", () => {
			this.goBack();
		});

		const closeBtn = header.createEl("button", { cls: "close-button", text: "×" });
		closeBtn.addEventListener("click", () => {
			this.close();
		});

		// Plugin title
		this.contentEl.createEl("h1", {
			cls: "plugin-detail-title",
			text: this.pluginInfo.name,
		});

		// Plugin stats and metadata
		const stats = this.contentEl.createDiv("plugin-detail-stats");
		if (this.pluginInfo.manifest) {
			const version = stats.createEl("div", {
				cls: "stat-item",
			});
			version.createSpan({ text: "Version: " });
			version.createEl("strong", { text: this.pluginInfo.manifest.version });

			const author = stats.createEl("div", {
				cls: "stat-item",
			});
			author.createSpan({ text: "By " });
			const authorLink = author.createEl("a", {
				href: this.pluginInfo.manifest.authorUrl || "#",
				text: this.pluginInfo.manifest.author,
			});
			if (!this.pluginInfo.manifest.authorUrl) {
				authorLink.style.pointerEvents = "none";
				authorLink.style.cursor = "default";
			}

			const repo = stats.createEl("div", {
				cls: "stat-item",
			});
			repo.createSpan({ text: "Repository: " });
			repo.createEl("a", {
				href: `https://github.com/${this.pluginInfo.repo}`,
				text: this.pluginInfo.repo,
				attr: { target: "_blank" },
			});

			if (this.pluginInfo.manifest.minAppVersion) {
				const minVersion = stats.createEl("div", {
					cls: "stat-item",
				});
				minVersion.createSpan({ text: "Requires Obsidian: " });
				minVersion.createEl("strong", { text: this.pluginInfo.manifest.minAppVersion + "+" });
			}
		}

		// Short description
		const shortDesc = this.contentEl.createDiv("plugin-short-description");
		shortDesc.setText(this.pluginInfo.description);

		// Action buttons
		const actions = this.contentEl.createDiv("plugin-detail-actions");
		const installBtn = actions.createEl("button", {
			cls: "install-button",
			text: this.pluginInfo.installed ? "Uninstall" : "Install",
		});
		installBtn.addEventListener("click", () => {
			this.handleInstallClick();
		});

		const shareBtn = actions.createEl("button", {
			cls: "share-button",
			text: "Copy share link",
		});
		shareBtn.addEventListener("click", () => {
			this.copyShareLink();
		});

		if (this.pluginInfo.manifest?.fundingUrl) {
			const donateBtn = actions.createEl("button", {
				cls: "donate-button",
				text: "Donate",
			});
			donateBtn.addEventListener("click", () => {
				const fundingUrl = this.pluginInfo?.manifest?.fundingUrl;
				if (fundingUrl) {
					window.open(fundingUrl, "_blank");
				}
			});
		}

		// Full description from README
		if (this.pluginInfo.readme) {
			const descriptionSection = this.contentEl.createDiv("plugin-full-description");
			descriptionSection.createEl("h2", {
				text: this.pluginInfo.name,
			});

			// Render markdown content
			const markdownContainer = descriptionSection.createDiv("markdown-content");
			const readmeText = this.pluginInfo.readme;
			if (readmeText) {
				MarkdownRenderer.render(
					this.app,
					readmeText,
					markdownContainer,
					"",
					null as unknown as Component
				).catch((error) => {
					console.error("Failed to render markdown:", error);
					markdownContainer.setText(readmeText);
				});
			}
		} else {
			const noReadme = this.contentEl.createDiv("no-readme-message");
			noReadme.setText("No README available for this plugin.");
		}
	}

	/**
	 * Handle install/uninstall button click
	 */
	private async handleInstallClick(): Promise<void> {
		if (!this.pluginInfo) return;

		if (this.pluginInfo.installed) {
			// Uninstall
			const result = await this.installationService.uninstallPlugin(this.pluginInfo.id);
			if (result.success) {
				this.pluginInfo.installed = false;
				this.pluginInfo.installedVersion = undefined;
				this.renderPluginDetails();
			}
		} else {
			// Install
			if (!this.pluginInfo.manifest) {
				// Show error
				return;
			}

			const result = await this.installationService.installPlugin(
				this.pluginInfo.repo,
				this.pluginInfo.manifest.version,
				this.pluginInfo.manifest
			);

			if (result.success) {
				this.pluginInfo.installed = true;
				this.pluginInfo.installedVersion = this.pluginInfo.manifest.version;
				await this.installationService.enablePlugin(this.pluginInfo.id);
				this.renderPluginDetails();
			}
		}
	}

	/**
	 * Copy share link to clipboard
	 */
	private copyShareLink(): void {
		if (!this.pluginInfo) return;
		const link = `https://github.com/${this.pluginInfo.repo}`;
		navigator.clipboard.writeText(link).then(() => {
			showSuccess("Repository link copied to clipboard!");
		}).catch((error) => {
			console.error("Failed to copy link:", error);
			showError("Failed to copy link to clipboard");
		});
	}

	/**
	 * Go back to list view
	 */
	private goBack(): void {
		const event = new CustomEvent("navigate-back");
		this.containerEl.dispatchEvent(event);
	}

	/**
	 * Close the detail view
	 */
	private close(): void {
		this.leaf.detach();
	}
}

