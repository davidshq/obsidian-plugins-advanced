/**
 * Settings tab for Community Plugin Browser
 */

import {
  PluginSettingTab as ObsidianPluginSettingTab,
  Setting,
} from "obsidian";
import CommunityPluginBrowserPlugin from "../main";
import { ViewLocation } from "../types";
import { showSuccess } from "../utils";
import { VIEW_TYPE_PLUGIN_LIST } from "../views/PluginListView";
import { PluginListView } from "../views/PluginListView";

export class PluginSettingTab extends ObsidianPluginSettingTab {
  plugin: CommunityPluginBrowserPlugin;

  /**
   * Create a new PluginSettingTab instance
   * @param plugin Reference to the main plugin instance
   */
  constructor(plugin: CommunityPluginBrowserPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  /**
   * Display the settings tab UI
   * Creates and renders all settings controls
   */
  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Community Plugin Browser Settings" });

    // View location setting
    new Setting(containerEl)
      .setName("View Location")
      .setDesc("Choose where the plugin browser opens when activated")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("right", "Right Sidebar")
          .addOption("main", "Main Editor Area")
          .addOption("window", "New Window")
          .setValue(this.plugin.settings.viewLocation)
          .onChange(async (value: string) => {
            this.plugin.settings.viewLocation = value as ViewLocation;
            await this.plugin.saveSettings();
          });
      });

    // Pagination threshold setting
    new Setting(containerEl)
      .setName("Pagination Threshold")
      .setDesc(
        "Distance from bottom (in pixels) to trigger auto-loading more plugins. " +
          "Lower values load plugins closer to the bottom, higher values load earlier. " +
          "Default: 200px",
      )
      .addText((text) => {
        text
          .setPlaceholder("200")
          .setValue(String(this.plugin.settings.paginationThreshold ?? 200))
          .onChange(async (value) => {
            const numValue = parseInt(value, 10);
            // Validate: must be a valid number and non-negative
            if (!isNaN(numValue) && numValue >= 0) {
              this.plugin.settings.paginationThreshold = numValue;
              await this.plugin.saveSettings();

              // Update IntersectionObserver in open views with new threshold
              const { workspace } = this.plugin.app;
              const listLeaves = workspace.getLeavesOfType(
                VIEW_TYPE_PLUGIN_LIST,
              );
              for (const leaf of listLeaves) {
                if (leaf.view instanceof PluginListView) {
                  // Re-setup observer with new threshold
                  // This will recreate the observer and sentinel element
                  leaf.view.setupIntersectionObserver();
                }
              }
            } else if (value !== "") {
              // Invalid input - reset to default if not empty
              text.setValue(
                String(this.plugin.settings.paginationThreshold ?? 200),
              );
            }
          });
      });

    // Data refresh settings section
    containerEl.createEl("h3", { text: "Data Refresh Settings" });

    new Setting(containerEl)
      .setName("Data Refresh Interval")
      .setDesc(
        "How often to refresh plugin data and statistics (in minutes). " +
          "The plugin will check for updates at this interval. " +
          "Default: 30 minutes (2x/hour). " +
          "Lower values provide fresher data but make more GitHub API calls. " +
          "Cache duration is automatically set to refresh interval + 5 minutes buffer.",
      )
      .addText((text) => {
        text
          .setPlaceholder("30")
          .setValue(
            String(this.plugin.settings.dataRefreshIntervalMinutes ?? 30),
          )
          .onChange(async (value) => {
            const numValue = parseInt(value, 10);
            // Validate: must be a valid number, positive, and reasonable (1-1440 minutes = 1 day max)
            if (!isNaN(numValue) && numValue >= 1 && numValue <= 1440) {
              this.plugin.settings.dataRefreshIntervalMinutes = numValue;
              await this.plugin.saveSettings();

              // Update cache duration based on new refresh interval
              const refreshIntervalMs = numValue * 60 * 1000;
              const bufferMs = 5 * 60 * 1000; // 5 minute buffer
              const cacheDurationMs = refreshIntervalMs + bufferMs;
              this.plugin.pluginService.setCacheDuration(cacheDurationMs);

              // Restart background refresh with new interval
              this.plugin.startBackgroundRefresh();

              showSuccess(
                `Refresh interval updated to ${numValue} minutes. Background refresh restarted.`,
              );
            } else if (value !== "") {
              // Invalid input - reset to current value if not empty
              text.setValue(
                String(this.plugin.settings.dataRefreshIntervalMinutes ?? 30),
              );
            }
          });
      });

    // Cache management section
    containerEl.createEl("h3", { text: "Cache Management" });

    new Setting(containerEl)
      .setName("Clear Cache")
      .setDesc(
        "Clear all cached plugin data, stats, and release information. " +
          "This will immediately refresh all data. " +
          "Use this if you're experiencing issues with outdated or corrupted cache.",
      )
      .addButton((button) => {
        button
          .setButtonText("Clear Cache")
          .setWarning()
          .onClick(async () => {
            // Clear cache
            this.plugin.pluginService.clearCache();

            // Refresh data immediately in background
            (async () => {
              try {
                await Promise.all([
                  this.plugin.pluginService.fetchCommunityPlugins(true),
                  this.plugin.pluginService.fetchPluginStats(true),
                ]);
              } catch (error) {
                console.warn(
                  "Failed to refresh data after cache clear:",
                  error,
                );
              }
            })();

            // Refresh any open plugin list views
            const { workspace } = this.plugin.app;
            const listLeaves = workspace.getLeavesOfType(VIEW_TYPE_PLUGIN_LIST);
            for (const leaf of listLeaves) {
              if (leaf.view instanceof PluginListView) {
                // Trigger refresh - this will reload plugins with fresh data
                await leaf.view.refreshPlugins();
              }
            }

            showSuccess("Cache cleared successfully. Refreshing data now...");
          });
      });
  }
}
