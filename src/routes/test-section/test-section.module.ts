import { Module } from '@nestjs/common'
import { TestSectionController } from './test-section.controller'
import { TestSectionService } from './test-section.service'
import { TestSectionRepository } from './test-section.repo'
import { SharedModule } from '../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [TestSectionController],
  providers: [TestSectionService, TestSectionRepository],
  exports: [TestSectionService, TestSectionRepository],
})
export class TestSectionModule {}
