import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from "class-validator"
import { UserRole } from "../entities/user.entity"

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string

  @IsString()
  @IsNotEmpty()
  password: string

  @IsString()
  @IsNotEmpty()
  fullName: string

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
