import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { exec } from "child_process";
import { PrismaService } from "../shared/services/prisma.service";

type Role = "lecturer" | "customer";

interface ParticipantInfo {
  userId: string;
  displayName: string;
  role: Role;
  avatar?: string;
  capabilities: {
    canPublishVideo: boolean;
    canPublishAudio: boolean;
    canShareScreen: boolean;
    canShareDocuments: boolean;
    canRecord: boolean;
    canControlParticipants: boolean;
    canModerateChat: boolean;
    canDrawOnWhiteboard?: boolean;
  };
  isPublishing?: boolean;
  isSharingScreen?: boolean;
  isHandRaised?: boolean;
}

interface ChatMessage {
  id: string;
  message: string;
  type: "public" | "private";
  senderId: string;
  senderName: string;
  recipientId?: string;
  recipientName?: string;
  timestamp: number;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  creatorId: string;
  creatorName: string;
  createdAt: number;
  isActive: boolean;
  allowMultiple: boolean;
  totalVotes: number;
  duration?: number; // Duration in seconds
  endsAt?: number; // Timestamp when poll ends
}

interface WhiteboardStroke {
  id: string;
  tool:
    | "pen"
    | "eraser"
    | "line"
    | "rectangle"
    | "circle"
    | "arrow"
    | "text"
    | "image";
  points: number[];
  color: string;
  width: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  pathData?: string;
  left?: number;
  top?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  userId: string;
  displayName: string;
  timestamp: number;
}

