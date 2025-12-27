/**
 * Service for fetching and managing plugin data from obsidian-releases
 */

import { requestUrl } from "obsidian";
import { CommunityPlugin, PluginInfo, PluginManifest } from "../types";
import { getGitHubRawUrl, showError } from "../utils";

const COMMUNITY_PLUGINS_URL =
	"https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json";

export class PluginService {
	private cachedPlugins: CommunityPlugin[] | null = null;
	private cacheTimestamp = 0;
	private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

	/**
	 * Fetch the list of community plugins
	 */
	async fetchCommunityPlugins(forceRefresh = false): Promise<CommunityPlugin[]> {
		// Return cached data if still valid
		if (
			!forceRefresh &&
			this.cachedPlugins &&
			Date.now() - this.cacheTimestamp < this.CACHE_DURATION
		) {
			return this.cachedPlugins;
		}

		try {
			const response = await requestUrl({
				url: COMMUNITY_PLUGINS_URL,
				method: "GET",
			});

			const plugins: CommunityPlugin[] = response.json;
			if (!Array.isArray(plugins)) {
				throw new Error("Invalid plugin list format");
			}

			// Validate plugin entries
			const validPlugins = plugins.filter((plugin) => {
				return (
					plugin.id &&
					plugin.name &&
					plugin.author &&
					plugin.description &&
					plugin.repo
				);
			});

			this.cachedPlugins = validPlugins;
			this.cacheTimestamp = Date.now();
			return validPlugins;
		} catch (error) {
			if (this.cachedPlugins) {
				// Return stale cache if available
				console.warn("Failed to fetch plugins, using cached data:", error);
				return this.cachedPlugins;
			}
			const errorMessage = error instanceof Error ? error.message : String(error);
			showError(`Failed to fetch plugin list: ${errorMessage}`);
			throw error;
		}
	}

	/**
	 * Fetch plugin manifest.json from GitHub
	 */
	async fetchPluginManifest(plugin: CommunityPlugin): Promise<PluginManifest | null> {
		const branch = plugin.branch || "master";
		const manifestUrl = getGitHubRawUrl(plugin.repo, branch, "manifest.json");

		try {
			const response = await requestUrl({
				url: manifestUrl,
				method: "GET",
			});

			const manifest: PluginManifest = response.json;
			return manifest;
		} catch (error) {
			console.warn(`Failed to fetch manifest for ${plugin.id}:`, error);
			return null;
		}
	}

	/**
	 * Fetch plugin README.md from GitHub
	 */
	async fetchPluginReadme(plugin: CommunityPlugin): Promise<string | null> {
		const branch = plugin.branch || "master";
		const readmeUrl = getGitHubRawUrl(plugin.repo, branch, "README.md");

		try {
			const response = await requestUrl({
				url: readmeUrl,
				method: "GET",
			});

			return response.text;
		} catch (error) {
			console.warn(`Failed to fetch README for ${plugin.id}:`, error);
			return null;
		}
	}

	/**
	 * Get full plugin information including manifest and README
	 */
	async getPluginInfo(plugin: CommunityPlugin): Promise<PluginInfo> {
		const [manifest, readme] = await Promise.all([
			this.fetchPluginManifest(plugin),
			this.fetchPluginReadme(plugin),
		]);

		return {
			...plugin,
			manifest: manifest || undefined,
			readme: readme || undefined,
		};
	}

	/**
	 * Search plugins by query string
	 */
	searchPlugins(plugins: CommunityPlugin[], query: string): CommunityPlugin[] {
		if (!query.trim()) {
			return plugins;
		}

		const lowerQuery = query.toLowerCase();
		return plugins.filter(
			(plugin) =>
				plugin.name.toLowerCase().includes(lowerQuery) ||
				plugin.author.toLowerCase().includes(lowerQuery) ||
				plugin.description.toLowerCase().includes(lowerQuery) ||
				plugin.id.toLowerCase().includes(lowerQuery)
		);
	}

	/**
	 * Clear the plugin cache
	 */
	clearCache(): void {
		this.cachedPlugins = null;
		this.cacheTimestamp = 0;
	}
}

