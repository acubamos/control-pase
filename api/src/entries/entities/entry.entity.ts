import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("vehicle_entries")
export class VehicleEntry {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  nombre: string

  @Column()
  apellidos: string

  @Column()
  ci: string

  @Column("simple-array")
  tipoVehiculo: string[]

  @Column()
  fechaEntrada: string

  @Column("json")
  lugarDestino: { [lugar: string]: string[] }

  @Column({ nullable: true })
  fechaSalida?: string

  @Column({ nullable: true })
  photoUrl?: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
