import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
import { ActivityAction, ActivityEntity } from "@prisma/client";

export class QueryActivityLogDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ActivityAction)
  action?: ActivityAction;

  @IsOptional()
  @IsEnum(ActivityEntity)
  entity?: ActivityEntity;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
