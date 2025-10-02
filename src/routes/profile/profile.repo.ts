import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CustomerProfileType,
  GetLectureProfileType,
  GetStaffProfileType,
  UpdateCustomerProfileType,
  UpdateLectureProfileType,
  UpdateStaffProfileType,
} from './profile.model'

@Injectable()
export class LectureProfileRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getLectureProfile(lecturerProfileId: number): Promise<GetLectureProfileType | null> {
    const profile = await this.prismaService.lecturerProfile.findFirst({
      where: {
        id: lecturerProfileId,
      },
    })

    if (!profile || !profile.name) {
      return null
    }

    return {
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      avatar: profile.avatar,
      location: profile.location,
      website: profile.website,
      socialLinks: Array.isArray(profile.socialLinks)
        ? profile.socialLinks.map((link) => (typeof link === 'string' ? JSON.parse(link) : link))
        : null,
      phoneNumber: profile.phoneNumber,
      dateOfBirth: profile.dateOfBirth?.toISOString() || null,
      coverPhoto: profile.coverPhoto,
    }
  }

  async updateLectureProfile(
    lecturerProfileId: number,
    data: Partial<Omit<UpdateLectureProfileType, 'id'>>,
  ): Promise<GetLectureProfileType | null> {
    const { socialLinks, dateOfBirth, ...restData } = data
    const updateData: any = {
      ...restData,
      ...(socialLinks !== null &&
        socialLinks !== undefined && {
          socialLinks: socialLinks.map((link) => JSON.stringify(link)),
        }),
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
    }

    const updatedProfile = await this.prismaService.lecturerProfile.update({
      where: { id: lecturerProfileId },
      data: updateData,
    })

    if (!updatedProfile || !updatedProfile.name) {
      return null
    }

    return {
      id: updatedProfile.id,
      name: updatedProfile.name,
      bio: updatedProfile.bio,
      avatar: updatedProfile.avatar,
      location: updatedProfile.location,
      website: updatedProfile.website,
      socialLinks: Array.isArray(updatedProfile.socialLinks)
        ? updatedProfile.socialLinks.map((link) => (typeof link === 'string' ? JSON.parse(link) : link))
        : null,
      phoneNumber: updatedProfile.phoneNumber,
      dateOfBirth: updatedProfile.dateOfBirth?.toISOString() || null,
      coverPhoto: updatedProfile.coverPhoto,
    }
  }
}

@Injectable()
export class StaffProfileRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getStaffProfile(staffProfileId: number): Promise<GetStaffProfileType | null> {
    const profile = await this.prismaService.staffProfile.findFirst({
      where: {
        id: staffProfileId,
      },
    })

    if (!profile || !profile.name) {
      return null
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
    }
  }

  async updateStaffProfile(
    staffProfileId: number,
    data: Partial<Omit<UpdateStaffProfileType, 'id'>>,
  ): Promise<GetStaffProfileType | null> {
    const { dateOfBirth, ...restData } = data
    const updateData = {
      ...restData,
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
    }

    const updatedProfile = await this.prismaService.staffProfile.update({
      where: { id: staffProfileId },
      data: updateData,
    })

    if (!updatedProfile || !updatedProfile.name) {
      return null
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
    }
  }
}

@Injectable()
export class CustomerProfileRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getCustomerProfile(customerProfileId: number): Promise<CustomerProfileType | null> {
    const profile = await this.prismaService.customerProfile.findFirst({
      where: {
        id: customerProfileId,
      },
    })

    if (!profile || !profile.name) {
      return null
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
    }
  }

  async updateCustomerProfile(
    customerProfileId: number,
    data: Partial<Omit<UpdateCustomerProfileType, 'id'>>,
  ): Promise<CustomerProfileType | null> {
    const { dateOfBirth, ...restData } = data
    const updateData = {
      ...restData,
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
    }

    const updatedProfile = await this.prismaService.customerProfile.update({
      where: { id: customerProfileId },
      data: updateData,
    })

    if (!updatedProfile || !updatedProfile.name) {
      return null
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
    }
  }
}
