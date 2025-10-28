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
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AssessmentPaperService } from './assessment-paper.service'
import { CreateAssessmentPaperDto, UpdateAssessmentPaperDto, AssessmentPaperQueryDto } from './assessment-paper.dto'
import { Auth } from '../../shared/decorators/auth.decorator'
import { AuthType } from '../../shared/constants/auth.constant'
import { Roles } from '../../shared/decorators/roles.decorator'
import { RolesGuard } from '../../shared/guards/roles.guard'
import { RoleName } from '../../shared/constants/role.constant'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@Controller('assessment-papers')
@UseGuards(RolesGuard)
export class AssessmentPaperController {
  constructor(private readonly assessmentPaperService: AssessmentPaperService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  async create(@ActiveUser('userId') userId: number, @Body() createDto: CreateAssessmentPaperDto) {
    return this.assessmentPaperService.createAssessmentPaper({ ...createDto, createdBy: userId })
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() queryDto: AssessmentPaperQueryDto) {
    return this.assessmentPaperService.getAssessmentPapers(queryDto)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentPaperService.getAssessmentPaper(id)
  }

  @Get(':id/details')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async getDetails(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentPaperService.getAssessmentPaperWithRelations(id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateAssessmentPaperDto) {
    return this.assessmentPaperService.updateAssessmentPaper(id, updateDto)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentPaperService.deleteAssessmentPaper(id)
  }

  @Post(':id/clone')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  async clone(@Param('id', ParseIntPipe) id: number, @Body() body?: { title?: string }) {
    return this.assessmentPaperService.cloneAssessmentPaper(id, body?.title)
  }

  @Get('attempted/all')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  getAttemptedAssessments(
    @ActiveUser('userId') userId: number,
    @Query('type') type?: 'TEST' | 'EXAM',
    @Query('level') level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.assessmentPaperService.getAttemptedAssessments({
      userId,
      type,
      level,
      page: page || 1,
      limit: limit || 10,
    })
  }

  @Get(':assessmentId/recent-attempts')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  getRecentAttempts(@Param('assessmentId', ParseIntPipe) assessmentId: number) {
    return this.assessmentPaperService.getRecentAttempts(assessmentId)
  }

  @Get('attempt/:attemptId/with-answers')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  getAssessmentPaperByUserAttempt(
    @ActiveUser('userId') userId: number,
    @Param('attemptId', ParseIntPipe) attemptId: number,
  ) {
    return this.assessmentPaperService.getAssessmentPaperByUserAttempt(userId, attemptId)
  }

  @Get(':assessmentId/leaderboard')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  getAssessmentLeaderboard(@Param('assessmentId', ParseIntPipe) assessmentId: number) {
    return this.assessmentPaperService.getAssessmentLeaderboard(assessmentId)
  }
}
