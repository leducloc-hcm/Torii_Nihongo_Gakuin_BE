# Attribute Data Dictionary — Torii Nihongo Gakuin

## Database Overview

| No | Service | Schema | Tables |
|----|---------|--------|--------|
| 1 | Learning Service | `learning` | 45 tables |
| 2 | Gamification Service | `gamification` | 10 tables |
| 3 | Assessment Service | `assessment` | 17 tables |

---

## 1. Learning Service (`learning` schema)

### 1.1 User

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | email | varchar | Yes | | Unique email address |
| 3 | password | varchar | Yes | | Hashed password |
| 4 | name | varchar | Yes | | Display name |
| 5 | role | enum(CUSTOMER, STAFF, LECTURER, ADMIN) | Yes | | User role, default CUSTOMER |
| 6 | status | enum(UNVERIFIED, VERIFIED, BANNED) | Yes | | Verification status, default UNVERIFIED |
| 7 | bio | text | No | | User biography |
| 8 | totpSecret | varchar(1000) | No | | TOTP 2FA secret key |
| 9 | createdAt | timestamp | Yes | | Account creation time |
| 10 | updatedAt | timestamp | Yes | | Last update time |
| 11 | deletedAt | timestamp | No | | Soft delete timestamp |

### 1.2 CustomerProfile

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | name | varchar | No | | Display name |
| 3 | bio | text | No | | Biography |
| 4 | location | varchar | No | | Location |
| 5 | username | varchar | No | | Unique username |
| 6 | avatar | varchar | No | | Avatar URL |
| 7 | cover_photo | varchar | No | | Cover photo URL |
| 8 | description | text | No | | Profile description |
| 9 | phone_number | varchar | No | | Phone number |
| 10 | date_of_birth | timestamp | No | | Date of birth |
| 11 | website | varchar | No | | Personal website URL |
| 12 | user_id | int | Yes | FK → User.id | Unique, links to User |

### 1.3 LecturerProfile

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | Unique, links to User |
| 3 | name | varchar | No | | Display name |
| 4 | bio | text | No | | Biography |
| 5 | location | varchar | No | | Location |
| 6 | username | varchar | No | | Unique username |
| 7 | avatar | varchar | No | | Avatar URL |
| 8 | cover_photo | varchar | No | | Cover photo URL |
| 9 | description | text | No | | Profile description |
| 10 | phone_number | varchar | No | | Phone number |
| 11 | date_of_birth | timestamp | No | | Date of birth |
| 12 | website | varchar | No | | Personal website URL |
| 13 | social_links | text[] | Yes | | Array of social media links |

### 1.4 StaffProfile

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | Unique, links to User |
| 3 | name | varchar | No | | Display name |
| 4 | bio | text | No | | Biography |
| 5 | location | varchar | No | | Location |
| 6 | username | varchar | No | | Unique username |
| 7 | avatar | varchar | No | | Avatar URL |
| 8 | cover_photo | varchar | No | | Cover photo URL |
| 9 | description | text | No | | Profile description |
| 10 | phone_number | varchar | No | | Phone number |
| 11 | date_of_birth | timestamp | No | | Date of birth |
| 12 | website | varchar | No | | Personal website URL |

### 1.5 AdminProfile

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | Unique, links to User |
| 3 | name | varchar | No | | Display name |
| 4 | bio | text | No | | Biography |
| 5 | location | varchar | No | | Location |
| 6 | username | varchar | No | | Unique username |
| 7 | avatar | varchar | No | | Avatar URL |
| 8 | cover_photo | varchar | No | | Cover photo URL |
| 9 | description | text | No | | Profile description |
| 10 | phone_number | varchar | No | | Phone number |
| 11 | date_of_birth | timestamp | No | | Date of birth |
| 12 | website | varchar | No | | Personal website URL |

### 1.6 Device

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | Owner user (CASCADE delete) |
| 3 | userAgent | varchar | Yes | | Browser user agent string |
| 4 | ip | varchar | Yes | | IP address |
| 5 | device_name | varchar | No | | Device name |
| 6 | browser_name | varchar | No | | Browser name |
| 7 | os_name | varchar | No | | Operating system name |
| 8 | location | varchar | No | | Device location |
| 9 | lastActive | timestamp | Yes | | Last activity time (auto-updated) |
| 10 | createdAt | timestamp | Yes | | Creation time |
| 11 | isActive | boolean | Yes | | Active status, default true |

### 1.7 RefreshToken

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | token | varchar(1000) | Yes | UQ | Unique refresh token string |
| 2 | userId | int | Yes | FK → User.id | Token owner (CASCADE delete) |
| 3 | deviceId | int | Yes | FK → Device.id | Associated device (CASCADE delete) |
| 4 | expiresAt | timestamp | Yes | | Expiration time (indexed) |
| 5 | createdAt | timestamp | Yes | | Creation time |

### 1.8 VerificationCode

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | email | varchar(500) | Yes | | Email address (unique with type) |
| 3 | code | varchar(50) | Yes | | Verification code |
| 4 | type | enum(REGISTER, FORGOT_PASSWORD, LOGIN, DISABLE_2FA) | Yes | | Code type |
| 5 | expiresAt | timestamp | Yes | | Expiration time (indexed) |
| 6 | createdAt | timestamp | Yes | | Creation time |

### 1.9 Specialty

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | name | varchar | Yes | | Specialty/certification name |
| 3 | issuingOrganization | varchar | No | | Issuing organization |
| 4 | issueDate | timestamp | No | | Issue date |
| 5 | expirationDate | timestamp | No | | Expiration date |
| 6 | credentialId | varchar | No | | Credential ID |
| 7 | credentialUrl | varchar | No | | Credential verification URL |
| 8 | logoUrl | varchar | No | | Logo image URL |
| 9 | description | text | No | | Description |
| 10 | skills | text[] | Yes | | Array of skills, default [] |
| 11 | lecturerId | int | Yes | FK → LecturerProfile.id | Lecturer (CASCADE delete) |
| 12 | created_at | timestamp | Yes | | Creation time |
| 13 | updated_at | timestamp | Yes | | Last update time |

