import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import {
  CustomerProfileType,
  GetAdminProfileType,
  GetLectureProfileType,
  GetStaffProfileType,
  UpdateAdminProfileType,
  UpdateCustomerProfileType,
  UpdateLectureProfileType,
  UpdateStaffProfileType,
} from "./profile.model";

@Injectable()
export class LectureProfileRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private mapLecturerProfile(profile: any): GetLectureProfileType {
    return {
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      avatar: profile.avatar,
      location: profile.location,
      website: profile.website,
      socialLinks: Array.isArray(profile.socialLinks)
        ? profile.socialLinks.map((link: any) =>
            typeof link === "string" ? JSON.parse(link) : link,
          )
        : null,
      phoneNumber: profile.phoneNumber,
      dateOfBirth: profile.dateOfBirth?.toISOString() || null,
      coverPhoto: profile.coverPhoto,
      specialties: profile.lecturerSpecialties
        ? profile.lecturerSpecialties.map((ls: any) => ({
            id: ls.specialty.id,
            name: ls.specialty.name,
          }))
        : null,
    };
  }

  async getLectureProfile(
    lecturerProfileId: number,
  ): Promise<GetLectureProfileType | null> {
    const profile = await this.prismaService.lecturerProfile.findFirst({
      where: {
        id: lecturerProfileId,
      },
      include: {
        lecturerSpecialties: {
          include: { specialty: true },
        },
      },
    });

    if (!profile || !profile.name) {
      return null;
    }

    return this.mapLecturerProfile(profile);
  }

  async updateLectureProfile(
    lecturerProfileId: number,
    data: Partial<Omit<UpdateLectureProfileType, "id">>,
  ): Promise<GetLectureProfileType | null> {
    const { socialLinks, dateOfBirth, specialtyIds, ...restData } = data;
    const updateData: any = {
      ...restData,
      ...(socialLinks !== null &&
        socialLinks !== undefined && {
          socialLinks: socialLinks.map((link) => JSON.stringify(link)),
        }),
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
    };

    await this.prismaService.lecturerProfile.update({
      where: { id: lecturerProfileId },
      data: updateData,
    });

    if (specialtyIds !== undefined) {
      await this.prismaService.lecturerSpecialty.deleteMany({
        where: { lecturerId: lecturerProfileId },
      });
      if (specialtyIds.length > 0) {
        await this.prismaService.lecturerSpecialty.createMany({
          data: specialtyIds.map((specialtyId) => ({
            lecturerId: lecturerProfileId,
            specialtyId,
          })),
        });
      }
    }

    return this.getLectureProfile(lecturerProfileId);
  }
  async createLectureProfile(userId: number, name: string) {
    const profile = await this.prismaService.lecturerProfile.create({
      data: {
        userId,
        name,
      },
    });

    return;
  }

  async findLectureProfileByUserIds(userId: number[]) {
    const profiles = await this.prismaService.lecturerProfile.findMany({
      where: {
        userId: { in: userId },
      },
      include: {
        lecturerSpecialties: {
          include: { specialty: true },
        },
      },
    });

    return profiles.map((p) => {
      const mapped = this.mapLecturerProfile(p);
      return {
        ...mapped,
        userId: p.userId,
        username: p.username,
      };
    });
  }
}

@Injectable()
export class StaffProfileRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getStaffProfile(
    staffProfileId: number,
  ): Promise<GetStaffProfileType | null> {
    const profile = await this.prismaService.staffProfile.findFirst({
      where: {
        id: staffProfileId,
      },
    });

    if (!profile || !profile.name) {
      return null;
    }

    return {
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      avatar: profile.avatar,
      location: profile.location,
      website: profile.website,
      phoneNumber: profile.phoneNumber,
      dateOfBirth: profile.dateOfBirth?.toISOString() || null,
      coverPhoto: profile.coverPhoto,
    };
  }

  async updateStaffProfile(
    staffProfileId: number,
    data: Partial<Omit<UpdateStaffProfileType, "id">>,
  ): Promise<GetStaffProfileType | null> {
    const { dateOfBirth, ...restData } = data;
    const updateData = {
      ...restData,
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
    };

    const updatedProfile = await this.prismaService.staffProfile.update({
      where: { id: staffProfileId },
      data: updateData,
    });

    if (!updatedProfile || !updatedProfile.name) {
      return null;
    }

    return {
      id: updatedProfile.id,
      name: updatedProfile.name,
      bio: updatedProfile.bio,
      avatar: updatedProfile.avatar,
      location: updatedProfile.location,
      website: updatedProfile.website,
      phoneNumber: updatedProfile.phoneNumber,
      dateOfBirth: updatedProfile.dateOfBirth?.toISOString() || null,
      coverPhoto: updatedProfile.coverPhoto,
    };
  }
  async createStaffProfile(userId: number, name: string) {
    const profile = await this.prismaService.staffProfile.create({
      data: {
        userId,
        name,
      },
    });
    return {
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      avatar: profile.avatar,
      location: profile.location,
      website: profile.website,
      phoneNumber: profile.phoneNumber,
      dateOfBirth: profile.dateOfBirth?.toISOString() || null,
      coverPhoto: profile.coverPhoto,
    };
  }
}

