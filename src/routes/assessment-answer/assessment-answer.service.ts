import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import {
  AssessmentAnswerBase as AssessmentAnswer,
  AssessmentAnswerWithDetails,
  AssessmentAnswerWithQuestion,
  CreateAssessmentAnswerInput,
  UpdateAssessmentAnswerInput,
  BulkCreateAssessmentAnswersInput,
  GradeAssessmentAnswersInput,
  AssessmentAnswerQuery,
  AssessmentAnswerStatsInput,
  AssessmentAnswerAnalytics,
  AssessmentAnswerSummary,
  QuestionPerformance,
  calculateAccuracy,
  calculateAverageTime,
  groupAnswersByType,
  calculateQuestionDifficulty,
  generateAnswerExplanation,
  gradeAnswer,
  calculateAttemptScore,
  generateQuestionAnalytics,
  ASSESSMENT_ANSWER_ERRORS,
} from './assessment-answer.model'
import { AssessmentAnswerRepository } from 'src/routes/assessment-answer/assessment-answer.repo'

export interface PaginatedAssessmentAnswers {
  answers: AssessmentAnswerWithDetails[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

@Injectable()
export class AssessmentAnswerService {
  constructor(private readonly assessmentAnswerRepo: AssessmentAnswerRepository) {}
  async createAnswer(data: CreateAssessmentAnswerInput): Promise<AssessmentAnswer> {
    if (!(await this.assessmentAnswerRepo.attemptExists(data.attemptId))) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_NOT_FOUND)
    }

    if (await this.assessmentAnswerRepo.isAttemptSubmitted(data.attemptId)) {
      throw new BadRequestException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_SUBMITTED)
    }

