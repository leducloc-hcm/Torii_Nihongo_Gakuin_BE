import { Injectable, Logger } from "@nestjs/common";
import { McpBaseService } from "src/mcp-client/mcp-client.service";
import { FastMCPResult, MCPTool } from "src/mcp-client/mcp.model";
import { MCP_SERVERS } from "src/shared/config/mcp-servers.config";

export interface GenerateAssessmentPayload {
  assessmentId: number;
  sectionId: number;
  baseItemId: number;
  sectionType: "VOCAB" | "KANJI" | "GRAMMAR" | "READING";
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  topic: string;
  itemCount?: number;
  questionsPerItem?: number;
  readingGroupType?: "READING_SHORT" | "READING_MEDIUM" | "READING_LONG";
  scorePerQuestion?: number;
}

@Injectable()
export class AssessmentMcpClient {
  private readonly logger = new Logger(AssessmentMcpClient.name);
  private readonly serverUrl: string;

  constructor(private readonly mcpBase: McpBaseService) {
    this.serverUrl = MCP_SERVERS.assessment.url;
  }

  async listTools(): Promise<MCPTool[]> {
    if (!MCP_SERVERS.assessment.enabled) {
      this.logger.warn("Assessment MCP server is disabled");
      return [];
    }
    return this.mcpBase.listTools(this.serverUrl);
  }

  async generateAssessmentContent(
    payload: GenerateAssessmentPayload,
  ): Promise<FastMCPResult> {
    if (!MCP_SERVERS.assessment.enabled) {
      return {
        success: false,
        error: "Assessment MCP server is disabled",
        data: null,
      };
    }

    return this.mcpBase.executeTool(
      this.serverUrl,
      "generate_assessment_content",
      {
        assessment_id: payload.assessmentId,
        section_id: payload.sectionId,
        base_item_id: payload.baseItemId,
        section_type: payload.sectionType,
        level: payload.level,
        difficulty: payload.difficulty || "MEDIUM",
        topic: payload.topic,
        item_count: payload.itemCount || 1,
        questions_per_item: payload.questionsPerItem || 1,
        reading_group_type: payload.readingGroupType,
        score_per_question: payload.scorePerQuestion,
      },
    );
  }

  async generateQuestionBank(payload: {
    type: string;
    level: string;
    topic: string;
    difficulty?: string;
    count?: number;
    readingGroupType?: string;
  }): Promise<FastMCPResult> {
    if (!MCP_SERVERS.assessment.enabled) {
      return {
        success: false,
        error: "Assessment MCP server is disabled",
        data: null,
      };
    }

    return this.mcpBase.executeTool(this.serverUrl, "generate_question_bank", {
      type: payload.type,
      level: payload.level,
      topic: payload.topic,
      difficulty: payload.difficulty || "MEDIUM",
      count: payload.count || 5,
      reading_group_type: payload.readingGroupType,
    });
  }

  async previewAssessmentContent(payload: {
    sectionType: "VOCAB" | "KANJI" | "GRAMMAR" | "READING";
    level: "N5" | "N4" | "N3" | "N2" | "N1";
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    topic: string;
    itemCount?: number;
    questionsPerItem?: number;
    readingGroupType?: "READING_SHORT" | "READING_MEDIUM" | "READING_LONG";
  }): Promise<FastMCPResult> {
    if (!MCP_SERVERS.assessment.enabled) {
      return {
        success: false,
        error: "Assessment MCP server is disabled",
        data: null,
      };
    }

    return this.mcpBase.executeTool(
      this.serverUrl,
      "preview_assessment_content",
      {
        section_type: payload.sectionType,
        level: payload.level,
        difficulty: payload.difficulty || "MEDIUM",
        topic: payload.topic,
        item_count: payload.itemCount || 1,
        questions_per_item: payload.questionsPerItem || 1,
        reading_group_type: payload.readingGroupType,
      },
    );
  }
}
