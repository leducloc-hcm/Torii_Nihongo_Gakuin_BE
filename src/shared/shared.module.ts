import { Global, Module } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { HashingService } from './services/hashing.service'
import { TokenService } from './services/token.service'
import { JwtModule } from '@nestjs/jwt'
import { AccessTokenGuard } from 'src/shared/guards/access-token.guard'
import { APP_GUARD } from '@nestjs/core'
import { AuthenticationGuard } from 'src/shared/guards/authentication.guard'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo'
import { EmailService } from 'src/shared/services/email.service'
import { TwoFactorService } from 'src/shared/services/2fa.service'
import { S3Service } from 'src/shared/services/s3.service'
import { SharedWebsocketRepository } from 'src/shared/repositories/shared-websocket.repo'

const sharedServices = [
  PrismaService,
  HashingService,
  TokenService,
  EmailService,
  SharedUserRepository,
  SharedWebsocketRepository,
  TwoFactorService,
  S3Service,
]

@Global()
@Module({
  providers: [
    ...sharedServices,
    AccessTokenGuard,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],
  exports: [...sharedServices, RolesGuard],
  imports: [JwtModule],
})
export class SharedModule {}
