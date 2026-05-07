import { Module } from '@nestjs/common'
import { SharedModule } from 'src/shared/shared.module'
import { LecturerDashboardController } from './lecturer-dashboard.controller'
import { LecturerDashboardService } from './lecturer-dashboard.service'
import { LecturerDashboardRepository } from './lecturer-dashboard.repo'

@Module({
  imports: [SharedModule],
  controllers: [LecturerDashboardController],
  providers: [LecturerDashboardService, LecturerDashboardRepository],
})
export class LecturerDashboardModule {}