@WebSocketGateway({ namespace: "webrtc", cors: { origin: "*" } })
export class WebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebRTCGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  // In-memory participant tracking: classId -> (userId -> participant)
  private readonly classParticipants = new Map<
    string,
    Map<string, ParticipantInfo>
  >();
  // Socket mapping
  private readonly socketMeta = new Map<
    string,
    { classId: string; userId: string; displayName: string; role: Role }
  >();
  // Poll tracking: classId -> (pollId -> poll)
  private readonly classPolls = new Map<string, Map<string, Poll>>();
  // Active user sessions: classId_userId -> socketId (to prevent multiple tabs)
  private readonly activeSessions = new Map<string, string>();
  // Whiteboard state: classId -> strokes[]
  private readonly classWhiteboards = new Map<string, WhiteboardStroke[]>();
  // Global whiteboard access mode: classId -> boolean (true = open to all)
  private readonly classWhiteboardGlobalAccess = new Map<string, boolean>();

  handleConnection(client: Socket) {
    const query = client.handshake.query;
    let classId = Array.isArray(query.classId)
      ? query.classId[0]
      : query.classId;
    let userId = Array.isArray(query.userId) ? query.userId[0] : query.userId;
    let role = Array.isArray(query.role) ? query.role[0] : query.role;
    let displayName = Array.isArray(query.displayName)
      ? query.displayName[0]
      : query.displayName;
    const avatar = Array.isArray(query.avatar) ? query.avatar[0] : query.avatar;
    const source =
      (Array.isArray(query.source) ? query.source[0] : query.source) ||
      "meeting";

    // Proxies (Kong/nginx) can corrupt Unicode characters in URL query params.
    // Fall back to the join token payload (base64-safe ASCII) if any param is missing.
    if (!classId || !userId || !role || !displayName) {
      const rawToken = Array.isArray(query.token)
        ? query.token[0]
        : query.token;
      if (rawToken) {
        try {
          const payloadB64 = rawToken.split(".")[1];
          const payload = JSON.parse(
            Buffer.from(payloadB64, "base64").toString("utf-8"),
          );
          if (!classId) classId = payload.classId;
          if (!userId) userId = payload.userId;
          if (!role) role = payload.role;
          if (!displayName) displayName = payload.displayName;
        } catch {
          // ignore decode errors — validation below will catch missing fields
        }
      }
    }

    if (!classId || !userId || !role || !displayName) {
      this.logger.warn("Missing connection params", {
        classId,
        userId,
        role,
        displayName,
        source,
      });
      client.emit("error", { message: "Invalid connection parameters" });
      client.disconnect();
      return;
    }

    // Check for existing session (prevent multiple tabs for the SAME source)
    const sessionKey = `${classId}_${userId}_${source}`;
    const existingSocketId = this.activeSessions.get(sessionKey);

    if (existingSocketId && existingSocketId !== client.id) {
      // Check if existing socket is still connected
      if (this.server && this.server.sockets && this.server.sockets.sockets) {
        const existingSocket =
          this.server.sockets.sockets.get(existingSocketId);

        if (existingSocket && existingSocket.connected) {
          // Disconnect the existing socket
          this.logger.warn(
            `🚫 User ${displayName} (${userId}) already connected to class ${classId}. Disconnecting old connection.`,
          );
          existingSocket.emit("error", {
            message:
              "You have joined this class from another tab/window. This connection will be closed.",
          });
          existingSocket.disconnect(true);
        }
      } else {
        this.logger.warn(
          "Server not properly initialized, cannot check existing socket",
        );
      }
    }

    // Register new session
    this.activeSessions.set(sessionKey, client.id);

    const roleSafe = (role === "lecturer" ? "lecturer" : "customer") as Role;
    this.socketMeta.set(client.id, {
      classId,
      userId,
      displayName,
      role: roleSafe,
    });

    void client.join(`class_${classId}`);

    // Ensure class map
    if (!this.classParticipants.has(classId)) {
      this.classParticipants.set(classId, new Map<string, ParticipantInfo>());
    }
    const classMap = this.classParticipants.get(classId)!;

    // Initialize participant with default capabilities (can refine with real ACL later)
    const participant: ParticipantInfo = {
      userId,
      displayName,
      role: roleSafe,
      avatar,
      capabilities: {
        canPublishVideo: true,
        canPublishAudio: true,
        canShareScreen: true,
        canShareDocuments: true,
        canRecord: roleSafe === "lecturer",
        canControlParticipants: roleSafe === "lecturer",
        canModerateChat: roleSafe === "lecturer",
        canDrawOnWhiteboard: roleSafe === "lecturer",
      },
      isPublishing: false,
      isSharingScreen: false,
      isHandRaised: false,
    };

    classMap.set(userId, participant);

    // Send joined payload to the new client
    client.emit("joined-class", {
      sessionId: client.id,
      handleId: 0,
      roomId: `class_${classId}`,
      role: roleSafe,
      capabilities: participant.capabilities,
      mediaSettings: {
        audio: { enabled: true, muted: false, volume: 1 },
        video: { enabled: true, quality: "high", facingMode: "user" },
        screenShare: { enabled: false, includeAudio: true },
      },
      participantCount: classMap.size,
      existingParticipants: Array.from(classMap.values()),
      janusJsep: undefined,
      janusUrl: "",
      iceServers: [],
      userId,
    });

    // Notify others
    client.to(`class_${classId}`).emit("user-joined", participant);

    this.logger.log(
      `Client connected to class ${classId}: ${displayName} (${userId})`,
    );
  }

  handleDisconnect(client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, displayName } = meta;

    // Remove active session
    const sessionKey = `${classId}_${userId}`;
    const activeSocketId = this.activeSessions.get(sessionKey);
    if (activeSocketId === client.id) {
      this.activeSessions.delete(sessionKey);
      this.logger.log(
        `✅ Removed active session for ${displayName} (${userId}) in class ${classId}`,
      );
    }

    const classMap = this.classParticipants.get(classId);
    if (classMap) {
      classMap.delete(userId);
      if (classMap.size === 0) {
        this.classParticipants.delete(classId);
      }
    }

    client.to(`class_${classId}`).emit("user-left", { userId, displayName });

    this.socketMeta.delete(client.id);
    this.logger.log(
      `Client disconnected from class ${classId}: ${displayName} (${userId})`,
    );
  }

  @SubscribeMessage("send-message")
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      message: string;
      type?: "public" | "private";
      recipientId?: string;
      recipientName?: string;
    },
  ) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, displayName } = meta;

    const msg: ChatMessage = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      message: payload.message,
      type: payload.recipientId ? "private" : "public",
      senderId: userId,
      senderName: displayName,
      recipientId: payload.recipientId,
      recipientName: payload.recipientName,
      timestamp: Date.now(),
    };

    if (msg.type === "private" && msg.recipientId) {
      // Emit only to sender and recipient (find their socket IDs)
      const recipientSocketId = Array.from(this.socketMeta.entries()).find(
        ([_, m]) => m.userId === msg.recipientId && m.classId === classId,
      )?.[0];

      // Send to recipient
      if (recipientSocketId) {
        this.server.to(recipientSocketId).emit("chat-message", msg);
      }
      // Also send back to sender
      client.emit("chat-message", msg);
    } else {
      // Public message - send to everyone in class
      this.server.to(`class_${classId}`).emit("chat-message", msg);
    }
  }

  @SubscribeMessage("raise-hand")
  handleRaiseHand(@ConnectedSocket() client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, displayName } = meta;

    const classMap = this.classParticipants.get(classId);
    if (classMap && classMap.has(userId)) {
      const p = classMap.get(userId)!;
      p.isHandRaised = true;
      classMap.set(userId, p);
    }

    this.server
      .to(`class_${classId}`)
      .emit("hand-raised", { userId, displayName });
  }

  @SubscribeMessage("lower-hand")
  handleLowerHand(@ConnectedSocket() client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, displayName } = meta;

    const classMap = this.classParticipants.get(classId);
    if (classMap && classMap.has(userId)) {
      const p = classMap.get(userId)!;
      p.isHandRaised = false;
      classMap.set(userId, p);
    }

    this.server
      .to(`class_${classId}`)
      .emit("hand-lowered", { userId, displayName });
  }

  @SubscribeMessage("create-poll")
  handleCreatePoll(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      question: string;
      options: string[];
      allowMultiple: boolean;
      duration?: number;
    },
  ) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) {
      this.logger.warn("❌ create-poll: No meta found for client", client.id);
      return;
    }
    const { classId, userId, displayName, role } = meta;

    // Only lecturers can create polls
    if (role !== "lecturer") {
      this.logger.warn(
        `❌ create-poll: Non-lecturer tried to create poll: ${displayName}`,
      );
      client.emit("error", { message: "Only lecturers can create polls" });
      return;
    }

    this.logger.log(
      `📊 Creating poll in class ${classId} by ${displayName}:`,
      payload,
    );

    // Ensure class poll map exists
    if (!this.classPolls.has(classId)) {
      this.classPolls.set(classId, new Map<string, Poll>());
    }
    const pollMap = this.classPolls.get(classId)!;

    // Generate unique poll ID
    const pollId = `poll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Create poll options
    const pollOptions: PollOption[] = payload.options.map((optionText) => ({
      id: `opt_${Math.random().toString(36).slice(2, 8)}`,
      text: optionText,
      votes: 0,
      voters: [],
    }));

    // Calculate endsAt if duration is provided
    const now = Date.now();
    const endsAt = payload.duration ? now + payload.duration * 1000 : undefined;

    // Create poll
    const poll: Poll = {
      id: pollId,
      question: payload.question,
      options: pollOptions,
      creatorId: userId,
      creatorName: displayName,
      createdAt: now,
      isActive: true,
      allowMultiple: payload.allowMultiple,
      totalVotes: 0,
      duration: payload.duration,
      endsAt,
    };

    // Store poll
    pollMap.set(pollId, poll);

    // Auto-close poll after duration expires
    if (payload.duration) {
      setTimeout(() => {
        const currentPoll = pollMap.get(pollId);
        if (currentPoll && currentPoll.isActive) {
          currentPoll.isActive = false;
          pollMap.set(pollId, currentPoll);
          this.logger.log(
            `⏱️ Poll ${pollId} auto-closed after ${payload.duration}s`,
          );
          // Notify everyone
          this.server.to(`class_${classId}`).emit("poll-closed", pollId);
        }
      }, payload.duration * 1000);
    }

    this.logger.log(
      `📊 ✅ Poll created with ID: ${pollId}. Broadcasting to class_${classId}`,
    );

    // Broadcast to ALL clients in the room (including creator)
    this.server.to(`class_${classId}`).emit("poll-created", poll);

    this.logger.log(`📊 Broadcasted poll-created event to class_${classId}`);
  }

  @SubscribeMessage("vote-poll")
  handleVotePoll(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { pollId: string; optionId: string },
  ) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, displayName } = meta;

    this.logger.log(
      `📊 Vote received from ${displayName}: pollId=${payload.pollId}, optionId=${payload.optionId}`,
    );

    const pollMap = this.classPolls.get(classId);
    if (!pollMap) {
      this.logger.warn("❌ vote-poll: No polls found for class", classId);
      return;
    }

    const poll = pollMap.get(payload.pollId);
    if (!poll) {
      this.logger.warn("❌ vote-poll: Poll not found", payload.pollId);
      return;
    }

    if (!poll.isActive) {
      this.logger.warn("❌ vote-poll: Poll is not active", payload.pollId);
      client.emit("error", { message: "This poll is closed" });
      return;
    }

    const option = poll.options.find((o) => o.id === payload.optionId);
    if (!option) {
      this.logger.warn("❌ vote-poll: Option not found", payload.optionId);
      return;
    }

    // Check if user already voted
    const hasVoted = poll.options.some((o) => o.voters.includes(userId));

    if (!poll.allowMultiple && hasVoted) {
      // Remove previous vote if not allowing multiple
      poll.options.forEach((o) => {
        const voterIndex = o.voters.indexOf(userId);
        if (voterIndex > -1) {
          o.voters.splice(voterIndex, 1);
          o.votes--;
          poll.totalVotes--;
        }
      });
    }

    // Add vote
    if (!option.voters.includes(userId)) {
      option.voters.push(userId);
      option.votes++;
      poll.totalVotes++;
    }

    // Update poll
    pollMap.set(payload.pollId, poll);

    this.logger.log(
      `📊 ✅ Vote recorded. Broadcasting poll-updated to class_${classId}`,
    );

    // Broadcast updated poll
    this.server.to(`class_${classId}`).emit("poll-updated", poll);
  }

  @SubscribeMessage("close-poll")
  handleClosePoll(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { pollId: string },
  ) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, role } = meta;

    // Only lecturers can close polls
    if (role !== "lecturer") {
      this.logger.warn("❌ close-poll: Non-lecturer tried to close poll");
      client.emit("error", { message: "Only lecturers can close polls" });
      return;
    }

    this.logger.log(`📊 Closing poll ${payload.pollId} in class ${classId}`);

    const pollMap = this.classPolls.get(classId);
    if (!pollMap) {
      this.logger.warn("❌ close-poll: No polls found for class", classId);
      return;
    }

    const poll = pollMap.get(payload.pollId);
    if (!poll) {
      this.logger.warn("❌ close-poll: Poll not found", payload.pollId);
      return;
    }

    // Mark poll as inactive
    poll.isActive = false;
    pollMap.set(payload.pollId, poll);

    this.logger.log(
      `📊 ✅ Poll closed. Broadcasting poll-closed to class_${classId}`,
    );

    // Broadcast poll closed
    this.server.to(`class_${classId}`).emit("poll-closed", payload.pollId);
  }

  @SubscribeMessage("mute-all-participants")
  handleMuteAllParticipants(@ConnectedSocket() client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, role, displayName } = meta;

    // Only lecturers can mute all participants
    if (role !== "lecturer") {
      this.logger.warn(
        "❌ mute-all-participants: Non-lecturer tried to mute all",
      );
      client.emit("error", {
        message: "Only lecturers can mute all participants",
      });
      return;
    }

    this.logger.log(
      `🔇 Muting all participants in class ${classId} by ${displayName}`,
    );

    // Broadcast to all participants in the class
    this.server.to(`class_${classId}`).emit("mute-requested", {
      requestedBy: displayName,
    });

    this.logger.log(`🔇 ✅ Mute-all request broadcasted to class_${classId}`);
  }

  /**
   * Trigger recording combine and S3 upload after room/class is destroyed
   * Executes script on remote Janus server via SSH
   */
  private triggerRecordingCombine(janusRoomId: number, classId: string): void {
    // Extract hostname from JANUS_SERVER_URL (e.g., wss://janus.example.com/ws -> janus.example.com)
    const janusServerUrl =
      process.env.JANUS_SERVER_URL ||
      "wss://janus.torii-nihongo-gakuin.io.vn/ws";
    const janusHost = new URL(janusServerUrl).hostname;

    // SSH configuration
    const janusUser = process.env.JANUS_SSH_USER || "root";
    const janusKeyPath =
      process.env.JANUS_SSH_KEY || "~/home/ubuntu/.ssh/janus_key";
    const scriptPath = "/opt/janus/bin/auto_push_to_s3.sh";
    const recordingsDir = "/opt/janus/share/janus/recordings";
    const metadataFile = `/tmp/room${janusRoomId}_metadata.txt`;

    this.logger.log(
      `📹 Triggering recording combine for class ${classId} (Janus room ${janusRoomId}) on ${janusHost}`,
    );

    // Create metadata file with basic info
    const timestamp = new Date().toISOString();
    const metadata = [
      `class_id=${classId}`,
      `room_id=${janusRoomId}`,
      `ended_at=${timestamp}`,
      `recordings_dir=${recordingsDir}`,
    ].join("\\n");

    // SSH command to:
    // 1. Create metadata file using printf (handles newlines properly)
    // 2. Verify metadata file was created
    // 3. List recording files for this room
    // 4. Execute the combine script
    // 5. Clean up metadata file after completion
    const sshCommand = `ssh -i ${janusKeyPath} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${janusUser}@${janusHost} "printf '${metadata}\\n' > ${metadataFile} && echo '✓ Metadata file created' && ls -lh ${metadataFile} && echo '📁 Recording files for Janus room ${janusRoomId}:' && ls -lh ${recordingsDir}/*-${janusRoomId}-* 2>/dev/null || echo '⚠️ No recording files found for room ${janusRoomId}' && cd ${recordingsDir} && sudo ${scriptPath} ${janusRoomId}; rm -f ${metadataFile}"`;

    this.logger.log(`📹 Executing SSH command for Janus room ${janusRoomId}`);

    exec(sshCommand, (error, stdout, stderr) => {
      if (error) {
        this.logger.error(
          `❌ Recording combine error for class ${classId} (room ${janusRoomId}): ${error.message}. ` +
            `Ensure SSH key is configured and Janus server (${janusHost}) is accessible.`,
        );
        return;
      }
      if (stderr) {
        // Filter out common SSH warnings that are not actual errors
        const filteredStderr = stderr
          .split("\n")
          .filter((line) => {
            return (
              !line.includes("Permanently added") &&
              !line.includes("xargs: warning") &&
              line.trim() !== ""
            );
          })
          .join("\n");

        if (filteredStderr) {
          this.logger.warn(
            `⚠️ Recording stderr for class ${classId} (room ${janusRoomId}):\n${filteredStderr}`,
          );
        }
      }
      if (stdout) {
        this.logger.log(
          `📹 Recording output for class ${classId} (room ${janusRoomId}):\n${stdout}`,
        );
      }
      this.logger.log(
        `✅ Recording combine triggered successfully for class ${classId} (room ${janusRoomId}) on ${janusHost}`,
      );
    });
  }

  /**
   * Call this when class ends or room is destroyed
   */
  @SubscribeMessage("end-class")
  async handleEndClass(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { classId: string },
  ) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;

    const { role, displayName } = meta;

    // Only lecturers can end the class
    if (role !== "lecturer") {
      client.emit("error", { message: "Only lecturers can end the class" });
      return;
    }

    const { classId } = payload;

    this.logger.log(`🛑 Class ${classId} ended by ${displayName}`);

    // Notify all participants
    this.server.to(`class_${classId}`).emit("class-ended", { classId });

    // Look up the Janus room ID from the database
    try {
      const activeSession = await this.prisma.liveSession.findFirst({
        where: {
          classId: parseInt(classId),
          endedAt: null,
        },
        select: {
          id: true,
          janusRoomId: true,
        },
      });

      if (activeSession) {
        // Save whiteboard snapshot
        const wbStrokes = this.classWhiteboards.get(classId);
        if (wbStrokes && wbStrokes.length > 0) {
          try {
            await this.prisma.liveSession.update({
              where: { id: activeSession.id },
              data: { whiteboardSnapshot: wbStrokes as any },
            });
            this.logger.log(
              `🎨 Saved ${wbStrokes.length} whiteboard strokes for class ${classId}`,
            );
          } catch (snapshotErr) {
            this.logger.error(
              `❌ Failed to save whiteboard snapshot for class ${classId}:`,
              snapshotErr,
            );
          }
        }

        if (activeSession.janusRoomId) {
          // Trigger recording processing (5 second delay to ensure Janus finishes writing files)
          setTimeout(() => {
            this.triggerRecordingCombine(activeSession.janusRoomId!, classId);
          }, 5000);
        } else {
          this.logger.warn(
            `⚠️ No Janus room ID found for class ${classId}. Skipping recording combine.`,
          );
        }
      } else {
        this.logger.warn(
          `⚠️ No active session found for class ${classId}. Skipping snapshot and recording combine.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Error looking up Janus room ID for class ${classId}:`,
        error,
      );
    }

    return { success: true };
  }

  // ─── Whiteboard Helpers ──────────────────────────────────────────────

  private canDrawOnWhiteboard(
    classId: string,
    userId: string,
    role: string,
  ): boolean {
    if (role === "lecturer") return true;
    if (this.classWhiteboardGlobalAccess.get(classId)) return true;
    const participant = this.classParticipants.get(classId)?.get(userId);
    return participant?.capabilities.canDrawOnWhiteboard || false;
  }

  // ─── Whiteboard Events ────────────────────────────────────────────────

  @SubscribeMessage("toggle-whiteboard-global-access")
  handleToggleWhiteboardGlobalAccess(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { isOpen: boolean },
  ) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, role } = meta;

    if (role !== "lecturer") {
      client.emit("error", {
        message: "Only lecturers can toggle global whiteboard access",
      });
      return;
    }

    this.classWhiteboardGlobalAccess.set(classId, payload.isOpen);
    this.server.to(`class_${classId}`).emit("whiteboard-access-changed", {
      isOpen: payload.isOpen,
    });
  }

  @SubscribeMessage("toggle-whiteboard-access")
  handleToggleWhiteboardAccess(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetUserId: string; canDraw: boolean },
  ) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, role } = meta;

    if (role !== "lecturer") {
      client.emit("error", {
        message: "Only lecturers can assign whiteboard access",
      });
      return;
    }

    const classMap = this.classParticipants.get(classId);
    if (classMap && classMap.has(payload.targetUserId)) {
      const p = classMap.get(payload.targetUserId)!;
      p.capabilities.canDrawOnWhiteboard = payload.canDraw;
      classMap.set(payload.targetUserId, p);

      this.server
        .to(`class_${classId}`)
        .emit("participant-capabilities-updated", {
          userId: payload.targetUserId,
          capabilities: p.capabilities,
        });
    }
  }

  @SubscribeMessage("whiteboard-draw")
  handleWhiteboardDraw(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: Omit<WhiteboardStroke, "userId" | "displayName" | "timestamp">,
  ) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, displayName, role } = meta;

    if (!this.canDrawOnWhiteboard(classId, userId, role)) {
      client.emit("error", {
        message: "You do not have permission to draw on the whiteboard",
      });
      return;
    }

    const stroke: WhiteboardStroke = {
      ...payload,
      userId,
      displayName,
      timestamp: Date.now(),
    };

    // Store stroke (upsert logic for dragging/modifying)
    if (!this.classWhiteboards.has(classId)) {
      this.classWhiteboards.set(classId, []);
    }
    const strokes = this.classWhiteboards.get(classId)!;
    const existingIndex = strokes.findIndex((s) => s.id === stroke.id);
    if (existingIndex !== -1) {
      strokes[existingIndex] = stroke;
    } else {
      strokes.push(stroke);
    }

    // Broadcast to all participants (including sender for confirmation)
    this.server.to(`class_${classId}`).emit("whiteboard-stroke", stroke);
  }

  @SubscribeMessage("whiteboard-drawing")
  handleWhiteboardDrawing(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      id: string;
      tool: string;
      points: number[];
      color: string;
      width: number;
      opacity: number;
    },
  ) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, role } = meta;

    if (!this.canDrawOnWhiteboard(classId, userId, role)) return;

    // Relay live drawing points to all other participants (not back to sender)
    client.to(`class_${classId}`).emit("whiteboard-drawing", {
      ...payload,
      userId,
    });
  }

  @SubscribeMessage("whiteboard-undo")
  handleWhiteboardUndo(@ConnectedSocket() client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, role } = meta;

    if (!this.canDrawOnWhiteboard(classId, userId, role)) {
      client.emit("error", {
        message: "You do not have permission to undo on the whiteboard",
      });
      return;
    }

    const strokes = this.classWhiteboards.get(classId);
    if (!strokes || strokes.length === 0) return;

    // Find the last stroke owned by this user
    let targetIdx = -1;
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (strokes[i].userId === userId) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx === -1) return;

    const [removed] = strokes.splice(targetIdx, 1);
    this.server
      .to(`class_${classId}`)
      .emit("whiteboard-undo", { strokeId: removed.id });
  }

  @SubscribeMessage("whiteboard-redo")
  handleWhiteboardRedo(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      stroke: Omit<WhiteboardStroke, "userId" | "displayName" | "timestamp">;
    },
  ) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, displayName, role } = meta;

    if (!this.canDrawOnWhiteboard(classId, userId, role)) {
      client.emit("error", {
        message: "You do not have permission to redo on the whiteboard",
      });
      return;
    }

    const stroke: WhiteboardStroke = {
      ...payload.stroke,
      userId,
      displayName,
      timestamp: Date.now(),
    };

    if (!this.classWhiteboards.has(classId)) {
      this.classWhiteboards.set(classId, []);
    }
    this.classWhiteboards.get(classId)!.push(stroke);

    this.server.to(`class_${classId}`).emit("whiteboard-stroke", stroke);
  }

  @SubscribeMessage("whiteboard-clear")
  handleWhiteboardClear(@ConnectedSocket() client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, role, displayName } = meta;

    if (!this.canDrawOnWhiteboard(classId, userId, role)) {
      client.emit("error", {
        message: "You do not have permission to clear the whiteboard",
      });
      return;
    }

    this.classWhiteboards.set(classId, []);
    this.server
      .to(`class_${classId}`)
      .emit("whiteboard-cleared", { clearedBy: displayName });

    this.logger.log(
      `🎨 Whiteboard cleared in class ${classId} by ${displayName}`,
    );
  }

  @SubscribeMessage("whiteboard-request-state")
  handleWhiteboardRequestState(@ConnectedSocket() client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId } = meta;

    const strokes = this.classWhiteboards.get(classId) || [];
    client.emit("whiteboard-state", { strokes });
  }

  @SubscribeMessage("whiteboard-delete")
  handleWhiteboardDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { strokeIds: string[] },
  ) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, role } = meta;

    if (!this.canDrawOnWhiteboard(classId, userId, role)) {
      client.emit("error", {
        message:
          "You do not have permission to delete strokes on the whiteboard",
      });
      return;
    }

    const strokes = this.classWhiteboards.get(classId);
    if (!strokes) return;

    const ids = new Set(payload.strokeIds);
    const remaining = strokes.filter((s) => !ids.has(s.id));
    this.classWhiteboards.set(classId, remaining);

    this.server
      .to(`class_${classId}`)
      .emit("whiteboard-delete", { strokeIds: payload.strokeIds });
  }

  @SubscribeMessage("cursor-move")
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { x: number; y: number },
  ) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    const { classId, userId, displayName } = meta;

    // Relay cursor position to all OTHER participants (not back to sender)
    client.to(`class_${classId}`).emit("cursor-move", {
      userId,
      displayName,
      x: payload.x,
      y: payload.y,
    });
  }
}
