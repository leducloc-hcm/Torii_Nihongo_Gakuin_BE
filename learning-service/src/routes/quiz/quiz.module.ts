import { Module } from '@nestjs/common'
import { QuizService } from './quiz.service'
import { QuizRepository } from './quiz.repo'
import { SharedModule } from '../../shared/shared.module'
import { QuizController } from 'src/routes/quiz/quiz.controller'

@Module({
  imports: [SharedModule],
  controllers: [QuizController],
  providers: [QuizService, QuizRepository],
  exports: [QuizService, QuizRepository],
})
export class QuizModule {}
