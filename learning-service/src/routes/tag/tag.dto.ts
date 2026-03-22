import { ObjectType, Field, Int, InputType } from "@nestjs/graphql";
import {
  IsString,
  IsInt,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  Min,
  Max,
} from "class-validator";

@ObjectType()
export class TagBlogCount {
  @Field(() => Int)
  blogs: number;
}

// Tag ObjectType
@ObjectType()
export class TagObject {
  @Field(() => Int)
  @IsInt()
  id: number;

  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field()
  @IsString()
  slug: string;

  @Field(() => TagBlogCount, { nullable: true })
  _count?: TagBlogCount;
}

// Create Tag Input
@InputType()
export class CreateTagGraphQLInput {
  @Field()
  @IsString()
  @MinLength(1, { message: "Tag name is required" })
  @MaxLength(100, { message: "Tag name must be less than 100 characters" })
  name: string;

  @Field({ nullable: true })
  @IsString()
  @MaxLength(500, { message: "Description must be less than 500 characters" })
  @IsOptional()
  description?: string;

  @Field()
  @IsString()
  @MinLength(1, { message: "Slug is required" })
  @MaxLength(100, { message: "Slug must be less than 100 characters" })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase, alphanumeric with hyphens",
  })
  slug: string;
}

// Update Tag Input
@InputType()
export class UpdateTagGraphQLInput {
  @Field({ nullable: true })
  @IsString()
  @MinLength(1, { message: "Tag name is required" })
  @MaxLength(100, { message: "Tag name must be less than 100 characters" })
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @MaxLength(500, { message: "Description must be less than 500 characters" })
  @IsOptional()
  description?: string;

  @Field({ nullable: true })
  @IsString()
  @MinLength(1, { message: "Slug is required" })
  @MaxLength(100, { message: "Slug must be less than 100 characters" })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase, alphanumeric with hyphens",
  })
  @IsOptional()
  slug?: string;
}

// Query Tags Input
@InputType()
export class QueryTagsGraphQLInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  search?: string;
}

// Pagination Meta
@ObjectType()
export class TagPaginationMeta {
  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  totalPages: number;
}

// Paginated Tags Response
@ObjectType()
export class PaginatedTagsResponse {
  @Field(() => [TagObject])
  data: TagObject[];

  @Field(() => TagPaginationMeta)
  meta: TagPaginationMeta;
}
