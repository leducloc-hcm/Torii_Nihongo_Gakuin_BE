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
  GenerateFlashcardsFromWrongAnswersDto,
  GenerateQuestionBankDto,
  GenerateSimilarQuestionDto,
  PreviewAssessmentByAIDto,
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
      forceRegenerate: dto.forceRegenerate ?? false,
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

  async getCachedAnalysis(
    attemptId: number,
    language: "vi" | "en" | "ja" = "vi",
  ) {
    const result = await this.historyMcpClient.getCachedAnalysis({
      attemptId,
      language,
    });

    return {
      success: true,
      data: result.data,
    };
  }

  async generateQuestionBank(dto: GenerateQuestionBankDto) {
    const result = await this.assessmentMcpClient.generateQuestionBank({
      type: dto.type,
      level: dto.level,
      topic: dto.topic,
      difficulty: dto.difficulty || "MEDIUM",
      count: dto.count || 5,
      readingGroupType: dto.readingGroupType,
    });

    if (!result.success) {
      throw new ServiceUnavailableException(
        result.error || "Failed to generate question bank via MCP",
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }

  async previewGenerate(dto: PreviewAssessmentByAIDto) {
    if (dto.sectionType !== "READING" && dto.readingGroupType) {
      throw new BadRequestException(
        "readingGroupType is only valid for READING sections",
      );
    }

    const result = await this.assessmentMcpClient.previewAssessmentContent({
      sectionType: dto.sectionType,
      level: dto.level,
      difficulty: dto.difficulty || "MEDIUM",
      topic: dto.topic,
      itemCount: dto.itemCount || 1,
      questionsPerItem: dto.questionsPerItem || 1,
      readingGroupType: dto.readingGroupType,
    });

    if (!result.success) {
      throw new ServiceUnavailableException(
        result.error || "Failed to preview assessment content via MCP",
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }

  async generateFlashcardsFromWrongAnswers(
    dto: GenerateFlashcardsFromWrongAnswersDto,
  ) {
    const result =
      await this.historyMcpClient.generateFlashcardsFromWrongAnswers({
        sectionType: dto.sectionType,
        level: dto.level,
        assessmentTitle: dto.assessmentTitle,
        wrongQuestions: dto.wrongQuestions,
        language: dto.language ?? "vi",
      });

    if (!result.success) {
      throw new ServiceUnavailableException(
        result.error || "Failed to generate flashcards via MCP",
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }

  async generateSimilarQuestion(dto: GenerateSimilarQuestionDto) {
    const result = await this.historyMcpClient.generateSimilarQuestion({
      sourceStem: dto.sourceStem,
      sourceCorrectAnswer: dto.sourceCorrectAnswer,
      sourceSelectedAnswer: dto.sourceSelectedAnswer,
      sourceOptions: dto.sourceOptions,
      sectionType: dto.sectionType,
      level: dto.level ?? "N5",
      language: dto.language ?? "vi",
      existingStems: dto.existingStems,
    });

    if (!result.success) {
      throw new ServiceUnavailableException(
        result.error || "Failed to generate similar question via MCP",
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }
}
