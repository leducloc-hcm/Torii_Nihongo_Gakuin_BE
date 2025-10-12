# Online Class System with Janus Gateway

## Overview

This system provides a comprehensive online class platform using Janus Gateway for WebRTC communications. It supports:

- **Lecturer Features:**
  - Screen sharing
  - Recording classes
  - Document/resource sharing (ping)
  - Participant management (mute, kick, promote)
  - Whiteboard control
  - Breakout room management

- **Student Features:**
  - View lecturer's stream
  - Raise hand system
  - Chat participation
  - View shared documents
  - Audio participation (when allowed)

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   NestJS API    │    │  Janus Gateway  │
│   (React/Vue)   │◄──►│                 │◄──►│                 │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   (Prisma)      │
                       └─────────────────┘
```

## API Endpoints

### 1. Create Online Class

```http
POST /online-classes
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Japanese Grammar Basics",
  "description": "Introduction to Japanese grammar",
  "courseId": 123,
  "scheduledAt": "2024-01-15T10:00:00Z",
  "capacity": 30,
  "level": "N5",
  "recordingEnabled": true,
  "chatEnabled": true,
  "screenShareEnabled": true,
  "documentShareEnabled": true,
  "raiseHandEnabled": true
}
```

### 2. Generate Join Token

```http
POST /online-classes/{classId}/join
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2024-01-15T14:00:00Z",
    "classInfo": {
      "id": "123",
      "title": "Japanese Grammar Basics",
      "lecturerName": "Tanaka Sensei",
      "features": {
        "chatEnabled": true,
        "screenShareEnabled": true,
        "documentShareEnabled": true,
        "raiseHandEnabled": true
      }
    },
    "userRole": "student",
    "permissions": {
      "canPublishVideo": false,
      "canPublishAudio": true,
      "canShareScreen": false,
      "canShareDocuments": false,
      "canRecord": false,
      "canControlParticipants": false,
      "canModerateChat": false
    }
  }
}
```

### 3. Start Class Session

```http
POST /online-classes/{classId}/start
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "sessionId": "456",
    "roomKey": "room_1705312800_abc123",
    "startedAt": "2024-01-15T10:00:00Z",
    "janusRoomId": 11123
  }
}
```

## WebSocket Events

### Connection

```javascript
const socket = io('ws://localhost:3000/webrtc', {
  query: {
    userId: '123',
    classId: '456',
    role: 'student', // or 'teacher'
    displayName: 'John Doe',
    token: 'eyJhbGciOiJIUzI1NiIs...',
    avatar: 'https://example.com/avatar.jpg',
  },
})
```

### Lecturer Events

#### Start Screen Sharing

```javascript
socket.emit('screen-share', {
  type: 'start',
  quality: 'medium', // 'low', 'medium', 'high'
  includeAudio: false,
  frameRate: 15,
  maxBitrate: 512000,
})
```

#### Share Document/Resource (Ping)

```javascript
socket.emit('share-document', {
  documentUrl: 'https://example.com/lesson1.pdf',
  title: 'Lesson 1: Hiragana Characters',
  description: 'Basic hiragana writing practice',
  type: 'pdf',
  thumbnailUrl: 'https://example.com/thumbnails/lesson1.jpg',
  allowDownload: true,
  highlight: true, // Highlight for students
  autoDismissSeconds: 30,
})
```

#### Start Recording

```javascript
socket.emit('recording-control', {
  action: 'start',
  options: {
    recordingName: 'Grammar_Lesson_1',
    includeVideo: true,
    includeAudio: true,
    includeScreenShare: true,
    quality: 'high',
    maxDurationMinutes: 90,
    autoUpload: true,
  },
})
```

#### Control Participants

```javascript
socket.emit('participant-control', {
  targetUserId: '789',
  action: 'mute_audio', // 'mute_audio', 'mute_video', 'kick', 'promote_presenter', etc.
  reason: 'Background noise',
  notifyParticipant: true,
})
```

### Student Events

#### Raise Hand

```javascript
socket.emit('raise-hand', {
  action: 'raise',
  reason: 'I have a question about particle usage',
  priority: 'normal', // 'low', 'normal', 'high', 'urgent'
  category: 'content', // 'technical', 'content', 'audio', 'video', 'other'
})
```

#### Lower Hand

```javascript
socket.emit('raise-hand', {
  action: 'lower',
})
```

### Common Events (Both Roles)

#### Send Chat Message

```javascript
socket.emit('chat-message', {
  message: 'Great explanation, thank you!',
  type: 'public', // 'public' or 'private'
  recipientId: null, // For private messages
  attachments: [
    {
      type: 'image',
      url: 'https://example.com/question.jpg',
      filename: 'question.jpg',
      size: 1024000,
    },
  ],
})
```

#### WebRTC Signaling

```javascript
// Publish video/audio stream
socket.emit('publish-offer', {
  sdp: offerSdp,
  audio: true,
  video: true,
  data: false,
})