### 1.10 Notification

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | type | enum(NotificationType) | Yes | | Notification type (indexed) |
| 3 | title | varchar | Yes | | Notification title |
| 4 | message | text | Yes | | Notification message body |
| 5 | status | enum(UNREAD, READ, ARCHIVED) | Yes | | Read status, default UNREAD |
| 6 | priority | enum(LOW, NORMAL, HIGH, URGENT) | Yes | | Priority, default NORMAL |
| 7 | data | json | No | | Additional metadata |
| 8 | action_url | varchar | No | | Action link URL |
| 9 | user_id | int | Yes | FK → User.id | Target user (CASCADE delete) |
| 10 | related_user_id | int | No | | Related user ID |
| 11 | entity_id | int | No | | Related entity ID |
| 12 | entity_type | varchar | No | | Related entity type |
| 13 | created_at | timestamp | Yes | | Creation time |
| 14 | read_at | timestamp | No | | Time notification was read |
| 15 | expires_at | timestamp | No | | Expiration time |

### 1.11 Websocket

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | varchar | Yes | PK | Socket connection ID |
| 2 | userId | int | Yes | FK → User.id | Connected user (CASCADE delete) |
| 3 | createdAt | timestamp | Yes | | Connection time |

### 1.12 Course

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | slug | varchar | Yes | | Unique URL slug |
| 3 | title | varchar | Yes | | Course title |
| 4 | subtitle | varchar | No | | Course subtitle |
| 5 | description | text | No | | Course description |
| 6 | level | enum(N5, N4, N3, N2, N1) | Yes | | JLPT level |
| 7 | courseType | enum(VIDEO_QUIZ, VIDEO_QUIZ_LIVE, LIVE_ONLY) | Yes | | Course type, default VIDEO_QUIZ |
| 8 | thumbnailUrl | varchar | No | | Thumbnail image URL |
| 9 | price | int | Yes | | Price in smallest unit, default 0 |
| 10 | status | enum(DRAFT, PENDING_REVIEW, PUBLISHED, ARCHIVED) | Yes | | default DRAFT |
| 11 | createdAt | timestamp | Yes | | Creation time |
| 12 | updatedAt | timestamp | Yes | | Last update time |
| 13 | createdBy | int | Yes | | Creator user ID |
| 14 | lecturerIds | int[] | Yes | | Array of lecturer user IDs |

### 1.13 Module

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | courseId | int | Yes | FK → Course.id | Parent course |
| 3 | title | varchar | Yes | | Module title |
| 4 | order | int | Yes | | Display order, default 0 |

### 1.14 Lesson

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | moduleId | int | Yes | FK → Module.id | Parent module |
| 3 | title | varchar | Yes | | Lesson title |
| 4 | kind | enum(VIDEO, ARTICLE, QUIZ, LIVE) | Yes | | Lesson type, default VIDEO |
| 5 | content | text | No | | Lesson content |
| 6 | durationSec | int | No | | Duration in seconds |
| 7 | mediaId | int | No | | Legacy media reference |
| 8 | order | int | Yes | | Display order, default 0 |
| 9 | createdAt | timestamp | Yes | | Creation time |
| 10 | updatedAt | timestamp | Yes | | Last update time |
| 11 | status | enum(PRIVATE, PUBLISHED, GLOBAL_PUBLIC) | Yes | | default PRIVATE |

### 1.15 MediaAsset

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | lessonId | int | No | FK → Lesson.id | Associated lesson |
| 3 | url | varchar | Yes | | Media file URL |
| 4 | kind | enum(AUDIO, VIDEO, IMAGE, PDF, OTHER) | Yes | | Media type, default OTHER |
| 5 | status | enum(UPLOADING, TRANSCODING, READY, FAILED) | Yes | | default UPLOADING |
| 6 | mimeType | varchar | No | | MIME type |
| 7 | sizeByte | int | No | | File size in bytes |
| 8 | caption | varchar | No | | Caption text |
| 9 | meta | json | No | | Additional metadata |
| 10 | createdAt | timestamp | Yes | | Creation time |

### 1.16 Enrollment

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | Enrolled user (unique with courseId) |
| 3 | courseId | int | Yes | FK → Course.id | Enrolled course |
| 4 | courseType | enum(VIDEO_QUIZ, VIDEO_QUIZ_LIVE, LIVE_ONLY) | Yes | | Course type at enrollment |
| 5 | createdAt | timestamp | Yes | | Enrollment time |
| 6 | expiresAt | timestamp | No | | Enrollment expiration |

### 1.17 LessonNote

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | Note author |
| 3 | lessonId | int | Yes | FK → Lesson.id | Associated lesson |
| 4 | title | varchar | No | | Note title |
| 5 | body | text | Yes | | Note content |
| 6 | timestampSec | int | No | | Video timestamp in seconds |
| 7 | createdAt | timestamp | Yes | | Creation time |
| 8 | updatedAt | timestamp | Yes | | Last update time |

### 1.18 LessonProgress

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | User (unique with lessonId) |
| 3 | lessonId | int | Yes | FK → Lesson.id | Lesson (CASCADE delete) |
| 4 | watchedSec | int | Yes | | Total watched seconds, default 0 |
| 5 | lastPositionSec | int | Yes | | Last playback position, default 0 |
| 6 | completed | boolean | Yes | | Completion flag, default false |
| 7 | createdAt | timestamp | Yes | | Creation time |
| 8 | updatedAt | timestamp | Yes | | Last update time |

### 1.19 Class

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | courseId | int | No | FK → Course.id | Associated course |
| 3 | title | varchar | Yes | | Class title |
| 4 | description | text | No | | Class description |
| 5 | lecturerId | int | Yes | FK → User.id | Assigned lecturer |
| 6 | startDate | timestamp | No | | Class start date |
| 7 | endDate | timestamp | No | | Class end date |
| 8 | capacity | int | Yes | | Max students, default 20 |
| 9 | isActive | boolean | Yes | | Active status, default true |
| 10 | createdAt | timestamp | Yes | | Creation time |
| 11 | folderId | int | No | | Unique linked folder ID |

### 1.20 ClassMember

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | classId | int | Yes | FK → Class.id | Class (unique with userId) |
| 3 | userId | int | Yes | FK → User.id | Member user |
| 4 | role | enum(CUSTOMER, STAFF, LECTURER, ADMIN) | Yes | | Member role |
| 5 | joinedAt | timestamp | Yes | | Join time |

### 1.21 Certificate

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | Certificate holder (unique with courseId) |
| 3 | courseId | int | Yes | FK → Course.id | Completed course |
| 4 | issuedAt | timestamp | Yes | | Issue date |
| 5 | verifyCode | varchar | Yes | | Unique verification code |
| 6 | pdfUrl | varchar | No | | PDF download URL |

