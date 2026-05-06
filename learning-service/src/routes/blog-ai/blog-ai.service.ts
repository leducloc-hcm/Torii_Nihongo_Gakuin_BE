import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { BlogMcpClient } from "src/mcp-client/module/blog/blog-mcp.service";
import { GenerateBlogDto } from "./blog-ai.dto";

@Injectable()
export class BlogAIService {
  constructor(private readonly blogMcpClient: BlogMcpClient) {}

  async generateBlog(dto: GenerateBlogDto) {
    const result = await this.blogMcpClient.generateBlogWithAI({
      topic: dto.topic,
      language: dto.language || "vi",
      style: dto.style || "educational",
    });

    if (!result.success) {
      throw new ServiceUnavailableException(
        result.error || "Failed to generate blog content via MCP",
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }
}
