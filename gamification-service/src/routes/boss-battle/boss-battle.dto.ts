import { z } from "zod";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsInt,
  IsArray,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from "class-validator";

// ── Start Battle ──
export class StartBattleDto {
  @ApiProperty({ description: "ID of the boss config to fight" })
  @IsInt()
  bossConfigId: number;
}

// ── Submit Answer ──
export class SubmitAnswerDto {
  @ApiProperty({ description: "The answer the user selected" })
  @IsString()
  answer: string;

  @ApiProperty({ description: "Seconds remaining when answer was submitted" })
  @IsNumber()
  @Min(0)
  timeLeft: number;
}

// ── Admin: Create Boss Config ──
export class CreateBossConfigDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ enum: ["N5", "N4", "N3", "N2", "N1"] })
  @IsString()
  jlptLevel: string;

  @ApiProperty()
  @IsInt()
  @Min(10)
  hp: number;

  @ApiProperty({ description: "Seconds per question" })
  @IsInt()
  @Min(2)
  @Max(15)
  timeLimit: number;

  @ApiProperty({ type: [String], example: ["meaning", "reading"] })
  @IsArray()
  questionTypes: string[];

  @ApiProperty({ type: [String], example: ["N4", "N5"] })
  @IsArray()
  kanjiPool: string[];

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  distractorSimilarity?: number;

  @ApiPropertyOptional({ type: [String], example: ["blur", "time_reduce"] })
  @IsOptional()
  @IsArray()
  bossSkills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  enrageThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  baseDamage?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  baseXpReward: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  baseCoinReward: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBossConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  hp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  timeLimit?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  questionTypes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  kanjiPool?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  distractorSimilarity?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  bossSkills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  enrageThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  baseDamage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  baseXpReward?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  baseCoinReward?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
