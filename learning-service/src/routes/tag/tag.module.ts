import { Module } from "@nestjs/common";
import { TagResolver } from "./tag.resolver";
import { TagService } from "./tag.service";
import { TagRepository } from "./tag.repo";
import { SharedModule } from "src/shared/shared.module";

@Module({
  imports: [SharedModule],
  providers: [TagResolver, TagService, TagRepository],
  exports: [TagService],
})
export class TagModule {}
