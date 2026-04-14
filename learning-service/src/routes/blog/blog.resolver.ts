import { Resolver, Query, Mutation, Args, Int, Context } from "@nestjs/graphql";
import { BlogService } from "./blog.service";
import {
  Blog,
  CreateBlogInput,
  UpdateBlogInput,
  QueryBlogsInput,
  PaginatedBlogsResponse,
  GenerateBlogImageUploadInput,
  BlogImageUploadResponse,
} from "./blog.dto";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "src/shared/guards/gql-auth.guard";
import { Auth } from "src/shared/decorators/auth.decorator";
import { AuthType } from "src/shared/constants/auth.constant";

@Resolver(() => Blog)
export class BlogResolver {
  constructor(private readonly blogService: BlogService) {}

  @Query(() => PaginatedBlogsResponse, { name: "blogs" })
  @Auth([AuthType.None])
  async findAll(
    @Args("query", { nullable: true }) query?: QueryBlogsInput,
  ): Promise<PaginatedBlogsResponse> {
    const queryDto = query || new QueryBlogsInput();
    return this.blogService.findAll(queryDto);
  }

  @Query(() => Blog, { name: "blog" })
  @Auth([AuthType.None])
  async findOne(@Args("id", { type: () => Int }) id: number): Promise<Blog> {
    return this.blogService.findOne(id);
  }

  @Query(() => Blog, { name: "blogBySlug" })
  @Auth([AuthType.None])
  async findBySlug(@Args("slug") slug: string): Promise<Blog> {
    return this.blogService.findBySlug(slug);
  }

  @Query(() => PaginatedBlogsResponse, { name: "blogsByAuthor" })
  @Auth([AuthType.None])
  async findByAuthor(
    @Args("authorId", { type: () => Int }) authorId: number,
    @Args("query", { nullable: true }) query?: QueryBlogsInput,
  ): Promise<PaginatedBlogsResponse> {
    const queryDto = query || new QueryBlogsInput();
    return this.blogService.findByAuthor(authorId, queryDto);
  }

  @Query(() => PaginatedBlogsResponse, { name: "blogsByTag" })
  @Auth([AuthType.None])
  async findByTag(
    @Args("tagId", { type: () => Int }) tagId: number,
    @Args("query", { nullable: true }) query?: QueryBlogsInput,
  ): Promise<PaginatedBlogsResponse> {
    const queryDto = query || new QueryBlogsInput();
    return this.blogService.findByTag(tagId, queryDto);
  }

  @Mutation(() => Blog)
  @UseGuards(GqlAuthGuard)
  async createBlog(
    @Args("createBlogInput") createBlogInput: CreateBlogInput,
    @Context() context: any,
  ): Promise<Blog> {
    const userId = context.req.user.userId;
    return this.blogService.create(createBlogInput, userId);
  }

  @Mutation(() => Blog)
  @UseGuards(GqlAuthGuard)
  async updateBlog(
    @Args("id", { type: () => Int }) id: number,
    @Args("updateBlogInput") updateBlogInput: UpdateBlogInput,
    @Context() context: any,
  ): Promise<Blog> {
    const userId = context.req.user.userId;
    return this.blogService.update(id, updateBlogInput, userId);
  }

  @Mutation(() => Blog)
  @UseGuards(GqlAuthGuard)
  async removeBlog(
    @Args("id", { type: () => Int }) id: number,
    @Context() context: any,
  ): Promise<Blog> {
    const userId = context.req.user.userId;
    return this.blogService.remove(id, userId);
  }

  @Mutation(() => BlogImageUploadResponse)
  @UseGuards(GqlAuthGuard)
  async generateBlogImageUploadUrl(
    @Args("input") input: GenerateBlogImageUploadInput,
  ): Promise<BlogImageUploadResponse> {
    return this.blogService.generateImageUploadUrl(
      input.filename,
      input.contentType,
    );
  }
}
