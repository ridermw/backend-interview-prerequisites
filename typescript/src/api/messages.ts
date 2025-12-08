import { sqlConnection } from "../database";
import { BaseAPI } from "./base";

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

export class MessagesAPI extends BaseAPI {
  static async getMessages(channelId: number): Promise<MessageWithUser[]> {
    const db = await sqlConnection();
    return await db.all<MessageWithUser>(
      `SELECT m.*, u.username, u.display_name 
       FROM messages m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.channel_id = $channelId 
       ORDER BY m.created_at ASC`,
      { $channelId: channelId },
    );
  }

  static async getMessageById(id: number): Promise<Message | undefined> {
    const db = await sqlConnection();
    return await db.get<Message>("SELECT * FROM `messages` WHERE id = $id", {
      $id: id,
    });
  }

  static async createMessage(
    channelId: number,
    userId: number,
    text: string,
    threadTs?: number,
  ): Promise<Message> {
    const db = await sqlConnection();
    const result = await db.run(
      "INSERT INTO `messages` (`channel_id`, `user_id`, `text`, `thread_ts`) VALUES ($channelId, $userId, $text, $threadTs)",
      {
        $channelId: channelId,
        $userId: userId,
        $text: text,
        $threadTs: threadTs || null,
      },
    );

    const message = await MessagesAPI.getMessageById(result.lastID);
    if (!message) {
      throw new Error("Failed to create message");
    }
    return message;
  }

  static async getThreadReplies(
    channelId: number,
    threadTs: number,
  ): Promise<MessageWithUser[]> {
    const db = await sqlConnection();
    return await db.all<MessageWithUser>(
      `SELECT m.*, u.username, u.display_name 
       FROM messages m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.channel_id = $channelId AND m.thread_ts = $threadTs 
       ORDER BY m.created_at ASC`,
      { $channelId: channelId, $threadTs: threadTs },
    );
  }

  static async addReaction(
    messageId: number,
    userId: number,
    emoji: string,
  ): Promise<void> {
    const db = await sqlConnection();
    await db.run(
      "INSERT OR IGNORE INTO `reactions` (`message_id`, `user_id`, `emoji`) VALUES ($messageId, $userId, $emoji)",
      {
        $messageId: messageId,
        $userId: userId,
        $emoji: emoji,
      },
    );
  }

  static async getReactions(
    messageId: number,
  ): Promise<{ emoji: string; count: number }[]> {
    const db = await sqlConnection();
    return await db.all<{ emoji: string; count: number }>(
      "SELECT emoji, COUNT(*) as count FROM `reactions` WHERE message_id = $messageId GROUP BY emoji ORDER BY emoji",
      { $messageId: messageId },
    );
  }
}

// Convenience exports for backward compatibility
export const getMessages = MessagesAPI.getMessages;
export const getMessageById = MessagesAPI.getMessageById;
export const createMessage = MessagesAPI.createMessage;
export const getThreadReplies = MessagesAPI.getThreadReplies;
export const addReaction = MessagesAPI.addReaction;
export const getReactions = MessagesAPI.getReactions;
