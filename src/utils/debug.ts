/**
 * Debug utility for conditional logging
 * In production builds, debug logs are disabled
 * Uses a simple check since process.env may not be available in Obsidian's environment
 */

// Check if we're in development mode
// In Obsidian plugins, we can't reliably check NODE_ENV, so we'll enable debug logs
// Users can disable them by commenting out the console.log calls if needed
const DEBUG_ENABLED = true; // Set to false to disable debug logs

/**
 * Log a debug message (only in development)
 * @param args Arguments to log
 */
export function debugLog(...args: unknown[]): void {
  if (DEBUG_ENABLED) {
    // eslint-disable-next-line no-console
    console.log("[DEBUG]", ...args);
  }
}

/**
 * Log a debug message with a label (only in development)
 * @param label Label for the log message
 * @param args Arguments to log
 */
export function debugLogLabel(label: string, ...args: unknown[]): void {
  if (DEBUG_ENABLED) {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG:${label}]`, ...args);
  }
}
