import { resetDb, sqlConnection } from "../database";
import {
  getMessages,
  createMessage,
  getThreadReplies,
  addReaction,
  getReactions,
} from "./messages";
import { createUser } from "./users";
import { createChannel } from "./channels";

describe("messages api", () => {
  beforeEach(() => {
    resetDb();
  });

  async function createWorkspace(name: string, slug: string): Promise<number> {
    const db = await sqlConnection();
    const result = await db.run(
      "INSERT INTO `workspaces` (`name`, `slug`) VALUES ($name, $slug)",
      { $name: name, $slug: slug }
    );
    return result.lastID;
  }

  it("creates a message", async () => {
    const workspaceId = await createWorkspace("Test", "test");
    const channel = await createChannel(workspaceId, "general");
    const user = await createUser("alice", "alice@example.com");

    const message = await createMessage(channel.id, user.id, "Hello world!");

    expect(message).toMatchObject({
      channel_id: channel.id,
      user_id: user.id,
      text: "Hello world!",
      thread_ts: null,
    });
  });

  it("retrieves messages with user info", async () => {
    const workspaceId = await createWorkspace("Test", "test");
    const channel = await createChannel(workspaceId, "general");
    const alice = await createUser("alice", "alice@example.com", "Alice");
    const bob = await createUser("bob", "bob@example.com", "Bob");

    await createMessage(channel.id, alice.id, "First message");
    await createMessage(channel.id, bob.id, "Second message");

    const messages = await getMessages(channel.id);

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
    const channel = await createChannel(workspaceId, "general");
    const user = await createUser("alice", "alice@example.com");

    const parentMessage = await createMessage(
      channel.id,
      user.id,
      "Parent message"
    );
    await createMessage(
      channel.id,
      user.id,
      "Reply 1",
      parentMessage.id
    );
    await createMessage(
      channel.id,
      user.id,
      "Reply 2",
      parentMessage.id
    );

    const replies = await getThreadReplies(channel.id, parentMessage.id);

    expect(replies).toHaveLength(2);
    expect(replies.map((r) => r.text)).toEqual(["Reply 1", "Reply 2"]);
  });

  it("adds reactions to messages", async () => {
    const workspaceId = await createWorkspace("Test", "test");
    const channel = await createChannel(workspaceId, "general");
    const alice = await createUser("alice", "alice@example.com");
    const bob = await createUser("bob", "bob@example.com");

    const message = await createMessage(channel.id, alice.id, "Great idea!");

    await addReaction(message.id, alice.id, "thumbsup");
    await addReaction(message.id, bob.id, "thumbsup");
    await addReaction(message.id, bob.id, "fire");

    const reactions = await getReactions(message.id);

    expect(reactions).toEqual([
      { emoji: "fire", count: 1 },
      { emoji: "thumbsup", count: 2 },
    ]);
  });

  it("returns empty array for channel with no messages", async () => {
    const workspaceId = await createWorkspace("Test", "test");
    const channel = await createChannel(workspaceId, "general");

    const messages = await getMessages(channel.id);
    expect(messages).toEqual([]);
  });
});
