import { Module } from '@nestjs/common'
import { NotificationController } from './notification.controller'
import { NotificationService } from './notification.service'
import { NotificationRepository } from './notification.repo'
import { WebsocketsModule } from '../../websockets/websockets.module'
import { SharedModule } from '../../shared/shared.module'

@Module({
  imports: [WebsocketsModule, SharedModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository],
  exports: [NotificationService],
})
export class NotificationModule {}
