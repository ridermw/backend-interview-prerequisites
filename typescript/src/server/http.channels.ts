import { Express, Request, Response } from "express";
import {
  getChannels,
  getChannelById,
  createChannel,
  joinChannel,
  getChannelMembers,
} from "../api/channels";
import { ValidationError, NotFoundError } from "../api/base";
import { handleApiError } from "./http";

/**
 * Registers all channels API endpoints.
 * @param app - Express application instance
 */
export function registerChannelsEndpoints(app: Express): void {
  /**
   * POST /api/channels.create
   * Creates a new channel in a workspace.
   * Request body: { workspaceId, name, topic?, isPrivate?, userId? }
   * All validation and business logic is delegated to ChannelsAPI.createChannel()
   * Errors are caught and formatted into appropriate HTTP responses.
   */
  app.post(`/api/channels.create`, async (req: Request, res: Response) => {
    const { workspaceId, name, topic, isPrivate, userId } = req.body ?? {};

    try {
      const channel = await createChannel(
        workspaceId,
        name,
        topic,
        isPrivate,
        userId,
      );
      res.json({ ok: true, channel });
    } catch (err: unknown) {
      handleApiError(err, res, "channels.create");
    }
  });

  /**
   * GET /api/channels.get
   * Retrieves all channels in a workspace.
   * Query parameters: { workspaceId }
   */
  app.get(`/api/channels.get`, async (req: Request, res: Response) => {
    const workspaceId = req.query.workspaceId;

    try {
      if (!workspaceId || isNaN(Number(workspaceId))) {
        throw new ValidationError("workspaceId is required and must be a number");
      }

      const channels = await getChannels(Number(workspaceId));
      res.json({ ok: true, channels });
    } catch (err: unknown) {
      handleApiError(err, res, "channels.get");
    }
  });

  /**
   * GET /api/channels.getById
   * Retrieves a specific channel by ID.
   * Query parameters: { id }
   */
  app.get(`/api/channels.getById`, async (req: Request, res: Response) => {
    const id = req.query.id;

    try {
      if (!id || isNaN(Number(id))) {
        throw new ValidationError("id is required and must be a number");
      }

      const channel = await getChannelById(Number(id));
      if (!channel) {
        throw new NotFoundError("channel not found");
      }

      res.json({ ok: true, channel });
    } catch (err: unknown) {
      handleApiError(err, res, "channels.getById");
    }
  });

  /**
   * POST /api/channels.join
   * Adds a user to a channel.
   * Request body: { channelId, userId }
   */
  app.post(`/api/channels.join`, async (req: Request, res: Response) => {
    const { channelId, userId } = req.body ?? {};

    try {
      await joinChannel(channelId, userId);
      res.json({ ok: true });
    } catch (err: unknown) {
      handleApiError(err, res, "channels.join");
    }
  });

  /**
   * GET /api/channels.getMembers
   * Retrieves all member IDs in a channel.
   * Query parameters: { channelId }
   */
  app.get(`/api/channels.getMembers`, async (req: Request, res: Response) => {
    const channelId = req.query.channelId;

    try {
      if (!channelId || isNaN(Number(channelId))) {
        throw new ValidationError("channelId is required and must be a number");
      }

      const members = await getChannelMembers(Number(channelId));
      res.json({ ok: true, members });
    } catch (err: unknown) {
      handleApiError(err, res, "channels.getMembers");
    }
  });
}
