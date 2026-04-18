import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Auth } from "src/shared/decorators/auth.decorator";
import { Roles } from "src/shared/decorators/roles.decorator";
import { AuthType } from "src/shared/constants/auth.constant";
import { RoleName } from "src/shared/constants/role.constant";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { GenerateBlogDto } from "./blog-ai.dto";
import { BlogAIService } from "./blog-ai.service";

@Controller("blog-ai")
@UseGuards(RolesGuard)
export class BlogAIController {
  constructor(private readonly blogAIService: BlogAIService) {}

  @Post("generate")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  async generate(@Body() dto: GenerateBlogDto) {
    return this.blogAIService.generateBlog(dto);
  }
}
