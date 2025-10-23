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

  async getQuizWithRelations(id: number): Promise<QuizWithRelations> {
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

    if (data.title && data.title !== quiz.title) {
      const titleExists = await this.quizRepo.getTitleExists(data.title, id)
      if (titleExists) {
        throw new ConflictException(`Quiz with title "${data.title}" already exists`)
      }
    }

    return this.quizRepo.update(id, data)
  }

  async deleteQuiz(id: number, userId?: number): Promise<void> {
    const quiz = await this.getQuiz(id)

    // Check permissions (only creator can delete)
    if (userId && quiz.createdBy !== userId) {
      throw new ForbiddenException('Permission denied')
    }

    return this.quizRepo.delete(id)
  }

  async bulkDeleteQuizzes(ids: number[], userId?: number): Promise<void> {
    // Validate all quizzes exist and user has permission
    if (userId) {
      for (const id of ids) {
        const quiz = await this.getQuiz(id)
        if (quiz.createdBy !== userId) {
          throw new ForbiddenException(`Permission denied for quiz ${id}`)
        }
      }
    }

    return this.quizRepo.bulkDelete(ids)
  }

  async cloneQuiz(id: number, data: { title?: string }, userId: number): Promise<QuizBase> {
    const originalQuiz = await this.getQuizWithRelations(id)

    const newTitle = data.title || `${originalQuiz.title} (Copy)`

    // Check title uniqueness
    const titleExists = await this.quizRepo.getTitleExists(newTitle)
    if (titleExists) {
      throw new ConflictException(`Quiz with title "${newTitle}" already exists`)
    }

    const newQuiz = await this.quizRepo.create(
      {
        title: newTitle,
        lessonId: originalQuiz.lessonId || undefined,
        timeLimitSec: originalQuiz.timeLimitSec,
      },
      userId,
    )

    return newQuiz
  }

  async getQuizStats(quizId: number) {
    // Validate quiz exists
    await this.getQuiz(quizId)

    return this.quizRepo.getQuizStats(quizId)
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
}
