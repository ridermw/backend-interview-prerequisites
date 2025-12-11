import { sqlConnection } from "../database";
import { BaseAPI } from "./base";

export interface User {
  id: number;
  username: string;
  display_name: string | null;
  email: string;
  status: string;
  created_at: string;
}

export class UsersService extends BaseAPI {
  constructor(private readonly dbProvider = sqlConnection) {
    super();
  }

  private async db() {
    return this.dbProvider();
  }

  /**
   * Retrieves all users in the system.
   * @returns Array of all users
   */
  async getUsers(): Promise<User[]> {
    const db = await this.db();
    return await db.all<User>("SELECT * FROM `users`");
  }

  /**
   * Retrieves a specific user by ID.
   * @param id - The ID of the user
   * @returns The user if found, undefined otherwise
   */
  async getUserById(id: number): Promise<User | undefined> {
    const db = await this.db();
    return await db.get<User>("SELECT * FROM `users` WHERE id = $id", {
      $id: id,
    });
  }

  /**
   * Creates a new user.
   * @param username - The unique username
   * @param email - The user's email address
   * @param displayName - Optional display name (defaults to null)
   * @returns The created user
   */
  async createUser(
    username: string,
    email: string,
    displayName?: string | null,
  ): Promise<User> {
    const validatedDisplayName =
      displayName === undefined || displayName === null
        ? null
        : this.validateString(displayName, "displayName", {
            maxLength: 128,
            trim: true,
          });
    const params = {
      username: this.validateString(username, "username", {
        required: true,
        maxLength: 64,
        trim: true,
      }),
      email: this.validateString(email, "email", {
        required: true,
        maxLength: 255,
        trim: true,
      }),
      displayName: validatedDisplayName === "" ? null : validatedDisplayName,
    };

    const db = await this.db();
    const result = await db.run(
      "INSERT INTO `users` (`username`, `email`, `display_name`) VALUES ($username, $email, $displayName)",
      {
        $username: params.username,
        $email: params.email,
        $displayName: params.displayName,
      },
    );

    const user = await this.getUserById(result.lastID);
    if (!user) {
      throw new Error("Failed to create user");
    }
    return user;
  }

  /**
   * Updates a user's status.
   * @param id - The ID of the user
   * @param status - The new status value
   * @returns The updated user if found, undefined otherwise
   */
  async updateUserStatus(
    id: number,
    status: string,
  ): Promise<User | undefined> {
    const params = {
      id,
      status: this.validateString(status, "status", {
        required: true,
        maxLength: 32,
        trim: true,
      }),
    };

    const db = await this.db();
    await db.run("UPDATE `users` SET status = $status WHERE id = $id", {
      $id: params.id,
      $status: params.status,
    });

    return await this.getUserById(params.id);
  }
}

export const usersService = new UsersService();
