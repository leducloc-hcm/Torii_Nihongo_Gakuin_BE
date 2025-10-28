import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { QuizRepository } from './quiz.repo'
import { QuizBase, QuizBasic, QuizWithRelations, CreateQuizInput, UpdateQuizInput, QuizQuery } from './quiz.model'

@Injectable()
export class QuizService {
  constructor(private readonly quizRepo: QuizRepository) {}
  async createQuiz(data: CreateQuizInput, userId: number): Promise<QuizBase> {
    const titleExists = await this.quizRepo.getTitleExists(data.title)
    if (titleExists) {
      throw new ConflictException(`Quiz with title "${data.title}" already exists`)
    }

    return this.quizRepo.create(data, userId)
  }

  async getQuiz(id: number): Promise<QuizBase> {
    const quiz = await this.quizRepo.findById(id)
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`)
    }
    return quiz
  }

  async getQuizWithRelations(id: number) {
    const quiz = await this.quizRepo.findByIdWithRelations(id)
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`)
    }
    return quiz
  }

  async getQuizzes(query: QuizQuery): Promise<{
    data: QuizBasic[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    return this.quizRepo.findMany(query)
  }

  async updateQuiz(id: number, data: UpdateQuizInput, userId?: number): Promise<QuizBase> {
    const quiz = await this.getQuiz(id)

    if (userId && quiz.createdBy !== userId) {
      throw new ForbiddenException('Permission denied')
    }

    // Check if anyone has attempted this quiz
    const hasAttempts = await this.quizRepo.hasAttempts(id)
    if (hasAttempts) {
      throw new BadRequestException(
        'Cannot update quiz that has been attempted. Please clone it to create a new version.',
      )
    }

    if (data.title && data.title !== quiz.title) {
      const titleExists = await this.quizRepo.getTitleExists(data.title, id)
      if (titleExists) {
        throw new ConflictException(`Quiz with title "${data.title}" already exists`)
      }
    }

    return this.quizRepo.update(id, data)
  }

  async deleteQuiz(id: number, userId?: number) {
    const quiz = await this.getQuiz(id)

    if (userId && quiz.createdBy !== userId) {
      throw new ForbiddenException('Permission denied')
    }

    // Check if anyone has attempted this quiz
    const hasAttempts = await this.quizRepo.hasAttempts(id)
    if (hasAttempts) {
      throw new BadRequestException('Cannot delete quiz that has been attempted.')
    }

    await this.quizRepo.delete(id)

    return { message: 'Quiz deleted successfully' }
  }

  async cloneQuiz(id: number, userId: number, newTitle?: string): Promise<QuizBase> {
    const original = await this.quizRepo.findByIdWithRelations(id)
    if (!original) {
      throw new NotFoundException(`Quiz with ID ${id} not found`)
    }

    // Generate new title if not provided
    const title = newTitle || `${original.title} (Copy)`

    // Check title uniqueness
    const titleExists = await this.quizRepo.getTitleExists(title)
    if (titleExists) {
      throw new ConflictException(`Quiz with title "${title}" already exists`)
    }

    return this.quizRepo.clone(id, userId, title)
  }

  async searchQuizzes(searchTerm: string, limit = 20) {
    return await this.quizRepo.findMany({
      search: searchTerm,
      limit,
      page: 1,
      includeAttempts: false,
      sortBy: 'title',
      sortOrder: 'asc',
    })
  }

  async getAttemptedQuizzes(params: { userId: number; page: number; limit: number }) {
    return await this.quizRepo.getAttemptedQuizzes(params)
  }

  async getRecentAttempts(quizId: number) {
    return await this.quizRepo.getRecentAttempts(quizId)
  }

  async getQuizByAttempt(attemptId: number) {
    return await this.quizRepo.getQuizByAttempt(attemptId)
  }

  async getQuizByUserAttempt(userId: number, attemptId: number) {
    return await this.quizRepo.getQuizByUserAttempt(userId, attemptId)
  }

  async getQuizLeaderboard(quizId: number) {
    return await this.quizRepo.getQuizLeaderboard(quizId)
  }
}
