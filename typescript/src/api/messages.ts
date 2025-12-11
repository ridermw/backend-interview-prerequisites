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

export class MessagesService extends BaseAPI {
  constructor(private readonly dbProvider = sqlConnection) {
    super();
  }

  private async db() {
    return this.dbProvider();
  }

  /**
   * Retrieves all messages in a channel with user information.
   * @param channelId - The ID of the channel
   * @returns Array of messages with user details
   */
  async getMessages(channelId: number): Promise<MessageWithUser[]> {
    const db = await this.db();
    return await db.all<MessageWithUser>(
      `SELECT m.*, u.username, u.display_name 
       FROM messages m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.channel_id = $channelId 
       ORDER BY m.created_at ASC`,
      { $channelId: channelId },
    );
  }

  /**
   * Retrieves a specific message by ID.
   * @param id - The ID of the message
   * @returns The message if found, undefined otherwise
   */
  async getMessageById(id: number): Promise<Message | undefined> {
    const db = await this.db();
    return await db.get<Message>("SELECT * FROM `messages` WHERE id = $id", {
      $id: id,
    });
  }

  /**
   * Creates a new message in a channel.
   * @param channelId - The ID of the channel
   * @param userId - The ID of the user posting the message
   * @param text - The message text content
   * @param threadTs - Optional ID of parent message for threaded replies
   * @returns The created message
   */
  async createMessage(
    channelId: number,
    userId: number,
    text: string,
    threadTs?: number | null,
  ): Promise<Message> {
    const params = {
      channelId,
      userId,
      text: this.validateString(text, "text", {
        required: true,
        maxLength: 10000,
        trim: true,
      }),
      threadTs: threadTs ?? null,
    };

    const db = await this.db();
    const result = await db.run(
      "INSERT INTO `messages` (`channel_id`, `user_id`, `text`, `thread_ts`) VALUES ($channelId, $userId, $text, $threadTs)",
      {
        $channelId: params.channelId,
        $userId: params.userId,
        $text: params.text,
        $threadTs: params.threadTs,
      },
    );

    const message = await this.getMessageById(result.lastID);
    if (!message) {
      throw new Error("Failed to create message");
    }
    return message;
  }

  /**
   * Retrieves all reply messages in a thread.
   * @param channelId - The ID of the channel
   * @param threadTs - The ID of the parent message
   * @returns Array of reply messages with user details
   */
  async getThreadReplies(
    channelId: number,
    threadTs: number,
  ): Promise<MessageWithUser[]> {
    const db = await this.db();
    return await db.all<MessageWithUser>(
      `SELECT m.*, u.username, u.display_name 
       FROM messages m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.channel_id = $channelId AND m.thread_ts = $threadTs 
       ORDER BY m.created_at ASC`,
      { $channelId: channelId, $threadTs: threadTs },
    );
  }

  /**
   * Adds an emoji reaction to a message.
   * Uses INSERT OR IGNORE to handle duplicate reactions gracefully.
   * @param messageId - The ID of the message
   * @param userId - The ID of the user adding the reaction
   * @param emoji - The emoji text or unicode character
   */
  async addReaction(
    messageId: number,
    userId: number,
    emoji: string,
  ): Promise<void> {
    const params = {
      messageId,
      userId,
      emoji: this.validateString(emoji, "emoji", {
        required: true,
        maxLength: 32,
        trim: true,
      }),
    };

    const db = await this.db();
    await db.run(
      "INSERT OR IGNORE INTO `reactions` (`message_id`, `user_id`, `emoji`) VALUES ($messageId, $userId, $emoji)",
      {
        $messageId: params.messageId,
        $userId: params.userId,
        $emoji: params.emoji,
      },
    );
  }

  /**
   * Retrieves all reactions for a message with counts.
   * @param messageId - The ID of the message
   * @returns Array of reactions with emoji and count
   */
  async getReactions(
    messageId: number,
  ): Promise<{ emoji: string; count: number }[]> {
    const db = await this.db();
    return await db.all<{ emoji: string; count: number }>(
      "SELECT emoji, COUNT(*) as count FROM `reactions` WHERE message_id = $messageId GROUP BY emoji ORDER BY emoji",
      { $messageId: messageId },
    );
  }
}

export const messagesService = new MessagesService();
