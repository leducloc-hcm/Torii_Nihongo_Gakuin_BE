import { Module } from '@nestjs/common'
import { TestPaperController } from './test-paper.controller'
import { TestPaperService } from './test-paper.service'
import { TestPaperRepository } from './test-paper.repo'
import { SharedModule } from '../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [TestPaperController],
  providers: [TestPaperService, TestPaperRepository],
  exports: [TestPaperService, TestPaperRepository],
})
export class TestPaperModule {}
