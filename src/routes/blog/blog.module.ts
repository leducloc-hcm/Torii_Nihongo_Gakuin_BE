import { Module } from '@nestjs/common'
import { BlogController } from './blog.controller'
import { BlogService } from './blog.service'
import { BlogRepository } from './blog.repo'
import { SharedModule } from 'src/shared/shared.module'
import { TagRepository } from 'src/routes/tag/tag.repo'

@Module({
  imports: [SharedModule],
  controllers: [BlogController],
  providers: [BlogService, BlogRepository, TagRepository],
  exports: [BlogService],
})
export class BlogModule {}
