import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import OpenAI from 'openai'
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
import { McpBaseService } from 'src/mcp-client/mcp-client.service'
import {
  AgentResponse,
  ExecuteToolsRequest,
  ExecuteToolsResponse,
  FastMCPResult,
  MCPToolResult,
  transformMCPToolToOpenAI,
} from 'src/mcp-client/mcp.model'
import { CourseMcpClient } from 'src/mcp-client/module/course/course-mcp.service'
import { EnrollmentMcpClient } from 'src/mcp-client/module/enrollment/enrollment-mcp.service'
import { ASSESSMENT_MCP_PROMPT } from 'src/mcp-client/module/assessment/assessment-mcp.prompt'
import { ASSESSMENT_HISTORY_MCP_PROMPT } from 'src/mcp-client/module/assessment_history/history-mcp.prompt'
import { QueryType } from 'src/mcp-client/shared/query-detection.utils'
import { getEnabledMCPServers, MCP_SERVERS } from 'src/shared/config/mcp-servers.config'
import { OPENAI_CONFIG, MCP_CONFIG } from 'src/shared/config/openai.config'

@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name)
  private readonly openai: OpenAI
  private allTools: ChatCompletionTool[] = []
  private toolsLoaded = false

  constructor(
    private readonly mcpBase: McpBaseService,
    private readonly courseMcp: CourseMcpClient,
    private readonly enrollmentMcp: EnrollmentMcpClient,
  ) {
    this.openai = new OpenAI({
      apiKey: OPENAI_CONFIG.apiKey,
    })
  }

  /**
   * Load tools eagerly when module initializes
   */
  async onModuleInit() {
    this.logger.log('🚀 AgentService initializing - loading MCP tools...')
    await this.loadTools()
    this.logger.log(`✅ AgentService ready with ${this.allTools.length} tools`)
  }

  /**
   * Load all available tools from MCP servers
   */
  async loadTools(): Promise<void> {
    if (this.toolsLoaded) return

    this.logger.log('Loading tools from MCP servers...')
    const tools: ChatCompletionTool[] = []

    try {
      const enabledServers = getEnabledMCPServers()

      for (const server of enabledServers) {
        try {
          const mcpTools = await this.mcpBase.listTools(server.url)
          const openAITools = mcpTools.map(transformMCPToolToOpenAI)
          tools.push(...openAITools)
          this.logger.log(`Loaded ${openAITools.length} tools from ${server.name}`)
        } catch (error) {
          this.logger.error(`Failed to load tools from ${server.name}:`, error.message)
        }
      }

      this.allTools = tools
      this.toolsLoaded = true
      this.logger.log(`Total tools loaded: ${tools.length}`)
    } catch (error) {
      this.logger.error('Failed to load MCP tools:', error)
    }
  }

  async getResponse(messages: ChatCompletionMessageParam[], useTools = true): Promise<AgentResponse> {
    if (!this.toolsLoaded) {
      await this.loadTools()
    }

    try {
      const completionOptions: any = {
        model: OPENAI_CONFIG.model,
        messages,
        tools: useTools && this.allTools.length > 0 ? this.allTools : undefined,
        tool_choice: useTools && this.allTools.length > 0 ? 'auto' : undefined,
        temperature: OPENAI_CONFIG.temperature,
      }

      // Only add max_completion_tokens if it's defined (not unlimited)
      if (OPENAI_CONFIG.maxTokens !== undefined) {
        completionOptions.max_completion_tokens = OPENAI_CONFIG.maxTokens
      }

      const response = await this.openai.chat.completions.create(completionOptions)

      const choice = response.choices[0]
      const toolCalls = choice.message.tool_calls

      if (toolCalls && toolCalls.length > 0) {
        return {
          content: choice.message.content,
          toolCalls: toolCalls.map((tc) => {
            // Handle both regular and custom tool calls
            if ('function' in tc) {
              return {
                id: tc.id,
                name: tc.function.name,
                arguments: tc.function.arguments,
              }
            }
            // Fallback for custom tool calls
            return {
              id: tc.id,
              name: (tc as any).name || 'unknown',
              arguments: (tc as any).arguments || '{}',
            }
          }),
          requiresApproval: MCP_CONFIG.toolApprovalRequired,
          finishReason: choice.finish_reason as 'stop' | 'tool_calls' | 'length' | null,
        }
      }

      return {
        content: choice.message.content,
        requiresApproval: false,
        finishReason: choice.finish_reason as 'stop' | 'tool_calls' | 'length' | null,
      }
    } catch (error) {
      this.logger.error('OpenAI API error:', error)
      throw new Error(`AI service error: ${error.message}`)
    }
  }

  async executeApprovedTools(request: ExecuteToolsRequest): Promise<ExecuteToolsResponse> {
    const results: MCPToolResult[] = []

    if (request.toolCalls.length > 1) {
      this.logger.log(
        `Executing ${request.toolCalls.length} tools in parallel: ${request.toolCalls.map((tc) => tc.name).join(', ')}`,
      )
    }

    const toolPromises = request.toolCalls.map(async (toolCall) => {
      try {
        const result = await this.executeToolCall(toolCall.name, toolCall.arguments, request.userId)
        if (result.result) {
          this.logger.log(`  Result preview: ${JSON.stringify(result.result).substring(0, 200)}...`)
        }
        this.logger.log(`=== Tool ${toolCall.name} completed ===\n`)

        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result: result.result,
          error: result.error,
          executedAt: result.executedAt,
        }
      } catch (error) {
        this.logger.error(`Failed to execute tool ${toolCall.name}:`, error.message)
        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result: null,
          error: error.message,
          executedAt: new Date(),
        }
      }
    })

    results.push(...(await Promise.all(toolPromises)))

    const toolMessages: ChatCompletionMessageParam[] = results.map((result) => ({
      role: 'tool' as const,
      tool_call_id: result.toolCallId,
      content: result.error || JSON.stringify(result.result),
    }))

    const messages: ChatCompletionMessageParam[] = [...(request.messages || []), ...toolMessages]

    // Add format instructions based on query type before final response
    this.logger.log(`🔍 QueryType for final response: "${request.queryType}" (type: ${typeof request.queryType})`)

    // Inject module-specific system prompt at the BEGINNING for ASSESSMENT or ASSESSMENT_HISTORY
    if (request.queryType === 'ASSESSMENT' || request.queryType === QueryType.ASSESSMENT) {
      this.logger.log('📋 Injecting ASSESSMENT module system prompt at the beginning')
      messages.unshift({
        role: 'system',
        content: ASSESSMENT_MCP_PROMPT,
      })
    } else if (request.queryType === 'ASSESSMENT_HISTORY' || request.queryType === QueryType.ASSESSMENT_HISTORY) {
      this.logger.log('📊 Injecting ASSESSMENT_HISTORY module system prompt at the beginning')
      messages.unshift({
        role: 'system',
        content: ASSESSMENT_HISTORY_MCP_PROMPT,
      })
    }

    // Add user instructions for other types
    if (request.queryType === 'COURSE' || request.queryType === QueryType.COURSE) {
      this.logger.log('📋 Adding COURSE format instructions to messages')
      messages.push({
        role: 'user',
        content: `CRITICAL INSTRUCTION - READ CAREFULLY:

You MUST respond with ONLY the JSON code block below. NOTHING ELSE.

DO NOT write:
- "Đây là các khóa học..." ❌
- "Website có..." ❌
- "Bạn muốn..." ❌
- Any greeting, intro, or follow-up text ❌

Your ENTIRE response must be EXACTLY this format:

\`\`\`json
{
  "courses": [complete array of all course objects from tool result],
  "count": total number
}
\`\`\`

That's it. Nothing before the \`\`\`json. Nothing after the closing \`\`\`.

Include in each course: id, title, slug, level, thumbnailUrl, courseType, price, moduleCount, lessonCount
Use EXACT data from tool result - do not modify.`,
      })
    } else if (request.queryType === 'BLOG' || request.queryType === QueryType.BLOG) {
      this.logger.log('📋 Adding BLOG format instructions to messages')
      messages.push({
        role: 'user',
        content: `CRITICAL INSTRUCTION - READ CAREFULLY:

You MUST respond with ONLY the JSON code block below. NOTHING ELSE.

DO NOT write:
- "Tôi tìm thấy..." ❌
- "Dưới đây là..." ❌
- "Bạn muốn..." ❌
- Any greeting, intro, or follow-up text ❌

Your ENTIRE response must be EXACTLY this format:

\`\`\`json
{
  "blogs": [complete array of all blog objects from tool result],
  "count": total number
}
\`\`\`

That's it. Nothing before the \`\`\`json. Nothing after the closing \`\`\`.

Include in each blog: id, title, slug, date, image, excerpt, tags
Use EXACT data from tool result - do not modify.`,
      })
    } else if (request.queryType === 'FLASHCARD' || request.queryType === QueryType.FLASHCARD) {
      this.logger.log('📋 Adding FLASHCARD format instructions to messages')
      messages.push({
        role: 'user',
        content: `CRITICAL INSTRUCTION - READ CAREFULLY:

You MUST respond with ONLY the JSON code block below. NOTHING ELSE.

DO NOT write:
- "Đây là bộ flashcard..." ❌
- "Website có..." ❌
- "Bạn muốn xem..." ❌
- Any greeting, intro, or follow-up text ❌

Your ENTIRE response must be EXACTLY this format:

\`\`\`json
{
  "decks": [complete array of all flashcard deck objects from tool result],
  "count": total number
}
\`\`\`

That's it. Nothing before the \`\`\`json. Nothing after the closing \`\`\`.

Include in each deck: id, title, level, card_count, owner_name, createdAt, updatedAt
Use EXACT data from tool result - do not modify.

NOTE: This is ONLY for search results. Flashcard GENERATION uses a different format.`,
      })
    } else if (
      request.queryType !== 'ASSESSMENT' &&
      request.queryType !== QueryType.ASSESSMENT &&
      request.queryType !== 'ASSESSMENT_HISTORY' &&
      request.queryType !== QueryType.ASSESSMENT_HISTORY &&
      request.queryType !== 'COURSE' &&
      request.queryType !== QueryType.COURSE &&
      request.queryType !== 'BLOG' &&
      request.queryType !== QueryType.BLOG &&
      request.queryType !== 'FLASHCARD' &&
      request.queryType !== QueryType.FLASHCARD
    ) {
      this.logger.warn(`⚠️ No format instructions added - queryType was: "${request.queryType}"`)
    }

    this.logger.debug('Messages being sent to OpenAI:')
    messages.forEach((msg, idx) => {
      if (msg.role === 'assistant' && 'tool_calls' in msg) {
        this.logger.debug(`[${idx}] ${msg.role} - has ${msg.tool_calls?.length || 0} tool_calls`)
      } else if (msg.role === 'tool') {
        this.logger.debug(`[${idx}] ${msg.role} - tool_call_id: ${msg.tool_call_id}`)
      } else {
        this.logger.debug(`[${idx}] ${msg.role}`)
      }
    })

    const finalCompletionOptions: any = {
      model: OPENAI_CONFIG.model,
      messages,
      temperature: OPENAI_CONFIG.temperature,
    }

    if (OPENAI_CONFIG.maxTokens !== undefined) {
      finalCompletionOptions.max_completion_tokens = OPENAI_CONFIG.maxTokens
    }

    try {
      this.logger.log('🔄 Calling OpenAI with tool results...')
      const startTime = Date.now()

      const finalResponse = await this.openai.chat.completions.create(finalCompletionOptions)

      const elapsed = Date.now() - startTime
      this.logger.log(`✅ OpenAI response received in ${elapsed}ms`)

      const finalChoice = finalResponse.choices[0]

      if (!finalChoice.message.content) {
        this.logger.warn('⚠️ OpenAI returned empty content in final response')
        this.logger.debug(`Tool results: ${JSON.stringify(results, null, 2)}`)
      } else {
        this.logger.log(`✅ Final response: ${finalChoice.message.content.substring(0, 200)}...`)
      }

      return {
        results,
        finalResponse: finalChoice.message.content || undefined,
        hasMoreTools: (finalChoice.message.tool_calls?.length ?? 0) > 0,
      }
    } catch (error) {
      this.logger.error('❌ Failed to get final response from OpenAI:', error.message)
      this.logger.error('Stack:', error.stack)
      this.logger.debug(`Messages sent: ${JSON.stringify(messages, null, 2)}`)

      // Return results but with no final response
      // The calling service will handle fallback message
      return {
        results,
        finalResponse: undefined,
        hasMoreTools: false,
      }
    }
  }

  private async executeToolCall(toolName: string, args: Record<string, any>, userId?: number): Promise<MCPToolResult> {
    // Determine which MCP server to use based on tool name
    const serverUrl = this.getServerUrlForTool(toolName)

    if (!serverUrl) {
      throw new Error(`No MCP server found for tool: ${toolName}`)
    }

    // Auto-inject user_id for assessment history tools that require it
    const lowerToolName = toolName.toLowerCase()
    const isHistoryTool =
      lowerToolName.includes('my_assessment') ||
      lowerToolName.includes('progress_summary') ||
      lowerToolName.includes('history')

    if (isHistoryTool && userId && !args.user_id) {
      this.logger.log(`🔐 Auto-injecting user_id=${userId} for history tool: ${toolName}`)
      args = { ...args, user_id: userId }
    }

    this.logger.debug(`Calling MCP server: ${serverUrl}`)
    this.logger.debug(`Tool: ${toolName}, Args: ${JSON.stringify(args)}`)

    const result: FastMCPResult = await this.mcpBase.executeTool(serverUrl, toolName, args)

    this.logger.debug(`MCP Response:`)
    this.logger.debug(`  Success: ${result.success}`)
    this.logger.debug(`  Error: ${result.error || 'none'}`)
    this.logger.debug(`  Data: ${result.data ? JSON.stringify(result.data).substring(0, 300) : 'null'}`)

    return {
      toolCallId: '', // Will be set by the caller
      toolName: toolName,
      result: result.success ? result.data : null,
      error: result.error || undefined,
      executedAt: new Date(),
    }
  }

  private getServerUrlForTool(toolName: string): string | null {
    const lowerToolName = toolName.toLowerCase()

    if (lowerToolName.includes('course')) {
      return MCP_SERVERS.course.url
    }

    if (
      lowerToolName.includes('enrollment') ||
      lowerToolName.includes('progress') ||
      lowerToolName.includes('learning')
    ) {
      return MCP_SERVERS.enrollment.url
    }

    if (
      lowerToolName.includes('flashcard') ||
      lowerToolName.includes('deck') ||
      lowerToolName.includes('generate_flashcard')
    ) {
      return MCP_SERVERS.flashcard.url
    }

    if (lowerToolName.includes('blog') || lowerToolName.includes('post') || lowerToolName.includes('article')) {
      return MCP_SERVERS.blog.url
    }

    // Assessment History tools (user's past attempts, progress, results)
    if (
      lowerToolName.includes('my_assessment') ||
      lowerToolName.includes('attempt_result') ||
      lowerToolName.includes('progress_summary') ||
      lowerToolName.includes('history')
    ) {
      return MCP_SERVERS.assessmentHistory.url
    }

    // Assessment Search tools (find available tests/exams)
    if (
      lowerToolName.includes('assessment') ||
      lowerToolName.includes('test') ||
      lowerToolName.includes('quiz') ||
      lowerToolName.includes('exam')
    ) {
      return MCP_SERVERS.assessment.url
    }

    // Default to first enabled server
    const enabledServers = getEnabledMCPServers()
    return enabledServers.length > 0 ? enabledServers[0].url : null
  }

  getAvailableTools(): ChatCompletionTool[] {
    return this.allTools
  }
}
