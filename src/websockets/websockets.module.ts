import { Module } from '@nestjs/common'
import { NotificationGateway } from './notification.gateway'
import { WebRtcGateway } from './webrtc.gateway'
import { WebRtcService } from './webrtc.service'
import { JanusService } from './janus/janus.service'
import { JanusWebSocketManager } from './janus/janus-websocket.manager'
import { OnlineClassManagementService } from './online-class-management.service'
import { S3Service } from '../shared/services/s3.service'

@Module({
  providers: [
    NotificationGateway,
    WebRtcGateway,
    WebRtcService,
    JanusService,
    JanusWebSocketManager,
    OnlineClassManagementService,
    S3Service,
  ],
  exports: [NotificationGateway, WebRtcGateway, WebRtcService, JanusService, OnlineClassManagementService],
})
export class WebsocketsModule {}
