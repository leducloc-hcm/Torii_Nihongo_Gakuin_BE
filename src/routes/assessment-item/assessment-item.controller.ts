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
    return await this.assessmentItemService.createAssessmentItem(createDto)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: AssessmentItemQueryDto) {
    return await this.assessmentItemService.getAssessmentItems(query)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.assessmentItemService.getAssessmentItem(id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateAssessmentItemDto) {
    return await this.assessmentItemService.update(id, updateDto)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.assessmentItemService.delete(id)
  }
}
