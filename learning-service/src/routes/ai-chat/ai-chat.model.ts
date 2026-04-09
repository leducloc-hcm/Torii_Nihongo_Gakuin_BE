import { AIThread, AIChatMessage, AIQuery, Prisma } from "@prisma/client";

export type AIThreadWithMessages = AIThread & {
  messages: AIChatMessage[];
};

export type AIQueryWithMessages = AIQuery & {
  messages: AIChatMessage[];
};

export type AIChatMessageWithCitations = AIChatMessage & {
  citations: any[];
};

export const aiThreadInclude = {
  messages: {
    orderBy: { createdAt: "asc" as Prisma.SortOrder },
  },
} satisfies Prisma.AIThreadInclude;

export const aiQueryInclude = {
  messages: {
    orderBy: { createdAt: "asc" as Prisma.SortOrder },
  },
} satisfies Prisma.AIQueryInclude;
