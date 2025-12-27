# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive test suite with Vitest
  - Unit tests for `InstallationService`
  - Unit tests for `PluginService`
  - Unit tests for utility functions (`debug.ts`, `utils.ts`)
  - View tests for `PluginListView` date filtering
  - Test mocks for Obsidian API (`obsidian.ts`, `obsidian-module.ts`)
  - Test setup and configuration (`tests/setup.ts`, `vitest.config.mts`)
  - Test documentation (`tests/README.md`)
- Debug utility module (`src/utils/debug.ts`) for enhanced debugging capabilities
- Configuration module (`src/config.ts`) for centralized plugin configuration
- ESLint flat config (`eslint.config.mjs`) with modern ESLint 9.x configuration
- Cursor IDE configuration files
  - `.cursorrules` for AI assistant rules
  - `.cursor/commands/review-code.md` for code review commands
- `FUTURE.md` for tracking future development plans
- **Architecture Decision Records (ADRs):**
  - ADR-0001: Service layer architecture pattern
  - ADR-0002: Caching strategy with ETags and conditional requests
  - ADR-0003: View management pattern for Obsidian plugins
  - ADR-0004: Testing strategy (unit tests with Vitest)
  - ADR-0005: Accessibility implementation (ARIA, keyboard navigation)
  - ADR-0006: Configuration management (centralized config)
  - ADR-0007: Error handling and rate limiting strategies
- **Documentation:**
  - E2E testing guide for Electron apps (`docs/e2e-testing-electron-apps.md`)
  - ADR documentation index (`docs/adr/README.md`)
- **Accessibility improvements:**
  - ARIA labels and roles throughout `PluginListView`
  - Keyboard navigation support (Enter/Space keys for plugin cards)
  - Semantic HTML improvements with proper label associations
  - Screen reader announcements for loading states and status updates
- **Configuration enhancements:**
  - Configurable data refresh interval setting (default: 30 minutes)
  - Dynamic cache duration based on refresh interval
  - Improved rate limiting configuration constants
  - Batch processing configuration for release info fetching

### Changed
- **Major refactoring and enhancement of core services:**
  - `InstallationService.ts`: Significant improvements to plugin installation/uninstallation logic
  - `PluginService.ts`: 
    - Refactored with extracted helper methods for better maintainability
    - Improved error handling with dedicated methods for rate limits, 304 responses, and fetch errors
    - Enhanced cache validation and request header preparation logic
    - Added `setCacheDuration()` method for dynamic cache duration management
    - Optimized release date fetching: cache check now prioritized over stats file (synchronous cache check before async stats fetch)
    - Added `getCachedReleaseDate()` method for synchronous cache lookups
    - Added `getReleaseDateFromStats()` helper method for optimized stats-based date retrieval
    - Better separation of concerns with private helper methods
  - `PluginListView.ts`: 
    - Major refactoring with extracted methods for better code organization
    - Split large methods into focused helper methods (`createHeader`, `createSearchBar`, `createFilters`, `createDisplayModeToggle`, `createSortControls`)
    - Extracted date filter batch processing into dedicated method
    - Improved filter cancellation and state management
    - Better handling of concurrent status checks to prevent race conditions
  - `PluginDetailView.ts`: Enhanced plugin detail display and interaction
- **Configuration and build improvements:**
  - Updated `esbuild.config.mjs` with improved build configuration
  - Enhanced `tsconfig.json` with better TypeScript compiler options
  - Updated `manifest.json` to version 0.2.0
  - Added author information to `manifest.json` and `package.json`
- **Main plugin improvements:**
  - Background refresh interval is now configurable via settings
  - Cache duration automatically adjusts based on refresh interval setting
  - Improved refresh interval management with proper cleanup and restart on settings change
- **Development workflow enhancements:**
  - Improved `scripts/install-dev.js` with better error handling and features
  - Enhanced `scripts/setup-dev.js` with additional setup options
- **Documentation updates:**
  - Significantly expanded `DEVELOPMENT.md` (from 123 to 1855+ lines) with comprehensive development guidelines
  - Updated `README.md` with improved installation and usage instructions
  - Enhanced `docs/data-structure.md` with detailed data structure documentation
  - Updated `docs/plugin-development.md` with additional development notes
- **Code quality improvements:**
  - Migrated from `.eslintrc.json` to ESLint flat config format (`eslint.config.mjs`)
  - Updated `.gitignore` with additional ignore patterns
  - Enhanced code formatting and linting rules
  - Improved code documentation with JSDoc comments
  - Better method organization and separation of concerns

### Dependencies
- Updated `package.json` with new development dependencies:
  - `vitest` and related testing tools (`@vitest/ui`, `@vitest/coverage-v8`)
  - `happy-dom` for DOM testing environment
  - Updated ESLint packages to version 9.x
  - Updated TypeScript and other build tools
- Updated `package-lock.json` with all dependency changes

### Fixed
- Race condition in installed status checking when filter is applied with empty cache
- Improved handling of 304 responses when no cache exists
- Better error handling for rate limit scenarios with fallback to cached data

### Statistics
- 38 files changed
- 16,355 insertions(+)
- 3,798 deletions(-)


## [0.1.0] - 2025-12-27

### Added
- Initial project setup and core functionality
- **Core Services:**
  - `InstallationService`: Plugin installation and uninstallation functionality
  - `PluginService`: Plugin fetching and management from Obsidian community API
- **Views:**
  - `PluginListView`: Main plugin browsing interface with grid/list layouts
  - `PluginDetailView`: Detailed plugin information display
- **Settings:**
  - `PluginSettingTab`: Plugin settings interface
- **Utilities:**
  - Core utility functions (`src/utils.ts`)
  - Type definitions (`src/types.ts`)
- **Build System:**
  - ESBuild configuration for TypeScript compilation
  - TypeScript configuration
  - ESLint configuration
- **Development Scripts:**
  - `scripts/install-dev.js`: Development installation script
  - `scripts/setup-dev.js`: Development setup script
- **Documentation:**
  - `README.md`: Project overview and installation instructions
  - `DEVELOPMENT.md`: Development guidelines
  - `PLAN.md`: Project planning document
  - `docs/data-structure.md`: Data structure documentation
  - `docs/plugin-development.md`: Plugin development notes
- **Configuration:**
  - `manifest.json`: Obsidian plugin manifest
  - `package.json`: Node.js project configuration
  - `.gitignore`: Git ignore rules
  - `versions.json`: Version tracking

### Statistics
- 23 files created
- 4,915 insertions(+)

---

[Unreleased]: https://github.com/yourusername/obsidian-community-plugin-browser/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/yourusername/obsidian-community-plugin-browser/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yourusername/obsidian-community-plugin-browser/releases/tag/v0.1.0

