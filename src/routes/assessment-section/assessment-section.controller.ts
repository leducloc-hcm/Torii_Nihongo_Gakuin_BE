import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { AssessmentSection } from '@prisma/client'
import { AuthType } from '../../shared/constants/auth.constant'
import { RoleName } from '../../shared/constants/role.constant'
import { Auth } from '../../shared/decorators/auth.decorator'
import { Roles } from '../../shared/decorators/roles.decorator'
import {
  CreateAssessmentSectionDto,
  UpdateAssessmentSectionDto,
  AssessmentSectionQueryDto,
} from './assessment-section.dto'
import type {
  AssessmentSectionBasic,
  AssessmentSectionQuery,
  AssessmentSectionWithItems,
} from './assessment-section.model'
import { AssessmentSectionService } from './assessment-section.service'

@Controller('assessment-sections')
export class AssessmentSectionController {
  constructor(private readonly assessmentSectionService: AssessmentSectionService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateAssessmentSectionDto): Promise<AssessmentSection> {
    return this.assessmentSectionService.createAssessmentSection({
      assessmentId: createDto.assessmentId,
      title: createDto.title,
      type: createDto.type,
      timeLimitSec: createDto.timeLimitSec,
    })
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() queryDto: AssessmentSectionQueryDto): Promise<{
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
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<AssessmentSection> {
    return this.assessmentSectionService.getAssessmentSection(id)
  }

  @Get(':id/items')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async getItems(@Param('id', ParseIntPipe) id: number): Promise<AssessmentSectionWithItems> {
    return this.assessmentSectionService.getAssessmentSectionWithItems(id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAssessmentSectionDto,
  ): Promise<AssessmentSection> {
    return this.assessmentSectionService.updateAssessmentSection(id, updateDto)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentSectionService.deleteAssessmentSection(id)
  }
}
