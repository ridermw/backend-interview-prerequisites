import { resetDb, sqlConnection } from "../database";
import { channelsService } from "./channels";
import { ValidationError, ConflictError, NotFoundError } from "./base";
import { usersService } from "./users";

describe("channels api", () => {
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

  it("creates a new channel", async () => {
    const workspaceId = await createWorkspace("Test Workspace", "test-ws");
    const channel = await channelsService.createChannel(
      workspaceId,
      "general",
      "General discussion",
    );

    expect(channel).toMatchObject({
      workspace_id: workspaceId,
      name: "general",
      topic: "General discussion",
      is_private: 0,
    });
    expect(channel.id).toBeGreaterThan(0);
  });

  it("creates a channel with defaults when optional fields omitted", async () => {
    const workspaceId = await createWorkspace("Test Workspace", "test-ws");
    const channel = await channelsService.createChannel(workspaceId, "general");

    expect(channel).toMatchObject({
      workspace_id: workspaceId,
      name: "general",
      topic: "",
      is_private: 0,
    });
  });

  it("creates a private channel when isPrivate is true", async () => {
    const workspaceId = await createWorkspace("Test Workspace", "test-ws");
    const channel = await channelsService.createChannel(
      workspaceId,
      "private-channel",
      "Secret stuff",
      true,
    );

    expect(channel.is_private).toBe(1);
  });

  it("automatically adds creator as member when userId provided", async () => {
    const workspaceId = await createWorkspace("Test Workspace", "test-ws");
    const user = await usersService.createUser("alice", "alice@example.com");

    const channel = await channelsService.createChannel(
      workspaceId,
      "general",
      undefined,
      false,
      user.id,
    );

    const members = await channelsService.getChannelMembers(channel.id);
    expect(members).toEqual([user.id]);
  });

  it("retrieves channels by workspace", async () => {
    const workspaceId = await createWorkspace("Test Workspace", "test-ws");
    await channelsService.createChannel(workspaceId, "general");
    await channelsService.createChannel(workspaceId, "random");

    const channels = await channelsService.getChannels(workspaceId);

    expect(channels).toHaveLength(2);
    expect(channels.map((c) => c.name)).toEqual(["general", "random"]);
  });

  it("allows users to join channels", async () => {
    const workspaceId = await createWorkspace("Test Workspace", "test-ws");
    const channel = await channelsService.createChannel(workspaceId, "general");
    const user1 = await usersService.createUser("alice", "alice@example.com");
    const user2 = await usersService.createUser("bob", "bob@example.com");

    await channelsService.joinChannel(channel.id, user1.id);
    await channelsService.joinChannel(channel.id, user2.id);

    const members = await channelsService.getChannelMembers(channel.id);
    expect(members).toEqual([user1.id, user2.id]);
  });

  it("returns empty array for workspace with no channels", async () => {
    const workspaceId = await createWorkspace("Empty Workspace", "empty-ws");
    const channels = await channelsService.getChannels(workspaceId);
    expect(channels).toEqual([]);
  });

  describe("input validation", () => {
    let workspaceId: number;

    beforeEach(async () => {
      workspaceId = await createWorkspace("Test Workspace", "test-ws");
    });

    it("rejects invalid channel names", async () => {
      await expect(
        channelsService.createChannel(workspaceId, ""),
      ).rejects.toThrow("name is required");
      await expect(
        channelsService.createChannel(workspaceId, "   "),
      ).rejects.toThrow("name is required");
      await expect(
        channelsService.createChannel(workspaceId, null as any),
      ).rejects.toThrow("name is required");
      await expect(
        channelsService.createChannel(workspaceId, undefined as any),
      ).rejects.toThrow("name is required");
    });

    it("rejects channel names exceeding 80 characters", async () => {
      const longName = "x".repeat(81);
      await expect(
        channelsService.createChannel(workspaceId, longName),
      ).rejects.toThrow("name must be 80 characters or fewer");
    });

    it("accepts channel names at 80 character limit", async () => {
      const maxName = "x".repeat(80);
      const channel = await channelsService.createChannel(workspaceId, maxName);
      expect(channel.name).toBe(maxName);
    });

    it("rejects topics exceeding 255 characters", async () => {
      const longTopic = "x".repeat(256);
      await expect(
        channelsService.createChannel(workspaceId, "general", longTopic),
      ).rejects.toThrow("topic must be 255 characters or fewer");
    });

    it("accepts topics at 255 character limit", async () => {
      const maxTopic = "x".repeat(255);
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
        maxTopic,
      );
      expect(channel.topic).toBe(maxTopic);
    });

    it("rejects invalid isPrivate values", async () => {
      await expect(
        channelsService.createChannel(
          workspaceId,
          "general",
          undefined,
          "yes" as any,
        ),
      ).rejects.toThrow("isPrivate must be a boolean");
      await expect(
        channelsService.createChannel(
          workspaceId,
          "general",
          undefined,
          1 as any,
        ),
      ).rejects.toThrow("isPrivate must be a boolean");
    });
  });

  describe("not found errors", () => {
    it("throws error when workspace doesn't exist", async () => {
      await expect(
        channelsService.createChannel(99999, "general"),
      ).rejects.toThrow("workspace not found");
      await expect(
        channelsService.createChannel(99999, "general"),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws error when creator user doesn't exist", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      await expect(
        channelsService.createChannel(
          workspaceId,
          "general",
          undefined,
          false,
          99999,
        ),
      ).rejects.toThrow("user not found");
      await expect(
        channelsService.createChannel(
          workspaceId,
          "general",
          undefined,
          false,
          99999,
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it("returns undefined when channel ID doesn't exist", async () => {
      const channel = await channelsService.getChannelById(99999);
      expect(channel).toBeUndefined();
    });
  });

  describe("conflict errors", () => {
    let workspaceId: number;

    beforeEach(async () => {
      workspaceId = await createWorkspace("Test Workspace", "test-ws");
    });

    it("throws error when channel name already exists in workspace", async () => {
      await channelsService.createChannel(workspaceId, "general");
      await expect(
        channelsService.createChannel(workspaceId, "general"),
      ).rejects.toThrow("channel name already exists in workspace");
      await expect(
        channelsService.createChannel(workspaceId, "general"),
      ).rejects.toThrow(ConflictError);
    });

    it("allows same channel name in different workspaces", async () => {
      const workspace2Id = await createWorkspace(
        "Another Workspace",
        "another-ws",
      );

      const channel1 = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      const channel2 = await channelsService.createChannel(
        workspace2Id,
        "general",
      );

      expect(channel1.workspace_id).not.toBe(channel2.workspace_id);
      expect(channel1.name).toBe(channel2.name);
    });
  });

  describe("special characters and edge cases", () => {
    let workspaceId: number;

    beforeEach(async () => {
      workspaceId = await createWorkspace("Test Workspace", "test-ws");
    });

    it("handles channel names with special characters", async () => {
      const names = [
        "general-chat",
        "team_updates",
        "café-☕",
        "日本語-channel",
        "emoji-🚀-channel",
        "dots.and.dashes-_",
      ];

      for (const name of names) {
        const channel = await channelsService.createChannel(workspaceId, name);
        expect(channel.name).toBe(name);
      }
    });

    it("handles topics with special characters", async () => {
      const topics = [
        "Discussion about <html> & XML",
        "Use `backticks` for code",
        "Math: 2 + 2 = 4",
        "Quotes: \"Hello\" and 'World'",
        "Unicode: 你好 🌍",
        "Newlines and\ttabs",
      ];

      for (let i = 0; i < topics.length; i++) {
        const channel = await channelsService.createChannel(
          workspaceId,
          `channel-${i}`,
          topics[i],
        );
        expect(channel.topic).toBe(topics[i]);
      }
    });

    it("trims whitespace from channel names", async () => {
      const channel = await channelsService.createChannel(
        workspaceId,
        "  general  ",
      );
      expect(channel.name).toBe("general");
    });

    it("preserves whitespace in topics", async () => {
      const topic = "  Some topic with spaces  ";
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
        topic,
      );
      expect(channel.topic).toBe(topic);
    });

    it("handles empty topic as empty string", async () => {
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
        "",
      );
      expect(channel.topic).toBe("");
    });

    it("handles undefined topic as empty string", async () => {
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );
      expect(channel.topic).toBe("");
    });
  });

  describe("channel membership", () => {
    let workspaceId: number;
    let channel: any;

    beforeEach(async () => {
      workspaceId = await createWorkspace("Test Workspace", "test-ws");
      channel = await channelsService.createChannel(workspaceId, "general");
    });

    it("allows users to join multiple times (idempotent)", async () => {
      const user = await usersService.createUser("alice", "alice@example.com");

      await channelsService.joinChannel(channel.id, user.id);
      await channelsService.joinChannel(channel.id, user.id);
      await channelsService.joinChannel(channel.id, user.id);

      const members = await channelsService.getChannelMembers(channel.id);
      expect(members).toEqual([user.id]);
    });

    it("returns empty array for channel with no members", async () => {
      const members = await channelsService.getChannelMembers(channel.id);
      expect(members).toEqual([]);
    });

    it("maintains correct order of members", async () => {
      const user1 = await usersService.createUser("alice", "alice@example.com");
      const user2 = await usersService.createUser("bob", "bob@example.com");
      const user3 = await usersService.createUser(
        "charlie",
        "charlie@example.com",
      );

      await channelsService.joinChannel(channel.id, user1.id);
      await channelsService.joinChannel(channel.id, user2.id);
      await channelsService.joinChannel(channel.id, user3.id);

      const members = await channelsService.getChannelMembers(channel.id);
      expect(members).toEqual([user1.id, user2.id, user3.id]);
    });

    it("automatically adds creator when provided", async () => {
      const user = await usersService.createUser("alice", "alice@example.com");
      const newChannel = await channelsService.createChannel(
        workspaceId,
        "private",
        undefined,
        true,
        user.id,
      );

      const members = await channelsService.getChannelMembers(newChannel.id);
      expect(members).toEqual([user.id]);
    });

    it("handles large number of members", async () => {
      const userIds: number[] = [];

      for (let i = 0; i < 50; i++) {
        const user = await usersService.createUser(
          `user${i}`,
          `user${i}@example.com`,
        );
        userIds.push(user.id);
        await channelsService.joinChannel(channel.id, user.id);
      }

      const members = await channelsService.getChannelMembers(channel.id);
      expect(members).toEqual(userIds);
      expect(members).toHaveLength(50);
    });
  });

  describe("empty results", () => {
    it("returns empty array for non-existent workspace", async () => {
      const channels = await channelsService.getChannels(99999);
      expect(channels).toEqual([]);
    });

    it("returns empty array for channel with no members", async () => {
      const workspaceId = await createWorkspace("Test Workspace", "test-ws");
      const channel = await channelsService.createChannel(
        workspaceId,
        "general",
      );

      const members = await channelsService.getChannelMembers(channel.id);
      expect(members).toEqual([]);
    });
  });
});
