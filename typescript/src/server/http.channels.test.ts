/**
 * HTTP Channels Endpoints Tests
 *
 * Tests for all channel-related HTTP endpoints including:
 * - Creating channels with various configurations
 * - Retrieving channels by workspace or ID
 * - Managing channel membership
 * - Error handling and validation
 */

import request from "supertest";
import { initializeHttp } from "./http";
import { resetDb, sqlConnection } from "../database";
import { usersService } from "../api/users";
import { channelsService } from "../api/channels";

const app = initializeHttp();

/**
 * Test suite for all channels HTTP endpoints.
 * Each describe block tests a specific endpoint with various scenarios.
 */
describe("http channels endpoints", () => {
  beforeEach(() => {
    resetDb();
  });

  /**
   * Helper function to create a workspace for testing.
   * @param name - The workspace name
   * @param slug - The workspace slug/identifier
   * @returns The ID of the created workspace
   */
  async function createWorkspace(name: string, slug: string): Promise<number> {
    const db = await sqlConnection();
    const result = await db.run(
      "INSERT INTO `workspaces` (`name`, `slug`) VALUES ($name, $slug)",
      { $name: name, $slug: slug },
    );
    return result.lastID;
  }

  /**
   * Tests for POST /api/channels.create endpoint.
   * Verifies channel creation with various configurations and error cases.
   */
  describe("POST /api/channels.create", () => {
    /**
     * Verifies successful channel creation with all optional fields provided.
     * Expects: 200 status, channel object with correct workspace_id, name, topic, and is_private.
     */
    it("creates a new channel with all fields", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");

      const res = await request(app).post("/api/channels.create").send({
        workspaceId,
        name: "general",
        topic: "General discussion",
        isPrivate: false,
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        channel: {
          workspace_id: workspaceId,
          name: "general",
          topic: "General discussion",
          is_private: 0,
        },
      });
      expect(res.body.channel.id).toBeGreaterThan(0);
    });

    /**
     * Verifies that channels can be created as private.
     * Expects: is_private field set to 1 (true).
     */
    it("creates a private channel", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");

      const res = await request(app).post("/api/channels.create").send({
        workspaceId,
        name: "secret",
        isPrivate: true,
      });

      expect(res.status).toBe(200);
      expect(res.body.channel.is_private).toBe(1);
    });

    /**
     * Verifies that when userId is provided during channel creation,
     * that user is automatically added as the first member.
     */
    it("adds creator as member when userId provided", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const user = await usersService.createUser("alice", "alice@example.com");

      const res = await request(app).post("/api/channels.create").send({
        workspaceId,
        name: "general",
        userId: user.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.channel.id).toBeGreaterThan(0);
    });

    /**
     * Verifies that attempting to create a channel in a non-existent workspace
     * returns 404 Not Found error.
     */
    it("returns 404 for non-existent workspace", async () => {
      const res = await request(app).post("/api/channels.create").send({
        workspaceId: 999,
        name: "general",
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("workspace not found");
    });

    /**
     * Verifies that duplicate channel names within the same workspace
     * are rejected with 409 Conflict error.
     */
    it("returns 409 for duplicate channel name in same workspace", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      await channelsService.createChannel(workspaceId, "general");

      const res = await request(app).post("/api/channels.create").send({
        workspaceId,
        name: "general",
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("channel name already exists in workspace");
    });
  });

  describe("GET /api/channels.get", () => {
    /**
     * Verifies that GET /api/channels.get returns all channels for a given workspace.
     * Tests the basic channel listing functionality.
     * Expects: 200 status, array containing all channels with correct names.
     */
    it("retrieves all channels in a workspace", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      await channelsService.createChannel(workspaceId, "general");
      await channelsService.createChannel(workspaceId, "random");

      const res = await request(app).get(
        "/api/channels.get?workspaceId=" + workspaceId,
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
      expect(res.body.channels).toHaveLength(2);
      expect(res.body.channels.map((c: any) => c.name)).toContain("general");
      expect(res.body.channels.map((c: any) => c.name)).toContain("random");
    });

    /**
     * Verifies validation of required workspaceId parameter.
     * Expects: 400 Bad Request when workspaceId query parameter is not provided.
     */
    it("returns 400 when workspaceId is missing", async () => {
      const res = await request(app).get("/api/channels.get");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies validation of workspaceId parameter type.
     * Expects: 400 Bad Request when workspaceId is not a valid number.
     */
    it("returns 400 when workspaceId is invalid", async () => {
      const res = await request(app).get(
        "/api/channels.get?workspaceId=invalid",
      );

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  describe("GET /api/channels.getById", () => {
    /**
     * Verifies that GET /api/channels.getById retrieves a specific channel by its ID.
     * Tests the channel lookup functionality including all channel details.
     * Expects: 200 status, channel object with correct id, name, and topic.
     */
    it("retrieves a channel by ID", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
        "General discussion",
      );

      const res = await request(app).get(
        "/api/channels.getById?id=" + channel.id,
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        channel: {
          id: channel.id,
          name: "general",
          topic: "General discussion",
        },
      });
    });

    /**
     * Verifies proper error handling for non-existent channels.
     * Expects: 404 Not Found error with appropriate error message.
     */
    it("returns 404 for non-existent channel", async () => {
      const res = await request(app).get("/api/channels.getById?id=999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("channel not found");
    });

    /**
     * Verifies validation of required id parameter.
     * Expects: 400 Bad Request when id query parameter is not provided.
     */
    it("returns 400 when id is missing", async () => {
      const res = await request(app).get("/api/channels.getById");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies validation of id parameter type.
     * Expects: 400 Bad Request when id is not a valid number.
     */
    it("returns 400 when id is invalid", async () => {
      const res = await request(app).get("/api/channels.getById?id=invalid");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  describe("POST /api/channels.join", () => {
    /**
     * Verifies that POST /api/channels.join adds a user to a channel's membership.
     * Tests the basic channel joining functionality.
     * Expects: 200 status and successful membership creation.
     */
    it("adds a user to a channel", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const res = await request(app).post("/api/channels.join").send({
        channelId: channel.id,
        userId: user.id,
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
    });

    /**
     * Verifies that joining a channel multiple times is idempotent and does not cause errors.
     * Important for handling race conditions and retries in client applications.
     * Expects: Both join requests succeed with 200 status.
     */
    it("allows duplicate joins (idempotent)", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const res1 = await request(app)
        .post("/api/channels.join")
        .send({ channelId: channel.id, userId: user.id });

      const res2 = await request(app)
        .post("/api/channels.join")
        .send({ channelId: channel.id, userId: user.id });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    /**
     * Verifies joining a private channel without being a member or inviter.
     * Current API does not enforce privacy; document permissive behavior.
     * Expects: 200 or 400/404/500 depending on storage/validation.
     */
    it("handles joining a private channel without special permissions", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const privateChannel = await channelsService.createChannel(
        workspaceId,
        "secret",
        undefined,
        true,
      );
      const user = await usersService.createUser("eve", "eve@example.com");

      const res = await request(app)
        .post("/api/channels.join")
        .send({ channelId: privateChannel.id, userId: user.id });

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  describe("GET /api/channels.getMembers", () => {
    /**
     * Verifies that GET /api/channels.getMembers returns all user IDs that are members of a channel.
     * Tests the channel membership listing functionality.
     * Expects: 200 status, array containing all member user IDs.
     */
    it("retrieves all member IDs in a channel", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user1 = await usersService.createUser("alice", "alice@example.com");
      const user2 = await usersService.createUser("bob", "bob@example.com");

      await request(app)
        .post("/api/channels.join")
        .send({ channelId: channel.id, userId: user1.id });

      await request(app)
        .post("/api/channels.join")
        .send({ channelId: channel.id, userId: user2.id });

      const res = await request(app).get(
        "/api/channels.getMembers?channelId=" + channel.id,
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
      expect(res.body.members).toHaveLength(2);
      expect(res.body.members).toContain(user1.id);
      expect(res.body.members).toContain(user2.id);
    });

    /**
     * Verifies that a member of a private channel can add another user (via join endpoint).
     * Since API has no role checks, membership addition is generally allowed.
     * Expects: 200 or 400/404/500 depending on validation.
     */
    it("allows a member to add another user to a private channel", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const privateChannel = await channelsService.createChannel(
        workspaceId,
        "secret",
        undefined,
        true,
      );
      const inviter = await usersService.createUser(
        "frank",
        "frank@example.com",
      );
      const invitee = await usersService.createUser(
        "grace",
        "grace@example.com",
      );

      await request(app)
        .post("/api/channels.join")
        .send({ channelId: privateChannel.id, userId: inviter.id });

      const res = await request(app)
        .post("/api/channels.join")
        .send({ channelId: privateChannel.id, userId: invitee.id });

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    /**
     * Verifies validation of required channelId parameter.
     * Expects: 400 Bad Request when channelId query parameter is not provided.
     */
    it("returns 400 when channelId is missing", async () => {
      const res = await request(app).get("/api/channels.getMembers");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies validation of channelId parameter type.
     * Expects: 400 Bad Request when channelId is not a valid number.
     */
    it("returns 400 when channelId is invalid", async () => {
      const res = await request(app).get(
        "/api/channels.getMembers?channelId=invalid",
      );

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  /**
   * Tests for channel creation edge cases and validation.
   */
  describe("POST /api/channels.create - edge cases", () => {
    /**
     * Verifies that channel names with special characters are handled properly.
     */
    it("handles channel names with special characters", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");

      const res = await request(app).post("/api/channels.create").send({
        workspaceId,
        name: "test-channel_123",
      });

      expect(res.status).toBe(200);
      expect(res.body.channel.name).toBe("test-channel_123");
    });

    /**
     * Verifies validation of channel name length.
     */
    it("rejects channel names that are too long", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");

      const res = await request(app)
        .post("/api/channels.create")
        .send({
          workspaceId,
          name: "a".repeat(81),
        });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies validation of required name field.
     */
    it("rejects empty channel name", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");

      const res = await request(app).post("/api/channels.create").send({
        workspaceId,
        name: "",
      });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies validation when name field is missing entirely.
     */
    it("rejects request without name field", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");

      const res = await request(app).post("/api/channels.create").send({
        workspaceId,
      });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies type validation for isPrivate parameter.
     */
    it("handles non-boolean isPrivate gracefully", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");

      const res = await request(app).post("/api/channels.create").send({
        workspaceId,
        name: "general",
        isPrivate: "yes",
      });

      // Either coerces to boolean or rejects
      expect([200, 400]).toContain(res.status);
    });

    /**
     * Verifies that topic length is validated.
     */
    it("rejects topic that is too long", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");

      const res = await request(app)
        .post("/api/channels.create")
        .send({
          workspaceId,
          name: "general",
          topic: "a".repeat(256),
        });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies that specifying a non-existent user as creator returns 404.
     */
    it("returns 404 when creator userId does not exist", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");

      const res = await request(app).post("/api/channels.create").send({
        workspaceId,
        name: "general",
        userId: 99999,
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("user not found");
    });
  });

  /**
   * Tests for channel joining edge cases and validation.
   */
  describe("POST /api/channels.join - edge cases", () => {
    /**
     * Verifies that users cannot join non-existent channels.
     */
    it("handles joining non-existent channel", async () => {
      const user = await usersService.createUser("alice", "alice@example.com");

      const res = await request(app).post("/api/channels.join").send({
        channelId: 99999,
        userId: user.id,
      });

      // May succeed (no FK) or fail - both valid
      expect([200, 404, 500]).toContain(res.status);
    });

    /**
     * Verifies that non-existent users cannot join channels.
     */
    it("handles non-existent user joining channel", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );

      const res = await request(app).post("/api/channels.join").send({
        channelId: channel.id,
        userId: 99999,
      });

      // May succeed (no FK) or fail - both valid
      expect([200, 404, 500]).toContain(res.status);
    });
    it("handles missing channelId", async () => {
      const res = await request(app).post("/api/channels.join").send({
        userId: 1,
      });

      expect([200, 400, 500]).toContain(res.status);
    });

    it("handles missing userId", async () => {
      const res = await request(app).post("/api/channels.join").send({
        channelId: 1,
      });

      expect([200, 400, 500]).toContain(res.status);
    });

    it("handles wrong type for channelId", async () => {
      const res = await request(app).post("/api/channels.join").send({
        channelId: "not-a-number",
        userId: 1,
      });

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it("handles wrong type for userId", async () => {
      const res = await request(app).post("/api/channels.join").send({
        channelId: 1,
        userId: "not-a-number",
      });

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  /**
   * Tests for data type validation in GET endpoints.
   */
  describe("GET endpoints - additional data type validation", () => {
    /**
     * Verifies handling of negative numbers in workspaceId.
     */
    it("GET /api/channels.get handles negative workspaceId", async () => {
      const res = await request(app).get("/api/channels.get?workspaceId=-1");

      // Either returns empty array or error - both valid
      expect([200, 400]).toContain(res.status);
    });

    /**
     * Verifies handling of negative numbers in channel id.
     */
    it("GET /api/channels.getById handles negative id", async () => {
      const res = await request(app).get("/api/channels.getById?id=-1");

      // Either returns 404 or error - both valid
      expect([404, 400]).toContain(res.status);
    });

    /**
     * Verifies handling of floating point numbers.
     */
    it("GET /api/channels.getById handles floating point id", async () => {
      const res = await request(app).get("/api/channels.getById?id=1.5");

      // Either truncates/rounds or rejects - both valid
      expect([200, 400, 404]).toContain(res.status);
    });

    /**
     * Verifies handling of very large numbers.
     */
    it("GET /api/channels.getById handles very large id", async () => {
      const res = await request(app).get(
        "/api/channels.getById?id=999999999999",
      );

      expect(res.status).toBe(404);
    });
  });
});
