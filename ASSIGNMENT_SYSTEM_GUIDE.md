# Assessment Assignment & Progress System Guide

## 📋 Tổng quan

Hệ thống Assignment cho phép Staff/Lecturer giao bài assessment cho students (cá nhân hoặc class) và theo dõi tiến trình làm bài.

## 🏗️ Kiến trúc

### 1. **AssessmentAssignment** (Giao bài)

- Staff/Lecturer tạo assignment gán cho user HOẶC class
- Có thể set thời gian bắt đầu/kết thúc
- Track status: PENDING, IN_PROGRESS, SUBMITTED, GRADED, OVERDUE
- Giới hạn số lần làm bài (maxAttempts)
- Lock sau khi hết hạn (lockAfterDue)

### 2. **AssessmentProgress** (Tiến trình làm bài)

- Lưu trạng thái làm bài của từng user
- Auto-save mọi thay đổi
- Track thời gian, section/question hiện tại
- Liên kết với assignment nếu được giao

### 3. **AssessmentAnswerProgress** (Câu trả lời)

- Lưu từng câu trả lời của user
- Có thể flag câu hỏi quan trọng
- Track thời gian làm từng câu

---

## 🔌 API Endpoints

### **AssessmentAssignment APIs**

#### 1. **Tạo Assignment** (Staff/Lecturer only)

```http
POST /assessment-assignments
Authorization: Bearer <token>
Content-Type: application/json

{
  "assessmentId": 1,
  "assignedToId": 5,        // Gán cho 1 user (optional)
  "classId": 2,             // HOẶC gán cho class (optional)
  "note": "Làm bài trước ngày 30/12",
  "startAt": "2025-01-20T00:00:00Z",
  "dueAt": "2025-01-30T23:59:59Z",
  "lockAfterDue": true,
  "maxAttempts": 3
}
```

**Lưu ý:**

- Phải có `assignedToId` HOẶC `classId` (hoặc cả 2)
- Nếu không gán cho ai cả thì tất cả có thể làm

#### 2. **Xem assignments được giao (Student)**

```http
GET /assessment-assignments/my/assignments?page=1&limit=10&status=PENDING
Authorization: Bearer <token>
```

Query params:

- `status`: PENDING | IN_PROGRESS | SUBMITTED | GRADED | OVERDUE
- `upcoming`: true (assignments sắp đến hạn)
- `overdue`: true (assignments quá hạn)

#### 3. **Xem assignments tự tạo (Teacher)**

```http
GET /assessment-assignments/created-by-me?page=1&limit=10
Authorization: Bearer <token>
```

#### 4. **Xem tiến trình students (Teacher)**

```http
GET /assessment-assignments/:id/progresses
Authorization: Bearer <token>
```

Response:

```json
{
  "progresses": [
    {
      "user": { "id": 5, "name": "Nguyen Van A" },
      "startedAt": "2025-01-20T10:00:00Z",
      "isSubmitted": false,
      "timeSpentSec": 1800,
      "currentSection": 2,
      "currentQuestion": 5
    }
  ],
  "stats": {
    "total": 25,
    "started": 20,
    "submitted": 15,
    "notStarted": 5
  }
}
```

#### 5. **Update/Delete Assignment**

```http
PUT /assessment-assignments/:id
DELETE /assessment-assignments/:id
Authorization: Bearer <token>
```

Chỉ creator mới có quyền update/delete

---

### **AssessmentProgress APIs**

#### 1. **Bắt đầu làm bài**

```http
POST /assessment-progress/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "assessmentId": 1,
  "assignmentId": 5     // Optional, nếu làm theo assignment
}
```

Response:

```json
{
  "message": "Assessment started successfully",
  "progress": {
    "id": 10,
    "assessmentId": 1,
    "userId": 5,
    "startedAt": "2025-01-20T10:00:00Z",
    "currentSection": 0,
    "currentQuestion": 0,
    "timeSpentSec": 0,
    "isSubmitted": false
  }
}
```

**Nếu đã có progress:**

```json
{
  "message": "Resuming existing progress",
  "progress": { ... }
}
```

#### 2. **Lưu câu trả lời**

```http
POST /assessment-progress/answers
Authorization: Bearer <token>
Content-Type: application/json

{
  "progressId": 10,
  "questionId": 25,
  "selectedOptionId": 102,
  "timeSpentSec": 45,
  "isFlagged": false
}
```

