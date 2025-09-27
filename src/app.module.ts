import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { SharedModule } from './shared/shared.module'
import { LoggerModule } from 'nestjs-pino'
import pino from 'pino'
import path from 'path'
import { AuthModule } from './routes/auth/auth.module'

@Module({
  imports: [AuthModule, SharedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
