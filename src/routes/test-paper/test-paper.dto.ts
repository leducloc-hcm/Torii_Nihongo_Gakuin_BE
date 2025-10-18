import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  CreateTestPaperFlexibleSchema,
  UpdateTestPaperSchema,
  TestPaperQuerySchema,
  JLPTLevelSchema,
  VisibilitySchema,
  GeneratorMetaSchema,
} from './test-paper.model'
export class CreateTestPaperDto extends createZodDto(CreateTestPaperFlexibleSchema) {
  @ApiProperty({ example: 'JLPT N3 Practice Test', description: 'Test paper title' })
  title!: string

  @ApiProperty({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'], example: 'N3' })
  level!: z.infer<typeof JLPTLevelSchema>

  @ApiPropertyOptional({ enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'], default: 'PRIVATE' })
  visibility!: z.infer<typeof VisibilitySchema>

  @ApiPropertyOptional({ description: 'Blueprint ID if generated from blueprint (MCP mode)' })
  blueprintId?: number

  @ApiPropertyOptional({ description: 'Blueprint snapshot at generation time (MCP mode)' })
  blueprintSnapshot?: any

  @ApiPropertyOptional({ description: 'Random seed for deterministic generation (MCP mode)' })
  seed?: bigint

  @ApiPropertyOptional({ default: 1, description: 'Content version (MCP mode)' })
  version!: number

  @ApiPropertyOptional({ example: '1.3.2', description: 'Generator engine version (MCP mode)' })
  generatorVersion?: string

  @ApiPropertyOptional({ description: 'Generator metadata (model, config, etc.) (MCP mode)' })
  generatorMeta?: z.infer<typeof GeneratorMetaSchema>
}
export class UpdateTestPaperDto extends createZodDto(UpdateTestPaperSchema) {
  @ApiPropertyOptional({ example: 'Updated JLPT N3 Practice Test' })
  title?: string

  @ApiPropertyOptional({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  level?: z.infer<typeof JLPTLevelSchema>

  @ApiPropertyOptional({ enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'] })
  visibility?: z.infer<typeof VisibilitySchema>

  @ApiPropertyOptional({ description: 'Blueprint ID if generated from blueprint (MCP mode)' })
  blueprintId?: number

  @ApiPropertyOptional({ description: 'Blueprint snapshot at generation time (MCP mode)' })
  blueprintSnapshot?: any

  @ApiPropertyOptional({ description: 'Random seed for deterministic generation (MCP mode)' })
  seed?: bigint

  @ApiPropertyOptional({ description: 'Content version (MCP mode)' })
  version?: number

  @ApiPropertyOptional({ description: 'Generator engine version (MCP mode)' })
  generatorVersion?: string

  @ApiPropertyOptional({ description: 'Generator metadata (MCP mode)' })
  generatorMeta?: z.infer<typeof GeneratorMetaSchema>
}
export class TestPaperQueryDto extends createZodDto(TestPaperQuerySchema) {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page!: number

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit!: number

  @ApiPropertyOptional({ description: 'Search in title' })
  search?: string

  @ApiPropertyOptional({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  level?: z.infer<typeof JLPTLevelSchema>

  @ApiPropertyOptional({ enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'] })
  visibility?: z.infer<typeof VisibilitySchema>

  @ApiPropertyOptional({ description: 'Filter by blueprint ID' })
  blueprintId?: number

  @ApiPropertyOptional({ enum: ['createdAt', 'title', 'level', 'version'], default: 'createdAt' })
  sortBy!: 'createdAt' | 'title' | 'level' | 'version'

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  sortOrder!: 'asc' | 'desc'
}

export const BulkDeleteTestPaperSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
})

export class BulkDeleteTestPaperDto extends createZodDto(BulkDeleteTestPaperSchema) {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'Array of test paper IDs to delete (max 100)',
  })
  ids!: number[]
}

export const CloneTestPaperSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  level: JLPTLevelSchema.optional(),
  visibility: VisibilitySchema.optional(),
  includeAttempts: z.boolean().default(false),
})

export class CloneTestPaperDto extends createZodDto(CloneTestPaperSchema) {
  @ApiPropertyOptional({ example: 'Cloned JLPT N3 Practice Test' })
  title?: string

  @ApiPropertyOptional({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  level?: z.infer<typeof JLPTLevelSchema>

  @ApiPropertyOptional({ enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'] })
  visibility?: z.infer<typeof VisibilitySchema>

  @ApiPropertyOptional({ default: false, description: 'Whether to include attempt data' })
  includeAttempts!: boolean
}

export class TestPaperStatsDto {
  @ApiProperty({ example: 45, description: 'Total number of attempts' })
  totalAttempts!: number

  @ApiProperty({ example: 32, description: 'Number of completed attempts' })
  completedAttempts!: number

  @ApiProperty({ example: 78.5, description: 'Average score' })
  averageScore!: number

  @ApiProperty({ example: 95.2, description: 'Highest score achieved' })
  highestScore!: number

  @ApiProperty({ example: 45.8, description: 'Lowest score achieved' })
  lowestScore!: number

  @ApiProperty({ example: 1847, description: 'Average completion time in seconds' })
  averageCompletionTime!: number
}

export class GeneratorMetaDto {
  @ApiPropertyOptional({ example: 'gpt-4', description: 'AI model used' })
  model?: string

  @ApiPropertyOptional({ example: 0.7, description: 'Generation temperature' })
  temperature?: number

  @ApiPropertyOptional({ example: 'a1b2c3d4', description: 'Code hash' })
  codeHash?: string

  @ApiPropertyOptional({ example: 'x9y8z7w6', description: 'Config hash' })
  configHash?: string

  @ApiPropertyOptional({ description: 'Generation timestamp' })
  timestamp?: Date
}
