import { IsArray, IsString } from "class-validator"

export class DeleteMultipleDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[]
}
