import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { JanusWebSocketManager } from './janus-websocket.manager'
import { JanusJoinRoomRequest, JanusPublishRequest, JanusSubscribeRequest } from '../dto/janus.interface'

@Injectable()
export class JanusService implements OnModuleDestroy {
  private readonly logger = new Logger(JanusService.name)
  private readonly activeSessions = new Map<number, boolean>()

  constructor(private readonly janusWsManager: JanusWebSocketManager) {}

  async onModuleDestroy() {
    // Cleanup all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.destroySession(sessionId)
    }
  }

  async createSession(): Promise<number | null> {
    const maxRetries = 3
    let retries = 0

    while (retries < maxRetries) {
      try {
        // Check if WebSocket is connected
        if (!this.janusWsManager.isConnected()) {
          this.logger.warn('WebSocket not connected, attempting to reconnect...')
          await this.janusWsManager.reconnect()
        }

        const response = await this.janusWsManager.sendAsync({
          janus: 'create',
          transaction: this.generateTransaction(),
        })

        if (response.janus === 'success' && response.data?.id) {
          const sessionId = response.data.id
          this.activeSessions.set(sessionId, true)
          this.logger.log(`Created Janus session: ${sessionId}`)
          return sessionId
        }

        this.logger.error('Failed to create Janus session:', response)
        return null
      } catch (error) {
        retries++
        this.logger.error(`Error creating Janus session (attempt ${retries}/${maxRetries}):`, error)

        if (retries >= maxRetries) {
          this.logger.error('Max retries reached for creating Janus session')
          return null
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000 * retries))
      }
    }

    return null
  }

  async destroySession(sessionId: number): Promise<boolean> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'destroy',
        session_id: sessionId,
        transaction: this.generateTransaction(),
      })

      if (response.janus === 'success') {
        this.activeSessions.delete(sessionId)
        this.logger.log(`Destroyed Janus session: ${sessionId}`)
        return true
      }

      return false
    } catch (error) {
      this.logger.error(`Error destroying session ${sessionId}:`, error)
      return false
    }
  }

  async attachPlugin(sessionId: number, pluginName: string): Promise<number | null> {
    const maxRetries = 3
    let retries = 0

    while (retries < maxRetries) {
      try {
        // Check if WebSocket is connected
        if (!this.janusWsManager.isConnected()) {
          this.logger.warn('WebSocket not connected, attempting to reconnect...')
          await this.janusWsManager.reconnect()
        }

        const response = await this.janusWsManager.sendAsync({
          janus: 'attach',
          plugin: pluginName,
          session_id: sessionId,
          transaction: this.generateTransaction(),
        })

        if (response.janus === 'success' && response.data?.id) {
          const handleId = response.data.id
          this.logger.log(`Attached plugin ${pluginName} to session ${sessionId}, handle: ${handleId}`)
          return handleId
        }

        this.logger.error(`Failed to attach plugin ${pluginName}:`, response)
        return null
      } catch (error) {
        retries++
        this.logger.error(`Error attaching plugin ${pluginName} (attempt ${retries}/${maxRetries}):`, error)

        if (retries >= maxRetries) {
          this.logger.error(`Max retries reached for attaching plugin ${pluginName}`)
          return null
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000 * retries))
      }
    }

    return null
  }

  async createRoom(options: {
    description?: string
    is_private?: boolean
    publishers?: number
    bitrate?: number
    fir_freq?: number
    videocodec?: string
    audiocodec?: string
    record?: boolean
  }): Promise<{ room: number }> {
    try {
      // Create a temporary session and handle for room creation
      const sessionId = await this.createSession()
      if (!sessionId) {
        throw new Error('Failed to create session for room creation')
      }

      const handleId = await this.attachPlugin(sessionId, 'janus.plugin.videoroom')
      if (!handleId) {
        throw new Error('Failed to attach plugin for room creation')
      }

      // Generate a random room ID
      const roomId = Math.floor(Math.random() * 1000000) + 10000

      const createResponse = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'create',
          room: roomId,
          publishers: options.publishers || 10,
          bitrate: options.bitrate || 256000,
          bitrate_cap: true,
          fir_freq: options.fir_freq || 10,
          audiocodec: options.audiocodec || 'opus',
          videocodec: options.videocodec || 'vp8',
          description: options.description || `Room ${roomId}`,
          is_private: options.is_private || false,
          record: options.record || false,
          rec_dir: '/opt/janus/share/janus/recordings',
        },
        transaction: this.generateTransaction(),
      })

      if (createResponse.janus === 'success' || createResponse.plugindata?.data?.videoroom === 'created') {
        this.logger.log(`Created Janus room: ${roomId}`)
        return { room: roomId }
      }

      throw new Error('Failed to create Janus room')
    } catch (error) {
      this.logger.error('Error creating room:', error)
      throw error
    }
  }

  async destroyRoom(roomId: number): Promise<boolean> {
    try {
      // Create a temporary session and handle for room destruction
      const sessionId = await this.createSession()
      if (!sessionId) {
        throw new Error('Failed to create session for room destruction')
      }

      const handleId = await this.attachPlugin(sessionId, 'janus.plugin.videoroom')
      if (!handleId) {
        throw new Error('Failed to attach plugin for room destruction')
      }

      const destroyResponse = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'destroy',
          room: roomId,
        },
        transaction: this.generateTransaction(),
      })

      // Clean up the temporary session
      await this.destroySession(sessionId)

      if (destroyResponse.janus === 'success' || destroyResponse.plugindata?.data?.videoroom === 'destroyed') {
        this.logger.log(`Destroyed Janus room: ${roomId}`)
        return true
      }

      return false
    } catch (error) {
      this.logger.error(`Error destroying room ${roomId}:`, error)
      return false
    }
  }

  async createOrJoinRoom(
    sessionId: number,
    handleId: number,
    roomId: number,
    displayName: string,
    isPublisher: boolean = false,
  ): Promise<{ success: boolean; jsep?: any }> {
    try {
      // First try to create the room
      const createResponse = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'create',
          room: roomId,
          publishers: 10, // Max publishers in room
          bitrate: 256000,
          bitrate_cap: true,
          fir_freq: 10,
          audiocodec: 'opus',
          videocodec: 'vp8',
          description: `Online Class Room ${roomId}`,
          is_private: false,
          record: true,
          rec_dir: '/opt/janus/share/janus/recordings',
        },
        transaction: this.generateTransaction(),
      })

      // Room creation may fail if it already exists, that's OK
      // Now join the room
      const joinRequest: JanusJoinRoomRequest = {
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'join',
          room: roomId,
          ptype: isPublisher ? 'publisher' : 'subscriber',
          display: displayName,
        },
        transaction: this.generateTransaction(),
      }

      const joinResponse = await this.janusWsManager.sendAsync(joinRequest)

      if (joinResponse.janus === 'success' || joinResponse.janus === 'event') {
        return {
          success: true,
          jsep: joinResponse.jsep,
        }
      }

      return { success: false }
    } catch (error) {
      this.logger.error('Error creating/joining room:', error)
      return { success: false }
    }
  }

  async publishStream(
    sessionId: number,
    handleId: number,
    sdpOffer: string,
    audio: boolean = true,
    video: boolean = true,
    data: boolean = false,
  ): Promise<{ success: boolean; jsep?: any }> {
    try {
      const publishRequest: JanusPublishRequest = {
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'publish',
          audio,
          video,
          data,
          audiocodec: 'opus',
          videocodec: 'vp8',
          bitrate: 256000,
        },
        jsep: {
          type: 'offer',
          sdp: sdpOffer,
        },
        transaction: this.generateTransaction(),
      }

      const response = await this.janusWsManager.sendAsync(publishRequest)

      if (response.janus === 'success' || response.janus === 'ack') {
        return {
          success: true,
          jsep: response.jsep,
        }
      }

      return { success: false }
    } catch (error) {
      this.logger.error('Error publishing stream:', error)
      return { success: false }
    }
  }

  async joinAsSubscriber(
    sessionId: number,
    handleId: number,
    roomId: number,
    displayName: string,
    publisherId: number,
  ): Promise<{ success: boolean; jsep?: any }> {
    try {
      const subscribeRequest: JanusSubscribeRequest = {
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'join',
          room: roomId,
          ptype: 'subscriber',
          streams: [
            {
              feed: publisherId,
            },
          ],
          display: displayName,
        },
        transaction: this.generateTransaction(),
      }

      const response = await this.janusWsManager.sendAsync(subscribeRequest)

      if (response.janus === 'success' || response.janus === 'event') {
        return {
          success: true,
          jsep: response.jsep,
        }
      }

      return { success: false }
    } catch (error) {
      this.logger.error('Error joining as subscriber:', error)
      return { success: false }
    }
  }

  async startSubscription(sessionId: number, handleId: number, sdpAnswer: string): Promise<boolean> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'start',
        },
        jsep: {
          type: 'answer',
          sdp: sdpAnswer,
        },
        transaction: this.generateTransaction(),
      })

      return response.janus === 'success' || response.janus === 'ack'
    } catch (error) {
      this.logger.error('Error starting subscription:', error)
      return false
    }
  }

  async joinAsListener(sessionId: number, handleId: number, roomId: number, displayName: string): Promise<boolean> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'join',
          room: roomId,
          ptype: 'subscriber',
          display: displayName,
        },
        transaction: this.generateTransaction(),
      })

      return response.janus === 'success' || response.janus === 'event'
    } catch (error) {
      this.logger.error('Error joining as listener:', error)
      return false
    }
  }

  async listParticipants(sessionId: number, handleId: number, roomId: number): Promise<any[]> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'listparticipants',
          room: roomId,
        },
        transaction: this.generateTransaction(),
      })

      if (response.janus === 'success' && response.plugindata?.data?.participants) {
        return response.plugindata.data.participants
      }

      return []
    } catch (error) {
      this.logger.error('Error listing participants:', error)
      return []
    }
  }

  async leaveRoom(sessionId: number, handleId: number, roomId: number): Promise<boolean> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'leave',
          room: roomId,
        },
        transaction: this.generateTransaction(),
      })

      return response.janus === 'success' || response.janus === 'ack'
    } catch (error) {
      this.logger.error('Error leaving room:', error)
      return false
    }
  }

  async trickleCandidate(
    sessionId: number,
    handleId: number,
    candidate: string,
    sdpMid: string,
    sdpMLineIndex: number,
  ): Promise<boolean> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'trickle',
        session_id: sessionId,
        handle_id: handleId,
        candidate: {
          candidate,
          sdpMid,
          sdpMLineIndex,
        },
        transaction: this.generateTransaction(),
      })

      return response.janus === 'ack'
    } catch (error) {
      this.logger.error('Error trickling ICE candidate:', error)
      return false
    }
  }

  async startRecording(
    sessionId: number,
    handleId: number,
    roomId: number,
    filename: string,
    includeVideo: boolean = true,
    includeAudio: boolean = true,
  ): Promise<string | null> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'configure',
          room: roomId,
          record: true,
          filename: filename,
          video: includeVideo,
          audio: includeAudio,
        },
        transaction: this.generateTransaction(),
      })

      if (response.janus === 'success' || response.janus === 'ack') {
        const recordingId = `recording_${roomId}_${Date.now()}`
        this.logger.log(`Started recording for room ${roomId}: ${filename}`)
        return recordingId
      }

      return null
    } catch (error) {
      this.logger.error('Error starting recording:', error)
      return null
    }
  }

  async stopRecording(sessionId: number, handleId: number, roomId: number, recordingId: string): Promise<boolean> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'configure',
          room: roomId,
          record: false,
        },
        transaction: this.generateTransaction(),
      })

      if (response.janus === 'success' || response.janus === 'ack') {
        this.logger.log(`Stopped recording for room ${roomId}: ${recordingId}`)
        return true
      }

      return false
    } catch (error) {
      this.logger.error('Error stopping recording:', error)
      return false
    }
  }

  async startScreenShare(
    sessionId: number,
    handleId: number,
    sdpOffer: string,
    includeAudio: boolean = false,
  ): Promise<{ success: boolean; jsep?: any }> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'publish',
          video: true,
          audio: includeAudio,
          data: false,
          videocodec: 'vp8',
          bitrate: 512000, // Higher bitrate for screen sharing
        },
        jsep: {
          type: 'offer',
          sdp: sdpOffer,
        },
        transaction: this.generateTransaction(),
      })

      if (response.janus === 'success' || response.janus === 'ack') {
        return {
          success: true,
          jsep: response.jsep,
        }
      }

      return { success: false }
    } catch (error) {
      this.logger.error('Error starting screen share:', error)
      return { success: false }
    }
  }

  async stopScreenShare(sessionId: number, handleId: number): Promise<boolean> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'unpublish',
        },
        transaction: this.generateTransaction(),
      })

      return response.janus === 'success' || response.janus === 'ack'
    } catch (error) {
      this.logger.error('Error stopping screen share:', error)
      return false
    }
  }

  async kickParticipant(sessionId: number, handleId: number, roomId: number, participantId: number): Promise<boolean> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'kick',
          room: roomId,
          id: participantId,
        },
        transaction: this.generateTransaction(),
      })

      return response.janus === 'success' || response.janus === 'ack'
    } catch (error) {
      this.logger.error('Error kicking participant:', error)
      return false
    }
  }

  async muteParticipant(
    sessionId: number,
    handleId: number,
    roomId: number,
    participantId: number,
    muteAudio: boolean = true,
    muteVideo: boolean = false,
  ): Promise<boolean> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        body: {
          request: 'moderate',
          room: roomId,
          id: participantId,
          mute: muteAudio,
          video_mute: muteVideo,
        },
        transaction: this.generateTransaction(),
      })

      return response.janus === 'success' || response.janus === 'ack'
    } catch (error) {
      this.logger.error('Error muting participant:', error)
      return false
    }
  }

  async keepAlive(sessionId: number): Promise<boolean> {
    try {
      const response = await this.janusWsManager.sendAsync({
        janus: 'keepalive',
        session_id: sessionId,
        transaction: this.generateTransaction(),
      })

      return response.janus === 'ack'
    } catch (error) {
      this.logger.error(`Error keeping session ${sessionId} alive:`, error)
      return false
    }
  }

  private generateTransaction(): string {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
  }
}
