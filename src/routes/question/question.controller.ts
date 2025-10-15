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
import { QuestionService } from './question.service'
import { CreateQuestionDTO, UpdateQuestionDTO, QueryQuestionDTO, BulkCreateQuestionsDTO } from './question.dto'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'
import { JLPTLevel, QuestionType, Difficulty } from '@prisma/client'

@Controller('questions')
@UseGuards(RolesGuard)
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateQuestionDTO) {
    return this.questionService.create(createDto)
  }

  @Post('bulk')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(@Body() bulkCreateDto: BulkCreateQuestionsDTO) {
    return this.questionService.bulkCreate(bulkCreateDto)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() queryDto: QueryQuestionDTO) {
    return this.questionService.findAll(queryDto)
  }

  @Get('statistics')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getStatistics() {
    return this.questionService.getStatistics()
  }

  @Get('type/:type')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findByType(@Param('type') type: QuestionType, @Query() queryDto: Omit<QueryQuestionDTO, 'type'>) {
    return this.questionService.findByType(type, queryDto)
  }

  @Get('level/:level')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findByLevel(@Param('level') level: JLPTLevel, @Query() queryDto: Omit<QueryQuestionDTO, 'level'>) {
    return this.questionService.findByLevel(level, queryDto)
  }

  @Get('difficulty/:difficulty')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findByDifficulty(
    @Param('difficulty') difficulty: Difficulty,
    @Query() queryDto: Omit<QueryQuestionDTO, 'difficulty'>,
  ) {
    return this.questionService.findByDifficulty(difficulty, queryDto)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.findOne(id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateQuestionDTO) {
    return this.questionService.update(id, updateDto)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.remove(id)
  }
}
