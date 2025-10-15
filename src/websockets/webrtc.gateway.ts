import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, UseGuards, Injectable } from '@nestjs/common'
import { JanusService } from './janus/janus.service'
import { WebRtcOfferDto } from './dto/webrtc-offer.dto'
import { WebRtcAnswerDto, IceCandidateDto } from './dto/webrtc-answer.dto'
import { ChatMessageDto, ChatMessageResponseDto } from './dto/chat-message.dto'
import {
  DocumentShareDto,
  ScreenShareDto,
  RecordingControlDto,
  RaiseHandDto,
  ParticipantControlDto,
} from './dto/class-features.dto'
import { JoinClassDto, MediaSettingsDto, ClassCapabilityDto } from './dto/class-control.dto'
import { WebRtcService } from './webrtc.service'
import { S3Service } from '../shared/services/s3.service'
import { NotificationGateway } from './notification.gateway'

interface ParticipantSession {
  sessionId: number
  handleId: number
  screenShareHandleId?: number
  roomId: number
  role: 'lecturer' | 'customer'
  classId: string
  userId: string
  displayName: string
  avatar?: string
  isPublishing: boolean
  isSharingScreen: boolean
  isHandRaised: boolean
  handRaisedAt?: Date
  capabilities: ClassCapabilityDto
  mediaSettings: MediaSettingsDto
  joinTime: Date
}

interface ChatMessage {
  id: string
  message: string
  type: 'public' | 'private'
  senderId: string
  senderName: string
  recipientId?: string
  timestamp: number
  attachments?: Array<{
    type: 'file' | 'image' | 'document'
    url: string
    filename: string
    size: number
  }>
}

