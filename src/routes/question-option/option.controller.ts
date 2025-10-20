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
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthType } from 'src/shared/constants/auth.constant'
import { RoleName } from 'src/shared/constants/role.constant'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { BulkCreateOptionsDTO, CreateOptionDTO, QueryOptionDTO, ReorderOptionsDTO, UpdateOptionDTO } from './option.dto'
import { OptionService } from './option.service'

@ApiTags('Question Options')
@Controller()
@UseGuards(RolesGuard)
export class OptionController {
  constructor(private readonly optionService: OptionService) {}

  @Post('questions/:questionId/options')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  async create(@Param('questionId', ParseIntPipe) questionId: number, @Body() createDto: CreateOptionDTO) {
    return this.optionService.create(questionId, createDto)
  }

  @Post('questions/:questionId/options/bulk')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(@Param('questionId', ParseIntPipe) questionId: number, @Body() bulkCreateDto: BulkCreateOptionsDTO) {
    return this.optionService.bulkCreate(questionId, bulkCreateDto)
  }

  @Get('questions/:questionId/options')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findByQuestion(@Param('questionId', ParseIntPipe) questionId: number, @Query() queryDto: QueryOptionDTO) {
    return this.optionService.findByQuestion(questionId, queryDto)
  }

  @Get('questions/:questionId/options/summary')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getQuestionOptionsSummary(@Param('questionId', ParseIntPipe) questionId: number) {
    return this.optionService.getQuestionOptions(questionId)
  }

  @Put('questions/:questionId/options/reorder')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async reorderOptions(@Param('questionId', ParseIntPipe) questionId: number, @Body() reorderDto: ReorderOptionsDTO) {
    return this.optionService.reorderOptions(questionId, reorderDto)
  }

  @Delete('questions/:questionId/options')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async deleteAllByQuestion(@Param('questionId', ParseIntPipe) questionId: number) {
    await this.optionService.deleteAllByQuestion(questionId)
    return { message: 'All options deleted successfully' }
  }

  @Get('options/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.optionService.findOne(id)
  }

  @Put('options/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateOptionDTO) {
    return this.optionService.update(id, updateDto)
  }

  @Delete('options/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.optionService.remove(id)
  }
}
