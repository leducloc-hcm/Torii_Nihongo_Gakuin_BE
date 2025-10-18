// Question and related entity types to replace Prisma imports
import {
  JLPTLevelType,
  QuestionTypeType,
  DifficultyType,
  ReadingLengthType,
  QuestionGroupTypeType,
} from 'src/shared/constants/enum.constant'

// Question Type Definition
export interface QuestionType {
  id: number
  type: QuestionTypeType
  subType: string | null
  level: JLPTLevelType
  difficulty: DifficultyType
  stem: string
  passage: string | null
  mediaId: number | null
  explanation: string | null
  tags: string[]
  metadata: any
  createdAt: Date
  readingLength: ReadingLengthType | null
  tokenCount: number | null
  questionGroupId: number | null
}

// Option Type Definition
export interface OptionType {
  id: number
  questionId: number
  content: string | null
  imageId: number | null
  isCorrect: boolean
  order: number
}

// QuestionGroup Type Definition
export interface QuestionGroup {
  id: number
  type: QuestionGroupTypeType
  title: string | null
  passage: string | null
  mediaId: number | null
  order: number | null
  metadata: any
  createdAt: Date
}

// TestAnswer Type Definition
export interface TestAnswerType {
  id: number
  attemptId: number
  questionId: number
  selectedOptionId: number | null
  isCorrect: boolean | null
  timeSpentSec: number | null
  explanation: string | null
}

// Create/Update Input Types
export interface QuestionCreateData {
  type: QuestionTypeType
  subType?: string | null
  level: JLPTLevelType
  difficulty: DifficultyType
  stem: string
  passage?: string | null
  mediaId?: number | null
  explanation?: string | null
  tags?: string[]
  metadata?: any
  readingLength?: ReadingLengthType | null
  tokenCount?: number | null
  questionGroupId?: number | null
}

export interface QuestionUpdateData {
  type?: QuestionTypeType
  subType?: string | null
  level?: JLPTLevelType
  difficulty?: DifficultyType
  stem?: string
  passage?: string | null
  mediaId?: number | null
  explanation?: string | null
  tags?: string[]
  metadata?: any
  readingLength?: ReadingLengthType | null
  tokenCount?: number | null
  questionGroupId?: number | null
}

export interface OptionCreateData {
  questionId: number
  content?: string | null
  imageId?: number | null
  isCorrect?: boolean
  order?: number
}

export interface OptionUpdateData {
  questionId?: number
  content?: string | null
  imageId?: number | null
  isCorrect?: boolean
  order?: number
}

export interface QuestionGroupCreateData {
  type: QuestionGroupTypeType
  title?: string | null
  passage?: string | null
  mediaId?: number | null
  order?: number | null
  metadata?: any
}

export interface QuestionGroupUpdateData {
  type?: QuestionGroupTypeType
  title?: string | null
  passage?: string | null
  mediaId?: number | null
  order?: number | null
  metadata?: any
}

export interface TestAnswerCreateData {
  attemptId: number
  questionId: number
  selectedOptionId?: number | null
  isCorrect?: boolean | null
  timeSpentSec?: number | null
  explanation?: string | null
}

export interface TestAnswerUpdateData {
  attemptId?: number
  questionId?: number
  selectedOptionId?: number | null
  isCorrect?: boolean | null
  timeSpentSec?: number | null
  explanation?: string | null
}

// Where Input Types
export interface QuestionWhereUniqueInput {
  id?: number
}

export interface QuestionWhereInput {
  id?: number | { not: number }
  type?: QuestionTypeType
  level?: JLPTLevelType
  difficulty?: DifficultyType
  questionGroupId?: number | null
  mediaId?: number | null | { not: null }
  stem?: { contains?: string; mode?: 'insensitive' }
  passage?: { contains?: string; mode?: 'insensitive' } | null
  explanation?: { contains?: string; mode?: 'insensitive' } | null
  tags?: { has?: string; hasSome?: string[]; hasEvery?: string[] }
  AND?: QuestionWhereInput[]
  OR?: QuestionWhereInput[]
}

export interface QuestionOrderByInput {
  id?: 'asc' | 'desc'
  type?: 'asc' | 'desc'
  level?: 'asc' | 'desc'
  difficulty?: 'asc' | 'desc'
  createdAt?: 'asc' | 'desc'
}

// Similar patterns for other entities
export interface OptionWhereUniqueInput {
  id?: number
}

export interface OptionWhereInput {
  id?: number
  questionId?: number
  isCorrect?: boolean
}

export interface QuestionGroupWhereUniqueInput {
  id?: number
}

export interface QuestionGroupWhereInput {
  id?: number
  type?: QuestionGroupTypeType
}

export interface TestAnswerWhereUniqueInput {
  id?: number
}

export interface TestAnswerWhereInput {
  id?: number
  attemptId?: number
  questionId?: number
  isCorrect?: boolean | null
}
