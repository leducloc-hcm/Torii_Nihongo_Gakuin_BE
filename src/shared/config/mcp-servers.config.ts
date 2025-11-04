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
}

export function getEnabledMCPServers(): MCPServerConfig[] {
  return Object.values(MCP_SERVERS).filter((server) => server.enabled)
}
