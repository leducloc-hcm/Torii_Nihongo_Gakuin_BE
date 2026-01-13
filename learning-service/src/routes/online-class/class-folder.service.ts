import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { S3Service } from '../../shared/services/s3.service'
import { FolderPermissionType, Role } from '@prisma/client'

@Injectable()
export class ClassFolderService {
  private readonly logger = new Logger(ClassFolderService.name)
  private readonly FOLDER_SIZE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024 // 10GB

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Create folder for a class (called when class is created)
   */
  async createClassFolder(classId: number, lecturerId: number): Promise<number> {
    const existingFolder = await this.prisma.folder.findUnique({
      where: { classId },
    })

    if (existingFolder) {
      return existingFolder.id
    }

    const folder = await this.prisma.folder.create({
      data: {
        name: `Class Resources`,
        ownerId: lecturerId,
        classId,
        totalSizeByte: 0,
      },
    })

    // Grant EDIT permission to lecturer
    await this.prisma.folderPermission.create({
      data: {
        folderId: folder.id,
        userId: lecturerId,
        permission: FolderPermissionType.EDIT,
        grantedBy: lecturerId,
      },
    })

    // Update class with folderId
    await this.prisma.class.update({
      where: { id: classId },
      data: { folderId: folder.id },
    })

    this.logger.log(`Created folder ${folder.id} for class ${classId}`)
    return folder.id
  }

