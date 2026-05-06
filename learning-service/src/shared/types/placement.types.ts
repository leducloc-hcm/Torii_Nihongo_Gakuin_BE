// PlacementBlueprint type definition to replace Prisma import
import { JLPTLevelType } from 'src/shared/constants/enum.constant'

export interface PlacementBlueprintType {
  id: number
  level: JLPTLevelType
  totalQuestions: number
  vocabKanji: number
  grammar: number
  synonym: number
  orderSentence: number
  readingShort: number
  readingMedium: number
  active: boolean
}

export interface PlacementBlueprintCreateData {
  level: JLPTLevelType
  totalQuestions: number
  vocabKanji: number
  grammar: number
  synonym: number
  orderSentence: number
  readingShort: number
  readingMedium: number
  active: boolean
}

export interface PlacementBlueprintUpdateData {
  level?: JLPTLevelType
  totalQuestions?: number
  vocabKanji?: number
  grammar?: number
  synonym?: number
  orderSentence?: number
  readingShort?: number
  readingMedium?: number
  active?: boolean
}

export interface PlacementBlueprintWhereUniqueInput {
  id?: number
}

export interface PlacementBlueprintWhereInput {
  id?: number | { not: number }
  level?: JLPTLevelType
  active?: boolean
  totalQuestions?: number | { gte?: number; lte?: number }
}

export interface PlacementBlueprintOrderByInput {
  id?: 'asc' | 'desc'
  level?: 'asc' | 'desc'
  totalQuestions?: 'asc' | 'desc'
  active?: 'asc' | 'desc'
}
