import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { QuizAnswerRepository } from './quiz-answer.repo'
import { CreateQuizAnswerDto, UpdateQuizAnswerDto, QuizAnswerQueryDto } from './quiz-answer.dto'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class QuizAnswerService {
  constructor(
    private readonly quizAnswerRepo: QuizAnswerRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(userId: number, dto: CreateQuizAnswerDto) {
    // Verify that the attempt belongs to the user
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: dto.attemptId },
      select: { userId: true, submittedAt: true },
    })

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found')
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('You can only create answers for your own attempts')
    }

    if (attempt.submittedAt) {
      throw new BadRequestException('Cannot add answers to a submitted attempt')
    }

    return this.quizAnswerRepo.create(dto)
  }

  async findById(id: number) {
    const answer = await this.quizAnswerRepo.findByIdWithRelations(id)
    if (!answer) {
      throw new NotFoundException('Quiz answer not found')
    }
    return answer
  }

  async findMany(query: QuizAnswerQueryDto) {
    return this.quizAnswerRepo.findMany(query)
  }

  async update(id: number, userId: number, dto: UpdateQuizAnswerDto) {
    // Check if answer exists
    const answer = await this.prisma.quizAnswer.findUnique({
      where: { id },
      include: {
        attempt: {
          select: { userId: true, submittedAt: true },
        },
      },
    })

    if (!answer) {
      throw new NotFoundException('Quiz answer not found')
    }

    if (answer.attempt?.userId !== userId) {
      throw new ForbiddenException('You can only update answers for your own attempts')
    }

    if (answer.attempt?.submittedAt) {
      throw new BadRequestException('Cannot update answers in a submitted attempt')
    }

    return this.quizAnswerRepo.update(id, dto)
  }

  async delete(id: number, userId: number) {
    // Check if answer exists
    const answer = await this.prisma.quizAnswer.findUnique({
      where: { id },
      include: {
        attempt: {
          select: { userId: true, submittedAt: true },
        },
      },
    })

    if (!answer) {
      throw new NotFoundException('Quiz answer not found')
    }

    if (answer.attempt?.userId !== userId) {
      throw new ForbiddenException('You can only delete answers from your own attempts')
    }

    if (answer.attempt?.submittedAt) {
      throw new BadRequestException('Cannot delete answers from a submitted attempt')
    }

    return this.quizAnswerRepo.delete(id)
  }

  async getAttemptAnswers(attemptId: number, userId: number) {
    // Verify that the attempt belongs to the user
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true },
    })

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found')
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('You can only view answers for your own attempts')
    }

    return this.quizAnswerRepo.getAttemptAnswers(attemptId)
  }

  async getQuestionAnswer(attemptId: number, questionId: number, userId: number) {
    // Verify that the attempt belongs to the user
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true },
    })

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found')
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('You can only view answers for your own attempts')
    }

    return this.quizAnswerRepo.getQuestionAnswer(attemptId, questionId)
  }
}
