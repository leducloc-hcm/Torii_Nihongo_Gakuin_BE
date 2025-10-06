import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  Patch,
} from '@nestjs/common'
import { ModuleService } from './module.service'
import { CreateModuleDTO, UpdateModuleDTO, QueryModuleDTO } from './module.dto'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'

@Controller('modules')
@UseGuards(RolesGuard)
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createModuleDto: CreateModuleDTO) {
    return this.moduleService.create(createModuleDto)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() queryDto: QueryModuleDTO) {
    return this.moduleService.findAll(queryDto)
  }

  @Get('course/:courseId')
  @HttpCode(HttpStatus.OK)
  async findByCourse(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query() queryDto: Omit<QueryModuleDTO, 'courseId'>,
  ) {
    return this.moduleService.findByCourse(courseId, queryDto)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moduleService.findOne(id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateModuleDto: UpdateModuleDTO) {
    return this.moduleService.update(id, updateModuleDto)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.moduleService.remove(id)
  }

  @Patch('course/:courseId/reorder')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async reorderModules(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() body: { modules: { id: number; order: number }[] },
  ) {
    await this.moduleService.reorderModules(courseId, body.modules)
    return { message: 'Modules reordered successfully' }
  }
}
