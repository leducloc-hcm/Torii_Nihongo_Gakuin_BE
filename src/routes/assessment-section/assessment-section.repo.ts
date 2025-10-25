import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { AssessmentSection, QuestionType } from '@prisma/client'
import {
  AssessmentSectionBase,
  AssessmentSectionWithItems,
  AssessmentSectionWithAssessment,
  AssessmentSectionBasic,
  CreateAssessmentSectionInput,
  UpdateAssessmentSectionInput,
  AssessmentSectionQuery,
} from './assessment-section.model'

@Injectable()
export class AssessmentSectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAssessmentSectionInput): Promise<AssessmentSection> {
    return await this.prisma.assessmentSection.create({
      data,
    })
  }

  async findById(id: number): Promise<AssessmentSection | null> {
    return await this.prisma.assessmentSection.findUnique({
      where: { id },
    })
  }

  async findByIdWithItems(id: number): Promise<AssessmentSectionWithItems | null> {
    return (await this.prisma.assessmentSection.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            question: {
              include: {
                option: true,
              },
            },
            questionGroup: {
              include: {
                media: true,
                questions: {
                  include: {
                    question: {
                      include: {
                        option: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })) as AssessmentSectionWithItems | null
  }

  async checkIdAssessmentPaper(id: number) {
    return await this.prisma.assessmentPaper.findUnique({
      where: { id },
    })
  }
  async findByIdWithAssessment(id: number): Promise<AssessmentSectionWithAssessment | null> {
    return (await this.prisma.assessmentSection.findUnique({
      where: { id },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            level: true,
            type: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    })) as AssessmentSectionWithAssessment | null
  }

  async update(id: number, data: UpdateAssessmentSectionInput): Promise<AssessmentSection> {
    return await this.prisma.assessmentSection.update({
      where: { id },
      data,
    })
  }

  async delete(id: number): Promise<AssessmentSection> {
    return await this.prisma.assessmentSection.delete({
      where: { id },
    })
  }

  async findMany(query: AssessmentSectionQuery): Promise<{
    data: AssessmentSectionBasic[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    const { page = 1, limit = 20, search, type, assessmentId, sortBy = 'id', sortOrder = 'asc' } = query

    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (type) where.type = type
    if (assessmentId) where.assessmentId = assessmentId

    const orderBy: any = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    const [data, total] = await Promise.all([
      this.prisma.assessmentSection.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy,
        include: {
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      this.prisma.assessmentSection.count({ where }),
    ])

    return {
      data: data as AssessmentSectionBasic[],
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

  // ===== Assessment-specific Operations =====
  async findByAssessmentId(assessmentId: number): Promise<AssessmentSectionBasic[]> {
    const result = await this.prisma.assessmentSection.findMany({
      where: { assessmentId },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    })
    return result as AssessmentSectionBasic[]
  }

  async findByAssessmentIdWithItems(assessmentId: number): Promise<AssessmentSectionWithItems[]> {
    return (await this.prisma.assessmentSection.findMany({
      where: { assessmentId },
      include: {
        items: {
          include: {
            question: {
              include: {
                option: true,
              },
            },
            questionGroup: {
              include: {
                media: true,
                questions: {
                  include: {
                    question: {
                      include: {
                        option: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })) as AssessmentSectionWithItems[]
  }

  // ===== Bulk Operations =====
  async bulkCreate(
    assessmentId: number,
    sections: Omit<CreateAssessmentSectionInput, 'assessmentId'>[],
  ): Promise<AssessmentSection[]> {
    const sectionsWithAssessmentId = sections.map((section) => ({
      ...section,
      assessmentId,
    }))

    const result = await this.prisma.$transaction(
      sectionsWithAssessmentId.map((section) =>
        this.prisma.assessmentSection.create({
          data: section,
        }),
      ),
    )

    return result
  }

  async bulkDelete(ids: number[]): Promise<{ count: number }> {
    return await this.prisma.assessmentSection.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    })
  }

  async getStatistics(id: number): Promise<{
    totalItems: number
    itemsByType: Record<string, number>
  }> {
    const section = await this.prisma.assessmentSection.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            question: {
              select: {
                type: true,
              },
            },
            questionGroup: {
              select: {
                type: true,
              },
            },
          },
        },
      },
    })

    if (!section) {
      return {
        totalItems: 0,
        itemsByType: {},
      }
    }

    const totalItems = section.items.length
    const itemsByType: Record<string, number> = {}

    section.items.forEach((item) => {
      let type: string | undefined

      if (item.question) {
        type = item.question.type
      } else if (item.questionGroup) {
        type = item.questionGroup.type
      }

      if (type) {
        itemsByType[type] = (itemsByType[type] || 0) + 1
      }
    })

    return {
      totalItems,
      itemsByType,
    }
  }

  // ===== Copy Operations =====
  async copySection(id: number, targetAssessmentId: number, newTitle?: string): Promise<AssessmentSection> {
    const originalSection = await this.findByIdWithItems(id)
    if (!originalSection) {
      throw new Error('Section not found')
    }

    // Get the next order for the target assessment
    const lastSection = await this.prisma.assessmentSection.findFirst({
      where: { assessmentId: targetAssessmentId },
    })

    const newSection = await this.prisma.assessmentSection.create({
      data: {
        assessmentId: targetAssessmentId,
        title: newTitle || `${originalSection.title} (Copy)`,
        type: originalSection.type,
      },
    })

    // Copy all items
    if (originalSection.items.length > 0) {
      await this.prisma.assessmentItem.createMany({
        data: originalSection.items.map((item, index) => ({
          sectionId: newSection.id,
          questionId: item.questionId,
          questionGroupId: item.questionGroupId,
        })),
      })
    }

    return newSection
  }

  // ===== Move Operations =====
  async moveSection(id: number, targetAssessmentId: number): Promise<AssessmentSection> {
    // Get the next order for the target assessment
    const lastSection = await this.prisma.assessmentSection.findFirst({
      where: { assessmentId: targetAssessmentId },
    })

    return this.prisma.assessmentSection.update({
      where: { id },
      data: {
        assessmentId: targetAssessmentId,
      },
    })
  }

  // ===== Validation Helpers =====
  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentSection.count({
      where: { id },
    })
    return count > 0
  }

  async existsByIds(ids: number[]): Promise<number[]> {
    const sections = await this.prisma.assessmentSection.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: { id: true },
    })
    return sections.map((s) => s.id)
  }

  async getTitleExistsInAssessment(assessmentId: number, title: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.assessmentSection.count({
      where: {
        assessmentId,
        title,
        ...(excludeId && { id: { not: excludeId } }),
      },
    })
    return count > 0
  }

  // ===== Order Management =====
  async updateOrdersAfterDelete(assessmentId: number, deletedOrder: number): Promise<void> {
    await this.prisma.assessmentSection.updateMany({
      where: {
        assessmentId,
      },
      data: {},
    })
  }

  async insertAtOrder(assessmentId: number, insertOrder: number): Promise<void> {
    await this.prisma.assessmentSection.updateMany({
      where: {
        assessmentId,
      },
      data: {},
    })
  }

  // ===== Assessment Items Count =====
  async getItemCountForSection(sectionId: number): Promise<number> {
    return await this.prisma.assessmentItem.count({
      where: { sectionId },
    })
  }
}
