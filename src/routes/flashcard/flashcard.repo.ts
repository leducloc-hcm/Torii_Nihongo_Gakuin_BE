import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { JLPTLevel, Visibility } from '@prisma/client'
import {
  CreateFlashcardDeckInput,
  UpdateFlashcardDeckInput,
  CreateFlashcardInput,
  UpdateFlashcardInput,
  GetDecksQueryInput,
  GetStudyCardsQueryInput,
} from './flashcard.model'

@Injectable()
export class FlashcardRepository {
  constructor(private readonly prismaService: PrismaService) {}

  // Deck operations
  async createDeck(userId: number, data: CreateFlashcardDeckInput) {
    return this.prismaService.flashcardDeck.create({
      data: {
        ...data,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
    })
  }

  async findDeckById(id: number, userId?: number) {
    const where: any = { id }

    // If userId is provided, check ownership or public visibility
    if (userId !== undefined) {
      where.OR = [{ ownerId: userId }, { visibility: Visibility.PUBLIC }, { visibility: Visibility.UNLISTED }]
    } else {
      where.visibility = { in: [Visibility.PUBLIC, Visibility.UNLISTED] }
    }

    return this.prismaService.flashcardDeck.findFirst({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
    })
  }

  async findUserDecks(userId: number, query: GetDecksQueryInput) {
    const { page = 1, limit = 20, level, visibility } = query
    const skip = (page - 1) * limit

    const where: any = { ownerId: userId }

    if (level) {
      where.level = level
    }

    if (visibility) {
      where.visibility = visibility
    }

    const [decks, total] = await Promise.all([
      this.prismaService.flashcardDeck.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              cards: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prismaService.flashcardDeck.count({ where }),
    ])

    return {
      decks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findPublicDecks(query: GetDecksQueryInput) {
    const { page = 1, limit = 20, level } = query
    const skip = (page - 1) * limit

    const where: any = {
      visibility: { in: [Visibility.PUBLIC, Visibility.UNLISTED] },
    }

    if (level) {
      where.level = level
    }

    const [decks, total] = await Promise.all([
      this.prismaService.flashcardDeck.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              cards: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prismaService.flashcardDeck.count({ where }),
    ])

    return {
      decks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async updateDeck(id: number, userId: number, data: UpdateFlashcardDeckInput) {
    return await this.prismaService.flashcardDeck.update({
      where: {
        id,
        ownerId: userId, // Ensure user owns the deck
      },
      data,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
    })
  }

  async deleteDeck(id: number, userId: number) {
    return await this.prismaService.flashcardDeck.delete({
      where: {
        id,
        ownerId: userId, // Ensure user owns the deck
      },
    })
  }

  // Card operations
  async createCard(data: CreateFlashcardInput) {
    // Verify deck ownership is handled at service level
    return await this.prismaService.flashcard.create({
      data,
    })
  }

  async findCardById(id: number) {
    return await this.prismaService.flashcard.findUnique({
      where: { id },
      include: {
        deck: {
          select: {
            id: true,
            title: true,
            ownerId: true,
          },
        },
      },
    })
  }

  async findDeckCards(deckId: number, userId?: number) {
    // Check if user can access this deck
    const deck = await this.findDeckById(deckId, userId)
    if (!deck) {
      return null
    }

    return this.prismaService.flashcard.findMany({
      where: { deckId },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }

  async updateCard(id: number, userId: number, data: UpdateFlashcardInput) {
    // Verify ownership through deck relationship
    return await this.prismaService.flashcard.update({
      where: {
        id,
        deck: {
          ownerId: userId,
        },
      },
      data,
    })
  }

  async deleteCard(id: number, userId: number) {
    return await this.prismaService.flashcard.delete({
      where: {
        id,
        deck: {
          ownerId: userId,
        },
      },
    })
  }

  // Progress operations
  async findOrCreateCardProgress(userId: number, cardId: number) {
    return await this.prismaService.cardProgress.upsert({
      where: {
        userId_cardId: {
          userId,
          cardId,
        },
      },
      create: {
        userId,
        cardId,
        ef: 2.5, // Default easiness factor
        interval: 0,
        repetitions: 0,
        dueAt: new Date(),
      },
      update: {},
      include: {
        card: true,
      },
    })
  }

  async updateCardProgress(
    userId: number,
    cardId: number,
    data: {
      ef: number
      interval: number
      repetitions: number
      dueAt: Date
      lastGrade: number
    },
  ) {
    return await this.prismaService.cardProgress.update({
      where: {
        userId_cardId: {
          userId,
          cardId,
        },
      },
      data,
      include: {
        card: true,
      },
    })
  }

  async findStudyCards(userId: number, query: GetStudyCardsQueryInput) {
    const { limit = 20, newCardsOnly = false, dueCardsOnly = false } = query
    const now = new Date()

    const where: any = {
      userId,
    }

    if (newCardsOnly) {
      where.repetitions = 0
    } else if (dueCardsOnly) {
      where.dueAt = { lte: now }
      where.repetitions = { gt: 0 }
    } else {
      // Both new and due cards
      where.OR = [{ repetitions: 0 }, { dueAt: { lte: now } }]
    }

    const progress = await this.prismaService.cardProgress.findMany({
      where,
      include: {
        card: {
          include: {
            deck: {
              select: {
                id: true,
                title: true,
                ownerId: true,
              },
            },
          },
        },
      },
      orderBy: [
        { dueAt: 'asc' },
        { repetitions: 'asc' }, // New cards first
      ],
      take: limit,
    })

    // Get statistics
    const [totalCards, dueCards, newCards] = await Promise.all([
      this.prismaService.cardProgress.count({
        where: { userId },
      }),
      this.prismaService.cardProgress.count({
        where: {
          userId,
          dueAt: { lte: now },
          repetitions: { gt: 0 },
        },
      }),
      this.prismaService.cardProgress.count({
        where: {
          userId,
          repetitions: 0,
        },
      }),
    ])

    return {
      totalCards,
      dueCards,
      newCards,
      reviewCards: dueCards,
      cards: progress,
    }
  }

  async findUserCardProgress(userId: number, deckId?: number) {
    const where: any = { userId }

    if (deckId) {
      where.card = {
        deckId,
      }
    }

    return await this.prismaService.cardProgress.findMany({
      where,
      include: {
        card: {
          include: {
            deck: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        dueAt: 'asc',
      },
    })
  }
}
