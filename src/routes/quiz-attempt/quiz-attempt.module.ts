import { Module } from '@nestjs/common'
import { QuizAttemptController } from './quiz-attempt.controller'
import { QuizAttemptService } from './quiz-attempt.service'
import { QuizAttemptRepository } from './quiz-attempt.repo'
import { SharedModule } from '../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [QuizAttemptController],
  providers: [QuizAttemptService, QuizAttemptRepository],
  exports: [QuizAttemptService, QuizAttemptRepository],
})
export class QuizAttemptModule {}
