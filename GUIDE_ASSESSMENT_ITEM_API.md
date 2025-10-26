# 📚 Assessment Item API - Hướng dẫn Test với Postman

## ⚠️ LƯU Ý QUAN TRỌNG

### ❌ SAI:
```json
{
  "sectionId": 4,
  "questionId": [1, 2, 3],          // ❌ SAI - thiếu chữ 's'
  "questionGroupId": [201]           // ❌ SAI - thiếu chữ 's'
}
```

### ✅ ĐÚNG:
```json
{
  "sectionId": 4,
  "questionIds": [1, 2, 3],         // ✅ ĐÚNG - có chữ 's'
  "questionGroupIds": [201]          // ✅ ĐÚNG - có chữ 's'
}
```

---

## 🎯 Các Trường Hợp Sử Dụng

### 1️⃣ Tạo Item với NHIỀU Questions (Vocabulary, Grammar)

```http
POST /assessment-items
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "sectionId": 1,
  "questionIds": [101, 102, 103, 104, 105],
  "name": "Basic Vocabulary Test",
  "scorePerQuestion": 1.0,
  "order": 0
}
```

**Khi nào dùng:**
- Section Vocabulary: nhiều câu hỏi từ vựng đơn lẻ
- Section Grammar: nhiều câu hỏi ngữ pháp riêng biệt
- Quiz ngắn với câu hỏi độc lập

**Response:**
```json
{
  "id": 1,
  "sectionId": 1,
  "name": "Basic Vocabulary Test",
  "order": 0,
  "scorePerQuestion": 1.0,
  "questions": [
    {
      "id": 101,
      "stem": "「行く」の意味は何ですか？",
      "type": "MULTIPLE_CHOICE",
      "difficulty": "EASY",
      "level": "N5"
    },
    // ... 4 questions more
  ],
  "questionGroups": []
}
```

---

### 2️⃣ Tạo Item với Question Groups (Reading, Listening)

```http
POST /assessment-items
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "sectionId": 3,
  "questionGroupIds": [201, 202],
  "name": "Reading Comprehension",
  "scorePerQuestion": 2.0,
  "order": 0
}
```

**Khi nào dùng:**
- Section Reading: đoạn văn với nhiều câu hỏi
- Section Listening: audio với nhiều câu hỏi
- Bài đọc hiểu có context chung

**Response:**
```json
{
  "id": 2,
  "sectionId": 3,
  "name": "Reading Comprehension",
  "order": 0,
  "scorePerQuestion": 2.0,
  "questions": [],
  "questionGroups": [
    {
      "id": 201,
      "title": "Reading: Daily Life",
      "type": "READING"
    },
    {
      "id": 202,
      "title": "Reading: Shopping",
      "type": "READING"
    }
  ]
}
```

---

### 3️⃣ Tạo Item với CẢ Questions VÀ Groups (Mixed)

```http
POST /assessment-items
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "sectionId": 2,
  "questionIds": [111, 112],
  "questionGroupIds": [301],
  "name": "Grammar Mixed",
  "order": 0
}
```

**Khi nào dùng:**
- Section có cả câu hỏi đơn và passage
- Test tổng hợp nhiều dạng bài
- Phân loại độ khó khác nhau trong cùng section

**Response:**
```json
{
  "id": 3,
  "sectionId": 2,
  "name": "Grammar Mixed",
  "order": 0,
  "scorePerQuestion": null,
  "questions": [
    {
      "id": 111,
      "stem": "Grammar question 1",
      "type": "MULTIPLE_CHOICE"
    },
    {
      "id": 112,
      "stem": "Grammar question 2",
      "type": "FILL_IN_BLANK"
    }
  ],
  "questionGroups": [
    {
      "id": 301,
      "title": "Grammar in Context",
      "type": "READING"
    }
  ]
}
```

---

## 🔄 Update Assessment Item

### Update chỉ Questions:
```http
PUT /assessment-items/1
Content-Type: application/json

{
  "questionIds": [106, 107, 108, 109, 110],
  "name": "Updated Vocabulary Set"
}
```

### Update chỉ Question Groups:
```http
PUT /assessment-items/2
Content-Type: application/json

{
  "questionGroupIds": [203, 204, 205]
}
```

### Update cả hai:
```http
PUT /assessment-items/3
Content-Type: application/json

{
  "questionIds": [113, 114],
  "questionGroupIds": [302, 303],
  "scorePerQuestion": 1.5
}
```

---

## 📖 Get Assessment Items

### Lấy 1 item:
```http
GET /assessment-items/1
```

### Lấy tất cả items của section:
```http
GET /assessment-items?sectionId=1&page=1&limit=20
```

### Lấy tất cả với sorting:
```http
GET /assessment-items?sortBy=order&sortOrder=asc&page=1&limit=50
```

---

## 🗑️ Delete Assessment Item

```http
DELETE /assessment-items/1
```

**Response:**
```json
{
  "message": "AssessmentItem deleted successfully"
}
```

---

## 🎓 Ví Dụ Thực Tế: Tạo Bài Thi JLPT N5

### Step 1: Tạo Assessment Paper & Sections
```http
POST /assessment-papers
{
  "title": "JLPT N5 Mock Test 01",
  "level": "N5",
  "type": "PLACEMENT"
}
```

