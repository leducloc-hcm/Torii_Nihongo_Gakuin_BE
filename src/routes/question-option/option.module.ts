import { Module } from '@nestjs/common'
import { OptionController } from './option.controller'
import { OptionService } from './option.service'
import { OptionRepository } from './option.repo'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [OptionController],
  providers: [OptionService, OptionRepository],
  exports: [OptionService],
})
export class OptionModule {}
