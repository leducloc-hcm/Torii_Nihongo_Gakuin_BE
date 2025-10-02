import { createZodDto } from 'nestjs-zod'
import {
  CreateBlogSchema,
  UpdateBlogSchema,
  QueryBlogSchema,
  BlogResponseSchema,
  BlogListItemSchema,
} from './blog.model'

export class CreateBlogDTO extends createZodDto(CreateBlogSchema) {}
export class UpdateBlogDTO extends createZodDto(UpdateBlogSchema) {}
export class QueryBlogDTO extends createZodDto(QueryBlogSchema) {}
export class BlogResponseDTO extends createZodDto(BlogResponseSchema) {}
export class BlogListItemDTO extends createZodDto(BlogListItemSchema) {}
