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
  HttpStatus,
  HttpCode,
} from '@nestjs/common'
import { AssessmentItemService } from './assessment-item.service'
import { CreateAssessmentItemDto, UpdateAssessmentItemDto, AssessmentItemQueryDto } from './assessment-item.dto'
import { AuthType } from '../../shared/constants/auth.constant'
import { RoleName } from '../../shared/constants/role.constant'
import { Auth } from '../../shared/decorators/auth.decorator'
import { Roles } from '../../shared/decorators/roles.decorator'

@Controller('assessment-items')
export class AssessmentItemController {
  constructor(private readonly assessmentItemService: AssessmentItemService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateAssessmentItemDto) {
    return this.assessmentItemService.createAssessmentItem(createDto as any)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: AssessmentItemQueryDto) {
    return this.assessmentItemService.getAssessmentItems(query as any)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeQuestion') includeQuestion?: boolean,
    @Query('includeSection') includeSection?: boolean,
    @Query('includeQuestionGroup') includeQuestionGroup?: boolean,
  ) {
    return this.assessmentItemService.getAssessmentItem(id, {
      question: includeQuestion,
      section: includeSection,
      questionGroup: includeQuestionGroup,
    })
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateAssessmentItemDto) {
    return this.assessmentItemService.updateAssessmentItem(id, updateDto)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentItemService.deleteAssessmentItem(id)
  }

  @Get('section/:sectionId')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async findBySection(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Query('includeQuestion') includeQuestion?: boolean,
    @Query('includeQuestionGroup') includeQuestionGroup?: boolean,
  ) {
    const items = await this.assessmentItemService.getAssessmentItemsBySectionId(sectionId)

    if (includeQuestion || includeQuestionGroup) {
      const detailedItems = await Promise.all(
        items.map((item) =>
          this.assessmentItemService.getAssessmentItem(item.id, {
            question: includeQuestion,
            questionGroup: includeQuestionGroup,
          }),
        ),
      )
      return detailedItems
    }

    return items
  }
}
