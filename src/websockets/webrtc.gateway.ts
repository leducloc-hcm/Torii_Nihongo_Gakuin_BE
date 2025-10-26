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
import { exec } from 'child_process'

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
  recipientName?: string
  timestamp: number
}

interface PollOption {
  id: string
  text: string
  votes: number
  voters: string[]
}

interface Poll {
  id: string
  question: string
  options: PollOption[]
  creatorId: string
  creatorName: string
  createdAt: number
  isActive: boolean
  allowMultiple: boolean
  totalVotes: number
  duration?: number // Duration in seconds
  endsAt?: number // Timestamp when poll ends
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
  // Poll tracking: classId -> (pollId -> poll)
  private readonly classPolls = new Map<string, Map<string, Poll>>()
  // Active user sessions: classId_userId -> socketId (to prevent multiple tabs)
  private readonly activeSessions = new Map<string, string>()

  handleConnection(client: Socket) {
    const { classId, userId, role, displayName, avatar } = client.handshake.query as Record<string, string>

    if (!classId || !userId || !role || !displayName) {
      this.logger.warn('Missing connection params', { classId, userId, role, displayName })
      client.emit('error', { message: 'Invalid connection parameters' })
      client.disconnect()
      return
    }

    // Check for existing session (prevent multiple tabs)
    const sessionKey = `${classId}_${userId}`
    const existingSocketId = this.activeSessions.get(sessionKey)

    if (existingSocketId && existingSocketId !== client.id) {
      // Check if existing socket is still connected
      const existingSocket = this.server.sockets.sockets.get(existingSocketId)

      if (existingSocket && existingSocket.connected) {
        // Disconnect the existing socket
        this.logger.warn(
          `🚫 User ${displayName} (${userId}) already connected to class ${classId}. Disconnecting old connection.`,
        )
        existingSocket.emit('error', {
          message: 'You have joined this class from another tab/window. This connection will be closed.',
        })
        existingSocket.disconnect(true)
      }
    }

    // Register new session
    this.activeSessions.set(sessionKey, client.id)

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

    // Remove active session
    const sessionKey = `${classId}_${userId}`
    const activeSocketId = this.activeSessions.get(sessionKey)
    if (activeSocketId === client.id) {
      this.activeSessions.delete(sessionKey)
      this.logger.log(`✅ Removed active session for ${displayName} (${userId}) in class ${classId}`)
    }

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
    payload: {
      message: string
      type?: 'public' | 'private'
      recipientId?: string
      recipientName?: string
    },
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
      recipientName: payload.recipientName,
      timestamp: Date.now(),
    }

