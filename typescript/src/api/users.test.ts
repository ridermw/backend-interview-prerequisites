import { resetDb } from "../database";
import { usersService } from "./users";

describe("users api", () => {
  beforeEach(() => {
    resetDb();
  });

  it("creates a new user", async () => {
    const user = await usersService.createUser(
      "alice",
      "alice@example.com",
      "Alice Smith",
    );

    expect(user).toMatchObject({
      username: "alice",
      email: "alice@example.com",
      display_name: "Alice Smith",
      status: "active",
    });
    expect(user.id).toBeGreaterThan(0);
  });

  it("retrieves a user by id", async () => {
    const created = await usersService.createUser("bob", "bob@example.com");
    const retrieved = await usersService.getUserById(created.id);

    expect(retrieved).toEqual(created);
  });

  it("returns all users", async () => {
    await usersService.createUser("alice", "alice@example.com");
    await usersService.createUser("bob", "bob@example.com");
    await usersService.createUser("carol", "carol@example.com");

    const users = await usersService.getUsers();

    expect(users).toHaveLength(3);
    expect(users.map((u) => u.username)).toEqual(["alice", "bob", "carol"]);
  });

  it("updates user status", async () => {
    const user = await usersService.createUser("dave", "dave@example.com");
    const updated = await usersService.updateUserStatus(user.id, "away");

    expect(updated?.status).toBe("away");
  });

  it("returns empty array when no users exist", async () => {
    const users = await usersService.getUsers();
    expect(users).toEqual([]);
  });

  /**
   * Edge case tests for input validation
   */
  describe("input validation", () => {
    /**
     * Validates that empty or invalid username is rejected in createUser.
     */
    it("rejects empty username in createUser", async () => {
      await expect(
        usersService.createUser("", "test@example.com"),
      ).rejects.toThrow("username is required");
      await expect(
        usersService.createUser("   ", "test@example.com"),
      ).rejects.toThrow("username is required");
      await expect(
        usersService.createUser(null as any, "test@example.com"),
      ).rejects.toThrow("username is required");
      await expect(
        usersService.createUser(undefined as any, "test@example.com"),
      ).rejects.toThrow("username is required");
    });

    /**
     * Validates that username exceeding maximum length is rejected.
     */
    it("rejects username that is too long in createUser", async () => {
      const longUsername = "x".repeat(65);
      await expect(
        usersService.createUser(longUsername, "test@example.com"),
      ).rejects.toThrow("username must be 64 characters or fewer");
    });

    /**
     * Validates that empty or invalid email is rejected in createUser.
     */
    it("rejects empty email in createUser", async () => {
      await expect(usersService.createUser("testuser", "")).rejects.toThrow(
        "email is required",
      );
      await expect(usersService.createUser("testuser", "   ")).rejects.toThrow(
        "email is required",
      );
      await expect(
        usersService.createUser("testuser", null as any),
      ).rejects.toThrow("email is required");
      await expect(
        usersService.createUser("testuser", undefined as any),
      ).rejects.toThrow("email is required");
    });

    /**
     * Validates that email exceeding maximum length is rejected.
     */
    it("rejects email that is too long in createUser", async () => {
      const longEmail = "x".repeat(256) + "@example.com";
      await expect(
        usersService.createUser("testuser", longEmail),
      ).rejects.toThrow("email must be 255 characters or fewer");
    });

    /**
     * Validates that displayName exceeding maximum length is rejected.
     */
    it("rejects displayName that is too long in createUser", async () => {
      const longDisplayName = "x".repeat(129);
      await expect(
        usersService.createUser(
          "testuser",
          "test@example.com",
          longDisplayName,
        ),
      ).rejects.toThrow("displayName must be 128 characters or fewer");
    });

    /**
     * Validates that empty or invalid status is rejected in updateUserStatus.
     */
    it("rejects empty status in updateUserStatus", async () => {
      const user = await usersService.createUser("alice", "alice@example.com");

      await expect(usersService.updateUserStatus(user.id, "")).rejects.toThrow(
        "status is required",
      );
      await expect(
        usersService.updateUserStatus(user.id, "   "),
      ).rejects.toThrow("status is required");
      await expect(
        usersService.updateUserStatus(user.id, null as any),
      ).rejects.toThrow("status is required");
    });

    /**
     * Validates that status exceeding maximum length is rejected.
     */
    it("rejects status that is too long in updateUserStatus", async () => {
      const user = await usersService.createUser("alice", "alice@example.com");
      const longStatus = "x".repeat(33);

      await expect(
        usersService.updateUserStatus(user.id, longStatus),
      ).rejects.toThrow("status must be 32 characters or fewer");
    });
  });

  /**
   * Edge case tests for special characters and content
   */
  describe("special content handling", () => {
    /**
     * Verifies that usernames with special characters are stored correctly.
     */
    it("handles usernames with special characters", async () => {
      const user = await usersService.createUser(
        "user-name_123",
        "test@example.com",
      );
      expect(user.username).toBe("user-name_123");
    });

    /**
     * Verifies that emails with special characters are stored correctly.
     */
    it("handles emails with special characters", async () => {
      const user = await usersService.createUser(
        "alice",
        "alice+test@example.co.uk",
      );
      expect(user.email).toBe("alice+test@example.co.uk");
    });

    /**
     * Verifies that display names with special characters are stored correctly.
     */
    it("handles display names with special characters and unicode", async () => {
      const user = await usersService.createUser(
        "alice",
        "alice@example.com",
        "Alice O'Brien 🎉",
      );
      expect(user.display_name).toBe("Alice O'Brien 🎉");
    });

    /**
     * Verifies that display names with quotes are stored correctly.
     */
    it("handles display names with quotes", async () => {
      const user = await usersService.createUser(
        "alice",
        "alice@example.com",
        'Alice "The Great" Smith',
      );
      expect(user.display_name).toBe('Alice "The Great" Smith');
    });

    /**
     * Verifies that maximum length values are handled correctly.
     */
    it("handles maximum length username", async () => {
      const maxUsername = "x".repeat(64);
      const user = await usersService.createUser(
        maxUsername,
        "test@example.com",
      );
      expect(user.username).toBe(maxUsername);
    });

    /**
     * Verifies that maximum length email is handled correctly.
     */
    it("handles maximum length email", async () => {
      const maxEmail = "x".repeat(245) + "@test.com"; // 255 total
      const user = await usersService.createUser("testuser", maxEmail);
      expect(user.email).toBe(maxEmail);
    });

    /**
     * Verifies that maximum length display name is handled correctly.
     */
    it("handles maximum length display name", async () => {
      const maxDisplayName = "x".repeat(128);
      const user = await usersService.createUser(
        "testuser",
        "test@example.com",
        maxDisplayName,
      );
      expect(user.display_name).toBe(maxDisplayName);
    });

    /**
     * Verifies that leading/trailing whitespace is trimmed from username.
     */
    it("trims whitespace from username", async () => {
      const user = await usersService.createUser(
        "  alice  ",
        "alice@example.com",
      );
      expect(user.username).toBe("alice");
    });

    /**
     * Verifies that leading/trailing whitespace is trimmed from email.
     */
    it("trims whitespace from email", async () => {
      const user = await usersService.createUser(
        "alice",
        "  alice@example.com  ",
      );
      expect(user.email).toBe("alice@example.com");
    });

    /**
     * Verifies that leading/trailing whitespace is trimmed from display name.
     */
    it("trims whitespace from display name", async () => {
      const user = await usersService.createUser(
        "alice",
        "alice@example.com",
        "  Alice Smith  ",
      );
      expect(user.display_name).toBe("Alice Smith");
    });

    /**
     * Verifies that leading/trailing whitespace is trimmed from status.
     */
    it("trims whitespace from status", async () => {
      const user = await usersService.createUser("alice", "alice@example.com");
      const updated = await usersService.updateUserStatus(user.id, "  away  ");
      expect(updated?.status).toBe("away");
    });
  });

  /**
   * Edge case tests for database constraints and uniqueness
   */
  describe("database constraints", () => {
    /**
     * Verifies that duplicate usernames are rejected by database constraint.
     */
    it("rejects duplicate username", async () => {
      await usersService.createUser("alice", "alice1@example.com");

      await expect(
        usersService.createUser("alice", "alice2@example.com"),
      ).rejects.toThrow();
    });

    /**
     * Verifies that duplicate emails are rejected by database constraint.
     */
    it("rejects duplicate email", async () => {
      await usersService.createUser("alice", "test@example.com");

      await expect(
        usersService.createUser("bob", "test@example.com"),
      ).rejects.toThrow();
    });

    /**
     * Verifies that getUserById returns undefined for non-existent user.
     */
    it("returns undefined for non-existent user", async () => {
      const user = await usersService.getUserById(99999);
      expect(user).toBeUndefined();
    });

    /**
     * Verifies that updateUserStatus returns undefined for non-existent user.
     */
    it("returns undefined when updating non-existent user status", async () => {
      const result = await usersService.updateUserStatus(99999, "away");
      expect(result).toBeUndefined();
    });
  });

  /**
   * Edge case tests for optional fields
   */
  describe("optional fields", () => {
    /**
     * Verifies that createUser works without display name.
     */
    it("creates user without display name", async () => {
      const user = await usersService.createUser("alice", "alice@example.com");
      expect(user.display_name).toBeNull();
    });

    /**
     * Verifies that createUser works with undefined display name.
     */
    it("creates user with explicit undefined display name", async () => {
      const user = await usersService.createUser(
        "alice",
        "alice@example.com",
        undefined,
      );
      expect(user.display_name).toBeNull();
    });

    /**
     * Verifies that empty string display name is accepted (after trim becomes empty and stored as null).
     */
    it("handles empty string display name", async () => {
      const user = await usersService.createUser(
        "alice",
        "alice@example.com",
        "",
      );
      expect(user.display_name).toBeNull();
    });
  });

  /**
   * Edge case tests for status values
   */
  describe("status handling", () => {
    /**
     * Verifies that various status values are handled correctly.
     */
    it("handles different status values", async () => {
      const user = await usersService.createUser("alice", "alice@example.com");

      let updated = await usersService.updateUserStatus(user.id, "online");
      expect(updated?.status).toBe("online");

      updated = await usersService.updateUserStatus(user.id, "offline");
      expect(updated?.status).toBe("offline");

      updated = await usersService.updateUserStatus(user.id, "dnd");
      expect(updated?.status).toBe("dnd");
    });

    /**
     * Verifies that default status is 'active' for new users.
     */
    it("sets default status to 'active' for new users", async () => {
      const user = await usersService.createUser("alice", "alice@example.com");
      expect(user.status).toBe("active");
    });

    /**
     * Verifies that maximum length status is handled.
     */
    it("handles maximum length status", async () => {
      const user = await usersService.createUser("alice", "alice@example.com");
      const maxStatus = "x".repeat(32);

      const updated = await usersService.updateUserStatus(user.id, maxStatus);
      expect(updated?.status).toBe(maxStatus);
    });
  });
});
