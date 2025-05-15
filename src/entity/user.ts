import { Column, Entity, OneToMany, PrimaryGeneratedColumn,  } from "typeorm";
import { TenantEntity } from "./tenant";

@Entity("users")
export class UserEntity {
  @PrimaryGeneratedColumn()
  user_id!: number;

  @Column()
  email!: string;

  @Column()
  user_name!: string;

  @OneToMany(() => TenantEntity, (tenant) => tenant.user)
  tenants: TenantEntity[];

  @Column()
  password!: string;

  @Column({ nullable: true })
  phone!: number;

  @Column({ type: "enum", enum: ["admin", "user"], default: "user" })
  role!: "admin" | "user";
}
