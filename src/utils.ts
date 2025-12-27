/**
 * Utility functions for the Community Plugin Browser
 */

import { Notice } from "obsidian";

/**
 * Format a date string to a relative time (e.g., "2 hours ago")
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
	if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
	return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
}

/**
 * Format a number with commas (e.g., 1000000 -> "1,000,000")
 */
export function formatNumber(num: number): string {
	return num.toLocaleString();
}

/**
 * Show a user-friendly error notification
 */
export function showError(message: string): void {
	new Notice(`Error: ${message}`, 5000);
}

/**
 * Show a success notification
 */
export function showSuccess(message: string): void {
	new Notice(message, 3000);
}

/**
 * Debounce a function call
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null;
	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			timeout = null;
			func(...args);
		};
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Parse GitHub repository string (username/repo-name) into components
 */
export function parseRepo(repo: string): { owner: string; name: string } {
	const parts = repo.split("/");
	return {
		owner: parts[0] || "",
		name: parts[1] || "",
	};
}

/**
 * Get GitHub raw file URL
 */
export function getGitHubRawUrl(repo: string, branch: string, path: string): string {
	const { owner, name } = parseRepo(repo);
	return `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${path}`;
}

/**
 * Get GitHub release download URL
 */
export function getGitHubReleaseUrl(repo: string, version: string, filename: string): string {
	const { owner, name } = parseRepo(repo);
	return `https://github.com/${owner}/${name}/releases/download/${version}/${filename}`;
}

/**
 * Check if a plugin is compatible with the current Obsidian version
 */
export function isCompatible(minAppVersion: string, currentVersion: string): boolean {
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

