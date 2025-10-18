// Question and related entity types to replace Prisma imports
import {
  JLPTLevelType,
  QuestionTypeType,
  DifficultyType,
  ReadingLengthType,
  QuestionGroupTypeType,
  VisibilityType,
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

// TestAttempt Type Definition
export interface TestAttemptType {
  id: number
  userId: number
  testId: number
  startedAt: Date
  submittedAt: Date | null
  score: number | null
  levelSuggestion: JLPTLevelType | null
}

export interface TestAttemptCreateData {
  userId: number
  testId: number
  startedAt?: Date
  submittedAt?: Date | null
  score?: number | null
  levelSuggestion?: JLPTLevelType | null
}

export interface TestAttemptUpdateData {
  userId?: number
  testId?: number
  startedAt?: Date
  submittedAt?: Date | null
  score?: number | null
  levelSuggestion?: JLPTLevelType | null
}

export interface TestAttemptWhereUniqueInput {
  id?: number
  userId_testId?: { userId: number; testId: number }
}

export interface TestAttemptWhereInput {
  id?: number
  userId?: number
  testId?: number
  submittedAt?: Date | null
  score?: number | { gte?: number; lte?: number }
}

// TestItem Type Definition
export interface TestItemType {
  id: number
  sectionId: number
  questionId: number
  order: number
}

export interface TestItemCreateData {
  sectionId: number
  questionId: number
  order?: number
}

export interface TestItemUpdateData {
  sectionId?: number
  questionId?: number
  order?: number
}

export interface TestItemWhereUniqueInput {
  id?: number
}

export interface TestItemWhereInput {
  id?: number
  sectionId?: number
  questionId?: number
}

// TestPaper Type Definition
export interface TestPaperType {
  id: number
  title: string
  level: JLPTLevelType
  createdAt: Date
  visibility: VisibilityType
  blueprintId: number | null
  blueprintSnapshot: any
  seed: bigint | null
  version: number
  generatorVersion: string | null
  generatorMeta: any
}

export interface TestPaperCreateData {
  title: string
  level: JLPTLevelType
  visibility?: VisibilityType
  blueprintId?: number | null
  blueprintSnapshot?: any
  seed?: bigint | null
  version?: number
  generatorVersion?: string | null
  generatorMeta?: any
}

export interface TestPaperUpdateData {
  title?: string
  level?: JLPTLevelType
  visibility?: VisibilityType
  blueprintId?: number | null
  blueprintSnapshot?: any
  seed?: bigint | null
  version?: number
  generatorVersion?: string | null
  generatorMeta?: any
}

export interface TestPaperWhereUniqueInput {
  id?: number
}

export interface TestPaperWhereInput {
  id?: number
  level?: JLPTLevelType
  visibility?: VisibilityType
  blueprintId?: number | null
}

// TestSection Type Definition
export interface TestSectionType {
  id: number
  testId: number
  title: string
  type: QuestionTypeType
  order: number
}

export interface TestSectionCreateData {
  testId: number
  title: string
  type: QuestionTypeType
  order?: number
}

export interface TestSectionUpdateData {
  testId?: number
  title?: string
  type?: QuestionTypeType
  order?: number
}

export interface TestSectionWhereUniqueInput {
  id?: number
}

export interface TestSectionWhereInput {
  id?: number
  testId?: number
  type?: QuestionTypeType
}
