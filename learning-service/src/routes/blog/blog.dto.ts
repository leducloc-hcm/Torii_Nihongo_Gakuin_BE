import {
  ObjectType,
  Field,
  Int,
  InputType,
  PartialType,
} from "@nestjs/graphql";
import {
  IsString,
  IsInt,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
  Matches,
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  Min,
  Max,
} from "class-validator";

// Author Type (nested in Blog)
@ObjectType()
export class Author {
  @Field(() => Int)
  @IsInt()
  id: number;

  @Field()
  @IsString()
  name: string;

  @Field()
  @IsEmail()
  email: string;
}

// Tag Type (nested in Blog)
@ObjectType()
export class TagInBlog {
  @Field(() => Int)
  @IsInt()
  id: number;

  @Field()
  @IsString()
  name: string;

  @Field()
  @IsString()
  slug: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;
}

@ObjectType()
export class BlogTag {
  @Field(() => TagInBlog)
  tag: TagInBlog;
}

// Base Blog Type
@ObjectType()
export class BaseBlog {
  @Field(() => Int)
  @IsInt()
  id: number;

  @Field()
  @IsString()
  @MinLength(1, { message: "Title is required" })
  @MaxLength(255, { message: "Title must be less than 255 characters" })
  title: string;

  @Field()
  @IsString()
  @MinLength(1, { message: "Content is required" })
  content: string;

  @Field({ nullable: true })
  @IsUrl({}, { message: "Invalid image URL" })
  @IsOptional()
  image?: string;

  @Field()
  @IsString()
  @MinLength(1, { message: "Slug is required" })
  @MaxLength(255, { message: "Slug must be less than 255 characters" })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase, alphanumeric with hyphens",
  })
  slug: string;

  @Field()
  @IsDate()
  date: Date;

  @Field(() => Int)
  @IsInt()
  authorId: number;
}

// Blog with Relations
@ObjectType()
export class Blog extends BaseBlog {
  @Field(() => Author)
  author: Author;

  @Field(() => [BlogTag])
  tags: BlogTag[];
}

// Create Blog Input
@InputType()
export class CreateBlogInput {
  @Field()
  @IsString()
  @MinLength(1, { message: "Title is required" })
  @MaxLength(255, { message: "Title must be less than 255 characters" })
  title: string;

  @Field()
  @IsString()
  @MinLength(1, { message: "Content is required" })
  content: string;

  @Field({ nullable: true })
  @IsUrl({}, { message: "Invalid image URL" })
  @IsOptional()
  image?: string;

  @Field()
  @IsString()
  @MinLength(1, { message: "Slug is required" })
  @MaxLength(255, { message: "Slug must be less than 255 characters" })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase, alphanumeric with hyphens",
  })
  slug: string;

  @Field(() => [Int], { nullable: true, defaultValue: [] })
  @IsArray()
  @IsOptional()
  tagIds?: number[];
}

// Update Blog Input
@InputType()
export class UpdateBlogInput extends PartialType(CreateBlogInput) {}

// Query Blog Input
@InputType()
export class QueryBlogsInput {
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

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  tagId?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  authorId?: number;

  @Field({ nullable: true, defaultValue: "date" })
  @IsEnum(["date", "title"])
  @IsOptional()
  sortBy?: "date" | "title" = "date";

  @Field({ nullable: true, defaultValue: "desc" })
  @IsEnum(["asc", "desc"])
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}

// Pagination Meta
@ObjectType()
export class PaginationMeta {
  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  totalPages: number;
}

// Paginated Blogs Response
@ObjectType()
export class PaginatedBlogsResponse {
  @Field(() => [Blog])
  data: Blog[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}
