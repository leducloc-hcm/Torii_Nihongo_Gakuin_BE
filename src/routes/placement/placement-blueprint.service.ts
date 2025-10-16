import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PlacementBlueprintRepository } from './placement-blueprint.repo'
import {
  CreatePlacementBlueprintDTO,
  UpdatePlacementBlueprintDTO,
  QueryPlacementBlueprintDTO,
  ActivateBlueprintDTO,
} from './placement-blueprint.dto'
import { PlacementBlueprintWhereInput, PlacementBlueprintOrderByInput } from './placement-blueprint.model'
import { JLPTLevel, PlacementBlueprint } from '@prisma/client'

@Injectable()
export class PlacementBlueprintService {
  constructor(private readonly placementBlueprintRepository: PlacementBlueprintRepository) {}

  async create(createDto: CreatePlacementBlueprintDTO): Promise<PlacementBlueprint> {
    const { level, totalQuestions, vocabKanji, grammar, synonym, orderSentence, readingShort, readingMedium } =
      createDto

    // Validate that sum equals totalQuestions
    const sum = vocabKanji + grammar + synonym + orderSentence + readingShort + readingMedium
    if (sum !== totalQuestions) {
      throw new BadRequestException('Sum of question types must equal totalQuestions')
    }

    return this.placementBlueprintRepository.create({
      level,
      totalQuestions,
      vocabKanji,
      grammar,
      synonym,
      orderSentence,
      readingShort,
      readingMedium,
      active: false, // New blueprints start as inactive
    })
  }

  async findAll(queryDto: QueryPlacementBlueprintDTO) {
    const { page, limit, level, active, sortBy, sortOrder } = queryDto
    const skip = (page - 1) * limit

    const where: PlacementBlueprintWhereInput = {}

    if (level !== undefined) {
      where.level = level
    }

    if (active !== undefined) {
      where.active = active
    }

    // Build order by clause
    const orderBy: PlacementBlueprintOrderByInput = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    const [blueprints, total] = await Promise.all([
      this.placementBlueprintRepository.findMany({
        skip,
        take: Number(limit),
        where,
        orderBy,
      }),
      this.placementBlueprintRepository.count(where),
    ])

    return {
      data: blueprints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    }
  }

  async findByLevel(level: JLPTLevel, queryDto: Omit<QueryPlacementBlueprintDTO, 'level'>) {
    const queryWithLevel = { ...queryDto, level }
    return this.findAll(queryWithLevel)
  }

  async findOne(id: number): Promise<PlacementBlueprint> {
    const blueprint = await this.placementBlueprintRepository.findUnique({ id })
    if (!blueprint) {
      throw new NotFoundException(`PlacementBlueprint with ID ${id} not found`)
    }
    return blueprint
  }

  async update(id: number, updateDto: UpdatePlacementBlueprintDTO): Promise<PlacementBlueprint> {
    // Check if blueprint exists
    const exists = await this.placementBlueprintRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`PlacementBlueprint with ID ${id} not found`)
    }

    // If updating question counts, validate the sum
    if (updateDto.totalQuestions !== undefined) {
      const current = await this.placementBlueprintRepository.findUnique({ id })
      if (!current) {
        throw new NotFoundException(`PlacementBlueprint with ID ${id} not found`)
      }

      const vocabKanji = updateDto.vocabKanji ?? current.vocabKanji
      const grammar = updateDto.grammar ?? current.grammar
      const synonym = updateDto.synonym ?? current.synonym
      const orderSentence = updateDto.orderSentence ?? current.orderSentence
      const readingShort = updateDto.readingShort ?? current.readingShort
      const readingMedium = updateDto.readingMedium ?? current.readingMedium

      const sum = vocabKanji + grammar + synonym + orderSentence + readingShort + readingMedium

      if (sum !== updateDto.totalQuestions) {
        throw new BadRequestException('Sum of question types must equal totalQuestions')
      }
    }

    return this.placementBlueprintRepository.update({ id }, updateDto)
  }

  async activate(id: number, activateDto: ActivateBlueprintDTO): Promise<PlacementBlueprint> {
    // Check if blueprint exists
    const exists = await this.placementBlueprintRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`PlacementBlueprint with ID ${id} not found`)
    }

    return this.placementBlueprintRepository.activate(id, activateDto.activate)
  }

  async remove(id: number): Promise<PlacementBlueprint> {
    // Check if blueprint exists
    const exists = await this.placementBlueprintRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`PlacementBlueprint with ID ${id} not found`)
    }

    // Check if blueprint is currently active
    const blueprint = await this.placementBlueprintRepository.findUnique({ id })
    if (blueprint && blueprint.active) {
      throw new ConflictException('Cannot delete an active blueprint')
    }

    return this.placementBlueprintRepository.delete({ id })
  }

  async findActiveByLevel(level: JLPTLevel): Promise<PlacementBlueprint | null> {
    return this.placementBlueprintRepository.findActiveByLevel(level)
  }
}
