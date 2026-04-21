import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { FlashcardRepository } from "./flashcard.repo";
import { FlashcardGenerationService } from "./flashcard-generation.service";
import { RabbitMQPublisher } from "../../shared/rabbitmq/rabbitmq.publisher";
import {
  CreateFlashcardDeckInput,
  UpdateFlashcardDeckInput,
  CreateFlashcardInput,
  UpdateFlashcardInput,
  StudyResponseInput,
  BulkStudyResponseInput,
  GetDecksQueryInput,
  GetStudyCardsQueryInput,
} from "./flashcard.model";

@Injectable()
export class FlashcardService {
  constructor(
    private readonly flashcardRepository: FlashcardRepository,
    private readonly flashcardGenerationService: FlashcardGenerationService,
    private readonly rabbitMQPublisher: RabbitMQPublisher,
  ) {}

  // Deck operations
  async createDeck(userId: number, data: CreateFlashcardDeckInput) {
    const deck = await this.flashcardRepository.createDeck(userId, data);
    return {
      ...deck,
      cardCount: deck._count.cards,
    };
  }

  async getUserDecks(userId: number, query: GetDecksQueryInput) {
    const result = await this.flashcardRepository.findUserDecks(userId, query);

    return {
      ...result,
      decks: result.decks.map((deck) => ({
        ...deck,
        cardCount: deck._count.cards,
      })),
    };
  }

  async getPublicDecks(query: GetDecksQueryInput) {
    const result = await this.flashcardRepository.findPublicDecks(query);

    return {
      ...result,
      decks: result.decks.map((deck) => ({
        ...deck,
        cardCount: deck._count.cards,
      })),
    };
  }

  async getDeckById(id: number, userId?: number) {
    const deck = await this.flashcardRepository.findDeckById(id, userId);

    if (!deck) {
      throw new NotFoundException("Deck not found or access denied");
    }

    return {
      ...deck,
      cardCount: deck._count.cards,
    };
  }

  async updateDeck(id: number, userId: number, data: UpdateFlashcardDeckInput) {
    try {
      const deck = await this.flashcardRepository.updateDeck(id, userId, data);
      return {
        ...deck,
        cardCount: deck._count.cards,
      };
    } catch (error) {
      throw new NotFoundException("Deck not found or access denied");
    }
  }

  async deleteDeck(id: number, userId: number) {
    try {
      return await this.flashcardRepository.deleteDeck(id, userId);
    } catch (error) {
      throw new NotFoundException("Deck not found or access denied");
    }
  }

  // Card operations
  async createCard(data: CreateFlashcardInput[], userId: number) {
    for (const card of data) {
      // Verify deck ownership
      const deck = await this.flashcardRepository.findDeckById(
        card.deckId,
        userId,
      );
      if (!deck || deck.ownerId !== userId) {
        throw new ForbiddenException(
          "You can only add cards to your own decks",
        );
      }
    }
    await Promise.all(
      data?.map((card) => this.flashcardRepository.createCard(card)),
    );

    // Publish flashcard.generated event for gamification
    if (data.length > 0) {
      this.rabbitMQPublisher
        .publishFlashcardGenerated(userId, data[0].deckId, data.length)
        .catch((err) => {
          console.error("Failed to publish flashcard.generated event:", err);
        });
    }

    return "Cards created successfully";
  }

  async getDeckCards(deckId: number, userId?: number) {
    const cards = await this.flashcardRepository.findDeckCards(deckId, userId);

    if (cards === null) {
      throw new NotFoundException("Deck not found or access denied");
    }

    return cards;
  }

  async getCardById(id: number, userId?: number) {
    const card = await this.flashcardRepository.findCardById(id);

    if (!card) {
      throw new NotFoundException("Card not found");
    }

    // Check access permissions
    if (userId !== undefined && card.deck.ownerId !== userId) {
      const deck = await this.flashcardRepository.findDeckById(
        card.deck.id,
        userId,
      );
      if (!deck) {
        throw new ForbiddenException("Access denied to this card");
      }
    }

    return card;
  }

  async updateCard(id: number, userId: number, data: UpdateFlashcardInput) {
    try {
      return await this.flashcardRepository.updateCard(id, userId, data);
    } catch (error) {
      throw new NotFoundException("Card not found or access denied");
    }
  }

  async deleteCard(id: number, userId: number) {
    try {
      return await this.flashcardRepository.deleteCard(id, userId);
    } catch (error) {
      throw new NotFoundException("Card not found or access denied");
    }
  }

  // Study operations
  async getStudyCards(userId: number, query: GetStudyCardsQueryInput) {
    return await this.flashcardRepository.findStudyCards(userId, query);
  }

  async submitStudyResponse(userId: number, response: StudyResponseInput) {
    // Get or create card progress
    const progress = await this.flashcardRepository.findOrCreateCardProgress(
      userId,
      response.cardId,
    );

    // Calculate new values using SuperMemo-2 algorithm
    const newProgress = this.calculateSuperMemo2(
      progress.ef,
      progress.interval,
      progress.repetitions,
      response.grade,
    );

    // Update progress
    return await this.flashcardRepository.updateCardProgress(
      userId,
      response.cardId,
      {
        ...newProgress,
        lastGrade: response.grade,
      },
    );
  }

