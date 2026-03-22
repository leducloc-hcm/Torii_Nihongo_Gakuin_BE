import { Resolver, Query, Mutation, Args, Int } from "@nestjs/graphql";
import { TagService } from "./tag.service";
import {
  TagObject,
  CreateTagGraphQLInput,
  UpdateTagGraphQLInput,
  QueryTagsGraphQLInput,
  PaginatedTagsResponse,
} from "./tag.dto";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "src/shared/guards/gql-auth.guard";
import { GqlRolesGuard } from "src/shared/guards/gql-roles.guard";
import { Roles } from "src/shared/decorators/roles.decorator";
import { RoleName } from "src/shared/constants/role.constant";

@Resolver(() => TagObject)
export class TagResolver {
  constructor(private readonly tagService: TagService) {}

  @Query(() => PaginatedTagsResponse, { name: "tags" })
  async findAll(
    @Args("query", { nullable: true }) query?: QueryTagsGraphQLInput,
  ): Promise<PaginatedTagsResponse> {
    const queryDto = query || new QueryTagsGraphQLInput();
    return this.tagService.findAll(
      queryDto,
    ) as unknown as PaginatedTagsResponse;
  }

  @Query(() => TagObject, { name: "tag" })
  @UseGuards(GqlAuthGuard)
  async findOne(
    @Args("id", { type: () => Int }) id: number,
  ): Promise<TagObject> {
    return this.tagService.findOne(id) as Promise<TagObject>;
  }

  @Query(() => TagObject, { name: "tagBySlug" })
  async findBySlug(@Args("slug") slug: string): Promise<TagObject> {
    return this.tagService.findBySlug(slug) as Promise<TagObject>;
  }

  @Mutation(() => TagObject)
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @Roles(RoleName.Staff, RoleName.Admin)
  async createTag(
    @Args("createTagInput") createTagInput: CreateTagGraphQLInput,
  ): Promise<TagObject> {
    return this.tagService.create(createTagInput) as Promise<TagObject>;
  }

  @Mutation(() => TagObject)
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @Roles(RoleName.Staff, RoleName.Admin)
  async updateTag(
    @Args("id", { type: () => Int }) id: number,
    @Args("updateTagInput") updateTagInput: UpdateTagGraphQLInput,
  ): Promise<TagObject> {
    return this.tagService.update(id, updateTagInput) as Promise<TagObject>;
  }

  @Mutation(() => TagObject)
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @Roles(RoleName.Staff, RoleName.Admin)
  async removeTag(
    @Args("id", { type: () => Int }) id: number,
  ): Promise<TagObject> {
    return this.tagService.remove(id) as Promise<TagObject>;
  }
}
