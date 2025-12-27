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

### Changed
- **Major refactoring and enhancement of core services:**
  - `InstallationService.ts`: Significant improvements to plugin installation/uninstallation logic
  - `PluginService.ts`: Enhanced plugin fetching, caching, and management capabilities
  - `PluginListView.ts`: Major UI improvements and filtering enhancements
  - `PluginDetailView.ts`: Enhanced plugin detail display and interaction
- **Configuration and build improvements:**
  - Updated `esbuild.config.mjs` with improved build configuration
  - Enhanced `tsconfig.json` with better TypeScript compiler options
  - Updated `manifest.json` to version 0.2.0
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

### Dependencies
- Updated `package.json` with new development dependencies:
  - `vitest` and related testing tools (`@vitest/ui`, `@vitest/coverage-v8`)
  - `happy-dom` for DOM testing environment
  - Updated ESLint packages to version 9.x
  - Updated TypeScript and other build tools
- Updated `package-lock.json` with all dependency changes

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

