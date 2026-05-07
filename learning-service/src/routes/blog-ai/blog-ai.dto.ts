import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class GenerateBlogDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsOptional()
  @IsString()
  @IsIn(["vi", "en", "ja"])
  language?: "vi" | "en" | "ja";

  @IsOptional()
  @IsString()
  @IsIn(["educational", "news", "story", "tips"])
  style?: "educational" | "news" | "story" | "tips";

  @IsOptional()
  @IsString()
  @IsIn(["beginner", "intermediate", "advanced", "general"])
  targetAudience?: "beginner" | "intermediate" | "advanced" | "general";

  @IsOptional()
  @IsString()
  @IsIn(["N5", "N4", "N3", "N2", "N1"])
  jlptLevel?: "N5" | "N4" | "N3" | "N2" | "N1";

  @IsOptional()
  @IsString()
  @MaxLength(300)
  context?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}
