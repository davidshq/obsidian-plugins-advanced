/**
 * Plugin Detail View - displays detailed information about a selected plugin
 */

import { ItemView, WorkspaceLeaf, MarkdownRenderer, Component } from "obsidian";
import { PluginInfo, CommunityPlugin } from "../types";
import { PluginService } from "../services/PluginService";
import { InstallationService } from "../services/InstallationService";
import { showSuccess, showError, isPluginInfo } from "../utils";

/**
 * View type identifier for the plugin detail view
 * Used when registering and opening the detail view
 */
export const VIEW_TYPE_PLUGIN_DETAIL = "plugin-detail-view";

export class PluginDetailView extends ItemView {
  private pluginService: PluginService;
  private installationService: InstallationService;
  private pluginInfo: PluginInfo | null = null;
  private isLoading = false;
  private markdownContainer: HTMLElement | null = null;
  private markdownComponent: Component | null = null;
  private hasUpdateAvailable = false;
  // Track event listeners that need manual cleanup (debounced handlers)
  private trackedListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

  /**
   * Create a new PluginDetailView instance
   * @param leaf The workspace leaf this view is attached to
   * @param pluginService Service for fetching plugin data
   * @param installationService Service for managing plugin installations
   */
  constructor(
    leaf: WorkspaceLeaf,
    pluginService: PluginService,
    installationService: InstallationService,
  ) {
    super(leaf);
    this.pluginService = pluginService;
    this.installationService = installationService;
  }

  /**
   * Get the view type identifier for this view
   * @returns The view type string
   */
  getViewType(): string {
    return VIEW_TYPE_PLUGIN_DETAIL;
  }

  /**
   * Get the display text shown in the view header
   * Returns the plugin name if loaded, otherwise a default text
   * @returns The display text for this view
   */
  getDisplayText(): string {
    return this.pluginInfo ? this.pluginInfo.name : "Plugin Details";
  }

  /**
   * Get the icon identifier for this view
   * @returns The icon string identifier
   */
  getIcon(): string {
    return "info";
  }

  /**
   * Initialize the view when it is opened
   * Sets up the container element and prepares it for content
   * Registers Escape key handler to close the view
   */
  async onOpen() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("plugin-detail-container");
    container.setAttribute("role", "region");
    container.setAttribute("aria-label", "Plugin details");
    this.contentEl = container;

