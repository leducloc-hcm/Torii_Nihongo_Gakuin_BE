import { Injectable, Inject } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import IORedis from 'ioredis'
import { REDIS_CLIENT } from './redis.provider'
import redisConfig from '../config/redis.config'

@Injectable()
export class RedisContextService {
  private readonly defaultTtl: number

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: IORedis,
    @Inject(redisConfig.KEY) private readonly config: ConfigType<typeof redisConfig>,
  ) {
    this.defaultTtl = config.ttl
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    const expiry = ttl ?? this.defaultTtl

    if (expiry > 0) {
      await this.redis.setex(key, expiry, stringValue)
    } else {
      await this.redis.set(key, stringValue)
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.redis.get(key)
    if (!value) return null

    try {
      return JSON.parse(value)
    } catch {
      return value as T
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key)
    return result === 1
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl)
  }

  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key)
  }

  async setMcpContext(userId: number, mcpType: string, context: any, ttl?: number): Promise<void> {
    const key = this.getMcpContextKey(userId, mcpType)
    await this.set(key, context, ttl)
  }

  async getMcpContext<T = any>(userId: number, mcpType: string): Promise<T | null> {
    const key = this.getMcpContextKey(userId, mcpType)
    return await this.get<T>(key)
  }

  async clearMcpContext(userId: number, mcpType: string): Promise<void> {
    const key = this.getMcpContextKey(userId, mcpType)
    await this.del(key)
  }

  async clearAllUserContexts(userId: number): Promise<void> {
    const pattern = `mcp:context:${userId}:*`
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  private getMcpContextKey(userId: number, mcpType: string): string {
    return `mcp:context:${userId}:${mcpType}`
  }

  async cacheResult(cacheKey: string, data: any, ttl: number = 300): Promise<void> {
    const key = `cache:${cacheKey}`
    await this.set(key, data, ttl)
  }

  async getCachedResult<T = any>(cacheKey: string): Promise<T | null> {
    const key = `cache:${cacheKey}`
    return await this.get<T>(key)
  }

  async getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const result = await fn()
    await this.set(key, result, ttl)
    return result
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    await this.redis.hset(key, field, stringValue)
  }

  async hget<T = any>(key: string, field: string): Promise<T | null> {
    const value = await this.redis.hget(key, field)
    if (!value) return null

    try {
      return JSON.parse(value)
    } catch {
      return value as T
    }
  }

  async hgetall<T = Record<string, any>>(key: string): Promise<T | null> {
    const data = await this.redis.hgetall(key)
    if (!data || Object.keys(data).length === 0) return null

    const parsed: any = {}
    for (const [field, value] of Object.entries(data)) {
      try {
        parsed[field] = JSON.parse(value)
      } catch {
        parsed[field] = value
      }
    }
    return parsed as T
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.redis.hdel(key, field)
  }

  async rpush(key: string, ...values: any[]): Promise<void> {
    const stringValues = values.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
    await this.redis.rpush(key, ...stringValues)
  }

  async rpop<T = any>(key: string): Promise<T | null> {
    const value = await this.redis.rpop(key)
    if (!value) return null

    try {
      return JSON.parse(value)
    } catch {
      return value as T
    }
  }

  async lrange<T = any>(key: string, start: number, stop: number): Promise<T[]> {
    const values = await this.redis.lrange(key, start, stop)
    return values.map((v) => {
      try {
        return JSON.parse(v)
      } catch {
        return v as T
      }
    })
  }

  async llen(key: string): Promise<number> {
    return await this.redis.llen(key)
  }

  async flushAll(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot flush Redis in production!')
    }
    await this.redis.flushall()
  }

  async info(): Promise<string> {
    return await this.redis.info()
  }

  async ping(): Promise<string> {
    return await this.redis.ping()
  }

  getClient(): IORedis {
    return this.redis
  }
}
