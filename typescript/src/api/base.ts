/**
 * API Error Classes
 * These error classes are used throughout the API layer to communicate specific error conditions.
 * Each error has an associated HTTP status code for proper HTTP response handling.
 */

/**
 * Thrown when request validation fails (e.g., invalid field types, missing required fields)
 * HTTP Status: 400 Bad Request
 */
export class ValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Thrown when a resource already exists or violates a unique constraint
 * HTTP Status: 409 Conflict
 */
export class ConflictError extends Error {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * Thrown when a requested resource does not exist
 * HTTP Status: 404 Not Found
 */
export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export interface StringValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  trim?: boolean;
}

/**
 * Utility class for detecting specific SQLite database errors.
 * Helps distinguish between different types of database constraint violations.
 */
class DatabaseErrorHandler {
  static isUniqueError(err: unknown, table?: string): boolean {
    if (!err || typeof err !== "object") return false;
    const message = (err as { message?: string }).message || "";
    const hasUnique = message.includes("UNIQUE");
    if (table) {
      return hasUnique && message.includes(table);
    }
    return hasUnique;
  }

  static isForeignKeyError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const message = (err as { message?: string }).message || "";
    return message.includes("FOREIGN KEY");
  }
}

/**
 * Validation utility class providing static methods for common validation tasks.
 * All methods throw ValidationError if validation fails, allowing errors to bubble up to the API caller.
 */
class Validator {
  static validateId(value: unknown, field: string): number {
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(num) || num <= 0) {
      throw new ValidationError(`${field} must be a positive integer`);
    }
    return num;
  }

  static validateString(
    value: unknown,
    field: string,
    options: StringValidationOptions = {},
  ): string {
    const { required = false, minLength, maxLength, trim = false } = options;

    if (value === undefined || value === null) {
      if (required) {
        throw new ValidationError(`${field} is required`);
      }
      return "";
    }

    if (typeof value !== "string") {
      throw new ValidationError(`${field} must be a string`);
    }

    const str = trim ? value.trim() : value;

    if (required && !str) {
      throw new ValidationError(`${field} is required`);
    }

    if (minLength !== undefined && str.length < minLength) {
      throw new ValidationError(
        `${field} must be at least ${minLength} character${minLength !== 1 ? "s" : ""}`,
      );
    }

    if (maxLength !== undefined && str.length > maxLength) {
      throw new ValidationError(
        `${field} must be ${maxLength} character${maxLength !== 1 ? "s" : ""} or fewer`,
      );
    }

    return str;
  }

  static validateBoolean(
    value: unknown,
    field: string,
    defaultValue: boolean = false,
  ): boolean {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value === "boolean") {
      return value;
    }
    throw new ValidationError(`${field} must be a boolean`);
  }

  static validateEnum<T extends string>(
    value: unknown,
    field: string,
    allowedValues: readonly T[],
    defaultValue?: T,
  ): T {
    if (value === undefined || value === null) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new ValidationError(`${field} is required`);
    }

    if (typeof value !== "string") {
      throw new ValidationError(`${field} must be a string`);
    }

    if (!allowedValues.includes(value as T)) {
      throw new ValidationError(
        `${field} must be one of: ${allowedValues.join(", ")}`,
      );
    }

    return value as T;
  }
}

/**
 * Abstract base class for all API modules.
 * Provides access to validation and error handling utilities through protected instance helpers.
 * API classes can extend this and call the helpers to keep validation near usage.
 */
export abstract class BaseAPI {
  protected readonly validator = Validator;

  protected validateId(value: unknown, field: string): number {
    return this.validator.validateId(value, field);
  }

  protected validateString(
    value: unknown,
    field: string,
    options?: StringValidationOptions,
  ): string {
    return this.validator.validateString(value, field, options);
  }

  protected validateBoolean(
    value: unknown,
    field: string,
    defaultValue?: boolean,
  ): boolean {
    return this.validator.validateBoolean(value, field, defaultValue);
  }

  protected validateEnum<T extends string>(
    value: unknown,
    field: string,
    allowedValues: readonly T[],
    defaultValue?: T,
  ): T {
    return this.validator.validateEnum(
      value,
      field,
      allowedValues,
      defaultValue,
    );
  }

  protected isSqliteUniqueError(err: unknown, table?: string): boolean {
    return DatabaseErrorHandler.isUniqueError(err, table);
  }

  protected isSqliteForeignKeyError(err: unknown): boolean {
    return DatabaseErrorHandler.isForeignKeyError(err);
  }

  // Public exports for backward compatibility
  public static readonly ValidationError = ValidationError;
  public static readonly ConflictError = ConflictError;
  public static readonly NotFoundError = NotFoundError;
  public static readonly validateId = Validator.validateId;
  public static readonly validateString = Validator.validateString;
  public static readonly validateBoolean = Validator.validateBoolean;
  public static readonly validateEnum = Validator.validateEnum;
  public static readonly isSqliteUniqueError =
    DatabaseErrorHandler.isUniqueError;
  public static readonly isSqliteForeignKeyError =
    DatabaseErrorHandler.isForeignKeyError;
}

// Convenience exports for backward compatibility with existing code
export const Validator_class = Validator;
export const validateId = Validator.validateId;
export const validateString = Validator.validateString;
export const validateBoolean = Validator.validateBoolean;
export const validateEnum = Validator.validateEnum;
export const isSqliteUniqueError = DatabaseErrorHandler.isUniqueError;
export const isSqliteForeignKeyError = DatabaseErrorHandler.isForeignKeyError;
