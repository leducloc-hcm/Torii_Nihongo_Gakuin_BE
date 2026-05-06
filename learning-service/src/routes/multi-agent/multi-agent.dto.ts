import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export class MultiAgentRouteDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsString()
  @IsIn(["QNA", "GENERATE_TEST", "REVIEW_MISTAKES", "BUILD_STUDY_PLAN"])
  intent?: "QNA" | "GENERATE_TEST" | "REVIEW_MISTAKES" | "BUILD_STUDY_PLAN";

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
