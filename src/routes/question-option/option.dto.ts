import { createZodDto } from 'nestjs-zod'
import {
  CreateOptionSchema,
  UpdateOptionSchema,
  QueryOptionSchema,
  OptionResponseSchema,
  OptionListItemSchema,
  BulkCreateOptionsSchema,
  ReorderOptionsSchema,
} from './option.model'

export class CreateOptionDTO extends createZodDto(CreateOptionSchema) {}
export class UpdateOptionDTO extends createZodDto(UpdateOptionSchema) {}
export class QueryOptionDTO extends createZodDto(QueryOptionSchema) {}
export class OptionResponseDTO extends createZodDto(OptionResponseSchema) {}
export class OptionListItemDTO extends createZodDto(OptionListItemSchema) {}
export class BulkCreateOptionsDTO extends createZodDto(BulkCreateOptionsSchema) {}
export class ReorderOptionsDTO extends createZodDto(ReorderOptionsSchema) {}
