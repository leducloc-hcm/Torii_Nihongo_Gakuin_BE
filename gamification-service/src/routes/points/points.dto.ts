import { createZodDto } from "nestjs-zod";
import { AddPointsBodySchema, PointsHistoryQuerySchema } from "./points.model";

export class AddPointsBodyDTO extends createZodDto(AddPointsBodySchema) {}
export class PointsHistoryQueryDTO extends createZodDto(
  PointsHistoryQuerySchema,
) {}
