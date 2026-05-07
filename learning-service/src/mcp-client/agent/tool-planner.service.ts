/**
 * ToolPlannerService
 *
 * Thay thế keyword routing bằng AI reasoning:
 * - Nhận query + danh sách tool names + user context/goal
 * - Dùng Claude để phân tích intent, chọn AgentRole & queryType
 * - Nếu là goal-setting query → generate roadmap steps (TYPE-based, không bịa tên cụ thể)
 * - Trả về AgentPlan với reasoning rõ ràng
 * - Fallback tự động về keyword routing nếu Claude call thất bại
 */
import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_CONFIG } from "src/shared/config/claude.config";
import {
  AgentRole,
  routeAgentForQuery,
} from "src/mcp-client/shared/agent-routing.utils";
import {
  detectQueryType,
  QueryType,
} from "src/mcp-client/shared/query-detection.utils";
import { ClaudeTool } from "src/mcp-client/mcp.model";
import {
  UserLearningContext,
  UserGoal,
  RoadmapStep,
} from "src/mcp-client/agent/agent-memory.service";

export interface AgentPlan {
  /** Loại query đã phân tích */
  queryType: QueryType;
  /** Agent chính chịu trách nhiệm xử lý */
  primaryRole: AgentRole;
  /** Các agent hỗ trợ nếu cần phối hợp */
  collaboratorRoles: AgentRole[];
  /** Có bắt buộc gọi tool không (user-specific data) */
  forceTools: boolean;
  /** Danh sách tool names nên ưu tiên sử dụng */
  suggestedTools: string[];
  /** Lý do Claude chọn plan này — dùng để debug & giải thích */
  reasoning: string;
  /** true nếu plan được tạo bởi AI, false nếu fallback về keyword */
  isAIPlanned: boolean;
  /** true nếu query là goal-setting ("muốn đạt N3", "lộ trình học N2"…) */
  isGoalSetting: boolean;
}

const PLANNER_SYSTEM_PROMPT = `You are an AI planning engine for a Japanese language learning platform called Torii Nihongo Gakuin.

Your job: analyze a user query and output a JSON plan for which tools/agents to use.

Available agent roles:
- SENSEI: Japanese learning, grammar, vocabulary, flashcards, courses, blogs
- ASSESSMENT: Tests, quizzes, assessment history, scores
- ANALYTICS: Enrollment status, learning progress, statistics

Available query types:
COURSE, BLOG, LESSON, FLASHCARD, ASSESSMENT, ASSESSMENT_HISTORY, ENROLLMENT, PROGRESS, GRAMMAR, TRANSLATION, GENERAL

Rules:
1. forceTools=true when user asks about THEIR OWN data (my courses, my scores, my progress, my flashcards)
2. collaboratorRoles only when the query genuinely spans multiple domains
3. suggestedTools: list 1-3 most relevant tool names from the provided list (exact names only)
4. Keep reasoning concise (1-2 sentences)

Respond ONLY with valid JSON matching this schema exactly:
{
  "queryType": "COURSE",
  "primaryRole": "SENSEI",
  "collaboratorRoles": [],
  "forceTools": false,
  "suggestedTools": ["search_courses"],
  "reasoning": "User is asking about available courses."
}`;

@Injectable()
export class ToolPlannerService {
  private readonly logger = new Logger(ToolPlannerService.name);
  private readonly anthropic: Anthropic;

