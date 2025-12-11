/**
 * Unit tests for Logger utility
 * Tests all logging levels, configuration options, and filtering behavior.
 */

import { Logger, LogLevel } from "./logger";

describe("Logger", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Enable logging for tests
    Logger.setEnabled(true);
    Logger.setLogLevel(LogLevel.DEBUG);

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Reset logger to test mode
    Logger.setEnabled(false);
    Logger.setLogLevel(LogLevel.INFO);
  });

  /**
   * Tests for basic logging functionality at each level
   */
  describe("logging levels", () => {
    it("logs debug messages with DEBUG level", () => {
      Logger.debug("Test debug message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain("DEBUG");
      expect(output).toContain("Test debug message");
    });

    it("logs info messages with INFO level", () => {
      Logger.info("Test info message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain("INFO");
      expect(output).toContain("Test info message");
    });

    it("logs warning messages with WARN level", () => {
      Logger.warn("Test warning message");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const output = consoleWarnSpy.mock.calls[0][0];
      expect(output).toContain("WARN");
      expect(output).toContain("Test warning message");
    });

    it("logs error messages with ERROR level", () => {
      Logger.error("Test error message");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain("ERROR");
      expect(output).toContain("Test error message");
    });
  });

  /**
   * Tests for context parameter in log messages
   */
  describe("context parameter", () => {
    it("includes context in debug logs", () => {
      Logger.debug("Test message", "test-context");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain("[test-context]");
      expect(output).toContain("Test message");
    });

    it("includes context in info logs", () => {
      Logger.info("Test message", "api");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain("[api]");
    });

    it("includes context in warning logs", () => {
      Logger.warn("Test message", "database");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const output = consoleWarnSpy.mock.calls[0][0];
      expect(output).toContain("[database]");
    });

    it("includes context in error logs", () => {
      Logger.error("Test message", "http-server");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain("[http-server]");
    });

    it("omits context when not provided", () => {
      Logger.info("Test message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).not.toContain("[");
      expect(output).toContain("Test message");
    });
  });

  /**
   * Tests for data parameter serialization
   */
  describe("data parameter", () => {
    it("includes JSON-serialized data in debug logs", () => {
      Logger.debug("Test message", "api", { userId: 123, action: "create" });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('{"userId":123,"action":"create"}');
    });

    it("includes JSON-serialized data in info logs", () => {
      Logger.info("Server started", "http", { port: 3000 });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('{"port":3000}');
    });

    it("handles Error objects in error logs", () => {
      const error = new Error("Test error");
      Logger.error("Operation failed", "api", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain("Test error");
      expect(output).toContain('"name":"Error"');
    });

    it("handles non-Error objects in error logs", () => {
      const errorData = { code: "SQLITE_CONSTRAINT", errno: 19 };
      Logger.error("Database error", "database", errorData);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"code":"SQLITE_CONSTRAINT"');
      expect(output).toContain('"errno":19');
    });

    it("omits data when not provided", () => {
      Logger.info("Simple message", "test");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain("Simple message");
      // Should not have trailing JSON object
      expect(output).not.toMatch(/\{.*\}$/);
    });
  });

  /**
   * Tests for log level filtering
   */
  describe("log level filtering", () => {
    it("suppresses DEBUG logs when level is INFO", () => {
      Logger.setLogLevel(LogLevel.INFO);

      Logger.debug("Should not appear");
      Logger.info("Should appear");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain("Should appear");
      expect(output).not.toContain("Should not appear");
    });

    it("suppresses DEBUG and INFO logs when level is WARN", () => {
      Logger.setLogLevel(LogLevel.WARN);

      Logger.debug("Should not appear");
      Logger.info("Should not appear");
      Logger.warn("Should appear");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("only shows ERROR logs when level is ERROR", () => {
      Logger.setLogLevel(LogLevel.ERROR);

      Logger.debug("Should not appear");
      Logger.info("Should not appear");
      Logger.warn("Should not appear");
      Logger.error("Should appear");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("shows all logs when level is DEBUG", () => {
      Logger.setLogLevel(LogLevel.DEBUG);

      Logger.debug("Debug message");
      Logger.info("Info message");
      Logger.warn("Warn message");
      Logger.error("Error message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug + info
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Tests for enable/disable functionality
   */
  describe("enable/disable", () => {
    it("suppresses all logs when disabled", () => {
      Logger.setEnabled(false);

      Logger.debug("Should not appear");
      Logger.info("Should not appear");
      Logger.warn("Should not appear");
      Logger.error("Should not appear");

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("shows logs when enabled", () => {
      Logger.setEnabled(true);
      Logger.info("Should appear");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it("can be toggled on and off", () => {
      Logger.setEnabled(true);
      Logger.info("Message 1");

      Logger.setEnabled(false);
      Logger.info("Should not appear");

      Logger.setEnabled(true);
      Logger.info("Message 2");

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const outputs = consoleLogSpy.mock.calls.map((call) => call[0]);
      expect(outputs[0]).toContain("Message 1");
      expect(outputs[1]).toContain("Message 2");
    });
  });

  /**
   * Tests for timestamp format
   */
  describe("timestamp format", () => {
    it("includes ISO 8601 timestamp", () => {
      Logger.info("Test message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      // Check for ISO 8601 format: YYYY-MM-DDTHH:MM:SS.sssZ
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it("generates unique timestamps for rapid successive calls", () => {
      Logger.info("Message 1");
      Logger.info("Message 2");

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const timestamp1 = consoleLogSpy.mock.calls[0][0].split(" ")[0];
      const timestamp2 = consoleLogSpy.mock.calls[1][0].split(" ")[0];

      // Timestamps should be valid ISO strings
      expect(new Date(timestamp1).getTime()).toBeGreaterThan(0);
      expect(new Date(timestamp2).getTime()).toBeGreaterThan(0);
    });
  });

  /**
   * Tests for complex scenarios
   */
  describe("complex scenarios", () => {
    it("handles messages with special characters", () => {
      Logger.info("Message with \"quotes\" and 'apostrophes'", "test");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('"quotes"');
      expect(output).toContain("'apostrophes'");
    });

    it("handles multiline messages", () => {
      Logger.info("Line 1\nLine 2\nLine 3", "test");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain("Line 1\nLine 2\nLine 3");
    });

    it("handles empty messages", () => {
      Logger.info("", "test");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain("[test]");
    });

    it("handles very long messages", () => {
      const longMessage = "x".repeat(1000);
      Logger.info(longMessage, "test");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain(longMessage);
    });

    it("handles nested data structures", () => {
      const complexData = {
        user: { id: 123, name: "Alice" },
        metadata: { tags: ["tag1", "tag2"], count: 5 },
      };
      Logger.debug("Complex data", "api", complexData);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('"id":123');
      expect(output).toContain('"name":"Alice"');
      expect(output).toContain('"tags":["tag1","tag2"]');
    });

    it("handles circular references in data gracefully", () => {
      const circularData: any = { name: "test" };
      circularData.self = circularData;

      // Should not throw an error
      expect(() => {
        Logger.info("Circular reference", "test", circularData);
      }).toThrow(); // JSON.stringify will throw on circular refs
    });
  });

  /**
   * Tests for integration with error handling
   */
  describe("error handling integration", () => {
    it("formats standard Error objects with stack traces", () => {
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at TestFunction (test.ts:10:5)";

      Logger.error("Operation failed", "api", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain("Operation failed");
      expect(output).toContain('"message":"Test error"');
      expect(output).toContain("TestFunction");
    });

    it("handles TypeError objects", () => {
      const error = new TypeError("Invalid type");
      Logger.error("Type error occurred", "api", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"name":"TypeError"');
      expect(output).toContain('"message":"Invalid type"');
    });

    it("handles custom error objects", () => {
      class CustomError extends Error {
        constructor(
          message: string,
          public code: string,
        ) {
          super(message);
          this.name = "CustomError";
        }
      }

      const error = new CustomError("Custom error", "ERR_CUSTOM");
      Logger.error("Custom error occurred", "api", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('"name":"CustomError"');
      expect(output).toContain('"message":"Custom error"');
    });
  });
});
