import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { JanusService } from '../../websockets/janus/janus.service'
import { S3Service } from '../../shared/services/s3.service'
import { NotificationService } from '../notification/notification.service'
import {
  CreateOnlineClassDto,
  UpdateOnlineClassDto,
  ClassListQueryDto,
  JoinClassTokenDto,
  StartRecordingDto,
  ShareDocumentDto,
  ParticipantActionDto,
  OnlineClassResponseDto,
  ClassAnalyticsDto,
} from './online-class.dto'
import { Role, JLPTLevel, LiveMode } from '@prisma/client'
import { sign, verify } from 'jsonwebtoken'

@Injectable()
export class OnlineClassService {
  private readonly logger = new Logger(OnlineClassService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly janusService: JanusService,
    private readonly s3Service: S3Service,
    private readonly notificationService: NotificationService,
  ) {}

  async generateJoinToken(classId: string, sessionId: string, userId: number): Promise<JoinClassTokenDto> {
    try {
      const sessionIdInt = parseInt(sessionId)
      const classIdInt = parseInt(classId)
      // Check access permissions Tam thoi bo qua
      const hasAccess = await this.checkClassAccess(sessionIdInt, userId)
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this class')
      }

      // Get class details with active session
      const onlineClass = await this.prisma.class.findUnique({
        where: { id: classIdInt },
        include: {
          lecturer: {
            include: {
              lecturerProfile: true,
            },
          },
          course: true,
          sessions: {
            where: { id: sessionIdInt },
          },
        },
      })

      if (!onlineClass) {
        throw new NotFoundException('Online class not found')
      }

      const activeSession = onlineClass.sessions[0]
      if (!activeSession) {
        throw new BadRequestException('No active session available for this class')
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new NotFoundException('User not found')
      }

      // Determine user role in class
      const userRole: 'lecturer' | 'customer' = onlineClass.lecturerId === userId ? 'lecturer' : 'customer'

      // Get participants in the active session through Janus
      let participants: any[] = []
      if (activeSession.janusRoomId) {
        try {
          this.logger.log(`🎯 GenerateJoinToken: Querying participants for room ${activeSession.janusRoomId}`)

          // Create a temporary session to query participants
          const tempSessionId = await this.janusService.createSession()
          if (tempSessionId) {
            const tempHandleId = await this.janusService.attachPlugin(tempSessionId, 'janus.plugin.videoroom')
            if (tempHandleId) {
              participants = await this.janusService.listParticipants(
                tempSessionId,
                tempHandleId,
                activeSession.janusRoomId,
              )
              this.logger.log(
                `👥 GenerateJoinToken: Found ${participants.length} participants:`,
                JSON.stringify(participants, null, 2),
              )

              // Clean up temp session
              await this.janusService.destroySession(tempSessionId)
            } else {
              this.logger.warn('⚠️ GenerateJoinToken: Failed to attach plugin for participants query')
            }
          } else {
            this.logger.warn('⚠️ GenerateJoinToken: Failed to create temp session for participants query')
          }
        } catch (error) {
          this.logger.error('❌ GenerateJoinToken: Failed to get participants from Janus:', error)
          // Don't throw error, just log it and continue with empty participants
        }
      } else {
        this.logger.log('ℹ️ GenerateJoinToken: No Janus room ID available, skipping participants query')
      }

      // Generate JWT token with Janus room info
      const tokenPayload = {
        classId,
        userId: userId.toString(),
        role: userRole,
        displayName: user.name,
        avatar: userRole === 'lecturer' ? onlineClass.lecturer.lecturerProfile?.avatar : undefined,
        janusRoomId: activeSession.janusRoomId ?? undefined,
        sessionId: activeSession.id.toString(),
      }

      const secret = process.env.JWT_SECRET || 'default-secret'
      const token = sign(tokenPayload, secret, { expiresIn: '4h' })

      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)

      // Record attendance
      await this.prisma.attendance.upsert({
        where: {
          sessionId_userId: {
            sessionId: activeSession.id,
            userId,
          },
        },
        create: {
          sessionId: activeSession.id,
          userId,
          joinedAt: new Date(),
        },
        update: { joinedAt: new Date(), leftAt: null },
      })

