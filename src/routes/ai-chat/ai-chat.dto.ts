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
  @ApiPropertyOptional({ default: 20, description: 'Number of messages per page' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 20

  @ApiPropertyOptional({ default: 1, description: 'Page number (starts from 1)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1
}

export class GetThreadsDto {
  @ApiPropertyOptional({ default: 20, description: 'Number of threads per page' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 20

  @ApiPropertyOptional({ default: 1, description: 'Page number (starts from 1)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1
}
