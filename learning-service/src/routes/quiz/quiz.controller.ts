import { Body, Controller, Delete, Get, HttpStatus, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common'
import { ApiResponse, ApiTags } from '@nestjs/swagger'
import { Role } from '@prisma/client'
import { AuthType } from '../../shared/constants/auth.constant'
import { ActiveUser } from '../../shared/decorators/active-user.decorator'
import { Auth } from '../../shared/decorators/auth.decorator'
import { Roles } from '../../shared/decorators/roles.decorator'
import { CloneQuizDto, CreateQuizDto, QuizQueryDto, UpdateQuizDto } from './quiz.dto'
import { QuizService } from './quiz.service'

@ApiTags('Quiz')
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}
  @Post()
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.STAFF, Role.ADMIN)
  async createQuiz(@Body() createQuizDto: CreateQuizDto, @ActiveUser('userId') userId: number) {
    return this.quizService.createQuiz(createQuizDto, userId)
  }

  @Get()
  async getQuizzes(@Query() query: QuizQueryDto) {
    return this.quizService.getQuizzes(query)
  }

  @Get(':id')
  async getQuiz(@Param('id', ParseIntPipe) id: number) {
    return this.quizService.getQuizWithRelations(id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.STAFF, Role.ADMIN)
  async updateQuiz(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuizDto: UpdateQuizDto,
    @ActiveUser('userId') userId: number,
  ) {
    return this.quizService.updateQuiz(id, updateQuizDto, userId)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.STAFF, Role.ADMIN)
  async deleteQuiz(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.quizService.deleteQuiz(id, userId)
  }

  @Post(':id/clone')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.STAFF, Role.ADMIN)
  async cloneQuiz(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser('userId') userId: number,
    @Body() body?: CloneQuizDto,
  ) {
    return this.quizService.cloneQuiz(id, userId, body?.title)
  }

  @Get('search/:term')
  @ApiResponse({ status: HttpStatus.OK, description: 'Search results retrieved successfully' })
  async searchQuizzes(@Param('term') searchTerm: string) {
    return this.quizService.searchQuizzes(searchTerm)
  }

  @Get('attempted/all')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.STAFF, Role.CUSTOMER, Role.ADMIN)
  async getAttemptedQuizzes(
    @ActiveUser('userId') userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.quizService.getAttemptedQuizzes({
      userId,
      page: page || 1,
      limit: limit || 10,
    })
  }

  @Get('attempt/:attemptId/with-answers')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.STAFF, Role.CUSTOMER, Role.ADMIN)
  async getQuizByUserAttempt(
    @ActiveUser('userId') userId: number,
    @Param('attemptId', ParseIntPipe) attemptId: number,
  ) {
    return this.quizService.getQuizByUserAttempt(userId, attemptId)
  }

  @Get(':quizId/recent-attempts')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.STAFF, Role.CUSTOMER, Role.ADMIN)
  async getRecentAttempts(@ActiveUser('userId') userId: number, @Param('quizId', ParseIntPipe) quizId: number) {
    return this.quizService.getRecentAttempts(quizId, userId)
  }

  @Get(':quizId/leaderboard')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.STAFF, Role.CUSTOMER, Role.ADMIN)
  async getQuizLeaderboard(@Param('quizId', ParseIntPipe) quizId: number) {
    return this.quizService.getQuizLeaderboard(quizId)
  }
}
