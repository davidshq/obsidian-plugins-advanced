/**
 * Service for installing and managing plugins
 */

import { App, requestUrl, TFile, TFolder, normalizePath } from "obsidian";
import { PluginManifest, InstallationStatus } from "../types";
import {
  getGitHubReleaseUrl,
  showError,
  showSuccess,
  isCompatible,
  compareVersions,
  isValidRepoFormat,
  debugLog,
  hasAppVersion,
  hasEnablePlugin,
  retryRequest,
  shouldRetryHttpError,
} from "../utils";
import { PLUGIN_CONFIG } from "../config";

export class InstallationService {
  /**
   * Create a new InstallationService instance
   * @param app Reference to the Obsidian App instance
   */
  constructor(private app: App) {}

  /**
   * Get the plugins directory path
   * Uses normalizePath() for cross-platform compatibility
   * @returns The normalized path to the plugins directory
   */
  private getPluginsDir(): string {
    return normalizePath(`${this.app.vault.configDir}/plugins`);
  }

  /**
   * Get the plugin directory path relative to vault root
   * Uses normalizePath() for cross-platform compatibility
   * configDir is typically ".obsidian", so we need ".obsidian/plugins/pluginId"
   * @param pluginId The ID of the plugin
   * @returns The normalized relative path to the plugin directory (e.g., ".obsidian/plugins/pluginId")
   */
  private getPluginDirPath(pluginId: string): string {
    // configDir is relative to vault root (e.g., ".obsidian")
    // So we return ".obsidian/plugins/pluginId"
    // normalizePath() ensures cross-platform compatibility
    return normalizePath(`${this.app.vault.configDir}/plugins/${pluginId}`);
  }

  /**
   * Check if a plugin is installed by looking for its manifest.json file
   * @param pluginId The ID of the plugin to check
   * @returns True if the plugin is installed (manifest.json exists), false otherwise
   */
  async isPluginInstalled(pluginId: string): Promise<boolean> {
    const pluginDirPath = this.getPluginDirPath(pluginId);
    const manifestPath = `${pluginDirPath}/manifest.json`;
    const manifestFile = this.app.vault.getAbstractFileByPath(manifestPath);
    return manifestFile instanceof TFile;
  }

  /**
   * Get installed plugin version from its manifest.json file
   * @param pluginId The ID of the plugin to get the version for
   * @returns The installed version string from manifest.json, or null if the plugin is not installed or manifest cannot be read
   */
  async getInstalledVersion(pluginId: string): Promise<string | null> {
    const pluginDirPath = this.getPluginDirPath(pluginId);
    const manifestPath = `${pluginDirPath}/manifest.json`;
    const manifestFile = this.app.vault.getAbstractFileByPath(manifestPath);

    if (manifestFile instanceof TFile) {
      try {
        const content = await this.app.vault.read(manifestFile);
        const manifest: PluginManifest = JSON.parse(content);
        return manifest.version;
      } catch (error) {
        console.error(`Failed to read manifest for ${pluginId}:`, error);
        return null;
      }
    }
    return null;
  }

  /**
   * Check if an installed plugin has an update available
   * Compares the installed version with the latest available version using semantic versioning
   * @param pluginId The ID of the plugin to check
   * @param latestVersion The latest available version from the repository
   * @returns True if an update is available (latestVersion > installedVersion), false if already up to date or not installed
   */
  async hasUpdateAvailable(
    pluginId: string,
    latestVersion: string,
  ): Promise<boolean> {
    const installedVersion = await this.getInstalledVersion(pluginId);
    if (!installedVersion) {
      return false; // Not installed
    }

    // Use proper semantic version comparison
    return compareVersions(latestVersion, installedVersion) > 0;
  }

