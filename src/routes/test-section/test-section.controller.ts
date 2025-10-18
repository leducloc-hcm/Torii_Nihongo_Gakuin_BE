import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthType } from '../../shared/constants/auth.constant'
import { RoleName } from '../../shared/constants/role.constant'
import { Auth } from '../../shared/decorators/auth.decorator'
import { Roles } from '../../shared/decorators/roles.decorator'
import { RolesGuard } from '../../shared/guards/roles.guard'
import {
  BulkCreateSectionsWithItemsDto,
  BulkCreateTestSectionsDto,
  BulkDeleteTestSectionsDto,
  CopyTestSectionDto,
  CreateTestSectionDto,
  MoveTestSectionDto,
  ReorderTestSectionsDto,
  TestSectionQueryDto,
  TestSectionStatsDto,
  UpdateTestSectionDto,
} from './test-section.dto'
import type {
  TestSection,
  TestSectionBasic,
  TestSectionQuery,
  TestSectionWithItems,
  TestSectionWithTest,
} from './test-section.model'
import { TestSectionService } from './test-section.service'

@ApiTags('Test Sections')
@Controller()
@UseGuards(RolesGuard)
export class TestSectionController {
  constructor(private readonly testSectionService: TestSectionService) {}

  @Post('test-papers/:testId/sections')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Create new test section' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Test section created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Section title already exists in test' })
  @ApiParam({ name: 'testId', description: 'Test paper ID' })
  async createTestSection(
    @Param('testId', ParseIntPipe) testId: number,
    @Body() createDto: CreateTestSectionDto,
  ): Promise<TestSection> {
    return this.testSectionService.createTestSection({
      testId,
      title: createDto.title,
      type: createDto.type,
      order: createDto.order ?? 0,
    })
  }

  @Get('test-sections')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get all test sections with pagination and filtering' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Test sections retrieved successfully' })
  async getTestSections(@Query() queryDto: TestSectionQueryDto): Promise<{
    data: TestSectionBasic[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    return this.testSectionService.getTestSections(queryDto as TestSectionQuery)
  }

  @Get('test-papers/:testId/sections')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get all sections for a test paper' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Test sections retrieved successfully' })
  @ApiParam({ name: 'testId', description: 'Test paper ID' })
  @ApiQuery({ name: 'includeItems', required: false, description: 'Include test items and questions' })
  async getTestSectionsByTestId(
    @Param('testId', ParseIntPipe) testId: number,
    @Query('includeItems') includeItems?: string,
  ): Promise<TestSectionBasic[] | TestSectionWithItems[]> {
    if (includeItems === 'true') {
      return this.testSectionService.getTestSectionsByTestIdWithItems(testId)
    }
    return this.testSectionService.getTestSectionsByTestId(testId)
  }

  @Get('test-sections/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get test section by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Test section retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Test section not found' })
  @ApiParam({ name: 'id', description: 'Test section ID' })
  async getTestSection(@Param('id', ParseIntPipe) id: number): Promise<TestSection> {
    return this.testSectionService.getTestSection(id)
  }

  @Get('test-sections/:id/items')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get test section with all items and questions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Test section with items retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Test section not found' })
  @ApiParam({ name: 'id', description: 'Test section ID' })
  async getTestSectionWithItems(@Param('id', ParseIntPipe) id: number): Promise<TestSectionWithItems> {
    return this.testSectionService.getTestSectionWithItems(id)
  }

  @Get('test-sections/:id/details')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get test section with test information' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Test section with test info retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Test section not found' })
  @ApiParam({ name: 'id', description: 'Test section ID' })
  async getTestSectionWithTest(@Param('id', ParseIntPipe) id: number): Promise<TestSectionWithTest> {
    return this.testSectionService.getTestSectionWithTest(id)
  }

  @Get('test-sections/:id/stats')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get test section statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully', type: TestSectionStatsDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Test section not found' })
  @ApiParam({ name: 'id', description: 'Test section ID' })
  async getTestSectionStats(@Param('id', ParseIntPipe) id: number): Promise<TestSectionStatsDto> {
    return this.testSectionService.getTestSectionStatistics(id)
  }

  @Put('test-sections/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Update test section' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Test section updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Test section not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Section title already exists in test' })
  @ApiParam({ name: 'id', description: 'Test section ID' })
  async updateTestSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTestSectionDto,
  ): Promise<TestSection> {
    return this.testSectionService.updateTestSection(id, updateDto)
  }

  @Post('test-sections/:id/copy')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Copy test section to another test' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Test section copied successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Test section not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Section title already exists in target test' })
  @ApiParam({ name: 'id', description: 'Test section ID to copy' })
  async copyTestSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() copyDto: CopyTestSectionDto,
  ): Promise<TestSection> {
    return this.testSectionService.copyTestSection(id, copyDto.targetTestId, copyDto.newTitle)
  }

  @Post('test-sections/:id/duplicate')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Duplicate test section within the same test' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Test section duplicated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Test section not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Section title already exists' })
  @ApiParam({ name: 'id', description: 'Test section ID to duplicate' })
  async duplicateTestSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newTitle?: string } = {},
  ): Promise<TestSection> {
    return this.testSectionService.duplicateTestSection(id, body.newTitle)
  }

  @Put('test-sections/:id/move')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Move test section to another test' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Test section moved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Test section not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Section title already exists in target test' })
  @ApiParam({ name: 'id', description: 'Test section ID to move' })
  async moveTestSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() moveDto: MoveTestSectionDto,
  ): Promise<TestSection> {
    return this.testSectionService.moveTestSection(id, moveDto.targetTestId)
  }

  @Delete('test-sections/:id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Delete test section' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Test section deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Test section not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot delete section with test items' })
  @ApiParam({ name: 'id', description: 'Test section ID' })
  async deleteTestSection(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.testSectionService.deleteTestSection(id)
  }

  @Post('test-papers/:testId/sections/bulk')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Bulk create test sections' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Bulk creation completed' })
  @ApiParam({ name: 'testId', description: 'Test paper ID' })
  async bulkCreateTestSections(
    @Param('testId', ParseIntPipe) testId: number,
    @Body() bulkCreateDto: BulkCreateTestSectionsDto,
  ): Promise<{ created: TestSection[]; failed: Array<{ section: any; error: string }> }> {
    const sectionsWithDefaults = bulkCreateDto.sections.map((section) => ({
      title: section.title,
      type: section.type,
      order: section.order ?? 0,
    }))
    return this.testSectionService.bulkCreateTestSections(testId, sectionsWithDefaults)
  }

  @Put('test-sections/reorder')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Reorder test sections' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sections reordered successfully' })
  async reorderTestSections(@Body() reorderDto: ReorderTestSectionsDto): Promise<{
    updated: number
    failed: Array<{ id: number; error: string }>
  }> {
    return this.testSectionService.reorderTestSections(reorderDto.sections)
  }

  @Delete('test-sections/bulk')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Bulk delete test sections' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bulk delete completed' })
  async bulkDeleteTestSections(@Body() bulkDeleteDto: BulkDeleteTestSectionsDto): Promise<{
    deleted: number
    failed: number[]
  }> {
    return this.testSectionService.bulkDeleteTestSections(bulkDeleteDto.ids)
  }

  @Post('test-papers/:testId/sections/bulk-with-items')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({
    summary: 'Create multiple test sections with items',
    description: 'Create multiple test sections and their associated test items in a single operation',
  })
  @ApiParam({ name: 'testId', description: 'Test paper ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Sections and items created successfully',
    type: [TestSectionStatsDto],
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or bulk limit exceeded' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Section title already exists or duplicate questions' })
  async createSectionsWithItems(
    @Param('testId', ParseIntPipe) testId: number,
    @Body() createDto: BulkCreateSectionsWithItemsDto,
  ) {
    return this.testSectionService.createSectionsWithItems(testId, createDto.sections)
  }
}
