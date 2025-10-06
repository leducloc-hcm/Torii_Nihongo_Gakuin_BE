import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { SharedModule } from './shared/shared.module'
import { AuthModule } from './routes/auth/auth.module'
import { TagModule } from './routes/tag/tag.module'
import { BlogModule } from './routes/blog/blog.module'
import { ProfileModule } from './routes/profile/profile.module'

@Module({
  imports: [AuthModule, TagModule, BlogModule, SharedModule, ProfileModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
