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
  private readonly CACHE_DURATION = PLUGIN_CONFIG.constants.cacheDuration;
  private pluginsETag: string | null = null; // ETag for community plugins list
  private cachedStats: PluginStatsData | null = null;
  private statsCacheTimestamp = 0;
  private statsETag: string | null = null; // ETag for stats file
  private releaseDateCache: Map<string, Date | null> = new Map();
  private readonly RELEASE_DATE_CACHE_DURATION =
    PLUGIN_CONFIG.constants.releaseDateCacheDuration;
  private releaseDateCacheTimestamps: Map<string, number> = new Map();
  private releaseDateETags: Map<string, string | null> = new Map(); // ETags for release date API calls
  private releaseDateErrorCache: Map<string, number> = new Map(); // Cache for error timestamps
  private readonly ERROR_CACHE_DURATION =
    PLUGIN_CONFIG.constants.errorCacheDuration;

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
    if (
      !forceRefresh &&
      this.cachedPlugins &&
      Date.now() - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      return this.cachedPlugins;
    }

    try {
      // Prepare headers for conditional request
      const headers: Record<string, string> = {};
      if (this.pluginsETag && !forceRefresh) {
        headers["If-None-Match"] = this.pluginsETag;
      }

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
        // Data hasn't changed, update cache timestamp and return cached data
        if (this.cachedPlugins) {
          this.cacheTimestamp = Date.now();
          return this.cachedPlugins;
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
        showRateLimitError(rateLimitInfo.resetTime, rateLimitInfo.message);
        // Return cached plugins if available
        if (this.cachedPlugins) {
          return this.cachedPlugins;
        }
        // If no cache, throw error so caller can handle it
        throw new Error("Rate limit exceeded and no cached data available");
      }

      const etag = getHeaderCaseInsensitive(responseHeaders, "etag");
      if (etag) {
        this.pluginsETag = etag;
      }

      // Validate response is valid JSON and has expected structure
      let plugins: CommunityPlugin[];
      try {
        plugins = response.json;
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

      this.cachedPlugins = validPlugins;
      this.cacheTimestamp = Date.now();
      return validPlugins;
    } catch (error) {
      // Check for rate limit errors
      const rateLimitInfo = checkRateLimit(error);
      if (rateLimitInfo?.isRateLimit) {
        showRateLimitError(rateLimitInfo.resetTime, rateLimitInfo.message);
        // Return cached plugins if available
        if (this.cachedPlugins) {
          return this.cachedPlugins;
        }
        // If no cache, throw error so caller can handle it
        throw new Error("Rate limit exceeded and no cached data available");
      }

      // Check if it's a 304 response (Obsidian's requestUrl may throw on 304)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("304") ||
        errorMessage.includes("Not Modified")
      ) {
        if (this.cachedPlugins) {
          this.cacheTimestamp = Date.now();
          return this.cachedPlugins;
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
   * Fetch the latest release date for a plugin from GitHub API
   * Uses ETags to check if data has changed without downloading if unchanged
   * @param plugin The plugin to get the release date for
   * @param forceRefresh If true, bypasses cache and forces a fresh fetch
   * @returns The date of the latest release, or null if no releases found or error occurs
   */
  async getLatestReleaseDate(
    plugin: CommunityPlugin,
    forceRefresh = false,
  ): Promise<Date | null> {
    // Check cache first
    const cacheKey = plugin.id;
    const cachedDate = this.releaseDateCache.get(cacheKey);
    const cacheTimestamp = this.releaseDateCacheTimestamps.get(cacheKey);

    if (
      !forceRefresh &&
      cachedDate !== undefined &&
      cacheTimestamp !== undefined &&
      Date.now() - cacheTimestamp < this.RELEASE_DATE_CACHE_DURATION
    ) {
      return cachedDate;
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
        // Cache null to avoid repeated parsing attempts
        this.releaseDateCache.set(cacheKey, null);
        this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
        return null;
      }

      // Validate parsed components
      if (!owner || !name) {
        console.warn(`Invalid repo format for ${plugin.id}: ${plugin.repo}`);
        this.releaseDateCache.set(cacheKey, null);
        this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
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
      if (responseStatus === 304) {
        // Data hasn't changed, update cache timestamp and return cached data
        if (cachedDate !== undefined) {
          this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
          return cachedDate;
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
        showRateLimitError(rateLimitInfo.resetTime, rateLimitInfo.message);
        // Return cached date if available
        if (cachedDate !== undefined && cachedDate !== null) {
          return cachedDate;
        }
        return null;
      }

      const etag = getHeaderCaseInsensitive(responseHeaders, "etag");
      if (etag) {
        this.releaseDateETags.set(cacheKey, etag);
      }

      // Validate response is valid JSON
      let release: { published_at?: string };
      try {
        release = response.json;
      } catch (error) {
        throw new Error(
          `Failed to parse release JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      if (release && release.published_at) {
        const releaseDate = new Date(release.published_at);
        // Validate date is valid
        if (isNaN(releaseDate.getTime())) {
          throw new Error(
            `Invalid release date format: ${release.published_at}`,
          );
        }
        this.releaseDateCache.set(cacheKey, releaseDate);
        this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
        return releaseDate;
      }

      // No releases found, cache null to avoid repeated requests
      this.releaseDateCache.set(cacheKey, null);
      this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
      return null;
    } catch (error) {
      // Check for rate limit errors
      const rateLimitInfo = checkRateLimit(error);
      if (rateLimitInfo?.isRateLimit) {
        showRateLimitError(rateLimitInfo.resetTime, rateLimitInfo.message);
        // Return cached date if available
        if (cachedDate !== undefined && cachedDate !== null) {
          return cachedDate;
        }
        return null;
      }

      // Check if it's a 304 response (Obsidian's requestUrl may throw on 304)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("304") ||
        errorMessage.includes("Not Modified")
      ) {
        if (cachedDate !== undefined) {
          this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
          return cachedDate;
        }
      }

      // If 404, there are no releases - cache null with full duration
      if (error instanceof Error && error.message.includes("404")) {
        this.releaseDateCache.set(cacheKey, null);
        this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
        this.releaseDateETags.set(cacheKey, null);
        // Clear error cache since 404 is a valid response
        this.releaseDateErrorCache.delete(cacheKey);
        return null;
      }
      // For non-404 errors, cache with shorter TTL to avoid repeated failed requests
      console.warn(`Failed to fetch release date for ${plugin.id}:`, error);
      this.releaseDateErrorCache.set(cacheKey, Date.now());
      return null;
    }
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
   * First tries to get data from stats file (much faster), falls back to GitHub API if needed
   * @param plugin The plugin to get release info for
   * @param forceRefresh If true, bypasses cache and forces a fresh fetch
   * @returns Object with release date and total download count, or null if no data found
   */
  async getLatestReleaseInfo(
    plugin: CommunityPlugin,
    forceRefresh = false,
  ): Promise<{ date: Date; downloads: number } | null> {
    // First, try to get data from stats file (much faster, no API calls)
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

        // If we have downloads but no date, still return it
        // (date might be in a different field or format)
        if (downloads > 0) {
          // Try to get date from cache or fall through to API
          const cachedDate = this.releaseDateCache.get(plugin.id);
          if (cachedDate) {
            return { date: cachedDate, downloads };
          }
        }
      }
    } catch (error) {
      console.warn(
        `Failed to get stats for ${plugin.id}, falling back to API:`,
        error,
      );
    }

    // Fall back to GitHub API if stats don't have the data we need
    const cacheKey = plugin.id;
    const cachedDate = this.releaseDateCache.get(cacheKey);
    const cacheTimestamp = this.releaseDateCacheTimestamps.get(cacheKey);

    // Check cache first
    if (
      !forceRefresh &&
      cachedDate !== undefined &&
      cachedDate !== null &&
      cacheTimestamp !== undefined &&
      Date.now() - cacheTimestamp < this.RELEASE_DATE_CACHE_DURATION
    ) {
      // Return cached date with 0 downloads (we don't cache downloads from API)
      return { date: cachedDate, downloads: 0 };
    }

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
      const responseStatus = getResponseStatus(response);
      if (responseStatus === 304) {
        // Data hasn't changed, return cached data if available
        if (cachedDate !== undefined && cachedDate !== null) {
          // We don't have cached download count, so return null for downloads
          // This is acceptable since downloads are less critical
          return { date: cachedDate, downloads: 0 };
        }
      }

      // Check for rate limit errors in response
      const responseHeaders = getResponseHeaders(response);
      const rateLimitInfo = checkRateLimit(null, {
        status: responseStatus,
        headers: responseHeaders,
      });
      if (rateLimitInfo?.isRateLimit) {
        showRateLimitError(rateLimitInfo.resetTime, rateLimitInfo.message);
        // Return cached data if available
        if (cachedDate !== undefined && cachedDate !== null) {
          return { date: cachedDate, downloads: 0 };
        }
        return null;
      }

      // Extract ETag from response headers if present
      const etag = getHeaderCaseInsensitive(responseHeaders, "etag");
      if (etag) {
        this.releaseDateETags.set(cacheKey, etag);
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

      if (release && release.published_at) {
        const releaseDate = new Date(release.published_at);
        // Validate date is valid
        if (isNaN(releaseDate.getTime())) {
          throw new Error(
            `Invalid release date format: ${release.published_at}`,
          );
        }

        // Calculate total download count from all assets
        let totalDownloads = 0;
        if (release.assets && Array.isArray(release.assets)) {
          totalDownloads = release.assets.reduce(
            (sum, asset) => sum + (asset.download_count || 0),
            0,
          );
        }

        // Update cache
        this.releaseDateCache.set(cacheKey, releaseDate);
        this.releaseDateCacheTimestamps.set(cacheKey, Date.now());

        return { date: releaseDate, downloads: totalDownloads };
      }

      // No releases found
      this.releaseDateCache.set(cacheKey, null);
      this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
      return null;
    } catch (error) {
      // Check for rate limit errors
      const rateLimitInfo = checkRateLimit(error);
      if (rateLimitInfo?.isRateLimit) {
        showRateLimitError(rateLimitInfo.resetTime, rateLimitInfo.message);
        // Return cached data if available
        if (cachedDate !== undefined && cachedDate !== null) {
          return { date: cachedDate, downloads: 0 };
        }
        return null;
      }

      // Check if it's a 304 response
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("304") ||
        errorMessage.includes("Not Modified")
      ) {
        if (cachedDate !== undefined && cachedDate !== null) {
          return { date: cachedDate, downloads: 0 };
        }
      }

      // If 404, there are no releases
      if (error instanceof Error && error.message.includes("404")) {
        this.releaseDateCache.set(cacheKey, null);
        this.releaseDateCacheTimestamps.set(cacheKey, Date.now());
        this.releaseDateETags.set(cacheKey, null);
        this.releaseDateErrorCache.delete(cacheKey);
        return null;
      }

      // For other errors, log and return null
      console.warn(`Failed to fetch release info for ${plugin.id}:`, error);
      this.releaseDateErrorCache.set(cacheKey, Date.now());
      return null;
    }
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
