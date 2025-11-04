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
import { AssessmentAssignmentService } from './assessment-assignment.service'
import {
  CreateAssessmentAssignmentDTO,
  UpdateAssessmentAssignmentDTO,
  QueryAssessmentAssignmentDTO,
  MyAssignmentsQueryDTO,
} from './assessment-assignment.dto'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'

@Controller('assessment-assignments')
@UseGuards(RolesGuard)
export class AssessmentAssignmentController {
  constructor(private readonly assignmentService: AssessmentAssignmentService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateAssessmentAssignmentDTO, @Request() req: any) {
    const userId = req.user.id
    return this.assignmentService.create(createDto, userId)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() queryDto: QueryAssessmentAssignmentDTO) {
    return this.assignmentService.findAll(queryDto)
  }

  @Get('statistics')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getStatistics(
    @Query('assignedById', ParseIntPipe) assignedById?: number,
    @Query('classId', ParseIntPipe) classId?: number,
  ) {
    return this.assignmentService.getStats({ assignedById, classId })
  }

  @Get('created-by-me')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getCreatedByMe(@Request() req: any, @Query() queryDto: QueryAssessmentAssignmentDTO) {
    const userId = req.user.id
    return this.assignmentService.getCreatedByMe(userId, queryDto)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assignmentService.findOne(id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAssessmentAssignmentDTO,
    @Request() req: any,
  ) {
    const userId = req.user.id
    return this.assignmentService.update(id, updateDto, userId)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId = req.user.id
    await this.assignmentService.remove(id, userId)
    return { message: 'Assignment deleted successfully' }
  }

  // ============= STUDENT ENDPOINTS =============

  @Get('my/assignments')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getMyAssignments(@Request() req: any, @Query() queryDto: MyAssignmentsQueryDTO) {
    const userId = req.user.id
    return this.assignmentService.getMyAssignments(userId, queryDto)
  }

  @Get('my/upcoming')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getUpcoming(@Request() req: any, @Query('days', ParseIntPipe) days?: number) {
    const userId = req.user.id
    return this.assignmentService.getUpcoming(userId, days || 7)
  }

  @Get('my/overdue')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getOverdue(@Request() req: any) {
    const userId = req.user.id
    return this.assignmentService.getOverdue(userId)
  }

  // ============= PROGRESS TRACKING =============

  @Get(':id/progress')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getUserProgress(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId = req.user.id
    return this.assignmentService.getUserProgress(id, userId)
  }

  @Get(':id/progresses')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getAssignmentProgresses(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId = req.user.id
    return this.assignmentService.getAssignmentProgresses(id, userId)
  }

  @Get(':id/check-overdue')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async checkOverdue(@Param('id', ParseIntPipe) id: number) {
    const isOverdue = await this.assignmentService.isOverdue(id)
    return { isOverdue }
  }
}
