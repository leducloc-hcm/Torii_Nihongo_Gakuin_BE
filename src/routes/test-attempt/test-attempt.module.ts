import { Module } from '@nestjs/common'
import { TestAttemptController } from './test-attempt.controller'
import { TestAttemptService } from './test-attempt.service'
import { TestAttemptRepository } from './test-attempt.repo'
import { SharedModule } from '../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [TestAttemptController],
  providers: [TestAttemptService, TestAttemptRepository],
  exports: [TestAttemptService, TestAttemptRepository],
})
export class TestAttemptModule {}