**Cập nhật câu trả lời:**

```http
PUT /assessment-progress/answers/:answerId
Authorization: Bearer <token>

{
  "selectedOptionId": 103,
  "timeSpentSec": 60,
  "isFlagged": true
}
```

#### 3. **Auto-save tiến trình**

```http
POST /assessment-progress/auto-save
Authorization: Bearer <token>

{
  "progressId": 10,
  "currentSection": 2,
  "currentQuestion": 5,
  "timeSpentSec": 1800
}
```

Gọi endpoint này định kỳ (mỗi 30s-1 phút) để lưu trạng thái

#### 4. **Nộp bài**

```http
POST /assessment-progress/submit
Authorization: Bearer <token>

{
  "progressId": 10
}
```

Response:

```json
{
  "message": "Assessment submitted successfully",
  "progress": {
    "id": 10,
    "isSubmitted": true,
    "completedAt": "2025-01-20T12:30:00Z",
    "timeSpentSec": 5400
  }
}
```

#### 5. **Xem tiến trình của mình**

```http
GET /assessment-progress/my?page=1&limit=10&isSubmitted=false
Authorization: Bearer <token>
```

**Xem progress cụ thể:**

```http
GET /assessment-progress/:progressId
Authorization: Bearer <token>
```

**Xem tất cả answers:**

```http
GET /assessment-progress/:progressId/answers
Authorization: Bearer <token>
```

#### 6. **Xem thống kê**

```http
GET /assessment-progress/my/stats
Authorization: Bearer <token>
```

Response:

```json
{
  "completed": 15,
  "inProgress": 3,
  "total": 18
}
```

#### 7. **Xóa progress chưa nộp**

```http
DELETE /assessment-progress/:progressId
Authorization: Bearer <token>
```

---

## 🔐 Phân quyền

### **Staff/Lecturer/Admin:**

- ✅ Tạo/sửa/xóa assignments
- ✅ Xem tất cả progresses
- ✅ Xem thống kê chi tiết
- ✅ Xem danh sách students đã/chưa làm

### **Student/Customer:**

- ✅ Xem assignments được giao
- ✅ Bắt đầu/làm bài/nộp bài
- ✅ Xem progress và answers của mình
- ✅ Xóa progress chưa nộp (để làm lại)

---

## 💾 Database Schema

### **AssessmentAssignment**

```prisma
model AssessmentAssignment {
  id             Int        @id @default(autoincrement())
  assessmentId   Int
  assignedById   Int        // Staff/Lecturer gán
  assignedToId   Int?       // User được gán (optional)
  classId        Int?       // Class được gán (optional)
  note           String?
  startAt        DateTime?
  dueAt          DateTime?
  lockAfterDue   Boolean    @default(false)
  maxAttempts    Int?
  status         AssignmentStatus @default(PENDING)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  assessment     AssessmentPaper
  assignedBy     User
  assignedTo     User?
  class          Class?
  progresses     AssessmentProgress[]
}
```

### **AssessmentProgress**

```prisma
model AssessmentProgress {
  id              Int      @id @default(autoincrement())
  assessmentId    Int
  userId          Int
  assignmentId    Int?
  startedAt       DateTime @default(now())
  lastSavedAt     DateTime @updatedAt
  currentSection  Int?
  currentQuestion Int?
  timeSpentSec    Int      @default(0)
  isSubmitted     Boolean  @default(false)
  completedAt     DateTime?
  remainingSec    Int?

  assessment      AssessmentPaper
  user            User
  assignment      AssessmentAssignment?
  answers         AssessmentAnswerProgress[]

  @@unique([assessmentId, userId])
}
```

### **AssessmentAnswerProgress**

```prisma
model AssessmentAnswerProgress {
  id               Int      @id @default(autoincrement())
  progressId       Int
  questionId       Int
  selectedOptionId Int?
  lastUpdatedAt    DateTime @default(now())
  timeSpentSec     Int      @default(0)
  isFlagged        Boolean  @default(false)

  progress         AssessmentProgress
  question         Question
  selectedOption   Option?

  @@unique([progressId, questionId])
}
```

---

## 🎯 Use Cases

### **1. Teacher giao bài cho class**

