import { sqlConnection } from "../database";

export interface Channel {
  id: number;
  workspace_id: number;
  name: string;
  topic: string | null;
  is_private: number;
  created_at: string;
}

export async function getChannels(workspaceId: number): Promise<Channel[]> {
  const db = await sqlConnection();
  return await db.all<Channel>(
    "SELECT * FROM `channels` WHERE workspace_id = $workspaceId",
    { $workspaceId: workspaceId }
  );
}

export async function getChannelById(id: number): Promise<Channel | undefined> {
  const db = await sqlConnection();
  return await db.get<Channel>("SELECT * FROM `channels` WHERE id = $id", {
    $id: id,
  });
}

export async function createChannel(
  workspaceId: number,
  name: string,
  topic?: string,
  isPrivate: boolean = false
): Promise<Channel> {
  const db = await sqlConnection();
  const result = await db.run(
    "INSERT INTO `channels` (`workspace_id`, `name`, `topic`, `is_private`) VALUES ($workspaceId, $name, $topic, $isPrivate)",
    {
      $workspaceId: workspaceId,
      $name: name,
      $topic: topic || null,
      $isPrivate: isPrivate ? 1 : 0,
    }
  );

  const channel = await getChannelById(result.lastID);
  if (!channel) {
    throw new Error("Failed to create channel");
  }
  return channel;
}

export async function joinChannel(
  channelId: number,
  userId: number
): Promise<void> {
  const db = await sqlConnection();
  await db.run(
    "INSERT OR IGNORE INTO `channel_members` (`channel_id`, `user_id`) VALUES ($channelId, $userId)",
    {
      $channelId: channelId,
      $userId: userId,
    }
  );
}

export async function getChannelMembers(channelId: number): Promise<number[]> {
  const db = await sqlConnection();
  const rows = await db.all<{ user_id: number }>(
    "SELECT user_id FROM `channel_members` WHERE channel_id = $channelId",
    { $channelId: channelId }
  );
  return rows.map((row) => row.user_id);
}
