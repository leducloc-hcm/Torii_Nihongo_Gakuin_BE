import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { QuizService } from './quiz.service'
import { CreateQuizDto, UpdateQuizDto, QuizQueryDto, BulkDeleteQuizDto, CloneQuizDto, QuizStatsDto } from './quiz.dto'
import { Auth } from '../../shared/decorators/auth.decorator'
import { Roles } from '../../shared/decorators/roles.decorator'
import { ActiveUser } from '../../shared/decorators/active-user.decorator'
import { AccessTokenPayload } from '../../shared/types/jwt.type'
import { AuthType } from '../../shared/constants/auth.constant'
import { Role } from '@prisma/client'

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
}
