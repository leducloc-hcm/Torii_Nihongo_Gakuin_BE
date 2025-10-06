import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import { FlashcardService } from './flashcard.service'
import {
  CreateFlashcardDeckDto,
  UpdateFlashcardDeckDto,
  CreateFlashcardDto,
  UpdateFlashcardDto,
  StudyResponseDto,
  BulkStudyResponseDto,
  GetDecksQueryDto,
  GetStudyCardsQueryDto,
} from './flashcard.dto'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { Auth, IsPublic } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { MessageResDTO } from 'src/shared/dtos/response.dto'

@Controller('flashcards')
@Auth([AuthType.Bearer])
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}

  // Deck endpoints
  @Post('decks')
  @HttpCode(HttpStatus.CREATED)
  async createDeck(@Body() createDeckDto: CreateFlashcardDeckDto, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.createDeck(userId, createDeckDto)
  }

  @Get('decks')
  async getUserDecks(@Query() query: GetDecksQueryDto, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.getUserDecks(userId, query)
  }

  @Get('decks/public')
  @IsPublic()
  async getPublicDecks(@Query() query: GetDecksQueryDto) {
    return await this.flashcardService.getPublicDecks(query)
  }

  @Get('decks/:id')
  async getDeckById(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.getDeckById(id, userId)
  }

  @Put('decks/:id')
  async updateDeck(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDeckDto: UpdateFlashcardDeckDto,
    @ActiveUser('userId') userId: number,
  ) {
    return await this.flashcardService.updateDeck(id, userId, updateDeckDto)
  }

  @Delete('decks/:id')
  @ZodSerializerDto(MessageResDTO)
  async deleteDeck(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    await this.flashcardService.deleteDeck(id, userId)
    return { message: 'Deck deleted successfully' }
  }

  @Post('cards')
  @HttpCode(HttpStatus.CREATED)
  async createCard(@Body() createCardDto: CreateFlashcardDto, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.createCard(createCardDto, userId)
  }

  @Get('decks/:deckId/cards')
  async getDeckCards(@Param('deckId', ParseIntPipe) deckId: number, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.getDeckCards(deckId, userId)
  }

  @Get('cards/:id')
  async getCardById(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.getCardById(id, userId)
  }

  @Put('cards/:id')
  async updateCard(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCardDto: UpdateFlashcardDto,
    @ActiveUser('userId') userId: number,
  ) {
    return await this.flashcardService.updateCard(id, userId, updateCardDto)
  }

  @Delete('cards/:id')
  @ZodSerializerDto(MessageResDTO)
  async deleteCard(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    await this.flashcardService.deleteCard(id, userId)
    return { message: 'Card deleted successfully' }
  }

  // Study endpoints
  @Get('study/cards')
  async getStudyCards(@Query() query: GetStudyCardsQueryDto, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.getStudyCards(userId, query)
  }

  @Post('study/response')
  @HttpCode(HttpStatus.OK)
  async submitStudyResponse(@Body() responseDto: StudyResponseDto, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.submitStudyResponse(userId, responseDto)
  }

  @Post('study/bulk-response')
  @HttpCode(HttpStatus.OK)
  async submitBulkStudyResponse(@Body() bulkResponseDto: BulkStudyResponseDto, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.submitBulkStudyResponse(userId, bulkResponseDto)
  }

  @Get('progress')
  async getUserProgress(@ActiveUser('userId') userId: number, @Query('deckId', ParseIntPipe) deckId?: number) {
    return await this.flashcardService.getUserProgress(userId, deckId)
  }

  // Statistics endpoints
  @Get('decks/:id/statistics')
  async getDeckStatistics(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.getDeckStatistics(id, userId)
  }

  @Get('statistics')
  async getUserStatistics(@ActiveUser('userId') userId: number) {
    return await this.flashcardService.getUserStatistics(userId)
  }

  // Public deck access for browsing
  @Get('public/decks/:id')
  @IsPublic()
  async getPublicDeckById(@Param('id', ParseIntPipe) id: number) {
    return await this.flashcardService.getDeckById(id)
  }

  @Get('public/decks/:id/cards')
  @IsPublic()
  async getPublicDeckCards(@Param('id', ParseIntPipe) deckId: number) {
    return await this.flashcardService.getDeckCards(deckId)
  }
}
