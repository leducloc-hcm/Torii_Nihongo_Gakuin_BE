import { Module, forwardRef } from '@nestjs/common'
import { AssessmentAssignmentController } from './assessment-assignment.controller'
import { AssessmentAssignmentService } from './assessment-assignment.service'
import { AssessmentAssignmentRepository } from './assessment-assignment.repo'
import { SharedModule } from 'src/shared/shared.module'
import { AssessmentProgressModule } from '../assessment-progress/assessment-progress.module'

@Module({
  imports: [SharedModule, forwardRef(() => AssessmentProgressModule)],
  controllers: [AssessmentAssignmentController],
  providers: [AssessmentAssignmentService, AssessmentAssignmentRepository],
  exports: [AssessmentAssignmentService, AssessmentAssignmentRepository],
})
export class AssessmentAssignmentModule {}
