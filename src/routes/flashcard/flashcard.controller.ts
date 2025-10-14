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
  UseGuards,
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
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'

@Controller('flashcards')
@UseGuards(RolesGuard)
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}

  // Deck endpoints
  @Post('decks')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  async createDeck(@Body() createDeckDto: CreateFlashcardDeckDto, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.createDeck(userId, createDeckDto)
  }

  @Get('decks')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async getUserDecks(@Query() query: GetDecksQueryDto, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.getUserDecks(userId, query)
  }

  @Get('decks/public')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async getPublicDecks(@Query() query: GetDecksQueryDto) {
    return await this.flashcardService.getPublicDecks(query)
  }

  @Get('decks/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async getDeckById(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.getDeckById(id, userId)
  }

  @Put('decks/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async updateDeck(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDeckDto: UpdateFlashcardDeckDto,
    @ActiveUser('userId') userId: number,
  ) {
    return await this.flashcardService.updateDeck(id, userId, updateDeckDto)
  }

  @Delete('decks/:id')
  @ZodSerializerDto(MessageResDTO)
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async deleteDeck(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    await this.flashcardService.deleteDeck(id, userId)
    return { message: 'Deck deleted successfully' }
  }

  @Post('cards')
  @HttpCode(HttpStatus.CREATED)
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async createCard(@Body() createCardDto: CreateFlashcardDto, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.createCard(createCardDto, userId)
  }

  @Get('decks/:deckId/cards')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async getDeckCards(@Param('deckId', ParseIntPipe) deckId: number, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.getDeckCards(deckId, userId)
  }

  @Get('cards/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async getCardById(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.getCardById(id, userId)
  }

  @Put('cards/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async updateCard(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCardDto: UpdateFlashcardDto,
    @ActiveUser('userId') userId: number,
  ) {
    return await this.flashcardService.updateCard(id, userId, updateCardDto)
  }

  @Delete('cards/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  @ZodSerializerDto(MessageResDTO)
  async deleteCard(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    await this.flashcardService.deleteCard(id, userId)
    return { message: 'Card deleted successfully' }
  }

  // Study endpoints
  @Get('study/cards')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async getStudyCards(@Query() query: GetStudyCardsQueryDto, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.getStudyCards(userId, query)
  }

  @Post('study/response')
  @HttpCode(HttpStatus.OK)
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async submitStudyResponse(@Body() responseDto: StudyResponseDto, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.submitStudyResponse(userId, responseDto)
  }

  @Post('study/bulk-response')
  @HttpCode(HttpStatus.OK)
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async submitBulkStudyResponse(@Body() bulkResponseDto: BulkStudyResponseDto, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.submitBulkStudyResponse(userId, bulkResponseDto)
  }

  @Get('progress')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async getUserProgress(@ActiveUser('userId') userId: number, @Query('deckId', ParseIntPipe) deckId?: number) {
    return await this.flashcardService.getUserProgress(userId, deckId)
  }

  // Statistics endpoints
  @Get('decks/:id/statistics')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async getDeckStatistics(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return await this.flashcardService.getDeckStatistics(id, userId)
  }

  @Get('statistics')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async getUserStatistics(@ActiveUser('userId') userId: number) {
    return await this.flashcardService.getUserStatistics(userId)
  }

  // Public deck access for browsing
  @Get('public/decks/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async getPublicDeckById(@Param('id', ParseIntPipe) id: number) {
    return await this.flashcardService.getDeckById(id)
  }

  @Get('public/decks/:id/cards')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Lecturer)
  async getPublicDeckCards(@Param('id', ParseIntPipe) deckId: number) {
    return await this.flashcardService.getDeckCards(deckId)
  }
}
