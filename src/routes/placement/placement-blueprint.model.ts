import { z } from 'zod'
import { Prisma, JLPTLevel } from '@prisma/client'

// Enums
export const JLPTLevelEnum = z.enum(['N5', 'N4', 'N3', 'N2', 'N1'])

// PlacementBlueprint Schema
export const PlacementBlueprintSchema = z.object({
  id: z.number().int().positive(),
  level: JLPTLevelEnum,
  totalQuestions: z.number().int().min(1).max(100),
  vocabKanji: z.number().int().min(0),
  grammar: z.number().int().min(0),
  synonym: z.number().int().min(0),
  orderSentence: z.number().int().min(0),
  readingShort: z.number().int().min(0),
  readingMedium: z.number().int().min(0),
  active: z.boolean(),
})

// Create PlacementBlueprint Schema
export const CreatePlacementBlueprintSchema = PlacementBlueprintSchema.omit({ id: true, active: true }).refine(
  (data) => {
    const sum =
      data.vocabKanji + data.grammar + data.synonym + data.orderSentence + data.readingShort + data.readingMedium
    return sum === data.totalQuestions
  },
  {
    message: 'Sum of question types must equal totalQuestions',
    path: ['totalQuestions'],
  },
)

// Update PlacementBlueprint Schema
export const UpdatePlacementBlueprintSchema = PlacementBlueprintSchema.omit({ id: true, active: true })
  .partial()
  .refine(
    (data) => {
      if (data.totalQuestions !== undefined) {
        const sum =
          (data.vocabKanji ?? 0) +
          (data.grammar ?? 0) +
          (data.synonym ?? 0) +
          (data.orderSentence ?? 0) +
          (data.readingShort ?? 0) +
          (data.readingMedium ?? 0)
        return sum <= data.totalQuestions
      }
      return true
    },
    {
      message: 'Sum of question types cannot exceed totalQuestions',
      path: ['totalQuestions'],
    },
  )

// Query PlacementBlueprint Schema
export const QueryPlacementBlueprintSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  level: JLPTLevelEnum.optional(),
  active: z.coerce.boolean().optional(),
  sortBy: z.enum(['level', 'totalQuestions', 'active']).optional().default('level'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

// PlacementBlueprint Response Schema
export const PlacementBlueprintResponseSchema = PlacementBlueprintSchema

// PlacementBlueprint List Item Schema
export const PlacementBlueprintListItemSchema = PlacementBlueprintSchema

// Activate Blueprint Schema
export const ActivateBlueprintSchema = z.object({
  activate: z.boolean().default(true),
})

// Type definitions for Prisma
export type PlacementBlueprint = z.infer<typeof PlacementBlueprintSchema>

export type PlacementBlueprintCreateInput = Prisma.PlacementBlueprintCreateInput
export type PlacementBlueprintUpdateInput = Prisma.PlacementBlueprintUpdateInput
export type PlacementBlueprintWhereUniqueInput = Prisma.PlacementBlueprintWhereUniqueInput
export type PlacementBlueprintWhereInput = Prisma.PlacementBlueprintWhereInput
export type PlacementBlueprintOrderByInput = Prisma.PlacementBlueprintOrderByWithRelationInput
