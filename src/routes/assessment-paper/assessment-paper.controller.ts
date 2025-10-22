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
  Request,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { AssessmentPaperService } from './assessment-paper.service'
import {
  CreateAssessmentPaperDto,
  CreateLessonQuizDto,
  UpdateAssessmentPaperDto,
  AssessmentPaperQueryDto,
  BulkDeleteAssessmentPaperDto,
  CloneAssessmentPaperDto,
  AssessmentPaperStatsDto,
  BulkUpdateVisibilityDto,
  GenerateFromBlueprintDto,
} from './assessment-paper.dto'
import { Auth } from '../../shared/decorators/auth.decorator'
import { AuthType } from '../../shared/constants/auth.constant'
import { Roles } from '../../shared/decorators/roles.decorator'
import { RolesGuard } from '../../shared/guards/roles.guard'
import { RoleName } from '../../shared/constants/role.constant'
import type {
  AssessmentPaperBase,
  AssessmentPaperBasic,
  AssessmentPaperWithRelations,
  AssessmentPaperWithSections,
} from './assessment-paper.model'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@ApiTags('Assessment Papers')
@Controller('assessment-papers')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class AssessmentPaperController {
  constructor(private readonly assessmentPaperService: AssessmentPaperService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Create new assessment paper' })
  @ApiResponse({ status: 201, description: 'Assessment paper created successfully' })
  async createAssessmentPaper(
    @ActiveUser('userId') userId: number,
    @Body() createDto: CreateAssessmentPaperDto,
  ): Promise<AssessmentPaperBase> {
    const data = { ...createDto, createdBy: userId }
    return this.assessmentPaperService.createAssessmentPaper(data)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get all assessment papers with pagination' })
  @ApiResponse({ status: 200, description: 'Assessment papers retrieved successfully' })
  async getAssessmentPapers(@Query() queryDto: AssessmentPaperQueryDto): Promise<{
    data: AssessmentPaperBasic[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    return this.assessmentPaperService.getAssessmentPapers(queryDto)
  }

  @Get('public')
  @ApiOperation({ summary: 'Get public assessment papers' })
  @ApiResponse({ status: 200, description: 'Public assessment papers retrieved successfully' })
  async getPublicAssessments(
    @Query('level') level?: string,
    @Query('type') type?: string,
  ): Promise<AssessmentPaperBase[]> {
    return this.assessmentPaperService.getPublicAssessments(level as any, type as any)
  }

  @Get('search')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Search assessment papers by content' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchAssessmentPapers(
    @Query('q') searchTerm: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<AssessmentPaperBase[]> {
    return this.assessmentPaperService.searchAssessmentPapers(searchTerm, limit)
  }

  @Get('blueprint/:blueprintId')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Get assessment papers by blueprint' })
  @ApiResponse({ status: 200, description: 'Assessment papers by blueprint retrieved successfully' })
  async getAssessmentPapersByBlueprint(
    @Param('blueprintId', ParseIntPipe) blueprintId: number,
  ): Promise<AssessmentPaperBase[]> {
    return this.assessmentPaperService.getAssessmentPapersByBlueprint(blueprintId)
  }

  @Get('creator/:createdBy')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Get assessment papers by creator' })
  @ApiResponse({ status: 200, description: 'Assessment papers by creator retrieved successfully' })
  async getAssessmentPapersByCreator(
    @Param('createdBy', ParseIntPipe) createdBy: number,
  ): Promise<AssessmentPaperBase[]> {
    return this.assessmentPaperService.getAssessmentPapersByCreator(createdBy)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get assessment paper by ID' })
  @ApiResponse({ status: 200, description: 'Assessment paper retrieved successfully' })
  async getAssessmentPaper(@Param('id', ParseIntPipe) id: number): Promise<AssessmentPaperBase> {
    return this.assessmentPaperService.getAssessmentPaper(id)
  }

  @Get(':id/details')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Get assessment paper with full relations' })
  @ApiResponse({ status: 200, description: 'Assessment paper details retrieved successfully' })
  async getAssessmentPaperWithRelations(@Param('id', ParseIntPipe) id: number): Promise<AssessmentPaperWithRelations> {
    return this.assessmentPaperService.getAssessmentPaperWithRelations(id)
  }

  @Get(':id/sections')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Get assessment paper with sections' })
  @ApiResponse({ status: 200, description: 'Assessment paper sections retrieved successfully' })
  async getAssessmentPaperWithSections(@Param('id', ParseIntPipe) id: number): Promise<AssessmentPaperWithSections> {
    return this.assessmentPaperService.getAssessmentPaperWithSections(id)
  }

  @Get(':id/statistics')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Get assessment paper statistics' })
  @ApiResponse({ status: 200, type: AssessmentPaperStatsDto })
  async getAssessmentPaperStatistics(@Param('id', ParseIntPipe) id: number): Promise<AssessmentPaperStatsDto> {
    return this.assessmentPaperService.getAssessmentPaperStatistics(id)
  }

  @Get(':id/validate')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Validate assessment paper content' })
  @ApiResponse({ status: 200, description: 'Assessment paper validation completed' })
  async validateAssessmentContent(@Param('id', ParseIntPipe) id: number): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    return this.assessmentPaperService.validateAssessmentContent(id)
  }

  @Get(':id/attempt')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Get assessment paper for student attempt (without answers)' })
  @ApiResponse({ status: 200, description: 'Assessment paper for attempt retrieved successfully' })
  async getAssessmentPaperForAttempt(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<AssessmentPaperBase> {
    return this.assessmentPaperService.getAssessmentPaperForAttempt(id, req.user.id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Update assessment paper' })
  @ApiResponse({ status: 200, description: 'Assessment paper updated successfully' })
  async updateAssessmentPaper(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAssessmentPaperDto,
  ): Promise<AssessmentPaperBase> {
    return this.assessmentPaperService.updateAssessmentPaper(id, updateDto)
  }

  @Post(':id/clone')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Clone assessment paper' })
  @ApiResponse({ status: 201, description: 'Assessment paper cloned successfully' })
  async cloneAssessmentPaper(
    @Param('id', ParseIntPipe) id: number,
    @Body() cloneDto: CloneAssessmentPaperDto,
    @Request() req: any,
  ): Promise<AssessmentPaperBase> {
    return this.assessmentPaperService.cloneAssessmentPaper(id, req.user.id, cloneDto)
  }

  @Post(':id/new-version')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Create new version of assessment paper' })
  @ApiResponse({ status: 201, description: 'New version created successfully' })
  async createNewVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body() changes: UpdateAssessmentPaperDto,
  ): Promise<AssessmentPaperBase> {
    return this.assessmentPaperService.createNewVersion(id, changes)
  }

  @Post('blueprint/:blueprintId/generate')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Generate assessment paper from blueprint' })
  @ApiResponse({ status: 201, description: 'Assessment paper generated from blueprint successfully' })
  async generateFromBlueprint(
    @Param('blueprintId', ParseIntPipe) blueprintId: number,
    @Body() generateDto: GenerateFromBlueprintDto,
    @Request() req: any,
  ): Promise<AssessmentPaperBase> {
    return this.assessmentPaperService.generateFromBlueprint(
      blueprintId,
      req.user.id,
      generateDto.scoreProfileId,
      generateDto,
    )
  }

  @Post('bulk-delete')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @ApiOperation({ summary: 'Bulk delete assessment papers' })
  @ApiResponse({ status: 200, description: 'Bulk delete completed' })
  async bulkDeleteAssessmentPapers(
    @Body() bulkDeleteDto: BulkDeleteAssessmentPaperDto,
  ): Promise<{ deleted: number; failed: number[] }> {
    return this.assessmentPaperService.bulkDeleteAssessmentPapers(bulkDeleteDto.ids)
  }

  @Post('bulk-update-visibility')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @ApiOperation({ summary: 'Bulk update assessment paper visibility' })
  @ApiResponse({ status: 200, description: 'Bulk visibility update completed' })
  async bulkUpdateVisibility(
    @Body() bulkUpdateDto: BulkUpdateVisibilityDto,
  ): Promise<{ updated: number; failed: number[] }> {
    return this.assessmentPaperService.bulkUpdateVisibility(bulkUpdateDto.ids, bulkUpdateDto.visibility)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Delete assessment paper' })
  @ApiResponse({ status: 200, description: 'Assessment paper deleted successfully' })
  async deleteAssessmentPaper(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.assessmentPaperService.deleteAssessmentPaper(id)
  }
}
