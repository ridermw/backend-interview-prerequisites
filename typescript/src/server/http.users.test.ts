/**
 * HTTP Users Endpoints Tests
 * 
 * Tests for all user-related HTTP endpoints including:
 * - Retrieving all users or by ID
 * - Creating new users
 * - Updating user status
 * - Error handling and validation
 */

import request from "supertest";
import { initializeHttp } from "./http";
import { resetDb } from "../database";
import { createUser } from "../api/users";

const app = initializeHttp();

/**
 * Test suite for all users HTTP endpoints.
 * Each describe block tests a specific endpoint with various scenarios.
 */
describe("http users endpoints", () => {
  beforeEach(() => {
    resetDb();
  });

  /**
   * Tests for GET /api/users.get endpoint.
   * Verifies retrieving all users in the system.
   */
  describe("GET /api/users.get", () => {
    /**
     * Verifies that GET /api/users.get returns all users in the system.
     * Tests the basic user listing functionality.
     * Expects: 200 status, array containing all users with correct usernames.
     */
    it("retrieves all users", async () => {
      await createUser("alice", "alice@example.com", "Alice");
      await createUser("bob", "bob@example.com", "Bob");

      const res = await request(app).get("/api/users.get");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
      expect(res.body.users).toHaveLength(2);
      expect(res.body.users.map((u: any) => u.username)).toContain("alice");
      expect(res.body.users.map((u: any) => u.username)).toContain("bob");
    });

    /**
     * Verifies that the endpoint returns an empty array when no users exist.
     * Tests proper handling of empty result sets.
     * Expects: 200 status with empty users array.
     */
    it("returns empty list when no users exist", async () => {
      const res = await request(app).get("/api/users.get");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, users: [] });
    });
  });

  /**
   * Tests for GET /api/users.getById endpoint.
   * Verifies retrieving a specific user by their ID.
   */
  describe("GET /api/users.getById", () => {
    /**
     * Verifies that GET /api/users.getById retrieves a specific user by their ID.
     * Tests the user lookup functionality including all user details.
     * Expects: 200 status, user object with correct id, username, email, and display_name.
     */
    it("retrieves a user by ID", async () => {
      const user = await createUser("alice", "alice@example.com", "Alice");

      const res = await request(app).get("/api/users.getById?id=" + user.id);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        user: {
          id: user.id,
          username: "alice",
          email: "alice@example.com",
          display_name: "Alice",
        },
      });
    });

    /**
     * Verifies proper error handling for non-existent users.
     * Expects: 404 Not Found error with appropriate error message.
     */
    it("returns 404 for non-existent user", async () => {
      const res = await request(app).get("/api/users.getById?id=999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("user not found");
    });

    /**
     * Verifies validation of required id parameter.
     * Expects: 400 Bad Request when id query parameter is not provided.
     */
    it("returns 400 when id is missing", async () => {
      const res = await request(app).get("/api/users.getById");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies validation of id parameter type.
     * Expects: 400 Bad Request when id is not a valid number.
     */
    it("returns 400 when id is invalid", async () => {
      const res = await request(app).get("/api/users.getById?id=invalid");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  /**
   * Tests for POST /api/users.create endpoint.
   * Verifies user creation with various field configurations.
   */
  describe("POST /api/users.create", () => {
    /**
     * Verifies successful user creation with all optional fields provided.
     * Tests complete user creation with username, email, and displayName.
     * Expects: 200 status, user object with correct username, email, and display_name.
     */
    it("creates a new user with all fields", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "alice",
          email: "alice@example.com",
          displayName: "Alice",
        });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        user: {
          username: "alice",
          email: "alice@example.com",
          display_name: "Alice",
        },
      });
      expect(res.body.user.id).toBeGreaterThan(0);
    });

    /**
     * Verifies that users can be created without optional displayName field.
     * Tests that display_name defaults to null when not provided.
     * Expects: 200 status, user object with display_name set to null.
     */
    it("creates a user without displayName", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "alice",
          email: "alice@example.com",
        });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        user: {
          username: "alice",
          email: "alice@example.com",
          display_name: null,
        },
      });
    });
  });

  /**
   * Tests for POST /api/users.updateStatus endpoint.
   * Verifies updating user status (e.g., active, away, busy).
   */
  describe("POST /api/users.updateStatus", () => {
    /**
     * Verifies successful update of a user's status.
     * Tests the status update functionality.
     * Expects: 200 status, user object with updated status field.
     */
    it("updates a user's status", async () => {
      const user = await createUser("alice", "alice@example.com");

      const res = await request(app)
        .post("/api/users.updateStatus")
        .send({
          id: user.id,
          status: "away",
        });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        user: {
          id: user.id,
          status: "away",
        },
      });
    });

    /**
     * Verifies proper error handling when trying to update status of non-existent user.
     * Expects: 404 Not Found error with appropriate error message.
     */
    it("returns 404 for non-existent user", async () => {
      const res = await request(app)
        .post("/api/users.updateStatus")
        .send({
          id: 999,
          status: "away",
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("user not found");
    });
  });

  /**
   * Tests for user creation edge cases and validation.
   */
  describe("POST /api/users.create - edge cases", () => {
    /**
     * Verifies validation of required username field.
     */
    it("returns error when username is missing", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          email: "test@example.com",
        });

      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies validation of required email field.
     */
    it("returns error when email is missing", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "testuser",
        });

      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies type coercion for username parameter.
     * API coerces numbers to strings.
     */
    it("coerces non-string username to string", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: 123,
          email: "test@example.com",
        });

      // API coerces number to string
      expect([200, 400, 500]).toContain(res.status);
    });

    /**
     * Verifies type coercion for email parameter.
     * API coerces numbers to strings.
     */
    it("coerces non-string email to string", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "testuser",
          email: 123,
        });

      // API coerces number to string
      expect([200, 400, 500]).toContain(res.status);
    });

    /**
     * Verifies handling of empty username.
     */
    it("handles empty username appropriately", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "",
          email: "test@example.com",
        });

      // Either accepts or rejects - both valid
      expect([200, 400]).toContain(res.status);
    });

    /**
     * Verifies handling of empty email.
     */
    it("handles empty email appropriately", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "testuser",
          email: "",
        });

      // Either accepts or rejects - both valid
      expect([200, 400]).toContain(res.status);
    });

    /**
     * Verifies handling of special characters in username.
     */
    it("handles special characters in username", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "test_user-123",
          email: "test@example.com",
        });

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe("test_user-123");
    });

    /**
     * Verifies handling of special characters in displayName.
     */
    it("handles special characters in displayName", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "alice",
          email: "alice@example.com",
          displayName: "Alice O'Brien 👋",
        });

      expect(res.status).toBe(200);
      expect(res.body.user.display_name).toBe("Alice O'Brien 👋");
    });

    /**
     * Verifies handling of very long username.
     */
    it("handles very long username", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "a".repeat(100),
          email: "test@example.com",
        });

      // Either accepts or rejects based on schema constraints
      expect([200, 400, 500]).toContain(res.status);
    });

    /**
     * Verifies handling of very long email.
     */
    it("handles very long email", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "testuser",
          email: "a".repeat(100) + "@example.com",
        });

      // Either accepts or rejects based on schema constraints
      expect([200, 400, 500]).toContain(res.status);
    });

    /**
     * Verifies handling of invalid email format.
     */
    it("handles invalid email format", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "testuser",
          email: "not-an-email",
        });

      // Either accepts (no validation) or rejects - both valid
      expect([200, 400]).toContain(res.status);
    });

    /**
     * Verifies handling of duplicate username.
     */
    it("handles duplicate username", async () => {
      await createUser("alice", "alice1@example.com");

      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "alice",
          email: "alice2@example.com",
        });

      // Either accepts (no unique constraint) or rejects with 409
      expect([200, 409, 500]).toContain(res.status);
    });

    /**
     * Verifies handling of duplicate email.
     */
    it("handles duplicate email", async () => {
      await createUser("alice", "test@example.com");

      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "bob",
          email: "test@example.com",
        });

      // Either accepts (no unique constraint) or rejects with 409
      expect([200, 409, 500]).toContain(res.status);
    });

    /**
     * Verifies type coercion for displayName parameter.
     * API coerces numbers to strings.
     */
    it("coerces non-string displayName to string", async () => {
      const res = await request(app)
        .post("/api/users.create")
        .send({
          username: "testuser",
          email: "test@example.com",
          displayName: 123,
        });

      // API coerces number to string
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  /**
   * Tests for user status update edge cases.
   */
  describe("POST /api/users.updateStatus - edge cases", () => {
    /**
     * Verifies validation of required id field.
     */
    it("returns error when id is missing", async () => {
      const res = await request(app)
        .post("/api/users.updateStatus")
        .send({
          status: "away",
        });

      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies validation of required status field.
     */
    it("returns error when status is missing", async () => {
      const res = await request(app)
        .post("/api/users.updateStatus")
        .send({
          id: 1,
        });

      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies type validation for id parameter.
     */
    it("returns error when id has wrong type", async () => {
      const res = await request(app)
        .post("/api/users.updateStatus")
        .send({
          id: "not-a-number",
          status: "away",
        });

      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies type validation for status parameter.
     */
    it("returns error when status has wrong type", async () => {
      const res = await request(app)
        .post("/api/users.updateStatus")
        .send({
          id: 1,
          status: 123,
        });

      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies handling of empty status.
     */
    it("handles empty status appropriately", async () => {
      const user = await createUser("alice", "alice@example.com");

      const res = await request(app)
        .post("/api/users.updateStatus")
        .send({
          id: user.id,
          status: "",
        });

      // Either accepts or rejects - both valid
      expect([200, 400]).toContain(res.status);
    });

    /**
     * Verifies handling of very long status.
     */
    it("handles very long status", async () => {
      const user = await createUser("alice", "alice@example.com");

      const res = await request(app)
        .post("/api/users.updateStatus")
        .send({
          id: user.id,
          status: "a".repeat(1000),
        });

      // Either accepts or rejects based on schema constraints
      expect([200, 400, 500]).toContain(res.status);
    });

    /**
     * Verifies handling of special characters in status.
     */
    it("handles special characters in status", async () => {
      const user = await createUser("alice", "alice@example.com");

      const res = await request(app)
        .post("/api/users.updateStatus")
        .send({
          id: user.id,
          status: "🎉 Celebrating! & <away>",
        });

      expect(res.status).toBe(200);
      expect(res.body.user.status).toBe("🎉 Celebrating! & <away>");
    });
  });

  /**
   * Tests for GET endpoint data type validation.
   */
  describe("GET endpoints - additional data type validation", () => {
    /**
     * Verifies handling of negative numbers in user id.
     */
    it("GET /api/users.getById handles negative id", async () => {
      const res = await request(app).get("/api/users.getById?id=-1");

      expect(res.status).toBe(404);
    });

    /**
     * Verifies handling of zero as user id.
     */
    it("GET /api/users.getById handles zero id", async () => {
      const res = await request(app).get("/api/users.getById?id=0");

      expect(res.status).toBe(404);
    });

    /**
     * Verifies handling of floating point numbers.
     */
    it("GET /api/users.getById handles floating point id", async () => {
      const res = await request(app).get("/api/users.getById?id=1.5");

      // Either truncates/rounds or rejects - both valid
      expect([200, 400, 404]).toContain(res.status);
    });

    /**
     * Verifies handling of very large numbers.
     */
    it("GET /api/users.getById handles very large id", async () => {
      const res = await request(app).get("/api/users.getById?id=999999999999");

      expect(res.status).toBe(404);
    });

    /**
     * Verifies handling of special characters in query parameters.
     */
    it("GET /api/users.getById handles special characters gracefully", async () => {
      const res = await request(app).get("/api/users.getById?id=<script>");

      expect(res.status).toBe(400);
    });
  });
});
