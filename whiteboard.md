# Whiteboard Feature - Build Instructions

## Overview

The whiteboard feature is a real-time collaborative drawing tool similar to Microsoft Teams whiteboard, designed for classroom instruction and real-time student engagement.

## Core Requirements

### 1. Lecturer Tools & Capabilities

- **Drawing Tools**: Pen, eraser, shapes (rectangle, circle, line, arrow)
- **Color Palette**: Full color selection for drawing
- **Text Tool**: Add and format text on whiteboard
- **Undo/Redo**: Full undo/redo functionality
- **Clear Whiteboard**: Option to clear entire board
- **Save/Export**: Export whiteboard as image or document
- **Layers/Organization**: Manage multiple layers or sections
- **Formatting Options**: Line width, opacity, brush styles

### 2. Real-Time Viewing for Learners

- **Live Synchronization**: All learners see lecturer's drawings instantly
- **Auto-refresh**: Real-time updates without manual refresh
- **WebSocket/SignalR Integration**: Bidirectional communication for live updates
- **Connection Status**: Indicator showing connection state
- **Performance Optimization**: Efficient rendering for smooth experience

### 3. One Whiteboard Per Class

- **Class-based Isolation**: Each class has a dedicated whiteboard instance
- **Class Identification**: Link whiteboard to specific class ID
- **Whiteboard Persistence**: Store whiteboard session data per class
- **Session Management**: Start/end whiteboard sessions per class

### 4. Permission Management

- **Role-based Access Control**:
  - Lecturer: Full read/write permissions
  - Learners: Read-only access (view only)
  - Admin: Manage whiteboard settings and permissions
- **Permission Levels**:
  - `DRAW`: Can draw on whiteboard (Lecturer only)
  - `VIEW`: Can view whiteboard (All learners)
  - `MANAGE`: Can manage settings and permissions (Admin/Lecturer)
- **Dynamic Permissions**: Manage per-user and per-role permissions
- **Access Control**: Prevent unauthorized access to class whiteboards

## Technical Architecture

### Frontend

- Real-time canvas rendering using HTML5 Canvas or WebGL
- Event listeners for mouse/touch input
- WebSocket client for live synchronization
- Permission-based UI rendering

### Backend

- WebSocket/SignalR server for real-time communication
- Database schema for whiteboard data storage
- Permission verification middleware
- Broadcast mechanisms for multi-user updates

### Database Schema

- Whiteboard sessions (ID, class_id, created_at, updated_at)
- Whiteboard events (drawing actions, timestamp, user_id)
- User permissions (user_id, class_id, permission_level)
- Class associations (class_id, whiteboard_id)
