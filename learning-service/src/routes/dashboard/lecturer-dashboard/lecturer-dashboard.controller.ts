import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { RoleName } from 'src/shared/constants/role.constant'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { LecturerDashboardService } from './lecturer-dashboard.service'

@Controller('dashboard/lecturer')
@UseGuards(RolesGuard)
@Auth([AuthType.Bearer])
@Roles(RoleName.Lecturer)
export class LecturerDashboardController {
  constructor(
    private readonly lecturerDashboardService: LecturerDashboardService,
  ) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  async getOverview(@ActiveUser('userId') lecturerId: number) {
    return this.lecturerDashboardService.getOverview(lecturerId)
  }
}
