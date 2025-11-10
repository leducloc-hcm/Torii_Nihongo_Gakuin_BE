import { createZodDto } from 'nestjs-zod'
import {
  CreateModuleSchema,
  UpdateModuleSchema,
  QueryModuleSchema,
  ModuleResponseSchema,
  ModuleListItemSchema,
} from './module.model'

export class CreateModuleDTO extends createZodDto(CreateModuleSchema) {}
export class UpdateModuleDTO extends createZodDto(UpdateModuleSchema) {}
export class QueryModuleDTO extends createZodDto(QueryModuleSchema) {}
export class ModuleResponseDTO extends createZodDto(ModuleResponseSchema) {}
export class ModuleListItemDTO extends createZodDto(ModuleListItemSchema) {}
