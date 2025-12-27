# ADR-007: Error Handling and Rate Limiting

**Status:** Accepted  
**Date:** 2025-01-27  
**Deciders:** Development Team  
**Tags:** error-handling, rate-limiting, resilience, network

## Context

The plugin makes network requests to external APIs (GitHub API, obsidian-releases) which can fail due to network issues, rate limits, or API errors. We need a robust error handling strategy that provides good user experience while respecting API rate limits.

## Decision

We will implement a **comprehensive error handling and rate limiting strategy**:

1. **Retry Logic**: Exponential backoff for transient failures
2. **Rate Limit Detection**: Parse GitHub API rate limit headers
3. **Graceful Degradation**: Return cached data on errors
4. **User Feedback**: Clear error messages with actionable information
5. **Error Caching**: Cache error states to avoid repeated failures

## Error Handling Strategy

### Retry Logic

**Exponential Backoff:**
- Max retries: 3 attempts
- Initial delay: 1 second
- Max delay: 10 seconds
- Backoff multiplier: 2

**Retry Conditions:**
- Network errors (timeout, connection refused)
- Transient HTTP errors (500, 502, 503)
- Rate limit errors (429) - with special handling

**No Retry:**
- Client errors (400, 404)
- Authentication errors (401, 403)
- Already retried max times

### Rate Limit Handling

**GitHub API Rate Limits:**
- Unauthenticated: 60 requests/hour
- Authenticated: 5000 requests/hour

**Detection:**
- Parse `X-RateLimit-Remaining` header
- Parse `X-RateLimit-Reset` header
- Detect 403/429 status codes

**Response:**
- Show user-friendly error message with reset time
- Return cached data if available
- Debounce error notifications (20 seconds) to prevent spam
- Use stats file to minimize API calls

### Graceful Degradation

**Fallback Strategy:**
1. Return cached data if available (even if stale)
2. Show warning message about using cached data
3. Continue operation with degraded functionality
4. Only fail if no cache available and operation is critical

**Example:**
```typescript
try {
  return await this.fetchPlugins();
} catch (error) {
  if (this.cachedPlugins) {
    console.warn("Using cached data due to error:", error);
    return this.cachedPlugins;
  }
  throw error; // Only throw if no fallback available
}
```

### Error Caching

**Error Cache Duration:**
- 5 minutes for failed requests
- Prevents repeated failures for same resource
- Allows retry after cache expires

**Use Cases:**
- GitHub API 404 (no releases)
- Network timeouts
- Invalid repository formats

## Consequences

### Positive

- **Resilience**: Plugin continues working despite network issues
- **User Experience**: Clear error messages, not cryptic failures
- **Rate Limit Compliance**: Respects API limits, avoids blocking
- **Performance**: Cached data provides fast fallback

### Negative

- **Complexity**: Multiple error handling paths
- **Stale Data Risk**: May serve outdated data during outages
- **Code Size**: Additional error handling code

### Mitigations

- Clear error messages guide users
- Cache duration is reasonable (not too long)
- Background refresh keeps cache fresh
- Manual refresh option available

## Implementation Notes

### Error Types

**Network Errors:**
- Connection refused
- Timeout
- DNS failure

**HTTP Errors:**
- 400: Bad request (no retry)
- 401/403: Authentication (no retry)
- 404: Not found (cache as null)
- 429: Rate limit (special handling)
- 500-503: Server error (retry)

**Rate Limit Errors:**
- Parse reset time from headers
- Show user-friendly message
- Debounce notifications
- Return cached data

### Error Utilities

**Functions:**
- `checkRateLimit()`: Detect rate limit errors
- `showRateLimitError()`: Display rate limit message
- `retryRequest()`: Retry with exponential backoff
- `shouldRetryHttpError()`: Determine if error is retryable

### User Feedback

**Error Messages:**
- Clear, actionable messages
- Include reset times for rate limits
- Suggest manual refresh option
- Don't expose technical details unnecessarily

**Notifications:**
- Use Obsidian's `Notice` API
- Debounce to prevent spam
- Show only relevant errors

## References

- Git changes: Error handling improvements throughout
- DEVELOPMENT.md: Error Handling section
- DEVELOPMENT.md: Retry Logic for Network Requests section
- src/utils.ts: Error handling utilities

