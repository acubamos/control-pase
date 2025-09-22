import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ConfigModule } from "@nestjs/config"
import { ServeStaticModule } from "@nestjs/serve-static"
import { join } from "path"
import { EntriesModule } from "./entries/entries.module"
import { AuthModule } from "./auth/auth.module"
import { DatabaseModule } from "./database/database.module"
import { databaseConfig } from "./config/database.config"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"

@Module({
 imports: [
   ConfigModule.forRoot({
     isGlobal: true,
   }),
   TypeOrmModule.forRoot(databaseConfig),
   ServeStaticModule.forRoot({
     rootPath: join(__dirname, "..", "uploads"),
     serveRoot: "/uploads",
   }),
   EntriesModule,   
   AuthModule,       
   DatabaseModule, 
 ],
 controllers: [AppController],
 providers: [AppService],
})
export class AppModule {}