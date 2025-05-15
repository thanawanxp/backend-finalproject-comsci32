import formidable from "formidable";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ParsedFormData {
  fields: Record<string, any>;
  files: Record<string, formidable.File[]>;
}

export const parseFormData = (req): Promise<ParsedFormData> => {
  return new Promise((resolve, reject) => {
    const uploadDir = path.resolve(__dirname, "../uploads");

    // ✅ สร้างโฟลเดอร์ (recursive เผื่อ path ซ้อนหลายชั้น)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      multiples: true, // เผื่อในอนาคตรับหลายไฟล์
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error("❌ Error parsing form data:", err);
        return reject(err);
      }

      // 🔍 Log ตรวจสอบง่าย
      console.log("📥 Fields:", fields);
      console.log("📂 Files:", files);

      resolve({ fields, files });
    });
  });
};
