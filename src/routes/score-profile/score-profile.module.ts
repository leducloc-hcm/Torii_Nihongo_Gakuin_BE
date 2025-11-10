import { Module } from '@nestjs/common'
import { SharedModule } from '../../shared/shared.module'
import { ScoreProfileController } from './score-profile.controller'
import { ScoreProfileService } from './score-profile.service'
import { ScoreProfileRepository } from './score-profile.repo'

@Module({
  imports: [SharedModule],
  controllers: [ScoreProfileController],
  providers: [ScoreProfileService, ScoreProfileRepository],
  exports: [ScoreProfileService, ScoreProfileRepository],
})
export class ScoreProfileModule {}
