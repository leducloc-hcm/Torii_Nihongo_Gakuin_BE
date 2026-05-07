import { createZodDto } from 'nestjs-zod'
import { LecturerOverviewSchema } from './lecturer-dashboard.model'

export class LecturerOverviewDTO extends createZodDto(LecturerOverviewSchema) {}
