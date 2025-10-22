import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { Prisma, ScoreProfile } from '@prisma/client'
import {
  CreateScoreProfileSchema,
  UpdateScoreProfileSchema,
  ScoreProfileQuerySchema,
  DEFAULT_SCORE_PROFILES,
} from './score-profile.model'
import { z } from 'zod'

// Helper types
type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

type ScoreProfileWithCount = ScoreProfile & {
  _count: {
    papers: number
  }
}

export type ScoreProfileInclude = {
  papers?: boolean
  _count?: boolean | { select: { papers: boolean } }
}

@Injectable()
export class ScoreProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ===== CREATE OPERATIONS =====
  async create(
    data: z.infer<typeof CreateScoreProfileSchema>,
    include?: ScoreProfileInclude,
  ): Promise<ScoreProfile | ScoreProfileWithCount> {
    const validatedData = CreateScoreProfileSchema.parse(data)

    return await this.prisma.scoreProfile.create({
      data: {
        ...validatedData,
        mappings: validatedData.mappings as any,
      },
      include: this._buildInclude(include),
    })
  }

  async createMany(profiles: z.infer<typeof CreateScoreProfileSchema>[]): Promise<{ count: number }> {
    const validatedProfiles = profiles.map((profile) => CreateScoreProfileSchema.parse(profile))

    return await this.prisma.scoreProfile.createMany({
      data: validatedProfiles.map((profile) => ({
        ...profile,
        mappings: profile.mappings as any,
      })),
      skipDuplicates: true,
    })
  }

  async createDefaultProfiles(level?: JLPTLevel, overwrite = false): Promise<{ created: number; skipped: number }> {
    const allProfiles = Object.values(DEFAULT_SCORE_PROFILES)
    const profilesToCreate = level ? allProfiles.filter((p) => p.level === level) : allProfiles

    let created = 0
    let skipped = 0

    for (const profile of profilesToCreate) {
      try {
        if (overwrite) {
          // Delete existing and recreate
          await this.prisma.scoreProfile.deleteMany({
            where: { name: profile.name },
          })
        }

        const exists = await this.prisma.scoreProfile.findFirst({
          where: { name: profile.name },
        })

        if (!exists) {
          await this.create(profile)
          created++
        } else {
          skipped++
        }
      } catch (error) {
        // Skip if duplicate or other error
        skipped++
      }
    }

    return { created, skipped }
  }

  // ===== READ OPERATIONS =====
  async findById(id: number, include?: ScoreProfileInclude): Promise<ScoreProfile | ScoreProfileWithCount | null> {
    return await this.prisma.scoreProfile.findUnique({
      where: { id },
      include: this._buildInclude(include),
    })
  }

  async findByName(name: string, include?: ScoreProfileInclude): Promise<ScoreProfile | ScoreProfileWithCount | null> {
    return await this.prisma.scoreProfile.findFirst({
      where: { name },
      include: this._buildInclude(include),
    })
  }

  async findMany(
    query: Partial<z.infer<typeof ScoreProfileQuerySchema>> = {},
    include?: ScoreProfileInclude,
  ): Promise<{
    data: (ScoreProfile | ScoreProfileWithCount)[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }> {
    const { page = 1, limit = 20, level, name, sortBy = 'createdAt', sortOrder = 'desc' } = query

    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.ScoreProfileWhereInput = {}
    if (level) where.level = level
    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      }
    }

    // Build orderBy clause
    const orderBy: Prisma.ScoreProfileOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    }

    // Execute queries
    const [data, total] = await Promise.all([
      this.prisma.scoreProfile.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: this._buildInclude(include),
      }),
      this.prisma.scoreProfile.count({ where }),
    ])

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findByLevel(
    level: JLPTLevel,
    include?: ScoreProfileInclude,
  ): Promise<(ScoreProfile | ScoreProfileWithCount)[]> {
    return await this.prisma.scoreProfile.findMany({
      where: { level },
      orderBy: { name: 'asc' },
      include: this._buildInclude(include),
    })
  }

  async findAll(include?: ScoreProfileInclude): Promise<(ScoreProfile | ScoreProfileWithCount)[]> {
    return await this.prisma.scoreProfile.findMany({
      orderBy: [{ level: 'desc' }, { name: 'asc' }],
      include: this._buildInclude(include),
    })
  }

  // ===== UPDATE OPERATIONS =====
  async update(
    id: number,
    data: z.infer<typeof UpdateScoreProfileSchema>,
    include?: ScoreProfileInclude,
  ): Promise<ScoreProfile | ScoreProfileWithCount> {
    const validatedData = UpdateScoreProfileSchema.parse(data)

    return await this.prisma.scoreProfile.update({
      where: { id },
      data: {
        ...validatedData,
        ...(validatedData.mappings && {
          mappings: validatedData.mappings as any,
        }),
      },
      include: this._buildInclude(include),
    })
  }

  // ===== DELETE OPERATIONS =====
  async delete(id: number): Promise<ScoreProfile> {
    // Check if any papers are using this profile
    const paperCount = await this.prisma.assessmentPaper.count({
      where: { scoreProfileId: id },
    })

    if (paperCount > 0) {
      throw new Error(`Cannot delete score profile: ${paperCount} assessment papers are using this profile`)
    }

    return await this.prisma.scoreProfile.delete({
      where: { id },
    })
  }

  async deleteMany(ids: number[]): Promise<{ count: number }> {
    // Check if any papers are using these profiles
    const paperCount = await this.prisma.assessmentPaper.count({
      where: { scoreProfileId: { in: ids } },
    })

    if (paperCount > 0) {
      throw new Error(`Cannot delete score profiles: ${paperCount} assessment papers are using these profiles`)
    }

    return await this.prisma.scoreProfile.deleteMany({
      where: { id: { in: ids } },
    })
  }

  // ===== UTILITY OPERATIONS =====
  async exists(id: number): Promise<boolean> {
    const profile = await this.prisma.scoreProfile.findUnique({
      where: { id },
      select: { id: true },
    })
    return !!profile
  }

  async count(where?: Prisma.ScoreProfileWhereInput): Promise<number> {
    return await this.prisma.scoreProfile.count({ where })
  }

  async getUsageStats(id: number): Promise<{
    totalPapers: number
    activePapers: number
    levelDistribution: Record<string, number>
  }> {
    const [totalPapers, levelDistribution] = await Promise.all([
      this.prisma.assessmentPaper.count({
        where: { scoreProfileId: id },
      }),
      this.prisma.assessmentPaper.groupBy({
        by: ['level'],
        where: { scoreProfileId: id },
        _count: { level: true },
      }),
    ])

    const levelCounts = levelDistribution.reduce(
      (acc, item) => {
        acc[item.level || 'Unknown'] = item._count.level
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalPapers,
      activePapers: totalPapers, // Since isActive field doesn't exist
      levelDistribution: levelCounts,
    }
  }

  validateMappings(mappings: Record<string, string>): {
    isValid: boolean
    errors: string[]
  } {
    try {
      // Validate using the schema
      const validatedMappings = CreateScoreProfileSchema.shape.mappings.parse(mappings)

      // Additional business logic validations
      const errors: string[] = []

      // Check for required buckets
      const buckets = Object.values(validatedMappings)
      const uniqueBuckets = [...new Set(buckets)]

      if (uniqueBuckets.length < 2) {
        errors.push('At least 2 different score buckets are required')
      }

      // Check for balanced distribution
      const bucketCounts = buckets.reduce(
        (acc, bucket) => {
          acc[bucket] = (acc[bucket] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const maxCount = Math.max(...Object.values(bucketCounts))
      const minCount = Math.min(...Object.values(bucketCounts))

      if (maxCount > minCount * 3) {
        errors.push('Score bucket distribution is too unbalanced')
      }

      return {
        isValid: errors.length === 0,
        errors,
      }
    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid mappings format'],
      }
    }
  }

  // ===== PRIVATE HELPER METHODS =====
  private _buildInclude(include?: ScoreProfileInclude): Prisma.ScoreProfileInclude | undefined {
    if (!include) return undefined

    const result: Prisma.ScoreProfileInclude = {}

    if (include.papers) {
      result.papers = true
    }

    if (include._count) {
      if (typeof include._count === 'boolean') {
        result._count = { select: { papers: true } }
      } else {
        result._count = include._count
      }
    }

    return Object.keys(result).length > 0 ? result : undefined
  }
}