    // Add Escape key support to close the view
    this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
      if (evt.key === "Escape") {
        this.close();
      }
    });
  }

  /**
   * Cleanup when the view is closed
   * Unloads markdown renderer components, removes tracked event listeners, and clears references
   */
  async onClose() {
    // Remove tracked event listeners (debounced handlers)
    for (const { element, event, handler } of this.trackedListeners) {
      try {
        element.removeEventListener(event, handler);
      } catch (error) {
        console.warn(`Failed to remove ${event} listener:`, error);
      }
    }
    this.trackedListeners = [];

    // Cleanup markdown renderer resources
    if (this.markdownComponent) {
      this.markdownComponent.unload();
      this.markdownComponent = null;
    }
    if (this.markdownContainer) {
      this.markdownContainer.empty();
      this.markdownContainer = null;
    }
    this.pluginInfo = null;
    this.hasUpdateAvailable = false;
  }

  /**
   * Load and display plugin details
   * Fetches manifest and README if not already provided, checks installation status,
   * and renders the full plugin detail view
   * @param plugin Plugin information (can be CommunityPlugin or PluginInfo)
   * @throws Does not throw, but displays error message if loading fails
   */
  async loadPlugin(plugin: CommunityPlugin | PluginInfo): Promise<void> {
    this.isLoading = true;
    this.renderLoading();

    try {
      // Fetch full plugin info if not already loaded
      // Use type guard for proper type checking
      if (isPluginInfo(plugin)) {
        this.pluginInfo = plugin;
      } else {
        this.pluginInfo = await this.pluginService.getPluginInfo(plugin);
      }

      // Check if plugin is installed and if update is available
      if (this.pluginInfo) {
        const isInstalled = await this.installationService.isPluginInstalled(
          this.pluginInfo.id,
        );
        this.pluginInfo.installed = isInstalled;
        if (isInstalled) {
          const version = await this.installationService.getInstalledVersion(
            this.pluginInfo.id,
          );
          this.pluginInfo.installedVersion = version || undefined;

          // Check for updates if manifest is available
          if (this.pluginInfo.manifest && version) {
            this.hasUpdateAvailable =
              await this.installationService.hasUpdateAvailable(
                this.pluginInfo.id,
                this.pluginInfo.manifest.version,
              );
          }
        }
      }

      this.renderPluginDetails();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.renderError(`Failed to load plugin details: ${errorMessage}`);
      console.error("Error loading plugin details:", error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Render loading state
   * Displays a loading message while plugin details are being fetched
   */
  private renderLoading(): void {
    if (!this.contentEl) return;
    this.contentEl.empty();
    const loadingMsg = this.contentEl.createDiv("loading-message");
    loadingMsg.setText("Loading plugin details...");
    loadingMsg.setAttribute("role", "status");
    loadingMsg.setAttribute("aria-live", "polite");
  }

  /**
   * Render error message
   * Displays an error message when plugin details fail to load
   * @param message The error message to display
   */
  private renderError(message: string): void {
    if (!this.contentEl) return;
    this.contentEl.empty();
    const errorMsg = this.contentEl.createDiv("error-message");
    errorMsg.setText(message);
    errorMsg.setAttribute("role", "alert");
    errorMsg.setAttribute("aria-live", "assertive");
  }

  /**
   * Render markdown content asynchronously using Obsidian's MarkdownRenderer
   * Falls back to plain text if rendering fails
   * @param readmeText The markdown text to render
   * @throws Does not throw, but logs errors and falls back to plain text display
   */
  private async renderMarkdown(readmeText: string): Promise<void> {
    if (!this.markdownContainer || !this.markdownComponent) return;

    try {
      await MarkdownRenderer.render(
        this.app,
        readmeText,
        this.markdownContainer,
        "",
        this.markdownComponent,
      );
    } catch (error) {
      console.error("Failed to render markdown:", error);
      if (this.markdownContainer) {
        this.markdownContainer.setText(readmeText);
      }
    }
  }

  /**
   * Render plugin details
   * Creates the full plugin detail view including header, stats, description,
   * action buttons, and README content rendered as markdown
   * Includes accessibility attributes (ARIA labels, roles) for all interactive elements
   */
  private renderPluginDetails(): void {
    if (!this.contentEl || !this.pluginInfo) return;

    this.contentEl.empty();

    // Header with back button
    const header = this.contentEl.createDiv("plugin-detail-header");
    const backBtn = header.createEl("button", {
      cls: "back-button",
      text: "← Back",
      attr: {
        "aria-label": "Go back to plugin list",
        type: "button",
      },
    });
    // Use registerDomEvent for automatic cleanup
    // Note: Native HTML buttons handle Enter/Space keys automatically, so no explicit keyboard handler needed
    this.registerDomEvent(backBtn, "click", () => {
      this.goBack();
    });

    const closeBtn = header.createEl("button", {
      cls: "close-button",
      text: "×",
      attr: {
        "aria-label": "Close plugin detail view",
        type: "button",
      },
    });
    // Use registerDomEvent for automatic cleanup
    // Note: Native HTML buttons handle Enter/Space keys automatically, so no explicit keyboard handler needed
    this.registerDomEvent(closeBtn, "click", () => {
      this.close();
    });

    // Plugin title
    const titleEl = this.contentEl.createEl("h1", {
      cls: "plugin-detail-title",
      text: this.pluginInfo.name,
    });
    titleEl.setAttribute("id", "plugin-detail-title");

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
        attr: {
          "aria-label": `Author: ${this.pluginInfo.manifest.author}`,
          ...(this.pluginInfo.manifest.authorUrl
            ? { target: "_blank", rel: "noopener noreferrer" }
            : { "aria-disabled": "true" }),
        },
      });
      if (!this.pluginInfo.manifest.authorUrl) {
        authorLink.addClass("author-link-disabled");
      }

      const repo = stats.createEl("div", {
        cls: "stat-item",
      });
      repo.createSpan({ text: "Repository: " });
      repo.createEl("a", {
        href: `https://github.com/${this.pluginInfo.repo}`,
        text: this.pluginInfo.repo,
        attr: {
          target: "_blank",
          rel: "noopener noreferrer",
          "aria-label": `Repository: ${this.pluginInfo.repo} (opens in new tab)`,
        },
      });

      if (this.pluginInfo.manifest.minAppVersion) {
        const minVersion = stats.createEl("div", {
          cls: "stat-item",
        });
        minVersion.createSpan({ text: "Requires Obsidian: " });
        minVersion.createEl("strong", {
          text: this.pluginInfo.manifest.minAppVersion + "+",
        });
      }
    }

    // Short description
    const shortDesc = this.contentEl.createDiv("plugin-short-description");
    shortDesc.setText(this.pluginInfo.description);

    // Action buttons
    const actions = this.contentEl.createDiv("plugin-detail-actions");

    // Show update button if update is available
    if (
      this.pluginInfo.installed &&
      this.hasUpdateAvailable &&
      this.pluginInfo.manifest
    ) {
      const updateBtn = actions.createEl("button", {
        cls: "update-button",
        text: `Update to ${this.pluginInfo.manifest.version}`,
        attr: {
          "aria-label": `Update plugin to version ${this.pluginInfo.manifest.version}`,
          type: "button",
        },
      });
      // Use registerDomEvent for automatic cleanup
      this.registerDomEvent(updateBtn, "click", () => {
        this.handleUpdateClick();
      });
    }

    const installBtn = actions.createEl("button", {
      cls: "install-button",
      text: this.pluginInfo.installed ? "Uninstall" : "Install",
      attr: {
        "aria-label": this.pluginInfo.installed
          ? `Uninstall ${this.pluginInfo.name}`
          : `Install ${this.pluginInfo.name}`,
        type: "button",
      },
    });
    // Use registerDomEvent for automatic cleanup
    this.registerDomEvent(installBtn, "click", () => {
      this.handleInstallClick();
    });

    const shareBtn = actions.createEl("button", {
      cls: "share-button",
      text: "Copy share link",
      attr: {
        "aria-label": "Copy plugin repository link to clipboard",
        type: "button",
      },
    });
    // Use registerDomEvent for automatic cleanup
    this.registerDomEvent(shareBtn, "click", () => {
      this.copyShareLink();
    });

    if (this.pluginInfo.manifest?.fundingUrl) {
      const donateBtn = actions.createEl("button", {
        cls: "donate-button",
        text: "Donate",
        attr: {
          "aria-label": `Donate to ${this.pluginInfo.manifest.author}`,
          type: "button",
        },
      });
      // Use registerDomEvent for automatic cleanup
      this.registerDomEvent(donateBtn, "click", () => {
        const fundingUrl = this.pluginInfo?.manifest?.fundingUrl;
        if (fundingUrl) {
          window.open(fundingUrl, "_blank");
        }
      });
    }

    // Full description from README
    if (this.pluginInfo.readme) {
      const descriptionSection = this.contentEl.createDiv(
        "plugin-full-description",
      );
      descriptionSection.createEl("h2", {
        text: this.pluginInfo.name,
      });

      // Render markdown content
      this.markdownContainer = descriptionSection.createDiv("markdown-content");
      const readmeText = this.pluginInfo.readme;
      if (readmeText) {
        // Create a component to manage the markdown renderer lifecycle
        this.markdownComponent = new Component();
        this.markdownComponent.load();

        // Render markdown asynchronously
        this.renderMarkdown(readmeText);
      }
    } else {
      const noReadme = this.contentEl.createDiv("no-readme-message");
      noReadme.setText("No README available for this plugin.");
    }
  }

  /**
   * Handle update button click
   * Updates the plugin to the latest version by reinstalling it.
   * Enables the plugin after successful update and refreshes the UI.
   */
  private async handleUpdateClick(): Promise<void> {
    if (!this.pluginInfo || !this.pluginInfo.manifest) {
      showError("Cannot update plugin: manifest information is missing.");
      return;
    }

    const result = await this.installationService.installPlugin(
      this.pluginInfo.repo,
      this.pluginInfo.manifest.version,
      this.pluginInfo.manifest,
    );

    if (result.success) {
      this.pluginInfo.installedVersion = this.pluginInfo.manifest.version;
      this.hasUpdateAvailable = false;
      await this.installationService.enablePlugin(this.pluginInfo.id);
      this.renderPluginDetails();
    }
  }

  /**
   * Handle install/uninstall button click
   * Installs or uninstalls the plugin based on current state.
   * Updates the UI and shows success/error notifications.
   */
  private async handleInstallClick(): Promise<void> {
    if (!this.pluginInfo) return;

    if (this.pluginInfo.installed) {
      // Uninstall
      const result = await this.installationService.uninstallPlugin(
        this.pluginInfo.id,
      );
      if (result.success) {
        this.pluginInfo.installed = false;
        this.pluginInfo.installedVersion = undefined;
        this.hasUpdateAvailable = false;
        this.renderPluginDetails();
      }
    } else {
      // Install
      if (!this.pluginInfo.manifest) {
        showError(
          "Cannot install plugin: manifest information is missing. Please try refreshing.",
        );
        return;
      }

      const result = await this.installationService.installPlugin(
        this.pluginInfo.repo,
        this.pluginInfo.manifest.version,
        this.pluginInfo.manifest,
      );

      if (result.success) {
        this.pluginInfo.installed = true;
        this.pluginInfo.installedVersion = this.pluginInfo.manifest.version;
        this.hasUpdateAvailable = false;
        await this.installationService.enablePlugin(this.pluginInfo.id);
        this.renderPluginDetails();
      }
    }
  }

  /**
   * Copy share link to clipboard
   * Copies the plugin's GitHub repository URL to the clipboard.
   * Uses the modern Clipboard API with a fallback for older browsers.
   * Shows success notification on success, error notification on failure.
   */
  private async copyShareLink(): Promise<void> {
    if (!this.pluginInfo) return;
    const link = `https://github.com/${this.pluginInfo.repo}`;
    try {
      // Use modern Clipboard API if available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
        showSuccess("Repository link copied to clipboard!");
        return;
      }

      // Fallback for older browsers (deprecated but necessary for compatibility)
      // Note: document.execCommand is deprecated but still needed for older Obsidian versions
      const textArea = document.createElement("textarea");
      textArea.value = link;
      textArea.className = "clipboard-fallback-textarea";
      // Inline styles are necessary for clipboard fallback to work properly
      // eslint-disable-next-line obsidian/no-static-styles-assignment
      textArea.style.position = "fixed";
      // eslint-disable-next-line obsidian/no-static-styles-assignment
      textArea.style.opacity = "0";
      // eslint-disable-next-line obsidian/no-static-styles-assignment
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      // Use deprecated execCommand as fallback (still supported in Obsidian's Electron environment)
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (success) {
        showSuccess("Repository link copied to clipboard!");
      } else {
        throw new Error("execCommand('copy') failed");
      }
    } catch (error) {
      console.error("Failed to copy link:", error);
      showError("Failed to copy link to clipboard");
    }
  }

  /**
   * Go back to list view
   * Dispatches a custom "navigate-back" event that the main plugin class listens for
   * to navigate back to the plugin list view
   */
  private goBack(): void {
    const event = new CustomEvent("navigate-back");
    this.containerEl.dispatchEvent(event);
  }

  /**
   * Close the detail view
   * Detaches the view leaf from the workspace, which will trigger onClose() cleanup
   */
  private close(): void {
    this.leaf.detach();
  }
}
