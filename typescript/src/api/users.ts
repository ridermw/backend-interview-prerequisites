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

export class UsersAPI extends BaseAPI {
  static async getUsers(): Promise<User[]> {
    const db = await sqlConnection();
    return await db.all<User>("SELECT * FROM `users`");
  }

  static async getUserById(id: number): Promise<User | undefined> {
    const db = await sqlConnection();
    return await db.get<User>("SELECT * FROM `users` WHERE id = $id", {
      $id: id,
    });
  }

  static async createUser(
    username: string,
    email: string,
    displayName?: string,
  ): Promise<User> {
    const db = await sqlConnection();
    const result = await db.run(
      "INSERT INTO `users` (`username`, `email`, `display_name`) VALUES ($username, $email, $displayName)",
      {
        $username: username,
        $email: email,
        $displayName: displayName || null,
      },
    );

    const user = await UsersAPI.getUserById(result.lastID);
    if (!user) {
      throw new Error("Failed to create user");
    }
    return user;
  }

  static async updateUserStatus(
    id: number,
    status: string,
  ): Promise<User | undefined> {
    const db = await sqlConnection();
    await db.run("UPDATE `users` SET status = $status WHERE id = $id", {
      $id: id,
      $status: status,
    });

    return await UsersAPI.getUserById(id);
  }
}

// Convenience exports for backward compatibility
export const getUsers = UsersAPI.getUsers;
export const getUserById = UsersAPI.getUserById;
export const createUser = UsersAPI.createUser;
export const updateUserStatus = UsersAPI.updateUserStatus;
