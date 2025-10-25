import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { Prisma, ScoreProfile } from '@prisma/client'
import { CreateScoreProfileSchema, UpdateScoreProfileSchema, ScoreProfileQuerySchema } from './score-profile.model'
import { z } from 'zod'

type ScoreProfileWithCount = ScoreProfile & {
  _count: {
    papers: number
  }
}

export type ScoreProfileInclude = {
  papers?: boolean
  sections?: boolean
  _count?: boolean | { select: { papers: boolean } }
}

@Injectable()
export class ScoreProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ===== CREATE =====
  async create(
    data: z.infer<typeof CreateScoreProfileSchema> & {
      sections?: Array<{
        type: 'VOCAB' | 'GRAMMAR' | 'READING' | 'LISTENING'
        title: string
        maxScore: number
        weight?: number
        minPass?: number
        defaultTimeSec?: number
      }>
    },
  ): Promise<any> {
    const { sections, ...profileData } = data

    return await this.prisma.scoreProfile.create({
      data: {
        name: profileData.name,
        level: profileData.level,
        maxTotal: profileData.maxTotal,
        minTotalPass: profileData.minTotalPass,
        ...(sections &&
          sections.length > 0 && {
            sections: {
              create: sections,
            },
          }),
      },
      include: {
        sections: true,
      },
    })
  }

  // ===== READ =====
  async findById(id: number, include?: ScoreProfileInclude): Promise<any> {
    return await this.prisma.scoreProfile.findUnique({
      where: { id },
      include: this._buildInclude(include),
    })
  }

  async findByName(name: string): Promise<ScoreProfile | null> {
    return await this.prisma.scoreProfile.findFirst({
      where: { name },
    })
  }

  async findMany(
    query: Partial<z.infer<typeof ScoreProfileQuerySchema>> = {},
    include?: ScoreProfileInclude,
  ): Promise<{
    data: any[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }> {
    const { page = 1, limit = 20, level, name, sortBy = 'createdAt', sortOrder = 'desc' } = query

    const skip = (page - 1) * limit

    const where: Prisma.ScoreProfileWhereInput = {}
    if (level) where.level = level
    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      }
    }

    const orderBy: Prisma.ScoreProfileOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    }

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

  // ===== UPDATE =====
  async update(
    id: number,
    data: z.infer<typeof UpdateScoreProfileSchema> & {
      sections?: Array<{
        type: 'VOCAB' | 'GRAMMAR' | 'READING' | 'LISTENING'
        title: string
        maxScore: number
        weight?: number
        minPass?: number
        defaultTimeSec?: number
      }>
    },
  ): Promise<any> {
    const { sections, ...profileData } = data

    // Delete old sections if new sections provided
    if (sections) {
      await this.prisma.scoreProfileSection.deleteMany({
        where: { profileId: id },
      })
    }

    return await this.prisma.scoreProfile.update({
      where: { id },
      data: {
        name: profileData.name,
        level: profileData.level,
        maxTotal: profileData.maxTotal,
        minTotalPass: profileData.minTotalPass,
        ...(sections &&
          sections.length > 0 && {
            sections: {
              create: sections,
            },
          }),
      },
      include: {
        sections: true,
      },
    })
  }

  // ===== DELETE =====
  async delete(id: number): Promise<ScoreProfile> {
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

  // ===== HELPERS =====
  private _buildInclude(include?: ScoreProfileInclude): any {
    if (!include) return { sections: true }

    return {
      papers: include.papers || false,
      sections: include.sections !== false,
      _count: include._count || false,
    }
  }
}
