import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { ScoreProfileRepository } from './score-profile.repo'
import {
  CreateScoreProfileDto,
  UpdateScoreProfileDto,
  ScoreProfileQueryDto,
  ScoreProfileResponseDto,
  ScoreProfileListResponseDto,
  ScoreProfileWithCountDto,
  ScoreProfileValidationDto,
  CreateDefaultProfilesDto,
} from './score-profile.dto'
import { validateScoreValues } from './score-profile.model'
import { z } from 'zod'

@Injectable()
export class ScoreProfileService {
  constructor(private readonly scoreProfileRepo: ScoreProfileRepository) {}

  // ===== CREATE OPERATIONS =====
  async create(createDto: CreateScoreProfileDto): Promise<ScoreProfileResponseDto> {
    // Validate score values
    const validation = validateScoreValues({
      ...createDto,
      maxBucket: createDto.maxBucket || 60,
    })
    if (validation.length > 0) {
      throw new BadRequestException(`Invalid score configuration: ${validation.join(', ')}`)
    }

    // Check for duplicate names
    const existing = await this.scoreProfileRepo.findByName(createDto.name)
    if (existing) {
      throw new ConflictException(`Score profile with name "${createDto.name}" already exists`)
    }

    // Validate mappings
    const mappingValidation = this.scoreProfileRepo.validateMappings(createDto.mappings)
    if (!mappingValidation.isValid) {
      throw new BadRequestException(`Invalid mappings: ${mappingValidation.errors.join(', ')}`)
    }

    const profile = await this.scoreProfileRepo.create(
      {
        ...createDto,
        maxBucket: createDto.maxBucket || 60,
      },
      { _count: true },
    )
    return this._transformToResponseDto(profile)
  }

  async createDefaultProfiles(createDto: CreateDefaultProfilesDto): Promise<{
    message: string
    created: number
    skipped: number
    profiles: string[]
  }> {
    const { level, overwrite = false } = createDto

    const result = await this.scoreProfileRepo.createDefaultProfiles(level as any, overwrite)

    const createdProfiles = level ? [`JLPT ${level} profiles`] : ['JLPT N5', 'JLPT N4', 'JLPT N3', 'JLPT N2', 'JLPT N1']

    return {
      message: `Default profiles creation completed`,
      created: result.created,
      skipped: result.skipped,
      profiles: createdProfiles,
    }
  }

  // ===== READ OPERATIONS =====
  async findById(id: number): Promise<ScoreProfileResponseDto> {
    const profile = await this.scoreProfileRepo.findById(id, { _count: true })
    if (!profile) {
      throw new NotFoundException(`Score profile with ID ${id} not found`)
    }
    return this._transformToResponseDto(profile)
  }

  async findMany(query: ScoreProfileQueryDto): Promise<ScoreProfileListResponseDto> {
    const { includeCount = true, sortBy, sortOrder, ...otherQuery } = query

    const queryData = {
      ...otherQuery,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    }

    const include = includeCount ? { _count: true } : undefined
    const result = await this.scoreProfileRepo.findMany(queryData, include)

    return {
      data: result.data.map((profile) => this._transformToCountDto(profile)),
      pagination: result.pagination,
    }
  }

  async findByLevel(level: string): Promise<ScoreProfileResponseDto[]> {
    if (!['N5', 'N4', 'N3', 'N2', 'N1'].includes(level)) {
      throw new BadRequestException('Invalid JLPT level')
    }

    const profiles = await this.scoreProfileRepo.findByLevel(level as any, { _count: true })
    return profiles.map((profile) => this._transformToResponseDto(profile))
  }

  async findAll(): Promise<ScoreProfileResponseDto[]> {
    const profiles = await this.scoreProfileRepo.findAll({ _count: true })
    return profiles.map((profile) => this._transformToResponseDto(profile))
  }

  // ===== UPDATE OPERATIONS =====
  async update(id: number, updateDto: UpdateScoreProfileDto): Promise<ScoreProfileResponseDto> {
    // Check if exists
    const existing = await this.scoreProfileRepo.findById(id)
    if (!existing) {
      throw new NotFoundException(`Score profile with ID ${id} not found`)
    }

    // Validate score values if provided
    if (
      Object.keys(updateDto).some((key) => ['maxTotal', 'minTotalPass', 'minBucketPass', 'maxBucket'].includes(key))
    ) {
      const mergedData = {
        maxTotal: updateDto.maxTotal || existing.maxTotal || undefined,
        minTotalPass: updateDto.minTotalPass || existing.minTotalPass || undefined,
        minBucketPass: updateDto.minBucketPass || existing.minBucketPass || undefined,
        maxBucket: updateDto.maxBucket || existing.maxBucket || 60,
      }
      const validation = validateScoreValues(mergedData)
      if (validation.length > 0) {
        throw new BadRequestException(`Invalid score configuration: ${validation.join(', ')}`)
      }
    }

    // Check for duplicate names if name is being updated
    if (updateDto.name && updateDto.name !== existing.name) {
      const duplicate = await this.scoreProfileRepo.findByName(updateDto.name)
      if (duplicate) {
        throw new ConflictException(`Score profile with name "${updateDto.name}" already exists`)
      }
    }

    // Validate mappings if provided
    if (updateDto.mappings) {
      const mappingValidation = this.scoreProfileRepo.validateMappings(updateDto.mappings)
      if (!mappingValidation.isValid) {
        throw new BadRequestException(`Invalid mappings: ${mappingValidation.errors.join(', ')}`)
      }
    }

    const updated = await this.scoreProfileRepo.update(id, updateDto, { _count: true })
    return this._transformToResponseDto(updated)
  }

