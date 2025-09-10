import type { TypeOrmModuleOptions } from "@nestjs/typeorm"
import { VehicleEntry } from "../entries/entities/entry.entity"
import { User } from "../auth/entities/user.entity"

export const databaseConfig: TypeOrmModuleOptions = {
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port:  5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "test",
  database: process.env.DB_NAME || "test",
  entities: [VehicleEntry, User],
  synchronize: process.env.NODE_ENV !== "production",
  logging: process.env.NODE_ENV === "development",
}
