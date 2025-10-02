import { HttpException, HttpStatus } from '@nestjs/common'

export class TagNotFoundException extends HttpException {
  constructor(identifier: string | number) {
    super(
      {
        message: `Tag with ${typeof identifier === 'number' ? 'ID' : 'slug'} '${identifier}' not found`,
        error: 'Tag Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      },
      HttpStatus.NOT_FOUND,
    )
  }
}

export class TagSlugExistsException extends HttpException {
  constructor(slug: string) {
    super(
      {
        message: `Tag with slug '${slug}' already exists`,
        error: 'Conflict',
        statusCode: HttpStatus.CONFLICT,
      },
      HttpStatus.CONFLICT,
    )
  }
}

export class TagHasBlogsException extends HttpException {
  constructor(tagName: string, blogCount: number) {
    super(
      {
        message: `Cannot delete tag '${tagName}' because it is associated with ${blogCount} blog(s)`,
        error: 'Bad Request',
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    )
  }
}
