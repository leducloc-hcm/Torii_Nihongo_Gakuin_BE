import { Module } from '@nestjs/common'
import { CourseController } from './course.controller'
import { CourseService } from './course.service'
import { CourseRepository } from './course.repo'
import { SharedModule } from 'src/shared/shared.module'
import { ProfileModule } from '../profile/profile.module'
import { EnrollmentModule } from '../enrollment/enrollment.module'

@Module({
  imports: [SharedModule, ProfileModule, EnrollmentModule],
  controllers: [CourseController],
  providers: [CourseService, CourseRepository],
  exports: [CourseService, CourseRepository],
})
export class CourseModule {}