### Step 2: Tạo Sections
```http
POST /assessment-sections
{
  "assessmentId": 1,
  "title": "文字・語彙 (Vocabulary)",
  "type": "VOCAB"
}

POST /assessment-sections
{
  "assessmentId": 1,
  "title": "文法 (Grammar)",
  "type": "GRAMMAR"
}

POST /assessment-sections
{
  "assessmentId": 1,
  "title": "読解 (Reading)",
  "type": "READING"
}

POST /assessment-sections
{
  "assessmentId": 1,
  "title": "聴解 (Listening)",
  "type": "LISTENING"
}
```

### Step 3: Tạo Items cho từng Section

#### 3.1. Vocabulary Section (20 câu)
```http
POST /assessment-items
{
  "sectionId": 1,
  "questionIds": [101, 102, 103, 104, 105, 106, 107, 108, 109, 110],
  "name": "語彙 Part 1",
  "scorePerQuestion": 1.0,
  "order": 0
}

POST /assessment-items
{
  "sectionId": 1,
  "questionIds": [111, 112, 113, 114, 115, 116, 117, 118, 119, 120],
  "name": "語彙 Part 2",
  "scorePerQuestion": 1.0,
  "order": 1
}
```

#### 3.2. Grammar Section (15 câu + 2 passages)
```http
POST /assessment-items
{
  "sectionId": 2,
  "questionIds": [201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215],
  "name": "文法 Part 1 - Basic",
  "scorePerQuestion": 1.0,
  "order": 0
}

POST /assessment-items
{
  "sectionId": 2,
  "questionGroupIds": [301, 302],
  "name": "文法 Part 2 - Context",
  "scorePerQuestion": 1.5,
  "order": 1
}
```

#### 3.3. Reading Section (3 passages)
```http
POST /assessment-items
{
  "sectionId": 3,
  "questionGroupIds": [401, 402, 403],
  "name": "読解 - Short Texts",
  "scorePerQuestion": 2.0,
  "order": 0
}
```

#### 3.4. Listening Section (2 groups)
```http
POST /assessment-items
{
  "sectionId": 4,
  "questionGroupIds": [501, 502],
  "name": "聴解 - Conversations",
  "scorePerQuestion": 2.0,
  "order": 0
}
```

---

## ✅ Validation & Error Handling

### ❌ Lỗi 1: Section không tồn tại
```http
POST /assessment-items
{
  "sectionId": 999,
  "questionIds": [1, 2, 3]
}
```
**Response (404):**
```json
{
  "statusCode": 404,
  "message": "AssessmentSection with ID 999 not found"
}
```

### ❌ Lỗi 2: Question không tồn tại
```http
POST /assessment-items
{
  "sectionId": 1,
  "questionIds": [9999, 8888]
}
```
**Response (400):**
```json
{
  "statusCode": 400,
  "message": "Some questions not found"
}
```

### ❌ Lỗi 3: Question Group không tồn tại
```http
POST /assessment-items
{
  "sectionId": 1,
  "questionGroupIds": [9999]
}
```
**Response (400):**
```json
{
  "statusCode": 400,
  "message": "Some question groups not found"
}
```

### ❌ Lỗi 4: Dùng sai tên field
```http
POST /assessment-items
{
  "sectionId": 1,
  "questionId": [1, 2, 3]    // ❌ SAI: thiếu 's'
}
```
**Response (500):**
```json
{
  "statusCode": 500,
  "message": "Unknown argument `questionId`. Did you mean `questions`?"
}
```

---

## 📊 Query Parameters cho GET

### Pagination:
```
?page=1&limit=20
```

### Filter by section:
```
?sectionId=1
```

### Sorting:
```
?sortBy=order&sortOrder=asc
?sortBy=name&sortOrder=desc
?sortBy=createdAt&sortOrder=desc
```

### Combined:
```
?sectionId=1&page=1&limit=10&sortBy=order&sortOrder=asc
```

---

## 🔐 Authentication

Tất cả endpoints yêu cầu Bearer token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 Summary của Field Names

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `sectionId` | `number` | ✅ Yes | ID của Assessment Section |
| `questionIds` | `number[]` | ❌ No | Array của Question IDs |
| `questionGroupIds` | `number[]` | ❌ No | Array của Question Group IDs |
| `name` | `string` | ❌ No | Tên của item |
| `order` | `number` | ❌ No | Thứ tự hiển thị (default: 0) |
| `scorePerQuestion` | `number` | ❌ No | Điểm mỗi câu hỏi |

**Lưu ý:**
- ✅ Có thể tạo item chỉ với `questionIds`
- ✅ Có thể tạo item chỉ với `questionGroupIds`
- ✅ Có thể tạo item với cả hai
- ✅ Có thể tạo item không có questions/groups (rỗng)

---

## 🎯 Quick Test Checklist

- [ ] Tạo item với 1 question
- [ ] Tạo item với nhiều questions (5+)
- [ ] Tạo item với 1 question group
- [ ] Tạo item với nhiều question groups (3+)
- [ ] Tạo item với cả questions và groups
- [ ] Get item by ID
- [ ] Get all items với pagination
- [ ] Update item - thay questions
- [ ] Update item - thay question groups
- [ ] Delete item
- [ ] Test validation - invalid sectionId
- [ ] Test validation - invalid questionIds
- [ ] Test validation - invalid questionGroupIds

---

## 🚀 Ready to Test!

Import file `TEST_DATA_ASSESSMENT_ITEM.json` vào Postman để có sẵn tất cả examples!
