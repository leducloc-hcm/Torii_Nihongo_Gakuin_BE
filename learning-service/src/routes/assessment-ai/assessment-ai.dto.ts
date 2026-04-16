import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from "class-validator";

export class GenerateAssessmentByAIDto {
  @IsInt()
  @IsPositive()
  assessmentId: number;

  @IsInt()
  @IsPositive()
  sectionId: number;

  @IsInt()
  @IsPositive()
  baseItemId: number;

  @IsString()
  @IsIn(["VOCAB", "KANJI", "GRAMMAR", "READING"])
  sectionType: "VOCAB" | "KANJI" | "GRAMMAR" | "READING";

  @IsString()
  @IsIn(["N5", "N4", "N3", "N2", "N1"])
  level: "N5" | "N4" | "N3" | "N2" | "N1";

  @IsOptional()
  @IsString()
  @IsIn(["EASY", "MEDIUM", "HARD"])
  difficulty?: "EASY" | "MEDIUM" | "HARD";

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  itemCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  questionsPerItem?: number;

  @IsOptional()
  @IsString()
  @IsIn(["READING_SHORT", "READING_MEDIUM", "READING_LONG"])
  readingGroupType?: "READING_SHORT" | "READING_MEDIUM" | "READING_LONG";

  @IsOptional()
  @IsNumber()
  @Min(0)
  scorePerQuestion?: number;
}
