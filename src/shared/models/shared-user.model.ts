import { VerifyStatus } from 'src/shared/constants/auth.constant'
import { RoleName } from 'src/shared/constants/role.constant'
import { z } from 'zod'

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string(),
  bio: z.string().max(500).nullable(),
  totpSecret: z.string().nullable(),
  status: z.enum([VerifyStatus.UNVERIFIED, VerifyStatus.VERIFIED, VerifyStatus.BANNED]),
  role: z.enum([RoleName.Customer, RoleName.Staff, RoleName.Lecturer, RoleName.Admin]),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type UserType = z.infer<typeof UserSchema>
