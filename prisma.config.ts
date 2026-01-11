import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres.rkizlomnljifkbdimrup:nhatngutorii@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?schema=public',
  },
})
