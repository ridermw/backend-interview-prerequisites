import { resetDb, sqlConnection } from "../database";
import { getUsers, getUserById, createUser, updateUserStatus } from "./users";

describe("users api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates a new user", async () => {
    const user = await createUser("alice", "alice@example.com", "Alice Smith");

    expect(user).toMatchObject({
      username: "alice",
      email: "alice@example.com",
      display_name: "Alice Smith",
      status: "active",
    });
    expect(user.id).toBeGreaterThan(0);
  });

  it("retrieves a user by id", async () => {
    const created = await createUser("bob", "bob@example.com");
    const retrieved = await getUserById(created.id);

    expect(retrieved).toEqual(created);
  });

  it("returns all users", async () => {
    await createUser("alice", "alice@example.com");
    await createUser("bob", "bob@example.com");
    await createUser("carol", "carol@example.com");

    const users = await getUsers();

    expect(users).toHaveLength(3);
    expect(users.map((u) => u.username)).toEqual(["alice", "bob", "carol"]);
  });

  it("updates user status", async () => {
    const user = await createUser("dave", "dave@example.com");
    const updated = await updateUserStatus(user.id, "away");

    expect(updated?.status).toBe("away");
  });

  it("returns empty array when no users exist", async () => {
    const users = await getUsers();
    expect(users).toEqual([]);
  });
});
