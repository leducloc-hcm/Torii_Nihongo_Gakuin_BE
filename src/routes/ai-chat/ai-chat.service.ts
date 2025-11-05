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
  private readonly THREAD_CACHE_TTL = 10 // 10 minutes in seconds
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
    // Get all possible message cache keys using Redis pattern matching
    // Pattern matches: ai_thread_messages:${threadId}:${limit}:${page}
    const messagePattern = `ai_thread_messages:${threadId}:*`

    // Use Redis client's keys method to find all matching keys
    const redisClient = this.redis.getClient()
    const messageKeys = await redisClient.keys(messagePattern)

    // Delete thread, all message pages, and user threads cache
    const keysToDelete = [this.getThreadCacheKey(threadId), this.getUserThreadsCacheKey(userId), ...messageKeys]

    this.logger.warn(
      `[Cache INVALIDATE] Deleting ${keysToDelete.length} keys for thread ${threadId}: ${keysToDelete.join(', ')}`,
    )

    // Delete all keys
    for (const key of keysToDelete) {
      await this.redis.del(key)
    }

    this.logger.warn(`[Cache INVALIDATE] Successfully deleted ${keysToDelete.length} keys`)
  }

  async handleQuery(userId: number, dto: SendQueryDto) {
    const { threadId, query } = dto

    this.logger.log(`[handleQuery] User ID: ${userId} | Thread ID: ${threadId}`)

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
    let systemPrompt = this.promptService.getSystemPrompt(queryType, undefined, query, userId)
    this.logger.debug(`[System Prompt] Generated for userId: ${userId}, queryType: ${queryType}`)

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

    // Prepare final response - ensure we always have something to show user
    let finalResponse = executeResult.finalResponse

    // If no final response from AI, create a fallback based on tool results
    if (!finalResponse || finalResponse.trim().length === 0) {
      this.logger.warn(`No final response from AI, generating fallback message`)

      // Check if tools returned data
      const hasData = executeResult.results.some(
        (r) => r.result && typeof r.result === 'object' && 'data' in r.result && r.result.data !== null,
      )

      if (hasData) {
        // AI got data but didn't format response - ask it to try again
        finalResponse =
          'Xin lỗi, tôi đã tìm thấy thông tin nhưng gặp lỗi khi định dạng câu trả lời. Bạn có thể hỏi lại câu hỏi này không?'
      } else {
        // Tools returned empty/null data
        const toolName = executeResult.results[0]?.toolName || 'tool'
        if (toolName.includes('enrollment') || toolName.includes('progress')) {
          finalResponse =
            'Hiện tại tôi chưa tìm thấy thông tin enrollment hoặc progress của bạn. Có thể bạn chưa đăng ký khóa học nào hoặc chưa có tiến độ học tập.'
        } else if (toolName.includes('course')) {
          finalResponse =
            'Xin lỗi, tôi không tìm thấy khóa học phù hợp với yêu cầu của bạn. Bạn có thể thử tìm kiếm với từ khóa khác không?'
        } else {
          finalResponse =
            'Xin lỗi, tôi không tìm thấy thông tin bạn yêu cầu. Bạn có thể thử hỏi lại với cách khác không?'
        }
      }
    }

    // Save assistant response with tool results
    this.logger.debug(`Saving assistant message to database...`)
    await this.messageRepo.create({
      threadId,
      userId,
      queryId: queryRecord.id,
      role: ChatRole.ASSISTANT,
      content: finalResponse,
      toolCalls: executeResult.results,
    })

    // Invalidate cache AFTER a small delay to ensure DB write is fully committed
    // This prevents race condition where frontend queries before write completes
    setTimeout(() => {
      void this.invalidateThreadCache(threadId, userId)
        .then(() => this.logger.debug(`Cache invalidated for thread ${threadId}`))
        .catch((error) => this.logger.error(`Failed to invalidate cache for thread ${threadId}:`, error))
    }, 100) // 100ms delay to ensure DB commit completes

    return {
      queryId: queryRecord.id,
      response: finalResponse,
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
    const thread = await this.threadRepo.findById(threadId)
    if (!thread || thread.userId !== userId) {
      throw new NotFoundException('Thread not found')
    }

    // Cache enabled with proper invalidation pattern
    const messagesCacheKey = this.getMessagesCacheKey(threadId, limit, page)
    this.logger.debug(`[Cache] Checking key: ${messagesCacheKey}`)

    // Check cache for first page only
    if (page === 1) {
      const cached = await this.redis.get(messagesCacheKey)
      if (cached) {
        // Handle both string and object from Redis
        const result = typeof cached === 'string' ? JSON.parse(cached) : cached
        const messageIds = result.data?.map((m: any) => m.id).join(',') || 'none'
        this.logger.warn(
          `[Cache HIT] Thread ${threadId}: ${result.data?.length || 0} messages (IDs: ${messageIds}) | Total in cache: ${result.pagination?.total || 0}`,
        )
        return result
      }
      this.logger.debug(`[Cache MISS] Thread ${threadId}`)
    }

    // Fetch from database
    this.logger.log(`[DB Query] Fetching messages for thread ${threadId} (page ${page}, limit ${limit})`)
    const result = await this.messageRepo.findByThreadId(threadId, limit, page)
    const messageIds = result.data.map((m) => m.id).join(',')
    this.logger.warn(
      `[DB Query] Fetched ${result.data.length} messages (IDs: ${messageIds}) | Total in DB: ${result.pagination.total}`,
    )

    // Cache first page only
    if (page === 1) {
      await this.redis.set(messagesCacheKey, JSON.stringify(result), this.MESSAGES_CACHE_TTL)
      this.logger.debug(`[Cache SET] Thread ${threadId}: ${result.data.length} messages cached`)
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
    // Get all threads for this user
    const threads = await this.threadRepo.findByUserId(userId, 1000, 1)

    // Clear cache for each thread
    const redisClient = this.redis.getClient()
    let totalKeysCleared = 0

    for (const thread of threads.data) {
      // Clear all message cache keys for this thread
      const messagePattern = `ai_thread_messages:${thread.id}:*`
      const messageKeys = await redisClient.keys(messagePattern)

      for (const key of messageKeys) {
        await this.redis.del(key)
        totalKeysCleared++
      }

      // Clear thread cache
      await this.redis.del(this.getThreadCacheKey(thread.id))
      totalKeysCleared++
    }

    // Clear user threads cache
    await this.redis.del(this.getUserThreadsCacheKey(userId))
    totalKeysCleared++

    this.logger.log(`Cleared ${totalKeysCleared} cache keys for user ${userId}`)
    return {
      message: 'Cache cleared successfully',
      userId,
      threadsCleared: threads.data.length,
      keysCleared: totalKeysCleared,
    }
  }

  /**
   * Debug: Get actual message count from database (bypass cache)
   */
  async debugMessageCount(threadId: number) {
    const allMessages = await this.messageRepo.getAllByThreadId(threadId)

    return {
      threadId,
      totalCount: allMessages.length,
      messageIds: allMessages.map((m) => m.id),
      firstMessageId: allMessages[0]?.id,
      lastMessageId: allMessages[allMessages.length - 1]?.id,
      messages: allMessages,
    }
  }
}
