import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { MulterModule } from "@nestjs/platform-express"
import { EntriesService } from "./entries.service"
import { EntriesController } from "./entries.controller"
import { VehicleEntry } from "./entities/entry.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([VehicleEntry]),
    MulterModule.register({
      dest: "./uploads",
    }),
  ],
  controllers: [EntriesController],
  providers: [EntriesService],
  exports: [EntriesService],
})
export class EntriesModule {}
