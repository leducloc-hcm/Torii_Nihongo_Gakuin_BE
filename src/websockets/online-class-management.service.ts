import { Injectable, Logger } from '@nestjs/common'
import { JanusService } from './janus/janus.service'
import { WebRtcGateway } from './webrtc.gateway'
import { NotificationGateway } from './notification.gateway'
import { PrismaService } from '../shared/services/prisma.service'
import { S3Service } from '../shared/services/s3.service'

interface OnlineClassSession {
  classId: string
  sessionId: number
  handleId: number
  roomId: number
  lecturerId: string
  startTime: Date
  participants: Map<string, ParticipantInfo>
  isRecording: boolean
  recordingId?: string
  sharedDocuments: SharedDocument[]
  raisedHands: RaisedHand[]
  whiteboardActive: boolean
  breakoutRooms: Map<number, BreakoutRoom>
  features: ClassFeatures
}

interface ParticipantInfo {
  userId: string
  displayName: string
  role: 'lecturer' | 'customer'
  sessionId: number
  handleId: number
  screenShareHandleId?: number
  joinTime: Date
  lastActivity: Date
  isAudioMuted: boolean
  isVideoMuted: boolean
  isSharingScreen: boolean
  isHandRaised: boolean
  handRaisedAt?: Date
  networkQuality: NetworkQuality
  permissions: ParticipantPermissions
}

interface SharedDocument {
  id: string
  title: string
  url: string
  type: string
  sharedBy: string
  sharedAt: Date
  thumbnail?: string
  highlight: boolean
  allowDownload: boolean
}

interface RaisedHand {
  userId: string
  displayName: string
  reason?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: string
  raisedAt: Date
}

interface BreakoutRoom {
  id: number
  participants: string[]
  createdAt: Date
  duration: number
}

interface ClassFeatures {
  chatEnabled: boolean
  screenShareEnabled: boolean
  documentShareEnabled: boolean
  raiseHandEnabled: boolean
  recordingEnabled: boolean
  whiteboardEnabled: boolean
  breakoutRoomsEnabled: boolean
  maxParticipants: number
  autoAdmit: boolean
  waitingRoomEnabled: boolean
}

interface NetworkQuality {
  latency: number
  packetLoss: number
  quality: number // 0-5 scale
}

interface ParticipantPermissions {
  canPublishVideo: boolean
  canPublishAudio: boolean
  canShareScreen: boolean
  canShareDocuments: boolean
  canUseWhiteboard: boolean
  canCreateBreakoutRooms: boolean
  canControlParticipants: boolean
  canRecord: boolean
}

@Injectable()
export class OnlineClassManagementService {
  private readonly logger = new Logger(OnlineClassManagementService.name)
  private readonly activeSessions = new Map<string, OnlineClassSession>()
  private readonly waitingRooms = new Map<string, string[]>() // classId -> userIds

