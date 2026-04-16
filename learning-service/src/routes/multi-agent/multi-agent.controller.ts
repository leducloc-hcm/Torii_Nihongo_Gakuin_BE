import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthType } from "src/shared/constants/auth.constant";
import { RoleName } from "src/shared/constants/role.constant";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { Auth } from "src/shared/decorators/auth.decorator";
import { Roles } from "src/shared/decorators/roles.decorator";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { MultiAgentRouteDto } from "./multi-agent.dto";
import { MultiAgentService } from "./multi-agent.service";

@Controller("multi-agent")
@UseGuards(RolesGuard)
export class MultiAgentController {
  constructor(private readonly multiAgentService: MultiAgentService) {}

  @Post("query")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  async route(
    @ActiveUser("userId") userId: number,
    @ActiveUser("role") role: string,
    @Body() dto: MultiAgentRouteDto,
  ) {
    return this.multiAgentService.route(userId, role, dto);
  }
}
