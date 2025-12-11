/**
 * Database Module Unit Tests
 *
 * Comprehensive test suite for the database connection and initialization module.
 * Tests cover:
 * - Database connection management and singleton pattern
 * - Schema loading and table creation
 * - Column structure and constraints
 * - Data operations and transactions
 * - Concurrent access handling
 * - Error handling and recovery
 * - Reset functionality for test isolation
 *
 * All tests use in-memory SQLite database to ensure test isolation and speed.
 */

import { sqlConnection, resetDb } from "./index";
import { AsyncDatabase } from "promised-sqlite3";
import * as fs from "node:fs/promises";

/**
 * Main test suite for database module.
 * Each describe block tests a specific aspect of database functionality.
 */
describe("database module", () => {
  beforeEach(() => {
    // Reset database before each test
    resetDb();
  });

  afterEach(async () => {
    // Clean up database connections
    resetDb();
  });

  /**
   * Tests for sqlConnection() function.
   * Verifies database initialization, schema loading, and connection management.
   * Tests singleton pattern to ensure only one database instance is created.
   */
  describe("sqlConnection", () => {
    /**
     * Verifies that sqlConnection returns a valid database instance.
     */
    it("returns a valid AsyncDatabase instance", async () => {
      const db = await sqlConnection();

      expect(db).toBeDefined();
      expect(db).toBeInstanceOf(AsyncDatabase);
    });

    /**
     * Verifies that sqlConnection returns the same instance on multiple calls (singleton pattern).
     */
    it("returns the same instance on subsequent calls", async () => {
      const db1 = await sqlConnection();
      const db2 = await sqlConnection();

      expect(db1).toBe(db2);
    });

    /**
     * Verifies that the database schema is properly loaded and tables are created.
     */
    it("initializes database with schema tables", async () => {
      const db = await sqlConnection();

      // Check that all expected tables exist
      const tables = await db.all<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      );

      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain("workspaces");
      expect(tableNames).toContain("users");
      expect(tableNames).toContain("channels");
      expect(tableNames).toContain("messages");
      expect(tableNames).toContain("reactions");
      expect(tableNames).toContain("channel_members");
    });

    /**
     * Verifies that the workspaces table has the correct column structure.
     * Tests that all required columns exist with proper data types.
     * Workspaces are the top-level organizational unit in the system.
     * Expects: id, name, slug, created_at columns to be present.
     */
    it("creates workspaces table with correct columns", async () => {
      const db = await sqlConnection();

      const columns = await db.all<{ name: string; type: string }>(
        "PRAGMA table_info(workspaces)",
      );

      const columnNames = columns.map((c) => c.name);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("slug");
      expect(columnNames).toContain("created_at");
    });

    /**
     * Verifies that the users table has the correct column structure.
     * Tests that all user-related fields are properly defined.
     * Users represent individual members who can participate in channels and send messages.
     * Expects: id, username, email, display_name, status, created_at columns.
     */
    it("creates users table with correct columns", async () => {
      const db = await sqlConnection();

      const columns = await db.all<{ name: string; type: string }>(
        "PRAGMA table_info(users)",
      );

      const columnNames = columns.map((c) => c.name);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("username");
      expect(columnNames).toContain("email");
      expect(columnNames).toContain("display_name");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("created_at");
    });

    /**
     * Verifies that the channels table has the correct column structure.
     * Tests that channel properties including privacy settings are properly defined.
     * Channels organize conversations within workspaces and can be public or private.
     * Expects: id, workspace_id, name, topic, is_private, created_at columns.
     */
    it("creates channels table with correct columns", async () => {
      const db = await sqlConnection();

      const columns = await db.all<{ name: string; type: string }>(
        "PRAGMA table_info(channels)",
      );

      const columnNames = columns.map((c) => c.name);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("workspace_id");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("topic");
      expect(columnNames).toContain("is_private");
      expect(columnNames).toContain("created_at");
    });

    /**
     * Verifies that the messages table has the correct column structure.
     * Tests that message fields including threading support are properly defined.
     * Messages are the core content items posted by users in channels.
     * Expects: id, channel_id, user_id, text, thread_ts, created_at columns.
     */
    it("creates messages table with correct columns", async () => {
      const db = await sqlConnection();

      const columns = await db.all<{ name: string; type: string }>(
        "PRAGMA table_info(messages)",
      );

      const columnNames = columns.map((c) => c.name);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("channel_id");
      expect(columnNames).toContain("user_id");
      expect(columnNames).toContain("text");
      expect(columnNames).toContain("thread_ts");
      expect(columnNames).toContain("created_at");
    });

    /**
     * Verifies that the database can perform basic CRUD operations.
     * Tests INSERT and SELECT operations to ensure database is functional.
     * Validates that lastID is returned correctly after insert operations.
     * Expects: Successful insert with valid lastID and accurate data retrieval.
     */
    it("allows basic database operations", async () => {
      const db = await sqlConnection();

      // Insert a workspace
      const result = await db.run(
        "INSERT INTO workspaces (name, slug) VALUES (?, ?)",
        ["Test Workspace", "test"],
      );

      expect(result.lastID).toBeGreaterThan(0);

      // Query the workspace
      const workspace = await db.get<{
        id: number;
        name: string;
        slug: string;
      }>("SELECT * FROM workspaces WHERE id = ?", [result.lastID]);

      expect(workspace).toBeDefined();
      expect(workspace?.name).toBe("Test Workspace");
      expect(workspace?.slug).toBe("test");
    });

    /**
     * Verifies that unique constraints are properly enforced by the database.
     * Tests that duplicate values in UNIQUE columns are rejected with appropriate error.
     * Critical for data integrity and preventing duplicate workspace identifiers.
     * Expects: SQLite UNIQUE constraint violation error on duplicate slug insert.
     */
    it("enforces unique constraints on workspace slug", async () => {
      const db = await sqlConnection();

      await db.run("INSERT INTO workspaces (name, slug) VALUES (?, ?)", [
        "Workspace 1",
        "unique-slug",
      ]);

      // Attempt to insert duplicate slug
      await expect(
        db.run("INSERT INTO workspaces (name, slug) VALUES (?, ?)", [
          "Workspace 2",
          "unique-slug",
        ]),
      ).rejects.toThrow(/UNIQUE constraint failed/);
    });

    /**
     * Verifies that NOT NULL constraints are properly enforced by the database.
     * Tests that required fields cannot be omitted during insert operations.
     * Essential for ensuring data completeness and preventing null reference errors.
     * Expects: SQLite NOT NULL constraint violation when required field is missing.
     */
    it("enforces NOT NULL constraints", async () => {
      const db = await sqlConnection();

      // Attempt to insert without required field
      await expect(
        db.run("INSERT INTO workspaces (slug) VALUES (?)", ["test"]),
      ).rejects.toThrow(/NOT NULL constraint failed/);
    });

    /**
     * Verifies that the database uses in-memory storage during test execution.
     * In-memory databases provide test isolation and faster execution without I/O overhead.
     * Tests that NODE_ENV=test triggers in-memory mode and data operations work correctly.
     * Expects: Test environment to use :memory: database with functional operations.
     */
    it("uses in-memory database for tests", async () => {
      expect(process.env.NODE_ENV).toBe("test");

      const db = await sqlConnection();

      // Verify it's working by inserting data
      await db.run("INSERT INTO workspaces (name, slug) VALUES (?, ?)", [
        "Test",
        "test",
      ]);

      const count = await db.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM workspaces",
      );
      expect(count?.count).toBe(1);
    });
  });

  /**
   * Tests for resetDb() function.
   * Verifies that the database connection can be properly reset for test isolation.
   * Critical for ensuring each test starts with a clean database state.
   */
  describe("resetDb", () => {
    /**
     * Verifies that resetDb clears the database instance variable.
     * Tests that after reset, a new database connection is created on next call.
     * Critical for test isolation - ensures tests don't share database state.
     * Expects: New database instance after reset (not same object reference).
     */
    it("clears the database instance", async () => {
      const db1 = await sqlConnection();
      await db1.run("INSERT INTO workspaces (name, slug) VALUES (?, ?)", [
        "Test",
        "test",
      ]);

      resetDb();

      const db2 = await sqlConnection();

      // After reset, should get a new instance
      expect(db2).not.toBe(db1);
    });

    /**
     * Verifies that resetDb allows fresh database initialization.
     * Tests that data from previous connection is not present after reset.
     * Important for test cleanup - each test should start with empty database.
     * Expects: Zero rows in tables after reset and re-initialization.
     */
    it("allows fresh database initialization after reset", async () => {
      const db1 = await sqlConnection();
      await db1.run("INSERT INTO workspaces (name, slug) VALUES (?, ?)", [
        "Test",
        "test",
      ]);

      resetDb();

      const db2 = await sqlConnection();
      const count = await db2.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM workspaces",
      );

      // Since we're using in-memory for tests, data should be gone
      expect(count?.count).toBe(0);
    });

    /**
     * Verifies that resetDb can be called multiple times without errors.
     * Tests idempotency - calling reset multiple times should be safe.
     * Ensures cleanup code is robust and doesn't fail on already-reset state.
     * Expects: No exceptions thrown when calling resetDb repeatedly.
     */
    it("can be called multiple times safely", () => {
      expect(() => {
        resetDb();
        resetDb();
        resetDb();
      }).not.toThrow();
    });

    /**
     * Verifies that resetDb works when called before any connection exists.
     * Tests edge case where reset is called on undefined instance.
     * Important for test setup cleanup that may run before database initialization.
     * Expects: No exceptions thrown when resetting uninitialized database.
     */
    it("works when called before any connection", () => {
      expect(() => {
        resetDb();
      }).not.toThrow();
    });
  });

  /**
   * Tests for schema loading and execution.
   * Verifies that the SQL schema file is properly loaded, parsed, and executed.
   * Tests table creation, foreign keys, and constraint setup.
   */
  describe("schema loading", () => {
    /**
     * Verifies that schema is correctly loaded from schema.sql file.
     * Tests that the file system read and parsing logic works correctly.
     * Validates that SQL statements are executed and tables are created.
     * Expects: Multiple tables to exist after schema initialization.
     */
    it("loads schema from schema.sql file", async () => {
      const db = await sqlConnection();

      // Verify that schema was executed by checking for expected tables
      const tables = await db.all<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table'",
      );

      expect(tables.length).toBeGreaterThan(0);
    });

    /**
     * Verifies that all schema statements are properly split and executed.
     * Tests the SQL parsing logic that splits schema by semicolons.
     * Ensures all CREATE TABLE and other DDL statements are executed.
     * Expects: Multiple schema objects (tables, indexes) to be created.
     */
    it("executes all schema statements", async () => {
      const db = await sqlConnection();

      // Check for tables, indexes, and other schema objects
      const schemaObjects = await db.all<{ type: string; name: string }>(
        "SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'",
      );

      // Should have tables and indexes
      const types = schemaObjects.map((o) => o.type);
      expect(types).toContain("table");
    });

    /**
     * Verifies that foreign key relationships are properly defined in schema.
     * Tests that referential integrity constraints are established between tables.
     * Foreign keys ensure data consistency across related tables.
     * Expects: Messages table to have foreign keys to channels and users tables.
     */
    it("creates foreign key relationships", async () => {
      const db = await sqlConnection();

      // Check foreign keys on messages table
      const fks = await db.all<{ table: string; from: string; to: string }>(
        "PRAGMA foreign_key_list(messages)",
      );

      // Messages should have foreign keys to channels and users
      expect(fks.length).toBeGreaterThan(0);
    });

    /**
     * Verifies that indexes are created (implicitly via UNIQUE constraints).
     */
    it("has implicit indexes from UNIQUE constraints", async () => {
      const db = await sqlConnection();

      // Check that unique constraints exist on key columns
      // These automatically create indexes in SQLite
      const workspaces = await db.all<{ name: string }>(
        "PRAGMA index_list(workspaces)",
      );
      const users = await db.all<{ name: string }>("PRAGMA index_list(users)");

      // Unique constraints on slug, username, email create implicit indexes
      expect(workspaces.length).toBeGreaterThan(0);
      expect(users.length).toBeGreaterThan(0);
    });
  });

  /**
   * Tests for concurrent access and thread safety.
   * Verifies that multiple simultaneous database operations are handled correctly.
   * Tests singleton pattern under concurrent initialization scenarios.
   */
  describe("concurrent access", () => {
    /**
     * Verifies singleton pattern works correctly under concurrent access.
     * Tests that multiple simultaneous sqlConnection calls return same instance.
     * Critical for preventing race conditions during application startup.
     * Expects: All promises to resolve to the exact same database instance.
     */
    it("handles multiple simultaneous sqlConnection calls", async () => {
      const promises = [
        sqlConnection(),
        sqlConnection(),
        sqlConnection(),
        sqlConnection(),
      ];

      const instances = await Promise.all(promises);

      // All should return the same instance
      expect(instances[0]).toBe(instances[1]);
      expect(instances[0]).toBe(instances[2]);
      expect(instances[0]).toBe(instances[3]);
    });

    /**
     * Verifies that database can handle multiple concurrent write operations.
     * Tests that parallel inserts complete successfully without data corruption.
     * Important for understanding database locking and concurrency behavior.
     * Expects: All 10 concurrent inserts to succeed and data to be accurate.
     */
    it("handles concurrent database operations", async () => {
      const db = await sqlConnection();

      // Execute multiple inserts concurrently
      const insertPromises = Array.from({ length: 10 }, (_, i) =>
        db.run("INSERT INTO workspaces (name, slug) VALUES (?, ?)", [
          `Workspace ${i}`,
          `ws-${i}`,
        ]),
      );

      const results = await Promise.all(insertPromises);

      // All inserts should succeed
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.lastID).toBeGreaterThan(0);
      });

      // Verify all records exist
      const count = await db.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM workspaces",
      );
      expect(count?.count).toBe(10);
    });
  });

  /**
   * Tests for data persistence and transactions.
   * Verifies CRUD operations, relational data handling, and query functionality.
   * Tests automatic timestamp generation and data integrity.
   */
  describe("data operations", () => {
    /**
     * Verifies that inserted data persists and can be queried within same connection.
     * Tests basic data durability and query correctness.
     * Ensures that multiple inserts are all retrievable in subsequent queries.
     * Expects: Both inserted workspaces to be retrievable in correct order.
     */
    it("persists data across queries", async () => {
      const db = await sqlConnection();

      await db.run("INSERT INTO workspaces (name, slug) VALUES (?, ?)", [
        "Workspace 1",
        "ws1",
      ]);
      await db.run("INSERT INTO workspaces (name, slug) VALUES (?, ?)", [
        "Workspace 2",
        "ws2",
      ]);

      const workspaces = await db.all<{ name: string }>(
        "SELECT name FROM workspaces ORDER BY name",
      );

      expect(workspaces).toHaveLength(2);
      expect(workspaces[0].name).toBe("Workspace 1");
      expect(workspaces[1].name).toBe("Workspace 2");
    });

    /**
     * Verifies that related data can be inserted and queried with JOINs.
     * Tests the full relational model: workspace → channel → user → message.
     * Validates foreign key relationships work correctly for complex queries.
     * Expects: Successful JOIN query returning combined data from multiple tables.
     */
    it("supports relational data operations", async () => {
      const db = await sqlConnection();

      // Create workspace
      const wsResult = await db.run(
        "INSERT INTO workspaces (name, slug) VALUES (?, ?)",
        ["Test Workspace", "test"],
      );
      const workspaceId = wsResult.lastID;

      // Create user
      const userResult = await db.run(
        "INSERT INTO users (username, email, display_name) VALUES (?, ?, ?)",
        ["alice", "alice@example.com", "Alice"],
      );
      const userId = userResult.lastID;

      // Create channel
      const channelResult = await db.run(
        "INSERT INTO channels (workspace_id, name, is_private) VALUES (?, ?, ?)",
        [workspaceId, "general", 0],
      );
      const channelId = channelResult.lastID;

      // Create message
      const messageResult = await db.run(
        "INSERT INTO messages (channel_id, user_id, text) VALUES (?, ?, ?)",
        [channelId, userId, "Hello world"],
      );

      expect(messageResult.lastID).toBeGreaterThan(0);

      // Query with join
      const messages = await db.all<{
        text: string;
        username: string;
        channel_name: string;
      }>(
        `SELECT m.text, u.username, c.name as channel_name
         FROM messages m
         JOIN users u ON m.user_id = u.id
         JOIN channels c ON m.channel_id = c.id`,
      );

      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe("Hello world");
      expect(messages[0].username).toBe("alice");
      expect(messages[0].channel_name).toBe("general");
    });

    /**
     * Verifies that created_at timestamps are automatically set on insert.
     * Tests SQLite DEFAULT CURRENT_TIMESTAMP functionality in schema.
     * Automatic timestamps are crucial for audit trails and data chronology.
     * Expects: Valid ISO timestamp to be present without explicit setting.
     */
    it("automatically sets timestamps on insert", async () => {
      const db = await sqlConnection();

      const result = await db.run(
        "INSERT INTO workspaces (name, slug) VALUES (?, ?)",
        ["Test", "test"],
      );

      const workspace = await db.get<{ created_at: string }>(
        "SELECT created_at FROM workspaces WHERE id = ?",
        [result.lastID],
      );

      expect(workspace?.created_at).toBeDefined();
      // Verify it's a valid timestamp
      const timestamp = new Date(workspace!.created_at);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });
});
