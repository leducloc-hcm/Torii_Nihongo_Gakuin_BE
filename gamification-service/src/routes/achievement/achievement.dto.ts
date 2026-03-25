import { createZodDto } from "nestjs-zod";
import {
  CreateAchievementSchema,
  UpdateAchievementSchema,
} from "./achievement.model";

export class CreateAchievementDTO extends createZodDto(
  CreateAchievementSchema,
) {}

export class UpdateAchievementDTO extends createZodDto(
  UpdateAchievementSchema,
) {}
