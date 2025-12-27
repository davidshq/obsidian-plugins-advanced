# Testing Setup

This project uses **Vitest** for testing, which is a fast, Vite-native testing framework that's compatible with Jest APIs.

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `tests/setup.ts` - Global test setup and Obsidian API mocks
- `tests/mocks/` - Mock implementations for Obsidian APIs
- `tests/views/` - Tests for view components
- `tests/services/` - Tests for service classes

## Writing Tests

Tests follow the standard Vitest/Jest pattern:

```typescript
import { describe, it, expect, vi } from "vitest";

describe("MyComponent", () => {
  it("should do something", () => {
    expect(true).toBe(true);
  });
});
```

## Mocking Obsidian APIs

The Obsidian API is automatically mocked in `tests/setup.ts`. For custom mocks, use the helpers in `tests/mocks/obsidian.ts`.

## Current Test Coverage

### Test Files

1. **tests/utils/utils.test.ts** - Comprehensive tests for utility functions:
   - `formatRelativeTime` - Date formatting (7 tests)
   - `formatNumber` - Number formatting (2 tests)
   - `parseRepo` - Repository parsing (6 tests)
   - `getGitHubRawUrl` - GitHub URL construction (4 tests)
   - `getGitHubReleaseUrl` - Release URL construction (3 tests)
   - `isCompatible` - Version compatibility checking (5 tests)
   - `compareVersions` - Semantic version comparison (7 tests)
   - `isValidRepoFormat` - Repository format validation (4 tests)
   - `escapeHtml` - HTML escaping (3 tests)
   - `sanitizeSearchQuery` - Search query sanitization (5 tests)
   - `getHeaderCaseInsensitive` - Header lookup (3 tests)
   - `showError` - Error notification (2 tests)
   - `showSuccess` - Success notification (2 tests)
   - `debounce` - Function debouncing (3 tests)
   - `isPluginInfo` - Type guard (3 tests)
   - `isCustomEvent` - Type guard (3 tests)
   - `hasOpenPopoutLeaf` - Type guard (5 tests)
   - `hasAppVersion` - Type guard (4 tests)
   - `hasEnablePlugin` - Type guard (5 tests)
   - `getResponseStatus` - Response status extraction (4 tests)
   - `getResponseHeaders` - Response headers extraction (4 tests)
   - **Total: 86 tests**

2. **tests/services/PluginService.test.ts** - Tests for PluginService:
   - `fetchCommunityPlugins` - Plugin fetching with caching and ETags (6 tests)
   - `searchPlugins` - Plugin search functionality (6 tests)
   - `fetchPluginManifest` - Manifest fetching (4 tests)
   - `fetchPluginReadme` - README fetching (2 tests)
   - `getPluginInfo` - Combined info fetching (1 test)
   - `getLatestReleaseDate` - Release date fetching with caching (5 tests)
   - `clearCache` - Cache clearing (1 test)
   - `refreshPluginsIfChanged` - Change detection (3 tests including error handling)
   - **Total: 29 tests**

3. **tests/services/InstallationService.test.ts** - Tests for InstallationService:
   - `isPluginInstalled` - Installation checking (3 tests)
   - `getInstalledVersion` - Version retrieval (3 tests)
   - `hasUpdateAvailable` - Update detection (3 tests)
   - `installPlugin` - Plugin installation (6 tests)
   - `uninstallPlugin` - Plugin uninstallation (2 tests)
   - `enablePlugin` - Plugin enabling (2 tests)
   - **Total: 19 tests**

4. **tests/views/PluginListView.date-filter.test.ts** - Date filter tests:
   - Date filter logic (2 tests)
   - **Total: 2 tests**

5. **tests/utils/debug.test.ts** - Tests for debug utility functions:
   - `debugLog` - Debug logging (3 tests)
   - `debugLogLabel` - Labeled debug logging (3 tests)
   - **Total: 6 tests**

### Test Statistics

- **Total Test Files**: 5
- **Total Tests**: 144 tests
- **Coverage**:
  - Overall: ~74% statements, ~83% branches, ~92% functions
  - `src/utils.ts`: 100% coverage
  - `src/utils/debug.ts`: 100% coverage
  - `src/services/InstallationService.ts`: ~94% coverage
  - `src/services/PluginService.ts`: ~79% coverage

### Areas Needing More Tests

1. **View Components** - PluginListView and PluginDetailView need more integration tests (currently have basic date filter tests)
2. **Settings** - PluginSettingTab needs tests (currently 100% coverage but may need more comprehensive tests)
3. **Main Plugin Class** - `main.ts` has 0% coverage (hard to test without full Obsidian context, but basic methods could be tested)
4. **Error Handling** - More edge case testing for network errors, invalid data, etc.

### Running Tests

```bash
# Run all tests
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```
