import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  Tag,
  TagResponseType,
  TagCreateInputType,
  TagUpdateInputType,
  TagWhereUniqueInputType,
  TagWhereInputType,
  TagOrderByInputType,
} from './tag.model'

@Injectable()
export class TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: TagCreateInputType): Promise<TagResponseType> {
    return await this.prisma.tag.create({
      data,
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    })
  }

  async findAll(params: {
    skip?: number
    take?: number
    where?: TagWhereInputType
    orderBy?: TagOrderByInputType
  }): Promise<{ tags: TagResponseType[]; total: number }> {
    const { skip, take, where, orderBy } = params

    const [tags, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        orderBy: orderBy as any,
        include: {
          _count: {
            select: { blogs: true },
          },
        },
      }),
      this.prisma.tag.count({ where }),
    ])

    return { tags, total }
  }

  async findOne(where: TagWhereUniqueInputType): Promise<TagResponseType | null> {
    return await this.prisma.tag.findUnique({
      where: where as any,
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    })
  }

  async findBySlug(slug: string): Promise<TagResponseType | null> {
    return await this.prisma.tag.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    })
  }

  async update(params: { where: TagWhereUniqueInputType; data: TagUpdateInputType }): Promise<TagResponseType> {
    const { where, data } = params
    return await this.prisma.tag.update({
      where: where as any,
      data,
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    })
  }

  async delete(where: TagWhereUniqueInputType): Promise<TagResponseType> {
    return await this.prisma.tag.delete({
      where: where as any,
    })
  }

  async checkSlugExists(slug: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.tag.count({
      where: {
        slug,
        ...(excludeId && { id: { not: excludeId } }),
      },
    })
    return count > 0
  }
}
