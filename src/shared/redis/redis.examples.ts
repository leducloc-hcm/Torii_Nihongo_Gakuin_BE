/**
 * ========================================
 * REDIS USAGE EXAMPLES
 * ========================================
 */

import { Injectable } from '@nestjs/common'
import { RedisContextService } from './redis-context.service'

// Types
interface ConversationContext {
  sessionId: string
  startedAt: Date
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    metadata?: any
  }>
  metadata: {
    currentTopic?: string
    lastActivity: Date
    messageCount: number
  }
}

@Injectable()
export class ExampleMcpService {
  constructor(private readonly redis: RedisContextService) {}

  // ===== Example 1: Basic Cache =====
  async getFlashcardById(id: number) {
    const cacheKey = `flashcard:${id}`

    // Try to get from cache first
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      console.log('✅ Cache hit!')
      return cached
    }

    console.log('❌ Cache miss - fetching from DB')
    const flashcard = await this.fetchFromDatabase(id)

    await this.redis.set(cacheKey, flashcard, 600)

    return flashcard
  }

  async getCourseDetails(courseId: number) {
    return await this.redis.getOrSet(
      `course:${courseId}`,
      async () => {
        console.log('Fetching course from database...')
        return await this.fetchCourseFromDb(courseId)
      },
      900, // Cache for 15 minutes
    )
  }

  // ===== Example 3: MCP Context Management =====
  async chatWithFlashcardMcp(userId: number, message: string) {
    // Get existing conversation context
    const context = (await this.redis.getMcpContext(userId, 'flashcard')) || {
      messages: [],
      sessionId: Date.now(),
    }

    // Add new message to context
    context.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    })

    // Call MCP server with context
    const response = await this.callFlashcardMcp(context)

    // Add response to context
    context.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    })

    // Save updated context (expires in 1 hour)
    await this.redis.setMcpContext(userId, 'flashcard', context, 3600)

    return response
  }

  // ===== Example 4: Reset conversation =====
  async resetChat(userId: number) {
    await this.redis.clearMcpContext(userId, 'flashcard')
    await this.redis.clearMcpContext(userId, 'course-chat')

    return { message: 'Chat history cleared' }
  }

  // ===== Example 5: Hash for user session =====
  async saveUserSession(userId: number, sessionData: any) {
    const key = `session:${userId}`

    await this.redis.hset(key, 'lastActivity', Date.now())
    await this.redis.hset(key, 'preferences', sessionData.preferences)
    await this.redis.hset(key, 'currentCourse', sessionData.currentCourse)

    // Set expiration for entire hash
    await this.redis.expire(key, 86400) // 24 hours
  }

  async getUserSession(userId: number) {
    const key = `session:${userId}`
    return await this.redis.hgetall(key)
  }

  // ===== Example 6: Rate Limiting =====
  async checkRateLimit(userId: number, action: string): Promise<boolean> {
    const key = `ratelimit:${userId}:${action}`

    const count = await this.redis.get<number>(key)

    if (count && count >= 10) {
      // Max 10 requests
      return false // Rate limited
    }

    // Increment counter
    const newCount = (count || 0) + 1
    await this.redis.set(key, newCount, 60) // Reset after 60 seconds

    return true // Allowed
  }

  // ===== Example 7: Cache quiz attempt results =====
  async cacheQuizResult(attemptId: number, result: any) {
    await this.redis.cacheResult(`quiz:attempt:${attemptId}`, result, 300) // 5 min
  }

  async getQuizResult(attemptId: number) {
    return await this.redis.getCachedResult(`quiz:attempt:${attemptId}`)
  }

  // ===== Example 8: Message Queue (List operations) =====
  async addNotificationToQueue(userId: number, notification: any) {
    const key = `notifications:${userId}`
    await this.redis.rpush(key, notification)

    // Keep only last 50 notifications
    const length = await this.redis.llen(key)
    if (length > 50) {
      await this.redis.getClient().ltrim(key, -50, -1)
    }
  }

  async getRecentNotifications(userId: number, limit: number = 10) {
    const key = `notifications:${userId}`
    return await this.redis.lrange(key, -limit, -1) // Get last N items
  }

  // ===== Example 9: Complex MCP context with conversation history =====
  async manageMcpConversation(userId: number, mcpType: 'flashcard' | 'course-chat'): Promise<ConversationContext> {
    // Get or create context
    let context = await this.redis.getMcpContext<ConversationContext>(userId, mcpType)

    if (!context) {
      context = {
        sessionId: `${userId}-${Date.now()}`,
        startedAt: new Date(),
        messages: [],
        metadata: {
          lastActivity: new Date(),
          messageCount: 0,
        },
      }
    }

    return context
  }

  // ===== Example 10: Batch operations =====
  async cacheMultipleCourses(courses: Array<{ id: number; data: any }>) {
    const pipeline = this.redis.getClient().pipeline()

    for (const course of courses) {
      const key = `course:${course.id}`
      const value = JSON.stringify(course.data)
      pipeline.setex(key, 900, value) // 15 minutes
    }

    await pipeline.exec()
    console.log(`✅ Cached ${courses.length} courses`)
  }

  // ===== Helper methods (mock) =====
  private fetchFromDatabase(id: number) {
    return Promise.resolve({ id, title: 'Sample Flashcard', content: '...' })
  }

  private fetchCourseFromDb(courseId: number) {
    return Promise.resolve({ id: courseId, title: 'Course Title', modules: [] })
  }

  private callFlashcardMcp(context: any) {
    return Promise.resolve('MCP response...')
  }
}

