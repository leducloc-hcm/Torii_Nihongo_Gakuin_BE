import { VerifyStatus } from 'src/shared/constants/auth.constant'
import { RoleName } from 'src/shared/constants/role.constant'
import { z } from 'zod'

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
  bio: z.string().max(500).nullable(),
  totpSecret: z.string().nullable(),
  status: z.enum([VerifyStatus.UNVERIFIED, VerifyStatus.VERIFIED, VerifyStatus.BANNED]),
  role: z.enum([RoleName.Customer, RoleName.Staff, RoleName.Lecturer, RoleName.Admin]),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Áp dụng cho Response của api GET('profile') và GET('users/:userId')
 */
export const GetUserProfileResSchema = UserSchema.omit({
  password: true,
  totpSecret: true,
})

/**
 * Áp dụng cho Response của api PUT('profile') và PUT('users/:userId')
 */
export const UpdateProfileResSchema = UserSchema.omit({
  password: true,
  totpSecret: true,
})

export type UserType = z.infer<typeof UserSchema>
export type GetUserProfileResType = z.infer<typeof GetUserProfileResSchema>
export type UpdateProfileResType = z.infer<typeof UpdateProfileResSchema>
