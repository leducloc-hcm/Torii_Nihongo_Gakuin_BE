import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { AuthRepository } from './auth.repo'
import { GoogleService } from './google.service'
import { ProfileModule } from '../profile/profile.module'

@Module({
  imports: [ProfileModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, GoogleService],
  exports: [AuthService],
})
export class AuthModule {}
