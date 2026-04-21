import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config();

export default defineConfig({
  datasource: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:nhatngutorii@database-1.cjo8kkoui65a.ap-southeast-1.rds.amazonaws.com:5432/postgres?schema=gamification&sslmode=no-verify",
  },
});
