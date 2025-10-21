import { Module } from '@nestjs/common'
import { AssessmentAnswerController } from './assessment-answer.controller'
import { AssessmentAnswerService } from './assessment-answer.service'
import { AssessmentAnswerRepository } from './assessment-answer.repo'
import { SharedModule } from '../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [AssessmentAnswerController],
  providers: [AssessmentAnswerService, AssessmentAnswerRepository],
  exports: [AssessmentAnswerService, AssessmentAnswerRepository],
})
export class AssessmentAnswerModule {}
