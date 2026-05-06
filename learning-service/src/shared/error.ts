import { ConflictException, NotFoundException, UnprocessableEntityException, BadRequestException } from '@nestjs/common'

export const NotFoundRecordException = new NotFoundException('Error.NotFound')

export const InvalidPasswordException = new UnprocessableEntityException([
  {
    message: 'Error.InvalidPassword',
    path: 'password',
  },
])

export const VersionConflictException = new ConflictException('Error.VersionConflict')

export class InvalidFileExtensionError extends BadRequestException {
  constructor(message: string) {
    super(message)
  }
}
