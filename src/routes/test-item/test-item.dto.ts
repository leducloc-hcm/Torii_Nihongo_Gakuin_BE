import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// ===== Create TestItem DTO =====
export class CreateTestItemDto {
  @ApiProperty({
    example: 123,
    description: 'ID of the test section this item belongs to',
  })
  sectionId!: number

  @ApiProperty({
    example: 456,
    description: 'ID of the question for this test item',
  })
  questionId!: number

  @ApiPropertyOptional({
    example: 1,
    default: 0,
    description: 'Order of the item within the section (auto-assigned if not provided)',
  })
  order?: number
}

// ===== Update TestItem DTO =====
export class UpdateTestItemDto {
  @ApiPropertyOptional({
    example: 789,
    description: 'New question ID for this test item',
  })
  questionId?: number

  @ApiPropertyOptional({
    example: 2,
    description: 'New order of the item within the section',
  })
  order?: number
}

// ===== Query TestItems DTO =====
export class TestItemQueryDto {
  @ApiPropertyOptional({
    example: 123,
    description: 'Filter by section ID',
  })
  sectionId?: number

  @ApiPropertyOptional({
    example: 456,
    description: 'Filter by question ID',
  })
  questionId?: number

  @ApiPropertyOptional({
    example: 0,
    description: 'Filter by minimum order',
  })
  minOrder?: number

  @ApiPropertyOptional({
    example: 10,
    description: 'Filter by maximum order',
  })
  maxOrder?: number

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include question details in response',
  })
  includeQuestion?: boolean

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include section details in response',
  })
  includeSection?: boolean

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Page number for pagination',
  })
  page?: number

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'Number of items per page',
  })
  limit?: number

  @ApiPropertyOptional({
    example: 'order',
    enum: ['id', 'order', 'questionId'],
    default: 'order',
    description: 'Sort by field',
  })
  sortBy?: 'id' | 'order' | 'questionId'

  @ApiPropertyOptional({
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'asc',
    description: 'Sort order',
  })
  sortOrder?: 'asc' | 'desc'
}

// ===== Reorder TestItems DTO =====
export class ReorderTestItemsDto {
  @ApiProperty({
    type: [Object],
    example: [
      { id: 1, newOrder: 0 },
      { id: 2, newOrder: 1 },
    ],
    description: 'Array of item ID and new order pairs (max 100)',
  })
  updates!: Array<{
    id: number
    newOrder: number
  }>
}

// ===== Bulk Create TestItems DTO =====
export class BulkCreateTestItemsDto {
  @ApiProperty({
    type: [CreateTestItemDto],
    example: [
      { sectionId: 123, questionId: 456, order: 0 },
      { sectionId: 123, questionId: 789, order: 1 },
    ],
    description: 'Array of test items to create (max 100)',
  })
  items!: CreateTestItemDto[]
}

// ===== Bulk Delete TestItems DTO =====
export class BulkDeleteTestItemsDto {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'Array of test item IDs to delete (max 100)',
  })
  ids!: number[]
}

// ===== Copy TestItems DTO =====
export class CopyTestItemsDto {
  @ApiProperty({
    example: 789,
    description: 'Target section ID to copy items to',
  })
  targetSectionId!: number

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether to maintain original order in target section',
  })
  maintainOrder?: boolean
}

// ===== Move TestItems DTO =====
export class MoveTestItemsDto {
  @ApiProperty({
    example: 789,
    description: 'Target section ID to move items to',
  })
  targetSectionId!: number

  @ApiPropertyOptional({
    example: 0,
    description: 'New order for moved items in target section',
  })
  newOrder?: number
}

// ===== Statistics Response DTO =====
export class TestItemStatsDto {
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

// ===== Response DTOs =====
export class TestItemResponseDto {
  @ApiProperty({ example: 1, description: 'Test item ID' })
  id!: number

  @ApiProperty({ example: 123, description: 'Section ID' })
  sectionId!: number

  @ApiProperty({ example: 456, description: 'Question ID' })
  questionId!: number

  @ApiProperty({ example: 0, description: 'Order within section' })
  order!: number

  @ApiPropertyOptional({
    description: 'Question details (when includeQuestion=true)',
    example: {
      id: 456,
      content: 'What is the meaning of "こんにちは"?',
      type: 'VOCAB',
    },
  })
  question?: {
    id: number
    content: string
    type: string
    difficulty?: number
  }

  @ApiPropertyOptional({
    description: 'Section details (when includeSection=true)',
    example: {
      id: 123,
      title: 'Vocabulary Section',
      testId: 789,
    },
  })
  section?: {
    id: number
    title: string
    testId: number
  }
}

export class TestItemListResponseDto {
  @ApiProperty({ type: [TestItemResponseDto] })
  data!: TestItemResponseDto[]

  @ApiProperty({
    example: {
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
    },
    description: 'Pagination information',
  })
  pagination!: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// ===== Create Items for Section DTO =====
export class CreateItemsForSectionDto {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3, 4, 5],
    description: 'Array of question IDs to add to the section (max 50)',
  })
  questionIds!: number[]

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether to maintain question order as provided',
  })
  maintainOrder?: boolean
}
