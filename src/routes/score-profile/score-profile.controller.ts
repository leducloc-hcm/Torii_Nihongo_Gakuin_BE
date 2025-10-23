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
  ScoreProfileValidationDto,
  CreateDefaultProfilesDto,
} from './score-profile.dto'

@ApiTags('score-profiles')
@Controller('score-profiles')
export class ScoreProfileController {
  constructor(private readonly scoreProfileService: ScoreProfileService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new score profile',
    description: 'Creates a new score profile with scoring configuration for assessments',
  })
  @ApiResponse({
    status: 201,
    description: 'Score profile created successfully',
    type: ScoreProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Profile name already exists' })
  async create(@Body(ValidationPipe) createDto: CreateScoreProfileDto): Promise<ScoreProfileResponseDto> {
    return this.scoreProfileService.create(createDto)
  }

  @Post('defaults')
  @ApiOperation({
    summary: 'Create default score profiles',
    description: 'Creates default JLPT score profiles for testing and common use cases',
  })
  @ApiResponse({
    status: 201,
    description: 'Default profiles created successfully',
  })
  async createDefaults(@Body(ValidationPipe) createDto: CreateDefaultProfilesDto): Promise<{
    message: string
    created: number
    skipped: number
    profiles: string[]
  }> {
    return this.scoreProfileService.createDefaultProfiles(createDto)
  }

  @Post(':id/clone')
  @ApiOperation({
    summary: 'Clone score profile',
    description: 'Creates a copy of existing score profile with new name',
  })
  @ApiParam({ name: 'id', description: 'Score profile ID to clone' })
  @ApiResponse({
    status: 201,
    description: 'Profile cloned successfully',
    type: ScoreProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Original profile not found' })
  @ApiResponse({ status: 409, description: 'New profile name already exists' })
  async clone(@Param('id', ParseIntPipe) id: number, @Body('name') newName: string): Promise<ScoreProfileResponseDto> {
    return this.scoreProfileService.cloneProfile(id, newName)
  }

  // ===== READ OPERATIONS =====
  @Get()
  @ApiOperation({
    summary: 'Get all score profiles',
    description: 'Retrieves paginated list of score profiles with optional filtering',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'level', required: false, enum: ['N5', 'N4', 'N3', 'N2', 'N1'] })
  @ApiQuery({ name: 'name', required: false, description: 'Filter by name (partial match)' })
  @ApiQuery({ name: 'includeCount', required: false, description: 'Include paper count (default: true)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['id', 'name', 'level', 'createdAt', 'updatedAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: 200,
    description: 'Score profiles retrieved successfully',
    type: ScoreProfileListResponseDto,
  })
  async findMany(@Query(ValidationPipe) query: ScoreProfileQueryDto): Promise<ScoreProfileListResponseDto> {
    return this.scoreProfileService.findMany(query)
  }

  @Get('level/:level')
  @ApiOperation({
    summary: 'Get profiles by JLPT level',
    description: 'Retrieves all score profiles for specific JLPT level',
  })
  @ApiParam({
    name: 'level',
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    description: 'JLPT level',
  })
  @ApiResponse({
    status: 200,
    description: 'Profiles retrieved successfully',
    type: [ScoreProfileResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid JLPT level' })
  async findByLevel(@Param('level') level: string): Promise<ScoreProfileResponseDto[]> {
    return this.scoreProfileService.findByLevel(level)
  }

  @Get('all')
  @ApiOperation({
    summary: 'Get all score profiles without pagination',
    description: 'Retrieves all score profiles sorted by level and name',
  })
  @ApiResponse({
    status: 200,
    description: 'All profiles retrieved successfully',
    type: [ScoreProfileResponseDto],
  })
  async findAll(): Promise<ScoreProfileResponseDto[]> {
    return this.scoreProfileService.findAll()
  }

  @Get('buckets')
  @ApiOperation({
    summary: 'Get available score buckets',
    description: 'Returns list of available score buckets and their descriptions',
  })
  @ApiResponse({
    status: 200,
    description: 'Score buckets retrieved successfully',
  })
  getBucketOptions(): { buckets: string[]; description: Record<string, string> } {
    return this.scoreProfileService.getBucketOptions()
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get score profile by ID',
    description: 'Retrieves single score profile with usage statistics',
  })
  @ApiParam({ name: 'id', description: 'Score profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Score profile retrieved successfully',
    type: ScoreProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Score profile not found' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<ScoreProfileResponseDto> {
    return this.scoreProfileService.findById(id)
  }

  @Get(':id/usage')
  @ApiOperation({
    summary: 'Get profile usage statistics',
    description: 'Retrieves detailed usage statistics for score profile',
  })
  @ApiParam({ name: 'id', description: 'Score profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Usage statistics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Score profile not found' })
  async getUsageStats(@Param('id', ParseIntPipe) id: number): Promise<{
    profile: ScoreProfileResponseDto
    usage: {
      totalPapers: number
      activePapers: number
      levelDistribution: Record<string, number>
    }
  }> {
    return this.scoreProfileService.getUsageStats(id)
  }

  // ===== UPDATE OPERATIONS =====
  @Put(':id')
  @ApiOperation({
    summary: 'Update score profile',
    description: 'Updates existing score profile with new configuration',
  })
  @ApiParam({ name: 'id', description: 'Score profile ID to update' })
  @ApiResponse({
    status: 200,
    description: 'Score profile updated successfully',
    type: ScoreProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Score profile not found' })
  @ApiResponse({ status: 409, description: 'Profile name already exists' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateScoreProfileDto,
  ): Promise<ScoreProfileResponseDto> {
    return this.scoreProfileService.update(id, updateDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete score profile',
    description: 'Deletes score profile if not used by any assessment papers',
  })
  @ApiParam({ name: 'id', description: 'Score profile ID to delete' })
  @ApiResponse({ status: 204, description: 'Score profile deleted successfully' })
  @ApiResponse({ status: 404, description: 'Score profile not found' })
  @ApiResponse({ status: 409, description: 'Profile is in use by assessment papers' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.scoreProfileService.delete(id)
  }

  @Delete('bulk/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete multiple score profiles',
    description: 'Deletes multiple score profiles by IDs if not used by assessment papers',
  })
  @ApiResponse({
    status: 200,
    description: 'Score profiles deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'No IDs provided' })
  @ApiResponse({ status: 409, description: 'Some profiles are in use' })
  async deleteMany(@Body('ids') ids: number[]): Promise<{ message: string; deletedCount: number }> {
    return this.scoreProfileService.deleteMany(ids)
  }

  // ===== VALIDATION OPERATIONS =====
  @Post('validate/profile/:id')
  @ApiOperation({
    summary: 'Validate score profile',
    description: 'Validates score profile configuration and mappings',
  })
  @ApiParam({ name: 'id', description: 'Score profile ID to validate' })
  @ApiResponse({
    status: 200,
    description: 'Validation completed',
    type: ScoreProfileValidationDto,
  })
  @ApiResponse({ status: 404, description: 'Score profile not found' })
  async validateProfile(@Param('id', ParseIntPipe) id: number): Promise<ScoreProfileValidationDto> {
    return this.scoreProfileService.validateProfile(id)
  }

  @Post('validate/mappings')
  @ApiOperation({
    summary: 'Validate score mappings',
    description: 'Validates question type to score bucket mappings',
  })
  @ApiResponse({
    status: 200,
    description: 'Mappings validation completed',
    type: ScoreProfileValidationDto,
  })
  validateMappings(@Body('mappings') mappings: Record<string, string>): ScoreProfileValidationDto {
    return this.scoreProfileService.validateMappings(mappings)
  }
}
