import { Module } from '@nestjs/common'
import { NotificationGateway } from './notification.gateway'
import { JanusService } from './janus/janus.service'
import { JanusWebSocketManager } from './janus/janus-websocket.manager'
import { S3Service } from '../shared/services/s3.service'
import { WebRTCGateway } from './webrtc.gateway'

@Module({
  providers: [NotificationGateway, WebRTCGateway, JanusService, JanusWebSocketManager, S3Service],
  exports: [NotificationGateway, JanusService],
})
export class WebsocketsModule {}
