# Multi-Agent: Chinh Sua Schema Va Luong Xu Ly (Tieng Viet)

## 1. Muc tieu

Tai lieu nay mo ta cac thay doi da duoc them de he thong AI chat ho tro mo hinh 3 agent:

- SENSEI: tu van hoc tap tong quat (course, flashcard, blog, lesson).
- ASSESSMENT: xu ly domain bai test, ket qua, lich su bai lam.
- ANALYTICS: xu ly enrollment/progress va thong tin tien do hoc.

## 2. Thay doi schema Prisma

File da sua: `prisma/schema.prisma`

### 2.1. Mo rong enum QueryType

Da bo sung cac gia tri con thieu de dong bo voi logic detect query trong code:

- `ASSESSMENT`
- `ENROLLMENT`
- `PROGRESS`
- `GENERAL`

### 2.2. Them enum AgentRole

Them enum moi:

- `SENSEI`
- `ASSESSMENT`
- `ANALYTICS`

### 2.3. Them metadata routing vao AIQuery

Trong model `AIQuery`, da them:

- `agentRole AgentRole @default(SENSEI)`
- `routingReason String?`

Y nghia:

- `agentRole`: agent nao duoc chon de xu ly query.
- `routingReason`: ly do route (de audit/debug, de toi uu router sau nay).

### 2.4. Them index phuc vu truy vet

Them index:

- `@@index([agentRole, createdAt])`

Muc dich: thong ke, quan sat va truy van log theo role nhanh hon.

## 3. Thay doi luong multi-agent trong code

### 3.0. Refactor moi: Supervisor Router + Specialist Agents

Truoc day, he thong chu yeu route theo `queryType` va loc tool bang keyword ten tool. Cach nay de bi overlap va chua tach agent that su ro rang.

Hien tai da doi sang kieu:

- `Supervisor router` (module rieng) quyet dinh:
  - `primaryRole`
  - `collaboratorRoles`
  - `forceTools`
  - `routing reason`
- `Specialist agent policy` theo role de chon tool dua tren **MCP server source**, khong dua tren keyword ten tool.

File moi:

- `src/mcp-client/shared/agent-routing.utils.ts`
- `src/mcp-client/prompts/agent-role.prompt.ts`

### 3.1. AIChatService: route query -> agent role

File da sua: `src/routes/ai-chat/ai-chat.service.ts`

Da bo local mapping cu, va dung router trung tam:

- `routeAgentForQuery(queryType, query)`

Mapping hien tai:

- `ASSESSMENT`, `ASSESSMENT_HISTORY` -> `ASSESSMENT`
- `ENROLLMENT`, `PROGRESS` -> `ANALYTICS`
- Con lai -> `SENSEI`

Ngoai ra, neu query la multi-domain thi router se them `collaboratorRoles` de giu context phoi hop.

Da bo sung persist metadata khi tao `AIQuery`:

- `agentRole`
- `routingReason`

Da truyen xuong `AgentService` day du context routing:

- primary role
- collaborator roles
- force tool policy

### 3.2. AgentService: gioi han tool theo role

File da sua: `src/mcp-client/agent.service.ts`

Da them role-aware orchestration that su:

- Nhan them `agentRole` + `collaboratorRoles` trong pha ra quyet dinh tool.
- Inject role-specific system prompt (`Sensei` / `Assessment` / `Analytics`).
- Loc tool theo server policy:
  - `SENSEI`: course/flashcard/blog (+ fallback enrollment)
  - `ASSESSMENT`: assessment/assessmentHistory (+ fallback course)
  - `ANALYTICS`: enrollment/assessmentHistory (+ fallback course)
- Match server bang tool registry tao luc load tools, khong dua vao ten tool hardcode.
- Neu policy role khong khop tool nao: fallback full toolset de dam bao he thong khong fail query.

Trong pha tong hop ket qua tool (`executeApprovedTools`):

- Da truyen va dung tiep `agentRole` de final response giu dung persona/chuc nang agent.

Y nghia:

- Giam tinh trang model goi nham tool khac domain.
- Phan tach trach nhiem giua cac agent ro rang hon.

### 3.3. AIQuery repository

File da sua: `src/routes/ai-chat/ai-chat.repo.ts`

Da mo rong payload `create(...)` de nhan them:

- `agentRole?`
- `routingReason?`

Muc dich: dong bo persistence voi schema moi.

### 3.4. Execute tools payload

File da sua: `src/mcp-client/mcp.model.ts`

Da bo sung truong `agentRole?` trong `ExecuteToolsRequest` de role duoc truyen xuyen suot tu router -> execution -> final synthesis.

## 4. Tac dong va loi ich

- Co the audit: query nao do agent nao xu ly, vi sao route nhu vay.
- De theo doi KPI theo role (ti le tool call, ti le thanh cong, do tre).
- Tao nen tang cho buoc tiep theo: prompt rieng va policy rieng theo role.

## 5. Viec can lam tiep theo (khuyen nghi)

1. Tao migration Prisma va generate client:
   - `npx prisma migrate dev --name add_multi_agent_routing_metadata`
   - `npx prisma generate`
2. Tach prompt theo role (SENSEI/ASSESSMENT/ANALYTICS) de chat output on dinh hon.
3. Them dashboard quan sat theo `agentRole` (latency, tool success rate, fallback rate).
4. Bo sung test E2E cho 3 nhom query dai dien.

## 6. Ghi chu tuong thich

- Logic moi co fallback an toan (neu tool filtering khong khop thi dung full tools).
- Khong thay doi API contract ngoai cua endpoint chat.
- Du lieu cu van doc duoc, query moi se bat dau co metadata `agentRole` va `routingReason` sau khi migrate.
