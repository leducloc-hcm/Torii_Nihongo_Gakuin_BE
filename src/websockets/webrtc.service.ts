import { Injectable, Logger } from '@nestjs/common'
import { JanusService } from './janus/janus.service'

export interface ClassSession {
  classId: string
  janusRoomId: number
  teacherId?: string
  participants: Map<string, ParticipantInfo>
  isRecording: boolean
  recordingId?: string
  startTime: Date
  endTime?: Date
}

export interface ParticipantInfo {
  userId: string
  displayName: string
  role: 'teacher' | 'student'
  sessionId: number
  handleId: number
  isPublishing: boolean
  joinTime: Date
}

@Injectable()
export class WebRtcService {
  private readonly logger = new Logger(WebRtcService.name)
  private readonly activeSessions = new Map<string, ClassSession>()
  private readonly userSessions = new Map<string, string>() // userId -> classId

  constructor(private readonly janusService: JanusService) {}

  createClassSession(classId: string, teacherId: string): ClassSession {
    if (this.activeSessions.has(classId)) {
      throw new Error(`Class session ${classId} already exists`)
    }

    const janusRoomId = parseInt(classId)
    const session: ClassSession = {
      classId,
      janusRoomId,
      teacherId,
      participants: new Map(),
      isRecording: false,
      startTime: new Date(),
    }

    this.activeSessions.set(classId, session)
    this.logger.log(`Created class session ${classId} with teacher ${teacherId}`)

    return session
  }

  async joinClassSession(
    classId: string,
    userId: string,
    displayName: string,
    role: 'teacher' | 'student',
    sessionId: number,
    handleId: number,
  ): Promise<boolean> {
    let session = this.activeSessions.get(classId)

    if (!session && role === 'teacher') {
      // Create new session if teacher is joining
      session = this.createClassSession(classId, userId)
    } else if (!session) {
      throw new Error(`Class session ${classId} does not exist`)
    }

    // Check if user is already in another class
    const existingClassId = this.userSessions.get(userId)
    if (existingClassId && existingClassId !== classId) {
      await this.leaveClassSession(existingClassId, userId)
    }

    // Add participant to session
    const participant: ParticipantInfo = {
      userId,
      displayName,
      role,
      sessionId,
      handleId,
      isPublishing: false,
      joinTime: new Date(),
    }

    session.participants.set(userId, participant)
    this.userSessions.set(userId, classId)

    this.logger.log(`User ${userId} joined class ${classId} as ${role}`)
    return true
  }

  async leaveClassSession(classId: string, userId: string): Promise<void> {
    const session = this.activeSessions.get(classId)
    if (!session) {
      return
    }

    const participant = session.participants.get(userId)
    if (!participant) {
      return
    }

    // Clean up participant
    session.participants.delete(userId)
    this.userSessions.delete(userId)

    // If teacher left, end the session
    if (participant.role === 'teacher') {
      await this.endClassSession(classId)
    } else if (session.participants.size === 0) {
      // No participants left, clean up session
      this.activeSessions.delete(classId)
    }

    this.logger.log(`User ${userId} left class ${classId}`)
  }

  async startRecording(classId: string): Promise<string | null> {
    const session = this.activeSessions.get(classId)
    if (!session || session.isRecording) {
      return null
    }

    try {
      const recordingId = await this.janusService.startRecording(
        0, // Will be updated with actual session/handle
        0,
        session.janusRoomId,
        `class_${classId}_${Date.now()}`,
      )

      if (recordingId) {
        session.isRecording = true
        session.recordingId = recordingId
        this.logger.log(`Started recording for class ${classId}: ${recordingId}`)
        return recordingId
      }
    } catch (error) {
      this.logger.error(`Failed to start recording for class ${classId}:`, error)
    }

    return null
  }

  async stopRecording(classId: string): Promise<boolean> {
    const session = this.activeSessions.get(classId)
    if (!session || !session.isRecording || !session.recordingId) {
      return false
    }

    try {
      const success = await this.janusService.stopRecording(
        0, // Will be updated with actual session/handle
        0,
        session.janusRoomId,
        session.recordingId,
      )

      if (success) {
        session.isRecording = false
        this.logger.log(`Stopped recording for class ${classId}: ${session.recordingId}`)
        return true
      }
    } catch (error) {
      this.logger.error(`Failed to stop recording for class ${classId}:`, error)
    }

    return false
  }

  async endClassSession(classId: string): Promise<void> {
    const session = this.activeSessions.get(classId)
    if (!session) {
      return
    }

    // Stop recording if active
    if (session.isRecording) {
      await this.stopRecording(classId)
    }

    // Clean up all participants
    for (const [userId, participant] of session.participants) {
      this.userSessions.delete(userId)
    }

    session.endTime = new Date()
    this.activeSessions.delete(classId)

    this.logger.log(`Ended class session ${classId}`)
  }

  getClassSession(classId: string): ClassSession | undefined {
    return this.activeSessions.get(classId)
  }

  getActiveClassSessions(): ClassSession[] {
    return Array.from(this.activeSessions.values())
  }

  getParticipantCount(classId: string): number {
    const session = this.activeSessions.get(classId)
    return session?.participants.size || 0
  }

  isUserInClass(userId: string): string | null {
    return this.userSessions.get(userId) || null
  }

  validateClassCapacity(classId: string): boolean {
    const maxCapacity = 50
    const currentCount = this.getParticipantCount(classId)
    return currentCount < maxCapacity
  }
}
