/**
 * Tests for debug utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { debugLog, debugLogLabel } from "../../src/utils/debug";

describe("debugLog", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should log debug message when DEBUG_ENABLED is true", () => {
    debugLog("test message");
    expect(consoleLogSpy).toHaveBeenCalledWith("[DEBUG]", "test message");
  });

  it("should log multiple arguments", () => {
    debugLog("message", 123, { key: "value" });
    expect(consoleLogSpy).toHaveBeenCalledWith("[DEBUG]", "message", 123, {
      key: "value",
    });
  });

  it("should log empty message", () => {
    debugLog();
    expect(consoleLogSpy).toHaveBeenCalledWith("[DEBUG]");
  });
});

describe("debugLogLabel", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should log debug message with label", () => {
    debugLogLabel("TEST", "message");
    expect(consoleLogSpy).toHaveBeenCalledWith("[DEBUG:TEST]", "message");
  });

  it("should log multiple arguments with label", () => {
    debugLogLabel("MODULE", "message", 123, { key: "value" });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[DEBUG:MODULE]",
      "message",
      123,
      { key: "value" },
    );
  });

  it("should handle empty arguments with label", () => {
    debugLogLabel("LABEL");
    expect(consoleLogSpy).toHaveBeenCalledWith("[DEBUG:LABEL]");
  });
});