```typescript
// Step 1: Teacher tạo assignment
POST /assessment-assignments
{
  "assessmentId": 1,
  "classId": 2,
  "dueAt": "2025-01-30T23:59:59Z",
  "maxAttempts": 2,
  "lockAfterDue": true
}

// Step 2: Students xem assignments
GET /assessment-assignments/my/assignments

// Step 3: Student bắt đầu làm
POST /assessment-progress/start
{
  "assessmentId": 1,
  "assignmentId": 5
}

// Step 4: Student làm bài
POST /assessment-progress/answers (nhiều lần)
POST /assessment-progress/auto-save (định kỳ)

// Step 5: Student nộp bài
POST /assessment-progress/submit

// Step 6: Teacher xem kết quả
GET /assessment-assignments/5/progresses
```

### **2. Student tự làm bài (không có assignment)**

```typescript
// Step 1: Bắt đầu
POST /assessment-progress/start
{
  "assessmentId": 1
}

// Step 2: Làm bài như bình thường
// Step 3: Nộp bài
```

### **3. Resume bài làm dở**

```typescript
// Step 1: Xem progress
GET /assessment-progress/assessment/1/my

// Response nếu đã bắt đầu:
{
  "hasStarted": true,
  "progress": {
    "id": 10,
    "currentSection": 2,
    "currentQuestion": 5,
    "timeSpentSec": 1800
  }
}

// Step 2: Tiếp tục làm từ vị trí cũ
// Frontend load currentSection/currentQuestion và tiếp tục
```

---

## ⚙️ Frontend Integration

### **React/Next.js Example**

```typescript
// 1. Start Assessment
const startAssessment = async (assessmentId: number, assignmentId?: number) => {
  const response = await fetch('/assessment-progress/start', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assessmentId, assignmentId }),
  })
  return response.json()
}

// 2. Auto-save every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetch('/assessment-progress/auto-save', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progressId,
        currentSection,
        currentQuestion,
        timeSpentSec,
      }),
    })
  }, 30000) // 30 seconds

  return () => clearInterval(interval)
}, [progressId, currentSection, currentQuestion, timeSpentSec])

// 3. Save answer when user selects
const saveAnswer = async (questionId: number, selectedOptionId: number) => {
  await fetch('/assessment-progress/answers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      progressId,
      questionId,
      selectedOptionId,
      timeSpentSec: getQuestionTime(),
    }),
  })
}

// 4. Submit assessment
const submitAssessment = async () => {
  await fetch('/assessment-progress/submit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ progressId }),
  })
}
```

---

## 🚀 Testing

### **Manual Testing Checklist**

- [ ] Staff tạo assignment cho 1 user
- [ ] Staff tạo assignment cho class
- [ ] Student xem assignments được giao
- [ ] Student bắt đầu làm bài
- [ ] Student lưu câu trả lời
- [ ] Auto-save hoạt động
- [ ] Student nộp bài
- [ ] Teacher xem tiến trình students
- [ ] Student không thể sửa sau khi nộp
- [ ] Assignment quá hạn bị lock (nếu lockAfterDue=true)
- [ ] Thống kê hiển thị đúng

---

## 📝 Notes

1. **Unique constraint:** Mỗi user chỉ có 1 progress cho 1 assessment (không thể làm nhiều lần cùng lúc)
2. **Resume:** Nếu gọi `/start` mà đã có progress thì trả về progress cũ
3. **Auto-save:** Nên gọi định kỳ để tránh mất dữ liệu khi browser crash
4. **Flag question:** Student có thể flag câu khó để xem lại sau
5. **Time tracking:** Track time cho cả assessment và từng câu hỏi

---

## 🐛 Common Issues

### **"Assessment already submitted"**

- User đã nộp bài, không thể sửa
- Giải pháp: Xóa progress và làm lại (nếu được phép)

### **"You have already completed this assessment"**

- User đã nộp bài, không thể start lại
- Giải pháp: DELETE progress cũ (nếu chưa submitted)

### **"Cannot find progress"**

- User chưa bắt đầu
- Giải pháp: Gọi `/start` trước

---

## 📚 Related Documentation

- [Question Versioning Guide](./VERSIONING_GUIDE.md)
- [Assessment Paper Structure](../assessment-paper/)
- [Grading System](../assessment-attempt/grading.helper.ts)

---

Hệ thống đã sẵn sàng sử dụng! 🎉
