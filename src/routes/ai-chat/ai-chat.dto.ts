import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateThreadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string
}

export class SendQueryDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  threadId: number

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  query: string
}

export class ToolCallDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string

  @ApiProperty()
  @IsNotEmpty()
  arguments: Record<string, any>
}

export class ExecuteToolsDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  threadId: number

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  queryId: string

  @ApiProperty({ type: [ToolCallDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolCallDto)
  toolCalls: ToolCallDto[]
}

export class GetThreadMessagesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 50

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  offset?: number = 0
}

export class GetThreadsDto {
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 20

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  offset?: number = 0
}
