import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { LectureProfileRepository, StaffProfileRepository, CustomerProfileRepository } from './profile.repo'
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  UpdateLectureProfileType,
  UpdateStaffProfileType,
  UpdateCustomerProfileType,
  GetLectureProfileType,
  GetStaffProfileType,
  CustomerProfileType,
} from './profile.model'
import { RoleName } from 'src/shared/constants/role.constant'

@Injectable()
export class ProfileService {
  constructor(
    private readonly lectureProfileRepo: LectureProfileRepository,
    private readonly staffProfileRepo: StaffProfileRepository,
    private readonly customerProfileRepo: CustomerProfileRepository,
    private readonly sharedUserRepo: SharedUserRepository,
    private readonly prismaService: PrismaService,
  ) {}

  async getProfile(userId: number): Promise<GetLectureProfileType | GetStaffProfileType | CustomerProfileType> {
    const user = await this.sharedUserRepo.findUnique({ id: userId })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    switch (user.role) {
      case RoleName.Lecturer: {
        const lecturerProfile = await this.prismaService.lecturerProfile.findUnique({
          where: { userId },
        })
        if (!lecturerProfile) {
          throw new NotFoundException('Lecturer profile not found')
        }
        const profile = await this.lectureProfileRepo.getLectureProfile(lecturerProfile.id)
        if (!profile) {
          throw new NotFoundException('Lecturer profile not found')
        }
        return profile
      }

      case RoleName.Staff: {
        const staffProfile = await this.prismaService.staffProfile.findUnique({
          where: { userId },
        })
        if (!staffProfile) {
          throw new NotFoundException('Staff profile not found')
        }
        const profile = await this.staffProfileRepo.getStaffProfile(staffProfile.id)
        if (!profile) {
          throw new NotFoundException('Staff profile not found')
        }
        return profile
      }

      case RoleName.Customer: {
        const customerProfile = await this.prismaService.customerProfile.findUnique({
          where: { userId },
        })
        if (!customerProfile) {
          throw new NotFoundException('Customer profile not found')
        }
        const profile = await this.customerProfileRepo.getCustomerProfile(customerProfile.id)
        if (!profile) {
          throw new NotFoundException('Customer profile not found')
        }
        return profile
      }

      default:
        throw new BadRequestException('Invalid user role')
    }
  }

  async updateProfile(
    userId: number,
    data: Partial<UpdateLectureProfileType | UpdateStaffProfileType | UpdateCustomerProfileType>,
  ): Promise<GetLectureProfileType | GetStaffProfileType | CustomerProfileType> {
    const user = await this.sharedUserRepo.findUnique({ id: userId })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    switch (user.role) {
      case RoleName.Lecturer: {
        const lecturerProfile = await this.prismaService.lecturerProfile.findUnique({
          where: { userId },
        })
        if (!lecturerProfile) {
          throw new NotFoundException('Lecturer profile not found')
        }
        const updatedLecturerProfile = await this.lectureProfileRepo.updateLectureProfile(
          lecturerProfile.id,
          data as Partial<UpdateLectureProfileType>,
        )
        if (!updatedLecturerProfile) {
          throw new NotFoundException('Failed to update lecturer profile')
        }
        return updatedLecturerProfile
      }

      case RoleName.Staff: {
        const staffProfile = await this.prismaService.staffProfile.findUnique({
          where: { userId },
        })
        if (!staffProfile) {
          throw new NotFoundException('Staff profile not found')
        }
        const updatedStaffProfile = await this.staffProfileRepo.updateStaffProfile(
          staffProfile.id,
          data as Partial<UpdateStaffProfileType>,
        )
        if (!updatedStaffProfile) {
          throw new NotFoundException('Failed to update staff profile')
        }
        return updatedStaffProfile
      }

      case RoleName.Customer: {
        const customerProfile = await this.prismaService.customerProfile.findUnique({
          where: { userId },
        })
        if (!customerProfile) {
          throw new NotFoundException('Customer profile not found')
        }
        const updatedCustomerProfile = await this.customerProfileRepo.updateCustomerProfile(
          customerProfile.id,
          data as Partial<UpdateCustomerProfileType>,
        )
        if (!updatedCustomerProfile) {
          throw new NotFoundException('Failed to update customer profile')
        }
        return updatedCustomerProfile
      }

      default:
        throw new BadRequestException('Invalid user role')
    }
  }
}
