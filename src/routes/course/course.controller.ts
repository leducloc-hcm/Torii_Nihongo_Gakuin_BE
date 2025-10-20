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
  UploadedFile,
} from '@nestjs/common'
import { CourseService } from './course.service'
import {
  CreateCourseDTO,
  UpdateCourseDTO,
  QueryCourseDTO,
  CreateClassDTO,
  UpdateClassDTO,
  CreateSessionDTO,
} from './course.dto'
import { Auth, IsPublic } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'
import { FileInterceptor } from '@nestjs/platform-express'
import { imageUploadOptions } from 'src/shared/config/upload.config'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@Controller('courses')
@UseGuards(RolesGuard)
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('thumbnail', imageUploadOptions))
  async create(
    @ActiveUser('userId') userId: number,
    @Body() createCourseDto: CreateCourseDTO,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    return this.courseService.create(createCourseDto, userId, thumbnail)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() queryDto: QueryCourseDTO) {
    return this.courseService.findAll(queryDto)
  }

  @Get('public/all')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async findPublished(@Query() queryDto: Omit<QueryCourseDTO, 'status'>) {
    return this.courseService.getPublishedCourses(queryDto)
  }

  @Get('my-enrolled-courses')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getMyEnrolledCourses(
    @ActiveUser('userId') userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('expired') expired?: boolean,
    @Query('courseType') courseType?: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY',
    @Query('sortBy') sortBy?: 'createdAt' | 'expiresAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.courseService.getMyCourses(userId, {
      page,
      limit,
      expired,
      courseType,
      sortBy,
      sortOrder,
    })
  }

  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer, RoleName.Customer)
  async findBySlug(@Param('slug') slug: string, @Query('includeReviews') includeReviews?: boolean) {
    return this.courseService.findBySlug(slug, includeReviews)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('thumbnail', imageUploadOptions))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseDto: UpdateCourseDTO,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    return this.courseService.update(id, updateCourseDto, thumbnail)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.courseService.remove(id)
  }

  // Class management endpoints for live courses

  @Get(':courseId/classes/public')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async getPublicCourseClasses(@Param('courseId', ParseIntPipe) courseId: number) {
    return await this.courseService.getPublicCourseClasses(courseId)
  }

  @Get(':courseId/classes')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async getCourseClasses(@Param('courseId', ParseIntPipe) courseId: number) {
    return await this.courseService.getCourseClasses(courseId)
  }

  @Post(':courseId/classes')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.CREATED)
  async createCourseClass(
    @Param('courseId', ParseIntPipe) courseId: number,
    @ActiveUser('userId') userId: number,
    @Body() createClassDto: CreateClassDTO,
  ) {
    return await this.courseService.createCourseClass(courseId, createClassDto, userId)
  }

  @Put(':courseId/classes/:classId')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async updateCourseClass(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('classId', ParseIntPipe) classId: number,
    @Body() updateClassDto: UpdateClassDTO,
  ) {
    return await this.courseService.updateCourseClass(courseId, classId, updateClassDto)
  }

  @Delete(':courseId/classes/:classId')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async removeCourseClass(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    return await this.courseService.removeCourseClass(courseId, classId)
  }

  @Post(':courseId/classes/:classId/sessions')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.CREATED)
  async createClassSession(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('classId', ParseIntPipe) classId: number,
    @Body() createSessionDto: CreateSessionDTO,
  ) {
    return await this.courseService.createClassSession(courseId, classId, createSessionDto)
  }

  @Get(':courseId/classes/:classId/sessions')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer, RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getClassSessions(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    return await this.courseService.getClassSessions(courseId, classId)
  }
}
