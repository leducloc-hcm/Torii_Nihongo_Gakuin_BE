import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ClaudeMessageParam } from "src/mcp-client/mcp.model";
import {
  AIThreadRepository,
  AIQueryRepository,
  AIMessageRepository,
} from "./ai-chat.repo";
import { ChatRole, QueryStatus } from "@prisma/client";
import { SendQueryDto } from "./ai-chat.dto";
import { AgentService } from "src/mcp-client/agent.service";
import { PromptService } from "src/mcp-client/module/course/course-mcp.prompt";
import { RedisContextService } from "src/shared/redis/redis-context.service";
import {
  detectQueryType,
  requiresMultipleTools,
  generateMultiToolHint,
  suggestToolCombination,
  QueryType,
} from "src/mcp-client/shared/query-detection.utils";
import { routeAgentForQuery } from "src/mcp-client/shared/agent-routing.utils";
import { ToolPlannerService } from "src/mcp-client/agent/tool-planner.service";
import { AgentMemoryService } from "src/mcp-client/agent/agent-memory.service";

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);
  private readonly THREAD_CACHE_TTL = 3600; // 1 hour in seconds
  private readonly MESSAGES_CACHE_TTL = 3600; // 1 hour in seconds

  constructor(
    private readonly agentService: AgentService,
    private readonly promptService: PromptService,
    private readonly threadRepo: AIThreadRepository,
    private readonly queryRepo: AIQueryRepository,
    private readonly messageRepo: AIMessageRepository,
    private readonly redis: RedisContextService,
    private readonly toolPlanner: ToolPlannerService,
    private readonly agentMemory: AgentMemoryService,
  ) {
    this.agentService.loadTools().catch((err) => {
      this.logger.error("Failed to load MCP tools on startup:", err);
    });
  }

  private getThreadCacheKey(threadId: number): string {
    return `ai_thread:${threadId}`;
  }

  private getMessagesCacheKey(
    threadId: number,
    limit?: number,
    page?: number,
  ): string {
    if (limit !== undefined && page !== undefined) {
      return `ai_thread_messages:${threadId}:${limit}:${page}`;
    }
    return `ai_thread_messages:${threadId}`;
  }

  private getUserThreadsCacheKey(userId: number): string {
    return `ai_user_threads:${userId}`;
  }

  private detectLanguage(query: string): "vi" | "en" | "ja" {
    const lowerQuery = query.toLowerCase();

    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(query)) {
      return "ja";
    }

    if (
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
        query,
      )
    ) {
      return "vi";
    }

    const viWords = [
      "tôi",
      "bạn",
      "của",
      "và",
      "với",
      "cho",
      "là",
      "có",
      "trong",
      "về",
      "như",
      "khi",
      "được",
    ];
    if (viWords.some((word) => lowerQuery.includes(word))) {
      return "vi";
    }

    return "en";
  }

  private getRejectionMessage(language: "vi" | "en" | "ja"): string {
    if (language === "ja") {
      return `申し訳ございません。私はTorii Nihongo Gakuinの日本語学習アシスタントですので、以下のことについてのみお手伝いできます：

📚 **日本語学習：**
- 文法、語彙、漢字の説明
- 学習方法とJLPT試験対策
- 学習資料とフラッシュカード

🏫 **プラットフォーム情報：**
- コース（自習とライブ）
- 模擬試験と練習問題
- 日本語に関するブログ記事
- プラットフォームの機能

日本語学習や私たちのコースについて何かご質問はありますか？😊`;
    }

    if (language === "en") {
      return `I'm sorry, I'm a Japanese learning assistant for Torii Nihongo Gakuin, so I can only help you with:

📚 **Japanese Learning:**
- Explaining grammar, vocabulary, and Kanji
- Study methods and JLPT exam preparation
- Study materials and flashcards

🏫 **Platform Information:**
- Courses (self-paced and live)
- Practice tests and mock exams
- Blog posts about Japanese
- Platform features

Do you have any questions about learning Japanese or our courses? 😊`;
    }

    // Default: Vietnamese
    return `Xin lỗi, tôi là trợ lý học tiếng Nhật của Torii Nihongo Gakuin, nên tôi chỉ có thể giúp bạn với:

📚 **Học tiếng Nhật:**
- Giải thích ngữ pháp, từ vựng, Kanji
- Phương pháp học và luyện thi JLPT
- Tài liệu học tập và flashcard

🏫 **Thông tin về nền tảng:**
- Khóa học (tự học và live)
- Bài kiểm tra và luyện đề
- Bài viết blog về tiếng Nhật
- Tính năng nền tảng

Bạn có câu hỏi nào về học tiếng Nhật hoặc khóa học của chúng tôi không? 😊`;
  }

  private isOffTopicQuery(query: string): boolean {
    const lower = query.toLowerCase().trim();

    const japaneseContext =
      /jlpt|n[1-5]|tiếng nhật|japanese|日本語|nihongo|kanji|漢字|hiragana|ひらがな|katakana|カタカナ|ngữ pháp|grammar|từ vựng|vocabulary|học|learn|勉強|khóa học|course|bài học|lesson|luyện thi|practice|flashcard/i;
    if (japaneseContext.test(lower)) return false;

    if (
      /\d+\s*[+\-*/×÷]\s*\d+/.test(lower) ||
      /[a-z]\s*[+\-*/×÷=]\s*[a-z0-9]/i.test(lower) ||
      /^([\d\s+\-*/×÷=]+)$/i.test(lower) ||
      /^(what is|bao nhiêu|bằng bao nhiêu|tính|calculate|solve|phép tính|giản)/i.test(
        lower,
      )
    ) {
      return true;
    }

    const techKeywords =
      /(docker|nodejs|react|nextjs|nestjs|python|java|c\+\+|typescript|git|github|code|coding|debug|terminal|command|server|api|backend|frontend|vscode|agp|gradle|android studio|aws|ec2|s3|devops|ci\/cd|nginx|ssl|certbot|redis|database|sql|prisma)/i;
    if (techKeywords.test(lower)) return true;

    const aiKeywords =
      /(chatgpt|gemini|claude|deepseek|openai|prompt|midjourney|image generation|ai model|人工知能|deep learning|machine learning|人工智慧)/i;
    if (aiKeywords.test(lower)) return true;

    const generalTopics =
      /(weather|thời tiết|tin tức|news|thể thao|bóng đá|football|tennis|movie|phim|music|nhạc|song|anime|netflix|game|trò chơi|mua sắm|fashion|thời trang|makeup|shopping|idol|ca sĩ|diễn viên|celebrity|tiktok|facebook|instagram|youtube|genshin|valorant|lol|pubg|minecraft|roblox|mlbb|pokemon)/i;
    if (generalTopics.test(lower)) return true;

    if (
      /(du lịch|travel|khách sạn|hotel|cooking|nấu ăn|料理|recipe|vacation|nghỉ dưỡng)/i.test(
        lower,
      )
    )
      return true;

    const nonJPSubjects =
      /(math|toán|physics|vật lý|chemistry|hóa|biology|sinh|history|địa lý|geography|english|tiếng anh|korean|tiếng hàn|chinese|tiếng trung|spanish|french|pháp)/i;
    if (nonJPSubjects.test(lower)) return true;

    if (
      /(lawyer|luật sư|legal advice|pháp lý|politics|chính trị|president|election|government|financial advice|tài chính|đầu tư|loan|vay|stock|chứng khoán|bitcoin|crypto|forex|investment|trading)/i.test(
        lower,
      )
    )
      return true;

    if (
      /(bệnh|pain|đau|triệu chứng|diagnose|chẩn đoán|medical advice|tư vấn y tế|stress|trầm cảm|anxiety|mental health|psychology|tâm lý)/i.test(
        lower,
      )
    )
      return true;

    if (
      /(dating|hẹn hò|love|yêu|relationship|mối quan hệ|crush|girlfriend|boyfriend|tỏ tình|chia tay|tan vỡ|彼氏|彼女)/i.test(
        lower,
      )
    )
      return true;

    if (
      /(write|viết|tạo|compose|kể).*(story|truyện|poem|bài thơ|fanfic|roleplay|song|lyrics|chế|parody|novel|tiểu thuyết)/i.test(
        lower,
      )
    )
      return true;

    if (
      /(translate|dịch|翻訳).*(english|vietnamese|chinese|korean|thai|spanish|french)/i.test(
        lower,
      )
    )
      return true;

    if (
      /(who are you|what are you|bạn là ai|あなたは誰|tell me about yourself|giới thiệu về bạn)/i.test(
        lower,
      ) &&
      !/(help|assist|support|hỗ trợ|feature|tính năng|platform|nền tảng)/i.test(
        lower,
      )
    ) {
      return true;
    }

    if (/(joke|冗談|chuyện cười|đùa|funny|vui|おもしろい)/i.test(lower))
      return true;

    if (
      /(homework|bài tập|giải bài|đáp án)/i.test(lower) &&
      nonJPSubjects.test(lower)
    )
      return true;

    return false;
  }

  private checkEmptyJsonResponse(
    response: string | null | undefined,
    queryType: string,
  ): boolean {
    if (!response) return false;

    try {
      // Extract JSON from markdown code block
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) return false;

      const jsonStr = jsonMatch[1].trim();
      const parsed = JSON.parse(jsonStr);

      // Check for different empty patterns based on queryType
      const type = queryType.toUpperCase();

      switch (type) {
        case "FLASHCARD":
          return (
            (Array.isArray(parsed.decks) && parsed.decks.length === 0) ||
            (Array.isArray(parsed.flashcards) &&
              parsed.flashcards.length === 0) ||
            parsed.count === 0
          );

        case "COURSE":
          return (
            (Array.isArray(parsed.courses) && parsed.courses.length === 0) ||
            parsed.course === null ||
            parsed.count === 0
          );

        case "BLOG":
          return (
            (Array.isArray(parsed.blogs) && parsed.blogs.length === 0) ||
            (Array.isArray(parsed.results) && parsed.results.length === 0) ||
            parsed.count === 0
          );

        case "ENROLLMENT":
          return (
            (Array.isArray(parsed.enrollments) &&
              parsed.enrollments.length === 0) ||
            parsed.count === 0
          );

        case "ASSESSMENT":
          return (
            (Array.isArray(parsed.results) && parsed.results.length === 0) ||
            (Array.isArray(parsed.assessments) &&
              parsed.assessments.length === 0) ||
            parsed.count === 0
          );

        case "ASSESSMENT_HISTORY":
          return (
            (Array.isArray(parsed.history) && parsed.history.length === 0) ||
            parsed.count === 0
          );
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  private getEmptyDataMessage(queryType: string, query: string): string {
    const language = this.detectLanguage(query);

    const messages = {
      FLASHCARD: {
        vi: "Xin lỗi, hiện tại không có flashcard nào phù hợp với yêu cầu của bạn. Bạn có thể thử:\n\n• Tìm kiếm flashcard deck khác\n• Yêu cầu tạo flashcard mới với topic khác\n• Hỏi về các deck flashcard công khai có sẵn",
        en: "Sorry, I couldn't find any flashcards matching your request. You can try:\n\n• Search for other flashcard decks\n• Request to create new flashcards with a different topic\n• Ask about available public flashcard decks",
        ja: "申し訳ございません。リクエストに一致するフラッシュカードが見つかりませんでした。次のことを試してください：\n\n• 他のフラッシュカードデッキを検索する\n• 別のトピックで新しいフラッシュカードの作成をリクエストする\n• 利用可能な公開フラッシュカードデッキについて質問する",
      },
      COURSE: {
        vi: "Xin lỗi, không tìm thấy khóa học phù hợp với yêu cầu của bạn. Bạn có thể:\n\n• Thử tìm kiếm với từ khóa khác\n• Xem tất cả khóa học có sẵn\n• Hỏi về khóa học cụ thể theo level (N5, N4, N3, N2, N1)",
        en: "Sorry, no courses found matching your request. You can:\n\n• Try searching with different keywords\n• View all available courses\n• Ask about specific courses by level (N5, N4, N3, N2, N1)",
        ja: "申し訳ございません。リクエストに一致するコースが見つかりませんでした。次のことができます：\n\n• 異なるキーワードで検索してみる\n• 利用可能なすべてのコースを表示する\n• レベル別の特定のコースについて質問する（N5、N4、N3、N2、N1）",
      },
      BLOG: {
        vi: "Xin lỗi, không tìm thấy bài viết blog nào về chủ đề này. Bạn có thể:\n\n• Tìm kiếm với chủ đề khác về tiếng Nhật\n• Xem các bài viết blog mới nhất\n• Hỏi về các chủ đề blog có sẵn",
        en: "Sorry, no blog posts found on this topic. You can:\n\n• Search for other Japanese-related topics\n• View recent blog posts\n• Ask about available blog topics",
        ja: "申し訳ございません。このトピックに関するブログ記事が見つかりませんでした。次のことができます：\n\n• 他の日本語関連のトピックを検索する\n• 最近のブログ記事を表示する\n• 利用可能なブログトピックについて質問する",
      },
      ENROLLMENT: {
        vi: "Bạn chưa đăng ký khóa học nào. Bạn có thể:\n\n• Xem danh sách khóa học có sẵn\n• Tìm hiểu về các khóa học theo level\n• Hỏi về chi tiết khóa học bạn quan tâm",
        en: "You haven't enrolled in any courses yet. You can:\n\n• View available courses\n• Learn about courses by level\n• Ask about course details you're interested in",
        ja: "まだコースに登録していません。次のことができます：\n\n• 利用可能なコースを表示する\n• レベル別のコースについて学ぶ\n• 興味のあるコースの詳細について質問する",
      },
      ASSESSMENT: {
        vi: "Xin lỗi, không tìm thấy bài kiểm tra nào phù hợp. Bạn có thể:\n\n• Xem tất cả bài kiểm tra có sẵn\n• Tìm bài test theo level (N5, N4, N3, N2, N1)\n• Hỏi về đề thi thử JLPT",
        en: "Sorry, no assessments found. You can:\n\n• View all available assessments\n• Find tests by level (N5, N4, N3, N2, N1)\n• Ask about JLPT mock exams",
        ja: "申し訳ございません。評価テストが見つかりませんでした。次のことができます：\n\n• 利用可能なすべての評価を表示する\n• レベル別のテストを見つける（N5、N4、N3、N2、N1）\n• JLPT模擬試験について質問する",
      },
      ASSESSMENT_HISTORY: {
        vi: "Bạn chưa làm bài kiểm tra nào. Bạn có thể:\n\n• Xem các bài test có sẵn\n• Bắt đầu làm bài test thử\n• Tìm hiểu về hệ thống đánh giá",
        en: "You haven't taken any assessments yet. You can:\n\n• View available tests\n• Start taking a practice test\n• Learn about the assessment system",
        ja: "まだ評価テストを受けていません。次のことができます：\n\n• 利用可能なテストを表示する\n• 練習テストを開始する\n• 評価システムについて学ぶ",
      },
    };

    const typeMessages = messages[queryType] || messages.COURSE;
    return typeMessages[language] || typeMessages.vi;
  }

  private async invalidateThreadCache(
    threadId: number,
    userId: number,
  ): Promise<void> {
    const messagePattern = `ai_thread_messages:${threadId}:*`;

    const redisClient = this.redis.getClient();
    const messageKeys = await redisClient.keys(messagePattern);

    const keysToDelete = [
      this.getThreadCacheKey(threadId),
      this.getUserThreadsCacheKey(userId),
      ...messageKeys,
    ];

    this.logger.warn(
      `[Cache INVALIDATE] Deleting ${keysToDelete.length} keys for thread ${threadId}: ${keysToDelete.join(", ")}`,
    );

    for (const key of keysToDelete) {
      await this.redis.del(key);
    }

    this.logger.warn(
      `[Cache INVALIDATE] Successfully deleted ${keysToDelete.length} keys`,
    );
  }

  async handleQuery(userId: number, dto: SendQueryDto) {
    const queryStartTime = Date.now();
    const { threadId, query } = dto;

    this.logger.log(
      `[handleQuery] User ID: ${userId} | Thread ID: ${threadId}`,
    );
    this.logger.log(`⏱️  Query started at: ${new Date().toLocaleTimeString()}`);

    const cacheKey = this.getThreadCacheKey(threadId);
    let thread = await this.redis.get(cacheKey);

    if (!thread) {
      thread = await this.threadRepo.findById(threadId);
      if (!thread || thread.userId !== userId) {
        throw new NotFoundException("Thread not found");
      }
      await this.redis.set(
        cacheKey,
        JSON.stringify(thread),
        this.THREAD_CACHE_TTL,
      );
    } else {
      thread = typeof thread === "string" ? JSON.parse(thread) : thread;
      if (thread.userId !== userId) {
        throw new NotFoundException("Thread not found");
      }
    }

    // Check if query is off-topic (not related to Japanese learning)
    const isOffTopic = this.isOffTopicQuery(query);
    if (isOffTopic) {
      this.logger.warn(`🚫 Off-topic query detected: "${query}"`);

      const detectedLanguage = this.detectLanguage(query);
      const rejectionMessage = this.getRejectionMessage(detectedLanguage);
      this.logger.log(`📢 Language detected: ${detectedLanguage}`);

      const queryRecord = await this.queryRepo.create({
        threadId,
        userId,
        query,
        queryType: "GENERAL" as any,
        agentRole: "SENSEI",
        routingReason:
          "Off-topic query rejected and handled by default Sensei policy.",
        initialResponse: rejectionMessage,
      });

      // Save user + rejection messages in parallel, then finalize together
      await Promise.all([
        this.messageRepo.create({
          threadId,
          userId,
          queryId: queryRecord.id,
          role: ChatRole.USER,
          content: query,
        }),
        this.messageRepo.create({
          threadId,
          userId,
          queryId: queryRecord.id,
          role: ChatRole.ASSISTANT,
          content: rejectionMessage,
        }),
      ]);

      await Promise.all([
        this.queryRepo.update(queryRecord.id, {
          status: QueryStatus.COMPLETED,
        }),
        this.invalidateThreadCache(threadId, userId),
      ]);

      return {
        queryId: queryRecord.id,
        response: rejectionMessage,
        requiresApproval: false,
        toolCalls: [],
      };
    }

    // ── Load persistent memory ────────────────────────────────────────────
    // Retrieve user context + active goal from Redis (fire in parallel)
    const [userContext, currentGoal] = await Promise.all([
      this.agentMemory.getUserContext(userId).catch(() => null),
      this.agentMemory.getGoal(userId).catch(() => null),
    ]);

    // ── AI-Powered Planning ───────────────────────────────────────────────
    // 🧠 Thay vì dùng keyword matching để detect query type & agent role,
    // ta dùng Claude để reasoning về intent của user và chọn tool phù hợp.
    // Nếu Claude call thất bại → tự động fallback về keyword routing.
    const availableTools = this.agentService.getAvailableTools();
    const plan = await this.toolPlanner.plan(query, availableTools, {
      userContext,
      currentGoal,
    });

    const queryType = plan.queryType;
    const agentRole = plan.primaryRole;
    const routingReason = plan.reasoning;
    const suggestedTools = plan.suggestedTools;
    const needsMultipleTools =
      plan.suggestedTools.length > 1 || requiresMultipleTools(query);

    // Detect flashcard generation request
    const isFlashcardGeneration =
      queryType === QueryType.FLASHCARD &&
      (query.toLowerCase().includes("tạo") ||
        query.toLowerCase().includes("create") ||
        query.toLowerCase().includes("generate"));

    this.logger.log(
      `🧠 [${plan.isAIPlanned ? "AI Plan" : "Keyword Fallback"}] type=${queryType}, role=${agentRole}`,
    );
    if (plan.collaboratorRoles.length > 0) {
      this.logger.log(
        `Collaborator roles: ${plan.collaboratorRoles.join(", ")}`,
      );
    }
    this.logger.debug(`Routing reason: ${routingReason}`);
    this.logger.log(`Is flashcard generation: ${isFlashcardGeneration}`);
    if (suggestedTools.length > 0) {
      this.logger.log(`Suggested tools: [${suggestedTools.join(", ")}]`);
    }

    // ── Handle goal-setting intent ─────────────────────────────────────────
    // If user is setting a learning goal → save to Redis immediately (fire-and-forget)
    if (plan.isGoalSetting) {
      const goalIntent = this.agentMemory.detectGoalIntent(query);
      const roadmapGen: Promise<any[]> = goalIntent.targetLevel
        ? this.toolPlanner
            .generateRoadmap(
              goalIntent.targetLevel,
              userContext?.jlptLevel ?? undefined,
            )
            .catch(() => [])
        : Promise.resolve([]);
      roadmapGen
        .then((roadmapSteps) => {
          this.agentMemory
            .saveGoal(userId, {
              title: goalIntent.targetLevel
                ? `Mục tiêu đạt ${goalIntent.targetLevel}`
                : "Lộ trình học tiếng Nhật",
              targetLevel: goalIntent.targetLevel,
              rawStatement: query,
              roadmapSteps,
            })
            .catch(() => {});
        })
        .catch(() => {});
    }

    const detectionTime = Date.now() - queryStartTime;
    this.logger.log(`⏱️  [+${detectionTime}ms] Planning completed`);

    // Build chat messages with language detection and multi-tool hint
    let systemPrompt = this.promptService.getSystemPrompt(
      queryType,
      undefined,
      query,
      userId,
    );
    this.logger.debug(
      `[System Prompt] Generated for userId: ${userId}, queryType: ${queryType}`,
    );

    // Inject suggested tools hint if planner identified specific tools
    if (suggestedTools.length > 0) {
      systemPrompt = `${systemPrompt}\n\nSuggested tools to use for this query: ${suggestedTools.join(", ")}`;
    } else if (needsMultipleTools) {
      const multiToolHint = generateMultiToolHint(query);
      systemPrompt = `${systemPrompt}\n\n${multiToolHint}`;
    }

    // ── Inject persistent memory context ─────────────────────────────────
    const contextBlock = this.agentMemory.buildContextSystemBlock(
      userContext,
      currentGoal,
    );
    if (contextBlock) {
      systemPrompt = `${systemPrompt}\n${contextBlock}`;
    }

    const messages: ClaudeMessageParam[] = [
      // System messages are extracted by AgentService.extractSystemAndMessages() before the Anthropic API call
      { role: "system", content: systemPrompt } as any,
    ];

    // Add recent thread messages for context (last 30 — extended for better continuity)
    const recentMessages = thread.messages.slice(-30);
    for (const msg of recentMessages) {
      if (msg.role === ChatRole.USER || msg.role === ChatRole.ASSISTANT) {
        // Strip embedded JSON code blocks from assistant messages so the AI
        // doesn't get confused by large raw data blobs in conversation history.
        let content = msg.content;
        if (msg.role === ChatRole.ASSISTANT) {
          content = content.replace(/```json[\s\S]*?```/g, "").trim();
        }
        if (content) {
          messages.push({
            role: msg.role.toLowerCase() as "user" | "assistant",
            content,
          });
        }
      }
    }

    // Add current query
    messages.push({
      role: "user",
      content: query,
    });

    // Determine if we should FORCE tool calling
    // Force tools for queries that MUST fetch data (user-specific data)
    const shouldForceTools = plan.forceTools;

    if (shouldForceTools) {
      this.logger.log(`🎯 FORCING tool calls for queryType: ${queryType}`);
    }

    // Get response from Agent
    const aiCallStartTime = Date.now();
    const agentResponse = await this.agentService.getResponse(
      messages,
      true,
      shouldForceTools,
      query,
      agentRole,
      plan.collaboratorRoles,
      queryType,
    );
    const aiCallTime = Date.now() - aiCallStartTime;
    this.logger.log(
      `⏱️  [+${Date.now() - queryStartTime}ms] Initial AI call completed (took ${aiCallTime}ms)`,
    );

    // DEBUG: Log tool calls
    if (agentResponse.toolCalls && agentResponse.toolCalls.length > 0) {
      this.logger.log(`✅ AI called ${agentResponse.toolCalls.length} tools:`);
      agentResponse.toolCalls.forEach((tc) => {
        this.logger.log(`  - ${tc.name}(${tc.arguments})`);
      });
    } else {
      this.logger.warn(
        `⚠️ AI did NOT call any tools (expected for flashcard generation: ${isFlashcardGeneration})`,
      );
      if (isFlashcardGeneration) {
        this.logger.error(
          `🚨 CRITICAL: AI should have called generate_flashcard_suggestions tool!`,
        );
      }
    }

    // Add assistant's response to messages (including tool_calls if any)
    const assistantMessage: any = {
      role: "assistant",
      content: agentResponse.content || null,
    };

    // If there are tool calls, add them to the assistant message
    if (agentResponse.toolCalls && agentResponse.toolCalls.length > 0) {
      assistantMessage.tool_calls = agentResponse.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.name,
          arguments: tc.arguments,
        },
      }));
    }

    messages.push(assistantMessage);

    // Create query record
    const queryRecord = await this.queryRepo.create({
      threadId,
      userId,
      query,
      queryType: queryType as any,
      agentRole,
      routingReason,
      initialResponse: agentResponse.content || undefined,
    });

    // If no tool calls, save user + assistant message + finalize in parallel
    if (!agentResponse.toolCalls || agentResponse.toolCalls.length === 0) {
      // Save user message + optional assistant message + status update in parallel
      await Promise.all([
        this.messageRepo.create({
          threadId,
          userId,
          queryId: queryRecord.id,
          role: ChatRole.USER,
          content: query,
        }),
        agentResponse.content
          ? this.messageRepo.create({
              threadId,
              userId,
              queryId: queryRecord.id,
              role: ChatRole.ASSISTANT,
              content: agentResponse.content,
            })
          : Promise.resolve(),
        this.queryRepo.update(queryRecord.id, {
          status: QueryStatus.COMPLETED,
        }),
      ]);

      // Ensure thread/messages cache is refreshed for immediate UI reads.
      await this.invalidateThreadCache(threadId, userId);

      return {
        queryId: queryRecord.id,
        response: agentResponse.content,
        requiresApproval: false,
        toolCalls: [],
      };
    }

    // AUTO-EXECUTE TOOLS immediately without waiting for approval
    const toolNames = agentResponse.toolCalls.map((tc) => tc.name).join(", ");
    this.logger.log(
      `🔧 Auto-executing ${agentResponse.toolCalls.length} tool(s): [${toolNames}]`,
    );

    // Save user message + mark PROCESSING in parallel before tool execution
    await Promise.all([
      this.messageRepo.create({
        threadId,
        userId,
        queryId: queryRecord.id,
        role: ChatRole.USER,
        content: query,
      }),
      this.queryRepo.update(queryRecord.id, {
        status: QueryStatus.PROCESSING,
      }),
    ]);

    this.logger.log("📞 Calling agentService.executeApprovedTools...");
    this.logger.log(`📋 QueryType being passed: ${queryType}`);
    const executeStartTime = Date.now();

    const executeResult = await this.agentService.executeApprovedTools({
      toolCalls: agentResponse.toolCalls.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: JSON.parse(tc.arguments),
      })),
      threadId,
      userId,
      messages, // Pass conversation history with tool_calls
      queryType, // Pass queryType to format the final response correctly
      agentRole,
    });

    const executeElapsed = Date.now() - executeStartTime;
    this.logger.log(`✅ executeApprovedTools completed in ${executeElapsed}ms`);
    this.logger.log(
      `⏱️  [+${Date.now() - queryStartTime}ms] Tool execution completed`,
    );
    this.logger.log(
      `   - Tool results count: ${executeResult.results?.length || 0}`,
    );
    this.logger.log(`   - Has finalResponse: ${!!executeResult.finalResponse}`);
    this.logger.log(
      `   - FinalResponse preview: ${executeResult.finalResponse?.substring(0, 100)}...`,
    );

    // Save tool results to query
    await this.queryRepo.update(queryRecord.id, {
      status: QueryStatus.COMPLETED,
      executedTools: executeResult.results,
    });

    // Prepare final response - ensure we always have something to show user
    let finalResponse = executeResult.finalResponse;

    // Check if response contains empty JSON (no data)
    // For GRAMMAR / TRANSLATION: always append the raw tool data as a JSON block.
    // This is done server-side so we are NOT dependent on the AI including it.
    const qtStr = queryType as string;
    if (
      qtStr === "GRAMMAR" &&
      finalResponse &&
      !finalResponse.includes("```json")
    ) {
      const grammarResult = executeResult.results.find(
        (r) => r.toolName === "explain_grammar_personalized",
      );
      if (grammarResult?.result?.data) {
        finalResponse += `\n\n\`\`\`json\n${JSON.stringify(grammarResult.result.data, null, 2)}\n\`\`\``;
      }
    } else if (
      qtStr === "TRANSLATION" &&
      finalResponse &&
      !finalResponse.includes("```json")
    ) {
      const translationResult = executeResult.results.find(
        (r) => r.toolName === "translate_with_level_context",
      );
      if (translationResult?.result?.data) {
        finalResponse += `\n\n\`\`\`json\n${JSON.stringify(translationResult.result.data, null, 2)}\n\`\`\``;
      }
    }

    const isEmptyJsonResponse = this.checkEmptyJsonResponse(
      finalResponse,
      queryType,
    );

    if (isEmptyJsonResponse) {
      this.logger.warn(
        `Empty JSON response detected for queryType: ${queryType}`,
      );
      finalResponse = this.getEmptyDataMessage(queryType, query);
    }
    // If no final response from AI, create a fallback based on tool results
    else if (!finalResponse || finalResponse.trim().length === 0) {
      this.logger.warn(
        `No final response from AI, generating fallback message`,
      );

      // Check if tools returned data
      const hasData = executeResult.results.some(
        (r) =>
          r.result &&
          typeof r.result === "object" &&
          "data" in r.result &&
          r.result.data !== null,
      );

      if (hasData) {
        finalResponse =
          "Xin lỗi, tôi đã tìm thấy thông tin nhưng gặp lỗi khi định dạng câu trả lời. Bạn có thể hỏi lại câu hỏi này không?";
      } else {
        const toolName = executeResult.results[0]?.toolName || "tool";
        if (toolName.includes("enrollment") || toolName.includes("progress")) {
          finalResponse =
            "Hiện tại tôi chưa tìm thấy thông tin enrollment hoặc progress của bạn. Có thể bạn chưa đăng ký khóa học nào hoặc chưa có tiến độ học tập.";
        } else if (toolName.includes("course")) {
          finalResponse =
            "Xin lỗi, tôi không tìm thấy khóa học phù hợp với yêu cầu của bạn. Bạn có thể thử tìm kiếm với từ khóa khác không?";
        } else {
          finalResponse =
            "Xin lỗi, tôi không tìm thấy thông tin bạn yêu cầu. Bạn có thể thử hỏi lại với cách khác không?";
        }
      }
    }

    this.logger.debug(`Saving assistant message to database...`);

    // ── Multi-agent collaborator insights ──────────────────────────────────
    // After the primary agent finishes, each collaborator role adds a brief
    // specialist perspective (max 2 sentences) based ONLY on the already-fetched
    // tool results — no extra DB/MCP calls, no fabricated data.
    if (
      plan.collaboratorRoles.length > 0 &&
      finalResponse &&
      executeResult.results.length > 0
    ) {
      const insights = await Promise.all(
        plan.collaboratorRoles.map((role) =>
          this.agentService
            .getCollaboratorInsight(
              query,
              finalResponse!,
              executeResult.results.map((r) => ({
                toolCallId: r.toolCallId,
                toolName: r.toolName,
                result: r.result,
                error: r.error,
                executedAt: new Date(),
              })),
              role,
            )
            .catch(() => undefined),
        ),
      );
      const validLines = plan.collaboratorRoles
        .map((role, i) => (insights[i] ? `• [${role}] ${insights[i]}` : null))
        .filter(Boolean);
      if (validLines.length > 0) {
        finalResponse = `${finalResponse}\n\n---\n**Phân tích bổ sung từ chuyên gia:**\n${validLines.join("\n")}`;
        this.logger.log(
          `🤝 [Multi-Agent] Appended ${validLines.length} collaborator insight(s)`,
        );
      }
    }

    // ── Update persistent user context (fire-and-forget) ──────────────────
    // Detect JLPT level from query/response to gradually build user profile.
    const detectedLevel =
      this.agentMemory.extractLevelFromText(query) ??
      this.agentMemory.extractLevelFromText(finalResponse ?? "");
    this.agentMemory
      .upsertUserContext(userId, {
        totalSessions: 1,
        ...(detectedLevel ? { jlptLevel: detectedLevel } : {}),
      })
      .catch(() => {});

    // ── Auto-advance roadmap step (fire-and-forget) ────────────────────────
    // Khi agent thực sự dùng tool thành công → tự động mark bước roadmap
    // phù hợp sang DONE để goal tracker phản ánh hoạt động học thật của user.
    if (currentGoal?.roadmapSteps?.length && executeResult.results.length > 0) {
      const usedStepTypes = new Set<string>();
      for (const r of executeResult.results) {
        if (r.error) continue;
        const n = r.toolName.toLowerCase();
        if (n.includes("grammar") || n.includes("explain"))
          usedStepTypes.add("GRAMMAR");
        if (n.includes("vocab") || n.includes("kanji"))
          usedStepTypes.add("VOCABULARY");
        if (n.includes("flashcard") || n.includes("deck"))
          usedStepTypes.add("FLASHCARD");
        if (
          n.includes("assessment") ||
          n.includes("quiz") ||
          n.includes("test")
        )
          usedStepTypes.add("ASSESSMENT");
        if (n.includes("course") || n.includes("lesson"))
          usedStepTypes.add("COURSE");
        if (
          n.includes("blog") ||
          n.includes("reading") ||
          n.includes("article")
        )
          usedStepTypes.add("READING");
        if (n.includes("listen")) usedStepTypes.add("LISTENING");
        if (n.includes("enrollment") || n.includes("progress"))
          usedStepTypes.add("COURSE");
      }
      const matchingStep = currentGoal.roadmapSteps.find(
        (s) => s.status === "PENDING" && usedStepTypes.has(s.stepType),
      );
      if (matchingStep) {
        this.agentMemory
          .markRoadmapStepDone(userId, matchingStep.order)
          .catch(() => {});
        this.logger.log(
          `📈 [Goal] Advanced step ${matchingStep.order} [${matchingStep.stepType}]: "${matchingStep.description}"`,
        );
      }
    }

    await this.messageRepo.create({
      threadId,
      userId,
      queryId: queryRecord.id,
      role: ChatRole.ASSISTANT,
      content: finalResponse,
      toolCalls: executeResult.results,
    });

    this.logger.log(
      `⏱️  [+${Date.now() - queryStartTime}ms] Message saved to DB`,
    );

    setTimeout(() => {
      void this.invalidateThreadCache(threadId, userId)
        .then(() =>
          this.logger.debug(`Cache invalidated for thread ${threadId}`),
        )
        .catch((error) =>
          this.logger.error(
            `Failed to invalidate cache for thread ${threadId}:`,
            error,
          ),
        );
    }, 100); // 100ms delay to ensure DB commit completes

    const totalTime = Date.now() - queryStartTime;
    this.logger.log(
      `⏱️  ✅ TOTAL QUERY TIME: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`,
    );
    this.logger.log(
      `⏱️  📊 Breakdown: Detection=${detectionTime}ms, AI=${aiCallTime}ms, Tools+Response=${executeElapsed}ms`,
    );

    return {
      queryId: queryRecord.id,
      response: finalResponse,
      requiresApproval: false,
      toolCalls: [],
    };
  }

  async createThread(userId: number, title?: string) {
    const thread = await this.threadRepo.create(userId, title);

    await this.redis.del(this.getUserThreadsCacheKey(userId));

    await this.redis.set(
      this.getThreadCacheKey(thread.id),
      JSON.stringify(thread),
      this.THREAD_CACHE_TTL,
    );

    return thread;
  }

  async getUserThreads(userId: number, limit = 20, page = 1) {
    // Only cache first page (page = 1)
    if (page === 1) {
      const cacheKey = this.getUserThreadsCacheKey(userId);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        const result = typeof cached === "string" ? JSON.parse(cached) : cached;
        this.logger.debug(`Cache hit for user threads: ${userId}`);
        return result;
      }
    }

    const result = await this.threadRepo.findByUserId(userId, limit, page);

    if (page === 1) {
      await this.redis.set(
        this.getUserThreadsCacheKey(userId),
        JSON.stringify(result),
        this.THREAD_CACHE_TTL,
      );
    }

    return result;
  }

  async getThreadMessages(
    userId: number,
    threadId: number,
    limit = 20,
    page = 1,
  ) {
    const thread = await this.threadRepo.findById(threadId);
    if (!thread || thread.userId !== userId) {
      throw new NotFoundException("Thread not found");
    }

    const messagesCacheKey = this.getMessagesCacheKey(threadId, limit, page);

    if (page === 1) {
      const cached = await this.redis.get(messagesCacheKey);
      if (cached) {
        const result = typeof cached === "string" ? JSON.parse(cached) : cached;
        const messageIds =
          result.data?.map((m: any) => m.id).join(",") || "none";
        return result;
      }
    }

    const result = await this.messageRepo.findByThreadId(threadId, limit, page);
    const messageIds = result.data.map((m) => m.id).join(",");
    if (page === 1) {
      await this.redis.set(
        messagesCacheKey,
        JSON.stringify(result),
        this.MESSAGES_CACHE_TTL,
      );
    }

    return result;
  }

  async deleteThread(userId: number, threadId: number) {
    const thread = await this.threadRepo.findById(threadId);
    if (!thread || thread.userId !== userId) {
      throw new NotFoundException("Thread not found");
    }

    const result = await this.threadRepo.delete(threadId);

    await this.invalidateThreadCache(threadId, userId);

    return result;
  }

  async clearUserCache(userId: number) {
    const threads = await this.threadRepo.findByUserId(userId, 1000, 1);

    const redisClient = this.redis.getClient();
    let totalKeysCleared = 0;

    for (const thread of threads.data) {
      const messagePattern = `ai_thread_messages:${thread.id}:*`;
      const messageKeys = await redisClient.keys(messagePattern);

      for (const key of messageKeys) {
        await this.redis.del(key);
        totalKeysCleared++;
      }

      await this.redis.del(this.getThreadCacheKey(thread.id));
      totalKeysCleared++;
    }

    await this.redis.del(this.getUserThreadsCacheKey(userId));
    totalKeysCleared++;

    return {
      message: "Cache cleared successfully",
      userId,
      threadsCleared: threads.data.length,
      keysCleared: totalKeysCleared,
    };
  }

  async debugMessageCount(threadId: number) {
    const allMessages = await this.messageRepo.getAllByThreadId(threadId);

    return {
      threadId,
      totalCount: allMessages.length,
      messageIds: allMessages.map((m) => m.id),
      firstMessageId: allMessages[0]?.id,
      lastMessageId: allMessages[allMessages.length - 1]?.id,
      messages: allMessages,
    };
  }
}
