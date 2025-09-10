import { Injectable, Inject } from "@nestjs/common"
import { Repository, LessThan } from "typeorm"
import { InjectRepository } from "@nestjs/typeorm"
import { Cron, CronExpression } from "@nestjs/schedule"
import { VehicleEntry } from "../entries/entities/entry.entity"
import { User, UserRole } from "../auth/entities/user.entity"

@Injectable()
export class DatabaseCleanupService {
  constructor(
    @InjectRepository(VehicleEntry)
    private readonly entryRepository: Repository<VehicleEntry>,
    
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyCleanup() {
    console.log("Ejecutando limpieza diaria...")
  
    const dailyAdmins = await this.userRepository.find({
      where: { role: UserRole.DAILY_ADMIN },
    })
  
    if (dailyAdmins.length > 0) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(23, 59, 59, 999)
  
      const entriesToDelete = await this.entryRepository.find({
        where: {
          createdAt: LessThan(yesterday),
        },
      })
  
      if (entriesToDelete.length > 0) {
        await this.entryRepository.remove(entriesToDelete)
        console.log(`Limpieza diaria: ${entriesToDelete.length} entradas eliminadas`)
      }
    }
  }
  
  @Cron(CronExpression.EVERY_WEEK)
  async weeklyCleanup() {
    console.log("Ejecutando limpieza semanal...")
  
    const weeklyAdmins = await this.userRepository.find({
      where: { role: UserRole.WEEKLY_ADMIN },
    })
  
    if (weeklyAdmins.length > 0) {
      const lastWeek = new Date()
      lastWeek.setDate(lastWeek.getDate() - 7)
  
      const entriesToDelete = await this.entryRepository.find({
        where: {
          createdAt: LessThan(lastWeek),
        },
      })
  
      if (entriesToDelete.length > 0) {
        await this.entryRepository.remove(entriesToDelete)
        console.log(`Limpieza semanal: ${entriesToDelete.length} entradas eliminadas`)
      }
    }
  }
  
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async yearlyCleanup() {
    console.log("Ejecutando limpieza anual...")
  
    const yearlyAdmins = await this.userRepository.find({
      where: { role: UserRole.YEARLY_ADMIN },
    })
  
    if (yearlyAdmins.length > 0) {
      const lastYear = new Date()
      lastYear.setFullYear(lastYear.getFullYear() - 1)
  
      const entriesToDelete = await this.entryRepository.find({
        where: {
          createdAt: LessThan(lastYear),
        },
      })
  
      if (entriesToDelete.length > 0) {
        await this.entryRepository.remove(entriesToDelete)
        console.log(`Limpieza anual: ${entriesToDelete.length} entradas eliminadas`)
      }
    }
  }
}