import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres.rkizlomnljifkbdimrup:nhatngutorii@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?schema=public'

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
