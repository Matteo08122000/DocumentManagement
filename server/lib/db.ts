import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../shared/schema";


console.log("✅ ENV CHECK:", {
  DB_HOST: process.env.DB_HOST,
  DB_USERNAME: process.env.DB_USERNAME,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_DATABASE: process.env.DB_DATABASE,
});

const pool = mysql.createPool({
  uri: process.env.MYSQL_URL!, // deve esserci nel .env
});

export const db = drizzle(pool, { schema, mode: "default" });
