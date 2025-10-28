import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'

import {
  AssessmentAnswerAnalyticsDto,
  AssessmentAnswerListResponseDto,
  AssessmentAnswerQueryDto,
  AssessmentAnswerResponseDto,
  AssessmentAnswerStatsDto,
  AssessmentAnswerSummaryDto,
  BulkCreateAssessmentAnswersDto,
  BulkUpdateAssessmentAnswerDto,
  CreateAssessmentAnswerDto,
  GradeAssessmentAnswersDto,
  QuestionPerformanceDto,
  UpdateAssessmentAnswerDto,
} from './assessment-answer.dto'
import { AssessmentAnswerService } from './assessment-answer.service'

@ApiTags('Assessment Answers')
@Controller('assessment-answers')
export class AssessmentAnswerController {
  constructor(private readonly assessmentAnswerService: AssessmentAnswerService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new assessment answer',
    description: 'Create a single answer for an assessment question within an attempt',
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment answer created successfully',
    type: AssessmentAnswerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Assessment attempt or question not found' })
  @ApiResponse({ status: 409, description: 'Question already answered' })
  async createAnswer(@Body() createDto: CreateAssessmentAnswerDto) {
    return this.assessmentAnswerService.createAnswer(createDto)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get assessment answer by ID',
    description: 'Retrieve a specific assessment answer with optional details',
  })
  @ApiParam({ name: 'id', description: 'Assessment answer ID' })
  @ApiQuery({ name: 'includeQuestion', required: false, type: Boolean })
  @ApiQuery({ name: 'includeAttempt', required: false, type: Boolean })
  @ApiQuery({ name: 'includeSelectedOption', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Assessment answer retrieved successfully',
    type: AssessmentAnswerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Assessment answer not found' })
  async getAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeQuestion') includeQuestion?: boolean,
    @Query('includeAttempt') includeAttempt?: boolean,
    @Query('includeSelectedOption') includeSelectedOption?: boolean,
  ) {
    return this.assessmentAnswerService.getAnswerById(id, {
      question: includeQuestion,
      attempt: includeAttempt,
      selectedOption: includeSelectedOption,
    })
  }

  @Get()
  @ApiOperation({
    summary: 'Get assessment answers with filtering',
    description: 'Retrieve assessment answers with optional filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment answers retrieved successfully',
    type: AssessmentAnswerListResponseDto,
  })
  async getAnswers(@Query() query: AssessmentAnswerQueryDto) {
    return this.assessmentAnswerService.getAnswers(query as any)
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update assessment answer',
    description: 'Update an existing assessment answer',
  })
  @ApiParam({ name: 'id', description: 'Assessment answer ID' })
  @ApiResponse({
    status: 200,
    description: 'Assessment answer updated successfully',
    type: AssessmentAnswerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Assessment answer not found' })
  @ApiResponse({ status: 400, description: 'Cannot modify answers for submitted attempt' })
  async updateAnswer(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateAssessmentAnswerDto) {
    return this.assessmentAnswerService.updateAnswer(id, updateDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete assessment answer',
    description: 'Delete an assessment answer',
  })
  @ApiParam({ name: 'id', description: 'Assessment answer ID' })
  @ApiResponse({ status: 204, description: 'Assessment answer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Assessment answer not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete answers for submitted attempt' })
  async deleteAnswer(@Param('id', ParseIntPipe) id: number) {
    await this.assessmentAnswerService.deleteAnswer(id)
  }

  // ===== Bulk Operations =====

  @Post('bulk')
  @ApiOperation({
    summary: 'Create multiple assessment answers',
    description: 'Create multiple answers for an assessment attempt',
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment answers created successfully',
    type: [AssessmentAnswerResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or attempt already submitted' })
  async createBulkAnswers(@Body() bulkCreateDto: BulkCreateAssessmentAnswersDto) {
    return this.assessmentAnswerService.createBulkAnswers(bulkCreateDto)
  }

  @Patch(':attemptId/bulk')
  @ApiOperation({ summary: 'Update multiple assessment answers for an attempt' })
  @ApiParam({ name: 'attemptId', description: 'Assessment attempt ID' })
  @ApiBody({ type: [BulkUpdateAssessmentAnswerDto] })
  @ApiOkResponse({
    description: 'Assessment answers updated successfully',
    type: [AssessmentAnswerResponseDto],
  })
  async updateBulkAnswers(
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Body() answers: BulkUpdateAssessmentAnswerDto[],
  ): Promise<AssessmentAnswerResponseDto[]> {
    return await this.assessmentAnswerService.updateBulkAnswers(attemptId, answers)
  }

  // ===== Grading Operations =====

  @Post('grade')
  @ApiOperation({
    summary: 'Grade assessment answers',
    description: 'Grade all answers for a submitted assessment attempt',
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment answers graded successfully',
    schema: {
      type: 'object',
      properties: {
        gradedCount: { type: 'number', example: 45 },
        totalCount: { type: 'number', example: 50 },
        accuracy: { type: 'number', example: 85.5 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Assessment attempt not found' })
  @ApiResponse({ status: 400, description: 'Assessment attempt not submitted yet' })
  async gradeAnswers(@Body() gradeDto: GradeAssessmentAnswersDto) {
    return this.assessmentAnswerService.gradeAnswers(gradeDto)
  }

  // ===== Attempt-Specific Operations =====

  @Get('attempt/:attemptId')
  @ApiOperation({
    summary: 'Get answers for an assessment attempt',
    description: 'Retrieve all answers for a specific assessment attempt',
  })
  @ApiParam({ name: 'attemptId', description: 'Assessment attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Assessment answers retrieved successfully',
    type: [AssessmentAnswerResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Assessment attempt not found' })
  async getAttemptAnswers(@Param('attemptId', ParseIntPipe) attemptId: number) {
    return this.assessmentAnswerService.getAttemptAnswers(attemptId)
  }

  @Get('attempt/:attemptId/summary')
  @ApiOperation({
    summary: 'Get assessment attempt summary',
    description: 'Get summary statistics for an assessment attempt',
  })
  @ApiParam({ name: 'attemptId', description: 'Assessment attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Assessment summary retrieved successfully',
    type: AssessmentAnswerSummaryDto,
  })
  @ApiResponse({ status: 404, description: 'Assessment attempt not found' })
  async getAttemptSummary(@Param('attemptId', ParseIntPipe) attemptId: number) {
    return this.assessmentAnswerService.getAttemptSummary(attemptId)
  }

  @Get('attempt/:attemptId/performance')
  @ApiOperation({
    summary: 'Get question performance for an attempt',
    description: 'Get detailed performance analysis for each question in an attempt',
  })
  @ApiParam({ name: 'attemptId', description: 'Assessment attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Question performance retrieved successfully',
    type: [QuestionPerformanceDto],
  })
  @ApiResponse({ status: 404, description: 'Assessment attempt not found' })
  async getQuestionPerformance(@Param('attemptId', ParseIntPipe) attemptId: number) {
    return this.assessmentAnswerService.getQuestionPerformance(attemptId)
  }

  @Get('attempt/:attemptId/progress')
  @ApiOperation({
    summary: 'Get assessment attempt progress',
    description: 'Get completion progress for an assessment attempt',
  })
  @ApiParam({ name: 'attemptId', description: 'Assessment attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Assessment progress retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalQuestions: { type: 'number', example: 50 },
        answeredQuestions: { type: 'number', example: 35 },
        completionPercentage: { type: 'number', example: 70.0 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Assessment attempt not found' })
  async getAttemptProgress(@Param('attemptId', ParseIntPipe) attemptId: number) {
    return this.assessmentAnswerService.getAttemptProgress(attemptId)
  }

  @Delete('attempt/:attemptId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete all answers for an attempt',
    description: 'Delete all answers for a specific assessment attempt',
  })
  @ApiParam({ name: 'attemptId', description: 'Assessment attempt ID' })
  @ApiResponse({
    status: 200,
    description: 'Assessment answers deleted successfully',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number', example: 45 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Assessment attempt not found' })
  async deleteAttemptAnswers(@Param('attemptId', ParseIntPipe) attemptId: number) {
    const deletedCount = await this.assessmentAnswerService.deleteAttemptAnswers(attemptId)
    return { deletedCount }
  }

  // ===== Analytics and Statistics =====

  @Get('analytics')
  @ApiOperation({
    summary: 'Get answer analytics',
    description: 'Get comprehensive analytics for assessment answers',
  })
  @ApiResponse({
    status: 200,
    description: 'Answer analytics retrieved successfully',
    type: [AssessmentAnswerAnalyticsDto],
  })
  async getAnswerAnalytics(@Query() query: AssessmentAnswerStatsDto) {
    return this.assessmentAnswerService.getAnswerAnalytics(query)
  }

  @Get('question/:questionId/statistics')
  @ApiOperation({
    summary: 'Get question statistics',
    description: 'Get comprehensive statistics for a specific question',
  })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({
    status: 200,
    description: 'Question statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalAttempts: { type: 'number', example: 150 },
        correctAttempts: { type: 'number', example: 120 },
        accuracy: { type: 'number', example: 80.0 },
        averageTime: { type: 'number', example: 45.5 },
        difficultyLevel: { type: 'string', example: 'MEDIUM' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async getQuestionStatistics(@Param('questionId', ParseIntPipe) questionId: number) {
    return this.assessmentAnswerService.getQuestionStatistics(questionId)
  }

  // ===== User-Specific Operations =====

  @Get('user/:userId/history')
  @ApiOperation({
    summary: "Get user's answer history",
    description: 'Get answer history for a specific user, optionally filtered by question',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'questionId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'User answer history retrieved successfully',
    type: [AssessmentAnswerResponseDto],
  })
  async getUserAnswerHistory(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('questionId', ParseIntPipe) questionId?: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    return this.assessmentAnswerService.getUserAnswerHistory(userId, questionId, limit || 10)
  }

  @Get('user/:userId/wrong-answers')
  @ApiOperation({
    summary: "Get user's wrong answers for review",
    description: 'Get wrong answers for a user to help with review and learning',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'assessmentId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Wrong answers retrieved successfully',
    type: [AssessmentAnswerResponseDto],
  })
  async getWrongAnswersForReview(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('assessmentId', ParseIntPipe) assessmentId?: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    return this.assessmentAnswerService.getWrongAnswersForReview(userId, assessmentId, limit || 20)
  }
}