// Handle ICE candidates
socket.emit('ice-candidate', {
  candidate: candidate.candidate,
  sdpMid: candidate.sdpMid,
  sdpMLineIndex: candidate.sdpMLineIndex,
})
```

## Received Events

### Class Events

```javascript
// Participant joined
socket.on('participant-joined', (data) => {
  console.log(`${data.displayName} joined as ${data.role}`)
})

// Document shared
socket.on('document-shared', (data) => {
  console.log('New document:', data.document.title)
  // Show document notification to students
})

// Hand raised
socket.on('hand-raised', (data) => {
  console.log(`${data.displayName} raised hand: ${data.reason}`)
})

// Recording started
socket.on('recording-started', (data) => {
  console.log(`Recording started by ${data.startedBy}`)
})

// Screen sharing started
socket.on('screen-share-started', (data) => {
  console.log(`${data.displayName} started screen sharing`)
})
```

### WebRTC Events

```javascript
// Receive video/audio offer from teacher
socket.on('teacher-offer', (data) => {
  // Handle teacher's video stream
  peerConnection.setRemoteDescription(new RTCSessionDescription(data))
})

// Participant started publishing
socket.on('participant-started-publishing', (data) => {
  console.log(`${data.displayName} started ${data.mediaType}`)
})
```

## Frontend Implementation Example

### React Component for Students

```javascript
import { useEffect, useState } from 'react'
import io from 'socket.io-client'

