import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { JLPTLevelType } from 'src/shared/constants/enum.constant'
import { PlacementBlueprintType } from 'src/shared/types/placement.types'
import {
  PlacementBlueprintCreateData,
  PlacementBlueprintOrderByInput,
  PlacementBlueprintUpdateData,
  PlacementBlueprintWhereInput,
  PlacementBlueprintWhereUniqueInput,
} from 'src/routes/placement/placement-blueprint.model'

@Injectable()
export class PlacementBlueprintRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: PlacementBlueprintCreateData): Promise<PlacementBlueprintType> {
    return await this.prisma.placementBlueprint.create({
      data,
    })
  }

  async findMany(params: {
    skip?: number
    take?: number
    where?: PlacementBlueprintWhereInput
    orderBy?: PlacementBlueprintOrderByInput
  }): Promise<PlacementBlueprintType[]> {
    const { skip, take, where, orderBy } = params

    const findManyOptions: any = {}

    if (skip !== undefined && !isNaN(skip) && skip >= 0) {
      findManyOptions.skip = skip
    }

    if (take !== undefined && !isNaN(take) && take > 0) {
      findManyOptions.take = take
    }

    if (where !== undefined) {
      findManyOptions.where = where
    }

    if (orderBy !== undefined) {
      findManyOptions.orderBy = orderBy
    }

    return await this.prisma.placementBlueprint.findMany(findManyOptions)
  }

  async findUnique(where: PlacementBlueprintWhereUniqueInput): Promise<PlacementBlueprintType | null> {
    return await this.prisma.placementBlueprint.findUnique({
      where: where as any,
    })
  }

  async update(
    where: PlacementBlueprintWhereUniqueInput,
    data: PlacementBlueprintUpdateData,
  ): Promise<PlacementBlueprintType> {
    return await this.prisma.placementBlueprint.update({
      where: where as any,
      data,
    })
  }

  async delete(where: PlacementBlueprintWhereUniqueInput): Promise<PlacementBlueprintType> {
    return await this.prisma.placementBlueprint.delete({
      where: where as any,
    })
  }

  async count(where?: PlacementBlueprintWhereInput): Promise<number> {
    return await this.prisma.placementBlueprint.count({ where })
  }

  async findActiveByLevel(level: JLPTLevelType): Promise<PlacementBlueprintType | null> {
    return await this.prisma.placementBlueprint.findFirst({
      where: {
        level,
        active: true,
      },
    })
  }

  async deactivateAllByLevel(level: JLPTLevelType): Promise<void> {
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

  async activate(id: number, activate: boolean = true): Promise<PlacementBlueprintType> {
    const blueprint = await this.prisma.placementBlueprint.findUnique({
      where: { id },
      select: { level: true },
    })

    if (!blueprint) {
      throw new Error('Blueprint not found')
    }

    return await this.prisma.$transaction(async (tx) => {
      if (activate) {
        await tx.placementBlueprint.updateMany({
          where: {
            level: blueprint.level,
            active: true,
          },
          data: {
            active: false,
          },
        })
      }

      return await tx.placementBlueprint.update({
        where: { id },
        data: { active: activate },
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