interface ClassRecording {
  recordingId: string
  filename: string
  startTime: Date
  endTime?: Date
  status: 'recording' | 'paused' | 'stopped'
  s3Url?: string
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/webrtc',
  transports: ['websocket', 'polling'],
})
export class WebRtcGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(WebRtcGateway.name)
  private readonly activeSessions = new Map<string, ParticipantSession>()
  private readonly classParticipants = new Map<string, Set<string>>() // classId -> Set<connectionId>
  private readonly socketInstances = new Map<string, Socket>() // socketId -> Socket instance
  private readonly chatHistory = new Map<string, ChatMessage[]>() // classId -> messages
  private readonly raisedHands = new Map<string, Map<string, Date>>() // classId -> userId -> timestamp
  private readonly recordings = new Map<string, ClassRecording>() // classId -> recording info
  private readonly maxParticipantsPerClass = 50
  private readonly maxChatHistoryPerClass = 1000

  constructor(
    private readonly janusService: JanusService,
    private readonly webRtcService: WebRtcService,
    private readonly s3Service: S3Service,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async handleConnection(client: Socket) {
    const { userId, classId, role, displayName, token, avatar } = client.handshake.query

    // Store socket instance for easy access
    this.socketInstances.set(client.id, client)

    // Validate connection parameters and ensure they are strings
    const userIdStr = Array.isArray(userId) ? userId[0] : userId
    const classIdStr = Array.isArray(classId) ? classId[0] : classId
    const roleStr = Array.isArray(role) ? role[0] : role
    const displayNameStr = Array.isArray(displayName) ? displayName[0] : displayName

    if (!userIdStr || !classIdStr || !roleStr || !displayNameStr) {
      this.logger.warn(`Invalid connection parameters from ${client.id}`)
      client.emit('error', { message: 'Invalid connection parameters' })
      this.socketInstances.delete(client.id)
      client.disconnect()
      return
    }

    // Check class capacity
    const currentParticipants = this.classParticipants.get(classIdStr)?.size || 0
    if (currentParticipants >= this.maxParticipantsPerClass) {
      client.emit('error', { message: 'Class is full. Maximum 50 participants allowed.' })
      client.disconnect()
      return
    }

    // Add to class participants tracking
    if (!this.classParticipants.has(classIdStr)) {
      this.classParticipants.set(classIdStr, new Set())
    }
    this.classParticipants.get(classIdStr)!.add(client.id)

    // Initialize chat history for new classes
    if (!this.chatHistory.has(classIdStr)) {
      this.chatHistory.set(classIdStr, [])
    }

    // Initialize raised hands tracking
    if (!this.raisedHands.has(classIdStr)) {
      this.raisedHands.set(classIdStr, new Map())
    }

    this.logger.log(`User ${userIdStr} connected to class ${classIdStr} as ${roleStr} (socket: ${client.id})`)
    await client.join(classIdStr)

    // Send current class state to new participant
    this.sendClassState(client, classIdStr)

    // Emit participant count update
    this.updateParticipantCount(classIdStr)

    // Debug: Log current socket instances
    this.logger.debug(
      `Total socket instances: ${this.socketInstances.size}, Class ${classIdStr} participants: ${this.classParticipants.get(classIdStr)?.size || 0}`,
    )
  }

  handleDisconnect(client: Socket) {
    const session = this.activeSessions.get(client.id)

    // Remove socket instance
    this.socketInstances.delete(client.id)

    if (session) {
      this.activeSessions.delete(client.id)

      // Remove from class participants
      const participants = this.classParticipants.get(session.classId)
      if (participants) {
        participants.delete(client.id)
        if (participants.size === 0) {
          this.classParticipants.delete(session.classId)
          // Clean up class data when last participant leaves
          this.cleanupClassData(session.classId)
        } else {
          this.updateParticipantCount(session.classId)
        }
      }

      // Remove raised hand if active
      const raisedHands = this.raisedHands.get(session.classId)
      if (raisedHands && raisedHands.has(session.userId)) {
        raisedHands.delete(session.userId)
        this.updateRaisedHandsList(session.classId)
      }

      // Notify other participants about disconnection
      client.to(session.classId).emit('user-left', {
        userId: session.userId,
        displayName: session.displayName,
        role: session.role,
      })

      // Send notification
      this.notificationGateway.notifyParticipantLeft(session.classId, session.userId, session.displayName, session.role)

      this.logger.log(`User ${session.userId} disconnected from class ${session.classId}`)
    }
  }

  @SubscribeMessage('join-class')
  async handleJoinClass(@ConnectedSocket() client: Socket, @MessageBody() data: JoinClassDto) {
    try {
      // Set default capabilities based on role
      const capabilities = this.getDefaultCapabilities(data.role)
      const mediaSettings: MediaSettingsDto = {
        audio: { enabled: true, muted: false, volume: 100 },
        video: { enabled: data.role === 'lecturer', quality: 'medium', facingMode: 'user' },
        screenShare: { enabled: false, includeAudio: false },
      }

      const session: ParticipantSession = {
        sessionId: Date.now(), // Simple session ID for peer-to-peer
        handleId: Date.now() + Math.random(),
        roomId: parseInt(data.classId),
        role: data.role,
        classId: data.classId,
        userId: data.userId,
        displayName: data.displayName,
        avatar: data.avatar,
        isPublishing: false,
        isSharingScreen: false,
        isHandRaised: false,
        capabilities,
        mediaSettings,
        joinTime: new Date(),
      }

      // Store session
      this.activeSessions.set(client.id, session)

      // Actually join the Janus room
      const isPublisher = data.role === 'lecturer'
      this.logger.log(
        `Joining Janus room ${session.roomId} as ${isPublisher ? 'publisher' : 'subscriber'} for user ${data.userId}`,
      )

      const janusJoinResult = await this.janusService.createOrJoinRoom(
        session.sessionId,
        session.handleId,
        session.roomId,
        data.displayName,
        isPublisher,
      )

      if (!janusJoinResult.success) {
        this.logger.error(`Failed to join Janus room for user ${data.userId}`)
        client.emit('error', { message: 'Failed to join Janus room' })
        this.activeSessions.delete(client.id)
        return
      }

      this.logger.log(`Successfully joined Janus room ${session.roomId} for user ${data.userId}`)

      // Get existing participants
      const existingParticipants = Array.from(this.activeSessions.values())
        .filter((s) => s.classId === data.classId && s.userId !== data.userId)
        .map((s) => ({
          userId: s.userId,
          displayName: s.displayName,
          role: s.role,
          avatar: s.avatar,
        }))

      // Prepare Janus connection details
      const janusUrl = process.env.JANUS_SERVER_URL || 'wss://janus.torii-nihongo-gakuin.io.vn/ws'
      const iceServers = [
        { urls: process.env.JANUS_STUN_URL || 'stun:janus.torii-nihongo-gakuin.io.vn:3478' },
        // Add TURN servers from environment if configured
        ...(process.env.JANUS_TURN_URL
          ? [
              {
                urls: process.env.JANUS_TURN_URL || 'turn:janus.torii-nihongo-gakuin.io.vn:3478',
                username: process.env.JANUS_TURN_USERNAME || 'turnuser',
                credential: process.env.JANUS_TURN_PASSWORD || 'turnpassword',
              },
            ]
          : []),
      ]

      // Notify successful join with existing participants and Janus config
      client.emit('joined-class', {
        sessionId: session.sessionId,
        handleId: session.handleId,
        roomId: session.roomId,
        role: data.role,
        capabilities,
        mediaSettings,
        participantCount: this.classParticipants.get(data.classId)?.size || 0,
        existingParticipants,
        janusJsep: janusJoinResult.jsep, // Include Janus JSEP if available
        // Add Janus connection details for frontend
        janusUrl,
        iceServers,
        userId: data.userId,
      })

      // Notify other participants that someone joined
      client.to(data.classId).emit('user-joined', {
        userId: data.userId,
        displayName: data.displayName,
        role: data.role,
        avatar: data.avatar,
        capabilities,
      })

      // Send notification
      this.notificationGateway.notifyParticipantJoined(data.classId, data.userId, data.displayName, data.role)
    } catch (error) {
      this.logger.error('Error joining class:', error)
      client.emit('error', { message: 'Failed to join class' })
    }
  }

  @SubscribeMessage('get-participants')
  handleGetParticipants(@ConnectedSocket() client: Socket, @MessageBody() data: { classId: string }) {
    try {
      const existingParticipants = Array.from(this.activeSessions.values())
        .filter((s) => s.classId === data.classId)
        .map((s) => ({
          userId: s.userId,
          displayName: s.displayName,
          role: s.role,
          avatar: s.avatar,
        }))

      client.emit('participants-list', {
        participants: existingParticipants,
      })
    } catch (error) {
      this.logger.error('Error getting participants:', error)
      client.emit('error', { message: 'Failed to get participants' })
    }
  }

  // New WebRTC peer-to-peer signaling events
  @SubscribeMessage('webrtc-offer')
  handleWebRTCOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { classId: string; targetUserId: string; offer: RTCSessionDescription },
  ) {
    try {
      const session = this.activeSessions.get(client.id)
      if (!session) {
        this.logger.warn(`WebRTC offer: Session not found for client ${client.id}`)
        client.emit('error', { message: 'Session not found' })
        return
      }

      this.logger.log(`WebRTC offer from ${session.userId} to ${data.targetUserId} in class ${data.classId}`)

      // Forward offer to target user
      const targetSocket = this.findSocketByUserId(data.targetUserId, data.classId)
      if (targetSocket) {
        targetSocket.emit('webrtc-offer', {
          userId: session.userId,
          offer: data.offer,
        })
        this.logger.log(`WebRTC offer forwarded successfully to ${data.targetUserId}`)
      } else {
        this.logger.warn(`Target socket not found for user ${data.targetUserId} in class ${data.classId}`)
        client.emit('error', { message: 'Target user not found' })
      }
    } catch (error) {
      this.logger.error('Error handling WebRTC offer:', error)
      client.emit('error', { message: 'Failed to process WebRTC offer' })
    }
  }

  @SubscribeMessage('webrtc-answer')
  handleWebRTCAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { classId: string; targetUserId: string; answer: RTCSessionDescription },
  ) {
    try {
      const session = this.activeSessions.get(client.id)
      if (!session) {
        this.logger.warn(`WebRTC answer: Session not found for client ${client.id}`)
        client.emit('error', { message: 'Session not found' })
        return
      }

      this.logger.log(`WebRTC answer from ${session.userId} to ${data.targetUserId} in class ${data.classId}`)

      // Forward answer to target user
      const targetSocket = this.findSocketByUserId(data.targetUserId, data.classId)
      if (targetSocket) {
        targetSocket.emit('webrtc-answer', {
          userId: session.userId,
          answer: data.answer,
        })
        this.logger.log(`WebRTC answer forwarded successfully to ${data.targetUserId}`)
      } else {
        this.logger.warn(`Target socket not found for user ${data.targetUserId} in class ${data.classId}`)
        client.emit('error', { message: 'Target user not found' })
      }
    } catch (error) {
      this.logger.error('Error handling WebRTC answer:', error)
      client.emit('error', { message: 'Failed to process WebRTC answer' })
    }
  }

  @SubscribeMessage('webrtc-ice-candidate')
  handleWebRTCIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { classId: string; targetUserId: string; candidate: RTCIceCandidate },
  ) {
    try {
      const session = this.activeSessions.get(client.id)
      if (!session) {
        this.logger.warn(`WebRTC ICE candidate: Session not found for client ${client.id}`)
        client.emit('error', { message: 'Session not found' })
        return
      }

      // Forward ICE candidate to target user
      const targetSocket = this.findSocketByUserId(data.targetUserId, data.classId)
      if (targetSocket) {
        targetSocket.emit('webrtc-ice-candidate', {
          userId: session.userId,
          candidate: data.candidate,
        })
      } else {
        this.logger.warn(
          `Target socket not found for ICE candidate to user ${data.targetUserId} in class ${data.classId}`,
        )
      }
    } catch (error) {
      this.logger.error('Error handling WebRTC ICE candidate:', error)
      client.emit('error', { message: 'Failed to process ICE candidate' })
    }
  }

  @SubscribeMessage('media-state-change')
  handleMediaStateChange(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { classId: string; userId: string; mediaState: { audio: boolean; video: boolean; screenShare: boolean } },
  ) {
    const session = this.activeSessions.get(client.id)
    if (!session) {
      client.emit('error', { message: 'Session not found' })
      return
    }

    // Update session media settings
    session.mediaSettings.audio.enabled = data.mediaState.audio
    session.mediaSettings.video.enabled = data.mediaState.video
    session.isSharingScreen = data.mediaState.screenShare

    // Broadcast media state change to other participants
    client.to(data.classId).emit('participant-media-state-changed', {
      userId: session.userId,
      mediaState: data.mediaState,
    })
  }

  @SubscribeMessage('publish-offer')
  async handlePublishOffer(@ConnectedSocket() client: Socket, @MessageBody() data: WebRtcOfferDto) {
    const session = this.activeSessions.get(client.id)
    if (!session || !session.capabilities.canPublishVideo) {
      client.emit('error', { message: 'Unauthorized to publish' })
      return
    }

    try {
      const response = await this.janusService.publishStream(
        session.sessionId,
        session.handleId,
        data.sdp,
        data.audio,
        data.video,
        data.data,
      )

      if (response.success && response.jsep) {
        session.isPublishing = true

        client.emit('publish-answer', {
          type: 'answer',
          sdp: response.jsep.sdp,
        })

        // Notify other participants
        client.to(session.classId).emit('participant-started-publishing', {
          userId: session.userId,
          displayName: session.displayName,
          role: session.role,
          mediaType: data.video ? 'video' : 'audio',
        })
      } else {
        client.emit('error', { message: 'Failed to start publishing' })
      }
    } catch (error) {
      this.logger.error('Error handling publish offer:', error)
      client.emit('error', { message: 'Failed to process publish request' })
    }
  }

  @SubscribeMessage('subscribe-answer')
  async handleSubscribeAnswer(@ConnectedSocket() client: Socket, @MessageBody() data: WebRtcAnswerDto) {
    const session = this.activeSessions.get(client.id)
    if (!session) {
      client.emit('error', { message: 'Session not found' })
      return
    }

    try {
      const success = await this.janusService.startSubscription(session.sessionId, session.handleId, data.sdp)

      if (success) {
        client.emit('subscription-started')
      } else {
        client.emit('error', { message: 'Failed to start subscription' })
      }
    } catch (error) {
      this.logger.error('Error handling subscribe answer:', error)
      client.emit('error', { message: 'Failed to process subscribe request' })
    }
  }

  @SubscribeMessage('ice-candidate')
  async handleIceCandidate(@ConnectedSocket() client: Socket, @MessageBody() data: IceCandidateDto) {
    const session = this.activeSessions.get(client.id)
    if (!session) {
      return
    }

    try {
      await this.janusService.trickleCandidate(
        session.sessionId,
        session.handleId,
        data.candidate,
        data.sdpMid,
        data.sdpMLineIndex,
      )
    } catch (error) {
      this.logger.error('Error handling ICE candidate:', error)
    }
  }

  @SubscribeMessage('chat-message')
  handleChatMessage(@ConnectedSocket() client: Socket, @MessageBody() data: ChatMessageDto) {
    const session = this.activeSessions.get(client.id)
    if (!session) {
      client.emit('error', { message: 'Session not found' })
      return
    }

    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const chatMessage: ChatMessage = {
        id: messageId,
        message: data.message,
        type: data.type,
        senderId: session.userId,
        senderName: session.displayName,
        recipientId: data.recipientId,
        timestamp: Date.now(),
        attachments: data.attachments,
      }

      // Store message in history
      const history = this.chatHistory.get(session.classId) || []
      history.push(chatMessage)

      // Limit chat history
      if (history.length > this.maxChatHistoryPerClass) {
        history.splice(0, history.length - this.maxChatHistoryPerClass)
      }

      this.chatHistory.set(session.classId, history)

      // Send message to appropriate recipients
      if (data.type === 'public') {
        // Send to all participants in the class
        this.server.to(session.classId).emit('chat-message-received', chatMessage)
      } else if (data.type === 'private' && data.recipientId) {
        // Send to specific recipient
        const recipientSocket = this.findSocketByUserId(data.recipientId, session.classId)
        if (recipientSocket) {
          recipientSocket.emit('chat-message-received', chatMessage)
        }
        // Also send back to sender for confirmation
        client.emit('chat-message-received', chatMessage)
      }
    } catch (error) {
      this.logger.error('Error handling chat message:', error)
      client.emit('error', { message: 'Failed to send message' })
    }
  }

  @SubscribeMessage('share-document')
  handleDocumentShare(@ConnectedSocket() client: Socket, @MessageBody() data: DocumentShareDto) {
    const session = this.activeSessions.get(client.id)
    if (!session || !session.capabilities.canShareDocuments) {
      client.emit('error', { message: 'Unauthorized to share documents' })
      return
    }

    try {
      // Notify all participants about document sharing
      client.to(session.classId).emit('document-shared', {
        sharedBy: {
          userId: session.userId,
          displayName: session.displayName,
          role: session.role,
        },
        document: data,
      })

      client.emit('document-share-success', { documentUrl: data.documentUrl })
      this.logger.log(`Document shared in class ${session.classId} by ${session.userId}`)
    } catch (error) {
      this.logger.error('Error sharing document:', error)
      client.emit('error', { message: 'Failed to share document' })
    }
  }

  @SubscribeMessage('screen-share')
  async handleScreenShare(@ConnectedSocket() client: Socket, @MessageBody() data: ScreenShareDto) {
    const session = this.activeSessions.get(client.id)
    if (!session || !session.capabilities.canShareScreen) {
      client.emit('error', { message: 'Unauthorized to share screen' })
      return
    }

    try {
      if (data.type === 'start') {
        // Create separate handle for screen sharing
        const screenShareHandleId = await this.janusService.attachPlugin(session.sessionId, 'janus.plugin.videoroom')

        if (!screenShareHandleId) {
          client.emit('error', { message: 'Failed to initialize screen share' })
          return
        }

        session.screenShareHandleId = screenShareHandleId
        session.isSharingScreen = true

        client.emit('screen-share-ready', {
          handleId: screenShareHandleId,
          quality: data.quality,
          includeAudio: data.includeAudio,
        })

        // Notify other participants
        client.to(session.classId).emit('screen-share-started', {
          userId: session.userId,
          displayName: session.displayName,
          quality: data.quality,
        })
      } else if (data.type === 'stop') {
        if (session.screenShareHandleId) {
          await this.janusService.stopScreenShare(session.sessionId, session.screenShareHandleId)
          session.screenShareHandleId = undefined
        }

        session.isSharingScreen = false

        client.emit('screen-share-stopped')
        client.to(session.classId).emit('screen-share-ended', {
          userId: session.userId,
          displayName: session.displayName,
        })
      }
    } catch (error) {
      this.logger.error('Error handling screen share:', error)
      client.emit('error', { message: 'Failed to process screen share request' })
    }
  }

  @SubscribeMessage('recording-control')
  async handleRecordingControl(@ConnectedSocket() client: Socket, @MessageBody() data: RecordingControlDto) {
    const session = this.activeSessions.get(client.id)
    if (!session || !session.capabilities.canRecord) {
      client.emit('error', { message: 'Unauthorized to control recording' })
      return
    }

    try {
      const classId = session.classId
      let recording = this.recordings.get(classId)

      switch (data.action) {
        case 'start': {
          if (recording && recording.status === 'recording') {
            client.emit('error', { message: 'Recording already in progress' })
            return
          }

          const filename = `class_${classId}_${Date.now()}`
          const recordingId = await this.janusService.startRecording(
            session.sessionId,
            session.handleId,
            session.roomId,
            filename,
            data.options?.includeVideo,
            data.options?.includeAudio,
          )

          if (recordingId) {
            recording = {
              recordingId,
              filename,
              startTime: new Date(),
              status: 'recording',
            }
            this.recordings.set(classId, recording)

            this.server.to(classId).emit('recording-started', {
              recordingId,
              startedBy: session.displayName,
              timestamp: recording.startTime,
            })

            // Send notification
            this.notificationGateway.notifyRecordingStarted(classId, session.displayName, recordingId)
          }
          break
        }

        case 'stop': {
          if (!recording || recording.status !== 'recording') {
            client.emit('error', { message: 'No active recording to stop' })
            return
          }

          const stopped = await this.janusService.stopRecording(
            session.sessionId,
            session.handleId,
            session.roomId,
            recording.recordingId,
          )

          if (stopped) {
            recording.status = 'stopped'
            recording.endTime = new Date()

            this.server.to(classId).emit('recording-stopped', {
              recordingId: recording.recordingId,
              stoppedBy: session.displayName,
              duration: recording.endTime.getTime() - recording.startTime.getTime(),
            })

            // Send notification
            this.notificationGateway.notifyRecordingStopped(
              classId,
              session.displayName,
              recording.recordingId,
              recording.s3Url,
            )

            // Upload to S3 in background
            // void this.uploadRecordingToS3(recording)
          }
          break
        }

        case 'pause':
          // TODO: Implement pause functionality
          break

        case 'resume':
          // TODO: Implement resume functionality
          break
      }
    } catch (error) {
      this.logger.error('Error handling recording control:', error)
      client.emit('error', { message: 'Failed to control recording' })
    }
  }

  @SubscribeMessage('raise-hand')
  handleRaiseHand(@ConnectedSocket() client: Socket, @MessageBody() data: RaiseHandDto) {
    const session = this.activeSessions.get(client.id)
    if (!session) {
      client.emit('error', { message: 'Session not found' })
      return
    }

    try {
      const raisedHands = this.raisedHands.get(session.classId) || new Map()

      if (data.action === 'raise') {
        if (!session.isHandRaised) {
          session.isHandRaised = true
          session.handRaisedAt = new Date()
          raisedHands.set(session.userId, session.handRaisedAt)

          this.raisedHands.set(session.classId, raisedHands)

          // Notify all participants
          this.server.to(session.classId).emit('hand-raised', {
            userId: session.userId,
            displayName: session.displayName,
            timestamp: session.handRaisedAt,
            reason: data.reason,
          })
        }
      } else if (data.action === 'lower') {
        if (session.isHandRaised) {
          session.isHandRaised = false
          session.handRaisedAt = undefined
          raisedHands.delete(session.userId)

          this.server.to(session.classId).emit('hand-lowered', {
            userId: session.userId,
            displayName: session.displayName,
          })
        }
      }

      this.updateRaisedHandsList(session.classId)
    } catch (error) {
      this.logger.error('Error handling raise hand:', error)
      client.emit('error', { message: 'Failed to process hand raise request' })
    }
  }

  @SubscribeMessage('participant-control')
  async handleParticipantControl(@ConnectedSocket() client: Socket, @MessageBody() data: ParticipantControlDto) {
    const session = this.activeSessions.get(client.id)
    if (!session || !session.capabilities.canControlParticipants) {
      client.emit('error', { message: 'Unauthorized to control participants' })
      return
    }

    try {
      const targetSocket = this.findSocketByUserId(data.targetUserId, session.classId)
      const targetSession = targetSocket ? this.activeSessions.get(targetSocket.id) : null

      if (!targetSession || !targetSocket) {
        client.emit('error', { message: 'Target participant not found' })
        return
      }

      switch (data.action) {
        case 'mute_audio':
          await this.janusService.muteParticipant(
            targetSession.sessionId,
            targetSession.handleId,
            targetSession.roomId,
            parseInt(targetSession.userId),
            true,
            false,
          )

          targetSocket.emit('force-muted', {
            type: 'audio',
            by: session.displayName,
            reason: data.reason,
          })
          break

        case 'mute_video':
          await this.janusService.muteParticipant(
            targetSession.sessionId,
            targetSession.handleId,
            targetSession.roomId,
            parseInt(targetSession.userId),
            false,
            true,
          )

          targetSocket.emit('force-muted', {
            type: 'video',
            by: session.displayName,
            reason: data.reason,
          })
          break

        case 'kick':
          await this.janusService.kickParticipant(
            targetSession.sessionId,
            targetSession.handleId,
            targetSession.roomId,
            parseInt(targetSession.userId),
          )

          targetSocket.emit('kicked-from-class', {
            by: session.displayName,
            reason: data.reason,
          })
          targetSocket.disconnect()
          break

        case 'promote_presenter':
          targetSession.capabilities.canPublishVideo = true
          targetSession.capabilities.canShareScreen = true
          targetSession.capabilities.canShareDocuments = true

          targetSocket.emit('promoted-to-presenter', {
            by: session.displayName,
            capabilities: targetSession.capabilities,
          })
          break

        case 'demote_presenter':
          if (targetSession.role !== 'lecturer') {
            targetSession.capabilities.canPublishVideo = false
            targetSession.capabilities.canShareScreen = false
            targetSession.capabilities.canShareDocuments = false

            targetSocket.emit('demoted-from-presenter', {
              by: session.displayName,
              capabilities: targetSession.capabilities,
            })
          }
          break
      }

      this.logger.log(`Participant control: ${data.action} on ${data.targetUserId} by ${session.userId}`)
    } catch (error) {
      this.logger.error('Error handling participant control:', error)
      client.emit('error', { message: 'Failed to control participant' })
    }
  }

  @SubscribeMessage('get-chat-history')
  handleGetChatHistory(@ConnectedSocket() client: Socket, @MessageBody() data: { limit?: number; offset?: number }) {
    const session = this.activeSessions.get(client.id)
    if (!session) {
      client.emit('error', { message: 'Session not found' })
      return
    }

    try {
      const history = this.chatHistory.get(session.classId) || []
      const limit = data.limit || 50
      const offset = data.offset || 0

      const messages = history.slice(offset, offset + limit)

      client.emit('chat-history', {
        messages,
        totalCount: history.length,
        hasMore: offset + limit < history.length,
      })
    } catch (error) {
      this.logger.error('Error getting chat history:', error)
      client.emit('error', { message: 'Failed to get chat history' })
    }
  }

  private cleanupClassData(classId: string) {
    // Clean up when last participant leaves
    this.chatHistory.delete(classId)
    this.raisedHands.delete(classId)
    this.recordings.delete(classId)
    this.logger.log(`Cleaned up data for class ${classId}`)
  }

  private updateParticipantCount(classId: string) {
    const count = this.classParticipants.get(classId)?.size || 0
    this.server.to(classId).emit('participant-count-updated', { count })
  }

  private updateRaisedHandsList(classId: string) {
    const raisedHands = this.raisedHands.get(classId) || new Map()
    const handsList = Array.from(raisedHands.entries()).map(([userId, timestamp]) => {
      const session = this.findSessionByUserId(userId, classId)
      return {
        userId,
        displayName: session?.displayName || 'Unknown',
        timestamp,
      }
    })

    this.server.to(classId).emit('raised-hands-updated', { handsList })
  }

  private findSocketByUserId(userId: string, classId: string): Socket | null {
    try {
      const participants = this.classParticipants.get(classId)
      if (!participants) {
        this.logger.warn(`No participants found for class ${classId}`)
        return null
      }

      for (const socketId of participants) {
        const session = this.activeSessions.get(socketId)
        if (session && session.userId === userId) {
          // Get socket from our stored instances
          const socket = this.socketInstances.get(socketId)
          if (socket) {
            this.logger.debug(`Found socket for user ${userId}`)
            return socket
          } else {
            this.logger.warn(`Socket instance not found for socketId ${socketId}, user ${userId}`)
          }
        }
      }

      this.logger.warn(`No socket found for user ${userId} in class ${classId}`)
      return null
    } catch (error) {
      this.logger.error(`Error finding socket for user ${userId}:`, error)
      return null
    }
  }
  private findSessionByUserId(userId: string, classId: string): ParticipantSession | null {
    const participants = this.classParticipants.get(classId)
    if (!participants) return null

    for (const socketId of participants) {
      const session = this.activeSessions.get(socketId)
      if (session && session.userId === userId) {
        return session
      }
    }
    return null
  }

  private sendClassState(client: Socket, classId: string) {
    const chatHistory = this.chatHistory.get(classId) || []
    const raisedHands = this.raisedHands.get(classId) || new Map()
    const recording = this.recordings.get(classId)

    // Send recent chat messages
    const recentMessages = chatHistory.slice(-50)
    client.emit('chat-history', {
      messages: recentMessages.filter((msg) => msg.type === 'public'), // Only public messages
      totalCount: recentMessages.length,
      hasMore: false,
    })

    // Send current raised hands
    const handsList = Array.from(raisedHands.entries()).map(([userId, timestamp]) => {
      const session = this.findSessionByUserId(userId, classId)
      return {
        userId,
        displayName: session?.displayName || 'Unknown',
        timestamp,
      }
    })
    client.emit('raised-hands-updated', { handsList })

    // Send recording status
    if (recording && recording.status === 'recording') {
      client.emit('recording-status', {
        isRecording: true,
        recordingId: recording.recordingId,
        startTime: recording.startTime,
      })
    }
  }

  private getDefaultCapabilities(role: 'lecturer' | 'customer'): ClassCapabilityDto {
    if (role === 'lecturer') {
      return {
        canPublishVideo: true,
        canPublishAudio: true,
        canShareScreen: true,
        canShareDocuments: true,
        canRecord: true,
        canControlParticipants: true,
        canModerateChat: true,
      }
    } else {
      return {
        canPublishVideo: false,
        canPublishAudio: true,
        canShareScreen: false,
        canShareDocuments: false,
        canRecord: false,
        canControlParticipants: false,
        canModerateChat: false,
      }
    }
  }

  private async uploadRecordingToS3(recording: ClassRecording): Promise<void> {
    try {
      this.logger.log(`Starting S3 upload for recording ${recording.recordingId}`)

      // TODO: Get actual recording buffer from Janus recording file
      // For now, this is a placeholder - you'll need to read the actual recording file
      const recordingBuffer = Buffer.from('placeholder-recording-data')

      const result = await this.s3Service.uploadRecording(
        recordingBuffer,
        recording.recordingId.split('_')[1], // Extract classId from recordingId
        recording.recordingId,
        recording.filename,
        'video/webm',
      )

      // Update recording with S3 URL
      recording.s3Url = result.url

      this.logger.log(`Successfully uploaded recording to S3: ${result.url}`)
    } catch (error) {
      this.logger.error(`Failed to upload recording to S3: ${recording.recordingId}`, error)
      throw error instanceof Error ? error : new Error(String(error))
    }
  }
}
