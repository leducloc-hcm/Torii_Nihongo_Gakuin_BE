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
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger'
import { ScoreProfileService } from './score-profile.service'
import {
  CreateScoreProfileDto,
  UpdateScoreProfileDto,
  ScoreProfileQueryDto,
  ScoreProfileResponseDto,
  ScoreProfileListResponseDto,
} from './score-profile.dto'

@ApiTags('score-profiles')
@Controller('score-profiles')
export class ScoreProfileController {
  constructor(private readonly scoreProfileService: ScoreProfileService) {}

  @Post()
  async create(@Body(ValidationPipe) createDto: CreateScoreProfileDto): Promise<ScoreProfileResponseDto> {
    return this.scoreProfileService.create(createDto)
  }

  @Get()
  @ApiOperation({ summary: 'Get all score profiles with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'level', required: false, enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['id', 'name', 'level', 'createdAt', 'updatedAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findMany(@Query(ValidationPipe) query: ScoreProfileQueryDto): Promise<ScoreProfileListResponseDto> {
    return this.scoreProfileService.findMany(query)
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<ScoreProfileResponseDto> {
    return this.scoreProfileService.findById(id)
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateScoreProfileDto,
  ): Promise<ScoreProfileResponseDto> {
    return this.scoreProfileService.update(id, updateDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.scoreProfileService.delete(id)
  }
}
