import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

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
}
