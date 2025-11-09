# Test Queries for Assessment History Module 🧪

## Mục đích

Test xem hệ thống có phân biệt được giữa:

- **ASSESSMENT** queries → Search for available tests (JSON response)
- **ASSESSMENT_HISTORY** queries → View user's past attempts (Natural text response)

---

## 1️⃣ ASSESSMENT (Search) Queries - JSON Response Expected

### Tiếng Việt

```
✅ "Website có bài test nào?"
✅ "Tìm bài kiểm tra N4"
✅ "Cho tôi xem các đề thi N3"
✅ "Có bài practice test nào không?"
✅ "Tìm mock exam JLPT N2"
✅ "Bài kiểm tra nào dễ nhất?"
```

### English

```
✅ "What tests are available?"
✅ "Find N5 practice tests"
✅ "Show me JLPT exams"
✅ "Search for mock exams"
```

**Expected Response Format:**

````
Tôi tìm thấy 4 bài kiểm tra trên website:

```json
{
  "assessments": [...],
  "count": 4
}
````

```

---

## 2️⃣ ASSESSMENT_HISTORY (User Progress) Queries - Natural Text Expected

### History Queries (Lịch sử làm bài)
```

✅ "Tôi đã làm bài test nào?"
✅ "Lịch sử các bài test của tôi"
✅ "Xem các bài đã làm"
✅ "Tôi đã làm bài N4 nào?"
✅ "Show my assessment history"
✅ "What tests have I completed?"
✅ "My past exams"

```

### Result Queries (Kết quả cụ thể)
```

✅ "Kết quả bài test vừa rồi"
✅ "Xem chi tiết điểm số attempt #123"
✅ "Show me result of my last test"
✅ "Tôi làm đúng bao nhiêu câu?"
✅ "Phân tích kết quả bài thi"
✅ "How did I do on the exam?"
✅ "Điểm số bài test cuối"

```

### Progress Queries (Tiến độ tổng thể)
```

✅ "Tiến độ học N5 của tôi"
✅ "Tôi đã tiến bộ chưa?"
✅ "Điểm trung bình các bài test"
✅ "Show my overall progress"
✅ "How am I improving?"
✅ "Tổng hợp kết quả học tập"
✅ "My learning statistics"
✅ "Am I getting better?"

```

**Expected Response Format:**
```

Lịch sử làm bài kiểm tra của bạn:

📝 **Bài đã hoàn thành:** 5 bài

1. **JLPT N4 Mini Test**
   - Điểm: 85/100 ✅
   - Thời gian: 45 phút
   - Ngày làm: 08/11/2025

2. **JLPT N3 Practice**
   - Điểm: 72/100
   - Thời gian: 52 phút
   - Ngày làm: 05/11/2025

Bạn đang tiến bộ tốt! 🎯

````

---

## 3️⃣ Query Detection Logic

```typescript
// Priority order in query-detection.utils.ts:
1. Flashcard Creation
2. Flashcard Search
3. Blog
4. ASSESSMENT_HISTORY ⭐ (NEW - must be checked BEFORE Assessment Search)
5. ASSESSMENT (Search)
6. Available Courses
7. Personal Courses/Enrollment
8. Course
9. Lesson
10. General
````

### Key Detection Keywords

**ASSESSMENT_HISTORY triggers:**

- `lịch sử`, `history`
- `đã làm`, `completed`, `attempted`
- `tôi đã`, `my test`, `my exam`
- `điểm`, `score`, `kết quả`, `result`
- `tiến độ`, `progress`, `improvement`, `tiến bộ`
- `thống kê`, `statistics`, `stats`

**ASSESSMENT (Search) triggers:**

- `tìm`, `search`, `find`
- `có những`, `có các`, `available`
- `website có`, `danh sách`, `list`
- `show`, `cho tôi xem`
- Combined with: `test`, `exam`, `quiz`, `bài kiểm tra`

---

## 4️⃣ Test Workflow

### Step 1: Start Backend

```bash
cd e:/FPT/Fall25/WDP/Torii_Nihongo_Gakuin_BE
npm run dev
```

### Step 2: Start MCP Server

```bash
cd e:/FPT/Fall25/WDP/Torri_Nihongo_Gakuin_MCP
uv run main.py
```

### Step 3: Test via AI Chat Widget

1. Open frontend at `http://localhost:3000`
2. Login with test account
3. Try queries from sections above
4. Verify response formats

### Step 4: Check Backend Logs

Look for these log messages:

