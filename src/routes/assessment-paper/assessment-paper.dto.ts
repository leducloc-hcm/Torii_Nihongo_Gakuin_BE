import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  CreateAssessmentPaperSchema,
  UpdateAssessmentPaperSchema,
  AssessmentPaperQuerySchema,
  JLPTLevelSchema,
  VisibilitySchema,
  AssessmentTypeSchema,
  GeneratorMetaSchema,
} from './assessment-paper.model'

export class CreateLessonQuizDto {
  @ApiProperty({ example: 'Lesson 1 Quiz', description: 'Quiz title' })
  title!: string

  @ApiProperty({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'], example: 'N3' })
  level!: z.infer<typeof JLPTLevelSchema>

  @ApiPropertyOptional({ enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'], default: 'PRIVATE' })
  visibility?: z.infer<typeof VisibilitySchema>
}

export class CreateAssessmentPaperDto extends createZodDto(CreateAssessmentPaperSchema) {
  @ApiProperty({ example: 'JLPT N3 Practice Assessment', description: 'Assessment paper title' })
  title!: string

  @ApiProperty({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'], example: 'N3' })
  level!: z.infer<typeof JLPTLevelSchema>

  @ApiProperty({ enum: ['QUIZ', 'TEST', 'EXAM'], example: 'TEST', description: 'Assessment type' })
  type!: z.infer<typeof AssessmentTypeSchema>

  @ApiPropertyOptional({ enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'], default: 'PRIVATE' })
  visibility!: z.infer<typeof VisibilitySchema>

  @ApiProperty({ example: 1, description: 'ID of the user creating this assessment' })
  createdBy!: number

  @ApiPropertyOptional({ description: 'Blueprint ID if generated from blueprint' })
  blueprintId?: number

  @ApiPropertyOptional({ description: 'Blueprint snapshot at generation time' })
  blueprintSnapshot?: any

  @ApiPropertyOptional({ description: 'Random seed for deterministic generation' })
  seed?: bigint

  @ApiPropertyOptional({ default: 1, description: 'Content version' })
  version!: number

  @ApiPropertyOptional({ example: '1.3.2', description: 'Generator engine version' })
  generatorVersion?: string

  @ApiPropertyOptional({ description: 'Generator metadata (model, config, etc.)' })
  generatorMeta?: z.infer<typeof GeneratorMetaSchema>
}

export class UpdateAssessmentPaperDto extends createZodDto(UpdateAssessmentPaperSchema) {
  @ApiPropertyOptional({ example: 'Updated JLPT N3 Practice Assessment' })
  title?: string

  @ApiPropertyOptional({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  level?: z.infer<typeof JLPTLevelSchema>

  @ApiPropertyOptional({ enum: ['QUIZ', 'TEST', 'EXAM'] })
  type?: z.infer<typeof AssessmentTypeSchema>

  @ApiPropertyOptional({ enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'] })
  visibility?: z.infer<typeof VisibilitySchema>

  @ApiPropertyOptional({ description: 'Lesson ID if this is a lesson quiz' })
  lessonId?: number

  @ApiPropertyOptional({ description: 'Blueprint ID if generated from blueprint' })
  blueprintId?: number

  @ApiPropertyOptional({ description: 'Blueprint snapshot at generation time' })
  blueprintSnapshot?: any

  @ApiPropertyOptional({ description: 'Random seed for deterministic generation' })
  seed?: bigint

  @ApiPropertyOptional({ description: 'Content version' })
  version?: number

  @ApiPropertyOptional({ description: 'Generator engine version' })
  generatorVersion?: string

  @ApiPropertyOptional({ description: 'Generator metadata' })
  generatorMeta?: z.infer<typeof GeneratorMetaSchema>
}

export class AssessmentPaperQueryDto extends createZodDto(AssessmentPaperQuerySchema) {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page!: number

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit!: number

  @ApiPropertyOptional({ description: 'Search in title' })
  search?: string

  @ApiPropertyOptional({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  level?: z.infer<typeof JLPTLevelSchema>

  @ApiPropertyOptional({ enum: ['QUIZ', 'TEST', 'EXAM'] })
  type?: z.infer<typeof AssessmentTypeSchema>

  @ApiPropertyOptional({ enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'] })
  visibility?: z.infer<typeof VisibilitySchema>

  @ApiPropertyOptional({ description: 'Filter by creator ID' })
  createdBy?: number

  @ApiPropertyOptional({ description: 'Filter by lesson ID' })
  lessonId?: number

  @ApiPropertyOptional({ description: 'Filter by blueprint ID' })
  blueprintId?: number

  @ApiPropertyOptional({ enum: ['createdAt', 'title', 'level', 'type', 'version'], default: 'createdAt' })
  sortBy!: 'createdAt' | 'title' | 'level' | 'type' | 'version'

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  sortOrder!: 'asc' | 'desc'
}

export const BulkDeleteAssessmentPaperSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
})

export class BulkDeleteAssessmentPaperDto extends createZodDto(BulkDeleteAssessmentPaperSchema) {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'Array of assessment paper IDs to delete (max 100)',
  })
  ids!: number[]
}

export const CloneAssessmentPaperSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  level: JLPTLevelSchema.optional(),
  type: AssessmentTypeSchema.optional(),
  visibility: VisibilitySchema.optional(),
  includeAttempts: z.boolean().default(false),
})

export class CloneAssessmentPaperDto extends createZodDto(CloneAssessmentPaperSchema) {
  @ApiPropertyOptional({ example: 'Cloned JLPT N3 Practice Assessment' })
  title?: string

  @ApiPropertyOptional({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  level?: z.infer<typeof JLPTLevelSchema>

  @ApiPropertyOptional({ enum: ['QUIZ', 'TEST', 'EXAM'] })
  type?: z.infer<typeof AssessmentTypeSchema>

  @ApiPropertyOptional({ enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'] })
  visibility?: z.infer<typeof VisibilitySchema>

  @ApiPropertyOptional({ default: false, description: 'Whether to include attempt data' })
  includeAttempts!: boolean
}

export class AssessmentPaperStatsDto {
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

export const BulkUpdateVisibilitySchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
  visibility: VisibilitySchema,
})

export class BulkUpdateVisibilityDto extends createZodDto(BulkUpdateVisibilitySchema) {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'Array of assessment paper IDs to update (max 100)',
  })
  ids!: number[]

  @ApiProperty({ enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'], description: 'New visibility setting' })
  visibility!: z.infer<typeof VisibilitySchema>
}

export const GenerateFromBlueprintSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  seed: z.bigint().optional(),
  generatorVersion: z.string().optional(),
  generatorMeta: GeneratorMetaSchema.optional(),
})

export class GenerateFromBlueprintDto extends createZodDto(GenerateFromBlueprintSchema) {
  @ApiPropertyOptional({ example: 'Generated Assessment from Blueprint' })
  title?: string

  @ApiPropertyOptional({ description: 'Random seed for deterministic generation' })
  seed?: bigint

  @ApiPropertyOptional({ example: '1.3.2', description: 'Generator engine version' })
  generatorVersion?: string

  @ApiPropertyOptional({ description: 'Generator metadata' })
  generatorMeta?: z.infer<typeof GeneratorMetaSchema>
}