### 1.22 LiveSession

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | classId | int | Yes | FK → Class.id | Parent class |
| 3 | lessonId | int | No | FK → Lesson.id | Unique linked lesson |
| 4 | title | varchar | Yes | | Session title |
| 5 | scheduledAt | timestamp | Yes | | Scheduled start time |
| 6 | endedAt | timestamp | No | | Actual end time |
| 7 | janusRoomId | int | No | | Janus WebRTC room ID |
| 8 | recordingUrl | varchar | No | | Recording URL |
| 9 | whiteboardSnapshot | json | No | | Whiteboard state snapshot |
| 10 | substitute_lecturer_id | int | No | FK → User.id | Substitute lecturer |

### 1.23 LiveSessionMedia

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | liveSessionId | int | Yes | PK, FK → LiveSession.id | Composite PK (CASCADE delete) |
| 2 | mediaAssetId | int | Yes | PK, FK → MediaAsset.id | Composite PK (CASCADE delete) |

### 1.24 Attendance

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | sessionId | int | Yes | FK → LiveSession.id | Session (unique with userId) |
| 3 | userId | int | Yes | FK → User.id | Attendee |
| 4 | status | enum(PRESENT, LATE, ABSENT, EXCUSED) | Yes | | default PRESENT |
| 5 | joinedAt | timestamp | Yes | | Join time |
| 6 | leftAt | timestamp | No | | Leave time |

### 1.25 LiveChatMessage

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | sessionId | int | Yes | FK → LiveSession.id | Parent session |
| 3 | userId | int | Yes | FK → User.id | Message sender |
| 4 | content | text | Yes | | Message content |
| 5 | createdAt | timestamp | Yes | | Send time |

### 1.26 RaiseHand

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | sessionId | int | Yes | FK → LiveSession.id | Parent session |
| 3 | userId | int | Yes | FK → User.id | User raising hand |
| 4 | createdAt | timestamp | Yes | | Raise time |
| 5 | resolved | boolean | Yes | | Resolved flag, default false |

### 1.27 ResourcePing

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | sessionId | int | Yes | FK → LiveSession.id | Parent session |
| 3 | title | varchar | Yes | | Resource title |
| 4 | url | varchar | Yes | | Resource URL |
| 5 | createdAt | timestamp | Yes | | Creation time |

### 1.28 LiveNote

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | sessionId | int | Yes | FK → LiveSession.id | Parent session |
| 3 | userId | int | Yes | FK → User.id | Note author |
| 4 | title | varchar | No | | Note title |
| 5 | body | text | Yes | | Note content |
| 6 | createdAt | timestamp | Yes | | Creation time |

### 1.29 FlashcardDeck

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | ownerId | int | Yes | FK → User.id | Deck owner |
| 3 | title | varchar | Yes | | Deck title |
| 4 | level | enum(N5, N4, N3, N2, N1) | No | | JLPT level |
| 5 | visibility | enum(PRIVATE, UNLISTED, PUBLIC) | Yes | | default PRIVATE |
| 6 | createdAt | timestamp | Yes | | Creation time |
| 7 | updatedAt | timestamp | Yes | | Last update time |

### 1.30 Flashcard

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | deckId | int | Yes | FK → FlashcardDeck.id | Parent deck |
| 3 | front | text | Yes | | Front side content |
| 4 | back | text | Yes | | Back side content |
| 5 | examples | text | No | | Usage examples |
| 6 | hints | text | No | | Hints |
| 7 | tags | text[] | Yes | | Tag array |
| 8 | aiMeta | json | No | | AI-generated metadata |
| 9 | createdAt | timestamp | Yes | | Creation time |

### 1.31 CardProgress

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | User (unique with cardId) |
| 3 | cardId | int | Yes | FK → Flashcard.id | Card |
| 4 | ef | float | Yes | | Easiness factor (SM-2), default 2.5 |
| 5 | interval | int | Yes | | Review interval in days, default 0 |
| 6 | repetitions | int | Yes | | Repetition count, default 0 |
| 7 | dueAt | timestamp | Yes | | Next review date |
| 8 | lastGrade | int | No | | Last review grade |

### 1.32 WrongTerm

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | User (unique with term) |
| 3 | term | varchar | Yes | | Wrong term text |
| 4 | level | enum(N5, N4, N3, N2, N1) | No | | JLPT level |
| 5 | count | int | Yes | | Occurrence count, default 1 |
| 6 | lastSeen | timestamp | Yes | | Last seen time |

### 1.33 Folder

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | ownerId | int | Yes | FK → User.id | Folder owner |
| 3 | name | varchar | Yes | | Folder name |
| 4 | parentId | int | No | FK → Folder.id | Parent folder (self-reference) |
| 5 | classId | int | No | FK → Class.id | Unique linked class |
| 6 | totalSizeByte | bigint | Yes | | Total size in bytes, default 0 |

### 1.34 Resource

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | ownerId | int | Yes | FK → User.id | Resource author |
| 3 | folderId | int | No | FK → Folder.id | Parent folder |
| 4 | title | varchar | Yes | | Resource title |
| 5 | body | text | No | | Resource body content |
| 6 | mediaUrl | varchar | No | | Media file URL |
| 7 | sizeByte | bigint | No | | File size in bytes |
| 8 | s3Key | varchar | No | | S3 storage key |
| 9 | visibility | enum(PRIVATE, UNLISTED, PUBLIC) | Yes | | default PRIVATE |
| 10 | tags | text[] | Yes | | Tag array |
| 11 | createdAt | timestamp | Yes | | Creation time |
| 12 | updatedAt | timestamp | Yes | | Last update time |

### 1.35 Reaction

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | resourceId | int | Yes | FK → Resource.id | Target resource (unique with userId) |
| 3 | userId | int | Yes | FK → User.id | Reacting user |
| 4 | kind | enum(LIKE, LOVE, HELPFUL) | Yes | | Reaction type |
| 5 | createdAt | timestamp | Yes | | Reaction time |

### 1.36 Comment

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | resourceId | int | Yes | FK → Resource.id | Target resource |
| 3 | userId | int | Yes | FK → User.id | Comment author |
| 4 | body | text | Yes | | Comment body |
| 5 | createdAt | timestamp | Yes | | Creation time |

### 1.37 FolderPermission

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | folderId | int | Yes | FK → Folder.id | Folder (unique with userId, CASCADE delete) |
| 3 | userId | int | Yes | FK → User.id | Permitted user (CASCADE delete) |
| 4 | permission | enum(VIEW_ONLY, EDIT) | Yes | | Permission type, default VIEW_ONLY |
| 5 | grantedAt | timestamp | Yes | | Permission grant time |
| 6 | grantedBy | int | No | | Granting user ID |