    // Validate that the question exists
    if (!(await this.assessmentAnswerRepo.questionExists(data.questionId))) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.QUESTION_NOT_FOUND)
    }

    // Check if answer already exists for this attempt and question
    if (await this.assessmentAnswerRepo.answerExists(data.attemptId, data.questionId)) {
      throw new ConflictException(ASSESSMENT_ANSWER_ERRORS.ALREADY_ANSWERED)
    }

    // Validate option belongs to question if provided
    if (data.selectedOptionId) {
      if (!(await this.assessmentAnswerRepo.optionBelongsToQuestion(data.selectedOptionId, data.questionId))) {
        throw new BadRequestException(ASSESSMENT_ANSWER_ERRORS.INVALID_OPTION)
      }
    }

    return this.assessmentAnswerRepo.create(data)
  }

  async getAnswerById(
    id: number,
    includeRelations?: {
      question?: boolean
      attempt?: boolean
      selectedOption?: boolean
    },
  ): Promise<AssessmentAnswerWithDetails> {
    const answer = await this.assessmentAnswerRepo.findById(id, includeRelations)
    if (!answer) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.NOT_FOUND)
    }
    return answer
  }

  async getAnswers(query: AssessmentAnswerQuery): Promise<PaginatedAssessmentAnswers> {
    const { page = 1, limit = 20 } = query

    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0')
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100')
    }

    const result = await this.assessmentAnswerRepo.findMany(query)

    return {
      answers: result.answers,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    }
  }

  async updateAnswer(id: number, data: UpdateAssessmentAnswerInput): Promise<AssessmentAnswer> {
    // Check if answer exists
    const existing = await this.assessmentAnswerRepo.findById(id)
    if (!existing) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.NOT_FOUND)
    }

    // Check if attempt is still editable
    if (await this.assessmentAnswerRepo.isAttemptSubmitted(existing.attemptId)) {
      throw new BadRequestException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_SUBMITTED)
    }

    // Validate option belongs to question if provided
    if (data.selectedOptionId) {
      if (!(await this.assessmentAnswerRepo.optionBelongsToQuestion(data.selectedOptionId, existing.questionId))) {
        throw new BadRequestException(ASSESSMENT_ANSWER_ERRORS.INVALID_OPTION)
      }
    }

    return this.assessmentAnswerRepo.update(id, data)
  }

  async deleteAnswer(id: number): Promise<void> {
    const existing = await this.assessmentAnswerRepo.findById(id)
    if (!existing) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.NOT_FOUND)
    }

    // Check if attempt is still editable
    if (await this.assessmentAnswerRepo.isAttemptSubmitted(existing.attemptId)) {
      throw new BadRequestException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_SUBMITTED)
    }

    await this.assessmentAnswerRepo.delete(id)
  }

  // ===== Bulk Operations =====

  async createBulkAnswers(data: BulkCreateAssessmentAnswersInput): Promise<AssessmentAnswer[]> {
    // Validate all answers belong to the same attempt
    const attemptIds = [...new Set(data.answers.map((a) => a.attemptId))]
    if (attemptIds.length > 1) {
      throw new BadRequestException('All answers must belong to the same attempt')
    }

    const attemptId = attemptIds[0]

    // Validate attempt exists and is not submitted
    if (!(await this.assessmentAnswerRepo.attemptExists(attemptId))) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_NOT_FOUND)
    }

    if (await this.assessmentAnswerRepo.isAttemptSubmitted(attemptId)) {
      throw new BadRequestException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_SUBMITTED)
    }

    // Validate all questions exist and no duplicates
    const questionIds = data.answers.map((a) => a.questionId)
    const uniqueQuestionIds = [...new Set(questionIds)]
    if (questionIds.length !== uniqueQuestionIds.length) {
      throw new BadRequestException('Duplicate questions in answers')
    }

    return this.assessmentAnswerRepo.createBulk(data.answers)
  }

  async updateBulkAnswers(
    attemptId: number,
    answers: Array<{ questionId: number } & UpdateAssessmentAnswerInput>,
  ): Promise<AssessmentAnswer[]> {
    // Validate attempt exists and is not submitted
    if (!(await this.assessmentAnswerRepo.attemptExists(attemptId))) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_NOT_FOUND)
    }

    if (await this.assessmentAnswerRepo.isAttemptSubmitted(attemptId)) {
      throw new BadRequestException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_SUBMITTED)
    }

    return this.assessmentAnswerRepo.updateBulkByQuestion(attemptId, answers)
  }

  // ===== Grading Operations =====

  async gradeAnswers(data: GradeAssessmentAnswersInput): Promise<{
    gradedCount: number
    totalCount: number
    accuracy: number
  }> {
    const { attemptId, autoGrade = true } = data

    // Validate attempt exists and is submitted
    if (!(await this.assessmentAnswerRepo.attemptExists(attemptId))) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_NOT_FOUND)
    }

    if (!(await this.assessmentAnswerRepo.isAttemptSubmitted(attemptId))) {
      throw new BadRequestException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_NOT_SUBMITTED)
    }

    if (!autoGrade) {
      throw new BadRequestException('Manual grading not yet implemented')
    }

    const result = await this.assessmentAnswerRepo.gradeAttemptAnswers(attemptId)

    return {
      gradedCount: result.gradedCount,
      totalCount: result.totalCount,
      accuracy: result.totalCount > 0 ? (result.gradedCount / result.totalCount) * 100 : 0,
    }
  }

  async getAttemptAnswers(attemptId: number): Promise<AssessmentAnswerWithQuestion[]> {
    if (!(await this.assessmentAnswerRepo.attemptExists(attemptId))) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_NOT_FOUND)
    }

    return this.assessmentAnswerRepo.getAttemptAnswersWithQuestions(attemptId)
  }

  async getAttemptSummary(attemptId: number): Promise<AssessmentAnswerSummary> {
    if (!(await this.assessmentAnswerRepo.attemptExists(attemptId))) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_NOT_FOUND)
    }

    const answers = await this.assessmentAnswerRepo.getAttemptAnswers(attemptId)
    const answeredQuestions = answers.filter((a) => a.selectedOptionId !== null).length
    const correctAnswers = answers.filter((a) => a.isCorrect === true).length
    const wrongAnswers = answers.filter((a) => a.isCorrect === false).length
    const skippedQuestions = answers.length - answeredQuestions

    const answersWithTime = answers.filter((a) => a.timeSpentSec !== null)
    const totalTimeSpent = answersWithTime.reduce((sum, a) => sum + (a.timeSpentSec || 0), 0)
    const averageTimePerQuestion = answersWithTime.length > 0 ? totalTimeSpent / answersWithTime.length : 0

    const accuracy = answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0

    return {
      attemptId,
      totalQuestions: answers.length,
      answeredQuestions,
      correctAnswers,
      wrongAnswers,
      skippedQuestions,
      averageTimePerQuestion: Math.round(averageTimePerQuestion * 100) / 100,
      totalTimeSpent,
      accuracy: Math.round(accuracy * 100) / 100,
    }
  }

  async getQuestionPerformance(attemptId: number): Promise<QuestionPerformance[]> {
    if (!(await this.assessmentAnswerRepo.attemptExists(attemptId))) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_NOT_FOUND)
    }

    const answers = await this.assessmentAnswerRepo.getAttemptAnswersWithQuestions(attemptId)

    return answers.map((answer) => {
      const correctOption = answer.question.options.find((opt) => opt.isCorrect)
      const selectedOption = answer.selectedOptionId
        ? answer.question.options.find((opt) => opt.id === answer.selectedOptionId)
        : null

      return {
        questionId: answer.questionId,
        questionType: answer.question.type,
        level: answer.question.level,
        isCorrect: answer.isCorrect,
        timeSpent: answer.timeSpentSec,
        userAnswer: selectedOption?.content || null,
        correctAnswer: correctOption?.content || 'N/A',
        explanation: answer.explanation || answer.question.explanation,
      }
    })
  }

  // ===== Analytics and Statistics =====

  async getAnswerAnalytics(query: AssessmentAnswerStatsInput): Promise<AssessmentAnswerAnalytics[]> {
    const answers = await this.assessmentAnswerRepo.getAnswersForAnalytics(query)
    return generateQuestionAnalytics(answers)
  }

  async getQuestionStatistics(questionId: number): Promise<{
    totalAttempts: number
    correctAttempts: number
    accuracy: number
    averageTime: number
    difficultyLevel: string
  }> {
    if (!(await this.assessmentAnswerRepo.questionExists(questionId))) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.QUESTION_NOT_FOUND)
    }

    const stats = await this.assessmentAnswerRepo.getQuestionStatistics(questionId)

    return {
      totalAttempts: stats.totalAttempts,
      correctAttempts: stats.correctAttempts,
      accuracy: stats.totalAttempts > 0 ? (stats.correctAttempts / stats.totalAttempts) * 100 : 0,
      averageTime: stats.averageTimeSpent,
      difficultyLevel: calculateQuestionDifficulty({
        questionId,
        totalAttempts: stats.totalAttempts,
        correctAttempts: stats.correctAttempts,
        averageTimeSpent: stats.averageTimeSpent,
        difficultyRating: 0,
        accuracyRate: stats.totalAttempts > 0 ? (stats.correctAttempts / stats.totalAttempts) * 100 : 0,
        commonMistakes: [],
      }),
    }
  }

  async getUserAnswerHistory(
    userId: number,
    questionId?: number,
    limit: number = 10,
  ): Promise<AssessmentAnswerWithDetails[]> {
    const query: AssessmentAnswerQuery = {
      userId,
      questionId,
      limit,
      page: 1,
      sortBy: 'id',
      sortOrder: 'desc',
      includeQuestion: true,
      includeAttempt: true,
      includeSelectedOption: true,
    }

    const result = await this.assessmentAnswerRepo.findMany(query)
    return result.answers
  }

  async getWrongAnswersForReview(
    userId: number,
    assessmentId?: number,
    limit: number = 20,
  ): Promise<AssessmentAnswerWithQuestion[]> {
    const answers = await this.assessmentAnswerRepo.getWrongAnswersForUser(userId, assessmentId, limit)

    return answers.map((answer) => ({
      ...answer,
      explanation: generateAnswerExplanation(answer, false),
    }))
  }

  // ===== Helper Methods =====

  async deleteAttemptAnswers(attemptId: number): Promise<number> {
    if (!(await this.assessmentAnswerRepo.attemptExists(attemptId))) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_NOT_FOUND)
    }

    return this.assessmentAnswerRepo.deleteAttemptAnswers(attemptId)
  }

  async getAttemptProgress(attemptId: number): Promise<{
    totalQuestions: number
    answeredQuestions: number
    completionPercentage: number
  }> {
    if (!(await this.assessmentAnswerRepo.attemptExists(attemptId))) {
      throw new NotFoundException(ASSESSMENT_ANSWER_ERRORS.ATTEMPT_NOT_FOUND)
    }

    const stats = await this.assessmentAnswerRepo.getAttemptProgress(attemptId)

    return {
      totalQuestions: stats.totalQuestions,
      answeredQuestions: stats.answeredQuestions,
      completionPercentage: stats.totalQuestions > 0 ? (stats.answeredQuestions / stats.totalQuestions) * 100 : 0,
    }
  }
}
