import { Module } from '@nestjs/common'
import { QuizAnswerController } from './quiz-answer.controller'
import { QuizAnswerService } from './quiz-answer.service'
import { QuizAnswerRepository } from './quiz-answer.repo'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [QuizAnswerController],
  providers: [QuizAnswerService, QuizAnswerRepository],
  exports: [QuizAnswerService, QuizAnswerRepository],
})
export class QuizAnswerModule {}
