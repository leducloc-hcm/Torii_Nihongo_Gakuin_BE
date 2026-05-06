import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { TagRepository } from "./tag.repo";
import {
  Tag,
  TagResponseType,
  CreateTagType,
  UpdateTagType,
  QueryTagType,
} from "./tag.model";

@Injectable()
export class TagService {
  constructor(private readonly tagRepository: TagRepository) {}

  async create(createTagDto: CreateTagType): Promise<TagResponseType> {
    const { name, description, slug } = createTagDto;

    // Check if slug already exists
    const slugExists = await this.tagRepository.checkSlugExists(slug);
    if (slugExists) {
      throw new ConflictException(`Tag with slug '${slug}' already exists`);
    }

    return this.tagRepository.create({
      name,
      description: description ?? null,
      slug,
    });
  }

  async findAll(queryDto: QueryTagType) {
    const { page, limit, search } = queryDto;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const { tags, total } = await this.tagRepository.findAll({
      skip,
      take: Number(limit),
      where,
      orderBy: { name: "asc" },
    });

    return {
      data: tags,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<TagResponseType> {
    const tag = await this.tagRepository.findOne({ id });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return tag;
  }

  async findBySlug(slug: string): Promise<TagResponseType> {
    const tag = await this.tagRepository.findBySlug(slug);

    if (!tag) {
      throw new NotFoundException(`Tag with slug '${slug}' not found`);
    }

    return tag;
  }

  async update(
    id: number,
    updateTagDto: UpdateTagType,
  ): Promise<TagResponseType> {
    // Check if tag exists
    await this.findOne(id);

    // If slug is being updated, check if it's already taken
    if (updateTagDto.slug) {
      const slugExists = await this.tagRepository.checkSlugExists(
        updateTagDto.slug,
        id,
      );
      if (slugExists) {
        throw new ConflictException(
          `Tag with slug '${updateTagDto.slug}' already exists`,
        );
      }
    }

    return this.tagRepository.update({
      where: { id },
      data: updateTagDto,
    });
  }

  async remove(id: number): Promise<Tag> {
    // Check if tag exists
    const tag = await this.findOne(id);

    // Check if tag has associated blogs
    if (tag._count && tag._count.blogs > 0) {
      throw new BadRequestException(
        `Cannot delete tag '${tag.name}' because it is associated with ${tag._count.blogs} blog(s)`,
      );
    }

    return this.tagRepository.delete({ id });
  }
}
