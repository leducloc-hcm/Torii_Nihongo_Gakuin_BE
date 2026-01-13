import { Module } from '@nestjs/common'
import { PlacementBlueprintController } from './placement-blueprint.controller'
import { PlacementBlueprintService } from './placement-blueprint.service'
import { PlacementBlueprintRepository } from './placement-blueprint.repo'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [PlacementBlueprintController],
  providers: [PlacementBlueprintService, PlacementBlueprintRepository],
  exports: [PlacementBlueprintService],
})
export class PlacementBlueprintModule {}
