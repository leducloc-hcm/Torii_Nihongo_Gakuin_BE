import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { ChatRole, QueryStatus, QueryType } from '@prisma/client'

@Injectable()
export class AIThreadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, title?: string) {
    return this.prisma.aIThread.create({
      data: {
        userId,
        title,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { citations: true },
        },
      },
    })
  }

  async findById(id: number) {
    return this.prisma.aIThread.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { citations: true },
        },
        queries: true,
      },
    })
  }

  async findByUserId(userId: number, limit = 20, page = 1) {
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.prisma.aIThread.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 5,
          },
        },
      }),
      this.prisma.aIThread.count({ where: { userId } }),
    ])

    return {
      data,
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

  async update(id: number, data: { title?: string }) {
    return this.prisma.aIThread.update({
      where: { id },
      data,
    })
  }

  async delete(id: number) {
    return this.prisma.aIThread.delete({
      where: { id },
    })
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.aIThread.count({
      where: { id },
    })
    return count > 0
  }

  async belongsToUser(id: number, userId: number): Promise<boolean> {
    const thread = await this.prisma.aIThread.findUnique({
      where: { id },
      select: { userId: true },
    })
    return thread?.userId === userId
  }
}

/**
 * AI Message Repository
 * Handles all database operations for AI chat messages
 */
@Injectable()
export class AIMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    threadId: number
    userId: number
    queryId?: string
    role: ChatRole
    content: string
    audioUrl?: string
    toolCalls?: any
  }) {
    return this.prisma.aIChatMessage.create({
      data,
      include: {
        citations: true,
      },
    })
  }

  async findByThreadId(threadId: number, limit = 20, page = 1) {
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.prisma.aIChatMessage.findMany({
        where: { threadId },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip,
        include: {
          citations: true,
        },
      }),
      this.prisma.aIChatMessage.count({ where: { threadId } }),
    ])

    return {
      data,
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

  async findByQueryId(queryId: string) {
    return this.prisma.aIChatMessage.findMany({
      where: { queryId },
      orderBy: { createdAt: 'asc' },
      include: {
        citations: true,
      },
    })
  }

  async delete(id: number) {
    return this.prisma.aIChatMessage.delete({
      where: { id },
    })
  }

  async deleteByThreadId(threadId: number) {
    return this.prisma.aIChatMessage.deleteMany({
      where: { threadId },
    })
  }

  async getAllByThreadId(threadId: number) {
    return this.prisma.aIChatMessage.findMany({
      where: { threadId },
      select: { id: true, createdAt: true, role: true, queryId: true },
      orderBy: { id: 'asc' },
    })
  }
}

/**
 * AI Query Repository
 * Handles all database operations for AI queries
 */
@Injectable()
export class AIQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    threadId: number
    userId: number
    query: string
    queryType: QueryType
    initialResponse?: string
    requiresApproval: boolean
    cacheKey?: string
  }) {
    return this.prisma.aIQuery.create({
      data: {
        ...data,
        status: QueryStatus.PENDING,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { citations: true },
        },
      },
    })
  }

  async findById(id: string) {
    return this.prisma.aIQuery.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { citations: true },
        },
        thread: true,
      },
    })
  }

  async findByCacheKey(cacheKey: string) {
    return this.prisma.aIQuery.findFirst({
      where: { cacheKey },
      orderBy: { createdAt: 'desc' },
    })
  }

  async update(
    id: string,
    data: {
      status?: QueryStatus
      executedTools?: any
      initialResponse?: string
    },
  ) {
    return this.prisma.aIQuery.update({
      where: { id },
      data,
    })
  }

  async findByThreadId(threadId: number, limit = 10) {
    return this.prisma.aIQuery.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  async deleteByThreadId(threadId: number) {
    return this.prisma.aIQuery.deleteMany({
      where: { threadId },
    })
  }
}
