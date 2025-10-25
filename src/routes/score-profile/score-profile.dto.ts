import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsArray, ValidateNested, IsIn, IsString, IsNumber, IsOptional } from 'class-validator'

export class ScoreProfileSectionDto {
  @ApiProperty({
    enum: ['VOCAB', 'GRAMMAR', 'READING', 'LISTENING'],
    example: 'GRAMMAR',
    description: 'Section type',
  })
  @IsIn(['VOCAB', 'GRAMMAR', 'READING', 'LISTENING'])
  type!: 'VOCAB' | 'GRAMMAR' | 'READING' | 'LISTENING'

  @ApiProperty({ example: 'Grammar Section', description: 'Section title' })
  @IsString()
  title!: string

  @ApiProperty({ example: 60, description: 'Maximum score for this section' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsNumber()
  maxScore!: number

  @ApiPropertyOptional({ example: 1.0, description: 'Weight for this section' })
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  @IsOptional()
  @IsNumber()
  weight?: number

  @ApiPropertyOptional({ example: 19, description: 'Minimum score to pass this section' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  minPass?: number

  @ApiPropertyOptional({ example: 3600, description: 'Default time limit in seconds' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  defaultTimeSec?: number
}

export class CreateScoreProfileDto {
  @ApiProperty({ example: 'JLPT N4 Standard', description: 'Profile name' })
  @IsString()
  name!: string

  @ApiPropertyOptional({
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    example: 'N4',
    description: 'JLPT level',
  })
  @IsOptional()
  @IsIn(['N5', 'N4', 'N3', 'N2', 'N1'])
  level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

  @ApiPropertyOptional({ example: 180, description: 'Maximum total score' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  maxTotal?: number

  @ApiPropertyOptional({ example: 90, description: 'Minimum total score to pass' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  minTotalPass?: number

  @ApiProperty({
    type: [ScoreProfileSectionDto],
    description: 'Sections for this profile',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreProfileSectionDto)
  sections!: ScoreProfileSectionDto[]
}

export class UpdateScoreProfileDto {
  @ApiPropertyOptional({ example: 'JLPT N4 Updated', description: 'Profile name' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    example: 'N4',
    description: 'JLPT level',
  })
  @IsOptional()
  @IsIn(['N5', 'N4', 'N3', 'N2', 'N1'])
  level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

  @ApiPropertyOptional({ example: 200, description: 'Maximum total score' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  maxTotal?: number

  @ApiPropertyOptional({ example: 100, description: 'Minimum total score to pass' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  minTotalPass?: number

  @ApiPropertyOptional({
    type: [ScoreProfileSectionDto],
    description: 'Updated sections for this profile',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreProfileSectionDto)
  sections?: ScoreProfileSectionDto[]
}

export class ScoreProfileQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  page!: number

  @ApiPropertyOptional({ example: 20, default: 20 })
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  limit!: number

  @ApiPropertyOptional({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  @IsOptional()
  level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

  @ApiPropertyOptional({ example: 'JLPT' })
  @IsOptional()
  name?: string

  @ApiPropertyOptional({
    enum: ['id', 'name', 'level', 'createdAt', 'updatedAt'],
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  sortBy?: 'id' | 'name' | 'level' | 'createdAt' | 'updatedAt'

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  sortOrder?: 'asc' | 'desc'
}

// ===== Response DTOs =====
export class ScoreProfileSectionResponseDto {
  @ApiProperty({ example: 1 })
  id!: number

  @ApiProperty({ enum: ['VOCAB', 'GRAMMAR', 'READING', 'LISTENING'], example: 'GRAMMAR' })
  type!: string

  @ApiProperty({ example: 'Grammar Section' })
  title!: string

  @ApiProperty({ example: 60 })
  maxScore!: number

  @ApiPropertyOptional({ example: 1.0 })
  weight?: number

  @ApiPropertyOptional({ example: 19 })
  minPass?: number

  @ApiPropertyOptional({ example: 3600 })
  defaultTimeSec?: number
}

export class ScoreProfileResponseDto {
  @ApiProperty({ example: 1 })
  id!: number

  @ApiProperty({ example: 'JLPT N4 Standard' })
  name!: string

  @ApiPropertyOptional({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'], example: 'N4' })
  level?: string

  @ApiPropertyOptional({ example: 180 })
  maxTotal?: number

  @ApiPropertyOptional({ example: 90 })
  minTotalPass?: number

  @ApiProperty({ type: [ScoreProfileSectionResponseDto] })
  sections!: ScoreProfileSectionResponseDto[]

  @ApiProperty()
  createdAt!: Date

  @ApiProperty()
  updatedAt!: Date
}

export class ScoreProfileListResponseDto {
  @ApiProperty({ type: [ScoreProfileResponseDto] })
  data!: ScoreProfileResponseDto[]

  @ApiProperty({
    example: {
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
    },
  })
  pagination!: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export class ScoreProfileValidationDto {
  @ApiProperty({ example: true })
  isValid!: boolean

  @ApiProperty({ type: [String], example: [] })
  errors!: string[]
}

export class CreateDefaultProfilesDto {
  @ApiPropertyOptional({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  @IsOptional()
  level?: string

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  overwrite?: boolean
}
