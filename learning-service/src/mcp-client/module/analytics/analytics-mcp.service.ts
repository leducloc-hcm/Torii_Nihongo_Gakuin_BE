import { Injectable, Logger } from "@nestjs/common";
import { McpBaseService } from "src/mcp-client/mcp-client.service";
import { FastMCPResult, MCPTool } from "src/mcp-client/mcp.model";
import { MCP_SERVERS } from "src/shared/config/mcp-servers.config";

export interface MultiAgentRoutePayload {
  userId: number;
  userRole?: string;
  query: string;
  intent?: "QNA" | "GENERATE_TEST" | "REVIEW_MISTAKES" | "BUILD_STUDY_PLAN";
  systemPrompt: string;
  context?: Record<string, any>;
}

@Injectable()
export class AnalyticsMcpClient {
  private readonly logger = new Logger(AnalyticsMcpClient.name);
  private readonly serverUrl: string;

  constructor(private readonly mcpBase: McpBaseService) {
    this.serverUrl = MCP_SERVERS.analytics.url;
  }

  async listTools(): Promise<MCPTool[]> {
    if (!MCP_SERVERS.analytics.enabled) {
      this.logger.warn("Analytics MCP server is disabled");
      return [];
    }
    return this.mcpBase.listTools(this.serverUrl);
  }

  async routeMultiAgent(
    payload: MultiAgentRoutePayload,
  ): Promise<FastMCPResult> {
    if (!MCP_SERVERS.analytics.enabled) {
      return {
        success: false,
        error: "Analytics MCP server is disabled",
        data: null,
      };
    }

    return this.mcpBase.executeTool(this.serverUrl, "multi_agent_router", {
      user_id: payload.userId,
      user_role: payload.userRole || "CUSTOMER",
      query: payload.query,
      intent: payload.intent,
      system_prompt: payload.systemPrompt,
      context: payload.context || {},
    });
  }
}
