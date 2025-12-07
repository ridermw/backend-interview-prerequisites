import { sqlConnection } from "../database";

export interface Message {
  id: number;
  channel_id: number;
  user_id: number;
  text: string;
  thread_ts: number | null;
  created_at: string;
}

export interface MessageWithUser extends Message {
  username: string;
  display_name: string | null;
}

export async function getMessages(channelId: number): Promise<MessageWithUser[]> {
  const db = await sqlConnection();
  return await db.all<MessageWithUser>(
    `SELECT m.*, u.username, u.display_name 
     FROM messages m 
     JOIN users u ON m.user_id = u.id 
     WHERE m.channel_id = $channelId 
     ORDER BY m.created_at ASC`,
    { $channelId: channelId }
  );
}

export async function getMessageById(id: number): Promise<Message | undefined> {
  const db = await sqlConnection();
  return await db.get<Message>("SELECT * FROM `messages` WHERE id = $id", {
    $id: id,
  });
}

export async function createMessage(
  channelId: number,
  userId: number,
  text: string,
  threadTs?: number
): Promise<Message> {
  const db = await sqlConnection();
  const result = await db.run(
    "INSERT INTO `messages` (`channel_id`, `user_id`, `text`, `thread_ts`) VALUES ($channelId, $userId, $text, $threadTs)",
    {
      $channelId: channelId,
      $userId: userId,
      $text: text,
      $threadTs: threadTs || null,
    }
  );

  const message = await getMessageById(result.lastID);
  if (!message) {
    throw new Error("Failed to create message");
  }
  return message;
}

export async function getThreadReplies(
  channelId: number,
  threadTs: number
): Promise<MessageWithUser[]> {
  const db = await sqlConnection();
  return await db.all<MessageWithUser>(
    `SELECT m.*, u.username, u.display_name 
     FROM messages m 
     JOIN users u ON m.user_id = u.id 
     WHERE m.channel_id = $channelId AND m.thread_ts = $threadTs 
     ORDER BY m.created_at ASC`,
    { $channelId: channelId, $threadTs: threadTs }
  );
}

export async function addReaction(
  messageId: number,
  userId: number,
  emoji: string
): Promise<void> {
  const db = await sqlConnection();
  await db.run(
    "INSERT OR IGNORE INTO `reactions` (`message_id`, `user_id`, `emoji`) VALUES ($messageId, $userId, $emoji)",
    {
      $messageId: messageId,
      $userId: userId,
      $emoji: emoji,
    }
  );
}

export async function getReactions(
  messageId: number
): Promise<{ emoji: string; count: number }[]> {
  const db = await sqlConnection();
  return await db.all<{ emoji: string; count: number }>(
    "SELECT emoji, COUNT(*) as count FROM `reactions` WHERE message_id = $messageId GROUP BY emoji ORDER BY emoji",
    { $messageId: messageId }
  );
}
