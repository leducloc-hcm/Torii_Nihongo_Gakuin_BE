import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AssessmentMcpClient } from "src/mcp-client/module/assessment/assessment-mcp.service";
import { AssessmentHistoryMcpClient } from "src/mcp-client/module/assessment_history/history-mcp.service";
import {
  EvaluateWrongAnswersDto,
  GenerateAssessmentByAIDto,
} from "./assessment-ai.dto";

@Injectable()
export class AssessmentAIService {
  constructor(
    private readonly assessmentMcpClient: AssessmentMcpClient,
    private readonly historyMcpClient: AssessmentHistoryMcpClient,
  ) {}

  async generateByAI(dto: GenerateAssessmentByAIDto) {
    if (dto.sectionType !== "READING" && dto.readingGroupType) {
      throw new BadRequestException(
        "readingGroupType is only valid for READING sections",
      );
    }

    const result = await this.assessmentMcpClient.generateAssessmentContent({
      assessmentId: dto.assessmentId,
      sectionId: dto.sectionId,
      baseItemId: dto.baseItemId,
      sectionType: dto.sectionType,
      level: dto.level,
      difficulty: dto.difficulty || "MEDIUM",
      topic: dto.topic,
      itemCount: dto.itemCount || 1,
      questionsPerItem: dto.questionsPerItem || 1,
      readingGroupType: dto.readingGroupType,
      scorePerQuestion: dto.scorePerQuestion,
    });

    if (!result.success) {
      throw new ServiceUnavailableException(
        result.error || "Failed to generate assessment content via MCP",
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }

  async evaluateWrongAnswers(userId: number, dto: EvaluateWrongAnswersDto) {
    const result = await this.historyMcpClient.evaluateWrongAnswers({
      attemptId: dto.attemptId,
      language: dto.language ?? "vi",
      maxQuestions: dto.maxQuestions ?? 10,
    });

    if (!result.success) {
      throw new ServiceUnavailableException(
        result.error || "Failed to evaluate wrong answers via MCP",
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }
}
