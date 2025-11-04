import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common'
import { AssessmentProgressService } from './assessment-progress.service'
import {
  SaveAnswerProgressDTO,
  UpdateAnswerProgressDTO,
  QueryAssessmentProgressDTO,
  SubmitAssessmentDTO,
  StartAssessmentDTO,
  AutoSaveProgressDTO,
} from './assessment-progress.dto'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'

@Controller('assessment-progress')
@UseGuards(RolesGuard)
export class AssessmentProgressController {
  constructor(private readonly progressService: AssessmentProgressService) {}

  // ============= START & SUBMIT =============

  @Post('start')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.CREATED)
  async startAssessment(@Body() startDto: StartAssessmentDTO, @Request() req: any) {
    const userId = req.user.id
    return this.progressService.startAssessment(startDto, userId)
  }

  @Post('submit')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async submitAssessment(@Body() submitDto: SubmitAssessmentDTO, @Request() req: any) {
    const userId = req.user.id
    return this.progressService.submitAssessment(submitDto, userId)
  }

  // ============= SAVE & AUTO-SAVE =============

  @Post('answers')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.CREATED)
  async saveAnswer(@Body() saveDto: SaveAnswerProgressDTO, @Request() req: any) {
    const userId = req.user.id
    return this.progressService.saveAnswer(saveDto, userId)
  }

  @Put('answers/:id')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async updateAnswer(
    @Param('id', ParseIntPipe) answerId: number,
    @Body() updateDto: UpdateAnswerProgressDTO,
    @Request() req: any,
  ) {
    const userId = req.user.id
    return this.progressService.updateAnswer(answerId, updateDto, userId)
  }

  @Post('auto-save')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async autoSave(@Body() autoSaveDto: AutoSaveProgressDTO, @Request() req: any) {
    const userId = req.user.id
    return this.progressService.autoSave(autoSaveDto, userId)
  }

  // ============= GET MY PROGRESS =============

  @Get('my')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getAllMyProgresses(@Request() req: any, @Query() queryDto: QueryAssessmentProgressDTO) {
    const userId = req.user.id
    return this.progressService.getAllMyProgresses(userId, queryDto)
  }

  @Get('my/stats')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getMyStats(@Request() req: any) {
    const userId = req.user.id
    return this.progressService.getUserStats(userId)
  }

  @Get('assessment/:assessmentId/my')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getMyProgress(@Param('assessmentId', ParseIntPipe) assessmentId: number, @Request() req: any) {
    const userId = req.user.id
    return this.progressService.getMyProgress(assessmentId, userId)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getProgressById(@Param('id', ParseIntPipe) progressId: number, @Request() req: any) {
    const userId = req.user.id
    return this.progressService.getProgressById(progressId, userId)
  }

  @Get(':id/answers')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getMyAnswers(@Param('id', ParseIntPipe) progressId: number, @Request() req: any) {
    const userId = req.user.id
    return this.progressService.getMyAnswers(progressId, userId)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async deleteProgress(@Param('id', ParseIntPipe) progressId: number, @Request() req: any) {
    const userId = req.user.id
    return this.progressService.deleteProgress(progressId, userId)
  }

  // ============= ADMIN & STATS =============

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getAllProgresses(@Query() queryDto: QueryAssessmentProgressDTO) {
    return this.progressService.getAllProgresses(queryDto)
  }

  @Get('assessment/:assessmentId/stats')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getAssessmentStats(@Param('assessmentId', ParseIntPipe) assessmentId: number) {
    return this.progressService.getAssessmentStats(assessmentId)
  }
}
