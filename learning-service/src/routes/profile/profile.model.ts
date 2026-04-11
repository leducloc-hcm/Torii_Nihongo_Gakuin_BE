import { z } from "zod";

export const SpecialtySchema = z.object({
  id: z.number(),
  name: z.string(),
  issuingOrganization: z.string().nullable().optional(),
  issueDate: z.union([z.string(), z.date()]).nullable().optional(),
  expirationDate: z.union([z.string(), z.date()]).nullable().optional(),
  credentialId: z.string().nullable().optional(),
  credentialUrl: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  skills: z.array(z.string()).optional(),
});

export const LectureProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  bio: z.string().nullable(),
  avatar: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  socialLinks: z
    .array(
      z.object({
        platform: z.string(),
        url: z.string().url(),
      }),
    )
    .nullable(),
  phoneNumber: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  coverPhoto: z.string().nullable(),
  specialties: z
    .array(SpecialtySchema)
    .nullable(),
});

export const StaffProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  bio: z.string().nullable(),
  avatar: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  coverPhoto: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
});
export const AdminProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  bio: z.string().nullable(),
  avatar: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  coverPhoto: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
});

export const UpdateLectureProfileSchema = LectureProfileSchema.pick({
  name: true,
  bio: true,
  avatar: true,
  location: true,
  website: true,
  socialLinks: true,
  phoneNumber: true,
  dateOfBirth: true,
  coverPhoto: true,
});

export const UpdateStaffProfileSchema = StaffProfileSchema.pick({
  name: true,
  bio: true,
  avatar: true,
  location: true,
  website: true,
  phoneNumber: true,
  dateOfBirth: true,
  coverPhoto: true,
});
export const UpdateAdminProfileSchema = AdminProfileSchema.pick({
  name: true,
  bio: true,
  avatar: true,
  location: true,
  website: true,
  phoneNumber: true,
  dateOfBirth: true,
  coverPhoto: true,
});

export const CustomerProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  bio: z.string().nullable(),
  avatar: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  coverPhoto: z.string().nullable(),
});

export const UpdateCustomerProfileSchema = CustomerProfileSchema.pick({
  name: true,
  bio: true,
  avatar: true,
  location: true,
  website: true,
  phoneNumber: true,
  dateOfBirth: true,
  coverPhoto: true,
});

export type LectureProfileType = z.infer<typeof LectureProfileSchema>;
export type SpecialtyType = z.infer<typeof SpecialtySchema>;
export type StaffProfileType = z.infer<typeof StaffProfileSchema>;
export type UpdateLectureProfileType = z.infer<
  typeof UpdateLectureProfileSchema
>;
export type UpdateStaffProfileType = z.infer<typeof UpdateStaffProfileSchema>;
export type UpdateCustomerProfileType = z.infer<
  typeof UpdateCustomerProfileSchema
>;
export type GetLectureProfileType = z.infer<typeof LectureProfileSchema>;
export type GetStaffProfileType = z.infer<typeof StaffProfileSchema>;
export type CustomerProfileType = z.infer<typeof CustomerProfileSchema>;
export type GetAdminProfileType = z.infer<typeof AdminProfileSchema>;
export type AdminProfileType = z.infer<typeof AdminProfileSchema>;
export type UpdateAdminProfileType = z.infer<typeof UpdateAdminProfileSchema>;
