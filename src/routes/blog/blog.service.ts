import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { BlogRepository } from './blog.repo'
import { CreateBlogDTO, UpdateBlogDTO, QueryBlogDTO } from './blog.dto'
import { BlogWithRelations, BlogWhereInput, BlogOrderByInput } from './blog.model'
import { TagRepository } from '../tag/tag.repo'
import { S3Service } from 'src/shared/services/s3.service'

@Injectable()
export class BlogService {
  constructor(
    private readonly blogRepository: BlogRepository,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    createBlogDto: CreateBlogDTO,
    authorId: number,
    files?: { image?: Express.Multer.File[] },
  ): Promise<BlogWithRelations> {
    const { title, content, image, slug, tagIds } = createBlogDto

    // Check if slug already exists
    const slugExists = await this.blogRepository.checkSlugExists(slug)
    if (slugExists) {
      throw new ConflictException(`Blog with slug '${slug}' already exists`)
    }
    let imageUrl = createBlogDto.image
    if (files?.image?.[0]) {
      imageUrl = (await this.s3Service.uploadFileToS3(files.image[0], 'blogs')).url
    }
    // Validate that all tags exist
    if (tagIds && tagIds.length > 0) {
      const { exists, missingIds } = await this.blogRepository.checkTagsExist(tagIds)
      if (!exists) {
        throw new BadRequestException(`Tags with IDs [${missingIds.join(', ')}] do not exist`)
      }
    }
    const finalTagIds = tagIds?.map((id) => Number(id)) ?? []

    // Create the blog

    return this.blogRepository.create(
      {
        title,
        content,
        image: image ?? null,
        slug,
        author: {
          connect: { id: authorId },
        },
      },
      finalTagIds,
    )
  }

  async findAll(queryDto: QueryBlogDTO) {
    const { page, limit, search, tagId, authorId, sortBy, sortOrder } = queryDto
    const skip = (page - 1) * limit

    // Build where clause
    const where: BlogWhereInput = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (tagId) {
      where.tags = {
        some: {
          tagId: tagId,
        },
      }
    }

    if (authorId) {
      where.authorId = authorId
    }

    // Build orderBy clause
    const orderBy: BlogOrderByInput = {}
    if (sortBy === 'date') {
      orderBy.date = sortOrder
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder
    }

    const { blogs, total } = await this.blogRepository.findAll({
      skip,
      take: Number(limit),
      where,
      orderBy,
    })

    return {
      data: blogs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findOne(id: number): Promise<BlogWithRelations> {
    const blog = await this.blogRepository.findOne({ id })

    if (!blog) {
      throw new NotFoundException(`Blog with ID ${id} not found`)
    }

    return blog
  }

  async findBySlug(slug: string): Promise<BlogWithRelations> {
    const blog = await this.blogRepository.findBySlug(slug)

    if (!blog) {
      throw new NotFoundException(`Blog with slug '${slug}' not found`)
    }

    return blog
  }

  async update(
    id: number,
    updateBlogDto: UpdateBlogDTO,
    userId: number,
    files?: { image?: Express.Multer.File[] },
  ): Promise<BlogWithRelations> {
    // Check if blog exists
    const existingBlog = await this.findOne(id)

    if (updateBlogDto.slug && updateBlogDto.slug !== existingBlog.slug) {
      const slugExists = await this.blogRepository.checkSlugExists(updateBlogDto.slug, id)
      if (slugExists) {
        throw new ConflictException(`Blog with slug '${updateBlogDto.slug}' already exists`)
      }
    }

    // Validate that all tags exist if tagIds are provided
    if (updateBlogDto.tagIds && updateBlogDto.tagIds.length > 0) {
      const { exists, missingIds } = await this.blogRepository.checkTagsExist(updateBlogDto.tagIds)
      if (!exists) {
        throw new BadRequestException(`Tags with IDs [${missingIds.join(', ')}] do not exist`)
      }
    }

    const { tagIds, ...blogData } = updateBlogDto

    return this.blogRepository.update({
      where: { id },
      data: blogData,
      tagIds,
    })
  }

  async remove(id: number, userId: number): Promise<BlogWithRelations> {
    // Check if blog exists
    const blog = await this.findOne(id)

    // Delete the blog (cascade will handle BlogTag associations)
    const deletedBlog = await this.blogRepository.delete({ id })

    return blog // Return the blog with relations before deletion
  }

  async findByAuthor(authorId: number, queryDto: QueryBlogDTO) {
    return this.findAll({ ...queryDto, authorId })
  }

  async findByTag(tagId: number, queryDto: QueryBlogDTO) {
    return this.findAll({ ...queryDto, tagId })
  }
}
