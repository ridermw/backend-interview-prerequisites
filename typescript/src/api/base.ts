// Base error classes for API responses

export class ValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConflictError extends Error {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// Base validation utilities

export function validateId(value: unknown, field: string): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new ValidationError(`${field} must be a positive integer`);
  }
  return num;
}

export function validateString(
  value: unknown,
  field: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    trim?: boolean;
  } = {},
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

export function validateBoolean(
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

export function validateEnum<T extends string>(
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

// Database error helpers

export function isSqliteUniqueError(err: unknown, table?: string): boolean {
  if (!err || typeof err !== "object") return false;
  const message = (err as { message?: string }).message || "";
  const hasUnique = message.includes("UNIQUE");
  if (table) {
    return hasUnique && message.includes(table);
  }
  return hasUnique;
}

export function isSqliteForeignKeyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const message = (err as { message?: string }).message || "";
  return message.includes("FOREIGN KEY");
}
