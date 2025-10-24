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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiProperty } from '@nestjs/swagger'
import { AssessmentItemService } from './assessment-item.service'
import {
  CreateAssessmentItemDto,
  CreateAssessmentItemWithTypeDto,
  UpdateAssessmentItemDto,
  AssessmentItemQueryDto,
  ReorderAssessmentItemsDto,
  BulkCreateAssessmentItemsDto,
  BulkDeleteAssessmentItemsDto,
  CopyAssessmentItemsDto,
  MoveAssessmentItemsDto,
  AssessmentItemStatsDto,
  AssessmentItemResponseDto,
  AssessmentItemListResponseDto,
  CreateItemsForSectionDto,
  CreateItemsFromQuestionGroupDto,
  BulkCreateItemsFromQuestionGroupsDto,
  UpdateItemScoringDto,
  ItemScoringResponseDto,
  SectionScoringResponseDto,
  AssessmentItemScoringValidationDto,
} from './assessment-item.dto'

@ApiTags('Assessment Items')
@Controller('assessment-items')
export class AssessmentItemController {
  constructor(private readonly assessmentItemService: AssessmentItemService) {}

  // ===== Basic CRUD Operations =====

  @Post()
  @ApiOperation({
    summary: 'Create a new assessment item',
    description: 'Add a new question or question group to an assessment section with specified order',
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment item created successfully',
    type: AssessmentItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Section, question, or question group not found' })
  @ApiResponse({ status: 409, description: 'Question already exists in section' })
  async createAssessmentItem(@Body() createAssessmentItemDto: CreateAssessmentItemDto) {
    return this.assessmentItemService.createAssessmentItem(createAssessmentItemDto as any)
  }

  @Post('with-type-validation')
  @ApiOperation({
    summary: 'Create assessment item with type validation',
    description: 'Create assessment item with explicit type validation for TEST/EXAM scoring rules',
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment item created successfully with type validation',
    type: AssessmentItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or scoring validation failed' })
  @ApiResponse({ status: 404, description: 'Section, question, or question group not found' })
  async createAssessmentItemWithTypeValidation(@Body() createDto: CreateAssessmentItemWithTypeDto) {
    return this.assessmentItemService.createAssessmentItemWithTypeValidation(createDto as any)
  }

  @Get()
  @ApiOperation({
    summary: 'Get assessment items with filtering and pagination',
    description:
      'Retrieve assessment items with optional filtering by section, question, question group, and order range',
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment items retrieved successfully',
    type: AssessmentItemListResponseDto,
  })
  @ApiQuery({ name: 'sectionId', required: false, type: Number })
  @ApiQuery({ name: 'questionId', required: false, type: Number })
  @ApiQuery({ name: 'questionGroupId', required: false, type: Number })
  @ApiQuery({ name: 'minOrder', required: false, type: Number })
  @ApiQuery({ name: 'maxOrder', required: false, type: Number })
  @ApiQuery({ name: 'includeQuestion', required: false, type: Boolean })
  @ApiQuery({ name: 'includeSection', required: false, type: Boolean })
  @ApiQuery({ name: 'includeQuestionGroup', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['id', 'order', 'sectionId', 'questionId', 'questionGroupId'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getAssessmentItems(@Query() query: AssessmentItemQueryDto) {
    return this.assessmentItemService.getAssessmentItems(query as any)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get assessment item by ID',
    description: 'Retrieve a specific assessment item with optional related data',
  })
  @ApiParam({ name: 'id', description: 'Assessment item ID' })
  @ApiQuery({ name: 'includeQuestion', required: false, type: Boolean })
  @ApiQuery({ name: 'includeSection', required: false, type: Boolean })
  @ApiQuery({ name: 'includeQuestionGroup', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Assessment item retrieved successfully',
    type: AssessmentItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Assessment item not found' })
  async getAssessmentItem(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeQuestion') includeQuestion?: boolean,
    @Query('includeSection') includeSection?: boolean,
    @Query('includeQuestionGroup') includeQuestionGroup?: boolean,
  ) {
    return this.assessmentItemService.getAssessmentItem(id, {
      question: includeQuestion,
      section: includeSection,
      questionGroup: includeQuestionGroup,
    })
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update assessment item',
    description: 'Update assessment item question, question group, order, or score',
  })
  @ApiParam({ name: 'id', description: 'Assessment item ID' })
  @ApiResponse({
    status: 200,
    description: 'Assessment item updated successfully',
    type: AssessmentItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Assessment item, question, or question group not found' })
  @ApiResponse({ status: 409, description: 'Question already exists in section' })
  async updateAssessmentItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAssessmentItemDto: UpdateAssessmentItemDto,
  ) {
    return this.assessmentItemService.updateAssessmentItem(id, updateAssessmentItemDto)
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete assessment item',
    description: 'Remove an assessment item from a section',
  })
  @ApiParam({ name: 'id', description: 'Assessment item ID' })
  @ApiResponse({
    status: 204,
    description: 'Assessment item deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Assessment item not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAssessmentItem(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentItemService.deleteAssessmentItem(id)
  }

  // ===== Bulk Operations =====

  @Post('bulk')
  @ApiOperation({
    summary: 'Create multiple assessment items',
    description: 'Create multiple assessment items in batch (max 100)',
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment items created successfully',
    type: [AssessmentItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or bulk limit exceeded' })
  @ApiResponse({ status: 404, description: 'Section, question, or question group not found' })
  @ApiResponse({ status: 409, description: 'Duplicate question in section' })
  async bulkCreateAssessmentItems(@Body() bulkCreateDto: BulkCreateAssessmentItemsDto) {
    return this.assessmentItemService.bulkCreateAssessmentItems(bulkCreateDto as any)
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete multiple assessment items',
    description: 'Delete multiple assessment items by IDs (max 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment items deleted successfully',
    schema: {
      type: 'object',
      properties: { count: { type: 'number', example: 5 } },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or bulk limit exceeded' })
  @ApiResponse({ status: 404, description: 'One or more assessment items not found' })
  async bulkDeleteAssessmentItems(@Body() bulkDeleteDto: BulkDeleteAssessmentItemsDto) {
    return this.assessmentItemService.bulkDeleteAssessmentItems(bulkDeleteDto)
  }

  @Put('reorder')
  @ApiOperation({
    summary: 'Reorder assessment items',
    description: 'Update the order of multiple assessment items within their sections',
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment items reordered successfully',
    type: [AssessmentItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid order values or bulk limit exceeded' })
  @ApiResponse({ status: 404, description: 'One or more assessment items not found' })
  async reorderAssessmentItems(@Body() reorderDto: ReorderAssessmentItemsDto) {
    return this.assessmentItemService.reorderAssessmentItems(reorderDto)
  }

  // ===== Advanced Operations =====

  @Post(':id/copy')
  @ApiOperation({
    summary: 'Copy assessment items to another section',
    description: 'Copy selected assessment items to a target section',
  })
  @ApiParam({ name: 'id', description: 'Source assessment item ID (can be comma-separated for multiple)' })
  @ApiResponse({
    status: 201,
    description: 'Assessment items copied successfully',
    type: [AssessmentItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Source items or target section not found' })
  async copyAssessmentItems(@Param('id') idsParam: string, @Body() copyDto: CopyAssessmentItemsDto) {
    const ids = idsParam.split(',').map((id) => parseInt(id.trim()))
    return this.assessmentItemService.copyAssessmentItems(ids, copyDto as any)
  }

  @Put(':id/move')
  @ApiOperation({
    summary: 'Move assessment items to another section',
    description: 'Move selected assessment items to a target section',
  })
  @ApiParam({ name: 'id', description: 'Source assessment item ID (can be comma-separated for multiple)' })
  @ApiResponse({
    status: 200,
    description: 'Assessment items moved successfully',
    type: [AssessmentItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or cannot move to same section' })
  @ApiResponse({ status: 404, description: 'Source items or target section not found' })
  async moveAssessmentItems(@Param('id') idsParam: string, @Body() moveDto: MoveAssessmentItemsDto) {
    const ids = idsParam.split(',').map((id) => parseInt(id.trim()))
    return this.assessmentItemService.moveAssessmentItems(ids, moveDto)
  }

  // ===== Statistics and Queries =====

  @Get('section/:sectionId/stats')
  @ApiOperation({
    summary: 'Get assessment item statistics for a section',
    description: 'Retrieve statistics about assessment items in a specific section',
  })
  @ApiParam({ name: 'sectionId', description: 'Assessment section ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: AssessmentItemStatsDto,
  })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async getAssessmentItemStatsBySection(@Param('sectionId', ParseIntPipe) sectionId: number) {
    return this.assessmentItemService.getAssessmentItemStatsBySection(sectionId)
  }

  @Get('section/:sectionId')
  @ApiOperation({
    summary: 'Get all assessment items in a section',
    description: 'Retrieve all assessment items belonging to a specific section, ordered by position',
  })
  @ApiParam({ name: 'sectionId', description: 'Assessment section ID' })
  @ApiQuery({ name: 'includeQuestion', required: false, type: Boolean })
  @ApiQuery({ name: 'includeQuestionGroup', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Assessment items retrieved successfully',
    type: [AssessmentItemResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async getAssessmentItemsBySectionId(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Query('includeQuestion') includeQuestion?: boolean,
    @Query('includeQuestionGroup') includeQuestionGroup?: boolean,
  ) {
    const items = await this.assessmentItemService.getAssessmentItemsBySectionId(sectionId)

    if (includeQuestion || includeQuestionGroup) {
      // Fetch items with question/questionGroup details
      const detailedItems = await Promise.all(
        items.map((item) =>
          this.assessmentItemService.getAssessmentItem(item.id, {
            question: includeQuestion,
            questionGroup: includeQuestionGroup,
          }),
        ),
      )
      return detailedItems
    }

    return items
  }

  @Get('section/:sectionId/count')
  @ApiOperation({
    summary: 'Count assessment items in a section',
    description: 'Get the total number of assessment items in a specific section',
  })
  @ApiParam({ name: 'sectionId', description: 'Assessment section ID' })
  @ApiResponse({
    status: 200,
    description: 'Count retrieved successfully',
    schema: {
      type: 'object',
      properties: { count: { type: 'number', example: 15 } },
    },
  })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async countAssessmentItemsBySectionId(@Param('sectionId', ParseIntPipe) sectionId: number) {
    const count = await this.assessmentItemService.countAssessmentItemsBySectionId(sectionId)
    return { count }
  }

  @Post('section/:sectionId/questions')
  @ApiOperation({
    summary: 'Add multiple questions to a section',
    description: 'Create multiple assessment items by adding questions or question groups to a specific section',
  })
  @ApiParam({ name: 'sectionId', description: 'Assessment section ID' })
  @ApiResponse({
    status: 201,
    description: 'Assessment items created successfully',
    type: [AssessmentItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input or bulk limit exceeded' })
  @ApiResponse({ status: 404, description: 'Section, question, or question group not found' })
  @ApiResponse({ status: 409, description: 'Question already exists in section' })
  async createItemsForSection(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() createDto: CreateItemsForSectionDto,
  ) {
    const results: any[] = []

    // Handle individual questions
    if (createDto.questionIds && createDto.questionIds.length > 0) {
      const questionItems = await this.assessmentItemService.createItemsForSection(
        sectionId,
        createDto.questionIds,
        createDto.maintainOrder || true,
      )
      results.push(...questionItems)
    }

    // Handle question groups
    if (createDto.questionGroupIds && createDto.questionGroupIds.length > 0) {
      const groupItems = await this.assessmentItemService.createItemsFromQuestionGroups(
        sectionId,
        createDto.questionGroupIds,
        createDto.maintainOrder || true,
      )
      results.push(...groupItems)
    }

    return results
  }

  @Post('section/:sectionId/question-groups')
  @ApiOperation({
    summary: 'Add question groups to a section',
    description: 'Create assessment items from question groups, either as groups or individual questions',
  })
  @ApiParam({ name: 'sectionId', description: 'Assessment section ID' })
  @ApiResponse({
    status: 201,
    description: 'Assessment items created successfully',
    type: [AssessmentItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input or bulk limit exceeded' })
  @ApiResponse({ status: 404, description: 'Section or question group not found' })
  async createItemsFromQuestionGroup(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() createDto: CreateItemsFromQuestionGroupDto,
  ) {
    return await this.assessmentItemService.createItemFromQuestionGroup(
      sectionId,
      createDto.questionGroupId,
      createDto.addIndividualQuestions || false,
      createDto.order,
    )
  }

  @Post('question-groups/bulk')
  @ApiOperation({
    summary: 'Bulk create assessment items from question groups',
    description: 'Create multiple assessment items from question groups in batch (max 20)',
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment items created successfully',
    type: [AssessmentItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or bulk limit exceeded' })
  @ApiResponse({ status: 404, description: 'Section or question group not found' })
  async bulkCreateFromQuestionGroups(@Body() bulkCreateDto: BulkCreateItemsFromQuestionGroupsDto) {
    const results: any[] = []

    for (const item of bulkCreateDto.items) {
      const createdItems = await this.assessmentItemService.createItemFromQuestionGroup(
        item.sectionId,
        item.questionGroupId,
        item.addIndividualQuestions || false,
        item.order,
      )
      results.push(...createdItems)
    }

    return results
  }

  // ===== Scoring Operations =====

  @Get(':id/scoring')
  @ApiOperation({
    summary: 'Get scoring information for an assessment item',
    description: 'Returns total score, question count, and assessment type information',
  })
  @ApiParam({ name: 'id', description: 'Assessment item ID' })
  @ApiResponse({
    status: 200,
    description: 'Item scoring information retrieved successfully',
    type: ItemScoringResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Assessment item not found' })
  async getItemScoring(@Param('id', ParseIntPipe) id: number) {
    return await this.assessmentItemService.getItemTotalScore(id)
  }

  @Put(':id/scoring')
  @ApiOperation({
    summary: 'Update scoring for an assessment item',
    description: 'Update score per question for this item (only allowed for EXAM type assessments)',
  })
  @ApiParam({ name: 'id', description: 'Assessment item ID' })
  @ApiResponse({
    status: 200,
    description: 'Item scoring updated successfully',
    type: AssessmentItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cannot set scoring for TEST type assessments' })
  @ApiResponse({ status: 404, description: 'Assessment item not found' })
  async updateItemScoring(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateItemScoringDto) {
    return await this.assessmentItemService.updateItemScoring(id, updateDto.scorePerQuestion)
  }

  @Get('section/:sectionId/scoring')
  @ApiOperation({
    summary: 'Get total scoring information for a section',
    description: 'Calculate total score for all items in a section',
  })
  @ApiParam({ name: 'sectionId', description: 'Assessment section ID' })
  @ApiResponse({
    status: 200,
    description: 'Section scoring information retrieved successfully',
    type: SectionScoringResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async getSectionScoring(@Param('sectionId', ParseIntPipe) sectionId: number) {
    return await this.assessmentItemService.calculateSectionTotalScore(sectionId)
  }

  @Get('section/:sectionId/validate-scoring')
  @ApiOperation({
    summary: 'Validate score per question for assessment type',
    description: 'Check if a scorePerQuestion value is valid for the assessment type',
  })
  @ApiParam({ name: 'sectionId', description: 'Assessment section ID' })
  @ApiQuery({ name: 'scorePerQuestion', required: false, type: Number, description: 'Score per question to validate' })
  @ApiResponse({
    status: 200,
    description: 'Validation result returned',
    type: AssessmentItemScoringValidationDto,
  })
  @ApiResponse({ status: 404, description: 'Section or assessment not found' })
  async validateScorePerQuestion(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Query('scorePerQuestion') scorePerQuestion?: number,
  ) {
    return await this.assessmentItemService.validateScorePerQuestionForAssessment(sectionId, scorePerQuestion)
  }
}
