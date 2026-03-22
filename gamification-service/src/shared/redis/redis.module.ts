import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import redisConfig from "../config/redis.config";
import { redisProvider } from "./redis.provider";
import { RedisService } from "./redis.service";

@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  providers: [redisProvider, RedisService],
  exports: [redisProvider, RedisService],
})
export class RedisModule {}
