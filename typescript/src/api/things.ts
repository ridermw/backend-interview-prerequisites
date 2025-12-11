import { sqlConnection } from "../database";
import { BaseAPI } from "./base";

interface Thing {
  id: number;
  name: string;
}

export class ThingsService extends BaseAPI {
  constructor(private readonly dbProvider = sqlConnection) {
    super();
  }

  private async db() {
    return this.dbProvider();
  }

  /**
   * Retrieves all things from the database.
   * @returns Array of all things
   */
  async getThings(): Promise<Thing[]> {
    const db = await this.db();
    return await db.all<Thing>("SELECT * FROM `things`");
  }
}

export const thingsService = new ThingsService();
