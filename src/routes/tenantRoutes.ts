import { Elysia } from "elysia";
import { getAllTenantsWithUser } from "../controllers/tenantController";
import { AppDataSource } from "../db";
import { IncomingForm } from "formidable";
import path from "path";
import fs from "fs";

const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

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

export const tenantRoute = new Elysia().group("/tenantInfo", (app) => {
  // app.get("/room_number", async () => {
  //   try {
  //     const query = `
  //       SELECT
  //         tenant_id,
  //         room_number,
  //         user_id,
  //         (SELECT user_name FROM users WHERE users.user_id = tenant_info.user_id) AS user_name
  //         FROM tenant_info
  //     `;
  //     const results = await AppDataSource.query(query);
  //     return results;
  //   } catch (err) {
  //     console.error("Error fetching room numbers:", err);
  //     return { error: "Database error" };
  //   }
  // });

  //===================================================================================================================
  // 🔹 GET: ดึงข้อมูลทั้งหมด
  app.get("/all", async () => {
    try {
      const tenants = await getAllTenantsWithUser();
      return tenants;
    } catch (error: any) {
      console.error("❌ Error fetching tenants:", error.message);
      return { error: "Failed to fetch tenants", code: 500 };
    }
  });
  // ========================================เพิ่มข้อมูลผู้เช่าใหม่===========================================================================
  // 🔹 POST: เพิ่มข้อมูลผู้เช่าใหม่
  app.post("/add", async ({ request }) => {
    try {
      const form = await request.formData();

      const user_id = form.get("user_id")?.toString();
      const room_number = form.get("room_number")?.toString();
      const rental_contract_type = form.get("rental_contract_type")?.toString();
      const moving_in_raw = form.get("moving_in")?.toString();
      const moving_in = moving_in_raw?.substring(0, 10);

      const image_idcard = form.get("image_idcard");
      const image_rental_contract = form.get("image_rental_contract");

      if (
        !user_id ||
        !room_number ||
        !rental_contract_type ||
        !moving_in ||
        !(image_idcard instanceof File) ||
        !(image_rental_contract instanceof File)
      ) {
        return { error: "Missing required fields or files", code: 400 };
      }

      const idcardBuffer = Buffer.from(await image_idcard.arrayBuffer());
      const contractBuffer = Buffer.from(
        await image_rental_contract.arrayBuffer()
      );

      await AppDataSource.query(
        `INSERT INTO comsci32.tenant_info (
          user_id, room_number, rental_contract_type, image_idcard, image_rental_contract, moving_in
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          room_number,
          rental_contract_type,
          idcardBuffer,
          contractBuffer,
          moving_in,
        ]
      );

      return {
        message: "เพิ่มข้อมูลผู้เช่าสำเร็จ",
        data: { user_id, room_number, rental_contract_type, moving_in },
      };
    } catch (error: any) {
      console.error("❌ Error adding tenant:", error.message);
      return {
        error: "เกิดข้อผิดพลาดในการเพิ่มผู้เช่า",
        details: error.message,
      };
    }
  });

  app.post("/showuser/:id", async ({ params }) => {
    const userId = Number(params.id);
    const rows = await AppDataSource.query(
      "SELECT * FROM comsci32.users WHERE user_id = ?",
      [userId]
    );

    // ถ้า rows เป็น array
    return rows[0] || { message: "User not found" };

    // ถ้า rows เป็น object (ตามที่คุณเจอ)
  });
  app.get("/allUsers", async () => {
    try {
      const results = await AppDataSource.query(
        "SELECT user_id, user_name FROM comsci32.users"
      );
      return results;
    } catch (err: any) {
      console.error("❌ Error fetching all users:", err.message);
      return {
        error: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้",
        details: err.message,
      };
    }
  });

  // ===========================================แก้ไขข้อมูลผู้เช่า=================================================================================
  // ✅ แก้ไขข้อมูลผู้เช่า
  app.put("/EditTenantForm/:id", async ({ params, request }) => {
    try {
      const { id } = params;
      const form = await request.formData();

      const user_id = form.get("user_id")?.toString();
      const room_number = form.get("room_number")?.toString();
      const rental_contract_type = form.get("rental_contract_type")?.toString();
      const moving_in_raw = form.get("moving_in")?.toString();
      const moving_in = moving_in_raw?.substring(0, 10);

      const image_idcard = form.get("image_idcard");
      const image_rental_contract = form.get("image_rental_contract");

      const updates: string[] = [];
      const values: any[] = [];

      if (user_id) {
        updates.push("user_id = ?");
        values.push(user_id);
      }
      if (room_number) {
        updates.push("room_number = ?");
        values.push(room_number);
      }
      if (rental_contract_type) {
        updates.push("rental_contract_type = ?");
        values.push(rental_contract_type);
      }
      if (moving_in) {
        updates.push("moving_in = ?");
        values.push(moving_in);
      }

      if (image_idcard instanceof File) {
        const buffer = Buffer.from(await image_idcard.arrayBuffer());
        updates.push("image_idcard = ?");
        values.push(buffer);
      }

      if (image_rental_contract instanceof File) {
        const buffer = Buffer.from(await image_rental_contract.arrayBuffer());
        updates.push("image_rental_contract = ?");
        values.push(buffer);
      }

      if (updates.length === 0) {
        return { message: "ไม่มีข้อมูลที่จะแก้ไข", code: 400 };
      }

      values.push(id);

      await AppDataSource.query(
        `UPDATE comsci32.tenant_info SET ${updates.join(
          ", "
        )} WHERE tenant_id = ?`,
        values
      );

      return { message: "อัปเดตข้อมูลผู้เช่าสำเร็จ" };
    } catch (error: any) {
      console.error("❌ Error updating tenant:", error.message);
      return {
        error: "เกิดข้อผิดพลาดในการแก้ไขผู้เช่า",
        details: error.message,
      };
    }
  });

  app.get("/image/:tenant_id", async ({ params, query }) => {
    const { tenant_id } = params;
    const { type } = query; // idcard หรือ contract

    if (!["idcard", "contract"].includes(type)) {
      return {
        error: "ประเภทไฟล์ไม่ถูกต้อง (type ต้องเป็น idcard หรือ contract)",
      };
    }

    const fieldName =
      type === "idcard" ? "image_idcard" : "image_rental_contract";

    try {
      const result = await AppDataSource.query(
        `SELECT ?? AS image FROM comsci32.tenant_info WHERE tenant_id = ?`,
        [fieldName, tenant_id]
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

  app.get("/name/:id", async ({ params }) => {
    const { id } = params;

    try {
      const result = await AppDataSource.query(
        "SELECT user_name FROM comsci32.users WHERE user_id = ?",
        [id]
      );

      if (result.length === 0) {
        return { error: "ไม่พบผู้ใช้ที่ระบุ" };
      }

      return { user_name: result[0].user_name };
    } catch (err: any) {
      console.error("❌ Error fetching user name:", err.message);
      return { error: "ดึงชื่อผู้ใช้ไม่สำเร็จ", details: err.message };
    }
  });

  // 🔹 DELETE: ลบข้อมูลผู้เช่าโดยใช้ tenant_id
  app.delete("/delete/:tenant_id", async ({ params }) => {
    const { tenant_id } = params;

    try {
      const result = await AppDataSource.query(
        "DELETE FROM comsci32.tenant_info WHERE tenant_id = ?",
        [tenant_id]
      );

      if (result.affectedRows === 0) {
        return { error: "ไม่พบผู้เช่าที่ต้องการลบ", code: 404 };
      }

      return { message: "ลบข้อมูลผู้เช่าสำเร็จ" };
    } catch (error) {
      console.error("❌ Error deleting tenant:", error);
      return {
        error: "เกิดข้อผิดพลาดในการลบผู้เช่า",
        details: error.message,
      };
    }
  });

  return app;
});
