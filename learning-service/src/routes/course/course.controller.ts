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
import { CourseService } from './course.service'
import {
  CreateCourseDTO,
  UpdateCourseDTO,
  QueryCourseDTO,
  CreateClassDTO,
  UpdateClassDTO,
  CreateSessionDTO,
  UpdateCourseStatusDTOForAdmin,
} from './course.dto'
import { Auth, IsPublic } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { LessonProgressService } from '../lesson-progress/lesson-progress.service'
import { UpdateProgressDTO } from '../lesson-progress/lesson-progress.dto'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { imageUploadOptions } from 'src/shared/config/upload.config'

@Controller('courses')
@UseGuards(RolesGuard)
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly progressService: LessonProgressService,
  ) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'thumbnail', maxCount: 1 }], imageUploadOptions))
  async create(
    @ActiveUser('userId') userId: number,
    @Body() createCourseDto: CreateCourseDTO,
    @UploadedFiles() files?: { thumbnail?: Express.Multer.File[] },
  ) {
    return this.courseService.create(createCourseDto, userId, files)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() queryDto: QueryCourseDTO) {
    return this.courseService.findAll(queryDto)
  }

  @Get('admin/pending-review')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async findPendingReviewCourses() {
    return this.courseService.getPendingReviewCourses()
  }

  @Get('public/all')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async findPublished(@ActiveUser('userId') userId: number, @Query() queryDto: Omit<QueryCourseDTO, 'status'>) {
    return this.courseService.getPublishedCourses(queryDto, userId)
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
    return await this.courseService.getMyCourses(userId, {
      page,
      limit,
      expired,
      courseType,
      sortBy,
      sortOrder,
    })
  }
  @Get('my-enrolled-courses/:courseId')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getMyEnrolledCourseDetail(
    @ActiveUser('userId') userId: number,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return await this.courseService.getMyCourseDetail(userId, courseId)
  }

  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer, RoleName.Customer)
  async findBySlug(@Param('slug') slug: string, @Query('includeReviews') includeReviews?: boolean) {
    return this.courseService.findBySlug(slug, includeReviews)
  }

  @Put('pending-review/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async pendingReview(@Param('id', ParseIntPipe) id: number) {
    return this.courseService.pendingReview(id)
  }

  @Put('admin/publish/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id', ParseIntPipe) id: number) {
    return this.courseService.publish(id)
  }
  @Put('admin/status/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async updateCourseStatus(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCourseStatusDTOForAdmin) {
    return this.courseService.updateCourseStatus(id, body)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'thumbnail', maxCount: 1 }], imageUploadOptions))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseDto: UpdateCourseDTO,
    @UploadedFiles() files?: { thumbnail?: Express.Multer.File[] },
  ) {
    return this.courseService.update(id, updateCourseDto, files)
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

  // Learning Progress Routes
  @Get(':courseId/progress')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getCourseProgress(@ActiveUser('userId') userId: number, @Param('courseId', ParseIntPipe) courseId: number) {
    return await this.progressService.getCourseProgress(userId, courseId)
  }

  @Get(':courseId/progress-details')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getCourseProgressDetails(
    @ActiveUser('userId') userId: number,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return await this.progressService.getCourseProgressDetails(userId, courseId)
  }

  @Put(':courseId/progress')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async updateProgress(
    @ActiveUser('userId') userId: number,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() updateProgressDto: UpdateProgressDTO,
  ) {
    return await this.progressService.updateProgress(userId, updateProgressDto)
  }
}
