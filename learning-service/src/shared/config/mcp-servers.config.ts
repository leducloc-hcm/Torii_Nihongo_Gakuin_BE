import { flatten } from "@nestjs/common";

export interface MCPServerConfig {
  name: string;
  url: string;
  enabled: boolean;
  description?: string;
}

export const MCP_SERVERS: Record<string, MCPServerConfig> = {
  course: {
    name: "course-mcp",
    url:
      process.env.MCP_COURSE_SERVER_URL ||
      "http://localhost:8002/course/mcp",
    enabled: process.env.MCP_COURSE_ENABLED !== "false",
    description:
      "Course management, lesson details, and live course operations",
  },
  enrollment: {
    name: "enrollment-mcp",
    url:
      process.env.MCP_ENROLLMENT_SERVER_URL ||
      "http://localhost:8002/enrollment/mcp",
    enabled: process.env.MCP_ENROLLMENT_ENABLED !== "false",
    description: "Enrollment management and user progress tracking",
  },
  flashcard: {
    name: "flashcard-mcp",
    url:
      process.env.MCP_FLASHCARD_SERVER_URL ||
      "http://localhost:8002/flashcard/mcp",
    enabled: process.env.MCP_FLASHCARD_ENABLED !== "false",
    description: "Flashcard management and study aid features",
  },
  blog: {
    name: "blog-mcp",
    url:
      process.env.MCP_BLOG_SERVER_URL ||
      "http://localhost:8002/blog/mcp",
    enabled: process.env.MCP_BLOG_ENABLED !== "false",
    description: "Blog search and content retrieval for learning resources",
  },
  assessment: {
    name: "assessment-mcp",
    url:
      process.env.MCP_ASSESSMENT_SERVER_URL ||
      "http://localhost:8002/assessment/mcp",
    enabled: process.env.MCP_ASSESSMENT_ENABLED !== "false",
    description: "Assessment and testing tools for language proficiency",
  },
  assessmentHistory: {
    name: "assessment-history-mcp",
    url:
      process.env.MCP_ASSESSMENT_HISTORY_SERVER_URL ||
      "http://localhost:8002/assessment-history/mcp",
    enabled: process.env.MCP_ASSESSMENT_HISTORY_ENABLED !== "false",
    description: "User assessment history and performance tracking",
  },
  analytics: {
    name: "analytics-mcp",
    url:
      process.env.MCP_ANALYTICS_SERVER_URL ||
      "http://localhost:8002/analytics/mcp",
    enabled: process.env.MCP_ANALYTICS_ENABLED !== "false",
    description: "Learning analytics, progress insights, and recommendations",
  },
  sensei: {
    name: "sensei-mcp",
    url:
      process.env.MCP_SENSEI_SERVER_URL ||
      "http://localhost:8002/sensei/mcp",
    enabled: process.env.MCP_SENSEI_ENABLED !== "false",
    description:
      "Personalised grammar explanation, level-aware translation, and lesson-linked flashcard generation",
  },
};

export function getEnabledMCPServers(): MCPServerConfig[] {
  return Object.values(MCP_SERVERS).filter((server) => server.enabled);
}
