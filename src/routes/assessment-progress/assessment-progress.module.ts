import { Module, forwardRef } from '@nestjs/common'
import { AssessmentProgressController } from './assessment-progress.controller'
import { AssessmentProgressService } from './assessment-progress.service'
import { AssessmentProgressRepository } from './assessment-progress.repo'
import { SharedModule } from 'src/shared/shared.module'
import { AssessmentAssignmentModule } from '../assessment-assignment/assessment-assignment.module'

@Module({
  imports: [SharedModule, forwardRef(() => AssessmentAssignmentModule)],
  controllers: [AssessmentProgressController],
  providers: [AssessmentProgressService, AssessmentProgressRepository],
  exports: [AssessmentProgressService, AssessmentProgressRepository],
})
export class AssessmentProgressModule {}
