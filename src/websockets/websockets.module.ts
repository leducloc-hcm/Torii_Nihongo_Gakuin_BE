import { Module } from '@nestjs/common'
import { NotificationGateway } from './notification.gateway'
import { WebRtcGateway } from './webrtc.gateway'
import { WebRtcService } from './webrtc.service'
import { JanusService } from './janus/janus.service'
import { JanusWebSocketManager } from './janus/janus-websocket.manager'
import { S3Service } from '../shared/services/s3.service'

@Module({
  providers: [NotificationGateway, WebRtcGateway, WebRtcService, JanusService, JanusWebSocketManager, S3Service],
  exports: [NotificationGateway, WebRtcGateway, WebRtcService],
})
export class WebsocketsModule {}
