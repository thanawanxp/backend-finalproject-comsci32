import { AppDataSource } from "../db";

export const getAllTenantsWithUser = async () => {
  return await AppDataSource.query(`
 SELECT 
      ti.tenant_id,
      ti.room_number,
      us.user_name,
      ti.rental_contract_type,
      ti.image_idcard,
      ti.image_rental_contract,
      ti.moving_in,
      us.user_id

    FROM comsci32.tenant_info AS ti
    LEFT JOIN comsci32.users AS us ON us.user_id = ti.user_id
    ORDER BY ti.tenant_id
  `);
};

export const addTenant = async (tenantData: {
  user_name: string;
  room_number: string;
  rental_contract_type: string;
  image_idcard: string;
  image_rental_contract: string;
  moving_in: string;
}) => {
  const {
    user_name,
    room_number,
    rental_contract_type,
    image_idcard,
    image_rental_contract,
    moving_in,
  } = tenantData;

  try {
    // ตรวจสอบว่า user_name มีอยู่ในตาราง users หรือไม่
    if (!user_name || !room_number || !rental_contract_type || !moving_in) {
      throw new Error(
        "Missing required fields: user_name, room_number, rental_contract_type, or moving_in."
      );
    }

    const user = await AppDataSource.query(
      "SELECT user_id FROM users WHERE user_name = ?",
      [user_name]
    );

    if (user.length === 0) {
      throw new Error("User name does not exist in the users table.");
    }

    const user_id = user[0].user_id;

    // เพิ่มข้อมูลในตาราง tenant_info
    await AppDataSource.query(
      `INSERT INTO tenant_info (
        user_id, 
        room_number, 
        rental_contract_type, 
        image_idcard, 
        image_rental_contract, 
        moving_in
      ) VALUES (?, ?, ?, ?, ?, ?)`,

      [
        user_id,
        room_number,
        rental_contract_type,
        image_idcard,
        image_rental_contract,
        moving_in,
      ]
    );

    return { message: "Tenant added successfully" };
  } catch (error) {
    console.error("❌ Error adding tenant:", error.message);
    throw new Error(`Failed to add tenant: ${error.message}`);
  }
};
