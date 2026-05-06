import { Module } from "@nestjs/common";
import { BlogResolver } from "./blog.resolver";
import { BlogService } from "./blog.service";
import { BlogRepository } from "./blog.repo";
import { SharedModule } from "src/shared/shared.module";
import { TagRepository } from "src/routes/tag/tag.repo";

@Module({
  imports: [SharedModule],
  providers: [BlogResolver, BlogService, BlogRepository, TagRepository],
  exports: [BlogService],
})
export class BlogModule {}