  async submitBulkStudyResponse(
    userId: number,
    responses: BulkStudyResponseInput,
  ) {
    const results: Array<{
      success: boolean;
      cardId: number;
      progress?: any;
      error?: string;
    }> = [];

    for (const response of responses.responses) {
      try {
        const result = await this.submitStudyResponse(userId, response);
        results.push({
          success: true,
          cardId: response.cardId,
          progress: result,
        });
      } catch (error: any) {
        results.push({
          success: false,
          cardId: response.cardId,
          error: error.message,
        });
      }
    }

    return {
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }
  async updateCardProgress(userId: number, cardId: number) {}

  async getUserProgress(userId: number, deckId?: number) {
    return await this.flashcardRepository.findUserCardProgress(userId, deckId);
  }

  /**
   * SuperMemo-2 Algorithm Implementation
   * Based on the original algorithm by Piotr Wozniak
   *
   * @param ef - Easiness Factor (initial: 2.5)
   * @param interval - Current interval in days
   * @param repetitions - Number of successful repetitions
   * @param grade - Quality of response (0-5)
   * @returns Updated progress values
   */
  private calculateSuperMemo2(
    ef: number,
    interval: number,
    repetitions: number,
    grade: number,
  ): {
    ef: number;
    interval: number;
    repetitions: number;
    dueAt: Date;
  } {
    let newEf = ef;
    let newInterval = interval;
    let newRepetitions = repetitions;

    if (grade >= 3) {
      // Successful response
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.ceil(interval * ef);
      }
      newRepetitions = repetitions + 1;
    } else {
      // Failed response - reset repetitions but keep EF adjustments
      newRepetitions = 0;
      newInterval = 1;
    }

    // Update easiness factor
    newEf = ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));

    // Ensure EF doesn't go below 1.3
    if (newEf < 1.3) {
      newEf = 1.3;
    }

    // Calculate due date
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + newInterval);

    return {
      ef: Number(newEf.toFixed(2)),
      interval: newInterval,
      repetitions: newRepetitions,
      dueAt,
    };
  }

  // Statistics and analytics
  async getDeckStatistics(deckId: number, userId: number) {
    // Verify access to deck
    const deck = await this.getDeckById(deckId, userId);

    const cards = await this.flashcardRepository.findDeckCards(deckId, userId);
    const progress = await this.flashcardRepository.findUserCardProgress(
      userId,
      deckId,
    );

    const now = new Date();

    const stats = {
      totalCards: cards?.length || 0,
      studiedCards: progress.length,
      newCards: progress.filter((p) => p.repetitions === 0).length,
      dueCards: progress.filter((p) => p.dueAt <= now && p.repetitions > 0)
        .length,
      masteredCards: progress.filter((p) => p.repetitions >= 5 && p.ef >= 2.5)
        .length,
      averageEF:
        progress.length > 0
          ? Number(
              (
                progress.reduce((sum, p) => sum + p.ef, 0) / progress.length
              ).toFixed(2),
            )
          : 0,
      deck: {
        id: deck.id,
        title: deck.title,
        level: deck.level,
      },
    };

    return stats;
  }

  async getUserStatistics(userId: number) {
    const progress =
      await this.flashcardRepository.findUserCardProgress(userId);
    const now = new Date();

    const stats = {
      totalCards: progress.length,
      newCards: progress.filter((p) => p.repetitions === 0).length,
      dueCards: progress.filter((p) => p.dueAt <= now && p.repetitions > 0)
        .length,
      masteredCards: progress.filter((p) => p.repetitions >= 5 && p.ef >= 2.5)
        .length,
      averageEF:
        progress.length > 0
          ? Number(
              (
                progress.reduce((sum, p) => sum + p.ef, 0) / progress.length
              ).toFixed(2),
            )
          : 0,
      streakDays: this.calculateStudyStreak(userId),
      todayReviews: this.getTodayReviewCount(userId),
    };

    return stats;
  }

  private calculateStudyStreak(userId: number): number {
    // This would require tracking study sessions in a separate table
    // For now, return 0 as placeholder
    // TODO: Implement proper study streak calculation
    return 0;
  }

  private getTodayReviewCount(userId: number): number {
    // This would require tracking study sessions in a separate table
    // For now, return 0 as placeholder
    // TODO: Implement proper today review count
    return 0;
  }

  // AI Generation method (called by MCP server)
  async generateFlashcards(
    topic: string,
    level: string,
    count: number = 20,
    language: string = "vi",
    prompt?: string,
  ) {
    const result = await this.flashcardGenerationService.generateFlashcards(
      topic,
      level,
      count,
      language,
      prompt,
    );

    if (!result.success) {
      throw new ServiceUnavailableException(
        result.error || "Failed to generate flashcards via MCP server",
      );
    }

    // Format the response for MCP server
    return {
      flashcards: result.flashcards,
      metadata: result.metadata,
    };
  }
}
