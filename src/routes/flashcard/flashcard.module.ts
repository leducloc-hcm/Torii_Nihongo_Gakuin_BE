import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FlashcardController } from './flashcard.controller'
import { FlashcardService } from './flashcard.service'
import { FlashcardRepository } from './flashcard.repo'
import { FlashcardGenerationService } from './flashcard-generation.service'

@Module({
  imports: [ConfigModule],
  controllers: [FlashcardController],
  providers: [FlashcardService, FlashcardRepository, FlashcardGenerationService],
  exports: [FlashcardService, FlashcardGenerationService],
})
export class FlashcardModule {}
