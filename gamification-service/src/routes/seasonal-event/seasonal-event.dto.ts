import { createZodDto } from "nestjs-zod";
import {
  CreateSeasonalEventSchema,
  UpdateSeasonalEventSchema,
} from "./seasonal-event.model";

export class CreateSeasonalEventDTO extends createZodDto(
  CreateSeasonalEventSchema,
) {}

export class UpdateSeasonalEventDTO extends createZodDto(
  UpdateSeasonalEventSchema,
) {}
