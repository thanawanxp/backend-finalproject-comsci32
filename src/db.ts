
import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD ;
const DB_DATABASE = process.env.DB_DATABASE ;

export const AppDataSource = new DataSource({
  type: "mysql",
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  synchronize: true,
});

