import { createZodDto } from 'nestjs-zod'
import {
  CustomerProfileSchema,
  LectureProfileSchema,
  StaffProfileSchema,
  UpdateCustomerProfileSchema,
  UpdateLectureProfileSchema,
  UpdateStaffProfileSchema,
} from './profile.model'

export class LectureProfileDTO extends createZodDto(LectureProfileSchema) {}
export class StaffProfileDTO extends createZodDto(StaffProfileSchema) {}
export class UpdateLectureProfileDTO extends createZodDto(UpdateLectureProfileSchema) {}
export class UpdateStaffProfileDTO extends createZodDto(UpdateStaffProfileSchema) {}
export class GetLectureProfileDTO extends createZodDto(LectureProfileSchema) {}
export class GetStaffProfileDTO extends createZodDto(StaffProfileSchema) {}
export class UpdateCustomerProfileDTO extends createZodDto(UpdateCustomerProfileSchema) {}
export class CustomerProfileDTO extends createZodDto(CustomerProfileSchema) {}
