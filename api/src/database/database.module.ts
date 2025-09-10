import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ScheduleModule } from "@nestjs/schedule"
//import { DatabaseCleanupService } from "./database-cleanup.service"
import { VehicleEntry } from "../entries/entities/entry.entity"
import { User } from "../auth/entities/user.entity"

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([VehicleEntry, User])],
  // providers: [DatabaseCleanupService],
  // exports: [DatabaseCleanupService],
})
export class DatabaseModule {}
