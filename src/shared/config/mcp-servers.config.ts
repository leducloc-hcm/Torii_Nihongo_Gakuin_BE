import { flatten } from '@nestjs/common'

export interface MCPServerConfig {
  name: string
  url: string
  enabled: boolean
  description?: string
}

export const MCP_SERVERS: Record<string, MCPServerConfig> = {
  course: {
    name: 'course-mcp',
    url: process.env.MCP_COURSE_SERVER_URL || 'http://localhost:8000/course/mcp',
    enabled: process.env.MCP_COURSE_ENABLED !== 'false',
    description: 'Course management, lesson details, and live course operations',
  },
  enrollment: {
    name: 'enrollment-mcp',
    url: process.env.MCP_ENROLLMENT_SERVER_URL || 'http://localhost:8000/enrollment/mcp',
    enabled: process.env.MCP_ENROLLMENT_ENABLED !== 'false',
    description: 'Enrollment management and user progress tracking',
  },
  flashcard: {
    name: 'flashcard-mcp',
    url: process.env.MCP_FLASHCARD_SERVER_URL || 'http://localhost:8000/flashcard/mcp',
    enabled: process.env.MCP_FLASHCARD_ENABLED !== 'false',
    description: 'Flashcard management and study aid features',
  },
}

export function getEnabledMCPServers(): MCPServerConfig[] {
  return Object.values(MCP_SERVERS).filter((server) => server.enabled)
}
