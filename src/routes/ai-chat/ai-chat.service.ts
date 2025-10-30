import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { AIThreadRepository, AIQueryRepository, AIMessageRepository } from './ai-chat.repo'
import { ChatRole, QueryStatus } from '@prisma/client'
import { SendQueryDto } from './ai-chat.dto'
import { AgentService } from 'src/mcp-client/agent.service'
import { PromptService } from 'src/mcp-client/module/course/course-mcp.prompt'
import { detectQueryType } from 'src/mcp-client/module/course/course-mcp.query'
import { RedisContextService } from 'src/shared/redis/redis-context.service'

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name)
  private readonly THREAD_CACHE_TTL = 259200 // 3 days in seconds (3 * 24 * 60 * 60)
  private readonly MESSAGES_CACHE_TTL = 259200 // 3 days in seconds

  constructor(
    private readonly agentService: AgentService,
    private readonly promptService: PromptService,
    private readonly threadRepo: AIThreadRepository,
    private readonly queryRepo: AIQueryRepository,
    private readonly messageRepo: AIMessageRepository,
    private readonly redis: RedisContextService,
  ) {
    // Load MCP tools on startup
    this.agentService.loadTools().catch((err) => {
      this.logger.error('Failed to load MCP tools on startup:', err)
    })
  }

  /**
   * Get cache key for thread
   */
  private getThreadCacheKey(threadId: number): string {
    return `ai_thread:${threadId}`
  }

  /**
   * Get cache key for thread messages
   */
  private getMessagesCacheKey(threadId: number): string {
    return `ai_thread_messages:${threadId}`
  }

  /**
   * Get cache key for user threads list
   */
  private getUserThreadsCacheKey(userId: number): string {
    return `ai_user_threads:${userId}`
  }

  /**
   * Invalidate all cache for a thread
   */
  private async invalidateThreadCache(threadId: number, userId: number): Promise<void> {
    await Promise.all([
      this.redis.del(this.getThreadCacheKey(threadId)),
      this.redis.del(this.getMessagesCacheKey(threadId)),
      this.redis.del(this.getUserThreadsCacheKey(userId)),
    ])
  }

  /**
   * Handle new user query
   */
  async handleQuery(userId: number, dto: SendQueryDto) {
    const { threadId, query } = dto

    // Try to get thread from cache first
    const cacheKey = this.getThreadCacheKey(threadId)
    let thread = await this.redis.get(cacheKey)

    if (!thread) {
      // Cache miss - fetch from database
      thread = await this.threadRepo.findById(threadId)
      if (!thread || thread.userId !== userId) {
        throw new NotFoundException('Thread not found')
      }
      // Cache for 3 days
      await this.redis.set(cacheKey, JSON.stringify(thread), this.THREAD_CACHE_TTL)
    } else {
      // Parse cached thread
      thread = typeof thread === 'string' ? JSON.parse(thread) : thread
      if (thread.userId !== userId) {
        throw new NotFoundException('Thread not found')
      }
    }

    // Detect query type
    const queryType = detectQueryType(query)
    this.logger.log(`Query type detected: ${queryType}`)

    // Build chat messages with language detection
    const systemPrompt = this.promptService.getSystemPrompt(queryType, undefined, query)
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
    this.logger.log(`Auto-executing ${agentResponse.toolCalls.length} tools...`)

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
   * Get user's threads
   */
  async getUserThreads(userId: number, limit = 20, offset = 0) {
    // Only cache first page (offset = 0)
    if (offset === 0) {
      const cacheKey = this.getUserThreadsCacheKey(userId)
      const cached = await this.redis.get(cacheKey)

      if (cached) {
        const threads = typeof cached === 'string' ? JSON.parse(cached) : cached
        this.logger.debug(`Cache hit for user threads: ${userId}`)
        return threads.slice(0, limit) // Return only requested limit
      }
    }

    // Cache miss or not first page - fetch from database
    const threads = await this.threadRepo.findByUserId(userId, limit, offset)

    // Cache first page only
    if (offset === 0) {
      await this.redis.set(this.getUserThreadsCacheKey(userId), JSON.stringify(threads), this.THREAD_CACHE_TTL)
    }

    return threads
  }

  /**
   * Get thread messages
   */
  async getThreadMessages(userId: number, threadId: number, limit = 50, offset = 0) {
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

    // Only cache first page of messages (offset = 0)
    if (offset === 0) {
      const messagesCacheKey = this.getMessagesCacheKey(threadId)
      const cached = await this.redis.get(messagesCacheKey)

      if (cached) {
        const messages = typeof cached === 'string' ? JSON.parse(cached) : cached
        this.logger.debug(`Cache hit for thread messages: ${threadId}`)
        return messages.slice(0, limit)
      }
    }

    // Cache miss or not first page - fetch from database
    const messages = await this.messageRepo.findByThreadId(threadId, limit, offset)

    // Cache first page only
    if (offset === 0) {
      await this.redis.set(this.getMessagesCacheKey(threadId), JSON.stringify(messages), this.MESSAGES_CACHE_TTL)
    }

    return messages
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
}
