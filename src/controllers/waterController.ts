import { AppDataSource } from "../db";

export const getAllWaterBillsWithUser = async () => {
  return await AppDataSource.query(`
    SELECT 
      wb.id_water_bills,
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
    FROM comsci32.water_bills AS wb
    LEFT JOIN comsci32.tenant_info AS ti ON wb.tenant_id = ti.tenant_id
    LEFT JOIN comsci32.users AS us ON ti.user_id = us.user_id
    ORDER BY ti.room_number ASC, wb.created_at DESC;
  `);
};
