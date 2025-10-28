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
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@ApiTags('Assessment Attempts')
@Controller('assessment-attempts')
export class AssessmentAttemptController {
  constructor(private readonly assessmentAttemptService: AssessmentAttemptService) {}

  @Post('start')
  async startAssessment(@ActiveUser('userId') userId: number, @Body() startAssessmentDto: StartAssessmentAttemptDto) {
    return await this.assessmentAttemptService.startAssessment(userId, startAssessmentDto)
  }

  @Post(':id/submit')
  async submitAssessment(
    @Param('id', ParseIntPipe) id: number,
    @Body() submitAssessmentDto: SubmitAssessmentAttemptDto,
  ) {
    return this.assessmentAttemptService.submitAssessment(id, submitAssessmentDto)
  }

  @Post(':id/grade')
  async gradeAssessment(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentAttemptService.gradeAttempt(id)
  }

  @Get()
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

  @Get('assessment/:assessmentId/statistics')
  async getAssessmentStatistics(@Param('assessmentId', ParseIntPipe) assessmentId: number) {
    return this.assessmentAttemptService.getAssessmentStatistics(assessmentId)
  }

  @Get('assessment/:assessmentId/leaderboard')
  async getLeaderboard(@Param('assessmentId', ParseIntPipe) assessmentId: number, @Query('limit') limit?: number) {
    return this.assessmentAttemptService.getLeaderboard(assessmentId, limit || 10)
  }

  @Get('user/:userId/assessment/:assessmentId/count')
  async getUserAttemptCount(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    const count = await this.assessmentAttemptService.getUserAttemptCount(userId, assessmentId)
    return { count }
  }

  @Get(':id')
  async getAttempt(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentAttemptService.getAttemptWithDetails(id)
  }
}
