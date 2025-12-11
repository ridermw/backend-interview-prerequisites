import { Express, Request, Response } from "express";
import { messagesService } from "../api/messages";
import { ValidationError, NotFoundError } from "../api/base";
import { handleApiError } from "./http";

/**
 * Registers all messages API endpoints.
 * @param app - Express application instance
 */
export function registerMessagesEndpoints(app: Express): void {
  /**
   * GET /api/messages.get
   * Retrieves all messages in a channel.
   * Query parameters: { channelId }
   */
  app.get(`/api/messages.get`, async (req: Request, res: Response) => {
    const channelId = req.query.channelId;

    try {
      if (!channelId || isNaN(Number(channelId))) {
        throw new ValidationError("channelId is required and must be a number");
      }

      const messages = await messagesService.getMessages(Number(channelId));
      res.json({ ok: true, messages });
    } catch (err: unknown) {
      handleApiError(err, res, "messages.get");
    }
  });

  /**
   * GET /api/messages.getById
   * Retrieves a specific message by ID.
   * Query parameters: { id }
   */
  app.get(`/api/messages.getById`, async (req: Request, res: Response) => {
    const id = req.query.id;

    try {
      if (!id || isNaN(Number(id))) {
        throw new ValidationError("id is required and must be a number");
      }

      const message = await messagesService.getMessageById(Number(id));
      if (!message) {
        throw new NotFoundError("message not found");
      }

      res.json({ ok: true, message });
    } catch (err: unknown) {
      handleApiError(err, res, "messages.getById");
    }
  });

  /**
   * POST /api/messages.create
   * Creates a new message in a channel.
   * Request body: { channelId, userId, text, threadTs? }
   */
  app.post(`/api/messages.create`, async (req: Request, res: Response) => {
    const { channelId, userId, text, threadTs } = req.body ?? {};

    try {
      const message = await messagesService.createMessage(
        channelId,
        userId,
        text,
        threadTs,
      );
      res.json({ ok: true, message });
    } catch (err: unknown) {
      handleApiError(err, res, "messages.create");
    }
  });

  /**
   * GET /api/messages.getThreadReplies
   * Retrieves all replies in a thread.
   * Query parameters: { channelId, threadTs }
   */
  app.get(
    `/api/messages.getThreadReplies`,
    async (req: Request, res: Response) => {
      const channelId = req.query.channelId;
      const threadTs = req.query.threadTs;

      try {
        if (!channelId || isNaN(Number(channelId))) {
          throw new ValidationError(
            "channelId is required and must be a number",
          );
        }
        if (!threadTs || isNaN(Number(threadTs))) {
          throw new ValidationError(
            "threadTs is required and must be a number",
          );
        }

        const replies = await messagesService.getThreadReplies(
          Number(channelId),
          Number(threadTs),
        );
        res.json({ ok: true, replies });
      } catch (err: unknown) {
        handleApiError(err, res, "messages.getThreadReplies");
      }
    },
  );

  /**
   * POST /api/messages.addReaction
   * Adds a reaction/emoji to a message.
   * Request body: { messageId, userId, emoji }
   */
  app.post(`/api/messages.addReaction`, async (req: Request, res: Response) => {
    const { messageId, userId, emoji } = req.body ?? {};

    try {
      await messagesService.addReaction(messageId, userId, emoji);
      res.json({ ok: true });
    } catch (err: unknown) {
      handleApiError(err, res, "messages.addReaction");
    }
  });

  /**
   * GET /api/messages.getReactions
   * Retrieves all reactions for a message.
   * Query parameters: { messageId }
   */
  app.get(`/api/messages.getReactions`, async (req: Request, res: Response) => {
    const messageId = req.query.messageId;

    try {
      if (!messageId || isNaN(Number(messageId))) {
        throw new ValidationError("messageId is required and must be a number");
      }

      const reactions = await messagesService.getReactions(Number(messageId));
      res.json({ ok: true, reactions });
    } catch (err: unknown) {
      handleApiError(err, res, "messages.getReactions");
    }
  });
}
