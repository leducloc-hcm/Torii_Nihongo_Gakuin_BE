import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { REQUEST_USER_KEY } from "src/shared/constants/auth.constant";
import { TokenService } from "src/shared/services/token.service";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.getType<string>() === "graphql"
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest();

    // Check if request comes from API Gateway (has X-User-Id header)
    const userId = request.headers["x-user-id"];
    const userEmail = request.headers["x-user-email"];
    const userRole = request.headers["x-user-role"];

    if (userId && userEmail) {
      // Request already verified by API Gateway
      request[REQUEST_USER_KEY] = {
        userId: parseInt(userId),
        email: userEmail,
        role: userRole,
      };
      return true;
    }

    // Fallback: verify token directly (for direct service access)
    const accessToken = request.headers.authorization?.split(" ")[1];
    if (!accessToken) {
      throw new UnauthorizedException();
    }
    try {
      const decodedAccessToken =
        await this.tokenService.verifyAccessToken(accessToken);
      request[REQUEST_USER_KEY] = decodedAccessToken;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
