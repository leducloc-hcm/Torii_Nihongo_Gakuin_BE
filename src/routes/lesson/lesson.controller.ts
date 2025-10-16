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
  Patch,
} from '@nestjs/common'
import { LessonService } from './lesson.service'
import { CreateLessonDTO, UpdateLessonDTO, QueryLessonDTO } from './lesson.dto'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@Controller('lessons')
@UseGuards(RolesGuard)
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createLessonDto: CreateLessonDTO) {
    return this.lessonService.create(createLessonDto)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lessonService.findOne(id)
  }

  @Get(':lessonId/stream')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getStreamUrl(@ActiveUser('userId') userId: number, @Param('lessonId', ParseIntPipe) lessonId: number) {
    return this.lessonService.generateStreamUrl(lessonId, userId)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateLessonDto: UpdateLessonDTO) {
    return this.lessonService.update(id, updateLessonDto)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.lessonService.remove(id)
  }

  @Post('/upload/video')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async generateUploadUrl(
    @Body() body: { lessonId: number; filename: string; contentType: string },
    @ActiveUser('userId') userId: number,
  ) {
    return this.lessonService.generateUploadUrl(body, userId)
  }
  @Get('public/:lessonId/stream')
  @HttpCode(HttpStatus.OK)
  async getPublicStreamUrl(@Param('lessonId', ParseIntPipe) lessonId: number) {
    return this.lessonService.getPublicStreamUrl(lessonId)
  }
}
