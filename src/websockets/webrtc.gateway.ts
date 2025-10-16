import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'

type Role = 'lecturer' | 'customer'

interface ParticipantInfo {
  userId: string
  displayName: string
  role: Role
  avatar?: string
  capabilities: {
    canPublishVideo: boolean
    canPublishAudio: boolean
    canShareScreen: boolean
    canShareDocuments: boolean
    canRecord: boolean
    canControlParticipants: boolean
    canModerateChat: boolean
  }
  isPublishing?: boolean
  isSharingScreen?: boolean
  isHandRaised?: boolean
}

interface ChatMessage {
  id: string
  message: string
  type: 'public' | 'private'
  senderId: string
  senderName: string
  recipientId?: string
  timestamp: number
}

@WebSocketGateway({ namespace: 'webrtc', cors: { origin: '*' } })
export class WebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(WebRTCGateway.name)

  // In-memory participant tracking: classId -> (userId -> participant)
  private readonly classParticipants = new Map<string, Map<string, ParticipantInfo>>()
  // Socket mapping
  private readonly socketMeta = new Map<string, { classId: string; userId: string; displayName: string; role: Role }>()

  handleConnection(client: Socket) {
    const { classId, userId, role, displayName, avatar } = client.handshake.query as Record<string, string>

    if (!classId || !userId || !role || !displayName) {
      this.logger.warn('Missing connection params', { classId, userId, role, displayName })
      client.emit('error', { message: 'Invalid connection parameters' })
      client.disconnect()
      return
    }

    const roleSafe = (role === 'lecturer' ? 'lecturer' : 'customer') as Role
    this.socketMeta.set(client.id, { classId, userId, displayName, role: roleSafe })

    void client.join(`class_${classId}`)

    // Ensure class map
    if (!this.classParticipants.has(classId)) {
      this.classParticipants.set(classId, new Map<string, ParticipantInfo>())
    }
    const classMap = this.classParticipants.get(classId)!

    // Initialize participant with default capabilities (can refine with real ACL later)
    const participant: ParticipantInfo = {
      userId,
      displayName,
      role: roleSafe,
      avatar,
      capabilities: {
        canPublishVideo: true,
        canPublishAudio: true,
        canShareScreen: true,
        canShareDocuments: true,
        canRecord: roleSafe === 'lecturer',
        canControlParticipants: roleSafe === 'lecturer',
        canModerateChat: roleSafe === 'lecturer',
      },
      isPublishing: false,
      isSharingScreen: false,
      isHandRaised: false,
    }

    classMap.set(userId, participant)

    // Send joined payload to the new client
    client.emit('joined-class', {
      sessionId: client.id,
      handleId: 0,
      roomId: `class_${classId}`,
      role: roleSafe,
      capabilities: participant.capabilities,
      mediaSettings: {
        audio: { enabled: true, muted: false, volume: 1 },
        video: { enabled: true, quality: 'high', facingMode: 'user' },
        screenShare: { enabled: false, includeAudio: true },
      },
      participantCount: classMap.size,
      existingParticipants: Array.from(classMap.values()),
      janusJsep: undefined,
      janusUrl: '',
      iceServers: [],
      userId,
    })

    // Notify others
    client.to(`class_${classId}`).emit('user-joined', participant)

    this.logger.log(`Client connected to class ${classId}: ${displayName} (${userId})`)
  }

  handleDisconnect(client: Socket) {
    const meta = this.socketMeta.get(client.id)
    if (!meta) return
    const { classId, userId, displayName } = meta

    const classMap = this.classParticipants.get(classId)
    if (classMap) {
      classMap.delete(userId)
      if (classMap.size === 0) {
        this.classParticipants.delete(classId)
      }
    }

    client.to(`class_${classId}`).emit('user-left', { userId, displayName })

    this.socketMeta.delete(client.id)
    this.logger.log(`Client disconnected from class ${classId}: ${displayName} (${userId})`)
  }

  @SubscribeMessage('send-message')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { message: string; type?: 'public' | 'private'; recipientId?: string },
  ) {
    const meta = this.socketMeta.get(client.id)
    if (!meta) return
    const { classId, userId, displayName } = meta

    const msg: ChatMessage = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      message: payload.message,
      type: payload.recipientId ? 'private' : 'public',
      senderId: userId,
      senderName: displayName,
      recipientId: payload.recipientId,
      timestamp: Date.now(),
    }

    if (msg.type === 'private' && msg.recipientId) {
      // Emit only to sender and recipient in the class room
      this.server.to(`class_${classId}`).emit('chat-message', msg)
    } else {
      this.server.to(`class_${classId}`).emit('chat-message', msg)
    }
  }

  @SubscribeMessage('raise-hand')
  handleRaiseHand(@ConnectedSocket() client: Socket) {
    const meta = this.socketMeta.get(client.id)
    if (!meta) return
    const { classId, userId, displayName } = meta

    const classMap = this.classParticipants.get(classId)
    if (classMap && classMap.has(userId)) {
      const p = classMap.get(userId)!
      p.isHandRaised = true
      classMap.set(userId, p)
    }

    this.server.to(`class_${classId}`).emit('hand-raised', { userId, displayName })
  }

  @SubscribeMessage('lower-hand')
  handleLowerHand(@ConnectedSocket() client: Socket) {
    const meta = this.socketMeta.get(client.id)
    if (!meta) return
    const { classId, userId, displayName } = meta

    const classMap = this.classParticipants.get(classId)
    if (classMap && classMap.has(userId)) {
      const p = classMap.get(userId)!
      p.isHandRaised = false
      classMap.set(userId, p)
    }

    this.server.to(`class_${classId}`).emit('hand-lowered', { userId, displayName })
  }
}
