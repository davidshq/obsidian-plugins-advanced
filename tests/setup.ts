/**
 * Vitest setup file
 * Configures mocks and test environment before running tests
 */

import { vi } from "vitest";

// Mock Obsidian API
vi.mock("obsidian", () => {
  return {
    Plugin: vi.fn().mockImplementation(() => ({
      manifest: { id: "test-plugin" },
      settings: {},
      saveSettings: vi.fn().mockResolvedValue(undefined),
    })),
    ItemView: vi.fn().mockImplementation(() => ({
      containerEl: {
        children: [{}, document.createElement("div")],
        empty: vi.fn(),
        createDiv: vi.fn((cls?: string) => {
          const div = document.createElement("div");
          if (cls) div.className = cls;
          return div;
        }),

        createEl: vi.fn((tag: string, options?: any) => {
          const el = document.createElement(tag);
          if (options?.cls) el.className = options.cls;
          if (options?.text) el.textContent = options.text;
          if (options?.attr) {
            Object.entries(options.attr).forEach(([key, value]) => {
              el.setAttribute(key, value as string);
            });
          }
          return el;
        }),
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(() => []),
        addClass: vi.fn(),
        removeClass: vi.fn(),
      },
      getViewType: vi.fn(() => "test-view"),
      getDisplayText: vi.fn(() => "Test View"),
      getIcon: vi.fn(() => "test-icon"),
      onOpen: vi.fn(),
      onClose: vi.fn(),
    })),
    PluginSettingTab: vi.fn(),
    Notice: vi.fn(),
    requestUrl: vi.fn(),
    WorkspaceLeaf: vi.fn(),
    App: vi.fn(),
    Vault: vi.fn(),
  };
});

// Mock console methods to reduce noise in tests
(global as unknown as { console: typeof console }).console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
