import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config();

export default defineConfig({
  datasource: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:nhatngutorii@db.rkizlomnljifkbdimrup.supabase.co:5432/postgres?schema=gamification&sslmode=no-verify",
  },
});
