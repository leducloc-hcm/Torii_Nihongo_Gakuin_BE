import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import redisConfig from '../config/redis.config'
import { redisProvider } from './redis.provider'
import { RedisContextService } from './redis-context.service'

@Global() // Make it available globally
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  providers: [redisProvider, RedisContextService],
  exports: [redisProvider, RedisContextService],
})
export class RedisModule {}
