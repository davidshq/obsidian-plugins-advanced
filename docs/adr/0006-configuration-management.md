# ADR-006: Configuration Management

**Status:** Accepted  
**Date:** 2025-01-27  
**Deciders:** Development Team  
**Tags:** configuration, constants, maintainability

## Context

The plugin uses many configuration values (URLs, timeouts, batch sizes, cache durations) throughout the codebase. These values were initially scattered as magic numbers, making them hard to maintain and tune.

## Decision

We will centralize all configuration in a **single configuration module** (`src/config.ts`):

1. **Centralized Constants**: All configuration values in one place
2. **Type Safety**: TypeScript interface for configuration structure
3. **Documentation**: JSDoc comments explain each constant
4. **Easy Tuning**: Performance parameters can be adjusted without code changes

## Configuration Structure

### Configuration Categories

**URLs:**
- Community plugins JSON
- Plugin statistics JSON
- GitHub API endpoints
- GitHub raw content URLs

**Constants:**
- Cache durations
- Batch sizes and delays
- Debounce delays
- Retry configuration
- Pagination settings

### Configuration Interface

```typescript
export interface PluginConfig {
  urls: {
    communityPlugins: string;
    communityPluginStats: string;
    githubApi: string;
    githubRaw: string;
    githubReleases: string;
  };
  constants: {
    cacheDuration: number;
    batchSize: number;
    batchDelay: number;
    // ... more constants
  };
}
```

## Consequences

### Positive

- **Maintainability**: Single source of truth for configuration
- **Discoverability**: Easy to find all configuration values
- **Documentation**: JSDoc comments explain purpose
- **Performance Tuning**: Easy to adjust without code changes
- **Type Safety**: TypeScript ensures correct usage

### Negative

- **Initial Setup**: Requires creating configuration structure
- **Import Overhead**: Need to import config in multiple files

### Mitigations

- Clear documentation in config file
- Group related constants together
- Use descriptive names

## Implementation Notes

### Configuration Values

**Performance Tuning:**
- `batchSize`: 10 plugins per batch (balance performance vs rate limits)
- `batchDelay`: 100ms between batches
- `releaseInfoBatchSize`: 5 plugins (smaller for GitHub API)
- `releaseInfoBatchDelay`: 2000ms (longer for GitHub API rate limits)

**User Experience:**
- `debounceDelay`: 300ms for search input
- `viewInitializationDelay`: 100ms for DOM readiness
- `paginationThreshold`: 200px from bottom

**Error Handling:**
- `errorCacheDuration`: 5 minutes for failed requests
- `rateLimitErrorDebounceMs`: 20 seconds to prevent spam

**Retry Logic:**
- `maxRetries`: 3 attempts
- `initialDelay`: 1000ms
- `maxDelay`: 10000ms
- `backoffMultiplier`: 2 (exponential backoff)

### Dynamic Configuration

Some values are dynamically calculated:
- Cache duration: Based on refresh interval setting
- Background refresh interval: Based on user setting

## References

- Git changes: Configuration centralized in config.ts
- DEVELOPMENT.md: Configuration Constants section
- src/config.ts: Implementation

