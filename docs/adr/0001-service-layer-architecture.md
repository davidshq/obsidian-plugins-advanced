# ADR-001: Service Layer Architecture

**Status:** Accepted  
**Date:** 2025-01-27  
**Deciders:** Development Team  
**Tags:** architecture, separation-of-concerns, services

## Context

The plugin needs to fetch data from multiple sources (GitHub API, obsidian-releases repository), manage caching, handle installations, and provide views for browsing plugins. The initial implementation could have mixed business logic directly into views or the main plugin class, leading to tight coupling and difficult testing.

## Decision

We will implement a **Service Layer Architecture** that separates business logic from presentation:

- **PluginService**: Handles all data fetching, caching, and plugin data management
- **InstallationService**: Handles plugin installation/uninstallation logic
- **Views**: Focus solely on presentation and user interaction
- **Main Plugin Class**: Orchestrates services and manages plugin lifecycle

## Architecture

```
Main Plugin Class
├── PluginService (data fetching, caching)
├── InstallationService (plugin installation)
└── Views (presentation only)
    ├── PluginListView
    └── PluginDetailView
```

### Service Responsibilities

**PluginService:**
- Fetch community plugins list
- Fetch plugin manifests and READMEs
- Manage caching with ETags
- Handle rate limiting
- Provide search and filtering utilities

**InstallationService:**
- Download plugin files from GitHub releases
- Install plugins to `.obsidian/plugins/`
- Check installation status
- Handle uninstallation

**Views:**
- Render UI components
- Handle user interactions
- Delegate business logic to services

## Consequences

### Positive

- **Testability**: Services can be tested independently without Obsidian UI
- **Reusability**: Services can be used by multiple views
- **Maintainability**: Clear separation of concerns makes code easier to understand
- **Flexibility**: Easy to swap implementations or add new features

### Negative

- **Initial Complexity**: More files and classes to manage
- **Overhead**: Additional abstraction layer

### Mitigations

- Comprehensive documentation in DEVELOPMENT.md
- Clear naming conventions
- TypeScript interfaces for type safety

## Implementation Notes

- Services are instantiated in `main.ts` during `onload()`
- Services are made available to views via constructor injection
- Services use Obsidian's `requestUrl` API for network requests
- Services handle their own error states and caching

## References

- Initial commit: 097957a6fb7260c729b63276c0627843668b82b7
- Refactoring commit: 5a8edfe1f6e4f36e49bf563ac4d4b16dae66f1ca
- DEVELOPMENT.md: Service Layer Pattern section

