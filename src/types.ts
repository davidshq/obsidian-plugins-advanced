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
  updatedAfter?: Date; // Filter plugins updated after this date
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
  displayMode?: DisplayMode;
  searchFilters?: {
    query: string;
    showInstalledOnly: boolean;
    updatedAfter?: string; // ISO date string for serialization
  };
  paginationThreshold?: number; // Distance from bottom (in pixels) to trigger auto-loading (default: 200)
}

/**
 * Extended Obsidian requestUrl response type
 * Obsidian's requestUrl may include status and headers, but they're not in the official types
 */
export interface ExtendedRequestUrlResponse {
  status?: number;
  headers?: Record<string, string>;
  json: unknown;
  text: string;
  arrayBuffer: ArrayBuffer;
}

/**
 * Plugin sorting options
 */
export type PluginSortOption = "name" | "author" | "updated" | "installed";

/**
 * Plugin statistics from community-plugin-stats.json
 */
export interface PluginStats {
  id: string;
  downloads?: number;
  updated?: string; // ISO date string
  [key: string]: unknown; // Allow for additional stats fields
}

/**
 * Statistics data structure from community-plugin-stats.json
 * Maps plugin ID to stats
 */
export interface PluginStatsData {
  [pluginId: string]: PluginStats;
}

/**
 * Configuration constants
 */
export interface PluginConfig {
  urls: {
    communityPlugins: string;
    communityPluginStats: string;
    githubApi: string;
    githubRaw: string;
    githubReleases: string;
  };
  constants: {
    cacheDuration: number;
    releaseDateCacheDuration: number;
    errorCacheDuration: number;
    backgroundRefreshInterval: number;
    viewInitializationDelay: number;
    batchSize: number;
    batchDelay: number;
    debounceDelay: number;
    statusCheckBatchSize: number;
    pluginsPerPage: number;
    retry: {
      maxRetries: number;
      initialDelay: number;
      maxDelay: number;
      backoffMultiplier: number;
    };
  };
}
