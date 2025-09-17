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
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { DeleteMultipleDto } from './dto/delete-multiple.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../auth/entities/user.entity';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Express, Response } from 'express';

@Controller('entries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntriesController {
  constructor(
    @Inject(EntriesService)
    private readonly entriesService: EntriesService,
  ) { }

  @Post()
  @Roles(UserRole.DAILY_ADMIN, UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  create(@Body() createEntryDto: CreateEntryDto) {
    return this.entriesService.create(createEntryDto);
  }

  @Get()
  @Roles(UserRole.DAILY_ADMIN, UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  findAll() {
    return this.entriesService.findAll();
  }

  @Get('statistics')
  @Roles(UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  getStatistics() {
    return this.entriesService.getStatistics();
  }

  @Get('date-range')
  @Roles(UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.entriesService.findByDateRange(startDate, endDate);
  }

  @Get(':id')
  @Roles(UserRole.DAILY_ADMIN, UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  findOne(@Param('id') id: string) {
    return this.entriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.DAILY_ADMIN, UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  update(@Param('id') id: string, @Body() updateEntryDto: UpdateEntryDto) {
    return this.entriesService.update(id, updateEntryDto);
  }

  @Post(':id/photo')
  @Roles(UserRole.DAILY_ADMIN, UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads',
        // Ya no generamos nombre aquí, usamos el que viene del frontend
        filename: (req, file, cb) => {
          cb(null, file.originalname); // Usa el nombre que viene del frontend
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
          return cb(new Error('Solo se permiten archivos de imagen'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const photoUrl = `/uploads/${file.filename}`;
    return this.entriesService.update(id, { photoUrl });
  }

  @Get(':id/photo')
  async getPhoto(@Param('id') id: string, @Res() res: Response) {
    const entry = await this.entriesService.findOne(id);

    // Si no hay foto guardada, devolvemos un placeholder o un 404
    if (!entry || !entry.photoUrl) {
      return res.status(404).send('Foto no encontrada');
    }

    // Construye la ruta absoluta al archivo en /uploads
    const filePath = join(
      process.cwd(),
      'uploads',
      entry.photoUrl.replace(/^\/uploads\//, ''),
    );

    return res.sendFile(filePath);
  }

  @Delete(':id')
  @Roles(UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  remove(@Param('id') id: string) {
    return this.entriesService.remove(id);
  }

  @Delete()
  @Roles(UserRole.WEEKLY_ADMIN, UserRole.YEARLY_ADMIN)
  deleteMultiple(
    @Body() deleteMultipleDto: DeleteMultipleDto,
    @GetUser() user: User,
  ) {
    return this.entriesService.deleteMultiple(deleteMultipleDto, user);
  }

  @Post('cleanup')
  @Roles(UserRole.YEARLY_ADMIN)
  manualCleanup(@GetUser() user: User) {
    return this.entriesService.manualCleanup(user);
  }
}