/**
 * ========================================
 * USAGE IN CONTROLLER
 * ========================================
 */

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'

@Controller('example')
export class ExampleController {
  constructor(
    private readonly exampleService: ExampleMcpService,
    private readonly redis: RedisContextService,
  ) {}

  @Get('flashcard/:id')
  async getFlashcard(@Param('id') id: string) {
    return await this.exampleService.getFlashcardById(Number(id))
  }

  @Post('chat')
  async chat(@Body() body: { userId: number; message: string }) {
    return await this.exampleService.chatWithFlashcardMcp(body.userId, body.message)
  }

  @Post('chat/reset')
  async resetChat(@Body() body: { userId: number }) {
    return await this.exampleService.resetChat(body.userId)
  }

  @Get('session/:userId')
  async getSession(@Param('userId') userId: string) {
    return await this.exampleService.getUserSession(Number(userId))
  }

  @Get('health/redis')
  async checkRedis() {
    const ping = await this.redis.ping()
    return { status: ping === 'PONG' ? 'healthy' : 'unhealthy', ping }
  }
}

/**
 * ========================================
 * KEY NAMING CONVENTIONS
 * ========================================
 *
 * mcp:context:{userId}:{mcpType}        - MCP conversation contexts
 * cache:{entity}:{id}                    - Cached entities
 * session:{userId}                       - User sessions
 * ratelimit:{userId}:{action}            - Rate limiting
 * notifications:{userId}                 - User notification queue
 * quiz:attempt:{attemptId}               - Quiz results
 * course:{courseId}                      - Course data
 * flashcard:{flashcardId}                - Flashcard data
 *
 * ========================================
 * BEST PRACTICES
 * ========================================
 *
 * 1. Always use descriptive key names with namespaces
 * 2. Set appropriate TTL to avoid memory bloat
 * 3. Use getOrSet() for automatic cache population
 * 4. Clear cache when data changes
 * 5. Use Hash for complex user data
 * 6. Use Lists for queues/history
 * 7. Monitor Redis memory usage in production
 * 8. Use pipeline for batch operations
 * 9. Handle cache misses gracefully
 * 10. Don't store large objects (>100KB) in Redis
 */
