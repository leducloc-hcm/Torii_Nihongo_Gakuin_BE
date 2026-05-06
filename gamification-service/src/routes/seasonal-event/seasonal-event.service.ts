import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { SeasonalEventRepository } from "./seasonal-event.repo";
import { RedisService } from "src/shared/redis/redis.service";
import { CreateSeasonalEventType, UpdateSeasonalEventType } from "./seasonal-event.model";

const ACTIVE_EVENT_CACHE_KEY = "gamification:seasonal-event:active";
const ACTIVE_EVENT_TTL = 60; // 1 minute — short TTL so events activate/deactivate promptly

@Injectable()
export class SeasonalEventService {
  private readonly logger = new Logger(SeasonalEventService.name);

  constructor(
    private readonly repo: SeasonalEventRepository,
    private readonly redisService: RedisService,
  ) {}

  async listEvents() {
    return this.repo.findAll();
  }

  async createEvent(data: CreateSeasonalEventType) {
    const event = await this.repo.create(data);
    await this.redisService.del(ACTIVE_EVENT_CACHE_KEY);
    this.logger.log(`Created seasonal event: ${event.name}`);
    return event;
  }

  async updateEvent(id: number, data: UpdateSeasonalEventType) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException("Seasonal event not found");
    const event = await this.repo.update(id, data);
    await this.redisService.del(ACTIVE_EVENT_CACHE_KEY);
    return event;
  }

  async deleteEvent(id: number) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException("Seasonal event not found");
    await this.repo.delete(id);
    await this.redisService.del(ACTIVE_EVENT_CACHE_KEY);
    return { message: "Seasonal event deleted" };
  }

  /**
   * Returns the active seasonal event multiplier (cached in Redis).
   * Returns { multiplier: 1.0, bonusCoins: 0 } when no event is active.
   */
  async getActiveMultiplier(): Promise<{ multiplier: number; bonusCoins: number; eventName: string | null }> {
    const cached = await this.redisService.get<{
      multiplier: number;
      bonusCoins: number;
      eventName: string | null;
    }>(ACTIVE_EVENT_CACHE_KEY);

    if (cached !== null) return cached;

    const active = await this.repo.findActive();
    const result = active
      ? { multiplier: active.multiplier, bonusCoins: active.bonusCoins, eventName: active.name }
      : { multiplier: 1.0, bonusCoins: 0, eventName: null };

    await this.redisService.set(ACTIVE_EVENT_CACHE_KEY, result, ACTIVE_EVENT_TTL);
    return result;
  }
}
