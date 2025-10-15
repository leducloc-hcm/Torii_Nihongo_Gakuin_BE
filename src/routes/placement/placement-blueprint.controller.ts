import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { PlacementBlueprintService } from './placement-blueprint.service'
import {
  CreatePlacementBlueprintDTO,
  UpdatePlacementBlueprintDTO,
  QueryPlacementBlueprintDTO,
  ActivateBlueprintDTO,
} from './placement-blueprint.dto'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'
import { JLPTLevel } from '@prisma/client'

@Controller('placement/blueprints')
@UseGuards(RolesGuard)
export class PlacementBlueprintController {
  constructor(private readonly placementBlueprintService: PlacementBlueprintService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreatePlacementBlueprintDTO) {
    return this.placementBlueprintService.create(createDto)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() queryDto: QueryPlacementBlueprintDTO) {
    return this.placementBlueprintService.findAll(queryDto)
  }

  @Get('level/:level')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findByLevel(@Param('level') level: JLPTLevel, @Query() queryDto: Omit<QueryPlacementBlueprintDTO, 'level'>) {
    return this.placementBlueprintService.findByLevel(level, queryDto)
  }

  @Get('level/:level/active')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findActiveByLevel(@Param('level') level: JLPTLevel) {
    return this.placementBlueprintService.findActiveByLevel(level)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.placementBlueprintService.findOne(id)
  }

  @Patch(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdatePlacementBlueprintDTO) {
    return this.placementBlueprintService.update(id, updateDto)
  }

  @Post(':id/activate')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id', ParseIntPipe) id: number) {
    return this.placementBlueprintService.activate(id)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.placementBlueprintService.remove(id)
  }
}
