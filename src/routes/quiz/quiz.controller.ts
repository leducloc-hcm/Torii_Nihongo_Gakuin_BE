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
  @ApiOperation({ summary: 'Create new quiz' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Quiz created successfully' })
  async createQuiz(@Body() createQuizDto: CreateQuizDto, @ActiveUser('userId') userId: number) {
    return this.quizService.createQuiz(createQuizDto, userId)
  }

  @Get()
  @ApiOperation({ summary: 'Get all quizzes with pagination' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quizzes retrieved successfully' })
  async getQuizzes(@Query() query: QuizQueryDto) {
    return this.quizService.getQuizzes(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz by ID' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quiz retrieved successfully' })
  async getQuiz(@Param('id', ParseIntPipe) id: number) {
    return this.quizService.getQuizWithRelations(id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @ApiOperation({ summary: 'Update quiz' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quiz updated successfully' })
  async updateQuiz(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuizDto: UpdateQuizDto,
    @ActiveUser('userId') userId: number,
  ) {
    return this.quizService.updateQuiz(id, updateQuizDto, userId)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @ApiOperation({ summary: 'Delete quiz' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Quiz deleted successfully' })
  async deleteQuiz(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    await this.quizService.deleteQuiz(id, userId)
  }

  @Post('bulk-delete')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Bulk delete quizzes' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Quizzes deleted successfully' })
  async bulkDeleteQuizzes(@Body() bulkDeleteDto: BulkDeleteQuizDto, @ActiveUser('userId') userId: number) {
    await this.quizService.bulkDeleteQuizzes(bulkDeleteDto.ids, userId)
  }

  @Post(':id/clone')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Clone quiz' })
  @ApiParam({ name: 'id', description: 'Quiz ID to clone' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Quiz cloned successfully' })
  async cloneQuiz(
    @Param('id', ParseIntPipe) id: number,
    @Body() cloneDto: CloneQuizDto,
    @ActiveUser('userId') userId: number,
  ) {
    return this.quizService.cloneQuiz(id, cloneDto, userId)
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get quiz statistics' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz statistics retrieved successfully',
    type: QuizStatsDto,
  })
  async getQuizStats(@Param('id', ParseIntPipe) id: number) {
    return this.quizService.getQuizStats(id)
  }

  @Get('search/:term')
  @ApiOperation({ summary: 'Search quizzes by title' })
  @ApiParam({ name: 'term', description: 'Search term' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Search results retrieved successfully' })
  async searchQuizzes(@Param('term') searchTerm: string) {
    return this.quizService.searchQuizzes(searchTerm)
  }
}
