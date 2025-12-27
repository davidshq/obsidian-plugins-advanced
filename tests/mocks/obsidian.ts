/**
 * Obsidian API mocks for testing
 */

import { vi } from "vitest";

export const createMockApp = () => ({
  vault: {
    configDir: ".obsidian",
    getAbstractFileByPath: vi.fn(),
    read: vi.fn(),
    write: vi.fn(),
    create: vi.fn(),
    exists: vi.fn(),
    delete: vi.fn(),
    adapter: {
      writeBinary: vi.fn(),
      rmdir: vi.fn(),
    },
  },
  workspace: {
    getLeaf: vi.fn(),
    getLeavesOfType: vi.fn(() => []),
  },
  version: "1.0.0",
  plugins: {
    enablePlugin: vi.fn(),
  },
});

export const createMockPlugin = () => ({
  manifest: {
    id: "test-plugin",
    name: "Test Plugin",
    version: "1.0.0",
    minAppVersion: "1.0.0",
  },
  settings: {
    viewLocation: "main" as const,
    displayMode: "grid" as const,
    searchFilters: {
      query: "",
      showInstalledOnly: false,
    },
  },
  saveSettings: vi.fn().mockResolvedValue(undefined),
});

export const createMockRequestUrl = () => {
  return vi.fn().mockImplementation((_options: { url: string }) => {
    // Default mock response
    return Promise.resolve({
      status: 200,
      headers: {},
      json: {},
      text: "",
      arrayBuffer: new ArrayBuffer(0),
    });
  });
};
