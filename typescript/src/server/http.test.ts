/**
 * HTTP Server Integration Tests
 * 
 * These tests verify the HTTP server's integration across all endpoints,
 * testing complete workflows that span multiple API resources.
 * Tests use supertest to make actual HTTP requests to the Express app.
 */

import request from "supertest";
import { initializeHttp } from "./http";
import { resetDb, sqlConnection } from "../database";

const app = initializeHttp();

/**
 * Integration test suite for the HTTP server.
 * Tests cross-cutting concerns and multi-endpoint workflows.
 */
describe("http server - integration tests", () => {
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
   * Test suite for basic hello endpoints.
   * These endpoints are used to verify the server is running and accepting requests.
   */
  describe("hello endpoints", () => {
    /**
     * Verifies that GET /api/hello.get accepts query parameters
     * and returns them in the response.
     */
    it("GET /api/hello.get returns hello with params", async () => {
      const res = await request(app).get("/api/hello.get?name=Alice&age=30");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        msg: "hello",
        params: {
          name: "Alice",
          age: "30",
        },
      });
    });

    /**
     * Verifies that POST /api/hello.post accepts both query parameters
     * and request body, returning both in the response.
     */
    it("POST /api/hello.post returns hello with params and body", async () => {
      const res = await request(app)
        .post("/api/hello.post?name=Alice")
        .send({ message: "test" });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        msg: "hello",
        params: { name: "Alice" },
        body: { message: "test" },
      });
    });
  });

  /**
   * Test suite for complete cross-endpoint workflows.
   * Verifies that all API resources work together correctly in realistic usage scenarios.
   */
  describe("cross-endpoint workflow", () => {
    /**
     * Tests a complete end-to-end workflow simulating real Slack-like usage:
     * 1. Create a workspace
     * 2. Create multiple users
     * 3. Create a channel with initial membership
     * 4. Add additional members to the channel
     * 5. Post messages and threaded replies
     * 6. Add emoji reactions to messages
     * 7. Update user status
     * 
     * This test ensures all endpoints work correctly together and data
     * flows properly through the entire system.
     */
    it("complete workflow: create workspace, users, channel, messages, reactions", async () => {
      // Create workspace
      const workspaceId = await createWorkspace("Integration Test", "integ");

      // Create users via HTTP
      const userRes1 = await request(app)
        .post("/api/users.create")
        .send({ username: "alice", email: "alice@example.com", displayName: "Alice" });
      const user1Id = userRes1.body.user.id;

      const userRes2 = await request(app)
        .post("/api/users.create")
        .send({ username: "bob", email: "bob@example.com", displayName: "Bob" });
      const user2Id = userRes2.body.user.id;

      // Create channel with user 1 as creator via HTTP
      const channelRes = await request(app)
        .post("/api/channels.create")
        .send({
          workspaceId,
          name: "general",
          topic: "General discussion",
          userId: user1Id,
        });
      const channelId = channelRes.body.channel.id;

      // User 2 joins channel via HTTP
      const joinRes = await request(app)
        .post("/api/channels.join")
        .send({ channelId, userId: user2Id });

      expect(joinRes.status).toBe(200);

      // Get channel members via HTTP
      const membersRes = await request(app).get(`/api/channels.getMembers?channelId=${channelId}`);

      expect(membersRes.body.members).toHaveLength(2);
      expect(membersRes.body.members).toContain(user1Id);
      expect(membersRes.body.members).toContain(user2Id);

      // User 1 posts message via HTTP
      const msgRes1 = await request(app)
        .post("/api/messages.create")
        .send({
          channelId,
          userId: user1Id,
          text: "Hello everyone!",
        });
      const messageId = msgRes1.body.message.id;

      // User 2 posts reply via HTTP
      const msgRes2 = await request(app)
        .post("/api/messages.create")
        .send({
          channelId,
          userId: user2Id,
          text: "Hi Alice!",
          threadTs: messageId,
        });

      expect(msgRes2.status).toBe(200);

      // Get messages via HTTP
      const getMessagesRes = await request(app).get(`/api/messages.get?channelId=${channelId}`);

      expect(getMessagesRes.body.messages).toHaveLength(2);

      // Get thread replies via HTTP
      const threadRes = await request(app).get(
        `/api/messages.getThreadReplies?channelId=${channelId}&threadTs=${messageId}`,
      );

      expect(threadRes.body.replies).toHaveLength(1);
      expect(threadRes.body.replies[0].text).toBe("Hi Alice!");

      // Add reactions via HTTP
      const reaction1 = await request(app)
        .post("/api/messages.addReaction")
        .send({ messageId, userId: user1Id, emoji: "👍" });

      const reaction2 = await request(app)
        .post("/api/messages.addReaction")
        .send({ messageId, userId: user2Id, emoji: "👍" });

      const reaction3 = await request(app)
        .post("/api/messages.addReaction")
        .send({ messageId, userId: user1Id, emoji: "❤️" });

      expect(reaction1.status).toBe(200);
      expect(reaction2.status).toBe(200);
      expect(reaction3.status).toBe(200);

      // Get reactions via HTTP
      const reactionsRes = await request(app).get(`/api/messages.getReactions?messageId=${messageId}`);

      expect(reactionsRes.body.reactions).toHaveLength(2);
      const thumbsUp = reactionsRes.body.reactions.find((r: any) => r.emoji === "👍");
      const heart = reactionsRes.body.reactions.find((r: any) => r.emoji === "❤️");
      expect(thumbsUp.count).toBe(2);
      expect(heart.count).toBe(1);

      // Update user status via HTTP
      const statusRes = await request(app)
        .post("/api/users.updateStatus")
        .send({ id: user1Id, status: "away" });

      expect(statusRes.body.user.status).toBe("away");

      // Verify all users via HTTP
      const usersRes = await request(app).get("/api/users.get");

      expect(usersRes.body.users).toHaveLength(2);
    });
  });

  /**
   * Test suite for error handling behavior across all endpoints.
   * Ensures consistent error responses and proper validation.
   */
  describe("error handling across endpoints", () => {
    /**
     * Verifies that endpoints return proper error responses
     * when required fields are missing from the request.
     */
    it("returns error response for invalid requests", async () => {
      // Missing required field in channel creation
      const res = await request(app)
        .post("/api/channels.create")
        .send({
          workspaceId: 999,
          // missing name
        });

      expect(res.body.ok).toBe(false);
    });

    /**
     * Verifies that all GET endpoints consistently validate
     * required query parameters and return 400 when missing.
     */
    it("validates required query parameters consistently", async () => {
      const endpoints = [
        "/api/channels.get",
        "/api/channels.getById",
        "/api/messages.get",
        "/api/messages.getById",
        "/api/messages.getReactions",
      ];

      for (const endpoint of endpoints) {
        const res = await request(app).get(endpoint);
        expect(res.status).toBe(400);
        expect(res.body.ok).toBe(false);
      }
    });
  });
});

