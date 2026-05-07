/**
 * AgentMemoryService
 *
 * Persistent memory cho AI Agent — lưu trong Redis, KHÔNG cần DB table mới:
 *
 *  ai_user_context:{userId}  — profile học tập: level, focus, số session (TTL 7 ngày)
 *  ai_goal:{userId}          — mục tiêu JLPT + lộ trình roadmap (TTL 30 ngày)
 *
 * Mỗi query sau đó được inject context block vào system prompt → agent
 * "nhớ" user đang học N3, mục tiêu là N2 trong 4 tháng, bước tiếp theo là gì.
 *
 * Quy tắc quan trọng: Roadmap CHỈ chứa TYPE của bước học
 * (GRAMMAR, FLASHCARD, ASSESSMENT…), KHÔNG chứa tên course/blog/assessment
 * cụ thể — những thứ đó phải lấy qua tools, không được bịa.
 */
import { Injectable, Logger } from "@nestjs/common";
import { RedisContextService } from "src/shared/redis/redis-context.service";

export interface UserLearningContext {
  /** Level JLPT hiện tại của user (phát hiện từ hội thoại) */
  jlptLevel?: string;
  /** Các chủ đề đang tập trung (grammar, kanji, vocab…) */
  currentFocus?: string[];
  /** Ngôn ngữ ưu tiên khi trả lời */
  preferredLanguage?: "vi" | "en" | "ja";
  /** Tổng số session đã chat với AI Sensei */
  totalSessions: number;
  /** ISO timestamp lần cuối hoạt động */
  lastActiveAt: string;
}

export interface UserGoal {
  /** Tên mục tiêu, ví dụ "Đạt N3" */
  title: string;
  /** Level JLPT mục tiêu */
  targetLevel?: string;
  /** Deadline ISO date */
  deadline?: string;
  /** Câu user nói gốc */
  rawStatement: string;
  createdAt: string;
  updatedAt: string;
  /** Các bước lộ trình — TYPE only, không có tên cụ thể */
  roadmapSteps?: RoadmapStep[];
}

export interface RoadmapStep {
  order: number;
  /** Mô tả chung, ví dụ "Ôn ngữ pháp N4 còn thiếu" — không phải tên khóa học */
  description: string;
  stepType:
    | "GRAMMAR"
    | "VOCABULARY"
    | "FLASHCARD"
    | "ASSESSMENT"
    | "COURSE"
    | "READING"
    | "LISTENING";
  status: "PENDING" | "IN_PROGRESS" | "DONE";
}

/** 7 ngày — đủ để nhớ qua nhiều session trong 1 tuần */
const USER_CTX_TTL = 7 * 24 * 3600;
/** 30 ngày — goal thường đặt theo tháng */
const GOAL_TTL = 30 * 24 * 3600;

