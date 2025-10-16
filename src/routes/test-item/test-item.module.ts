// ===== TestItem Module =====
// Module configuration for TestItem functionality
// Provides CRUD operations for test items within sections

import { Module } from '@nestjs/common'
import { TestItemController } from './test-item.controller'
import { TestItemService } from './test-item.service'
import { TestItemRepository } from './test-item.repo'

@Module({
  controllers: [TestItemController],
  providers: [TestItemService, TestItemRepository],
  exports: [TestItemService, TestItemRepository],
})
export class TestItemModule {}
