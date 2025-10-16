import { Module } from '@nestjs/common'
import { TestAnswerController } from './test-answer.controller'
import { TestAnswerService } from './test-answer.service'
import { TestAnswerRepository } from './test-answer.repo'
import { SharedModule } from '../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [TestAnswerController],
  providers: [TestAnswerService, TestAnswerRepository],
  exports: [TestAnswerService, TestAnswerRepository],
})
export class TestAnswerModule {}
