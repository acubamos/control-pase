import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

export enum UserRole {
  DAILY_ADMIN = "daily_admin",
  WEEKLY_ADMIN = "weekly_admin",
  YEARLY_ADMIN = "yearly_admin",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ unique: true })
  username: string

  @Column()
  password: string

  @Column()
  fullName: string

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.DAILY_ADMIN,
  })
  role: UserRole

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  getPermissions() {
    const basePermissions = {
      canCreateEntries: true,
      canEditEntries: true,
      canViewEntries: true,
    };
    const otherPermisions = {
      canViewStatistics: true,     
    };
    const otherPermisions2 = {
      canViewHistory: true,      
    };

    switch (this.role) {
      case UserRole.DAILY_ADMIN:  return { ...basePermissions }
      case UserRole.WEEKLY_ADMIN: return { ...basePermissions, ...otherPermisions2  }
      case UserRole.YEARLY_ADMIN: return { ...basePermissions, ...otherPermisions, ...otherPermisions2 }

      default:
        return basePermissions
    }
  }
}

