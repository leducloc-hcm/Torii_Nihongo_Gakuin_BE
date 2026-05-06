import { createZodDto } from "nestjs-zod";
import { CreateRewardSchema, UpdateRewardSchema } from "./reward.model";

export class CreateRewardDTO extends createZodDto(CreateRewardSchema) {}
export class UpdateRewardDTO extends createZodDto(UpdateRewardSchema) {}
