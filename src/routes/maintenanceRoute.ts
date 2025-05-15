import { Elysia } from "elysia";
import { AppDataSource } from "../db";
import { getAllMaintenanceFeesWithUser } from "../controllers/maintenanceController";
import { verifyToken } from "../middlewares/verifyToken";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // กำหนดขนาดสูงสุดของไฟล์เป็น 5MB

export const maintenanceRoute = new Elysia().group(
  "/maintenancefees",
  (app) => {
    console.log("🔐 maintenanceRoute group /maintenancefees is loaded");

    // ✅ 1. ดึงข้อมูลทั้งหมด
    app.get("/maintenanceFeesAll", async () => {
      try {
        const maintenanceFees = await getAllMaintenanceFeesWithUser();
        return maintenanceFees;
      } catch (error: any) {
        console.error("❌ Error fetching maintenance fees:", error.message);
        return { error: "Failed to fetch maintenance fees", code: 500 };
      }
    });

    // ✅ 2. เพิ่มข้อมูลใหม่
    app.post("/add", async ({ request }) => {
      try {
        const form = await request.formData();

        const tenant_id = form.get("tenant_id")?.toString();
        const created_at_raw = form.get("created_at")?.toString();
        const created_at = created_at_raw?.substring(0, 10);
        const total_amount = form.get("total_amount")?.toString();
        const status_maintenance_fees = form
          .get("status_maintenance_fees")
          ?.toString();
        const money_maintenance_fees_slip = form.get(
          "money_maintenance_fees_slip"
        );

        // ✅ ตรวจสอบเฉพาะ field ที่จำเป็นจริง ๆ (ไม่ต้องบังคับแนบไฟล์)
        if (
          !tenant_id ||
          !total_amount ||
          !created_at ||
          !status_maintenance_fees
        ) {
          return { error: "Missing required fields", code: 400 };
        }

        // ✅ ตรวจสอบเฉพาะกรณีที่แนบไฟล์
        let slipBuffer: Buffer | null = null;
        if (money_maintenance_fees_slip instanceof File) {
          if (money_maintenance_fees_slip.size > MAX_FILE_SIZE) {
            return {
              error: "ไฟล์ขนาดใหญ่เกินไป กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB",
              code: 400,
            };
          }

          slipBuffer = Buffer.from(
            await money_maintenance_fees_slip.arrayBuffer()
          );
        }

        // ✅ เพิ่มเข้า DB โดย slipBuffer เป็น null ได้
        await AppDataSource.query(
          `INSERT INTO comsci32.maintenance_fees (
            tenant_id, created_at, status_maintenance_fees, money_maintenance_fees_slip, total_amount
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            tenant_id,
            created_at,
            status_maintenance_fees,
            slipBuffer,
            total_amount,
          ]
        );

        return {
          message: "เพิ่มข้อมูลบิลค่าส่วนกลางสำเร็จ",
          data: {
            tenant_id,
            total_amount,
            created_at,
            status_maintenance_fees,
          },
        };
      } catch (error: any) {
        console.error("❌ Error adding maintenance bill:", error.message);
        return {
          error: "เกิดข้อผิดพลาดในการเพิ่มบิล",
          details: error.message,
          code: 500,
        };
      }
    });

    // ✅ 3. แก้ไขข้อมูล
    app.put("/edit/:id", async ({ params, request }) => {
      try {
        const { id } = params;
        const form = await request.formData();

        const fields: string[] = [];
        const values: any[] = [];

        const tenant_id = form.get("tenant_id")?.toString();
        const created_at_raw = form.get("created_at")?.toString();
        const created_at = created_at_raw?.substring(0, 10);
        const total_amount = form.get("total_amount")?.toString();
        const status_maintenance_fees = form
          .get("status_maintenance_fees")
          ?.toString();
        const money_maintenance_fees_slip = form.get(
          "money_maintenance_fees_slip"
        );

        if (tenant_id) {
          fields.push("tenant_id = ?");
          values.push(tenant_id);
        }
        if (created_at) {
          fields.push("created_at = ?");
          values.push(created_at);
        }
        if (total_amount) {
          fields.push("total_amount = ?");
          values.push(total_amount);
        }
        if (status_maintenance_fees) {
          fields.push("status_maintenance_fees = ?");
          values.push(status_maintenance_fees);
        }
        if (money_maintenance_fees_slip instanceof File) {
          const slipBuffer = Buffer.from(
            await money_maintenance_fees_slip.arrayBuffer()
          );
          fields.push("money_maintenance_fees_slip = ?");
          values.push(slipBuffer);
        }

        if (fields.length === 0) {
          return { message: "ไม่มีข้อมูลที่จะแก้ไข", code: 400 };
        }

        values.push(id);

        await AppDataSource.query(
          `UPDATE comsci32.maintenance_fees SET ${fields.join(
            ", "
          )} WHERE id_maintenance_fees = ?`,
          values
        );

        return { message: "อัปเดตข้อมูลบิลค่าส่วนกลางสำเร็จ" };
      } catch (error: any) {
        console.error("❌ Error updating maintenance fees:", error.message);
        return {
          error: "Failed to update maintenance fees",
          details: error.message,
        };
      }
    });

    app.get("/image/:tenant_id", async ({ params, query }) => {
      const { tenant_id } = params;
      const { type } = query; // money_maintenance_fees_slip

      // ตรวจสอบว่า type ที่ส่งมาถูกต้องหรือไม่
      if (!["money_maintenance_fees_slip"].includes(type)) {
        return {
          error:
            "ประเภทไฟล์ไม่ถูกต้อง (type ต้องเป็น money_maintenance_fees_slip)",
        };
      }

      const fieldName = "money_maintenance_fees_slip"; // กำหนดฟิลด์ที่ต้องการดึงข้อมูล

      try {
        // ดึงข้อมูลจากฐานข้อมูล (เลือกฟิลด์ที่ตรงกับประเภทที่เลือก)
        const result = await AppDataSource.query(
          `SELECT ${fieldName} AS image FROM comsci32.maintenance_fees WHERE tenant_id = ?`,
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
        const { status_maintenance_fees } = await request.json();

        if (!status_maintenance_fees) {
          return { error: "Missing status_maintenance_fees", code: 400 };
        }

        await AppDataSource.query(
          `UPDATE comsci32.maintenance_fees SET status_maintenance_fees = ? WHERE id_maintenance_fees = ?`,
          [status_maintenance_fees, id]
        );

        return { message: "อัปเดตสถานะการชำระเงินสำเร็จ" };
      } catch (err) {
        console.error("❌ Error updating status:", err.message);
        return { error: "Failed to update status", details: err.message };
      }
    });

    // ✅ ดึงข้อมูลบิลค่าน้ำเฉพาะ user_id
    app.get(
      "/user-maintenance-bills/:user_id",
      async ({ params, request, set }) => {
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
          mf.id_maintenance_fees,
          mf.tenant_id,
          ti.room_number,
          us.user_name,
          mf.total_amount,
          mf.created_at,
          mf.status_maintenance_fees,
          TO_BASE64(mf.money_maintenance_fees_slip) AS money_maintenance_fees_slip
        FROM comsci32.maintenance_fees mf
        LEFT JOIN comsci32.tenant_info ti ON mf.tenant_id = ti.tenant_id
        LEFT JOIN comsci32.users us ON ti.user_id = us.user_id
        WHERE us.user_id = ?
        ORDER BY mf.created_at DESC
        `,
            [user_id]
          );

          return result;
        } catch (error: any) {
          console.error(
            "❌ Error fetching user maintenance fees:",
            error.message
          );
          return {
            error: "ไม่สามารถดึงข้อมูลบิลค่าส่วนกลางของผู้ใช้งานได้",
            details: error.message,
            code: 500,
          };
        }
      }
    );

    // ✅ ลบข้อมูลบิลค่าส่วนกลาง
    app.delete("/delete/:id", async ({ params }) => {
      const { id } = params;
      try {
        await AppDataSource.query(
          `DELETE FROM comsci32.maintenance_fees WHERE id_maintenance_fees = ?`,
          [id]
        );
        return { message: "ลบบิลค่าส่วนกลางสำเร็จ" };
      } catch (error: any) {
        console.error("\u274C Error deleting maintenance fees:", error.message);
        return {
          error: "ไม่สามารถลบบิลค่าส่วนกลางได้",
          details: error.message,
        };
      }
    });
 
    return app;
  }
);
