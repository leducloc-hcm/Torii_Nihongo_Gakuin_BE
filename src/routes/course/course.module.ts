import { Module } from '@nestjs/common'
import { CourseController } from './course.controller'
import { CourseService } from './course.service'
import { CourseRepository } from './course.repo'
import { SharedModule } from 'src/shared/shared.module'
import { ProfileModule } from '../profile/profile.module'

@Module({
  imports: [SharedModule, ProfileModule],
  controllers: [CourseController],
  providers: [CourseService, CourseRepository],
  exports: [CourseService],
})
export class CourseModule {}
