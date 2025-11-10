import { Module } from '@nestjs/common'
import { ModuleController } from './module.controller'
import { ModuleService } from './module.service'
import { ModuleRepository } from './module.repo'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [ModuleController],
  providers: [ModuleService, ModuleRepository],
  exports: [ModuleService],
})
export class ModuleModule {}
