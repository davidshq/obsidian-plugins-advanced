/**
 * Service for installing and managing plugins
 */

import { App, requestUrl, TFile } from "obsidian";
import { PluginManifest, InstallationStatus } from "../types";
import { getGitHubReleaseUrl, showError, showSuccess, isCompatible } from "../utils";

export class InstallationService {
	constructor(private app: App) {}

	/**
	 * Get the plugins directory path
	 */
	private getPluginsDir(): string {
		return `${this.app.vault.configDir}/plugins`;
	}

	/**
	 * Get the plugin directory path for a specific plugin
	 */
	private getPluginDir(pluginId: string): string {
		return `${this.getPluginsDir()}/${pluginId}`;
	}

	/**
	 * Get the plugin directory path relative to vault root
	 * configDir is typically ".obsidian", so we need ".obsidian/plugins/pluginId"
	 */
	private getPluginDirPath(pluginId: string): string {
		// configDir is relative to vault root (e.g., ".obsidian")
		// So we return ".obsidian/plugins/pluginId"
		return `${this.app.vault.configDir}/plugins/${pluginId}`;
	}

	/**
	 * Check if a plugin is installed
	 */
	async isPluginInstalled(pluginId: string): Promise<boolean> {
		const pluginDirPath = this.getPluginDirPath(pluginId);
		const manifestPath = `${pluginDirPath}/manifest.json`;
		const manifestFile = this.app.vault.getAbstractFileByPath(manifestPath);
		return manifestFile instanceof TFile;
	}

	/**
	 * Get installed plugin version
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
	 * Check if plugin is compatible with current Obsidian version
	 */
	private checkCompatibility(manifest: PluginManifest): boolean {
		// @ts-expect-error - app.version exists but may not be in types
		const currentVersion = this.app.version || "0.0.0";
		return isCompatible(manifest.minAppVersion, currentVersion);
	}

	/**
	 * Download a file from a URL
	 */
	private async downloadFile(url: string): Promise<ArrayBuffer> {
		try {
			const response = await requestUrl({
				url: url,
				method: "GET",
			});
			return response.arrayBuffer;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to download file from ${url}: ${errorMessage}`);
		}
	}

	/**
	 * Ensure the plugin directory exists
	 * Note: Directories are created automatically when writing files
	 */
	private async ensurePluginDir(_pluginId: string): Promise<void> {
		// Directories will be created automatically when we write files
		// No need to check or create them explicitly
	}

	/**
	 * Install a plugin from GitHub release
	 */
	async installPlugin(
		repo: string,
		version: string,
		manifest: PluginManifest
	): Promise<InstallationStatus> {
		try {
			// Check compatibility
			if (!this.checkCompatibility(manifest)) {
				// @ts-expect-error - app.version exists but may not be in types
				const currentVersion = this.app.version || "0.0.0";
				throw new Error(
					`Plugin requires Obsidian ${manifest.minAppVersion} or higher, but you have ${currentVersion}`
				);
			}

			// Ensure plugin directory exists (will be created when writing files)
			await this.ensurePluginDir(manifest.id);

			const adapter = this.app.vault.adapter;
			const pluginDirPath = this.getPluginDirPath(manifest.id);
			
			// Download main.js
			const mainJsUrl = getGitHubReleaseUrl(repo, version, "main.js");
			const mainJsBuffer = await this.downloadFile(mainJsUrl);
			const mainJsPath = `${pluginDirPath}/main.js`;
			await adapter.writeBinary(mainJsPath, mainJsBuffer);

			// Download manifest.json
			const manifestUrl = getGitHubReleaseUrl(repo, version, "manifest.json");
			const manifestBuffer = await this.downloadFile(manifestUrl);
			const manifestPath = `${pluginDirPath}/manifest.json`;
			await adapter.writeBinary(manifestPath, manifestBuffer);

			// Try to download styles.css if it exists
			try {
				const stylesUrl = getGitHubReleaseUrl(repo, version, "styles.css");
				const stylesBuffer = await this.downloadFile(stylesUrl);
				const stylesPath = `${pluginDirPath}/styles.css`;
				await adapter.writeBinary(stylesPath, stylesBuffer);
			} catch (error) {
				// styles.css is optional, so we ignore errors
				console.log(`styles.css not found for ${manifest.id}, skipping`);
			}

			showSuccess(`Plugin ${manifest.name} installed successfully!`);
			return {
				success: true,
				pluginId: manifest.id,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error) || "Unknown error occurred";
			showError(`Failed to install plugin: ${errorMessage}`);
			return {
				success: false,
				error: errorMessage,
				pluginId: manifest.id,
			};
		}
	}

	/**
	 * Uninstall a plugin
	 */
	async uninstallPlugin(pluginId: string): Promise<InstallationStatus> {
		try {
			const pluginDirPath = this.getPluginDirPath(pluginId);
			const pluginDirFile = this.app.vault.getAbstractFileByPath(pluginDirPath);

			if (!pluginDirFile) {
				throw new Error("Plugin not found");
			}

			// Delete plugin directory
			await this.app.vault.adapter.rmdir(pluginDirPath, true);

			showSuccess(`Plugin ${pluginId} uninstalled successfully!`);
			return {
				success: true,
				pluginId: pluginId,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error) || "Unknown error occurred";
			showError(`Failed to uninstall plugin: ${errorMessage}`);
			return {
				success: false,
				error: errorMessage,
				pluginId: pluginId,
			};
		}
	}

	/**
	 * Enable a plugin (requires reloading Obsidian or using internal API)
	 */
	async enablePlugin(pluginId: string): Promise<void> {
		// Note: Enabling plugins programmatically requires access to Obsidian's internal API
		// For now, we'll show a message asking the user to enable it manually
		showSuccess(
			`Plugin ${pluginId} installed. Please enable it in Settings > Community plugins.`
		);
	}
}

