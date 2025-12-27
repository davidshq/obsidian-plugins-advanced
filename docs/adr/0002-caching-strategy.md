# ADR-002: Caching Strategy

**Status:** Accepted  
**Date:** 2025-01-27  
**Deciders:** Development Team  
**Tags:** performance, caching, network, etag

## Context

The plugin fetches data from external sources (GitHub API, obsidian-releases repository) which can be slow and subject to rate limits. Users may browse plugins frequently, and we want to minimize network requests while ensuring data freshness.

## Decision

We will implement a **multi-layered caching strategy** with:

1. **In-Memory Cache**: Store fetched data in memory with timestamps
2. **ETag Support**: Use HTTP conditional requests (If-None-Match) to avoid downloading unchanged data
3. **Configurable Cache Duration**: Cache duration dynamically calculated from refresh interval setting
4. **Background Refresh**: Proactively refresh cache at configured intervals
5. **Graceful Degradation**: Return stale cache on network errors

## Cache Strategy Details

### Cache Duration Calculation

- **Default Refresh Interval**: 30 minutes (2x/hour)
- **Cache Duration**: Refresh interval + 5 minute buffer
- **Rationale**: Ensures data is never outdated by more than the refresh interval

Example:
- Refresh interval: 30 minutes
- Cache duration: 35 minutes
- Background refresh runs every 30 minutes
- Cache expires after 35 minutes (ensures fresh data even if refresh is delayed)

### ETag Implementation

- Store ETags for each resource (plugins list, stats, release dates)
- Send `If-None-Match` header on subsequent requests
- Handle 304 Not Modified responses by updating cache timestamp
- Reduces bandwidth and improves performance

### Cache Layers

1. **Plugin List Cache**: Caches `community-plugins.json`
   - Duration: Configurable (default: refresh interval + 5 min)
   - ETag: Stored and reused

2. **Stats Cache**: Caches `community-plugin-stats.json`
   - Duration: Same as plugin list cache
   - ETag: Stored and reused

3. **Release Date Cache**: Caches GitHub API release dates
   - Duration: Same as main cache (refresh interval + 5 min)
   - ETag: Per-plugin ETags stored
   - Error cache: 5 minutes for failed requests

### Background Refresh

- Runs at configured interval (default: 30 minutes)
- Uses conditional requests (ETags) to minimize bandwidth
- Updates cache proactively before expiration
- Non-blocking: Doesn't affect UI responsiveness

## Consequences

### Positive

- **Performance**: Faster UI response times
- **Bandwidth**: Reduced network usage via ETags
- **User Experience**: Data available immediately from cache
- **Rate Limit Compliance**: Fewer API calls reduce rate limit issues
- **Resilience**: Graceful degradation on network errors

### Negative

- **Memory Usage**: Cached data stored in memory
- **Staleness Risk**: Data may be slightly outdated (within refresh interval)
- **Complexity**: Multiple cache layers to manage

### Mitigations

- Cache duration is configurable via settings
- Background refresh ensures data stays fresh
- Clear cache option in settings for manual refresh
- Error handling falls back to stale cache when appropriate

## Implementation Notes

- Cache duration updated when settings change (`updateCacheDuration()`)
- Background refresh restarts when refresh interval changes
- ETags stored per resource type
- Cache timestamps checked before returning cached data
- Empty arrays not cached (may indicate temporary API issues)

## References

- Git changes: Cache duration made configurable based on refresh interval
- DEVELOPMENT.md: Caching Patterns section
- docs/data-structure.md: Cache invalidation strategy

