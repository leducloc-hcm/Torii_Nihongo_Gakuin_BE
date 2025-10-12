import { Module } from '@nestjs/common'
import { OnlineClassController } from './online-class.controller'
import { OnlineClassService } from './online-class.service'
import { WebsocketsModule } from '../../websockets/websockets.module'
import { SharedModule } from '../../shared/shared.module'
import { NotificationModule } from '../notification/notification.module'

@Module({
  imports: [WebsocketsModule, SharedModule, NotificationModule],
  controllers: [OnlineClassController],
  providers: [OnlineClassService],
  exports: [OnlineClassService],
})
export class OnlineClassModule {}
