import { Module } from '@nestjs/common'
import { AssessmentPaperController } from './assessment-paper.controller'
import { AssessmentPaperService } from './assessment-paper.service'
import { AssessmentPaperRepository } from './assessment-paper.repo'
import { SharedModule } from '../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [AssessmentPaperController],
  providers: [AssessmentPaperService, AssessmentPaperRepository],
  exports: [AssessmentPaperService, AssessmentPaperRepository],
})
export class AssessmentPaperModule {}
