import { Module } from '@nestjs/common'
import { LessonController } from './lesson.controller'
import { LessonService } from './lesson.service'
import { LessonRepository } from './lesson.repo'
import { SharedModule } from 'src/shared/shared.module'
import { EnrollmentModule } from '../enrollment/enrollment.module'

@Module({
  imports: [SharedModule, EnrollmentModule],
  controllers: [LessonController],
  providers: [LessonService, LessonRepository],
  exports: [LessonService],
})
export class LessonModule {}
