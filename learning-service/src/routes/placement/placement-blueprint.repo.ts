import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { JLPTLevelType } from 'src/shared/constants/enum.constant'
import {
  PlacementBlueprintCreateData,
  PlacementBlueprintOrderByInput,
  PlacementBlueprintUpdateData,
  PlacementBlueprintWhereInput,
  PlacementBlueprintWhereUniqueInput,
} from 'src/routes/placement/placement-blueprint.model'
import { PlacementBlueprintType } from 'src/shared/types/placement.types'

// NOTE: PlacementBlueprint model is not in the learning schema
// This module should be moved to assessment-service or the model should be added to the schema
@Injectable()
export class PlacementBlueprintRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: PlacementBlueprintCreateData): Promise<PlacementBlueprintType> {
    // TODO: Add PlacementBlueprint model to Prisma schema or move to assessment-service
    throw new Error('PlacementBlueprint model not available in learning schema')
    // return await this.prisma.placementBlueprint.create({
    //   data,
    // })
  }

  async findMany(params: {
    skip?: number
    take?: number
    where?: PlacementBlueprintWhereInput
    orderBy?: PlacementBlueprintOrderByInput
  }): Promise<PlacementBlueprintType[]> {
    // TODO: Add PlacementBlueprint model to Prisma schema or move to assessment-service
    throw new Error('PlacementBlueprint model not available in learning schema')
  }

  async findUnique(where: PlacementBlueprintWhereUniqueInput): Promise<PlacementBlueprintType | null> {
    // TODO: Add PlacementBlueprint model to Prisma schema or move to assessment-service
    throw new Error('PlacementBlueprint model not available in learning schema')
  }

  async update(
    where: PlacementBlueprintWhereUniqueInput,
    data: PlacementBlueprintUpdateData,
  ): Promise<PlacementBlueprintType> {
    // TODO: Add PlacementBlueprint model to Prisma schema or move to assessment-service
    throw new Error('PlacementBlueprint model not available in learning schema')
  }

  async delete(where: PlacementBlueprintWhereUniqueInput): Promise<PlacementBlueprintType> {
    // TODO: Add PlacementBlueprint model to Prisma schema or move to assessment-service
    throw new Error('PlacementBlueprint model not available in learning schema')
  }

  async count(where?: PlacementBlueprintWhereInput): Promise<number> {
    // TODO: Add PlacementBlueprint model to Prisma schema or move to assessment-service
    throw new Error('PlacementBlueprint model not available in learning schema')
  }

  async findActiveByLevel(level: JLPTLevelType): Promise<PlacementBlueprintType | null> {
    // TODO: Add PlacementBlueprint model to Prisma schema or move to assessment-service
    throw new Error('PlacementBlueprint model not available in learning schema')
  }

  async deactivateAllByLevel(level: JLPTLevelType): Promise<void> {
    // TODO: Add PlacementBlueprint model to Prisma schema or move to assessment-service
    throw new Error('PlacementBlueprint model not available in learning schema')
  }

  async activate(id: number, activate: boolean = true): Promise<PlacementBlueprintType> {
    // TODO: Add PlacementBlueprint model to Prisma schema or move to assessment-service
    throw new Error('PlacementBlueprint model not available in learning schema')
  }

  async checkExists(id: number): Promise<boolean> {
    // TODO: Add PlacementBlueprint model to Prisma schema or move to assessment-service
    throw new Error('PlacementBlueprint model not available in learning schema')
  }
}
