import { Injectable, Inject } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import IORedis from "ioredis";
import { REDIS_CLIENT } from "./redis.provider";
import redisConfig from "../config/redis.config";

@Injectable()
export class RedisService {
  private readonly defaultTtl: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: IORedis,
    @Inject(redisConfig.KEY)
    private readonly config: ConfigType<typeof redisConfig>,
  ) {
    this.defaultTtl = config.ttl;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);
    const expiry = ttl ?? this.defaultTtl;

    if (expiry > 0) {
      await this.redis.setex(key, expiry, stringValue);
    } else {
      await this.redis.set(key, stringValue);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value as T;
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl);
  }

  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  async incrBy(key: string, increment: number): Promise<number> {
    return await this.redis.incrby(key, increment);
  }

  // Sorted set operations for leaderboard
  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.redis.zadd(key, score, member);
  }

  async zincrby(
    key: string,
    increment: number,
    member: string,
  ): Promise<string> {
    return await this.redis.zincrby(key, increment, member);
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.redis.zrevrange(key, start, stop);
  }

  async zrevrangeWithScores(
    key: string,
    start: number,
    stop: number,
  ): Promise<{ member: string; score: number }[]> {
    const result = await this.redis.zrevrange(key, start, stop, "WITHSCORES");
    const entries: { member: string; score: number }[] = [];
    for (let i = 0; i < result.length; i += 2) {
      entries.push({ member: result[i], score: parseFloat(result[i + 1]) });
    }
    return entries;
  }

  async zrevrank(key: string, member: string): Promise<number | null> {
    return await this.redis.zrevrank(key, member);
  }

  async zscore(key: string, member: string): Promise<string | null> {
    return await this.redis.zscore(key, member);
  }

  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }
}
