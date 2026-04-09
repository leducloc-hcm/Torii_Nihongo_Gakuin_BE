import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
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

  @Get("specialties")
  @Auth([AuthType.Bearer])
  @HttpCode(HttpStatus.OK)
  async getSpecialties() {
    return this.profileService.getSpecialties();
  }

  @Get("lecturers")
  @Auth([AuthType.Bearer])
  @UseGuards(RolesGuard)
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async getAllLecturerProfiles() {
    return this.profileService.getAllLecturerProfiles();
  }

  @Patch("lecturer/:userId/specialties")
  @Auth([AuthType.Bearer])
  @UseGuards(RolesGuard)
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async updateLecturerSpecialties(
    @Param("userId", ParseIntPipe) targetUserId: number,
    @Body() body: { specialtyIds: number[] },
  ) {
    return this.profileService.updateLecturerSpecialtiesByStaff(
      targetUserId,
      body.specialtyIds ?? [],
    );
  }

  @Post("specialties")
  @Auth([AuthType.Bearer])
  @UseGuards(RolesGuard)
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("image", imageUploadOptions))
  async createSpecialty(
    @Body() body: { name: string; description?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.profileService.createSpecialty(
      body.name,
      body.description,
      file,
    );
  }

  @Delete("specialties/:id")
  @Auth([AuthType.Bearer])
  @UseGuards(RolesGuard)
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async deleteSpecialty(@Param("id", ParseIntPipe) id: number) {
    return this.profileService.deleteSpecialty(id);
  }

  @Post("my-specialties")
  @Auth([AuthType.Bearer])
  @UseGuards(RolesGuard)
  @Roles(RoleName.Lecturer)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("image", imageUploadOptions))
  async createMySpecialty(
    @ActiveUser("userId") userId: number,
    @Body() body: { name: string; description?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.profileService.createOwnSpecialty(
      userId,
      body.name,
      body.description,
      file,
    );
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
