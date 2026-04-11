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
import {
  normalizeMultipartBody,
  parseOptionalDate,
  parseSkills,
} from "./specialty-form";

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
  private specialtySelect() {
    return {
      id: true,
      name: true,
      issuingOrganization: true,
      issueDate: true,
      expirationDate: true,
      credentialId: true,
      credentialUrl: true,
      logoUrl: true,
      description: true,
      skills: true,
    } as const;
  }

  private mapSpecialtyRow(s: {
    id: number;
    name: string;
    issuingOrganization: string | null;
    issueDate: Date | null;
    expirationDate: Date | null;
    credentialId: string | null;
    credentialUrl: string | null;
    logoUrl: string | null;
    description: string | null;
    skills: string[];
  }) {
    return {
      id: s.id,
      name: s.name,
      issuingOrganization: s.issuingOrganization,
      issueDate: s.issueDate?.toISOString() ?? null,
      expirationDate: s.expirationDate?.toISOString() ?? null,
      credentialId: s.credentialId,
      credentialUrl: s.credentialUrl,
      logoUrl: s.logoUrl,
      description: s.description,
      skills: s.skills ?? [],
    };
  }

  private emptyToNull(v: string | undefined): string | null {
    const t = v?.trim();
    return t ? t : null;
  }

  private async buildCreateSpecialtyData(
    body: Record<string, string | string[] | undefined>,
    lecturerProfileId: number,
    file?: Express.Multer.File,
  ) {
    const b = normalizeMultipartBody(body);
    const name = b.name?.trim();
    if (!name) {
      throw new BadRequestException("Name is required");
    }
    let logoUrl: string | undefined;
    if (file) {
      logoUrl = (await this.s3Service.uploadFileToS3(file, "specialties")).url;
    }
    return {
      name,
      issuingOrganization: this.emptyToNull(b.issuingOrganization),
      issueDate: parseOptionalDate(b.issueDate) ?? null,
      expirationDate: parseOptionalDate(b.expirationDate) ?? null,
      credentialId: this.emptyToNull(b.credentialId),
      credentialUrl: this.emptyToNull(b.credentialUrl),
      description: this.emptyToNull(b.description),
      skills: parseSkills(b.skills),
      lecturerId: lecturerProfileId,
      ...(logoUrl !== undefined ? { logoUrl } : {}),
    };
  }

  async getAllLecturerProfiles() {
    const lecturerProfiles = await this.prismaService.lecturerProfile.findMany({
      include: {
        specialties: { orderBy: { createdAt: "desc" } },
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
      specialties: p.specialties.map((s) => this.mapSpecialtyRow(s)),
    }));
  }

  async addLecturerSpecialtyByStaff(
    targetUserId: number,
    body: Record<string, string | string[] | undefined>,
    file?: Express.Multer.File,
  ) {
    const lecturerProfile = await this.prismaService.lecturerProfile.findUnique({
      where: { userId: targetUserId },
    });
    if (!lecturerProfile) {
      throw new NotFoundException("Lecturer profile not found");
    }
    const data = await this.buildCreateSpecialtyData(
      body,
      lecturerProfile.id,
      file,
    );
    const created = await this.prismaService.specialty.create({
      data,
      select: this.specialtySelect(),
    });
    return this.mapSpecialtyRow(created);
  }

  async updateLecturerSpecialtyByStaff(
    targetUserId: number,
    specialtyId: number,
    body: Record<string, string | string[] | undefined>,
    file?: Express.Multer.File,
  ) {
    const lecturerProfile = await this.prismaService.lecturerProfile.findUnique({
      where: { userId: targetUserId },
    });
    if (!lecturerProfile) {
      throw new NotFoundException("Lecturer profile not found");
    }
    const existing = await this.prismaService.specialty.findFirst({
      where: { id: specialtyId, lecturerId: lecturerProfile.id },
    });
    if (!existing) {
      throw new NotFoundException("Specialty not found for this lecturer");
    }
    const b = normalizeMultipartBody(body);
    const name = b.name?.trim();
    if (!name) {
      throw new BadRequestException("Name is required");
    }
    let logoUrl = existing.logoUrl;
    if (file) {
      logoUrl = (await this.s3Service.uploadFileToS3(file, "specialties")).url;
    }
    const updated = await this.prismaService.specialty.update({
      where: { id: specialtyId },
      data: {
        name,
        issuingOrganization: this.emptyToNull(b.issuingOrganization),
        issueDate: parseOptionalDate(b.issueDate) ?? null,
        expirationDate: parseOptionalDate(b.expirationDate) ?? null,
        credentialId: this.emptyToNull(b.credentialId),
        credentialUrl: this.emptyToNull(b.credentialUrl),
        description: this.emptyToNull(b.description),
        skills: parseSkills(b.skills),
        logoUrl,
      },
      select: this.specialtySelect(),
    });
    return this.mapSpecialtyRow(updated);
  }

  async deleteLecturerSpecialtyByStaff(targetUserId: number, specialtyId: number) {
    const lecturerProfile = await this.prismaService.lecturerProfile.findUnique({
      where: { userId: targetUserId },
    });
    if (!lecturerProfile) {
      throw new NotFoundException("Lecturer profile not found");
    }
    const existing = await this.prismaService.specialty.findFirst({
      where: { id: specialtyId, lecturerId: lecturerProfile.id },
    });
    if (!existing) {
      throw new NotFoundException("Specialty not found for this lecturer");
    }
    await this.prismaService.specialty.delete({ where: { id: specialtyId } });
    return { message: "Specialty deleted successfully" };
  }

  async createOwnSpecialty(
    userId: number,
    body: Record<string, string | string[] | undefined>,
    file?: Express.Multer.File,
  ) {
    const lecturerProfile = await this.prismaService.lecturerProfile.findUnique({
      where: { userId },
    });
    if (!lecturerProfile) {
      throw new NotFoundException("Lecturer profile not found");
    }
    const data = await this.buildCreateSpecialtyData(
      body,
      lecturerProfile.id,
      file,
    );
    const created = await this.prismaService.specialty.create({
      data,
      select: this.specialtySelect(),
    });
    return this.mapSpecialtyRow(created);
  }

  async deleteOwnSpecialty(userId: number, specialtyId: number) {
    const lecturerProfile = await this.prismaService.lecturerProfile.findUnique({
      where: { userId },
    });
    if (!lecturerProfile) {
      throw new NotFoundException("Lecturer profile not found");
    }
    const existing = await this.prismaService.specialty.findFirst({
      where: { id: specialtyId, lecturerId: lecturerProfile.id },
    });
    if (!existing) {
      throw new NotFoundException("Specialty not found on your profile");
    }
    await this.prismaService.specialty.delete({ where: { id: specialtyId } });
    return { message: "Specialty deleted successfully" };
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
