import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { McpBaseService } from "src/mcp-client/mcp-client.service";
import {
  AgentResponse,
  ClaudeMessageParam,
  ClaudeTool,
  ExecuteToolsRequest,
  ExecuteToolsResponse,
  FastMCPResult,
  MCPToolResult,
  transformMCPToolToClaude,
} from "src/mcp-client/mcp.model";
import { CourseMcpClient } from "src/mcp-client/module/course/course-mcp.service";
import { EnrollmentMcpClient } from "src/mcp-client/module/enrollment/enrollment-mcp.service";
import { ASSESSMENT_MCP_PROMPT } from "src/mcp-client/module/assessment/assessment-mcp.prompt";
import {
  ASSESSMENT_HISTORY_MCP_PROMPT,
  getAssessmentHistoryPrompt,
} from "src/mcp-client/module/assessment_history/history-mcp.prompt";
import { QueryType } from "src/mcp-client/shared/query-detection.utils";
import {
  validateQuery,
  getValidationPrompts,
  detectLanguage,
} from "src/mcp-client/shared/validation.utils";
import {
  getEnabledMCPServers,
  MCP_SERVERS,
} from "src/shared/config/mcp-servers.config";
import { CLAUDE_CONFIG } from "src/shared/config/claude.config";
import { AgentRole } from "src/mcp-client/shared/agent-routing.utils";
import { getAgentRolePrompt } from "src/mcp-client/prompts/agent-role.prompt";
import { buildFormatInstruction } from "src/mcp-client/agent/agent-response-formatter.util";
import { tryBuildFastStructuredResponse } from "src/mcp-client/agent/fast-structured-response.util";
import {
  selectToolsForRoles,
  ToolRegistryItem,
} from "src/mcp-client/agent/role-tools-policy.util";
import {
  resolveServerUrlForTool,
  shouldInjectUserId,
} from "src/mcp-client/agent/tool-resolution.util";

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly anthropic: Anthropic;
  private allTools: ClaudeTool[] = [];
  private toolRegistry: ToolRegistryItem[] = [];
  private toolsLoaded = false;
  private readonly roleServerPolicies: Record<
    AgentRole,
    { allowedServers: string[]; fallbackServers: string[] }
  > = {
    [AgentRole.SENSEI]: {
      allowedServers: ["sensei", "course", "flashcard", "blog"],
      fallbackServers: ["enrollment"],
    },
    [AgentRole.ASSESSMENT]: {
      allowedServers: ["assessment", "assessmentHistory"],
      fallbackServers: ["course"],
    },
    [AgentRole.ANALYTICS]: {
      allowedServers: ["enrollment"],
      fallbackServers: ["course"],
    },
  };

  constructor(
    private readonly mcpBase: McpBaseService,
    private readonly courseMcp: CourseMcpClient,
    private readonly enrollmentMcp: EnrollmentMcpClient,
  ) {
    const runtimeApiKey = (process.env.CLAUDE_API_KEY || CLAUDE_CONFIG.apiKey)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!runtimeApiKey) {
      throw new Error(
        "CLAUDE_API_KEY is missing. Please set CLAUDE_API_KEY in learning-service/.env and restart the service.",
      );
    }

    this.anthropic = new Anthropic({
      apiKey: runtimeApiKey,
    });
  }

  private getRuntimeModel(): string {
    return (
      process.env.CLAUDE_MODEL ||
      CLAUDE_CONFIG.model ||
      "claude-sonnet-4-6"
    )
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }

  /**
   * Load all available tools from MCP servers
   */
  async loadTools(): Promise<void> {
    if (this.toolsLoaded) return;

    //this.logger.log('Loading tools from MCP servers...')
    const tools: ClaudeTool[] = [];
    const registry: ToolRegistryItem[] = [];

    try {
      for (const [serverKey, server] of Object.entries(MCP_SERVERS)) {
        if (!server.enabled) {
          continue;
        }

        try {
          const mcpTools = await this.mcpBase.listTools(server.url);
          const claudeTools = mcpTools.map(transformMCPToolToClaude);
          tools.push(...claudeTools);
          for (const tool of claudeTools) {
            registry.push({
              serverKey,
              serverUrl: server.url,
              tool,
            });
          }
          //this.logger.log(`Loaded ${claudeTools.length} tools from ${server.name}`)
        } catch (error) {
          //this.logger.error(`Failed to load tools from ${server.name}:`, error.message)
        }
      }

      this.allTools = tools;
      this.toolRegistry = registry;
      this.toolsLoaded = true;
      //this.logger.log(`Total tools loaded: ${tools.length}`)
    } catch (error) {
      //this.logger.error('Failed to load MCP tools:', error)
    }
  }

  /**
   * Helper: Extract system prompt strings from messages, separating them from user/assistant messages.
   * Anthropic requires system to be a top-level parameter, not in the messages array.
   */
  private extractSystemAndMessages(
    messages: ClaudeMessageParam[],
    extraSystemParts: string[] = [],
  ): { system: string; userMessages: ClaudeMessageParam[] } {
    const systemParts: string[] = [...extraSystemParts];
    const userMessages: ClaudeMessageParam[] = [];

    for (const msg of messages) {
      if ((msg as any).role === "system") {
        // Extract system content
        const content = (msg as any).content;
        if (typeof content === "string") {
          systemParts.push(content);
        }
      } else {
        userMessages.push(msg);
      }
    }

    return {
      system: systemParts.join("\n\n"),
      userMessages,
    };
  }

  async getResponse(
    messages: ClaudeMessageParam[],
    useTools = true,
    forceTools = false,
    originalQuery?: string,
    agentRole?: AgentRole,
    collaboratorRoles: AgentRole[] = [],
    queryType?: string,
  ): Promise<AgentResponse> {
    if (!this.toolsLoaded) {
      await this.loadTools();
    }

    // 🔒 VALIDATION: Check domain constraints and JLPT levels
    if (originalQuery) {
      const validation = validateQuery(originalQuery);
      if (!validation.isValid && validation.suggestedResponse) {
        //this.logger.warn(`❌ Query validation failed: ${validation.errorMessage}`)
        return {
          content: validation.suggestedResponse,
          requiresApproval: false,
          finishReason: "stop",
        };
      }
    }

    // 🎯 INJECT VALIDATION PROMPTS: Add domain and JLPT validation prompts
    const validationPrompts = getValidationPrompts();
    const rolePrompt = getAgentRolePrompt(agentRole || AgentRole.SENSEI);

    // Build system parts (Anthropic requires system as a top-level param)
    const systemParts: string[] = [rolePrompt, validationPrompts];

    if (collaboratorRoles.length > 0) {
      systemParts.unshift(
        `Collaborator roles available: ${collaboratorRoles.join(", ")}. Use tools and responses that stay consistent with the primary role while considering collaborator context when needed.`,
      );
    }

    // Separate system messages from user/assistant messages
    const { system, userMessages } = this.extractSystemAndMessages(
      messages,
      systemParts,
    );

    try {
      const routedTools = this.getToolsForRole(agentRole, collaboratorRoles);

      // For GRAMMAR/TRANSLATION, lock the tool choice to the single relevant tool
      // but only if the tool actually exists in routedTools (sensei MCP must be reachable)
      let toolChoice: Anthropic.Messages.ToolChoice | undefined = undefined;
      if (useTools && routedTools.length > 0) {
        const toolExists = (name: string) =>
          routedTools.some((t) => t.name === name);

        if (
          queryType === "GRAMMAR" &&
          toolExists("explain_grammar_personalized")
        ) {
          toolChoice = {
            type: "tool",
            name: "explain_grammar_personalized",
          };
        } else if (
          queryType === "TRANSLATION" &&
          toolExists("translate_with_level_context")
        ) {
          toolChoice = {
            type: "tool",
            name: "translate_with_level_context",
          };
        } else {
          toolChoice = forceTools ? { type: "any" } : { type: "auto" };
        }
      }

      const runtimeModel = this.getRuntimeModel();
      if (!runtimeModel) {
        throw new Error(
          "CLAUDE_MODEL is missing. Please set CLAUDE_MODEL in learning-service/.env and restart the service.",
        );
      }

      const completionOptions: Anthropic.Messages.MessageCreateParamsNonStreaming =
        {
          model: runtimeModel,
          system,
          messages: userMessages,
          tools: useTools && routedTools.length > 0 ? routedTools : undefined,
          tool_choice: toolChoice,
          temperature: CLAUDE_CONFIG.temperature,
          max_tokens: CLAUDE_CONFIG.maxTokens,
        };

      const response = await this.anthropic.messages.create(completionOptions);

      // Extract text content and tool_use blocks from response
      const textContent = response.content
        .filter(
          (block): block is Anthropic.Messages.TextBlock =>
            block.type === "text",
        )
        .map((block) => block.text)
        .join("");

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock =>
          block.type === "tool_use",
      );

      if (toolUseBlocks.length > 0) {
        return {
          content: textContent || null,
          toolCalls: toolUseBlocks.map((tc) => ({
            id: tc.id,
            name: tc.name,
            arguments: JSON.stringify(tc.input),
          })),
          requiresApproval: false,
          finishReason:
            response.stop_reason === "tool_use"
              ? "tool_calls"
              : (response.stop_reason as any),
        };
      }

      return {
        content: textContent || null,
        requiresApproval: false,
        finishReason:
          response.stop_reason === "end_turn"
            ? "stop"
            : (response.stop_reason as any),
      };
    } catch (error) {
      ////this.logger.error('Claude API error:', error)
      const message = error instanceof Error ? error.message : String(error);

      const isInvalidApiKeyError =
        /invalid.*api.key/i.test(message) ||
        /authentication/i.test(message) ||
        (/\b401\b/.test(message) && /api.key/i.test(message));

      const isPermissionError =
        /permission/i.test(message) ||
        /forbidden/i.test(message) ||
        /\b403\b/.test(message);

      if (isInvalidApiKeyError) {
        const lang = originalQuery ? detectLanguage(originalQuery) : "vi";

        const localizedMessage =
          lang === "ja"
            ? "Claude APIキーが無効、期限切れ、または無効化されています。管理者に有効なCLAUDE_API_KEYへ更新してサービスを再起動してもらってください。"
            : lang === "en"
              ? "The Claude API key is invalid, expired, or revoked. Please ask your admin to update CLAUDE_API_KEY and restart the service."
              : "Claude API key hiện tại không hợp lệ, đã hết hạn, hoặc đã bị thu hồi. Vui lòng cập nhật CLAUDE_API_KEY hợp lệ và khởi động lại service.";

        return {
          content: localizedMessage,
          requiresApproval: false,
          finishReason: "stop",
        };
      }

      if (isPermissionError) {
        const lang = originalQuery ? detectLanguage(originalQuery) : "vi";

        const localizedMessage =
          lang === "ja"
            ? "現在のClaude APIキーには必要な権限がありません。管理者に、APIキーの権限を確認してもらってください。"
            : lang === "en"
              ? "The current Claude API key does not have the required permissions. Please ask your admin to check the API key permissions."
              : "API key Claude hiện tại chưa có quyền cần thiết. Vui lòng kiểm tra quyền của API key.";

        return {
          content: localizedMessage,
          requiresApproval: false,
          finishReason: "stop",
        };
      }

      throw new Error(`AI service error: ${message}`);
    }
  }

  async executeApprovedTools(
    request: ExecuteToolsRequest,
  ): Promise<ExecuteToolsResponse> {
    const results: MCPToolResult[] = [];

    const toolCallsStartTime = Date.now();
    const toolPromises = request.toolCalls.map(async (toolCall) => {
      try {
        const result = await this.executeToolCall(
          toolCall.name,
          toolCall.arguments,
          request.userId,
        );
        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result: result.result,
          error: result.error,
          executedAt: result.executedAt,
        };
      } catch (error) {
        //this.logger.error(`Failed to execute tool ${toolCall.name}:`, error.message)
        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result: null,
          error: error instanceof Error ? error.message : String(error),
          executedAt: new Date(),
        };
      }
    });

    results.push(...(await Promise.all(toolPromises)));
    const toolCallsTime = Date.now() - toolCallsStartTime;
    //this.logger.log(`⏱️  Tool calls completed in ${toolCallsTime}ms`)

    const fastResponse = tryBuildFastStructuredResponse(
      request.queryType,
      results,
    );

    if (fastResponse) {
      this.logger.log(
        `⚡ Fast-path response generated for queryType=${request.queryType} (skip second Claude call).`,
      );
      return {
        results,
        finalResponse: fastResponse,
        hasMoreTools: false,
      };
    }

    const toolResultContents: Anthropic.Messages.ToolResultBlockParam[] =
      results.map((result) => ({
        type: "tool_result" as const,
        tool_use_id: result.toolCallId,
        content: result.error || JSON.stringify(result.result),
      }));

    const assistantToolUseContent: Anthropic.Messages.ContentBlockParam[] =
      request.toolCalls.map((tc) => ({
        type: "tool_use" as const,
        id: tc.id,
        name: tc.name,
        input: tc.arguments,
      }));

    const existingMessages = (request.messages || []).filter(
      (m) => (m as any).role !== "system",
    );

    const messages: ClaudeMessageParam[] = [
      ...existingMessages,
      {
        role: "assistant",
        content: assistantToolUseContent,
      } as ClaudeMessageParam,
      {
        role: "user",
        content: toolResultContents,
      } as ClaudeMessageParam,
    ];

    // Build system prompt parts
    const systemParts: string[] = [];

    if (
      request.queryType === "ASSESSMENT" ||
      request.queryType === QueryType.ASSESSMENT
    ) {
      //this.logger.log('📋 Injecting ASSESSMENT module system prompt')
      systemParts.push(ASSESSMENT_MCP_PROMPT);
    } else if (
      request.queryType === "ASSESSMENT_HISTORY" ||
      request.queryType === QueryType.ASSESSMENT_HISTORY
    ) {
      //this.logger.log('📊 Injecting ASSESSMENT_HISTORY module system prompt')
      systemParts.push(
        getAssessmentHistoryPrompt(
          QueryType.ASSESSMENT_HISTORY,
          request.userId,
        ),
      );
    }

    // 🔒 INJECT VALIDATION PROMPTS
    const validationPrompts = getValidationPrompts();
    const resolvedRole =
      request.agentRole === AgentRole.ASSESSMENT ||
      request.agentRole === AgentRole.ANALYTICS ||
      request.agentRole === AgentRole.SENSEI
        ? (request.agentRole as AgentRole)
        : AgentRole.SENSEI;

    const rolePrompt = getAgentRolePrompt(resolvedRole);
    systemParts.unshift(validationPrompts);
    systemParts.unshift(rolePrompt);

    // Extract any system messages from existing messages
    const { system: existingSystem, userMessages: cleanMessages } =
      this.extractSystemAndMessages(messages, systemParts);

    // Add user instructions for specific query types
    const formatInstruction = buildFormatInstruction(
      request.queryType,
      results,
    );

    // If we have format instructions, append to last user message
    if (formatInstruction) {
      cleanMessages.push({
        role: "user",
        content: formatInstruction,
      });
    }

    const runtimeModel = this.getRuntimeModel();
    if (!runtimeModel) {
      return {
        results,
        finalResponse: undefined,
        hasMoreTools: false,
      };
    }

    // ── ReAct Loop ──────────────────────────────────────────────────────────
    // [FIX] Trước đây: Claude được gọi đúng 1 lần, KHÔNG có tools → chỉ
    // format lại dữ liệu tool vừa trả về, không thể reason thêm.
    //
    // Bây giờ: mỗi vòng lặp đưa kết quả tools trở lại Claude KÈM theo
    // danh sách tools → Claude tự quyết định:
    //   • stop_reason = "end_turn"  → đã đủ thông tin, trả lời ngay
    //   • stop_reason = "tool_use"  → cần thêm dữ liệu, gọi tool tiếp, lặp lại
    //
    // Đây là vòng lặp Reason → Act → Observe → Reason lại của ReAct pattern.
    // MAX_REACT_ITERATIONS giới hạn số vòng để tránh infinite loop.
    const MAX_REACT_ITERATIONS = 4;

    // [FIX] Tool set được pass vào Claude trong mỗi vòng lặp.
    // Cũ: finalCompletionOptions không có trường `tools` → Claude bị "mù",
    // không thể chủ động gọi thêm tool dù kết quả đầu trả về không đủ.
    const routedToolsForLoop = this.getToolsForRole(
      request.agentRole as AgentRole | undefined,
    );

    let reactIteration = 0;

    while (reactIteration <= MAX_REACT_ITERATIONS) {
      try {
        // [FIX] Truyền tools vào đây — đây là điểm mấu chốt.
        // Anthropic API: khi tools có mặt, model được phép phát ra
        // tool_use blocks thay vì chỉ text. Nếu không có tools,
        // Claude KHÔNG THỂ gọi tool dù muốn.
        const loopResponse = await this.anthropic.messages.create({
          model: runtimeModel,
          system: existingSystem,
          messages: cleanMessages,
          tools: routedToolsForLoop.length > 0 ? routedToolsForLoop : undefined,
          tool_choice:
            routedToolsForLoop.length > 0 ? { type: "auto" } : undefined,
          temperature: CLAUDE_CONFIG.temperature,
          max_tokens: CLAUDE_CONFIG.maxTokens,
        });

        const textBlocks = loopResponse.content.filter(
          (b): b is Anthropic.Messages.TextBlock => b.type === "text",
        );
        const toolUseBlocks = loopResponse.content.filter(
          (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
        );

        // ── OBSERVE: Claude tự quyết định đã đủ thông tin → trả lời ──────
        // [FIX] Cũ: luôn return sau 1 Claude call dù stop_reason là gì.
        // Mới: chỉ return khi Claude thực sự kết thúc (end_turn).
        if (
          loopResponse.stop_reason === "end_turn" ||
          toolUseBlocks.length === 0
        ) {
          const finalText = textBlocks.map((b) => b.text).join("");
          return {
            results,
            finalResponse: finalText || undefined,
            hasMoreTools: false,
          };
        }

        // ── ACT: Claude cần thêm dữ liệu → thực thi tool mới ───────────
        // [FIX] Đây là bước hoàn toàn mới — trước đây không tồn tại.
        // Claude có thể gọi tool khác sau khi thấy kết quả tool đầu tiên,
        // ví dụ: thấy user chưa enroll course nào → tự gọi thêm search_courses
        // để gợi ý khóa học phù hợp, không cần user hỏi lại.
        this.logger.log(
          `🔄 [ReAct iteration ${reactIteration + 1}/${MAX_REACT_ITERATIONS}] Claude called ${toolUseBlocks.length} additional tool(s): ${toolUseBlocks.map((b) => b.name).join(", ")}`,
        );

        const additionalToolResults = await Promise.all(
          toolUseBlocks.map(async (toolUse) => {
            const res = await this.executeToolCall(
              toolUse.name,
              toolUse.input as Record<string, any>,
              request.userId,
            );
            return { ...res, toolCallId: toolUse.id };
          }),
        );

        results.push(...additionalToolResults);

        // ── Cập nhật message chain để Claude có context đầy đủ ──────────
        // [FIX] Thêm cặp assistant(tool_use) + user(tool_result) vào
        // cleanMessages. Đây là giao thức bắt buộc của Anthropic API:
        // model output phải được echo lại trước khi thêm tool_result.
        // Nếu thiếu bước này, API sẽ báo lỗi invalid message sequence.
        cleanMessages.push({
          role: "assistant",
          content: loopResponse.content,
        } as ClaudeMessageParam);

        cleanMessages.push({
          role: "user",
          content: additionalToolResults.map((r) => ({
            type: "tool_result" as const,
            tool_use_id: r.toolCallId,
            content: r.error || JSON.stringify(r.result),
          })),
        } as ClaudeMessageParam);

        reactIteration++;
      } catch (error) {
        this.logger.error(
          `❌ ReAct loop error at iteration ${reactIteration}:`,
          error instanceof Error ? error.message : String(error),
        );
        return {
          results,
          finalResponse: undefined,
          hasMoreTools: false,
        };
      }
    }

    // ── Max iterations reached ───────────────────────────────────────────
    // [FIX] Safety net: nếu Claude liên tục gọi tool sau 4 vòng (hiếm gặp),
    // buộc kết thúc bằng 1 lần gọi không có tools để user không bị treo.
    this.logger.warn(
      `⚠️ ReAct loop reached MAX_REACT_ITERATIONS (${MAX_REACT_ITERATIONS}). Forcing final answer without tools.`,
    );

    try {
      const forcedResponse = await this.anthropic.messages.create({
        model: runtimeModel,
        system: existingSystem,
        messages: cleanMessages,
        temperature: CLAUDE_CONFIG.temperature,
        max_tokens: CLAUDE_CONFIG.maxTokens,
      });

      const finalText = forcedResponse.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      return {
        results,
        finalResponse: finalText || undefined,
        hasMoreTools: false,
      };
    } catch (error) {
      return {
        results,
        finalResponse: undefined,
        hasMoreTools: false,
      };
    }
  }

  private async executeToolCall(
    toolName: string,
    args: Record<string, any>,
    userId?: number,
  ): Promise<MCPToolResult> {
    // Determine which MCP server to use based on tool name
    const serverUrl = this.getServerUrlForTool(toolName);

    if (!serverUrl) {
      throw new Error(`No MCP server found for tool: ${toolName}`);
    }

    // Auto-inject user_id for tools that require authenticated user context
    const requiresUserId = shouldInjectUserId(toolName);

    if (requiresUserId && userId) {
      // ALWAYS override user_id with authenticated userId to prevent security issues
      if (args.user_id && args.user_id !== userId) {
        //this.logger.warn(
        //  `⚠️  Overriding user_id=${args.user_id} with authenticated userId=${userId} for tool: ${toolName}`,
        //)
      } else {
        //this.logger.log(`🔐 Auto-injecting user_id=${userId} for tool: ${toolName}`)
      }
      args = { ...args, user_id: userId };
    }

    //this.logger.debug(`Calling MCP server: ${serverUrl}`)
    //this.logger.debug(`Tool: ${toolName}, Args: ${JSON.stringify(args)}`)

    const result: FastMCPResult = await this.mcpBase.executeTool(
      serverUrl,
      toolName,
      args,
    );

    //this.logger.debug(`MCP Response:`)
    //this.logger.debug(`  Success: ${result.success}`)
    //this.logger.debug(`  Error: ${result.error || 'none'}`)
    //this.logger.debug(`  Data: ${result.data ? JSON.stringify(result.data).substring(0, 300) : 'null'}`)

    return {
      toolCallId: "", // Will be set by the caller
      toolName: toolName,
      result: result.success ? result.data : null,
      error: result.error || undefined,
      executedAt: new Date(),
    };
  }

  private getServerUrlForTool(toolName: string): string | null {
    const enabledServers = getEnabledMCPServers();
    const enabledUrls = enabledServers.map((s) => s.url);
    return resolveServerUrlForTool(toolName, this.toolRegistry, enabledUrls);
  }

  getAvailableTools(): ClaudeTool[] {
    return this.allTools;
  }

  /**
   * Multi-agent: Chạy một Claude call ngắn với perspective của collaborator role.
   *
   * Pattern:
   *   Primary agent (SENSEI) → gọi tools → lấy kết quả
   *   Collaborator (ASSESSMENT) → nhận kết quả tool → phân tích từ góc độ riêng
   *   Collaborator (ANALYTICS)  → nhận kết quả tool → phân tích từ góc độ riêng
   *   → Merge tất cả insight vào response cuối
   *
   * Quy tắc: Chỉ comment dựa trên dữ liệu tool đã có.
   * KHÔNG bịa thêm tên course/test/blog cụ thể.
   */
  async getCollaboratorInsight(
    query: string,
    primaryResponse: string,
    toolResults: MCPToolResult[],
    collaboratorRole: AgentRole,
  ): Promise<string | undefined> {
    if (!primaryResponse || toolResults.length === 0) return undefined;

    const runtimeModel = this.getRuntimeModel();
    const rolePrompt = getAgentRolePrompt(collaboratorRole);

    // Tóm tắt ngắn gọn kết quả tool (tránh context quá dài)
    const toolSummary = toolResults
      .slice(0, 3)
      .map((r) =>
        r.error
          ? `[${r.toolName}]: Error - ${r.error}`
          : `[${r.toolName}]: ${JSON.stringify(r.result).substring(0, 250)}`,
      )
      .join("\n");

    try {
      const response = await this.anthropic.messages.create({
        model: runtimeModel,
        system: `${rolePrompt}\n\nYou are the ${collaboratorRole} specialist agent providing a brief supplementary analysis. Respond in 1-2 concise sentences. Base your response SOLELY on the tool data provided. Do NOT fabricate specific course names, test scores, flashcard content, or any resource that wasn't in the tool data.`,
        messages: [
          {
            role: "user",
            content: `User query: "${query}"\n\nTool data retrieved:\n${toolSummary}\n\nAs the ${collaboratorRole} agent, add a brief insight from your specialist perspective.`,
          },
        ],
        max_tokens: 180,
        temperature: 0.2,
      });

      const insight = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();

      if (insight) {
        this.logger.log(
          `🤝 [Multi-Agent] ${collaboratorRole}: ${insight.substring(0, 100)}...`,
        );
      }
      return insight || undefined;
    } catch {
      return undefined;
    }
  }

  private getToolsForRole(
    primaryRole?: AgentRole,
    collaboratorRoles: AgentRole[] = [],
  ): ClaudeTool[] {
    return selectToolsForRoles(
      this.allTools,
      this.toolRegistry,
      this.roleServerPolicies,
      primaryRole,
      collaboratorRoles,
      this.logger,
    );
  }
}
