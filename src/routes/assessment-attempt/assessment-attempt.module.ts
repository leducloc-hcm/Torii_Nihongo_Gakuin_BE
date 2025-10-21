import { Module } from '@nestjs/common'
import { AssessmentAttemptController } from './assessment-attempt.controller'
import { AssessmentAttemptService } from './assessment-attempt.service'
import { AssessmentAttemptRepository } from './assessment-attempt.repo'
import { SharedModule } from '../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [AssessmentAttemptController],
  providers: [AssessmentAttemptService, AssessmentAttemptRepository],
  exports: [AssessmentAttemptService, AssessmentAttemptRepository],
})
export class AssessmentAttemptModule {}
