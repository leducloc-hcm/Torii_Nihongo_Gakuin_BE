import { Provider } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import IORedis, { RedisOptions } from "ioredis";
import redisConfig from "../config/redis.config";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [redisConfig.KEY],
  useFactory: async (cfg: ConfigType<typeof redisConfig>) => {
    const options: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      connectTimeout: 10000,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    const client = cfg.url
      ? new IORedis(cfg.url, options)
      : new IORedis({
          ...options,
          host: cfg.host,
          port: Number(cfg.port),
          username: cfg.username,
          password: cfg.password,
          db: Number(cfg.db),
        });

    client.on("connect", () => console.log("[Redis] Connected"));
    client.on("ready", () => console.log("[Redis] Ready"));
    client.on("error", (err) => console.error("[Redis] Error:", err.message));
    client.on("reconnecting", () => console.warn("[Redis] Reconnecting..."));

    try {
      await client.connect();
      console.log("[Redis] Successfully initialized");
    } catch (error) {
      console.error("[Redis] Failed to connect:", error);
      throw error;
    }

    return client;
  },
};
