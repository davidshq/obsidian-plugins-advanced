# E2E Testing for Electron Applications

This document provides an overview of end-to-end (E2E) and integration testing practices for Electron applications, including frameworks, patterns, and real-world examples.

## Overview

Electron applications present unique challenges for E2E testing because they combine:
- **Node.js backend** (main process)
- **Chromium frontend** (renderer process)
- **Native OS integration** (file system, notifications, etc.)

Unlike web applications, Electron apps require testing frameworks that can interact with both the browser context and the Node.js environment.

## E2E Testing Frameworks

### 1. Playwright ⭐ (Recommended for Modern Apps)

**Status:** Actively maintained, experimental Electron support  
**Official Support:** Via Chrome DevTools Protocol (CDP)

#### Features
- Modern, fast, and actively developed by Microsoft
- Cross-browser support (Chromium, Firefox, WebKit)
- Excellent debugging tools and test runner
- Can connect to Electron via CDP
- Strong TypeScript support

#### Setup
```typescript
import { _electron } from '@playwright/test';

test('launch app', async () => {
  const electronApp = await _electron.launch({
    args: ['path/to/electron/app']
  });
  
  const window = await electronApp.firstWindow();
  await window.click('button');
  await electronApp.close();
});
```

#### Pros
- ✅ Modern API and excellent developer experience
- ✅ Fast test execution
- ✅ Great debugging capabilities
- ✅ Strong community and documentation
- ✅ Works well in CI/CD pipelines

#### Cons
- ⚠️ Electron support is experimental (but stable)
- ⚠️ Requires CDP configuration
- ⚠️ Less Electron-specific tooling than WebdriverIO

#### Use Cases
- Modern Electron apps
- Apps requiring cross-browser testing
- Teams already using Playwright for web apps
- **Examples:** VS Code uses Playwright for E2E testing

---

### 2. WebdriverIO

**Status:** Actively maintained, mature Electron support  
**Official Support:** Full support via WebDriver protocol

#### Features
- Mature and battle-tested
- Excellent Electron support
- Cross-platform testing (Windows, macOS, Linux, Android)
- Flexible configuration
- Large ecosystem of plugins

#### Setup
```javascript
// wdio.conf.js
exports.config = {
  services: ['electron'],
  capabilities: [{
    browserName: 'electron',
    'goog:chromeOptions': {
      binary: '/path/to/electron'
    }
  }]
};
```

#### Pros
- ✅ Mature and stable Electron support
- ✅ Extensive documentation
- ✅ Large community
- ✅ Flexible configuration options
- ✅ Good for complex Electron apps

#### Cons
- ⚠️ More configuration required than Playwright
- ⚠️ Can be slower than Playwright
- ⚠️ Steeper learning curve

#### Use Cases
- Complex Electron applications
- Apps requiring extensive Electron API testing
- Teams needing mature, stable tooling
- **Examples:** Slack, Discord use WebdriverIO

---

### 3. Spectron ⚠️ (Deprecated)

**Status:** Deprecated (no longer maintained)  
**Last Updated:** 2021

#### Why Deprecated?
- Built on ChromeDriver which became incompatible with newer Electron versions
- Maintenance burden became too high
- Community moved to Playwright and WebdriverIO

#### Migration Path
- **To Playwright:** Use CDP-based approach
- **To WebdriverIO:** Use Electron service

**⚠️ Do not use Spectron for new projects.**

---

### 4. TestCafe

**Status:** Actively maintained  
**Official Support:** Electron support available

#### Features
- Simple setup (no WebDriver required)
- Good for quick E2E tests
- Cross-platform support
- Easy to learn

#### Setup
```javascript
// .testcaferc.json
{
  "browsers": ["electron"],
  "src": ["tests/**/*.test.js"]
}
```

#### Pros
- ✅ Simple setup
- ✅ No WebDriver configuration needed
- ✅ Easy to get started
- ✅ Good for smaller projects

#### Cons
- ⚠️ Less Electron-specific tooling
- ⚠️ Smaller community than Playwright/WebdriverIO
- ⚠️ Less flexible than other options

#### Use Cases
- Smaller Electron apps
- Quick E2E test setup
- Teams new to E2E testing
- **Examples:** Electron React Boilerplate uses TestCafe

---

### 5. Cypress

**Status:** Can work with Electron (not officially supported)  
**Official Support:** Web applications only

#### Features
- Excellent developer experience
- Great debugging tools
- Time-travel debugging
- Real-time reloads

#### Setup
```javascript
// Requires custom configuration
// Not officially supported for Electron
```

#### Pros
- ✅ Excellent developer experience
- ✅ Great debugging capabilities
- ✅ Strong community

#### Cons
- ⚠️ Not officially supported for Electron
- ⚠️ Requires custom setup
- ⚠️ Less common for Electron apps
- ⚠️ Primarily designed for web apps

#### Use Cases
- Teams already heavily invested in Cypress
- Web-first Electron apps
- **Note:** Not recommended for new Electron projects

---

## Common Testing Patterns

### 1. Hybrid Testing Approach

Most successful Electron apps use a combination of testing strategies:

```
┌─────────────────────────────────────┐
│         Testing Pyramid             │
├─────────────────────────────────────┤
│  E2E Tests (Few, Critical Paths)   │  ← Playwright/WebdriverIO
├─────────────────────────────────────┤
│  Integration Tests (Some)          │  ← Vitest/Jest with mocks
├─────────────────────────────────────┤
│  Unit Tests (Many)                  │  ← Vitest/Jest
└─────────────────────────────────────┘
```

**Strategy:**
- **Unit Tests:** Fast, isolated tests with mocked Electron APIs
- **Integration Tests:** Test components together with mocked Electron APIs
- **E2E Tests:** Full app testing for critical user workflows only

