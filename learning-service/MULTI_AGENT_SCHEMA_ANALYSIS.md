# Multi-Agent Analysis for AI Learning Assistant

## Scope and Goal

This document analyzes whether the current database schema in Prisma is sufficient to support the requested multi-agent AI design:

- Sensei Agent: grammar, translation, flashcards
- Assessment Agent: generate/evaluate JLPT-style tests
- Analytics Agent: track progress and suggest personalized study paths

And to support:

- AI-driven personalized support
- Reduced teacher workload for grading and test creation

## What the Current System Already Has

### 1) MCP server modules are domain-based tools

From Python MCP server:

- [main.py](../Torri_Nihongo_Gakuin_MCP/main.py)
- [assessment_mcp.py](../Torri_Nihongo_Gakuin_MCP/modules/assessment/assessment_mcp.py)
- [history_mcp.py](../Torri_Nihongo_Gakuin_MCP/modules/assessment_history/history_mcp.py)
- [enrollment_mcp.py](../Torri_Nihongo_Gakuin_MCP/modules/enrollment/enrollment_mcp.py)
- [flashcard_mcp.py](../Torri_Nihongo_Gakuin_MCP/modules/flashcard/flashcard_mcp.py)

These provide tools for course/enrollment/flashcard/blog/assessment/history.

### 2) NestJS side already has tool-calling orchestration

From BE:

- [agent.service.ts](src/mcp-client/agent.service.ts)
- [ai-chat.service.ts](src/routes/ai-chat/ai-chat.service.ts)
- [query-detection.utils.ts](src/mcp-client/shared/query-detection.utils.ts)

The system detects query type, calls OpenAI, executes MCP tools, and stores query/message records.

### 3) Existing Prisma models for AI conversations

From Prisma:

- [schema.prisma](prisma/schema.prisma)

Current models exist:

- AIThread
- AIQuery
- AIChatMessage
- AICitation

This is a good base for chat persistence and citations.

## Gaps Against the Multi-Agent Requirement

## A. Critical mismatch in QueryType enum (Must fix)

`detectQueryType` supports: COURSE, LESSON, FLASHCARD, ASSESSMENT, ASSESSMENT_HISTORY, ENROLLMENT, PROGRESS, BLOG, GENERAL.

But current Prisma enum QueryType (in schema) does not include all of these values.

Impact:

- Runtime risk when saving AIQuery if queryType value is not present in DB enum.
- Multi-agent routing cannot be represented safely.

Conclusion: schema update is required immediately.

## B. No explicit agent identity per query/message (Must fix for true multi-agent)

Current AIQuery stores queryType, status, executedTools, but does not explicitly persist:

- Which agent handled the request (Sensei/Assessment/Analytics)
- Whether handoff happened between agents
- Why routing decision was made

Impact:

- Hard to audit and improve routing quality.
- Cannot measure agent-specific performance.

Conclusion: need schema fields for agent routing.

## C. No persistent analytics recommendations memory (Should fix)

Analytics data is currently computed via MCP helper SQL (enrollment/assessment history), but there is no dedicated storage for:

- Personalized recommendations over time
- Weak/strong skill snapshots
- Suggested next study path and confidence

Impact:

- Limited personalization continuity across sessions.
- Hard to show progression of recommendations and validate outcomes.

Conclusion: should add recommendation/insight tables.

## D. Missing structured tool execution logs (Should fix)

AIQuery has `executedTools` JSON, but no normalized event-level table.

Impact:

- Difficult to trace per-tool latency, failures, retries, handoffs.
- Hard to evaluate workload reduction and reliability.

Conclusion: add an optional execution log table.

## Recommended Prisma Changes

## Phase 1 (Required now)

### 1) Expand QueryType enum to match actual code paths

Add at least:

- ASSESSMENT
- ENROLLMENT
- PROGRESS
- GENERAL

This is required for consistency between:

- [query-detection.utils.ts](src/mcp-client/shared/query-detection.utils.ts)
- [ai-chat.service.ts](src/routes/ai-chat/ai-chat.service.ts)
- Prisma enum QueryType

### 2) Add agent role enum + fields in AIQuery

Suggested enum:

- SENSEI
- ASSESSMENT
- ANALYTICS
- ORCHESTRATOR

Suggested AIQuery fields:

- `agentRole AgentRole?`
- `routingReason String? @db.Text`
- `handoffFrom AgentRole?`
- `handoffTo AgentRole?`

Minimum requirement for multi-agent observability is `agentRole`.

## Phase 2 (Strongly recommended)

### 3) Add personalized recommendation table

Example model: `AILearningRecommendation`

- id
- userId
- threadId?
- queryId?
- level (N5..N1 optional)
- recommendationType (PLAN, NEXT_LESSON, WEAKNESS_FOCUS, REVIEW_REMINDER)
- recommendationText (Text)
- evidence (Json)
- priority (Int)
- validUntil (DateTime?)
- isApplied (Boolean)
- createdAt, updatedAt

This enables Analytics Agent to persist adaptive study paths.

### 4) Add learner performance snapshot table

Example model: `AILearnerSnapshot`

- id
- userId
- jlptLevel?
- grammarScore?
- vocabScore?
- readingScore?
- listeningScore?
- weakTopics String[]
- strongTopics String[]
- sourceWindowDays Int
- generatedAt DateTime

This supports stable trend analysis and personalized planning.

## Phase 3 (Optional but valuable)

### 5) Add normalized tool execution log

Example model: `AIToolExecutionLog`

- id
- queryId
- agentRole
- toolName
- toolServer
- status (SUCCESS/FAILED/TIMEOUT)
- latencyMs
- inputPayload Json?
- outputSummary String? @db.Text
- errorMessage String? @db.Text
- createdAt

This helps measure teacher workload reduction and operational quality.

## Suggested Minimal Schema Delta (Practical)

If you want smallest change set first:

1. Update QueryType enum to include all values used by code.
2. Add `agentRole` to AIQuery.
3. Add one recommendation table (AILearningRecommendation).

This is enough to start true multi-agent behavior without a large migration.

## Non-Schema Work Also Needed

Even with schema changes, you still need service-layer updates:

- Routing policy for choosing Sensei vs Assessment vs Analytics.
- Handoff strategy (for mixed queries).
- Prompt contracts per role.
- Persist recommendation outputs from Analytics Agent.

Relevant files for implementation:

- [agent.service.ts](src/mcp-client/agent.service.ts)
- [ai-chat.service.ts](src/routes/ai-chat/ai-chat.service.ts)
- [course-mcp.prompt.ts](src/mcp-client/module/course/course-mcp.prompt.ts)
- [assessment-mcp.prompt.ts](src/mcp-client/module/assessment/assessment-mcp.prompt.ts)
- [enrollment-mcp.prompt.ts](src/mcp-client/module/enrollment/enrollment-mcp.prompt.ts)

## Final Answer to the Question

Yes, you should modify Prisma schema to fully satisfy the multi-agent requirement.

At minimum, fix QueryType enum mismatch immediately and add an explicit agent role field in AIQuery. For personalized adaptive learning quality, add recommendation/snapshot persistence models.
