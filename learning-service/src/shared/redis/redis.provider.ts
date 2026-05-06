import { Provider } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import IORedis, { RedisOptions } from "ioredis";
import redisConfig from "../config/redis.config";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [redisConfig.KEY],
  useFactory: async (cfg: ConfigType<typeof redisConfig>) => {
    const normalizedUrl = cfg.url?.replace(/^['\"]|['\"]$/g, "");

    const options: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      enableReadyCheck: true,
      connectTimeout: 10000,
      keepAlive: 30000,
      reconnectOnError: (error) => {
        const message = error.message.toLowerCase();
        return (
          message.includes("connection is closed") ||
          message.includes("read only")
        );
      },
      retryStrategy: (times) => {
        const delay = Math.min(100 * Math.pow(2, times - 1), 5000);
        return delay;
      },
    };

    const client = normalizedUrl
      ? new IORedis(normalizedUrl, {
          ...options,
          tls: cfg.tls,
        })
      : new IORedis({
          ...options,
          host: cfg.host,
          port: Number(cfg.port),
          username: cfg.username,
          password: cfg.password,
          db: Number(cfg.db),
          tls: cfg.tls,
        });

    client.on("connect", () => console.log("[Redis] 🔗 Connected"));
    client.on("ready", () => console.log("[Redis] ✅ Ready"));
    client.on("error", (err) =>
      console.error("[Redis] ❌ Error:", err.message),
    );
    client.on("reconnecting", () => console.warn("[Redis] 🔄 Reconnecting..."));
    client.on("end", () => console.warn("[Redis] 🔌 Connection closed"));

    try {
      await client.connect();
      console.log("[Redis] 🚀 Successfully initialized");
    } catch (error) {
      // Keep app alive and let ioredis retry in background.
      console.error(
        "[Redis] 💥 Initial connect failed, will retry automatically:",
        error,
      );
    }

    return client;
  },
};
