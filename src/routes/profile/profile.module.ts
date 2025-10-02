import { Module } from '@nestjs/common'
import { ProfileController } from './profile.controller'
import { ProfileService } from './profile.service'
import { LectureProfileRepository, StaffProfileRepository, CustomerProfileRepository } from './profile.repo'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [ProfileController],
  providers: [ProfileService, LectureProfileRepository, StaffProfileRepository, CustomerProfileRepository],
  exports: [ProfileService],
})
export class ProfileModule {}
