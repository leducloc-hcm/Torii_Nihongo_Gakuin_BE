import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { StringValue } from 'ms'
import {
  AccessTokenPayload,
  AccessTokenPayloadCreate,
  RefreshTokenPayload,
  RefreshTokenPayloadCreate,
} from 'src/shared/types/jwt.type'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AccessTokenPayloadCreate) {
    const expiresIn: StringValue | number = (process.env.ACCESS_TOKEN_EXPIRES_IN || '1h') as StringValue
    const { email, ...rest } = payload
    return this.jwtService.sign(
      { ...rest, uuid: uuidv4(), sub: email },
      {
        secret: process.env.ACCESS_TOKEN_SECRET,
        expiresIn,
        algorithm: 'HS256',
      },
    )
  }

  signRefreshToken(payload: RefreshTokenPayloadCreate) {
    const expiresIn: StringValue | number = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as StringValue
    return this.jwtService.sign(
      { ...payload, uuid: uuidv4() },
      {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn,
        algorithm: 'HS256',
      },
    )
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: process.env.ACCESS_TOKEN_SECRET,
    })
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: process.env.REFRESH_TOKEN_SECRET,
    })
  }
}
