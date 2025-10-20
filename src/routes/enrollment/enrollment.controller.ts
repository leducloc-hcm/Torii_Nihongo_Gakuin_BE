import { Controller, Get, Param, Query, HttpCode, HttpStatus, UseGuards, ParseIntPipe } from '@nestjs/common'
import { EnrollmentService } from './enrollment.service'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@Controller('enrollments')
@UseGuards(RolesGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('my-enrollments')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async findMyEnrollments(
    @ActiveUser('userId') userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('expired') expired?: boolean,
    @Query('courseType') courseType?: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY',
    @Query('sortBy') sortBy?: 'createdAt' | 'expiresAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.enrollmentService.findMyEnrollments(userId, {
      page,
      limit,
      expired,
      courseType,
      sortBy,
      sortOrder,
    })
  }

  @Get('my-stats')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getMyEnrollmentStats(@ActiveUser('userId') userId: number) {
    return this.enrollmentService.getUserEnrollmentStats(userId)
  }

  @Get('expired')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getExpiredEnrollments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: 'createdAt' | 'expiresAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.enrollmentService.getExpiredEnrollments({
      page,
      limit,
      sortBy,
      sortOrder,
    })
  }

  @Get('active')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getActiveEnrollments(
    @Query('userId') userId?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: 'createdAt' | 'expiresAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.enrollmentService.getActiveEnrollments(userId, {
      page,
      limit,
      sortBy,
      sortOrder,
    })
  }
  @Get(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentService.findOne(id)
  }
}
