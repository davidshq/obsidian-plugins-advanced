/**
 * Type definitions for Obsidian Community Plugin Browser
 */

/**
 * Plugin entry from community-plugins.json
 */
export interface CommunityPlugin {
	id: string;
	name: string;
	author: string;
	description: string;
	repo: string;
	branch?: string;
	isDesktopOnly?: boolean;
}

/**
 * Plugin manifest.json structure
 */
export interface PluginManifest {
	id: string;
	name: string;
	version: string;
	minAppVersion: string;
	description: string;
	author: string;
	authorUrl?: string;
	fundingUrl?: string;
	isDesktopOnly?: boolean;
}

/**
 * Extended plugin information with fetched data
 */
export interface PluginInfo extends CommunityPlugin {
	manifest?: PluginManifest;
	readme?: string;
	installed?: boolean;
	installedVersion?: string;
}

/**
 * Plugin installation status
 */
export interface InstallationStatus {
	success: boolean;
	error?: string;
	pluginId: string;
}

/**
 * View display mode
 */
export type DisplayMode = "grid" | "list";

/**
 * Search filter options
 */
export interface SearchFilters {
	query: string;
	showInstalledOnly: boolean;
}

/**
 * View location preference
 */
export type ViewLocation = "main" | "right" | "window";

/**
 * Plugin settings
 */
export interface PluginSettings {
	viewLocation: ViewLocation;
}

