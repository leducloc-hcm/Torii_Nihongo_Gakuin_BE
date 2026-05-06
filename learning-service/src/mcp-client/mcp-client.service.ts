import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import {
  FastMCPResult,
  MCPExecuteRequest,
  MCPTool,
} from "src/mcp-client/mcp.model";

@Injectable()
export class McpBaseService {
  private readonly logger = new Logger(McpBaseService.name);
  private readonly httpClient: AxiosInstance;
  private readonly timeoutMs: number;

  constructor() {
    const configuredTimeout = Number(process.env.MCP_HTTP_TIMEOUT_MS || 120000);
    this.timeoutMs =
      Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : 120000;

    this.httpClient = axios.create({
      timeout: this.timeoutMs,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream", // Required by FastMCP
      },
    });

    this.logger.log(`MCP HTTP timeout configured: ${this.timeoutMs}ms`);
  }

  async listTools(serverUrl: string): Promise<MCPTool[]> {
    try {
      const response = await this.httpClient.post(serverUrl, {
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: this.generateId(),
      });

      if (response.data.error) {
        this.logger.error(`MCP Error: ${JSON.stringify(response.data.error)}`);
        throw new Error(response.data.error.message);
      }

      return response.data.result?.tools || [];
    } catch (error) {
      this.logger.error(`Failed to list tools from ${serverUrl}`, error);
      throw error;
    }
  }

  async executeTool(
    serverUrl: string,
    toolName: string,
    args: Record<string, any>,
  ): Promise<FastMCPResult> {
    try {
      const request: MCPExecuteRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
        id: this.generateId(),
      };

      this.logger.debug(`Executing tool ${toolName} on ${serverUrl}`);
      this.logger.debug(`Arguments: ${JSON.stringify(args)}`);

      const response = await this.httpClient.post(serverUrl, request);

      if (response.data.error) {
        this.logger.error(`MCP Error: ${JSON.stringify(response.data.error)}`);
        return {
          success: false,
          error: response.data.error.message,
          data: null,
        };
      }

      // Handle FastMCP response format
      const result = response.data.result;

      // FastMCP returns content array with text
      if (result?.content && Array.isArray(result.content)) {
        const textContent = result.content.find((c: any) => c.type === "text");
        if (textContent?.text) {
          try {
            // Parse the JSON string from text content
            const parsedData = JSON.parse(textContent.text);
            if (typeof parsedData === "object" && "success" in parsedData) {
              return parsedData as FastMCPResult;
            }
          } catch {
            // If not JSON, return as is
            return {
              success: true,
              error: null,
              data: textContent.text,
            };
          }
        }
      }

      // Direct result format
      if (result && typeof result === "object" && "success" in result) {
        return result as FastMCPResult;
      }

      // Wrap any other result
      return {
        success: true,
        error: null,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to execute tool ${toolName}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
      };
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
