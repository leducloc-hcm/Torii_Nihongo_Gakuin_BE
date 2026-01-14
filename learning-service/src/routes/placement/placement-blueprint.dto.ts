import { createZodDto } from 'nestjs-zod'
import {
  CreatePlacementBlueprintSchema,
  UpdatePlacementBlueprintSchema,
  QueryPlacementBlueprintSchema,
  PlacementBlueprintResponseSchema,
  PlacementBlueprintListItemSchema,
  ActivateBlueprintSchema,
} from './placement-blueprint.model'

export class CreatePlacementBlueprintDTO extends createZodDto(CreatePlacementBlueprintSchema) {}
export class UpdatePlacementBlueprintDTO extends createZodDto(UpdatePlacementBlueprintSchema) {}
export class QueryPlacementBlueprintDTO extends createZodDto(QueryPlacementBlueprintSchema) {}
export class PlacementBlueprintResponseDTO extends createZodDto(PlacementBlueprintResponseSchema) {}
export class PlacementBlueprintListItemDTO extends createZodDto(PlacementBlueprintListItemSchema) {}
export class ActivateBlueprintDTO extends createZodDto(ActivateBlueprintSchema) {}
