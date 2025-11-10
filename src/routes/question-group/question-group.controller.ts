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
import { QuestionGroupService } from './question-group.service'
import {
  CreateQuestionGroupDTO,
  UpdateQuestionGroupDTO,
  QueryQuestionGroupDTO,
  BulkCreateQuestionGroupsDTO,
  AddQuestionsToGroupDTO,
  RemoveQuestionsFromGroupDTO,
  CloneQuestionGroupDTO,
} from './question-group.dto'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'
import { ApiTags } from '@nestjs/swagger'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { mediaUploadOptions } from 'src/shared/config/upload.config'

@ApiTags('Question Groups')
@Controller('question-groups')
@UseGuards(RolesGuard)
export class QuestionGroupController {
  constructor(private readonly questionGroupService: QuestionGroupService) {}

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
    @Body() createDto: CreateQuestionGroupDTO,
    @UploadedFiles() files?: { image?: Express.Multer.File[]; audio?: Express.Multer.File[] },
  ) {
    return this.questionGroupService.create(createDto, files)
  }

  @Post('bulk')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(@Body() bulkCreateDto: BulkCreateQuestionGroupsDTO) {
    return this.questionGroupService.bulkCreate(bulkCreateDto)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() queryDto: QueryQuestionGroupDTO) {
    return this.questionGroupService.findAll(queryDto)
  }

  @Get('statistics')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getStatistics() {
    return this.questionGroupService.getStatistics()
  }

  @Get('type/:type')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findByType(@Param('type') type: string, @Query() queryDto: Omit<QueryQuestionGroupDTO, 'type'>) {
    return this.questionGroupService.findByType(type, queryDto)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.questionGroupService.findOne(id)
  }

  @Get(':id/questions')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getGroupQuestions(@Param('id', ParseIntPipe) id: number) {
    return this.questionGroupService.getGroupQuestions(id)
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
    @Body() updateDto: UpdateQuestionGroupDTO,
    @UploadedFiles() files?: { image?: Express.Multer.File[]; audio?: Express.Multer.File[] },
  ) {
    return this.questionGroupService.update(id, updateDto, files)
  }

  @Post(':id/questions')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async addQuestionsToGroup(@Param('id', ParseIntPipe) id: number, @Body() addDto: AddQuestionsToGroupDTO) {
    return this.questionGroupService.addQuestionsToGroup(id, addDto)
  }

  @Delete(':id/questions')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async removeQuestionsFromGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() removeDto: RemoveQuestionsFromGroupDTO,
  ) {
    return this.questionGroupService.removeQuestionsFromGroup(id, removeDto)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.questionGroupService.remove(id)
    return { message: 'Question group deleted successfully' }
  }

  @Post(':id/clone')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  async cloneQuestionGroup(@Param('id', ParseIntPipe) id: number, @Body() cloneDto: CloneQuestionGroupDTO) {
    return this.questionGroupService.cloneQuestionGroup(id, cloneDto)
  }

  @Get('uuid/:uuid/versions')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getVersions(@Param('uuid') uuid: string) {
    return this.questionGroupService.getQuestionGroupVersions(uuid)
  }

  @Get('uuid/:uuid/version/:version')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getVersion(@Param('uuid') uuid: string, @Param('version', ParseIntPipe) version: number) {
    return this.questionGroupService.getQuestionGroupByVersion(uuid, version)
  }

  @Get(':id/usage')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async checkUsage(@Param('id', ParseIntPipe) id: number) {
    return this.questionGroupService.checkQuestionGroupUsage(id)
  }
}
