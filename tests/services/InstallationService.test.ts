/**
 * Tests for InstallationService
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstallationService } from "../../src/services/InstallationService";
import { PluginManifest } from "../../src/types";
import { App, TFile, TFolder, requestUrl } from "obsidian";
import { createMockApp } from "../mocks/obsidian";

// Mock obsidian module
vi.mock("obsidian", async () => {
  const actual = await vi.importActual("obsidian");
  return {
    ...actual,
    requestUrl: vi.fn(),
    TFile: class {},
    TFolder: class {},
    normalizePath: vi.fn((path: string) => path),
  };
});

vi.mock("../../src/utils", async () => {
  const actual = await vi.importActual("../../src/utils");
  return {
    ...actual,
    showError: vi.fn(),
    showSuccess: vi.fn(),
    debugLog: vi.fn(),
  };
});

describe("InstallationService", () => {
  let installationService: InstallationService;
  let mockApp: App;
  const mockManifest: PluginManifest = {
    id: "test-plugin",
    name: "Test Plugin",
    version: "1.0.0",
    minAppVersion: "1.0.0",
    description: "A test plugin",
    author: "Test Author",
  };

  /**
   * Helper function to create a mock TFile that passes instanceof checks
   */
  function createMockTFile(path: string): TFile {
    const mockFile = Object.create(TFile.prototype);
    mockFile.path = path;
    Object.setPrototypeOf(mockFile, TFile.prototype);
    return mockFile;
  }

  /**
   * Helper function to create a mock TFolder that passes instanceof checks
   */
  function createMockTFolder(path: string): TFolder {
    const mockFolder = Object.create(TFolder.prototype);
    mockFolder.path = path;
    Object.setPrototypeOf(mockFolder, TFolder.prototype);
    return mockFolder;
  }

  beforeEach(() => {
    mockApp = createMockApp() as unknown as App;
    installationService = new InstallationService(mockApp);
    vi.clearAllMocks();
  });

  describe("isPluginInstalled", () => {
    it("should return true when manifest.json exists", async () => {
      const mockFile = createMockTFile(
        ".obsidian/plugins/test-plugin/manifest.json",
      );

      vi.mocked(mockApp.vault.getAbstractFileByPath).mockReturnValue(mockFile);

      const result = await installationService.isPluginInstalled("test-plugin");
      expect(result).toBe(true);
    });

    it("should return false when manifest.json does not exist", async () => {
      vi.mocked(mockApp.vault.getAbstractFileByPath).mockReturnValue(null);

      const result = await installationService.isPluginInstalled("test-plugin");
      expect(result).toBe(false);
    });

    it("should return false when path exists but is not a file", async () => {
      const mockFolder = createMockTFolder(".obsidian/plugins/test-plugin");

      vi.mocked(mockApp.vault.getAbstractFileByPath).mockReturnValue(
        mockFolder,
      );

      const result = await installationService.isPluginInstalled("test-plugin");
      expect(result).toBe(false);
    });
  });

  describe("getInstalledVersion", () => {
    it("should return version from manifest.json", async () => {
      const mockFile = createMockTFile(
        ".obsidian/plugins/test-plugin/manifest.json",
      );

      vi.mocked(mockApp.vault.getAbstractFileByPath).mockReturnValue(mockFile);
      vi.mocked(mockApp.vault.read).mockResolvedValue(
        JSON.stringify(mockManifest),
      );

      const result =
        await installationService.getInstalledVersion("test-plugin");
      expect(result).toBe("1.0.0");
    });

    it("should return null when plugin is not installed", async () => {
      vi.mocked(mockApp.vault.getAbstractFileByPath).mockReturnValue(null);

      const result =
        await installationService.getInstalledVersion("test-plugin");
      expect(result).toBeNull();
    });

    it("should return null when manifest cannot be read", async () => {
      const mockFile = createMockTFile(
        ".obsidian/plugins/test-plugin/manifest.json",
      );

      vi.mocked(mockApp.vault.getAbstractFileByPath).mockReturnValue(mockFile);
      vi.mocked(mockApp.vault.read).mockRejectedValue(new Error("Read error"));

      const result =
        await installationService.getInstalledVersion("test-plugin");
      expect(result).toBeNull();
    });
  });

  describe("hasUpdateAvailable", () => {
    it("should return true when update is available", async () => {
      const mockFile = createMockTFile(
        ".obsidian/plugins/test-plugin/manifest.json",
      );

      vi.mocked(mockApp.vault.getAbstractFileByPath).mockReturnValue(mockFile);
      vi.mocked(mockApp.vault.read).mockResolvedValue(
        JSON.stringify({ ...mockManifest, version: "0.9.0" }),
      );

      const result = await installationService.hasUpdateAvailable(
        "test-plugin",
        "1.0.0",
      );
      expect(result).toBe(true);
    });

    it("should return false when already up to date", async () => {
      const mockFile = createMockTFile(
        ".obsidian/plugins/test-plugin/manifest.json",
      );

      vi.mocked(mockApp.vault.getAbstractFileByPath).mockReturnValue(mockFile);
      vi.mocked(mockApp.vault.read).mockResolvedValue(
        JSON.stringify(mockManifest),
      );

      const result = await installationService.hasUpdateAvailable(
        "test-plugin",
        "1.0.0",
      );
      expect(result).toBe(false);
    });

    it("should return false when plugin is not installed", async () => {
      vi.mocked(mockApp.vault.getAbstractFileByPath).mockReturnValue(null);

      const result = await installationService.hasUpdateAvailable(
        "test-plugin",
        "1.0.0",
      );
      expect(result).toBe(false);
    });
  });

  describe("installPlugin", () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    const mockRepo = "owner/repo";
    const mockVersion = "1.0.0";

    it("should install plugin successfully", async () => {
      const mainJsResponse = {
        status: 200,
        headers: {},
        json: {},
        text: "",
        arrayBuffer: mockArrayBuffer,
      };
      const manifestResponse = {
        status: 200,
        headers: {},
        json: {},
        text: "",
        arrayBuffer: mockArrayBuffer,
      };

      vi.mocked(requestUrl)
        .mockResolvedValueOnce(
          mainJsResponse as Awaited<ReturnType<typeof requestUrl>>,
        )
        .mockResolvedValueOnce(
          manifestResponse as Awaited<ReturnType<typeof requestUrl>>,
        )
        .mockRejectedValueOnce(new Error("404")); // styles.css not found

      vi.mocked(mockApp.vault.adapter.writeBinary).mockResolvedValue();

      const result = await installationService.installPlugin(
        mockRepo,
        mockVersion,
        mockManifest,
      );
      expect(result.success).toBe(true);
      expect(result.pluginId).toBe("test-plugin");
    });

    it("should download and install styles.css if available", async () => {
      const mainJsResponse = {
        status: 200,
        headers: {},
        json: {},
        text: "",
        arrayBuffer: mockArrayBuffer,
      };
      const manifestResponse = {
        status: 200,
        headers: {},
        json: {},
        text: "",
        arrayBuffer: mockArrayBuffer,
      };
      const stylesResponse = {
        status: 200,
        headers: {},
        json: {},
        text: "",
        arrayBuffer: mockArrayBuffer,
      };

      vi.mocked(requestUrl)
        .mockResolvedValueOnce(
          mainJsResponse as Awaited<ReturnType<typeof requestUrl>>,
        )
        .mockResolvedValueOnce(
          manifestResponse as Awaited<ReturnType<typeof requestUrl>>,
        )
        .mockResolvedValueOnce(
          stylesResponse as Awaited<ReturnType<typeof requestUrl>>,
        );

      vi.mocked(mockApp.vault.adapter.writeBinary).mockResolvedValue();

      const result = await installationService.installPlugin(
        mockRepo,
        mockVersion,
        mockManifest,
      );
      expect(result.success).toBe(true);
      expect(requestUrl).toHaveBeenCalledTimes(3); // main.js, manifest.json, styles.css
    });

    it("should return error for invalid repo format", async () => {
      const result = await installationService.installPlugin(
        "invalid-repo",
        mockVersion,
        mockManifest,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid repository format");
    });

    it("should return error for invalid version", async () => {
      const result = await installationService.installPlugin(
        mockRepo,
        "",
        mockManifest,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid version format");
    });

    it("should return error for invalid manifest", async () => {
      const invalidManifest = { ...mockManifest, id: "" };
      const result = await installationService.installPlugin(
        mockRepo,
        mockVersion,
        invalidManifest,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid manifest");
    });

    it("should check compatibility before installing", async () => {
      const incompatibleManifest = { ...mockManifest, minAppVersion: "99.0.0" };
      // Mock app.version directly
      Object.defineProperty(mockApp, "version", {
        value: "1.0.0",
        writable: true,
      });

      const result = await installationService.installPlugin(
        mockRepo,
        mockVersion,
        incompatibleManifest,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("requires Obsidian");
    });

    it("should rollback on installation failure", async () => {
      const mockResponse = {
        status: 200,
        headers: {},
        json: {},
        text: "",
        arrayBuffer: mockArrayBuffer,
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        mockResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      // First writeBinary call (main.js) succeeds, second (manifest.json) fails
      vi.mocked(mockApp.vault.adapter.writeBinary)
        .mockResolvedValueOnce(undefined) // main.js write succeeds
        .mockRejectedValueOnce(new Error("Write error")); // manifest.json write fails

      const mockFile = createMockTFile(".obsidian/plugins/test-plugin/main.js");

      // getAbstractFileByPath should return the file when called with the written file path
      vi.mocked(mockApp.vault.getAbstractFileByPath).mockImplementation(
        (path: string) => {
          if (path === ".obsidian/plugins/test-plugin/main.js") {
            return mockFile;
          }
          return null;
        },
      );
      vi.mocked(mockApp.vault.delete).mockResolvedValue();

      const result = await installationService.installPlugin(
        mockRepo,
        mockVersion,
        mockManifest,
      );
      expect(result.success).toBe(false);
      expect(mockApp.vault.delete).toHaveBeenCalled();
    });
  });

  describe("uninstallPlugin", () => {
    it("should uninstall plugin successfully", async () => {
      const mockFolder = createMockTFolder(".obsidian/plugins/test-plugin");

      vi.mocked(mockApp.vault.getAbstractFileByPath).mockReturnValue(
        mockFolder,
      );
      vi.mocked(mockApp.vault.adapter.rmdir).mockResolvedValue();

      const result = await installationService.uninstallPlugin("test-plugin");
      expect(result.success).toBe(true);
      expect(result.pluginId).toBe("test-plugin");
    });

    it("should return error when plugin not found", async () => {
      vi.mocked(mockApp.vault.getAbstractFileByPath).mockReturnValue(null);

      const result = await installationService.uninstallPlugin("test-plugin");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should handle deletion errors gracefully", async () => {
      const mockFolder = createMockTFolder(".obsidian/plugins/test-plugin");

      vi.mocked(mockApp.vault.getAbstractFileByPath).mockReturnValue(
        mockFolder,
      );
      vi.mocked(mockApp.vault.adapter.rmdir).mockRejectedValue(
        new Error("Delete error"),
      );

      const result = await installationService.uninstallPlugin("test-plugin");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Delete error");
    });
  });

  describe("enablePlugin", () => {
    it("should enable plugin if API is available", async () => {
      const enablePluginMock = vi.fn().mockResolvedValue(undefined);
      const appWithEnable = {
        ...mockApp,
        plugins: {
          enablePlugin: enablePluginMock,
        },
      } as unknown as App;

      const service = new InstallationService(appWithEnable);
      await service.enablePlugin("test-plugin");

      expect(enablePluginMock).toHaveBeenCalledWith("test-plugin");
    });

    it("should handle enable failure gracefully", async () => {
      const enablePluginMock = vi
        .fn()
        .mockRejectedValue(new Error("Enable failed"));
      const appWithEnable = {
        ...mockApp,
        plugins: {
          enablePlugin: enablePluginMock,
        },
      } as unknown as App;

      const service = new InstallationService(appWithEnable);
      await expect(service.enablePlugin("test-plugin")).resolves.not.toThrow();
    });
  });
});
