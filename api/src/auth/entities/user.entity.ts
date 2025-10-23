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
      //canDeleteEntries: true,
    };
    const otherPermisions = {
      //canDeleteEntries: true,
      canViewHistory: true,
      canViewStatistics: true,
      //canDeleteEntries: false,
      //canViewHistory: false,
      //canManualCleanup: false,
      //canViewStatistics: false,
    };

    switch (this.role) {
      case UserRole.DAILY_ADMIN:  return { ...basePermissions }
      case UserRole.WEEKLY_ADMIN: return { ...basePermissions, ...canViewHistory  }
      case UserRole.YEARLY_ADMIN: return { ...basePermissions, ...otherPermisions }

      default:
        return basePermissions
    }
  }
}



//   getPermissions() {
//     const basePermissions = {
//       canCreateEntries: true,
//       canEditEntries: true,
//       canViewEntries: true,
//       //canDeleteEntries: true,
//     }

//     switch (this.role) {
//       case UserRole.DAILY_ADMIN:
//         return {
//           ...basePermissions,
//           canDeleteEntries: false,
//           canViewHistory: false,
//           canManualCleanup: false,
//           canViewStatistics: false,
//         }

//       case UserRole.WEEKLY_ADMIN:
//         return {
//           ...basePermissions,
//           canDeleteEntries: true,
//           canViewHistory: true,
//           canManualCleanup: false,
//           canViewStatistics: true,
//         }

//       case UserRole.YEARLY_ADMIN:
//         return {
//           ...basePermissions,
//           canDeleteEntries: true,
//           canViewHistory: true,
//           canManualCleanup: true,
//           canViewStatistics: true,
//         }

//       default:
//         return basePermissions
//     }
//   }
// }
