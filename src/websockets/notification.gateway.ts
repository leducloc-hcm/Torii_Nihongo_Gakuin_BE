import { MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets'
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway {}