  constructor(
    private readonly janusService: JanusService,
    private readonly webRtcGateway: WebRtcGateway,
    private readonly notificationGateway: NotificationGateway,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async createOnlineClassSession(
    classId: string,
    lecturerId: string,
    features: ClassFeatures,
  ): Promise<OnlineClassSession> {
    try {
      // Create Janus session for the class
      const sessionId = await this.janusService.createSession()
      if (!sessionId) {
        throw new Error('Failed to create Janus session')
      }

      // Attach VideoRoom plugin
      const handleId = await this.janusService.attachPlugin(sessionId, 'janus.plugin.videoroom')
      if (!handleId) {
        throw new Error('Failed to attach VideoRoom plugin')
      }

      const roomId = parseInt(classId) + 10000 // Ensure unique room ID

      // Create Janus room
      const roomResult = await this.janusService.createOrJoinRoom(
        sessionId,
        handleId,
        roomId,
        'Lecturer',
        true, // isPublisher
      )

      if (!roomResult.success) {
        throw new Error('Failed to create Janus room')
      }

      const session: OnlineClassSession = {
        classId,
        sessionId,
        handleId,
        roomId,
        lecturerId,
        startTime: new Date(),
        participants: new Map(),
        isRecording: false,
        sharedDocuments: [],
        raisedHands: [],
        whiteboardActive: false,
        breakoutRooms: new Map(),
        features,
      }

      this.activeSessions.set(classId, session)
      this.logger.log(`Created online class session for class ${classId}`)

      return session
    } catch (error) {
      this.logger.error(`Failed to create online class session: ${error}`)
      throw error
    }
  }

  async joinOnlineClass(
    classId: string,
    userId: string,
    displayName: string,
    role: 'lecturer' | 'customer',
  ): Promise<{
    success: boolean
    sessionInfo?: {
      sessionId: number
      handleId: number
      roomId: number
      permissions: ParticipantPermissions
    }
    waitingRoom?: boolean
  }> {
    try {
      const session = this.activeSessions.get(classId)
      if (!session) {
        throw new Error('Class session not found')
      }

      // Check waiting room
      if (session.features.waitingRoomEnabled && role === 'customer' && !session.features.autoAdmit) {
        this.addToWaitingRoom(classId, userId)
        return { success: true, waitingRoom: true }
      }

      // Check capacity
      if (session.participants.size >= session.features.maxParticipants) {
        throw new Error('Class is at maximum capacity')
      }

      // Create Janus session for participant
      const participantSessionId = await this.janusService.createSession()
      if (!participantSessionId) {
        throw new Error('Failed to create participant session')
      }

      const participantHandleId = await this.janusService.attachPlugin(participantSessionId, 'janus.plugin.videoroom')
      if (!participantHandleId) {
        throw new Error('Failed to attach participant to VideoRoom')
      }

      // Join room
      const isPublisher = role === 'lecturer'
      const joinResult = await this.janusService.createOrJoinRoom(
        participantSessionId,
        participantHandleId,
        session.roomId,
        displayName,
        isPublisher,
      )

      if (!joinResult.success) {
        throw new Error('Failed to join room')
      }

      // Add participant to session
      const participant: ParticipantInfo = {
        userId,
        displayName,
        role,
        sessionId: participantSessionId,
        handleId: participantHandleId,
        joinTime: new Date(),
        lastActivity: new Date(),
        isAudioMuted: false,
        isVideoMuted: role === 'customer', // customers start with video muted
        isSharingScreen: false,
        isHandRaised: false,
        networkQuality: { latency: 0, packetLoss: 0, quality: 5 },
        permissions: this.getDefaultPermissions(role),
      }

      session.participants.set(userId, participant)

      // Store attendance in database
      await this.recordAttendance(classId, userId)

      this.logger.log(`User ${userId} joined class ${classId} as ${role}`)

      return {
        success: true,
        sessionInfo: {
          sessionId: participantSessionId,
          handleId: participantHandleId,
          roomId: session.roomId,
          permissions: participant.permissions,
        },
      }
    } catch (error) {
      this.logger.error(`Failed to join online class: ${error}`)
      return { success: false }
    }
  }

  async startScreenShare(
    classId: string,
    userId: string,
    quality: 'low' | 'medium' | 'high' = 'medium',
    includeAudio: boolean = false,
  ): Promise<{ success: boolean; handleId?: number }> {
    try {
      const session = this.activeSessions.get(classId)
      const participant = session?.participants.get(userId)

      if (!session || !participant) {
        throw new Error('Session or participant not found')
      }

      if (!participant.permissions.canShareScreen) {
        throw new Error('User does not have screen share permission')
      }

      // Create separate handle for screen sharing
      const screenShareHandleId = await this.janusService.attachPlugin(participant.sessionId, 'janus.plugin.videoroom')

      if (!screenShareHandleId) {
        throw new Error('Failed to create screen share handle')
      }

      // Join room as screen share publisher
      const joinResult = await this.janusService.createOrJoinRoom(
        participant.sessionId,
        screenShareHandleId,
        session.roomId,
        `${participant.displayName}_screen`,
        true,
      )

      if (!joinResult.success) {
        throw new Error('Failed to join room for screen sharing')
      }

      participant.screenShareHandleId = screenShareHandleId
      participant.isSharingScreen = true

      this.logger.log(`User ${userId} started screen sharing in class ${classId}`)

      // Notify other participants
      this.notifyClassEvent(classId, 'screen-share-started', {
        userId,
        displayName: participant.displayName,
        quality,
        includeAudio,
      })

      return { success: true, handleId: screenShareHandleId }
    } catch (error) {
      this.logger.error(`Failed to start screen share: ${error}`)
      return { success: false }
    }
  }

  async stopScreenShare(classId: string, userId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(classId)
      const participant = session?.participants.get(userId)

      if (!session || !participant || !participant.screenShareHandleId) {
        return false
      }

      // Stop screen sharing
      await this.janusService.stopScreenShare(participant.sessionId, participant.screenShareHandleId)

      participant.screenShareHandleId = undefined
      participant.isSharingScreen = false

      this.logger.log(`User ${userId} stopped screen sharing in class ${classId}`)

      // Notify other participants
      this.notifyClassEvent(classId, 'screen-share-stopped', {
        userId,
        displayName: participant.displayName,
      })

      return true
    } catch (error) {
      this.logger.error(`Failed to stop screen share: ${error}`)
      return false
    }
  }

