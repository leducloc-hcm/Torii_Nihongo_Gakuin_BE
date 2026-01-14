import { Module } from '@nestjs/common'
import { DashboardController, CustomerDashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { DashboardRepository } from './dashboard.repo'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [DashboardController, CustomerDashboardController],
  providers: [DashboardService, DashboardRepository],
  exports: [DashboardService],
})
export class DashboardModule {}
