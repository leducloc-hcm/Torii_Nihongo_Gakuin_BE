import { Global, Module } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { S3Service } from "src/shared/services/s3.service";
import { JwtModule } from "@nestjs/jwt";
import { AccessTokenGuard } from "src/shared/guards/access-token.guard";
import { APP_GUARD } from "@nestjs/core";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";

@Global()
@Module({
  providers: [
    PrismaService,
    S3Service,
    AccessTokenGuard,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],
  exports: [PrismaService, S3Service],
  imports: [JwtModule],
})
export class SharedModule {}
