import { Injectable, Logger } from '@nestjs/common'
import { McpBaseService } from '../../mcp-client.service'
import { FastMCPResult } from '../../mcp.model'
import { MCP_SERVERS } from 'src/shared/config/mcp-servers.config'

export interface LessonInfo {
  id: number
  title: string
  kind: string
  content?: string
  durationSec?: number
  order: number
  status: string
  module_id: number
  module_title: string
  module_order: number
}

export interface LessonDetail extends LessonInfo {
  courseId: number
  courseTitle: string
  courseLevel: string
  quiz?: {
    id: number
    title: string
    duration: number
    passingScore: number
    question_count: number
  }
  liveSession?: {
    id: number
    startTime: Date
    endTime: Date
    meetingUrl: string
    status: string
  }
}

export interface CourseReviews {
  avg_rating: number
  total_reviews: number
  five_star: number
  four_star: number
  three_star: number
  two_star: number
  one_star: number
  recent_reviews: Array<{
    id: number
    rating: number
    comment: string
    createdAt: Date
    user_id: number
    user_name: string
  }>
}

@Injectable()
export class LessonMCPService {
  private readonly logger = new Logger(LessonMCPService.name)
  private readonly serverUrl: string

  constructor(private readonly mcpBase: McpBaseService) {
    this.serverUrl = MCP_SERVERS.lesson.url
  }

  async getCourseLessons(courseId: number): Promise<FastMCPResult> {
    return await this.mcpBase.executeTool(this.serverUrl, 'get_course_lessons', {
      course_id: courseId,
    })
  }

  async getLessonDetail(lessonId: number): Promise<FastMCPResult> {
    return await this.mcpBase.executeTool(this.serverUrl, 'get_lesson_detail', {
      lesson_id: lessonId,
    })
  }

  async getCourseReviews(courseId: number): Promise<FastMCPResult> {
    return await this.mcpBase.executeTool(this.serverUrl, 'get_course_reviews', {
      course_id: courseId,
    })
  }
}