@Injectable()
export class CustomerProfileRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getCustomerProfile(
    customerProfileId: number,
  ): Promise<CustomerProfileType | null> {
    const profile = await this.prismaService.customerProfile.findFirst({
      where: {
        id: customerProfileId,
      },
    });

    if (!profile || !profile.name) {
      return null;
    }

    return {
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      avatar: profile.avatar,
      location: profile.location,
      website: profile.website,
      phoneNumber: profile.phoneNumber,
      dateOfBirth: profile.dateOfBirth?.toISOString() || null,
      coverPhoto: profile.coverPhoto,
    };
  }

  async updateCustomerProfile(
    customerProfileId: number,
    data: Partial<Omit<UpdateCustomerProfileType, "id">>,
  ): Promise<CustomerProfileType | null> {
    const { dateOfBirth, ...restData } = data;
    const updateData = {
      ...restData,
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
    };

    const updatedProfile = await this.prismaService.customerProfile.update({
      where: { id: customerProfileId },
      data: updateData,
    });

    if (!updatedProfile || !updatedProfile.name) {
      return null;
    }

    return {
      id: updatedProfile.id,
      name: updatedProfile.name,
      bio: updatedProfile.bio,
      avatar: updatedProfile.avatar,
      location: updatedProfile.location,
      website: updatedProfile.website,
      phoneNumber: updatedProfile.phoneNumber,
      dateOfBirth: updatedProfile.dateOfBirth?.toISOString() || null,
      coverPhoto: updatedProfile.coverPhoto,
    };
  }
  async createCustomerProfile(userId: number, name: string) {
    const profile = await this.prismaService.customerProfile.create({
      data: {
        userId,
        name,
      },
    });

    return;
  }
}

@Injectable()
export class AdminProfileRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getAdminProfile(
    adminProfileId: number,
  ): Promise<GetAdminProfileType | null> {
    const profile = await this.prismaService.adminProfile.findFirst({
      where: {
        id: adminProfileId,
      },
    });

    if (!profile || !profile.name) {
      return null;
    }

    return {
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      avatar: profile.avatar,
      location: profile.location,
      website: profile.website,
      phoneNumber: profile.phoneNumber,
      dateOfBirth: profile.dateOfBirth?.toISOString() || null,
      coverPhoto: profile.coverPhoto,
    };
  }

  async updateAdminProfile(
    adminProfileId: number,
    data: Partial<Omit<UpdateAdminProfileType, "id">>,
  ): Promise<GetAdminProfileType | null> {
    const { dateOfBirth, ...restData } = data;
    const updateData = {
      ...restData,
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
    };

    const updatedProfile = await this.prismaService.adminProfile.update({
      where: { id: adminProfileId },
      data: updateData,
    });

    if (!updatedProfile || !updatedProfile.name) {
      return null;
    }

    return {
      id: updatedProfile.id,
      name: updatedProfile.name,
      bio: updatedProfile.bio,
      avatar: updatedProfile.avatar,
      location: updatedProfile.location,
      website: updatedProfile.website,
      phoneNumber: updatedProfile.phoneNumber,
      dateOfBirth: updatedProfile.dateOfBirth?.toISOString() || null,
      coverPhoto: updatedProfile.coverPhoto,
    };
  }
  async createAdminProfile(userId: number, name: string) {
    const profile = await this.prismaService.adminProfile.create({
      data: {
        userId,
        name,
      },
    });

    return {
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      avatar: profile.avatar,
      location: profile.location,
      website: profile.website,
      phoneNumber: profile.phoneNumber,
      dateOfBirth: profile.dateOfBirth?.toISOString() || null,
      coverPhoto: profile.coverPhoto,
    };
  }
}
