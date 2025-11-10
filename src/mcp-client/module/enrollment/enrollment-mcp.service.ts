import { Injectable, Logger } from '@nestjs/common'
import { McpBaseService } from 'src/mcp-client/mcp-client.service'
import { FastMCPResult } from 'src/mcp-client/mcp.model'
import { MCP_SERVERS } from 'src/shared/config/mcp-servers.config'

@Injectable()
export class EnrollmentMcpClient {
  private readonly logger = new Logger(EnrollmentMcpClient.name)
  private readonly serverUrl: string

  constructor(private readonly mcpBase: McpBaseService) {
    this.serverUrl = MCP_SERVERS.enrollment.url
  }

  async getUserEnrollments(userId: number): Promise<FastMCPResult> {
    return await this.mcpBase.executeTool(this.serverUrl, 'get_user_enrollments', {
      user_id: userId,
    })
  }

  async getCourseProgress(userId: number, courseId: number): Promise<FastMCPResult> {
    return await this.mcpBase.executeTool(this.serverUrl, 'get_course_progress', {
      user_id: userId,
      course_id: courseId,
    })
  }

  async getUserLearningStats(userId: number): Promise<FastMCPResult> {
    return await this.mcpBase.executeTool(this.serverUrl, 'get_user_learning_stats', {
      user_id: userId,
    })
  }
}
