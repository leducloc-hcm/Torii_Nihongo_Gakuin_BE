import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  CreateTestSectionSchema,
  UpdateTestSectionSchema,
  TestSectionQuerySchema,
  QuestionTypeSchema,
  BulkCreateTestSectionsSchema,
  ReorderTestSectionsSchema,
  BulkDeleteTestSectionsSchema,
} from './test-section.model'

// ===== Create TestSection DTO =====
export class CreateTestSectionDto {
  @ApiProperty({ description: 'Test paper ID this section belongs to' })
  testId!: number

  @ApiProperty({ example: 'Vocabulary Section', description: 'Section title' })
  title!: string

  @ApiProperty({ enum: ['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'], example: 'VOCAB' })
  type!: z.infer<typeof QuestionTypeSchema>

  @ApiPropertyOptional({ default: 0, description: 'Display order within the test' })
  order?: number
}

// ===== Update TestSection DTO =====
export class UpdateTestSectionDto extends createZodDto(UpdateTestSectionSchema) {
  @ApiPropertyOptional({ example: 'Updated Vocabulary Section' })
  title?: string

  @ApiPropertyOptional({ enum: ['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'] })
  type?: z.infer<typeof QuestionTypeSchema>

  @ApiPropertyOptional({ description: 'Display order within the test' })
  order?: number
}

export class TestSectionQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page?: number = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit?: number = 20

  @ApiPropertyOptional({ description: 'Search in title' })
  search?: string

  @ApiPropertyOptional({ enum: ['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'] })
  type?: z.infer<typeof QuestionTypeSchema>

  @ApiPropertyOptional({ description: 'Filter by test ID' })
  testId?: number

  @ApiPropertyOptional({ enum: ['order', 'title', 'type', 'createdAt'], default: 'order' })
  sortBy?: string = 'order'

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  sortOrder?: string = 'asc'
}
export class BulkCreateTestSectionsDto {
  @ApiProperty({
    type: [CreateTestSectionDto],
    description: 'Array of test sections to create (max 50)',
  })
  sections!: CreateTestSectionDto[]
}

export class ReorderTestSectionsDto {
  @ApiProperty({
    type: [Object],
    example: [
      { id: 1, order: 0 },
      { id: 2, order: 1 },
    ],
    description: 'Array of section ID and new order pairs',
  })
  sections!: Array<{ id: number; order: number }>
}

export class BulkDeleteTestSectionsDto {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'Array of test section IDs to delete (max 100)',
  })
  ids!: number[]
}

// ===== Statistics Response DTO =====
export class TestSectionStatsDto {
  @ApiProperty({ example: 15, description: 'Total number of items in section' })
  totalItems!: number

  @ApiProperty({
    example: { VOCAB: 10, GRAMMAR: 5 },
    description: 'Number of items by question type',
  })
  itemsByType!: Record<string, number>

  @ApiPropertyOptional({ example: 2.5, description: 'Average difficulty rating' })
  avgDifficulty?: number

  @ApiPropertyOptional({ example: 25, description: 'Estimated completion time in minutes' })
  estimatedDurationMinutes?: number
}

// ===== Copy Section DTO =====
export class CopyTestSectionDto {
  @ApiProperty({ description: 'Target test paper ID to copy section to' })
  targetTestId!: number

  @ApiPropertyOptional({ description: 'New title for the copied section' })
  newTitle?: string

  @ApiPropertyOptional({ default: false, description: 'Whether to copy all items as well' })
  copyItems?: boolean
}

// ===== Move Section DTO =====
export class MoveTestSectionDto {
  @ApiProperty({ description: 'Target test paper ID to move section to' })
  targetTestId!: number

  @ApiPropertyOptional({ description: 'New order in target test' })
  newOrder?: number
}

// ===== Create Section with Items DTO =====
export class CreateTestSectionWithItemsDto {
  @ApiProperty({ example: 'Vocabulary Section', description: 'Section title' })
  title!: string

  @ApiProperty({ enum: ['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'], example: 'VOCAB' })
  type!: z.infer<typeof QuestionTypeSchema>

  @ApiPropertyOptional({ default: 0, description: 'Display order within the test' })
  order?: number

  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'Array of question IDs to add to this section',
  })
  questionIds!: number[]
}

// ===== Bulk Create Sections with Items DTO =====
export class BulkCreateSectionsWithItemsDto {
  @ApiProperty({ description: 'Test paper ID these sections belong to' })
  testId!: number

  @ApiProperty({
    type: [CreateTestSectionWithItemsDto],
    example: [
      {
        title: 'Vocabulary Section',
        type: 'VOCAB',
        order: 0,
        questionIds: [1, 2, 3],
      },
      {
        title: 'Grammar Section',
        type: 'GRAMMAR',
        order: 1,
        questionIds: [4, 5, 6],
      },
    ],
    description: 'Array of sections to create with their items (max 10)',
  })
  sections!: CreateTestSectionWithItemsDto[]
}