### 1.38 Cart

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | Unique cart owner (CASCADE delete) |
| 3 | createdAt | timestamp | Yes | | Creation time |
| 4 | updatedAt | timestamp | Yes | | Last update time |

### 1.39 CartItem

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | cartId | int | Yes | FK → Cart.id | Parent cart (unique with courseId, CASCADE delete) |
| 3 | courseId | int | Yes | FK → Course.id | Course in cart |
| 4 | classId | int | No | FK → Class.id | Selected class |

### 1.40 Order

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | Ordering user |
| 3 | totalAmount | int | Yes | | Total amount in smallest currency unit |
| 4 | status | enum(PENDING, PROCESSING, COMPLETED, CANCELLED, PARTIALLY_REFUNDED, REFUNDED) | Yes | | default PENDING |
| 5 | providerRef | varchar | No | | Payment provider reference |
| 6 | createdAt | timestamp | Yes | | Creation time |
| 7 | updatedAt | timestamp | Yes | | Last update time |
| 8 | couponId | int | No | FK → Coupon.id | Applied coupon |

### 1.41 Payment

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | orderId | int | Yes | FK → Order.id | Parent order (CASCADE delete) |
| 3 | amount | int | Yes | | Payment amount |
| 4 | method | enum(SEPAY, VNPAY, MOMO, BANK_TRANSFER, CASH) | Yes | | default SEPAY |
| 5 | status | enum(PENDING, PROCESSING, PAID, FAILED, REFUNDED, CANCELLED) | Yes | | default PENDING |
| 6 | providerRef | varchar | No | | Provider reference (indexed) |
| 7 | providerTransactionId | varchar | No | | Unique provider transaction ID |
| 8 | providerResponse | json | No | | Raw provider response |
| 9 | failureReason | varchar | No | | Failure reason |
| 10 | processedAt | timestamp | No | | Processing time |
| 11 | createdAt | timestamp | Yes | | Creation time |
| 12 | updatedAt | timestamp | Yes | | Last update time |

### 1.42 OrderItem

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | orderId | int | Yes | FK → Order.id | Parent order |
| 3 | type | enum(COURSE, LIVE_SESSION, PACKAGE) | Yes | | Item type |
| 4 | courseId | int | No | FK → Course.id | Associated course |
| 5 | classId | int | No | FK → Class.id | Associated class |
| 6 | unitPrice | int | Yes | | Item price |

### 1.43 Coupon

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | code | varchar | Yes | | Unique coupon code |
| 3 | title | varchar | Yes | | Coupon title |
| 4 | description | text | No | | Coupon description |
| 5 | type | enum(DISCOUNT_SINGLE, DISCOUNT_MULTI, GIFT) | Yes | | Coupon type |
| 6 | discountType | enum(PERCENTAGE, FIXED_AMOUNT) | No | | Discount calculation type |
| 7 | discountValue | int | No | | Percentage (1-100) or fixed amount |
| 8 | minOrderAmount | int | No | | Minimum order amount |
| 9 | maxDiscountAmount | int | No | | Maximum discount cap |
| 10 | maxRedemptions | int | No | | Global usage limit |
| 11 | perUserLimit | int | No | | Per-user usage limit |
| 12 | newUsersOnly | boolean | Yes | | Restrict to new users, default false |
| 13 | requireFullCombo | boolean | Yes | | Require all courses for DISCOUNT_MULTI, default false |
| 14 | startsAt | timestamp | No | | Coupon start date |
| 15 | endsAt | timestamp | No | | Coupon end date |
| 16 | status | enum(DRAFT, PENDING_APPROVAL, APPROVED, ACTIVE, INACTIVE, EXPIRED, REJECTED) | Yes | | default DRAFT |
| 17 | createdBy | int | Yes | FK → User.id | Creator |
| 18 | approvedBy | int | No | FK → User.id | Approver |
| 19 | rejectedBy | int | No | FK → User.id | Rejector |
| 20 | approvalNote | text | No | | Approval/rejection note |
| 21 | createdAt | timestamp | Yes | | Creation time |
| 22 | updatedAt | timestamp | Yes | | Last update time |
| 23 | giftMessage | text | No | | Gift message |
| 24 | extendDays | int | No | | Days to extend video courses, default 30 |
| 25 | purchasedBy | int | No | FK → User.id | Gift purchaser |
| 26 | purchaseOrderId | int | No | | Order that created this gift |
| 27 | recipientEmail | varchar | No | | Gift recipient email |
| 28 | recipientName | varchar | No | | Gift recipient name |
| 29 | purchasedAt | timestamp | No | | Gift purchase time |
| 30 | isGiftPurchase | boolean | Yes | | Purchased gift flag, default false |

### 1.44 CouponCourse

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | couponId | int | Yes | FK → Coupon.id | Coupon (unique with courseId, CASCADE delete) |
| 3 | courseId | int | Yes | FK → Course.id | Applicable course |
| 4 | required | boolean | Yes | | Required for combo, default true |

### 1.45 CouponRedemption

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | couponId | int | Yes | FK → Coupon.id | Redeemed coupon (unique with userId) |
| 3 | userId | int | Yes | FK → User.id | Redeeming user |
| 4 | orderId | int | No | FK → Order.id | Unique linked order |
| 5 | discountApplied | int | No | | Amount discounted |
| 6 | giftedCourses | json | No | | Array of gifted course actions |
| 7 | pendingClassSelections | int[] | Yes | | CourseIds awaiting class selection |
| 8 | status | enum(PENDING, COMPLETED, FAILED, PARTIALLY_COMPLETED) | Yes | | default COMPLETED |
| 9 | redeemedAt | timestamp | Yes | | Redemption time |
| 10 | completedAt | timestamp | No | | Completion time |

### 1.46 CouponAuditLog

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | couponId | int | Yes | FK → Coupon.id | Audited coupon (CASCADE delete) |
| 3 | userId | int | Yes | FK → User.id | Actor |
| 4 | action | enum(CREATED, UPDATED, SUBMITTED_FOR_APPROVAL, APPROVED, REJECTED, ACTIVATED, DEACTIVATED, REDEEMED) | Yes | | Audit action |
| 5 | oldValues | json | No | | Previous field values |
| 6 | newValues | json | No | | Updated field values |
| 7 | note | text | No | | Audit note |
| 8 | createdAt | timestamp | Yes | | Audit time |

