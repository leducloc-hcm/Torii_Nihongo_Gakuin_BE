import { Injectable, Logger } from '@nestjs/common'
import { createEvents, EventAttributes } from 'ics'
import { PrismaService } from 'src/shared/services/prisma.service'

interface LiveSessionCalendarEvent {
  id: number
  title: string
  scheduledAt: Date
  durationMinutes: number
  description?: string
  location?: string
  lecturerName: string
  classTitle: string
}

interface CalendarGenerationResult {
  success: boolean
  calendarData?: string
  events?: LiveSessionCalendarEvent[]
  errorMessage?: string
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate Google Calendar (.ics) file for all live sessions in a class
   */
  async generateClassCalendar(classId: number, userId: number): Promise<CalendarGenerationResult> {
    try {
      // First, verify user has access to this class
      const classMember = await this.prisma.classMember.findUnique({
        where: {
          classId_userId: {
            classId,
            userId,
          },
        },
      })

      if (!classMember) {
        return {
          success: false,
          errorMessage: 'User does not have access to this class',
        }
      }

      // Fetch class details and all live sessions
      const classDetails = await this.prisma.class.findUnique({
        where: { id: classId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          lecturer: {
            select: {
              id: true,
              name: true,
            },
          },
          sessions: {
            where: {
              scheduledAt: {
                gte: new Date(), // Only future sessions
              },
            },
            orderBy: {
              scheduledAt: 'asc',
            },
            select: {
              id: true,
              title: true,
              scheduledAt: true,
              mode: true,
              roomKey: true,
            },
          },
        },
      })

      if (!classDetails) {
        return {
          success: false,
          errorMessage: 'Class not found',
        }
      }

      if (classDetails.sessions.length === 0) {
        return {
          success: false,
          errorMessage: 'No upcoming live sessions found for this class',
        }
      }

      // Transform sessions into calendar events
      const events: LiveSessionCalendarEvent[] = classDetails.sessions.map((session) => ({
        id: session.id,
        title: session.title,
        scheduledAt: session.scheduledAt,
        durationMinutes: 120, // Default duration, could be made configurable
        description: `Live session for ${classDetails.title}`,
        location: `Online - Room: ${session.roomKey}`,
        lecturerName: classDetails.lecturer.name,
        classTitle: classDetails.title,
      }))

      // Generate ICS events
      const icsEvents: EventAttributes[] = events.map((event) => {
        const startDate = event.scheduledAt
        const endDate = new Date(startDate.getTime() + event.durationMinutes * 60 * 1000)

        return {
          start: [
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            startDate.getDate(),
            startDate.getHours(),
            startDate.getMinutes(),
          ] as [number, number, number, number, number],
          end: [
            endDate.getFullYear(),
            endDate.getMonth() + 1,
            endDate.getDate(),
            endDate.getHours(),
            endDate.getMinutes(),
          ] as [number, number, number, number, number],
          title: event.title,
          description: [
            `📚 Class: ${event.classTitle}`,
            `👨‍🏫 Lecturer: ${event.lecturerName}`,
            `📍 Location: ${event.location}`,
            ``,
            `Join the live session at the scheduled time.`,
            ``,
            `🌸 Torii Nihongo Gakuin`,
          ].join('\n'),
          location: event.location,
          url: `https://torii-nihongo-gakuin.io.vn/customer/online-class/${classId}/sessions`,
          status: 'CONFIRMED' as const,
          busyStatus: 'BUSY' as const,
          organizer: {
            name: event.lecturerName,
            email: 'noreply@torii-nihongo-gakuin.io.vn',
          },
          attendees: [
            {
              name: 'Torii Student',
              email: 'student@toriinihongo.vn',
              rsvp: true,
              partstat: 'ACCEPTED' as const,
              role: 'REQ-PARTICIPANT' as const,
            },
          ],
          classification: 'PUBLIC' as const,
          uid: `torii-session-${event.id}-${classId}@toriinihongo.vn`,
          alarms: [
            {
              action: 'display' as const,
              description: `Live session "${event.title}" starts in 15 minutes`,
              trigger: {
                before: true,
                minutes: 15,
              },
            },
            {
              action: 'display' as const,
              description: `Live session "${event.title}" starts in 5 minutes`,
              trigger: {
                before: true,
                minutes: 5,
              },
            },
          ],
        }
      })

      // Generate the calendar file
      const { error, value } = createEvents(icsEvents)

      if (error) {
        this.logger.error(`Failed to generate calendar: ${error.message}`)
        return {
          success: false,
          errorMessage: 'Failed to generate calendar file',
        }
      }

      this.logger.log(`Generated calendar for class ${classId} with ${events.length} sessions`)

      return {
        success: true,
        calendarData: value,
        events,
      }
    } catch (error) {
      this.logger.error(`Error generating class calendar: ${error.message}`, error.stack)
      return {
        success: false,
        errorMessage: 'An unexpected error occurred while generating the calendar',
      }
    }
  }