  constructor() {
    const apiKey = (process.env.CLAUDE_API_KEY || CLAUDE_CONFIG.apiKey)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Phân tích query bằng Claude để tạo AgentPlan.
   * Nhận thêm context (level user, goal hiện tại) để plan chính xác hơn.
   * Nếu Claude thất bại, tự động fallback về keyword routing.
   */
  async plan(
    query: string,
    availableTools: ClaudeTool[],
    context?: {
      userContext?: UserLearningContext | null;
      currentGoal?: UserGoal | null;
    },
  ): Promise<AgentPlan> {
    try {
      const toolNames = availableTools.map((t) => t.name).join(", ");
      const model = (
        process.env.CLAUDE_MODEL ||
        CLAUDE_CONFIG.model ||
        "claude-sonnet-4-6"
      )
        .trim()
        .replace(/^['"]|['"]$/g, "");

      // Build context string to enrich the planning prompt
      const ctxLines: string[] = [];
      if (context?.userContext?.jlptLevel) {
        ctxLines.push(
          `User current JLPT level: ${context.userContext.jlptLevel}`,
        );
      }
      if (context?.currentGoal?.title) {
        ctxLines.push(`User active goal: ${context.currentGoal.title}`);
        if (context.currentGoal.targetLevel) {
          ctxLines.push(
            `Goal target level: ${context.currentGoal.targetLevel}`,
          );
        }
      }
      const ctxStr = ctxLines.length
        ? `\nUser context:\n${ctxLines.join("\n")}\n`
        : "";

      const response = await this.anthropic.messages.create({
        model,
        system: PLANNER_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Available tools: ${toolNames}${ctxStr}\n\nUser query: "${query}"`,
          },
        ],
        max_tokens: 300,
        temperature: 0,
      });

      const text = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();

      // Extract JSON even if wrapped in markdown code block
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in planner response");

      const parsed = JSON.parse(jsonMatch[0]);

      const plan: AgentPlan = {
        queryType: this.sanitizeQueryType(parsed.queryType),
        primaryRole: this.sanitizeRole(parsed.primaryRole),
        collaboratorRoles: (parsed.collaboratorRoles || [])
          .map((r: string) => this.sanitizeRole(r))
          .filter(Boolean),
        forceTools: Boolean(parsed.forceTools),
        suggestedTools: Array.isArray(parsed.suggestedTools)
          ? parsed.suggestedTools.filter((t: string) =>
              availableTools.some((at) => at.name === t),
            )
          : [],
        reasoning: parsed.reasoning || "",
        isAIPlanned: true,
        isGoalSetting:
          /(?:muốn đạt|muốn thi|mục tiêu|lập kế hoạch|lộ trình|roadmap|want to pass|want to reach|goal is|目標|合格したい|học để đạt|kế hoạch học)/i.test(
            query,
          ),
      };

      this.logger.log(
        `🧠 [Planner] AI plan: role=${plan.primaryRole}, type=${plan.queryType}, forceTools=${plan.forceTools}, tools=[${plan.suggestedTools.join(",")}] | reason: ${plan.reasoning}`,
      );

      return plan;
    } catch (error) {
      this.logger.warn(
        `⚠️ [Planner] AI planning failed, falling back to keyword routing. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.fallback(query);
    }
  }

  /**
   * Keyword-based fallback — đảm bảo hệ thống không bị gián đoạn
   * khi Claude API lỗi hoặc quota hết.
   */
  private fallback(query: string): AgentPlan {
    const queryType = detectQueryType(query);
    const routing = routeAgentForQuery(queryType, query);

    return {
      queryType,
      primaryRole: routing.primaryRole,
      collaboratorRoles: routing.collaboratorRoles,
      forceTools: routing.forceTools,
      suggestedTools: [],
      reasoning: `[Keyword fallback] ${routing.reason}`,
      isAIPlanned: false,
      isGoalSetting:
        /(?:muốn đạt|muốn thi|mục tiêu|lập kế hoạch|lộ trình|roadmap|want to pass|want to reach|goal is|目標|合格したい|học để đạt|kế hoạch học)/i.test(
          query,
        ),
    };
  }

  private sanitizeQueryType(value: string): QueryType {
    const valid = Object.values(QueryType) as string[];
    return valid.includes(value) ? (value as QueryType) : QueryType.GENERAL;
  }

  private sanitizeRole(value: string): AgentRole {
    const valid = Object.values(AgentRole) as string[];
    return valid.includes(value) ? (value as AgentRole) : AgentRole.SENSEI;
  }

  /**
   * Generate lộ trình học dài hạn dựa trên level mục tiêu.
   *
   * Quan trọng: CHỈ tạo TYPE + mô tả chung (GRAMMAR/FLASHCARD/ASSESSMENT…).
   * KHÔNG chứa tên course/blog/assessment cụ thể — những thứ đó phải lấy từ tools.
   *
   * Lộ trình này được lưu vào Redis và inject vào system prompt mỗi session,
   * giúp agent tự điều chỉnh response theo tiến độ thực tế của user.
   */
  async generateRoadmap(
    targetLevel: string,
    currentLevel?: string,
    deadline?: string,
  ): Promise<RoadmapStep[]> {
    try {
      const model = (
        process.env.CLAUDE_MODEL ||
        CLAUDE_CONFIG.model ||
        "claude-sonnet-4-6"
      )
        .trim()
        .replace(/^['"]|['"]$/g, "");

      const contextLines = [`Target JLPT level: ${targetLevel}`];
      if (currentLevel) contextLines.push(`Current level: ${currentLevel}`);
      if (deadline) contextLines.push(`Deadline: ${deadline}`);

      const response = await this.anthropic.messages.create({
        model,
        system: `You are a Japanese learning roadmap generator. Generate a structured study plan as a JSON array.
Each element must have exactly: { "order": number, "stepType": "GRAMMAR"|"VOCABULARY"|"FLASHCARD"|"ASSESSMENT"|"COURSE"|"READING"|"LISTENING", "description": string, "status": "PENDING" }
Rules:
- 5 to 7 steps maximum, ordered from foundation to testing
- Descriptions must be GENERAL study topics (e.g., "Review N3 grammar patterns" or "Build vocabulary with spaced repetition")
- Do NOT use specific course names, blog titles, assessment IDs, or any platform-specific names
- Respond with ONLY a valid JSON array, no explanation, no markdown`,
        messages: [
          {
            role: "user",
            content: contextLines.join("\n"),
          },
        ],
        max_tokens: 600,
        temperature: 0,
      });

      const text = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed: any[] = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];

      const steps: RoadmapStep[] = parsed
        .filter((s) => s.order && s.stepType && s.description)
        .map((s) => ({
          order: Number(s.order),
          stepType: s.stepType as RoadmapStep["stepType"],
          description: String(s.description),
          status: "PENDING" as const,
        }))
        .slice(0, 7);

      this.logger.log(
        `🗺️  [Planner] Roadmap generated for ${targetLevel}: ${steps.length} steps`,
      );
      return steps;
    } catch (error) {
      this.logger.warn(
        `⚠️ [Planner] Roadmap generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}