### 2. Isolate Business Logic

**Best Practice:** Keep business logic separate from Electron APIs

```typescript
// ❌ Bad: Business logic mixed with Electron APIs
class MyService {
  async saveData() {
    const { ipcRenderer } = require('electron');
    const data = await ipcRenderer.invoke('get-data');
    // Business logic here
    await ipcRenderer.invoke('save-data', processed);
  }
}

// ✅ Good: Separated concerns
class MyService {
  async processData(data: Data): Promise<ProcessedData> {
    // Pure business logic - easy to unit test
    return this.transform(data);
  }
}

// In Electron main process
ipcMain.handle('save-data', async () => {
  const service = new MyService();
  const data = await getData();
  const processed = await service.processData(data);
  await saveData(processed);
});
```

### 3. Mock Electron APIs

Mock Electron APIs in unit/integration tests:

```typescript
// tests/mocks/electron.ts
import { vi } from 'vitest';

export const mockIpcRenderer = {
  invoke: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

export const mockElectron = {
  ipcRenderer: mockIpcRenderer,
  remote: {
    app: {
      getPath: vi.fn(),
    },
  },
};

// In tests
vi.mock('electron', () => mockElectron);
```

### 4. Use Chrome DevTools Protocol (CDP)

For advanced testing, use CDP directly:

```typescript
// Playwright CDP example
const client = await context.newCDPSession(page);
await client.send('Runtime.evaluate', {
  expression: 'window.myElectronAPI.doSomething()'
});
```

### 5. CI/CD Integration

Configure E2E tests to run in CI:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:e2e
```

## Real-World Examples

### VS Code (Microsoft)
- **Framework:** Playwright
- **Approach:** Comprehensive E2E test suite
- **Focus:** Critical user workflows

### Slack
- **Framework:** WebdriverIO
- **Approach:** Extensive E2E coverage
- **Focus:** Cross-platform compatibility

### Discord
- **Framework:** WebdriverIO
- **Approach:** E2E tests for critical features
- **Focus:** Reliability and stability

### Electron React Boilerplate
- **Framework:** TestCafe
- **Approach:** Example E2E setup
- **Focus:** Quick setup for new projects

## Testing Electron Apps vs. Obsidian Plugins

### Electron Apps
- **Full Control:** You control the entire Electron app
- **Direct API Access:** Can use Electron APIs directly
- **Standalone:** App runs independently
- **Testing:** Use Playwright, WebdriverIO, etc.

### Obsidian Plugins
- **Limited Control:** Plugin runs inside Obsidian
- **Obsidian APIs:** Must use Obsidian's plugin API
- **Dependent:** Requires Obsidian to run
- **Testing:** 
  - **Unit Tests:** Vitest/Jest with mocked Obsidian APIs (most common)
  - **E2E Tests:** WebdriverIO with `wdio-obsidian-service` (specialized tool)

## Recommendations

### For Electron Apps

1. **New Projects:** Use **Playwright** (modern, fast, well-maintained)
2. **Complex Apps:** Consider **WebdriverIO** (mature, extensive features)
3. **Quick Setup:** Use **TestCafe** (simple, easy to learn)
4. **Avoid:** Spectron (deprecated), Cypress (not officially supported)

### For Obsidian Plugins

1. **Primary Approach:** **Vitest** with mocked Obsidian APIs (current best practice)
2. **E2E Testing:** **WebdriverIO with `wdio-obsidian-service`** (if needed)
3. **Avoid:** Playwright (not designed for Obsidian plugins)

## Best Practices

### 1. Test Critical Paths Only
Don't try to E2E test everything. Focus on:
- User registration/login flows
- Core feature workflows
- Critical business logic paths
- Cross-platform compatibility

### 2. Keep Tests Fast
- Use parallel test execution
- Mock external services
- Use test databases
- Clean up between tests

### 3. Make Tests Reliable
- Use explicit waits, not fixed timeouts
- Handle async operations properly
- Isolate tests (no shared state)
- Use deterministic test data

### 4. Maintain Testability
- Keep business logic separate from Electron APIs
- Use dependency injection
- Write testable code from the start
- Document testing patterns

### 5. Integrate with CI/CD
- Run E2E tests on every PR
- Test on all target platforms
- Use test result reporting
- Set up test failure notifications

## Resources

### Official Documentation
- [Playwright Electron Testing](https://playwright.dev/docs/api/class-electron)
- [WebdriverIO Electron Service](https://webdriver.io/docs/wdio-electron-service/)
- [Electron Testing Guide](https://www.electronjs.org/docs/latest/tutorial/automated-testing)

### Community Resources
- [Electron Testing Best Practices](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [WebdriverIO Obsidian Service](https://webdriver.io/docs/wdio-obsidian-service/) (for Obsidian plugins)

### Example Projects
- [VS Code E2E Tests](https://github.com/microsoft/vscode/tree/main/test/automation)
- [Electron React Boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate)

## Conclusion

E2E testing for Electron apps is more complex than web apps but is essential for ensuring reliability. The choice of framework depends on your specific needs:

- **Playwright:** Best for modern apps, excellent DX
- **WebdriverIO:** Best for complex apps, mature ecosystem
- **TestCafe:** Best for quick setup, simple projects

For Obsidian plugins specifically, stick with unit testing (Vitest) as the primary approach, and consider WebdriverIO with `wdio-obsidian-service` only if you need true E2E testing.

---

**Last Updated:** 2025-01-27  
**Related Documents:**
- [ADR-004: Testing Strategy](../adr/0004-testing-strategy.md)
- [DEVELOPMENT.md](../DEVELOPMENT.md) - Testing Patterns section

