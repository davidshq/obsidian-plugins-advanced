/**
 * Configuration constants for the Community Plugin Browser
 *
 * Centralizes all configuration values including URLs, timeouts, batch sizes,
 * and other constants used throughout the plugin. This makes it easier to
 * tune performance and maintain consistency.
 */

import { PluginConfig } from "./types";

/**
 * Default configuration values for the plugin
 *
 * Contains all URLs, timeouts, batch processing settings, and other constants.
 * All magic numbers should be moved here for easier maintenance and tuning.
 */
export const PLUGIN_CONFIG: PluginConfig = {
  urls: {
    communityPlugins:
      "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json",
    communityPluginStats:
      "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json",
    githubApi: "https://api.github.com",
    githubRaw: "https://raw.githubusercontent.com",
    githubReleases: "https://github.com",
  },
  constants: {
    cacheDuration: 60 * 60 * 1000, // 1 hour (default, updated based on refresh interval)
    errorCacheDuration: 5 * 60 * 1000, // 5 minutes
    backgroundRefreshInterval: 30 * 60 * 1000, // 30 minutes
    viewInitializationDelay: 100, // 100ms
    batchSize: 10, // Process 10 plugins in parallel per batch
    batchDelay: 100, // 100ms delay between batches
    debounceDelay: 300, // 300ms debounce delay
    statusCheckBatchSize: 20, // Check 20 plugin statuses at a time
    pluginsPerPage: 100, // Number of plugins to show per page (pagination)
    /** Number of plugins to process in parallel when fetching release info */
    releaseInfoBatchSize: 5,
    /** Delay in milliseconds between batches when processing release info to avoid GitHub API rate limits */
    releaseInfoBatchDelay: 2000,
    /** Debounce period in milliseconds for rate limit error notifications to prevent spam */
    rateLimitErrorDebounceMs: 20000,
    retry: {
      maxRetries: 3, // Maximum number of retry attempts
      initialDelay: 1000, // Initial delay in milliseconds (1 second)
      maxDelay: 10000, // Maximum delay in milliseconds (10 seconds)
      backoffMultiplier: 2, // Exponential backoff multiplier
    },
  },
};
