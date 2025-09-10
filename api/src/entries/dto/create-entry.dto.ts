import { IsString, IsNotEmpty, IsArray, IsOptional, IsDateString, IsObject } from "class-validator"

export class CreateEntryDto {
  @IsString()
  @IsNotEmpty()
  nombre: string

  @IsString()
  @IsNotEmpty()
  apellidos: string

  @IsString()
  @IsNotEmpty()
  ci: string

  @IsArray()
  @IsString({ each: true })
  tipoVehiculo: string[]

  @IsString()
  @IsNotEmpty()
  chapa: string

  @IsDateString()
  fechaEntrada: string

  @IsObject()
  lugarDestino: { [lugar: string]: string[] }

  @IsOptional()
  @IsDateString()
  fechaSalida?: string

  @IsOptional()
  @IsString()
  photoUrl?: string
}
