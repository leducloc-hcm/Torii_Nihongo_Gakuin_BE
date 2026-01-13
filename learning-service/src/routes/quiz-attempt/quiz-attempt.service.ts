import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { QuizAttemptRepository } from './quiz-attempt.repo'
import {
  StartQuizAttemptInput,
  SubmitQuizAttemptInput,
  QuizAttemptQuery,
  QUIZ_ATTEMPT_ERRORS,
} from './quiz-attempt.model'

@Injectable()
export class QuizAttemptService {
  constructor(private readonly quizAttemptRepo: QuizAttemptRepository) {}

  async startQuizAttempt(userId: number, data: StartQuizAttemptInput) {
    return await this.quizAttemptRepo.create(data, userId)
  }

  async getQuizAttempts(query: QuizAttemptQuery) {
    return await this.quizAttemptRepo.findMany(query)
  }

  async getQuizAttemptById(id: number) {
    const attempt = await this.quizAttemptRepo.findByIdWithRelations(id)
    if (!attempt) {
      throw new NotFoundException(QUIZ_ATTEMPT_ERRORS.NOT_FOUND)
    }
    return attempt
  }

  async submitQuizAttempt(userId: number, attemptId: number, data: SubmitQuizAttemptInput) {
    const attempt = await this.quizAttemptRepo.findById(attemptId)
    if (!attempt) {
      throw new NotFoundException(QUIZ_ATTEMPT_ERRORS.NOT_FOUND)
    }

    // Check if user owns the attempt
    if (attempt.userId !== userId) {
      throw new ForbiddenException(QUIZ_ATTEMPT_ERRORS.PERMISSION_DENIED)
    }

    return await this.quizAttemptRepo.submitAttempt(attemptId, data)
  }

  async deleteQuizAttempt(userId: number, id: number) {
    const attempt = await this.quizAttemptRepo.findById(id)
    if (!attempt) {
      throw new NotFoundException(QUIZ_ATTEMPT_ERRORS.NOT_FOUND)
    }

    // Check if user owns the attempt
    if (attempt.userId !== userId) {
      throw new ForbiddenException(QUIZ_ATTEMPT_ERRORS.PERMISSION_DENIED)
    }

    await this.quizAttemptRepo.delete(id)
  }

  async getUserAttempts(userId: number, quizId?: number) {
    return await this.quizAttemptRepo.getUserAttempts(userId, quizId)
  }

  async getUserLatestAttempt(userId: number, quizId: number) {
    const attempt = await this.quizAttemptRepo.getUserLatestAttempt(userId, quizId)
    if (!attempt) {
      throw new NotFoundException(QUIZ_ATTEMPT_ERRORS.NOT_FOUND)
    }
    return attempt
  }
}
