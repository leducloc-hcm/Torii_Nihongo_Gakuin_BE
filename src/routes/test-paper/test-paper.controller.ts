import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { TestPaperService } from './test-paper.service'
import { CreateTestPaperDto, UpdateTestPaperDto, TestPaperQueryDto } from './test-paper.dto'
import { Auth } from '../../shared/decorators/auth.decorator'
import { AuthType } from '../../shared/constants/auth.constant'
import { Roles } from '../../shared/decorators/roles.decorator'
import { RolesGuard } from '../../shared/guards/roles.guard'
import { RoleName } from '../../shared/constants/role.constant'
import type { TestPaper, TestPaperBasic } from './test-paper.model'

@ApiTags('Test Papers')
@Controller('test-papers')
@UseGuards(RolesGuard)
export class TestPaperController {
  constructor(private readonly testPaperService: TestPaperService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Create new test paper' })
  async createTestPaper(@Body() createDto: CreateTestPaperDto): Promise<TestPaper> {
    return this.testPaperService.createTestPaper(createDto)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get all test papers' })
  async getTestPapers(@Query() queryDto: TestPaperQueryDto): Promise<{
    data: TestPaperBasic[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    return this.testPaperService.getTestPapers(queryDto)
  }

  @Get(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer, RoleName.Admin)
  @ApiOperation({ summary: 'Get test paper by ID' })
  async getTestPaper(@Param('id', ParseIntPipe) id: number): Promise<TestPaper> {
    return this.testPaperService.getTestPaper(id)
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Update test paper' })
  async updateTestPaper(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTestPaperDto,
  ): Promise<TestPaper> {
    return this.testPaperService.updateTestPaper(id, updateDto)
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  @ApiOperation({ summary: 'Delete test paper' })
  async deleteTestPaper(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.testPaperService.deleteTestPaper(id)
  }
}
