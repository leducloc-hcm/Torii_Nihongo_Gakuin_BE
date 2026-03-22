import { createZodDto } from "nestjs-zod";
import { LeaderboardQuerySchema } from "./leaderboard.model";

export class LeaderboardQueryDTO extends createZodDto(LeaderboardQuerySchema) {}
