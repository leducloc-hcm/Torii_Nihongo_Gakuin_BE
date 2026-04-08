import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      "postgresql://postgres:123456@localhost:5432/torii_db?schema=learning";

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({
      log: ["info"],
      adapter,
    });
  }
  async onModuleInit() {
    await this.$connect();
  }
}
