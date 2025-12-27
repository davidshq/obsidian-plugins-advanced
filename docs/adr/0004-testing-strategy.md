# ADR-004: Testing Strategy

**Status:** Accepted  
**Date:** 2025-01-27  
**Deciders:** Development Team  
**Tags:** testing, vitest, quality-assurance

## Context

The plugin needs a testing strategy to ensure reliability, catch regressions, and enable confident refactoring. Obsidian plugins run in a specific environment with APIs that need to be mocked.

## Decision

We will use **Vitest** as the testing framework with:

1. **Unit Tests**: Test services and utilities independently
2. **Mocking Strategy**: Mock Obsidian APIs using `vi.importActual()` pattern
3. **Test Structure**: Mirror source structure in `tests/` directory
4. **Coverage**: Focus on critical paths (services, utilities)
5. **Configuration**: Use `.mts` extension for Vitest config

## Testing Framework Choice

### Why Vitest?

- **Fast**: Uses Vite for fast test execution
- **Modern**: ES modules support, TypeScript native
- **Compatible**: Works well with Obsidian's TypeScript setup
- **Feature Rich**: Built-in mocking, coverage, watch mode

### Alternatives Considered

- **Jest**: More mature but slower, requires more configuration
- **Mocha**: Requires additional setup for TypeScript and mocking
- **No Testing**: Not acceptable for production code

## Testing Strategy

### Test Structure

```
tests/
├── setup.ts              # Test setup and global mocks
├── mocks/
│   ├── obsidian.ts       # Obsidian API mocks
│   └── obsidian-module.ts # Module-level mocks
└── services/
    └── PluginService.test.ts
```

### Mocking Strategy

**Partial Mocking Pattern:**
```typescript
vi.mock("obsidian", async () => {
  const actual = await vi.importActual("obsidian");
  return {
    ...actual,
    requestUrl: vi.fn(), // Mock only what's needed
  };
});
```

**Benefits:**
- Preserves actual functionality
- Only mocks what's necessary
- Easier to maintain

### Test Coverage Focus

**High Priority:**
- PluginService (data fetching, caching)
- InstallationService (plugin installation)
- Utility functions (error handling, rate limiting)

**Lower Priority:**
- Main plugin class (requires full Obsidian context)
- Views (UI testing is complex, manual testing sufficient)

### Test Configuration

**Vitest Config (.mts extension):**
- Environment: `happy-dom` (faster than jsdom)
- Setup file: `tests/setup.ts`
- Aliases: Mock Obsidian module automatically
- Coverage: Exclude main.ts (hard to test without full context)

## Consequences

### Positive

- **Confidence**: Catch bugs before deployment
- **Refactoring Safety**: Tests enable confident code changes
- **Documentation**: Tests serve as usage examples
- **CI/CD Ready**: Can be integrated into automated pipelines

### Negative

- **Maintenance**: Tests need to be updated with code changes
- **Initial Investment**: Time to write comprehensive tests
- **Mocking Complexity**: Obsidian APIs require careful mocking

### Mitigations

- Focus tests on critical paths
- Use partial mocking to reduce maintenance
- Document testing patterns in DEVELOPMENT.md

## Implementation Notes

### Test Setup

- Mock Obsidian APIs in `tests/setup.ts`
- Use `happy-dom` for DOM testing (faster than jsdom)
- Configure aliases to automatically mock Obsidian module

### Test Patterns

- **Arrange-Act-Assert**: Clear test structure
- **Descriptive Names**: Test names describe what they test
- **Isolation**: Each test is independent
- **Mock Cleanup**: Clear mocks between tests

### Coverage Goals

- Services: >80% coverage
- Utilities: >90% coverage
- Views: Manual testing sufficient

## References

- Commit: 5a8edfe1f6e4f36e49bf563ac4d4b16dae66f1ca (comprehensive test suite)
- DEVELOPMENT.md: Testing Patterns section
- vitest.config.mts: Test configuration
- [E2E Testing for Electron Applications](../e2e-testing-electron-apps.md): Comprehensive guide on E2E testing frameworks and practices for Electron apps

