import { Module } from '@nestjs/common'
import { AssessmentAssignmentController } from './assessment-assignment.controller'
import { AssessmentAssignmentService } from './assessment-assignment.service'
import { AssessmentAssignmentRepository } from './assessment-assignment.repo'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [AssessmentAssignmentController],
  providers: [AssessmentAssignmentService, AssessmentAssignmentRepository],
  exports: [AssessmentAssignmentService, AssessmentAssignmentRepository],
})
export class AssessmentAssignmentModule {}