  /**
   * Grant folder access to class member (called when member joins class)
   */
  async grantFolderAccessToMember(classId: number, userId: number, memberRole: Role): Promise<void> {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { folder: true },
    })

    if (!classData) {
      throw new NotFoundException('Class not found')
    }

    if (!classData.folder) {
      // Create folder if it doesn't exist
      await this.createClassFolder(classId, classData.lecturerId)
      // Reload class data
      const updatedClass = await this.prisma.class.findUnique({
        where: { id: classId },
        include: { folder: true },
      })
      if (!updatedClass?.folder) {
        throw new BadRequestException('Failed to create class folder')
      }
      classData.folder = updatedClass.folder
    }

    // Check if permission already exists
    const existingPermission = await this.prisma.folderPermission.findUnique({
      where: {
        folderId_userId: {
          folderId: classData.folder.id,
          userId,
        },
      },
    })

    if (existingPermission) {
      return // Already has access
    }

    // Grant permission based on role
    const permission = memberRole === Role.LECTURER ? FolderPermissionType.EDIT : FolderPermissionType.VIEW_ONLY

    await this.prisma.folderPermission.create({
      data: {
        folderId: classData.folder.id,
        userId,
        permission,
        grantedBy: classData.lecturerId,
      },
    })

    this.logger.log(`Granted ${permission} permission to user ${userId} for class ${classId} folder`)
  }

  /**
   * Revoke folder access when member leaves class
   */
  async revokeFolderAccess(classId: number, userId: number): Promise<void> {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { folder: true },
    })

    if (!classData?.folder) {
      return // No folder to revoke access from
    }

    await this.prisma.folderPermission.deleteMany({
      where: {
        folderId: classData.folder.id,
        userId,
      },
    })

    this.logger.log(`Revoked folder access from user ${userId} for class ${classId}`)
  }

  /**
   * Generate presigned URL for material upload with size validation
   */
  async generateMaterialUploadUrl(
    classId: number,
    filename: string,
    contentType: string,
    fileSizeByte: number,
    userId: number,
  ) {
    // Check class exists
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { folder: true },
    })

    if (!classData) {
      throw new NotFoundException('Class not found')
    }

    // Ensure folder exists
    if (!classData.folder) {
      await this.createClassFolder(classId, classData.lecturerId)
      const updatedClass = await this.prisma.class.findUnique({
        where: { id: classId },
        include: { folder: true },
      })
      if (!updatedClass?.folder) {
        throw new BadRequestException('Failed to create class folder')
      }
      classData.folder = updatedClass.folder
    }

    // Check user permission
    const permission = await this.prisma.folderPermission.findUnique({
      where: {
        folderId_userId: {
          folderId: classData.folder.id,
          userId,
        },
      },
    })

    if (!permission) {
      throw new ForbiddenException('You do not have access to this class folder')
    }

    if (permission.permission === FolderPermissionType.VIEW_ONLY) {
      throw new ForbiddenException('You only have view-only permission. Cannot upload materials.')
    }

    // Check folder size limit
    const currentSize = classData.folder.totalSizeByte
    const newTotalSize = currentSize + BigInt(fileSizeByte)

    if (newTotalSize > BigInt(this.FOLDER_SIZE_LIMIT_BYTES)) {
      throw new BadRequestException(
        `Upload would exceed folder size limit (10GB). Current: ${this.formatBytes(Number(currentSize))}, Adding: ${this.formatBytes(fileSizeByte)}`,
      )
    }

    // Generate presigned URL
    const uploadData = await this.s3Service.generateClassFolderMaterialUploadUrl(
      classId,
      filename,
      contentType,
      fileSizeByte,
    )

    return uploadData
  }

  /**
   * Get folder contents (children folders and resources)
   */
  async getFolderContents(classId: number, parentFolderId?: number, userId?: number) {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { folder: true },
    })

    if (!classData?.folder) {
      throw new NotFoundException('Class folder not found')
    }

    // Determine which folder to query
    const targetFolderId = parentFolderId || classData.folder.id

    // Verify folder belongs to class
    // Child folders have classId = null, so we need to check via parent chain
    if (parentFolderId) {
      const parentFolder = await this.prisma.folder.findUnique({
        where: { id: parentFolderId },
      })
      if (!parentFolder) {
        throw new NotFoundException('Folder not found')
      }

      // Check if folder belongs to this class:
      // - If it's the root folder, classId should match
      // - If it's a child folder (classId = null), check parent chain to root
      if (parentFolder.classId !== null && parentFolder.classId !== classId) {
        throw new NotFoundException('Folder does not belong to this class')
      }

      // If it's a child folder, verify it's in the correct class by checking parent chain
      if (parentFolder.classId === null) {
        let currentFolder: typeof parentFolder | null = parentFolder
        let foundRoot = false

        // Traverse up to root to verify class
        while (currentFolder?.parentId) {
          currentFolder = await this.prisma.folder.findUnique({
            where: { id: currentFolder.parentId },
          })
          if (currentFolder?.classId === classId) {
            foundRoot = true
            break
          }
        }

        // Also check if current folder is root
        if (!foundRoot && currentFolder?.classId === classId) {
          foundRoot = true
        }

        if (!foundRoot) {
          throw new NotFoundException('Folder does not belong to this class')
        }
      }
    }

    // Get child folders
    // Child folders have classId = null, they're linked through parent chain
    // So we only filter by parentId, not by classId
    const childFolders = await this.prisma.folder.findMany({
      where: {
        parentId: targetFolderId,
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            children: true,
            resources: true,
          },
        },
      },
    })

    // Get resources
    const resources = await this.prisma.resource.findMany({
      where: {
        folderId: targetFolderId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true } },
      },
    })

    // Get breadcrumb path
    const breadcrumbs = await this.getBreadcrumbPath(targetFolderId)

    // Convert BigInt to Number
    const foldersWithCounts = childFolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      ownerId: folder.ownerId,
      parentId: folder.parentId,
      classId: folder.classId,
      childFolderCount: folder._count.children,
      resourceCount: folder._count.resources,
    }))

    const resourcesWithSize = resources.map((resource) => ({
      ...resource,
      sizeByte: resource.sizeByte ? Number(resource.sizeByte) : null,
    }))

    return {
      currentFolderId: targetFolderId,
      breadcrumbs,
      folders: foldersWithCounts,
      resources: resourcesWithSize,
    }
  }

  /**
   * Get breadcrumb path for a folder
   */
  private async getBreadcrumbPath(folderId: number): Promise<Array<{ id: number; name: string }>> {
    const breadcrumbs: Array<{ id: number; name: string }> = []
    let currentFolderId: number | null = folderId

    while (currentFolderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: currentFolderId },
        select: { id: true, name: true, parentId: true },
      })

      if (!folder) break

      breadcrumbs.unshift({ id: folder.id, name: folder.name })
      currentFolderId = folder.parentId
    }

    return breadcrumbs
  }

  /**
   * Create child folder
   */
  async createChildFolder(classId: number, parentFolderId: number | null, folderName: string, userId: number) {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { folder: true },
    })

    if (!classData?.folder) {
      throw new NotFoundException('Class folder not found')
    }

    // Normalize: if parentFolderId is the root folder ID, treat it as null
    const rootFolderId = classData.folder.id
    const actualParentId = parentFolderId === rootFolderId ? null : parentFolderId

    this.logger.log(
      `Creating folder "${folderName}" in class ${classId}, rootFolderId: ${rootFolderId}, parentFolderId: ${parentFolderId}, actualParentId: ${actualParentId}`,
    )

    // Validate folder name
    if (!folderName || !folderName.trim()) {
      throw new BadRequestException('Folder name cannot be empty')
    }

    // Check if folder with same name already exists in the target location
    // Child folders have classId = null, so we only filter by parentId
    const existingFolder = await this.prisma.folder.findFirst({
      where: {
        parentId: actualParentId || rootFolderId,
        name: folderName.trim(),
      },
    })

    if (existingFolder) {
      throw new BadRequestException(`A folder with the name "${folderName.trim()}" already exists in this location`)
    }

    // If actualParentId is provided, verify it belongs to this class and is not the root
    if (actualParentId) {
      const parentFolder = await this.prisma.folder.findUnique({
        where: { id: actualParentId },
      })

      if (!parentFolder) {
        throw new NotFoundException(`Parent folder with ID ${actualParentId} not found`)
      }

      // Verify parent folder belongs to this class
      // If it's root folder, check classId directly
      // If it's child folder (classId = null), check via parent chain
      if (parentFolder.classId !== null && parentFolder.classId !== classId) {
        throw new NotFoundException('Parent folder does not belong to this class')
      }

      if (parentFolder.classId === null) {
        // Child folder - verify it belongs to this class by checking parent chain
        let currentFolder: typeof parentFolder | null = parentFolder
        let foundRoot = false

        while (currentFolder?.parentId) {
          currentFolder = await this.prisma.folder.findUnique({
            where: { id: currentFolder.parentId },
          })
          if (currentFolder?.classId === classId) {
            foundRoot = true
            break
          }
        }

        if (!foundRoot && currentFolder?.classId === classId) {
          foundRoot = true
        }

        if (!foundRoot) {
          throw new NotFoundException('Parent folder does not belong to this class')
        }
      }

      // Ensure it's not the root folder (shouldn't happen due to normalize, but double-check)
      if (parentFolder.id === rootFolderId || parentFolder.parentId === null) {
        // This is the root folder, use root folder permission check
        const permission = await this.prisma.folderPermission.findUnique({
          where: {
            folderId_userId: {
              folderId: rootFolderId,
              userId,
            },
          },
        })

        if (!permission || permission.permission !== FolderPermissionType.EDIT) {
          throw new ForbiddenException('You do not have EDIT permission to create folders in the root folder')
        }
      } else {
        // Check permission on the child parent folder
        const permission = await this.prisma.folderPermission.findUnique({
          where: {
            folderId_userId: {
              folderId: actualParentId,
              userId,
            },
          },
        })

        if (!permission || permission.permission !== FolderPermissionType.EDIT) {
          throw new ForbiddenException('You do not have EDIT permission to create folders here')
        }
      }
    } else {
      // Creating in root folder - check root folder permission
      const permission = await this.prisma.folderPermission.findUnique({
        where: {
          folderId_userId: {
            folderId: rootFolderId,
            userId,
          },
        },
      })

      if (!permission || permission.permission !== FolderPermissionType.EDIT) {
        throw new ForbiddenException('You do not have EDIT permission to create folders in the root folder')
      }
    }

    // Create folder
    // Only root folder has classId (unique constraint)
    // Child folders have classId = null, they're linked through parent chain
    const newFolder = await this.prisma.folder.create({
      data: {
        ownerId: userId,
        name: folderName.trim(),
        parentId: actualParentId || rootFolderId,
        classId: null, // Child folders don't have classId, only root folder does
        totalSizeByte: 0,
      },
    })

    // Grant same permissions as parent folder
    const sourceFolderId = actualParentId || rootFolderId
    const parentPermissions = await this.prisma.folderPermission.findMany({
      where: { folderId: sourceFolderId },
    })

    // Copy permissions to new folder
    await Promise.all(
      parentPermissions.map((perm) =>
        this.prisma.folderPermission.create({
          data: {
            folderId: newFolder.id,
            userId: perm.userId,
            permission: perm.permission,
            grantedBy: userId,
          },
        }),
      ),
    )

    this.logger.log(`Created child folder ${newFolder.id} in class ${classId}`)

    return {
      id: newFolder.id,
      name: newFolder.name,
      ownerId: newFolder.ownerId,
      parentId: newFolder.parentId,
      classId: newFolder.classId,
      childFolderCount: 0,
      resourceCount: 0,
    }
  }

  /**
   * Delete child folder and all its contents recursively
   */
  async deleteChildFolder(classId: number, folderId: number, userId: number, forceDelete: boolean = false) {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { folder: true },
    })

    if (!classData?.folder) {
      throw new NotFoundException('Class folder not found')
    }

    // Prevent deletion of root folder
    if (folderId === classData.folder.id) {
      throw new BadRequestException('Cannot delete root folder')
    }

    // Get folder to delete
    const folderToDelete = await this.prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        _count: {
          select: {
            children: true,
            resources: true,
          },
        },
      },
    })

    if (!folderToDelete) {
      throw new NotFoundException('Folder not found')
    }

    // Verify folder belongs to this class
    if (folderToDelete.classId !== null && folderToDelete.classId !== classId) {
      throw new NotFoundException('Folder does not belong to this class')
    }

    // If child folder, verify via parent chain
    if (folderToDelete.classId === null) {
      let currentFolderId: number | null = folderToDelete.parentId
      let foundRoot = false

      while (currentFolderId) {
        const currentFolder = await this.prisma.folder.findUnique({
          where: { id: currentFolderId },
          select: { id: true, classId: true, parentId: true },
        })

        if (!currentFolder) break

        if (currentFolder.classId === classId) {
          foundRoot = true
          break
        }

        currentFolderId = currentFolder.parentId
      }

      if (!foundRoot) {
        throw new NotFoundException('Folder does not belong to this class')
      }
    }

    // Check permission
    const permission = await this.prisma.folderPermission.findUnique({
      where: {
        folderId_userId: {
          folderId: folderToDelete.parentId || classData.folder.id,
          userId,
        },
      },
    })

    if (!permission || permission.permission !== FolderPermissionType.EDIT) {
      throw new ForbiddenException('You do not have permission to delete this folder')
    }

    // Check if folder has content
    const hasContent = folderToDelete._count.children > 0 || folderToDelete._count.resources > 0

    if (hasContent && !forceDelete) {
      // Return information about content for frontend to show confirmation
      return {
        hasContent: true,
        childFolderCount: folderToDelete._count.children,
        resourceCount: folderToDelete._count.resources,
      }
    }

    // Delete folder and all contents recursively
    await this.deleteFolderRecursive(folderId)

    this.logger.log(`Deleted folder ${folderId} and all its contents`)
    return {
      success: true,
      message: 'Folder and all contents deleted successfully',
    }
  }

  /**
   * Recursively delete folder and all its contents
   */
  private async deleteFolderRecursive(folderId: number): Promise<void> {
    // Get all child folders
    const childFolders = await this.prisma.folder.findMany({
      where: { parentId: folderId },
    })

    // Recursively delete child folders first
    for (const childFolder of childFolders) {
      await this.deleteFolderRecursive(childFolder.id)
    }

    // Get all resources in this folder
    const resources = await this.prisma.resource.findMany({
      where: { folderId },
      select: { id: true, s3Key: true, sizeByte: true },
    })

    // Delete files from S3
    for (const resource of resources) {
      if (resource.s3Key) {
        try {
          await this.s3Service.deleteObject(resource.s3Key)
          this.logger.log(`Deleted file from S3: ${resource.s3Key}`)
        } catch (error) {
          this.logger.warn(`Failed to delete file from S3 (${resource.s3Key}): ${error.message}`)
        }
      }
    }

    // Delete all resources
    await this.prisma.resource.deleteMany({
      where: { folderId },
    })

    // Get folder size before deletion for updating parent
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { totalSizeByte: true, parentId: true },
    })

    const folderSize = folder?.totalSizeByte || BigInt(0)

    // Delete folder permissions
    await this.prisma.folderPermission.deleteMany({
      where: { folderId },
    })

    // Delete the folder itself
    await this.prisma.folder.delete({
      where: { id: folderId },
    })

    // Update parent folder size recursively
    if (folder?.parentId) {
      await this.updateFolderSizeRecursive(folder.parentId, -folderSize)
    }
  }

  /**
   * Create resource record after file upload completes
   */
  async createResourceAfterUpload(
    classId: number,
    userId: number,
    uploadData: { key: string; publicUrl: string },
    title: string,
    fileSizeByte: number,
    body?: string,
    tags?: string[],
    parentFolderId?: number,
  ) {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { folder: true },
    })

    if (!classData?.folder) {
      throw new NotFoundException('Class folder not found')
    }

    // Determine target folder
    const rootFolderId = classData.folder.id
    const targetFolderId = parentFolderId || rootFolderId

    this.logger.log(
      `Creating resource in class ${classId}, rootFolderId: ${rootFolderId}, parentFolderId: ${parentFolderId}, targetFolderId: ${targetFolderId}`,
    )

    // If parentFolderId is provided, verify it belongs to this class
    if (parentFolderId) {
      const targetFolder = await this.prisma.folder.findUnique({
        where: { id: parentFolderId },
      })

      if (!targetFolder) {
        throw new NotFoundException(`Target folder with ID ${parentFolderId} not found`)
      }

      // Verify target folder belongs to this class
      // If it's root folder, check classId directly
      // If it's child folder (classId = null), check via parent chain
      if (targetFolder.classId !== null && targetFolder.classId !== classId) {
        throw new NotFoundException('Target folder does not belong to this class')
      }

      if (targetFolder.classId === null) {
        // Child folder - verify it belongs to this class by checking parent chain
        let currentFolder: typeof targetFolder | null = targetFolder
        let foundRoot = false

        while (currentFolder?.parentId) {
          currentFolder = await this.prisma.folder.findUnique({
            where: { id: currentFolder.parentId },
          })
          if (currentFolder?.classId === classId) {
            foundRoot = true
            break
          }
        }

        // Also check if current folder is root
        if (!foundRoot && currentFolder?.classId === classId) {
          foundRoot = true
        }

        if (!foundRoot) {
          throw new NotFoundException('Target folder does not belong to this class')
        }
      }
    }

    // Create resource
    const resource = await this.prisma.resource.create({
      data: {
        ownerId: userId,
        folderId: targetFolderId,
        title,
        body,
        mediaUrl: uploadData.publicUrl,
        s3Key: uploadData.key,
        sizeByte: BigInt(fileSizeByte),
        tags: tags || [],
        visibility: 'PRIVATE', // Class resources are private
      },
    })

    // Update folder total size (and parent folders)
    await this.updateFolderSizeRecursive(targetFolderId, BigInt(fileSizeByte))

    this.logger.log(
      `Created resource ${resource.id} in class ${classId}, folderId: ${resource.folderId}, targetFolderId: ${targetFolderId}`,
    )

    // Convert BigInt to Number for JSON serialization
    return {
      ...resource,
      sizeByte: resource.sizeByte ? Number(resource.sizeByte) : null,
    }
  }

  /**
   * Delete resource and update folder size
   */
  async deleteResource(resourceId: number, userId: number): Promise<void> {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: { folder: { include: { class: true } } },
    })

    if (!resource) {
      throw new NotFoundException('Resource not found')
    }

    // Check permission
    if (resource.ownerId !== userId) {
      const permission = await this.prisma.folderPermission.findUnique({
        where: {
          folderId_userId: {
            folderId: resource.folderId!,
            userId,
          },
        },
      })

      if (!permission || permission.permission !== FolderPermissionType.EDIT) {
        throw new ForbiddenException('You do not have permission to delete this resource')
      }
    }

    // Delete file from S3 before deleting resource record
    if (resource.s3Key) {
      try {
        await this.s3Service.deleteObject(resource.s3Key)
        this.logger.log(`Deleted file from S3: ${resource.s3Key}`)
      } catch (error) {
        this.logger.warn(
          `Failed to delete file from S3 (${resource.s3Key}): ${error.message}, continuing with resource deletion`,
        )
        // Continue with resource deletion even if S3 delete fails
      }
    }

    // Delete resource
    await this.prisma.resource.delete({
      where: { id: resourceId },
    })

    // Update folder size recursively
    if (resource.sizeByte && resource.folderId) {
      await this.updateFolderSizeRecursive(resource.folderId, -BigInt(resource.sizeByte))
    }

    this.logger.log(`Deleted resource ${resourceId}`)
  }

  /**
   * Recursively update folder size (for nested folders)
   */
  private async updateFolderSizeRecursive(folderId: number | null, sizeChange: bigint): Promise<void> {
    if (!folderId) return

    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { id: true, parentId: true, classId: true },
    })

    if (!folder) return

    // Update current folder
    await this.prisma.folder.update({
      where: { id: folderId },
      data: {
        totalSizeByte: {
          increment: sizeChange,
        },
      },
    })

    // Update parent folder recursively
    if (folder.parentId) {
      await this.updateFolderSizeRecursive(folder.parentId, sizeChange)
    } else if (folder.classId) {
      // This is the root class folder - update is complete
      this.logger.log(`Updated folder ${folderId} size by ${sizeChange.toString()}`)
    }
  }

  /**
   * Update member permission (lecturer only)
   */
  async updateMemberPermission(
    classId: number,
    targetUserId: number,
    newPermission: FolderPermissionType,
    lecturerId: number,
  ): Promise<void> {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
    })

    if (!classData) {
      throw new NotFoundException('Class not found')
    }

    if (classData.lecturerId !== lecturerId) {
      throw new ForbiddenException('Only the class lecturer can update permissions')
    }

    const folder = await this.prisma.folder.findUnique({
      where: { classId },
    })

    if (!folder) {
      throw new NotFoundException('Class folder not found')
    }

    await this.prisma.folderPermission.update({
      where: {
        folderId_userId: {
          folderId: folder.id,
          userId: targetUserId,
        },
      },
      data: {
        permission: newPermission,
        grantedBy: lecturerId,
      },
    })

    this.logger.log(`Updated permission for user ${targetUserId} to ${newPermission}`)
  }

  /**
   * Get folder info with size
   */
  async getFolderInfo(classId: number) {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        folder: {
          include: {
            permissions: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            resources: {
              orderBy: { createdAt: 'desc' },
              include: {
                owner: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    })

    if (!classData?.folder) {
      return null
    }

    // Convert BigInt to Number for JSON serialization
    const folder = classData.folder
    const resources = folder.resources.map((resource) => ({
      ...resource,
      sizeByte: resource.sizeByte ? Number(resource.sizeByte) : null,
    }))

    return {
      id: folder.id,
      name: folder.name,
      ownerId: folder.ownerId,
      classId: folder.classId,
      permissions: folder.permissions,
      resources,
      totalSizeByte: Number(folder.totalSizeByte),
      sizeLimitBytes: this.FOLDER_SIZE_LIMIT_BYTES,
      sizeUsedBytes: Number(folder.totalSizeByte),
      sizeUsedFormatted: this.formatBytes(Number(folder.totalSizeByte)),
      sizeLimitFormatted: this.formatBytes(this.FOLDER_SIZE_LIMIT_BYTES),
      sizePercentage: (Number(folder.totalSizeByte) / this.FOLDER_SIZE_LIMIT_BYTES) * 100,
    }
  }

  /**
   * Get all folders accessible by user, grouped by class
   */
  async getUserFolders(userId: number) {
    // Get all folder permissions for the user
    const permissions = await this.prisma.folderPermission.findMany({
      where: {
        userId,
      },
      include: {
        folder: {
          include: {
            class: {
              include: {
                lecturer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    lecturerProfile: {
                      select: {
                        name: true,
                        avatar: true,
                      },
                    },
                  },
                },
                course: {
                  select: {
                    id: true,
                    title: true,
                    level: true,
                    thumbnailUrl: true,
                  },
                },
              },
            },
            resources: {
              orderBy: { createdAt: 'desc' },
              take: 5, // Get latest 5 resources
              include: {
                owner: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    })

    // Group by classId
    const foldersByClass = permissions.reduce(
      (acc, perm) => {
        if (!perm.folder.classId || !perm.folder.class) {
          return acc
        }

        const classId = perm.folder.classId
        if (!acc[classId]) {
          // Convert BigInt to Number for JSON serialization
          const latestResources = perm.folder.resources.map((resource) => ({
            ...resource,
            sizeByte: resource.sizeByte ? Number(resource.sizeByte) : null,
          }))

          acc[classId] = {
            classId,
            class: perm.folder.class,
            folder: {
              id: perm.folder.id,
              name: perm.folder.name,
              sizeUsedBytes: Number(perm.folder.totalSizeByte),
              sizeUsedFormatted: this.formatBytes(Number(perm.folder.totalSizeByte)),
              sizeLimitFormatted: this.formatBytes(this.FOLDER_SIZE_LIMIT_BYTES),
              sizePercentage: (Number(perm.folder.totalSizeByte) / this.FOLDER_SIZE_LIMIT_BYTES) * 100,
              resourceCount: 0, // Will be calculated below
              latestResources,
            },
            permission: perm.permission,
            grantedAt: perm.grantedAt,
          }
        }

        // Count total resources for this folder
        return acc
      },
      {} as Record<number, any>,
    )

    // Get total resource count for each folder
    for (const classId in foldersByClass) {
      const folderId = foldersByClass[classId].folder.id
      const resourceCount = await this.prisma.resource.count({
        where: { folderId },
      })
      foldersByClass[classId].folder.resourceCount = resourceCount
    }

    return Object.values(foldersByClass)
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }
}
