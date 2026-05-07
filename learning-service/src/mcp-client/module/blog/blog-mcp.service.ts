import { Injectable, Logger } from "@nestjs/common";
import { McpBaseService } from "src/mcp-client/mcp-client.service";
import { FastMCPResult } from "src/mcp-client/mcp.model";
import { MCP_SERVERS } from "src/shared/config/mcp-servers.config";

export interface GenerateBlogPayload {
  topic: string;
  language?: "vi" | "en" | "ja";
  style?: "educational" | "news" | "story" | "tips";
  targetAudience?: "beginner" | "intermediate" | "advanced" | "general";
  jlptLevel?: "N5" | "N4" | "N3" | "N2" | "N1";
  context?: string;
  keywords?: string[];
}

@Injectable()
export class BlogMcpClient {
  private readonly logger = new Logger(BlogMcpClient.name);
  private readonly serverUrl: string;

  constructor(private readonly mcpBase: McpBaseService) {
    this.serverUrl = MCP_SERVERS.blog.url;
  }

  async generateBlogWithAI(
    payload: GenerateBlogPayload,
  ): Promise<FastMCPResult> {
    if (!MCP_SERVERS.blog.enabled) {
      return {
        success: false,
        error: "Blog MCP server is disabled",
        data: null,
      };
    }

    return this.mcpBase.executeTool(this.serverUrl, "generate_blog_with_ai", {
      topic: payload.topic,
      language: payload.language || "vi",
      style: payload.style || "educational",
      target_audience: payload.targetAudience,
      jlpt_level: payload.jlptLevel,
      context: payload.context,
      keywords: payload.keywords,
    });
  }
}
