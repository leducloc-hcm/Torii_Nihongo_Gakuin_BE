import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AnalyticsMcpClient } from "src/mcp-client/module/analytics/analytics-mcp.service";
import { MultiAgentRouteDto } from "./multi-agent.dto";

@Injectable()
export class MultiAgentService {
  constructor(private readonly analyticsMcpClient: AnalyticsMcpClient) {}

  private inferIntent(
    query: string,
  ): "QNA" | "GENERATE_TEST" | "REVIEW_MISTAKES" | "BUILD_STUDY_PLAN" {
    const lower = query.toLowerCase();

    if (/generate|create|đề|bài test|mock|adaptive|practice/i.test(lower)) {
      return "GENERATE_TEST";
    }

    if (
      /mistake|error|sai|wrong|review result|phân tích lỗi|why/i.test(lower)
    ) {
      return "REVIEW_MISTAKES";
    }

    if (
      /plan|lộ trình|study path|kế hoạch|next week|7-day|14-day|30-day/i.test(
        lower,
      )
    ) {
      return "BUILD_STUDY_PLAN";
    }

    return "QNA";
  }

  private buildSystemPrompt(
    intent: "QNA" | "GENERATE_TEST" | "REVIEW_MISTAKES" | "BUILD_STUDY_PLAN",
  ) {
    if (intent === "GENERATE_TEST") {
      return "You are Multi-Agent Router. Use Assessment Agent to generate adaptive JLPT tests and persist output when sufficient context is provided. Include required fields if missing.";
    }
    if (intent === "REVIEW_MISTAKES") {
      return "You are Multi-Agent Router. Use Assessment + Analytics reasoning on real user attempt history to explain mistake categories and next actions.";
    }
    if (intent === "BUILD_STUDY_PLAN") {
      return "You are Multi-Agent Router. Use Analytics Agent over real progress data, produce concrete 7/14/30-day plans with daily tasks.";
    }
    return "You are Multi-Agent Router. Handle Japanese-learning Q&A with concise guidance and suggest best next action.";
  }

  async route(userId: number, userRole: string, dto: MultiAgentRouteDto) {
    const intent = dto.intent || this.inferIntent(dto.query);
    const systemPrompt = this.buildSystemPrompt(intent);

    const result = await this.analyticsMcpClient.routeMultiAgent({
      userId,
      userRole,
      query: dto.query,
      intent,
      systemPrompt,
      context: dto.context || {},
    });

    if (!result.success) {
      throw new ServiceUnavailableException(
        result.error || "Failed to process multi-agent request via MCP",
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }
}
