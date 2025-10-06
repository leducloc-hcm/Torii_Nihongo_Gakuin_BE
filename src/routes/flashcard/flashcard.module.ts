import { Module } from '@nestjs/common'
import { FlashcardController } from './flashcard.controller'
import { FlashcardService } from './flashcard.service'
import { FlashcardRepository } from './flashcard.repo'

@Module({
  controllers: [FlashcardController],
  providers: [FlashcardService, FlashcardRepository],
  exports: [FlashcardService],
})
export class FlashcardModule {}
