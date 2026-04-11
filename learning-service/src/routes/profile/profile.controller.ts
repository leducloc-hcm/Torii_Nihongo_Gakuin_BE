import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from "@nestjs/platform-express";
import { Auth } from "src/shared/decorators/auth.decorator";
import { AuthType } from "src/shared/constants/auth.constant";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import {
  UpdateLectureProfileDTO,
  UpdateStaffProfileDTO,
  UpdateCustomerProfileDTO,
} from "./profile.dto";
import { ProfileService } from "./profile.service";
import { imageUploadOptions } from "src/shared/config/upload.config";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { Roles } from "src/shared/decorators/roles.decorator";
import { RoleName } from "src/shared/constants/role.constant";

@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getProfile(@ActiveUser("userId") userId: number) {
    return this.profileService.getProfile(userId);
  }

  @Get("lecturers")
  @Auth([AuthType.Bearer])
  @UseGuards(RolesGuard)
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async getAllLecturerProfiles() {
    return this.profileService.getAllLecturerProfiles();
  }

  @Post("lecturer/:userId/specialties")
  @Auth([AuthType.Bearer])
  @UseGuards(RolesGuard)
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("image", imageUploadOptions))
  async addLecturerSpecialty(
    @Param("userId", ParseIntPipe) targetUserId: number,
    @Body() body: Record<string, string | string[] | undefined>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.profileService.addLecturerSpecialtyByStaff(
      targetUserId,
      body,
      file,
    );
  }

  @Put("lecturer/:userId/specialties/:specialtyId")
  @Auth([AuthType.Bearer])
  @UseGuards(RolesGuard)
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("image", imageUploadOptions))
  async updateLecturerSpecialty(
    @Param("userId", ParseIntPipe) targetUserId: number,
    @Param("specialtyId", ParseIntPipe) specialtyId: number,
    @Body() body: Record<string, string | string[] | undefined>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.profileService.updateLecturerSpecialtyByStaff(
      targetUserId,
      specialtyId,
      body,
      file,
    );
  }

  @Delete("lecturer/:userId/specialties/:specialtyId")
  @Auth([AuthType.Bearer])
  @UseGuards(RolesGuard)
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async deleteLecturerSpecialty(
    @Param("userId", ParseIntPipe) targetUserId: number,
    @Param("specialtyId", ParseIntPipe) specialtyId: number,
  ) {
    return this.profileService.deleteLecturerSpecialtyByStaff(
      targetUserId,
      specialtyId,
    );
  }

  @Post("my-specialties")
  @Auth([AuthType.Bearer])
  @UseGuards(RolesGuard)
  @Roles(RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("image", imageUploadOptions))
  async createMySpecialty(
    @ActiveUser("userId") userId: number,
    @Body() body: Record<string, string | string[] | undefined>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.profileService.createOwnSpecialty(userId, body, file);
  }

  @Delete("my-specialties/:specialtyId")
  @Auth([AuthType.Bearer])
  @UseGuards(RolesGuard)
  @Roles(RoleName.Lecturer)
  @HttpCode(HttpStatus.OK)
  async deleteMySpecialty(
    @ActiveUser("userId") userId: number,
    @Param("specialtyId", ParseIntPipe) specialtyId: number,
  ) {
    return this.profileService.deleteOwnSpecialty(userId, specialtyId);
  }

  @Patch()
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "avatar", maxCount: 1 },
        { name: "coverPhoto", maxCount: 1 },
      ],
      imageUploadOptions,
    ),
  )
  async updateProfile(
    @ActiveUser("userId") userId: number,
    @Body()
    updateData:
      | UpdateLectureProfileDTO
      | UpdateStaffProfileDTO
      | UpdateCustomerProfileDTO,
    @UploadedFiles()
    files?: {
      avatar?: Express.Multer.File[];
      coverPhoto?: Express.Multer.File[];
    },
  ) {
    return this.profileService.updateProfile(userId, updateData, files);
  }
}
