import { Module } from '@nestjs/common'
import { LessonProgressController } from './lesson-progress.controller'
import { LessonProgressService } from './lesson-progress.service'
import { LessonProgressRepository } from './lesson-progress.repo'
import { EnrollmentModule } from '../enrollment/enrollment.module'

@Module({
  imports: [EnrollmentModule],
  controllers: [LessonProgressController],
  providers: [LessonProgressService, LessonProgressRepository],
  exports: [LessonProgressService, LessonProgressRepository],
})
export class LessonProgressModule {}
