import { Elysia } from "elysia";
import { getAllWaterBillsWithUser } from "../controllers/waterController";
import { AppDataSource } from "../db";
import fs from "fs";
import path from "path";
import { IncomingForm } from "formidable";
import { verifyToken } from "../middlewares/verifyToken";

const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const MAX_FILE_SIZE = 5 * 1024 * 1024; // กำหนดขนาดสูงสุดของไฟล์เป็น 5MB

// ฟังก์ชันแยกข้อมูล form + file
const parseFormData = (
  req: any
): Promise<{
  fields: Record<string, any>;
  files: Record<string, import("formidable").File[]>; // หรือ File[] ถ้า import แล้ว
}> => {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm(); // ✅ ใช้ IncomingForm โดยตรง
    form.uploadDir = uploadDir;
    form.keepExtensions = true;

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};

export const waterRoute = new Elysia().group("/water", (app) => {
  console.log("🔐 waterRoute group /water is loaded");

  app.get("/waterBills", async () => {
    try {
      const waterBill = await getAllWaterBillsWithUser();
      return waterBill;
    } catch (error: any) {
      console.error("❌ Error fetching water bills:", error.message);
      return { error: "Failed to fetch water bills", code: 500 };
    }
  });

  app.post("/add", async ({ request }) => {
    try {
      const form = await request.formData();

      const tenant_id = form.get("tenant_id")?.toString();
      const previous_unit = form.get("previous_unit")?.toString();
      const current_unit = form.get("current_unit")?.toString();
      const used_unit = form.get("used_unit")?.toString();
      const unit_price = form.get("unit_price")?.toString();
      const total_amount = form.get("total_amount")?.toString();
      const created_at_raw = form.get("created_at")?.toString();
      const created_at = created_at_raw?.substring(0, 10); // YYYY-MM-DD
      const money_transfer_slip = form.get("money_transfer_slip");
      const status_bills = form.get("status_bills")?.toString();

      // ตรวจสอบว่ามีการกรอกข้อมูลครบหรือไม่
      if (
        !tenant_id ||
        !previous_unit ||
        !current_unit ||
        !used_unit ||
        !unit_price ||
        !total_amount ||
        !created_at ||
        !status_bills
      ) {
        return { error: "Missing required fields", code: 400 };
      }

      // ✅ รองรับแบบมีหรือไม่มีไฟล์
      let money_transfer_slipBuffer: Buffer | null = null;

      if (money_transfer_slip instanceof File) {
        if (money_transfer_slip.size > MAX_FILE_SIZE) {
          return {
            error: "ไฟล์ขนาดใหญ่เกินไป กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB",
            code: 400,
          };
        }

        money_transfer_slipBuffer = Buffer.from(
          await money_transfer_slip.arrayBuffer()
        );
      }

      // บันทึกข้อมูลบิลค่าน้ำ
      await AppDataSource.query(
        `INSERT INTO comsci32.water_bills (
          tenant_id, previous_unit, current_unit, used_unit,
          unit_price, total_amount, created_at, money_transfer_slip,
          status_bills
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenant_id,
          previous_unit,
          current_unit,
          used_unit,
          unit_price,
          total_amount,
          created_at,
          money_transfer_slipBuffer, // ✅ เป็น null ได้
          status_bills,
        ]
      );

      return {
        message: "เพิ่มข้อมูลบิลค่าน้ำสำเร็จ",
        data: {
          tenant_id,
          previous_unit,
          current_unit,
          used_unit,
          unit_price,
          total_amount,
          created_at,
          status_bills,
        },
      };
    } catch (error: any) {
      console.error("❌ Error adding water bill:", error.message);
      return {
        error: "เกิดข้อผิดพลาดในการเพิ่มบิล",
        details: error.message,
        code: 500,
      };
    }
  });

  app.put("/EditWaterBillsForm/:id", async ({ params, request }) => {
    try {
      const { id } = params;
      const form = await request.formData();

      // ดึงข้อมูลจาก FormData
      const tenant_id = form.get("tenant_id");
      const previous_unit = form.get("previous_unit");
      const current_unit = form.get("current_unit");
      const used_unit = form.get("used_unit");
      const unit_price = form.get("unit_price");
      const total_amount = form.get("total_amount");
      const created_at_raw = form.get("created_at");
      const created_at = created_at_raw
        ? created_at_raw.toString().substring(0, 10)
        : null;
      const status_bills = form.get("status_bills");
      const money_transfer_slip = form.get("money_transfer_slip");

      const updates: string[] = [];
      const values: any[] = [];

      if (tenant_id) {
        updates.push("tenant_id = ?");
        values.push(tenant_id);
      }
      if (previous_unit) {
        updates.push("previous_unit = ?");
        values.push(previous_unit);
      }
      if (current_unit) {
        updates.push("current_unit = ?");
        values.push(current_unit);
      }
      if (used_unit) {
        updates.push("used_unit = ?");
        values.push(used_unit);
      }
      if (unit_price) {
        updates.push("unit_price = ?");
        values.push(unit_price);
      }
      if (total_amount) {
        updates.push("total_amount = ?");
        values.push(total_amount);
      }
      if (created_at) {
        updates.push("created_at = ?");
        values.push(created_at);
      }
      if (status_bills) {
        updates.push("status_bills = ?");
        values.push(status_bills);
      }
      if (money_transfer_slip instanceof File) {
        const buffer = Buffer.from(await money_transfer_slip.arrayBuffer());
        updates.push("money_transfer_slip = ?");
        values.push(buffer);
      }

      if (updates.length === 0) {
        return { message: "ไม่มีข้อมูลที่จะแก้ไข", code: 400 };
      }

      values.push(id); // ใช้ id_water_bills เป็นตัวระบุแถว

      await AppDataSource.query(
        `UPDATE comsci32.water_bills SET ${updates.join(
          ", "
        )} WHERE id_water_bills = ?`,
        values
      );

      return { message: "อัปเดตข้อมูลบิลค่าน้ำสำเร็จ" };
    } catch (error: any) {
      console.error("❌ Error updating water bill:", error.message);
      return { error: "Failed to update water bill", details: error.message };
    }
  });

  app.get("/image/:tenant_id", async ({ params, query }) => {
    const { tenant_id } = params;
    const { type } = query; // money_transfer_slip

    // ตรวจสอบว่า type ที่ส่งมาถูกต้องหรือไม่
    if (!["money_transfer_slip"].includes(type)) {
      return {
        error: "ประเภทไฟล์ไม่ถูกต้อง (type ต้องเป็น money_transfer_slip)",
      };
    }

    const fieldName = "money_transfer_slip"; // กำหนดฟิลด์ที่ต้องการดึงข้อมูล

    try {
      // ดึงข้อมูลจากฐานข้อมูล (เลือกฟิลด์ที่ตรงกับประเภทที่เลือก)
      const result = await AppDataSource.query(
        `SELECT ${fieldName} AS image FROM comsci32.water_bills WHERE tenant_id = ?`,
        [tenant_id]
      );

      if (!result || !result[0] || !result[0].image) {
        return { error: "ไม่พบรูปภาพในฐานข้อมูล" };
      }

      const imageBuffer = result[0].image;
      const base64 = `data:image/jpeg;base64,${Buffer.from(
        imageBuffer
      ).toString("base64")}`;

      return { base64 };
    } catch (err: any) {
      console.error("❌ Error fetching image:", err.message);
      return { error: "ดึงรูปภาพไม่สำเร็จ", detail: err.message };
    }
  });

  app.put("/updateStatus/:id", async ({ params, request }) => {
    try {
      const { id } = params;
      const { status_bills } = await request.json();

      if (!status_bills) {
        return { error: "Missing status_bills", code: 400 };
      }

      await AppDataSource.query(
        `UPDATE comsci32.water_bills SET status_bills = ? WHERE id_water_bills = ?`,
        [status_bills, id]
      );

      return { message: "อัปเดตสถานะการชำระเงินสำเร็จ" };
    } catch (err) {
      console.error("❌ Error updating status:", err.message);
      return { error: "Failed to update status", details: err.message };
    }
  });

  // ✅ ดึงข้อมูลบิลค่าน้ำเฉพาะ user_id
  app.get("/user-bills/:user_id", async ({ params, request, set }) => {
    const { user_id } = params;

    // ✅ ตรวจสอบว่า user_id ถูกส่งมาหรือไม่
    if (!user_id) {
      set.status = 400;
      return { error: "user_id is required", code: 400 };
    }

    // ✅ ตรวจสอบ token จาก header
    const result = verifyToken(request);
    if (!result.valid) {
      set.status = 401;
      return { error: "ไม่ได้รับอนุญาต", detail: result.error };
    }

    const tokenUserId = result.payload?.user_id;
    if (!tokenUserId || String(tokenUserId) !== String(user_id)) {
      set.status = 403;
      return { error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลของผู้ใช้นี้" };
    }

    try {
      const result = await AppDataSource.query(
        `
        SELECT 
          wb.id_water_bills,
          wb.tenant_id,
          ti.room_number,
          us.user_name,
          wb.previous_unit,
          wb.current_unit,
          wb.used_unit,
          wb.unit_price,
          wb.total_amount,
          wb.created_at,
          wb.status_bills,
          TO_BASE64(wb.money_transfer_slip) AS money_transfer_slip
        FROM comsci32.water_bills wb
        LEFT JOIN comsci32.tenant_info ti ON wb.tenant_id = ti.tenant_id
        LEFT JOIN comsci32.users us ON ti.user_id = us.user_id
        WHERE us.user_id = ?
        ORDER BY wb.created_at DESC
        `,
        [user_id]
      );

      return result;
    } catch (error: any) {
      console.error("❌ Error fetching user water bills:", error.message);
      return {
        error: "ไม่สามารถดึงข้อมูลบิลค่าน้ำของผู้ใช้งานได้",
        details: error.message,
        code: 500,
      };
    }
  });

  // ✅ ลบบิลค่าน้ำ
  app.delete("/delete/:id", async ({ params }) => {
    const { id } = params;

    try {
      const result = await AppDataSource.query(
        `DELETE FROM comsci32.water_bills WHERE id_water_bills = ?`,
        [id]
      );

      return { message: "ลบข้อมูลบิลค่าน้ำสำเร็จ" };
    } catch (error: any) {
      console.error("❌ Error deleting water bill:", error.message);
      return {
        error: "ไม่สามารถลบข้อมูลบิลค่าน้ำได้",
        details: error.message,
        code: 500,
      };
    }
  });

  return app;
});
