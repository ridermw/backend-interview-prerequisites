import { sqlConnection } from "../database";
import { BaseAPI } from "./base";

interface Thing {
  id: number;
  name: string;
}

export class ThingsAPI extends BaseAPI {
  static async getThings(): Promise<Thing[]> {
    const db = await sqlConnection();
    return await db.all<Thing>("SELECT * FROM `things`");
  }
}

// Convenience exports for backward compatibility
export const getThings = ThingsAPI.getThings;
