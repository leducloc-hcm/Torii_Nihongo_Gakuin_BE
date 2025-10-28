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
    | 'hand-raised'
    | 'screen-share-started'
    | 'screen-share-ended'
    | 'chat-message'
    | 'payment:success'
    | 'payment:failed'
    | 'payment:pending'
    | 'notification:new' // ✅ Changed from 'enrollment:created' to match frontend
  classId?: string
  userId?: string
  displayName?: string
  message: string
  timestamp?: number
  data?: any
}

export interface PaymentNotificationData {
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED'
  orderId: number
  amount: number
  qrUrl?: string
  transactionId?: string
  courseIds?: number[]
  errorMessage?: string
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

  sendPaymentNotification(userId: string, notification: PaymentNotificationData) {
    this.server.to(`user_${userId}`).emit('payment-notification', {
      ...notification,
      timestamp: Date.now(),
    })
    this.logger.log(`Sent payment notification to user ${userId}: ${notification.paymentStatus}`)
  }

  // Send notification to all connected users
  sendGlobalNotification(notification: ClassNotification) {
    this.server.emit('notification', {
      ...notification,
      timestamp: Date.now(),
    })
    this.logger.log(`Sent global notification: ${notification.type}`)
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

  notifyPaymentPending(
    userId: number,
    paymentData: {
      orderId: number
      amount: number
      qrUrl?: string
      message?: string
    },
  ) {
    this.sendNotification(userId.toString(), {
      type: 'payment:pending',
      message: paymentData.message || 'Đang chờ thanh toán. Vui lòng quét mã QR để hoàn tất.',
      data: {
        paymentStatus: 'PENDING',
        ...paymentData,
      },
    })
    this.logger.log(`Sent payment pending notification to user ${userId}`)
  }

  notifyPaymentSuccess(
    userId: number,
    paymentData: {
      orderId: number
      transactionId?: string
      amount: number
      courseIds?: number[]
      message?: string
    },
  ) {
    this.sendPaymentNotification(userId.toString(), {
      paymentStatus: 'SUCCESS',
      ...paymentData,
    })
    this.sendNotification(userId.toString(), {
      type: 'payment:success',
      message: paymentData.message || 'Thanh toán thành công. Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!',
      data: {
        paymentStatus: 'SUCCESS',
        ...paymentData,
      },
    })
  }

  notifyPaymentFailed(
    userId: number,
    paymentData: {
      orderId: number
      amount: number
      errorMessage?: string
      message?: string
    },
  ) {
    this.sendPaymentNotification(userId.toString(), {
      paymentStatus: 'FAILED',
      ...paymentData,
    })
    this.sendNotification(userId.toString(), {
      type: 'payment:failed',
      message: paymentData.message || 'Thanh toán không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ.',
      data: {
        paymentStatus: 'FAILED',
        ...paymentData,
      },
    })
  }

  notifyEnrollmentCreated(
    userId: number,
    enrollmentData: {
      courseId: number
      courseTitle: string
      courseThumbnail?: string
      expiresAt?: Date
    },
  ) {
    this.sendNotification(userId.toString(), {
      type: 'notification:new', // ✅ Changed to match frontend listener
      message: `Bạn đã được ghi danh vào khóa học: ${enrollmentData.courseTitle}`,
      data: {
        notificationType: 'ENROLLMENT_CREATED',
        ...enrollmentData,
      },
    })
    this.logger.log(`Sent enrollment notification to user ${userId}, course ${enrollmentData.courseId}`)
  }
}
