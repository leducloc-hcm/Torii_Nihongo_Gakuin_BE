import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'

@WebSocketGateway({
  namespace: 'notification',
})
export class NotificationGateway {
  @WebSocketServer()
  server: Server

  @SubscribeMessage('message')
  handleMessage(@MessageBody() message: string): string {
    return message
  }

  sendNotification(userId: number, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification)
  }
}