  async startRecording(
    classId: string,
    lecturerId: string,
    options: {
      name?: string
      includeVideo?: boolean
      includeAudio?: boolean
      quality?: 'low' | 'medium' | 'high'
    } = {},
  ): Promise<{ success: boolean; recordingId?: string }> {
    try {
      const session = this.activeSessions.get(classId)
      if (!session || session.lecturerId !== lecturerId) {
        throw new Error('Session not found or unauthorized')
      }

      if (session.isRecording) {
        throw new Error('Recording is already active')
      }

      if (!session.features.recordingEnabled) {
        throw new Error('Recording is not enabled for this class')
      }

      const filename = options.name || `class_${classId}_${Date.now()}`
      const recordingId = await this.janusService.startRecording(
        session.sessionId,
        session.handleId,
        session.roomId,
        filename,
        options.includeVideo !== false,
        options.includeAudio !== false,
      )

      if (!recordingId) {
        throw new Error('Failed to start recording')
      }

      session.isRecording = true
      session.recordingId = recordingId

      this.logger.log(`Started recording for class ${classId}: ${recordingId}`)

      // Notify all participants
      this.notifyClassEvent(classId, 'recording-started', {
        recordingId,
        startedBy: lecturerId,
        timestamp: new Date(),
      })

      // Store recording info in database
      this.storeRecordingInfo(classId, recordingId, filename, options)

      return { success: true, recordingId }
    } catch (error) {
      this.logger.error(`Failed to start recording: ${error}`)
      return { success: false }
    }
  }

  async stopRecording(classId: string, lecturerId: string): Promise<{ success: boolean; recordingUrl?: string }> {
    try {
      const session = this.activeSessions.get(classId)
      if (!session || session.lecturerId !== lecturerId || !session.recordingId) {
        throw new Error('Session not found, unauthorized, or no active recording')
      }

      const stopped = await this.janusService.stopRecording(
        session.sessionId,
        session.handleId,
        session.roomId,
        session.recordingId,
      )

      if (!stopped) {
        throw new Error('Failed to stop recording')
      }

      const recordingId = session.recordingId
      session.isRecording = false
      session.recordingId = undefined

      this.logger.log(`Stopped recording for class ${classId}: ${recordingId}`)

      // Notify all participants
      this.notifyClassEvent(classId, 'recording-stopped', {
        recordingId,
        stoppedBy: lecturerId,
        timestamp: new Date(),
      })

      // Process and upload recording in background
      void this.processRecording(classId, recordingId)

      return { success: true }
    } catch (error) {
      this.logger.error(`Failed to stop recording: ${error}`)
      return { success: false }
    }
  }