  // ===== DELETE OPERATIONS =====
  async delete(id: number): Promise<{ message: string }> {
    const existing = await this.scoreProfileRepo.findById(id)
    if (!existing) {
      throw new NotFoundException(`Score profile with ID ${id} not found`)
    }

    try {
      await this.scoreProfileRepo.delete(id)
      return { message: 'Score profile deleted successfully' }
    } catch (error) {
      if (error instanceof Error && error.message.includes('assessment papers are using')) {
        throw new ConflictException(error.message)
      }
      throw error
    }
  }

  async deleteMany(ids: number[]): Promise<{ message: string; deletedCount: number }> {
    if (!ids.length) {
      throw new BadRequestException('No IDs provided')
    }

    try {
      const result = await this.scoreProfileRepo.deleteMany(ids)
      return {
        message: 'Score profiles deleted successfully',
        deletedCount: result.count,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('assessment papers are using')) {
        throw new ConflictException(error.message)
      }
      throw error
    }
  }

  // ===== UTILITY OPERATIONS =====
  async validateProfile(id: number): Promise<ScoreProfileValidationDto> {
    const profile = await this.scoreProfileRepo.findById(id)
    if (!profile) {
      throw new NotFoundException(`Score profile with ID ${id} not found`)
    }

    const scoreValidation = validateScoreValues({
      maxTotal: profile.maxTotal || undefined,
      minTotalPass: profile.minTotalPass || undefined,
      minBucketPass: profile.minBucketPass || undefined,
      maxBucket: profile.maxBucket || 60,
    })
    const mappingValidation = this.scoreProfileRepo.validateMappings(profile.mappings as Record<string, string>)

    const allErrors = [...scoreValidation, ...mappingValidation.errors]

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    }
  }

  validateMappings(mappings: Record<string, string>): ScoreProfileValidationDto {
    const validation = this.scoreProfileRepo.validateMappings(mappings)
    return validation
  }

  async getUsageStats(id: number): Promise<{
    profile: ScoreProfileResponseDto
    usage: {
      totalPapers: number
      activePapers: number
      levelDistribution: Record<string, number>
    }
  }> {
    const profile = await this.scoreProfileRepo.findById(id, { _count: true })
    if (!profile) {
      throw new NotFoundException(`Score profile with ID ${id} not found`)
    }

    const usage = await this.scoreProfileRepo.getUsageStats(id)

    return {
      profile: this._transformToResponseDto(profile),
      usage,
    }
  }

  getBucketOptions(): { buckets: string[]; description: Record<string, string> } {
    const buckets = ['KNOWLEDGE', 'READING', 'LISTENING']
    const description = {
      KNOWLEDGE: 'Vocabulary, Grammar, and Kanji knowledge',
      READING: 'Reading comprehension skills',
      LISTENING: 'Listening comprehension skills',
    }

    return { buckets, description }
  }

  async cloneProfile(id: number, newName: string): Promise<ScoreProfileResponseDto> {
    const original = await this.scoreProfileRepo.findById(id)
    if (!original) {
      throw new NotFoundException(`Score profile with ID ${id} not found`)
    }

    // Check for duplicate names
    const existing = await this.scoreProfileRepo.findByName(newName)
    if (existing) {
      throw new ConflictException(`Score profile with name "${newName}" already exists`)
    }

    const cloneData = {
      name: newName,
      level: original.level || undefined,
      maxTotal: original.maxTotal || undefined,
      minTotalPass: original.minTotalPass || undefined,
      minBucketPass: original.minBucketPass || undefined,
      maxBucket: original.maxBucket || 60,
      notes: original.notes ? `Cloned from: ${original.name}. ${original.notes}` : `Cloned from: ${original.name}`,
      mappings: original.mappings as Record<string, string>,
    }

    const cloned = await this.scoreProfileRepo.create(cloneData, { _count: true })
    return this._transformToResponseDto(cloned)
  }

  // ===== PRIVATE HELPER METHODS =====
  private _transformToResponseDto(profile: any): ScoreProfileResponseDto {
    return {
      id: profile.id,
      name: profile.name,
      level: profile.level,
      maxTotal: profile.maxTotal,
      minTotalPass: profile.minTotalPass,
      minBucketPass: profile.minBucketPass,
      maxBucket: profile.maxBucket,
      notes: profile.notes,
      mappings: profile.mappings,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    }
  }

  private _transformToCountDto(profile: any): ScoreProfileWithCountDto {
    return {
      ...this._transformToResponseDto(profile),
      _count: profile._count || { papers: 0 },
    }
  }
}