### 1.47 Review

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | courseId | int | Yes | FK → Course.id | Reviewed course (unique with userId) |
| 3 | userId | int | Yes | FK → User.id | Reviewer |
| 4 | rating | int | Yes | | Rating value |
| 5 | comment | text | No | | Review comment |
| 6 | createdAt | timestamp | Yes | | Creation time |
| 7 | updatedAt | timestamp | Yes | | Last update time |
| 8 | helpfulCount | int | Yes | | Helpful votes, default 0 |
| 9 | notHelpfulCount | int | Yes | | Not helpful votes, default 0 |
| 10 | status | enum(VISIBLE, HIDDEN, FLAGGED) | Yes | | default VISIBLE |

### 1.48 ReviewVote

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | reviewId | int | Yes | FK → Review.id | Voted review (unique with userId, CASCADE delete) |
| 3 | userId | int | Yes | FK → User.id | Voter |
| 4 | isHelpful | boolean | Yes | | Helpful or not |
| 5 | createdAt | timestamp | Yes | | Vote time |

### 1.49 Blog

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | title | varchar | Yes | | Blog title |
| 3 | content | text | Yes | | Blog content (HTML/Markdown) |
| 4 | image | varchar | No | | Featured image URL |
| 5 | slug | varchar | Yes | | Unique URL slug |
| 6 | date | timestamp | Yes | | Publish date |
| 7 | author_id | int | Yes | FK → User.id | Author (CASCADE delete) |

### 1.50 Tag

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | name | varchar | Yes | | Tag name |
| 3 | description | text | No | | Tag description |
| 4 | slug | varchar | Yes | | Unique URL slug |

### 1.51 BlogTag

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | blogId | int | Yes | PK, FK → Blog.id | Blog (CASCADE delete) |
| 2 | tagId | int | Yes | PK, FK → Tag.id | Tag (CASCADE delete) |

### 1.52 AdSlot

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | key | varchar | Yes | | Unique slot key identifier |
| 3 | active | boolean | Yes | | Active status, default true |

### 1.53 AdCreative

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | slotId | int | Yes | FK → AdSlot.id | Parent ad slot |
| 3 | title | varchar | Yes | | Creative title |
| 4 | imageUrl | varchar | No | | Image URL |
| 5 | targetUrl | varchar | Yes | | Click target URL |
| 6 | startsAt | timestamp | No | | Display start time |
| 7 | endsAt | timestamp | No | | Display end time |

### 1.54 AIThread

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | Thread owner |
| 3 | title | varchar | No | | Thread title |
| 4 | createdAt | timestamp | Yes | | Creation time |
| 5 | updatedAt | timestamp | Yes | | Last update time |

### 1.55 AIQuery

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | cuid | Yes | PK | CUID primary key |
| 2 | threadId | int | Yes | FK → AIThread.id | Parent thread (CASCADE delete) |
| 3 | userId | int | Yes | FK → User.id | Query author |
| 4 | query | text | Yes | | Query text |
| 5 | queryType | enum(COURSE, BLOG, LESSON, FLASHCARD, ASSESSMENT, ASSESSMENT_HISTORY, ENROLLMENT, PROGRESS, GRAMMAR, TRANSLATION, GENERAL) | Yes | | Query type |
| 6 | agentRole | enum(SENSEI, ASSESSMENT, ANALYTICS) | Yes | | AI agent role, default SENSEI |
| 7 | routingReason | varchar | No | | Routing explanation |
| 8 | initialResponse | text | No | | Initial AI response |
| 9 | executedTools | json | No | | Tool calls metadata |
| 10 | status | enum(PENDING, PROCESSING, COMPLETED, FAILED) | Yes | | default PENDING |
| 11 | createdAt | timestamp | Yes | | Creation time |
| 12 | updatedAt | timestamp | Yes | | Last update time |

### 1.56 AIChatMessage

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | threadId | int | Yes | FK → AIThread.id | Parent thread (CASCADE delete) |
| 3 | userId | int | Yes | FK → User.id | Message user |
| 4 | queryId | cuid | No | FK → AIQuery.id | Related query (SET NULL on delete) |
| 5 | role | enum(USER, ASSISTANT, SYSTEM) | Yes | | Chat role |
| 6 | content | text | Yes | | Message content |
| 7 | toolCalls | json | No | | Tool call data |
| 8 | citations | json | No | | Citation data |
| 9 | createdAt | timestamp | Yes | | Send time |

### 1.57 ActivityLog (Learning)

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | No | FK → User.id | Acting user |
| 3 | action | enum(ActivityAction) | Yes | | Activity action type |
| 4 | entity | enum(PAYMENT, ENROLLMENT, COUPON, BLOG, COURSE, USER, CERTIFICATE, REFUND) | Yes | | Entity type |
| 5 | entityId | int | No | | Related entity ID |
| 6 | description | text | Yes | | Activity description |
| 7 | metadata | json | No | | Additional metadata |
| 8 | ipAddress | varchar | No | | Client IP address |
| 9 | createdAt | timestamp | Yes | | Activity time |

### 1.58 RefundRequest

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | userId | int | Yes | FK → User.id | Requester |
| 3 | orderId | int | Yes | FK → Order.id | Related order |
| 4 | courseId | int | Yes | FK → Course.id | Related course |
| 5 | fullName | varchar | Yes | | Requester full name |
| 6 | email | varchar | Yes | | Requester email |
| 7 | reason | text | Yes | | Refund reason |
| 8 | bank_account_name | varchar | Yes | | Bank account holder name |
| 9 | bank_account_number | varchar | Yes | | Bank account number |
| 10 | bank_name | varchar | Yes | | Bank name |
| 11 | status | enum(PENDING, APPROVED, REJECTED) | Yes | | default PENDING |
| 12 | rejection_reason | text | No | | Rejection reason |
| 13 | rejection_evidence | text | No | | Rejection evidence |
| 14 | approval_evidence | text | No | | Approval evidence |
| 15 | progress_at_request | float | No | | Course progress at request time |
| 16 | progress_at_review | float | No | | Course progress at review time |
| 17 | reviewed_by | int | No | FK → User.id | Reviewer |
| 18 | reviewed_at | timestamp | No | | Review time |
| 19 | created_at | timestamp | Yes | | Creation time |
| 20 | updated_at | timestamp | Yes | | Last update time |

---

## 2. Gamification Service (`gamification` schema)

