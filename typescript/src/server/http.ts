import express, { Express, Request, Response, json } from "express";
import { createChannel } from "../api/channels";
import { ValidationError, ConflictError, NotFoundError } from "../api/base";

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

export function initializeHttp(): Express {
  const app = express();
  app.use(json());

  app.get(`/api/hello.get`, async (req: Request, res: Response) => {
    res.json({ ok: true, msg: "hello", params: req.query });
  });

  app.post(`/api/hello.post`, async (req: Request, res: Response) => {
    res.json({ ok: true, msg: "hello", params: req.query, body: req.body });
  });

  app.post(`/api/channels.create`, async (req: Request, res: Response) => {
    const { workspaceId, name, topic, isPrivate, userId } = req.body ?? {};

    try {
      const channel = await createChannel(
        Number(workspaceId),
        name,
        topic,
        isPrivate,
        userId === undefined ? undefined : Number(userId),
      );
      res.json({ ok: true, channel });
    } catch (err: unknown) {
      handleApiError(err, res, "channels.create");
    }
  });

  return app;
}
