import { Module } from '@nestjs/common'
import { AssessmentSectionController } from './assessment-section.controller'
import { AssessmentSectionService } from './assessment-section.service'
import { AssessmentSectionRepository } from './assessment-section.repo'
import { SharedModule } from '../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [AssessmentSectionController],
  providers: [AssessmentSectionService, AssessmentSectionRepository],
  exports: [AssessmentSectionService, AssessmentSectionRepository],
})
export class AssessmentSectionModule {}
