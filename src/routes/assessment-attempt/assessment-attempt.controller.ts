import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, HttpStatus, HttpCode, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger'
import { AssessmentAttemptService } from './assessment-attempt.service'
import {
  StartAssessmentAttemptDto,
  SubmitAssessmentAttemptDto,
  AssessmentAttemptQueryDto,
  GradeAssessmentAttemptDto,
  AssessmentAttemptResponseDto,
  AssessmentAttemptStatsDto,
  AssessmentAttemptListResponseDto,
  LeaderboardEntryDto,
  AssessmentStatisticsDto,
} from './assessment-attempt.dto'
import { JLPTLevel } from '@prisma/client'

@ApiTags('Assessment Attempts')
@Controller('assessment-attempts')
export class AssessmentAttemptController {
  constructor(private readonly assessmentAttemptService: AssessmentAttemptService) {}

  // ===== Assessment Submission Flow =====

  @Post('start')
  @ApiOperation({
    summary: 'Start a new assessment attempt',
    description: 'Initialize a new assessment attempt for the current user',
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment attempt started successfully',
    type: AssessmentAttemptResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid assessment ID' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async startAssessment(
    @Request() req: any, // Would need proper user extraction from JWT
    @Body() startAssessmentDto: StartAssessmentAttemptDto,
  ) {
    // For now, using a hardcoded user ID - would extract from JWT in real implementation
    const userId = req.user?.id || 1
    return this.assessmentAttemptService.startAssessment(userId, startAssessmentDto)
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit assessment answers',
    description: 'Submit all answers for an assessment attempt',
  })
  @ApiParam({ name: 'id', description: 'Assessment attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Assessment submitted successfully',
    type: AssessmentAttemptResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid answers or attempt already submitted' })
  @ApiResponse({ status: 404, description: 'Assessment attempt not found' })
  async submitAssessment(
    @Param('id', ParseIntPipe) id: number,
    @Body() submitAssessmentDto: SubmitAssessmentAttemptDto,
  ) {
    return this.assessmentAttemptService.submitAssessment(id, submitAssessmentDto)
  }

  @Post(':id/grade')
  @ApiOperation({
    summary: 'Grade a submitted assessment',
    description: 'Calculate score and JLPT level suggestion for a submitted assessment',
  })
  @ApiParam({ name: 'id', description: 'Assessment attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Assessment graded successfully',
    type: AssessmentAttemptStatsDto,
  })
  @ApiResponse({ status: 400, description: 'Assessment not submitted yet' })
  @ApiResponse({ status: 404, description: 'Assessment attempt not found' })
  async gradeAssessment(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentAttemptService.gradeAttempt(id)
  }

  // ===== Query and Retrieval =====

  @Get()
  @ApiOperation({
    summary: 'Get assessment attempts with filtering',
    description: 'Retrieve assessment attempts with optional filtering by user, assessment, level, and date range',
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment attempts retrieved successfully',
    type: AssessmentAttemptListResponseDto,
  })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'assessmentId', required: false, type: Number })
  @ApiQuery({ name: 'level', required: false, enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'submitted', required: false, type: Boolean })
  @ApiQuery({ name: 'includeAnswers', required: false, type: Boolean })
  @ApiQuery({ name: 'includeUser', required: false, type: Boolean })
  @ApiQuery({ name: 'includeAssessment', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['startedAt', 'submittedAt', 'score', 'earnedScore'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getAttempts(@Query() query: AssessmentAttemptQueryDto) {
    const queryWithDefaults = {
      ...query,
      includeAnswers: query.includeAnswers ?? false,
      includeUser: query.includeUser ?? false,
      includeAssessment: query.includeAssessment ?? false,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sortBy: query.sortBy ?? 'startedAt',
      sortOrder: query.sortOrder ?? 'desc',
    }
    return this.assessmentAttemptService.getAttempts(queryWithDefaults as any)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get assessment attempt by ID',
    description: 'Retrieve detailed information about a specific assessment attempt',
  })
  @ApiParam({ name: 'id', description: 'Assessment attempt ID' })
  @ApiQuery({ name: 'includeAnswers', required: false, type: Boolean })
  @ApiQuery({ name: 'includeUser', required: false, type: Boolean })
  @ApiQuery({ name: 'includeAssessment', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Assessment attempt retrieved successfully',
    type: AssessmentAttemptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Assessment attempt not found' })
  async getAttempt(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeAnswers') includeAnswers?: boolean,
    @Query('includeUser') includeUser?: boolean,
    @Query('includeAssessment') includeAssessment?: boolean,
  ) {
    return this.assessmentAttemptService.getAttempt(id, {
      answers: includeAnswers,
      user: includeUser,
      assessment: includeAssessment,
    })
  }

  // ===== Statistics and Analytics =====

  @Get('assessment/:assessmentId/statistics')
  @ApiOperation({
    summary: 'Get assessment statistics',
    description: 'Retrieve comprehensive statistics for a specific assessment',
  })
  @ApiParam({ name: 'assessmentId', description: 'Assessment paper ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: AssessmentStatisticsDto,
  })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async getAssessmentStatistics(@Param('assessmentId', ParseIntPipe) assessmentId: number) {
    return this.assessmentAttemptService.getAssessmentStatistics(assessmentId)
  }

  @Get('assessment/:assessmentId/leaderboard')
  @ApiOperation({
    summary: 'Get assessment leaderboard',
    description: 'Retrieve top scoring users for a specific assessment',
  })
  @ApiParam({ name: 'assessmentId', description: 'Assessment paper ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of top users (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully',
    type: [LeaderboardEntryDto],
  })
  async getLeaderboard(
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    return this.assessmentAttemptService.getLeaderboard(assessmentId, limit || 10)
  }

  // ===== User-Specific Queries =====

  @Get('user/:userId/assessment/:assessmentId/best')
  @ApiOperation({
    summary: "Get user's best attempt for an assessment",
    description: 'Retrieve the highest scoring attempt by a user for a specific assessment',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'assessmentId', description: 'Assessment paper ID' })
  @ApiResponse({
    status: 200,
    description: 'Best attempt retrieved successfully',
    type: AssessmentAttemptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No attempts found' })
  async getOldUserBestAttempt_DEPRECATED(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    const attempt = await this.assessmentAttemptService.getUserBestAttempt(userId, assessmentId)
    if (!attempt) {
      throw new Error('No attempts found for this user and assessment')
    }
    return attempt
  }

  @Get('user/:userId/assessment/:assessmentId/count')
  @ApiOperation({
    summary: "Get user's attempt count for an assessment",
    description: 'Get the total number of attempts by a user for a specific assessment',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'assessmentId', description: 'Assessment paper ID' })
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
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    const count = await this.assessmentAttemptService.getUserAttemptCount(userId, assessmentId)
    return { count }
  }

  // ===== Helper Endpoints =====

  @Get('user/:userId/assessment/:assessmentId/can-start')
  @ApiOperation({
    summary: 'Check if user can start an assessment',
    description: 'Validate if a user is eligible to start a new assessment attempt',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'assessmentId', description: 'Assessment paper ID' })
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
  async canUserStartAssessment(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    return this.assessmentAttemptService.canStartAssessment(userId, assessmentId)
  }

  @Get(':id/progress')
  @ApiOperation({
    summary: 'Get attempt progress',
    description: 'Get completion status and progress for an assessment attempt',
  })
  @ApiParam({ name: 'id', description: 'Assessment attempt ID' })
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
    return this.assessmentAttemptService.getAttemptProgress(id)
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
    return this.assessmentAttemptService.analyzeLevelReadiness(userId, level)
  }

  // ===== Multiple Attempts Management =====

  @Get('user/:userId/assessment/:assessmentId/attempts')
  @ApiOperation({
    summary: 'Get all user attempts for an assessment',
    description: 'Retrieve all attempts made by a user for a specific assessment',
  })
  @ApiResponse({
    status: 200,
    description: 'User attempts retrieved successfully',
    type: [AssessmentAttemptResponseDto],
  })
  async getUserAttempts(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    return this.assessmentAttemptService.getUserAttempts(userId, assessmentId)
  }

  @Get('user/:userId/assessment/:assessmentId/best')
  @ApiOperation({
    summary: 'Get user best attempt for an assessment',
    description: 'Retrieve the highest scoring attempt for a user and assessment',
  })
  @ApiResponse({
    status: 200,
    description: 'Best attempt retrieved successfully',
    type: AssessmentAttemptResponseDto,
  })
  async getUserBestAttempt(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    return this.assessmentAttemptService.getUserBestAttempt(userId, assessmentId)
  }

  @Get('user/:userId/assessment/:assessmentId/latest')
  @ApiOperation({
    summary: 'Get user latest attempt for an assessment',
    description: 'Retrieve the most recent attempt for a user and assessment',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest attempt retrieved successfully',
    type: AssessmentAttemptResponseDto,
  })
  async getUserLatestAttempt(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    return this.assessmentAttemptService.getUserLatestAttempt(userId, assessmentId)
  }

  @Get('user/:userId/assessment/:assessmentId/stats')
  @ApiOperation({
    summary: 'Get user attempt statistics',
    description: 'Get comprehensive statistics for all attempts by a user on an assessment',
  })
  @ApiResponse({
    status: 200,
    description: 'User attempt statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalAttempts: { type: 'number' },
        bestScore: { type: 'number', nullable: true },
        latestScore: { type: 'number', nullable: true },
        averageScore: { type: 'number', nullable: true },
        improvementRate: { type: 'number', nullable: true },
      },
    },
  })
  async getUserAttemptStats(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    return this.assessmentAttemptService.getUserAttemptStats(userId, assessmentId)
  }

  @Get('user/:userId/assessment/:assessmentId/can-start')
  @ApiOperation({
    summary: 'Check if user can start assessment',
    description: 'Check if user can start a new attempt for an assessment (now always allows multiple attempts)',
  })
  @ApiResponse({
    status: 200,
    description: 'Check completed successfully',
    schema: {
      type: 'object',
      properties: {
        canStart: { type: 'boolean' },
        reason: { type: 'string' },
        attemptCount: { type: 'number' },
        lastAttempt: { type: 'object' },
      },
    },
  })
  async canStartAssessment(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    return this.assessmentAttemptService.canStartAssessment(userId, assessmentId)
  }
}
