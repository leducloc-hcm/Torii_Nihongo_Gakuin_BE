import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger'
import { TestItemService } from './test-item.service'
import {
  CreateTestItemDto,
  UpdateTestItemDto,
  TestItemQueryDto,
  ReorderTestItemsDto,
  BulkCreateTestItemsDto,
  BulkDeleteTestItemsDto,
  CopyTestItemsDto,
  MoveTestItemsDto,
  TestItemStatsDto,
  TestItemResponseDto,
  TestItemListResponseDto,
  CreateItemsForSectionDto,
} from './test-item.dto'

@ApiTags('Test Items')
@Controller('test-items')
export class TestItemController {
  constructor(private readonly testItemService: TestItemService) {}

  // ===== Basic CRUD Operations =====

  @Post()
  @ApiOperation({
    summary: 'Create a new test item',
    description: 'Add a new question to a test section with specified order',
  })
  @ApiResponse({
    status: 201,
    description: 'Test item created successfully',
    type: TestItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Section or question not found' })
  @ApiResponse({ status: 409, description: 'Question already exists in section' })
  async create(@Body() createTestItemDto: CreateTestItemDto) {
    return this.testItemService.create(createTestItemDto)
  }

  @Get()
  @ApiOperation({
    summary: 'Get test items with filtering and pagination',
    description: 'Retrieve test items with optional filtering by section, question, and order range',
  })
  @ApiResponse({
    status: 200,
    description: 'Test items retrieved successfully',
    type: TestItemListResponseDto,
  })
  @ApiQuery({ name: 'sectionId', required: false, type: Number })
  @ApiQuery({ name: 'questionId', required: false, type: Number })
  @ApiQuery({ name: 'minOrder', required: false, type: Number })
  @ApiQuery({ name: 'maxOrder', required: false, type: Number })
  @ApiQuery({ name: 'includeQuestion', required: false, type: Boolean })
  @ApiQuery({ name: 'includeSection', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['id', 'order', 'questionId'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findMany(@Query() query: TestItemQueryDto) {
    return this.testItemService.findMany(query)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get test item by ID',
    description: 'Retrieve a specific test item with optional related data',
  })
  @ApiParam({ name: 'id', description: 'Test item ID' })
  @ApiQuery({ name: 'includeQuestion', required: false, type: Boolean })
  @ApiQuery({ name: 'includeSection', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Test item retrieved successfully',
    type: TestItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Test item not found' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeQuestion') includeQuestion?: boolean,
    @Query('includeSection') includeSection?: boolean,
  ) {
    return this.testItemService.findById(id, {
      question: includeQuestion,
      section: includeSection,
    })
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update test item',
    description: 'Update test item question or order',
  })
  @ApiParam({ name: 'id', description: 'Test item ID' })
  @ApiResponse({
    status: 200,
    description: 'Test item updated successfully',
    type: TestItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Test item or question not found' })
  @ApiResponse({ status: 409, description: 'Question already exists in section' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateTestItemDto: UpdateTestItemDto) {
    return this.testItemService.update(id, updateTestItemDto)
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete test item',
    description: 'Remove a test item from a section',
  })
  @ApiParam({ name: 'id', description: 'Test item ID' })
  @ApiResponse({
    status: 200,
    description: 'Test item deleted successfully',
    type: TestItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Test item not found' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.testItemService.delete(id)
  }

  // ===== Bulk Operations =====

  @Post('bulk')
  @ApiOperation({
    summary: 'Create multiple test items',
    description: 'Create multiple test items in batch (max 100)',
  })
  @ApiResponse({
    status: 201,
    description: 'Test items created successfully',
    type: [TestItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or bulk limit exceeded' })
  @ApiResponse({ status: 404, description: 'Section or question not found' })
  @ApiResponse({ status: 409, description: 'Duplicate question in section' })
  async bulkCreate(@Body() bulkCreateDto: BulkCreateTestItemsDto) {
    return this.testItemService.bulkCreate(bulkCreateDto)
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete multiple test items',
    description: 'Delete multiple test items by IDs (max 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Test items deleted successfully',
    schema: {
      type: 'object',
      properties: { count: { type: 'number', example: 5 } },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or bulk limit exceeded' })
  @ApiResponse({ status: 404, description: 'One or more test items not found' })
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteTestItemsDto) {
    return this.testItemService.bulkDelete(bulkDeleteDto)
  }

  @Put('reorder')
  @ApiOperation({
    summary: 'Reorder test items',
    description: 'Update the order of multiple test items within their sections',
  })
  @ApiResponse({
    status: 200,
    description: 'Test items reordered successfully',
    type: [TestItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid order values or bulk limit exceeded' })
  @ApiResponse({ status: 404, description: 'One or more test items not found' })
  async reorder(@Body() reorderDto: ReorderTestItemsDto) {
    return this.testItemService.reorder(reorderDto)
  }

  // ===== Advanced Operations =====

  @Post(':id/copy')
  @ApiOperation({
    summary: 'Copy test items to another section',
    description: 'Copy selected test items to a target section',
  })
  @ApiParam({ name: 'id', description: 'Source test item ID (can be comma-separated for multiple)' })
  @ApiResponse({
    status: 201,
    description: 'Test items copied successfully',
    type: [TestItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Source items or target section not found' })
  async copyItems(@Param('id') idsParam: string, @Body() copyDto: CopyTestItemsDto) {
    const ids = idsParam.split(',').map((id) => parseInt(id.trim()))
    return this.testItemService.copyItems(ids, copyDto)
  }

  @Put(':id/move')
  @ApiOperation({
    summary: 'Move test items to another section',
    description: 'Move selected test items to a target section',
  })
  @ApiParam({ name: 'id', description: 'Source test item ID (can be comma-separated for multiple)' })
  @ApiResponse({
    status: 200,
    description: 'Test items moved successfully',
    type: [TestItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or cannot move to same section' })
  @ApiResponse({ status: 404, description: 'Source items or target section not found' })
  async moveItems(@Param('id') idsParam: string, @Body() moveDto: MoveTestItemsDto) {
    const ids = idsParam.split(',').map((id) => parseInt(id.trim()))
    return this.testItemService.moveItems(ids, moveDto)
  }

  // ===== Statistics and Queries =====

  @Get('section/:sectionId/stats')
  @ApiOperation({
    summary: 'Get test item statistics for a section',
    description: 'Retrieve statistics about test items in a specific section',
  })
  @ApiParam({ name: 'sectionId', description: 'Test section ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: TestItemStatsDto,
  })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async getStatsBySection(@Param('sectionId', ParseIntPipe) sectionId: number) {
    return this.testItemService.getStatsBySection(sectionId)
  }

  @Get('section/:sectionId')
  @ApiOperation({
    summary: 'Get all test items in a section',
    description: 'Retrieve all test items belonging to a specific section, ordered by position',
  })
  @ApiParam({ name: 'sectionId', description: 'Test section ID' })
  @ApiQuery({ name: 'includeQuestion', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Test items retrieved successfully',
    type: [TestItemResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async getBySectionId(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Query('includeQuestion') includeQuestion?: boolean,
  ) {
    const items = await this.testItemService.getBySectionId(sectionId)

    if (includeQuestion) {
      // Fetch items with question details
      const detailedItems = await Promise.all(
        items.map((item) => this.testItemService.findById(item.id, { question: true })),
      )
      return detailedItems
    }

    return items
  }

  @Get('section/:sectionId/count')
  @ApiOperation({
    summary: 'Count test items in a section',
    description: 'Get the total number of test items in a specific section',
  })
  @ApiParam({ name: 'sectionId', description: 'Test section ID' })
  @ApiResponse({
    status: 200,
    description: 'Count retrieved successfully',
    schema: {
      type: 'object',
      properties: { count: { type: 'number', example: 15 } },
    },
  })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async countBySectionId(@Param('sectionId', ParseIntPipe) sectionId: number) {
    const count = await this.testItemService.countBySectionId(sectionId)
    return { count }
  }

  @Post('section/:sectionId/questions')
  @ApiOperation({
    summary: 'Add multiple questions to a section',
    description: 'Create multiple test items by adding questions to a specific section',
  })
  @ApiParam({ name: 'sectionId', description: 'Test section ID' })
  @ApiResponse({
    status: 201,
    description: 'Test items created successfully',
    type: [TestItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input or bulk limit exceeded' })
  @ApiResponse({ status: 404, description: 'Section or question not found' })
  @ApiResponse({ status: 409, description: 'Question already exists in section' })
  async createItemsForSection(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() createDto: CreateItemsForSectionDto,
  ) {
    return this.testItemService.createItemsForSection(sectionId, createDto.questionIds, createDto.maintainOrder)
  }
}