### 2.1 ActivityLog (Gamification)

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | user_id | int | Yes | | User ID (indexed) |
| 3 | type | enum(ATTENDANCE, HOMEWORK, MOCK_TEST, LESSON_COMPLETED, COURSE_ENROLLED, FLASHCARD_GENERATED, QUIZ_COMPLETED, LOGIN) | Yes | | Activity type |
| 4 | points | int | Yes | | Points earned |
| 5 | meta | json | No | | Additional metadata |
| 6 | created_at | timestamp | Yes | | Activity time |

### 2.2 PointsLedger

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | user_id | int | Yes | | User ID (indexed) |
| 3 | delta | int | Yes | | Points change (+/-) |
| 4 | reason | varchar | Yes | | Change reason |
| 5 | meta | json | No | | Additional metadata |
| 6 | created_at | timestamp | Yes | | Ledger entry time |

### 2.3 UserStats

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | user_id | int | Yes | | Unique user ID |
| 3 | total_xp | int | Yes | | Total XP, default 0 |
| 4 | total_coins | int | Yes | | Total coins, default 0 |
| 5 | level | int | Yes | | User level, default 1 |
| 6 | name | varchar | No | | Cached user name |
| 7 | role | varchar | No | | Cached user role |
| 8 | created_at | timestamp | Yes | | Creation time |
| 9 | updated_at | timestamp | Yes | | Last update time |

### 2.4 Streak

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | user_id | int | Yes | | Unique user ID |
| 3 | start_date | timestamp | Yes | | Streak start date |
| 4 | last_date | timestamp | Yes | | Last active date |
| 5 | longest | int | Yes | | Longest streak, default 0 |
| 6 | current | int | Yes | | Current streak, default 0 |

### 2.5 Achievement

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | name | varchar | Yes | | Achievement name |
| 3 | description | text | Yes | | Achievement description |
| 4 | icon | varchar | No | | Icon URL |
| 5 | symbol | varchar | No | | Symbol character |
| 6 | condition_type | enum(KANJI, STREAK, LISTENING, LESSONS_COMPLETED, COURSES_ENROLLED, QUIZZES_PASSED, TOTAL_XP, LOGIN_DAYS) | Yes | | Unlock condition type |
| 7 | condition_value | int | Yes | | Condition threshold value |
| 8 | reward_coins | int | Yes | | Coin reward, default 0 |
| 9 | reward_xp | int | Yes | | XP reward, default 0 |
| 10 | rarity | enum(COMMON, UNCOMMON, RARE, LEGENDARY) | Yes | | Rarity, default COMMON |
| 11 | category | varchar | No | | Achievement category |
| 12 | created_at | timestamp | Yes | | Creation time |

### 2.6 UserAchievement

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | user_id | int | Yes | | User ID (unique with achievement_id) |
| 3 | achievement_id | int | Yes | FK → Achievement.id | Unlocked achievement |
| 4 | unlocked_at | timestamp | Yes | | Unlock time |

### 2.7 Reward

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | type | enum(BADGE, AVATAR_FRAME, TITLE, DISCOUNT) | Yes | | Reward type |
| 3 | name | varchar | Yes | | Reward name |
| 4 | description | text | No | | Reward description |
| 5 | cost | int | Yes | | Coin cost, default 0 |
| 6 | stock | int | No | | Available stock |
| 7 | image_url | varchar | No | | Reward image URL |
| 8 | is_active | boolean | Yes | | Active status, default true |
| 9 | discount_type | varchar | No | | PERCENTAGE or FIXED_AMOUNT |
| 10 | discount_value | int | No | | Discount value |
| 11 | max_discount_amount | int | No | | Maximum discount cap |
| 12 | applicable_course_ids | int[] | Yes | | Applicable course IDs, default [] |

### 2.8 RewardRedemption

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | user_id | int | Yes | | Redeeming user ID |
| 3 | reward_id | int | Yes | FK → Reward.id | Redeemed reward |
| 4 | coupon_code | varchar | No | | Generated coupon code |
| 5 | redeemed_at | timestamp | Yes | | Redemption time |

### 2.9 LeaderboardEntry

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | user_id | int | Yes | | User ID (unique with period + periodKey) |
| 3 | period | enum(WEEKLY, MONTHLY) | Yes | | Leaderboard period |
| 4 | period_key | varchar | Yes | | Period identifier (e.g. "2026-W12") |
| 5 | xp | int | Yes | | XP earned in period, default 0 |
| 6 | rank | int | No | | Computed rank |
| 7 | created_at | timestamp | Yes | | Creation time |
| 8 | updated_at | timestamp | Yes | | Last update time |

### 2.10 SeasonalEvent

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | int | Yes | PK | Auto-increment primary key |
| 2 | name | varchar | Yes | | Event name |
| 3 | description | text | No | | Event description |
| 4 | multiplier | float | Yes | | XP multiplier, default 1.0 |
| 5 | bonus_coins | int | Yes | | Bonus coins, default 0 |
| 6 | start_date | timestamp | Yes | | Event start |
| 7 | end_date | timestamp | Yes | | Event end |
| 8 | is_active | boolean | Yes | | Active status, default true |
| 9 | created_at | timestamp | Yes | | Creation time |
| 10 | updated_at | timestamp | Yes | | Last update time |

---

## 3. Assessment Service (`assessment` schema)

### 3.1 Assessments

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | title | varchar(255) | Yes | | Assessment title |
| 3 | type | enum(TEST, EXAM, QUIZ, ASSIGNMENT) | Yes | | Assessment type |
| 4 | level | enum(N5, N4, N3, N2, N1) | No | | JLPT level |
| 5 | created_by | int | Yes | | Creator user ID |
| 6 | visibility | enum(PRIVATE, UNLISTED, PUBLIC) | Yes | | default PRIVATE |
| 7 | lesson_id | int | No | | Linked lesson ID |
| 8 | class_id | bigint | No | | Linked class ID |
| 9 | start_at | timestamp | No | | Start time |
| 10 | due_at | timestamp | No | | Due date |
| 11 | lock_after_due | boolean | Yes | | Lock after due, default false |
| 12 | max_attempts | int | No | | Maximum attempt limit |
| 13 | score_profile_id | bigint | Yes | FK → ScoreProfiles.id | Score profile |
| 14 | created_at | timestamp | Yes | | Creation time |
| 15 | updated_at | timestamp | Yes | | Last update time |

