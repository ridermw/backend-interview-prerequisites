import { resetDb, sqlConnection } from "../database";
import { messagesService } from "./messages";
import { usersService } from "./users";
import { channelsService } from "./channels";

describe("messages api", () => {
  beforeEach(() => {
    resetDb();
  });

  async function createWorkspace(name: string, slug: string): Promise<number> {
    const db = await sqlConnection();
    const result = await db.run(
      "INSERT INTO `workspaces` (`name`, `slug`) VALUES ($name, $slug)",
      { $name: name, $slug: slug },
    );
    return result.lastID;
  }

  it("creates a message", async () => {
    const workspaceId = await createWorkspace("Test", "test");
    const channel = await channelsService.createChannel(workspaceId, "general");
    const user = await usersService.createUser("alice", "alice@example.com");

    const message = await messagesService.createMessage(
      channel.id,
      user.id,
      "Hello world!",
    );

    expect(message).toMatchObject({
      channel_id: channel.id,
      user_id: user.id,
      text: "Hello world!",
      thread_ts: null,
    });
  });

  it("treats null threadTs as a top-level message", async () => {
    const workspaceId = await createWorkspace("Test", "test");
    const channel = await channelsService.createChannel(workspaceId, "general");
    const user = await usersService.createUser("alice", "alice@example.com");

    const message = await messagesService.createMessage(
      channel.id,
      user.id,
      "Hello world!",
      null,
    );

    expect(message.thread_ts).toBeNull();
  });

  it("retrieves messages with user info", async () => {
    const workspaceId = await createWorkspace("Test", "test");
    const channel = await channelsService.createChannel(workspaceId, "general");
    const alice = await usersService.createUser(
      "alice",
      "alice@example.com",
      "Alice",
    );
    const bob = await usersService.createUser("bob", "bob@example.com", "Bob");

    await messagesService.createMessage(channel.id, alice.id, "First message");
    await messagesService.createMessage(channel.id, bob.id, "Second message");

    const messages = await messagesService.getMessages(channel.id);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      text: "First message",
      username: "alice",
      display_name: "Alice",
    });
    expect(messages[1]).toMatchObject({
      text: "Second message",
      username: "bob",
      display_name: "Bob",
    });
  });

  it("supports threaded replies", async () => {
    const workspaceId = await createWorkspace("Test", "test");
    const channel = await channelsService.createChannel(workspaceId, "general");
    const user = await usersService.createUser("alice", "alice@example.com");

    const parentMessage = await messagesService.createMessage(
      channel.id,
      user.id,
      "Parent message",
    );
    await messagesService.createMessage(
      channel.id,
      user.id,
      "Reply 1",
      parentMessage.id,
    );
    await messagesService.createMessage(
      channel.id,
      user.id,
      "Reply 2",
      parentMessage.id,
    );

    const replies = await messagesService.getThreadReplies(
      channel.id,
      parentMessage.id,
    );

    expect(replies).toHaveLength(2);
    expect(replies.map((r) => r.text)).toEqual(["Reply 1", "Reply 2"]);
  });

  it("adds reactions to messages", async () => {
    const workspaceId = await createWorkspace("Test", "test");
    const channel = await channelsService.createChannel(workspaceId, "general");
    const alice = await usersService.createUser("alice", "alice@example.com");
    const bob = await usersService.createUser("bob", "bob@example.com");

    const message = await messagesService.createMessage(
      channel.id,
      alice.id,
      "Great idea!",
    );

    await messagesService.addReaction(message.id, alice.id, "thumbsup");
    await messagesService.addReaction(message.id, bob.id, "thumbsup");
    await messagesService.addReaction(message.id, bob.id, "fire");

    const reactions = await messagesService.getReactions(message.id);

    expect(reactions).toEqual([
      { emoji: "fire", count: 1 },
      { emoji: "thumbsup", count: 2 },
    ]);
  });

  it("returns empty array for channel with no messages", async () => {
    const workspaceId = await createWorkspace("Test", "test");
    const channel = await channelsService.createChannel(workspaceId, "general");

    const messages = await messagesService.getMessages(channel.id);
    expect(messages).toEqual([]);
  });

  /**
   * Edge case tests for input validation
   */
  describe("input validation", () => {
    /**
     * Validates that empty or missing text is rejected in createMessage.
     */
    it("rejects empty text in createMessage", async () => {
      const workspaceId = await createWorkspace("Test", "test");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      await expect(
        messagesService.createMessage(channel.id, user.id, ""),
      ).rejects.toThrow("text is required");
      await expect(
        messagesService.createMessage(channel.id, user.id, "   "),
      ).rejects.toThrow("text is required");
      await expect(
        messagesService.createMessage(channel.id, user.id, null as any),
      ).rejects.toThrow("text is required");
      await expect(
        messagesService.createMessage(channel.id, user.id, undefined as any),
      ).rejects.toThrow("text is required");
    });

    /**
     * Validates that text exceeding maximum length is rejected.
     */
    it("rejects text that is too long in createMessage", async () => {
      const workspaceId = await createWorkspace("Test", "test");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const longText = "x".repeat(10001);
      await expect(
        messagesService.createMessage(channel.id, user.id, longText),
      ).rejects.toThrow("text must be 10000 characters or fewer");
    });

    /**
     * Validates that empty or invalid emoji is rejected in addReaction.
     */
    it("rejects invalid emoji in addReaction", async () => {
      const workspaceId = await createWorkspace("Test", "test");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        "test",
      );

      await expect(
        messagesService.addReaction(message.id, user.id, ""),
      ).rejects.toThrow("emoji is required");
      await expect(
        messagesService.addReaction(message.id, user.id, "   "),
      ).rejects.toThrow("emoji is required");
      await expect(
        messagesService.addReaction(message.id, user.id, null as any),
      ).rejects.toThrow("emoji is required");
    });

    /**
     * Validates that emoji exceeding maximum length is rejected.
     */
    it("rejects emoji that is too long in addReaction", async () => {
      const workspaceId = await createWorkspace("Test", "test");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        "test",
      );

      const longEmoji = "x".repeat(33);
      await expect(
        messagesService.addReaction(message.id, user.id, longEmoji),
      ).rejects.toThrow("emoji must be 32 characters or fewer");
    });
  });

  /**
   * Edge case tests for special characters and content
   */
  describe("special content handling", () => {
    /**
     * Verifies that messages with special characters are stored correctly.
     */
    it("handles messages with special characters", async () => {
      const workspaceId = await createWorkspace("Test", "test");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const specialText =
        '<script>alert("xss")</script> & "quotes" \'apostrophes\' 🎉';
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        specialText,
      );

      expect(message.text).toBe(specialText);
    });

    /**
     * Verifies that emojis are stored correctly.
     */
    it("handles emoji reactions with unicode characters", async () => {
      const workspaceId = await createWorkspace("Test", "test");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        "test",
      );

      await messagesService.addReaction(message.id, user.id, "👍");
      await messagesService.addReaction(message.id, user.id, "🎉");
      await messagesService.addReaction(message.id, user.id, "❤️");

      const reactions = await messagesService.getReactions(message.id);

      expect(reactions).toHaveLength(3);
      expect(reactions.map((r) => r.emoji)).toContain("👍");
      expect(reactions.map((r) => r.emoji)).toContain("🎉");
      expect(reactions.map((r) => r.emoji)).toContain("❤️");
    });

    /**
     * Verifies that messages with newlines are stored correctly.
     */
    it("handles multiline messages", async () => {
      const workspaceId = await createWorkspace("Test", "test");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const multilineText = "Line 1\nLine 2\nLine 3";
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        multilineText,
      );

      expect(message.text).toBe(multilineText);
    });

    /**
     * Verifies that very long messages (within limits) are handled.
     */
    it("handles maximum length messages", async () => {
      const workspaceId = await createWorkspace("Test", "test");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const maxText = "x".repeat(10000);
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        maxText,
      );

      expect(message.text).toBe(maxText);
    });

    /**
     * Verifies that text with leading/trailing whitespace is trimmed.
     */
    it("trims whitespace from message text", async () => {
      const workspaceId = await createWorkspace("Test", "test");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");

      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        "  trimmed  ",
      );

      expect(message.text).toBe("trimmed");
    });
  });

  /**
   * Edge case tests for empty results and non-existent data
   */
  describe("empty results handling", () => {
    /**
     * Verifies that getting thread replies for non-existent thread returns empty array.
     */
    it("returns empty array for thread with no replies", async () => {
      const workspaceId = await createWorkspace("Test", "test");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        "parent",
      );

      const replies = await messagesService.getThreadReplies(
        channel.id,
        message.id,
      );

      expect(replies).toEqual([]);
    });

    /**
     * Verifies that getting reactions for message with no reactions returns empty array.
     */
    it("returns empty array for message with no reactions", async () => {
      const workspaceId = await createWorkspace("Test", "test");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        "test",
      );

      const reactions = await messagesService.getReactions(message.id);

      expect(reactions).toEqual([]);
    });

    /**
     * Verifies that duplicate reactions are handled idempotently.
     */
    it("handles duplicate reactions idempotently", async () => {
      const workspaceId = await createWorkspace("Test", "test");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const user = await usersService.createUser("alice", "alice@example.com");
      const message = await messagesService.createMessage(
        channel.id,
        user.id,
        "test",
      );

      await messagesService.addReaction(message.id, user.id, "👍");
      await messagesService.addReaction(message.id, user.id, "👍");
      await messagesService.addReaction(message.id, user.id, "👍");

      const reactions = await messagesService.getReactions(message.id);

      expect(reactions).toEqual([{ emoji: "👍", count: 1 }]);
    });
  });
});
