import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  Inject,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { EntriesService } from "./entries.service" // ← Quita 'type'
import { CreateEntryDto } from "./dto/create-entry.dto" // ← Quita 'type'
import { UpdateEntryDto } from "./dto/update-entry.dto" // ← Quita 'type'
import { DeleteMultipleDto } from "./dto/delete-multiple.dto" // ← Quita 'type'
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { User, UserRole } from "../auth/entities/user.entity" // ← Quita 'type'
import { diskStorage } from "multer"
import { extname } from "path"
import { Express } from "express" // ← Quita 'type'

@Controller("entries")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntriesController {
  constructor(
    @Inject(EntriesService) // ← Agrega @Inject()
    private readonly entriesService: EntriesService
  ) {}

  @Post()
  @Roles(UserRole.DAILY_ADMIN, UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  create(@Body() createEntryDto: CreateEntryDto) { // ← Agrega @Body()
    return this.entriesService.create(createEntryDto)
  }

  @Get()
  @Roles(UserRole.DAILY_ADMIN, UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  findAll() {
    return this.entriesService.findAll()
  }

  @Get("statistics")
  @Roles(UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  getStatistics() {
    return this.entriesService.getStatistics()
  }

  @Get("date-range")
  @Roles(UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  findByDateRange(@Query("startDate") startDate: string, @Query("endDate") endDate: string) {
    return this.entriesService.findByDateRange(startDate, endDate)
  }

  @Get(":id")
  @Roles(UserRole.DAILY_ADMIN, UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  findOne(@Param("id") id: string) {
    return this.entriesService.findOne(id)
  }

  @Patch(":id")
  @Roles(UserRole.DAILY_ADMIN, UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  update(@Param("id") id: string, @Body() updateEntryDto: UpdateEntryDto) { // ← Agrega @Body()
    return this.entriesService.update(id, updateEntryDto)
  }

  @Post(":id/photo")
  @Roles(UserRole.DAILY_ADMIN, UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  @UseInterceptors(
    FileInterceptor("photo", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join("")
          cb(null, `${randomName}${extname(file.originalname)}`)
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error("Solo se permiten archivos de imagen"), false)
        }
        cb(null, true)
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadPhoto(@Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    const photoUrl = `/uploads/${file.filename}`
    return this.entriesService.update(id, { photoUrl })
  }

  @Delete(":id")
  @Roles(UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  remove(@Param("id") id: string) {
    return this.entriesService.remove(id)
  }

  @Delete()
  @Roles(UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  deleteMultiple(@Body() deleteMultipleDto: DeleteMultipleDto, @GetUser() user: User) {
    return this.entriesService.deleteMultiple(deleteMultipleDto, user)
  }

  @Post("cleanup")
  @Roles(UserRole.YEARLY_ADMIN)
  manualCleanup(@GetUser() user: User) {
    return this.entriesService.manualCleanup(user)
  }
}