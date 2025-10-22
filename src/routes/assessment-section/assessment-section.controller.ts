import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AssessmentSection } from '@prisma/client'
import { AuthType } from '../../shared/constants/auth.constant'
import { RoleName } from '../../shared/constants/role.constant'
import { Auth } from '../../shared/decorators/auth.decorator'
import { Roles } from '../../shared/decorators/roles.decorator'
import { RolesGuard } from '../../shared/guards/roles.guard'
import {
  AssessmentSectionQueryDto,
  AssessmentSectionStatsDto,
  BulkCreateAssessmentSectionsDto,
  BulkDeleteAssessmentSectionsDto,
  CopyAssessmentSectionDto,
  CreateAssessmentSectionDto,
  MoveAssessmentSectionDto,
  UpdateAssessmentSectionDto,
} from './assessment-section.dto'
import type {
  AssessmentSectionBasic,
  AssessmentSectionQuery,
  AssessmentSectionWithAssessment,
  AssessmentSectionWithItems,
} from './assessment-section.model'
import { AssessmentSectionService } from './assessment-section.service'

@ApiTags('Assessment Sections')
@Controller('assessment-sections')
@UseGuards(RolesGuard)
export class AssessmentSectionController {
  constructor(private readonly assessmentSectionService: AssessmentSectionService) {}

  @Post('')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Create new assessment section' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Assessment section created successfully' })
  async createAssessmentSection(@Body() createDto: CreateAssessmentSectionDto): Promise<AssessmentSection> {
    return this.assessmentSectionService.createAssessmentSection({
      assessmentId: createDto.assessmentId,
      title: createDto.title,
      type: createDto.type,
    })
  }

  @Get('')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get all assessment sections with pagination and filtering' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assessment sections retrieved successfully' })
  async getAssessmentSections(@Query() queryDto: AssessmentSectionQueryDto): Promise<{
    data: AssessmentSectionBasic[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    return this.assessmentSectionService.getAssessmentSections(queryDto as AssessmentSectionQuery)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get assessment section by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assessment section retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assessment section not found' })
  @ApiParam({ name: 'id', description: 'Assessment section ID' })
  async getAssessmentSection(@Param('id', ParseIntPipe) id: number): Promise<AssessmentSection> {
    return this.assessmentSectionService.getAssessmentSection(id)
  }

  @Get(':id/items')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get assessment section with all items and questions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assessment section with items retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assessment section not found' })
  @ApiParam({ name: 'id', description: 'Assessment section ID' })
  async getAssessmentSectionWithItems(@Param('id', ParseIntPipe) id: number): Promise<AssessmentSectionWithItems> {
    return this.assessmentSectionService.getAssessmentSectionWithItems(id)
  }

  @Get(':id/details')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get assessment section with assessment information' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assessment section with assessment info retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assessment section not found' })
  @ApiParam({ name: 'id', description: 'Assessment section ID' })
  async getAssessmentSectionWithAssessment(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AssessmentSectionWithAssessment> {
    return this.assessmentSectionService.getAssessmentSectionWithAssessment(id)
  }

  @Get(':id/stats')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get assessment section statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: AssessmentSectionStatsDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assessment section not found' })
  @ApiParam({ name: 'id', description: 'Assessment section ID' })
  async getAssessmentSectionStats(@Param('id', ParseIntPipe) id: number): Promise<AssessmentSectionStatsDto> {
    return this.assessmentSectionService.getAssessmentSectionStatistics(id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Update assessment section' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assessment section updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assessment section not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Section title already exists in assessment' })
  @ApiParam({ name: 'id', description: 'Assessment section ID' })
  async updateAssessmentSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAssessmentSectionDto,
  ): Promise<AssessmentSection> {
    return this.assessmentSectionService.updateAssessmentSection(id, updateDto)
  }

  @Post(':id/copy')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Copy assessment section to another assessment' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Assessment section copied successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assessment section not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Section title already exists in target assessment' })
  @ApiParam({ name: 'id', description: 'Assessment section ID to copy' })
  async copyAssessmentSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() copyDto: CopyAssessmentSectionDto,
  ): Promise<AssessmentSection> {
    return this.assessmentSectionService.copyAssessmentSection(id, copyDto.targetAssessmentId, copyDto.newTitle)
  }

  @Post(':id/duplicate')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Duplicate assessment section within the same assessment' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Assessment section duplicated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assessment section not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Section title already exists' })
  @ApiParam({ name: 'id', description: 'Assessment section ID to duplicate' })
  async duplicateAssessmentSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newTitle?: string } = {},
  ): Promise<AssessmentSection> {
    return this.assessmentSectionService.duplicateAssessmentSection(id, body.newTitle)
  }

  @Put(':id/move')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Move assessment section to another assessment' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assessment section moved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assessment section not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Section title already exists in target assessment' })
  @ApiParam({ name: 'id', description: 'Assessment section ID to move' })
  async moveAssessmentSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() moveDto: MoveAssessmentSectionDto,
  ): Promise<AssessmentSection> {
    return this.assessmentSectionService.moveAssessmentSection(id, moveDto.targetAssessmentId)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Delete assessment section' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Assessment section deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assessment section not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot delete section with assessment items' })
  @ApiParam({ name: 'id', description: 'Assessment section ID' })
  async deleteAssessmentSection(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.assessmentSectionService.deleteAssessmentSection(id)
  }

  @Post('assessment-papers/:assessmentId/sections/bulk')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Bulk create assessment sections' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Bulk creation completed' })
  @ApiParam({ name: 'assessmentId', description: 'Assessment paper ID' })
  async bulkCreateAssessmentSections(
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
    @Body() bulkCreateDto: BulkCreateAssessmentSectionsDto,
  ): Promise<{ created: AssessmentSection[]; failed: Array<{ section: any; error: string }> }> {
    const sectionsData = bulkCreateDto.sections.map((section) => ({
      title: section.title,
      type: section.type,
    }))
    return this.assessmentSectionService.bulkCreateAssessmentSections(assessmentId, sectionsData)
  }

  @Delete('bulk')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Bulk delete assessment sections' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bulk delete completed' })
  async bulkDeleteAssessmentSections(@Body() bulkDeleteDto: BulkDeleteAssessmentSectionsDto): Promise<{
    deleted: number
    failed: number[]
  }> {
    return this.assessmentSectionService.bulkDeleteAssessmentSections(bulkDeleteDto.ids)
  }

  @Get('assessment-papers/:assessmentId/sections/by-type/:type')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get sections by assessment ID and question type' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assessment sections retrieved successfully' })
  @ApiParam({ name: 'assessmentId', description: 'Assessment paper ID' })
  @ApiParam({ name: 'type', description: 'Question type' })
  async getSectionsByAssessmentIdAndType(
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
    @Param('type') type: string,
  ): Promise<AssessmentSectionBasic[]> {
    return this.assessmentSectionService.getSectionsByAssessmentIdAndType(assessmentId, type)
  }
}
