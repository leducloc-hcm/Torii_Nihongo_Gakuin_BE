import { Module } from '@nestjs/common'
import { QuestionGroupController } from './question-group.controller'
import { QuestionGroupService } from './question-group.service'
import { QuestionGroupRepository } from './question-group.repo'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [QuestionGroupController],
  providers: [QuestionGroupService, QuestionGroupRepository],
  exports: [QuestionGroupService],
})
export class QuestionGroupModule {}