### 3.2 AssessmentLogs

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | assessment_id | bigint | No | FK → Assessments.id | Audited assessment (SET NULL on delete) |
| 3 | entity_type | varchar(50) | Yes | | Entity type being audited |
| 4 | entity_id | bigint | No | | Entity ID |
| 5 | action | varchar(50) | Yes | | Action performed |
| 6 | field_name | varchar(100) | No | | Changed field name |
| 7 | old_value | text | No | | Previous value |
| 8 | new_value | text | No | | New value |
| 9 | metadata | jsonb | No | | Additional metadata |
| 10 | change_summary | varchar(500) | No | | Summary of change |
| 11 | updated_by | int | No | | Actor user ID |
| 12 | updated_by_name | varchar(255) | No | | Actor name |
| 13 | created_at | timestamp | Yes | | Audit time |

### 3.3 WeaknessAnalysis

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | attempt_id | bigint | Yes | | Related attempt ID |
| 3 | user_id | int | Yes | | User ID |
| 4 | assessment_id | bigint | No | | Related assessment ID |
| 5 | language | varchar(5) | Yes | | Analysis language, default 'vi' |
| 6 | overall_feedback | text | No | | Overall feedback text |
| 7 | analyses | jsonb | Yes | | Detailed weakness analyses, default [] |
| 8 | metadata | jsonb | No | | Additional metadata |
| 9 | created_at | timestamp | Yes | | Creation time |

### 3.4 WrongAnswerMastery

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | user_id | int | Yes | | User ID (unique with question_id) |
| 3 | question_id | bigint | Yes | | Question ID |
| 4 | attempt_id | bigint | No | | Related attempt ID |
| 5 | mastered_at | timestamp | Yes | | Mastery time |

### 3.5 Sections

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | assessment_id | bigint | No | FK → Assessments.id | Parent assessment (CASCADE delete) |
| 3 | title | varchar(255) | No | | Section title |
| 4 | time_limit_sec | int | No | | Time limit in seconds |
| 5 | type | enum(VOCAB, GRAMMAR, READING, LISTENING) | No | | Section type |
| 6 | order | int | Yes | | Display order, default 0 |
| 7 | created_at | timestamp | Yes | | Creation time |
| 8 | updated_at | timestamp | Yes | | Last update time |

### 3.6 Items

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | section_id | bigint | No | FK → Sections.id | Parent section (CASCADE delete) |
| 3 | name | varchar(255) | No | | Item name |
| 4 | score_per_question | decimal(10,2) | No | | Score per question |
| 5 | order | int | Yes | | Display order, default 0 |
| 6 | created_at | timestamp | Yes | | Creation time |
| 7 | updated_at | timestamp | Yes | | Last update time |

### 3.7 AssessmentQuestions

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | original_question_id | bigint | No | | Source question bank ID |
| 3 | type | enum(VOCAB, KANJI, GRAMMAR, READING, LISTENING) | No | | Question type |
| 4 | level | enum(N5, N4, N3, N2, N1) | No | | JLPT level |
| 5 | difficulty | enum(EASY, MEDIUM, HARD) | No | | Difficulty level |
| 6 | stem | text | No | | Question stem |
| 7 | passage | text | No | | Reading passage |
| 8 | explanation | text | No | | Answer explanation |
| 9 | media_url | varchar(500) | No | | Media URL |
| 10 | audio_url | varchar(500) | No | | Audio URL |
| 11 | created_at | timestamp | Yes | | Creation time |

### 3.8 AssessmentOptions

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | question_id | bigint | No | FK → AssessmentQuestions.id | Parent question (CASCADE delete) |
| 3 | content | text | No | | Option content |
| 4 | is_correct | boolean | No | | Correct answer flag |
| 5 | order | int | No | | Display order |
| 6 | created_at | timestamp | Yes | | Creation time |

### 3.9 AssessmentQuestionGroups

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | original_group_id | bigint | No | | Source group ID |
| 3 | type | enum(READING_SHORT, READING_MEDIUM, READING_LONG, LISTENING) | No | | Group type |
| 4 | level | enum(N5, N4, N3, N2, N1) | No | | JLPT level |
| 5 | difficulty | enum(EASY, MEDIUM, HARD) | No | | Difficulty level |
| 6 | stem | text | No | | Group stem |
| 7 | passage | text | No | | Reading passage |
| 8 | explanation | text | No | | Group explanation |
| 9 | media_url | varchar(500) | No | | Media URL |
| 10 | audio_url | varchar(500) | No | | Audio URL |
| 11 | created_at | timestamp | Yes | | Creation time |

### 3.10 AssessmentGroupQuestions

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | group_id | bigint | Yes | PK, FK → AssessmentQuestionGroups.id | Group (CASCADE delete) |
| 2 | question_id | bigint | Yes | PK, FK → AssessmentQuestions.id | Question (CASCADE delete) |
| 3 | order | int | No | | Display order |

### 3.11 ItemAssessmentQuestions

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | item_id | bigint | Yes | PK, FK → Items.id | Item (CASCADE delete) |
| 2 | question_id | bigint | Yes | PK, FK → AssessmentQuestions.id | Question (CASCADE delete) |
| 3 | order | int | No | | Display order |
| 4 | score | decimal(10,2) | No | | Question score |

### 3.12 ItemAssessmentGroups

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | item_id | bigint | Yes | PK, FK → Items.id | Item (CASCADE delete) |
| 2 | group_id | bigint | Yes | PK, FK → AssessmentQuestionGroups.id | Group (CASCADE delete) |
| 3 | order | int | No | | Display order |
| 4 | score | decimal(10,2) | No | | Group score |

### 3.13 Progress

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | assessment_id | bigint | No | FK → Assessments.id | Assessment (unique with user_id, CASCADE delete) |
| 3 | user_id | int | Yes | | User ID |
| 4 | assignment_id | bigint | No | FK → Assessments.id | Assignment (SET NULL on delete) |
| 5 | current_attempt_id | bigint | No | | Current attempt ID |
| 6 | current_section | int | No | | Current section index |
| 7 | current_question | int | No | | Current question index |
| 8 | time_spent_sec | int | Yes | | Time spent in seconds, default 0 |
| 9 | remaining_sec | int | No | | Remaining seconds |
| 10 | is_submitted | boolean | Yes | | Submitted flag, default false |
| 11 | status | enum(IN_PROGRESS, SUBMITTED, EXPIRED) | Yes | | default IN_PROGRESS |
| 12 | completed_at | timestamp | No | | Completion time |
| 13 | started_at | timestamp | Yes | | Start time |
| 14 | last_saved_at | timestamp | Yes | | Last save time |
| 15 | created_at | timestamp | Yes | | Creation time |
| 16 | updated_at | timestamp | Yes | | Last update time |

