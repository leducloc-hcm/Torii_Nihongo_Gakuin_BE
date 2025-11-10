import { Controller, Get, Patch, Body, HttpCode, HttpStatus, UseInterceptors, UploadedFiles } from '@nestjs/common'
import { ProfileService } from './profile.service'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { UpdateLectureProfileDTO, UpdateStaffProfileDTO, UpdateCustomerProfileDTO } from './profile.dto'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { imageUploadOptions } from 'src/shared/config/upload.config'

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getProfile(@ActiveUser('userId') userId: number) {
    return this.profileService.getProfile(userId)
  }

  @Patch()
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'coverPhoto', maxCount: 1 },
      ],
      imageUploadOptions,
    ),
  )
  async updateProfile(
    @ActiveUser('userId') userId: number,
    @Body() updateData: UpdateLectureProfileDTO | UpdateStaffProfileDTO | UpdateCustomerProfileDTO,
    @UploadedFiles() files?: { avatar?: Express.Multer.File[]; coverPhoto?: Express.Multer.File[] },
  ) {
    return this.profileService.updateProfile(userId, updateData, files)
  }
}
