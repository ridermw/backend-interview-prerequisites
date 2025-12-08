/**
 * Channels API Module
 * Provides data access and business logic for channel management.
 * All channel operations go through this module to ensure consistent validation and error handling.
 */

import { sqlConnection } from "../database";
import { ValidationError, ConflictError, NotFoundError, BaseAPI } from "./base";

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
 * All methods are static to provide a namespace for channel-related operations.
 */
export class ChannelsAPI extends BaseAPI {
  /**
   * Retrieves all channels in a workspace.
   * @param workspaceId - The ID of the workspace
   * @returns Array of channels in the workspace
   */
  static async getChannels(workspaceId: number): Promise<Channel[]> {
    const db = await sqlConnection();
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
  static async getChannelById(id: number): Promise<Channel | undefined> {
    const db = await sqlConnection();
    return await db.get<Channel>("SELECT * FROM `channels` WHERE id = $id", {
      $id: id,
    });
  }

  /**
   * Creates a new channel in a workspace with comprehensive validation.
   * - Validates all input parameters
   * - Ensures workspace exists
   * - Ensures creator user exists (if provided)
   * - Checks for duplicate channel names within the workspace
   * - Optionally adds creator as initial member
   * @param workspaceId - The ID of the workspace
   * @param name - The channel name (required, max 80 chars)
   * @param topic - Optional topic/description (max 255 chars)
   * @param isPrivate - Whether the channel is private (default: false)
   * @param creatorUserId - Optional user ID to add as initial member
   * @returns The created channel
   * @throws ValidationError if inputs are invalid
   * @throws NotFoundError if workspace or user doesn't exist
   * @throws ConflictError if channel name already exists in workspace
   */
  static async createChannel(
    workspaceId: number,
    name: string,
    topic?: string,
    isPrivate: boolean = false,
    creatorUserId?: number,
  ): Promise<Channel> {
    const db = await sqlConnection();

    const validWorkspaceId = ChannelsAPI.validator.validateId(
      workspaceId,
      "workspaceId",
    );
    const validName = ChannelsAPI.validator.validateString(name, "name", {
      required: true,
      maxLength: 80,
      trim: true,
    });
    const validTopic = ChannelsAPI.validator.validateString(topic, "topic", {
      maxLength: 255,
    });
    const validIsPrivate = ChannelsAPI.validator.validateBoolean(
      isPrivate,
      "isPrivate",
      false,
    );
    const validCreatorUserId =
      creatorUserId !== undefined
        ? ChannelsAPI.validator.validateId(creatorUserId, "userId")
        : undefined;

    const workspace = await db.get<{ id: number }>(
      "SELECT id FROM `workspaces` WHERE id = $id",
      { $id: validWorkspaceId },
    );
    if (!workspace) {
      throw new NotFoundError("workspace not found");
    }

    if (validCreatorUserId !== undefined) {
      const user = await db.get<{ id: number }>(
        "SELECT id FROM `users` WHERE id = $id",
        { $id: validCreatorUserId },
      );
      if (!user) {
        throw new NotFoundError("user not found");
      }
    }

    let result;
    try {
      result = await db.run(
        "INSERT INTO `channels` (`workspace_id`, `name`, `topic`, `is_private`) VALUES ($workspaceId, $name, $topic, $isPrivate)",
        {
          $workspaceId: validWorkspaceId,
          $name: validName,
          $topic: validTopic,
          $isPrivate: validIsPrivate ? 1 : 0,
        },
      );
    } catch (err) {
      if (ChannelsAPI.errorHandler.isUniqueError(err, "channels")) {
        throw new ConflictError("channel name already exists in workspace");
      }
      throw err;
    }

    const channel = await ChannelsAPI.getChannelById(result.lastID);
    if (!channel) {
      throw new Error("Failed to create channel");
    }

    if (validCreatorUserId !== undefined) {
      await ChannelsAPI.joinChannel(channel.id, validCreatorUserId);
    }

    return channel;
  }

  /**
   * Adds a user to a channel.
   * Uses INSERT OR IGNORE to handle duplicate membership gracefully.
   * @param channelId - The ID of the channel
   * @param userId - The ID of the user to add
   */
  static async joinChannel(channelId: number, userId: number): Promise<void> {
    const db = await sqlConnection();
    await db.run(
      "INSERT OR IGNORE INTO `channel_members` (`channel_id`, `user_id`) VALUES ($channelId, $userId)",
      {
        $channelId: channelId,
        $userId: userId,
      },
    );
  }

  /**
   * Retrieves all user IDs of members in a channel.
   * @param channelId - The ID of the channel
   * @returns Array of user IDs who are members of the channel
   */
  static async getChannelMembers(channelId: number): Promise<number[]> {
    const db = await sqlConnection();
    const rows = await db.all<{ user_id: number }>(
      "SELECT user_id FROM `channel_members` WHERE channel_id = $channelId",
      { $channelId: channelId },
    );
    return rows.map((row) => row.user_id);
  }
}

/**
 * Convenience function exports for backward compatibility.
 * These allow importing individual functions directly from the module without using the ChannelsAPI class.
 * Example: import { createChannel } from './channels' instead of ChannelsAPI.createChannel
 */
export const getChannels = ChannelsAPI.getChannels;
export const getChannelById = ChannelsAPI.getChannelById;
export const createChannel = ChannelsAPI.createChannel;
export const joinChannel = ChannelsAPI.joinChannel;
export const getChannelMembers = ChannelsAPI.getChannelMembers;
