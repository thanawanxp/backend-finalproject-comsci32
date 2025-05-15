import { AppDataSource } from "../db";

export const getAllMaintenanceFeesWithUser = async () => {
  return await AppDataSource.query(`
    SELECT 
      mf.id_maintenance_fees,
      ti.room_number,
      us.user_name,
      mf.total_amount,
      mf.created_at,
      mf.status_maintenance_fees,
      TO_BASE64(mf.money_maintenance_fees_slip) AS money_maintenance_fees_slip
    FROM comsci32.maintenance_fees AS mf
    LEFT JOIN comsci32.tenant_info AS ti ON mf.tenant_id = ti.tenant_id
    LEFT JOIN comsci32.users AS us ON ti.user_id = us.user_id
    ORDER BY mf.created_at DESC;
  `);
};
