import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, HttpStatus, HttpCode, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger'
import { TestAttemptService } from './test-attempt.service'
import {
  StartTestAttemptDto,
  SubmitTestAttemptDto,
  TestAttemptQueryDto,
  GradeTestAttemptDto,
  TestAttemptResponseDto,
  TestAttemptStatsDto,
  TestAttemptListResponseDto,
  LeaderboardEntryDto,
  TestStatisticsDto,
} from './test-attempt.dto'
import { JLPTLevel } from '@prisma/client'

@ApiTags('Test Attempts')
@Controller('test-attempts')
export class TestAttemptController {
  constructor(private readonly testAttemptService: TestAttemptService) {}

  // ===== Test Submission Flow =====

  @Post('start')
  @ApiOperation({
    summary: 'Start a new test attempt',
    description: 'Initialize a new test attempt for the current user',
  })
  @ApiResponse({
    status: 201,
    description: 'Test attempt started successfully',
    type: TestAttemptResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid test ID' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  @ApiResponse({ status: 409, description: 'User has already started this test' })
  async startTest(
    @Request() req: any, // Would need proper user extraction from JWT
    @Body() startTestDto: StartTestAttemptDto,
  ) {
    // For now, using a hardcoded user ID - would extract from JWT in real implementation
    const userId = req.user?.id || 1
    return this.testAttemptService.startTest(userId, startTestDto)
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit test answers',
    description: 'Submit all answers for a test attempt',
  })
  @ApiParam({ name: 'id', description: 'Test attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Test submitted successfully',
    type: TestAttemptResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid answers or attempt already submitted' })
  @ApiResponse({ status: 404, description: 'Test attempt not found' })
  async submitTest(@Param('id', ParseIntPipe) id: number, @Body() submitTestDto: SubmitTestAttemptDto) {
    return this.testAttemptService.submitTest(id, submitTestDto)
  }

  @Post(':id/grade')
  @ApiOperation({
    summary: 'Grade a submitted test',
    description: 'Calculate score and JLPT level suggestion for a submitted test',
  })
  @ApiParam({ name: 'id', description: 'Test attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Test graded successfully',
    type: TestAttemptStatsDto,
  })
  @ApiResponse({ status: 400, description: 'Test not submitted yet' })
  @ApiResponse({ status: 404, description: 'Test attempt not found' })
  async gradeTest(@Param('id', ParseIntPipe) id: number) {
    return this.testAttemptService.gradeAttempt(id)
  }

  // ===== Query and Retrieval =====

  @Get()
  @ApiOperation({
    summary: 'Get test attempts with filtering',
    description: 'Retrieve test attempts with optional filtering by user, test, level, and date range',
  })
  @ApiResponse({
    status: 200,
    description: 'Test attempts retrieved successfully',
    type: TestAttemptListResponseDto,
  })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'testId', required: false, type: Number })
  @ApiQuery({ name: 'level', required: false, enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'passed', required: false, type: Boolean })
  @ApiQuery({ name: 'includeAnswers', required: false, type: Boolean })
  @ApiQuery({ name: 'includeUser', required: false, type: Boolean })
  @ApiQuery({ name: 'includeTest', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['startedAt', 'submittedAt', 'score'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getAttempts(@Query() query: TestAttemptQueryDto) {
    const queryWithDefaults = {
      ...query,
      includeAnswers: query.includeAnswers ?? false,
      includeUser: query.includeUser ?? false,
      includeTest: query.includeTest ?? false,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sortBy: query.sortBy ?? 'startedAt',
      sortOrder: query.sortOrder ?? 'desc',
    }
    return this.testAttemptService.getAttempts(queryWithDefaults)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get test attempt by ID',
    description: 'Retrieve detailed information about a specific test attempt',
  })
  @ApiParam({ name: 'id', description: 'Test attempt ID' })
  @ApiQuery({ name: 'includeAnswers', required: false, type: Boolean })
  @ApiQuery({ name: 'includeUser', required: false, type: Boolean })
  @ApiQuery({ name: 'includeTest', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Test attempt retrieved successfully',
    type: TestAttemptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Test attempt not found' })
  async getAttempt(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeAnswers') includeAnswers?: boolean,
    @Query('includeUser') includeUser?: boolean,
    @Query('includeTest') includeTest?: boolean,
  ) {
    return this.testAttemptService.getAttempt(id, {
      answers: includeAnswers,
      user: includeUser,
      test: includeTest,
    })
  }

  // ===== Statistics and Analytics =====

  @Get('test/:testId/statistics')
  @ApiOperation({
    summary: 'Get test statistics',
    description: 'Retrieve comprehensive statistics for a specific test',
  })
  @ApiParam({ name: 'testId', description: 'Test paper ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: TestStatisticsDto,
  })
  @ApiResponse({ status: 404, description: 'Test not found' })
  async getTestStatistics(@Param('testId', ParseIntPipe) testId: number) {
    return this.testAttemptService.getTestStatistics(testId)
  }

  @Get('test/:testId/leaderboard')
  @ApiOperation({
    summary: 'Get test leaderboard',
    description: 'Retrieve top scoring users for a specific test',
  })
  @ApiParam({ name: 'testId', description: 'Test paper ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of top users (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully',
    type: [LeaderboardEntryDto],
  })
  async getLeaderboard(@Param('testId', ParseIntPipe) testId: number, @Query('limit', ParseIntPipe) limit?: number) {
    return this.testAttemptService.getLeaderboard(testId, limit || 10)
  }

  // ===== User-Specific Queries =====

  @Get('user/:userId/test/:testId/best')
  @ApiOperation({
    summary: "Get user's best attempt for a test",
    description: 'Retrieve the highest scoring attempt by a user for a specific test',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'testId', description: 'Test paper ID' })
  @ApiResponse({
    status: 200,
    description: 'Best attempt retrieved successfully',
    type: TestAttemptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No attempts found' })
  async getUserBestAttempt(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('testId', ParseIntPipe) testId: number,
  ) {
    const attempt = await this.testAttemptService.getUserBestAttempt(userId, testId)
    if (!attempt) {
      throw new Error('No attempts found for this user and test')
    }
    return attempt
  }

  @Get('user/:userId/test/:testId/count')
  @ApiOperation({
    summary: "Get user's attempt count for a test",
    description: 'Get the total number of attempts by a user for a specific test',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'testId', description: 'Test paper ID' })
  @ApiResponse({
    status: 200,
    description: 'Attempt count retrieved successfully',
    schema: {
      type: 'object',
      properties: { count: { type: 'number', example: 3 } },
    },
  })
  async getUserAttemptCount(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('testId', ParseIntPipe) testId: number,
  ) {
    const count = await this.testAttemptService.getUserAttemptCount(userId, testId)
    return { count }
  }

  // ===== Helper Endpoints =====

  @Get('user/:userId/test/:testId/can-start')
  @ApiOperation({
    summary: 'Check if user can start a test',
    description: 'Validate if a user is eligible to start a new test attempt',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'testId', description: 'Test paper ID' })
  @ApiResponse({
    status: 200,
    description: 'Eligibility checked successfully',
    schema: {
      type: 'object',
      properties: {
        canStart: { type: 'boolean' },
        reason: { type: 'string', nullable: true },
        existingAttempt: { type: 'object', nullable: true },
      },
    },
  })
  async canUserStartTest(@Param('userId', ParseIntPipe) userId: number, @Param('testId', ParseIntPipe) testId: number) {
    return this.testAttemptService.canStartTest(userId, testId)
  }

  @Get(':id/progress')
  @ApiOperation({
    summary: 'Get attempt progress',
    description: 'Get completion status and progress for a test attempt',
  })
  @ApiParam({ name: 'id', description: 'Test attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Progress retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalQuestions: { type: 'number', example: 50 },
        answeredQuestions: { type: 'number', example: 35 },
        remainingQuestions: { type: 'number', example: 15 },
        completionPercentage: { type: 'number', example: 70.0 },
      },
    },
  })
  async getAttemptProgress(@Param('id', ParseIntPipe) id: number) {
    return this.testAttemptService.getAttemptProgress(id)
  }

  // ===== JLPT Level Analysis =====

  @Get('user/:userId/level/:level/readiness')
  @ApiOperation({
    summary: 'Analyze JLPT level readiness',
    description: 'Evaluate if a user is ready to attempt a specific JLPT level',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'level', enum: ['N5', 'N4', 'N3', 'N2', 'N1'], description: 'Target JLPT level' })
  @ApiResponse({
    status: 200,
    description: 'Level readiness analyzed successfully',
    schema: {
      type: 'object',
      properties: {
        isReady: { type: 'boolean' },
        recommendation: { type: 'string' },
        recentAttempts: { type: 'array' },
        averageScore: { type: 'number' },
        strongAreas: { type: 'array', items: { type: 'string' } },
        weakAreas: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async analyzeLevelReadiness(@Param('userId', ParseIntPipe) userId: number, @Param('level') level: JLPTLevel) {
    return this.testAttemptService.analyzeLevelReadiness(userId, level)
  }
}
