import { createZodDto } from 'nestjs-zod'
import {
  CreateFlashcardDeckSchema,
  UpdateFlashcardDeckSchema,
  CreateFlashcardSchema,
  UpdateFlashcardSchema,
  StudyResponseSchema,
  BulkStudyResponseSchema,
  GetDecksQuerySchema,
  GetStudyCardsQuerySchema,
} from './flashcard.model'

// Deck DTOs
export class CreateFlashcardDeckDto extends createZodDto(CreateFlashcardDeckSchema) {}
export class UpdateFlashcardDeckDto extends createZodDto(UpdateFlashcardDeckSchema) {}

// Flashcard DTOs
export class CreateFlashcardDto extends createZodDto(CreateFlashcardSchema) {}
export class UpdateFlashcardDto extends createZodDto(UpdateFlashcardSchema) {}

// Study Session DTOs
export class StudyResponseDto extends createZodDto(StudyResponseSchema) {}
export class BulkStudyResponseDto extends createZodDto(BulkStudyResponseSchema) {}

// Query DTOs
export class GetDecksQueryDto extends createZodDto(GetDecksQuerySchema) {}
export class GetStudyCardsQueryDto extends createZodDto(GetStudyCardsQuerySchema) {}
