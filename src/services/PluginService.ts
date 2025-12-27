/**
 * Service for fetching and managing plugin data from obsidian-releases
 */

import { requestUrl } from "obsidian";
import {
  CommunityPlugin,
  PluginInfo,
  PluginManifest,
  PluginStatsData,
} from "../types";
import {
  getGitHubRawUrl,
  parseRepo,
  showError,
  getResponseStatus,
  getResponseHeaders,
  getHeaderCaseInsensitive,
  retryRequest,
  shouldRetryHttpError,
  checkRateLimit,
  showRateLimitError,
} from "../utils";
import { PLUGIN_CONFIG } from "../config";

export class PluginService {
  private cachedPlugins: CommunityPlugin[] | null = null;
  private cacheTimestamp = 0;
  private CACHE_DURATION = PLUGIN_CONFIG.constants.cacheDuration; // Configurable via setCacheDuration()
  private pluginsETag: string | null = null; // ETag for community plugins list
  private cachedStats: PluginStatsData | null = null;
  private statsCacheTimestamp = 0;
  private statsETag: string | null = null; // ETag for stats file
  private releaseDateCache: Map<string, Date | null> = new Map();
  private releaseDateCacheTimestamps: Map<string, number> = new Map();
  private releaseDateETags: Map<string, string | null> = new Map(); // ETags for release date API calls
  private releaseDateErrorCache: Map<string, number> = new Map(); // Cache for error timestamps
  private readonly ERROR_CACHE_DURATION =
    PLUGIN_CONFIG.constants.errorCacheDuration;

  /**
   * Check if cached plugins should be used
   * @param forceRefresh If true, bypasses cache
   * @returns True if cache is valid and should be used, false otherwise
   */
  private shouldUseCache(forceRefresh: boolean): boolean {
    return (
      !forceRefresh &&
      this.cachedPlugins !== null &&
      Date.now() - this.cacheTimestamp < this.CACHE_DURATION
    );
  }

  /**
   * Get cached plugins if cache is valid
   * @param forceRefresh If true, bypasses cache
   * @returns Cached plugins if cache is valid, null otherwise
   */
  private getCachedPluginsIfValid(
    forceRefresh: boolean,
  ): CommunityPlugin[] | null {
    if (this.shouldUseCache(forceRefresh)) {
      return this.cachedPlugins;
    }
    return null;
  }