  /**
   * Check if plugin is compatible with current Obsidian version
   * @param manifest The plugin manifest containing minimum app version requirement
   * @returns True if the plugin is compatible with the current Obsidian version
   */
  private checkCompatibility(manifest: PluginManifest): boolean {
    // Access app.version safely - it exists but may not be in types
    const currentVersion = hasAppVersion(this.app) ? this.app.version : "0.0.0";
    return isCompatible(manifest.minAppVersion, currentVersion);
  }

  /**
   * Download a file from a URL
   * Uses retry logic with exponential backoff for unreliable network operations
   * @param url The URL to download from
   * @returns The file contents as an ArrayBuffer
   * @throws Error if the download fails after all retry attempts
   */
  private async downloadFile(url: string): Promise<ArrayBuffer> {
    try {
      const response = await retryRequest(
        () =>
          requestUrl({
            url: url,
            method: "GET",
          }),
        {
          maxRetries: PLUGIN_CONFIG.constants.retry.maxRetries,
          initialDelay: PLUGIN_CONFIG.constants.retry.initialDelay,
          maxDelay: PLUGIN_CONFIG.constants.retry.maxDelay,
          backoffMultiplier: PLUGIN_CONFIG.constants.retry.backoffMultiplier,
          shouldRetry: shouldRetryHttpError,
        },
      );
      return response.arrayBuffer;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to download file from ${url}: ${errorMessage}`);
    }
  }

  /**
   * Ensure the plugin directory exists
   * Note: Directories are created automatically when writing files via the adapter,
   * so this method is intentionally empty. Kept for potential future use.
   */
  private async ensurePluginDir(): Promise<void> {
    // Directories will be created automatically when we write files
    // No need to check or create them explicitly
  }

  /**
   * Install a plugin from GitHub release
   * @param repo Repository string in format "owner/name"
   * @param version Version tag (e.g., "1.0.0")
   * @param manifest Plugin manifest with id matching the plugin being installed
   * @returns Installation status
   */
  async installPlugin(
    repo: string,
    version: string,
    manifest: PluginManifest,
  ): Promise<InstallationStatus> {
    // Validate inputs
    if (!isValidRepoFormat(repo)) {
      const error = "Invalid repository format. Expected 'owner/name'";
      showError(`Failed to install plugin: ${error}`);
      return {
        success: false,
        error,
        pluginId: manifest.id,
      };
    }

    if (!version || typeof version !== "string") {
      const error = "Invalid version format";
      showError(`Failed to install plugin: ${error}`);
      return {
        success: false,
        error,
        pluginId: manifest.id,
      };
    }

    if (!manifest || !manifest.id) {
      const error = "Invalid manifest: missing plugin ID";
      showError(`Failed to install plugin: ${error}`);
      return {
        success: false,
        error,
        pluginId: manifest?.id || "unknown",
      };
    }

    // Track files written for rollback
    const writtenFiles: string[] = [];
    const adapter = this.app.vault.adapter;
    const pluginDirPath = this.getPluginDirPath(manifest.id);

    try {
      // Check compatibility
      if (!this.checkCompatibility(manifest)) {
        const currentVersion = hasAppVersion(this.app)
          ? this.app.version
          : "0.0.0";
        throw new Error(
          `Plugin requires Obsidian ${manifest.minAppVersion} or higher, but you have ${currentVersion}`,
        );
      }

      // Ensure plugin directory exists (will be created when writing files)
      await this.ensurePluginDir();

      // Download and write main.js
      const mainJsUrl = getGitHubReleaseUrl(repo, version, "main.js");
      const mainJsBuffer = await this.downloadFile(mainJsUrl);
      const mainJsPath = `${pluginDirPath}/main.js`;
      await adapter.writeBinary(mainJsPath, mainJsBuffer);
      writtenFiles.push(mainJsPath);

      // Download and write manifest.json
      const manifestUrl = getGitHubReleaseUrl(repo, version, "manifest.json");
      const manifestBuffer = await this.downloadFile(manifestUrl);
      const manifestPath = `${pluginDirPath}/manifest.json`;
      await adapter.writeBinary(manifestPath, manifestBuffer);
      writtenFiles.push(manifestPath);

      // Try to download styles.css if it exists
      try {
        const stylesUrl = getGitHubReleaseUrl(repo, version, "styles.css");
        const stylesBuffer = await this.downloadFile(stylesUrl);
        const stylesPath = `${pluginDirPath}/styles.css`;
        await adapter.writeBinary(stylesPath, stylesBuffer);
        writtenFiles.push(stylesPath);
      } catch {
        // styles.css is optional, so we ignore errors
        debugLog(`styles.css not found for ${manifest.id}, skipping`);
      }

      showSuccess(`Plugin ${manifest.name} installed successfully!`);
      return {
        success: true,
        pluginId: manifest.id,
      };
    } catch (error) {
      // Rollback: delete any files that were written
      for (const filePath of writtenFiles) {
        try {
          const file = this.app.vault.getAbstractFileByPath(filePath);
          if (file) {
            await this.app.vault.delete(file);
          }
        } catch (rollbackError) {
          console.warn(`Failed to rollback file ${filePath}:`, rollbackError);
        }
      }

      // Try to remove plugin directory if it's empty
      try {
        const pluginDirFile =
          this.app.vault.getAbstractFileByPath(pluginDirPath);
        if (pluginDirFile instanceof TFolder) {
          const children = pluginDirFile.children;
          if (!children || children.length === 0) {
            await adapter.rmdir(pluginDirPath, true);
          }
        }
      } catch (rollbackError) {
        // Ignore rollback errors for directory cleanup
        console.warn(`Failed to cleanup plugin directory:`, rollbackError);
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error) || "Unknown error occurred";
      showError(`Failed to install plugin: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        pluginId: manifest.id,
      };
    }
  }

  /**
   * Uninstall a plugin by removing its directory
   * Deletes the entire plugin directory from the vault's plugins folder
   * @param pluginId The ID of the plugin to uninstall
   * @returns Installation status indicating success or failure with error message if applicable
   */
  async uninstallPlugin(pluginId: string): Promise<InstallationStatus> {
    try {
      const pluginDirPath = this.getPluginDirPath(pluginId);
      const pluginDirFile = this.app.vault.getAbstractFileByPath(pluginDirPath);

      if (!pluginDirFile) {
        throw new Error("Plugin not found");
      }

      // Delete plugin directory with error handling
      try {
        await this.app.vault.adapter.rmdir(pluginDirPath, true);
      } catch (rmdirError) {
        // If directory doesn't exist or is already deleted, that's okay
        const errorMessage =
          rmdirError instanceof Error ? rmdirError.message : String(rmdirError);
        if (
          !errorMessage.includes("not found") &&
          !errorMessage.includes("does not exist")
        ) {
          throw rmdirError;
        }
      }

      showSuccess(`Plugin ${pluginId} uninstalled successfully!`);
      return {
        success: true,
        pluginId: pluginId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error) || "Unknown error occurred";
      showError(`Failed to uninstall plugin: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        pluginId: pluginId,
      };
    }
  }

  /**
   * Enable a plugin after installation
   * Note: Obsidian's plugin management API is not publicly exposed.
   * This method attempts to enable the plugin using internal APIs if available,
   * otherwise shows a message asking the user to enable manually in Settings.
   * @param pluginId The ID of the plugin to enable
   * @throws Does not throw, but logs warnings if enabling fails
   */
  async enablePlugin(pluginId: string): Promise<void> {
    try {
      // Try to access Obsidian's internal plugin manager
      if (hasEnablePlugin(this.app)) {
        await this.app.plugins.enablePlugin(pluginId);
        showSuccess(`Plugin ${pluginId} installed and enabled successfully!`);
        return;
      }
    } catch (error) {
      console.warn(`Failed to enable plugin programmatically:`, error);
    }

    // Fallback: show message asking user to enable manually
    showSuccess(
      `Plugin ${pluginId} installed. Please enable it in Settings > Community plugins.`,
    );
  }
}
