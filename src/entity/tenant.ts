import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { UserEntity } from "./user";  // import UserEntity

@Entity("tenant_info")
export class TenantEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => UserEntity, (user) => user.tenants)
  user: UserEntity;

  @Column()
  room_number!: String;  

  @Column()
  name_surname!: string;

  @Column()
  rental_contract_type!: string;

  @Column("decimal", { precision: 10 })
  rent!: number;

  @Column({ nullable: true })
  id_card_file!: string | null;

  @Column({ nullable: true })
  insurance!: string | null;

  @Column({ nullable: true })
  rental_contract_file!: string | null;

  @Column({ type: "date" })
  date!: string;
}
