import { Module, Global, forwardRef } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RabbitMQService } from './rabbitmq.service'
import { RabbitMQPublisher } from './rabbitmq.publisher'
import { RabbitMQConsumer } from './rabbitmq.consumer'
import { PaymentModule } from 'src/routes/payment/payment.module'
import { EnrollmentModule } from 'src/routes/enrollment/enrollment.module'

@Global()
@Module({
  imports: [ConfigModule, forwardRef(() => PaymentModule), forwardRef(() => EnrollmentModule)],
  providers: [RabbitMQService, RabbitMQPublisher, RabbitMQConsumer],
  exports: [RabbitMQService, RabbitMQPublisher, RabbitMQConsumer],
})
export class RabbitMQModule {}

