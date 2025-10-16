// ===== TestAnswer Controller =====
// REST API endpoints for TestAnswer operations
// Handles CRUD, bulk operations, grading, analytics, and insights

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger'

import { TestAnswerService } from './test-answer.service'
import {
  CreateTestAnswerDto,
  UpdateTestAnswerDto,
  TestAnswerQueryDto,
  TestAnswerResponseDto,
  AnswerStatisticsDto,
} from './test-answer.dto'

@ApiTags('Test Answers')
@Controller('test-answers')
export class TestAnswerController {
  constructor(private readonly testAnswerService: TestAnswerService) {}

  // ===== Basic CRUD Operations =====

  @Post()
  @ApiOperation({
    summary: 'Create a new test answer',
    description: 'Create a single answer for a test question within an attempt',
  })
  @ApiResponse({
    status: 201,
    description: 'Test answer created successfully',
    type: TestAnswerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createAnswer(@Body() createDto: CreateTestAnswerDto) {
    return this.testAnswerService.createAnswer(createDto)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get test answer by ID',
    description: 'Retrieve a specific test answer with optional details',
  })
  @ApiParam({ name: 'id', description: 'Test answer ID' })
  @ApiQuery({ name: 'includeDetails', required: false, type: Boolean, description: 'Include related data' })
  @ApiResponse({
    status: 200,
    description: 'Test answer retrieved successfully',
    type: TestAnswerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Test answer not found' })
  async getAnswerById(@Param('id', ParseIntPipe) id: number, @Query('includeDetails') includeDetails?: boolean) {
    return this.testAnswerService.getAnswerById(id, includeDetails || false)
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update test answer',
    description: 'Update an existing test answer',
  })
  @ApiParam({ name: 'id', description: 'Test answer ID' })
  @ApiResponse({
    status: 200,
    description: 'Test answer updated successfully',
    type: TestAnswerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Test answer not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updateAnswer(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateTestAnswerDto) {
    return this.testAnswerService.updateAnswer(id, updateDto)
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete test answer',
    description: 'Delete a test answer by ID',
  })
  @ApiParam({ name: 'id', description: 'Test answer ID' })
  @ApiResponse({
    status: 200,
    description: 'Test answer deleted successfully',
    type: TestAnswerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Test answer not found' })
  async deleteAnswer(@Param('id', ParseIntPipe) id: number) {
    return this.testAnswerService.deleteAnswer(id)
  }

  // ===== Query Operations =====

  @Get()
  @ApiOperation({
    summary: 'Get test answers with filters',
    description: 'Retrieve test answers with filtering, pagination, and sorting',
  })
  @ApiQuery({ name: 'attemptId', required: false, type: Number })
  @ApiQuery({ name: 'questionId', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'testId', required: false, type: Number })
  @ApiQuery({ name: 'isCorrect', required: false, type: Boolean })
  @ApiQuery({ name: 'hasAnswer', required: false, type: Boolean })
  @ApiQuery({
    name: 'questionType',
    required: false,
    enum: ['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'],
  })
  @ApiQuery({ name: 'level', required: false, enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['EASY', 'MEDIUM', 'HARD'] })
  @ApiQuery({ name: 'includeQuestion', required: false, type: Boolean })
  @ApiQuery({ name: 'includeAttempt', required: false, type: Boolean })
  @ApiQuery({ name: 'includeSelectedOption', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['id', 'questionId', 'timeSpentSec'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: 200,
    description: 'Test answers retrieved successfully',
  })
  async getAnswers(@Query() query: TestAnswerQueryDto) {
    const queryWithDefaults = {
      ...query,
      includeQuestion: query.includeQuestion ?? false,
      includeAttempt: query.includeAttempt ?? false,
      includeSelectedOption: query.includeSelectedOption ?? false,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sortBy: query.sortBy ?? 'id',
      sortOrder: query.sortOrder ?? 'asc',
    }
    return this.testAnswerService.getAnswers(queryWithDefaults)
  }

  @Get('attempt/:attemptId')
  @ApiOperation({
    summary: 'Get all answers for a test attempt',
    description: 'Retrieve all answers submitted for a specific test attempt with question details',
  })
  @ApiParam({ name: 'attemptId', description: 'Test attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Attempt answers retrieved successfully',
  })
  async getAnswersByAttempt(@Param('attemptId', ParseIntPipe) attemptId: number) {
    return this.testAnswerService.getAnswersByAttempt(attemptId)
  }

  // ===== Grading Operations =====

  @Post(':id/grade')
  @ApiOperation({
    summary: 'Grade a test answer',
    description: 'Automatically grade a test answer based on the selected option',
  })
  @ApiParam({ name: 'id', description: 'Test answer ID' })
  @ApiResponse({
    status: 200,
    description: 'Answer graded successfully',
    type: TestAnswerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Test answer not found' })
  @HttpCode(HttpStatus.OK)
  async gradeAnswer(@Param('id', ParseIntPipe) id: number) {
    return this.testAnswerService.gradeAnswer(id)
  }

  @Post('attempt/:attemptId/grade')
  @ApiOperation({
    summary: 'Grade all answers for an attempt',
    description: 'Automatically grade all answers submitted for a test attempt',
  })
  @ApiParam({ name: 'attemptId', description: 'Test attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'All answers graded successfully',
  })
  @HttpCode(HttpStatus.OK)
  async gradeAttemptAnswers(@Param('attemptId', ParseIntPipe) attemptId: number) {
    return this.testAnswerService.gradeAttemptAnswers(attemptId)
  }

  // ===== Analytics Operations =====

  @Get('analytics/questions')
  @ApiOperation({
    summary: 'Get question analytics',
    description: 'Analyze performance statistics for specific questions',
  })
  @ApiQuery({ name: 'questionIds', required: false, type: [Number], description: 'Specific question IDs' })
  @ApiQuery({ name: 'testId', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'level', required: false, enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  @ApiQuery({
    name: 'questionType',
    required: false,
    enum: ['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'],
  })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['EASY', 'MEDIUM', 'HARD'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'minAttempts', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Question analytics retrieved successfully',
  })
  async getQuestionAnalytics(@Query() query: any) {
    return this.testAnswerService.getQuestionAnalytics(query)
  }

  @Get('analytics/statistics')
  @ApiOperation({
    summary: 'Get answer statistics',
    description: 'Get comprehensive statistics for answers with filtering options',
  })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'testId', required: false, type: Number })
  @ApiQuery({ name: 'level', required: false, enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  @ApiQuery({
    name: 'questionType',
    required: false,
    enum: ['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'],
  })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['EASY', 'MEDIUM', 'HARD'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Answer statistics retrieved successfully',
    type: AnswerStatisticsDto,
  })
  async getAnswerStatistics(@Query() query: any) {
    return this.testAnswerService.getAnswerStatistics(query)
  }

  @Get('analytics/insights/:attemptId')
  @ApiOperation({
    summary: 'Get answer insights for an attempt',
    description: 'Get detailed insights, patterns, and recommendations for a test attempt',
  })
  @ApiParam({ name: 'attemptId', description: 'Test attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Answer insights retrieved successfully',
  })
  async getAnswerInsights(@Param('attemptId', ParseIntPipe) attemptId: number) {
    return this.testAnswerService.getAnswerInsights(attemptId)
  }

  // ===== Comparison and Progress Operations =====

  @Get('analytics/compare/:userId/:compareUserId')
  @ApiOperation({
    summary: 'Compare user performance',
    description: 'Compare answer performance between two users',
  })
  @ApiParam({ name: 'userId', description: 'First user ID' })
  @ApiParam({ name: 'compareUserId', description: 'Second user ID to compare with' })
  @ApiQuery({ name: 'testId', required: false, type: Number, description: 'Limit comparison to specific test' })
  @ApiResponse({
    status: 200,
    description: 'User performance comparison retrieved successfully',
  })
  async compareUserPerformance(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('compareUserId', ParseIntPipe) compareUserId: number,
    @Query('testId') testId?: number,
  ) {
    return this.testAnswerService.compareUserPerformance(userId, compareUserId, testId)
  }

  @Get('analytics/progress/:userId')
  @ApiOperation({
    summary: 'Get user progress over time',
    description: 'Analyze user answer performance trends over a specified period',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to analyze (default: 30)' })
  @ApiResponse({
    status: 200,
    description: 'User progress analysis retrieved successfully',
  })
  async getUserProgressOverTime(@Param('userId', ParseIntPipe) userId: number, @Query('days') days?: number) {
    return this.testAnswerService.getUserProgressOverTime(userId, days || 30)
  }

  // ===== Utility Operations =====

  @Get('analytics/summary/:attemptId')
  @ApiOperation({
    summary: 'Get attempt answer summary',
    description: 'Get a quick summary of answers for a test attempt',
  })
  @ApiParam({ name: 'attemptId', description: 'Test attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Attempt answer summary retrieved successfully',
  })
  async getAttemptSummary(@Param('attemptId', ParseIntPipe) attemptId: number) {
    const answers = await this.testAnswerService.getAnswersByAttempt(attemptId)

    const totalQuestions = answers.length
    const answeredQuestions = answers.filter((a) => a.selectedOptionId !== null).length
    const correctAnswers = answers.filter((a) => a.isCorrect === true).length
    const skippedQuestions = totalQuestions - answeredQuestions

    const accuracy = answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0

    const totalTime = answers.reduce((sum, answer) => sum + (answer.timeSpentSec || 0), 0)
    const averageTimePerQuestion = totalQuestions > 0 ? totalTime / totalQuestions : 0

    return {
      attemptId,
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      skippedQuestions,
      accuracy: Math.round(accuracy * 100) / 100,
      totalTimeSpent: totalTime,
      averageTimePerQuestion: Math.round(averageTimePerQuestion * 100) / 100,
    }
  }

  @Get('analytics/leaderboard')
  @ApiOperation({
    summary: 'Get answer accuracy leaderboard',
    description: 'Get top performers by answer accuracy for a specific test or overall',
  })
  @ApiQuery({ name: 'testId', required: false, type: Number })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top users to return (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Answer accuracy leaderboard retrieved successfully',
  })
  getAccuracyLeaderboard(@Query('testId') testId?: number, @Query('limit') limit?: number) {
    // This would require more complex aggregation queries
    // For now, return a placeholder response
    return {
      testId,
      leaderboard: [],
      note: 'Leaderboard functionality requires additional implementation',
    }
  }
}
