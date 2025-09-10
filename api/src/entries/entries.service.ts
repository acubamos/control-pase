import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { type Repository, Between, Not, IsNull } from "typeorm"
import { VehicleEntry } from "./entities/entry.entity"
import type { CreateEntryDto } from "./dto/create-entry.dto"
import type { UpdateEntryDto } from "./dto/update-entry.dto"
import type { DeleteMultipleDto } from "./dto/delete-multiple.dto"
import { type User, UserRole } from "../auth/entities/user.entity"

@Injectable()
export class EntriesService {
  constructor(
    @InjectRepository(VehicleEntry)
    private readonly entryRepository: Repository<VehicleEntry>,
  ) {}

  async create(createEntryDto: CreateEntryDto): Promise<VehicleEntry> {
    const entry = this.entryRepository.create(createEntryDto)
    return await this.entryRepository.save(entry)
  }

  async findAll(): Promise<VehicleEntry[]> {
    return await this.entryRepository.find({
      order: { createdAt: "DESC" },
    })
  }

  async findOne(id: string): Promise<VehicleEntry> {
    const entry = await this.entryRepository.findOne({ where: { id } })
    if (!entry) {
      throw new NotFoundException(`Entry with ID ${id} not found`)
    }
    return entry
  }

  async update(id: string, updateEntryDto: UpdateEntryDto): Promise<VehicleEntry> {
    const entry = await this.findOne(id)
    Object.assign(entry, updateEntryDto)
    return await this.entryRepository.save(entry)
  }

  async remove(id: string): Promise<void> {
    const entry = await this.findOne(id)
    await this.entryRepository.remove(entry)
  }

  async deleteMultiple(
    deleteMultipleDto: DeleteMultipleDto,
    user: User,
  ): Promise<{ deletedCount: number; message: string }> {
    if (!user.getPermissions().canDeleteEntries) {
      throw new ForbiddenException("No tienes permisos para eliminar entradas")
    }

    const { ids } = deleteMultipleDto
    const entries = await this.entryRepository.findByIds(ids)

    if (entries.length === 0) {
      throw new NotFoundException("No se encontraron entradas para eliminar")
    }

    await this.entryRepository.remove(entries)

    return {
      deletedCount: entries.length,
      message: `${entries.length} entradas eliminadas correctamente`,
    }
  }

  async getStatistics(): Promise<any> {
    const total = await this.entryRepository.count()
    const completed = await this.entryRepository.count({
      where: { fechaSalida: Not(IsNull()) },
    })
    const pending = total - completed

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayEntries = await this.entryRepository.count({
      where: {
        createdAt: Between(today, tomorrow),
      },
    })

    return {
      total,
      completed,
      pending,
      todayEntries,
    }
  }

  async findByDateRange(startDate: string, endDate: string): Promise<VehicleEntry[]> {
    return await this.entryRepository.find({
      where: {
        createdAt: Between(new Date(startDate), new Date(endDate)),
      },
      order: { createdAt: "DESC" },
    })
  }

  async manualCleanup(user: User): Promise<{ success: boolean; deletedCount: number; message: string }> {
    if (user.role !== UserRole.YEARLY_ADMIN) {
      throw new ForbiddenException("Solo los administradores anuales pueden realizar limpieza manual")
    }
    
    const entries = await this.entryRepository.find()
    await this.entryRepository.remove(entries)

    return {
      success: true,
      deletedCount: entries.length,
      message: `Limpieza manual completada. ${entries.length} entradas eliminadas.`,
    }
  }
}
