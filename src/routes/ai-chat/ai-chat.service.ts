import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { AIThreadRepository, AIQueryRepository, AIMessageRepository } from './ai-chat.repo'
import { ChatRole, QueryStatus } from '@prisma/client'
import { SendQueryDto } from './ai-chat.dto'
import { AgentService } from 'src/mcp-client/agent.service'
import { PromptService } from 'src/mcp-client/module/course/course-mcp.prompt'
import { RedisContextService } from 'src/shared/redis/redis-context.service'
import {
  detectQueryType,
  requiresMultipleTools,
  generateMultiToolHint,
  suggestToolCombination,
} from 'src/mcp-client/shared/query-detection.utils'

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name)
  private readonly THREAD_CACHE_TTL = 10 // 10 seconds in seconds
  private readonly MESSAGES_CACHE_TTL = 10 // 10 minutes in seconds

  constructor(
    private readonly agentService: AgentService,
    private readonly promptService: PromptService,
    private readonly threadRepo: AIThreadRepository,
    private readonly queryRepo: AIQueryRepository,
    private readonly messageRepo: AIMessageRepository,
    private readonly redis: RedisContextService,
  ) {
    this.agentService.loadTools().catch((err) => {
      this.logger.error('Failed to load MCP tools on startup:', err)
    })
  }

  private getThreadCacheKey(threadId: number): string {
    return `ai_thread:${threadId}`
  }

  private getMessagesCacheKey(threadId: number, limit?: number, page?: number): string {
    if (limit !== undefined && page !== undefined) {
      return `ai_thread_messages:${threadId}:${limit}:${page}`
    }
    return `ai_thread_messages:${threadId}`
  }

  private getUserThreadsCacheKey(userId: number): string {
    return `ai_user_threads:${userId}`
  }

  private async invalidateThreadCache(threadId: number, userId: number): Promise<void> {
    await Promise.all([
      this.redis.del(this.getThreadCacheKey(threadId)),
      this.redis.del(this.getMessagesCacheKey(threadId)),
      this.redis.del(this.getUserThreadsCacheKey(userId)),
    ])
  }

  async handleQuery(userId: number, dto: SendQueryDto) {
    const { threadId, query } = dto

    const cacheKey = this.getThreadCacheKey(threadId)
    let thread = await this.redis.get(cacheKey)

    if (!thread) {
      thread = await this.threadRepo.findById(threadId)
      if (!thread || thread.userId !== userId) {
        throw new NotFoundException('Thread not found')
      }
      await this.redis.set(cacheKey, JSON.stringify(thread), this.THREAD_CACHE_TTL)
    } else {
      thread = typeof thread === 'string' ? JSON.parse(thread) : thread
      if (thread.userId !== userId) {
        throw new NotFoundException('Thread not found')
      }
    }

    const queryType = detectQueryType(query)
    const needsMultipleTools = requiresMultipleTools(query)
    const suggestedTools = needsMultipleTools ? suggestToolCombination(query) : []

    this.logger.log(`Query type detected: ${queryType}`)
    if (needsMultipleTools) {
      this.logger.log(`Multi-tool query detected. Suggested tools: [${suggestedTools.join(', ')}]`)
    }

    // Build chat messages with language detection and multi-tool hint
    let systemPrompt = this.promptService.getSystemPrompt(queryType, undefined, query)

    // Add multi-tool hint if needed
    if (needsMultipleTools) {
      const multiToolHint = generateMultiToolHint(query)
      systemPrompt = `${systemPrompt}\n\n${multiToolHint}`
    }

    const messages: ChatCompletionMessageParam[] = [{ role: 'system', content: systemPrompt }]

    // Add recent thread messages for context (last 10)
    const recentMessages = thread.messages.slice(-10)
    for (const msg of recentMessages) {
      if (msg.role === ChatRole.USER || msg.role === ChatRole.ASSISTANT) {
        messages.push({
          role: msg.role.toLowerCase() as 'user' | 'assistant',
          content: msg.content,
        })
      }
    }

    // Add current query
    messages.push({
      role: 'user',
      content: query,
    })

    // Get response from Agent
    const agentResponse = await this.agentService.getResponse(messages, true)

    // Add assistant's response to messages (including tool_calls if any)
    const assistantMessage: any = {
      role: 'assistant',
      content: agentResponse.content || null,
    }

    // If there are tool calls, add them to the assistant message
    if (agentResponse.toolCalls && agentResponse.toolCalls.length > 0) {
      assistantMessage.tool_calls = agentResponse.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments: tc.arguments,
        },
      }))
    }

    messages.push(assistantMessage)

    // Create query record
    const queryRecord = await this.queryRepo.create({
      threadId,
      userId,
      query,
      queryType: queryType as any,
      initialResponse: agentResponse.content || undefined,
      requiresApproval: false, // Always false now (auto-execute)
    })

    // Save user message
    await this.messageRepo.create({
      threadId,
      userId,
      queryId: queryRecord.id,
      role: ChatRole.USER,
      content: query,
    })

    // If no tool calls, save assistant response and return
    if (!agentResponse.toolCalls || agentResponse.toolCalls.length === 0) {
      if (agentResponse.content) {
        await this.messageRepo.create({
          threadId,
          userId,
          queryId: queryRecord.id,
          role: ChatRole.ASSISTANT,
          content: agentResponse.content,
        })
      }

      await this.queryRepo.update(queryRecord.id, {
        status: QueryStatus.COMPLETED,
      })

      return {
        queryId: queryRecord.id,
        response: agentResponse.content,
        requiresApproval: false,
        toolCalls: [],
      }
    }

    // AUTO-EXECUTE TOOLS immediately without waiting for approval
    const toolNames = agentResponse.toolCalls.map((tc) => tc.name).join(', ')
    this.logger.log(`Auto-executing ${agentResponse.toolCalls.length} tool(s): [${toolNames}]`)

    await this.queryRepo.update(queryRecord.id, {
      status: QueryStatus.PROCESSING,
    })

    const executeResult = await this.agentService.executeApprovedTools({
      toolCalls: agentResponse.toolCalls.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: JSON.parse(tc.arguments),
      })),
      threadId,
      userId,
      messages, // Pass conversation history with tool_calls
    })

    // Save tool results to query
    await this.queryRepo.update(queryRecord.id, {
      status: QueryStatus.COMPLETED,
      executedTools: executeResult.results,
    })

    // Save assistant response with tool results
    if (executeResult.finalResponse) {
      this.logger.debug(`Saving assistant message to database...`)
      await this.messageRepo.create({
        threadId,
        userId,
        queryId: queryRecord.id,
        role: ChatRole.ASSISTANT,
        content: executeResult.finalResponse,
        toolCalls: executeResult.results,
      })
    }

    // Invalidate cache after new messages
    await this.invalidateThreadCache(threadId, userId)

    return {
      queryId: queryRecord.id,
      response: executeResult.finalResponse,
      requiresApproval: false,
      toolCalls: [],
    }
  }

  /**
   * Create new thread
   */
  async createThread(userId: number, title?: string) {
    const thread = await this.threadRepo.create(userId, title)

    // Invalidate user threads cache
    await this.redis.del(this.getUserThreadsCacheKey(userId))

    // Cache the new thread
    await this.redis.set(this.getThreadCacheKey(thread.id), JSON.stringify(thread), this.THREAD_CACHE_TTL)

    return thread
  }

  /**
   * Get user's threads with pagination
   */
  async getUserThreads(userId: number, limit = 20, page = 1) {
    // Only cache first page (page = 1)
    if (page === 1) {
      const cacheKey = this.getUserThreadsCacheKey(userId)
      const cached = await this.redis.get(cacheKey)

      if (cached) {
        const result = typeof cached === 'string' ? JSON.parse(cached) : cached
        this.logger.debug(`Cache hit for user threads: ${userId}`)
        return result
      }
    }

    // Cache miss or not first page - fetch from database
    const result = await this.threadRepo.findByUserId(userId, limit, page)

    // Cache first page only
    if (page === 1) {
      await this.redis.set(this.getUserThreadsCacheKey(userId), JSON.stringify(result), this.THREAD_CACHE_TTL)
    }

    return result
  }

  /**
   * Get thread messages with pagination
   */
  async getThreadMessages(userId: number, threadId: number, limit = 20, page = 1) {
    // Verify thread ownership
    const threadCacheKey = this.getThreadCacheKey(threadId)
    let thread = await this.redis.get(threadCacheKey)

    if (!thread) {
      thread = await this.threadRepo.findById(threadId)
      if (!thread || thread.userId !== userId) {
        throw new NotFoundException('Thread not found')
      }
      await this.redis.set(threadCacheKey, JSON.stringify(thread), this.THREAD_CACHE_TTL)
    } else {
      thread = typeof thread === 'string' ? JSON.parse(thread) : thread
      if (thread.userId !== userId) {
        throw new NotFoundException('Thread not found')
      }
    }

    // Only cache first page of messages (page = 1)
    if (page === 1) {
      const messagesCacheKey = this.getMessagesCacheKey(threadId, limit, page)
      const cached = await this.redis.get(messagesCacheKey)

      if (cached) {
        const result = typeof cached === 'string' ? JSON.parse(cached) : cached
        this.logger.debug(`Cache hit for thread messages: ${threadId} (limit=${limit}, page=${page})`)
        return result
      }
    }

    // Cache miss or not first page - fetch from database
    const result = await this.messageRepo.findByThreadId(threadId, limit, page)

    // Cache first page only
    if (page === 1) {
      await this.redis.set(
        this.getMessagesCacheKey(threadId, limit, page),
        JSON.stringify(result),
        this.MESSAGES_CACHE_TTL,
      )
    }

    return result
  }

  /**
   * Delete thread
   */
  async deleteThread(userId: number, threadId: number) {
    const thread = await this.threadRepo.findById(threadId)
    if (!thread || thread.userId !== userId) {
      throw new NotFoundException('Thread not found')
    }

    // Delete from database
    const result = await this.threadRepo.delete(threadId)

    // Invalidate all related cache
    await this.invalidateThreadCache(threadId, userId)

    return result
  }

  /**
   * Clear all cache for a user (development/debugging)
   */
  async clearUserCache(userId: number) {
    const cacheKey = this.getUserThreadsCacheKey(userId)
    await this.redis.del(cacheKey)
    this.logger.log(`Cleared cache for user ${userId}`)
    return { message: 'Cache cleared successfully', userId }
  }
}
