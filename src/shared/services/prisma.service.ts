import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:nhatngutorii@db.rkizlomnljifkbdimrup.supabase.co:5432/postgres?schema=public'

    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)

    super({
      log: ['info'],
      adapter,
    })
  }
  async onModuleInit() {
    await this.$connect()
  }
}
