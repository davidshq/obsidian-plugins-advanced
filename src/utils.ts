/**
 * Utility functions for the Community Plugin Browser
 */

import { Notice, WorkspaceLeaf } from "obsidian";
import { CommunityPlugin, PluginInfo } from "./types";
export { debugLog, debugLogLabel } from "./utils/debug";

/**
 * Format a date string to a relative time (e.g., "2 hours ago")
 * @param dateString The date string to format
 * @returns A human-readable relative time string
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffMonths < 12)
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
}

/**
 * Format a number with commas (e.g., 1000000 -> "1,000,000")
 * @param num The number to format
 * @returns A formatted string with comma separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Show a user-friendly error notification
 * @param message The error message to display
 *
 * Error Handling Strategy:
 * - Use showError() for critical errors that affect user actions or primary functionality:
 *   - Failed to fetch plugin list (when no cache available)
 *   - Failed to install/uninstall plugins
 *   - Failed to copy link to clipboard
 *   - Missing required data (e.g., manifest for installation)
 *
 * - Use console.warn/error for non-critical errors that don't block user experience:
 *   - Failed to fetch individual plugin manifests/READMEs (plugin still shown)
 *   - Failed to fetch release dates (filtering continues)
 *   - Background refresh failures (cached data still available)
 *   - Invalid date formats (filter just doesn't apply)
 *   - Markdown rendering failures (falls back to plain text)
 */
export function showError(message: string): void {
  new Notice(`Error: ${message}`, 5000);
}

/**
 * Show a success notification
 * @param message The success message to display
 */
export function showSuccess(message: string): void {
  new Notice(message, 3000);
}

/**
 * Check if an error is a GitHub API rate limit error
 * @param error The error to check
 * @param response Optional response object to check headers
 * @returns Object with isRateLimit flag and resetTime if available, or null if not a rate limit
 */
export function checkRateLimit(
  error: unknown,
  response?: { status?: number; headers?: Record<string, string> },
): { isRateLimit: boolean; resetTime?: Date; message?: string } | null {
  // Check response status first
  if (response) {
    const status = response.status;
    if (status === 403 || status === 429) {
      // Check for rate limit headers
      const headers = response.headers || {};
      const remaining =
        headers["x-ratelimit-remaining"] || headers["X-RateLimit-Remaining"];
      const reset =
        headers["x-ratelimit-reset"] || headers["X-RateLimit-Reset"];
      const limit =
        headers["x-ratelimit-limit"] || headers["X-RateLimit-Limit"];

      // If remaining is 0 or reset header exists, it's a rate limit
      if (remaining === "0" || reset) {
        let resetTime: Date | undefined;
        if (reset) {
          const resetTimestamp = parseInt(reset, 10);
          if (!isNaN(resetTimestamp)) {
            resetTime = new Date(resetTimestamp * 1000); // GitHub uses Unix timestamp in seconds
          }
        }

        return {
          isRateLimit: true,
          resetTime,
          message: `GitHub API rate limit exceeded. ${limit ? `Limit: ${limit} requests/hour. ` : ""}${resetTime ? `Resets at ${resetTime.toLocaleTimeString()}.` : ""}`,
        };
      }
    }
  }

  // Check error message for rate limit indicators
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("rate limit") ||
      message.includes("403") ||
      message.includes("429") ||
      message.includes("api rate limit exceeded")
    ) {
      return {
        isRateLimit: true,
        message: "GitHub API rate limit exceeded. Please try again later.",
      };
    }
  }

  return null;
}

// Track last rate limit error notification time to debounce
let lastRateLimitErrorTime = 0;
const RATE_LIMIT_ERROR_DEBOUNCE_MS = 20000; // 20 seconds - only show error once per 20 seconds

/**
 * Show a rate limit error notification to the user
 * Debounced to prevent spam - only shows once per 20 seconds
 * @param resetTime Optional time when the rate limit resets
 * @param customMessage Optional custom message
 */
export function showRateLimitError(
  resetTime?: Date,
  customMessage?: string,
): void {
  const now = Date.now();

  // Debounce: only show error if enough time has passed since last notification
  if (now - lastRateLimitErrorTime < RATE_LIMIT_ERROR_DEBOUNCE_MS) {
    // Silently skip - error was shown recently
    return;
  }

  // Update last notification time
  lastRateLimitErrorTime = now;

  let message = customMessage || "GitHub API rate limit exceeded.";

  if (resetTime) {
    const minutesUntilReset = Math.ceil(
      (resetTime.getTime() - now) / (1000 * 60),
    );
    if (minutesUntilReset > 0) {
      message += ` Rate limit resets in approximately ${minutesUntilReset} minute${minutesUntilReset > 1 ? "s" : ""}.`;
    } else {
      message += " Rate limit should reset soon.";
    }
  } else {
    message += " Please try again later.";
  }

  message += " Using cached data where available.";

  showError(message);
}

