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
} from '@nestjs/common'
import { OptionService } from './option.service'
import { CreateOptionDTO, UpdateOptionDTO, QueryOptionDTO, BulkCreateOptionsDTO, ReorderOptionsDTO } from './option.dto'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Question Options')
@Controller()
@UseGuards(RolesGuard)
export class OptionController {
  constructor(private readonly optionService: OptionService) {}

  // Add option to a question
  @Post('questions/:questionId/options')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  async create(@Param('questionId', ParseIntPipe) questionId: number, @Body() createDto: CreateOptionDTO) {
    return this.optionService.create(questionId, createDto)
  }

  // Bulk create options for a question
  @Post('questions/:questionId/options/bulk')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(@Param('questionId', ParseIntPipe) questionId: number, @Body() bulkCreateDto: BulkCreateOptionsDTO) {
    return this.optionService.bulkCreate(questionId, bulkCreateDto)
  }

  // Get all options for a question
  @Get('questions/:questionId/options')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findByQuestion(@Param('questionId', ParseIntPipe) questionId: number, @Query() queryDto: QueryOptionDTO) {
    return this.optionService.findByQuestion(questionId, queryDto)
  }

  // Get question options summary
  @Get('questions/:questionId/options/summary')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getQuestionOptionsSummary(@Param('questionId', ParseIntPipe) questionId: number) {
    return this.optionService.getQuestionOptions(questionId)
  }

  // Reorder options for a question
  @Put('questions/:questionId/options/reorder')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async reorderOptions(@Param('questionId', ParseIntPipe) questionId: number, @Body() reorderDto: ReorderOptionsDTO) {
    return this.optionService.reorderOptions(questionId, reorderDto)
  }

  // Delete all options for a question (dangerous operation)
  @Delete('questions/:questionId/options')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async deleteAllByQuestion(@Param('questionId', ParseIntPipe) questionId: number) {
    await this.optionService.deleteAllByQuestion(questionId)
    return { message: 'All options deleted successfully' }
  }

  // Get specific option
  @Get('options/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.optionService.findOne(id)
  }

  // Update specific option
  @Put('options/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateOptionDTO) {
    return this.optionService.update(id, updateDto)
  }

  // Delete specific option
  @Delete('options/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.optionService.remove(id)
  }
}
