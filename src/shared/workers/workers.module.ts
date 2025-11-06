import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { PaymentTimeoutWorker } from './payment-timeout.worker'
import { SharedModule } from '../shared.module'
import { PaymentModule } from '../../routes/payment/payment.module'
import { WebsocketsModule } from '../../websockets/websockets.module'

@Module({
  imports: [ScheduleModule.forRoot(), SharedModule, PaymentModule, WebsocketsModule],
  providers: [PaymentTimeoutWorker],
  exports: [PaymentTimeoutWorker],
})
export class WorkersModule {}
