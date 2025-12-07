// Simple script to initialize the database
import { sqlConnection } from "./src/database";

async function initDatabase() {
  console.log("Initializing database...");
  const db = await sqlConnection();
  console.log("Database created successfully at src/database/datastore.db");
  process.exit(0);
}

initDatabase().catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