### 3.14 AnswerProgress

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | progress_id | bigint | No | FK → Progress.id | Parent progress (unique with question_id, CASCADE delete) |
| 3 | question_id | bigint | No | FK → AssessmentQuestions.id | Question |
| 4 | selected_option_id | bigint | No | | Selected option ID |
| 5 | time_spent_sec | int | Yes | | Time spent, default 0 |
| 6 | is_flagged | boolean | Yes | | Flagged for review, default false |
| 7 | last_updated_at | timestamp | Yes | | Last update time |

### 3.15 Attempts

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | assessment_id | bigint | No | FK → Assessments.id | Assessment |
| 3 | user_id | int | Yes | | User ID |
| 4 | progress_id | bigint | No | FK → Progress.id | Progress (SET NULL on delete) |
| 5 | attempt_no | int | No | | Attempt number |
| 6 | status | enum(IN_PROGRESS, SUBMITTED, EXPIRED) | Yes | | default IN_PROGRESS |
| 7 | started_at | timestamp | Yes | | Start time |
| 8 | submitted_at | timestamp | No | | Submission time |
| 9 | score | double precision | No | | Percentage score |
| 10 | earned_score | double precision | No | | Earned raw score |
| 11 | level_suggestion | varchar(10) | No | | Suggested JLPT level |
| 12 | created_at | timestamp | Yes | | Creation time |
| 13 | updated_at | timestamp | Yes | | Last update time |

### 3.16 Answers

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | attempt_id | bigint | No | FK → Attempts.id | Parent attempt (CASCADE delete) |
| 3 | question_id | bigint | No | FK → AssessmentQuestions.id | Answered question |
| 4 | selected_option_id | bigint | No | | Selected option ID |
| 5 | is_correct | boolean | No | | Correctness flag |
| 6 | time_spent_sec | int | No | | Time spent in seconds |
| 7 | explanation | text | No | | AI-generated explanation |
| 8 | created_at | timestamp | Yes | | Creation time |

### 3.17 Questions (Bank)

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | type | enum(VOCAB, KANJI, GRAMMAR, READING, LISTENING) | No | | Question type |
| 3 | level | enum(N5, N4, N3, N2, N1) | No | | JLPT level |
| 4 | difficulty | enum(EASY, MEDIUM, HARD) | No | | Difficulty |
| 5 | stem | text | Yes | | Question stem |
| 6 | passage | text | No | | Reading passage |
| 7 | explanation | text | No | | Answer explanation |
| 8 | media_id | bigint | No | | Media asset ID |
| 9 | media_url | varchar(500) | No | | Media URL |
| 10 | audio_url | varchar(500) | No | | Audio URL |
| 11 | reading_length | varchar(20) | No | | Reading passage length |
| 12 | created_at | timestamp | Yes | | Creation time |
| 13 | updated_at | timestamp | No | | Last update time |

### 3.18 Options (Bank)

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | question_id | bigint | No | FK → Questions.id | Parent question (CASCADE delete) |
| 3 | media_id | bigint | No | | Media asset ID |
| 4 | media_url | varchar(500) | No | | Media URL |
| 5 | content | text | No | | Option content |
| 6 | is_correct | boolean | No | | Correct answer flag |
| 7 | order | int | No | | Display order |
| 8 | created_at | timestamp | Yes | | Creation time |

### 3.19 QuestionGroups (Bank)

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | type | enum(READING_SHORT, READING_MEDIUM, READING_LONG, LISTENING) | No | | Group type |
| 3 | level | enum(N5, N4, N3, N2, N1) | No | | JLPT level |
| 4 | difficulty | enum(EASY, MEDIUM, HARD) | No | | Difficulty |
| 5 | stem | text | No | | Group stem |
| 6 | passage | text | No | | Reading passage |
| 7 | explanation | text | No | | Group explanation |
| 8 | media_url | varchar(500) | No | | Media URL |
| 9 | audio_url | varchar(500) | No | | Audio URL |
| 10 | created_at | timestamp | Yes | | Creation time |

### 3.20 QuestionGroupQuestions (Bank)

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | question_id | bigint | Yes | PK, FK → Questions.id | Question (CASCADE delete) |
| 2 | group_id | bigint | Yes | PK, FK → QuestionGroups.id | Group (CASCADE delete) |
| 3 | order | int | No | | Display order |
| 4 | score | double precision | No | | Question score |
| 5 | created_at | timestamp | Yes | | Creation time |

### 3.21 ScoreProfiles

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | name | varchar(255) | Yes | | Unique profile name |
| 3 | level | varchar(10) | No | | JLPT level string |
| 4 | max_total | int | No | | Maximum total score |
| 5 | min_total_pass | int | No | | Minimum passing score |
| 6 | notes | text | No | | Profile notes |
| 7 | created_at | timestamp | Yes | | Creation time |
| 8 | updated_at | timestamp | Yes | | Last update time |

### 3.22 ScoreProfileSections

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | profile_id | bigint | Yes | FK → ScoreProfiles.id | Parent profile (CASCADE delete) |
| 3 | type | varchar(20) | Yes | | Section type |
| 4 | title | varchar(255) | Yes | | Section title |
| 5 | max_score | int | Yes | | Maximum section score |
| 6 | weight | decimal(5,2) | No | | Section weight |
| 7 | min_pass | int | No | | Minimum passing score |

### 3.23 AIGeneratedQuestions

| No | Attribute Name | Data Type | Not Null | PK/FK | Description |
|----|---------------|-----------|----------|-------|-------------|
| 1 | id | bigserial | Yes | PK | Auto-increment primary key |
| 2 | user_id | bigint | Yes | | User ID |
| 3 | source_question_id | bigint | Yes | FK → AssessmentQuestions.id | Source question (CASCADE delete) |
| 4 | assessment_id | bigint | Yes | FK → Assessments.id | Assessment (CASCADE delete) |
| 5 | section_type | varchar(20) | Yes | | Section type |
| 6 | stem | text | Yes | | Question stem |
| 7 | options | jsonb | Yes | | Answer options, default [] |
| 8 | correct_answer | text | Yes | | Correct answer |
| 9 | explanation | text | No | | Answer explanation |
| 10 | is_resolved | boolean | Yes | | Resolved flag, default false |
| 11 | created_at | timestamp | Yes | | Creation time |
