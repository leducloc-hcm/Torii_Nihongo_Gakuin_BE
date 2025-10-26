import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { QuizItemService } from './quiz-item.service'
import {
  CreateQuizItemDto,
  UpdateQuizItemDto,
  QuizItemQueryDto,
  BulkAddQuestionsDto,
  ReorderQuizItemsDto,
} from './quiz-item.dto'
import { Auth } from '../../shared/decorators/auth.decorator'
import { ActiveUser } from '../../shared/decorators/active-user.decorator'
import { Roles } from '../../shared/decorators/roles.decorator'
import { AuthType } from '../../shared/constants/auth.constant'
import { Role } from '@prisma/client'

@ApiTags('Quiz Items')
@Controller('quiz-items')
export class QuizItemController {
  constructor(private readonly quizItemService: QuizItemService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.ADMIN)
  async createQuizItem(@ActiveUser('userId') userId: number, @Body() dto: CreateQuizItemDto) {
    return await this.quizItemService.createQuizItem(userId, dto)
  }

  @Get()
  async getQuizItems(@Query() query: QuizItemQueryDto) {
    return await this.quizItemService.getQuizItems(query)
  }

  @Get(':id')
  async getQuizItemById(@Param('id', ParseIntPipe) id: number) {
    return await this.quizItemService.getQuizItemById(id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.ADMIN)
  async updateQuizItem(
    @ActiveUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuizItemDto,
  ) {
    return await this.quizItemService.updateQuizItem(userId, id, dto)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.ADMIN)
  async deleteQuizItem(@ActiveUser('userId') userId: number, @Param('id', ParseIntPipe) id: number) {
    return await this.quizItemService.deleteQuizItem(userId, id)
  }

  @Post('quiz/:quizId/bulk-add')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Bulk add questions to quiz' })
  @ApiResponse({ status: 201, description: 'Questions added successfully' })
  async bulkAddQuestions(
    @ActiveUser('userId') userId: number,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: BulkAddQuestionsDto,
  ) {
    return await this.quizItemService.bulkAddQuestions(userId, quizId, dto.questionIds)
  }

  @Post('quiz/:quizId/reorder')
  @Auth([AuthType.Bearer])
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Reorder quiz items' })
  @ApiResponse({ status: 200, description: 'Quiz items reordered successfully' })
  async reorderQuizItems(
    @ActiveUser('userId') userId: number,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: ReorderQuizItemsDto,
  ) {
    await this.quizItemService.reorderQuizItems(userId, quizId, dto.items)
    return { message: 'Quiz items reordered successfully' }
  }
}
