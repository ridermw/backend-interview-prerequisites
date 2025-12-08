import express, { Express, Request, Response, json } from "express";
import { createChannel } from "../api/channels";
import { ValidationError, ConflictError, NotFoundError } from "../api/base";

/**
 * Centralized error handler for API errors.
 * Converts application-level errors into appropriate HTTP responses with status codes.
 * - ValidationError (400): Request validation failed
 * - NotFoundError (404): Requested resource not found
 * - ConflictError (409): Resource already exists or constraint violation
 * - Other errors (500): Unexpected server errors
 * @param err - The error thrown by the API layer
 * @param res - Express response object for sending the HTTP response
 * @param context - Description of the operation that failed (for logging)
 */
// Helper to handle API errors consistently
function handleApiError(err: unknown, res: Response, context: string): void {
  if (
    err instanceof ValidationError ||
    err instanceof NotFoundError ||
    err instanceof ConflictError
  ) {
    res.status(err.status).json({ ok: false, error: err.message });
    return;
  }

  console.error(`${context} failed`, err);
  res.status(500).json({ ok: false, error: "internal_error" });
}

/**
 * Initializes and configures the Express HTTP server.
 * Registers all API endpoints and middleware.
 * @returns Configured Express application instance
 */
export function initializeHttp(): Express {
  const app = express();
  app.use(json());

  app.get(`/api/hello.get`, async (req: Request, res: Response) => {
    res.json({ ok: true, msg: "hello", params: req.query });
  });

  app.post(`/api/hello.post`, async (req: Request, res: Response) => {
    res.json({ ok: true, msg: "hello", params: req.query, body: req.body });
  });

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

  return app;
}
