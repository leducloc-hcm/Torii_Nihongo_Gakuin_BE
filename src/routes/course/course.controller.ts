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
import { CreateCourseDTO, UpdateCourseDTO, QueryCourseDTO } from './course.dto'
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

  //   @Get('my-courses')
  //   @Auth([AuthType.Bearer])
  //   @Roles(RoleName.Lecturer)
  //   @HttpCode(HttpStatus.OK)
  //   async findMyCourses(@ActiveUser('userId') userId: number) {
  //
  //   }

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
}
