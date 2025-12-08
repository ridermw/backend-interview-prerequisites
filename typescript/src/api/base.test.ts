import {
  ValidationError,
  ConflictError,
  NotFoundError,
  validateId,
  validateString,
  validateBoolean,
  validateEnum,
  isSqliteUniqueError,
  isSqliteForeignKeyError,
} from "./base";

describe("base api utilities", () => {
  describe("Error classes", () => {
    it("ValidationError has status 400", () => {
      const err = new ValidationError("test error");
      expect(err.status).toBe(400);
      expect(err.message).toBe("test error");
      expect(err.name).toBe("ValidationError");
    });

    it("ConflictError has status 409", () => {
      const err = new ConflictError("test conflict");
      expect(err.status).toBe(409);
      expect(err.message).toBe("test conflict");
      expect(err.name).toBe("ConflictError");
    });

    it("NotFoundError has status 404", () => {
      const err = new NotFoundError("not found");
      expect(err.status).toBe(404);
      expect(err.message).toBe("not found");
      expect(err.name).toBe("NotFoundError");
    });
  });

  describe("validateId", () => {
    it("validates positive integers", () => {
      expect(validateId(1, "id")).toBe(1);
      expect(validateId(100, "id")).toBe(100);
      expect(validateId("42", "id")).toBe(42);
    });

    it("throws ValidationError for invalid ids", () => {
      expect(() => validateId(0, "id")).toThrow(ValidationError);
      expect(() => validateId(-1, "id")).toThrow(ValidationError);
      expect(() => validateId(1.5, "id")).toThrow(ValidationError);
      expect(() => validateId("abc", "id")).toThrow(ValidationError);
      expect(() => validateId(null, "id")).toThrow(ValidationError);
      expect(() => validateId(undefined, "id")).toThrow(ValidationError);
    });

    it("includes field name in error message", () => {
      expect(() => validateId(0, "userId")).toThrow(
        "userId must be a positive integer",
      );
    });
  });

  describe("validateString", () => {
    it("validates strings with no options", () => {
      expect(validateString("hello", "name")).toBe("hello");
      expect(validateString("", "name")).toBe("");
    });

    it("returns empty string for null/undefined when not required", () => {
      expect(validateString(null, "name")).toBe("");
      expect(validateString(undefined, "name")).toBe("");
    });

    it("throws ValidationError when required and missing", () => {
      expect(() => validateString(null, "name", { required: true })).toThrow(
        "name is required",
      );
      expect(() =>
        validateString(undefined, "name", { required: true }),
      ).toThrow("name is required");
      expect(() => validateString("", "name", { required: true })).toThrow(
        "name is required",
      );
    });

    it("trims strings when trim option is true", () => {
      expect(validateString("  hello  ", "name", { trim: true })).toBe("hello");
      expect(
        validateString("  hello  ", "name", { trim: true, required: true }),
      ).toBe("hello");
    });

    it("throws ValidationError when trimmed string is empty and required", () => {
      expect(() =>
        validateString("   ", "name", { trim: true, required: true }),
      ).toThrow("name is required");
    });

    it("validates minLength", () => {
      expect(validateString("hello", "name", { minLength: 3 })).toBe("hello");
      expect(() => validateString("hi", "name", { minLength: 3 })).toThrow(
        "name must be at least 3 characters",
      );
    });

    it("validates maxLength", () => {
      expect(validateString("hello", "name", { maxLength: 10 })).toBe("hello");
      expect(() =>
        validateString("hello world!", "name", { maxLength: 10 }),
      ).toThrow("name must be 10 characters or fewer");
    });

    it("throws ValidationError for non-string types", () => {
      expect(() => validateString(123, "name")).toThrow(
        "name must be a string",
      );
      expect(() => validateString(true, "name")).toThrow(
        "name must be a string",
      );
      expect(() => validateString({}, "name")).toThrow("name must be a string");
    });

    it("handles singular character in error messages", () => {
      expect(() =>
        validateString("", "name", { minLength: 1, required: false }),
      ).toThrow("name must be at least 1 character");
      expect(() => validateString("ab", "name", { maxLength: 1 })).toThrow(
        "name must be 1 character or fewer",
      );
    });
  });

  describe("validateBoolean", () => {
    it("validates boolean values", () => {
      expect(validateBoolean(true, "flag")).toBe(true);
      expect(validateBoolean(false, "flag")).toBe(false);
    });

    it("returns default value for null/undefined", () => {
      expect(validateBoolean(null, "flag", true)).toBe(true);
      expect(validateBoolean(undefined, "flag", false)).toBe(false);
      expect(validateBoolean(null, "flag")).toBe(false);
    });

    it("throws ValidationError for non-boolean types", () => {
      expect(() => validateBoolean("true", "flag")).toThrow(
        "flag must be a boolean",
      );
      expect(() => validateBoolean(1, "flag")).toThrow(
        "flag must be a boolean",
      );
      expect(() => validateBoolean(0, "flag")).toThrow(
        "flag must be a boolean",
      );
    });
  });

  describe("validateEnum", () => {
    const validStatuses = ["active", "inactive", "pending"] as const;

    it("validates enum values", () => {
      expect(validateEnum("active", "status", validStatuses)).toBe("active");
      expect(validateEnum("inactive", "status", validStatuses)).toBe(
        "inactive",
      );
    });

    it("returns default value when provided", () => {
      expect(validateEnum(null, "status", validStatuses, "active")).toBe(
        "active",
      );
      expect(validateEnum(undefined, "status", validStatuses, "pending")).toBe(
        "pending",
      );
    });

    it("throws ValidationError when required and missing", () => {
      expect(() => validateEnum(null, "status", validStatuses)).toThrow(
        "status is required",
      );
      expect(() => validateEnum(undefined, "status", validStatuses)).toThrow(
        "status is required",
      );
    });

    it("throws ValidationError for invalid enum values", () => {
      expect(() => validateEnum("invalid", "status", validStatuses)).toThrow(
        "status must be one of: active, inactive, pending",
      );
    });

    it("throws ValidationError for non-string types", () => {
      expect(() => validateEnum(123, "status", validStatuses)).toThrow(
        "status must be a string",
      );
    });
  });

  describe("isSqliteUniqueError", () => {
    it("detects UNIQUE constraint errors", () => {
      const err = {
        message: "UNIQUE constraint failed: channels.workspace_id",
      };
      expect(isSqliteUniqueError(err)).toBe(true);
    });

    it("detects UNIQUE constraint errors for specific table", () => {
      const err = { message: "UNIQUE constraint failed: channels.name" };
      expect(isSqliteUniqueError(err, "channels")).toBe(true);
      expect(isSqliteUniqueError(err, "users")).toBe(false);
    });

    it("returns false for non-UNIQUE errors", () => {
      const err = { message: "FOREIGN KEY constraint failed" };
      expect(isSqliteUniqueError(err)).toBe(false);
    });

    it("returns false for invalid error objects", () => {
      expect(isSqliteUniqueError(null)).toBe(false);
      expect(isSqliteUniqueError(undefined)).toBe(false);
      expect(isSqliteUniqueError("error string")).toBe(false);
      expect(isSqliteUniqueError({})).toBe(false);
    });
  });

  describe("isSqliteForeignKeyError", () => {
    it("detects FOREIGN KEY constraint errors", () => {
      const err = { message: "FOREIGN KEY constraint failed" };
      expect(isSqliteForeignKeyError(err)).toBe(true);
    });

    it("returns false for non-FOREIGN KEY errors", () => {
      const err = { message: "UNIQUE constraint failed" };
      expect(isSqliteForeignKeyError(err)).toBe(false);
    });

    it("returns false for invalid error objects", () => {
      expect(isSqliteForeignKeyError(null)).toBe(false);
      expect(isSqliteForeignKeyError(undefined)).toBe(false);
      expect(isSqliteForeignKeyError("error")).toBe(false);
      expect(isSqliteForeignKeyError({})).toBe(false);
    });
  });
});
