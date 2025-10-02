import { Module } from '@nestjs/common'
import { BlogController } from './blog.controller'
import { BlogService } from './blog.service'
import { BlogRepository } from './blog.repo'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [BlogController],
  providers: [BlogService, BlogRepository],
  exports: [BlogService],
})
export class BlogModule {}
