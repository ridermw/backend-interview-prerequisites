import { Express, Request, Response } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUserStatus,
} from "../api/users";
import { ValidationError, NotFoundError } from "../api/base";
import { handleApiError } from "./http";

/**
 * Registers all users API endpoints.
 * @param app - Express application instance
 */
export function registerUsersEndpoints(app: Express): void {
  /**
   * GET /api/users.get
   * Retrieves all users.
   */
  app.get(`/api/users.get`, async (req: Request, res: Response) => {
    try {
      const users = await getUsers();
      res.json({ ok: true, users });
    } catch (err: unknown) {
      handleApiError(err, res, "users.get");
    }
  });

  /**
   * GET /api/users.getById
   * Retrieves a specific user by ID.
   * Query parameters: { id }
   */
  app.get(`/api/users.getById`, async (req: Request, res: Response) => {
    const id = req.query.id;

    try {
      if (!id || isNaN(Number(id))) {
        throw new ValidationError("id is required and must be a number");
      }

      const user = await getUserById(Number(id));
      if (!user) {
        throw new NotFoundError("user not found");
      }

      res.json({ ok: true, user });
    } catch (err: unknown) {
      handleApiError(err, res, "users.getById");
    }
  });

  /**
   * POST /api/users.create
   * Creates a new user.
   * Request body: { username, email, displayName? }
   */
  app.post(`/api/users.create`, async (req: Request, res: Response) => {
    const { username, email, displayName } = req.body ?? {};

    try {
      const user = await createUser(username, email, displayName);
      res.json({ ok: true, user });
    } catch (err: unknown) {
      handleApiError(err, res, "users.create");
    }
  });

  /**
   * POST /api/users.updateStatus
   * Updates a user's status.
   * Request body: { id, status }
   */
  app.post(`/api/users.updateStatus`, async (req: Request, res: Response) => {
    const { id, status } = req.body ?? {};

    try {
      const user = await updateUserStatus(id, status);
      if (!user) {
        throw new NotFoundError("user not found");
      }

      res.json({ ok: true, user });
    } catch (err: unknown) {
      handleApiError(err, res, "users.updateStatus");
    }
  });
}
