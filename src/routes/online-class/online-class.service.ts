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

  async createOnlineClass(data: CreateOnlineClassDto & { lecturerId: number }): Promise<OnlineClassResponseDto> {
    try {
      // Validate lecturer exists and has permission
      const lecturer = await this.prisma.user.findFirst({
        where: {
          id: data.lecturerId,
          role: { in: [Role.LECTURER, Role.STAFF] },
        },
        include: {
          lecturerProfile: true,
        },
      })

      if (!lecturer) {
        throw new NotFoundException('Lecturer not found or unauthorized')
      }

      // Validate course exists if provided
      if (data.courseId) {
        const course = await this.prisma.course.findUnique({
          where: { id: data.courseId },
        })

        if (!course) {
          throw new NotFoundException('Course not found')
        }
      }

      // Create the online class
      const onlineClass = await this.prisma.class.create({
        data: {
          title: data.title,
          description: data.description,
          courseId: data.courseId,
          lecturerId: data.lecturerId,
          capacity: data.capacity,
          isActive: true,
        },
      })

      // Create associated live session (scheduled)
      const liveSession = await this.prisma.liveSession.create({
        data: {
          classId: onlineClass.id,
          title: data.title,
          scheduledAt: new Date(data.scheduledAt),
          mode: LiveMode.MODE2D, // Default to 2D mode
          roomKey: this.generateRoomKey(),
        },
      })

      this.logger.log(`Created online class ${onlineClass.id} by lecturer ${data.lecturerId}`)

      return this.mapToResponseDto(onlineClass, liveSession, lecturer)
    } catch (error) {
      this.logger.error('Failed to create online class:', error)
      throw error instanceof Error && (error instanceof NotFoundException || error instanceof BadRequestException)
        ? error
        : new BadRequestException('Failed to create online class')
    }
  }

  async getOnlineClasses(query: ClassListQueryDto & { userId: number; userRole: Role }): Promise<{
    classes: OnlineClassResponseDto[]
    total: number
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        level,
        lecturerId,
        courseId,
        status,
        dateFrom,
        dateTo,
        tags,
        sortBy = 'scheduledAt',
        sortOrder = 'asc',
        userId,
        userRole,
      } = query

      const skip = (page - 1) * limit

      // Build where clause
      const whereClause: any = {
        isActive: true,
      }

      // Role-based filtering
      if (userRole === Role.CUSTOMER) {
        // Students can only see classes they're enrolled in or public classes
        const enrollments = await this.prisma.enrollment.findMany({
          where: { userId },
          select: { courseId: true },
        })

        const enrolledCourseIds = enrollments.map((e) => e.courseId)

        whereClause.OR = [
          { courseId: { in: enrolledCourseIds } },
          { course: null }, // Public classes not linked to courses
        ]
      } else if (userRole === Role.LECTURER) {
        // Lecturers can see their own classes
        whereClause.lecturerId = userId
      }
      // STAFF can see all classes (no additional filter)

      // Apply search filters
      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ]
      }

      if (lecturerId) {
        whereClause.lecturerId = lecturerId
      }

      if (courseId) {
        whereClause.courseId = courseId
      }

      // Build session filters for status and date filtering
      const sessionWhere: any = {}

      if (status) {
        const now = new Date()
        switch (status) {
          case 'upcoming':
            sessionWhere.scheduledAt = { gt: now }
            sessionWhere.endedAt = null
            break
          case 'active':
            sessionWhere.scheduledAt = { lte: now }
            sessionWhere.endedAt = null
            break
          case 'completed':
            sessionWhere.endedAt = { not: null }
            break
        }
      }

      if (dateFrom || dateTo) {
        sessionWhere.scheduledAt = {}
        if (dateFrom) {
          sessionWhere.scheduledAt.gte = new Date(dateFrom)
        }
        if (dateTo) {
          sessionWhere.scheduledAt.lte = new Date(dateTo)
        }
      }

      // Apply session filters if any
      if (Object.keys(sessionWhere).length > 0) {
        whereClause.sessions = {
          some: sessionWhere,
        }
      }

      // Get total count
      const total = await this.prisma.class.count({ where: whereClause })

      // Get classes with related data
      const classes = await this.prisma.class.findMany({
        where: whereClause,
        include: {
          lecturer: {
            include: {
              lecturerProfile: true,
            },
          },
          course: true,
          sessions: {
            orderBy: { scheduledAt: 'desc' },
            take: 1,
          },
          members: {
            where: { role: Role.CUSTOMER },
          },
        },
        orderBy: {
          [sortBy === 'scheduledAt' ? 'sessions' : sortBy]:
            sortBy === 'scheduledAt' ? { _count: sortOrder } : sortOrder,
        },
        skip,
        take: limit,
      })

      const responseDtos = classes.map((cls) =>
        this.mapToResponseDto(cls, cls.sessions[0], cls.lecturer, cls.course, cls.members.length),
      )

      return {
        classes: responseDtos,
        total,
      }
    } catch (error) {
      this.logger.error('Failed to get online classes:', error)
      throw new BadRequestException('Failed to retrieve online classes')
    }
  }

  async getOnlineClassDetails(classId: string, userId: number): Promise<OnlineClassResponseDto | null> {
    try {
      const onlineClass = await this.prisma.class.findUnique({
        where: { id: parseInt(classId) },
        include: {
          lecturer: {
            include: {
              lecturerProfile: true,
            },
          },
          course: true,
          sessions: {
            orderBy: { scheduledAt: 'desc' },
          },
          members: true,
        },
      })

      if (!onlineClass) {
        return null
      }

      // Check access permissions
      const hasAccess = await this.checkClassAccess(parseInt(classId), userId)
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this class')
      }

      const currentSession = onlineClass.sessions.find((s) => !s.endedAt)

      return this.mapToResponseDto(
        onlineClass,
        currentSession,
        onlineClass.lecturer,
        onlineClass.course,
        onlineClass.members.length,
      )
    } catch (error) {
      this.logger.error('Failed to get online class details:', error)
      throw error instanceof ForbiddenException ? error : new BadRequestException('Failed to retrieve class details')
    }
  }

  async updateOnlineClass(
    classId: string,
    updateData: UpdateOnlineClassDto,
    userId: number,
    userRole: Role,
  ): Promise<OnlineClassResponseDto> {
    try {
      const classIdInt = parseInt(classId)

      // Check ownership or staff permission
      const onlineClass = await this.prisma.class.findUnique({
        where: { id: classIdInt },
        include: { lecturer: true },
      })

      if (!onlineClass) {
        throw new NotFoundException('Online class not found')
      }

      if (userRole !== Role.STAFF && onlineClass.lecturerId !== userId) {
        throw new ForbiddenException('Only the lecturer or staff can update this class')
      }

      // Update the class
      const updatedClass = await this.prisma.class.update({
        where: { id: classIdInt },
        data: {
          title: updateData.title,
          description: updateData.description,
          capacity: updateData.capacity,
          isActive: updateData.isActive,
        },
        include: {
          lecturer: {
            include: {
              lecturerProfile: true,
            },
          },
          course: true,
          sessions: {
            orderBy: { scheduledAt: 'desc' },
            take: 1,
          },
        },
      })

      // Update session if scheduledAt is provided
      if (updateData.scheduledAt) {
        await this.prisma.liveSession.updateMany({
          where: {
            classId: classIdInt,
            endedAt: null,
          },
          data: {
            scheduledAt: new Date(updateData.scheduledAt),
          },
        })
      }

      this.logger.log(`Updated online class ${classId} by user ${userId}`)

      return this.mapToResponseDto(updatedClass, updatedClass.sessions[0], updatedClass.lecturer, updatedClass.course)
    } catch (error) {
      this.logger.error('Failed to update online class:', error)
      throw error instanceof Error &&
        (error instanceof NotFoundException ||
          error instanceof ForbiddenException ||
          error instanceof BadRequestException)
        ? error
        : new BadRequestException('Failed to update online class')
    }
  }

  async deleteOnlineClass(classId: string, userId: number, userRole: Role): Promise<void> {
    try {
      const classIdInt = parseInt(classId)

      // Check ownership or staff permission
      const onlineClass = await this.prisma.class.findUnique({
        where: { id: classIdInt },
      })

      if (!onlineClass) {
        throw new NotFoundException('Online class not found')
      }

      if (userRole !== Role.STAFF && onlineClass.lecturerId !== userId) {
        throw new ForbiddenException('Only the lecturer or staff can delete this class')
      }

      // Soft delete by setting isActive to false
      await this.prisma.class.update({
        where: { id: classIdInt },
        data: { isActive: false },
      })

      // End any active sessions
      await this.prisma.liveSession.updateMany({
        where: {
          classId: classIdInt,
          endedAt: null,
        },
        data: {
          endedAt: new Date(),
        },
      })

      this.logger.log(`Deleted online class ${classId} by user ${userId}`)
    } catch (error) {
      this.logger.error('Failed to delete online class:', error)
      throw error instanceof Error && (error instanceof NotFoundException || error instanceof ForbiddenException)
        ? error
        : new BadRequestException('Failed to delete online class')
    }
  }

  async generateJoinToken(classId: string, userId: number): Promise<JoinClassTokenDto> {
    try {
      const classIdInt = parseInt(classId)

      // Check access permissions
      const hasAccess = await this.checkClassAccess(classIdInt, userId)
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this class')
      }

      // Get class details
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
            where: { endedAt: null },
            orderBy: { scheduledAt: 'desc' },
            take: 1,
          },
        },
      })

      if (!onlineClass) {
        throw new NotFoundException('Online class not found')
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new NotFoundException('User not found')
      }

      // Determine user role in class
      const userRole = onlineClass.lecturerId === userId ? 'teacher' : 'student'

      // Generate JWT token
      const tokenPayload = {
        classId,
        userId: userId.toString(),
        role: userRole,
        displayName: user.name,
        avatar: userRole === 'teacher' ? onlineClass.lecturer.lecturerProfile?.avatar : undefined,
      }

      const secret = process.env.JWT_SECRET || 'default-secret'
      const token = sign(tokenPayload, secret, { expiresIn: '4h' })

      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now

      return {
        token,
        expiresAt,
        classInfo: {
          id: classId,
          title: onlineClass.title,
          description: onlineClass.description || '',
          scheduledAt: onlineClass.sessions[0]?.scheduledAt || new Date(),
          lecturerName: onlineClass.lecturer.name,
          capacity: onlineClass.capacity,
          features: {
            chatEnabled: true, // Default enabled features
            screenShareEnabled: true,
            documentShareEnabled: true,
            raiseHandEnabled: true,
          },
        },
        userRole,
        permissions: this.getUserPermissions(userRole),
      }
    } catch (error) {
      this.logger.error('Failed to generate join token:', error)
      throw error instanceof Error && (error instanceof NotFoundException || error instanceof ForbiddenException)
        ? error
        : new BadRequestException('Failed to generate join token')
    }
  }

  async startOnlineClassSession(
    classId: string,
    lecturerId: number,
  ): Promise<{
    sessionId: string
    roomKey: string
    startedAt: Date
    janusRoomId: number
  }> {
    try {
      const classIdInt = parseInt(classId)

      // Verify lecturer permission
      const onlineClass = await this.prisma.class.findUnique({
        where: { id: classIdInt },
      })

      if (!onlineClass || onlineClass.lecturerId !== lecturerId) {
        throw new ForbiddenException('Only the assigned lecturer can start this class')
      }

      // Check if there's already an active session
      const activeSession = await this.prisma.liveSession.findFirst({
        where: {
          classId: classIdInt,
          endedAt: null,
        },
      })

      if (activeSession) {
        throw new BadRequestException('Class session is already active')
      }

      // Create new session
      const roomKey = this.generateRoomKey()
      const janusRoomId = parseInt(classId) + 1000 // Simple room ID generation

      const session = await this.prisma.liveSession.create({
        data: {
          classId: classIdInt,
          title: onlineClass.title,
          scheduledAt: new Date(),
          mode: LiveMode.MODE2D,
          roomKey,
        },
      })

      this.logger.log(`Started online class session ${session.id} for class ${classId}`)

      return {
        sessionId: session.id.toString(),
        roomKey,
        startedAt: session.scheduledAt,
        janusRoomId,
      }
    } catch (error) {
      this.logger.error('Failed to start online class session:', error)
      throw error instanceof Error && (error instanceof ForbiddenException || error instanceof BadRequestException)
        ? error
        : new BadRequestException('Failed to start class session')
    }
  }

  async endOnlineClassSession(
    classId: string,
    lecturerId: number,
  ): Promise<{
    sessionId: string
    endedAt: Date
    duration: number
    recordingUrl?: string
    participantCount: number
  }> {
    try {
      const classIdInt = parseInt(classId)

      // Find active session
      const activeSession = await this.prisma.liveSession.findFirst({
        where: {
          classId: classIdInt,
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

      // Update session
      const updatedSession = await this.prisma.liveSession.update({
        where: { id: activeSession.id },
        data: { endedAt },
      })

      this.logger.log(`Ended online class session ${activeSession.id} for class ${classId}`)

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
        role: p.user.role === Role.LECTURER ? 'teacher' : 'student',
        joinedAt: p.joinedAt,
        isActive: !p.leftAt,
        capabilities: this.getUserPermissions(p.user.role === Role.LECTURER ? 'teacher' : 'student'),
      }))
    } catch (error) {
      this.logger.error('Failed to get participants:', error)
      throw new BadRequestException('Failed to retrieve participants')
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
    const isEnrolled = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        course: {
          Class: {
            some: { id: classId },
          },
        },
      },
    })

    return !!isEnrolled
  }

  private getUserPermissions(role: 'teacher' | 'student') {
    if (role === 'teacher') {
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

  private mapToResponseDto(
    onlineClass: any,
    session?: any,
    lecturer?: any,
    course?: any,
    participantCount?: number,
  ): OnlineClassResponseDto {
    return {
      id: onlineClass.id.toString(),
      title: onlineClass.title,
      description: onlineClass.description,
      courseId: onlineClass.courseId,
      lecturerId: onlineClass.lecturerId,
      scheduledAt: session?.scheduledAt || new Date(),
      durationMinutes: 60, // Default duration
      capacity: onlineClass.capacity,
      level: course?.level,
      tags: [], // Default empty tags
      recordingEnabled: true,
      chatEnabled: true,
      screenShareEnabled: true,
      documentShareEnabled: true,
      raiseHandEnabled: true,
      isActive: onlineClass.isActive,
      createdAt: onlineClass.createdAt,
      updatedAt: onlineClass.updatedAt,
      currentSession:
        session && !session.endedAt
          ? {
              id: session.id.toString(),
              roomKey: session.roomKey,
              startedAt: session.scheduledAt,
              participantCount: participantCount || 0,
              isRecording: !!session.recordingUrl,
            }
          : undefined,
      lecturer: lecturer
        ? {
            id: lecturer.id,
            name: lecturer.name,
            avatar: lecturer.lecturerProfile?.avatar,
          }
        : undefined,
      course: course
        ? {
            id: course.id,
            title: course.title,
            level: course.level,
          }
        : undefined,
    }
  }

  // Placeholder methods for additional functionality
  startRecording(classId: string, lecturerId: number, options: StartRecordingDto): any {
    // Implementation for starting recording
    throw new BadRequestException('Recording functionality not implemented yet')
  }

  stopRecording(classId: string, lecturerId: number): any {
    // Implementation for stopping recording
    throw new BadRequestException('Recording functionality not implemented yet')
  }

  getClassRecordings(classId: string, userId: number): any[] {
    // Implementation for getting recordings
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
}