  shareDocument(
    classId: string,
    userId: string,
    document: {
      title: string
      url: string
      type: string
      description?: string
      thumbnail?: string
      highlight?: boolean
      allowDownload?: boolean
    },
  ): boolean {
    try {
      const session = this.activeSessions.get(classId)
      const participant = session?.participants.get(userId)

      if (!session || !participant) {
        throw new Error('Session or participant not found')
      }

      if (!participant.permissions.canShareDocuments) {
        throw new Error('User does not have document sharing permission')
      }

      if (!session.features.documentShareEnabled) {
        throw new Error('Document sharing is not enabled for this class')
      }

      const sharedDocument: SharedDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: document.title,
        url: document.url,
        type: document.type,
        sharedBy: userId,
        sharedAt: new Date(),
        thumbnail: document.thumbnail,
        highlight: document.highlight || false,
        allowDownload: document.allowDownload !== false,
      }

      session.sharedDocuments.push(sharedDocument)

      this.logger.log(`Document shared in class ${classId} by ${userId}: ${document.title}`)

      // Notify all participants
      this.notifyClassEvent(classId, 'document-shared', {
        document: sharedDocument,
        sharedBy: {
          userId,
          displayName: participant.displayName,
          role: participant.role,
        },
      })

      // Store in database
      this.storeSharedDocument(classId, sharedDocument)

      return true
    } catch (error) {
      this.logger.error(`Failed to share document: ${error}`)
      return false
    }
  }

  raiseHand(
    classId: string,
    userId: string,
    action: 'raise' | 'lower',
    options: {
      reason?: string
      priority?: 'low' | 'normal' | 'high' | 'urgent'
      category?: string
    } = {},
  ): boolean {
    try {
      const session = this.activeSessions.get(classId)
      const participant = session?.participants.get(userId)

      if (!session || !participant) {
        throw new Error('Session or participant not found')
      }

      if (!session.features.raiseHandEnabled) {
        throw new Error('Raise hand feature is not enabled for this class')
      }

      if (action === 'raise') {
        if (participant.isHandRaised) {
          return true // Already raised
        }

        const raisedHand: RaisedHand = {
          userId,
          displayName: participant.displayName,
          reason: options.reason,
          priority: options.priority || 'normal',
          category: options.category || 'other',
          raisedAt: new Date(),
        }

        session.raisedHands.push(raisedHand)
        participant.isHandRaised = true
        participant.handRaisedAt = raisedHand.raisedAt

        this.logger.log(`Hand raised in class ${classId} by ${userId}`)

        // Notify lecturer and other participants
        this.notifyClassEvent(classId, 'hand-raised', raisedHand)
      } else {
        // Lower hand
        session.raisedHands = session.raisedHands.filter((hand) => hand.userId !== userId)
        participant.isHandRaised = false
        participant.handRaisedAt = undefined

        this.logger.log(`Hand lowered in class ${classId} by ${userId}`)

        this.notifyClassEvent(classId, 'hand-lowered', {
          userId,
          displayName: participant.displayName,
        })
      }

      return true
    } catch (error) {
      this.logger.error(`Failed to handle raise hand: ${error}`)
      return false
    }
  }

  async controlParticipant(
    classId: string,
    lecturerId: string,
    targetUserId: string,
    action: string,
    options: { reason?: string; duration?: number } = {},
  ): Promise<boolean> {
    try {
      const session = this.activeSessions.get(classId)
      const lecturer = session?.participants.get(lecturerId)
      const targetParticipant = session?.participants.get(targetUserId)

      if (!session || !lecturer || !targetParticipant) {
        throw new Error('Session or participants not found')
      }

      if (!lecturer.permissions.canControlParticipants) {
        throw new Error('User does not have participant control permission')
      }

      switch (action) {
        case 'mute_audio':
          await this.janusService.muteParticipant(
            targetParticipant.sessionId,
            targetParticipant.handleId,
            session.roomId,
            parseInt(targetUserId),
            true,
            false,
          )
          targetParticipant.isAudioMuted = true
          break

        case 'mute_video':
          await this.janusService.muteParticipant(
            targetParticipant.sessionId,
            targetParticipant.handleId,
            session.roomId,
            parseInt(targetUserId),
            false,
            true,
          )
          targetParticipant.isVideoMuted = true
          break

        case 'kick':
          await this.janusService.kickParticipant(
            targetParticipant.sessionId,
            targetParticipant.handleId,
            session.roomId,
            parseInt(targetUserId),
          )
          session.participants.delete(targetUserId)
          break

        case 'promote_presenter':
          targetParticipant.permissions.canShareScreen = true
          targetParticipant.permissions.canShareDocuments = true
          targetParticipant.permissions.canUseWhiteboard = true
          break

        case 'demote_presenter':
          if (targetParticipant.role !== 'lecturer') {
            targetParticipant.permissions.canShareScreen = false
            targetParticipant.permissions.canShareDocuments = false
            targetParticipant.permissions.canUseWhiteboard = false
          }
          break
      }

      this.logger.log(`Participant control action ${action} performed on ${targetUserId} by ${lecturerId}`)

      // Notify participants
      this.notifyClassEvent(classId, 'participant-action', {
        action,
        targetUserId,
        performedBy: lecturerId,
        reason: options.reason,
        timestamp: new Date(),
      })

      return true
    } catch (error) {
      this.logger.error(`Failed to control participant: ${error}`)
      return false
    }
  }

  getClassStats(classId: string): any {
    const session = this.activeSessions.get(classId)
    if (!session) {
      return null
    }

    const duration = Date.now() - session.startTime.getTime()
    const participants = Array.from(session.participants.values())

    return {
      classId,
      currentParticipants: session.participants.size,
      totalJoined: session.participants.size, // TODO: Track total joined vs current
      duration: Math.floor(duration / 1000),
      isRecording: session.isRecording,
      documentsShared: session.sharedDocuments.length,
      handsRaised: session.raisedHands.length,
      chatMessages: 0, // TODO: Track chat messages
      screenShareActive: participants.some((p) => p.isSharingScreen),
      whiteboardActive: session.whiteboardActive,
      breakoutRoomsActive: session.breakoutRooms.size,
      networkQuality: {
        average: participants.reduce((acc, p) => acc + p.networkQuality.quality, 0) / participants.length || 0,
        participants: participants.map((p) => ({
          userId: p.userId,
          quality: p.networkQuality.quality,
          latency: p.networkQuality.latency,
          packetLoss: p.networkQuality.packetLoss,
        })),
      },
      participation: {
        speaking: [], // TODO: Track speaking participants
        handRaised: session.raisedHands.map((h) => h.userId),
        chatActive: [], // TODO: Track chat activity
      },
    }
  }

  private addToWaitingRoom(classId: string, userId: string): void {
    if (!this.waitingRooms.has(classId)) {
      this.waitingRooms.set(classId, [])
    }
    this.waitingRooms.get(classId)!.push(userId)
  }

  private getDefaultPermissions(role: 'lecturer' | 'customer'): ParticipantPermissions {
    if (role === 'lecturer') {
      return {
        canPublishVideo: true,
        canPublishAudio: true,
        canShareScreen: true,
        canShareDocuments: true,
        canUseWhiteboard: true,
        canCreateBreakoutRooms: true,
        canControlParticipants: true,
        canRecord: true,
      }
    } else {
      return {
        canPublishVideo: false,
        canPublishAudio: true,
        canShareScreen: false,
        canShareDocuments: false,
        canUseWhiteboard: false,
        canCreateBreakoutRooms: false,
        canControlParticipants: false,
        canRecord: false,
      }
    }
  }

  private notifyClassEvent(classId: string, eventType: string, data: any): void {
    // Use the existing WebRTC gateway to emit events
    if (this.webRtcGateway && this.webRtcGateway.server) {
      this.webRtcGateway.server.to(classId).emit(eventType, data)
    }
  }

  private async recordAttendance(classId: string, userId: string): Promise<void> {
    try {
      // Find active session
      const activeSession = await this.prisma.liveSession.findFirst({
        where: {
          classId: parseInt(classId),
          endedAt: null,
        },
      })

      if (activeSession) {
        await this.prisma.attendance.upsert({
          where: {
            sessionId_userId: {
              sessionId: activeSession.id,
              userId: parseInt(userId),
            },
          },
          update: {
            joinedAt: new Date(),
          },
          create: {
            sessionId: activeSession.id,
            userId: parseInt(userId),
            status: 'PRESENT',
            joinedAt: new Date(),
          },
        })
      }
    } catch (error) {
      this.logger.error(`Failed to record attendance: ${error}`)
    }
  }

  private storeRecordingInfo(classId: string, recordingId: string, filename: string, options: any): void {
    try {
      // Store recording metadata in database
      // This would typically be in a recordings table
      this.logger.log(`Stored recording info for ${recordingId}`)
    } catch (error) {
      this.logger.error(`Failed to store recording info: ${error}`)
    }
  }

  private storeSharedDocument(classId: string, document: SharedDocument): void {
    try {
      // Store shared document in database
      // This would typically be in a shared_documents table
      this.logger.log(`Stored shared document ${document.id}`)
    } catch (error) {
      this.logger.error(`Failed to store shared document: ${error}`)
    }
  }

  private processRecording(classId: string, recordingId: string): void {
    try {
      // Process and upload recording to S3
      // This would involve reading the recording file from Janus and uploading to S3
      this.logger.log(`Processing recording ${recordingId} for class ${classId}`)
    } catch (error) {
      this.logger.error(`Failed to process recording: ${error}`)
    }
  }
}
