import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:nhatngutorii@db.rkizlomnljifkbdimrup.supabase.co:5432/postgres?schema=public',
  },
})