const OnlineClassStudent = ({ classId, token, userInfo }) => {
  const [socket, setSocket] = useState(null)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [sharedDocuments, setSharedDocuments] = useState([])
  const [chatMessages, setChatMessages] = useState([])

  useEffect(() => {
    const newSocket = io('ws://localhost:3000/webrtc', {
      query: {
        userId: userInfo.id,
        classId: classId,
        role: 'student',
        displayName: userInfo.name,
        token: token,
        avatar: userInfo.avatar,
      },
    })

    newSocket.on('document-shared', (data) => {
      setSharedDocuments((prev) => [...prev, data.document])
      // Show notification
    })

    newSocket.on('chat-message-received', (message) => {
      setChatMessages((prev) => [...prev, message])
    })

    setSocket(newSocket)

    return () => newSocket.close()
  }, [classId, token])

  const raiseHand = (reason) => {
    socket.emit('raise-hand', {
      action: 'raise',
      reason: reason,
      priority: 'normal',
      category: 'content',
    })
    setIsHandRaised(true)
  }

  const lowerHand = () => {
    socket.emit('raise-hand', { action: 'lower' })
    setIsHandRaised(false)
  }

  const sendChatMessage = (message) => {
    socket.emit('chat-message', {
      message: message,
      type: 'public',
    })
  }

  return (
    <div className="online-class-student">
      <div className="video-container">
        {/* Teacher's video stream */}
        <video id="teacher-video" autoPlay muted />

        {/* Screen share display */}
        <video id="screen-share" autoPlay muted />
      </div>

      <div className="controls">
        <button
          onClick={() => (isHandRaised ? lowerHand() : raiseHand('Question'))}
          className={isHandRaised ? 'hand-raised' : ''}
        >
          {isHandRaised ? '✋ Hand Raised' : '🖐️ Raise Hand'}
        </button>
      </div>

      <div className="shared-documents">
        <h3>Shared Documents</h3>
        {sharedDocuments.map((doc) => (
          <div key={doc.id} className="document-item">
            <a href={doc.url} target="_blank" rel="noopener noreferrer">
              {doc.title}
            </a>
            {doc.highlight && <span className="highlight">📌</span>}
          </div>
        ))}
      </div>

      <div className="chat">
        <div className="messages">
          {chatMessages.map((msg) => (
            <div key={msg.id} className="message">
              <strong>{msg.senderName}:</strong> {msg.message}
            </div>
          ))}
        </div>
        <input
          type="text"
          placeholder="Type a message..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendChatMessage(e.target.value)
              e.target.value = ''
            }
          }}
        />
      </div>
    </div>
  )
}
```

### React Component for Lecturers

```javascript
const OnlineClassLecturer = ({ classId, token, userInfo }) => {
  const [socket, setSocket] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [raisedHands, setRaisedHands] = useState([])
  const [participants, setParticipants] = useState([])

  useEffect(() => {
    const newSocket = io('ws://localhost:3000/webrtc', {
      query: {
        userId: userInfo.id,
        classId: classId,
        role: 'teacher',
        displayName: userInfo.name,
        token: token,
      },
    })

    newSocket.on('hand-raised', (data) => {
      setRaisedHands((prev) => [...prev, data])
    })

    newSocket.on('hand-lowered', (data) => {
      setRaisedHands((prev) => prev.filter((h) => h.userId !== data.userId))
    })

    newSocket.on('participant-joined', (data) => {
      setParticipants((prev) => [...prev, data])
    })

    setSocket(newSocket)

    return () => newSocket.close()
  }, [classId, token])

  const startRecording = () => {
    socket.emit('recording-control', {
      action: 'start',
      options: {
        recordingName: `Class_${new Date().toISOString()}`,
        includeVideo: true,
        includeAudio: true,
        quality: 'high',
      },
    })
    setIsRecording(true)
  }

  const stopRecording = () => {
    socket.emit('recording-control', { action: 'stop' })
    setIsRecording(false)
  }

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })

      socket.emit('screen-share', {
        type: 'start',
        quality: 'high',
        includeAudio: true,
      })

      setIsSharingScreen(true)
    } catch (error) {
      console.error('Error starting screen share:', error)
    }
  }

  const shareDocument = (document) => {
    socket.emit('share-document', {
      documentUrl: document.url,
      title: document.title,
      description: document.description,
      type: document.type,
      allowDownload: true,
      highlight: true,
      notifyParticipants: true,
    })
  }

  const muteParticipant = (userId) => {
    socket.emit('participant-control', {
      targetUserId: userId,
      action: 'mute_audio',
      reason: 'Lecturer muted',
      notifyParticipant: true,
    })
  }

  return (
    <div className="online-class-lecturer">
      <div className="video-container">
        <video id="lecturer-video" autoPlay muted />
      </div>

      <div className="lecturer-controls">
        <button onClick={() => (isRecording ? stopRecording() : startRecording())}>
          {isRecording ? '⏹️ Stop Recording' : '🔴 Start Recording'}
        </button>

        <button onClick={startScreenShare} disabled={isSharingScreen}>
          {isSharingScreen ? '📺 Sharing Screen' : '📱 Share Screen'}
        </button>

        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files[0]
            if (file) {
              const document = {
                url: URL.createObjectURL(file),
                title: file.name,
                type: file.type.includes('pdf') ? 'pdf' : 'other',
              }
              shareDocument(document)
            }
          }}
        />
      </div>

      <div className="raised-hands">
        <h3>Raised Hands ({raisedHands.length})</h3>
        {raisedHands.map((hand) => (
          <div key={hand.userId} className="raised-hand">
            <span>{hand.displayName}</span>
            <span className="reason">{hand.reason}</span>
            <span className="priority">{hand.priority}</span>
            <button
              onClick={() => {
                socket.emit('participant-control', {
                  targetUserId: hand.userId,
                  action: 'allow_unmute',
                  notifyParticipant: true,
                })
              }}
            >
              Allow to Speak
            </button>
          </div>
        ))}
      </div>

      <div className="participants">
        <h3>Participants ({participants.length})</h3>
        {participants.map((participant) => (
          <div key={participant.userId} className="participant">
            <span>{participant.displayName}</span>
            <button onClick={() => muteParticipant(participant.userId)}>Mute</button>
            <button
              onClick={() => {
                socket.emit('participant-control', {
                  targetUserId: participant.userId,
                  action: 'kick',
                  reason: 'Lecturer removed',
                  notifyParticipant: true,
                })
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Database Schema Updates

The existing Prisma schema already includes most tables needed for the online class system:

- `Class` - Online class information
- `LiveSession` - Active class sessions
- `Attendance` - Track participant attendance
- `LiveChatMessage` - Chat messages
- `RaiseHand` - Raised hands tracking
- `ResourcePing` - Shared documents/resources
- `SpinWheelEvent` - Interactive elements

## Configuration

### Environment Variables

```env
# Janus Gateway Configuration
JANUS_WS_URL=ws://localhost:8188
JANUS_SECRET=your-janus-secret

# Recording Storage
RECORDINGS_PATH=/opt/janus/share/janus/recordings
AWS_S3_BUCKET=your-recordings-bucket

# JWT Configuration
JWT_SECRET=your-jwt-secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/torii_db
```

### Janus Gateway Configuration

Ensure your Janus Gateway is configured with:

- VideoRoom plugin enabled
- Recording plugin enabled
- WebSocket transport enabled
- CORS properly configured

## Usage Flow

1. **Lecturer creates class** via REST API
2. **Students get join tokens** via REST API
3. **Lecturer starts session** - creates Janus room
4. **Participants connect** via WebSocket with tokens
5. **Real-time interactions** happen through WebSocket events
6. **Class features** are used (screen share, document ping, raise hand)
7. **Session ends** - recordings are processed and stored

This system provides a comprehensive online classroom experience with all the requested features integrated with your existing Janus Gateway setup.
