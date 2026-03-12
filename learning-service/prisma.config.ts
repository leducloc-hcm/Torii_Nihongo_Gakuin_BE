import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load .env file
config();

export default defineConfig({
  datasource: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:nhatngutorii@torii-nihongo.cd48o48cgxzd.ap-southeast-1.rds.amazonaws.com:5432/postgres?schema=learning&sslmode=no-verify",
  },
});
