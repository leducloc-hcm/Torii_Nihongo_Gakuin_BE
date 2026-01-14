import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RabbitMQService } from './rabbitmq.service'
import { RabbitMQPublisher } from './rabbitmq.publisher'
import { RabbitMQConsumer } from './rabbitmq.consumer'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RabbitMQService, RabbitMQPublisher, RabbitMQConsumer],
  exports: [RabbitMQService, RabbitMQPublisher, RabbitMQConsumer],
})
export class RabbitMQModule {}

