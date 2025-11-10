import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { ScoreProfileRepository } from './score-profile.repo'
import {
  CreateScoreProfileDto,
  UpdateScoreProfileDto,
  ScoreProfileQueryDto,
  ScoreProfileResponseDto,
  ScoreProfileListResponseDto,
} from './score-profile.dto'

@Injectable()
export class ScoreProfileService {
  constructor(private readonly scoreProfileRepo: ScoreProfileRepository) {}
  private normalizeWeights(
    sections: Array<{
      type: string
      title: string
      maxScore: number
      weight?: number
      minPass?: number
      defaultTimeSec?: number
    }>,
  ): Array<any> {
    const hasWeights = sections.some((s) => s.weight !== undefined && s.weight !== null)

    if (!hasWeights) {
      const equalWeight = 100 / sections.length

      return sections.map((s) => ({
        ...s,
        weight: parseFloat(equalWeight.toFixed(2)),
      }))
    }

    return sections.map((s) => ({
      ...s,
      weight: s.weight || 0,
    }))
  }

  async create(createDto: CreateScoreProfileDto): Promise<ScoreProfileResponseDto> {
    const existing = await this.scoreProfileRepo.findByName(createDto.name)
    if (existing) {
      throw new ConflictException(`Score profile with name "${createDto.name}" already exists`)
    }

    if (!createDto.sections || createDto.sections.length === 0) {
      throw new BadRequestException('At least one section is required')
    }

    const normalizedSections = this.normalizeWeights(createDto.sections)

    const profile = await this.scoreProfileRepo.create({
      ...createDto,
      sections: normalizedSections,
    } as any)
    return profile
  }

  async findMany(query: ScoreProfileQueryDto): Promise<ScoreProfileListResponseDto> {
    const result = await this.scoreProfileRepo.findMany(query, { sections: true } as any)
    return {
      data: result.data as any,
      pagination: result.pagination,
    }
  }

  async findById(id: number): Promise<ScoreProfileResponseDto> {
    const profile = await this.scoreProfileRepo.findById(id, { sections: true } as any)
    if (!profile) {
      throw new NotFoundException(`Score profile with ID ${id} not found`)
    }
    return profile
  }

  async update(id: number, updateDto: UpdateScoreProfileDto): Promise<ScoreProfileResponseDto> {
    const existing = await this.scoreProfileRepo.findById(id)
    if (!existing) {
      throw new NotFoundException(`Score profile with ID ${id} not found`)
    }

    if (updateDto.name && updateDto.name !== existing.name) {
      const duplicate = await this.scoreProfileRepo.findByName(updateDto.name)
      if (duplicate) {
        throw new ConflictException(`Score profile with name "${updateDto.name}" already exists`)
      }
    }

    // Normalize weights if sections are being updated
    const dataToUpdate =
      updateDto.sections && updateDto.sections.length > 0
        ? { ...updateDto, sections: this.normalizeWeights(updateDto.sections) }
        : updateDto

    const updated = await this.scoreProfileRepo.update(id, dataToUpdate as any)
    return updated
  }

  async delete(id: number) {
    const existing = await this.scoreProfileRepo.findById(id)
    if (!existing) {
      throw new NotFoundException(`Score profile with ID ${id} not found`)
    }

    try {
      await this.scoreProfileRepo.delete(id)
      return { message: 'Score profile deleted successfully' }
    } catch (error: any) {
      if (error.message.includes('assessment papers are using')) {
        throw new ConflictException(error.message)
      }
      throw error
    }
  }
}
