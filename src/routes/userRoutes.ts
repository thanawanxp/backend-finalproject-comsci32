import { Elysia } from "elysia";
import { registerUser } from "../controllers/userController";
import { AppDataSource } from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config(); // โหลด .env

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not defined in .env file");
}

export const userRoute = new Elysia().group("/user", (app) => {
  console.log("🔐 userRoute group /user is loaded");

  app.get("/usernames", async () => {
    try {
      const query = "SELECT user_name FROM users";
      const results = await AppDataSource.query(query);
      return results;
    } catch (err) {
      console.error("Error fetching user names:", err);
      return { error: "Database error" };
    }
  });

  app.post("/registerUser", async (context) => {
    console.log("📥 POST /user/registerUser called");
    return await registerUser(context);
  });

  app.post(
    "/login",
    async ({
      body,
      set,
    }: {
      body: { email: string; password: string };
      set: any;
    }) => {
      const { email, password } = body;

      const rows = await AppDataSource.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email]
      );

      if (rows.length === 0) {
        set.status = 401;
        return { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
      }

      const user = rows[0];

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        set.status = 401;
        return { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
      }

      const token = jwt.sign(
        {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "2h" }
      );

      return {
        message: "เข้าสู่ระบบสำเร็จ",
        token,
        user_id: user.user_id,
        role: user.role,
        email: user.email,
        user_name: user.user_name,
      };
    }
  );

  app.post("/logout", async ({ set }) => {
    console.log("🚪 POST /user/logout called");

    set.status = 200;
    return {
      message: "ออกจากระบบสำเร็จ",
      redirect: "/",
    };
  });

  return app;
});
