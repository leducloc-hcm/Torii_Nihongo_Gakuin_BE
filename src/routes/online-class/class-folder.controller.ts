import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { ClassFolderService } from './class-folder.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { RoleName } from 'src/shared/constants/role.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'

@ApiTags('Class Folders')
@Controller()
@ApiBearerAuth()
export class ClassFolderController {
  constructor(private readonly classFolderService: ClassFolderService) {}

  @Get('folders/my-folders')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all folders accessible by user, grouped by class' })
  @ApiResponse({ status: 200, description: 'Folders retrieved successfully' })
  async getMyFolders(@ActiveUser('userId') userId: number) {
    const folders = await this.classFolderService.getUserFolders(userId)

    return {
      success: true,
      message: 'Folders retrieved successfully',
      data: folders,
    }
  }

  @Get('online-classes/:classId/folder')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get folder information for a class' })
  @ApiResponse({ status: 200, description: 'Folder information retrieved successfully' })
  async getFolderInfo(@Param('classId', ParseIntPipe) classId: number) {
    const folderInfo = await this.classFolderService.getFolderInfo(classId)
    if (!folderInfo) {
      return {
        success: false,
        message: 'Folder not found for this class',
      }
    }
    return {
      success: true,
      message: 'Folder information retrieved successfully',
      data: folderInfo,
    }
  }

  @Get('online-classes/:classId/folder/contents')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get folder contents (folders and resources) with optional parentId' })
  @ApiResponse({ status: 200, description: 'Folder contents retrieved successfully' })
  async getFolderContents(
    @Param('classId', ParseIntPipe) classId: number,
    @Query('parentFolderId') parentFolderId?: string,
    @ActiveUser('userId') userId?: number,
  ) {
    const parentId = parentFolderId ? parseInt(parentFolderId, 10) : undefined
    const contents = await this.classFolderService.getFolderContents(classId, parentId, userId)

    return {
      success: true,
      message: 'Folder contents retrieved successfully',
      data: contents,
    }
  }

  @Post('online-classes/:classId/folder/folders')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create child folder' })
  @ApiResponse({ status: 201, description: 'Folder created successfully' })
  async createChildFolder(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() body: { name: string; parentFolderId?: number },
    @ActiveUser('userId') userId: number,
  ) {
    const folder = await this.classFolderService.createChildFolder(
      classId,
      body.parentFolderId || null,
      body.name,
      userId,
    )

    return {
      success: true,
      message: 'Folder created successfully',
      data: folder,
    }
  }

  @Post('online-classes/:classId/folder/upload/material')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate presigned URL for material upload' })
  @ApiResponse({ status: 200, description: 'Presigned upload URL generated successfully' })
  async generateUploadUrl(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() body: { filename: string; contentType: string; fileSizeByte: number },
    @ActiveUser('userId') userId: number,
  ) {
    const uploadData = await this.classFolderService.generateMaterialUploadUrl(
      classId,
      body.filename,
      body.contentType,
      body.fileSizeByte,
      userId,
    )

    return {
      success: true,
      message: 'Presigned material upload URL generated successfully',
      data: uploadData,
    }
  }

  @Post('online-classes/:classId/folder/resources')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create resource record after file upload' })
  @ApiResponse({ status: 201, description: 'Resource created successfully' })
  async createResource(
    @Param('classId', ParseIntPipe) classId: number,
    @Body()
    body: {
      title: string
      s3Key: string
      publicUrl: string
      fileSizeByte: number
      body?: string
      tags?: string[]
      parentFolderId?: number
    },
    @ActiveUser('userId') userId: number,
  ) {
    const resource = await this.classFolderService.createResourceAfterUpload(
      classId,
      userId,
      { key: body.s3Key, publicUrl: body.publicUrl },
      body.title,
      body.fileSizeByte,
      body.body,
      body.tags,
      body.parentFolderId,
    )

    return {
      success: true,
      message: 'Resource created successfully',
      data: resource,
    }
  }

  @Delete('online-classes/:classId/folder/resources/:resourceId')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a resource from class folder' })
  @ApiResponse({ status: 200, description: 'Resource deleted successfully' })
  async deleteResource(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('resourceId', ParseIntPipe) resourceId: number,
    @ActiveUser('userId') userId: number,
  ) {
    await this.classFolderService.deleteResource(resourceId, userId)

    return {
      success: true,
      message: 'Resource deleted successfully',
    }
  }

  @Patch('online-classes/:classId/folder/permissions/:userId')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update member folder permission (lecturer only)' })
  @ApiResponse({ status: 200, description: 'Permission updated successfully' })
  async updatePermission(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { permission: 'VIEW_ONLY' | 'EDIT' },
    @ActiveUser('userId') lecturerId: number,
  ) {
    await this.classFolderService.updateMemberPermission(classId, userId, body.permission, lecturerId)

    return {
      success: true,
      message: 'Permission updated successfully',
    }
  }

  @Delete('online-classes/:classId/folder/folders/:folderId')
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete child folder and all its contents' })
  @ApiResponse({ status: 200, description: 'Folder deleted successfully or content info returned' })
  async deleteChildFolder(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('folderId', ParseIntPipe) folderId: number,
    @Query('forceDelete') forceDelete?: string,
    @ActiveUser('userId') userId?: number,
  ) {
    const force = forceDelete === 'true'
    const result = await this.classFolderService.deleteChildFolder(classId, folderId, userId!, force)

    // If folder has content and forceDelete is false, return content info
    if ('hasContent' in result && result.hasContent && !force) {
      return {
        success: false,
        message: 'Folder contains content. Confirmation required.',
        data: result,
      }
    }

    return {
      success: true,
      message: result.message || 'Folder deleted successfully',
    }
  }
}