      // Prepare ICE servers
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

      const joinTokenResponse = {
        token,
        expiresAt,
        classInfo: {
          id: classId,
          title: onlineClass.title,
          description: onlineClass.description || '',
          scheduledAt: activeSession.scheduledAt,
          lecturerName: onlineClass.lecturer.name,
          capacity: onlineClass.capacity,
          janusRoomId: activeSession.janusRoomId ?? undefined,
          janusServer: process.env.JANUS_SERVER_URL || 'ws://localhost:8188',
          iceServers,
          features: {
            chatEnabled: true,
            screenShareEnabled: true,
            documentShareEnabled: true,
            raiseHandEnabled: true,
          },
          // Add participants information in the expected format
          participants: {
            videoroom: 'participants',
            room: activeSession.janusRoomId ?? 0,
            participants: participants || [],
          },
        },
        userRole,
        permissions: this.getUserPermissions(userRole),
      }

      this.logger.log('🚀 GenerateJoinToken: Returning response with participants:', {
        classId,
        janusRoomId: activeSession.janusRoomId,
        participantCount: participants?.length || 0,
        participants: joinTokenResponse.classInfo.participants,
      })

      return joinTokenResponse
    } catch (error) {
      this.logger.error('Failed to generate join token:', error)
      throw error instanceof Error &&
        (error instanceof NotFoundException ||
          error instanceof ForbiddenException ||
          error instanceof BadRequestException)
        ? error
        : new BadRequestException('Failed to generate join token')
    }
  }

  async startOnlineClassSession(
    sessionId: string,
    lecturerId: number,
  ): Promise<{
    sessionId: string
    roomKey: string
    startedAt: Date
    janusRoomId: number
    janusServer: string
  }> {
    try {
      const sessionIdInt = parseInt(sessionId)

      // Verify lecturer permission - find class that has the session
      const onlineClass = await this.prisma.class.findFirst({
        where: {
          sessions: {
            some: { id: sessionIdInt },
          },
        },
      })
      console.log('OnlineClass:', onlineClass)
      console.log('LecturerId:', lecturerId, 'OnlineClass LecturerId:', onlineClass?.lecturerId)
      if (!onlineClass || onlineClass.lecturerId !== lecturerId) {
        throw new ForbiddenException('Only the assigned lecturer can start this class')
      }

      // Check if there's already an unActive session
      const unActiveSession = await this.prisma.liveSession.findFirst({
        where: {
          id: sessionIdInt,
          endedAt: null,
        },
      })

      if (!unActiveSession) {
        throw new BadRequestException('Class session is already unActive')
      }

      // Create Janus room via JanusService
      const roomKey = this.generateRoomKey()
      const janusRoom = await this.janusService.createRoom({
        description: onlineClass.title,
        is_private: false,
        publishers: onlineClass.capacity,
        bitrate: 24000000,
        fir_freq: 10,
        videocodec: 'vp8',
        audiocodec: 'opus',
        record: true,
      })

      // Update this session with Janus room ID
      const session = await this.prisma.liveSession.update({
        where: { id: sessionIdInt },
        data: {
          title: onlineClass.title,
          scheduledAt: new Date(),
          mode: LiveMode.MODE2D,
          roomKey,
          janusRoomId: janusRoom.room,
        },
      })

      this.logger.log(`Started online class session ${session.id}  with Janus room ${janusRoom.room}`)

      return {
        sessionId: session.id.toString(),
        roomKey,
        startedAt: session.scheduledAt,
        janusRoomId: janusRoom.room,
        janusServer: process.env.JANUS_SERVER_URL || 'ws://localhost:8188',
      }
    } catch (error) {
      this.logger.error('Failed to start online class session:', error)
      throw error instanceof Error && (error instanceof ForbiddenException || error instanceof BadRequestException)
        ? error
        : new BadRequestException('Failed to start class session')
    }
  }

  async endOnlineClassSession(
    sessionId: string,
    lecturerId: number,
  ): Promise<{
    sessionId: string
    endedAt: Date
    duration: number
    recordingUrl?: string
    participantCount: number
  }> {
    try {
      const sessionIdInt = parseInt(sessionId)

      // Find active session
      const activeSession = await this.prisma.liveSession.findFirst({
        where: {
          id: sessionIdInt,
          endedAt: null,
        },
        include: {
          class: true,
          attendance: true,
        },
      })

      if (!activeSession) {
        throw new NotFoundException('No active session found for this class')
      }

      if (activeSession.class.lecturerId !== lecturerId) {
        throw new ForbiddenException('Only the assigned lecturer can end this class')
      }

      const endedAt = new Date()
      const duration = endedAt.getTime() - activeSession.scheduledAt.getTime()

      // Destroy Janus room if exists
      if (activeSession.janusRoomId) {
        try {
          await this.janusService.destroyRoom(activeSession.janusRoomId)
          this.logger.log(`Destroyed Janus room ${activeSession.janusRoomId}`)
        } catch (error) {
          this.logger.error(`Failed to destroy Janus room ${activeSession.janusRoomId}:`, error)
        }
      }

      // Update session
      const updatedSession = await this.prisma.liveSession.update({
        where: { id: activeSession.id },
        data: { endedAt },
      })

      // Mark all active attendees as left
      await this.prisma.attendance.updateMany({
        where: {
          sessionId: activeSession.id,
          leftAt: null,
        },
        data: {
          leftAt: endedAt,
        },
      })

      this.logger.log(`Ended online class session ${activeSession.id}`)

      return {
        sessionId: activeSession.id.toString(),
        endedAt,
        duration,
        recordingUrl: activeSession.recordingUrl || '',
        participantCount: activeSession.attendance.length,
      }
    } catch (error) {
      this.logger.error('Failed to end online class session:', error)
      throw error instanceof Error && (error instanceof NotFoundException || error instanceof ForbiddenException)
        ? error
        : new BadRequestException('Failed to end class session')
    }
  }

  async getOnlineClassParticipants(classId: string): Promise<
    Array<{
      userId: string
      displayName: string
      role: string
      joinedAt: Date
      isActive: boolean
      capabilities: any
    }>
  > {
    try {
      const classIdInt = parseInt(classId)

      const participants = await this.prisma.attendance.findMany({
        where: {
          session: {
            classId: classIdInt,
            endedAt: null, // Active session only
          },
        },
        include: {
          user: true,
        },
        orderBy: {
          joinedAt: 'asc',
        },
      })

      return participants.map((p) => ({
        userId: p.userId.toString(),
        displayName: p.user.name,
        role: p.user.role === Role.LECTURER ? 'lecturer' : 'customer',
        joinedAt: p.joinedAt,
        isActive: !p.leftAt,
        capabilities: this.getUserPermissions(p.user.role === Role.LECTURER ? 'lecturer' : 'customer'),
      }))
    } catch (error) {
      this.logger.error('Failed to get participants:', error)
      throw new BadRequestException('Failed to retrieve participants')
    }
  }

  async getJanusParticipants(classId: string): Promise<{
    videoroom: string
    room: number
    participants: any[]
  }> {
    try {
      const classIdInt = parseInt(classId)

      // Get the active session with Janus room ID
      const activeSession = await this.prisma.liveSession.findFirst({
        where: {
          classId: classIdInt,
          endedAt: null,
        },
      })

      if (!activeSession || !activeSession.janusRoomId) {
        return {
          videoroom: 'participants',
          room: 0,
          participants: [],
        }
      }

      // Get participants from Janus
      let janusParticipants: any[] = []
      try {
        this.logger.log(`🔍 Querying participants for Janus room: ${activeSession.janusRoomId}`)

        // Create a temporary session to query participants
        const tempSessionId = await this.janusService.createSession()
        this.logger.log(`📱 Created temp session: ${tempSessionId}`)

        if (tempSessionId) {
          const tempHandleId = await this.janusService.attachPlugin(tempSessionId, 'janus.plugin.videoroom')
          this.logger.log(`🔗 Attached plugin with handle: ${tempHandleId}`)

          if (tempHandleId) {
            janusParticipants = await this.janusService.listParticipants(
              tempSessionId,
              tempHandleId,
              activeSession.janusRoomId,
            )
            this.logger.log(`👥 Raw Janus participants response:`, JSON.stringify(janusParticipants, null, 2))

            // Clean up temp session
            await this.janusService.destroySession(tempSessionId)
            this.logger.log(`🧹 Cleaned up temp session: ${tempSessionId}`)
          } else {
            this.logger.warn('⚠️ Failed to attach plugin - no handle ID received')
          }
        } else {
          this.logger.warn('⚠️ Failed to create temp session for participants query')
        }
      } catch (error) {
        this.logger.error('❌ Failed to get participants from Janus:', error)
        // Return empty participants if Janus query fails
      }

      return {
        videoroom: 'participants',
        room: activeSession.janusRoomId,
        participants: janusParticipants,
      }
    } catch (error) {
      this.logger.error('Failed to get Janus participants:', error)
      throw new BadRequestException('Failed to retrieve Janus participants')
    }
  }

  async getJanusConnectionInfo(classId: string): Promise<{
    janusServer: string
    janusRoomId: number | null
    iceServers: Array<{
      urls: string
      username?: string
      credential?: string
    }>
    participants: {
      videoroom: string
      room: number
      participants: any[]
    }
  }> {
    try {
      const classIdInt = parseInt(classId)

      // Get the active session
      const activeSession = await this.prisma.liveSession.findFirst({
        where: {
          classId: classIdInt,
          endedAt: null,
        },
        include: {
          class: {
            include: {
              lecturer: true,
            },
          },
        },
      })

      if (!activeSession) {
        throw new NotFoundException('No active session found for this class')
      }

      // Get participants information
      const participantsInfo = await this.getJanusParticipants(classId)

      // Prepare ICE servers
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

      return {
        janusServer: process.env.JANUS_SERVER_URL || 'wss://janus.torii-nihongo-gakuin.io.vn/ws',
        janusRoomId: activeSession.janusRoomId,
        iceServers,
        participants: participantsInfo,
      }
    } catch (error) {
      this.logger.error('Failed to get Janus connection info:', error)
      throw error instanceof NotFoundException
        ? error
        : new BadRequestException('Failed to retrieve Janus connection info')
    }
  }

  // Additional methods for recording, document sharing, participant actions, and analytics would go here
  // Due to length constraints, I'm providing the core structure

  private async checkClassAccess(classId: number, userId: number): Promise<boolean> {
    // Check if user is the lecturer
    const isLecturer = await this.prisma.class.findFirst({
      where: {
        id: classId,
        lecturerId: userId,
      },
    })

    if (isLecturer) return true

    // Check if user is enrolled in the associated course
    console.log('Checking enrollment for user:', userId, 'in class:', classId)

    // First get the class to find its courseId
    const classInfo = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { courseId: true },
    })

    if (!classInfo?.courseId) {
      // If class has no associated course, it might be a standalone class
      // Allow access for now, but this should be handled based on your business logic
      console.log('Class has no associated course, allowing access')
      return true
    }

    // Check if user is enrolled in the specific course that this class belongs to
    const isEnrolled = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: classInfo.courseId,
      },
    })
    console.log('Enrollment check result:', isEnrolled)

    return !!isEnrolled
  }

  private getUserPermissions(role: 'lecturer' | 'customer') {
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

  private generateRoomKey(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private async notifyStudentsClassStarted(classId: number, classTitle: string): Promise<void> {
    try {
      // Get all enrolled students
      const enrolledStudents = await this.prisma.enrollment.findMany({
        where: {
          course: {
            Class: {
              some: { id: classId },
            },
          },
        },
        select: {
          userId: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })

      // Send notifications to each student
      for (const enrollment of enrolledStudents) {
        await this.notificationService.create({
          userId: enrollment.userId,
          type: 'SYSTEM',
          title: 'Class Started',
          message: `${classTitle} has started. Join now!`,
          priority: 'HIGH',
          entityId: classId,
          entityType: 'CLASS',
        })
      }

      this.logger.log(`Notified ${enrolledStudents.length} students about class ${classId} starting`)
    } catch (error) {
      this.logger.error('Failed to notify students:', error)
      // Don't throw error, just log it
    }
  }

  // Placeholder methods for additional functionality
  async startRecording(classId: string, lecturerId: number, options: StartRecordingDto): Promise<any> {
    // Verify class exists and lecturer has permission
    const onlineClass = await this.prisma.class.findUnique({
      where: { id: Number.parseInt(classId) },
      include: { lecturer: true },
    })

    if (!onlineClass) {
      throw new BadRequestException('Class not found')
    }

    if (onlineClass.lecturerId !== lecturerId) {
      throw new BadRequestException('Only the class lecturer can start recording')
    }

    // Get current session
    const currentSession = await this.prisma.liveSession.findFirst({
      where: {
        classId: Number.parseInt(classId),
        endedAt: null,
      },
      orderBy: { scheduledAt: 'desc' },
    })

    if (!currentSession) {
      throw new BadRequestException('No active session found for this class')
    }

    // Generate recording ID and filename
    const recordingId = `rec_${classId}_${currentSession.id}_${Date.now()}`
    const filename = options.filename || `class_${classId}_${new Date().toISOString()}.webm`

    // Store recording metadata in database
    // Note: You may need to create a Recording table in your schema
    // For now, we'll return the metadata
    const recordingMetadata = {
      recordingId,
      filename,
      startedAt: new Date().toISOString(),
      options: {
        includeVideo: options.includeVideo ?? true,
        includeAudio: options.includeAudio ?? true,
        quality: options.quality ?? 'medium',
        maxDurationMinutes: options.maxDurationMinutes ?? 120,
      },
      classId,
      sessionId: currentSession.id,
      lecturerId,
    }

    this.logger.log(`Recording started for class ${classId}: ${recordingId}`)

    return recordingMetadata
  }

  async stopRecording(classId: string, lecturerId: number): Promise<any> {
    // Verify class exists and lecturer has permission
    const onlineClass = await this.prisma.class.findUnique({
      where: { id: Number.parseInt(classId) },
    })

    if (!onlineClass) {
      throw new BadRequestException('Class not found')
    }

    if (onlineClass.lecturerId !== lecturerId) {
      throw new BadRequestException('Only the class lecturer can stop recording')
    }

    // Return stop metadata
    // Frontend will upload the actual recording
    const stoppedAt = new Date().toISOString()

    this.logger.log(`Recording stopped for class ${classId}`)

    return {
      recordingId: `rec_${classId}_${Date.now()}`,
      stoppedAt,
      message: 'Recording stopped. Upload the recording data to complete the process.',
    }
  }

  async getRecordingUploadUrl(
    classId: string,
    lecturerId: number,
    data: { recordingId: string; filename: string },
  ): Promise<any> {
    // Verify class exists and lecturer has permission
    const onlineClass = await this.prisma.class.findUnique({
      where: { id: Number.parseInt(classId) },
    })

    if (!onlineClass) {
      throw new BadRequestException('Class not found')
    }

    if (onlineClass.lecturerId !== lecturerId) {
      throw new BadRequestException('Only the class lecturer can upload recordings')
    }

    // Generate presigned upload URL
    const uploadUrlData = await this.s3Service.generateRecordingUploadUrl(
      classId,
      data.recordingId,
      data.filename,
      'video/webm',
      3600, // 1 hour expiry
    )

    this.logger.log(`Generated presigned upload URL for class ${classId}`)

    return {
      uploadUrl: uploadUrlData.uploadUrl,
      publicUrl: uploadUrlData.publicUrl,
      key: uploadUrlData.key,
      expiresIn: uploadUrlData.expiresIn,
    }
  }

  async confirmRecordingUpload(
    classId: string,
    lecturerId: number,
    data: { recordingId: string; recordingUrl: string },
  ): Promise<any> {
    // Verify class exists and lecturer has permission
    const onlineClass = await this.prisma.class.findUnique({
      where: { id: Number.parseInt(classId) },
    })

    if (!onlineClass) {
      throw new BadRequestException('Class not found')
    }

    if (onlineClass.lecturerId !== lecturerId) {
      throw new BadRequestException('Only the class lecturer can confirm recordings')
    }

    this.logger.log(`Recording confirmed for class ${classId}: ${data.recordingUrl}`)

    // Update session with recording URL
    const currentSession = await this.prisma.liveSession.findFirst({
      where: {
        classId: Number.parseInt(classId),
        endedAt: null,
      },
      orderBy: { scheduledAt: 'desc' },
    })

    if (currentSession) {
      await this.prisma.liveSession.update({
        where: { id: currentSession.id },
        data: { recordingUrl: data.recordingUrl },
      })
    }

    return {
      recordingUrl: data.recordingUrl,
      recordingId: data.recordingId,
      uploadedAt: new Date().toISOString(),
      sessionId: currentSession?.id,
    }
  }

  getClassRecordings(classId: string, userId: number): any[] {
    // Implementation for getting recordings from database
    // This would query a Recording table
    return []
  }

  shareDocument(classId: string, lecturerId: number, document: ShareDocumentDto): any {
    // Implementation for sharing documents
    throw new BadRequestException('Document sharing functionality not implemented yet')
  }

  getSharedDocuments(classId: string, userId: number): any[] {
    // Implementation for getting shared documents
    return []
  }

  performParticipantAction(
    classId: string,
    participantId: string,
    action: ParticipantActionDto,
    lecturerId: number,
  ): any {
    // Implementation for participant actions
    throw new BadRequestException('Participant control functionality not implemented yet')
  }

  getClassAnalytics(classId: string, lecturerId: number): ClassAnalyticsDto {
    // Implementation for class analytics
    throw new BadRequestException('Analytics functionality not implemented yet')
  }
  async getMyEnrolledOnlineClass(userId: number) {
    try {
      // Get all courses the user is enrolled in
      const enrollments = await this.prisma.enrollment.findMany({
        where: { userId },
        select: { courseId: true },
      })

      const enrolledCourseIds = enrollments.map((e) => e.courseId)

      if (enrolledCourseIds.length === 0) {
        return []
      }
      const enrolledClass = await this.prisma.classMember.findMany({
        where: {
          userId: userId,
        },
        select: {
          classId: true,
        },
      })
      const enrolledClassIds = enrolledClass.map((c) => c.classId)
      // Get all classes for enrolled courses
      const classes = await this.prisma.class.findMany({
        where: {
          courseId: { in: enrolledCourseIds },
          id: { in: enrolledClassIds },
          isActive: true,
        },
        include: {
          lecturer: {
            select: {
              id: true,
              name: true,
              email: true,
              lecturerProfile: {
                select: {
                  name: true,
                  bio: true,
                  avatar: true,
                },
              },
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              level: true,
              thumbnailUrl: true,
            },
          },
          sessions: true,
          _count: {
            select: {
              sessions: true,
              members: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return classes
    } catch (error) {
      this.logger.error('Failed to get enrolled online classes:', error)
      throw new BadRequestException('Failed to retrieve enrolled online classes')
    }
  }
  async getMyAssignedOnlineClasses(userId: number) {
    try {
      // Get all classes where the user is the lecturer
      const classes = await this.prisma.class.findMany({
        where: { lecturerId: userId, isActive: true },
        include: {
          lecturer: {
            select: {
              id: true,
              name: true,
              email: true,
              lecturerProfile: {
                select: {
                  name: true,
                  bio: true,
                  avatar: true,
                },
              },
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              level: true,
              thumbnailUrl: true,
            },
          },
          sessions: {
            orderBy: { scheduledAt: 'asc' },
          },
          _count: {
            select: {
              sessions: true,
              members: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return classes
    } catch (error) {
      this.logger.error('Failed to get assigned online classes:', error)
      throw new BadRequestException('Failed to retrieve assigned online classes')
    }
  }
  async getAllOnlineClasses() {
    try {
      const classes = await this.prisma.class.findMany({
        include: {
          lecturer: {
            select: {
              id: true,
              name: true,
              email: true,
              lecturerProfile: {
                select: {
                  name: true,
                  bio: true,
                  avatar: true,
                },
              },
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              level: true,
              thumbnailUrl: true,
            },
          },
          sessions: {
            orderBy: { scheduledAt: 'asc' },
          },
          _count: {
            select: {
              sessions: true,
              members: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return classes
    } catch (error) {
      this.logger.error('Failed to get assigned online classes:', error)
      throw new BadRequestException('Failed to retrieve assigned online classes')
    }
  }
}
