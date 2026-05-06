import { Injectable, Logger } from "@nestjs/common";
import { McpBaseService } from "src/mcp-client/mcp-client.service";
import { FastMCPResult, MCPTool } from "src/mcp-client/mcp.model";
import { MCP_SERVERS } from "src/shared/config/mcp-servers.config";

@Injectable()
export class FlashcardMcpClient {
  private readonly logger = new Logger(FlashcardMcpClient.name);
  private readonly serverUrl: string;

  constructor(private readonly mcpBase: McpBaseService) {
    this.serverUrl = MCP_SERVERS.flashcard.url;
  }

  async listTools(): Promise<MCPTool[]> {
    if (!MCP_SERVERS.flashcard.enabled) {
      this.logger.warn("Flashcard MCP server is disabled");
      return [];
    }
    return await this.mcpBase.listTools(this.serverUrl);
  }

  async generateFlashcardSuggestions(args: {
    topic: string;
    level: string;
    count?: number;
    language?: string;
    prompt?: string;
  }): Promise<FastMCPResult> {
    if (!MCP_SERVERS.flashcard.enabled) {
      return {
        success: false,
        error: "Flashcard MCP server is disabled",
        data: null,
      };
    }

    return await this.mcpBase.executeTool(
      this.serverUrl,
      "generate_flashcard_suggestions",
      {
        topic: args.topic,
        level: args.level,
        count: args.count ?? 20,
        language: args.language ?? "vi",
        prompt: args.prompt,
      },
    );
  }
}
