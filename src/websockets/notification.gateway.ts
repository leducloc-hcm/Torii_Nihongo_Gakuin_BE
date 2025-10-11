import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'

export interface ClassNotification {
  type:
    | 'class-started'
    | 'class-ended'
    | 'recording-started'
    | 'recording-stopped'
    | 'participant-joined'
    | 'participant-left'
    | 'hand-raised'
    | 'document-shared'
    | 'screen-share-started'
    | 'screen-share-ended'
    | 'chat-message'
    | 'general'
  classId?: string
  userId?: string
  displayName?: string
  message: string
  timestamp?: number
  data?: any
}

@WebSocketGateway({
  namespace: 'notification',
  cors: { origin: '*' },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(NotificationGateway.name)
  private readonly userSockets = new Map<string, string>() // userId -> socketId
  private readonly socketUsers = new Map<string, string>() // socketId -> userId

  handleConnection(client: Socket) {
    const { userId } = client.handshake.query
    const userIdStr = Array.isArray(userId) ? userId[0] : userId

    if (userIdStr) {
      this.userSockets.set(userIdStr, client.id)
      this.socketUsers.set(client.id, userIdStr)
      void client.join(`user_${userIdStr}`)
      this.logger.log(`User ${userIdStr} connected to notifications`)
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id)
    if (userId) {
      this.userSockets.delete(userId)
      this.socketUsers.delete(client.id)
      this.logger.log(`User ${userId} disconnected from notifications`)
    }
  }

  @SubscribeMessage('join-class-notifications')
  handleJoinClassNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { classId: string; userId: string },
  ) {
    void client.join(`class_${data.classId}`)
    this.logger.log(`User ${data.userId} joined notifications for class ${data.classId}`)
  }

  @SubscribeMessage('leave-class-notifications')
  handleLeaveClassNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { classId: string; userId: string },
  ) {
    void client.leave(`class_${data.classId}`)
    this.logger.log(`User ${data.userId} left notifications for class ${data.classId}`)
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() message: string): string {
    return message
  }

  // Send notification to specific user
  sendNotification(userId: string, notification: ClassNotification) {
    this.server.to(`user_${userId}`).emit('notification', {
      ...notification,
      timestamp: Date.now(),
    })
    this.logger.log(`Sent notification to user ${userId}: ${notification.type}`)
  }

  // Send notification to multiple users
  sendBulkNotifications(userIds: string[], notification: ClassNotification) {
    userIds.forEach((userId) => {
      this.sendNotification(userId, notification)
    })
  }

  // Send notification to all users in a class
  sendClassNotification(classId: string, notification: ClassNotification) {
    this.server.to(`class_${classId}`).emit('notification', {
      ...notification,
      classId,
      timestamp: Date.now(),
    })
    this.logger.log(`Sent class notification to class ${classId}: ${notification.type}`)
  }

  // Send notification to all connected users
  sendGlobalNotification(notification: ClassNotification) {
    this.server.emit('notification', {
      ...notification,
      timestamp: Date.now(),
    })
    this.logger.log(`Sent global notification: ${notification.type}`)
  }

  // WebRTC-specific notification methods
  notifyClassStarted(classId: string, teacherName: string, teacherId: string) {
    this.sendClassNotification(classId, {
      type: 'class-started',
      message: `Class started by ${teacherName}`,
      userId: teacherId,
      displayName: teacherName,
      data: { teacherId, teacherName },
    })
  }

  notifyClassEnded(classId: string, teacherName: string, teacherId: string, duration: number) {
    this.sendClassNotification(classId, {
      type: 'class-ended',
      message: `Class ended by ${teacherName}. Duration: ${Math.round(duration / 60000)} minutes`,
      userId: teacherId,
      displayName: teacherName,
      data: { teacherId, teacherName, duration },
    })
  }

  notifyRecordingStarted(classId: string, startedBy: string, recordingId: string) {
    this.sendClassNotification(classId, {
      type: 'recording-started',
      message: `Recording started by ${startedBy}`,
      displayName: startedBy,
      data: { recordingId, startedBy },
    })
  }

  notifyRecordingStopped(classId: string, stoppedBy: string, recordingId: string, s3Url?: string) {
    this.sendClassNotification(classId, {
      type: 'recording-stopped',
      message: `Recording stopped by ${stoppedBy}`,
      displayName: stoppedBy,
      data: { recordingId, stoppedBy, s3Url },
    })
  }

  notifyParticipantJoined(classId: string, userId: string, displayName: string, role: string) {
    this.sendClassNotification(classId, {
      type: 'participant-joined',
      message: `${displayName} (${role}) joined the class`,
      userId,
      displayName,
      data: { role },
    })
  }

  notifyParticipantLeft(classId: string, userId: string, displayName: string, role: string) {
    this.sendClassNotification(classId, {
      type: 'participant-left',
      message: `${displayName} (${role}) left the class`,
      userId,
      displayName,
      data: { role },
    })
  }

  notifyHandRaised(classId: string, userId: string, displayName: string, reason?: string) {
    this.sendClassNotification(classId, {
      type: 'hand-raised',
      message: `${displayName} raised their hand${reason ? `: ${reason}` : ''}`,
      userId,
      displayName,
      data: { reason },
    })
  }

  notifyDocumentShared(classId: string, sharedBy: string, documentName: string, documentUrl: string) {
    this.sendClassNotification(classId, {
      type: 'document-shared',
      message: `${sharedBy} shared a document: ${documentName}`,
      displayName: sharedBy,
      data: { documentName, documentUrl, sharedBy },
    })
  }

  notifyScreenShareStarted(classId: string, userId: string, displayName: string) {
    this.sendClassNotification(classId, {
      type: 'screen-share-started',
      message: `${displayName} started screen sharing`,
      userId,
      displayName,
    })
  }

  notifyScreenShareEnded(classId: string, userId: string, displayName: string) {
    this.sendClassNotification(classId, {
      type: 'screen-share-ended',
      message: `${displayName} stopped screen sharing`,
      userId,
      displayName,
    })
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.userSockets.size
  }

  // Get users in a specific class
  getClassParticipants(classId: string): string[] {
    const room = this.server.sockets.adapter.rooms.get(`class_${classId}`)
    return room ? Array.from(room) : []
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId)
  }
}
