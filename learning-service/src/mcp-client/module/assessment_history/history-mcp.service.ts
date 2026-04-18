import { Injectable, Logger } from "@nestjs/common";
import { McpBaseService } from "src/mcp-client/mcp-client.service";
import { FastMCPResult, MCPTool } from "src/mcp-client/mcp.model";
import { MCP_SERVERS } from "src/shared/config/mcp-servers.config";

export interface EvaluateWrongAnswersPayload {
  attemptId: number;
  language?: "vi" | "en" | "ja";
  maxQuestions?: number;
}

@Injectable()
export class AssessmentHistoryMcpClient {
  private readonly logger = new Logger(AssessmentHistoryMcpClient.name);
  private readonly serverUrl: string;

  constructor(private readonly mcpBase: McpBaseService) {
    this.serverUrl = MCP_SERVERS.assessmentHistory.url;
  }

  async listTools(): Promise<MCPTool[]> {
    if (!MCP_SERVERS.assessmentHistory.enabled) {
      this.logger.warn("AssessmentHistory MCP server is disabled");
      return [];
    }
    return this.mcpBase.listTools(this.serverUrl);
  }

  async evaluateWrongAnswers(
    payload: EvaluateWrongAnswersPayload,
  ): Promise<FastMCPResult> {
    if (!MCP_SERVERS.assessmentHistory.enabled) {
      return {
        success: false,
        error: "AssessmentHistory MCP server is disabled",
        data: null,
      };
    }

    return this.mcpBase.executeTool(this.serverUrl, "evaluate_wrong_answers", {
      attempt_id: payload.attemptId,
      language: payload.language ?? "vi",
      max_questions: payload.maxQuestions ?? 10,
    });
  }

  async generateFlashcardsFromWrongAnswers(payload: {
    sectionType: string;
    level: string;
    assessmentTitle: string;
    wrongQuestions: {
      stem: string;
      correctAnswer: string;
      selectedAnswer: string;
      options: { content: string; isCorrect: boolean }[];
    }[];
    language?: string;
  }): Promise<FastMCPResult> {
    if (!MCP_SERVERS.assessmentHistory.enabled) {
      return {
        success: false,
        error: "AssessmentHistory MCP server is disabled",
        data: null,
      };
    }

    return this.mcpBase.executeTool(
      this.serverUrl,
      "generate_flashcards_from_wrong_answers",
      {
        section_type: payload.sectionType,
        level: payload.level,
        assessment_title: payload.assessmentTitle,
        wrong_questions_json: JSON.stringify(payload.wrongQuestions),
        language: payload.language ?? "vi",
      },
    );
  }
}
