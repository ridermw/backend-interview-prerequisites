import express, { Express, Request, Response, json } from "express";
import { ValidationError, ConflictError, NotFoundError } from "../api/base";
import { registerChannelsEndpoints } from "./http.channels";
import { registerMessagesEndpoints } from "./http.messages";
import { registerUsersEndpoints } from "./http.users";
import { Logger } from "../utils/logger";

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
export function handleApiError(
  err: unknown,
  res: Response,
  context: string,
): void {
  if (
    err instanceof ValidationError ||
    err instanceof NotFoundError ||
    err instanceof ConflictError
  ) {
    res.status(err.status).json({ ok: false, error: err.message });
    return;
  }

  Logger.error(`${context} failed`, "api", err);
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

  // Register all endpoints
  registerChannelsEndpoints(app);
  registerMessagesEndpoints(app);
  registerUsersEndpoints(app);

  return app;
}