    if (msg.type === 'private' && msg.recipientId) {
      // Emit only to sender and recipient (find their socket IDs)
      const recipientSocketId = Array.from(this.socketMeta.entries()).find(
        ([_, m]) => m.userId === msg.recipientId && m.classId === classId,
      )?.[0]

      // Send to recipient
      if (recipientSocketId) {
        this.server.to(recipientSocketId).emit('chat-message', msg)
      }
      // Also send back to sender
      client.emit('chat-message', msg)
    } else {
      // Public message - send to everyone in class
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

  @SubscribeMessage('create-poll')
  handleCreatePoll(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      question: string
      options: string[]
      allowMultiple: boolean
      duration?: number
    },
  ) {
    const meta = this.socketMeta.get(client.id)
    if (!meta) {
      this.logger.warn('❌ create-poll: No meta found for client', client.id)
      return
    }
    const { classId, userId, displayName, role } = meta

    // Only lecturers can create polls
    if (role !== 'lecturer') {
      this.logger.warn(`❌ create-poll: Non-lecturer tried to create poll: ${displayName}`)
      client.emit('error', { message: 'Only lecturers can create polls' })
      return
    }

    this.logger.log(`📊 Creating poll in class ${classId} by ${displayName}:`, payload)

    // Ensure class poll map exists
    if (!this.classPolls.has(classId)) {
      this.classPolls.set(classId, new Map<string, Poll>())
    }
    const pollMap = this.classPolls.get(classId)!

    // Generate unique poll ID
    const pollId = `poll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // Create poll options
    const pollOptions: PollOption[] = payload.options.map((optionText) => ({
      id: `opt_${Math.random().toString(36).slice(2, 8)}`,
      text: optionText,
      votes: 0,
      voters: [],
    }))

    // Calculate endsAt if duration is provided
    const now = Date.now()
    const endsAt = payload.duration ? now + payload.duration * 1000 : undefined

    // Create poll
    const poll: Poll = {
      id: pollId,
      question: payload.question,
      options: pollOptions,
      creatorId: userId,
      creatorName: displayName,
      createdAt: now,
      isActive: true,
      allowMultiple: payload.allowMultiple,
      totalVotes: 0,
      duration: payload.duration,
      endsAt,
    }

    // Store poll
    pollMap.set(pollId, poll)

    // Auto-close poll after duration expires
    if (payload.duration) {
      setTimeout(() => {
        const currentPoll = pollMap.get(pollId)
        if (currentPoll && currentPoll.isActive) {
          currentPoll.isActive = false
          pollMap.set(pollId, currentPoll)
          this.logger.log(`⏱️ Poll ${pollId} auto-closed after ${payload.duration}s`)
          // Notify everyone
          this.server.to(`class_${classId}`).emit('poll-closed', pollId)
        }
      }, payload.duration * 1000)
    }

    this.logger.log(`📊 ✅ Poll created with ID: ${pollId}. Broadcasting to class_${classId}`)

    // Broadcast to ALL clients in the room (including creator)
    this.server.to(`class_${classId}`).emit('poll-created', poll)

    this.logger.log(`📊 Broadcasted poll-created event to class_${classId}`)
  }

  @SubscribeMessage('vote-poll')
  handleVotePoll(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { pollId: string; optionId: string },
  ) {
    const meta = this.socketMeta.get(client.id)
    if (!meta) return
    const { classId, userId, displayName } = meta

    this.logger.log(`📊 Vote received from ${displayName}: pollId=${payload.pollId}, optionId=${payload.optionId}`)

    const pollMap = this.classPolls.get(classId)
    if (!pollMap) {
      this.logger.warn('❌ vote-poll: No polls found for class', classId)
      return
    }

    const poll = pollMap.get(payload.pollId)
    if (!poll) {
      this.logger.warn('❌ vote-poll: Poll not found', payload.pollId)
      return
    }

    if (!poll.isActive) {
      this.logger.warn('❌ vote-poll: Poll is not active', payload.pollId)
      client.emit('error', { message: 'This poll is closed' })
      return
    }

    const option = poll.options.find((o) => o.id === payload.optionId)
    if (!option) {
      this.logger.warn('❌ vote-poll: Option not found', payload.optionId)
      return
    }

    // Check if user already voted
    const hasVoted = poll.options.some((o) => o.voters.includes(userId))

    if (!poll.allowMultiple && hasVoted) {
      // Remove previous vote if not allowing multiple
      poll.options.forEach((o) => {
        const voterIndex = o.voters.indexOf(userId)
        if (voterIndex > -1) {
          o.voters.splice(voterIndex, 1)
          o.votes--
          poll.totalVotes--
        }
      })
    }

    // Add vote
    if (!option.voters.includes(userId)) {
      option.voters.push(userId)
      option.votes++
      poll.totalVotes++
    }

    // Update poll
    pollMap.set(payload.pollId, poll)

    this.logger.log(`📊 ✅ Vote recorded. Broadcasting poll-updated to class_${classId}`)

    // Broadcast updated poll
    this.server.to(`class_${classId}`).emit('poll-updated', poll)
  }

  @SubscribeMessage('close-poll')
  handleClosePoll(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { pollId: string },
  ) {
    const meta = this.socketMeta.get(client.id)
    if (!meta) return
    const { classId, userId, role } = meta

    // Only lecturers can close polls
    if (role !== 'lecturer') {
      this.logger.warn('❌ close-poll: Non-lecturer tried to close poll')
      client.emit('error', { message: 'Only lecturers can close polls' })
      return
    }

    this.logger.log(`📊 Closing poll ${payload.pollId} in class ${classId}`)

    const pollMap = this.classPolls.get(classId)
    if (!pollMap) {
      this.logger.warn('❌ close-poll: No polls found for class', classId)
      return
    }

    const poll = pollMap.get(payload.pollId)
    if (!poll) {
      this.logger.warn('❌ close-poll: Poll not found', payload.pollId)
      return
    }

    // Mark poll as inactive
    poll.isActive = false
    pollMap.set(payload.pollId, poll)

    this.logger.log(`📊 ✅ Poll closed. Broadcasting poll-closed to class_${classId}`)

    // Broadcast poll closed
    this.server.to(`class_${classId}`).emit('poll-closed', payload.pollId)
  }

  /**
   * Trigger recording combine and S3 upload after room/class is destroyed
   * Executes script on remote Janus server via SSH
   */
  private triggerRecordingCombine(classId: string): void {
    // Extract hostname from JANUS_SERVER_URL (e.g., wss://janus.example.com/ws -> janus.example.com)
    const janusServerUrl = process.env.JANUS_SERVER_URL || 'wss://janus.torii-nihongo-gakuin.io.vn/ws'
    const janusHost = new URL(janusServerUrl).hostname

    // SSH configuration
    const janusUser = process.env.JANUS_SSH_USER || 'ubuntu@janus.torii-nihongo-gakuin.io.vn'
    const janusKeyPath = process.env.JANUS_SSH_KEY || '~/.ssh/janus_key'
    const scriptPath = '/opt/janus/bin/auto_push_to_s3.sh'
    const recordingsDir = '/opt/janus/share/janus/recordings'

    this.logger.log(`📹 Triggering recording combine for class ${classId} on ${janusHost}`)

    // SSH command to execute script on remote Janus server
    // Must cd to recordings dir and run with sudo (ubuntu user needs sudo privileges for this script)
    const sshCommand = `ssh -i ${janusKeyPath} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${janusUser}@${janusHost} "cd ${recordingsDir} && sudo ${scriptPath} ${classId}"`

    exec(sshCommand, (error, stdout, stderr) => {
      if (error) {
        this.logger.error(
          `❌ Recording combine error for class ${classId}: ${error.message}. ` +
            `Ensure SSH key is configured and Janus server (${janusHost}) is accessible.`,
        )
        return
      }
      if (stderr) {
        this.logger.warn(`⚠️ Recording stderr for class ${classId}:`, stderr)
      }
      this.logger.log(`✅ Recording combine triggered successfully for class ${classId} on ${janusHost}`)
    })
  }

  /**
   * Call this when class ends or room is destroyed
   */
  @SubscribeMessage('end-class')
  handleEndClass(@ConnectedSocket() client: Socket, @MessageBody() payload: { classId: string }) {
    const meta = this.socketMeta.get(client.id)
    if (!meta) return

    const { role, displayName } = meta

    // Only lecturers can end the class
    if (role !== 'lecturer') {
      client.emit('error', { message: 'Only lecturers can end the class' })
      return
    }

    const { classId } = payload

    this.logger.log(`🛑 Class ${classId} ended by ${displayName}`)

    // Notify all participants
    this.server.to(`class_${classId}`).emit('class-ended', { classId })

    // Trigger recording processing (5 second delay to ensure Janus finishes writing files)
    setTimeout(() => {
      this.triggerRecordingCombine(classId)
    }, 5000)

    return { success: true }
  }
}
