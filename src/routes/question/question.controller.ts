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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common'
import { QuestionService } from './question.service'
import {
  CreateQuestionDTO,
  UpdateQuestionDTO,
  QueryQuestionDTO,
  BulkCreateQuestionsDTO,
  CloneQuestionDTO,
} from './question.dto'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'
import type { JLPTLevelType, QuestionTypeType, DifficultyType } from 'src/shared/constants/enum.constant'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { imageUploadOptions, mediaUploadOptions } from 'src/shared/config/upload.config'

@Controller('questions')
@UseGuards(RolesGuard)
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
      ],
      mediaUploadOptions,
    ),
  )
  async create(
    @Body() createDto: CreateQuestionDTO,
    @UploadedFiles() files?: { image?: Express.Multer.File[]; audio?: Express.Multer.File[] },
  ) {
    return this.questionService.create(createDto, files)
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
  async findByType(@Param('type') type: QuestionTypeType, @Query() queryDto: Omit<QueryQuestionDTO, 'type'>) {
    return this.questionService.findByType(type, queryDto)
  }

  @Get('level/:level')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findByLevel(@Param('level') level: JLPTLevelType, @Query() queryDto: Omit<QueryQuestionDTO, 'level'>) {
    return this.questionService.findByLevel(level, queryDto)
  }

  @Get('difficulty/:difficulty')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findByDifficulty(
    @Param('difficulty') difficulty: DifficultyType,
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
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
      ],
      mediaUploadOptions,
    ),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateQuestionDTO,
    @UploadedFiles() files?: { image?: Express.Multer.File[]; audio?: Express.Multer.File[] },
  ) {
    return this.questionService.update(id, updateDto, files)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.questionService.remove(id)
    return { message: 'Question deleted successfully' }
  }

  @Post(':id/clone')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  async cloneQuestion(@Param('id', ParseIntPipe) id: number, @Body() cloneDto: CloneQuestionDTO) {
    return this.questionService.cloneQuestion(id, cloneDto)
  }

  @Get('uuid/:uuid/versions')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getVersions(@Param('uuid') uuid: string) {
    return this.questionService.getQuestionVersions(uuid)
  }

  @Get('uuid/:uuid/version/:version')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getVersion(@Param('uuid') uuid: string, @Param('version', ParseIntPipe) version: number) {
    return this.questionService.getQuestionByVersion(uuid, version)
  }

  @Get(':id/usage')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async checkUsage(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.checkQuestionUsage(id)
  }
}
