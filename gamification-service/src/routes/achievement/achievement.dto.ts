import { createZodDto } from "nestjs-zod";
import { CreateAchievementSchema } from "./achievement.model";

export class CreateAchievementDTO extends createZodDto(
  CreateAchievementSchema,
) {}
