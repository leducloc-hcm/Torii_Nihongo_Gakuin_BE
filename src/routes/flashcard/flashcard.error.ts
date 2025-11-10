import { HttpException, HttpStatus } from '@nestjs/common'

export class FlashcardError extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status)
  }
}

export class DeckNotFoundError extends FlashcardError {
  constructor(deckId?: number) {
    super(
      deckId ? `Deck with ID ${deckId} not found or access denied` : 'Deck not found or access denied',
      HttpStatus.NOT_FOUND,
    )
  }
}

export class CardNotFoundError extends FlashcardError {
  constructor(cardId?: number) {
    super(
      cardId ? `Card with ID ${cardId} not found or access denied` : 'Card not found or access denied',
      HttpStatus.NOT_FOUND,
    )
  }
}

export class DeckAccessDeniedError extends FlashcardError {
  constructor(deckId?: number) {
    super(deckId ? `Access denied to deck with ID ${deckId}` : 'Access denied to this deck', HttpStatus.FORBIDDEN)
  }
}

export class InvalidGradeError extends FlashcardError {
  constructor(grade: number) {
    super(`Invalid grade: ${grade}. Grade must be between 0 and 5`, HttpStatus.BAD_REQUEST)
  }
}

export class EmptyDeckError extends FlashcardError {
  constructor(deckId?: number) {
    super(
      deckId ? `Deck with ID ${deckId} has no cards to study` : 'This deck has no cards to study',
      HttpStatus.BAD_REQUEST,
    )
  }
}
