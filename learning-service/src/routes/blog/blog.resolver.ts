import { Resolver, Query, Mutation, Args, Int, Context } from "@nestjs/graphql";
import { BlogService } from "./blog.service";
import {
  Blog,
  CreateBlogInput,
  UpdateBlogInput,
  QueryBlogsInput,
  PaginatedBlogsResponse,
} from "./blog.dto";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "src/shared/guards/gql-auth.guard";

@Resolver(() => Blog)
export class BlogResolver {
  constructor(private readonly blogService: BlogService) {}

  @Query(() => PaginatedBlogsResponse, { name: "blogs" })
  async findAll(
    @Args("query", { nullable: true }) query?: QueryBlogsInput,
  ): Promise<PaginatedBlogsResponse> {
    const queryDto = query || new QueryBlogsInput();
    return this.blogService.findAll(queryDto);
  }

  @Query(() => Blog, { name: "blog" })
  async findOne(@Args("id", { type: () => Int }) id: number): Promise<Blog> {
    return this.blogService.findOne(id);
  }

  @Query(() => Blog, { name: "blogBySlug" })
  async findBySlug(@Args("slug") slug: string): Promise<Blog> {
    return this.blogService.findBySlug(slug);
  }

  @Query(() => PaginatedBlogsResponse, { name: "blogsByAuthor" })
  async findByAuthor(
    @Args("authorId", { type: () => Int }) authorId: number,
    @Args("query", { nullable: true }) query?: QueryBlogsInput,
  ): Promise<PaginatedBlogsResponse> {
    const queryDto = query || new QueryBlogsInput();
    return this.blogService.findByAuthor(authorId, queryDto);
  }

  @Query(() => PaginatedBlogsResponse, { name: "blogsByTag" })
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
}
