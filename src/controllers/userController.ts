import { AppDataSource } from "../db";
import bcrypt from "bcryptjs";

export const registerUser = async (context) => {
  try {
    const { email, user_name, password, phone, role } = context.body;

    console.log("📥 รับข้อมูลผู้ใช้:", context.body);

    // เช็คอีเมลซ้ำ
    const existing = await AppDataSource.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return new Response(JSON.stringify({ message: "อีเมลนี้ถูกใช้แล้ว" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await AppDataSource.query(
      `INSERT INTO users (email, user_name, password, phone, role)
       VALUES (?, ?, ?, ?, ?)`,
      [email, user_name, hashedPassword, phone, role || "user"]
    );

    return new Response(JSON.stringify({ message: "✅ สมัครสมาชิกสำเร็จ" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการสมัครสมาชิก:", error);

    return new Response(
      JSON.stringify({ message: "❌ มีข้อผิดพลาดภายในเซิร์ฟเวอร์" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