  /**
   * Prepare request headers for conditional request using ETag
   * @param forceRefresh If true, bypasses ETag header
   * @returns Headers object for the request
   */
  private prepareRequestHeaders(forceRefresh: boolean): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.pluginsETag && !forceRefresh) {
      headers["If-None-Match"] = this.pluginsETag;
    }
    return headers;
  }

  /**
   * Handle 304 Not Modified response
   * Updates cache timestamp and returns cached data
   * @returns Cached plugins if available, null otherwise
   */
  private handle304Response(): CommunityPlugin[] | null {
    if (this.cachedPlugins) {
      this.cacheTimestamp = Date.now();
      return this.cachedPlugins;
    }
    return null;
  }

  /**
   * Handle rate limit errors
   * Shows error message and returns cached data if available
   * @param rateLimitInfo Rate limit information
   * @returns Cached plugins if available
   * @throws Error if no cached data available
   */
  private handleRateLimit(rateLimitInfo: {
    isRateLimit: boolean;
    resetTime?: Date;
    message?: string;
  }): CommunityPlugin[] {
    const resetTime = rateLimitInfo.resetTime ?? new Date();
    const message = rateLimitInfo.message ?? "Rate limit exceeded";
    showRateLimitError(resetTime, message);
    if (this.cachedPlugins) {
      return this.cachedPlugins;
    }
    throw new Error("Rate limit exceeded and no cached data available");
  }

  /**
   * Validate and parse plugin data from response
   * Filters out invalid plugin entries
   * @param response The response object from the API
   * @returns Array of valid plugins
   * @throws Error if response is invalid
   */
  private validateAndParsePlugins(response: {
    json: unknown;
  }): CommunityPlugin[] {
    // Validate response is valid JSON and has expected structure
    let plugins: CommunityPlugin[];
    try {
      plugins = response.json as CommunityPlugin[];
    } catch (error) {
      throw new Error(
        `Failed to parse plugin list JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!Array.isArray(plugins)) {
      throw new Error("Invalid plugin list format: expected array");
    }

    // Check for empty array
    if (plugins.length === 0) {
      console.warn("Received empty plugin list from API");
      // Return empty array but don't cache it - might be a temporary API issue
      return [];
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

    return validPlugins;
  }

  /**
   * Handle fetch errors with fallback to cache
   * Checks for rate limits, 304 responses, and returns cached data if available
   * @param error The error that occurred
   * @returns Cached plugins if available
   * @throws Error if no cached data available
   */
  private handleFetchError(error: unknown): CommunityPlugin[] {
    // Check for rate limit errors
    const rateLimitInfo = checkRateLimit(error);
    if (rateLimitInfo?.isRateLimit) {
      return this.handleRateLimit(rateLimitInfo);
    }

    // Check if it's a 304 response (Obsidian's requestUrl may throw on 304)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("304") || errorMessage.includes("Not Modified")) {
      const cached = this.handle304Response();
      if (cached) {
        return cached;
      }
    }

    if (this.cachedPlugins) {
      // Return stale cache if available
      console.warn("Failed to fetch plugins, using cached data:", error);
      return this.cachedPlugins;
    }
    showError(`Failed to fetch plugin list: ${errorMessage}`);
    throw error;
  }

  /**
   * Fetch the list of community plugins
   * Uses ETags to check if data has changed without downloading if unchanged
   * @param forceRefresh If true, bypasses cache and forces a fresh fetch
   * @returns Array of community plugins
   */
  async fetchCommunityPlugins(
    forceRefresh = false,
  ): Promise<CommunityPlugin[]> {
    // Return cached data if still valid and not forcing refresh
    const cached = this.getCachedPluginsIfValid(forceRefresh);
    if (cached !== null) {
      return cached;
    }

    try {
      // Prepare headers for conditional request
      const headers = this.prepareRequestHeaders(forceRefresh);

      const response = await retryRequest(
        () =>
          requestUrl({
            url: PLUGIN_CONFIG.urls.communityPlugins,
            method: "GET",
            headers: Object.keys(headers).length > 0 ? headers : undefined,
          }),
        {
          maxRetries: PLUGIN_CONFIG.constants.retry.maxRetries,
          initialDelay: PLUGIN_CONFIG.constants.retry.initialDelay,
          maxDelay: PLUGIN_CONFIG.constants.retry.maxDelay,
          backoffMultiplier: PLUGIN_CONFIG.constants.retry.backoffMultiplier,
          shouldRetry: shouldRetryHttpError,
        },
      );

      // Check if server returned 304 Not Modified
      // Note: Obsidian's requestUrl may throw on 304, so we also check in catch block
      const responseStatus = getResponseStatus(response);
      if (responseStatus === 304) {
        const cached = this.handle304Response();
        if (cached) {
          return cached;
        }
        // If we somehow got 304 but have no cache, fall through to fetch
      }

      // Extract ETag from response headers if present (case-insensitive)
      const responseHeaders = getResponseHeaders(response);

      // Check for rate limit errors in response
      const rateLimitInfo = checkRateLimit(null, {
        status: responseStatus,
        headers: responseHeaders,
      });
      if (rateLimitInfo?.isRateLimit) {
        return this.handleRateLimit(rateLimitInfo);
      }

      const etag = getHeaderCaseInsensitive(responseHeaders, "etag");
      if (etag) {
        this.pluginsETag = etag;
      }

      // Validate and parse plugins
      const validPlugins = this.validateAndParsePlugins(response);

      // Update cache
      this.cachedPlugins = validPlugins;
      this.cacheTimestamp = Date.now();
      return validPlugins;
    } catch (error) {
      return this.handleFetchError(error);
    }
  }

  /**
   * Fetch plugin manifest.json from GitHub
   * @param plugin The plugin to fetch the manifest for
   * @returns The plugin manifest, or null if fetch fails or manifest is invalid
   */
  async fetchPluginManifest(
    plugin: CommunityPlugin,
  ): Promise<PluginManifest | null> {
    try {
      const branch = plugin.branch || "master";
      const manifestUrl = getGitHubRawUrl(plugin.repo, branch, "manifest.json");

      const response = await retryRequest(
        () =>
          requestUrl({
            url: manifestUrl,
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

      // Validate response is valid JSON
      let manifest: PluginManifest;
      try {
        manifest = response.json;
      } catch (error) {
        throw new Error(
          `Failed to parse manifest JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Validate manifest has required fields
      if (!manifest.id || !manifest.name || !manifest.version) {
        throw new Error("Invalid manifest format: missing required fields");
      }

      return manifest;
    } catch (error) {
      console.warn(`Failed to fetch manifest for ${plugin.id}:`, error);
      return null;
    }
  }

  /**
   * Fetch plugin README.md from GitHub
   * @param plugin The plugin to fetch the README for
   * @returns The README content as a string, or null if fetch fails
   */
  async fetchPluginReadme(plugin: CommunityPlugin): Promise<string | null> {
    try {
      const branch = plugin.branch || "master";
      const readmeUrl = getGitHubRawUrl(plugin.repo, branch, "README.md");

      const response = await retryRequest(
        () =>
          requestUrl({
            url: readmeUrl,
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

      // Validate response has text content
      if (typeof response.text !== "string") {
        throw new Error("Invalid README response: expected text content");
      }

      return response.text;
    } catch (error) {
      console.warn(`Failed to fetch README for ${plugin.id}:`, error);
      return null;
    }
  }

  /**
   * Get full plugin information including manifest and README
   * Fetches both manifest and README in parallel for better performance
   * @param plugin The plugin to get full information for
   * @returns PluginInfo object with manifest and README populated (if available)
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
   * @param plugins Array of plugins to search
   * @param query Search query string (will be sanitized)
   * @returns Filtered array of plugins matching the query
   */
  searchPlugins(plugins: CommunityPlugin[], query: string): CommunityPlugin[] {
    const sanitizedQuery = query.trim();
    if (!sanitizedQuery) {
      return plugins;
    }

    // Sanitize query to prevent potential issues
    const lowerQuery = sanitizedQuery.toLowerCase();
    return plugins.filter(
      (plugin) =>
        plugin.name.toLowerCase().includes(lowerQuery) ||
        plugin.author.toLowerCase().includes(lowerQuery) ||
        plugin.description.toLowerCase().includes(lowerQuery) ||
        plugin.id.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Fetch release data from GitHub API for a plugin
   * Handles common logic: repo parsing, API request, ETags, rate limits, error handling
   * @param plugin The plugin to fetch release data for
   * @param forceRefresh If true, bypasses cache and forces a fresh fetch
   * @param cacheKey Cache key for storing ETag (typically plugin.id)
   * @returns Release data with published_at and assets, or null if fetch fails
   */
  private async fetchReleaseFromGitHub(
    plugin: CommunityPlugin,
    forceRefresh: boolean,
    cacheKey: string,
  ): Promise<{
    published_at?: string;
    assets?: Array<{ download_count?: number }>;
  } | null> {
    try {
      let owner: string;
      let name: string;

      try {
        const parsed = parseRepo(plugin.repo);
        owner = parsed.owner;
        name = parsed.name;
      } catch (error) {
        console.warn(
          `Invalid repo format for ${plugin.id}: ${plugin.repo}`,
          error,
        );
        return null;
      }

      // Validate parsed components
      if (!owner || !name) {
        console.warn(`Invalid repo format for ${plugin.id}: ${plugin.repo}`);
        return null;
      }

      const apiUrl = `${PLUGIN_CONFIG.urls.githubApi}/repos/${owner}/${name}/releases/latest`;

      // Prepare headers for conditional request
      const headers: Record<string, string> = {};
      const cachedETag = this.releaseDateETags.get(cacheKey);
      if (cachedETag && !forceRefresh) {
        headers["If-None-Match"] = cachedETag;
      }

      const response = await retryRequest(
        () =>
          requestUrl({
            url: apiUrl,
            method: "GET",
            headers: Object.keys(headers).length > 0 ? headers : undefined,
          }),
        {
          maxRetries: PLUGIN_CONFIG.constants.retry.maxRetries,
          initialDelay: PLUGIN_CONFIG.constants.retry.initialDelay,
          maxDelay: PLUGIN_CONFIG.constants.retry.maxDelay,
          backoffMultiplier: PLUGIN_CONFIG.constants.retry.backoffMultiplier,
          shouldRetry: shouldRetryHttpError,
        },
      );

      // Check if server returned 304 Not Modified
      // Note: Obsidian's requestUrl may throw on 304, so we also check in catch block
      const responseStatus = getResponseStatus(response);

      // Extract ETag from response headers if present (case-insensitive)
      const responseHeaders = getResponseHeaders(response);

      // Check for rate limit errors in response
      const rateLimitInfo = checkRateLimit(null, {
        status: responseStatus,
        headers: responseHeaders,
      });
      if (rateLimitInfo?.isRateLimit) {
        showRateLimitError(rateLimitInfo.resetTime, rateLimitInfo.message);
        return null;
      }

      const etag = getHeaderCaseInsensitive(responseHeaders, "etag");
      if (etag) {
        this.releaseDateETags.set(cacheKey, etag);
      }

      if (responseStatus === 304) {
        // For 304, try to parse JSON if available (some mocks/test scenarios include it)
        // In real scenarios, 304 typically has no body, so caller should use cache
        try {
          const release = response.json;
          if (release && (release.published_at || release.assets)) {
            return release;
          }
        } catch {
          // No JSON in 304 response, which is normal
        }
        // Return null to indicate data hasn't changed (caller should use cache)
        return null;
      }

      // Validate response is valid JSON
      let release: {
        published_at?: string;
        assets?: Array<{ download_count?: number }>;
      };
      try {
        release = response.json;
      } catch (error) {
        throw new Error(
          `Failed to parse release JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return release;
    } catch (error) {
      // Check for rate limit errors
      const rateLimitInfo = checkRateLimit(error);
      if (rateLimitInfo?.isRateLimit) {
        showRateLimitError(rateLimitInfo.resetTime, rateLimitInfo.message);
        return null;
      }

      // Check if it's a 304 response (Obsidian's requestUrl may throw on 304)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("304") ||
        errorMessage.includes("Not Modified")
      ) {
        // Return null to indicate data hasn't changed (caller should use cache)
        return null;
      }

      // If 404, there are no releases - clear ETag and return null
      if (error instanceof Error && error.message.includes("404")) {
        this.releaseDateETags.set(cacheKey, null);
        // Clear error cache since 404 is a valid response
        this.releaseDateErrorCache.delete(cacheKey);
        return null;
      }

      // For other errors, log and return null
      console.warn(`Failed to fetch release data for ${plugin.id}:`, error);
      return null;
    }
  }

  /**
   * Get release date from pre-loaded stats data
   * This is an optimized version that uses already-loaded stats to avoid re-parsing
   * @param plugin The plugin to get the release date for
   * @param stats Pre-loaded stats data
   * @returns The date of the latest release from stats, or null if not found
   */
  getReleaseDateFromStats(
    plugin: CommunityPlugin,
    stats: PluginStatsData,
  ): Date | null {
    const cacheKey = plugin.id;
    const pluginStats = stats[plugin.id];
    if (pluginStats?.updated) {
      const date = new Date(pluginStats.updated);
      if (!isNaN(date.getTime())) {
        // Update cache for consistency
        this.releaseDateCache.set(cacheKey, date);
        this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
        return date;
      }
    }
    return null;
  }

  /**
   * Get release date from cache if available
   * Synchronous method to check cache without making any API calls
   * @param pluginId The plugin ID to check
   * @returns Object with date (Date | null) and found (boolean) indicating if cache was hit
   *         - If found=true and date=null: plugin has no releases (cached)
   *         - If found=false: plugin not in cache or cache expired
   */
  getCachedReleaseDate(pluginId: string): {
    date: Date | null;
    found: boolean;
  } {
    const cachedDate = this.releaseDateCache.get(pluginId);
    const cacheTimestamp = this.releaseDateCacheTimestamps.get(pluginId);

    if (
      cachedDate !== undefined &&
      cacheTimestamp !== undefined &&
      Date.now() - cacheTimestamp < this.CACHE_DURATION
    ) {
      return { date: cachedDate, found: true };
    }

    return { date: null, found: false };
  }

  /**
   * Fetch the latest release date for a plugin
   * Checks cache first (fastest), then stats file (no API calls), then GitHub API as last resort
   * Uses ETags to check if data has changed without downloading if unchanged
   * @param plugin The plugin to get the release date for
   * @param forceRefresh If true, bypasses cache and forces a fresh fetch
   * @returns The date of the latest release, or null if no releases found or error occurs
   */
  async getLatestReleaseDate(
    plugin: CommunityPlugin,
    forceRefresh = false,
  ): Promise<Date | null> {
    const cacheKey = plugin.id;

    // Check cache first (fastest, synchronous, no API calls)
    // This is checked first because cache may have been populated from stats or previous API calls
    if (!forceRefresh) {
      const cachedDate = this.releaseDateCache.get(cacheKey);
      const cacheTimestamp = this.releaseDateCacheTimestamps.get(cacheKey);

      if (
        cachedDate !== undefined &&
        cacheTimestamp !== undefined &&
        Date.now() - cacheTimestamp < this.CACHE_DURATION
      ) {
        return cachedDate;
      }
    }

    // Second, try to get data from stats file (no API calls, but async)
    if (!forceRefresh) {
      try {
        const stats = await this.fetchPluginStats(false);
        if (stats && stats[plugin.id]) {
          const updated = stats[plugin.id].updated;
          if (updated) {
            const date = new Date(updated);
            if (!isNaN(date.getTime())) {
              // Update cache for consistency
              this.releaseDateCache.set(cacheKey, date);
              this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
              return date;
            }
          }
        }
      } catch (error) {
        // Stats file unavailable or error - continue to API fallback
        console.warn(
          `Failed to get release date from stats for ${plugin.id}, trying API:`,
          error,
        );
      }
    }

    // Check error cache - if we recently had a non-404 error, return null without retrying
    if (!forceRefresh) {
      const errorTimestamp = this.releaseDateErrorCache.get(cacheKey);
      if (
        errorTimestamp !== undefined &&
        Date.now() - errorTimestamp < this.ERROR_CACHE_DURATION
      ) {
        return null;
      }
    }

    // Last resort: Fetch release data from GitHub API (only if stats and cache don't have it)
    const release = await this.fetchReleaseFromGitHub(
      plugin,
      forceRefresh,
      cacheKey,
    );

    // Handle 304 response (data hasn't changed)
    if (release === null) {
      // Check if we have cached date (304 response means data hasn't changed)
      // Re-check cache in case it was populated between our initial check and now
      const cachedDate = this.releaseDateCache.get(cacheKey);
      if (cachedDate !== undefined) {
        this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
        return cachedDate;
      }
      // No cache available, return null
      return null;
    }

    // Process release data
    if (release.published_at) {
      const releaseDate = new Date(release.published_at);
      // Validate date is valid
      if (isNaN(releaseDate.getTime())) {
        console.warn(
          `Invalid release date format for ${plugin.id}: ${release.published_at}`,
        );
        // Cache null to avoid repeated requests
        this.releaseDateCache.set(cacheKey, null);
        this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
        return null;
      }
      this.releaseDateCache.set(cacheKey, releaseDate);
      this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
      // Clear error cache on success
      this.releaseDateErrorCache.delete(cacheKey);
      return releaseDate;
    }

    // No releases found, cache null to avoid repeated requests
    this.releaseDateCache.set(cacheKey, null);
    this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
    return null;
  }

  /**
   * Fetch plugin statistics from community-plugin-stats.json
   * Uses ETags to check if data has changed without downloading if unchanged
   * @param forceRefresh If true, bypasses cache and forces a fresh fetch
   * @returns PluginStatsData object mapping plugin IDs to their stats
   */
  async fetchPluginStats(
    forceRefresh = false,
  ): Promise<PluginStatsData | null> {
    // Return cached data if still valid and not forcing refresh
    if (
      !forceRefresh &&
      this.cachedStats &&
      Date.now() - this.statsCacheTimestamp < this.CACHE_DURATION
    ) {
      return this.cachedStats;
    }

    try {
      // Prepare headers for conditional request
      const headers: Record<string, string> = {};
      if (this.statsETag && !forceRefresh) {
        headers["If-None-Match"] = this.statsETag;
      }

      const response = await retryRequest(
        () =>
          requestUrl({
            url: PLUGIN_CONFIG.urls.communityPluginStats,
            method: "GET",
            headers: Object.keys(headers).length > 0 ? headers : undefined,
          }),
        {
          maxRetries: PLUGIN_CONFIG.constants.retry.maxRetries,
          initialDelay: PLUGIN_CONFIG.constants.retry.initialDelay,
          maxDelay: PLUGIN_CONFIG.constants.retry.maxDelay,
          backoffMultiplier: PLUGIN_CONFIG.constants.retry.backoffMultiplier,
          shouldRetry: shouldRetryHttpError,
        },
      );

      // Check if server returned 304 Not Modified
      const responseStatus = getResponseStatus(response);
      if (responseStatus === 304) {
        // Data hasn't changed, update cache timestamp and return cached data
        if (this.cachedStats) {
          this.statsCacheTimestamp = Date.now();
          return this.cachedStats;
        }
      }

      // Extract ETag from response headers if present
      const responseHeaders = getResponseHeaders(response);

      // Check for rate limit errors in response
      const rateLimitInfo = checkRateLimit(null, {
        status: responseStatus,
        headers: responseHeaders,
      });
      if (rateLimitInfo?.isRateLimit) {
        showRateLimitError(rateLimitInfo.resetTime, rateLimitInfo.message);
        // Return cached stats if available
        return this.cachedStats;
      }

      const etag = getHeaderCaseInsensitive(responseHeaders, "etag");
      if (etag) {
        this.statsETag = etag;
      }

      // Validate response is valid JSON
      let stats: PluginStatsData;
      try {
        stats = response.json;
      } catch (error) {
        throw new Error(
          `Failed to parse stats JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Validate stats structure
      if (!stats || typeof stats !== "object") {
        throw new Error("Invalid stats data structure");
      }

      // Update cache
      this.cachedStats = stats;
      this.statsCacheTimestamp = Date.now();

      return stats;
    } catch (error) {
      // Check if it's a 304 response
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("304") ||
        errorMessage.includes("Not Modified")
      ) {
        if (this.cachedStats) {
          this.statsCacheTimestamp = Date.now();
          return this.cachedStats;
        }
      }

      // Check for rate limit errors
      const responseHeaders =
        error instanceof Error && "response" in error
          ? (
              error as {
                response?: {
                  status?: number;
                  headers?: Record<string, string>;
                };
              }
            ).response
          : undefined;
      const rateLimitInfo = checkRateLimit(error, responseHeaders);
      if (rateLimitInfo?.isRateLimit) {
        showRateLimitError(rateLimitInfo.resetTime, rateLimitInfo.message);
        // Return cached stats if available, otherwise null
        return this.cachedStats;
      }

      // If 404, stats file doesn't exist (optional file)
      if (error instanceof Error && error.message.includes("404")) {
        console.warn("Stats file not found, continuing without stats");
        return null;
      }

      // For other errors, log and return null (stats are optional)
      console.warn("Failed to fetch plugin stats:", error);
      return null;
    }
  }

  /**
   * Get latest release information including date and download count
   * Uses stats file or cache only - never calls GitHub API to avoid rate limiting
   * This method is used for displaying "Updated X ago" and download counts on plugin cards
   * @param plugin The plugin to get release info for
   * @param forceRefresh If true, bypasses cache and forces a fresh fetch of stats
   * @returns Object with release date and total download count, or null if no data found
   */
  async getLatestReleaseInfo(
    plugin: CommunityPlugin,
    forceRefresh = false,
  ): Promise<{ date: Date; downloads: number } | null> {
    // First, try to get data from stats file (no API calls)
    try {
      const stats = await this.fetchPluginStats(forceRefresh);
      if (stats && stats[plugin.id]) {
        const pluginStats = stats[plugin.id];
        let date: Date | null = null;
        let downloads = pluginStats.downloads || 0;

        // Parse updated date if available
        if (pluginStats.updated) {
          date = new Date(pluginStats.updated);
          if (isNaN(date.getTime())) {
            date = null;
          }
        }

        // If we have date from stats, use it (even if downloads is 0)
        if (date) {
          // Update cache for consistency
          this.releaseDateCache.set(plugin.id, date);
          this.releaseDateCacheTimestamps.set(plugin.id, Date.now());
          return { date, downloads };
        }

        // If we have downloads but no date, try to get date from cache
        if (downloads > 0) {
          const cachedDate = this.releaseDateCache.get(plugin.id);
          if (cachedDate) {
            return { date: cachedDate, downloads };
          }
        }
      }
    } catch (error) {
      console.warn(
        `Failed to get stats for ${plugin.id}, trying cache:`,
        error,
      );
    }

    // Fall back to cache only (no GitHub API calls)
    const cacheKey = plugin.id;
    const cachedDate = this.releaseDateCache.get(cacheKey);
    const cacheTimestamp = this.releaseDateCacheTimestamps.get(cacheKey);

    // Check cache - if we have a cached date, return it with 0 downloads
    if (
      !forceRefresh &&
      cachedDate !== undefined &&
      cachedDate !== null &&
      cacheTimestamp !== undefined &&
      Date.now() - cacheTimestamp < this.CACHE_DURATION
    ) {
      // Return cached date with 0 downloads (downloads not available from cache)
      return { date: cachedDate, downloads: 0 };
    }

    // No data available from stats or cache - return null
    // This prevents GitHub API calls for display purposes
    return null;
  }

  /**
   * Set the cache duration for plugin data, stats, and release dates
   * Cache duration should be slightly longer than the refresh interval to account for timing variations
   * @param durationMs Cache duration in milliseconds
   */
  setCacheDuration(durationMs: number): void {
    this.CACHE_DURATION = durationMs;
  }

  /**
   * Get the current cache duration
   * @returns Cache duration in milliseconds
   */
  getCacheDuration(): number {
    return this.CACHE_DURATION;
  }

  /**
   * Clear the plugin cache
   * Removes all cached plugin data, stats, release dates, ETags, and error caches.
   * Useful for forcing a fresh fetch on the next request.
   */
  clearCache(): void {
    this.cachedPlugins = null;
    this.cacheTimestamp = 0;
    this.pluginsETag = null;
    this.cachedStats = null;
    this.statsCacheTimestamp = 0;
    this.statsETag = null;
    this.releaseDateCache.clear();
    this.releaseDateCacheTimestamps.clear();
    this.releaseDateETags.clear();
    this.releaseDateErrorCache.clear();
  }

  /**
   * Refresh plugin data in the background using conditional requests
   * Only updates cache if data has actually changed
   * @returns true if data was updated, false if unchanged
   */
  async refreshPluginsIfChanged(): Promise<boolean> {
    try {
      const beforePlugins = this.cachedPlugins ? [...this.cachedPlugins] : [];
      const beforeIds = new Set(beforePlugins.map((p) => p.id));
      await this.fetchCommunityPlugins(false); // Uses conditional request
      const afterPlugins = this.cachedPlugins || [];
      const afterIds = new Set(afterPlugins.map((p) => p.id));

      // Check if plugin IDs changed (plugins added/removed)
      if (beforeIds.size !== afterIds.size) {
        return true;
      }

      // Check if any plugin IDs are different
      for (const id of beforeIds) {
        if (!afterIds.has(id)) {
          return true;
        }
      }

      // Check if any plugin data changed by comparing key fields
      // This is more efficient than deep comparison
      for (const beforePlugin of beforePlugins) {
        const afterPlugin = afterPlugins.find((p) => p.id === beforePlugin.id);
        if (!afterPlugin) {
          return true;
        }
        // Compare key fields that might change
        if (
          beforePlugin.name !== afterPlugin.name ||
          beforePlugin.description !== afterPlugin.description ||
          beforePlugin.repo !== afterPlugin.repo ||
          beforePlugin.author !== afterPlugin.author
        ) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.warn("Background refresh failed:", error);
      return false;
    }
  }
}
