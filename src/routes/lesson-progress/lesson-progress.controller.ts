import { Controller, Get, Put, Body, Param, HttpCode, HttpStatus, UseGuards, ParseIntPipe } from '@nestjs/common'
import { LessonProgressService } from './lesson-progress.service'
import { UpdateProgressDTO } from './lesson-progress.dto'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@Controller('lesson-progress')
@UseGuards(RolesGuard)
export class LessonProgressController {
  constructor(private readonly progressService: LessonProgressService) {}

  @Put()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async updateProgress(@ActiveUser('userId') userId: number, @Body() updateProgressDto: UpdateProgressDTO) {
    return this.progressService.updateProgress(userId, updateProgressDto)
  }

  @Get('courses/:courseId')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getCourseProgress(@ActiveUser('userId') userId: number, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.progressService.getCourseProgress(userId, courseId)
  }

  @Get('courses/:courseId/details')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getCourseProgressDetails(
    @ActiveUser('userId') userId: number,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.progressService.getCourseProgressDetails(userId, courseId)
  }

  @Get('lessons/:lessonId')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getMyLessonProgress(@ActiveUser('userId') userId: number, @Param('lessonId', ParseIntPipe) lessonId: number) {
    return this.progressService.getMyProgress(userId, lessonId)
  }
}
