import { resetDb, sqlConnection } from "../database";
import {
  getChannels,
  getChannelById,
  createChannel,
  joinChannel,
  getChannelMembers,
} from "./channels";
import { createUser } from "./users";

describe("channels api", () => {
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

  it("creates a new channel", async () => {
    const workspaceId = await createWorkspace("Test Workspace", "test-ws");
    const channel = await createChannel(
      workspaceId,
      "general",
      "General discussion"
    );

    expect(channel).toMatchObject({
      workspace_id: workspaceId,
      name: "general",
      topic: "General discussion",
      is_private: 0,
    });
    expect(channel.id).toBeGreaterThan(0);
  });

  it("retrieves channels by workspace", async () => {
    const workspaceId = await createWorkspace("Test Workspace", "test-ws");
    await createChannel(workspaceId, "general");
    await createChannel(workspaceId, "random");

    const channels = await getChannels(workspaceId);

    expect(channels).toHaveLength(2);
    expect(channels.map((c) => c.name)).toEqual(["general", "random"]);
  });

  it("allows users to join channels", async () => {
    const workspaceId = await createWorkspace("Test Workspace", "test-ws");
    const channel = await createChannel(workspaceId, "general");
    const user1 = await createUser("alice", "alice@example.com");
    const user2 = await createUser("bob", "bob@example.com");

    await joinChannel(channel.id, user1.id);
    await joinChannel(channel.id, user2.id);

    const members = await getChannelMembers(channel.id);
    expect(members).toEqual([user1.id, user2.id]);
  });

  it("returns empty array for workspace with no channels", async () => {
    const workspaceId = await createWorkspace("Empty Workspace", "empty-ws");
    const channels = await getChannels(workspaceId);
    expect(channels).toEqual([]);
  });
});