/**
 * Debounce a function call
 * @param func The function to debounce
 * @param wait The number of milliseconds to wait before calling the function
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout !== null) window.clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
  };
}

/**
 * Escape HTML to prevent XSS
 * @param text The text to escape
 * @returns The escaped HTML string
 */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Parse GitHub repository string (username/repo-name) into components
 * @param repo Repository string in format "owner/name"
 * @returns Object with owner and name properties
 * @throws Error if repo format is invalid
 */
export function parseRepo(repo: string): { owner: string; name: string } {
  if (!repo || typeof repo !== "string") {
    throw new Error("Repository string is required");
  }

  const parts = repo.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid repository format: "${repo}". Expected format: "owner/name"`,
    );
  }

  return {
    owner: parts[0].trim(),
    name: parts[1].trim(),
  };
}

/**
 * Get GitHub raw file URL
 * @param repo Repository string in format "owner/name"
 * @param branch The branch name (e.g., "master" or "main")
 * @param path The file path relative to the repository root
 * @returns The GitHub raw file URL
 */
export function getGitHubRawUrl(
  repo: string,
  branch: string,
  path: string,
): string {
  const { owner, name } = parseRepo(repo);
  // Validate path to prevent directory traversal
  const safePath = path.replace(/\.\./g, "").replace(/^\//, "");
  return `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${safePath}`;
}

/**
 * Get GitHub release download URL
 * @param repo Repository string in format "owner/name"
 * @param version Version tag (e.g., "1.0.0")
 * @param filename Filename to download (e.g., "main.js")
 * @returns GitHub release download URL
 */
export function getGitHubReleaseUrl(
  repo: string,
  version: string,
  filename: string,
): string {
  const { owner, name } = parseRepo(repo);
  // Validate filename to prevent directory traversal
  const safeFilename = filename.replace(/\.\./g, "").replace(/\//g, "");
  return `https://github.com/${owner}/${name}/releases/download/${version}/${safeFilename}`;
}

/**
 * Check if a plugin is compatible with the current Obsidian version
 * @param minAppVersion Minimum required Obsidian version
 * @param currentVersion Current Obsidian version
 * @returns True if current version meets minimum requirement
 */
export function isCompatible(
  minAppVersion: string,
  currentVersion: string,
): boolean {
  const minParts = minAppVersion.split(".").map(Number);
  const currentParts = currentVersion.split(".").map(Number);

  for (let i = 0; i < Math.max(minParts.length, currentParts.length); i++) {
    const min = minParts[i] || 0;
    const current = currentParts[i] || 0;
    if (current > min) return true;
    if (current < min) return false;
  }
  return true; // Equal versions are compatible
}

/**
 * Type guard to check if plugin has full PluginInfo structure
 * @param plugin Plugin to check
 * @returns True if plugin is PluginInfo (has the extended properties, even if undefined)
 */
export function isPluginInfo(
  plugin: CommunityPlugin | PluginInfo,
): plugin is PluginInfo {
  // Check for presence of PluginInfo-specific properties
  // These properties exist on PluginInfo even if they're undefined
  return "manifest" in plugin && "readme" in plugin;
}

/**
 * Type guard to check if an event is a CustomEvent with detail property
 * Used for safely accessing CustomEvent.detail without type assertions
 * @param event The event to check
 * @returns True if event is a CustomEvent
 */
export function isCustomEvent<T>(event: Event): event is CustomEvent<T> {
  return "detail" in event;
}

/**
 * Type guard to check if workspace has openPopoutLeaf method
 * Used for safely accessing Obsidian's internal API without type assertions
 * @param workspace The workspace object to check
 * @returns True if workspace has openPopoutLeaf method
 */
export function hasOpenPopoutLeaf(
  workspace: unknown,
): workspace is { openPopoutLeaf: () => WorkspaceLeaf } {
  return (
    workspace !== null &&
    typeof workspace === "object" &&
    "openPopoutLeaf" in workspace &&
    typeof (workspace as { openPopoutLeaf?: unknown }).openPopoutLeaf ===
      "function"
  );
}

/**
 * Type guard to check if app has version property
 * Used for safely accessing Obsidian's app.version without type assertions
 * @param app The app object to check
 * @returns True if app has version property
 */
export function hasAppVersion(app: unknown): app is { version: string } {
  return (
    app !== null &&
    typeof app === "object" &&
    "version" in app &&
    typeof (app as { version?: unknown }).version === "string"
  );
}

/**
 * Type guard to check if app has plugins.enablePlugin method
 * Used for safely accessing Obsidian's internal plugin management API
 * @param app The app object to check
 * @returns True if app has plugins.enablePlugin method
 */
export function hasEnablePlugin(app: unknown): app is {
  plugins: { enablePlugin: (id: string) => Promise<void> };
} {
  if (app === null || typeof app !== "object") {
    return false;
  }
  const appObj = app as { plugins?: unknown };
  if (!appObj.plugins || typeof appObj.plugins !== "object") {
    return false;
  }
  const plugins = appObj.plugins as { enablePlugin?: unknown };
  return (
    "enablePlugin" in plugins && typeof plugins.enablePlugin === "function"
  );
}

