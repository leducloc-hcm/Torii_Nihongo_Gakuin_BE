import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { QuizAnswerService } from './quiz-answer.service'
import { CreateQuizAnswerDto, UpdateQuizAnswerDto, QuizAnswerQueryDto } from './quiz-answer.dto'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from '../../shared/constants/auth.constant'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@ApiTags('Quiz Answers')
@Controller('quiz-answers')
export class QuizAnswerController {
  constructor(private readonly quizAnswerService: QuizAnswerService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new quiz answer' })
  async create(@ActiveUser('userId') userId: number, @Body() dto: CreateQuizAnswerDto) {
    return this.quizAnswerService.create(userId, dto)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all quiz answers with filters' })
  async findMany(@Query() query: QuizAnswerQueryDto) {
    return this.quizAnswerService.findMany(query)
  }

  @Get('attempt/:attemptId')
  @Auth([AuthType.Bearer])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all answers for a quiz attempt' })
  async getAttemptAnswers(@Param('attemptId', ParseIntPipe) attemptId: number, @ActiveUser('userId') userId: number) {
    return this.quizAnswerService.getAttemptAnswers(attemptId, userId)
  }

  @Get('attempt/:attemptId/question/:questionId')
  @Auth([AuthType.Bearer])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get answer for a specific question in an attempt' })
  async getQuestionAnswer(
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @ActiveUser('userId') userId: number,
  ) {
    return this.quizAnswerService.getQuestionAnswer(attemptId, questionId, userId)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get quiz answer by ID' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.quizAnswerService.findById(id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a quiz answer' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser('userId') userId: number,
    @Body() dto: UpdateQuizAnswerDto,
  ) {
    return this.quizAnswerService.update(id, userId, dto)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a quiz answer' })
  async delete(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    await this.quizAnswerService.delete(id, userId)
    return { message: 'Quiz answer deleted successfully' }
  }
}
