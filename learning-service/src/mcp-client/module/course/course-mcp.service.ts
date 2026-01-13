import { Injectable, Logger } from '@nestjs/common'
import { McpBaseService } from 'src/mcp-client/mcp-client.service'
import { FastMCPResult, MCPTool } from 'src/mcp-client/mcp.model'
import { MCP_SERVERS } from 'src/shared/config/mcp-servers.config'

@Injectable()
export class CourseMcpClient {
  private readonly logger = new Logger(CourseMcpClient.name)
  private readonly serverUrl: string

  constructor(private readonly mcpBase: McpBaseService) {
    this.serverUrl = MCP_SERVERS.course.url
  }

  async listTools(): Promise<MCPTool[]> {
    if (!MCP_SERVERS.course.enabled) {
      this.logger.warn('Course MCP server is disabled')
      return []
    }
    return await this.mcpBase.listTools(this.serverUrl)
  }

  async searchCourses(query: string, level?: string, limit: number = 10): Promise<FastMCPResult> {
    return await this.mcpBase.executeTool(this.serverUrl, 'search_courses', {
      query,
      level,
      limit,
    })
  }

  async getCourseDetails(courseId: number): Promise<FastMCPResult> {
    return await this.mcpBase.executeTool(this.serverUrl, 'get_course_details', {
      course_id: courseId,
    })
  }

  async getRecommendedCourses(level: string): Promise<FastMCPResult> {
    return await this.mcpBase.executeTool(this.serverUrl, 'get_recommended_courses', {
      level,
    })
  }
}