/**
 * Safely get response status from Obsidian's requestUrl response
 * @param response The response object from requestUrl
 * @returns The HTTP status code, or undefined if not available
 */
export function getResponseStatus(response: unknown): number | undefined {
  if (response && typeof response === "object") {
    const extended = response as { status?: number };
    return extended.status;
  }
  return undefined;
}

/**
 * Safely get response headers from Obsidian's requestUrl response
 * @param response The response object from requestUrl
 * @returns The headers object, or undefined if not available
 */
export function getResponseHeaders(
  response: unknown,
): Record<string, string> | undefined {
  if (response && typeof response === "object") {
    const extended = response as { headers?: Record<string, string> };
    return extended.headers;
  }
  return undefined;
}

/**
 * Get header value case-insensitively
 * @param headers Headers object
 * @param headerName Header name to look for (case-insensitive)
 * @returns Header value or undefined if not found
 */
export function getHeaderCaseInsensitive(
  headers: Record<string, string> | undefined,
  headerName: string,
): string | undefined {
  if (!headers) return undefined;

  const lowerName = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  return undefined;
}

/**
 * Sanitize search query input
 * Removes potentially dangerous characters and trims whitespace
 * @param query The search query to sanitize
 * @returns Sanitized query string
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== "string") {
    return "";
  }
  // Remove control characters and excessive whitespace
  // Filter out control characters manually to avoid linter issues
  let cleaned = "";
  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    const code = char.charCodeAt(0);
    // Keep printable characters (32-126) and extended ASCII (128+), exclude DEL (127)
    if ((code >= 32 && code < 127) || code >= 128) {
      cleaned += char;
    }
  }
  return cleaned
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .slice(0, 500); // Limit length
}

/**
 * Validate repository string format
 * @param repo Repository string to validate
 * @returns True if valid format
 */
export function isValidRepoFormat(repo: string): boolean {
  if (!repo || typeof repo !== "string") {
    return false;
  }
  const parts = repo.split("/");
  return (
    parts.length === 2 &&
    parts[0].trim().length > 0 &&
    parts[1].trim().length > 0
  );
}

/**
 * Compare semantic versions
 * Handles pre-release versions and build metadata
 * @param version1 First version to compare
 * @param version2 Second version to compare
 * @returns Negative if version1 < version2, positive if version1 > version2, 0 if equal
 */
export function compareVersions(version1: string, version2: string): number {
  // Remove build metadata (everything after +)
  const v1 = version1.split("+")[0];
  const v2 = version2.split("+")[0];

  // Split into parts (handle pre-release versions)
  const parts1 = v1.split(/[.-]/);
  const parts2 = v2.split(/[.-]/);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i];
    const part2 = parts2[i];

    // If one version has fewer parts, it's considered smaller
    if (part1 === undefined) return -1;
    if (part2 === undefined) return 1;

    // Try to parse as numbers
    const num1 = parseInt(part1, 10);
    const num2 = parseInt(part2, 10);

    // If both are numbers, compare numerically
    if (!isNaN(num1) && !isNaN(num2)) {
      if (num1 !== num2) {
        return num1 - num2;
      }
    } else {
      // If not numbers, compare as strings (for pre-release versions)
      // Pre-release versions are considered smaller
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
  }

  return 0;
}

/**
 * Options for retry logic
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Function to determine if an error should be retried (default: retries all errors) */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Retry a network request with exponential backoff
 * Implements retry logic for unreliable network operations as documented in DEVELOPMENT.md
 * @param requestFn Function that performs the network request
 * @param options Retry configuration options
 * @returns Promise resolving to the request result
 * @throws Error if all retry attempts fail
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error, attempt)) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay,
      );

      // Wait before retrying
      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), delay);
      });
    }
  }

  // All retries failed, throw the last error
  throw lastError;
}

/**
 * Determine if an HTTP error should be retried
 * Retries on network errors and 5xx server errors, but not on 4xx client errors
 * Note: The attempt limit is handled by retryRequest, so this function only checks error types
 * @param error The error to check
 * @param _attempt The current attempt number (unused, kept for compatibility with RetryOptions.shouldRetry signature)
 * @returns True if the error should be retried based on error type
 */
export function shouldRetryHttpError(
  error: unknown,
  _attempt: number,
): boolean {
  // If it's an Error object, check the message
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Don't retry on 4xx client errors (except 408 Request Timeout and 429 Too Many Requests)
    if (message.includes("400") || message.includes("bad request")) {
      return false;
    }
    if (message.includes("401") || message.includes("unauthorized")) {
      return false;
    }
    if (message.includes("403") || message.includes("forbidden")) {
      return false;
    }
    if (message.includes("404") || message.includes("not found")) {
      return false;
    }

    // Retry on network errors, timeouts, and 5xx errors
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("408") ||
      message.includes("429") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("server error")
    ) {
      return true;
    }
  }

  // Default: retry on unknown errors (could be network issues)
  return true;
}