  /**
   * Get live sessions for a specific class and course
   */
  async getClassLiveSessions(classId: number, courseId?: number): Promise<LiveSessionCalendarEvent[]> {
    try {
      const where: any = {
        classId,
        scheduledAt: {
          gte: new Date(),
        },
      }

      // If courseId is provided, filter by course
      if (courseId) {
        where.class = {
          courseId,
        }
      }

      const sessions = await this.prisma.liveSession.findMany({
        where,
        include: {
          class: {
            include: {
              lecturer: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      })

      return sessions.map((session) => ({
        id: session.id,
        title: session.title,
        scheduledAt: session.scheduledAt,
        durationMinutes: 120, // Default duration
        description: `Live session for ${session.class.title}`,
        location: `Online - Room: ${session.roomKey}`,
        lecturerName: session.class.lecturer.name,
        classTitle: session.class.title,
      }))
    } catch (error) {
      this.logger.error(`Error fetching live sessions: ${error.message}`, error.stack)
      return []
    }
  }

  /**
   * Create a single calendar event for a live session
   */
  async generateSingleSessionCalendar(sessionId: number, userId: number): Promise<CalendarGenerationResult> {
    try {
      const session = await this.prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: {
          class: {
            include: {
              lecturer: {
                select: {
                  name: true,
                },
              },
              members: {
                where: {
                  userId,
                },
              },
            },
          },
        },
      })

      if (!session) {
        return {
          success: false,
          errorMessage: 'Live session not found',
        }
      }

      if (session.class.members.length === 0) {
        return {
          success: false,
          errorMessage: 'User does not have access to this session',
        }
      }

      const event: LiveSessionCalendarEvent = {
        id: session.id,
        title: session.title,
        scheduledAt: session.scheduledAt,
        durationMinutes: 120,
        description: `Live session for ${session.class.title}`,
        location: `Online - Room: ${session.roomKey}`,
        lecturerName: session.class.lecturer.name,
        classTitle: session.class.title,
      }

      const startDate = event.scheduledAt
      const endDate = new Date(startDate.getTime() + event.durationMinutes * 60 * 1000)

      const icsEvent: EventAttributes = {
        start: [
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          startDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes(),
        ] as [number, number, number, number, number],
        end: [
          endDate.getFullYear(),
          endDate.getMonth() + 1,
          endDate.getDate(),
          endDate.getHours(),
          endDate.getMinutes(),
        ] as [number, number, number, number, number],
        title: event.title,
        description: [
          `📚 Class: ${event.classTitle}`,
          `👨‍🏫 Lecturer: ${event.lecturerName}`,
          `📍 Location: ${event.location}`,
          ``,
          `Join the live session at the scheduled time.`,
          ``,
          `🌸 Torii Nihongo Gakuin`,
        ].join('\n'),
        location: event.location,
        url: `https://torii-nihongo-gakuin.io.vn/customer/online-class/`,
        uid: `torii-session-${event.id}-${session.classId}@toriinihongo.vn`,
        alarms: [
          {
            action: 'display' as const,
            description: `Live session "${event.title}" starts in 15 minutes`,
            trigger: {
              before: true,
              minutes: 15,
            },
          },
        ],
      }

      const { error, value } = createEvents([icsEvent])

      if (error) {
        return {
          success: false,
          errorMessage: 'Failed to generate calendar file',
        }
      }

      return {
        success: true,
        calendarData: value,
        events: [event],
      }
    } catch (error) {
      this.logger.error(`Error generating session calendar: ${error.message}`, error.stack)
      return {
        success: false,
        errorMessage: 'An unexpected error occurred',
      }
    }
  }
}
