import { createZodDto } from 'nestjs-zod'
import { CreateTagSchema, UpdateTagSchema, QueryTagSchema, TagResponseSchema } from './tag.model'

export class CreateTagDTO extends createZodDto(CreateTagSchema) {}
export class UpdateTagDTO extends createZodDto(UpdateTagSchema) {}
export class QueryTagDTO extends createZodDto(QueryTagSchema) {}
export class TagResponseDTO extends createZodDto(TagResponseSchema) {}
