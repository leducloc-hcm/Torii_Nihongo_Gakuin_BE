import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { GetLectureProfileType, UpdateLectureProfileType } from './profile.model'

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
    const { socialLinks, ...restData } = data
    const updateData = {
      ...restData,
      ...(socialLinks !== null && socialLinks !== undefined && { socialLinks }),
    }

    const updatedProfile = await this.prismaService.lecturerProfile.upsert({
      where: { id: lecturerProfileId },
      update: updateData,
    })

    if (!updatedProfile) {
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
export class StaffProfileRepository {}
