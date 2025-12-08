import { sqlConnection } from "../database";
import { ValidationError, ConflictError, NotFoundError, BaseAPI } from "./base";

export interface Channel {
  id: number;
  workspace_id: number;
  name: string;
  topic: string | null;
  is_private: number;
  created_at: string;
}

export class ChannelsAPI extends BaseAPI {
  static async getChannels(workspaceId: number): Promise<Channel[]> {
    const db = await sqlConnection();
    return await db.all<Channel>(
      "SELECT * FROM `channels` WHERE workspace_id = $workspaceId",
      { $workspaceId: workspaceId },
    );
  }

  static async getChannelById(id: number): Promise<Channel | undefined> {
    const db = await sqlConnection();
    return await db.get<Channel>("SELECT * FROM `channels` WHERE id = $id", {
      $id: id,
    });
  }

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

  static async getChannelMembers(channelId: number): Promise<number[]> {
    const db = await sqlConnection();
    const rows = await db.all<{ user_id: number }>(
      "SELECT user_id FROM `channel_members` WHERE channel_id = $channelId",
      { $channelId: channelId },
    );
    return rows.map((row) => row.user_id);
  }
}

// Convenience exports for backward compatibility
export const getChannels = ChannelsAPI.getChannels;
export const getChannelById = ChannelsAPI.getChannelById;
export const createChannel = ChannelsAPI.createChannel;
export const joinChannel = ChannelsAPI.joinChannel;
export const getChannelMembers = ChannelsAPI.getChannelMembers;
