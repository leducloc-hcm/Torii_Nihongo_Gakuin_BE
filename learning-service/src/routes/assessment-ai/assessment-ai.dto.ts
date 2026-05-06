import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

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

export class EvaluateWrongAnswersDto {
  @IsInt()
  @IsPositive()
  attemptId: number;

  @IsOptional()
  @IsString()
  @IsIn(["vi", "en", "ja"])
  language?: "vi" | "en" | "ja";

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxQuestions?: number;

  @IsOptional()
  @IsBoolean()
  forceRegenerate?: boolean;
}

export class GenerateQuestionBankDto {
  @IsString()
  @IsIn(["VOCAB", "KANJI", "GRAMMAR", "READING"])
  type: "VOCAB" | "KANJI" | "GRAMMAR" | "READING";

  @IsString()
  @IsIn(["N5", "N4", "N3", "N2", "N1"])
  level: "N5" | "N4" | "N3" | "N2" | "N1";

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsOptional()
  @IsString()
  @IsIn(["EASY", "MEDIUM", "HARD"])
  difficulty?: "EASY" | "MEDIUM" | "HARD";

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  count?: number;

  @IsOptional()
  @IsString()
  @IsIn(["READING_SHORT", "READING_MEDIUM", "READING_LONG"])
  readingGroupType?: "READING_SHORT" | "READING_MEDIUM" | "READING_LONG";
}

export class PreviewAssessmentByAIDto {
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
}

export class WrongQuestionItemDto {
  @IsString()
  stem: string;

  @IsString()
  correctAnswer: string;

  @IsString()
  selectedAnswer: string;

  @IsArray()
  options: { content: string; isCorrect: boolean }[];
}

export class GenerateFlashcardsFromWrongAnswersDto {
  @IsString()
  @IsIn(["VOCAB", "KANJI", "GRAMMAR", "READING"])
  sectionType: "VOCAB" | "KANJI" | "GRAMMAR" | "READING";

  @IsString()
  @IsIn(["N5", "N4", "N3", "N2", "N1"])
  level: "N5" | "N4" | "N3" | "N2" | "N1";

  @IsString()
  @IsNotEmpty()
  assessmentTitle: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WrongQuestionItemDto)
  wrongQuestions: WrongQuestionItemDto[];

  @IsOptional()
  @IsString()
  @IsIn(["vi", "en", "ja"])
  language?: "vi" | "en" | "ja";
}

export class GenerateSimilarQuestionDto {
  @IsString()
  @IsNotEmpty()
  sourceStem: string;

  @IsString()
  @IsNotEmpty()
  sourceCorrectAnswer: string;

  @IsString()
  @IsNotEmpty()
  sourceSelectedAnswer: string;

  @IsString()
  @IsNotEmpty()
  sourceOptions: string;

  @IsString()
  @IsIn(["VOCAB", "KANJI", "GRAMMAR", "READING", "LISTENING"])
  sectionType: string;

  @IsOptional()
  @IsString()
  @IsIn(["N5", "N4", "N3", "N2", "N1"])
  level?: string;

  @IsOptional()
  @IsString()
  @IsIn(["vi", "en", "ja"])
  language?: string;

  @IsOptional()
  @IsString()
  existingStems?: string;
}
