import { Controller, Get, Post, Delete, Body, Param, Query, ParseIntPipe, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { QuizAttemptService } from './quiz-attempt.service'
import { StartQuizAttemptDto, SubmitQuizAttemptDto, QuizAttemptQueryDto } from './quiz-attempt.dto'
import { Auth } from '../../shared/decorators/auth.decorator'
import { ActiveUser } from '../../shared/decorators/active-user.decorator'
import { Roles } from '../../shared/decorators/roles.decorator'
import { AuthType } from '../../shared/constants/auth.constant'
import { Role } from '@prisma/client'

@ApiTags('Quiz Attempts')
@Controller('quiz-attempts')
export class QuizAttemptController {
  constructor(private readonly quizAttemptService: QuizAttemptService) {}

  @Post('start')
  @Auth([AuthType.Bearer])
  @ApiOperation({ summary: 'Start a new quiz attempt' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Quiz attempt started successfully' })
  async startQuizAttempt(@ActiveUser('userId') userId: number, @Body() dto: StartQuizAttemptDto) {
    return await this.quizAttemptService.startQuizAttempt(userId, dto)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Get all quiz attempts with pagination' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quiz attempts retrieved successfully' })
  async getQuizAttempts(@Query() query: QuizAttemptQueryDto) {
    return await this.quizAttemptService.getQuizAttempts(query)
  }

  @Get('my-attempts')
  @Auth([AuthType.Bearer])
  @ApiOperation({ summary: 'Get current user quiz attempts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User attempts retrieved successfully' })
  async getUserAttempts(@ActiveUser('userId') userId: number, @Query('quizId', ParseIntPipe) quizId?: number) {
    return await this.quizAttemptService.getUserAttempts(userId, quizId)
  }

  @Get('quiz/:quizId/latest')
  @Auth([AuthType.Bearer])
  @ApiOperation({ summary: 'Get user latest attempt for a quiz' })
  @ApiParam({ name: 'quizId', description: 'Quiz ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Latest attempt retrieved successfully' })
  async getUserLatestAttempt(@ActiveUser('userId') userId: number, @Param('quizId', ParseIntPipe) quizId: number) {
    return await this.quizAttemptService.getUserLatestAttempt(userId, quizId)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @ApiOperation({ summary: 'Get quiz attempt by ID' })
  @ApiParam({ name: 'id', description: 'Quiz Attempt ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quiz attempt retrieved successfully' })
  async getQuizAttemptById(@Param('id', ParseIntPipe) id: number) {
    return await this.quizAttemptService.getQuizAttemptById(id)
  }

  @Post(':id/submit')
  @Auth([AuthType.Bearer])
  @ApiOperation({ summary: 'Submit quiz attempt answers' })
  @ApiParam({ name: 'id', description: 'Quiz Attempt ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quiz attempt submitted successfully' })
  async submitQuizAttempt(
    @ActiveUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitQuizAttemptDto,
  ) {
    return await this.quizAttemptService.submitQuizAttempt(userId, id, dto)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @ApiOperation({ summary: 'Delete quiz attempt' })
  @ApiParam({ name: 'id', description: 'Quiz Attempt ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quiz attempt deleted successfully' })
  async deleteQuizAttempt(@ActiveUser('userId') userId: number, @Param('id', ParseIntPipe) id: number) {
    await this.quizAttemptService.deleteQuizAttempt(userId, id)
    return { message: 'Quiz attempt deleted successfully' }
  }
}
