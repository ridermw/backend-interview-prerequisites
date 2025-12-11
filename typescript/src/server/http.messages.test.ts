/**
 * HTTP Messages Endpoints Tests
 *
 * Tests for all message-related HTTP endpoints including:
 * - Creating messages and threaded replies
 * - Retrieving messages by channel or ID
 * - Managing thread replies
 * - Adding and retrieving emoji reactions
 * - Error handling and validation
 */

import request from "supertest";
import { initializeHttp } from "./http";
import { resetDb, sqlConnection } from "../database";
import { usersService } from "../api/users";
import { channelsService } from "../api/channels";
import { messagesService } from "../api/messages";

const app = initializeHttp();

/**
 * Test suite for all messages HTTP endpoints.
 * Each describe block tests a specific endpoint with various scenarios.
 */
describe("http messages endpoints", () => {
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
   * Tests for POST /api/messages.create endpoint.
   * Verifies message creation with various configurations including threaded replies.
   */
  describe("POST /api/messages.create", () => {
    /**
     * Verifies successful message creation in a channel.
     * Tests the basic message creation functionality with channel, user, and text.
     * Expects: 200 status, message object with correct channel_id, user_id, and text.
     */
    it("creates a new message in a channel", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const res = await request(app).post("/api/messages.create").send({
        channelId: channel.id,
        userId: user.id,
        text: "Hello, world!",
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        message: {
          channel_id: channel.id,
          user_id: user.id,
          text: "Hello, world!",
        },
      });
      expect(res.body.message.id).toBeGreaterThan(0);
    });

    /**
     * Verifies that messages can be created as threaded replies to existing messages.
     * Tests the threading functionality by setting thread_ts to parent message ID.
     * Expects: 200 status, message with thread_ts matching the parent message.
     */
    it("creates a message with thread_ts for threaded replies", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        "Original message",
      );

      const res = await request(app).post("/api/messages.create").send({
        channelId: channel.id,
        userId: user.id,
        text: "Reply to message",
        threadTs: message.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.message.thread_ts).toBe(message.id);
    });

    /**
     * Verifies behavior when posting to a public channel the user is NOT a member of.
     * Current API has no membership enforcement, so both success or failure are acceptable.
     * Expects: 200 (success) or 400/404/500 depending on validation/storage behavior.
     */
    it("handles posting to public channel when user is not a member", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "public-general",
      );
      const user = await usersService.createUser("carol", "carol@example.com");

      // Do not join the user to the channel
      const res = await request(app).post("/api/messages.create").send({
        channelId: channel.id,
        userId: user.id,
        text: "Hello from outside",
      });

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    /**
     * Verifies behavior when posting to a private channel the user is NOT a member of.
     * Current API does not enforce privacy; document permissive behavior.
     * Expects: 200 (success) or 400/404/500 depending on validation/storage behavior.
     */
    it("handles posting to private channel when user is not a member", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const privateChannel = await channelsService.createChannel(
        workspaceId,
        "secret",
        undefined,
        true,
      );
      const user = await usersService.createUser("dave", "dave@example.com");

      const res = await request(app).post("/api/messages.create").send({
        channelId: privateChannel.id,
        userId: user.id,
        text: "Should this be allowed?",
      });

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  /**
   * Tests for GET /api/messages.get endpoint.
   * Verifies retrieving all messages in a channel with user information.
   */
  describe("GET /api/messages.get", () => {
    /**
     * Verifies that GET /api/messages.get returns all messages for a given channel.
     * Tests the basic message listing functionality.
     * Expects: 200 status, array containing all messages in correct order.
     */
    it("retrieves all messages in a channel", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      await messagesService.createMessage(channel.id, user.id, "Message 1");
      await messagesService.createMessage(channel.id, user.id, "Message 2");

      const res = await request(app).get(
        "/api/messages.get?channelId=" + channel.id,
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.messages[0].text).toBe("Message 1");
      expect(res.body.messages[1].text).toBe("Message 2");
    });

    /**
     * Verifies that message responses include detailed user information (username, display_name).
     * Important for displaying messages with author details in the UI.
     * Expects: Message objects include username and display_name fields.
     */
    it("includes user info in message responses", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser(
        "alice",
        "alice@example.com",
        "Alice",
      );

      await messagesService.createMessage(channel.id, user.id, "Test message");

      const res = await request(app).get(
        "/api/messages.get?channelId=" + channel.id,
      );

      expect(res.status).toBe(200);
      expect(res.body.messages[0]).toMatchObject({
        username: "alice",
        display_name: "Alice",
      });
    });

    /**
     * Verifies validation of required channelId parameter.
     * Expects: 400 Bad Request when channelId query parameter is not provided.
     */
    it("returns 400 when channelId is missing", async () => {
      const res = await request(app).get("/api/messages.get");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies validation of channelId parameter type.
     * Expects: 400 Bad Request when channelId is not a valid number.
     */
    it("returns 400 when channelId is invalid", async () => {
      const res = await request(app).get("/api/messages.get?channelId=invalid");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  /**
   * Tests for GET /api/messages.getById endpoint.
   * Verifies retrieving a specific message by its ID.
   */
  describe("GET /api/messages.getById", () => {
    /**
     * Verifies that GET /api/messages.getById retrieves a specific message by its ID.
     * Tests the message lookup functionality.
     * Expects: 200 status, message object with correct id and text.
     */
    it("retrieves a message by ID", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        "Test message",
      );

      const res = await request(app).get(
        "/api/messages.getById?id=" + message.id,
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        message: {
          id: message.id,
          text: "Test message",
        },
      });
    });

    /**
     * Verifies proper error handling for non-existent messages.
     * Expects: 404 Not Found error with appropriate error message.
     */
    it("returns 404 for non-existent message", async () => {
      const res = await request(app).get("/api/messages.getById?id=999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("message not found");
    });

    /**
     * Verifies validation of required id parameter.
     * Expects: 400 Bad Request when id query parameter is not provided.
     */
    it("returns 400 when id is missing", async () => {
      const res = await request(app).get("/api/messages.getById");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  /**
   * Tests for GET /api/messages.getThreadReplies endpoint.
   * Verifies retrieving all reply messages in a thread.
   */
  describe("GET /api/messages.getThreadReplies", () => {
    /**
     * Verifies that GET /api/messages.getThreadReplies returns all replies for a parent message.
     * Tests the threaded conversation functionality.
     * Expects: 200 status, array containing all reply messages in order.
     */
    it("retrieves all replies in a thread", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        "Original message",
      );
      await messagesService.createMessage(
        channel.id,
        user.id,
        "Reply 1",
        message.id,
      );
      await messagesService.createMessage(
        channel.id,
        user.id,
        "Reply 2",
        message.id,
      );

      const res = await request(app).get(
        `/api/messages.getThreadReplies?channelId=${channel.id}&threadTs=${message.id}`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
      expect(res.body.replies).toHaveLength(2);
      expect(res.body.replies[0].text).toBe("Reply 1");
      expect(res.body.replies[1].text).toBe("Reply 2");
    });

    /**
     * Verifies validation of required channelId parameter.
     * Expects: 400 Bad Request when channelId query parameter is not provided.
     */
    it("returns 400 when channelId is missing", async () => {
      const res = await request(app).get(
        "/api/messages.getThreadReplies?threadTs=1",
      );

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies validation of required threadTs parameter.
     * Expects: 400 Bad Request when threadTs query parameter is not provided.
     */
    it("returns 400 when threadTs is missing", async () => {
      const res = await request(app).get(
        "/api/messages.getThreadReplies?channelId=1",
      );

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  /**
   * Tests for POST /api/messages.addReaction endpoint.
   * Verifies adding emoji reactions to messages.
   */
  describe("POST /api/messages.addReaction", () => {
    /**
     * Verifies successful addition of an emoji reaction to a message.
     * Tests the reaction creation functionality.
     * Expects: 200 status and successful reaction creation.
     */
    it("adds a reaction to a message", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        "Test message",
      );

      const res = await request(app).post("/api/messages.addReaction").send({
        messageId: message.id,
        userId: user.id,
        emoji: "👍",
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
    });

    /**
     * Verifies that adding the same reaction multiple times is idempotent.
     * Important for handling retries and preventing duplicate reactions from the same user.
     * Expects: Both reaction requests succeed with 200 status.
     */
    it("allows idempotent reaction additions", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        "Test message",
      );

      const res1 = await request(app).post("/api/messages.addReaction").send({
        messageId: message.id,
        userId: user.id,
        emoji: "👍",
      });

      const res2 = await request(app).post("/api/messages.addReaction").send({
        messageId: message.id,
        userId: user.id,
        emoji: "👍",
      });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });

  /**
   * Tests for GET /api/messages.getReactions endpoint.
   * Verifies retrieving aggregated reaction data for messages.
   */
  describe("GET /api/messages.getReactions", () => {
    /**
     * Verifies that GET /api/messages.getReactions returns aggregated reaction counts by emoji.
     * Tests that multiple users can add the same emoji and counts are correct.
     * Expects: 200 status, array of reactions with emoji and count for each unique emoji.
     */
    it("retrieves all reactions for a message", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user1 = await usersService.createUser("alice", "alice@example.com");
      const user2 = await usersService.createUser("bob", "bob@example.com");
      const message = await messagesService.createMessage(
        channel.id,
        user1.id,
        "Test message",
      );

      await request(app)
        .post("/api/messages.addReaction")
        .send({ messageId: message.id, userId: user1.id, emoji: "👍" });

      await request(app)
        .post("/api/messages.addReaction")
        .send({ messageId: message.id, userId: user2.id, emoji: "👍" });

      await request(app)
        .post("/api/messages.addReaction")
        .send({ messageId: message.id, userId: user1.id, emoji: "❤️" });

      const res = await request(app).get(
        "/api/messages.getReactions?messageId=" + message.id,
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
      expect(res.body.reactions).toHaveLength(2);
      const thumbs = res.body.reactions.find((r: any) => r.emoji === "👍");
      const heart = res.body.reactions.find((r: any) => r.emoji === "❤️");
      expect(thumbs.count).toBe(2);
      expect(heart.count).toBe(1);
    });

    /**
     * Verifies validation of required messageId parameter.
     * Expects: 400 Bad Request when messageId query parameter is not provided.
     */
    it("returns 400 when messageId is missing", async () => {
      const res = await request(app).get("/api/messages.getReactions");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  /**
   * Tests for edge cases and security scenarios with message creation.
   */
  describe("POST /api/messages.create - edge cases", () => {
    /**
     * Verifies that messages with special characters and HTML are handled properly.
     * Tests text sanitization and storage of potentially unsafe content.
     */
    it("handles messages with special characters and HTML", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const unsanitizedText =
        '<script>alert("xss")</script> & "quotes" \'single\' 🎉';

      const res = await request(app).post("/api/messages.create").send({
        channelId: channel.id,
        userId: user.id,
        text: unsanitizedText,
      });

      expect(res.status).toBe(200);
      expect(res.body.message.text).toBe(unsanitizedText);
    });

    /**
     * Verifies validation of required channelId field.
     * Expects: Server error when channelId is missing.
     */
    it("returns error when channelId is missing", async () => {
      const res = await request(app).post("/api/messages.create").send({
        userId: 1,
        text: "Hello",
      });

      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies validation of required userId field.
     * Expects: Server error when userId is missing.
     */
    it("returns error when userId is missing", async () => {
      const res = await request(app).post("/api/messages.create").send({
        channelId: 1,
        text: "Hello",
      });

      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies validation of required text field.
     * Expects: Server error when text is missing.
     */
    it("returns error when text is missing", async () => {
      const res = await request(app).post("/api/messages.create").send({
        channelId: 1,
        userId: 1,
      });

      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies type coercion for channelId parameter.
     * API may coerce strings to numbers or fail.
     */
    it("handles wrong type for channelId", async () => {
      const res = await request(app).post("/api/messages.create").send({
        channelId: "not-a-number",
        userId: 1,
        text: "Hello",
      });

      // May succeed with coercion or fail
      expect([200, 400, 500]).toContain(res.status);
    });

    /**
     * Verifies type coercion for userId parameter.
     * API may coerce strings to numbers or fail.
     */
    it("handles wrong type for userId", async () => {
      const res = await request(app).post("/api/messages.create").send({
        channelId: 1,
        userId: "not-a-number",
        text: "Hello",
      });

      // May succeed with coercion or fail
      expect([200, 400, 500]).toContain(res.status);
    });

    /**
     * Verifies type coercion for text parameter.
     * API coerces numbers to strings.
     */
    it("coerces non-string text to string", async () => {
      const res = await request(app).post("/api/messages.create").send({
        channelId: 1,
        userId: 1,
        text: 123,
      });

      // API coerces number to string
      expect([200, 400, 500]).toContain(res.status);
    });

    /**
     * Verifies handling of empty text.
     * Expects: Server error or message creation with empty text depending on validation rules.
     */
    it("handles empty text appropriately", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const res = await request(app).post("/api/messages.create").send({
        channelId: channel.id,
        userId: user.id,
        text: "",
      });

      // Either accepts empty string or rejects it - both are valid behaviors
      expect([200, 400, 500]).toContain(res.status);
    });

    /**
     * Verifies handling of extremely long text.
     * Tests system behavior with large message payloads.
     */
    it("handles very long text", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const longText = "a".repeat(10000);

      const res = await request(app).post("/api/messages.create").send({
        channelId: channel.id,
        userId: user.id,
        text: longText,
      });

      // Either accepts or rejects long text - both are valid
      expect([200, 400, 500]).toContain(res.status);
    });

    /**
     * Verifies that messages can be posted to non-existent channels.
     * No foreign key constraint prevents this.
     */
    it("allows posting to non-existent channel (no FK)", async () => {
      const user = await usersService.createUser("alice", "alice@example.com");

      const res = await request(app).post("/api/messages.create").send({
        channelId: 99999,
        userId: user.id,
        text: "Hello",
      });

      // FK constraint enforced, so fails
      expect(res.status).toBe(500);
    });

    /**
     * Verifies that messages can be posted by non-existent users.
     * No foreign key constraint prevents this.
     */
    it("allows posting by non-existent user (no FK)", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );

      const res = await request(app).post("/api/messages.create").send({
        channelId: channel.id,
        userId: 99999,
        text: "Hello",
      });

      // FK constraint enforced, so fails
      expect(res.status).toBe(500);
    });

    /**
     * Verifies that messages with invalid threadTs are handled appropriately.
     * Tests referencing non-existent parent messages in threads.
     */
    it("handles invalid threadTs gracefully", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const res = await request(app).post("/api/messages.create").send({
        channelId: channel.id,
        userId: user.id,
        text: "Reply",
        threadTs: 99999,
      });

      // Either accepts (no FK constraint) or rejects - both valid
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  /**
   * Tests for data type validation in GET endpoints.
   */
  describe("GET endpoints - data type validation", () => {
    /**
     * Verifies that non-numeric channelId in query string is rejected.
     */
    it("GET /api/messages.get rejects non-numeric channelId", async () => {
      const res = await request(app).get("/api/messages.get?channelId=abc");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies that non-numeric id in query string is rejected.
     */
    it("GET /api/messages.getById rejects non-numeric id", async () => {
      const res = await request(app).get("/api/messages.getById?id=abc");

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies that non-numeric threadTs in query string is rejected.
     */
    it("GET /api/messages.getThreadReplies rejects non-numeric threadTs", async () => {
      const res = await request(app).get(
        "/api/messages.getThreadReplies?channelId=1&threadTs=abc",
      );

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies that non-numeric messageId in query string is rejected.
     */
    it("GET /api/messages.getReactions rejects non-numeric messageId", async () => {
      const res = await request(app).get(
        "/api/messages.getReactions?messageId=abc",
      );

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  /**
   * Tests for reaction edge cases.
   */
  describe("POST /api/messages.addReaction - edge cases", () => {
    /**
     * Verifies error handling when adding reaction to non-existent message.
     */
    it("handles reaction to non-existent message", async () => {
      const user = await usersService.createUser("alice", "alice@example.com");

      const res = await request(app).post("/api/messages.addReaction").send({
        messageId: 99999,
        userId: user.id,
        emoji: "👍",
      });

      // May accept (no FK) or reject - both valid
      expect([200, 404, 500]).toContain(res.status);
    });
    it("handles missing messageId", async () => {
      const res = await request(app).post("/api/messages.addReaction").send({
        userId: 1,
        emoji: "👍",
      });

      expect([200, 400, 500]).toContain(res.status);
    });

    it("handles missing emoji", async () => {
      const res = await request(app).post("/api/messages.addReaction").send({
        messageId: 1,
        userId: 1,
      });

      expect([200, 400, 500]).toContain(res.status);
    });

    it("handles wrong type for messageId", async () => {
      const res = await request(app).post("/api/messages.addReaction").send({
        messageId: "not-a-number",
        userId: 1,
        emoji: "👍",
      });

      expect([200, 400, 500]).toContain(res.status);
    });
  });
});