@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  constructor(private readonly redis: RedisContextService) {}

  // ── Redis key helpers ────────────────────────────────────────────────────

  private ctxKey(userId: number): string {
    return `ai_user_context:${userId}`;
  }

  private goalKey(userId: number): string {
    return `ai_goal:${userId}`;
  }

  // ── User Context ─────────────────────────────────────────────────────────

  async getUserContext(userId: number): Promise<UserLearningContext | null> {
    return this.redis.get<UserLearningContext>(this.ctxKey(userId));
  }

  /**
   * Merge updates vào context hiện có.
   * totalSessions được CỘNG DỒN (không ghi đè).
   */
  async upsertUserContext(
    userId: number,
    updates: Partial<UserLearningContext>,
  ): Promise<void> {
    const existing = await this.getUserContext(userId);
    const merged: UserLearningContext = {
      ...existing,
      ...updates,
      totalSessions:
        (existing?.totalSessions ?? 0) + (updates.totalSessions ?? 0),
      lastActiveAt: new Date().toISOString(),
    };
    await this.redis.set(this.ctxKey(userId), merged, USER_CTX_TTL);
  }

  // ── Goal ─────────────────────────────────────────────────────────────────

  async getGoal(userId: number): Promise<UserGoal | null> {
    return this.redis.get<UserGoal>(this.goalKey(userId));
  }

  async saveGoal(
    userId: number,
    goalData: Omit<UserGoal, "createdAt" | "updatedAt">,
  ): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.getGoal(userId);
    const saved: UserGoal = {
      createdAt: existing?.createdAt ?? now,
      ...goalData,
      updatedAt: now,
    };
    await this.redis.set(this.goalKey(userId), saved, GOAL_TTL);
    this.logger.log(
      `🎯 [Memory] Goal saved for user ${userId}: "${saved.title}" → ${saved.targetLevel ?? "no level"}, ${saved.roadmapSteps?.length ?? 0} steps`,
    );
  }

  async markRoadmapStepDone(userId: number, stepOrder: number): Promise<void> {
    const goal = await this.getGoal(userId);
    if (!goal?.roadmapSteps) return;
    const step = goal.roadmapSteps.find((s) => s.order === stepOrder);
    if (step) {
      step.status = "DONE";
      await this.redis.set(this.goalKey(userId), goal, GOAL_TTL);
    }
  }

  // ── Detection helpers ─────────────────────────────────────────────────────

  /**
   * Kiểm tra query có phải là goal-setting không.
   * Ví dụ: "tôi muốn đạt N3", "mục tiêu của tôi là N2", "lộ trình học N1"
   */
  detectGoalIntent(query: string): {
    isGoalSetting: boolean;
    targetLevel?: string;
  } {
    const goalKeywords =
      /(?:muốn đạt|muốn thi|mục tiêu|lập kế hoạch|lộ trình|roadmap|want to pass|want to reach|goal is|目標|合格したい|học để đạt|kế hoạch học)/i;
    const isGoalSetting = goalKeywords.test(query);

    const levelMatch = query.match(/\b([nN][1-5])\b/);
    const targetLevel = levelMatch ? levelMatch[1].toUpperCase() : undefined;

    return { isGoalSetting, targetLevel };
  }

  /**
   * Trích xuất level JLPT từ text (query hoặc response của agent).
   */
  extractLevelFromText(text: string): string | undefined {
    const m = text.match(/\b([nN][1-5])\b/);
    return m ? m[1].toUpperCase() : undefined;
  }

  // ── System prompt injection ───────────────────────────────────────────────

  /**
   * Tạo block text inject vào system prompt.
   * Nếu không có context/goal → trả về "" (không inject gì).
   */
  buildContextSystemBlock(
    ctx: UserLearningContext | null,
    goal: UserGoal | null,
  ): string {
    if (!ctx && !goal) return "";

    const lines: string[] = [
      "\n=== USER LEARNING CONTEXT (agent persistent memory) ===",
    ];

    if (ctx?.jlptLevel) {
      lines.push(`• Current JLPT level: ${ctx.jlptLevel}`);
    }
    if (ctx?.currentFocus?.length) {
      lines.push(`• Learning focus: ${ctx.currentFocus.join(", ")}`);
    }
    if ((ctx?.totalSessions ?? 0) > 1) {
      lines.push(`• Total AI Sensei sessions: ${ctx!.totalSessions}`);
    }

    if (goal) {
      lines.push("\n=== ACTIVE LEARNING GOAL ===");
      lines.push(`• Goal: ${goal.title}`);
      if (goal.targetLevel) lines.push(`• Target level: ${goal.targetLevel}`);
      if (goal.deadline) lines.push(`• Deadline: ${goal.deadline}`);

      if (goal.roadmapSteps?.length) {
        const done = goal.roadmapSteps.filter(
          (s) => s.status === "DONE",
        ).length;
        const total = goal.roadmapSteps.length;
        const next = goal.roadmapSteps.find(
          (s) => s.status === "PENDING" || s.status === "IN_PROGRESS",
        );
        lines.push(`• Roadmap progress: ${done}/${total} steps completed`);
        if (next) {
          lines.push(
            `• Next recommended step: [${next.stepType}] ${next.description}`,
          );
        }
      }
    }

    lines.push(
      "\nINSTRUCTION: Personalize your response to the user's level and active goal.",
      "Align tool usage and suggestions toward achieving the goal.",
      "CRITICAL: NEVER fabricate specific course names, test scores, flashcard content,",
      "or blog titles — always retrieve real data via tools before mentioning resources.",
    );

    return lines.join("\n");
  }
}
