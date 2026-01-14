import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import { BlogService } from "./blog.service";
import { CreateBlogDTO, UpdateBlogDTO, QueryBlogDTO } from "./blog.dto";
import { Auth, IsPublic } from "src/shared/decorators/auth.decorator";
import { AuthType } from "src/shared/constants/auth.constant";
import { Roles } from "src/shared/decorators/roles.decorator";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RoleName } from "src/shared/constants/role.constant";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { imageUploadOptions } from "src/shared/config/upload.config";
import { FileFieldsInterceptor } from "@nestjs/platform-express";

@Controller("blogs")
@UseGuards(RolesGuard)
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "image", maxCount: 1 }], imageUploadOptions)
  )
  async create(
    @Body() createBlogDto: CreateBlogDTO,
    @ActiveUser("userId") userId: number,
    @UploadedFiles() files?: { image?: Express.Multer.File[] }
  ) {
    return this.blogService.create(createBlogDto, userId, files);
  }

  @Get()
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() queryDto: QueryBlogDTO) {
    return this.blogService.findAll(queryDto);
  }

  @Get("tag/:tagId")
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async findByTag(
    @Param("tagId", ParseIntPipe) tagId: number,
    @Query() queryDto: QueryBlogDTO
  ) {
    return this.blogService.findByTag(tagId, queryDto);
  }

  @Get(":slug")
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param("slug") slug: string) {
    return this.blogService.findBySlug(slug);
  }

  @Get("id/:id")
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.blogService.findOne(id);
  }

  @Put(":id")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "image", maxCount: 1 }], imageUploadOptions)
  )
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateBlogDto: UpdateBlogDTO,
    @ActiveUser("userId") userId: number,
    @UploadedFiles() files?: { image?: Express.Multer.File[] }
  ) {
    return this.blogService.update(id, updateBlogDto, userId, files);
  }

  @Delete(":id")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @ActiveUser("userId") userId: number
  ) {
    return this.blogService.remove(id, userId);
  }
}
