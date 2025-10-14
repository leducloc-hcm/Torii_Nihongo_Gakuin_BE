import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  Blog,
  BlogWithRelations,
  BlogCreateInput,
  BlogUpdateInput,
  BlogWhereUniqueInput,
  BlogWhereInput,
  BlogOrderByInput,
} from './blog.model'
import { TagRepository } from 'src/routes/tag/tag.repo'

@Injectable()
export class BlogRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tagRepository: TagRepository,
  ) {}

  private readonly includeRelations = {
    author: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    tags: {
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
      },
    },
  }

  async create(data: BlogCreateInput, tagIds?: number[]): Promise<BlogWithRelations> {
    return this.prisma.blog.create({
      data: {
        ...data,
        ...(tagIds &&
          tagIds.length > 0 && {
            tags: {
              create: tagIds.map((tagId) => ({
                tag: { connect: { id: tagId } },
              })),
            },
          }),
      },
      include: this.includeRelations,
    }) as Promise<BlogWithRelations>
  }

  async findAll(params: {
    skip?: number
    take?: number
    where?: BlogWhereInput
    orderBy?: BlogOrderByInput
  }): Promise<{ blogs: BlogWithRelations[]; total: number }> {
    const { skip, take, where, orderBy } = params

    const [blogs, total] = await Promise.all([
      this.prisma.blog.findMany({
        where: where as any,
        orderBy: orderBy as any,
        include: this.includeRelations,
      }) as Promise<BlogWithRelations[]>,
      this.prisma.blog.count({ where: where as any }),
    ])

    return { blogs, total }
  }

  async findOne(where: BlogWhereUniqueInput): Promise<BlogWithRelations | null> {
    return this.prisma.blog.findUnique({
      where: where as any,
      include: this.includeRelations,
    }) as Promise<BlogWithRelations | null>
  }

  async findBySlug(slug: string): Promise<BlogWithRelations | null> {
    return this.prisma.blog.findUnique({
      where: { slug },
      include: this.includeRelations,
    }) as Promise<BlogWithRelations | null>
  }

  async update(params: {
    where: BlogWhereUniqueInput
    data: BlogUpdateInput
    tagIds?: number[]
  }): Promise<BlogWithRelations> {
    const { where, data, tagIds } = params

    // If tagIds are provided, we need to update the tags
    if (tagIds !== undefined) {
      // First, delete all existing tag associations
      await this.prisma.blogTag.deleteMany({
        where: { blogId: where.id as number },
      })

      // Then create new tag associations
      return this.prisma.blog.update({
        where: where as any,
        data: {
          ...data,
          tags: {
            create: tagIds.map((tagId) => ({
              tag: { connect: { id: Number(tagId) } },
            })),
          },
        },
        include: this.includeRelations,
      }) as Promise<BlogWithRelations>
    }

    return this.prisma.blog.update({
      where: where as any,
      data,
      include: this.includeRelations,
    }) as Promise<BlogWithRelations>
  }

  async delete(where: BlogWhereUniqueInput): Promise<Blog> {
    // Delete associated BlogTags first (cascade should handle this, but being explicit)
    await this.prisma.blogTag.deleteMany({
      where: { blogId: where.id as number },
    })

    return this.prisma.blog.delete({
      where: where as any,
    })
  }

  async checkSlugExists(slug: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.blog.count({
      where: {
        slug,
        ...(excludeId && { id: { not: excludeId } }),
      },
    })
    return count > 0
  }

  async checkTagsExist(tagIds: number[]): Promise<{ exists: boolean; missingIds: number[] }> {
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: tagIds.map(Number) } },
      select: { id: true },
    })

    const foundIds = tags.map((tag) => tag.id)
    const missingIds = tagIds.map((id) => parseInt(id as any, 10)).filter((id) => !foundIds.includes(id))

    return {
      exists: missingIds.length === 0,
      missingIds,
    }
  }
}
