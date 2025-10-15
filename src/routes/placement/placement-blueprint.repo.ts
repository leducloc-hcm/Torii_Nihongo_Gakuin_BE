import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { JLPTLevel, PlacementBlueprint } from '@prisma/client'
import {
  PlacementBlueprintCreateInput,
  PlacementBlueprintUpdateInput,
  PlacementBlueprintWhereUniqueInput,
  PlacementBlueprintWhereInput,
  PlacementBlueprintOrderByInput,
} from './placement-blueprint.model'

@Injectable()
export class PlacementBlueprintRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: PlacementBlueprintCreateInput): Promise<PlacementBlueprint> {
    return this.prisma.placementBlueprint.create({
      data,
    })
  }

  async findMany(params: {
    skip?: number
    take?: number
    where?: PlacementBlueprintWhereInput
    orderBy?: PlacementBlueprintOrderByInput
  }): Promise<PlacementBlueprint[]> {
    const { skip, take, where, orderBy } = params
    return this.prisma.placementBlueprint.findMany({
      skip,
      take,
      where,
      orderBy,
    })
  }

  async findUnique(where: PlacementBlueprintWhereUniqueInput): Promise<PlacementBlueprint | null> {
    return this.prisma.placementBlueprint.findUnique({
      where,
    })
  }

  async update(
    where: PlacementBlueprintWhereUniqueInput,
    data: PlacementBlueprintUpdateInput,
  ): Promise<PlacementBlueprint> {
    return this.prisma.placementBlueprint.update({
      where,
      data,
    })
  }

  async delete(where: PlacementBlueprintWhereUniqueInput): Promise<PlacementBlueprint> {
    return this.prisma.placementBlueprint.delete({
      where,
    })
  }

  async count(where?: PlacementBlueprintWhereInput): Promise<number> {
    return this.prisma.placementBlueprint.count({ where })
  }

  async findActiveByLevel(level: JLPTLevel): Promise<PlacementBlueprint | null> {
    return this.prisma.placementBlueprint.findFirst({
      where: {
        level,
        active: true,
      },
    })
  }

  async deactivateAllByLevel(level: JLPTLevel): Promise<void> {
    await this.prisma.placementBlueprint.updateMany({
      where: {
        level,
        active: true,
      },
      data: {
        active: false,
      },
    })
  }

  async activate(id: number): Promise<PlacementBlueprint> {
    // First get the blueprint to know its level
    const blueprint = await this.prisma.placementBlueprint.findUnique({
      where: { id },
      select: { level: true },
    })

    if (!blueprint) {
      throw new Error('Blueprint not found')
    }

    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Deactivate all blueprints of the same level
      await tx.placementBlueprint.updateMany({
        where: {
          level: blueprint.level,
          active: true,
        },
        data: {
          active: false,
        },
      })

      // Activate the target blueprint
      return tx.placementBlueprint.update({
        where: { id },
        data: { active: true },
      })
    })
  }

  async checkExists(id: number): Promise<boolean> {
    const count = await this.prisma.placementBlueprint.count({
      where: { id },
    })
    return count > 0
  }
}
