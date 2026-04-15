import { z } from "zod";
import { JLPTLevel, Visibility } from "@prisma/client";

// Enum schemas
const JLPTLevelSchema = z.nativeEnum(JLPTLevel);
const VisibilitySchema = z.nativeEnum(Visibility);

// Deck Schemas
export const CreateFlashcardDeckSchema = z.object({
  title: z.string().min(1, "Title is required"),
  level: JLPTLevelSchema.optional(),
  visibility: VisibilitySchema.default(Visibility.PRIVATE),
});

export const UpdateFlashcardDeckSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  level: JLPTLevelSchema.optional(),
  visibility: VisibilitySchema.optional(),
});

// Flashcard Schemas
export const CreateFlashcardSchema = z.object({
  deckId: z.number().int().positive(),
  front: z.string().min(1, "Front content is required"),
  back: z.string().min(1, "Back content is required"),
  examples: z.string().optional(),
  hints: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const UpdateFlashcardSchema = z.object({
  front: z.string().min(1, "Front content is required").optional(),
  back: z.string().min(1, "Back content is required").optional(),
  examples: z.string().optional(),
  hints: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Study Session Schemas
export const StudyResponseSchema = z.object({
  cardId: z.number().int().positive(),
  grade: z.number().int().min(0).max(5), // 0: failed, 1-5: quality of response
});

export const BulkStudyResponseSchema = z.object({
  responses: z.array(StudyResponseSchema),
});

// Response Schemas
export const FlashcardResponseSchema = z.object({
  id: z.number(),
  front: z.string(),
  back: z.string(),
  examples: z.string().nullable(),
  hints: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.date(),
});

export const FlashcardDeckResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  level: JLPTLevelSchema.nullable(),
  visibility: VisibilitySchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  cardCount: z.number(),
  owner: z.object({
    id: z.number(),
    name: z.string(),
  }),
});

export const CardProgressResponseSchema = z.object({
  id: z.number(),
  cardId: z.number(),
  ef: z.number(), // easiness factor
  interval: z.number(), // days
  repetitions: z.number(),
  dueAt: z.date(),
  lastGrade: z.number().nullable(),
  card: FlashcardResponseSchema,
});

export const StudySessionResponseSchema = z.object({
  totalCards: z.number(),
  dueCards: z.number(),
  newCards: z.number(),
  reviewCards: z.number(),
  cards: z.array(CardProgressResponseSchema),
});

// Query Schemas
export const GetDecksQuerySchema = z.object({
  level: JLPTLevelSchema.optional(),
  visibility: VisibilitySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const GetStudyCardsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  newCardsOnly: z.coerce.boolean().default(false),
  dueCardsOnly: z.coerce.boolean().default(false),
});

// AI Generation schema
export const GenerateFlashcardsSchema = z
  .object({
    topic: z.string().trim().min(1).optional(),
    prompt: z.string().trim().min(1).optional(),
    level: JLPTLevelSchema.default(JLPTLevel.N5),
    count: z.coerce.number().int().min(1).max(50).default(20),
    language: z.enum(["vi", "en", "ja"]).default("vi"),
  })
  .refine((data) => Boolean(data.topic || data.prompt), {
    message: "Either topic or prompt is required",
    path: ["topic"],
  });

// Export types
export type CreateFlashcardDeckInput = z.infer<
  typeof CreateFlashcardDeckSchema
>;
export type UpdateFlashcardDeckInput = z.infer<
  typeof UpdateFlashcardDeckSchema
>;
export type CreateFlashcardInput = z.infer<typeof CreateFlashcardSchema>;
export type UpdateFlashcardInput = z.infer<typeof UpdateFlashcardSchema>;
export type StudyResponseInput = z.infer<typeof StudyResponseSchema>;
export type BulkStudyResponseInput = z.infer<typeof BulkStudyResponseSchema>;
export type GetDecksQueryInput = z.infer<typeof GetDecksQuerySchema>;
export type GetStudyCardsQueryInput = z.infer<typeof GetStudyCardsQuerySchema>;
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsSchema>;
