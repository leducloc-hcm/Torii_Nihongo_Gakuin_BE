import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { QuizItemRepository } from './quiz-item.repo'
import { CreateQuizItemInput, UpdateQuizItemInput, QuizItemQuery, QUIZ_ITEM_ERRORS } from './quiz-item.model'

@Injectable()
export class QuizItemService {
  constructor(private readonly quizItemRepo: QuizItemRepository) {}

  // Transform response to flatten junction table data
  private transformResponse(item: any) {
    return {
      ...item,
      questions: item.questions?.map((q: any) => q.question) || [],
      questionGroups: item.questionGroups?.map((qg: any) => qg.group) || [],
    }
  }

  async createQuizItem(userId: number, data: CreateQuizItemInput) {
    // Check if user owns the quiz
    const quiz = await this.quizItemRepo['prisma'].quiz.findUnique({
      where: { id: data.quizId },
    })
    if (!quiz) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.QUIZ_NOT_FOUND)
    }
    if (quiz.createdBy !== userId) {
      throw new ForbiddenException(QUIZ_ITEM_ERRORS.PERMISSION_DENIED)
    }

    const item = await this.quizItemRepo.create(data)
    return this.transformResponse(item)
  }

  async getQuizItems(query: QuizItemQuery) {
    const result = await this.quizItemRepo.findMany(query)
    return {
      ...result,
      data: result.data.map((item) => this.transformResponse(item)),
    }
  }

  async getQuizItemById(id: number) {
    const quizItem = await this.quizItemRepo.findByIdWithRelations(id)
    if (!quizItem) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.NOT_FOUND)
    }
    return quizItem
  }

  async updateQuizItem(userId: number, id: number, data: UpdateQuizItemInput) {
    const quizItem = await this.quizItemRepo.findById(id)
    if (!quizItem) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.NOT_FOUND)
    }

    // Check if user owns the quiz
    const quiz = await this.quizItemRepo['prisma'].quiz.findUnique({
      where: { id: quizItem.quizId },
    })
    if (!quiz) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.QUIZ_NOT_FOUND)
    }
    if (quiz.createdBy !== userId) {
      throw new ForbiddenException(QUIZ_ITEM_ERRORS.PERMISSION_DENIED)
    }

    return await this.quizItemRepo.update(id, data)
  }

  async deleteQuizItem(userId: number, id: number) {
    const quizItem = await this.quizItemRepo.findById(id)
    if (!quizItem) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.NOT_FOUND)
    }

    // Check if user owns the quiz
    const quiz = await this.quizItemRepo['prisma'].quiz.findUnique({
      where: { id: quizItem.quizId },
    })
    if (!quiz) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.QUIZ_NOT_FOUND)
    }
    if (quiz.createdBy !== userId) {
      throw new ForbiddenException(QUIZ_ITEM_ERRORS.PERMISSION_DENIED)
    }

    await this.quizItemRepo.delete(id)
    return { message: 'Quiz item deleted successfully' }
  }

  async bulkAddQuestions(userId: number, quizId: number, questionIds: number[]) {
    // Check if user owns the quiz
    const quiz = await this.quizItemRepo['prisma'].quiz.findUnique({
      where: { id: quizId },
    })
    if (!quiz) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.QUIZ_NOT_FOUND)
    }
    if (quiz.createdBy !== userId) {
      throw new ForbiddenException(QUIZ_ITEM_ERRORS.PERMISSION_DENIED)
    }

    return await this.quizItemRepo.bulkAddQuestions(quizId, questionIds)
  }

  async reorderQuizItems(userId: number, quizId: number, items: Array<{ id: number; order: number }>) {
    // Check if user owns the quiz
    const quiz = await this.quizItemRepo['prisma'].quiz.findUnique({
      where: { id: quizId },
    })
    if (!quiz) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.QUIZ_NOT_FOUND)
    }
    if (quiz.createdBy !== userId) {
      throw new ForbiddenException(QUIZ_ITEM_ERRORS.PERMISSION_DENIED)
    }

    await this.quizItemRepo.reorderQuizItems(quizId, items)
  }
}
