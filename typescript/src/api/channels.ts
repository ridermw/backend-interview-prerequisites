/**
 * Channels API Module
 * Provides data access and business logic for channel management.
 * All channel operations go through this module to ensure consistent validation and error handling.
 */

import { sqlConnection } from "../database";
import { ConflictError, NotFoundError, BaseAPI } from "./base";

/**
 * Channel data model representing a channel in a workspace.
 * Channels are messaging spaces that organize conversations by topic.
 */
export interface Channel {
  id: number;
  workspace_id: number;
  name: string;
  topic: string | null;
  is_private: number;
  created_at: string;
}

/**
 * API class for channel operations.
 * Extends BaseAPI to inherit validation and error handling utilities.
 * Methods are instance-based to allow dependency injection and clearer ownership.
 */
export class ChannelsService extends BaseAPI {
  constructor(private readonly dbProvider = sqlConnection) {
    super();
  }

  private async db() {
    return this.dbProvider();
  }

  /**
   * Retrieves all channels in a workspace.
   * @param workspaceId - The ID of the workspace
   * @returns Array of channels in the workspace
   */
  async getChannels(workspaceId: number): Promise<Channel[]> {
    const db = await this.db();
    return await db.all<Channel>(
      "SELECT * FROM `channels` WHERE workspace_id = $workspaceId",
      { $workspaceId: workspaceId },
    );
  }

  /**
   * Retrieves a specific channel by ID.
   * @param id - The ID of the channel
   * @returns The channel if found, undefined otherwise
   */
  async getChannelById(id: number): Promise<Channel | undefined> {
    const db = await this.db();
    return await db.get<Channel>("SELECT * FROM `channels` WHERE id = $id", {
      $id: id,
    });
  }

  /**
   * Creates a new channel in a workspace.
   * Automatically adds creator as initial member if provided.
   * @param workspaceId - The ID of the workspace
   * @param name - The channel name
   * @param topic - Optional channel topic/description
   * @param isPrivate - Whether the channel is private (defaults to false)
   * @param creatorUserId - Optional ID of the user creating the channel
   * @returns The created channel
   */
  async createChannel(
    workspaceId: number,
    name: string,
    topic?: string,
    isPrivate: boolean = false,
    creatorUserId?: number,
  ): Promise<Channel> {
    const params = {
      workspaceId,
      name: this.validateString(name, "name", {
        required: true,
        maxLength: 80,
        trim: true,
      }),
      topic: topic
        ? this.validateString(topic, "topic", { maxLength: 255 })
        : "",
      isPrivate: this.validateBoolean(isPrivate, "isPrivate", false),
      creatorUserId: creatorUserId ?? null,
    };

    const db = await this.db();

    // Manual transaction handling
    await db.run("BEGIN TRANSACTION");

    try {
      // Insert channel
      const channelId = await this.insertChannel({
        workspaceId: params.workspaceId,
        name: params.name,
        topic: params.topic,
        isPrivate: params.isPrivate,
      });

      // Add creator as member if specified
      if (params.creatorUserId) {
        await this.joinChannel(channelId, params.creatorUserId);
      }

      const channel = await this.getChannelById(channelId);
      if (!channel) {
        throw new Error("Failed to create channel");
      }

      await db.run("COMMIT");
      return channel;
    } catch (err) {
      await db.run("ROLLBACK");
      throw err;
    }
  }

  /**
   * Inserts channel record
   */
  private async insertChannel(params: {
    workspaceId: number;
    name: string;
    topic: string;
    isPrivate: boolean;
  }): Promise<number> {
    const db = await this.db();

    try {
      const result = await db.run(
        "INSERT INTO `channels` (`workspace_id`, `name`, `topic`, `is_private`) VALUES ($workspaceId, $name, $topic, $isPrivate)",
        {
          $workspaceId: params.workspaceId,
          $name: params.name,
          $topic: params.topic,
          $isPrivate: params.isPrivate ? 1 : 0,
        },
      );
      return result.lastID;
    } catch (err) {
      if (this.isSqliteUniqueError(err, "channels")) {
        throw new ConflictError("channel name already exists in workspace");
      }
      if (this.isSqliteForeignKeyError(err)) {
        // Check which foreign key constraint failed by checking if the workspace exists
        const workspace = await db.get(
          "SELECT id FROM `workspaces` WHERE id = $id",
          {
            $id: params.workspaceId,
          },
        );
        if (!workspace) {
          throw new NotFoundError("workspace not found");
        }
        // Generic foreign key error
        throw new NotFoundError("referenced resource not found");
      }
      throw err;
    }
  }

  /**
   * Adds a user to a channel.
   * Uses INSERT OR IGNORE to handle duplicate membership gracefully.
   * @param channelId - The ID of the channel
   * @param userId - The ID of the user to add
   */
  async joinChannel(channelId: number, userId: number): Promise<void> {
    const db = await this.db();
    try {
      await db.run(
        "INSERT OR IGNORE INTO `channel_members` (`channel_id`, `user_id`) VALUES ($channelId, $userId)",
        {
          $channelId: channelId,
          $userId: userId,
        },
      );
    } catch (err) {
      if (this.isSqliteForeignKeyError(err)) {
        // Check which foreign key constraint failed
        const user = await db.get("SELECT id FROM `users` WHERE id = $id", {
          $id: userId,
        });
        if (!user) {
          throw new NotFoundError("user not found");
        }
        const channel = await db.get(
          "SELECT id FROM `channels` WHERE id = $id",
          {
            $id: channelId,
          },
        );
        if (!channel) {
          throw new NotFoundError("channel not found");
        }
        throw new NotFoundError("referenced resource not found");
      }
      throw err;
    }
  }

  /**
   * Retrieves all user IDs of members in a channel.
   * @param channelId - The ID of the channel
   * @returns Array of user IDs who are members of the channel
   */
  async getChannelMembers(channelId: number): Promise<number[]> {
    const db = await this.db();
    const rows = await db.all<{ user_id: number }>(
      "SELECT user_id FROM `channel_members` WHERE channel_id = $channelId ORDER BY id ASC",
      { $channelId: channelId },
    );
    return rows.map((row) => row.user_id);
  }
}

export const channelsService = new ChannelsService();
