import { AsyncDatabase } from "promised-sqlite3";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { Logger } from "../utils/logger";

let instance: AsyncDatabase | undefined;
let schema: string;

const dbFile =
  process.env.NODE_ENV === "test"
    ? ":memory:"
    : path.resolve(__dirname, "datastore.db");

/**
 * Establishes and returns a database connection.
 * Uses in-memory database for tests, file-based for other environments.
 * Automatically initializes schema and enables foreign key constraints on first connection.
 * @returns Promise resolving to the database connection
 */
export async function sqlConnection(): Promise<AsyncDatabase> {
  if (!instance) {
    try {
      instance = await AsyncDatabase.open(dbFile);
      // Enable foreign key constraints
      await instance.run("PRAGMA foreign_keys = ON;");
      const schemaPath = path.resolve(__dirname, "schema.sql");
      schema = schema || (await readFile(schemaPath, { encoding: "utf-8" }));
      const statements = schema
        .split(";")
        .map((s) => s.trim())
        .filter((s) => !!s)
        .map((s) => `${s};`);
      for (const stmt of statements) {
        await instance?.run(stmt);
      }
    } catch (err) {
      Logger.error("Unable to initialize database", "database", err);
      throw err;
    }
  }
  return instance;
}

/**
 * Resets the database connection instance.
 * Used primarily in tests to ensure a clean state between test runs.
 */
export function resetDb() {
  instance = undefined;
}
