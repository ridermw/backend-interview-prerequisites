import { sqlConnection } from "../database";

export interface User {
  id: number;
  username: string;
  display_name: string | null;
  email: string;
  status: string;
  created_at: string;
}

export async function getUsers(): Promise<User[]> {
  const db = await sqlConnection();
  return await db.all<User>("SELECT * FROM `users`");
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await sqlConnection();
  return await db.get<User>("SELECT * FROM `users` WHERE id = $id", {
    $id: id,
  });
}

export async function createUser(
  username: string,
  email: string,
  displayName?: string
): Promise<User> {
  const db = await sqlConnection();
  const result = await db.run(
    "INSERT INTO `users` (`username`, `email`, `display_name`) VALUES ($username, $email, $displayName)",
    {
      $username: username,
      $email: email,
      $displayName: displayName || null,
    }
  );

  const user = await getUserById(result.lastID);
  if (!user) {
    throw new Error("Failed to create user");
  }
  return user;
}

export async function updateUserStatus(
  id: number,
  status: string
): Promise<User | undefined> {
  const db = await sqlConnection();
  await db.run("UPDATE `users` SET status = $status WHERE id = $id", {
    $id: id,
    $status: status,
  });

  return await getUserById(id);
}
