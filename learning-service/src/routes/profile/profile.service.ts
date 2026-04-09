import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  LectureProfileRepository,
  StaffProfileRepository,
  CustomerProfileRepository,
  AdminProfileRepository,
} from "./profile.repo";
import { SharedUserRepository } from "src/shared/repositories/shared-user.repo";
import { PrismaService } from "src/shared/services/prisma.service";
import {
  UpdateLectureProfileType,
  UpdateStaffProfileType,
  UpdateCustomerProfileType,
  GetLectureProfileType,
  GetStaffProfileType,
  CustomerProfileType,
  AdminProfileType,
  UpdateAdminProfileType,
} from "./profile.model";
import { RoleName } from "src/shared/constants/role.constant";
import { S3Service } from "src/shared/services/s3.service";

@Injectable()
export class ProfileService {
  constructor(
    private readonly lectureProfileRepo: LectureProfileRepository,
    private readonly staffProfileRepo: StaffProfileRepository,
    private readonly customerProfileRepo: CustomerProfileRepository,
    private readonly adminProfileRepo: AdminProfileRepository,
    private readonly sharedUserRepo: SharedUserRepository,
    private readonly prismaService: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async getProfile(
    userId: number,
  ): Promise<
    | GetLectureProfileType
    | GetStaffProfileType
    | CustomerProfileType
    | AdminProfileType
  > {
    const user = await this.sharedUserRepo.findUnique({ id: userId });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    switch (user.role) {
      case RoleName.Lecturer: {
        const lecturerProfile =
          await this.prismaService.lecturerProfile.findUnique({
            where: { userId },
          });
        if (!lecturerProfile) {
          throw new NotFoundException("Lecturer profile not found");
        }
        const profile = await this.lectureProfileRepo.getLectureProfile(
          lecturerProfile.id,
        );
        if (!profile) {
          throw new NotFoundException("Lecturer profile not found");
        }
        return profile;
      }

      case RoleName.Staff: {
        const staffProfile = await this.prismaService.staffProfile.findUnique({
          where: { userId },
        });
        if (!staffProfile) {
          throw new NotFoundException("Staff profile not found");
        }
        const profile = await this.staffProfileRepo.getStaffProfile(
          staffProfile.id,
        );
        if (!profile) {
          throw new NotFoundException("Staff profile not found");
        }
        return profile;
      }

      case RoleName.Customer: {
        const customerProfile =
          await this.prismaService.customerProfile.findUnique({
            where: { userId },
          });
        if (!customerProfile) {
          throw new NotFoundException("Customer profile not found");
        }
        const profile = await this.customerProfileRepo.getCustomerProfile(
          customerProfile.id,
        );
        if (!profile) {
          throw new NotFoundException("Customer profile not found");
        }
        return profile;
      }
      case RoleName.Admin: {
        const adminProfile = await this.prismaService.adminProfile.findUnique({
          where: { userId },
        });
        if (!adminProfile) {
          throw new NotFoundException("Admin profile not found");
        }
        const profile = await this.adminProfileRepo.getAdminProfile(
          adminProfile.id,
        );
        if (!profile) {
          throw new NotFoundException("Admin profile not found");
        }
        return profile;
      }

      default:
        throw new BadRequestException("Invalid user role");
    }
  }

  async updateProfile(
    userId: number,
    data: Partial<
      | UpdateLectureProfileType
      | UpdateStaffProfileType
      | UpdateCustomerProfileType
      | UpdateAdminProfileType
    >,
    files?: {
      avatar?: Express.Multer.File[];
      coverPhoto?: Express.Multer.File[];
    },
  ): Promise<
    | GetLectureProfileType
    | GetStaffProfileType
    | CustomerProfileType
    | AdminProfileType
  > {
    const user = await this.sharedUserRepo.findUnique({ id: userId });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    let avatarUrl = (data as any).avatar;
    let coverPhotoUrl = (data as any).coverPhoto;

    if (files?.avatar?.[0]) {
      avatarUrl = (await this.s3Service.uploadFileToS3(files.avatar[0])).url;
    }

    if (files?.coverPhoto?.[0]) {
      coverPhotoUrl = (await this.s3Service.uploadFileToS3(files.coverPhoto[0]))
        .url;
    }

    const updatedData = {
      ...data,
      ...(avatarUrl && { avatar: avatarUrl }),
      ...(coverPhotoUrl && { coverPhoto: coverPhotoUrl }),
    };

    switch (user.role) {
      case RoleName.Lecturer: {
        const lecturerProfile =
          await this.prismaService.lecturerProfile.findUnique({
            where: { userId },
          });
        if (!lecturerProfile) {
          throw new NotFoundException("Lecturer profile not found");
        }
        const updatedLecturerProfile =
          await this.lectureProfileRepo.updateLectureProfile(
            lecturerProfile.id,
            updatedData as Partial<UpdateLectureProfileType>,
          );
        if (!updatedLecturerProfile) {
          throw new NotFoundException("Failed to update lecturer profile");
        }
        return updatedLecturerProfile;
      }

      case RoleName.Staff: {
        const staffProfile = await this.prismaService.staffProfile.findUnique({
          where: { userId },
        });
        if (!staffProfile) {
          throw new NotFoundException("Staff profile not found");
        }
        const updatedStaffProfile =
          await this.staffProfileRepo.updateStaffProfile(
            staffProfile.id,
            updatedData as Partial<UpdateStaffProfileType>,
          );
        if (!updatedStaffProfile) {
          throw new NotFoundException("Failed to update staff profile");
        }
        return updatedStaffProfile;
      }

      case RoleName.Customer: {
        const customerProfile =
          await this.prismaService.customerProfile.findUnique({
            where: { userId },
          });
        if (!customerProfile) {
          throw new NotFoundException("Customer profile not found");
        }
        const updatedCustomerProfile =
          await this.customerProfileRepo.updateCustomerProfile(
            customerProfile.id,
            updatedData as Partial<UpdateCustomerProfileType>,
          );
        if (!updatedCustomerProfile) {
          throw new NotFoundException("Failed to update customer profile");
        }
        return updatedCustomerProfile;
      }
      case RoleName.Admin: {
        const adminProfile = await this.prismaService.adminProfile.findUnique({
          where: { userId },
        });
        if (!adminProfile) {
          throw new NotFoundException("Admin profile not found");
        }
        const updatedAdminProfile =
          await this.adminProfileRepo.updateAdminProfile(
            adminProfile.id,
            updatedData as Partial<UpdateAdminProfileType>,
          );
        if (!updatedAdminProfile) {
          throw new NotFoundException("Failed to update admin profile");
        }
        return updatedAdminProfile;
      }

      default:
        throw new BadRequestException("Invalid user role");
    }
  }
  async getSpecialties() {
    return this.prismaService.specialty.findMany({
      select: { id: true, name: true, description: true, url: true },
      orderBy: { name: "asc" },
    });
  }

  async getAllLecturerProfiles() {
    const lecturerProfiles = await this.prismaService.lecturerProfile.findMany({
      include: {
        lecturerSpecialties: {
          include: { specialty: true },
        },
        user: {
          select: { id: true, email: true, status: true },
        },
      },
    });
    return lecturerProfiles.map((p) => ({
      userId: p.userId,
      profileId: p.id,
      name: p.name,
      avatar: p.avatar,
      email: p.user?.email ?? null,
      status: p.user?.status ?? null,
      specialties: p.lecturerSpecialties.map((ls) => ({
        id: ls.specialty.id,
        name: ls.specialty.name,
      })),
    }));
  }

  async createSpecialty(
    name: string,
    description: string | undefined,
    file?: Express.Multer.File,
  ) {
    let url: string | undefined;
    if (file) {
      const uploaded = await this.s3Service.uploadFileToS3(file, "specialties");
      url = uploaded.url;
    }
    return this.prismaService.specialty.create({
      data: { name, description, url },
      select: { id: true, name: true, description: true, url: true },
    });
  }

  async deleteSpecialty(id: number) {
    const specialty = await this.prismaService.specialty.findUnique({
      where: { id },
    });
    if (!specialty) {
      throw new NotFoundException("Specialty not found");
    }
    await this.prismaService.specialty.delete({ where: { id } });
    return { message: "Specialty deleted successfully" };
  }

  async createOwnSpecialty(
    userId: number,
    name: string,
    description: string | undefined,
    file?: Express.Multer.File,
  ) {
    const lecturerProfile = await this.prismaService.lecturerProfile.findUnique(
      { where: { userId } },
    );
    if (!lecturerProfile) {
      throw new NotFoundException("Lecturer profile not found");
    }
    let url: string | undefined;
    if (file) {
      const uploaded = await this.s3Service.uploadFileToS3(file, "specialties");
      url = uploaded.url;
    }
    const specialty = await this.prismaService.specialty.create({
      data: { name, description, url },
      select: { id: true, name: true, description: true, url: true },
    });
    await this.prismaService.lecturerSpecialty.create({
      data: { lecturerId: lecturerProfile.id, specialtyId: specialty.id },
    });
    return specialty;
  }

  async deleteOwnSpecialty(userId: number, specialtyId: number) {
    const lecturerProfile = await this.prismaService.lecturerProfile.findUnique(
      { where: { userId } },
    );
    if (!lecturerProfile) {
      throw new NotFoundException("Lecturer profile not found");
    }
    const link = await this.prismaService.lecturerSpecialty.findUnique({
      where: {
        lecturerId_specialtyId: {
          lecturerId: lecturerProfile.id,
          specialtyId,
        },
      },
    });
    if (!link) {
      throw new NotFoundException("Specialty not found on your profile");
    }
    await this.prismaService.lecturerSpecialty.delete({
      where: {
        lecturerId_specialtyId: {
          lecturerId: lecturerProfile.id,
          specialtyId,
        },
      },
    });
    await this.prismaService.specialty.delete({ where: { id: specialtyId } });
    return { message: "Specialty deleted successfully" };
  }

  async updateLecturerSpecialtiesByStaff(
    targetUserId: number,
    specialtyIds: number[],
  ) {
    const lecturerProfile = await this.prismaService.lecturerProfile.findUnique(
      {
        where: { userId: targetUserId },
      },
    );
    if (!lecturerProfile) {
      throw new NotFoundException("Lecturer profile not found");
    }
    await this.prismaService.lecturerSpecialty.deleteMany({
      where: { lecturerId: lecturerProfile.id },
    });
    if (specialtyIds.length > 0) {
      await this.prismaService.lecturerSpecialty.createMany({
        data: specialtyIds.map((specialtyId) => ({
          lecturerId: lecturerProfile.id,
          specialtyId,
        })),
      });
    }
    return this.lectureProfileRepo.getLectureProfile(lecturerProfile.id);
  }

  async createProfile(data: { email: string; name: string; role: string }) {
    const user = await this.sharedUserRepo.findUnique({ email: data.email });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    switch (data.role.toUpperCase()) {
      case RoleName.Lecturer: {
        const existingProfile =
          await this.prismaService.lecturerProfile.findUnique({
            where: { userId: user.id },
          });
        if (existingProfile) {
          throw new BadRequestException("Lecturer profile already exists");
        }
        return this.lectureProfileRepo.createLectureProfile(user.id, data.name);
      }

      case RoleName.Staff: {
        const existingProfile =
          await this.prismaService.staffProfile.findUnique({
            where: { userId: user.id },
          });
        if (existingProfile) {
          throw new BadRequestException("Staff profile already exists");
        }
        return this.staffProfileRepo.createStaffProfile(user.id, data.name);
      }

      case RoleName.Customer: {
        const existingProfile =
          await this.prismaService.customerProfile.findUnique({
            where: { userId: user.id },
          });
        if (existingProfile) {
          throw new BadRequestException("Customer profile already exists");
        }
        return this.customerProfileRepo.createCustomerProfile(
          user.id,
          data.name,
        );
      }

      default:
        throw new BadRequestException("Invalid user role");
    }
  }
}
