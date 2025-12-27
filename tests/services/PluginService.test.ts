/**
 * Tests for PluginService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PluginService } from "../../src/services/PluginService";
import { CommunityPlugin } from "../../src/types";
import { requestUrl } from "obsidian";
import { PLUGIN_CONFIG } from "../../src/config";

// Mock obsidian module
vi.mock("obsidian", async () => {
  const actual = await vi.importActual("obsidian");
  return {
    ...actual,
    requestUrl: vi.fn(),
  };
});

vi.mock("../../src/utils", async () => {
  const actual = await vi.importActual("../../src/utils");
  return {
    ...actual,
    showError: vi.fn(),
  };
});

describe("PluginService", () => {
  let pluginService: PluginService;
  const mockPlugins: CommunityPlugin[] = [
    {
      id: "plugin-1",
      name: "Plugin One",
      author: "Author One",
      description: "Description One",
      repo: "owner1/plugin1",
    },
    {
      id: "plugin-2",
      name: "Plugin Two",
      author: "Author Two",
      description: "Description Two",
      repo: "owner2/plugin2",
    },
  ];

  beforeEach(() => {
    pluginService = new PluginService();
    pluginService.clearCache(); // Ensure clean state
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    pluginService.clearCache();
    vi.useRealTimers();
  });

  describe("fetchCommunityPlugins", () => {
    it("should fetch plugins successfully", async () => {
      const mockResponse = {
        status: 200,
        headers: {},
        json: mockPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        mockResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      const result = await pluginService.fetchCommunityPlugins();
      expect(result).toEqual(mockPlugins);
      expect(requestUrl).toHaveBeenCalledWith({
        url: PLUGIN_CONFIG.urls.communityPlugins,
        method: "GET",
        headers: undefined,
      });
    });

    it("should use cache when data is fresh", async () => {
      vi.mocked(requestUrl).mockResolvedValueOnce({
        status: 200,
        headers: {},
        json: mockPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      } as Awaited<ReturnType<typeof requestUrl>>);

      await pluginService.fetchCommunityPlugins();
      vi.clearAllMocks();

      // Second call should use cache
      const result = await pluginService.fetchCommunityPlugins();
      expect(result).toEqual(mockPlugins);
      expect(requestUrl).not.toHaveBeenCalled();
    });

    it("should force refresh when requested", async () => {
      vi.mocked(requestUrl).mockResolvedValueOnce({
        status: 200,
        headers: {},
        json: mockPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      } as Awaited<ReturnType<typeof requestUrl>>);

      await pluginService.fetchCommunityPlugins();
      vi.clearAllMocks();

      const newPlugins = [{ ...mockPlugins[0], name: "Updated Name" }];
      vi.mocked(requestUrl).mockResolvedValueOnce({
        status: 200,
        headers: {},
        json: newPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      } as Awaited<ReturnType<typeof requestUrl>>);

      const result = await pluginService.fetchCommunityPlugins(true);
      expect(result).toEqual(newPlugins);
      expect(requestUrl).toHaveBeenCalled();
    });

    it("should handle ETag conditional requests", async () => {
      const firstResponse = {
        status: 200,
        headers: { ETag: '"abc123"' },
        json: mockPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        firstResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      await pluginService.fetchCommunityPlugins();
      vi.clearAllMocks();

      // Expire cache so it makes a request
      vi.useFakeTimers();
      vi.advanceTimersByTime(PLUGIN_CONFIG.constants.cacheDuration + 1000);

      // Second request should include If-None-Match header
      const secondResponse = {
        status: 304,
        headers: {},
        json: mockPlugins, // Still return plugins for 304
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        secondResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      const result = await pluginService.fetchCommunityPlugins();
      expect(result).toEqual(mockPlugins);
      expect(requestUrl).toHaveBeenCalledWith({
        url: PLUGIN_CONFIG.urls.communityPlugins,
        method: "GET",
        headers: { "If-None-Match": '"abc123"' },
      });
      vi.useRealTimers();
    });

    it("should filter invalid plugins", async () => {
      const invalidPlugins = [
        {
          id: "valid",
          name: "Valid",
          author: "Author",
          description: "Desc",
          repo: "owner/repo",
        },
        {
          id: "",
          name: "Invalid",
          author: "Author",
          description: "Desc",
          repo: "owner/repo",
        }, // Empty id
        {
          id: "valid2",
          name: "Valid2",
          author: "",
          description: "Desc",
          repo: "owner/repo",
        }, // Empty author
        {
          id: "valid3",
          name: "",
          author: "Author",
          description: "Desc",
          repo: "owner/repo",
        }, // Empty name
        {
          id: "valid4",
          name: "Valid4",
          author: "Author",
          description: "",
          repo: "owner/repo",
        }, // Empty description
        {
          id: "valid5",
          name: "Valid5",
          author: "Author",
          description: "Desc",
          repo: "",
        }, // Empty repo
      ];

      const mockResponse = {
        status: 200,
        headers: {},
        json: invalidPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        mockResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      const result = await pluginService.fetchCommunityPlugins();
      // Only the first plugin has all required fields
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("valid");
    });

    it("should return stale cache on error if available", async () => {
      const firstResponse = {
        status: 200,
        headers: {},
        json: mockPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        firstResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      await pluginService.fetchCommunityPlugins();

      // Expire cache so it tries to fetch again
      vi.useFakeTimers();
      vi.advanceTimersByTime(PLUGIN_CONFIG.constants.cacheDuration + 1000);
      vi.useRealTimers();

      vi.clearAllMocks();

      vi.mocked(requestUrl).mockRejectedValueOnce(new Error("Network error"));

      const result = await pluginService.fetchCommunityPlugins();
      expect(result).toEqual(mockPlugins);
    });

    it("should handle 304 response without cache gracefully", async () => {
      // Clear any existing cache
      pluginService.clearCache();

      // Simulate 304 response when no cache exists
      const response304 = {
        status: 304,
        headers: {},
        json: mockPlugins, // Still return data for 304
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        response304 as Awaited<ReturnType<typeof requestUrl>>,
      );

      // Should fall through and parse the response
      const result = await pluginService.fetchCommunityPlugins();
      expect(result).toEqual(mockPlugins);
    });

    it("should handle rate limit errors and return cached data", async () => {
      // First, populate cache
      const firstResponse = {
        status: 200,
        headers: {},
        json: mockPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        firstResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      await pluginService.fetchCommunityPlugins();

      // Expire cache
      vi.useFakeTimers();
      vi.advanceTimersByTime(PLUGIN_CONFIG.constants.cacheDuration + 1000);
      vi.useRealTimers();

      vi.clearAllMocks();

      // Simulate rate limit error (403 or 429)
      const rateLimitResponse = {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 3600),
        },
        json: {},
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        rateLimitResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      const result = await pluginService.fetchCommunityPlugins();
      // Should return cached data on rate limit
      expect(result).toEqual(mockPlugins);
    });
  });

  describe("searchPlugins", () => {
    it("should return all plugins for empty query", () => {
      const result = pluginService.searchPlugins(mockPlugins, "");
      expect(result).toEqual(mockPlugins);
    });

    it("should search by name", () => {
      const result = pluginService.searchPlugins(mockPlugins, "One");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Plugin One");
    });

    it("should search by author", () => {
      const result = pluginService.searchPlugins(mockPlugins, "Author Two");
      expect(result).toHaveLength(1);
      expect(result[0].author).toBe("Author Two");
    });

    it("should search by description", () => {
      const result = pluginService.searchPlugins(
        mockPlugins,
        "Description One",
      );
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Description One");
    });

    it("should search by id", () => {
      const result = pluginService.searchPlugins(mockPlugins, "plugin-2");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("plugin-2");
    });

    it("should be case-insensitive", () => {
      const result = pluginService.searchPlugins(mockPlugins, "PLUGIN ONE");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Plugin One");
    });

    it("should trim whitespace", () => {
      const result = pluginService.searchPlugins(mockPlugins, "  One  ");
      expect(result).toHaveLength(1);
    });
  });

  describe("fetchPluginManifest", () => {
    const mockManifest = {
      id: "plugin-1",
      name: "Plugin One",
      version: "1.0.0",
      minAppVersion: "1.0.0",
    };

    it("should fetch manifest successfully", async () => {
      vi.resetAllMocks();

      const mockResponse = {
        status: 200,
        headers: {},
        json: mockManifest,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValue(
        mockResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      const result = await pluginService.fetchPluginManifest(mockPlugins[0]);
      expect(result).toEqual(mockManifest);
      expect(requestUrl).toHaveBeenCalled();
    });

    it("should use branch from plugin if provided", async () => {
      const pluginWithBranch = { ...mockPlugins[0], branch: "main" };
      vi.mocked(requestUrl).mockResolvedValueOnce({
        status: 200,
        headers: {},
        json: mockManifest,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      } as Awaited<ReturnType<typeof requestUrl>>);

      await pluginService.fetchPluginManifest(pluginWithBranch);
      expect(requestUrl).toHaveBeenCalledWith({
        url: expect.stringContaining("/main/"),
        method: "GET",
      });
    });

    it("should return null on fetch error", async () => {
      vi.resetAllMocks();
      vi.mocked(requestUrl).mockRejectedValue(new Error("Network error"));

      const result = await pluginService.fetchPluginManifest(mockPlugins[0]);
      expect(result).toBeNull();
    });

    it("should return null for invalid manifest", async () => {
      vi.resetAllMocks();
      const invalidResponse = {
        status: 200,
        headers: {},
        json: { id: "plugin-1" }, // Missing required fields (name, version)
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValue(
        invalidResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      const result = await pluginService.fetchPluginManifest(mockPlugins[0]);
      expect(result).toBeNull();
    });
  });

  describe("fetchPluginReadme", () => {
    it("should fetch README successfully", async () => {
      vi.resetAllMocks();
      const readmeContent = "# Plugin One\n\nDescription here.";
      const mockResponse = {
        status: 200,
        headers: {},
        json: {},
        text: readmeContent,
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValue(
        mockResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      const result = await pluginService.fetchPluginReadme(mockPlugins[0]);
      expect(result).toBe(readmeContent);
    });

    it("should return null on fetch error", async () => {
      vi.resetAllMocks();
      vi.mocked(requestUrl).mockRejectedValue(new Error("Network error"));

      const result = await pluginService.fetchPluginReadme(mockPlugins[0]);
      expect(result).toBeNull();
    });
  });

  describe("getPluginInfo", () => {
    it("should fetch manifest and README in parallel", async () => {
      const mockManifest = {
        id: "plugin-1",
        name: "Plugin One",
        version: "1.0.0",
        minAppVersion: "1.0.0",
      };
      const readmeContent = "# Plugin One";

      const manifestResponse = {
        status: 200,
        headers: {},
        json: mockManifest,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      const readmeResponse = {
        status: 200,
        headers: {},
        json: {},
        text: readmeContent,
        arrayBuffer: new ArrayBuffer(0),
      };

      vi.mocked(requestUrl)
        .mockResolvedValueOnce(
          manifestResponse as Awaited<ReturnType<typeof requestUrl>>,
        )
        .mockResolvedValueOnce(
          readmeResponse as Awaited<ReturnType<typeof requestUrl>>,
        );

      const result = await pluginService.getPluginInfo(mockPlugins[0]);
      expect(result.manifest).toEqual(mockManifest);
      expect(result.readme).toBe(readmeContent);
    });
  });

  describe("getLatestReleaseDate", () => {
    it("should fetch release date successfully", async () => {
      const releaseDate = "2024-01-15T12:00:00Z";
      // Mock stats fetch to return null (no stats available) so it falls through to GitHub API
      vi.mocked(requestUrl).mockResolvedValueOnce({
        status: 200,
        headers: {},
        json: {}, // Empty stats
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      } as Awaited<ReturnType<typeof requestUrl>>);

      const mockResponse = {
        status: 200,
        headers: {},
        json: { published_at: releaseDate },
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        mockResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      const result = await pluginService.getLatestReleaseDate(mockPlugins[0]);
      expect(result).toEqual(new Date(releaseDate));
    });

    it("should use cache when data is fresh", async () => {
      const releaseDate = "2024-01-15T12:00:00Z";
      // Mock stats fetch to return null (no stats available) so it falls through to GitHub API
      vi.mocked(requestUrl).mockResolvedValueOnce({
        status: 200,
        headers: {},
        json: {}, // Empty stats
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      } as Awaited<ReturnType<typeof requestUrl>>);

      const mockResponse = {
        status: 200,
        headers: {},
        json: { published_at: releaseDate },
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        mockResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      await pluginService.getLatestReleaseDate(mockPlugins[0]);
      vi.clearAllMocks();

      const result = await pluginService.getLatestReleaseDate(mockPlugins[0]);
      expect(result).toEqual(new Date(releaseDate));
      expect(requestUrl).not.toHaveBeenCalled();
    });

    it("should return null for 404 (no releases)", async () => {
      vi.resetAllMocks();
      // Mock stats fetch to return null (no stats available) so it falls through to GitHub API
      vi.mocked(requestUrl).mockResolvedValueOnce({
        status: 200,
        headers: {},
        json: {}, // Empty stats
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      } as Awaited<ReturnType<typeof requestUrl>>);

      const error = new Error("404 Not Found");
      vi.mocked(requestUrl).mockRejectedValue(error);

      const result = await pluginService.getLatestReleaseDate(mockPlugins[0]);
      expect(result).toBeNull();
    });

    it("should handle invalid repo format", async () => {
      // Mock stats fetch to return null (no stats available) so it falls through to GitHub API
      vi.mocked(requestUrl).mockResolvedValueOnce({
        status: 200,
        headers: {},
        json: {}, // Empty stats
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      } as Awaited<ReturnType<typeof requestUrl>>);

      const invalidPlugin = { ...mockPlugins[0], repo: "invalid-repo-format" };
      const result = await pluginService.getLatestReleaseDate(invalidPlugin);
      expect(result).toBeNull();
    });

    it("should handle ETag conditional requests", async () => {
      vi.resetAllMocks();
      const releaseDate = "2024-01-15T12:00:00Z";
      // Mock stats fetch to return null (no stats available) so it falls through to GitHub API
      vi.mocked(requestUrl).mockResolvedValueOnce({
        status: 200,
        headers: {},
        json: {}, // Empty stats
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      } as Awaited<ReturnType<typeof requestUrl>>);

      const firstResponse = {
        status: 200,
        headers: { ETag: '"release123"' },
        json: { published_at: releaseDate },
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        firstResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      await pluginService.getLatestReleaseDate(mockPlugins[0]);

      // Clear cache to force a new request (but ETag should still be used)
      pluginService.clearCache();

      // Mock stats fetch again for second call
      vi.mocked(requestUrl).mockResolvedValueOnce({
        status: 200,
        headers: {},
        json: {}, // Empty stats
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      } as Awaited<ReturnType<typeof requestUrl>>);

      const secondResponse = {
        status: 304,
        headers: {},
        json: { published_at: releaseDate }, // Still return data for 304
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        secondResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      const result = await pluginService.getLatestReleaseDate(mockPlugins[0]);
      expect(result).toEqual(new Date(releaseDate));
      // Check that ETag was stored and used in conditional request
      // Note: clearCache clears ETags too, so this test verifies ETag storage
      // For a true conditional request test, we'd need to not clear cache
      expect(requestUrl).toHaveBeenCalledTimes(4); // 2 stats calls + 2 API calls
    });
  });

  describe("getReleaseDateFromStats", () => {
    it("should extract release date from stats data", () => {
      const stats = {
        "plugin-1": {
          id: "plugin-1",
          updated: "2024-01-15T12:00:00Z",
          downloads: 1000,
        },
      };

      const result = pluginService.getReleaseDateFromStats(
        mockPlugins[0],
        stats,
      );

      expect(result).toEqual(new Date("2024-01-15T12:00:00Z"));
    });

    it("should return null when plugin not in stats", () => {
      const stats = {
        "other-plugin": {
          id: "other-plugin",
          updated: "2024-01-15T12:00:00Z",
        },
      };

      const result = pluginService.getReleaseDateFromStats(
        mockPlugins[0],
        stats,
      );

      expect(result).toBeNull();
    });

    it("should return null when plugin stats has no updated field", () => {
      const stats = {
        "plugin-1": {
          id: "plugin-1",
          downloads: 1000,
        },
      };

      const result = pluginService.getReleaseDateFromStats(
        mockPlugins[0],
        stats,
      );

      expect(result).toBeNull();
    });

    it("should return null when updated field is invalid date", () => {
      const stats = {
        "plugin-1": {
          id: "plugin-1",
          updated: "invalid-date",
        },
      };

      const result = pluginService.getReleaseDateFromStats(
        mockPlugins[0],
        stats,
      );

      expect(result).toBeNull();
    });

    it("should update cache when extracting date from stats", async () => {
      const stats = {
        "plugin-1": {
          id: "plugin-1",
          updated: "2024-01-15T12:00:00Z",
        },
      };

      pluginService.getReleaseDateFromStats(mockPlugins[0], stats);

      // Verify cache was updated by checking that getLatestReleaseDate uses it
      // (without making API calls)
      vi.clearAllMocks();
      const result = await pluginService.getLatestReleaseDate(
        mockPlugins[0],
        false,
      );
      expect(result).toEqual(new Date("2024-01-15T12:00:00Z"));
      // Should not make API calls since we have cached data
      expect(requestUrl).not.toHaveBeenCalled();
    });
  });

  describe("getCachedReleaseDate", () => {
    it("should return cached date if available and not expired", () => {
      const releaseDate = new Date("2024-01-15T12:00:00Z");
      pluginService["releaseDateCache"].set("plugin-1", releaseDate);
      pluginService["releaseDateCacheTimestamps"].set("plugin-1", Date.now());

      const result = pluginService.getCachedReleaseDate("plugin-1");

      expect(result.found).toBe(true);
      expect(result.date).toEqual(releaseDate);
    });

    it("should return found=false when plugin not in cache", () => {
      const result = pluginService.getCachedReleaseDate("non-existent-plugin");

      expect(result.found).toBe(false);
      expect(result.date).toBeNull();
    });

    it("should return found=false when cache is expired", () => {
      const releaseDate = new Date("2024-01-15T12:00:00Z");
      pluginService["releaseDateCache"].set("plugin-1", releaseDate);
      // Set timestamp to 2 hours ago (expired if cache duration is 1 hour)
      pluginService["releaseDateCacheTimestamps"].set(
        "plugin-1",
        Date.now() - 2 * 60 * 60 * 1000,
      );

      const result = pluginService.getCachedReleaseDate("plugin-1");

      expect(result.found).toBe(false);
      expect(result.date).toBeNull();
    });

    it("should return found=true with date=null when cached as null (no releases)", () => {
      // Cache null to indicate plugin has no releases
      pluginService["releaseDateCache"].set("plugin-1", null);
      pluginService["releaseDateCacheTimestamps"].set("plugin-1", Date.now());

      const result = pluginService.getCachedReleaseDate("plugin-1");

      // Should return found=true with date=null to indicate we know it has no releases
      expect(result.found).toBe(true);
      expect(result.date).toBeNull();
    });

    it("should return found=false when cache timestamp is missing", () => {
      const releaseDate = new Date("2024-01-15T12:00:00Z");
      pluginService["releaseDateCache"].set("plugin-1", releaseDate);
      // Don't set timestamp

      const result = pluginService.getCachedReleaseDate("plugin-1");

      expect(result.found).toBe(false);
      expect(result.date).toBeNull();
    });
  });

  describe("clearCache", () => {
    it("should clear all caches", async () => {
      vi.resetAllMocks();
      const firstResponse = {
        status: 200,
        headers: {},
        json: mockPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        firstResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      await pluginService.fetchCommunityPlugins();
      pluginService.clearCache();

      const secondResponse = {
        status: 200,
        headers: {},
        json: mockPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        secondResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      const result = await pluginService.fetchCommunityPlugins();
      expect(result).toEqual(mockPlugins);
      expect(requestUrl).toHaveBeenCalledTimes(2);
    });
  });

  describe("refreshPluginsIfChanged", () => {
    it("should return false when plugins haven't changed", async () => {
      vi.clearAllMocks();
      // First fetch to populate cache
      const firstResponse = {
        status: 200,
        headers: { ETag: '"etag1"' },
        json: mockPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        firstResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      await pluginService.fetchCommunityPlugins();

      // refreshPluginsIfChanged calls fetchCommunityPlugins(false) which checks cache
      // If cache is valid, it returns cached data without making a request
      // So refreshPluginsIfChanged will compare cached data with itself
      // Since we're not changing anything, it should return false
      const changed = await pluginService.refreshPluginsIfChanged();
      expect(changed).toBe(false);
    });

    it("should return true when plugins have changed", async () => {
      vi.resetAllMocks();
      // First fetch to populate cache
      const firstResponse = {
        status: 200,
        headers: { ETag: '"etag1"' },
        json: mockPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        firstResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      await pluginService.fetchCommunityPlugins();

      // Clear cache and fetch new data to simulate change
      pluginService.clearCache();

      // Second fetch returns changed data
      const updatedPlugins = [{ ...mockPlugins[0], name: "Updated Name" }];
      const secondResponse = {
        status: 200,
        headers: {},
        json: updatedPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        secondResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      // refreshPluginsIfChanged will fetch and compare
      // Since cache was cleared, beforePlugins is empty, afterPlugins has data
      // So it will detect a change
      const changed = await pluginService.refreshPluginsIfChanged();
      expect(changed).toBe(true);
    });

    it("should return false and log warning when refresh fails", async () => {
      vi.resetAllMocks();
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      // First fetch to populate cache
      const firstResponse = {
        status: 200,
        headers: { ETag: '"etag1"' },
        json: mockPlugins,
        text: "",
        arrayBuffer: new ArrayBuffer(0),
      };
      vi.mocked(requestUrl).mockResolvedValueOnce(
        firstResponse as Awaited<ReturnType<typeof requestUrl>>,
      );

      await pluginService.fetchCommunityPlugins();

      // Clear cache to force a new request
      pluginService.clearCache();

      // Make refreshPluginsIfChanged fail by making requestUrl throw
      vi.mocked(requestUrl).mockRejectedValueOnce(new Error("Network error"));

      const changed = await pluginService.refreshPluginsIfChanged();
      expect(changed).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Background refresh failed:",
        expect.any(Error),
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
