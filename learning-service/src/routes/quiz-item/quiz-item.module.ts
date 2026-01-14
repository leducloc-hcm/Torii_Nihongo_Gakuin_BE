import { Module } from '@nestjs/common'
import { QuizItemController } from './quiz-item.controller'
import { QuizItemService } from './quiz-item.service'
import { QuizItemRepository } from './quiz-item.repo'
import { SharedModule } from '../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [QuizItemController],
  providers: [QuizItemService, QuizItemRepository],
  exports: [QuizItemService, QuizItemRepository],
})
export class QuizItemModule {}
