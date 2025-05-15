

import { App } from "./app";
import { AppDataSource } from "./db";

const PORT = 4000;

console.log("📦 Starting server...");

await AppDataSource.initialize(); // ✅ สำคัญมาก!
console.log("✅ เชื่อมต่อฐานข้อมูลสำเร็จ!");

const app = App().listen(PORT, (srv: any) => {
  const url = `http://${srv.hostname}:${srv.port}`;
  console.log(`✅ Elysia is running at ${url}`);
});
  