```
🔍 QueryType for final response: "ASSESSMENT_HISTORY"
📊 Injecting ASSESSMENT_HISTORY module system prompt at the beginning
```

Or:

```
🔍 QueryType for final response: "ASSESSMENT"
📋 Injecting ASSESSMENT module system prompt at the beginning
```

---

## 5️⃣ Expected Tool Calls

### For ASSESSMENT queries:

- ✅ `search_all_assessments`
- ✅ `search_practice_tests`
- ✅ `get_mock_exams`
- ✅ `get_assessment_details`

### For ASSESSMENT_HISTORY queries:

- ✅ `get_my_assessment_history` (requires user_id)
- ✅ `get_attempt_result` (requires attempt_id)
- ✅ `get_my_progress_summary` (requires user_id)

---

## 6️⃣ Common Issues & Debugging

### Issue: Query goes to wrong server

**Check:**

1. `query-detection.utils.ts` - Is priority order correct?
2. `agent.service.ts` - Is `getServerUrlForTool()` routing correctly?
3. Backend logs - What QueryType was detected?

### Issue: Wrong response format (JSON when expecting text)

**Check:**

1. Is correct system prompt injected? (ASSESSMENT vs ASSESSMENT_HISTORY)
2. Check `messages.unshift()` in `agent.service.ts`
3. Frontend logs - Is `assessmentDetection` matching text correctly?

### Issue: Tool requires user_id but not provided

**Check:**

1. Is user authenticated?
2. Is `user_id` being injected from JWT/session in backend?
3. Check `ai-chat.service.ts` - Does it pass userId to tools?

---

## 7️⃣ Test Score Card

| Query Type | Query Example          | Expected QueryType | Expected Tool             | Response Format | Status |
| ---------- | ---------------------- | ------------------ | ------------------------- | --------------- | ------ |
| Search     | "Website có test nào?" | ASSESSMENT         | search_all_assessments    | JSON            | ⏳     |
| Search     | "Tìm N4 test"          | ASSESSMENT         | search_practice_tests     | JSON            | ⏳     |
| History    | "Tôi đã làm gì?"       | ASSESSMENT_HISTORY | get_my_assessment_history | Natural Text    | ⏳     |
| Result     | "Kết quả bài test"     | ASSESSMENT_HISTORY | get_attempt_result        | Natural Text    | ⏳     |
| Progress   | "Tiến độ của tôi"      | ASSESSMENT_HISTORY | get_my_progress_summary   | Natural Text    | ⏳     |

**Legend:**

- ⏳ = Chưa test
- ✅ = Passed
- ❌ = Failed
- ⚠️ = Partial success

---

## 8️⃣ Manual cURL Tests

### Test Assessment Search Tools

```bash
curl -X POST http://localhost:8000/assessment/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_all_assessments",
      "arguments": {"query": ""}
    }
  }' | python -m json.tool
```

### Test Assessment History Tools (requires user_id)

```bash
curl -X POST http://localhost:8000/assessment-history/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_my_assessment_history",
      "arguments": {"user_id": 1}
    }
  }' | python -m json.tool
```

---

## 9️⃣ Success Criteria

✅ **Query Detection Working:**

- History queries → ASSESSMENT_HISTORY QueryType
- Search queries → ASSESSMENT QueryType

✅ **System Prompt Injection:**

- ASSESSMENT queries inject `ASSESSMENT_MCP_PROMPT` (JSON format)
- ASSESSMENT_HISTORY queries inject `ASSESSMENT_HISTORY_MCP_PROMPT` (Natural text format)

✅ **Tool Routing:**

- Search tools → `/assessment/mcp` endpoint
- History tools → `/assessment-history/mcp` endpoint

✅ **Response Formats:**

- Search → ONE intro line + JSON code block
- History → Natural conversation with emojis, bullets, encouragement

✅ **Frontend Rendering:**

- JSON responses trigger card rendering
- Natural text responses show formatted markdown

---

## 🎯 Recommended Test Order

1. ✅ **Test tool listing** (cURL to both endpoints) - DONE ✅
2. ⏳ **Test query detection** (log what QueryType is detected)
3. ⏳ **Test system prompt injection** (check messages array)
4. ⏳ **Test tool execution** (cURL with actual arguments)
5. ⏳ **Test end-to-end** (frontend → backend → MCP → response)

---

**Last Updated:** 2025-11-09
**Module:** Assessment History MCP Integration
**Author:** GitHub Copilot
