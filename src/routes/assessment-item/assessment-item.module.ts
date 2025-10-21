// ===== AssessmentItem Module =====
// Module configuration for AssessmentItem functionality
// Provides CRUD operations for assessment items within sections

import { Module } from '@nestjs/common'
import { AssessmentItemController } from './assessment-item.controller'
import { AssessmentItemService } from './assessment-item.service'
import { AssessmentItemRepository } from './assessment-item.repo'

@Module({
  controllers: [AssessmentItemController],
  providers: [AssessmentItemService, AssessmentItemRepository],
  exports: [AssessmentItemService, AssessmentItemRepository],
})
export class AssessmentItemModule {}
